# Neuer Konfigurator → Warenkorb, Bestellung, Fertigung: Vergleich und Schnittstellenanalyse

Stand 22.10.2026, Claude. Grundlage: [Übergabe vom 22.10.](2026-10-22-katalog-und-neuer-konfigurator.md), Code `task/katalog-struktur-20261022` (`b5a5105`), Katalog `task/katalog-struktur-20261022` (`48a1a89b`). Nur gelesen; Serverdaten nicht angefasst. Dieses Dokument ist Schritt 1 des Auftrags („zuerst vergleichen, dann Schnittstelle, Änderungen, Tests und Lücken dokumentieren“). Gebaut wird erst nach der Entscheidung in Abschnitt 5.

## 0. Kurzfazit

1. Der Übergabezweig baut sauber auf dem neuesten Konfigurator-Stand `dev/konfi-neu-20261019` (`bf5c059`) auf: vier Commits, 77 Dateien, davon nur drei im Konfigurator (Motivkategorien-Dialog und zwei Werkstatt-Routen). Nichts wurde überschrieben, nichts geht verloren.
2. **Die Acryl-Serie und der neue Konfigurator sprechen heute zwei verschiedene Produktmodelle.** Die 798 Acryl-Ausführungen sind *Formprodukte* (Kontur, `variants_…`-Gruppe, eigener Kundeneditor `form-customer.html`). Der neue Konfigurator (`app/configurator/variant-m`) kennt Formprodukte nicht: null Treffer für `isFormProduct`, `gravuru-contour` oder `variants_` in seinem Code; die Kundenansicht leitet Formprodukte an den alten Formeditor (`http.mjs:191`, `customer-preview.mjs:28`). Das ist die eigentliche Lücke, nicht der Warenkorb.
3. Die Kette Entwurf → Prüfstand → Warenkorb → bezahlte Bestellung ist für den **neuen Konfigurator** bereits einmal echt durchgelaufen (Gedenktafel, 11.10.2026, Testkauf 32,98 €), aber nur im Händler-Testmodus mit fest eincodiertem Produkt und neun fest eincodierten Varianten-IDs. Öffentliche Kundenroute, Storefront-Brücke, Live-Bestelleingang und automatischer Fertigungsauftrag fehlen.
4. **Die Storefront-Seite existiert nicht im Repository.** Der Konfigurator wartet auf `window.parent.GravuruCommerce`; dieses Objekt gibt es nirgends, und die Theme-Erweiterung wurde nur teilweise aus Shopify zurückgewonnen (`recovery/2026-10-10/theme-recovered/RECOVERY.json`: `fullExtensionRecovered:false`, 14 Assets fehlen).
5. Empfehlung (Abschnitt 5): die Acryl-Serie in das Produktmodell des neuen Konfigurators überführen (Weg A) statt den alten Formeditor als zweiten Kundenweg auszubauen (Weg B). Das braucht eine Entscheidung von Chris, weil es die Werkstatt-Galerie für Acryl ablöst und die Retro-Formen zunächst zurückstellt.

## 1. Geprüfter Ausgangsstand

| | Stand | Befund |
| --- | --- | --- |
| Konfigurator-Zweig | `origin/dev/konfi-neu-20261019` = `bf5c059` | neuester Entwicklungsstand; Vorgänger des Übergabezweigs |
| Übergabezweig Code | `origin/task/katalog-struktur-20261022` = `b5a5105` | 4 Commits über `bf5c059`: `1a2793d`, `6091f83`, `8fb0e05`, `b5a5105`; 77 Dateien, +12 775 Zeilen |
| davon im Konfigurator | `form-motif-library.mjs`, `form-motif-library-model.mjs` (neu), `server.mjs` (Routen `/werkstatt/katalog`, `/werkstatt/acryl`) | keine Änderung an Gestaltung, Preis, Warenkorb |
| Katalog | `48a1a89b` | `struktur.json`, `serien/*.json`; `data/catalog-structure.json` im Code ist bytegleich zu `struktur.json` |
| Server (laut Nachweis) | `gravuru-2027-merchant`, Paket `private/acryl-employee-20261021-v1`, Node 24.22 | `shopifyWrites:false`, `productPublication:false`, `customerBinding:deferred` |
| Parallele Zweige | `dev/konfi-neu-gt22x14-schiefer`, `dev/cdr-mcp-*` (bereits in `main`) | berühren die Anbindung nicht |

