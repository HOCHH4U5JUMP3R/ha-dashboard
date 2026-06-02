class HaNeoDashboard extends HTMLElement {
  static getStubConfig() {
    return {
      title: 'LIVING ROOM',
      subtitle: 'Ground floor',
      image: '/local/neo-dashboard/living-room.png',
      scene_entity: 'scene.living_room_evening',
      temperature_entity: 'sensor.living_room_temperature',
      humidity_entity: 'sensor.living_room_humidity',
      heating_entity: 'climate.living_room',
      heating_value_entity: 'sensor.living_room_target_temperature',
      all_lights_entity: 'light.living_room_all',
      all_lights_value_entity: 'sensor.living_room_light_level',
      floor_lamp_entity: 'light.floor_lamp',
      floor_lamp_value_entity: 'sensor.floor_lamp_brightness',
      ceiling_spots_entity: 'light.ceiling_spots',
      ceiling_spots_value_entity: 'sensor.ceiling_spots_brightness',
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this.config = {
      title: 'LIVING ROOM',
      subtitle: 'Ground floor',
      image: '/local/neo-dashboard/living-room.png',
      scene_label: 'SCENE',
      scene_entity: 'scene.living_room_evening',
      temperature_entity: 'sensor.living_room_temperature',
      humidity_entity: 'sensor.living_room_humidity',
      heating_entity: 'climate.living_room',
      heating_value_entity: 'sensor.living_room_target_temperature',
      all_lights_entity: 'light.living_room_all',
      all_lights_value_entity: 'sensor.living_room_light_level',
      floor_lamp_entity: 'light.floor_lamp',
      floor_lamp_value_entity: 'sensor.floor_lamp_brightness',
      ceiling_spots_entity: 'light.ceiling_spots',
      ceiling_spots_value_entity: 'sensor.ceiling_spots_brightness',
      systems: [
        { icon: 'mdi:check-circle', name: 'ALARM', label: 'Not armed', color: 'muted' },
        { icon: 'mdi:check-circle', name: 'SECURITY CAMERAS', label: 'Recording', color: 'muted' },
        { icon: 'mdi:alert', name: 'BACKUPS', label: 'Cloud backup outdated', color: 'orange' },
        { icon: 'mdi:check-circle', name: 'UPS', label: '100% / 94m', color: 'muted' },
      ],
      metrics: [
        { name: 'CPU_Centauri (avg. 24h)', entity: 'sensor.centauri_cpu', max: 100 },
        { name: 'Storage: Ganymede', entity: 'sensor.ganymede_storage', max: 100 },
        { name: 'Storage: Metis', entity: 'sensor.metis_storage', max: 100 },
        { name: 'Starman', entity: 'sensor.starman_speed', max: 5000, unit: 'km/h' },
      ],
      nav: [
        { icon: 'mdi:rocket-launch', label: 'Overview', path: '/lovelace/living-room' },
        { icon: 'mdi:heat-wave', label: 'Climate', path: '/lovelace/climate' },
        { icon: 'mdi:lightbulb-on-outline', label: 'Lights', path: '/lovelace/lights' },
        { icon: 'mdi:shield-home-outline', label: 'Security', path: '/lovelace/security' },
        { icon: 'mdi:play-box-outline', label: 'Media', path: '/lovelace/media' },
        { icon: 'mdi:router-wireless-settings', label: 'Maintenance', path: '/lovelace/maintenance' },
        { icon: 'mdi:map-marker-radius-outline', label: 'Presence', path: '/lovelace/presence' },
        { icon: 'mdi:database-cog-outline', label: 'Systems', path: '/lovelace/systems' },
      ],
      ...config,
    };
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 8;
  }

  render() {
    if (!this.config || !this._hass) {
      return;
    }

    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    this.shadowRoot.innerHTML = `
      <style>${this.styles}</style>
      <ha-card>
        <div class="dashboard-shell">
          <aside class="left-panel">
            ${this.renderTabs()}
            ${this.renderSystems()}
            ${this.renderMetrics()}
          </aside>
          <main class="scene-panel">
            ${this.renderTitle()}
            ${this.renderScene()}
            ${this.renderQuickChips()}
          </main>
          <aside class="right-panel">
            ${this.renderGauge({ name: 'TEMP', entity: this.config.temperature_entity, unit: '°C', max: 30, color: '#aeb5e9', label: 'Comfortable' })}
            ${this.renderGauge({ name: 'HUMIDITY', entity: this.config.humidity_entity, unit: '%', max: 100, color: '#f29a37', label: 'Dry' })}
            ${this.renderGauge({ name: 'HEATING', entity: this.config.heating_value_entity, unit: '°C', max: 30, color: '#2c9cff', controls: ['-', '+'] })}
            ${this.renderGauge({ name: 'ALL LIGHTS', entity: this.config.all_lights_value_entity, unit: '%', max: 100, color: '#2c9cff', controls: ['OFF', 'DIM'] })}
            ${this.renderGauge({ name: 'FLOOR LAMP', entity: this.config.floor_lamp_value_entity, unit: '%', max: 100, color: '#2c9cff', controls: ['OFF', 'DIM'] })}
            ${this.renderGauge({ name: 'CEILING SPOTS', entity: this.config.ceiling_spots_value_entity, unit: '%', max: 100, color: '#2c9cff', controls: ['ON', ''] })}
          </aside>
          ${this.renderNavigation()}
        </div>
      </ha-card>
    `;
  }

  renderTabs() {
    return `
      <div class="tabs">
        <button class="tab tab-active">SYSTEMS</button>
        <button class="tab">MAINTENANCE</button>
      </div>
    `;
  }

  renderSystems() {
    return `
      <div class="systems">
        ${this.config.systems.map((item) => `
          <button class="system-row" type="button">
            <ha-icon class="${item.color === 'orange' ? 'orange' : 'muted'}" icon="${item.icon}"></ha-icon>
            <span><strong>${item.name}</strong><small>${item.label}</small></span>
          </button>
        `).join('')}
      </div>
    `;
  }

  renderMetrics() {
    return `
      <div class="metrics">
        ${this.config.metrics.map((metric) => {
          const value = this.stateNumber(metric.entity);
          const max = Number(metric.max ?? 100);
          const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
          const unit = metric.unit ?? this.stateUnit(metric.entity) ?? '%';
          return `
            <button class="metric" type="button">
              <span>${metric.name}</span>
              <b>${this.formatNumber(value)}${unit === '%' ? '%' : ` ${unit}`}</b>
              <i><em style="width:${percent}%"></em></i>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  renderTitle() {
    return `
      <div class="room-title">
        <h2>${this.config.title}</h2>
        <p>${this.config.subtitle}</p>
      </div>
    `;
  }

  renderScene() {
    return `
      <div class="room-image-wrap">
        <img class="room-image" src="${this.config.image}" alt="${this.config.title}">
        <button class="scene-button" type="button" data-action="scene">${this.config.scene_label}</button>
      </div>
    `;
  }

  renderQuickChips() {
    return `
      <div class="quick-chips">
        ${this.renderChip('mdi:thermometer', this.config.temperature_entity)}
        ${this.renderChip('mdi:water-percent', this.config.humidity_entity)}
        ${this.renderChip('mdi:lightbulb-group', this.config.all_lights_entity)}
      </div>
    `;
  }

  renderChip(icon, entityId) {
    const state = this._hass.states[entityId];
    const value = state ? `${this.formatState(state)}${this.unitSuffix(state)}` : '—';
    return `<button class="chip" type="button"><ha-icon icon="${icon}"></ha-icon><span>${value}</span></button>`;
  }

  renderGauge({ name, entity, unit, max, color, label, controls }) {
    const value = this.stateNumber(entity);
    const degrees = Math.max(0, Math.min(300, (value / max) * 300));
    return `
      <button class="gauge-card" type="button" data-entity="${entity}">
        <span class="gauge-ring" style="--gauge-color:${color};--gauge-deg:${degrees}deg">
          <span class="gauge-name">${name}</span>
          <span class="gauge-value">${this.formatNumber(value)}</span>
          <span class="gauge-unit">${unit}</span>
        </span>
        ${label ? `<span class="gauge-label ${label === 'Dry' ? 'orange-text' : ''}">${label}</span>` : ''}
        ${controls ? `<span class="gauge-controls"><b>${controls[0]}</b><b>${controls[1]}</b></span>` : ''}
      </button>
    `;
  }

  renderNavigation() {
    return `
      <nav class="bottom-nav">
        ${this.config.nav.map((item, index) => `
          <button class="nav-item ${index === 0 ? 'active' : ''}" type="button" data-path="${item.path}">
            <ha-icon icon="${item.icon}"></ha-icon>
            <span>${item.label}</span>
          </button>
        `).join('')}
      </nav>
    `;
  }

  connectedCallback() {
    this.addEventListener('click', this.handleClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
  }

  handleClick = (event) => {
    const pathButton = event.composedPath().find((node) => node?.dataset?.path);
    if (pathButton) {
      history.pushState(null, '', pathButton.dataset.path);
      window.dispatchEvent(new CustomEvent('location-changed'));
      return;
    }

    const sceneButton = event.composedPath().find((node) => node?.dataset?.action === 'scene');
    if (sceneButton && this.config.scene_entity) {
      this._hass.callService('scene', 'turn_on', { entity_id: this.config.scene_entity });
    }
  };

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
      }
      ha-card {
        min-height: 720px;
        overflow: hidden;
        color: var(--neo-text);
        background:
          radial-gradient(circle at 48% 82%, rgba(104, 128, 255, .34), transparent 22%),
          radial-gradient(circle at 12% 20%, rgba(37, 52, 143, .25), transparent 28%),
          linear-gradient(180deg, #111329 0%, #0b0d25 100%);
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
      button {
        color: inherit;
        font: inherit;
        border: 0;
        cursor: pointer;
      }
      .dashboard-shell {
        box-sizing: border-box;
        display: grid;
        grid-template-columns: minmax(240px, 300px) minmax(360px, 1fr) minmax(300px, 360px);
        grid-template-rows: 1fr 76px;
        grid-template-areas:
          'left scene right'
          'left nav right';
        gap: 20px;
        min-height: 720px;
        padding: 46px 34px 0;
      }
      .left-panel { grid-area: left; }
      .scene-panel { grid-area: scene; display: grid; align-content: start; justify-items: center; padding-top: 0; }
      .right-panel { grid-area: right; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-content: start; }
      .tabs { display: flex; margin-bottom: 30px; }
      .tab {
        min-width: 104px;
        min-height: 48px;
        padding: 0 16px;
        border: 1px solid rgba(170, 180, 230, .35);
        background: rgba(16, 19, 45, .55);
        border-radius: 6px;
        font-size: 12px;
        font-weight: 800;
      }
      .tab-active { background: rgba(255, 255, 255, .96); color: #101225; }
      .systems { display: grid; gap: 22px; margin-bottom: 46px; }
      .system-row {
        display: grid;
        grid-template-columns: 24px 1fr;
        gap: 12px;
        align-items: center;
        width: 100%;
        padding: 0;
        text-align: left;
        background: transparent;
      }
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
      .room-title { width: 190px; margin: 0 auto 78px; border: 1px solid rgba(169, 181, 232, .38); border-radius: 7px; padding: 12px 8px 10px; text-align: center; background: rgba(12, 15, 36, .55); }
      .room-title h2 { margin: 0; font-size: 22px; font-weight: 500; letter-spacing: .03em; }
      .room-title p { margin: 10px 0 0; color: var(--neo-muted); font-size: 11px; }
      .room-image-wrap { position: relative; width: min(620px, 92%); filter: drop-shadow(0 40px 42px rgba(95, 125, 255, .28)); }
      .room-image { display: block; width: 100%; min-height: 260px; object-fit: contain; }
      .scene-button { position: absolute; top: 52%; left: 50%; transform: translate(-50%, -50%); min-width: 92px; min-height: 44px; border-radius: 6px; background: rgba(255, 255, 255, .92); color: #15172d; font-size: 12px; font-weight: 800; }
      .quick-chips { display: flex; gap: 10px; justify-content: center; margin-top: 42px; padding: 24px 60px; background: radial-gradient(circle at center, rgba(123, 145, 255, .32), transparent 58%); }
      .chip { display: inline-flex; gap: 7px; align-items: center; border-radius: 999px; padding: 7px 12px; background: rgba(22, 27, 68, .76); color: var(--neo-text); }
      .chip ha-icon { width: 18px; color: var(--neo-blue); }
      .gauge-card { min-height: 154px; display: grid; justify-items: center; align-content: center; gap: 6px; padding: 12px 8px; background: rgba(20, 24, 57, .62); border: 1px solid rgba(61, 70, 124, .18); border-radius: 4px; }
      .gauge-ring { position: relative; display: grid; place-items: center; width: 112px; height: 112px; border-radius: 50%; background: conic-gradient(from 210deg, var(--gauge-color) var(--gauge-deg), rgba(255, 255, 255, .06) var(--gauge-deg) 300deg, transparent 300deg 360deg); }
      .gauge-ring:after { content: ''; position: absolute; inset: 7px; border-radius: 50%; background: #111530; box-shadow: inset 0 0 24px rgba(0, 0, 0, .35); }
      .gauge-name, .gauge-value, .gauge-unit { position: relative; z-index: 1; text-align: center; }
      .gauge-name { align-self: end; color: var(--neo-muted); font-size: 9px; font-weight: 700; }
      .gauge-value { font-size: 26px; line-height: 1; }
      .gauge-unit { align-self: start; font-size: 16px; font-weight: 700; }
      .gauge-label { color: var(--neo-muted); font-size: 11px; }
      .gauge-controls { display: flex; justify-content: space-between; width: 86%; font-size: 12px; font-weight: 800; }
      .bottom-nav { grid-area: nav; align-self: end; justify-self: center; display: flex; gap: 8px; width: min(620px, 100%); padding: 8px 12px; border-radius: 28px 28px 0 0; background: linear-gradient(180deg, rgba(27, 31, 78, .92), rgba(11, 14, 39, .96)); box-shadow: 0 -8px 32px rgba(30, 66, 210, .25); }
      .nav-item { position: relative; display: grid; gap: 3px; justify-items: center; flex: 1 1 0; min-width: 54px; padding: 6px 4px; background: transparent; color: var(--neo-muted); font-size: 10px; }
      .nav-item ha-icon { color: currentColor; width: 22px; height: 22px; }
      .nav-item.active { color: var(--neo-text); }
      .nav-item.active:after { content: ''; position: absolute; bottom: -5px; width: 46px; height: 3px; border-radius: 999px; background: var(--neo-text); }
      @media (max-width: 1000px) {
        ha-card { min-height: 0; }
        .dashboard-shell { grid-template-columns: 1fr; grid-template-rows: auto; grid-template-areas: 'scene' 'right' 'left' 'nav'; padding: 24px 16px 0; min-height: 0; }
        .right-panel { grid-template-columns: repeat(2, minmax(140px, 1fr)); }
        .room-title { margin-bottom: 28px; }
        .bottom-nav { overflow-x: auto; justify-self: stretch; }
      }
    `;
  }
}

if (!customElements.get('ha-neo-dashboard')) {
  customElements.define('ha-neo-dashboard', HaNeoDashboard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ha-neo-dashboard',
  name: 'HA Neo Dashboard',
  description: 'A Home Assistant dashboard card inspired by a futuristic living-room control panel.',
});
