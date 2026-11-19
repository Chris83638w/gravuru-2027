# Späterer Integrationsweg für Kandidat A

Fester Bezug ist der gemeinsame Hauptzweig `72bf9bb2`. PR #268 enthält 68 weitere Commits bis `f8c2d583`. 46 davon lagen bereits im gemeinsamen Wettbewerbsausgangspunkt `f84433f8`. Die folgenden 22 umfassen Beta-Arbeit, Schiefer, Werkstatt und Übergaben mehrerer Beteiligter. Der getrennte Tempozweig basiert auf `f8c2d583`. Die geschützte Beta verwendete für den Vorher-Vergleich den Anwendungscode `347aa63f` und für die zweite Messrunde `f7504182`. [Groks unabhängige Prüfung](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7012063451) · [Verlauf von PR #268](https://github.com/Chris83638w/gravuru-2027/pull/268/commits)

## Einzeln abnehmbare Pakete

| Reihenfolge für eine spätere Integration | Schnitt und Rückweg |
| --- | --- |
| 1. Gemeinsame Basis feststellen | Nach Chris’ Auswahl den dann aktiven Hauptzweig und dessen ausgelieferte Dateien festhalten. Bestehende P1-Schalter und Schriften haben eigene Abnahmen. Anhand der Liste unten prüfen, welche Änderungen bereits vorhanden sind. |
| 2. Vorschau und Originalmedien | Nur die benötigten Änderungen aus `0d120e84` und `347aa63f` einschließlich ihrer Quellenmodule und Tests auf die Basis übertragen. Beide echten Ring-PNGs, Gerätefoto, Zierlinie, SVG und Druckpfad prüfen. Bei Rücknahme nur die Anwendungsversion zurücksetzen. Gesicherte Kaufrevisionen bleiben lesbar. |
| 3. Karten und Rendering | Relevante Kundeneditor-Hunks aus `73767418` und `ac8e1384` einzeln portieren. `174cf8a6` und `a285e016` reduzieren später das wiederholte Zeichnen. Jeweils bei gleicher Geräteposition mit sichtbarer Karte, erkanntem Design, korrekt gezeichneter Fläche und unveränderten Pixeln vergleichen. Fremde Test- und Übergabedateien aus gemischten Commits getrennt zuordnen. |
| 4. Bildverarbeitung | `e8d46ffe` lässt zwei kleine, vom Editor erzeugte Vorschaubilder denselben begrenzten Bildprozess benutzen. Einzelimporte, große Eingaben und Originale behalten den Einzelpfad. Separater Rückweg über diesen Commit. Die gespeicherten PNGs müssen den Einzelimporten bytegenau entsprechen. Vor einer Produktionsentscheidung Linux mit mehreren gleichzeitigen Speichervorgängen prüfen. |
| 5. Warenkorbansicht und Beta-Transport | Warenkorbseite und Drawer mit echten Shopify-Theme-Positionen separat im ausgewählten Testshop abnehmen. Die Messwerkzeuge in `tools/beta-267/` dienen der privaten Prüfung. `f7504182` ändert ausschließlich den vorhandenen nativen Bild- und Shopify-Pfad und lässt sich einzeln zurücknehmen. Rückweg für den Prüfer ist der Referenz-Freeze. Vor einem späteren Themewechsel dessen vorherige Version sichern und einzeln rückschaltbar halten. |
| 6. Preiswirksames Zubehör | `6b5bd953`, `a9b27e14` und `87ec1a88` separat Mika und Mikail vorlegen. Die Schiefer-Hunks aus dem gemischten ersten Commit getrennt von der Fotoabnahme behandeln. Bestehende Geometrieentscheidung, Preis-Excel, konkrete Produkte und spätere Freigabe gemeinsam abgleichen. |
| 7. Werkstatt und Schriften | Fotoregel `ed2072b1`, Kontur-PDF `42dd2276`, ältere Schriftauswahl und nicht bereits enthaltene P1-Anteile separat durch die jeweiligen Zuständigen abnehmen. Physischer Druck, Holz-Produktbindung und Handybedienung bleiben eigene Abnahmen. |

Für die spätere Auswahl je Paket auf einem eigenen Zweig vom dann gültigen Hauptstand beginnen, nur die fachlich genannten Quelldateien portieren, gezielte Regression und gemeinsames Ring-/Materialprotokoll anhängen. In umgekehrter Reihenfolge einzeln rücknehmbar halten. Chris entscheidet über jede Auslieferung. Für dieses Messpaket erfolgte kein Merge.

## Einzelinventar

