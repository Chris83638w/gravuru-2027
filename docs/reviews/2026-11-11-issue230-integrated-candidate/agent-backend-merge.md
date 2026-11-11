# Backend-Zusammenführung – #230

Stand 11.11.2026, lokal abgeschlossen. Arbeitsbaum `work/issue230-integration-candidate`, aktiver Merge `0e200d8` (B/C/v9) mit `ac10e6c` (Claude R15). Alle zugewiesenen Konflikte sind gelöst, keine Konfliktmarker in den eigenen Dateien, Syntaxprüfungen und `git diff --check` grün. Kein `git add`, Commit oder Push durch diesen Agenten; kein STATUS-Eingriff, kein Server-/Shopify-/Produktimport und keine Plan-/Exceländerung.

## Ergebnis der Zusammenführung

- `repository.mjs`: native Modulquellen und physische Cacheidentität bleiben erhalten; R15-Leseepoch und kompakter Revisionsnachweis kommen hinzu. Keine Änderung an ID-Vergabe, Revisionserzeugung oder Quellen-/Planpersistierung.
- `catalog-live-orders.mjs`: synchroner Stapel mit SQLite-Snapshot und seinen Änderungs-/Schemawachen bleibt erhalten; Einzelabrufe können zusätzlich den R15-Revisionsmemo verwenden. Die öffentliche interne Methode reicht den Memo nun tatsächlich weiter. Freigabezeile und genaue Variantenbindung werden auf jedem Aufruf geprüft; der Memo speichert nur die Dokument-Prüfsumme.
- `shop-product-binding-store.mjs`: native gesperrte Lese-/Schreibphasen, `resolveMany`, Head-/Revisionswachen und Rollbacktests bleiben erhalten. Kundenlesephasen und R15-Revisionsmemo sind zusammengeführt. Im Memo-Einzelpfad wird kein großes Dokument allein für einen zusätzlichen Batch-Stempel erneut geladen; Batch-Phasen behalten ihren vollständigen Schutz. Prüfsummen-Caches speichern kleine Ableitungen, keine ganzen Kataloge.
- `http.mjs`: native Modulverwaltung und Editorvorschau zusammen mit R15-Katalogarbeiter, gzip, Kundenlesememo und öffentlicher vorbereiteter Vorschau erhalten. Beim Schließen werden sowohl Modulverwaltung als auch Arbeiter/Timer beendet.
- `shop-entry.mjs`: Suchparameter `q` bleibt erhalten; der R15-Pfad hängt vorbereitete öffentliche Vorschauen an und prüft die aktuelle Sitzung erneut innerhalb einer synchronen Kundenlesephase. Cache, Worker und Warmup wurden nicht entfernt.
- `cart-personalization.mjs`: vollständiger V1/V2/V3-Vertrag und aktuelle Modulwachen aus `0e200d8` erhalten. Der automatische Merge hätte V3 teilweise entfernt und unter anderem eine Referenz auf gelöschtes `selectedOptions` stehen gelassen. Der Diff der R15-Linie zum gemeinsamen Vorfahren enthält tatsächlich die V3-Rücknahme; deren Modulwachen waren bereits in unserer Ausgangsdatei vorhanden. Die integrierte Datei ist deshalb bytegleich zu HEAD. Keine Aktivierung einer Shopify-Preisfunktion und keine neuen Preise. Der zusätzliche Test prüft ausdrücklich den unvollständigen V3-Vertrag ohne exakte Option-Preise; er behauptet nicht mehr, jeder V3-Vertrag müsse im vereinigten Code abgelehnt werden.
- Bei den kollidierenden Testblöcken sind beide inhaltlich unterschiedlichen Prüfungen erhalten: Suche und Vorschau-Abbruch, Acryl Foto+SVG und SVG-Viewport-Normalisierung, Batchwachen und Kundenlesephasen, Suche und öffentliche Vorschaucaches.

## Tatsächliche Serverergänzungen

Die vier zusätzlichen Backend-Deltas wurden **gegen `ac10e6c`** aus dem frischen Serverpaket gelesen; Quellen unter `work/restabschluss/server13-input/app/workshop/`. Root hat bestätigt, dass diese vier Dateien auch im vollständigen 19-Dateien-Snapshot identisch sind. Der ältere lokale `6cf536f` wurde für die Laufzeitdateien nicht blind übernommen.

