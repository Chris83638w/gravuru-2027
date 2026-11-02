# Familienschilder mit Figuren und Sets – Bericht (Issue #125, Stand 02.11.2026, Neustart)

Katalog-Branch `dev/familien-figuren-20261102` (Entwurfs-PR im Katalog), Kontaktbögen hier. Linie Edelstahl-Türschilder, Ziele je Design: Edelstahl + Acryl 3 mm schwarz/anthrazit (gleiche Designs). Freigabe: offen (nur Chris).

## Was der Neustart geändert hat
- Unfertiges des Vorgängers (D858/D859 ohne Bibliothek, Piktogramm-Figuren mit WC-Schild-Optik) als `git stash` „Vorgänger unfertig“ gesichert, nicht gelöscht; neu aufgebaut.
- Katalog-main eingemischt (DESIGN-MASTER §7 „Keine großen Freiflächen, Gestaltung mittig“).
- **Alle Designs neu gesetzt:** Titel + Figuren + Namen als Gruppe mittig, Gruppe so groß wie die Form zulässt (Rand je Form 2,2–6 mm). Jede Form hat ihre eigene Anordnung (Querformat: Titel über der Reihe bzw. Figuren links/Text rechts; Quadrat und Rund: zweizeiliger Titel, Figuren groß; Langformat: Figuren links, drei Textzeilen).
- **„Richtige Familienschilder“ (Chris):** auf jedem Format stehen alle Familienmitglieder mit Namen – unter jeder Figur (inkl. Haustier) oder als Namenszeile („Tom, Anna & Ella“). Nachname ist immer die größte Schrift, „Familie“ bzw. „Hier wohnt Familie“ kleiner.

## Bibliothek `motive-eigene/familien-figuren/<stil>/` (`kundenkonfi: false`)
6 Stile × (7 Einzelfiguren + 123 Sets) = 780 Motive: Strich, **Figuren (neu: Minimal-Figuren, Hände ineinander)**, Bärchen, Eulen, Schildkröten, **Pinguine (neu)**. Sets: Paar M+F / F+F / M+M mit 0–4 Kindern, alleinerziehend Mutter/Vater mit 1–3 Kindern, je ohne / + Hund / + Katze; gleiche Fußlinie, Namensanker je Figur in `motive-eigene.json`.
Übersichten: strich-, baer-, eule-, schildkroete-, figuren-, pinguin-bibliothek.jpg.

## Designs (12 Entwürfe, 99 Design-Ordner)
| Kennung | Name | Modus / Vorlage | Schriften | Motiv |
|---|---|---|---|---|
| D850 | Strichfamilie · Reihe mit Namen und Herzballon | Referenz KSFI-S-D1…D23 (Kordelschild) | Patrick Hand, Pacifico | ff-strich-mann-frau-junge-maedchen-hund + Sonne |
| D851 | Strichfamilie links · Familie mit Namen | Referenz KSFI-S-D8 (gespiegelt) | Kalam, Courgette | ff-strich-mann-frau-maedchen (Langformat 4 Figuren) + Herz |
| D852 | Bärchenfamilie · Reihe mit Namen | neu | Fredoka, Kaushan Script | ff-baer-…-katze + Herz |
| D853 | Bärchen links · Familie mit Namen | neu | Comfortaa, Courgette | ff-baer-frau-frau-maedchen |
| D854 | Eulenfamilie · Reihe mit Namen und Mond | neu | Baloo 2, Satisfy | ff-eule-… + Mond/Sterne |
| D855 | Eulen auf dem Ast · Familie mit Namen | Referenz Bestand TQ-KS-D60/D61, TRE-AV2A-D67/D68 | Josefin Sans, Dancing Script | ff-eule-mann-frau-maedchen-baby + Ast |
| D856 | Schildkrötenfamilie · Reihe mit Namen | neu | Comic Neue, Courgette | ff-schildkroete-… + Sonne |
| D857 | Schildkröten-Parade · Hier wohnt Familie | neu | Patrick Hand, Satisfy | ff-schildkroete-frau-maedchen-baby auf Bodenlinie bis an den Rand + Sonne |
| D858 | Figuren modern · Reihe mit Namen auf feiner Linie | neu | Josefin Sans, Playfair Display | ff-figuren-mann-frau-maedchen-junge-hund, Linie bis an den Rand |
| D859 | Figuren modern links · Familie mit Namen | neu | Montserrat, Great Vibes | ff-figuren-mann-mann-junge |
| D860 | Pinguinfamilie · Reihe mit Namen und Herz | neu | Caviar Dreams, Lobster | ff-pinguin-… + Herz |
| D861 | Pinguine links · Familie mit Namen | neu | Raleway, Parisienne | ff-pinguin-frau-junge-baby (alleinerziehend) + Herz |

