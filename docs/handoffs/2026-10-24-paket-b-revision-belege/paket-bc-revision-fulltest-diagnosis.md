# Paket B+C – Diagnose des vollständigen Testlaufs

Stand: 2026-10-24T05:58:35.804Z. Code-Freeze laut gesichertem Aggregat: `cd969347e88e3c7af8de43d258099e0a63e77dd6`. Die Suite ist **nicht vollständig grün**. Die PDF-Textursache ist unten eingeordnet.

## Unverändertes Originalergebnis

Alle 175 direkten Dateien aus den beiden geforderten Testverzeichnissen wurden ausgewählt und gestartet. Keine Datei wurde ausgelassen, kein Skip oder Namensfilter eingefügt.

| Bereich | Dateien | Bestanden | Fehlgeschlagen | Unvollständig | Native Tests | Pass | Fail | Skip / Cancel |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| app/configurator/variant-m/ | 40 | 40 | 0 | 0 | 236 | 236 | 0 | 0 / 0 |
| app/workshop/ | 135 | 124 | 10 | 1 | 980 | 957 | 23 | 0 / 0 |
| Gesamt | 175 | 164 | 10 | 1 | 1216 | 1193 | 23 | 0 / 0 |

Die 1216 sind unveränderte Node-Root-Summary-Zähler aus 174 beendeten Prozessen. `konfis.test.mjs` hatte keine Root-Summary: sechs einzelne Ergebnisereignisse (3 pass/3 hookFailed) wurden beobachtet, danach griff der 605-Sekunden-Watchdog. Diese sechs Teilereignisse wurden **nicht** still zu den Originaltotals addiert. Der Runner setzte anschließend automatisch fort.

Original: [Originalzusammenfassung](full-tests-summary.json.gz), SHA-256 der summary.json: `87400ccd37f75e98cd7ab87aace2b86dbe96ccd67752c4de65d81929ac03b6dc`. Die Originalzusammenfassung enthält Befehle, Exitcodes und Fehler; das vollständige TAP-Protokoll ist als full-tests.log.gz gesichert.

## Getrennte Gegenproben und nachvollziehbare Gesamtsicht

Die drei unveränderten Testdateien liefen erst nach dem Vollrun erneut aus dem Repository-CWD. Nur Konfis erhielt `--test-force-exit`; dessen drei Hookfehler bleiben rot. Keine App-/Testquelle wurde dafür verändert.

| Datei | Pass / Tests | Fail | Besonderheit |
|---|---:|---:|---|
| editable-design.test.mjs | 2 / 2 | 0 | Relativer Python-Pfad aus Repo-CWD auflösbar; Runner-CWD-Ursache bestätigt. |
| konfis.test.mjs | 3 / 6 | 3 | Regulärer Abschluss mit force-exit, gleiche Cleanup-Fehler. |
| shopify-runtime-config.test.mjs | 10 / 16 | 6 | Genau der process.cwd()-Fehler entfällt; sechs Windows-/POSIX-Fälle bleiben. |

Gegenprobe separat: [Gegenproben](root-cwd-summary.json), 24 Tests, 15 pass, 9 fail, 0 skip/cancel.

Die zusätzliche Gesamtsicht zählt **genau ein Ergebnis je unveränderter Datei**: Nur die drei betroffenen Dateiergebnisse werden durch ihre Gegenprobe ersetzt; wiederholte Tests werden nicht addiert. Dies ist kein neuer vollständiger Lauf. Ergebnis: **1198 von 1222 Tests bestanden, 24 fehlgeschlagen, 0 skip/cancel; alle 175 Dateien vollständig bilanziert (165 Dateien bestanden, 10 fehlgeschlagen)**. Konfigurator: 236/236; Werkstatt: 962/986. Diese Aggregation wurde unabhängig aus den Original-/Gegenproben-JSONs nachgerechnet und stimmt mit `docs/handoffs/2026-10-24-paket-b-revision-belege/full-tests-aggregate.json` überein.

## Alle nicht grünen Originaldateien

### app/workshop/account-draft-http.test.mjs

Original: 0/1 pass, 1 fail. Kategorie: `existing-test-windows-cleanup`.

