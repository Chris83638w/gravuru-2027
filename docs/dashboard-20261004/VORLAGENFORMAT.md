# Vorbereitete UV-Designs – Importformat v1

Der Importer verarbeitet **bereits getrennte, geprüfte Ebenen**, keine beliebigen flachen Bilder. Produktentwicklung bleibt in `Chris83638w/gravuru-2027`; Vorlagen und private Fotos werden separat bereitgestellt. Referenz: Pilot „Unser kleines Glück“, hochgeladenes Masterpaket, SHA-256 in UV-DESIGN-PILOT.md.

## Wiederholbare Vorbereitung

`scripts/prepare-layered-design.py` verarbeitet die vorhandene SVG-Basis mit einer ausdrücklich geprüften Rollenzuordnung. Für den Pilot liegt diese Zuordnung in [uv-pilot-mapping.json](uv-pilot-mapping.json). Sie enthält keine Bilddaten oder privaten Kundendaten.

```sh
python3 scripts/prepare-layered-design.py \
  --source /PRIVATE-QUELLE/02-Bearbeitbare-Basis/Pia-und-Rafael-150x200-editierbar.svg \
  --mapping docs/dashboard-20261004/uv-pilot-mapping.json \
  --output /PRIVATE-AUSGABE/design-18.json
```

`/PRIVATE-QUELLE` und `/PRIVATE-AUSGABE` sind Platzhalter für tatsächlich bereitgestellte private Cloud-Verzeichnisse. Die Ausgabedatei wird exklusiv neu angelegt (0600), nicht überschrieben. Das Tool führt keine Paketskripte aus. Originale unverändert separat behalten. Eine laufende Cloud-VM ist keine Zusage dauerhafter gemeinsamer Datenhaltung.

Unterstützter Quellumfang: mm-Zeichenfläche/viewBox, eine ausdrücklich zugeordnete Bogenfotoebene, mittig verankerte einfache SVG-Texte, feste SVG-/eingebettete PNG-/JPEG-Dekoration. Foto- und Textrollen/Fontnamen werden einmal überprüft zugeordnet. Keine automatische Motiv-/OCR-Erkennung. Verschobene/rotierte Gruppen, fremde Textstrukturen oder abweichende Masken werden abgelehnt und müssen gesondert vorbereitet werden. Das enthaltene Beispielfoto wird seit der Nutzerkorrektur als separate `example`-SVG zur Fotoebene erhalten. Es bleibt eine reine Vorschau und gilt nicht als Kundenfoto. Alpha-Dekoration bleibt Raster; keine Vektorisierungsbehauptung.

## Vertrag für ein weiteres vorbereitendes Modell

JSON mit `schema: "gravuru-prepared-design/v1"`, stabiler `designId`, `name`, `widthMm`, `heightMm`, `sourceSha256` und **geordneten** `layers` (höchstens 20):

- Grafikebene: `{id, type:"artwork", name:"ebene.svg", bytes:"BASE64"}`. Eigenständige SVG mit derselben mm-Zeichenfläche. Keine editierbaren Texte oder zu ersetzenden Fotos darin belassen. Eingebettete Raster sind zulässig, externe URLs/aktive Inhalte nicht. Der vorhandene Sanitizer prüft jede Ebene serverseitig.
- Text: `{id:"customer-…", type:"text", fieldKey, label, x, y, text, font, size, letterSpacing, color, allowColor, allowMove}`. `x/y` ist der Mittelpunkt im gemeinsamen mm-Raum; `size` und `letterSpacing` in mm. SVG-Basislinie wird vom Vorbereitungsskript auf die bestehende Text-Renderer-Konvention übertragen. `allowMove` ist eine optionale Backend-Freigabe: standardmäßig `true`, mit `false` bleibt die Textposition fest. Bestehende gespeicherte Rechte bleiben beim Öffnen erhalten. Schrift-ID muss in den lokalen Ressourcen vorhanden sein; fehlende Glyphen melden.
- Foto: `{id:"customer-…", type:"photoSlot", fieldKey:"photo-…", label, x, y, widthMm, heightMm, shape, required}`. `shape` ist `rect`, `circle` oder `arch`. Bogen: obere Halbkreisform, Höhe mindestens halbe Breite. Optional `example:{name:"Beispielfoto.svg",bytes:"BASE64"}`: Sanitizer-geprüfte SVG mit denselben physischen Maßen und dem ursprünglichen Bildausschnitt. Keine externe Bild-URL. Der Import speichert die Zuordnung separat in `localResources.photoExamples`; Kundenobjekte enthalten weder Bildbytes noch eine fingierte Upload-ID. Andere Masken sind nicht durch dieses Format freigegeben.

