class HaNeoDashboard extends HTMLElement {
  static getStubConfig() {
    return {
      default_page: 'home',
      default_room: 'living_room',
      floorplan_editor: true,
      rooms: DEFAULT_ROOMS,
      floorplan_rooms: DEFAULT_CONFIG.floorplan_rooms,
      floorplan_entities: DEFAULT_CONFIG.floorplan_entities,
      pages: DEFAULT_PAGES,
    };
  }

  static async getConfigElement() {
    return document.createElement('ha-neo-dashboard-editor');
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this.rawConfig = { ...config };
    this.config = mergeConfig(config);
    this.currentRoom = this.currentRoom || this.config.default_room || this.config.rooms[0]?.id || 'living_room';
    this.currentPage = this.currentPage || this.config.default_page || this.config.pages[0]?.id || 'home';
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 12;
  }

  connectedCallback() {
    this.addEventListener('click', this.handleClick);
    this.addEventListener('input', this.handleFloorplanEditorInput);
    this.addEventListener('change', this.handleFloorplanEditorInput);
    this.addEventListener('pointerdown', this.handleFloorplanPointerDown);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('input', this.handleFloorplanEditorInput);
    this.removeEventListener('change', this.handleFloorplanEditorInput);
    this.removeEventListener('pointerdown', this.handleFloorplanPointerDown);
  }

  render() {
    if (!this.config || !this._hass) {
      return;
    }

    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    const page = this.activePage;

    this.shadowRoot.innerHTML = `
      <style>${this.styles}</style>
      <ha-card style="${this.backgroundStyle}">
        <section class="dashboard-shell">
          ${this.renderTopBar(page)}
          ${this.renderLeftPanel()}
          <main class="content-panel">
            ${page?.type === 'home' ? this.renderHome() : page?.type === 'rooms' ? this.renderRooms() : page?.type === 'overview' ? this.renderÜbersicht() : this.renderPage(page)}
          </main>
          ${this.renderNavigation()}
        </section>
      </ha-card>
    `;

    this.hydrateCustomCards(page);
  }

  renderTopBar(page) {
    const title = page?.type === 'home'
      ? (this.config.home_title || 'STARTSEITE')
      : (page?.title || this.activeConfig.title || this.config.title);
    const subtitle = page?.type === 'home'
      ? (this.config.home_subtitle || 'Wohnung')
      : (page?.subtitle || this.activeConfig.subtitle || this.config.subtitle);
    const presence = this.config.presence || [];

    return `
      <header class="top-bar">
        <section class="presence-strip" aria-label="Anwesenheit">
          <span class="presence-label">Anwesenheit</span>
          <div class="presence-avatars">
            ${presence.map((person) => this.renderPresenceAvatar(person)).join('')}
          </div>
        </section>
        <button class="top-title" type="button" data-action='${jsonAttr(page?.tap_action || { action: 'none' })}'>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(subtitle || '')}</small>
        </button>
        <div class="top-actions">
          ${page?.type === 'home' && this.config.floorplan_editor !== false ? `
            <button class="top-edit-action" type="button" data-floorplan-editor-toggle="true">
              <ha-icon icon="mdi:tune-variant"></ha-icon>
              <span>ANPASSEN</span>
            </button>
          ` : ''}
          <button class="top-action" type="button" data-action='${jsonAttr(this.config.close_action || { action: 'navigate', navigation_path: '/lovelace' })}'>
            <ha-icon icon="${escapeAttr(this.config.close_icon || 'mdi:close-circle-outline')}"></ha-icon>
          </button>
        </div>
      </header>
    `;
  }

  renderPresenceAvatar(person) {
    const resolvedPerson = resolveRoomValue(person, this.activeRoom);
    const state = resolvedPerson.entity ? this._hass.states[resolvedPerson.entity] : undefined;
    const home = ['home', 'on', 'present'].includes(state?.state);
    const label = state ? this.formatState(state) : (resolvedPerson.label || '—');

    return `
      <button class="presence-avatar ${home ? 'is-home' : ''}" type="button" title="${escapeAttr(resolvedPerson.name || resolvedPerson.entity || '')}: ${escapeAttr(label)}" data-action='${jsonAttr(actionFor(resolvedPerson))}'>
        <ha-icon icon="${escapeAttr(resolvedPerson.icon || 'mdi:account-circle')}"></ha-icon>
      </button>
    `;
  }

  renderHome() {
    return `
      <section class="floorplan-wrap ${this.floorplanEditorOpen ? 'is-editing' : ''}">
        ${this.config.apartment_floorplan_image ? `<img class="floorplan-image" src="${escapeAttr(this.config.apartment_floorplan_image)}" alt="${escapeAttr(this.config.home_title || 'Wohnungsplan')}">` : this.renderInlineFloorplan()}
        ${(this.config.floorplan_rooms || []).map((room, index) => this.renderFloorplanRoom(room, index)).join('')}
        ${(this.config.floorplan_entities || []).map((entity, index) => this.renderFloorplanEntity(entity, index)).join('')}
        ${this.config.floorplan_editor === false ? '' : this.renderFloorplanEditor()}
      </section>
    `;
  }

  renderInlineFloorplan() {
    return `
      <svg class="floorplan-svg" viewBox="0 0 1000 620" role="img" aria-label="2D Wohnungsplan">
        <rect class="floorplan-wall" x="90" y="70" width="760" height="470"></rect>
        <path class="floorplan-wall" d="M390 70v240M575 70v240M90 310h180M335 310h205M575 350h275M280 540V430h190v110M470 540V430h95v110M850 250h55v130h-55M850 410h45v75h-45"></path>
        <path class="floorplan-door" d="M270 310h65M540 310h35M90 395h75M220 395h180M470 395h95"></path>
        <text x="225" y="195">Büro</text>
        <text x="465" y="195">Küche</text>
        <text x="680" y="185">Wohnzimmer</text>
        <text x="905" y="315" transform="rotate(90 905 315)">Balkon</text>
        <text x="305" y="355">Flur</text>
        <text x="305" y="485">Badezimmer</text>
        <text x="505" y="470">Abstell.</text>
        <text x="660" y="455">Schlafzimmer</text>
      </svg>
    `;
  }

  renderFloorplanRoom(room, index) {
    const resolvedRoom = resolveRoomValue(room, this.activeRoom);
    const style = floorplanElementStyle(resolvedRoom, { x: 50, y: 50, width: 16, height: 12 });
    const selected = this.floorplanEditorOpen && this.floorplanEditorSelection?.kind === 'rooms' && this.floorplanEditorSelection?.index === index;

    return `
      <button class="floorplan-room-hotspot ${selected ? 'editor-selected' : ''}" type="button" style="${escapeAttr(style)}" data-room="${escapeAttr(resolvedRoom.room || resolvedRoom.id || '')}" data-action='${jsonAttr(actionFor(resolvedRoom))}' data-floorplan-kind="rooms" data-floorplan-index="${index}">
        <span>${escapeHtml(resolvedRoom.label || resolvedRoom.name || '')}</span>
        ${this.floorplanEditorOpen ? '<i class="floorplan-resize-handle" data-floorplan-resize="true" aria-hidden="true"></i>' : ''}
      </button>
    `;
  }

  renderFloorplanEntity(item, index) {
    const resolvedItem = resolveRoomValue(item, this.activeRoom);
    const state = resolvedItem.entity ? this._hass.states[resolvedItem.entity] : undefined;
    const active = ['on', 'open', 'heat', 'cool', 'playing', 'home'].includes(state?.state);
    const label = resolvedItem.label || (state ? `${this.formatState(state)}${this.unitSuffix(state)}` : resolvedItem.name || '');
    const style = floorplanElementStyle(resolvedItem, { x: 50, y: 50 }, {
      '--floorplan-entity-icon-size': cssLength(resolvedItem.icon_size),
    });
    const selected = this.floorplanEditorOpen && this.floorplanEditorSelection?.kind === 'entities' && this.floorplanEditorSelection?.index === index;

    return `
      <button class="floorplan-entity ${active ? 'active' : ''} ${selected ? 'editor-selected' : ''}" type="button" style="${escapeAttr(style)}" data-action='${jsonAttr(actionFor(resolvedItem))}' title="${escapeAttr(resolvedItem.name || resolvedItem.entity || '')}" data-floorplan-kind="entities" data-floorplan-index="${index}">
        <ha-icon icon="${escapeAttr(resolvedItem.icon || iconForDomain(resolvedItem.entity?.split('.')[0]))}"></ha-icon>
        ${label ? `<span>${escapeHtml(label)}</span>` : ''}
      </button>
    `;
  }

  renderFloorplanEditor() {
    const selected = this.selectedFloorplanItem;
    const kindLabel = this.floorplanEditorSelection?.kind === 'entities' ? 'Entity' : 'Raum';

    return `
      <button class="floorplan-edit-toggle" type="button" data-floorplan-editor-toggle="true">
        <ha-icon icon="mdi:tune-variant"></ha-icon>
        <span>${this.floorplanEditorOpen ? 'Schließen' : 'Plan anpassen'}</span>
      </button>
      ${this.floorplanEditorOpen ? `
        <aside class="floorplan-editor" aria-label="Floorplan anpassen">
          <header>
            <strong>Floorplan anpassen</strong>
            <small>Ziehen zum Verschieben, Ecke unten rechts zum Vergrößern. Im HA-Bearbeitungsmodus wird die Konfiguration beim Loslassen übernommen.</small>
          </header>
          <label class="floorplan-editor-field floorplan-editor-image">
            <span>Floorplan-Bild</span>
            <input type="text" value="${escapeAttr(this.config.apartment_floorplan_image || '')}" placeholder="/local/floorplan.svg" data-floorplan-image="true">
          </label>
          <div class="floorplan-editor-lists">
            ${this.renderFloorplanEditorList('rooms', 'Räume', this.config.floorplan_rooms || [])}
            ${this.renderFloorplanEditorList('entities', 'Entitäten', this.config.floorplan_entities || [])}
          </div>
          ${selected ? `
            <section class="floorplan-editor-controls">
              <h3>${escapeHtml(kindLabel)} bearbeiten</h3>
              ${this.floorplanEditorSelection.kind === 'rooms' ? `
                ${this.renderFloorplanTextControl('label', 'Name', selected.label || selected.name || '')}
                ${this.renderFloorplanTextControl('room', 'Raum-ID', selected.room || selected.id || '')}
              ` : `
                ${this.renderFloorplanTextControl('name', 'Name', selected.name || selected.label || '')}
                ${this.renderFloorplanTextControl('entity', 'Entity', selected.entity || '')}
                ${this.renderFloorplanTextControl('icon', 'Icon', selected.icon || '')}
              `}
              ${this.renderFloorplanNumberControl('x', 'X', selected.x ?? selected.left ?? 50)}
              ${this.renderFloorplanNumberControl('y', 'Y', selected.y ?? selected.top ?? 50)}
              ${this.renderFloorplanNumberControl('width', 'Breite', selected.width ?? (this.floorplanEditorSelection.kind === 'rooms' ? 16 : ''))}
              ${this.renderFloorplanNumberControl('height', 'Höhe', selected.height ?? (this.floorplanEditorSelection.kind === 'rooms' ? 12 : ''))}
              ${this.floorplanEditorSelection.kind === 'entities' ? `
                <label class="floorplan-editor-field">
                  <span>Icon-Größe</span>
                  <input type="text" value="${escapeAttr(selected.icon_size || '')}" placeholder="18px" data-floorplan-field="icon_size">
                </label>
              ` : ''}
            </section>
          ` : `<p class="floorplan-editor-empty">Wähle einen Raum oder eine Entität aus.</p>`}
          ${selected ? '<button class="floorplan-editor-delete" type="button" data-floorplan-delete="true">Ausgewählten Eintrag entfernen</button>' : ''}
          <button class="floorplan-editor-copy" type="button" data-floorplan-copy="true">${this.floorplanEditorCopied ? 'YAML kopiert' : 'YAML kopieren'}</button>
        </aside>
      ` : ''}
    `;
  }

  renderFloorplanEditorList(kind, title, items) {
    return `
      <section>
        <strong>${escapeHtml(title)}</strong>
        <div>
          ${items.map((item, index) => {
            const active = this.floorplanEditorSelection?.kind === kind && this.floorplanEditorSelection?.index === index;
            return `<button class="${active ? 'active' : ''}" type="button" data-floorplan-editor-select="${kind}" data-floorplan-index="${index}">${escapeHtml(item.label || item.name || item.room || item.entity || `${title} ${index + 1}`)}</button>`;
          }).join('') || '<small>Keine Einträge</small>'}
        </div>
      </section>
    `;
  }

  renderFloorplanTextControl(field, label, value) {
    return `
      <label class="floorplan-editor-field floorplan-editor-text">
        <span>${escapeHtml(label)}</span>
        <input type="text" value="${escapeAttr(value)}" data-floorplan-field="${escapeAttr(field)}">
      </label>
    `;
  }

  renderFloorplanNumberControl(field, label, value) {
    const numericValue = Number.parseFloat(value);
    const displayValue = Number.isFinite(numericValue) ? numericValue : '';

    return `
      <label class="floorplan-editor-field">
        <span>${escapeHtml(label)}</span>
        <input type="range" min="0" max="100" step="0.5" value="${escapeAttr(displayValue)}" data-floorplan-field="${escapeAttr(field)}">
        <input type="number" min="0" max="100" step="0.5" value="${escapeAttr(displayValue)}" data-floorplan-field="${escapeAttr(field)}">
      </label>
    `;
  }

  renderLeftPanel() {
    const page = this.activePage;
    if (page?.id === 'server') {
      return this.renderServerStatusPanel(page);
    }

    const cfg = page?.type === 'home' || page?.type === 'rooms'
      ? {
        top_tabs: this.config.home_top_tabs || this.config.room_overview_top_tabs || [],
        systems: this.config.home_systems || this.config.room_overview_systems || [],
        metrics: this.config.home_metrics || this.config.room_overview_metrics || [],
      }
      : this.activeConfig;

    return `
      <aside class="left-panel">
        <div class="tabs">
          ${cfg.top_tabs.map((tab, index) => `
            <button class="tab ${index === 0 ? 'tab-active' : ''}" type="button" data-action='${jsonAttr(tab.tap_action)}'>${escapeHtml(tab.label)}</button>
          `).join('')}
        </div>
        <div class="systems">
          ${cfg.systems.map((item) => this.renderStatusRow(item)).join('')}
        </div>
        ${cfg.metrics?.length ? `<div class="metrics">
          ${cfg.metrics.map((metric) => this.renderMetric(metric)).join('')}
        </div>` : ''}
      </aside>
    `;
  }

  renderServerStatusPanel(page) {
    const resolvedPage = resolveRoomValue(page, this.activeRoom);
    const sections = resolvedPage.server_status_sections || [];

    return `
      <aside class="left-panel server-status-panel">
        <button class="server-status-title" type="button" data-action='${jsonAttr(actionFor(resolvedPage.server || {}))}'>
          <ha-icon icon="${escapeAttr(resolvedPage.server?.icon || 'mdi:nas')}"></ha-icon>
          <span>${escapeHtml(resolvedPage.server?.name || 'MediaCenter22')}</span>
        </button>
        <div class="server-status-sections">
          ${sections.map((section) => this.renderServerStatusSection(section)).join('')}
        </div>
      </aside>
    `;
  }

  renderServerStatusSection(section) {
    return `
      <section class="server-status-section">
        <h3><ha-icon icon="${escapeAttr(section.icon || 'mdi:server-network')}"></ha-icon>${escapeHtml(section.heading || section.name || '')}</h3>
        <div class="server-status-badges">
          ${(section.badges || []).map((badge) => this.renderServerStatusBadge(badge)).join('')}
        </div>
      </section>
    `;
  }

  renderServerStatusBadge(badge) {
    const state = badge.entity ? this._hass.states[badge.entity] : undefined;
    const value = state ? `${this.formatState(state)}${this.unitSuffix(state)}` : (badge.label || '—');
    const color = this.serverStatusColor(badge, state);

    return `
      <button class="server-status-badge ${escapeAttr(color)}" type="button" data-action='${jsonAttr(actionFor(badge))}'>
        <ha-icon icon="${escapeAttr(badge.icon || 'mdi:circle-medium')}"></ha-icon>
        <span>${escapeHtml(value)}</span>
      </button>
    `;
  }

