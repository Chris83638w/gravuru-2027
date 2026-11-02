# Hundeschilder: unterschiedliche Motive und Stile innerhalb jeder Rasse

**Vollständige Motivkorrektur zur 15×10-Lieferung**, Codex, 02.11.2026. Die frühere Größen-/Textprüfung bedeutet keine Abnahme dieses neuen Motivauftrags.

Chris bemängelte das zwölfmal wiederholte Rasseportrait (Beispiel Rex). Auftrag: zwölf wirklich unterschiedliche Hundemotive je Rasse; süßere Motive und gelegentliche Pfötchen; der Gesamteindruck hat Vorrang. Die anschließend hochgeladene feine, naturgetreue Schäferhundzeichnung ist ausdrücklich Stilreferenz. Chris präzisierte: **Die Stile innerhalb jeder Rasse mischen**, nicht auf verschiedene Rassen verteilen. Diese ausdrückliche neue Motivauswahl ersetzt für die Hundeserie die frühere Bindung an ein einziges Katalogportrait. Maß und Texte bleiben im aktuellen 15×10-Auftrag.

## Umfang und tatsächlicher Fortschritt

Geliefert: 55 Hundetypen × zwölf Designs = 660 Hundeschilder. Die 300 Katzendesigns gehören nicht zu dieser Korrektur. Je Rasse eigenständige Motive statt Wiederholungen oder bloßer Spiegelung; naturgetreue Federzeichnungen, süße Welpen, Ruhe-/Spielhaltungen, einzelne Hunde und gelegentlich ein Duo. Vier gezielte Pfotenakzente je neuer Zwölferserie. Bei Duo-Motiven stehen zwei Beispieltiernamen.

Der aktuelle, maschinenlesbare Stand liegt im Katalog unter `auftraege/rasse-15x10-20261102/hunde-vielfalt-status.json`: vollständige Motivzuordnungen, offene Rassen, unterschiedliche Motiv-Prüfsummen und Stilzählung **je Rasse**. `completedBreeds` bezeichnet die Motivzuordnung mit Stil-Mischung, keine Produktionsfreigabe. Alle 55 Serien sind vollständig überarbeitet, keine Rasse ist mehr offen. 54 Serien mischen vier feine mit acht süßen/verspielten Motiven; die Schäferhundserie mischt sechs und sechs. Insgesamt 658 neue Illustrationen, zwei bestehende Schäferhundmotive und ein eigener Pfotenakzent; 220 Schilder mit Pfotenakzent.

## Quellen und Bearbeitung

Maßgeblich bleibt der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md), mit der oben zitierten ausdrücklichen Motiverneuerung von Chris. Neue Illustrationen werden mit der eingebauten Bildgenerierung erzeugt, einzeln gespeichert und als monochrome Vektornäherung mit VTracer aufbereitet. Kein API-Fallback. Prompts und Quellen-/Vektor-Prüfsummen stehen in `motive-eigene/hunde-vielfalt-20261102/herkunft.json`; Rohbilder liegen lokal in `outputs/hunde-motivvielfalt/`. Die ersten vier zusätzlichen Feinserien behalten auch ihre zuvor erzeugten verspielten Alternativen im lokalen Quellenordner.

Neue Vektoren werden in `motive-eigene/motive-eigene.json` registriert, **nicht** in `motive/motive.json`. Freigaben bleiben null. Originale Füllregeln bleiben erhalten, Texte bleiben Text; Motive behalten ihr Seitenverhältnis. Der Pfotenakzent ist eine eigene kleine native Vektorzeichnung und ein separat bearbeitbares Motivobjekt. Rasterquellen, PNG-Vorschauen und ZIPs werden nicht in den Katalog eingecheckt.

