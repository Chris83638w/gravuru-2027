# Familienschilder – Edelstahl-Türschilder + Acryl 3 mm (Issue #119)

Stand 01.11.2026 · Katalog-Branch `dev/familienschilder-fertig-20261101` · Unterkategorie-Chat Familienschilder.
Acryl 3 mm schwarz/anthrazit nutzt dieselben Designs (Ziele `acryl-3mm-tuerschilder-*`, ohne Freigabe).

## 1. Inventur (Katalog-main, `themes` ⊇ `familienschilder`, ohne `nichtAngeboten`)

**Vorher:** 756 angebotene Designs, **alle 80 Größen der Familie `steel-door-signs` haben Designs**. 752 für Edelstahl freigegeben, 4 offen. Minimum (8 ab 9×6, 4 darunter) überall weit überschritten. Schritt 1 („von jeder Größe eins“) war damit schon erfüllt.

| Formatreihe | Größen (Designs je Größe vorher → nachher) |
|---|---|
| 50x20 (5×2) | 17 → 17 |
| 60x20 (6×2) | 17 → 17 |
| 70x23 (7×2) | 17 → 17 |
| 80x20 (8×2) | 17 → 17 |
| 80x35 | 8×3,5: 40 · ab 12×5,25: 59 → 60 |
| 90x30 | 9×3 / 12×4: 40 · ab 15×5: 60 → 61 |
| oval-120x40 | 12×4: 33 · ab 15×5: 52 → 53 |
| 80x53 Rechteck | 8×5: 42 · ab 9×6: 71 → 74 |
| ab-80x53 abgerundet | 8×5: 40 · ab 9×6: 68 → 71 |
| retro1-90x60 | 66 → 70 |
| retro2-91x61 | 61 → 64 |
| oval-90x60 | 57 (9×6) / 56 → 59 / 58 |
| oval-150x80 | 63 → 65 |
| 80x80 Quadrat | 65–66 → 69–70 |
| 65x65 rund | 6,5: 40 · ab 8,5: 65 → 66 |

**Corel-Bestand `designs/bestand/tuerschilder/Familie` gegen Lieferform 2** (gleiche Form + Größe, über A/V2A/KS-Bögen):
- Übernommen (sauber 1:1, gleiches Seitenverhältnis): **TQ-V2A-8x8-D13** (aus TQ-A-10x10-D13, Pusteblumen) und **TR1-V2A-9x6-D36** (Willkommen bei uns / Zuhause / Schlüssel).
- Nicht übernommen, weil alte Größe (anderes Seitenverhältnis → nur Einpassen) oder Schrift fehlt: Oval 15×8 D14–D16, D49–D51, D64 (Master TO-A-10x6,5); TR2 9×6 D14, D17, D19, D28, D36 (Master TR2-12x8, Seitenverhältnis +3,7 %); TQ 8×8 D8 (Schrift „Great Wishes“ ohne Ersatz).
- Unter 9×6 fehlen viele Bestandsnummern (Streifen 5×2–8×2, 9×3, 12×4) – überwiegend Chris’ Liste „nicht unter 9×6“; die übrigen (z. B. D7, D16, D17, D21, D22, D25 …) bewusst nicht nachgebaut: die Reihen haben schon 17 bzw. 33–40 Designs („keine Masse“).

## 2. Neue Designs

| Kennung | Modus | Vorlage | Schriften | Motiv | Reihen |
|---|---|---|---|---|---|
| TQ-V2A-8x8-D13 | 1:1 Bestand | TQ-A-10x10-D13 | Allura, Montserrat Light (Ersatz für Champagne & Limousines, Wortbreite wie Original) | Pusteblumen aus dem Bestand | 80x80 |
| TR1-V2A-9x6-D36 | 1:1 Bestand | TR1-V2A-9x6-D36 | Michroma | Schlüssel aus dem Bestand | retro1 |
| **D160 Signature „Dachlinie“** | neu | ohne Vorlage | Parisienne (Name), Josefin Sans (FAMILIE, Straße) | eigenes Motiv `motive-eigene/familienschilder/dachlinie.svg` (feine Dach- + Bodenlinie, je Form neu konstruiert) | 80x53, ab-80x53, retro1, retro2, oval-90x60, oval-150x80, 80x80 |
| **D161 Signature „Senkrecht“** | neu | ohne Vorlage | Cormorant Garamond (Name), Sacramento (Familie), Josefin Sans (Straße senkrecht, Kinder) | feine senkrechte Linie Kante zu Kante | 80x53, ab-80x53, retro1, retro2, 80x80 |
| **D162 Signature „Familienbaum“** | neu | ohne Vorlage | Bellefair (Name), Sacramento (Hier wohnt), Josefin Sans (Kinder) | `motive/baume/herzbaum` | 80x53, ab, retro1, retro2, oval-90x60, oval-150x80, 80x80, rund, 80x35, 90x30, oval-120x40 |

