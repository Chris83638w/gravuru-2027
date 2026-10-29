# Funkklingeln – lesender Pilot-Probelauf, 29.10.2026

Codex/Astra. Aufgabenbranch `dev/funkklingeln-pilot-probelauf-20261029-astra`, Basis `main 26952e48e857c9ad08b23bf4e8557f27dfdbc3eb`. Dieser Bericht ersetzt keine Live-Abnahme.

## Auftrag und Freigabegrenze

Aktueller Nutzerauftrag: ausschließlich lesen, Probelauf und konkreter Pilot-/Rückweg; keine Shopify- oder Themeänderung. Live erst, wenn PR #42 **einschließlich Filter nach Produktlinie tatsächlich bereitgestellt** ist und Chris ausdrücklich erneut freigibt. Frühere Freigaben, bestehende Datenbankfreigaben und der bereits gesetzte Hostschalter erfüllen diese neue Bedingung nicht.

**In diesem Lauf: 0 Shopify-Schreibzugriffe, 0 Themeänderungen, 0 Bindungsänderungen, 0 Webhookänderungen, 0 Veröffentlichungen, 0 Warenkorbänderungen, 0 Deployments/Neustarts.** Geschrieben wurden nur lokale/private Prüfdateien und diese Dokumentation auf dem eigenen GitHub-Branch. Kein wiederkehrender Plesk-Auftrag angelegt.

## Frisch gelesener Shopify-Bestand

Abfrage am 29.10.2026, Shop `gravuru-design.myshopify.com`, EUR. Alle sechs AOSU-Produkte sind ACTIVE und besitzen jeweils 120 Varianten, insgesamt 720. ACTIVE ist nicht gleich Veröffentlichung im Onlineshop.

| Modell / Haupteinstieg | Produkt-ID | Onlineshop | custom.customization_id | Vorlage |
|---|---|---|---|---|
| AOSU Pro V8P1AX11, Hochformat | 16124413084028 | veröffentlicht | fehlt | Standard |
| AOSU Ultra V8S1AX15, Hochformat | 16126380212604 | veröffentlicht | fehlt | Standard |
| AOSU Pro, Querformat | 16182701621628 | nicht veröffentlicht | cfg_d52f96e0-17e4-42b0-b496-74eaa24eaba5 | funkklingeln-2027 |
| AOSU Pro, länglich | 16182702211452 | nicht veröffentlicht | cfg_4dc5181c-d201-4802-8a4b-9500049ed6e5 | funkklingeln-2027 |
| AOSU Ultra, Querformat | 16182861726076 | nicht veröffentlicht | cfg_1df891a8-61e8-4b6d-a830-a4431970bd3c | funkklingeln-2027 |
| AOSU Ultra, länglich | 16182866346364 | nicht veröffentlicht | cfg_be8a9406-719d-4640-be12-f2ccf8b3653d | funkklingeln-2027 |

Vollständige Handles und IDs: [inventory.json](funkklingeln-pilot-20261029-astra/inventory.json).

Öffentliche GET-Prüfung 07:58:51–07:58:58 UTC: Beide Hochformate liefern ihre Produktseite ohne `#gravuru-konfi`, Start-Link oder Embed-Modul. Die vier übrigen URLs leiten auf die Shop-Startseite um; das abschließende HTTP 200 ist **keine erreichbare Produktseite**. D8 liefert alle drei Einstiegssignale. [Abrufbelege](funkklingeln-pilot-20261029-astra/storefront-read.json).

## Einstieg wie D8 – konkreter Plan, keine Themeänderung

Live-Theme: `185833718140`, `gravuru-shopify-theme/production`. Die vorhandene globale Section `sections/footer-group.json → custom_liquid_xCyNJV` prüft:

```liquid
request.page_type == 'product' and product.metafields.custom.customization_id.value != blank
```