Die Reihenfolge bestimmt die Darstellung. Beim Pilot: Bogenfoto → Terrakottabogen → Rosébogen → Olivenzweig → Überschrift → Namen → Datum → Linien → Spruch. Angegebene Quelldatei-Prüfsumme ist Herkunftsmetadatum; vor Übergabe mit dem Original prüfen, der Server kann ein nicht mitgeliefertes Original nicht nachträglich verifizieren.

## Dashboard und Prüfungen

Werkstatt → Produkt → Designs und Beispieltexte → **Datei / Vorlagenpaket importieren …** → vorbereitete `.json` wählen → Vorschau prüfen → **Neues Design hinzufügen**. Das neue Design wird Standard; vorhandene Designs, Preise und historische Revisionen bleiben erhalten. Doppelte IDs werden abgelehnt, nicht still überschrieben. PDF/SVG im selben Dialog behalten ihren bisherigen Modus „ausgewähltes Design ersetzen“.

API: `POST /api/workshop/products/:id/prepared-design/preview` mit `{expectedRevision, package, makeDefault:true}`; `/apply` zusätzlich mit `token` aus der Vorschau. Gleicher CSRF-Schutz und Repository-Revisionsvertrag. Der Server passt die gemeinsame Zeichenfläche proportional in die vorhandene sichere Acrylfläche ein (Pilot 93 %); **kein 1:1-Produktionsmaß behaupten**. Jede Einzelgrafik und das vollständige Produktmodell werden validiert.

Prüfen: neues Design gespeichert/wieder geöffnet, Originalvorlage unverändert, Text/Fotowechsel, keine zusätzlichen Fotoobjekte, richtige Maske und Ebene, Alpha, Umlautprobe, längerer Spruch, Preis/Größenwechsel, Beispielfoto mit Klick-/Tastaturhinweis in der Bedienvorschau, kein Beispielfoto oder Hinweis in Kundenobjekten/Export-SVG. Prüfkommando:

```sh
PYTHONPATH=/PFAD/ZUR/VORHANDENEN/PYTHON-ABLAGE node --test app/workshop/prepared-design.test.mjs app/configurator/variant-m/ui-event-regressions.test.mjs
```

Vollständiges Schriftsortiment, flache Bildrekonstruktion und Produktion sind gesonderte Grenzen. `Garamond Acryl` enthält derzeit keinen Gedankenstrich U+2013; er wird nicht still ersetzt. Das Paket enthält keine Maschinenfreigabe. CMYK, Weißkanal, Kontur, Beschnitt, Spiegelung und RIP benötigen einen tatsächlich angebundenen Produktionsrenderer und bestätigtes Profil. Der vorhandene originale Beispiel-Druckmaster wird nicht als Ausgabe der neuen Personalisierung ausgegeben.

## Nutzerkorrektur: Originaltreue vor Serie

Das Originalfoto aus der bereitgestellten bearbeitbaren Basis und die Beispieltexte bleiben zunächst sichtbar; „Pia & Rafael“ bleiben vom Kunden änderbar. Der Hinweis „Hier tippen & eigenes Foto hochladen“ erscheint nur in der Bedienvorschau. Massiver Holzsockel verdeckt unten 7 mm (Nutzer bestätigt); die vorhandene gemeinsame Sockelregel gilt weiter. Keine pauschalen Text-/Motivänderungen als vermeintliche Übernahme.

**Die aktuelle Skalierung auf 93 % ist weiterhin vorhanden und erfüllt noch keine 1:1-Abnahme.** Die Masteranleitung im ZIP, Abschnitt 4, beschreibt Foto/Dekoration ausdrücklich als Rekonstruktion und die Namensschrift als ähnliche verfügbare Schrift. Die mitgelieferte SVG ist daher nicht die identische bearbeitbare Quelle des Mockup-PNG. Linien, Schriftbild und Originaltreue bleiben vor Freigabe weiterer Designs zu klären. Keine Serienfreigabe aus technischen Tests ableiten.
