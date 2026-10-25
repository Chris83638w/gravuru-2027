# Paket AMZ · Amazon: Listing-Export, Custom-Vorlagen, Bestell-Import · 25.10.2026

Für einen **zweiten ChatGPT/Codex-Account** (parallel zu Astra 1 / Paket Q). Boss ist Claude: Er prüft und merged.
Basis: Code `main` (≥ diesem Commit), Katalog `main` (≥ 7f4a048). Eigener Strang. Er wird **erst später** an
Werkstatt und Dashboard angeschlossen, deshalb gelten die Schnittstellen unten verbindlich.

## Auftrag von Chris (25.10.2026)

- **Neue Produkte bei Amazon listen**, per Flat File, SEO-optimiert. Bestehende Amazon-Listings sind hier nicht
  Thema.
- **Amazon-Custom-Personalisierung** ebenfalls per Datei (Excel/TXT), damit sie automatisiert hochgeladen werden
  kann. Dazu gehören quadratische Bilder (400 × 400 px oder größer, immer quadratisch), mit denen der Kunde gestaltet.
- **Bestellungen:** Amazon liefert je Custom-Bestellung eine ZIP mit JSON (Auswahl und Positionen des Kunden). Ein
  Importer überführt sie in die Fertigung (Corel).
- Später an die Werkstatt anbinden. Aufteilung wie in Shopify: Gravur und Druck sowie jedes Material sind eigene
  Produkte. Druck-SKU mit Präfix `UV` statt `GR`.

## Was es schon gibt (lesen, nicht neu erfinden)

1. **Codex-Vorarbeit (19.09.2026)** auf Chris' Rechner: `C:\Users\Christopher Koch\Documents\Codex\Amazon\`. Zuerst
   `00_START_HIER.md` und `01_Uebergabe/ZUSAMMENFASSUNG-UND-UEBERGABE.md` lesen. Nur lesen, nichts dort ändern.
   - Amazon-Custom-Vorlage „GD“: 423 Spalten, 3 Kopfzeilen + Datenzeile. Export als UTF-16 LE mit BOM,
     tabgetrennt, CRLF.
   - Testartikel SKU `NS-S-30x20-D2`, ASIN `B0CF9MJ7XB`, 100 × 50 mm, 24 Motive.
   - Bilder liegen öffentlich unter `https://gravuru.de/amazon-tuerschild-10x5/`.
   - Ungelöste Befunde:
     - Statt 4 sind 10 Textfelder sichtbar. Das Entfernen ganzer Spalten hat das nicht behoben. Amazons Anleitung
       verbietet das Ändern der Kopfzeilen und das Hinzufügen oder Entfernen von Spalten.
     - 49 Bilder fehlten auf dem Server (Bericht mit 49 Fehlern „Datei nicht gefunden“).
   - Preis- und Optionslogik (Befestigung als Pflichtauswahl mit kostenloser Alternative, Motivaufpreise,
     Entwurfsservice) steht in Kapitel 5 und 8 der Übergabe.
2. **K15 Custom-ZIP-Import:**
   - Spezifikation `docs/plans/AMAZON-CUSTOM-IMPORT-20261019.md`, Skript `scripts/import-amazon-order.py` in main:
     ZIP → `bestellung.json` (`gravuru-order/v1`) + `gravur.svg/pdf` 1:1 in mm + `kontur.pdf` + Summary.
   - **Unvollständig auf main:** Die Zuordnungsdateien `amazon/*.json` und 10 Commits liegen nur auf
     `dev/konfi-neu-K15-amazon-import`. Der Test auf main bricht mit „asin-mapping.json nicht gefunden“ ab.
   - Umrechnung nach der Corel-Regel (`AmazonImport.prepareView`): 400er Raster, 10 px Rand, längere Plattenseite
     = 380 px, ein Maßstab für x und y.
   - Corel-Skripte (Tools 52.5.2) liegen dort unter `corel-skripte/`, nur als Referenz.
