# Pferdeschilder überarbeitet: einfache Schilder (Issue #114)

Unterkategorie-Chat Pferdeschilder (Claude), 02.11.2026, nach Neustart. Katalog-Branch `dev/pferdeschilder-fertig-20261101` (Basis Katalog-main inkl. Regel §7 Freiflächen). Alle Freigaben `null`. Nichts importiert, nichts live.

## Auftrag (Chris, 01.11.2026)
„Zu große Designs. Ähnlich wie die jetzigen Andenken sollen es einfache Schilder sein. Mit Brandzeichen, Strichen, keine riesigen Designs, da die Gravurzeit zu lange dauert.“

Umsetzung nach Design-Master §7/§8:
- Pferdename ist das größte Element, darunter 1–2 kleine Zeilen (Rasse, Jahr, Besitzer).
- Gestaltung mit Brandzeichen oder Strichen, höchstens ein kleines Motiv (Hufeisen, Pferdekopf als Kontur, Hufspur). Keine Füllfläche über 15 %, keine Fotofelder.
- Linien mindestens 0,55 mm. Auf Rechteck bis an den Rand, auf Oval/Rund/Abgerundet/Retro bis knapp an die Kontur.
- **Neu (§7, 02.11.):** Text und Motiv stehen als Gruppe mittig. Jede Form hat eine eigene Anordnung (Streifen nebeneinander, 8 × 5/Oval/Retro mit 2–3 Zeilen, Quadrat/Rund gestapelt).
- Beispielnamen erfunden, je Design verschieden.

## Kontaktbögen
Native Konfi-Zielvorschau, kleinste Größe je Design, ohne Bohrung (blau = neu, gold = Signature). Markierte Messbilder liegen unter `messung/`.

| Formatreihe | Bogen |
|---|---|
| Boxenschild 8 × 5 (BS-V2A) | [boxenschilder-gravur-80x53.jpg](boxenschilder-gravur-80x53.jpg?raw=true) |
| Boxenschild Oval 15 × 8 (BS-V2A) | [boxenschilder-gravur-oval-150x80.jpg](boxenschilder-gravur-oval-150x80.jpg?raw=true) |
| 5 × 2 | [edelstahl-gravur-50x20.jpg](edelstahl-gravur-50x20.jpg?raw=true) |
| 6 × 2 | [edelstahl-gravur-60x20.jpg](edelstahl-gravur-60x20.jpg?raw=true) |
| 7 × 2 | [edelstahl-gravur-70x23.jpg](edelstahl-gravur-70x23.jpg?raw=true) |
| 8 × 2 | [edelstahl-gravur-80x20.jpg](edelstahl-gravur-80x20.jpg?raw=true) |
| 8 × 3,5 | [edelstahl-gravur-80x35.jpg](edelstahl-gravur-80x35.jpg?raw=true) |
| 9 × 3 | [edelstahl-gravur-90x30.jpg](edelstahl-gravur-90x30.jpg?raw=true) |
| Oval 12 × 4 | [edelstahl-gravur-oval-120x40.jpg](edelstahl-gravur-oval-120x40.jpg?raw=true) |
| Abgerundet 8 × 5 | [edelstahl-gravur-ab-80x53.jpg](edelstahl-gravur-ab-80x53.jpg?raw=true) |
| Retro 1 | [edelstahl-gravur-retro1-90x60.jpg](edelstahl-gravur-retro1-90x60.jpg?raw=true) |
| Retro 2 | [edelstahl-gravur-retro2-91x61.jpg](edelstahl-gravur-retro2-91x61.jpg?raw=true) |
| Oval 9 × 6 | [edelstahl-gravur-oval-90x60.jpg](edelstahl-gravur-oval-90x60.jpg?raw=true) |
| Quadrat 8 × 8 | [edelstahl-gravur-80x80.jpg](edelstahl-gravur-80x80.jpg?raw=true) |
| Rund 6,5 | [edelstahl-gravur-65x65-rund.jpg](edelstahl-gravur-65x65-rund.jpg?raw=true) |

