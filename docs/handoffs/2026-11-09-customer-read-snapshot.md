# Kundenstart: geprüfte Produktdaten innerhalb einer Anfrage wiederverwenden

Stand: 09.11.2026, isoliert auf `4dc5653b2ee31d2e3e28f10614e5433469348a5a`. Branch `dev/mika-customer-read-snapshot-20261109`. Nicht live aktiviert.

Die native 12-MB-Produktrevision wurde im Kundenstart mehrfach gelesen, geparst und vollständig gehasht. Fünf Serverdateien vermeiden die Wiederholung innerhalb derselben synchronen Anfragephase. Kundenaufbau, Designs, Preise, Produktrevisionen, Warenkorb und Bestellhistorie werden nicht geändert.

## Umsetzung und Grenzen

- `customer-read-scope.mjs`: neuer, auf den synchronen Aufruf begrenzter Speicher. Kein zusätzlicher Datenbank-Lock und kein Cache über `await`, Anfragen oder Neustarts hinweg. JSON-Werte werden vor Wiederverwendung tief eingefroren; höchstens 16 Einträge je Besitzer und Phase.
- `repository.mjs`: dieselbe native Produktrevision innerhalb der Phase wiederverwenden. Produktkopf wird weiterhin gelesen; außerhalb der Phase bleiben veränderbare, unabhängige Rückgabekopien erhalten.
- `shop-product-binding-store.mjs`: vollständigen Dokumenthash innerhalb der Phase wiederverwenden. Bindung, aktueller Kopf, Mandant, Optionen, Preis und Historie werden weiterhin mit dem bestehenden Verfahren geprüft.
- `http.mjs`: nur ausdrücklich an eine Revision gebundene Modelle wiederverwenden. Ungebundene Editormodelle behalten die bisherigen Abfragen ihrer veränderlichen Profilbibliothek.
- `shop-entry.mjs`: nur Start-, Modell-, Galerie- und Vorschau-Lesepfade öffnen solche Phasen. Nach asynchronen Grenzen wird eine neue Phase begonnen; Schreibpfade bleiben unverändert.

Jeder Datenbank-Cachezugriff prüft `total_changes()`, `data_version` sowie Haupt- und TEMP-Schema-Version. Eigene Änderungen, Rücknahmen, fremde Commits und Schemaänderungen erzwingen neue vollständige Datenlesungen. Eine Änderung während des Lesers führt zu `customer_read_changed` (409). Freigaben und Bindungen werden nicht länger gültig erklärt; Fristen bleiben unverändert. Es wird weder eine neue Schema-Version noch ein anderer Immutable-Trigger vorausgesetzt.

## Begrenzte Messung

Realer lokaler r4-Dokumentstand mit 251 Designs, 80 Größen und 404 Kombinationen; Quell-SHA `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`. Native Werkstatt, Modellaufbau und Registry über echte lokale HTTP-Anfragen, aber eine ausdrücklich synthetische Zuordnung und Freigabe in einer temporären Datenbank. Keine Produktionsmessung.

| Pfad | Vorher | Nachher |
| --- | ---: | ---: |
| Signierter Start, vorbereitete Vorschauen | 915 ms | 519 ms |
| Modell, zwei Abrufe | 1.180 / 1.239 ms | 617 / 643 ms |
| Galerieliste, zwei Abrufe | 1.290 / 1.361 ms | 875 / 531 ms |
| Private Vorschau, zwei Abrufe | 1.512 / 1.434 ms | 957 / 1.202 ms |

Beim Modell sinken die vollständigen Dokumenthashes von zwei auf einen, bei Galerie und privater Vorschau von drei auf zwei. Alle Abrufe liefern 200 und dieselben Antwortgrößen: Modell 322.368 Bytes, Galerie 27.079 Bytes mit 21 Karten, private Vorschau 138.503 Bytes. Das ist keine Aussage über bytegleiche Antworten oder Pixelvergleiche. Einzelne native Modell-/Registry-Aufrufe werden durch diese Optimierung nicht schneller; sie spart Wiederholungen innerhalb der HTTP-Phase.