Sie liefert `<script type="application/json" id="gravuru-konfi">` mit Produkt-ID, gewählter Variante, allen Varianten-IDs und Rückweg sowie `/apps/konfigurator/shop-embed.mjs`. Das vorhandene Modul findet die Kaufformulare dieses Produkts, fügt „Jetzt personalisieren“ ein und verwendet `/apps/konfigurator/start`. Der neue App-2027-Weg löst **Shopify-Produkt/Variante über die Registry** auf die feste Konfiguratorrevision auf; das Metafeld ist der Einstiegsschalter, kein Ersatz für eine geprüfte Bindung.

D8 (`16077798965628`, Handle `tuerschild-abger-ecken-v2a-personalisiert-leuchtturm-12x8`) hat zusätzlich in `test-temp-svenja-grid` einen aktiven Custom-Liquid-Link. Sein alter Gravuru-App-Block und FPD-Blöcke sind deaktiviert. D8s Wert `4100000` darf nicht auf AOSU kopiert werden.

Späterer Minimalplan, **heute nicht ausgeführt**:

1. Für den ersten sichtbaren Pilot ausschließlich AOSU Pro Hochformat `16124413084028` wählen. Nach allen Gates dessen fehlendes Metafeld auf die bereits geprüfte ID `cfg_c3ee3fcf-bf87-42e3-af2a-98b680cdb576` setzen. Standardvorlage und Veröffentlichung können bleiben; der globale Einstieg benötigt keinen Vorlagenwechsel.
2. Vorhandenen Startweg, Laden des Editors, alle Auswahlmöglichkeiten und Warenkorb prüfen. Nicht zusätzlich D8s Liquid oder einen zweiten App-Block einbauen.
3. Erst nach erfolgreichem Ein-Produkt-Pilot weitere freigegebene Produkte anschließen. Die vier unveröffentlichten AOSU-Einstiege benötigen zusätzlich die gezielte Onlineshop-Veröffentlichung; ihre Marker sind schon vorhanden. Vorher erneut Werte sichern und nachlesen.
4. Die dedizierte Funkklingelvorlage und Standardvorlage enthalten weiterhin aktive Varianten-Picker. Der Loader versteckt native Kaufen-/Mengenfelder, nicht diese Picker. Die frühere Anforderung „Optionen nur im Konfi“ ist damit nicht automatisch erledigt. Hier ist nur der Befund/Plan dokumentiert, keine Themeänderung.

Theme-Dateien wurden gelesen und ihre MD5-Werte gesichert: [review-evidence.json](funkklingeln-pilot-20261029-astra/review-evidence.json). Keine ganze ältere Theme-Kopie veröffentlichen.

## Drei Pilotprodukte: Bindungen und tatsächlicher Probelauf

Der vorhandene `scripts/doorbell-pilot-bind.mjs` wurde auf dem Server **ohne --apply, ohne --approve-live** ausgeführt. Er prüfte die echten Importdaten/Fingerprints, aktuellen nativen Revisionen und Vorgaben, exportierte den Shop vollständig zur Kollisionsprüfung und las anschließend alle 360 Varianten erneut. Parallel wurden die tatsächlich gespeicherten Binding-Heads ausschließlich über SQLite `readOnly:true` geprüft.

Ergebnis 29.10., **08:14:07 UTC**: `mode=dry-run`, 3 Produkte / 360 Varianten, `shopVerified=true`, `written=false`, `liveRelease=null`, `webhookSubscriptionsChanged=false`. **360/360 gespeicherte Bindungen passend, 0 Abweichungen** bei Produkt, Variante, Konfigurator-ID, Revision, SHA, Auswahl und Preis. Alle drei nativen Revisionen und importierten Dokumente unverändert; bestehende Freigaben `user-20261027-funkklingeln` passen zu ihrem historischen Stand.

