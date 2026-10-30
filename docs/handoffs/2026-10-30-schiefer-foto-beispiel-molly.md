# Molly · Fotobeispiel auf 22 × 14 cm

Nutzerauftrag vom 30.10.2026: Hunde/Katzen künftig auch mit Foto, Originalfotos aus den Vorlagen ohne zusätzlichen Qualitätsverlust verwenden, Upload-Button nur als Bedienhinweis, Masken erhalten. Zunächst ein fertiges Beispiel zeigen. Grundlage: Design-Master im Katalog-Repo und die bereits bestätigte Schiefer-Excel (R23, 220 × 140 mm). Ohne Bohrlöcher hat Vorrang.

## Dateien

- `Molly-22x14-Vorschau-mit-Uploadhinweis.svg` / `molly-foto-mit-uploadhinweis.png`: korrigierte Kundenansicht mit sichtbarem „Foto hochladen“ direkt auf dem Foto. Foto und Maske unverändert; Hinweis als separate Vorschau-Ebene `data-gravur="nein"`.
- `Molly-22x14-mit-Foto.svg`: eine eigenständige SVG-Datei mit unverändert eingebettetem JPEG, Vektor-Herzmaske, Originalmotiven und Schriftpfaden. Kein Upload-Button, keine externen Bild- oder Schriftdateien nötig. Schwarze Gravurvektoren, blaue Außenkontur, transparenter Hintergrund.
- `design.svg`: editierbare Fassung mit echten Texten, derselben eingebetteten Originalbilddatei und derselben Vektormaske; Schrift Betsy Bailey aus dem freigegebenen Katalog erforderlich.
- `vorschau.svg` / `beispiel-fertig.png`: Ansicht mit heller Gravurdarstellung auf einfarbigem dunklem Hintergrund. Keine Simulation eines konkreten Gravurergebnisses.
- `BEISPIEL.html`: lokale Bedienprobe. Klick auf Foto oder Upload-Hinweis öffnet die Dateiauswahl. Das Foto wird ohne Neucodierung eingebettet, unverzerrt in der unveränderten Herzmaske dargestellt und kann als einzelne SVG heruntergeladen werden. Der Hinweis ist in der Bedienoberfläche und in der gesonderten Kundenansicht sichtbar; er wird nicht in die Gravur-Ausgabe übernommen.
- `vorlage.png`, `originalfoto.jpg`: unveränderte Bestandsreferenzen.

## Herkunft und Gestaltung

Bestandsvorlage: `designs/bestand/gedenktafeln/Tiere/Allgemein/gravur-rechteck-D236`, GT-S-30x20-D236, Bogen „D200-D249 Tier mit Foto.cdr“. Motivpfade: motiv-2 (Pfoten/Flügel) und motiv-6 (Herzrahmen), unverzerrt erhalten. Unsichtbare Plattenreferenz und Hinweisgrafiken sind keine Gravurmotive. Keine neuen Motive oder Schriftersätze.

Modus: proportionale Bestandsübernahme. 300 × 200 auf 220 × 140 mm mit einheitlichem Faktor 0,7 und x-Versatz 5 mm. Anordnung, Texte, Schrift, Bildausschnitt und tatsächliche Herzmaske erhalten. Die schwarze Originalbildfläche wird nur durch den originalen Herzpfad verdeckt; die Bilddatei wird weder ausgeschnitten noch neu gespeichert. Freigabe bleibt null.

Originalfoto: 800 × 800 Pixel, 53.199 Bytes, JPEG. Die verfügbare Quellqualität bleibt erhalten; keine zusätzliche Auflösung wird behauptet. SHA256 der Quelle und des aus der SVG zurückgelesenen Bildes:

`612f0260bb6cf6040751b54b8df0eb9182cf362004feadb7206c82101aa4e913`

## Prüfung und Konfi-Grenze

Bytevergleich des eingebetteten Originalfotos bestanden. Herzpfad exakt proportional aus dem Original übertragen. Beide sichtbaren Motivpfade erhalten. Keine sichtbaren Schriftüberstände. Außenkontur #0000ff; keine Bohrungen für dieses Beispiel.

Browserprüfung mit echtem Dateiupload, Download und Rücksetzen bestanden: Dateiinhalt unverändert, Herzmaske unverändert, keine Browserfehler, heruntergeladene SVG enthält weder Button noch Ansichtshintergrund. Tests liegen in `browser-pruefung.json` und `pruefung.json`.

Echter Konfi-Code in isolierter Prüffamilie: geometrische Prüfung `passt`, keine Passungsfehler. Das ist ausdrücklich **keine korrekte native Foto-Abnahme**: `katalog-convert.mjs` meldet „Fotofeld ‚foto-1‘: Maske ist ein Pfad – als Rechteck übernommen, bitte prüfen.“ Der Leser akzeptiert als Musterbild zudem nur einfache PNG-/JPEG-Dateinamen, keine eingebettete Data-URL. Dadurch fehlt im nativen Prüfbild das eingebettete Originalfoto; die Herzform wird für den Fotoplatzhalter nicht erhalten. Zusätzlich besteht die bekannte Stroke-/Evenodd-Grenze bei Gravurvektoren. Die Liefer-SVG und die lokale Bedienprobe erhalten Foto und Maske korrekt.

`konfi-unveraendert.svg`, `konfi-parser-pruefung.json` und `ergebnis.json` dokumentieren den nativen Stand unverändert. Keine App-, Familien-, Preis- oder Live-Änderung; vorhandene Serie ohne Foto bleibt erhalten. Die neue vollständige Fotoserie ist noch nicht erstellt. Nächster Schritt ist die Sichtprüfung dieses Beispiels; für die spätere Konfi-Anbindung müssen Originalbild und freie Maske durchgängig erhalten bleiben.


Katalog: https://github.com/Chris83638w/gravuru-katalog./commit/a175e7082ae6330a1772f88f6c67469d2a123b9b (verified true). Aufgabenbranch dev/schiefer-foto-beispiel-20261030-astra-mika. Lokal: outputs/schiefer-foto-beispiel-molly/.

Reproduktion unter Windows: Projektstruktur aus NEUSTART verwenden; Skripte im Projektordner work/ ausfuehren. Python fontTools/Pillow, Node/Playwright und Chrome wie vorhanden. Reihenfolge build → check → render; render schreibt nur lokale Dateien.
