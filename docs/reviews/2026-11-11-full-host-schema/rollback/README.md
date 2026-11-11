# Kleiner Rückweg-Zusatz zur Prüfung

Nur Reviewartefakt; **nicht installiert oder live ausgeführt**. Basis ist Claudes `rt-suchstatistik-zurueck.mjs`, Commit `78f820f1b4e626136e25f6b5c419a8d326667400`, Gitblob `0e87ab68c9444b93dbefe2b2f8d661025ef6f7df`. `baseline.mjs` stimmt mit diesem Blob bytegenau überein. `archive-before-rollback.patch` ändert ausschließlich dieses Operatorwerkzeug. Keine Kandidaten-App, Tabellenformel, Motivaggregation oder Bestell-/Produktlogik geändert.

Der vorhandene Rückbau würde Nicht-Motivzeilen entfernen. Der Zusatz liest deshalb unter derselben `BEGIN IMMEDIATE`-Sperre **vor jedem DROP** alle Zeilen mit `search_kind<>'motif'`, über sämtliche Mandanten/Quellen. Er sichert vollständige Felder in einer privaten JSON-Datei; SQLite-Integer werden verlustfrei als `{sqliteInteger:"dezimal"}` gespeichert. Keine Designzeile wird als Motiv umgebucht.

Das vorhandene Logfeld `designZeilenVerworfen` bleibt zur Kompatibilität unverändert; nach diesem Zusatz bezeichnet es die Entfernung aus der aktiven alten Tabelle. Die Zeilen bleiben im privaten Archiv erhalten. Es ist dann keine Aussage über einen ungesicherten Datenverlust.

Für vorhandene Nicht-Motivzeilen ist `RT_SUCHSTATISTIK_ARCHIV` als neue absolute Datei in einem privaten, bereits vorhandenen Verzeichnis Pflicht. Linux: Verzeichnis muss 0700 und Eigentümer gleich ausführendem Benutzer sein. Erstellung exklusiv `wx+`, Modus 0600; Schreibdaten fsync, bytegenaues Rücklesen, Größe geprüft, anschließend Verzeichnis fsync. Eingebetteter `payloadSha256` über `JSON.stringify(payload)`, zusätzlich Dateihash im mengenbezogenen Log; Suchbegriffe werden nicht geloggt. Erst dann läuft unverändertes altes Rückbau-DDL. Jeder Fehler wirft in den bestehenden ROLLBACK-Pfad. Eine ggf. zurückbleibende unvollständige Datei wird nicht überschrieben; danach einen neuen Namen wählen.

Linux-Kopienprüfung vor Integration: App/alle Writer wie geplant angehalten lassen und ausschließlich eine weitere Arbeitskopie verwenden. Beispielargumente (Pfade durch bestätigte private Kopienpfade ersetzen):

```sh
RT_DB=/privat/pruefung/workshop.copy.sqlite \
RT_SICHERUNG_DB=/privat/sicherung/workshop-vor-umschaltung.sqlite \
RT_SUCHSTATISTIK_ARCHIV=/privat/pruefung-0700/designsuche-rueckweg-001.json \
node rt-suchstatistik-zurueck.mjs --ausfuehren
```

Keine ursprüngliche Sicherung als veränderbare Arbeitskopie benutzen. Das Werkzeug hat weiterhin Claudes bestehende Standardpfade; daher bei Kopientests `RT_DB` ausdrücklich setzen. Der Zusatz stellt keine automatische Wiederherstellung der Designauswertung in der alten Runtime bereit; das Archiv erhält die Daten für eine spätere geprüfte Wiederübernahme. Prüfsummen/Dateipfad privat zum Rückwegprotokoll nehmen. Auch nach erfolgreicher Archivierung darf kein älterer vollständiger DB-Stand über neu eingegangene Bestellungen kopiert werden.

## Gezielter Beleg

Ausgeführt auf Windows mit echtem Node `node:sqlite` und vollständiger CLI als Kindprozess, einschließlich **originalem** Sicherungsöffnen per `file:`-URI; keine extrahierte Fake-Archivfunktion:

```text
node --check work/restabschluss/statistics-rollback-review/rt-suchstatistik-zurueck.mjs
node work/restabschluss/statistics-rollback-review/archive-copy-tests.mjs
node work/restabschluss/statistics-rollback-review/archive-fsync-failure-test.mjs
```

Sechs gezielte Prüfungen bestanden: vollständige Nicht-Motivzeilen zweier Mandanten/Quellen inklusive Integer oberhalb 2^53 und Hash; unveränderte Produkt-/Bestell-Sentinels; fehlender Archivpfad lässt DB unverändert; vorhandene Archivdatei bleibt unberührt; `--pruefen` liest nur; Motiv-only benötigt kein leeres Archiv; zusätzlich injizierter tatsächlicher Datei-fsync-Fehler bricht vor DROP ab und lässt die synthetische DB bytegleich. Der Erfolgstest fasst mehrere Erhaltungsassertionen zu einem Fall zusammen (5 CLI-Fälle + 1 Fehlerfall).

Die Windows-Ausführung prüft weder POSIX-Eigentümer/Modus noch Linux-Verzeichnis-fsync; dieser enge Restcheck gehört auf Claudes isolierte Linux-Kopie. Keine Live-Datenbank oder reale Sicherung wurde hier geöffnet. Testdateien heißen `synthetic-*`/`fsync-fixture-*`, enthalten ausschließlich erzeugte Beispielwerte und gehören nicht ins Veröffentlichungspaket. `manifest.json` verzeichnet Quell-, Patch- und Testdateihashes.
