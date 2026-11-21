# Danke-Seite und Kundenkonto – vorbereiteter Baustein, nicht installiert

Issue #48 D5. In die bestehende Shopify-App übernehmen; keine zweite App und keinen zweiten Cart Transform anlegen. Die vorhandene App-/Extension-Identität lässt der Operator von der CLI zuordnen, keine UID erfinden.

Der Baustein liest ausschließlich die Eigenschaften der zugehörigen Position, zeigt das unveränderliche PNG und „Bitte prüfe die Schreibweise.“. Kein Speichern, keine fremden Hosts, keine Editor-Sitzung, keine Originalfotos. Ein Antippen öffnet das PNG groß. Positionen ohne vertrauenswürdiges Gestaltungsbild erhalten keinen irreführenden Platzhalter.

Vor Installation: im gravuru-shopify-App-Projekt lokal bauen, Zielversion/Typen prüfen und auf der Shopify-Vorschau der Danke-Seite testen. Erst nach Chris' Freigabe veröffentlichen/aktivieren. Rückweg: ausschließlich diesen Baustein deaktivieren bzw. vorherigen App-Stand herstellen, bestehende Funktion unverändert lassen.

Stand: Modelltests bestanden; TypeScript-Check gegen offizielle @shopify/ui-extensions 2025.10.16 und lokales esbuild-Bundle bestanden. Reproduktion: npm install, npm run check, npm run build (keine Shopify-Verbindung). Weder vollständiger App-Build im Zielrepo noch echte Danke-Seite sind hier als bestanden ausgewiesen.

## Kundenkonto (#265 Stufe C, ENTSCHEIDUNGEN 3.53 Punkt 4) – vorbereitet, nicht installiert

Dieselbe Extension trägt ein zweites Ziel: `customer-account.order-status.cart-line-item.render-after` (`src/OrderStatus.js`). Es zeigt je Bestellposition in der Bestellübersicht des Kundenkontos das Bild der Gestaltung vom eigenen Server; ein Antippen öffnet das PNG groß. Die Vertrauensprüfung ist die der Danke-Seite (`accountPreview` ruft `thankYouPreview` in `src/model.mjs`): nur mit `_gravuru_config` und nur die feste Bildadresse `https://app-2027.gravuru-designwerkstatt.de/gestaltung/…/offer_<uuid>/<64 hex>.png`. Kein Speichern, kein Netzabruf, keine fremden Hosts; Positionen ohne vertrauenswürdige Adresse zeigen nichts. Der Satz „Bitte prüfe die Schreibweise.“ steht nur auf der Danke-Seite; für das Kundenkonto gibt es dazu keine Entscheidung.

Am echten Shop zu bestätigen (hier ohne Netz nicht prüfbar):

1. Zielname und dass die CLI ein Kassen- und ein Kundenkonto-Ziel in einer Extension annimmt. Wenn nicht: `src/OrderStatus.js` und `src/model.mjs` unverändert in eine eigene Extension neben dieser legen (gleiche `api_version`, eigenes Handle, Identität ordnet die CLI zu) und den zweiten `[[extensions.targeting]]`-Abschnitt dorthin verschieben.
2. Dass die Bestellübersicht der Erweiterung die privaten Eigenschaften der Position gibt (`_gravuru_bild`, `_gravuru_config`) und `shopify.target` dort wie auf der Danke-Seite gilt.
3. Typen: `shopify.d.ts` nennt nur das Ziel der Danke-Seite; `OrderStatus.js` nutzt denselben Zugriff (`shopify.target.value`, `subscribe`). `npm run check` mit den Typen des Kundenkonto-Ziels ist nicht gelaufen.
4. Der Baustein muss im Checkout- und Kundenkonto-Editor auf der Seite „Bestellstatus“ eingesetzt werden (wie auf der Danke-Seite); ohne das erscheint nichts.

Stand: Modelltests bestanden (`node --test app/workshop/thank-you-preview.test.mjs`); beide Module lokal mit esbuild gebündelt (ohne Shopify-Paket). TypeScript-Check gegen `@shopify/ui-extensions`, App-Build und echte Bestellübersicht sind **nicht** gelaufen. Rückweg: Baustein im Editor von der Seite „Bestellstatus“ nehmen; die Danke-Seite bleibt davon unberührt.

Quellen: [Cart Lines API und Thank-you-Ziel](https://shopify.dev/docs/api/checkout-ui-extensions/2025-10/target-apis/checkout-apis/cart-lines-api), [Bildkomponente](https://shopify.dev/docs/api/checkout-ui-extensions/latest/web-components/media-and-visuals/image). Zur Bestätigung des Kundenkonto-Ziels (hier nicht abgerufen): [Ziele der Kundenkonto-Erweiterungen](https://shopify.dev/docs/api/customer-account-ui-extensions/latest/targets).
