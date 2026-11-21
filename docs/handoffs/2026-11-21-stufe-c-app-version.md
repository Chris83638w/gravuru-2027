# Stufe C – App-Version mit Block in der Bestellseite, Bild im Kundenkonto und `write_orders` (Freigabe-Unterlage für Astra)

Claude (Unteragent des Operators), 21.11.2026. Zweig `dev/claude-stufe-c-20261121`, Commits `747c62a0` (Kundenkonto, Admin-Block), `1bd1e4b9` (Tag „bitte prüfen“), `38fd2a90` (Bestellbestätigung), dazu dieser Commit (Unterlage, Vergleichshilfe). Grundlage: ENTSCHEIDUNGEN 3.51, 3.52, 3.53, 3.57.

**Nichts davon ohne Freigabe von Chris.** Alles hier ist vorbereiteter, lokal geprüfter Code. Nichts ist bereitgestellt, veröffentlicht, im Editor platziert, am Server eingeschaltet oder in eine Benachrichtigung eingesetzt. Chris gibt gesondert frei: (1) die Veröffentlichung der App-Version, (2) das Einsetzen des E-Mail-Bausteins (3.53). Das Einschalten des Tags am Server ist ein eigener Schritt nach der App-Version.

Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt unverändert; an Designs wird nichts geändert.

## 1. Was die App-Version enthält

| Teil | Inhalt | Quelle |
| --- | --- | --- |
| Extension `gravuru-thank-you-preview` (API 2026-10, siehe Abschnitt 13; laut README bisher nicht installiert – im Snapshot ablesen) | Ziel `purchase.thank-you.cart-line-item.render-after`: Bild der Gestaltung je Position auf der Danke-Seite, dazu „Bitte prüfe die Schreibweise.“ Ziel `customer-account.order-status.cart-line-item.render-after`: dasselbe Bild in der Bestellübersicht des Kundenkontos, ohne den Satz. | `ops/shopify/thank-you-preview/` |
| Extension `gravuru-order-block` (neu, API 2026-10, siehe Abschnitt 13) | Ziel `admin.order-details.block.render`: je Position mit Gravuru-Eigenschaften das Bild, „Gestaltung ansehen“ und – nur mit `_gravuru_fertigung` – „Fertigungsdatei“. | `ops/shopify/order-block/` |
| Berechtigung `write_orders` (zusätzlich) | Siehe Abschnitt 2. | `app/workshop/shopify-order-review-tag.mjs` |
| Unverändert | Theme-Erweiterung, Preisfunktion `gravuru-personalization-price`, Checkout-Prüfung `gravuru-checkout-guard`, Webhooks, App-Proxy, App-Adresse, alle bisherigen Berechtigungen. | aktive Version |

Beide Extensions lesen nur die Eigenschaften der Position. Bild und Verweise zeigen auf `https://app-2027.gravuru-designwerkstatt.de`; bei Shopify liegt keine Datei (3.52/3.53). Angenommen wird nur die feste Bildadresse `…/gestaltung/<Speicher>/offer_<uuid>/<64 hex>.png` und nur mit `_gravuru_config`; für die Fertigungsdatei nur eine Adresse unter `…/werkstatt/`. Positionen ohne vertrauenswürdige Eigenschaften zeigen nichts.

Nicht Teil der App-Version: der E-Mail-Baustein (Abschnitt 6) und der Schalter am Server (Abschnitt 5).

## 2. `write_orders` – wofür genau

Einziger Zweck: Der Server setzt an eine Bestellung den Tag **„Gravuru: bitte prüfen“** (Admin-API `tagsAdd`), wenn eine ihrer Positionen im Bestelleingang abgelehnt wurde (z. B. Preisabweichung) oder ihr Ausgabeauftrag fehlgeschlagen ist bzw. sich nicht anlegen ließ – also genau dann, wenn die Werkstatt „bitte prüfen“ zeigt (3.57 Punkt 2).

- Kein anderer Schreibzugriff auf Bestellungen: keine Notiz, kein Storno, keine Erstattung, keine Positionsänderung. Der Code enthält nur diese eine Mutation.
- Entfernt wird nichts automatisch. Das Büro nimmt den Tag selbst weg, wenn die Bestellung geklärt ist.
- `read_orders` (seit 11.10.2026 vorhanden) reicht für den Bestelleingang und für die lesende Abfrage des Admin-Blocks; es wird nicht geändert.
- Die Berechtigung erlaubt technisch mehr als Tags. Eine engere Berechtigung nur für Tags kenne ich bei Shopify nicht; bitte am Dev Dashboard gegenlesen.

