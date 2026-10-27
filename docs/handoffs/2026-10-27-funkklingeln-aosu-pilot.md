# AOSU-Pro-Pilot: drei Formate binden

Stand 27.10.2026, Codex. Ergänzt den bestehenden vollständigen Funkklingel-Bindungsweg um einen eng festgelegten Pilotaufruf. Keine Shopify-Produktmutation und keine Registrierung von Webhooks.

## Dateien und Grenzen

- scripts/doorbell-pilot-bind.mjs: drei feste AOSU-Pro-Produkt-IDs; 360 Varianten, Erhalt aller Startwerte. Verwendet validateDoorbellManifest (1 Modell/3 Einstiege), validateDoorbellExport, validateDoorbellRecords, createDoorbellLiveReader und applyDoorbellBindings aus der vorhandenen 126er-Implementierung. Die vollständige CLI bleibt unverändert.
- scripts/doorbell-pilot-bind.test.mjs: vier Tests grün. Unveränderter Dryrun-DB-Hash, alte/geänderte Importdaten abgewiesen, reale Registry mit 360 Bindings/3 festen Freigaben und idempotenter Wiederholung geprüft. Lauf ca. 51 Sekunden einschließlich zweier Schreibdurchläufe; 60-Sekunden-Frischeprüfung unverändert.
- Der Helper öffnet die vorhandene Acryl-Datenbank zunächst nur lesend und prüft Schema v4, Importjournal-ID/Fingerprint, aktuellen Produktstand gegen das importierte Dokument sowie Modell, Startformat, Farbe, Rahmen, Befestigung und Design.
- Schreibmodus benötigt --apply. Die zusätzliche Kundenfreigabe benötigt --approve-live --approval-id. Der Helper erzeugt keine globalen Freigaben, ändert keine Hostvariablen und registriert keinerlei Shopify-Webhooks.

Feste Produkte: 16124413084028 (16×28), 16182701621628 (24×20), 16182702211452 (35×18). Modell aosu-pro-v8p1ax11-16x28. Manifest-SHA-256 98014562f22f360dd7ae70335a701e711a8b4b9a7d0096190b3985e7f3f17233.

## Vorbedingungen

Der echte Serverimport mit import-report.json und documents/ muss abgeschlossen sein. Ein lokaler Dryrun-Report wird ausdrücklich abgewiesen. Datenbanken zuvor konsistent sichern. Neues Codepaket bereitstellen. Die zwei bereits bestehenden, nicht geheimen lokalen Eingaben auf dem Host unter private/funkklingeln-pilot-20261027/ ablegen:

- work/doorbell-migration/shopify-stage/pilot-binding-input.json
- work/doorbell-migration/shopify-stage/aosu-pro-v8p1ax11-16x28--16x28.json

Die erste Datei enthält die 240 neuen Varianten; die zweite die 120 bestehenden Varianten und ihren unveränderten Einstieg. Keine IDs/SKUs neu erzeugen. Der Pilot liest den realen Appzugang durch die bestehende geprüfte merchantConfig; Werte werden nicht ausgegeben oder in Exportdateien geschrieben.

## Lesende Serverprüfung

```sh
cd /var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-main
GRAVURU_SHOPIFY_CONFIG_FILE=/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-merchant-shopify.json \
/opt/plesk/node/24/bin/node --input-type=module -e 'import {merchantConfig} from "./ops/plesk/merchant-config.mjs"; import {run} from "./scripts/doorbell-pilot-bind.mjs"; await run(process.argv.slice(1), {env:merchantConfig(process.env).runtimeEnv});' -- \
  --created-input /var/www/vhosts/gravuru-designwerkstatt.de/private/funkklingeln-pilot-20261027/pilot-binding-input.json \
  --portrait-plan /var/www/vhosts/gravuru-designwerkstatt.de/private/funkklingeln-pilot-20261027/aosu-pro-v8p1ax11-16x28--16x28.json \
  --import-report /var/www/vhosts/gravuru-designwerkstatt.de/private/funkklingeln-import-20261027/import-report.json \
  --db /var/www/vhosts/gravuru-designwerkstatt.de/private/acryl-employee-20261021-v1/data/workshop.sqlite \
  --out /var/www/vhosts/gravuru-designwerkstatt.de/private/funkklingeln-pilot-20261027/bind-dryrun
```

Ohne --export liest der bestehende Shop-Exportclient den ganzen Shop, um auch externe SKU-Kollisionen zu erkennen. Kleine Seiten begrenzen die Shopify-Abfragekosten. Danach prüft der bestehende LiveReader alle 360 Varianten erneut. Ausgaben: manifest.json, products.json und report.json. Erwartet: mode dry-run, products 3, variants 360, written false, shopVerified true, liveRelease null. Ein bereits vollständig erzeugter Shop-Export kann mit --export übergeben werden; die zusätzlichen Liveprüfungen bleiben immer aktiv.

## Geprüfter Schreibaufruf

Denselben Aufruf mit neuem --out .../bind-apply ausführen und diese Argumente ergänzen:

```sh
--export /var/www/vhosts/gravuru-designwerkstatt.de/private/funkklingeln-pilot-20261027/bind-dryrun/products.json \
--apply --approve-live --approval-id user-20261027-funkklingeln
```

Der vorhandene Bindingwriter liest frische Shopify-Belege je höchstens 100 Varianten und schreibt jede geprüfte Gruppe innerhalb der unveränderten Frischefrist. Nach allen 360 Bindings werden genau die drei aktuellen Produktrevisionen freigegeben. Wiederholung derselben Freigabe ist idempotent. Erst danach den vorhandenen Hostschalter für den kontrollierten Kundenpilot aktivieren und App-Proxy sowie Warenkorb tatsächlich prüfen. Shopify-Webhook-Abonnements bleiben bis zum bestandenen Pilot unangetastet; die vollständige 126er-Registrierungsprüfung wird nicht gelockert.

Diese lokale Umsetzung und ihre Tests führen weder den Serveraufruf noch Shopify-Mutationen aus. Live-Prüfung und echte Ergebnisse sind noch gesondert zu protokollieren.
