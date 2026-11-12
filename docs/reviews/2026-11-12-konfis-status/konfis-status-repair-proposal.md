# Konfi-Pause: enger Vorschlag für die nächste Programmfassung

12.11.2026 · `product_plans` · ausschließlich Quellplan. Grundlage: `konfis-status-scope-review.md`, Kandidat HEAD `68d92902404dad0b90f99fc1bfcb282e78023974`. Keine Checkoutänderung, kein Testlauf, kein Livezugriff. Dieses getrennte Folgepaket blockiert weder Main-Update noch die sechs DRAFT-Produkte.

## Ziel und unveränderter Vertrag

Eine **neu angeforderte** Warenkorbübergabe darf bei explizitem `konfis.paused(productId) === true` nicht beginnen, auch wenn Sitzung und gesicherte Gestaltung schon vor der Pause existierten. Entwurf ohne Statuszeile und Freigegeben bleiben wie bisher nutzbar. Bestehende gesicherte Bestellungen, Bindings, Katalogfreigaben, Entwürfe und Journale werden weder geändert noch entfernt. Keine neue HTTP-API, kein Statussystem und keine globale Transaktionsarchitektur.

## Minimaler gemeinsamer Backendumfang

1. **`bound-test-cart.mjs`, `prepareBoundCartOffer()`:** Den vorhandenen `workshop.konfis.paused()`-Getter mit dem bestehenden Fehler `423 / konfi_paused / PAUSED_MESSAGE` in der vorhandenen frischen `resolve()`-Prüfung verwenden, bevor ein Angebot erzeugt wird. Dieselbe kleine Prüfung im bereits vorhandenen `reviewPolicy`-Callback durchführen: `createDraftCartHandoff.resolve()` ruft ihn vor dem Senden und erneut nach der Antwort auf. Keine neuen Validator-/Transportparameter. Diese gemeinsame Stelle deckt `createBoundTestCart` und `prepareThemeCart` einschließlich dessen späterem `resolve()`/`claim()` ab. Nicht den unveränderlichen Prüfstand oder sein `productionReady` verändern.

2. **`shop-entry.mjs`:** Den gleichen vorhandenen Pausegetter an den mutierenden Warenkorbgrenzen aufrufen: beim Eingang in `cart()`, nochmals nach dem asynchronen Bodylesen und vor Weitergabe an den Store; bei bestehender Themeübergabe vor `prepareThemeCart` sowie nach einer eventuell asynchronen Checkoutbild-Aufbereitung, bevor Daten/Claim zurückgegeben werden. Die gemeinsamen Angebotsprüfungen aus Punkt 1 bleiben maßgeblich, die Route liefert zusätzlich früh eine verständliche 423-Meldung und sichert auch ihre injizierte `store.cart`-Grenze ab. Nach einer bereits gesendeten Storefront-Anfrage die Pause ebenfalls frisch prüfen, bevor eine Checkout-Weiterleitung ausgegeben wird.

**Bewusst nicht `active()` pauschal ändern:** Dieser Getter wird auch für private Lese-/Wiederaufnahmefunktionen verwendet. Ein globaler Eingriff würde über den Auftrag hinaus gesicherte Gestaltungen/Dateien blockieren. Modell/Start/Designwechsel haben bereits ihre eigene Pauseprüfung; deren Logik bleibt unverändert.

Die private Factory muss wie bisher tatsächlich die gemeinsamen geprüften Komponenten verwenden. Die Pause ist ein lokaler Getter je vorhandenem Workshopkontext, keine aus Shopify abgeleitete Eigenschaft. Ein vollständig fremder injizierter Warenkorbprovider wäre durch eine Änderung im gemeinsamen Angebotscode allein nicht automatisch abgesichert; deshalb der zusätzliche Routeguard.

## Kleiner UIumfang

Nur `ui/konfis.html` und `ui/konfis-ui.mjs` nachführen, ohne neue Aktionen:

- Status ausdrücklich als **„Lokaler Konfi-Status“** kennzeichnen.
- Erläuterung: „Entwurf bedeutet: noch nicht lokal markiert. Bereits angebundene Konfiguratoren können trotzdem verfügbar sein. Freigeben hebt eine Pause auf und markiert den Konfi lokal; der Shopify-Produktstatus und die Bestellfreigabe werden hier nicht geändert.“
- Pausebeschreibung auf die tatsächlich geprüfte Wirkung begrenzen: neue Gestaltungsschritte und neue Warenkorbübergaben werden abgewiesen; gespeicherte Gestaltungen und Bestellungen bleiben erhalten. Keine Behauptung, bestehende Shopify-Warenkörbe oder schon übertragene Browserdaten würden zurückgerufen.
- Erfolgsmeldung nach Freigeben entsprechend „Lokal freigegeben“; den bisherigen Satz „Kunden können diesen Konfi gestalten“ nicht als vollständige Shop-/Bestellfähigkeitsgarantie stehen lassen.

„Entwurf“ muss dafür weder aus Bestandsdaten automatisch umgewandelt noch durch einen neuen fachlichen Status ersetzt werden. Keine Massenfreigabe und keine Anpassung der Katalogbestellfreigaben.

## Gezielte Prüfungen bei späterer Umsetzung

Vorhandene Testdateien ergänzen; keinen neuen allgemeinen Testaufbau starten:

| Bestehende Datei | Sinnvoller neuer Fall |
|---|---|
| `bound-test-cart.test.mjs` | Sitzung/Binding/gesicherter Prüfstand sonst gültig, Pause vor Übergabe: 423 und null Angebots-/Transportaufrufe. Fehlende Statuszeile und released bleiben unverändert nutzbar. Bei einer späteren frischen Callbackprüfung neu gesetzte Pause ebenfalls erkennen. |
| `shop-entry.test.mjs` | Sitzung und Entwurf vor Pause erzeugen, danach `cart` und `theme-cart` abweisen. Bei Pause während Bodylesen vor Übergabe null Provideraufrufe. Modell-/Startverhalten nicht erneut breit prüfen. |
| `theme-cart-flow.test.mjs` | Bereits ausgegebenen Handoff nach Pause erneut über `/data` und `/claim` anfordern: 423, kein neuer Claim. Pause während Checkoutbild-Aufbereitung vor Ausgabe erkennen. Vorherige Entwurfs-/Journal-/Bestelldaten unverändert. |
| `konfis.test.mjs` | Status bleibt getrennt von nativer Veröffentlichung/Shopify-/Katalogfreigabe; Texte beschreiben nur lokale Wirkung. Bestehende Modell-/Statusfälle weiterverwenden, keine bloßen Textsnapshot-Massentests. |

Für einen bereits abgesendeten Storefront-Auftrag: bestätigtes Journal/Ergebnis erhalten; keine automatische Wiederholung oder Rücknahme auslösen. Ein gezielter Fall soll sicherstellen, dass eine anschließend erkannte Pause keine neue Checkoutfähigkeit zurückgibt, ohne den tatsächlich erfolgten Vorgang zu leugnen.

## Optionale Altwege – nur nach tatsächlicher Hostverdrahtung einbeziehen

| Weg | Gehört wann zur Wirkung, kleinste Ergänzung |
|---|---|
| Öffentlicher Shopstart mit `createBoundTestCart` und Theme-Proxy | Gehört zwingend zum Kern oben; keine neue Hostfunktion nötig. |
| `/api/configurator-test/cart` | Separater privater Händler-Testgateway. Wenn er denselben `createBoundTestCart` verwendet, greift dessen neue Prüfung. Der bestehende Fehlerfilter in `configurator-test-gateway.mjs` muss dann 423 erhalten statt daraus 503 zu machen. Kein neuer Sitzungs-/Readguard nötig. |
| `/api/workshop/draft-cart` | Nur relevant, wenn `storefront` im betreffenden Host ausdrücklich eingeschaltet ist. `cart-http-gate.mjs` hat bereits `activeProduct()` vor/nach dem asynchronen Käuferkontext und nach Übergabe; dort den vorhandenen Workshop-Pausegetter einbeziehen. Dafür nur die bestehende lokale Konstruktorverdrahtung in `http.mjs` ergänzen, keine neue Route. Tests in `cart-http-gate.test.mjs`: Pause bereits gesetzt und während Käuferkontext, jeweils null Transportaufrufe. |
| `/api/workshop/merchant-test-cart` | Nur der speziell aktivierte Schiefer-Händler-Testkauf, keine allgemeine Mainroute. Wenn aktiv und dieselbe lokale Pausenwirkung gewünscht ist, vorhandenen Getter in dessen `resolve()`/Reviewpolicy verdrahten; begrenzter Fall in `merchant-test-cart.test.mjs`. Nicht ohne Beleg als produktiver Mainpfad ausgeben. |
| Historische `customer-model`, `cart-configurations`, Entwurfs-/Foto-/Download-Lesewege | Für das Ziel **neue Warenkorbübergaben sperren** nicht ändern. Ihr Leserecht ist kein Verkaufsauftrag. |
| Bereits existierende Shopify-Warenkörbe, Browser mit schon erhaltenem Payload, Bestellwebhook/Fertigung | Kein Bestandteil dieser Reparatur. Ein lokaler Status kann bereits ausgegebene Daten oder ausgelöste entfernte Anfragen nicht atomar zurückholen. Keine Änderungen an `order-intake`, Approvaltabellen oder gespeicherten Aufträgen. |

## Aufwand und Grenze

Kern: zwei vorhandene Backenddateien und zwei UIdateien, dazu wenige Fälle in drei bis vier bestehenden Testdateien. Kleines bis mittleres Folgepaket; der wesentliche Prüfaufwand sind bereits geöffnete Sitzungen und vorbereitete Themeübergaben. Optional kommen nur nach bestätigter Hostnutzung die benannten Legacyverdrahtungen hinzu.

Die Prüfung ist eine frische Zulassungsentscheidung an den lokalen Übergabegrenzen. Sie ist **keine atomare Sperre gegen eine Pause, die erst nach dem Senden einer entfernten Anfrage eintritt**. Der Storefronttransport kann beim Ergänzen/Ersetzen eines vorhandenen Warenkorbs vor seiner Mutation noch einen asynchronen Shopify-Read ausführen (`storefront-transport.mjs:65–66`); hier keinen erfundenen sofortigen Fernabbruch versprechen. Eine weitergehende Sendepunkt-Sperre würde einen zusätzlichen eng definierten Transporthook erfordern und gehört nicht stillschweigend in diesen Minimalvorschlag. Ebenso bleiben Shopveröffentlichung, Steuer-/Preisverträge und produktive Abnahme der sieben Produkte separate Vorgänge.