## 3. Reihenfolge der Schritte

Muster wie `ops/shopify/einzelsperre-release/release.mjs` (inventar → snapshot → projekt → kandidat → pruefen → freigeben), jeder Schritt einzeln, Zugang nur im Kindprozess, kein `--allow-deletes`.

1. **Freigabe von Chris abwarten** (App-Version Stufe C, mit dem Satz aus dem Chat in `STATUS.md`).
2. **snapshot** – aktive Version und ihre Module von Shopify lesen und sichern. Letzter Beleg im Repo: `gravuru-2027-preis-einzelsperre-20261116-b1`, 9 Module (`STATUS.md`, 16.11.). Weicht der gelesene Stand ab oder enthält er schon eine der beiden Extensions: stoppen und melden. Diese Version ist der Rückweg.
3. **projekt** – vollständiges Projekt der aktiven Version unverändert kopieren. Ergänzen: die beiden Ordner als `extensions/gravuru-thank-you-preview` und `extensions/gravuru-order-block`; in `shopify.app.toml` in der Zeile `scopes` genau `write_orders` (alphabetisch einsortiert, so schreibt Shopify sie). Keine UID eintragen – die CLI ordnet die Identität zu. Je Extension `npm install`, `npm run check`, `npm run build`; schlägt `check` fehl, nicht veröffentlichen, sondern melden (die Typen sind hier nicht gegen das Shopify-Paket geprüft).
4. **kandidat** – `app deploy --no-release` mit eigener Versionsmarke. Achtung: Bisher lief das mit `--no-build`, damit Preisfunktion und Checkout-Prüfung bytegleich bleiben. Die beiden neuen Extensions müssen aber gebaut werden. Am Projekt klären, wie CLI 4.9.0 beides trennt; die Wasm-Dateien der Funktionen müssen dieselben Prüfsummen haben wie in der aktiven Version.
5. **pruefen** – Kandidat gegen den Snapshot: `verifyStageCCandidate(before, candidate)` aus `ops/shopify/stage-c-version.mjs`. Erlaubt sind nur: `write_orders` zusätzlich, genau zwei neue Module mit den Handles oben, sonst alles gleich. `{sameFunctionBinaries:true}` nur nach dem Vergleich der Wasm-Prüfsummen. Danach erneut lesen, dass die aktive Version unverändert ist.
6. **freigeben** – `app release` genau dieses Kandidaten, nur `--allow-updates`. Zurücklesen: aktive Version ist der Kandidat, Module wie geprüft.
7. **Zustimmung zur Berechtigung** – verlangt Shopify für `write_orders` eine Bestätigung des Shopinhabers, bestätigt Chris sie im Admin. Vorher wirkt der Tag nicht (der Server prüft die Berechtigung und schreibt ohne sie nichts).
8. **Platzieren** (Abschnitt 4), **Prüfen** (Abschnitt 7).
9. **Server-Schalter** (Abschnitt 5) – erst danach.

## 4. Was platziert werden muss

| Wo | Was | Hinweis |
| --- | --- | --- |
| Checkout- und Kundenkonto-Editor, Seite „Danke“ | Baustein „Gravuru Gestaltung prüfen“ hinzufügen | festes Ziel an der Bestellposition |
| Checkout- und Kundenkonto-Editor, Seite „Bestellstatus“ | denselben Baustein hinzufügen | nur in den neuen Kundenkonten; nutzt der Shop die klassischen, erscheint dort nichts – am Shop ablesen |
| Shopify-Admin, Bestellseite | Block „Gravuru Gestaltung“ anheften | gilt je Mitarbeiterkonto oder für alle – am Admin ablesen |

Ohne diese Schritte zeigt die veröffentlichte Version nichts an; sie ändert dann nur die Berechtigung.

## 5. Einstellung am Server, die den Tag einschaltet

- Standard: **aus**. Das Aufspielen des Servers allein schreibt nichts an Shopify.
- Einschalten: Umgebungswert `GRAVURU_ORDER_REVIEW_TAGS=enabled` (einziger gültiger Wert; setzt `orderReviewTags: true` der Kundenanbindung), gesetzt wie `GRAVURU_CUSTOMER_MODEL_CACHE` in `gravuru-2027-merchant/app.cjs` vor `require(...)`, dann Neustart. Achtung: Jeder andere Wert (auch ein Tippfehler) sperrt den Start wie bei den übrigen Schaltern – Meldung „Acryl-Mitarbeiterstart gesperrt. Vorherigen Start verwenden.“, ohne das Feld zu nennen. Ebenso `enabled` ohne `GRAVURU_CUSTOMER_INTEGRATION=merchant-test-only`.
- Voraussetzungen: Server-Stand mit `1bd1e4b9`, eingerichteter Bestelleingang, App-Version mit `write_orders` freigegeben. Fehlt die Berechtigung, steht im Protokoll höchstens alle zehn Minuten `{"event":"shopify_order_review_tag","state":"no-scope"}` und es wird nichts geschrieben.
- Protokoll: nur `state` (`tagged`, `no-scope`, `failed`) und bei Fehlern ein Kurzgrund; keine Bestellnummer, kein Kunde, kein Zugangswert.

