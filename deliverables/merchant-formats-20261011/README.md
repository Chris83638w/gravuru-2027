# Händlerpaket · Formate, Katalog und Hilfslinien

- Version: `0.1.0-recovery.20261010+880f124948c7`
- Quellcommit: `880f124948c7e884a8a36d5636bff0a99fbbd2ee`
- ZIP: `gravuru-merchant-formats-20261011.zip`, 28.664.415 Byte
- SHA-256: `e0d07f0cabda3331795d6d82d3e9facaba835770f3e20e75c4fb2b764edc193d`
- 425 Manifestdateien; getrennte Installation, Build und Start mit synthetischen Daten bestanden.

Code, Ressourcen und Installationsablauf sind enthalten. Private Datenbanken, Kundendaten, Geheimnisse und private Original-PDFs bleiben außerhalb des Pakets/Repositorys.

Automatisierter Ablauf gemäß `ops/plesk/MERCHANT-README.md`: `stage-merchant-release.py` prüft Archiv-SHA-256, entpackt in ein frisches Releaseverzeichnis, baut und prüft die vorhandene geschützte Konfiguration. `activate-merchant-release.py` erstellt bei gestopptem Händlerprozess und freier Datensperre Daten-/Laufzeitsicherungen und ersetzt atomar nur dessen Einstieg. Danach ausschließlich diesen Händlerdienst starten. Vorlagen nicht erneut importieren; bestehende Produktstände werden weiterverwendet.

Für die optionale Shopify-Entwurfsübertragung kann die geschützte Konfiguration `GRAVURU_SHOPIFY_DRAFT_TRANSFER: "draft-only"` enthalten. Benutzt die vorhandene eigene App mit `write_products`; Token bleibt ausschließlich im Prozessspeicher. Keine zusätzliche öffentliche Kunden-/Checkout-Freigabe.

[Bedienung, Prüfungen und Grenzen](../../docs/releases/20261011/formats/RELEASE.md).
