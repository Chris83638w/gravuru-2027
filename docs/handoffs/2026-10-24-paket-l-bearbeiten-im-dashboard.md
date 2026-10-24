# Paket L · Designs direkt im Dashboard bearbeiten · 24.10.2026

Für **Astra High** (Codex, GPT-5, Reasoning high). Basis: Code `main` (≥ afb91cb), Katalog `main` (≥ 27d46be).

Entscheidung Chris (24.10.): **„Bearbeiten direkt im Dashboard“**. Vorgeschichte: Am 22./23.10. sagte Chris: „Wir
brauchen das Dashboard, um die Designs Linie für Linie bearbeiten zu können. Viele Designs haben noch Fehler, welche
wir manuell ändern werden.“ Zugesagt war: Design prüfen → im Editor korrigieren → zurück in den Katalog. Heute gibt
es „Im Editor öffnen“ nur für importierte Konfi-Produkte (auf dem Händlerhost ist noch nichts importiert). Der
Rückweg existiert nur als Skript für Texte (`app/workshop/katalog-writeback.mjs`, `scripts/katalog-writeback.mjs`).
Chris will „praktisch einen Konfi im Dashboard“.

---

Du bist Programmierer im Projekt gravuru 2027 (Chris, Inhaber; Deutsch, Du, kurz). Boss ist Claude: Er prüft und
merged. Branch `dev/dashboard-bearbeiten-20261024-astra`, PR gegen `main` mit Bericht, Absatz oben in `STATUS.md`.

**Ziel:** Je Design (Lieferform 2) ein Knopf **„Bearbeiten“** im Design-Dashboard, am Desktop und am Handy (Paket-K-
Layout). Er öffnet den vorhandenen Werkstatt-Editor mit dem Katalogdesign als Vorlage, **ohne Import und ohne
Konfi-Produkt**. Dazu gehören die richtige Platte (Master-`plateMm`, Form Rechteck/abgerundet/Oval/Kontur samt
Lochschutzzonen), Katalogschriften, Hilfslinien und Einrasten wie im Konfi. Keine zweite Editor- oder
Geometrielogik: `katalogDesignToTemplate`/`scaleTemplate` hin, und zurück eine gemeinsame Umrechnung, die
`katalog-writeback` erweitert und ersetzt. Das Skript nutzt danach dieselbe Funktion.

**Bearbeitbar (erste Stufe):** Texte (Inhalt, Schrift aus `schriften/schriften.json`, Größe, Lage, Ausrichtung,
Laufweite), Text hinzufügen/entfernen, Motive verschieben/skalieren (seitenverhältnistreu) und entfernen. Lieferform
2 bleibt: Text bleibt Text, Motive bleiben einfarbige Pfade beim Design. Neue Motive aus `motive/` kommen später und
nur auf ausdrücklichen Wunsch.

**Speichern** (`PUT/PATCH` hinter derselben Händleranmeldung, Token-Weg wie Paket I/K):
1. Den Editorstand in Master-mm zurückrechnen. `design.json` **und** `design.svg` schreiben, Geometrie identisch
   (Texte als `<text>/<tspan>` wie bisher, Motivpfade transformiert wie in Paket J). Atomar schreiben.
   Konfliktschutz über Prüfsumme (409, wenn die Datei inzwischen geändert wurde).
2. Vor dem Speichern `templateFit` für alle `sizes` des Designs anzeigen (passt / prüfen / passt nicht je Größe).
   Speichern ist auch bei „passt nicht“ möglich, aber mit deutlichem Hinweis. Nichts still korrigieren.
3. Eine Inhaltsänderung **setzt `freigabe` zurück** (neue Sichtprüfung nötig). Name, Themen und Ausblenden bleiben
   wie bisher ohne Rücksetzung.
4. Protokoll in `designs/<reihe>/_aenderungen.jsonl`: Urheber aus der Sitzung, Zeitpunkt, alt → neu je Element.
5. Danach lädt das Dashboard die Zeile neu. Die Vorschau zeigt den neuen Stand (der Cache aus Paket K hängt an der
   Prüfsumme). „Änderungen verwerfen“ vor dem Speichern.
   Auf dem Host landen die Änderungen in der Katalog-Arbeitskopie. Claude sichert sie mit `katalog-host.sh save`
   nach `host/werkstatt` und merged nach Prüfung. Die App macht keinen Git-Commit.

**Abnahme:** Tests:
- Rundlauf ohne Änderung, mit gleichem Ergebnis (Bytes oder fachlich gleich, begründet).
- Textänderung, Schriftwechsel, Text hinzufügen/entfernen.
- Motiv verschieben/skalieren auf Rechteck, Oval und Kontur (Retro II mit Lochschutz).
- Freigabe-Rücksetzung, Protokoll, 409-Konflikt, Pfadausbruch.
- Eingebetteter Token-Weg, `acrylRoute` für neue Routen.
- Bestehende Dashboard-, Editor-, Katalog- und Writeback-Tests grün.

Playwright-Nachweis auf einer **Katalogkopie** (nie dem echten Katalog), Desktop 1280 px und iPhone 13: D57 öffnen,
Namen ändern, Motiv verschieben, Fit-Anzeige, speichern, Vorschau aktualisiert, Freigabe zurückgesetzt. Stichprobe
Retro II D12 und ein Oval.

Regeln wie immer: keine Freigabe setzen, keine Live-Systeme, kein Import, kein Merge, kein Force-Push, nichts
erfinden (Maße aus Familie/Zeichnung), Kennungen stabil, LF-Zeilenenden, keine Schriftdateien ins Code-Repo.
