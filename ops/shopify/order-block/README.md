# Block in der Bestellseite des Shopify-Admin – vorbereiteter Baustein, nicht installiert

#265 Stufe C, ENTSCHEIDUNGEN 3.53 (Punkt 6) und 3.57 (Punkt 1). In die bestehende Shopify-App übernehmen; keine zweite App. Die App-/Extension-Identität lässt der Operator von der CLI zuordnen, keine UID erfinden. Veröffentlichung nur mit der App-Version der Stufe C und erst nach Chris' Freigabe: [Freigabe-Unterlage](../../../docs/handoffs/2026-11-21-stufe-c-app-version.md).

## Was der Block zeigt

Ziel `admin.order-details.block.render`, API-Version 2026-10 (wie `thank-you-preview`). Je Position mit Gravuru-Eigenschaften:

- das Bild der Gestaltung aus `_gravuru_bild` – nur mit `_gravuru_config` und nur die feste Adresse `https://app-2027.gravuru-designwerkstatt.de/gestaltung/…/offer_<uuid>/<64 hex>.png` (dieselbe Prüfung wie auf der Danke-Seite);
- „Gestaltung ansehen“: öffnet genau dieses Bild groß;
- „Fertigungsdatei“: öffnet `_gravuru_fertigung`, die anmeldepflichtige Bestellansicht der Werkstatt im Shopify-Admin des Shops (`https://<shop>.myshopify.com/admin/apps/<App>/werkstatt/bestellungen/?config=…&rev=…`, gebildet in `app/workshop/theme-cart.mjs`). Ohne diese Eigenschaft oder mit jeder anderen Adresse gibt es den Knopf nicht. Eine Datei liefert erst der Download der angemeldeten Werkstatt aus.

Positionen ohne vertrauenswürdige Eigenschaften zeigen nichts; enthält die Bestellung keine, steht ein kurzer Hinweis im Block. Über Shopify wird keine Datei ausgeliefert, nichts wird gespeichert, kein fremder Host angenommen. Gelesen wird die Bestellung mit einer einzigen lesenden Admin-Abfrage (`ORDER_BLOCK_QUERY`, Positionen mit ihren Eigenschaften); dafür genügt die vorhandene Berechtigung `read_orders`. Der Block schreibt nichts.

## Gegen das Shopify-Paket geprüft (21.11.2026)

`npm install`, `npm run check`, `npm run build` mit `@shopify/ui-extensions` 2026.10.2 (zur Gegenprobe auch 2026.1.5): ohne Fehler. Damit geprüft:

1. Zielname `admin.order-details.block.render` und die Form von `shopify.data.selected` (`{id}[]`).
2. Die Bausteine `s-admin-block`, `s-stack`, `s-box`, `s-image`, `s-button`, `s-text` und ihre Eigenschaften (`direction`, `gap`, `maxInlineSize`, `src`, `alt`, `href`, `target`). `element(...)` in `src/OrderBlock.js` ist dafür typisiert; ein falscher Name oder Wert lässt `npm run check` scheitern.
3. `shopify.d.ts` in der Form, die die Shopify-CLI selbst erzeugt. Das Admin-Paket deklariert kein globales `shopify`; ohne diese Datei meldet die Typprüfung „Cannot find name 'shopify'“ (Astras Befund vom 21.11.).

Die API-Version 2025-10 hat Shopify am 21.11.2026 zurückgewiesen (Astra, #267); laut Shopify verhindert die CLI Veröffentlichungen mit Versionen, die älter als zwölf Monate sind. 2026-10 ist die aktuelle stabile Version; mit 2026-01 stünde dieselbe Zurückweisung schon im Januar 2027 wieder an. Quelle: [Versionen der Shopify-API](https://shopify.dev/docs/api/usage/versioning), abgerufen am 21.11.2026.

## Am echten Shop zu bestätigen

1. Der lesende Abruf über `fetch('shopify:admin/api/graphql.json')` mit den Rechten der App.
2. Ob der Shopify-Admin ein Bild vom eigenen Server anzeigt. Wenn nicht, bleiben beide Knöpfe nutzbar; dann das Bild weglassen statt eine Datei zu Shopify zu legen (ENTSCHEIDUNGEN 3.52/3.53).
3. Ob der Verweis „Fertigungsdatei“ aus dem Block heraus die eingebettete Werkstatt öffnet (Form der Adresse siehe oben).
4. Der Block erscheint erst, wenn er auf der Bestellseite angeheftet ist. Wo der Admin App-Blöcke der Bestellseite hinzufügt, dort ablesen.

## Stand und Rückweg

Modelltests bestanden: `node --test app/workshop/shopify-order-block.test.mjs`. TypeScript-Check gegen `@shopify/ui-extensions` 2026.10.2 und lokales esbuild-Bundle bestanden (21.11.2026). App-Build und echte Bestellseite sind **nicht** gelaufen. Reproduktion: `npm install`, `npm run check`, `npm run build`.

Rückweg: Block auf der Bestellseite lösen oder die vorherige App-Version freigeben. Bestellungen, Eigenschaften und der Server bleiben unverändert.

Zur Bestätigung (hier nicht abgerufen): [Ziele der Admin-Erweiterungen](https://shopify.dev/docs/api/admin-extensions/latest/extension-targets).
