# Serverseitiger Storefront-Transport, noch ohne Shop-Anschluss

06.10.2026, 16:38 Uhr Europe/Berlin. Cloud-Aufgabenbranch `task/storefront-transport-20261006`, Ausgangscommit `25968603be025fcf62319444c905bd0edb3ee8c4`.

## Konkrete Umsetzung

`app/workshop/storefront-transport.mjs` ergänzt die vorhandene Warenkorbvorbereitung um einen wiederverwendbaren HTTP-Transport. Die vorhandene GraphQL-Operation und ihre Prüfung von Variante, Menge, Preis, Gestaltungsreferenz und Shopadresse bleiben maßgeblich. Es gibt **keinen neuen aufrufbaren HTTP-Endpunkt und keine Änderung der Oberfläche**. Kein echter Shop wurde kontaktiert, kein Warenkorb oder Auftrag extern angelegt.

`createStorefrontCartTransport(config, options)` erhält ausdrücklich `shopDomain`, `apiVersion` und `privateToken`; es sucht oder lädt keine Zugangsdaten. Zulässig ist nur ein einzelner `*.myshopify.com`-Shopname, eine explizite Quartalsversion und ein gültiger Headerwert. HTTPS-Adresse und GraphQL-Pfad werden daraus fest gebildet. Keine frei wählbare URL, zusätzliche Header oder dynamischer Shopwechsel pro Anfrage. Konfiguration wird in der Closure erfasst; spätere Änderungen des Eingabeobjekts ändern das Ziel nicht.

Die zurückgegebene Funktion erhält den bestehenden geprüften Offer-Datensatz sowie `buyerIp` und optional ein `AbortSignal`. Die Käufer-IP muss aus einem künftig vertrauenswürdig ermittelten Anfragekontext stammen; der Transport übernimmt keinen ungeprüften `X-Forwarded-For`-Header. Private-Token und Käufer-IP werden mit den dokumentierten Shopify-Headern ausschließlich an den festgelegten Endpoint gesendet. Der gesendete Angebotsstand wird vor dem Warten auf HTTP eingefroren und danach unverändert geprüft.

- Genau ein POST pro Aufruf, **keine automatischen Wiederholungen**, auch nicht nach 429, 5xx, Verbindungsabbruch oder Timeout.
- Redirects werden nicht verfolgt. Eine abweichende, vom Server gemeldete API-Version blockiert die Antwort.
- Standardzeitlimit zehn Sekunden einschließlich Lesen des Antwortkörpers, Abbruchsignal unterstützt. Antwort auf 1 MiB begrenzt, auch ohne Content-Length.
- Nur JSON bzw. GraphQL-JSON wird gelesen. Nicht erfolgreiche HTTP-Antworten, ungültiges JSON, GraphQL-Fehler, Warnungen, fehlende Felder, geänderte Preise und fremde Checkout-Ziele liefern keine verwendbare Weiterleitung.
- Stabile Fehlercodes ohne Rohantwort, Token, Warenkorb-URL oder eingebettete Upstreamfehlermeldung. Nach Versand steht ausdrücklich `mayHaveCreatedCart: true` und `retryable: false`: ein Fehler beweist nicht, dass kein Warenkorb angelegt wurde.
- Erfolg bedeutet ausschließlich geprüfte Warenkorbdaten mit `paymentConfirmed: false`. Keine Zahlungs-, Bestell- oder Downloadfreigabe.

Der gemeinsame Antwortvalidator lehnt zusätzlich falsch typisierte GraphQL-Fehlerfelder ab und behandelt fehlende Preisobjekte kontrolliert, ohne rohe JavaScript-Zugriffsfehler weiterzugeben.

## Ausgeführte Prüfung

```sh
node --test app/workshop/storefront-transport.test.mjs app/workshop/storefront-cart.test.mjs
```

**34 Tests einschließlich Subtests bestanden, 0 Fehler, 0 Skips.** Sieben neue übergreifende Transportszenarien mit konkreten Unterfällen sowie die vier vorhandenen Cart-Tests. Ein tatsächlich gestarteter lokaler HTTP-Testserver ersetzt über eine ausschließlich im Test injizierte Fetch-Funktion das Shopify-Ziel. Es wurden keine echten Credentials benutzt.

Geprüft: korrekter Endpoint/Header/Body, unveränderter Angebotsstand während HTTP, fehlende Konfiguration/Käufer-IP, Abbruch vor Versand, 302/401/403/429/430/500/503, große und fehlerhafte Antworten, API-Version, GraphQL-Fehler/Warnungen, Preis-/Warenkorbabweichungen, fremde Checkout-Adresse, Verbindungsausfall, Antwortkörper-Timeout und Abbruch nach Versand. Jeder gesendete Fehlerfall erzeugt genau einen Request. Kein vollständiger Cloud-Testlauf, Build oder Browserlauf für dieses ausschließlich serverseitige Teilpaket erneut ausgeführt.

## Offizielle Grundlage und Werkzeuggrenzen

Gelesen: Skill **shopify:shopify-storefront-graphql** und offizielle [Storefront-API-Referenz](https://shopify.dev/docs/api/storefront/2026-10), [Authentifizierung und Headless-Grundlagen](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api). Diese dokumentieren `Shopify-Storefront-Private-Token`, `Shopify-Storefront-Buyer-IP` für Käuferverkehr und den versionierten `/api/<version>/graphql.json`-Endpoint.

Die Skill-Shellsuche schlug mit `fetch failed` fehl; die Dokumentation wurde anschließend mit dem offiziellen Shopify-Dokumentationsconnector gelesen. Der Skill-CLI-Validator konnte wegen fehlendem `/assets` nicht validieren. Die **unveränderte** `GravuruCartCreate`-Mutation wurde stattdessen vom offiziellen Shopify-GraphQL-Validator erfolgreich gegen das Storefront-Schema validiert. Dieser Connector meldet keine explizite Schemaversion; daraus folgt keine separate Live-Abnahme von `2026-07`. Die HTTP-Tests verwenden eine synthetische Laufzeitbindung auf `2026-07`; der spätere Betrieb muss seine tatsächlich gewählte Version bestätigen. Keine Shell-Netzsperre umgangen und keine Store-Anfrage als Dokumentationsprüfung verwendet.

## Noch nötige Integration

Ein künftiger authentifizierter Serverhandler muss den richtigen Shop und die zugehörige gespeicherte Angebotsreferenz nachweisen, Buyer-IP hinter seinem vertrauenswürdigen Proxy bestimmen und geprüfte Cart-Daten vor Weiterleitung privat speichern. Wiederholte Benutzeraktionen müssen an diesen gespeicherten Vorgang gebunden werden; dieses isolierte Transportmodul ist kein dauerhaftes Idempotenzjournal. Unklare Ergebnisse dürfen nicht ungeprüft erneut mit `cartCreate` gesendet werden.

Weiter offen: sichere Runtime-App-/Shopbindung, Händler-/Kundenanmeldung, geschützter erreichbarer Backendbetrieb, echte Testbestellung und Kaufberechtigung für Kunden-PDFs. Der vorhandene Vorbereitungsbildschirm bleibt ausdrücklich ohne Versand; der Testbestell-Webhook bleibt auf Testereignisse begrenzt. Dieses Teilpaket schließt die HTTP-Transportlücke, nicht die gesamte Shopify-Integration.
