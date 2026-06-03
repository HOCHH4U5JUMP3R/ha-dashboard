class HaNeoDashboard extends HTMLElement {
  static getStubConfig() {
    return {
      title: 'LIVING ROOM',
      subtitle: 'Ground floor',
      background_image: '',
      image: '/local/neo-dashboard/living-room.png',
      default_page: 'overview',
      scene_entity: 'scene.living_room_evening',
      temperature_entity: 'sensor.living_room_temperature',
      humidity_entity: 'sensor.living_room_humidity',
      pages: DEFAULT_PAGES,
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this.config = mergeConfig(config);
    this.currentPage = this.currentPage || this.config.default_page || this.config.pages[0]?.id || 'overview';
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
            ${page?.type === 'overview' ? this.renderOverview() : this.renderPage(page)}
          </main>
          ${this.renderRightPanel(page)}
          ${this.renderNavigation()}
        </section>
      </ha-card>
    `;
  }

  renderLeftPanel() {
    return `
      <aside class="left-panel">
        <div class="tabs">
          ${this.config.top_tabs.map((tab, index) => `
            <button class="tab ${index === 0 ? 'tab-active' : ''}" type="button" data-action='${jsonAttr(tab.tap_action)}'>${escapeHtml(tab.label)}</button>
          `).join('')}
        </div>
        <div class="systems">
          ${this.config.systems.map((item) => this.renderStatusRow(item)).join('')}
        </div>
        <div class="metrics">
          ${this.config.metrics.map((metric) => this.renderMetric(metric)).join('')}
        </div>
      </aside>
    `;
  }

  renderStatusRow(item) {
    const colorClass = item.color === 'orange' ? 'orange' : 'muted';
    return `
      <button class="system-row" type="button" data-action='${jsonAttr(actionFor(item))}'>
        <ha-icon class="${colorClass}" icon="${escapeAttr(item.icon)}"></ha-icon>
        <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(stateLabel(this._hass, item))}</small></span>
      </button>
    `;
  }

  renderMetric(metric) {
    const value = this.stateNumber(metric.entity);
    const max = Number(metric.max ?? 100);
    const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    const unit = metric.unit ?? this.stateUnit(metric.entity) ?? '%';

    return `
      <button class="metric" type="button" data-action='${jsonAttr(actionFor(metric))}'>
        <span>${escapeHtml(metric.name)}</span>
        <b>${this.formatNumber(value)}${unit === '%' ? '%' : ` ${escapeHtml(unit)}`}</b>
        <i><em style="width:${percent}%"></em></i>
      </button>
    `;
  }

  renderOverview() {
    return `
      ${this.renderTitle(this.config.title, this.config.subtitle)}
      <div class="room-image-wrap">
        <img class="room-image" src="${escapeAttr(this.config.image)}" alt="${escapeAttr(this.config.title)}">
        ${this.config.scene_entity ? `
          <button class="scene-button" type="button" data-action='${jsonAttr({ action: 'call-service', service: 'scene.turn_on', target: { entity_id: this.config.scene_entity } })}'>
            ${escapeHtml(this.config.scene_label)}
          </button>
        ` : ''}
      </div>
      <div class="quick-chips">
        ${this.renderChip('mdi:thermometer', this.config.temperature_entity)}
        ${this.renderChip('mdi:water-percent', this.config.humidity_entity)}
        ${this.renderChip('mdi:lightbulb-group', this.config.all_lights_entity)}
      </div>
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
      ${this.renderTitle(page?.title || this.config.title, page?.subtitle || this.config.subtitle)}
      <section class="page-grid">
        ${(page?.tiles || []).map((tile) => this.renderTile(tile)).join('')}
      </section>
    `;
  }

  renderTile(tile) {
    const entity = tile.entity ? this._hass.states[tile.entity] : undefined;
    const state = tile.value ?? (entity ? `${this.formatState(entity)}${this.unitSuffix(entity)}` : tile.label || '');
    const active = entity && ['on', 'heat', 'cool', 'playing', 'home', 'armed_home', 'armed_away'].includes(entity.state);

    return `
      <button class="feature-tile ${active ? 'active' : ''}" type="button" data-action='${jsonAttr(actionFor(tile))}'>
        <ha-icon icon="${escapeAttr(tile.icon || 'mdi:gesture-tap-button')}"></ha-icon>
        <span class="tile-copy">
          <strong>${escapeHtml(tile.name || tile.entity || 'Action')}</strong>
          <small>${escapeHtml(state)}</small>
        </span>
      </button>
    `;
  }

  renderRightPanel(page) {
    const gauges = page?.gauges || this.config.gauges;

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
    const value = this.stateNumber(gauge.value_entity || gauge.entity);
    const max = Number(gauge.max ?? 100);
    const degrees = max > 0 ? Math.max(0, Math.min(300, (value / max) * 300)) : 0;
    const label = gauge.label_entity ? stateLabel(this._hass, { entity: gauge.label_entity }) : gauge.label;

    return `
      <button class="gauge-card" type="button" data-action='${jsonAttr(actionFor(gauge))}'>
        <span class="gauge-ring" style="--gauge-color:${escapeAttr(gauge.color || '#2c9cff')};--gauge-deg:${degrees}deg">
          <span class="gauge-name">${escapeHtml(gauge.name)}</span>
          <span class="gauge-value">${this.formatNumber(value)}</span>
          <span class="gauge-unit">${escapeHtml(gauge.unit || this.stateUnit(gauge.value_entity || gauge.entity) || '')}</span>
        </span>
        ${label ? `<span class="gauge-label ${gauge.color === '#f29a37' ? 'orange-text' : ''}">${escapeHtml(label)}</span>` : ''}
        ${gauge.controls ? `<span class="gauge-controls"><b>${escapeHtml(gauge.controls[0] || '')}</b><b>${escapeHtml(gauge.controls[1] || '')}</b></span>` : ''}
      </button>
    `;
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
    const target = event.composedPath().find((node) => node?.dataset?.action || node?.dataset?.page);
    if (!target) {
      return;
    }

    if (target.dataset.page) {
      const action = parseAction(target.dataset.action);
      if (!action.action) {
        this.currentPage = target.dataset.page;
        this.render();
        return;
      }
    }

    this.performAction(parseAction(target.dataset.action));
  };

  performAction(action) {
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

    if (action.action === 'call-service' && action.service) {
      const [domain, service] = action.service.split('.');
      this._hass.callService(domain, service, action.data || {}, action.target || undefined);
    }
  }

  get activePage() {
    return this.config.pages.find((page) => page.id === this.currentPage) || this.config.pages[0];
  }

  get backgroundStyle() {
    if (!this.config.background_image) {
      return '';
    }

    return `--neo-custom-bg:url('${cssUrl(this.config.background_image)}')`;
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
        min-height: 100vh;
      }
      ha-card {
        min-height: 100vh;
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
        grid-template-columns: minmax(240px, 300px) minmax(380px, 1fr) minmax(300px, 360px);
        grid-template-rows: 1fr 76px;
        grid-template-areas:
          'left content right'
          'left nav right';
        gap: 20px;
        min-height: 100vh;
        padding: 46px 34px 0;
        background: rgba(5, 8, 26, .2);
        backdrop-filter: saturate(120%);
      }
      .left-panel { grid-area: left; }
      .content-panel { grid-area: content; display: grid; align-content: start; justify-items: center; min-width: 0; }
      .right-panel { grid-area: right; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-content: start; }
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
      .room-title { width: 190px; margin: 0 auto 58px; border: 1px solid rgba(169, 181, 232, .38); border-radius: 7px; padding: 12px 8px 10px; text-align: center; background: rgba(12, 15, 36, .55); }
      .room-title h2 { margin: 0; font-size: 22px; font-weight: 500; letter-spacing: .03em; }
      .room-title p { margin: 10px 0 0; color: var(--neo-muted); font-size: 11px; }
      .room-image-wrap { position: relative; width: min(620px, 92%); filter: drop-shadow(0 40px 42px rgba(95, 125, 255, .28)); }
      .room-image { display: block; width: 100%; min-height: 260px; object-fit: contain; }
      .scene-button { position: absolute; top: 52%; left: 50%; transform: translate(-50%, -50%); min-width: 92px; min-height: 44px; border-radius: 6px; background: rgba(255, 255, 255, .92); color: #15172d; font-size: 12px; font-weight: 800; }
      .quick-chips { display: flex; gap: 10px; justify-content: center; margin-top: 42px; padding: 24px 60px; background: radial-gradient(circle at center, rgba(123, 145, 255, .32), transparent 58%); }
      .chip { display: inline-flex; gap: 7px; align-items: center; border-radius: 999px; padding: 7px 12px; background: rgba(22, 27, 68, .76); color: var(--neo-text); }
      .chip ha-icon { width: 18px; color: var(--neo-blue); }
      .page-grid { width: min(760px, 100%); display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 16px; }
      .feature-tile { min-height: 112px; display: grid; grid-template-columns: 42px 1fr; gap: 14px; align-items: center; padding: 18px; border-radius: 18px; background: rgba(20, 24, 57, .62); border: 1px solid rgba(125, 145, 255, .18); text-align: left; box-shadow: 0 20px 36px rgba(0, 0, 0, .18); }
      .feature-tile.active { background: linear-gradient(135deg, rgba(44, 156, 255, .34), rgba(20, 24, 57, .78)); border-color: rgba(44, 156, 255, .55); }
      .feature-tile ha-icon { width: 32px; height: 32px; color: var(--neo-blue); }
      .tile-copy strong { display: block; font-size: 15px; letter-spacing: .02em; }
      .tile-copy small { display: block; margin-top: 6px; color: var(--neo-muted); font-size: 12px; }
      .gauge-card { min-height: 154px; display: grid; justify-items: center; align-content: center; gap: 6px; padding: 12px 8px; background: rgba(20, 24, 57, .62); border: 1px solid rgba(61, 70, 124, .18); border-radius: 4px; }
      .gauge-ring { position: relative; display: grid; place-items: center; width: 112px; height: 112px; border-radius: 50%; background: conic-gradient(from 210deg, var(--gauge-color) var(--gauge-deg), rgba(255, 255, 255, .06) var(--gauge-deg) 300deg, transparent 300deg 360deg); }
      .gauge-ring:after { content: ''; position: absolute; inset: 7px; border-radius: 50%; background: #111530; box-shadow: inset 0 0 24px rgba(0, 0, 0, .35); }
      .gauge-name, .gauge-value, .gauge-unit { position: relative; z-index: 1; text-align: center; }
      .gauge-name { align-self: end; color: var(--neo-muted); font-size: 9px; font-weight: 700; }
      .gauge-value { font-size: 26px; line-height: 1; }
      .gauge-unit { align-self: start; font-size: 16px; font-weight: 700; }
      .gauge-label { color: var(--neo-muted); font-size: 11px; }
      .gauge-controls { display: flex; justify-content: space-between; width: 86%; font-size: 12px; font-weight: 800; }
      .bottom-nav { grid-area: nav; align-self: end; justify-self: center; display: flex; gap: 8px; width: min(720px, 100%); padding: 8px 12px; border-radius: 28px 28px 0 0; background: linear-gradient(180deg, rgba(27, 31, 78, .92), rgba(11, 14, 39, .96)); box-shadow: 0 -8px 32px rgba(30, 66, 210, .25); }
      .nav-item { position: relative; display: grid; gap: 3px; justify-items: center; flex: 1 1 0; min-width: 54px; padding: 6px 4px; background: transparent; color: var(--neo-muted); font-size: 10px; }
      .nav-item ha-icon { color: currentColor; width: 22px; height: 22px; }
      .nav-item.active { color: var(--neo-text); }
      .nav-item.active:after { content: ''; position: absolute; bottom: -5px; width: 46px; height: 3px; border-radius: 999px; background: var(--neo-text); }
      @media (max-width: 1000px) {
        ha-card { min-height: 100vh; }
        .dashboard-shell { grid-template-columns: 1fr; grid-template-rows: auto; grid-template-areas: 'content' 'right' 'left' 'nav'; padding: 24px 16px 0; min-height: 100vh; }
        .right-panel { grid-template-columns: repeat(2, minmax(140px, 1fr)); }
        .page-grid { grid-template-columns: 1fr; }
        .room-title { margin-bottom: 28px; }
        .bottom-nav { overflow-x: auto; justify-self: stretch; }
      }
    `;
  }
}