| Commit | Zugehörigkeit | Git-Betreff |
| --- | --- | --- |
| `9401cf5d` | P1 / frühere Warenkorbarbeit | docs: Messung und Vorschlag Warenkorb-Ladezeit (nur Vorschlag) |
| `2e3145f9` | P1 / frühere Warenkorbarbeit | V1: Warenkorb ohne PNG-Down-/Upload ueber das Kundengeraet |
| `abae6d4c` | P1 / frühere Warenkorbarbeit | V2+V3: Kundenvorschau als WebP, Checkout-Bild frueher starten |
| `11f4752c` | P1 / frühere Warenkorbarbeit | V4: Fortschrittsanzeige beim Warenkorb (1-4 von 4, Ladesymbol, Hinweis) |
| `be163c5d` | P1 / frühere Warenkorbarbeit | #252: Warenkorb-Übergabe übersteht Versionswechsel alter und neuer Tabs |
| `2d133af0` | P1 / frühere Warenkorbarbeit | P1 #254: measure each cart server phase before optimizing |
| `17c7ff30` | P1 / frühere Warenkorbarbeit | P1 #254: document timings, comparable measurements and review limits |
| `c8043835` | P1 / frühere Warenkorbarbeit | P1 #254: include raw synthetic before and after measurements |
| `7054b89e` | P1 / frühere Warenkorbarbeit | Measure process event-loop delay around cart requests (B1) |
| `9af3a1ac` | P1 / frühere Warenkorbarbeit | Document B1 validation and same-profile timing measurements |
| `13c3a1e6` | P1 / frühere Warenkorbarbeit | Record B1 review closure and remaining diagnostic decisions |
| `9f57118a` | P1 / frühere Warenkorbarbeit | Add step 1b CPU, resource, GC and storage diagnostics |
| `b169fcf0` | P1 / frühere Warenkorbarbeit | Allow paired diagnostics benchmark with the actual SQLite registry |
| `68515bf5` | P1 / frühere Warenkorbarbeit | docs: record P1 resource diagnostics and paired measurements |
| `e447a859` | P1 / frühere Warenkorbarbeit | docs: close Claude review of P1 resource diagnostics |
| `b55ed466` | P1 / frühere Warenkorbarbeit | docs: add sanitized raw evidence of the P1 1b live measurement |
| `515b522a` | P1 / frühere Warenkorbarbeit | docs: record completed 1b live measurement and rollback |
| `105e3980` | P1 / frühere Warenkorbarbeit | docs: clarify measured rollback window and review confirmation |
| `cdd63ea0` | P1 / frühere Warenkorbarbeit | perf: reuse product reads within synchronous cart validation phases |
| `97fe62d9` | P1 / frühere Warenkorbarbeit | perf: prepare immutable checkout image immediately after draft save |
| `726787b0` | P1 / frühere Warenkorbarbeit | perf: prepare unchanged Prio drafts on existing overview behind disabled switch |
| `d7b00751` | P1 / frühere Warenkorbarbeit | fix: keep optional image source failures off successful cart paths and prove read scopes |
| `da926254` | P1 / frühere Warenkorbarbeit | fix: refresh prepared drafts after failed handoff and measure speculative load |
| `964826b2` | P1 / frühere Warenkorbarbeit | docs: close P1 implementation review and record disabled V3 activation limits |
| `7432b925` | P1 / frühere Warenkorbarbeit | docs: add sanitized raw evidence of the P1 A+V2 live measurement |
| `811f45d2` | P1 / frühere Warenkorbarbeit | docs: close measured A/V2 live window and verify rollback |
| `b9fc979f` | P1 / frühere Warenkorbarbeit | perf(p1): write byte-identical review ZIP with native CRC and detail timings |
| `e95d8797` | P1 / frühere Warenkorbarbeit | fix(p1): release review archive behind delivered PNG buffer |
| `05baae95` | P1 / frühere Warenkorbarbeit | perf(p1): memoize canonical digest of freshly read document bytes |
| `a265b47e` | P1 / frühere Warenkorbarbeit | chore(p1): include existing heap and buffer samples in timing log |
| `d5552eed` | P1 / frühere Warenkorbarbeit | docs(p1): record memory controls and nineteen percent local improvement |
| `228527bc` | P1 / frühere Warenkorbarbeit | docs(p1): add complete synthetic memory and timing raw series |
| `e180089b` | P1 / frühere Warenkorbarbeit | docs(p1): record read-only font and motif size breakdown and Claude review |
| `24110836` | P1 / frühere Warenkorbarbeit | docs(p1): close reviewed round and record next profiling step |
| `9d00b056` | P1 / frühere Warenkorbarbeit | docs(p1): close Claude measurement review |
| `b5874bc2` | Schriften / früherer Ausgangsstand | docs: Variante C als Zielbild und 84 Schriften zur Auswahl |
| `848631b3` | Schriften / früherer Ausgangsstand | docs: Schriftproben als unveränderte PDF-Binärdatei führen |
| `f2f4f97b` | Schriften / früherer Ausgangsstand | docs: neun zusätzliche Konfi-Schriften vollständig aufnehmen |
| `e8133dc6` | Schriften / früherer Ausgangsstand | docs: Umlautkonturen prüfen und Schriftproben kennzeichnen |
| `18fa446c` | Schriften / früherer Ausgangsstand | docs: Zeichenprüfung präzise als Konturbeleg benennen |
| `3ba476d6` | Schriften / früherer Ausgangsstand | docs: Claudes Schriftenreview ohne Restpunkte festhalten |
| `54f81ceb` | Schriften / früherer Ausgangsstand | docs: propose three font groups from the selected 66 fonts |
| `7d450592` | Schriften / früherer Ausgangsstand | fix(konfi): load chosen text font and retain current design choices |
| `452e4baf` | Schriften / früherer Ausgangsstand | fix(konfi): clarify unavailable text font after review |
| `3aaa13b9` | Schriften / früherer Ausgangsstand | docs(konfi): record completed font loading review |
| `f84433f8` | Schriften / früherer Ausgangsstand | fix(konfi): withdraw unrequested empty-font message |
| `73767418` | R15 / Karten, Profile und Abnahme | Beta 267: reuse physical profiles and verify ordered output through R15 |
| `6b5bd953` | Schiefer / Mika und Mikail | Apply confirmed slate stand geometry and exercise R15 photo downloads |
| `a9b27e14` | Schiefer / Mika und Mikail | Distinguish traced rectangular slate blanks using their original catalogue group |
| `ac8e1384` | R15 / Karten, Profile und Abnahme | Load visible Ring design cards in data saving mode and verify source prices and cuts |
| `30332961` | Zusammenführung / Nachweise | Document measured Ring parity, ordered files and isolated beta access for issue 267 |
| `aeddd22f` | Zusammenführung / Nachweise | Merge remote-tracking branch 'origin/dev/astra-r15-beta-267-20261119' into dev/astra-r15-beta-267-20261119 |
| `ed2072b1` | Werkstatt / Reproduzierbarkeit und Fotoregel | Prüfe Fotoauflösung für vollständige Originale, Masken und bewussten Zuschnitt |
| `5a2200d1` | Zusammenführung / Nachweise | Dokumentiere R15-Livewarenkorb, Gegenprüfungen und Beta-Abnahme zu #267 |
| `87ec1a88` | Schiefer / Mika und Mikail | Belege Zuständigkeit und bestätigte Formregel für Schieferständer |
| `42dd2276` | Werkstatt / Reproduzierbarkeit und Fotoregel | Erzeuge das gleiche Kontur-PDF aus derselben bestellten Revision |
| `a6c76750` | Zusammenführung / Nachweise | Halte gemeinsame Gegenprüfung und reproduzierte Fertigungsnachweise fest |
| `6aa8e07e` | R15-Revision und Prüfwarenkorb | Warenkorbrevision vor Editorstart laden und einen isolierten Beta-Warenkorb bereitstellen |
| `1b4ae2aa` | Warenkorb / isolierter Prüfstand | Zeige zwei getrennte persönliche Ring-Vorschauen im isolierten Warenkorb |
| `d12b3d02` | Zusammenführung / Nachweise | Belege zwei persönliche Warenkorbbilder auf PC und Handybreite |
| `52aec8d3` | Warenkorb / isolierter Prüfstand | Halte die lokale Warenkorbübergabe bis zum bestätigten Seitenwechsel offen |
| `8385194f` | Warenkorb / isolierter Prüfstand | Persönliche Vorschau je Position auf Warenkorbseite und in der Kurzansicht zeigen |
| `70cbad3d` | Warenkorb / isolierter Prüfstand | Führe Ring-Variantenbindung und alle Prüfprodukte im geschützten Kandidaten A zusammen |
| `e7fe4df2` | Warenkorb / isolierter Prüfstand | Übernimm den bestätigten lokalen Seitenwechsel auch für den gemeinsamen Prüfwarenkorb |
| `0d120e84` | R15 / Originalquellen der persönlichen Vorschau | Gerätefoto und Edelstahlstruktur im persönlichen Ring-Vorschaubild mitnehmen |
| `347aa63f` | R15 / Originalquellen der persönlichen Vorschau | Geprüfte Originalmotive im persönlichen Vorschaubild erhalten und Gerätemodule getrennt laden |
| `e7540562` | Zusammenführung / Nachweise | Belege die geschützte Astra-Beta auf PC und Handy am eingefrorenen Stand |
| `f8c2d583` | Zusammenführung / Nachweise | Ergänze Vergleichsbasis zu Groks V0 und die Rohdaten der Ring-Prüfung |
