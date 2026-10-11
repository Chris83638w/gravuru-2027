# Werkstatt-Korrekturen · 11.10.2026

- Version: `0.1.0-recovery.20261010+0754445b6249`
- Quellcommit: `0754445b624961be390286f7575bfaefa080aa70`
- ZIP: `gravuru-merchant-repair-20261011.zip` (27.249.944 Bytes)
- SHA-256: `5f46a8501559972f91bab1405ef4a8600bb6d4f1b22132bf11e1f4ffd5a42bfb`
- 395 Manifestdateien plus Manifest. Keine privaten Datenbanken, Kundendaten, Upload-Originale oder Geheimnisse.

Automatischer Ablauf im Paket: `ops/plesk/stage-merchant-release.py` prüft SHA-256 und alle Manifestdateien, installiert in einen neuen Zielordner und prüft Build und private Laufzeitkonfiguration. `ops/plesk/activate-merchant-release.py` verlangt einen angehaltenen Händlerprozess und die erwartete Prüfsumme der bisherigen Startdatei, sichert private SQLite-Daten, Konfiguration und bisherigen Code und wechselt die Startdatei atomar. Danach die getrennte Händlerlaufzeit starten. Bestehende Testwarenkorb-/Bestellschalter bleiben erhalten. Optionen über `--help`, Voraussetzungen und private Konfiguration in `INSTALLATION.md` des ZIPs.

Neu erforderlich: `fonttools==4.61.1` in der privaten Python-Umgebung; in den Paket-Anforderungen enthalten und durch die Laufzeit-Vorprüfung kontrolliert. Keine globale Python-Änderung.

Isoliert geprüft: Installation und Start, gesperrte anonyme API, idempotente Bestell-/Testwarenkorb-Konfiguration, signierter synthetischer Bestelleingang und Duplikaterkennung nach Neustart. 644 automatisierte Tests sowie Browser-Klickfolge mit synthetischer Identität bestanden. [Bericht und Grenzen](../../docs/releases/20261011/workshop-repair/RELEASE.md).
