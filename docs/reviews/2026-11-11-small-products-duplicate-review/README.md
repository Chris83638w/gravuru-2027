# Dublettenprüfung: sechs kleine Türschilder

Stand 11.11.2026. Rein lesende Shopify-Abfragen; keine Serverzugriffe, keine Änderungen.

**Für alle sechs geplanten Material-/Größengruppen existieren bereits eigenständige kleine Türschilder. Eine pauschale Neuanlage wäre deshalb nicht durch einen negativen Dublettencheck gedeckt.** Gefunden wurden 16 aktive eigenständige Kleinprodukte, ein gesonderter Stahl-Andenkenentwurf und fünf Produkte mit mehreren Größen. Das sind nachgewiesene Bestandsüberschneidungen, keine automatisch austauschbaren oder zur Übernahme freigegebenen Produkte.

## Suchumfang und Vollständigkeit

Das vollständige Produktverzeichnis wurde in 31 Seiten à höchstens 50 Produkten gelesen: **1.519 eindeutige Produkte**, abschließend hasNextPage=false; API-Zählung exakt 1.519 auf jeder Seite. Status: **1.196 ACTIVE, 313 DRAFT, 2 ARCHIVED, zusätzlich 8 UNLISTED**. Alle Titel, Handles, Produkttypen, Tags, vollständigen Optionswerte und die bekannten Felder custom.customization_id/custom.gravuru_product_cut wurden berücksichtigt. Die vier Status wurden ausdrücklich eingeschlossen; keine Draft-only-Suche.

Für alle 22 erkannten Kandidaten wurden **sämtliche 2.477 Varianten** einschließlich IDs, SKU, Titeln, Optionswerten und Preisen vollständig paginiert. Alle zugänglichen Produktmetafelder dieser Kandidaten wurden vollständig gelesen. Die **126 zu den Zielgrößen gehörenden Varianten** wurden zusätzlich vollständig auf Variantenmetafelder geprüft: überall leer, terminal hasNextPage=false. Drei globale, statusunabhängige Variantensuchen nach bekannten nativen/historischen SKU-Präfixen und Größenlabels ergaben je 40 Treffer (insgesamt 120), keine weitere Produkt-ID, jeweils keine Folgeseite. Die sechs verbleibenden Varianten ohne entsprechende SKU/Variantengrößentitel wurden über die vollständige Produktliste gefunden: ein älteres V2A-5×2-Produkt und fünf Varianten des Andenkenentwurfs.

**Präzise Grenze:** Das Inventar meldet 30.162 Varianten insgesamt; 5.950 eindeutige Variantenzeilen wurden tatsächlich gelesen, 24.212 andere Variantenzeilen nicht einzeln exportiert. Daher keine universelle Negativaussage über völlig anders benannte Produkte mit Größe nur in einer unbekannten SKU oder unbekannten Metadaten. Der Produktverzeichnisdurchlauf und sämtliche erkannten Kandidaten sind vollständig; die positiven Überschneidungsbefunde für alle sechs Gruppen stehen bereits fest. Keine Bestell-/Registry-/Checkout-Freigabe aus fehlenden Shopify-Metafeldern ableiten.

## Sechs Gruppen gegen native v9-Sollquellen

Die zugehörigen v9-Plan-/Quell-IDs, Hashes, Geometrien, Materialstärken, nativen sizeKeys und Befestigungen stehen vollständig in six-groups.json. Acryl 3 mm: je 2 Farben × 5 Befestigungen = 10; Stahl 1,5 mm: je 5. Native sizeKeys sind keine bereits genehmigten neuen Shopify-SKUs.

