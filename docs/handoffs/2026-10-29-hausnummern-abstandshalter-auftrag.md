# Auftrag an Astra 3: Hausnummernschilder Acrylglas mit Abstandshaltern (AA / AS / S/S) · 29.10.2026

Von Claude (Operator). Chris möchte die **Acrylglas-Hausnummernschilder mit Abstandshaltern** in den neuen Konfigurator und Shop bringen.

## Produkt (Chris, 17.10.2026)

- **AA / AS:** Acrylglas anthrazit bzw. schwarz, **5 mm**, Gravur **von hinten** (gespiegelt). Befestigung immer mit Abstandshaltern.
- **S/S (schwarz satiniert):**
  - satinierte Front 3 mm, von vorn graviert;
  - schwarze Rückplatte 3 mm, rundum 10 mm größer;
  - Abstandsringe dazwischen, Befestigung mit Abstandshaltern.
- **Maße, Randabstände, Löcher und Formen genau wie in der Corel-Zeichnung** `Hausnummer-Namenschilder-2026.pdf`, nicht vereinheitlichen. Größen nach Seitenverhältnis-Reihen ordnen.

## Was schon da ist (bitte zuerst lesen)

- **Preise (Chris, Excel vom 26.10.):** [`hausnummern-abstandshalter-referenz/gravuru-preise-acryl-2026-10-26.xlsx`](hausnummern-abstandshalter-referenz/gravuru-preise-acryl-2026-10-26.xlsx), Blatt „Acryl 5 mm Abstandshalter“.
  - **AA und AS:** Preise für alle 33 Größen vorhanden, preisgleich.
  - **S/S:** Spalte ist **leer**, also Preise offen. Bitte als offen melden, nicht schätzen.
  - **Abstandshalter als Set mit dem Schild:** 2 Stück 1,99 €, 4 Stück 3,99 €; gilt für AA, AS und S/S.
  - „4 Abstandshalter möglich“: bei 10 Größen ja, bei 23 nein. Die Spalte gilt so, wie Chris sie ausgefüllt hat.
  - **24 × 8 cm statt 24 × 7 cm** (Chris 26.10.: passt in die Reihe 3 : 1, Bohrabstand wie 21 × 7). Die Familien entsprechend abgleichen.
  - Die Schlüssel-Spalte (z. B. `RE-210X70`) ist der Rückimport-Schlüssel, nicht ändern.
- **Designs im Katalog:** `gravuru-katalog./designs/bestand/hausnummern/` mit `HAUSNUMMERN-DESIGNS.xlsx`, `designs.json`, Übersicht und Ordner nach Zielgruppe (Allgemein, Familie, Tiere).
  - Dort sind bereits **175 Hausnummern-Designs** erfasst, aus mehreren Reihen, z. B. auch `HNR3D` = 3D-Optik Acryl + Edelstahl.
  - Für diesen Auftrag nur die Designs verwenden, die zu AA/AS/S/S gehören oder darauf übertragbar sind.
  - **Diese Katalog-Designs sind die Hauptquelle.** D1–D16 aus Shopify und `Beispiele.pdf` nur ergänzend.
- **Referenzbilder von Chris (29.10.):** [`hausnummern-abstandshalter-referenz/`](hausnummern-abstandshalter-referenz/README.md)
  - schwarze/anthrazitfarbene Platte = AA/AS;
  - zwei Platten mit satinierter Front auf schwarzer Rückplatte = S/S.
  - Maßstab für die Anmutung der Konfi-Vorschau, noch zu bearbeiten.

- [`docs/releases/20261017/acrylic-standoff/RELEASE.md`](../releases/20261017/acrylic-standoff/RELEASE.md):
  - Familien `aa.json`, `as.json`, `ss.json` mit je 33 Größen (Rechteck, oval, eingezogene Ecken, R5);
  - Rückplatte, Abstandshalter, Gravurseite;
  - Plattenkatalog-PDF;
  - Testlauf mit 19 Designs aus `Beispiele.pdf` (`scripts/split-corel-design-sheet.py`).