after-Hook versucht temporären Ordner zu löschen, bevor der später registrierte w.close-Hook die SQLite-Verbindung schließt.

Quellbeleg: Zeilen 33, 39. Git-Blob-SHA1 `1e38323f9b9ce5145d7d0e1c7bcb3208dde65499`, identisch mit der gepinnten Main-Testquelle. [Gemeinsames Rohprotokoll](full-tests.log.gz).

### app/workshop/batch-assets.test.mjs

Original: 12/13 pass, 1 fail. Kategorie: `existing-test-windows-cleanup`.

Fixture-after-Hook schließt repository/assets und löscht Ordner; später registrierter jobs.close-Hook hat die zusätzliche SQLite-Verbindung noch offen.

Quellbeleg: Zeilen 36, 68. Git-Blob-SHA1 `cd6eb9ca9580ea44df2800650a88fc6bd9a2eb63`, identisch mit der gepinnten Main-Testquelle. [Gemeinsames Rohprotokoll](full-tests.log.gz).

### app/workshop/editable-design.test.mjs

Original: 1/2 pass, 1 fail. Kategorie: `runner-cwd`.

Python-importlib lädt app/workshop/form-print-worker.py relativ ohne cwd-Override; im externen CWD fehlt diese vorhandene Repo-Datei. Gegenprobe aus Repo-CWD vorbereitet. Gegenprobe aus Repo-CWD: 2/2 bestanden, unveränderte Testquelle; Runner-CWD-Ursache damit bestätigt.

Quellbeleg: Zeilen 67, 71. Git-Blob-SHA1 `eb319c1f0d6d8d76e6f5107ff2ec81cd9b56b80a`, identisch mit der gepinnten Main-Testquelle. [Gemeinsames Rohprotokoll](full-tests.log.gz).

### app/workshop/export-jobs.test.mjs

Original: 0/4 pass, 4 fail. Kategorie: `existing-test-windows-cleanup`.

Fixture registriert rm-Hook in Zeile2 vor den späteren close-Hooks der ExportJobStore-Verbindungen in Zeilen6/10/13/18; alle vier Ergebnisse hookFailed/EPERM, keine fachliche Assertion im Fehlerprotokoll.

Quellbeleg: Zeilen 2, 6, 10, 13, 18. Git-Blob-SHA1 `1bcd5dc76c6d3759ec3cedcda2e3f4ecb63ce386`, identisch mit der gepinnten Main-Testquelle. [Gemeinsames Rohprotokoll](full-tests.log.gz).

### app/workshop/konfis.test.mjs

Original: incomplete; keine Root-Summary. Kategorie: `existing-test-windows-cleanup`.

tmp() registriert rm-Hook vor SQLite-/Workshop-/Server-close-Hooks. Drei hookFailed/EPERM und drei weitere Teiltests grün. Danach keine Root-Zusammenfassung; Watchdog beendete nach 605 s, Originaldatei incomplete/timedOut mit counts:null. Sechs Teilereignisse separat; keine Addition zu Originaltotals. Separate Gegenprobe nur hier mit --test-force-exit: reguläre Zusammenfassung 6 Tests, 3 pass/3 identische Cleanup-fail; Original bleibt unvollständig.

Quellbeleg: Zeilen 20, 48, 59, 76, 139. Git-Blob-SHA1 `1e7faddd68957e5d7d8107e5a43274248041db5c`, identisch mit der gepinnten Main-Testquelle. [Gemeinsames Rohprotokoll](full-tests.log.gz).

### app/workshop/material-surface-store.test.mjs

Original: 2/3 pass, 1 fail. Kategorie: `existing-test-windows-cleanup`.

rm-Hook Zeile11 wird vor store.close-Hook Zeile13 ausgeführt; ausschließlich hookFailed/EPERM im Löschvorgang.

Quellbeleg: Zeilen 11, 13. Git-Blob-SHA1 `4532cbebc35496942c42bdeccf1e5319de938dbc`, identisch mit der gepinnten Main-Testquelle. [Gemeinsames Rohprotokoll](full-tests.log.gz).

### app/workshop/production-summary.test.mjs

Original: 2/4 pass, 2 fail. Kategorie: `existing-renderer-windows-font-unicode`.

