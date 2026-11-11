# Nachprüfung der drei Backend-/Galerietests

11.11.2026, Codex: gezielte Antwort auf [Claudes Linux-Abnahme](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6806309873). Arbeitsbaum `work/issue230-integration-candidate`; beim Beginn HEAD `52776c999c17bf5b656696db6b38d3be782f4f8d` (Dokumentationsnachtrag auf dem Kandidaten). Die berührten Laufzeitpfade sind per `git diff 5702191` unverändert. Kein Mergefehler behauptet: Claude hatte dieselben drei Fehler bereits auf `0e200d8` nachgewiesen.

## Ergebnis

**7 Tests in drei Dateien bestanden, 0 Fehler, 0 Skips, 10.925 ms.** Änderungen ausschließlich in den drei zugewiesenen Testdateien. Kein Runtimecode, keine Freigabe-/Preisregel, kein Server oder Shop geändert. Kein Staging/Commit/Push durch diesen Agenten.

| Datei | Reproduzierter Befund | Korrektur und erhaltener Prüfsinn |
|---|---|---|
| `app/workshop/shop-product-binding-store.doorbell-memory.test.mjs` | Ein Test verändert `metadata.syntheticPayload` direkt am inzwischen absichtlich eingefrorenen Adapterdatensatz. Es entsteht `TypeError` statt `shop_binding_cfg_changed`. | Beim vierten gezielten Lesen eine echte `structuredClone`-Kopie mit abweichenden Metadaten zurückgeben. Der originale Snapshot bleibt eingefroren und unverändert. Die Erwartung `shop_binding_cfg_changed` bleibt exakt bestehen; zusätzlich wird belegt, dass die abweichende Kopie tatsächlich erzeugt wurde. Die Transaktion hinterlässt weiterhin null Bindungen; der anschließende gültige Lauf speichert 100 Testbindungen und hält einen gemeinsamen geprüften Datensatz. |
| `app/workshop/gallery-editor-http.test.mjs` | 409 statt 200 beim Bestätigen mit einem Fingerprint aus der leichten Übersicht. | Wie der echte Client zunächst bekannte Zielschlüssel lesen und dann die ausgewählten Karten über `POST /originale/approvals?action=read` vollständig auflösen. Erst mit tatsächlichem SHA-256-Fingerprint bestätigen. Nach dem Edit erneut detailliert lesen. Erwartete Erfolgs-/Konfliktcodes bleiben unverändert. |
| `app/workshop/slate-review-positions.test.mjs` | `null` statt SHA-256 aus derselben leichten Übersicht. | Gleicher expliziter Detailabruf für die vier synthetischen Material-/Formatziele der Fixture. Kein erfundener Hash und kein Entfernen der SHA-Prüfung. Positionsänderung macht genau die betroffene Freigabe ungültig; Nachbarvorlage, anderes Format und Kommentare bleiben erhalten. |

Die Galerie-/Schieferfehler sind veraltete Testaufrufe, keine fehlenden Produkt-SHAs: `slate-review-gallery.mjs` liefert für `GET /originale/approvals` bewusst `approvalBundle()` ohne ausgewählte Details. Der reale Client `slate-review-approvals-ui.js` nutzt den bestehenden begrenzten POST-Detailabruf mit `originalIds` und `targetKeys`. Die Tests folgen jetzt genau dieser Route und lesen keine zusätzlichen produktfremden Ressourcen.

Die bestehenden Authentifizierungs-, Origin-/CSRF-, Revision-/CAS-, Format-/Material- und Originalschutzprüfungen wurden nicht gelockert. Auch native Text-/Motiv-/Grafikgrößen, Masken, Foto-Originale, Wiederöffnen und ein unveränderter Save bleiben geprüft.

## Reproduktion und Umgebung

Vorher:

- `operator-binding-before.txt`: 2 Tests, 1 bestanden, 1 Fehler; tatsächlicher `TypeError` am eingefrorenen Objekt aufgezeichnet.
- `operator-gallery-slate-before.txt`: erster eingeschränkter Windows-Lauf, 3/5 bestanden; die beiden HTTP-Tests scheiterten zunächst an der Umgebungsbeschränkung `connect EACCES 127.0.0.1`.
- `operator-gallery-slate-before-loopback.txt`: nach erlaubtem Zugriff auf ausschließlich lokale Testserver 3/5 bestanden; **exakt die Operatorfehler 409/200 und null/SHA reproduziert**. Diese beiden verbleibenden Fehler waren somit keine Windows-/Python-Umgebungsfehler.

Nachher:

```text
node --test --test-concurrency=1 app/workshop/shop-product-binding-store.doorbell-memory.test.mjs app/workshop/gallery-editor-http.test.mjs app/workshop/slate-review-positions.test.mjs
```

`operator-followup-backend-after.txt`: 7/7 bestanden. Node 24.20.0 unter Windows; zugelassener Loopback für die synthetischen HTTP-Server, TEMP/TMP im eigenen Workspace-Testordner, vorhandenes Python mit den bereits eingerichteten Bildbibliotheken (`GRAVURU_PYTHON`, `PYTHONPATH`, `CAIROCFFI_DLL_DIRECTORIES`) für den bestehenden Foto-/Maskentest. Keine Produktionsverbindung.

`git diff --check` für alle drei Testdateien ohne Befund. Relevante Runtime-Dateien gegen `5702191` ohne Diff: `gallery-editor.mjs`, `slate-review-positions.mjs`, `shop-product-binding-store.mjs`, `shop-product-binding-adapter.mjs`, `scripts/lib/slate-review-gallery.mjs`, `scripts/lib/slate-review-approvals-ui.js`.

Die korrigierten Tests sind für Claudes erneute Linux-Abnahme bereit. Ein Linux-Erfolg wird durch diesen Windows-Nachweis nicht behauptet.