## Designs D700–D711
Ein Master je Formatreihe, nativ für alle Größen der Reihe. Ziele: Edelstahl und Acryl 3 mm schwarz/anthrazit.

| Nr. | Name | Modus / Vorlage | Schriften | Motiv | Reihen |
|---|---|---|---|---|---|
| D700 | Amira · Hufeisen | neu (Andenken-Aufbau) | Great Vibes + Lato | `pferde/hufeisen-2.svg` | alle 15 |
| D701 | Balou · Brand Hannoveraner mit Linie | neu | Cinzel + Lora | `brandzeichen/hannoveraner-warmblut.svg`, Strich vom Rand bis zum Brand | alle 15 |
| D702 | Fiete · Doppellinien | neu | Playfair Display + Josefin Sans | nur Striche (Doppellinien bis an den Rand, auf Streifen einfach) | alle 15 |
| D703 | Merle · Hufspur | neu | Kaushan Script + Roboto Slab | `pferde/hufabdrucke.svg` | 11, erst ab 9 × 6 cm |
| D704 | Caruso · Boxennummer | neu | Bebas Neue + Roboto Condensed | senkrechter Strich (Quadrat/Rund waagerecht) | alle 15 |
| D705 | Nuvola · Brand Trakehner | neu | Alex Brush + Raleway | `brandzeichen/trakehner.svg` | alle 15 |
| D706 | Dakota · Western | neu | Rye + Special Elite | `brandzeichen/pinto.svg`, Strich unter dem Namen | alle 15 |
| D707 | Quintana · Jahr senkrecht | neu | Parisienne + Raleway | senkrechter Strich, Jahr senkrecht an der Kante (§8) | alle 15 |
| D708 ★ | Signature · Sir Lennox | neu | Cormorant Garamond + Montserrat Light | `brandzeichen/westfale.svg` klein in einer Linie bis an den Rand | alle 15 |
| D709 ★ | Signature · Valentina | neu | Italianno + Bellefair | `pferde/pferdekopf-4.svg` (Kontur), Linie bis an den Rand | 11, erst ab 9 × 6 cm |
| D710 | Queenie · Brand Holsteiner | **Referenz** `designs/bestand/boxenschilder/Tiere/Pferd/BS-A-D7` | Parisienne + Comfortaa (wie Vorlage) | `brandzeichen/holsteiner.svg`, `linien-mit-verzierungen/linie-mit-endpunkten.svg` | 11 (nicht 5–8 × 2) |
| D711 ★ | Signature · Lucky – Name in der Linie | neu | Libre Baskerville + Caviar Dreams | zwei feine Linien links/rechts vom Namen bis an den Rand, `pferde/hufeisen-2.svg` klein darüber (nicht auf Streifen) | alle 15 |

D710 übernimmt von der Vorlage Name, Schriften, Brandzeichen und Zierlinie, vereinfacht nach Issue #114 (ohne Fotofeld, Tierarzt, Hufschmied, Telefon). Die übrigen Bestandsvorlagen (`BS-A-D2`, `BSUV-A-D20/21/29/30`, `BSUV-AD-D28`, `BSUV-A-D10`) haben viel Text, große Pferdesilhouetten oder Fotofelder und passen nicht zu „einfach“.

**Ordner:** Rechteck 8 × 5 und Oval 15 × 8 liegen nur in den Boxenschild-Ordnern (`BS-V2A-…`), nicht zusätzlich in `edelstahl-gravur-80x53`/`-oval-150x80` – sonst stünde dieselbe Platte doppelt im Konfi.

## Inventur Pferdeschilder (angebotene Designs, ohne `nichtAngeboten`)

