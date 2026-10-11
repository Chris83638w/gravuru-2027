# Händlerwerkstatt mit KI-Motiven und Musterfotos

Version `0.1.0-recovery.20261010+f46937331d38`, Quellstand `f46937331d382e519994aadd80915b674a4dac63`.

Archiv: `gravuru-merchant-ai-images-20261011.zip`, **27.297.057 Byte**, SHA-256:

```
2e8a9ed8927255a6a9d6a0b871a1796064e1b5a90ee8ccafc80e498857c506fb
```

409 Manifestdateien; ausschließlich versionierter Code und Ressourcen. Keine Datenbank, API-Schlüssel oder Kundendaten enthalten. Geschützte Konfiguration und alle drei Datenbanken separat erhalten.

Automatisierter Ablauf über `ops/plesk/stage-merchant-release.py` und `ops/plesk/activate-merchant-release.py` im Archiv: ZIP-Prüfsumme/Manifest prüfen, neues privates Releaseverzeichnis aufbauen, Build und Laufzeitkonfiguration prüfen; vor Aktivierung ausschließlich die Händlerlaufzeit stoppen, Datenbanken und bisherigen Code konsistent sichern, dann den Händler-Einstieg atomar auf das geprüfte Release umstellen. Bestehender `start-r5.cjs`-Weiterleiter bleibt erhalten. [Einrichtung](../../ops/plesk/MERCHANT-README.md) und [KI-Konfiguration](../../ops/plesk/AI-DESIGN.md).

Isolierte Paketinstallation und Start mit synthetischen privaten Daten bestanden. [Prüfbericht und Live-Nachweise](../../docs/releases/20261011/ai-images/RELEASE.md).
