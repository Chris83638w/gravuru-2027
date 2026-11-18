# P1 · Schritt 1: Zeitprotokoll für die Warenkorbstrecke

Fortsetzung nach neuer direkter Beauftragung („dann antworte und mach weiter“): [Zusatzmessung 1b](2026-11-17-konfi-tempo-p1-1b.md). Die folgenden Abschlussaussagen dokumentieren den davor abgeschlossenen B1-Stand. V2/V3 und weitere Live-Aktionen bleiben zurückgestellt.

17.11.2026 · Astra (Codex) · Auftrag [#254](https://github.com/Chris83638w/gravuru-2027/issues/254), einschließlich [Zielbild-Kommentar](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6947690091).

Basis exakt `be163c5d598dfe1c680b483adee645d63a3bdc26`, Branch `dev/claude-warenkorb-v4-20261116`. Erste Instrumentierung `2d133af0ca0f7a7ef71fd9a1a3e010ffd3f81bed`, B1-Ergänzung `7054b89e5fbfb87995d95a11cb6e87d75cfd163d`, eigener P1-Branch `dev/astra-konfi-tempo-p1-20261117`, [PR #255](https://github.com/Chris83638w/gravuru-2027/pull/255). B1 ist von Claude abgenommen. Den Diagnose-Stand `9af3a1ac` hat Claude laut seinem Protokoll nach separatem „Live“ von Chris eingespielt; Astra hat keinen Live-Eingriff vorgenommen. Aktueller direkter Auftrag: B1 abschließen, V2/V3 zurückgestellt, keine weitere Live-Aktion. Die ursprünglichen lokalen Messnachweise unten bleiben als solche erhalten.

## Abschluss nach direkter Abstimmung mit Claude

Quellen: [B1-Nachprüfung](https://github.com/Chris83638w/gravuru-2027/pull/255#pullrequestreview-5938822210), [Claudes Live-Protokoll](https://github.com/Chris83638w/gravuru-2027/pull/255#issuecomment-6949439224) und [abschließende Klärungen](https://github.com/Chris83638w/gravuru-2027/pull/255#issuecomment-6949834349). Letzteres präzisiert und korrigiert die erste Live-Auswertung.

- **B1 abgeschlossen, kein Codefehler offen:** Claude bestätigt plausible Werte für alle vier Anfragen und den Hintergrundlauf, passende `parentTraceId` und Diagnoseköpfe auch über den Shopify-App-Proxy. Sein unabhängiger Lauf ergab 88/90 Tests; die beiden Fehler der Druckprüfung treten in seiner Umgebung identisch auf der unveränderten Basis auf. Lokal waren 90/90 grün. Diese Abschlussrunde ändert ausschließlich Dokumentation; keine Tests erneut ausgeführt.
- **B3 erledigt:** Die ursprüngliche Spalte „Browser“ bezeichnet gesamte Anfragedauer, nicht TTFB. Korrigierte TTFB: 5.410 / 2.860 / 6.315 / 2.826 ms für Entwurf / Übergabe / Daten / Claim; Differenz zu `totalMs`: 711 / 144 / 538 / 319 ms. Ein Handy-Lauf bei 390×844, CPU ×4, ohne Netzdrosselung; 22,3 s bis zur geladenen Warenkorbseite mit Position. Keine neue Vergleichsmessung durch Astra und kein Nachweis des Unter-5-s-Ziels.
- **Auswertung begrenzt:** Verstrichene Handlerzeit und Timer-Verspätung belegen keine reine CPU-Rechenzeit. Synchrone Speicherzugriffe und Betriebssystem-/Hosting-Planung sind damit nicht voneinander getrennt. Claude hat die Aussage „Ein größerer Server allein löst es nicht“ zurückgenommen. Lokales synthetisches Profil und Live-Lauf haben unterschiedliche Hardware, Datenbestände und Shopify-Anbindung; ihr Abstand ist ein Diagnosehinweis, kein kontrollierter Vergleich zur Ursache.
- **B4 bleibt ausdrücklich offen:** Claude hat ausschließlich lesend geprüft: `/gravuru-2027-merchant/stderr.log`, am 17.11. ca. 15:45 Zypern 106.937 Bytes / 703 Zeilen, keine rotierten Kopien im Anwendungsstamm. Die Plesk-Domainrotation ist eingeschaltet, schließt laut Dialog jedoch benutzerdefinierte Protokolle aus; `stderr.log` fehlt in der Plesk-Protokollliste. Eine Rotation genau dieser Datei ist somit nicht nachgewiesen. Der Momentwert belegt weder ein dauerhaft begrenztes Wachstum noch ein gesichertes Aufbewahrungsverhalten. Keine Rotation eingerichtet, keine Datei gelöscht, keine Betriebsregel erfunden.
- **B2/Takt sind Empfehlungen, keine beschlossene Runtime-Änderung:** Claude empfiehlt, die Diagnose für spätere Vergleichsmessungen zunächst zu behalten; danach `Server-Timing` mit Abschnittsnamen und den 20-ms-Takt zu entfernen oder standardmäßig abzuschalten. Diagnose-ID könnte bleiben. Jetzt keine Änderung. Der zusätzliche Vorschlag „Schritt 1b“ (CPU-Zeiten und feinere Teilzeiten) ist nicht beauftragt und wurde nicht begonnen.

Die frühere Liste a–d ist laut Claude ein Vorschlag. Der aktuelle direkte Nutzerauftrag hält V2/V3 und weitere Live-Aktionen ausdrücklich zurück. B1 braucht keinen weiteren Code-Patch. Offene Betriebs-/Diagnoseentscheidungen werden im PR und Issue #254 festgehalten; sie werden nicht stillschweigend als neue Regeln eingebaut. Abstimmung mit Claude erfolgt direkt im Tab, ohne Chris als Nachrichtenübermittler.

## Umfang und fachliche Quellen

- Messung vor Umbau: #254, P1.1. Dieser Stand fügt ausschließlich Diagnose hinzu; kein Vorziehen oder Zusammenlegen der Warenkorbschritte.
- Oberfläche und Bedienung unverändert: #254, Chris 10.11. und Zielbild vom 17.11. Keine Dateien unter `app/workshop/ui/` oder `app/configurator/variant-m/` geändert.
- Preise, Prüfungen, Bindungen, unveränderliche Bestellstände bleiben: #254 und `AGENTS.md`. Kein neuer Preis, Grenzwert, Pflichtfeld, Freigabe- oder Sperrvertrag.
- Kein Live-Gang ohne Chris' „live“: #254. Claudes inzwischen erfolgte Freigabe-/Messdokumentation ist oben verlinkt; der aktuelle Auftrag erlaubt keinen weiteren Live-Eingriff.
- Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich; dieses Paket bearbeitet keine Designs.

Der abgeglichene Ausgangsstand enthält bereits den WebP-Upload sowie den Checkout-Bildstart beim `theme-cart`-POST (siehe STATUS 16.11., V2/V3). Das ersetzt nicht die neuen Ziele „direkt nach der Entwurfssicherung“ und „vor dem letzten Klick“. Diese weiteren Änderungen bleiben gemäß aktuellem Auftrag zurückgestellt.

## Messpunkte und Auswertung

Für `acrylic-drafts` (Erstellen und Fortschreiben), `theme-cart`, `cart/data` und `cart/claim` wird je Antwort ein JSON-Ereignis `shop_cart_timing`, Version 1, über den vorhandenen Logger geschrieben. Standard ist eine JSON-Zeile auf stderr. Die Antwort liefert zusätzlich `Server-Timing` und `X-Gravuru-Timing-Id`; die ID entspricht `traceId` im Log. Es sind keine neuen Browserprogramme oder Anfrageköpfe nötig.

| Bereich | Messpunkte |
| --- | --- |
| Alle vier Anfragen | Gesamtzeit bis vor Log-/Antwortausgabe, Sitzungs-/Bindungsprüfung, Antwort-Serialisierung, Antwortbytes |
| Entwurf sichern | Body lesen und JSON parsen, Produkt lesen, Modell bilden, Gestaltungs-/Preisprüfung, feste Quellen, Foto-/Logo-Prüfung, WebP/PNG-Kundenvorschau, Referenzvorschau, ZIPs, Datenbank-Sicherung |
| Warenkorbübergabe | Entwurf/Prüfstand lesen, Variantenkandidaten und Registry prüfen, Angebot prüfen/erstellen, Prüfstandpaket lesen/verifizieren, Warenkorbrevision zuordnen, Bildadresse bilden |
| `cart/data` | Proxyprüfung, obige Vorbereitung, Restwartezeit auf Checkout-Bild, erneute Prüfung nach dem Warten |
| `cart/claim` | Proxyprüfung, obige Vorbereitung, Claim mit erneuter Prüfung |
| Hintergrundbild | Eigener Datensatz `route: checkout-image`: Zugangstoken, Shopify-Dateisuche, Dateianlage, Poll-Pausen und Poll-Anfragen |

Die Hintergrundarbeit hat eine eigene `traceId` und `parentTraceId` zur auslösenden Anfrage. Fertiger Bildcache und Wiederverwendung eines laufenden Auftrags werden als Zähler erfasst. Ein beim `theme-cart` gestarteter Auftrag wird auch nach dessen Antwort weiter gemessen. Die folgende `cart/data`-Antwort zeigt nur ihre tatsächlich verbleibende Wartezeit.

`totalMs` und `durationMs` sind monotone Laufzeiten in Millisekunden; `startedAt` ist UTC. `calls` und `failures` zählen Aufrufe und Ausnahmen je Abschnitt. Die gleiche Abschnittsbezeichnung wird innerhalb einer Anfrage zusammengezählt, z. B. zwei Sitzungsprüfungen. **Verschachtelte Abschnitte nicht addieren:** `review_prepare` enthält unter anderem Bildprüfung und ZIP; `cart_prepare` enthält `bound_offer` und `review_package`. Auch Hintergrundlaufzeit und `checkout_image_wait` überlappen. Status 0 bezeichnet einen beendeten Handler ohne JSON-Antwort, etwa einen Verbindungsabbruch; er ist kein gesendeter HTTP-Status.

`request_bytes` zählt tatsächlich gelesene Bodybytes, nicht HTTP-/TLS-Overhead. `response_bytes` zählt die JSON-Antwort ohne Kopfzeilen. Bei Ablehnung vor dem Einlesen gibt es keinen Bodyzähler. Fehlerantworten werden ebenfalls gemessen. Ausnahmen oder abgewiesene Promises des Loggers ändern die Warenkorbfunktion nicht.

Keine URLs, Querystrings, Sitzungs-/Entwurfstoken, Kunden-/Produkt-/Entwurfs-IDs, Texte, Bildinhalte oder Fehlermeldungen im Diagnoseereignis. Die zufällige Diagnose-ID gewährt keinen Zugriff auf den Entwurf. Bestehende private Antwort-/Cache-Regeln bleiben erhalten. Es wird kein `Timing-Allow-Origin` ergänzt. Claude hat die Weitergabe der Diagnoseköpfe über den Shopify-App-Proxy inzwischen bestätigt; das Serverlog enthält zusätzlich die Prozesswerte.

Die Messung beginnt am Eintritt in den Node-Handler. Vorgelagerte Hosting-/Proxy-Warteschlangen, Netzwerk, Browser-Rendering, `/cart/add.js` und die anschließende Warenkorbprüfung sind nicht Teil von `totalMs`. Große TTFB bei kleiner Handlerzeit ist deshalb ein Befund zur weiteren Untersuchung, kein Beleg für einen benötigten größeren Server. Implementiert mit den [Node-Performance-APIs](https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html).

## B1: Blockade des Server-Prozesses mitmessen

Quelle: [Claudes Review, B1](https://github.com/Chris83638w/gravuru-2027/pull/255#pullrequestreview-5938495438), anschließend Chris' Auftrag „B1 ergänzen … V2/V3 noch nicht beginnen“. Ergänzt in `app/workshop/shop-cart-event-loop.mjs`, über `shop-cart-timing.mjs` für alle vier Anfragen sowie den zugeordneten Hintergrundlauf eingebunden. Keine weitere Änderung an deren Ablauf.

Jeder Logdatensatz enthält zusätzlich `eventLoop` mit ausschließlich Zahlen:

| Feld | Bedeutung |
| --- | --- |
| `resolutionMs` | 20 ms Takt des gemeinsamen Prozess-Timers; reine Messauflösung, keine Kapazitäts- oder Geschäftsregel |
| `beforeHandler` | Kürzlich beobachtete Verzögerungen vor Eintritt in diesen Handler: Timerbeobachtungen der letzten maximal 1.000 ms, zusätzlich ein bereits überfälliger Timer |
| `duringHandler` | Verzögerungen während dieser Anfrage, einschließlich eines noch ausstehenden Timeraufrufs unmittelbar vor Log/Antwort |
| `windowMs` | Beobachtungsfenster vor dem Handler bzw. tatsächliche Dauer seiner Beobachtung, in ms |
| `samples`, `maxMs`, `p99Ms` | Anzahl, Maximum und 99. Perzentil der Verzögerungswerte, in ms; bei `samples: 0` sind die beiden Nullen Platzhalter, **kein Nachweis einer blockierungsfreien Anfrage** |

Ein einzelner `unref()`-Timer läuft ab Modulimport unabhängig von Anfragen. Gemessen wird mit monotoner Uhr die Verspätung gegenüber dem nächsten erwarteten Timeraufruf; ein natives `createHistogram()` berechnet Maximum und p99. Die im Review beispielhaft genannte neue `monitorEventLoopDelay()`-Instanz je Handler allein kann eine Blockade vor der ersten bzw. nach der letzten Timerprobe verpassen, wenn der Handler sofort danach antwortet. Deshalb verwendet diese Implementierung den gemeinsamen Herzschlag und berücksichtigt auch das noch nicht abgeschlossene Intervall direkt beim Start/Ende, ohne für die Messung zu warten. Historie auf 64 Einträge begrenzt, laufende Anfragen mit getrennten Histogrammen; Abschluss entfernt die Anfrage auch bei Fehler/Abbruch. Der Timer hält den Prozess nicht offen.

**Auswertung:** Es ist ein Prozesssignal, keine exklusiv dieser Anfrage zuzuordnende CPU-Zeit und keine Rekonstruktion ihrer Wartezeit vor dem Handler. Parallel laufende Arbeit oder die Betriebssystemplanung können dieselbe Verzögerung in mehreren Anfragen sichtbar machen. Das Vorher-Fenster sammelt Beobachtungszeitpunkte; ein darin beobachteter langer Stillstand kann schon vor diesem Fenster begonnen haben. Der erste Messpunkt folgt der Taktauflösung, kurze Blockaden können darin aufgehen. Maximum und p99 nicht zu `totalMs` oder untereinander addieren. Die neuen Werte stehen ausschließlich im Serverlog; vorhandene HTTP-Diagnoseköpfe bleiben unverändert. B2 (dauerhafte Header) und B4 (Logrotation) bleiben wie im Review offen, ohne neue Regeln daraus abzuleiten.

Gezielte B1-Prüfung: sechs neue Tests für fehlende Proben, Blockade vor Handlerbeginn, erste/letzte synchrone Blockade, überlappende Anfragen, abgelaufene Historie und echtes Perzentil. Ein Test erzeugt zusätzlich 90 ms echte synchrone Prozessblockade und verlangt deren Erfassung im selben Antwortlog. Bestehende Fehler-/Abbruch- und Hintergrundtests prüfen ebenfalls die neuen numerischen Felder. Insgesamt **90/90 gezielte Tests bestanden**; Build unverändert `editor-53e0cbea74e77305.mjs` (76 Ressourcen, 1 Modell, 162 Module, 16 Styles).

Zusätzlicher B1-Vergleich: unveränderter Runner und exakt das unten beschriebene lokale Profil, nacheinander `c8043835` (vor B1) und `7054b89e` (mit B1), je 1 Aufwärm- und 7 Messläufe. Beide Seiten schreiben die Diagnosezeilen synchron in eine temporäre Datei; dieser Aufwand liegt im gemessenen HTTP-Weg. Rohdaten: [vor B1](../measurements/2026-11-17-konfi-tempo-p1-b1/before.json), [mit B1](../measurements/2026-11-17-konfi-tempo-p1-b1/after.json).

| Anfrage | Vor B1 Median (Min–Max), ms | Mit B1 Median (Min–Max), ms |
| --- | ---: | ---: |
| `acrylic-drafts` | 853,33 (848,70–870,99) | 858,57 (835,50–878,01) |
| `theme-cart` | 6,95 (6,65–7,64) | 7,29 (6,66–8,47) |
| `cart/data` | 258,58 (245,26–274,48) | 259,08 (248,10–264,22) |
| `cart/claim` | 7,12 (6,67–7,49) | 7,40 (6,94–7,63) |

Median-Differenzen +5,24 / +0,34 / +0,50 / +0,28 ms, innerhalb der beobachteten Streuung; keine präzise Abschätzung des Live-Aufwands. Im ersten gemessenen B1-Entwurf beträgt das Maximum während des Handlers 17,37 ms bei 29 Proben. Das ist ein lokaler Beispielwert, keine Aussage zur Ursache der Live-TTFB. Claudes spätere Server-/Browsermessung steht im Abschlussabschnitt; unter 5 s am Handy weiterhin nicht belegt.

## Vorher/Nachher im gleichen lokalen Profil

Runner: `scripts/measure-shop-cart-timing.mjs`. Beide Seiten liefen auf demselben Windows-Rechner, Node 24.22.1, Intel Core Ultra 5 235, Python-Bildbibliotheken aus derselben Umgebung. Je ein Aufwärmlauf und sieben Messläufe, eine Sitzung gleichzeitig, Loopback ohne Drosselung. Echtes mitgeliefertes natives Acrylmodell, echte In-Memory-Werkstatt und Entwurfspakete, synthetisches 40×60-Foto/PNG plus WebP-Kundenvorschau. Shopify-Transport vollständig simuliert: Dateisuche 60 ms, Anlage 100 ms, Pollpause 25 ms, Pollantwort 40 ms. Keine echten Shopify-Zugriffe, Produkte oder Bestellungen.

| Anfrage | Vorher Median (Min–Max), ms | Nachher Median (Min–Max), ms |
| --- | ---: | ---: |
| `acrylic-drafts` | 848,63 (835,19–861,77) | 839,88 (828,62–851,65) |
| `theme-cart` | 6,44 (6,11–7,48) | 6,58 (6,49–7,12) |
| `cart/data` | 261,96 (250,05–278,85) | 257,64 (249,19–271,92) |
| `cart/claim` | 6,80 (6,65–7,02) | 6,52 (6,38–6,93) |

Das ist eine Kontrolle des Diagnoseaufwands, **kein Geschwindigkeitsgewinn durch V2/V3 und keine Handy-Abnahme**. Die Differenzen liegen innerhalb der beobachteten Streuung. Ausgangsstand `be163c5d`, Nachher-Code `2d133af0`. Vollständige Einzelwerte, Zeiten und Profil: [vorher](../measurements/2026-11-17-konfi-tempo-p1/before.json), [nachher](../measurements/2026-11-17-konfi-tempo-p1/after.json).

Beispiel aus Nachher-Lauf 4: Entwurf 847,57 ms Serverzeit, davon Prüfstandvorbereitung 843,18 ms; Originalfoto 254,80 ms, Kundenvorschau 305,70 ms, Referenzvorschau 253,19 ms. Das identifiziert die Bildverarbeitung in diesem kleinen lokalen Muster, nicht die Ursache der im Issue gemessenen Live-6,1 s. `cart/data` desselben Laufs: 260,41 ms, davon 251,91 ms Restwartezeit auf das bewusst verzögerte synthetische Shopify-Bild. Damit ist nachgewiesen, dass die Messpunkte die Verzögerung dem richtigen Abschnitt zuordnen.

Reproduktion mit Node 24 und den vorhandenen Python-Bildabhängigkeiten (`GRAVURU_PYTHON` auf die passende Python-Umgebung setzen):

```sh
node scripts/measure-shop-cart-timing.mjs <Checkout-von-be163c5d> 7
node scripts/measure-shop-cart-timing.mjs <Checkout-von-2d133af0> 7
```

Die Ausgaben enthalten ausschließlich synthetische Messdaten. Der Runner benutzt die gleiche Quelle für beide Checkouts und prüft erfolgreiche Sicherung/Übergabe/Claim, Preis und gehostete Vorschau. Der erste Aufwärmlauf wird aus `samples` ausgeschlossen; `backgroundEvents` enthält ausdrücklich auch dessen Hintergrundereignis.

## Prüfungen

- Unveränderte Basis: 30/30 Tests in `theme-cart-flow`, `shopify-checkout-image`, `theme-cart-version-skew`, `theme-cart-client`.
- Nachher: 63/63 in diesen Suiten plus `shop-cart-timing`, `shop-entry-flow`, `shop-entry-client`, `cart-edit-revision`.
- Zusätzlich 21/21 in `acrylic-review`, `bound-test-cart`, `checkout-design-image`: unter anderem alle 28 Acrylpreise, feste Revisionen/Originale, Bearbeiten, ungültige Bindungen und Mengen, erhaltene Preisprüfungen.
- Neue Diagnoseprüfungen: getrennte gleichzeitige Anfragen/Hintergrundarbeit, Cache und Pending-Wiederverwendung, Fehlerzeiten, keine privaten Werte, unveränderte Fehlerobjekte und Ausfallsicherheit des Loggers; richtige Header und Bytezahlen auf den echten lokalen HTTP-Routen.
- `node app/configurator/variant-m/build.mjs`: erfolgreich, 76 Ressourcen, 1 Modell, Editor-Bündel 162 Module/16 Styles.
- `git diff --check`: erfolgreich. Keine neue Gesamt-Suite oder echte Shop-Browserabnahme behauptet.

## Genau nächster Schritt / offene Grenzen

Claude hat B1 einschließlich der Daten aus seinem echten Messlauf abgeschlossen; aktueller Stand und offene Diagnose-/Betriebspunkte stehen im Abschlussabschnitt oben. Die bestehende Live-Laufzeit bleibt unangetastet. Keine zusätzliche Instrumentierung oder Optimierung in diesem Auftrag. Roh-HARs mit Sitzungstoken oder Kundendaten nicht ins Repository übernehmen.

Für Vorher/Nachher dasselbe Produkt, dieselbe Gestaltung/Menge, gleicher Browser, kalte/warme Zustände und exakt gleiche Netz-/CPU-Einstellungen verwenden. Die zwei bisherigen Profile auseinanderhalten: Issue #254 verwendete 390×844, CPU ×4, **keine** Netzdrosselung; der Vorschlag vom 16.11. verwendete zusätzlich 150 ms/1,6 Mbit/s Down/750 kbit/s Up. Desktop separat. Je Profil den ganzen Weg Produktseite → Konfi → Galerie → Designwechsel → Warenkorb erfassen und ab „Jetzt in den Warenkorb“ bis zur bestätigten Position messen, nicht nur bis zur HTTP-200-Antwort.

Nächster Schritt außerhalb des abgeschlossenen B1-Auftrags: Entscheidung über den vorgeschlagenen weiteren Diagnoseschritt sowie über dauerhaften Diagnosebetrieb und Logrotation. V2/V3 werden gemäß aktuellem Auftrag noch nicht begonnen. Unter 5 s am Handy ist noch nicht belegt. Servergröße, neue Kapazitätswerte und WebP-Qualität werden hier nicht festgelegt. P2/P3 haben weiterhin eigene spätere Branches/PRs; P4 ist nicht beauftragt.
