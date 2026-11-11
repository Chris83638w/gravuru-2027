# Paket 1a live installiert – Ergebnis und offener Befund (10.11.2026)

Operator: Claude (Auftrag Chris im Claude-Chat, 10.11.2026: „kannst du machen, jetzt loslegen“). Entscheidung und Verlauf: Issue #229.

## Was live ist

- Laufzeit: `private/mika-r15-resume-20261108-v1/app/workshop/` auf `app-2027.gravuru-designwerkstatt.de`.
- Stand vor der Installation geprüft (SHA-256 je Datei): alle fünf betroffenen Dateien waren bytegleich mit `8ceb866` – Mikas Fünfdateienpaket lag also bereits live (Dateidatum 10.11.2026 07:13:56, Beleg `performance-followup-20261110-receipt.json`). Der Branch `dev/claude-paket1-modellantwort-20261110` baut genau darauf auf.
- Installiert aus Commit `ac24f6b` (SHA-256, erste 16 Stellen, vorher → nachher):

| Datei | vorher | nachher |
|---|---|---|
| `customer-model-response-cache.mjs` | (neu) | `abaf9dcf140aaa86` |
| `customer-read-scope.mjs` | `f47460a1fdce7b93` | `23d95868b7a4bc0b` |
| `repository.mjs` | `ccc35a82957c6352` | `2ddad4bbc49fe43f` |
| `configurator-integration.mjs` | `d45a83bccafbd90c` | `336e375bb0b0847a` |
| `shop-entry.mjs` | `8fa170b5bbc4424d` | `73cee0fadf254e98` |
| `acryl-employee-host.mjs` | `0ff5ab74f792da57` | `fc7f2402028eaa99` |

- Schalter: in `gravuru-2027-merchant/app.cjs` eine Zeile vor `require(...)` ergänzt: `process.env.GRAVURU_CUSTOMER_MODEL_CACHE = "enabled";` (`e679ca2dd1285c79` → `aba0bfa31ae24115`).
- Sicherung: `private/claude-paket1a-20261110/` (alte Dateien als `*.vorher-8ceb866`, neue Dateien zum Vergleich) und `gravuru-2027-merchant/app.cjs.bak-20261110-vor-paket1a`.
- Ablauf: Dateien hochgeladen und per Download-Hash geprüft → Neustart mit Schalter aus → Messung → Schalter ein → Neustart → Messung.

## Zurückbauen

1. Schnell: in `app.cjs` die Zeile mit `GRAVURU_CUSTOMER_MODEL_CACHE` entfernen (oder `app.cjs.bak-20261110-vor-paket1a` zurückspielen), App neu starten. Der neue Code verhält sich dann wie vorher.
2. Vollständig: die fünf `*.vorher-8ceb866` unter ihrem Originalnamen zurück nach `app/workshop/`, `customer-model-response-cache.mjs` dort löschen, App neu starten.

## Prüfung live

- Modellantwort vor / nach Installation (Schalter aus) / nach Einschalten: Inhalt `model` identisch; nur `expiresAt` und `startPreview.target` unterscheiden sich (je Sitzung, wie vorher).
- Konfi im Browser vorher/nachher, 1440×800 und 390×844: 0 abweichende Pixel, keine Seitenfehler.
- Speicher arbeitet: `stderr.log` meldet `model_response_cache` mit `hits 14 / stores 1 / entries 1 / bytes 320504`, danach `hits 9`, `hits 9`. Der allererste Abruf nach dem Start wurde nicht gespeichert (`misses 1, stores 0`), der nächste schon.

## Ehrliches Ergebnis: von außen nicht schneller

| Messung von außen (Zeit bis erstes Byte minus TLS-Aufbau) | vorher | nachher |
|---|---|---|
| Modellabruf einzeln | ca. 0,8–0,9 s | ca. 0,85–0,9 s |
| vier gleichzeitig (Zeit bis erstes Byte, mit TLS) | 1,3 / 2,2 / 2,8 / 3,4 s | 1,2 / 1,8 / 2,4 / 3,1 s und 1,2 / 2,0 / 2,8 / 3,6 s |
| billiger Abruf derselben App (403 ohne Sitzung, Konfi-HTML) | – | ca. 0,13 s |

Der Modellaufbau, den Paket 1a einspart, ist live nicht der bestimmende Anteil. Rund 0,75 s je Abruf bleiben auch bei einem Speichertreffer im Node-Prozess, und sie blockieren den einen Prozess (vier gleichzeitige Abrufe stapeln sich unverändert).

Fehler des Operators: Die Bauanleitung hat die 0,55–0,9 s dem Lesen/Aufbereiten des Produktdokuments zugeschrieben, ohne den Anteil live je Abschnitt zu messen. Der lokale Benchmark (Treffer 4,4 ms) lief ohne öffentlichen Vorschauspeicher (`GRAVURU_PUBLIC_PREVIEW_DIRECTORY`), der live seit 09.11. eingeschaltet ist.

