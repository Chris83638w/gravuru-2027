# Materialübergreifende Familien und Design-Probelauf · 13.10.2026

Nicht installiert. Branch `task/plugin-design-pipeline-20261013`.

## Was neu ist

- **Familienformat v2** (`gravuru-product-family/v2`): Edelstahl, Acrylglas und Schiefer, jeweils mit festem Gravurverfahren (`steel-engraving`, `acrylic-engraving`, `slate-engraving`). v1-Familien (Edelstahl-Türschilder) bleiben unverändert gültig.
- **Offene Stammdaten** werden als `null` gespeichert und überall als „offen“ angezeigt: Materialstärke, Gestaltungsrand, Grundpreis, Bohrbild (Durchmesser + Randabstand gemeinsam), Aufpreis. Nichts wird geraten. Familien mit offenen Werten lassen sich planen, bearbeiten und als Briefing herunterladen; Produkte erzeugen erst, wenn alles ausgefüllt ist.
- **Gedenktafel 30 × 20 cm** in fünf Familien (`app/designs/gedenktafeln-30x20/`), in der Werkstatt unter Verwaltung → Produktfamilien übernehmbar:

| Familie | Quelle | Erzeugbar |
| --- | --- | --- |
| Edelstahl | Preise vom Nutzer (PREISE.md): 29,99 €, 4 Bohrlöcher 2,99 € | nein – offen: Stärke, Rand, Bohrlochmaße |
| Naturschiefer | Test-Fixture „Hunde-Gedenktafel Schiefer“: 5 mm, Rand 10 mm, 29,99 €, B02/B04 Ø 5 mm, 12 mm, 2,99/3,99 € | **ja** (bitte Werte bestätigen) |
| Premium-Schiefer | nur Größe | nein – Stärke, Rand, Preis, Bohrbilder offen |
| Acrylglas schwarz / anthrazit | nur Größe | nein – Werte offen **und** Acryl-Gravurplatte noch kein natives Produktmodell |

- **Gravurdarstellung je Material** im Briefing: Edelstahl dunkel, Acryl und Schiefer hell. Gestaltet wird immer schwarz auf weiß.
- **Design-Probelauf** (`scripts/plan-family-designs.mjs`) prüft ohne `--family` alle mitgelieferten Familien und schreibt Material, Gravurfarbe und offene Stammdaten je Zeile in die CSV.

## Prüfungen

- `node --test app/workshop/*.test.mjs`: 583 Tests, 579 bestanden, 0 fehlgeschlagen, 4 übersprungen (inkl. 2 neuer Familientests: Schiefer erzeugt natives Produkt mit Bohrbildern und Preisen; Acryl/offene Werte werden mit verständlichem Grund abgelehnt; Nachtragen macht dieselbe Familie erzeugbar; falsches Verfahren und halbe Bohrbild-Angaben werden abgewiesen).
- Browser (`scripts/check-material-families.py`, lokaler Server, Chromium): 9/9 – [report.json](report.json), Bildschirmfotos [Acryl offen](acryl-offen.png), [Schiefer im Editor](schiefer-editor.png).
- Regression `scripts/check-product-families.py`: 12/12.
- Probelauf mit 148 vorhandenen Edelstahl-Designs gegen alle sechs Familien: 2602 Zuordnungen. Für 30 × 20: Naturschiefer 73 passt / 14 passt nicht (Text näher als 10 mm am Rand); Edelstahl-Gedenktafel, Premium-Schiefer, Acryl je 87 „prüfen“, weil Gestaltungsrand bzw. Bohrbild noch offen sind.

## Grenzen

- Acryl-Gravurplatten: Planen und Briefing ja, Produkte erzeugen nein, bis ein natives Acryl-Gravurprodukt angeschlossen ist.
- Schiefer-Zubehör (Acrylständer, Silikon, Abstandshalter) und Motivaufpreis sind nicht Teil des Familienmodells.
- Die Edelstahl-Gedenktafel ist eine eigene Familie (29,99 €), nicht die 30 × 20-Größe der Türschilder (69,99 €).
- Formen der neuen Familien: eckig ohne Radius eingetragen – bitte bestätigen.
- SKU-Kürzel `GT-ES`, `GT-SN`, `GT-SP`, `GT-AS`, `GT-AA` sind vorläufige Werkstatt-Kennungen, keine Shopify-SKUs.
