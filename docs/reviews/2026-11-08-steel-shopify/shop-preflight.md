# Shopify-Vorprüfung: Edelstahl-Türschilder

Stand: 08.11.2026 (Europe/Berlin). Ausschließlich lesende Prüfung über den Shopify-Connector, GitHub und lokale Quelldateien. Keine Shop-, Theme-, Server-, Warenkorb- oder Bestelländerung; kein Browser übernommen.

**Der passende bestehende Shopify-Entwurf ist gefunden: Produkt 16190784438652 enthält bereits genau 404 Varianten, 80 Größen und alle acht Formcodes. Eine Neuanlage ist für diesen Anker nicht erforderlich.** Die Daten stehen vollständig mit echten Varianten-IDs in [shop-preflight.json](shop-preflight.json), Abschnitt `masterDoorProduct`. Die tatsächliche Kunden- und Preisfreigabe ist damit noch nicht nachgewiesen.

## Tatsächlich gelesener Shop und Rechte

Der aktuelle Connector bestätigt **Gravuru Design**, `gravuru-design.myshopify.com`, **Shopify Plus**, **EUR**, Deutschland. Die Shop- und App-Kennung passt zum lokalen Adapter `app/workshop/shopify-runtime-config.mjs`.

Die Abfrage läuft als **Shopify ChatGPT MCP App**, App-ID `340764327937`; sie läuft **nicht** als Gravuru Konfigurator.

Aktuell installiert und per `appInstallations` zurückgelesen:

| App | App-ID | Relevanter tatsächlicher Zugriff |
|---|---:|---|
| Gravuru Konfigurator | 423276544001 | Produkte, Dateien, Metaobjects, Veröffentlichungen, Bestellungen; read/write_cart_transforms |
| Gravuru Assistent | 424401403905 | read/write_app_proxy |
| Fancy Product Designer | 1804009 | Unter anderem Cart-Transform-Zugriff |