| Formatreihe | vorher (main) | nachher | je Größe |
|---|---|---|---|
| Boxenschild 8 × 5 | 9 (alt, Issue 85) | 21 (davon 12 neu, 3 Signature) | 8 × 5: 19, ab 9 × 6: 21 |
| Boxenschild Oval 15 × 8 | 4 (alt) | 16 (12 neu, 3 Sig.) | alle Größen 16 |
| 5 × 2 / 6 × 2 / 7 × 2 / 8 × 2 | 0 | je 9 (2 Sig.) | je 9 |
| 8 × 3,5 | 0 | 12 (3 Sig.) | 8 × 3,5: 10, ab 12 × 5,25: 12 |
| 9 × 3 | 0 | 12 (3 Sig.) | 9 × 3 und 12 × 4: 10, ab 15 × 5: 12 |
| Oval 12 × 4 | 0 | 12 (3 Sig.) | 12 × 4: 10, ab 15 × 5: 12 |
| Abgerundet 8 × 5 | 0 | 12 (3 Sig.) | 8 × 5: 10, ab 9 × 6: 12 |
| Retro 1 / Retro 2 / Oval 9 × 6 | 0 | je 12 (3 Sig.) | alle Größen 12 |
| Quadrat 8 × 8 | 0 | 12 (3 Sig.) | alle Größen 12 |
| Rund 6,5 | 0 | 12 (3 Sig.) | 6,5: 10, ab 8,5: 12 |

Ziel erfüllt: jede Formatreihe und jede Größe ≥ 8 Designs, überall mindestens 2 Signature (D708, D711).

## Freiflächen-Messung (§7, `flaeche-messen.py`, je Bogen)

| Bogen | Designs | ok | Fläche der Gruppe | größter Versatz |
|---|---|---|---|---|
| boxenschilder-gravur-80x53 | 12 | 10 | 40–83 % | 3,6 % |
| boxenschilder-gravur-oval-150x80 | 12 | 9 | 32–71 % | 6,4 % |
| edelstahl-gravur-50x20 | 9 | 9 | 53–85 % | 2,4 % |
| edelstahl-gravur-60x20 | 9 | 9 | 51–85 % | 2,5 % |
| edelstahl-gravur-65x65-rund | 12 | 12 | 31–57 % | 0,4 % |
| edelstahl-gravur-70x23 | 9 | 9 | 49–84 % | 2,3 % |
| edelstahl-gravur-80x20 | 9 | 9 | 47–85 % | 2,5 % |
| edelstahl-gravur-80x35 | 12 | 11 | 45–85 % | 2,8 % |
| edelstahl-gravur-80x80 | 12 | 12 | 36–58 % | 0,3 % |
| edelstahl-gravur-90x30 | 12 | 10 | 45–82 % | 4,9 % |
| edelstahl-gravur-ab-80x53 | 12 | 11 | 45–87 % | 2,6 % |
| edelstahl-gravur-oval-120x40 | 12 | 9 | 35–67 % | 7,2 % |
| edelstahl-gravur-oval-90x60 | 12 | 10 | 39–69 % | 7,0 % |
| edelstahl-gravur-retro1-90x60 | 12 | 9 | 31–73 % | 7,2 % |
| edelstahl-gravur-retro2-91x61 | 12 | 9 | 30–71 % | 6,2 % |

Gesamt 168 Platten: 148 ok, 20 mit Hinweis (Einzelwerte in `messung/messwerte.txt`). Vorher (Vorgänger-Bögen) 47 Hinweise. Begründung der verbleibenden 20:
- **D701 (8×) und D709 (8×), waagerecht 3–7 %:** gewollte Linie, die nur auf einer Seite bis an den Rand läuft (§7 „Linien bis zum Rand“). Text und Motiv ohne Linie stehen mittig; die Messung zählt die Linie mit.
- **D709 senkrecht 4–5 %, D711 senkrecht 4 % (9 × 3, Oval 12 × 4), D710 senkrecht 5 % (Boxenschild/Abgerundet 8 × 5):** Messfehler durch feine Striche (Hals des Pferdekopfs, kleines Hufeisen, Brandkrone), die unter der 0,2-%-Grenze des Werkzeugs liegen. Geometrisch steht die Gruppe auf 0,0 %.
- **D706 auf Retro 1/2, Höhe 43 %:** Die festen Retro-Bohrungen begrenzen die Breite, daher kein größerer Brand möglich (Richtwert ca. 45 %).
- **D707 auf Oval 15 × 8, waagerecht 3,1 %:** knapp über dem Richtwert, optisch ausgewogen.

