# Konfis: Statuswirkung und Grenzen

12.11.2026 · unabhängiger, ausschließlich lesender Quellreview von `product_plans`. Kandidat `work/issue230-integration-candidate`, HEAD `68d92902404dad0b90f99fc1bfcb282e78023974`. Keine Statusbetätigung, kein Testlauf, kein DB-/Shopzugriff und keine Appänderung. Die vom Operator gemeldeten 1.059 Entwurfeinträge und das aktive Shopify-Stahlschild wurden hier nicht erneut live abgefragt. Die private Routingreparatur ist kein Nachweis einer geänderten Statuslogik.

## Ergebnis

**„Entwurf“ bedeutet in dieser Liste nur: Es gibt noch keinen eigenen Konfi-Statuseintrag. Es bedeutet weder Shopify DRAFT noch gesperrt. „Freigeben“ ist keine Shopify-, Katalogbestell- oder Produktplanfreigabe. „Pausieren“ sperrt wichtige Editorwege, jedoch nicht sämtliche vorhandenen Warenkorb-/Wiederaufnahmewege.** Die sichtbare Erläuterung ist deshalb zu weitgehend, wenn daraus eine vollständige Bestellsperre abgeleitet wird.

## Vier unterschiedliche Zustände

| Ebene | Tatsächliche Quelle und Wirkung |
|---|---|
| Konfi-Anzeige | `konfi-status.mjs:39–45`: Ohne Zeile liefert `get()` `draft`/„Entwurf“; `paused()` ist ausschließlich bei explizitem `paused` wahr. `draft` und `released` passieren denselben Verfügbarkeitsguard. |
| Native Produktrevision | `repository.mjs:171`: `archived`, sonst `active` bei `published_revision != null`, andernfalls `draft`. Das ist ein anderer Zustand als `konfi_status`. Der Statusknopf ruft `repository.publish()` nicht auf. |
| Shopify-Produktstatus | Wird vom Statusknopf weder gelesen noch geändert. Die Konfi-Liste kombiniert lokale Katalogdaten, lokal gespeicherte abgeschlossene Shoptransfers und historische Form-Bindings (`http.mjs:389–410`). Ein eventuell angezeigtes `shopStatus` stammt aus dem damaligen Transfer, nicht aus einem frischen Shopify-Read. |
| Katalogbestellfreigabe | `catalog-live-orders.mjs:17–42,49–89`: Eigene unveränderliche Freigabe für Shop, Produkt, Variante, cfg, Revision und tatsächlichen gespeicherten Dokumenthash. Der öffentliche Shopstart verlangt sie bei `familyFormats.source.shopProduct` zusätzlich und nur bei eingeschaltetem `catalogLiveOrders` (`shop-entry.mjs:125–143`). `released` ersetzt diese Prüfung nicht. Die Katalogfreigabe setzt ihrerseits keinen Konfi-Status und gibt keine Fertigung frei. |

Damit ist „Shopify ACTIVE und Konfi Entwurf“ im aktuellen Code widerspruchsfrei möglich. Aus den 1.059 Labels lässt sich keine fehlende technische Shopanbindung oder notwendige Massenfreigabe ableiten.

## Was die Knöpfe wirklich schreiben

`POST /api/workshop/konfis/<cfg>/status` akzeptiert nur `status` und `expectedStatus`. Der Werkstatt-/Händlerkontext und CSRF werden davor geprüft (`http.mjs:461–462,706–716`). Erlaubt sind Entwurf→Freigegeben/Pausiert und Freigegeben↔Pausiert; eine Rückkehr zu Entwurf ist nicht vorgesehen (`konfi-status.mjs:16–17,46–64`).

„Freigeben“ verlangt ein nicht archiviertes natives Produkt und einen erfolgreichen internen `model(id)`-Aufbau. Anschließend schreibt es nur `konfi_status` plus unveränderliches Ereignisprotokoll. „Pausieren“ schreibt dieselben Tabellen ohne Modellaufbau. Der Vergleich erfolgt gegen den vorherigen Konfi-Status; `productRevision` wird als aktueller Stand protokolliert, ist aber kein vom Benutzer bestätigter Planhash und keine Freigabe aller Produkt-/Shop-/Fertigungsbedingungen. Spätere Produktrevisionen löschen den Status nicht: Die Pause wird nach Mandant und Produkt-ID geprüft, nicht nach der protokollierten Revision.

Zusätzliche Nebenwirkung: Die Suchstatistik klassifiziert `released` als `source:'shop'`, sonst als `preview` (`http.mjs:455–459`). Ohne expliziten Statuseintrag kann deshalb auch die Herkunftsanzeige irreführen; das ist kein Nachweis des tatsächlichen Shopify-Veröffentlichungszustands.

## Wo die Pause greift

| Pfad | Gelesenes Verhalten |
|---|---|
| Alter direkter Editor `/?configuration=…`, `/form-editor.html`, `/konfigurator/form[/]` | `variant-m/server.mjs:70–73` liefert bei expliziter cfg die 423-Hinweisseite. `/models.json` ruft `workshop.model()` auf, das über `customerModelFor` frisch prüft (`server.mjs:56–67`; `http.mjs:413–414,1203`). Ohne cfg kann die HTML-Hülle erscheinen; der konkrete Modellabruf ist entscheidend. |
| Neuer signierter Shopstart `<proxyPath>/start` | `shop-entry.mjs:311–321` ruft `modelFor()`→`workshop.model()` auf; Pause führt zu 423. Eine neue Sitzung wird erst danach ausgegeben. |
| `/api/shop-entry/model` | Sowohl normaler Modellaufbau als auch Cachetreffer prüfen Pause; der Cachetreffer ausdrücklich frisch (`shop-entry.mjs:513–525`). |
| Designgalerie, Vorschau, Designwechsel, SVG-Logo-Prüfung, Speichern neuer/überarbeiteter Gestaltung | Frische Pauseprüfung über `checkGalleryBinding(s)`, `modelFor()` oder `workshop.model()` (`shop-entry.mjs:265–283,399–415,548–610`). Geschützte alte Form-/Acryl-Schreibwege prüfen über `customerRecord()` bzw. `assertKonfiAvailable()` (`http.mjs:229,743–774,805–820,877–904`). |

