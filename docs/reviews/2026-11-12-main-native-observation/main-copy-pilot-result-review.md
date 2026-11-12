# Hauptacryl: Review des tatsächlichen Kopienpilot-Ergebnisses

12.11.2026. Frisch gelesen: [Ergebnis #168 · 6818540526](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6818540526) und [Umschaltankündigung #233 · 6818552737](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6818552737). Keine eigenen Tests, Serveraufrufe oder produktiven Änderungen.

**Das gemeldete Ergebnis erfüllt alle elf zuvor unabhängig geprüften Erfolgskriterien des Kopienpiloten. Kein neuer technischer Einwand gegen das bereits autorisierte, separat angekündigte Programm-Umschaltfenster.**

Der Operator benennt genau den geprüften Pilotquellstand `3e5bdf48`, SHA-256 `5d271313d7ae5a5bdbb6be2993e86a0637f9e70e749a35a510bcbd99b544a136`, echte v7-Akte mit SHA `65d706e1a99cc599ba7a1c577de028208a5efd356f97bd997f68be3f899cde29` und echten Reviewhash `8e8814cabbddb0354e0af029e1bdb09f0a668f69af03dd056792a99c6b7d517d`. Der Lauf verwendete neue A/B/C-Arbeitskopien unter `sicherungen-db/updatepilot-20261112T074826Z/`, einen Netzwächter und eine ausdrücklich synthetische Testentscheidung nur im Speicher.

## Abgleich mit dem geprüften Programm

| Fall | Berichteter Nachweis | Bewertung |
|---|---|---|
| A: erstes Update | R1 → R2/draft, 1 neue Revision, 0 neue Produkte; Revisionen 4406 → 4407, Journal 4285 → 4286; Produkte 1078, Bindingköpfe 16680 und Bindingrevisionen 33059 unverändert | Entspricht den vier strikten A-Updatebedingungen. Richtiger Importschlüssel/Fingerprint und Zielmetadatenhash gemeldet. |
| A: identischer Replay | `replayed:true`, 0 neue Revisionen, alle Zähler gegenüber A unverändert | Echter Replay desselben Updateumfangs, kein zweiter Import. |
| B: andere Excelbytes | Exakt `excel_changed`, Zähler unverändert | Keine beliebige Ausnahme als Erfolg gewertet. |
| B: native Fremdbearbeitung | Exakt `head_changed`, nur deren Kopf2/Revision4407 bleibt, Importjournal4285 und eigener Importkey null | Erwartete Kopfprüfung schützt die Fremdbearbeitung. |
| C: Drift im Insert-Hook | Dritter Snapshotaufruf; genau ein Trigger; Profilsettings R1 → R2; exakt `invalid_snapshot_metadata` / `snapshot_metadata_changed`; danach Kopf1, Importkey null und ursprüngliche Zähler | Prüft den wirklichen nativen Insert-/Rollbackpfad. Der Produktkopf wird in `append` bereits vor dem Snapshotcallback geändert und durch die Transaktion zurückgerollt. |
| Ausgangssicherungen | Alle drei Datei-SHAs weiterhin gleich ihrem Manifest | Tatsächliche Hashprüfung der unveränderten Sicherungsquellen, ausdrücklich in der Gesamtbedingung enthalten. |

Der Quellstand verlangt alle elf booleschen Bedingungen ausdrücklich als `true`. Der Ergebnistext meldet genau diese elf Namen mit `bestanden:true`. Shopify-, Binding-, Katalogfreigabe- und Veröffentlichungswrites sind jeweils0. Der unveränderte Adapter prüft zudem Dokument-/Metadatenpins, feste Produktidentität und Journal beim Readback; er wurde nicht für diesen Test abgeschwächt.

## Präzise Beleggrenzen

Die kleine Rohdatei `TESTBELEG-updatepilot.json` und ihre vollständigen Receipthashes liegen zum Reviewzeitpunkt noch ausschließlich privat beim Operator. Hier wurden der veröffentlichte Ergebnistext und der zuvor bytegeprüfte ausführende Quelltext abgeglichen; keine unabhängige lokale Rohdatei-/Receipt-Neuberechnung behauptet. Root hat die Veröffentlichung des kleinen Rohbelegs angefragt. Daraus folgt kein zusätzlicher Test- oder Umschaltstopp.

„Workshop-Datei unverändert“ im veröffentlichten C-Ergebnis wird hier auf den tatsächlich geprüften Umfang begrenzt: gleiche logische Zähler, Kopf1 und Importkey null nach Rollback. Der Pilot berechnet keinen Vorher-/Nachher-Bytehash der C-Arbeitsdatenbank. Die bewusst veränderte separate C-Profilkopie wird nicht mit der Workshoptransaktion zurückgerollt; eine gemeinsame Transaktion über mehrere Datenbanken wird nicht behauptet.

Die synthetische Zustimmungsakte wurde nicht als Nutzerantwort ausgegeben oder exportiert. Das Ergebnis belegt ein Update auf echten **Kopiedaten**, keine produktive Produktänderung und keine produktive Freigabe. Die fehlenden cmp-Registertabellen bleiben als eigener Herkunfts-/Gruppenplanbefund bestehen; der bereits geprüfte direkte Hauptprodukt-Updateweg validiert den vollständigen eingebetteten Modul-Snapshot und benötigt keinen cmp-Lookup. Für spätere Gruppenanlagen bleiben die echten Registerpins erforderlich.

## Späterer Laufzeitnachtrag, vom Kopienpilot getrennt

Nach Abschluss dieses Piloten hat Claude die separat genehmigte Programmumschaltung tatsächlich ausgeführt: [Umschaltung um 09:31, Start um 09:32](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6818929492), [bleibender Prozess und echte Shop-/Proxy-/Legacy-/Suchprüfung](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6818929895). Runtime `f85390b` ist live; dies ist keine Produktübernahme und ändert die oben beschriebenen Grenzen des Kopienbelegs nicht.

Edelstahl-iframe/Assets, Designwechsel und mehr als 60 s fortgesetzte Sitzung sind belegt. Root hat zusätzlich den [Operator-Screenshot des Stahlschattens visuell geprüft](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6819192410). Die mobile Probe beschränkt sich auf ein 390px-iframe, ohne Touchgerät. Hauptacryl-Variante 331 über den Produktknopf, Acrylschatten und Werkstatt-/Workerlast bleiben nach der [Nachforderung](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6818980840) offen. Die kurze erste Startfolge mit `ERR_INVALID_STATE` bleibt als Beobachtung mit unbewiesener Operatorerklärung erhalten; anschließend ist ein stabiler Prozess berichtet. Details und Rückweg stehen im [aktualisierten Handoff](../../handoffs/2026-11-12-main-copy-pilot-accepted.md).
