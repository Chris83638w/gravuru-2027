> **Überholt durch den Nachauftrag.** Aktueller Stand: [25 überarbeitete Designs und ein Kontaktbogen](grabkreuze-hunde-20261101/NACHAUFTRAG.md). Frühere Designbögen und Designnummern in diesem historischen Bericht sind ersetzt.

# Grabkreuz Acryl – Hunde · Erdteilsperre, Browserabnahme offen

Stand 01.11.2026, Astra Mika. Auftrag: gravuru-2027 Issue #76. Finale symmetrische Konturen aus Katalog-main 48abf763, schneidvorlagen/kreuze/: 110×200, 140×250 und 220×400 mm. Rote Schnittkontur #FF0000 mit 0,0762 mm. Sämtliche früheren Konturen und Kontaktbögen sind überholt.

[Alle sechs Kontaktbögen](https://github.com/Chris83638w/gravuru-katalog./blob/dev/grabkreuze-hunde-20261101-astra-mika/auftraege/2026-11-01-grabkreuze-hunde/vorschau/kontaktbogen.html) · [Schwarz 11×20](https://github.com/Chris83638w/gravuru-katalog./blob/dev/grabkreuze-hunde-20261101-astra-mika/auftraege/2026-11-01-grabkreuze-hunde/vorschau/schwarz-KZ-A-11x20.png) · [Anthrazit 14×25](https://github.com/Chris83638w/gravuru-katalog./blob/dev/grabkreuze-hunde-20261101-astra-mika/auftraege/2026-11-01-grabkreuze-hunde/vorschau/anthrazit-KZ-A-14x25.png) · [Schwarz 22×40](https://github.com/Chris83638w/gravuru-katalog./blob/dev/grabkreuze-hunde-20261101-astra-mika/auftraege/2026-11-01-grabkreuze-hunde/vorschau/schwarz-KZ-A-22x40.png)

## Geliefert

20 native, editierbare Hundedesigns: D0, D53, D55 sowie D100–D116. D0/D53/D55 verwenden die vorhandenen 11×20-Originalelemente, unverzerrt und um 0,75 mm vertikal auf der finalen 200-mm-Kontur versetzt (Modus Referenz). D0 verwendet den bereits bestätigten Ersatz Montserrat Light. 17 neue Kompositionen nutzen Originalmotivpfade, davon zwei neue eigene Vektormotive (D109/D116) zusätzlich unter motive-eigene/. Keine Übernahme in die Kunden-Motivbibliothek. Namen, Jahreszahlen und kurze eigene Gedenktexte sind ausgefüllt. Alle Freigaben bleiben null.

Die Auswahl ist vorläufig: Balu/Paula, Clarissa und Frieda wurden nicht mit erfundenen Ersatzschriften nachgebaut. Für deren Originale fehlen die bestätigten Schriftzuordnungen Clarissa, Playlist und Standlist (in #76 angefragt). Nach deren Klärung kann die Auswahl zugunsten weiterer Originale geändert werden. Diese 20 Designs erfüllen deshalb noch nicht die abschließende vollständige Bestandsübernahme.

Zwei getrennte Materialfamilien dienen dem nativen Katalog-Prüfweg. Der Produktplan sieht weiterhin EIN Shop-Produkt mit zwei Farben und drei Größen vor. Preise: 1499/2399/2999 Cent; Motivaufpreis 169 Cent; Mengenstaffeln 6 % ab 2 und 10 % ab 3. Rückseitengravur, 5 mm, keine Fotos oder Zubehör. Kein Shop-Upload erfolgt.

## Prüfungen und Grenzen

- 120 Aufrufe des echten targetDesignPreview-Renderers: 80 passt, 40 prüfen, 0 passt nicht, 0 Fehler. Einziger Hinweis: 14×25 wird proportional mit 1,80 % Seitenverhältnisabweichung eingepasst.
- 60 Design-/Größenkombinationen gegen den Erdteil geprüft: Gravur vollständig oberhalb der Erdlinie mit mindestens 5 mm Abstand. Schriftprüfung mit echten H-Glyphen: mindestens 3 mm Versalhöhe auf dem kleinsten Master; keine fehlenden verwendeten Glyphen.
- Die PNG-Kontaktbögen sind Rasterausgaben der nativen SVG-Zielvorschauen, keine Browser-Screenshots eines bedienbaren Kundenkonfigurators. Originale stehen bei den drei übernommenen Designs klein daneben. Für die neuen Designs ist der Modus neu angegeben.
- Die Familien tragen jetzt groundInsertion mit depthMm 50 und clearanceMm 5. Die gemeinsame Laufzeit blendet die unteren 50 mm in der Vorschau aus und begrenzt Gestaltung, Verschieben und serverseitige Prüfung oberhalb der zusätzlichen 5 mm. Schrift-/Motivpfadprüfungen und deren Cache berücksichtigen die Grenze. Die physische Schnittkontur bleibt vollständig; ungültige Kundengestaltung wird vor dem Fertigungsexport abgewiesen.
- **72 gezielte Tests bestanden**, einschließlich exakter Grenzlage, Drehung, Rückseite, Verschiebebegrenzung, Schrift-/Motivfallbacks, Familienabgleich, serverseitiger Ablehnung und vollständigem Gravurpaket mit einmaliger Rückseitenspiegelung. Testprotokoll: Code-Repo docs/handoffs/grabkreuze-hunde-20261101/ground-tests.txt.
- **Die sichtbare Browser-/Bedienprüfung ist offen. Der lokale Prüfserver und Editor-Build wurden erzeugt; der automatisierte Browseraufruf wurde als fremder Seitenaufruf mit HTTP 403 abgefangen. Der anschließende Computer-Use-Versuch wurde automatisch beendet, weil die aktuelle Browseradresse nicht sicher erkannt werden konnte. Es gibt deshalb keinen bestandenen interaktiven Konfiguratornachweis und keine Browser-Screenshots dieser Änderung.** Die 120 SVG-Zielvorschauen und daraus neu erzeugten Kontaktbögen verwenden jetzt den gemeinsamen Renderer ohne zusätzlichen Prüfbeschnitt.
- Weiterhin NICHT importieren oder veröffentlichen: beide PRs bleiben Entwürfe; Bedienabnahme, Schriftentscheidung und Designfreigabe fehlen.
- Katalogvollbau erfolgreich: 15 gültige Familien, PDF-/PNG-Ansichten und Excel erzeugt. Unveränderte bestehende Familienansichten gehören nicht zur Lieferung.
- Keine Freigabe, kein Merge, keine Live-Veröffentlichung. Die übrigen elf Produkte und späteren Kreuzgrößen wurden nicht begonnen.

## Nächster Schritt

Claude prüft Code-PR #109 zusammen mit Katalog-PR #125, holt die sichtbare Bedienprüfung auf Desktop und Mobil nach (Verschieben, Drehen, Textwechsel, Motiv ersetzen/löschen, drei Größen, beide Farben) und entscheidet über die ausstehenden Vorlagenschriften. Danach Auswahl korrigieren und den Shop-Entwurf nach gesonderter Freigabe anbinden. Erst danach ist der Probedurchlauf vollständig abnahmefähig.

## Reproduzierbarkeit

Code-Branch dev/grabkreuze-hunde-20261101-astra-mika: scripts/build-grabkreuze-hunde.py, scripts/preview-grabkreuze-hunde.mjs, scripts/check-render-grabkreuze.py, scripts/audit-grabkreuze.py sowie scripts/serve-grabkreuze-review.mjs (lokaler Kundeneditor auf 127.0.0.1:8736, keine Shop-Schreibzugriffe). Die Skripte erwarten den benachbarten isolierten Katalogordner grabkreuze-hunde-katalog. GRAVURU_PYTHON auf den verfügbaren Python-Interpreter setzen; Python-Bibliotheken fontTools, Pillow, CairoSVG, pdfplumber, pikepdf verfügbar machen. Auf Windows für den Katalogbau PYTHONUTF8=1. Quelleninventar quellenpruefung.json stammt aus der ersten Prüfung vor Eingang der ergänzten Kontur; die oben genannte Konturfrage ist inzwischen gelöst.

## Designnachweis

| ID | Modus | Schriften | Motivherkunft |
|---|---|---|---|
| KZ-A-11x20-D0 | Referenz | Montserrat Light, Tangerine | Originalelemente unverzerrt; auf finaler 110×200-Kontur um 0,75 mm vertikal versetzt.; Bestätigter Schriftersatz Champagne & Limousines → Montserrat Light. |
| KZ-A-11x20-D100 | neu | Allura, Cinzel | Motivpfade unverändert proportional aus designs/bestand/kreuze/Allgemein/Allgemein/KZ-A-D0; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D101 | neu | Lora, Rochester | Motivpfade unverändert proportional aus designs/bestand/kreuze/Allgemein/Allgemein/KZ-A-D46; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D102 | neu | Bellefair, Great Vibes | Motivpfade unverändert proportional aus designs/bestand/kreuze/Tiere/Hund/KZ-A-D55; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D103 | neu | Cinzel, Parisienne | Motivpfade unverändert proportional aus designs/bestand/kreuze/Allgemein/Allgemein/KZ-A-D0; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D104 | neu | Dancing Script, Lora | Motivpfade unverändert proportional aus designs/bestand/kreuze/Allgemein/Allgemein/KZ-A-D46; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D105 | neu | Allura, Bellefair | Motivpfade unverändert proportional aus designs/bestand/kreuze/Tiere/Hund/KZ-A-D53; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D106 | neu | Cinzel, Rochester | Motivpfade unverändert proportional aus designs/bestand/kreuze/Tiere/Hund/KZ-A-D55; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D107 | neu | Lora, Parisienne | Motivpfade unverändert proportional aus designs/bestand/kreuze/Allgemein/Allgemein/KZ-A-D46; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D108 | neu | Bellefair, Great Vibes | Motivpfade unverändert proportional aus designs/bestand/kreuze/Allgemein/Allgemein/KZ-A-D0; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D109 | neu | Cinzel, Dancing Script | mika-grabkreuz-hunde-109-20261101 |
| KZ-A-11x20-D110 | neu | Allura, Lora | Motivpfade unverändert proportional aus designs/bestand/kreuze/Allgemein/Allgemein/KZ-A-D46; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D111 | neu | Bellefair, Rochester | Motivpfade unverändert proportional aus designs/bestand/kreuze/Tiere/Hund/KZ-A-D53; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D112 | neu | Cinzel, Parisienne | Motivpfade unverändert proportional aus designs/bestand/kreuze/Allgemein/Allgemein/KZ-A-D0; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D113 | neu | Great Vibes, Lora | Motivpfade unverändert proportional aus designs/bestand/kreuze/Tiere/Hund/KZ-A-D55; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D114 | neu | Bellefair, Dancing Script | Motivpfade unverändert proportional aus designs/bestand/kreuze/Allgemein/Allgemein/KZ-A-D46; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D115 | neu | Cinzel, Rochester | Motivpfade unverändert proportional aus designs/bestand/kreuze/Tiere/Hund/KZ-A-D53; kein Ersatz einer gesperrten Vorlagenschrift. |
| KZ-A-11x20-D116 | neu | Allura, Lora | mika-grabkreuz-hunde-116-20261101 |
| KZ-A-11x20-D53 | Referenz | Great Vibes | Originalelemente unverzerrt; auf finaler 110×200-Kontur um 0,75 mm vertikal versetzt. |
| KZ-A-11x20-D55 | Referenz | Cinzel, Parisienne | Originalelemente unverzerrt; auf finaler 110×200-Kontur um 0,75 mm vertikal versetzt. |
