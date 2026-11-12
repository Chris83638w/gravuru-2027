# Unabhängiger Review des Main-v2-Kopienanschlusses

Geprüft am 12.11.2026: die vier gelieferten Dateien aus Commit `4aa14410`, Verzeichnis `ops/plesk/mainanschluss-20261112`, zu [Claudes Bericht #1686821759961](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6821759961). Ausschließlich Quell-/Dateilesung und Hash-/Zählervergleich; keine Treiberimporte, Tests, Host-, Netzwerk-, Datenbank- oder Shopifyläufe.

**Kein konkreter API-, Registry-/Adapter-/Provider- oder Wiederaufnahmefehler in den gelieferten Quellen gefunden.** Der Anschluss führt den geprüften Main-v2-Operator über dessen echte CLI-Funktion mit nativen Kopieninstanzen aus. Shopify und Functioncallback bleiben synthetisch. Die berichteten 20/20 Prüfungen stammen aus einer Abschrift; der Original-Testbeleg liegt hier nicht vor. Dieser Review bestätigt daher den Quellenanschluss und die Konsistenz der gelieferten Angaben, nicht einen unabhängig wiederholten oder vollständig anhand der Originalausgaben nachgerechneten Kopienlauf.

## Dateien und unveränderte Basis

Alle drei Einträge in `SHA256SUMS.txt` stimmen exakt:

| Datei | Bytes | SHA256 |
|---|---:|---|
| `mo-connections.mjs` | 12.617 | `fd6a06fe9f47c27f9402460ed81b4d806a485c33b810968d2ae5538f75c3ff14` |
| `mo-lauf.mjs` | 20.042 | `2f993ed99908195e98396ab0650303b06379968c9b4c91f38c9ad0f85e28983c` |
| `kompakt-serverwerte.json` | 7.313 | `6d2d05f2496ab845fbc68372183f57651dc07771cf8d6a3217bad2e7d54671d5` |

Das bereits geprüfte Main-v2-Paket blieb unverändert: Manifest `de182709cb4c004d338f666186cfa2785b755a708605adcf4d58b0c25721f416`, alle 25 Dateien passend. Die zehn nativen Abhängigkeitspins stimmen mit den tatsächlichen Gitblob-Bytes von `f85390bd3494920679b06c3b39cabf96c95c1343`. Zusätzlich wurden `http.mjs`, `variant-m/build.mjs` und `shopify-runtime-config.mjs` am selben Commit verglichen; die gelesenen Arbeitsdateien sind dazu bytegleich. Das sind insgesamt 13 unterschiedliche native Quelldateien; die drei Preisfunktionspins sind bereits in den zehn Paketpins enthalten.

## Tatsächlicher Anschluss

`mo-lauf.mjs:60–64` importiert `operator.mjs` aus dem anhand aller Manifestdateien geprüften Paket und ruft dessen `run(args)` ohne Test-`connect`-Override auf. Die echte Argumentverarbeitung lädt `mo-connections.mjs` als private Factory. Acht Aufrufe erfolgen nacheinander **im selben Node-Prozess**; die Factory öffnet und schließt je Aufruf neue native Kopieninstanzen. Das belegt keine Wiederaufnahme nach einem vollständigen Prozessabsturz.

`mo-connections.mjs` verwendet die echte `createWorkshop({filename,seedConfig,legacy,shopifySessions})`-Fabrik mit Workshop-/Assets-/Profiles-Dateien in der Wegwerfkopie, anschließend `createShopBindingReadAdapter` mit demselben Workshop, Mandanten-, Store-, Shop- und Produktionsprofilscope. Die erste Planvorbereitung liest aus der Registry 808 ursprüngliche R1-Bindings und jeweils `orderIntake.bindingPricing(bindingId)`; sie hält diese privat als unveränderliche Ausgangsevidenz fest. Spätere Aufrufe laden dieselbe Evidenz, während der Operator die tatsächlichen historischen Verträge erneut frisch dagegen liest. Das vollständige R2-Dokument kommt aus `repository.get(cfg,{revision:2})`; die feste R1-/R2-Fingerprintprüfung verbleibt im unveränderten Preisanschluss.

Für schreibende Modi wird genau `createMainBindingConnection({workshop,adapter,pricing})` und anschließend `createMainNativeGateway` mit derselben Registry-/Adapter-/Providerinstanz verwendet. Das entspricht dem vorhandenen WeakMap-/Read-Snapshot-Vertrag. Der native `persist` erhält den synchronen Provider auf der vorhandenen Order-Intake-Verbindung; es gibt keine nachträgliche direkte SQL-Erzeugung von Formbindungen im Treiber. `capturePersonalization`, Head-CAS und Produktions-/Dokumentprüfungen bleiben im nativen Code.

**Readonly-Grenze:** `plan` und `reconcile` erhalten am Gateway nur `inspect`, `resolveMany`, `catalogApprovals`, keinen Checker, Preisprovider, `persist` oder `approveCatalog`. Die Factory ruft davor dennoch die normale `createWorkshop`-Fabrik und `orderIntake.idBindings` ohne `readOnly:true` auf. Diese Konstruktoren besitzen native Initialisierungs-/Migrationspfade; der Store nutzt unter anderem `BEGIN IMMEDIATE` und `CREATE … IF NOT EXISTS`. Somit ist dies ein am Operator-Gateway schreibfreier Modus auf einer Wegwerfkopie, **keine schreibgesperrte DB-Verbindung und kein Beweis völliger Startup-Schreibfreiheit**. Die Abschrift benennt diese Grenze bereits richtig. Die SQL-Zähler des Treibers öffnen ihre getrennte Verbindung tatsächlich mit `{readOnly:true}`.

## Ablauf und Zahlen

Die Quelle führt die behauptete Reihenfolge aus: Plan → ausdrücklich synthetische Testzustimmung → Apply mit künstlich verlorener Antwort nach gespeichertem Preis-CAS → erneutes Apply muss `reconcile_required` liefern → lesendes `reconcile shop-pricing` → Apply mit acht nativen Blöcken → getrennte R2-Katalogfreigabe → Apply-/Katalog-Replay. Das synthetische GraphQL persistiert seinen eigenen Zustand in einer Datei und löst den Antwortverlust erst nach dem Preiswrite aus. Dadurch bleibt der echte Dateijournal-/Reconcile-Pfad des Operators aktiv. Es wird kein Operatorresultat durch ein selbst erzeugtes Erfolgsobjekt ersetzt.

Die Abschrift ist rechnerisch konsistent: 182 bestehende Shopifyvarianten für 158 Preise und 30 Labels; genau ein synthetischer Bulk- und ein synthetischer Metafeldwrite. 778 neue Formbindungen, Preisverträge und aktive Bindungsrevisionen, keine zusätzlichen Heads oder Produktrevisionen; anschließend genau eine Katalogfreigabe. Der feste Preisentwurf bleibt 3.898 Bytes / `37ef02c6f98f6b463179093aca38a715a153141d8281203a158ddbc3e49b0705`. Der Endzustand des synthetischen Shops hat alle 808 Varianten, 778 passende Zielpreise/-labels, 30 unveränderte Restvarianten und DRAFT.

Die SQL-Spalte `mainR1:808` zählt **historische Formbindungen**, nicht aktive R1-Heads. Die Aussage über 30 aktive R1-Heads kommt aus den Operatorprüfungen/der Quittung; ebenso die Erhaltung der 808 alten Preisverträge und historischen Katalogfreigaben. Der unveränderte Operator prüft diese tatsächlich. Die Abschrift allein erlaubt jedoch keinen zusätzlichen unabhängigen Einzelvergleich der 808 privaten Vertragsinhalte. Der dokumentierte Journalumfang 22 Ereignisse / 11 abgeschlossene Schritte passt zu zwei Shopify-Schritten, acht Bindungsblöcken und einer Katalogfreigabe. Der Haupt-Apply wird mit 306 Sekunden berichtet; das ist kein Einzelblock-Frischebeleg, die tatsächliche native Höchstdauerprüfung verbleibt jeweils im Checker/Persist.

## Gelieferter gegenüber nicht geliefertem Beleg

Der Original-`TESTBELEG-mainanschluss.json` wird mit **11.519 Bytes / `067f5b38dde5c0e39bbb864b7638c31a53af7fd521ae9afe56c4b8415a109977`** genannt, ist aber nicht unter den vier gelieferten Dateien. Auch vollständiger Plan, Journal, private Evidenz, `mo-paket.json`, Kopiendaten und das importierte `vh-netzwaechter.mjs` sind in diesem Vier-Dateienpaket nicht enthalten. Der vollständige Belegsha und die gemeldeten 20/20 lassen sich hier deshalb nicht unabhängig verifizieren. `kompakt-serverwerte.json` bleibt eine gekennzeichnete Abschrift. Ihre Zahlen und Quellreferenzen widersprechen den gelesenen Dateien nicht.

Der Runner prüft Quell-DB-Hashes vor/nach dem Kopieren sowie nach Abschluss, statt die DB vollständig in den Speicher zu laden. Im optionalen `--ordner`-Fortsetzungspfad darf die Quellkopienprüfung `null` bleiben und zählt nicht als Fehler; deshalb ist ein allgemeines `bestanden:true` nicht selbstständig der Beweis dieser Einzelprüfung. Die gelieferte Abschrift berichtet einen vorher/nachher unveränderten Quellstand; ohne Originalbeleg bleibt dies Operatorangabe. Ebenso sind Netzwerkversuche 0 und die Wirkung des fehlenden Netzwerkguards nicht erneut lokal ausgeführt oder behauptet.

Kein produktiver Freigabebeleg entsteht aus der Testzustimmung. Der Functioncallback ist ausdrücklich ein Platzhalter und liest keine aktuelle Aktivierung. Echte Shopifyantworten, Ratenlimits, realer `compareDigest` nach dem Schreiben, konkurrierende Live-App-/Registryzugriffe und Unterbrechung innerhalb eines Bindungsblocks sind durch diesen Kopienanschluss nicht bewiesen. Functioncallback und produktive Exklusivität werden separat geprüft; dieser Bericht fügt keine neuen hypothetischen Freigaberegeln hinzu.

Maschinenlesbarer eigener Nachweis: `main-host-connection-independent-checks.json`, ausschließlich Datei-/Quellenpins und Konsistenzprüfungen. Alte Operatorpakete, ihre Pins und bereits veröffentlichte Reviews wurden nicht verändert.
