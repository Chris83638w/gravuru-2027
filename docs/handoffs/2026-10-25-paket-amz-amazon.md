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
Absatz oben in `STATUS.md`. Pilot: **Edelstahl-Türschilder** (Katalog vollständig, Preise gesetzt), zuerst **ein**
Hauptprodukt mit allen Größen, danach die Linie.

### A · Listing-Exporter (Flat File)

- **Eingabe:** Katalog (Linie → Hauptprodukte → Familie/Größen/Befestigungen/Preise) und eine Textdatei je Produkt
  (siehe unten). **Ausgabe:** Amazon-Lagerbestandsdatei aus der **aktuellen Kategorie-Vorlage** (liefert Chris), dazu
  ein Prüfbericht.
- **Struktur:**
  - Je Hauptprodukt ein Parent, die Größen als Kinder.
  - `variation_theme` nur mit gültigem Enum der Vorlage. Bei SIGNAGE ist `FARBE/GRÖSSE` gültig, `GRÖSSE/FARBE` und
    alle `*_NAME`-Werte sind veraltet.
  - Die Befestigung läuft als Custom-Option mit Aufpreis, nicht als Variante.
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
- Marke, Hersteller und GPSR-Kontakt kommen aus einer Konfigurationsdatei `amazon/konto.json`. **Werte offen, Chris
  füllt sie.** Fehlt ein Wert, bricht der Export mit einer Meldung ab.
- Bilder: Felder für Produktbilder bleiben leer, bis Paket P sie liefert. Keine alten Amazon-Bild-URLs verwenden.

### B · Custom-Vorlagen-Exporter (Personalisierung)

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
- **Pilot-Ausgabe:** ein Edelstahl-Hauptprodukt mit allen Größen (Flat File + Custom-Datei + Bilder-ZIP +
  URL-Liste), Vorschau-PNGs der Custom-Bilder im Bericht.
- **Bericht:** offene Punkte für Chris (Marke, GPSR, Vorlage, Textfelder-Befund), was im Browser zu prüfen ist und
  was hochzuladen ist.

**Später, nicht in AMZ:**
- SP-API-Abruf (PR #3)
- Anbindung an Werkstatt und Dashboard (Bestell-Warteschlange)
- Produktbilder (Paket P)
- Druckprodukte (Paket N)
