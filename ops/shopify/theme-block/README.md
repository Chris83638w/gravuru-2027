# Theme-App-Block „Jetzt personalisieren“

Quelle für die **bestehende** Theme-App-Erweiterung `gravuru-storefront` der App „Gravuru Konfigurator“ (Client-ID `9640dd7a6907f0c73e7013ea8c24869b`). Dieser Ordner ist **kein** eigenständiges Shopify-App-Projekt: Ein `shopify app deploy` aus einem unvollständigen Projekt entfernt nicht enthaltene Module. Die Dateien werden in das vollständige private Erweiterungsprojekt auf dem Host kopiert (siehe [SHOP-EINSTIEG.md](../SHOP-EINSTIEG.md)). Die bisherigen Blöcke `configurator.liquid` und `personalizer.liquid` bleiben unverändert erhalten.

| Datei | Ziel in der Erweiterung | Zweck |
| --- | --- | --- |
| `blocks/jetzt-personalisieren.liquid` | `extensions/gravuru-storefront/blocks/` | App-Block für Produktsektionen: sichtbar nur, wenn das Produkt das Metafeld `custom.customization_id` trägt (Definition `gid://shopify/MetafieldDefinition/397781762428`, Konfi-Produktkennung). Link auf `/apps/<subpath>/start?product=<id>&variant=<id>&back=<Produktpfad>`. |
| `assets/gravuru-personalisieren.js` | `extensions/gravuru-storefront/assets/` | Hält die Varianten-ID im Link aktuell (Produktformular `name="id"`, `?variant=`, Theme-Ereignisse). Ohne JavaScript bleibt der Link auf der beim Rendern gewählten Variante nutzbar. |
| `snippets/gravuru-warenkorb-bearbeiten.liquid` | **Theme** (`snippets/`), nicht Erweiterung | Gesicherte `_Entwurf`-Vorschau und „Bearbeiten“-Link je Warenkorbzeile aus `_gravuru_config`/`_gravuru_rev` (K8). Aufruf je Zeile in `main-cart-items.liquid` und im Warenkorb-Drawer: `{% render 'gravuru-warenkorb-bearbeiten', item: item %}`. |

Übergeben werden ausschließlich Shopify-Produkt-ID, Varianten-ID, der Produktpfad für den Rücksprung und beim Bearbeiten `config`/`rev`/`line`. Kein Preis, keine SKU, kein Handle: Die Zuordnung zum Werkstattprodukt trifft der Server allein über die Binding-Registry {Produkt-ID, Varianten-ID}. Shopify signiert jede Proxy-Anfrage; der Server prüft Signatur, Shop und Zeit.

Der Block-Einstellwert `subpath` (Vorgabe `konfigurator`) muss zum App-Proxy der App passen (`[app_proxy] prefix = "apps"`, `subpath = "konfigurator"`). Beide Werte sind in der Shop-Adresse sichtbar und eine Entscheidung von Chris.
