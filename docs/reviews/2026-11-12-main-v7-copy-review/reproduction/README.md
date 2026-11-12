# Hauptacryl v7 reproduzieren

12.11.2026. Dieses additive Verfahren wurde aus dem geprüften v9-Nachtragsweg übernommen und auf **eine Akte mit sechs neuen Blättern** begrenzt. Es erstellt eine Reviewunterlage für den **Kopienpilot**, keine Nutzerzustimmung und keine Livefreigabe. Kein Import-/Shopify-/Binding-/Katalogschreibweg ist enthalten.

## Fertiges Ergebnis

`outputs/Produktplaene-230-main-v7/Tuerschild-Acrylglas-3mm_v7.xlsx`

SHA256 `65d706e1a99cc599ba7a1c577de028208a5efd356f97bd997f68be3f899cde29`.

Echter Operator-Update-reviewHash `8e8814cabbddb0354e0af029e1bdb09f0a668f69af03dd056792a99c6b7d517d`, Importfingerprint `2872b28895453ec8fc3af89a293e7f3d144c56bdf03dbae6b09c5296fcb9e01f`. Herkunft: [Claude-Beobachtung vom12.11.08:22](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6817439434). `approvalHash:null`, `approved:false`, `executed:false` bleiben im Manifest ausdrücklich erhalten. Der bisherige v9-`pgp`-Plan ist Herkunft; dieser `reviewHash` bezeichnet den vorhandenen nativen Updateadapter, keinen neuen ProductGroup-Plan.

Die sechs neuen Blätter heißen HauptzielV7, Preisabgleich158, Groessenlabels30, Erhalten30, BelegeV7 und AblaufV7. Die ursprünglichen zwölf Blätter stehen unverändert dahinter. V6 bezeichnet die Dateiversion der aktuellen v9-Herkunftsakte, keinen veralteten Planlauf.

## Feste Eingaben

| Eingang | SHA256 |
|---|---|
| v9-Akte `Tuerschild-Acrylglas-3mm_v6.xlsx` | `37a704d892b0f24fffdd87c7c5090652e5a949f3091dd8117ff83567e49d1429` |
| `main-update-review.json` | `d980417e45469b4d34f2fbd9abff746cf6cdbe7864e67b2f416fc2561f7ad8d8` |
| `observation.json` | `4577f555e1ee270f225d60ef68ebfceca973246309b675022139dc7ef3d23ec3` |
| Tatsächliche Validatorverdrahtung `uo-beobachtung.mjs` | `f540c4de1a8bc22ce2989da0d978b01a1d3d7cbdc69b897114da533eefa1bd5e` |
| Materialisiertes Ziel `target-document.preview.json.gz` | `2a7b1adf55afbda5728cf062e91208f42c559fa1578b771b0ad4aa5912ffadb1` |
| `variant-mapping.preview.json.gz` | `3d0647b2cb671ba09199b6f9c4b9cdbfa58f24a0eafb1d2d672a18823070c9bf` |
| Unveränderter nativer Adapter `update-review.mjs` | `6f68a00b590b6dedb5af29229fea816e31b4cab2bea5e937a67ed220a9fdd571` |

Vor dem ersten Artifact-Aufruf prüft `inputs.mjs` alle Dateipins, ruft den echten unveränderten `verifyUpdateReview` auf und vergleicht die separate Observation mit dem Review. Zielhashes, v9-Excel-/Planherkunft, tatsächlicher Validatorquellhash und Kategorienbeleg müssen übereinstimmen. Fehlende/null-Hashes oder Dateien werden abgewiesen, es gibt keine synthetischen Ersatzdaten. Der neue Reader führt weder Validatorverdrahtung noch Repository- oder DB-Konstruktoren aus; aus dem Adapter wird ausschließlich die reine Reviewprüfung verwendet.

Die tatsächliche Herkunft/Autorität des GitHub-Operatorberichts muss weiterhin belegt sein; eine syntaktisch richtige URL oder ein selbst erfundenes JSON ersetzt das nicht. Die gelieferten Eingaben wurden vom Root aus dem tatsächlichen Operatorbericht beschafft und unabhängig geprüft.

## Ausführung ausschließlich in einem neuen Ausgabeordner

