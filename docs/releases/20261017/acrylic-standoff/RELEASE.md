# Acryl-Namens-/Hausnummernschilder mit Abstandshaltern (AA, AS, S/S) · 17.10.2026

Nicht installiert. Branch `task/steel-master-data-20261016`.

## Quelle und Lesen

`Hausnummer-Namenschilder-2026.pdf` (CorelDRAW 2020, vom Nutzer am 17.10.) mit `scripts/read-corel-plates.py` gelesen: rot = Platte und Bohrlöcher, cyan = Rückplatte S/S, Kreise Ø 8 mm = Abstandshalter. 37 Platten, 26 Formate, 0 nicht zugeordnete Zeichnungen. Gespeichert als `app/designs/acrylic-standoff-signs/corel-platten-20261017.json` plus Übersicht.

## Nutzerangaben (17.10.)

- AA/AS: Acrylglas anthrazit bzw. schwarz, 5 mm, Gravur von hinten. S/S: Front satiniert 3 mm, von vorn graviert; Rückplatte schwarz 3 mm, rundum 10 mm größer, Abstandsringe dazwischen.
- Randabstände und Formen **genau wie in der PDF**, nicht vereinheitlichen (10 mm bei kleinen Platten, 15 mm bei größeren, aus optischen Gründen und für Spannung gegen Durchhängen). 21 × 14 bleibt.
- Zusätzlich Spalte 1 der Zeichnung (15 × 10 … 42 × 28, 2 Abstandshalter) noch einmal mit Eckenradius 5 mm als ergänzende Spalte (Nutzer, 17.10.2026).

## Familien

`scripts/import-acrylic-standoff-families.py` → `aa.json`, `as.json`, `ss.json`: je 33 Größen (15 Rechteck, 8 oval, 4 mit eingezogenen Ecken [konkave Viertelkreise, Radius gemessen] – genau die 37 gezeichneten Platten – plus 6 × R5 = Spalte 1 der Zeichnung mit Eckenradius 5 mm, nur 2 Abstandshalter); Reihenfolge = Spalten der Zeichnung von oben nach unten, R5 als ergänzende Spalte am Ende, 4 Bohrbilder (2/4 Abstandshalter, Rand 10/15 mm, Ø 8), 43 Zuordnungen. Preise und Aufpreise offen; Schutzzone 1 mm vorläufig (Kopfdurchmesser der Abstandshalter offen).

Familienmodell erweitert: Eckenradius je Größe, Zubehör „Abstandshalter“, Gravurseite, Rückplatte (`backing`: Überstand, Stärke) – in Schablone und Briefing berücksichtigt. Excel-Export/-Import trägt diese Felder (Rundlauf ohne Abweichung).

## Plattenkatalog

[Plattenkatalog-Acryl-SS.pdf](Plattenkatalog-Acryl-SS.pdf) (`scripts/plate-catalog-pdf.py`): alle 43 Zeichnungen der S/S-Familie mit Rückplatte, **Aufbau wie die Corel-Zeichnung**: eine Spalte je Form und Befestigung (Spalten 1–8 der Zeichnung), Größen von oben nach unten aufsteigend, die ergänzten R5-Größen als eigene Spalte am Ende; Familien-Größen sind in derselben Reihenfolge gespeichert. Edelstahl ohne Zeichnung: eine Spalte je Form und Formatreihe. Zusätzliche Platten wurden vom Nutzer abgelehnt (zu viele).

## Prüfungen

`node --test app/workshop/product-families.test.mjs`: 13/13 (neu: Acryl-Familien, Radius je Größe, Rückplatte in der Schablone).

## Grenzen

- Acryl-Gravurplatten haben noch kein natives Produktmodell: Produkte erzeugen ist gesperrt, Briefing, Schablone und Probelauf gehen.
- Die Rückplatte erscheint in der Schablone, noch nicht in der Konfigurator-Vorschau (folgt mit dem Acryl-Produktmodell).

