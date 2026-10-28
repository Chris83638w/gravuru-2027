# Nachtrag 4 – Fokus, Lupe und Millimeterhilfen

Stand: Codex / Astra, 28.10.2026. Branch `dev/konfi-zoom-fokus-20261028-astra`, Basis `main` `26952e48` (enthält `0643c70`; danach nur STATUS). Auftrag und Bildvorlage von `dev/konfi-ux-nachtrag-20261028-claude` gelesen. Keine Veröffentlichung, kein Merge, keine Live-Aktion.

## Reihenfolge und Nachtrag 3

Galerie zuerst: [PR #42](https://github.com/Chris83638w/gravuru-2027/pull/42), Head `bfbd9188`, ist unverändert als Entwurf offen. Der kalte Anfragepfad wartet nicht mehr auf den gesamten Katalog; Aufwärmen läuft im Hintergrund, Vorbereitung und erneuter Versuch haben einen eigenen Galeriehinweis. 105 gezielte Tests bestanden. Dort bleiben ein Zeitnachweis mit aktueller Shop-/Katalogkopie und der Linux-Vollauf offen; die früher gemessenen historischen Testprodukte ersetzen diese Nachweise ausdrücklich nicht. Claude wurde dazu auf GitHub gefragt; beim letzten Lesen keine Antwort in #42. Der Zoom-PR enthält diese separaten Galerieänderungen nicht. Die Codedateien der beiden PRs überschneiden sich nicht. Eine separate lokale Kopie mit beiden Ständen wurde gemeinsam gebaut und mit 146/146 gezielten Tests ohne Skip geprüft. Das ist noch kein Merge und kein aktueller Echtdaten-Zeitnachweis. Beim Zusammenführen beide STATUS-Absätze erhalten.

## Umsetzung

- Handy: Antippen eines Elements oder Fokus auf sein Textfeld zentriert die Ansicht in 250 ms; bei reduzierter Bewegung sofort. Zielbreite 70 %, höchstens 300 %, kein Vergrößern ab 50 % vorhandener Breite. Fokusname kommt aus der beschrifteten Textliste. Wechsel bleibt direkt, Abwahl, Zurück/Weiter und „Ganzes Schild“ setzen die Ansicht zurück.
- Dunkle Prozentanzeige, Minikarte und alter Zoomhinweis entfernt. Handy zeigt „Fokus: Nachname“ und einen weißen Rückkehrknopf. Desktop bleibt ohne automatischen Fokus, mit weißen − / + / ⤢ und Mausrad.
- Runde 110-px-Lupe mit 3-facher Darstellung und Fadenkreuz beim Ziehen/Skalieren. Sie klont die tatsächlichen Material-/SVG-/Fotoebenen, entfernt Bediengriffe und Hilfslinien, verwendet eigene SVG-IDs und verschwindet beim Loslassen/Abbrechen. Private Anzeigeebene außerhalb der Originalszene; keine Speicherung, Undo- oder Exportaufrufe.
- Bestehendes Einrasten um Objektkanten/-mitten und Sicherheitsränder erweitert. Toleranz 1,5 physische mm, vorhandene Hysterese bleibt. Kontur-/Lochprüfung weiter über gemeinsame Geometrie. Pinke Hilfslinien und lesbare Zuordnung nur während des Verschiebens. Abstand zum wirklichen äußeren Plattenrand, einschließlich gedrehter Objekte, ovaler/runder und freier Konturen; gemeinsame 0,002-mm-Konturteilung. Kein Abstand zu einem bloßen umschließenden Rechteck.
- Freie Platte doppelt antippen/klicken: 200 %, erneut Gesamtansicht. Doppeltippen auf Text bleibt Bearbeitung. Zwei Finger bleiben reine Ansichtsgeste; Objektgeometrie, Schriftgröße und Fotobeschnitt unverändert.
- Tastaturfall nachgebessert: Eingabefeld scrollt ausschließlich in seiner Liste. Die Vorschau und der Rückkehrknopf bleiben unter der Kopfzeile; bei geöffneter Tastatur wird die gedockte Formatleiste ausgeblendet. Preis und Schrittleiste bleiben erreichbar.

## Prüfungen

Windows / Node 24.20.0:

| Vollauf | Ausgangsstand | Nachtrag 4 |
|---|---:|---:|
| variant-m | 398 erfolgreich / 404 | 412 erfolgreich / 418 |
| variant-m Umgebungsfehler | 6 | dieselben 6 |
| workshop | 1.207 erfolgreich / 1.372 | 1.207 erfolgreich / 1.372 |
| workshop Umgebungsfehler / übersprungen | 158 / 7 | dieselben 158 / 7 |

Fehlernamen vor/nach verglichen: keine neuen Fehler. Die PDF-/Python- und sonstigen bereits dokumentierten Windows-Umgebungsfehler sind nicht als Produktfehler gezählt, aber der Vollauf wird ausdrücklich nicht als grün bezeichnet. Keine Assertions entfernt oder Fehlfälle übersprungen. Neue Fokus-Anforderungen ersetzen nur die alten Sollwerte für die überholte Autozoom-Grenze/Bedienelemente.

Kombination aus #42 und diesem Stand: **146/146 gezielte Tests bestanden**, kein Skip; gemeinsamer Build `editor-d75a7992108ad502.mjs`. Die Testkopie enthielt zunächst eine fehlende bestehende JSON-Testdatei; nach Übernahme dieser Datei bestanden sämtliche Tests ohne Codeänderung.

31/31 gezielte Zoom-/Geometrie-/Lupe-Tests bestanden; zusätzlicher neuer Test für das Scrollen ausschließlich in der Eingabeliste im vollständigen Editorlauf bestanden. Prüfungen enthalten 1,5-mm-Toleranz mit physischem Skalierungsfaktor, Hysterese, 120×80-mm-Platte mit 15 mm Randabstand, Rotation, echte Konturen, Fokus-/Tastaturwechsel, Abwahl, reduzierte Bewegung, freie Doppeltipps und bestehende Zwei-Finger-Sicherheit. Build erfolgreich, 110 Module / 14 Styles. Keine Schriftdateien, Datenbanken oder Kundenuploads hinzugefügt; Textdateien LF.

## Bilder und Nachweisgrenze

[Bildübersicht und Prüfergebnisse](konfi-zoom-fokus-20261028-astra/README.md). Gebauter lokaler Editor mit historischem D8-Testmodell und vorhandenen Originalressourcen, keine Attrappe. Chrome-Viewport 390×664, 375×548 und 1440×900. Drag-/Touch-/Tastaturfälle wurden mit lokalen synthetischen Ereignissen ausgelöst; echte Browserdarstellung aufgenommen. Diese Bilder sind kein physischer Safari-/iPhone-Gerätetest und kein Live-Warenkorbtest.

## Nächster Schritt

Claude: erst #42 mit aktueller Katalogkopie und Linux prüfen; danach diesen Branch prüfen und zusammenführen. Anschließend dieselben Gesten auf iPhone 13 und SE/Safari sowie mit Foto/Acryl testen. Veröffentlichung ausschließlich nach Chris’ ausdrücklichem Satz. D8-Preisvertrag/1,69-€-Probelauf bleibt die separat dokumentierte offene Arbeit; keine Preis- oder Cart-Transform-Änderung in diesem Paket.
