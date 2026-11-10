# Paket 1c – Katalog-Arbeiter: Ergebnis (10.11.2026)

Bauanleitung: `2026-11-10-paket1c-katalog-arbeiter-bauanleitung.md`. Branch `dev/claude-paket1c-katalog-arbeiter-20261110`, Basis `38dab40` (+ Anleitung `6cfcaf7`). Nicht gepusht, nichts auf dem Server.

## Was gebaut wurde

Hinter `GRAVURU_KATALOG_WORKER=enabled` laufen `GET /api/workshop/designs`, `/designs/target-preview` und `/designs/svg` in einem dauerhaften `node:worker_threads`-Worker. Ohne den Schalter (oder bei anderem Wert) wird kein Client und kein Worker erzeugt; der Code läuft wie bisher.

- `katalog-worker.mjs` (im Worker): Nur-Lese-Leser (`openKatalogReader`, `DatabaseSync(..., {readOnly:true})`, `busy_timeout=5000`, Methoden `importItem`/`get` wie im Repository), Operationen `designs.list`, `designs.targetPreview`, `designs.svg`; JSON und gzip (Level 6, ab 262144 Byte Rohgröße, nur bei `acceptGzip`) werden im Worker erzeugt, Bytes gehen als übertragene `ArrayBuffer` zurück; Fehler mit `status/code/message/actualRevision` unverändert zurück. Test-Operationen (`test.busy/sleep/crash`) nur mit `workerData.testOps===true` (Client-Option, nicht aus der Umgebung).
- `katalog-worker-client.mjs` (Hauptprozess): Start erst beim ersten Aufruf, `unref()`; Zusammenlegen gleicher laufender Aufrufe; Obergrenze `maxPending=6` -> 503 `designs_busy` (Text laut Anleitung); Worker-Ende/-Fehler -> alle Wartenden 503 `designs_worker`, nächster Aufruf startet neu (kein Rückfall); Protokollzeile `{event,op,ms,bytes,gzip,pending,shared,ok}`; `writeJsonResult` schreibt die Kopfzeilen wie `json()`/`jsonMaybeGzip()`.
- `http.mjs`: Weiche an den drei Aufrufstellen, `close()` beendet den Worker, `katalogWorker` im Rückgabeobjekt (für Tests).
- `katalog-worker.test.mjs` (16 Tests), `scripts/check-katalog-worker.mjs` (Messung).

## Dateien (SHA-256)

| Datei | Status | SHA-256 |
|---|---|---|
| app/workshop/katalog-worker.mjs | neu | dbd62e827e8c9f63fccbb35daff2b2d195d55e4421ffa94074e786c916eee8b1 |
| app/workshop/katalog-worker-client.mjs | neu | 3eb860d876b2c68aa07eb1e03a159e50842ed20664bd68bb2b7bc59cfc48e522 |
| app/workshop/katalog-worker.test.mjs | neu | 1246d7011b24d73b7d2ba52095d1ffaf5005a54cd7b185d7e99cdf0ca6db1038 |
| scripts/check-katalog-worker.mjs | neu | 0eae68a537cb536ad27d5bbe3c63c5d94f2e51ff8ddaa9a7d517c0b9ef43f0aa |
| app/workshop/http.mjs | geändert (+11/-3 Zeilen) | d7599cf70756ad1060fbd864848defbcd34e2ab98651910e841649c5cff33bdb |

Unverändert: `design-dashboard.mjs`, `repository.mjs`, `katalog-source.mjs`, `design-target-preview.mjs`, `design-preview-glyphs.mjs`, alles unter `app/configurator/variant-m/` und `app/workshop/ui/`.

## Tests

Komplette Suite (`app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs`, `GRAVURU_PYTHON=python3`, Node 24):

| | tests | pass | fail | skipped |
|---|---|---|---|---|
| Ausgangsstand (saubere Kopie von `HEAD` ohne meine Änderung, in /tmp) | 2413 | 2403 | 8 | 2 |
| nach der Änderung (Worktree) | 2429 | 2419 | 8 | 2 |

