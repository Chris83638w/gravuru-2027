# Shop-Einstieg „Jetzt personalisieren“ · Deployment-Schritte (nicht ausgeführt)

Stand 23.10.2026, Branch `dev/shop-einstieg-20261023`. Technik: [app/workshop/SHOP-ENTRY.txt](../../app/workshop/SHOP-ENTRY.txt), Theme-Dateien: [theme-block/](theme-block/README.md). Nichts davon wurde auf dem Host oder in Shopify ausgeführt; alle Schritte brauchen die Freigabe von Chris. Keine Geheimnisse in Repo, Chat oder Protokoll.

## Ablauf für den Kunden

1. Produktseite im Shop (`gravuru-design.myshopify.com`), Produkt mit Metafeld `custom.customization_id` → Theme-App-Block zeigt „Jetzt personalisieren“.
2. Klick → `https://gravuru-design.myshopify.com/apps/konfigurator/start?product=<id>&variant=<id>&back=/products/<handle>` → Shopify signiert und leitet an den App-Host weiter (`GET /apps/konfigurator/start` auf `app-2027.gravuru-designwerkstatt.de`).
3. Server prüft Signatur, löst {Produkt, Variante} über die Binding-Registry auf (genau ein Treffer über beide Stores), stellt eine kurzlebige signierte Kundensitzung aus und leitet auf `https://app-2027.gravuru-designwerkstatt.de/konfigurator/shop/#s=<Sitzung>` weiter (Meta-Refresh und Link als Rückfall).
4. Die Seite lädt das Modell der festen Produktrevision (gewählte Variante vorausgewählt) und öffnet den variant-m-Editor. „In den Warenkorb“ sichert die Gestaltung als privaten Prüfstand, der Server legt die echte Variante der gewählten Ausführung mit geprüftem Shop-Preis per Storefront-API in den Warenkorb und die Seite leitet zur Shopify-Checkout-Adresse.
5. Bezahlte Testbestellung → bestehender Webhook `/webhooks/shopify/orders-paid` → Position mit `_gravuru_offer` wird an genau diesen Prüfstand gebunden (Fertigungsauftrag, `productionReady=false`).

## 1. App-Konfiguration: App-Proxy ergänzen (Entscheidung Chris)

Die aktive App-Version (zuletzt `gravuru-2027-ids-tier-20261022-v1`, sieben Module) enthält **keinen** App-Proxy. In der privaten `shopify.app.toml` des vollständigen Erweiterungsprojekts ergänzen:

```toml
[app_proxy]
url = "https://app-2027.gravuru-designwerkstatt.de/apps/konfigurator"
subpath = "konfigurator"
prefix = "apps"
```

`prefix`/`subpath` erscheinen in der Shop-Adresse (`/apps/konfigurator/start`) und müssen mit `settings.shopEntry.proxyPath` (Server) und dem Block-Einstellwert `subpath` (Theme) übereinstimmen. Shopify hängt `shop`, `path_prefix`, `timestamp`, `logged_in_customer_id` und `signature` an; der Server verlangt keine Kundenanmeldung.

## 2. Theme-App-Erweiterung erweitern

Im vollständigen privaten Erweiterungsprojekt (Quelle laut [README](README.md): Build 2026-10-10.1 bzw. aktueller Stand der 19 Theme-Dateien) **zusätzlich** ablegen, nichts Bestehendes ersetzen:

- `extensions/gravuru-storefront/blocks/jetzt-personalisieren.liquid`
- `extensions/gravuru-storefront/assets/gravuru-personalisieren.js`

Die bisherigen Blöcke `configurator.liquid`/`personalizer.liquid`, Snippets, Assets und die Function `gravuru-personalization-price` (WASM) bleiben enthalten. Vor dem Deployment `python ops/shopify/verify-extension-release.test.py` bzw. `check-private-release.py` wie bisher.

## 3. Server: Einstieg einschalten

`scripts/acryl-employee-entry.cjs` (Acryl-Release, wird von `ops/prepare-combined-id-release.mjs` gesetzt) bekommt im `customerIntegration` zusätzlich den Schlüssel `shopEntry`:

```js
customerIntegration:{mode:'merchant-test-only',legacyStoreId:'legacy',acrylStoreId:'acryl',shopEntry:{proxyPath:'/apps/konfigurator'}}
```

