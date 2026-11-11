# Hauptacryl: vorhandene Produktangaben erhalten

11.11.2026. **Neuer reiner Zielentwurf; kein gespeicherter Plan, Importpayload, Freigabetoken oder Schreibauftrag.** Das bestehende Produkt `cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0` soll bei einem später ausdrücklich freigegebenen nativen Update seine Identität behalten. Erwarteter Istkopf1, vorgeschlagener Nachfolger2; hier wurde keine Revision angelegt. Shopify16190784602492, H1 und alle808 Varianten-IDs bleiben erhalten. Die30 Restvarianten sind unverändert weiterhin dem Iststand zugeordnet; keine Löschfreigabe.

## Exakt erhaltene Angaben und Unterschied zum vorigen Entwurf

Der Operator lieferte die tatsächlichen Werte in [#168, Kommentar6807404988](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6807404988). Diese Werte werden übernommen, nicht als neue Geschäftsentscheidung erfunden:

| Pfad | Neuer Zielwert = tatsächlicher Bestand |
|---|---|
| `name` | Türschild Acrylglas 3 mm – Form und Größe selbst wählen |
| `seo.title` | Türschild Acrylglas 3 mm – Form und Größe selbst wählen |
| `seo.description` | Leer, unverändert |
| `categoryIds` in Reihenfolge | `extern-shopifyproductid-16190784602492`, danach `linie-acryl-tuerschilder` |
| `config.profile.name` | Derselbe erhaltene Name; ausdrücklich zusätzlicher vierter geänderter Pfad |

`metadata-changes.json` führt genau vier Pfaddifferenzen zum vorigen Ziel auf: `categoryIds`, `name`, `seo.title`, `config.profile.name`. Das letzte Feld normalisiert der native Validator selbst (`app/workshop/product-model.mjs:126`: `result.config.profile.name=result.name`). `seo.description` ändert sich nicht. Keine Änderung an Appcode, v9-Quellen/Plänen/Excel oder vorheriger veröffentlichter Preview.

## Rechte und bereits bestätigter Start

Die1205 vorhandenen Zielvorlagen und4671 Elemente bleiben vollständig gleich. Der native Typ zählt3304 Texte und1367 Motivobjekte; die vom Operator fachlich getrennten1118 Motive plus249 Dekorationen ergeben diese1367. Für sämtliche1367 sind `replace=true` und `delete=true`; keine neue Sperre. `elementRights` bleibt als komplettes Objekt hashgleich (`f8d8f44c…9b8ebc`). Der alte Stand mit80 leeren Vorlagen/80 Texten bleibt als unveränderte Revision1 erhalten. Er wird nicht künstlich dem neuen Designpool hinzugefügt.

Chris hat nach dem Missverständnis ausdrücklich erklärt: „ach so bei den designs kann es so bleiben. Ich bin vom Hauptprodukt ausgegangen.“ Die anschließende Präzisierung lautete „Produktbild im Shop“; danach wurde H1 als Hauptbild freigegeben. Damit entsteht keine erneute Startdesignwahl.

Der tatsächliche Zielvertrag ist bereits konsistent:

- `config.profile.defaultDesignId = katalog-TAE-V2A-8x5-D1`.
- `config.familyFormats.source.shopProduct.defaultDesignId = TAE-V2A-8x5-D1`, `groessenWahl=alle`.
- `familyFormats.defaultSize` und `shopProduct.sizeKey = TS-Acryl-AB-120X80-T30-SW`, `defaultColor=schwarz`.
- Texte „Rosenberg“/„Familie“, tatsächliche Startkontur120×80mm, abgerundetes Rechteck, Radius5mm, ohne Bohrung.

`TAE-V2A-8x5-D1` ist die Original-ID, kein abweichendes physisches Startmaß. Ihre gespeicherte Quellplatte80×53,3mm wird nativ mit einheitlichem Faktor1,5 auf120×79,95mm skaliert und vertikal um0,025mm zentriert. `family-formats.mjs:59–81` erzeugt so die tatsächliche Zielprojektion120×80mm. Keine neue Verzerrung oder Gestaltung. Die projizierten Objekte sind hashgleich zur vorigen geprüften Preview (`c6601e92…960e2`). Der native Vollvalidator des neuen Entwurfs ist grün.

`family-formats.mjs:163–166` verlangt für den Alle-Größen-Shopzuschnitt die Übereinstimmung des gespeicherten Defaults mit dem Original-Designpin. `product-model.mjs:153–160 resolveProduct` wählt den Default der gewählten Größe, `variant-m/adapter.mjs:374–376` startet den Editor damit. Kein LEER-Default im Ziel; ein historisches Shopify-Importmetafeld wäre dafür kein gegenteiliger Runtimevertrag.

## Nachweise und feste Hashes

`verification.json`: native `validateProductDocument` am tatsächlichen neuen JSON erfolgreich; exakter Vier-Pfade-Diff; keine DB/Registry/Importinstanz. `unchanged-contract-proof.json`: alle778 Preise erneut mit der nativen Familienpreisfunktion gegen das unveränderte v9-Mapping geprüft; sämtliche übrigen Configfelder, Profilzuordnungen, Rechte und Fertigungsreferenz gleich. Mapping enthält778 geplante plus30 unveränderte Restvarianten. Vorbestehende Shop-Preisdifferenzen bleiben158 (138B02S je30Cent,20B04S je10Cent); der Zielpreis wird nicht an den alten Shoppreis angepasst.

| Gegenstand | SHA256 |
|---|---|
| Neuer Produktgruppen-Dokumenthash / kanonischer Transport | `ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407` |
| Neuer nativer ID-Binding-Dokumenthash | `f0bb7d95e89e3aae66ab04454d6476132fe197aaae7c1da48ce8209ced62d285` |
| Neues lokales Gzip | `2a7b1adf55afbda5728cf062e91208f42c559fa1578b771b0ad4aa5912ffadb1` |
| Unverändertes Variantenmapping-Gzip | `3d0647b2cb671ba09199b6f9c4b9cdbfa58f24a0eafb1d2d672a18823070c9bf` |
| Neuer nicht ausführbarer Intent | `fcfddddeae4a188ef980a67912e247d85bb42b46c1d4836de669207b01b2282b` |

Produktgruppenhash: rekursiv nach Schlüssel sortierte Objekte, danach `JSON.stringify` (numerische Schlüssel werden von JSON erneut numerisch angeordnet). Bindinghash: rekursiver Stringserializer mit lexikografischen Schlüsseln. Die Verfahren bewusst getrennt halten; der Hash tatsächlicher späterer SQL-JSON-Bytes ist nochmals ein eigener Wert.

## Wiederherstellung beim Operator, ohne Vollmodelltransfer

1. Die bereits veröffentlichte `docs/reviews/2026-11-11-main-target-preview/materialize-label-preview.mjs` erzeugt aus dem unveränderten v9-Plantransport und dessen `label-changes.json` eine **neue** lokale `main-label-preview.json` (Produktgruppenhash2da213…).
2. Dieser neue Materializer erzeugt daraus eine weitere neue Datei; er akzeptiert ausschließlich die vier belegten Metadatenänderungen und beide festen Eingangs-/Zielhashverfahren. Kein natives Importobjekt und keine Datenbank:

```sh
node docs/reviews/2026-11-11-main-target-preserved-metadata/materialize-metadata-preview.mjs \
  /PRIVATE/REVIEW/main-label-preview.json \
  docs/reviews/2026-11-11-main-target-preserved-metadata/metadata-changes.json \
  /PRIVATE/REVIEW/main-preserved-metadata.preview.json
```

Der Materializer wurde lokal erfolgreich geprüft (`materialization-check.json`); sein Ergebnis ist bytehashgleich zum neuen Transport. Vorhandene Ausgabedateien werden abgewiesen. `build-preserved-metadata.mjs` dokumentiert zusätzlich die ursprüngliche native Erstellung aus dem vorigen Gzip; nur in einer neuen isolierten Ausgabemappe ausführen. Der kompakte Git-Payload enthält weder vollständiges Modell noch Datenbank; er nutzt die vorhandene v9-Transportkette.

## Verbleibender privater Prüfauftrag

Die echten wiederhergestellten Kategorien können die vererbten Ressourcenprofile beeinflussen. Deshalb muss der ergänzte ausschließlich lesende Kategorienhelfer die tatsächliche Bibliothek der gesicherten Kopie in genau dieser Reihenfolge auflösen und nur Profil-ID/Revision/Hash, Herkunft, Einstellungen und Differenzen zurückgeben. Die bisherige grüne Defaultprüfung unter leerer Kategorienliste reicht hierfür nicht. Der historische v9-Resolverstand im Intent ist ausdrücklich als Herkunft gekennzeichnet, nicht als erwartetes Ergebnis der beiden echten Kategorien.

Der separate Modulbericht belegt: eingebetteter vollständiger Modul-Snapshot ist für Runtime und direktes Haupt-Update portabel; keine Registeranlage oder neue UUID allein wegen fehlender Tabellen erzwingen. Der Gruppenplanweg der späteren sechs Neuanlagen benötigt dagegen tatsächliche Registerpins. Vor jedem ausdrücklich freigegebenen Schreiben bleiben die nativen frischen Kopf-/Zuordnungs-/Preis-/Katalogfreigabeprüfungen erhalten. Dieser Entwurf enthält keine Import-, Bestätigungs-, Bindungs-, Shopify- oder Veröffentlichungsfreigabe.
