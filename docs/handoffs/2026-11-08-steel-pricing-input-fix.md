# Edelstahl: fehlenden Logo-Aufpreis vollständig erhaltend korrigieren

Basis `3a780000d44ae6f6671d8560c5b9ff919738ac91`, isolierter Branch `dev/mika-steel-pricing-input-fix-20261108`. Kein UI-/Text-/Produkt-/DB-Umbau. Nutzerauftrag: Warenkorb mit Formen, Größen, Befestigung und SVG-Logo prüfen; bestätigte Logo-Regel 12,99 €; freigegebener Konfi-Aufbau unverändert. Parent führt Veröffentlichungen aus; dieser Arbeitsstand ist Vorbereitung, kein Live-Erfolgsnachweis.

## Ursache und Belege

Realer Parent-Test: Retro 2, 90×60 mm, B02, Variante `58104613339516`, Grundpreis mit Befestigung 17,48 €, plus ein Logo 12,99 € = 30,47 €. Editor/gesicherter Entwurf korrekt, Shopify lieferte 17,48 €. Keine V3-Inkompatibilität: aktueller Edelstahl-Vertrag ist V2 und die installierte Backend-Arithmetik verarbeitet ihn korrekt.

Eigenes App-Metafeld `personalization` an Produkt `16190784438652`: **18.557 UTF-8-Bytes**, SHA256 `76012d418f5c82b8f7c0c8339a0441f3fe41286aa903d287d84f00d169daf1ed`. Aktuell V2/Revision 2 mit 404 Preisen; History V1/Revision 1 mit derselben vollständigen Tabelle. Shopify Functions liefern Metafelder oberhalb **10.000 Bytes nicht an die Funktion**, obwohl der Admin-Read sie zurückgibt. Bisheriges `if (!pricing?.enabled) continue` ließ deshalb den nativen Variantenpreis ohne Logo stehen. Quelle: [Shopify Metafield limits](https://shopify.dev/docs/apps/build/metafields/metafield-limits).

## Enger Fix

`pricing-history.mjs` löst `variantsFromRevision: 2` in der historischen Revision auf. Keine Referenz auf einen veränderlichen Begriff wie „current“. Historische Zähler, Zuschläge, Mengenstaffeln, Legacy-Angebote und sämtliche Variantenpreise bleiben vollständig erhalten. Fehlender Preisvertrag bei einer personalisierten Zeile wird ausdrücklich abgewiesen; normale Zeilen ohne Personalisierung bleiben unverändert.

`pricing-storage.mjs` entfernt ausschließlich exakt gleiche Variantentabellen aus historischen Einträgen und verweist auf eine konkrete vollständige Revision. Ungleiche Tabellen werden nie zusammengelegt. Jede neue Veröffentlichung durch `encodeFunctionPricing` prüft die tatsächlichen UTF-8-Bytes und verweigert >10.000. Neue Revisionen mit geänderten Preisen müssen weiter vollständig passen oder eine separate gezielte Speicherlösung erhalten; keine alten Preise löschen.

Die vorhandenen Autoritätsquellen für Edelstahl-Preise sind die bereits bestätigten 404 Shopify-Bindungen/Preisverträge. Die Korrektur ändert keine Preise, Optionen, Freigaben oder Bestellstände. `legacyOffers` ist kein Ersatz: es akzeptiert nur vorvertragliche Zeilen ohne die heutigen Personalisierungsattribute und wäre für vorhandene V1-Zeilen falsch.

Im Repository gibt es keinen allgemeinen Edelstahl-Metafeld-Publisher. Der vorhandene `native-update-runner-v2.mjs` liest diesen Vertrag nur. Die neue enge CAS-Schreibstrecke verwendet den Encoder verbindlich. Künftige Produkt-/Sync-Publisher müssen diesen Encoder statt eines direkten `JSON.stringify(pricing)` verwenden; das wurde nicht fälschlich als bereits systemweit ausgerollt dargestellt. Bestehende Schiefer-Betriebshelfer wurden nicht geändert.

## Build und Prüfung

Der veröffentlichte V1/V2-Einstieg wird aus `1c3c61f` übernommen; nur `pricing-history.mjs` ersetzt. Der vorbereitete V3-Einstieg des neueren Repos wird nicht in diesen Fix hineingemischt. CLI 4.9.0 und vorhandene Dependencies bleiben unverändert.

- Isoliertes Compilerprojekt: `work/shopify-compiler-20261105/steel-pricing-input-20261108/project` (außerhalb Repo).
- WASM: 13.428 Bytes, SHA256 `dad74c5d38ac291e739aa184862e5c751207be3104fb6ddbead1bbf9440ae401`.
- Gezielte Node-Tests: Preis-/History-/404er-/CAS-/Rollback-/Modulerhalt-Prüfungen; vollständige aktuelle Testergebnisse im Übergabe-Commit.
- WASM-Test mit drei gemischten Stahlzeilen und 404 Preisen: 6.016.219 Instruktionen, 29.055 Inputbytes, Preise exakt; normale Zeile unverändert; fehlender Preisvertrag und ungültige Referenz abgewiesen.
- Kompilierte synthetische Prüfungen ersetzen keinen anschließenden echten Warenkorbtest.

## App-Versionen vollständig erhalten

Aktive Baseline: `gravuru-2027-issue139-pricing-20261102-v1`, ID `1191284113409`. Inaktive V3-Version bleibt unberührt. Aktive App hat acht Remote-Module, einschließlich Theme `gravuru-storefront` UID `a4d6506c-8e89-ca7d-f5b1-1a0d1e00a1f9bb93e76a`; Function UID `3194be17-ee65-e144-e1da-65b8d1e1720183f0f9ef`. Cart-Transform-Zuordnung/Function-ID werden nicht neu angelegt.

1. Parent lädt das fixierte WASM als **nicht freizugebende** Artefaktversion `gravuru-2027-steel-pricing-input-artifact-20261108` mit `--no-release --no-build` hoch. Dieser unvollständige Zwischenstand enthält nicht alle Module und darf niemals veröffentlicht werden.
2. `stage-steel-pricing-preserved.mjs --mode plan` liest aktive Version und Artefakt. Es kopiert alle aktiven Module und ersetzt nur Function `module_id` und `module_metadata`. Die leere Locale-Ausgabe des isolierten Compilers wird verworfen; aktive Übersetzungen bleiben erhalten. Abfrage, API, Scopes, Proxy, URLs, Theme-Dateien und alle übrigen Einstellungen müssen exakt gleich bleiben.
3. `--mode stage --commit <geprüfter Commit>` erstellt nur den vollständigen inaktiven Kandidaten `gravuru-2027-steel-pricing-input-20261108-v1`. Readback vergleicht sämtliche Module, danach nochmals die unveränderte aktive Baseline. Veröffentlichung separat durch Parent.

Readonly-Plan nach tatsächlichem API-Abruf: 8 Module, 7 vollständig unverändert. Vorherfingerprint `ebe98678dad91440c35513a09ae50ab7a1c487be265cda75d303bab66f44e47e`; Vorschlag `faa0b47b79c4e9fabe1df4c3eb0e3f4cce45ed9b867f292a7f1604a3a0ca0616`. Bis hier kein Deploy durch diesen Agenten.

## Metafeld: Backup, CAS, Rückweg

`ops/plesk/repair-steel-pricing-input.mjs` ist ohne Modus nur lesend. Fixiert auf eigene App, API 2026-07, Shop, Produkt und den oben genannten Vorher-SHA. `--mode apply` erfordert bestätigten Function-Release und privaten Backupordner (0700). Vor genau einer `metafieldsSet`-Mutation mit frischem `compareDigest` wird das Originalmetafeld bytegenau als 0600-Datei geschrieben und zurückgelesen. Kein automatischer Wiederholungsversuch bei Konflikt; Rücklesen nach Mutation. Keine Original- oder Kundendaten ins Repo.

Erst kompatible vollständige Function veröffentlichen, dann Metafeld-CAS. In der Zwischenphase lehnt die neue Funktion den zu großen Vertrag ab, statt zu billig zu verkaufen. Danach echter Warenkorbtest mit neuer Logo-Zeile sowie bestehenden Zeilen; Mengenänderung separat prüfen.

`--mode restore --backup-file <private Originaldatei>` stellt nur bei exakt unverändertem repariertem Feld den Originalrohtext mit neuer Sicherung/CAS wieder her. **Das Original ist zu groß und war fehlerhaft:** mit der korrigierten Function bleibt der personalisierte Checkout dann gesperrt. Das ist ein Datenrückweg, keine Verkaufsfreigabe. Alte App-Version erst nach bewusster Prüfung wieder freigeben; sonst kehrt der stille Aufpreisfehler zurück. Niemals Datenbanken/Bestellstände zurückkopieren.

Standalone-CAS-Bundle außerhalb Repo: `outputs/steel-shopify-20261108/repair-steel-pricing-input.bundle.mjs`, SHA256 `f51f4c4d16c45a03cdcd0148a87d9b75fcb18f74961668b5a88df784b4197bd8`, 9.972 Bytes; Deflate-Base64 5.224 Zeichen. Zugang nur als bestehender privater Dateipfad, nicht im Befehl ausgeben. Aktuellen Hash vor Übertragung erneut prüfen.
