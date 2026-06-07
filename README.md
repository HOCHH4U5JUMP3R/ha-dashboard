# HA Neo Dashboard

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=HOCHH4U5JUMP3R&repository=ha-dashboard&category=plugin)

![HA Neo Dashboard Vorschau](docs/preview.svg)

HA Neo Dashboard ist eine HACS-kompatible **Vollbild-Lovelace-Dashboard-Karte** im dunklen, futuristischen Stil der Referenzgrafik. Sie ist nicht als kleine Kachel gedacht, sondern für eine Lovelace-View mit `panel: true`: Topbar mit Anwesenheit und Raumüberschrift, linke Kontextspalte, zentrale Hauptfläche und eine untere Navigation für Startseite, Übersicht, Klima, Lichter, Strom, Sicherheit und System.

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
        default_page: home
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
| `presence` | Personen/Anwesenheits-Entities in der oberen Leiste. |
| `apartment_floorplan_image` | Startseiten-/Floorplan-Hintergrundbild; standardmäßig `/local/community/ha-dashboard-assets/home.svg`, leer lassen für den integrierten SVG-Plan. |
| `floorplan_rooms` | Raum-Hotspots auf dem Grundriss, die den aktiven Raum wechseln; Position und Größe sind über `x`, `y`, `width` und `height` konfigurierbar. |
| `floorplan_entities` | Frei platzierbare Entity-Chips auf dem Grundriss mit `x`, `y`, `width`, `height`, optionalem `icon_size` und normaler `tap_action`. |
| `top_tabs` | Reiter links oben auf Raumseiten, z. B. System- und Wartungsaktionen. |
| `room_overview_top_tabs` | Eigene Startseiten-Reiter, standardmäßig Kalender, Todo und Wetter. |
| `systems` | Linke Statusliste mit Icon, Entity, Label, Farbe und Aktion auf Raumseiten. |
| `room_overview_systems` | Linke Statusliste auf der Raumübersicht, z. B. Kalender, Todo und Wetter. |
| `metrics` | Linke Balkenwerte mit Entity, Maximalwert, Einheit und Aktion. |
| `gauges` | Runde Raumwerte; werden weiterhin für Raum-/Geräte-Widgets genutzt. |
| `rooms` | Raumliste für Schlafzimmer, Wohnzimmer, Büro, Küche, Badezimmer, Garage und Keller; pro Raum können Steckdosen-/Kontakt-Entities und Seitenregeln gesetzt werden. |
| `default_room` | Raum, der nach dem Öffnen bzw. nach dem Zurückwechseln auf Raumseiten aktiv ist. |
| `room_overview_gauges` | Rechte Gauges der Raumübersicht, z. B. Durchschnittstemperatur oder aktive Lichter. |
| `pages` | Untere Navigation und interne Seiten mit beliebig vielen Funktionskacheln; Seiten können per `rooms`, `exclude_rooms`, `enabled: false`, `enabled_pages` oder `disabled_pages` raumabhängig gesteuert werden. |


## Startseite, Wohnungsplan und Räume

Die Card startet standardmäßig mit `default_page: home`. Die Startseite zeigt dein Startseiten-/Floorplan-Hintergrundbild im Neo-Design. Räume und Entity-Chips werden bewusst über einfache YAML-Koordinaten gesetzt, damit du sie in Home Assistant schnell an einen neuen Floorplan anpassen kannst. Zahlenwerte werden als Prozentwerte interpretiert, du kannst aber auch CSS-Längen wie `120px`, `8rem` oder `12%` verwenden. Ohne eigenes Bild wird ein integrierter SVG-Grundriss verwendet; mit `apartment_floorplan_image` ist dein Plan unter `/local/community/ha-dashboard-assets/home.svg` vorkonfiguriert.

Die vorkonfigurierten Räume sind:

- Schlafzimmer
- Wohnzimmer
- Büro
- Küche
- Badezimmer
- Garage
- Keller

