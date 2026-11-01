# Frühstücksbrettchen Holz (Gravur) – Bericht (Issue #117, 02.11.2026)

Katalog-Branch `dev/brettchen-fertig-20261101`. Kontaktbögen in diesem Ordner.

**Wichtig: keine native Konfi-Vorschau möglich.** Die Linie `brettchen` hat keine Familie (`families: []`, „Familie offen“), und der Konfigurator kennt nur die Materialien Edelstahl, Schiefer, Acryl (`FAMILY_MATERIALS`), kein Holz. Die Bögen sind deshalb eine **Ersatzvorschau**: `design.svg` 1:1 mit den echten Katalog-Schriften im Browser gerendert (Holzton, Gravur dunkel, ohne Bohrung). Die Designs haben `ziele: []` und `sizes: []`, bis es eine Familie gibt.

## Inventur
| Formatreihe (Ordner) | Platte (Corel-Schnittlinie) | vorher | nachher |
|---|---|---|---|
| `brettchen-holz-225x150` | 223 × 152 mm, Ecken r 13 | 0 | 52 (28 × 1:1, 19 × Referenz, 5 neu) |
| `brettchen-holz-200x130` | 200 × 130 mm, Ecken r 14 | 0 | 52 (4 × 1:1, 43 × Referenz, 5 neu) |

Bestand `designs/bestand/fruehstuecksbrettchen/`: 84 Designs = 49 Gravur (FB-H 34 in 22,5 × 15; FBV-H 9 und FBM-H 6 in 20 × 13) + 35 UV (nicht übernommen, wie beauftragt).
- Übernommen: 47 Gravur-Designs, je in beiden Größen (eigene Größe 1:1, andere Größe gleichmäßig eingepasst = „Referenz“).
- Nicht übernommen: FBV-H-D3 (Papabär, Text nur als Kurven) und FBV-H-D9 (ohne Text) – Design-Master „kein Design ohne Text“.
- Dubletten: keine echten (Prüfung über Motivgeometrie). Gleiches Motiv, anderer Anlass: FB-H-D12/D13 (Best Mom/Dad Ever), FBM-H-D2/FBV-H-D8 (Mama/Papa) – beide behalten.
- FBM-H-Bogen heißt „20x13“, die Schnittlinie ist aber **180 × 120 mm** → in beide Reihen eingepasst (offene Frage).

Unterkategorien der Linie (Feld `themes`): alle 52 `geschenkartikel`; Kinder-/Namensdesigns zusätzlich `namensschilder` (34), Paare zusätzlich `hochzeitsschilder` (2).

## Neue Designs (gleiche D-Nummer = gleiches Design in beiden Größen)
| D | Name | Zielgruppe | Schriften | Motiv |
|---|---|---|---|---|
| D1650 | Biene mit Flugbahn · Mia · „Guten Appetit!“ | Kinder | Fredoka, Caveat | motive/tiere/biene-1.svg (Linie) |
| D1651 | Guten Morgen, Paul · Sonnenschein | Kinder | Baloo 2, Caveat | motive/sonne-mond-wolken/sonne-mit-gesicht.svg |
| D1652 | Guten Morgen · SOPHIE, Linie bis an den Rand | Erwachsene | Great Vibes, Montserrat Light | motive/sonne-mond-wolken/sonne-mit-meer.svg |
| D1653 | Anna & Ben · seit 2019 | Paar | Allura, Cormorant Garamond | motive/linien-mit-verzierungen/herzlinie-geschwungen.svg |
| D1654 | Erst Kaffee, dann reden. · JONAS | Erwachsene | Playfair Display, Josefin Sans | eigenes Motiv motive-eigene/brettchen/kaffeetasse.svg |

## Schriften (Abweichungen stehen je Design in `deviations`)
- Ersatztabelle angewandt: Times New Roman → Libre Baskerville, Champagne & Limousines → Montserrat Light.
- Ohne Ersatzregel, vorläufig ersetzt (**offene Frage**): Quentin → Sacramento (FB-H-D14–D18, D35), Vista La Diva → Great Vibes (FBM-H-D1), Dairy day → Caveat (FBV-H-D7), Freeds → Dancing Script (FBV-H-D4), Copperplate Gothic → Cinzel (FBV-H-D7), Ashley Marie (freigegeben, Datei fehlt) → Ashley (FBM-H-D5, FBV-H-D5; dort „Beste Mama“/„Bester Papa“ etwas nach oben gesetzt bzw. verkleinert, damit nichts überdeckt).
- Ashley-Sonderzeichen (U+E034, Schwung-a mit Herz) in FBM-H-D2/FBV-H-D8 bleibt 1:1.

## Prüfung
- Gravurfläche: gesamt ≤ 12,6 %, größte zusammenhängende Füllfläche ≤ 5,1 % (FB-H-D7 Ring 3,9 %) – unter der 15-%-Regel.
- Neue Designs: Rand ≥ 4 mm, keine Überlappung (Tintenbox), Motive Linie/Kontur.
- Keine Bilder im Katalog, keine Freigaben, keine Familien/Linien geändert.

## Startdesign-Vorschlag
**FB-H-D20 „Paul“ (Teddy schaut über die Linie)** – typisches Kinder-Frühstücksbrettchen, sofort verständlich, feine Linie, Name groß. Für Erwachsene: **D1652 „Guten Morgen“**.

## Offene Fragen an Chris
1. **Familie Brettchen Holz** fehlt (Maße/Stärke/Preis je Größe, Ecken) und der Konfigurator kennt Holz nicht – soll eine Familie angelegt und Holz als Material ergänzt werden (Code-Auftrag)? Erst dann native Vorschau, Ziele und Freigabe.
2. FBM-H: Bogen „20 × 13“, Schnittlinie 180 × 120 mm – gibt es ein Brettchen 18 × 12?
3. Ersatzschriften oben (Quentin, Vista La Diva, Dairy day, Freeds, Copperplate Gothic) bestätigen oder Dateien liefern; Ashley Marie liefern.
4. UV-Designs (35) bleiben außen vor – richtig so?

## Selbstprüfung
- Bestand 1:1: sehr einheitlicher, guter Stil (Tiere/Kinder über der Linie, Kochmützen-Embleme). Einige Bestandsdesigns nutzen die Fläche wenig (D12–D18 klein unten) – bewusst 1:1 gelassen.
- In der jeweils anderen Größe sind die Designs nur eingepasst (Seitenverhältnis 1,47 ↔ 1,54): etwas mehr Rand oben/unten bzw. seitlich.
- Neue Designs: D1652, D1653 stark; D1651 kindgerecht, Text dreizeilig etwas voll; D1650 einfach und klar; D1654 humorvoll, Tasse bewusst schlicht.
