# Main abgeschlossen: unabhängiger Shopread und empfangener Operatorbericht

12.11.2026 · Reviewer `catalog_review`. **Der tatsächliche unabhängige Shopify-Endabgleich ist grün: 808/808 IDs, Preise, Optionswerte und SKUs stimmen; keine Abweichung.** Dazu liegt Claudes abschließender Git-Ergebnisbericht bytegleich vor. Private native Tabellen und das Eigentümer-App-Preisfeld wurden von diesem Reviewer nicht direkt gelesen; entsprechende Aussagen bleiben ausdrücklich Operatornachweis.

## Direkt über Shopify geprüft

Nach Claudes gemeldetem Abschluss um **18:08:20 UTC** wurden `get_product` und 17 fortlaufende GraphQL-Seiten gelesen (16×50 + 8 Varianten, insgesamt 18 reine Leseaufrufe). Die erste Seitenantwort wurde um 18:14:53.367 UTC protokolliert, die letzte Antwort kam um 18:15:43.066 UTC. Der Beginn des ersten Requests wurde nicht separat erfasst. Alle 17 Seiten zeigen denselben Produktstand `updatedAt:2026-11-12T18:02:55Z`, denselben Shop `gravuru-design.myshopify.com` und EUR; Cursorfolge vollständig, keine doppelten IDs.

Verglichen wurde die bestehende fest gepinnte 778+30-Matrix, keine neu berechnete Preislogik:

- Main `gid://shopify/Product/16190784602492` bleibt DRAFT mit exakt allen ursprünglichen **808** Varianten-IDs.
- **778 Zielvarianten** entsprechen vollständig den vorgesehenen Preisen/Labels/SKUs; **30 Restvarianten** sind vollständig unverändert.
- Beobachtet wurden genau **158 Preisänderungen und 30 Labeländerungen auf 182 verschiedenen Varianten** (sechs Überschneidungen): 138 B02S je −30 Cent und 20 B04S je −10 Cent, zusammen −43,40 Euro über diese einzelnen Variantenpreise. Alle übrigen Preise stimmen ebenfalls.
- H1 bleibt `gid://shopify/MediaImage/70116579869052`, weiteres vorhandenes Medium `gid://shopify/MediaImage/70017733919100`; vollständige Medien-ID-Liste und Hauptbildreihenfolge erhalten. Dies ist Medienidentitätsreadback, keine neue visuelle Fertigungsprüfung.
- Vorlage `konfi` und historischer `custom.customization_id`-Wert `katalog-formate-acryl-tuerschilder-familienschilder-eb5fe26624befe4a` bleiben erhalten.

`checks.json` dokumentiert **16/16 konkrete Vergleichsbedingungen**, 0 Differenzen und sämtliche 182 beobachteten Änderungszeilen. Das sind lokale Vergleiche der tatsächlich erhaltenen Daten, keine neue App-Testsuite. `connector-pages.json` enthält alle strukturierten Connectorantworten; Dateihashes beziehen sich auf deren lokale Serialisierung, nicht auf ursprüngliche HTTP-Transportbytes.

## Bytegleich empfangener Abschlussbericht