Die erwarteten Texte sind vollständig enthalten (beide Texttabellen shown=1), die lokale Windows-Arial/PyMuPDF-2.0-Kombination extrahiert jedoch U+00A0 statt U+0020: Hallo\u00a0Wörld bzw. Anna\u00a0&\u00a0Lukas. Zusätzlich teilen U+002D/U+00AD eine Glyph-ID. Minimalprobe ohne Gravuru-Code belegt Arial-Glyph3 für SPACE/NBSP und Glyph16 für Hyphen/SoftHyphen; ToUnicode mappt auf NBSP/SoftHyphen. Helvetica behält ASCII. Dieselben gesicherten Renderer-Eingaben mit gepinntem Main-Python aus Repo- und Workspace-CWD ergeben in allen vier Fällen exakt denselben extrahierten Text wie der eingefrorene B-Stand. Kein Textverlust, kein B- oder CWD-Effekt nachgewiesen; beide ursprünglichen Assertions bleiben fehlgeschlagen.

Belege der getrennten PDF-Diagnose: [vollständige Diagnose](production-summary-diagnosis/diagnosis.md), [Glyph-/Unicode-Minimalprobe](production-summary-diagnosis/glyph-probe.json), [vier Main-Replays](production-summary-diagnosis/main-replay.json), [Quellhashes](production-summary-diagnosis/source-equality.jsonl), [roher Diagnose-Testlauf](production-summary-diagnosis/capture-tests.log). Diese Diagnose wird nicht als zusätzlicher vollständiger Suite-Lauf gezählt.

Quellbeleg: Zeilen 39, 64. Git-Blob-SHA1 `ac87e4b2cec4137444d7f25dce1b1baebe238fdc`, identisch mit der gepinnten Main-Testquelle. [Gemeinsames Rohprotokoll](full-tests.log.gz).

### app/workshop/profile-impact.test.mjs

Original: 9/10 pass, 1 fail. Kategorie: `existing-test-windows-cleanup`.

rm-Hook Zeile78 wird vor profiles.close-Hook Zeile81 ausgeführt; ausschließlich hookFailed/EPERM.

Quellbeleg: Zeilen 78, 81. Git-Blob-SHA1 `53efa9aa5b83a1cb32695d8858b367324f2ccc6e`, identisch mit der gepinnten Main-Testquelle. [Gemeinsames Rohprotokoll](full-tests.log.gz).

### app/workshop/quantity-tiers.test.mjs

Original: 7/8 pass, 1 fail. Kategorie: `existing-test-windows-line-ending`.

Test Zeile156 zerlegt Python-stdout mit split('\n'); Win-Python print übersetzt in CRLF. Tatsächlicher Header ist erwarteter Header plus \r. Testquelle hat 162 LF und 0 CRLF und ist main-identisch; read-only Python-print-Probe erzeugte 410d0a420d0a, ohne Appmodule.

Quellbeleg: Zeilen 156, 157. Git-Blob-SHA1 `c84a9b8f879cc1639211bdbc18b36180e44da8b6`, identisch mit der gepinnten Main-Testquelle. [Gemeinsames Rohprotokoll](full-tests.log.gz).

### app/workshop/shopify-runtime-config.test.mjs

Original: 9/16 pass, 7 fail. Kategorie: `existing-test-windows-and-runner-cwd`.

Vier Positivfälle nutzen POSIX-Literal /tmp/gravuru-test-not-created; Windows normalisiert zu C:\tmp\..., weshalb die absichtlich strenge Normalisierungsprüfung in shopify-runtime-config.mjs:17 ablehnt. Ein Fall verwendet externes process.cwd() statt Repository als angeblich unzulässigen Datenpfad (Runnerfehler). Ein Fall scheitert an symlinkSync EPERM. Ein Positivfall scheitert an privater Storage-Prüfung in shopify-admin-test-server.mjs:16; Windows-Tempmodus hier 040666 (&077=54), POSIX-Privatmodusannahme nicht erfüllt. Root-CWD-Gegenprobe bleibt getrennt. Gegenprobe aus Repo-CWD behebt exakt den CWD-Fall: 10/16 pass, 6 unveränderte Windows-/POSIX-Fehler.