  serverStatusColor(badge, state) {
    const value = Number(state?.state);
    if (Number.isFinite(value)) {
      if (Number.isFinite(Number(badge.critical_above)) && value > Number(badge.critical_above)) {
        return 'red';
      }
      if (Number.isFinite(Number(badge.warning_above)) && value > Number(badge.warning_above)) {
        return 'orange';
      }
      if (Number.isFinite(Number(badge.ok_below)) && value < Number(badge.ok_below)) {
        return badge.ok_color || 'green';
      }
    }

    return badge.color || 'muted';
  }

  renderStatusRow(item) {
    const resolvedItem = resolveRoomValue(item, this.activeRoom);
    const colorClass = resolvedItem.color === 'orange' ? 'orange' : 'muted';
    return `
      <button class="system-row" type="button" data-action='${jsonAttr(actionFor(resolvedItem))}'>
        <ha-icon class="${colorClass}" icon="${escapeAttr(resolvedItem.icon)}"></ha-icon>
        <span><strong>${escapeHtml(resolvedItem.name)}</strong><small>${escapeHtml(stateLabel(this._hass, resolvedItem))}</small></span>
      </button>
    `;
  }

  renderMetric(metric) {
    const resolvedMetric = resolveRoomValue(metric, this.activeRoom);
    const value = this.stateNumber(resolvedMetric.entity);
    const max = Number(resolvedMetric.max ?? 100);
    const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    const unit = resolvedMetric.unit ?? this.stateUnit(resolvedMetric.entity) ?? '%';

    return `
      <button class="metric" type="button" data-action='${jsonAttr(actionFor(resolvedMetric))}'>
        <span>${escapeHtml(resolvedMetric.name)}</span>
        <b>${this.formatNumber(value)}${unit === '%' ? '%' : ` ${escapeHtml(unit)}`}</b>
        <i><em style="width:${percent}%"></em></i>
      </button>
    `;
  }

  renderÜbersicht() {
    const cfg = this.activeConfig;
    return `
      <div class="room-image-wrap">
        <img class="room-image" src="${escapeAttr(cfg.image)}" alt="${escapeAttr(cfg.title)}">
        ${cfg.scene_entity ? `
          <button class="scene-button" type="button" data-action='${jsonAttr({ action: 'call-service', service: 'scene.turn_on', target: { entity_id: cfg.scene_entity } })}'>
            ${escapeHtml(cfg.scene_label)}
          </button>
        ` : ''}
      </div>
      <div class="quick-chips">
        ${this.renderChip('mdi:thermometer', cfg.temperature_entity)}
        ${this.renderChip('mdi:water-percent', cfg.humidity_entity)}
        ${this.renderChip('mdi:lightbulb-group', cfg.all_lights_entity)}
      </div>
    `;
  }

  renderRooms() {
    return `
      <section class="rooms-grid">
        ${this.config.rooms.map((room) => this.renderRoomCard(room)).join('')}
      </section>
    `;
  }

  renderRoomCard(room) {
    const resolvedRoom = normalizeRoom(room);
    const temperature = resolvedRoom.temperature_entity ? this._hass.states[resolvedRoom.temperature_entity] : undefined;
    const humidity = resolvedRoom.humidity_entity ? this._hass.states[resolvedRoom.humidity_entity] : undefined;
    const lights = resolvedRoom.all_lights_entity ? this._hass.states[resolvedRoom.all_lights_entity] : undefined;
    const sockets = entitySummary(this._hass, resolvedRoom.socket_entities, ['on']);
    const contacts = entitySummary(this._hass, resolvedRoom.contact_entities, ['on', 'open']);
    const active = resolvedRoom.id === this.currentRoom;

    return `
      <button class="room-card ${active ? 'active' : ''}" type="button" data-room="${escapeAttr(resolvedRoom.id)}">
        <span class="room-card-icon"><ha-icon icon="${escapeAttr(resolvedRoom.icon || 'mdi:home-outline')}"></ha-icon></span>
        <span class="room-card-copy">
          <strong>${escapeHtml(resolvedRoom.title)}</strong>
          <small>${escapeHtml(resolvedRoom.subtitle || '')}</small>
        </span>
        <span class="room-card-states">
          <span><ha-icon icon="mdi:thermometer"></ha-icon>${temperature ? `${this.formatState(temperature)}${this.unitSuffix(temperature)}` : '—'}</span>
          <span><ha-icon icon="mdi:water-percent"></ha-icon>${humidity ? `${this.formatState(humidity)}${this.unitSuffix(humidity)}` : '—'}</span>
          <span><ha-icon icon="mdi:lightbulb-group"></ha-icon>${lights?.state === 'on' ? 'Licht an' : 'Licht aus'}</span>
          <span class="${sockets.count ? 'orange-text' : ''}"><ha-icon icon="mdi:power-socket-de"></ha-icon>${sockets.label}</span>
          <span class="${contacts.count ? 'orange-text' : ''}"><ha-icon icon="mdi:door-open"></ha-icon>${contacts.label}</span>
        </span>
      </button>
    `;
  }



  renderCustomCardPage(page, className = 'custom-card-grid') {
    return `
      <section class="${escapeAttr(className)}">
        ${(page?.cards || []).map((card, index) => `<div class="lovelace-card-host" data-lovelace-card="${index}"></div>`).join('')}
      </section>
    `;
  }

  hydrateCustomCards(page) {
    const hosts = [...(this.shadowRoot?.querySelectorAll('[data-lovelace-card]') || [])];
    if (!hosts.length || !page?.cards?.length) {
      return;
    }

    hosts.forEach((host) => {
      const cardConfig = resolveRoomValue(page.cards[Number(host.dataset.lovelaceCard)], this.activeRoom);
      if (!cardConfig || !cardConfig.type) {
        return;
      }

      this.createLovelaceCard(cardConfig).then((card) => {
        if (!card) {
          return;
        }
        card.hass = this._hass;
        host.replaceChildren(card);
      });
    });
  }

  async createLovelaceCard(cardConfig) {
    if (window.loadCardHelpers) {
      const helpers = await window.loadCardHelpers();
      return helpers.createCardElement(cardConfig);
    }

    const element = document.createElement('hui-card');
    element.setConfig(cardConfig);
    return element;
  }

  renderPage(page) {
    if (page?.cards?.length) {
      return this.renderCustomCardPage(page, page?.id === 'server' ? 'server-custom-card-grid' : 'custom-card-grid');
    }

    if (page?.id === 'climate') {
      return this.renderClimatePage(page);
    }

    if (page?.id === 'lights') {
      return this.renderLightsPage(page);
    }

    if (page?.id === 'security') {
      return this.renderSecurityPage(page);
    }

    if (page?.id === 'media') {
      return this.renderMediaPage(page);
    }

    if (page?.id === 'server') {
      return this.renderServerPage(page);
    }

    return `
      <section class="page-grid page-grid-wide">
        ${(page?.tiles || []).map((tile) => this.renderTile(tile)).join('')}
      </section>
    `;
  }

  renderClimatePage(page) {
    const cfg = this.activeConfig;
    const tempEntity = cfg.temperature_entity || `sensor.${cfg.prefix}_temperature`;
    const humidityEntity = cfg.humidity_entity || `sensor.${cfg.prefix}_humidity`;
    const climateEntity = cfg.climate_entity || `climate.${cfg.prefix}`;
    const heating = page.tiles?.find((tile) => resolveRoomValue(tile, this.activeRoom).entity?.startsWith('climate.')) || { name: 'Heizung', entity: climateEntity, icon: 'mdi:radiator' };

    return `
      <section class="full-page-grid climate-layout">
        ${this.renderHistoryPanel('Temperaturverlauf', tempEntity, 'mdi:thermometer', '°C')}
        ${this.renderHistoryPanel('Luftfeuchtigkeit', humidityEntity, 'mdi:water-percent', '%')}
        ${this.renderInfoCard('Aktuelle Temperatur', tempEntity, 'mdi:thermometer')}
        ${this.renderInfoCard('Aktuelle Luftfeuchtigkeit', humidityEntity, 'mdi:water-percent')}
        <div class="span-2">${this.renderDeviceControl(resolveRoomValue(heating, this.activeRoom))}</div>
      </section>
    `;
  }

  renderLightsPage(page) {
    return `
      <section class="full-page-grid lights-layout">
        ${(page?.tiles || []).filter((tile) => resolveRoomValue(tile, this.activeRoom).entity?.startsWith('light.')).map((tile) => this.renderLightControl(tile)).join('')}
      </section>
    `;
  }

  renderSecurityPage(page) {
    const cfg = this.activeConfig;
    const cameraTile = page.tiles?.find((tile) => resolveRoomValue(tile, this.activeRoom).entity?.startsWith('camera.')) || { name: 'Kamerafeed', entity: `camera.${cfg.prefix}`, icon: 'mdi:cctv' };
    const contactTiles = page.tiles?.filter((tile) => {
      const entity = resolveRoomValue(tile, this.activeRoom).entity || '';
      return entity.startsWith('binary_sensor.') || entity.startsWith('lock.');
    }) || [];

    return `
      <section class="full-page-grid security-layout">
        <div class="span-2">${this.renderCameraPanel(resolveRoomValue(cameraTile, this.activeRoom))}</div>
        ${contactTiles.map((tile) => this.renderTile(tile)).join('')}
      </section>
    `;
  }

  renderMediaPage(page) {
    return `
      <section class="full-page-grid media-layout">
        ${(page?.tiles || []).map((tile) => this.renderDeviceControl(resolveRoomValue(tile, this.activeRoom))).join('')}
      </section>
    `;
  }

  renderServerPage(page) {
    return `
      <section class="server-layout">
        ${(page?.tiles || []).map((tile) => this.renderServerTile(tile)).join('')}
      </section>
    `;
  }

  renderHistoryPanel(title, entityId, icon, unit) {
    const state = this._hass.states[entityId];
    const value = state ? `${this.formatState(state)}${this.unitSuffix(state) || ` ${unit}`}` : '—';
    const points = [18, 28, 25, 34, 30, 38, 35].map((y, index) => `${index * 16},${y}`).join(' ');

    return `
      <button class="history-panel" type="button" data-action='${jsonAttr({ action: 'more-info', entity: entityId })}'>
        <span class="panel-head"><ha-icon icon="${escapeAttr(icon)}"></ha-icon><strong>${escapeHtml(title)}</strong><small>letzte 7 Tage</small></span>
        <svg viewBox="0 0 96 48" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}"></polyline></svg>
        <b>${escapeHtml(value)}</b>
      </button>
    `;
  }

  renderInfoCard(title, entityId, icon) {
    const state = this._hass.states[entityId];
    const value = state ? `${this.formatState(state)}${this.unitSuffix(state)}` : '—';
    return `
      <button class="info-card" type="button" data-action='${jsonAttr({ action: 'more-info', entity: entityId })}'>
        <ha-icon icon="${escapeAttr(icon)}"></ha-icon>
        <span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(value)}</small></span>
      </button>
    `;
  }

  renderLightControl(tile) {
    const resolvedTile = resolveRoomValue(tile, this.activeRoom);
    const controls = resolvedTile.controls || (resolvedTile.entity ? lightControls(resolvedTile.entity) : []);
    return `<div class="light-control-card">${this.renderDeviceControl({ ...resolvedTile, controls })}</div>`;
  }

  renderCameraPanel(tile) {
    const entity = tile.entity ? this._hass.states[tile.entity] : undefined;
    const state = entity ? this.formatState(entity) : 'Feed vorbereitet';
    return `
      <button class="camera-panel" type="button" data-action='${jsonAttr(actionFor(tile))}'>
        <span><ha-icon icon="${escapeAttr(tile.icon || 'mdi:cctv')}"></ha-icon>${escapeHtml(tile.name || 'Kamerafeed')}</span>
        <strong>${escapeHtml(state)}</strong>
      </button>
    `;
  }

  renderServerTile(tile) {
    const resolvedTile = resolveRoomValue(tile, this.activeRoom);
    const entity = resolvedTile.entity ? this._hass.states[resolvedTile.entity] : undefined;
    const state = resolvedTile.value ?? (entity ? `${this.formatState(entity)}${this.unitSuffix(entity)}` : resolvedTile.label || '—');
    const wide = resolvedTile.span === 2 ? ' span-2' : resolvedTile.span === 3 ? ' span-3' : resolvedTile.span === 4 ? ' span-4' : '';
    const active = entity && !['off', 'unavailable', 'unknown'].includes(entity.state);

    return `
      <button class="server-tile${wide} ${active ? 'active' : ''}" type="button" data-action='${jsonAttr(actionFor(resolvedTile))}'>
        <ha-icon icon="${escapeAttr(resolvedTile.icon || 'mdi:server-network')}"></ha-icon>
        <span><strong>${escapeHtml(resolvedTile.name || resolvedTile.entity || 'Server')}</strong><small>${escapeHtml(state)}</small></span>
      </button>
    `;
  }

  renderTile(tile) {
    const resolvedTile = resolveRoomValue(tile, this.activeRoom);
    const entity = resolvedTile.entity ? this._hass.states[resolvedTile.entity] : undefined;
    const state = resolvedTile.value ?? (entity ? `${this.formatState(entity)}${this.unitSuffix(entity)}` : resolvedTile.label || '');
    const active = entity && ['on', 'heat', 'cool', 'playing', 'home', 'armed_home', 'armed_away'].includes(entity.state);

    return `
      <button class="feature-tile ${active ? 'active' : ''}" type="button" data-action='${jsonAttr(actionFor(resolvedTile))}'>
        <ha-icon icon="${escapeAttr(resolvedTile.icon || 'mdi:gesture-tap-button')}"></ha-icon>
        <span class="tile-copy">
          <strong>${escapeHtml(resolvedTile.name || resolvedTile.entity || 'Aktion')}</strong>
          <small>${escapeHtml(state)}</small>
        </span>
      </button>
    `;
  }

  renderRightPanel(page) {
    if (page && page.type !== 'rooms' && page.type !== 'overview') {
      return `
        <aside class="right-panel device-panel">
          ${this.renderDevicePanel(page)}
        </aside>
      `;
    }

    const gauges = page?.type === 'rooms' ? this.config.room_overview_gauges : page?.gauges || this.activeConfig.gauges;

    return `
      <aside class="right-panel">
        ${gauges.map((gauge) => this.renderGauge(gauge)).join('')}
      </aside>
    `;
  }

  renderDevicePanel(page) {
    const tiles = (page?.tiles || [])
      .map((tile) => resolveRoomValue(tile, this.activeRoom))
      .filter((tile) => tile.entity || tile.controls);

    if (!tiles.length) {
      return `<div class="device-empty">Keine Geräte für diese Seite konfiguriert</div>`;
    }

    return tiles.map((tile) => this.renderDeviceControl(tile)).join('');
  }

  renderDeviceControl(tile) {
    const entity = tile.entity ? this._hass.states[tile.entity] : undefined;
    const domain = tile.entity?.split('.')[0];
    const state = entity ? `${this.formatState(entity)}${this.unitSuffix(entity)}` : (tile.label || '—');
    const controls = tile.controls || autoControlsForEntity(tile.entity);

    return `
      <div class="device-control-card">
        <button class="device-control-head" type="button" data-action='${jsonAttr(actionFor(tile))}'>
          <ha-icon icon="${escapeAttr(tile.icon || iconForDomain(domain))}"></ha-icon>
          <span><strong>${escapeHtml(tile.name || tile.entity || 'Gerät')}</strong><small>${escapeHtml(state)}</small></span>
        </button>
        ${controls?.length ? `<div class="device-control-buttons">
          ${controls.map((control) => `<button type="button" data-action='${jsonAttr(controlAction(control, tile, this._hass))}'>${escapeHtml(controlLabel(control, tile, this._hass))}</button>`).join('')}
        </div>` : ''}
      </div>
    `;
  }

  renderChip(icon, entityId) {
    const state = this._hass.states[entityId];
    const value = state ? `${this.formatState(state)}${this.unitSuffix(state)}` : '—';
    return `
      <button class="chip" type="button" data-action='${jsonAttr({ action: 'more-info', entity: entityId })}'>
        <ha-icon icon="${icon}"></ha-icon><span>${escapeHtml(value)}</span>
      </button>
    `;
  }

