# P1-Korrekturen aus dem Claude-Prüfbericht · 13.10.2026

Branch `task/plugin-design-pipeline-20261013`, Basis `4e2713b` (= installierter Anwendungscode `7a168bc`). **Nicht installiert, nicht veröffentlicht.** Keine Live-App, Theme-, Produkt-, Bestell- oder privaten Daten geändert.

| Befund | Ursache | Korrektur | Nachweis |
| --- | --- | --- | --- |
| **P1-4** Vorbereitete Pakete auf Stahl: „ragt über die Gestaltungsfläche hinaus“ | `prepared-design.mjs` nutzte außer bei Schiefer immer die Acrylfläche 4–146 × 4–190 mm | `preparedPlacement()`: Paket in Produktmaß (± 0,5 mm) wird **1:1** platziert, sonst konturgerecht über `fittedArtwork()` wie der SVG/PDF-Import. Feste Vorlagenfläche in exakter Plattengröße passiert die Ecken-/Ovalprüfung nur bei 0 mm Rand (`objectIssue`); die Gravurausgabe schneidet ohnehin auf die Kontur. | `prepared-design-placement.test.mjs` (5 Tests): Stahl 90 × 60 → 1:1; Stahl mit 150 × 200-Paket → 30 % statt Fehler; Altbestand 2 mm Rand → eingepasst; Acryl 150 × 200 → 1:1; Oval 90 × 60 → 1:1, Kundeninhalt weiter gegen Oval geprüft |
| **P1-3** Kundenansicht zeigt Stahl-Vektorgravur grau | `adapter.mjs` übernahm `vectorOnly` nicht | Neues Modul `customer-motifs.mjs` übernimmt alle Darstellungsmerkmale aus derselben Ressource wie die Händleransicht | `customer-motifs.test.mjs` (2 Tests): Händler- und Kunden-SVG enthalten dieselbe Schwarz-Schwelle; Raster behält Tonwerte |
| **P1-1** Gravurdatei graviert Weiß und Fotos schwarz | `tint_imported_artwork` färbte jedes nicht transparente Pixel voll | Gravur nutzt die Vorschau-Regel: Deckung = (1 − Helligkeit) × Alpha; Stahl-Vektor = volle Deckung außer Weiß; Druck unverändert | `acrylic-import-tint.test.mjs`: gemessene Gravurpixel 54 / 136 / 255 (rot / halbtransparent blau / **weiß bleibt frei**) statt zuvor 0 / 127 / **0**; neuer Test Stahl `solid` 0/255, `tone`, `flat` getrennt |
| **P1-2** Überlagerte Elemente nicht anklickbar | nur das oberste Trefferrechteck reagierte | Klick prüft alle Elemente unter dem Zeiger, wählt das kleinste; erneuter Klick an derselben Stelle wählt das darunterliegende; Drücken + Ziehen bewegt die aktuelle Auswahl | `scripts/check-editor-overlap.py` mit echtem Chromium: Text → Rahmen → Text → Rahmen, Ziehen bewegt Rahmen, nicht Text ([Bericht](editor-overlap.json), [Bildschirmfoto](editor-overlap.png)). **Gegenprobe auf `4e2713b`: FAIL** (jeder Klick wählt den Rahmen) |

## Geänderte Sollwerte und warum

- `prepared-design.test.mjs`: Laufweite `0,4 × 0,93` → `0,4`, Fotobogen `M-55` → `M-60`. Grund: Nutzerentscheidung 13.10. „1:1 statt 93 %“; die frühere Verkleinerung war die gemeldete Abweichung.
- `acrylic-import-tint.test.mjs`: Der alte Test erwartete, dass ein **weißes** Rechteck schwarz graviert wird. Das widersprach Vorschau und eigener Ausgabebeschreibung („Weiß bedeutet keine Gravur“) und war der Fehler P1-1 selbst.

## Ausgeführte Prüfungen

Isolierte Umgebung, Node 24.21.0, Python 3.13 mit gepinnten Abhängigkeiten, frische Datenverzeichnisse:
- `npm test`: **709/709** bestanden (vorher 701; 8 neue)
- `ops/plesk` + `ops/shopify` Node: **55/55**; `activate-merchant-release.test.py` 5/5; `verify-extension-release.test.py` 8/8
- Browserprüfung Überlagerung: PASS auf neuem Stand, FAIL auf altem Stand

## Grenzen

- Keine echte Shopify-Anmeldung, keine Liveprüfung, keine physische Gravurprobe.
- P1-2 gilt für den nativen Händler-Editor. Formprodukt-Editor unverändert (eigener Pfad, siehe Prüfbericht).
- Touch-Bedienung nicht auf echtem Gerät geprüft.
- Installation auf dem Händlerhost erst nach Nutzerfreigabe und mit neuem versioniertem Paket.