- **Katalog:** Linie `acryl-schilder-abstandshalter`, Unterkategorie `hausnummern` (Schriftsatz `hausnummern`), Familien `acryl-aa-/as-/ss-abstandshalter`. Status im Katalog noch „Familien da, Preise offen“; die Preise liefert jetzt die Excel (siehe unten).
- **Shopify (gelesen 29.10.):**
  - viele aktive Produkte „Hausnummernschild Acrylglas personalisiert …“, 16×11 bis 42×28 cm, mit Designs **D1–D16** (Pusteblume, Leuchtturm, Eulen, Anker, Baum, Hundepfoten, Schmetterlinge …);
  - Handles enden auf `-d<n>`;
  - **keines** ist mit dem neuen Konfi verbunden.
- **Offene Punkte vom 17.10.:**
  - „Acryl-Gravurplatten haben noch kein natives Produktmodell“ – bitte prüfen, ob das inzwischen gelöst ist (Acryl-Store, `katalog-import.mjs`).
  - Die Rückplatte S/S erscheint noch nicht in der Konfi-Vorschau.
  - 8 von 11 Schriften aus den Beispielen fehlen in der Werkstatt (Michroma, Alex Brush, Rounded Elegance, Homage, Fjalla One, Champagne & Limousines …).
  - Plattenmaß 190 × 80 mm gibt es in keiner Familie.

## Ziel

Die Hausnummernschilder AA/AS/S/S sind im neuen Konfigurator bestellbar wie D8 bei Edelstahl:

- **Vorschau:**
  - richtiges Material, d. h. Acryl anthrazit/schwarz mit Gravur von hinten (hell, gespiegelt gefertigt, aber für den Kunden lesbar);
  - S/S satiniert auf schwarzer Rückplatte;
  - Abstandshalter sichtbar.
- **Designs:** die vorhandenen Designs (D1–D16 aus Shopify/Corel + `Beispiele.pdf`), sauber auf alle passenden Größen eingepasst. Hausnummer und Straße/Name als sprechende Textfelder.
- **Kunden-UX vom 28.10.:** `--kunden-ux-20261028`, Preisregel Vorlagenmotiv inklusive, Designs aller Formen/Größen.
- **Preis:** nur aus Chris' Excel (siehe oben). S/S ist offen; nichts schätzen.

## Vorgehen

1. **Bestand und Plan (nur lesen):**
   - Corel-Zeichnung ↔ Familien ↔ Shopify-Produkte/Varianten ↔ Designs D1–D16.
   - Je Variante: passt / offen (Grund) / fehlt. Liste der fehlenden Preise und Schriften.
   - Handle ↔ Titel ↔ Motiv prüfen und nur als Liste mit Vorschlag festhalten, ohne etwas zu ändern. Bei den Türschildern passten mehrere nicht.
2. **Probe 1:1 im echten Konfigurator** (Bilder Desktop 1440 × 900, iPhone 390 × 664):
   - je 1 Design auf AA, AS und S/S in 2 Größen, einschließlich Rückplatte und Abstandshaltern in der Vorschau;
   - Lesbarkeit der Hintergravur;
   - → Chris gibt frei.
3. **Danach:**
   - alle Designs und Größen als Import-Probelauf mit Bericht;
   - Bindungsplan zu den Shopify-Varianten (Weg wie [`2026-10-29-tuerschilder-anbindung-auftrag.md`](https://github.com/Chris83638w/gravuru-2027/blob/dev/tuerschilder-anbindung-20261029-claude/docs/handoffs/2026-10-29-tuerschilder-anbindung-auftrag.md): `shop-export`/`shop-sync`/`shop-bind`, Pilot mit 3 Produkten).
4. Eigener Branch `dev/hausnummern-abstandshalter-20261029-astra3`, signierte Commits, Absatz oben in `STATUS.md`, Bericht `docs/handoffs/2026-10-29-hausnummern-abstandshalter-bericht.md`.

## Grenzen

- Nichts live:
  - kein Shopify-Schreiben, kein Theme, kein Live-Import;
  - keine Bindung, keine Bereitstellung.
  - Pilot und alles Weitere nur nach Chris' ausdrücklichem Satz.
- Nichts erfinden (Preise, Maße, Gewichte ohne Quelle = offen). Nichts löschen, keine Geheimnisse in Repo/Chat/Logs.
- **Parallel laufen:**
  - Astra 1: Zoom/Galerie, PR #42/#43;
  - eine weitere KI: Türschilder-Anbindung;
  - Themen-Designs.
  - Gemeinsame Dateien nur ergänzen. Bei Konflikten in Konfi-Code (`app/configurator/variant-m/`) vorher melden.
