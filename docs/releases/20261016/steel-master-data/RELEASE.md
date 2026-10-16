# Edelstahl-Stammdaten vollständig: Befestigungen und Aufpreise aus dem Shop · 16.10.2026

Nicht installiert. Branch `task/steel-master-data-20261016`.

## Quelle

Shopprodukt „Edelstahlschild selbst gestalten – Variante C“ (`gid://shopify/Product/16121424773500`, Handle `edelstahlschild-designauswahl-variante-c`), am 16.10.2026 **lesend** über die Admin-API abgerufen: 5 Formen, 61 Größen, 7 Befestigungen, 309 Varianten. Gespeichert als `app/designs/steel-door-signs/shopify-variante-c-20261016.json`. Nichts im Shop geändert.

## Ergebnis

- Grundpreise der 61 Größen: **0 Abweichungen** zur Familie aus dem Altprojekt-Seed.
- Bohrbild-Zuordnung (2 oder 4 Löcher je Größe): **0 Abweichungen**.
- Neu in der Familie: Selbstklebend glatt (+2,99 €), selbstklebend rau (+3,99 €), 2 Bohrlöcher (+2,49 €), 2 Schrauben (+2,69 €), 4 Bohrlöcher (+2,89 €), 4 Schrauben (+3,09 €). „Ohne Befestigung“ 0 €.
- Test: Die Familie reproduziert **alle 309 Shop-Varianten** mit SKU und Preis (Werkstatt-SKU `GR-ES-…` ↔ Shop-SKU `GR-C-…`).

## Familienmodell

- Befestigung ohne Löcher: Lage „ohne Löcher“, Anzahl 0 (Klebepads, Magnet …).
- Zubehör „Schrauben“: bohrt wie das zugehörige Bohrbild, eigener Preis und SKU-Endung.
- Oberfläche: Bearbeiten-Formular mit Lage „ohne Löcher“ und Spalte Zubehör.

## Stammdaten-Excel

`scripts/family-excel.py export` erzeugt aus den Familien `Stammdaten-Gravuru.xlsx` (Blätter Materialien, Familien, Größen, Befestigungen, Lesen); `import` liest sie zurück und prüft mit den Werkstattregeln. Rundlauf Export → Import → Vergleich: alle Felder gleich. Kopie: [Stammdaten-Gravuru.xlsx](Stammdaten-Gravuru.xlsx).

## Prüfungen

- `node --test app/workshop/product-families.test.mjs`: 12/12 (neu: 309-Varianten-Abgleich).
- Browser lokal: `check-product-families.py` 12/12, `check-hole-hints.py` 7/7.

## Grenzen

- Shop-SKU-Präfix `GR-C` vs. Werkstatt `GR-ES`: bewusst nicht umbenannt; die Zuordnung ist eindeutig über Form, Größe und Endung.
- Varianten-IDs des Shopprodukts sind noch nicht an Werkstattprodukte gebunden (Paket G).
- Die alte eingebettete Konfigurator-Variante C im Shop bleibt unverändert.
