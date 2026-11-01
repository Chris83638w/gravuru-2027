# Menschen/Sternenkinder: Masterlieferung auf GitHub

Auftrag Mikail, 01.11.2026: Herzen gemäß Claude ergänzen, Masterdesigns mit Originalfotos und kompakten Kontaktbögen in kleinen PRs liefern. Quelle: gravuru-2027 #76, Kommentare 6554842969, 6554947711 und 6555001768. Verbindlich bleibt der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Gelieferter Stand

[Gesamtübersicht mit allen 79 Daten-PRs und Kontaktbögen](https://github.com/Chris83638w/gravuru-katalog./blob/cff5f74a12698088e572bdea41ea0ef37ac076fe/auftraege/2026-10-31-menschen-schiefer/README.md).

- 1.817 editierbare SVG-Master in 14 Formatreihen für 40 bestätigte Excel-Zeilen; höchstens 30 Designs pro PR.
- Getrennt nach mit Foto (416), ohne Foto (1.079) und Sternenkinder (322); 184 native Kontaktbögen mit Originalvergleich.
- 472 Foto-Vorkommen aus 25 unterschiedlichen Originaldateien. Jede Fotodatei liegt einmal pro Master separat vor; Byteidentität geprüft. Masken und Uploadhinweise bleiben erhalten, schwarze Foto-Hilfsrahmen sind nicht sichtbar.
- Text bleibt Text. Motive bleiben einzeln und proportional; Außenkonturen und bekannte Bohrungen blau. Die zwei Herzmotive MEM-093/MEM-126 wurden für die gemeinsame nutzbare Fläche der Herzgrößen neu positioniert. Der Spruchkreis bei Kordelherz MEM-122 wurde vergrößert und neu verteilt.

Lieferform 2: Produktbindungen (`ziele: []`) und Freigaben (`freigabe: null`) bleiben offen. Die erste Lieferung wurde Claude über [Kommentar in #76](https://github.com/Chris83638w/gravuru-2027/issues/76#issuecomment-6555734216) gemeldet. Kein Merge oder Live-/Shopify-Schreibzugriff durch diesen Auftrag.

## Maße und Abgrenzung

Korrigierte Excel aus main: R11 240×192, R12 182,2×133,1, R39 200×200, R40 250×250 mm. Beim Stern R16 entspricht die native Zeichenfläche der von Chris akzeptierten tatsächlichen Originalkontur (ca. 200,0004×190,599 mm); das nominale Excel-Maß 200,7×190,8 mm bleibt dokumentiert. R49 bleibt 227×271,1 mm; nur die Originalkontur wird gemäß Chris auf die Lieferantenmaße eingepasst, das Dekor bleibt proportional.

R42/R45/R47/R48 bleiben bis zu bekannten Lieferanten-Lochmaßen ausgeschlossen. Geschnittene Herzen und Bruchkante bleiben getrennt. Knochen R14 gehört zum anderen Hundeauftrag #85. MEM-146 ist eine Motivquelle, keine vollständige Gestaltung; MEM-381 enthält für Sternenkinder unpassende Tiermotive. Keine zusätzlichen Produktfamilien, Artikelnummern oder Preise erfunden.

## Code und Prüfung

Die Anpassungen aus 16d7e36 und ea63726 wurden zunächst auf main 10eee72 übertragen und anschließend mit main 781d743 zusammengeführt. Aktuelle Acrylglas-/Rückplattenvorschau, Konturformen und Motivregeln bleiben erhalten. Enthalten sind Original-Pfadmasken, verlustfreie Fotoressourcen, unabhängiger Uploadhinweis und korrekte Schiefervorschau. Dieser Code-PR enthält keine großen SVG-/ZIP-/XZ-Exporte. Die ursprünglichen lokalen Commits bleiben als Sicherung erhalten; GitHub-Commits sind gültig signiert.

Nach der Zusammenführung: 89 gezielte Tests in einem vollständigen Lauf bestanden, 0 Fehler; Build bestanden (76 Ressourcen, 1 Modell). Der lokale Windows-Teststarter ersetzt ausschließlich den nicht verfügbaren Befehl `python3` durch das vorhandene Python, ohne Testinhalte zu verändern. Der Katalog-Metadatenbuild validiert 13 vorhandene Familien ohne Fehler.

Alle 1.817 Master wurden nativ importiert und geprüft. 5.405 Übertragungen auf die bevorzugten Ausführungen der Zielgrößen bestehen ohne Platzierungsfehler. Die 552 Hinweise zum proportionalen Einpassen betreffen leicht abweichende Seitenverhältnisse innerhalb der Excel-Formatreihen; Motive werden nicht gestreckt. Zusätzliche Befestigungsvarianten sind nicht durch diese 5.405 Prüfungen abgedeckt. Neue Herz- und Sternformen wurden zusätzlich visuell überprüft. Technische Prüfungen ersetzen Chris’ gestalterische Freigabe nicht.

GitHub-Lieferung: gravuru-katalog. PRs #18–#96, mit eindeutigen Zuordnungen und unveränderlichen Kontaktbogen-Links in der Gesamtübersicht. Code separat in gravuru-2027 PR #96. Große lokale ZIPs vom 31.10. sind Sicherungen und gehören nicht zur GitHub-Lieferung.
