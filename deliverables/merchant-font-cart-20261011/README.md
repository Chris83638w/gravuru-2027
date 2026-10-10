# Händlerwerkstatt: Schrift und Warenkorbpreis – 11.10.2026

Version `0.1.0-recovery.20261010+77b0472fb5fc`, Quellcommit `77b0472fb5fc5adc82dd3af4bccdf6787900b1ba`.

- Paket: `gravuru-merchant-font-cart-20261011.zip`, 27.230.534 Byte.
- SHA-256: `4d2b7142276482fdb5e95e5f5b84091516dceef280c5ada4e7b7c66fd22365e3`.
- Enthält 385 geprüfte Laufzeitdateien plus Manifest, einschließlich automatischem Installer und Aktivierungshelfer.
- Keine Zugangsdaten, Datenbanken, Kundendaten oder privaten PDF-Originale. Vorhandene private Konfiguration und Daten werden getrennt benötigt.

## Automatischer Ablauf

1. SHA-256 anhand der beiliegenden Datei prüfen (`sha256sum -c gravuru-merchant-font-cart-20261011.sha256`).
2. `ops/plesk/install-archive.py`, `stage-merchant-release.py` und `activate-merchant-release.py` aus dem geprüften ZIP in ein neues privates Hilfsverzeichnis extrahieren.
3. `stage-merchant-release.py --archive <ZIP> --sha256 <Prüfsumme> --target <neues privates Release-Verzeichnis> --config <vorhandene private Händler-Konfiguration> --node <Node-24-Pfad>` ausführen. Prüft alle Dateien, erstellt den Build und prüft die Laufzeitkonfiguration.
4. Ausschließlich den bestehenden getrennten Händlerprozess anhalten. `activate-merchant-release.py --root <gravuru-2027-merchant> --release <Release-Verzeichnis> --config <Konfiguration> --backup <neues privates Sicherungsverzeichnis> --expected-entry-sha256 <vorher geprüfte Startdatei-Prüfsumme>` ausführen. Exklusive Datenbanksperre, konsistente Sicherung aller drei SQLite-Dateien und der bisherigen Start-/Laufzeitdateien; erst danach atomarer Wechsel der Startdatei.
5. Im noch angehaltenen Händlerbereich optional die hier ausdrücklich autorisierte Produktübernahme ausführen: `GRAVURU_SHOPIFY_CONFIG_FILE=<Konfiguration> node <Release-Verzeichnis>/ops/plesk/upgrade-memorial-font.mjs <Sicherungsverzeichnis>`. Der Helfer ist auf die dokumentierte Gedenktafel und Händleradresse begrenzt. Er prüft Sicherungen, Produktstand und reale Shopify-Varianten lesend; speichert Cormorant Garamond als neue Revision und neun unveränderliche Preisbindungen. Nach Abbruch den Ergebnisbeleg prüfen; ausschließlich die dokumentierte, idempotente Fortsetzung verwenden.
6. Händlerprozess starten; HTTPS-Seiten, geschützte API und aktive Startdatei prüfen. Aktuelle private Daten anschließend erneut konsistent sichern. Andere Werkstatt-/Shopify-Module werden dadurch nicht umgeschaltet.

[Isolierte Installationsprüfung](../../docs/releases/20261011/merchant-package-install.json) und [zweifache Übernahmeprüfung mit geschützter neuerer Revision](../../docs/releases/20261011/packaged-font-upgrade-check.json) bestanden. [Gesamtbericht](../../docs/releases/20261011/CART-INTEGRATION.md).

Das Paket enthält die vorbereitete Warenkorb-Preissicherung; es schaltet keine echte Bestellung, Zahlung oder Produktion frei.
