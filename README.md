# HA Neo Dashboard

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=HOCHH4U5JUMP3R&repository=ha-dashboard&category=plugin)

![HA Neo Dashboard preview](docs/preview.svg)

HA Neo Dashboard ist eine HACS-kompatible Lovelace-Dashboard-Card im dunklen, futuristischen Stil der Referenzgrafik: linke Systemspalte, zentrale Wohnzimmer-Szene, rechte runde Mess-/Lichtkarten und eine pillenförmige Navigation.

## HACS-Installation

1. Öffne HACS in Home Assistant.
2. Gehe zu **Frontend** bzw. **Dashboards**.
3. Füge dieses Repository als benutzerdefiniertes Repository hinzu:
   - Repository: `HOCHH4U5JUMP3R/ha-dashboard`
   - Kategorie: `Dashboard`
4. Installiere **HA Neo Dashboard**.
5. Leere den Browser-Cache bzw. lade Home Assistant neu.
6. Erstelle eine neue manuelle Lovelace-Karte mit `type: custom:ha-neo-dashboard`.

HACS installiert die Ressource aus `dist/ha-dashboard.js`. Die Datei heißt bewusst wie das Repository, damit die HACS-Dashboard/Plugin-Struktur erkannt wird.

## Beispiel-Konfiguration

Eine vollständige Beispielkarte liegt unter `dist/neo-living-room-card.yaml`. Minimal reicht:

```yaml
type: custom:ha-neo-dashboard
title: LIVING ROOM
subtitle: Ground floor
image: /local/neo-dashboard/living-room.png
scene_entity: scene.living_room_evening
temperature_entity: sensor.living_room_temperature
humidity_entity: sensor.living_room_humidity
```

## Wohnzimmerbild

Lege dein freigestelltes Wohnzimmer-Rendering in Home Assistant unter folgendem Pfad ab:

```text
config/www/neo-dashboard/living-room.png
```

In Lovelace ist es anschließend über `/local/neo-dashboard/living-room.png` erreichbar. Du kannst den Pfad über die Option `image` ändern.

## Wichtige Optionen

| Option | Zweck |
| --- | --- |
| `scene_entity` | Szene, die beim Klick auf den zentralen SCENE-Button gestartet wird. |
| `temperature_entity` / `humidity_entity` | Sensoren für die oberen Gauges und Quick-Chips. |
| `heating_value_entity` | Numerischer Sensor für den Heizungs-Gauge-Wert. |
| `all_lights_value_entity` | Numerischer Sensor für den Gesamtlicht-Gauge-Wert. |
| `systems` | Liste für die linke Systemstatus-Spalte. |
| `metrics` | Liste für die unteren Balkenwerte in der linken Spalte. |
| `nav` | Navigationseinträge und Zielpfade für die untere Leiste. |

## Optionales Theme

Das alte Theme bleibt unter `themes/neo-dashboard.yaml` enthalten. Wenn du es zusätzlich nutzen möchtest, kopiere es in deinen Home-Assistant-Ordner `config/themes/` oder verwende dieses Repository separat als HACS-Theme-Quelle.

Aktiviere Themes in `configuration.yaml`:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

## Entwicklung

Die installierbare HACS-Card befindet sich in `dist/ha-dashboard.js`. Zusätzliche Beispiel-YAML-Dateien liegen ebenfalls in `dist/`, damit alle für die Dashboard-Resource relevanten Dateien am HACS-kompatiblen Ort liegen.
