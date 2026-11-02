# Grabstecker Edelstahl – Bericht (Chat Grabstecker, Issue #137, 02.11.2026)

Katalog-Branch `dev/grabstecker-20261102` (gravuru-katalog.), Code-Branch gleichnamig (nur dieser Ordner).

## Ergebnis
- **Familie** `grabstecker-edelstahl` (`familien/edelstahl/grabstecker-edelstahl.json`): Edelstahl 1,5 mm, Gravur schwarz, 13 Formgruppen (Kontur), **33 Größen 1:1** aus der roten Corel-Kontur (pt → mm ×25,4/72), Preise `null`, ohne Befestigung, Randabstand 2 mm. `validateFamily`: gültig (Lücke nur Grundpreise).
- **Schneidvorlagen** `schneidvorlagen/grabstecker/`: je Größe SVG (Schnitt + Corel-Gravur) und `grabstecker.json` mit `kopfBisMm`, **`ansichtBisMm` (Kopf + 10 mm Stiel = Konfi-Ausschnitt)**, Stielbreite/-anzahl, Innenausschnitten, Gestaltungsfläche (WKT).
- **2680 Designs** = 268 Kombinationen Form × Größe × Zielgruppe × 10, Kennung `GS-V2A-<FORM>-<Größe>-D<n>` (D1–10 Mensch, D11–20 Mama, D21–30 Papa, D31–40 Oma/Opa, D41–50 Sternenkind, D51–60 Hund, D61–70 Katze, D71–80 Tier, D81–90 christlich, D91–100 jüdisch, D101–110 islamisch). `themes: [andenkenschilder]`, Ziel `grabstecker-edelstahl` mit `freigabe: null`.
- Zielgruppen-Regel: Herz/Herz-Rahmen/-Doppelrahmen/Herz liegend/Stern/Stern 2/Infinity alle 11; Kreuz/Kreuz 2/Engel Menschen + christlich (6); Katze nur Katze; Pfote/Herz mit Pfote Hund/Katze/Tier.

## Inventur je Größe (vorher → nachher)
Messung gegen die Gestaltungsfläche (2 mm Rand, nur Kopf): Versatz waagerecht max., Fläche = Gruppenrahmen / Rahmen der Gestaltungsfläche (min–Median), kleinste Versalhöhe.