Die Vektorumwandlung berücksichtigt auch hellere Linien (Helligkeitsschwelle 200, Speckle-Filter 4). Feine Motive erhalten im Schild eine dezente Konturunterstützung von 0,055 mm; der Wert steht je Design in `fineLineSupportMm`. Die unverstärkte Motivquelle bleibt separat erhalten. Native Prüfbilder werden mit doppelter Pixeldichte aufgenommen, damit dünne Felllinien bei der Kontrolle sichtbar bleiben. Duo-Motive tragen zwei Namen und die Texte „Hier sind wir zuhause“ / „Unser Zuhause. Unser Revier.“. Dies ist eine gestalterische Aufbereitung, keine bestätigte Mindestlinienbreite einer konkreten Gravurmaschine.

## Reproduktion und Prüfung

```text
python scripts/update-ready-dog-variety.py --sources ../../outputs/hunde-motivvielfalt --katalog ../rasse-15x10-katalog --originals ../gravuru-katalog --validation ../rasse-15x10-validation
node scripts/review-rasse-15x10.mjs --katalog=../rasse-15x10-katalog --out=../rasse-15x10-validation --validate
node scripts/review-rasse-15x10.mjs --katalog=../rasse-15x10-katalog --out=../rasse-15x10-review --export
node scripts/screen-rasse-15x10.mjs ../rasse-15x10-review ../rasse-15x10-native
python scripts/audit-rasse-15x10.py ../rasse-15x10-katalog ../../outputs/hunde-vielfalt-review/audit.json
```

`contact-rasse-15x10.py --breed rasse1,rasse2,...` baut den nativen Kontaktbogen für ausgewählte Rassen und führt Claudes Flächenmessung aus. Gesamtbild und Erkennbarkeit werden zusätzlich visuell geprüft; es gibt keine automatische Freigabe anhand einer Flächenzahl. Feine Vektorisierung ist keine verlustlose Wiedergabe und ersetzt keinen Material-/Laser-Probegravurtest.

## Ergebnis und Belege

[Galerie aller 55 Serien](hunde-vielfalt-20261102/index.html), je zwölf native Schildvorschauen mit Flächenmessung und Vorher-nachher-Vergleich. [Abschlusszahlen](hunde-vielfalt-20261102/abschluss.json), [Quellen-/Textprüfung](hunde-vielfalt-20261102/audit.json), [native Größenprüfung](hunde-vielfalt-20261102/validation.json) und [Konfiguratorprüfung](hunde-vielfalt-20261102/konfigurator-pruefung.json).

Alle 960 Designs bestehen Quellen-/Textprüfung; jede der 55 Hundeserien enthält zwölf unterschiedliche Hauptmotiv-Prüfsummen. Alle 55 Quellenbögen wurden visuell auf Motivvariation und erkennbare Zeichenfehler geprüft. Native Schildbögen wurden zusätzlich stichprobenartig geprüft, darunter Labrador, Golden Retriever, Schäferhund, Dackel, Französische Bulldogge, Pudel, Papillon, Rottweiler, Vizsla und Zwergschnauzer. Die zwölf Labrador-Varianten wurden im tatsächlichen Kundenkonfigurator aufgenommen: keine Browserfehler oder Textüberschneidungen. Dies ist eine Anzeigeprüfung, kein durchgespielter Kauf oder Textbearbeitungstest.

300 Katzendesigns bleiben gegenüber der vorherigen Lieferung bytegleich; SVG und Metadaten werden bei der Verpackung gegen den vorherigen Commit geprüft. Alle 660 Hundeschilder bestehen die Flächenmessungen (Versatz höchstens 3 %, Bounding-Box-Fläche mindestens 30 %, Höhe mindestens 45 %). Größte zusammenhängende dunkle Fläche: 6,70 % der Platte, unter der 15-%-Grenze. Die Zusammenfassung steht in `abschluss.json`. Kontaktbögen und UI-Belege liegen als JPG unter 2 MB vor. Die Rasterquellen bleiben lokal.

[Code-PR 136](https://github.com/Chris83638w/gravuru-2027/pull/136) und [Katalog-PR 152](https://github.com/Chris83638w/gravuru-katalog./pull/152). Offen bleiben gestalterische Abnahme und Material-/Laserprobe durch Chris/Operator. Freigaben null; kein Merge, Import oder Live-Schritt.
