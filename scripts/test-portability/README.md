# Plattformvergleich der Tests

Der Läufer führt alle direkt unter `app/configurator/variant-m/` und `app/workshop/` liegenden `*.test.mjs`-Dateien einzeln und vollständig aus. Für den Windows-Auftrag vom 24.10.2026 sind das 40 + 135 Dateien. Tests in tieferen Unterordnern gehören nicht zu diesen beiden Glob-Mustern.

Benötigt werden Node 24 und eine bereits eingerichtete Python-Umgebung mit den Workshop-Abhängigkeiten. Alle Pfade sind ausdrücklich anzugeben; ohne `--run` entsteht nur das Inventar:

```text
node scripts/test-portability/run-full-tests.mjs --run --repo <Arbeitskopie> --python <Interpreter> --temp <existierender-Testordner> --output <Berichtsordner> --label after --expected-files 175
```

Vorher und nachher müssen denselben Interpreter und Läufer verwenden. Getrennte Arbeitskopien verhindern, dass die Tests ihre generierten Vorschauen gegenseitig überschreiben. Die Tests starten mit der Arbeitskopie als CWD; nur catalog-structure und design-dashboard erhalten ein isoliertes CWD, damit ihre Standardablage keine Projektdateien erzeugt. Unter Windows leitet der Preload ausschließlich den Programmnamen python3 auf den angegebenen Interpreter um. Assertions, Rückgabewerte und Fehler bleiben unverändert.

Jeder Lauf speichert das Dateiinventar mit SHA-256, rohe TAP-Ausgabe, vollständige Node-Testereignisse, native Root-Summary-Zähler und Änderungen an Testquellen beziehungsweise geschützten Verzeichnissen. Ein fehlender Abschluss zählt als unvollständig, niemals als bestanden. Nach zehn Minuten darf der Watchdog nur den zugehörigen hängenden Testprozess beenden; force-exit wird nicht benutzt.

`compare-runs.mjs <Vorher-Laufordner> <Nachher-Laufordner> <Ergebnis.json>` vergleicht Datei, Testname, Verschachtelung und Vorkommen. Es akzeptiert gleiche Altfehler nur als dokumentierte Altfehler. Neue Fehler, fehlende Tests, zusätzliche Skips/TODOs, fehlgeschlagene neue Tests und veränderte Altfehlermeldungen blockieren. Deshalb ist dieser strenge Vergleich für Linux geeignet; die ausdrücklich zulässigen Windows-Capability-Skips werden separat im PR ausgewertet.

Der beigefügte Linux-Workflow ist auf `dev/windows-tests-20261024-astra` und den vereinbarten Basisstand `a1170cb` begrenzt. Er verwendet keine Repository-Secrets. Beide Linux-Läufe teilen dieselben installierten Abhängigkeiten; ihre Versionen werden gespeichert. Windows und Linux können unterschiedliche Paketversionen haben. Das GitHub-Artefakt enthält vollständige Logs; ein grüner Vergleich bedeutet keine neuen Fehler und ist nur bei entsprechend fehlerfreien Rohzählern auch ein vollständig bestandener Testlauf.
