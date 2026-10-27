# Theme-App-Block „Jetzt personalisieren“

Quelle für die **bestehende** Theme-App-Erweiterung `gravuru-storefront` der App „Gravuru Konfigurator“ (Client-ID `9640dd7a6907f0c73e7013ea8c24869b`). Dieser Ordner ist **kein** eigenständiges Shopify-App-Projekt: Ein `shopify app deploy` aus einem unvollständigen Projekt entfernt nicht enthaltene Module. Die Dateien werden in das vollständige private Erweiterungsprojekt auf dem Host kopiert (siehe [SHOP-EINSTIEG.md](../SHOP-EINSTIEG.md)). Die bisherigen Blöcke `configurator.liquid` und `personalizer.liquid` bleiben unverändert erhalten.

| Datei | Ziel in der Erweiterung | Zweck |
| --- | --- | --- |
| `blocks/jetzt-personalisieren.liquid` | `extensions/gravuru-storefront/blocks/` | App-Block für Produktsektionen: sichtbar nur, wenn das Produkt das Metafeld `custom.customization_id` trägt (Definition `gid://shopify/MetafieldDefinition/397781762428`, Konfi-Produktkennung). Link auf `/apps/<subpath>/start?product=<id>&variant=<id>&back=<Produktpfad>`. |
| `assets/gravuru-personalisieren.js` | `extensions/gravuru-storefront/assets/` | Hält die Varianten-ID im Link aktuell (Produktformular `name="id"`, `?variant=`, Theme-Ereignisse). Ohne JavaScript bleibt der Link auf der beim Rendern gewählten Variante nutzbar. |
| `snippets/gravuru-warenkorb-bearbeiten.liquid` | **Theme** (`snippets/`), nicht Erweiterung | Gesicherte `_Entwurf`-Vorschau und „Bearbeiten“-Link je Warenkorbzeile aus `_gravuru_config`/`_gravuru_rev` (K8). Aufruf direkt in der Bildspalte von `sections/main-cart.liquid` und `sections/cart-drawer.liquid`: `{% render 'gravuru-warenkorb-bearbeiten', item: item %}`. |

Übergeben werden ausschließlich Shopify-Produkt-ID, Varianten-ID, der Produktpfad für den Rücksprung und beim Bearbeiten `config`/`rev`/`line`. Kein Preis, keine SKU, kein Handle: Die Zuordnung zum Werkstattprodukt trifft der Server allein über die Binding-Registry {Produkt-ID, Varianten-ID}. Shopify signiert jede Proxy-Anfrage; der Server prüft Signatur, Shop und Zeit.

Der Block-Einstellwert `subpath` (Vorgabe `konfigurator`) muss zum App-Proxy der App passen (`[app_proxy] prefix = "apps"`, `subpath = "konfigurator"`). Beide Werte sind in der Shop-Adresse sichtbar und eine Entscheidung von Chris.

## Warenkorb: Bearbeiten unter dem Bild (27.10.2026)

`cart-media-placement.patch` ist der kleine Integrationspatch für die beiden Sections des am 27.10. gelesenen Produktionsthemes. Zusammen mit `snippets/gravuru-warenkorb-bearbeiten.liquid` anwenden. Ein alter Aufruf des Snippets rechts bei den Produkteigenschaften muss entfallen; nicht zusätzlich rendern.

Bei nativen Konfiguratorzeilen mit `_gravuru_config` und `_gravuru_rev` ersetzt die gespeicherte Vorschau das normale Produktbild. „Bearbeiten“ steht als Link direkt darunter. Die normale Eigenschaft `Bearbeiten` wird nur bei diesen Zeilen ausgeblendet. Andere Artikel behalten ihre bisherige Darstellung. Der erlaubte Vorschau-Host, Produkt-/Variantenbindung und die Bearbeiten-Parameter bleiben erhalten. Der Link nutzt die vorhandene Übersetzung `general.cart.edit`; keine neue Einstellung. Mobile Umbrüche und Mindesthöhe von 44 px für den Link sind enthalten.

Bereitgestellt und zurückgelesen ausschließlich im unveröffentlichten Testtheme `190557716860` (Konfigurator-Test 26.10., Kopie production). Produktion `185833718140` unverändert: Die Shopify-Anbindung sperrt MAIN-Theme-Dateischreibzugriffe. Keine Veröffentlichung der gesamten Testkopie; zur Übernahme genau diese drei Dateien bzw. den Patch im Theme-Projekt prüfen. Quellbasis-MD5: main-cart `e653c987ec228b80353a8754be5f5566`, cart-drawer `445189ac2e8c73c81c40fe3010873c37`. Bei zwischenzeitlichen Änderungen den kleinen Patch auf aktuelle Quellen übertragen.

Desktop und 390×844 geprüft; Link öffnet die gespeicherte Türschild-Gestaltung mit Hausmotiv, Text und sieben Ebenen wieder. Ein erster Aufruf traf eine protokollierte HTTP-503-Unterbrechung des App-Hosts; erneutes Laden war erfolgreich. Der Shop öffnet über das Warenkorbsymbol die Warenkorbseite, daher keine gesonderte visuelle Drawer-Abnahme behaupten. Der Drawer verwendet denselben Bild-/Link-Baustein.

Shopify-Liquid-Prüfung: Snippet erfolgreich. Für die beiden nur teilweise lokal kopierten Sections vorher/nachher dieselben 97 fehlenden Theme-Referenzen/Übersetzungen, keine neuen Fehler. Die Shopify-Dateiübernahme meldet keine Fehler; Read-back stimmt.
