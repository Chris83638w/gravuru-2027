# Paket A abgeschlossen – Kontur im Katalogschema
Stand: 24.10.2026 · Astra High · zur Prüfung und zum Merge durch Claude.

- Code-PR: https://github.com/Chris83638w/gravuru-2027/pull/11
- Katalog-PR: https://github.com/Chris83638w/gravuru-katalog./pull/2
- Branch in beiden Repos: `dev/kontur-schema-20261023-astra`.
- Geprüfte Basen: Code `6e44085f84168e1a915a63167a7df61916bce216`, Katalog `0fcf3cf212f2d8ae51486f7deaa65c3810899fae`.
- Implementierung: Code `5d14426` (Schema/Renderer/Import), `8398550` (Katalogwerkzeuge), Katalog `8df8b90` (Familie, Linie, Exporte); abschließende Anzeige-/Dokumentationskorrekturen stehen im jeweiligen PR-Verlauf.
- Kein Merge, kein Deployment, kein Livezugriff, kein `katalog-import --commit`. Paket B beginnt erst nach Claudes Merge beider Teile von A.

## Ergebnis und Begründung
Freie Retro-Formen waren im Familienschema nicht abbildbar. `shape:"contour"` speichert jetzt je Größe den unveränderten geschlossenen `outlinePath` in mm und feste `holesMm:[{x,y,diameterMm}]` aus der Zeichnung. Analytische Bézier-/Bogenextrema prüfen Ursprung und Pfadausdehnung mit ±0,05 mm; ungültige Syntax, offene/mehrteilige Pfade, nicht endliche oder inkonsistente Lochwerte werden abgelehnt.

`geometryOf`, `nativeContour`, Schablonen-SVG und Katalogansichten verwenden den echten Pfad. Die Konfigurator-Konvertierung behält vorläufig die umschließende Rechteckgeometrie und sperrt jedes Konturprodukt früh mit **„Kontur offen“**. `familyGaps` meldet **„Form „Kontur“ im Konfigurator noch nicht angeschlossen“**. Bestehende Rechteck-/Rund-/Ellipsengrößen bleiben importierbar.

Katalog: **14 Retro-Größen** (7 je Retro 1/2), damit 80 Größen; **8 Hauptprodukte** mit CustomizationIDs 6400000–7100000, damit 104. Beide 90×60-mm-Grundpreise betragen **1499 Cent**, die anderen 12 Retropreise bleiben `null`. Die 66 bisherigen Größen, 16 bisherigen Befestigungsregeln und 96 bisherigen Hauptprodukte sind inhaltlich unverändert. Neue Konturregeln nutzen feste Lochdaten; keine Randregelberechnung. Bestehende Zusatzpreise 249/269 Cent werden aus der bestätigten Familie übernommen.

Alle 8 vorhandenen Shopify-IDs und Titel stammen aus dem bereits versionierten Export `2026-10-23-shopify-edelstahl-hauptprodukte.txt`; es erfolgte kein Shopify-Zugriff. Master-IDs und historische Designgeometrie wurden nicht verändert. Gerade Retro 2 behält die historische Designreihe 90,6×61,3 mm; der Anschluss an die 90×60-mm-Platte bleibt Paket B.

## Dateien
Code:
- `app/workshop/contour-path.mjs` und neuer Test: SVG-Pfadparser und exakte Grenzen.
- `product-families.mjs`, `acrylic-artwork.mjs`, `katalog-convert.mjs`, `katalog-import.mjs` samt Tests: Schema, Rendering, Lücken und sichere Importsperre.
- `katalog-source.test.mjs`: plattformunabhängige Pfade; Familien-Test nutzt `GRAVURU_PYTHON` optional. Assertions bleiben erhalten.
- `scripts/katalog-edelstahl-serie.py`, `katalog-hauptprodukte.py`: Quellenübernahme, bestehende IDs, idempotenter Apply.
- `scripts/build-katalog.py`, `plate-catalog-pdf.py`, `family-excel.py`, neuer `katalog-contour.test.py`: echte Konturansichten/PDF, Excel-Rundlauf einschließlich langer Originalpfade.

Katalog:
- `familien/edelstahl/steel-door-signs.json` (+426/−1 gegenüber main), `linien/edelstahl-tuerschilder.json` (+112/−0).
- `KATALOG.md`, 14 SVGs unter `kataloge/konturen/`, 11 neu erzeugte PDFs und 11 PNGs, `kataloge/Stammdaten-Gravuru.xlsx`.
- Familie Einrückung 1, Linie 2, Textausgaben UTF-8/LF. Bestehende Quelldateien, Designfreigaben und geschützte Verzeichnisse nicht verändert.

