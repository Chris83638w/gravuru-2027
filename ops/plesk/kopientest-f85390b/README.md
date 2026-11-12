# Kopientest f85390b und Legacy-Sicherung (12.11.2026)

- `rt_bauen6.py`, `rt-einrichten-e.mjs`, `rt-f85390bd-e.json`: Programmordner `private/kandidat-f85390b-20261112/` = Git `f85390b` (Baum-SHA `468a7e08…`).
- `kt2-lauf.mjs`: Galerie kalt/reopen mit Astras Messwerkzeug, Wächter 1,8 GB Prozess / 3,3 GB Konto, SHA der Kopie vor/nach, Cache-Payloadbytes.
- `kt-prozesse2.mjs`: sichtbare Prozesse des Kontos mit Speicher (nur lesen).
- `kt-legacy-sicherung.mjs`: Online-Sicherung des Legacy-Stores (`private/gravuru-2027-merchant-data`) nach `private/sicherungen-db/legacy/`, optional Arbeitskopie.
- `kt-legacy-klein.mjs`: Astras Kleinidentitätshelfer auf der Legacy-Arbeitskopie, Schemaflag aus der Kopie abgelesen.

Ergebnisse: Issue #168.
