# Update-Beobachtung Hauptacryl (12.11.2026)

`uo-beobachtung.mjs` lief auf dem Server gegen eine neue Wegwerfkopie der drei Acryl-Datenbanken (Sicherung `20261111T212859Z`),
Module aus `kandidat-f85390b-20261112`. Ausgeführt: `captureUpdateObservation`, CLI `prepare`, CLI `verify`. Kein Update.

- `observation.json` – bytegleich zur Serverdatei, SHA-256 `4577f555e1ee270f225d60ef68ebfceca973246309b675022139dc7ef3d23ec3`
- `main-update-review.json` – bytegleich zur Serverdatei, SHA-256 `d980417e45469b4d34f2fbd9abff746cf6cdbe7864e67b2f416fc2561f7ad8d8`, `reviewHash` `8e8814cabbddb0354e0af029e1bdb09f0a668f69af03dd056792a99c6b7d517d`

Das ist ein Prüfbeleg, keine Freigabe: `executeApprovedUpdate` wurde nicht aufgerufen, es gibt keine Zustimmungsakte.