  renderGauge(gauge) {
    const resolvedGauge = resolveRoomValue(gauge, this.activeRoom);
    const value = this.gaugeValue(resolvedGauge);
    const max = Number(resolvedGauge.max ?? 100);
    const display = this.gaugeDisplay(resolvedGauge, value);
    const degrees = display.isOff || max <= 0 ? 0 : Math.max(0, Math.min(300, (value / max) * 300));
    const label = this.gaugeLabel(resolvedGauge, value);

    return `
      <div class="gauge-card" role="button" tabindex="0" data-action='${jsonAttr(actionFor(resolvedGauge))}'>
        <span class="gauge-ring" style="--gauge-color:${escapeAttr(resolvedGauge.color || '#2c9cff')};--gauge-deg:${degrees}deg">
          <span class="gauge-name"><ha-icon icon="${escapeAttr(gaugeIcon(resolvedGauge))}"></ha-icon></span>
          <span class="gauge-value ${display.stateClass}">${escapeHtml(display.value)}</span>
          <span class="gauge-unit">${escapeHtml(display.unit)}</span>
        </span>
        ${label ? `<span class="gauge-label ${resolvedGauge.color === '#f29a37' ? 'orange-text' : ''}">${escapeHtml(label)}</span>` : ''}
        ${resolvedGauge.controls ? this.renderGaugeControls(resolvedGauge) : ''}
      </div>
    `;
  }

  renderGaugeControls(gauge) {
    return `
      <span class="gauge-controls">
        ${gauge.controls.map((control) => {
          if (typeof control === 'string') {
            return `<b>${escapeHtml(control)}</b>`;
          }

          return `<button class="gauge-control" type="button" data-action='${jsonAttr(controlAction(control, gauge, this._hass))}'>${escapeHtml(controlLabel(control, gauge, this._hass))}</button>`;
        }).join('')}
      </span>
    `;
  }

  gaugeValue(gauge) {
    if (gauge.value_attribute && gauge.entity) {
      const value = Number(this._hass.states[gauge.entity]?.attributes?.[gauge.value_attribute]);
      if (Number.isFinite(value)) {
        return value;
      }
    }

    return this.stateNumber(gauge.value_entity || gauge.entity);
  }

  gaugeLabel(gauge, value) {
    if (gauge.label_mode === 'temperature_comfort') {
      return temperatureComfortLabel(value);
    }

    return gauge.label_entity ? stateLabel(this._hass, { entity: gauge.label_entity }) : gauge.label;
  }

  gaugeDisplay(gauge, value) {
    const state = gauge.entity ? this._hass.states[gauge.entity] : undefined;
    const domain = gauge.entity?.split('.')[0];
    if ((domain === 'climate' || gauge.display_mode === 'climate') && state?.state === 'off') {
      return { value: 'AUS', unit: '', stateClass: 'is-off', isOff: true };
    }

    if ((domain === 'light' || gauge.display_mode === 'light') && state?.state === 'off') {
      return { value: 'AUS', unit: '', stateClass: 'is-off', isOff: true };
    }

    return {
      value: this.formatNumber(value),
      unit: gauge.unit || this.stateUnit(gauge.value_entity || gauge.entity) || '',
      stateClass: '',
      isOff: false,
    };
  }

  renderNavigation() {
    return `
      <nav class="bottom-nav">
        ${this.availablePages.map((page) => `
          <button class="nav-item ${page.id === this.currentPage ? 'active' : ''}" type="button" data-page="${escapeAttr(page.id)}" data-action='${jsonAttr(page.tap_action || {})}'>
            <ha-icon icon="${escapeAttr(page.icon || 'mdi:view-dashboard-outline')}"></ha-icon>
            <span>${escapeHtml(page.label || page.title || page.id)}</span>
          </button>
        `).join('')}
      </nav>
    `;
  }

  handleClick = (event) => {
    if (this.floorplanSuppressClick) {
      this.floorplanSuppressClick = false;
      event.preventDefault();
      return;
    }

    const editorTarget = event.composedPath().find((node) => node?.dataset?.floorplanEditorToggle || node?.dataset?.floorplanEditorSelect || node?.dataset?.floorplanCopy || node?.dataset?.floorplanDelete || node?.dataset?.floorplanKind);
    if (editorTarget) {
      if (editorTarget.dataset.floorplanEditorToggle) {
        this.floorplanEditorOpen = !this.floorplanEditorOpen;
        this.ensureFloorplanEditorSelection();
        this.render();
        return;
      }

      if (editorTarget.dataset.floorplanEditorSelect || (this.floorplanEditorOpen && editorTarget.dataset.floorplanKind)) {
        this.floorplanEditorSelection = {
          kind: editorTarget.dataset.floorplanEditorSelect || editorTarget.dataset.floorplanKind,
          index: Number(editorTarget.dataset.floorplanIndex || 0),
        };
        this.render();
        return;
      }

      if (editorTarget.dataset.floorplanDelete) {
        this.deleteSelectedFloorplanItem();
        return;
      }

      if (editorTarget.dataset.floorplanCopy) {
        this.copyFloorplanYaml();
        return;
      }
    }

    const target = event.composedPath().find((node) => node?.dataset?.room || node?.dataset?.action || node?.dataset?.page);
    if (!target) {
      return;
    }

    if (target.dataset.room) {
      this.currentRoom = target.dataset.room;
      this.currentPage = normalizeRoom(this.activeRoom).default_page || 'overview';
      this.render();
      return;
    }

    if (target.dataset.page) {
      const action = parseAktion(target.dataset.action);
      if (!action.action) {
        this.currentPage = target.dataset.page;
        this.render();
        return;
      }
    }

    this.performAktion(parseAktion(target.dataset.action));
  };

  handleFloorplanEditorInput = (event) => {
    const target = event.composedPath().find((node) => node?.dataset?.floorplanField || node?.dataset?.floorplanImage);
    if (!target) {
      return;
    }

    if (target.dataset.floorplanImage) {
      this.config.apartment_floorplan_image = target.value;
      this.floorplanEditorCopied = false;
      this.updateFloorplanConfig({ render: event.type === 'change' });
      return;
    }

    this.ensureFloorplanEditorSelection();
    const selected = this.selectedFloorplanItem;
    if (!selected) {
      return;
    }

    const field = target.dataset.floorplanField;
    const numericFields = ['x', 'y', 'width', 'height'];
    selected[field] = numericFields.includes(field) ? (target.value === '' ? '' : Number(target.value)) : target.value;
    this.floorplanEditorCopied = false;
    this.updateSelectedFloorplanElementStyle();
    this.syncFloorplanEditorControls(field, target.value, target);
    this.updateFloorplanConfig({ render: event.type === 'change' });
  };

  handleFloorplanPointerDown = (event) => {
    if (!this.floorplanEditorOpen) {
      return;
    }

    const element = event.composedPath().find((node) => node?.dataset?.floorplanKind);
    if (!element) {
      return;
    }

    const workspace = this.shadowRoot?.querySelector('.floorplan-wrap');
    const item = (element.dataset.floorplanKind === 'entities' ? this.config.floorplan_entities : this.config.floorplan_rooms)?.[Number(element.dataset.floorplanIndex || 0)];
    if (!workspace || !item) {
      return;
    }

    event.preventDefault();
    this.floorplanEditorSelection = { kind: element.dataset.floorplanKind, index: Number(element.dataset.floorplanIndex || 0) };

    const rect = workspace.getBoundingClientRect();
    const startX = (item.x ?? item.left ?? 50);
    const startY = (item.y ?? item.top ?? 50);
    const startWidth = (item.width ?? (element.dataset.floorplanKind === 'rooms' ? 16 : 12));
    const startHeight = (item.height ?? (element.dataset.floorplanKind === 'rooms' ? 12 : 7));
    const resizing = Boolean(event.composedPath().find((node) => node?.dataset?.floorplanResize));
    let moved = false;

    const onMove = (moveEvent) => {
      const dx = ((moveEvent.clientX - event.clientX) / rect.width) * 100;
      const dy = ((moveEvent.clientY - event.clientY) / rect.height) * 100;
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
        moved = true;
      }

      if (resizing) {
        item.width = roundPercent(Math.max(2, Number(startWidth) + dx));
        item.height = roundPercent(Math.max(2, Number(startHeight) + dy));
      } else {
        item.x = roundPercent(clamp(Number(startX) + dx, 0, 100));
        item.y = roundPercent(clamp(Number(startY) + dy, 0, 100));
      }

      this.floorplanEditorCopied = false;
      this.updateSelectedFloorplanElementStyle(element);
      this.syncFloorplanEditorControls();
      this.updateFloorplanConfig({ render: false });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved) {
        this.floorplanSuppressClick = true;
      }
      this.updateFloorplanConfig();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  deleteSelectedFloorplanItem() {
    const selection = this.floorplanEditorSelection;
    if (!selection) {
      return;
    }

    const key = selection.kind === 'entities' ? 'floorplan_entities' : 'floorplan_rooms';
    this.config[key] = (this.config[key] || []).filter((_, index) => index !== selection.index);
    this.floorplanEditorSelection = undefined;
    this.floorplanEditorCopied = false;
    this.ensureFloorplanEditorSelection();
    this.updateFloorplanConfig();
  }

  updateSelectedFloorplanElementStyle(element) {
    const selection = this.floorplanEditorSelection;
    const item = this.selectedFloorplanItem;
    const target = element || this.shadowRoot?.querySelector(`[data-floorplan-kind="${selection?.kind}"][data-floorplan-index="${selection?.index}"]`);
    if (!target || !item) {
      return;
    }

    const defaults = selection.kind === 'rooms' ? { x: 50, y: 50, width: 16, height: 12 } : { x: 50, y: 50 };
    target.style.cssText = floorplanElementStyle(item, defaults, selection.kind === 'entities' ? { '--floorplan-entity-icon-size': cssLength(item.icon_size) } : {});
  }

  syncFloorplanEditorControls(changedField, value, source) {
    const item = this.selectedFloorplanItem;
    if (!item) {
      return;
    }

    ['x', 'y', 'width', 'height'].forEach((field) => {
      const nextValue = field === changedField ? value : item[field];
      this.shadowRoot?.querySelectorAll(`[data-floorplan-field="${field}"]`).forEach((input) => {
        if (input !== source && nextValue !== undefined && nextValue !== null) {
          input.value = nextValue;
        }
      });
    });
  }

  get selectedFloorplanItem() {
    this.ensureFloorplanEditorSelection();
    const selection = this.floorplanEditorSelection;
    if (!selection) {
      return undefined;
    }

    const source = selection.kind === 'entities' ? this.config.floorplan_entities : this.config.floorplan_rooms;
    return source?.[selection.index];
  }

  ensureFloorplanEditorSelection() {
    if (this.floorplanEditorSelection) {
      const source = this.floorplanEditorSelection.kind === 'entities' ? this.config.floorplan_entities : this.config.floorplan_rooms;
      if (source?.[this.floorplanEditorSelection.index]) {
        return;
      }
    }

    if (this.config.floorplan_rooms?.length) {
      this.floorplanEditorSelection = { kind: 'rooms', index: 0 };
      return;
    }

    if (this.config.floorplan_entities?.length) {
      this.floorplanEditorSelection = { kind: 'entities', index: 0 };
    }
  }

  updateFloorplanConfig({ render = true } = {}) {
    const nextConfig = {
      ...(this.rawConfig || {}),
      apartment_floorplan_image: this.config.apartment_floorplan_image,
      floorplan_rooms: this.config.floorplan_rooms,
      floorplan_entities: this.config.floorplan_entities,
      floorplan_editor: this.config.floorplan_editor,
    };

    this.rawConfig = nextConfig;
    this.dispatchEvent(new CustomEvent('config-changed', {
      bubbles: true,
      composed: true,
      detail: { config: nextConfig },
    }));

    if (render) {
      this.render();
    }
  }

  async copyFloorplanYaml() {
    const yaml = floorplanYaml(this.config);
    try {
      await navigator.clipboard?.writeText(yaml);
      this.floorplanEditorCopied = true;
    } catch (_error) {
      this.floorplanEditorCopied = false;
    }
    this.render();
  }

  performAktion(action) {
    if (!action || action.action === 'none') {
      return;
    }

    if (action.action === 'navigate' && action.navigation_path) {
      history.pushState(null, '', action.navigation_path);
      window.dispatchEvent(new CustomEvent('location-changed'));
      return;
    }

    if (action.action === 'url' && action.url_path) {
      window.open(action.url_path, action.new_tab === false ? '_self' : '_blank');
      return;
    }

    if (action.action === 'more-info' && action.entity) {
      const event = new CustomEvent('hass-more-info', {
        bubbles: true,
        composed: true,
        detail: { entityId: action.entity },
      });
      this.dispatchEvent(event);
      return;
    }

    if (action.action === 'toggle' && action.entity) {
      this._hass.callService('homeassistant', 'toggle', { entity_id: action.entity });
      return;
    }

    if (action.action === 'climate-temperature-step' && action.entity) {
      const currentTarget = Number(this._hass.states[action.entity]?.attributes?.temperature);
      const fallback = Number(this._hass.states[action.entity]?.attributes?.current_temperature);
      const base = Number.isFinite(currentTarget) ? currentTarget : Number.isFinite(fallback) ? fallback : 20;
      const temperature = Math.round((base + Number(action.step || 0)) * 2) / 2;
      this._hass.callService('climate', 'set_temperature', { entity_id: action.entity, temperature });
      return;
    }

    if (action.action === 'climate-hvac-mode' && action.entity && action.hvac_mode) {
      this._hass.callService('climate', 'set_hvac_mode', { entity_id: action.entity, hvac_mode: action.hvac_mode });
      return;
    }

    if (action.action === 'climate-toggle-heat' && action.entity) {
      const current = this._hass.states[action.entity]?.state;
      this._hass.callService('climate', 'set_hvac_mode', { entity_id: action.entity, hvac_mode: current === 'off' ? (action.heat_mode || 'heat') : 'off' });
      return;
    }

    if (action.action === 'light-brightness-step' && action.entity) {
      this._hass.callService('light', 'turn_on', { entity_id: action.entity, brightness_step_pct: Number(action.step || 0) });
      return;
    }

    if (action.action === 'call-service' && action.service) {
      const [domain, service] = action.service.split('.');
      this._hass.callService(domain, service, action.data || {}, action.target || undefined);
    }
  }

  get activePage() {
    const pages = this.availablePages;
    const page = pages.find((entry) => entry.id === this.currentPage) || pages[0] || this.config.pages[0];
    this.currentPage = page?.id || this.currentPage;
    return page;
  }

  get availablePages() {
    const room = normalizeRoom(this.activeRoom);
    const pages = [...this.config.pages, ...(room.pages || [])];
    const seen = new Set();
    return pages.filter((page) => {
      if (!page || seen.has(page.id)) {
        return false;
      }
      seen.add(page.id);
      if (page.enabled === false || page.hidden === true) {
        return false;
      }
      if (Array.isArray(room.enabled_pages) && !room.enabled_pages.includes(page.id)) {
        return false;
      }
      if (Array.isArray(room.disabled_pages) && room.disabled_pages.includes(page.id)) {
        return false;
      }
      if (Array.isArray(page.rooms) && !page.rooms.includes(room.id)) {
        return false;
      }
      if (Array.isArray(page.exclude_rooms) && page.exclude_rooms.includes(room.id)) {
        return false;
      }
      return true;
    });
  }

  get activeRoom() {
    return this.config.rooms.find((room) => room.id === this.currentRoom) || this.config.rooms[0];
  }

  get activeConfig() {
    return buildRoomConfig(this.config, this.activeRoom);
  }

  get backgroundStyle() {
    const background = this.activeConfig.background_image || this.config.background_image;
    if (!background) {
      return '';
    }

    return `--neo-custom-bg:url('${cssUrl(background)}')`;
  }

  stateNumber(entityId) {
    const value = Number(this._hass.states[entityId]?.state);
    return Number.isFinite(value) ? value : 0;
  }

  stateUnit(entityId) {
    return this._hass.states[entityId]?.attributes?.unit_of_measurement;
  }

  formatState(state) {
    const numeric = Number(state.state);
    return Number.isFinite(numeric) ? this.formatNumber(numeric) : state.state;
  }

  formatNumber(value) {
    return Number(value).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  }

  unitSuffix(state) {
    return state?.attributes?.unit_of_measurement ? ` ${state.attributes.unit_of_measurement}` : '';
  }