Beim Tippen auf eine Raumkachel wechselt die Card intern auf die Übersichtsseite dieses Raums. Die Seiten `Übersicht`, `Klima`, `Lichter`, `Strom`, `Sicherheit` und `System` bleiben gleich aufgebaut, verwenden aber Platzhalter wie `{prefix}` und werden dadurch auf den aktuell gewählten Raum gemappt.

Minimalbeispiel für eigene Räume:

```yaml
default_page: home
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



Beispiel für einen eigenen interaktiven Startseiten-Grundriss:

```yaml
presence:
  - name: Alex
    entity: person.alex
    icon: mdi:account
  - name: Gast
    entity: input_boolean.guest_mode
    icon: mdi:account-plus
    tap_action:
      action: toggle
      entity: input_boolean.guest_mode
apartment_floorplan_image: /local/community/ha-dashboard-assets/home.svg
floorplan_rooms:
  - label: Wohnzimmer
    room: living_room
    x: 72
    y: 36
    width: 28
    height: 32
  - label: Küche
    room: kitchen
    x: 48
    y: 30
    width: 18
    height: 28
floorplan_entities:
  - name: Wohnzimmer Licht
    entity: light.living_room_all
    icon: mdi:lightbulb-group
    x: 72
    y: 36
    width: 14
    height: 7
    icon_size: 20px
    tap_action:
      action: toggle
      entity: light.living_room_all
  - name: Küche Temperatur
    entity: sensor.kitchen_temperature
    icon: mdi:thermometer
    x: 48
    y: 25
    width: 13
    height: 7
```

`x` und `y` beschreiben den Mittelpunkt des Elements auf dem Floorplan. `width` und `height` bestimmen die Größe der Raum-Schaltfläche oder des Entity-Chips; bei Entity-Chips kannst du zusätzlich `min_width`, `max_width`, `min_height`, `max_height` und `icon_size` setzen.

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


Die Raumkacheln zeigen zusätzlich zu Temperatur, Feuchte und Licht auch aktive Steckdosen sowie offene Tür-/Fensterkontakte. Dafür kannst du pro Raum `socket_entities` und `contact_entities` hinterlegen:

```yaml
rooms:
  - id: office
    title: BÜRO
    socket_entities:
      - name: Drucker
        entity: switch.office_printer
      - name: Dock
        entity: switch.office_dock
    contact_entities:
      - name: Fenster
        entity: binary_sensor.office_window
      - name: Tür
        entity: binary_sensor.office_door
```

Die Startseite nutzt eigene linke Reiter und Statuszeilen, damit Wartung/System nicht mehr auf der Raumübersicht erscheinen müssen:

```yaml
room_overview_top_tabs:
  - label: KALENDER
    tap_action:
      action: more-info
      entity: calendar.home
  - label: TODO
    tap_action:
      action: more-info
      entity: todo.home
  - label: WETTER
    tap_action:
      action: more-info
      entity: weather.home
```

Auf Funktionsseiten wie Klima, Lichter, Strom, Sicherheit, System oder Server bleibt die Topbar und die linke Kontextspalte erhalten. Der Inhalt nutzt dadurch die zusammengelegte Mittel-/Rechtsfläche: Klima zeigt oben zwei halbbreite 7-Tage-Verläufe, darunter Istwerte und Heizungssteuerung; Lichter zeigt alle Licht-Entities mit AN/AUS und Helligkeit; Sicherheit bereitet Kamerafeed sowie Tür-/Fenstersensoren vor; Medien bündelt Xbox, PlayStation und Apple TV; Server bildet den Fritz!Box-/Paperless-/Immich-/Jellyfin-/SABnzbd-/Medi-arr-Dienstestatus im kompakten Kachelraster ab.

Nur auf dem Server-Reiter kann die linke Statusspalte mit `server_status_sections` überschrieben werden. Das ist für Hardwarewerte wie CPU, Lüfter, Netzwerk, RAM, Speicher und Festplatten gedacht; die restlichen Reiter verwenden weiterhin die normale Statusspalte.

Wenn du für den Server-Reiter eigene Mushroom- oder andere Lovelace-Karten bauen möchtest, kannst du innerhalb einer Seite statt `tiles` auch `cards` verwenden. Diese Einträge werden als echte Home-Assistant-Karten gerendert und können mit normalem Lovelace-/Mushroom-YAML befüllt werden; Platzhalter wie `{prefix}` funktionieren weiterhin:

```yaml
pages:
  - id: server
    label: Server
    rooms: [office]
    server_status_sections:
      - heading: CPU
        icon: mdi:nas
        badges:
          - entity: sensor.192_168_178_22_cpu_auslastung
            icon: phu:intel-cpu
            ok_below: 50
            warning_above: 50
          - entity: sensor.192_168_178_22_k10temp_0_temperatur
            icon: mdi:thermometer
            ok_below: 75
            critical_above: 74
    cards:
      - type: custom:mushroom-template-card
        primary: MediaCenter22
        secondary: "{{ states('sensor.mediacenter22_cpu') }} % CPU"
        icon: mdi:server
      - type: custom:mushroom-entity-card
        entity: sensor.fritzbox_download_speed
        name: Download
