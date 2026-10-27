# Bindungsaktivierung: synchrone Prüfschritte ohne wiederholte Vollabfragen

Codex, 27.10.2026. Basis: main 3775ae7843826976507ce972c917fb9a3364506e. Aufgabenbranch: dev/doorbell-binding-batches-20261027.

## Reproduzierter Aufwand

Ein lokaler Lauf mit 15.120 vorhandenen synthetischen Bindungen, einem nativen Funkklingelprodukt, 128 KB synthetischen Revisionsmetadaten und 100 neuen Varianten wurde vor und nach der Änderung mit demselben Benchmark und Node --max-old-space-size=512 ausgeführt. SQLite enthielt danach jeweils 15.220 Bindungen, 100 neue aktive Zuordnungen; Exitcode jeweils 0. Der Shopify-Leser war synthetisch, ohne Netzwerk. Die vorhandenen Zeilen dienten dem vollständigen Bindungsevidenzpfad; der Test ersetzt keine reale 126er-Veröffentlichung.

| Messpunkt | Vorher: ms / Vollabfragen | Nachher: ms / Vollabfragen |
| --- | ---: | ---: |
| Daten vorbereitet | 511 / 0 | 480 / 0 |
| Vor Shopify-Await | 11.081 / 200 | 1.494 / 1 |
| Prüfung abgeschlossen | 21.804 / 401 | 2.905 / 2 |
| Atomar gespeichert | 30.727 / 601 | 4.685 / 3 |

Peak-RSS: vorher 348.228 KB, nachher 324.208 KB. Gemessene Gesamtdauer etwa 6,6-mal kürzer. Das sind konkrete lokale Messungen, keine Laufzeitgarantie für Server, Netzwerklatenz oder vollständigen Katalog.

## Änderung und Sicherheitsgrenzen

Der bestehende Adapter bietet einen ausdrücklich synchronen Prüfschritt. Er liest weiterhin sämtliche Bindungen des festgelegten Shops/Mandanten, kopiert und friert alle Zeilen einschließlich Optionen ein. Ein Schritt lebt nur vor dem Shopify-await, ein neuer danach, ein dritter ausschließlich während der Leseprüfung innerhalb BEGIN IMMEDIATE. Er endet vor den Schreibzugriffen. Fehler, verschachtelte Schritte und asynchrone Rückgaben räumen den Zustand auf beziehungsweise werden abgewiesen. Auch Cachetreffer prüfen den Storekontext.

Der Prüfer berechnet den vollständigen Bindungsdigest einmal je tief eingefrorenem Snapshot. Planung und Auflösung validieren diesen Snapshot vollständig und indexieren Varianten sowie Produktrevisionen. Indizes sind nach Mandant, Shop und Store getrennt; Produktschlüssel verwenden eindeutige JSON-Tupel. Normale veränderliche Arrays werden weiterhin jedes Mal validiert. Es gibt keinen gültigen Snapshot über ein await, zwischen Wiederholungen oder über die gesperrte Transaktion hinaus.

Die Schreibfunktion bindVariants liest nach jedem vorangegangenen Insert frisch aus SQLite, beschränkt auf genau tenant + shop + product + revision. Das entspricht ihrem bisherigen nachträglichen Filter der vollständigen Liste. Die globalen Konfliktprüfungen davor behalten die vollständigen Daten. Zwei neue Varianten derselben internen Auswahl werden weiterhin atomar zurückgerollt.

Produkt-/Preis-/Revisions-/Profil-/Headprüfungen, Sperren und die bestehende 60-Sekunden-Frischefrist wurden nicht gelockert. Die Legacy-Fassade behält ihre Identitätsprüfungen; Adapter ohne Snapshotfunktion verwenden den bisherigen synchronen Pfad.

Zusätzlich korrigiert scripts/prepare-doorbell-shopify.mjs genau einen Importverweis von verified-server-import.entry.productId auf verified-server-import.entry.id. Das Importjournal liefert die Konfigurator-ID im Feld id. Keine Shopify-Mutation durch diese Korrektur.

## Prüfungen

18/18 gezielte Tests bestanden:

node --max-old-space-size=256 --test app/workshop/shop-product-binding-store.doorbell-memory.test.mjs app/workshop/order-intake.binding-list.test.mjs scripts/doorbell-shop-bind.test.mjs scripts/doorbell-pilot-bind.test.mjs

12/12 bestanden, 22,2 Sekunden.

node --max-old-space-size=512 --test app/workshop/shop-product-binding-batch.test.mjs

6/6 bestanden, 9,9 Sekunden. Abgedeckt: 100 Varianten bei 15.120 Altbindungen mit genau drei vollständigen Reads, idempotente Wiederholung, Konflikt während Shopify-await, Konflikt zwischen Prüfung und Transaktion, frische Schreibsicht mit vollständigem Rollback bei doppelter Auswahl, tiefe Unveränderlichkeit, Fehler-/Async-/Scope-Aufräumen, unveränderte 60-Sekunden-Frist.

Der Einzeiler im Vorbereitungsskript wurde separat mit node --check geprüft; die übergeordnete Aufgabe prüfte 127 vorbereitete JSON-Pläne auf korrekte Syntax und entfernte den alten Feldverweis. Diese lokalen Planartefakte gehören nicht in diesen Commit.

Unabhängiger Read-only-Review der Änderung ohne funktionalen oder Sicherheitsblocker. Zusätzlich wurden Snapshot-Unveränderlichkeit, Aufräumen nach Fehler/Async-Rückgabe und Mandantenwechsel beim Cachetreffer unabhängig im Speicher geprüft.

## Übergabe

Keine Serverbereitstellung und keine Shopify-/UI-/Produktionsdatenänderung durch dieses Paket. Der geprüfte Code darf nach abschließender Kontrolle des exakten PR-Heads gemäß übergeordneter Freigabe nach main übernommen werden. .local-data-Benchmark- und Patchskripte werden nicht eingecheckt. Die vorherige echte Pilotaktivierung und der gesonderte Browserbefund sind kein Ergebnis dieses Commits.

Nächster Schritt nach dem Merge: den exakten geprüften Stand für eine spätere zulässige Serverbereitstellung vorhalten. Der Server bleibt bis dahin auf seinem bisherigen Stand. Der vollständige 126er-Auftrag und die reale Kunden-/Warenkorbabnahme bleiben offen; diese Leistungskorrektur ist keine Verkaufs- oder Produktionsfreigabe.
