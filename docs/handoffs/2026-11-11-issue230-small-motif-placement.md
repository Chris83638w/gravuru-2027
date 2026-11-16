# #230 – begrenzte Platzierung der Kleinformatmotive

11.11.2026 · Codex/search_preview · lokaler Patch, keine Installation oder Veröffentlichung.

Quelle der Regel: Chris, [#230 Kommentar 6772716646](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6772716646), 10.11.2026 17:16. Die 13 bestätigten Originalmotive ohne schmetterlinge-1 sollen groß rechts oder links neben dem Text stehen; strich-horizontal und feine-trennlinie sind die Ausnahmen für mittige Platzierung. Originalschlüssel stammen aus Katalog-Commit 8236b8bfab7322447ec46661c116fa526331af3d, motive/motive.json. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md): Originalmotive erhalten, nicht verzerren.

## Umsetzung

Nur motif-placement.mjs und der neue gezielte Test werden geändert; workflow.mjs nutzt bereits denselben Einstieg. Die Sonderregel greift nur für die 13 belegten Motiv-IDs, neu hinzugefügte Motive und die sechs festen Produktschnitte Edelstahl/Acryl 50/60/80 × 20 mm aus den belegten Türschildlinien. Original-Templateelemente, hochgeladene SVG-Logos, Hauptacryl mit freier Größenwahl und alle anderen Produkte bleiben im bisherigen Pfad.

Die bestehende Suche über echte Vorschau-Pixel, Randprüfung, Abstand und Skalierungsstufen werden wiederverwendet. Die neue Suche beginnt groß und prüft pro Größe beide Seiten des tatsächlichen Textblocks; gleichermaßen passende Seiten nehmen rechts als deterministischen Ausgangspunkt. Erst danach wird verkleinert, bis zur bereits vorhandenen Mindestgröße. Schriftkonturen und deren Drehung bestimmen die Textausdehnung. Die beiden Linien werden mittig in einer freien Lage gesucht. Alle bestehenden Objektkoordinaten und Ressourcen bleiben unverändert; nur das neue Motiv wird proportional skaliert/platziert.

## Prüfung und konkrete Grenze

- Gezielte Platzierungs-, bestehende Editor- und UI-Regressionen: 34/34 grün; zusätzlich eigener Glyphen-/Drehungstest (7/7 neue Platzierungstests insgesamt).
- Separater Realquellencheck gegen die sieben persistierten v7-Pläne: 78/78 Zuordnungen der sechs Kleinprodukte zu den 13 echten Katalogschlüsseln korrekt, 13/13 Ausschlüsse für das Hauptprodukt; SVG-Logo und Templateoriginal bleiben ausgeschlossen. Echte Startdesignobjekte/Schriften eingelesen und auf unveränderte Eigenschaften geprüft.
- **Wichtige Grenze:** Der vorgeschlagene D1-Starttext lässt auf 5 × 2 und 6 × 2 cm bei konservativer Abdeckung seiner echten Objektkonturen keinen Seitenplatz für ein mindestens 10 mm großes Motiv. Beide Linien finden Platz; beim 8 × 2-cm-Start sind alle 13 Proben platzierbar. Die vorhandene Rückmeldung bei fehlendem Platz bleibt erhalten. Es wird ausdrücklich nicht behauptet, alle 13 Motive ließen sich auf jedem Startdesign automatisch neben den unveränderten Text setzen.
- Die Realquellenprobe verwendet konservative Pixelabdeckung der echten Objektboxen; bei den beiden Linien ist das Test-Seitenverhältnis ausdrücklich synthetisch. Sie ist keine Browser-Raster- oder Sichtabnahme. Tatsächliche Desktop-/Mobilbedienung bleibt vor Einsatz zu prüfen.

Nächster Schritt: Patch mit B-Paket sichern und die lokale Vorschau auf einem 5×2- sowie 8×2-Start mit Motiv, Linie und vollem Text prüfen. Keine Originaltexte ohne gesonderten Auftrag verkleinern, verschieben oder verändern. Keine produktive Änderung durch dieses Paket.
