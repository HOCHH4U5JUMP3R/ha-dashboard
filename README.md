# Home Assistant Neo Dashboard

Dieses Repository enthält ein Lovelace-Dashboard im dunklen, futuristischen Stil der Referenzgrafik: linke Systemspalte, zentrale Wohnzimmer-Szene, rechte runde Mess-/Lichtkarten und eine pillenförmige Navigation.

## Dateien

- `dashboards/neo-living-room-dashboard.yaml` – vollständige Lovelace-Ansicht mit Mushroom Cards, Button Cards, Gauges und Navigation.
- `themes/neo-dashboard.yaml` – dunkles Theme mit radialem Glow, Kartenfarben und Mushroom-Farbvariablen.

## Voraussetzungen

Installiere in Home Assistant am einfachsten über HACS:

- Mushroom Cards (`custom:mushroom-*`)
- Button Card (`custom:button-card`)
- Card Mod (`card_mod`)
- Mini Graph Card (`custom:mini-graph-card`)
- Layout Card (`custom:grid-layout`)

## Installation

1. Kopiere `themes/neo-dashboard.yaml` in deinen Home-Assistant-Ordner `config/themes/`.
2. Importiere das Theme in `configuration.yaml`:

   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
   ```

3. Starte Home Assistant neu und wähle im Benutzerprofil das Theme `neo_dashboard`.
4. Lege unter `config/www/neo-dashboard/living-room.png` ein freigestelltes Wohnzimmer-Rendering ab. Dieses Bild wird in der zentralen `picture-elements`-Karte verwendet.
5. Erstelle ein neues Dashboard im YAML-Modus oder füge die View aus `dashboards/neo-living-room-dashboard.yaml` in dein vorhandenes Lovelace-Dashboard ein.
6. Ersetze die Beispiel-Entitäten, z. B. `sensor.living_room_temperature`, `light.living_room_all` und `scene.living_room_evening`, durch deine echten Home-Assistant-Entitäten.

## Anpassung

- Die runden Karten werden über `button_card_templates.neo_gauge` und `button_card_templates.neo_gauge_controls` gerendert.
- Farben, Hintergrund und Textkontraste liegen im Theme und in den CSS-Variablen `--neo-text`, `--neo-muted` und `--neo-orange`.
- Die Hauptanordnung wird über `custom:grid-layout` gesteuert und besitzt einen einfachen Mobile-Breakpoint unter 1000 px Breite.