  get styles() {
    return `
      :host {
        --neo-bg: #0f1128;
        --neo-panel: rgba(18, 22, 54, .72);
        --neo-panel-strong: rgba(20, 24, 57, .86);
        --neo-text: var(--primary-text-color, #f6f7ff);
        --neo-muted: var(--secondary-text-color, #9ba4cd);
        --neo-orange: #f29a37;
        --neo-blue: #2c9cff;
        display: block;
        width: 100%;
        min-height: 100dvh;
      }
      ha-card {
        height: 100dvh;
        min-height: 100dvh;
        overflow: hidden;
        color: var(--neo-text);
        background:
          var(--neo-custom-bg, linear-gradient(transparent, transparent)),
          radial-gradient(circle at 48% 82%, rgba(104, 128, 255, .34), transparent 22%),
          radial-gradient(circle at 12% 20%, rgba(37, 52, 143, .25), transparent 28%),
          linear-gradient(180deg, #111329 0%, #0b0d25 100%);
        background-size: cover;
        background-position: center;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
      button { color: inherit; font: inherit; border: 0; cursor: pointer; }
      .dashboard-shell {
        box-sizing: border-box;
        display: grid;
        grid-template-columns: minmax(240px, 310px) minmax(360px, 1fr);
        grid-template-rows: 116px 1fr 76px;
        grid-template-areas:
          'top top'
          'left content'
          'nav nav';
        gap: 16px 22px;
        height: 100dvh;
        min-height: 100dvh;
        padding: 20px 28px 0;
        background: rgba(5, 8, 26, .2);
        backdrop-filter: saturate(120%);
        position: relative;
      }
      .top-bar { grid-area: top; display: grid; grid-template-columns: minmax(240px, 310px) 1fr auto; align-items: center; gap: 22px; border-bottom: 1px solid rgba(169, 181, 232, .34); padding-bottom: 16px; }
      .presence-strip { display: grid; gap: 10px; align-content: center; }
      .presence-label { color: var(--neo-muted); font-size: 12px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
      .presence-avatars { display: flex; gap: 10px; align-items: center; }
      .presence-avatar { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; background: rgba(20, 24, 57, .72); border: 1px solid rgba(169, 181, 232, .28); color: var(--neo-muted); box-shadow: 0 12px 24px rgba(0, 0, 0, .18); }
      .presence-avatar.is-home { color: var(--neo-blue); border-color: rgba(44, 156, 255, .72); box-shadow: 0 0 22px rgba(44, 156, 255, .22); }
      .presence-avatar ha-icon { width: 27px; height: 27px; }
      .top-title { justify-self: center; min-width: 240px; padding: 13px 28px 11px; border: 1px solid rgba(169, 181, 232, .42); border-radius: 9px; background: rgba(12, 15, 36, .58); text-align: center; box-shadow: inset 0 0 24px rgba(44, 156, 255, .06); }
      .top-title strong { display: block; font-size: 22px; font-weight: 600; letter-spacing: .04em; }
      .top-title small { display: block; margin-top: 7px; color: var(--neo-muted); font-size: 11px; }
      .top-actions { justify-self: end; display: inline-flex; align-items: center; gap: 8px; }
      .top-action { width: 50px; height: 50px; display: grid; place-items: center; border-radius: 50%; background: rgba(20, 24, 57, .56); color: var(--neo-blue); }
      .top-action ha-icon { width: 36px; height: 36px; }
      .top-edit-action { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 12px; border-radius: 999px; background: rgba(255, 255, 255, .94); color: #111530; font-size: 11px; font-weight: 900; }
      .top-edit-action ha-icon { width: 18px; height: 18px; }
      .left-panel { grid-area: left; min-height: 0; overflow: hidden auto; padding-bottom: 8px; }
      .content-panel { grid-area: content; display: grid; align-content: start; justify-items: center; min-width: 0; min-height: 0; overflow: hidden auto; padding-bottom: 12px; }
      .right-panel { display: none; }
      .tabs { display: flex; margin-bottom: 30px; }
      .tab { min-width: 104px; min-height: 48px; padding: 0 16px; border: 1px solid rgba(170, 180, 230, .35); background: rgba(16, 19, 45, .55); border-radius: 6px; font-size: 12px; font-weight: 800; }
      .tab-active { background: rgba(255, 255, 255, .96); color: #101225; }
      .systems { display: grid; gap: 22px; margin-bottom: 46px; }
      .system-row { display: grid; grid-template-columns: 24px 1fr; gap: 12px; align-items: center; width: 100%; padding: 0; text-align: left; background: transparent; }
      .system-row ha-icon { width: 20px; height: 20px; }
      .system-row strong { display: block; font-size: 12px; letter-spacing: .02em; }
      .system-row small { color: var(--neo-muted); font-size: 11px; }
      .muted { color: var(--neo-muted); }
      .orange, .orange-text { color: var(--neo-orange); }
      .metrics { display: grid; gap: 26px; border-top: 1px solid rgba(150, 160, 220, .14); padding-top: 30px; }
      .metric { display: grid; grid-template-columns: 1fr auto; gap: 7px 14px; width: 100%; padding: 0; background: transparent; color: var(--neo-muted); text-align: left; }
      .metric span { font-size: 11px; }
      .metric b { color: var(--neo-text); font-size: 14px; font-weight: 500; }
      .metric i { grid-column: 1 / -1; height: 4px; border-radius: 999px; background: rgba(125, 137, 198, .28); overflow: hidden; }
      .metric em { display: block; height: 100%; border-radius: inherit; background: #aeb5e9; }
      .server-status-panel { overflow: hidden auto; padding-bottom: 86px; }
      .server-status-title { display: grid; grid-template-columns: 38px 1fr; gap: 12px; align-items: center; width: 100%; min-height: 56px; margin-bottom: 20px; padding: 0 12px; border-radius: 14px; background: rgba(20, 24, 57, .68); text-align: left; font-size: 14px; font-weight: 800; }
      .server-status-title ha-icon { width: 26px; height: 26px; color: #f0c33c; }
      .server-status-sections { display: grid; gap: 14px; }
      .server-status-section { display: grid; gap: 9px; }
      .server-status-section h3 { display: flex; align-items: center; gap: 9px; margin: 0; color: var(--neo-muted); font-size: 13px; font-weight: 800; }
      .server-status-section h3 ha-icon { width: 18px; height: 18px; color: var(--neo-muted); }
      .server-status-badges { display: flex; flex-wrap: wrap; gap: 7px; padding-left: 28px; }
      .server-status-badge { display: inline-flex; align-items: center; gap: 5px; min-height: 24px; padding: 3px 7px; border-radius: 999px; background: rgba(20, 24, 57, .62); color: var(--neo-muted); font-size: 11px; font-weight: 700; }
      .server-status-badge ha-icon { width: 15px; height: 15px; }
      .server-status-badge.green { color: #4bd669; }
      .server-status-badge.orange { color: var(--neo-orange); }
      .server-status-badge.red { color: #ff5148; }
      .server-status-badge.blue { color: var(--neo-blue); }
      .server-status-badge.purple { color: #a274ff; }
      .server-status-badge.yellow { color: #f0c33c; }
      .room-image-wrap { position: relative; width: min(620px, 92%); filter: drop-shadow(0 40px 42px rgba(95, 125, 255, .28)); }
      .room-image { display: block; width: 100%; min-height: 260px; object-fit: contain; }
      .scene-button { position: absolute; top: 52%; left: 50%; transform: translate(-50%, -50%); min-width: 92px; min-height: 44px; border-radius: 6px; background: rgba(255, 255, 255, .92); color: #15172d; font-size: 12px; font-weight: 800; }
      .quick-chips { display: flex; gap: 10px; justify-content: center; margin-top: 42px; padding: 24px 60px; background: radial-gradient(circle at center, rgba(123, 145, 255, .32), transparent 58%); }
      .chip { display: inline-flex; gap: 7px; align-items: center; border-radius: 999px; padding: 7px 12px; background: rgba(22, 27, 68, .76); color: var(--neo-text); }
      .chip ha-icon { width: 18px; color: var(--neo-blue); }
      .floorplan-wrap { position: relative; width: min(940px, 100%); aspect-ratio: 1000 / 620; border-radius: 26px; background: radial-gradient(circle at 50% 50%, rgba(86, 116, 255, .12), rgba(12, 15, 36, .34)); filter: drop-shadow(0 34px 44px rgba(95, 125, 255, .20)); overflow: hidden; }
      .floorplan-image, .floorplan-svg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
      .floorplan-svg { color: rgba(255, 255, 255, .9); }
      .floorplan-wall { fill: none; stroke: rgba(224, 228, 255, .72); stroke-width: 8; stroke-linecap: square; stroke-linejoin: miter; filter: drop-shadow(0 0 10px rgba(255, 255, 255, .18)); }
      .floorplan-door { fill: none; stroke: rgba(12, 15, 36, .95); stroke-width: 11; stroke-linecap: round; }
      .floorplan-svg text { fill: var(--neo-text); font-size: 34px; font-weight: 800; text-anchor: middle; paint-order: stroke; stroke: rgba(10, 12, 30, .9); stroke-width: 4px; }
      .floorplan-room-hotspot { position: absolute; transform: translate(-50%, -50%); border-radius: 0; background: rgba(44, 156, 255, .06); border: 1px solid transparent; color: transparent; }
      .floorplan-room-hotspot:hover, .floorplan-room-hotspot:focus-visible { background: rgba(44, 156, 255, .16); border-color: rgba(44, 156, 255, .45); color: var(--neo-text); }
      .floorplan-room-hotspot span { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 12px; font-weight: 800; white-space: nowrap; }
      .floorplan-entity { position: absolute; transform: translate(-50%, -50%); display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 34px; padding: 6px 9px; border-radius: 999px; background: rgba(13, 17, 43, .78); border: 1px solid rgba(169, 181, 232, .26); color: var(--neo-muted); box-shadow: 0 14px 26px rgba(0, 0, 0, .22); backdrop-filter: blur(8px); box-sizing: border-box; }
      .floorplan-entity.active { color: var(--neo-blue); border-color: rgba(44, 156, 255, .65); box-shadow: 0 0 24px rgba(44, 156, 255, .22); }
      .floorplan-entity ha-icon { width: var(--floorplan-entity-icon-size, 18px); height: var(--floorplan-entity-icon-size, 18px); flex: 0 0 auto; }
      .floorplan-entity span { font-size: 11px; font-weight: 800; }
      .floorplan-wrap.is-editing .floorplan-room-hotspot, .floorplan-wrap.is-editing .floorplan-entity { color: var(--neo-text); border-color: rgba(44, 156, 255, .55); background: rgba(44, 156, 255, .18); }
      .floorplan-wrap.is-editing .floorplan-room-hotspot, .floorplan-wrap.is-editing .floorplan-entity { touch-action: none; }
      .floorplan-resize-handle, .workspace-resize-handle { position: absolute; right: 0; bottom: 0; width: 16px; height: 16px; background: linear-gradient(135deg, transparent 50%, var(--neo-orange, #f29a37) 50%); cursor: nwse-resize; }
      .floorplan-room-hotspot.editor-selected, .floorplan-entity.editor-selected { outline: 2px solid var(--neo-orange); outline-offset: 3px; color: var(--neo-text); border-color: var(--neo-orange); z-index: 5; }
      .floorplan-edit-toggle { position: absolute; right: 16px; top: 16px; z-index: 20; display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 0 12px; border-radius: 999px; background: rgba(255, 255, 255, .94); color: #111530; font-size: 12px; font-weight: 900; box-shadow: 0 12px 24px rgba(0, 0, 0, .24); }
      .floorplan-edit-toggle ha-icon { width: 18px; height: 18px; }
      .floorplan-editor { position: absolute; right: 16px; top: 62px; bottom: 16px; z-index: 19; width: min(330px, calc(100% - 32px)); display: grid; grid-template-rows: auto auto minmax(0, auto) auto auto; gap: 12px; overflow: hidden auto; padding: 14px; border-radius: 18px; background: rgba(13, 17, 43, .92); border: 1px solid rgba(169, 181, 232, .34); color: var(--neo-text); box-shadow: 0 20px 40px rgba(0, 0, 0, .36); backdrop-filter: blur(14px); }
      .floorplan-editor header strong { display: block; font-size: 15px; }
      .floorplan-editor header small, .floorplan-editor-empty { color: var(--neo-muted); font-size: 11px; }
      .floorplan-editor-lists { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .floorplan-editor-lists section { min-width: 0; display: grid; gap: 7px; }
      .floorplan-editor-lists section > strong { font-size: 11px; color: var(--neo-muted); }
      .floorplan-editor-lists section > div { display: grid; gap: 5px; max-height: 116px; overflow: hidden auto; }
      .floorplan-editor-lists button { min-height: 28px; padding: 4px 7px; border-radius: 8px; background: rgba(255, 255, 255, .08); color: var(--neo-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; text-align: left; }
      .floorplan-editor-lists button.active { background: rgba(44, 156, 255, .28); color: var(--neo-text); }
      .floorplan-editor-controls { display: grid; gap: 8px; }
      .floorplan-editor-controls h3 { margin: 0; font-size: 12px; }
      .floorplan-editor-field { display: grid; grid-template-columns: 58px 1fr 58px; gap: 8px; align-items: center; font-size: 11px; color: var(--neo-muted); }
      .floorplan-editor-text { grid-template-columns: 58px 1fr; }
      .floorplan-editor-field input { min-width: 0; height: 28px; padding: 0 8px; border-radius: 8px; border: 1px solid rgba(169, 181, 232, .26); background: rgba(255, 255, 255, .08); color: var(--neo-text); }
      .floorplan-editor-field input[type="range"] { padding: 0; border: 0; accent-color: var(--neo-blue); background: transparent; }
      .floorplan-editor-image { grid-template-columns: 82px 1fr; }
      .floorplan-editor-delete { min-height: 34px; border-radius: 0; background: rgba(242, 84, 84, .22); color: var(--neo-text); font-size: 12px; font-weight: 900; }
      .floorplan-editor-copy { min-height: 34px; border-radius: 999px; background: rgba(44, 156, 255, .24); color: var(--neo-text); font-size: 12px; font-weight: 900; }
      .page-grid, .rooms-grid { width: min(760px, 100%); display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 16px; }
      .page-grid-wide, .full-page-grid, .server-layout { width: min(820px, 100%); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
      .full-page-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .span-2 { grid-column: span 2; }
      .span-3 { grid-column: span 3; }
      .span-4 { grid-column: 1 / -1; }
      .history-panel, .info-card, .camera-panel, .server-tile { min-height: 112px; display: grid; gap: 12px; align-content: center; padding: 18px; border-radius: 18px; background: rgba(20, 24, 57, .62); border: 1px solid rgba(125, 145, 255, .18); text-align: left; box-shadow: 0 20px 36px rgba(0, 0, 0, .18); }
      .history-panel { min-height: 210px; }
      .history-panel .panel-head { display: grid; grid-template-columns: 28px 1fr auto; gap: 10px; align-items: center; }
      .history-panel .panel-head ha-icon, .info-card ha-icon { width: 28px; height: 28px; color: var(--neo-blue); }
      .server-tile ha-icon { width: 20px; height: 20px; color: var(--neo-blue); }
      .history-panel .panel-head small, .info-card small, .server-tile small { color: var(--neo-muted); }
      .history-panel svg { width: 100%; height: 100px; border-radius: 12px; background: linear-gradient(180deg, rgba(44, 156, 255, .10), rgba(44, 156, 255, .02)); }
      .history-panel polyline { fill: none; stroke: var(--neo-blue); stroke-width: 3; vector-effect: non-scaling-stroke; }
      .history-panel b { font-size: 26px; }
      .info-card { grid-template-columns: 42px 1fr; align-items: center; }
      .info-card strong { display: block; font-size: 15px; }
      .server-tile strong { display: block; font-size: 12px; }
      .info-card small { display: block; margin-top: 6px; font-size: 12px; }
      .server-tile small { display: block; margin-top: 3px; color: var(--neo-muted); font-size: 11px; }
      .light-control-card .device-control-card { min-height: 132px; }
      .camera-panel { min-height: 280px; background: radial-gradient(circle at center, rgba(44, 156, 255, .18), rgba(20, 24, 57, .62)); place-items: center; text-align: center; }
      .camera-panel span { display: inline-flex; align-items: center; gap: 10px; color: var(--neo-muted); }
      .camera-panel ha-icon { width: 46px; height: 46px; color: var(--neo-blue); }
      .camera-panel strong { font-size: 22px; }
      .media-layout .device-control-card { min-height: 134px; }
      .server-layout { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
      .server-tile { min-height: 48px; grid-template-columns: 24px 1fr; gap: 8px; align-items: center; padding: 9px 10px; border-radius: 10px; }
      .server-tile.active { border-color: rgba(75, 214, 105, .45); }
      .server-tile.active ha-icon { color: #4bd669; }
      .custom-card-grid, .server-custom-card-grid { width: min(820px, 100%); display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .server-custom-card-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
      .lovelace-card-host { min-width: 0; }
      .rooms-grid { grid-template-columns: repeat(2, minmax(220px, 1fr)); }
      .room-card { min-height: 136px; display: grid; grid-template-columns: 48px 1fr; grid-template-rows: auto auto; gap: 10px 14px; align-items: center; padding: 18px; border-radius: 18px; background: linear-gradient(135deg, rgba(20, 24, 57, .74), rgba(12, 16, 43, .64)); border: 1px solid rgba(125, 145, 255, .20); text-align: left; box-shadow: 0 20px 36px rgba(0, 0, 0, .18); }
      .room-card.active { border-color: rgba(44, 156, 255, .62); box-shadow: 0 0 34px rgba(44, 156, 255, .18); }
      .room-card-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 16px; background: rgba(44, 156, 255, .16); color: var(--neo-blue); }
      .room-card-icon ha-icon { width: 28px; height: 28px; }
      .room-card-copy strong { display: block; font-size: 16px; letter-spacing: .02em; }
      .room-card-copy small { display: block; margin-top: 5px; color: var(--neo-muted); font-size: 12px; }
      .room-card-states { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px 10px; color: var(--neo-muted); font-size: 11px; }
      .room-card-states span { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
      .room-card-states ha-icon { width: 14px; height: 14px; color: var(--neo-blue); flex: 0 0 auto; }
      .feature-tile { min-height: 112px; display: grid; grid-template-columns: 42px 1fr; gap: 14px; align-items: center; padding: 18px; border-radius: 18px; background: rgba(20, 24, 57, .62); border: 1px solid rgba(125, 145, 255, .18); text-align: left; box-shadow: 0 20px 36px rgba(0, 0, 0, .18); }
      .feature-tile.active { background: linear-gradient(135deg, rgba(44, 156, 255, .34), rgba(20, 24, 57, .78)); border-color: rgba(44, 156, 255, .55); }
      .feature-tile ha-icon { width: 32px; height: 32px; color: var(--neo-blue); }
      .tile-copy strong { display: block; font-size: 15px; letter-spacing: .02em; }
      .tile-copy small { display: block; margin-top: 6px; color: var(--neo-muted); font-size: 12px; }
      .gauge-card { min-height: 146px; display: grid; justify-items: center; align-content: center; gap: 6px; padding: 12px 8px; background: rgba(20, 24, 57, .62); border: 1px solid rgba(61, 70, 124, .18); border-radius: 4px; }
      .gauge-ring { position: relative; display: grid; place-items: center; width: 112px; height: 112px; border-radius: 50%; background: conic-gradient(from 210deg, var(--gauge-color) var(--gauge-deg), rgba(255, 255, 255, .06) var(--gauge-deg) 300deg, transparent 300deg 360deg); }
      .gauge-ring:after { content: ''; position: absolute; inset: 7px; border-radius: 50%; background: #111530; box-shadow: inset 0 0 24px rgba(0, 0, 0, .35); }
      .gauge-name, .gauge-value, .gauge-unit { position: relative; z-index: 1; text-align: center; }
      .gauge-name { align-self: end; color: var(--neo-muted); }
      .gauge-name ha-icon { width: 18px; height: 18px; }
      .gauge-value { font-size: 26px; line-height: 1; }
      .gauge-value.is-off { font-size: 20px; letter-spacing: .04em; }
      .gauge-unit { align-self: start; font-size: 16px; font-weight: 700; }
      .gauge-label { color: var(--neo-muted); font-size: 11px; }
      .gauge-controls { display: grid; grid-template-columns: repeat(3, minmax(32px, 1fr)); gap: 6px; width: 92%; font-size: 12px; font-weight: 800; }
      .gauge-control { min-width: 0; min-height: 24px; padding: 0 8px; border-radius: 999px; background: rgba(44, 156, 255, .18); color: var(--neo-text); font-size: 11px; font-weight: 800; }
      .device-panel { grid-template-columns: 1fr; gap: 10px; }
      .device-control-card { display: grid; gap: 10px; padding: 12px; border-radius: 12px; background: rgba(20, 24, 57, .62); border: 1px solid rgba(61, 70, 124, .18); }
      .device-control-head { display: grid; grid-template-columns: 32px 1fr; gap: 10px; align-items: center; padding: 0; background: transparent; text-align: left; }
      .device-control-head ha-icon { width: 28px; height: 28px; color: var(--neo-blue); }
      .device-control-head strong { display: block; font-size: 13px; }
      .device-control-head small { display: block; margin-top: 4px; color: var(--neo-muted); font-size: 11px; }
      .device-control-buttons { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
      .device-control-buttons button { min-height: 26px; border-radius: 999px; background: rgba(44, 156, 255, .18); color: var(--neo-text); font-size: 11px; font-weight: 800; }
      .device-empty { padding: 16px; color: var(--neo-muted); text-align: center; }
      .bottom-nav { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); display: flex; gap: 8px; width: min(720px, calc(100% - 64px)); padding: 7px 12px; border-radius: 28px 28px 0 0; background: linear-gradient(180deg, rgba(27, 31, 78, .92), rgba(11, 14, 39, .96)); box-shadow: 0 -8px 32px rgba(30, 66, 210, .25); }
      .nav-item { position: relative; display: grid; gap: 3px; justify-items: center; flex: 1 1 0; min-width: 54px; padding: 6px 4px; background: transparent; color: var(--neo-muted); font-size: 10px; }
      .nav-item ha-icon { color: currentColor; width: 22px; height: 22px; }
      .nav-item.active { color: var(--neo-text); }
      .nav-item.active:after { content: ''; position: absolute; bottom: -5px; width: 46px; height: 3px; border-radius: 999px; background: var(--neo-text); }

      @media (orientation: landscape) and (min-width: 1100px) and (max-height: 860px) {
        :host {
          --neo-ipad-air-width: 1180px;
          --neo-ipad-air-height: 820px;
        }
        ha-card {
          height: 100dvh;
          max-height: var(--neo-ipad-air-height);
        }
        .dashboard-shell {
          width: min(100vw, var(--neo-ipad-air-width));
          height: min(100dvh, var(--neo-ipad-air-height));
          min-height: 0;
          margin: 0 auto;
          grid-template-columns: 252px 1fr;
          grid-template-rows: 104px 1fr 68px;
          gap: 14px 18px;
          padding: 18px 34px 0 26px;
        }
        .tabs { margin-bottom: 24px; }
        .systems { gap: 18px; margin-bottom: 32px; }
        .metrics { gap: 18px; padding-top: 24px; }
        .room-image-wrap { width: min(520px, 92%); }
        .room-image { min-height: 230px; max-height: 330px; }
        .quick-chips { margin-top: 24px; padding: 18px 48px; }
        .right-panel { gap: 10px; padding-right: 8px; }
        .gauge-card { min-height: 134px; padding: 8px 6px; }
        .gauge-ring { width: 96px; height: 96px; }
        .gauge-value { font-size: 23px; }
        .gauge-unit { font-size: 14px; }
        .page-grid, .rooms-grid { width: min(650px, 100%); gap: 14px; }
        .page-grid-wide, .full-page-grid, .server-layout, .custom-card-grid, .server-custom-card-grid { width: min(820px, 100%); gap: 10px; }
        .history-panel { min-height: 176px; }
        .history-panel svg { height: 76px; }
        .server-tile { min-height: 44px; padding: 8px 9px; }
        .rooms-grid { grid-template-columns: repeat(2, minmax(200px, 1fr)); }
        .room-card { min-height: 118px; padding: 14px; }
        .feature-tile { min-height: 96px; padding: 15px; }
        .bottom-nav { width: min(640px, 100%); padding: 6px 10px; }
        .nav-item { padding: 5px 3px; font-size: 9px; }
      }
      @media (max-width: 1000px) {
        ha-card { min-height: 100dvh; height: auto; }
        .dashboard-shell { grid-template-columns: 1fr; grid-template-rows: auto; grid-template-areas: 'top' 'content' 'left' 'nav'; padding: 18px 16px 0; min-height: 100dvh; }
        .top-bar { grid-template-columns: 1fr auto; grid-template-areas: 'title action' 'presence presence'; }
        .presence-strip { grid-area: presence; }
        .top-title { grid-area: title; justify-self: stretch; min-width: 0; }
        .top-actions { grid-area: action; }
        .floorplan-wrap { width: 100%; }
        .page-grid, .rooms-grid, .page-grid-wide, .full-page-grid, .server-layout, .custom-card-grid, .server-custom-card-grid { grid-template-columns: 1fr; }
        .span-2, .span-3, .span-4 { grid-column: auto; }
        .bottom-nav { position: static; transform: none; width: 100%; overflow-x: auto; justify-self: stretch; }
      }
    `;
  }
}



