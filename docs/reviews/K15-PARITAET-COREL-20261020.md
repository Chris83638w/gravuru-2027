# K15 · Paritätslauf Corel ↔ Python am Referenzfall

Stand: 20.10.2026 · Branch `dev/konfi-neu-K15-amazon-import` · Referenzfall Bestellung `302-4217613-2163531`, Position `69360509983882`, ASIN `B013T1VRKS`, Schiefer 22 × 14, Doppelherz D201, Great Vibes, 3 Texte, Foto.

**Datenschutz:** Die echte ZIP und das Corel-Ergebnis liegen nur auf `Y:\20_Martin\Corel\Amazon Import\Bestellungen\Paritaet-302-4217613-2163531\` und wurden hier nur als Kopie im temporären Arbeitsordner gelesen. Dieser Bericht enthält keine Kundentexte, keine Namen und kein Foto – nur Maße.

## Ablauf

1. Chris: ZIP aus Seller Central → Corel-Amazon-Import (Tools 52.5.2, Gravurmodus) → Ergebnis unverändert als `GT-S-22x14-D201.cdr` gespeichert.
2. Python: `scripts/import-amazon-order.py` auf dieselbe ZIP (Katalog `8590ebd2`, Mapping `aa04785`), ohne Fehler, 4 Warnungen (`familie_platzhalter`, `seitenverhaeltnis`, `text_im_rand` ×2).
3. Corel-CDR mit `cdr2raw` gelesen (Seite 220 × 140 mm = Platte, Ursprung −0,07/+0,02 mm).

## Ergebnis

| Element | Corel (produktiv) | Python (K15) | Abweichung | Ursache |
| --- | --- | --- | --- | --- |
| Platte | 220,0 × 140,0 mm | 220 × 140 (Platzhalter) | 0 | – |
| Foto-Rahmen | 9,62 / 5,52 mm, **89,30 × 130,67** | 10,17 / 8,62 mm, **89,06 × 124,41** | Höhe −6,26 mm (−4,8 %) | Python skaliert x und y getrennt → Foto um 4,8 % gestaucht; Corel unverzerrt |
| Schrift Text 1 | 86,5 pt = 30,52 mm | 29,04 mm | Corel +5,1 % | Corel nimmt den Maßstab aus der Breite, Python aus der Höhe |
| Schrift Text 2 | 33,5 pt = 11,82 mm | 11,33 mm | Corel +4,3 % (Corel rundet auf 0,5 pt) | wie oben |
| Schrift Text 3 | 28,0 pt = 9,88 mm | 9,41 mm | Corel +5,0 % | wie oben |
| Motiv D201 | 145,7 / 64,1 mm, 18,9 × 15,2 (aus `GT-S-22x14-D201.cdr`, unverändert übernommen) | 149,6 / 63,4 mm, 21,3 × 17,0 (Katalogmotiv in die Konfigurator-Box) | Mitte +4,1 mm in x, Größe +12 % | Corel lädt die 22×14-Vorlage, der Konfigurator zeigt die 30×20-Vorlage |
| Text-Mitte x | ca. 158,7 / 160,0 / 158,3 mm (Textrahmen laut libcdr, unsicher) | 157,5 / 160,6 / 159,1 mm | ≤ 1,4 mm | Rahmen aus libcdr sind für Grafiktext nur Näherung; nach Formel erwartet ≤ 0,2 mm |

**Die Umrechnung von Corel ist damit exakt belegt.** Rechnet man Pythons Fotolage zurück in Amazon-Pixel und mit Corels Formel (400er Raster, 10 px Rand, längere Plattenseite = 380 px, **ein** Maßstab für x und y, Platte mittig) wieder in mm, ergibt sich **9,62 / 5,52 / 89,30 × 130,67** – identisch mit dem Corel-Ergebnis auf 0,01 mm. Die Schriftgrößen weichen alle um den Faktor 1,050 ab = (220/380) : (140/254), das Verhältnis der beiden Maßstäbe.

Alle Unterschiede gehen also auf **zwei Regeln** zurück, nicht auf Fehler im Detail:

1. **Maßstab.** Corel: ein Maßstab aus der Plattenbreite, Platte senkrecht mittig im 400er Raster. Python (Spezifikation K15, Abschnitt 2): getrennt in x und y über den Amazon-Druckbereich. Folge in Python: Foto 4,8 % gestaucht, Schrift 5 % kleiner; Folge in Corel: Inhalte aus dem 30×20-Konfigurator (Seitenverhältnis 1,50) reichen oben und unten bis ca. 3,4 mm über die 22×14-Platte (1,57) hinaus.
2. **Motivquelle.** Corel nimmt das Motiv aus der Design-CDR der bestellten Größe, Python setzt es dorthin, wo der Kunde es im Konfigurator gesehen hat.

## Entscheidung (Claude, als Operator für gravuru 2027)

Der Python-Importer ist laut Entscheidung vom 19.10.2026 **Paritätsprüfung und Brücke**, kein Ersatz. Er muss also das Corel-Ergebnis vorhersagen können. Deshalb:

- **Umrechnung wie Corel** (ein Maßstab, Platte mittig, 10 px Rand) wird Standard; die getrennte x/y-Umrechnung entfällt. Das beseitigt nebenbei die Foto-Stauchung.
- **Motiv aus der Vorlage der bestellten Größe**, wie Corel. Liegt sie im Katalog nicht vor, bleibt die Konfigurator-Box der Rückfall (mit Warnung).
- **Zusätzlicher Nutzen:** Python meldet, wo Corel vom Kundenbild abweicht – Inhalte außerhalb der Platte, Motivversatz gegenüber der Vorschau. Diese Warnungen gibt es in Corel heute nicht.

Umsetzung als nächstes Paket; die Spezifikation `AMAZON-CUSTOM-IMPORT-20261019.md` Abschnitt 2 wird dabei angepasst.

## Nicht geprüft

Exakte Texttinte (Grafiktext-Rahmen aus libcdr sind ungenau; bei Bedarf PDF-Export aus Corel mit eingebetteten Schriften lesen); Zeilenabstand von Text 3 (Corel setzt 130 % der Schriftgröße, Kommentar im Corel-Code „TODO Falsch“); Fotofreistellung; weitere ASINs, Größen und Schriften.

## Umsetzung 20.10.2026: Importer rechnet wie Corel

- `Raster` mit Regel `corel` (Standard) und `druckbereich` (alt, `--umrechnung druckbereich`). Foto-Clip zusätzlich auf die Platte begrenzt.
- `design-overlays.json` D201: `vorlageMm["220x140"]` = 145,68 / 64,14 / 18,94 × 15,16 mm aus `GT-S-22x14-D201.cdr`. Motiv wird bei der Corel-Regel aus der Vorlage gesetzt; `konfiBoxMm` hält die Konfigurator-Lage fest.
- Neue Warnungen: `motiv_versatz` (Vorlage vs. Konfigurator, hier −5,4 / −0,3 mm, −15 % Breite), `motiv_ohne_vorlage`; `seitenverhaeltnis` nennt jetzt den Überstand (hier 3,5 mm). `summary.json` erhält `umrechnung`.
- Gegenprobe an der echten Bestellung (nur lokal): Foto 9,62 / 5,52 / 89,30 × 130,67 mm = Corel; Schrift 86,48 / 33,74 / 28,01 pt ↔ Corel 86,5 / 33,5 / 28 pt (Corel rundet auf 0,5 pt); Motiv 145,68 / 64,14 / 18,94 × 15,16 = Corel.
- Tests 90/90 (mit echtem Katalog), darunter Paritätstests mit den in Corel gemessenen Werten und Tests der alten Regel als Option.

Offen: Textmitte in y und Zeilenabstand (Corel 130 %) nicht direkt messbar aus der CDR; bei Bedarf PDF-Export aus Corel lesen.

## Motivlagen aller Schiefer-Gravur-Designs aus den Corel-Vorlagen (20.10.2026)

`scripts/build-design-overlays-from-corel.py` hat 314 Design-CDRs gelesen (Kopien von `V:\Produkte\Gedenktafeln\Gravur\Schiefer\{30x20,22x14}\GT-S-…-Dn\Export\`; auf V: nichts geschrieben) → `amazon/design-overlays.corel.json`: 156 Designs, Konfigurator-Lage (`bbox400`, aus 30×20) für 154, Vorlagenlage 22×14 für 156, 30×20 für 154. Übersprungen: D64 (beide Größen) und D217/D251 (30×20) ohne schwarz gefülltes Motiv; D77 (30×20) mit Plattenkontur 300,2 × 201,3 mm. D201 stimmt exakt mit dem Handwert überein (Test). Handgepflegte `design-overlays.json` hat Vorrang.

**Befund für die Produktion** (sofern der Konfigurator wie bei B013T1VRKS immer die 30×20-Vorlage zeigt – für D201 belegt, für die übrigen Designs angenommen): Bei einer 22×14-Bestellung setzt Corel das Motiv aus der 22×14-Vorlage, nicht dorthin, wo der Kunde es gesehen hat. Versatz (Mitte, Corel-Regel) über 154 Designs: Median **4,7 mm**, > 1 mm bei 134, > 3 mm bei 97, > 5 mm bei 72, **> 10 mm bei 19** (größte: D270 17,1 mm, D271 16,9, D77 14,7, D235 14,7, D5 14,5). Das Motiv ist in der 22×14-Vorlage im Median 12 % schmaler. Liste je Design: [`k15-corel-abgleich-20261019/motivversatz-22x14.json`](k15-corel-abgleich-20261019/motivversatz-22x14.json). Kundentexte stehen dagegen dort, wo der Kunde sie hingesetzt hat – bei großem Versatz können Text und Motiv überlappen oder auseinanderfallen. Der Importer meldet das je Bestellung als `motiv_versatz`.

Entscheidung Chris 20.10.2026: Amazon-Konfigurator bleibt wie bisher, die 22×14-Vorlagen werden nicht angeglichen. Stattdessen prüft der Importer je Bestellung, ob Motiv und Kundentext sich im Ergebnis überlappen: `motiv_text_ueberlappung_neu` (im Konfigurator getrennt, durch die versetzte Vorlage überlappend – vor dem Gravieren prüfen) bzw. `motiv_text_ueberlappung` (hat der Kunde so gesehen). Ab 0,5 mm in beiden Richtungen; Motiv als proportional eingepasstes Rechteck, Text als Glyphen-Box. Referenzfall: keine Überlappung.
