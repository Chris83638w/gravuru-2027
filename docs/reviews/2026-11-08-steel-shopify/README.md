# Edelstahl-Türschilder: vorbereiteter Shopify-Anschluss

Stand 08.11.2026. Nutzerauftrag: alle Formen, Optionen vor einer Anlage bestätigen lassen, freigegebenen R15-Aufbau erhalten. Drei Unteragenten haben Katalog/Excel, tatsächlichen Shopify-Bestand und Runtime-Anschluss getrennt geprüft. Mika hat den reproduzierbaren Options-/Bestandsabgleich umgesetzt. **Keine Produktanlage, kein Shop- oder Serverwrite, keine Änderung an `app/` oder dem freigegebenen Konfi.**

## Ergebnis

- [Optionsübersicht zur Bestätigung](options-review.md): alle acht Formen / 80 Größen, konkrete Grundpreise und nur die je Größe verfügbaren Befestigungen. [Vollständige Matrix](catalog-matrix.json) einschließlich Excelzellen und echter Lochpositionen.
- Aktueller Katalog und Excel stimmen überein. Der bestehende native Preisvertrag ergibt **404** zulässige Größen-Befestigungs-Kombinationen. Die native Berechnung wurde wiederverwendet; keine zweite Preislogik eingeführt.
- Bestehender unveröffentlichter Shopify-Entwurf **16190784438652** enthält genau diese 404 Varianten. [Vollständiger Readback](existing-product-readback.json) und [reproduzierbarer Abgleich](existing-product-comparison.json): sämtliche SKUs, Varianten-IDs und Preise passen. Diesen Anker verwenden, keine Ersatzanlage. Die vorhandenen älteren Einzelangebote und Astras Andenken-Pilot bleiben separat; nichts löschen oder zusammenführen.
- Der Anker startet derzeit mit **LEER-AB-120X80-D0**, nicht mit einer freigegebenen Original-Designgruppe. Sein `customization_id` ist ein Katalogschlüssel, keine bereits nachgewiesene native `cfg_`-Bindung. Die Shop-Sitzung muss die tatsächliche Registry-Zuordnung liefern; keine ID erfinden.

## Prüfbarer Umfang dieses Änderungssatzes

`scripts/prepare-steel-shopify-options.mjs` liest die Familie aus einem ausdrücklich gepinnten Git-Commit, prüft deren Blob und erstellt ausschließlich Dateien zur Sichtprüfung. Für jede Größe werden die vorhandenen Funktionen `familyProductConfig`, `variantCombinations` und `quote` benutzt. Die interne Mustervorlage wird weder gespeichert noch Kunden angeboten. Zusätzliche Gruppen oder Felder, eine fehlende Form, veränderte Quellen oder manipulierte Übersichten werden abgewiesen.

`compareSteelShopProduct` ordnet ausschließlich nach explizitem Produkt, SKU-Präfix, kanonischem Größenschlüssel und Befestigung zu. Unvollständige Seiten, doppelte IDs/SKUs, Preisabweichungen und fehlende/fremde Varianten werden erkannt. Ein passender SKU-Abgleich erteilt ausdrücklich **keine** Schreib-, Neuanlage-, Veröffentlichungs- oder Bestellberechtigung. Kundenbezeichnungen und native Sitzungsbindung sind noch nicht abgenommen.

Die vorhandene `product-group-templates`-Bestätigung bleibt der maßgebliche Anlageweg. Dieses Skript erzeugt keine alternative Bestätigung und hat keinen `--apply`-Modus. Der vollständige Optionsstand hat SHA-256 `768eecffafbe16bd8a8de9df219a50c66908e16409a8ff6b3132b146fc524ea3`.

Reproduzieren (neuer Ausgabeordner; keine Zugangsdaten):

```powershell
node scripts/prepare-steel-shopify-options.mjs --catalogue=<Katalogpfad> --commit=3c6051fbbc7904969948950fae12cae2ae663f30 --output=<neuer-Ausgabeordner>
node --test scripts/prepare-steel-shopify-options.test.mjs
```

**9 Tests bestanden:** echter 80-Größen-Katalog, 404 Kombinationen, tatsächlicher Shopify-Readback, unveränderte Preise, unzulässige Vierlochwahl kleiner Formate, genaue 23,3-mm-Geometrie, Quellen-/Freigabemanipulation, neues verstecktes Zubehör, Preis-/Bestandskonflikte, unvollständige/duplizierte/fremde Readbacks. Zusätzlich unabhängiger Code-Review; dessen Befund zu Zusatzfeldern wurde behoben und mit Regression geprüft. Kein mobiler/PC-End-to-End-Abnahmetest oder echter Warenkorbtest in diesem Schritt.

## Vor Anschluss noch notwendig

1. **Nutzerbestätigung:** angebotene Größen/Preise/Befestigungen; ohne Bohrung als vorgeschlagener Startwert; Foto aus / SVG-Logo 12,99 €; präzise Benennung der drei verkürzten Größenlabels; erste Original-/Designgruppe. Keine dieser Entscheidungen aus einem JSON-Status ableiten.
2. **R15-Sitzungsadapter:** vorhandenen nativen Shop-Einstieg nutzen, R15 vor dessen Bereitschaftsmeldung installieren. Produktdaten, Checkout und Designwechsel bleiben in derselben nativen Strecke. Kein Entfernen der Demo-Sperren. [Exakter Anschlussbericht](runtime-integration.md).
3. **Alle Formen bedienbar machen:** R15-Motivgrößenlimit ist derzeit auf RE/QU beschränkt; AB/OV/EL/R/RT1/RT2 müssen konturbezogen angeschlossen und geprüft werden. Dies ist eine technische Anschlusslücke, keine Aufforderung zum UI-Umbau.
4. **Echte Serverbindung und Preise:** native Produktrevision, Registry und installierte Gravuru-Preisfunktion aus der eigenen App prüfen. Der angeschlossene Connector gehört einer anderen App und darf `cartTransforms` nicht lesen. Das ist noch kein Nachweis einer fehlenden Function. [Tatsächliche Vorprüfung](shop-preflight.md).
5. **Logo und Fertigung:** SVG-Konverter sowie Foto-/Logorechte gesondert abnehmen. Historische lokale Integrationstests zeigen zwei offene Konverterfälle. Schraubenkopf 5 mm + Gestaltungsabstand 2 mm und Loch-Schutzzone 1 mm sind unterschiedliche Regeln; den vorhandenen Ausweichpfad prüfen, nichts still überschreiben.
6. Erst anschließend gleicher Start wie Hauptproduktbild, alle Form-/Größenwechsel, Rücksprung, Original-ID/Revision, Logo-/Motivaufschläge, Warenkorb und Produktionsdaten durchgängig prüfen. Vor tatsächlicher Serveraktivierung neue private Sicherung des Zielstands; bei Schema V4/V5 keinen Datenbanktausch vornehmen.

## Sicherung / Zuständigkeit

Der freigegebene Konfi bleibt im unveränderlichen Tag `prio-konfi-approved-r15-20261108` gesichert; siehe [PRIO-KONFI.md](../../../PRIO-KONFI.md). Dieser neue Anschlussstand liegt in einem eigenen Branch direkt auf main. Er zieht keine der fremden 123 Vorgänger-Commits der R15-Demo nach main. Quellen, Varianten-IDs, konkrete Optionen, Tests und offene Punkte sind hier gemeinsam gesichert. Keine Tokens, Kundendaten oder Uploads enthalten.
