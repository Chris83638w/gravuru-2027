# Gemeinsame Design-Quellordner in Excel – 07.10.2026

Branch `feat/design-source-settings-20261007`, bestätigte Remote-Basis **`dfd8c0f59a04a205a23dfb0c86d7a9850ca868f9`**. ZIP-Import und ergänzende Chat-Übergabe bleiben enthalten. Kein Zurücksetzen, keine neue Umgebung.

## Geschlossene Anforderung

`NEUE-WERKSTATT-PLAN.md`, Abschnitt Excel und Stapelimport: „Gemeinsame Quellordner einmal hinterlegen, Unterordner/Abweichungen je Zeile zulassen.“ Die bewusste Datei-/Ordner-/ZIP-Auswahl war bereits fertig; bisher musste jede Zeile den vollständigen relativen Pfad wiederholen. Dieses Paket ergänzt die gemeinsamen Vorgaben und deren Erhalt in Prüfungen und Korrekturen.

## Bedienung

Die herunterladbare Produktserien-Vorlage enthält jetzt das optionale Blatt **Einstellungen**, mit genau den Spalten `key` und `value`:

| key | value |
| --- | --- |
| schema_version | 1 |
| design_root | Kollektion |

`design_root` ist ein relativer Ordner innerhalb der bewusst ausgewählten Quellen. Leer bedeutet Auswahlwurzel. `schema_version` bezeichnet diese Einstellungsversion; ohne Einstellungen funktionieren vorhandene Tabellen unverändert. Einstellungen gewähren keinen Zugriff auf einen lokalen Pfad, Serverordner oder Drive.

Die optionale letzte Spalte **design_folder** in **Produkte** und **Designs** ersetzt den gemeinsamen Ordner für genau diese Zeile. Leer übernimmt ihn; ein einzelner Punkt `.` wählt ausdrücklich die Auswahlwurzel. Ein ausgefüllter Ordner ersetzt die Vorgabe vollständig, er wird nicht an sie angehängt. `design_file` kann weiterhin Unterordner enthalten:

| design_root | design_folder | design_file | Tatsächlicher Pfad |
| --- | --- | --- | --- |
| Kollektion | leer | klein/Design.svg | Kollektion/klein/Design.svg |
| Kollektion | Andere | Design.svg | Andere/Design.svg |
| Kollektion | . | Design.svg | Design.svg |

Bei Ordnerauswahl weiterhin den ausgewählten Hauptordner weglassen, bei ZIP enthaltene Hauptordner beibehalten. Keine automatische Suche nach Dateinamen, keine automatische Entfernung von Präfixen. CSV/TSV hat kein Einstellungsblatt, unterstützt aber `design_folder` je Zeile.

Produkte und Designs vererben keine Ordnerangaben untereinander. Bei Design-Kindtabelle alle Designangaben einschließlich `design_folder` dort ausfüllen. Ohne neue Datei muss die Zeilen-Ordnerangabe leer bleiben; vorhandene Designs und Kundenfelder bleiben dann erhalten.

Vor dem Anwenden zeigt die Prüfung den gemeinsamen Ordner und jede aufgelöste Quelldatei. Nur referenzierte Dateien werden hochgeladen. Eine Änderung der Ordnerangaben erfordert eine erneute Prüfung. Unsichere oder nicht gefundene Zeilenpfade blockieren das betroffene Produkt; gültige Geschwister können wie bisher ausdrücklich übernommen werden.

## Speichern und Korrigieren

Private Importprüfungen behalten gemeinsame Einstellungen, Zeilenangaben und eindeutige Dateiverknüpfungen. Wiederöffnen benötigt keine erneute ZIP-/Ordnerauswahl. Alte gespeicherte Prüfungen behalten ihr bisheriges Format, wenn kein gemeinsamer Ordner gesetzt ist; auch erneutes Speichern mit leeren neuen Vorgaben erzeugt keine zweite identische Prüfung.

Prüfbericht und Fehlerkorrektur enthalten ebenfalls das Einstellungsblatt und die ursprünglichen Zeilenangaben. Die Korrektur enthält weiterhin nur fehlerhafte Produkte mit ihren Designzeilen. Nach Korrektur dieselben Importschlüssel verwenden; bestehende Produkte, unveränderliche Eingabeschnappschüsse und Originaldateien bleiben erhalten. Ein alter gespeicherter Fehler wird nicht rückwirkend umgeschrieben, wenn er über eine separate Korrekturdatei behoben wurde.

Globale unbekannte/doppelte Einstellungen, andere Einstellungsversionen und unzulässige globale Pfade werden vor Upload abgewiesen. Formeln werden nicht ausgeführt. Für Ordner und zusammengesetzte Pfade gelten die bisherigen Grenzen: relative Pfade, höchstens 512 Zeichen/16 Teile, keine Links, absoluten Pfade, `..`, Backslashes oder uneindeutigen Leersegmente. Originalbytes werden weiterhin in der bestehenden privaten SHA-gebundenen Ablage gesichert.

## Änderungen

