# Klartextbelege zur Katalogübernahme #233

Dieser Nachtrag sichert vorhandene Quellen und ordnet belegte Arbeitsschritte zu. Er führt nichts auf dem Server aus. Die Skripte sind historische Belege, keine Aufforderung, den bereits abgeschlossenen Fast-Forward erneut auszuführen.

Anlass ist [Claudes Meldung vom 11.11.2026](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6805861632): 55 frühere Plesk-Einträge in der Form `node -e 'eval(Buffer.from(...))'`, davon vier mit Fehler. **Diese Gesamtzahl und die Identität aller 55 Aufrufe sind hier nicht unabhängig nachgewiesen.** Die vollständigen äußeren Befehle mit dekodiertem Inhalt, Argumenten, Arbeitsverzeichnis und Zeitstempeln liegen diesem Audit nicht vor. Auch die vier Fehler lassen sich hier nicht vollständig zuordnen.

## Nachweisbare Trennung der Verantwortlichen

1. **Mika vor Übernahme:** [Ankündigung](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6791980087), danach [Übergabe](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6800508112). ZIP/Bundle/Manifest/V1 wurden bereitgestellt; V1-Inspect brach wegen falsch getrennter Git-Eingabepfade mit `ENOBUFS` ab. Die Übergabe meldet ausdrücklich keinen Apply. V2 war lokal korrigiert und in Git gesichert.
2. **Astra, diese Session:** [Übernahme angekündigt](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6801987308). V2 separat übertragen und gehasht; erster V2-Inspect grün, vor Apply nach Verbindungsunterbrechung erneut geprüft. [Ergebnismeldung](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6802255704) dokumentiert einen erfolgreichen Apply und anschließend die lesende Nachkontrolle. Ein erster Nachcheck scheiterte an Node-Modulauflösung unter `/root`; nach Anpassung war er grün. **Kein zweiter Apply.**
3. **Claude und übrige Einträge:** Claudes Datenbanksicherung ist separat beschrieben und gehört nicht zum Katalogskript. Weitere Plesk-Einträge sind ohne ihre konkreten Befehlsdaten weder dieser Session noch einer anderen Person zugeordnet. Die Form `eval(Buffer.from(...))` allein beweist weder gleichen Inhalt noch gleichen Verursacher.

Die fünf hierfür verwendeten Issue-Kommentare sind als begrenzte Textbelege in `issue-evidence.json` gesichert; keine vollständigen Chats oder Rollouts.

## Vorhandene Klartextquellen

| Datei | Inhalt und Wirkung | Beleggrenze |
|---|---|---|
| `sources/catalog-ff-v1.cjs` | Historischer Runner mit defekter Mehrpfad-Eingabe; enthält Inspect und Apply/Rollback. | Mika meldet nur gescheiterten Inspect. V1 nicht verwenden. |
| `sources/catalog-ff-v2.cjs` | Fester Katalogrunner mit korrigierter NUL-Trennung; Inspect liest, Apply verändert den begrenzten Katalogzustand. | Datei-SHA vor belegtem Apply geprüft. Äußerer Eval-Wrapper hier nicht erhalten. |
| `sources/writer-preflight.cjs` | Prüft gleichbenutzereigene Prozesse und benannte Sperrdateien. Liest `/proc/*/cmdline` ausschließlich intern; Ausgabe nur Zähler, PID/Prozessname, Sperrdateiname. | Momentaufnahme mit Suchmustern; kein vollständiger Beweis gegen alle denkbaren Schreiber oder andere Benutzer. |
| `sources/catalog-config-check.cjs` | Liest `app.cjs` als Text, führt es nicht aus, gibt nur `GRAVURU_KATALOG` und Übereinstimmung aus. | Belegt die direkte Konfigurationszuweisung, nicht den Speicherinhalt eines laufenden Prozesses. |
| `sources/postcheck-original.cjs` | Prüft Manifest/Runnerhash, Backup und Enddateien, Git-HEAD/Branch/Status sowie drei erhaltene Änderungen. | Gespeicherte Ausgangsfassung mit `require(runner)` und Standalone-Argumentposition. **Nicht als exakter erfolgreicher Eval-Payload ausgegeben.** |
| `sources/catalog-ff.test.cjs` | Lokale Sicherungs-/Rollbacktests in neu erzeugten Git-Fixtures. | Kein Serverlauf; historische Prüfung 8/8. Dieser Audit hat die Tests nicht erneut ausgeführt. |

