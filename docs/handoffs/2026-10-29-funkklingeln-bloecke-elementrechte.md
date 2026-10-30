# Funkklingeln: Auswahlblöcke und bearbeitbare Designelemente

29.10.2026 · Codex/Astra · Ergänzung zu PR #60, eigener Branch.

## Verbindlicher Auftrag

Quelle: Chris im Chat am 29.10.2026: „bei Format und Position doch lieber in Blöcken untereinander. Wichtig. Bei den Designs kann auch elemente löschen oder verschieben.“ Dazu AGENTS.md, Fachlogik vom 29.10.: Motive sind löschbar/ersetzbar; nur als Einheit verkaufte Druckdesigns sind ausgenommen. Dies betrifft native Funkklingeltexte und -motive, keine Gerätelage oder Fertigungskonturen. Design-Master: https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md. Kein Motiv und keine Quellkomposition wird aus dem Ausgangsdesign entfernt.

## Änderungen

- Im Untertab Format & Position: zwei umrandete Blöcke untereinander, je Option eine kompakte bebilderte Zeile, Maße und Preis getrennt. Die übrigen Untertabs und Hauptschritte bleiben erhalten.
- prepare-doorbell-design-repair.mjs bereitet neue Revisionen mit customerEditable=true sowie move/delete für native Texte und Motive vor; Motive zusätzlich replace. Vorhandene technische/feste Sperren sind nicht betroffen. Die Rechte sind persistierbare Revisionsdaten, kein Frontend-Bypass.
- Die Definition erlaubt bearbeitbare native Dekorationen mit über alle Formate stabiler Identität. Alte feste Format-Dekorationssätze bleiben lesbar. Gelöschte bearbeitbare Motive werden beim Format-/Positionswechsel nicht wieder eingefügt.
- Die bestehende Ausnahme für eine exakt unveränderte native L-förmige Vorlage bleibt erhalten, unabhängig von ihrer Bearbeitbarkeit. Verschobene Motive unterliegen weiter den bestehenden Flächen-/Kollisionsprüfungen. Rechtefreigabe bedeutet keine Freigabe ungültiger Positionen.

## Nachweise

- 14/14 Tests: prepare-doorbell-design-repair, doorbell-selection, doorbell-presentation. Ein bestehender Test prüft weiterhin die Ablehnung inkonsistenter Element-IDs; erwartete Fehlermeldung an die neue erlaubte Bearbeitbarkeit angepasst.
- Reale exportierte Kopien: 126 Produktzuordnungen, 42 Modelle, 30.240 Auswahlfälle, 8.064 angepasste Designansichten; keine Quelldatei geändert.
- Zusätzlich alle 126 Definitionen validiert; für 12.096 Design-/Format-/Positionskombinationen insgesamt 47.628 Elementfälle jeweils gegen den Rechtevalidator auf Verschieben und Löschen geprüft. Dies ist eine Rechteprüfung; die physische Platzierung bleibt gesondert geprüft.
- Browser: Gestaltungslinie gelöscht (4 → 3 Ebenen), Rückgängig (3 → 4); Kreis im Design D06 unabhängig vom Text verschoben. Verschieben außerhalb der Gestaltungsfläche zeigt den bestehenden Hinweis; nach Platzierung innerhalb verschwindet er. Prüfeingriffe wieder rückgängig gemacht.
- Build: editor-efa1b309449c1c5e.mjs; 113 Module/14 Styles; gzip 389.039 Bytes.

## Abgrenzung und nächster Schritt

Nur lokale Vorschau und eigener Branch. Keine Shopify-Schreibzugriffe, kein Live-Deployment, keine Mutation aktiver Produktrevisionen. Für eine spätere Veröffentlichung müssen die vorbereiteten Rechte gemeinsam mit den reparierten Designs als neue Katalog-/Produktrevision übernommen werden; ein reines UI-Deployment hebt alte gespeicherte Sperren nicht auf. Bestehende Draft-Katalogrezepte PR #7 sind um diesen neuen Auftrag zu ergänzen. Die lokale Vorschau liest das aktualisierte Vorbereitungsskript und demonstriert bereits diese neue Revision.


