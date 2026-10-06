# Shopify-Entwürfe aus dem gespeicherten Produktstand

Stand: 06.10.2026, 17:48 UTC. Repository `Chris83638w/gravuru-2027`, Branch `task/shop-draft-transfer-20261006`. GitHub-Basis `88d1536dc1411ee4ea9f4633a9fe4b00089834cb`, vor Sicherung remote als identisch zu `task/integrated-finish-20261006` bestätigt. Vorhandener Code und private Bestände wurden nicht ersetzt.

## Umgesetzt

Die bestehende Produktvorbereitung erhält „Shopify-Entwurf anlegen“ und „Status prüfen“. Gespeicherter Titel, SEO und Grundpreise kommen aus `prepareShopProduct`; Größen, Sockel und Wandhalterung behalten ihre Optionsgruppen. Der geprüfte Acrylstand ergibt 28 Ausführungen. Designs erzeugen keine zusätzlichen Produkte oder Varianten. Standard ist `DRAFT`, keine Veröffentlichung. Bilder und individuelle Aufpreise sind ausdrücklich noch nicht Teil dieser Übertragung.

Vor einer Anfrage wird genau ein Versuch pro Shop/Produkt in derselben privaten SQLite-Datenbank reserviert. Anfrage und Ausgangs-SHA sind unveränderlich. Gleichzeitige Anfragen, Neustart und ein verlorenes Ergebnis lösen keine zweite Anlage aus. Ein fester Handle plus Quellen-Hash verknüpfen das Ergebnis. Vorhandene manuelle Variantenbindungen sperren eine zweite Produktanlage. Eine geänderte Produktrevision überschreibt weder den früheren Entwurf noch erzeugt sie automatisch einen neuen.

Der lesende Abgleich prüft Shopdomain, EUR, API-Version, Handle, Titel, SEO, Entwurfsstatus, Quellenmarkierung sowie sämtliche Optionskombinationen, eindeutige Varianten-IDs und exakte Centpreise. Unvollständige oder widersprüchliche Ergebnisse erzeugen keine Bindungen. Nach einer verlorenen Antwort wird ausschließlich gelesen; auch „nicht gefunden“ erlaubt keine automatische Wiederholung. Solche Fälle erfordern eine gesonderte Klärung des ersten Versuchs.

Ein bestätigtes Remote-Ergebnis wird vor der lokalen Variantenbindung aufbewahrt. Scheitert nur die lokale Zuordnung, kann „Zuordnungen übernehmen“ die gespeicherten IDs übernehmen, ohne eine weitere Shopify-Anfrage. Vor und nach dem Versand wird die aktuelle Produktrevision/Archivierung geprüft. Ein gespeicherter Erfolg bedeutet keine erneute Liveprüfung des späteren Shopzustands.

## Serverseitiger Anschlussvertrag

`createWorkshop` erhält optional `shopDrafts: {config, transportOptions?}`. `config` enthält ausschließlich serverseitig `mode: 'draft-only'`, `shopDomain`, `apiVersion: '2026-07'`, `accessToken`. Voraussetzung ist die bestehende `shopifySessions`-Testanbindung an exakt denselben Shop. Der Token benötigt `read_products` und `write_products`; er darf nicht aus dem Browser stammen oder in URLs, Dateien des Repositorys oder Logs gelangen. `transportOptions` dient der Testinjektion, nicht dem Browser.

- `GET /api/workshop/products/:id/shop-transfer?revision=N`: aktivierter Anschluss, privater gespeicherter Übertragungsstatus und getrennte Bestätigung der lokalen Bindungen.
- `POST /api/workshop/products/:id/shop-transfer`: ausschließlich `{expectedRevision, sourceSha256, action}` mit `action` gleich `create` oder `reconcile`. Händler-Sitzung, bestehender Host-/Origin-/CSRF-Schutz, begrenzter Body; Browserpreise und zusätzliche Felder werden zurückgewiesen.
- Fester HTTPS-Admin-Endpunkt, API `2026-07`, keine Weiterleitungen, begrenzte Antwortgröße und Zeit, keine automatischen Wiederholungen. Upstream-Fehler/Tokenwerte erscheinen nicht in Antworten.

GraphQL `products` und synchrones `productSet` wurden mit dem offiziellen Shopify-Schema geprüft, einschließlich Options-/Varianten-/SEO-Typen. Beide Operationen, Revision 2, wurden am 06.10.2026 erfolgreich validiert. Es wurde keine echte Mutation ausgeführt. Grundlage: https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/productSet .

## Tatsächliche Prüfungen in dieser Cloud-Aufgabe

Direkt mit `node app/workshop/<Datei>` ausgeführt:

| Testdatei | Bestanden |
|---|---:|
| `shop-draft-transfer.test.mjs` | 22 |
| `customer-downloads.test.mjs` | 17 |
| `cart-http-gate.test.mjs` | 9 |
| `merchant-request.test.mjs` | 3 |
| `acrylic-draft-store.test.mjs` | 7 |

**58 bestanden, 0 Fehler, 0 Skips.** Neue Fälle prüfen auch Neustart/Parallelität, verlorene Antworten, lokale Bindungsfehler, Änderungen während Versand, Timeout, HTTP-/GraphQL-/Benutzerfehler, Redirects und übergroße Antworten. Echte SQLite-Datenbank und echter HTTP-Requesthandler, aber synthetische Requests/Shopantworten im Prozess. Kein Netzwerklistener und keine realen Shopprodukte. Keine erneute Gesamtsuite oder alte 137-/355-Testzahl als aktueller Nachweis.

`npm run build`: **76 Ressourcen, 1 Modell**, `editorBytes: 461440`. JavaScript-Syntax und Dokument-/Quelltextdiff geprüft. Keine neue visuelle Browserabnahme: die zuletzt dokumentierten Listener-/Browsergrenzen wurden nicht erneut als erfolgreiche Vorschau ausgegeben.

## Verbleibende Grenzen und nächster Schritt

Aktuelle Cloud-Laufzeit meldete Revision 339, verbunden/laufend, eingeschränktes Paketmanager-Netz und keine konfigurierten Secrets, Laufzeitvariablen oder ausgehenden Identitäten. Der Standardscriptstart aktiviert diesen Anschluss deshalb nicht. Shopify-Connector und Browserlogin ersetzen keine Runtime-Appanmeldung. Bestehende App: `Gravuru Konfigurator`, Shop `gravuru-design.myshopify.com`, App-ID `423276544001`. Der Chatname ist kein Shopify-Appname.

Der nächste Integrationsschritt ist die sichere bestehende App-/Hostanbindung einschließlich App Bridge und klar getrennter öffentlicher Kundenrouten. Danach kann dieser Entwurfspfad mit einem tatsächlichen Testprodukt abgenommen werden. Keine Passwörter im Chat erforderlich. Produktbilder, kontrollierte Aktualisierung bestehender Shopify-Produkte, individuelle Aufpreise und Kundenkonto-Erweiterung sind weiter offen. Ebenso Drive-/KI-Dienste, vollständige Referenzserie, Maschinen-/ICC-Abnahme und dauerhaft bestätigte private Betriebsablage. Dieser Teilabschluss ist keine fertige Live-Bestellstrecke.

Die vorübergehend gewünschte allgemeine Domainfreigabe nach Einrichtung wieder auf die tatsächlich benötigten Ziele beschränken. Keine Serveränderung, Liveveröffentlichung, PR oder Merge in diesem Lauf.