| Gruppe | v9-Sollkombinationen | Eigenständige aktive Produkt-IDs | Separater Andenken-Draft | Produkte mit mehreren Größen |
|---|---:|---|---|---|
| acrylic-5x2 | 10 | 16078712996220, 16078712930684 | — | 16175627665788, 16190784602492 |
| acrylic-6x2 | 10 | 16078713127292, 16078713028988 | — | 16175627665788, 16190784602492 |
| acrylic-8x2 | 10 | 16078713880956, 16078714405244 | — | 16175627665788, 16190784602492 |
| steel-5x2 | 5 | 16077792936316, 16077793263996, 16067894018428, 16077793132924 | 16196606001532 | 16121424773500, 16190784438652, 16120816861564 |
| steel-6x2 | 5 | 16077793329532, 16077793755516, 16077793624444 | — | 16121424773500, 16190784438652, 16120816861564 |
| steel-8x2 | 5 | 16077794476412, 16077794312572, 16077794247036 | — | 16121424773500, 16190784438652, 16120816861564 |

## Eigenständige Bestandsprodukte

IDs sind numerische Shopify-GIDs: Product beziehungsweise ProductVariant. Vollständige IDs und Originalwerte stehen in six-groups.json.

| Produkt-ID | Titel | Status | Varianten-ID(s) | SKU(s) |
|---|---|---|---|---|
| 16067894018428 | Türschild V2A 5x2 | ACTIVE | 57229899858300 | leer |
| 16077792936316 | Türschild Edelstahl V2A personalisiert 5×2 cm | ACTIVE | 57265867391356 | TRE-V2A-5x2-D1 |
| 16077793132924 | Türschild Edelstahl V2A personalisiert – Brief 5×2 cm | ACTIVE | 57265868865916 | TRE-V2A-5x2-D27 |
| 16077793263996 | Türschild Edelstahl V2A personalisiert – Herz 5×2 cm | ACTIVE | 57265870209404 | TRE-V2A-5x2-D52 |
| 16077793329532 | Türschild Edelstahl V2A personalisiert 6×2 cm | ACTIVE | 57265870274940 | TRE-V2A-6x2-D3 |
| 16077793624444 | Türschild Edelstahl V2A personalisiert – Haus 6×2 cm | ACTIVE | 57265871061372 | TRE-V2A-6x2-D23 |
| 16077793755516 | Türschild Edelstahl V2A personalisiert – Vogel Silhouette 6×2 cm | ACTIVE | 57265872044412 | TRE-V2A-6x2-D42 |
| 16077794247036 | Türschild Edelstahl V2A personalisiert 8×2 cm | ACTIVE | 57265875583356 | TRE-V2A-8x2-D2 |
| 16077794312572 | Türschild Edelstahl V2A personalisiert – Dezentes Symbol 8×2 cm | ACTIVE | 57265876959612 | TRE-V2A-8x2-D30 |
| 16077794476412 | Türschild Edelstahl V2A personalisiert – Anker 8×2 cm | ACTIVE | 57265877614972 | TRE-V2A-8x2-D6 |
| 16078712930684 | Türschild Acrylglas personalisiert 5×2 cm | ACTIVE | 57269402861948 | TRE-A-5x2-D3 |
| 16078712996220 | Türschild Acrylglas personalisiert – Vogel Silhouette 5×2 cm | ACTIVE | 57269403156860 | TRE-A-5x2-D42 |
| 16078713028988 | Türschild Acrylglas personalisiert 6×2 cm | ACTIVE | 57269403189628 | TRE-A-6x2-D4 |
| 16078713127292 | Türschild Acrylglas personalisiert – Herz 6×2 cm | ACTIVE | 57269403320700 | TRE-A-6x2-D53 |
| 16078713880956 | Türschild Acrylglas personalisiert – Anker 8×2 cm | ACTIVE | 57269404893564 | TRE-A-8x2-D6 |
| 16078714405244 | Türschild Acrylglas personalisiert – Fisch-Icon 8×2 cm | ACTIVE | 57269405778300 | TRE-A-8x2-D30 |
| 16196606001532 | Andenkenschild Edelstahl – 5 × 2 cm | DRAFT | 58162739446140, 58162739478908, 58162739511676, 58162739544444, 58162739577212 | leer, leer, leer, leer, leer |

