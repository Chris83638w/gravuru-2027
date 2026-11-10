# Paket 1c – Katalog-Arbeiter: Designliste aus dem Kundenprozess nehmen (Bauanleitung)

Stand: 10.11.2026, Operator Produktkette (Claude). Auftrag Chris im Chat: „1c“ → „ja“ (19:10).
Issue: #229 (Leistung), Anlass: Störung 10.11. ca. 18:38–18:53, siehe #233.

## 1. Warum

Die Werkstatt-Seite „Designs“ rechnet synchron im selben einzigen Node-Prozess wie der Kunden-Konfi.
Solange sie rechnet, antwortet die ganze App nicht. Auf dem Server hat das heute die App über 13 Minuten
angehalten (kalter Katalog, langsame Platte, rund 76.000 Dateien).

Lokale Messung (Katalog `b5d8f28bc1`, Betriebssystem-Cache warm), Code dieses Branches:

| Schritt | Dauer |
|---|---|
| `openKatalog(root)` | 0,9–2,1 s |
| Übersicht (`designDashboard(root,{})`) | 2,0 s |
| Linie `edelstahl-tuerschilder` mit Fit, 1. Aufruf | 22,1 s |
| dieselbe Linie, 2. Aufruf | 3,3 s |
| Antwortgröße der Linie | 21 MB JSON |

Wichtig: `katalogFor()` merkt sich den geöffneten Katalog nur 2 Sekunden. Praktisch öffnet **jeder**
Aufruf den Katalog neu. `targetDesignPreview` und `designFile` tun das ebenfalls im Hauptprozess.

## 2. Ziel

Die lesenden Katalog-Rechnungen der Werkstatt laufen in **einem dauerhaften Worker-Thread**
(`node:worker_threads`). Der Hauptprozess bleibt währenddessen frei für Kundenanfragen.
Die Antworten bleiben **bytegleich** zum heutigen Verhalten.

## 3. Rahmen (verbindlich)

- Arbeitsverzeichnis: `/home/claude/paket1c`, Branch `dev/claude-paket1c-katalog-arbeiter-20261110`
  (Basis `38dab40`). Das ist der Live-Stand plus #231-Port. **Nicht** auf `main` umstellen, nichts von
  `main` kopieren – live weicht von `main` ab.
- Node 24: `/home/claude/tools/node_modules/.bin/node`. Keine neuen Abhängigkeiten (Projekt hat null).
- Tests: `GRAVURU_PYTHON=$(which python3) /home/claude/tools/node_modules/.bin/node --test <dateien>`.
- **Kundenseite ist eingefroren:** keine Änderung unter `app/configurator/variant-m/`, keine Änderung
  an Kunden-Endpunkten (`/api/shop-entry/*`, `/konfigurator/*`), keine Änderung an der Werkstatt-Oberfläche.
- Bestehende Dateien so wenig wie möglich anfassen. Erwartet wird: **nur `app/workshop/http.mjs`**
  (kleine Weiche an drei Aufrufstellen) plus neue Dateien. `design-dashboard.mjs`, `repository.mjs`,
  `katalog-source.mjs`, `design-target-preview.mjs` bleiben unverändert. Wenn du eine weitere bestehende
  Datei ändern musst: begründen und im Ergebnis ausweisen.
- Kein Serverzugriff, kein Push, keine Arbeit außerhalb dieses Verzeichnisses (lesen darfst du
  `/home/claude/katalog` als Katalog für Messungen; dort nichts ändern außer `git checkout`).
- Schalter: Umgebung `GRAVURU_KATALOG_WORKER=enabled` schaltet den Worker ein. **Ohne den Schalter
  exakt das heutige Verhalten**, es wird kein Worker erzeugt. (Gleiches Muster wie
  `GRAVURU_CUSTOMER_MODEL_CACHE` aus Paket 1a.)

## 4. Aufbau

### 4.1 Neue Datei `app/workshop/katalog-worker.mjs` (läuft im Worker)

- Start über `workerData`: `{dbFile, tenantId, available}`; `available` ist das heutige `formFonts`
  aus `http.mjs` (prüfe, dass es per structured clone übertragbar ist; wenn nicht, löse das sauber und
  beschreibe es).
