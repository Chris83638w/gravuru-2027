# Gedenktafeln ohne Foto · Schiefer, alle Formen ab 10 × 10 (Issue #126) – Neustart

Stand 02.11.2026 · Claude (Unterkategorie-Chat, Neustart nach Stopp 01:23) · Katalog-Branch `dev/gedenktafeln-ohne-foto-20261102`. Freigaben `null`, `ziele: []` wie bei Mikas Mastern, nichts live/importiert.

## Was der Neustart geändert hat

1. **STOPP Strichfiguren (Operator 2, 01:19):** Alle Silhouetten und Linienmotive außerhalb der Positivliste ersetzt. Hunde → Rassenporträts `motive/hunderassen`; allgemein/Sternenkinder → Engel, Engelsflügel 1–3, Rosen/Pusteblumen, Bäume, Vögel, Federn oder das Motiv des Verkaufsoriginals (Pfotenspur, Pfotenpaar, Herzkranz, Regenbogen mit Pfoten, Mond mit Mädchen, Sterne). Jede Ersetzung steht im `design.json` unter `deviations`.
2. **Katzen D1030–D1045 zurückgestellt** (bis zur Freigabe der Katzen-Serie): nicht in diesem PR; unverändert auf Branch `dev/gedenktafeln-ohne-foto-katzen-zurueckgestellt-20261102`. Ausnahme D1033 Cora (Corel-Original 1:1, Herz 10×10).
3. **Freiflächen-Regel (§7, 02.11. 01:30):** Generator setzt die Gruppe jetzt zentriert (Toleranz 1,8 %) und maximiert sie; Vorlagen werden nach Flächenanteil bewertet. Corel-Originale 1:1 bleiben unverändert (Ausnahme laut §7).
4. **10 neue allgemeine Tier-Designs D1080–D1089** (Referenz auf Verkaufsoriginale D251–D291, neutrale Detailmotive), damit „Katze“ ohne Katzenmotiv je Reihe ≥ 29 erreicht.

## Inventur je Formatreihe (Master-Maß aus Mikas Index)

