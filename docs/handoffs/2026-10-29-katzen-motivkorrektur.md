# Katzenmotive: zwölf eigenständige Motive je Rasse

Chris' Vorgabe im fortgesetzten Chat vom 29.10.2026: **„immer verschiedene Katzen gesichte / Motive“**. Umgesetzt sind **25 Katzenrassen × zwölf = 300 eigenständige Motive**, verwendet in **6.600 Katzenschildern**. Jede Rasse erhält ihre zwölf Motive in allen 22 beauftragten Größen-/Formvarianten. Die zusätzlichen 1.500 Hundeschilder bleiben die Musterstufe mit fünf Rassen aus Nachricht 1. Insgesamt 8.100 SVG/JSON-Paare, 360 Rassenentwürfe, 675 Rasse-/Größen-/Formkombinationen.

Quellen: [Issue 61, Nachricht 1](https://github.com/Chris83638w/gravuru-2027/issues/61#issuecomment-6503468259), [Nachricht 2](https://github.com/Chris83638w/gravuru-2027/issues/61#issuecomment-6503583888), die Nutzervorgaben „je größe und rasse 12 verschiedene designs“, „weit aus mehr“ und der obige Motivnachtrag. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt. Die fachlichen Grundlagen zu Text, Maßen, Rechten, Schriften und Freigaben sind in der [ersten Übergabe](2026-10-29-rasse-schilder-astra.md) dokumentiert.

## Ergebnis

Pro Rasse bleiben das eigene Originalporträt als Motiv 01 und elf zusätzliche Einzelillustrationen: verschiedene Gesichter und Kopfansichten, geneigter Kopf, Blick nach oben, Gesicht mit Pfote, Sitz-/Liege-/Spielpose und zwei individuelle Katzenköpfe. Keine geometrischen Spiegelungen oder Drehungen desselben Porträts als Ersatz für neue Zeichnungen. Das Katzenpaar in Layout 12 trägt zwei editierbare Beispielnamen.

Die 275 zusätzlichen nativen ImageGen-Originale, exakten Prompts und Entstehungs-/Sichtprüfvermerke liegen im Katalog unter `auftraege/rasse-schilder-20261029/portrait-quellen/varianten/<rasse>/`. Vektoren und Herkunftsindex unter `motive-eigene/rasse-schilder-20261029/varianten/`. Insgesamt 300 Katzenmotive plus sieben Zierformen als eigene Entwurfsmotive registriert. Binäre VTracer-Vektorisierung bleibt eine Annäherung; Original-PNGs bleiben erhalten. Aufgabenbezogene `.gitattributes` bewahren die prüfsummengebundenen SVG-Bytes auch unter Windows; Git darf deren Zeilenenden nicht automatisch ändern.

`rasse_motif_sources.py` bindet jedes Design an seine tatsächliche Quelle. Fehlende oder doppelte Motive brechen den Aufbau ab; es gibt keinen stillen Rückfall auf Motiv 01. Auch über alle Rassen sind Quellbilder und Vektoren unterschiedlich. Manifest v2 und CSV weisen Motivnummer, Quelle und Prüfsumme je Design aus. Die Kontaktbögen zeigen links die jeweilige Motivquelle und rechts die unveränderte Aufnahme aus dem echten Konfigurator.

Die Galerie bietet „Schilder im Konfigurator“ und „Zwölf Katzenmotive“: 95 Kontaktbögen sowie 25 zusätzliche Motivübersichten, einschließlich aller zwölf Motive je Rasse. Dateien: `auftraege/rasse-schilder-20261029/GALERIE.html`, `katzen-motive/`, `kontaktboegen/` und `pruefung/`.

## Ausgeführte Abnahme der 300-Motiv-Fassung

- 300 Original-PNGs mit 300 verschiedenen Datei- und Pixelprüfsummen, vollständigen Prompts/Herkunftsangaben, keine angeschnittenen Bildränder. Alle 25 Vektorübersichten mit je zwölf Motiven visuell geprüft; Nachweis an die tatsächlichen Bildprüfsummen gebunden.
- 8.100 SVG/JSON-Paare geprüft: 675/675 Kombinationen mit zwölf verschiedenen Layouts; sämtliche 550 Katzenkombinationen mit zwölf verschiedenen Motiven. Drei editierbare Textfelder, Mindestschriftgröße 3 mm, rein schwarze Vektorpfade, keine Rasterbilder in den SVGs, offene Freigaben.
- 8.100/8.100 native Passungen bestanden, null Importfehler. Prüfbericht an aktuelle Design- und Motivprüfsummen gebunden.
- 1.140 neue Browseraufnahmen im echten Konfigurator, 95 Kontaktbögen; keine Browserfehler oder Textkasten-Überlappungen. Screenshotpixel beim Kontaktbogenbau zurückgelesen und unverändert bestätigt.
- Sichtkorrektur am Katzenpaar: seitliche Zierlinien außerhalb des längeren Namensfelds platziert. Alle Layout-12-Aufnahmen danach erneuert und die vollständigen 8.100 Passungen erneut geprüft; unveränderte Aufnahmen anhand ihrer Designprüfsummen weiterverwendet.
- Namensänderung, Motivlöschung und Rückgängig bei Hund/Oval und Katze/Rechteck im Browser bestanden; Motiv-Ersetzrecht aktiv. Kein Bestelltest.
- Galerie: alle 30 Rassen, 95 Schildbögen und 25 Motivbögen erfolgreich geladen, Wechsel zu Hunden und Vollbildlinks geprüft, 390-px-Ansicht ohne horizontalen Überlauf.
- 40/40 Konverter-/Quell-/Elementrechtetests und 4/4 Regressionstests zur Motivzuordnung bestanden; Syntax geprüft.
- Vollständiger Katalogbau in isolierter Kopie derselben unveränderten Stammdaten: elf PDFs mit 33 Seiten, elf PNGs und Excel mit acht Blättern geöffnet/geprüft. KATALOG.md inhaltlich identisch; allgemeine Familienartefakte deshalb nicht ersetzt.

## Reproduktion

Node/Playwright/Sharp sowie Python mit Pillow, VTracer, svgpathtools und fonttools. Unter Windows `TEMP`/`TMP` auf einen beschreibbaren Aufgabenordner und `PYTHONIOENCODING=utf-8` setzen. `GRAVURU_PYTHON`, `GRAVURU_NODE_MODULES`, `GRAVURU_BROWSER` und `PYTHONPATH` können die vorhandenen Laufzeiten angeben.

```text
python scripts/vectorize-rasse-portraits.py --sources <Originale 02–12> --katalog <Katalog> --variants
python scripts/check-rasse-motifs.py --katalog <Katalog>
python scripts/build-rasse-schilder.py --katalog <Katalog>
python scripts/document-rasse-schilder.py --katalog <Katalog>
node scripts/portrait-rasse-schilder.mjs --katalog=<Katalog> --out=<Motivübersichten>
node scripts/review-rasse-schilder.mjs --katalog=<Katalog> --out=<Prüfstand> --validate
node scripts/review-rasse-schilder.mjs --katalog=<Katalog> --out=<Browserprüfstand> --port=4317
node scripts/capture-rasse-schilder.mjs --review=<Browserprüfstand> --out=<Aufnahmen> --workers=4
node scripts/contact-rasse-schilder.mjs --katalog=<Katalog> --captures=<Aufnahmen> --out=<Kontaktbögen>
node scripts/check-rasse-interaction.mjs --url=http://127.0.0.1:4317 --out=<Bediennachweis>
python scripts/package-rasse-review.py --katalog <Katalog> --out <Galerie> --captures <Aufnahmen> --review <Prüfstand> --contacts <Kontaktbögen> --interaction <Bediennachweis> --portrait-sheet <25-Rassen-Übersicht> --motif-sheets <Motivübersichten> --motif-review <Sichtprüfprotokoll>
node scripts/check-rasse-gallery.mjs --root=<Galerie>
```

Der Paketbau akzeptiert ausschließlich vollständige, zur aktuellen Fassung passende Prüfungen. Die Sichtprüfung ist ein dokumentierter manueller Schritt und wird nicht durch den Generator erfunden.

## Repository und offene Freigaben

Branch beider Repositories: `dev/rasse-schilder-20261029-astra`. Aktueller Code-main `915c102` und Katalog-main `7d539583` wurden in diese Entwurfsbranches übernommen. Beide STATUS-Verläufe erhalten. Die 20 bereits auf Code-main vorhandenen Textdateien mit einer CRLF-Schlusszeile bleiben bytegleich zu HEAD und sind nicht Teil des Motivänderungscommits. Beim Katalog sind die Aufgabenpfade nun ausdrücklich im lokalen Sparse-Checkout enthalten; danach wurde der vollständige Designbau neu ausgeführt.

[Code-PR #71](https://github.com/Chris83638w/gravuru-2027/pull/71) und [Katalog-PR #8](https://github.com/Chris83638w/gravuru-katalog./pull/8) enthalten das reviewbare Ergebnis. Review-Commits unsigned, Autor Codex: in dieser Umgebung ist kein Signaturschlüssel eingerichtet. Signierte Übernahme durch einen entsprechend eingerichteten Maintainer offen.

Chris prüft als Nächstes die Galerie und bestätigt Stil, Motive und Katzenauswahl; weitere Hunderassen folgen gemäß Nachricht 1 nach Musterfreigabe. Mindestlinienstärke bleibt `null`; reale Gravurprobe in kleinster Größe vor Fertigungsfreigabe. Alle `freigabe`-Felder bleiben `null`, Kundenbibliothek bleibt unverändert. Kein Merge nach main, kein Liveimport, keine Shopanlage. Issue 61 bleibt als Postfach offen.
