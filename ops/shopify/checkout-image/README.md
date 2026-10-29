# Checkout-Bild – vorbereiteter Integrationsvorschlag, nicht installiert

Teil C von Issue #48. Das vorhandene Preisprogramm bekommt ausschließlich eine Bildoperation. Für D8 wird kein Preisvertrag und kein Motivpreis gesetzt.

## Quelle

Preisprogramm aus Chris83638w/gravuru-shopify, Default-Branch feat/variante-m-profile-20260924, Pfad platform/sources/app/extensions/gravuru-personalization-price/src/cart_transform_run.js, Blob a1a5146136c6d1f11ea93b07b5c8f64a3f5ab7d7. Dieser gelesene Quellstand ist kein Nachweis der aktuell aktivierten Function-Version.

Shopify Cart Transform API 2026-04 unterstützt lineUpdate.image für Plus. Das Bild wird für Checkout überschrieben, nicht als Bestellbild gespeichert: https://shopify.dev/docs/api/functions/2026-04/cart-transform . Die Bestellbestätigung verwendet daher den separaten Liquid-Baustein.

## Vor einer späteren Freigabe

1. Aktive Cart-Transform-ID, App/Function-ID, Quellversion und API-Version lesend feststellen. Kein zweites Transform anlegen. Aktive Quelle mit obigem Preisprogramm vergleichen; bei Abweichung den Bildzusatz in die aktive Quelle übertragen, nicht die ganze Function ersetzen.
2. In einer Testkopie die vier zusätzlichen Attribute aus cart_transform_run.graphql ergänzen; bestehenden Query-Inhalt behalten. cart-image.mjs importieren. cart_transform_run.mjs zeigt die Zusammenführung mit dem gelesenen Preisprogramm; .mjs ggf. an die Build-Konvention des Quellrepos anpassen.
3. Lokale Compilerprüfung abgeschlossen: Schema/Typen aus API 2026-07 (Quellrepo-Schema), CLI 4.9.3, @shopify/shopify_function 2.0.1. In isolierter Extension-Kopie: shopify app function build --no-input --path .; anschließend shopify app function run --no-input --path . --input <synthetische-eingabe.json> --export cart-transform-run --json. Alle drei Fälle (nur Bild / Bild und bestehender Preis / fremdes Bild) erfolgreich. [WASM-Hash und Ergebnisse](local-wasm-proof.json). Nach Abgleich mit der tatsächlich aktiven Quelle bei Abweichung erneut kompilieren. Kein Deploy.
4. Vorschau muss eine PNG-Uploadadresse dieses Shops in _Entwurf tragen. Eigene App-Bildadresse wird absichtlich nicht an Shopify lineUpdate.image übergeben. Fehlendes/anderes Bild lässt den vorherigen Zustand stehen.
5. Im Test: Produkt ohne Preisvertrag bekommt nur das Bild; vorhandener Preisvertrag behält seine Prüfung und einen einzigen lineUpdate. Ebenso Varianten-/Mengenwechsel, bestehende Motive, eigenes Foto und Wiederbearbeiten prüfen. Expand/Merge-Operationen erhalten Vorrang.
6. Erst nach Chris' ausdrücklicher Freigabe veröffentlichen. Rückweg: zuvor gesicherte Function-Version und Query wieder aktivieren; keine Bestell-/Preisvertragsdaten ändern. Browserbild und E-Mail-Vorlage separat rücksetzbar.

Node-Verhaltenstests: app/workshop/checkout-design-image.test.mjs. Keine Installation, Aktivierung oder Bestellung wurde damit ausgeführt.

Lesender Kontrollversuch am 29.10.2026: Der verbundene Shopify-Zugang verweigert cartTransforms (fehlend: read_cart_transforms). Deshalb sind aktive Transform-ID, Function-Version und API-Version weiterhin unbestätigt. Keine Berechtigung geändert; kein Beleg für Abwesenheit einer Function.