| Form/Größe | mm | Zielgruppen | vorher | nachher | Versatz x max | Fläche | Versal min | Kontaktbogen |
|---|---|---|---|---|---|---|---|---|
| Herz S | 122 × 300 | 11 | 0 | 110 | 0.0 % | 21–30 % | 4.9 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZ-S.jpg?raw=true) |
| Herz M | 160 × 382 | 11 | 0 | 110 | 0.0 % | 17–30 % | 4.3 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZ-M.jpg?raw=true) |
| Herz XL | 200 × 380 | 11 | 0 | 110 | 0.0 % | 17–31 % | 5.8 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZ-XL.jpg?raw=true) |
| Herz-Rahmen S | 125 × 300 | 11 | 0 | 110 | 0.0 % | 17–23 % | 3.4 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZRAHMEN-S.jpg?raw=true) |
| Herz-Rahmen M | 151 × 362 | 11 | 0 | 110 | 0.0 % | 15–24 % | 3.0 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZRAHMEN-M.jpg?raw=true) |
| Herz-Rahmen XL | 200 × 360 | 11 | 0 | 110 | 0.0 % | 15–27 % | 4.2 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZRAHMEN-XL.jpg?raw=true) |
| Herz-Doppelrahmen S | 118 × 300 | 11 | 0 | 110 | 4.8 % | 9–11 % | 3.0 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZDOPPEL-S.jpg?raw=true) |
| Herz-Doppelrahmen M | 152 × 358 | 11 | 0 | 110 | 3.7 % | 9–14 % | 3.0 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZDOPPEL-M.jpg?raw=true) |
| Herz-Doppelrahmen XL | 200 × 360 | 11 | 0 | 110 | 3.0 % | 8–14 % | 3.4 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZDOPPEL-XL.jpg?raw=true) |
| Herz liegend S | 146 × 300 | 11 | 0 | 110 | 1.3 % | 15–26 % | 4.6 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZLIEGEND-S.jpg?raw=true) |
| Herz liegend M | 160 × 365 | 11 | 0 | 110 | 1.4 % | 14–28 % | 3.7 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZLIEGEND-M.jpg?raw=true) |
| Herz liegend L | 210 × 365 | 11 | 0 | 110 | 1.9 % | 15–28 % | 4.7 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZLIEGEND-L.jpg?raw=true) |
| Herz mit Pfote S | 122 × 300 | 3 | 0 | 30 | 0.0 % | 11–12 % | 4.3 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZPFOTE-S.jpg?raw=true) |
| Herz mit Pfote M | 160 × 382 | 3 | 0 | 30 | 5.5 % | 11–16 % | 4.1 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZPFOTE-M.jpg?raw=true) |
| Herz mit Pfote L | 200 × 380 | 3 | 0 | 30 | 5.1 % | 12–16 % | 5.2 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-HERZPFOTE-L.jpg?raw=true) |
| Kreuz M | 130 × 460 | 6 | 0 | 60 | 0.0 % | 8–15 % | 3.0 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-KREUZ-M.jpg?raw=true) |
| Kreuz L | 150 × 460 | 6 | 0 | 60 | 0.1 % | 9–15 % | 3.0 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-KREUZ-L.jpg?raw=true) |
| Kreuz XL | 180 × 460 | 6 | 0 | 60 | 0.1 % | 8–16 % | 3.0 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-KREUZ-XL.jpg?raw=true) |
| Kreuz 2 M | 140 × 291 | 6 | 0 | 60 | 2.4 % | 1–2 % | 5.6 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-KREUZ2-M.jpg?raw=true) |
| Kreuz 2 L | 190 × 385 | 6 | 0 | 60 | 2.4 % | 1–2 % | 3.0 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-KREUZ2-L.jpg?raw=true) |
| Engel M | 110 × 376 | 6 | 0 | 60 | 0.0 % | 13–26 % | 3.0 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-ENGEL-M.jpg?raw=true) |
| Engel L | 160 × 375 | 6 | 0 | 60 | 0.0 % | 17–26 % | 3.5 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-ENGEL-L.jpg?raw=true) |
| Stern S | 114 × 300 | 11 | 0 | 110 | 0.1 % | 16–24 % | 3.0 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-STERN-S.jpg?raw=true) |
| Stern M | 140 × 372 | 11 | 0 | 110 | 0.0 % | 16–28 % | 3.4 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-STERN-M.jpg?raw=true) |
| Stern L | 180 × 370 | 11 | 0 | 110 | 0.0 % | 17–29 % | 3.6 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-STERN-L.jpg?raw=true) |
| Stern 2 S | 253 × 300 | 11 | 0 | 110 | 4.1 % | 5–8 % | 3.4 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-STERN2-S.jpg?raw=true) |
| Stern 2 L | 290 × 365 | 11 | 0 | 110 | 0.0 % | 4–6 % | 3.0 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-STERN2-L.jpg?raw=true) |
| Infinity-Herzen S | 238 × 300 | 11 | 0 | 110 | 4.4 % | 59–62 % | 3.0 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-INFINITY-S.jpg?raw=true) |
| Infinity-Herzen L | 300 × 360 | 11 | 0 | 110 | 5.0 % | 58–61 % | 3.0 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-INFINITY-L.jpg?raw=true) |
| Katze S | 105 × 300 | 1 | 0 | 10 | 6.0 % | 6–12 % | 3.4 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-KATZE-S.jpg?raw=true) |
| Katze M | 140 × 385 | 1 | 0 | 10 | 5.1 % | 13–19 % | 3.5 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-KATZE-M.jpg?raw=true) |
| Pfote S | 120 × 300 | 3 | 0 | 30 | 0.7 % | 21–26 % | 3.9 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-PFOTE-S.jpg?raw=true) |
| Pfote L | 170 × 355 | 3 | 0 | 30 | 0.9 % | 23–37 % | 4.5 mm | [Bogen](https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/s2-PFOTE-L.jpg?raw=true) |

Alle 2680 Designs: Text ≥ 3,0 mm Versalhöhe, Abstand zur Kontur ≥ 2 mm (+1 mm Puffer), Herz mit Pfote: Pfote + 3 mm frei, Rahmenformen innerhalb der Rahmengravur.
Native Stichprobe 1:1 aus dem Konfigurator: https://github.com/Chris83638w/gravuru-2027/blob/dev/grabstecker-20261102/docs/handoffs/grabstecker-20261102/native-stichprobe.jpg?raw=true

