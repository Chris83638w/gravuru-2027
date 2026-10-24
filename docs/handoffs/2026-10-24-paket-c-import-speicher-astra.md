# Paket C – speicherschonender Katalog-Dry-run · 24.10.2026

Status: implementiert und geprüft; einmaliges unabhängiges Review ohne priorisierte Fehlerbefunde abgeschlossen. Branch für den Operator: `dev/import-speicher-20261024-astra`. PR: https://github.com/Chris83638w/gravuru-2027/pull/13; kein Merge durch den Programmierer. Direkte Nutzerfreigabe: A ist gemerged, B starten, C darf parallel.

## Basis und Umfang

- Code: main `603fa4415121d305cff31755ffab2c6af653919a`; Katalog: main `9bd4d146bc0a308bc63b079e582f2a82712b6082`. Die fünf geänderten Quelldateien wurden zusätzlich vom gepinnten Code-Commit geladen und mit ihren Git-Blob-SHA1 geprüft.
- Separate lokale Arbeitskopie `work/gravuru-2027-c`. `work/gravuru-2027` (B) und `work/gravuru-katalog` bleiben unverändert durch dieses Paket.
- Dateien: `scripts/katalog-import.mjs`, `app/workshop/katalog-import.mjs`, `app/workshop/katalog-convert.mjs`, deren zwei gezielte Tests, dieser Bericht und STATUS.
- Keine Änderungen an Preisen, Größen, Produktkennungen, Katalogquellen, Freigaben oder Import-Sperren. Keine Livezugriffe, kein CLI-Import-Commit, keine Änderungen in `.local-data/`, `deliverables/` oder `legacy-reference/`. Der CLI-Build erzeugt nur seine vorhandene lokale `.preview/`-Ausgabe.

## Verhalten

Der CLI-Dry-run setzt jetzt `retainItems:false`: Er baut und validiert jedes vollständige Produktdokument mit denselben Konvertern, vergleicht es mit dem Bestand, berechnet sofort dessen Prüfsumme und gibt es danach frei. Nur die kleinen Prüfsummen bleiben für den kompatiblen Plan-Token erhalten. Der normale API-Plan behält standardmäßig seine Dokumente; `--commit` nutzt weiterhin diesen bisherigen Vertrag. Ein Berichtplan wird von `applyKatalogImport` vor der ersten Familienänderung abgewiesen. Ein echter Commit-Lauf wurde nicht ausgeführt und seine Speichergrenze ist nicht belegt.

Master-SVG/konvertierte Vorlagen werden je Design innerhalb derselben Familie/Themenauslegung wiederverwendet. Skalierte Motivpfade entstehen erst nach der Einpassprüfung für das gerade behandelte Produkt; ausgeschlossene Vorlagen erzeugen keine unnötigen Pfadkopien. Die Pfadskalierung arbeitet mit begrenzten Tokenblöcken statt zwei großen Tokenarrays. Bogenwinkel, Flags, Rundung und resultierende SVG-Zeichenfolgen bleiben exakt gleich.

`createKatalogReportWriter` schreibt gültiges JSON produktweise während der Planung und wartet jeden Schreibvorgang ab. Schreibfehler brechen den Lauf ab und werden nicht als fachliche Produktsperre verschluckt. Die CLI schreibt zunächst eine eindeutige `.partial-<pid>`-Datei; erst nach vollständig erfolgreicher Planung wird sie zum angeforderten Berichtsdateinamen umbenannt. Kompakte Berichtseinträge bleiben für die bisherige Textausgabe verfügbar; die großen Produktdokumente werden nicht gesammelt. Die JSON-Struktur bleibt semantisch gleich, Schlüsselreihenfolge/Einrückung ändern sich.

## Prüfung und Messung

`node --test app/workshop/katalog-import.test.mjs app/workshop/katalog-convert.test.mjs`: **22/22 bestanden**, einschließlich bestehender Revision-/Idempotenz-/Freigabe-/Konturtests und neuer Streaming-, Fehlerweitergabe-, Token- und SVG-Blockgrenzentests.

Vollständiger realer Edelstahl-Probelauf, Node v24.20.0:

`node --max-old-space-size=2048 scripts/katalog-import.mjs --katalog ../gravuru-katalog --linie edelstahl-tuerschilder --alle-designs --dry-run --json ../reports/paket-c-import.json --metrics ../reports/paket-c-metrics.json`