## Prüfungen
| Prüfung | Ergebnis |
| --- | --- |
| Node: product-families, contour-path, acrylic-artwork, katalog-convert, katalog-import, katalog-source | **50/50**, 0 Fehler, 0 übersprungen |
| Python: katalog-contour.test.py | **10/10 bestanden** |
| build-katalog.py | **11 Familien**, Exit 0 |
| Vollständiger Edelstahl-Import-Dry-run | **Exit 0**, **216,783 s** |
| Einmaliges unabhängiges Review | keine handlungsbedürftigen Befunde |
| PDF-Sichtprüfung | Seite 13 zeigt Retro 2 samt festen Lochmitten; Katalog-PDF 13 Seiten, keine Produktionsfreigabe |

Der vollständige Probelauf ergibt **744 Produkte: 584 neu, 0 Änderungen, 0 unverändert, 160 gesperrt**.
Davon **120 „Kontur offen“** sowie die **40 bisherigen Sperren** (32 offene Rundpreise, 8 Startdesign-/Größenzuordnungen). **7.660 Vorlagen**, 80 Größen, **keine fehlenden Schriften**, `designs.failed: []`. Der Zuwachs von 624 auf 744 ist vollständig durch gesperrte Konturprodukte erklärt; 584 importierbare Produkte bleiben erhalten.

Belege liegen im Unterordner [2026-10-24-paket-a-belege](2026-10-24-paket-a-belege/). Der vollständige Original-JSON-Bericht ist verlustfrei als `paket-a-import-final.json.gz` abgelegt. Unkomprimiert: 1.220.672 Bytes, SHA-256 **b46b020ac3dcbd98868152b10105b41467a642b734712b5219eb62296f3f6a47**. Der erste Lauf mit unvollständiger lokaler Schriftkopie ist durch diesen finalen Lauf ersetzt.

Aus dem Code-Repo reproduzierbar (Katalogpfad anpassen):
```sh
node --test app/workshop/product-families.test.mjs app/workshop/contour-path.test.mjs app/workshop/acrylic-artwork.test.mjs app/workshop/katalog-convert.test.mjs app/workshop/katalog-import.test.mjs app/workshop/katalog-source.test.mjs
python3 -X utf8 -I scripts/katalog-contour.test.py
python3 -I scripts/build-katalog.py --katalog ../gravuru-katalog.
node --max-old-space-size=6000 scripts/katalog-import.mjs --katalog ../gravuru-katalog. --linie edelstahl-tuerschilder --alle-designs --dry-run --json paket-a-import-final.json
```
Getestet mit Node 24.20.0 und lokal isolierter Python-Umgebung (PyMuPDF/CairoSVG/fonttools). Unter Windows wurde `GRAVURU_PYTHON` auf diese Python-Datei gesetzt und TEMP/TMP in den beschreibbaren Arbeitsbereich gelegt. Keine globale Installation. Keine Behauptung über die gesamte Test-Suite oder Fertigungs-PDF-Tests; diese waren nicht Teil dieser gezielten Abnahme.

## Abnahme Paket A
- [x] Familie gültig, 14 Konturgrößen mit quellengetreuen Pfaden und Löchern.
- [x] 8 Retro-Hauptprodukte mit stabilen Kennungen und vorhandenen Shopify-Verknüpfungen.
- [x] Beide 9×6-Preise 1499 Cent, übrige 12 Retropreise offen.
- [x] Neue Validierungs-/Pfadausdehnungstests, alle verlangten Node-Suiten grün.
- [x] Generatoren, Excel-Rundlauf und Katalog-Build erfolgreich; erzeugte Dateien im Katalog-PR.
- [x] Retro im vollständigen Dry-run „Kontur offen“; keine neuen sonstigen Sperrgründe/Schriftfehler.
- [x] STATUS und Übergabe vorhanden; einmaliges Review abgeschlossen.

## Offene Grenzen und nächste Schritte
Paket B: Konfigurator-Vorschau, echte Gestaltungsfläche mit Innenversatz und Lochschutzzonen, Materialvorschau und Produktionsanschluss. Kontur-Rückplattenversatz bleibt ausdrücklich offen, ohne rechteckige Ersatzkontur. Allgemeine Selbstschnittprüfung und Lochlageprüfung innerhalb beliebiger konkaver Formen sind nicht Bestandteil von A.

16 Grundpreise bleiben offen (4 Rund-, 12 Retrogrößen); 8 bisherige Startdesign-Zuordnungen ebenfalls. `--alle-designs` belegt keine Designfreigabe. Der Import braucht weiterhin den 6-GB-Heap; Optimierung ist Paket C, hier nicht begonnen. 62 Designs ohne passende Formatreihe sowie 18 „prüfen“/552 „passt nicht“ sind bekannte Zuordnungs-/Formatbefunde und keine Umwandlungsfehler.

**Claude:** beide PRs gemeinsam prüfen, insbesondere RT1/RT2 90×60 und 300×200 gegen `geometrie.json`, feste Lochmitten/Preise, IDs 6400000/7100000, Katalogseite und Dry-run-Sperren. Dann beide PRs nach main mergen. Paket B erst auf diesen gemergten Ständen beginnen; keine Veröffentlichung oder Live-Import aus diesem Paket ableiten.
