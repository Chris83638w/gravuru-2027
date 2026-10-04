# Visuelle Prüfung – kompakte Direktbearbeitung

Source visual truth: Nutzerscreenshot im Chat vom 04.10.2026 (großes weißes Textformular über dem Acrylfoto). Auftrag ist ausdrücklich Verbesserung dieses Bereichs, keine identische Nachbildung des unerwünschten Formulars. Reproduzierte Baseline aus Commit 911874e: `/workspace/gravuru-uv-pilot-private/compact-before.png`.

Implementation: `/workspace/gravuru-uv-pilot-private/compact-desktop.png`, `/workspace/gravuru-uv-pilot-private/compact-mobile.png`.

Desktop: Quelle und Umsetzung 1512 × 1080 Pixel / CSS-Pixel, deviceScaleFactor 1. Gleiche Route, Original-Beispielfoto, ausgewählte Überschrift im Bearbeitungszustand. Beide Bilder gemeinsam in einem Tool-Ergebnis betrachtet; keine behauptete pixelgenaue Übereinstimmung mit dem anders beschnittenen Nutzerscreenshot. Mobil: 390 × 844, Faktor 1, zusätzliche responsive Kontrolle bei zum Editor gescrolltem Dokument.

## Vergleich und Korrekturen

- P1, Ausgangszustand: großes Formular verdeckt Gesicht und Foto. Ersetzt durch etwa 44 px hohe Werkzeugleiste am Vorschaurand und einzeilige Texteingabe am ursprünglichen Text. Nachweis Desktop Vorher/Nachher: Foto frei, restliches Design unverändert. Kein zusätzliches Bildmaterial erzeugt.
- P2, erster Mobilvergleich: obere Werkzeugleiste überlappt Vollbild. Korrektur: mobile Leiste an den unteren Vorschaurand. Nachkontrolle im neuen Mobilbild: Schrift, Größe, Farbe und Abschluss sichtbar, Vollbild bleibt am oberen Rand. Keine horizontale Überbreite.

## Fünf Prüfflächen

- Typografie: kompakte UI-Schrift, lesbare 16-px-Minimaleingabe; die Texteingabe darf eine Ersatzschrift verwenden, die echte Designschrift bleibt im gerenderten Design und Export. Keine Änderung an Schriftdaten.
- Abstände: Leiste außerhalb der Hauptfotofläche; kleine Inline-Eingabe statt Formularblock; Responsive-Lage geprüft. Der Nutzer kann unter der gewählten Stelle liegende Designteile während der Eingabe vorübergehend verdeckt sehen.
- Farben: vorhandenes dunkles Grün, weiße Oberfläche, runder Farbpunkt; sichtbarer Fokus und selektierter Text. Keine neuen Markenfarben.
- Bildqualität: Originalfoto, Linien und Dekoration aus bestehender Vorlage unverändert; keine Neugenerierung oder Rasterersetzung der Designassets.
- Beschriftungen: Schrift, mm, Abbrechen/Fertig. Masterbegriffe dokumentiert. Ungefragte Neugestaltung der übrigen Designübersicht unterlassen.

Browserinteraktionen: Desktop/Mobil; Textänderung live, Enter/Abbrechen, erster Auswahlbereich, Größe in ganzen mm, Fotoeditor und Doppelklick, Rechte, kein Uploadscroll, PDF-Download. Keine Konsolen-/Seitenfehler im geprüften Ablauf. Ausschnitte waren im voll aufgelösten gemeinsamen Vorher-/Nachhervergleich lesbar, deshalb kein zusätzlicher vergrößerter Crop nötig.

P0/P1/P2 offen: keine im geprüften Bereich. Keine Aussage über Farbverbindlichkeit oder private Sitzungsdaten anderer Browser.

final result: passed

## Nachtrag: obere linke Vorschau

Mobilbild `/workspace/gravuru-uv-pilot-private/complete-mini-feedback.png` bei 390 × 844 visuell geprüft: vollständige Acrylszene inklusive Beispielfoto, Design, Texten und Sockel sichtbar; proportionale vergrößerte Vorschau oben links. Leere Ränder innerhalb des Hinweisrahmens entfernt. Zunächst fehlendes Beispielfoto korrigiert: Vorschau-only-Markierung umfasst auch das Foto selbst und darf in der Bildschirmkopie nicht pauschal entfernt werden. Verschachtelte SVG-Größen behalten ihre Designmaße. Bediengriffe werden nicht dupliziert. Rahmen transient und ohne Bewegungsanimation. Kein neuer Bildinhalt und keine privaten Daten.
