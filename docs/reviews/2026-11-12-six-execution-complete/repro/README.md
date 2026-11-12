# Reproduktion der sechs Abschlussakten

Diese Skripte wurden für reine Dateiableitung verwendet. Sie enthalten keinen Import-/Shopify-/Serveraufruf. Nur in einer isolierten Arbeitskopie ausführen; versiegelte Quellen und Ergebnisse nicht überschreiben. Build, JSON-Outputs, Graft-XLSX und Renderbilder nutzen exklusive Dateianlage.

Benötigt werden Node mit der geladenen Spreadsheet-ArtifactRuntime, Python3 Standardbibliothek und die in belege/Manifest.json bzw. final-six-inputs.json gepinnten Original-/Vorgängerdateien. Die bisherigen Dateien bleiben unter ihren aufgeführten Workspacepfaden erhalten. Der komplette historische Katalog ist bewusst nicht Teil dieses Pakets; sein Pfad/SHA steht in Review.json. Er war nur für den Nachweis neuer Shop-IDs relevant.

Die Skripte aus diesem Ordner werden in der isolierten Workspacekopie nach work/restabschluss/final-execution-excel kopiert; final-six-inputs.json und input-verification.json aus belege kommen daneben. Die beiden existing-*.py werden unter ihren Originalnamen nach work/restabschluss/six-plan-excel kopiert. Die gelieferten Quelldateien aus belege werden unter ihren ursprünglichen, im Quellenmanifest aufgeführten Pfaden abgelegt. Ohne identische Quellen beendet der Builder sich mit Fehler.

Nach dem üblichen load_workspace_dependencies und Spreadsheet-Authoring-Marker für sechs XLSX:

    node work/restabschluss/final-execution-excel/build-appendices.mjs WORKSPACE NEUER_AUSGABEORDNER
    python work/restabschluss/final-execution-excel/graft-and-verify.py --workspace WORKSPACE --build-dir NEUER_AUSGABEORDNER
    node work/restabschluss/final-execution-excel/verify-appendices.mjs NEUER_AUSGABEORDNER

prepare-inputs.mjs dokumentiert den vorgelagerten tatsächlichen Join: native Sollzeilen + 2a-Planpins + 2b-Ergebnis + vollständige Connectorvarianten. Er benötigt zusätzlich workbook-assignment.json neben dem Skript und das historische Inventar an seinem ursprünglichen Pfad. Er erzeugt final-six-inputs.json und input-verification.json exklusiv und darf nicht über die bereits gelieferten Dateien schreiben. Für den normalen Nachbau werden die geprüften und gepinnten beiden Dateien direkt verwendet.

Verwendete Laufzeit: gebündeltes Node v24.22.1 sowie Python unter CodexPrimaryRuntime v26-1111-574-0. artifact-runtime.mjs nutzt den öffentlichen Paketresolver; der vorhandene lokale Fallbackpfad ist ausdrücklich maschinenspezifisch und ersetzt keine Installation. Tatsächliche Prozessausgänge: build0, graft0, Reimport3221226505 nach allen vollständig geschriebenen Inhalts-/Renderbelegen. Details und Logs sind unter belege/ enthalten. Die manuelle Sichtprüfung ist ein eigener Nachweis und nicht durch einen erneuten automatischen Lauf ersetzbar.
