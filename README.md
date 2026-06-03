# HA Neo Dashboard

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=HOCHH4U5JUMP3R&repository=ha-dashboard&category=plugin)

![HA Neo Dashboard Vorschau](docs/preview.svg)

HA Neo Dashboard ist eine HACS-kompatible **Vollbild-Lovelace-Dashboard-Karte** im dunklen, futuristischen Stil der Referenzgrafik. Sie ist nicht als kleine Kachel gedacht, sondern für eine Lovelace-View mit `panel: true`: linke Systemspalte, zentrale Hauptfläche, rechte Gauges und eine untere Navigation für mehrere interne Dashboard-Seiten.

## HACS-Installation

1. Öffne HACS in Home Assistant.
2. Gehe zu **Frontend** bzw. **Dashboards**.
3. Füge dieses Repository als benutzerdefiniertes Repository hinzu:
   - Repository: `HOCHH4U5JUMP3R/ha-dashboard`
   - Kategorie: `Dashboard`
4. Installiere **HA Neo Dashboard**.
5. Leere den Browser-Cache bzw. lade Home Assistant neu.
6. Installiere optional zusätzlich **Kiosk Mode** über HACS, damit Header und Sidebar verschwinden.
7. Erstelle eine neue Lovelace-View mit `panel: true` und einer Karte vom Typ `custom:ha-neo-dashboard`.

HACS installiert die Ressource aus `dist/ha-dashboard.js`. Die Datei heißt bewusst wie das Repository, damit die HACS-Dashboard/Plugin-Struktur erkannt wird.

## Vollbild-Verwendung

