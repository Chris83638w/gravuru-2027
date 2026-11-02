# Gedenktafeln AE (Acrylglas-Edelstahl) – Bericht (#129, Stand 02.11.2026, 02:50)

Katalog-Branch `dev/gedenktafeln-ae-20261102` (Familien b601c17, Schritt 1 6f4402f, Bestand fe0d6a6f8, Merge main 05d869532, Quadrat 5b82dd1ef).
Alle Designs: Ziele `gedenktafel-ae-acryl-anthrazit` + `-schwarz`, Freigabe offen (nur Chris). Preise der Familien weiter `null`.

## Inventur (vorher → nachher)
Vorher auf Katalog-main: 0 AE-Designs. Nachher (Designs je Größe und Shop-Thema):

| Größe | gedenktafeln | tiergedenktafeln | hundegedenktafeln | katzengedenktafeln |
|---|---|---|---|---|
| Rechteck 18×12 / 24×16 / 30×20 | 35 | 34 | 31 | 28 |
| Rechteck 42×28 | 35 | 33 | 30 | 27 |
| Quadrat 16 / 20 / 26 / 30 | 25 | 13 | 12 | 11 |

Je Zielgruppe: Rechteck 29 Menschen + 6 Sternenkinder + 34 Tiere (Ziel 29 erreicht); Quadrat 22 Menschen + 3 Sternenkinder + 13 Tiere (Ziel 29 **nicht** erreicht, siehe unten).

## Designs
- **Rechteck 3:2, Modus 1:1 (69):** Corel-Bogen „Gravur Rechteck“ (gilt laut Bestand für Acryl + Edelstahl, GT-AV2A), Edelstahl 30×20 und Sternenkinder; Schriften und Motive wie Vorlage (Ersatz nur nach Ersatztabelle). Native Zielvorschau „passt“ bzw. nur Bohrloch-Hinweis.
  Technisch korrigiert, Gestaltung unverändert: leere Corel-Textzeilen entfernt (D264, D282, D283, D289), D268 Anführungszeichen und D97 Kreuz entfernt (Konfi-Schriften Allura/Minimalist ohne diese Zeichen), D252 ohne 42×28 (Name dort 119 mm > Konfi-Grenze 100 mm).
- **Quadrat, Modus 1:1 (9):** Edelstahl 20×20 D0, D1, D4, D5, D6, D7, D10, D11, D12.
- **Quadrat, Modus Referenz (29), D1700–D1732:** aus den 3:2-Vorlagen – gleiche Texte, Schriften, Motive und Text-Größenverhältnisse, Anordnung für das Quadrat neu (Stapel bzw. Motiv seitlich), Gruppe mittig. Vorlage steht je Design in `provenance.sourceDesign` und klein auf dem Bogen. Keine neuen Motive.
  D1700←D53, D1701←D58, D1702←D63, D1703←D64, D1704←D70, D1705←D72, D1707←D90, D1708←D100, D1709←D59, D1710←D60, D1711←D61, D1712←D66, D1713←D73, D1714←D97, D1715←D50, D1716←D75, D1717←GTSK-D3, D1718←D85, D1719←D86, D1720←D259, D1722←D272, D1723←D274, D1724←D280, D1725←D282, D1726←D284, D1727←D291, D1730←V2A-30x20-D10, D1731←D257, D1732←D268.
  Verworfen nach Sichtprüfung (nicht im Katalog): D1706 (D80), D1721 (D271), D1728 (D286), D1729 (D52), D1733 (D269), D1734 (D292) – zu kleine Schrift bzw. kleines Motiv in großer Fläche.