## Startdesign-Vorschlag
**D700 „Amira · Hufeisen“** als Platz 1 in allen Reihen. Man erkennt es sofort als Pferdeschild, das Hufeisen gilt als Glückssymbol, es funktioniert vom 5 × 2-Streifen bis Rund gleich gut, und die Gravurfläche ist klein. Für die Boxenschild-Ordner wäre **D704 „Caruso · Boxennummer“** die Alternative.

## Offene Fragen an Chris / Operator
1. **13 alte Boxenschilder auf main** (Issue 85: Futterplan, Mehrgenerationen, große Pferdesilhouetten) tragen weiter das Thema `pferdeschilder` und stehen im Konfi. Nach „zu große Designs“ sollten sie vermutlich `nichtAngeboten` bekommen. Nicht angefasst (fremde Designs).
2. **Brandzeichen der Zuchtverbände** (Hannoveraner, Trakehner, Westfale, Holsteiner, Pinto) stammen aus `motive/brandzeichen/`. Markenrechtlich nicht geprüft.
3. **Senkrechter Text im Konfi:** Der Konfi dreht senkrechten Text nicht um den Ankerpunkt, sondern um einen Punkt 0,35 × Schriftgröße darüber. Die Grundlinie liegt dann 0,35 × Schriftgröße seitlich daneben (gilt auch für freigegebene Designs wie D161). D707 ist darauf eingestellt. Wenn der Konfi korrigiert wird, rückt das Jahr bei D707 um ca. 1,5 mm.
4. **Retro 2:** „Seitenverhältnis weicht um 1,5 % ab“ gilt für die ganze Reihe (Master 90,6 × 61,3 mm), kein Fehler dieser Designs.

## Selbstprüfung (jeder Bogen im nativen Bild angesehen)
- **Stark:** D711 (ruhig, edel, auf allen Formen), D708, D704 (klar Stallbox), D700, D702, D707 (Jahr jetzt sauber neben dem Strich).
- **Gut:** D701, D705, D706 (Western, auf 8 × 5 jetzt zweizeilig und größer), D710 (vereinfachte Referenz).
- **Schwächer:** D703 Hufspur wirkt auf Quadrat/Rund klein und oben gedrängt; D709 auf schmalen Ovalen mit kleinem Kopf; D700 auf 8 × 5 mit eher kleinem Hufeisen neben dem großen Namen. Diese zuerst nachschärfen, wenn Chris strenger urteilt.
- Passung: alle 168 Master „passt“ für Edelstahl, alle Master auch für Acryl schwarz/anthrazit ohne Befund (336 Prüfungen). Nur Hinweise zu Bohrungen bzw. Retro-2-Seitenverhältnis.
- Keine Bilder/PNG im Katalog, nur design.json/design.svg/index.json. Keine neuen Motive.

## Technik
- Generator außerhalb der Repos: Anordnung je Konzept und Formklasse mit echter Tintenbox (fontTools). Danach zentriert ein Nachlauf jede Gruppe auf der Platte (§7); Linien bis an den Rand behalten ihr Randende. Anschließend wurden alle Designs in der nativen Zielvorschau geprüft. Meldete der Konfi „ragt über die Fläche“, wurde nur dieses Textfeld verkleinert.
- Neustart: Die nicht committete Arbeit des Vorgängers (22 Master) bestand die Vorschau und wurde übernommen. Nichts wurde gestasht.
