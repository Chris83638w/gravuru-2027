# Werkstatt-Bedienung und PDF-Kundenansicht · 11.10.2026

Quellstand `cdb840ddbac077c234daa53dc7eca288f920b79e`, Version `0.1.0-recovery.20261010+cdb840ddbac0`.

- Paket: [gravuru-merchant-completion-20261011.zip](gravuru-merchant-completion-20261011.zip)
- SHA-256: `bc9f3a9994c05f7b14d2d1f2f3f91c495652b428c5822ed90c846b5347cec78b`
- 27.264.680 Bytes, 398 anhand des Manifests prüfbare Quelldateien plus Manifest.
- Keine privaten Datenbanken, Kundendaten, hochgeladenen privaten Originale oder Zugangsdaten enthalten.

Die automatisierten Schritte `ops/plesk/stage-merchant-release.py` und `ops/plesk/activate-merchant-release.py` liegen im Paket. Staging prüft Prüfsumme und Manifest, installiert in ein neues Verzeichnis, baut und prüft die private Laufzeitkonfiguration. Aktivierung prüft die bisherige Startdatei und den exklusiven Datenbank-Lock, sichert Code und private Daten und ersetzt atomar ausschließlich die Startdatei des separaten Händlerhosts. Konfiguration und Geheimnisdatei werden privat vor Ort referenziert. Eine allgemeine Neuinstallation auf einem beliebigen Shop ist damit nicht freigegeben.

[Automatisierter Ablauf und Voraussetzungen](../../ops/plesk/MERCHANT-README.md) · [Release, Bedienung und Prüfungen](../../docs/releases/20261011/completion/RELEASE.md).

Frische isolierte Installation und Start: bestanden. Synthetischer Bestelleingang, wiederholte Einrichtung und doppelte Zustellung nach Neustart: bestanden. Keine neue echte Shopify-Bestellung ausgelöst. Der Nutzer bestätigt den Zugang zur App; die automatisierten Browserprüfungen verwendeten eine synthetische Shopify-Identität.