class HaNeoDashboardEditor extends HTMLElement {
  setConfig(config) {
    this.config = this.normalizeConfig(config || {});
    this.selectedKind = this.selectedKind || 'rooms';
    this.selectedIndex = this.selectedIndex || 0;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  connectedCallback() {
    this.addEventListener('click', this.handleClick);
    this.addEventListener('input', this.handleInput);
    this.addEventListener('change', this.handleInput);
    this.addEventListener('pointerdown', this.handleWorkspacePointerDown);
    this.render();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('input', this.handleInput);
    this.removeEventListener('change', this.handleInput);
    this.removeEventListener('pointerdown', this.handleWorkspacePointerDown);
  }

  normalizeConfig(config) {
    return {
      ...config,
      default_page: config.default_page || 'home',
      floorplan_editor: config.floorplan_editor ?? true,
      apartment_floorplan_image: config.apartment_floorplan_image ?? DEFAULT_CONFIG.apartment_floorplan_image,
      floorplan_rooms: cloneList(config.floorplan_rooms || DEFAULT_CONFIG.floorplan_rooms),
      floorplan_entities: cloneList(config.floorplan_entities || DEFAULT_CONFIG.floorplan_entities),
    };
  }

  render() {
    if (!this.config) {
      return;
    }

    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    this.ensureSelection();
    const selected = this.selectedItem;
    const selectedTitle = this.selectedKind === 'entities' ? 'Entität bearbeiten' : 'Raum bearbeiten';

    this.shadowRoot.innerHTML = `
      <style>${this.styles}</style>
      <section class="editor-shell">
        <header class="editor-head">
          <strong>HA Neo Dashboard anpassen</strong>
          <small>Der Editor ist absichtlich hier im Karten-Dialog, damit du nicht im YAML suchen musst.</small>
        </header>

        <section class="editor-card">
          <h3>Große Floorplan-Arbeitsfläche</h3>
          <label class="field wide">
            <span>Floorplan-Bild</span>
            <input type="text" value="${escapeAttr(this.config.apartment_floorplan_image || '')}" placeholder="/local/community/ha-dashboard-assets/home.svg" data-config-field="apartment_floorplan_image">
          </label>
          <label class="field toggle">
            <input type="checkbox" ${this.config.floorplan_editor !== false ? 'checked' : ''} data-config-field="floorplan_editor">
            <span>Button „Plan anpassen“ auch auf dem Dashboard anzeigen</span>
          </label>
          <div class="floorplan-workspace">
            ${this.config.apartment_floorplan_image ? `<img class="editor-floorplan-image" src="${escapeAttr(this.config.apartment_floorplan_image)}" alt="Floorplan">` : editorInlineFloorplan()}
            ${(this.config.floorplan_rooms || []).map((room, index) => this.renderWorkspaceItem('rooms', room, index)).join('')}
            ${(this.config.floorplan_entities || []).map((entity, index) => this.renderWorkspaceItem('entities', entity, index)).join('')}
          </div>
          <p class="hint">Tipp: Ziehe Räume und Entitäten direkt an die gewünschte Stelle. Bei Räumen kannst du die Ecke unten rechts ziehen, um die Rechtecke zu vergrößern oder zu verkleinern.</p>
        </section>

        <section class="editor-card grid-2">
          ${this.renderList('rooms', 'Räume', 'Raum hinzufügen')}
          ${this.renderList('entities', 'Entitäten', 'Entität hinzufügen')}
        </section>

        <section class="editor-card">
          <h3>${escapeHtml(selectedTitle)}</h3>
          ${selected ? this.renderSelectedControls(selected) : '<p class="hint">Wähle einen Eintrag aus.</p>'}
        </section>

        <section class="editor-card">
          <h3>Fertige Floorplan-Konfiguration</h3>
          <textarea readonly>${escapeHtml(floorplanYaml(this.config))}</textarea>
          <p class="hint">Home Assistant übernimmt Änderungen im visuellen Karten-Editor automatisch. Bei Bedarf kannst du diesen Block zusätzlich kopieren.</p>
        </section>
      </section>
    `;
  }

  renderWorkspaceItem(kind, item, index) {
    const active = this.selectedKind === kind && this.selectedIndex === index;
    const defaults = kind === 'rooms' ? { x: 50, y: 50, width: 16, height: 12 } : { x: 50, y: 50 };
    const style = floorplanElementStyle(item, defaults, kind === 'entities' ? { '--floorplan-entity-icon-size': cssLength(item.icon_size) } : {});
    const label = item.label || item.name || item.room || item.entity || `${kind === 'rooms' ? 'Raum' : 'Entity'} ${index + 1}`;

    if (kind === 'rooms') {
      return `<button class="workspace-room ${active ? 'active' : ''}" style="${escapeAttr(style)}" type="button" data-select-kind="rooms" data-select-index="${index}">${escapeHtml(label)}<i class="workspace-resize-handle" data-workspace-resize="true" aria-hidden="true"></i></button>`;
    }

    return `
      <button class="workspace-entity ${active ? 'active' : ''}" style="${escapeAttr(style)}" type="button" data-select-kind="entities" data-select-index="${index}">
        <ha-icon icon="${escapeAttr(item.icon || iconForDomain(item.entity?.split('.')[0]))}"></ha-icon>
        <span>${escapeHtml(label)}</span>
      </button>
    `;
  }

  renderList(kind, title, addLabel) {
    const items = this.config[kind === 'rooms' ? 'floorplan_rooms' : 'floorplan_entities'] || [];
    return `
      <section class="list-section">
        <h3>${escapeHtml(title)}</h3>
        <div class="item-list">
          ${items.map((item, index) => {
            const active = this.selectedKind === kind && this.selectedIndex === index;
            const label = item.label || item.name || item.room || item.entity || `${title} ${index + 1}`;
            return `<button class="${active ? 'active' : ''}" type="button" data-select-kind="${kind}" data-select-index="${index}">${escapeHtml(label)}</button>`;
          }).join('') || '<small>Noch keine Einträge.</small>'}
        </div>
        <div class="list-actions">
          <button class="secondary" type="button" data-add-kind="${kind}">${escapeHtml(addLabel)}</button>
          ${items.length ? `<button class="secondary danger" type="button" data-remove-kind="${kind}">Auswahl entfernen</button>` : ''}
        </div>
      </section>
    `;
  }

  renderSelectedControls(item) {
    const textControls = this.selectedKind === 'rooms'
      ? `${this.textControl('label', 'Name', item.label || item.name || '')}${this.textControl('room', 'Raum-ID', item.room || item.id || '')}`
      : `${this.textControl('name', 'Name', item.name || item.label || '')}${this.textControl('entity', 'Entity', item.entity || '')}${this.textControl('icon', 'Icon', item.icon || '')}`;
    const iconControl = this.selectedKind === 'entities' ? this.textControl('icon_size', 'Icon-Größe', item.icon_size || '') : '';

    return `
      <div class="control-grid">
        ${textControls}
        ${this.numberControl('x', 'X', item.x ?? item.left ?? 50)}
        ${this.numberControl('y', 'Y', item.y ?? item.top ?? 50)}
        ${this.numberControl('width', 'Breite', item.width ?? (this.selectedKind === 'rooms' ? 16 : 12))}
        ${this.numberControl('height', 'Höhe', item.height ?? (this.selectedKind === 'rooms' ? 12 : 7))}
        ${iconControl}
      </div>
    `;
  }

  textControl(field, label, value) {
    return `
      <label class="field">
        <span>${escapeHtml(label)}</span>
        <input type="text" value="${escapeAttr(value)}" data-item-field="${escapeAttr(field)}">
      </label>
    `;
  }

  numberControl(field, label, value) {
    const numericValue = Number.parseFloat(value);
    const displayValue = Number.isFinite(numericValue) ? numericValue : '';
    return `
      <label class="field number-field">
        <span>${escapeHtml(label)}</span>
        <input type="range" min="0" max="100" step="0.5" value="${escapeAttr(displayValue)}" data-item-field="${escapeAttr(field)}">
        <input type="number" min="0" max="100" step="0.5" value="${escapeAttr(displayValue)}" data-item-field="${escapeAttr(field)}">
      </label>
    `;
  }

  handleClick = (event) => {
    if (this.workspaceSuppressClick) {
      this.workspaceSuppressClick = false;
      event.preventDefault();
      return;
    }

    const target = event.composedPath().find((node) => node?.dataset?.selectKind || node?.dataset?.addKind || node?.dataset?.removeKind);
    if (!target) {
      return;
    }

    if (target.dataset.selectKind) {
      this.selectedKind = target.dataset.selectKind;
      this.selectedIndex = Number(target.dataset.selectIndex || 0);
      this.render();
      return;
    }

    if (target.dataset.addKind) {
      this.addItem(target.dataset.addKind);
      return;
    }

    if (target.dataset.removeKind) {
      this.removeSelectedItem(target.dataset.removeKind);
    }
  };

  handleInput = (event) => {
    const target = event.composedPath().find((node) => node?.dataset?.configField || node?.dataset?.itemField);
    if (!target) {
      return;
    }

    if (target.dataset.configField) {
      const field = target.dataset.configField;
      this.config[field] = target.type === 'checkbox' ? target.checked : target.value;
      this.configChanged({ render: event.type === 'change' });
      return;
    }

    const item = this.selectedItem;
    if (!item) {
      return;
    }

    const field = target.dataset.itemField;
    const numericFields = ['x', 'y', 'width', 'height'];
    item[field] = numericFields.includes(field) ? (target.value === '' ? '' : Number(target.value)) : target.value;
    this.updateWorkspaceItemStyle();
    this.syncEditorControls(field, target.value, target);
    this.configChanged({ render: event.type === 'change' });
  };

  handleWorkspacePointerDown = (event) => {
    const path = event.composedPath();
    if (!path.find((node) => node?.classList?.contains('floorplan-workspace'))) {
      return;
    }

    const element = path.find((node) => node?.dataset?.selectKind);
    if (!element) {
      return;
    }

    const workspace = this.shadowRoot?.querySelector('.floorplan-workspace');
    const kind = element.dataset.selectKind;
    const index = Number(element.dataset.selectIndex || 0);
    const item = (kind === 'entities' ? this.config.floorplan_entities : this.config.floorplan_rooms)?.[index];
    if (!workspace || !item) {
      return;
    }

    event.preventDefault();
    this.selectedKind = kind;
    this.selectedIndex = index;

    const rect = workspace.getBoundingClientRect();
    const startX = (item.x ?? item.left ?? 50);
    const startY = (item.y ?? item.top ?? 50);
    const startWidth = (item.width ?? (kind === 'rooms' ? 16 : 12));
    const startHeight = (item.height ?? (kind === 'rooms' ? 12 : 7));
    const resizing = Boolean(path.find((node) => node?.dataset?.workspaceResize));
    let moved = false;

    const onMove = (moveEvent) => {
      const dx = ((moveEvent.clientX - event.clientX) / rect.width) * 100;
      const dy = ((moveEvent.clientY - event.clientY) / rect.height) * 100;
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
        moved = true;
      }

      if (resizing) {
        item.width = roundPercent(Math.max(2, Number(startWidth) + dx));
        item.height = roundPercent(Math.max(2, Number(startHeight) + dy));
      } else {
        item.x = roundPercent(clamp(Number(startX) + dx, 0, 100));
        item.y = roundPercent(clamp(Number(startY) + dy, 0, 100));
      }

      this.updateWorkspaceItemStyle(element);
      this.syncEditorControls();
      this.configChanged({ render: false });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved) {
        this.workspaceSuppressClick = true;
      }
      this.configChanged();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  removeSelectedItem(kind = this.selectedKind) {
    const key = kind === 'entities' ? 'floorplan_entities' : 'floorplan_rooms';
    if (this.selectedKind !== kind) {
      this.selectedKind = kind;
      this.selectedIndex = 0;
    }

    this.config[key] = (this.config[key] || []).filter((_, index) => index !== this.selectedIndex);
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    this.ensureSelection();
    this.configChanged();
  }

  updateWorkspaceItemStyle(element) {
    const item = this.selectedItem;
    const target = element || this.shadowRoot?.querySelector(`[data-select-kind="${this.selectedKind}"][data-select-index="${this.selectedIndex}"]`);
    if (!target || !item) {
      return;
    }

    const defaults = this.selectedKind === 'rooms' ? { x: 50, y: 50, width: 16, height: 12 } : { x: 50, y: 50 };
    target.style.cssText = floorplanElementStyle(item, defaults, this.selectedKind === 'entities' ? { '--floorplan-entity-icon-size': cssLength(item.icon_size) } : {});
  }

  syncEditorControls(changedField, value, source) {
    const item = this.selectedItem;
    if (!item) {
      return;
    }

    ['x', 'y', 'width', 'height'].forEach((field) => {
      const nextValue = field === changedField ? value : item[field];
      this.shadowRoot?.querySelectorAll(`[data-item-field="${field}"]`).forEach((input) => {
        if (input !== source && nextValue !== undefined && nextValue !== null) {
          input.value = nextValue;
        }
      });
    });
  }

  addItem(kind) {
    if (kind === 'rooms') {
      this.config.floorplan_rooms = [...(this.config.floorplan_rooms || []), { label: 'Neuer Raum', room: this.config.default_room || 'living_room', x: 50, y: 50, width: 18, height: 14 }];
    } else {
      this.config.floorplan_entities = [...(this.config.floorplan_entities || []), { name: 'Neue Entität', entity: '', icon: 'mdi:gesture-tap-button', x: 50, y: 50, width: 14, height: 7 }];
    }
    this.selectedKind = kind;
    this.selectedIndex = (kind === 'rooms' ? this.config.floorplan_rooms : this.config.floorplan_entities).length - 1;
    this.configChanged();
  }

  configChanged({ render = true } = {}) {
    const config = { ...this.config };
    this.dispatchEvent(new CustomEvent('config-changed', { bubbles: true, composed: true, detail: { config } }));
    if (render) {
      this.render();
    }
  }

  ensureSelection() {
    const items = this.selectedKind === 'entities' ? this.config.floorplan_entities : this.config.floorplan_rooms;
    if (items?.[this.selectedIndex]) {
      return;
    }
    if (this.config.floorplan_rooms?.length) {
      this.selectedKind = 'rooms';
      this.selectedIndex = 0;
    } else if (this.config.floorplan_entities?.length) {
      this.selectedKind = 'entities';
      this.selectedIndex = 0;
    }
  }

  get selectedItem() {
    this.ensureSelection();
    return (this.selectedKind === 'entities' ? this.config.floorplan_entities : this.config.floorplan_rooms)?.[this.selectedIndex];
  }

  get styles() {
    return `
      :host { display: block; color: var(--primary-text-color); }
      .editor-shell { display: grid; gap: 14px; }
      .editor-head, .editor-card { display: grid; gap: 12px; padding: 14px; border-radius: 14px; background: var(--card-background-color, rgba(20, 24, 57, .08)); border: 1px solid var(--divider-color, rgba(127, 127, 127, .18)); }
      .editor-head strong { font-size: 16px; }
      .editor-head small, .hint, small { color: var(--secondary-text-color); font-size: 12px; line-height: 1.4; }
      h3 { margin: 0; font-size: 14px; }
      .grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .field { display: grid; gap: 6px; min-width: 0; font-size: 12px; font-weight: 700; color: var(--secondary-text-color); }
      .field input { min-width: 0; height: 36px; box-sizing: border-box; border: 1px solid var(--divider-color, rgba(127, 127, 127, .25)); border-radius: 8px; padding: 0 10px; background: var(--secondary-background-color, transparent); color: var(--primary-text-color); }
      .toggle { grid-template-columns: auto 1fr; align-items: center; font-weight: 500; }
      .toggle input { width: 18px; height: 18px; padding: 0; }
      .floorplan-workspace { position: relative; width: 100%; aspect-ratio: 1000 / 620; min-height: 300px; border-radius: 18px; overflow: hidden; background: radial-gradient(circle at center, rgba(44, 156, 255, .16), rgba(12, 15, 36, .62)); }
      .editor-floorplan-image, .editor-floorplan-svg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
      .editor-floorplan-svg { color: rgba(255,255,255,.9); }
      .editor-floorplan-svg .floorplan-wall { fill: none; stroke: rgba(224, 228, 255, .72); stroke-width: 8; stroke-linecap: square; stroke-linejoin: miter; }
      .editor-floorplan-svg .floorplan-door { fill: none; stroke: rgba(12, 15, 36, .95); stroke-width: 11; stroke-linecap: round; }
      .editor-floorplan-svg text { fill: currentColor; font-size: 34px; font-weight: 800; text-anchor: middle; paint-order: stroke; stroke: rgba(10, 12, 30, .9); stroke-width: 4px; }
      .workspace-room, .workspace-entity { position: absolute; transform: translate(-50%, -50%); box-sizing: border-box; touch-action: none; }
      .workspace-room { border-radius: 0; border: 1px solid rgba(44, 156, 255, .65); background: rgba(44, 156, 255, .16); color: white; font-size: 12px; font-weight: 900; }
      .workspace-entity { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 32px; padding: 6px 9px; border-radius: 999px; border: 1px solid rgba(169, 181, 232, .5); background: rgba(13, 17, 43, .82); color: white; font-size: 11px; font-weight: 800; }
      .workspace-entity ha-icon { width: var(--floorplan-entity-icon-size, 18px); height: var(--floorplan-entity-icon-size, 18px); }
      .workspace-room.active, .workspace-entity.active { outline: 3px solid #f29a37; outline-offset: 3px; z-index: 3; }
      .list-section { display: grid; gap: 10px; min-width: 0; }
      .item-list { display: grid; gap: 6px; max-height: 160px; overflow: auto; }
      .list-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .item-list button, .secondary { min-height: 34px; border: 0; border-radius: 9px; padding: 7px 10px; background: rgba(44, 156, 255, .12); color: var(--primary-text-color); text-align: left; font-weight: 700; }
      .item-list button.active { background: rgba(44, 156, 255, .34); }
      .secondary { text-align: center; background: rgba(242, 154, 55, .22); }
      .secondary.danger { background: rgba(242, 84, 84, .22); }
      .control-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .number-field { grid-template-columns: 56px 1fr 72px; align-items: center; }
      .number-field span { grid-column: 1; }
      .number-field input[type="range"] { grid-column: 2; padding: 0; border: 0; accent-color: #2c9cff; }
      .number-field input[type="number"] { grid-column: 3; }
      textarea { width: 100%; min-height: 220px; box-sizing: border-box; border-radius: 10px; padding: 12px; border: 1px solid var(--divider-color, rgba(127, 127, 127, .25)); background: var(--secondary-background-color, transparent); color: var(--primary-text-color); font-family: monospace; font-size: 12px; }
      @media (max-width: 720px) { .grid-2, .control-grid { grid-template-columns: 1fr; } .floorplan-workspace { min-height: 220px; } }
    `;
  }
}

const ROOM_SPECS = [
  { id: 'bedroom', title: 'SCHLAFZIMMER', subtitle: 'Ruhen', icon: 'mdi:bed-king-outline', prefix: 'bedroom', image: '/local/neo-dashboard/bedroom.png' },
  { id: 'living_room', title: 'WOHNZIMMER', subtitle: 'Erdgeschoss', icon: 'mdi:sofa-outline', prefix: 'living_room', image: '/local/neo-dashboard/living-room.png' },
  { id: 'office', title: 'BÜRO', subtitle: 'Arbeiten', icon: 'mdi:desk', prefix: 'office', image: '/local/neo-dashboard/office.png' },
  { id: 'kitchen', title: 'KÜCHE', subtitle: 'Kochen', icon: 'mdi:silverware-fork-knife', prefix: 'kitchen', image: '/local/neo-dashboard/kitchen.png' },
  { id: 'bathroom', title: 'BADEZIMMER', subtitle: 'Wellness', icon: 'mdi:shower-head', prefix: 'bathroom', image: '/local/neo-dashboard/bathroom.png' },
  { id: 'garage', title: 'GARAGE', subtitle: 'Tor und Fahrzeuge', icon: 'mdi:garage-variant', prefix: 'garage', image: '/local/neo-dashboard/garage.png' },
  { id: 'basement', title: 'KELLER', subtitle: 'Technik und Vorrat', icon: 'mdi:stairs-down', prefix: 'basement', image: '/local/neo-dashboard/basement.png' },
];

const DEFAULT_ROOMS = ROOM_SPECS.map((room) => createRoom(room));

const DEFAULT_PAGES = [
  { id: 'home', label: 'Startseite', title: 'STARTSEITE', subtitle: 'Wohnung', icon: 'mdi:home-outline', type: 'home' },
  { id: 'overview', label: 'Übersicht', title: 'WOHNZIMMER', subtitle: 'Erdgeschoss', icon: 'mdi:rocket-launch', type: 'overview' },
  {
    id: 'climate', label: 'Klima', title: 'KLIMA', subtitle: '7 Tage Verlauf und Heizung', icon: 'mdi:heat-wave',
    tiles: [
      { name: 'Heizung', entity: 'climate.{prefix}', icon: 'mdi:radiator', controls: heatingControls('climate.{prefix}'), tap_action: { action: 'more-info', entity: 'climate.{prefix}' } },
    ],
  },
  {
    id: 'lights', label: 'Lichter', title: 'LICHTER', subtitle: 'Alle Leuchten im Raum', icon: 'mdi:lightbulb-on-outline',
    tiles: [
      { name: 'Alle Lichter', entity: 'light.{prefix}_all', icon: 'mdi:lightbulb-group', controls: lightControls('light.{prefix}_all'), tap_action: { action: 'toggle', entity: 'light.{prefix}_all' } },
      { name: 'Hauptlicht', entity: 'light.{prefix}_main', icon: 'mdi:ceiling-light-multiple', controls: lightControls('light.{prefix}_main'), tap_action: { action: 'toggle', entity: 'light.{prefix}_main' } },
      { name: 'Schreibtischlicht', entity: 'light.{prefix}_desk', icon: 'mdi:desk-lamp', controls: lightControls('light.{prefix}_desk'), tap_action: { action: 'toggle', entity: 'light.{prefix}_desk' } },
      { name: 'Akzentlicht', entity: 'light.{prefix}_accent', icon: 'mdi:led-strip-variant', controls: lightControls('light.{prefix}_accent'), tap_action: { action: 'toggle', entity: 'light.{prefix}_accent' } },
    ],
  },
  {
    id: 'power', label: 'Strom', title: 'STROM', subtitle: 'Verbrauch und Steckdosen', icon: 'mdi:flash-outline',
    tiles: [
      { name: 'Raumverbrauch', entity: 'sensor.{prefix}_power', icon: 'mdi:flash', tap_action: { action: 'more-info', entity: 'sensor.{prefix}_power' } },
      { name: 'Tagesverbrauch', entity: 'sensor.{prefix}_energy_today', icon: 'mdi:chart-bar', tap_action: { action: 'more-info', entity: 'sensor.{prefix}_energy_today' } },
      { name: 'Steckdose 1', entity: 'switch.{prefix}_socket_1', icon: 'mdi:power-socket-de', tap_action: { action: 'toggle', entity: 'switch.{prefix}_socket_1' } },
      { name: 'Steckdose 2', entity: 'switch.{prefix}_socket_2', icon: 'mdi:power-socket-de', tap_action: { action: 'toggle', entity: 'switch.{prefix}_socket_2' } },
    ],
  },
  {
    id: 'security', label: 'Sicherheit', title: 'SICHERHEIT', subtitle: 'Kamerafeed, Tür und Fenster', icon: 'mdi:shield-home-outline',
    tiles: [
      { name: 'Kamerafeed', entity: 'camera.{prefix}', icon: 'mdi:cctv', tap_action: { action: 'more-info', entity: 'camera.{prefix}' } },
      { name: 'Türsensor', entity: 'binary_sensor.{prefix}_door', icon: 'mdi:door', tap_action: { action: 'more-info', entity: 'binary_sensor.{prefix}_door' } },
      { name: 'Fenstersensor', entity: 'binary_sensor.{prefix}_window', icon: 'mdi:window-closed-variant', tap_action: { action: 'more-info', entity: 'binary_sensor.{prefix}_window' } },
      { name: 'Alarm', entity: 'alarm_control_panel.home_alarm', icon: 'mdi:shield-lock', tap_action: { action: 'more-info', entity: 'alarm_control_panel.home_alarm' } },
    ],
  },
  {
    id: 'system', label: 'System', title: 'SYSTEM', subtitle: 'Home Assistant und Dienste', icon: 'mdi:cog-outline',
    tiles: [
      { name: 'Backups', entity: 'sensor.backup_state', icon: 'mdi:cloud-upload', tap_action: { action: 'more-info', entity: 'sensor.backup_state' } },
      { name: 'CPU', entity: 'sensor.centauri_cpu', icon: 'mdi:cpu-64-bit', tap_action: { action: 'more-info', entity: 'sensor.centauri_cpu' } },
      { name: 'Speicher', entity: 'sensor.ganymede_storage', icon: 'mdi:harddisk', tap_action: { action: 'more-info', entity: 'sensor.ganymede_storage' } },
      { name: 'HA neu starten', icon: 'mdi:restart', label: 'Dienstaufruf', tap_action: { action: 'call-service', service: 'homeassistant.restart' } },
    ],
  },
  {
    id: 'server', label: 'Server', title: 'SERVER', subtitle: 'MediaCenter22, Fritz!Box und Dienste', icon: 'mdi:server-network', rooms: ['office'],
    server: { name: 'MediaCenter22', icon: 'mdi:nas', entity: 'binary_sensor.192_168_178_22', tap_action: { action: 'more-info', entity: 'binary_sensor.192_168_178_22' } },
    server_status_sections: [
      {
        heading: 'CPU', icon: 'mdi:nas', badges: [
          { entity: 'sensor.192_168_178_22_cpu_auslastung', icon: 'phu:intel-cpu', ok_below: 50, warning_above: 50, name: 'CPU Auslastung' },
          { entity: 'sensor.192_168_178_22_k10temp_0_temperatur', icon: 'mdi:thermometer', ok_below: 75, critical_above: 74, name: 'CPU Temperatur' },
        ],
      },
      {
        heading: 'Lüfter', icon: 'mdi:fan', badges: [
          { entity: 'sensor.mediacenter22_fan_1', icon: 'mdi:fan', color: 'blue', name: 'Lüfter 1' },
          { entity: 'sensor.mediacenter22_fan_2', icon: 'mdi:fan', color: 'blue', name: 'Lüfter 2' },
        ],
      },
      {
        heading: 'Netzwerk', icon: 'mdi:network', badges: [
          { entity: 'sensor.mediacenter22_network_download', icon: 'mdi:download-network', color: 'blue', name: 'Download' },
          { entity: 'sensor.mediacenter22_network_upload', icon: 'mdi:upload-network', color: 'blue', name: 'Upload' },
        ],
      },
      {
        heading: 'RAM', icon: 'mdi:memory', badges: [
          { entity: 'sensor.mediacenter22_ram_usage', icon: 'mdi:memory', ok_below: 50, warning_above: 50, name: 'RAM Nutzung' },
          { entity: 'sensor.mediacenter22_ram_free', icon: 'mdi:database', color: 'green', name: 'RAM Frei' },
        ],
      },
      {
        heading: 'Speicher', icon: 'mdi:harddisk', badges: [
          { entity: 'sensor.mediacenter22_storage_usage', icon: 'mdi:harddisk', ok_below: 70, warning_above: 70, name: 'Speicher Nutzung' },
          { entity: 'sensor.mediacenter22_storage_free', icon: 'mdi:database-outline', color: 'yellow', name: 'Speicher Frei' },
        ],
      },
      {
        heading: 'Festplatten', icon: 'mdi:harddisk', badges: [
          { entity: 'sensor.mediacenter22_disk_1_temperature', icon: 'mdi:harddisk', ok_below: 45, warning_above: 45, name: 'Disk 1' },
          { entity: 'sensor.mediacenter22_disk_2_temperature', icon: 'mdi:harddisk', ok_below: 45, warning_above: 45, name: 'Disk 2' },
          { entity: 'sensor.mediacenter22_disk_3_temperature', icon: 'mdi:harddisk', ok_below: 45, warning_above: 45, name: 'Disk 3' },
          { entity: 'sensor.mediacenter22_disk_4_temperature', icon: 'mdi:harddisk', ok_below: 45, warning_above: 45, name: 'Disk 4' },
        ],
      },
    ],
    tiles: [
      { name: 'MediaCenter22', entity: 'sensor.mediacenter22_status', icon: 'mdi:power', span: 2, tap_action: { action: 'more-info', entity: 'sensor.mediacenter22_status' } },
      { name: 'Download', entity: 'sensor.fritzbox_download_speed', icon: 'mdi:download-network', tap_action: { action: 'more-info', entity: 'sensor.fritzbox_download_speed' } },
      { name: 'Upload', entity: 'sensor.fritzbox_upload_speed', icon: 'mdi:upload-network', tap_action: { action: 'more-info', entity: 'sensor.fritzbox_upload_speed' } },
      { name: 'Empfangen', entity: 'sensor.fritzbox_received', icon: 'mdi:download', tap_action: { action: 'more-info', entity: 'sensor.fritzbox_received' } },
      { name: 'Gesendet', entity: 'sensor.fritzbox_sent', icon: 'mdi:upload', tap_action: { action: 'more-info', entity: 'sensor.fritzbox_sent' } },
      { name: 'Firmware', entity: 'sensor.fritzbox_firmware', icon: 'mdi:router-wireless-settings', span: 2, tap_action: { action: 'more-info', entity: 'sensor.fritzbox_firmware' } },
      { name: 'Paperless Eingang', entity: 'sensor.paperless_inbox', icon: 'mdi:inbox-arrow-down', span: 2, tap_action: { action: 'more-info', entity: 'sensor.paperless_inbox' } },
      { name: 'Paperless Dokumente', entity: 'sensor.paperless_documents', icon: 'mdi:file-document', span: 2, tap_action: { action: 'more-info', entity: 'sensor.paperless_documents' } },
      { name: 'Jellyseerr', entity: 'binary_sensor.jellyseer_192_168_178_22_5055', icon: 'phu:jellyseerr', tap_action: { action: 'url', url_path: 'http://192.168.178.22:5055' } },
      { name: 'Immich Fotos', entity: 'sensor.immich_photos', icon: 'mdi:camera', tap_action: { action: 'more-info', entity: 'sensor.immich_photos' } },
      { name: 'Immich Videos', entity: 'sensor.immich_videos', icon: 'mdi:video', tap_action: { action: 'more-info', entity: 'sensor.immich_videos' } },
      { name: 'Immich Speicher', entity: 'sensor.immich_storage', icon: 'mdi:harddisk', span: 2, tap_action: { action: 'more-info', entity: 'sensor.immich_storage' } },
      { name: 'Jellyfin Filme', entity: 'sensor.jellyfin_movies', icon: 'mdi:movie-open-play', tap_action: { action: 'more-info', entity: 'sensor.jellyfin_movies' } },
      { name: 'Jellyfin Serien', entity: 'sensor.jellyfin_series', icon: 'mdi:television-classic', tap_action: { action: 'more-info', entity: 'sensor.jellyfin_series' } },
      { name: 'Jellyfin Episoden', entity: 'sensor.jellyfin_episodes', icon: 'mdi:play-box-multiple', span: 2, tap_action: { action: 'more-info', entity: 'sensor.jellyfin_episodes' } },
      { name: 'SABnzbd Geschwindigkeit', entity: 'sensor.sabnzbd_speed', icon: 'mdi:download-network', tap_action: { action: 'more-info', entity: 'sensor.sabnzbd_speed' } },
      { name: 'SABnzbd Abgeschlossen', entity: 'sensor.sabnzbd_completed', icon: 'mdi:download-box', tap_action: { action: 'more-info', entity: 'sensor.sabnzbd_completed' } },
      { name: 'SABnzbd Queue', entity: 'sensor.sabnzbd_queue', icon: 'mdi:download-multiple', span: 2, tap_action: { action: 'more-info', entity: 'sensor.sabnzbd_queue' } },
      { name: 'Prowlarr', entity: 'sensor.prowlarr_status', icon: 'mdi:account-key', tap_action: { action: 'more-info', entity: 'sensor.prowlarr_status' } },
      { name: 'Radarr', entity: 'sensor.radarr_status', icon: 'mdi:filmstrip', tap_action: { action: 'more-info', entity: 'sensor.radarr_status' } },
      { name: 'Sonarr', entity: 'sensor.sonarr_status', icon: 'mdi:television-classic', tap_action: { action: 'more-info', entity: 'sensor.sonarr_status' } },
      { name: 'qBittorrent', entity: 'sensor.qbittorrent_status', icon: 'mdi:alpha-q-box', tap_action: { action: 'more-info', entity: 'sensor.qbittorrent_status' } },
      { name: 'Datenträgerbelegung', entity: 'sensor.synology_rs1221_storage', icon: 'mdi:chart-areaspline', span: 4, tap_action: { action: 'more-info', entity: 'sensor.synology_rs1221_storage' } },
    ],
  },
];

const DEFAULT_CONFIG = {
  title: 'WOHNZIMMER',
  subtitle: 'Erdgeschoss',
  background_image: '',
  image: '/local/neo-dashboard/living-room.png',
  scene_label: 'SZENE',
  scene_entity: 'scene.living_room_evening',
  temperature_entity: 'sensor.living_room_temperature',
  humidity_entity: 'sensor.living_room_humidity',
  all_lights_entity: 'light.living_room_all',
  home_title: 'STARTSEITE',
  home_subtitle: 'Wohnung',
  apartment_floorplan_image: '/local/community/ha-dashboard-assets/home.svg',
  floorplan_editor: true,
  presence: [
    { name: 'Person 1', entity: 'person.person_1', icon: 'mdi:account', tap_action: { action: 'more-info', entity: 'person.person_1' } },
    { name: 'Person 2', entity: 'person.person_2', icon: 'mdi:account-outline', tap_action: { action: 'more-info', entity: 'person.person_2' } },
  ],
  floorplan_rooms: [
    { label: 'Büro', room: 'office', x: 65, y: 15, width: 30, height: 34 },
    { label: 'Küche', room: 'kitchen', x: 70, y: 50, width: 20, height: 34 },
    { label: 'Wohnzimmer', room: 'living_room', x: 55, y: 74, width: 30, height: 42 },
    { label: 'Badezimmer', room: 'bathroom', x: 10, y: 40, width: 20, height: 26 },
    { label: 'Schlafzimmer', room: 'bedroom', x: 10, y: 74, width: 30, height: 34 },
  ],
  floorplan_entities: [
    { name: 'Wohnzimmer Licht', entity: 'light.living_room_all', icon: 'mdi:lightbulb-group', x: 72, y: 36, width: 14, height: 7, tap_action: { action: 'toggle', entity: 'light.living_room_all' } },
    { name: 'Küche Temperatur', entity: 'sensor.kitchen_temperature', icon: 'mdi:thermometer', x: 48, y: 28, width: 13, height: 7 },
    { name: 'Büro Bewegung', entity: 'binary_sensor.office_motion', icon: 'mdi:motion-sensor', x: 24, y: 30, width: 12, height: 7 },
    { name: 'Haustür', entity: 'binary_sensor.living_room_door', icon: 'mdi:door', x: 59, y: 57, width: 10, height: 7 },
    { name: 'Schlafzimmer Licht', entity: 'light.bedroom_all', icon: 'mdi:lightbulb-outline', x: 70, y: 73, width: 14, height: 7, tap_action: { action: 'toggle', entity: 'light.bedroom_all' } },
  ],
  default_room: 'living_room',
  default_page: 'home',
  top_tabs: [
    { label: 'SYSTEM', tap_action: { action: 'none' } },
    { label: 'WARTUNG', tap_action: { action: 'navigate', navigation_path: '/lovelace/maintenance' } },
  ],
  room_overview_top_tabs: [
    { label: 'KALENDER', tap_action: { action: 'more-info', entity: 'calendar.home' } },
    { label: 'TODO', tap_action: { action: 'more-info', entity: 'todo.home' } },
    { label: 'WETTER', tap_action: { action: 'more-info', entity: 'weather.home' } },
  ],
  room_overview_systems: [
    { icon: 'mdi:calendar-clock', name: 'KALENDER', entity: 'calendar.home', label: 'Heute', color: 'muted', tap_action: { action: 'more-info', entity: 'calendar.home' } },
    { icon: 'mdi:checkbox-marked-circle-auto-outline', name: 'TODO', entity: 'todo.home', label: 'Aufgaben', color: 'muted', tap_action: { action: 'more-info', entity: 'todo.home' } },
    { icon: 'mdi:weather-partly-cloudy', name: 'WETTER', entity: 'weather.home', label: 'Vorhersage', color: 'muted', tap_action: { action: 'more-info', entity: 'weather.home' } },
  ],
  room_overview_metrics: [],
  systems: [
    { icon: 'mdi:check-circle', name: 'ALARM', entity: 'alarm_control_panel.home_alarm', label: 'Nicht scharf', color: 'muted', tap_action: { action: 'more-info', entity: 'alarm_control_panel.home_alarm' } },
    { icon: 'mdi:check-circle', name: 'KAMERAS', entity: 'camera.front_door', label: 'Aufzeichnung', color: 'muted', tap_action: { action: 'more-info', entity: 'camera.front_door' } },
    { icon: 'mdi:alert', name: 'BACKUPS', entity: 'sensor.backup_state', label: 'Cloud-Backup veraltet', color: 'orange', tap_action: { action: 'more-info', entity: 'sensor.backup_state' } },
    { icon: 'mdi:check-circle', name: 'USV', entity: 'sensor.ups_battery', label: '100% / 94m', color: 'muted', tap_action: { action: 'more-info', entity: 'sensor.ups_battery' } },
  ],
  metrics: [
    { name: 'CPU_Centauri (avg. 24h)', entity: 'sensor.centauri_cpu', max: 100, tap_action: { action: 'more-info', entity: 'sensor.centauri_cpu' } },
    { name: 'Speicher: Ganymede', entity: 'sensor.ganymede_storage', max: 100, tap_action: { action: 'more-info', entity: 'sensor.ganymede_storage' } },
    { name: 'Speicher: Metis', entity: 'sensor.metis_storage', max: 100, tap_action: { action: 'more-info', entity: 'sensor.metis_storage' } },
    { name: 'Starman', entity: 'sensor.starman_speed', max: 5000, unit: 'km/h', tap_action: { action: 'more-info', entity: 'sensor.starman_speed' } },
  ],
  gauges: [
    { name: 'TEMP', icon: 'mdi:thermometer', entity: 'sensor.living_room_temperature', unit: '°C', max: 30, color: '#aeb5e9', label_mode: 'temperature_comfort', tap_action: { action: 'more-info', entity: 'sensor.living_room_temperature' } },
    { name: 'FEUCHTE', icon: 'mdi:water-percent', entity: 'sensor.living_room_humidity', unit: '%', max: 100, color: '#f29a37', label: 'Trocken', tap_action: { action: 'more-info', entity: 'sensor.living_room_humidity' } },
    { name: 'HEIZUNG', icon: 'mdi:radiator', entity: 'climate.living_room', value_attribute: 'temperature', unit: '°C', max: 30, color: '#2c9cff', controls: heatingControls('climate.living_room'), tap_action: { action: 'more-info', entity: 'climate.living_room' } },
    { name: 'ALLE LICHTER', icon: 'mdi:lightbulb-group', entity: 'light.living_room_all', value_entity: 'sensor.living_room_light_level', unit: '%', max: 100, color: '#2c9cff', controls: lightControls('light.living_room_all'), tap_action: { action: 'toggle', entity: 'light.living_room_all' } },
    { name: 'STEHLAMPE', icon: 'mdi:floor-lamp', entity: 'light.floor_lamp', value_entity: 'sensor.floor_lamp_brightness', unit: '%', max: 100, color: '#2c9cff', controls: lightControls('light.floor_lamp'), tap_action: { action: 'toggle', entity: 'light.floor_lamp' } },
    { name: 'DECKENSPOTS', icon: 'mdi:ceiling-light-multiple', entity: 'light.ceiling_spots', value_entity: 'sensor.ceiling_spots_brightness', unit: '%', max: 100, color: '#2c9cff', controls: lightControls('light.ceiling_spots'), tap_action: { action: 'toggle', entity: 'light.ceiling_spots' } },
  ],
  room_overview_gauges: [
    { name: 'RÄUME', icon: 'mdi:floor-plan', entity: 'sensor.home_occupied_rooms', unit: '', max: 7, color: '#aeb5e9', label: 'Wohnung', tap_action: { action: 'none' } },
    { name: 'TEMP', icon: 'mdi:thermometer', entity: 'sensor.home_average_temperature', unit: '°C', max: 30, color: '#2c9cff', label: 'Ø Zuhause', tap_action: { action: 'more-info', entity: 'sensor.home_average_temperature' } },
    { name: 'FEUCHTE', icon: 'mdi:water-percent', entity: 'sensor.home_average_humidity', unit: '%', max: 100, color: '#f29a37', label: 'Ø Zuhause', tap_action: { action: 'more-info', entity: 'sensor.home_average_humidity' } },
    { name: 'LICHT', icon: 'mdi:lightbulb-group', entity: 'sensor.home_lights_on', unit: '', max: 20, color: '#2c9cff', label: 'Aktiv', tap_action: { action: 'more-info', entity: 'sensor.home_lights_on' } },
  ],
  rooms: DEFAULT_ROOMS,
  pages: DEFAULT_PAGES,
};






function entitySummary(hass, entries = [], activeStates = ['on']) {
  entries = entries || [];
  const active = entries
    .map((entry) => typeof entry === 'string' ? { entity: entry, name: entry } : entry)
    .filter((entry) => activeStates.includes(hass.states[entry.entity]?.state));

  if (!entries.length) {
    return { count: 0, label: '—' };
  }

  if (!active.length) {
    return { count: 0, label: '0 aktiv' };
  }

  const names = active.map((entry) => entry.name || entry.entity.split('.').pop()).slice(0, 2).join(', ');
  const suffix = active.length > 2 ? ` +${active.length - 2}` : '';
  return { count: active.length, label: `${active.length} ${names}${suffix}` };
}

function autoControlsForEntity(entity) {
  const domain = entity?.split('.')[0];
  if (domain === 'climate') {
    return heatingControls(entity);
  }
  if (domain === 'light') {
    return lightControls(entity);
  }
  if (['switch', 'fan', 'media_player'].includes(domain)) {
    return [{ label_mode: 'power', tap_action: { action: 'toggle', entity } }];
  }
  return [];
}

function iconForDomain(domain) {
  if (domain === 'climate') return 'mdi:radiator';
  if (domain === 'light') return 'mdi:lightbulb-group';
  if (domain === 'switch') return 'mdi:power-socket-de';
  if (domain === 'fan') return 'mdi:fan';
  if (domain === 'media_player') return 'mdi:play-box-outline';
  return 'mdi:gesture-tap-button';
}

function gaugeIcon(gauge) {
  if (gauge?.icon) {
    return gauge.icon;
  }

  const key = `${gauge?.name || ''} ${gauge?.entity || ''}`.toLowerCase();
  if (key.includes('feuchte') || key.includes('humidity')) {
    return 'mdi:water-percent';
  }
  if (key.includes('heizung') || key.includes('climate')) {
    return 'mdi:radiator';
  }
  if (key.includes('licht') || key.includes('light')) {
    return 'mdi:lightbulb-group';
  }
  if (key.includes('bewegung') || key.includes('motion')) {
    return 'mdi:motion-sensor';
  }
  if (key.includes('räume') || key.includes('rooms')) {
    return 'mdi:floor-plan';
  }

  return 'mdi:thermometer';
}

function temperatureComfortLabel(value) {
  if (value < 15) {
    return 'kalt';
  }

  if (value < 20) {
    return 'kühl';
  }

  if (value < 22) {
    return 'angenehm';
  }

  if (value < 25) {
    return 'warm';
  }

  return 'heiß';
}

function heatingControls(entity) {
  return [
    { label: '-', tap_action: { action: 'climate-temperature-step', entity, step: -0.5 } },
    { label_mode: 'climate_power', tap_action: { action: 'climate-toggle-heat', entity } },
    { label: '+', tap_action: { action: 'climate-temperature-step', entity, step: 0.5 } },
  ];
}

function lightControls(entity) {
  return [
    { label: '-', tap_action: { action: 'light-brightness-step', entity, step: -20 } },
    { label_mode: 'power', tap_action: { action: 'toggle', entity } },
    { label: '+', tap_action: { action: 'light-brightness-step', entity, step: 20 } },
  ];
}

function controlLabel(control, gauge, hass) {
  if (control.label_mode === 'climate_power' || control.label_mode === 'power') {
    return hass.states[gauge.entity]?.state === 'off' ? 'AN' : 'AUS';
  }

  return control.label || '';
}

function controlAction(control, gauge, hass) {
  if (control.label_mode === 'climate_power') {
    return { action: 'climate-toggle-heat', entity: control.tap_action?.entity || gauge.entity };
  }

  if (control.label_mode === 'power') {
    return { action: 'toggle', entity: control.tap_action?.entity || gauge.entity };
  }

  return control.tap_action;
}

function resolveRoomValue(value, room) {
  if (Array.isArray(value)) {
    return value.map((entry) => resolveRoomValue(entry, room));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, resolveRoomValue(entry, room)]));
  }

  if (typeof value !== 'string') {
    return value;
  }

  return value
    .replaceAll('{room}', room?.id || '')
    .replaceAll('{prefix}', room?.prefix || room?.id || '')
    .replaceAll('{title}', room?.title || '');
}