Quellbeleg: Zeilen 9, 13, 17, 21, 27, 35, 38, 45. Git-Blob-SHA1 `a94c106079546dfb610b15d72e19d6b8023dabb6`, identisch mit der gepinnten Main-Testquelle. [Gemeinsames Rohprotokoll](full-tests.log.gz).

### app/workshop/tenant.test.mjs

Original: 5/9 pass, 4 fail. Kategorie: `existing-test-windows-cleanup`.

tmp()-rm-Hook Zeile31 vor Store-close-Hooks99/109/113/117,140,174,215; alle vier Fehler ausschließlich hookFailed/EPERM, keine Isolation-/Schema-/HTTP-Assertion im Fehlerprotokoll.

Quellbeleg: Zeilen 31, 99, 109, 113, 117, 140, 174, 215. Git-Blob-SHA1 `8f4aec4dbdea70d9d87fd855bea6ca4fc851692e`, identisch mit der gepinnten Main-Testquelle. [Gemeinsames Rohprotokoll](full-tests.log.gz).

## Quellen- und Umgebungsnachweis

Die oben aufgeführten elf vorbestehenden Testdateien wurden lesend als Git-Blob gehasht und stimmen bytegenau mit dem Testinventar von Main `ed4b9c6eca8045ac0f650817fb242ace3f13b7e8` überein (`test-source-acquisition-ed4b9c6.json`). Das belegt die unveränderten Testquellen, nicht eine pauschale Gleichheit aller App-Dateien mit Main.

Node v24.20.0, bestehendes Python 3.12.14 unter `work/pyenv/Scripts/python.exe`, TEMP/TMP `work/test-tmp`. Die vorhandenen Module svgpathtools, pymupdf, Pillow, CairoSVG, fontTools, openpyxl und numpy sind nach tatsächlicher Importprobe verfügbar. Keine Pakete installiert. Keine localhost-Berechtigungsfehler im abgeschlossenen Lauf. Der testinterne Windows-Preload ordnet nur python3-Aufrufe dem vorhandenen Python zu und verändert keine Assertions oder Fehler.

Der Runnerfehler wird ausdrücklich festgehalten: Alle Dateien erhielten zunächst externes CWD; korrekt wäre die Isolation nur für die Daten schreibenden catalog-structure/design-dashboard-Dateien gewesen. Zwei direkte CWD-Abhängigkeiten wurden durch Quellenprüfung und Gegenproben bestätigt. Weitere relative Python-/Excel-Aufrufe setzen bereits ihr eigenes Repo-CWD; siehe `full-tests-cwd-scan.json`. Der laufende Vollrunner wurde nicht nachträglich geändert.

Windows-CRLF-Beleg ohne Appimport: Der vorhandene Python-Prozess gab auf print('A\nB') die Bytes `410d0a420d0a` aus. Die quantity-tiers-Testquelle selbst hat 162 LF/0 CRLF; das Problem entsteht beim split('\n') der stdout-Ausgabe, nicht durch Git-Quellnormalisierung.

`integrity.json`: protectedChanges=[], testSourceChanges=[]. Repository-.local-data, app/.local-data, deliverables und legacy-reference sowie alle 175 Testquellen blieben unverändert. Die vorhandene Build-Strecke erzeugt zusätzlich `.preview/lazy` unabhängig vom Ausgabeordner; die Build-basierten Gegenproben wurden deshalb nacheinander ausgeführt.

## Reproduktion und Belege

- Original: `node work/reports/run-full-tests.mjs --run --expected-files 175`
- Genau drei Gegenproben nach Originalabschluss: `node work/reports/run-runtime-config-root-cwd.mjs --run`
- Maschinenlesbare Diagnose: `paket-bc-revision-fulltest-diagnosis.json` (alle ursprünglichen Fehlerfälle mit vollständigem Node-Fehler und Quellnachweisen).
- Infrastruktur: `full-tests-README.md`, `full-tests-cwd-scan.json`.

Keine Appänderungen, keine Testentfernung, kein weiterer breiter Testlauf und keine GitHub-Mutation durch diese Diagnose.