Rote Tests (8), vorher und nachher dieselben Namen:
Werkstatt einheitlich: jede Werkstattseite trägt dieselbe erzeugte Kopfzeile und das gemeinsame Raster; native photo density follows physical scale and crop zoom, not pan or rotation; edited image pixels and each placement determine density; originals remain intact; free uploads use contained image dimensions rather than the photo-slot cover; both confirmed slate base prices and all eight accessory combinations agree through editor, snapshot, attributes and checkout; tampered field amounts, false values, duplicates and unpriced paid fields are rejected before cart creation; app-owned prices must match the saved product and unsupported paid input kinds stay blocked; checkout accepts the explicit no-options marker and rejects missing, unknown, duplicate or browser-priced options. Diese Tests wurden nicht untersucht und nicht verändert.

Neu: 16 Tests in `katalog-worker.test.mjs`, alle grün.

## Messung (Katalog `b5d8f28bc1`, lokal, 2 Kerne, Linie `edelstahl-tuerschilder` mit Fit, 21,1 MB JSON, `available={}`)

| Weg | Aufruf | Rechendauer | größte Verzögerung im Hauptprozess (10-ms-Intervall) |
|---|---|---|---|
| direkt | 1. | 24,4 s | 1832 ms (Intervall lief nur an den Wartepunkten) |
| direkt | 2. | 5,8 s | Hauptprozess komplett blockiert: 0 Ticks in 5,8 s |
| Worker | 1. (inkl. Workerstart) | 20,8 s | 9 ms (2022 Ticks) |
| Worker | 2. | 4,1 s | 9 ms (394 Ticks) |

Test-Messung (Worker rechnet 600 ms): Verzögerung unter 100 ms (Test fordert < 100).

## Katalog-Sperre (Anleitung 4.1)

Am Code nachvollzogen (`katalog-transaction.mjs`): `withKatalogWriteLock` legt `.werkstatt-write.lock` per `mkdir` an und schreibt `{pid}`. Worker-Thread und Hauptthread haben dieselbe PID; ein zweiter Zugriff (Lesen mit offenem Journal oder PATCH) findet das Verzeichnis, liest die PID, `process.kill(pid,0)` gelingt -> „lebendig“ -> 409 „Der Katalog wird gerade geändert“. Die gegenseitige Sperre gilt also auch zwischen den Threads; ein Reste-Lock wird nie fälschlich als „tot“ geräumt. Praktisch relevant nur bei offenem Schreib-Journal (sonst schreibt `recoverKatalogIfNeeded` nichts). Nicht mit eigenem Test belegt.

## Abweichungen / Ergänzungen zur Anleitung

1. **Neu: Katalogstand-Abgleich (`invalidate`, Epoche).** Der Worker hat seinen eigenen 2-Sekunden-Speicher (`katalogFor`), den `forgetKatalog()` im Hauptprozess nicht erreicht. Ohne Abgleich würde eine Liste direkt nach PATCH/Variante/Editor-Speichern bis zu 2 s alt sein (direkter Weg: sofort neu). Lösung in `http.mjs`: bei nicht-GET-Anfragen auf `/api/workshop/designs*` und `/api/workshop/catalog-structure` wird vor der Bearbeitung und bei `finish`/`close` die Epoche erhöht; der Worker verwirft dann seinen geöffneten Katalog. Gleiche Aufrufe werden über Epochen hinweg nicht zusammengelegt. Der 2-s-Speicher selbst bleibt unverändert.
2. **Neu: Schriftliste.** `formFonts` wird im Betrieb verändert (Schrift-Import). Der Client erkennt Änderungen per Referenzvergleich je Aufruf und schickt die Liste dann erneut an den Worker (sonst rechnet der Worker mit alten Schriften). Die Liste ist per structured clone übertragbar (Tests mit echter Seed-Konfiguration grün).
3. **`:memory:` ohne Worker.** Bei `filename===':memory:'` (nur Tests) gibt es keine gemeinsame Datei; ein Worker mit `reader=null` würde andere Ergebnisse liefern (keine Konfi-Produkte). Deshalb wird dort kein Client erzeugt. Nur für Mandanten mit `ownsBundled`.
4. `katalogWorker` zusätzlich im Rückgabeobjekt von `createTenantWorkshop` (nur für den Test „Schalter aus“).
5. Protokoll über `console.log(JSON.stringify(entry))` (in `http.mjs` gibt es keinen Logger).

## Offene Punkte und Risiken

