# Funkklingeln: Warenkorb-Abgleich beim Live-Pilot

Chris hat am 29.10.2026 „stell es live“ freigegeben. PR #60 ist als 092303d73ff5546bb4208b2b7a360756f69602b1 bereitgestellt; Linux 28/28 und Build sind grün. 126 Konfigurationen, 42 Modelle und 15.120 Varianten wurden auf aktueller Store-Kopie abgeglichen. AOSU Pro cfg_c3ee3fcf-bf87-42e3-af2a-98b680cdb576 hat eine neue Revision 2 mit 120 Bindungen. Alte Revision 1 bleibt unverändert.

Die Live-Oberfläche zeigt Format/Position als getrennte Bildblöcke, runde Farben, Rahmen, realistische Materialien und unterschiedliche Designs. Löschen/Rückgängig (3→2→3 Elemente) sowie unabhängiges Verschieben des Kreismotivs wurden live geprüft. Länglich, Gegenposition, Anthrazit, Seitenrahmen, Silikon ergibt 74,98 EUR.

## Beim Pilot gefundener Fehler

`prepareAcrylicReview` erstellt für versionierte Funkklingeln die getrennte Fertigungsausgabe und entfernt deshalb den alten Blocker „Die getrennte Fertigungsausgabe … ist noch nicht angebunden.“. `assertBoundTestReview` erwartete diesen Blocker weiterhin für jede Klingel. Die exakte Gleichheitsprüfung wies dadurch einen gültigen neuen Prüfstand als `bound_test_blockers` zurück. Das ist keine fehlende Maschinenfreigabe, sondern ein widersprüchlicher Abgleich der vorhandenen Funktionen.

Der Fix verwendet denselben vorhandenen `isLayeredDoorbell`-Prädikat wie der Erzeuger. Sonstige Blocker, Varianten-, Revisions- und Profilprüfungen bleiben erhalten. Regressionstest erzeugt echte Prüfmanifeste für drei Formate und beide Positionen, prüft Annahme, Abweisung zusätzlicher/fehlender Blocker sowie Erhalt der Legacy-Sperre. Lokal 1/1 bestanden, sechs erzeugte Prüfstände. Linux und erneuter Live-Warenkorb folgen vor dem Rest-Rollout.

## Rückweg

Private Sicherungen liegen unter `private/funkklingeln-ui-release-20261029/{snapshot,before-live}`. Keine Gesamtdatenbank über neuere Kundenstände zurückkopieren. UI-Rückweg: vorherigen Git-Stand 62ead38d1c2413ca208c7932c8eb6c3116a7914f bereitstellen, Build, App-Neustart. Bindungen gezielt über das bestehende Bindungsmodul wieder an Revision 1 setzen; historische Dokumente/Bindungen/Bestellungen nicht ändern. Die Pilot-Revision 2 kann als Historie erhalten bleiben.

PR #54 (Bestell-/Fertigungssicht) bleibt ein getrenntes Paket. Keine Shopify-Produkte, Theme, Webhooks oder Live-Schalter wurden geändert. Katalog-Design-Master: https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md . Katalog-Rezepte/Freigabe: PR #7, Merge 7d53958399badd1fd3aaba3eb59c084b0ccbddeb.
