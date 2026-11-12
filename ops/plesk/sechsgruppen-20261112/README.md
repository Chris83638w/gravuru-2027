# Sechs neue Kleinproduktgruppen – Pläne auf Wegwerfkopie (12.11.2026)

Umsetzung von `docs/reviews/2026-11-12-main-v7-copy-review/six-new-groups-copy-plan-prerequisites.md` (Astra, `b2a0a19d`).

- `bau-eingaben.mjs <transport> <ziel>` baut lokal aus dem v9-Transport `sg-eingaben.json` (Erwartungswerte je Gruppe) und
  `sg-dokumente.br.teil01` (die sechs Quelldokumente, Brotli mit großem Fenster; nicht eingecheckt, reproduzierbar,
  sha `e3af4aeb319819ffe3db1cbd58ed963dae8ae9a27a769145244ab93db544cd28`).
- `sg-plaene.mjs` läuft auf dem Server neben `vh-netzwaechter.mjs`: Kopie der drei Acryl-Datenbanken aus einer Sicherung,
  nativer Anschluss wie der Acryl-Host, Modul-/Motivprofil, sechs Quellen, sechs Vorlagen, sechs Pläne.
  Kein `confirm`, kein `execute`, kein Netz, keine Live-Datenbank.
- Die entstehenden Kennungen existieren nur auf der Kopie.

## Records der Kopie (`records/`)

**isolated-copy · confirm: 0 · execute: 0.** Alle cfg-/pgt-/pgp-/cmp-/prf-Kennungen in diesem Ordner sind Kopien-IDs der
Wegwerfkopie `private/sicherungen-db/sechsgruppen-20261112T084929Z` und keine Einträge der Live-Registry.

- `sg-records.mjs` (Server, nur lesend, `immutable=1`): schreibt `RECORDS-sechsgruppen.json` (47.037 B, sha `56062c29…12ad`, bleibt auf dem
  Server) und gibt die Kompaktform aus (17.662 B, sha `962b1a3d…f379`).
- `bau-mini.mjs` + `bau-records.mjs` (lokal): bauen aus dem v9-Transport und den gelesenen Serverwerten (Kennungen, Zeiten, planHash,
  Planlänge) die tatsächlichen Records nach. Geprüft: sechs planHashes und sechs Planlängen einzeln; zusätzlich eine Sammelprüfsumme über
  44 Server-Hashes (Modulprofil, Motivprofil, je Gruppe Quelldokument, Revisions-Metadaten, Vorlage, Offering, kompiliertes Produktdokument,
  Fingerprint, planHash): lokal und auf dem Server `41b7c1e4abb59cfeebd1b6a0f9444e8421d331ad5570f020abe69c6bde7dfd37`.
- `records/PINS.json`: Zuordnung Original-Workbook-SHA / sourceCommit / tatsächliche Quellen-, Vorlagen- und Planpins; `SHA256SUMS.txt` für alle Dateien.
- `plan.json.gz` hat die Form von `groups.getPlan` (`id`, `planHash`, Plandokument, `createdAt`), `template.json` die von `groups.get`.
- `ops/plesk/update-beobachtung-20261112/TESTBELEG-updatepilot.json`: bytegleich zur Serverdatei (5.862 B, sha `26bab5af2766026958c9d8793ea32a923268263d360c32b02ed0cefd8d80761b`).
