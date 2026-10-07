# Design-ZIP im Serienimport – 07.10.2026

Produktbasis **`dd42faf55df44686d3b6185807c35497ceba8df0`**, ergänzende Übergabe **`dc941043c7184dfe6775c3e995989a8c70b13fd6`**, Arbeitsbranch `feat/design-zip-import-20261007`. Übergabe aus `docs/continuation-handoff-20261007` vollständig gelesen und unverändert übernommen. Sie baut direkt auf dem neuesten Produktstand auf; keine Rücksetzung. Inventar enthält 960 Gitbaum-Einträge für `dd42faf`, keine privaten Laufzeitdateien oder Secrets. Originalreferenzarchive nicht erneut geöffnet oder heruntergeladen.

## Bedienung

Unter **Produktserien → Design-ZIP auswählen** ein normales ZIP ohne Passwort auswählen. `design_file` verwendet den **genauen Pfad im Archiv**, einschließlich eines dort enthaltenen Hauptordners, zum Beispiel `Kollektion/klein/Design.svg`. Bei der bisherigen Ordnerauswahl wird dagegen der vom Benutzer ausgewählte Hauptordner weggelassen. Die Oberfläche zeigt alle verwendbaren Pfade für den Abgleich mit Excel; es wird kein gemeinsamer Präfix geraten oder entfernt.

ZIP-, Ordner- und Einzeldateiauswahl können kombiniert werden, solange die vollständigen Pfade eindeutig sind. Gleichnamige Dateien in verschiedenen Unterordnern bleiben getrennt; derselbe vollständige Pfad aus zwei Quellen wird abgewiesen. Ein ZIP pro Auswahl; mehrere ZIPs zuerst bewusst lokal zusammenführen oder separat prüfen. **ZIP-Auswahl entfernen** entfernt nur die lokale Browserauswahl und verwirft den bisherigen Prüfplan.

Das ZIP wird im Browser geprüft und seine SVG-/PDF-Dateien im begrenzten Arbeitsspeicher gelesen. Es wird weder auf dem Server entpackt noch als Archiv hochgeladen. Erst **Tabelle und Designs prüfen** lädt die in Excel referenzierten Dateien über den vorhandenen geschützten Upload hoch. Andere Dateitypen und innere ZIPs werden gezählt/ignoriert, nicht rekursiv geöffnet. Produktanlage oder Aktualisierung bleibt ein eigener ausdrücklicher Schritt.

Prüfergebnis, gespeicherte Import-Eingaben und Excel-Berichte behalten die relativen Pfade. Originaldateien werden weiterhin nach SHA-256 in der bestehenden privaten Assetablage gesichert. Das ZIP selbst wird nicht dort abgelegt. Wiederöffnen einer gespeicherten Prüfung benötigt keine erneute Archivauswahl; derselbe Import erzeugt keine Duplikate.

## Grenzen und Schutz

- ZIP höchstens **50 MB**, insgesamt höchstens **150 MB angekündigte unkomprimierte Größe**, einschließlich ignorierter Dateien; höchstens 5000 Einträge und 100 SVG-/PDF-Dateien. Je Design unverändert höchstens **15 MB**. Die gemeinsame Auswahl bleibt auf 100 Designs begrenzt.
- Unterstützt: unkomprimiert gespeicherte Dateien und Deflate, UTF-8-/ASCII-Namen sowie normale Datenbeschreibungen nach dem komprimierten Inhalt. ZIP64, mehrteilige Archive, Passwortverschlüsselung, andere Kompressionsarten und nicht eindeutig als UTF-8 lesbare alte Namen werden mit Hinweis abgewiesen. Gegebenenfalls als normales UTF-8-ZIP neu speichern oder Ordnerauswahl verwenden.
- Alle Eintragsnamen durchlaufen die gemeinsame relative Pfadprüfung, auch ignorierte Dateien. Absolute Pfade, Links, `..`, Backslashes, doppelte Pfade, Verknüpfungen und Spezialdateien sind unzulässig.
- Verzeichnis und lokale Header müssen hinsichtlich Dateinamen, Kompression, Größen und Prüfsummen zusammenpassen. Überlappende oder abgeschnittene Einträge werden abgewiesen. Vor dem Entpacken wird das gesamte Verzeichnis geprüft.
- Deflate wird mit kleinen Eingabeblöcken und Flusskontrolle gelesen. Tatsächlich ausgegebene Größe wird zusätzlich zur angekündigten Größe begrenzt; gefälschte Größen brechen ab. Jede verwendbare Design-Datei benötigt eine passende CRC32-Prüfsumme. Keine Teilübernahme aus einem fehlerhaften Archiv und kein Rückfall auf einen zuvor eingelesenen ZIP-Inhalt.
- Browser benötigt für Deflate `DecompressionStream('deflate-raw')`; andernfalls verständlicher Hinweis auf Ordner-/Einzeldateiauswahl. Tatsächlich geprüft in vorhandenem Chromium, nicht auf einem physischen Mobilgerät oder in allen Browsern.

