# Hauptacryl: unabhängiger Empfangs- und Inhaltsreview der Preisbelege

12.11.2026 · `product_plans` · Quellen: Gitstand `b0172a0b`, [Claudes Kommentar #168/6820787259](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6820787259), lokal `claude-b0172a0b-price/ops/plesk/hauptacryl-preisvertrag-20261112`. Nur gelieferte Dateien gelesen und Hashes/Zuordnungen berechnet. Kein Operator-Skript ausgeführt, keine Datenbank geöffnet, kein neuer Kopienlauf, keine Shopify-Abfrage oder Mutation.

**Inhaltlich passend: 808 Varianten, davon 778 Ziel und 30 zu erhalten; alle 114 einzelnen normalisierten R1-Vertragshashes stimmen.** Zwei Nachweisgrenzen bleiben ausdrücklich: CSV-Zeilenenden unterscheiden sich vom gelieferten Prüfsummenmanifest; der zusätzlich berichtete Gruppen-Sammelhash hat noch keine gelieferte Serialisierungsdefinition. Die heute aktive Function-/App-Version ist weiterhin nicht nachgewiesen.

## Empfangene Dateien und Hashgrenze

`SHA256SUMS.txt` nennt sieben Dateien. Sechs davon sind bytegenau passend. Die einzige Abweichung ist vollständig auf Zeilenenden zurückgeführt, ohne die Quelle zu verändern:

| Datei/Stand | Bytes | SHA256 |
|---|---:|---|
| Tatsächlich geliefertes `personalization.value.json` | 18.108 | `7c997f49153d43a937a75501ed5bc016eda1003e129d1735528b801ee7962cf5` |
| Tatsächlich gelieferte `varianten-808.csv`, 809 CRLF | 62.716 | `4c9cb98aa8c9ce7ec40b546a7b9b9164af6967ce6bdbf04b5b92922e0f36ae9c` |
| Nur im Speicher CRLF→LF normalisierte CSV | 61.907 | `9dae07a58e158a7de011cfc28a7756402a72f961838d4b231ea8ea7031103da8` |

Der letzte Hash ist exakt der Manifestwert. **Nicht „alle sieben Dateien bytegleich“ behaupten.** Die unabhängige Prüfung gibt `allManifestByteHashesMatch:false` aus und führt die Zeilenendenaufklärung getrennt. Sie behauptet nicht, an welchem Transport-/Git-Schritt die Zeilenenden geändert wurden.

## Vollständiger Varianten- und Preisabgleich

Die eingefrorene Matrix wurde anhand beider Pins geprüft: gzip `3d0647b2cb671ba09199b6f9c4b9cdbfa58f24a0eafb1d2d672a18823070c9bf`, entpackte JSON-Bytes `3d476d9d964158c1f96a9e55b5de5a2cfa36afd8b5d3bcd86313c12be2c77591`.

- 808 eindeutige IDs; disjunkte Zuordnung 778 Ziel / 30 Rest.
- Alle CSV-IDs, SKUs, Gruppen und Preis-/Änderungsspalten stimmen mit der Matrix: aktueller Shoppreis = gelieferter R1-Bindungspreis = gelieferter R1-Vertragsgrundpreis. Alle 778 Zielpreise sind unverändert die geprüften Sollpreise; bei den 30 Restzeilen steht kein neuer Zielpreis.
- `pv-varianten.json` enthält exakt dieselben 778/30 Zeilen. Das rohe Metafeld enthält exakt alle 808 numerischen Varianten-IDs mit ihren aktuellen Preisen.
- SHA256 über lexikalisch sortierte `id:cents`-Zeilen, mit LF verbunden und ohne abschließendes LF: `ce5fa7aec81a1be8b6a9ec3dbe116589d4a471d6a4640dc2c33a6bdaa654962f`, exakt der veröffentlichte Wert.
- 620 der 778 Zielpreise sind gleich. 158 bekannte Abweichungen: **138 B02S liegen aktuell 30 Cent über Soll; 20 B04S liegen 10 Cent über Soll.** Die restlichen 30 Varianten bleiben unverändert. Keine neuen oder abweichenden Preise gefunden.
- Die unabhängige Matrix enthält weiterhin 30 Labelkorrekturen, sechs Überschneidungen mit Preisänderungen und damit 182 unterschiedliche zu bearbeitende Varianten.

Das ist ein vollständiger Abgleich der **gelieferten** CSV-/Metafeld-/Mappingwerte. Die im Kommentar erwähnte vollständige Admin-Antwort `variants.json` wurde nicht mitgeliefert; deren rohe Zeilen, Positionen und Zeitstempel wurden hier nicht unabhängig geprüft.

## R1-Verträge: tatsächlich rekonstruierbarer Nachweis

Für jede der 114 Gruppen wurde aus der gelieferten Vertragsform und ihrem konkreten `baseCents` das normalisierte Dokument gebildet. Das Verfahren entspricht ausdrücklich `pv-vertraege.mjs:13–14`: rekursiv sortierte Objekte → `JSON.stringify` → SHA256. Es ist nicht das anders implementierte native ID-Binding-Hashverfahren.

**114/114 Einzelhashes passen**, und jede Gruppenanzahl wurde unabhängig aus den 808 Mapping-/CSV-Preisen nachgezählt: insgesamt 778 Ziel / 30 Rest, 110 unterschiedliche Ziel-Grundpreise und zehn unterschiedliche Rest-Grundpreise, zusammen 114 verschiedene Preise. Die Vertragsform passt zur tatsächlichen internen Ausgabe von `capturePersonalization()` (`app/workshop/cart-personalization.mjs:62–67`): Produkt-ID, Revision als Zeichenkette `"1"`, Grundpreis, Motiv 169, Foto 0, Staffel 3/5/10 → 5/10/15 Prozent, `complete-unit`; kein Schemafeld, Logoaufschlag oder Modulpin.

Der im Kommentar genannte zusätzliche Aggregatwert `d4467e5c22eae26e9653a4b7ca6eaa424ca83d004ee69ab17827798a1e68fa23` ist **noch nicht unabhängig bestätigt**. Weder gelieferter Treiber noch Gruppendatei definieren seinen exakten Ausdruck. Ein bloßes sortiertes `hash:Anzahl`-LF-Format ergibt einen anderen Wert. Die 114 Einzelhashes und sämtliche Anzahlen sind unabhängig gesichert; die fehlende Aggregatdefinition ist deshalb eine Benennungs-/Nachweisgrenze und kein festgestellter Preiswiderspruch. Kein neuer Serverlauf dafür erforderlich.

## Provenienz sauber getrennt

| Unterlage | Tatsächlich verfügbar und geprüft |
|---|---|
| Rohes `$app.personalization` | Bytegenau anhand veröffentlichtem SHA geprüft. V1, enabled, Revision 1, EUR, 808 Preise, Motiv 169, Foto 0, Staffel wie oben. Keine Felder `extraLogoCents`, `history`, `legacyOffers`, `optionPrices`. |
| `app-personalization-lesebeleg.json` | 2.491-Byte-Abschrift; ihr Schema sagt dies ausdrücklich. Die darin genannten App-/Produkt-/Namespacewerte sind untereinander konsistent: App `423276544001`, Namespace `app--423276544001`, Produkt `16190784602492`, DRAFT, Metafeld `200717188759932`, compareDigest `66b0aa6d8ab008aa31bc3ab39cec8d10760061bab055c3d990e74b882ed6500d`. Kein bytegleicher Export des ursprünglichen Server-Lesebelegs; dessen berichteter SHA `92830db0…68e74` ist ein anderer. |
| `r1-preisvertraege-gruppen.json` und CSV | Kompakte abgeleitete/re-konstruierbare Darstellung, mit vollständigem Preis-/Gruppenabgleich wie oben. Keine 808 vollständigen SQL-Originalrecords. |
| Serverdatei `hauptacryl-r1-preisvertraege.json` | **Nicht geliefert.** Laut Kommentar 324.505 Bytes, SHA `b21a91b1111745a365fb3194e5098f2b9820f200b0caaf1380c1d5589a13b861`. Bindungs-UUIDs, tatsächliche Kopfzeilen, Datenbankbytes und der dortige komplette Zeilenhash sind deshalb in diesem Empfangsreview nicht unabhängig rückrechenbar. Die Aussage „genau eine Bindung/Kopf R1 pro Variante“ bleibt hier ein Operatorbefund, konsistent mit der Kompaktdarstellung. |

Der gelesene `pv-vertraege.mjs` öffnet die bezeichnete Sicherung lesend/immutable und erzeugt einen separaten lokalen Bericht; er wurde hier nicht ausgeführt. Er ist ein Bestandsaudit, kein wiederverwendbarer Schreibprovider: seine Kopfauflösung enthält einen Fallback auf eine vorhandene Bindung. Für künftiges Persistieren müssen deshalb weiterhin der tatsächliche native Registrykopf und `bindingPricing` frisch verwendet werden; die kompakte Gruppen-/CSV-Rekonstruktion darf diese nicht ersetzen.

## Function- und Ausführungsgrenze

Die gelieferte Abschrift nennt Function `01a0e45d-c47f-70b9-9d5a-a2c72120ae01` und CartTransform `172523900` mit derselben Function-ID. Das belegt in dieser Unterlage nur die berichtete Admin-Identität. Es belegt **nicht**, dass die historische App-Version `1199363391489` heute aktiv ist, welche Extension-/WASM-Fassung sie enthält oder dass die andersartige Extension-UID `3194be17…` damit übereinstimmt. Die Admin-Function-ID allein genügt nicht als aktueller Nachweis für `pricing-history`/Foto-/Logo-Abrechnung.

Für den Main-R2-Anschluss bestätigt der Befund die bisherige Richtung: heutiger Shop-/R1-Vertrag ohne Foto-/Logoaufschläge darf nicht für die bestätigten neuen 999/1299-Cent-Funktionen verwendet werden. Die 30 Restbindungen behalten ihren ursprünglichen R1-Vertrag. Der neue V2-Operator des Autorenagents und seine aktuelle Function-/Providerverdrahtung benötigen ihren eigenen Abschlussreview; dieses Dokument genehmigt weder neue immutable Bindungen noch Metafeld-/Preis-/Shopänderungen.

## Reproduktion und Ergebnisdateien

`review-main-pricing-records.mjs` liest nur die genannten lokalen Dateien; keine nativen DB-Konstruktoren, keine Netzwerkaufrufe und keine Treiberausführung. Aufruf mit einem **neuen** Ausgabepfad:

```text
node work/restabschluss/review-main-pricing-records.mjs <gelieferter-Paketordner> <gepinntes-variant-mapping.preview.json.gz> <neue-Pruefdatei.json>
```

Finaler Lauf Exit 0, 18/18 explizite Prüfungen einschließlich Zeilenendenaufklärung. Ergebnis `main-pricing-records-independent-checks-v2.json`, SHA256 `70666086046530970ecaae20a814ae9ddefb4d3c6bf4ad36114fc40b01081ccb`. Der erste strikte Lauf `main-pricing-records-independent-checks.json` bleibt als Beleg des erkannten CSV-Bytefehlers erhalten; er wird nicht als grüner Gesamtcheck umgedeutet. Keine Quelldatei wurde verändert.
