# P1 · Zusatzmessung 1b: CPU, Speicher und feinere Prüfzeiten

17.11.2026 · Astra (Codex) · [PR #255](https://github.com/Chris83638w/gravuru-2027/pull/255), [Auftrag #254](https://github.com/Chris83638w/gravuru-2027/issues/254). Basis dieser Ergänzung `13c3a1e65c59522f91ad786e60afb0eb55d0b9a0`; darin Runtime identisch zum von Claude eingespielten B1-Stand `9af3a1ac`. Runtime 1b: `9f57118a1a1e54f7896162e92edb546322f957e4`; erweiterter Messrunner: `b169fcf09a3074d8ef2742ab44b7b7f159218903`.

## Auftrag und Grenzen

Chris hat auf Claudes Vorschlag 1b direkt „dann antworte und mach weiter“ geantwortet. Astra hat den Beginn hier und direkt im Claude-Tab angekündigt. [Claudes Anforderungen](https://github.com/Chris83638w/gravuru-2027/pull/255#issuecomment-6950093609) wurden einschließlich seiner anschließenden GC-Präzisierung im Tab umgesetzt. Der bestehende P1-Branch bleibt `dev/astra-konfi-tempo-p1-20261117`, Zielbranch `dev/claude-warenkorb-v4-20261116`, nicht main.

- Nur Diagnose: keine Prüfung ausgelassen, keine Wiederverwendung von Prüfergebnissen eingeführt, keine Reihenfolge geändert. Keine Oberfläche, Preise, Bindungen, Produktrevisionen oder Kapazitätsgrenzen geändert (Quelle #254 und aktueller Nutzerauftrag).
- V2/V3 sowie frühere Optimierungsvorschläge a–d bleiben zurückgestellt. 1b liefert zusätzliche Messpunkte, noch keine Ursachenfeststellung für den echten Server und keinen Optimierungsgewinn.
- Kein Merge und kein Live-Eingriff. Der bereits von Claude eingespielte B1-Stand bleibt unangetastet. Ein späterer Live-Einsatz von 1b benötigt Chris' gesondertes „live“; daraus entsteht jetzt kein Ausführungsauftrag.
- B4 bleibt offen: Rotation genau von `stderr.log` nicht nachgewiesen. Kein Rotationsmechanismus und keine neue Betriebsregel eingebaut. Neue Konstanten (25 ms GC-Nachlauf) sind ausschließlich Messdetails.
- Keine Designs bearbeitet. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich.

## Messformat Version 2

`shop_cart_timing` hat jetzt `version: 2`. Die vorhandenen Antwortköpfe enthalten ausschließlich die bisherigen Abschnittsbezeichnungen und die Zufalls-ID. **Alle neuen Detailzeiten, Zähler und Ressourcenwerte stehen nur im Serverlog.**

| Feld | Bedeutung / Einheit |
| --- | --- |
| `processCpu` am Ereignis und je Abschnitt | Prozessweite User-/Systemzeit als Differenz, `userMs` / `systemMs`; `available: 0` bei nicht lesbarer Messung |
| `steps.*.syncCalls` / `asyncCalls` | Anzahl synchron bzw. über ein Promise gemessener Aufrufe; Fehler bleiben in `failures` enthalten |
| `resourceUsage.delta` | Differenz von Kontextwechseln, `fsRead`, `fsWrite`, `majorPageFault`; `unsupported` nennt nicht unterstützte Zähler |
| `memory.before` / `after` | `rss` und `heapUsed` in Bytes; `null` bei nicht lesbarer Messung |
| `storageReads` | Anzahl, Fehler, zurückgegebene Zeilen und gesamte Zeit der **instrumentierten synchronen DB-Lesestellen**, ausdrücklich `coverage: instrumented-sync-db-reads` |
| `counts` | Unter anderem durchsuchte Bindungskandidaten, zurückgegebene Registry-/Angebots-/Prüfstandzeilen, gelesene Dokument-/Manifest-/Paketbytes und Anzahl vollständiger `resolve`-Aufrufe |
| `gc` im Hauptereignis | Observer verfügbar, Nachlieferung möglich, 25 ms Nachlauf; kein voreiliger Nullwert für GC |

CPU ist **Prozesszeit** einschließlich anderer Threads im Prozess, keine exklusive CPU-Zeit der Anfrage. Python-Kindprozesse zählen nicht dazu. Bei synchronen Abschnitten läuft kein anderes JS im selben Thread dazwischen, andere Threads und GC können trotzdem beitragen. `totalMs minus CPU` wird nicht als Wartezeit berechnet. CPU-Werte können größer als verstrichene Zeit sein. Die lokale Windows-Auflösung liefert bei kurzen Abschnitten häufig 0 bzw. Sprünge von ca. 15–16 ms; daraus keine sub-ms-CPU-Zuordnung ableiten. Unter Windows werden `majorPageFault` und beide Kontextwechselzähler als nicht unterstützt markiert, auch wenn die API dort scheinbare Werte zurückgibt. Die Betriebssystemzähler sind Indizien, keine eindeutige Trennung von Drosselung, I/O und CPU-Ursache. API-Quellen: [Node CPU](https://nodejs.org/docs/latest-v24.x/api/process.html#processcpuusagepreviousvalue), [Ressourcen](https://nodejs.org/docs/latest-v24.x/api/process.html#processresourceusage), [Speicher](https://nodejs.org/docs/latest-v24.x/api/process.html#processmemoryusage).

Feinere Abschnitte: `resolve_registry`, Entwurf, feste/aktuelle Produktrevision, Prüfstandlesen und -prüfung; Registry-Scope/Kopf, Produkt-/Bindungslesen, Revisionsbeleg, JSON, kanonische Serialisierung, Roh-/Dokumentprüfsumme; beim Claim erneute Prüfung und Ledger. Diese liegen unter `offer_resolve`, `variant_binding`, `cart_revalidate` bzw. `cart_claim`. `review_validate` erhält ebenfalls CPU- und Sync-Angaben. Wiederholte gleiche Namen werden innerhalb eines Ereignisses summiert; `calls` macht die Wiederholung sichtbar. **Verschachtelte Zeiten/CPU-Werte nicht addieren.**

`storageReads` ist keine vollständige SQL-/Dateisystemüberwachung. Es deckt gezielt Produkt-/Revisions-/Registry-, Entwurfs-/Prüfstand-, Angebots-/Preis- und Claim-Lesestellen ab. Beispielsweise Schema-Prüfungen, Transaktionsbefehle und Schreibzugriffe sind nicht vollständig darin gezählt; die äußeren Abschnitte enthalten deren Zeit weiter. `rows` bedeutet an JS zurückgegebene Zeilen, keine angenommene Anzahl intern gescannter SQLite-Seiten. `binding_candidates_examined` zählt dagegen die tatsächlich in JS gefilterte Liste. Mehrfache Reads zählen ihre Bytes erneut. Keine zusätzliche COUNT-Abfrage, kein erneutes Serialisieren eines Dokuments für Telemetrie; gezählt werden vorhandene Werte.

## Nachgelieferte GC-Daten

Ein gemeinsamer [PerformanceObserver](https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html#class-performanceobserver) beobachtet den aktuellen V8-Isolate. Node liefert GC-Einträge zeitversetzt: unmittelbar nach erzwungenem GC ist `takeRecords()` noch leer. Die HTTP-Antwort wartet deshalb nicht darauf.

Ein einzelner `unref()`-Timer mit 25 ms Nachlauf sammelt ausstehende Einträge und entfernt das Messfenster anschließend. **Nur bei mindestens einem überlappenden Eintrag** wird `shop_cart_gc`, Version 2, geschrieben: dieselbe `traceId`/Route, ggf. `parentTraceId`, ursprüngliche monotone `windowStartMs` / `windowEndMs` / `windowMs`, `count`, `pauseMs`, `delivery: deferred-observed`, `isolate: current`. Die Dauer jedes Eintrags wird auf die Überschneidung mit dem ursprünglichen Anfragefenster begrenzt; GC nach der Antwort wird nicht diesem Fenster zugerechnet.

Die Nachlaufzeit verlängert weder Handler noch Kundenantwort. Bei blockiertem Event-Loop kann der Timer später ausgeführt werden, das gemessene Fenster bleibt trotzdem geschlossen. Prozessende oder außergewöhnlich späte Zustellung können die Nachlieferung verhindern; ein fehlendes Zusatzereignis bedeutet **unbekannt, nicht nachweislich null GC**. Die Summe beschreibt beobachtete GC-Eintragsdauern, keine exklusive Anfrage-/CPU-Zeit. Worker-Isolates sind nicht enthalten. Kein Timer hält den Prozess offen. Loggerfehler werden auch bei der Nachlieferung abgefangen.

## Prüfungen

**159/159 gezielte Tests grün**, Node 24.22.1 / Windows und dieselben Python-Bildbibliotheken wie zuvor. Die ursprünglichen zwölf Warenkorb-/B1-Dateien plus `shop-cart-resources`, `shop-product-binding-store`, `repository`, `acrylic-draft-store`, `form-customer-store`, `cart-configuration`.

- CPU-Einheiten, nicht unterstützte OS-Werte, fehlende APIs, synchrone/async Fehler, identische Rückgaben/Fehlerobjekte und private Werte.
- Echter 90-ms-CPU-Abschnitt und erzwungener GC in separatem Node-Prozess; sofortige Hauptantwort, spätere eindeutige GC-Nachlieferung, überlappender Hintergrundlauf, ursprüngliche Fenster und kein späterer Nachtrag nach Abschluss.
- Echte SQLite-Registry mit unveränderten Bindungsergebnissen/Zeilenzahlen; Reads, Parsing und Hashing sichtbar, Fehlpfad weiterhin abgewiesen, keine neuen Headerdetails.
- Vollständiger lokaler Warenkorbweg: erhaltene Preis-/Bindungs-/Revisionsprüfungen, Claim-Wiederholung, alte/neue Clients; nach dem Warten zwei vollständige `resolve`-Prüfungen weiterhin nachweisbar. Keine Optimierung heimlich vorgezogen.
- Build unverändert `editor-53e0cbea74e77305.mjs`, 76 Ressourcen / 1 Modell / 162 Module / 16 Styles, 1.402.445 Bytes, gzip 430.268. `git diff --check` grün.

## Vergleich im gleichen lokalen Profil

Runner `scripts/measure-shop-cart-timing.mjs`, weiterhin Windows / Node 24.22.1 / Intel Core Ultra 5 235, eine Sitzung, Loopback ohne Drosselung, identisches natives Muster mit 40×60-PNG/WebP, identische Python-Umgebung. Shopify vollständig simuliert (60/100/25/40 ms). Je Profil **1 Aufwärmlauf + 7 Messläufe pro Seite**, nacheinander auf demselben Rechner. Beide Seiten schreiben ihre JSON-Zeilen synchron in eine temporäre Datei, dieser Aufwand ist in den HTTP-Dauern enthalten. Der Runner wartet nach allen gemessenen Anfragen auf optionale GC-Nachlieferungen; diese Wartezeit wird keiner HTTP-Messung zugeschlagen.

### Profil A: bisheriger Ablauf, synthetischer Binding-Provider / In-Memory-Datenbank

Vorher `13c3a1e6`, nachher `9f57118a`. [Rohdaten vorher](../measurements/2026-11-17-konfi-tempo-p1-1b/before.json), [nachher](../measurements/2026-11-17-konfi-tempo-p1-1b/after.json).

| Anfrage | Vorher Median (Min–Max), ms | 1b Median (Min–Max), ms |
| --- | ---: | ---: |
| Entwurf | 850,98 (842,59–857,47) | 852,75 (829,65–874,80) |
| Übergabe | 7,02 (6,74–7,55) | 7,92 (7,82–8,80) |
| Daten | 256,08 (250,18–262,75) | 251,17 (239,27–258,09) |
| Claim | 7,22 (7,02–7,56) | 8,01 (7,51–8,34) |

### Profil B: echte lokale SQLite-Registry / temporäre Dateidatenbank

Ergänzt, weil Profil A die echte Registry bisher ersetzt. Beide Seiten verwenden denselben aktualisierten Runner mit Argument `real-registry`, denselben Datenstand und dieselbe echte Registry-Implementierung ihres Checkouts. Vorher `13c3a1e6`, nachher `b169fcf0` (Runtime identisch zu `9f57118a`). [Rohdaten vorher](../measurements/2026-11-17-konfi-tempo-p1-1b/registry-before.json), [nachher](../measurements/2026-11-17-konfi-tempo-p1-1b/registry-after.json).

| Anfrage | Vorher Median (Min–Max), ms | 1b Median (Min–Max), ms |
| --- | ---: | ---: |
| Entwurf | 847,90 (836,96–861,97) | 844,62 (833,78–862,18) |
| Übergabe | 20,34 (19,36–20,63) | 21,37 (21,02–22,19) |
| Daten | 260,34 (253,80–276,33) | 264,31 (259,96–285,26) |
| Claim | 32,15 (25,77–37,25) | 34,05 (26,72–35,83) |

Messaufwand ist sichtbar: Übergabe +0,90 bzw. +1,03 ms Median; im zweiten Profil +1,90 ms beim Claim. Das ist kein Optimierungsgewinn; negative Differenzen bei anderen Abschnitten sind kein belastbarer Geschwindigkeitsnachweis. Kein Live-/Handyvergleich und kein Nachweis unter 5 s.

In Profil B zeigt die erste gemessene Übergabe u. a. drei Registry-Aufrufe, 2,79 ms Produktlesen, 4,36 ms kanonische Serialisierung, 1,59 ms SHA-256, `offer_resolve` 5,74 ms. Die Werte sind verschachtelt bzw. über Aufrufe summiert, keine addierbaren Einzelkosten einer einzigen `resolve`-Ausführung. Maximal 48 verschiedene Abschnittsnamen im Test (unter der bestehenden Diagnosegrenze 64). Acht GC-Nachlieferungen einschließlich Aufwärmlauf, jeweils ca. 4,5–5,2 ms; Rohdaten enthalten sie getrennt.

**Logaufwand/B4:** Profil A je vollständiger Übergabe einschließlich Hintergrundlauf ca. 5.678–5.700 → 23.572–23.592 Bytes. Profil B einschließlich zugeordneter GC-Zeilen ca. 5.699–5.712 → 31.908–31.927 Bytes. Größte v2-Hauptzeile dort 8.161 Bytes. Gemessene lokale Werte, keine Hochrechnung als Betriebsgrenze. Die ungeklärte Rotation darf dadurch nicht als erledigt gelten; Claude muss den höheren Umfang vor einem späteren Live-Einsatz berücksichtigen.

Reproduktion (jeweils denselben aktuellen Runner für beide Checkouts verwenden):

```sh
node scripts/measure-shop-cart-timing.mjs <checkout> 7
node scripts/measure-shop-cart-timing.mjs <checkout> 7 real-registry
```

Keine echte Shopify-Anfrage, kein Kundendatenbestand, keine Bestellung. Alle Auswertungen unterscheiden Hauptereignisse und GC-Zusätze; `backgroundEvents` enthält auch den Aufwärmlauf. Die Datenbanken/Bilder entstehen ausschließlich temporär.

## Review und Abschluss

[Claude hat den vollständigen Stand `68515bf5` geprüft und ohne Blocker abgenommen](https://github.com/Chris83638w/gravuru-2027/pull/255#pullrequestreview-5940055146). Er hat die umschlossenen Lesestellen und unveränderten Fehlerbedingungen einzeln geprüft, die Zuordnung der GC-Daten und die unveränderten Header bestätigt. Eigener Build mit Node 24.22.3 / Linux identisch. Seine 18 Testdateien: **157/159**, zwei identische bekannte Fehler auch auf unveränderter Basis `be163c5d` in seiner Druckprüfungsumgebung; kein neuer PR-Befund. Astra lokal weiterhin **159/159**. Eigene Linux-Gegenprobe: alle fünf OS-Zähler verfügbar, GC-Nachlieferung mit gleicher traceId, identisch weitergereichter Fehler ohne privaten Text im Log.

Die Hinweise werden ausdrücklich festgehalten, ohne weitere Runtime-Änderung:

- **H1:** 74 verschiedene Abschnittsnamen im Code, bestehende Grenze 64 pro Ereignis, in den Rohdaten maximal 48. Ein Ereignis mit 64 oder mehr erfassten Namen kann unvollständig sein; fehlende Details nicht als null Aufwand deuten. Expliziter Zähler für verworfene Messungen bleibt als spätere Verbesserung offen, keine Erhöhung der Grenze und keine neue Konfi-Regel.
- **H2:** Claude beobachtete 662 ms User-CPU in einem synchronen Abschnitt mit 545 ms Laufzeit. Andere Threads zählen mit; auch CPU nahe Laufzeit beweist keine exklusive CPU-Ursache genau dieser Anfrage. Keine neue Ursachenbehauptung.
- **H3/B4:** ca. 31,9 KB pro Übergabe, Rotation genau von `stderr.log` weiterhin nicht nachgewiesen. Offen, kein Betriebseingriff.
- **H4:** Fehlende GC-Nachlieferung bleibt unbekannt, nicht gesichert null. Neben keinem beobachteten GC und Prozessende kann außergewöhnlich späte Zustellung nach dem begrenzten Nachlauf fehlen.

Claude hat diese Präzisierungen anschließend direkt im Tab vollständig bestätigt: kein offener Codeblocker, kein weiterer Runtime-Patch nötig, H1/H2/H4 wie oben, H3/B4 offen. Astra hat seine vollständige Antwort abgewartet.

Claudes Vorschlag, 1b später für drei echte Läufe in einem begrenzten Messfenster einzuspielen und anschließend auf `9af3a1ac` zurückzuschalten, ist **keine Freigabe und kein beschlossener Betriebsablauf**. Der aktuelle Nutzerauftrag verbietet Live-Eingriffe. Kein Merge, Restart oder Deployment; V2/V3 nicht begonnen. Die Runtime bleibt nach dem Review unverändert. Dieser Abschluss aktualisiert nur Dokumentation; Tests und Vergleich nicht ohne Codeänderung wiederholt, `git diff --check` erneut grün.

Der nächste mögliche Schritt außerhalb dieses abgeschlossenen Code-/Reviewauftrags ist eine Entscheidung von Chris über eine echte 1b-Messung und deren Umgang mit dem offenen Logbetrieb. Bis dahin keine Live-Aktion. Die Diagnose kann Hosting-/Daten-/CPU-Ursachen eingrenzen, stellt sie vor diesem realen Messlauf aber nicht fest.