| Datei | Übernommenes tatsächliches Serverdelta | Erhalt unserer Ergänzungen |
|---|---|---|
| `shop-entry.mjs` | `customerUI.presentation='prio-r15'` aus der geprüften festen Produktrevision steuert den kosmetischen UI-Einstieg | Suche, Modulwachen, R15-Kundencache und öffentliche Vorschauen bleiben |
| `product-model.mjs` | expliziter Größenadapter für skalierbare rechteckige 3-mm-Acryl-Farbdruckprodukte; native Größenpreise und Gestaltung je Größe | `withProductResolutionSnapshot`, native Familienformate und Rechte bleiben |
| `batch.mjs` | skalierbare Größenpreise stammen aus der gespeicherten Größenquelle; Bericht enthält deren native Varianten; erst vollständig geprüfte Zeilen gelangen in den ausführbaren Batch | vorhandener CAS-/Import-/Updatepfad bleibt |
| `shop-preparation.mjs` | expliziter begrenzter asynchroner Laufcache für skalierbare Acrylbilder, nach Ende gelöscht | vorhandener synchroner unveränderlicher Vorbereitungssnapshot bleibt; die neue Cacheberechnung verwendet ebenfalls `withProductResolutionSnapshot` |

Reproduzierbare Vergleichsdiffs liegen unter `work/restabschluss/server-backend-diffs/`. Drei Serverdeltas wurden konfliktfrei dreiseitig eingepflegt; der Cache in `shop-preparation.mjs` wurde auf den bestehenden validierten Snapshotweg angepasst.

Zur Prüfung dieser vier Ergänzungen wurden die drei bereits vorhandenen gezielten Tests aus dem lokalen Original18-Commit übernommen: `batch-scalable-acrylic.test.mjs`, `scalable-acrylic-product.test.mjs`, `shop-preparation.run-cache.test.mjs`. Der letzte verwendet den ebenfalls übernommenen achtzeiligen Wrapper `scripts/acryl-original18/binding-cache.mjs`, der ausschließlich `withShopPreparationCache` aufruft. Keine Deploy-/Import-/Bindungsskripte aus diesem historischen Commit wurden übernommen.

## Prüfungen

**211 unterschiedliche gezielte Tests aus 15 Testdateien erfolgreich, keine abschließend offene Fehlfunktion in diesem Umfang.** Es wurde keine vollständige Repository-Suite behauptet oder ausgeführt.

| Gruppe | Tests | Nachweis |
|---|---:|---|
| Repository, synchrone Kundenlesephasen, Revisionsmemo | 34 | erster gezielter Lauf; diese drei Dateien vollständig grün |
| Warenkorb-Personalisierung/V3, Katalogfreigaben, native Bindungsspeicherung | 59 | `backend-merged-tests.txt`, vier In-Process-Dateien grün |
| Skalierbares Acrylprodukt, nativer Batch, Shop-Entry-Client | 30 | `backend-scalable-tests.txt`, drei Dateien grün |
| Vorbereitungslaufcache einschließlich originalem Check/Persist/Replay für 43 Ausführungen | 5 | `backend-run-cache-tests.txt`, 5/5 |
| Shop-Entry-HTTP, Foto/SVG-Speicherung/Fertigung, R15-Modellcache mit echten lokalen Repositoryprodukten | 83 | `backend-http-upload-tests.txt`, 83/83, 0 Fehler/Skip |

Die HTTP-/Cacheprüfungen vergleichen gespeicherte und ungespeicherte Antworten bytegenau und prüfen weiterhin Sitzung, Herkunft, Mandant, Archivierung, Publikationsstand, Freigaben, aktuelle Bindung, Optionswechsel und Revisionswechsel. SVG-Prüfungen decken unveränderte Original-/Konverterbytes, Viewport-Normalisierung, Acryl Foto+SVG samt getrennten Preisen und native Produktionsausgabe ab. Der Batch-/Binding-Umfang prüft unter anderem Revisionsmanipulation, Trigger-/Schemaänderung, parallele Produktänderung, fremde physische Quelldatenbank und Rücknahme fehlgeschlagener Änderungen.

### Aufgeklärte lokale Vorläuferfehler

