# Excel-Prüfbericht und Fehlerkorrektur

Stand: 06.10.2026, 18:33 UTC. Bestehende Cloud-Aufgabe, Checkout `/workspace/gravuru-completion-pass-20261006`. Repository `Chris83638w/gravuru-2027`, Branch `task/batch-correction-20261006`; bestätigte Remote-Basis `4976bee6fa1785d23f8476c4bcb2b30b3261c0a3`. Kein Wechsel auf main, keine neue Umgebung, kein Laptopzugriff.

## Ergebnis und Bedienung

In der vorhandenen Werkstatt unter **Produktserien** nach „Tabelle und Designs prüfen“:

- **Prüfbericht als Excel** enthält alle eingereichten Produktzeilen, Designzuordnungen und den aktuell erneut geprüften Status jedes Datensatzes.
- **Nur Fehler zur Korrektur herunterladen** enthält im Blatt `Produkte` ausschließlich fehlerhafte Datensätze. Das Blatt `Designs` erhält sämtliche zugehörigen Designzeilen. Erfolgreiche Nachbarprodukte fehlen im Korrekturblatt, stehen aber weiterhin im vollständigen `Pruefbericht`.
- `source_record` bezeichnet den ursprünglichen Datensatz. `correction_excel_row` nennt dessen Zeile im Blatt `Produkte` dieser Datei; leer bedeutet, dass er nicht in der Korrektur enthalten ist.
- Datei korrigieren und erneut auswählen. Zugehörige PDF-/SVG-Dateien zusätzlich auswählen; sie sind nicht im Excel enthalten. Erneute Prüfung und ausdrückliche Übernahme bleiben erforderlich.
- Bericht und Korrektur bleiben nach einer erfolgreichen Teilübernahme verfügbar, solange der Tab geöffnet ist. Vor Schließen herunterladen. Keine privaten Browserdaten werden in Git oder ein öffentliches Paket kopiert.

Der Server erstellt den Bericht aus `planBatch`, nicht aus vom Browser behaupteten Erfolgs-/Fehlerlisten. Der aktuelle Status kann deshalb von einer älteren Tabellenansicht abweichen. Der Export schreibt keine Produkte. Bestehende Importschlüssel bleiben erhalten; neue Änderungen an bereits importierten Produkten benötigen weiterhin ausdrücklich `action=update`, Produkt-ID, erwartete Revision und einen neuen Importschlüssel. Konflikte werden nicht automatisch aufgelöst.

Die gewählten Master-ID/-Revision werden in die Korrekturzeilen übernommen. Spätere Änderungen an einem Master ändern den beabsichtigten Import nicht. Ungültige explizite Angaben bleiben sichtbar zur Korrektur erhalten. Formeln werden nicht erzeugt: Benutzertexte, auch mit `=`, `+` oder `@`, sind literal gespeicherte Excel-Texte. Numerische Datumsfehler bleiben numerisch und müssen bewusst korrigiert werden. Nicht darstellbare/zu lange Zellwerte werden ausdrücklich abgelehnt statt abgeschnitten.

Private Designvorschaubilder in der Serienansicht verwenden denselben authentifizierten Medienlader wie die übrigen Händleransichten; keine anonymen API-Bildabrufe im eingebetteten Modus.

## Tatsächlich ausgeführte Prüfung

15 unterschiedliche gezielte Tests bestanden, keine offenen Fehler oder Skips:

1. `node --test --test-isolation=none app/workshop/batch-report.test.mjs app/workshop/batch.test.mjs` — 13 bestanden. Echte temporäre SQLite-Datenbanken und XLSX-Dateien; 100 Zeilen/97 erfolgreich/3 Fehler, Neustart, Korrektur, Wiederholung, atomarer Rollback, vorhandene Updates, Datumsfehler, Masterversion, Excel-Formelvermeidung und Konfliktschutz.
2. `node --test --test-isolation=none --test-name-pattern='correction workbook retains' app/workshop/form-batch.test.mjs` — 1 bestanden. Echte SVG-Designquelle, vollständige betroffene Kindzeilen, erfolgreiche Geschwister ausgeschlossen, Korrektur importiert drei Designs einschließlich Standardauswahl korrekt.
3. Test `batch correction download requires merchant session, CSRF and trusted origin and changes no products` in `shopify-admin-host.test.mjs` — 1 bestanden im gezielten HTTP-Lauf. Echte Handler im Prozess mit synthetischen signierten Händler-Sitzungen: fehlende Anmeldung, falscher CSRF, fremder Origin und Host abgewiesen; berechtigter XLSX-Download mit `private, no-store`; Datenbestand unverändert.
4. Nach ergänzter Zellprüfung zwei betroffene Validierungstests erneut bestanden; nicht zusätzlich als neue Tests gezählt.
5. `npm run build` — 76 Ressourcen, 1 Modell, Editor 461440 Bytes. JS-Syntaxprüfungen, Python-Kompilierung und `git diff --check` bestanden.

