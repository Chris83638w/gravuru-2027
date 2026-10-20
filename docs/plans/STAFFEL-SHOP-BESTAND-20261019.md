# Mengenstaffel im Shop-Bestand – Fund vom 19.10.2026 (Grundlage für Chris)

Zu K14 Teil 1 (Ü11.1, Entscheidung Nr. 4 in [KONFI-BENCHMARK-20261019.md](KONFI-BENCHMARK-20261019.md)). Lesend aus Shopify ermittelt (Koordinator, 19.10.2026); nichts wurde im Shop geändert.

## Was im Shop steht

| Punkt | Befund |
| --- | --- |
| Metafelder | `custom.rabatt_stufe1_menge`, `custom.rabatt_stufe1_prozent`, `custom.rabatt_stufe2_menge`, `custom.rabatt_stufe2_prozent`, `custom.rabatt_stufe3_menge`, `custom.rabatt_stufe3_prozent` |
| Gesetzt an | **876 Produkten** |
| Produkttypen | nur **„Türschild“** und **„Hausnummer“** |
| Werte | überall gleich: **ab 3 Stück 5 %**, **ab 5 Stück 10 %**, **ab 10 Stück 15 %** |
| Ohne Werte | Firmenschilder, Schlüsselanhänger, Hundeschilder, Gedenktafeln u. a. |

## Widerspruch zur Entscheidung vom 19.10.2026

Entscheidung Nr. 4: Staffel nur bei Firmenschildern, Boxenschildern, Schlüsselanhängern, Hinweisschildern und Brettchen, Stufen ab 5 / 10 / 25 Stück, Prozentwerte „aus den `rabatt_stufe1–3`-Metafeldern des alten Shops“; Türschilder, Hausnummern und Gedenktafeln ohne Staffel.

Der Shop-Bestand sagt das Gegenteil: Die Metafelder gibt es **nur** bei Türschildern und Hausnummern, mit den Stufen 3 / 5 / 10 – also genau bei den Typen, die laut Entscheidung keine Staffel bekommen. Für die fünf entschiedenen Typen gibt es im alten Shop keine Prozentwerte, aus denen man sie übernehmen könnte.

## Was K14 daraus macht (Stand Branch `dev/konfi-neu-K14`)

- Das Datenmodell trägt beides ohne Codeänderung: Stufen frei je Familie, je Größe und je Unterkategorie (`quantityTiers: [{minQuantity, percentOff}]` oder `{minQuantity, unitCents}`), dazu Vorgaben je Linie/Thema als Daten in `app/workshop/quantity-tier-defaults.json`.
- Angelegt ist nur die Entscheidung Nr. 4: Linien `brettchen`, `schluesselanhaenger`, `pferdeschilder` (Boxen- und Stallschilder) und die Themen `firmenschilder`, `hinweisschilder` mit Stufen ab 5 / 10 / 25 Stück und **`percentOff: null` (offen)**. Eine offene Staffel wird weder gerechnet noch angezeigt.
- Für Türschilder und Hausnummern ist **nichts** gesetzt, bis Chris entscheidet.

## Entscheidung 20.10.2026 (Chris)

Beides gilt, als Daten in `app/workshop/quantity-tier-defaults.json` (erste passende Regel gewinnt):

| Regel | Gilt für | Stufen |
| --- | --- | --- |
| `entscheidung-20261020-gedenktafeln` | Linie Gedenktafeln 30 × 20; Themen Gedenktafeln, Tiergedenktafeln (vor allen anderen Regeln) | ab 2 / 3 Stück: 6 / 10 % |
| `entscheidung-20261019-nr4` | Linien Brettchen, Schlüsselanhänger, Boxen-/Pferdeschilder; Themen Firmenschilder, Hinweisschilder (auch auf Türschild-Linien) | ab 5 / 10 / 25 Stück: 5 / 10 / 15 % |
| `shop-bestand-tuerschild-hausnummer` | Linien Edelstahl- und Acryl-Türschilder; Thema Hausnummern | ab 3 / 5 / 10 Stück: 5 / 10 / 15 % (wie Shop-Bestand) |

Offen bleibt nur die Anbindung im Shopify-Warenkorb (siehe unten).

## Was Chris entscheiden musste (erledigt 20.10.2026)

1. **Welche Produkttypen** bekommen eine Staffel – die fünf aus der Entscheidung, die zwei aus dem Shop-Bestand (Türschild, Hausnummer) oder beide?
2. **Welche Stufen** – 5 / 10 / 25 (Entscheidung) oder 3 / 5 / 10 (Shop-Bestand)?
3. **Welche Prozentwerte** je Stufe für die fünf entschiedenen Typen (im Shop nicht vorhanden).

Umsetzung danach nur als Daten: Regel in `quantity-tier-defaults.json` ergänzen/ändern, z. B. für den Shop-Bestand

```json
{"id": "shop-bestand-tuerschild-hausnummer", "themeIds": ["hausnummern"], "lineIds": ["edelstahl-tuerschilder", "acryl-tuerschilder"],
 "tiers": [{"minQuantity": 3, "percentOff": 5}, {"minQuantity": 5, "percentOff": 10}, {"minQuantity": 10, "percentOff": 15}]}
```

oder je Unterkategorie im Katalog (`linien/<linie>.json`, `priceOverrides.quantityTiers`).

## Offen unabhängig von der Entscheidung

Im Shopify-Warenkorb ist die Staffel noch nicht angeschlossen: Mit festem Variantenpreis (`base-only`) sperrt der Konfigurator die Übergabe ab der ersten Staffelstufe („Die Mengenstaffel ist im Shop-Warenkorb noch nicht freigeschaltet.“), statt den Listenpreis zu berechnen. Für die Bestellung braucht es entweder die Shopify-Aufpreisfunktion (Cart Transform) oder einen gleichlautenden Shopify-Mengenrabatt; die Warenkorbprüfung (`verifyCartResponse`) vergleicht den Shop-Stückpreis mit dem Serverpreis und lehnt jede Abweichung ab.
