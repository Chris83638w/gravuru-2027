# Masterregeln für Konfigurator und Druck – 04.10.2026

Aufgabenbranch `task/master-rules-print-20261004`, Basis `7a533ab133cf7a4a087498802bbc6000e849f335`.

- **Masterbegriffe:** „Motiv“ = einzelnes Element zum Hinzufügen. „Design“ = gesamte Gestaltung der Platte/des Acrylglases einschließlich Foto, Texten und hinzugefügten Motiven. Verbindliche Nutzerfestlegung vom 04.10.2026 für künftige Kommunikation, Oberfläche und Dokumentation. Kein Auftrag, vorhandene technische IDs oder Datenbestände umzubenennen.
- **Druck:** Überlappungen sind erlaubt; keine Überlagerungswarnungen. **Gravur:** weiterhin Hinweise. Diese Masterregel folgt dem Bearbeitungsprofil, nicht einer einzelnen Vorlage. Mechanische Warnungen bleiben unabhängig davon aktiv.
- **Texte:** Beim ersten Fokus je Textfeld/Design wird der gesamte Beispieltext markiert (Maus, Touch, Tastatur). Weitere Klicks erlauben normale Cursorplatzierung. Vorhandene Rechte und Originaltexte bleiben erhalten, bis der Nutzer etwas eingibt.
- **Designauswahl – verbindlich für alle Produkte:** Bei null oder genau einem auswählbaren Design gibt es keine Auswahlfläche und keinen Designs-Tab. Erst ab zwei auswählbaren Designs erscheint der Tab. Die Regel gilt im gemeinsamen Konfigurator produktübergreifend, nicht nur für Acrylglas. Die vorhandene Regel wurde im Browser bestätigt. Zwei Designs bleiben auswählbar. Das aktuelle Testprodukt enthält tatsächlich „Unser Anfang“ und „Unser kleines Glück“; keines wurde gelöscht.
- **Downloads:** Druckexport ausschließlich Werkstatt/Backend. Auf ausdrücklichen Nutzerwunsch ist der Exportbutton während der Erprobung wieder direkt auf `/` der owner-privaten Testseite sichtbar; eine separate Ansicht ist dafür nicht nötig. Die Produktquelle behält ihre Operator-Prüfung. Keine neue öffentliche Freigabe. Ein Kundenkonto-Download benötigt später authentifizierten Nutzer und serverseitig bestätigten, zugehörigen bezahlten Kauf. Diese Konto-/Bestellstrecke ist weiterhin NICHT angebunden; es wurde keine Downloadberechtigung durch einen bloßen Browserparameter simuliert.
- **Weiß:** Standard nur unter gedruckten Flächen inklusive Text, Foto, festem Design und zusätzlichen Elementen. Freies Acryl und transparente Löcher bleiben frei. Die motivbezogene PDF-Weißebene enthält jetzt geometrisch beschnittene geschlossene Flächen ohne zusätzlichen seitenfüllenden Clip-Container. „Weißkanal prüfen“ zeigt im Dialog dieselbe Maske: Weiß = Weißdruck, kariert = transparent. Der normale weiße PDF-Seitenhintergrund ist davon zu unterscheiden.
- **Überdruck:** Vorgabe bis 1 mm, tatsächlich nur bei Druckfarbe an der äußeren Kontur. Randfreies Motiv: kein Zusatzrand/Überdruck, 150 × 200 mm. Bei Randdruck: 152 × 202 mm bei weiterhin 150 × 200 mm Schnittmaß; Farbe wird nur an den tatsächlich bedruckten Randstellen fortgesetzt. Runde Ecken/Ellipsen werden bei der Prüfung berücksichtigt. Innenmotiv wird nicht skaliert. Weißüberdruck bleibt separat 0 mm als Default.

## Prüfung

167 Quelltests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Chromium: erster Namensfokus markiert alle 12 Zeichen; Tippen ersetzt den Text, späterer Klick positioniert den Cursor. Derselbe überlagernde Teststand zeigt im Druck keine Warnung und bei Gravur den Hinweis. Kundenansicht ohne Druckbutton. Ein-Design-Sicht ohne Auswahl; Zwei-Design-Sicht mit Auswahl. Keine Seitenfehler.

Browserexport: randfreies, vollflächiges und nur rechts randberührendes synthetisches Motiv geprüft. Beim rechten Randdruck bleibt links die Alpha-Maske leer. Die tatsächlich erzeugte neue Roland-PDF des Designbeispiels hat 150 × 200 mm; isolierte Weißebene an freien Stellen Alpha 0 und im Foto Alpha 255. Weißebene ohne `W*`-Seitenclip. PNG-/PDF-Bildschirmdarstellungen allein wurden nicht als RIP-Nachweis gewertet.