1. `priced-options.mjs` fehlte zunächst wegen des **Sparse-Checkouts**, nicht wegen einer R15-Löschung. Root ergänzte die ausgeblendeten Verzeichnisse; der Blob war unverändert. Die frühe Vermutung einer Dateilöschung ist damit ausdrücklich korrigiert. Davon zu unterscheiden ist die tatsächlich im Cart-Quelldiff enthaltene V3-Rücknahme.
2. HTTP-Verbindungen und temporäre Hardlinks waren im ersten eingeschränkten Lauf lokal mit EACCES/EPERM blockiert. Der gezielte erlaubte Wiederlauf mit Test-Temp im Arbeitsverzeichnis besteht vollständig.
3. Der erste Pythonpfad enthielt nur einen Teil der vorhandenen Abhängigkeiten. Mit den bereits vorhandenen SVG-/Cairo-Abhängigkeiten besteht die vollständige Uploadprüfung; nichts wurde installiert und keine Validierung abgeschwächt.
4. Der übernommene Original18-Cachetest hatte zunächst seinen kleinen Wrapper nicht im Kandidaten. Nach dessen expliziter Übernahme bestehen alle fünf Tests.

## Reproduktion der abschließenden HTTP-/SVG-Prüfung

Im Kandidaten, Node 24.20.0. Die angegebenen bereits vorhandenen Pfade wurden verwendet:

```powershell
$env:GRAVURU_PYTHON='C:\Users\Christopher Koch\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$env:PYTHONPATH='C:\Users\Christopher Koch\Documents\Codex\2026-10-23\files-pasted-by-the-user-du\outputs\n36-20261101\python-logo;C:\Users\Christopher Koch\Documents\Codex\2026-11-09\ken\work\vendor;C:\Users\Christopher Koch\Documents\Codex\2026-10-23\files-pasted-by-the-user-du\work\pydeps'
$env:CAIROCFFI_DLL_DIRECTORIES='C:\Users\Christopher Koch\Documents\Codex\2026-10-21\https-www-google-com-url-q\work\tools\inkscape-1.4.4\inkscape\bin'
$env:TEMP=Join-Path (Get-Location).Path '../restabschluss/backend-test-temp'
$env:TMP=$env:TEMP
node --test app/workshop/shop-entry.test.mjs app/workshop/customer-vector-logo-media.test.mjs app/workshop/shop-entry-model-cache.test.mjs app/workshop/shop-entry-model-cache-real.test.mjs
```

## Vollständige bearbeitete Pfade

14 bestehende Dateien wurden geprüft/zusammengeführt; `cart-personalization.mjs` ist nach der inhaltlichen Entscheidung unverändert zu HEAD, die übrigen 13 enthalten Zusammenführungen. Vier ergänzende Dateien wurden hinzugefügt.

```text
app/workshop/repository.mjs
app/workshop/catalog-live-orders.mjs
app/workshop/shop-product-binding-store.mjs
app/workshop/shop-product-binding-store.test.mjs
app/workshop/http.mjs
app/workshop/cart-personalization.mjs
app/workshop/cart-personalization.test.mjs
app/workshop/shop-entry.mjs
app/workshop/shop-entry.test.mjs
app/workshop/shop-entry-client.test.mjs
app/workshop/customer-vector-logo-media.test.mjs
app/workshop/shop-preparation.mjs
app/workshop/batch.mjs
app/workshop/product-model.mjs
app/workshop/batch-scalable-acrylic.test.mjs (neu, vorhandener Original18-Test)
app/workshop/scalable-acrylic-product.test.mjs (neu, vorhandener Original18-Test)
app/workshop/shop-preparation.run-cache.test.mjs (neu, vorhandener Original18-Test)
scripts/acryl-original18/binding-cache.mjs (neu, vorhandener reiner Wrapper)
```

## Grenzen und nächster Schritt

Root führt die übrigen Agentenergebnisse und den kompletten 19-Dateien-Serverstand zusammen, prüft den normalen Build und staged/committet danach. Die hier geprüften lokalen Tests ersetzen weder eine serverseitige Installation noch den Shopify-Zielabgleich oder den vereinbarten vollständigen Pilot Konfigurator → Speichern → Warenkorb → Produktion. Die sieben v9-Pläne und XLSX sind in diesem Arbeitsschritt unverändert geblieben.