## 2. Zwei Produktmodelle – der Kern des Vergleichs

| | Neuer Konfigurator (nativ) | Acryl-/Edelstahl-Serie (Formprodukt) |
| --- | --- | --- |
| Produktdokument | `cfg_…` mit `profile.geometry` (`width`, `height`, `shape` rect/ellipse/plaque, `cornerRadiusMm`, `holes[]`), `optionGroups`, `designs[]` mit Objekten | `cfg_…` je Ausführung mit Konturpfad (`gravuru-contour/v1`, outer + holes), Material, Preis, `designs[]` (Formdesigns mit bis zu 19 Feldern) |
| Ausführungen | Optionen *innerhalb* eines Produkts (`variantCombinations`, Schlüssel aus Optionswahl) | *ein Produkt je Ausführung*, zusammengefasst in Gruppe `variants_…` mit Achsen; Varianten-ID = SKU (`form_variant_members`) |
| Acryl heute | – | Gruppe `variants_ebc11a46…` Rev. 5, 798 Produkte, 160 Konturen, 40 Designs, 9 Designsätze (20–40 Designs je Ausführung) |
| Kundeneditor | `_merchant-editor.html` / variant-m | `_merchant-form-editor.html` / `app/workshop/ui/form-customer.html` |
| Kundenentwurf | `POST /api/workshop/acrylic-drafts` → `adraft_…` + Token, Prüfstand `gravuru-native-review/v1` bzw. `gravuru-acrylic-review/v1` | `form-customer-store.mjs` → `draft_…`, Prüfstand `gravuru-form-review/v1` |
| Warenkorb-Bearbeiten | `cart-edit.mjs` (`?config=&rev=&line=`), geprüft | nicht umgesetzt: „Entwürfe von Formprodukten werden aus dem Warenkorb noch nicht geladen“ (`cart-edit-revision.mjs:15`) |
| Mindesttextgröße | hart je Verfahrensprofil (`contract.mjs:336` `minTextMm`) | nur Hinweis; Kunde darf 1–100 mm (`form-designs.mjs`, `form-text-sizing.mjs`) |
| Formen | eckig, Eckenradius, oval, eingezogene Ecken | 8 Formen inkl. Retro 1/2 als freie Kontur |
| Werkstatt-Werkzeuge | Händler-Editor (Motive, Hilfslinien, Textgröße, Designautoring) | Acryl-Galerie mit `design_corrections`, Motivkategorien, Größenänderung, Ausrichtung, Hilfslinien |

Folge: „Anbindung des neuen Konfigurators“ für Acryl heißt zuerst, die Serie in das native Modell zu bringen (oder den Konfigurator um Formprodukte zu erweitern). Erst danach greifen Warenkorb-, Bestell- und Fertigungsmodule, die beide Prüfstandarten (`native`, `acrylic`, `form`) schon gemeinsam verarbeiten.

## 3. Was vorhanden ist und was nachweislich läuft

Durchgelaufene Kette (11.10.2026, Gedenktafel `cfg_b4fd3f0c…` Rev. 2, Shopify-Produkt `16138083107196`, neun gebundene Varianten):

```
variant-m workshop-review.mjs ──POST /api/workshop/acrylic-drafts──▶ adraft_… + Token + proof_… (Prüfstand, unveränderlich)
      └─POST /api/workshop/merchant-test-cart {draftId, expectedRevision}
            └─ merchant-test-cart.mjs ─▶ draft-cart-handoff.mjs ─▶ ledger.assign (_gravuru_offer) ─▶ storefront-transport cartCreate
                  └─ cart-configuration.mjs: konfig_… + Revision, Zeile (gid://shopify/CartLine/…) nachgetragen
Shopify ORDERS_PAID (Abo 2149402706300, Filter test:true, API 2026-07) ──▶ /webhooks/shopify/orders-paid
      └─ order-intake.admit: HMAC über Rohtext, Shop/Topic/Version, payload.test===true, paid, EUR
            └─ _gravuru_offer → form_order_offers → Bindung + Prüfstand + package_sha256; Variante/Menge/Preis/Attribute müssen passen
                  └─ form_order_lines (status test-paid-event-recorded, productionReady:false)
```

Harte Sperren im Code (Zitate):

