# Operator-Nachprüfung: vier Ops-/Galerietests

11.11.2026 · Arbeit im gemeinsamen `work/issue230-integration-candidate`; gelesener HEAD beim Abschluss `045f0acb964913094e6b6df310554ef9d8463667`. Anlass: Operator-Abnahme #168, Kommentar 6806309873.

**Abgeschlossen: 15/15 gezielte Tests grün, 0 Fehler, 0 übersprungen, 4,08 Sekunden.** Ausschließlich vier Testdateien geändert (+47/−7); kein Runtimecode, kein Staging, Commit oder Push, keine Server-/Shopify-Aktion. Dateien sind eingefroren.

## Befunde und gezielte Korrekturen

| Testdatei | Belegte Ursache | Korrektur und erhaltene Prüfung |
|---|---|---|
| `ops/plesk/gallery-management-mount.test.mjs` | Die gemeinsame Fixture erstellt `package` mit `mkdir` ohne privaten Modus. Unter Linux ergibt eine übliche umask 022 Rechte 0755. Der echte Mount prüft in `config.mjs:57` ausdrücklich, dass keine Gruppen-/Fremdrechte gesetzt sind. Der vorhandene Windows-Metadatenmock verdeckte das. | Die **Testablage** wird vor dem Mount mit `chmodSync(...,0o700)` abgesichert; auf POSIX wird exakt 0700 zusätzlich behauptet. Vorhandener Windows-Mock bleibt auf dieses Verzeichnis begrenzt. Beide echten Mountvarianten und unveränderte Proxy-/CSRF-Prüfungen laufen. Keine Lockerung der privaten Verzeichnisprüfung. |
| `ops/plesk/slate-review-runtime.test.mjs` | Unbekannter Body-Schlüssel scheitert inzwischen bereits an der Auswahl der angezeigten Ziele in `slate-review-gallery.mjs`, bevor der Freigabespeicher aufgerufen wird. Der alte Test erwartete die nachgelagerte 404 des Speichers, tatsächlich korrekt ist der vorgelagerte Scope-Fehler 422. | Exakt 422 **und** die konkrete Meldung „Das Prüfziel gehört nicht zu den angezeigten Vorlagen.“ geprüft. Keine Zulassung mehrerer beliebiger Statuscodes. Die abschließende Unverändertheitsprüfung der Freigaben sowie 401/403/409/413, nicht verfügbare Ziele und geschützte Datenbankpfade bleiben erhalten. |
| `scripts/gallery-review-performance.test.mjs` | Die Verwaltungsübersicht lädt seit der bewussten Umstellung nur `sourceSummaries()`; daher 0 statt früher 2 nativer Dokumentabrufe. Details werden erst über `/originale/verwaltung/api/sources?key=…` gelesen. | Strenge **0-Lesungen-Garantie** für die Übersicht, `detailsLoaded:false`. Anschließend wird genau eine Quelle ausdrücklich angefordert, ihr Detailstand geprüft und nachgewiesen, dass ausschließlich deren Produkt gelesen wird. Die bisherigen Fingerprint-, Fremdscope-, CAS-/Änderungs- und 60er-Umfangsprüfungen bleiben unverändert. |
| `scripts/slate-management-mount.test.mjs` | Kontext liefert absichtlich `targets:[]` mit `targetsDeferred:true`; die Sync-Ziele werden über `/api/sync` nachgeladen. Zusätzlich enthielt die alte Fixture keine Familienangaben im Manifest, während die leichte Scopeübersicht unbekannte Legacy-Zuordnungen ausdrücklich offen lässt. Deshalb war der frühere erwartete familiengefilterte Zweierumfang mit dieser Fixture nicht mehr aussagekräftig. | Echter Zweischritt Kontext → Sync, weiterhin exakt ein Ziel mit unveränderter Mapping-ID. Für **diesen Test** werden tatsächliche Familienkennungen aus den synthetischen nativen Quellen im Manifest festgehalten. Der zusätzliche synthetische Familienschnitt erhält denselben belegten Familienpin in beiden Designbänken **vor** Anlage seiner Quell-/Zielrepositorys. Es wird eine Kopie vorbereitet, kein gespeicherter/frozen Record mutiert. Ursprüngliche starke Assertions bleiben: genau zwei zur Familie passende Quellen, nach Entzug der Materialfreigabe keine Quelle, ablehnender unbestätigter Syncplan, bestätigter Plan bereit, echte Vorher-/Nachher-SVG, null Shop-Schreibvorgänge. |

Die Mountfixture ermittelt die Familie aus ihren vorhandenen nativen `familyFormats` beziehungsweise `design.katalog.target` und prüft deren Eindeutigkeit. Es wird keine zusätzliche Geschäftsregel oder erfundene Familienfreigabe eingebaut. Eine zwischenzeitlich unvollständige Fixture, die nur den Manifestpin ergänzte, wurde durch den unveränderten nativen Familien-Identitätsguard korrekt abgewiesen; die endgültige Fixture hält Manifest und beide nativen Designbänke konsistent.

## Reproduktion und Ergebnis

Ab Kandidaten-Repositorywurzel:

```text
node --test --test-reporter=tap ops/plesk/gallery-management-mount.test.mjs ops/plesk/slate-review-runtime.test.mjs scripts/gallery-review-performance.test.mjs scripts/slate-management-mount.test.mjs
```

Keine Python-/Logoabhängigkeit benötigt. Die Tests betreiben ausschließlich eigene Loopback-HTTP-Server und synthetische SQLite-Dateien unter temporären Verzeichnissen. Lokale Netzwerkbeschränkungen mussten für den Testprozess aufgehoben werden; ein vorheriger eingeschränkter Lauf scheiterte an `connect EACCES 127.0.0.1` und ist kein Funktionsbefund.

- Unveränderte funktionale Windows-Baseline: **12/15**, die drei gemeldeten API-Vertragsabweichungen reproduziert (`operator-followup-ops-baseline.txt`). Vor Änderungen war der Diff dieser vier Testdateien gegenüber `0e200d8` leer.
- Finaler gemeinsamer Lauf: **15/15**, 0 Skip, natürlicher Prozessabschluss (`operator-followup-ops-final.txt`). Dazwischen wurden nur noch konkret betroffene Dateien nach Änderungen erneut ausgeführt.
- `git diff --check` für genau diese vier Dateien ohne Befund.

## Linux-Grenze

Der finale Lauf erfolgte **unter Windows, Node v24.20.0**, nicht auf Plesk/Linux. Die zwei vom Operator unter Linux gemeldeten 0700-Fehler sind anhand des realen `verifyDirectory`-Guards und der bisher ungeschützten Fixture erklärt und im Testsetup korrigiert. Windows besitzt keine vollständige POSIX-Rechtesemantik; daher wird **keine neue grüne Linux-Abnahme behauptet**. Der Operator soll dieselben vier Dateien unter seiner Linux-Umgebung gezielt erneut ausführen. WSL stand diesem lokalen Prozess nicht zur Verfügung (`Wsl/E_ACCESSDENIED`); es wurde keine Umgebung installiert oder Serverprüfung ausgelöst.

Keine produktive Funktionsänderung erforderlich. Der Bericht und die beiden maßgeblichen Logs reichen als Folgebeleg; die Zwischenläufe dokumentieren nur die Diagnose und sind keine offenen Endfehler.