function normalizeRoom(room) {
  if (!room) {
    return {};
  }

  return {
    ...createRoom({
      id: room.id,
      title: room.title,
      subtitle: room.subtitle,
      icon: room.icon,
      prefix: room.prefix || room.id,
      image: room.image,
    }),
    ...room,
    prefix: room.prefix || room.id,
  };
}

function createRoom({ id, title, subtitle, icon, prefix, image }) {
  return {
    id,
    prefix,
    title,
    subtitle,
    icon,
    image,
    background_image: `/local/neo-dashboard/${id}-background.jpg`,
    scene_label: 'SZENE',
    scene_entity: `scene.${prefix}_evening`,
    temperature_entity: `sensor.${prefix}_temperature`,
    humidity_entity: `sensor.${prefix}_humidity`,
    climate_entity: `climate.${prefix}`,
    target_temperature_entity: `sensor.${prefix}_target_temperature`,
    all_lights_entity: `light.${prefix}_all`,
    light_level_entity: `sensor.${prefix}_light_level`,
    main_light_entity: `light.${prefix}_main`,
    main_light_level_entity: `sensor.${prefix}_main_light_level`,
    motion_entity: `binary_sensor.${prefix}_motion`,
    socket_entities: [
      { name: 'Steckdose 1', entity: `switch.${prefix}_socket_1` },
      { name: 'Steckdose 2', entity: `switch.${prefix}_socket_2` },
    ],
    contact_entities: [
      { name: 'Tür', entity: `binary_sensor.${prefix}_door` },
      { name: 'Fenster', entity: `binary_sensor.${prefix}_window` },
    ],
  };
}

