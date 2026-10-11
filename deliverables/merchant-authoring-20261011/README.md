# Händlergestaltung · 11.10.2026

Quellstand `74e767062ff6b45e9ddde07f8283924c4379f218`, Version `0.1.0-recovery.20261010+74e767062ff6`.

- Paket: [gravuru-merchant-authoring-20261011.zip](gravuru-merchant-authoring-20261011.zip)
- SHA-256: `43cb6c6c53ff5bfeb78e6c8ac0f82e51d4765d80c1058860c17ef97feffca2b7`
- 27.255.902 Bytes, 396 anhand des Manifests prüfbare Quelldateien plus Manifest.
- Keine privaten Datenbanken, Kundendaten, hochgeladenen Foto-/Schriftoriginale oder Zugangsdaten enthalten.

Die automatisierten Schritte `ops/plesk/stage-merchant-release.py` und `ops/plesk/activate-merchant-release.py` liegen im Paket. Staging prüft Prüfsumme und Manifest, installiert in ein neues Verzeichnis, baut und prüft die private Laufzeitkonfiguration. Aktivierung prüft die bisherige Startdatei und den exklusiven Datenbank-Lock, sichert Code und private Daten und ersetzt atomar ausschließlich die Startdatei des separaten Händlerhosts. Konfiguration und Geheimnisdatei werden privat vor Ort referenziert. Eine allgemeine Neuinstallation auf einem beliebigen Shop ist damit nicht freigegeben.

[Automatisierter Ablauf und Voraussetzungen](../../ops/plesk/MERCHANT-README.md) · [Release und Prüfungen](../../docs/releases/20261011/design-authoring/RELEASE.md).

Frische isolierte Installation und Start: bestanden. Synthetischer Bestelleingang, wiederholte Einrichtung und doppelte Zustellung nach Neustart: bestanden. Keine echte Shopify-Bestellung ausgelöst.
