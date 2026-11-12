# Reproduktion des Hauptakten-Abschlusses

Nur in einer isolierten Workspacekopie ausführen. Die bereits geprüfte v8, die v7 und alle Originalakten bleiben unverändert. Die Skripte erstellen ausschließlich lokale Dateinachträge; kein Import-/Shopify-/Serverweg ist enthalten.

Benötigt werden das geladene Spreadsheet-ArtifactRuntime-Bundle, dessen Node, Python 3 und die in final-main-inputs.json gepinnten Quellen an ihren dokumentierten Workspacepfaden. Die tatsächlichen Main-Lesebelege liegen im getrennten Git-Paket docs/reviews/2026-11-12-main-execution-complete. Beim isolierten Nachbau unter work/restabschluss/main-final-connector-readback-20261112 ablegen. Original-/Vorgängerakte und Mapping bleiben unter ihren in preparation.json aufgeführten Pfaden.

Die Dateien aus diesem repro-Ordner kommen nach work/restabschluss/main-v8-excel. Die zwei existing-*.py kommen unter ihren Originalnamen nach work/restabschluss/six-plan-excel. Sie enthalten das bereits verwendete combine()/readbook()-Verfahren. preparation.json ist die unveränderte historische Vorbereitung; final-main-inputs.json und input-verification.json binden jetzt die tatsächlich empfangenen Ergebnisse.

Nach load_workspace_dependencies und dem Spreadsheet-Authoring-Marker (edit, 1, xlsx):

    node work/restabschluss/main-v8-excel/build-appendices.mjs WORKSPACE NEUER_AUSGABEORDNER
    python work/restabschluss/main-v8-excel/graft-and-verify.py --workspace WORKSPACE --build-dir NEUER_AUSGABEORDNER
    node work/restabschluss/main-v8-excel/verify-appendices.mjs NEUER_AUSGABEORDNER

Der Ausgabeordner darf noch nicht existieren. Enddatei und Belegdateien werden exklusiv geschrieben. prepare-inputs.mjs dokumentiert den vollständigen Join von tatsächlichem Operatorbericht, 808er-Lesebestand und gepinnter Sollmatrix. Es erzeugt die Eingangsdateien ebenfalls exklusiv und darf nicht auf bereits vorhandene Belege schreiben. Für den normalen Nachbau sind die geprüften final-main-inputs.json und input-verification.json enthalten.

Die Graft-Prüfung vergleicht sämtliche alten Zellen/Formeln und Paketparts sowie jede neue Zelle. Artifact reimportiert alle neuen Zellwerte und rendert sieben ausgewählte Bereiche. Die anschließende Sichtprüfung ist ein eigener Nachweis. Neue ZIP-Zeitstempel können einen anderen Gesamtdateihash ergeben; die reproduzierte Ausgabe benötigt dann ihren eigenen dokumentierten SHA.

Tatsächlicher Lauf: gebündeltes Node v24.22.1, Bundle 26.1111.10934. Der Runtime-Resolver verwendet das bereitgestellte Paket; sein Fallbackpfad ist maschinenspezifisch, keine Abhängigkeit wurde installiert. Build/Graft Exit 0; Reimport Exit 3221226505 nach vollständigem Inhaltsbericht und sieben gespeicherten Bildern. Belege und Logs sind unverändert enthalten.