## Freiflächen-Messung (flaeche-messen.py)
| Bogen | n | Fläche | Höhe | max. Versatz | außerhalb Richtwert |
|---|---|---|---|---|---|
| Rechteck Menschen/Sternenkinder 1:1 | 35 | 41–86 % | 53–93 % | x 9,1 % / y 6,0 % | 9: D53 (x +9), D57 (x +4, y −3), D65 (y +5), D80 (y +6), D98 (x −4), V2A-D3 (y +3), D88 (x −3, y −4), D91 (y +5), GTSK-D3 (x −5) |
| Rechteck Tiere 1:1 | 34 | 35–91 % | 77–97 % | x 4,2 % / y 6,0 % | 6: D291 (y −3), D260 (x −4), D263 (y +3), D270 (y +4), D272 (y +6), D274 (y +5) |
| Quadrat Bestand 1:1 | 9 | 58–81 % | 67–89 % | x 8,9 % / y 3,9 % | 6: D0 (x +9), D4 (y +3), D5 (x +3, y −4), D6 (x −3), D7 (y +4), D12 (y +3) |
| **Quadrat Referenzen** | 29 | 41–72 % | 57–89 % | x 1,5 % / y 1,3 % | **0** |

Die Ausreißer sind ausnahmslos 1:1 übernommene Corel-Originale im gleichen Seitenverhältnis; laut Ergänzung des Operators (02.11.) bleiben sie unverändert (meist bewusste Asymmetrie: Motiv als Gegengewicht). Füllflächen: größte zusammenhängende Gravurfläche 11,8 % (D278) – unter 15 %.

## Startdesign-Vorschlag
- Rechteck Menschen: **GT-S-30x20-D70** (Christel Müller – Name in Schreibschrift, Rose als Gegengewicht, §8-Hausstil); Quadrat dazu **D1704** (gleiches Design).
- Rechteck Tiere: **GT-S-30x20-D284** (Nala – Pfote mit Flügeln und Knochen, Name im Knochen); Quadrat dazu **D1726**.

## Offene Fragen an Chris
1. **Preise** AA/AS je Größe und Option Edelstahl (ohne / bündig / Rahmen) – alle `null`.
2. **Foto-Designs:** Die AE-Familien haben keine Fotoangabe (Fotogravur inklusive oder Aufpreis); die Vorschau meldet das bei jedem Fotofeld. Erst danach können „Mensch/Tier mit Foto“ (30×20-Bestand mit Musterfoto) Ziele bekommen.
3. **`gedenktafeln-22x14` (24 Tier-Designs mit Foto):** nicht 3:2-fähig – Seitenverhältnis 4,5 % daneben, Vorschau verlangt eine eigene eingepasste Variante. Keine Ziele gesetzt.
4. **Quadrat auf 29 je Zielgruppe:** Bestand reicht nicht (nur 9 Quadrat-Gravurdesigns). Weitere Referenzen gehen nur aus Vorlagen mit mehreren großen Motiven bzw. Text im Motiv – das braucht Handarbeit je Design. Alternativ die Schiefer-Quadrat-Designs des Chats #126 nach deren Merge zusätzlich auf AE zielen.
5. **Konfi-Schriften:** Allura ohne „ und Minimalist ohne † (die Katalog-TTF haben beide) – bitte im Konfi-Zeichensatz ergänzen (Astra), dann können D268/D97 das Original zurückbekommen.
6. Mikas Schiefer-30×20-Master und die Astra-Branch `dev/schiefer-d98-konfi-20261030-astra-mika` (eigener GT-S-30x20-D98-Entwurf im gleichen Ordner) sind nicht auf main – keine Ziele, beim Merge auf Doppelung achten.

## Selbstprüfung
Jedes Design im nativen Bogen angesehen. 1:1-Designs entsprechen der Vorlage (Original klein daneben). Quadrat-Referenzen: Reihenfolge der Zeilen wie Vorlage, Motiv vollständig und unverzerrt, Name bleibt das Größte, keine Überlappung, kleinste Schrift ≥ 4,8 mm am 20×20-Master. Schwächen ehrlich: Bei D1713/D1723 ist der Spruch eher klein; D1707 übernimmt die Datumsecken der Vorlage. Bohrlöcher nicht bewertet (Regel „ohne Befestigung“). Stash „Vorgänger unfertig“: GT-S-30x20-D266 (Motiv ragt auf allen Größen über die Gestaltungsfläche).

## Kontaktbögen
bogen-01-schritt1.jpg (Vorgänger) · bogen-02-rechteck-menschen-sternenkinder.jpg · bogen-03-rechteck-tiere.jpg · bogen-04-quadrat-bestand.jpg · bogen-05-quadrat-referenzen.jpg (+ -markiert.jpg mit Messrahmen)