## Aufbau / Modus
- **1:1 Corel**: Herz-Rahmen und Herz-Doppelrahmen tragen immer die Corel-Rahmengravur (660); Stern und Pfote abwechselnd mit der Corel-Innenkontur (195), Text innerhalb.
- **Referenz** (1609): Andenkenschilder Edelstahl `TRE-V2A-8x5-D401–D422` – Schriftpaare, Datumsformat (christlich `* … † …`, jüdisch/islamisch `geb. … · gest. …` bzw. Jahre, kein Kreuz), Symbole je Glaubensrichtung.
- **neu (Signature)** (216): großes Motiv + Name + Spruch.
- Grabstecker-Hausstil Kreuz (DESIGN-MASTER §8): Name + Daten im Querbalken, ein Motiv im Stamm.
- Klein (S): nur Name + Daten (bei religiösen Zielgruppen teils ein kleines Zeichen).
- Schriften (17): Great Vibes, Parisienne, Allura, Alex Brush, Dancing Script, Magnolia Script, Italianno, Cinzel, Lora, Cormorant Garamond, Playfair Display, Libre Baskerville, Bellefair, Montserrat, Raleway, Josefin Sans, Lato – 10 Paare rotierend; Daten nie in Schreibschrift. Magnolia Script ohne ı/ğ/ş → bei türkischen Namen automatisch Great Vibes.
- Motive (53) nur aus `motive/` und `motive-eigene/andenken/` (keine neuen Motive), überwiegend Linienmotive; keine großen Füllflächen.
- Beispielnamen/-daten erfunden.

## Startdesign-Vorschlag
Je Größe D1 (Mensch allgemein, Motiv oben/Name/Daten); Kreuz: D81 (christlich, Kreuz mit Zweig im Stamm); Pfote/Herz mit Pfote/Katze: D51 bzw. D61.

## Offene Fragen / Hinweise an Claude
1. **Konfi-Fehler (Code, nicht Katalog):** `familyProductConfig` setzt den Starttext „Familie Muster“ in die **Plattenmitte** – bei Grabsteckern liegt die auf dem Stiel (10 mm) bzw. zwischen zwei Stielen → `measureText` wirft „Schriftgröße: 1 bis 100 mm“. 21 von 33 Größen sind deshalb in `target-preview` nicht darstellbar (Herz S/M, Doppelrahmen S/M, Herz liegend, Herz mit Pfote S/M, Rahmen S/M, Infinity, Katze, Kreuz M, Kreuz 2 M, Pfote, Stern M, Stern 2). Für Astra 1 (#48): Starttext in den Kopf (`kopfBisMm`) setzen.
2. **Innenausschnitte** (Herz mit Pfote, Engel-Heiligenschein, Infinity, Kreuz-Schlitze, Kreuz 2) kennt das Familienformat nicht (eine Außenkontur) – Daten in der Schneidvorlage; Konfi zeigt sie derzeit nicht.
3. **Konfi-Ausschnitt** Kopf + 1 cm: Wert `ansichtBisMm` je Größe liegt bereit; Darstellung macht Astra 1.
4. **Kreuz 2 M**: Querbalken nur ~10 mm → nur Name (Daten passen nicht mit ≥ 3 mm). Daten senkrecht im Stamm gewünscht?
5. **Infinity**: schmales Band – Name oben links, Daten unten rechts; formbedingt viel Freifläche. Gebogener Text wäre schöner (Konfi-Funktion?).
6. **Kürzel „GS“** ist neu (kein vorhandener Corel-Bogen) – bitte bestätigen.
7. Herz-Doppelrahmen XL: Corel-Kontur hatte eine 0,001-mm-Zacke an der Stielspitze (Selbstüberschneidung) – entfernt.
8. `build-katalog.py` nicht gelaufen (Speicher: `kataloge/` nicht ausgecheckt) – KATALOG.md/Excel bitte beim Merge neu bauen; Unterkategorie/Linie in `struktur.json` nicht angelegt (nicht beauftragt).
9. Preise offen.

## Ehrliche Selbstprüfung
- Die Designs sind **per Skript** aus Vorlagen-Bausteinen gesetzt (Layout-Löser je Gestaltungsfläche) und je Bogen von mir angesehen – **nicht jedes der 2680 einzeln** im Detail. Stichproben gut: Herz, Herz liegend, Stern, Engel, Kreuz, Pfote. Schwächer: Infinity, Kreuz 2, Herz-Doppelrahmen S/M (kleine Fläche → kleine Schrift, Fläche 9–14 %), Stern 2 (alle gleich aufgebaut, nur Schrift wechselt).
- Einige Aufbauten wirken bei vielen Elementen gedrängt (Spruch + Motiv + zweizeilige Daten); Designs unter 72 % der mittleren Größe wurden automatisch ohne Spruch bzw. Motiv neu gesetzt.
- `flaeche-messen.py` erkennt Konturformen (Kreuz, Engel, Stern, Infinity) nicht als Platte; eigene Messung gegen die Gestaltungsfläche statt dessen. Senkrecht liegt die Gruppe bei Herzen bewusst etwas höher (optische Mitte), bei Engel/Katze tiefer (Kleid/Körper).
- Motive mit Linien < 0,5 mm meldet der Konfi als „prüfen“ (Taube, Rose) – nach Chris‘ Regel sind 0,3 mm gravierbar.
