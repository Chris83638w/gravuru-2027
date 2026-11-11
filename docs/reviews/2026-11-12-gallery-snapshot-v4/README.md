# Galeriecache v4: begrenzte Blöcke statt vollständiger Klartextkopie

Stand: lokaler, eingefrorener Korrekturvorschlag auf Runtime e49659f. Keine Serverinstallation, keine Datenbankmigration. Die Operatorbeobachtung #168/6809368576 zeigte 245.830 fertige Karten bei 548 MiB und danach in drei Sekunden >1,8 GiB vor cache_saved. Das grenzt den realen Abbruch auf das Speichern nach dem Galerieaufbau ein.

## Änderung

Nur zwei produktive Dateien: `shop-gallery-snapshot.mjs` und `shop-gallery-benchmark.mjs`. Die bestehende Galerie-Tamperprüfung ändert jetzt tatsächlich ein signiertes Payloadbyte statt einen inzwischen komprimierten Klartextnamen zu ersetzen. Neue Codec-/CLI-Tests und eine bytegleiche e496-v3-Referenz liegen bei. Der Bindingstore gehört zu einem getrennten Review und ist hier nicht enthalten.

Die identische v3-Feldfreigabeliste wird zeilenweise verarbeitet: höchstens 256 Einträge und 1 MiB UTF8 pro Block, deflateRaw level1; ebenso für Quellen. Der kleine v4-JSON-Umschlag bleibt in derselben SQLite-TEXT-Spalte und unveränderten payload/mac-API. HMAC-SHA256 nutzt die eigene v4-Domain und wird vor JSON-Auswertung/Inflation geprüft. Es gibt keinen vollständigen unkomprimierten JSON-String und keinen vollständigen zusätzlichen Projektionsgraphen. Reihenfolge und alle Kandidaten bleiben erhalten, keine frühe Deduplizierung oder Preis-/Freigabeänderung.

Cachegrenzen: 1 MiB unkomprimiert/256 Zeilen je Block, 512 MiB gesamte unkomprimierte Blockdaten, 64 MiB Umschlag; komprimierter Block zusätzlich auf 1 MiB+1024 Bytes begrenzt. Manifestzahlen, Stringschlüssel, doppelte Scope-/Quellschlüssel, Paarform und Base64 werden geprüft. inflateRaw nutzt maxOutputLength exakt aus dem zuvor begrenzten Manifest; keine Teilergebnisse bei Fehlern. Eine Überschreitung führt zum bestehenden Cachemiss bzw. Cache-write-failed, nicht zu einer neuen Produktsperre. Der bereits gebaute Galerieinhalt bleibt bei Schreibfehlern verwendbar.

Alte v2/v3-Caches werden absichtlich verworfen. Ein v3-Fallback würde erneut den gesamten Klartext laden/parsen und den Fehlerpfad beibehalten. Der Cache ist abgeleitet, kein Produktformat. Ein bereits aus SQLite gelesenes altes Payload kann allerdings schon beim SQLite-Read Speicher brauchen; diese Grenze der unveränderten Speicher-API bleibt. Für die echte Kopienmessung eine neue separate Cache-DB verwenden, alteinvalid getrennt benennen.

Der Benchmark streamt bei `--restart-child` bestehende onMeasure-Ereignisse sofort als begrenzte JSONL-Zeilen nach stderr, mit RSS und ausschließlich benannten Zahlenfeldern. Stdout bleibt das bisherige JSON. Ohne diese Option bleibt das Standardverhalten erhalten. Keine zusätzlichen Datenbankreads für die Meldungen, kein Worker oder Unterprozess bei diesem Einzelaufruf.

## Prüfbelege

48 gezielte Tests, 0 Fehler; `final-tests.log`. Befehl im Kandidaten (TEMP/TMP auf vorhandenen eigenen Arbeitsordner setzen):

```text
node --test app/workshop/shop-gallery-snapshot.test.mjs app/workshop/shop-design-gallery.test.mjs app/workshop/shop-design-gallery-alle.test.mjs scripts/shop-gallery-benchmark.test.mjs
```

Belegt sind logische Gleichheit zur eingefrorenen v3-Referenz, Optionen/Unicode/sparse Arrays/geteilte Zeilen, mehrere Blöcke, ursprüngliche Privacy-Feldliste, >1-MB-Base64 eines nahezu vollen hochentropischen Blocks, falscher MAC/Domain/Revision/Tenant/Store, fehlerhafte Blöcke/Counts/Schlüssel, Inflationsgrenzen und atomarer Miss. Bestehende Galerieprüfungen decken Preise, reale Geometrie, Berechtigungen, Paging/Suche, Reopen, aktuelle Variantenauswahl und erneute Bindungsprüfung ab. CLI-Prüfung erzeugt nur neue synthetische SQLite-Dateien, bestätigt Cold/Reopen und unveränderten Quellhash.

