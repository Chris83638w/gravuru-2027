# Hundeschilder (Edelstahl-Türschilder + Acryl 3 mm) – Bericht 01.11.2026

Auftrag: Issue #110. Katalog-Branch `dev/hundeschilder-fertig-20261101` (Entwurfs-PR im Katalog). Acryl 3 mm schwarz/anthrazit nutzt dieselben Designs (Ziele `acryl-3mm-tuerschilder-schwarz/-anthrazit`, Freigabe überall `null` – Freigabe nur Chris).

## Inventur (Designs mit Thema `hundeschilder`, ohne `nichtAngeboten`; Zahl = Designs, die in mindestens einer Größe des Bereichs angeboten werden)
| Formatreihe | Größen unter 9×6 vorher → nachher | Größen ab 9×6 vorher → nachher |
|---|---|---|
| edelstahl-gravur-50x20 | 2 → 4 | – |
| edelstahl-gravur-60x20 | 2 → 4 | – |
| edelstahl-gravur-65x65-rund | 4 → 6 | 5 → 9 |
| edelstahl-gravur-70x23 | 0 → 4 | – |
| edelstahl-gravur-80x20 | 2 → 4 | – |
| edelstahl-gravur-80x35 | 4 → 6 | 5 → 10 |
| edelstahl-gravur-80x53 | 4 → 6 | 5 → 12 |
| edelstahl-gravur-80x80 | – | 5 → 12 |
| edelstahl-gravur-90x30 | 4 → 6 | 5 → 10 |
| edelstahl-gravur-ab-80x53 | 4 → 6 | 5 → 12 |
| edelstahl-gravur-oval-120x40 | 4 → 6 | 5 → 9 |
| edelstahl-gravur-oval-150x80 | – | 5 → 10 |
| edelstahl-gravur-oval-90x60 | – | 5 → 10 |
| edelstahl-gravur-retro1-90x60 | – | 5 → 12 |
| edelstahl-gravur-retro2-91x61 | – | 5 → 9 |

Ziel erfüllt: jede Formatreihe ab 9×6 ≥ 8 (9–12), unter 9×6 ≥ 4 (4–6, nur Standardmotive Herz/Pfote/Hund).

## Bestand (Corel) – Abgleich
- Gravur-Hundedesigns im Türschilder-Bestand sind D29–D33 – alle schon in Lieferform 2. Neu: Thema `hundeschilder` bei **TRE-V2A-7x2-D30 und -D32** nachgetragen (fehlte als einzige Reihe; 5x2/6x2/8x2 hatten es).
- `designs/bestand/tuerschilder` meldet zusätzlich Kennungen TRE-V2A-5x2/6x2/7x2/8x2-D29/D31/D33; die extrahierten Streifenbögen enthalten sie aber nicht (17 Designs je Bogen). Nicht ohne Bogen nachgebaut → offene Frage.
- `designs/bestand/tierschilder/Tiere/Hund`: UV-/Fotodesigns, nicht 1:1 gravierbar. Zwei davon als **starke Referenz** übernommen (D112, D113). Schiefer-Knochen (TSK-S) gehört zu Katalog-PR #14 – nicht angefasst.