- `cart-http-gate.mjs:12` – `settings.mode !== 'test-only'` → 503 `cart_disabled`. Die Option `storefront` wird in keiner Laufzeit gesetzt (`http.mjs:99/157`, `ops/plesk/merchant-runtime.mjs` ohne Treffer); `POST /api/workshop/draft-cart` hat auch keinen Aufrufer in der Oberfläche.
- `merchant-test-cart.mjs:5` – `MEMORIAL_TEST_CART` fest auf Produkt `cfg_b4fd3f0c…`, Rev. 2, Shop `gravuru-design.myshopify.com`; neun Varianten-IDs im Code.
- `draft-cart-handoff.mjs:50–51` – ohne `reviewPolicy` sperrt jeder Blocker; Acryl-/Native-Prüfstände tragen immer mindestens einen festen Blocker (`acrylic-review.mjs`, `form-review-snapshot.mjs:20–28`).
- `storefront-cart.mjs` – Angebot muss `scope === 'test-checkout-only'` sein.
- `shopify-order-webhook.mjs:10` – `config.mode!=='test-only'||config.apiVersion!=='2026-07'` → Fehler; `order-intake.mjs:25` – `payload.test!==true` → „Live-Bestellungen sind gesperrt.“
- Gehostet wird nur `orders/paid` angenommen; `orders/updated` und `orders/cancelled` gibt es nur lokal unter `/api/workshop/order-webhook`, der gehostet hinter dem Händler-JWT liegt.
- `completion.mjs:20` – Knopf „In den Warenkorb“ ist ohne `window.parent.GravuruCommerce` deaktiviert („Testansicht: Der Warenkorb ist noch nicht verbunden.“).

Was bereits trägt und übernommen werden kann:

- Prüfstände (`form_review_snapshots`): unveränderlich per Trigger, UNIQUE (`draft_id`,`draft_revision`), Token als SHA-256, Paket-ZIP mit `package_sha256`.
- Warenkorbregister (`cart_configurations`, `cart_configuration_revisions`): `konfig_…`, Revisionen unveränderlich, `offer_id` UNIQUE, Zeile genau einmal nachgetragen.
- Übergabejournal (`storefront_cart_handoffs`): `offer_key` UNIQUE, Zustände started/completed/failed/unknown.
- Bestelleingang: Ereignisse idempotent (`form_order_events` PK shop+event_id, `body_sha256`), Positionen UNIQUE (`shop`,`order_id`,`line_id`) und `offer_id`; Fehler je Position sichtbar (`form_order_line_errors`).
- Fertigungszustände (`production-release.mjs`): eingegangen → geprüft → freigegeben → in_fertigung → fertig; `fehler`; Storno/Erstattung sperren Freigabe; `productionReady` nur mit bestandenen Checks.
- Exportaufträge (`export-jobs.mjs`): Lease 150 s, abgelaufene `running`-Aufträge werden erneut übernommen (fortsetzbar); Prüfvermerke `output-checks.mjs`.
- Shopify-Zugriff: `shopify-admin-readonly.mjs`, `shop-draft-transfer.mjs` (`productSet`), `acryl-shop-service.mjs` (`productSet`, `sku = Varianten-ID`), `shopify-draft-token.mjs`; `read_orders` gewährt; `ORDERS_PAID`-Abo vorhanden.
- Konfigurator-Warenkorbvertrag (`commerce-model.mjs`): Bindung `gravuru-shopify-commerce/v2` mit `productId`, `variants[{id,key,priceCents}]`, Preismodus `base-only`/`shopify-cart-transform`; Preis wird clientseitig *und* serverseitig aus derselben `quote()` gerechnet; Shopify muss den Preis in `cost.amountPerQuantity` bestätigen.

## 4. Lücken mit Beleg

