# Linienübersicht mit Ampel – Stand 10.11.2026

Zweck: Basis für den Tagesplan bis 15.11.2026 (Issue #230, Produktkette). Nur gelesen: Katalog-Repo, gravuru-2027 (origin/main), Issues. Nichts angelegt, nichts live verändert. Quellenkürzel in eckigen Klammern, aufgelöst im Abschnitt Quellen und im Blatt „Quellen“ der Excel.

## Ampel-Regel (fest)

- GRÜN: Stammdaten vollständig + Preise vollständig bestätigt + mindestens eine Reihe freigegebener Designs + kein fehlender Konfi-Baustein belegt.
- GELB: genau ein Punkt fehlt oder ist nur teilweise.
- ROT: mehr als ein Punkt fehlt, oder ein fehlender Konfi-Baustein ist belegt.
- „nicht belegt“ zählt wie „fehlt“. Freigaben im Katalog sind Sammelfreigaben von Chris („eingetragen von Claude“), keine Einzelprüfung. Quadrat ist nicht Rechteck.
- Grün heißt nur: nach den vier Katalogpunkten bereit für die Stationen Strecke/Freigabe der Kette. Die Pipeline-Freigabe (Excel v1, planHash) steht für keine Linie aus den Quellen als erteilt fest.

## Übersicht

| Linie | Ampel | Stammdaten | Preise | Designs Bestand / Katalog / freigegeben | Baustein | Shop | was fehlt (max. 3) | wer kann es liefern |
|---|---|---|---|---|---|---|---|---|
| Türschilder Edelstahl (Familie steel-door-signs) | GELB | 80 Größen (Familie), Formen Rechteck/abgerundet/Quadrat/Oval/Rund/Retro 1+2; Live-Konfi 17 Reihen. [K1][G1] | teilweise: 80/80 Größen mit Preis (K1); Chris-bestätigt u. a. 4.22/N38; offen 8.11 Rund-/Retro-Preise 'nicht als erledigt belegt' [G2] | Bestand 76 D-Nr. (streng) / Katalog 238 D-Nr. = 2285 Master / freigegeben 2246 Master, 218 D-Nr. vollständig, 20 D-Nr. teilweise [K2]. Live-Konfi nur 24 D-Nr. [K3]. Anteil Bestand 76 : neu 162 (Pilot-Handoff nennt 73) [K2][P1] | Live im Prio-Konfi (Kontaktbögen 10.11.); kein fehlender Baustein belegt; Edelstahl ohne Foto/Logo-Foto (Logo 12,99 € laut 4.49) [K3][G2] | Online (Live-Konfi prio-r15, 17 Reihen, 80 Größen, 404 Varianten laut Auftrag); letzter Rücklese-Stand des Prio-Edelstahl-Produkts 08.11. = DRAFT (Widerspruch) [K3][G3] | 1) Rund-/Retro-Preise (8.11) bestätigen; 2) 214 D-Nr. liegen im Katalog, aber nicht im Live-Konfi; 3) Widerspruch Live/DRAFT klären | Chris-Entscheidung (8.11); Mika-Konfi (Design-Anbindung); Operator (Veröffentlichung) |
| Türschilder Acrylglas 3 mm (Pilot der Kette; anthrazit + schwarz) | ROT | 2 Familien à 80 Größen; Formen laut Pilot-Handoff offen (Oval 30×10 offen) [K1][P1] | teilweise: 79 von 80 Größen mit Acrylpreis belegt, Oval 30×10 offen (STAND.md); Fotogravur-Aufpreis offen (8.5) [K4][G2] | Bestand 76 D-Nr. / Katalog 238 D-Nr. = 2285 Master (Ziele acryl-3mm-anthrazit/-schwarz) / design.json: 2246 freigegeben [K2]. Pilot-Handoff und STAND.md (737 Master 'alle ohne Freigabe') widersprechen der design.json-Freigabe [P1][K4] | Rückseitengravur (hinten graviert) ist festgelegt (N37/N38); Foto-Rückseite nicht geprüft; kein fehlender Baustein belegt [K4][P1] | nicht in Shopify belegt (Pilot, Entwurfsstation); 2 feste Acryl-12×8-Startprodukte (Leuchtturm D8, Baum D10) laut STAND.md bestehen [K4][G3] | 1) 9 offene Fragen an Chris im Pilot-Entwurf (u. a. Formen, Oval 30×10); 2) Freigabe-Stand widersprüchlich (Sammelfreigabe vs. 'alle ohne Freigabe'); 3) Bestandsdesigns-Übernahme (anderer Chat) nicht abgeschlossen | Chris-Entscheidung (9 Fragen); Design-Chat (Bestand D1–D73); Operator (Excel v1, Plan) |
| Funkklingelschilder (42 Modelle) | ROT | 42 Modelle, Migration 42×3 dokumentiert [K5]; Linie tuerklingeln.json: 'ausgeschlossen/zurückgestellt', STAND.md 27.10. hebt für 42 Modelle auf (Widerspruch) [K5][K6] | nicht belegt im Katalog; Altkonfi: Beispielwarenkorb 74,98 € [G3] | nicht gezählt (keine Funkklingel-Designserie in designs/*) ; 126 Designrevisionen laut STATUS 29.10. im Alt-Konfi [G3] | Altkonfi: Dropdowns Format/Position/Rahmen/Farbe, 5 Befestigungskacheln [G3]; Prio-Konfi-Abdeckung nicht belegt | Live im Alt-Konfi seit 29.10./02.11.: 126 Produkte / 42 Modelle / 30.240 Kombinationen (STATUS.md) [G3] | 1) Prio-Konfi-Übernahme nicht belegt; 2) Preise im Katalog nicht belegt; 3) Linienstatus (Ausschluss vs. Aufhebung) klären | Mika-Konfi (Übernahme in Prio); Chris-Entscheidung (Linienstatus) |
| Hausnummern/Namensschilder Acryl 5 mm mit Abstandshaltern (AA / AS / S-S) | GELB | 3 Familien à 54 Größeneinträge; Entscheidungsregister 4.19: 'Sortiment nur 33 Excel-Größen', Hochformat eigenes Produkt (Zahl 54 vs. 33 nicht aufgelöst) [K1][G2] | vollständig bestätigt (Grundpreise je Größe 54/54 baseCents; Set 2er 1,99 €, 4er 3,99 €, S/S = AA/AS + 2 €; Farben +1/+2 €) laut 4.19; Linien-JSON sagt 'Preise offen' (Widerspruch) [K1][G2][K7] | Bestand 0 strikt (154 Master tragen 'Referenz: designs/bestand', 132 neu) / Katalog 26 D-Nr. = 286 Master / freigegeben 286 Master [K2] | Abstandshalter nur Draufsicht je Farbe (3.38), Farben bestätigt (3.30); kein fehlender Baustein belegt [G2] | nicht in Shopify belegt; AA/AS/S-S an Astra Mika vergeben (7.12) [G2] | 1) 33 vs. 54 Größen klären (Stammdaten teilweise); 2) Linienstatus 'Preise offen' korrigieren/bestätigen; 3) Bestandsdesigns (Chris will D-Reihen, hier 0 streng) | Chris-Entscheidung (33 vs. 54); Design-Chat (Bestand); Mika-Konfi |
| Türschilder Schiefer | ROT | keine Familie im Katalog (familien/schiefer/ enthält nur Gedenktafeln) [K1] | teilweise: nur 3 Größen in Preisdatei (7×2 12,99 · 8×3,5 14,99 · 8×5 17,99) [G2] | Bestand: nicht gezählt (designs/bestand/tuerschilder Materialmix) / Katalog: kein Ziel 'Schiefer-Türschild' / freigegeben 0 [K2] | nicht belegt | nicht belegt | 1) Familie/Rohling fehlt; 2) Größenliste und restliche Preise; 3) Zieldefinition für Designs | Chris-Entscheidung; Operator (Familie anlegen) |
| Pferde-Boxenschilder 30×20 Alu-Dibond (UV-Druck) | ROT | Linie alu-dibond-30x20: 'Familie offen' (3 mm, eckig, Ø 4, 2/4 Löcher oder Schrauben, selbstklebend, vollflächiger Druck); keine Familie [K8] | nicht belegt | Bestand 11 Designs (Reihe BSUV-AD UV Alu-Dibond) von 111 Boxenschild-Bestandsdesigns / Katalog 0 (Box-Master zielen auf Türschild-Familien, nicht auf Dibond) / freigegeben 0 [K9][K2] | UV-Druck: Farbwähler vorhanden im Prozessprofil der Farbdruck-Verfahren (tools.textColor), im Prio-Konfi nicht belegt [G4] | nicht belegt | 1) Familie und Preise; 2) Katalog-Master für Dibond; 3) Farbwähler im Prio-Konfi nachweisen | Chris-Entscheidung; Design-Chat; Mika-Konfi (Farbwähler) |
| Pferde-/Boxenschilder auf Edelstahl- und Acryl-Türschild (Gravur) | GELB | Zuordnung zu Familie steel-door-signs / Acryl 3 mm; Linie pferdeschilder.json: 'Familie offen' [K1][K8] | über Türschild-Familien (siehe Zeile 1/2); eigene Preise nicht belegt | Bestand 13 D-Nr. / Katalog 25 D-Nr. = 37 Master / freigegeben 37 Master [K2]. Bestandsordner boxenschilder: 101 Designs [K9] | kein fehlender Baustein belegt | nicht belegt (nicht im Live-Konfi nachgewiesen) | 1) Linienzuordnung 'Familie offen' entscheiden; 2) Eintrag in Live-Konfi | Chris-Entscheidung; Mika-Konfi |
| Grabstecker Edelstahl (nahe fertig; nicht im Auftrag genannt) | GRÜN | 33 Größen, 13 Formen, 33/33 Innenausschnitte [K1][K4] | vollständig: 33 Preise in Preisdatei Chris 02.11. (4.23) [G2][K10] | Bestand 855 IDs mit Bestandsquelle (Schlüssel ohne Größe, nicht D-Nr.-vergleichbar) / Katalog 2680 Master / freigegeben 2680 [K2] | kein fehlender Baustein belegt (Text, Motive); Foto nicht erforderlich | 102 DRAFTs (268 Varianten, 12 Collections), 0 veröffentlicht; Rücklesen 03.11. 11:01 UTC [G5] | 1) Stationen 3/4 der Kette (Freigabe, Veröffentlichung) offen; 2) Freigaben sind Sammelfreigaben, keine Einzelprüfung; 3) Prio-Konfi-Abgleich der DRAFTs nicht belegt | Chris-Entscheidung (Freigabe); Operator (Veröffentlichung) |
| Gedenktafeln Schiefer 22×14 (natur; Tiere/Foto; Hunde 2027) | GRÜN | 1 Größe je Familie (natur, Hunde 2027); Foto-Konfiguration vorhanden [K1] | vollständig: 25,99 € inkl. 1. Foto; Bohrung/Abstandshalter/weiteres Foto 9,99/Silikon/Ständer (4.23, 4.48) [G2][K10] | Bestand 0 strikt (Bestandsordner schiefer-mit-foto 15, gedenktafeln 650 unklassifiziert) / Katalog 22 Tier-Master + 82 Monogramme / freigegeben 22 + 82 [K2][K9] | Foto-Modul vorhanden (Schiefer-Pilot); Lizenzbelege Schriften Amarillo/Ampera/Anthoni (Pkt. 19) mit Ersatz [G2] | nicht belegt (Andenken-Pilot Astra 07.11. dokumentiert; Shop-ID nicht übernommen) | 1) Familienzuordnung GT-S-22x14-D234/D235 mehrdeutig (8.10); 2) Schrift-Lizenzbelege; 3) Bestandsdesigns 0 strikt | Chris-Entscheidung (8.10); Operator (Lizenznachweise) |
| Gedenktafeln Schiefer 30×20 (natur / premium) | GELB | 1 Größe je Familie [K1] | natur vollständig; premium: baseCents null (offen) [K1] | Bestand: Monogramme 78 von 82 / Katalog 82 Monogramme-Master (kein Trauer-Design-Ziel) / freigegeben 82 [K2] | kein fehlender Baustein belegt | nicht belegt | 1) Premium-Preis; 2) Gedenktafel-Designs (Trauer) ohne Ziel; 3) Sammelfreigabe prüfen | Chris-Entscheidung (Preis); Design-Chat |
| Gedenktafeln Acryl AE (8 Größen, Rahmen/bündig) | GELB | 2 Familien à 8 Größen (Rechteck 3:2 18×12–42×28, Quadrat 16–30) [K1][G2] | teilweise: Preise in Preisdatei (Edelstahl bündig als Aufpreis, Rahmen +1,00 €); offen 8.7 (Bohrungen 18×12/24×16, Fotoangaben) [G2][K10] | Bestand 76 D-Nr. / Katalog 105 D-Nr. = 107 Master / freigegeben 107 [K2] | Foto/Bohrungen laut 8.7 offen; Konfi-Baustein nicht belegt | nicht belegt | 1) 8.7 Antworten (Bohrungen, Fotoangaben); 2) Farben schwarz/anthrazit bestätigen | Chris-Entscheidung (8.7); Mika-Konfi |
| Gedenktafeln Acryl 30×20 (anthrazit/schwarz) | ROT | 1 Größe je Familie [K1] | offen: baseCents null (beide Familien) [K1] | Bestand 0 / Katalog kein Ziel für diese Familien / freigegeben 0 [K2] | nicht belegt | nicht belegt | 1) Preis; 2) Designs ohne Ziel; 3) Umfang Acryl-Gedenkartikel (8.6, 'noch nicht umsetzen') | Chris-Entscheidung (8.6) |
| Gedenktafeln Edelstahl 30×20 | ROT | 1 Größe; weitere Größen offen (STAND.md) [K1][K4] | 1 Größe mit Preis (baseCents gesetzt); weitere Größen nicht belegt [K1] | Bestand 0 / Katalog kein Ziel / freigegeben 0 [K2] | nicht belegt | nicht belegt | 1) weitere Größen; 2) Preise; 3) Designs ohne Ziel | Chris-Entscheidung |
| Hunde-/Tierschilder (Unterkategorie Edelstahl-Türschild; Rasse-Schilder 150×100) | GELB | Unterkategorie von steel-door-signs; Rasse-Schilder ausschließlich 150×100 mm [K1][K4] | über Türschild-Edelstahl (Zeile 1) | Bestand 5 D-Nr. (Hunde-Thema) von 12 / Katalog Hunde 12 D-Nr., Rasse-Schilder 960 Master (0 Bestand) / freigegeben 960 Master; STAND.md sagt 'Freigaben null' (Widerspruch) [K2][K4] | kein fehlender Baustein belegt | nicht im Live-Konfi nachgewiesen (nur 24 D-Nr. live) | 1) Freigabe-Widerspruch Rasse-Schilder; 2) Aufnahme in Live-Konfi; 3) Bestandsdesigns (hunde-ecke 33, tierschilder 35) nicht übernommen | Chris-Entscheidung (Freigabe); Design-Chat; Mika-Konfi |
| Firmenschilder (Unterkategorie Edelstahl-Türschild) | GELB | Unterkategorie von steel-door-signs [K1] | über Türschild-Edelstahl (Zeile 1) | Bestand 0 strikt / Katalog 13 D-Nr. / freigegeben 13 (Bestandsordner firmenschilder: 30 Designs, nicht übernommen) [K2][K9] | kein fehlender Baustein belegt | nicht im Live-Konfi nachgewiesen | 1) Bestandsdesigns übernehmen (30 im Ordner); 2) Aufnahme in Live-Konfi | Design-Chat; Mika-Konfi |
| Hinweisschilder (Unterkategorie Edelstahl-/Acryl-Türschild) | GELB | Hinweis-Serien HP/HSH (120×40, 150×80, 80×80, 80×53,3) [K1] | über Türschild-Familien | Bestand 178 von 181 Master / Katalog 181 / freigegeben 181 (Bestandsordner hinweisschilder 277 Designs) [K2][K9] | kein fehlender Baustein belegt | nicht im Live-Konfi nachgewiesen | 1) Aufnahme in Live-Konfi; 2) Passung 80×80 / 120×40 zu den 80 Familiengrößen prüfen | Mika-Konfi; Operator |
| Grabkreuze Acryl (UV-Druck) | ROT | keine Familie im Katalog [K1] | nicht belegt | Bestand 151 (Ordner kreuze, Material nicht geprüft) / Katalog 0 / freigegeben 0 [K9] | UV-Farbwähler im Prio-Konfi nicht belegt [G4] | nicht belegt | 1) Familie/Rohling; 2) Preise; 3) Verfahren (Gravur vs. UV-Druck, 8.6) | Chris-Entscheidung (8.6); Mika-Konfi |
| Schlüsselanhänger | ROT | Linie schluesselanhaenger.json: 'Familie offen', families [] [K8] | nicht belegt | Bestand 1402 Designs (Ordner, unklassifiziert) / Katalog 0 / freigegeben 0 [K9] | nicht belegt | nicht belegt | 1) Familie/Rohling; 2) Preise; 3) Katalog-Master | Chris-Entscheidung; Design-Chat |
| Brettchen (Holz 20×13 / 22,5×15) | ROT | Linie brettchen.json: 'Familie offen'; 2 Serien brettchen-holz-200x130 / -225x150 [K8] | nicht belegt | Bestand 84 (Ordner fruehstuecksbrettchen) / Katalog 104 Master = 52 Designs (je 2 Größen) / freigegeben 0 (kein Ziel) [K2][K9] | nicht belegt | nicht belegt | 1) Familie und Preise; 2) Zielzuordnung der Master; 3) Freigabe | Chris-Entscheidung; Operator |

## Linien nach Ampel

- GRÜN (2): Grabstecker Edelstahl (nahe fertig; nicht im Auftrag genannt); Gedenktafeln Schiefer 22×14 (natur; Tiere/Foto; Hunde 2027)
- GELB (8): Türschilder Edelstahl (Familie steel-door-signs); Hausnummern/Namensschilder Acryl 5 mm mit Abstandshaltern (AA / AS / S-S); Pferde-/Boxenschilder auf Edelstahl- und Acryl-Türschild (Gravur); Gedenktafeln Schiefer 30×20 (natur / premium); Gedenktafeln Acryl AE (8 Größen, Rahmen/bündig); Hunde-/Tierschilder (Unterkategorie Edelstahl-Türschild; Rasse-Schilder 150×100); Firmenschilder (Unterkategorie Edelstahl-Türschild); Hinweisschilder (Unterkategorie Edelstahl-/Acryl-Türschild)
- ROT (9): Türschilder Acrylglas 3 mm (Pilot der Kette; anthrazit + schwarz); Funkklingelschilder (42 Modelle); Türschilder Schiefer; Pferde-Boxenschilder 30×20 Alu-Dibond (UV-Druck); Gedenktafeln Acryl 30×20 (anthrazit/schwarz); Gedenktafeln Edelstahl 30×20; Grabkreuze Acryl (UV-Druck); Schlüsselanhänger; Brettchen (Holz 20×13 / 22,5×15)

## Je Linie (Detail mit Quellen)

### Türschilder Edelstahl (Familie steel-door-signs) – GELB
- Stammdaten: 80 Größen (Familie), Formen Rechteck/abgerundet/Quadrat/Oval/Rund/Retro 1+2; Live-Konfi 17 Reihen. [K1][G1]
- Preise: teilweise: 80/80 Größen mit Preis (K1); Chris-bestätigt u. a. 4.22/N38; offen 8.11 Rund-/Retro-Preise 'nicht als erledigt belegt' [G2]
- Designs: Bestand 76 D-Nr. (streng) / Katalog 238 D-Nr. = 2285 Master / freigegeben 2246 Master, 218 D-Nr. vollständig, 20 D-Nr. teilweise [K2]. Live-Konfi nur 24 D-Nr. [K3]. Anteil Bestand 76 : neu 162 (Pilot-Handoff nennt 73) [K2][P1]
- Baustein: Live im Prio-Konfi (Kontaktbögen 10.11.); kein fehlender Baustein belegt; Edelstahl ohne Foto/Logo-Foto (Logo 12,99 € laut 4.49) [K3][G2]
- Shop: Online (Live-Konfi prio-r15, 17 Reihen, 80 Größen, 404 Varianten laut Auftrag); letzter Rücklese-Stand des Prio-Edelstahl-Produkts 08.11. = DRAFT (Widerspruch) [K3][G3]
- Was fehlt: 1) Rund-/Retro-Preise (8.11) bestätigen; 2) 214 D-Nr. liegen im Katalog, aber nicht im Live-Konfi; 3) Widerspruch Live/DRAFT klären
- Wer: Chris-Entscheidung (8.11); Mika-Konfi (Design-Anbindung); Operator (Veröffentlichung)

### Türschilder Acrylglas 3 mm (Pilot der Kette; anthrazit + schwarz) – ROT
- Stammdaten: 2 Familien à 80 Größen; Formen laut Pilot-Handoff offen (Oval 30×10 offen) [K1][P1]
- Preise: teilweise: 79 von 80 Größen mit Acrylpreis belegt, Oval 30×10 offen (STAND.md); Fotogravur-Aufpreis offen (8.5) [K4][G2]
- Designs: Bestand 76 D-Nr. / Katalog 238 D-Nr. = 2285 Master (Ziele acryl-3mm-anthrazit/-schwarz) / design.json: 2246 freigegeben [K2]. Pilot-Handoff und STAND.md (737 Master 'alle ohne Freigabe') widersprechen der design.json-Freigabe [P1][K4]
- Baustein: Rückseitengravur (hinten graviert) ist festgelegt (N37/N38); Foto-Rückseite nicht geprüft; kein fehlender Baustein belegt [K4][P1]
- Shop: nicht in Shopify belegt (Pilot, Entwurfsstation); 2 feste Acryl-12×8-Startprodukte (Leuchtturm D8, Baum D10) laut STAND.md bestehen [K4][G3]
- Was fehlt: 1) 9 offene Fragen an Chris im Pilot-Entwurf (u. a. Formen, Oval 30×10); 2) Freigabe-Stand widersprüchlich (Sammelfreigabe vs. 'alle ohne Freigabe'); 3) Bestandsdesigns-Übernahme (anderer Chat) nicht abgeschlossen
- Wer: Chris-Entscheidung (9 Fragen); Design-Chat (Bestand D1–D73); Operator (Excel v1, Plan)

### Funkklingelschilder (42 Modelle) – ROT
- Stammdaten: 42 Modelle, Migration 42×3 dokumentiert [K5]; Linie tuerklingeln.json: 'ausgeschlossen/zurückgestellt', STAND.md 27.10. hebt für 42 Modelle auf (Widerspruch) [K5][K6]
- Preise: nicht belegt im Katalog; Altkonfi: Beispielwarenkorb 74,98 € [G3]
- Designs: nicht gezählt (keine Funkklingel-Designserie in designs/*) ; 126 Designrevisionen laut STATUS 29.10. im Alt-Konfi [G3]
- Baustein: Altkonfi: Dropdowns Format/Position/Rahmen/Farbe, 5 Befestigungskacheln [G3]; Prio-Konfi-Abdeckung nicht belegt
- Shop: Live im Alt-Konfi seit 29.10./02.11.: 126 Produkte / 42 Modelle / 30.240 Kombinationen (STATUS.md) [G3]
- Was fehlt: 1) Prio-Konfi-Übernahme nicht belegt; 2) Preise im Katalog nicht belegt; 3) Linienstatus (Ausschluss vs. Aufhebung) klären
- Wer: Mika-Konfi (Übernahme in Prio); Chris-Entscheidung (Linienstatus)

### Hausnummern/Namensschilder Acryl 5 mm mit Abstandshaltern (AA / AS / S-S) – GELB
- Stammdaten: 3 Familien à 54 Größeneinträge; Entscheidungsregister 4.19: 'Sortiment nur 33 Excel-Größen', Hochformat eigenes Produkt (Zahl 54 vs. 33 nicht aufgelöst) [K1][G2]
- Preise: vollständig bestätigt (Grundpreise je Größe 54/54 baseCents; Set 2er 1,99 €, 4er 3,99 €, S/S = AA/AS + 2 €; Farben +1/+2 €) laut 4.19; Linien-JSON sagt 'Preise offen' (Widerspruch) [K1][G2][K7]
- Designs: Bestand 0 strikt (154 Master tragen 'Referenz: designs/bestand', 132 neu) / Katalog 26 D-Nr. = 286 Master / freigegeben 286 Master [K2]
- Baustein: Abstandshalter nur Draufsicht je Farbe (3.38), Farben bestätigt (3.30); kein fehlender Baustein belegt [G2]
- Shop: nicht in Shopify belegt; AA/AS/S-S an Astra Mika vergeben (7.12) [G2]
- Was fehlt: 1) 33 vs. 54 Größen klären (Stammdaten teilweise); 2) Linienstatus 'Preise offen' korrigieren/bestätigen; 3) Bestandsdesigns (Chris will D-Reihen, hier 0 streng)
- Wer: Chris-Entscheidung (33 vs. 54); Design-Chat (Bestand); Mika-Konfi

### Türschilder Schiefer – ROT
- Stammdaten: keine Familie im Katalog (familien/schiefer/ enthält nur Gedenktafeln) [K1]
- Preise: teilweise: nur 3 Größen in Preisdatei (7×2 12,99 · 8×3,5 14,99 · 8×5 17,99) [G2]
- Designs: Bestand: nicht gezählt (designs/bestand/tuerschilder Materialmix) / Katalog: kein Ziel 'Schiefer-Türschild' / freigegeben 0 [K2]
- Baustein: nicht belegt
- Shop: nicht belegt
- Was fehlt: 1) Familie/Rohling fehlt; 2) Größenliste und restliche Preise; 3) Zieldefinition für Designs
- Wer: Chris-Entscheidung; Operator (Familie anlegen)

### Pferde-Boxenschilder 30×20 Alu-Dibond (UV-Druck) – ROT
- Stammdaten: Linie alu-dibond-30x20: 'Familie offen' (3 mm, eckig, Ø 4, 2/4 Löcher oder Schrauben, selbstklebend, vollflächiger Druck); keine Familie [K8]
- Preise: nicht belegt
- Designs: Bestand 11 Designs (Reihe BSUV-AD UV Alu-Dibond) von 111 Boxenschild-Bestandsdesigns / Katalog 0 (Box-Master zielen auf Türschild-Familien, nicht auf Dibond) / freigegeben 0 [K9][K2]
- Baustein: UV-Druck: Farbwähler vorhanden im Prozessprofil der Farbdruck-Verfahren (tools.textColor), im Prio-Konfi nicht belegt [G4]
- Shop: nicht belegt
- Was fehlt: 1) Familie und Preise; 2) Katalog-Master für Dibond; 3) Farbwähler im Prio-Konfi nachweisen
- Wer: Chris-Entscheidung; Design-Chat; Mika-Konfi (Farbwähler)

### Pferde-/Boxenschilder auf Edelstahl- und Acryl-Türschild (Gravur) – GELB
- Stammdaten: Zuordnung zu Familie steel-door-signs / Acryl 3 mm; Linie pferdeschilder.json: 'Familie offen' [K1][K8]
- Preise: über Türschild-Familien (siehe Zeile 1/2); eigene Preise nicht belegt
- Designs: Bestand 13 D-Nr. / Katalog 25 D-Nr. = 37 Master / freigegeben 37 Master [K2]. Bestandsordner boxenschilder: 101 Designs [K9]
- Baustein: kein fehlender Baustein belegt
- Shop: nicht belegt (nicht im Live-Konfi nachgewiesen)
- Was fehlt: 1) Linienzuordnung 'Familie offen' entscheiden; 2) Eintrag in Live-Konfi
- Wer: Chris-Entscheidung; Mika-Konfi

### Grabstecker Edelstahl (nahe fertig; nicht im Auftrag genannt) – GRÜN
- Stammdaten: 33 Größen, 13 Formen, 33/33 Innenausschnitte [K1][K4]
- Preise: vollständig: 33 Preise in Preisdatei Chris 02.11. (4.23) [G2][K10]
- Designs: Bestand 855 IDs mit Bestandsquelle (Schlüssel ohne Größe, nicht D-Nr.-vergleichbar) / Katalog 2680 Master / freigegeben 2680 [K2]
- Baustein: kein fehlender Baustein belegt (Text, Motive); Foto nicht erforderlich
- Shop: 102 DRAFTs (268 Varianten, 12 Collections), 0 veröffentlicht; Rücklesen 03.11. 11:01 UTC [G5]
- Was fehlt: 1) Stationen 3/4 der Kette (Freigabe, Veröffentlichung) offen; 2) Freigaben sind Sammelfreigaben, keine Einzelprüfung; 3) Prio-Konfi-Abgleich der DRAFTs nicht belegt
- Wer: Chris-Entscheidung (Freigabe); Operator (Veröffentlichung)

### Gedenktafeln Schiefer 22×14 (natur; Tiere/Foto; Hunde 2027) – GRÜN
- Stammdaten: 1 Größe je Familie (natur, Hunde 2027); Foto-Konfiguration vorhanden [K1]
- Preise: vollständig: 25,99 € inkl. 1. Foto; Bohrung/Abstandshalter/weiteres Foto 9,99/Silikon/Ständer (4.23, 4.48) [G2][K10]
- Designs: Bestand 0 strikt (Bestandsordner schiefer-mit-foto 15, gedenktafeln 650 unklassifiziert) / Katalog 22 Tier-Master + 82 Monogramme / freigegeben 22 + 82 [K2][K9]
- Baustein: Foto-Modul vorhanden (Schiefer-Pilot); Lizenzbelege Schriften Amarillo/Ampera/Anthoni (Pkt. 19) mit Ersatz [G2]
- Shop: nicht belegt (Andenken-Pilot Astra 07.11. dokumentiert; Shop-ID nicht übernommen)
- Was fehlt: 1) Familienzuordnung GT-S-22x14-D234/D235 mehrdeutig (8.10); 2) Schrift-Lizenzbelege; 3) Bestandsdesigns 0 strikt
- Wer: Chris-Entscheidung (8.10); Operator (Lizenznachweise)

### Gedenktafeln Schiefer 30×20 (natur / premium) – GELB
- Stammdaten: 1 Größe je Familie [K1]
- Preise: natur vollständig; premium: baseCents null (offen) [K1]
- Designs: Bestand: Monogramme 78 von 82 / Katalog 82 Monogramme-Master (kein Trauer-Design-Ziel) / freigegeben 82 [K2]
- Baustein: kein fehlender Baustein belegt
- Shop: nicht belegt
- Was fehlt: 1) Premium-Preis; 2) Gedenktafel-Designs (Trauer) ohne Ziel; 3) Sammelfreigabe prüfen
- Wer: Chris-Entscheidung (Preis); Design-Chat

### Gedenktafeln Acryl AE (8 Größen, Rahmen/bündig) – GELB
- Stammdaten: 2 Familien à 8 Größen (Rechteck 3:2 18×12–42×28, Quadrat 16–30) [K1][G2]
- Preise: teilweise: Preise in Preisdatei (Edelstahl bündig als Aufpreis, Rahmen +1,00 €); offen 8.7 (Bohrungen 18×12/24×16, Fotoangaben) [G2][K10]
- Designs: Bestand 76 D-Nr. / Katalog 105 D-Nr. = 107 Master / freigegeben 107 [K2]
- Baustein: Foto/Bohrungen laut 8.7 offen; Konfi-Baustein nicht belegt
- Shop: nicht belegt
- Was fehlt: 1) 8.7 Antworten (Bohrungen, Fotoangaben); 2) Farben schwarz/anthrazit bestätigen
- Wer: Chris-Entscheidung (8.7); Mika-Konfi

### Gedenktafeln Acryl 30×20 (anthrazit/schwarz) – ROT
- Stammdaten: 1 Größe je Familie [K1]
- Preise: offen: baseCents null (beide Familien) [K1]
- Designs: Bestand 0 / Katalog kein Ziel für diese Familien / freigegeben 0 [K2]
- Baustein: nicht belegt
- Shop: nicht belegt
- Was fehlt: 1) Preis; 2) Designs ohne Ziel; 3) Umfang Acryl-Gedenkartikel (8.6, 'noch nicht umsetzen')
- Wer: Chris-Entscheidung (8.6)

### Gedenktafeln Edelstahl 30×20 – ROT
- Stammdaten: 1 Größe; weitere Größen offen (STAND.md) [K1][K4]
- Preise: 1 Größe mit Preis (baseCents gesetzt); weitere Größen nicht belegt [K1]
- Designs: Bestand 0 / Katalog kein Ziel / freigegeben 0 [K2]
- Baustein: nicht belegt
- Shop: nicht belegt
- Was fehlt: 1) weitere Größen; 2) Preise; 3) Designs ohne Ziel
- Wer: Chris-Entscheidung

### Hunde-/Tierschilder (Unterkategorie Edelstahl-Türschild; Rasse-Schilder 150×100) – GELB
- Stammdaten: Unterkategorie von steel-door-signs; Rasse-Schilder ausschließlich 150×100 mm [K1][K4]
- Preise: über Türschild-Edelstahl (Zeile 1)
- Designs: Bestand 5 D-Nr. (Hunde-Thema) von 12 / Katalog Hunde 12 D-Nr., Rasse-Schilder 960 Master (0 Bestand) / freigegeben 960 Master; STAND.md sagt 'Freigaben null' (Widerspruch) [K2][K4]
- Baustein: kein fehlender Baustein belegt
- Shop: nicht im Live-Konfi nachgewiesen (nur 24 D-Nr. live)
- Was fehlt: 1) Freigabe-Widerspruch Rasse-Schilder; 2) Aufnahme in Live-Konfi; 3) Bestandsdesigns (hunde-ecke 33, tierschilder 35) nicht übernommen
- Wer: Chris-Entscheidung (Freigabe); Design-Chat; Mika-Konfi

### Firmenschilder (Unterkategorie Edelstahl-Türschild) – GELB
- Stammdaten: Unterkategorie von steel-door-signs [K1]
- Preise: über Türschild-Edelstahl (Zeile 1)
- Designs: Bestand 0 strikt / Katalog 13 D-Nr. / freigegeben 13 (Bestandsordner firmenschilder: 30 Designs, nicht übernommen) [K2][K9]
- Baustein: kein fehlender Baustein belegt
- Shop: nicht im Live-Konfi nachgewiesen
- Was fehlt: 1) Bestandsdesigns übernehmen (30 im Ordner); 2) Aufnahme in Live-Konfi
- Wer: Design-Chat; Mika-Konfi

### Hinweisschilder (Unterkategorie Edelstahl-/Acryl-Türschild) – GELB
- Stammdaten: Hinweis-Serien HP/HSH (120×40, 150×80, 80×80, 80×53,3) [K1]
- Preise: über Türschild-Familien
- Designs: Bestand 178 von 181 Master / Katalog 181 / freigegeben 181 (Bestandsordner hinweisschilder 277 Designs) [K2][K9]
- Baustein: kein fehlender Baustein belegt
- Shop: nicht im Live-Konfi nachgewiesen
- Was fehlt: 1) Aufnahme in Live-Konfi; 2) Passung 80×80 / 120×40 zu den 80 Familiengrößen prüfen
- Wer: Mika-Konfi; Operator

### Grabkreuze Acryl (UV-Druck) – ROT
- Stammdaten: keine Familie im Katalog [K1]
- Preise: nicht belegt
- Designs: Bestand 151 (Ordner kreuze, Material nicht geprüft) / Katalog 0 / freigegeben 0 [K9]
- Baustein: UV-Farbwähler im Prio-Konfi nicht belegt [G4]
- Shop: nicht belegt
- Was fehlt: 1) Familie/Rohling; 2) Preise; 3) Verfahren (Gravur vs. UV-Druck, 8.6)
- Wer: Chris-Entscheidung (8.6); Mika-Konfi

### Schlüsselanhänger – ROT
- Stammdaten: Linie schluesselanhaenger.json: 'Familie offen', families [] [K8]
- Preise: nicht belegt
- Designs: Bestand 1402 Designs (Ordner, unklassifiziert) / Katalog 0 / freigegeben 0 [K9]
- Baustein: nicht belegt
- Shop: nicht belegt
- Was fehlt: 1) Familie/Rohling; 2) Preise; 3) Katalog-Master
- Wer: Chris-Entscheidung; Design-Chat

### Brettchen (Holz 20×13 / 22,5×15) – ROT
- Stammdaten: Linie brettchen.json: 'Familie offen'; 2 Serien brettchen-holz-200x130 / -225x150 [K8]
- Preise: nicht belegt
- Designs: Bestand 84 (Ordner fruehstuecksbrettchen) / Katalog 104 Master = 52 Designs (je 2 Größen) / freigegeben 0 (kein Ziel) [K2][K9]
- Baustein: nicht belegt
- Shop: nicht belegt
- Was fehlt: 1) Familie und Preise; 2) Zielzuordnung der Master; 3) Freigabe
- Wer: Chris-Entscheidung; Operator

## Prüfergebnis (Stichprobe)
Neu gezählt direkt aus den Dateien (ohne mein Zwischenindex, Python über designs/*/design.json und familien/*.json), 4 Linien:
- Türschilder Edelstahl: 2285 Master, 238 D-Nr., 2246 Master mit Freigabe für steel-door-signs, 80 Größen – stimmt mit der Tabelle überein.
- AA/AS/S-S: 286 Master, 26 D-Nr., 54 Größeneinträge je Familie – stimmt.
- Grabstecker Edelstahl: 2680 Master, 33 Größen – stimmt.
- Brettchen: 104 Master – stimmt.
Nicht neu gezählt: Bestand-Anteile (76/13/178 usw.), diese beruhen auf der Quellfeld-Regel (streng: 'designs/bestand', '(Bestand,', '1:1: Bestand', '1:1 Corel'). Wortlaut der Freigabe Acryl 3 mm (design.json): „gib zunächst alles frei, wir kontrollieren später“ (Chris, Chat 02.11.2026 09:42, eingetragen von Claude).

## Nicht belegt / nicht geprüft

- Ob der Prio-Konfi (R15) den Farbwähler für UV-Druck bietet: nur im Prozessprofil der Farbdruck-Verfahren belegt; kein Dokument bestätigt es für Prio. Daher keine UV-Linie grün.
- Alu-Dibond-Pferde 30×20: weder Familie noch Preis; nur 11 Bestandsdesigns (BSUV-AD) und die Linienskizze alu-dibond-30x20.json.
- Widerspruch: „einzig live ist Edelstahl-Türschild (Prio)“ vs. STATUS/Handoffs (8 Edelstahl + 2 Acryl 12×8 feste Produkte, 126 Funkklingeln im Alt-Konfi); Prio-Edelstahl-Produkt zuletzt 08.11. DRAFT.
- Widerspruch Funkklingelschilder: linien/tuerklingeln.json (ausgeschlossen/zurückgestellt) vs. STAND.md 27.10. (für 42 Modelle aufgehoben).
- Widerspruch Rasse-Schilder und Acryl-3-mm-Freigaben: design.json sagt freigegeben, STAND.md/Pilot sagen „Freigaben null/alle ohne Freigabe“.
- Widerspruch AA/AS/S-S: Register 4.19 „33 Excel-Größen“ vs. Familien-JSON 54 Einträge; Linien-JSON „Preise offen“ vs. Familien mit baseCents.
- Bestandszahl Türschild-Edelstahl: 76 (meine strenge Zählung nach Quellfeld) vs. 73 (Pilot-Handoff); Zählregel nicht abgeglichen.
- Bestand-Ordner (designs/bestand/*) nur über UEBERSICHT.md-Kopfzeile gezählt, Excel-Dateien nicht einzeln geöffnet; Materialmix (Bestand Acryl/Edelstahl/Schiefer) je Ordner nicht aufgeteilt.
- Shopify-Stand (Produkt-IDs, Status) nur aus Dokumenten, nicht live geprüft (kein Shopify-Zugriff). Kein Kontaktbogen-Screenshot außer dem Live-Edelstahl-Index gelesen.
- Issues #48, #85, #168, #45 nur teilweise gelesen (#168: 85 Kommentare, nur Schlagwortsuche); Katalog-PR #183 nur Beschreibung; #186 existiert nicht.
- Foto-Rückseite Acryl, Mindeststrichstärken (8.4), Schrift-Lizenzen: nicht geprüft.
- Optische Beurteilung der Designs (Gesamteindruck): nicht erfolgt, nur Metadaten gezählt.
- Auszählung von Funkklingel-Designs, Schlüsselanhänger-/Kreuze-Material und Schiefer-Türschild-Bestand: nicht erfolgt.

## Quellen

- [K1] /home/claude/katalog/familien/**/*.json (sizes, baseCents) ; linien/*.json
- [K2] /home/claude/linien/_work/designs_index.json (aus designs/*/*/design.json, ohne bestand und _testlauf-beispiele; 9.743 Master); Auszählung metrics.py / build.py
- [K3] /home/claude/kette/docs/produktfreigaben/kontaktbogen-live-edelstahl-20261110/index.md
- [K4] /home/claude/katalog/STAND.md (Zeilen u. a. 33–59, 78, 125); STATUS.md; KATALOG.md
- [K5] /home/claude/katalog/migrationen/funkklingeln-42x3-20261027/README.md
- [K6] /home/claude/katalog/linien/tuerklingeln.json
- [K7] /home/claude/katalog/linien/acryl-schilder-abstandshalter.json (Status 'Familien da, Preise offen')
- [K8] /home/claude/katalog/linien/{alu-dibond-30x20,pferdeschilder,schluesselanhaenger,brettchen}.json (Status 'Familie offen')
- [K9] /home/claude/katalog/designs/bestand/<linie>/UEBERSICHT.md (Zeile 3) und boxenschilder/README.md
- [K10] /home/claude/katalog/preise/preise-chris-20261102.json
- [G1] git origin/main:docs/handoffs/2026-11-09-produktanlage-module-excel-workflow.md ; 2026-11-08-steel-product-entry.md
- [G2] git origin/main:ENTSCHEIDUNGEN.md (Abschnitte 3, 4 [4.19, 4.20, 4.22, 4.23, 4.48, 4.49], 7, 8 [8.5–8.11])
- [G3] git origin/main:STATUS.md (Zeilen 73, 142, 237ff) ; docs/handoffs/2026-11-07-andenken-shop-pilot-astra.md ; docs/reviews/2026-11-08-prio-konfi/shopify-audit.md
- [G4] git origin/main:app/workshop/process-profiles.mjs, module-profile.mjs (nativeModuleAvailability: colors = process.tools.textColor)
- [G5] git origin/main:STATUS.md Zeile 13–15 ; docs/handoffs/2026-11-03-issue139-grabstecker-drafts.md (Zeile 20)
- [P1] /home/claude/kette/docs/handoffs/2026-11-10-kette-pilot-acryl-tuerschild-entwurf.md
- [I230] Issue #230 (Body + 5 Kommentare) ; #227 Body ; #85 ; #168 (85 Kommentare, nur auf 'Farbwähl' durchsucht)
- [PR184] Katalog-PR #184 Gesamtregister: /home/claude/linien/_work/register184.md