## Neue Designs (gleiche D-Nummer = gleiches Design je Formatreihe)
| D | Name | Modus / Vorlage | Schriften | Motiv | Reihen |
|---|---|---|---|---|---|
| D110 | Familie Seidel & Paula, Pfote im Herz | neu | Playfair Display, Allura | motive/pfoten/pfote-im-herz.svg | alle 15 (alle Größen) |
| D111 | FAMILIE LINDNER mit Bruno, sitzender Hund | neu | Bebas Neue, Montserrat Light, Caveat | motive/hunde/hund-sitzend-1.svg | alle 15 (alle Größen) |
| D112 | AUFPASSEN! Mila – beißt nicht, aber bellt laut | Referenz TSFUV-AD-D4/D3 (Foto → Silhouette) | Cinzel, Pacifico | hunde/hund-sitzend-3, pfoten/zwei-pfoten-1, Zierlinie | 80x53, AB, Retro 1, Oval 9x6/15x8/12x4, 8x8, Rund (ab 9×6) |
| D113 | Hier wacht ein wachsamer Vierbeiner – Bella im Knochen | Referenz TSFUV-AD-D1/D2 | Libre Baskerville, Great Vibes | eigenes Motiv Knochen-Umriss (motive-eigene/hunde/knochen-umriss.svg), pfoten/pfote-1 | alle außer Streifen, Oval 12x4 (ab 9×6) |
| ★ D114 | Signature „Über die Kante“ – Golden Retriever schaut über die Unterkante, Familie Hartmann & Emma | neu | Alex Brush, Montserrat Light | hunderassen/golden-retriever.svg | 80x53, AB, Retro 1, 8x8, 8x3,5, 9x3 (ab 9×6) |
| ★ D115 | Signature „Gassi-Linie“ – Linie bis an den Rand, Hund läuft darauf, Familie Brenner mit Oskar | neu | Cinzel, Cormorant Garamond | hunde/hund-stehend-2.svg, Linie | 80x53, AB, Retro 1+2, Oval 9x6/15x8/12x4, 8x8, 8x3,5, 9x3 (ab 9×6) |
| ★ D116 | Signature „Porträt“ – Hundeporträt zwischen Doppellinien (bis an den Rand), Familie Krause mit Lotta | neu | Bellefair, Josefin Sans, Sacramento | hunderassen/golden-retriever-03.svg, 4 Linien | 80x53, AB, Retro 1, 8x8 (ab 9×6) |

Beispielnamen erfunden, je Design verschieden. Auf 5×2/6×2/7×2 entfällt der Hundename bei D110/D111 (wie Bestand D30 auf den Streifen), damit der Familienname klar am größten bleibt.

## Kontaktbögen (native Konfi-Zielvorschau, Edelstahl; Vorschau in der kleinsten Größe ab 9×6)
Je Formatreihe eine JPG in diesem Ordner. Blau = neu, Gold ★ = Signature, klein daneben die Bestandsreferenz.

## Startdesign-Vorschlag
**D114 „Über die Kante“** (Platz 1/Hauptbild, Rechteck 9×6 bis 45×30): sofort als Hundeschild erkennbar, emotional, sehr hochwertige Wirkung, Name in Schreibschrift als Gegengewicht – genau der Hausstil „Motiv seitlich, wenig aber groß“. Für Oval/Rund (kein D114): **D111**.

## Prüfung
- Alle 69 neuen Master: native Zielvorschau für Edelstahl und Acryl schwarz geprüft, keine „passt nicht“; Hinweise nur „Text im Bereich eines Bohrlochs“ (Bewertung ohne Befestigung) bzw. Retro 2 „Seitenverhältnis 1,5 % eingepasst“ (gilt für die ganze Reihe).
- Mindestens 3 mm Versalhöhe auf der kleinsten angebotenen Größe; kein Element überlappt (Text im Knochen liegt in der Aussparung); Motive unverzerrt, nicht abgeschnitten.
- Keine Bilder/PNG im Katalog, nur design.json/design.svg/index.json + motive-eigene.

## Offene Fragen an Chris
1. Bestand meldet TRE-V2A-5x2/6x2/7x2/8x2-D29/D31/D33, die Streifenbögen enthalten sie nicht – gibt es diese Corel-Fassungen wirklich? Dann übernehme ich sie 1:1.
2. Vertikaler (gedrehter) Text: Die native Vorschau stellt `rotate(-90)` falsch dar (gespiegelt/waagerecht). Deshalb kein Signature-Design mit senkrechtem Namen – Code-Fehler sollte separat geprüft werden.
3. D112 „AUFPASSEN!“ ist bewusst ein Hinweisschild mit Hundename – soll es zusätzlich unter Hinweisschildern laufen?

## Selbstprüfung (ehrlich)
- Stärkste Designs: D114, D116, D110, D111. D115 elegant, auf schmalen Ovalen etwas klein.
- Schwächer: D112 auf Oval/Rund (Spruch klein, Hund klein); D113 auf Ovalen mit kleiner Überschrift; D111 auf Oval 9×6 mit kleinem „mit Bruno“. Wenn Chris strenger urteilt, diese zuerst nachschärfen.
- Layouts sind je Form automatisch eingepasst und danach je Reihe einzeln angesehen – Feinschliff je Design (Abstände) noch möglich.
