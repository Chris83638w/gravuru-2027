# Händlerpaket · vorhandene Muster · 11.10.2026

- Version: `0.1.0-recovery.20261010+732850e06919`
- Quellcommit: `732850e06919b7bbae1656c2de02b4144d65d6cb`
- ZIP: `gravuru-merchant-specimens-20261011.zip`, 28.647.547 Byte
- SHA-256: `e6a5bf5cc462bf15928822582c5bb2c1073772cb76bc783d9ccd657bc14e7361`
- 417 Manifestdateien; isolierte Installation und Start bestanden.

Die ZIP enthält Code, erhaltene Gestaltungsmittel und Installation. Private Datenbanken, Kundendaten, Zugangsdaten und KI-Schlüssel sind nicht enthalten.

Automatische Installation gemäß `ops/plesk/MERCHANT-README.md`: Archivprüfung, frisches Releaseverzeichnis und Konfigurationsprüfung mit `stage-merchant-release.py`; danach gesicherte Aktivierung mit `activate-merchant-release.py`. Die bestehende private Konfiguration bleibt separat.

Die ausdrückliche, wiederholbare Musterübernahme erfolgt anschließend mit `node ops/plesk/import-existing-specimens.mjs /privater/aktivierungsbackup-pfad` und bereits gesetztem `GRAVURU_SHOPIFY_CONFIG_FILE`. Nur bei gestopptem Händlerprozess; das Skript sperrt die private Ablage exklusiv, prüft auf laufende KI-Aufträge und verlangt eine Aktivierungssicherung. Es erzeugt je einen Master und eine Produktkopie für AOSU/Labrador und Edelstahl/Heimathafen. Keine bestehenden Produktrevisionen werden überschrieben; ein wiederholter Lauf erzeugt keine Duplikate.

[Quellen, Prüfungen und Grenzen](../../docs/releases/20261011/specimens/RELEASE.md).
