# Händlerpaket mit vorbereiteter OpenAI-Gestaltung

Quellcommit: `060a10b9d9238574d05feb4e28e7f72077199fa1`  
Version: `0.1.0-recovery.20261010+060a10b9d923`  
Datei: `gravuru-merchant-ai-design-20261011.zip`, 27.290.658 Byte, 407 Manifestdateien plus Manifest.  
SHA-256: `3f2992715ef47b664e5efa8beb6c7b9b6dd75174678d0502b7f6f261fc733149`

Keine privaten Datenbanken, Kunden-/Bestelldaten oder Geheimnisse. Einrichtung in `INSTALLATION.md` und `ops/plesk/AI-DESIGN.md` innerhalb des Archivs. Ohne geschützten eigenen OpenAI-Schlüssel bleibt die KI-Generierung deaktiviert.

## Automatisierter Ablauf

1. Prüfsumme mit `sha256sum -c gravuru-merchant-ai-design-20261011.sha256` kontrollieren.
2. `ops/plesk/stage-merchant-release.py --archive ZIP --sha256 SHA --target NEUES_PRIVATES_RELEASEVERZEICHNIS --config BESTEHENDE_PRIVATE_KONFIGURATION --node NODE24` prüft und installiert in ein neues Verzeichnis. Konfiguration und private Daten bleiben außerhalb des Archivs.
3. Nur den Händlerprozess von Site 20 gezielt stoppen. `ops/plesk/activate-merchant-release.py --root HAENDLERROOT --release RELEASEVERZEICHNIS --config PRIVATE_KONFIGURATION --backup NEUES_PRIVATES_BACKUPVERZEICHNIS --expected-entry-sha256 AKTUELLER_ENTRY_HASH` sichert Datenbanken/Laufzeit/Konfiguration und wechselt den Einstieg atomar. Bei belegter Datensperre oder geändertem Einstieg wird abgebrochen.
4. Händler-Site 20 neu starten und HTTPS, geschützte Schnittstellen sowie angemeldete Bedienung prüfen. Der bestehende Plesk-Weiterleiter `start-r5.cjs` bleibt erhalten und lädt `app.cjs`; keine globale Webserveränderung.

Kein automatisches Ersetzen privater Daten mit Testdaten. Keine Änderung der bestehenden Kundenwerkstatt oder Shopify-Zahlung. KI-Konfiguration nur nach geschützter Schlüsselablage gemäß Anleitung ergänzen.

[Prüfung, Veröffentlichung und Grenzen](../../docs/releases/20261011/ai-design/RELEASE.md).
