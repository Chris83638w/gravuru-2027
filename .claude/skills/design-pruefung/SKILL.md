---
name: design-pruefung
description: Design Prüfung Skill – Chris geht Designs einzeln auf einer Prüfseite durch (Ja/Nein + Kommentar je Design), Claude liest die Antworten aus und setzt sie im Katalog um. IMMER verwenden bei „Designs durchgehen“, „Prüfrunde“, „ja oder nein sagen“, „einzeln prüfen“, „Design Prüfung“, oder wenn Chris über viele Designs einzeln entscheiden soll.
---

# Design Prüfung Skill (Chris, 04.11.2026)

Chris: „ich muss dir die einzelnen Designs anklicken und kommentieren können. Einfacher wäre wenn alle nacheinander durchgehen und ich ja oder nein sage“ – „So gehen wir jetzt alles bei Bedarf durch.“

Statt Kontaktbögen mit Rückfragen im Chat: **eine Prüfseite**, ein Design nach dem anderen, groß, mit **Ja / Nein** (Tasten J / N, ← →), **Kommentar je Design**, Übersicht zum Anklicken und Filter (Offen / Ja / Nein / Mit Kommentar). Antworten liegen in der Datenbank der Seite und werden von Claude direkt gelesen.

## Feste Prüfseite
- **https://claude.ai/artifact/41X3tZ1QMHyqEZNum3WPQo** („Designprüfung Edelstahl“, privat bei Chris).
- Neue Runden immer auf **dieser** Seite (Artifact-Publish mit `url`), damit Chris einen Link behält. Ältere Runden bleiben über die Auswahl oben wählbar; ihre Antworten bleiben gespeichert.
- Datenbank: Sammlung `antworten`, Dokument `<runde>~<key>`, Felder `runde, design, reihe, groesse, antwort ("ja"|"nein"|null), kommentar, geaendert`.
- Nur Claude-Chats in Chris' Konto können die Seite veröffentlichen und die Antworten lesen (Tools `Artifact` und `ArtifactData`). Andere KIs (Astra/Codex) bauen die Runde mit dem Skript und hängen den Ordner an GitHub; ein Claude-Chat veröffentlicht sie.

## Ablauf
1. **Frage klären, bevor gerendert wird.** Eine Runde = eine Ja/Nein-Frage, die Chris ohne Erklärung beantworten kann („Gilt die Regel ‚nicht unter 9 × 6‘ für dieses Design?“). Was Ja und Nein bewirken, steht auf den Knöpfen (`--ja-text`, `--nein-text`) und in den Infozeilen. Nichts festlegen, was Chris nicht gesagt hat (ENTSCHEIDUNGEN.md / Register).
2. **Rendern – nur mit dem Renderer** (Register 7.18), in der Größe, um die es geht:
   ```
   node scripts/render-vorlagen.mjs --katalog <Katalog> --familie <id> --design "ID1;ID2" --png --breite 700 --out <Renderer-Ordner>
   ```
   Beschriftung kommt aus der wirklich gerenderten Größe (`size` in `index.json`). Größen, die für ein Design nicht erlaubt sind (z. B. `mindestFlaecheCm2`), rendert der Renderer nie.
3. **Runde bauen:**
   ```
   node scripts/design-pruefung.mjs --aus <Renderer-Ordner> --out <Seitenordner> --runde <thema-JJJJMMTT> \
     --titel "…" --frage "…" --ja "Ja, …" --ja-text "…" --nein "Nein, …" --nein-text "…" \
     [--zeilen zeilen.json] [--hinweise hinweise.json] [--reihennamen namen.json]
   ```
   - Für eine Folgerunde zuerst die aktuelle `liste.json` der Seite holen (`Artifact` action `read`, `path: "liste.json"`) und in `<Seitenordner>` legen: das Skript hängt die neue Runde an.
   - `zeilen.json`: je Design Infozeilen, z. B. `[["Bei Ja fällt weg","8 × 5"],["Bleibt","9 × 6, 12 × 8"]]`.
   - Ergebnis: `index.html`, `liste.json`, `bilder/<runde>/*.webp`, `files.json`.
4. **Veröffentlichen** (Claude): `Artifact` publish mit `url` der festen Prüfseite, `file_path` = `<Seitenordner>/index.html`, `root` = `<Seitenordner>`, `files` = Inhalt von `files.json` (nur neue Dateien; alte bleiben). `capabilities` weglassen (bleibt `{db:{}}`). Erste Veröffentlichung einer neuen Seite: `capabilities: {db: {}}`.
5. **Chris Bescheid geben**: ein Satz, was die Runde fragt und wie viele Designs. Nicht im Chat jedes Design einzeln abfragen.
6. **Auslesen**, wenn Chris „fertig“ sagt:
   - `ArtifactData` action `list`, `collection: "antworten"`, `query.limit: 1000`, `out_dir: <Ordner>`.
   - `node scripts/design-pruefung-auswerten.mjs --antworten <Ordner>/antworten --runde <id> --liste <Seitenordner>/liste.json --json ergebnis.json`
   - Offene Designs und **jeden Kommentar** ernst nehmen: Kommentare sind Anweisungen von Chris zu genau diesem Design; bei Unklarheit fragen.
7. **Umsetzen** im Katalog-Repo auf einem Branch `dev/<thema>-<datum>-claude`, nur das, was die Antworten sagen. Mit dem Renderer gegenprüfen, Commit mit Zähler (x Ja / y Nein) und Zitat, PR, Astra 1 in #139 auf die Merge-Liste. Entscheidung ins Register (Nachtrag im Projekt).

## Regeln
- Bilder **immer aus dem Renderer**, nie im Konfi klicken, nie frei skizzieren (1:1 wie im Konfi).
- Eine Frage je Runde; lieber zwei kurze Runden als eine mit gemischten Fragen.
- Runden-Kennung stabil und eindeutig (`thema-JJJJMMTT`), nie wiederverwenden.
- Keine Antworten selbst setzen oder ändern; die Datenbank enthält nur Chris' Klicks.
- Live (Shopify) nur mit Chris' Satz.

## Erste Runde (Beispiel)
`filigran-hinweise-20261104`: 71 Hinweis-/Boxenschilder mit D-Nummer aus der Filigran-Liste, Frage „Gilt die Regel ‚nicht unter 9 × 6‘ für dieses Design?“ → 19 Ja, 52 Nein, umgesetzt in Katalog-PR #168.
