# Eulen-Familienschild D970–D977 – Bericht (Chat „Eulen-Familienschild“, 02.11.2026)

Auftrag Chris 02.11.: 04:38 „übertrage das auf die Familienschilder“ (Simulation Familie Weidemann 15 × 10), 04:39 „1, 2, 3, 4 Kinder … und einmal je mit nur einem Elternteil“, 04:46 Kordel + Acryl, 04:52 Kordel alle Größen ab 12 × 8.
Katalog-Branch `dev/familien-eulen-20261102` (Entwurfs-PR), Issue gravuru-2027 #119.

## Motive (motive-eigene/familienschilder/eulen-ast-*.svg, kundenkonfi false)
8 Varianten aus Eulen und Ast von `motive/tiere/eulen-familie-3-kinder.svg` zusammengesetzt: Eulen unverzerrt (2 Elterneulen A/C, Kinder B/D/E, 4. Kind = B gespiegelt), Ast im glatten Mittelstück gekürzt/verlängert, auf schrägem Ast Bein verlängert (wie C im Original). Pfad mit sauberer Wicklung + evenodd → Augen/Innenflächen bleiben weiß (Problem „1 Kind“ gelöst; altes 1-Kind-Motiv nicht verwendet). Splitter < 0,05 Einheiten entfernt.

| Nr | Eulen | Beispielname |
|---|---|---|
| D970 | 2 Eltern, 2 Kinder | Weidemann |
| D971 | 2 Eltern, 1 Kind | Lindemann |
| D972 | 2 Eltern, 3 Kinder | Hartmann |
| D973 | 2 Eltern, 4 Kinder | Brückner |
| D974 | 1 Elternteil, 1 Kind | Albrecht |
| D975 | 1 Elternteil, 2 Kinder | Kessler |
| D976 | 1 Elternteil, 3 Kinder | Vogelsang |
| D977 | 1 Elternteil, 4 Kinder | Engelhardt |

Modus neu, Schriften Comfortaa („Familie“, 31,5 % der Namensgröße) + Great Vibes (Name), Thema familienschilder, keine Freigabe.

## Aufbau je Form
- Querformat (Rechteck 3:2, AB, Oval 9×6/15×8, Retro 1/2, AA 15×10/R5/EE 18×12/Oval, Kordel 15×9…30×20): Eulen oben rechtsbündig über dem Namen, „Familie“ beginnt über dem 2. Buchstaben (Abstand wie Simulation), Gruppe mittig (Simulation war ~10 mm nach rechts versetzt → §7).
- Quadrat/Rund/Hochformat (8×8, Rund, AA 16×16, 10×15, R5 10×15, EE 12×18, 7×21, Kordel 20×20/20×25): Eulen oben in Textbreite, Text darunter, gleiches „Familie“-Prinzip.
- AA 21×7: Eulen links neben dem Text (Langformat).
- Abstandshalter-Zonen (AA/AS/SS) und Kordel-Löcher + 6 mm Bruchkante frei.

## Umfang (Inventur Familienschilder je Reihe: vorher → nachher)
Edelstahl (Ziele steel-door-signs + Acryl 3 mm schwarz/anthrazit, Größen wie D950 der Reihe): 80x53 120→128, AB 117→125, Oval 9×6 105→113, Oval 15×8 111→119, Retro 1 116→124, Retro 2 110→118, Quadrat 116→124, Rund 112→120.
Acryl-Abstandshalter (AA/AS/SS), je 9→17: 100x150, 150x100, 160x160, 210x70, 70x210, EE 120x180, EE 180x120, Oval 150x100, Oval 150x80, R5 100x150, R5 150x100.
Kordel Schiefer (ziele leer wie alle Kordel-Designs, keine Familie auf main): 15×9 22→30, 20×10 23→31, 20×15 21→29, 20×20 23→31, 20×25 21→29, 22×14 23→31, 30×20 23→31. **Herz verworfen** (Gruppe nur 22–24 % Fläche, Bogen `schiefer-kordel-herz-225x267-verworfen.jpg`).
Gesamt 208 neue Designs.

## Prüfung
- Native Zielvorschau (alle 208 Designs × Ziele geprüft): Acryl 3 mm 112/128 „passt“, Rest = Retro 2 „prüfen“ nur wegen Seitenverhältnis 1,5 % der Reihe; AA/AS/SS 264/264 und Kordel (Scratch-Vorschaufamilie, nie committet) 56/56 „passt“. Edelstahl „prüfen“ nur wegen feiner Blattstiele/Ränder des Bestandsmotivs (< 0,5 mm; an 9 × 6 min. 0,16–0,29 mm, bei 4 Kindern am dünnsten), Retro 2 zusätzlich Seitenverhältnis 1,5 % (Reihe). Kein Element außerhalb der Gestaltungsfläche.
- Freiflächen (`flaeche-messen.py`, Werte in `mess/*.txt`): 211 von 216 Bögen-Platten ok; Ausnahme AA 21×7 D970–D973/D977 (Höhe 38–45 %, Fläche 31–36 %), Breite durch seitliche Abstandshalter auf 82 % begrenzt – bewusst so.
- Füllfläche Motiv max. 8,2 % der Platte (AA EE 18×12 D973), Edelstahl max. 7,8 %.
- Kontaktbögen ohne Bohrlöcher/Abstandshalter; Edelstahl-Bögen mit je einer Acryl-3-mm-Vorschau.

## Offene Punkte
- Feine Blattstiele an 9 × 6 (< 0,3 mm) – ggf. Motiv für Kleinformate verstärken oder D973/D977 erst ab 12 × 8 anbieten (Entscheidung Chris).
- Startdesign-Vorschlag: D970 (Chris' Wunschentwurf, 2 Eltern + 2 Kinder).
