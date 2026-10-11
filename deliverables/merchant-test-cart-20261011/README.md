# Händler-Testwarenkorb · 11.10.2026

- Version: `0.1.0-recovery.20261010+ffdd150c8cd9`
- Quellcommit: `ffdd150c8cd983b1bdae553a378b8720b29dff79`
- ZIP: `gravuru-merchant-test-cart-20261011.zip` (27.243.492 Bytes)
- SHA-256: `d42efe985f031d245af4e18967c11fabea45038d4734d4d04e13a49fa3471b7a`
- 392 geprüfte Manifestdateien; keine Datenbanken, Kundendaten oder Geheimnisse.

Automatisierung im Paket: `ops/plesk/stage-merchant-release.py` prüft die Prüfsumme und sämtliche Manifestdateien, installiert in einen frischen Zielordner und prüft Build/Konfiguration. `ops/plesk/activate-merchant-release.py` erstellt vor dem atomaren Wechsel eine konsistente private SQLite-/Konfigurations-/Laufzeitsicherung und verlangt die erwartete alte Startdatei-Prüfsumme. Die Händlerlaufzeit muss dafür gestoppt sein. Danach aktiviert `ops/plesk/enable-merchant-test-cart.mjs` mit dem privaten Aktivierungsbackup den begrenzten Testweg; anschließend die Händlerlaufzeit starten. Vollständige Optionen mit `--help`; Voraussetzungen und private Konfiguration in `INSTALLATION.md`.

Isoliert geprüft: Installation und Start, geschützte API, zweimalige unverändernde Aktivierung, signierter synthetischer Bestelleingang und Duplikaterkennung nach Neustart. [Nachweise](../../docs/releases/20261011/test-cart/RELEASE.md). Eine echte Shopify-Bestellung wird dadurch nicht behauptet.
