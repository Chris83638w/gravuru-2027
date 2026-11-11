# #230/#233: begrenzter Galerieaufbau und kompakte Lesestempel

Ausgangs-HEAD c6f9910596774f3742fa5064b5c60254d1fe00fc, letzte Runtime a038e1ae7e3de3954ea204f6925c60c7b4213d4f. Design-Master: https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md. Keine Gestaltung, fachliche Rechte, Preise oder Produktregeln neu festgelegt; Chris' bestätigte Designsuche, Schatten und Größenauswahl bleiben erhalten.

## Tatsächlicher Stand

Claude hat die von Chris freigegebene Programmumschaltung versucht und wegen wiederholter Prozessneustarts/503 auf R15 zurückgeschaltet: #2336807882892/#1686807883350. Der Rückbau der Statistik wurde automatisch abgelehnt; die Tabelle bleibt achtspaltig. Die alte App läuft, zählt Motivsuchen derzeit aber nicht. Weitere Rückbauversuche sind beendet. Keine Produktanlage oder Veröffentlichung erfolgt. Der bisherige Umschaltversuch ist keine erfolgreiche Abnahme.

## Korrektur

Genau zwei Runtime-Dateien:

- `app/workshop/shop-product-binding-store.mjs`: kundenleseseitige Vergleichsstempel speichern die SHA256 der rohen Dokument-/Metadatenbytes statt sämtliche großen JSON-Strings während der Galerieabfrage festzuhalten. Rohe Schreibstempel unter Sperre, CAS, native Dokumenthashes, Registry-/Preis-/Freigabekontrollen bleiben unverändert.
- `app/workshop/shop-design-gallery.mjs`: Fixed-Size-/All-Sizes-Produkte erzeugen keine unbenutzten globalen Bindung×Design-Karten mehr; die öffentliche Route verwendet schon den eigenen Produkt-/Revisionspfad der gewählten Größe. Registryprüfung bleibt vollständig. Interner `list(context)`-Fallback entspricht jetzt derselben aktuellen Größe; generische gemeinsame Galerien bleiben erhalten. Der einzige externe interne Aufrufer (Benchmark) übergibt nun sein vorhandenes Quellmodell.

Kein Frontend-Build erforderlich, kein erneuter Cacheformatwechsel. v3-Snapshots bleiben gültig; v2 wird wie bisher erwartet neu aufgebaut. Der Codecwechsel erklärt den ersten `invalid`, aber allein nicht die Prozessabbrüche.

## Prüfbelege und Grenzen

[Belege](../reviews/2026-11-11-gallery-runtime-memory-fix/): 41 Store-/Batch-/ReadSnapshot-Fälle bestanden; 43 Galerie-/All-Sizes-/Variantenfälle bestanden, davon ein lokaler TEMP-Fehler gezielt wiederholt und behoben. Die zwei gesonderten Benchmark-Fälle sind bereits in den 41 enthalten. Dazu drei neue Speicher-/Manipulationsfälle bestanden. Unabhängiger Review beider Runtimekorrekturen und des Messnachweises ohne offenen Befund.

Kontrollierter synthetischer Vergleich auf derselben 105345024-Byte-Datenbank: 40 Produktrevisionen mit je 2 MiB Dokument und 512 KiB Metadaten. Alter Store stoppt kontrolliert nach 24 bei 63085664 Byte zusätzlich gebundenem Heap; korrigierter Store beendet alle 40 bei maximal 183752 Byte nach GC, beide 0 SQL-Schreibvorgänge. Dies ist kein vollständiger App-/RSS-/LVE-Höchstwertbeleg. Kein Serverlauf durch Codex.

SHA256 Runtime: Binding-Store `424dc43e4eed2f864cf7d78fd043827760d8c78ef731b5186b8de8fec2a30032`; Galerie `82b2c59c97a1bea3b54ed356570e59e9a6fa134c92fff0fe3e6332696d420858`; Benchmark `f74c425e58bcfbd4d9e881873e5ea623b1cd3605f574e05ae069edf3b1df9336`.

## Nächster Schritt bei Claude

Nur in den privaten Kandidaten übernehmen, Linuxprüfungen und [Kopienmessung](../reviews/2026-11-11-gallery-runtime-memory-fix/gallery-cache-offline-measurement.md) ausführen. Genau ein Messprozess zur Zeit (`--restart-child`), readOnly-Quelle, getrennte Messcachedatei; Testsecret/Cache niemals live übernehmen. Claudes Wächter stoppt bei 1,8 GB Prozessspeicher; gesamte 4-GB-Kontogrenze und andere Prozesse mitbeachten. Kaltlauf und späterer getrennt abgeschlossener Reopen-Lauf, Quelldateihashes, Kartenzahl, RSS/Zeiten, saved/hit dokumentieren. Frischer Testcache bildet nicht den zusätzlichen alten v2-Payload ab.

Im selben angekündigten Kopienfenster Hauptkategorien (477ff23) und sechs Kleinproduktidentitäten (c6f9910) prüfen. Vor weiterem Umschalten tatsächliche App-/Galerie-Gesamtspeichernutzung und 60-Sekunden-Kundensitzung mit parallelen Abrufen ohne Prozesswechsel nachweisen. Dieser Commit aktiviert nichts. Produktzielentscheidung und konkrete Pilotfreigabe folgen erst aus den echten Kopienbefunden; vorhandene Inhaltsfreigaben werden nicht erneut abgefragt.
