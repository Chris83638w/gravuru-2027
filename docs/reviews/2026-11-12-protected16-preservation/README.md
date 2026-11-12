# Geschützte 16 Altprodukte: unabhängiger Vorher-/Nachhervergleich

Am 12.11.2026 wurden dieselben 16 zuvor festgelegten Shopify-Produkte über den verbundenen Shopify-Leseconnector vollständig mit `get_product` abgerufen. Jedes Produkt hat genau eine Variante; alle Varianten dieses Umfangs sind daher enthalten.

- Vorher: 16:55:21.084–16:55:28.299 UTC, vor den Shopänderungen des genehmigten Pakets.
- Nachher: 18:14:36.000–18:14:38.067 UTC, nach Claudes im Chat gemeldetem vollständigen Main-Abschluss mit 19/19 Bedingungen.
- Ergebnis: 16/16 weiterhin ACTIVE; alle verglichenen Produktfelder und Variantenkennungen/-preise unverändert, keine Unterschiede.

Verglichen wurden alle tatsächlich zurückgegebenen Produktfelder einschließlich Titel, Beschreibung, Anbieter, Typ, Status, Tags, Bilder/Medienkennungen, Hauptbild-URL, Variantenanzahl sowie Varianten-ID, Titel, Preis und SKU. Tagreihenfolge und Variantenreihenfolge werden zur sachlichen Prüfung normalisiert. Inventarmengen werden ausgelassen, weil laufende Bestellungen sie verändern können. Das ist ausdrücklich kein Vergleich ungesichteter Metafelder oder ein unveränderter kompletter Shopify-Datenbankstand.

Die unveränderten Rohlesungen stehen in `protected16-before.json` und `protected16-after.json`; `protected16-comparison.json` enthält jede der 16 Prüfungen. `compare-protected16.py` ist der tatsächlich verwendete enge Vergleich, Exit 0. Es erfolgten ausschließlich Leseaufrufe; keine Produktmutation und keine Bestellung.