Optional `pagePath` (Vorgabe `/konfigurator/shop/`) und `ttlMs` (Vorgabe 4 h, höchstens 12 h). Der Einstieg nutzt dasselbe App-Geheimnis wie Händlersitzung und Webhook; keine neue Datei, kein neues Feld. Ohne `shopEntry` bleibt alles beim heutigen Händlertest.

## 4. Deployment (CLI auf dem Host, Automation-Token bleibt privat)

Wie in [README.md](README.md) beschrieben, aus dem **vollständigen** privaten Projektverzeichnis:

1. `shopify app config link --client-id 9640dd7a6907f0c73e7013ea8c24869b` in ein neues privates Arbeitsverzeichnis, kein `--reset`.
2. `shopify app versions list --json` → aktive Version festhalten (Rückkehrversion; zuletzt `gravuru-2027-ids-tier-20261022-v1`, Shopify-Version `1177374556161`).
3. `shopify app config validate --json --no-input` und `shopify app build --no-input` (prüft auch das vorhandene Function-WASM).
4. `shopify app deploy --no-release --version gravuru-2027-shop-einstieg-<datum>-v1 --message "App-Proxy und Block Jetzt personalisieren"` → Kandidatenversion ohne Release.
5. Kandidat zurücklesen (`app versions list`), Modulanzahl 8 (sieben bisherige + `app_proxy`), 21 Theme-Dateien (19 + 2), Function unverändert.
6. Erst nach Freigabe von Chris: `shopify app release --version <Kandidat>`. Rückkehr: `shopify app release --version gravuru-2027-ids-tier-20261022-v1`.

Token ausschließlich als `SHOPIFY_APP_AUTOMATION_TOKEN` im Kindprozess aus der 0600-Datei, nie als Argument, kein `--verbose`.

## 5. Theme: Block platzieren und Bearbeiten-Link

1. Theme-Editor → Produktvorlage → in der Produktinformationssektion App-Block „Jetzt personalisieren“ hinzufügen (unter dem Kaufen-Knopf), Einstellwert `subpath` = `konfigurator`.
2. Optional `theme-block/snippets/gravuru-warenkorb-bearbeiten.liquid` in das Theme kopieren und in `main-cart-items.liquid` je Zeile rendern (K8).
3. Vorschau am unveröffentlichten Theme prüfen, dann Theme-Veröffentlichung durch Chris.

## 6. Abnahme im echten Shop (Testzahlung)

- Produktseite → Knopf → Editor öffnet mit richtiger Vorauswahl der Befestigung; Variantenwechsel auf der Seite ändert den Link.
- Nicht angebundenes Produkt → Meldung „Dieses Produkt ist noch nicht für den Konfigurator eingerichtet.“ (404), kein Editor.
- „In den Warenkorb“ → Checkout zeigt die Variante der im Editor gewählten Befestigung, Menge und Preis; Testzahlung → Bestellung erscheint in der Werkstatt als Position mit Prüfstand.
- Bearbeiten aus dem Warenkorb → Zeile wird ersetzt, nicht verdoppelt (prüfen, ob Shopify die per Storefront-API angelegte Zeile im Theme-Warenkorb anzeigt; siehe README K8).
- Mobil (Telefon): Seite, Editor, Abschlussdialog, Weiterleitung.

## Offen / zu entscheiden

- App-Proxy-`prefix`/`subpath` und Veröffentlichung der neuen App-Version und des Themes.
- Aktive Registry-Zuordnungen für die 7×2-Hauptprodukte (und weitere) über den bestehenden Weg (`registry.persist` mit frischem ID-Plan); ohne Zuordnung bleibt der Knopf wirkungslos (404-Meldung).
- Preisvertrag (`$app.personalization`, `extraMotifCents`/`extraPhotoCents`, Cart-Transform) je Bindung: ohne Vertrag werden Gestaltungen mit kostenpflichtigen Zusätzen abgewiesen, nichts wird kostenlos durchgereicht.
- Formprodukte (Formeditor) sind im öffentlichen Einstieg noch nicht angebunden (404 mit Kundenmeldung).
- Mehrere Konfi-Produkte in einem Warenkorb über verschiedene Produktseiten hinweg: innerhalb einer Sitzung wird der Warenkorb wiederverwendet; über Produktseiten hinweg hängt es davon ab, ob Shopify die Checkout-Adresse mit dem Theme-Warenkorb verknüpft (im echten Shop prüfen).
- Tokenless-Storefront-Aufrufe ohne Käufer-IP (wie beim Händlertest) bei echtem Kundenverkehr beobachten.
