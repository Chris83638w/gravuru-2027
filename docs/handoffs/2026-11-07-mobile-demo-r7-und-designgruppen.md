# Mobile Demo R7 und bestätigter nächster Ablauf

## Nutzerauftrag vom 07.11.2026

Reihenfolge ausdrücklich: zuerst die gesammelten mobilen Korrekturen, danach
die vom Nutzer noch zu zeigenden Desktop-Punkte, anschließend das Backend.
Der bestehende Kundenkonfi, Live-Shop und Astras Arbeit bleiben unberührt.
Eigener Branch `dev/mika-mobile-demo-20261107`, Draft PR #193; kein Main-Merge.

### Mobile Korrekturen aus den Screenshots

- 177/174: dunklere vertikale Scrollanzeigen im Motivbereich und in der
  vollständigen Kategorieliste. Die vier Schnellkategorien nebeneinander mit
  Icon über dem Text; Motive sollen früher sichtbar werden.
- 172: oberes Fotosymbol entfernen. Unten „Foto“ öffnet zuerst den Fotobereich;
  erst der dortige Uploadbutton öffnet die Dateiauswahl. Das ersetzt ausdrücklich
  den R6-Auftrag, den Dateidialog sofort aus dem Footer zu öffnen.
- Reset verständlicher benennen: „Gestaltung zurücksetzen“. Bestehende
  Bestätigung und Rückkehr zur gewählten Originalvorlage erhalten. Größe und
  Ausführung bleiben erhalten; keine neue Resetlogik.
- Edge/Android: Textauswahl beim bewussten Beenden auflösen; normale Auswahl,
  Kopieren/Einfügen, Schriftwahl und Scrollen erhalten. Ein Desktop-Browsertest
  ist kein Nachweis, dass Androids native Zwischenablageleiste verschwindet.

Keine Preise, Optionen, Designs, Masken, Rechte oder Fertigungsregeln werden
neu festgelegt. Produkt- und Designquellen bleiben exakt die R6-Quellen.

## Vorab-Sicherung

Quellstand `370581cfcd958cbc9cc0c38a00f3a64f0188a0e5` vor sämtlichen R7-Änderungen:

- Archiv relativ zum Workspace `lie`:
  `checkpoints/mobile-demo-r7-20261107/before-r7-370581cf.zip`
- SHA-256: `d1f6e907565fcde8ba62600567bc2231abfbe70b119e035514d5a58b98cb9891`
- Reine Quellsicherung. Keine Datenbank-/Shop-Sicherung behauptet, da diese
  für das isolierte statische Demopaket nicht verändert werden.
- Der öffentliche R6-Ordner und sein Link bleiben als Rückweg erhalten.

## Bestätigte Design-Gruppen-Regel für den späteren Backend-Schritt

Der Nutzer stimmt dem Beispiel zu: Hundegedenktafeln ohne Foto bilden eine
Design-Gruppe (in der aktuellen Testquelle 43 Vorlagen). Jedes Shopangebot hat
eine eindeutige Zuordnung zu Gruppe und Startdesign, beispielsweise „Semi“ mit
zwei Pfoten und Name in der Mitte. „Semi“ ist hier das Beispiel des Nutzers,
keine in diesem Paket neu erstellte oder geprüfte Vorlage.

Shop-Hauptbild und Konfi-Einstieg müssen aus derselben freigegebenen
Design-Zuordnung/Revision stammen. Das Bild wird nicht nachträglich erraten oder
per Bilderkennung zugeordnet. Der Konfi öffnet direkt das zum Angebot gehörige
Design und zeigt als Alternativen nur freigegebene, zur Produktgruppe und
Material-/Formatfassung passende Vorlagen dieser Gruppe.

Ein Gruppen-Standard kann als ausdrücklich festgelegter Rückfallwert dienen;
das Startdesign eines konkreten Angebots ist separat eindeutig. Das ist keine
Zusage, dass das Backend diesen Ablauf bereits vollständig unterstützt.

Gemeinsame Grundplatten/Schriften bleiben referenzierte Ressourcen. Änderungen
in der Galerie erzeugen neue Stände; die bewusste Synchronisierung übernimmt
freigegebene Änderungen für zugeordnete Angebote. Bestehende Bestellungen
behalten ihren Produktionsstand. Optionen/Befestigungen/Zubehör müssen vor
Neuanlage weiterhin vollständig bestätigt werden.

Für spätere Designarbeiten gilt der
[Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).
Dieses Paket verändert keine Designgestaltung.

## Abnahme

64/64 gezielte Tests bestanden: Demo-Shell, Textbedienung, Auswahlbeendigung,
Randvergrößerung sowie Paket- und Veröffentlichungsschutz. Zwei Unteragenten
haben Auswahlbeendigung bzw. unabhängige Gegenprüfung übernommen.

Lokaler Chrome-Test des Pakets R7-C3 bei 360×640 und 390×708: vier
Schnellkategorien in einer Reihe, dunklere Scrollleisten, Foto-Panel ohne
automatischen Dateidialog; expliziter Uploadbutton öffnet die Dateiauswahl und
fügt das Testfoto ein. Alle drei oberen Bedienelemente bleiben bei 360 px in
einer Reihe. Auf sehr kurzen Displays ist weiterhin Scrollen erforderlich.
Suche „kreuz“ liefert trotz Kategorie Blumen 18 Treffer. Schrift Cinzel gewählt.

Markierten Namen „Murmel“ mit Fertig und mit bewusstem Touch außerhalb beendet:
Auswahl kollabiert, Feld verliert Fokus, Wert bleibt erhalten. Reset-Abbruch
lässt den vollständigen Stand identisch; Bestätigung stellt Bruno ohne Upload
wieder her, 30×20 und 2 Bohrungen bleiben erhalten. Rückgängig stellt Murmel
und Foto wieder her. Keine Konsolenwarnungen/-fehler im geprüften Ablauf.
Desktop-Regressionsprüfung 1440×900: bisheriges Resetlabel, oberer Foto-Shortcut
und zweispaltige Schnellkategorien erhalten.

Belege in `docs/reviews/2026-11-07-mobile-demo/`: `r7-tests.txt` und
`r7-browser-checks.json`. Physischer Android-/Edge-Test des systemeigenen
Kopiermenüs bleibt offen. Keine neue Prüfung aller 43 Designs oder Bestellung.
Öffentliche Veröffentlichung wird nach tatsächlichem Abschluss ergänzt.
