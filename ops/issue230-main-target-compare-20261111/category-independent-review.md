# Unabhängiger Review des Kategorie-Kopienhelfers

11.11.2026. **Abgeschlossen, kein verbleibender Befund im engen Erweiterungsumfang.** Rein lesender Code-/Diff-/Belegreview; keine tatsächliche Datenbank geöffnet, keine Server-/Appänderung und keine doppelte Testsuite.

Die Erweiterung erhält die bereits geprüften Kopie-/WAL-/Mandanten-/Streaminghash-/808er-Zuordnungsprüfungen. Geändert werden die festen Ziel-/Intentpins, die ausdrücklich mitgeführte `categoryId` in Profilsummaries, die Kategorieprojektion und deren Quelle als zusätzliches CLI-Argument. Gegenstücke vor/nach Änderung gelesen. Produktgruppenhash `ae09cbf6…e407`, Bindinghash `f0bb7d95…d285` und Intent-Dateibytes `fcfdddde…282b` stimmen unabhängig mit dem gleichzeitig geprüften Metadatenziel überein; kein stilles Weiterverwenden des alten Zieles.

Die beiden Kategorien werden exakt und in unveränderter Reihenfolge verlangt. Das tatsächliche Dokument muss dieselben Kategorien und dieselben Produktzuordnungen besitzen. Pro Ressourcenart wird erst der Standard, dann jede vorhandene Kategorie in Dokumentreihenfolge, zuletzt die Produktzuordnung angewendet. `inherit` erhält den bisherigen Stand, `empty` erzeugt ausdrücklich `[]`, fehlende Kategoriezuordnung wird übersprungen; fehlerhafte vorhandene Zuordnungen und fehlende/fremde/falsch typisierte Profilköpfe brechen ab. Profile werden mandantenbezogen am aktuellen Kopf innerhalb des vorhandenen Lesesnapshots geladen. Anschließender Bestsellerfilter entspricht der gelesenen nativen Implementierung.

Die native Resolverquelle wird anhand ihrer vollständigen LF-normalisierten Bytes geprüft: `d3aa96dd7800f3e98bd2706b20bb2a0eb5b47adc9172099547453225e8460e51`. Dieser Hash wurde unabhängig gegen die aktuelle owning source `app/workshop/profile-library.mjs` nachgerechnet. Der Helfer importiert/instanziiert diese native Bibliothek nicht auf der Kopie; er prüft außerdem `query_only=1`. Fehlender/falscher Quellpin kann keine grüne Kategorieauflösung ergeben. Tatsächliche Katalogmitgliedschaft und Assetverfügbarkeit bleiben ausdrücklich `catalogAvailabilityValidated:false` und werden nicht durch SQL ersetzt.

Ausgabe bleibt begrenzt auf IDs, Revisionen, Herkunft, Zuordnungs-/Settings-/Profilhashes, Auswahlzahlen/-hashes und konkrete Unterschiede. Keine Profilnamen, vollständigen Auswahllisten, fremden Kategorien oder Ressourcen. Historischer lokaler v9-Snapshot, aktuelle Kategorienauflösung und gespeicherter tatsächlicher Rev1-Snapshot bleiben getrennt. Gleiche Auswahlinhalte bei anderer Quelle werden sichtbar; ungebundenes null bleibt von leerer Auswahl unterscheidbar.

Autorenbeleg gelesen: **14/14** gezielte synthetische Tests, 0 übersprungen; neun bestehende Kopienfälle plus fünf Resolverfälle. Das echte native `createProfileLibrary().resolve()` dient dabei ausschließlich auf neuen synthetischen Testdateien als Vergleich. Gegenprobe für Reihenfolge, inherit/empty/fehlend, gleichen Inhalt bei anderer Quelle, Bestsellerfilter, falschen Quellhash/Mandanten/Profiltyp enthalten. Keine erneute eigene Ausführung.

Alle acht im Manifest aufgeführten Dateien auf Größe/SHA geprüft. Geprüftes Manifest: `ea46428eb336b144c73d43023e92ef7d33b27f5ccdb388307eb7e6975ff50359`.

| Geprüfte Quelle | SHA-256 |
|---|---|
| `compare-main-target-copy.mjs` | `5c4394a4ad258dc30eca249fde5a3cc9d60e2755d8d00b62d76b61be29580394` |
| `resolve-main-category-profiles-readonly.mjs` | `e86c1ddf42fe957f2e60c9e7e769937e3c0f07571980cf382413b6db9cd48476` |
| `copy-guard.mjs` (unverändert) | `466ffb3e96fa8bcc2b569a3069abe7ea4ca00a856fae9a8cc65ac186b39a1671` |

Paketquelle: `work/restabschluss/main-target-category-compare-helper/`; vorgesehenes Repositoryziel: `ops/issue230-main-target-compare-20261111/`. Die verbleibende tatsächliche Kategorienwirkung kann nur Claudes angekündigter privater Kopielauf belegen. `readyForImport:false` bleibt bestehen; kein Serverumschalt-/Import-/Bindungsfreigabenachweis aus diesem Review.
