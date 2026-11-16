# Katalogworker: Windows-Testcleanup korrigiert

Root meldete den allein verbleibenden Prozess der Datei `app/workshop/katalog-worker.test.mjs` im integrierten Cross-Lauf. Die gezielte Diagnose und Behebung betreffen ausschließlich diese Testdatei. **Keine Änderung an `katalog-worker.mjs`, `katalog-worker-client.mjs` oder anderer Laufzeitlogik.**

## Nachgewiesene Ursache

Vor dem Fix waren Worker, Client und Testdatei bytegleich zum Git-Stand `ac10e6c` (`git diff ac10e6c -- <diese drei Dateien>` leer). Ein separater vollständiger ac10-Arbeitsbaum wurde nicht benötigt; es wird kein ausgeführter Gesamt-Baselinetest behauptet.

Der eng begrenzte isolierte TAP-Lauf führte alle 23 Testkörper aus. Zwölf Abschluss-Hooks scheiterten unter Windows mit `EPERM`: temporäre SQLite-/HTTP-Verzeichnisse wurden gelöscht, während Worker bzw. zusätzliche Leser sie noch geöffnet hielten. Ursache ist die Registrierungsreihenfolge der `t.after`-Hooks: Ordner-/Datenbank-Cleanup wurde vor den später erzeugten Worker-/Server-Cleanups registriert und lief zuerst. Nach dem Fehler verblieben Worker; ihre späteren Cache-Save-Meldungen stehen im Log. Der Diagnoseprozess erreichte deshalb das explizite 45-Sekunden-Limit. Der ursprüngliche Root-Prozess wurde gezielt von Root beendet; keine produktive Laufzeit betroffen.

Der Root-Cross-Lauf zeigte zusätzlich `ENOENT` beim Erzeugen von `.local-data/p1c-http-*`: die Testdatei setzte einen bereits vorhandenen `.local-data`-Ordner voraus. Die isolierte Wiederholung fand diesen Ordner bereits vor und zeigte deshalb dort nur das nachgelagerte Cleanup-Problem.

Beleg vor Änderung: `work/restabschluss/katalog-worker-diagnosis.txt`. Kein Windows-ESM-URLfehler und kein durch die Zusammenführung nachgewiesener Runtime-Hänger.

## Änderung

`app/workshop/katalog-worker.test.mjs` erhält eine kleine testinterne Dispose-Liste je Test:

- Ressourcen werden in umgekehrter Erzeugungsreihenfolge aufgeräumt.
- Asynchrones Worker-Beenden wird abgewartet, bevor SQLite-/Ordnerressourcen entfernt werden.
- Ein Cleanupfehler verhindert nicht die Freigabe der übrigen Ressourcen; alle Fehler werden danach als `AggregateError` gemeldet.
- Der HTTP-Testhelper wartet explizit auf `workshop.katalogWorker.close()`, bevor er die Werkstatt schließt.
- Auch der erste explizit gestartete Cache-Worker ist bei vorzeitig fehlgeschlagenem Test registriert.
- Die drei HTTP-Testordner werden unter `os.tmpdir()` erzeugt und benötigen kein vorbestehendes `.local-data`.

Alle 23 fachlichen Tests und ihre Assertions bleiben erhalten. Kein Skip, keine geschwächten Sollwerte, kein `force-exit`, kein Runtime-`unref`-Patch.

## Ergebnis

Gezielter Wiederlauf ausschließlich dieser Testdatei: **23/23 bestanden, 0 fehlgeschlagen, 0 übersprungen. Natürlicher Prozess-Exit 0 nach 13,827 Sekunden.** Das 45-Sekunden-Diagnoselimit wurde nicht ausgelöst. TAP-Laufzeit 13.767 ms. Syntaxprüfung und `git diff --check` grün.

Nachweis: `work/restabschluss/katalog-worker-fixed.txt`. Der lokale Diagnose-Runner `work/restabschluss/diagnose-katalog-worker.mjs` nennt den exakten Node-Aufruf und die bestehende Python-/Cairo-Umgebung; für den finalen Lauf wurde ein eigener Ergebnisdateiname übergeben. Kein breiter Cross-Lauf wiederholt.

## Separater Skip im Root-Cross-Lauf

`app/workshop/r15-module-bank.test.mjs:10` überspringt die Prüfung ausdrücklich, wenn `GRAVURU_REAL_STEEL_DOCUMENT` fehlt. Die Datei erwartet die echte freigegebene r4-Bank mit SHA-256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0` und prüft 251 Originaldesigns, 80 Größen sowie 404 Preise. Diese Eingabe war beim Root-Cross-Lauf nicht gesetzt; der Skip ist **keine bestandene Originalbank-/Live-Abnahme**. Der hier korrigierte Katalogworker-Test hat keinen Skip.

Stand nach Abschluss wieder eingefroren; kein Staging, Commit oder Push durch diesen Agenten.