## 6. E-Mail-Baustein (gesonderte Freigabe)

`ops/shopify/notifications/`: Bildzelle `gravuru-bestellbestaetigung-bild.liquid` (unverändert, passt zum heutigen Stand) und neu die Bedingung `gravuru-bestellbestaetigung-eigenschaften.liquid` für die vorhandene Schleife über `line.properties`. Sie blendet private Eigenschaften (auch `_gravuru_fertigung`) sowie „Bearbeitbarer Entwurf“ und „Bearbeiten“ aus. Vor dem Einsetzen: bisherige Vorlage vollständig privat sichern; an der echten Vorlage ablesen, wie die Schleifenvariable heißt.

## 7. Prüfschritte am echten Shop (ohne echte Bestellung des Inhabers)

Testbestellung über das vorhandene Test-Gateway, Testgestaltung „Claudetest“, keine echten Kundendaten.

1. Vor der Freigabe: Schritt 5 (Modulvergleich) und aktive Version unverändert.
2. Danke-Seite: Bild der Gestaltung an der Position; Antippen öffnet das PNG; eine Position ohne Gestaltung zeigt nichts.
3. Kundenkonto, Bestellstatus: dasselbe Bild.
4. Admin, dieselbe Bestellung: Block zeigt Bild und „Gestaltung ansehen“; „Fertigungsdatei“ nur, wenn die Zeile `_gravuru_fertigung` trägt, und sie verlangt die Anmeldung der Werkstatt. Eine Bestellung ohne Gravuru-Position zeigt den kurzen Hinweis.
5. Tag, nach dem Einschalten: Eine einwandfreie Testbestellung bekommt **keinen** Tag. Positivfall mit einer Testbestellung, die in der Werkstatt „bitte prüfen“ trägt (fehlgeschlagene oder nicht anlegbare Ausgabe); gibt es keine, den Fall nicht durch veränderte Preise an echten Daten erzwingen, sondern das Protokoll lesen (`no-scope` darf nicht erscheinen) und den ersten echten Fall beobachten.
6. E-Mail, nach gesonderter Freigabe: Vorschau der Benachrichtigung und eine Kontrollmail an eine ausdrücklich gewählte Testadresse; Bild, Produktbild-Rückfall, keine privaten Angaben.

## 8. Rückweg je Baustein

| Baustein | Rückweg |
| --- | --- |
| Bild auf der Danke-Seite / im Kundenkonto | Baustein im Editor von der jeweiligen Seite nehmen |
| Block in der Bestellseite | Block lösen |
| Tag „Gravuru: bitte prüfen“ | `GRAVURU_ORDER_REVIEW_TAGS` entfernen, Neustart. Gesetzte Tags bleiben; das Büro entfernt sie von Hand |
| App-Version samt `write_orders` | die in Schritt 2 gesicherte Version freigeben (nur `--allow-updates`); vorher den Server-Schalter ausschalten |
| E-Mail-Baustein | gesicherte Vorlage wiederherstellen |

Kein Rückweg ändert Bestellungen, Eigenschaften oder Daten der Werkstatt.

## 9. Am echten Shop zu bestätigen (hier ohne Netz nicht prüfbar)

- Dass die CLI ein Kassen- und ein Kundenkonto-Ziel in einer Extension annimmt (sonst eigene Extension, siehe `thank-you-preview/README.md`). Die Zielnamen der drei Ziele sind seit dem 21.11. gegen das Shopify-Paket geprüft (Abschnitt 13).
- Dass Danke-Seite und Bestellübersicht der Erweiterung die privaten Eigenschaften (`_gravuru_bild`) geben.
- Admin-Block: der Abruf `shopify:admin/api/graphql.json` und ob der Admin ein Bild vom eigenen Server anzeigt. `shopify.data.selected` und die Bausteine samt Eigenschaften sind seit dem 21.11. gegen das Shopify-Paket geprüft (Abschnitt 13).
- Form der neuen Module in der Versionsliste. Die Typen beider Extensions sind seit dem 21.11. geprüft (Abschnitt 13).
- `_gravuru_fertigung` hat die Form der Bestellansicht im Shopify-Admin des Shops (`https://<shop>.myshopify.com/admin/apps/<App>/werkstatt/bestellungen/?config=…&rev=…`, gebildet in `app/workshop/theme-cart.mjs`); der Block zeigt „Fertigungsdatei“ nur für genau diese Form. Am echten Shop zu bestätigen: ob der Verweis aus dem Block heraus die eingebettete Werkstatt öffnet.
- `tagsAdd` an einer Bestellung mit `write_orders` und API 2026-07; ob Shopify eine Zustimmung des Inhabers verlangt.
- Was der Tarif des Shops für Erweiterungen auf Danke-Seite und Bestellstatus voraussetzt.