- **Ein Worker rechnet nacheinander:** Während eine große Linie rechnet (Sekunden bis Minuten auf dem Server), warten auch SVG-Vorschauen und Zielvorschau im Worker. Der Kundenprozess bleibt frei, die Werkstatt-Seite nicht schneller. Mit `maxPending=6` können bei vielen gleichzeitigen Vorschaubildern einzelne 503 `designs_busy` kommen (Bilder fehlen kurz). Bei Bedarf Grenze erhöhen oder zweiten Worker für Dateien.
- Schreibende Wege außerhalb von `/api/workshop/designs*` / `catalog-structure` (z. B. Skripte in anderen Prozessen) sind für den Worker wie für den direkten Weg bis zu 2 s sichtbar verzögert.
- Mehrere Kopien des Worker-Speichers: Worker hält Katalog und Schriften zusätzlich im Speicher (21-MB-Antworten, Vorschau-Cache max. 16 MB).
- Messung auf dem Server (kalte Platte, 76.000 Dateien) fehlt; die lokale Messung hat warmen Betriebssystem-Cache.
- Die 8 roten Tests sind schon im Ausgangsstand rot (Ausgangslauf aus einer `git archive`-Kopie von `HEAD` in /tmp) und hängen nicht an der Designliste; Ursache nicht untersucht.
- Die Sperrbestätigung (4.1) ist Code-Lektüre, kein Test.

## Abnahme Operator (Claude), 10.11.2026

Gelesen: kompletter Diff (`http.mjs`, Client, Worker, Tests). Zwei Korrekturen von mir nach der Abgabe:

1. **Grenze getrennt nach schwer/leicht.** Die Abgabe zählte auch einzelne Vorschaubilder (`designs.svg`) und Zielvorschauen
   gegen `maxPending=6`. Eine Werkstattseite fragt davon Dutzende gleichzeitig ab – die meisten Kacheln wären mit
   503 `designs_busy` leer geblieben. Jetzt: Listenrechnungen weiter höchstens 6 verschiedene wartende,
   Vorschaubilder/Zielvorschauen eigene Grenze 400. Neuer Test dazu (60 gleichzeitige Vorschaubilder, keine `designs_busy`).
2. **Protokoll nach stderr** (`console.warn` wie `model_response_cache`), damit `katalog_worker`-Zeilen im selben
   `stderr.log` landen und auf dem Server auswertbar sind.

Eigene Läufe:
- `katalog-worker.test.mjs`: 17 von 17 grün.
- Nachbarn (`design-dashboard*.test.mjs`, `http.test.mjs`, `shop-entry*.test.mjs`): 193 von 193 grün.
- Messung selbst wiederholt (Katalog `b5d8f28bc1`, Linie `edelstahl-tuerschilder`, 21,1 MB):

| Weg | Aufruf | Rechendauer | größte Verzögerung im Hauptprozess |
|---|---|---|---|
| Worker | 1. | 23,4 s | 12 ms |
| Worker | 2. | 3,8 s | 6 ms |
| direkt | 1. | 22,6 s | 1188 ms |
| direkt | 2. | 5,9 s | komplett blockiert (0 Ticks) |

Dateien für die Installation (SHA-256, nach meinen Korrekturen):

| Datei | Art | SHA-256 |
|---|---|---|
| app/workshop/katalog-worker.mjs | neu | dbd62e827e8c9f63fccbb35daff2b2d195d55e4421ffa94074e786c916eee8b1 |
| app/workshop/katalog-worker-client.mjs | neu | ceffc409cb5a413b0a1f07d7019f71815549327346388b8e62a8082e855cce90 |
| app/workshop/http.mjs | ersetzt (live vorher `2a4069c72084e923`) | 781b84f33d46205d563833d78780b98469dbe705744465760bfbb8c01b2b7c77 |
| app/workshop/design-dashboard.mjs | ersetzt, aus #231-Port (live vorher `59fc7c49cc5f24ff`) | ee4b1060d2d0373789fe94cc5288dede9d6c5058dd0d02379a5a817f27907b8d |
| app/workshop/ui/design-dashboard-ui.mjs | ersetzt, aus #231-Port (live vorher `0be5a823b9bb4450`) | 6a09c4c753df70c670601949dd84faf75675ca67d2549fd69885f623cb681775 |

