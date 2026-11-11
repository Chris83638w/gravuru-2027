# #230 – gemeinsame Suchauswertung für Designs und Motive

11.11.2026 · Codex/Astra. Grundlage ist der Suchplan vom 10.11.2026 und Chris' ausdrückliche Freigabe im Chat: „ja so einbauen“. Die Entscheidung ist in #230, Kommentar 6802885825, dokumentiert. Kein eigener Auswertungskanal, kein produktiver Datenbanklauf.

Die bestehende Meldung `/api/workshop/motif-search-events`, die bestehende SQLite-Tabelle und die bisherige Werkstattseite werden weiterverwendet. `searchKind` unterscheidet `motif` und `design`; `source=shop|preview` bleibt eine unabhängige Herkunftsangabe. Fehlende Suchart bedeutet bei bisherigen Meldungen und Reportaufrufen weiterhin `motif`.

Die alte Aggregation wird beim Öffnen atomar um den Suchart-Schlüssel erweitert. Alle historischen Zeilen, Mandanten, Tage, Gruppen, Herkunftswerte und Zähler bleiben erhalten und bekommen `motif`. Ein unbekanntes altes Schema oder ein unerwarteter Schlüssel führt zum Abbruch mit Rollback. Die Migration ist wiederholbar; neue Tabellen erhalten gleich den vollständigen Schlüssel. Diese Migration wurde ausschließlich an isolierten Prüfdateien ausgeführt. Vor einer späteren Operatorinstallation die vorhandene Datenbank wie üblich sichern; kein blindes Zurückkopieren einer alten Tabelle nach neuen Ereignissen.

Zwei getrennte Reporter zählen einen fertigen Begriff einmal je Suchart und geöffnetem Editor. Neue Eingaben brechen ausstehende Meldungen ab. Die Galerie meldet nur vollständige aktuelle Gesamtergebnisse; eine weitere Seite zählt nicht erneut. Leere Eingaben werden nicht als Nulltreffer behandelt. Produktgruppe und Herkunft bleiben serverseitig aus dem bekannten Produkt beziehungsweise der erlaubten lokalen Vorschau abgeleitet. Berichte bleiben nur im bestehenden Händlerzugang lesbar.

E-Mail-, URL-, telefonartige und Markup-Eingaben bleiben ausgeschlossen. Designnummern wie D23, kurze reine Nummern und vollständig strukturierte Katalog-IDs werden gesondert berücksichtigt; lange Telefonnummern erhalten keine allgemeine Ausnahme. Es werden keine Canvas-Texte, Kundendaten, Medien oder Kundenkennungen automatisch übertragen. Die neue Auswahl „Suchart“ in der vorhandenen Auswertungsseite bleibt zusammen mit Zeitraum, Produktgruppe und Herkunft je Shop gespeichert.

## Ausgeführte gezielte Prüfungen

12/12 Tests aus `motif-search-analytics.test.mjs`, `motif-search-stats.test.mjs`, `motif-search-http.test.mjs` und `motif-search-ui.test.mjs` bestanden. Abgedeckt: historische Migration mit zwei Mandanten und beiden Quellen, getrennte Zähler, unveränderte Altaufrufe, erneutes Öffnen, Abbruch bei unbekanntem Schema, erlaubte Design-IDs und verworfene Kontaktdaten, bekannte Produkte/Händlerauthentifizierung, gemeinsamer Suchbegriff in beiden Sucharten, Abbruch einer ausstehenden Meldung, Seitennachladen und gespeicherte Filter.

Der erste HTTP-Testlauf scheiterte beim Bundleschreiben an Windows-EPERM im voreingestellten temporären Ordner. Der unveränderte Test bestand mit einem eigenen temporären Ordner innerhalb des Arbeitsbereichs. Das war kein API- oder Datenmigrationsfehler; kein Test-Sollwert wurde dafür geändert.

Der unabhängige Review bestätigte Schema-/Mandanten-/Herkunftserhalt und die unverändert abgeleiteten Gruppen. Im nativen Galerieadapter wurde zusätzlich ein tatsächlicher Abbruchfall korrigiert: Nach erneutem Tippen setzt die Galerie auch ihren bereits gemeldeten Ergebnisschlüssel zurück, damit ein abgebrochener, noch nicht gesendeter Begriff bei der Rückkehr wieder gemeldet werden kann. Regressionstest und abschließender Root-Browsernachweis sind bestanden; Suchart Designs/Herkunft Vorschau werden angezeigt und bleiben nach Neuladen ausgewählt.

Der letzte Root-/Unteragentenreview fand eine weitere enge Migrationslücke: Ein alter Primärschlüssel mit sieben richtigen Spalten, aber fehlender Produktgruppe im Schlüssel, wäre zuvor ungeprüft umgebaut worden. Der ursprüngliche Schlüssel wird jetzt vor dem Neuaufbau exakt geprüft. Die Regression war vor dem Fix rot und nachher grün; die gesamte Stats-Datei bestand 6/6 Tests. Nach abgelehnter Migration sind das ursprüngliche Schema-SQL, beide Mandantenzeilen und Zähler identisch, ohne zurückgelassene Hilfstabelle. Diese sechs Prüfungen überschneiden sich mit dem früheren 12er-Lauf und werden nicht addiert.

Kein neuer externer Empfänger, keine Serverinstallation, keine produktive Datenbankmigration oder Produktfreigabe aus diesem Teilauftrag. Der gesamte Folgebranch baut auf dem gesicherten B-Stand 6298f7af auf; er ist kein ungeprüftes Austauschpaket für den gemischten Serverstand.
