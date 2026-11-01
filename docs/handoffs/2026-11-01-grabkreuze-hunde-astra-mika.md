# Grabkreuz Acryl – Hunde · vorläufiger Prüfstand

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
- **Der Prüf-Viewport blendet die unteren 50 mm aus. Diese Ansicht ist noch KEINE implementierte Erdteil-Sperre im Kundeneditor oder Fertigungsexport.** Der Familienadapter kennt diese Produktregel bisher nicht. Daher NICHT importieren oder veröffentlichen. Technische Integration und Bedienabnahme bleiben offen.
- Katalogvollbau erfolgreich: 15 gültige Familien, PDF-/PNG-Ansichten und Excel erzeugt. Unveränderte bestehende Familienansichten gehören nicht zur Lieferung.
- Keine Freigabe, kein Merge, keine Live-Veröffentlichung. Die übrigen elf Produkte und späteren Kreuzgrößen wurden nicht begonnen.

## Nächster Schritt

Claude prüft die sechs Sichtbögen und entscheidet über die ausstehenden Vorlagenschriften. Danach Auswahl korrigieren und die echte Erdteil-Begrenzung einschließlich Kundeneditor, Fertigung und Shop-Entwurf fertigstellen. Erst danach ist der Probedurchlauf vollständig abnahmefähig.

## Reproduzierbarkeit

Code-Branch dev/grabkreuze-hunde-20261101-astra-mika: scripts/build-grabkreuze-hunde.py, scripts/preview-grabkreuze-hunde.mjs, scripts/check-render-grabkreuze.py, scripts/audit-grabkreuze.py. Die Skripte erwarten den benachbarten isolierten Katalogordner grabkreuze-hunde-katalog. GRAVURU_PYTHON auf den verfügbaren Python-Interpreter setzen; Python-Bibliotheken fontTools, Pillow, CairoSVG, pdfplumber, pikepdf verfügbar machen. Auf Windows für den Katalogbau PYTHONUTF8=1. Quelleninventar quellenpruefung.json stammt aus der ersten Prüfung vor Eingang der ergänzten Kontur; die oben genannte Konturfrage ist inzwischen gelöst.

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