Die ersten XLSX-Lesetests scheiterten an synchroner Python-Prozesskommunikation dieser Runtime (`spawnSync EPERM`; ein früherer stdin-Aufruf hing). Die neuen Testleser verwenden nun einen asynchronen Python-Aufruf auf eine temporäre Datei und prüfen deren tatsächlichen Inhalt mit openpyxl. Keine Fehler wurden durch geänderte Sollwerte übergangen. Der produktive XLSX-Exporter verwendete bereits asynchrone Prozesse.

## Grenzen des ersten Teilschritts (vor gespeicherter Wiederaufnahme)

Keine Installation, kein Restore, keine privaten Bestandsdaten, keine Server-/Shopify-Mutation, kein Merge oder Deployment. Tests mit synthetischen Produktdaten sind keine reale Browser-/Produktionsabnahme. Die bestehende veröffentlichte Vorschau ist durch diesen GitHub-Commit nicht aktualisiert.

Noch keine dauerhaft gespeicherte Importauftrag-Historie: Diese Korrekturdatei erlaubt die Wiederaufnahme durch erneuten Upload. Automatischer Dateiabruf, Fortschritt über Geräte hinweg und ein dauerhaft gemeinsamer privater Datenbestand bleiben getrennte Aufgaben. Nächster sinnvoller Dashboard-Schritt ist ein privater Importauftrag mit nachvollziehbarem Status und frischer Prüfung nach Wiederaufnahme; keine automatische Anwendung eines veralteten Prüfplans.


## Wiederaufnahme im Dashboard: zweiter Teilschritt

06.10.2026; Branch `task/batch-resume-20261006`, bestätigte GitHub-Basis `336c9d74ff2d580e0670bce559eaa6449bcd4e0b` (Excel-Bericht und Korrektur). Die oben dokumentierte fehlende gespeicherte Wiederaufnahme ist mit diesem zweiten Teilschritt im Code umgesetzt.

Nach der Tabellenprüfung einen Namen vergeben und **Prüfung privat speichern** wählen. Unter **Gespeicherte Importprüfungen** lässt sich diese Serie später mit **Öffnen und erneut prüfen** laden. Tabelle und bereits importierte Designquellen müssen nicht erneut vom Laptop ausgewählt werden. Alle Produktzeilen werden frisch geprüft; Anwendung bleibt ausdrücklich erforderlich. Fehler können weiterhin als Excel-Korrekturdatei heruntergeladen werden.

### Speicherung und Konfliktschutz

- Unveränderliche Eingabestände in der neuen Tabelle `batch_jobs` innerhalb derselben privaten `workshop.sqlite`. Keine vierte Datenbank, keine Speicherung in Git, keine Originalbilder als eingebetteter Jobinhalt. Designverweise zeigen auf die vorhandene private Assetablage.
- Master-ID/-Version werden pro Zeile festgehalten. Produkt-ID, erwartete Revision und Importschlüssel bleiben bestehen. Keine gespeicherten Sitzungstokens, Prüfpläne oder abgeleiteten Produktdokumente.
- Fortschritt wird bei Wiederaufnahme aus dem vorhandenen transaktionalen Importjournal ermittelt. Es gibt keinen zweiten, möglicherweise veralteten Erfolgszähler. Auch nach erfolgreicher Datenbankübernahme mit verlorener Browserantwort werden keine Produkte doppelt angelegt.
- Derselbe Eingabestand wird beim Speichern wiedererkannt. Geänderte Eingaben erzeugen einen neuen Stand; alte werden nicht überschrieben. Bis zu 100 gespeicherte Prüfungen, jeweils höchstens 2 MB. Bei Erreichen der Grenze erscheint eine klare Meldung; keine automatische Löschung.
- **Gespeicherte Prüfung entfernen** verlangt eine Bestätigung und löscht nur den Eingabestand. Produkte, Originaldesigns und Importjournal bleiben bestehen.
- Auflistung enthält nur Namen, Zeitpunkt und Zeilenanzahl; Eingaben werden erst beim Öffnen an den angemeldeten Händler geliefert. Alle API-Zugriffe nutzen den bestehenden Händlerschutz, Schreibaktionen zusätzlich CSRF und Originprüfung.
- Korrigieren erfolgt weiterhin in Excel; keine neue konkurrierende Tabellen-/Preislogik im Dashboard. Eine geänderte Produktrevision wird als Konflikt gemeldet, nicht automatisch übernommen.