Umgebung wie A: `GRAVURU_PYTHON` auf `work/pyenv/Scripts/python.exe`; TEMP und TMP auf `work/test-tmp`. Keine zusätzlich installierten Pakete.

- Exit **0**; gemessene CLI-Laufzeit **163,2066987 s**, einschließlich Katalogöffnung, Build, Seed, Schriftimport, Planung, Bericht und Workshop-Schließen (ab CLI-Initialisierung, ohne statische Modulimporte).
- `process.memoryUsage()`: beobachteter Peak **694.036.472 Bytes = 661,9 MiB heapUsed**; **952.680.448 Bytes = 908,5 MiB RSS**; heapTotal 765.833.216 Bytes. **3.147 Messpunkte**, 25-ms-Timer plus Grenzen nach Dokument, Fingerprint und Produkt; kurze Spitzen zwischen Messpunkten können ungemessen bleiben.
- OS-Spitzenwert `process.resourceUsage().maxRSS`: **958.976.000 Bytes = 914,6 MiB**. `--max-old-space-size=2048` begrenzt V8 Old Space; das gemeldete gesamte V8-Limit enthält weitere Heap-Bereiche (2.348.810.240 Bytes). Tatsächlich beobachteter Heap liegt deutlich unter 2 GiB.
- **744 Produkte: 584 neu, 0 aktualisiert, 0 unverändert, 160 gesperrt; 7.660 Vorlagen.** Fit: 8.063 passt / 18 prüfen / 552 passt nicht; 80 Größen; 16 offene Preise.
- Gesperrt unverändert: **120 Kontur offen**, **32 Rundpreis offen**, **8 bestehende Startdesign-Zuordnungen**. 737 Master, 735 zum Material passend, 673 mit Reihe, 62 ohne Reihe, 0 fehlgeschlagene Konvertierungen, keine fehlenden Schriften.
- Vollständiger rekursiver JSON-Vergleich gegen `paket-a-import-final.json`: **0 semantische Unterschiede**. Nur `line.file`, `families[*].file` und die neu erzeugten zufälligen `fontProfileId` werden normalisiert; für letztere wird vorher die bijektive Zuordnung Schrift-Set ↔ Profil geprüft. Keine Preise, IDs der Produkte/Designs, Zähler, Sperrgründe, Listenreihenfolgen oder Fehler werden ausgeblendet. Zeitfelder sind in diesen Berichten nicht enthalten.
- Original-/C-Pfadskalierung: **2.163 Design/Skalierungs-Kombinationen**, **584 Master mit 633 Motivschichten**, jeweils jede verschiedene zugeordnete Breitenskalierung; komplette Motivobjekte einschließlich SVG-Zeichenfolgen bytegenau identisch.

Lokale Belege unter `work/reports/paket-c*`: `tests.log`, `import.log`, `import.json`, `metrics.json`, `comparison.json`, `svg-parity.json`; reproduzierbare Prüfskripte `compare.mjs` und `svg-parity.mjs`, Referenzquellen `paket-c-base/`. Die ausgewählten Belege liegen versioniert unter [2026-10-24-paket-c-belege](2026-10-24-paket-c-belege/); der Originalbericht ist verlustfrei als Gzip gespeichert.

## Parallelpaket B / nächster Schritt

B und C ändern dieselben Import-/Konvertierungsdateien in getrennten Kopien. C belässt beide `Kontur offen`-Sperren und die bisherigen Konturtests. Bei Zusammenführung durch Claude die B-Geometrie und B-Sperraufhebung erhalten; C-Berichtmodus, sofortige Dokument-Prüfsummen, Streaming und SVG-Skalierung ebenfalls übernehmen. Die Zähler 744/584/160 sind ausschließlich die A-Basis dieses C-Nachweises; nach Integration von B müssen die dann berechtigt geänderten Konturergebnisse gesondert geprüft werden. STATUS-Absätze beider Pakete erhalten.

Nächster Schritt: Claude prüft und merged PR #13. Das einmalige unabhängige Review ist ohne priorisierte Fehlerbefunde abgeschlossen. Kein Host-/Shopify-Schritt und kein Import-Commit in Paket C.

Messgrenze: Erfasst ist der Node-Prozess, nicht die Summe seiner Python-Unterprozesse. Der kombinierte Stand B+C und ein Import-Commit sind nicht gemessen. Der separate C-PR hält die A-Kontursperre; bei Integration muss Claude die in B geprüfte Sperraufhebung erhalten.