## 10. Grenzen und offene Punkte

- Der Tag wird je Serverprozess einmal je Bestellung gesetzt. Nach einem Neustart setzt eine weitere Zustellung oder ein weiterer Fehlschlag ihn erneut – auch wenn das Büro ihn inzwischen entfernt hat.
- Bestellungen, die vor dem Einschalten schon „bitte prüfen“ trugen, bekommen keinen Tag nachträglich.
- Schlägt der Aufruf an Shopify fehl, wird er nicht wiederholt; maßgeblich bleibt die Bestellansicht der Werkstatt.
- Der ältere Händler-Speicher (Laufzeit vom 22.10.) meldet nur abgelehnte Positionen, keine fehlgeschlagenen Ausgaben.
- Die sichtbare Zeilenangabe „Bearbeitbarer Entwurf“ zeigt Shopify selbst weiter an Kasse, Danke-Seite und Bestellseite; nur die E-Mail blendet sie mit dem Baustein aus. Das ist nicht Teil von Stufe C.

## 11. Fragen an Chris (mit Empfehlung)

1. App-Version der Stufe C veröffentlichen (zwei Extensions, `write_orders`)? Empfehlung: ja, nach Astras Modulvergleich.
2. Tag „Gravuru: bitte prüfen“ danach am Server einschalten? Empfehlung: ja.
3. E-Mail-Baustein einsetzen? Empfehlung: ja, nach einer Kontrollmail an eine Testadresse.
4. Im Kundenkonto nur das Bild, ohne „Bitte prüfe die Schreibweise.“? Empfehlung: ja (der Satz passt nicht mehr, wenn die Bestellung schon gefertigt ist).

## 12. Geprüft (lokal, synthetisch)

259 gezielte Tests, alle bestanden: `node --test ops/shopify/*.test.mjs` 53 von 53 (mit LiquidJS über `GRAVURU_LIQUIDJS_MODULE`; ohne sie werden zwei Render-Prüfungen übersprungen und `cart-edit-r15-theme.test.mjs` schlägt wie bisher fehl); `order-intake*`, `shopify-order-webhook`, `shop-entry-flow` 35 von 35; die neuen Tests zu Kundenkonto, Admin-Block und Tag 50 von 50; Umfeld der geänderten Dateien (Verteilung, Ausgabeaufträge, Host-Einstieg, Shop-Einstieg, Gateway, Status-Webhook) 121 von 121. Gegenprobe zum Tag: neun einzelne Rückbauten, jeder von den Tests erkannt, danach bytegleich wiederhergestellt. Beide Extensions mit esbuild 0.28.2 gebündelt.

Nicht gelaufen: der Gesamtlauf aller Tests, alles am echten Shop, die Typprüfung gegen das Shopify-Paket und der App-Build (kein Netz, kein Paket lokal).

## 13. Nachtrag 21.11.2026, 14:35 Uhr – die beiden ausgelassenen Bausteine (Folgeversion)

