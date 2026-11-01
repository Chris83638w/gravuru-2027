# Willkommensschilder (Edelstahl-Türschilder + Acryl 3 mm) – Bericht 01.11.2026

Auftrag: gravuru-2027 Issue #120. Katalog-Branch `dev/willkommensschilder-fertig-20261101` (Entwurfs-PR im Katalog).
Kontaktbögen in diesem Ordner: native Konfi-Zielvorschau (`/api/workshop/designs/target-preview`), Familie `steel-door-signs`, **ohne Bohrlöcher** dargestellt (Regel Chris 01.11.), Vorschaugröße = erste Größe ab 9 × 6 bzw. kleinste Größe. Blau = neu, ★ gold = Signature, Original (Bestand) klein daneben.

## Inventur (Designs mit Thema `willkommensschilder`, ohne `nichtAngeboten`)

| Formatreihe | unter 9×6 vorher → nachher | ab 9×6 vorher → nachher |
|---|---|---|
| 50x20 | 0 → 4 | – |
| 60x20 | 0 → 4 | – |
| 70x23 | 0 → 5 | – |
| 80x20 | 0 → 5 | – |
| 65x65-rund | 5 → 10 | 11 → 17 |
| 80x35 | 2 → 7 | 5 → 12 |
| 80x53 | 3 → 8 | 10 → 18 |
| ab-80x53 | 3 → 8 | 9 → 17 |
| 90x30 | 2 → 7 | 4 → 11 |
| oval-120x40 | 1 → 6 | 4 → 11 |
| 80x80 | – | 11 → 19 |
| oval-90x60 | – | 5 → 12 |
| oval-150x80 | – | 8 → 15 |
| retro1-90x60 | – | 8 → 16 |
| retro2-91x61 | – | 9 → 17 |

Jede Größe jeder Reihe hat jetzt mindestens 4 Willkommens-Designs. Freigabe: alle bestehenden Willkommens-Designs ohne Freigabe in den Acryl-Zielen; neue Designs ohne Freigabe (setzt nur Chris).

## Bestand (Corel) – Abgleich
- Willkommens-Designs der Edelstahl-Bögen (D12, D15–D17, D19, D29, D34, D39, D40, D46/47, D51, D60) sind schon in Lieferform 2.
- **Nicht** in Lieferform 2 waren: TR1-V2A-D36 / TO-A-D27 („Willkommen bei uns / Zuhause“, Schlüssel), TQ-A-D23 (Alex Brush, Skizzen-Haus), TR1-A-D17 (Blume). Übernommen als D200–D202 (1:1 auf gleicher Form, sonst Referenz).
- TO-V2A-D67 / TRE-V2A-D67 („Familie Kuhlmann“, alte Größen 10×6,5 / 10×3,5) entspricht D15 ohne Blumenwiese – nicht doppelt angelegt.
- Viele Acryl-/UV-Bestandsdesigns sind reine Textschilder mit fehlenden Schriften (Constantine, Copperplate, Felix Titling …) – nicht übernommen.
- Kordelschilder „Willkommen“: UV/Holz, andere Linie – nur als Ideenquelle.

## Neue Designs (gleiche D-Nummer = gleiches Design je Formatreihe)

