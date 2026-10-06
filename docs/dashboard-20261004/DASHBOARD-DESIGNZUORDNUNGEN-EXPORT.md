# Designzuordnungen aus dem Bestand per Excel bearbeiten

Stand 06.10.2026. Branch `task/design-excel-export-20261006`, Basis `a06bab0cb0f3ec1eb1ef220992f4d39d1e6aa2e8`.

## Bedienung

Werkstatt → Produktserien (`/werkstatt/serien/`): im neuen Bereich **Vorhandene Designs per Excel abgleichen** aktive Formprodukte auswählen und **Designzuordnungen als Excel herunterladen** drücken.

Die Datei enthält:

- **Produkte**: Produktname, feste Produkt-ID, erwartete Revision und ein neuer Importschlüssel je Export. Die vorhandenen übrigen Importspalten sind leer und ausgeblendet, damit das bewährte Importschema erhalten bleibt.
- **Designs**: pro Design die stabile ID, Name und Standardauswahl. `design_file`, `design_page` und `design_fit` bleiben beim Export leer.
- **Designliste**: Referenz mit Design-ID, Namen, gespeicherten Maßen und Feldanzahl. Wird nicht importiert. Keine Text-/Fotofeldinhalte, Originalgrafiken, Dateipfade oder Kundenbilder.
- **Anleitung**: Ablauf und Regeln direkt in der Arbeitsmappe.

Im Blatt Designs den Namen ändern und je Produkt genau ein Standarddesign mit `default_design=1` markieren; andere Zeilen auf 0. Ohne 1 bleibt das bisherige Standarddesign erhalten. Dann die bearbeitete Datei in Produktserien auswählen, prüfen und übernehmen. Ohne neue Grafik muss kein Bild hochgeladen werden: Original, Platzierung, Kundenfelder, Ergänzungsrechte und sämtliche anderen Produktdaten bleiben erhalten.

Wenn ausdrücklich eine Grafik ersetzt oder ein neues Design hinzugefügt werden soll, `design_file` samt optionaler Seite/Einpassung ausfüllen und die betreffende SVG/PDF zusätzlich im Dashboard auswählen. Für neu eingefügte Design-IDs und Neuanlagen bleibt die Dateizuordnung Pflicht. Kundenfelder der ersetzten Grafik werden wie bisher nicht ungeprüft auf eine andere Vorlage übertragen.

Weggelassene Designzeilen löschen nichts; gezieltes Entfernen bleibt im Produkteditor. Unveränderte Formprodukte werden ohne neue Revision übersprungen. Für die bestehende Acryl-Sockelvorlage bleibt das bisherige Importverhalten erhalten. Das neue Exportangebot betrifft freie Formprodukte.

## Konsistenz und Grenzen

1–100 aktive Formprodukte, bis zu 30 Designs je Produkt. Archivierte Produkte, Master, fremde Produkttypen, doppelte/ungültige IDs und leere Auswahl werden abgewiesen. Export übernimmt die aktuellen gespeicherten Produktrevisionen; ein späterer Import überschreibt keine zwischenzeitlichen Änderungen.

Wiederholung derselben bearbeiteten Datei nutzt dieselben Importschlüssel und erzeugt keine zusätzlichen Änderungen. Für eine weitere Bearbeitung erneut exportieren. Unveränderte Produkte benötigen keinen Journaleintrag. Abweichende Eingaben benötigen eine neue Vorschau; Fehler eines Designs blockieren sein ganzes Produkt. Explizite Teilübernahme bleibt möglich.

`design-export.mjs` exportiert ausschließlich die genannten Felder. Der Python-Worker `design-export.py` erzeugt die XLSX im Speicher über die bereits dokumentierte OpenPyXL-Abhängigkeit (`requirements-excel.txt`). Er nutzt dieselbe begrenzte Worker-Ausführung wie der Ausführungsgruppenexport. Texte mit führendem `=` bleiben Texte; keine Formeln, Makros oder externen Verbindungen. Download nur über die bestehende geschützte Werkstatt, CSRF-POST und `Cache-Control: no-store`. Keine neue öffentliche Backend-Authentifizierung.

## Abnahme

Bestehende verwaltete Linux-Cloud, Node 24.19.0, isolierte synthetische SQLite-Datenbanken. Keine privaten Bestandsdaten gelesen oder verändert.

Ausgeführt: `node --test app/workshop/form-batch.test.mjs app/workshop/batch.test.mjs`, `node scripts/cloud-check.mjs` sowie echter Chromium-Download und Datei-Reimport auf 1440/390/768 px. Abschließend **267 Tests bestanden, 0 Fehler, 0 Skips; Build 76 Ressourcen/1 Modell, Editor 461440 Bytes**. Laufzeit **06.10.2026, 08:21:41–08:23:05 Europe/Berlin**. Der Gesamtbefund steht im [Prüfprotokoll](design-export-check.json).

Geprüft: 100 Produkte mit je 30 Designs (3000 Kindzeilen), exakte Rückübernahme aus XLSX, Literaltexte ohne Formeln, Datenschutz-Allowlist, Namen/Standardwahl ohne Grafikwechsel, Erhalt aller übrigen Felder/Rechte/Geometrie, expliziter Grafikwechsel daneben, Konflikte, Wiederaufnahme und CSRF/Origin-Schutz. Desktop/Mobil/Tablet ohne horizontalen Überlauf und ohne JavaScriptfehler.

Im ersten gezielten Lauf gab es zwei konkrete Befunde: Die Testausgabe für 3000 Designs überschritt das standardmäßige 1-MB-Limit des Test-Unterprozesses; Testpuffer auf 8 MB erweitert. Außerdem erfasste das neue Überspringen unveränderter Daten zunächst auch die alte Acrylvorlage; auf freie Formprodukte begrenzt, damit deren bestehende Regeln erhalten bleiben. Die abschließende Gesamtprüfung überprüft diese Korrekturen.

[Desktopansicht](design-export-desktop.png) · [Mobilansicht](design-export-mobile.png) · [Importprüfung](design-export-review.png).

Keine Site-Veröffentlichung, keine Shopify-/Plesk-/Produktionsänderung, kein Merge/PR. Die vorhandene separate Acryl-Testseite wurde nicht aktualisiert. Reale Produktionsabnahme und echte Shopify-Teststrecke bleiben offen.

Nächster Schritt: zusammenhängenden Tabellenablauf Produktanlage → Designzuordnung → Ausführungsgruppe → Kundenkonfigurator prüfen; getrennte erfolgreiche Teilprüfungen nicht als gesamte Strecke ausgeben.
