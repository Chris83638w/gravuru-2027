# Änderungsplan: Edelstahl-Türschild – Kleinformate 5 × 2, 6 × 2, 8 × 2 aus dem Produkt herauslösen (Entwurf v1)

Stand 10.11.2026, Station 1 (Issue #230), Regel #227 („Änderungen an vorhandenen Produkten werden als eigener Änderungsplan mit Vorher/Nachher dargestellt“).

**Status: ENTWURF. Nichts geändert, nichts angelegt, kein Shopify-Zugriff, kein Produktivcode. Umsetzung erst nach ausdrücklicher Freigabe dieses Änderungsplans durch Chris.**

## Anlass und Entscheidung

- Chris, Claude-Chat 10.11.2026, 14:11 (wörtlich): „5x2 bis 8x2 sind keine skalierbare Größen und daher einzelne produkte“.
- Chris, Claude-Chat 10.11.2026, 14:25 (wörtlich): „7x2,33 gehört zud en skalierbarenb größen, die kleinformate haben gesonderte motive. FIligrane oder große Motive sind da nicht umsetzbar.. 3. Ja Edelstahl und Acrylglas sind gleich“.
- Folge laut Operator-Auslegung: 5 × 2, 6 × 2 und 8 × 2 werden auch beim Edelstahl eigene Produkte. 7 × 2,33 bleibt im Produkt.

## Vorher (Live-Produkt, Rücklesestand 08.11.2026)

- Shopify-Produkt 16190784438652, Status DRAFT (Rücklesestand 08.11.; aktueller Status nicht geprüft), Quelle: `docs/reviews/2026-11-08-steel-default-variant/after.json` auf `origin/dev/mika-gallery-lifecycle-integration-20261110` (8a06782).
- 80 Größen („Form & Größe“), 404 Varianten (SKU-Präfix `156-`), Option „Befestigung“ mit 7 Werten.
- Darin 5 × 2, 6 × 2 und 8 × 2 mit je 5 Varianten (ohne Bohrung, Kleben glatt, Kleben rau, 2 Bohrlöcher, 2 Schrauben).

## Nachher (Entwurf)

- Hauptprodukt Edelstahl: **77 Größen**, **389 Varianten** (404 − 15). Start-Variante (Rechteck abgerundet 12 × 8, ohne Bohrung, 19,99 €) bleibt unberührt.
- Drei neue eigene Produkte (Entwürfe, nichts angelegt): `docs/produktfreigaben/Tuerschild-Edelstahl-5x2_v1.xlsx`, `-6x2_v1.xlsx`, `-8x2_v1.xlsx`, je 1 Größe und 5 Varianten.
- Acryl-Gegenstück: Hauptprodukt `Tuerschild-Acrylglas-3mm_v4.xlsx` (77 Größen) und Kleinformate `Tuerschild-Acrylglas-3mm-5x2_v2.xlsx`, `-6x2_v2.xlsx`, `-8x2_v2.xlsx`.
- Kleinformate haben gesonderte Motive (Chris 14:25); Auswahl offen (Live-Konfi-Kategorie „Motive kleine Schilder“, Katalog `motive/motive-kleine-schilder`, 14 Motive – ob genau diese, ist eine offene Frage an Chris/Mika).

## Varianten, die aus dem Live-Produkt entfallen (15)

| SKU | Variant-ID | Form & Größe | Befestigung | Preis € |
|---|---|---|---|---|
| 156-GR-ES-RE-50X20-T15-K00 | 58104603935100 | Rechteck · 5 × 2 cm | Ohne Bohrung | 7.99 |
| 156-GR-ES-RE-50X20-T15-KGL | 58104603967868 | Rechteck · 5 × 2 cm | Selbstklebend – glatte Flächen | 10.98 |
| 156-GR-ES-RE-50X20-T15-KRA | 58104604000636 | Rechteck · 5 × 2 cm | Selbstklebend – raue Flächen | 11.98 |
| 156-GR-ES-RE-50X20-T15-B02 | 58104604033404 | Rechteck · 5 × 2 cm | Mit 2 Bohrlöchern | 10.48 |
| 156-GR-ES-RE-50X20-T15-B02S | 58104604066172 | Rechteck · 5 × 2 cm | Mit 2 Schrauben | 10.68 |
| 156-GR-ES-RE-60X20-T15-K00 | 58104601477500 | Rechteck · 6 × 2 cm | Ohne Bohrung | 8.79 |
| 156-GR-ES-RE-60X20-T15-KGL | 58104601510268 | Rechteck · 6 × 2 cm | Selbstklebend – glatte Flächen | 11.78 |
| 156-GR-ES-RE-60X20-T15-KRA | 58104601543036 | Rechteck · 6 × 2 cm | Selbstklebend – raue Flächen | 12.78 |
| 156-GR-ES-RE-60X20-T15-B02 | 58104601575804 | Rechteck · 6 × 2 cm | Mit 2 Bohrlöchern | 11.28 |
| 156-GR-ES-RE-60X20-T15-B02S | 58104601608572 | Rechteck · 6 × 2 cm | Mit 2 Schrauben | 11.48 |
| 156-GR-ES-RE-80X20-T15-K00 | 58104601149820 | Rechteck · 8 × 2 cm | Ohne Bohrung | 9.49 |
| 156-GR-ES-RE-80X20-T15-KGL | 58104601182588 | Rechteck · 8 × 2 cm | Selbstklebend – glatte Flächen | 12.48 |
| 156-GR-ES-RE-80X20-T15-KRA | 58104601215356 | Rechteck · 8 × 2 cm | Selbstklebend – raue Flächen | 13.48 |
| 156-GR-ES-RE-80X20-T15-B02 | 58104601248124 | Rechteck · 8 × 2 cm | Mit 2 Bohrlöchern | 11.98 |
| 156-GR-ES-RE-80X20-T15-B02S | 58104601280892 | Rechteck · 8 × 2 cm | Mit 2 Schrauben | 12.18 |

Summe der Preise nur zur Plausibilität: 167.83 €. Preise dieser 15 Varianten stimmen mit dem Katalog überein (Grundpreis + Aufschlag; geprüft). Die neuen Produkte bräuchten neue SKUs (SKU-Wächter: SKUs sind shopweit eindeutig; die bisherigen `156-GR-ES-RE-50X20-T15-*` usw. dürfen nicht doppelt vergeben werden, solange sie am alten Produkt hängen).

## Zu klären (nur Fragen, nichts entschieden)

1. Bestehende Bindungen: Konfi-Profil und Modulprofil des Produkts (Formen-/Größenliste, Designgruppe) – was muss angepasst werden, und wer macht das?
2. Bestehende Entwürfe, Warenkörbe oder Bestellungen, die eine der 15 Variant-IDs enthalten: gibt es welche? Was passiert mit ihnen?
3. Löschen oder archivieren/deaktivieren der 15 Varianten im Live-Produkt – welcher Weg, welche Sicherung und welcher Rückweg?
4. Größenwahl im Konfi: 5 × 2, 6 × 2 und 8 × 2 verschwinden aus der Rechteck-Größenliste (Reihen 4:1, 3:1-Einzelgröße, 5:2); wie finden Kunden die neuen Produkte (Navigation, Kollektion, Verlinkung)?
5. Gilt für die neuen Produkte dieselbe Designgruppe oder die Bestandsdesigns des Formats (Übernahme läuft im anderen Chat)?
6. URLs/Weiterleitungen, Produktbilder, Metafelder, Merchant-Center-/Marketplace-Einträge, die auf die entfallenden Varianten zeigen: gibt es welche?
7. Soll das Edelstahl-Hauptprodukt zeitgleich mit dem Acryl-Hauptprodukt umgestellt werden oder getrennt?
8. Kleinformat-Motive: Ist die Kategorie „Motive kleine Schilder“ die gesonderte Auswahl? Gilt sie auch im Hauptprodukt bei sehr kleinen Größen (ENTSCHEIDUNGEN 5.5/5.27)?

## Hinweis

**Kundenseite ändert sich: drei Größen verschwinden aus der Größenwahl – Umsetzung erst nach ausdrücklicher Freigabe des Änderungsplans durch Chris.**

## Nicht geprüft

Aktueller Shopify-Stand (kein Zugriff), Inhalt der privaten Werkstatt-Datenbank (Modulprofil), tatsächliche Warenkörbe/Bestellungen.
