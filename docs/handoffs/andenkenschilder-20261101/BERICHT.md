# Andenkenschilder (NEU) – Edelstahl-Türschilder + Acryl 3 mm · Bericht 01.11.2026

Auftrag: gravuru-2027 #113 (gemeinsame Regeln #110). Katalog-Branch `dev/andenkenschilder-fertig-20261101`.

## Struktur (neu, bitte prüfen)
- `themen.json`: neues Thema **`andenkenschilder`** (fontSet `andenken`, Motivkategorien Kreuze, Engel, Symbole Religion, Kerzen, Bäume, Vögel, Herzen).
- `struktur.json` **und** `linien/edelstahl-tuerschilder.json` + `linien/acryl-tuerschilder.json`: Unterkategorie „Andenkenschilder“ (Preise/Größen/Optionen wie Linie, keine Werte erfunden).
- Alle Designs liegen in den Edelstahl-Formatreihen mit drei Zielen (`steel-door-signs`, `acryl-3mm-tuerschilder-schwarz`, `-anthrazit`), **alle `freigabe: null`**.

## Inventur
Vorher: 0 Designs mit Thema `andenkenschilder` (Thema existierte nicht; im Türschild-Bestand keine Gedenk-/Kreuz-Vorlage).
Nachher: **109 Master** (alle „neu, ohne Vorlage“).

| Formatreihe | Designs | unter 9×6 (Standardsymbole) | ab 9×6 |
|---|---|---|---|
| 5×2, 6×2, 7×2, 8×2 | je 4 | 4 | – (keine Größe ab 9×6) |
| Rechteckig ab 9×3 | 8 | 9×3, 12×4: 4 | 15×5–27×9: 8 |
| Rechteckig ab 8×3,5 | 8 | 8×3,5: 4 | 12×5,25–40×17,5: 8 |
| Oval ab 12×4 | 8 | 12×4: 4 | 15×5–30×10: 8 |
| Rund 6,5 | 7 | 6,5: 4 | 8,5–20: 7 |
| Rechteckig ab 8×5 | 10 | 8×5: 4 | 9×6–45×30: 10 (inkl. 2 Signature) |
| Abgerundet ab 8×5 | 10 | 8×5: 4 | 9×6–45×30: 10 (inkl. 2 Signature) |
| Quadratisch | 10 | – | 8×8–30×30: 10 (inkl. 2 Signature) |
| Oval ab 9×6, Oval ab 15×8, Retro 1, Retro 2 | je 8 | – | 8 |

Standardsymbole (alle Größen): D401 Kreuz, D406 Davidstern, D408 Halbmond mit Stern, D410 Herz. Alle anderen Motive nur ab 9×6-Fläche (explizite `sizes`).

