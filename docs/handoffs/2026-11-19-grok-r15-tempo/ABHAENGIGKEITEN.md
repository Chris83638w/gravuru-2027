# Wer `_Entwurf`, `_gravuru_bild` und das Shopify-Kassenbild schreibt und liest

Stand nach dem Warenkorb-Commit auf `dev/grok-r15-beta-267-20261119`. `_Entwurf` bleibt. Die eigene Bildadresse ist kein Kassenbild: `shopify-checkout-image.mjs` sagt, dass Shopify eine Ajax-Upload-Adresse in `lineUpdate.image` ablehnt.

| Stelle | Datei:Zeile | Richtung |
| --- | --- | --- |
| Eigene, revisionsgebundene PNG-Adresse | `app/workshop/theme-cart.mjs:37` | schreibt `_gravuru_bild` |
| Shopify-Datei aus dieser Adresse (`fileCreate`, Poll, CDN-URL) | `app/workshop/shopify-checkout-image.mjs:18-47` | schreibt die CDN-URL |
| Start beim Sichern und bei der Übergabe | `app/workshop/shop-entry.mjs:445` und `:403` | stößt die Datei an |
| Hängt die CDN-URL an, wenn sie fertig ist | `app/workshop/shop-cart-preview.mjs:13` | schreibt `_gravuru_checkout_image` |
| Gehosteter Client setzt `_Entwurf` auf diese CDN-URL, ohne Datei | `app/workshop/ui/theme-cart-client.mjs:80-83` | schreibt `_Entwurf` als Text |
| Alter Client lädt das PNG hoch und setzt `_Entwurf` als Datei | `app/workshop/ui/theme-cart-client.mjs:84-91` | schreibt `_Entwurf` als Upload |
| Warenkorb-Snippet, Anzeige | `ops/shopify/theme-block/snippets/gravuru-warenkorb-bearbeiten.liquid:17` und `:21-28` | liest `_Entwurf`, bei nativer Zeile bevorzugt `_gravuru_bild` |
| Bearbeiten-Link im Repo-Snippet | dieselbe Datei, Zeilen 65–72 | zeigt „Bearbeiten“. Theme und `ops/` bleiben unverändert. Der Kundenweg setzt die Eigenschaft `Bearbeiten` nicht. |
| Kasse, Cart Transform | `ops/shopify/checkout-image/cart_transform_run.graphql:10` und `ops/shopify/checkout-image/cart-image.mjs:4-8` | liest nur `_gravuru_checkout_image` im festen CDN-Muster |
| Dieselbe Abfrage in den drei Einzelsperren | `ops/shopify/einzelsperre-release/*/src/cart_transform_run.graphql:10` | liest dasselbe Feld |
| Danke-Seite | `ops/shopify/thank-you-preview/src/model.mjs:5` | liest `_gravuru_bild` |
| Bestellmail | `ops/shopify/notifications/gravuru-bestellbestaetigung-bild.liquid:8` | liest `_gravuru_bild` |
| Fertigung, Revision, Preis | Prüfstand und `prepareAcrylicReview`, nicht diese drei Felder | unberührt |
| Alter Editor, historisch | `app/references/aosu-upgrade-2026-09-21/verification/editor-source.html:1327` und `:1397` | schrieb `_Entwurf` selbst; der heutige Pfad tut das nicht |

Ein gehosteter Client bekommt ohne fertige Shopify-Datei keine PNG-Antwort (`cart/data`, 503, `checkout_image_pending`). `shop-embed.mjs` wiederholt dieselbe `cart/data`-Anfrage etwa alle 1,2 s, höchstens 14 s, mit dem Text „Vorschau wird für die Kasse vorbereitet …“. `theme-cart` läuft dabei nicht erneut. Ein echter Shopify-Fehler hat den Code `checkout_image_failed` und wird nicht wiederholt. Dann wird kein Warenkorb angelegt.

`d7b00751` ist auf diesem Branch enthalten. Der Entwurf startet die Shopify-Datei sofort nach dem Speichern (`shop-entry.mjs`, `warmCheckoutImage`). Der Test `theme-cart-flow` prüft, dass genau ein Bildauftrag vor `theme-cart` läuft.

Offen für Chris: bei einem dauerhaften Shopify-Fehler entweder weiter kein Warenkorb, oder Rückfall auf den Geräte-Upload ohne Kassenbild. Bis zur Entscheidung gilt kein Warenkorb und die klare Meldung. Ein Client ohne das Kennzeichen `hosted` behält den Datei-Upload.
