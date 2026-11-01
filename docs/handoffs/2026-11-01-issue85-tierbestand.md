# Issue 85 – Hunde-/Katzen-Bestände, 01.11.2026

Fortsetzung der vorherigen Rasse-/Quellenarbeit nach Nutzerantwort „alles was du gemacht hast“. Vorhandene Rasse-Schilder bleiben unverändert; der runde Auftrag läuft separat. Verbindlich: [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Ergebnis und Grenzen

18 rechteckige LF2-Designmaster (16 Bestandsübernahmen und zwei neue Gesamtgestaltungen), sechs getrennte Formstudien aus Knochenvorlagen. 13 weitere Türschild-Bestände sind fünf vorhandenen Mastern zugeordnet; keine zweite Anlage. 111 Hinweis-Hunde gehören zu Paket 1, vier Hausnummern zu Paket 5. Insgesamt 163 Quellzuordnungen plus zwei neue Designs. Alle ursprünglichen Bestandsdateien und die früheren Rasse-Designs unverändert.

Die Vorlagen enthalten neben Gestaltung auch Druck-Hintergrundfarben, weiße/schwarze Alternativfassungen, Produktionsnummern außerhalb der Platte und technische Bohrmarkierungen. Der Generator trifft pro Quelle dokumentierte Gestaltungsentscheidungen; Texte bleiben bearbeitbar, Motive proportional, Fotobereiche als echte Foto-Slots. Breite Druckflächen werden teilweise als Kontur erhalten, damit die Gravur nicht Schrift/Motiv zudeckt. Keine erfundenen Tierfotos. Die Schriftwahl folgt dem Master; Arial bei Mailo → Raleway, andere nutzbare Vorlagenschriften erhalten.

Die Formstudien liegen ausschließlich unter auftraege/issue85-tierbestand-20261101/studien, nicht im Designpool. Ihre Zielkennung ist offen. Zwölf Quellen warten auf Schriftdateien/Ersatzentscheidung, vier davon zusätzlich auf Form/Kennung. Beide Fragen sind dem Nutzer gestellt; bisher keine Antwort. Keine nicht autorisierten Ersatzschriften.

## Prüfung

- Echter HTTP-Endpunkt /api/workshop/designs/target-preview, privater Prüfstand mit In-Memory-Werkstatt, ohne Import/Shop-Zugriff.
- 24 Gestaltungen × 3 Materialien = 72 HTTP-200-Vorschauen; je zehn Größen = 720 Größenprüfungen. 32 Zielbewertungen passt, 40 prüfen, keine passt-nicht-Bewertung/kein Fehler.
- Warnungen zu Foto-Inklusivangaben/Aufpreisen und feinen Originalkonturen unverändert dokumentiert. Das sind keine Produktionsfreigaben.
- Sechs Kontaktbogenseiten visuell gelesen, Textüberlappung und Bogenabstand korrigiert; mobile 390-px-Ansicht ohne Überlauf. Native SVGs im Kontaktbogen werden bytegleich mit gemeinsamen Texturen rekonstruiert.
- 18 eindeutige neue Kennungspfade gegen Git-Baum geprüft; D13/D14 nicht in TSUV-Quellbögen. SVG-Ebenen/Prüfsummen, zehn sizes und alle Freigaben null geprüft.
- build-katalog.py --metadata-only: 11 Familien. PDF/Excel unverändert; sachfremde generierte KATALOG.md-Differenz nicht übernommen.

## Abhängigkeiten

Katalog-main 2e308ce enthält die beiden Acryl-3-mm-Familien noch nicht. Prüfung mit unveränderten Familien aus Katalog-PR 11, Commit 489fd3292f693a2361a06ab503bb763a92d38ec4, ausschließlich im Prüfstand. Neue Designziele benötigen diesen PR. Code-Commit 37c41e05dc6cfd668d6887552a6649e837f1b931 des runden Auftrags liefert mounting=K00; diese Funktion wird hier nicht erneut implementiert.

Master 80 × 53,3 mm und zehn Rechteckgrößen stammen aus steel-door-signs. Native scaleTemplate-Strecke prüft alle Größen; kein neues Übertragungsskript für Geometrie/Preise. Das im Katalog-README erwähnte transfer-design-series.py fehlt auf Code-main; deshalb noch keine gesonderten Größen-SVG-Dateien erzeugt.

## Dateien und Reproduktion

Code: scripts/design-pruefung/tierbestand.py (quellengebundene Komposition), tierbestand-preview.mjs (echter HTTP-Prüfstand), tierbestand-screens.mjs (Browserkontrolle). Katalog: designs/tierbestand-*/ sowie auftraege/issue85-tierbestand-20261101/ mit Kontaktbogen, Zuordnung, Studien, Warnungen und Prüfsummen.

1. Python-Umgebung wie read-bestand-designs.py (einschließlich Pillow, pdfplumber, pikepdf und fontTools); GRAVURU_PYTHON auf diesen Interpreter setzen.
2. `python scripts/design-pruefung/tierbestand.py --katalog <Katalog> --out <Entwuerfe>`.
3. Katalog-PR 11 als origin/review-11 abrufen. `node scripts/design-pruefung/tierbestand-preview.mjs --katalog=<Katalog> --designs=<Entwuerfe> --out=<Pruefung> --runtime-code=<Checkout-von-37c41e0>`.
4. Für Screenshots GRAVURU_NODE_MODULES (Playwright) und GRAVURU_BROWSER setzen; `node scripts/design-pruefung/tierbestand-screens.mjs <Pruefung>`.

## Nächster Schritt

Schrift-/Formkennung beantworten, offene Quellen ergänzen, Acryl-Abhängigkeit auflösen, gesonderte Größen-SVGs erzeugen und vollständiges Paket erneut abschließend prüfen. Der aktuelle Stand ist ein Draft zur Einzelprüfung. Kein Merge, kein Import, nichts live; Issue 85 bleibt offen.