function buildRoomConfig(config, room) {
  const activeRoom = normalizeRoom(room || config.rooms[0]);

  return {
    ...config,
    ...activeRoom,
    title: activeRoom?.title || config.title,
    subtitle: activeRoom?.subtitle || config.subtitle,
    image: activeRoom?.image || config.image,
    background_image: activeRoom?.background_image || config.background_image,
    scene_label: activeRoom?.scene_label || config.scene_label,
    scene_entity: activeRoom?.scene_entity || config.scene_entity,
    temperature_entity: activeRoom?.temperature_entity || config.temperature_entity,
    humidity_entity: activeRoom?.humidity_entity || config.humidity_entity,
    all_lights_entity: activeRoom?.all_lights_entity || config.all_lights_entity,
    gauges: activeRoom?.gauges || createRoomGauges(activeRoom),
    systems: activeRoom?.systems || config.systems,
    metrics: activeRoom?.metrics || config.metrics,
    top_tabs: activeRoom?.top_tabs || config.top_tabs,
  };
}

function createRoomGauges(room) {
  return [
    { name: 'TEMP', icon: 'mdi:thermometer', entity: room.temperature_entity, unit: '°C', max: 30, color: '#aeb5e9', label_mode: 'temperature_comfort', tap_action: { action: 'more-info', entity: room.temperature_entity } },
    { name: 'FEUCHTE', icon: 'mdi:water-percent', entity: room.humidity_entity, unit: '%', max: 100, color: '#f29a37', label: 'Raumklima', tap_action: { action: 'more-info', entity: room.humidity_entity } },
    { name: 'HEIZUNG', icon: 'mdi:radiator', entity: room.climate_entity, value_attribute: 'temperature', unit: '°C', max: 30, color: '#2c9cff', controls: heatingControls(room.climate_entity), tap_action: { action: 'more-info', entity: room.climate_entity } },
    { name: 'LICHT', icon: 'mdi:lightbulb-group', entity: room.all_lights_entity, value_entity: room.light_level_entity, unit: '%', max: 100, color: '#2c9cff', controls: lightControls(room.all_lights_entity), tap_action: { action: 'toggle', entity: room.all_lights_entity } },
    { name: 'HAUPTLICHT', icon: 'mdi:floor-lamp', entity: room.main_light_entity, value_entity: room.main_light_level_entity, unit: '%', max: 100, color: '#2c9cff', controls: lightControls(room.main_light_entity), tap_action: { action: 'toggle', entity: room.main_light_entity } },
    { name: 'BEWEGUNG', icon: 'mdi:motion-sensor', entity: room.motion_entity, unit: '', max: 1, color: '#aeb5e9', label_entity: room.motion_entity, tap_action: { action: 'more-info', entity: room.motion_entity } },
  ];
}

