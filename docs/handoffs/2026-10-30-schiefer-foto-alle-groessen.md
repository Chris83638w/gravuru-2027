# Hunde und Katzen mit Foto · Schiefer · 30.10.2026

Je 30 ausgewählte Bestandsdesigns für Hunde und Katzen, umgesetzt für alle geometrisch bestätigten Produkte der finalen Excel. **810 Master, 2.310 Größenableitungen, 27 Kontaktbögen.** 39 Hundeprodukte und 38 Katzenprodukte; Knochen nur für Hunde. Skalierbare Reihen teilen einen Master. Premium, Bruchkante und feste Kordelprodukte bleiben getrennt.

Öffnen: [GALERIE.html](GALERIE.html). Dort sind alle Kontaktbögen, Einzel-SVGs, Originalvorlagen und Lochvarianten verlinkt. [Größenüberblick](groessen-ueberblick.png).

## Lieferumfang

| Reihe | Hunde | Katzen |
|---|---:|---:|
| herz-102 | 30 | 30 |
| herz-schief-26x19 | 30 | 30 |
| knochen | 30 | 0 |
| kreuz | 30 | 30 |
| quadrat | 30 | 30 |
| rechteck-2-1 | 30 | 30 |
| rechteck-2-3 | 30 | 30 |
| rechteck-3-1 | 30 | 30 |
| rechteck-3-2 | 30 | 30 |
| rechteck-3-4 | 30 | 30 |
| rechteck-4-3 | 30 | 30 |
| rechteck-4-5 | 30 | 30 |
| rechteck-5-4 | 30 | 30 |
| rund | 30 | 30 |

- `master/<reihe>/<design>/vorschau.svg`: eigenständige Kundenansicht, Originalfoto eingebettet, originale Fotomaske, Upload-Hinweis direkt auf dem Foto. Schrift als Vektorpfade.
- `master/<reihe>/<design>/gravur.svg`: gleiche Gestaltung, schwarze Gravurvektoren auf transparentem Hintergrund, Originalfoto eingebettet, ohne Bedienhinweis. Blaue technische Konturen bleiben enthalten. Musterfoto als Platzhalter markiert; erst das bestätigte Kundenfoto wird Produktionsinhalt.
- `master/<reihe>/<design>/design.svg` und `design.json`: editierbare Texte und einzeln benannte Motive/Fotofelder für die Übergabe. Schriften werden aus dem freigegebenen Katalog benötigt.
- `ableitungen/Rxx/<design>/`: konkrete Excel-Produktgröße mit ausschließlich den dort vorgesehenen Bohrvarianten; je Variante Vorschau und SVG ohne Bedienhinweis.
- `originalfotos/`: zusätzlich unveränderte Quelldateien, benannt mit SHA-256. Keine Neucodierung, Neuberechnung oder KI-Erzeugung der Bilddaten. Die vorhandene Quellauflösung bleibt erhalten; es wird keine höhere Auflösung behauptet.
- `quellen/` und `quelle-*.png`: Originalvorlagen zum Vergleich. Alle Bilder und Motive stammen aus dem eigenen Katalog.

## Gestaltung und Herkunft

Grundlage: [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md), Issue #76, NEUSTART.md und die nachfolgenden Nutzeranweisungen in diesem Chat. Die Freigabe des Molly-Fotobeispiels einschließlich Upload-Hinweis ist die Ausführungsreferenz.

Passende Rechteckvorlagen wurden proportional übernommen. Bei anderen Formaten wurden Foto, Name, Daten, vollständiger Spruch und vorhandene Motive passend zur Platte angeordnet. Die Originalmaske und Motive werden nur gleichmäßig skaliert/verschoben. Es wurden keine fremden oder neuen Fotos verwendet.

Ein Teil der Tierordner enthält Bilder der jeweils anderen Tierart. Für 29 von 60 Vorlagen wurde deshalb ein passendes Hunde- bzw. Katzenfoto aus dem eigenen Bestand zugeordnet, ebenfalls bytegleich und innerhalb der ursprünglichen Maske. Die Zuordnung steht vollständig in `auswahl.json` und `fotonachweise.json`; die Originalvorlage bleibt daneben sichtbar. Zwei Hunde- und drei Katzenvorlagen stammen aus weiteren Bestandsformaten. Unbrauchbare extrahierte Masken/Motive (D213, D208, D220) und Vorlagen ohne verfügbare freigegebene Schrift wurden nicht verwendet.

26 verwendete Katalogschriften: Allura, Arvo, Ashley, Baby Boho Script, Bellefair, Betsy Bailey, Caveat, Caviar Dreams, Cinzel, Comfortaa, Cookie, Cormorant Garamond, Dancing Script, Desyrel, Great Vibes, Hello Georgia, Homage, Kaushan Script, Lato, Libre Baskerville, Montserrat Light, Poppins ExtraLight, Stylish, Sunflower, Sweetie, Tangerine. Nur vorhandene Original- oder bereits freigegebene Ersatzschriften aus `ersatz-gedenktafeln-22x14.json`. Keine neuen Schriftfreigaben angenommen. Quellen und Ersatznamen stehen je Text in `design.json`.

Ohne Bohrlöcher ist die primäre Ansicht. Außenkonturen und vorhandene Bohrlöcher sind `#0000ff`. Zwei Löcher liegen gemäß Excel seitlich mittig; beim 20×30-Hochformat bleibt die ausdrücklich bestätigte Excel-Ausführung oben/unten. Vier Löcher liegen an den Ecken. Bei Textkonflikten werden Zeilen umgebrochen/neu angeordnet. Es werden keine nicht angebotenen Varianten erfunden.

## Prüfung