Eine begrenzte instrumentierte Vorher-/Nachher-Serie, kein statistischer Lasttest. Die letzte Korrektur schließt ungebundene Modelle aus der Wiederverwendung aus; die gemessenen Modelle sind ausdrücklich an r4 gebunden und verwenden denselben gemessenen Pfad. Die bereits von Root gemessenen Netz-/Transferanteile bleiben zusätzlich relevant. Eine tatsächliche Verkürzung der mobilen Gesamtladezeit muss nach separater Aktivierung gemessen werden.

## Prüfungen und unabhängiger Review

Finaler gezielter Lauf: **96/96 bestanden, 0 übersprungen** (7,69 s), bestehende Repository-, Binding- und Shop-Entry-Suites plus neue Phasentests. Enthalten sind Fremdschreibzugriffe, zurückgerollte Schreibepochen, TEMP-Schattenobjekte, Mutation im Leser, await-Grenzen, tiefe Unveränderlichkeit, neue Produktrevisionen, Archivierung und manipulierte native Quelldokumente. Historische Revisionen bleiben unverändert.

Unabhängig weitere sechs Gegenproben durch `module_contract`: read-only SQLite mit fremdem Commit, fremdes Schreiben während des Lesers, fremde DDL, Loaderfehler, Ausnahme-Cleanup und await-Cleanup. Kein belegter Blocker, keine Wiederholung der ganzen Suite. [Gepinnter unabhängiger Bericht](https://github.com/Chris83638w/gravuru-2027/blob/f55eb76fa681a6a45081c6fc893d3e096203ab5b/docs/reviews/2026-11-09-customer-read-scope-review.md). Die dort gelesenen fünf Hashes stimmen mit dem finalen Paket überein.

Reproduzierbarer Testaufruf: `node --test app/workshop/customer-read-scope.test.mjs app/workshop/repository.test.mjs app/workshop/shop-product-binding-store.test.mjs app/workshop/shop-entry.test.mjs`. Für den vorhandenen SVG-Test wird der bestehende Projekt-Python über `GRAVURU_PYTHON` gesetzt. Der erste Lauf ohne diesen Verweis scheiterte ausschließlich an der fehlenden Converter-Umgebung; der dokumentierte Schlusslauf verwendet sie und ist vollständig grün.

## Paket und Rücknahme

[Dateimanifest mit aktiven und neuen SHA-256](../reviews/2026-11-09-customer-read-snapshot/patch-manifest.json), [Mess-/Prüfzusammenfassung](../reviews/2026-11-09-customer-read-snapshot/proof.json), [Testlog](../reviews/2026-11-09-customer-read-snapshot/final-tests.log), vollständige Messreihen `before.json` und `after.json` im selben Verzeichnis. Alle Produktionsdateien sind LF; Checkout-, Paket- und Git-Blob-Bytes werden bei der Sicherung verglichen.

Privates lokales Paket: `outputs/customer-read-snapshot-20261109/package/`; exakte vorherige vier Dateien unter `baseline/`; Manifest daneben. Root bestätigte die vier aktiven Server-SHAs am 09.11.2026 um 00:08:38Z. Neue Hilfsdatei muss auf dem Ziel vorher fehlen. Vor Aktivierung erneut alle Pins prüfen und die bisherige Runtime sichern; nur die fünf Dateien zusammen übernehmen. Kein CSS, Browserbundle, Datenbank- oder Produktimport erforderlich.

Rücknahme: vorherige Runtime wieder auswählen oder die vier gesicherten Dateien zurückspielen und erst nach Rücknahme ihrer Imports die neue Hilfsdatei entfernen; Prozess nach dem bestehenden Verfahren neu starten. Keine Datenmigration zurückzunehmen. Root übernimmt Veröffentlichung und tatsächliche Browser-/Servermessung getrennt.
