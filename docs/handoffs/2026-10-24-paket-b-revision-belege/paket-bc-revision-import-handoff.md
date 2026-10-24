# PR12 – Integration von B und gemergtem C

Importteil lokal zusammengeführt, CodeFreeze. Eingänge: B f4439c2163644091bd781b9e7b76f3d2641884fe; C/main ed4b9c6eca8045ac0f650817fb242ace3f13b7e8. Die fünf Dateien und Eingangsblobs stehen in paket-bc-revision-inputs.json; finale SHA256-/Git-Blobwerte in paket-bc-revision-import-files.json. Alle fünf Dateien enthalten ausschließlich LF. Keine Status-, UI-, GitHub- oder Liveänderungen durch diesen Agenten.

## Konfliktentscheidungen

- katalog-convert.mjs: B-Quellgrößenauflösung für Retro, proportionaler Contain-Fit, echte Kontur-/Lochprüfung sowie offene Preis-/Startdesign-/Vorlagensperren bleiben erhalten. Aus C wird ausschließlich die begrenzt speichernde SVG-Tokenisierung in scaleArcAware übernommen; Winkel, Flags, Rundung und Ausgabe bleiben kompatibel.
- katalog-import.mjs: C-Streaminggerüst mit retainItems=true als unverändertem Standard, reporter/onProgress, sofortigen Dokumentprüfsummen und reportOnly-Schreibsperre übernommen. B-Konturgate bleibt entfernt; Konturen erhalten contain:true. C skaliert Motivpfade erst nach bestandener Fit-Prüfung. Berichtsfehler brechen den Lauf ab.
- scripts/katalog-import.mjs: vollständig C übernommen. Dry-run hält keine Produktdokumente; JSON wird während des Laufs geschrieben, Metriken werden erfasst. Commit-Verhalten bleibt explizit an --commit gebunden; hier wird kein Commit ausgeführt.
- Tests: B-Fit-/Quell-/Preis-/Startdesignfälle und C-Tokenblock-/Streaming-/Rückstau-/Fehlerfälle vereinigt. Zusätzliche Prüfung innerhalb des bestehenden Konturfalls: akzeptierter echter Konturplan und Streamingbericht sind identisch, Token stimmt, reportOnly kann nicht geschrieben werden, feste Lochkoordinaten bleiben erhalten.

## Gezielte Prüfung

node --test app/workshop/katalog-convert.test.mjs app/workshop/katalog-import.test.mjs

23/23 erfolgreich, 10,8092215 s; Originalausgabe paket-bc-revision-import-tests.log. TEMP/TMP=work/test-tmp; GRAVURU_PYTHON=work/pyenv/Scripts/python.exe; PYTHONUTF8=1.

## Vollständiger kombinierter Import-Probelauf

Nach RAM-Abstimmung mit Root ausgeführt:

```text
node --max-old-space-size=2048 scripts/katalog-import.mjs --katalog ..\gravuru-katalog --linie edelstahl-tuerschilder --alle-designs --dry-run --json ..\reports\paket-bc-revision-dry-run.json --metrics ..\reports\paket-bc-revision-metrics.json
```

Exit 0; 185,0801958 s äußere Stoppuhr, 184,116225 s CLI-Laufzeit. Node v24.20.0; Old-Space-Grenze 2048 MiB (gemeldete gesamte V8-Heapgrenze 2240 MiB). Beobachteter Peak: HeapUsed 561,069 MiB, HeapTotal 736,590 MiB, RSS 971,141 MiB. Prozess-MaxRSS laut resourceUsage 982,160 MiB. 3299 Messpunkte, 25 ms plus Dokument-/Prüfsummen-/Produktgrenzen; Stichproben sind kein exakter kontinuierlicher Heap-Höchstwert.

744 Produkte: 597 neu, 0 aktualisiert, 0 unverändert, 147 gesperrt. 7920 Vorlagen, 80 Größen, 16 offene Größenpreise; Fit 8169 passt / 415 prüfen / 788 passt nicht. 737 Designmaster, 735 berücksichtigt/mit Serie, 0 Konvertierungsfehler und 0 fehlende Schriften in Produkten, Sets oder Vorlagen.

Alle Sperren unverändert: 130 wegen offenem Preis, 10 wegen fehlendem Startdesign (8 Altbestand sowie TR1-V2A-9x6-D15 und TR2-V2A-9x6-D12), 7 ohne passende Konturvorlage. Keine Preise, Maße oder Quellgestaltungen ergänzt.

Vollständiger semantischer Vergleich gegen paket-b-import-final.json: gleich, 0 Unterschiede. Zufällige Schriftprofil-UUIDs werden nach vorheriger bijektiver Set-/Profilprüfung normalisiert. Die vom vorhandenen Vergleichswerkzeug ausgeblendeten Katalogpfade wurden zusätzlich separat auf exakte Gleichheit geprüft. Alle Produktzeilen sind ohne Normalisierung exakt identisch.

Bericht-SHA256: `39dfdba983d465a11e276653a61d4521b7999996bba221607fadeb103c947b63`. B-Vergleichsbericht-SHA256: `44c95cac0de0016f701062a74d6bf7130ca5fe080a5d2f1e69c6a8ddceb8858d`. Originalausgabe, Messwerte, Vergleich und zusammengefasste Prüfsummen liegen unter paket-bc-revision-dry-run.log, paket-bc-revision-metrics.json, paket-bc-revision-comparison.json und paket-bc-revision-summary.json.

## Grenzen und Übergabe

Nur lokaler Dry-run gegen :memory:, kein --commit, kein Livezugriff und keine Paketinstallation. Die fünf Quelldateien nach Test und Lauf unverändert gegen das Manifest geprüft. Breite Regressionstests/Build liegen bei Root; hier nur 23 gezielte Tests und der vollständige kombinierte Importlauf. Die zuvor offene echte Browser-Sichtabnahme bleibt außerhalb dieses Nachweises. Der erfolgreiche Probelauf ist keine Import- oder Veröffentlichungsfreigabe.
