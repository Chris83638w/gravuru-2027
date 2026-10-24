# Paket B – Prüfbelege

Der Hauptbericht liegt eine Ebene höher. Rohlogs sind unverändert; Agentenläufe ohne gespeichertes Rohlog werden in den jeweiligen Handoffs als tatsächlich ausgeführte Kommandos/Zähler dokumentiert.

- paket-b-final-source-manifest.json: 42 Dateien zum Zeitpunkt des unabhängigen Reviews.
- paket-b-source-manifest-final.json: finaler Stand nach zwei gezielten Reviewkorrekturen, 45 Dateien.
- *.mjs.txt: unveränderte historische Prüfscripte aus dem lokalen work/reports-Kontext; relative Imports beziehen sich darauf. Das Review-Repro bestätigt absichtlich die alten Fehler und ist kein Test des korrigierten Stands. Die dauerhaften Regressionen sind in den versionierten app/**.test.mjs-Dateien.
- paket-b-import-final.json.gz: vollständiger JSON-Bericht, unverändert entpackbar.
- produktion/: Originalmesswerte und geprüfte PDF-Ausgaben; große lokale Reviewarchive werden durch deren Prüfsummen und die ausführbaren Produktionstests nachgewiesen.
- browser-abnahme-offen.md: fehlender echter Screenshot und genaue lokale Prüfschritte.