- Nachrichten `{id, op, root, args, acceptGzip}`. Operationen:
  - `designs.list` → `designDashboardWithFit(root,{...args, repository: reader, available})`.
  - `designs.targetPreview` → `targetDesignPreview(root, args, {available})`.
  - `designs.svg` → genau das, was der Handler heute tut: `designFile(root, args)`, dann für SVG
    `designPreviewGlyphs({file,root,available})`, sonst Datei lesen. Ergebnis: Typ, Bytes, Warnungen.
- Der Worker serialisiert selbst: `JSON.stringify` und – nur wenn `acceptGzip` und Rohgröße ≥ 262144 –
  `gzipSync(raw,{level:6})`. Er schickt fertige Bytes als übertragene `ArrayBuffer` zurück
  (Transferliste), damit der Hauptprozess keine 21 MB serialisieren muss.
- Fehler: geworfene Fehler mit `status`/`code`/`message` unverändert zurückgeben
  (`{ok:false,status,code,message}`), damit der Hauptprozess dieselbe Fehlerantwort schreibt wie heute.
- **Nur-Lese-Datenbank im Worker:** `new DatabaseSync(dbFile,{readOnly:true})`, `PRAGMA busy_timeout=5000`.
  Kein `createProductRepository` im Worker (das schreibt beim Öffnen). Der Leser bietet genau die zwei
  Methoden, die `konfiProducts()` braucht, mit derselben Bedeutung wie im Repository:
  - `importItem(key)` → `SELECT import_key, fingerprint, product_id FROM import_items WHERE import_key = ? AND tenant_id = ?`
    → `{key,fingerprint,id}` oder `null`.
  - `get(id)` → Zeile aus `products` (id, tenant), dann die Kopf-Revision aus `product_revisions`
    → `{id, revision, publishedRevision, status, document, metadata, createdAt, updatedAt}`;
    nicht gefunden → Fehler wie im Repository (wird in `konfiProducts` ohnehin abgefangen).
  - Wenn im Hauptprozess kein Repository/keine Datei vorhanden ist: `reader=null`.
- Katalog-Wiederherstellung (`recoverKatalogIfNeeded`) nutzt eine `mkdir`-Sperre mit PID. Zwei Threads
  desselben Prozesses schließen sich darüber gegenseitig aus (der zweite bekommt 409). Das ist in Ordnung;
  bitte im Ergebnis kurz bestätigen, dass du es am Code nachvollzogen hast.

### 4.2 Neue Datei `app/workshop/katalog-worker-client.mjs` (läuft im Hauptprozess)

`createKatalogWorker({dbFile, tenantId, available, logger, maxPending=6})` → `{call(op, root, args, {acceptGzip}), close()}`.

