# Importfarbe und verbindliches Vektorweiß – 06.10.2026

Branch `task/acrylic-import-tint-20261006`, Basis `e70aeb2b10bc7d441bebfa4509205a655a7fb283`. Bestehende Cloud-Arbeitskopie; keine Veröffentlichung, Shopify-Mutation oder privaten Daten in Git.

## Ergebnis

Importierte SVG/PDF-Motive mit ausgeschalteter Originalfarbe wurden in der Vorschau eingefärbt, die native Druckausgabe lehnte sie bisher ab. Der Export übernimmt jetzt die gewählte Farbe und erhält die Alpha-Abdeckung. Rasterisierung erfolgt nach tatsächlicher Platzierung und Ausgabe-dpi; eingefrorene Originaldateien bleiben bytegleich. Für Gravur gilt die einfarbige Darstellung des importierten Motivs; ein Rasterimport wird nicht als echte Vektorgravur ausgegeben.

Die Nutzerregel ist verbindlich: **RDG_WHITE immer als geschlossene gefüllte Vektorflächen und echte Sonderfarbe**, auch unter Fotos. Keine Bitmap-/Bildmasken-/Softmask-Weißobjekte. Diese Regel steht in MASTER-BEDIENREGELN.md und ist durch eine zusätzliche Strukturprüfung im bestehenden PDF-Test abgesichert.

## Tatsächliche Prüfungen

- Cloud-Check vom 06.10.2026, 11:40:58–11:42:44 Europe/Berlin: **292 Tests, 0 Fehler, 0 Skips; Build 76 Ressourcen/1 Modell**. Python/Referenzen bestanden.
- Drei gezielte neue Importtests: SVG- und PDF-Einfärbung, Originalbytes, transparente/halbtransparente Bereiche, motivbezogenes Weiß, unveränderte Originalfarben und Gravurausgabe einschließlich Ablehnung als Vektorgravur.
- Cloud-Chromium vom 06.10.2026, 11:42:09–11:42:29 Europe/Berlin: Konfi-Farbfilter, tatsächlicher Roland-PDF-/Mimaki-ZIP-Download, Farb-/Alpha-Stichproben, separate Mimaki-Weißdatei, Desktop 1440/Handy 390/Tablet 768; keine JavaScript-Fehler. Nur synthetische Prüfdaten.
- Nach Ergänzung der Vektorweiß-Regel: die 12 Druckexport-/Importfarbtests gezielt erneut ausgeführt: 12 bestanden, 0 Fehler/Skips. Kein erneuter vollständiger 292-Testlauf behauptet.

## Konkrete neue Foto-Druckproben

Nutzer-Master-ZIP erneut anhand aller 17 Manifestdateien geprüft. Das vorhandene Beispielfoto wurde durch die aktuelle Import-/Snapshot-/Druckstrecke übernommen. Neue Roland-/Mimaki-PDFs: 150 × 200 mm, 300 dpi, DeviceCMYK, motivbezogenes Weiß, 0 mm Randzugabe, ungespiegelt. Foto 1122 × 1402 Pixel, in dieser Platzierung effektiv 237 dpi. Layout verwendet die bestehende Importanpassung Faktor 0,93 an den sicheren Acrylbereich; keine behauptete Pixelgleichheit zum historischen PDF. Schriften als Pfade; Originalfoto im privaten ZIP bytegleich erhalten. Dies ist keine vom Nutzer bearbeitete Browsergestaltung.

Roland-Datei SHA-256 `80e7b14850d22d07a0bde5f048f01a5a9dacadd72960039b47fd1f0cbfa355a3`: RDG_WHITE enthält **1485 geschlossene Rechteck-Teilflächen und Schriftpfade**, 68 Fülloperationen, echte `/Separation /RDG_WHITE`, keine Bildaufrufe/Softmask in dieser Ebene. Freie Ecke transparent und Foto hinterlegt geprüft. Farbebene enthält erwartungsgemäß das Rasterfoto.

Nach Nutzerhinweis zusätzlich separate `Roland-RDG_WHITE-NUR-VEKTOR-150x200.pdf` aus genau dieser Weißebene erzeugt: 69247 Bytes, 0 Bildobjekte, 0 Softmasks, 68 Vektorzeichengruppen, Sonderfarbe erhalten. Das ist ein isolierter Diagnoseexport; die kombinierte Datei wurde nicht heimlich ersetzt. Die Fotos und Druckartefakte liegen nur privat außerhalb des Repositorys unter `/workspace/gravuru-druckproben-foto-20261006`, keine dauerhafte gemeinsame Datenablage zugesichert.

## Grenzen und nächster Schritt

Der Nutzer meldet ein Problem bei der Probe. Corel-/VersaWorks-Import der konkret gelieferten Datei ist hier nicht beobachtbar; Ursache noch offen. Vektorstruktur in der Datei belegt nicht automatisch die Interpretation jedes RIP/Importers. Keine Corel-/RIP-/Maschinenfreigabe, kein gemessenes ICC-Profil. Farbabbildung weiterhin generisches DeviceCMYK. Als nächstes die separate Sonderfarben-Vektor-PDF im betroffenen Programm prüfen und dessen konkrete Meldung/Objekttyp abgleichen; keine pauschale Vollflächenweiß-Änderung.
