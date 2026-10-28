# D8 · 1,69 € nur vorbereiten · Nachtrag 2 · 28.10.2026

**Status: reiner Probelauf. Keine Datenbankänderung, Shopify-Abfrage, Freigabe, Aktivierung oder Bestellung ausgeführt.** Dieser Ablauf ist keine Ausführungsfreigabe. Erst nach Chris' neuem ausdrücklichem Live-Satz mit dem dann aktuellen Stand fortfahren.

## Ausgangslage und feste IDs

- Shop: gravuru-design.myshopify.com
- Shopify-Produkt: **16077798965628**, Variante **57265913332092** (D8, ohne Bohrung).
- Preis-App aus dem bestehenden Serververtrag: **gid://shopify/App/423276544001**.
- Quelle: Claude, 28.10. ca. 18:20, Nachtrag-2-Dokument auf seinem Branch. Bytesuche in 570 MB Acryl-DB und WAL: kein Preisvertrag gefunden; drei Binding-Präfixe e193c120, cc060d41, 1ac12e90. **Keine SQL-Abfrage.** Die Präfixe sind keine verwendbaren vollständigen Bindungskennungen.
- Produktdatei der Werkstatt: private/acryl-employee-20261021-v1/data/workshop.sqlite. Aktuelle cfg-ID, Revision, Bindungs-ID und aktive Kopfzuordnung müssen exakt gelesen werden. Keine davon erfinden oder das neueste Datum mit „aktiv“ gleichsetzen.
- Code-Deployment allein ändert den gespeicherten Preisstand nicht.
- Regel dieses Auftrags: Vorlage inklusive, zusätzliches/geändertes Motiv +169 Cent, motifCharge='additional'. Keine Umstellung anderer Produkte oder Varianten.

## 1. Lese- und Sicherungsschritt vorbereiten

Nach Ausführungsfreigabe: konsistente SQLite-Sicherung einschließlich WAL mit SQLite-Backup erstellen; nicht eine laufende DB ohne WAL kopieren. Sicherung und Lesebelege privat außerhalb von Git halten. Keinen neuen createWorkshop/Repository-Konstruktor gegen eine alte Live-DB öffnen: dieser könnte migrieren. Bestehende Store-Instanz oder ausschließlich readOnly-SQLite verwenden.

Vor der eigentlichen Planung getrennt prüfen:

1. PRAGMA user_version, PRAGMA table_info der vier unten genannten Tabellen; Mandant/Store aus dem tatsächlichen Laufzeitkontext bestätigen.
2. In form_shop_bindings alle Zeilen für shop und variant_id=57265913332092 lesen, verbunden mit form_shop_binding_selections und form_shop_binding_personalization. Bei vorhandenem tenant_id **alle** JOINs/WHERE auf denselben Mandanten begrenzen; beim alten expliziten Single-Store-Schema keinen Mandanten hinzuerfinden.
3. Die aktive Zuordnung aus shop_product_binding_heads + shop_product_binding_revisions lesen, nicht ORDER BY rowid LIMIT 1 verwenden. Fehlende aktive Kopfzuordnung ist ein Stoppgrund.
4. Den exakt gebundenen Beleg aus product_revisions und den aktuellen products-Kopf vergleichen. Die Quelle muss noch der aktuelle Produktstand sein. Kein Zugriff auf Kundentexte, Uploads oder Bestellungen für diese Bestandsprüfung.

SQL für die mandantenfähige Variante (Parameter gebunden, nicht zusammengesetzt):

~~~sql
SELECT b.*, s.options, p.document AS personalization
FROM form_shop_bindings b
LEFT JOIN form_shop_binding_selections s
  ON s.binding_id=b.id AND s.tenant_id=b.tenant_id
LEFT JOIN form_shop_binding_personalization p
  ON p.binding_id=b.id AND p.tenant_id=b.tenant_id
WHERE b.shop=? AND b.variant_id=? AND b.tenant_id=?;

SELECT r.*
FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r
 ON r.tenant_id=h.tenant_id AND r.shop=h.shop
 AND r.variant_gid=h.variant_gid AND r.revision=h.revision
WHERE h.tenant_id=? AND h.shop=? AND h.variant_gid=?;
~~~

Für den belegten alten Single-Store: erster SELECT ohne tenant_id-Spalten/Prädikate, nur auf dem ausdrücklich bestätigten Acryl-Store; die additive Kopfzuordnung besitzt weiterhin tenant_id. Keine Schemaänderung als Nebenwirkung.

## 2. Cart Transform: installiert UND aktiviert

Die vollständige vorbereitete Admin-GraphQL-Leseabfrage steht als D8_READ_QUERY in scripts/d8-pricing-dry-run.mjs. Sie kann offline ausgegeben werden:

