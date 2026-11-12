# Sechs echte Kopienplan-Nachträge vorbereiten

12.11.2026. Dieses Verfahren ergänzt die sechs bestehenden v9-Akten um jeweils ein führendes Blatt `Kopienplan`. Es plant keine Produkte, öffnet keine Datenbank und enthält keinen Bestätigungs-, Import-, Shopify- oder Ausführungsaufruf. Es schreibt ausschließlich neue Dateien in ein neues lokales Ausgabeverzeichnis. **Echte ausgeführte Plandaten müssen zuerst vorliegen.** Fehlende Dateien, fehlende Pins oder Abweichungen stoppen vor der XLSX-Erzeugung.

Der native Kopienlauf ist [#1686819186960](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6819186960). Der tatsächliche Eingang stammt aus [#1686819660449](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6819660449), Commit `75a304ebfa86ce3a5302c5940107a6e010be8322`. Wichtige Provenienz: Große Records wurden lokal aus v9 mit den tatsächlich gelesenen Kopienkennungen rekonstruiert und gegen 44 kanonische Serverwerte sowie sechs Planhashes/-längen geprüft. Gzip-/Einrückungsbytes sind keine Server-Bytekopien. Der unabhängige Empfangsreview bestätigt diesen Abgleich; keine neue Exportrunde oder Planung ist erforderlich.

| Produkt | Bisherige Akte aus dem v9-Paket | Neue Kopienreview-Akte | Kombinationen |
|---|---|---|---:|
| Acryl 5 × 2 | `Tuerschild-Acrylglas-3mm-5x2_v4.xlsx` | `Tuerschild-Acrylglas-3mm-5x2_v5.xlsx` | 10 |
| Acryl 6 × 2 | `Tuerschild-Acrylglas-3mm-6x2_v4.xlsx` | `Tuerschild-Acrylglas-3mm-6x2_v5.xlsx` | 10 |
| Acryl 8 × 2 | `Tuerschild-Acrylglas-3mm-8x2_v4.xlsx` | `Tuerschild-Acrylglas-3mm-8x2_v5.xlsx` | 10 |
| Edelstahl 5 × 2 | `Tuerschild-Edelstahl-5x2_v3.xlsx` | `Tuerschild-Edelstahl-5x2_v4.xlsx` | 5 |
| Edelstahl 6 × 2 | `Tuerschild-Edelstahl-6x2_v3.xlsx` | `Tuerschild-Edelstahl-6x2_v4.xlsx` | 5 |
| Edelstahl 8 × 2 | `Tuerschild-Edelstahl-8x2_v3.xlsx` | `Tuerschild-Edelstahl-8x2_v4.xlsx` | 5 |

Die eingefrorene Hauptproduktakte v7 wird nicht gelesen oder verändert. `v9-reference.json` wurde ausschließlich aus dem bestehenden v9-Manifest, dessen sechs Plänen/Quelldokumenten und den tatsächlichen Original-XLSX erzeugt. Sie enthält lokale Herkunftspins, keine angeblichen Serverrecords. Ihr SHA steht im Vorbereitungsmanifest.

Der ursprüngliche reine Vorbereitungsstand ist als `manifest.preparation-v1.json` erhalten; `preparation-checks.json` gehört zu diesem historischen Zeitpunkt ohne Kopienrecords. Das aktuelle `manifest.json` Version 2 bindet die nach tatsächlichem Eingang angepasste Implementierung. Die sechs tatsächlichen Ergebnisse und die ehrlichen Prozessausgänge stehen unter `outputs/Produktplaene-230-sechs-Kopienreview`, insbesondere `Inhaltspruefung.json`, `Sichtpruefung.json`, `Visuelle-Pruefung.json` und `Laufnachweis.json`. Diese Dateien nicht erneut überschreiben.

## Tatsächliche Eingaben

Das empfangene Verzeichnis enthält `PINS.json`, `kompakt-serverwerte.json`, `module-profile.get-record.json` und `motif-profile.get-record.json`. Die letzten beiden bilden die nativen Get-Verträge ab und tragen zusätzliche Herkunftsfelder. `TESTBELEG-sechsgruppen.json` ist nicht mitgeliefert; sein Hash ist dokumentiert, die Datei wird weder erfunden noch als lokal vorhanden behandelt. Die sechs Unterordner heißen exakt wie die stabilen `product.key` aus v9:

```
Tuerschild-Acrylglas-3mm-5x2_v2
Tuerschild-Acrylglas-3mm-6x2_v2
Tuerschild-Acrylglas-3mm-8x2_v2
Tuerschild-Edelstahl-5x2_v1
Tuerschild-Edelstahl-6x2_v1
Tuerschild-Edelstahl-8x2_v1
```

Je Ordner sind erforderlich: `plan.json.gz` in `groups.getPlan`-Form, `template.json` in `groups.get`-Form, `source-document.json.gz` und `source-metadata.json`. Letzteres hat den tatsächlichen Exportwrapper `revisionMetadata`; ausschließlich dessen Inhalt wird als native Metadaten gehasht. Die Metadaten enthalten `profiles` und `productionProfile:null`, keine v9-`businessDecisions`. Die bestehenden Entscheidungen bleiben auf den unverändert übernommenen alten Excelblättern und im Herkunftspaket belegt. Dateien werden nicht als wörtliche Serverexports ausgegeben.

`index-received.mjs` erzeugt außerhalb des unveränderten Empfangsordners einen kleinen Eingabeindex mit tatsächlichen Datei-SHAs. Er braucht den vollen Commit, dessen konkrete Issue-URL und den tatsächlich belegten Store der Kopie. PINS und kompakte Serverwerte belegen `confirm:0`/`execute:0`; der Plan selbst `shopifyWrites:0`. Die ausgewiesenen Nullen beziehen sich auf diesen Kopienplan-Vorgang; sie sind keine neue globale DB-Inventur. Keine Aussage über nicht mitgelieferte Journalzeilen wird hinzuerfunden.

Der Builder vergleicht Plan-IDs/-Hashes und Quell-/Vorlagenrevisionen mit dem bestehenden Operatorbeleg. Er berechnet den nativen planHash selbst aus allen Planfeldern außer `id`, `createdAt`, `planHash`. Vorlagen-/Quell-/kompilierte Dokumenthashes und Modulprofilpins werden separat nachgerechnet. Dies ersetzt weder Claudes nativen Validator noch den unabhängigen Review seines Treibers; es bindet die Akte an deren tatsächliche Ergebnisse.

Erhalten bleiben alle 45 Options-/Preis-/Maßzeilen, `product.key`, Importkey, `creationKey='issue230-'+ORIGINALworkbookSha`, die 27 Designs je Gruppe, Startgröße/-design und die bestätigten 13 Motive in Reihenfolge. Vollständige Quell- und kompilierte Dokumente werden gegen v9 verglichen, lediglich die belegte neue Motivprofil-ID und Modulprofil-ID werden dabei ausgeblendet. Revisionen oder andere Dokumentwerte werden nicht still normalisiert. Tatsächliche Ressourcenauflösung und Metadaten werden zusätzlich vollständig gepinnt, Serverdefaults nicht als gleich behauptet.

Hashverfahren bleiben getrennt: nativer Produktgruppenhash = rekursive Objektschlüsselsortierung, danach `JSON.stringify`; Dateihash = unveränderte Dateibytes (bei `.gz` komprimierte Bytes); Motivprofil-Dokumenthash = native `profileData`-Feldreihenfolge `name,type,items`, danach `JSON.stringify`. Kein ID-Binding-Hash wird als Produktgruppenhash ausgegeben.

## Ausführung nach vollständigem Eingang

Die gebündelten Pfade vorher über `load_workspace_dependencies` feststellen, keine Abhängigkeit installieren. Die vorhandene `artifact-runtime.mjs` verwendet nur den öffentlichen Resolver des gebündelten Pakets. In PowerShell, aus der Workspacewurzel:

```powershell
$task = 'work/restabschluss/six-plan-excel'
$bundle = 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1111-574-0_26.1111.574.0_x64__3k8sg7r9htsxt/dependencies'
$nodeExe = "$bundle/node/bin/node.exe"
$pythonExe = "$bundle/python/python.exe"
$env:GRAVURU_ARTIFACT_NODE_MODULES = "$bundle/node/node_modules"
# $received, $operatorSource, $operatorCommit, $actualCopyStore vorher auf echte Eingaben setzen.
$inputFile = Join-Path $task 'excel-input-index.json'
& $nodeExe "$task/index-received.mjs" --workspace . --records-dir $received --out-index $inputFile --evidence-source $operatorSource --source-commit $operatorCommit --store-id $actualCopyStore
$inputSha = (Get-FileHash -LiteralPath $inputFile -Algorithm SHA256).Hash.ToLowerInvariant()
$out = 'outputs/Produktplaene-230-sechs-Kopienreview'
& $nodeExe "$task/build-appendices.mjs" --workspace . --input $inputFile --input-sha256 $inputSha --out $out --check-only
# Erst wenn check-only erfolgreich: Autorentätigkeit markieren, dann bauen.
& $nodeExe 'C:/Users/Christopher Koch/.codex/plugins/cache/openai-primary-runtime/spreadsheets/26.1111.10934/skills/spreadsheets/container_tools/mark_artifact_operation_started.mjs' --operation-kind edit --expected-output-count 6 --output-format xlsx
& $nodeExe "$task/build-appendices.mjs" --workspace . --input $inputFile --input-sha256 $inputSha --out $out
& $pythonExe "$task/graft-appendices.py" --workspace . --build-dir $out
& $pythonExe "$task/verify-preservation.py" --workspace . --build-dir $out
& $nodeExe "$task/verify-appendices.mjs" --build-dir $out
```

Nach **jedem** Befehl Ergebnis/Exit prüfen; bei Fehler nicht automatisch fortsetzen. `index-received` schreibt seinen Index exklusiv, der Builder verlangt ein noch nicht existierendes Ausgabeverzeichnis, das Graft verwendet ZIP-Modus `x`. Keine Wiederholung in einem versiegelten Ordner. Nicht den neuen XLSX-SHA zurück in die Planung geben: der Originalpreisakten-SHA bleibt Creation-Key-Bestandteil.

Die bewährte v7/v9-Graftfunktion ist übernommen, nur auf ein Blatt und sechs Datensätze parametrisiert. Alle alten Worksheet-/Table-/Relation- und sonstigen nicht notwendigen Paketparts bleiben bytegleich. Nur Workbook, Workbook-Relations, ContentTypes und append-only Styles werden ergänzt. `verify-preservation.py` vergleicht zusätzlich sämtliche ursprünglichen und vorherigen Zellen/Formeln sowie die 45 neuen Preiszeilen. Der Artifact-Reimport prüft die tatsächlichen neuen Zellwerte und rendert pro Akte drei Ausschnitte. `Sichtpruefung.json` bleibt automatisch `visuallyReviewed:false`; erst nach wirklichem Lesen aller Bilder eine getrennte manuelle Sichtnotiz anlegen. Etwaige Runtime-Abbaufehler getrennt nennen, nicht als erfolgreichen Prozessausgang ausgeben.

## Fachlicher Umfang und Grenze

Neubaurichtung: [#2306768508409](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6768508409), später [#1686804936405](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6804936405). Keine erneute Altprodukt-Zielwahl. Brutto 19 %: [#2306804508025](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6804508025). Staffel und unveränderte Starts/Uploads sind bereits in den erhaltenen v9-Akten und deren Entscheidungsmanifest belegt. Keine Einzelpreisänderung, neue Freigabe oder zusätzliche Geschäftsregel aus dieser Dokumentarbeit.

Kopien-IDs gelten nur auf der Kopie. Diese Akten sind **keine produktiven Station-3-Freigaben** und kein Importpayload. `approvalHash:null`, `approved:false`, `executed:false` bleiben ausdrücklich ausgewiesen. Die späteren tatsächlich in der Zielregistry gespeicherten Pläne müssen zusammen mit den passenden Akten ausführungsgebunden abgenommen werden. Die 16 ACTIVE Altprodukte, Sammelprodukte und das gesonderte Hauptupdate bleiben außerhalb dieses Vorgangs.