## Kontrollierte Speichermessung

`measure-cycle.mjs`, `watch-cycle.py` und `cycle-watched-results.json`: frische, getrennte Node-Prozesse mit identischem Generator; einmal GC vor Encode in beiden Cold-Läufen, keine erzwungene GC während Encode/Write/Decode. 1 GiB Watchdog alle 20 ms, 30 Sekunden Zeitgrenze, kein angehobenes Heaplimit. Alle sechs Prozesse exit0, kein Watchdogabbruch. Reopen öffnet ausschließlich die unmittelbar zuvor erzeugte synthetische Datei readOnly und prüft den logischen Inhalt mit laufendem Hash. Dateien *.synthetic.sqlite werden nicht veröffentlicht.

| Synthetische Zeilen | Format | Payloadbytes | Encode-Peak MiB | Cold-Gesamt MiB | Reopen-Decode-Peak MiB | Reopen-Gesamt MiB |
|---:|---|---:|---:|---:|---:|---:|
| 100.000 | v3 | 123.208.208 | 599,49 | 718,93 | 371,96 | 468,14 |
| 100.000 | v4 | 6.033.305 | 371,89 | 378,71 | 320,20 | 367,65 |
| 250.000 | nur v4 | 15.044.986 | 548,25 | 551,60 | 580,43 | 635,70 |

Wichtig: Cold-Gesamt enthält Encode, SQLite-Dateischreiben und die anschließende Payload-SHA-Prüfsumme. Die vorhandenen JSON-Felder `afterWrite` werden ebenfalls erst nach dieser Prüfsumme ausgewertet; sie sind kein isolierter SQLite-Peak. Reopen-Gesamt enthält auch den laufenden logischen Prüfsummenlauf. Die einzelnen Encode-/Decode-Peaks werden davor erfasst. MaxRSS stammt zusätzlich zum Polling aus process.resourceUsage. Beide 100k-Reopens liefern denselben logischen SHA256 `084090b28e6ffb1928f2abfd8048f980c1e5e65e58f89c2b040ce66287aef73c`. 250k wurde nur für v4 ausgeführt, kein gefährlicher Altvergleich erzwungen. Node v24.20.0 wurde nach den Läufen aus derselben Umgebung gelesen; die Original-Lauf-JSONs enthalten noch keine per-run Quellpins, dies wird nicht nachträglich behauptet.

Die byteidentischen v3-Alternativen wurden verworfen: WeakSet-Replacer zeigte bei100k 602,03 statt599,15 MiB Encode-Peak, Row-JSON+join 670,73 MiB. Ihre Protokolle bleiben als negative Befunde enthalten. V4 ist daher bewusst eine neue abgeleitete Cachedarstellung. Der synthetische Generator hat wiederholte Inhalte; Kompressionsrate und echte Speicherspitze sind nicht auf die Produktionsdaten übertragbar. Synchrone Kompression kostet CPU (100k Encode456,33ms v3 /610,43ms v4), und endgültige Kartenobjekte beim Reopen benötigen weiterhin Speicher.

## Noch erforderlicher Operatorbeleg

Echte unveränderte Kopie: ein begrenzter Cold-Lauf mit frischer separater Cache-DB, vollständiges stderr mit cache_saved, stdout/Exit, Quellhashes vor/nach; danach separater beendeter Reopen-Prozess mit cache_hit und eigener maximaler RSS. Kein parallel gehaltener Benchmark-Parent, keine Heap-/LVE-Anhebung. Gesamtes Konto inkl. laufender App/Worker bleibt relevant. Cold mit vorhandener alter v2/v3-Cachedatei ist ein anderes Szenario. Dieser lokale Beleg bestätigt weder die echte 245.830-Karten-Messung noch Mischhost/Worker/60-Sekunden-Shop-Sitzung.

Reproduktion des synthetischen Tests: `measure-cycle.mjs` erwartet Codepfad, old|new, Zeilenzahl, cold|reopen und einen noch nicht vorhandenen *.synthetic.sqlite-Pfad für cold. Derselbe Pfad wird beim gesonderten reopen verwendet; bestehende Dateien werden nicht überschrieben. `watch-cycle.py` dokumentiert die tatsächlich ausgeführten sechs Aufrufe und den Windows-Wächter, verwendet jedoch die ursprünglichen Arbeitsordner. Den mitgelieferten Wächter niemals erneut im versiegelten Belegordner starten: er öffnet seine festen Lognamen zum Schreiben, während cold vorhandene SQLite-Dateien bewusst ablehnt. Für Wiederholung zuerst eine neue isolierte Workspace-/Ausgabekopie verwenden und die bestehenden Belegdateien unberührt lassen. Es gibt keinen Zugriff auf vorhandene Produkt- oder Kundenbanken.
