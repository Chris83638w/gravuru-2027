# Theme-App-Block „Jetzt personalisieren“

**Live-Nachtrag 30.10.2026:** `cart-native-proof-visibility.patch` blendet ausschließlich die technische Eigenschaft „Bearbeitbarer Entwurf“ nativer Positionen in beiden Cart-Sections aus. Preisvertrag, Daten und Bearbeiten-Link bleiben erhalten. Im MAIN-Theme **185833718140** installiert und vollständig zurückgelesen; sechs Liquid-Fälle sowie bestehender Live-Warenkorb geprüft. [Prüfsummen, Sicherung, Rückweg und Grenzen](../../../docs/handoffs/2026-10-30-master-abgleich-warenkorb.md). Die nachfolgende Testtheme-Aussage vom 27.10. beschreibt den damaligen Stand.

Quelle für die **bestehende** Theme-App-Erweiterung `gravuru-storefront` der App „Gravuru Konfigurator“ (Client-ID `9640dd7a6907f0c73e7013ea8c24869b`). Dieser Ordner ist **kein** eigenständiges Shopify-App-Projekt: Ein `shopify app deploy` aus einem unvollständigen Projekt entfernt nicht enthaltene Module. Die Dateien werden in das vollständige private Erweiterungsprojekt auf dem Host kopiert (siehe [SHOP-EINSTIEG.md](../SHOP-EINSTIEG.md)). Die bisherigen Blöcke `configurator.liquid` und `personalizer.liquid` bleiben unverändert erhalten.

| Datei | Ziel in der Erweiterung | Zweck |
| --- | --- | --- |
| `blocks/jetzt-personalisieren.liquid` | `extensions/gravuru-storefront/blocks/` | App-Block für Produktsektionen: sichtbar nur, wenn das Produkt das Metafeld `custom.customization_id` trägt (Definition `gid://shopify/MetafieldDefinition/397781762428`, Konfi-Produktkennung). Link auf `/apps/<subpath>/start?product=<id>&variant=<id>&back=<Produktpfad>`. |
| `assets/gravuru-personalisieren.js` | `extensions/gravuru-storefront/assets/` | Hält die Varianten-ID im Link aktuell (Produktformular `name="id"`, `?variant=`, Theme-Ereignisse). Ohne JavaScript bleibt der Link auf der beim Rendern gewählten Variante nutzbar. |
| `snippets/gravuru-warenkorb-bearbeiten.liquid` | **Theme** (`snippets/`), nicht Erweiterung | Gesicherte `_Entwurf`-Vorschau und „Bearbeiten“-Link je Warenkorbzeile aus `_gravuru_config`/`_gravuru_rev` (K8). Aufruf direkt in der Bildspalte von `sections/main-cart.liquid` und `sections/cart-drawer.liquid`: `{% render 'gravuru-warenkorb-bearbeiten', item: item %}`. |

Übergeben werden ausschließlich Shopify-Produkt-ID, Varianten-ID, der Produktpfad für den Rücksprung und beim Bearbeiten `config`/`rev`/`line`. Kein Preis, keine SKU, kein Handle: Die Zuordnung zum Werkstattprodukt trifft der Server allein über die Binding-Registry {Produkt-ID, Varianten-ID}. Shopify signiert jede Proxy-Anfrage; der Server prüft Signatur, Shop und Zeit.

Der Block-Einstellwert `subpath` (Vorgabe `konfigurator`) muss zum App-Proxy der App passen (`[app_proxy] prefix = "apps"`, `subpath = "konfigurator"`). Beide Werte sind in der Shop-Adresse sichtbar und eine Entscheidung von Chris.

## Warenkorb: Vorschau und Bearbeiten unter dem Bild (27.10.2026)

`cart-media-placement.patch` integriert den Baustein in die Bildspalten von `sections/main-cart.liquid` und `sections/cart-drawer.liquid`. Zusätzlich übernehmen: `snippets/gravuru-warenkorb-bearbeiten.liquid` und `assets/gravuru-legacy-cart.js`. Insgesamt vier Theme-Dateien. Kein zusätzlicher Snippet-Aufruf rechts bei den Eigenschaften.

Native Konfigurationen verwenden weiterhin ihre signierte App-Proxy-Bearbeitung. Ältere Gedenktafeln werden anhand der vorhandenen Vorgangskennung plus bearbeitbarem Entwurf erkannt. Beide zeigen die gespeicherte Vorschau mit einem 44-px-Bearbeiten-Link darunter. Der Bilddialog zeigt Upload-PNGs inline trotz Download-Header. Technische Dateilinks der älteren Strecke bleiben an der Position gespeichert, werden aber nicht als lange öffentliche Eigenschaften angezeigt.

Das JS-Asset muss auch auf Produktseiten geladen sein: Die Einbindung in cart-drawer liegt deshalb außerhalb des Guards für die Drawer-Einstellung. Ohne diese Einbindung wäre der Bearbeiten-Rückweg auf der Produktseite wirkungslos.

Für die ältere Strecke benötigt der Host zusätzlich den geprüften Restore-Patch:
`ops/repair-memorial-cart-edit.mjs --preview VORSCHAUORDNER --runtime AKTIVE_LAUFZEIT --out NEUER_PRIVATER_ORDNER`.
Erst Dry-run; Apply nur mit `--apply --backup NEUER_PRIVATER_ORDNER`. Auf den geprüften Gedenktafelstand (Profilrevision 30, Shopify-Preisrevision 31) begrenzt. Danach Plesk **App neu starten**, da der Vorschau-Router Module im Prozess vorhält. Produkt-/Versionsprüfung, Fotos, exakte Geometrie und Sitzungsgrenzen bleiben erhalten. Andere Produkte werden damit nicht automatisch migriert.

Echte Abnahme: Gedenktafel mit Foto und Haus für **34,67 €** aus dem Warenkorb wieder geöffnet und dieselbe Position erfolgreich aktualisiert. Vier Positionen vorher/nachher, andere drei unverändert; gespeicherte PNG danach sichtbar. Desktop/Handy-Darstellung des Links geprüft. Der Shop verwendet die Warenkorbseite, deshalb keine gesonderte visuelle Drawer-Abnahme behaupten.

Ausschließlich im unveröffentlichten Testtheme **190557716860** bereitgestellt und zurückgelesen. MAIN **185833718140** ist durch die Anbindung schreibgesperrt. Zur Live-Übernahme nur diese vier Dateien auf den aktuellen Stand übertragen, nicht die gesamte Testkopie veröffentlichen. Patchbasis: main-cart MD5 `e653c987ec228b80353a8754be5f5566`, cart-drawer `445189ac2e8c73c81c40fe3010873c37`.

Liquid-Stateless-Prüfung: Snippet und Sections ohne Fehler; bestehende Komplexitätswarnungen bleiben. Vollauf Konfigurator: **316 / 308 bestanden / 8 bekannte Windows-/Python-Fehler**, Wiederherstellung **11/11**. Kundenfoto und Dateiadressen bleiben außerhalb des Repositories.