- 17,400 SVG-Dateien geprüft; 17,400 Foto-Einbettungen per SHA-256 bytegleich mit den Quelldateien.
- 1,862 Maskentransformationen geprüft: identische Pfadstruktur und gleichmäßige Skalierung, keine Verzerrung.
- 2,414 Foto-Anordnungen gegen die Plattengeometrie geprüft, einschließlich deckender schwarzer Originalränder.
- Editierstruktur zusätzlich semantisch verglichen (`editierstruktur-pruefung.json`): eindeutige Pfadschreibweise und die Schmetterlingswolke als zusammengehörige Motivgruppe, ohne Bild-, Masken-, Pfad- oder Textänderung.
- 7,140 Upload-Hinweise in den Kundenansichten; keine in den Gravur-/Editierdateien.
- Maße, blaue Konturen, Lochanzahl, Lochmittelpunkte und Durchmesser gegen die Excel-Daten geprüft. Vollständige Texte, Motivanzahl, Mindestschriftgröße 3 mm und Bild-Seitenverhältnisse geprüft.
- Ergebnis der eigenständigen SVG-Prüfung: **0 Fehler**. Vollständiger Nachweis: `qualitaetspruefung.json`.
- Sichtprüfung der gerenderten Kontaktbögen und repräsentativer Einzeldateien; deckende Bildränder bei den Sonderformen wurden durch proportionale Platzierung korrigiert. Rohbilder und Masken bleiben unverändert.

## Noch nicht im Konfigurator freigegeben

Das unveränderte Pflichtwerkzeug `scripts/design-pruefung/konfi-vorschau.mjs` wurde für die 60 Master auf 22×14 mit einer isolierten, Excel-konformen Familie ausgeführt: **{'passt': 41, 'passt nicht': 19}**. Der originale SVG-Leser wurde außerdem auf allen 810 Mastern ausgeführt; 0 Parserfehler. Die nativen Ergebnisse sind unverändert unter `konfi-pruefung/` beigefügt.

Diese technische Passungsprüfung ist keine visuelle Foto-Abnahme im Konfi: Der bestehende Import ersetzt freie Pfadmasken durch Rechtecke und übernimmt eingebettete Data-URI-Musterfotos nicht. Die Meldungen „passt nicht“ betreffen die vom Import berechneten Namens-, Motiv- und Maskenbegrenzungen; die eigenständigen SVGs wurden gesondert geprüft. Auch die bekannte Behandlung offener Linien/Rahmen bleibt eine Konfi-Grenze. **Die gelieferten Kontaktbögen zeigen die fertigen eigenständigen SVGs, nicht den noch fehlerhaften nativen Import.** Eine native Integration, Live-Veröffentlichung oder Produktionsfreigabe wird nicht behauptet; `freigabe` bleibt `null`. Das frühere Paket ohne Foto bleibt unangetastet.

## Bewusst ausgelassene bzw. offene Produkte

Wie vom Nutzer entschieden bleiben diese fünf Herzprodukte bis zur Maßklärung mit Claude ausgelassen: R11 geschnittenes Herz 24×19, R12 schiefes Herz 18×13, R39 Bruchkante-Herz 20×20, R40 Bruchkante-Herz 25×25, R49 festes Kordel-Herz 22,5×26,7. Excel-Umhüllungsmaß und tatsächliche SVG-Kontur widersprechen sich. Die Produktarten wurden nicht miteinander ersetzt.

Bei vier festen Kordelprodukten sind Design und Außenkontur vorhanden, die vom Lieferanten vorgegebenen Lochmaße fehlen jedoch: R42 20×10, R45 25×20, R47 20×25, R48 Herz 10×10. Sie heißen ausdrücklich `kordel-fest-LOCHMASSE-OFFEN`; keine erfundenen Bohrkonturen und keine zusätzliche Variante ohne Löcher. Stern R16 gehört ausschließlich zu Sternenkindern und ist außerhalb dieses Auftrags.

Nächster Integrationsschritt: freie SVG-Fotomasken und eingebettete Originalbilder im Konfi übernehmen; danach erneuter nativer Sichtvergleich. Die fünf Maßkonflikte und vier Lieferanten-Lochbilder müssen aus den Originalunterlagen geklärt werden.


## Übergabestand

Katalog-Branch: dev/schiefer-foto-alle-groessen-20261030-astra-mika; letzter signierter Berichts-/Kontaktbogen-Commit: https://github.com/Chris83638w/gravuru-katalog./commit/d2b33bb84840fd797c6ee75ea0b30283643ed3d1. Vollständige SVG-Dateien im lokalen ZIP, nicht vollständig remote.

Hunde-Katzen-Foto-Alle-Groessen-SVG.zip · 2864350332 Bytes · SHA-256 84e4bc44e7d5a45ae46e0e9e6cb375646c7534b5da3e2c6d4ba523deed1f9543 · ZIP-CRC geprüft.

Hunde-Katzen-Foto-Kontaktboegen.zip · 30639470 Bytes · SHA-256 1ad1e1668c1d737058eddab5ca07d4a1538db967f188c33732d8f2646d478730 · ZIP-CRC geprüft.

Reproduktion im Windows-Projektordner aus NEUSTART: Skripte in work/, vorhandene Quellkataloge und Excel-/Kontur-Auswertung aus dem Ohne-Foto-Paket bereitstellen. Use-GravuruEnvironment.ps1 laden, zusätzlich outputs/schiefer-hunde-katzen-22x14-test/python in PYTHONPATH. Reihenfolge: build → audit → normalize → check → render → verify gallery → package. Python/fontTools/Pillow und vorhandenes Node/Playwright/Chrome. Keine Quelldateien oder Konfi-Funktionen geändert.
