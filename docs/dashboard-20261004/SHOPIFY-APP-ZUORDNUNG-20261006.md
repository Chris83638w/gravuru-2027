# Bestehende Shopify-App direkt bestätigt – 06.10.2026

Repository `Chris83638w/gravuru-2027`, Aufgabenbranch `task/shopify-app-identity-20261006`, Basis `b8a82328e127901d95dbbc269a9f4c30ec7d2fb1`.

Der Nutzer hat die vorhandene App **Gravuru Konfigurator** benannt und die Verwendung des Shopify-Plugins ausdrücklich bestätigt. Anschließend ausschließlich lesende Admin-GraphQL-Abfragen über den verbundenen Shopify-Connector: Schema entdeckt, Abfragen validiert, Shop und vollständige Installationsliste gelesen (`hasNextPage: false`), exakte Installation separat geprüft.

| Merkmal | Direkt bestätigter Wert |
|---|---|
| Shop | `gravuru-design.myshopify.com` |
| App | **Gravuru Konfigurator** |
| Entwickler | **gravuru GmbH** |
| App-ID | `gid://shopify/App/423276544001` |
| Installation | `gid://shopify/AppInstallation/941403308412` |
| Eingebettet | `true` |
| App-Startadresse | `https://gravuru-design.myshopify.com/admin/apps/gravuru-konfigurator` |

Gelesene gewährte Berechtigungen: `read_files`, `write_files`, `read_metaobjects`, `write_metaobjects`, `read_products`, `write_products`, `read_publications`, `write_publications`, `read_cart_transforms`, `write_cart_transforms`. Kein `read_orders` in dieser Antwort. Keine Berechtigungen ergänzt oder erneute Installation ausgeführt. Diese Metadaten bestätigen weder Zugriff auf die Entwicklerkonfiguration noch Laufzeit-Credentials für die Gravuru-Cloud-App.

Die frühere offene Frage nach dem App-Namen ist damit **erledigt**. Eine Neuanlage ist zur Identifikation nicht nötig. Die installierte App darf nicht ungeprüft auf unseren neuen Backendstand umgestellt werden; tatsächliche App-/Redirect-URLs, Authentifizierung und Entwicklungsbetrieb sind noch abzugleichen. Der alte Shopify-Produktlink ist weiterhin keine App-Konfiguration.

Der Nutzer hat sich anschließend im Dev Dashboard angemeldet (Nutzerangabe; sichtbarer Kontext `https://dev.shopify.com/dashboard/172197140`). Kein eigener Browser-/Dev-Dashboardzugriff behauptet. Nächster konkreter Schritt: **Apps → Gravuru Konfigurator öffnen und den Verwaltungslink dieser App zuordnen**. Keine Secretwerte im Chat/Repository.

## Plugin-Verfügbarkeit

`Shopify` ist als installiert gemeldet und seine lesenden Werkzeuge funktionieren. Der explizite Verweis `shopify-app-builder@openai-curated-remote` wurde über Plugin-Suche, vollständigen verfügbaren Skillkatalog und genaue Plugin-Auflösung geprüft. Die genaue Auflösung meldet `plugin_not_found` / keine öffentlich gelistete aktuelle Veröffentlichung. In dieser Aufgabe sind keine separaten App-Builder-Werkzeuge aufrufbar. Daraus folgt keine Behauptung, dass der Nutzer das Plugin in seiner Oberfläche nicht sehen kann. Keine unnötige Neuinstallation oder Berechtigungsänderung ausgeführt.

Nur Dokumentation geändert; keine neuen Tests/Builds erforderlich oder behauptet. Der letzte vollständige Codeprüfstand bleibt 355/0/0 und Build76/1 aus dem vorherigen Abschlussabgleich. Keine Shopmutation, Veröffentlichung, Änderung der vorhandenen App oder privaten Daten in Git.

## Aktive Version vom Nutzer übergeben

Am 06.10.2026 hat der Nutzer die Detailangaben der aktiven Version aus dem Dev Dashboard übergeben. Quelle: `https://dev.shopify.com/dashboard/172197140/apps/423276544001/versions/1146632241153`, Version `variante-m-embedded-motifs-20260928`, veröffentlicht am 28.09.2026 um12:49 durch Christopher Koch. Diese Konfigurationswerte stammen aus der Nutzerübermittlung; sie wurden nicht als selbst ausgelesene Entwickler-API-Antwort ausgegeben.

- App-URL: `https://gravuru-designwerkstatt.de/produktanlage.html`; eingebettet `true`.
- Redirect-URLs: `https://gravuru.de/shopify-designwerkstatt-20260920/` und `https://gravuru-designwerkstatt.de/produktanlage.html`. Die erste Adresse ist hier eine erlaubte Authentifizierungsrückleitung, kein Nachweis über Datenablage oder aktuellen App-Hostingpfad.
- Direct API Mode `online`, embedded direct API access `true`.
- Konfigurierte Scopes: `read_files,read_metaobjects,read_products,read_publications,write_files,write_metaobjects,write_products,write_publications`; optional `write_cart_transforms`. Dies unterscheidet sich von den tatsächlich gewährten, oben separat gelesenen Scopes.
- Webhook-API-Version `2026-07`; Definitionen der Metafelder/Metaobjekte `unstable`. Keine automatische Versionsänderung.
- Function `gravuru-personalization-price`, UID `3194be17-ee65-e144-e1da-65b8d1e1720183f0f9ef`.
- Theme-Erweiterung `gravuru-storefront`, UID `a4d6506c-8e89-ca7d-f5b1-1a0d1e00a1f9bb93e76a`.
- App-eigenes Produktmetafeld `[product.metafields.app.personalization]`: Name Gravuru Personalisierungspreise, Typ `json`, Adminzugriff `merchant_read`. Diese Definition nicht durch ein fremdes Connector-App-Namespace ersetzen; bestehende Function-/Preislogik zuerst mit ihren Quellen abgleichen.

Die laufende Werkstatt hat damit ein bekanntes Ziel. Bestehende Version/Function/Theme-Erweiterung unverändert erhalten. Unsere neue Cloud-Werkstatt ist damit noch nicht an Shopify angeschlossen. Der aktuelle Entwicklungsserver lässt `/produktanlage.html` ausdrücklich mit404 unbelegt; sein Werkstatteinstieg ist `/werkstatt/`. Daher keine blinde Umstellung der App-URL auf eine Vorschauseite.

Nächster Schritt: bestehende App-Konfiguration über authentifizierte Shopify-CLI in eine getrennte Cloud-Arbeitsablage übernehmen und anhand der Originalquellen prüfen. Vorhandene Browseranmeldung ist keine CLI-Anmeldung. Keine neue Version veröffentlichen, `app dev` nicht ungeprüft auf der installierten App starten und keine bestehenden URLs/Scopes ändern.