### Prüfung des zweiten Teilschritts

34 unterschiedliche gezielte Tests bestanden, keine offenen Fehler/Skips:

- `node --test --test-isolation=none app/workshop/batch-jobs.test.mjs` — 5 bestanden. Neustart und Teilübernahme, neue Masterversion, verlorene Browserantwort, Wiederholung, Revisionskonflikt, zwei Datenbankverbindungen, unveränderliche Stände, sichere Entfernung, Größen-/Anzahlgrenze und SQLite-Integrität.
- `node --test --test-isolation=none --test-name-pattern='saved form import|saved import checks' app/workshop/form-batch.test.mjs app/workshop/shopify-admin-host.test.mjs` — 2 bestanden. Reale SVG-Designquelle nach Neustart verfügbar; Händlerzugriff und Entfernung im HTTP-Handler geprüft.
- `node --test --test-isolation=none app/workshop/shopify-admin-host.test.mjs app/workshop/shopify-runtime-config.test.mjs` — 28 bestanden. Enthält den gerade genannten HTTP-Test erneut; deshalb insgesamt 34 statt 35 unterschiedliche Tests. Anlass für den Regressionstest war die zusätzliche Datenbankverbindung im Workshop-Lebenszyklus.
- `npm run build` — 76 Ressourcen, 1 Modell, Editor 461440 Bytes. JS-Syntax und `git diff --check` bestanden.

Ein erster Test verwendete versehentlich einen kleinen Acrylpreis oberhalb des Großpreises und wurde korrekt von der bestehenden Fachvalidierung abgewiesen. Der Test verwendet nun einen zulässigen geänderten Masterpreis; die Produktionsvalidierung blieb unverändert.

Keine privaten Bestandsdaten geöffnet, kein Restore, keine Liveänderung. Tests fanden mit temporären synthetischen Daten statt. Noch keine tatsächliche Browserabnahme und keine Aktualisierung der veröffentlichten Vorschau. Nächster Abnahmeschritt ist die sichtbare Bedienprüfung der gespeicherten Serie in einer ausführbaren geschützten Vorschau.

Die neue Speichermöglichkeit ist appseitige Persistenz in derselben privaten Datenbank. Sie garantiert weder dauerhafte Cloud-VM-Verfügbarkeit noch eine gemeinsame Ablage zwischen Konten. Zugriff von einem anderen Gerät setzt denselben App-Datenbestand und die passende Händleranmeldung voraus.


## Ausfuehrungsgruppen: Excel und Wiederaufnahme

Stand 06.10.2026, 19:09 UTC. Branch `task/variant-import-resume-20261006`, bestätigte Remote-Basis `2828939c24f83115e56392f312e89b87fc7ebec8`. Bestehende Cloud-Laufzeit und bestehender Checkout; keine neue Umgebung, kein Laptopzugriff.

### Bedienung

In **Ausführungen aus Excel** gibt es nun dieselben Arbeitsschritte wie in Produktserien:

1. Tabelle prüfen, Namen vergeben und **Prüfung privat speichern**.
2. Unter **Gespeicherte Ausführungsprüfungen** später **Öffnen und erneut prüfen** wählen. Eine gespeicherte Prüfung führt keine Gruppenanlage automatisch aus.
3. **Prüfbericht als Excel** enthält alle eingereichten Gruppen samt Varianten und einen frisch ermittelten Bericht. **Nur fehlerhafte Gruppen herunterladen** enthält ausschließlich offene Fehler, jeweils mit sämtlichen zugehörigen Variantenzeilen.
4. Korrektur in den Blättern `Gruppen` und `Varianten` vornehmen, Datei erneut prüfen und ausdrücklich anwenden. Erfolgreiche Gruppen bleiben erhalten.
5. Eine gespeicherte Prüfung kann nach Bestätigung entfernt werden. Gruppen, Produkte, Designs und Importhistorie werden dadurch nicht gelöscht.

