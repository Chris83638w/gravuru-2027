# Menschen/Sternenkinder: Masterlieferung auf GitHub

Auftrag Mikail, 01.11.2026: Herzen gemäß Claude ergänzen, Masterdesigns mit Originalfotos und kompakten Kontaktbögen in kleinen PRs liefern. Quelle: gravuru-2027 #76, Kommentare 6554842969, 6554947711 und 6555001768. Verbindlich bleibt der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Nachprüfung durch Claude, 01.11.2026

Die [neue Sichtprüfung in #76](https://github.com/Chris83638w/gravuru-2027/issues/76#issuecomment-6556230613) ist durch Mikail mit „ergänze es“ bestätigt. Sie ersetzt den früheren Lieferabschluss: Die folgenden Gesamtzahlen beschreiben die Erstlieferung, keine aktuelle gestalterische Freigabe. Andere Pakete werden nach derselben Logik überarbeitet.

Katalog-PR #18 wurde im selben PR auf 28 Master bereinigt: MEM-045/053/054/084 als benannte Dubletten entfernt, MEM-105/122/067/049 behalten, zwei eigene neue Herzgestaltungen ergänzt. Die 28 Originalfoto-Dateien sind bytegleich; problematische Ausschnitte verwenden saubere ovale Masken. MEM-049 enthält genau ein Fotofeld statt einer zusätzlichen gefüllten Foto-Hilfsfläche. MEM-070 korrigiert das tatsächliche Quelldatum 09.14.1956 auf 14.09.1956. Verse neu umbrochen und vergrößert; alle Texte mindestens 3 mm gemessene Versalhöhe. 28 native Importe sowie Kontur-/Abstandsprüfungen bestehen. Sieben Kontaktbögen mit je 640 px breiter Konfiguratoransicht zeigen alle Designs, neue Gestaltungen als „neu / ohne Vorlage“.

Beispielbilder erscheinen auf Schiefer ausschließlich in Graustufen; Originalressourcen bleiben unverändert. Dieselbe Vorschaufunktion wird in Werkstatt, Kundeneditor und Designauswahl verwendet. Die statische Fotovorschau wird vor einer unnötigen Platzhalterberechnung geschützt. Nach Zusammenführung mit main b831ea4: 132 gezielte Tests, 0 Fehler/Skip; Build bestanden (76 Ressourcen, 1 Modell).

Die Kordel-Lochmaße liegen jetzt in Excel main b831ea4 vor: R42 Ø5 bei (19|15)/(181|15), R45 Ø6 bei (20|16)/(230|16), R47 Ø6 bei (21|16)/(179|16), R48 Ø5 bei (51|16,1), R49 Ø5,8 mittig bei y=42,9 mm. Diese fünf Produkte haben feste Kordelbohrungen. Die früher dokumentierte Auslassung von R42/R45/R47/R48 ist damit fachlich aufgehoben; ihre Design- und Variantenprüfung ist der nächste Datenabschnitt.

## Ergänzung der festen Lochbilder und aktueller Prüfstand

[Katalog-PR #97](https://github.com/Chris83638w/gravuru-katalog./pull/97), signierter Stand `7c8b2b085840dfbb704cf7283412f476414b18b0`: fünf blaue SVG-Schablonen, fünf native Rohlingvorschauen, Geometrien und Nachweis. Fünf native Familienprüfungen bestanden; die tatsächlich aufgelösten Lochkoordinaten entsprechen exakt Excel. R49 ist bei x=113,5 / y=42,9 mm zentriert, Ø5,8 bleibt kreisrund. Rechtecke nutzen den vorhandenen Konturweg für feste obere Löcher; eine normale Links/Rechts-Regel würde sie fälschlich mittig setzen. Keine Produktfamilien oder Preise gespeichert.

[Aktuelle Gesamtübersicht](https://github.com/Chris83638w/gravuru-katalog./blob/caf0ea546adb3bd0abce73ac6f6c0864bdd26760/auftraege/2026-10-31-menschen-schiefer/README.md): 1.815 Master, 188 Kontaktbögen in 79 Datenpaketen. Davon genau ein Paket nach der neuen Sichtprüfung überarbeitet; 78 weitere Paketrevisionen und die Designanpassungen an die neuen Kordelbohrungen sind offen. Alte Gesamt- und Größenprüfungen sind ausdrücklich historisch markiert; insbesondere gelten sie nicht für die neue R49-Bohrung oder als Nachweis der 3-mm-Versalhöhe.

Das korrigierte [Herzpaket #18](https://github.com/Chris83638w/gravuru-katalog./pull/18), Stand `f178dc24fb9396bb878d7f37c62c9989f64035c6`, wurde Claude über [Kommentar 6556598889](https://github.com/Chris83638w/gravuru-2027/issues/76#issuecomment-6556598889) zur erneuten Sichtprüfung gemeldet. Nächster Schritt gemäß Claudes Ablauf: geänderte Designs in #18 und Code-PR #96 prüfen, danach weitere Pakete nach derselben Logik überarbeiten. Freigabe bleibt ausschließlich bei Chris.

## Erstlieferung vor der neuen Sichtprüfung

[Gesamtübersicht mit allen 79 Daten-PRs und Kontaktbögen](https://github.com/Chris83638w/gravuru-katalog./blob/cff5f74a12698088e572bdea41ea0ef37ac076fe/auftraege/2026-10-31-menschen-schiefer/README.md).

- 1.817 editierbare SVG-Master in 14 Formatreihen für 40 bestätigte Excel-Zeilen; höchstens 30 Designs pro PR.
- Getrennt nach mit Foto (416), ohne Foto (1.079) und Sternenkinder (322); 184 native Kontaktbögen mit Originalvergleich.
- 472 Foto-Vorkommen aus 25 unterschiedlichen Originaldateien. Jede Fotodatei liegt einmal pro Master separat vor; Byteidentität geprüft. Masken und Uploadhinweise bleiben erhalten, schwarze Foto-Hilfsrahmen sind nicht sichtbar.
- Text bleibt Text. Motive bleiben einzeln und proportional; Außenkonturen und bekannte Bohrungen blau. Die zwei Herzmotive MEM-093/MEM-126 wurden für die gemeinsame nutzbare Fläche der Herzgrößen neu positioniert. Der Spruchkreis bei Kordelherz MEM-122 wurde vergrößert und neu verteilt.

Lieferform 2: Produktbindungen (`ziele: []`) und Freigaben (`freigabe: null`) bleiben offen. Die erste Lieferung wurde Claude über [Kommentar in #76](https://github.com/Chris83638w/gravuru-2027/issues/76#issuecomment-6555734216) gemeldet. Kein Merge oder Live-/Shopify-Schreibzugriff durch diesen Auftrag.

## Maße und Abgrenzung

Korrigierte Excel aus main: R11 240×192, R12 182,2×133,1, R39 200×200, R40 250×250 mm. Beim Stern R16 entspricht die native Zeichenfläche der von Chris akzeptierten tatsächlichen Originalkontur (ca. 200,0004×190,599 mm); das nominale Excel-Maß 200,7×190,8 mm bleibt dokumentiert. R49 bleibt 227×271,1 mm; nur die Originalkontur wird gemäß Chris auf die Lieferantenmaße eingepasst, das Dekor bleibt proportional.

Historischer Erstlieferstand: R42/R45/R47/R48 waren wegen damals fehlender Lochmaße ausgeschlossen; durch PR #97 fachlich aufgehoben (siehe oben). Geschnittene Herzen und Bruchkante bleiben getrennt. Knochen R14 gehört zum anderen Hundeauftrag #85. MEM-146 ist eine Motivquelle, keine vollständige Gestaltung; MEM-381 enthält für Sternenkinder unpassende Tiermotive. Keine zusätzlichen Produktfamilien, Artikelnummern oder Preise erfunden.

## Code und Prüfung

Die Anpassungen aus 16d7e36 und ea63726 wurden zunächst auf main 10eee72 übertragen und anschließend mit main 781d743 zusammengeführt. Aktuelle Acrylglas-/Rückplattenvorschau, Konturformen und Motivregeln bleiben erhalten. Enthalten sind Original-Pfadmasken, verlustfreie Fotoressourcen, unabhängiger Uploadhinweis und korrekte Schiefervorschau. Dieser Code-PR enthält keine großen SVG-/ZIP-/XZ-Exporte. Die ursprünglichen lokalen Commits bleiben als Sicherung erhalten; GitHub-Commits sind gültig signiert.

Nach der Zusammenführung: 89 gezielte Tests in einem vollständigen Lauf bestanden, 0 Fehler; Build bestanden (76 Ressourcen, 1 Modell). Der lokale Windows-Teststarter ersetzt ausschließlich den nicht verfügbaren Befehl `python3` durch das vorhandene Python, ohne Testinhalte zu verändern. Der Katalog-Metadatenbuild validiert 13 vorhandene Familien ohne Fehler.

Alle 1.817 Master wurden nativ importiert und geprüft. 5.405 Übertragungen auf die bevorzugten Ausführungen der Zielgrößen bestehen ohne Platzierungsfehler. Die 552 Hinweise zum proportionalen Einpassen betreffen leicht abweichende Seitenverhältnisse innerhalb der Excel-Formatreihen; Motive werden nicht gestreckt. Zusätzliche Befestigungsvarianten sind nicht durch diese 5.405 Prüfungen abgedeckt. Neue Herz- und Sternformen wurden zusätzlich visuell überprüft. Technische Prüfungen ersetzen Chris’ gestalterische Freigabe nicht.

GitHub-Lieferung: gravuru-katalog. PRs #18–#96, mit eindeutigen Zuordnungen und unveränderlichen Kontaktbogen-Links in der Gesamtübersicht. Code separat in gravuru-2027 PR #96. Große lokale ZIPs vom 31.10. sind Sicherungen und gehören nicht zur GitHub-Lieferung.