Eine vollständige View liegt unter `dist/neo-apartment-dashboard.yaml`. Wichtig ist `panel: true`, damit Home Assistant die Card nicht in ein normales Kartenraster setzt. Für dein iPad Air 2020 ist das Layout auf die Landscape-CSS-Viewport-Größe **1180 × 820 px** abgestimmt; das Gerät besitzt physisch **2360 × 1640 Pixel** bei DPR 2.0. Quelle: [YesViz iPad Air 2020](https://yesviz.com/devices/ipad-air-2020/).

```yaml
title: Neo Home
kiosk_mode:
  hide_header: true
  hide_sidebar: true
views:
  - title: Neo Dashboard
    path: neo-dashboard
    panel: true
    cards:
      - type: custom:ha-neo-dashboard
        title: WOHNZIMMER
        subtitle: Erdgeschoss
        background_image: /local/neo-dashboard/background.jpg
        image: /local/neo-dashboard/living-room.png
        default_page: rooms
        default_room: living_room
```


## iPad Air 2020 und Kiosk-Modus

Das Modell MYFT2FD/A gehört zur iPad-Air-Generation 2020. Das Dashboard ist für die Landscape-Viewport-Größe 1180 × 820 CSS-Pixel optimiert. In `dist/ha-dashboard.js` gibt es dafür eine eigene Media Query, die Spaltenbreiten, Abstände, Gauge-Größen und die untere Navigation so komprimiert, dass die View ohne Home-Assistant-Header und ohne Sidebar exakt auf den Bildschirm passt.

Damit Home Assistant oben und links keinen Platz wegnimmt, solltest du zusätzlich die HACS-Erweiterung **Kiosk Mode** installieren. Das Projekt beschreibt sich als Plugin zum Ausblenden von Header und Sidebar: [NemesisRE/kiosk-mode](https://github.com/NemesisRE/kiosk-mode).

Empfohlene Dashboard-Konfiguration:

```yaml
kiosk_mode:
  hide_header: true
  hide_sidebar: true
```

Falls du dich aussperrst: Nutze einen separaten Tablet-/Kiosk-Benutzer oder halte eine zweite normale Dashboard-URL für die Administration bereit.

## Anpassbare Inhalte

Alle sichtbaren Bereiche sind über YAML konfigurierbar:

| Option | Zweck |
| --- | --- |
| `background_image` | Eigenes Vollbild-Hintergrundbild hinter Glow und Panels. |
| `image` | Zentraler Wohnzimmer-/Raum-Render auf der Übersichtsseite. |
| `top_tabs` | Reiter links oben, z. B. System- und Wartungsaktionen. |
| `systems` | Linke Statusliste mit Icon, Entity, Label, Farbe und Aktion. |
| `metrics` | Linke Balkenwerte mit Entity, Maximalwert, Einheit und Aktion. |
| `gauges` | Rechte runde Karten mit Entity, optionaler `value_entity`, Einheit, Farbe und Aktion. |
| `rooms` | Raumliste für Schlafzimmer, Wohnzimmer, Büro, Küche, Badezimmer, Garage und Keller. |
| `default_room` | Raum, der nach dem Öffnen bzw. nach dem Zurückwechseln auf Raumseiten aktiv ist. |
| `room_overview_gauges` | Rechte Gauges der Raumübersicht, z. B. Durchschnittstemperatur oder aktive Lichter. |
| `pages` | Untere Navigation und interne Seiten mit beliebig vielen Funktionskacheln. |


## Räume und Raumübersicht

Die Card startet standardmäßig mit `default_page: rooms`. Diese Raumübersicht passt optisch zum Neo-Design und zeigt große Auswahlkacheln für:

- Schlafzimmer
- Wohnzimmer
- Büro
- Küche
- Badezimmer
- Garage
- Keller

Beim Tippen auf eine Raumkachel wechselt die Card intern auf die Übersichtsseite dieses Raums. Die Seiten `Klima`, `Lichter`, `Sicherheit`, `Medien`, `Wartung`, `Anwesenheit` und `System` bleiben gleich aufgebaut, verwenden aber Platzhalter wie `{prefix}` und werden dadurch auf den aktuell gewählten Raum gemappt.

Minimalbeispiel für eigene Räume:

```yaml
default_page: rooms
default_room: living_room
rooms:
  - id: bedroom
    title: SCHLAFZIMMER
    subtitle: Ruhen
    icon: mdi:bed-king-outline
    image: /local/neo-dashboard/bedroom.png
    background_image: /local/neo-dashboard/bedroom-background.jpg
    temperature_entity: sensor.bedroom_temperature
    humidity_entity: sensor.bedroom_humidity
    all_lights_entity: light.bedroom_all
  - id: living_room
    title: WOHNZIMMER
    subtitle: Erdgeschoss
    icon: mdi:sofa-outline
    image: /local/neo-dashboard/living-room.png
    background_image: /local/neo-dashboard/living_room-background.jpg
    temperature_entity: sensor.living_room_temperature
    humidity_entity: sensor.living_room_humidity
    all_lights_entity: light.living_room_all
```

Für Raumseiten kannst du Platzhalter verwenden. `{prefix}` entspricht standardmäßig der Raum-ID, kann aber pro Raum mit `prefix` überschrieben werden:

```yaml
tiles:
  - name: Alle Lichter
    entity: light.{prefix}_all
    icon: mdi:lightbulb-group
    tap_action:
      action: toggle
      entity: light.{prefix}_all
```


## Temperatur- und Heizungslogik

Die Temperatur-Gauge kann mit `label_mode: temperature_comfort` automatisch bewertet werden:

| Temperatur | Label |
| --- | --- |
| unter 17 °C | `zu kalt` |
| 17 bis unter 19 °C | `kühl` |
| 19 bis unter 23 °C | `angenehm` |
| 23 bis unter 26 °C | `warm` |
| ab 26 °C | `heiß` |

Die Heizungs-Gauge zeigt nicht die aktuelle Raumtemperatur, sondern die Zieltemperatur des Climate-Entitys. Dafür nutzt sie `value_attribute: temperature`. Die Tasten `-` und `+` ändern die Zieltemperatur in 0,5-°C-Schritten; `AN` und `AUS` setzen den Heizmodus.

```yaml
- name: HEIZUNG
  entity: climate.{prefix}
  value_attribute: temperature
  unit: °C
  max: 30
  color: '#2c9cff'
  controls:
    - label: '-'
      tap_action:
        action: climate-temperature-step
        entity: climate.{prefix}
        step: -0.5
    - label: '+'
      tap_action:
        action: climate-temperature-step
        entity: climate.{prefix}
        step: 0.5
    - label: AN
      tap_action:
        action: climate-hvac-mode
        entity: climate.{prefix}
        hvac_mode: heat
    - label: AUS
      tap_action:
        action: climate-hvac-mode
        entity: climate.{prefix}
        hvac_mode: 'off'
```

## Funktionen und Aktionen

Jede Systemzeile, Metrik, Gauge, Kachel und jeder optionale Reiter kann eine `tap_action` erhalten. Unterstützt werden außerdem:

```yaml
tap_action:
  action: toggle
  entity: light.living_room_all
```

```yaml
tap_action:
  action: more-info
  entity: climate.living_room
```

```yaml
tap_action:
  action: call-service
  service: scene.turn_on
  target:
    entity_id: scene.living_room_movie
```

```yaml
tap_action:
  action: navigate
  navigation_path: /lovelace/security
```

```yaml
tap_action:
  action: url
  url_path: https://www.home-assistant.io/
```

Ohne `tap_action` öffnet eine Kachel mit `entity` standardmäßig `more-info`. Die unteren Reiter wechseln ohne eigene `tap_action` intern zwischen Seiten; mit `tap_action` können sie stattdessen navigieren oder Dienste auslösen.

## Mehrere Dashboard-Seiten

Die untere Navigation wird über `pages` gesteuert. Eine Seite mit `type: overview` zeigt die zentrale Raumgrafik. Alle anderen Seiten rendern konfigurierbare Funktionskacheln:

```yaml
pages:
  - id: rooms
    label: Räume
    icon: mdi:floor-plan
    type: rooms
  - id: overview
    label: Übersicht
    icon: mdi:rocket-launch
    type: overview
  - id: lights
    label: Lichter
    title: LICHTER
    subtitle: Raumstimmung
    icon: mdi:lightbulb-on-outline
    tiles:
      - name: Alle Lichter
        entity: light.living_room_all
        icon: mdi:lightbulb-group
        tap_action:
          action: toggle
          entity: light.living_room_all
      - name: Kinolicht
        icon: mdi:movie-open
        label: Szene starten
        tap_action:
          action: call-service
          service: scene.turn_on
          target:
            entity_id: scene.living_room_movie
```

## Bilder

Lege deine Assets in Home Assistant z. B. so ab:

```text
config/www/neo-dashboard/living-room.png
config/www/neo-dashboard/background.jpg
```

In Lovelace sind sie anschließend über `/local/neo-dashboard/living-room.png` und `/local/neo-dashboard/background.jpg` erreichbar.

## Optionales Theme

Das Theme bleibt unter `themes/neo-dashboard.yaml` enthalten. Wenn du es zusätzlich nutzen möchtest, kopiere es in deinen Home-Assistant-Ordner `config/themes/` oder verwende dieses Repository separat als HACS-Theme-Quelle.

Aktiviere Themes in `configuration.yaml`:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

## Entwicklung

Die installierbare HACS-Card befindet sich in `dist/ha-dashboard.js`. Die Beispiel-View liegt in `dist/neo-apartment-dashboard.yaml`, damit die für die Dashboard-Resource relevanten Dateien am HACS-kompatiblen Ort liegen.
