# Funkklingeln: Bestelleingang und Statusprüfung – 27.10.2026

Codex, lokaler Prüfstand gegen den Code-Basisstand d103019b6dc0eb29413345a83af17036ce021055. Noch nicht veröffentlicht; diese Übergabe ist kein Live-Nachweis.

## Ergebnis

- Die vorhandene Bestellung-/Shopvorbereitungsregression ist vollständig grün: 18/18 Tests.
- Der neue revisionsgebundene Funkklingel-Bestelleingang, Webhook-Schutz, Hostschalter und vollständige Bindungsplan bestehen zusammen 23 Tests (11 überschneiden sich mit dem obigen Lauf).
- Ein zusätzlicher echter nativer HTTP-Statusdurchstich ist grün. Insgesamt 31 unterschiedliche Tests in diesem Teilauftrag.
- Die 120 aktiven Variantenbindungen werden aus dem gespeicherten Produktstand geprüft; Produkt, Revision, Shopify-Produkt, Variante, Preis und SHA müssen passen. Keine globale Freigabe alter Produkte.
- Prüfung fand eine echte Lücke: Der bisherige öffentliche Handler nahm nur orders/paid entgegen. Storno-/Erstattungslogik war im aktiven Host nicht erreichbar. Diese Lücke ist jetzt lokal behoben.

## Ergänzung

Neue Route: /webhooks/shopify/doorbell-orders-status

Nur bei explizit eingeschalteten Funkklingel-Livebestellungen. Der Handler erhält ausschließlich den vorhandenen Acryl-Bestelleingang. HMAC über Originalbytes, fester Shop, API-Version, Topic, Bodygrenze und Browserausschluss werden vor jeder Zuordnung geprüft. Bekannte echte freigegebene Funkklingelaufträge verwenden den vorhandenen append-only Statusspeicher. Unbeteiligte Shopaufträge erhalten 200 ohne Schreibzugriff. Ein Status zu einer freigegebenen Variante vor der Zahlungsübernahme erhält 409 zur erneuten Zustellung. Alte Nachrichten überschreiben keine neueren; Storno bleibt sichtbar.

Zusätzliche Shopify-Webhooks müssen bei der Veröffentlichung eingerichtet/verifiziert werden:

- ORDERS_UPDATED, API 2026-07
- ORDERS_CANCELLED, API 2026-07
- Ziel für beide: https://app-2027.gravuru-designwerkstatt.de/webhooks/shopify/doorbell-orders-status

Die vorhandene ORDERS_PAID-Anbindung bleibt bei /webhooks/shopify/orders-paid. Keine Testschutzgrenzen für Legacy aufgehoben. productionReady bleibt vom getrennten Fertigungsfreigabeprozess abhängig.

## Dateien dieses Teilauftrags

Geändert:
- app/workshop/order-intake.mjs
- app/workshop/configurator-integration.mjs
- app/workshop/acryl-employee-host.mjs

Neu:
- app/workshop/doorbell-status-webhook.mjs
- app/workshop/doorbell-status-webhook.test.mjs

Zusätzlich fehlende unveränderte Originale bytegenau aus d103 ergänzt (Git-Blob-SHA geprüft; keine Codeänderungen):
- app/configurator/variant-m/{acrylic-scene,completion,refinements,usability,ux,neutral-theme,workflow}.css
- app/workshop/data/catalog-structure.json
- app/workshop/ui/orders.html
- app/workshop/ui/shop-preparation.html

## Ausgeführte Prüfungen

Node v24 aus dem gebündelten Runtimeverzeichnis. Unter Windows: TEMP und TMP lagen im genehmigten .local-data/migration-review-temp; GRAVURU_PYTHON zeigte auf die vorhandene gebündelte Python-Installation. Lokaler Netzwerkzugriff war für HTTP-Tests genehmigt.

node --test app/workshop/shop-preparation.test.mjs app/workshop/order-intake.test.mjs

node --test app/workshop/doorbell-status-webhook.test.mjs

node --test app/workshop/order-intake.test.mjs app/workshop/shopify-order-webhook.test.mjs app/workshop/doorbell-live-intake.test.mjs app/workshop/doorbell-host.test.mjs scripts/doorbell-shop-bind.test.mjs

## Veröffentlichung: überprüfte Reihenfolge, noch auszuführen

1. Änderungen und Katalogpaket auf eigene Aufgabenbranches committen; nach gezielter grüner Abnahme und STATUS-Eintrag integrieren.
2. Vorhandenen Acryl-Datenbestand konsistent sichern (SQLite-Backup, Integritätsprüfung); keinesfalls Legacy mit Schema v4 öffnen. Vorhandene nicht committete Katalog-Änderungen erhalten.
3. Paket unter migrationen/funkklingeln-42x3-20261027/ im bestehenden Katalog bereitstellen.
4. Import mit scripts/import-doorbell-catalog.mjs --catalog <dieser Paketordner> --work-dir <isolierte Prüfablage> --apply --database <Acrylpfad>/workshop.sqlite --asset-database <Acrylpfad>/design-assets.sqlite --tenant gravuru. Ergebnis muss 126 interne Produkte und 82 ursprüngliche Dekorassets ausweisen; dieselben Importschlüssel wiederverwenden.
5. Shopify auf insgesamt 126 Hauptprodukte mit je120 Varianten vorbereiten. Vollständigen aktuellen Export und tatsächliche internen/Shopify-IDs zum Manifest gravuru-doorbell-shop-bind/v1 zusammenführen.
6. scripts/doorbell-shop-bind.mjs --manifest <plan.json> --export <products.json> --db <Acrylpfad>/workshop.sqlite --out <bericht.json> --live --apply --approve-live --approval-id user-20261027-funkklingeln. Frische Shopify-Beweise werden blockweise geprüft; keine Frischegrenzen lockern.
7. Bestehenden Kundeneinstieg beibehalten: GRAVURU_CUSTOMER_INTEGRATION=merchant-test-only. Engen Zusatzschalter setzen: GRAVURU_DOORBELL_LIVE_ORDERS=approved-20261027. Bestehenden Katalogpfad GRAVURU_KATALOG beibehalten. Geheimnisse nicht ausgeben.
8. Code im bestehenden Host neu starten, drei Webhook-Abonnements prüfen, dann die vollständigen Produktseiten veröffentlichen.
9. Tatsächlichen Produktstart → freie Gegenposition/Formatwechsel → gesicherter Warenkorb und unabhängigen Fertigungsstand im Browser prüfen. Keine bezahlte Bestellung zum Test auslösen.

## Offene Grenzen

Shopify-Produkte, App-Deployment und Webhook-Abonnements wurden von diesem Teilauftrag nicht verändert. Kein Beleg für erfolgreiche Live-Veröffentlichung. Tatsächliche Fertigungs-/Materialabnahme und automatische Produktionsfreigabe sind keine Folge der Shopfreigabe. Der neue Statusweg schützt vorhandene freigegebene Funkklingelaufträge; fremde oder alte Produkte erhalten darüber keinen Livezugang.