[Claude #1686832031956](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6832031956), Gitcommit **`f9af62fa193078afeee233ca1efdf6bf022caef6`**, Quelle `ops/plesk/ausfuehrung-20261112/3-main-ergebnis.json`:

- Empfang unter `received/3-main-ergebnis.json`: **8.507 Bytes**, SHA256 **`ae2a8b119f17f676faf263b48c076de883cbb7c1339f1078d7bed57c0ddaa95f`**.
- Gitblob **`22c42084e2b95fdf49a41957e8d9661bfa5a0034`** wurde aus den tatsächlichen UTF-8-Dateibytes samt Git-Blobheader unabhängig nachgerechnet und stimmt. `received/receipt-source.json` hält den Herkunftsnachweis fest.

Der Bericht nennt natives Update R1→R2 **14/14**, Plan **16/16**, abschließenden Readback **19/19**; zwei Shopify-Mutationen (ein Update der 182 Varianten, ein Preis-CAS), acht Bindungsblöcke und getrennten Katalogabschluss. 22 Journalereignisse entsprechen den gestarteten/abgeschlossenen elf Schritten; Sperre laut Bericht freigegeben. Kein Publish, keine Löschung, Bestellung, App-Umschaltung oder Neustart.

Die Angaben sind mit dem geprüften Umfang konsistent: derselbe cfg-Record auf R2 mit Dokumenthash `f0bb7d95e89e3aae66ab04454d6476132fe197aaae7c1da48ce8209ced62d285` und Metadatenhash `52476368aa083eebf168c30f1f2ea54415b18f1d6c02b53e41173fa58a2ef075`; **778 aktive R2-Bindungen plus 30 unveränderte aktive R1**; **808 historische R1-Verträge** weiterhin unter dem bereits belegten Hash `1fe75355a43c448c25d7800bfb63c9b0e8cb82dbee5d5ee6ae8649d6acd86da1`; 778 neue nichtleere Verträge. Katalogfreigaben: 778 R2, 30 R2-null sowie alle 808 bisherigen R1-Freigaben erhalten. Die Registryzähler sind entsprechend +778 Bindungen/Verträge/Bindungsrevisionen, unveränderte Headanzahl, +1 Produktrevision/Importjournal/Katalogfreigabe.

Das Eigentümer-App-Preisfeld wird mit **3.898 Bytes / `37ef02c6f98f6b463179093aca38a715a153141d8281203a158ddbc3e49b0705`** und neuem compareDigest gemeldet. Die direkte Connectorprüfung dieses Reviewers bestätigt die sichtbaren 808 Variantenpreise, **nicht** dieses private Preisfeld, seinen CAS, die Functionfrische oder die native Vertrags-/Kataloghistorie. Diese Trennung wird auch in `operator-summary-checks.json` beibehalten: **11/11 Konsistenzbedingungen** zwischen dem empfangenen Bericht, festen Pins und dem eigenen Shopread; keine zusätzlichen Servertests.

Der vollständige private `AUSFUEHRUNG-main.json` (11.296 Bytes, gemeldeter SHA256 `73d5bc348c2ef8b0d226f5be7da848eaf70599583b0da9096a92bb275e52acff`), Plan, Rohjournal, Zustimmungen, Vertragsdaten, DBs und sechs Functionbeobachtungen wurden hier **nicht** geliefert oder bytegeprüft. Der WASM-Hash bleibt laut Operator über den vorhandenen 08.11.-Beleg zugeordnet. Alte Schema-/Runtime-/Kopiennachweise werden nicht durch eine lokale Neuinitialisierung ersetzt. Kein Widerspruch zwischen dem gelieferten Abschlussbericht und dem direkten Shopread festgestellt.

## Datenform und reine Reproduktion

Die vollständigen Varianten stehen unter `connector-pages.json → pages[].response.data.product.variants.nodes[]`, je `{id, sku, price, selectedOptions:[{name,value}]}`. `checks.json` enthält `counts`, `preserved`, `timestamps`, `sourcePins`, `differences` und `observedDeltas`. Native berichtete Werte stehen unter `received/3-main-ergebnis.json → readback.nativ`; sie dürfen nicht aus Shopifyzeilen rekonstruiert werden.

Beide Prüfer importieren keine App, öffnen keine DB und rufen kein Netzwerk auf. Sie lesen bestehende Belege und schreiben ausschließlich eine ausdrücklich benannte **neue** Ergebnisdatei mit `wx`:

```text
node verify-readback.mjs /ABS/variant-mapping.preview.json.gz /ABS/NEU-shop-checks.json
node verify-operator-summary.mjs /ABS/NEU-bericht-checks.json
```

Die vorhandene Matrix liegt im unveränderten Main-v2-Paket unter `ops/issue230-main-shop-binding-20261112/variant-mapping.preview.json.gz`; Gzip-SHA `3d0647b2cb671ba09199b6f9c4b9cdbfa58f24a0eafb1d2d672a18823070c9bf`, entpackter JSON-SHA `3d476d9d964158c1f96a9e55b5de5a2cfa36afd8b5d3bcd86313c12be2c77591`. Eine Wiederholung ist für die unveränderten Ergebnisse nicht erforderlich.

`manifest.json` nennt ausschließlich die elf zur Übernahme vorgesehenen Dateien; `save-receipt.mjs` ist ein lokales einmaliges Empfangshilfsmittel und gehört nicht zum Veröffentlichungspaket. Keine vollständigen Rohmodelle, DBs, Zugangsdaten oder Kunden-/Bestelldaten enthalten. Der vorgeschlagene Git-Zielordner ist `docs/reviews/2026-11-12-main-execution-complete/`. App, Operator und Produkte wurden von diesem Review nicht verändert.
