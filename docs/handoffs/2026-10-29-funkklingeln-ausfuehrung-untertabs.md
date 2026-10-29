# Funkklingeln: Untertabs innerhalb Ausführungen

Datum: 2026-10-29. Ergänzung zu PR #60 auf dem eigenen Vorschau-Branch.

## Auftrag und Umsetzung

Auf ausdrücklichen Nutzerwunsch liegen die Untertabs innerhalb von Ausführungen: **Format & Position**, **Rahmen & Farbe**, **Befestigung**. Die bestehenden Hauptschritte werden nicht geändert. Nur die zur aktiven Unterrubrik gehörenden Gruppen sind sichtbar. Die Optionen bleiben erhalten; der aktive Untertab bleibt beim Optionswechsel und beim Wechsel zu Designs und zurück bestehen.

Kacheln sind kompakter (76 px Mindesthöhe, 36 px Symbole). Befestigung nutzt zweispaltige kompakte Karten mit Symbol links. Silikon hat eine klar erkennbare Tube mit langer Düse und Beschriftung. Runde Farbauswahl bleibt erhalten. Änderungen sind auf die Funkklingel-Präsentation begrenzt; keine Preis-, Positions-, Katalog- oder Warenkorbzuordnung wurde geändert.

## Prüfung

- 15/15 Tests: doorbell-presentation.test.mjs und doorbell-ui.test.mjs.
- Variant-M-Build erfolgreich: editor-470544e9ca706fa7.mjs, 113 Module/14 Styles, 1.193.053 Bytes, gzip 388.851 Bytes.
- Chrome Desktop und 390 × 844 px Vorschau geprüft; alle drei Untertabs erreichbar.
- Tastaturwechsel mit Pfeil rechts geprüft; aktive Auswahl und Untertab bleiben nach Designs → Ausführungen erhalten.
- Silikon gewählt: 69,99 € + 4,99 € = 74,98 € angezeigt.
- Screenshots im Unterordner assets/2026-10-29-doorbell-presentation/: subtabs-format-position.jpg, subtabs-befestigung.jpg und subtabs-mobile.jpg.

Die lokale Vorschau kombiniert den UI-Entwurf mit dem vorgeschlagenen Katalog-Designstand. Sie ist kein Nachweis einer aktiven Katalogrevision oder eines Live-Deployments. Kein Deployment und keine Shopify-Schreibzugriffe. Frühere umfassende Modellmatrix-Prüfungen wurden für diese reine UI-Ergänzung nicht erneut ausgeführt.