| Shopify-Produkt | Konfiguratorprodukt | Revision | Binding-Heads / passend | Startwert |
|---|---|---|---|---|
| 16124413084028 | cfg_c3ee3fcf-bf87-42e3-af2a-98b680cdb576 | 1 | 120 / 120 | 16×28, Schwarz, 49,99 € |
| 16182701621628 | cfg_d52f96e0-17e4-42b0-b496-74eaa24eaba5 | 1 | 120 / 120 | 24×20, Anthrazit, 59,99 € |
| 16182702211452 | cfg_4dc5181c-d201-4802-8a4b-9500049ed6e5 | 1 | 120 / 120 | 35×18, Schwarz, 69,99 € |

Start jeweils ganzer Rahmen, keine Befestigung, Standardposition. **Jedes** Hauptprodukt behält 3 Formate × 2 Farben × 4 Rahmen × 5 Befestigungen = 120 Varianten. Die Gegenposition ist eine kostenlose Konfiguratorwahl und keine zusätzliche Shopify-Variante. Montagezuschläge bleiben 0 / 599 / 499 / 499 / 369 Cent. Der vollständige [360-Zeilen-Bindungsplan](funkklingeln-pilot-20261029-astra/pilot-360-bindungsplan.csv) enthält Variante, SKU, Optionen, Centpreis, Revision und kanonischen Dokument-SHA.

[Server-Probelauf und gespeicherte Bindungen](funkklingeln-pilot-20261029-astra/server-pilot-report.json). Die darin enthaltene erste Webhook-Abfrage hatte einen Token-Timeout; sie ist vom erfolgreichen Pilotlauf getrennt zu bewerten.

## Live-Schalter und Webhooks

In der am 29.10. gelesenen Startdatei `gravuru-2027-merchant/app.cjs` steht bereits `GRAVURU_DOORBELL_LIVE_ORDERS="approved-20261027"`, zusammen mit `GRAVURU_CUSTOMER_INTEGRATION=merchant-test-only`. Die separate Shopify-Konfigurationsdatei enthält diese beiden Werte nicht. **Befund: vorhandene Startkonfiguration eingeschaltet; nicht heute aktiviert.** Der laufende Prozess wurde nicht instrumentiert oder neu gestartet; eine direkte Messung seines nachträglich gesetzten Prozess-Env ist damit nicht behauptet.

Frische Prüfung am 29.10., **08:18:54 UTC**, über die Eigentümer-App `423276544001` und API `2026-07`: alle drei Abonnements vorhanden und **action:keep**. Eigentümer, unterstützte API-Version, JSON, `filter:test:false`, benötigte Felder und eindeutige Ziele wurden durch den vorhandenen Helper geprüft. Keine Änderung und kein neuer Webhook.

| Topic | Subscription-ID | Ziel |
|---|---|---|
| ORDERS_PAID | 2157499449724 | https://app-2027.gravuru-designwerkstatt.de/webhooks/shopify/orders-paid |
| ORDERS_UPDATED | 2157499515260 | https://app-2027.gravuru-designwerkstatt.de/webhooks/shopify/doorbell-orders-status |
| ORDERS_CANCELLED | 2157499580796 | https://app-2027.gravuru-designwerkstatt.de/webhooks/shopify/doorbell-orders-status |

Das vorhandene Test-PAID-Abonnement `2149402706300` bleibt erhalten. [Frischer Webhook-Lesebeleg](funkklingeln-pilot-20261029-astra/webhooks-readback.json). Zwischenzeitliche Token-504/Timeouts waren vorübergehend; der abschließende Abgleich gelang nach Wiederholung. Keine echte Bestellung oder Webhook-Zustellung ausgelöst.

## Offene Live-Voraussetzungen

