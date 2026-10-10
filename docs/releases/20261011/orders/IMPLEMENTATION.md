# Signierter Testbestelleingang – 11.10.2026

Eigener Eingang `/webhooks/shopify/orders-paid` für Shopify-HMAC über unveränderte Bytes. Nur POST, JSON, festgelegter Host/HTTPS, Shop `gravuru-design.myshopify.com`, API 2026-07, `orders/paid`, `test:true`, EUR und bezahlte, nicht stornierte Bestellungen. Browser-Origin/Fetch-Metadaten, doppelte Pflichtheader, Query-Parameter, komprimierte/zu große/langsam gelieferte Nachrichten werden abgewiesen. Keine Browser-Anmeldung für diesen Eingang; bestehende Händler-APIs behalten JWT und Schreibschutz.

Antwort erst nach synchronem lokalen Datenbank-Commit; keine Shopify-Abfragen, Dateierzeugung oder Fertigung im Handler. Angebot, Preis, Menge, Produktrevision und Entwurfsreferenz werden vom vorhandenen unveränderlichen Bestelleingang geprüft. Wiederholungen erzeugen keine zweite Position. Antwort enthält ausschließlich Annahmestatus und Trefferzahl, keine Kundendaten/Entwurfszugänge. Fachliche Fehler bleiben Fehler und lösen kein erfolgreiches Zahlungsereignis aus.

Aktivierung ausdrücklich über private Konfiguration `GRAVURU_SHOPIFY_ORDER_WEBHOOK=test-only-2026-07`. Ohne Feld bleibt der Eingang geschlossen. Offline-Helfer verlangt eine passende Release-Aktivierung und vorherige private Konfigurationssicherung; vorhandene Konfigurationsänderungen werden nicht überschrieben.

Shopify-Version soll ausschließlich `read_orders` ergänzen. Sieben bestehende Module, Theme, Preisfunktion, App-Adresse, optionale Scopes und Webhook-API-Version bleiben unverändert. Shop-spezifisches Abonnement wird mit der eigenen App angelegt: `ORDERS_PAID`, fester HTTPS-Eingang, `test:true`, nur notwendige Feldpfade einschließlich `customer.id`. Keine Adressen/E-Mail-Felder angefordert. Existierende abweichende Abonnements werden nicht geändert. Vor Mutation unsigned HTTP-Probe erwartet 401; danach Readback. Privates Versuchsprotokoll verhindert einen zweiten Create-Aufruf nach unklarem Ausgang.

## Prüfungen vor Veröffentlichung

- Vier echte HTTP-Prüfgruppen: feste Zuordnung vor Antwort, Duplikate, gefälschte/ungeeignete Nachrichten, Transaktionsrollback, Größen-/Zeitgrenzen.
- Sieben Händler-Laufzeitprüfgruppen einschließlich zweier Listener, Host/HTTPS/JWT/CSRF, Neustart, optionalem Eingang und persistierter Duplikaterkennung. Synthetische Daten außerhalb Git.
- 16 Bestell-/Preisvertrags-/Runtime-/Versionsprüfungen, darunter Schutz der sieben App-Module.
- Drei Registrierungsprüfungen: minimaler fester Vertrag, fehlende Berechtigung/falsche App/Konflikte ohne Mutation, Wiederaufnahme nach verlorener Antwort ohne zweiten Create-Aufruf.
- Neue GraphQL-Lese- und Create-Operationen mit Shopify-Schema validiert. Tests sind keine wirklichen Shopify-Bestellungen.

Offizielle Quellen: [HMAC](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries), [HTTPS-Zustellung](https://shopify.dev/docs/apps/build/webhooks/subscribe/https), [Payload-Felder](https://shopify.dev/docs/apps/build/webhooks/customize/modify-payloads), [Filter](https://shopify.dev/docs/apps/build/webhooks/delivery-filtering). Die offiziellen Seiten wurden ergänzend zu den Skills geprüft; verschachtelte Feldpfade sind ausdrücklich dokumentiert. Webhook-Schemabeschreibung bestätigt `read_orders` für `ORDERS_PAID`.

Noch keine echte Shopify-Testbestellung, keine vollständige Checkout-Gesamtstrecke und keine Produktionsfreigabe. Veröffentlichung und tatsächlich gewährte Scopes benötigen eigene nachfolgende Belege.
