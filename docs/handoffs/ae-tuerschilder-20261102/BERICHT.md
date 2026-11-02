# AE-Türschilder – Bericht Schritt 1 (02.11.2026)

Auftrag: Issue #131. Design-Master gilt (§1–§8, inkl. §7 02.11. Freiflächen). Katalog-Branch `dev/ae-tuerschilder-20261102`.

## Ergebnis

- Familien `ae-tuerschilder-schwarz`/`-anthrazit`: 48 Größen (RE 17, QU 6, OV 10, EL 5, R 3, RT1 7). AB und Grenzgrößen offen (Frage #131).
- 41 AE-Formatreihen (je Acryl-Seitenverhältnis ein Master; Quadrat und Rund je einer für alle Größen).
- **397 Master** Schritt 1, Ziele schwarz + anthrazit, keine Freigabe gesetzt. Native Zielprüfung (target-preview): **397/397 „passt“, 934 Größenprüfungen**.
- Quellen: D24 Familien, D200 Willkommen, D110 Hunde, D140 Katzen, D401 Andenken, D66 Hochzeit, D73 Hinweis, D26 Namens (jeweils freigegebener Edelstahl-Master derselben Edelstahlgröße); Hausnummer D602 aus Acryl AA/AS/SS; Firmen D74 (einziges freigegebenes Firmen-Design, nur Rund).
- Pferde: kein freigegebenes Design (#114 läuft) → offen. Firmen in Langformaten (RE 18×6–27×9, Ellipse) offen: D74 ist ein runder Stapel und braucht dort eine eigene Anordnung.

## Vorgehen (Skript `scripts/ae-tuerschilder/`)

1. Quelle = Edelstahl-Master der gleichen Edelstahlgröße (12×8 → TRE-V2A-8x5-Dn usw.).
2. Einheitlicher Maßstab für alle Elemente (Motiv nie verzerrt), Gruppe auf die Fläche vergrößert bis Füllgrenze (Rechteck 88 % × 80 %), höchstens ×1,45.
3. Breitere Acrylplatte: Elemente nebeneinander proportional auseinander (Textausrichtung bleibt), im Oval höchstens ×1,15; Querformat unter 48 % Höhe: Zeilenabstände maßvoll gestreckt.
4. Gruppe mittig (Versatz 0 %), Form-/Konturprüfung, Texte unter 3 mm auf 3 mm angehoben, Konfi-Grenze Schrift ≤ 100 mm.
5. Linien bis an den Rand werden nur in der Länge gezogen.

Kennung: `<Form>-AV2A-<Edelstahlmaß cm>-D<n>` mit D-Nummer des Edelstahl-Designs (Materialkürzel AV2A wie Bestandsbögen Acryl+Edelstahl). **Hinweis:** Die Bestandsbögen `TRE-AV2A-12x8(10x6)`/`9x6(7x4)` haben eine eigene Nummerierung – deren Designs sind noch nicht übernommen (Kennung ohne Klammern nötig, Entscheidung Claude).

## Kontaktbögen (Konfi-Vorschau Acryl schwarz, Edelstahlrahmen 10 mm ergänzt, Vorlage daneben, ohne Bohrlöcher)

- [bogen-s1-D110.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D110.jpg?raw=true)
- [bogen-s1-D140.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D140.jpg?raw=true)
- [bogen-s1-D200.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D200.jpg?raw=true)
- [bogen-s1-D24.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D24.jpg?raw=true)
- [bogen-s1-D26.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D26.jpg?raw=true)
- [bogen-s1-D401.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D401.jpg?raw=true)
- [bogen-s1-D602.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D602.jpg?raw=true)
- [bogen-s1-D66.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D66.jpg?raw=true)
- [bogen-s1-D73.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D73.jpg?raw=true)
- [bogen-s1-D74.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D74.jpg?raw=true)

## Inventur Formatreihe × Unterkategorie (Schritt 1)

| Reihe | famili | hausnu | willko | hundes | katzen | andenk | hochze | hinwei | firmen | namens | pferde |
|---|---|---|---|---|---|---|---|---|---|---|---|
| re-70x40 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| re-100x60 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| re-130x80 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| re-140x50 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| re-160x40 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| re-160x100 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| re-190x120 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| re-190x50 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| re-220x140 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| re-220x60 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| re-220x85 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| re-250x70 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| re-280x180 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| re-300x120 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| re-380x155 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| re-400x260 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| re-430x280 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| qu-80x80 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| oval-70x40 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| oval-100x60 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| oval-130x60 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| oval-130x80 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| oval-160x100 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| oval-190x120 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| oval-205x100 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| oval-220x140 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| oval-280x140 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| oval-280x180 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| ellipse-160x40 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| ellipse-190x50 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| ellipse-220x60 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| ellipse-250x70 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| ellipse-280x80 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| rund-100x100 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| retro1-70x40 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| retro1-100x60 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| retro1-130x80 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| retro1-160x100 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| retro1-190x120 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| retro1-220x140 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| retro1-280x180 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |

## Messung Freiflächen (Richtwerte §7)

Alle Gruppen mittig (Versatz 0 %). Unter 30 % Fläche bzw. 45 % Höhe (begründet):

- TO-AV2A-18x6-D24: Fläche 22 %
- TO-AV2A-21x7-D24: Fläche 23 %
- TO-AV2A-24x8-D24: Fläche 24 %
- TO-AV2A-27x9-D24: Fläche 24 %
- TO-AV2A-30x10-D24: Fläche 25 %
- TQ-AV2A-10x10-D73: Fläche 29 %
- TR-AV2A-12x12-D73: Fläche 25 %
- TO-AV2A-18x6-D26: Fläche 26 %
- TO-AV2A-21x7-D26: Fläche 28 %
- TO-AV2A-24x8-D26: Fläche 28 %
- TO-AV2A-27x9-D26: Fläche 29 %
- TO-AV2A-30x10-D26: Fläche 30 %
- TRE-AV2A-42x28-D602: Fläche 29 %
- TRE-AV2A-45x30-D602: Fläche 25 %
- TO-AV2A-9x6-D602: Höhe 38 %
- TO-AV2A-12x8-D602: Fläche 27 %, Höhe 32 %
- TO-AV2A-15x10-D602: Fläche 26 %, Höhe 32 %
- TO-AV2A-18x12-D602: Fläche 26 %, Höhe 31 %
- TO-AV2A-21x14-D602: Fläche 26 %, Höhe 31 %
- TO-AV2A-24x16-D602: Fläche 26 %, Höhe 30 %
- TO-AV2A-30x20-D602: Fläche 25 %, Höhe 30 %
- TO-AV2A-22.5x12-D602: Höhe 45 %
- TO-AV2A-30x16-D602: Höhe 44 %
- TO-AV2A-9x6-D74: Fläche 27 %
- TO-AV2A-12x8-D74: Fläche 28 %
- TO-AV2A-15x10-D74: Fläche 29 %
- TO-AV2A-18x12-D74: Fläche 29 %
- TO-AV2A-21x14-D74: Fläche 29 %
- TO-AV2A-24x16-D74: Fläche 30 %
- TO-AV2A-15x8-D74: Fläche 22 %
- TO-AV2A-22.5x12-D74: Fläche 23 %
- TO-AV2A-30x16-D74: Fläche 23 %

Begründung: Ellipse 4:1 (D24/D26 Haus/Glocke über dem Namen), D602 Oval = einzeilige Hausnummer mit Anker (Vorlage AA einzeilig), D602 42×28/45×30 durch Konfi-Grenze Schrift 100 mm, D73/D74 Rund/Quadrat = Stapel der Vorlage. Bei Bedarf im nächsten Schritt eigene Anordnung.

## Offen / Fragen (#131)

Acrylfarben, AB-Eckradius, Grenzgrößen, Bohrlöcher, Preise. Konfi zeigt noch keinen Edelstahlrahmen (Astra 1, #48) – im Bogen ergänzt. Familien-PDF/PNG aus build-katalog.py nicht im Katalog committet (keine Bilder).

## Selbstprüfung

- Jeder Bogen angesehen; Befunde behoben: Ellipse Hausnummer zerrissen (Quelle 21×7 statt Oval 15×8, Spreizung begrenzt), D140 Langformat Textkasten über Rand (Konfi-Kastenprüfung ergänzt), D602 Quadrat Schrift > 100 mm (Grenze ergänzt), kleine Texte < 3 mm angehoben.
- Nicht perfekt: sehr breite Ellipsen wirken bei Stapel-Designs leer; RT1 9×6 hat durch die 10-mm-Parallelkontur fast eckige Acrylecken (geometrische Folge der Vorgabe).
