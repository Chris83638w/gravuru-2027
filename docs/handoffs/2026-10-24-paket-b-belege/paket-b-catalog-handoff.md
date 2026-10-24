# Paket B – erzeugter Katalogstatus

Änderung: build-katalog.py entfernt den veralteten Kontur-Anschlusshinweis. familyGaps liefert weiterhin die maßgeblichen Lücken, darunter einen positiven Rückplattenversatz bei Konturen. Ein neuer Test deckt beide Fälle und unveränderte Eingabedateien ab.

## Geänderte Code-Dateien
- scripts/build-katalog.py
- scripts/katalog-contour.test.py

## Tatsächlich geänderte Katalogdateien
- KATALOG.md
- kataloge/acryl-aa-abstandshalter.pdf
- kataloge/acryl-as-abstandshalter.pdf
- kataloge/acryl-ss-abstandshalter.pdf
- kataloge/gedenktafel-22x14-schiefer-hunde-2027.pdf
- kataloge/gedenktafel-22x14-schiefer-natur.pdf
- kataloge/gedenktafel-30x20-acryl-anthrazit.pdf
- kataloge/gedenktafel-30x20-acryl-schwarz.pdf
- kataloge/gedenktafel-30x20-edelstahl.pdf
- kataloge/gedenktafel-30x20-schiefer-natur.pdf
- kataloge/gedenktafel-30x20-schiefer-premium.pdf
- kataloge/Stammdaten-Gravuru.xlsx
- kataloge/steel-door-signs.pdf

Hashvergleich über 1734 Katalogdateien: keine Quelldatei geändert. Preise, Designzuordnungen, Freigaben und Geometrien sind byteidentisch. Sämtliche PNG-/Kontur-SVG-Dateien sind byteidentisch. KATALOG.md hat nur drei fachliche Änderungen: Edelstahl-Gapzahl 2 → 1, entfallener Anschluss-Gap, neuer erklärender Konturhinweis.

## Ausgeführte Prüfung und Build
Arbeitsverzeichnis: work/gravuru-2027. Python: work/pyenv/Scripts/python.exe; PYTHONUTF8=1; GRAVURU_PYTHON auf dieselbe Python-Datei; TEMP/TMP=work/test-tmp.

```text
../pyenv/Scripts/python.exe -X utf8 -I scripts/katalog-contour.test.py
../pyenv/Scripts/python.exe -X utf8 -I scripts/build-katalog.py --katalog ../gravuru-katalog
node --input-type=module -e 'import fs from "node:fs"; import {openKatalog} from "./app/workshop/katalog-source.mjs"; import {familyGaps} from "./app/workshop/product-families.mjs"; const k=openKatalog("../gravuru-katalog"); const summary={families:k.families.size,lines:k.lines.size,masterDesigns:k.designs.masters.length,steelGaps:familyGaps(k.families.get("steel-door-signs"))}; fs.writeFileSync("../reports/paket-b-catalog-validation.json",JSON.stringify(summary,null,2)+"\n"); console.log(JSON.stringify(summary,null,2));'
```

Ergebnis: 11/11 Python-Tests grün, Build Exit 0 mit 11 Familien, Katalogprüfung Exit 0: 11 Familien / 12 Linien / 737 Masterdesigns. Keine neue B-Gesamtprüfung und keine GitHub-Mutation.

Belege: paket-b-catalog-python.log, paket-b-catalog-build.log, paket-b-catalog-validation.json, paket-b-catalog-files.json.
