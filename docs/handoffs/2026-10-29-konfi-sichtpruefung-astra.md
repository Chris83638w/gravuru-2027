# Gemeinsame Sichtprüfung – Umsetzung vom 29.10.2026

Auftrag: Chris im Chat, nach gemeinsamer Prüfung: „setze jetzt alles was wir gerade besprochen haben um“.
Basis: PR #58 aaab570; gemeinsame Vorschau 5eeea7f. Änderungen zunächst nur lokal/PR, kein Livegang.

## Regeln und Quelle

Alle folgenden Änderungen stammen aus Chris' Screenshots und Nachrichten dieser gemeinsamen Durchsicht vom 29.10.2026. Historische Aufträge mit gegenteiligen Angaben werden dadurch ersetzt.

1. Infofenster auch durch Klick/Tipp auf den Hintergrund schließen.
2. Kopf-, Werkzeug- und Preisleiste kompakter, moderne einheitliche Buttons, kräftigere und korrekt platzierte Beschriftung.
3. Je Textfeld 80 Zeichen insgesamt, Zeilenumbrüche ohne zusätzliche pauschale Zweizeilensperre. Feld wächst beim Schreiben und klappt beim Verlassen ein; Inhalt erhalten.
4. Zusammengehörige Vorlagenzeilen (Heimathafen / von) in einem Textfeld; neue Produktrevision vorbereiten, keine historischen Bestellungen umschreiben.
5. Textbearbeitung und Schrift-/Größenwahl modernisieren, Textleiste mit kontrastierendem Hintergrund.
6. Pinke numerische mm-Abstandsanzeige entfernen; Ausrichtungshinweise und physische Plattenmaße bleiben.
7. Buttonreihe Ersetzen/Hinzufügen/Kein Motiv entfernen. Motivauswahl und direktes Entfernen bleiben bedienbar; zusätzliche Motive erreichbar.
8. Ursprüngliches Vorlagenmotiv inklusive; jedes zusätzliche/ersetzte Motiv 169 Cent. Sichtbarer Hinweis. Preisvertrag bleibt serverseitig geprüft; neuer D8-Stand nur als Offline-Kandidat.
9. Mehr Motive ab Einstieg, drei Kacheln nebeneinander.
10. Papierkorb und Drehen direkt am Element sichtbar und bedienbar. Zoom bleibt ausschließlich Zwei-Finger/Mausrad.

## Umsetzung und Stand

Code auf PR #58, zuletzt `022f41d`. Gemeinsamer Prüfstand mit Claudes Integration `2aa16cc` und den bisherigen B/C/D-Änderungen: Branch `dev/konfi-gemeinsame-pruefung-20261029-astra`, Code `be9dbd4`. Build erfolgreich, Bundle `editor-f8d2b0c30c40f524.mjs`. Beide Branches sind Prüfstände; kein Merge nach main, kein Livegang.

| Bereich | Ergebnis |
| --- | --- |
| Infofenster | Hintergrund schließt den Dialog; Inhalt und Verstanden bleiben bedienbar. |
| Platz und Lesbarkeit | Kompakter Kopf, Werkzeug- und Preisleiste; einheitliche kräftigere Beschriftung. Berührungsflächen bleiben mindestens 44 px. |
| Text | Neue Produktstände: 80 Unicode-Zeichen insgesamt je Feld, einschließlich Leerzeichen/Zeilenumbrüchen. CRLF wird vereinheitlicht, keine zusätzliche pauschale Zeilensperre. Anzeige, Eingabe und Server prüfen dieselbe Regel. |
| Eingabefelder | Wachsen bei Fokus/Eingabe, fallen beim Verlassen auf eine kompakte Zeile zurück. Inhalt und Zeilenumbrüche bleiben erhalten. Physische Grenzen des Schildes werden weiterhin geprüft. |
| Schrift und Größe | Neue deutlich erkennbare Aufklappfläche; Textleiste mit grünem Hintergrund, auf dem Handy höchstens zwei Reihen. |
| Ausrichten | Numerische pinke Abstandsangabe entfernt; Ausrichtungshinweise und Plattenmaße bleiben. |
| Motive | Ersetzen/Hinzufügen/Kein Motiv als Modusreihe entfernt. Auswahl ersetzt das ausgewählte/Vorlagenmotiv, „Weiteres Motiv auswählen“ öffnet die Bibliothek zum Ergänzen. Nach Abschluss wieder normale Auswahl. |
| Übersicht | Drei Kacheln pro Reihe, bis zu zwölf verfügbare Motive bereits im Einstieg; D8 liefert acht. Auch auf 375×548 ist die erste Dreierreihe ohne Scrollen sichtbar. |
| Preis | Vorlagenmotiv inklusive; jedes weitere/geänderte Motiv +1,69 €, sichtbarer Hinweis. Der neue D8-Preisvertrag ist ausschließlich als Offline-Kandidat vorbereitet. |
| Element | Papierkorb und Drehgriff am Rahmen. Drehen folgt dem gespeicherten Bewegungsrecht; kein zusätzlicher Drehschalter. Löschen respektiert die bestehenden Rechte, Pflicht-Nachname bleibt geschützt. |
| Zoom | Unverändert nur Zwei-Finger am Handy und Mausrad am Desktop; keine Lupe/Zoomknöpfe. |