- `app/workshop/design-source-path.mjs`: gemeinsame Vorgaben und Pfadauflösung für Browser und Server; bestehende Dateiindex-/ZIP-Regeln unverändert.
- `batch.mjs`, `batch-jobs.mjs`, `batch-report.mjs/.py`: Planer, Prüfbindung, private Eingabesicherung und bearbeitbarer Excel-Bericht.
- `ui/batch-reader.mjs`, `ui/batch-ui.mjs`, `ui/batch.html`: optionales Einstellungsblatt, Upload-Zuordnung und Anzeige vor Übernahme.
- `templates/produktserie.xlsx`, `scripts/build-product-series-template.mjs`: neue optionale Spalten, Einstellungen und Anleitung. Bestehende Zellwerte nach Speichern/erneutem Öffnen identisch; keine Formeln. Generator angepasst und syntaxgeprüft, nicht ausgeführt.
- Neue gezielte Tests und Browserablauf, unten verlinkte synthetische Nachweise. Keine Datenbankmigration oder neue Abhängigkeit.

## Nachweise

```sh
node --test app/workshop/design-source-settings.test.mjs
node --test --test-name-pattern='source folder settings|source settings survive' app/workshop/batch-assets.test.mjs
node --test --test-name-pattern='design sheet errors|child-sheet updates|saved form import|correction workbook retains|filled design Excel roundtrip|metadata-only design updates' app/workshop/form-batch.test.mjs
node --test --test-name-pattern='full report is|correction export never' app/workshop/batch-report.test.mjs
PYTHONPATH=.local-data/python python scripts/check-design-source-settings.py
node --check app/workshop/batch.mjs
node --check app/workshop/ui/batch-reader.mjs
node --check app/workshop/ui/batch-ui.mjs
node --check scripts/build-product-series-template.mjs
git diff --check
```

**13 unterschiedliche Node-Tests bestanden, davon 5 neu.** Neue Vorgaben-/Pfadregeln, Begrenzungen, Acryl-Originalzuordnung, Revisions-/Prüfschutz und private Wiederaufnahme. Acht bestehende Prüfungen gezielt wegen Änderungen an Planer und Excel-Bericht: Formprodukt-Kindtabelle, Revisionen, Metadaten ohne Designersatz, Export-/Korrekturrundlauf und literale Excel-Texte. Keine allgemeine Gesamt-, ZIP-Entpacker-, Datei-Freigaben- oder Druckabnahme wiederholt.

**Neuer Browserablauf mit fünf Prüfgruppen PASS:**

1. Echte XLSX/ZIP-Zuordnung mit Default, abweichendem Ordner und Auswahlwurzel. Drei eindeutige Originaldateien einschließlich SHA/Bytes geprüft, vier Produktzeilen, genau ein fehlender Pfad.
2. Drei gültige Produkte übernommen, gespeicherte Prüfung nach Neuladen ohne ZIP/erneuten Upload geöffnet; Ordnerangaben und Produkte erhalten.
3. Fehlerdatei mit erhaltenen Einstellungen heruntergeladen, nur falschen Zeilenordner korrigiert, genau ein weiteres Produkt gespeichert. Wiederholung erzeugt kein Produkt; alte Eingaben unverändert.
4. Traversal, unbekannte/doppelte Einstellungen, falsche Version und Formel vor Upload blockiert. Alte Übernahme nach Tabellenwechsel gesperrt.
5. CSV-Zeilenordner sowie echte ausgelieferte Vorlage mit neuen Spalten und unverändertem Acrylbeispiel erfolgreich gelesen und geprüft.

Desktop 1440, Mobil 390 und Tablet 768 ohne Seitenüberlauf oder JavaScript-Fehler; Desktop-/Mobilaufnahme gesichtet. Fixture-Build: 76 Ressourcen, ein Modell, 461440 Editor-Bytes. Nur temporäre synthetische Daten, keine privaten Originale oder Datenbanken im Repository.

[Browserbericht](design-source-settings-20261007/report.json) · [Desktop](design-source-settings-20261007/source-settings-desktop.png) · [Mobil](design-source-settings-20261007/source-settings-mobile.png)

## Nächster Anschluss und offene Grenzen

Nächster unabhängiger Excel-Anschluss: ausdrückliche Schrift-/Motivprofilzuordnungen je Produktzeile mit bestehender Profilauflösung verbinden. Der Serienimport übernimmt bisher Master-/Kategoriezuordnungen; eigene Profilspalten fehlen. Vor Umsetzung native Acryl- und Formprodukte sowie Vererbung gezielt abgleichen, keine Profile erfinden.

Drive braucht weiterhin eine eigene autorisierte App-Anbindung; KI einen bestätigten Provider und Kostenrahmen. Plesk bleibt pausiert. Echte Shopify-Anbindung mit HTTPS-Testbackend, Testvariantenbindung und Testbestellung ausdrücklich offen. Keine Live-Veröffentlichung, Hostingänderung oder Änderung der laufenden Werkstatt; kein Merge und kein Force-Push.
