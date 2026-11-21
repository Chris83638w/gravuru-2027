# Bestelldateien nach der Musterdatei von Chris (PDF und SVG der Bestellansicht)

Claude (Unteragent des Operators), 21.11.2026. Zweig `dev/claude-musterdatei-20261121`, aufgesetzt auf `481d0161` (enthält 3.61). Nichts davon ist aufgespielt. Am Live-Shop wurde nichts getan und nichts gemessen.

Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt unverändert; an Designs wird nichts geändert.

## Vorgabe von Chris (21.11.2026)

- 17:06 Uhr, zum Bild der Bestellansicht: „ich sehe hier noch nichts richtig“
- 17:07 Uhr, mit der Musterdatei: „so müssen die dateien aussehen“
- 17:08 Uhr: „bei druckbaren war es äußere Kontur in den haarlinien rosa von Roland (Schmuckfarbe) und Bilder bei hinterdruckten Acrylglas erst Farbe und dan Rdg White. Aber bei der ausgabe muss der druck zu sehen. Wir drehen es dann in corel draw um“
- 17:17 Uhr: „blaue linien sind nur für die konturen , damit man es in den schablonen anlegen kann. bei schildern aus acrylglas gibt es ausnahmen, weil da die löcher im anschliss der gravur geschnitten werden und daher rot benötigen,“
- 17:18 Uhr: „nur beim druck Betsellungen ist es die schnittkontur von roland, sprich rosa, da sonst farbe gedruckt wird“

Im Code steht dafür der Verweis „ENTSCHEIDUNGEN 3.62“. Die Zeile im Register trägt der Operator ein.

## Gemessener Aufbau der Musterdatei

Die Datei liegt als Prüfvorlage im Repo: `app/workshop/test-fixtures/musterdatei-gravur-chris-20261121.pdf` (nur Testtext).

| Merkmal | Wert |
| --- | --- |
| Seite | 160 × 260 mm, Endformat (TrimBox) = Seite |
| Ebenen | genau eine: „03 Gravur“ |
| Inhalt der Ebene | Vektorflächen und -linien in reinem Schwarz, keine Schriften, keine Bilder |
| danach, außerhalb der Ebene | 1 Linie reines Blau (Rechteck auf dem Seitenrand), 7 Linien reines Rot (Geräteausschnitte) |
| Linienbreite | 0,0028346 pt = 0,001 mm |
| Spiegelung | keine, Text lesbar |
| Inhaltsstrom | alles direkt auf der Seite, keine eingebetteten Formobjekte: Millimeter-Matrix, Verschiebung `1 0 0 1 0 -10 cm`, dann `/OC /gravur BDC` … `EMC` mit dem Beschnitt auf die Plattenkontur (`0 10 m 160 10 l 160 270 l 0 270 l h W n`), danach die Linien als `0 0 1 RG 0.001 w 1 J 1 j … S` bzw. `1 0 0 RG …` |

**Befund:** 160 × 260 mm ist die Acrylauflage einer Funkklingel im Format 16 × 28 cm mit Rahmen oben und unten; der Inhaltsstrom zeigt es selbst (Kontur von 0/10 bis 160/270 im Format, um 10 mm verschoben). Die Seite der Musterdatei ist also die Platte, die die Gravur trägt – nicht das gemeinsame Format von Träger und Auflage (160 × 280 mm). So ist es gebaut.

## Was gebaut ist