const DEFAULT_PAGES = [
  { id: 'overview', label: 'Overview', title: 'LIVING ROOM', subtitle: 'Ground floor', icon: 'mdi:rocket-launch', type: 'overview' },
  {
    id: 'climate', label: 'Climate', title: 'CLIMATE', subtitle: 'Heating and air', icon: 'mdi:heat-wave',
    tiles: [
      { name: 'Heating', entity: 'climate.living_room', icon: 'mdi:radiator', tap_action: { action: 'more-info', entity: 'climate.living_room' } },
      { name: 'Boost heat', icon: 'mdi:fire', label: 'Set 22 °C', tap_action: { action: 'call-service', service: 'climate.set_temperature', target: { entity_id: 'climate.living_room' }, data: { temperature: 22 } } },
      { name: 'Comfort scene', icon: 'mdi:home-thermometer', label: 'Run scene', tap_action: { action: 'call-service', service: 'scene.turn_on', target: { entity_id: 'scene.living_room_comfort' } } },
      { name: 'Thermostat details', entity: 'sensor.living_room_temperature', icon: 'mdi:thermometer', tap_action: { action: 'more-info', entity: 'sensor.living_room_temperature' } },
    ],
  },
  {
    id: 'lights', label: 'Lights', title: 'LIGHTS', subtitle: 'Room ambience', icon: 'mdi:lightbulb-on-outline',
    tiles: [
      { name: 'All lights', entity: 'light.living_room_all', icon: 'mdi:lightbulb-group', tap_action: { action: 'toggle', entity: 'light.living_room_all' } },
      { name: 'Floor lamp', entity: 'light.floor_lamp', icon: 'mdi:floor-lamp', tap_action: { action: 'toggle', entity: 'light.floor_lamp' } },
      { name: 'Ceiling spots', entity: 'light.ceiling_spots', icon: 'mdi:ceiling-light-multiple', tap_action: { action: 'toggle', entity: 'light.ceiling_spots' } },
      { name: 'Movie light', icon: 'mdi:movie-open', label: 'Run scene', tap_action: { action: 'call-service', service: 'scene.turn_on', target: { entity_id: 'scene.living_room_movie' } } },
    ],
  },
  {
    id: 'security', label: 'Security', title: 'SECURITY', subtitle: 'Protection and cameras', icon: 'mdi:shield-home-outline',
    tiles: [
      { name: 'Alarm', entity: 'alarm_control_panel.home_alarm', icon: 'mdi:shield-lock', tap_action: { action: 'more-info', entity: 'alarm_control_panel.home_alarm' } },
      { name: 'Front camera', entity: 'camera.front_door', icon: 'mdi:cctv', tap_action: { action: 'more-info', entity: 'camera.front_door' } },
      { name: 'Lock front door', entity: 'lock.front_door', icon: 'mdi:lock', tap_action: { action: 'call-service', service: 'lock.lock', target: { entity_id: 'lock.front_door' } } },
      { name: 'Open cameras', icon: 'mdi:video-box', label: 'Navigate', tap_action: { action: 'navigate', navigation_path: '/lovelace/security' } },
    ],
  },
  {
    id: 'media', label: 'Media', title: 'MEDIA', subtitle: 'Music and TV', icon: 'mdi:play-box-outline',
    tiles: [
      { name: 'TV', entity: 'media_player.living_room_tv', icon: 'mdi:television', tap_action: { action: 'toggle', entity: 'media_player.living_room_tv' } },
      { name: 'Speaker', entity: 'media_player.living_room_speaker', icon: 'mdi:speaker', tap_action: { action: 'more-info', entity: 'media_player.living_room_speaker' } },
      { name: 'Play/Pause', icon: 'mdi:play-pause', label: 'Speaker', tap_action: { action: 'call-service', service: 'media_player.media_play_pause', target: { entity_id: 'media_player.living_room_speaker' } } },
      { name: 'Movie scene', icon: 'mdi:movie', label: 'Lights + media', tap_action: { action: 'call-service', service: 'scene.turn_on', target: { entity_id: 'scene.living_room_movie' } } },
    ],
  },
  {
    id: 'maintenance', label: 'Maintenance', title: 'MAINTENANCE', subtitle: 'Systems health', icon: 'mdi:router-wireless-settings',
    tiles: [
      { name: 'Backups', entity: 'sensor.backup_state', icon: 'mdi:cloud-upload', tap_action: { action: 'more-info', entity: 'sensor.backup_state' } },
      { name: 'CPU', entity: 'sensor.centauri_cpu', icon: 'mdi:cpu-64-bit', tap_action: { action: 'more-info', entity: 'sensor.centauri_cpu' } },
      { name: 'Storage', entity: 'sensor.ganymede_storage', icon: 'mdi:harddisk', tap_action: { action: 'more-info', entity: 'sensor.ganymede_storage' } },
      { name: 'Restart HA', icon: 'mdi:restart', label: 'Service call', tap_action: { action: 'call-service', service: 'homeassistant.restart' } },
    ],
  },
  {
    id: 'presence', label: 'Presence', title: 'PRESENCE', subtitle: 'People and automations', icon: 'mdi:map-marker-radius-outline',
    tiles: [
      { name: 'Person 1', entity: 'person.person_1', icon: 'mdi:account', tap_action: { action: 'more-info', entity: 'person.person_1' } },
      { name: 'Person 2', entity: 'person.person_2', icon: 'mdi:account-outline', tap_action: { action: 'more-info', entity: 'person.person_2' } },
      { name: 'Guest mode', entity: 'input_boolean.guest_mode', icon: 'mdi:account-plus', tap_action: { action: 'toggle', entity: 'input_boolean.guest_mode' } },
      { name: 'Away mode', entity: 'input_boolean.away_mode', icon: 'mdi:home-export-outline', tap_action: { action: 'toggle', entity: 'input_boolean.away_mode' } },
    ],
  },
  {
    id: 'systems', label: 'Systems', title: 'SYSTEMS', subtitle: 'Infrastructure', icon: 'mdi:database-cog-outline',
    tiles: [
      { name: 'UPS', entity: 'sensor.ups_battery', icon: 'mdi:battery-high', tap_action: { action: 'more-info', entity: 'sensor.ups_battery' } },
      { name: 'Router', entity: 'binary_sensor.router_status', icon: 'mdi:router-network', tap_action: { action: 'more-info', entity: 'binary_sensor.router_status' } },
      { name: 'Server', entity: 'sensor.server_status', icon: 'mdi:server', tap_action: { action: 'more-info', entity: 'sensor.server_status' } },
      { name: 'Logs', icon: 'mdi:text-box-search', label: 'Navigate', tap_action: { action: 'navigate', navigation_path: '/config/logs' } },
    ],
  },
];

