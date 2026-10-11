# Händlerpaket · Schwarze Edelstahlgravur und Produkt-/Designtabs

- Version: `0.1.0-recovery.20261010+7a168bc66adc`
- Quellcommit: `7a168bc66adc9718bc9b0fefad97c338e546c57d`
- ZIP: `gravuru-merchant-steel-ink-tabs-20261011.zip`, 28.666.379 Byte
- SHA-256: `bbe80f53cc2148323ecfb978051c145fc64d05847d5ec01a285abf9f2209ca51`
- 425 Manifestdateien; getrennte Installation, Build und Start bestanden.

Code, Ressourcen und automatisierter Installationsablauf sind enthalten. Private Datenbanken, Kundendaten, Geheimnisse und private Original-PDFs bleiben außerhalb des Pakets/Repositorys.

Ablauf gemäß [MERCHANT-README](../../ops/plesk/MERCHANT-README.md): `stage-merchant-release.py` prüft Archiv/Prüfsummen, entpackt in ein frisches Releaseverzeichnis, baut und prüft die vorhandene geschützte Konfiguration. `activate-merchant-release.py` erstellt bei gestopptem Händlerprozess und freier Datensperre private Daten-/Laufzeitsicherungen und ersetzt atomar nur dessen Einstieg. Danach ausschließlich diesen Händlerdienst starten. Vorlagen nicht erneut importieren; vorhandene Produktstände werden weiterverwendet.

[Bedienung, Prüfungen und Grenzen](../../docs/releases/20261011/steel-ink-tabs/RELEASE.md).