| D | Name | Modus / Vorlage | Schriften | Motiv | Reihen |
|---|---|---|---|---|---|
| D200 | Willkommen bei uns – Zuhause – Familie Hartung | 1:1 Bestand TR1-V2A-D36 auf Retro 1, sonst Referenz | Michroma | Schlüssel aus Corel-Bogen (bleibt beim Design) | alle außer 5×2/6×2 (Michroma zu breit) |
| D201 | Willkommen bei Familie Lindemann | 1:1 Bestand TQ-A-D23 auf Quadrat, sonst Referenz | Alex Brush | Skizzen-Haus aus Corel-Bogen | alle 15 |
| D202 | Willkommen bei Familie Kessler | 1:1 Bestand TR1-A-D17 auf Retro 1, sonst Referenz | Libre Baskerville (Ersatz Times), Allura | Blume aus Corel-Bogen | alle 15 |
| D203 | Herzlich willkommen · FAMILIE BERGMANN | neu | Parisienne, Cinzel | herzen/herz-kontur (Umriss) | alle 15 |
| D204 | Willkommen bei Familie Winter | neu | Josefin Sans, Playfair Display | motive-kleine-schilder/verschlungene-herzen | alle 15 |
| ★ D205 | Signature „Hauslinie“ – Linie bis an den Rand, steigt zu Haus mit Herz auf, Familie Weidner | neu | Cormorant Garamond, Great Vibes | eigenes Motiv `motive-eigene/willkommen/hauslinie.svg` (je Reihe in der Breite angepasst), herz-kontur | 8×5, AB, Retro 1+2, Oval 9×6/15×8/12×4, 8×8, 8×3,5, 9×3 (ab 9×6) |
| ★ D206 | Signature „Zweige“ – HERZLICH WILLKOMMEN, Familie Neumann, zwei Zweige diagonal | neu | Montserrat Light, Italianno | gravuru-originale/branch (Linie → Fläche, gedreht) | 8×5, AB, Retro 1+2, 8×8 (ab 9×6) |
| ★ D207 | Signature „Monogramm im Kranz“ – Initiale N im Lorbeerkranz, Familie Novak | neu | Cinzel Decorative, Raleway, Lora | gravuru-originale/wreath (Linie → Fläche) | alle außer Streifen (ab 9×6) |

Beispielnamen erfunden, je Design verschieden. Kleine Schilder nur mit Standardmotiven (Herz, Haus, Blume, Schlüssel). Keine großen Füllflächen (neue Regel 01.11.): Herz als Umriss, Zweige/Kranz/Hauslinie als Linie.

## Startdesign-Vorschlag
**D205 „Hauslinie“** für alle Rechteck-/Retro-/Oval-Reihen ab 9 × 6: sofort als Willkommens-/Zuhause-Schild lesbar, ruhig, hochwertig, Name in Schreibschrift groß, Linie bis an den Rand (Hausstil §8). Für Quadrat/Rund: **D207 Monogramm im Kranz**; für Streifen (5×2 … 8×2): **D202 Blume**.

## Prüfung
- Alle neuen Master über `build-designs-from-spec.py` erzeugt (Rand, Schriften, Mindestgröße); Versalhöhe ≥ 3 mm auf der kleinsten angebotenen Größe (Ausnahme D204 5×2 „Willkommen bei“ 2,9 mm).
- Native Zielvorschau Edelstahl je Reihe angesehen: keine „passt nicht“; „prüfen“ nur Retro 2 (Seitenverhältnis 1,5 % eingepasst, gilt für die ganze Reihe).

## Offene Fragen an Chris
1. D200: Bestand hat alle drei Zeilen gleich groß (1:1 auf Retro 1 so belassen); auf den anderen Formen ist der Name etwas größer. So recht?
2. „Zuhause von Familie …“ (D24, D31) – auch unter Willkommensschilder führen? Nicht eingetragen.
3. `motive-eigene/motive-eigene.json` wird auch im Hundeschilder-PR ergänzt – beim Mergen beide Einträge behalten.

## Selbstprüfung (ehrlich)
- Stark: D205, D207 (Quadrat/Rund), D202, D204, D203.
- Schwächer: D200 wirkt auf Rechteck etwas technisch (Michroma, Zeilen gleich breit); D207 auf Rechteck: Kranz leicht leer, Initiale bewusst nicht größer als der Name; D205 auf Oval 12×4 klein; D201 auf Streifen mit kleiner Grußzeile.
- Layouts automatisch je Form eingepasst, danach je Reihe einzeln angesehen; Feinschliff einzelner Abstände noch möglich.
