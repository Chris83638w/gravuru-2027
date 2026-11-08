# Edelstahl: geprüfte Startvariante und vollständiger Variantenvergleich

08.11.2026, Vorprüfung 01:42 UTC, Nachprüfung 01:45 UTC. Beide Snapshots stammen aus jeweils neun paginierten, ausschließlich lesenden Shopify-API-Abfragen. Der Hauptagent führte dazwischen genau einen `productVariantsBulkReorder` aus; dieser Prüfagent hatte keine Shop-Schreibzugriffe.

Produkt **16190784438652** bleibt **DRAFT**. Bestehende Variante **58104606556540**, SKU **156-GR-ES-AB-120X80-T15-K00**, abgerundetes Rechteck **12 × 8 cm / ohne Bohrung**, steht jetzt von Position 166 kommend auf Position 1 für **19,99 €**. Die frühere erste Variante 58104601149820 bleibt für 9,49 € erhalten, nun an Position 2.

## Vollständiger Vergleich

- **404/404** Varianten-IDs, SKUs, Preise und konkrete Zuordnung zu Form/Größe/Befestigung unverändert.
- **404/404** Verfügbarkeiten und Lagerregeln unverändert: `availableForSale=true`, `inventoryPolicy=CONTINUE`.
- Reihenfolge exakt: Zielvariante vorangestellt, relative Reihenfolge der übrigen 403 erhalten; Positionen 1–404 lückenlos.
- Beide Optionsachsen und alle 80 Größen-/7 Befestigungswerte erhalten.
- Beobachtete native Folge: Shopify stellt den bereits vorhandenen Optionswert „Rechteck abgerundet · 12 × 8 cm“ von Wertposition 34 auf 1. Die übrigen 79 Werte behalten ihre relative Reihenfolge; die sieben Befestigungswerte bleiben vollständig unverändert. Dies gehört zum vom Hauptagenten bestätigten Startwert.
- Bestandsmengen: Vor-/Nachvergleich für **51** Varianten, ohne Änderung. Der aktuelle Nachstand enthält 404 Nullmengen; für die übrigen 353 lag keine vollständige frische Mengenbaseline vor. **Kein vollständiger Mengenvergleich über 404 Varianten behauptet.**
- Alle 404 Preise waren in der Vorprüfung zusätzlich gegen den bestehenden nativen Importplan gleich.

## Nachweise und Hashes

| Datei | SHA256 |
|---|---|
| [before.json](before.json) | `22fc51439778586576c7a902b721c7ab91ce3a27a4a04adf0651c986d4b11490` |
| [after.json](after.json) | `0758f455f177caaa0f0b27355181f44ae2303b9432e6593cd3fbd803aa405673` |

[Maschinenlesbare Prüfung](verification.json). Dies sind vollständige Varianten-Snapshots der genannten Felder, **kein vollständiger Shopbackup**. Keine Kundendaten, Zugangsdaten oder Bestellungen enthalten. Der Commit ändert ausschließlich Prüfunterlagen und Status, keine Laufzeitdateien.

## Wirkung und Abnahmegrenze

Die frische Theme-Quelle rendert Haupt-/Sticky-Preis mit `use_variant:true`. Ohne `?variant` verwendet Shopify die erste verfügbare Variante, sodass derselbe 19,99-Start wie PR 198 und das Hauptbild verwendet werden kann. Explizite Variantenauswahl bleibt vorrangig. Der günstigste Variantenpreis `price_min` bleibt korrekt 9,49 €.

Die komplette Produktseite ohne/mit `?variant`, der Startlink und der Warenkorb werden vom Hauptagenten separat geprüft. Der API-Vergleich allein ist **keine** Storefront-/Checkout-Freigabe.

## API-Begründung

Die [native Reorder-Mutation](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/productVariantsBulkReorder) ändert die Position bestehender Varianten. Für `positions` wurden nur Ziel-ID und **position:1** übergeben. Die [aktuelle Inputreferenz](https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/ProductVariantPositionInput) und das tatsächlich gelesene Connector-Schema definieren die erste Position als 1. Der tatsächliche Nachreadback bestätigt dieses Ergebnis. [Liquid-Auswahlregel](https://shopify.dev/docs/api/liquid/objects/product#product-selected_or_first_available_variant).