const DEFAULT_CONFIG = {
  title: 'LIVING ROOM',
  subtitle: 'Ground floor',
  background_image: '',
  image: '/local/neo-dashboard/living-room.png',
  scene_label: 'SCENE',
  scene_entity: 'scene.living_room_evening',
  temperature_entity: 'sensor.living_room_temperature',
  humidity_entity: 'sensor.living_room_humidity',
  all_lights_entity: 'light.living_room_all',
  default_page: 'overview',
  top_tabs: [
    { label: 'SYSTEMS', tap_action: { action: 'none' } },
    { label: 'MAINTENANCE', tap_action: { action: 'navigate', navigation_path: '/lovelace/maintenance' } },
  ],
  systems: [
    { icon: 'mdi:check-circle', name: 'ALARM', entity: 'alarm_control_panel.home_alarm', label: 'Not armed', color: 'muted', tap_action: { action: 'more-info', entity: 'alarm_control_panel.home_alarm' } },
    { icon: 'mdi:check-circle', name: 'SECURITY CAMERAS', entity: 'camera.front_door', label: 'Recording', color: 'muted', tap_action: { action: 'more-info', entity: 'camera.front_door' } },
    { icon: 'mdi:alert', name: 'BACKUPS', entity: 'sensor.backup_state', label: 'Cloud backup outdated', color: 'orange', tap_action: { action: 'more-info', entity: 'sensor.backup_state' } },
    { icon: 'mdi:check-circle', name: 'UPS', entity: 'sensor.ups_battery', label: '100% / 94m', color: 'muted', tap_action: { action: 'more-info', entity: 'sensor.ups_battery' } },
  ],
  metrics: [
    { name: 'CPU_Centauri (avg. 24h)', entity: 'sensor.centauri_cpu', max: 100, tap_action: { action: 'more-info', entity: 'sensor.centauri_cpu' } },
    { name: 'Storage: Ganymede', entity: 'sensor.ganymede_storage', max: 100, tap_action: { action: 'more-info', entity: 'sensor.ganymede_storage' } },
    { name: 'Storage: Metis', entity: 'sensor.metis_storage', max: 100, tap_action: { action: 'more-info', entity: 'sensor.metis_storage' } },
    { name: 'Starman', entity: 'sensor.starman_speed', max: 5000, unit: 'km/h', tap_action: { action: 'more-info', entity: 'sensor.starman_speed' } },
  ],
  gauges: [
    { name: 'TEMP', entity: 'sensor.living_room_temperature', unit: '°C', max: 30, color: '#aeb5e9', label: 'Comfortable', tap_action: { action: 'more-info', entity: 'sensor.living_room_temperature' } },
    { name: 'HUMIDITY', entity: 'sensor.living_room_humidity', unit: '%', max: 100, color: '#f29a37', label: 'Dry', tap_action: { action: 'more-info', entity: 'sensor.living_room_humidity' } },
    { name: 'HEATING', entity: 'climate.living_room', value_entity: 'sensor.living_room_target_temperature', unit: '°C', max: 30, color: '#2c9cff', controls: ['-', '+'], tap_action: { action: 'more-info', entity: 'climate.living_room' } },
    { name: 'ALL LIGHTS', entity: 'light.living_room_all', value_entity: 'sensor.living_room_light_level', unit: '%', max: 100, color: '#2c9cff', controls: ['OFF', 'DIM'], tap_action: { action: 'toggle', entity: 'light.living_room_all' } },
    { name: 'FLOOR LAMP', entity: 'light.floor_lamp', value_entity: 'sensor.floor_lamp_brightness', unit: '%', max: 100, color: '#2c9cff', controls: ['OFF', 'DIM'], tap_action: { action: 'toggle', entity: 'light.floor_lamp' } },
    { name: 'CEILING SPOTS', entity: 'light.ceiling_spots', value_entity: 'sensor.ceiling_spots_brightness', unit: '%', max: 100, color: '#2c9cff', controls: ['ON', ''], tap_action: { action: 'toggle', entity: 'light.ceiling_spots' } },
  ],
  pages: DEFAULT_PAGES,
};

function mergeConfig(config) {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    top_tabs: config.top_tabs || DEFAULT_CONFIG.top_tabs,
    systems: config.systems || DEFAULT_CONFIG.systems,
    metrics: config.metrics || DEFAULT_CONFIG.metrics,
    gauges: config.gauges || DEFAULT_CONFIG.gauges,
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

function parseAction(value) {
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
  description: 'A fullscreen Home Assistant dashboard with configurable pages, background, tiles and actions.',
});
