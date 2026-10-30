# Familienschilder · Astra Mika

Aktueller Stand: Bildrichtungen 1 und 3 kombiniert. Zehn Muster, 26 aktive mika-atelier-Motive, 41 Figur-/Namenspaare. 0 FEHLER, 0 passt nicht, 10 prüfen wegen feiner Motivkonturen; sichtbare Schrift mindestens 3.192 mm. Produktionsbewertung offen. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Aktuelle Reproduktion

1. build-atelier-motifs.py --katalog <Arbeitskopie> --sources <Shapesoda-SVGs> --png-sources <Rohbilder/Prompts>. Erwartete Trace-Namen: hybrid.svg, slim.svg, owls.svg, bees.svg, ladybirds.svg. Im Katalogarchiv heißt hybrid.svg smile-trace.svg; die anderen heißen entsprechend <stil>-trace.svg. Kopien im Arbeitsordner passend benennen, Quellenarchiv nicht verändern. Bilder/Prompts heißen <stil>-quelle.png bzw. <stil>-prompt.txt.
2. node scripts/family-designs-mika/build-family-designs.mjs --katalog=<Arbeitskopie>
3. node scripts/design-pruefung/konfi-vorschau.mjs --katalog=<Arbeitskopie> --reihe=familie-mika-120x80 --out=<Prüfungsordner>
4. node scripts/family-designs-mika/audit-family-designs.mjs --katalog=<Arbeitskopie> --out=<Prüfungsordner>
5. node scripts/family-designs-mika/render-family-contact.mjs --katalog=<Arbeitskopie> --original-katalog=<Sicherung> --pruefung=<Prüfungsordner> --out=<Ausgabeordner>

Node 24, Python mit shapely/svgpathtools/fontTools, GRAVURU_PYTHON setzen; unter Windows PYTHONUTF8=1. Renderer nutzt Playwright/Chromium zur lokalen SVG-Rasterung; GRAVURU_CHROME kann das Programm festlegen.

Der Atelier-Generator trennt zusammenhängende Figurenbestandteile nach ihren Positionen. Er bewahrt einfarbige Flächen und Aussparungen, verwendet nur eine geringe Konturverstärkung (0,10 Quelleinheiten), entfernt mikroskopische Splitter und schreibt seinen eigenen Namespace. Eine pauschale Verdickung auf 0,5 mm zerstörte Gesichter und wurde verworfen. Aktuelle Feinlinien sind bewusst als prüfen dokumentiert, der Prüfer wurde nicht verändert.

Audit prüft Glyphenhöhen, getrennte Figuren/Namen, Quellhashes, Quellkopien, Proportionen, Größenbindung und offene Freigaben. Keine Preis-/Lochbildänderungen und keine Erweiterung von motive/motive.json.

## Historie

Die geometrischen Figuren aus build-cute-motifs.py wurden gestalterisch abgelehnt. Dessen mika-cute-Quellen bleiben als Historie erhalten, nicht im aktuellen Generator verwenden. normalize-evenodd.mjs, validate-family-designs.mjs (--katalog/--base-url) und capture-family-contact.py (--katalog) sind ältere Hilfen. Frühere grüne Prüfwerte gelten nicht als Abnahme des neuen Stils. Hinzufügen/Entfernen sowie Motiv-Löschen/-Ersetzen bleiben Konfi-Anforderungen.
