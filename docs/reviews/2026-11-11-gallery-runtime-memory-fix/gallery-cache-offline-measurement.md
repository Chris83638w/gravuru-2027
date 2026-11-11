# Galeriecache: isolierte Messung auf Kopien

Historischer Problemstand: Runtime a038e1ae7e3de3954ea204f6925c60c7b4213d4f, Vergleich ac10e6cee00469591514dcb4fa477b0547a54c48. Die folgenden Aufrufe sind für den unabhängig geprüften Galerie-/Revisionsstempel-Fix bestimmt; dessen tatsächlich geprüften Commit zusätzlich zum Messergebnis notieren. Kein Serverlauf durch Codex.

## Belegter Grund für den ersten Neuaufbau

`app/workshop/shop-gallery-snapshot.mjs` änderte v2 zu v3 (Suchmetadaten). Der Schemawert ist Teil des HMAC. Ein gültiger v2-Cache wird daher mit dem v3-Codec verworfen. Der Cache liegt in der Tabelle `shop_gallery_cache` der vorhandenen Datenbank, nicht in einer separaten Live-Cachedatei. `shop_gallery_cache_invalid` bedeutet: Ein gespeicherter Eintrag wurde gefunden, aber abgelehnt. Der Logeintrag allein benennt keinen der einzelnen Codec-Ablehnungsgründe. Die v2/v3-Differenz erklärt hier den erwartbaren ersten Neuaufbau; ohne erfolgreichen Abschluss gibt es bei jedem Neustart erneut denselben alten Cache.

`shop-entry.mjs` startet `designGallery.warm()` beim Appstart asynchron. Der Browserbesuch ist damit bislang eine zeitliche Korrelation, kein belegter Auslöser. `shop_gallery_cache_saved` fehlt im Operatorbeleg; dies lokalisiert den Abbruch noch nicht auf Aufbau, Kodierung oder Speicherung. Native Bindungsprüfung und Galerieaufbau können davor erheblich Arbeit ausführen.

## Vorhandenes Werkzeug, kein neuer Vollhost

`scripts/shop-gallery-benchmark.mjs` existierte in ac10 und a038 identisch (Gitblob `f06b3b3cb7d0a568889e83676e430bdbf126b223`). Der beigepackte geprüfte Fix übergibt jetzt das ohnehin geladene `sourceModel` an die Galerie und misst damit den tatsächlichen öffentlichen Pfad. Es öffnet die Quelldatenbank readOnly, führt keine Appkonstruktoren/Migrationen aus, liest keine Kunden-/Bestelltabellen und hasht Quelldatei plus vorhandenes WAL vorher/nachher. Eine beschreibbare Messcachedatei muss getrennt liegen. Sein fester Testschlüssel erzeugt **keinen Cache zur Liveübernahme**.

Wichtig: Der normale CLI-Modus hält den ersten Prozess im Speicher und startet einen Kindprozess. Deshalb hier **`--restart-child` bei jedem Aufruf**: Trotz des historischen Namens bedeutet das einen einzelnen Messprozess ohne weiteren Kindprozess. Die zwei Aufrufe müssen vollständig nacheinander enden.

Vor einem Vollaufbau muss Claude den aktuellen gesamten LVE-Verbrauch und verfügbaren Spielraum prüfen. Ein separater Prozess desselben Pleskbenutzers teilt die 4-GB-Grenze mit Liveapp und Workern. Wenn kein sicherer Spielraum besteht, zunächst keinen Vollaufbau starten. Keine Heap-/LVE-Grenzen hochsetzen. Messung unter vorhandener externer Speicherüberwachung rechtzeitig beenden, bevor das gemeinsame Limit erreicht wird.