Keine neue Bibliothek, Datenbank, Migration, Preis-/Geometrieprüfung oder SVG-/PDF-Konvertierung. Die bestehenden Serverprüfungen gelten unverändert für die einzeln hochgeladenen Dateien; Browser-ZIP-Prüfung ersetzt keine Servervalidierung.

## Nachweise

```sh
node --test --test-isolation=none app/workshop/design-zip.test.mjs app/workshop/design-source-path.test.mjs
PYTHONPATH=.local-data/python python scripts/check-design-zip-import.py
node --check app/workshop/ui/batch-ui.mjs
node --check scripts/build-product-series-template.mjs
git diff --check
```

**10 unterschiedliche Node-Tests bestanden, davon 7 neu:** gespeicherte/komprimierte Einträge, Unicode und PDF, Größen-/Anzahlgrenzen vor dem Entpacken, falsche tatsächliche Ausgabelänge, beschädigte Deflate-Daten und CRC, ungültige Pfade auch in ignorierten Dateien, doppelte Einträge, Verknüpfungen, Verschlüsselung/ZIP64/Mehrteilarchive, widersprüchliche lokale Header und Datenbeschreibungen sowie Quellenkollisionen. Drei bestehende Pfadtests wegen der gemeinsam verwendeten Pfadprüfung gezielt ausgeführt. Nach Begrenzung der komprimierten Eingabeblöcke beide betroffenen Prüfungen erneut bestanden; nicht doppelt gezählt.

**Neuer Browserablauf PASS, 5 Prüfgruppen:** echtes ZIP mit zwei gleichnamigen SVGs in verschiedenen Unterordnern, Unicode-Pfad und zweiter Seite einer PDF; drei verwendete Dateien hochgeladen, ungenutztes Design/Text/inneres ZIP nicht. Drei gültige Produkte plus ein fehlender Pfad; private Prüfung wieder geöffnet, Originalbytes/SHA und PDF-Seite erhalten. Fehlerdatei in Excel korrigiert, genau ein Produkt ergänzt, Wiederholung null neue Produkte. Unsicheres/beschädigtes ZIP vor Upload abgefangen, gespeicherte Eingaben und Produkte erhalten. Kollidierende Ordner-/ZIP-Referenz abgewiesen und durch Entfernen der Auswahl wieder bedienbar.

Desktop 1440, Mobil 390 und Tablet 768 ohne Seitenüberlauf/JavaScript-Fehler; beide Screenshots gesichtet. Fixture-Build: 76 Ressourcen, 1 Modell, 461440 Editor-Bytes. Keine Wiederholung der unveränderten Excel-Gesamtabnahme, Dateifreigaben- oder Produktionsprüfungen.

Aktuelle Excel-Vorlage mit vorhandenem OpenPyXL aktualisiert: drei Anleitungszellen/Zeilenhöhen, alle übrigen Zellwerte nach erneutem Öffnen identisch. Generator entsprechend aktualisiert und syntaxgeprüft, nicht ausgeführt.

[Browserbericht](design-zip-import-20261007/report.json) · [Desktop](design-zip-import-20261007/zip-desktop.png) · [Mobil](design-zip-import-20261007/zip-mobile.png)

## Offene Folgeaufgaben

Lokale Datei-, Ordner- und ZIP-Quellen sind damit implementiert. Nächster noch offener Quellenanschluss gemäß Anforderungen: autorisierte Werkstatt-Anbindung an Google Drive mit Datei-IDs, revisionsgebundenen Kopien und Leseprüfung. Eine Chat-Verbindung ersetzt diese App-Anbindung nicht. KI-Dienst benötigt weiterhin Provider-/Kostenfestlegung. Keine automatische Ordnerüberwachung beauftragt.

Plesk bleibt pausiert, echte Shopify-Appanmeldung/HTTPS-Testbackend/Testvariantenbindung/Testbestellung ausdrücklich offen. Keine externe Bestellung, Veröffentlichung, Hostingänderung, neue Umgebung oder Änderung der laufenden Werkstatt. Kein Merge in main und kein Force-Push.
