# Paket A – Katalogskripte und Katalogdaten
Stand: 23.10.2026, Quellcode 6e44085f84168e1a915a63167a7df61916bce216, Katalog 0fcf3cf212f2d8ae51486f7deaa65c3810899fae.

## Ergebnis
- 14 Retro-Größen mit unverändertem SVG-Pfad und festen Lochmitten aus geometrie.json; Durchmesserfeld nur von diameter nach diameterMm umbenannt.
- Beide 90×60-Größen 1499 Cent, übrige 12 Retro-Grundpreise null. Vier bestehende Rundpreise weiter offen.
- 66 bisherige Größen und 16 bestehende Befestigungsregeln inhaltlich unverändert. Zwei neue Konturgruppen und größenfeste Regeln B02-KONTUR/B02S-KONTUR; Preise 249/269 Cent aus bestehenden bestätigten Familienregeln.
- 8 Hauptprodukte 6400000–7100000 neu; vorherige 96 unverändert. Quellen: FancyCustomizationIDs.csv, vorhandene Designmetadaten, neue Konturfamilie und dokumentierter Shopify-Export vom 23.10.2026. Alle acht vorhandenen Shopify-Produkt-IDs und Titel übernommen. Kein Livezugriff.
- Katalogfamilie jetzt 80 Größen, Linie 104 Hauptprodukte.
- Geometrie und Designs bleiben getrennt: historische sizesOpen-Zuordnung wird nur über identische Quellkontur und exakte vorhandene Lochmitten aufgelöst. Master-IDs/Designgeometrie bleiben unverändert; Übertragung und Konfiguratoranschluss Paket B.
- KATALOG.md und 14 SVG-Konturansichten zeigen die echten Formen. PDF erzeugt echte Konturen und die größenfesten Löcher; positiver Kontur-Rückplattenversatz wird ausdrücklich offen markiert.
- Stammdaten-Excel speichert Konturgeometrie verlustfrei in verborgenem Metadatenblatt; Import ohne Originalgeometrie stoppt. Lange Pfade sind wegen Excelzellgrenze in Teile zerlegt.
- UTF-8/LF explizit für erzeugte Textdateien, Familie Einrückung1, Linie2. Familiendiff gegen Quelle +426/−1.

## Geänderte Code-Dateien
scripts/katalog-edelstahl-serie.py
scripts/katalog-hauptprodukte.py
scripts/build-katalog.py
scripts/plate-catalog-pdf.py
scripts/family-excel.py
scripts/katalog-contour.test.py (neu)

## Prüfungen
- 10/10 Python-Regressionstests erfolgreich: quellengetreue Kontur/Lochdaten, bekannte/neue Preise, fehlende Bestätigung und uneindeutige Befestigung, Dry-run ohne Mutation, idempotenter Apply, exakte Quellenzuordnung, bestehende Shopify-ID/Titel und Master-ID, LF-Zeilenenden, Excel-Rundlauf samt fehlenden Metadaten, PDF-Zeichenpfad, offene Rückplatte, SVG-Vorschau.
- validateFamily erfolgreich; familyGaps nur 16 offene Grundpreise und „Form „Kontur“ im Konfigurator noch nicht angeschlossen“.
- build-katalog.py: 11 Familien, Exit0, finale Ausführung ohne Warnungen. Alle PDFs/PNG und Stammdaten-Excel erzeugt.
- Edelstahl-PDF: 13 Seiten, 13 Spalten, Maßstab1:8.7. Seite13 visuell geprüft: echte Retro2-Kontur und Lochmitten. Sichtprüfung work/reports/steel-contour-page.png.
- Kein Import-Commit, kein Livezugriff. Gesamt-Import-Dry-run und Node-Integrationstests beim Parent.

## Berichte
- paket-a-serie-dry-run.md und paket-a-serie-apply.md
- paket-a-hauptprodukte-shop-dry-run.md und paket-a-hauptprodukte-shop-apply.md (maßgeblich; früherer Bericht ohne Shopabgleich ist überholt)

## Laufzeitumgebung
Bundled Python wurde nur über eine lokale venv work/pyenv mit --system-site-packages/--without-pip genutzt. work/pyenv/Lib/site-packages/catalog-deps.pth verweist auf work/pydeps (PyMuPDF/CairoSVG). Keine globale Installation, keine Änderung am Repository durch diese Umgebung.
Beispiel: work/pyenv/Scripts/python.exe -X utf8 -I scripts/katalog-contour.test.py; TEMP/TMP auf work/test-tmp wegen Sandbox-Temp-Rechten.