`shop-start-model.mjs` selbst ist nur eine Projektion der Design-/Größenauswahl. Es entscheidet weder über Shopify-Status noch Pause oder Freigabe; sein Aufrufer muss diese prüfen.

## Konkrete Lücke: bereits geöffnete Sitzung und gesicherte Gestaltung

Im neuen Shopweg prüft `active()` nur Sitzung, aktuelle Bindingidentität und Katalog-/Klingelfreigabe (`shop-entry.mjs:166–178`). Es prüft **keine Pause**. Die folgenden Pfade rufen keinen zusätzlichen Modell-/Pauseguard auf:

- `POST /api/shop-entry/cart` und `theme-cart` führen über `active()` direkt in `cart()` (`shop-entry.mjs:338–390,612–616`). Der Themezweig verwendet `prepareThemeCart`; der Storefrontzweig den injizierten `store.cart`.
- `prepareThemeCart()`→`prepareBoundCartOffer()` prüft Binding, Entwurfrevision, Archivierung, gespeicherten Prüfstand und Preise, jedoch keinen Konfi-Status (`theme-cart.mjs:9–12`; `bound-test-cart.mjs:31–55`). Auch dessen wiederholtes `resolve()` enthält diese Prüfung nicht.
- Die bereits vorbereitete Themeübergabe `<proxyPath>/cart/data` und `/claim` prüft erneut `active()` und den gespeicherten Angebotsstand, aber keine Pause (`shop-entry.mjs:434–449`).

**Folgerung aus dem vorhandenen Code:** Bei ansonsten gültiger Sitzung, gesichertem Entwurf und unverändertem Binding/Katalogbeleg verhindert der Konfi-Pausestatus allein diese Übergabe nicht. Für den ausdrücklich injizierbaren `store.cart` könnte ein privater Host zusätzliche Prüfungen enthalten; der Repository-Standard `createBoundTestCart` enthält sie nicht. Kein erfolgreicher Live-Warenkorb wird hier behauptet.

Weitere Abgrenzungen:

- Neuer `/api/shop-entry/cart-configurations/…`-Leseweg verwendet `active()` und private Tokens, aber keinen Pauseguard (`shop-entry.mjs:593–603`). Der alte tokengebundene Werkstatt-Leseweg ebenso (`http.mjs:734–740`). Gesicherte Daten bleiben grundsätzlich erhalten.
- Der geschützte alte `/api/workshop/customer-model/<cfg>?revision=…` ruft das interne `model()` statt `customerModelFor()` auf (`http.mjs:718–721`). Damit ist die Pause dort nicht erzwungen. Dieser Pfad liegt hinter dem Werkstatt-/Händlerkontext; das ist kein belegter anonymer HTTP-Bypass.
- Optionaler alter `/api/workshop/draft-cart` prüft im `cart-http-gate.mjs:23–41` Archivierung und Produktart vor/nach Übergabe, jedoch keinen Konfi-Status. Der separate Händler-Testkauf prüft ebenfalls Archivierung. Bei beiden bleibt die tatsächliche Aktivierung durch den privaten Host Voraussetzung.
- Der private `/api/configurator-test/`-Gateway verwendet den Pauseguard beim Start/Modell über `workshop.model()`, nicht generell im bestehenden Sitzungs-/Warenkorbzweig (`configurator-test-gateway.mjs:39–50,81–105`).

Bereits bestehende Shopify-Warenkörbe, abgeschlossene Bestellungen und Produktions-/Downloadstände werden durch den lokalen Statuswechsel nicht zurückgerufen. In `order-intake.mjs`, `catalog-live-orders.mjs` und der Bindingregistry gibt es keinen impliziten Konfi-Pausestatuscheck. Das entspricht dem Erhalt gespeicherter Bestellstände, ist aber keine globale Verkaufsabschaltung.

## Konsequenz für den jetzigen Operatorauftrag

Keine Statusknöpfe als Reparatur für die 1.059 Labels betätigen. Die Anzeige sollte fachlich als eigener lokaler Kundenstatus erklärt werden; der aktuelle Text „Freigeben macht … verfügbar“ (`ui/konfis.html:25`) verschweigt, dass Entwürfe bereits verfügbar sein können und zusätzliche Shop-/Katalogbedingungen bestehen.

Soll Pause eine Sperre neuer Warenkorbübergaben auch aus bereits geöffneten Sitzungen bedeuten, ist die oben belegte gemeinsame Angebots-/Übergabestrecke gezielt zu ergänzen und mit bestehender Sitzung/gesichertem Entwurf zu prüfen. Das wäre eine separate, vom Root zuzuweisende Änderung; in diesem Auftrag wurde ausschließlich der Istzustand festgestellt. Historische gespeicherte Bestellungen oder Shopify-Veröffentlichung dürfen daraus nicht automatisch geändert werden.
