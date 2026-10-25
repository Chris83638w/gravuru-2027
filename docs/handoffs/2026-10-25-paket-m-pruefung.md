# Paket M – unabhängige Prüfung der Gesamtübergabe

Stand: 25.10.2026 · Codex/Astra  
Geprüfter Code: `792c808dc1ee7a16a0c37cfdeff9439d5b022a84`  
Geprüfter Katalog: `7f4a048148a3a35548909c92978e99360c0988e6`

## Ergebnis

Die [Gesamtübergabe](2026-10-25-paket-m-gesamtuebergabe-claude.md), Claudes [Rückmeldung in PR #21](https://github.com/Chris83638w/gravuru-2027/pull/21#issuecomment-6397924501) und die geprüften Quelldaten widersprechen sich nicht. PR #21 ist von Claude gemerged; diese Prüfung erteilt keine Design-, Import- oder Live-Freigabe.

**Ein zusätzlicher P2-Codebefund:** [Issue #22 – RGB-Prozentfarben umgehen die Gravur-Farbprüfung](https://github.com/Chris83638w/gravuru-2027/issues/22). In `app/workshop/design-target-rules.mjs:21` werden Prozentkanäle ohne Umrechnung auf 0–255 mit der Neutralgrenze 16 verglichen. Ein 3-mm-Text mit `rgb(15%,0%,0%)` erhält „passt“, die identische Farbe `rgb(38.25,0,0)` korrekt „passt nicht“. Corel-Schwarz `#1b1918` bleibt korrekt neutral. Der Hauptagent hat die Gegenprobe unabhängig wiederholt; sie schlägt erwartungsgemäß wegen dieses Unterschieds fehl. Kein konkretes betroffenes Katalogprodukt nachgewiesen. Korrekturvorschlag und ausführbare Reproduktion stehen im Issue. **Noch kein Fix.**

## Quellen, Funktionen und offene Punkte

- Die isolierte Prüfkopie enthält alle **769 Anwendungs- und 185 Skriptdateien**, insgesamt 954/954 mit den aktuellen Git-Blob-Prüfsummen identisch. Nachprüfung ohne Quellenänderung. [Manifest](paket-m-audit-20261025/source-manifest.json.gz), [Integrität](paket-m-audit-20261025/source-integrity.json).
- Alle **761 Master-design.json**, 11 Familien-JSON, 12 Linien-JSON, 15 Reihenindizes, `themen.json` und 24 einschlägigen Bestands-JSON gegen aktuelle Katalog-Git-Blob-SHAs geprüft. 0 explizite Zielmigrationen, 0 globale und 0 Zielfreigaben.
- Frischer Migrations-Dry-run mit aktuellem Code: **761 Master, 759 bereit, 2 blockiert, 0 geschrieben, Freigaben 0 → 0**. D234/D235 bleiben wegen mehrdeutiger Familienzuordnung offen. Sämtliche 24 Gedenktafel-30×20-Bestandskollisionen bestätigt.
- **104 Zuordnungen / 102 verschiedene Startdesigns** ist richtig: `TRE-V2A-8x5-D20` wird von 4000000 und 12400000 verwendet, `TRE-V2A-8x3,5-D29` von 8900000 und 9300000.
- Die fünf Kennungsregeln stimmen mit Katalog-README und Variantenlogik überein. Materialwechsel ist ein Ziel; Format/Form/Linie folgen der festgelegten Variantenregel; keine automatische Bestandsübernahme.
- Kundenupload-Graustufen sind auf Schiefer bzw. Acrylgravur begrenzt. Explizite Originalwahl bleibt erhalten. Vorlagen, Beispiele und Logos sind von der Upload-Vorgabe ausgeschlossen. Maskenbewegung und Crop sind getrennt; Bewegungs- und Austauschrechte bleiben unabhängig. Quellprüfung und aktuelle Tests bestätigen dies.
- `tools.photo`, Familien-Fotoangabe „prüfen“, Neutralgrenze 16 sowie Händler-Routing der Zielvorschau sind im aktuellen Code vorhanden. Der Prozentparser-Befund oben ist eine zusätzliche Umsetzungslücke dieser Neutralregel.
- **D204-Schwarz bleibt offen für Paket Q:** altes `foto-1.jpg` und `preview.png` sind aktuelle, SHA-identische RGB-Dateien mit sichtbar eingebettetem schwarzen Bereich. Die echte transparente 22×14-PNG hat andere Orientierung und einen Upload-Hinweis. Vier Bilddateien binär abgeglichen und die drei maßgeblichen Ansichten erneut visuell geprüft. Keine Bilddatei verändert. [Katalognachweis](paket-m-audit-20261025/catalog-audit.json).

## Neue Tests auf Windows

| Umfang | Tests | Bestanden | Fehler | Skips |
|---|---:|---:|---:|---:|
| Erster vollständiger App-Lauf, 192 Dateien | 1494 | 1374 | 113 | 7 |
| Unveränderte Nachprüfung der 39 blockierten Dateien | 275 | 275 | 0 | 0 |
| Finale App-Abdeckung, jede Datei einmal gezählt | 1494 | 1487 | 0 | 7 |
| Shop-Bind/Sync/Dry-run/Export, vier Skriptdateien | 32 | 31 | 0 | 1 |
| Gesamt, ohne Doppelzählung der Nachprüfung | **1526** | **1518** | **0** | **8** |

Node `v24.20.0`, Windows; Python 3.12.14 mit vorhandenem `svgpathtools`, `pymupdf`, `PIL`, `cairosvg`, `fontTools`, `openpyxl` und `numpy`. Test- und Quelldateien sowie geschützte lokale Daten unverändert.

Der erste vollständige Lauf konnte lokale Testserver teilweise nicht erreichen (`EACCES`; in Transporttests als Netzwerkfehler weitergegeben). Nach erteilter lokaler Verbindungsberechtigung wurden ausschließlich die 39 betroffenen Testdateien unverändert wiederholt. Die finale Abdeckung zählt jede Datei genau einmal; Erstlauf und Nachlauf bleiben getrennt dokumentiert. Der Nachlauf ist **kein zweiter vollständiger Einzellauf**. Der vorhandene Windows-Python-Alias wurde verwendet; Assertions und Tests wurden nicht geändert.

Sieben App-Skips betreffen fehlende Dateisystemfähigkeiten: Symlink/Junction, Hardlink und private POSIX-Rechte. Die Tests bestätigen außerdem, dass unzureichend geschützter Speicher abgelehnt wird. Ein weiterer optionaler Skip betrifft den nicht angeschlossenen echten Shop-Export/Katalog in `shop-sync.test.mjs`. Skips zählen nicht als bestandene Plattformprüfungen.

Die bestehende Suite deckt den neu gefundenen Prozentfarbenfehler nicht ab. Deshalb können ihre Ergebnisse grün sein, obwohl die zusätzliche Gegenprobe aus Issue #22 fehlschlägt.

[Auswertung je Testdatei](paket-m-audit-20261025/test-results.json) · [Testinventar](paket-m-audit-20261025/test-inventory.json.gz) · [Erstlauf-Rohlog](paket-m-audit-20261025/initial-app-tests.log.gz) · [Nachlauf-Rohlog](paket-m-audit-20261025/permission-recheck.log.gz) · [Skript-Rohlog](paket-m-audit-20261025/script-tests.log.gz) · [Shop-Export-Rohlog](paket-m-audit-20261025/shop-export-tests.log.gz) · [Prüfsummen](paket-m-audit-20261025/SHA256SUMS.json)

## Historische Nachweise und Grenzen

Die historischen Zähler wurden unabhängig aus den veröffentlichten Summen/Rohlogs nachgerechnet: 188 Dateien, 1449 Tests, 1442 bestanden/7 Skips; spätere Fotoergänzung 286/286 Konfigurator und 35 unterschiedliche Werkstatt-Pässe. Nachläufe wurden nicht doppelt gezählt.

Claudes Linux-Stand **1525/1524/0/1** und Deployment-/Admin-Stichproben sind in STATUS dokumentiert, hier weder als eigener Linux-Lauf noch als neue Live-Prüfung ausgegeben. Sein exakter Befehl und Dateiinventar stehen dort nicht. 1494 App-Tests + 32 Skripttests − 1 zusätzlicher Windows-Untertest ergeben rechnerisch 1525; das ist eine quellengestützte Erklärung der Zählerdifferenz, kein Beweis seines ausgeführten Befehls.

Veröffentlichte Desktop-/iPhone-Emulationsnachweise, Rohlogs und Quellenlinks existieren; ihre Aussagen sind konsistent. Keine neue Browserabnahme und keine Prüfung auf einem physischen iPhone in dieser Runde. Kein Live-Zugriff, keine Migration angewendet, kein Import und keine Freigabe. Keine Änderung am Anwendungscode oder Katalog.

**Nächster Schritt für Claude:** Issue #22 mit Normalisierung und Regressionstest bearbeiten; D204-Originalquelle weiterhin im Paket Q klären. Design-Freigaben und Pilot bleiben die separat vereinbarten Schritte. Ergebnisse und Rückfragen auf GitHub festhalten.
