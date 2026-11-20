# Isolierter Warenkorbtest für das Edelstahl-Türschild

Dieser Pilot nutzt die Designauswahl der archivierten Edelstahl-Variante C. Nach der Auswahl öffnet sich der bestehende Prio R15. Der reguläre Shop-Einstieg, alle anderen Produkte und die Fertigung haben keine Abhängigkeit von diesem Verzeichnis.

## Produkt und Herkunft

Die Karte gehört zum Shopify-Produkt `16190784438652`, Werkstattprodukt `cfg_ac514214-a313-4738-8008-00445ee1befd`, Produktrevision `4`. Der Einstieg verwendet die Variante `58104606556540` mit 12 × 8 cm, abgerundeten Ecken und der Befestigung `K00`. Die Designliste stammt aus der signierten Werkstattfreigabe für die gewählte Ausführung. Für das Startformat liefert sie 21 Designs. Die Anzeige in Sechsergruppen, Suche, Erweiterung und Auswahl in `c-karten.mjs` stammen aus dem historischen C-Shoploader `gravuru-product-configurator.v9b2ad51e101b7.js`, SHA-256 `98f7157ed00c613baacc8d1fa71023def9296fb3e10184e2fd50848f6fb0b56f`. Preise und Vorschauen stammen aus dem aktuellen Produktprofil.

## Betriebsorte

1. Der geschützte Beta-Server behandelt `/variante-c/` nach seiner vorhandenen Zugangskontrolle. `versuch.cjs`, `warenkorb.html`, `warenkorb.mjs` und `auswahl.css` liegen zusammen. Im Paket liegt daneben eine identische Kopie von `app/workshop/ui/theme-cart-client.mjs` als `native-theme-cart.mjs`.
2. `auswahl.html`, `auswahl.mjs`, `auswahl.css` und `c-karten.mjs` liegen auf der bestehenden App-Domain unter `/konfi-demo/variante-c-warenkorb-267/`. So haben der echte R15 und sein Shop-Client dieselbe Herkunft. Der Einstieg ruft den offiziellen Shopify-App-Proxy für genau das obige Produkt auf und übergibt das erhaltene Token im URL-Fragment. Das Fragment wird beim Öffnen aus der Adresszeile entfernt.
3. Jeder angemeldete Testbrowser hat eine eigene kurzlebige Sitzung und einen getrennten Shopify-Warenkorb. Die geschützte Ansicht liest bestätigte Positionen von Shopify zurück. Sie zeigt Preis, Artikelnummer und die persönliche Vorschau mit Vergrößerung und erlaubt Entfernen. Sie hat keinen Bestellschritt.

## Bestehende Schnittstellen für Claude

| Aufgabe | Zuständiger Code und Vertrag |
| --- | --- |
| Produkt, Varianten und Preis | `app/workshop/shop-entry.mjs`, `shop-entry-session.mjs` und `ui/shop-entry-client.mjs` liefern das gebundene Produktmodell. `loadDesignGallery` liefert erlaubte Ausführungen. `switchDesign` verlangt das signierte Auswahlziel. Nach dem Wechsel bindet `loadModel` Produkt, Variante, Optionen und Produktrevision erneut. |
| Entwurf und persönliche Vorschau | Der R15 übernimmt Text, Motive und Originalbilder. `cart-configuration.mjs` speichert die Gestaltungsrevision. `shopify-checkout-image.mjs` erstellt die persönliche Bilddatei für Shopify. `_gravuru_config`, `_gravuru_rev` und `_gravuru_bild` identifizieren die Gestaltung und ihren Bildstand. |
| Shopify-Warenkorb | `submitThemeCart` bereitet die Übergabe vor. Der Shopify-App-Proxy liefert das gespeicherte Angebot und beansprucht es beim Übernehmen. `ui/theme-cart-client.mjs` führt `/cart/add.js` aus, liest `/cart.js` zurück und prüft mit `verifyThemeCartLine` Preis, Menge, Variante und Eigenschaften jeder Position. Die persönliche Datei steht in `_gravuru_checkout_image`. |
| Bestellung und Fertigung | Nach einer echten Bestellung übernimmt `shopify-order-webhook.mjs` die Verifikation. `order-intake.mjs` ordnet die Gestaltungsrevision zu. `production-release.mjs`, `export-jobs.mjs`, `design-export.mjs` und `variant-export.mjs` sind für Werkstattfreigabe und Produktionsdateien zuständig. Der Pilot endet im Warenkorb. |

Ein früherer vollständiger Durchlauf über den normalen R15 mit Vorschaubild und Fertigungsdateien ist in [Issue #267](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7032923259) dokumentiert. Der aktuelle Stand des eigenen Testwarenkorbs wird separat im Issue festgehalten.
