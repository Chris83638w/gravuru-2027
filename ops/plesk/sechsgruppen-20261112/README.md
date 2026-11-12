# Sechs neue Kleinproduktgruppen – Pläne auf Wegwerfkopie (12.11.2026)

Umsetzung von `docs/reviews/2026-11-12-main-v7-copy-review/six-new-groups-copy-plan-prerequisites.md` (Astra, `b2a0a19d`).

- `bau-eingaben.mjs <transport> <ziel>` baut lokal aus dem v9-Transport `sg-eingaben.json` (Erwartungswerte je Gruppe) und
  `sg-dokumente.br.teil01` (die sechs Quelldokumente, Brotli mit großem Fenster; nicht eingecheckt, reproduzierbar,
  sha `e3af4aeb319819ffe3db1cbd58ed963dae8ae9a27a769145244ab93db544cd28`).
- `sg-plaene.mjs` läuft auf dem Server neben `vh-netzwaechter.mjs`: Kopie der drei Acryl-Datenbanken aus einer Sicherung,
  nativer Anschluss wie der Acryl-Host, Modul-/Motivprofil, sechs Quellen, sechs Vorlagen, sechs Pläne.
  Kein `confirm`, kein `execute`, kein Netz, keine Live-Datenbank.
- Die entstehenden Kennungen existieren nur auf der Kopie.