- PR #42 zum abschließenden GitHub-Abgleich weiterhin **offen, Entwurf, nicht gemergt**, Head `bfbd9188ac4446611bc5e71b55b74c804aec5767`. Der Body nennt aktuellen Store-Mengenlauf und Linux-Prüfung noch offen. PR #41 ist laut aktuellem STATUS bereits live; die gestrige Aussage „PR #41 noch Entwurf“ gilt nicht mehr.
- Ein Filter **nach Produktlinie** ist im gelesenen PR-42-Galeriecode nicht bestätigt: `checkScope` grenzt Store, Mandant und Shop ab; diese Grenze trennt innerhalb desselben Stores nicht D8 von Funkklingeln bzw. deren Modelllinien. Die Leistungsoptimierung allein erfüllt den Filter-Auftrag nicht. Vor Freigabe konkrete Filtertests und Live-Nachweis verlangen.
- Die Korrektur der importierten Designressourcen vom gestrigen Aufgabenbranch ist noch nicht in `main`: `artwork-resource.mjs` enthält weiter den von der Host-Umschreibung betroffenen Literalpfad. Der gestern tatsächlich gescheiterte AOSU-Start ist dokumentiert in [Pilot-Rücknahme und Ressourcenfehler](https://github.com/Chris83638w/gravuru-2027/blob/dev/funkklingeln-anbindung-20261028-astra/docs/handoffs/2026-10-28-funkklingeln-neuer-anschluss-pilot.md). Heute kein erneuter Editor-/Warenkorbtest und keine zusätzliche Appänderung.
- Chris muss **nach Erfüllung der technischen Gates** ausdrücklich den konkreten Live-Pilot freigeben. Heute keine Livefreigabe anfordern oder aus historischen Datensätzen ableiten.

## Reproduzierbare Befehle: ausschließlich Probelauf

Auf dem bestehenden Händlerhost, im aktuellen freigegebenen Codeverzeichnis. Neuer privater Ausgabeordner je Ausführung; keine vertraulichen Werte ausgeben.

```sh
cd /var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-main
GRAVURU_SHOPIFY_CONFIG_FILE=/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-merchant-shopify.json \
GRAVURU_PYTHON=/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311/bin/python \
/opt/plesk/node/24/bin/node --input-type=module -e 'import {merchantConfig} from "./ops/plesk/merchant-config.mjs"; import {run} from "./scripts/doorbell-pilot-bind.mjs"; await run(process.argv.slice(1), {env:merchantConfig(process.env).runtimeEnv});' -- \
  --created-input /var/www/vhosts/gravuru-designwerkstatt.de/private/funkklingeln-pilot-20261027/pilot-binding-input.json \
  --portrait-plan /var/www/vhosts/gravuru-designwerkstatt.de/private/funkklingeln-pilot-20261027/aosu-pro-v8p1ax11-16x28--16x28.json \
  --import-report /var/www/vhosts/gravuru-designwerkstatt.de/private/funkklingeln-import-20261027/import-report.json \
  --db /var/www/vhosts/gravuru-designwerkstatt.de/private/acryl-employee-20261021-v1/data/workshop.sqlite \
  --out /var/www/vhosts/gravuru-designwerkstatt.de/private/funkklingeln-pilot-neupruefung/bind-dryrun
```

Kein `--dry-run` an den Pilot-Helper anhängen: Sein Standard ist lesend, und ein solcher Parameter gehört nicht zu dessen Parser. Ohne `--export` wird ein vollständiger neuer Export gelesen. Ein alter Export darf nicht als heutiger Beleg umetikettiert werden.

Webhook-Abgleich über **dieselbe Eigentümer-App**, nicht über die andere Shopify-MCP-App:

```sh
GRAVURU_SHOPIFY_CONFIG_FILE=/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-merchant-shopify.json \
/opt/plesk/node/24/bin/node --input-type=module -e 'import {merchantConfig} from "./ops/plesk/merchant-config.mjs"; import {run} from "./scripts/doorbell-webhooks.mjs"; await run(["--dry-run","--out",process.argv[1]], {env:merchantConfig(process.env).runtimeEnv});' \
  /var/www/vhosts/gravuru-designwerkstatt.de/private/funkklingeln-pilot-neupruefung/webhooks.json
```

Der heutige Aufruf verwendete zusätzlich einen Query-only-Wrapper und `ensureDoorbellWebhooks({apply:false})`; kein unsignierter POST-Probeaufruf und keine Registrierung. `confirmed:false` ist beim Webhook-Dryrun die vorgesehene Ausgabe, nicht allein ein Fehler. Maßgeblich sind drei eindeutige `action:keep` nach erfolgreicher Eigentümer-/Versions-/Filterprüfung.

## Späterer Ein-Produkt-Pilot und Rückweg

1. PR #42 samt Produktlinienfilter und Ressourcenfehlerkorrektur tatsächlich bereitgestellt nachweisen; Chris' konkreten neuen Satz dokumentieren. Live-Dateien/Version prüfen.
2. Aktuellen Shopify-Vorher-Abzug des einen Hochformats sichern: Marker (derzeit fehlend), Standardvorlage, ACTIVE, Veröffentlichung, alle 120 IDs/SKUs/Preise/Optionen. Aktuelle Bindungen erneut nur lesen. Bei weiterhin passenden Bindungen **keinen Bindingwriter nochmals anwenden**. Insbesondere würde `doorbell-pilot-bind --apply` alle drei Pilotprodukte betreffen, nicht nur eine Produktseite.
3. Nur den fehlenden Marker des einen Hochformats ergänzen. Keine Themeänderung, keine globale Flagänderung, keine Webhookänderung, keine neue Revision, keine neue SKU.
4. Produktseite → „Jetzt personalisieren“ → Editor. Alle drei Formate und beide Positionen prüfen; Gerätebild bleibt aufrecht, Montagebild/Bohrungen passen. Farben, vier Rahmen, fünf Befestigungen, Texte und Preise gegen den Plan prüfen. Designgalerie darf keine fremde Produktlinie anbieten.
5. Nach Bedienprüfung genau einen Test in den bestehenden Theme-Warenkorb übergeben, Zeilenvariante/Preis/Personalisierungsreferenz zurücklesen, Desktop-/Mobil-Screenshot sichern. **Keine bezahlte Bestellung**. Erst bei bestandenem Pilot den Rest gemäß dann gültiger Freigabe bearbeiten.
6. Bei Fehler sofort stoppen. Nur den eben hinzugefügten Marker nach Abgleich mit dem Vorher-Abzug wieder entfernen. Vorlagenwechsel ist im Minimalplan nicht vorgesehen; falls später ausdrücklich mitgeändert, exakt zurücksetzen. Ursprünglich veröffentlichte Produkte nicht pauschal unveröffentlichen. Bei später neu veröffentlichten Produkten nur deren tatsächlich neu hinzugefügte Veröffentlichung zurücknehmen.
7. Bindungen, unveränderliche Revisionen, Freigabehistorie und bestehende Webhooks bleiben erhalten. Kein globales DB-Restore über laufende Bestellungen, kein globales Abschalten aller Funkklingeln als pauschaler Rückweg. Falls zukünftig ein eigener Schreibplan für Bindungen nötig wird, dessen Rückweg vor Ausführung gesondert konkretisieren.

## Tests und Belege

118 lokale Quelldateien des gezielten Testbaums gegen Git-Blob-SHAs von `26952e4` geprüft, keine Abweichung. Die vier auf dem Server gelesenen Anschlussmodule passen ebenfalls zu diesem Stand.

```sh
node --test scripts/doorbell-pilot-bind.test.mjs scripts/doorbell-shop-bind.test.mjs scripts/doorbell-webhooks.test.mjs
```

**17/17 grün**, 0 Fehler, 0 Skips. Tests verwenden isolierte Testdatenbanken und synthetische API-Antworten; sie sind keine Live-Shopify-Schreibtests. Dazu reale heutige Shopify-Abfragen, der reale Server-Dryrun und die lesende DB-Prüfung. Keine heutigen visuellen Aussagen über Geräte-/Bohrbildpositionen oder Warenkorbabschluss aus diesen Tests ableiten.

Nächster Schritt: die genannten Software-/Galerie-Voraussetzungen abschließen und live nachweisen, anschließend Chris' ausdrücklichen Satz für den Ein-Produkt-Pilot abwarten.
