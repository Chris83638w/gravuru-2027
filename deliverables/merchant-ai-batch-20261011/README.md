# Händlerwerkstatt mit KI-Stapelgestaltung

Version `0.1.0-recovery.20261010+0b64e8751d51`, Quellstand `0b64e8751d51e04560490825a610df9674de79d3`.

Archiv `gravuru-merchant-ai-batch-20261011.zip`: **27.307.332 Byte**, 411 geprüfte Manifestdateien, SHA-256:

```
14d9983cea741058ec838e22c09ca1f3732bfa978351d97090027698fa1801c0
```

Nur versionierter Code und Ressourcen; keine Datenbank, Kundendaten oder Geheimnisse. Neue Warteschlangentabellen entstehen in der vorhandenen privaten Werkstattdatenbank. Bestehende Aufträge und Kostenjournal bleiben erhalten.

Automatisiert installieren: `ops/plesk/stage-merchant-release.py` prüft ZIP/Manifest, richtet ein neues privates Releaseverzeichnis ein und prüft Build/Konfiguration. Nach Sicherung und Stoppen ausschließlich der Händlerlaufzeit aktiviert `ops/plesk/activate-merchant-release.py` den geprüften Stand atomar und sichert vorher alle drei Datenbanken sowie bisherigen Laufzeitcode und private Konfiguration. Vorher sicherstellen, dass kein bezahlter KI-Auftrag läuft. `start-r5.cjs` und ältere Kundenwerkstätten bleiben erhalten.

Isolierte Installation/Start mit synthetischen Daten bestanden. [Prüfung und Bedienung](../../docs/releases/20261011/ai-batch/RELEASE.md) · [Einrichtung](../../ops/plesk/MERCHANT-README.md) · [KI-Betrieb und Kosten](../../ops/plesk/AI-DESIGN.md).