3. **SP-API-Abruf und Begleitscheine** (PR #3, `task/amazon-sp-api-20261016`): nur Sandbox, alter Stand. **Nicht in
   diesem Paket.** Er bleibt geparkt, der Importer muss später ohne Umbau darauf umstellbar sein.

## Paket AMZ · drei Werkzeuge mit festen Schnittstellen

Branch `dev/amazon-20261025-<account>`, PR gegen `main`, Bericht `docs/handoffs/2026-10-25-paket-amz-bericht.md`,
Absatz oben in `STATUS.md`. Pilot: **Edelstahl-Türschilder** (Katalog vollständig, Preise gesetzt), zuerst **eine**
Formatreihe mit allen ihren Größen (Vorschlag: Rechteck 3:2 wie `briefkasten855`), danach die Linie.

### A · Listing-Exporter (Flat File)

- **Eingabe:** Katalog (Linie → Hauptprodukte → Familie/Größen/Befestigungen/Preise) und eine Textdatei je Produkt
  (siehe unten). **Ausgabe:** Amazon-Lagerbestandsdatei aus der **aktuellen Kategorie-Vorlage**, dazu ein Prüfbericht.
- Für Türschilder ist das die SIGNAGE-Vorlage (Produkttyp „Beschilderung“, Amazon.de, Deutsch). Claude hat sie am
  25.10. aus Seller Central geladen:
  `C:\Users\Christopher Koch\Documents\Codex\Amazon\05_Originale\Vorlagen\SIGNAGE-Beschilderung-2026-10-25.xlsm`
  (SHA-256 `9bfa3b78…a3997`). Amazon kennzeichnet sie als neue Vorlagenversion; das Blatt „Änderungen an der Vorlage“
  zuerst lesen. Die PICTURE_FRAME-Vorlage der
  Acrylherzen passt nicht. Die Struktur wird aus der Vorlage gelesen (Einstellungszeile, Datendefinitionen, gültige
  Werte), nie fest codiert.
- **Struktur nach Chris' bewährtem Custom-Prinzip** (Vorlage `briefkasten855`, Claude am 25.10. gelesen):
  - **Ein Listing je Formatreihe** (Material + Verfahren + Form + Seitenverhältnis). Der Listingpreis ist der Preis
    der kleinsten Größe.
  - **Größen, Designs und Befestigung sind Custom-Optionen mit Aufpreis**, keine Varianten. Das funktioniert, weil
    alle Größen einer Formatreihe dasselbe Seitenverhältnis haben: ein Vorschaubild, eine Textfläche und eine
    Umrechnung für alle Größen.
  - Größen-Aufpreis = Katalogpreis der Größe minus Katalogpreis der kleinsten Größe. Befestigungsaufpreise aus der
    Familie.
  - **Design-Aufpreis immer** (Chris 25.10.): jedes Design kostet Aufpreis, nur „Ohne Motiv“/„Design frei“ ist
    0 €. Die Beträge stehen in `amazon/design-aufpreise.json`.
    - Der Exporter schlägt Stufen von 0,50/1,00/1,50/2,00 € nach Motivumfang vor; das ist die Spanne der
      Bestandsvorlage.
    - Chris bestätigt die Beträge. Ein Design ohne bestätigten Betrag wird nicht exportiert. Kein stilles 0 €.
  - Varianten (Parent/Child) nur, wenn eine Linie es ausdrücklich verlangt. Dann `variation_theme` nur mit gültigem
    Enum der Vorlage: Bei SIGNAGE ist `FARBE/GRÖSSE` gültig, `GRÖSSE/FARBE` und alle `*_NAME`-Werte sind veraltet.
  - SKU = Katalog-SKU (`GR-ES-RE-90X30-T15`, Druck `UV-…`).
  - Kennungen bleiben stabil. Keine ASIN, EAN oder GTIN erfinden: leer lassen bzw. Freistellungswert nur, wenn Chris
    ihn nennt.
- **Texte kommen nicht aus dem Exporter.** Sie stehen in `amazon/texte/<sku-parent>.json` (Titel, Artikel-Highlights,
  5 Bullets, Beschreibung, Suchbegriffe, A+). Diese Dateien erzeugt ein eigener Textschritt (Claude mit den
  Amazon-Skills). Der Exporter prüft sie:
  - Titel höchstens 75 Zeichen, Artikel-Highlights höchstens 125 Zeichen.
  - Suchbegriffe höchstens 200 Byte (Byte-Zählung UTF-8).
  - Keine Fremdmarken.
  - Keine zwei SKUs mit gleichem oder sehr ähnlichem Titel, Bullets oder Suchbegriffen (Duplicate Content), mit
    Ähnlichkeitsmaß im Bericht.
  - Du-Form.
  - Gravur-Listings ohne Druck-Wortschatz.
  - Fehlt die Textdatei, steht das Produkt im Bericht als „Texte fehlen“ und ist nicht exportiert.
- Marke, Hersteller und GPSR-Kontakt kommen aus `amazon/konto.json`.
  - **Marke: gravuru** (Chris 25.10.2026), Konto gravuru GmbH.
  - GTIN-Freistellung für die Marke gravuru: **offen**. Bekannt ist eine Freistellung nur für „CHRISCK design“
    (Acrylherz-Upload 16.10.). Ohne Freistellung braucht jedes Kind eine EAN; der Export meldet das, statt zu raten.
  - GPSR-Kontakt: offen, Chris füllt ihn. Fehlt ein Pflichtwert, bricht der Export mit einer Meldung ab.
- Bewährte Angebotswerte aus dem Acrylherz-Upload vom 16.10. (in `konto.json` vorbelegt, je Linie änderbar):
  Versand durch Händler mit Prime-Vorlage, Bearbeitungszeit 1 Tag, Menge 999, Ursprungsland Deutschland. Gewicht
  je Größe aus dem Katalog; fehlt es, bleibt das Feld leer.
- Variantenstruktur je Linie einstellbar. Standard ist das Formatreihen-Prinzip oben. Die Alternative der Acrylherzen
  (Kinder = Designs, Thema FARBE, Größe als Custom-Option) bleibt als Einstellung möglich.
- Bilder: Felder für Produktbilder bleiben leer, bis Paket P sie liefert. Keine alten Amazon-Bild-URLs verwenden.

### B · Custom-Vorlagen-Exporter (Personalisierung)

**Vorlagen** (Claude hat sie am 25.10. nur gelesen und abgelegt unter
`C:\Users\Christopher Koch\Documents\Codex\Amazon\05_Originale\Vorlagen\`; Originale in Chris' Downloads):

| Datei | SKU | Aufbau | Verwendung |
| --- | --- | --- | --- |
| `Custom-V2A-Edelstahl-2026-09-19.xlsx` | `briefkasten855` | 447 Spalten, **4 Textfelder** in 2 Schriftgruppen, Design-Optionen | **Basis für Edelstahl-Türschilder.** Hat schon 4 Felder und umgeht so das 10-statt-4-Problem. |
| `Custom-Gedenktafel-Gravur-2026-10-19.xlsx` | `Boxenschild2443` | 423 Spalten, 10 Textfelder in 2 Gruppen, Foto, Designs D200–D236, Größe, Befestigung | Basis für Gedenktafeln (später) |
| `Custom-GD-Test-2026-09-19.xlsx` | `Boxenschild2443` | 423 Spalten, gleicher Aufbau | Codex-Testbasis vom 19.09., nur zum Vergleich |

**So ist `briefkasten855` aufgebaut** (das Muster für den Pilot):
- **Oberfläche:** eine Fläche mit Grundbild (Platte) und Schnittmaske.
- **Design-Auswahl** (Pflicht, mit „Ohne Motiv“): je Design Name mit Nummer („Anker D6“), dazu ein Overlay-PNG mit
  dem Motiv an seiner Stelle, eine Miniatur und ein Aufpreis.
  - Die D-Nummer im Namen ist der Schlüssel für den Importer.
  - Das Overlay zeigt **nur Motive** (`motiv-*`/`deko-*`), keine Texte, denn die Texte setzt der Kunde frei.
- **Größe** (Pflicht): 8×5, 9×6, 12×8 … 45×30 mit Aufpreisen. Alle Größen haben das Seitenverhältnis 3:2.
- **Text:**
  - 2 Schriftgruppen mit eigener Schriftwahl, die Farbe ist fest „Lasergravur“.
  - 4 Textfelder „Zeile 1–4“ mit Zeichen- und Zeilenlimit; Zeile 3 und 4 kosten 1 € Aufpreis.
  - Freie Platzierung in der Fläche x 9, y 73, 383 × 254 px im 400er Raster. Das ist genau die Corel-Formel für 3:2:
    380 px breit, 253 px hoch, mittig.
- **Befestigung** (Pflicht, mit „ohne“), **Anmerkung** (150 Zeichen), **Entwurf** (mit/ohne, Aufpreis).

Daraus folgt: Eine Custom-Vorlage je Formatreihe und Material/Verfahren, nicht je Design oder Größe. So bleibt man
deutlich unter 150.

**Weitere Produkte mit Foto-Upload usw.** (Chris 25.10.): Der Exporter wird allgemein gebaut, nicht nur für
Edelstahl. Muster dafür ist `Boxenschild2443` (Gedenktafel):
- **Foto-Upload** (`ImageInputComponent` „Foto-Upload“): Bildfläche = Plattenfläche nach Corel-Formel (bei 3:2:
  x 9, y 73, 381 × 254 px). Pflicht oder optional, Anzahl und Aufpreis für weitere Fotos aus `family.photo`.
- **Textfelder: je Schriftgruppe genau 2, nicht mehr** (Chris 25.10.), bei 2 Gruppen also 4 Felder wie
  `briefkasten855`. Längere Texte (Spruch, Daten) über `maxLines` je Feld, Zeichenlimits je Thema. Die 5 Felder je
  Gruppe aus `Boxenschild2443` sind kein Muster für die Textfelder.
- **Zusatzoptionen** aus der Familie (Befestigungen, Ständer, Silikon, Kordel, Pflegespray), jeweils mit Aufpreis
  und kostenloser Alternative, wo die Auswahl Pflicht ist.
- **Mehrere Oberflächen** (z. B. Vorder- und Rückseite) nur, wenn eine Familie zwei Gestaltungsflächen hat.
- Ein Test erzeugt neben dem Edelstahl-Pilot auch eine Gedenktafel-Formatreihe mit Foto, nur als Testausgabe. Den
  Rundlauf mit Foto deckt der K15-Importer bereits ab (`foto-1`).

Die Vorlagen sind 1–5 Wochen alt. Ein Generieren in Seller Central („Vorlage erstellen“) belegt einen der
150 Speicherplätze und ist ein Schreibvorgang; das macht nur Chris. Meldet Amazon beim Upload Schemafehler, bittet
Claude Chris um eine frische Vorlage, statt Spalten anzupassen.

- **Eingabe:** dieselben Hauptprodukte und die Design-Master (Lieferform 2) samt Familie. **Ausgabe:** die
  Custom-Datei je SKU aus Amazons Vorlage (UTF-16 LE, BOM, Tab, CRLF, Kopfzeilen unverändert, keine Spalten
  entfernen), dazu ein Bilderpaket.
- **Bilder** (quadratisch, mindestens 400 × 400 px, transparente PNGs wo nötig):
  - Grundbild der Platte mit Materialvorschau aus der Werkstatt-Materialbibliothek
  - Schnittmaske
  - Bohrloch-Overlays je Befestigung
  - Motiv-Overlays und Miniaturen je Design
- **Geometrie identisch zum Importer:** dieselbe Corel-Formel (400er Raster, 10 px Rand, längere Seite 380 px).
  Export und Import müssen sich gegenseitig 1:1 zurückrechnen; ein Test beweist das am Rundlauf.
- **Felder:**
  - Textfelder, Zeichen- und Zeilenlimits nach Konfi-Regel je Thema (Namensschilder/Hausnummern 32 Zeichen,
    2 Zeilen; Gedenktafeln 78 Zeichen, 4 Zeilen; Hinweis-/Firmenschilder 52 Zeichen, 3 Zeilen).
  - Schriften aus dem Schrift-Set der Linie, die Schrift-URLs müssen öffentlich erreichbar sein.
  - Befestigungsoptionen und Aufpreise aus der Familie, mit kostenloser Alternative „Ohne Befestigung“.
  - Gravurfarbe aus dem Verfahrensprofil.
- **Das 10-statt-4-Textfelder-Problem zuerst klären,** an einer einzigen SKU:
  - Herausfinden, welche Komponenten Amazon aus gespeicherten Vorlagen ergänzt und wie ein Feld regelkonform entfällt.
  - Keine Lösung behaupten, die nicht in der Amazon-Kundenvorschau nachgewiesen ist. Diese Prüfung macht Chris oder
    Claude im Browser.
- **Vorlagenlimit:** Seller Central speichert höchstens 150 Custom-Vorlagen. Der Exporter zählt mit und warnt. Nichts
  in Seller Central löschen.
- **Bilder-Hosting:** öffentlicher Ordner auf gravuru.de (wie `amazon-tuerschild-10x5`).
  - Der Exporter erzeugt ein ZIP ohne Unterordner und eine URL-Liste.
  - Hochladen nur nach „ja“ von Chris.
  - Danach prüft ein Skript alle URLs (HTTP 200, gleicher SHA-256, quadratisch, Mindestgröße).
- Ein Ergebnis-Bericht von Amazon (TSV aus der Verarbeitung) wird eingelesen und je Fehler der Spalte bzw.
  Komponente zugeordnet.

### C · Bestell-Importer (Custom-ZIP → Fertigung/Corel)

- K15 auf main vervollständigen: Zuordnungsdateien und die 10 Commits von `dev/konfi-neu-K15-amazon-import`
  übernehmen, Tests grün.
- **Zuordnung automatisch aus A/B:** Der Exporter schreibt `amazon/listings.json` mit SKU → Linie, Familie, Größe,
  Design, Custom-Vorlage und Geometrie. Die ASIN trägt Chris nach dem Upload ein, oder ein Skript liest sie aus dem
  Lagerbestandsbericht. Neue Listings sind so ohne Handpflege importierbar.
- **Ausgabe für Corel:** `gravur.pdf`/`gravur.svg` 1:1 in mm. Corel 2020 öffnet sie maßgleich; das wird mit einer
  echten Corel-Datei geprüft (Abweichung unter 0,1 mm).
  - Text zusätzlich als Text mit Schriftnamen in einer Korrekturfassung.
  - Kontur nur als Haarlinie, nicht gravieren.
  - Bei Menge 2 zweimal ausgeben.
  - Kein Eingriff in die Corel-Skripte auf dem Server. Ein neues Corel-Makro nur als neue Datei, Einspielen macht
    Chris.
- Gleiches Bestellformat wie Shopify-Bestellungen (`gravuru-order/v1`). Das ist der spätere Anschlusspunkt an die
  Werkstatt.

## Regeln

- **Keine Live-Schreibzugriffe:** kein Upload zu Amazon oder Server, keine Seller-Central-Aktion, keine Bestellung.
  Dateien und Berichte übergibt Claude an Chris.
- **Kundendaten** (Bestell-ZIPs, Fotos, Namen) nie ins Repo; Tests nur mit synthetischen Fixtures.
- Nichts erfinden: Preise, Maße, Marke, Kontaktdaten und Texte nur aus Katalog, Konfiguration oder Textdateien;
  Unbekanntes bleibt leer bzw. „FEHLT“.
- Keine Zugangsdaten im Repo. LF-Zeilenenden im Code; die Amazon-Ausgabedateien bewusst CRLF/UTF-16.
- Kein Merge, kein Force-Push, keine Freigaben setzen.

## Abnahme

- **Tests:**
  - Flat-File gegen die Vorlage: Kopfzeilen bytegleich, Enum-Werte gültig, Limits.
  - Duplicate-Content-Prüfung.
  - Custom-Datei bytegenau im Format.
  - Rundlauf Export → synthetische Bestell-ZIP → Import mit Lageabweichung unter 0,1 mm.
  - URL-Prüfung (mit lokalem Testserver).
  - K15-Tests grün.
  - Bestehende Tests unverändert grün; den Linux-Vollauf macht Claude.
- **Pilot-Ausgabe:** eine Edelstahl-Formatreihe mit allen Größen (Flat File + Custom-Datei + Bilder-ZIP +
  URL-Liste), Vorschau-PNGs der Custom-Bilder im Bericht.
- **Bericht:** offene Punkte für Chris (Marke, GPSR, Vorlage, Textfelder-Befund), was im Browser zu prüfen ist und
  was hochzuladen ist.

**Später, nicht in AMZ:**
- SP-API-Abruf (PR #3)
- Anbindung an Werkstatt und Dashboard (Bestell-Warteschlange)
- Produktbilder (Paket P)
- Druckprodukte (Paket N)
