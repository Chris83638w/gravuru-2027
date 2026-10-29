# Checkout-Bild – vorbereiteter Integrationsvorschlag, nicht installiert

## Ergänzung 29.10.2026: Vektorlogos, Preisvertrag V2 (nur vorbereitet)

Chris hat 12,99 € je hochgeladenem Kundenlogo entschieden. `cart_transform_run.mjs` enthält dafür einen getrennten, ausdrücklich aktivierten Vertrag `gravuru-personalization-pricing/v2` mit `extraLogoCents:1299` und dem Attribut `_gravuru_logos`. Alte V1-Produktstände und deren Rechnung bleiben erhalten. Die neue Query ergänzt `logos` und `quantity`; V2 berechnet bestätigte vollständige Mengenstaffeln inklusive Logoaufpreis. Der Werkstattserver akzeptiert V2 nur für eine neue Edelstahlgravur-Revision mit `logo:{enabled:true,vectorUpload:true,extraPriceCents:1299}` und `photo.enabled:false`. Ohne passenden Vertrag bleibt die Bestellung dieser Änderung gesperrt.

Dieser neue V2-Zweig wurde mit synthetischen Node-Tests gegen den serverseitigen Preis, gesicherte Warenkorbangebote, Rückleseprüfung und signierten Test-Bestelleingang geprüft. Zusätzlich wurde die aktuelle Quelle mit Query in einer eigenen lokalen Extension kompiliert (CLI 4.9.3, `@shopify/shopify_function` 2.0.1, Schema 2026-07) und mit Function Runner 9.2.2 geprüft: **6/6 Fälle erfüllt** (drei richtige Preise einschließlich V1 und V2-Mengenstaffel; drei erwartete Ablehnungen bei altem Vertrag, fehlendem Zähler und falschem Logoaufpreis). [Quell-/WASM-Hashes und Ergebnisse](local-logo-v2-wasm-proof.json). Der frühere WASM-Nachweis unten bleibt auf seinen damaligen Bildzusatz beschränkt.

Vor einer Installation: aktive externe Function-Quelle/Query lesen und vergleichen, Ergänzung dort übernehmen, neu kompilieren, den tatsächlichen Preisvertrag und Cart-Transform prüfen und nach Chris' Live-Freigabe den echten Warenkorb-/Bestelltest durchführen. Die lokale Ablehnung einer Function-Eingabe ist kein Nachweis einer Shopify-Checkout-Sperre. Bisher wurde nichts installiert oder in Shopify geändert. Rückweg bleibt die gesicherte vorherige Function und ihre Query; bestehende Produktrevisionen werden nicht überschrieben.

## Bisheriger Bildzusatz

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