Zuerst die bereitgestellten Abhängigkeiten über `load_workspace_dependencies` laden und die Tabellen-Anleitung lesen. Nur dessen Node/Python und `@oai/artifact-tool` verwenden, nichts installieren. In dieser Windows-Sitzung wurde die Junction-Anlage verweigert. `artifact-runtime.mjs` löst deshalb den öffentlichen Paketeinstieg aus dem ausdrücklich übergebenen **bereitgestellten** `node_modules`-Verzeichnis auf; keine Paketdatei oder globale Abhängigkeit wird verändert.

Im ausgeführten Lauf: Bundle26.1111.10934, Node24.22.1. PowerShell, aus der Workspacewurzel; `<BUNDLE>` unten durch den von `load_workspace_dependencies` gelieferten Basispfad ersetzen. Der Beispiel-Ausgabeordner muss noch nicht existieren.

```powershell
$node = '<BUNDLE>/dependencies/node/bin/node.exe'
$python = '<BUNDLE>/dependencies/python/python.exe'
$env:GRAVURU_ARTIFACT_NODE_MODULES = '<BUNDLE>/dependencies/node/node_modules'
$repro = 'work/restabschluss/main-v7-excel'
$freshOutput = 'outputs/Produktplaene-230-main-v7-reproduktion-NEU'
$argsV7 = @(
  '--source-xlsx', 'outputs/Produktplaene-230-v9/Excel-Nachtraege/Tuerschild-Acrylglas-3mm_v6.xlsx',
  '--target', 'work/restabschluss/main-target-preserved-metadata/target-document.preview.json.gz',
  '--mapping', 'work/restabschluss/main-target-preview/github-payload/variant-mapping.preview.json.gz',
  '--adapter', 'work/issue230-integration-candidate/ops/issue230-main-update-review-20261111/update-review.mjs',
  '--review', 'work/restabschluss/main-native-observation-20261112/main-update-review.json',
  '--review-sha256', 'd980417e45469b4d34f2fbd9abff746cf6cdbe7864e67b2f416fc2561f7ad8d8',
  '--observation', 'work/restabschluss/main-native-observation-20261112/observation.json',
  '--observation-sha256', '4577f555e1ee270f225d60ef68ebfceca973246309b675022139dc7ef3d23ec3',
  '--validator-source', 'work/restabschluss/main-native-observation-20261112/uo-beobachtung.mjs',
  '--evidence-source', 'https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6817439434',
  '--out', $freshOutput
)
& $node "$repro/build-appendices.mjs" @argsV7 --check-only

# Unmittelbar vor dem ersten echten Erzeugungsschritt einmal den Marker der
# geladenen Tabellen-Anleitung ausführen (edit,1,xlsx), dann:
& $node "$repro/build-appendices.mjs" @argsV7
& $python "$repro/graft-appendices.py" --source-xlsx $argsV7[1] --build-dir $freshOutput
& $python "$repro/verify-preservation.py" --source-xlsx $argsV7[1] --build-dir $freshOutput --mapping $argsV7[5]
& $node "$repro/verify-appendices.mjs" --build-dir $freshOutput
```

Die Pfade sind explizite Dateieingaben und können bei einem isolierten Nachbau versetzt werden; die erwarteten Inhalte/Hashes bleiben fest. Das Zieldokument ist die bereits vorhandene reine Preview, gegebenenfalls über deren veröffentlichten Materializer wiederherzustellen. Kein neuer Zielplan und kein neuer nativer Review wird vom Excelbuilder erzeugt.

`build-appendices.mjs` erzeugt ausschließlich die sechs neuen Blätter als separates Zwischen-XLSX und einen Index. `graft-appendices.py` übernimmt das vorhandene v9-Verfahren: neue Formatdefinitionen werden einmal angehängt, neue Zell-/Spalten-/Zeilenformatverweise versetzt, neue SharedStrings als InlineStrings übernommen. Es fügt sechs neue Worksheet-Parts mit eindeutigen Sheet-/Relationship-IDs vorne ein; alte lokale Blattindizes werden um6 verschoben. Bestehende Blatt-/Tabellen-/Relationsbytes bleiben identisch. Nur vier bestehende Paketverzeichnisse/-definitionen werden ergänzt: workbook, workbook.rels, styles und Content_Types. Keine neuen Zeichnungen, Tabellenbeziehungen oder Differentialformatierungen sind erlaubt.