## Designs (gleiche D-Nummer = gleiches Design in allen Reihen)
| D | Titel | Glaube | Beispielname (erfunden) | Daten | Schriften | Motiv |
|---|---|---|---|---|---|---|
| 401 | Kreuz schlicht | christlich | Helga Brandt | * … † … | Great Vibes + Lato | motive/kreuze/kreuz-2 |
| 402 | Kreuz mit Zweig | christlich | Wilhelm Kämper | * … † … | Cinzel + Alex Brush | kreuz-mit-strauch |
| 403 | Kreuz mit Taube | christlich | Margarete Vogt | * … † … · „Ruhe in Frieden“ | Allura + Bellefair | kreuz-mit-taube |
| 404 | Fisch (Ichthys) | christlich | Johannes Albers | * … † … · „Unvergessen“ | Playfair Display + Josefin Sans | christlicher-fisch-2 |
| 405 | Betender Engel | christlich | Anneliese Hoffmann | * … † … | Alex Brush + Libre Baskerville | engel-betend-2 |
| 406 | Davidstern | jüdisch | Samuel Grünberg | 1938 – 2025 (kein †) | Lora + Montserrat | **neu** motive-eigene/andenken/andenken-davidstern |
| 407 | Menora | jüdisch | Ruth Adler | geb. … · gest. … · „Ihr Andenken sei ein Segen“ | Cormorant Garamond + Parisienne | **neu** andenken-menora |
| 408 | Halbmond mit Stern | islamisch | Fatma Yıldız | 1951 – 2024 (kein †) | Parisienne + Montserrat | halbmond-mit-stern |
| 409 | Kielbogen mit Halbmond | islamisch | Mehmet Aydın | geb. … · gest. … (kein †) | Cinzel + Bellefair | **neu** andenken-kielbogen-halbmond |
| 410 | Herz | neutral | Gerda Lindner | 1946 – 2025 | Dancing Script + Raleway | herzen/herz-2 |
| 411 | Taube | neutral | Karl-Heinz Wolters | 1940 – 2025 | Cormorant Garamond + Raleway (+ Allura) | vogel/taube |
| 412 | Kerze | neutral | Elisabeth Brune | 1933 – 2025 · „In stillem Gedenken“ | Great Vibes + Bellefair | kerzen/kerze-2 |
| 413 | Baum | neutral | Manfred Sievers | 1949 – 2025 · „Was bleibt, ist die Liebe“ | Josefin Sans + Alex Brush | baume/baum-1 |
| **421** | **Signature Lichtkreuz** | christlich | Ingrid Hartmann | * … † … | Great Vibes + Cinzel | strichkreuz-4, raumhoch seitlich |
| **422** | **Signature Zwei Tauben** | neutral | Friedrich Lohmann | 1937 – 2025 · „Für immer bei uns“ | Allura + Bellefair | zwei-tauben rechts oben, Name linksbündig, feine Linie bis zum Rand |

Religiöse Sorgfalt: kein Kreuz und kein „†“ bei jüdischen und islamischen Designs; keine arabische/hebräische Schrift; Sätze nur deutsch („Ihr Andenken sei ein Segen“ ist die übliche deutsche Form des jüdischen Gedenkwunsches). Türkische Namen mit ı – alle verwendeten Schriften haben die Glyphe (geprüft).

## Kontaktbögen (native Konfi-Zielvorschau, Familie steel-door-signs, kleinste angebotene Größe)
01 Rechteckig ab 8×5 · 02 Abgerundet · 03 Quadrat · 04 Oval 9×6 · 05 Oval 15×8 · 06 Retro 1 · 07 Retro 2 · 08 Rund · 09 8×3,5 · 10 9×3 · 11 Oval 12×4 · 12–15 5×2, 6×2, 7×2, 8×2. Signature gold umrandet. Keine Vorlage vorhanden → kein Original daneben.

## Startdesign-Vorschlag
**D401 Kreuz schlicht** (Rechteckig ab 8×5): gibt es in allen Größen und Reihen, klares Kreuz als Gegengewicht links, Name groß in Schreibschrift – entspricht dem Hausstil (§8) und der häufigsten Nachfrage.

## Prüfung / offen
- Native Prüfung: 87 „passt“, 22 „prüfen“, 0 „passt nicht“. „Prüfen“-Gründe: Retro 2 Seitenverhältnis 1,5 % (gilt für alle Retro-2-Bestandsdesigns); Bibliotheksmotive Kreuz mit Zweig, Baum 1, Kerze 2 mit feinen Konturen unter 0,5 mm (Kerze 2 enthält einen Splitter 0,03 mm – unsichtbar, ggf. Motiv bereinigen); 5×2 D406/D408: Text nahe Bohrloch.
- Alle Zeilen ≥ 3 mm Versalhöhe auf der Mastergröße; Name immer größte Zeile.
- `KATALOG.md` nicht neu gebaut (Metadatenlauf hätte Bildverweise entfernt); `build-katalog.py --metadata-only` lief fehlerfrei (13 Familien gültig).
- Offene Fragen an Chris: (1) Islamische Designs – sind „geb./gest.“ bzw. Jahreszahlen so gewünscht? (2) Sollen D402/D412/D413 trotz feiner Motivkonturen bleiben? (3) Sollen die Signature-Designs auch auf Oval/Retro?

Werkzeuge (Scratchpad, nicht im Repo): Generator mit Schriftmetrik-Einpassung, Renderer über `/api/workshop/designs/target-preview`.
