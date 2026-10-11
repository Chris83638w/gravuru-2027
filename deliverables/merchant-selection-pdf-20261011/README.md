# Auswahl, bearbeitbare PDFs und Musterfoto · 11.10.2026

Quellstand `4d8042f9412179e8ef1aad16b90d4e83ae8f5b6d`, Version `0.1.0-recovery.20261010+4d8042f94121`.

- Paket: [gravuru-merchant-selection-pdf-20261011.zip](gravuru-merchant-selection-pdf-20261011.zip)
- SHA-256: `31654d1895239829224d2ab86ad96d3b7bb7dee22487733e4602baa4a90578d7`
- 27.263.378 Bytes, 398 anhand des Manifests prüfbare Quelldateien plus Manifest.
- Keine privaten Datenbanken, Kundendaten, hochgeladenen privaten Originale oder Zugangsdaten enthalten.

Die automatisierten Schritte `ops/plesk/stage-merchant-release.py` und `ops/plesk/activate-merchant-release.py` liegen im Paket. Staging prüft Prüfsumme und Manifest, installiert in ein neues Verzeichnis, baut und prüft die private Laufzeitkonfiguration. Aktivierung prüft die bisherige Startdatei und den exklusiven Datenbank-Lock, sichert Code und private Daten und ersetzt atomar ausschließlich die Startdatei des separaten Händlerhosts. Konfiguration und Geheimnisdatei werden privat vor Ort referenziert. Eine allgemeine Neuinstallation auf einem beliebigen Shop ist damit nicht freigegeben.

[Automatisierter Ablauf und Voraussetzungen](../../ops/plesk/MERCHANT-README.md) · [Release, Bedienung und Prüfungen](../../docs/releases/20261011/selection-pdf/RELEASE.md).

Frische isolierte Installation und Start: bestanden. Synthetischer Bestelleingang, wiederholte Einrichtung und doppelte Zustellung nach Neustart: bestanden. Keine neue echte Shopify-Bestellung ausgelöst. Echte Nutzeranmeldung bleibt separat abzunehmen.
