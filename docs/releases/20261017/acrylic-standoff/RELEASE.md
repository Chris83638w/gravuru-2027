# Acryl-Namens-/Hausnummernschilder mit Abstandshaltern (AA, AS, S/S) · 17.10.2026

Nicht installiert. Branch `task/steel-master-data-20261016`.

## Quelle und Lesen

`Hausnummer-Namenschilder-2026.pdf` (CorelDRAW 2020, vom Nutzer am 17.10.) mit `scripts/read-corel-plates.py` gelesen: rot = Platte und Bohrlöcher, cyan = Rückplatte S/S, Kreise Ø 8 mm = Abstandshalter. 37 Platten, 26 Formate, 0 nicht zugeordnete Zeichnungen. Gespeichert als `app/designs/acrylic-standoff-signs/corel-platten-20261017.json` plus Übersicht.

## Nutzerangaben (17.10.)

- AA/AS: Acrylglas anthrazit bzw. schwarz, 5 mm, Gravur von hinten. S/S: Front satiniert 3 mm, von vorn graviert; Rückplatte schwarz 3 mm, rundum 10 mm größer, Abstandsringe dazwischen.
- Randabstände und Formen **genau wie in der PDF**, nicht vereinheitlichen (10 mm bei kleinen Platten, 15 mm bei größeren, aus optischen Gründen und für Spannung gegen Durchhängen). 21 × 14 bleibt.
- Zusätzlich jede rechteckige Größe mit Eckenradius 5 mm.

## Familien

`scripts/import-acrylic-standoff-families.py` → `aa.json`, `as.json`, `ss.json`: je 42 Größen (20 Rechteck, 20 R5, 4 abgerundet mit gemessenem Radius, 8 oval), 4 Bohrbilder (2/4 Abstandshalter, Rand 10/15 mm, Ø 8), 62 Zuordnungen. Preise und Aufpreise offen; Schutzzone 1 mm vorläufig (Kopfdurchmesser der Abstandshalter offen).

Familienmodell erweitert: Eckenradius je Größe, Zubehör „Abstandshalter“, Gravurseite, Rückplatte (`backing`: Überstand, Stärke) – in Schablone und Briefing berücksichtigt. Excel-Export/-Import trägt diese Felder (Rundlauf ohne Abweichung).

## Plattenkatalog

[Plattenkatalog-Acryl-SS.pdf](Plattenkatalog-Acryl-SS.pdf) (`scripts/plate-catalog-pdf.py`): alle 62 Zeichnungen der S/S-Familie mit Rückplatte, **eine Seite je Format** (skalierbare Reihe, Seitenverhältnis ±1 %), Größen aufsteigend, Formen nebeneinander. Familien-Größen sind in derselben Reihenfolge gespeichert (auch Edelstahl umsortiert). Zusätzliche Platten wurden vom Nutzer abgelehnt (zu viele).

## Prüfungen

`node --test app/workshop/product-families.test.mjs`: 13/13 (neu: Acryl-Familien, Radius je Größe, Rückplatte in der Schablone).

## Grenzen

- Acryl-Gravurplatten haben noch kein natives Produktmodell: Produkte erzeugen ist gesperrt, Briefing, Schablone und Probelauf gehen.
- Die Rückplatte erscheint in der Schablone, noch nicht in der Konfigurator-Vorschau (folgt mit dem Acryl-Produktmodell).
