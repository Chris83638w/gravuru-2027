# Kordelschilder Schiefer · Familie + Willkommen (Issue #118) · Stand Neustart 02.11.2026

Katalog- und Code-Branch `dev/kordelschilder-fertig-20261101`. Designs D1400–D1422 (Familie, 23) und D1500–D1519 (Willkommen, 20); jede D-Nummer liegt in allen 8 Formatreihen `designs/schiefer-kordel-*` (Lieferform 2).

## Regel §7 Freiflächen (Chris 02.11.2026) – so umgesetzt

- **1:1-Corel-Originale bleiben** (gleiches Seitenverhältnis: KS-S → 20×10, KSRE-S → 20×20, KSH-S → Herz). Ausnahme nur technisch: D1504 20×10 und Herz D1410/D1502 1:1 gleichmäßig neu skaliert, weil die native Prüfung „passt nicht“ meldete (Textkasten am Rand bzw. Kranzmotiv mit > 200 Pfaden als Kasten geprüft).
- **Referenzen auf andere Formate und alle neuen Designs neu eingepasst:** Gruppe (Text + Motiv) gleichmäßig skaliert und mittig, so groß wie 6 mm Rand, 6 Lochzonen und der native Textkasten (Grundlinie −0,95 … +0,25 × Schriftgröße) erlauben. Je Format eigene Anordnung: Querformate 15×9/20×15/22×14/30×20 aus der 2:1-Vorlage (gleicher Aufbau wie 20×10, Motiv ggf. größer), 20×25 aus der senkrecht gebauten Herz-Vorlage, sonst Motiv neu zum Textblock bzw. Zeilen gestreckt/umbrochen. Keine Zeile ohne Grund verschoben.
- Reine Schriftdesigns, die ein Format nicht füllen können, sind dort `nichtAngeboten` (mit Begründung): D1402 auf 20×15/20×25, D1403 auf 15×9/20×15/20×25.
- Messwerte je Design stehen in `design.json → flaeche` und `index.json`; die Bögen sind mit `flaeche-messen.py` gemessen (Datei `*-messung.txt`, markierte Bögen `*-markiert.jpg`).

## Inventur vorher / nachher (angebotene Designs, ohne `nichtAngeboten`)

| Formatreihe | Größe | vorher (main) Familie / Willkommen | nachher Familie (1:1/Referenz/neu, ★) | nachher Willkommen (1:1/Referenz/neu, ★) | Messung Familie | Messung Willkommen |
| --- | --- | --- | --- | --- | --- | --- |
| `schiefer-kordel-rechteck-15x9` | 15 × 9 cm | 0 / 0 | **22** (0/19/3, ★3) | **20** (0/7/13, ★3) | 21/22 ok · Fläche 32–61 % | 18/20 ok · Fläche 33–60 % |
| `schiefer-kordel-rechteck-20x10` | 20 × 10 cm | 0 / 0 | **23** (18/2/3, ★3) | **20** (5/2/13, ★3) | 21/23 ok · Fläche 28–61 % | 19/20 ok · Fläche 35–66 % |
| `schiefer-kordel-rechteck-20x15` | 20 × 15 cm | 0 / 0 | **21** (0/18/3, ★3) | **20** (0/7/13, ★3) | 20/21 ok · Fläche 35–71 % | 19/20 ok · Fläche 32–68 % |
| `schiefer-kordel-quadrat-20x20` | 20 × 20 cm | 0 / 0 | **23** (16/4/3, ★3) | **20** (5/2/13, ★3) | 19/23 ok · Fläche 14–81 % | 20/20 ok · Fläche 30–86 % |
| `schiefer-kordel-rechteck-20x25` | 20 × 25 cm | 0 / 0 | **21** (0/18/3, ★3) | **20** (0/7/13, ★3) | 21/21 ok · Fläche 37–76 % | 19/20 ok · Fläche 43–70 % |
| `schiefer-kordel-rechteck-22x14` | 22 × 14 cm | 0 / 0 | **23** (0/20/3, ★3) | **20** (0/7/13, ★3) | 21/23 ok · Fläche 31–69 % | 19/20 ok · Fläche 39–72 % |
| `schiefer-kordel-rechteck-30x20` | 30 × 20 cm | 0 / 0 | **23** (0/20/3, ★3) | **20** (0/7/13, ★3) | 22/23 ok · Fläche 39–82 % | 19/20 ok · Fläche 41–77 % |
| `schiefer-kordel-herz-225x267` | Herz 22,5 × 26,7 cm | 0 / 0 | **23** (18/2/3, ★3) | **20** (5/2/13, ★3) | 9/23 ok · Fläche 17–56 % | 15/20 ok · Fläche 21–63 % |

