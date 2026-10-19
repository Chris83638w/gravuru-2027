# corel-skripte – gravuru CorelDRAW-VBA-Skriptsammlung (Referenz)

Stand: 19.10.2026 · Quelle `Tools 52.5.2.gms` (CorelDRAW 2020, Produktion gravuru) · Autor der Skripte: Martin Afelt (gravuru), GravostyleBridge mit Kay Henning.

**Zweck im Repo:** Lesbare Referenz für Paket **K15 Amazon-Custom-Import** und die Werkstatt/JobControl. Die Corel-Skripte bleiben laut Entscheidung vom 19.10.2026 das produktive Werkzeug für Amazon-Bestellungen; `scripts/import-amazon-order.py` ist Paritätsprüfung und Brücke, kein Ersatz. Dieser Ordner beantwortet damit den offenen Punkt 2 der [K15-Spezifikation](../docs/plans/AMAZON-CUSTOM-IMPORT-20261019.md) („bestehendes Corel-Einlese-Skript liefern“).

## Herkunft und Reproduktion

| | |
| --- | --- |
| Originaldatei | `C:\Users\Christopher Koch\AppData\Roaming\Corel\CorelDRAW Graphics Suite 2020\Draw\GMS\Tools 52.5.2.gms` (PC Chris; welcher Stand auf den Werkstatt-PCs installiert ist, wurde nicht geprüft) |
| Größe / SHA-256 | 5 121 554 Byte · `88701c199a0a1e5e069806cf9d4b47b8babec3566d2a78aa8040ae256b24d880` |
| Format | 18 Byte Corel-Header + OLE-Container mit VBA-Projekt (`apc/The VBA Project/_VBA_Project`) |
| Extraktion | `python3 -I tools/extract-gms.py "<Pfad>/Tools 52.5.2.gms" corel-skripte/` (benötigt `pip install oletools`) |
| Umfang | 130 Module · 81 106 Zeilen: 40 Standardmodule (`.bas`), 60 Klassen (`.cls`), 29 Formulare (`.frm`), 1 Dokumentmodul |

Die `.gms` selbst liegt **nicht** im Repo (Binärdatei, enthält den Code kompiliert inkl. Zugangsdaten). `MANIFEST.json` listet jede Datei mit Zeilenzahl; `PROJECT.txt` ist der VBA-Projektstream (Modultypen, Referenzen).

**Veränderungen gegenüber dem Original:** nur Zeilenenden CRLF→LF, Formular-Dateien haben den textuellen `VBFrame`-Kopf (Caption, Fenstergröße) vorangestellt, und in `src/class/MySQLConnection.cls` sind zwei Klartext-Passwörter durch `<ENTFERNT …>` ersetzt. Sonst nichts. Code hier **nicht editieren** – Änderungen passieren in Corel (VBA-Editor), danach neu extrahieren und committen; so bleibt der Ordner ein Spiegel der laufenden Version.

**Nicht enthalten:** Formular-Layouts der Steuerelemente (binäre `f`/`o`-Streams), die Photoshop-ExtendScripte (`Y:\20_Martin\Photoshop\Scripte`, ca. 6 000 Zeilen, separates Paket), die Doku-PDFs „Funktionsweise der Skripte“ / „Nutzungsanleitung“, sowie die Daten auf dem Server (CSV-Zuordnungen, Schablonen-CDRs, Design-CDRs).

## Struktur

```
corel-skripte/
├── README.md            diese Datei
├── MANIFEST.json        Dateiliste, Zeilen, Quell-Hash
├── PROJECT.txt          VBA-Projektstream (Modultypen)
├── tools/extract-gms.py Extraktion aus der .gms, reproduzierbar
└── src/
    ├── module/   40 Standardmodule (Makro-Einstiege, Logik)
    ├── class/    60 Klassen (Datenmodell, Parser, Jobs)
    ├── form/     29 UserForms (Dialoge, nur Code + Kopf)
    └── document/ ThisMacroStorage
```

## Modulgruppen (Wegweiser)

