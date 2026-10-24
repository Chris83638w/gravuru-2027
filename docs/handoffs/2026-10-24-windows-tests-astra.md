# Windows-Testportabilität · 24.10.2026 (Codex / Astra)

PR: https://github.com/Chris83638w/gravuru-2027/pull/15
Branch: `dev/windows-tests-20261024-astra`. Basis: `a1170cb26b3e759824e84b32e7a08a19a887bbd9`. Getesteter Code einschließlich Linux-Workflow: `6a12ee8440ef8ad060918761ebbe106c37da3e03`. Kein Merge und kein Zugriff auf produktive Shop-/Host-Systeme.

## Ergebnis

Alle 40 direkt unter variant-m und 135 direkt unter workshop liegenden Testdateien wurden vor und nach der Änderung gestartet. Keine Namensfilter, kein force-exit.

| Lauf | Dateien mit nativer Summary | Native Tests | Pass | Fail | Skip | Cancel |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Windows vorher | 174/175 | 1216 | 1195 | 21 | 0 | 0 |
| Windows nachher | 175/175 | 1230 | 1225 | 0 | 5 | 0 |
| Linux vorher | 175/175 | 1222 | 1222 | 0 | 0 | 0 |
| Linux nachher | 175/175 | 1229 | 1229 | 0 | 0 | 0 |

Windows vorher: Konfis lieferte zusätzlich sechs einzelne Ergebnisse (3 pass / 3 hookFailed), beendete sich aber nicht und wurde nach 605 Sekunden vom Watchdog erfasst. Diese sechs Ereignisse sind **nicht** in die nativen Summen addiert. Die 21 regulären Fehler plus die drei beobachteten Konfis-Fehler reproduzieren die bekannten 24 Windows-Fehler. Nachher endet auch Konfis regulär (6/6, Exit 0). Alle 175 Nachher-Dateien enden regulär, und die Integritätsprüfung meldet keine Änderungen an Testquellen oder geschützten Verzeichnissen.

Der Linux-Vergleich ist grün: keine neuen Fehler, keine fehlenden Tests, keine neuen Skips/TODOs. Die höhere Testzahl entsteht durch eine neue PDF-Normalisierungsregression und explizite Runtime-Untertests; Windows hat zusätzlich einen bestandenen Fail-closed-Untertest für fehlende POSIX-Modusfähigkeit. Kein bisheriger Test wurde entfernt.

## Änderungen in zehn Testdateien

- account-draft-http, batch-assets, export-jobs, konfis, material-surface-store, profile-impact und tenant: Ressourcen vor dem Löschen in Abhängigkeitsreihenfolge schließen. Reopen-Tests verfolgen den aktuell offenen Store; Streams schließen in finally. Konfis schließt auch die übergebene Werkstatt ausdrücklich. Alle bisherigen 46 Testfälle und 451 Assertion-Ausdrücke dieser sieben Dateien sind erhalten.
- shopify-runtime-config: native absolute Temp-Pfade und Repository-Pfad aus import.meta.url; echte Dateisystemfähigkeit statt fester POSIX-Annahmen. Produktive Sicherheitsprüfungen unverändert.
- quantity-tiers: Python-Ausgabe an LF oder CRLF trennen; Header-, Zeilenanzahl- und Rundlaufassertions unverändert.
- production-summary: nur die belegten Arial/PyMuPDF-Glyph-Aliasse NBSP → SPACE und SoftHyphen → Hyphen normalisieren. Fehlender Text/Bindestrich sowie andere Abstände und Zeilen bleiben durch die neue Regression erkennbar. Renderer und Produktions-PDF unverändert.

Fünf Windows-Skips: drei echte Datei-Symlink-Prüfungen (EPERM), die Konstruktion mit nachweisbar privatem POSIX-Modus und die spezifische Git-Vorfahrenprüfung nach der POSIX-Modusprüfung. Unsichere Ablagen werden weiterhin abgewiesen und unveränderte Dateien geprüft. 22 der 24 alten Fehlerfälle besitzen unter Windows uneingeschränkte Pass-Ergebnisse; zwei alte Elternfälle enthalten plattformbedingt übersprungene Untertests. Unter Linux bestehen sämtliche Fälle ohne Skip.

## Nachweise und Reproduktion

- [Windows-Zähler, 24-Fälle-Matrix, Skips und Quellenhashes](2026-10-24-windows-tests-belege/windows-results.json)
- [Linux-Ergebnis und Artefaktmetadaten](2026-10-24-windows-tests-belege/linux-comparison.json)
- [Manifest](2026-10-24-windows-tests-belege/manifest.json)
- [Linux-Vollauf](https://github.com/Chris83638w/gravuru-2027/actions/runs/40073906606); vollständiges Artefakt `12552682727`, Aufbewahrung bis 07.11.2026.
- [Läufer und Anleitung](../../scripts/test-portability/README.md). Beide Windows-Stände nutzten dasselbe Node 24.20.0/Python 3.12.14 und dieselben vorhandenen Pakete. Beide Linux-Stände nutzten eine gemeinsame Installation unter Ubuntu 24.04/Python 3.12.15. Windows und Linux verwenden teils andere Paketversionen; der Vergleich ist jeweils innerhalb derselben Plattform identisch.

994 Dateien je eingefrorenem Windows-Stand, davon genau zehn geänderte Tests. Alle Nachher-Dateien erneut gegen den Snapshot gehasht. Produktive app-Module sind bytegleich. Ein unabhängiges Review fand keine P1/P2-Befunde; danach wurde ausschließlich der bereits belegte Soft-Hyphen-Alias ergänzt und mit 5/5 PDF-Tests sowie beiden Vollvergleichen bestätigt.

Der erste Linux-Start scheiterte vor den Anwendungstests an einer zu breiten Git-Dateizählung; Commit 6a12ee8 korrigiert die Auswahl auf dieselben 175 direkten Dateien. Die lokale Auswertung lief erfolgreich mit begrenzten Dateiberechtigungen. Der automatische Freigabecheck lehnte weitere komprimierte Windows-Rohuploads wegen möglicher Metadaten ab. Der Branch enthält deshalb geprüfte Ergebnisfelder/Hashes, keine Windows-Roharchive. Ein vorher erzeugter unreferenzierter Nachher-Blob wird nicht in den Branch aufgenommen. Vollständige Windows-Belege sind im lokalen Übergabeordner gesichert.

Der abschließende Dokumentations-/Beleg-Commit verwendet `[skip ci]`: Testquellen, produktiver Code, Runner und Workflow bleiben gegenüber dem erfolgreich getesteten 6a12ee8 unverändert. Die nachträgliche Main-Änderung 2fa5332 ergänzt nur scripts/katalog-host.sh; kein Konflikt mit diesen Änderungen.

## Übergabe an Claude

PR #15 prüfen, insbesondere die fünf Windows-Capability-Skips und die getrennten Vorher-Zähler. Linux ist vollständig grün; Windows hat keine Fehler oder unvollständigen Nachher-Dateien. Keine Freigabe von Chris fehlt für dieses Testpaket. Merge bleibt bei Claude beziehungsweise Chris; dieser Auftrag umfasst keinen Merge und keine Live-Aktion. D/E bleiben davon getrennt.
