# Hauptacryl: vorbereiteter Operator-Update-Adapter

Das unabhängig geprüfte lokale Paket liegt unverändert unter [ops/issue230-main-update-review-20261111](../../ops/issue230-main-update-review-20261111/README.md): **12 Dateien, 55.311 Bytes**, Manifest-SHA256 `79eb9502ad36ba793f13e69e6b47572267549e21fb64f6d4d81c747ae0f8aa98`. Der Repositorystand bei der Übernahme war `e49659f`; Appcode, v9-Pläne und Excelakten wurden dabei nicht verändert.

Der Adapter schließt die technische Lücke zwischen dem vorhandenen creation-only-Produktgruppenweg und dem identitätserhaltenden Update des Hauptprodukts. Er verwendet das bestehende native `importBatch` mit festem Importschlüssel, geprüftem Preimage, CAS, `beforeWrite`, tatsächlichem Metadatensnapshot-Hook und eindeutigem Journal-/Readback-/Replay-Nachweis. Die separate Datei heißt **Operator-Update-Review** mit eigenem `reviewHash`; sie wird nicht als nativer ProductGroup-Plan oder `planHash` ausgegeben.

**Noch nicht produktiv ausführbar:** `readiness.json` enthält `reviewHash:null` und `approvalHash:null`. Tatsächlicher Kategorien-/Ressourcen-Kopienbeleg, vollständige native Operatorbeobachtung, geprüfte private Repositoryverdrahtung und endgültiger Excel-Nachtrag mit konkretem Freigabebeleg fehlen. Der Adapter enthält keinen Host-/DB-Konstruktor, keine Live-Ausführungs-CLI und keine Shopify-, Binding-, Katalogfreigabe- oder Veröffentlichungsfunktion. Er erfindet keine Entscheidung und ersetzt keinen fehlenden Beleg durch synthetische Testdaten. Auch die sechs Kleinproduktidentitäten müssen weiterhin unabhängig aus den tatsächlichen Kandidaten geklärt werden.

Die Herkunft ist ausdrücklich der **v9-Lauf** mit der versionierten Datei `outputs/Produktplaene-230-v9/Excel-Nachtraege/Tuerschild-Acrylglas-3mm_v6.xlsx`, SHA256 `37a704d892b0f24fffdd87c7c5090652e5a949f3091dd8117ff83567e49d1429`. Die Dateiversion **v6** bezeichnet die Excelakte, nicht einen veralteten Planlauf. `origin.json` bindet sie an v9-Plan `pgp_80a0c3b9-b599-428f-8626-05e3ace880b6`, Planhash `83cd95dc900fcbc9631086f54c26591e2dbab75d285cc80fa46d64673f63bb33`. Dieser Herkunftsplan ersetzt nicht den noch zu erzeugenden konkreten Update-Review.

## Prüfung nach Übernahme

Alle zwölf Dateien wurden vor und nach der gezielten Prüfung bytegleich gegen das eingefrorene Paket und dessen Manifest verglichen. Relative Imports und die automatische Repositorywurzel funktionieren am vorgesehenen Ort ohne `GRAVURU_UPDATE_TEST_CODE_ROOT`. Es wurde ausschließlich der erste native Kopienfall nochmals ausgeführt: **1/1 grün**, erste Ausführung und identischer Replay, gleiche Produktidentität, unveränderte Quelle und fremdes Produkt. Der vorhandene synthetische Kopienbeleg blieb unverändert. Die CLI weist `execute` ausdrücklich zurück. Die vorherigen neun gezielten Tests wurden nicht vollständig wiederholt; ihr ursprünglicher Beleg und der unabhängige Review bleiben im Paket enthalten.

```sh
node --test --test-name-pattern='native copied repository: one update' ops/issue230-main-update-review-20261111/update-review.test.mjs
```

Nächster Schritt: nach dem echten Kategorienbefund den vorhandenen privaten Operator-Kontext nachweisen, daraus `observation.json` und einen konkreten Update-Review erzeugen, dann den unveränderten v9-Preisakten einen versionierten Nachtrag mit exakten Zielpins hinzufügen. Erst das konkrete Gesamtpaket erhält den tatsächlichen Freigabebeleg. Keine Preis-/Start-/Steuerentscheidung erneut anfragen; keine produktive Produktänderung aus dieser technischen Vorbereitung ableiten.
