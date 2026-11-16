# #230: gezielte Korrekturen nach Claudes Linux-Abnahme

Der gemeinsame Kandidat `5702191` bestand laut [Operatorprüfung](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6806309873) 3.026 Tests; 14 Fälle in elf Dateien schlugen fehl. Alle Fehler bestanden auch vor dem Merge. Dieser Folgecommit behandelt die zehn Fehler in den neun vom Operator benannten neu hinzugekommenen beziehungsweise gegenüber ac10 abweichenden Testdateien. Die drei bekannten Fotodichtefehler und der bekannte Konfis-Test bleiben davon ausdrücklich unberührt.

## Änderung

Einzige geänderte Laufzeitdatei ist `app/configurator/variant-m/native-design-search.mjs`: Ein Aufruf ohne abfragbare Oberfläche oder synchronisierbaren Editor beendet die Installation vor Browserzugriffen. Das verhindert den nachgewiesenen Fehler im Funkklingel-Galeriepfad. Die tatsächlichen Installer werden ohne DOM aufgerufen und auf unveränderte Konfiguration geprüft; die bestehende Such-/Leeren-/Abbruchprüfung bleibt bestehen.

Foto und SVG sind bereits korrekt getrennt: `ux.mjs:145` stellt die freigegebenen Buttons dar, `:392` wählt beim Klick den passenden Dateityp, `:410`/`:460` führen SVG zum Logo-Importer. Der neue Test führt diese echten Handler für Foto, SVG und beide Module einschließlich Ersetzen aus. Keine Änderung an der Upload-Oberfläche oder deren Laufzeitlogik.

Die übrigen Änderungen betreffen ausschließlich Tests:

| Testbereich | Ursache und Korrektur |
|---|---|
| Bindungs-Memorytest | Eine separate veränderte Kopie statt Mutation eines absichtlich eingefrorenen Objekts liefern. Der echte `shop_binding_cfg_changed`-Schutz und Rollback auf null Bindungen werden weiterhin geprüft. |
| Galerieeditor und Schieferpositionen | Nach der leichten Übersicht die ausgewählten Karten über den bestehenden begrenzten Detailabruf laden. Erst dann echte Fingerprints bestätigen/vergleichen; Auth-, CAS- und Originalschutz bleiben geprüft. |
| Plesk-Galeriemount, zwei Fälle | Synthetisches Paketverzeichnis ausdrücklich mit 0700 anlegen. Linux-Standardrechte 0755 erfüllten die unveränderte Sicherheitsvoraussetzung nicht. |
| Schiefer-Approvalruntime | Unbekanntes Ziel wird bereits durch den vorhandenen Scope-Guard mit 422 und konkreter Fehlermeldung abgewiesen; kein späterer 404-Registryzugriff erwartet. |
| Galerie-Performance | Die aktuelle Übersicht muss null native Dokumente lesen. Details werden anschließend ausdrücklich für genau die ausgewählte Quelle geladen. |
| Managementmount | Zurückgestellte Ziele über den bestehenden Sync-Endpunkt prüfen; der synthetischen Familienfilter-Fixture die tatsächlichen eindeutigen Familienkennungen ihrer Dokumente geben. |

## Nachweise

[Berichte und Vorher-/Nachherlogs](../reviews/2026-11-11-issue230-operator-followup/) dokumentieren die einzelnen Befunde und Umgebungen.

- Frontend: 16/16 gezielte Tests bestanden.
- Bindung/Galerie/Positionen: 7/7 bestanden.
- Vier Ops-/Skriptdateien: 15/15 bestanden.
- Zusammen 38 unterschiedliche Tests, null Skips. Windows/Node 24.20.0; benötigter lokaler Loopback und vorhandene Bildbibliotheken. Dies ersetzt Claudes erneute Linuxprüfung nicht.
- Erneuter Build: 76 Referenzressourcen, 159 Module, 16 Styles. `editor-e69c2c5ba68ac1eb.mjs`, 1.490.671 Byte / 495.787 Byte gzip.
- Die vorherigen PC-/Handybilder gehören zum Stand vor dem ausschließlich defensiven DOM-Wächter. Kein neuer Browser-/Server-/Warenkorb-Erfolg wird aus diesen Tests abgeleitet.

Die 19 abgeglichenen Serverdateien, eingefrorenen v9-Pläne, Preise und Excelunterlagen bleiben unverändert. Keine Serverinstallation, Datenbankmigration, Produktanlage oder Veröffentlichung durch diesen Folgecommit.

## Nächster Schritt

Claude übernimmt den veröffentlichten Folgecommit und prüft die neun zuvor roten Dateien plus die ergänzte Suchregression gezielt auf Linux. Die bereits bekannten vier Baselinefehler bleiben getrennt dokumentiert. Danach folgen seine echte Modell-/Originalbank-/Bildabnahme und der Pilot. Der [aktualisierte lesende Zielregisterhelfer](../../ops/issue230-operator-review-20261111/README.md) und die [Identitätsprüfung](2026-11-11-main-native-adoption-review.md) müssen die reale native Zuordnung belegen. [Vorhandene Kleinprodukte](../reviews/2026-11-11-small-products-duplicate-review/README.md) und [korrekte Maße/Preise](../reviews/2026-11-11-main-acryl-size-labels/main-acryl-7x2-audit.md) gehören in den tatsächlichen Zielvergleich vor einer konkreten gemeinsamen Produktfreigabe.
