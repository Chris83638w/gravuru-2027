# Paket B – Kontur in Vorschau und Bedienung

Basis: Code main 603fa4415121d305cff31755ffab2c6af653919a, Katalog main 9bd4d146bc0a308bc63b079e582f2a82712b6082.

## Umsetzung

- Adapter und gemeinsamer studioSvg-Renderer verwenden den originalen mm-Pfad. Kontur und feste Bohrungen bilden den Material- und Artworkclip, Bohrungen sind transparent.
- Die Gestaltungsfläche ist eine echte Innenabstandsmaske aus contourSafeAreaSvg. Dieselbe gemeinsame Polygon-/Punktprüfung steuert Einpassen, freie Platzsuche, Textprüfung, Randsperre und zulässige Einrastziele. Keine eigene Konturberechnung im UI.
- Gemeinsames Einrasten prüft auch die Kombination beider Achsen. Kunden- und Werkstatt-Hilfslinien werden auf die sichere Fläche maskiert.
- Rückseiten verwenden mirrorContourPath für Kurven und Bögen sowie gespiegelte Bohrlöcher. Vorderseiten bleiben unverändert.
- Konturen können nicht über den bisherigen Rechteck-/Oval-Größeneditor skaliert werden; jede Größe benötigt ihre eigene Zeichnung.
- Die vorhandene Formprodukt-Materialpipeline bleibt unverändert. Ein Regressionstest belegt echte Kurven und physische Ausschnitte; die aktive universelle Werkstattvorschau nutzt studioSvg.

## Prüfungen

- node --test app/configurator/variant-m/contour-ui.test.mjs: 9/9 grün. Rohlog: paket-b-ui-final.log.
- node --test app/workshop/steel-formats.test.mjs: 3/3 grün mit GRAVURU_PYTHON=work/pyenv/Scripts/python.exe und TEMP/TMP im task-eigenen work/test-tmp. Der Erstlauf mit Standard-Python scheiterte einzig im vorhandenen Vektorimporttest (conversion_failed); keine Sollwerte oder Converter-Änderungen.
- collectModules + transformModule: 83 Module, darunter contour-geometry und contour-guides, ohne Zyklen/Importfehler. Kein vollständiger Build damit behauptet.

Exakte 15 geänderte/neue Pfade: paket-b-ui-files.json. Alle Dateien mit LF. Keine Katalogmutation, keine geschützten Verzeichnisse geändert, keine Commits/Livezugriffe.

## Noch gemeinsame Abnahme durch Root

Echter lokaler Retro-Konfigurator im Browser samt Bedienprüfung und Screenshot; Produktions- und vollständiger Import-Dry-run-Nachweis liegen bei Root/schema_research. Die UI ist dafür lokal bereit. Oversized elements with no feasible position are left invalid and remain blocked by the shared validation; no rectangle or fabricated safe position is substituted.
