# production-summary: präzise Fehlerdiagnose

Read-only untersucht; keine Anwendungsquellen oder Sollwerte geändert. Ausgang: gefrorener B+C-Stand cd96934 und main ed4b9c6eca8045ac0f650817fb242ace3f13b7e8.

## Befund

Die Texte fehlen nicht in den PDFs. Die beiden Tests suchen in der PyMuPDF-Textextraktion ASCII-Leerzeichen U+0020, die PDF-ToUnicode-Tabelle liefert mit der auf diesem Windows-System gewählten Arial dagegen U+00A0 (geschütztes Leerzeichen):

- erwartet: Hallo\u0020Wörld; extrahiert: Hallo\u00A0Wörld
- erwartet: Anna\u0020&\u0020Lukas; extrahiert: Anna\u00A0&\u00A0Lukas

Die gesicherten summary.json und die exakt abgefangenen Python-Eingaben enthalten die ursprünglichen Texte mit U+0020. Auch UV-Druck wird als UV\u00ADDruck extrahiert. Der aktuelle rohe Teststatus bleibt unverändert 2/4 fehlgeschlagen; kein Fehler wurde zu einem Pass umklassifiziert.

## Kausaler Nachweis

Der Renderer production-summary.py wählt in Zeilen 10–22 den ersten vorhandenen Fontpfad. Linux-DejaVu/Liberation und macOS-Arial sind hier nicht vorhanden, C:/Windows/Fonts/arial.ttf und arialbd.ttf sind vorhanden. Geladen: Arial Regular / Arial Bold; PyMuPDF VersionBind 2.0.

Arial cmap weist U+0020 und U+00A0 auf denselben Glyphnamen space, Glyph-ID 3; U+002D und U+00AD auf hyphen, Glyph-ID 16. PyMuPDF TextWriter erzeugt in der ToUnicode-CMap die Abbildungen <0003> <00a0> und <0010> <00ad>. Deshalb verliert die Rückabbildung die Unterscheidung zwischen diesen Codepoints.

Die minimale glyph-probe.py ohne Gravuru-Module reproduziert beide Textabweichungen und den Soft-Hyphen mit Arial. Derselbe Eingang über die vorhandene eingebaute Helvetica liefert die drei ASCII-Zeichenfolgen unverändert. Das grenzt den Auslöser auf die Font-/CMap-Rückabbildung im vorhandenen Renderer ein; keine Paketinstallation und kein Versionswechsel. Ein Linux-Lauf wurde nicht ausgeführt und wird nicht behauptet.

## main und CWD

production-summary.test.mjs, production-summary.mjs und production-summary.py sind bytegleich zu gepinntem main; Git-Blobs und SHA256 stehen in source-equality.jsonl. Diese Identität allein war nicht die Schlussfolgerung: Beide exakt gesicherten Renderer-Eingaben wurden mit der über GitHub gepinnten, unveränderten main-production-summary.py erneut gerendert, jeweils aus Repo-CWD und Workspace-CWD. Alle vier Textextraktionen sind exakt gleich zu den B-Ausgaben (main-replay.json). Damit reproduziert main mit identischem Input den Fehler; ein abweichender B-Eingang oder Root-CWD erklärt ihn nicht. Die minimale Fontprobe benötigt überhaupt keine B-Eingaben.

## Layoutprüfung

Die frühere Kürzungshypothese ist widerlegt. Beide Textzeilen werden ausgegeben (shown=1), keine Weiterverweisung ersetzt den Text:

| Fall | Zeilenbeginn | Zeilenhöhe | Tabellenende | Grenze |
| --- | ---: | ---: | ---: | ---: |
| Form | 347,40 pt | 16,40 pt | 363,80 pt | 591,89 pt |
| Nativ | 353,95 pt | 16,40 pt | 370,35 pt | 591,89 pt |

Beide PDFs bleiben eine A4-Seite mit einer Vorschaugrafik. Die Diagnosekopie startet nur die zwei betroffenen Tests, löst relative Importe absolut auf und sichert zusätzlich Ergebnisse/Eingaben. Alle bestehenden Assertions blieben gleich: 0/2 bestanden, gleiche Fehler, 26,3205844 s; capture-tests.log ist die Originalausgabe. Builds liefen erst nach Root-Freigabe und den drei vorherigen Gegenproben; keine parallelen Build-Schreibungen.

## Übergabe

Es handelt sich um einen bereits auf main vorhandenen, fontabhängigen Unterschied zwischen PDF-Textextraktion und strikter Stringprüfung. Die Prüfungen dürfen nicht pauschal als erfolgreich gelten. Eine spätere, gesondert autorisierte Korrektur sollte entscheiden, ob dieser Test die sichtbare Zeichenfolge mit eng definierter Extraktionsnormalisierung prüft oder ob der Produktions-PDF-Renderer die ursprünglichen Unicode-Codepoints beim Kopieren/Extrahieren exakt erhalten muss. Keine dieser Änderungen wurde hier vorgenommen.

Hier versioniert sind Eingaben, Extraktionsergebnisse, Unicode-Tabellen, Layoutdaten, main-Vergleich und Minimalprobe. Die erzeugten Original-PDFs und gepinnten Quellkopien bleiben lokale Diagnoseartefakte; evidence-files.json dokumentiert ihre Originalprüfsummen. Die Quellen sind über die festgehaltenen main-Refs reproduzierbar. Die drei geprüften Appquellen sind nach Abschluss erneut unverändert bestätigt.