| Nr. | Lücke | Beleg | Folge |
| --- | --- | --- | --- |
| L1 | Formprodukte (Acryl, Edelstahl-Serie) sind im neuen Konfigurator nicht ladbar | `http.mjs:191` leitet `key:'form'` an `_merchant-form-editor.html`; keine Formprodukt-Logik in `variant-m` | Acryl kann heute nicht im neuen Konfigurator gestaltet werden |
| L2 | Storefront-Brücke `GravuruCommerce` fehlt; Theme-Erweiterung nicht im Repo | `git grep GravuruCommerce` nur Aufrufer; `recovery/…/RECOVERY.json` `fullExtensionRecovered:false`; zurückgewonnene Blöcke gehören zum *alten* Konfigurator (`gravuru-engine.js`, `orderEnabled:false`) | Kein Produktseiten-Einbau, kein `gravuru-cart-submit`-Empfänger, kein `cartCreate` aus dem Shop |
| L3 | Keine öffentliche Kundenroute | gehostet verlangt `/api/workshop/*` ein Händler-JWT; Kundenentwürfe hängen heute am Händlerfenster (`GravuruMerchantRequest`) | Kunden können weder Produkt laden noch Entwurf speichern |
| L4 | Warenkorb nur im Händler-Testmodus | Abschnitt 3, Sperren 1–4 | kein Kundenwarenkorb, kein zweites Produkt |
| L5 | Bestelleingang nur Test, nur `orders/paid` | Sperren 5–6 | Storno/Erstattung erreichen den Server nicht; Live-Bestellungen abgelehnt |
| L6 | Acryl ohne Varianten-Bindung | `form_shop_bindings` ohne Acryl-Einträge; nirgends eine Abfrage per SKU; Shopify-Produkt `16175627665788` DRAFT | Weder Preis noch Varianten-ID serverseitig prüfbar |
| L7 | Bindungsvertrag v2 ist 1 Konfiguration ↔ 1 Shopify-Produkt | `commerce-model.mjs:validateCommerce`: `binding.variants.length !== combinations.length` → Fehler | Ein Hauptprodukt mit 798 Varianten über 79 Formen/Größen passt nicht in den Vertrag |
| L8 | Fertigungsauftrag entsteht nicht aus der Bestellung | `form_export_jobs` UNIQUE (`snapshot_id`,`recipe_key`), angelegt nur von Hand (`POST /api/workshop/export-jobs`, `review-snapshots/:id/print`) | Nach Zahlung muss jemand klicken; Ausgaben liegen als BLOB in SQLite, kein Dateiweg zur Maschine (JobControl getrennt) |
| L9 | Freie Konturen (Retro 1/2) im neuen Konfigurator nicht darstellbar | `design-area.mjs`, `commerce-export.mjs`: nur `rect`/`ellipse`(/`plaque`) | 2 von 8 Acryl-Formen brauchen Konturpfade |
| L10 | Ampel „grün“ nie erreichbar | `http.mjs:940` übergibt `verifiedShopify` nicht; `acrylDesignTrafficLight` liefert nie grün | Mitarbeiter sehen nie „veröffentlicht“ |
| L11 | Datenbefunde Serie | `sizes` enthält RE 30x20 und AB 30x20 doppelt; Serverkorrekturen (`design_corrections`) sind maßgeblich und nur auf dem Server | vor jeder Konvertierung Server sichern und Korrekturen übernehmen |
| L12 | Bearbeiten aus dem Warenkorb für Formprodukte | `cart-edit-revision.mjs:15` | nur relevant, falls Weg B |

## 5. Entscheidung: zwei Wege

**Weg A – Acryl-Serie in das native Modell des neuen Konfigurators überführen (Empfehlung)**

1. Serie `gravuru-form-series-catalog/v1` → Katalogfamilie `gravuru-product-family/v2` (Formen, 81 Größen, Befestigungen K00/KGL/KRA/B02/B02S/B04/B04S mit Aufschlägen, Preise, Konturen/Löcher) + Linie „Acryl-Türschilder Schwarz/Anthrazit“. Mechanisch, per Skript, nichts erfunden: alle Werte stehen in `serien/acryl-tuerschilder-2027.json`.
2. 40 Acryl-Designs: Formdesign → Lieferform 2 (`design.svg` + `design.json`, Text bleibt Text) per Konverter; Serverkorrekturen aus `design_corrections` vorher exportieren und einspielen (L11).
3. `katalog-import.mjs` erzeugt die variant-m-Produkte (ein Produkt je Form/Größe, Optionen Farbe und Befestigung). Designsätze je Ausführung (9 Sätze) werden zu Themen/Zulässigkeitslisten; Mindesttext 3 mm ist im nativen Modell bereits hart.
4. Konturerweiterung: `shape:'path'` mit `gravuru-contour/v1` in `profile.geometry` für Retro 1/2 (Rendern, Designfläche, Export). Kann als Phase 2 nachgezogen werden; bis dahin bleiben RT1/RT2 unveröffentlicht.
5. Bindung: `form_shop_bindings` um den Optionsschlüssel erweitern; Zuordnung **per SKU** aus dem Shopify-Produkt `16175627665788` (Admin API, `productVariants` nach `sku`), Eindeutigkeit geprüft, persistiert (L6). `validateCommerce` so erweitern, dass mehrere Konfigurationen auf ein Shopify-Produkt zeigen dürfen und die Varianten einer Konfiguration eine Teilmenge sind (L7).

