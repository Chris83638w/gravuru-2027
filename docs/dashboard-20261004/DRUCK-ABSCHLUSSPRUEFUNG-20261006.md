# Druck und Gravur: gezielte technische Abschlussprüfung

Stand: **06.10.2026, abgeschlossen 16:21 Uhr Europe/Berlin**. Geprüfte Codebasis: `4b296b28e2d2c7b6f76e82c98589188c40d2af30`. Eigener Aufgabenbranch: `task/print-completion-20261006`.

## Ergebnis

**36 gezielte Tests bestanden, 0 Fehler, 0 Skips.** Die bereits bereitgestellten drei privaten Corel-Druckproben wurden zusätzlich tatsächlich mit MuPDF und Ghostscript geprüft. Kein weiterer Rendererfehler ließ sich in diesem Prüfumfang reproduzieren. Deshalb keine Änderung an Renderer, Ausgabeversionen, vorhandenen PDFs oder gesicherten Aufträgen.

Die Prüfung lief in der vorhandenen verwalteten Cloud; das Statuswerkzeug bestätigte `provider: cloud`, `running`, `connected` und aktuelle Beobachtungen. Keine neuen Zugänge, Server, Geheimnisse, Live-Shop-Anfragen oder Veröffentlichungen.

## Tatsächlich ausgeführte Prüfungen

```sh
node --test app/configurator/variant-m/print-export.test.mjs \
  app/workshop/print-delivery-vector.test.mjs \
  app/workshop/form-print-proof.test.mjs \
  app/workshop/form-engraving-proof.test.mjs \
  app/workshop/acrylic-engraving.test.mjs
# 28 bestanden / 0 Fehler / 0 Skips

node --test app/workshop/acrylic-review.test.mjs \
  app/workshop/acrylic-import-tint.test.mjs \
  app/workshop/acrylic-production-profiles.test.mjs
# 8 bestanden / 0 Fehler / 0 Skips

PYTHONPATH=.local-data/python python3 scripts/check-corel-separations.py \
  /workspace/gravuru-druckproben-foto-20261006/Roland-Pia-Rafael-Corel-PDF13-Vektorweiss.pdf \
  /workspace/gravuru-druckproben-vektoren-kontur-20261006
# PASS: MuPDF, Ghostscript, Vektorstruktur, Bilddaten, Seitenboxen und Pixelvergleich
```

Die privaten Cloud-Dateipfade sind bestehende Ablagen dieser Aufgabe, keine öffentlich erreichbaren Downloads und keine Zusage dauerhafter gemeinsamer Datenhaltung. Keine privaten Bilder oder PDF-Dateien wurden in Git übernommen.

| Anforderung | Tatsächlich geprüft |
| --- | --- |
| Texte bleiben Vektoren | Je Texteingabe zusammengesetzte Pfade ohne zusätzliche `TextEntry`-Formhüllen; Textpfade bei 300/600 dpi identisch. PDF-Proben enthalten jeweils vier Vektortexte; kein Text wurde zur Bitmap. |
| RDG_WHITE bleibt Vektor | Separate Mimaki-Weißdatei enthält weder Bildobjekte noch Form-XObjects, sondern die ursprünglichen Weißpfade und CutContour. |
| Weiß nur unter Druck | Synthetische native/Form-Prüfungen kontrollieren leere Flächen, Fotofelder, Transparenz, Bohrungen und eingefärbte Importquellen. Default `white: motif`; vollflächiges Weiß bleibt eine ausdrückliche alternative Einstellung. |
| Mimaki getrennt, deckungsgleich | Farbe ohne RDG_WHITE sowie reine RDG_WHITE-Datei mit Außen-/Lochkonturen; identische Seitenboxen, Ursprung und Geometrie, mit/ohne Spiegelung und Überdruck. |
| Farbe und Auflösung | DeviceCMYK mit Standard 300 dpi; 600 dpi wählbar. Generische Separation, ausdrücklich kein gemessenes Drucker-ICC. |
| Überdruck nur bei Randdruck | Angeforderter Überdruck entfällt bei innenliegendem Druck; bei Randdruck Fortsetzung der Randpixel, kein Skalieren des Designs. Weißüberdruck getrennt, Bohrungen bleiben frei. |
| Rückseite einmal gespiegelt | Asymmetrische Farbverteilung, Textpfade, Bohrung, Weiß und Kontur gemeinsam geprüft. |
| Gravur eigenständig | Grau-/Rastergravur bzw. echte Vektorgravur, Schnittkontur separat, keine Druck-Weißebene. Rasterbilder werden nicht als angebliche Vektoren ausgegeben. |
| Gesicherter Stand | Ursprüngliche Fotos erhalten; Druckausgabe aus eingefrorenen Daten und Profilrevisionen; wiederholter Download bytegleich. |
| Szene ausgeschlossen | Sockel, Reflexionen, Materialfarbe und UV-Vorschautextur bleiben außerhalb der tatsächlichen Druck-/Gravurdaten. |