| Formatreihe | Größen | Menschen ohne Foto (Mika) | Sternenkinder (Mika + neu) | Hund | Katze | Tiere gesamt | Bogen-Messung (geprüft / auffällig / Fläche Median) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| [herz-geschnitten-24x19](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/herz-geschnitten-24x19.jpg?raw=true) (240 × 192) | 24 × 19 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 48 / 28 % |
| [herz-schief](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/herz-schief.jpg?raw=true) (182.2 × 133.1) | 18 × 13, 26 × 19 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 43 / 39 % |
| [herz](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/herz.jpg?raw=true) (102 × 102) | 10 × 10, 20 × 20, 25 × 25 | 71 | 21 + 8 = 29 | 46 | 31 | 47 | 55 / 15 / 39 % |
| [herz-kordel-225x267](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/herz-kordel-225x267.jpg?raw=true) (227 × 271.1) | 22,5 × 26,7 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 21 / 32 % |
| [rechteck-3-2](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/rechteck-3-2.jpg?raw=true) (150 × 100) | 30 × 20, 15 × 10, 22 × 14, 30 × 20, 22 × 14, 30 × 20 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 0 / 54 % |
| [rechteck-3-1](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/rechteck-3-1.jpg?raw=true) (300 × 100) | 30 × 10, 38 × 13, 56 × 18, 30 × 10 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 0 / 75 % |
| [rechteck-2-1](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/rechteck-2-1.jpg?raw=true) (400 × 200) | 40 × 20, 60 × 30 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 0 / 75 % |
| [rechteck-2-3](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/rechteck-2-3.jpg?raw=true) (200 × 300) | 20 × 30, 20 × 30 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 0 / 72 % |
| [rechteck-4-3](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/rechteck-4-3.jpg?raw=true) (200 × 150) | 20 × 15, 40 × 30, 40 × 30 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 0 / 55 % |
| [rechteck-3-4](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/rechteck-3-4.jpg?raw=true) (150 × 200) | 15 × 20, 30 × 40 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 0 / 71 % |
| [quadrat](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/quadrat.jpg?raw=true) (100 × 100) | 10 × 10, 13 × 13, 16 × 16, 20 × 20, 22 × 22, 25 × 25, 30 × 30, 20 × 20 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 0 / 58 % |
| [rund](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/rund.jpg?raw=true) (200 × 200) | Ø 20, Ø 22, Ø 28, Ø 35,5 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 0 / 49 % |
| [stern](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/stern.jpg?raw=true) (200 × 190.599) | ca. 20 × 19 | 0 | 23 + 8 = 31 | 46 | 30 | 46 | Kontur nicht messbar (Werkzeug erkennt Sternform nicht) |
| [kordel-rechteck-20x10](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/kordel-rechteck-20x10.jpg?raw=true) (200 × 100) | 20 × 10 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 1 / 48 % |
| [kordel-rechteck-25x20](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/kordel-rechteck-25x20.jpg?raw=true) (250 × 200) | 25 × 20 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 0 / 53 % |
| [kordel-rechteck-20x25](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/kordel-rechteck-20x25.jpg?raw=true) (200 × 250) | 20 × 25 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 0 / 67 % |
| [kordel-herz-10x10](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/kordel-herz-10x10.jpg?raw=true) (102 × 102) | 10 × 10 | 71 | 21 + 8 = 29 | 46 | 30 | 46 | 54 / 49 / 23 % |
| [knochen](https://github.com/Chris83638w/gravuru-2027/blob/dev/gedenktafeln-ohne-foto-20261102/docs/handoffs/gedenktafeln-ohne-foto-20261102/knochen.jpg?raw=true) (230 × 105) | 23 × 10,5 | – | 0 + 0 = 0 | 55 | 0 | 55 | 55 / 14 / 38 % |

Hund = Hunde-Designs + allgemeine Designs; Katze = nur allgemeine Designs (+ D1033 im Herz 10×10), weil Katzenmotive zurückgestellt sind. Kreuz (R15) für Tiere nicht gebaut. Knochen nur Hund; Familie `schiefer-knochen-23x10` liegt auf `dev/issue85-tierbestand-20261101`.

Messwerte je Platte (Reihenfolge wie im Bogen): `<reihe>-messung.txt` im selben Ordner (`flaeche-messen.py`, große Bögen in halber Auflösung gemessen).

## Messung – Begründung der Auffälligkeiten

- **Rechteck, Quadrat, Rund, Kordel-Rechteck (12 Reihen): 1 von 648 Platten auffällig** (Kordel 20×10, D1061 knapp). Vorher (Vorgänger) Rechteck 3:2 noch 7/58.
- **Herzformen:** Das Werkzeug misst gegen die Rechteck-Box um das Herz; die untere Spitze ist nicht nutzbar (nutzbare Fläche ca. 60 % der Box). Herz 10×10 / 22,5×26,7: Gruppe bewusst 2–4 % über der Box-Mitte (Flächenschwerpunkt liegt 7 % darüber) – sonst wirkt sie zu tief (Chris’ Kritik „tiefer gesetzt“). Herz 24×19: Name und Motiv nebeneinander im breiten Herzteil (Höhe 35–45 %), gestapelt wäre die Gruppe noch schmaler. Herz schief: Gruppe folgt dem Flächenschwerpunkt der gekippten Form (+4–6 % senkrecht). Kordel-Herz 10×10: beide Bögen sind durch die Kordelbohrungen belegt, Gruppe deshalb 20–30 %.
- **Stern:** wird vom Werkzeug nicht erkannt (Form füllt < 60 % ihrer Box); Sichtprüfung: Motiv im oberen Zacken, Name über den Armen, Daten in der Mitte – wie die Originale Daisy/Cleo.
- **Knochen:** 14 auffällig, davon 10 Corel-Originale 1:1 (bleiben laut §7 unverändert).

## Designs (eine D-Nummer = dasselbe Design in allen Formatreihen)

| D | Name | Gruppe | Modus | Vorlage | Schriften | Motiv (alt → neu) | 1:1 in |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1000 | Bruno | Hund | Referenz | Tiere/Allgemein/gravur-rechteck-D285 (Hund im Herz) + Tiere/Hund/gravur-herz-18x13-D24 (Spruch) | Allura, Bellefair, Montserrat Light | ~~hunde/hund-in-herz.svg~~ → motive/hunderassen/labrador-06.svg | – |
| D1001 | Emma | Hund | Referenz | Tiere/Allgemein/gravur-rechteck-D281 (Spruch) · Hundeengel wie gravur-rechteck-D287 | Arvo, Betsy Bailey | ~~hunde/hundeengel.svg~~ → motive/hunderassen/golden-retriever-04.svg | – |
| D1002 | Kalle | Hund | neu | ohne Vorlage – neuer Entwurf (Design-Master §5) | Cinzel, Cormorant Garamond, Lato | ~~hunde/hund-gezeichnet.svg~~ → motive/hunderassen/deutscher-schaferhund-01.svg | – |
| D1003 | Lotte | Hund | Referenz | Tiere/Allgemein/gravur-rechteck-D287 (Buddy: Hund mit Flügeln, Seelenhund) | Caviar Dreams, Stylish | ~~hunde/hund-mit-flugeln-1.svg~~ → motive/hunderassen/australian-shepherd-03.svg | – |
| D1004 | Benno | Hund | Referenz | Tiere/Hund/gravur-knochen-D12 (Anuschka, Spruch und Schriftart Great Vibes) | Great Vibes, Libre Baskerville | ~~pfoten/zwei-pfoten-mit-krallen.svg~~ → motive/hunderassen/beagle-01.svg | – |
| D1005 | Paula | Hund | Referenz | Tiere/Hund/gravur-knochen-D2 (Paula: Homage + Cinzel, Spruch) | Cinzel, Homage | ~~hunde/hundekopf.svg~~ → motive/hunderassen/dackel-04.svg | knochen |
| D1006 | Rocky | Hund | Referenz | Tiere/Allgemein/gravur-rechteck-D275 (Rocky, Spruch) | Alex Brush, Montserrat Light | ~~hunde/hund-sitzend-3.svg~~ → motive/hunderassen/boxer-01.svg | – |
| D1007 | Sammy | Hund | Referenz | Tiere/Hund/gravur-edelstahl-21x10-D1 (Sammy, Great Vibes, Spruch) | Great Vibes, Lora, Poppins ExtraLight | ~~hunde/hund-sitzend-2.svg~~ → motive/hunderassen/jack-russell-terrier-01.svg | – |
| D1008 | Luke | Hund | Referenz | Tiere/Hund/gravur-edelstahl-20x20-D8 (Luke, Rounded Elegance; Arial-Teil → Rounded Elegance) | Rounded Elegance | ~~sterne/sternschnuppe.svg~~ → motive/hunderassen/husky-04.svg | – |
| D1009 | Gina | Hund | Referenz | Tiere/Hund/gravur-herz-18x13-D13 (Gina, Spruchidee; Foto → Hundesilhouette) | Hello Georgia, Rounded Elegance | ~~hunde/hund-stehend-1.svg~~ → motive/hunderassen/french-bulldog-04.svg | – |
| D1010 | Abby | Hund | Referenz | Tiere/Hund/gravur-acryl-herz-20x16-D0 (Abbygale, Allura, Spruch) | Allura, Cinzel | ~~flugel/pfotenflugel-3.svg~~ → motive/hunderassen/chihuahua-03.svg | – |
| D1011 ★ | Konfetti | Hund | Referenz | Tiere/Hund/gravur-herz-10x10-D19 (Konfetti, Pfotenspur, Great Vibes) | Great Vibes, Josefin Sans | motive/pfoten/pfotenspur.svg | herz |
| D1012 | Flocke | Hund | Referenz | Tiere/Hund/gravur-knochen-D8 (Flocke: Hund mit Leine) | Allura, Arvo, Libre Baskerville, Parisienne | ~~hunde/hund-mit-leine.svg~~ → motive/hunderassen/spitz-01.svg | knochen |
| D1013 | Balou | Hund | Referenz | Tiere/Allgemein/gravur-rechteck-D283 (Spruch) · Pfotenherz | Dancing Script, Raleway | ~~pfoten/herz-mit-pfote.svg~~ → motive/hunderassen/labradoodle-01.svg | – |
| D1014 | Anton | Hund | Referenz | Tiere/Allgemein/gravur-rechteck-D290 (Geliebt & Unvergessen) | Cormorant Garamond, Italianno | ~~hunde/hund-sitzend-1.svg~~ → motive/hunderassen/cocker-spaniel-02.svg | – |
| D1015 ★ | Wilma | Hund | Referenz | Tiere/Hund/gravur-knochen-D4 (Karlchen: Ashley, Spruch) | Ashley, Lato, Lora | ~~pfoten/pfote-in-hand.svg~~ → motive/hunderassen/labrador-05.svg | – |
| D1033 | Cora | Katze | 1:1 | Tiere/Katze/gravur-herz-10x10-D11 (Cora, Schmetterlinge; Soulmate fehlt → Great Vibes) | Caviar Dreams, Great Vibes | eigenes Motiv aus Bestand (Tiere/Katze/gravur-herz-10x10-D11) | herz |
| D1060 | Frieda | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D292 | Arvo, Bellefair | motive/regenbogen/regenbogen-tiere.svg | – |
| D1061 | Fritzi | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D273 (Fritzi, Dream Orphans; Sterne → Regenbogen) | Dream Orphans, Josefin Sans | ~~regenbogen/regenbogen-mit-wolken-2.svg~~ → motive/blumen/pusteblume-mehrere.svg | – |
| D1062 | Snoopy | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D263 (Snoopy, Pusteblumen, Allura) | Allura, Cinzel | motive/pfoten/pusteblume-mit-pfoten.svg | – |
| D1063 | Casper | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D259 (Casper: Baum, Cinzel) | Cinzel, Montserrat Light | motive/baume/herzbaum.svg | – |
| D1064 | Willi | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D257 (Willi: Blätterherz, Cinzel + Rochester) | Cinzel, Rochester | motive/herzen/blatterherz-2.svg | – |
| D1065 | Milow | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D256 (Milow: Blumen + Schmetterling; Magnolia/Atlanta → Great Vibes/Arvo) | Arvo, Great Vibes | motive/blumen/blumen.svg | – |
| D1066 | Max | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D252 (Max: Pfotenspur, Ampera fehlt → Kaushan Script) | Kaushan Script, Montserrat | motive/pfoten/pfoten-und-fuspur-1.svg | – |
| D1067 | Sally | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D286 (Sally: Herzlinie „love“, Stylish + Caviar Dreams) | Caviar Dreams, Stylish | ~~herzen/herzlinie-minimalistisch.svg~~ → motive/blumen/rose-3.svg | – |
| D1068 | Gustav | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D266 (Gustav: Blumenranke, Great Vibes + Caviar Dreams) | Caviar Dreams, Great Vibes | motive/blumen/rosenranke.svg | – |
| D1069 | Lucky | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D285 (Lucky: Ashley, Spruch) · Feder statt Foto | Ashley, Montserrat Light | motive/federn/feder-mit-vogeln.svg | – |
| D1070 | Polly | Allgemein | Referenz | Tiere/Allgemein/gravur-acryl-herz-20x16-D (Polly: Spruch; Century Gothic → Raleway) | Alex Brush, Raleway | ~~pfoten/pfote-und-hand-1.svg~~ → motive/flugel/engelsflugel-1.svg | – |
| D1071 | Idefix | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D269 (Idefix: Allura + Rounded Elegance, Spruch; Arial → Rounded Elegance) | Allura, Rounded Elegance | ~~flugel/engelsflugel-4.svg~~ → motive/vogel/taube-mit-zweig-2.svg | – |
| D1072 | Krümel | Allgemein | Referenz | Tiere/Kleintier (Bestand-Unterkategorie Kleintier) · Meerschweinchen aus Bibliothek | Comfortaa, Dancing Script | ~~tiere/meerschweinchen-1.svg~~ → motive/blumen/blumenstrauch.svg | – |
| D1073 ★ | Aiko | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D280 (Sparkley: Baum mit Vögeln, Spruch) | Homage, Poppins ExtraLight | motive/baume/baum-mit-vogeln.svg | – |
| D1090 | Kira | Sternenkinder | Referenz | Sternenkinder/Sternenkind/gravur-sternenkinder-D3 | Allura, Cinzel | motive/sonne-mond-wolken/mond-mit-madchen.svg | – |
| D1091 | Noah | Sternenkinder | Referenz | Sternenkinder/Sternenkind/gravur-rechteck-D88 (Noah: Hello Georgia + Caviar Dreams, Sterne) | Caviar Dreams, Hello Georgia | motive/sterne/sterne-4.svg | – |
| D1092 | Anna-Lena | Sternenkinder | Referenz | Sternenkinder/Sternenkind/gravur-sternenkinder-D1 (Anna-Lena: Allura + Cinzel, Spruch) | Allura, Cinzel | motive/engel/engel-auf-wolke-2.svg | – |
| D1093 | Maja | Sternenkinder | Referenz | Sternenkinder/Sternenkind/gravur-rechteck-D86 (Maja: Allura + Amatic SC, Flügel) | Allura, Amatic SC | motive/flugel/engelsflugel-3.svg | – |
| D1094 | Tabea | Sternenkinder | Referenz | Sternenkinder/Sternenkind/gravur-sternenkinder-D2 (Tabea: Cookie, Sterne; Times New Roman → Josefin Sans) | Cookie, Josefin Sans | ~~sterne/sternschnuppe.svg~~ → motive/engel/engel-auf-wolke-1.svg | – |
| D1095 | Mia | Sternenkinder | Referenz | Sternenkinder/Sternenkind/gravur-rechteck-D91 (Mia: Betsy Bailey; Champagne & Limousines → Montserrat Light) | Betsy Bailey, Montserrat Light | ~~herzen/herz-mit-babyfuen.svg~~ → motive/engel/engel-mit-herzen.svg | – |
| D1096 | Leo | Sternenkinder | neu | ohne Vorlage – neuer Entwurf (Design-Master §5) | Great Vibes, Lato, Lora | ~~baby/baby-in-hand.svg~~ → motive/engel/engel-sitzend.svg | – |
| D1097 | Ella | Sternenkinder | neu | ohne Vorlage – neuer Entwurf (Design-Master §5) | Parisienne, Raleway | ~~sonne-mond-wolken/mond-mit-schaukel.svg~~ → motive/engel/engel-fliegend.svg | – |
| D1074 | Sammy | Allgemein | Referenz | Tiere/Allgemein/gravur-herz-10x10-D17 | Magnolia Script | ~~herzen/herz-skizziert.svg~~ → designs/bestand/gedenktafeln/Tiere/Allgemein/gravur-herz-10x10-D17 (Motiv des Verkaufsoriginals) | herz |
| D1075 | Perle | Allgemein | Referenz | Tiere/Allgemein/gravur-herz-10x10-D13 (1:1 nicht möglich: Spruch dort 2,2 mm Versalhöhe < 3 mm) | Cinzel, Hello Georgia | motive/flugel/engelsflugel-2.svg | – |
| D1076 | Johnny | Allgemein | Referenz | Tiere/Allgemein/gravur-herz-10x10-D12 | Magnolia Script | motive/pfoten/pfotenspur.svg | herz |
| D1077 | Millie | Allgemein | Referenz | Tiere/Allgemein/gravur-herz-10x10-D14 (Ashley Marie fehlt → Vorschlag Cinzel) | Ashley, Cinzel | motive/pfoten/zwei-pfoten-2.svg | herz |
| D1078 | Cleo | Allgemein | Referenz | Tiere/Allgemein/gravur-stern-D10 + Tiere/Hund/gravur-knochen-D10 | Cinzel | motive/pfoten/zwei-pfoten-1.svg | knochen, stern |
| D1079 | Daisy | Allgemein | Referenz | Tiere/Allgemein/gravur-stern-D12 | Cinzel, Homage | ~~herzen/herz-kontur.svg~~ → designs/bestand/gedenktafeln/Tiere/Allgemein/gravur-stern-D12 (Motiv des Verkaufsoriginals) | stern |
| D1100 | Lucky | Hund | 1:1 | Tiere/Hund/gravur-knochen-D1 | Rounded Elegance | eigenes Motiv aus Bestand (Tiere/Hund/gravur-knochen-D1) | knochen |
| D1101 | Buddy | Hund | 1:1 | Tiere/Hund/gravur-knochen-D5 | Allura | eigenes Motiv aus Bestand (Tiere/Hund/gravur-knochen-D5) | knochen |
| D1102 | Lucky | Hund | 1:1 | Tiere/Hund/gravur-knochen-D6 | Kalam, Montserrat Light | eigenes Motiv aus Bestand (Tiere/Hund/gravur-knochen-D6) | knochen |
| D1103 | Lucky | Hund | 1:1 | Tiere/Hund/gravur-knochen-D7 | Ashley, Roboto Slab | eigenes Motiv aus Bestand (Tiere/Hund/gravur-knochen-D7) | knochen |
| D1104 | Zora | Hund | 1:1 | Tiere/Hund/gravur-knochen-D9 | Great Vibes, Libre Baskerville | eigenes Motiv aus Bestand (Tiere/Hund/gravur-knochen-D9) | knochen |
| D1105 | Jerry | Hund | 1:1 | Tiere/Hund/gravur-knochen-D11 | Kalam, Kaushan Script | eigenes Motiv aus Bestand (Tiere/Hund/gravur-knochen-D11) | knochen |
| D1106 | Stella | Hund | 1:1 | Tiere/Hund/gravur-knochen-D13 | Allura, Montserrat Light | eigenes Motiv aus Bestand (Tiere/Hund/gravur-knochen-D13) | knochen |
| D1107 | Karlchen | Hund | 1:1 | Tiere/Hund/gravur-knochen-D4 | Ashley, Bellefair | eigenes Motiv aus Bestand (Tiere/Hund/gravur-knochen-D4) | knochen |
| D1108 | Anuschka | Hund | 1:1 | Tiere/Hund/gravur-knochen-D12 | Great Vibes, Libre Baskerville | eigenes Motiv aus Bestand (Tiere/Hund/gravur-knochen-D12) | knochen |
| D1080 | Lumpi | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D251 (Filou: Homage + Cinzel, Spruch; Pfoten → Rosen) | Cinzel, Homage | motive/blumen/rose5.svg | – |
| D1081 | Emmi | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D253 (Sammy: Spruch; Morning Glory fehlt → Great Vibes, Georgia → Libre Baskerville; Blätterbaum → Lebensbaum) | Great Vibes, Libre Baskerville | motive/baume/lebensbaum-3.svg | – |
| D1082 | Rudi | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D254 (Roger: Spruch; BraggestDemo fehlt → Alex Brush, Champagne & Limousines → Montserrat Light; Schmetterling → Kolibri) | Alex Brush, Montserrat Light | motive/vogel/kolibri-2.svg | – |
| D1083 | Nelly | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D258 (Marlo: Spruch; Copperplate Gothic → Cinzel) | Cinzel, Cormorant Garamond | motive/federn/feder-1.svg | – |
| D1084 | Pünktchen | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D260 (Frieda: Hello Georgia + Allura, Baum mit fliegenden Blättern) | Allura, Hello Georgia | motive/baume/baum-8.svg | – |
| D1085 | Lotti | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D262 (Balou: Ashley + Cinzel, Spruch, Pusteblumen) | Ashley, Cinzel | motive/blumen/pusteblume-2.svg | – |
| D1086 | Malou | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D264 (Malmo: Allura, Spruch, Rosen) | Allura | motive/blumen/rose-2.svg | – |
| D1087 | Charly | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D270 (Lucky: Caviar Dreams, Spruch; Chewy fehlt → Kaushan Script; Brücke → Vogelschwarm) | Caviar Dreams, Kaushan Script | motive/vogel/vogelschwarm-3.svg | – |
| D1088 | Bruni | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D272 (Bruno: feine Rose; Champagne & Limousines → Rochester/Poppins ExtraLight) | Poppins ExtraLight, Rochester | motive/blumen/rose-1.svg | – |
| D1089 | Kiki | Allgemein | Referenz | Tiere/Allgemein/gravur-rechteck-D291 (Mollie: Bellefair; Champagne & Limousines → Montserrat Light; Hund im Herz → Vogel mit Zweig) | Bellefair, Montserrat Light | motive/vogel/vogel-mit-zweig-2.svg | – |

## Schriftersatz (Corel-Originale 1:1)

- Bell MT → Libre Baskerville (Schrift fehlt, keine Ersatzregel – Vorschlag Claude, Chris entscheidet) · 1×
- Ashley Marie → Cinzel (Schrift fehlt, keine Ersatzregel – Vorschlag Claude, Chris entscheidet) · 1×
- Soulmate → Great Vibes (Schrift fehlt, keine Ersatzregel – Vorschlag Claude, Chris entscheidet) · 1×
- Handlee → Kalam (Schrift fehlt, keine Ersatzregel – Vorschlag Claude, Chris entscheidet) · 1×
- Champagne & Limousines → Montserrat Light (Ersatztabelle schriften/README.md) · 2×
- Standlist → Ashley (Ersatztabelle schriften/README.md) · 1×
- Georgia → Libre Baskerville (Schrift fehlt, keine Ersatzregel – Vorschlag Claude, Chris entscheidet) · 2×
- Freebooter Script → Great Vibes (Schrift fehlt, keine Ersatzregel – Vorschlag Claude, Chris entscheidet) · 1×
- Vista La Diva → Allura (Schrift fehlt, keine Ersatzregel – Vorschlag Claude, Chris entscheidet) · 1×
- Oranienbaum → Bellefair (Schrift fehlt, keine Ersatzregel – Vorschlag Claude, Chris entscheidet) · 1×

## Offene Punkte / Selbstprüfung

- **Katzen:** zurückgestellt bis zur Katzen-Serie von Operator 2; „Katze“ zeigt bis dahin 30 allgemeine Designs je Reihe. Wenn allgemeine Designs nicht unter Katze erscheinen sollen: `katzengedenktafeln` aus `themes` von D1060–D1089 streichen.
- **Corel-Originale 1:1 mit Fehlern** (nicht verändert, bitte entscheiden): Knochen D1102 Lucky – Spruch läuft nach Schriftersatz (Kalam) rechts aus der Form; Knochen D1005 Paula, D1104 Zora und Stern D1079 Daisy – Textboxen überlappen (laut Prüfskript; im Original ebenso eng gesetzt).
- Rassenporträts sind beispielhaft (Kunde wählt seine Rasse im Konfi); Konfetti D1011 behält die Pfotenspur des Originals.
- Motive auf Stern und schiefem Herz teils klein (zugunsten eines großen Namens).
- Schriftersatz in Originalen ist Vorschlag (siehe unten), Chris entscheidet.
- Sichtprüfung: alle 18 Bögen einzeln angesehen; keine Überlappungen in neuen Designs (Prüfskript), Mindest-Versalhöhe 3 mm auf dem Master.
