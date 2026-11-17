# App-Audit gravuru-2027 (Claude, 17.11.2026)

Auftrag Chris 17.11.2026: gesamte App prüfen und optimieren, bestätigte Fehler selbst beheben und durch echte Tests belegen. Lokal arbeiten, nichts veröffentlichen, keine Produktivdaten ändern.

- Branch: `dev/claude-app-audit-20261117`, Basis ist der Live-Stand `be163c5d` (Live-Baum 1:1 = Git-Baum laut #252).
- Arbeitskopie: `Documents\Codex\2026-11-16\app-audit` (Git-Worktree).
- Zuständigkeit: Nach `PRIO-KONFI.md` gehören Änderungen am gemeinsamen Konfi-Kern zu Mika/Mikail. Chris hat diesen Audit ausdrücklich beauftragt. **Merge nach `main` oder Deploy erst nach Review (Astra/Mika) und Freigabe durch Chris.**
- Keine Überschneidung mit Astras P04 (#239): `shop-embed.mjs`, `shop-warm.mjs`, `shop-entry-page.mjs` und die übrigen `shop-*`-Einstiegsmodule fasse ich nicht an.

## Quellen

- **Server, nur lesend per SSH:**
  - Prozesse und Speicher (`/proc`)
  - `gravuru-2027-merchant/stderr.log` (674 Ereigniszeilen)
  - Access-Log von app-2027 vom 16.11. (4.277 Anfragen)
  - Tabellengrößen per `sqlite3 -readonly`
- **Live per HTTP:** Header, Kompression und Größen.
- **Code:** Stand `be163c5d`. Die Durchsicht des Servercodes hat ein Hilfsagent gemacht; jeder umgesetzte Befund ist von mir im Code und durch Tests bestätigt.

## Ausgangszustand

| Prüfung | Ergebnis |
|---|---|
| Build `node app/configurator/variant-m/build.mjs` | grün. Bundle `editor-53e0cbea74e77305.mjs` ist bytegleich mit live (1.402.445 B, gz 430.268 B) |
| Gesamtsuite `node --test app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs` | 2.732 Tests, 2.509 grün, **206 Fehler, alle vorbestehend**. Lokale Umgebung: Katalog-Repo, Fotoauflösung, Werkstatt-Dateien usw. Die Liste ist als Vergleichsbasis gesichert |
| Typprüfung / Linter | nicht eingerichtet (reines ESM ohne Abhängigkeiten); nicht ausführbar |
| Abhängigkeiten | keine npm-Abhängigkeiten im Hauptprojekt, damit gibt es nichts für `npm audit`. Python auf dem Server (lxml, pathops) nicht geprüft |
| Geheimnisse im Repo | Suche nach Shopify-, GitHub- und AWS-Tokens sowie privaten Schlüsseln: keine Treffer außer Prüfmustern in Audit-Skripten |

## Befunde mit Nachweis

| # | Prio | Befund | Nachweis | Status |
|---|---|---|---|---|
| 1 | hoch | Galerie-„Cache-Treffer“ dauert ~3 s und blockiert den Hauptthread | live 131× `shop_gallery_cache_hit` mit 2,6–3,6 s. Der Cache enthält 245.830 Karten in 44 Bereichen (339 MB JSON). `decode()` entpackte bei jedem Treffer alles (`shop-gallery-snapshot.mjs`), gebraucht wird ein Bereich (`shop-design-gallery.mjs:236`) | **behoben** (Ä1) |
| 2 | hoch | Hoher Heap: der entpackte Gesamt-Snapshot bleibt im Speicher | heapMb bis 989, RSS bis 3 GB (VmHWM). Synthetisch in Live-Größe hält der Snapshot 465 MB | **behoben** (Ä1), der Snapshot hält jetzt 28 MB |
| 3 | mittel | Galerie-Karten betten die volle Rohlingtextur ein | Shop: SVG 140 KB, davon WebP 1536×1024 mit 98 KB; Karten werden ~170 CSS-px breit angezeigt. Werkstatt-Karte: 1.902 KB (PNG 1,44 MB) | **behoben** (Ä2) |
| 4 | niedrig | `acryl-assistant.js`, `demo.css`, `shopping-cart.svg` mit `no-store`, je ~100–130× am Tag | Access-Log und Header live | **behoben** (Ä3) |
| 5 | – | Vorschlag „Produkt-Head aus `galleryRevision` nehmen“ | Bindungen gelten nur bei Head = gebundener Stand (`requireHead`, `shop-product-binding-store.mjs:99`). Ein neuer Entwurf ändert also wirklich die Galerie | **geprüft, kein Fehler**, nicht umgesetzt |
| 6 | mittel | Modell-Antwortcache hält nur 2 Modelle, dadurch Verdrängung (msBuild 600–1600 ms) | `customer-model-response-cache.mjs:14`; Log zeigt `evictions` 1–3 | **offen**: Die Grenze ist eine Speicherentscheidung aus Paket 1a und durch einen Test festgeschrieben. Mehr Modelle kosten je Modell mehrere MB. Nach Ä1 (−~440 MB) kann Chris z. B. 6 freigeben |
| 7 | mittel | 241× `404 /cart.js` am App-Host | Der Funkklingel-Referenzteil (`app/references/aosu-upgrade-2026-09-21/verification/editor-source.html:1341ff.`) ruft im iframe `refresh()` auf und hat dort kein `Shopify` | **offen**: Die Datei ist eine eingefrorene Referenz; Änderung durch Mika/Mikail |
| 8 | mittel | Katalog-Arbeiter: `designs.list` 3–8 s, `targetPreview` ~1,1 s CPU | `design-dashboard.mjs:43-51` merkt sich den Katalog nur 2 s; `design-target-preview.mjs:12` mit `maxAgeMs:0` | **offen**: betrifft die Werkstatt (Mitarbeiter, nicht Kunden). Gewollte Aktualität der Katalogdateien muss geklärt werden |
| 9 | niedrig | `shop_gallery_warm_failed` mit `ERR_INVALID_STATE` (6×) | Warm-up läuft nach dem Schließen der DB beim Neustart weiter | **offen**: nur eine Logzeile, kein Kundeneffekt |
| 10 | niedrig | `katalog_worker_ready` 40× an einem Tag | Passenger startet den Prozess oft neu; jeder Start verliert alle Speicher-Caches | **offen**: Plesk/Passenger-Einstellung (min. Instanzen, Leerlaufzeit), Sache von Chris |
| 11 | **hoch (Betrieb)** | Server-Platte zu 95 % voll (49 GB frei von 951 GB) | `private/` 336 GB: `sicherungen-db` 65 GB, `mika-module-connect-…` 27 GB, `mika-konfi-hundetest*` r1–r5 je 4 GB, Slate-Sicherungen 15,4 GB, 11 alte `kandidat-*` je 122 MB | **offen**: Löschen nur mit Chris |
| 12 | mittel | `workshop.sqlite` 4,2 GB | `product_revisions` 2,1 GB (4.419 Revisionen, Ø 486 KB, max 46 MB, eingebettete Schriften je Revision) und `form_review_snapshots` 2,1 GB (unveränderlich per Trigger) | **offen**: Datenmodell- bzw. Aufbewahrungsentscheidung |
| 13 | niedrig | 503 bei `/api/workshop/all-orders` ohne Ursache im Log | `cross-store-orders.mjs:47` | offen |

Kompression ist live in Ordnung: Text kommt per br/gzip über nginx, Bundles gz und unveränderlich, Schriften und Lazy-JSON 1 h.

## Änderungen

- **Ä1 Galerie-Cache bedarfsweise**
  - `shop-gallery-snapshot.mjs`: neues `decodeLazy` mit derselben Signatur-, Umschlag- und Blockprüfung wie `decode` (gemeinsame Funktion `open`). Ein Bereich wird erst beim ersten `get()` entpackt und dann gemerkt. `decode` bleibt im Verhalten unverändert.
  - `shop-design-gallery.mjs`: Treffer nutzen `decodeLazy`. Nach einem Neuaufbau mit erfolgreichem Speichern bleibt ebenfalls die schlanke Fassung im Speicher.
  - Tests: 3 neue in `shop-gallery-snapshot.test.mjs` (Gleichheit je Bereich, gleiche Ablehnungen, Zeitvergleich).
- **Ä2 Kartentextur**
  - `card-surface.mjs` (neu) und `product-preview.mjs`: Bei `layout:'card'` wird die Edelstahl-Textur durch `…vorschau.karte.webp` ersetzt (600×400, 11 KB, mit Pillow aus der Original-PNG erzeugt).
  - Editor, Hochformat, Export und Produktion bleiben unverändert.
  - Der Renderer-Fingerabdruck der öffentlichen Vorschauen ändert sich mit, deshalb werden gecachte Vorschauen neu erzeugt.
  - Tests: `card-surface.test.mjs` (neu, 2 Tests).
- **Ä3 Cache-Header** in `acryl-employee-host.mjs`: die drei Editor-Nebendateien mit `private, max-age=300`, gleiche Lebensdauer wie die Editor-Seite. Test in `acryl-host-routing.test.mjs`.
  - Verworfen: ein 1-Tages-Cache für die unversionierte Edelstahl-PNG. Ein bestehender Test verbietet das bewusst, und die Erwartung ist nicht falsch.

## Messungen vorher/nachher

| Messung | vorher (`be163c5d`) | nachher | Bedingung |
|---|---:|---:|---|
| Galerie-Cache-Treffer | 3.836 ms (2 Läufe: 3.836/3.851) | **150 ms** (150/146) | synthetisch in Live-Größe: 44 Bereiche × 5.587 Karten, 17,2 MB Payload; live sind es 14 MB / 3 s |
| gehaltener Heap nach dem Treffer | 465 MB | **28 MB** | wie oben, `--expose-gc` |
| Werkstatt-Karte Edelstahl `/preview.svg?layout=card` | 1.902 KB | **41 KB** | laufende lokale App, gleiches Testprodukt, beide Stände parallel gestartet |
| Shop-Karte Edelstahl (`vorschauen/*.svg`) | 140 KB (Textur 98 KB) | ~53 KB (Textur 11 KB) | live gemessen bzw. aus der Texturgröße berechnet, noch nicht live gemessen |

## Tests nach den Änderungen (tatsächlich ausgeführt)

| Prüfung | Ergebnis |
|---|---|
| Gesamtsuite | 2.737 Tests (+5 neu), 2.514 grün, 206 Fehler, **identisch mit den 206 der Baseline**: keiner neu, keiner verschwunden |
| Gezielt | `shop-gallery-snapshot` 11/11, `shop-design-gallery` + `-alle` 44/44 (inkl. Treffer ohne Neuaufbau), `card-surface` 2/2, `acryl-host-routing` 9/9 |
| Gegenprobe | `card-surface`-Test schlägt ohne Ä2 fehl; der Zeitvergleichstest misst eager gegen lazy |
| Build | grün; Editor-Bundle unverändert `editor-53e0cbea74e77305.mjs`, weil die Änderungen nur den Server betreffen |
| Laufende App | lokaler Server, Edelstahl-Testprodukt über die Werkstatt-API angelegt, Kartenvorschau abgerufen: 41 KB gegenüber 1.902 KB auf dem unveränderten Stand |

Nicht ausführbar: Shop-Einstieg, Galerie und Warenkorb gegen echtes Shopify lokal, weil dafür Shopify-Konfiguration und Produktivdaten fehlen. Diese Abläufe sind durch die bestehenden HTTP-Tests mit synthetischen Daten abgedeckt. Einen echten Live-Test gibt es erst nach Deploy.

## Bereiche und Prüfstatus

| Bereich | Status | Anmerkung |
|---|---|---|
| Shop-Galerie / Designauswahl (Server) | geprüft | Ä1 und Ä2, gemessen |
| Öffentliche Design-Vorschauen | geprüft | Ä2; die Lesepfade sind synchron (`public-design-preview-cache.mjs`), offen |
| Kundenmodell `/api/shop-entry/model` + Antwortcache | teilweise geprüft | Befund 6, offen |
| Warenkorb-Übergabe | geprüft (vorher in #252, live 14,6 s) | in diesem Audit unverändert |
| Statische Auslieferung / Cache-Header / Kompression | geprüft | Ä3; Kompression ok |
| Shop-Einstiegsmodule (`shop-*`) | nicht geprüft | Astras P04, bewusst ausgelassen |
| Editor-Frontend (Bundle, CPU beim Start) | teilweise geprüft | Messung in #239 (~5 s CPU am Handy), Zuständigkeit Mika/Astra |
| Werkstatt / Katalog-Arbeiter | teilweise geprüft | Befund 8, offen |
| Anmeldung, Sitzungen, Rechte | teilweise geprüft | CSRF-Prüfung für schreibende Werkstattaufrufe (`http.mjs:462`) gesehen; 49× `merchant_session_rejected malformed` im Log ist korrekte Ablehnung. Keine systematische Rechteprüfung |
| Datenbank / Speicherwachstum | geprüft (lesend) | Befunde 11, 12 |
| Server-Betrieb (Speicher, Neustarts, Platte) | geprüft (lesend) | Befunde 2, 10, 11 |
| Sicherheit eigener Code | teilweise geprüft | Geheimnis-Suche, Muster-Suche; keine vollständige Prüfung |
| Abhängigkeiten | geprüft | keine npm-Abhängigkeiten; Python-Pakete auf dem Server nicht geprüft |
| Mobile Darstellung / Tastatur / Leer- und Fehlerzustände | nicht geprüft | keine Änderung an der Oberfläche; Konfi-UI ist R15-Freigabe von Mika/Mikail |
| Webhooks / Bestellungen | nicht geprüft | 405/404 im Log sind GET bzw. alte Pfade, kein Fehler belegt |
