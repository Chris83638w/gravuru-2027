# Block in der Bestellseite des Shopify-Admin – vorbereiteter Baustein, nicht installiert

#265 Stufe C, ENTSCHEIDUNGEN 3.53 (Punkt 6) und 3.57 (Punkt 1). In die bestehende Shopify-App übernehmen; keine zweite App. Die App-/Extension-Identität lässt der Operator von der CLI zuordnen, keine UID erfinden. Veröffentlichung nur mit der App-Version der Stufe C und erst nach Chris' Freigabe: [Freigabe-Unterlage](../../../docs/handoffs/2026-11-21-stufe-c-app-version.md).

## Was der Block zeigt

Ziel `admin.order-details.block.render`, API-Version 2025-10 (wie `thank-you-preview`). Je Position mit Gravuru-Eigenschaften:

- das Bild der Gestaltung aus `_gravuru_bild` – nur mit `_gravuru_config` und nur die feste Adresse `https://app-2027.gravuru-designwerkstatt.de/gestaltung/…/offer_<uuid>/<64 hex>.png` (dieselbe Prüfung wie auf der Danke-Seite);
- „Gestaltung ansehen“: öffnet genau dieses Bild groß;
- „Fertigungsdatei“: öffnet `_gravuru_fertigung`, die anmeldepflichtige Bestellansicht der Werkstatt. Ohne diese Eigenschaft oder mit einer Adresse außerhalb von `https://app-2027.gravuru-designwerkstatt.de/werkstatt/…` gibt es den Knopf nicht.

Positionen ohne vertrauenswürdige Eigenschaften zeigen nichts; enthält die Bestellung keine, steht ein kurzer Hinweis im Block. Über Shopify wird keine Datei ausgeliefert, nichts wird gespeichert, kein fremder Host angenommen. Gelesen wird die Bestellung mit einer einzigen lesenden Admin-Abfrage (`ORDER_BLOCK_QUERY`, Positionen mit ihren Eigenschaften); dafür genügt die vorhandene Berechtigung `read_orders`. Der Block schreibt nichts.

## Am echten Shop zu bestätigen (hier ohne Netz nicht prüfbar)

1. Zielname `admin.order-details.block.render` und die Form von `shopify.data.selected` in API 2025-10.
2. Der lesende Abruf über `fetch('shopify:admin/api/graphql.json')` mit den Rechten der App.
3. Die Bausteine `s-admin-block`, `s-stack`, `s-box`, `s-image`, `s-button`, `s-text` und ihre Eigenschaften (`direction`, `gap`, `maxInlineSize`, `href`, `target`).
4. Ob der Shopify-Admin ein Bild vom eigenen Server anzeigt. Wenn nicht, bleiben beide Knöpfe nutzbar; dann das Bild weglassen statt eine Datei zu Shopify zu legen (ENTSCHEIDUNGEN 3.52/3.53).
5. Die endgültige Form von `_gravuru_fertigung` (entsteht parallel): `productionLink` in `src/model.mjs` nimmt bis dahin jede Adresse der Werkstatt am eigenen Server an.
6. Typen: `shopify.d.ts` ist nicht gegen `@shopify/ui-extensions` geprüft (`npm install && npm run check`).
7. Der Block erscheint erst, wenn er auf der Bestellseite angeheftet ist. Wo der Admin App-Blöcke der Bestellseite hinzufügt, dort ablesen.

## Stand und Rückweg

Modelltests bestanden: `node --test app/workshop/shopify-order-block.test.mjs`. Lokales esbuild-Bundle (ohne Shopify-Paket) gebaut. TypeScript-Check gegen das Shopify-Paket, App-Build und echte Bestellseite sind **nicht** gelaufen. Reproduktion mit Netz: `npm install`, `npm run check`, `npm run build`.

Rückweg: Block auf der Bestellseite lösen oder die vorherige App-Version freigeben. Bestellungen, Eigenschaften und der Server bleiben unverändert.

Zur Bestätigung (hier nicht abgerufen): [Ziele der Admin-Erweiterungen](https://shopify.dev/docs/api/admin-extensions/latest/extension-targets).