Diese 17 Produkte haben keine der geprüften nativen Shopify-Bindungskennungen custom.customization_id, custom.gravuru_product_cut oder gravuru.*. Ihre übrigen Metafelder und die Original-SKUs zeigen teils eigenständige Motive, Farben und Vermarktungszwecke. Bei sechs älteren Acrylprodukten nennt die Materialbeschreibung **3–5 mm** statt eindeutig der v9-Stärke 3 mm. Ein 5×2-Stahlprodukt ist ausdrücklich ein Andenkenschild und damit thematisch getrennt. Vor einer möglichen Wiederverwendung müssen Zielidentität und vorhandene native Bindungen geklärt werden; dieser Bericht bestimmt keinen Gewinner.

## Bekannte Sammelprodukte: keine automatische Dublettenlöschung

| Produkt-ID | Titel | Status | Alle Varianten | Treffer 5×2/6×2/8×2 | Sichtbare Bindungsmetafelder |
|---|---|---|---:|---:|---|
| 16121424773500 | Edelstahlschild selbst gestalten – Variante C | ACTIVE | 309 | 15 | keine |
| 16190784438652 | Türschild Edelstahl – Form und Größe selbst wählen | ACTIVE | 404 | 15 | custom.gravuru_product_cut, custom.customization_id |
| 16175627665788 | Acryl-Türschild selbst gestalten – Schwarz & Anthrazit | DRAFT | 798 | 30 | gravuru.acryl_release |
| 16120816861564 | TEST – Variante B – Edelstahl – Rechteck | UNLISTED | 137 | 15 | keine |
| 16190784602492 | Türschild Acrylglas 3 mm – Form und Größe selbst wählen | DRAFT | 808 | 30 | custom.gravuru_product_cut, custom.customization_id |

Hauptacryl **16190784602492 enthält exakt 30 relevante Varianten**, zehn je Größe, bei unveränderten insgesamt 808. Hauptstahl **16190784438652 enthält 15**, fünf je Größe. Auch ältere Sammelprodukte bleiben getrennt erfasst. Keine Variante wurde gelöscht, verschoben, deaktiviert oder geändert. Dass dieselbe physische Größe in einem Sammelprodukt und einem eigenen Motivprodukt vorkommt, beweist keine fehlerhafte Dublette.

## Nächster zulässiger Abgleich

Claude kann mit diesen konkreten Produkt- und Varianten-IDs die vorhandenen nativen Register-/Bindingeinträge lesen und die tatsächlichen sechs Zielidentitäten zuordnen. Ohne diesen Abgleich sind weder sechs pauschale Neuanlagen noch das Überschreiben aktiver Bestandsprodukte abgeleitet. ACTIVE bezeichnet hier ausschließlich den Shopify-Status; Veröffentlichung und funktionierender Kunden-/Bestell-/Produktionsweg wurden nicht geprüft.

## Nachweise und Datensparsamkeit

Das vollständige lokale Gesamtinventar bleibt **außerhalb des Git-Payloads**. summary.json enthält dessen SHA256 und Dateigröße sowie Suchzählungen. Der kompakte Ordner enthält ausschließlich sechs Zielgruppen, relevante Treffer/126 Kombinationen, Bindungsbefunde, Queries und eine verkürzte Pagination (Zählung/Cursor). Keine fremden Katalogbeschreibungen müssen nach GitHub. Lokale Quellen: inventory.json, candidate-details.json, global-variant-search.json, variant-metafields.json im Elternordner.

Abfragen wurden durch den Shopify-Connector schemavalidiert. Dokumentation: [products](https://shopify.dev/docs/api/admin-graphql/2026-10/queries/products), [productVariants](https://shopify.dev/docs/api/admin-graphql/2026-10/queries/productVariants). Keine Mutation, kein Upload, keine Anlage, Archivierung oder Preisänderung.
