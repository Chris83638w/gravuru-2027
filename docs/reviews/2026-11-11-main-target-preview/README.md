# Hauptacryl: identitätserhaltender Zielentwurf – nur PREVIEW

11.11.2026, Code `af6fd986c735d97bddc974261398ab8c4e88e00b`. Keine Bestätigung, kein Import, keine Ausführung, keine DB-/Shopify-/Serveränderung. Der eingefrorene v9-Stand und seine Excel-Dateien sind unverändert. Dies ist **kein neuer gespeicherter pgp-Plan und noch kein ausführungsfertiger Zielauftrag**.

## Konkretes Ziel und Ergebnis

Nach dem [Operatorbeleg #168·6806442706](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6806442706) gehören alle 808 aktiven Hauptacryl-Zuordnungen zu **`cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0`, Revision 1**, Store `acryl`, Shop `gravuru-design.myshopify.com`, Shopify-Produkt `16190784602492`. Zuordnungsrevision 1; Dokument-SHA aus dem Register `d2886e119ea9715af2b8905ebab8ecc1d199b07f8653476ce5e0fa26cd8cca79`. Kind product, draft, published_revision null, nicht archiviert. Die alte `katalog-formate-…`-Kennung ist keine SQL-Ziel-ID.

Der Entwurf benennt ausdrücklich `action: update`, diese tatsächliche cfg-ID und `expectedRevision: 1`. Der mögliche Nachfolger wäre Revision 2. Es wird **kein zweites Hauptprodukt** vorgeschlagen. Alle 808 vorhandenen Shopify-Varianten-IDs/SKUs und beide vorhandenen Bilder bleiben erhalten, H1 bleibt Hauptbild (`70116579869052`; älteres Bild `70017733919100`). Es gibt keinen Shopify-Mutationspayload; Titel, Beschreibung, Tags, DRAFT und Medien werden nicht überschrieben.

| Prüfung | Ergebnis |
|---|---:|
| Vollständig gelesene Shopify-Varianten im vorhandenen Beleg | 808 |
| Eindeutige vorhandene IDs für die v9-Hauptkombinationen | 778/778 |
| Bestehende Restvarianten, ausdrücklich erhalten | 30 |
| Zielpreise identisch zum bestätigten v9 | 778/778 |
| Ist-Shoppreis gleich v9-Sollpreis | 620 |
| Bereits bestehende Preisabweichungen | 158 |
| Betroffene Varianten der drei Beschriftungskorrekturen | 30 |
| Neue Produkte / Variantenlöschungen / Schreibaktionen | 0 / 0 / 0 |

Der Shopify-Vergleich nutzt die vollständige paginierte Lesekopie aus dem Dublettenaudit vom 11.11.2026, ca. 20:16 UTC. Sein Datei-SHA lautet `1b20158a9ac14b755f900d80abb396afabebd3a43b7de173f0426fc622452ae4`. Die einzelnen Seitenzeiten stehen in `variant-mapping.preview.json`. Dieser Beleg ist vollständig für diese 808 Varianten, aber **kein frischer Ausführungsbeleg**.

## Drei gezielte Beschriftungskorrekturen

| Format / Maße mm | Formatkennung (Schwarz; Farbvariante Anthrazit bleibt erhalten) | Bisher | Ziel |
|---|---|---|---|
| Rechteck 70 × 23,3 | TS-Acryl-RE-70X23P3-T30-SW | 7 × 2 cm | 7 × 2,33 cm |
| Rechteck 80 × 53,3 | TS-Acryl-RE-80X53P3-T30-SW | 8 × 5 cm | 8 × 5,33 cm |
| Abgerundet 80 × 53,3 | TS-Acryl-AB-80X53P3-T30-SW | 8 × 5 cm | 8 × 5,33 cm |

Pro Format ändern sich nur `familyFormats.formats[].label` und das entsprechende Größenauswahl-Label. Das sind **sechs Textfelder**, keine Änderung an Geometrie, Design, Preisen, Größen-IDs, Modulen oder Ressourcen. Schwarz und Anthrazit werden je durch eine gemeinsame Größenauswahl mit separater Farbwahl abgedeckt: jeweils zehn Varianten, insgesamt 30. Vollständige exakte Variant-IDs und Ist-/Zieltexte stehen in `label-changes.json`.

Die korrekten Maße stehen bereits in Original-Excel und Geometrie; [Chris bestätigte 7 × 2,33 ausdrücklich](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6768539445). Herkunft und alle drei Zuordnungen sind im vorausgehenden `main-acryl-7x2-audit.md` belegt. Hier wird keine neue Größe, Designvorlage oder Geschäftsregel gewählt.

**Die beiden nativen Dokumenthash-Verfahren sind verschieden und dürfen nicht vertauscht werden.** Produktgruppen sortieren Objektschlüssel beim Aufbau und verwenden anschließend `JSON.stringify`; dabei stehen ganzzahlige Schlüsselnamen wieder in JavaScripts numerischer Reihenfolge. ID-Bindungen erzeugen dagegen rekursiv einen JSON-String mit streng lexikalisch sortierten Schlüsseln. Im echten Dokument betrifft diese Unterscheidung 49 Objekte mit numerischen Font-Schlüsseln. Beide Verfahren bleiben unverändert.

- v9-**Produktgruppen**-Dokumenthash: `746f682929262b9a127a8d0613155dfba790ca57c524d027aa99797c5b40e3f8`.
- v9-**ID-Binding**-Dokumenthash: `d75c917483a5ddedd380ac48c02c4ec3aea36b46f688557b8b9769fc5536eda2`.
- Ziel-**Produktgruppen**-Dokumenthash: `2da2130230341917f7a99d2a12889c1e2f10e408f64d3532e9c5ea6bae65713c`.
- Ziel-**ID-Binding**-Dokumenthash: **`deb2ce71bf57d5ff85e5f186378d94f58edeecc1ce4d7c4151bebf6e8072886f`**.
- Exakt serialisiertes Transport-JSON (hier Produktgruppen-Reihenfolge): `2da2130230341917f7a99d2a12889c1e2f10e408f64d3532e9c5ea6bae65713c`.
- Gzip-Datei: `6b2d5989b1dd4859f4a6923faab2cbf9f25102f1f3e95edd77dad48b386c52cc`.

Der Operator-Rev1-Wert `d2886e…cca79` ist ausdrücklich ein **ID-Binding-Hash** und ist nur mit demselben Stringverfahren nachzurechnen. Der Katalogfreigabe-Hash ist ein drittes Verfahren: SHA der tatsächlich in SQL gespeicherten JSON-Bytes. Ein Transporthash ersetzt ihn nicht. Der unabhängige Review entdeckte die zuvor ungenaue gemeinsame Hashbenennung; die Benennung und zusätzlichen Binding-Hashes wurden korrigiert, **Dokument- und Transportbytes blieben unverändert**.

Der Hash des ursprünglichen v9-Plans bleibt `83cd95dc900fcbc9631086f54c26591e2dbab75d285cc80fa46d64673f63bb33` (`pgp_80a0c3b9-b599-428f-8626-05e3ace880b6`). Er wird **nicht** als Hash des geänderten Zieldokuments ausgegeben. Die importierte innere `config.profile`-Kennung/-Revision bleibt Quellprovenienz; der native HTTP-Modellweg setzt die reale cfg-ID, Bindung und SQL-Revision anschließend selbst (`http.mjs:322–324`).

## Vollständiger Preisabgleich

Alle 158 Abweichungen sind bereits im gelesenen Shopify-Iststand vorhanden:

- **138 × B02S:** Shoppreis jeweils 30 Cent höher als v9 (alter Aufpreis 299 statt bestätigter 269 Cent).
- **20 × B04S:** Shoppreis jeweils 10 Cent höher als v9 (alter Aufpreis 339 statt bestätigter 329 Cent).

Die vollständige Delta-Tabelle mit Variant-ID, SKU, Ist-/Sollpreis und Differenz liegt als `existing-price-differences.json` und `.csv` vor. Keine zusätzliche Preisformel: sämtliche 778 Zielpreise wurden mit der nativen `prepareShopProduct`-Berechnung gegen die gespeicherte v9-Variantenprüfung verglichen. Alle stimmen. Die dreißig nicht im v9-Hauptprodukt geplanten Kleinformat-Varianten werden mit ihrem Istpreis lediglich erhalten; daraus wird kein neuer Sollpreis abgeleitet.

Die [Preisentscheidung vom 10.11.](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6766806272) gilt unverändert; Grund- und Aufpreise sind [bestätigt brutto inkl. 19 % MwSt.](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6804508025). Staffel 5/10/15 % ab 3/5/10, vollständiger Stückpreis, bleibt v9-identisch. Steuerbeleg bleibt in externer Entscheidungsdokumentation; kein unerlaubtes Konfigurationsfeld wurde ergänzt.

Beschriftungskorrektur und Preisabgleich sind getrennt ausgewiesen. Die spätere native Zuordnungsplanung prüft den **frischen Shopify-Preis exakt** gegen den nativen Stückpreis (`shop-product-binding-plan.mjs:186`): Mit den derzeit belegten 158 Abweichungen kann sie diese 158 Varianten nicht auf den v9-Stand umstellen. Das verlangt Umsetzung bereits bestätigter Preise im späteren autorisierten Zielablauf, keine neue Preisentscheidung und keine Abschwächung des Guards.

## Alte Bindungen und neue Revision

Eine Dokumentrevision 2 allein schaltet **keine** der 808 Zuordnungen um. `resolve()`/`resolveMany()` lesen die im aktiven Zuordnungskopf gepinnte cfg-Revision und prüfen deren SHA und feste Bindung. `productRow(..., requireHead=false)` erlaubt dabei ausdrücklich historische Revisionen; aktueller Archivzustand/Art und Status der gespeicherten Revision bleiben überprüft. Das vorhandene Testbeispiel `shop-product-binding-store.test.mjs:117` beweist diesen Vertrag nach `repository.save`; `:178` zeigt den expliziten anschließenden Wechsel.

Erst die getrennte neue native Zuordnung verlangt den **aktuellen** Produktkopf, vollständige echte Optionen, passenden Preis, frischen Shopify-Beleg und erwartete bisherige Zuordnungsrevision. `persist()` prüft erneut unter Schreibsperre (`shop-product-binding-store.mjs:242–258,285`). Bei Erfolg entstehen neue feste Bindungen und Zuordnungsrevisionen, historische Bindungs-IDs bleiben erhalten. Es ist somit falsch, „alle IDs erhalten“ als Wiederverwendung einer alten **Binding-ID für einen anderen Dokumentstand** auszulegen: Produkt-ID und Shopify-Varianten-IDs bleiben gleich; eine neue Revisionsbindung erhält eine neue Binding-ID. Nichts davon wurde hier ausgeführt.

Nach einer später ausdrücklich geplanten Teilumstellung können 778 Zuordnungen auf Revision 2 und die 30 übrigen weiter auf Revision 1 zeigen. **Keine Löschfreigabe und keine automatische Neuverbindung** für die 30 Restvarianten. Bestehende Sitzungen der umgestellten 778 Varianten werden durch den frischen Revisions-/Binding-/Zuordnungskopfvergleich zur Wiederöffnung aufgefordert (`shop-entry.mjs:175–178`); alte bestellte Stände bleiben unverändert.

Öffentlicher Kundenweg und Bestellung sind zusätzlich versionsgebunden freigegeben (`catalog-live-orders.mjs`, `shop-entry.mjs:127–143`). Eine alte Freigabe gilt nicht automatisch für Revision 2; die 30 alten Bindungen verlieren durch einen neuen Kopf allein jedoch nicht ihre vorhandene, falls überhaupt erteilte Revision-1-Freigabe. DRAFT/Zuordnung ist weder Veröffentlichung noch Produktionsabnahme. Diese Vorschau erteilt keine Freigabe.

## Noch zu belegende Zielanschlüsse

Die native lokale Validierung und Preis-/Optionsprüfung sind grün. **Serververgleich noch offen:** aktuelles Rev1-Dokument/Metadaten, die 808 tatsächlichen nativen Options-/Binding-/Preisverträge und reale Profilauflösung auf Claudes gesicherter DB-Kopie. Siehe `operator-readonly-check.md`. Der lokale Modulprofil-Pin ist kein Nachweis seiner Existenz im Serverregister. Das Hauptdokument erbt vier Ressourcenprofile; Serverdefaults könnten von der lokalen, ungebundenen v9-Auflösung abweichen. Ein eventuell vorhandenes tatsächliches Fertigungsprofil darf nicht durch Übernahme des lokalen null-Stands still entfernt werden.

Der minimale Rückbeleg enthält nur IDs, Revisionen, Hashes, Counts und konkrete Options-/Preisdifferenzen; vollständige Serverdokumente bleiben beim Operator. Ein abweichendes reales Profil oder notwendiger Erhalt tatsächlicher Metadaten kann einen weiteren **ausgewiesenen** Zielentwurf/Hash erfordern. Keine stillen Änderungen am vorliegenden oder eingefrorenen v9-Dokument.

## Reproduktion und Dateien

`node --max-old-space-size=4096 work/restabschluss/main-target-preview/build-preview.mjs WORKSPACE ISOLIERTER_AUSGABEORDNER`

Der Builder verlangt den genannten Code-Commit, liest v9 und die bereits gespeicherte vollständige Shopify-Lesekopie. Er konstruiert keine Repository-/Profil-/DB-Instanz, öffnet keine Verbindung und ruft keine Schreib-API auf. Native Validatoren und Shopvorbereitung laufen ausschließlich im Speicher. Fünf eingefrorene v9-Dateihashes werden vor/nachher verglichen. Der inverse Sechsfeld-Patch ergibt wieder exakt den ursprünglichen kompilierten Dokumenthash. Keine breite Testsuite wiederholt.

`verification.json` enthält diese Prüfresultate; `native-preparation.preview.json` die 778 nativ berechneten Varianten. `update-intent.preview.json` ist absichtlich kein direkt ausführbarer Importpayload. `variant-mapping.preview.json` enthält die vollständige 778+30-Zuordnung. Das neue große `target-document.preview.json.gz` ist rein lokal; für Git genügt die kompakte Sechsfeldänderung plus Fingerprints und der bereits vorhandene v9-Transport. `materialize-label-preview.mjs` erzeugt daraus bei Bedarf ausschließlich eine neue Vorschau-Datei und bricht bei abweichendem Eingangshash ab.

Die kompakte Git-Lieferung enthält `variant-mapping.preview.json.gz` als verlustfrei komprimierte Fassung der Zuordnung; vor dem privaten Vergleich lokal entpacken. `native-preparation.preview.json` und das vollständige Zielmodell bleiben im lokalen Prüfverzeichnis. `materialization-check.json` belegt, dass der kleine Dateihelfer aus dem eingefrorenen Plan genau dasselbe in Produktgruppen-Reihenfolge serialisierte Zieldokument erzeugt und **beide** nativen Dokumenthashes prüft. Die spätere native Speicherung kann Objektfelder umsortieren; der Hash der tatsächlichen gespeicherten JSON-Bytes wird deshalb erneut aus dem Zielregister gelesen und nicht aus einem Transporthash abgeleitet.