- Worker wird **erst beim ersten Aufruf** gestartet, `unref()`, bleibt danach am Leben (seine
  Zwischenspeicher aus #231 bleiben so warm).
- **Gleiche Anfragen zusammenlegen:** identische laufende Aufrufe (Schlüssel aus op, root, args,
  acceptGzip) teilen sich ein Ergebnis. Genau das hat heute gefehlt: Neuladen der Seite hat die
  Warteschlange verlängert.
- **Obergrenze:** mehr als `maxPending` verschiedene wartende Aufrufe → sofort Fehler
  `status 503, code 'designs_busy'`, Text: „Die Designliste rechnet gerade. Bitte in einer Minute erneut laden.“
- Worker-Absturz/-Ende: alle wartenden Aufrufe mit 503 `designs_worker` beenden, beim nächsten Aufruf
  neu starten. Kein stiller Rückfall auf die Rechnung im Hauptprozess.
- Protokoll je Aufruf über `logger`: `{event:'katalog_worker', op, ms, bytes, gzip, pending, shared, ok}`.
  Keine Pfade, keine Kundendaten, keine Tokens.

### 4.3 Weiche in `app/workshop/http.mjs`

- Nur wenn `process.env.GRAVURU_KATALOG_WORKER==='enabled'` (einmal beim Erzeugen lesen): Client anlegen.
- Aufrufstellen: `GET /api/workshop/designs` (Zeile mit `designDashboardWithFit`),
  `GET /api/workshop/designs/target-preview`, `GET /api/workshop/designs/svg`.
- Alle Prüfungen davor (Sitzung, Mandant, `ownsBundled`, Methode, `startDesigns`-Prüfung, `katalogRoot()`)
  bleiben unverändert und in derselben Reihenfolge im Hauptprozess.
- Antwort schreiben mit **denselben Kopfzeilen** wie heute (`jsonMaybeGzip` bzw. `json` bzw. der
  SVG-Zweig inkl. Warn-Kopfzeile und CSP). Körper bytegleich zum Weg ohne Worker.
- `PATCH` und alle schreibenden Wege bleiben im Hauptprozess wie bisher.
- Beim Schließen der Werkstatt (falls es eine `close()`-Stelle gibt) den Worker beenden.

## 5. Tests (neu, `node --test`, im Stil der vorhandenen Dateien)

1. **Bytegleichheit** Worker gegen direkten Aufruf: Übersicht, eine Linie, Filter
   (`status`, `freigabe`, `reihe`, `material`, `startDesigns`), mit und ohne gzip (gzip entpackt vergleichen),
   `target-preview`, `svg`. Nutze die vorhandenen Katalog-Fixtures der Design-Dashboard-Tests.
2. **Fehlergleichheit:** unbekannte Linie (404), ungültiger Status (422), unbekannte Designdatei (404):
   Status, Code und Text identisch zum direkten Weg.
3. **Leser-Vertrag:** `importItem`/`get` des Worker-Lesers liefern für eine echte Testdatenbank dasselbe wie
   das Repository (Felder id, revision, status, document).
4. **Zusammenlegen:** drei gleichzeitige identische Aufrufe → eine Rechnung im Worker, drei gleiche Antworten.
5. **Obergrenze:** bei vollem Wartestand kommt 503 `designs_busy`.
6. **Absturz:** Worker endet mitten im Aufruf → 503, nächster Aufruf funktioniert wieder.
7. **Hauptprozess bleibt frei** (der eigentliche Zweck): Während der Worker mindestens 500 ms rechnet,
   misst ein 10-ms-Intervall im Hauptprozess die größte Verzögerung; sie muss unter 100 ms bleiben.
   Dafür darf der Worker eine reine Test-Operation haben, die nur verfügbar ist, wenn sie über
   `workerData` ausdrücklich eingeschaltet wurde (nicht über die Umgebung des Servers erreichbar).
8. **Schalter aus:** ohne `GRAVURU_KATALOG_WORKER` wird kein Worker erzeugt und die Antworten sind die
   bisherigen.
9. Bestehende Tests: vor deiner Änderung die komplette Suite einmal laufen lassen und das Ergebnis als
   Ausgangsstand notieren (`node --test app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs`).
   Nach der Änderung: **kein** zusätzlicher roter Test.

## 6. Messung (im Ergebnis berichten)

Kleines Skript unter `scripts/` (z. B. `check-katalog-worker.mjs`), das gegen `/home/claude/katalog`
(vorher `git -C /home/claude/katalog checkout -q b5d8f28bc1b634412e628c2967fde587a92ff2fb`, danach zurück auf
`8236b8bfa`) die Linie `edelstahl-tuerschilder` über den Worker-Client rechnet und dabei im Hauptprozess
mit einem 10-ms-Intervall die größte Verzögerung misst. Erwartung: Rechnung dauert Sekunden,
Hauptprozess-Verzögerung bleibt unter 100 ms. Zum Vergleich dieselbe Messung mit direktem Aufruf.

## 7. Abgabe

- Commit(s) auf dem Branch, deutsch, Ende der Commit-Nachricht:
  ```
  Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01TdYiUbHC2S4uPmDEgT1D6P
  ```
- Ergebnisdatei `docs/handoffs/2026-11-10-paket1c-katalog-arbeiter-ergebnis.md`: was gebaut wurde,
  Liste aller neuen/geänderten Dateien mit SHA-256, Testergebnis vorher/nachher mit Zahlen, Messwerte,
  Abweichungen von dieser Anleitung mit Begründung, offene Punkte, Risiken.
- Nicht pushen. Nichts auf dem Server. Nichts löschen außerhalb deiner eigenen neuen Dateien.

## 8. Was ausdrücklich nicht dazugehört

- Schreibende Katalog-Wege (PATCH, Editor, Rückschreiben, Linienpflege) – bleiben im Hauptprozess.
- Änderungen an der Reihenfolge, am Inhalt oder an den Regeln der Designliste.
- Der 2-Sekunden-Speicher in `katalogFor()` – bleibt, wie er ist.
