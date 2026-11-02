# Mit Foto · Herz-Formen online (#130) – Bericht Claude, 02.11.2026

Katalog-Branch `dev/gedenktafeln-mit-foto-online-20261102` · Entwurfs-PR https://github.com/Chris83638w/gravuru-katalog./pull/136

| Form | Mika-PRs | Designs | ok | korrigiert | nicht angeboten | Bögen |
|---|---|---:|---:|---:|---:|---|
| Herz 10 × 10 | #30/#31 | 30 | 5 | 24 | 1 (MEM-089) | 01-herz-10x10-1/2 |
| Herz geschnitten 24 × 19 | #18 (main) + #19 | 30 | 20 | 10 | 0 | 02-herz-geschnitten-24x19-1/2 |
| Herz-Kordel 22,5 × 26,7 | #36/#37 | 30 | 10 | 20 | 0 | 03-herz-kordel-225x267-1/2 |
| Herz schief 18 × 13 | #24/#25 | 30 | 22 | 8 | 0 | 04-herz-schief-18x13-1/2 |

Je Bogen zusätzlich `…-flaeche.jpg` (Freiflächenmessung markiert).

## Prüfweg
- Native Konfi-Pipeline (katalogDesignToTemplate → prepareKatalogPhotoAssets → scaleTemplate → productPreview) mit temporärer Schieferfamilie aus Mikas `produkt-geometrien.json` – auf main gibt es keine Schiefer-Herzfamilien (`ziele: []`).
- Geometrisch je Textzeile: kein Text im sichtbaren Fotofeld (Maske ∩ Uploadfenster, auch dunkle Bildteile), nichts über der Kontur, Versalhöhe ≥ 3 mm, keine Datumsreste am Zeilenende; Kordelloch (113,5/42,9, Ø 5,8 + 1,5 mm) bei allen 30 frei.
- Jedes Design einzeln im Bogen angesehen; Freiflächen mit `scripts/flaeche-messen.py` gemessen.

## Wichtigste Korrekturen
- Textbefunde #128 in allen vier Formen: MEM-122 („Jahre in“, „*“ weg, Datum mit *), MEM-374 („1987 – 2017“, „Lebens.“), MEM-117 („Nie vergessen“), MEM-349 („Leben ist“), MEM-092 („gehen.“), MEM-114 (Spruch in einer Schrift/Größe, Komma).
- Zerrissene Daten („… -“ / „…“, „† 12.“ / „März 2015“) → eine Zeile, wo Platz ist, sonst sauber zweizeilig „* …“ / „† …“.
- Herz 10 × 10: Versalhöhe auf ≥ 3 mm (049, 068, 099, 100), Name größtes Element (101, 105, 137), MEM-069 wie Herz-Vorlage D23 neu verteilt.
- MEM-082 (alle vier Formen): Schild-Maske mit Spitze → saubere Ellipse (Hinweis war abgeschnitten, heller Bildrand).
- MEM-100: Bestands-Musterfoto aufgehellt (Gamma 0,6, Hash in design.json nachgeführt) und Gesicht mittiger.
- Freiflächen: Gruppen von MEM-049/069/070/094/096/117 (je nach Form) mittiger/tiefer gesetzt bzw. Foto größer.

## Freiflächen (Messwerte)
Alle Gruppen ≥ 28 % der Plattenfläche (meist 35–58 %). Beim Herz liegt die optische Mitte (Flächenschwerpunkt) bei y ≈ −7 % der Hüllbox (schiefes Herz: x +2,7 %, y +7,4 %); die gemessenen Versätze liegen um diese Mitte (Herz −8 … +8 %, schief x +4 … +11 % wegen der großen rechten Herzhälfte). Knapp unter 30 %: Kordel neu-02 (30 %), schief MEM-049 (29 %) – ruhige, mittige Gruppen, bewusst so gelassen.

## Offen / für Claude bzw. Chris
1. **Familien/Ziele fehlen:** Für Schiefer Herz, Herz geschnitten, Herz-Kordel und Herz schief gibt es auf Katalog-main keine Produktfamilie; alle Designs haben `ziele: []` (wie bei Mika). Ohne Familie erscheinen sie nicht im Shop.
2. MEM-089 Herz 10 × 10 nicht angeboten (Rechteck-Vorlage D1 mit hohem Fotofeld passt nicht ins kleine Herz) – in den drei größeren Formen angeboten.
3. MEM-100 Musterfoto aufgehellt statt ersetzt – falls ein anderes Bestandsfoto gewünscht ist, bitte sagen.
4. Motive stammen aus den Verkaufsoriginalen (keine Linien-Icons aus `motive-eigene`/`gravuru-originale`); Strichzeichnungen aus Originalen (Hände-Herz MEM-100, betende Hände) bitte im Bogen mitbeurteilen.
5. Keine Freigabe gesetzt, nichts live.
