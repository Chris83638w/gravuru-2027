# P1: weitere Beschleunigung und Speicher-Gegenprobe

Chris beauftragte nach dem abgeschlossenen A/V2-Messfenster die direkte Fortsetzung mit Claude Richtung unter fünf Sekunden, die Klärung des höheren Speicherverbrauchs und unveränderte Darstellung/Bedienung. **Keine neue Live-Freigabe.** Bestehender P1-Branch/PR #255, Basis weiter `be163c5d`, nicht main. [Claudes Analyse](https://github.com/Chris83638w/gravuru-2027/pull/255#issuecomment-6958911484), [Arbeitsstand in #254](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6959031439).

## Umsetzung

1. `b9fc979` (K2/K4): serverseitiger ZIP-Schreiber `review-zip.mjs`, native `node:zlib.crc32`, eine abschließende Buffer-Kopie statt Blob/ArrayBuffer-Rundreisen. Bytegleiches bisheriges ZIP-Format, vollständige Inhalte und Prüfungen. Gemeinsamer Browser-Schreiber unverändert. [Node-Dokumentation](https://nodejs.org/api/zlib.html#zlibcrc32data-value); Anwendung und Server verwenden Node 24. Logdetails für JSON-Erstellung, SHA-256, Gestaltungsprüfung, Produktauflösung und Preis ergänzen die bisherige Messung. Beide unterschiedlichen Produkt-Vollprüfungen bleiben bestehen; die Schrift-Ergänzung verhindert ein ungeprüftes Zusammenlegen.
2. `e95d879`: ausgeliefertes PNG bekommt **nach** vollständiger Archiv-/Dateiprüfung einen eigenen Buffer. Damit hält eine langsame HTTP-Auslieferung nicht das ganze Sicherungsarchiv über den PNG-Ausschnitt fest. Keine URL-, Signatur-, Preis- oder Bindungsänderung.
3. `05baae9` (K1): frische Datenbankbytes werden weiterhin gelesen und als JSON geprüft. Eine begrenzte reine Rechenhilfe merkt nur Roh-SHA-256 → kanonische SHA-256, mit `json-canonical-v1` im Schlüssel. Maximal 64 kurze Einträge je Registry-Instanz; keine Dokumente, Rohtexte oder Prüfergebnisse über Bindungen darin. Schreibpfad unverändert. Andere Bytes erhalten einen anderen Schlüssel; sämtliche aktuellen Status-/Mandanten-/Bindungsprüfungen bleiben. Die 64 sind eine interne Speicherbegrenzung dieser Rechenhilfe, keine Änderung der Kundenkapazität oder der Sicherungsplätze.
4. `a265b47`: bestehende Speicheraufnahme im Zeitlog enthält jetzt zusätzlich `heapTotal`, `external`, `arrayBuffers` in Bytes. Kein zusätzlicher Prozessaufruf, keine neuen Timer, keine Antwortheader, kein Heap-Dump. Externe Puffer enthalten ArrayBuffers bereits; nicht zusammenaddieren. Damit kann ein später freigegebener Messlauf Heap und Puffer unterscheiden. Acht betroffene Zeit-/Ressourcentests erneut grün. Keine Aktivierung auf dem Server.

K1 verwendet bewusst nicht den bereits vorhandenen revisionsbasierten Ableitungsmerker: Dessen Ausweitung würde das Lesen großer Dokumente über weitere Phasen hinweg durch Vertrauen in unveränderliche Revisionen ersetzen. Die hier geprüfte Rechenhilfe behält vollständige frische Rohbytes und JSON-Parsing auch für unbekannte/Legacy-Schemas bei; engerer Eingriff, nur die reine kanonische Rechnung entfällt bei gleichem Inhalt.

Separater bereits bestehender Server-Prüfbranch `dev/astra-konfi-p1-server-pruefstand-20261117` wurde mit exakt diesen vier Commits auf **`1c6b6df`** fortgeschrieben (`e23e6de`, `54b032e`, `cce323f`, `1c6b6df`). Kein eigener neuer PR, nur isolierter Kandidat zu #255. Keine Browserquellen gegenüber Live `9af3a1ac` verändert; gebauter Editor weiterhin **`editor-53e0cbea74e77305.mjs`, 1.402.445 Bytes** (Build auf `cce323f`; danach nur zusätzliche Logfelder). Der vollständige P1-Branch enthält den früher gebauten, weiterhin ausgeschalteten V3-Code; neue Änderungen betreffen ausschließlich den Server und Messwerkzeuge.

## Prüfungen

**153 gezielte Tests bestanden**, verteilt auf 20 Dateien: `review-zip`, `customer-design-image`, `shop-product-binding-store`, `shop-product-binding-legacy`, `shop-product-binding-gallery-memory`, `shop-product-binding-gallery-epoch`, `shop-product-binding-store.doorbell-memory`, `shop-product-binding-batch`, `acrylic-review`, `bound-test-cart`, `checkout-design-image`, `cart-edit-revision`, `theme-cart-flow`, `theme-cart-version-skew`, `theme-cart-client`, `shop-cart-timing`, `shop-cart-resources`, `shop-cart-read-phases`, `customer-read-scope`, `shop-entry-flow` (jeweils `app/workshop/*.test.mjs`). Node 24.22.1, vorhandene lokale Python-/Druckprüfumgebung.

Der erste Lauf hatte 152 bestandene Prüfungen und einen falsch vorbereiteten **neuen Testfall**: native Auswahl mit leeren Optionen. Korrigiert auf die echte erste Ausführung aus `prepareShopProduct`; anschließend alle 38 Store-Tests grün. Keine Runtime-Anpassung, um einen Test zu umgehen. Alle übrigen 115 Prüfungen unverändert bestanden. Bytevergleich für leeres ZIP/leere Datei, Unicode, Binärdaten und 2 MiB; bestehender Leser weist Korruption ab. PNG-Bytes bleiben nach Mutation des Ursprungsarchivs unverändert. Digest-Vergleich kalt/warm für Form und natives Produkt; gleiche Inhalte mit anderer JSON-Formatierung, manipulierte/ungültige Bytes nach Cachetreffer und Verdrängung nach 65 anderen Schlüsseln. Bestehende Revisions-, Preis-, Foto-/Druck-, Altclient-, Galerie-, Mandanten- und Speichertests bleiben grün.

## Gleicher lokaler Zeitvergleich

Alle Prozesse nacheinander, gleicher Rechner/Node, echte temporäre SQLite-Registry, in allen acht Reihen identisches **31.205.209-Byte-Produkt** mit acht großen synthetischen Zeichenketten (Fixture-Ziel 31.205.183 plus 26 Bytes JSON-Struktur), jeweils eine Aufwärmung und sechs Messläufe. Vier reale lokale HTTP-Anfragen, Shopify als Attrappe mit unveränderten Wartezeiten; **keine Mobil-/Shopify-Endzeit**. Alte Kontrolle `105e398`, A/V2 `b51e9d73`, neuer vollständiger P1-Kandidat `05baae9` mit V3 aus, abschließend isolierter Server-Kandidat `1c6b6df` einschließlich zusätzlicher Puffer-Logfelder. Laufzeit-Arbeitsbäume zum Messzeitpunkt sauber. Rohdaten und Profil vollständig in [Messordner](../measurements/2026-11-17-konfi-tempo-p1-speicher/), Auswertung `summary.json`.

| Median in ms | A/V2, GC | neu, GC | A/V2, natürliche Bereinigung | neu, natürliche Bereinigung |
|---|---:|---:|---:|---:|
| Sichern | 2.560,71 | 2.056,45 | 2.580,57 | 2.044,77 |
| Übergabe | 1.078,78 | 890,76 | 1.102,05 | 888,85 |
| Warenkorbdaten | 1.173,62 | 993,65 | 1.191,78 | 983,36 |
| Claim | 709,01 | 633,37 | 726,06 | 630,58 |
| **Median der vier Zeiten je Lauf addiert** | **5.525,51** | **4.584,33** | **5.600,02** | **4.553,42** |

Weitere **17,0 % / 18,7 %** Verbesserung gegenüber A/V2 in diesen beiden lokalen Vergleichen. Summen der Routenmediane sind nicht der Median der Summen. ZIP-Schritt bei natürlicher Bereinigung **443,17 → 26,98 ms**, gesamter kanonischer Digest-Abschnitt über die vier Anfragen **792,25 → 186,28 ms**; beim neuen Stand fällt dort hauptsächlich der weiterhin frische Rohhash an. Sechs Digest-Treffer je lokalem Vier-Anfragen-Lauf; Live hatte ein anderes Aufrufprofil. Diese Schritte sind in den Gesamtzeiten enthalten und nicht nochmals zu addieren. Alle Mengen/Preise/Antwortstatus im Messskript geprüft. Neue Messungen maximal 47 verschiedene Schritte, keine verworfenen Schrittaufrufe.

K4 zeigt beim neuen Stand lokal etwa 238 ms JSON-Erstellung und 45 ms Hashen innerhalb der Sicherung, Gestaltungsprüfung etwa 89 ms, Produktauflösung etwa 82 ms. Die Live-Verteilung unterscheidet sich deutlich. K3 wurde deshalb bewusst nicht anhand einer vermeintlichen Gleichheit der beiden Dokumente umgesetzt.

**Abschluss auf exakt `1c6b6df`:** zusätzliche vollständige natürliche Reihe nach den Logfeldern, gleiches Profil/6 Läufe. Routenmediane Sichern/Übergabe/Daten/Claim **2.029,63 / 884,20 / 982,44 / 623,55 ms**. Median der Summe je Lauf **4.516,45 ms**, gegenüber A/V2 **−19,3 %**. ZIP 27,06 ms, Digest-Abschnitt 184,95 ms. Neue Speicherfelder in allen 24 Antwortlogs vorhanden, 47 verschiedene Schritte maximal, keine ausgelassenen Schritte. Dieser Abschluss ist der maßgebliche aktuelle Kandidat; die vorherigen Rohreihen bleiben erhalten.

## Speicher: Befund und Grenzen

Alle Größen **MiB**. Neue Probe enthält RSS, Heap, externe Puffer und ArrayBuffers an HTTP-/Rundengrenzen sowie ab zweiter Kontrollserie zusätzlich alle 50 ms. Auswertung nach der Aufwärmung; Einrichten/Build nicht enthalten. Der Timer kann während synchroner Prozessblockaden nicht abtasten: Maxima sind **beobachtete Stichproben**, keine vollständigen Spitzenmessungen. Der Prozess-Höchstwert im Rohbeleg umfasst dagegen auch Einrichtung und Aufwärmung. Die erste A/B-Serie hatte nur Grenzproben und wird nicht mit Timer-Maxima gleichgesetzt.

| Gleiches Profil, Timer + Grenzproben | A/V2, GC | neu, GC | A/V2, natürliche Bereinigung | neu, natürliche Bereinigung |
|---|---:|---:|---:|---:|
| Größte RSS-Stichprobe nach Aufwärmung | 1.179,43 | 776,68 | 1.063,53 | 845,39 |
| RSS-Median nach 50-ms-Ruhephase | 350,63 | 265,27 | 647,09 | 558,29 |
| Heap-Median nach Ruhephase | 136,90 | 136,95 | 256,64 | 256,65 |
| Externe Puffer nach Ruhephase | 4,46 | 4,46 | 183,27 | 183,27 |

„GC“ erzwingt nach jeder Runde Speicherbereinigung und nochmals nach Ruhephase; die natürlichen Läufe tun das nicht. Daher ist deren Ruhewert **kein Nachweis über dauerhaft festgehaltene Objekte**. In beiden GC-Kontrollreihen vor/A+V2 (A/B und B/A) endet der Heap bei ungefähr 137 MiB, externe Puffer bei 4,46 MiB, ArrayBuffers bei 0,58 MiB. Kein lokaler Hinweis auf ein wachsendes zusätzliches Retentionsproblem durch A/V2. RSS-Maxima wechseln mit Probezeitpunkt und Bereinigung; aus einem einzigen höheren Live-Maximum folgt kein Leak.

Die neuen Änderungen reduzieren hier Speicherumsatz und RSS-Stichproben, bei gleichem nach GC lebenden Heap. **Keine isolierte Zuordnung aller Ersparnis zu einem einzelnen Commit.** Der synthetische Shopify-Dienst ruft die echte PNG-Quelladresse nicht ab; der Vorteil der PNG-Abtrennung ist durch Code und Besitztest belegt, nicht durch diese Zeitreihe gemessen.

Auf finalem `1c6b6df`, natürliche Bereinigung: größte RSS-Stichprobe **816,80 MiB**, Ruhemedian RSS **560,51 MiB**, Heap **256,77 MiB**, externe Puffer **183,27 MiB**. Im gleichen A/V2-Profil waren es 1.063,53 / 647,09 / 256,64 / 183,27 MiB. Keine zusätzliche dauerhaft wachsende Heap-Belegung erkennbar; keine Langzeit- oder Kapazitätsfreigabe daraus.

**Präzisierung durch lesende Bestandsprüfung:** [Claude prüfte den laufenden alten Stand](https://github.com/Chris83638w/gravuru-2027/pull/255#issuecomment-6959146374), ohne Änderungen/Neustart: ein App-Prozess, nach ungefähr 2,6 Stunden ohne protokollierten Warenkorbvorgang **925 MiB RSS**, Prozess-Höchstwert seit dem Start **2.626 MiB**. Die früheren 1.590 MiB waren nur die Untergrenze während aktiver Übergaben, kein Ruhesockel. Seit dem Neustart ist eine Kontrollübergabe protokolliert; anderer Verkehr ist damit nicht ausgeschlossen. Drei andere kleine Node-Apps und ein Python-Dienst laufen unter demselben Benutzer, der Konto-Speichergrenzwert ist nicht nachgewiesen.

Der alte Prozess erreicht also bereits eine höhere echte Spitze als die größte A/V2-Stichprobe (2.611 MiB). **Kein Beleg für Mehrverbrauch durch A/V2**, aber auch kein Beweis, dass der Umbau niemals eine höhere Spitze verursacht: Der Höchstwert des inzwischen beendeten A/V2-Prozesses fehlt. Ein Vergleich Spitze gegen Spitze ist nicht möglich. Die Formulierung „kommt nicht vom Umbau“ wäre stärker als die Daten. Aus dem Code sind begrenzte Modell-/Antwortcaches bekannt; deren tatsächliche Füllstände und der Anteil am Ruhespeicher sind nicht gemessen. Die Fixture bildet auch den jetzt belegten Live-Ruhewert von 925 MiB nicht nach.

**Weiter offen:** technische Größenverteilung des 31,2-MB-Dokuments, tatsächliche Heap-/Pufferanteile und Cachefüllstände des alten laufenden Prozesses sowie Kontolimit. Für künftige ausdrücklich freigegebene Messungen sind die fehlenden Pufferfelder lokal vorbereitet; noch keine neuen Live-Werte. Nicht als „Speicher vollständig geklärt“ bezeichnen.

## Reproduzieren und nächster Schritt

Beispiel pro Stand: `node --expose-gc scripts/measure-shop-cart-timing.mjs <worktree> 6 real-registry large-blobs memory-probe`; natürliche Reihe ohne `--expose-gc`. Auswertung: `node scripts/summarize-shop-cart-memory.mjs docs/measurements/2026-11-17-konfi-tempo-p1-speicher`. Reihenfolge in Dateinamen: `before-ab-1`, `av2-ab-1`, `av2-ba-2`, `before-ba-2`, `candidate-gc`, `av2-natural`, `candidate-natural`, `server-final-natural`. `null` für nicht vorhandene Messfelder bedeutet nicht gemessen, nicht null Aufwand. Keine Secrets oder echten Kundendaten im Beleg.

Claude prüft jetzt die vier Runtime-Commits und den Vergleich. Danach offene Reviewpunkte direkt nacharbeiten. Diese sichere Zwischenstufe allein weist **unter fünf Sekunden bis zum geladenen Warenkorb nicht nach**: letzter Live-Median weiter 18,403 s, davon 4,2–5,0 s außerhalb der vier eigenen Anfragen. Für weitere Arbeit sind frühere Vorbereitung und/oder eine kürzere Anfragekette zu prüfen; fehlende Kapazitäts-/Prioritätsregeln nicht erfinden. V3 aus, keine Änderung des selbstständigen Fertigungspakets, keine Löschung (45 Tage sind nur die bestätigte Vorgabe), keine neuen P3-Limits. Keine Live-Änderung oder Merge ohne Chris’ neue ausdrückliche Freigabe; P2/P3 bleiben getrennte Pakete.
