# Monogramme Schiefer ab 22 × 14 – Bericht (Issue #116, 02.11.2026)

Katalog-Branch `dev/monogramme-fertig-20261101`, Kontaktbögen in diesem Ordner (native Konfi-Zielvorschau, ohne Bohrlöcher, Original klein daneben).

## Inventur
| Formatreihe (Ordner) | Familie(n) | vorher | nachher |
|---|---|---|---|
| `monogramme-schiefer-22x14` | gedenktafel-22x14-schiefer-natur | 0 | 10 (6 Bestand, 4 neu) |
| `monogramme-schiefer-30x20` | gedenktafel-30x20-schiefer-natur, -premium | 0 | 10 (6 Bestand, 4 neu) |

Bestand `designs/bestand/monogramme/`: 78 Schiefer-Designs = 3 Corel-Bögen × 26 Buchstaben (MG-S Kalligrafie-Split, MG2-S Pinsel-Split, MG3-S Initial über Rahmen), je 22 × 14 und 30 × 20 (30 × 20 nicht extrahiert). Dubletten (gleicher Aufbau, anderer Buchstabe) nur in Auswahl übernommen. MGH-V2A (Edelstahl-Herz) gehört nicht zu Schiefer.
Weitere Schiefer-Größen ab 22 × 14 (z. B. 40 × 30, 40 × 20, 60 × 30) haben im Katalog keine Familie – Mikas Branches haben nur Formatreihen mit „Familienbindung offen“.

## Designs (gleiche D-Nummer = gleiches Design in beiden Größen)
| D | Name | Modus / Vorlage | Schriften | Motiv |
|---|---|---|---|---|
| MG-S-D13 | Split-Monogramm M · Mendel | 1:1 MG-S-D13 | Cinzel | Buchstabe + Linien aus Bogen (Kurven) |
| MG-S-D19 | Split-Monogramm S · Sörens | 1:1 MG-S-D19 | Cinzel | dto. |
| MG-S-D8 | Split-Monogramm H · Heidemann | 1:1 MG-S-D8 | Cinzel | dto. |
| MG2-S-D18 | Split-Monogramm R · Rudolph (Pinsel) | 1:1 MG2-S-D18 | Cinzel | dto. |
| MG2-S-D2 | Split-Monogramm B · Baumann (Pinsel) | 1:1 MG2-S-D2 | Cinzel | dto. |
| MG3-S-D13 | Initial über Rahmen · M · Moser | Referenz MG3-S-D13 | Playfair Display (statt Ballet Harmony), Cinzel | Rahmenlinie aus Bogen |
| D1600 | Lorbeerkranz · F · Falkenberg seit 2026 | neu | Cinzel, Cormorant Garamond | motive-eigene/monogramme/lorbeerkranz.svg |
| D1601 | Initial & Linie · K · Familie Kessler | neu | Magnolia Script, Cormorant Garamond, Playfair Display, Montserrat Light | feine senkrechte Linie |
| D1602 | Paar-Monogramm · L & J · Lena & Jonas | neu | Cinzel Decorative, Great Vibes, Montserrat Light | zwei Linien bis an den Rand |
| D1603 | Art déco · B in Doppelraute · Brandt | neu | Poiret One, Cormorant Garamond | motive-eigene/monogramme/doppelraute.svg + Linien bis an den Rand |

30 × 20: Corel-Fassung nicht extrahiert → 22 × 14-Master gleichmäßig ×1,364 skaliert und mittig eingepasst; neue Designs je Größe eigens proportioniert (Schriftgröße höchstens 100 mm).

## Prüfung
- Native Zielvorschau: alle 20 Master „passt“ (22 × 14 natur, 30 × 20 natur). 30 × 20 Premium: „Vorschau offen: Materialstärke“ – der Familie fehlt die Stärke (Familienlücke, nicht Design).
- Gravurfläche: gesamt 5–12 % der Platte, größte zusammenhängende Füllfläche ≤ 8,4 % (Pinsel-Buchstaben MG2 ca. 6 %) – unter der 15-%-Regel. Motive als Linie/kleine Blätter.
- Kein Element verdeckt ein anderes (Split-Buchstaben sind im Bogen an der Namensleiste ausgespart), Konfi-Textkästen innerhalb der Platte, Versalhöhen ≥ 4 mm.
- Linie `linien/monogramme-schiefer.json` (Entwurf) + `struktur.json` + Thema `monogramme` in `themen.json`; keine Freigaben gesetzt, keine Bilder im Katalog.

## Startdesign-Vorschlag
**MG-S-D13 „Mendel“** (Kalligrafie-Split-Monogramm): das typische, sofort erkennbare Monogramm-Motiv, elegant und gut lesbar, filigran statt Fläche. Alternative für Kunden, die ihren eigenen Buchstaben sofort sehen wollen: **D1600 Lorbeerkranz** (Buchstabe ist Text, jeder Buchstabe möglich).

## Offene Fragen an Chris
1. **Buchstaben der Bestands-Bögen sind Kurven** (MG-S, MG2-S): Der Kunde kann dort nur den Namen ändern, nicht den Buchstaben. Sollen alle 26 Buchstaben je Bogen als eigene Designs angelegt werden (je 26 Varianten, Konfi-Auswahl nach Buchstabe), oder reichen Beispielbuchstaben + die neuen Designs, deren Initial Text ist?
2. MG3-S nutzt „Ballet Harmony“ (nicht freigegeben, keine Ersatzregel). Vorläufig Playfair Display – passt das, oder Ballet Harmony liefern?
3. Premium-Schiefer 30 × 20: Materialstärke in der Familie fehlt (Vorschau offen).
4. Weitere Schiefer-Größen ab 22 × 14 (40 × 30, 40 × 20, 60 × 30 …): Familien anlegen? Dann übertrage ich die 10 Designs.

## Selbstprüfung
- Stark: MG-S-D13/D19/D8 (Originale, sehr edel), D1600, D1603, MG2-S-D18.
- Mittel: D1602 – „&“ in Great Vibes etwas größer als die Initialen, obere Linie nah an der Kante (gewollt bis Rand); D1601 – Magnolia-Initial kräftig, auf 30 × 20 relativ kleiner (Schriftgrenze 100 mm).
- MG3-S-D13: Initial etwas kleiner als im Original (Konfi-Textkasten darf nicht über die Platte).