### Zusammengeführte Vorlagenzeilen ohne Änderung der Quelle

`join-template-text.mjs` führt ausschließlich ausdrücklich genannte, kompatible Textobjekte in einem kopierten Produktdokument zusammen. Unterschiedliche Schrift, Stil, Positionierung oder Rechte sperren den Vorschlag. Schriftpfade und physische Grundlinien bleiben erhalten; keine automatische Zusammenführung nach Namen, kein Katalogimport.

Im D8-Kandidaten `katalog-TAE-V2A-8x5-D8`: `text-3` (Heimathafen, y=15,569 mm) und `text-4` (von, y=23,429 mm) werden zum Feld `text-3` mit `Heimathafen\nvon`, y=19,499 mm und 7,86 mm Zeilenabstand. x=74,55 mm, Cinzel, Größe 7,935 mm und beide ursprünglichen Grundlinien bleiben gleich. Vier statt fünf Textfelder, fünf statt sechs Gestaltungselemente. Pflichtname, Vornamen und Adresse bleiben erhalten. Vorlage, ursprüngliche Produktrevision und Originalarchive wurden nicht überschrieben.

Wiederholbar mit `scripts/customer-ux-proposal.mjs --input export.json --join-text textgruppen.json`. Ohne `--output` nur Dry-run; mit Ausgabe wird ausschließlich eine neue Vorschlagsdatei angelegt. Für D8 enthält die Gruppenliste `[{"designId":"katalog-TAE-V2A-8x5-D8","ids":["text-3","text-4"]}]`. Vor einer späteren Installation Quellrevision/Hash, Druckrechte und Shopify-Preisbindung erneut abgleichen. Alte Aufträge behalten ihre ursprünglichen Regeln und Preise.

## Prüfung

Windows, gemeinsamer Prüfstand; keine Live-API und kein Import. [Maschinenlesbare Zähler und genaue Baseline-Teststellen](issue48-d-20261029/sichtpruefung/pruefzahlen.json).

| Lauf | Gesamt | Bestanden | Fehler | Übersprungen |
| --- | ---: | ---: | ---: | ---: |
| Vollauf beider Testordner während Umsetzung | 1868 | 1839 | 24 | 5 |
| Gezielte Abschlussprüfung Regeln, Server, UI, alte Revisionen | 81 | 81 | 0 | 0 |
| Gesamte katalog-import.test.mjs nach Korrektur | 15 | 15 | 0 | 0 |
| Dieselben verbliebenen Fehler auf unverändertem Ausgangsstand 5eeea7f | 23 | 0 | 23 | 0 |

Der Vollauf umfasste alle `app/configurator/variant-m/*.test.mjs` und `app/workshop/*.test.mjs`, mit `--test-concurrency=4`, Laufzeit 21 min 11 s. Er ist **nicht grün**. Einer der 24 Fehler war eine veraltete Import-Test-Erwartung (50 Zeichen pro Zeile statt nun 80 pro Feld); korrigiert und das ganze Testmodul anschließend 15/15 grün. Der zusätzliche echte Serverfall für 80/81 Zeichen wurde erst nach Beginn des Vollaufs ergänzt und ist im 81er-Abschlusslauf enthalten. Danach nur CSS-Abschlusskorrekturen, erneut gebaut und visuell geprüft; kein zweiter Vollauf behauptet.

Die übrigen 23 Fehler wurden auf `5eeea7f` gezielt mit derselben Windows-/Python-Umgebung reproduziert, **nicht** pauschal als Windows-Probleme eingeordnet:

- 22 Fälle brechen mit „Funkklingel: Native Elementidentität weicht zwischen Formaten ab.“ in `doorbell-selection.mjs:150` ab: artwork (1), preparation (3), product (5), status-webhook (1), hidden-motif-export (1), design-gallery.load (1), gallery-model (2), binding-batch (6), binding-store.doorbell-memory (2).
- 1 Fall `batch-assets.test.mjs:110`, Assertion Zeile 127: `design.objects[0].locked` ist `undefined` statt `true`, ebenfalls vor dieser Umsetzung vorhanden.

96 gezielte Abschlussfälle sind grün, darunter echte Servervalidierung (80 Zeichen akzeptiert, 81 auch mit manipulierten Kundenangaben abgelehnt), historische 32/2- und 50-pro-Zeile-Verträge, unveränderte Originale und Grundlinien, Motivrechte und serverseitige Preisberechnung. Keine Tests gelöscht oder Geometrie-/Preisprüfungen abgeschwächt.

### Lokale Bedienprüfung

- Material-Info auf Hintergrundklick geschlossen.
- Vier Textzeilen: Feld beim Schreiben 113 px hoch, nach Verlassen 44 px; alle vier Zeilen erhalten. 81 Zeichen auf 80 begrenzt, Zähler 80/80. Zu breiter Text bleibt sichtbar als physischer Konflikt gemeldet.
- Papierkorb am optionalen Spruch: fünf auf vier Elemente; Rückgängig stellt Element und Inhalt wieder her. Pflicht-Nachname bleibt nicht löschbar.
- Drehung über 15°-Schaltfläche sowie Tastatur am Drehgriff (1° vor/zurück) geprüft. Ziehen mit der Maus konnte wegen eines Zeitüberschreitungsfehlers der Browsersteuerung **nicht** abschließend belegt werden; kein erfolgreicher Drag-Test behauptet.
- D8 ohne Bohrung: Vorlagenmotiv 19,99 €; Haus ersetzt Leuchtturm 21,68 €; zusätzlich Anker 23,37 €. Rückgängig stellt Preise und Gestaltung wieder her.
- Chromium Desktop 1280×720, iPhone-13-Format 390×664 und SE-Format 375×548. Textleiste zwei Reihen, Eingabebereich erreichbar, Schritte und Preis ohne Überlagerung. Drei Motivkacheln samt Hinweis im ersten sichtbaren Bereich. Keine Aussage über physisches iOS/Safari aus einer Chromium-Größenprüfung.

## Bilder der fertigen lokalen Vorschau

| Ansicht | Text, Papierkorb und Drehgriff | Motive und Preishinweis |
| --- | --- | --- |
| Desktop 1280×720 | [Bild](issue48-d-20261029/sichtpruefung/desktop-text.jpg) | [Bild](issue48-d-20261029/sichtpruefung/desktop-motive.jpg) |
| iPhone 13, 390×664 | [Bild](issue48-d-20261029/sichtpruefung/iphone13-text.jpg) | [Bild](issue48-d-20261029/sichtpruefung/iphone13-motive.jpg) |
| iPhone SE, 375×548 | [Bild](issue48-d-20261029/sichtpruefung/iphone-se-text.jpg) | [Bild](issue48-d-20261029/sichtpruefung/iphone-se-motive.jpg) |

## Vorschau und offene Abnahme

Neue lokale Vorschau: `http://127.0.0.1:8153/`, Türschild unter `/?model=acryl&configuration=d8`. Dieser Link funktioniert auf Chris' Rechner bei laufendem Prüfserver. Der bisherige Prüfserver 8152 und Chris' dort offener Gestaltungstab blieben unangetastet. Kein erfolgreiches Speichern im Kundenkonto behauptet; die lokale Vorschau hat keine Konto-/Shopify-Verbindung.

Vor Installation offen: gemeinsame Sichtfreigabe durch Chris, echtes iPhone/Safari einschließlich Zwei-Finger-Zoom und Bildschirmtastatur, Drehgriff durch Ziehen, Linux für diesen Stand sowie die 23 Baseline-Befunde. Für einen späteren Live-Test zusätzlich aktuelle D8-Quellrevision/Hash, neue Preisbindung inklusive Cart Transform/Rückweg und echter Warenkorb. Keine Live-Preise, Produkte, Themes, Freigaben oder Bestellungen verändert. PR #58 bleibt Entwurf; Rückmeldung in Issue #48.
