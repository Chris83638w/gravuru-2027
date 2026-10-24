# Paket B – Claude-Review korrigiert und Paket C integriert · 24.10.2026

## Zweck und Stand

Die beiden in [Claudes Review](https://github.com/Chris83638w/gravuru-2027/pull/12#issuecomment-6380134234) gemeldeten UI-Regressionen sind behoben. B ist mit dem gepinnten main `ed4b9c6eca8045ac0f650817fb242ace3f13b7e8` zusammengeführt (Code-Commit `cd969347e88e3c7af8de43d258099e0a63e77dd6`); darin sind Paket C (`42c6404693d9117ce83e5afe9f478e0211d70793`) und Claudes LF-Korrektur für den A-Beleg enthalten. B-Elternstand ist `f4439c2163644091bd781b9e7b76f3d2641884fe`. Die Zusammenführung erhält beide Eltern; kein Force-Push und kein Merge nach main.

- Code: [PR #12](https://github.com/Chris83638w/gravuru-2027/pull/12).
- Katalog: [PR #3](https://github.com/Chris83638w/gravuru-katalog./pull/3), unveränderter Head `0a1abccd10a787ab36e8c0e3e6b61f731b9bdf3f`; bleibt offen, bis #12 grün und durch Claude abgenommen ist.
- Browser: Claude bestätigte RT1/RT2 9×6, Kontur/Bohrungen, 17,48 €, Ziehen und Warnungen; keine erneute Browserprüfung durch Astra.

## Korrekturen und Zusammenführung

`usability.mjs` importiert `objectSurface` bereits korrekt aus `surfaces.mjs`. Der extrahierte echte Click-Handler erhielt dieselbe echte Funktion im VM-Testkontext; Test 6 bleibt bestehen. Im Produktionsbundle `editor-887f8b85f210956b.mjs` verweist der Import auf Modul 33. Alle 84 Module wurden nativ verknüpft; Front-/Back-Aufrufe aus usability und die Gzip-Ausgabe wurden geprüft.

`placementSurface()` ergänzt eine fehlende aktuelle Form aus `profile.geometry.shape`, bevor die Gestaltungsfläche berechnet wird. Eine explizite aktuelle Form bleibt maßgeblich, einschließlich orientierter Konturgeometrie. Der Test-Stub enthält `shape: rect`; derselbe Test prüft zusätzlich den fehlenden Wert und den Vorrang einer expliziten abweichenden Form. Die gesamte UI-Regressionsdatei besteht mit 18/18.

Die Importzusammenführung erhält B-Quellgrößenauflösung, proportionalen Fit, Originalkontur und feste Bohrungen sowie C-Streaming, sofortige Dokumentprüfsummen und begrenzte SVG-Tokenisierung. Die C-CLI ist unverändert übernommen. 23/23 Import-/Konvertertests bestehen, einschließlich einer kombinierten Kontur-/Streaming-Prüfung. Die Einzelheiten stehen in `2026-10-24-paket-b-revision-belege/paket-bc-revision-import-handoff.md`.

## Vollständiger Dry-run mit 2 GB Old Space

```text
node --max-old-space-size=2048 scripts/katalog-import.mjs --katalog ..\gravuru-katalog --linie edelstahl-tuerschilder --alle-designs --dry-run --json ..\reports\paket-bc-revision-dry-run.json --metrics ..\reports\paket-bc-revision-metrics.json
```

Exit 0; 184,116 s CLI-Zeit / 185,080 s äußere Stoppuhr. Beobachteter Heap-Peak 561,1 MiB; RSS-Messwert 971,1 MiB; Prozess-MaxRSS 982,2 MiB. 744 Produkte = 597 neu, 147 gesperrt; 7.920 Vorlagen. Keine fehlenden Schriften oder Konvertierungsfehler. Die unveränderten Sperren sind 130 Preisfälle, 10 Startdesignfälle und 7 Konturvorlagenfälle. Der vollständige Vergleich gegen den bisherigen B-Bericht ist nach bijektiver Normalisierung zufälliger Schriftprofil-IDs gleich; alle Produktzeilen und Katalogpfade sind auch ohne diese Normalisierung identisch. SHA256 des unkomprimierten Berichts: `39dfdba983d465a11e276653a61d4521b7999996bba221607fadeb103c947b63`.

## Vollständige Regression, nicht nur der frühere Teillauf

Der Lauf `node work/reports/run-full-tests.mjs --run --expected-files 175` erfasste ohne Namensfilter alle direkten `*.test.mjs` aus beiden geforderten Verzeichnissen: 40 Konfigurator- und 135 Werkstattdateien. Node v24.20.0, vorhandenes Python 3.12.14; svgpathtools und pymupdf sowie alle weiteren geprüften Python-Module sind hier vorhanden. Es wurde nichts installiert.

| Unveränderter Originallauf | Dateien | Pass | Fail | Unvollständige Dateien |
|---|---:|---:|---:|---:|
| Konfigurator | 40 | 236 | 0 | 0 |
| Werkstatt | 135 | 957 | 23 | 1 |
| Gesamt | 175 | 1193 | 23 | 1 |

Das sind 1.216 native Node-Zähler aus 174 beendeten Prozessen. `konfis.test.mjs` hatte sechs Teilergebnisse, aber nach Windows-Cleanup-Fehlern keine Root-Zusammenfassung; der 605-Sekunden-Watchdog beendete nur diesen Prozessbaum und der Lauf wurde fortgesetzt. Keine Datei ausgelassen, keine Tests gestrichen, kein Skip/Cancel. Testquellen und geschützte Repository-Daten blieben unverändert.

Der ursprüngliche Runner verwendete ein isoliertes Arbeitsverzeichnis für alle Dateien. Das schützt die Daten schreibenden Tests, verursachte aber in `editable-design` und einem Runtime-Konfigurationstest relative Pfadfehler. Die drei gezielten Gegenproben liefen deshalb getrennt aus dem Repository: editable-design **2/2**, runtime-config **10/16**, konfis **3/6**. Nur konfis erhielt `--test-force-exit`; seine drei Cleanup-Fehler bleiben Fehler. Diese Gegenproben zählen separat **15/24 pass**, 9 fail.

Die zusätzliche Gesamtsicht ersetzt genau diese drei Dateiergebnisse, ohne wiederholte Tests zu addieren: **1.198/1.222 pass, 24 fail, 0 skip/cancel; alle 175 Dateien bilanziert (165 Dateien bestanden, 10 fehlgeschlagen)**. Konfigurator **236/236**, Werkstatt **962/986**. Diese Aggregation ist kein neuer vollständiger Lauf. Beide Originalzählungen sind unverändert gesichert.

Die 24 verbleibenden Fehler sind einzeln belegt:

- **15 Windows-Cleanup-Fälle**: Löschen offener SQLite-/Store-Dateien vor später registrierten close-Hooks; account-draft-http, batch-assets, export-jobs, konfis, material-surface-store, profile-impact und tenant.
- **6 Windows/POSIX-Runtime-Fälle**: vier feste POSIX-Pfade, eine nicht erlaubte Symlinkerstellung und eine POSIX-Dateirechteannahme.
- **1 Python-stdout-CRLF-Fall**: quantity-tiers zerlegt Windows-Ausgabe mit `split('\n')`; die Testquelle selbst hat LF und ist main-identisch.
- **2 PDF-Textextraktionsfälle**: Windows-Arial/PyMuPDF 2.0 liefert NBSP statt SPACE. Die Texte sind vollständig vorhanden. Gepinntes main reproduziert mit identischen Eingaben in beiden Arbeitsverzeichnissen exakt dieselben extrahierten Texte; eine Minimalprobe ohne Gravuru bestätigt den Effekt. Keine Layoutkürzung und kein B-Effekt. Die Assertions bleiben unverändert fehlgeschlagen.

Die [vollständige Fehlerdiagnose](2026-10-24-paket-b-revision-belege/paket-bc-revision-fulltest-diagnosis.md) enthält Quellzeilen und Main-Blobbelege. [PDF-Ursache und Main-Replays](2026-10-24-paket-b-revision-belege/production-summary-diagnosis/diagnosis.md), [Originalsummary](2026-10-24-paket-b-revision-belege/full-tests-summary.json.gz), [gesamtes TAP-Protokoll](2026-10-24-paket-b-revision-belege/full-tests.log.gz), [Aggregation](2026-10-24-paket-b-revision-belege/full-tests-aggregate.json) und Inventar sind versioniert. Keiner dieser Fehler wurde zu einem erfolgreichen Test umgedeutet.

## LF, Integrität und nächster Schritt

Alle in dieser Revision geschriebenen Textdateien enthalten LF. 13 ältere B-Textbelege wurden ebenfalls normalisiert; `historical-evidence-lf.json` ordnet ursprüngliche und neue Git-Blobs zu. Historische Originalprüfsummen beziehen sich auf `f4439c2`. Komprimierte Originalprotokolle bewahren ihre Rohbytes. Claudes normalisierter A-Beleg und alle C-Belege/CLI sind unverändert aus main übernommen.

Die 47 im Quellmanifest festgehaltenen Dateien (B-Quellen, neuer UI-Test und C-CLI) bleiben nach Tests/Diagnose bytegleich zum geprüften Stand. Es gab keine zusätzlichen fachlichen Codeänderungen nach `cd96934`. Änderungen an Preisen, Quellgeometrie, Designs, IDs oder dem Katalogbranch waren nicht Bestandteil dieser Revision.

**Die vollständige Suite ist nicht grün.** PR #12 bleibt Draft zur Prüfung durch Claude; Katalog-PR #3 bleibt ebenfalls offen, bis #12 grün und abgenommen ist. Die beiden angeforderten UI-Korrekturen, B+C-Zusammenführung, Bundleprüfung und kombinierter 2-GB-Dry-run sind abgeschlossen. Nächster Schritt: Claude prüft die Korrekturen und die dokumentierten Bestands-/Umgebungsbefunde im vorgesehenen Prüfhost, entscheidet die grüne Abnahme für #12 und merged erst danach Katalog #3. Keine weitere Browserprüfung erforderlich. Kein Import-Commit, Deployment oder Merge nach main durch Astra.