| Gruppe | Module | Was sie tun |
| --- | --- | --- |
| **Amazon-Import** (K15-Gegenstück) | `module/AmazonImport.bas` (4 480 Z.), `class/AmazonImportJSON*.cls`, `AmazonImportSortedView`, `AmazonImportViewManager`, `AmazonImportTemplate`, `AmazonExcelDesignInfo`, `AmazonConvertPreset`, `form/AmazonImportDialog`, `AmazonImportTemplateDialog`, `class/StringWord` | Bestell-ZIP(s) aus Seller Central → entpacken → `customizationInfo` v3.0 parsen → Design-CDR laut Zuordnungs-CSV laden → Texte (Schriftalias, Einpassen, Arabisch-Umkehr, „+“→„†“ bei Daten), Fotos (PowerClip in Upload-Box, Weißfreistellung) und QR-Codes setzen → optional in Schablone legen → Gravur-/Druck-Ebenen nach Modus → PDF. Mit STRG: nur ASIN laden (Produkt ohne Anpassung). |
| **Amazon-Export** | `module/AmazonExport.bas`, `module/AmazonASINConnector.bas`, `module/MySQL.bas`, `class/MySQLConnection.cls` | Konfigurator-Bilder 400×400 aus Design-CDRs für Amazon-Custom-Vorlagen; ASIN→CDR-Pfad per MySQL (`192.168.178.252`, DB `martin`/`admin`); Markieren von Konfi-Flächen/Padding. |
| **Fancy-Export (FPD/Shopify)** | `module/FancyExport.bas`, `class/FancyExport*.cls`, `form/FancyExportDialog` | Export der Designs als Fancy-Product-Designer-Pakete (JSON mit Text-/Bild-Elementen, SVG/Bitmap). |
| **Design-/Produktmodell** | `module/productDesign.bas`, `class/ProductDesign*.cls`, `ProductDesignLayer` (2 462 Z.), `ProductShapeInfo`, `module/ProductRecognizer.bas`, `module/productID.bas`, `class/ProductIDObject`, `UIProductIDProperty`, `module/variante.bas`, `class/Variant*.cls`, `module/Gravuru.bas` (Material-Enum) | Lesen einer Design-CDR als Produkt: Ebenen (Material, Gravur, Druck, Varianten wie Edelstahlrahmen), Parts/Views, Artikelnummern-Grammatik, Varianten. |
| **Dateisystem / Server** | `module/Globals.bas` (19 979 Z.), `class/FSDesignFiles`, `FSSizeFolder`, `FSShapeFolder`, `MonitoredFile`, `module/MotiveNames.bas`, `ShapeRegistry.bas` | Server-Pfade (`Y:\20_Martin\Corel\`, Zweitserver `\\192.168.178.100\…`, Google-Drive-Modus, Offline-Pfad), Design-/Größen-Ordner, CSV-Laden, Versionsprüfung, Hilfsfunktionen aller Art. |
| **PlaceFile / Stapel** | `module/PlaceFile.bas` (7 593 Z.), `class/PlaceFile*.cls`, `form/PlaceFileDialog` | Dateien/Designs regelbasiert auf Bögen platzieren (Jobs, Sub-Jobs, Shape-Cache). |
| **Export allgemein** | `module/Export1.bas`, `Export2.bas`, `class/ShapeExport`, `module/Extractor.bas`, `Extractor2.bas`, `ConfiHelper.bas`, `class/Confi*.cls` | Produktbild-/Konfigurator-Exporte, Freistellen, Ansichten. |
| **GravoStyle-Brücke** | `module/GravostyleBridge.bas` | Auswahl → PDF (`%TEMP%`) → Import in `C:\GravoStyle8000\Exe\Gravostyle8.exe` (Prozess `Pltf.exe`) per Tastatursteuerung. **Das ist die heutige Übergabe an den Laser** und der Ansatzpunkt für JobControl. |
| **Werkzeuge/Makros** | `module/Macros.bas` (6 716 Z., 67 Einstiege), `Tool.bas`, `arrange.bas`, `group.bas`, `AutoCorrection.bas`, `ResizeDesign.bas`, `SelectShapeByColor.bas`, `SVGColorizer.bas`, `WeightCalculator.bas`, `LookCreator.bas`, `DesignVariantCreator.bas`, `DesignSelector.bas`, `ProductLayerDistance.bas`, `StructureHelper.bas`, `MacroRunner.bas` | Einzelmakros für die Werkstatt (Outlines skalierbar, Bitmap-Zuschnitt, Anordnen, Gewicht, Farbauswahl …). |
| **Infrastruktur** | `module/JSON.bas` (Fremdcode, RegEx-JSON-Parser), `logger.bas`, `class/ArrayList*`, `RegexMatcher`, `StopWatch`, `SubProgress`, `Version`, `Classfactory.bas`, `PersistentShape*`, `form/ProgressBarUserForm`, `GlobalSettingsUserForm` | Parser, Logging, Container, Fortschrittsanzeige, globale Einstellungen (Gravur-/Druckmodus, Google Drive als Server, Dokument nach Export zurücksetzen). |

## Was der Corel-Import heute erwartet (für die Parität mit K15)

- **Eingabe:** eine oder mehrere Amazon-ZIPs (oder direkt JSON), per Dateidialog; sortiert nach Erstelldatum. Entpackt nach `%TEMP%\CorelDraw Script Unzip\`. Unterstützte JSON-Version `AMAZON_JSON_VERSION_SUPPORTED = "3.0"` (`customizationInfo.version3.0` – dieselbe Quelle wie `import-amazon-order.py`).
- **Zuordnung ASIN → Design:** CSV `<NeueStruktur>\Amazon\Amazon-Import ASIN zu Design-CDR.csv` mit den Spalten `ASIN`, `Dateipfad`, `Design-Nummer`, `Größe`, `Schablonenpfad`, `View Sortierung`, `Konfi-Typ`, `Konfi-Options-Übersetzungen`, `Auf Breite skalieren`, `Breite wie Größenauswahl`, `automatisches Größenmanagement`, `Designauswahl verwendung erzwingen`, `Produktbild laden`. Folgezeilen einer ASIN beginnen mit `>`. → Entspricht `amazon/asin-mapping.json` + `design-overlays.json` in K15.
- **Schriften:** `<Corel-Hauptordner>\Amazon Import\Schiften Aliasse.csv` (sic) → entspricht `amazon/font-aliases.json`. Fehlende Glyphen werden per GDI (`GetGlyphIndicesW`) geprüft und als Fehler gemeldet.
- **Schablonen:** je View optional eine Schablonen-CDR (`Schablonenpfad`); Designs ohne Schablone kommen in ein Arbeitsdokument „Ohne Schablone“.
- **Modus:** Gravur- und/oder Druckmodus aus `GlobalSettingsUserForm`; Ebenen werden je Modus ein-/ausgeblendet (`manageGravingAndPrintMode_isLayerForCurrentMode`).
- **Ausgabe:** Corel-Dokument(e) mit platzierten Designs; `exportToPDF` (aufgezeichnete PDF-Einstellungen, Schrift eingebettet, 200/600 dpi); Fehlerliste je ASIN am Ende. Die Übergabe an die Maschine ist ein eigener Schritt (GravostyleBridge bzw. Druckertreiber), nicht Teil des Imports.

**Konsequenz für K15:** `bestellung.json` + `gravur.pdf`/`gravur.svg` müssen sich gegen das vergleichen lassen, was der Corel-Import aus derselben ZIP erzeugt (Textlage, Schriftgröße, Fotoausschnitt). Die Zuordnungs-CSV und die Schriftalias-CSV vom Server sind die Vorlage für die Mapping-Dateien unter `amazon/` – noch gegen den Amazon-Vorlagenexport bestätigen (K15 offen 2).

## Regeln

- Referenz, keine aktive Codebasis: nicht umschreiben, nicht „modernisieren“. Vorschläge für Corel-Änderungen kommen als Datei nach `patches/` (Beispiel: MySQL-Zugang aus `zugang.ini` statt Klartext, 19.10.2026). Neue Logik entsteht in `scripts/`, `app/` oder einem späteren JobControl-Modul.
- Keine Zugangsdaten, Kunden- oder Bestelldaten in diesem Ordner (vgl. `AGENTS.md`). Vor jedem erneuten Extrahieren `grep -rn -i "password" corel-skripte/src` prüfen; das Werkzeug schwärzt nur das Muster `password = "…"`.
- Bei neuer Corel-Version: `.gms` neu extrahieren, `MANIFEST.json`-Hash vergleichen, Commit-Nachricht mit Versionsnummer (z. B. „Tools 52.6.0“).