function mergeConfig(config) {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    top_tabs: config.top_tabs || DEFAULT_CONFIG.top_tabs,
    systems: config.systems || DEFAULT_CONFIG.systems,
    metrics: config.metrics || DEFAULT_CONFIG.metrics,
    gauges: config.gauges || DEFAULT_CONFIG.gauges,
    room_overview_gauges: config.room_overview_gauges || DEFAULT_CONFIG.room_overview_gauges,
    home_top_tabs: config.home_top_tabs || DEFAULT_CONFIG.home_top_tabs || config.room_overview_top_tabs || DEFAULT_CONFIG.room_overview_top_tabs,
    home_systems: config.home_systems || DEFAULT_CONFIG.home_systems || config.room_overview_systems || DEFAULT_CONFIG.room_overview_systems,
    home_metrics: config.home_metrics || DEFAULT_CONFIG.home_metrics || config.room_overview_metrics || DEFAULT_CONFIG.room_overview_metrics,
    presence: config.presence || DEFAULT_CONFIG.presence,
    floorplan_editor: config.floorplan_editor ?? DEFAULT_CONFIG.floorplan_editor,
    floorplan_rooms: cloneList(config.floorplan_rooms || DEFAULT_CONFIG.floorplan_rooms),
    floorplan_entities: cloneList(config.floorplan_entities || DEFAULT_CONFIG.floorplan_entities),
    room_overview_top_tabs: config.room_overview_top_tabs || DEFAULT_CONFIG.room_overview_top_tabs,
    room_overview_systems: config.room_overview_systems || DEFAULT_CONFIG.room_overview_systems,
    room_overview_metrics: config.room_overview_metrics || DEFAULT_CONFIG.room_overview_metrics,
    rooms: config.rooms || DEFAULT_CONFIG.rooms,
    pages: config.pages || DEFAULT_CONFIG.pages,
  };
}

function actionFor(item) {
  if (item?.tap_action) {
    return item.tap_action;
  }

  if (item?.entity) {
    return { action: 'more-info', entity: item.entity };
  }

  return { action: 'none' };
}

function stateLabel(hass, item) {
  if (!item.entity || !hass.states[item.entity]) {
    return item.label || '';
  }

  const state = hass.states[item.entity];
  return `${state.state}${state.attributes?.unit_of_measurement ? ` ${state.attributes.unit_of_measurement}` : ''}`;
}

function editorInlineFloorplan() {
  return `
    <svg class="editor-floorplan-svg" viewBox="0 0 1000 620" role="img" aria-label="2D Wohnungsplan">
      <rect class="floorplan-wall" x="90" y="70" width="760" height="470"></rect>
      <path class="floorplan-wall" d="M390 70v240M575 70v240M90 310h180M335 310h205M575 350h275M280 540V430h190v110M470 540V430h95v110M850 250h55v130h-55M850 410h45v75h-45"></path>
      <path class="floorplan-door" d="M270 310h65M540 310h35M90 395h75M220 395h180M470 395h95"></path>
      <text x="225" y="195">Büro</text>
      <text x="465" y="195">Küche</text>
      <text x="680" y="185">Wohnzimmer</text>
      <text x="305" y="485">Badezimmer</text>
      <text x="660" y="455">Schlafzimmer</text>
    </svg>
  `;
}

function cloneList(items) {
  return (items || []).map((item) => ({ ...item }));
}

function floorplanYaml(config) {
  const lines = [
    `apartment_floorplan_image: ${config.apartment_floorplan_image || ''}`,
    'floorplan_rooms:',
    ...yamlList(config.floorplan_rooms || [], ['label', 'room', 'x', 'y', 'width', 'height']),
    'floorplan_entities:',
    ...yamlList(config.floorplan_entities || [], ['name', 'entity', 'icon', 'x', 'y', 'width', 'height', 'icon_size']),
  ];

  return `${lines.join('\n')}\n`;
}

function yamlList(items, fields) {
  if (!items.length) {
    return ['  []'];
  }

  return items.flatMap((item) => fields
    .filter((field) => item[field] !== undefined && item[field] !== null && item[field] !== '')
    .map((field, index) => `${index === 0 ? '  -' : '  '} ${field}: ${yamlValue(item[field])}`));
}

function yamlValue(value) {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return String(value).includes(':') || String(value).includes('#')
    ? JSON.stringify(String(value))
    : String(value);
}

function floorplanElementStyle(item, defaults = {}, customProperties = {}) {
  const declarations = [
    ['left', cssLength(item.x ?? item.left, defaults.x)],
    ['top', cssLength(item.y ?? item.top, defaults.y)],
    ['width', cssLength(item.width, defaults.width)],
    ['height', cssLength(item.height, defaults.height)],
    ['min-width', cssLength(item.min_width)],
    ['min-height', cssLength(item.min_height)],
    ['max-width', cssLength(item.max_width)],
    ['max-height', cssLength(item.max_height)],
  ];

  Object.entries(customProperties).forEach(([property, value]) => {
    declarations.push([property, value]);
  });

  return declarations
    .filter(([, value]) => value)
    .map(([property, value]) => `${property}:${value}`)
    .join(';');
}

function cssLength(value, fallback) {
  const resolved = value ?? fallback;
  if (resolved === undefined || resolved === null || resolved === '') {
    return '';
  }

  if (typeof resolved === 'number') {
    return Number.isFinite(resolved) ? `${resolved}%` : '';
  }

  const normalized = String(resolved).trim();
  if (!normalized) {
    return '';
  }

  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    return `${normalized}%`;
  }

  if (/^-?\d+(?:\.\d+)?(?:%|px|rem|em|vh|vw|vmin|vmax|ch|cm|mm|in|pt|pc)$/i.test(normalized)) {
    return normalized;
  }

  return '';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundPercent(value) {
  return Math.round(value * 10) / 10;
}

function parseAktion(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch (_error) {
    return {};
  }
}

function jsonAttr(value) {
  return escapeAttr(JSON.stringify(value || {}));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function cssUrl(value) {
  return String(value ?? '').replace(/['"\\]/g, '');
}

if (!customElements.get('ha-neo-dashboard')) {
  customElements.define('ha-neo-dashboard', HaNeoDashboard);
}

if (!customElements.get('ha-neo-dashboard-editor')) {
  customElements.define('ha-neo-dashboard-editor', HaNeoDashboardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ha-neo-dashboard',
  name: 'HA Neo Dashboard',
  preview: true,
  description: 'Ein Vollbild-Home-Assistant-Dashboard mit konfigurierbaren Seiten, Hintergrund, Kacheln und Aktionen.',
});
