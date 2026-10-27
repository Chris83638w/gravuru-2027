# Funkklingel-Webhooks: EigentÃ¼mer-App und Live-Subscriptions

Codex, 27.10.2026. Neuer lokaler Deploymenthelfer; keine Live-AusfÃ¼hrung und keine neue Subscription durch diesen Teilauftrag.

## Warum ein eigener Helfer

Die bestehende Registrierung unter ops/plesk/order-webhook-registration.mjs verwendet die Gravuru-App 423276544001 und ausschlieÃŸlich ORDERS_PAID mit filter:test:true. Das Abonnement bleibt unverÃ¤ndert. Ohne eine zusÃ¤tzliche echte Zahlungszustellung wÃ¼rden die freigegebenen Funkklingelbestellungen den neuen Eingang nicht erreichen.

Im gepinnten gravuru-2027-Baum d103019b6dc0eb29413345a83af17036ce021055 existiert keine shopify.app.toml. Die vorhandene Registrierung ist ein ausdrÃ¼cklich ausgefÃ¼hrter Admin-API-Schritt. Daher ergÃ¤nzt scripts/doorbell-webhooks.mjs diesen Mechanismus.

Die Shopify-MCP-Verbindung darf die Subscriptions NICHT anlegen: Webhooks mÃ¼ssen zur bestehenden Gravuru-App gehÃ¶ren, damit deren HMAC zum geheimen SchlÃ¼ssel des bestehenden Hosts passt. Der Helfer verwendet readCredentials/createShopifyClient aus scripts/shop-export.mjs. Er prÃ¼ft vor Ã„nderungen Shop, App-ID und Ã¶ffentliche App-Client-ID.

## Feste Ziele

Neu, jeweils JSON und filter:test:false:

- ORDERS_PAID â†’ https://app-2027.gravuru-designwerkstatt.de/webhooks/shopify/orders-paid
- ORDERS_UPDATED â†’ https://app-2027.gravuru-designwerkstatt.de/webhooks/shopify/doorbell-orders-status
- ORDERS_CANCELLED â†’ dieselbe Statusroute

Das bestehende Test-PAID-Abonnement wird auf exakte benÃ¶tigte Felder, URI, Filter und Version geprÃ¼ft. Andere Zieladressen werden weder geÃ¤ndert noch gelÃ¶scht. Bei unerwarteten Subscriptions an den festen Zieladressen blockiert der Helfer. Ein erneut ausgefÃ¼hrter bestÃ¤tigter Lauf erzeugt keine Duplikate.

PAID behÃ¤lt die bestehende minimale Feldauswahl einschlieÃŸlich Produkt-/Varianten-ID, Preis, Menge, Entwurfsreferenz und customer.id. Status liefert nur benÃ¶tigte Order-/Varianten-/Storno-/Erstattungsfelder; keine Adressen, E-Mails oder Transaktionsbelege.

## Voraussetzungen und API-Version

- Der vorhandene Gravuru-App-Zugang besitzt bereits read_orders oder write_orders. Fehlende Berechtigungen werden gemeldet; der Helfer erweitert keine Scopes.
- publicApiVersions muss 2026-07 ausdrÃ¼cklich als supported:true zurÃ¼ckgeben.
- currentAppInstallation.app.webhookApiVersion muss 2026-07 sein; auch jedes gelesene/neu angelegte Abonnement muss diese tatsÃ¤chlich zurÃ¼ckgemeldete Version besitzen.
- Bei Abweichung blockiert der Helfer. Er verÃ¤ndert keine globale App-Version.
- Vor --apply werden die 126 Manifestprodukte und 15.120 Varianten, die aktuellen BindungskÃ¶pfe sowie die unverÃ¤nderlichen Freigaben und Dokument-SHAs aus der vorhandenen Acryl-Datenbank gelesen.
- GRAVURU_CUSTOMER_INTEGRATION=merchant-test-only und GRAVURU_DOORBELL_LIVE_ORDERS=approved-20261027 mÃ¼ssen gesetzt sein.
- Beide bereitgestellten HTTPS-Endpunkte mÃ¼ssen einen unsignierten leeren Probeaufruf mit 401 ablehnen. Der Probeaufruf enthÃ¤lt keine Bestellung oder Zahlung.

