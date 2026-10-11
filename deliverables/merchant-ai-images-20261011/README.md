# Händlerwerkstatt mit KI-Motiven und Musterfotos

Version `0.1.0-recovery.20261010+5698c5fbf10c`, Quellstand `5698c5fbf10c55e47e0b3b4eb40fb566de3cbe9e`.

Archiv: `gravuru-merchant-ai-images-20261011-v2.zip`, **27.297.557 Byte**, SHA-256:

```
b885ef46d652cadff6501353cc061662c4dacb98f4a5905e7feed0c40dbdb165
```

409 Manifestdateien; ausschließlich versionierter Code und Ressourcen. Keine Datenbank, API-Schlüssel oder Kundendaten enthalten. Geschützte Konfiguration und alle drei Datenbanken separat erhalten.

Automatisierter Ablauf über `ops/plesk/stage-merchant-release.py` und `ops/plesk/activate-merchant-release.py` im Archiv: ZIP-Prüfsumme/Manifest prüfen, neues privates Releaseverzeichnis aufbauen, Build und Laufzeitkonfiguration prüfen; vor Aktivierung ausschließlich die Händlerlaufzeit stoppen, Datenbanken und bisherigen Code konsistent sichern, dann den Händler-Einstieg atomar auf das geprüfte Release umstellen. Bestehender `start-r5.cjs`-Weiterleiter bleibt erhalten. [Einrichtung](../../ops/plesk/MERCHANT-README.md) und [KI-Konfiguration](../../ops/plesk/AI-DESIGN.md).

Isolierte Paketinstallation und Start mit synthetischen privaten Daten bestanden. [Prüfbericht und Live-Nachweise](../../docs/releases/20261011/ai-images/RELEASE.md).

Die erste ZIP-Datei ohne `-v2` bleibt als historischer Prüfstand erhalten und wurde nicht aktiviert. Für Neuinstallation oder Aktualisierung ausschließlich `-v2` verwenden.
