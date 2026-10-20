# Amazon-Custom-Import: Bestell-ZIP → gravuru-Bestellung → Gravurdatei

Stand: 19.10.2026 · Branch `dev/konfi-neu-K15-amazon-import` (von `dev/konfi-neu-20261019`) · Paket **K15** zum [Umsetzungsplan Konfi neu](UMSETZUNG-KONFI-NEU-20261019.md). Nichts davon geht nach `main` oder auf den Händlerhost ohne Freigabe „installieren".

## 1. Ziel

Amazon-Custom-Bestellungen (ZIP aus Seller Central, heute manuell heruntergeladen) werden ohne Handarbeit in dieselbe Bestellstrecke überführt wie Shop-Bestellungen: ein Skript liest die ZIP, erzeugt eine **normalisierte gravuru-Bestellung** (JSON) und daraus die **Gravurdatei 1:1 in mm** (SVG + PDF mit Pfaden, separate Kontur mit Bohrbild) plus eine Summary. Corel bleibt Sichtkontrolle und Sender (bestehendes Einlese-Skript / JobControl), nicht Setzer. Keine KI-Token je Bestellung.

Referenzfall (nur lokal, **nicht im Repo**): Bestellung `302-4217613-2163531`, Position `69360509983882`, ASIN `B013T1VRKS` (Schiefer-Gedenktafel Tier, SKU `Boxenschild2443`), Größe 22 × 14, Design „Doppelherz D201", Great Vibes, 3 Texte, Foto, Acrylständer klar.

## 2. Was die ZIP enthält (Amazon Custom, Stand 10/2026)

| Datei | Inhalt | Verwendung |
| --- | --- | --- |
| `<orderItemId>.json` | `customizationData` als Baum (Option/Placement/Text/Font/Color/Image) **und** `customizationInfo.version3.0.surfaces[].areas[]` als flache Liste | Quelle für alle Werte |
| `<orderItemId>.xml` | dieselben Daten als XML | ignorieren (Fallback, falls JSON fehlt) |
| `<uuid>.svg` | Fabric.js-Layout der Oberfläche, `viewBox 0 0 400 400`, `width/height 3200`: Foto mit `clipPath` + `transform`, Design-Overlay als `<image href="https://…png">`, Texte als `<text font-family font-size><tspan x y>` mit Zeilenumbruch je `tspan` | Lage und Größe von Foto und Texten (Kunde hat frei platziert) |
| `<uuid>.jpg` (groß) | Original-Kundenfoto (im Referenzfall 1118 × 1636 px) | Fotoquelle |
| `<uuid>.jpg` (400 × 400) | Amazon-Vorschau | nur Sichtvergleich in der Summary |

Koordinatensystem: **400 × 400 px** über dem Amazon-Basisbild der Vorlage. Der Druckbereich der Oberfläche steht in jeder Area: `Position {x,y}` und `Dimensions {width,height}` (Referenz: 9/73, 381 × 254). `buyerPlacement` je Text/Foto enthält Position (px im 400-Raster), Dimension (px in Elementeinheiten) und `scale`; die Fabric-SVG enthält dieselbe Lage bereits ausgerechnet als `transform`/`tspan`-Koordinaten.

**Umrechnung (geändert 20.10.2026, Paritätslauf):** Maßgeblich ist die Regel der Corel-Skripte (`AmazonImport.prepareView`): 400er Raster, 10 px Rand, die längere Plattenseite = 380 px, **ein** Maßstab für x und y, Platte mittig: `s = 380 / max(B, H)` px/mm, `mm_x = (px − (400 − B·s)/2) / s`, `mm_y = (py − (400 − H·s)/2) / s`. Schriftgröße in mm = `font-size · scale / s`. Der Amazon-Druckbereich (Area) wird dafür nicht verwendet. Am Referenzfall belegt: Foto-Rahmen auf 0,01 mm, Schriftgrößen innerhalb Corels 0,5-pt-Rundung ([Paritätsbericht](../reviews/K15-PARITAET-COREL-20261020.md)). Weicht das Seitenverhältnis des Konfigurator-Bildes von der Platte ab (B013T1VRKS zeigt immer die 30 × 20-Vorlage, 1,50, auch bei 22 × 14, 1,57), ragen Kundeninhalte am Bildrand über die Platte – Warnung `seitenverhaeltnis` mit Überstand in mm. Die frühere Regel (getrennt in x und y über die Area) bleibt als `--umrechnung druckbereich` nur zum Vergleich.