Stand davor (Astra, #267): Die Version `gravuru-2027-stufe-c-20261121-scope` ist aktiv und enthält nur `write_orders`. Beide Extensions blieben aus. Zweig mit der Korrektur: `dev/claude-stufe-c-bausteine-20261121` (aufgesetzt auf `dev/astra-267-bestellmail-bild-mobil-20261121`, damit Astras Bestellmail-Stand enthalten ist).

| Befund von Astra | Ursache | Änderung |
| --- | --- | --- |
| Shopify weist `api_version = "2025-10"` für beide Bildziele zurück; früheste angenommene Version 2026-01 | Die Version ist älter als zwölf Monate; laut Shopify verhindert die CLI dann die Veröffentlichung | Beide `shopify.extension.toml` auf `2026-10` (aktuelle stabile Version; 2026-01 liefe im Januar 2027 aus), `@shopify/ui-extensions` auf `2026.10.2` |
| Mitarbeiterblock: `src/OrderBlock.js:28` – `shopify` nicht deklariert | Das Admin-Paket deklariert, anders als das Kassen-Paket, kein globales `shopify`; die bisherige `shopify.d.ts` erweiterte eine Schnittstelle, die es dort nicht gibt | `shopify.d.ts` in der Form, die die Shopify-CLI selbst erzeugt: das Modul bekommt die Schnittstelle seines Ziels |
| Mitarbeiterblock: `src/model.mjs:18` – `URLSearchParams.keys` | Die Typprüfung läuft mit `lib: DOM` ohne Iteratoren | Zweite Lesart der Adresse ohne Iterator, gleich streng: genau `config`, dann `rev`, nichts weiter |

Zusätzlich, damit die Typprüfung mehr trägt als bisher:

- `element(...)` in `OrderBlock.js` ist typisiert. `npm run check` prüft jetzt Namen und Eigenschaften aller Bausteine des Blocks gegen das Shopify-Paket.
- `thank-you-preview/shopify.d.ts` gibt jedem Modul sein eigenes Ziel. `OrderStatus.js` wird damit gegen das Kundenkonto-Ziel geprüft, nicht mehr gegen das der Danke-Seite. Dafür steht `preact` 10.29.1 als reine Typabhängigkeit in `package.json`; ins Bundle kommt es nicht.
- `ops/shopify/stage-c-version.mjs`: neu `verifyStageCExtensionsCandidate(before, candidate)` für die Folgeversion (siehe unten). `verifyStageCCandidate` bleibt unverändert.

### Geprüft

- Ausgangsbefund nachgestellt: unveränderter Stand gegen `@shopify/ui-extensions` 2026.1.5 und 2026.10.2 – genau Astras zwei Fehler im Mitarbeiterblock, die Bild-Erweiterung ohne Fehler.
- Nach der Korrektur, frische Kopie beider Ordner: `npm install`, `npm run check`, `npm run build` – ohne Fehler (2026.10.2, TypeScript 5.8.3, esbuild 0.28.2). Zur Gegenprobe auch gegen 2026.1.5 ohne Fehler.
- Gegenprobe der Typprüfung: ein falscher Wert (`gap`) und eine falsche Eigenschaft im Block lassen `npm run check` scheitern; in `OrderStatus.js` wird ein Zugriff, den es nur im Kundenkonto-Ziel gibt, angenommen und in `ThankYou.js` abgelehnt.
- Tests: `node --test ops/shopify/*.test.mjs app/workshop/shopify-order-block.test.mjs app/workshop/thank-you-preview.test.mjs` 78 von 78 (mit LiquidJS).
- Quelle zur Versionsfrage: [Versionen der Shopify-API](https://shopify.dev/docs/api/usage/versioning), abgerufen am 21.11.2026.

Nicht geprüft: alles am echten Shop. Ob Shopify 2026-10 für diese App annimmt, zeigt erst die CLI beim Bereitstellen.

### Folgeversion – Schritte wie Abschnitt 3, mit diesen Unterschieden

1. **Freigabe:** ENTSCHEIDUNGEN 3.58 deckt genau diesen Umfang (Bild auf der Danke-Seite und im Kundenkonto, Block in der Bestellseite). Es kommt keine Berechtigung und kein weiterer Baustein hinzu.
2. **snapshot:** Grundlage ist die aktive Version mit `write_orders`. Sie ist der Rückweg.
3. **projekt:** `shopify.app.toml` bleibt unverändert. Ergänzt werden nur die beiden Ordner. Je Ordner `npm install`, `npm run check`, `npm run build`.
4. **pruefen:** `verifyStageCExtensionsCandidate(before, candidate)` – erlaubt sind genau die zwei neuen Module, sonst alles gleich, keine geänderte Berechtigung. `{sameFunctionBinaries:true}` wie bisher nur nach dem Vergleich der Wasm-Prüfsummen. Bleibt eine der beiden erneut aus, die andere allein: `{extensions:['gravuru-order-block']}` bzw. `{extensions:['gravuru-thank-you-preview']}` – und die ausgebliebene mit der genauen Meldung in #267 nennen.
5. **Platzieren und Prüfen:** Abschnitt 4 und Abschnitt 7, Punkte 2 bis 4.

Nimmt die CLI 2026-10 nicht an: die Meldung mit den angenommenen Versionen in #267 nennen. Mit 2026-01 sind beide Ordner ebenfalls geprüft; dafür in beiden `shopify.extension.toml` die Version und in beiden `package.json` `@shopify/ui-extensions` auf `2026.1.5` stellen und `npm run check` wiederholen.
