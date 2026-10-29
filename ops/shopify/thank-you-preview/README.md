# Danke-Seite – vorbereiteter Baustein, nicht installiert

Issue #48 D5. In die bestehende Shopify-App übernehmen; keine zweite App und keinen zweiten Cart Transform anlegen. Die vorhandene App-/Extension-Identität lässt der Operator von der CLI zuordnen, keine UID erfinden.

Der Baustein liest ausschließlich die Eigenschaften der zugehörigen Position, zeigt das unveränderliche PNG und „Bitte prüfe die Schreibweise.“. Kein Speichern, keine fremden Hosts, keine Editor-Sitzung, keine Originalfotos. Ein Antippen öffnet das PNG groß. Positionen ohne vertrauenswürdiges Gestaltungsbild erhalten keinen irreführenden Platzhalter.

Vor Installation: im gravuru-shopify-App-Projekt lokal bauen, Zielversion/Typen prüfen und auf der Shopify-Vorschau der Danke-Seite testen. Erst nach Chris' Freigabe veröffentlichen/aktivieren. Rückweg: ausschließlich diesen Baustein deaktivieren bzw. vorherigen App-Stand herstellen, bestehende Funktion unverändert lassen.

Stand: Modelltests bestanden; TypeScript-Check gegen offizielle @shopify/ui-extensions 2025.10.16 und lokales esbuild-Bundle bestanden. Reproduktion: npm install, npm run check, npm run build (keine Shopify-Verbindung). Weder vollständiger App-Build im Zielrepo noch echte Danke-Seite sind hier als bestanden ausgewiesen.

Quellen: [Cart Lines API und Thank-you-Ziel](https://shopify.dev/docs/api/checkout-ui-extensions/2025-10/target-apis/checkout-apis/cart-lines-api), [Bildkomponente](https://shopify.dev/docs/api/checkout-ui-extensions/latest/web-components/media-and-visuals/image).
