# Enger Nachweis: Galerie-Readstempel

## Ergebnis

Die neue Testdatei `app/workshop/shop-product-binding-gallery-memory.test.mjs` ist mit **3/3** Tests grün. Der Vergleich verwendet die echte native Repository-/OrderIntake-/ID-Registry-Tabellenstruktur mit 40 künstlichen Produktrevisionen: jeweils 2 MiB Dokumenttext und 512 KiB Metadaten. Die künstlichen Nutzdaten sind keine fachlich validierten oder freigegebenen Produkte.

Auf derselben Datenbank überschreitet der unveränderte Store aus `c6f9910` nach 24 Produkten die vorab festgelegte Grenze von 48 MiB zusätzlich gebundenem Heap: **63.085.664 Bytes**. Der Child beendet sich kontrolliert mit Exit 23. Der korrigierte Store liest alle **40 Bindungen**, Exit 0, mit maximal **183.752 Bytes** zusätzlich gebundenem Heap nach GC. Beide Leseläufe: **0 SQL-Schreibvorgänge**. Das Childbudget beträgt 128 MiB; es wurde kein Fatal-OOM provoziert.

Die Messung gilt für den tatsächlichen asynchronen `listActiveForGallery`-Pfad ohne `revisionReadScope`-Transaktion oder Customer-Memo. Gemessen wird nach jeweils acht Einträgen mit erzwungener GC; dies belegt die Speicherbindung zwischen Abschnitten. Es ist **keine** Messung sämtlicher kurzlebiger Allokationen, des absoluten RSS-Höchstwerts oder der gesamten Server-/LVE-Speichernutzung.

## Integritätsprüfungen

- Im ausdrücklich ungescopten Legacy-Schema wird eine reine Metadaten-Byteänderung (`{}` → `{ }`, semantisch gleich) zwischen Bindungen erkannt: die noch ausstehende neunte Bindung von A wird mit `shop_binding_cfg_changed` verworfen, die davor gelesenen acht A-Bindungen und alle neun B-Bindungen bleiben. Keine rückwirkende Gesamtverwerfung behauptet.
- Wird während der A-Auswertung der Dokumentinhalt von B geändert, bleiben alle neun A-Bindungen erhalten; alle neun B-Bindungen werden mit `shop_binding_active_integrity` verworfen.
- Root verantwortet ausschließlich den Runtimepatch. Die rohen Schreibstempel und Sperrprüfungen wurden von mir nicht verändert; die bereits vorhandenen 41 gezielten Store-/Batch-/ReadSnapshot-Tests wurden nicht nochmals ausgeführt.

## Dateien und Reproduktion

- Candidate: `app/workshop/shop-product-binding-gallery-memory.test.mjs` (neue einzige Repositorydatei dieses Teilauftrags).
- `work/restabschluss/gallery-memory-test.txt`: Testlauf 3/3.
- `work/restabschluss/gallery-memory-comparison.json`: vollständige Messpunkte, Exitcodes, Quell-/Testhashes und Fixturegröße.
- `work/restabschluss/compare-gallery-memory.mjs`: wiederholbarer Alt-/Neuvergleich; Belegausgabe ausschließlich in eine neue Datei (`wx`).

```powershell
node --test app/workshop/shop-product-binding-gallery-memory.test.mjs
# Von der gemeinsamen Workspacewurzel, Ergebnisziel muss neu sein:
node work/restabschluss/compare-gallery-memory.mjs work/issue230-integration-candidate work/restabschluss/gallery-memory-comparison-NEU.json
```

Der Altstand wird ausschließlich in einem neu erzeugten temporären Verzeichnis gespeichert; relative Modulimports werden auf den Candidate aufgelöst. Seine Storelogik bleibt unverändert. Der Candidate wird nicht zurückgesetzt. Beide Varianten lesen dieselbe neue künstliche SQLite-Datei; diese wird anschließend geschlossen und entfernt. Keine Server-/Shopify-/Kundendaten, keine vorhandene Belegdatei geändert. Dateien nach diesem Nachweis eingefroren, kein Commit/Staging durch diesen Agenten.
