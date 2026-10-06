# Bestätigte Roland-Datei und getrennte Mimaki-Dateien – 06.10.2026

Branch `task/print-separations-20261006`, Basis `9a05d1b0d4641ae2a395493ae7a87cc5190964f5`. Nur vorhandene Cloud; private Druckdateien bleiben außerhalb Git.

## Nutzerentscheidung

Mikail bestätigt die zuletzt gelieferte Datei als in Ordnung und für Roland gut. Zugeordnete Quelle: `Roland-Pia-Rafael-Corel-PDF13-Vektorweiss.pdf`, SHA-256 `2a5f60faded9bb1c6d0ac0c6fc896cb2778dfd8a34bcff4042bb151cb65f0552`. Diese konkrete Dateiabnahme ersetzt den offenen Status dieser Probe; sie ist keine Freigabe aller Maschinen/ICC-Profile oder beliebiger späterer Exporte.

Gewünscht: einzelne Texteingaben jeweils gruppieren; Mimaki erhält zwei separate PDFs, eine nur RDG_WHITE und eine normale Farbausgabe ohne RDG_WHITE. Die neue explizite Trennung gilt für diesen Ablauf vor älteren Empfehlungen einer kombinierten Mimaki-Weißersatzdatei. „Komplett RDG_WHITE“ meint die vollständige vorhandene Weißseparation, nicht vollflächiges Weiß über freies Acryl.

## Tatsächlich erstellt

Aus exakt der bestätigten, unverändert erhaltenen Quelle:

- `Roland-Textfelder-gruppiert.pdf`: Farbe + RDG_WHITE + CutContour in einer Datei. Vier Texteingaben mit je einem zusammenhängenden gefüllten Vektorpfad in separaten Form-XObjects; 17/10/10/30 ursprüngliche Glyphenpfade. Keine live editierbaren Schriftobjekte und keine Fontabhängigkeit.
- `Mimaki-NUR-RDG_WHITE.pdf`: nur die ursprüngliche echte RDG_WHITE-Sonderfarbe, ausschließlich Vektorflächen. Kein Foto/Bitmap, kein Farbdruck und keine CutContour. Der Weiß-Inhaltsstrom ist unverändert zur Quelle.
- `Mimaki-FARBE-ohne-RDG_WHITE.pdf`: CMYK-Farbdruck mit gruppierten Textfeldern und beibehaltener CutContour; keine RDG_WHITE-Farbdefinition oder Weißobjekte mehr.

Alle PDFs PDF 1.3, identische MediaBox/TrimBox/BleedBox, 150 × 200 mm, unveränderte Bildauflösung und Positionen, keine zusätzliche Spiegelung oder Skalierung. Einsetzen im RIP seitenbezogen 1:1, nicht automatisch auf sichtbare Objekte beschneiden/zentrieren. Die Mimaki-RIP-Zuordnung der RDG_WHITE-Sonderfarbe bleibt vor Ort zu prüfen. Das automatische Erhalten von PDF-Gruppen beim Corel-Import hängt vom Importer ab; jede Texteingabe ist zusätzlich zu einem einzelnen zusammengesetzten Vektorpfad verbunden.

Privater Ausgabepfad: `/workspace/gravuru-druckproben-getrennt-20261006-final/`. Dieser Cloud-Ordner ist keine zugesicherte dauerhafte gemeinsame Datenablage. Die Dateien wurden im Chat direkt verlinkt; keine privaten Bilder/PDFs in Git oder Snapshot veröffentlicht.

## Reproduzierbarer Ablauf und Prüfung

`scripts/prepare-corel-separations.py QUELLE.pdf NEUER_PRIVATER_ORDNER` unterstützt ausdrücklich nur die geprüfte eigene opake PDF-1.3-Struktur; unbekannte Strukturen werden abgewiesen. Keine allgemeine PDF-Konvertierung. Bestehende Dateien werden nicht überschrieben. Der reguläre Dashboard-Exporter und seine Cache-Rezepte wurden in diesem Paket nicht geändert; die neue Trennung ist hier als separate, wiederholbare Nachverarbeitung umgesetzt.

`PYTHONPATH=.local-data/python python3 scripts/check-corel-separations.py QUELLE.pdf PRIVATER_ORDNER`: alle drei Ausgaben mit MuPDF ohne Reparatur und Ghostscript `-dPDFSTOPONERROR` erfolgreich. Gruppierte Roland-PDF und Mimaki-Farbe bei 150 sowie 300 dpi pixelidentisch zur entsprechenden Quellansicht. Vier Textgruppen, identische Seitenrahmen, ausschließlich Vektoren/unveränderter Weißstrom, physisch entfernte RDG_WHITE-Ressourcen in der Farbdatei, abgewiesenes Überschreiben und unbekannte Eingabe geprüft. Farbansicht zusätzlich geöffnet. [Prüfbericht mit SHA-256](corel-separations-check-20261006.json).

Keine neuen App-Tests/Builds behauptet: vorheriger Stand 300/0/0 und 76/1 bleibt historisch. Die drei neuen PDFs wurden konkret geprüft. Nächster Schritt: Mimaki-Import und Gruppierung im Corel-Importer durch Nutzer prüfen, danach bestätigten Ablauf in den regulären Dashboard-Download übernehmen; vorhandene archivierte Exporte unverändert lassen.