~~~sh
node --input-type=module -e "import {D8_READ_QUERY} from './scripts/d8-pricing-dry-run.mjs'; console.log(D8_READ_QUERY)"
~~~

Erst nach Freigabe mit dem vorhandenen sicheren Client der besitzenden App an /admin/api/2026-07/graphql.json senden. Keine Tokens in Befehle, GitHub oder Protokolle kopieren.

Sie prüft Shop, Währung, App, read_cart_transforms, Shop-Tarif, genaue Produkt-/Variantenbindung, Grundpreis und $app.personalization einschließlich compareDigest; außerdem vollständige Listen von shopifyFunctions und cartTransforms.

- Die Funktions-ID aus dem geprüften Release-Beleg muss sowohl in shopifyFunctions (apiType cart_transform) als auch als functionId eines cartTransforms auftauchen. Ein installierter Funktionscode allein genügt nicht.
- blockOnFailure dokumentieren; nicht eigenmächtig umstellen. Keine neue globale Funktion installieren oder eine vorhandene entfernen.
- Cart Transforms sind auf die abfragende App begrenzt; ein leerer fremder App-Readback beweist keine fehlende Funktion. [Shopify CartTransform](https://shopify.dev/docs/api/admin-graphql/latest/objects/carttransform).
- lineUpdate braucht einen Entwicklungs-Shop oder Shopify Plus. Kein stiller Fallback zu einem unbestätigten Preis. [Shopify Funktionsvertrag](https://shopify.dev/docs/api/functions/latest/cart-transform).
- GraphQL-Fehler, fehlender Scope, weitere Seiten, falsche App, fehlende/mehrdeutige Funktion oder nicht unterstützter Tarif: **Stopp**.
- Der installierte Funktionscode muss zusätzlich gegen das geprüfte Release (Hash, Eingabeabfrage $app.personalization, Revisionsprüfung) abgeglichen werden. Die Leseantwort beweist nicht, dass der Code 169 Cent korrekt berechnet.

Offline-Funktionsprüfung mit exakt diesem Release vorbereiten: 0 Zusatzmotive → Grundpreis; 1 → +169; 2 → +338; ausgeblendetes Motiv zählt nicht; Menge 2 ergibt zweimal den bestätigten Stückpreis; falsche Vertragsrevision darf nicht still akzeptiert werden. Das historische Gedenktafel-ZIP ist ohne aktuellen Release-Abgleich kein Nachweis für D8.

## 3. Lokalen Vorschlag erzeugen

Der private Lesebeleg ist JSON mit schema gravuru-d8-pricing-readback/v1, record (vollständiger bestehender Produktbeleg mit id/revision/status/document), binding (id/shopDomain/variantId/productId/productRevision/options/unitCents), shopify (unveränderte GraphQL-Antwort) und expectedFunctionId aus dem geprüften Release.

~~~sh
node --test scripts/d8-pricing-dry-run.test.mjs
node scripts/d8-pricing-dry-run.mjs --input /privater/pfad/d8-readback.json --out /privater/pfad/d8-proposal-neu
~~~

Die Pfade sind vom Operator zu setzen. Das Skript liest nur diese lokale JSON-Datei. Es öffnet keine DB, besitzt keinen Netzwerkclient und lehnt --apply, --live und --commit ab. Es verlangt den bestätigten 0-Cent-Ausgangsstand und ein fehlendes Shopify-Preismetafeld. Falls inzwischen eines existiert, bricht es ab und ersetzt nichts.

Ergebnis proposal.json: vollständiger Kandidat für die nächste Produktrevision, ursprünglicher Beleg für den Rückweg, feste Quellrevision/-hash, exakte Bindung, Preisvertrag und Metafeld-Vorschlag mit compareDigest:null. Nur motifCharge und extraMotifCents ändern sich. Platte, Bohrungen, Schrift, Foto, Rechte, Grundpreise und Kennungen bleiben erhalten. summary.json enthält den Prüfstand ohne das große Produktdokument. Ausgabeordner darf nicht schon existieren.

Der erste Vertrag enthält ausschließlich Variante 57265913332092. Weitere Befestigungsvarianten nicht automatisch aufnehmen. Ein bereits vorhandener Produktvertrag erfordert einen eigenen Vergleich, weil das Metafeld am Produkt hängt.

## 4. Spätere Ausführung – noch NICHT ausgeführt

Die folgende Reihenfolge ist für den Operator vorbereitet, keine heute startbare Sammelmutation:

1. D8-Einstieg im kontrollierten Wartungsfenster sperren; bestehende Entwürfe/Angebote erhalten. Frische Sicherung und denselben Quellbeleg/aktive Kopfversion erneut prüfen.
2. Kandidaten als **neue** Produktrevision über repository.save(id, document, expectedRevision) der vorhandenen passenden Store-Instanz speichern; vorher und nachher die beiden geänderten Felder vergleichen. Kein Import, keine Freigabe und keine Schema-Migration.
3. Shopify-Metafeld mit dem vorbereiteten Compare-and-set-Vorschlag anlegen und vollständig zurücklesen. Exakte Mutation:
~~~graphql
mutation D8PricingSet($metafields:[MetafieldsSetInput!]!) {
 metafieldsSet(metafields:$metafields) {
  metafields { id namespace key type value compareDigest }
  userErrors { field message code }
 }
}
~~~
   Variable metafields ist [proposal.metafieldProposal]. compareDigest:null verhindert Überschreiben eines inzwischen angelegten Metafelds. userErrors oder abweichender Readback: Stopp. Vorher kein clientseitiger Preispatch.
4. Neue Bindung und Kopfzuordnung über den vorhandenen serverseitigen Prüfer vorbereiten. Wichtig: POST /products/:id/shop-bindings und scripts/shop-bind.mjs reichen hierfür **nicht**: der einfache Pfad übergibt keinen Personalization-Vertrag.
5. Die serverseitige Store-API unterstützt orderIntake.idBindings({storeId,shopDomain,adapter,personalizationPricingFor}). Der Callback liefert **nur den gerade mit der besitzenden App gelesenen, geprüften Vertrag**, niemals einen Browserpreis. Danach createShopProductBindingCheck(...).check({selections:[exakte D8-Zuordnung mit neuer Produktrevision und bisherigen options]}) und registry.persist({plan,expectedHeads:[{shopifyVariantId,revision:vorherGeleseneKopfversion}]}). Der Plan ist höchstens 60 Sekunden gültig. Originale Laufzeitinstanzen verwenden; bei Legacy-Schema den vorhandenen expliziten Legacy-Adapter, keinen migrierenden neuen Konstruktor.
6. Bindung, Kopf, Produktrevision und gespeicherten Vertrag zurücklesen. Registry.resolve mit beiden Shopify-IDs muss genau die neue Revision liefern. App in Plesk wirklich neu starten, falls Laufzeitdateien geändert wurden; Deaktivieren/Aktivieren allein ist kein gesicherter lsnode-Neustart.
7. D8 ohne Zusatzmotiv und mit Hausmotiv bis zum echten Warenkorb prüfen, inklusive angezeigtem Stückpreis, Menge, Bearbeiten und unverändertem Entwurf. Bei unverändertem Grundpreis 19,99 €: 19,99 / 21,68 / 23,37 € für 0/1/2 zusätzliche Motive. Keine Bestellung. Preisfehler → Einstieg geschlossen lassen und Rückweg.

Die tatsächliche geprüfte Funktions-ID, volle cfg-/Binding-IDs und Kopfversion fehlen noch im aktuellen SQL-Lesebeleg. Deshalb enthält dieser PR bewusst keine ausführbare Live-Aktivierung mit geratenen Kennungen. Vor der Ausführung müssen diese drei Belege vollständig vorliegen.

## 5. Rückweg

- **Vor Live-Schreibbeginn:** Probelauf verwerfen; Original bleibt unverändert.
- **Nur neue Produktrevision gespeichert:** den im Vorschlag erhaltenen Originalbeleg als weitere neue Revision mit erwarteter aktueller Revision speichern. Alte Versionen nicht ändern/löschen.
- **Neue Bindung aktiviert:** D8-Einstieg schließen, Originalbeleg als neue Rücknahme-Revision speichern, frisch prüfen und eine weitere Bindung/Kopftransition auf diese Revision erzeugen. Neue/alte unveränderliche Bindungen und Angebote erhalten. Kein direktes SQL-UPDATE an Verträgen, kein Zurückspielen der gesamten DB über zwischenzeitliche Bestellungen.
- **Shopify-Vertrag bereits angelegt:** nicht pauschal löschen oder auf 0 setzen. Er kann für bereits ausgestellte bezahlte Angebote/Warenkörbe benötigt werden. Erst nach Abgleich und Ablauf/Behandlung dieser Referenzen den exakten vorherigen Zustand kontrolliert wiederherstellen. Vorher war das Metafeld null; ein Löschschritt braucht einen frischen Readback und die Bestätigung, dass niemand den Vertrag inzwischen geändert oder benutzt hat.
- Die globale Cart-Transform-Funktion bleibt bestehen, insbesondere für Gedenktafeln. Dieser Ablauf plant keine Funktionsänderung.
- Erst nach Rückprüfung des zurückgenommenen D8-Einstiegs wieder öffnen; neue und alte Entwürfe getrennt testen.