## Plausibilitätsprüfung der Zeichnung (17.10.2026, nur Hinweise – nichts geändert)

Geprüft: Lochsymmetrie, Rückplatte, Randabstände, Radien, Formatreihen. Ergebnis: alle 37 Platten symmetrisch, Rückplatte überall +10 mm rundum, Radien der abgerundeten Platten skalieren sauber (≈ Höhe/10: 11,6 / 13,5 / 15,5 / 19,3).

Auffällig (Rückfrage, keine Änderung):
- 20 × 20 hat 10 mm Randabstand, obwohl die Platte größer ist als 21 × 14 (ab dort sonst 15 mm; 26 × 26 und 30 × 30 haben 15 mm).
- 21 × 14 gibt es nur oval und abgerundet (R 13,5), nicht als einfaches Rechteck mit 2/4 Löchern – alle anderen 3:2-Größen haben beides.
- 24 × 7 ist ein Einzelformat (3,43:1); Designs der 3:1-Reihe passen dort nicht ohne Anpassung.
- Reihe 15:8 (15 × 8, 22,5 × 12, 30 × 16) gibt es nur oval, Reihe 3:1 (21 × 7 … 45 × 15) nur eckig.

## Korrektur 17.10.2026 (nach Rückmeldung „völlig durcheinander“)

- **Lesefehler behoben:** Die vier Platten 18 × 12, 21 × 14, 24 × 16, 30 × 20 der Spalte 8 haben keine abgerundeten, sondern **eingezogene Ecken** (konkave Viertelkreise, Radius 11,6 / 13,5 / 15,5 / 19,3 mm; Rückplatte 12,9 / 14,8 / 16,8 / 20,6 mm). Der Leser hatte die Bogenrichtung nicht unterschieden. Neue Form `plaque` im Familienschema (`gravuru-product-family/v2`: Formen rect/ellipse/plaque), Radius je Größe, `backingCornerRadiusMm` je Größe; Schablone und Katalog zeichnen die Ecken nach innen. Im Konfigurator ist die Form noch nicht angeschlossen (wird als Lücke gemeldet).
- **Reihenfolge wie gezeichnet:** `read-corel-plates.py` erkennt die Spalten der Zeichnung (`drawingColumn`/`drawingRow`); Familien, Übersichts-PNG, Katalog-PDF und Excel folgen dieser Ordnung. Der Katalog hat jetzt den gleichen Aufbau wie die Zeichnung.
- Tests 13/13; Excel-Rundlauf (export → import) für AA und S/S ohne Abweichung.

## Testlauf Designbogen (17.10.2026, `Beispiele.pdf`, 19 Hausnummern-/Namensschilder)

Neues Skript `scripts/split-corel-design-sheet.py`: zerlegt einen Corel-Bogen (graue Platte, dunkle Rückplatte, rote Ø-8-Löcher, weiße Gestaltung) in Einzeldesigns nach Lieferform 2 (`design.svg` mit Ebenen `text-<n>` als echtem Text und `motiv-1`, schwarz auf weiß; `design.json`), Bericht und Übersichts-PNG. Nur Lesen; nichts importiert, Designs nicht im Repo.

Ergebnis: 19/19 Designs sauber getrennt, Texte als echter Text (bis auf Design 3: Schrift in Kurven → nur festes Motiv), Motive vollständig, Hausnummern per `--numbers` je Design verschieden.
Offen vor einem echten Lauf: Plattenmaß 190 × 80 mm existiert in keiner Familie (AA/AS/S/S: 21 × 7, 24 × 7 …, Edelstahl auch nicht); 8 von 11 Schriften fehlen in der Werkstatt (Michroma, Alex Brush, Rounded Elegance, Homage, Fjalla One, Champagne & Limousines, MINIMALIST, Ashley – vorhanden: Cinzel, Great Vibes, Allura); Straße und Nummer in einem Textobjekt (Design 16) ergeben ein gemeinsames Kundenfeld.