Vorteile: ein Kundeneditor, eine Preis- und Prüfstandlogik, die bereits bis zur bezahlten Bestellung gelaufen ist; Katalog bleibt die Quelle (Regel 1 der Katalog-`CLAUDE.md`); Edelstahl-Serie (399) geht denselben Weg.
Nachteile: Acryl-Galerie und `form-customer` werden für Kunden abgelöst (Mitarbeiterfunktionen müssen im Händler-Editor gleichwertig sein: Motivkategorien sind dort bereits vorhanden, Korrekturen/Hilfslinien/Textgröße ebenfalls – zu prüfen je Funktion); Retro-Formen zunächst zurückgestellt; einmaliger Konvertierungslauf mit Abnahme je Form.

**Weg B – Formeditor als zweiten Kundeneditor ausbauen**

Alle Lücken L2–L8 und zusätzlich L12 für den Formweg lösen; Formprüfstände haben feste Blocker; zwei Kundeneditoren dauerhaft pflegen. Widerspricht der Festlegung „Kundenanbindung für den neuen Konfigurator“. Nicht empfohlen.

**Von Chris zu entscheiden:** Weg A oder B; ob Retro 1/2 in Phase 2 dürfen; ob ein Shopify-Hauptprodukt mit 798 Varianten bleibt (empfohlen, entspricht der Katalogstruktur „Hauptprodukt → Ausführungen“).

## 6. Zielschnittstelle (Weg A)

```
Shopify-Produkt 16175627665788 (798 Varianten, SKU je Variante)
  └─ form_shop_bindings(shop, variant_id, product_id=cfg_<Form/Größe>, product_revision, option_key, sku, unit_cents)   [neu: option_key, sku]
Produktseite (Theme-App-Erweiterung, neu) ──iframe──▶ Kundenroute /konfigurator/<handle> (öffentlich, neu)
  ├─ liefert Konfiguration + Bindung (gravuru-shopify-commerce/v2, mehrere cfg je Produkt)
  ├─ Entwurf: POST /api/kunde/entwuerfe (neu, anonym mit Entwurfs-Token; gleiche Tabellen wie acrylic-drafts) → adraft_… + proof_…
  ├─ Warenkorb: GravuruCommerce empfängt gravuru-cart-submit → POST /api/kunde/warenkorb {draftId, expectedRevision, quantity, edit?}
  │     Server: Preis aus quote() === Bindung; Angebot _gravuru_offer; cartCreate/cartLinesUpdate per Storefront API; Register konfig_…/rev
  │     Zeile: _gravuru_offer, _gravuru_config, _gravuru_rev, _gravuru_revision, sichtbare Felder (Design, Format, Ausführung, Einzelpreis)
  └─ Bearbeiten: Theme-Link ?config=&rev=&line= (vorhanden, K8)
Shopify ORDERS_PAID (live) + ORDERS_CANCELLED + REFUNDS_CREATE ──▶ /webhooks/shopify/* (HMAC, Shop, Version)
  └─ order-intake.admit: Modus 'live' (neu, ausdrücklich konfiguriert), Positionen an Prüfstand/Bindung/Prüfsumme gebunden
        └─ neu: je angenommener Position automatisch Exportauftrag (snapshot_id, recipe aus Fertigungsprofil) → form_export_jobs
              └─ Zustand eingegangen → (Checks) geprüft → Freigabe (Mitarbeiter oder autoRelease) → Dateien je Bestellposition
```

Unverändert bleiben: Prüfstand-Unveränderlichkeit, Register, Journal, Idempotenz, Zustandsmaschine. Testschutz wird nicht entfernt, sondern um einen ausdrücklich konfigurierten Live-Modus ergänzt (`GRAVURU_SHOPIFY_ORDER_WEBHOOK=live-2026-07`, getrennter Schlüssel), der Testbestellungen weiterhin getrennt kennzeichnet.

## 7. Umsetzungspakete (Weg A)