Erzeugung des neuen Ordners und aller JSON/PNG erfolgt exklusiv. Finales ZIP wird mit `x` geöffnet. Ein bestehendes Ergebnis wird abgewiesen. Bei einem gestoppten/fehlgeschlagenen Versuch einen neuen isolierten Ordner verwenden, keine versiegelten Dateien überschreiben. Neue ZIP-Zeitstempel können bei einer Reproduktion einen anderen gesamten XLSX-SHA ergeben; den finalen Hash dann neu belegen.

## Tatsächliche Prüfungen und Grenze

- Ein enger ZIP/XML-Fall prüft sechs Blätter in richtiger Reihenfolge, alte Teile und Formatdefinitionen, SharedString-Umsetzung, Zell-/Spalten-/Zeilenformatverweise, Formeln, `localSheetId+6` und exklusives Schreiben. Er verwendet eine temporäre ZIP ohne Freigabe-/Reviewdaten, keine vorgetäuschte Produktakte. Quell-v6 blieb SHA-identisch.
- Der echte Eingabecheck besteht gegen die oben gepinnten Operatordateien.
- Die fertige Akte: **12 alte Blätter,14.499 belegte alte Zellen/Formeln,26 vorhandene Paketparts unverändert**,6 neue Blätter,1.711 neue Tabellenzellen abgeglichen. Alle158 Preisdifferenzen,30 Beschriftungen und30 unverändert erhaltenen Restvarianten passen zur gepinnten Originalmatrix.
- Artifact-Reimport prüfte sämtliche neuen Werte/Formeln und renderte alle sechs Blätter. Die sechs finalen Bilder wurden visuell gelesen. IDs tragen den sichtbaren Präfix `ID `, weil Artifact reine Ziffernstrings trotz Textformat wissenschaftlich anzeigte. Die vollständigen ursprünglichen GIDs bleiben in der unveränderten maschinellen Mappinganlage; Werte und IDs wurden nicht geändert.
- Der Artifact-Autor- und Reimportprozess endeten **nach** vollständiger Ergebnisschreibung mit Exit1 ohne zusätzliche Fehlermeldung. Deshalb wird ihr Prozesscode nicht als grüner Lauf ausgegeben. Unabhängiger Standardbibliothek-ZIP-/OOXML-Check war Exit0, der vollständige separate Artifact-Reimport/Assertions/Render lieferte die gespeicherten Belege. Kein Microsoft-Excel-Desktoptest behauptet.

Preisquelle und Vergleichsstände sind historische, gepinnte Leseergebnisse. Diese Akte führt keine Aktualisierung aus. `AblaufV7` zeigt den vorgesehenen späteren Gesamtumfang; Shopify158/Labels30, Bindungen778 und Katalogfreigabe sind ausdrücklich getrennte Schritte außerhalb des nativen Updateadapters. Die Kopienpilot-Unterlage genehmigt diese Schritte nicht. Frühere Zustimmungen zu Preisen/Starts/Steuer/Staffeln bleiben Herkunft und werden nicht nochmals angefordert.

## Herkunft der wiederverwendeten Verfahren

`work/restabschluss/excel/` bzw. veröffentlichte v9-Reproduktion:

- build-appendices.mjs SHA `0367259027ea718e16ea871c033103a0ffd0c158b6b5e55f9086b37907ba8ed8`
- graft-appendices.py SHA `3950d8c16862ac477be229ba9af9a48c3ebce479ccbfa6f3c39f710ed3fbf12b`
- verify-appendices.mjs SHA `df10f37cec797eb991d0dc5626c36ec962531e16aa31833f846f68e9ce032f88`
- verify-preservation.py SHA `69af7ef1a63db974d130422623796bf540e71db0c48d2d20f83bc0204acbd337`

Dieses neue Unterpaket verändert weder diese vier Quellen noch ursprüngliche/v9-Excelakten, Appcode oder Produktpläne. Unversiegelte frühe Darstellungsversuche bleiben ausschließlich im lokalen Scratch und gehören nicht ins abzugebende Paket.
