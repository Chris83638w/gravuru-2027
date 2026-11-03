# Übergabe: Edelstahl-Schilder und Vorlagen-Renderer (Stand 04.11.2026, 00:20)

Für den nächsten Chat. **Nur Edelstahl-Schilder.** Zuerst das Entscheidungsregister lesen (`ENTSCHEIDUNGEN.md` im Repo-Stamm dieses Branches; gleicher Inhalt wie das Projekt-Dokument `claude/Entscheidungsregister-Chris.md`); neu sind dort 3.40, 4.49–4.51 und 7.18.

Arbeitsregeln von Chris:
- Immer Deutsch, Du-Form, „Chris“ ansprechen.
- „Wenn etwas ist, stell mir bitte eine Frage“: nicht deuten, nichts selbst festlegen, was er nicht gesagt hat.
- Befunde immer mit Screenshot.
- Live nur mit seinem Satz.
- Nachrichten an Astra auf GitHub (#139 = Astra 1, Konfi-Code).

## Was fertig ist

### 1. Vorlagen-Renderer (gravuru-2027 PR #163, Branch `dev/render-vorlagen-20261103-claude`)
`scripts/render-vorlagen.mjs` rendert Katalogdesigns oder leere Grundplatten als SVG/PNG und, wenn gewünscht, einen Kontaktbogen mit Prüfstatus („passt“, „prüfen“, „passt nicht“).
- Es klickt keinen Browser. Der Zeichencode ist derselbe wie im Konfi (`targetDesignPreview` → `productPreview` → `studioSvg`), die Prüfung dieselbe wie in der Werkstatt (`assessDesignTarget`).
- Ergänzt in `product-preview.mjs`:
  - Schraubenköpfe wie im Konfi (`screwPreview`);
  - Option `mountingPlacement` (Ausweichen wie im Konfi beim Wechsel auf Bohrung).
- Ergänzt in `design-target-preview.mjs`: Optionen `katalog` (einmal öffnen, 15–25 ms statt 1,4 s je Design) und `preview`.
- Gemessen:
  - 80 Grundplatten: 17 s.
  - 16 Designs: 6 s.
  - 195 Designs inklusive PNG und Kontaktbogen: 94 s.
- Gegen den echten lokalen Konfi verglichen (Design geladen, Befestigung geklickt): identisch.

Wichtig für den Vergleich: Ein Testprodukt braucht `categoryIds: ['familie-steel-door-signs']`, sonst weicht der Konfi nicht aus (`http.mjs` setzt `mountingPlacementFamily`).

```
node scripts/render-vorlagen.mjs --katalog <Katalog> --familie steel-door-signs --reihe edelstahl-gravur-80x53 --png --bogen --out <Ordner>
node scripts/render-vorlagen.mjs --katalog <Katalog> --familie steel-door-signs --design "ID1;ID2" --befestigung B02S --png --out <Ordner>
node scripts/render-vorlagen.mjs --katalog <Katalog> --familie steel-door-signs --leer --kontur --png --breite 1600 --out <Ordner>
```

Bedienhinweise:
- Design-IDs mit `;` trennen, weil die IDs Kommas enthalten.
- `--groesse alle` rendert alle passenden Größen.
- Befestigung: K00, KGL, KRA, B02, B02S, B04, B04S.
- Die Kundenansicht startet ohne Befestigung.

### 2. Ausweichen bei Bohrung/Schrauben (gravuru-2027 PR #164, Register 3.40)
Chris: „ne kleiner machen und einrücken“, Abstand „2 mm“.
- Die ganze Gestaltung einer Seite wird als Block um ihre Mitte verkleinert, nicht verschoben.
- Der Abstand zum Schraubenkopf beträgt 2 mm (`SIGN_PLACEMENT_CLEARANCE_MM`).
- Rückfall, von Claude gesetzt und Chris gesagt: Reicht das bis zur Mindestschrift 3 mm nicht, weichen die Teile wie bisher einzeln aus.
- Bilder für Chris: `varianten-schrauben.png`, `varianten-kleiner-einruecken.png`.

### 3. Preise Edelstahl
- Preisrunde 03.11. (Register 4.49) und Rechteck 21 × 7 = 28,99 € (4.50).
- Wo es eingetragen ist:
  - Katalog-PR #163 (`dev/preise-edelstahl-20261103-claude`);
  - Tabelle „Edelstahl-Schilder“ (alle 80 Größen, Preise, Befestigung, Icons): https://claude.ai/artifact/RqZq43dFDorCgn3qQKHk8f (DB `tafeln`, `optionen`);
  - Tabelle „Preise Edelstahl-Schilder“ (alt/empfohlen/beschlossen): https://claude.ai/artifact/BTQ5qhtZegAeDLUsFMXMDc;
  - Schiefer-Tabelle zum Vergleich: https://claude.ai/artifact/8PRwPmwGX2g5h5P4fkGe7w.
  - Die Tabellen sind private claude.ai-Seiten: Ein Claude-Chat in Chris' Konto liest sie mit dem Artifact-Tool (`action: read`). Astra kann sie nicht öffnen. Für ihn ist die Quelle der Katalog (`familien/edelstahl/steel-door-signs.json`, `KATALOG.md`, `kataloge/Stammdaten-Gravuru.xlsx` nach PR #163), dort steht derselbe Stand.
- Logo 12,99 € und KRA-Icon: gravuru-2027 PR #162.

### 4. 80 Edelstahl-Grundplatten (Katalog PR #164, Register 4.51)
Ablage: `zeichnungen/edelstahl-schilder-2027/grundplatten/`.
- `svg/<key>.svg`: in mm, rot Platte und alle Bohrbilder als Ebenen.
- `png/<key>.png`: freigestellt, 1000 px.
- `index.json` und `README.md`.

### 5. Weitere offene PRs
- gravuru-2027 #159: Schraubenkopf 5 mm, gleiche Datei wie #164, trivialer Konflikt möglich.
- gravuru-2027 #158: ENTSCHEIDUNGEN.md, enthält auch 3.40–7.18.
- gravuru-2027 #160: Übergabe Schiefer/Edelstahl-Werkzeuge.
- Katalog #162: Zubehörbilder Schiefer.

Merge-Reihenfolge an Astra (#139, Kommentar 6616693381): Code #159 → #164 → #163 → #158; Katalog #163 → #164.

## Offen / nächste Schritte
**Umfang: nur Edelstahl-Schilder (Familie `steel-door-signs`).** Schiefer, Gedenktafeln und Acryl erst nach Chris' Auftrag. Chris (04.11., 00:40): „er soll doch nur edelstahl machen“.

1. Alle Edelstahl-Designs mit dem Renderer prüfen (`--alle --png --bogen`). Jedes auffällige Design („prüfen“ / „passt nicht“) einzeln ansehen und Chris mit Screenshot zeigen; Korrekturen per GitHub an die zuständige KI.
2. Offene Frage aus der Preisrunde an Chris: Soll der Shop teurer sein als Amazon (8 × 2, 9 × 3)?
3. Astra 1 (nicht dieser Chat):
   - PRs mergen;
   - pricing v2 (`extraLogoCents 1299`) auf die Entwürfe;
   - Edelstahl-Entwurfspreise abgleichen;
   - betroffene Live-Produkte nur auflisten.
4. Katalog-Befund an Chris: Oval 21 × 7 wiegt laut Katalog 182 g, nach Fläche wären es ca. 137 g. Nicht ändern ohne Chris.
5. In der Prüfung zeigt `assessDesignTarget` weiter „Text im Bereich eines Bohrlochs“ für das unveränderte Katalogdesign, obwohl der Konfi jetzt ausweicht. Das ist eine Katalog-Prüfung, kein Fehler. Gegebenenfalls mit Chris klären.

Erledigt (nicht mehr fragen): Die „2 Vorlagen“ vom 03.11. sind die 80 Grundplatten (Katalog PR #164).

## Arbeitsorte (Cloud-Sitzung, nur falls noch vorhanden)
Scratchpad `…/scratchpad/`:
- Worktrees: `wt-render`, `wt-einr`, `wt-ent`, `kat-gp`, `kat-main`.
- Edelstahl-Seiten: `es/`.
- Grundplatten-Ausgabe: `rv-gp/`.
- Konfi-Vergleich: `konfi-check.mjs`.

Volltest Linux: `node --test --test-reporter=tap app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs`. Er dauert etwa 20 Minuten und muss im Hintergrund laufen.