<details><summary>Bisherige Regel (bis 19.10.2026)</summary>

**Nicht maßgleich:** 381 : 254 = 1,50, die Platte 22 × 14 cm = 1,57 (30 × 20 = 1,50). Die Umrechnung px → mm erfolgt daher **getrennt in x und y** über den Druckbereich: `mm_x = (px − area.x) · Platte.breite / area.width`, `mm_y = (px − area.y) · Platte.höhe / area.height`. Text wird dabei **nicht** verzerrt: Schriftgröße aus der y-Skala, Position aus x/y; Fotoausschnitt wird in beiden Achsen abgebildet (das Foto wurde vom Kunden auf das verzerrte Bild gelegt, der Ausschnitt zählt, nicht die Pixelproportion). Abweichung in x < 5 % wird als Warnung in die Summary geschrieben.

</details>

## 3. Zuordnung Amazon → Katalog

| Amazon-Feld | gravuru | Regel |
| --- | --- | --- |
| `asin` + SKU (`customizationInfo` hat keine SKU → aus Vorlagen-Export `Seller Sku` bzw. Mapping-Tabelle) | Linie + Familie | Mapping-Tabelle `amazon/asin-mapping.json`: ASIN → Linie, Familie, Größenoptionen |
| Option „Größe" (`optionValue`, z. B. „ca. 22x14 cm") | `sizes[].key` der Familie | Mapping je ASIN; Maße aus der Familie, **nie** aus dem Optionstext parsen. Größe ohne Familieneintrag → Fehler `size_unknown` (22 × 14 ist Entscheidung 15 im Katalog; bis dahin Platzhalter-Familie `gedenktafel-22x14-*` als `offen` anlegen, Maße 220 × 140, Rand 10, Form Rechteck) |
| Option „Designs" (`optionValue`, z. B. „Doppelherz D201") | Design-ID | Regex `\bD(\d{3,4})\b` am Ende des Optionsnamens → `designNo` → Eintrag in `gravuru-katalog/designs/bestand/<linie>/designs.json` (`designNo`, `ids`, `path`). „Design Frei" → kein Motiv, nur Texte/Foto. Unbekannt → Fehler `design_unknown` |
| Text-Areas (`TextPrinting` leer) und Fabric-`<text>` | Kundenfelder `text-<n>` | Reihenfolge wie `Texteingabe 1..5` je Gruppe; nur nicht-leere Texte. `\n` = Zeilenumbruch. Schriftgröße in **mm** = `font-size · scale · (Platte.höhe / area.height)`; die Fabric-`font-size` ist in Elementeinheiten vor `scale` |
| `fontSelection.family` | Schriftbibliothek `gravuru-katalog/schriften/schriften.json` (`name`) | Exakter Name; Alias-Tabelle `amazon/font-aliases.json` für Abweichungen (z. B. „MINIMALIST"). Schrift fehlt → Fehler `font_unknown`, **kein stiller Ersatz** |
| `colorSelection` | ignorieren | Gravurfarbe kommt aus dem Verfahrensprofil der Familie |
| Foto (`ImageCustomization` + `buyerPlacement` + `clipPath`) | `foto-1` | Original-JPG unverändert übernehmen; Ausschnitt/Skalierung/Rotation in mm; Weißfreistellung wie Werkstatt-Standard |
| Design-Overlay-PNG | Motivlage | **Nicht** rastern. Motiv-Vektoren aus `design.svg` des Katalogdesigns (Ebenen `motiv-*`, `deko-*`). Lage im Amazon-Raster: aus `amazon/design-overlays.json` (je Design-ID: Bounding-Box des Motivs im 400-Raster, einmal kalibriert – Abschnitt 6) |
| Optionen Befestigung / Zubehör / Entwurf (`var_befestigung`, …) | `mountingRules` / `options` der Familie | Mapping-Tabelle je ASIN; unbekannte Option → Warnung, nicht Abbruch |
| `additionalCost` / `priceDelta` | nur Summary | Preise werden nicht nachgerechnet; Amazon hat kassiert |
| „Anmerkung" (`Informationen 1`) | `note` | in Summary und Bestellung, markiert zur Sichtprüfung |

## 4. Ausgabe je Bestellposition

Ordner `<orderId>_<orderItemId>/`:

1. `bestellung.json` – Schema `gravuru-order/v1` (gleiches Format wie `order-intake.mjs` für Shop-Bestellungen erwartet; siehe `app/workshop/order-intake.mjs`, `cart-personalization.mjs`): `source: "amazon-custom"`, `orderId`, `orderItemId`, `asin`, `sku`, `familyId`, `sizeKey`, `designId`, `fields[]` (`{id, type:text|photo, text, font, sizeMm, x, y, align, lines}` bzw. `{id, type:photo, file, cropMm, scale, rotation}`), `mounting`, `options[]`, `note`, `warnings[]`, `sourceSha256` je Datei.
2. `gravur.svg` – `viewBox 0 0 <B> <H>` in mm, Ebenen: `platte` (Kontur, nur Hilfslinie, `role: guide`), `bohrungen` (Kreise aus `mountingRules`, `role: cut`), `motiv-*` (Pfade aus Katalog), `foto-1` (`<image>` mit `clipPath`), `text-<n>` als **Pfade** (fontTools, Glyphen des Katalog-TTF, Kerning aus GPOS/kern wenn vorhanden), Füllung schwarz, kein Weiß, keine Guides in Druckebenen.
3. `gravur.pdf` – aus `gravur.svg` ohne Guide-Ebenen (CairoSVG oder PyMuPDF), Seitenmaß = Plattenmaß, 1:1.
4. `kontur.pdf` – nur Außenkontur + Bohrungen, gleiche Orientierung (wie `gravur-kontur-1zu1.pdf` der Werkstatt).
5. `summary.pdf` – eine Seite: Amazon-Vorschau (400 px) neben unserer Vorschau (gerendert aus `gravur.svg`), Tabelle Felder/Schrift/Größe/Lage, Optionen, Warnungen, Prüfkästchen „freigegeben von / am".
6. `summary.json` – dieselben Daten maschinenlesbar.

`productionReady` bleibt `false`; die Freigabe ist Paket K5.

## 5. Skript und Schnittstelle

`scripts/import-amazon-order.py` (Python ≥ 3.11, nur `requirements-import.txt` + `requirements-print.txt`; keine neuen Abhängigkeiten ohne Grund):

```
python3 scripts/import-amazon-order.py --zip <datei.zip> [--zip …] \
  --katalog <pfad zu gravuru-katalog> --mapping amazon/ \
  --out <ausgabeordner> [--nur-pruefen]
```

- Mehrere ZIPs in einem Lauf; je ZIP ein Ordner; Exit-Code 0 nur, wenn keine Position Fehler hat.
- ZIP-Inhalt ist **nicht vertrauenswürdig**: keine Pfade mit `..`, nur die vier Dateitypen, Größenlimit 50 MB, SVG nur als Datenquelle parsen (kein Rendern der Fabric-SVG, keine externen `href` laden).
- Netz: nichts herunterladen (Overlay-PNG, Font-URLs bleiben ungenutzt).
- Fehler sind deutsch, benannt (`design_unknown`, `font_unknown`, `size_unknown`, `asin_unknown`, `photo_missing`) und stoppen nur die betroffene Position.
- `--nur-pruefen`: nur `bestellung.json` + `summary.json`, keine Grafik.

Mapping-Dateien unter `amazon/` (Repo gravuru-2027, keine Kundendaten):
- `asin-mapping.json`: `{ "B013T1VRKS": { "sku": "Boxenschild2443", "linie": "gedenktafeln", "familyBySize": { "ca. 22x14 cm": "gedenktafel-22x14-schiefer-natur", "ca. 30x20 cm (Bestseller)": "gedenktafel-30x20-schiefer-natur" }, "mountingByOption": { "2 Bohrlöcher": "B02-E12-D5", "4 Bohrlöcher": "B04-E12-D5" }, "optionsByName": { "Acrylständer / Klares Acrylglas": "staender-klar", … } } }`
- `font-aliases.json`: `{ "MINIMALIST": "Minimalist", … }`
- `design-overlays.json`: `{ "gedenktafeln": { "201": { "bbox400": [x, y, w, h], "quelle": "kalibriert 2026-10-19" } } }`

## 6. Kalibrierung der Design-Lage (einmal je Design)

> **Stand 20.10.2026:** Die Kalibrierung über Overlay-PNGs ist nicht nötig. `bbox400` (Lage im Konfigurator) wird aus der Corel-Design-CDR der Konfigurator-Vorlage mit der Corel-Formel berechnet; zusätzlich steht je Plattengröße die Lage in der Corel-Vorlage der bestellten Größe unter `vorlageMm["<B>x<H>"]` (mm). Mit der Corel-Regel wird das Motiv dorthin gesetzt, wo Corel es setzt (aus der Vorlage), und Warnung `motiv_versatz` nennt den Abstand zur Konfigurator-Lage; ohne Vorlagenlage bei abweichendem Bild Warnung `motiv_ohne_vorlage`. Werkzeug: `cdr2raw` (libcdr-tools), siehe Bericht K15-ABGLEICH Nachtrag.

Das Amazon-Overlay ist ein 400 × 400-PNG mit dem Motiv an der Stelle, die der Kunde sieht. Unsere Gravur muss das Motiv **genau dort** haben, nicht an der Katalog-Position (der Kunde hat seine Texte um das Motiv herum gesetzt). Vorgehen:

1. `scripts/calibrate-amazon-overlays.py --vorlage <Amazon-Vorlagen-Excel> --katalog …`: liest je Design-Option die Overlay-URL aus der Vorlagen-Excel (Spalte `overlayImage.imageUrl`), lädt das PNG **nur in diesem Kalibrierlauf** (bewusst, mit `--laden`), bestimmt die Bounding-Box der nicht-transparenten Pixel und schreibt `design-overlays.json` plus Kontaktbogen (Overlay neben Katalog-Vorschau) zur Sichtprüfung.
2. Im Import wird das Katalog-Motiv proportional in diese Box eingepasst (Seitenverhältnis des Motivs bleibt; Abweichung > 3 % zwischen Box und Motiv → Warnung „Motivproportion").
3. Für den künftigen **Export** (Katalog → Amazon-Vorlage) entfällt die Kalibrierung: die Overlays werden dann aus `design.svg` gerendert, die Box ist bekannt.

## 7. Tests und Abnahme

- Fixture `app/workshop/fixtures/amazon-order/` **anonymisiert**: gleiche Struktur wie der Referenzfall, Texte „Muster", „01.01.2010 – 01.01.2020", Spruch aus `briefingNotes`, Foto = generiertes Testbild (Farbverlauf mit Kreuz) in 1118 × 1636, Vorschau-JPG = Platzhalter. Erzeugt durch `scripts/make-amazon-fixture.py` aus dem echten ZIP (liest die echte Datei nur lokal, schreibt nichts Echtes ins Repo).
- `scripts/import-amazon-order.test.py` (pytest-frei, `unittest`): Umrechnung px→mm an drei Punkten (Ecken + Mitte), Schriftgröße, Zeilenumbrüche, Design-ID-Erkennung inkl. „(ohne Freistellung)"-Suffix, Fehlerfälle, ZIP-Sicherheit, Ausgabe-Schema.
- Echter Referenzfall nur lokal: `gravur.pdf` für D201 auf 22 × 14 erzeugen, mit der Amazon-Vorschau übereinanderlegen (Summary), Abweichung Textlage < 1 mm.
- `npm test` unverändert grün; keine Änderung an `legacy-reference/`.

## 8. Offen (Entscheidungen Chris)

1. Familie 22 × 14 Schiefer (und die übrigen 36 Bestandsgrößen der Gedenktafeln) – Katalog-Entscheidung 15; bis dahin Platzhalter `offen`.
2. Bestehendes Corel-Einlese-Skript: **Quelltext liegt seit 19.10.2026 unter [`corel-skripte/`](../../corel-skripte/README.md)** (`AmazonImport.bas` + `AmazonImport*`-Klassen). Offen bleibt der Abgleich der Server-CSVs (`Amazon-Import ASIN zu Design-CDR.csv`, `Schiften Aliasse.csv`) mit `amazon/*.json` und der Paritätslauf gegen die Corel-Ausgabe derselben ZIP.
3. SP-API statt manuellem ZIP-Download (Branch `task/amazon-sp-api-20261016`): später, Importer bleibt gleich.