Alle kopierten Quellen bleiben bytegleich. `manifest.json` enthält jeweils Originalpfad, Bytezahl und SHA-256. Für V1/V2/Tests/Manifest stimmen die dekodierten, lokal vorhandenen `.b64`-Dateien bytegenau mit den Klartextdateien überein. Das belegt die lokale Kodierung, **nicht** eine bislang fehlende Zuordnung zu einem bestimmten äußeren Plesk-Befehl.

V2 liegt bereits im [Übergabe-Commit 8ab147140f305ea1f6a47b4e106b7af3367bc76d](https://github.com/Chris83638w/gravuru-2027/blob/8ab147140f305ea1f6a47b4e106b7af3367bc76d/ops/proofs/issue233-catalog-ff-20261111/catalog-ff-v2.cjs). Der über GitHub gelesene Git-Blob `9e56e07ca8a853910881b69bd9f8b14d9fd4599d` stimmt mit dem aus der lokalen Datei berechneten Git-Blob überein. SHA-256: `7104c52f22138ffae40d1f1a774674fe3ab7bc44a5d82c167955198a47001935`.

Die älteren vorbereiteten `.command.sh`-Dateien liegen getrennt unter `historical-command-templates/`. Sie sind Shell-Vorlagen mit eingebettetem Klartext, keine Ausführungsprotokolle. Die Postcheck-Vorlage hat noch einen Platzhalter für den neuen Backupordner. Beim tatsächlich erfolgreichen Nachcheck wurden laut damaliger Session-/Issue-Meldung absoluter `createRequire(runner)`, Paket-Arbeitsverzeichnis und Argumentübergabe angepasst. Der exakte finale Text wurde nicht wiedergefunden; eine Rekonstruktion wird hier nicht als Original hinzugefügt.

## Fester Schreibumfang des V2-Apply

- Katalogroot: `/var/www/vhosts/gravuru-designwerkstatt.de/private/issue139-katalog-20261102`; Branch `issue139-catalog-20261102`.
- Ausgang `b5d8f28bc1b634412e628c2967fde587a92ff2fb`, Ziel `8236b8bfab7322447ec46661c116fa526331af3d`.
- 552 Ziel-Dateien: 168 neu, 384 geändert, keine im Ziel gelöschte Datei. Drei lokale D20-/Auditänderungen bleiben erhalten; die SVG bytegleich, JSON als geprüfter Dreiwege-Merge, Audit mit beiden Anhängen.
- Apply legt eine neue betroffene Dateien-/Index-/HEAD-Sicherung an; erzeugt eigene Git-Refs, native Sperre und eigenes Journal; importiert das lokale Git-Bundle und führt exakt `--ff-only` aus. Er ersetzt die drei lokalen Dateien kurz durch ihre gesicherte Basis und spielt danach die geprüften Ergebnisse atomar ein.
- Git-Objekte, Index, Branch-Ref und Reflog können sich ändern. Erfolgsbeleg `success.json` wird geschrieben. Sperre/Journal werden nur nach Erfolg oder nach verifiziertem Rückweg entfernt.
- Der Fehlerpfad kann gesicherte Dateien/Index/Branch wiederherstellen und ausschließlich zuvor abwesende, vom Lauf angelegte Dateien entfernen; bei unbekannten Fremdänderungen verweigert er die Rücknahme. **Die Quelle enthält deshalb auch Schreib-/Entfernungsoperationen. Der Runner ist nicht pauschal „read-only“.**
- Kein App-Dateischreiben, keine Datenbankmutation, keine Shopify-/Bindingsmutation und kein Neustart im Katalogrunner. Das gilt für diese geprüften Quellen und den dokumentierten Lauf, nicht pauschal für alle 55 gemeldeten Einträge.

Zusätzlich wurde in dieser Session die V2-Datei in den bereits vorhandenen privaten Paketordner übertragen. ZIP/Bundle/Manifest waren vorher von Mika bereitgestellt. Exakte Übertragungs-Wrapper werden durch dieses Quellenpaket nicht nachträglich behauptet.

## Beobachtete Ergebnisse

`evidence/Server-Nachpruefung.txt` enthält vier gespeicherte Plesk-Ausgabeeinträge: Konfigurationspfad, Vorprüfung, Apply, erfolgreiche Nachprüfung. Einige Zeilen sind durch die Oberfläche gekürzt; dies ist keine vollständige Plesk-Historie.

- Vorprüfung: **2026-11-11T17:00:33.980Z**, Ausgang korrekt, drei lokale Änderungen, 0 erkannte Writer-Kandidaten, 0 Locks; neun andere gleichbenutzereigene Prozesse.
- Apply: **2026-11-11T17:02:53.740Z**, Erfolg, Ziel-HEAD, 552 Dateien, drei lokale Änderungen. Sicherung: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-catalog-ff-20261111/2026-11-11T17-02-47-073Z-0c6e01f5-07e2-4d44-ba86-fc5e623c5f6e`.
- Nachprüfung: **553 finale Dateihashes**, **385 gesicherte vorhandene Dateien**, 168 vorher abwesende Dateien dokumentiert; Branch/HEAD korrekt, SVG/JSON/Audit erhalten, drei lokale Änderungen, 0 Locks.

`evidence/Pruefbeleg.json` ist die damalige strukturierte Zusammenfassung, kein neu vom Server gelesener Rohbeleg. Die fünf dort referenzierten lokalen Text-/Bilddateien wurden erneut gegen ihre vorhandenen SHA-256-Pins geprüft. Die Screenshots werden nicht unnötig dupliziert; ihre lokalen Pfade und Hashes stehen im Manifest. Historische Paket-README und Proofs stehen ausdrücklich unter `historical/`, weil deren Angaben „noch kein Apply“ vom späteren Erfolg überholt wurden.

## Noch fehlender Einzelabgleich

Für eine vollständige Prüfung der gemeldeten 55 Einträge benötigt der Operator pro Eintrag den exakten ungekürzten äußeren Befehl, Zeit-/Reihenfolge und Ergebnis. Payload nur dekodieren, nicht ausführen; Geheimnisse vor einer Git-Aufnahme entfernen und Redaktionen kenntlich machen. Anschließend dekodierte Datei, Argumente, Arbeitsverzeichnis, Benutzerrolle und SHA-256 zuordnen. Mehrere gleiche Payloads sind mögliche Wiederholungen, aber ohne einzelne Belege keine automatisch gleiche Aktion. Die fehlende Vollständigkeit darf weder als 55 gleiche Skripte noch als 55 nachgewiesen harmlose Läufe dargestellt werden.

## Dieses Archiv prüfen

`node verify-audit.mjs` prüft nur lokale Dateien, Hashes und Git-Blob-Pin. Es führt keine archivierte Quelle aus. `SHA256SUMS.txt` versiegelt alle Paketdateien außer sich selbst. `.gitattributes` verhindert eine Änderung der belegten Bytes durch Zeilenenden-Normalisierung. `build-audit.mjs` dokumentiert die lokale Zusammenstellung aus den vorhandenen Workspace-Dateien.

Dieser Nachtrag verändert den Integrationskandidaten nicht und ist für einen separaten Dokumentationscommit vorgesehen. Durch den Reviewer: kein Serveraufruf, kein Git-Staging/Commit/Push.