Signature nur ab 9×6 (Fläche ≥ 54 cm²). Beispielnamen erfunden (Albrecht, Brandt, Hollmann, Lindqvist, Hartwig). Größte zusammenhängende Füllfläche ≤ 3 % der Platte (neue Regel ≤ 15 %), Linien ca. 0,6 mm auf 9×6.

## 3. Kontaktbögen (native Zielvorschau, ohne Befestigung)

Je Formatreihe ein JPG in diesem Ordner; Signature (★, orange) und neue Designs (NEU, blau) stehen vorn, Bestandsoriginal klein daneben. Vorschau in der kleinsten angebotenen Größe ab 9×6.
Bei retro1/retro2 bleiben die Bohrlöcher sichtbar, weil sie in der Plattenkontur der Vorschau stecken (nicht abschaltbar ohne Codeänderung).

## 4. Startdesign-Vorschlag

**TRE-V2A-8x5-D160 „Dachlinie“ (9×6 Rechteck)** als Hauptbild: sagt ohne Worte „Familie/Zuhause“, Name groß in Schreibschrift, nur feine Linien (schnelle, saubere Gravur), wirkt auf Edelstahl und Acryl schwarz gleich gut und ist im Katalog einzigartig. Platz 2: bewährter Bestseller D4 (mit Strich, versetzt).

## 5. Befunde / offene Fragen

1. **TQ-V2A-8x8-D14 ist freigegeben, rendert aber nicht** („Schrift fehlt: Welcome“, Welcome ist laut schriften/README ohne Ersatz ausgeblendet) – sollte `nichtAngeboten` bekommen oder eine Ersatzschrift. Nicht geändert (fremdes Design).
1b. **TRE-V2A-8x5-D57/-D61 und TAE-V2A-8x5-D57/-D61 (freigegeben) liefern keine Vorschau** („Schriftgröße: 1 bis 100 mm“ – auf 45×30 wird ein Text über 100 mm). In den Bögen 80x53/ab-80x53 deshalb als FEHLER-Kachel. Ebenso **TO-V2A-9x6-D38** („Schrift fehlt: ParmaPetit“, freigegeben). Nicht geändert (fremde Designs).
2. **Senkrechter Text:** `katalog-convert.mjs` zählt `transform="rotate(…)"` direkt am `<text>` doppelt (−90° wird −180°). D161 nutzt deshalb eine umschließende `<g id="text-n" data-feld transform>`-Gruppe – damit korrekt. Bug im Code-Repo prüfen.
3. **Schriftgröße max. 100 mm:** Die Vorschau scheitert, wenn ein Text auf der größten Größe der Reihe über 100 mm kommt (z. B. 45×30). D160–D162 sind darauf begrenzt.
4. Bestandslücken Oval 15×8 und TR2 9×6 (siehe 1.) nur über „Einpassen“ möglich – soll das gemacht werden?
5. Great Wishes (TQ D8, TO D14/D49) hat keine Ersatzschrift – Ersatz festlegen?

## 6. Selbstprüfung nach DESIGN-MASTER

- Kein Schild ohne Text ✓ · Motive unverzerrt, nicht abgeschnitten ✓ · keine Überlappung (Konturprüfung + Sichtprüfung) ✓ · Versalhöhe ≥ 3 mm auf der kleinsten angebotenen Größe ✓ · Name zuerst und am größten ✓ · „Familie“ kleiner als der Nachname ✓ · Linien bis an den Rand (1,1 mm Gestaltungsrand des Builders) ✓ · normal lesbar ✓.
- D160: stärkstes Design; auf Oval 15×8 Name etwas kleiner gesetzt, damit FAMILIE frei bleibt.
- D161: Straße auf 9×6 klein (3 mm Versalhöhe auf 9×6) – lesbar, aber Detail; auf Streifen 80x35/90x30 bewusst weggelassen.
- D162: Baum bewusst kleiner als zunächst (0,54 H), damit der Name dominiert; „Hier wohnt“ und Kinder sind zarte Zweitebene.
- Nicht geprüft: Gravurlauf an der Maschine, Acryl-Rückseitengravur.
