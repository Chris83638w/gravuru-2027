# Design-Ordner als Quelle im Serienimport – 07.10.2026

Basis **`72b70416ecf16040b19ab774b43f5f5a67d5680d`**, Branch `feat/design-folder-import-20261007`. Gewählt aus der noch offenen Anforderung in `NEUE-WERKSTATT-PLAN.md`, Abschnitt „Excel und Stapelimport“: lokaler Datei-/Ordner-/ZIP-Upload und eindeutige Unterordnerzuordnung. Dieses Paket implementiert den **Ordnerupload**. ZIP und autorisierte Drive-Anbindung bleiben eigene Folgeschritte; keine neue Gesamtplanung oder Hostingabhängigkeit.

## Bedienung

Unter **Produktserien → Design-Ordner auswählen** einen lokalen Ordner ausdrücklich auswählen. In `design_file` steht der genaue Pfad **innerhalb** dieses Ordners, etwa `klein/Design.svg` oder `gross/Design.svg`; den ausgewählten Hauptordner weglassen. Die Oberfläche zeigt die verwendbaren Pfade zum Abgleich mit Excel. Groß-/Kleinschreibung muss übereinstimmen. Einfacher Dateiupload bleibt möglich, auch gemeinsam mit einer eindeutigen Ordnerauswahl.

Die Auswahl liest zunächst nur Dateinamen. Erst **Tabelle und Designs prüfen** lädt die tatsächlich referenzierten SVG-/PDF-Seiten über den vorhandenen geschützten Upload hoch. Andere Dateitypen werden gezählt und ignoriert, unbenutzte Designs nicht hochgeladen. Es gibt keinen Hintergrundabruf oder dauerhaften Zugriff auf den Ordner. **Ordnerauswahl entfernen** entfernt nur die Browserauswahl und verwirft den aktuellen Prüfplan.

Gleiche Dateinamen in verschiedenen Unterordnern bleiben getrennt. Keine Suche nach ähnlichen Namen, kein Rückfall auf den bloßen Dateinamen. Doppelte vollständige Pfade, etwa durch gleichzeitige Einzel- und Ordnerauswahl derselben Referenz, werden vor dem Upload abgewiesen. Fehlende Referenzen bleiben Fehler der betroffenen Produktzeile; gültige Produkte können weiterhin ausdrücklich teilweise übernommen werden.

Grenzen: 100 ausgewählte SVG-/PDF-Dateien, je 15 MB, unverändert höchstens 100 Datei-/Seitenzuordnungen. Maximal 5000 Ordner-Dateieinträge, relative Referenzen bis 512 Zeichen/16 Bestandteile, einzelne Namen bis 200 Zeichen. Absolute Pfade, URLs, Backslashes, `..`, leere Pfadteile und Steuerzeichen werden im Browser und Backend abgewiesen. Browser ohne Ordnerauswahl verwenden weiter Einzeldateien. Ein physisches Mobilgerät oder andere Browser wurden nicht separat abgenommen.

## Speicherung und vorhandene Regeln

Die neue gemeinsame Pfadprüfung verwendet Referenzen ausschließlich als Zuordnungsschlüssel, niemals für Dateisystemzugriff oder Netzabruf. Der bestehende Upload erhält den reinen Dateinamen. Originale bleiben nach SHA-256 in der privaten Assetablage gespeichert; die bestehende SVG-/PDF-Konvertierung und Produktvalidierung bleiben maßgeblich.

Vollständige relative Pfade stehen in Prüfergebnis, gespeicherten Import-Eingaben sowie Excel-Berichten/Korrekturen. Produktdokumente behalten ihr bestehendes Schema: Originalname ohne Ordner plus eindeutige Asset-ID/Quellprüfsumme. Kein neues Datenbankschema, keine Migration und keine zweite Preis-/Geometrieprüfung. Eine spätere lokale Dateiänderung ersetzt keine gespeicherte Quelle, kein Produkt und keine Bestellung automatisch.

Die herunterladbare `produktserie.xlsx` und ihr Generator erläutern den neuen Bezug. Mit vorhandenem OpenPyXL vier Anleitungszellen samt Zeilenhöhen aktualisiert, erneut geöffnet und alle übrigen Zellwerte unverändert geprüft. Der optionale Artifact-Generator wurde nur im Quelltext aktualisiert und syntaxgeprüft, nicht ausgeführt.

## Ausgeführte Prüfungen

```sh
node --test --test-isolation=none app/workshop/design-source-path.test.mjs app/workshop/batch-assets.test.mjs app/workshop/form-batch.test.mjs
PYTHONPATH=.local-data/python python scripts/check-design-folder-import.py
node --check app/workshop/ui/batch-ui.mjs
node --check app/workshop/batch.mjs
node --check scripts/build-product-series-template.mjs
git diff --check
```

**29 Node-Tests bestanden**, davon fünf neu. Gemeinsamer Importplaner verändert, deshalb seine betroffenen Acryl-/Form-/Design-Tests ausgeführt: unterschiedliche Quellen mit gleichem Namen, unveränderte Originalbytes nach Neustart, Pfadgrenzen, PDF-Seiten, Transaktion/Wiederholung, Kundenfelder, Design-Kindtabellen und vorhandene Formdruckableitung. Keine erneute allgemeine Browserabnahme, Dateifreigabenprüfung oder vollständige Testsuite.

**Neuer Browserablauf PASS, fünf Prüfgruppen:** tatsächliche Chromium-Ordnerauswahl und XLSX-Upload; zwei gleichnamige SVGs aus unterschiedlichen Unterordnern korrekt zugeordnet; genau zwei verwendete Dateien hochgeladen, Textdatei und unbenutztes Design nicht. Dritte Zeile mit fehlender Referenz meldet einen Fehler. Zwei Produkte übernehmen, privat speichern/wieder öffnen ohne neue lokale Auswahl oder Upload, Originalbytes prüfen. Excel-Bericht erhält Pfade. Ausdrückliche Pfadkorrektur ergänzt genau das fehlende Produkt. Nach lokaler Änderung derselben SVG meldet der Importschlüssel einen Konflikt; gesicherte Eingaben und Produkte bleiben unverändert. Doppelte vollständige Referenz vor Upload abgewiesen; Entfernen der Auswahl sperrt die Übernahme.

Desktop 1440, Mobil 390 und Tablet 768 ohne Seitenüberlauf/JavaScript-Fehler. Zwei Screenshots gesichtet. Fixture-Build: 76 Ressourcen, 1 Modell, 461440 Editor-Bytes. Zwei anfängliche Testskriptfehler korrigiert (zusätzlicher Standardmaster in der Fixture; Originaldownload statt nicht vorhandener Metadaten-Einzelroute); keine Anpassung der Produkterwartungen.

[Browserbericht](design-folder-import-20261007/report.json) · [Desktop](design-folder-import-20261007/folder-desktop.png) · [Mobil](design-folder-import-20261007/folder-mobile.png)

## Offen

Nächstes unabhängig umsetzbares Teilpaket derselben bestätigten Anforderung: bewusst ausgewähltes ZIP als Designquelle mit Größen-/Pfadprüfung und derselben eindeutigen Zuordnung. Drive und KI benötigen ihre eigene autorisierte Laufzeitanbindung beziehungsweise Provider-/Kostenfestlegung.

Plesk bleibt auf Nutzerwunsch pausiert. Echte Shopify-Appanmeldung, geschütztes HTTPS-Testbackend, reale Testvariante und Testbestellung bleiben ausdrücklich offen. Keine externen Shop-/Serveränderungen, keine neue Umgebung, keine Live-Veröffentlichung.
