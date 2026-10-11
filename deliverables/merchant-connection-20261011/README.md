# Händlerwerkstatt: Shopify-Verbindung

Version `0.1.0-recovery.20261010+f1bc2bcbc0eb`, Quellstand `f1bc2bcbc0eb6472a2294e5f99a9938d53f061c4`.

`gravuru-merchant-connection-20261011.zip`: **27.308.684 Byte**, 411 Manifestdateien. SHA-256:

```
65948648ddc773609fd01ebec2c2a63a92b6fc94e4d882e8f147e5d86f32d563
```

Nur versionierter Code und Ressourcen; keine privaten Datenbanken, Kundendaten oder Geheimnisse. Sämtliche neueren Änderungen einschließlich KI-Stapelgestaltung bleiben enthalten.

Automatische Installation mit `ops/plesk/stage-merchant-release.py`: ZIP und Manifest prüfen, frisches privates Releaseverzeichnis aufbauen, Konfiguration und Build prüfen. Nach Sicherung und Stoppen ausschließlich der Händlerlaufzeit aktiviert `ops/plesk/activate-merchant-release.py` den geprüften Einstieg atomar. Drei Datenbanken, vorheriger Laufzeitcode und private Konfiguration werden vorher gesichert. Vorher sicherstellen, dass kein bezahlter KI-Auftrag läuft. Bestehender `start-r5.cjs`-Weiterleiter bleibt erhalten.

Isolierte Installation und Start mit synthetischen Daten bestanden. [Prüfbericht](../../docs/releases/20261011/connection/RELEASE.md) · [Einrichtung](../../ops/plesk/MERCHANT-README.md).