## Vermutung, noch nicht belegt

Auf dem Trefferpfad läuft je Abruf weiterhin `startPreviewFor` → `publicPreviews.attach` → `current()` (`modelFor`, `checkBinding`) → `lookup()` mit `sourceDigest(model)` = `sha256(JSON.stringify(ganzes Modell))` und `choices()` (bis zu drei `gallery.start`). Das ist synchron und hängt an der Modellgröße. Ob das die 0,75 s erklärt oder ob `activeContext`/Freigabeprüfungen mitspielen, ist nicht gemessen.

## Vorschlag nächster Schritt (Paket 1a-2, klein)

1. Erst messen: im Modellabruf die Abschnitte (Sitzung/Bindung, Freigaben, Startvorschau, Antwort) als Logger-Ereignis mit Millisekunden ausgeben, hinter Schalter, live 20 Abrufe lesen.
2. Dann nur den belegten Abschnitt entlasten (voraussichtlich: Quell-Fingerabdruck der öffentlichen Vorschau je Produktstand merken statt je Abruf rechnen), Benchmark mit eingeschaltetem Vorschauspeicher.
3. Keine Änderung an dem, was der Kunde sieht oder bedient.

## Nebenbefund für Mika

`stderr.log` zeigt `shop_gallery_cache_hit` mit 2,7–9,6 s Dauer. Das betrifft die Designauswahl, nicht den Modellabruf; bitte bei der Galerie-Leistung berücksichtigen.

## Nachtrag 10.11.2026, ca. 11:45 – Abschnitte live gemessen

`shop-entry.mjs` live auf Commit `c1649ad` (`06ece2ae74ec78de`; nur Messfelder in der Zeile `model_response_cache`), ein Neustart. Je Speichertreffer: `msContext` ca. 220–260 ms, `msChecks` ca. 115–130 ms, `msStartPublic` ca. 315–360 ms, alles übrige unter 5 ms. Die Vermutung oben stimmt also nur zur Hälfte: Zuordnung auflösen und Freigabe/Pause kosten zusammen etwa gleich viel wie die öffentliche Startvorschau. Auftrag daraus: [2026-11-10-paket1a2-trefferpfad-bauanleitung.md](2026-11-10-paket1a2-trefferpfad-bauanleitung.md).

## Nachtrag 10.11.2026, ca. 13:55 – Paket 1a-2 live

Freigabe Chris im Claude-Chat, 10.11.2026 12:45: „Ja, ‚live‘ für Paket 1a-2“. Installiert aus `8e394cd`, ein Neustart:

| Datei | vorher | nachher |
|---|---|---|
| `revision-derivation-memo.mjs` | (neu) | `8bda1a5dbe38b113` |
| `shop-product-binding-store.mjs` | `42c4999be3336751` | `9bb289a50b1282c3` |
| `catalog-live-orders.mjs` | `dce568c366662313` | `d8cd175043937d3b` |
| `public-design-previews.mjs` | `7fb810e1b2551302` | `a46b1a3c137feeb8` |
| `shop-entry.mjs` | `06ece2ae74ec78de` | `3c6ab9e14974286c` |

Sicherung der alten Stände: `private/claude-paket1a-20261110/` (`*.vorher-8ceb866`, `shop-entry.mjs.vorher-c1649ad`). Rückbau schnell: Schalterzeile in `app.cjs` entfernen + Neustart (ohne Schalter sind Speicher und Gedächtnis aus).

Messung live (Protokoll, 5 Treffer): `msContext` 14 ms je Abruf (vorher ca. 260), `msChecks` unter 1 ms (vorher ca. 127), `msStartPublic` 27 ms (vorher ca. 359). Von außen: Modellabruf ohne TLS ca. 0,30 s (vorher ca. 0,85 s); vier gleichzeitige, Zeit bis erstes Byte mit TLS: 0,6 / 0,9 / 0,9 / 1,0 s (vorher 1,2 / 2,0 / 2,8 / 3,6 s). Modellinhalt identisch, `startPreview` bis auf `target` identisch, Konfi 1440×800 und 390×844 pixelgleich zu vorher.

Offen/beobachtet: (1) Zwischen Prozess und außen bleiben ca. 0,15 s über dem billigen Abruf (0,13 s) – nicht untersucht. (2) Nach jedem Neustart einmalig ein Abruf mit 6–8 s; im Protokoll stehen dann je zwei Paare `shop_gallery_cache_hit` (ca. 3 s) / `public_preview_prepared` – Startaufwärmen blockiert, evtl. zwei Prozesse. (3) Review Mika steht aus.
