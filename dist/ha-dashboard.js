class HaNeoDashboard extends HTMLElement {
  static getStubConfig() {
    return {
      default_page: 'rooms',
      default_room: 'living_room',
      rooms: DEFAULT_ROOMS,
      pages: DEFAULT_PAGES,
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this.config = mergeConfig(config);
    this.currentRoom = this.currentRoom || this.config.default_room || this.config.rooms[0]?.id || 'living_room';
    this.currentPage = this.currentPage || this.config.default_page || this.config.pages[0]?.id || 'rooms';
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
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
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
          ${this.renderLeftPanel()}
          <main class="content-panel">
            ${page?.type === 'rooms' ? this.renderRooms() : page?.type === 'overview' ? this.renderÜbersicht() : this.renderPage(page)}
          </main>
          ${this.renderRightPanel(page)}
          ${this.renderNavigation()}
        </section>
      </ha-card>
    `;
  }

  renderLeftPanel() {
    const cfg = this.activeConfig;
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
        <div class="metrics">
          ${cfg.metrics.map((metric) => this.renderMetric(metric)).join('')}
        </div>
      </aside>
    `;
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
      ${this.renderTitle(cfg.title, cfg.subtitle)}
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
      ${this.renderTitle('RAUMÜBERSICHT', 'Wohnung')}
      <section class="rooms-grid">
        ${this.config.rooms.map((room) => this.renderRoomCard(room)).join('')}
      </section>
    `;
  }

  renderRoomCard(room) {
    const temperature = room.temperature_entity ? this._hass.states[room.temperature_entity] : undefined;
    const humidity = room.humidity_entity ? this._hass.states[room.humidity_entity] : undefined;
    const lights = room.all_lights_entity ? this._hass.states[room.all_lights_entity] : undefined;
    const active = room.id === this.currentRoom;

    return `
      <button class="room-card ${active ? 'active' : ''}" type="button" data-room="${escapeAttr(room.id)}">
        <span class="room-card-icon"><ha-icon icon="${escapeAttr(room.icon || 'mdi:home-outline')}"></ha-icon></span>
        <span class="room-card-copy">
          <strong>${escapeHtml(room.title)}</strong>
          <small>${escapeHtml(room.subtitle || '')}</small>
        </span>
        <span class="room-card-states">
          <span>${temperature ? `${this.formatState(temperature)}${this.unitSuffix(temperature)}` : '—'}</span>
          <span>${humidity ? `${this.formatState(humidity)}${this.unitSuffix(humidity)}` : '—'}</span>
          <span>${lights?.state === 'on' ? 'Licht an' : 'Licht aus'}</span>
        </span>
      </button>
    `;
  }

  renderTitle(title, subtitle) {
    return `
      <div class="room-title">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle || '')}</p>
      </div>
    `;
  }

  renderPage(page) {
    return `
      ${this.renderTitle(page?.title || this.activeConfig.title, page?.subtitle || this.activeConfig.subtitle)}
      <section class="page-grid">
        ${(page?.tiles || []).map((tile) => this.renderTile(tile)).join('')}
      </section>
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
    const gauges = page?.type === 'rooms' ? this.config.room_overview_gauges : page?.gauges || this.activeConfig.gauges;

    return `
      <aside class="right-panel">
        ${gauges.map((gauge) => this.renderGauge(gauge)).join('')}
      </aside>
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
    const degrees = max > 0 ? Math.max(0, Math.min(300, (value / max) * 300)) : 0;
    const label = this.gaugeLabel(resolvedGauge, value);

    return `
      <div class="gauge-card" role="button" tabindex="0" data-action='${jsonAttr(actionFor(resolvedGauge))}'>
        <span class="gauge-ring" style="--gauge-color:${escapeAttr(resolvedGauge.color || '#2c9cff')};--gauge-deg:${degrees}deg">
          <span class="gauge-name"><ha-icon icon="${escapeAttr(gaugeIcon(resolvedGauge))}"></ha-icon></span>
          <span class="gauge-value">${this.formatNumber(value)}</span>
          <span class="gauge-unit">${escapeHtml(resolvedGauge.unit || this.stateUnit(resolvedGauge.value_entity || resolvedGauge.entity) || '')}</span>
        </span>
        ${label ? `<span class="gauge-label ${resolvedGauge.color === '#f29a37' ? 'orange-text' : ''}">${escapeHtml(label)}</span>` : ''}
        ${resolvedGauge.controls ? this.renderGaugeControls(resolvedGauge.controls) : ''}
      </div>
    `;
  }

  renderGaugeControls(controls) {
    return `
      <span class="gauge-controls">
        ${controls.map((control) => {
          if (typeof control === 'string') {
            return `<b>${escapeHtml(control)}</b>`;
          }

          return `<button class="gauge-control" type="button" data-action='${jsonAttr(control.tap_action)}'>${escapeHtml(control.label)}</button>`;
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

  renderNavigation() {
    return `
      <nav class="bottom-nav">
        ${this.config.pages.map((page) => `
          <button class="nav-item ${page.id === this.currentPage ? 'active' : ''}" type="button" data-page="${escapeAttr(page.id)}" data-action='${jsonAttr(page.tap_action || {})}'>
            <ha-icon icon="${escapeAttr(page.icon || 'mdi:view-dashboard-outline')}"></ha-icon>
            <span>${escapeHtml(page.label || page.title || page.id)}</span>
          </button>
        `).join('')}
      </nav>
    `;
  }

  handleClick = (event) => {
    const target = event.composedPath().find((node) => node?.dataset?.room || node?.dataset?.action || node?.dataset?.page);
    if (!target) {
      return;
    }

    if (target.dataset.room) {
      this.currentRoom = target.dataset.room;
      this.currentPage = 'overview';
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

    if (action.action === 'call-service' && action.service) {
      const [domain, service] = action.service.split('.');
      this._hass.callService(domain, service, action.data || {}, action.target || undefined);
    }
  }

  get activePage() {
    return this.config.pages.find((page) => page.id === this.currentPage) || this.config.pages[0];
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
        grid-template-columns: minmax(230px, 280px) minmax(360px, 1fr) minmax(288px, 328px);
        grid-template-rows: 1fr 76px;
        grid-template-areas:
          'left content right'
          'left nav right';
        gap: 16px;
        height: 100dvh;
        min-height: 100dvh;
        padding: 34px 28px 0;
        background: rgba(5, 8, 26, .2);
        backdrop-filter: saturate(120%);
      }
      .left-panel { grid-area: left; }
      .content-panel { grid-area: content; display: grid; align-content: start; justify-items: center; min-width: 0; }
      .right-panel { grid-area: right; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-content: start; padding-right: 18px; }
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
      .room-title { width: 190px; margin: 0 auto 38px; border: 1px solid rgba(169, 181, 232, .38); border-radius: 7px; padding: 12px 8px 10px; text-align: center; background: rgba(12, 15, 36, .55); }
      .room-title h2 { margin: 0; font-size: 22px; font-weight: 500; letter-spacing: .03em; }
      .room-title p { margin: 10px 0 0; color: var(--neo-muted); font-size: 11px; }
      .room-image-wrap { position: relative; width: min(620px, 92%); filter: drop-shadow(0 40px 42px rgba(95, 125, 255, .28)); }
      .room-image { display: block; width: 100%; min-height: 260px; object-fit: contain; }
      .scene-button { position: absolute; top: 52%; left: 50%; transform: translate(-50%, -50%); min-width: 92px; min-height: 44px; border-radius: 6px; background: rgba(255, 255, 255, .92); color: #15172d; font-size: 12px; font-weight: 800; }
      .quick-chips { display: flex; gap: 10px; justify-content: center; margin-top: 42px; padding: 24px 60px; background: radial-gradient(circle at center, rgba(123, 145, 255, .32), transparent 58%); }
      .chip { display: inline-flex; gap: 7px; align-items: center; border-radius: 999px; padding: 7px 12px; background: rgba(22, 27, 68, .76); color: var(--neo-text); }
      .chip ha-icon { width: 18px; color: var(--neo-blue); }
      .page-grid, .rooms-grid { width: min(760px, 100%); display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 16px; }
      .rooms-grid { grid-template-columns: repeat(2, minmax(220px, 1fr)); }
      .room-card { min-height: 116px; display: grid; grid-template-columns: 48px 1fr; grid-template-rows: auto auto; gap: 10px 14px; align-items: center; padding: 18px; border-radius: 18px; background: linear-gradient(135deg, rgba(20, 24, 57, .74), rgba(12, 16, 43, .64)); border: 1px solid rgba(125, 145, 255, .20); text-align: left; box-shadow: 0 20px 36px rgba(0, 0, 0, .18); }
      .room-card.active { border-color: rgba(44, 156, 255, .62); box-shadow: 0 0 34px rgba(44, 156, 255, .18); }
      .room-card-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 16px; background: rgba(44, 156, 255, .16); color: var(--neo-blue); }
      .room-card-icon ha-icon { width: 28px; height: 28px; }
      .room-card-copy strong { display: block; font-size: 16px; letter-spacing: .02em; }
      .room-card-copy small { display: block; margin-top: 5px; color: var(--neo-muted); font-size: 12px; }
      .room-card-states { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 8px; color: var(--neo-muted); font-size: 11px; }
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
      .gauge-unit { align-self: start; font-size: 16px; font-weight: 700; }
      .gauge-label { color: var(--neo-muted); font-size: 11px; }
      .gauge-controls { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; width: 92%; font-size: 12px; font-weight: 800; }
      .gauge-control { min-width: 34px; min-height: 24px; padding: 0 8px; border-radius: 999px; background: rgba(44, 156, 255, .18); color: var(--neo-text); font-size: 11px; font-weight: 800; }
      .bottom-nav { grid-area: nav; align-self: end; justify-self: center; display: flex; gap: 8px; width: min(720px, 100%); padding: 7px 12px; border-radius: 28px 28px 0 0; background: linear-gradient(180deg, rgba(27, 31, 78, .92), rgba(11, 14, 39, .96)); box-shadow: 0 -8px 32px rgba(30, 66, 210, .25); }
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
          grid-template-columns: 252px 1fr 312px;
          grid-template-rows: 1fr 68px;
          gap: 14px;
          padding: 30px 26px 0;
        }
        .tabs { margin-bottom: 24px; }
        .systems { gap: 18px; margin-bottom: 32px; }
        .metrics { gap: 18px; padding-top: 24px; }
        .room-title { margin-bottom: 30px; }
        .room-image-wrap { width: min(520px, 92%); }
        .room-image { min-height: 230px; max-height: 330px; }
        .quick-chips { margin-top: 24px; padding: 18px 48px; }
        .right-panel { gap: 10px; padding-right: 8px; }
        .gauge-card { min-height: 134px; padding: 8px 6px; }
        .gauge-ring { width: 96px; height: 96px; }
        .gauge-value { font-size: 23px; }
        .gauge-unit { font-size: 14px; }
        .page-grid, .rooms-grid { width: min(650px, 100%); gap: 14px; }
        .rooms-grid { grid-template-columns: repeat(2, minmax(200px, 1fr)); }
        .room-card { min-height: 98px; padding: 14px; }
        .feature-tile { min-height: 96px; padding: 15px; }
        .bottom-nav { width: min(640px, 100%); padding: 6px 10px; }
        .nav-item { padding: 5px 3px; font-size: 9px; }
      }
      @media (max-width: 1000px) {
        ha-card { min-height: 100dvh; height: auto; }
        .dashboard-shell { grid-template-columns: 1fr; grid-template-rows: auto; grid-template-areas: 'content' 'right' 'left' 'nav'; padding: 24px 16px 0; min-height: 100dvh; }
        .right-panel { grid-template-columns: repeat(2, minmax(140px, 1fr)); padding-right: 0; }
        .page-grid, .rooms-grid { grid-template-columns: 1fr; }
        .room-title { margin-bottom: 28px; }
        .bottom-nav { overflow-x: auto; justify-self: stretch; }
      }
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
  { id: 'rooms', label: 'Räume', title: 'RAUMÜBERSICHT', subtitle: 'Wohnung', icon: 'mdi:floor-plan', type: 'rooms' },
  { id: 'overview', label: 'Übersicht', title: 'WOHNZIMMER', subtitle: 'Erdgeschoss', icon: 'mdi:rocket-launch', type: 'overview' },
  {
    id: 'climate', label: 'Klima', title: 'KLIMA', subtitle: 'Heizung und Luft', icon: 'mdi:heat-wave',
    tiles: [
      { name: 'Heizung', entity: 'climate.{prefix}', icon: 'mdi:radiator', tap_action: { action: 'more-info', entity: 'climate.{prefix}' } },
      { name: 'Heizung Boost', icon: 'mdi:fire', label: '22 °C setzen', tap_action: { action: 'call-service', service: 'climate.set_temperature', target: { entity_id: 'climate.{prefix}' }, data: { temperature: 22 } } },
      { name: 'Komfortszene', icon: 'mdi:home-thermometer', label: 'Szene starten', tap_action: { action: 'call-service', service: 'scene.turn_on', target: { entity_id: 'scene.{prefix}_comfort' } } },
      { name: 'Thermostatdetails', entity: 'sensor.{prefix}_temperature', icon: 'mdi:thermometer', tap_action: { action: 'more-info', entity: 'sensor.{prefix}_temperature' } },
    ],
  },
  {
    id: 'lights', label: 'Lichter', title: 'LICHTER', subtitle: 'Raumstimmung', icon: 'mdi:lightbulb-on-outline',
    tiles: [
      { name: 'Alle Lichter', entity: 'light.{prefix}_all', icon: 'mdi:lightbulb-group', tap_action: { action: 'toggle', entity: 'light.{prefix}_all' } },
      { name: 'Stehlampe', entity: 'light.{prefix}_main', icon: 'mdi:floor-lamp', tap_action: { action: 'toggle', entity: 'light.{prefix}_main' } },
      { name: 'Deckenspots', entity: 'light.{prefix}_ceiling', icon: 'mdi:ceiling-light-multiple', tap_action: { action: 'toggle', entity: 'light.{prefix}_ceiling' } },
      { name: 'Kinolicht', icon: 'mdi:movie-open', label: 'Szene starten', tap_action: { action: 'call-service', service: 'scene.turn_on', target: { entity_id: 'scene.{prefix}_movie' } } },
    ],
  },
  {
    id: 'security', label: 'Sicherheit', title: 'SICHERHEIT', subtitle: 'Schutz und Kameras', icon: 'mdi:shield-home-outline',
    tiles: [
      { name: 'Alarm', entity: 'alarm_control_panel.home_alarm', icon: 'mdi:shield-lock', tap_action: { action: 'more-info', entity: 'alarm_control_panel.home_alarm' } },
      { name: 'Kamera Eingang', entity: 'camera.{prefix}', icon: 'mdi:cctv', tap_action: { action: 'more-info', entity: 'camera.{prefix}' } },
      { name: 'Haustür verriegeln', entity: 'lock.{prefix}', icon: 'mdi:lock', tap_action: { action: 'call-service', service: 'lock.lock', target: { entity_id: 'lock.{prefix}' } } },
      { name: 'Kameras öffnen', icon: 'mdi:video-box', label: 'Navigation', tap_action: { action: 'navigate', navigation_path: '/lovelace/security' } },
    ],
  },
  {
    id: 'media', label: 'Medien', title: 'MEDIEN', subtitle: 'Musik und TV', icon: 'mdi:play-box-outline',
    tiles: [
      { name: 'TV', entity: 'media_player.{prefix}_tv', icon: 'mdi:television', tap_action: { action: 'toggle', entity: 'media_player.{prefix}_tv' } },
      { name: 'Lautsprecher', entity: 'media_player.{prefix}_speaker', icon: 'mdi:speaker', tap_action: { action: 'more-info', entity: 'media_player.{prefix}_speaker' } },
      { name: 'Play/Pause', icon: 'mdi:play-pause', label: 'Lautsprecher', tap_action: { action: 'call-service', service: 'media_player.media_play_pause', target: { entity_id: 'media_player.{prefix}_speaker' } } },
      { name: 'Kinoszene', icon: 'mdi:movie', label: 'Lichter + Medien', tap_action: { action: 'call-service', service: 'scene.turn_on', target: { entity_id: 'scene.{prefix}_movie' } } },
    ],
  },
  {
    id: 'maintenance', label: 'Wartung', title: 'WARTUNG', subtitle: 'Systemzustand', icon: 'mdi:router-wireless-settings',
    tiles: [
      { name: 'Backups', entity: 'sensor.backup_state', icon: 'mdi:cloud-upload', tap_action: { action: 'more-info', entity: 'sensor.backup_state' } },
      { name: 'CPU', entity: 'sensor.centauri_cpu', icon: 'mdi:cpu-64-bit', tap_action: { action: 'more-info', entity: 'sensor.centauri_cpu' } },
      { name: 'Speicher', entity: 'sensor.ganymede_storage', icon: 'mdi:harddisk', tap_action: { action: 'more-info', entity: 'sensor.ganymede_storage' } },
      { name: 'HA neu starten', icon: 'mdi:restart', label: 'Dienstaufruf', tap_action: { action: 'call-service', service: 'homeassistant.restart' } },
    ],
  },
  {
    id: 'presence', label: 'Anwesenheit', title: 'ANWESENHEIT', subtitle: 'Personen und Automationen', icon: 'mdi:map-marker-radius-outline',
    tiles: [
      { name: 'Person 1', entity: 'person.person_1', icon: 'mdi:account', tap_action: { action: 'more-info', entity: 'person.person_1' } },
      { name: 'Person 2', entity: 'person.person_2', icon: 'mdi:account-outline', tap_action: { action: 'more-info', entity: 'person.person_2' } },
      { name: 'Gastmodus', entity: 'input_boolean.guest_mode', icon: 'mdi:account-plus', tap_action: { action: 'toggle', entity: 'input_boolean.guest_mode' } },
      { name: 'Abwesenheitsmodus', entity: 'input_boolean.away_mode', icon: 'mdi:home-export-outline', tap_action: { action: 'toggle', entity: 'input_boolean.away_mode' } },
    ],
  },
  {
    id: 'systems', label: 'System', title: 'SYSTEM', subtitle: 'Infrastruktur', icon: 'mdi:database-cog-outline',
    tiles: [
      { name: 'USV', entity: 'sensor.ups_battery', icon: 'mdi:battery-high', tap_action: { action: 'more-info', entity: 'sensor.ups_battery' } },
      { name: 'Router', entity: 'binary_sensor.router_status', icon: 'mdi:router-network', tap_action: { action: 'more-info', entity: 'binary_sensor.router_status' } },
      { name: 'Server', entity: 'sensor.server_status', icon: 'mdi:server', tap_action: { action: 'more-info', entity: 'sensor.server_status' } },
      { name: 'Protokolle', icon: 'mdi:text-box-search', label: 'Navigation', tap_action: { action: 'navigate', navigation_path: '/config/logs' } },
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
  default_room: 'living_room',
  default_page: 'rooms',
  top_tabs: [
    { label: 'SYSTEM', tap_action: { action: 'none' } },
    { label: 'WARTUNG', tap_action: { action: 'navigate', navigation_path: '/lovelace/maintenance' } },
  ],
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
    { name: 'ALLE LICHTER', icon: 'mdi:lightbulb-group', entity: 'light.living_room_all', value_entity: 'sensor.living_room_light_level', unit: '%', max: 100, color: '#2c9cff', controls: ['OFF', 'DIM'], tap_action: { action: 'toggle', entity: 'light.living_room_all' } },
    { name: 'STEHLAMPE', icon: 'mdi:floor-lamp', entity: 'light.floor_lamp', value_entity: 'sensor.floor_lamp_brightness', unit: '%', max: 100, color: '#2c9cff', controls: ['OFF', 'DIM'], tap_action: { action: 'toggle', entity: 'light.floor_lamp' } },
    { name: 'DECKENSPOTS', icon: 'mdi:ceiling-light-multiple', entity: 'light.ceiling_spots', value_entity: 'sensor.ceiling_spots_brightness', unit: '%', max: 100, color: '#2c9cff', controls: ['ON', ''], tap_action: { action: 'toggle', entity: 'light.ceiling_spots' } },
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
    { label: '+', tap_action: { action: 'climate-temperature-step', entity, step: 0.5 } },
    { label: 'AN', tap_action: { action: 'climate-hvac-mode', entity, hvac_mode: 'heat' } },
    { label: 'AUS', tap_action: { action: 'climate-hvac-mode', entity, hvac_mode: 'off' } },
  ];
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
    { name: 'LICHT', icon: 'mdi:lightbulb-group', entity: room.all_lights_entity, value_entity: room.light_level_entity, unit: '%', max: 100, color: '#2c9cff', controls: ['AUS', 'DIM'], tap_action: { action: 'toggle', entity: room.all_lights_entity } },
    { name: 'HAUPTLICHT', icon: 'mdi:floor-lamp', entity: room.main_light_entity, value_entity: room.main_light_level_entity, unit: '%', max: 100, color: '#2c9cff', controls: ['AUS', 'AN'], tap_action: { action: 'toggle', entity: room.main_light_entity } },
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

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ha-neo-dashboard',
  name: 'HA Neo Dashboard',
  preview: true,
  description: 'Ein Vollbild-Home-Assistant-Dashboard mit konfigurierbaren Seiten, Hintergrund, Kacheln und Aktionen.',
});
