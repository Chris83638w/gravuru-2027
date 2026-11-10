# Paket 1a-2 – Trefferpfad des Modellabrufs: Ergebnis des Bauers (10.11.2026)

Claude (Bauer), Branch `dev/claude-paket1-modellantwort-20261110`, Basis `bd9e605`. **Nichts live installiert.** Kundenseite (`app/configurator/**`, `app/workshop/ui/**`), `ops/**`, `package.json` und `app/workshop/http.mjs` sind unverändert. Auftrag: [Bauanleitung](2026-11-10-paket1a2-trefferpfad-bauanleitung.md).

## 1. Phase A – Ursache (lokal, live-naher Aufbau)

Aufbau (`node scripts/customer-model-benchmark.mjs --live-like --model-cache enabled`): echte Zuordnungsablage (`shop-product-binding-store`) mit 404 Varianten, echte Katalog-Freigabe (`catalog-live-orders`, an), öffentlicher Vorschauspeicher an (temporäres Verzeichnis), Dokument 12,05 MB, 240 Designs (live 251), 80 Formate. Die Freigabe ist hier NICHT mehr eine Attrappe – genau das hatte der frühere Benchmark verdeckt.

Abschnittszeiten je Treffer, gelesen aus der Protokollzeile `model_response_cache` (Mittel aus 21 Treffern), neben den Live-Werten:

| Abschnitt | lokal | live (10.11.) |
|---|---|---|
| `msContext` | 222,9 ms | 220–260 ms |
| `msChecks` | 138,1 ms | 115–130 ms |
| `msStartPublic` | 324,5 ms | 315–360 ms |
| `msState`, `msStartGallery`, `msSend` | 0,5 / 2,7 / 4,7 ms | unter 5 ms zusammen |

Der Aufbau trifft die Live-Größenordnung in allen drei Abschnitten.

Funktionen (`node --cpu-prof`, 30 Treffer, Mittel je Abruf, inklusiv; Treffer gesamt ca. 690 ms):

| Funktion | Datei | ms je Abruf | Ursache |
|---|---|---|---|
| `registry.resolve` → `result` | `shop-product-binding-store.mjs` | 215 | Dokument (12 MB) lesen 38, `JSON.parse` 24, `digest(canonical(...))` 159 (Kanonisierung 106 + SHA-256 53) |
| `catalogLiveApproval` (4 Aufrufe je Abruf: 2× Trefferpfad, 1× `modelFor`, 1× `checkGalleryBinding`) | `catalog-live-orders.mjs` | 286 (je ca. 71) | je Aufruf Spalte `document` lesen und SHA-256 über 12 MB |
| `modelFor` → `workshop.model` in `publicPreviews.current` | `http.mjs` `model()`, `repository.mjs` `get` | 105 | `repository.get` (Lesen + Parsen, 75) + `structuredClone` des Modells (56), obwohl der Treffer das Modell schon hält |
| `sourceDigest` | `public-design-previews.mjs` | 76 | `JSON.stringify` + SHA-256 über das ganze Modell |
| `choices` / `gallery.start`, `konfis.paused`, Senden | | je unter 8 | |

(Die Zeilen überschneiden sich, weil die Freigabe auch in `modelFor` und `checkBinding` steckt; die Summe der Eigenzeiten ist ca. 690 ms.) Der Anteil liegt vollständig in `app/workshop/**`; `http.mjs` verursacht Kosten nur über den Aufruf `model()`, der im Treffer entfallen kann – deshalb keine Änderung dort.

## 2. Phase B – was geändert wurde

Alle Entlastungen hängen am vorhandenen Schalter `GRAVURU_CUSTOMER_MODEL_CACHE` (kein neuer Schalter): ohne Antwortspeicher wird kein Gedächtnis angelegt und nichts übergeben, die Wege sind dann wie vorher.

| Datei | Änderung |
|---|---|
| `revision-derivation-memo.mjs` (neu, 47 Zeilen) | Gedächtnis für kleine Ableitungen (Prüfsummen) einer festen Revision. Frischebeleg je Abruf: `rowid` der Revisionszeile, Schema-Versionen (main/temp), Kopf, Archivierung und Art des Produkts aus `products` (ohne Dokumentspalte); Teil des Schlüssels. Je Store getrennt, höchstens 256 Einträge, Wert höchstens 512 Byte, eingefroren; Mandant über `products.tenant_id` gefiltert; Ablage nur, wenn der Beleg nach der Berechnung unverändert ist; Fehler gehen unverändert durch. |
| `shop-product-binding-store.mjs` | `resolve(input,{documentMemo})`: Prüfsumme und Produktionsstatus der Revision aus dem Gedächtnis. Archivierung, Art und Status der Revision werden bei jedem Aufruf entschieden (gleiche Bedingung und gleicher Fehler wie `productRow`); der Vergleich mit `document_sha256` der Zuordnung und `assertBinding` bleiben je Aufruf. |
| `catalog-live-orders.mjs` | `approval(input,{documentMemo})`: SHA-256 des Dokuments aus dem Gedächtnis. Zuordnung, Freigabezeile, Variantenliste und der Vergleich mit `document_sha256` der Freigabe bleiben je Aufruf. Andere Aufrufer (Bestelleingang) ohne zweites Argument: unverändert. |
| `public-design-previews.mjs` | `attach(result,{modelFor})`: ein Aufrufer, der ein gehaltenes Modell liefert, ersetzt den Neuaufbau; die Prüfsumme dieses Modells wird je Objekt gemerkt, aber nur wenn es tief eingefroren ist (sonst jedes Mal neu). |
| `shop-entry.mjs` | gibt den Stores das Gedächtnis mit (`memoOptions`); `modelFor` aufgeteilt in Aufbau + `checkedModel` (Zuordnung, Art, Freigabe, unverändert); `heldModelFor` für den Treffer führt Pause (423) und dieselben `checkedModel`-Prüfungen aus. Treffer-Reihenfolge der Prüfungen und Antwort unverändert. |