**CorelDRAW-Import weiterhin NICHT AUSGEFÜHRT:** Nutzer meldete dort Vollflächenweiß. Cloud-Dateiprüfung reproduziert kein Vollflächenweiß, Ursache im konkreten Corel-Import bisher unbestätigt. Die geänderte PDF-Struktur ist anhand der Datei geprüft, aber keine behauptete Corel-Kompatibilitätsfreigabe. Nächster Vergleich: Weißkanal-Vorschau und neu heruntergeladene PDF in CorelDRAW. Farbmotiv bleibt RGB/600-dpi-Raster, Weiß/Kontur Vektoren; RIP/ICC/Produktionsfreigabe offen.

## Ergänzung: Vorschau und Texteingabe

Vollständiges Design oben links wie im Konfigurator, mit Foto/Texten/Sockel. Vorschau groß und Hinweisrahmen bündig; bei den ersten Änderungen kurz aufleuchten, nicht dauerhaft. Schriftgrößen im Kundeneditor nur in ganzen mm; Plattenformat bleibt unabhängig. Aktueller CMYK-/300-dpi-Stand und Prüfungen: [CMYK-DIREKTBEARBEITUNG.md](CMYK-DIREKTBEARBEITUNG.md); ältere RGB-/600-dpi-Aussagen oben sind historisch.

## Ergänzung: neutrale Oberfläche und gezielte Elementfreigabe

- Oberfläche in Weiß/Hellgrau/Graphit; Druckfarben, Fotos und Originaldesign bleiben farblich unabhängig.
- Einzelne Vorlagenelemente bleiben zunächst gegen Löschen geschützt. Backend-Recht „Nach Entsperren löschbar“ erlaubt bewusstes Entsperren in der Kundensitzung; technische Elemente bleiben geschützt. Die Originalvorlage wird niemals gelöscht. Rückgängig stellt das Element wieder her und sperrt das Löschen erneut. Geometriesperren bleiben unabhängig. Neu hinzugefügte Motive bleiben direkt löschbar.
- Beim ausgewählten, freigegebenen Motiv: runde Farbpunkte Schwarz, Weiß, Grau, Terrakotta, Dunkelgrün und Goldton plus freie Farbe; Verkleinern, Vergrößern und Drehen in 15°-Schritten nutzen vorhandene Bedienlogik/Rechte. Goldton ist eine normale Druckfarbe.
- Vollbild schließt bei Klick auf die seitlichen weißen Flächen links/rechts außerhalb der Produktvorschau. Bedienelemente und das Produkt selbst lösen kein Schließen aus.
- Eine gelungene Kundengestaltung später aus einer Bestellung als neuen Produktentwurf übernehmen: gewünschter Folgeschritt, noch keine angebundene Bestellfunktion oder automatische Veröffentlichung.

## Ergänzung 05.10.2026: Farbdruck, Matt/Hochglanz, UV-Marker

- Farbiger, vollflächiger Druck ausdrücklich berücksichtigen. Farben erhalten, Kontur und Bohrungen einhalten; Weiß unter tatsächlich bedruckten Bereichen. Standard weiterhin ohne Überdruck, optional 1 mm nur bei Außenrandkontakt.
- Bestätigt am 06.10.2026: Vorderseitiger UV-Aufdruck wirkt matt mit feinen Druckpunkten. Hinterdruck wird durch die glatte, klare Acrylvorderseite betrachtet und wirkt glänzend. Keine Lackfunktion daraus ableiten.
- „Typische UV-Druckmarker“ meint feine Druckpunkte/Stippchen, keine Passermarken. Sie gehören ausschließlich zur Materialvorschau innerhalb der bedruckten Fläche, niemals als künstliche Rasterstruktur in die Druckdatei. Bestehende RDG_WHITE-/Kontur-/Mimaki-Weißersatzregeln bleiben gültig.
- Farbprüfbeispiel und Formserien-Abnahme: [DASHBOARD-FORMSERIEN.md](DASHBOARD-FORMSERIEN.md). Keine Aussage über physische Druckqualität, Lack oder reale Maschinenabnahme daraus ableiten.

Umsetzung für freie Formprodukte: [UV-Druckansicht](DASHBOARD-UV-DRUCKANSICHT.md).

## Ergänzung 06.10.2026: Gravurfarbe ist keine Druckfarbe

Bei Acryl und Verfahren Gravur keine bräunlichen/farbigen Drucklinien anzeigen. Die Materialansicht zeigt helle, angenäherte Gravur. Quellhelligkeit bestimmt die relative Stärke: dunkle Bereiche stärker, weiße/transparente Bereiche frei. Das erhält Fotoabstufungen statt ein gesamtes Foto weiß zu füllen. Originaldateien und echte Graustufen-/Vektorausgabe bleiben erhalten; die helle Vorschaufarbe ist kein RDG_WHITE und keine zusätzliche Weißseparation. Keine Laserleistungs- oder Maschinenfreigabe daraus ableiten. [Umsetzung und Prüfung](DASHBOARD-ACRYLGRAVUR-VORSCHAU.md).
