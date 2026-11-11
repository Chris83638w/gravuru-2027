# Galerie: wiederholte große Dokumentlesungen begrenzen

Stand: 12.11.2026, Codex/Astra, eigener Integrationsbranch `dev/astra-issue230-integration-candidate-20261111`. Basis `bf919f1751ab097cd8ac5886d70cd7b461a0f20a`; dieser Commit enthält genau eine Runtimeänderung plus neue Tests und Nachweise.

Der tatsächliche Operatorbefund [#168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6809368576) belegt zwei verschiedene Probleme: wiederholte Rohlesungen in der Bindungsprüfung und danach die Speichergrenze beim Speichern der Galerie. Dieses Teilpaket behebt ausschließlich die wiederholten Lesungen. Der Snapshotfix wird noch gemessen; **dies ist kein neuer aktivierbarer Gesamtstand und noch kein Anlass für einen weiteren kalten Operatorlauf**.

`app/workshop/shop-product-binding-store.mjs` verwendet während genau eines asynchronen Galerielaufs bereits geprüfte Rohbytehashes erneut, wenn die vorhandenen SQLite-Änderungszähler unverändert sind. Kopf, Archiv, Art, Status und feste Bindung bleiben frisch geprüft. Bei eigener/fremder Änderung, Rollback, REPLACE oder Schemaänderung erfolgt der vollständige Vergleich mit dem ursprünglichen Beleg. Kein Rohdokumentcache, keine Änderung an Schreib-/CAS-/Produktions-/Preiswachen oder Cacheformat.

66 gezielte Fälle bestanden: 15 neue Epochfälle und 51 vorhandene Store-/Batch-/Readscope-/Speicherfälle. Native und Legacy-Registry mit ausgeschalteten rekursiven Triggern: 101 Bindungen benötigen zwei volle Dokumentlesungen, weiterhin 101 Bindungsprüfungen. Unabhängiger Rootreview ohne Befund. [Bericht](../reviews/2026-11-12-gallery-epoch-read-fix/gallery-epoch-read-fix.md) und vollständiger Testlog liegen im Nachweisordner. Synthetische Tests sind keine echte Servermessung.

Nächster Schritt: Speicherwirksamkeit des separaten Snapshotfixes nachweisen, beide engen Änderungen als exakten Gesamtpin an Claude geben. Anschließend gleicher begrenzter Cold-/Reopen-Kopienlauf und vollständige isolierte Sitzung. Laufende R15-App, achtspaltige Statistik und Produktstände bleiben zunächst unverändert. Bestehende Nutzerfreigaben gelten weiter; keine neue Inhaltsentscheidung nötig. Produktanlage/-änderung/-veröffentlichung ist nicht Teil dieses Runtimepakets.

[Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); keine Designänderung in diesem Paket.