```

Untere Reiter können global oder pro Raum eingeschränkt und erweitert werden. Beispiel: Server nur im Büro anzeigen und im Schlafzimmer Medien ausblenden:

```yaml
pages:
  - id: server
    label: Server
    title: SERVER
    icon: mdi:server-network
    rooms: [office]
    tiles:
      - name: Jellyfin
        entity: sensor.jellyfin_status
        icon: mdi:movie-open-play
rooms:
  - id: bedroom
    disabled_pages: [media]
  - id: office
    enabled_pages: [home, overview, climate, lights, power, security, system, server]
```


## Temperatur- und Heizungslogik

Die Temperatur-Gauge kann mit `label_mode: temperature_comfort` automatisch bewertet werden:

| Temperatur | Label |
| --- | --- |
| unter 15 °C | `kalt` |
| 15 bis unter 20 °C | `kühl` |
| 20 bis unter 22 °C | `angenehm` |
| 22 bis unter 25 °C | `warm` |
| ab 25 °C | `heiß` |

Die Heizungs-Gauge zeigt nicht die aktuelle Raumtemperatur, sondern die Zieltemperatur des Climate-Entitys. Dafür nutzt sie `value_attribute: temperature`. Wenn die Heizung ausgeschaltet ist, zeigt die Gauge `AUS` statt `0 °C`. Die Controls sind als `-`, dynamischer `AN`/`AUS`-Button und `+` angeordnet.

```yaml
- name: HEIZUNG
  icon: mdi:radiator
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
    - label_mode: climate_power
      tap_action:
        action: climate-toggle-heat
        entity: climate.{prefix}
    - label: '+'
      tap_action:
        action: climate-temperature-step
        entity: climate.{prefix}
        step: 0.5
```

Licht-Gauges zeigen bei ausgeschaltetem Licht ebenfalls `AUS`. Die Helligkeitsbuttons nutzen `light-brightness-step` und der mittlere Button wechselt dynamisch zwischen `AN` und `AUS`:

```yaml
- name: LICHT
  icon: mdi:lightbulb-group
  entity: light.{prefix}_all
  value_entity: sensor.{prefix}_light_level
  unit: '%'
  max: 100
  color: '#2c9cff'
  controls:
    - label: '-'
      tap_action:
        action: light-brightness-step
        entity: light.{prefix}_all
        step: -20
    - label_mode: power
      tap_action:
        action: toggle
        entity: light.{prefix}_all
    - label: '+'
      tap_action:
        action: light-brightness-step
        entity: light.{prefix}_all
        step: 20
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
    subtitle: Alle Leuchten im Raum
    icon: mdi:lightbulb-on-outline
    tiles:
      - name: Alle Lichter
        entity: light.living_room_all
        icon: mdi:lightbulb-group
        tap_action:
          action: toggle
          entity: light.living_room_all
      - name: Akzentlicht
        entity: light.living_room_accent
        icon: mdi:led-strip-variant
        tap_action:
          action: toggle
          entity: light.living_room_accent
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
