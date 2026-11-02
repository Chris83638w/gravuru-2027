# Korrektur AA/AS/S/S – Freiflächen und Mitte (Issue #124)

Stand 02.11.2026. Chris (01:30): „viele Freiflächen, wie bei Amselweg 13, nicht mittig, Wiesenbach tiefer gesetzt usw.“
Katalog-Branch `dev/aa-as-ss-korrektur-20261102` (ab main 4b0d94d73), Entwurfs-PR siehe Issue.

## Ergebnis
- Alle 198 Master (11 Reihen × D600–D661) wurden neu angeordnet. Text und Motiv bilden eine Gruppe, die mittig steht und die Fläche nutzt. Jedes Format hat seine eigene Anordnung:
  - Querformat 3:2: zweizeilig.
  - Hochformat 2:3 und 1:3: gestapelt, die Hauptzeile so breit wie möglich, die Zeilen über die Höhe verteilt.
  - Quadrat: gestapelt.
  - Langformat 3:1: Zeile.
  - Oval: an die Ellipse angepasst.
- **Messung (scripts/flaeche-messen.py, Fassung 02.11. mit Edelstahl-Korrektur): 198 von 198 ok, vorher 135 auffällig.** Der Versatz liegt bei höchstens 2,6 %.
- **Native Zielvorschau AA/AS/SS: 594 von 594 Zielen „passt“** (alle Größen je Ziel), keine Bohrloch-Hinweise.
- Unverändert: Kennungen, Texte (Feld, Wort, Schrift), Motive, Größenlisten sowie Ziele samt Freigabe. Ein Skript prüft beim Schreiben, dass Texte, Motive und Freigaben gleich bleiben.
- Füllflächen: Die größte zusammenhängende Fläche ist der Hund in D625 im Hochformat mit 9,3 % der Platte. Die Grenze liegt bei 15 %.