| Regel im Code | Quelle |
| --- | --- |
| Bestelldateien nie gespiegelt, unabhängig vom Fertigungsprofil | Musterdatei; Chris 17:08 Uhr („Wir drehen es dann in corel draw um“) |
| Gravur-PDF: Inhalt in der Ebene „03 Gravur“ in reinem Schwarz; Konturen danach, außerhalb der Ebene, 0,001 mm; Seite = Platte, Endformat = Seite | Musterdatei |
| Gravur-PDF: alles direkt im Inhaltsstrom der Seite – Gravur zwischen `/OC /gravur BDC` und `EMC`, Konturen als Pfadoperatoren in Millimetern (`0 0 1 RG` bzw. `1 0 0 RG`, `0.001 w`, `S`); keine eingebetteten Formobjekte; kleinere Platte per `cm` verschoben | Musterdatei (Inhaltsstrom); Auftrag des Operators vom 21.11.2026 abends |
| Blau = Außenkontur zum Anlegen, bei allen Produkten | Chris 17:17 Uhr |
| Rot = Löcher und Ausschnitte bei Acrylglas (Schnitt nach der Gravur). Maßgeblich ist das Material der Platte (`material.kind` bzw. `material.id` „acrylic-…“), nicht der Produktname | Chris 17:17 Uhr |
| Funkklingel zweischichtig: Seite = Acrylauflage, Außenform blau, Ausschnitte rot | Musterdatei (Befund oben); ENTSCHEIDUNGEN 3.61 (Acrylauflage trägt die Gestaltung) |
| Mit Foto: Graustufenbild in der Ebene, Konturen als Vektor | ENTSCHEIDUNGEN 3.57 Punkt 5, unverändert |
| Gravur-SVG: Gruppe „03 Gravur“ (`id="gravur"`), danach `aussenkontur` (blau), `ausschnitte` (rot) bzw. `innenkonturen` (blau); `fill="none"`, `stroke-width="0.001"` | Musterdatei, sinngemäß |
| Druck-PDF: jede Kontur (Außenform und Ausschnitte) in der Roland-Schmuckfarbe `CutContour`, 0,001 mm; nie Blau oder Rot | Chris 17:08 und 17:18 Uhr |
| Druck-PDF: der Druck ist zu sehen (Weiß liegt unter der Farbe), Ebenen in der Reihenfolge Farbe, `RDG_WHITE`, `CutContour` | Chris 17:08 Uhr |
| Druck-SVG: letzte Gruppe „CutContour“ in Rosa (#ff00ff), 0,001 | Chris 17:18 Uhr, sinngemäß |

**Annahmen – von Chris nicht gesagt, bitte bestätigen:**

1. **Löcher bei Edelstahl, Schiefer und anderen Materialien stehen als blaue Linie in der Datei** (3.61: Konturen immer enthalten). Sagt Chris „weglassen“, ist das eine Stelle: `ORDER_HOLES_OTHER` in `app/workshop/print-delivery.mjs` auf `'omit'`.
2. In der Gravur-PDF wird jede Vektorfarbe außer reinem Weiß zu reinem Schwarz (bei Formprodukten alter Art trägt die Gestaltung Vorschaufarben). Weiß bleibt Weiß.
3. Die Linienbreite 0,001 mm gilt auch für die Druckkontur (Chris sagt dort „haarlinien“; die Musterdatei zeigt nur die Gravur).
4. Ebenennamen der SVG: lesbarer Name als `data-layer` und `inkscape:label`; Kennungen `gravur`, `aussenkontur`, `ausschnitte`, `innenkonturen`, `CutContour`.
5. Mit Foto ist das Bild der Bestell-PDF dasselbe Raster wie die Gravurseite, bei gespiegeltem Profil zurückgedreht – nicht neu gerechnet.

**Abweichung vom Auftrag, mit Grund:** Der Dateinachweis heißt jetzt `gravuru-order-files/v3` (Auftrag: v2 bleibt). Mit v2 hätte die Bestellansicht fertige Ausgaben des Stands 3.61 weiter abgegeben – gespiegelt, Kontur schwarz, Breite 0. Nachweise v1 und v2 werden nicht mehr abgegeben; die Position baut beim Öffnen neu.

## Was unverändert bleibt

- Alle Dateien der Seite „Ausgaben“: Gravur-PDF, getrennte Konturdatei, Fertigungs-SVG, gesicherte Gestaltung, Druck- und Weißdateien, Schnittdateien der Funkklingel. Dort gilt weiter das Fertigungsprofil samt Spiegelung.
- `app/configurator/variant-m/print-export-model.mjs` und die Editor-Pakete. Die Breite der Druckkontur wird in der fertigen Bestell-PDF gesetzt (`withOrderCutLine`), nicht im Editor-Modul.
- Mimaki: Weiß bleibt die eigene Datei unter „Ausgaben“.

## Geänderte Dateien

- `app/workshop/form-engraving-worker.py` – baut Gravur-PDF und -SVG der Bestellansicht (`orderFiles`: `holes`, bei der Funkklingel `plate`, dazu `paths`). Bei Vektor ist die Seite die von cairo erzeugte Seite selbst, ihr Inhalt wird nur mit dem Ebenenblock umschlossen; mit Foto steht das Graustufenbild als Bildobjekt im selben Block.
- `app/workshop/form-engraving-proof.mjs` – reicht je Ring der Kontur den PDF-Pfad in Millimetern mit (`paths`), umgesetzt vom vorhandenen, geprüften Umsetzer der Druckkontur (`app/configurator/variant-m/contour-pdf-path.mjs`, unverändert: alle Befehle des Konturformats, Kurven bleiben Kurven, Bögen werden Kurvenstücke).
- `app/workshop/print-delivery.mjs` – Regeln an einer Stelle (`orderHoleLines`, `orderPlate`), Druck-PDF nicht gespiegelt mit Kontur 0,001 mm, Druck-SVG, Dateinachweis v3.
- `app/workshop/acrylic-engraving-proof.mjs` (v9), `acrylic-print-proof.mjs` (v10), `form-engraving-proof.mjs` (v3), `form-print-proof.mjs` (v7).
- `app/workshop/ui/orders.html` (Hilfetext), `production-summary.mjs` (Zweck der Dateien), `cross-store-orders.mjs` (Hinweis); `http.mjs`, `ui/orders-ui.mjs`, `ui/order-store-context.mjs` nur Kommentare.
- Tests: `order-files.test.mjs` (16 Tests), `surfaces.test.mjs`, `photo-color-export.test.mjs`, `production-summary.test.mjs`, `form-print-proof.test.mjs`; Prüfvorlage `test-fixtures/musterdatei-gravur-chris-20261121.pdf`.
- `docs/handoffs/2026-11-21-maschinentest.md` – an die neuen Farben und „nicht gespiegelt“ angepasst.

## Was Astra aufspielt

- **Nur den Server** (mit Neustart). Kein Editor, kein Theme, keine App-Version, kein Schalter, keine Datenumstellung, keine neuen Pakete.
- Wirkung: Jede Position baut ihre zwei Dateien beim ersten Öffnen neu (ein Auftrag je Position). Bis dahin steht dort „PDF und SVG werden für diese Position neu erstellt.“ – auch bei den Testbestellungen vom 21.11.
- Sichtprüfung ohne Messung: Testbestellung öffnen → neuer Hilfetext („nie gespiegelt … Ebene „03 Gravur“ …“); PDF laden → Ebene „03 Gravur“, blaue Außenkontur, bei Acrylglas rote Löcher, Text lesbar.

**Rückweg:** Server zurück auf den Stand davor. Es geht nichts verloren; der alte Stand liest den Nachweis v3 nicht und baut beim Öffnen einer Position wieder die Ausgabe seines Rezeptstands.

## Prüfungen (lokal, synthetische Daten und Testvorlagen des Repos)

- **Gezielte Tests:** 300 Tests in 44 Dateien, alle bestanden (Bestelldateien 16; Ausgaben, Rezepte, Flächen, Funkklingel, Schiefer, Konturen 65 in 14 Dateien; Bestellungen, Exportaufträge, Bestelleingang, Fertigungsprofile 105 in 13 Dateien; Formprodukte, Prüfstände, Shop-Einstieg, `http.test.mjs` 114 in 16 Dateien). Kein Gesamtlauf.
- **Strukturtest gegen die Musterdatei:** dieselbe Prüfung für die Musterdatei und unsere Dateien – Ebenenname, reine Farben, 0,001 mm, Reihenfolge, keine Schriften, Seite = Platte, Endformat, nicht gespiegelt, ein Ebenenblock `/OC /gravur BDC … EMC` im Seiteninhalt, keine Formobjekte, Bild mit Foto im Ebenenblock. Die Konturlinien werden gegen die getrennte Konturdatei geprüft, die ein anderer Zeichner aus demselben Pfad erzeugt (auch mit Bögen, relativen Befehlen, Q/T und C/S). Geprüft an nativem Produkt, echtem Türschild aus Acrylglas und aus Edelstahl (je zwei Bohrlöcher), Formprodukt (Edelstahl, Schiefer, Acrylglas), Funkklingel (zwei Formate), mit und ohne Innenkontur, mit Foto.
- **Druck:** nicht gespiegelt (die Bestell-PDF ist bei gespiegeltem Profil Byte für Byte dieselbe wie ungespiegelt), Druck sichtbar (gerenderte Farbe an ihrer Stelle), einzige Linienfarbe ist `CutContour`, Blau und Rot kommen nur in Gravurdateien vor – für PDF und SVG.
- **Gegenproben:** 31 einzelne Rücknahmen (Spiegelung, Linienbreite, Ebenenname, Farben, Schwarz, Konturen in der Ebene, Endformat, Lochregel in beide Richtungen, Seite der Funkklingel, Gravur wieder als Formobjekt, Inhalt außerhalb des Ebenenblocks, falscher Konturpfad, Druck gespiegelt, Kontur in druckender Farbe, Nachweis v2, Rezeptstand, Hilfetext) – jede von mindestens einem Test erkannt, danach wiederhergestellt.
- **Umbau auf den Inhaltsstrom des Musters, vorher/nachher:** 9 Gravurfälle der 13 Ausgaben und 4 Beispieldateien mit dem Stand `a3c7f558` verglichen – Seitenmaß, Objekte der Ebene und Bildpixel gleich, Konturlinien höchstens 0,004 mm auseinander (andere Teilung der Bögen in Kurvenstücke), Formobjekte auf der Seite vorher 2 bis 4, jetzt 0, Ebenenblock im Seiteninhalt vorher nicht, jetzt genau einer. SVG und Druckdateien Byte für Byte gleich.
- **Dateien der „Ausgaben“ unverändert:** 13 Ausgaben aus denselben gespeicherten Prüfpaketen einmal mit `481d0161` und einmal mit diesem Stand gerechnet. Von 203 gemeinsamen Dateien sind 103 Byte für Byte gleich, 22 PDF gleich bis auf Erstelldatum und Dokument-ID, 13 sind die `summary.pdf`. Verschieden sind nur die 26 Bestelldateien (`…-1zu1-mit-kontur.pdf/.svg`) und in 39 JSON-Dateien allein Rezeptstand, Dateinachweis und Zweckangaben.
- **Editor-Pakete unverändert:** vor und nach der Änderung dieselben sechs Namen, darunter Kern `editor-583629bc80164050` und Darstellung `editor-d6521828989e096a`.
- **Echter Browser (lokale Werkstatt):** Testbestellung eines Acrylglas-Türschilds; der Knopf „PDF“ lädt genau die Datei aus dem Ausgabepaket.

Nicht geprüft: CorelDRAW, RIP, Maschinen, echter Shop.

## Bilder und Beispiele

Im Repo, `docs/handoffs/2026-11-20-prio-c-technik-claude/bilder/`:

- `35-gravur-pdf-nach-musterdatei.png` – Musterdatei neben unserer Funkklingel-Datei (gleiches Maß 160 × 260 mm), dazu Türschild Acrylglas (Löcher rot) und Edelstahl (Löcher blau).
- `36-druck-pdf-nicht-gespiegelt-cutcontour.png` – Acrylglasbild 15 × 20 cm: Druckdatei der „Ausgaben“ (gespiegelt) neben der Bestell-PDF (nicht gespiegelt, Kontur rosa) und der Ebene `RDG_WHITE`.
- `37-bestellansicht-und-geladene-datei.png` – Bestellansicht und die Datei, die der Knopf lädt.

Die Konturlinien sind in den Bildern verstärkt gezeichnet und so beschriftet; in den Dateien sind sie 0,001 mm breit. Die Beispieldateien selbst (PDF und SVG, nur Testtexte) liegen außerhalb des Repos unter `/tmp/muster-ausgabe/`.

## Grenzen und offene Punkte

1. **CorelDRAW nicht geprüft.** Der Aufbau der Gravur-PDF entspricht jetzt dem Inhaltsstrom der Musterdatei (alles direkt auf der Seite, keine Formobjekte). **Prüfpunkt:** Die Gestaltung ist auf die Plattenkontur beschnitten (Beschnittpfad im Ebenenblock; die Musterdatei führt denselben Beschnitt). Das kommt in Corel ggf. als PowerClip an – bitte im Maschinentest ansehen.
1a. Enthält eine Gestaltung Transparenz oder Masken, legt der Zeichner (cairo) dafür selbst Gruppenobjekte an. In den geprüften Fällen (native Produkte, Türschilder, Formprodukte mit Designquelle, Funkklingel, mit Foto) kommt das nicht vor; die Tests verlangen dort null Formobjekte.
2. **Gravur-SVG bei Formprodukten alter Art:** Der Inhalt behält die Farben der Vorschau; nur die PDF führt reines Schwarz. Bei nativen Produkten ist auch die SVG schwarz. Ein Umfärben fremder Designquellen in der SVG ist nicht gebaut.
3. **Mimaki:** Die Weißdatei der „Ausgaben“ ist weiter nach Profil gespiegelt, die Bestelldatei nicht.
4. **Druck-SVG:** SVG kennt keine Schmuckfarben; die Kontur steht dort in Rosa als normale Farbe.
5. Mit Foto und kleinerer Platte (Funkklingel) ist das Bild auf ganze Bildpunkte um die Platte beschnitten; es kann bis zu einen Bildpunkt über den Seitenrand reichen.
6. Führt eine Designquelle zufällig eine Kennung wie `gravur`, heißt die Ebene der Bestelldatei `gravur-2`; der lesbare Name bleibt.
