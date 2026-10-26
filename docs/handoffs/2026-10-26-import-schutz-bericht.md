# Import-Schutz · Astra-Nachtrag C · 26.10.2026

Code `2e71a623db239766114d595f057186c45d399d65`, Basis main `af8f5545`. Eigener Branch `dev/import-schutz-20261026-astra`. Auftrag: [Nachträge A–C](2026-10-26-astra-nachtraege.md).

## Verhalten

- `katalog-import --commit` liest die Zieldatenbank und die benachbarte `profiles.sqlite` mit schreibgeschützten SQLite-Verbindungen. Die Prüfung läuft vor `createWorkshop`, dessen Registry und Hilfsablagen schon beim Öffnen schreiben können.
- Bestehendes workshop-Schema unter 4 oder profiles-Schema unter 2: Abbruch mit vollständigem Dateipfad und Hinweis auf `--migrieren`. Auch eine vorhandene leere Datei mit Version 0 braucht dieses ausdrückliche Flag. Neue Datenbankdateien dürfen ohne Flag angelegt werden. Neuere als unterstützte Schemata bleiben auch mit Flag gesperrt.
- Vor dem ersten Schreibzugriff erscheinen absoluter Zielpfad, tatsächlicher CLI-Mandant `gravuru`, vorhandene Produktanzahl insgesamt/eigener Mandant (einschließlich Master) und beide Schemastände. Vor dem Produktimport folgt die Anzahl neuer, aktualisierter, unveränderter und gesperrter Produkte.
- `--hauptprodukt` schließt Unterkategorien ohne die gewählte Kennung vor Schriftprofil- und Produktplanung aus. Fehlende oder leere mainProducts erzeugen in diesem Modus keine anonymen Ersatzprodukte; zusätzliche Größen-/Unterkategoriefilter bleiben wirksam.
- Beide Plesk-Anleitungen nennen **App neu starten** nach jedem Deploy, Prüfung des lsnode-Prozessalters und **kein Prozentzeichen im Befehlsfeld von Plesk-Aufgaben**. Deaktivieren/Aktivieren allein ist kein Prozessneustart.

## Nachweise

Windows, Node 24.20.0: **68 Tests bestanden, 0 Fehler, 0 Skips**, sechs Dateien (CLI, Import, Konvertierung, Familien, Mandanten, Shop-Abgleich).

[Zähler](import-schutz/windows-summary.json) · [vollständiges unverändertes Testlog, gzip](import-schutz/windows-tests.log.gz).

Die CLI-Tests verwenden ausschließlich temporäre SQLite-Dateien: v3-Abbruch vor jeder Mutation (Datei bytegleich, keine zusätzlichen Ablagen), alte profiles-Datei bei noch fehlender workshop-Datei, Version 0, ausdrückliche Migration echter v3/v1-Tabellen auf v4/v2, neue Ablage ohne Flag, unveränderter Legacy-Pfad im Dry-run und getrennte Mandantenzählung. Alle Verbindungen werden vor dem Löschen geschlossen.

Der Hauptprodukt-Test prüft ausgewählte, fremde, leere und fehlende mainProducts sowie unbekannte Kennung und Schnittmenge mit dem Unterkategoriefilter. Keine Assertions abgeschwächt. Der Prüfaufruf verwendet den vorhandenen Python-Interpreter, PYTHONUTF8=1 und ein privates TEMP.

## Übergabe an Claude

Bitte diesen eigenständigen PR gegen main prüfen. Keine Freigabe für eine echte Migration erteilt. Keine echten Katalog- oder Datenbankänderungen, kein Live-Zugriff, kein PR-Merge, kein Force-Push. Weg zur Testbestellung bleibt bei Claude.
