# Monogramme Schiefer A–Z – Bericht (Issue #116, Nachauftrag 02.11.2026)

Katalog-Branch `dev/monogramme-az-20261102` · Kontaktbögen = native Konfi-Zielvorschau, ohne Bohrlöcher, Corel-Original klein darunter, Freiflächen-Messwerte je Kachel.

## Kontaktbögen
- 22 × 14: [Kalligrafie](https://github.com/Chris83638w/gravuru-2027/blob/dev/monogramme-az-20261102/docs/handoffs/monogramme-az-20261102/monogramme-az-22x14-kalligrafie.jpg?raw=true) · [Pinselschrift](https://github.com/Chris83638w/gravuru-2027/blob/dev/monogramme-az-20261102/docs/handoffs/monogramme-az-20261102/monogramme-az-22x14-pinselschrift.jpg?raw=true) · [Rahmen](https://github.com/Chris83638w/gravuru-2027/blob/dev/monogramme-az-20261102/docs/handoffs/monogramme-az-20261102/monogramme-az-22x14-rahmen.jpg?raw=true)
- 30 × 20: [Kalligrafie](https://github.com/Chris83638w/gravuru-2027/blob/dev/monogramme-az-20261102/docs/handoffs/monogramme-az-20261102/monogramme-az-30x20-kalligrafie.jpg?raw=true) · [Pinselschrift](https://github.com/Chris83638w/gravuru-2027/blob/dev/monogramme-az-20261102/docs/handoffs/monogramme-az-20261102/monogramme-az-30x20-pinselschrift.jpg?raw=true) · [Rahmen](https://github.com/Chris83638w/gravuru-2027/blob/dev/monogramme-az-20261102/docs/handoffs/monogramme-az-20261102/monogramme-az-30x20-rahmen.jpg?raw=true)
- [Neu D1600–D1603 (beide Größen)](https://github.com/Chris83638w/gravuru-2027/blob/dev/monogramme-az-20261102/docs/handoffs/monogramme-az-20261102/monogramme-az-neu-d1600-d1603.jpg?raw=true) · markierte Messbögen in `markiert/`, Rohwerte `messwerte.json`

## Inventur
| Formatreihe | Familien | vorher (main) | nachher |
|---|---|---|---|
| monogramme-schiefer-22x14 | gedenktafel-22x14-schiefer-natur | 10 (6 Bestand + 4 neu) | **82** (MG-S 26, MG2-S 26, MG3-S 26 = A–Z, + D1600–D1603) |
| monogramme-schiefer-30x20 | gedenktafel-30x20-schiefer-natur, -premium | 10 | **82** (dto.) |

Bestand `designs/bestand/monogramme/`: MG-S, MG2-S, MG3-S je 26 (D1 = A … D26 = Z) – alle 78 übernommen. **MGH-V2A**: 26 Edelstahl-Herz-Monogramme 30 × 24 (300 × 241,4 mm, Schnittkontur „geteiltes Herz“ mit Ranken, Buchstabe A–Z in der unteren Hälfte, Namensfeld zwischen zwei Stegen, Texte als Kurven/Arial) – nur inventarisiert, keine Familie 30 × 24 vorhanden.

## Aufbau je Stil
- **Kalligrafie (MG-S) und Pinselschrift (MG2-S): 1:1** – Buchstabe und Linien als Kurven aus dem Corel-Bogen, Name als Text (Cinzel). Name: „Monogramm A – Kalligrafie“ usw. 30 × 20: 22 × 14-Master gleichmäßig ×1,364 und mittig (Corel-Fassung 30 × 20 im Bestand nicht extrahiert); MG-S-D26 umgekehrt aus der 30 × 20-Fassung.
- **Rahmen (MG3-S): Referenz** – Rahmenlinie und Name aus dem Bogen, Initial Playfair Display (Ballet Harmony nicht freigegeben) als Text, Rahmenlücke an den Buchstaben angepasst. Neu nach §7: Gruppe senkrecht mittig, Initial größtmöglich (22 × 14: 86,7 mm; 30 × 20: 100 mm), J und Q kleiner und höher, damit der Schwung über dem Namen endet.
- Abweichungen: „Constantine“ (MG-S-D1/D2, nicht freigegeben) → Cinzel wie D3–D26; Beispielname „Eichmann“ → „Eckhardt“ (MG-S/MG2-S D5); „Caeser“ → „Clausen“ (MG3-S D3); MG-S-D26 Name aus Kurven → Text „Zimmermann“; MG-S-D25 (Y) im Namensband ausgespart wie die übrigen Split-Monogramme; Name bei MG-S-D25 und MG2-S-D16 um 0,3–1,1 mm zwischen die Linien gerückt (saß im Bogen auf der Linie; in `deviations`).

## Freiflächen-Regel (§7) – Messung aller Bögen
`flaeche-messen.py` auf allen 7 Bögen (164 Platten). Format: Gruppe in % der Plattenfläche · Versatz x/y in %.
- **MG3-S (Referenz):** vorher +6 % (22 × 14) bzw. +11 % (30 × 20) zu tief → jetzt Gruppe 67–69 % / 58–60 %, Versatz ≤ 0,0 % waagerecht, ≤ 2,3 % senkrecht. ok.
- **D1600 / D1603** (neu, schon freigegeben): vorher −3,7 % / −6,6 % (zu hoch) → mittig gesetzt, jetzt ≤ 0,2 %. D1601, D1602 ok.
- **MG-S/MG2-S (1:1-Originale, unverändert):** Gruppe 44–68 %, Höhe 74–98 %. Ausreißer nur bei 1:1-Kalligrafie (Schwünge des Buchstabens): MG-S-D1 A (x −4,4/−4,7 %), D2 B (y +3,2/+3,4 %), D24 X (x −3,8 %), D26 Z (x −3,3/−3,7 %) – so im Corel-Bogen, laut §7-Ausnahme nicht umgebaut.
- Hinweis zum Messskript: Bei dicken hellen Strichen (Pinsel-Buchstaben, Magnolia-K) zählt es die Strichmitte nicht als Platte; auf einzelnen PNGs fiel D1601 deshalb fälschlich durch (x +20 %). Gegenprobe mit `binary_fill_holes` auf den Bögen: gleiche Befunde (max. 3 Prozentpunkte Abweichung bei D1601). Vorschlag: Löcher der Plattenmaske füllen.

| Design | Bst. | Name | Beispielname | Modus | 22 × 14 | 30 × 20 |
|---|---|---|---|---|---|---|
| MG-S-D1 | A | Monogramm A – Kalligrafie | Altmann | 1:1 | 61 % · -4.4/-0.6 ⚠ | 58 % · -4.7/-0.4 ⚠ |
| MG-S-D2 | B | Monogramm B – Kalligrafie | Baumann | 1:1 | 49 % · +2.1/+3.2 ⚠ | 48 % · +2.0/+3.4 ⚠ |
| MG-S-D3 | C | Monogramm C – Kalligrafie | Christensen | 1:1 | 61 % · -0.2/+0.8 | 59 % · -0.1/+1.1 |
| MG-S-D4 | D | Monogramm D – Kalligrafie | Dürkopp | 1:1 | 62 % · +0.0/+1.0 | 58 % · +0.0/+1.2 |
| MG-S-D5 | E | Monogramm E – Kalligrafie | Eckhardt | 1:1 | 67 % · -1.6/+0.3 | 64 % · -1.6/+0.4 |
| MG-S-D6 | F | Monogramm F – Kalligrafie | Friedmann | 1:1 | 61 % · +0.1/+2.7 | 58 % · +0.0/+2.6 |
| MG-S-D7 | G | Monogramm G – Kalligrafie | Grundmann | 1:1 | 68 % · -0.4/+0.0 | 64 % · -0.4/+0.4 |
| MG-S-D8 | H | Monogramm H – Kalligrafie | Heidemann | 1:1 | 51 % · -2.0/+1.4 | 48 % · -2.1/+1.3 |
| MG-S-D9 | I | Monogramm I – Kalligrafie | Ingold | 1:1 | 52 % · +2.7/-1.2 | 50 % · +2.7/-0.9 |
| MG-S-D10 | J | Monogramm J – Kalligrafie | Jansen | 1:1 | 49 % · +1.0/+2.0 | 47 % · +1.1/+2.1 |
| MG-S-D11 | K | Monogramm K – Kalligrafie | Kampmann | 1:1 | 57 % · -1.4/-0.2 | 54 % · -1.4/+0.0 |
| MG-S-D12 | L | Monogramm L – Kalligrafie | Lipper | 1:1 | 57 % · +0.1/-0.8 | 53 % · -0.1/-0.6 |
| MG-S-D13 | M | Monogramm M – Kalligrafie | Mendel | 1:1 | 65 % · -1.1/+0.0 | 63 % · -0.8/+0.2 |
| MG-S-D14 | N | Monogramm N – Kalligrafie | Nolte | 1:1 | 52 % · -0.2/+1.2 | 52 % · -0.2/+1.1 |
| MG-S-D15 | O | Monogramm O – Kalligrafie | Ortmann | 1:1 | 47 % · +0.0/+0.4 | 44 % · +0.0/+0.6 |
| MG-S-D16 | P | Monogramm P – Kalligrafie | Peters | 1:1 | 62 % · +0.0/+0.4 | 57 % · -0.0/+0.7 |
| MG-S-D17 | Q | Monogramm Q – Kalligrafie | Quermann | 1:1 | 55 % · +1.5/-0.2 | 52 % · +1.5/-0.2 |
| MG-S-D18 | R | Monogramm R – Kalligrafie | Rudolph | 1:1 | 60 % · -1.1/+1.4 | 57 % · -0.9/+1.5 |
| MG-S-D19 | S | Monogramm S – Kalligrafie | Sörens | 1:1 | 58 % · +1.6/-0.2 | 56 % · +1.5/+0.0 |
| MG-S-D20 | T | Monogramm T – Kalligrafie | Thiemann | 1:1 | 53 % · +0.9/+1.4 | 52 % · +0.9/+1.3 |
| MG-S-D21 | U | Monogramm U – Kalligrafie | Uhlmann | 1:1 | 56 % · +0.1/+0.2 | 55 % · +0.0/+0.4 |
| MG-S-D22 | V | Monogramm V – Kalligrafie | Vogel | 1:1 | 56 % · -0.9/+0.3 | 54 % · -0.9/+0.4 |
| MG-S-D23 | W | Monogramm W – Kalligrafie | Wehrmann | 1:1 | 54 % · +0.0/+0.8 | 51 % · +0.0/+0.9 |
| MG-S-D24 | X | Monogramm X – Kalligrafie | Xander | 1:1 | 52 % · -3.8/+0.0 ⚠ | 50 % · -3.8/+0.2 ⚠ |
| MG-S-D25 | Y | Monogramm Y – Kalligrafie | Yanar | 1:1 | 57 % · +0.0/+0.6 | 56 % · +0.0/+0.9 |
| MG-S-D26 | Z | Monogramm Z – Kalligrafie | Zimmermann | 1:1 | 61 % · -3.3/+0.0 ⚠ | 63 % · -3.7/+0.2 ⚠ |
| MG2-S-D1 | A | Monogramm A – Pinselschrift | Altmann | 1:1 | 49 % · +0.0/+0.0 | 46 % · +0.1/+0.0 |
| MG2-S-D2 | B | Monogramm B – Pinselschrift | Baumann | 1:1 | 50 % · -0.9/+1.2 | 48 % · -0.7/+1.5 |
| MG2-S-D3 | C | Monogramm C – Pinselschrift | Christensen | 1:1 | 59 % · -1.5/+0.0 | 56 % · -1.5/+0.0 |
| MG2-S-D4 | D | Monogramm D – Pinselschrift | Dürkopp | 1:1 | 48 % · +1.4/+0.4 | 46 % · +1.4/+0.6 |
| MG2-S-D5 | E | Monogramm E – Pinselschrift | Eckhardt | 1:1 | 53 % · -0.6/+0.2 | 50 % · -0.6/+0.2 |
| MG2-S-D6 | F | Monogramm F – Pinselschrift | Friedmann | 1:1 | 56 % · -0.4/+2.7 | 53 % · -0.4/+2.8 |
| MG2-S-D7 | G | Monogramm G – Pinselschrift | Grundmann | 1:1 | 59 % · +0.0/-0.4 | 57 % · +0.0/+0.0 |
| MG2-S-D8 | H | Monogramm H – Pinselschrift | Heidemann | 1:1 | 59 % · +0.0/+2.3 | 57 % · +0.0/+2.3 |
| MG2-S-D9 | I | Monogramm I – Pinselschrift | Ingold | 1:1 | 48 % · +0.9/+1.2 | 46 % · +0.9/+1.4 |
| MG2-S-D10 | J | Monogramm J – Pinselschrift | Jansen | 1:1 | 54 % · +0.0/+0.3 | 51 % · +0.0/+0.5 |
| MG2-S-D11 | K | Monogramm K – Pinselschrift | Kampmann | 1:1 | 52 % · -0.7/+1.6 | 50 % · -0.7/+1.9 |
| MG2-S-D12 | L | Monogramm L – Pinselschrift | Lipper | 1:1 | 48 % · +0.0/+0.6 | 44 % · -0.0/+0.6 |
| MG2-S-D13 | M | Monogramm M – Pinselschrift | Mendel | 1:1 | 65 % · +0.9/+0.6 | 62 % · +0.9/+0.6 |
| MG2-S-D14 | N | Monogramm N – Pinselschrift | Nolte | 1:1 | 49 % · +0.0/+0.8 | 47 % · +0.0/+0.9 |
| MG2-S-D15 | O | Monogramm O – Pinselschrift | Ortmann | 1:1 | 57 % · +0.0/+0.5 | 55 % · +0.0/+0.6 |
| MG2-S-D16 | P | Monogramm P – Pinselschrift | Peters | 1:1 | 56 % · +1.9/+1.2 | 53 % · +1.9/+1.3 |
| MG2-S-D17 | Q | Monogramm Q – Pinselschrift | Quermann | 1:1 | 54 % · +0.0/+0.6 | 51 % · -0.0/+0.7 |
| MG2-S-D18 | R | Monogramm R – Pinselschrift | Rudolph | 1:1 | 54 % · -0.9/+0.4 | 51 % · -0.9/+0.6 |
| MG2-S-D19 | S | Monogramm S – Pinselschrift | Sörens | 1:1 | 46 % · +0.0/+1.2 | 44 % · -0.0/+1.1 |
| MG2-S-D20 | T | Monogramm T – Pinselschrift | Thiemann | 1:1 | 54 % · +0.0/+1.0 | 51 % · +0.0/+1.1 |
| MG2-S-D21 | U | Monogramm U – Pinselschrift | Uhlmann | 1:1 | 53 % · +0.1/+2.1 | 51 % · +0.0/+2.2 |
| MG2-S-D22 | V | Monogramm V – Pinselschrift | Vogel | 1:1 | 52 % · +0.1/+1.4 | 49 % · +0.1/+1.5 |
| MG2-S-D23 | W | Monogramm W – Pinselschrift | Wehrmann | 1:1 | 55 % · -0.4/+1.2 | 53 % · -0.4/+1.1 |
| MG2-S-D24 | X | Monogramm X – Pinselschrift | Xander | 1:1 | 57 % · +0.0/+0.4 | 53 % · +0.0/+0.6 |
| MG2-S-D25 | Y | Monogramm Y – Pinselschrift | Yanar | 1:1 | 60 % · -1.9/+1.4 | 57 % · -1.9/+1.5 |
| MG2-S-D26 | Z | Monogramm Z – Pinselschrift | Zimmermann | 1:1 | 65 % · +1.5/+0.4 | 61 % · +1.5/+0.6 |
| MG3-S-D1 | A | Monogramm A – Rahmen | Austermeier | Referenz | 67 % · +0.0/+2.3 | 58 % · +0.0/+0.6 |
| MG3-S-D2 | B | Monogramm B – Rahmen | Bachmeier | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D3 | C | Monogramm C – Rahmen | Clausen | Referenz | 69 % · +0.0/+1.4 | 60 % · +0.0/-0.4 |
| MG3-S-D4 | D | Monogramm D – Rahmen | Daam | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D5 | E | Monogramm E – Rahmen | Ebbinghaus | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D6 | F | Monogramm F – Rahmen | Faber | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D7 | G | Monogramm G – Rahmen | Gabber | Referenz | 69 % · +0.0/+1.4 | 59 % · +0.0/-0.2 |
| MG3-S-D8 | H | Monogramm H – Rahmen | Hase | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D9 | I | Monogramm I – Rahmen | Iwanoski | Referenz | 68 % · +0.0/+2.0 | 59 % · +0.0/+0.0 |
| MG3-S-D10 | J | Monogramm J – Rahmen | Jakobi | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D11 | K | Monogramm K – Rahmen | Kabak | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D12 | L | Monogramm L – Rahmen | Laage | Referenz | 68 % · +0.0/+2.0 | 59 % · +0.0/+0.0 |
| MG3-S-D13 | M | Monogramm M – Rahmen | Moser | Referenz | 68 % · +0.0/+2.0 | 59 % · +0.0/+0.0 |
| MG3-S-D14 | N | Monogramm N – Rahmen | Nolte | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D15 | O | Monogramm O – Rahmen | Ochsenbauer | Referenz | 68 % · +0.0/+1.6 | 59 % · +0.0/-0.2 |
| MG3-S-D16 | P | Monogramm P – Rahmen | Paape | Referenz | 68 % · +0.0/+2.0 | 59 % · +0.0/+0.0 |
| MG3-S-D17 | Q | Monogramm Q – Rahmen | Querengeßner | Referenz | 68 % · +0.0/+1.6 | 59 % · +0.0/-0.2 |
| MG3-S-D18 | R | Monogramm R – Rahmen | Radler | Referenz | 68 % · +0.0/+2.0 | 59 % · +0.0/+0.0 |
| MG3-S-D19 | S | Monogramm S – Rahmen | Seefeld | Referenz | 68 % · +0.0/+1.6 | 59 % · +0.0/-0.2 |
| MG3-S-D20 | T | Monogramm T – Rahmen | Taubler | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D21 | U | Monogramm U – Rahmen | Ungermann | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D22 | V | Monogramm V – Rahmen | Vogel | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D23 | W | Monogramm W – Rahmen | Waldmann | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D24 | X | Monogramm X – Rahmen | Xaver | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D25 | Y | Monogramm Y – Rahmen | Yürük | Referenz | 68 % · +0.0/+1.8 | 59 % · +0.0/+0.0 |
| MG3-S-D26 | Z | Monogramm Z – Rahmen | Zeilmann | Referenz | 68 % · +0.0/+2.0 | 59 % · +0.0/+0.0 |
| MG-S-D1600 | frei | Lorbeerkranz · F · Falkenberg seit 2026 | – | neu | 47 % · +0.1/-0.2 | 50 % · +0.2/-0.2 |
| MG-S-D1601 | frei | Initial & Linie · K · Familie Kessler | – | neu | 46 % · +2.1/-0.2 | 46 % · +1.5/-0.2 |
| MG-S-D1602 | frei | Paar-Monogramm · L & J · Lena & Jonas | – | neu | 86 % · +0.0/+0.8 | 85 % · +0.0/+0.7 |
| MG-S-D1603 | frei | Art déco Raute · B · Familie Brandt | – | neu | 73 % · +0.0/+0.2 | 72 % · -0.0/+0.1 |

## Prüfung
- Native Zielvorschau: **alle 164 natur-Ziele „passt“** (82 × 22 × 14, 82 × 30 × 20). 30 × 20 premium: „Vorschau offen: Materialstärke“ (Familie ohne Stärke – Familienlücke, nicht Design).
- Kein Element überdeckt ein anderes: Buchstabe ↔ Name echte Überschneidung 0 mm² (engste Stellen 0,4–0,8 mm, so im Bogen: MG-S D9, D22, D25; MG2-S D8, D9, D16). Gravurfläche 4–13 %, größte zusammenhängende Füllfläche ≤ 7 % (Regel 15 %).
- MG2-S-D8 (H): Buchstabe 1,8 mm vom unteren Rand – 1:1 aus dem Bogen.
- Keine Freigaben gesetzt. **Geändert und deshalb Ziel-Freigabe → „offen“** (vorher freigegeben, Protokoll \`_aenderungen.jsonl\`): MG3-S-D13, D1600, D1603 je 22 × 14 und 30 × 20 – bitte neu freigeben. MG-S-D8/D13/D19, MG2-S-D2/D18 nur umbenannt, Freigabe bleibt.

## Vorschlag Konfi-Filter nach Buchstabe
Kein neues Datenfeld nötig: Buchstabe und Stil stehen im Namen („Monogramm A – Kalligrafie“) bzw. in der D-Nummer (D1 = A … D26 = Z). Konfi zeigt in der Unterkategorie Monogramme zuerst eine Buchstabenleiste **A–Z**, darunter Stil-Chips **Kalligrafie · Pinselschrift · Rahmen · frei** – Auswahl Buchstabe + Stil öffnet genau ein Design (3 Treffer je Buchstabe). Die vier freien Designs (D1600–D1603, Initial ist Text) erscheinen bei jedem Buchstaben; der gewählte Buchstabe wird ins Initial-Feld geschrieben. Umsetzung erst nach Chris' Entscheidung.

## Startdesign-Vorschlag
**MG-S-D13 „Monogramm M – Kalligrafie“** (bisheriges Startdesign, 1:1, Freigabe bleibt). Im Konfi nach Buchstabenwahl: Kalligrafie als voreingestellter Stil.

## Offene Fragen an Chris
1. MG3-S-D13, D1600, D1603 nach Mittig-Korrektur neu freigeben?
2. Konfi-Filter A–Z wie oben umsetzen?
3. Premium-Schiefer 30 × 20: Materialstärke der Familie fehlt.
4. MGH-V2A (Edelstahl-Herz 30 × 24): Familie anlegen?
5. MG-S A, B, X, Z: Schwünge 3–5 % außermittig wie im Corel-Original – so lassen (Empfehlung) oder nachzentrieren?

## Selbstprüfung
- Stark: Kalligrafie und Pinselschrift (Originale, alle 26 Buchstaben einheitlich), Rahmen jetzt ausgewogen und nah am Original.
- Schwächer: MG3-S 22 × 14 Initial 86,7 mm (Original wirkt etwas größer; Grenze = Konfi-Textkasten); J/Q im Rahmen-Stil kleiner. MG2-S Pinselbuchstaben sind kräftige Flächen (≤ 7 % je Fläche, unter der Regel).
- Beispielnamen stammen aus dem Corel-Bogen (keine Kundennamen bekannt); drei ersetzt (s. o.).
