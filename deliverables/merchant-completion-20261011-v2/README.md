# Werkstatt-Bedienung und PDF-Kundenansicht · 11.10.2026

Quellstand `c2d40692ce56b934baccb6b93e29f65890175d56`, Version `0.1.0-recovery.20261010+c2d40692ce56`.

- Paket: [gravuru-merchant-completion-20261011-v2.zip](gravuru-merchant-completion-20261011-v2.zip)
- SHA-256: `1457d4c4ac11a0bf0df453d67d6a2dbf840001fae10c0278cda82e5b7610191b`
- 27.264.804 Bytes, 398 anhand des Manifests prüfbare Quelldateien plus Manifest.
- Keine privaten Datenbanken, Kundendaten, hochgeladenen privaten Originale oder Zugangsdaten enthalten.

Die automatisierten Schritte `ops/plesk/stage-merchant-release.py` und `ops/plesk/activate-merchant-release.py` liegen im Paket. Staging prüft Prüfsumme und Manifest, installiert in ein neues Verzeichnis, baut und prüft die private Laufzeitkonfiguration. Aktivierung prüft die bisherige Startdatei und den exklusiven Datenbank-Lock, sichert Code und private Daten und ersetzt atomar ausschließlich die Startdatei des separaten Händlerhosts. Konfiguration und Geheimnisdatei werden privat vor Ort referenziert. Eine allgemeine Neuinstallation auf einem beliebigen Shop ist damit nicht freigegeben.

[Automatisierter Ablauf und Voraussetzungen](../../ops/plesk/MERCHANT-README.md) · [Release, Bedienung und Prüfungen](../../docs/releases/20261011/completion/RELEASE.md).

Frische isolierte Installation und Start: bestanden. Synthetischer Bestelleingang, wiederholte Einrichtung und doppelte Zustellung nach Neustart: bestanden. Keine neue echte Shopify-Bestellung ausgelöst. Der Nutzer bestätigt den Zugang zur App; die automatisierten Browserprüfungen verwendeten eine synthetische Shopify-Identität.

V2 ergänzt ausschließlich die Absicherung des optionalen Klingelbildes beim Start des alten Editor-Unterbaus. Backend und Installer sind bytegleich zur zuvor geprüften Fassung; außer Builddatei und Versionsmetadaten ist das Paket unverändert. Die tatsächliche PDF-Browserstrecke hat keine fehlenden Bildabrufe mehr. V2 wurde erneut isoliert installiert und gestartet.
