# Unabhängiger Review des Suchstatistik-Rückwegarchivs

11.11.2026. Enger lesender Review des Archivzusatzes zu `statistics-rollback-review/rt-suchstatistik-zurueck.mjs`, Abgleich mit der unveränderten `baseline.mjs` und dem Schemaquellbericht. Keine produktive Datenbank geöffnet, kein Rückbau ausgeführt, keine App-/Serveränderung durch den Reviewer.

## Bestätigter Ablauf

- Die Archivierung erfolgt innerhalb des vorhandenen `BEGIN IMMEDIATE`, **vor** Aufbau/Ersetzung der alten Tabelle. `SELECT * … WHERE search_kind<>'motif'` umfasst alle Nicht-Motiv-Zeilen des vorhandenen NOT-NULL-Schemas über alle Mandanten und Quellen. Es gibt keinen Filter auf nur einen Mandanten oder nur bekannte Designbegriffe.
- SQLite-Integer werden mit `setReadBigInts(true)` gelesen und explizit als `{sqliteInteger:"…"}` verlustfrei im JSON erhalten. Alle Spaltenwerte bleiben enthalten; Suchbegriffe erscheinen nicht im normalen Log.
- Bei Nicht-Motiv-Zeilen ist eine neue absolute Archivdatei erforderlich. Auf Linux muss das Verzeichnis dem ausführenden Benutzer gehören und ohne Gruppen-/Fremdrechte sein. Die Datei wird ausschließlich neu (`wx+`) mit Modus `0600` angelegt; bestehende Dateien werden nicht überschrieben.
- Vor dem DDL werden die vollständigen Bytes geschrieben, die Datei synchronisiert, vom noch offenen Dateideskriptor vollständig zurückgelesen und samt Länge verglichen. Anschließend wird auf Linux auch der Verzeichniseintrag synchronisiert. Payload-SHA und Datei-SHA werden getrennt berechnet; das Log enthält nur Zähler/Hashes.
- Ein Fehler bei Pfad, Anlegen, Schreiben, Rücklesen oder Synchronisieren wirft in den vorhandenen Transaktions-Catch. Dieser rollt den Tabellenrückbau zurück. Eine bereits erzeugte Archivdatei darf als Beleg bestehen bleiben; sie wird nicht still überschrieben oder gelöscht. Ohne Nicht-Motiv-Zeilen ist kein leeres Archiv nötig. Der reine Prüflauf archiviert nicht.
- Der Patch ändert ausschließlich den Statistik-Rückweg. Produkt-/Bestelltabellen werden weder kopiert noch zurückgesetzt. App und andere Writer müssen trotzdem tatsächlich angehalten sein; der Patch ist kein Schreibstopp-Prüfer und keine eigenständige Ausführungsfreigabe. Alte Statistikwriter dürfen erst nach erfolgreichem Rückbau starten.

## Gezielte Belege und Grenzen

Die gelesenen synthetischen CLI-Tests starten den vollständigen Helfer mit echten lokalen SQLite-Fixtures und ausdrücklich gesetzten `RT_DB`-/`RT_SICHERUNG_DB`-Pfaden. Damit wird auch der geerbte Backup-Datei-URI-Pfad ausgeführt. Die Tests umfassen zwei Mandanten/Quellen, einen Integer größer als `2^53`, vollständige Archivdaten, unveränderte Produkt-/Order-Sentinel, fehlenden Archivpfad, exklusiven Dateischutz, reinen Prüflauf und den Motiv-only-Rückweg.

**Abgeschlossen, kein verbleibender Fehler im eng geprüften Archivpatch.** Fünf vollständige CLI-Kopienfälle plus ein separater echter CLI-fsync-Fehlerfall sind erfolgreich belegt. Der Fehlerfall ersetzt ausschließlich in seinem synthetischen Kindprozess `fs.fsyncSync` durch einen werfenden Stub: erwarteter Prozess-Exitcode 1, passende Fehlermeldung und bytegleiche gesamte synthetische DB. Die angelegte Archivdatei bleibt erhalten. Quellcode und Resultate gelesen, keine zusätzliche Testserie wiederholt.

Der Erfolgscase prüft jetzt sowohl den eingebetteten Payload-SHA als auch den geloggten Datei-SHA gegen die tatsächlichen Archivbytes. Alle acht Manifestdateien wurden unabhängig auf Größe/SHA geprüft. Der Gitblob der Baseline wurde aus ihren tatsächlichen Bytes nachgerechnet: `0e87ab68c9444b93dbefe2b2f8d661025ef6f7df`, exakt Claudes übergebene Basis. Geprüfter Helfer SHA-256 `233f4dfd5e1d59bf8c3805a1d89598a7bed04b7cfab97926d179af1eb32ba0e5`; Patch SHA-256 `5a575e882e3bda9995769a05a4a5e663c3b2d3a4d04bdf701dac2d2b04b9bd88`.

Das unveränderte Legacy-Logfeld `designZeilenVerworfen` bezeichnet nach dem Patch ausschließlich die Entfernung aus dem alten aktiven Tabellenschema; die Daten sind privat archiviert. README stellt dies ausdrücklich klar, ohne den bestehenden Logvertrag zu ändern.

POSIX-Verzeichnis-/Dateirechte, Benutzerbesitz und Verzeichnis-fsync sind auf dem Windows-Testhost nicht abschließend bewiesen; der Operator muss genau diesen kleinen Kopientest unter Linux wiederholen. Keine Wiederanzeige der archivierten Designstatistik im alten Motivschema wird behauptet. Keine Installation, Liveausführung oder Serverumschaltung durch diesen Review.
