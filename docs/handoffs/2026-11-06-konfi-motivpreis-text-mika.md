# Motivpreis als kleiner schwarzer Text

Stand 06.11.2026, Codex/Mika, Branch `dev/mika-konfi-anschluss-20261105`, Draft-PR #178. Aufbau auf `16beb0f5` (R11a).

## Auftrag und Umfang

Mikail zeigt den grauen Kasten „Je Motiv 1,69 €.“ und verlangt: **„kleiner und in schwarz ohne so en Button funktion“**.

Ausschließlich `app/configurator/variant-m/modern-navigation.css` geändert: Der vorhandene Absatz erscheint als schwarzer Text, ohne Hintergrund, Rahmen, Rundung, Schatten oder Innenabstand. Schriftgröße am Desktop 12 px, in der Handyansicht 11 px. Es ist weiterhin ein nicht interaktiver Absatz, kein Button. Text, Preisberechnung, Kategorieauswahl und weitere Bedienung unverändert. Keine zusätzlichen Optimierungsideen umgesetzt.

Die Produktmodelle, 43 Vorlagen, Preise und der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleiben unverändert. Koordination in #168, Reservierungskommentar 6682344072.

## Prüfung und Veröffentlichung

- Bestehende Bundleprüfung **7/7 lokal und 7/7 Linux**, beide Builds erfolgreich. Keine zusätzlichen Tests, die lediglich die CSS-Regel spiegeln.
- Lokaler Chrome: Desktop und Handyansicht **390×844** geprüft. Berechneter Stil: schwarz `rgb(0, 0, 0)`, transparenter Hintergrund, Padding/Border/Radius jeweils 0; 12 bzw. 11 px Schrift. Element `P`, kein Button-Role. Kein physisches Smartphone.
- R12 seit **06.11.2026 10:10:17 UTC / 11:10 Uhr Berlin** aktiv, Bundle **editor-f5c81c94a6bbe07a.mjs**. Vorheriger R11-Stand privat erhalten.
- Beide öffentlichen Prüfseiten, beide Modelle und fünf Bundledateien HTTP 200. Beide Modelle bytegleich: 43 Designs, Basispreise 1999/2499 Cent, Zusatzmotiv 169 Cent.
- Cache-Korrektur R11a bleibt erhalten; aktueller HTML-HEAD bestätigt `no-store, no-cache, must-revalidate, max-age=0`.
- Frischer Live-Chrome-Tab zeigt den schwarzen 12-px-Text ohne Kasten. Tatsächlicher Screenshot unter den lokalen Ausgaben: `konfi-motivpreis-schwarz-klein-r12.jpg`.

[Frisch testen](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/22x14.html?fresh=1&v=r12). Nächster Schritt: Mikails Sichtprüfung. Kein neuer Warenkorb-/Launch-Nachweis, keine Produktveröffentlichung, kein Merge.