Schalter: in `gravuru-2027-merchant/app.cjs` vor dem `require(...)` die Zeile
`process.env.GRAVURU_KATALOG_WORKER = "enabled";`. Abschalten: Zeile entfernen, App neu starten – dann rechnet wieder der
Hauptprozess (mit #231-Zwischenspeicher).

Abnahme auf dem Server (steht aus, nur nach „live“ von Chris): nach Installation Kunden-Konfi prüfen (HTTP 200, Modell
inhaltsgleich, pixelgleich), dann Werkstatt › Designs öffnen und **gleichzeitig** von außen den Kunden-Konfi messen.
Bestanden, wenn der Konfi dabei unter 1 s bleibt. Offen bleibt bis dahin: Speicherbedarf des Workers unter den
Grenzen des Hostings (CloudLinux), Dauer des kalten Durchlaufs auf der Serverplatte.

## Nachtrag 10.11.2026, 22:40 – live, Abnahme auf dem Server, Fehler aus #231 gefunden und behoben

- Paket 1c live seit 21:55 (Hashes und Ablauf in #233). Abnahme auf dem Server bestanden: 221 Außenproben auf den
  Kunden-Konfi, während der Arbeiter rechnete im Mittel 0,53 s (max 1,44 s), in Ruhe 0,55 s (max 1,84 s), 0 Fehler.
- Befund: Linie „Acrylglas Schilder mit Abstandshaltern“ brauchte auf dem Server 120,8 s und beim zweiten Aufruf 125,3 s.
- Ursache (lokal mit echten Schriften nachgestellt und profiliert, 74 s je Aufruf): `katalogContextSig(katalog, available)`
  aus dem #231-Zwischenspeicher wurde **je Design** aufgerufen und bildet dabei jedes Mal den Schlüssel aus der kompletten
  Schriftliste (mehrere MB). 88 % der Rechenzeit. Ohne Schriften (`available={}`) fällt das nicht auf – deshalb zeigten
  die bisherigen lokalen Messungen Sekunden.
- Behebung: Signatur einmal je Anfrage (eine Zeile vor der Schleife in `designDashboard`). Antwort bytegleich
  (SHA-256 der Linie vorher/nachher identisch: `4a5b0d811214554a`).

| Linie (lokal, echte Schriften, Katalog `b5d8f28bc1`) | vorher | nachher 1. Aufruf | nachher 2. Aufruf |
|---|---|---|---|
| Acrylglas Schilder mit Abstandshaltern (1,37 MB) | 73–75 s | 1,8–2,0 s | 0,5 s |
| Edelstahl Türschilder (21,1 MB) | nicht gemessen | 22,2 s | 5,9 s |

- Neuer Test „Katalogkontext: die Schriftliste wird je Anfrage ausgewertet, nicht je Design“ (rot ohne Behebung, grün mit).
- Läufe: `katalog-worker`, `design-dashboard*`, `design-target*`, `http` – 156 von 156 grün.
- `app/workshop/design-dashboard.mjs` neu: SHA-256 beginnt `9024bbaabc956168` (ersetzt `ee4b1060d2d03737`).
- Derselbe Fehler steckt in `main` (PR #231) – dort ebenfalls zu beheben.

## Paket 1c-2 (10.11.2026, spät): Vorrechnen, Zwischenspeicher auf Platte, Messwerte

Anlass: Nach der Behebung lädt eine kleine Linie auf dem Server in 2,3 s, der erste kalte Durchlauf der Linie
„Edelstahl Türschilder“ lief dort aber über 12 Minuten (lokal 22 s) und beginnt nach jedem Neustart von vorn.

Gebaut (Operator):
- **Zwischenspeicher auf Platte:** Der Arbeiter sichert den Rechenstand der Designliste nach Listenrechnungen als
  `katalog-worker-cache.json.gz` neben der Werkstatt-Datenbank (lokal 0,78 MB für 13.678 Einträge) und lädt ihn beim Start.
  Ein Eintrag gilt wie bisher nur bei passender Signatur (Zeitstempel+Größe der Designdateien, Linie, Katalogkontext).
  Die Datei gilt nur für genau den installierten Programmstand (Fingerabdruck über alle Module der Werkstatt und des
  Konfigurators) – nach jeder Installation wird einmal neu gerechnet. Unlesbare Datei wird ignoriert.
- **Vorrechnen:** 20 s nach dem Start rechnet der Arbeiter alle Linien einmal im Hintergrund (`designs.warm`), meldet je
  Linie Dauer und Erfolg (`katalog_worker_warm`) und sichert danach. Abschaltbar: `GRAVURU_KATALOG_WORKER_WARM=off`.
- **Messwerte im Protokoll** je Aufruf: `msList`, `msSerialize`, `msRun`, `cpuMs` (Rechenzeit des Threads). Liegt `cpuMs`
  weit unter `msRun`, wartet der Arbeiter auf die Platte oder wird vom Hosting gebremst – damit lässt sich die Ursache
  der langen Serverläufe belegen statt vermuten.
- `design-dashboard.mjs`: `exportDashboardCache`/`importDashboardCache`/`dashboardCacheWrites` (nur einfache JSON-Werte
  werden gesichert; geprüft am echten Katalog: 0 übersprungene Einträge).

Lokale Abnahme mit echtem Katalog (`b5d8f28bc1`), über HTTP mit Schalter:

| Schritt | Ergebnis |
|---|---|
| Vorrechnen aller 13 Linien nach dem Start | 42 s, 0 Fehler (Edelstahl 17,2 s, Acryl-Türschilder 12,9 s) |
| Edelstahl-Linie nach dem Vorrechnen | 4,3 s |
| „Neustart“, Edelstahl-Linie sofort (ohne Vorrechnen, Speicher von Platte) | 8,2 s statt 22 s kalt, Antwort bytegleich |
| nach dem Laden neu gerechnete Einträge | 0 |

Tests: `katalog-worker` (21), `design-dashboard*`, `design-target*`, `http` – zusammen 159 von 159 grün. Neu: Plattenspeicher
(Laden, anderer Programmstand, geänderte Datei, beschädigte Datei), Sichern/Laden über den Worker mit Messwerten, Vorrechnen.

Offen: Wirkung auf dem Server (kalter Durchlauf dort, Speicherbedarf) – erst nach Installation messbar.

### Nachtrag 10.11.2026, 23:30 – Speicherbefund, Speicherwächter, Vorrechnen nur auf Wunsch

- Serverprotokoll um 23:14 gelesen: Der Durchlauf „Edelstahl Türschilder“ (gestartet ca. 22:27) wurde **nie** als fertig
  protokolliert. CloudLinux-Statistik „Heute“ für das Konto `gravuru_werkstatt`: Arbeitsspeicher im Mittel 1,38 GB bei
  Grenze 4 GB, **3 Überschreitungen der Speichergrenze** (Zeitpunkte dort nicht ablesbar); CPU-Grenze 400 %, Lesegrenze
  50 MB/s, jeweils 0 Überschreitungen. Die Vermutung „Lese-Begrenzung des Hostings“ ist damit **nicht** gestützt; naheliegend
  ist, dass der Prozess an der Speichergrenze beendet wurde. Belegt ist das noch nicht.
- Deshalb: **Vorrechnen ist nicht mehr automatisch an**, sondern nur mit `GRAVURU_KATALOG_WORKER_WARM=enabled`
  (sonst könnte es nach jedem Start dieselbe Lage auslösen).
- **Speicherwächter** im Hauptprozess: solange der Worker rechnet, wird jede Sekunde der Arbeitsspeicher des Prozesses
  geprüft; über `GRAVURU_KATALOG_WORKER_MAX_RSS_MB` (Standard 2200) wird nur der Worker beendet (503 `designs_memory`,
  Protokoll `katalog_worker_lost` mit Messwert). Die eingebaute Speichergrenze für Worker-Threads (`resourceLimits`) hat
  im Versuch mit Node 24.22 nicht gegriffen (456 MB belegt bei Grenze 32 MB) und wird deshalb nicht verwendet.
- Protokoll zusätzlich: `heapMb` (Worker), `rssMb` (Prozess) je Aufruf, `katalog_worker_ready` mit Prozessnummer beim
  Start (so ist ein unbemerkter Neustart des Prozesses erkennbar), `katalog_worker_lost` bei jedem Ausfall.
- Lokal gemessen (ein Prozess, ohne Worker): Linie Edelstahl Spitze 967 MB Arbeitsspeicher, kleine Linie 641 MB.
- Tests der betroffenen Dateien: 160 von 160 grün (neu: Speicherwächter).