Die Installation einer App und ihre Scopes beweisen nicht, dass eine bestimmte Function-Version aktiv ist. Der Connector verweigert `cartTransforms` ausdrücklich wegen fehlendem `read_cart_transforms`. `shopifyFunctions` liefert für **diesen Connector** keine Einträge. Beide Abfragen sind an die anfragende App gebunden; daraus folgt keine Aussage, dass Gravuru keine Function hat. [Cart-Transform-Abfrage](https://shopify.dev/docs/api/admin-graphql/latest/queries/cartTransforms), [Function-Abfrage](https://shopify.dev/docs/api/admin-graphql/latest/queries/shopifyFunctions).

Die dokumentierten lokalen Gravuru-Auth-Umgebungsvariablen waren nicht gesetzt. Es wurden keine Geheimnisse gesucht, ausgegeben oder gespeichert und keine Berechtigungen geändert.

## Vorhandener Türschild-Anker: vollständig gelesen

[Im Shopify-Admin öffnen](https://admin.shopify.com/store/gravuru-design/products/16190784438652)

| Eigenschaft | Aktueller API-Stand |
|---|---|
| Titel | Türschild Edelstahl – Form und Größe selbst wählen |
| Produkt-ID | gid://shopify/Product/16190784438652 |
| Status | DRAFT |
| Handle | tuerschild-edelstahl-form-und-groesse-selbst-waehlen |
| Produktvorlage | konfi |
| Öffentliche URL | null; unveröffentlicht |
| custom.customization_id | katalog-formate-edelstahl-tuerschilder-familienschilder-eb5fe26624befe4a |
| Varianten | 404; neun API-Seiten, letzte Seite hasNextPage=false |
| Größen | 80 unterschiedliche kanonische SKU-Größenschlüssel |
| Formen | 8 SKU-Formcodes |
| Doppelte Varianten-ID / SKU im Anker | 0 / 0 |
| Beobachtete Variantenpreise | 7,99–163,98 EUR; keine neue Preisfreigabe |

| Formcode | Größen | Varianten |
|---|---:|---:|
| RE | 27 | 137 |
| EL | 7 | 35 |
| OV | 10 | 50 |
| AB | 10 | 52 |
| QU | 7 | 35 |
| R | 5 | 25 |
| RT1 | 7 | 35 |
| RT2 | 7 | 35 |
| Gesamt | 80 | 404 |

**EL wird in den Shopify-Optionstexten ebenfalls „Oval“ genannt.** Die SKU trennt EL und OV korrekt. Für den Abgleich unbedingt den kanonischen Form-/Größenschlüssel verwenden; den Anzeigenamen nicht als Form-ID interpretieren. Keine Umbenennung vorgenommen.

Vollständige echte Beispielvariante:

- `58104601149820`
- `156-GR-ES-RE-80X20-T15-K00`
- Rechteck · 8 × 2 cm / Ohne Bohrung
- 9,49 EUR

Die sieben beobachteten Befestigungsbezeichnungen lauten Ohne Bohrung, Selbstklebend – glatte Flächen, Selbstklebend – raue Flächen, Mit 2 Bohrlöchern, Mit 2 Schrauben, Mit 4 Bohrlöchern und Mit 4 Schrauben. Ihre Zulässigkeit ist je Größe anhand der vorhandenen Kombinationen abzugleichen; sie dürfen nicht pauschal für jede Größe ergänzt werden.

`custom.gravuru_product_cut` enthält aktuell:

```json
{
  "sizeKey": "GR-ES-AB-120X80-T15",
  "themeId": "familienschilder",
  "defaultDesignId": "LEER-AB-120X80-D0",
  "groessenWahl": "alle",
  "vorlagen": "leer"
}
```

Das ist eine **leere Startvorlage**, keine bereits bestätigte Türschild-Designgruppe. Designgruppe, Startdesign und Einstieg „Ausführung zuerst“ müssen über das bestätigte Produktprofil angebunden werden, ohne die gemeinsame Oberfläche umzubauen.

## Bestehende Produkte schützen

Die breit angelegte GraphQL-Suche nach Edelstahl wurde über 17 Seiten bis `hasNextPage=false` gelesen: **801 Suchtreffer**. Sie enthält auch Mischmaterialien, Klingelschilder, Hochzeitsprodukte und Schiefer mit Edelstahl-Zubehör. Das ist keine Zahl reiner Edelstahl-Türschilder.

Alle **105 historischen Edelstahl-Hauptprodukte** aus `docs/handoffs/2026-10-23-shopify-edelstahl-hauptprodukte.txt` wurden über ihre bestehenden Produkt-IDs im aktuellen Shop wiedergefunden. Deren **153 Varianten** sind vollständig gelesen und im JSON unter `legacyProducts105` gespeichert. Weitere breite Suchtreffer mit mehr als zehn Varianten wurden nicht vollständig ausgelesen; das JSON behauptet dafür keine vollständige Variantenabdeckung.

Beispiele der aktuell vorhandenen, angebundenen Altprodukte:

| Produkt | Shopify-ID | customization_id |
|---|---:|---|
| Türschild 7 × 2 cm | 16077793821052 | 3100000 |
| Türschild Leuchtturm 12 × 8 cm | 16077798965628 | 4100000 |
| Türschild Pfote 18 × 12 cm | 16077799227772 | 4500000 |
| Haustürschild Haus und Herz 30 × 20 cm | 16077799555452 | 4800000 |

Vor einem späteren Sync die bestehende Produkt-/Varianten-ID-Zuordnung verwenden. Keine Zusammenlegung, Löschung oder neue Anlage allein anhand eines ähnlichen Titels. Die 404er-Entwurfsstruktur zunächst gesondert gegen die freigegebene native Familie vergleichen.

## Astras Andenken-Pilot bleibt gesondert

[Draft PR 191](https://github.com/Chris83638w/gravuru-2027/pull/191) wurde aktuell gelesen. Der darin dokumentierte Entwurf wurde ebenfalls direkt in Shopify geprüft:

- Produkt `16196606001532`, **Andenkenschild Edelstahl – 5 × 2 cm**, weiterhin DRAFT.
- Fünf Varianten: `58162739446140`, `58162739478908`, `58162739511676`, `58162739544444`, `58162739577212`.
- Preise 7,99 / 10,98 / 11,98 / 10,48 / 10,68 EUR.
- Keine öffentliche URL; kein customization_id.
- Laut PR nativer Stand `cfg_95f1e9be-0a63-4168-8cbe-d19b789546a5`, Revision 1, Originale D401/D406/D408/D410. Die native Hostbindung wurde hier nicht erneut aus einer Serverdatenbank gelesen.

Dieser Pilot ist weder neu anzulegen noch zum Türschild-Piloten umzudeuten. Das JSON enthält seine aktuelle vollständige Shopify-Antwort unter `protectedAndenkenPilot`.

## Tatsächliche Theme-Einbindung

Aktuelles MAIN-Theme: **185833718140**, `gravuru-shopify-theme/production`.

Aktuelle Theme-Dateien wurden über die Admin-API gelesen. Gespeichert wurden nur die relevanten Block- und Routenbelege, keine Kontaktdaten oder vollständigen Theme-Einstellungen.

- `config/settings_data.json`: Gravuru-`personalizer`-App-Embed **aktiv**.
- `templates/product.konfi.json`: aktiver Custom-Liquid-Block zeigt „Jetzt personalisieren“, wenn `custom.customization_id` gesetzt ist.
- Ziel ist `/apps/konfigurator/start?product=<id>&variant=<id>&back=<Produktpfad>`.
- `templates/product.test-temp-svenja-grid.json`: gleicher aktiver Custom-Liquid-Einstieg. Der zusätzlich vorhandene `jetzt-personalisieren`-App-Block ist deaktiviert.
- `snippets/gravuru-warenkorb-bearbeiten.liquid` und `assets/gravuru-legacy-cart.js` sind im MAIN-Theme vorhanden. Das allein beweist nicht ihre vollständige Einbindung und Funktion in allen Warenkorbansichten.
- Separates unveröffentlichtes Theme **190557716860**, „Konfigurator-Test 26.10. (Kopie production)“, ist vorhanden und ein möglicher Prüfbereich.

Ein einzelner unabhängiger GET auf die vorhandene öffentliche Pfoten-Produktseite ergab **HTTP 429**. Es wurde weder eine funktionierende Kundenseite noch ein Fehler der Kundenseite daraus abgeleitet. Kein Proxy-Start wurde ausgeführt, weil dieser eine neue Kundensitzung erzeugt und die Aufgabe rein lesend bleibt.

**Nicht belegt:** tatsächlich aktivierter Proxy-Zielserver, verwendete Signatur-App, aktive serverseitige Registry-Zuordnung der 404 Varianten, aktuell ausgelieferte Kundenversion. Der Theme-Link allein reicht dafür nicht aus.

## Preisvertrag und Produktionsweg

Der vorhandene Adapter `app/workshop/shopify-admin-readonly.mjs` prüft feste Shop-/App-Identität und kann Varianten sowie den app-eigenen Preisvertrag lesen. `shop-entry.mjs` löst Produkt + Variante über die Registry auf und verlangt genau die passende native Revision. Diese vorhandenen Wege sollten wiederverwendet werden.

Der Preisvertrag liegt laut Code unter **$app.personalization**, nicht in einem frei erfundenen gemeinsamen Metafeld. Die Abfrage des app-reservierten Feldes über den anderen Connector lieferte null; das wird hier ausdrücklich als **nicht sichtbar/unbestätigt**, nicht als sicher fehlend gewertet. App-eigene Metafelder unterliegen Eigentümer- und Zugriffsregeln. [Shopify-Metafields](https://shopify.dev/docs/apps/build/metafields).

Für die reale Abnahme fehlen:

1. Lesender Nachweis mit der **Gravuru-App-Identität**: aktive Transform-ID, Function-Version, API-Version, Fehlerverhalten und tatsächlicher Produkt-Preisvertrag.
2. Aktuelle aktive Registry-Bindung des bestehenden Türschildprodukts an eine konkrete bestätigte native Revision, für alle angebotenen Varianten.
3. Produktprofilfähigkeiten serverseitig: Fotos/Logos nur bei Freigabe; ausgeblendeter Tab allein genügt nicht.
4. Geometrieprüfung aller acht Formen: R15 dokumentiert noch ein Rechtecklimit; der Hauptstand ist kein Nachweis für Oval/Ellipse/Retro-Konturen.
5. Danach gesondert autorisierter Shop → Konfi → Testwarenkorb → Testzahlung → Werkstattauftrag-Nachweis; im vorliegenden Auftrag keine Bestellung oder Warenkorbschreibung.

Der aktuelle Shop ist Plus; der frühere reine Tarifvorbehalt ist damit erledigt. Die aktive richtige Function und die geprüfte Preisübergabe bleiben davon unabhängige Bedingungen.

## Ergebnis je Freigabepunkt

| Punkt | Status | Konsequenz |
|---|---|---|
| Richtiger Shop, Plus, EUR | PASS | Identität bestätigt |
| Vorhandener 404er Türschild-Anker | PASS | Wiederverwenden, nicht duplizieren |
| Abgleich 8/80/404 mit freigegebener nativer Familie | UNKNOWN | Exakte Preise, Optionen und IDs vergleichen |
| Nutzerfreigabe der aktuellen Preise/Optionen | BLOCKED | Shopbestand ist keine neue Freigabe |
| 105 historische Hauptprodukte / 153 Varianten erhalten | PASS | Mapping für Duplikatschutz vorhanden |
| Andenken-Pilot getrennt identifiziert | PASS | Vorhandene IDs erhalten |
| Theme-Einstieg konfiguriert | PASS | Tatsächliche Konfiguration gelesen |
| Öffentlicher Produkt-/Proxyweg | UNKNOWN | GET429; keine funktionale Abnahme |
| Connector-Lesezugriff auf CartTransform | BLOCKED | App-spezifischer Zugriff nötig |
| Aktive Gravuru-Function | UNKNOWN | Kein Nachweis von Fehlen oder Aktivität |
| Aktiver privater Preisvertrag | UNKNOWN | Eigentümer-App muss lesen |
| Aktive native Server-/Registry-Bindung | UNKNOWN | Nicht aus Metafield ableitbar |
| Acht Formen und Profilfähigkeiten im freigegebenen Kundenbuild | BLOCKED | R15-Basis allein reicht dafür noch nicht |
| Bestellung/Produktion | UNKNOWN | Kein Testkauf ausgeführt |

## Empfohlener nächster Schritt

Den **bestehenden DRAFT 16190784438652** gegen die aktuelle bestätigte Familienquelle abgleichen, alle 404 echten Varianten-IDs übernehmen und die belegte leere Startvorlage durch die ausdrücklich gewählte Designgruppen-Zuordnung ergänzen. Zuerst die Optionen zeigen, wie vom Nutzer vorgegeben. Shopify-Daten nicht neu erzeugen, solange der bestehende Anker passt.

Danach auf dem vorgesehenen Server ausschließlich lesend prüfen, wohin genau dieses Produkt mit diesen IDs aktuell aufgelöst wird, und die aktive Gravuru-Function samt Preisvertrag zurücklesen. Erst nach den vorhandenen Freigaben und einem dokumentierten End-to-End-Test die Kundenbestellung aktivieren.

Der Bericht ist ein Prüfbeleg, **kein frischer maximal-60-Sekunden-Abgleich für einen späteren Schreibvorgang**. Vor einer tatsächlichen Bindungsübernahme oder einem Sync müssen die dafür vorgesehenen bestehenden Prüfadapter neue Shopify-Daten lesen.

Referenzvertrag: [PRIO-KONFI.md, 4496ae8f](https://github.com/Chris83638w/gravuru-2027/blob/4496ae8f/PRIO-KONFI.md). Kein Konfi-Code und kein Live-Shop verändert.