### Warum keine Prüfung abgeschwächt ist

- Gemerkt wird nur eine reine Ableitung (SHA-256 eines unveränderlichen Revisionsdokuments, SHA-256 eines tief eingefrorenen Modells). Entscheidungen (zugeordnet, Freigabe vorhanden und passend, pausiert, archiviert) werden bei jedem Abruf frisch aus der Datenbank gelesen. Tests: Pause 423 und Erholung, Freigabe mit falschem Belegstand, Archivierung, Änderung des Dokuments hinter gelöschtem Trigger – jeweils mit warmem Speicher derselbe Status/Code/Text wie ohne.
- Der Integritätsvergleich „Produktbeleg wurde verändert“ läuft weiter bei jedem Abruf; er vergleicht jetzt die gemerkte Prüfsumme der Revision. Das setzt die Annahme voraus, dass die Revisionszeile (Trigger `immutable_revision_*`) sich nicht ändert, ohne dass sich `rowid` oder Schema ändern (Ersetzen = neue rowid, Trigger ändern = neue Schema-Version; beides getestet). Das ist dieselbe Annahme wie Paket 1a N1.
- Der Treffer baut das Modell nicht neu auf, sondern verwendet das gehaltene; der Speicher gilt nur bei unverändertem Produktstand (`revisionState`, N1). `workshop.model` prüft nebenbei nur die Pause – die wird im Treffer ohnehin dreimal frisch gelesen (Treffer, `heldModelFor`, `checkGalleryBinding`).

## 3. Messung vorher/nachher (live-naher Benchmark, `--runs 20 --model-cache enabled --live-like`, Median)

| | vorher (`bd9e605`) | nachher |
|---|---|---|
| Treffer, Server | 686,1 ms | 9,9 ms |
| Treffer, Client | 707,5 ms | 21,9 ms |
| vier gleichzeitig, langsamster (Client) | 2767 ms | 47,8 ms |
| Erstabruf (Server) | 748,8 ms | 256,8 ms |
| `msContext` / `msChecks` / `msStartPublic` | 222,9 / 138,1 / 324,5 | 0,5 / 0,5 / 10,1 |

Abnahmekriterium: Treffer unter 60 ms (erreicht: 9,9 / 21,9), vier gleichzeitig unter 250 ms (erreicht: 47,8). Bytegleichheit: `shop-entry-trefferpfad.test.mjs` vergleicht Körper mit/ohne Speicher byteweise (fester Takt, gleiche Sitzung). Lokale Werte, Loopback, kein TLS, eine Prozessinstanz; absolute Live-Zeiten können abweichen.

## 4. Tests

Node 24.22.2, `GRAVURU_PYTHON=$(which python3)`.

- Neu: `revision-derivation-memo.test.mjs` 7, `shop-entry-trefferpfad.test.mjs` 5 (echte Zuordnungsablage und Freigabe, mit/ohne Speicher verglichen).
- Gezielte Suiten (customer-model-response-cache, shop-entry-model-cache, shop-entry-model-cache-real, shop-entry, -flow, -session, -client, tenant, public-design-previews, shop-product-binding-store, catalog-live-orders, shop-product-binding-http, order-intake, die zwei neuen): 191 Tests, 191 grün, 0 rot.
- Gesamtlauf (alle 370 `*.test.mjs` unter app/ und scripts/): 2753 Tests, 2741 grün, 8 rot, 4 übersprungen. Die 8 roten sind genau die bekannten der Basis (acrylic-photo-resolution 3, cart-priced-options 4, konfis 1); kein weiterer rot.

## 5. Abweichungen und Grenzen

- Der Benchmark-Aufbau hat 240 statt 251 Designs, 404 Varianten (80 mit gültiger Auswahl, die übrigen nur als Zuordnungszeilen).
- Nicht geprüft: echter Plesk-Betrieb, echte Datenbank, echte Konfi-/Shopify-Sitzung, Sichtprüfung im Browser (Kundenseite ist unverändert), Speicherverbrauch des Gedächtnisses live (Einträge sind klein: höchstens 256 × 512 Byte).
- Die Annahme „Revisionszeile unverändert, solange rowid und Schema gleich bleiben“ (siehe oben) schützt nicht gegen Änderungen an der Datei außerhalb von SQLite im laufenden Betrieb; der bisherige Weg las zwar jedes Mal das Dokument, aber über dieselbe Seitenablage. Operator bitte bestätigen.
- Erstabruf wird ebenfalls schneller (einmal Berechnen statt viermal), ohne dass eine Prüfung entfällt.
- `shop-entry.mjs`: Gedächtnis gilt für alle `resolve`-/Freigabeaufrufe des Einstiegs (auch Warenkorb-Wege), sobald der Schalter an ist; Verhalten dort ebenfalls unverändert (Entscheidungen frisch).
- Die aktuelle Zeile `model_response_cache` bleibt mit allen `ms…`-Feldern erhalten.
