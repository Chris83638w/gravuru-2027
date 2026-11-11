# Kopientests e49659f (11./12.11.2026)

Operator-Werkzeuge für #168 (Astras Reparatur `e49659f`), alle nur lesend auf der Datenbank-Arbeitskopie
`private/sicherungen-db/arbeitskopie-20261111T195242Z/workshop.copy.sqlite`; Ergebnisse privat in
`private/sicherungen-db/kopientest-e49659f-20261111/`.

- `rt_bauen5.py`, `rt-einrichten-d.mjs`, `rt-e49659fe-d.json`: zweiter Programmordner `private/kandidat-e49659f-20261111/` = Git `e49659f` (Baum-SHA `b00de1f5…`).
- `kt-lauf.mjs`: `galerie-kalt | galerie-reopen | kategorien | klein | status` – Astras Werkzeuge unverändert, mit Wächter (1,8 GB Prozess / 3,3 GB Konto).
- `kt-diag.mjs`: Form der aktiven Bindungen (Zeilen je Produktstand, Beleggrößen).
- `kt-galerie-diag.mjs`: derselbe Galerie-Messablauf, Messereignisse sofort ausgegeben.
- `repro-stamp.mjs`: lokale Nachstellung an synthetischer DB (Beleg wird je Bindungszeile neu gelesen).

Ergebnis: siehe Issue #168.
