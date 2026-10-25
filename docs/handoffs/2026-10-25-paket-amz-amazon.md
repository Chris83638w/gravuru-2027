# Paket AMZ · umgezogen (25.10.2026)

Der Auftrag für den Amazon-Strang (Listing-Export, Custom-Vorlagen, Bestell-Import) liegt jetzt im eigenen privaten
Repo **`gravuru-customer-amazon`**, zusammen mit der Amazon-Referenz (Regeln, Grenzen und Quellen vom 25.10.2026):

- Auftrag: `docs/handoffs/2026-10-25-paket-amz-amazon.md` im Repo `gravuru-customer-amazon` (`main` ≥ 14515f0)
- Referenz: `docs/CUSTOM-UPLOAD-REFERENZ-20261025.md` im selben Repo

Hier steht nichts mehr, damit es nur eine Wahrheit gibt. Die frühere Fassung dieser Datei (Commit `f0f83ab`) ist nur noch
Historie. Wichtigste Korrekturen gegenüber dort: Das „10-statt-4-Textfelder-Problem“ ist nach Amazons Anleitung ein
Bedienfehler (nicht benötigte Komponenten bleiben leer), und der gesamte Code des Pakets entsteht im neuen Repo.

K15 (`scripts/import-amazon-order.py`, Branch `dev/konfi-neu-K15-amazon-import`) bleibt bis zur Übernahme hier liegen. Der
Account, der Paket AMZ baut, holt ihn in das neue Repo (Herkunft im Commit-Text). Die Anbindung an die Werkstatt kommt
später über `gravuru-order/v1` und `amazon/listings.json`.