## Kontaktbögen (native Konfi-Zielvorschau AA, kleinste Größe, ohne Abstandshalter) und Messbilder
- 150x100: [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-150x100.jpg?raw=true) · [Messbild](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-150x100-messung.jpg?raw=true)
- 70x210: [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-70x210.jpg?raw=true) · [Messbild](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-70x210-messung.jpg?raw=true)
- 100x150: [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-100x150.jpg?raw=true) · [Messbild](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-100x150-messung.jpg?raw=true)
- 210x70: [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-210x70.jpg?raw=true) · [Messbild](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-210x70-messung.jpg?raw=true)
- 160x160: [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-160x160.jpg?raw=true) · [Messbild](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-160x160-messung.jpg?raw=true)
- r5-150x100: [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-r5-150x100.jpg?raw=true) · [Messbild](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-r5-150x100-messung.jpg?raw=true)
- r5-100x150: [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-r5-100x150.jpg?raw=true) · [Messbild](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-r5-100x150-messung.jpg?raw=true)
- oval-150x80: [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-oval-150x80.jpg?raw=true) · [Messbild](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-oval-150x80-messung.jpg?raw=true)
- oval-150x100: [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-oval-150x100.jpg?raw=true) · [Messbild](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-oval-150x100-messung.jpg?raw=true)
- ee-180x120: [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-ee-180x120.jpg?raw=true) · [Messbild](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-ee-180x120-messung.jpg?raw=true)
- ee-120x180: [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-ee-120x180.jpg?raw=true) · [Messbild](https://github.com/Chris83638w/gravuru-2027/blob/dev/aa-as-ss-korrektur-20261102/docs/handoffs/aa-as-ss-korrektur-20261102/acryl-abstandshalter-ee-120x180-messung.jpg?raw=true)

## Messung vorher/nachher
| Reihe | vorher auffällig | nachher auffällig | Versatz max. nachher | Fläche nachher (min–max) |
|---|---|---|---|---|
| 150x100 | 11 / 18 | 0 / 18 | 2.4 % | 35–66 % |
| 70x210 | 16 / 18 | 0 / 18 | 1.2 % | 31–74 % |
| 100x150 | 12 / 18 | 0 / 18 | 1.3 % | 34–61 % |
| 210x70 | 11 / 18 | 0 / 18 | 2.3 % | 32–60 % |
| 160x160 | 13 / 18 | 0 / 18 | 0.9 % | 34–61 % |
| r5-150x100 | 11 / 18 | 0 / 18 | 2.4 % | 35–66 % |
| r5-100x150 | 12 / 18 | 0 / 18 | 1.3 % | 34–61 % |
| oval-150x80 | 13 / 18 | 0 / 18 | 1.0 % | 35–57 % |
| oval-150x100 | 14 / 18 | 0 / 18 | 0.6 % | 35–57 % |
| ee-180x120 | 11 / 18 | 0 / 18 | 2.6 % | 44–70 % |
| ee-120x180 | 11 / 18 | 0 / 18 | 0.7 % | 50–89 % |

<details><summary>Einzelwerte je Design</summary>

**150x100** (Breite/Höhe/Fläche in % der Platte, Versatz x/y):

| D | vorher | nachher |
|---|---|---|
| D600 | 97/49/47 · +0.1/+0.0  | 96/53/51 · +0.1/-0.6 ok |
| D601 | 44/45/20 · -9.8/+0.2 ⚠ | 80/54/43 · +0.4/-0.2 ok |
| D602 | 36/68/25 · -5.4/-0.4 ⚠ | 81/48/39 · -0.6/-0.7 ok |
| D603 | 73/67/49 · +0.8/+3.7 ⚠ | 79/49/38 · -0.1/+2.4 ok |
| D604 | 74/49/36 · +0.1/+2.8  | 66/66/44 · -0.3/-0.4 ok |
| D605 | 73/20/15 · +0.1/+14.0 ⚠ | 67/53/35 · +0.4/-0.3 ok |
| D606 | 35/56/19 · +0.0/-0.4 ⚠ | 72/70/50 · +0.2/-0.7 ok |
| D620 | 74/50/37 · +0.4/+4.3 ⚠ | 79/48/38 · -0.4/-0.4 ok |
| D621 | 71/72/51 · -0.3/+0.0  | 75/70/52 · -0.2/-0.6 ok |
| D622 | 71/46/33 · +1.5/-1.9  | 77/48/37 · -0.0/-0.2 ok |
| D623 | 77/38/29 · +0.0/-0.4 ⚠ | 78/48/37 · +0.0/-0.4 ok |
| D624 | 67/41/28 · -0.2/-0.2 ⚠ | 80/53/42 · -0.2/-0.2 ok |
| D625 | 74/38/28 · -1.5/-0.2 ⚠ | 81/65/53 · -0.1/-0.6 ok |
| D626 | 47/49/23 · -10.6/+0.0 ⚠ | 78/71/55 · +0.4/-0.6 ok |
| D640 | 97/75/73 · -0.0/-2.4  | 98/59/57 · +0.0/-0.6 ok |
| D641 | 97/55/53 · -0.5/-8.2 ⚠ | 97/56/55 · -0.1/-0.6 ok |
| D660 | 70/50/35 · +1.3/-0.2  | 52/71/36 · -0.2/-0.9 ok |
| D661 | 97/60/58 · -0.4/+0.2  | 94/70/66 · +0.0/-0.9 ok |

**70x210** (Breite/Höhe/Fläche in % der Platte, Versatz x/y):

| D | vorher | nachher |
|---|---|---|
| D600 | 79/29/23 · +0.0/+0.0 ⚠ | 96/77/74 · +0.0/-1.0 ok |
| D601 | 71/17/12 · -1.8/+0.1 ⚠ | 86/36/31 · +0.6/-0.9 ok |
| D602 | 69/35/24 · +3.4/-0.1 ⚠ | 85/54/46 · -0.2/-1.2 ok |
| D603 | 85/65/56 · -0.6/+3.3 ⚠ | 84/59/50 · -0.7/-1.0 ok |
| D604 | 42/56/23 · -0.4/+0.1 ⚠ | 84/81/68 · -1.0/-0.9 ok |
| D605 | 75/47/35 · +0.4/+0.2  | 86/59/51 · +0.2/-0.7 ok |
| D606 | 82/31/26 · +0.0/-0.1 ⚠ | 87/36/31 · +0.2/-1.1 ok |
| D620 | 86/38/32 · +0.0/+0.1  | 84/70/59 · -0.2/-0.9 ok |
| D621 | 84/31/26 · -0.4/-0.1 ⚠ | 86/41/35 · -0.4/-1.0 ok |
| D622 | 84/29/25 · +0.0/+0.1 ⚠ | 86/41/35 · -0.1/-0.9 ok |
| D623 | 84/24/20 · -0.2/-0.2 ⚠ | 86/56/48 · -0.0/-0.9 ok |
| D624 | 65/29/19 · +0.0/+0.0 ⚠ | 85/65/56 · +0.2/-1.0 ok |
| D625 | 81/28/23 · -0.3/+7.1 ⚠ | 84/60/50 · -0.7/-0.9 ok |
| D626 | 80/21/17 · +0.0/+0.0 ⚠ | 87/41/36 · +0.0/-1.0 ok |
| D640 | 96/35/34 · -0.0/-3.1 ⚠ | 92/37/34 · +0.0/-1.0 ok |
| D641 | 85/29/25 · -0.4/-2.7 ⚠ | 91/38/35 · +0.0/-1.0 ok |
| D660 | 78/59/46 · -0.5/-8.7 ⚠ | 87/56/49 · +0.0/-1.2 ok |
| D661 | 95/26/24 · -0.1/+0.1 ⚠ | 95/39/38 · +0.0/-1.2 ok |

**100x150** (Breite/Höhe/Fläche in % der Platte, Versatz x/y):

| D | vorher | nachher |
|---|---|---|
| D600 | 97/35/34 · +0.0/+0.1  | 96/39/38 · -0.0/-1.0 ok |
| D601 | 67/30/20 · -6.2/+0.1 ⚠ | 87/43/38 · +0.5/-0.8 ok |
| D602 | 54/47/26 · -5.7/-0.1 ⚠ | 78/56/44 · -1.1/-1.2 ok |
| D603 | 59/76/45 · -4.2/+0.8 ⚠ | 81/62/50 · -0.4/-1.2 ok |
| D604 | 32/70/23 · -0.4/+0.0 ⚠ | 51/76/39 · -0.4/-1.0 ok |
| D605 | 59/56/33 · +0.2/+0.2  | 64/56/36 · +0.4/-0.8 ok |
| D606 | 54/40/22 · +0.2/-0.1 ⚠ | 86/44/38 · +0.4/-1.2 ok |
| D620 | 83/50/41 · +0.0/+0.0  | 85/72/61 · +0.0/-1.0 ok |
| D621 | 89/47/42 · -0.4/-0.0  | 86/46/40 · -0.4/-1.1 ok |
| D622 | 72/40/29 · +0.0/+0.1 ⚠ | 86/46/40 · +0.0/-1.0 ok |
| D623 | 93/30/28 · -0.0/-0.2 ⚠ | 86/71/61 · -0.2/-0.8 ok |
| D624 | 53/61/32 · +0.0/-4.7 ⚠ | 85/71/61 · +0.0/-1.1 ok |
| D625 | 87/39/33 · -0.2/+7.1 ⚠ | 85/62/53 · -0.4/-0.8 ok |
| D626 | 72/33/23 · -6.2/-0.1 ⚠ | 88/47/41 · +0.0/-1.1 ok |
| D640 | 96/53/51 · -0.0/-2.8  | 98/39/38 · +0.0/-1.1 ok |
| D641 | 96/37/35 · -0.4/-6.1 ⚠ | 93/37/34 · -0.0/-1.1 ok |
| D660 | 59/63/37 · -0.5/-3.5 ⚠ | 86/62/53 · -0.4/-1.2 ok |
| D661 | 97/40/39 · +0.0/+0.0  | 96/44/42 · +0.0/-1.3 ok |

**210x70** (Breite/Höhe/Fläche in % der Platte, Versatz x/y):

| D | vorher | nachher |
|---|---|---|
| D600 | 73/50/37 · -0.1/-4.2 ⚠ | 78/50/39 · -0.2/+0.4 ok |
| D601 | 82/45/36 · +0.3/+11.5 ⚠ | 83/46/39 · +0.4/+0.0 ok |
| D602 | 77/48/37 · -0.5/+6.5 ⚠ | 66/48/32 · -0.2/+0.4 ok |
| D603 | 70/72/51 · -5.1/+4.7 ⚠ | 58/62/36 · -0.1/+0.8 ok |
| D604 | 68/78/53 · +0.0/-1.9  | 61/72/44 · +0.1/+0.4 ok |
| D605 | 81/55/45 · +0.1/+13.4 ⚠ | 76/58/44 · +0.1/+0.4 ok |
| D606 | 62/56/35 · +0.0/+5.7 ⚠ | 83/68/56 · +0.1/+0.0 ok |
| D620 | 69/63/44 · -6.4/+0.8 ⚠ | 59/71/42 · -0.2/+0.8 ok |
| D621 | 74/74/55 · +3.2/-0.8 ⚠ | 75/70/53 · -0.2/-0.4 ok |
| D622 | 62/75/47 · -1.0/-4.2 ⚠ | 57/72/41 · +0.0/+0.4 ok |
| D623 | 66/68/45 · +0.0/+0.8  | 57/70/40 · +0.0/+0.4 ok |
| D624 | 67/72/48 · -5.9/-0.4 ⚠ | 53/72/38 · -0.1/+0.4 ok |
| D625 | 63/61/38 · -2.6/-0.4  | 45/71/32 · +0.0/+0.1 ok |
| D626 | 70/50/35 · -0.1/+0.4  | 84/59/49 · -0.1/+0.8 ok |
| D640 | 78/82/64 · -0.6/+0.0  | 69/71/49 · +0.0/+2.3 ok |
| D641 | 75/54/41 · +2.1/-3.1 ⚠ | 96/56/54 · +0.0/+1.5 ok |
| D660 | 79/77/61 · +0.7/+0.0  | 78/72/57 · -0.2/+0.0 ok |
| D661 | 96/68/65 · +0.0/+0.8  | 85/71/60 · -0.9/-0.8 ok |

**160x160** (Breite/Höhe/Fläche in % der Platte, Versatz x/y):

| D | vorher | nachher |
|---|---|---|
| D600 | 95/43/41 · -0.0/+0.1  | 97/49/48 · +0.0/-0.2 ok |
| D601 | 55/40/22 · -5.4/+0.2 ⚠ | 81/61/49 · +0.5/-0.4 ok |
| D602 | 46/59/27 · -4.5/-0.2 ⚠ | 70/77/54 · -0.9/-0.7 ok |
| D603 | 75/45/34 · +0.9/+2.4  | 65/76/49 · -0.4/-0.6 ok |
| D604 | 75/33/25 · +0.1/+6.7 ⚠ | 80/52/42 · -0.4/-0.5 ok |
| D605 | 75/15/11 · +0.0/+12.7 ⚠ | 57/76/44 · +0.4/-0.1 ok |
| D606 | 39/41/16 · +0.2/-0.1 ⚠ | 72/47/34 · +0.2/-0.6 ok |
| D620 | 76/40/31 · +0.4/+6.3 ⚠ | 79/76/60 · +0.0/-0.4 ok |
| D621 | 76/56/42 · -0.3/+0.1  | 80/65/52 · -0.5/-0.5 ok |
| D622 | 79/37/29 · +4.7/-1.4 ⚠ | 80/65/52 · -0.1/-0.4 ok |
| D623 | 75/34/26 · +0.0/-0.2 ⚠ | 67/76/51 · -0.1/-0.2 ok |
| D624 | 73/34/25 · +1.5/-0.1 ⚠ | 64/77/49 · +0.0/-0.5 ok |
| D625 | 74/46/34 · +0.0/+8.2 ⚠ | 79/77/61 · -0.2/-0.4 ok |
| D626 | 57/39/23 · -6.6/+0.0 ⚠ | 81/66/53 · +0.0/-0.5 ok |
| D640 | 96/63/61 · +0.0/-2.6  | 96/54/52 · -0.1/-0.5 ok |
| D641 | 93/47/44 · +0.0/-5.0 ⚠ | 93/52/48 · +0.0/-0.6 ok |
| D660 | 72/40/29 · +1.2/+0.0 ⚠ | 78/77/60 · -0.4/-0.6 ok |
| D661 | 97/48/47 · -0.3/+0.1  | 92/59/54 · -0.0/-0.9 ok |

**r5-150x100** (Breite/Höhe/Fläche in % der Platte, Versatz x/y):

| D | vorher | nachher |
|---|---|---|
| D600 | 97/49/47 · +0.1/+0.2  | 96/54/52 · +0.1/-0.4 ok |
| D601 | 44/45/20 · -9.8/+0.2 ⚠ | 80/54/43 · +0.4/-0.2 ok |
| D602 | 36/68/25 · -5.4/-0.2 ⚠ | 81/48/39 · -0.6/-0.5 ok |
| D603 | 73/67/49 · +0.8/+3.7 ⚠ | 79/49/38 · -0.1/+2.4 ok |
| D604 | 74/49/36 · +0.1/+3.0  | 66/66/44 · -0.3/-0.2 ok |
| D605 | 73/20/15 · +0.1/+14.0 ⚠ | 67/53/35 · +0.4/-0.3 ok |
| D606 | 35/56/20 · +0.0/-0.2 ⚠ | 72/70/51 · +0.2/-0.6 ok |
| D620 | 74/50/37 · +0.4/+4.3 ⚠ | 79/48/38 · -0.4/-0.4 ok |
| D621 | 71/72/51 · -0.3/+0.2  | 75/70/52 · -0.2/-0.4 ok |
| D622 | 71/46/33 · +1.5/-1.9  | 77/48/37 · -0.0/-0.2 ok |
| D623 | 77/38/29 · +0.0/-0.2 ⚠ | 78/48/37 · +0.0/-0.2 ok |
| D624 | 67/41/28 · -0.2/-0.2 ⚠ | 80/53/42 · -0.2/-0.2 ok |
| D625 | 74/38/28 · -1.5/+0.0 ⚠ | 81/65/53 · -0.1/-0.4 ok |
| D626 | 47/49/23 · -10.6/+0.0 ⚠ | 78/71/55 · +0.4/-0.6 ok |
| D640 | 97/75/73 · -0.0/-2.2  | 98/59/58 · +0.0/-0.4 ok |
| D641 | 97/55/53 · -0.5/-8.2 ⚠ | 97/56/55 · -0.1/-0.6 ok |
| D660 | 70/51/36 · +1.3/+0.0  | 52/71/37 · -0.2/-0.7 ok |
| D661 | 97/60/58 · -0.4/+0.2  | 94/70/66 · +0.0/-0.9 ok |

**r5-100x150** (Breite/Höhe/Fläche in % der Platte, Versatz x/y):

| D | vorher | nachher |
|---|---|---|
| D600 | 97/35/34 · +0.0/+0.1  | 96/39/38 · -0.0/-1.0 ok |
| D601 | 67/30/20 · -6.2/+0.1 ⚠ | 87/43/38 · +0.5/-0.8 ok |
| D602 | 54/47/26 · -5.7/-0.1 ⚠ | 78/56/44 · -1.1/-1.2 ok |
| D603 | 59/76/45 · -4.2/+0.8 ⚠ | 81/62/50 · -0.4/-1.2 ok |
| D604 | 32/70/23 · -0.4/+0.0 ⚠ | 51/76/39 · -0.4/-1.0 ok |
| D605 | 59/56/33 · +0.2/+0.2  | 64/56/36 · +0.4/-0.8 ok |
| D606 | 54/40/22 · +0.2/-0.1 ⚠ | 86/44/38 · +0.4/-1.2 ok |
| D620 | 83/50/41 · +0.0/+0.0  | 85/72/61 · +0.0/-1.0 ok |
| D621 | 89/47/42 · -0.4/-0.0  | 86/46/40 · -0.4/-1.1 ok |
| D622 | 72/40/29 · +0.0/+0.1 ⚠ | 86/46/40 · +0.0/-1.0 ok |
| D623 | 93/30/28 · -0.0/-0.2 ⚠ | 86/71/61 · -0.2/-0.8 ok |
| D624 | 53/61/32 · +0.0/-4.7 ⚠ | 85/71/61 · +0.0/-1.1 ok |
| D625 | 87/39/33 · -0.2/+7.1 ⚠ | 85/62/53 · -0.4/-0.8 ok |
| D626 | 72/33/23 · -6.2/-0.1 ⚠ | 88/47/41 · +0.0/-1.1 ok |
| D640 | 96/53/51 · -0.0/-2.8  | 98/39/38 · +0.0/-1.1 ok |
| D641 | 96/37/35 · -0.4/-6.1 ⚠ | 93/37/34 · -0.0/-1.1 ok |
| D660 | 59/63/37 · -0.5/-3.5 ⚠ | 86/62/53 · -0.4/-1.2 ok |
| D661 | 97/40/39 · +0.0/+0.0  | 96/44/42 · +0.0/-1.3 ok |

**oval-150x80** (Breite/Höhe/Fläche in % der Platte, Versatz x/y):

| D | vorher | nachher |
|---|---|---|
| D600 | 54/61/33 · +0.0/+0.2  | 64/70/45 · +0.0/+0.2 ok |
| D601 | 75/26/20 · +0.2/+9.6 ⚠ | 72/61/43 · +0.4/+0.0 ok |
| D602 | 75/34/25 · -0.2/+3.5 ⚠ | 65/70/46 · -0.2/+0.2 ok |
| D603 | 64/52/33 · +4.7/+3.3 ⚠ | 69/50/35 · -0.1/+1.0 ok |
| D604 | 74/54/40 · +0.0/-2.1  | 59/73/43 · -0.2/+0.2 ok |
| D605 | 73/31/22 · +0.1/+10.8 ⚠ | 68/68/46 · +0.4/+0.0 ok |
| D606 | 27/53/14 · +0.0/-0.2 ⚠ | 60/73/43 · +0.2/-0.5 ok |
| D620 | 70/42/30 · +2.3/+2.1 ⚠ | 78/59/46 · -0.2/+0.0 ok |
| D621 | 39/52/20 · -0.2/+0.0 ⚠ | 61/72/44 · -0.3/+0.0 ok |
| D622 | 57/46/26 · -1.0/-1.4 ⚠ | 68/53/36 · -0.0/+0.0 ok |
| D623 | 47/38/18 · -0.1/-0.6 ⚠ | 73/56/41 · -0.1/+0.2 ok |
| D624 | 57/37/21 · -0.5/+0.0 ⚠ | 71/59/42 · -0.2/+0.2 ok |
| D625 | 60/37/22 · -2.6/-0.2 ⚠ | 68/68/46 · -0.1/-0.2 ok |
| D626 | 37/49/18 · +0.2/-0.2 ⚠ | 62/72/45 · +0.4/+0.0 ok |
| D640 | 55/62/34 · +0.0/-0.5  | 66/74/49 · +0.0/+0.0 ok |
| D641 | 60/62/37 · -0.0/+0.0  | 80/71/57 · -0.0/-0.2 ok |
| D660 | 66/47/31 · +3.0/-0.2 ⚠ | 80/45/36 · -0.2/-0.2 ok |
| D661 | 53/61/32 · +0.0/+0.5  | 59/72/42 · -0.1/-0.7 ok |

**oval-150x100** (Breite/Höhe/Fläche in % der Platte, Versatz x/y):

| D | vorher | nachher |
|---|---|---|
| D600 | 53/58/31 · +0.0/+0.2  | 73/64/47 · +0.0/+0.4 ok |
| D601 | 75/21/16 · +0.2/+12.4 ⚠ | 79/53/42 · +0.5/+0.0 ok |
| D602 | 75/24/18 · -0.4/+8.6 ⚠ | 73/63/46 · -0.3/+0.2 ok |
| D603 | 65/54/35 · +4.9/+3.3 ⚠ | 76/47/36 · -0.1/-0.4 ok |
| D604 | 72/43/31 · +0.1/+3.9 ⚠ | 69/69/48 · -0.4/+0.2 ok |
| D605 | 74/24/18 · +0.1/+12.8 ⚠ | 76/61/46 · +0.4/+0.2 ok |
| D606 | 35/55/19 · +0.0/-0.2 ⚠ | 70/69/48 · +0.2/+0.0 ok |
| D620 | 70/42/30 · +2.3/+2.2 ⚠ | 79/48/38 · -0.4/+0.3 ok |
| D621 | 48/52/25 · -0.4/+0.0 ⚠ | 69/66/45 · -0.3/+0.0 ok |
| D622 | 69/45/31 · +0.5/-1.3 ⚠ | 76/47/35 · +0.0/+0.4 ok |
| D623 | 59/38/22 · +0.0/-0.2 ⚠ | 79/48/38 · -0.1/+0.3 ok |
| D624 | 62/37/23 · +2.1/+0.0 ⚠ | 79/53/42 · -0.2/+0.4 ok |
| D625 | 73/36/27 · -2.1/+0.0 ⚠ | 75/60/45 · -0.1/+0.0 ok |
| D626 | 46/49/23 · +0.2/+0.1 ⚠ | 70/65/46 · +0.2/+0.0 ok |
| D640 | 57/63/35 · +0.2/-0.4  | 79/71/56 · -0.0/+0.2 ok |
| D641 | 59/60/36 · -0.2/-0.4  | 90/64/57 · +0.0/+0.0 ok |
| D660 | 66/47/31 · +3.2/+0.0 ⚠ | 53/73/39 · -0.2/+0.0 ok |
| D661 | 52/60/31 · -0.0/+0.6  | 75/72/54 · -0.0/-0.6 ok |

**ee-180x120** (Breite/Höhe/Fläche in % der Platte, Versatz x/y):

| D | vorher | nachher |
|---|---|---|
| D600 | 80/59/47 · -7.5/+0.4 ⚠ | 95/70/67 · -0.4/+0.0 ok |
| D601 | 55/56/31 · -6.7/+0.4 ⚠ | 94/55/52 · -0.1/-0.4 ok |
| D602 | 41/77/32 · -2.8/-0.0  | 94/47/44 · +0.1/-0.2 ok |
| D603 | 77/66/51 · +0.9/+3.8 ⚠ | 94/50/47 · -0.1/+2.6 ok |
| D604 | 79/52/41 · +0.1/+1.3  | 94/71/66 · +0.0/-0.4 ok |
| D605 | 78/26/20 · +0.1/+12.5 ⚠ | 94/65/61 · +0.0/+0.0 ok |
| D606 | 35/56/20 · +0.0/-0.2 ⚠ | 94/70/66 · +0.0/-0.6 ok |
| D620 | 78/50/39 · +0.4/+4.5 ⚠ | 94/49/46 · +0.0/+0.0 ok |
| D621 | 71/72/51 · -0.2/+0.4  | 94/70/65 · +0.1/-0.2 ok |
| D622 | 73/47/34 · +0.4/-2.1  | 94/50/47 · +0.0/-0.2 ok |
| D623 | 81/38/31 · +0.1/+0.0 ⚠ | 94/50/47 · +0.0/+0.0 ok |
| D624 | 70/41/29 · -1.4/-0.2 ⚠ | 94/55/51 · +0.0/-0.2 ok |
| D625 | 76/38/29 · -2.5/+0.0 ⚠ | 94/65/61 · +0.0/-0.4 ok |
| D626 | 47/49/23 · -12.7/+0.2 ⚠ | 94/71/66 · +0.0/-0.4 ok |
| D640 | 97/75/73 · -0.0/-2.2  | 98/72/70 · -0.0/-0.4 ok |
| D641 | 94/65/60 · -0.1/-3.2 ⚠ | 95/70/66 · +0.0/-0.4 ok |
| D660 | 74/50/37 · +1.1/+0.2  | 94/71/66 · +0.0/-0.6 ok |
| D661 | 96/60/57 · -0.2/+0.2  | 95/70/66 · +0.0/-0.9 ok |

**ee-120x180** (Breite/Höhe/Fläche in % der Platte, Versatz x/y):

| D | vorher | nachher |
|---|---|---|
| D600 | 92/42/39 · -0.0/+0.0  | 92/94/86 · +0.0/+0.0 ok |
| D601 | 70/33/23 · -5.5/+0.1 ⚠ | 86/93/80 · +0.7/-0.1 ok |
| D602 | 61/54/33 · -2.2/-0.2  | 85/94/79 · +0.0/-0.1 ok |
| D603 | 61/78/47 · -3.5/+1.5 ⚠ | 85/94/80 · -0.5/+0.0 ok |
| D604 | 32/70/23 · -0.4/+0.0 ⚠ | 53/94/50 · -0.4/+0.0 ok |
| D605 | 59/63/37 · +0.2/+0.2  | 76/93/71 · +0.2/-0.1 ok |
| D606 | 54/40/22 · +0.2/-0.1 ⚠ | 86/93/81 · +0.4/-0.1 ok |
| D620 | 83/50/41 · +0.0/+0.0  | 85/94/79 · +0.0/+0.0 ok |
| D621 | 91/47/43 · -0.5/+0.0  | 86/94/80 · -0.5/+0.0 ok |
| D622 | 72/40/29 · +0.0/+0.1 ⚠ | 86/93/81 · +0.0/-0.1 ok |
| D623 | 94/30/28 · -0.0/-0.2 ⚠ | 86/93/80 · -0.2/-0.1 ok |
| D624 | 53/63/33 · +0.0/-5.7 ⚠ | 85/93/80 · +0.0/-0.1 ok |
| D625 | 89/39/34 · -0.2/+7.1 ⚠ | 84/93/79 · -0.5/-0.1 ok |
| D626 | 72/33/24 · -7.1/-0.1 ⚠ | 87/93/82 · +0.2/-0.1 ok |
| D640 | 96/54/52 · -0.2/-2.7  | 95/94/89 · -0.4/-0.1 ok |
| D641 | 91/43/39 · +0.0/-3.0 ⚠ | 89/94/83 · -0.0/+0.0 ok |
| D660 | 59/65/38 · -0.7/-4.5 ⚠ | 85/94/80 · -0.7/+0.0 ok |
| D661 | 94/40/38 · -0.0/+0.0  | 92/94/86 · -0.2/+0.0 ok |
</details>

## Wichtigste Änderungen
- **D601 Amselweg 13 und D626 Voss:** mittig statt linksbündig. Im Hochformat und im Quadrat trennt eine Zierlinie Straße und Nummer.
- **D605 Wiesenbach und D604 Seeblick:** zweizeilig. D605 zeigt Haus und Straße, darunter die große Nummer. D604 zeigt den Leuchtturm neben „Seeblick“, darunter „26“.
- **D602 ASTWEG:** im Querformat zweizeilig, darunter „Ankerplatz von Familie Reiter“. Auf dem Oval steht „Anker ASTWEG“ über der großen 11.
- **D625:** Der Hund ist größer und neben „mit Benno“ eingebunden. Im Hochformat steht er groß unter dem Text.
- **D623:** Text größer. Im Hochformat und im Quadrat ist der Name gestapelt: „Familie“ über „Brandt“ im selben Feld, also nur ein Zeilenumbruch.
- **D660 Monogramm:** Auf 3:2, Quadrat und hohem Oval gestapelt, Ring oben.
- **D600 auf 7×21:** von feinen Linien bis zum Rand eingerahmt.
- **D603 und D641:** leichte optische Höhenkorrektur, weil die feinen Pustefedern und die Horizontlinie die Gruppe sonst verschieben.

## Grenzen / offene Punkte
1. **Konfi-Schrift höchstens 100 mm:** Auf Reihen bis 2,8-fach (15×10 → 42×28) steht die Nummer bei D600, D601 und D605 schon an dieser Grenze. Größer geht sie nur, wenn die großen Größen wegfallen oder der Konfi größere Schrift erlaubt.
2. **Freigaben:** Alle Ziele waren freigegeben und bleiben es, wie Claude es vorgegeben hat. Der Inhalt hat sich geändert, deshalb bitte die Bögen ansehen, bevor live gestellt wird. Das Dashboard würde Freigaben bei Inhaltsänderungen sonst auf „offen“ setzen.
3. **Senkrechter Text:** Die native Vorschau dreht ihn weiterhin gespiegelt (gerade getestet), deshalb gibt es keine senkrechte Straße im Hochformat.
4. **7×21:** Kurze Zweiwort-Designs wie D601 bleiben luftiger (Fläche 31 %), weil die Nummer schon die ganze Breite nutzt.

## Selbstprüfung (Augenmaß)
- Ich habe alle 11 Bögen einzeln angesehen.
- Stark: D600, D602, D604, D605, D606, D622, D624, D625, D640, D641, D660, D661.
- Schwächer:
  - D621: Great Vibes ist fein, auf großen Platten wirkt es zart.
  - D603: Die Pusteblume-Federn sind sehr fein.
  - D620 im Hochformat: großer Abstand zwischen Haus und Name.
  - D626 im Querformat: „Willkommen“ ist sehr breit.
