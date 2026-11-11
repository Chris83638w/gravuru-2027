# Paket 1a-2: Trefferpfad des Modellabrufs entlasten – Bauanleitung (10.11.2026)

Operator: Claude (Auftrag Chris im Claude-Chat, 10.11.2026: „Ja, mach weiter“). Bauer: Sonnet. Abnahme: Operator. Entscheidungen: Issue #229. Vorgeschichte: [2026-11-10-paket1-modellantwort-live.md](2026-11-10-paket1-modellantwort-live.md).

## 1. Beleg (live gemessen, 10.11.2026 ca. 11:45, Commit `c1649ad` live, Speicher an)

Protokollzeile `model_response_cache` in `gravuru-2027-merchant/stderr.log`, Summen je Minute, alle Abrufe Speichertreffer:

| Abschnitt | 4 Treffer | 5 Treffer | je Abruf |
|---|---|---|---|
| `msContext` – `activeContext`: Sitzung, Begrenzer, `resolve()` → `store.registry.resolve(identity)` | 874 ms | 1305 ms | ca. 220–260 ms |
| `msChecks` – `requireApproval` ×2 (`orderIntake.catalogLiveApproval`), `konfis.paused` | 462 ms | 637 ms | ca. 115–130 ms |
| `msStartPublic` – `publicPreviews.attach` (`current` → `modelFor`, `checkBinding`; `lookup` → `sourceDigest`, `choices`) | 1262 ms | 1796 ms | ca. 315–360 ms |
| `msState`, `msStartGallery`, `msSend` zusammen | 19 ms | 23 ms | unter 5 ms |

Von außen: Abruf ca. 0,85 s ohne TLS; ein billiger Abruf derselben App ca. 0,13 s. Die drei Abschnitte oben erklären die Differenz. Alles läuft synchron im einen Node-Prozess, deshalb stapeln sich gleichzeitige Abrufe.

Live-Produkt: Türschild Edelstahl, Produktdokument ca. 12 MB, 251 Designs, 80 Größen, 404 Varianten, Katalog-Freigabe an (`GRAVURU_CATALOG_LIVE_ORDERS`), öffentlicher Vorschauspeicher an (`GRAVURU_PUBLIC_PREVIEW_DIRECTORY`).

## 2. Auftrag

### Phase A – Ursache belegen (kein Livezugriff)

1. `scripts/customer-model-benchmark.mjs` um einen live-nahen Aufbau erweitern (Schalter, z. B. `--live-like`): Zuordnung mit ca. 400 Varianten, Katalog-Freigabe an, öffentlicher Vorschauspeicher an (temporäres Verzeichnis), Dokument ca. 12 MB, 250 Designs. Ziel: Die drei Abschnitte werden lokal in ähnlicher Größenordnung sichtbar (`msContext`, `msChecks`, `msStartPublic` aus der vorhandenen Messung auslesen).
2. Mit `node --cpu-prof` oder gezielten Zeitmessungen belegen, **welche Funktionen** in den drei Abschnitten die Zeit kosten (erwartet, aber zu prüfen: wiederholtes Lesen/`JSON.parse` großer Dokumente oder Pläne, `structuredClone`, `JSON.stringify`+SHA-256 über das ganze Modell, Schleifen über alle Varianten/Designs).
3. Ergebnis als Tabelle in den Bericht (Funktion, Datei, ms je Abruf).

Lässt sich ein Abschnitt lokal nicht nachstellen: nicht raten, im Bericht benennen und diesen Abschnitt unverändert lassen.

### Phase B – nur das Belegte entlasten

Grundsatz: **Jede Prüfung bleibt je Abruf bestehen.** Erlaubt ist, eine reine Ableitung aus unveränderten Daten wiederzuverwenden, wenn im selben Abruf ein billiger Frischebeleg gelesen wird (z. B. Revision/Änderungsmarke per schlanker SQL-Abfrage ohne große Spalten, wie `repository.revisionState`), und der Beleg Teil des Schlüssels ist. Nicht erlaubt: eine Entscheidung (zugeordnet, freigegeben, pausiert) über eine Änderung hinweg zu merken, Prüfungen zu überspringen, auf Zeitablauf zu setzen.

- Antwort, Fehlercodes, Fehlertexte und Reihenfolge der Prüfungen bleiben identisch (bytegleich bis auf `expiresAt`, `startPreview.target`).
- Kundenseite eingefroren: keine Änderung unter `app/configurator/**`, `app/workshop/ui/**`; nichts an dem, was der Kunde sieht oder bedient. Ebenfalls tabu: `ops/**`, `package.json`.
- `app/workshop/http.mjs`: nur wenn Phase A dort Kosten belegt; dann kleinstmöglich und im Bericht ausdrücklich für Mikas Review markieren.
- Gemerkte Werte: begrenzt (Anzahl und Bytes), je Store getrennt, keine Kunden- oder Sitzungsdaten, kein gemeinsam veränderbares Objekt nach außen (einfrieren oder kopieren, was Aufrufer verändern könnten).
- Wirkt eine Entlastung nur mit dem Antwortspeicher sinnvoll, hängt sie am vorhandenen Schalter `GRAVURU_CUSTOMER_MODEL_CACHE`; kein neuer Schalter.
- Die Messfelder (`timed`, `ms…`) bleiben.

## 3. Tests

Je Entlastung mindestens: gleicher Wert bei unverändertem Stand; neuer Wert sofort nach jeder relevanten Änderung (Zuordnung geändert/entfernt, Freigabe entzogen, Konfi pausiert, Produkt veröffentlicht/archiviert, neue Revision); Fehlerfälle mit gleichem Code und Status wie vorher; fremder Mandant bekommt nie einen gemerkten Wert. Bestehende Suiten bleiben grün (bekannt rot auf der Basis `8ceb866`: 8 Tests, siehe Issue #229 – nicht anfassen).

Start: `export GRAVURU_PYTHON=$(which python3)`; Node 24 liegt unter `/home/claude/tools/node_modules/.bin/node`.

## 4. Abnahme

1. Live-naher Benchmark: Speichertreffer im Mittel unter 60 ms (vorher in derselben Messung angeben), vier gleichzeitige Treffer unter 250 ms gesamt.
2. Antwort vor/nach bytegleich im Benchmark (bis auf die zwei Sitzungsfelder).
3. Diff nur in den Dateien, in denen Phase A Kosten belegt hat, plus Tests, Benchmark, Bericht, `STATUS.md`.
4. Bericht `docs/handoffs/2026-11-10-paket1a2-trefferpfad-ergebnis.md`: Phase-A-Tabelle, was geändert wurde und warum es keine Prüfung abschwächt, Messung vorher/nachher, was nicht geprüft ist. Eintrag oben in `STATUS.md`.
5. Commits auf `dev/claude-paket1-modellantwort-20261110`, kein Push auf andere Branches, nichts live.

## 5. Abbruch und Rückfrage

Sofort stoppen und im Bericht melden statt bauen, wenn: eine Entlastung nur durch Weglassen oder Verzögern einer Prüfung möglich wäre; die Ursache außerhalb von `app/workshop/**` liegt; mehr als ca. 250 geänderte Produktivzeilen nötig würden.
