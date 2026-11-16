# Unabhängiger Review des Hauptacryl-Zielentwurfs

11.11.2026. Ausschließlich gelesen bzw. im Speicher nachgerechnet; keine App-/Test-/Produkt-/Servermutation, kein Builder/Materializer ausgeführt. Reviewumfang: README, Update-Intent, Verification, Materializer, Operator-Leseauftrag sowie zugehörige Mapping-/Preis-/Labelbelege und deren v9-/Shop-Lesekopie.

## Tatsächlicher Befund vor Korrektur

Die anfängliche Behauptung, der Produktgruppen- und ID-Binding-Hash seien dasselbe Verfahren, ist für diese echten Dokumente falsch. `product-group-templates.mjs` sortiert Objektfelder und serialisiert anschließend mit `JSON.stringify`; `shop-product-binding-plan.mjs`/`shop-product-binding-store.mjs` erzeugen einen rekursiv lexikalisch sortierten JSON-String. `JSON.stringify` ordnet integerartige Schlüssel nochmals numerisch. In den vorliegenden Dokumenten sind 49 Objekte mit solchen Schlüsseln enthalten, insbesondere Fontdaten.

| Dokument | Produktgruppen-Verfahren | ID-Binding-Verfahren |
|---|---|---|
| Eingefrorenes v9-Kompilat | `746f682929262b9a127a8d0613155dfba790ca57c524d027aa99797c5b40e3f8` | `d75c917483a5ddedd380ac48c02c4ec3aea36b46f688557b8b9769fc5536eda2` |
| Ziel nach sechs Labeländerungen | `2da2130230341917f7a99d2a12889c1e2f10e408f64d3532e9c5ea6bae65713c` | `deb2ce71bf57d5ff85e5f186378d94f58edeecc1ce4d7c4151bebf6e8072886f` |

Diese Werte wurden unabhängig über die vollständigen vorhandenen Dokumente berechnet, ohne deren Ressourcen auszugeben. Der Registry-Rev1-Hash `d2886e…` gehört zum ID-Binding-Verfahren. Die tatsächlichen gespeicherten SQL-JSON-Bytes bilden daneben ein drittes, gesondertes Verfahren für `catalog-live-orders.mjs`; der lokale Transportbytehash belegt keine zukünftigen SQL-Bytes. Root und Paketautor vor Veröffentlichung informiert. Korrektur-Nachprüfung folgt unten.

## Unabhängig bestätigter Umfang

- Vollständige lokale Shop-Lesekopie gehasht und mit dem Mappingpin verglichen. Alle **808 IDs eindeutig**, genau dieselbe ID-Menge in **778 Zuordnungen + 30 Restvarianten**, disjunkt und vollständig. SKU/aktuelle Shopify-Optionen stimmen je Zeile. Alle 30 Restobjekte entsprechen der Lesekopie vollständig einschließlich Preis/Optionen und tragen ausdrücklich `proposedDeletion:false`.
- Alle **778 Zielpreise** und Optionskombinationen gegen den echten eingefrorenen v9-`variantReview` sowie die native Vorbereitung verglichen; Maße ebenfalls gleich. **620** Istpreise stimmen bereits; exakt **138 B02S × +30 Cent** und **20 B04S × +10 Cent** erklären alle **158** Abweichungen. Delta-Tabelle vollständig mit dem Mapping verglichen. Das sind bestehende Abweichungen im Shopbeleg, keine durch die Vorschau ausgeführten Preisänderungen.
- Genau sechs Textfelder, 30 betroffene Varianten. Rücknahme dieser sechs Labeländerungen ergibt wieder exakt den eingefrorenen v9-Dokumenthash. Keine weitere Dokumentänderung. Fünf geschützte v9-Dateihashes unverändert.
- Ziel-Gzip SHA-256 `6b2d5989b1dd4859f4a6923faab2cbf9f25102f1f3e95edd77dad48b386c52cc`; entpackter Transporthash entspricht dem ausgewiesenen Produktgruppenhash.
- **Keine ausführbare Importstrecke:** Materializer importiert nur `node:`-Module, liest gepinnte Eingänge, prüft beide Dokumenthashes und schreibt ausschließlich eine neue Datei mit `wx`. Keine DB-/Repository-/Profil-/Netzwerkinstanz. Der abschließende Update-Intent enthält nur `proposedUpdate.documentArtifactFile`, kein natives `document`, keinen Importkey und keinen `proposedImportEntry`; es ist weder bestätigter pgp-Plan noch direkt an `repository.importBatch` übergebbarer gültiger Dokumentdatensatz. Vorhandene native Imports verlangen `documentValue(entry.document)` vor dem Schreiben. Der Preview-Builder ruft Validator/Shopvorbereitung nur im Speicher auf und schreibt lokale Belegdateien.
- IDs, Medien, Status und historische Bindungen werden als Erhaltungsvorgabe korrekt getrennt von neuen Bindungsrevisionen beschrieben. Tatsächliche Zielprofile, Metadaten, tenantId, 808 native Options-/Binding-Verträge und frische Köpfe bleiben ausdrücklich offen; ein Platzhalter-Revision-2-Record in der lokalen Vorbereitung wird nicht als Servernachweis ausgegeben.

## Korrektur-Nachprüfung

**Abgeschlossen, kein verbleibender Befund im geprüften Previewumfang.** README, Update-Intent, Labelpatch, Verification, Builder, Materializer und Operatoranleitung trennen jetzt Produktgruppen-, ID-Binding- und Transport-/SQL-Bytehash ausdrücklich. Die vier ausgewiesenen nativen Hashwerte stimmen mit der unabhängigen Vollmessung oben überein. Der Materializer prüft beide nativen Verfahren vor und nach dem Sechsfeld-Patch; sein einziges Schreibziel bleibt eine neu anzulegende lokale Vorschau-Datei. Die 49 numerischen Fontobjekte und der ID-Binding-Vertrag des Operator-Rev1-Werts sind korrekt erklärt. Der Operatorauftrag verlangt SQL-Bytes gesondert und leitet sie nicht aus Transportbytes ab.

Alle elf im Manifest aufgeführten Dateien plus Manifest im `github-payload` geprüft: Größen und SHA stimmen; Text-/JSON-/Skriptkopien sind bytegleich zur Previewwurzel; die komprimierte Zuordnung ergibt dasselbe vollständige Mapping. Paketmanifest SHA-256: `728da28ab505b09c8a4982ed3839179ca21a1ed84e32fafef339248451e430d9`. Fünf eingefrorene v9-Dateien erneut gehasht, unverändert. Ziel-Gzip und entpackte Dokumentbytes ebenfalls unverändert. Damit bleiben der bestätigte Erhalt aller 808 Varianten einschließlich der 30 Restvarianten sowie die vollständig belegten 138 B02S-/20 B04S-Preisabweichungen gültig.

Dieser Review bestätigt den **lokalen, nicht ausführungsfertigen Zielentwurf**, keine tatsächliche Registry-/Profilübereinstimmung und keine Server-, Shop- oder Produktionsfreigabe. Der in der Operatoranleitung präzise abgegrenzte Vergleich der gesicherten Zielkopie bleibt erforderlich.