```sh
# Aus dem geprüften Fix-Runtimeverzeichnis; tatsächliche private Kopie setzen.
# Kein Originalbackup verändern; cache_db darf keines der Quelldateien sein.
copy_db='/ABSOLUTER/PFAD/ZUR/GEPRUEFTEN/KOPIE/workshop.sqlite'
measure_dir='/ABSOLUTER/PRIVATER/MESSORDNER'
cache_db="$measure_dir/gallery-v3-measure-only.sqlite"
umask 077
/usr/bin/time -v node scripts/shop-gallery-benchmark.mjs \
  --local-copy --restart-child --db "$copy_db" \
  --tenant gravuru --store acryl --shop gravuru-design.myshopify.com \
  --source-label reviewed-gallery-fix-cold --cache-db "$cache_db" \
  > "$measure_dir/cold.json" 2> "$measure_dir/cold-time.log"
# Erst nach beendetem ersten Prozess und erneut geprüftem LVE-Spielraum:
/usr/bin/time -v node scripts/shop-gallery-benchmark.mjs \
  --local-copy --restart-child --db "$copy_db" \
  --tenant gravuru --store acryl --shop gravuru-design.myshopify.com \
  --source-label reviewed-gallery-fix-reopen --cache-db "$cache_db" \
  > "$measure_dir/reopen.json" 2> "$measure_dir/reopen-time.log"
```

Der Beispielshop muss mit dem belegten Kopienscope übereinstimmen. `--legacy-single-store` ausschließlich bei tatsächlich ungescoptem Altschema ergänzen, als einzelnes Flag ohne `true`. `--doorbell-live-orders` nur bei dafür belegter bestehender Freigabe. Keine Session-/Appschlüssel ausgeben.

Ein frischer Messcache untersucht `miss → build → saved`; er enthält nicht zusätzlich den alten Live-v2-Payload. Das zweite Szenario `invalid(v2) → build → saved` umfasst außerdem das Lesen/Prüfen eines bereits vorhandenen alten Payloads. Diese Differenz ausdrücklich im Messergebnis benennen; der frische Messcache beweist nicht den exakten Peak dieses zweiten Szenarios. Der feste Testschlüssel ist zudem kein Live-HMAC-Schlüssel. Ein Test des alten Payloads darf deshalb nicht als Prüfung einer echten Live-Signatur bezeichnet werden.

**Keinen alten fehlerhaften Vollaufbau auf dem ausgelasteten Konto erzwingen.** Die Neustarts des Altversuchs sind bereits durch den Operator belegt. Zunächst den Fix messen, danach denselben abgeschlossenen Messcache in einem getrennten Prozess erneut öffnen. Falls später mit sicherer separater Kapazität ein Alt-/Neu-Vergleich sinnvoll wird, pro Runtime eine neue eigene Cachedatei und getrennte Rohmesswerte/Quellhashes verwenden.

Auswerten: `peakRssMiB` und `/usr/bin/time -v` Maximum-RSS, `activeBindings`, `measurements` mit Bindungs-/Aufbauzeiten und Kartenzahl, `lightweightProductReads`, Hashgleichheit, `saved` im ersten und `hit` im zweiten Lauf. Der aktuelle Benchmark sammelt Messereignisse bis zum Ende. Bei einem Kill fehlen seine letzten internen Phasen; `/usr/bin/time`/externe Prozessüberwachung bleiben deshalb wichtig. Es wurde hier kein Speicherbedarf auf der echten Kopie gemessen.

## Enger Korrekturkandidat

Fixed-Size- und All-Sizes-Familien haben bereits einen eigenen Produkt-/Revisionsscope und einen direkten Pfad für die ausgewählte Bindung. Der globale Warmup kann deren Varianten×Design-Kombinationen auslassen; andere Produktgruppen können diese Karten wegen des bestehenden Scopevergleichs ohnehin nicht verwenden. Der tatsächliche Aufwand ist die Summe der je Bindung ausgewählten Designlisten, nicht pauschal Gesamtvarianten×Gesamtdesigns. Der unabhängige Speicherbefund zu nativen Raw-Revisionsstempeln wird separat bearbeitet. Keiner dieser Quellbefunde allein beweist die Ursache der LVE-Neustarts; dies muss der Kopienlauf belegen.