## Unveränderte private Druckproben

| Datei | SHA-256 |
| --- | --- |
| Roland-Textfelder-gruppiert.pdf | `d723225dfbc79c0c682aa5017149c0138d25b987a933b53b5efa7e9899fab6aa` |
| Mimaki-NUR-RDG_WHITE.pdf | `c8547a326d05457f1ac6700ba1c7a4a66ead6a640dcb2cc9a64dd831b0fde3e2` |
| Mimaki-FARBE-ohne-RDG_WHITE.pdf | `7a331d08cef266e5b9320f4cedc3eacbb1cfcd3be48d2174a5ae8f835d0f7efc` |

Für alle drei: MuPDF ohne Reparatur, Ghostscript ohne Fehler, gleiche Media-/Trim-/BleedBox wie die Quelle, CutContour vorhanden. In Roland und Mimaki-Farbe sind die ursprünglichen Bilddaten bytegleich; die gerenderte Farbansicht ist bei 150 und 300 dpi pixelidentisch zur entsprechenden Quellseparation. Die Mimaki-Weißoperatoren sind unverändert. Überschreiben vorhandener Probe-PDFs sowie unbekannte Eingabestrukturen werden vom vorhandenen Werkzeug abgewiesen.

## Grenzen und nächster tatsächlicher Schritt

- **Keine reale Corel-/Mimaki-/Roland-Prüfung in diesem Lauf.** Technische PDF-Prüfung ersetzt keine RIP-/Maschinenfreigabe. Die frühere Nutzerfreigabe für die damalige Roland-Datei bleibt ein eigener historischer Nachweis.
- Die privaten Corel-Proben sind PDF 1.3. Der normale Backend-Renderer liefert PDF 1.7 mit transparenter Farbgruppe. Dessen Importkompatibilität wird nicht aus dem Erfolg der privaten PDF-1.3-Datei abgeleitet.
- Der ältere direkte Konfigurator-Prüfdownload ist ein separater Clientpfad mit Mimaki-Weißersatz. Die hier bestätigte getrennte RDG_WHITE-Ausgabe gehört zur gesicherten **Backend-Ausgabe**. Keine Gleichheit dieser beiden Wege behaupten.
- Keine zusätzlichen UI-Änderungen, daher keine neue Browserabnahme in diesem Teilpaket. Vollständige Suite und Build hier nicht wiederholt; die 36 gezielten Tests sind kein neuer Gesamt-Teststand.
- Die Tests prüfen die Verarbeitung bereits gesicherter Bildquellen. Sie schließen keinen vorherigen Auflösungsverlust im interaktiven Fotoeditor aus. Die separat gefundene Begrenzung bearbeiteter Bilder auf die Vorschauauflösung wird in einem anderen Teilpaket korrigiert und gesondert geprüft.
- Nächste notwendige externe Prüfung: die oben per SHA identifizierten Dateien tatsächlich in Corel/VersaWorks bzw. dem verwendeten Mimaki-RIP importieren und einen Probedruck mit dokumentiertem Ergebnis zur konkreten PDF ausführen. Endgültige ICC-/Materialparameter bleiben bis zu ihrer Bestätigung offen.