`Pruefbericht` und `Anleitung` gehören zur XLSX-Datei. Der Bericht nennt ursprünglichen Datensatz, Zeile der Korrekturdatei, Importschlüssel, Status, Fehler und vorhandene Gruppen-ID/erwartete Revision. Literal gespeicherte Namen und Variantenbezeichnungen werden nicht als Excel-Formeln interpretiert.

### Umsetzung und Schutz

`variant-batch-report.mjs` nutzt den vorhandenen Variantenplaner und die bestehenden Excel-Spaltenschemata. Keine zweite Preis-, Geometrie- oder Produktvalidierung. Alle Kindzeilen der fehlerhaften Gruppe bleiben zusammen; unbekannte Gruppenzuordnungen werden vor der Speicherung abgewiesen. `product_revision` und `expected_revision` werden nie automatisch angehoben. Neue Archivierungen und parallele Gruppenänderungen werden beim Öffnen sichtbar.

Die bisherige Speicherfunktion aus `batch-jobs.mjs` ist als `import-job-store.mjs` wiederverwendbar. Bestehende Produkttabelle `batch_jobs` und neue Gruppentabelle `variant_batch_jobs` bleiben getrennt, einschließlich getrennten Listen und Zugriff auf gespeicherte IDs. Tabellenname ist eine feste interne Allowlist, kein Requestparameter. Alte Produktspeicherstände werden nicht umgeschrieben. Je Importart bis 100 Prüfungen mit höchstens 2 MB pro Stand; gleiche Eingaben werden wiedererkannt. Unveränderliche Eingaben und Fortschritt aus dem vorhandenen Importjournal sichern die Wiederaufnahme nach verlorener Browserantwort.

Neue Händler-Endpunkte unter `/api/workshop/variants/batch/report` und `/api/workshop/variants/batch/jobs` verwenden den bestehenden Session-/Host-/Origin-/CSRF-Schutz. Excel wird mit `private, no-store` ausgeliefert. Gespeichert werden nur erlaubte Importspalten und Referenzen, keine Sitzungstokens oder Originalfotos. Die zusätzliche Tabelle befindet sich in der privaten `workshop.sqlite`; es bleibt bei denselben Datenbankdateien.

### Tatsächliche Tests

47 unterschiedliche gezielte Tests bestanden, 0 Fehler/Skips:

- `node --test --test-isolation=none app/workshop/batch-jobs.test.mjs app/workshop/batch-report.test.mjs` — 10 bestanden. Regression für vorhandene Produktserien nach Wiederverwendung der Speicher-/Excel-Funktion.
- `node --test --test-isolation=none --test-name-pattern='saved variant|variant reports preserve|variant report and saved' app/workshop/form-variants.test.mjs app/workshop/shopify-admin-host.test.mjs` — 4 bestanden. Neue Gruppenspeicherung nach Neustart, XLSX-Inhalte mit openpyxl, 100/97/3 und alle Kindzeilen, Wiederholschutz, feste Preise/Produktstände, Konflikte, neue Archivierung, Formelvermeidung, Trennung von Produktprüfungen und geschützter HTTP-Zugriff.
- `node --test --test-isolation=none --test-name-pattern='Excel group batches|100 Excel groups|Excel update merges|Excel rejects orphan|failed group member' app/workshop/form-variants.test.mjs` — 5 bestanden. Vorhandene Transaktions-, Update-, Rollback- und Zuordnungsregeln unverändert.
- `node --test --test-isolation=none app/workshop/shopify-admin-host.test.mjs app/workshop/shopify-runtime-config.test.mjs` — 29 bestanden. HTTP-Handler-/Laufzeitregression nach zusätzlicher privater Datenbankverbindung; enthält den neuen HTTP-Test erneut, daher insgesamt 47 statt 48 unterschiedliche Tests.
- `npm run build` — 76 Ressourcen, 1 Modell, Editor 461440 Bytes. Syntaxprüfungen, Python-Kompilierung, `git diff --check` und statischer Abgleich der 24 direkt referenzierten UI-Element-IDs bestanden.

Keine neue vollständige Testsuite und keine echte Browserabnahme behauptet. SQLite-/SVG-/Excel-Tests verwenden synthetische Daten; HTTP-Tests laufen mit echten Handlern im Prozess und synthetischen Sitzungen, ohne Netzwerklistener. Keine Server-, Shopify- oder Plesk-Mutation; kein Restore, Merge oder Deployment. Die veröffentlichte Vorschau wird durch die GitHub-Sicherung nicht aktualisiert. Appseitige Persistenz in derselben privaten Datenbank ist weiterhin keine Zusage dauerhaft geteilter Cloud-VM-Daten.
