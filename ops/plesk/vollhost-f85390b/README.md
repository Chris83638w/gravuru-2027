# Isolierter Zwei-Store-Hosttest f85390b (12.11.2026)

- `vh-erkunden.mjs`: Namen/Größen/SHA der Hostordner (nur lesen).
- `vh-aufbau.mjs`: Wegwerfumgebung `private/vollhost-f85390b-20261112/` aus Kandidat, Legacy-Release, DB-Sicherungen; synthetisches App-Secret.
- `vh-netzwaechter.mjs`: Vorlademodul, begrenzt Netzausgang des Testprozesses auf Loopback.
- `vh-sitzung.mjs` / `vh-sitzung2.mjs`: startet `scripts/acryl-employee-entry.cjs` der Kopie auf 127.0.0.1:18979 und fährt eine signierte Kundensitzung (Start, Modell, Galerie/Suche, Vorschau, Designwechsel, ≥ 65 s); Wächter Host 4.000 MiB / Konto 8.000 MiB.

Ergebnisse: Issue #168.
