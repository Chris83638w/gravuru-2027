# Unabhängiger Review: synchroner Kunden-Lesekontext

Geprüft am 09.11.2026, Codex/Mika-Unteragent `module_contract`, rein lokal und unabhängig vom Autor. Basis `4dc5653b`, Autorenbaum `work/customer-read-snapshot-20261109`. Keine Produktionsdatei geändert, keine Live-/Shopify-/Kunden-Datenbank gelesen. Dieser Bericht pinnt den geprüften Inhalt unabhängig vom späteren Autorencommit.

## Ergebnis und Grenze

Kein konkreter Blocker im engen Fünf-Dateien-Patch. Wiederverwendung endet beim synchronen Return, auch wenn der Aufrufer ein Promise zurückgibt. Nach `await` werden neue Phasen geöffnet. `total_changes`, `data_version` und Haupt-/TEMP-Schema-Epochen werden vor einer Wiederverwendung und nach dem eigentlichen Loader abgefragt. Ein Schreibwechsel während des Loaders führt zu 409. Rückgaben werden tief eingefroren; außerhalb des Scopes bleibt das bisherige Kopieverhalten. Ungebundene Modelle verwenden wegen dynamischer Profilbibliotheken ausdrücklich keinen Modell-Memo.

Aktuelle Bindungs-Heads, feste Variantenpreise/-optionen, Mandant, Pause und Katalogfreigabe werden weiterhin durch ihre bestehenden Abfragen geprüft. Der Patch memoisiert Dokument-/Digestarbeit und an einen konkreten eingefrorenen Datensatz gebundene Modelle, nicht die Freigabe selbst. Öffentliche Cacheidentitäten und deren Prüfungen bleiben bestehen. Keine neue SQLite-Lesetransaktion, keine TTL, kein Cache über Anfragen oder asynchrone Unterbrechungen.

## Tatsächlich unabhängige Gegenproben

Sechs kurze Prüfungen mit neu angelegter temporärer SQLite-Datei und getrenntem schreibendem bzw. `readOnly` lesendem Handle bestanden:

1. Fremder Commit invalidiert eine bereits gelesene Preiszeile im selben synchronen Scope.
2. Fremdes Schreiben während des Loaders löst `customer_read_changed` aus; der nächste Abruf ist frisch.
3. Fremde DDL invalidiert den Scope, neue Spalte wird gelesen.
4. Ein werfender Loader wird nicht zwischengespeichert; anschließender Versuch funktioniert.
5. Eine Ausnahme im äußeren Scope entfernt den Kontext zuverlässig.
6. Nach `await Promise.resolve()` wird keine vorherige Memo-Instanz wiederverwendet.

Autorenbelege (nicht noch einmal ausgeführt): 96/96 gezielte Tests; echte r4-HTTP-Probe von etwa 1,2 auf 0,63 Sekunden. Das reale Browser-/Serverergebnis bleibt gesonderte Root-Abnahme. Die bestehenden langen Banktests wurden nicht grundlos wiederholt.

## Geprüfte SHA256

| Datei unter `app/workshop/` | SHA256 |
|---|---|
| `customer-read-scope.mjs` | `f47460a1fdce7b9328b58fde7fb24f50d8d1c0d70d64c3784f575cd2b93f533a` |
| `repository.mjs` | `ccc35a82957c63527c6cf5975b9e9aff24e7aa0b6bbf24aff09eab4448a39cc8` |
| `http.mjs` | `711711bbea02f02e2333b462741af17389d0a9bbc32a3ad4a2b145a8212d6787` |
| `shop-product-binding-store.mjs` | `42c4999be33367519d9e4656b2a780d625c4578580d5c4ab09b3c0de652c5b48` |
| `shop-entry.mjs` | `2d8015b927a1f5e88b641519bd111532c7d2e98a9d7e6fb12b4d27623f4805a3` |

Keine Designänderung; der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich.