| Paket | Inhalt | Prüfung |
| --- | --- | --- |
| A1 Serie → Familie + Designs | Skripte `serie-zu-familie.py`, `formdesign-zu-lieferform2.py`; Korrekturen vom Server exportieren; Doppelzeilen 30x20 klären | `validateFamily`/`familyGaps` 0 Fehler; 798 Ausführungen und Preise bytegleich zur Serie; 40 Designs im Konfigurator sichtbar |
| A2 Import + Designzulässigkeit | `katalog-import.mjs` für die Acryl-Linie; Designsätze je Ausführung; Mindesttext 3 mm | Probelauf „passt/prüfen/passt nicht“ ohne „passt nicht“ je Mastergröße |
| A3 Bindung per SKU | `form_shop_bindings` + `option_key`/`sku`; Abgleichskript liest Varianten von `16175627665788` per Admin API; `validateCommerce` für geteilte Produkte | 798 eindeutige Zuordnungen, Schwarz = Anthrazit im Preis (399 Paare), Fehler bei doppelter SKU |
| A4 Öffentliche Kundenroute | `/konfigurator/<handle>` ohne Händler-JWT; Entwurfs-Token-Modell von `acrylic-drafts` übernehmen; Herkunfts-/Ratenbegrenzung | Entwurf ohne Anmeldung speichern/laden; Händler-APIs bleiben 401 |
| A5 Storefront-Brücke | Theme-App-Erweiterung (Block + JS): iframe, `GravuruCommerce`, `gravuru-cart-submit` → Serverwarenkorb → Checkout-URL/Theme-Warenkorb; Bearbeiten-Link | zwei Gestaltungen derselben Variante = zwei Zeilen; Doppelklick/Neuladen erzeugt keine Doppelzeile (Register/Journal) |
| A6 Live-Warenkorb | Gate-Modus `live` mit Preisprüfung aus `quote()`, Angebot, `cartCreate`/`cartLinesUpdate` | Preis des Shops == Serverpreis, sonst Abbruch |
| A7 Live-Bestelleingang | Modus `live`, zusätzlich `orders/cancelled`, `refunds/create` gehostet; Storno sperrt Freigabe | Wiederholte Nachricht idempotent; manipulierte `_gravuru_*` → Position `fehler` |
| A8 Fertigungsauftrag aus Bestellung | automatische Exportauftrags-Anlage je Position; Dateiablage je Bestellposition; Übergabe an JobControl | Vorlagenänderung nach Bestellung ändert Ausgaben nicht (Prüfstand-Prüfsumme) |
| A9 Retro-Konturen (Phase 2) | `shape:'path'` in Geometrie, Designfläche, Export | RT1/RT2 mit Löchern lagerichtig |

Alles in eigenen Zweigen; Shopify-Schreibzugriffe nur Bindungsabgleich (lesend) und Theme-Erweiterung (Deployment durch Chris). Veröffentlichung des Produkts erst nach Gesamtabnahme und Freigabe.

## 8. Abnahmeplan (aus der Übergabe, Abschnitt 7)

| Nachweis | Paket | Wie |
| --- | --- | --- |
| Schwarz = Anthrazit im Preis | A3 | Bindungsabgleich 399 Paare |
| repräsentative Formen/Größen/Befestigungen, kleine Varianten mit eingeschränkter Designauswahl | A2 | Probelauf + Browser: 6x2, 8x2, 15x10, Oval, Rund |
| zwei Gestaltungen derselben Variante | A5/A6 | zwei Zeilen mit verschiedenen `_gravuru_config` |
| Mehrmengen, Bearbeiten, Neuladen, doppelte Übertragung | A5/A6 | Register/Journal-Tests + Browser |
| Testbestellung bis Fertigungsdateien | A7/A8 | `test:true`-Bestellung, Exportauftrag, Dateien mit Prüfsummen |
| wiederholte Nachricht, ungültige Zuordnung, Exportfehler, Storno/Erstattung | A7/A8 | vorhandene Tests erweitern (`order-intake`, `order-refunds`, `export-recovery`) |
| spätere Vorlagenkorrektur ändert keine Bestellung | A8 | Prüfstand-Prüfsumme vor/nach Korrektur |

## 9. Von Chris benötigt

- Entscheidung Weg A/B und Retro-Phase 2.
- Zugriff zum Veröffentlichen der Theme-App-Erweiterung (Shopify CLI/Dev Dashboard; Deployment bleibt bei Chris).
- Für Live-Webhooks: zusätzliche Themen `orders/cancelled`, `refunds/create` im Abo (Anlage per App, Bestätigung durch Chris); Storefront-API-Token für den Shop.
- Bestätigung, dass die Serverkorrekturen in der Acryl-Galerie vor der Konvertierung abgeschlossen sind (Export danach).