## Kontaktbögen (native Konfi-Zielvorschau über Scratch-Testfamilie, ohne Bohrlöcher, Vorlage klein daneben; blau = neu, ★ gold = Signature)

- 15 × 9 cm: [Familie](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-15x9-familie.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-15x9-familie-markiert.jpg?raw=true)) · [Willkommen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-15x9-willkommen.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-15x9-willkommen-markiert.jpg?raw=true))
- 20 × 10 cm: [Familie](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-20x10-familie.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-20x10-familie-markiert.jpg?raw=true)) · [Willkommen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-20x10-willkommen.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-20x10-willkommen-markiert.jpg?raw=true))
- 20 × 15 cm: [Familie](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-20x15-familie.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-20x15-familie-markiert.jpg?raw=true)) · [Willkommen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-20x15-willkommen.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-20x15-willkommen-markiert.jpg?raw=true))
- 20 × 20 cm: [Familie](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-quadrat-20x20-familie.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-quadrat-20x20-familie-markiert.jpg?raw=true)) · [Willkommen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-quadrat-20x20-willkommen.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-quadrat-20x20-willkommen-markiert.jpg?raw=true))
- 20 × 25 cm: [Familie](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-20x25-familie.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-20x25-familie-markiert.jpg?raw=true)) · [Willkommen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-20x25-willkommen.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-20x25-willkommen-markiert.jpg?raw=true))
- 22 × 14 cm: [Familie](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-22x14-familie.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-22x14-familie-markiert.jpg?raw=true)) · [Willkommen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-22x14-willkommen.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-22x14-willkommen-markiert.jpg?raw=true))
- 30 × 20 cm: [Familie](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-30x20-familie.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-30x20-familie-markiert.jpg?raw=true)) · [Willkommen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-30x20-willkommen.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-rechteck-30x20-willkommen-markiert.jpg?raw=true))
- Herz 22,5 × 26,7 cm: [Familie](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-herz-225x267-familie.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-herz-225x267-familie-markiert.jpg?raw=true)) · [Willkommen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-herz-225x267-willkommen.jpg?raw=true) ([gemessen](https://github.com/Chris83638w/gravuru-2027/blob/dev/kordelschilder-fertig-20261101/docs/handoffs/kordelschilder-20261101/schiefer-kordel-herz-225x267-willkommen-markiert.jpg?raw=true))

## Messbefunde und Begründung

- 15 × 9 cm · D1401 (Referenz): senkrecht +4 %
- 15 × 9 cm · D1501 (Referenz): waagerecht +3 %
- 15 × 9 cm · D1509 (neu): waagerecht -8 %, senkrecht +4 %
- 20 × 10 cm · D1401 (1:1): senkrecht +4 %
- 20 × 10 cm · D1403 (1:1): Fläche nur 28 %, Höhe nur 42 %
- 20 × 10 cm · D1509 (neu): waagerecht -8 %
- 20 × 15 cm · D1401 (Referenz): senkrecht +3 %
- 20 × 15 cm · D1509 (neu): waagerecht -8 %
- 20 × 20 cm · D1402 (1:1): Fläche nur 18 %
- 20 × 20 cm · D1403 (1:1): Fläche nur 14 %
- 20 × 20 cm · D1413 (1:1): Fläche nur 29 %
- 20 × 20 cm · D1416 (1:1): Fläche nur 28 %
- 20 × 25 cm · D1501 (Referenz): waagerecht +3 %
- 22 × 14 cm · D1401 (Referenz): senkrecht +4 %
- 22 × 14 cm · D1403 (Referenz): Höhe nur 44 %
- 22 × 14 cm · D1509 (neu): waagerecht -9 %
- 30 × 20 cm · D1401 (Referenz): senkrecht +4 %
- 30 × 20 cm · D1509 (neu): waagerecht -5 %
- Herz 22,5 × 26,7 cm · D1400 (1:1): senkrecht +7 %
- Herz 22,5 × 26,7 cm · D1402 (1:1): senkrecht -8 %, Fläche nur 20 %
- Herz 22,5 × 26,7 cm · D1403 (1:1): senkrecht -5 %, Fläche nur 17 %
- Herz 22,5 × 26,7 cm · D1404 (1:1): waagerecht -3 %
- Herz 22,5 × 26,7 cm · D1406 (1:1): senkrecht -8 %, Fläche nur 30 %
- Herz 22,5 × 26,7 cm · D1407 (1:1): senkrecht -17 %
- Herz 22,5 × 26,7 cm · D1408 (1:1): waagerecht +3 %, senkrecht -8 %, Fläche nur 26 %
- Herz 22,5 × 26,7 cm · D1409 (1:1): waagerecht +11 %, senkrecht -7 %
- Herz 22,5 × 26,7 cm · D1411 (1:1): waagerecht +5 %, senkrecht -8 %
- Herz 22,5 × 26,7 cm · D1412 (1:1): senkrecht -6 %
- Herz 22,5 × 26,7 cm · D1414 (1:1): waagerecht -6 %, senkrecht -8 %
- Herz 22,5 × 26,7 cm · D1415 (1:1): waagerecht +4 %, senkrecht -8 %, Fläche nur 27 %
- Herz 22,5 × 26,7 cm · D1416 (1:1): senkrecht -8 %, Fläche nur 21 %
- Herz 22,5 × 26,7 cm · D1417 (1:1): senkrecht -7 %
- Herz 22,5 × 26,7 cm · D1500 (1:1): waagerecht -4 %
- Herz 22,5 × 26,7 cm · D1501 (1:1): senkrecht -8 %, Fläche nur 21 %
- Herz 22,5 × 26,7 cm · D1503 (1:1): waagerecht +3 %, senkrecht -8 %
- Herz 22,5 × 26,7 cm · D1504 (1:1): senkrecht -8 %
- Herz 22,5 × 26,7 cm · D1517 (neu): senkrecht -3 %, Fläche nur 26 %

Begründungen: (1) **1:1-Originale** (20×10, 20×20, Herz aus KS-S/KSRE-S/KSH-S) bleiben laut Ergänzung zu §7 unverändert, auch wenn die Messung dort Fläche/Lage anmerkt. (2) **Pusteblume D1401/D1509**: feine, fliegende Schirmchen werden von der Messung kaum erfasst – die Gruppe erscheint dadurch versetzt, optisch steht sie mittig. (3) **Herz**: Gruppe bewusst auf ca. 48 % der Höhe (optische Mitte des Herzens).

## Designs

| D | Name | Modus je Größe | Vorlage(n) | Schriften | Motiv | nicht angeboten |
| --- | --- | --- | --- | --- | --- | --- |
| D1400 | Hier lebt Familie · Rose | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D11, KSH-S-D11, KSRE-S-D11 | Cinzel, Great Vibes, Homage | Bestand KS-S-D11; Bestand KSH-S-D11; Bestand KSRE-S-D11 | – |
| D1401 | Hier wohnt Familie · Pusteblume | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D9, KSH-S-D9, KSRE-S-D9 | Amatic SC, Great Vibes, Minimalist | Bestand KS-S-D9; Bestand KSH-S-D9; Bestand KSRE-S-D9 | – |
| D1402 | Familie zwischen Linien | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D2, KSH-S-D2, KSRE-S-D1 | Cinzel | Bestand KS-S-D2; Bestand KSH-S-D2; Bestand KSRE-S-D1 | 20x15, 20x25 |
| D1403 | FAMILIE in Versalien | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D4, KSH-S-D4, KSRE-S-D0 | Cinzel | Bestand KS-S-D4; Bestand KSH-S-D4; Bestand KSRE-S-D0 | 15x9, 20x15, 20x25 |
| D1404 | Zuhause im Glück · Kleeblatt | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D13, KSH-S-D13, KSRE-S-D13 | Allura, Chewy, Courgette | Bestand KS-S-D13; Bestand KSH-S-D13; Bestand KSRE-S-D13 | – |
| D1405 | Heimathafen · Leuchtturm | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:Referenz 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D20, KSH-S-D20 | Hello Georgia, Libre Baskerville | Bestand KS-S-D20; Bestand KSH-S-D20 | – |
| D1406 | Straße und Heimathafen · Leuchtturm | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D21, KSH-S-D21, KSRE-S-D22 | Montserrat Light, Poppins ExtraLight | Bestand KS-S-D21; Bestand KSH-S-D21; Bestand KSRE-S-D22 | – |
| D1407 | Hier lebt, liebt und lacht · Vögel | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:Referenz 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D22, KSH-S-D22 | Betsy Bailey, Libre Baskerville | Bestand KS-S-D22; Bestand KSH-S-D22 | – |
| D1408 | Familie · Eule | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D23, KSH-S-D23, KSRE-S-D24 | Allura | Bestand KS-S-D23; Bestand KSH-S-D23; Bestand KSRE-S-D24 | – |
| D1409 | Familie · Eulen auf dem Ast | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D24, KSH-S-D24, KSRE-S-D25 | Great Vibes, Parisienne | Bestand KS-S-D24; Bestand KSH-S-D24; Bestand KSRE-S-D25 | – |
| D1410 | Familie · Kranz mit Vögeln | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D26, KSH-S-D26, KSRE-S-D28 | Great Vibes | Bestand KS-S-D26; Bestand KSH-S-D26; Bestand KSRE-S-D28 | – |
| D1411 | Familie · Tauben | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D27, KSH-S-D27, KSRE-S-D29 | Dream Orphans, Hello Georgia | Bestand KS-S-D27; Bestand KSH-S-D27; Bestand KSRE-S-D29 | – |
| D1412 | Zwei Namen · Ornament | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D29, KSH-S-D29, KSRE-S-D38 | Hello Georgia, Kaushan Script | Bestand KS-S-D29; Bestand KSH-S-D29; Bestand KSRE-S-D38 | – |
| D1413 | Familie · Lebensbaum | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D30, KSH-S-D30, KSRE-S-D40 | Great Vibes, Sacramento | Bestand KS-S-D30; Bestand KSH-S-D30; Bestand KSRE-S-D40 | – |
| D1414 | Home is where the heart is | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:Referenz 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D33, KSH-S-D33 | Betsy Bailey, Caviar Dreams | Bestand KS-S-D33; Bestand KSH-S-D33 | – |
| D1415 | Familie · Babyfüße mit Namen | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:Referenz 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D37, KSH-S-D37, KSRE-S-D59 | Courgette | Bestand KS-S-D37; Bestand KSH-S-D37; Bestand KSRE-S-D59 | – |
| D1416 | Familie schlicht | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D1, KSH-S-D1, KSRE-S-D3 | Michroma | – | – |
| D1417 | Alle Namen · Rosenornament | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D17, KSH-S-D17, KSRE-S-D17 | Alex Brush, Great Vibes | Bestand KS-S-D17; Bestand KSH-S-D17; Bestand KSRE-S-D17 | – |
| D1418 | Hier ist die Familie zuhause · Haus | 15x9:Referenz 20x10:Referenz 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:Referenz | KSRE-S-D33 | Courgette | Bestand KSRE-S-D33 | – |
| D1419 | Familie · Anker | 15x9:Referenz 20x10:Referenz 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:Referenz | KSRE-S-D19 | Rounded Elegance | Bestand KSRE-S-D19 | – |
| D1420 ★ | Herzbaum mit allen Namen | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Cinzel, Great Vibes, Raleway | motive/baume/herzbaum.svg | – |
| D1421 ★ | Unser Zuhause seit · Haus mit Herzen | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Montserrat Light, Playfair Display, Satisfy | motive/haus/haus-mit-herzen-4.svg | – |
| D1422 ★ | Hier wohnen · Vogel auf dem Zweig | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Bebas Neue, Sacramento | motive/vogel/vogel-mit-zweig-1.svg | – |
| D1500 | Willkommen bei · Wiesenblumen | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D7, KSH-S-D7, KSRE-S-D7 | Cinzel, Homage, Sacramento | Bestand KS-S-D7; Bestand KSH-S-D7; Bestand KSRE-S-D7 | – |
| D1501 | Willkommen bei · Rose | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D6, KSH-S-D6, KSRE-S-D6 | Minimalist, Montserrat Light, Sacramento | Bestand KS-S-D6; Bestand KSH-S-D6; Bestand KSRE-S-D6 | – |
| D1502 | Willkommen · Blütenkranz | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D12, KSH-S-D12, KSRE-S-D12 | Ashley, Fjalla One | Bestand KS-S-D12; Bestand KSH-S-D12; Bestand KSRE-S-D12 | – |
| D1503 | Herzlich Willkommen · Anker | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:Referenz 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D18, KSH-S-D18 | Ashley | Bestand KS-S-D18; Bestand KSH-S-D18 | – |
| D1504 | Herzlich Willkommen · Linie | 15x9:Referenz 20x10:1:1 20x15:Referenz 20x20:Referenz 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:1:1 | KS-S-D36, KSH-S-D36 | Cinzel | Bestand KS-S-D36; Bestand KSH-S-D36 | – |
| D1505 | Herzlich Willkommen · Eulen | 15x9:Referenz 20x10:Referenz 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:Referenz | KSRE-S-D26 | Kaushan Script, Montserrat Light | Bestand KSRE-S-D26 | – |
| D1506 | Willkommen bei · Hirsch | 15x9:Referenz 20x10:Referenz 20x15:Referenz 20x20:1:1 20x25:Referenz 22x14:Referenz 30x20:Referenz herz:Referenz | KSRE-S-D31 | Satisfy | Bestand KSRE-S-D31 | – |
| D1507 | Herzlich WILLKOMMEN · Herzlinie | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Allura, Cinzel, Great Vibes | motive/linien-mit-verzierungen/herzlinie-geschwungen.svg | – |
| D1508 | Willkommen bei uns zuhause · Haus mit Herzen | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Cormorant Garamond, Montserrat Light, Sacramento | motive/haus/haus-mit-herzen-3.svg | – |
| D1509 | Schön, dass du da bist · Pusteblume | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Dancing Script, Josefin Sans | motive/blumen/pusteblume-2.svg | – |
| D1510 | WELCOME modern | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Bebas Neue, Satisfy | motive/linien-mit-verzierungen/herzlinie-mit-pfeil.svg | – |
| D1511 | Tritt ein, bring Glück herein | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Kaushan Script, Libre Baskerville | motive/ornamente/herz-mit-zweigen.svg | – |
| D1512 | Moin! · Leuchtturm | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Pacifico, Playfair Display, Raleway | motive/leuchtturme/leuchtturm-zeichnung.svg | – |
| D1513 ★ | Willkommen bei · Paar mit Herzen | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Allura, Cinzel | motive/herzen/verschlungene-herzen.svg | – |
| D1514 | Herzlich willkommen · Sonne am Meer | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Montserrat, Parisienne | motive/sonne-mond-wolken/sonne-mit-meer.svg | – |
| D1515 | Willkommen in unserem Zuhause · Blumenstrauch | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Alex Brush, Lora | motive/blumen/blumenstrauch.svg | – |
| D1516 | Willkommen · Schmetterlinge | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Courgette | motive/schmetterlinge/schmetterling-1.svg | – |
| D1517 ★ | Willkommen · Herz mit Initiale | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Cinzel Decorative, Cormorant Garamond, Great Vibes | motive/herzen/herz-kontur.svg | – |
| D1518 ★ | Willkommen zuhause · Herzlinie | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Poiret One, Sacramento | motive/herzen/herzlinie-minimalistisch.svg | – |
| D1519 | Herzlich Willkommen · Rose als Linie | 15x9:neu 20x10:neu 20x15:neu 20x20:neu 20x25:neu 22x14:neu 30x20:neu herz:neu | ohne Vorlage | Cinzel, Italianno | motive/blumen/rose-1.svg | – |

## Technik

- 6 Lochpositionen je Rechteck frei (obere Ecken laut Excel Spalte M bzw. Bestand, untere gespiegelt, seitlich mittig), Schutzzone Ø/2 + 3 mm, 6 mm Rand (Bruchkante); Herz: bestätigtes Loch oben mittig. 15×9 und 20×15: Lochbild weiterhin **Annahme** (keine Daten).
- Keine große Füllfläche (größte zusammenhängende Gravurfläche < 12 % je Design, `index.json`). Mindest-Versalhöhe 3 mm, keine Überlappung, Glyphen vorhanden. Alle angebotenen Designs „passt“ in der nativen Zielvorschau.
- `ziele: []`: Es gibt noch keine Kordelschild-Produktfamilie (Preise/Familie entscheidet Chris); Vorschau über Scratch-Familie `kordel-vorschau` (nicht committet).
- Beispielnamen erfunden, je Design anders.
