# Händler-Testwarenkorb für Revision 4

Version `0.1.0-recovery.20261010+971c57dea374`, Quellcommit `971c57dea37488926026919f6ab410c43a28e5ff`.

- Archiv: `gravuru-merchant-cart-r4-20261011.zip` (27.268.520 Byte)
- SHA-256: `2060089b9a154ab563bad9c812b0e2b7750b692cf4bd63344804989722aedb10`
- 399 geprüfte Manifestdateien plus Manifest; ausschließlich versionierter Code und Ressourcen. Keine privaten Datenbanken, Kunden- oder Zugangsdaten.
- Getrennte Installation/Start sowie Aktivierung/Neustart und synthetisch signierter Bestelleingang bestanden.

Automatisierter Ablauf: Prüfsumme → `ops/plesk/stage-merchant-release.py` → Händlerlaufzeit stoppen → `ops/plesk/activate-merchant-release.py` mit erwarteter Startdateiprüfsumme und neuem privaten Sicherungsverzeichnis → `ops/plesk/pin-merchant-test-cart.mjs BACKUP 4` → Laufzeit starten. Vollständige Parameter stehen in `INSTALLATION.md` im Archiv. Eine bereits laufende Installation benötigt ihre private Konfiguration und Daten separat; das Archiv enthält diese ausdrücklich nicht.

Die Übernahme setzt keine neue Produktrevision automatisch frei. Öffentlicher Checkout, Fertigung und Kundendownload bleiben gesperrt. [Prüfung und Veröffentlichung](../../docs/releases/20261011/cart-r4/RELEASE.md).