Version und UnterstÃ¼tzung werden erst im echten lesenden Deploymentlauf live belegt; die lokalen Tests ersetzen diesen Nachweis nicht.

## AusfÃ¼hrung auf dem bestehenden Server

Arbeitsverzeichnis: private/gravuru-2027-main. Vorhandene Gravuru-Credentials Ã¼ber die vom vorhandenen shop-export unterstÃ¼tzten Umgebungsnamen verwenden. Keine geheimen Werte ausgeben und nicht die Credentials der Shopify-MCP-App verwenden.

Zuerst nur lesen:

node scripts/doorbell-webhooks.mjs --dry-run --out <private-neue-pruefablage>/doorbell-webhooks.json

Nach Code-/Katalogdeployment, 126 vollstÃ¤ndigen Freigaben und aktivem Host:

node scripts/doorbell-webhooks.mjs --apply --manifest <126er-binding-manifest.json> --db <vorhandener-Acryl-Datenordner>/workshop.sqlite --out <private-neue-pruefablage>/doorbell-webhooks.json

Den Helfer nur einmal gleichzeitig ausführen; das Journal besitzt keinen exklusiven Prozesslock. Widersprüchliche Optionen --dry-run und --apply zusammen werden vor jedem Netzwerkzugriff abgewiesen.

Dasselbe Journal bei Wiederaufnahme verwenden. Vor jeder Mutation wird der Versuch dauerhaft protokolliert. maxRetries:0 verhindert eine blinde Wiederholung nach unklarem Netzwerkausgang. Ein bereits sichtbares passendes Abonnement wird erkannt; eine unbestÃ¤tigte frÃ¼here Erstellung ohne sichtbares Ergebnis blockiert zur KlÃ¤rung. Niemals das Journal lÃ¶schen, um diese PrÃ¼fung zu umgehen.

## PrÃ¼fung

10/10 Tests grÃ¼n:

node --test scripts/doorbell-webhooks.test.mjs app/workshop/doorbell-live-intake.test.mjs

Abgedeckt: EigentÃ¼mer-App, Version/Support, vorhandene Scopes, vollstÃ¤ndige126erFreigaben mit15.120aktuellenBindungen, unverÃ¤nderteTest-/Fremdsubscriptions, drei gezielteNeuanlagen, Readback, Idempotenz, unklarerAusgang, Konflikte, Pagination sowieBestellungenohneGravuruPosition. Letztere werden mit0PositionenbestÃ¤tigt undrufenkeinenStoreauf.

## API-Belege

Shopify-MCP-Schema wurde fÃ¼r QueryRoot, Mutation, WebhookSubscription, WebhookSubscriptionInput, WebhookSubscriptionTopic, AppInstallation, App, ApiVersion, Shop, AccessScope und UserError gelesen. Die drei Operationen wurden an validate_graphql_codeblocks Ã¼bergeben; der Dienst meldete lediglich, dass die Validierung bei AusfÃ¼hrung erfolgt. Es wurde ausdrÃ¼cklich keine Mutation Ã¼ber MCP ausgefÃ¼hrt.

PrimÃ¤rdokumentation, am 27.10.2026 gelesen:

- https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/webhookSubscriptionCreate
- https://shopify.dev/docs/api/admin-graphql/2026-07/queries/webhookSubscriptions
- https://shopify.dev/docs/apps/build/webhooks/subscribe

Die Admin-Inventarabfrage liefert nur API-verwaltete Subscriptions, keine TOML-Subscriptions. Falls zwischenzeitlich an anderer Stelle deklarative Subscriptions eingefÃ¼hrt wurden, diese vor AusfÃ¼hrung im EigentÃ¼mer-App-Dashboard prÃ¼fen, um doppelte Zustellung zu vermeiden.