Rund und teils Quadrat: kleinere Sets (3 Figuren), weil 5 Namen mit ≥ 3 mm Versalhöhe die Figuren sonst winzig machen.

## Inventur Figuren-Designs (D850–D949) je Formatreihe
| Formatreihe | vorher | nachher | angebotene Größen |
|---|---|---|---|
| 8×5 Rechteck / 8×5 abgerundet | je 8 | je 12 | ab 9×6 (8×5 nicht: Figuren zu fein) |
| Retro 1 / Retro 2 9×6 | je 8 | je 12 | alle |
| Oval 9×6 / Oval 15×8 | je 8 | je 12 | alle |
| Quadrat 8×8 | 8 | 12 | alle |
| **Rund 6,5** | 0 | **12** | ab 8,5 (6,5 nicht) |
| 8×3,5 / 9×3 | je 1 | je 1 | alle (Issue: Strich einfach) |
| **Ellipse 12×4** | 0 | **1** (D851) | ab 15×5 (12×4 nicht) |
Summe 58 → 99 Design-Ordner. Kleinstreihen 5×2, 6×2, 7×2, 8×2 bewusst ohne Figuren.

## Messung Freiflächen (flaeche-messen.py, je Bogen)
| Bogen | Platten | Versatz max | Fläche | Höhe | Hinweise |
|---|---|---|---|---|---|
| strich | 17 (+2 Langformate zu flach für das Messraster) | x 0,6 % · y 1,5 % | 38–77 % | 48–85 % | 0 |
| figuren | 16 | 0,4 / 0,9 % | 41–77 % | 55–85 % | 0 |
| baer | 16 | 0,3 / 0,5 % | 38–71 % | 45–85 % | 1 (D853 Retro: Höhe 45 %) |
| eule | 16 | 0,7 / 0,5 % | 42–72 % | 57–89 % | 0 |
| schildkroete | 16 | 0,1 / 0,9 % | 38–83 % | 45–87 % | 0 |
| pinguin | 16 | 0,4 / 0,7 % | 36–73 % | 43–86 % | 4 (D861 Querformat: Höhe 43–45 %) |
Vorher (Vorgänger-Stand, nachgemessen): Versatz bis 21,7 % (D853), 5–6 % (D850 Oval, D857), Höhe bis 31 %.
Begründung Resthinweise: D853/D861 sind „Figuren links, Text rechts“ – die Gruppe füllt 84–89 % der Breite, die Höhe liegt knapp am Richtwert (43–45 %), weil drei breite Tierfiguren nebeneinander stehen. Die Messwerte der Vorlagen-Vorschaubilder oben auf den Bögen strich/eule sind keine Designs.

## Startdesign-Vorschlag
**D850 (Strichfamilie mit Namen und Herzballon)** – das typische Familienschild schlechthin, nah an der Bestands-Referenz, alle Familienmitglieder mit Namen, liest sich auf jeder Form. Platz 2: **D858** (modern, für Erwachsenen-Haushalte, Konfi fast überall „passt“).

## Offene Fragen an Chris
1. Sollen einzelne Bibliotheksfiguren/Sets in den Kundenkonfi (`motive/motive.json`)? Bisher alle `kundenkonfi: false`.
2. Figuren auf 8×5, Rund 6,5 und Ellipse 12×4 bewusst nicht angeboten (zu fein) – passt das?
3. Konfi meldet bei manchen Platten „prüfen“ wegen Konturen 0,37–0,49 mm (Regel: ab 0,3 mm gravierbar) bzw. Bohrloch-Hinweise (Bewertung ohne Befestigung).

## Selbstprüfung
- Jeder Bogen einzeln angesehen: keine Überlappung, nichts abgeschnitten, kleinste Versalhöhe 3,08 mm auf der Mastergröße, Namen mit Abstand ≥ 2,6 mm.
- Schwächen ehrlich: D856 Quadrat unten etwas Luft; D853/D861 Querformat knapp an der Höhe; Retro-Bohrlöcher (Vorschau) liegen teils auf Schrift – mit Befestigung weicht der Konfi aus.
- Nicht gemacht: Igel als 7. Stil (Zeit), Hochformat (die Linie hat keine Hochformate).
