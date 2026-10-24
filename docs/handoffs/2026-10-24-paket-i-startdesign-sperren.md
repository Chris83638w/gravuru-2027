# Paket I · Zehn Startdesign-Sperren

Stand R3: Katalog `1be49ee792667357fff1061eb5d21bacf3b4e3c1`, R3-Codecommit `06356c9947fa765e59822a16e082245af8211e44` auf Basis `3e42c13411003add34645bc258623851982e7809`; aktuelle Dateihashes sind in den Prüfnachweisen festgehalten. Nur Analyse. Keine Katalogänderung durch diesen Lauf, keine Freigabe, kein Shop-/Hostzugriff.

**Ergebnis:** 104 Hauptproduktreferenzen auf 102 unterschiedliche Startdesigns; zehn Startdesign-Sperren: neun Geometriefälle und eine Schriftgrößengrenze. Bei allen zehn ist die gewählte Zielgröße bereits durch `design.json.sizes` bzw. `sizesOpen`/`sourceContourSizes` erlaubt. Eine bloße Größenlistenprüfung erklärt die Sperren deshalb nicht.

Die B/C-Importbefunde wurden für R3 erneut rein lesend mit den vorhandenen Konvertierungs-, Größen- und Passungsfunktionen sowie echten Katalogschriften geprüft. Ergebnis für 104 Zuordnungen: 89 passen, 5 benötigen Prüfung, 10 passen nicht; **0 offene Preise unter diesen 104 Zuordnungen**. Die zehn gesperrten IDs und alle konkreten Fit-Meldungen sind unverändert. Die frühere R2-Gegenprüfung der zehn D1-Vorschläge ergab: 9 passen, Retro 2 bleibt bei „prüfen“ wegen 1,50 % Einpassung. Historisch geprüft: D57 auf 300 × 200 mm passt mit maximal 85,35 mm Schrift; Paket J behält die zugeordnete Zielgröße. 307 Dashboard-Eingaben und 20 Alternativ-Eingaben sind vor/nach der Prüfung unverändert. Einzelwerte und Quellprüfsummen stehen in [2026-10-24-paket-i-pruefung.json](2026-10-24-paket-i-pruefung.json).

Die aktuelle Familienquelle hat Git-Blob-SHA `d88dac658042e8f95f678e317ca85b21f7a77d75`. Gegenüber dem ausdrücklich historischen Katalogstand `b05b09529d4c6ab61cd4612352978e687106f32c` wurden 16 Grundpreise ergänzt und der Quellenhinweis erweitert; Geometrien und Bohrbilder sind unverändert. Insbesondere haben 7000000 und 7100000 für Retro 2 in 120 × 80 mm jetzt **19,99 €** Grundpreis ([Familie:1475](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/familien/edelstahl/steel-door-signs.json#L1475)). Rund 8,5 × 8,5 cm ist im neuen Stand mit 14,99 € gesetzt; damit sind alle Edelstahl-Grundpreise bekannt. 131 Primärquellblobs und alle 307 Readback-Eingaben wurden neu geprüft; alte `priorImport`-/`priorFit`-Angaben bleiben ausschließlich als historische Vergleiche gekennzeichnet.

**Entscheidung von Chris:** Die vorhandenen Motive bleiben; kein Tausch auf D1. Paket J passt die Originaldesigns minimal ein. Die unten dokumentierten D1-/Größenalternativen stammen aus der früheren Analyse und werden nicht umgesetzt. Aktuell neu gerechnet sind die 104 Original-Zuordnungen; die Alternativrechnung bleibt ausdrücklich historischer R2-Nachweis.

## Übersicht

| Hauptprodukt / CustomizationID | Startdesign | Zielgröße mm | Grundpreis | konkrete Sperre | Vorschlag, noch nicht freigegeben |
| --- | --- | --- | --- | --- | --- |
| 5300000 | TO-V2A-9x6-D13 | 210 × 140 | 39,99 € | Motivkasten außerhalb Oval | TO-V2A-9x6-D1; Fit „passt“ |
| 5400000 | TO-V2A-9x6-D61 | 210 × 140 | 39,99 € | Motivkasten außerhalb Oval | TO-V2A-9x6-D1; Fit „passt“ |
| 5500000 | TO-V2A-12x4-D48 | 120 × 40 | 13,99 € | Motivkasten außerhalb Oval | TO-V2A-12x4-D1; Fit „passt“ |
| 5800000 | TO-V2A-12x4-D12 | 120 × 40 | 13,99 € | Motivkasten außerhalb Oval | TO-V2A-12x4-D1; Fit „passt“ |
| 6100000 | TO-V2A-15x8-D47 | 150 × 80 | 21,99 € | Motivkasten außerhalb Oval | TO-V2A-15x8-D1; Fit „passt“ |
| 6200000 | TO-V2A-15x8-D19 | 150 × 80 | 21,99 € | Motivkasten außerhalb Oval | TO-V2A-15x8-D1; Fit „passt“ |
| 10600000 | TRE-V2A-8x5-D49 | 120 × 80 | 19,99 € | Motivkasten rechts ca. +0,003 mm | TRE-V2A-8x5-D1; Fit „passt“ |
| 12600000 | TRE-V2A-8x5-D57 | 420 × 280 | 109,99 € | Schrift 119,49 mm > 100 mm | TRE-V2A-8x5-D1; Fit „passt“ |
| 6500000 | TR1-V2A-9x6-D15 | 90 × 60 | 14,99 € | Motivkasten unten +0,005 mm | TR1-V2A-9x6-D1; Fit „passt“ |
| 6800000 | TR2-V2A-9x6-D12 | 90 × 60 | 14,99 € | Motiv außerhalb Kontur; Spruch im Lochschutz | TR2-V2A-9x6-D1; Fit „prüfen“ |

Die Grundpreise sind Werte der Familie ohne Befestigungsaufschlag. Es gibt in dieser Linie aktuell keine Preisüberschreibung der Unterkategorien. Die zehn Sperren sind nicht identisch mit dem getrennten Shop-Freigabestatus: Der frühere Shop-Sync-Vorlauf meldete 104 noch nicht freigegebene Startdesignziele.

## Quellen und Ursache je Hauptprodukt

### 5300000 · TO-V2A-9x6-D13

Der Motivkasten der Pusteblume überschreitet das Oval; die Zielgröße ist ausdrücklich zugeordnet.

- Hauptprodukt: [linien/edelstahl-tuerschilder.json:439](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/linien/edelstahl-tuerschilder.json#L439). Größe und Grundpreis: [familien/edelstahl/steel-door-signs.json:902](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/familien/edelstahl/steel-door-signs.json#L902).
- Bogenübersicht: [designs/edelstahl-gravur-oval-90x60/UEBERSICHT.md:26](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-90x60/UEBERSICHT.md#L26); Name „Familie mit Pusteblume, Serifenschrift“. Masterbogen `TO-V2A-9x6`, Mastermaß 90 × 60 mm.
- Größenquelle: [designs/edelstahl-gravur-oval-90x60/TO-V2A-9x6-D13/design.json:116](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-90x60/TO-V2A-9x6-D13/design.json#L116): `sizes = ["GR-ES-OV-90X60-T15","GR-ES-OV-210X140-T15"]`.
- Zeichnung: [zeichnungen/edelstahl-schilder-2027/geometrie.json:2263](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/zeichnungen/edelstahl-schilder-2027/geometrie.json#L2263), Datensatz `TO-V2A-21x14`, Excelzeile 61, Zeichnungspfad 297. Ausdehnung 210.000074 × 140.000073 mm.
- Importbefund: „motiv-1: Element ragt über die ovale Gestaltungsfläche hinaus.“.
- Nachrechnung: Motivkasten im Master `[x, y, Breite, Höhe] = [4.983, 6.109, 52.317, 41.381]` mm. Der größte normierte Ellipsenwert einer Kastenecke ist 1.424995 (> 1). Die Prüfung bezieht sich auf den Objektkasten, nicht auf die Frage, ob jeder sichtbare Vektorstrich die Platte verlässt. Eine proportional größere/kleinere ovale Platte behebt diesen normierten Überstand nicht automatisch.
- Konkreter Vorschlag: [designs/edelstahl-gravur-oval-90x60/TO-V2A-9x6-D1/design.json:2](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-90x60/TO-V2A-9x6-D1/design.json#L2) auf derselben Zielgröße. Im vorhandenen und frisch bestätigten Lauf „passt“ ohne Fit-Hinweis. D1 ersetzt das Motiv durch eine schlichte zweizeilige Gestaltung; diese inhaltliche Änderung muss entschieden werden.

### 5400000 · TO-V2A-9x6-D61

Der Motivkasten der Zweige mit Herz überschreitet das Oval; die Zielgröße ist ausdrücklich zugeordnet.

- Hauptprodukt: [linien/edelstahl-tuerschilder.json:453](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/linien/edelstahl-tuerschilder.json#L453). Größe und Grundpreis: [familien/edelstahl/steel-door-signs.json:902](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/familien/edelstahl/steel-door-signs.json#L902).
- Bogenübersicht: [designs/edelstahl-gravur-oval-90x60/UEBERSICHT.md:74](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-90x60/UEBERSICHT.md#L74); Name „Zwei Vornamen und Nachname mit Zweigen und Herz“. Masterbogen `TO-V2A-9x6`, Mastermaß 90 × 60 mm.
- Größenquelle: [designs/edelstahl-gravur-oval-90x60/TO-V2A-9x6-D61/design.json:116](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-90x60/TO-V2A-9x6-D61/design.json#L116): `sizes = ["GR-ES-OV-90X60-T15","GR-ES-OV-210X140-T15"]`.
- Zeichnung: [zeichnungen/edelstahl-schilder-2027/geometrie.json:2263](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/zeichnungen/edelstahl-schilder-2027/geometrie.json#L2263), Datensatz `TO-V2A-21x14`, Excelzeile 61, Zeichnungspfad 297. Ausdehnung 210.000074 × 140.000073 mm.
- Importbefund: „motiv-1: Element ragt über die ovale Gestaltungsfläche hinaus.“.
- Nachrechnung: Motivkasten im Master `[x, y, Breite, Höhe] = [19.769, 40.16, 50.503, 15.771]` mm. Der größte normierte Ellipsenwert einer Kastenecke ist 1.062524 (> 1). Die Prüfung bezieht sich auf den Objektkasten, nicht auf die Frage, ob jeder sichtbare Vektorstrich die Platte verlässt. Eine proportional größere/kleinere ovale Platte behebt diesen normierten Überstand nicht automatisch.
- Konkreter Vorschlag: [designs/edelstahl-gravur-oval-90x60/TO-V2A-9x6-D1/design.json:2](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-90x60/TO-V2A-9x6-D1/design.json#L2) auf derselben Zielgröße. Im vorhandenen und frisch bestätigten Lauf „passt“ ohne Fit-Hinweis. D1 ersetzt das Motiv durch eine schlichte zweizeilige Gestaltung; diese inhaltliche Änderung muss entschieden werden.

### 5500000 · TO-V2A-12x4-D48

Der Motivkasten der Schmetterlinge überschreitet das flache Oval.

- Hauptprodukt: [linien/edelstahl-tuerschilder.json:467](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/linien/edelstahl-tuerschilder.json#L467). Größe und Grundpreis: [familien/edelstahl/steel-door-signs.json:332](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/familien/edelstahl/steel-door-signs.json#L332).
- Bogenübersicht: [designs/edelstahl-gravur-oval-120x40/UEBERSICHT.md:47](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-120x40/UEBERSICHT.md#L47); Name „Familie mit Schmetterlingen“. Masterbogen `TO-V2A-12x4`, Mastermaß 120 × 40 mm.
- Größenquelle: [designs/edelstahl-gravur-oval-120x40/TO-V2A-12x4-D48/design.json:116](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-120x40/TO-V2A-12x4-D48/design.json#L116): `sizes = ["GR-ES-EL-120X40-T15","GR-ES-EL-240X80-T15"]`.
- Zeichnung: [zeichnungen/edelstahl-schilder-2027/geometrie.json:2392](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/zeichnungen/edelstahl-schilder-2027/geometrie.json#L2392), Datensatz `TO-V2A-12x4`, Excelzeile 65, Zeichnungspfad 67. Ausdehnung 120.000042 × 39.999991 mm.
- Importbefund: „motiv-1: Element ragt über die ovale Gestaltungsfläche hinaus.“.
- Nachrechnung: Motivkasten im Master `[x, y, Breite, Höhe] = [15.903, 5.994, 20.99, 12.073]` mm. Der größte normierte Ellipsenwert einer Kastenecke ist 1.030572 (> 1). Die Prüfung bezieht sich auf den Objektkasten, nicht auf die Frage, ob jeder sichtbare Vektorstrich die Platte verlässt. Eine proportional größere/kleinere ovale Platte behebt diesen normierten Überstand nicht automatisch.
- Konkreter Vorschlag: [designs/edelstahl-gravur-oval-120x40/TO-V2A-12x4-D1/design.json:2](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-120x40/TO-V2A-12x4-D1/design.json#L2) auf derselben Zielgröße. Im vorhandenen und frisch bestätigten Lauf „passt“ ohne Fit-Hinweis. D1 ersetzt das Motiv durch eine schlichte zweizeilige Gestaltung; diese inhaltliche Änderung muss entschieden werden.

### 5800000 · TO-V2A-12x4-D12

Der Motivkasten der Pusteblume überschreitet das flache Oval.

- Hauptprodukt: [linien/edelstahl-tuerschilder.json:509](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/linien/edelstahl-tuerschilder.json#L509). Größe und Grundpreis: [familien/edelstahl/steel-door-signs.json:332](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/familien/edelstahl/steel-door-signs.json#L332).
- Bogenübersicht: [designs/edelstahl-gravur-oval-120x40/UEBERSICHT.md:24](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-120x40/UEBERSICHT.md#L24); Name „Herzlich Willkommen bei Familie mit Pusteblume“. Masterbogen `TO-V2A-12x4`, Mastermaß 120 × 40 mm.
- Größenquelle: [designs/edelstahl-gravur-oval-120x40/TO-V2A-12x4-D12/design.json:138](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-120x40/TO-V2A-12x4-D12/design.json#L138): `sizes = ["GR-ES-EL-120X40-T15","GR-ES-EL-240X80-T15"]`.
- Zeichnung: [zeichnungen/edelstahl-schilder-2027/geometrie.json:2392](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/zeichnungen/edelstahl-schilder-2027/geometrie.json#L2392), Datensatz `TO-V2A-12x4`, Excelzeile 65, Zeichnungspfad 67. Ausdehnung 120.000042 × 39.999991 mm.
- Importbefund: „motiv-1: Element ragt über die ovale Gestaltungsfläche hinaus.“.
- Nachrechnung: Motivkasten im Master `[x, y, Breite, Höhe] = [14.006, 4.826, 26.225, 28.953]` mm. Der größte normierte Ellipsenwert einer Kastenecke ist 1.163250 (> 1). Die Prüfung bezieht sich auf den Objektkasten, nicht auf die Frage, ob jeder sichtbare Vektorstrich die Platte verlässt. Eine proportional größere/kleinere ovale Platte behebt diesen normierten Überstand nicht automatisch.
- Konkreter Vorschlag: [designs/edelstahl-gravur-oval-120x40/TO-V2A-12x4-D1/design.json:2](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-120x40/TO-V2A-12x4-D1/design.json#L2) auf derselben Zielgröße. Im vorhandenen und frisch bestätigten Lauf „passt“ ohne Fit-Hinweis. D1 ersetzt das Motiv durch eine schlichte zweizeilige Gestaltung; diese inhaltliche Änderung muss entschieden werden.

### 6100000 · TO-V2A-15x8-D47

Der Motivkasten des Vogelpaars überschreitet das Oval.

- Hauptprodukt: [linien/edelstahl-tuerschilder.json:551](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/linien/edelstahl-tuerschilder.json#L551). Größe und Grundpreis: [familien/edelstahl/steel-door-signs.json:632](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/familien/edelstahl/steel-door-signs.json#L632).
- Bogenübersicht: [designs/edelstahl-gravur-oval-150x80/UEBERSICHT.md:55](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-150x80/UEBERSICHT.md#L55); Name „Familie mit Vogelpaar auf Zweig“. Masterbogen `TO-V2A-15x8`, Mastermaß 150 × 80 mm.
- Größenquelle: [designs/edelstahl-gravur-oval-150x80/TO-V2A-15x8-D47/design.json:116](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-150x80/TO-V2A-15x8-D47/design.json#L116): `sizes = ["GR-ES-OV-150X80-T15"]`.
- Zeichnung: [zeichnungen/edelstahl-schilder-2027/geometrie.json:2650](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/zeichnungen/edelstahl-schilder-2027/geometrie.json#L2650), Datensatz `TO-V2A-15x8`, Excelzeile 72, Zeichnungspfad 76. Ausdehnung 150.000053 × 80.000052 mm.
- Importbefund: „motiv-1: Element ragt über die ovale Gestaltungsfläche hinaus.“.
- Nachrechnung: Motivkasten im Master `[x, y, Breite, Höhe] = [13.388, 37.305, 44.979, 30.561]` mm. Der größte normierte Ellipsenwert einer Kastenecke ist 1.160173 (> 1). Die Prüfung bezieht sich auf den Objektkasten, nicht auf die Frage, ob jeder sichtbare Vektorstrich die Platte verlässt. Eine proportional größere/kleinere ovale Platte behebt diesen normierten Überstand nicht automatisch.
- Konkreter Vorschlag: [designs/edelstahl-gravur-oval-150x80/TO-V2A-15x8-D1/design.json:2](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-150x80/TO-V2A-15x8-D1/design.json#L2) auf derselben Zielgröße. Im vorhandenen und frisch bestätigten Lauf „passt“ ohne Fit-Hinweis. D1 ersetzt das Motiv durch eine schlichte zweizeilige Gestaltung; diese inhaltliche Änderung muss entschieden werden.

### 6200000 · TO-V2A-15x8-D19

Der Motivkasten der Rose überschreitet das Oval.

- Hauptprodukt: [linien/edelstahl-tuerschilder.json:565](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/linien/edelstahl-tuerschilder.json#L565). Größe und Grundpreis: [familien/edelstahl/steel-door-signs.json:632](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/familien/edelstahl/steel-door-signs.json#L632).
- Bogenübersicht: [designs/edelstahl-gravur-oval-150x80/UEBERSICHT.md:27](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-150x80/UEBERSICHT.md#L27); Name „Herzlich Willkommen bei Vor- und Nachname mit Rose“. Masterbogen `TO-V2A-15x8`, Mastermaß 150 × 80 mm.
- Größenquelle: [designs/edelstahl-gravur-oval-150x80/TO-V2A-15x8-D19/design.json:138](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-150x80/TO-V2A-15x8-D19/design.json#L138): `sizes = ["GR-ES-OV-150X80-T15"]`.
- Zeichnung: [zeichnungen/edelstahl-schilder-2027/geometrie.json:2650](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/zeichnungen/edelstahl-schilder-2027/geometrie.json#L2650), Datensatz `TO-V2A-15x8`, Excelzeile 72, Zeichnungspfad 76. Ausdehnung 150.000053 × 80.000052 mm.
- Importbefund: „motiv-1: Element ragt über die ovale Gestaltungsfläche hinaus.“.
- Nachrechnung: Motivkasten im Master `[x, y, Breite, Höhe] = [17.696, 19.7, 20.904, 47.039]` mm. Der größte normierte Ellipsenwert einer Kastenecke ist 1.030636 (> 1). Die Prüfung bezieht sich auf den Objektkasten, nicht auf die Frage, ob jeder sichtbare Vektorstrich die Platte verlässt. Eine proportional größere/kleinere ovale Platte behebt diesen normierten Überstand nicht automatisch.
- Konkreter Vorschlag: [designs/edelstahl-gravur-oval-150x80/TO-V2A-15x8-D1/design.json:2](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-oval-150x80/TO-V2A-15x8-D1/design.json#L2) auf derselben Zielgröße. Im vorhandenen und frisch bestätigten Lauf „passt“ ohne Fit-Hinweis. D1 ersetzt das Motiv durch eine schlichte zweizeilige Gestaltung; diese inhaltliche Änderung muss entschieden werden.

### 10600000 · TRE-V2A-8x5-D49

SVG-Motivkasten endet im 90-mm-Master bei x=90.002 mm; nach Umrechnung auf 120 mm liegt die gerundete rechte Kante bei 120.003 mm. Die auf 2 Dezimalstellen gerundete JSON-Box verdeckt diesen Überstand.

- Hauptprodukt: [linien/edelstahl-tuerschilder.json:1055](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/linien/edelstahl-tuerschilder.json#L1055). Größe und Grundpreis: [familien/edelstahl/steel-door-signs.json:737](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/familien/edelstahl/steel-door-signs.json#L737).
- Bogenübersicht: [designs/edelstahl-gravur-80x53/UEBERSICHT.md:70](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-80x53/UEBERSICHT.md#L70); Name „Familie mit Eulenfamilie, Schreibschrift“. Masterbogen `TRE-V2A-9x6`, Mastermaß 90 × 60 mm.
- Größenquelle: [designs/edelstahl-gravur-80x53/TRE-V2A-8x5-D49/design.json:115](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-80x53/TRE-V2A-8x5-D49/design.json#L115): `sizes = ["GR-ES-RE-90X60-T15","GR-ES-RE-120X80-T15","GR-ES-RE-150X100-T15","GR-ES-RE-180X120-T15","GR-ES-RE-210X140-T15","GR-ES-RE-240X160-T15","GR-ES-RE-300X200-T15","GR-ES-RE-420X280-T15","GR-ES-RE-450X300-T15"]`.
- Zeichnung: [zeichnungen/edelstahl-schilder-2027/geometrie.json:836](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/zeichnungen/edelstahl-schilder-2027/geometrie.json#L836), Datensatz `TRE-V2A-12x8`, Excelzeile 27, Zeichnungspfad 147. Ausdehnung 120.000007 × 80.000016 mm.
- Importbefund: „motiv-1: Element ragt über die Gestaltungsfläche hinaus.“.
- Der Präfix `8x5` ist die stabile Design-ID; dieser Master stammt tatsächlich aus `TRE-V2A-9x6`, 90 × 60 mm. Die Übersicht schließt lediglich die alte Größe `GR-ES-RE-80X53P3-T15` aus. Die angefragten 120 × 80 mm sind zugelassen. Keine Familie oder Größenliste erweitern, um den SVG-Überstand zu verdecken.
- Konkreter Vorschlag: [designs/edelstahl-gravur-80x53/TRE-V2A-8x5-D1/design.json:2](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-80x53/TRE-V2A-8x5-D1/design.json#L2) auf derselben Zielgröße. Im vorhandenen und frisch bestätigten Lauf „passt“ ohne Fit-Hinweis. D1 ersetzt das Motiv durch eine schlichte zweizeilige Gestaltung; diese inhaltliche Änderung muss entschieden werden.

### 12600000 · TRE-V2A-8x5-D57

SVG-Schriftgröße 22.76 mm × Skalierungsfaktor 5.25 = 119.49 mm; measureText erlaubt höchstens 100 mm.

- Hauptprodukt: [linien/edelstahl-tuerschilder.json:1335](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/linien/edelstahl-tuerschilder.json#L1335). Größe und Grundpreis: [familien/edelstahl/steel-door-signs.json:1011](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/familien/edelstahl/steel-door-signs.json#L1011).
- Bogenübersicht: [designs/edelstahl-gravur-80x53/UEBERSICHT.md:78](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-80x53/UEBERSICHT.md#L78); Name „Familie mit Herz-Ranken-Ornament“. Masterbogen `TRE-V2A-8x5`, Mastermaß 80 × 53.3 mm.
- Größenquelle: [designs/edelstahl-gravur-80x53/TRE-V2A-8x5-D57/design.json:116](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-80x53/TRE-V2A-8x5-D57/design.json#L116): `sizes = ["GR-ES-RE-80X53P3-T15","GR-ES-RE-90X60-T15","GR-ES-RE-120X80-T15","GR-ES-RE-150X100-T15","GR-ES-RE-180X120-T15","GR-ES-RE-210X140-T15","GR-ES-RE-240X160-T15","GR-ES-RE-300X200-T15","GR-ES-RE-420X280-T15","GR-ES-RE-450X300-T15"]`.
- Zeichnung: [zeichnungen/edelstahl-schilder-2027/geometrie.json:1144](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/zeichnungen/edelstahl-schilder-2027/geometrie.json#L1144), Datensatz `TRE-V2A-42x28`, Excelzeile 34, Zeichnungspfad 125. Ausdehnung 419.999936 × 280.000110 mm.
- Importbefund: „Schriftgröße: 1 bis 100 mm.“.
- Konkreter Vorschlag: [designs/edelstahl-gravur-80x53/TRE-V2A-8x5-D1/design.json:2](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-80x53/TRE-V2A-8x5-D1/design.json#L2) auf derselben Zielgröße. Im vorhandenen und frisch bestätigten Lauf „passt“ ohne Fit-Hinweis. D1 ersetzt das Motiv durch eine schlichte zweizeilige Gestaltung; diese inhaltliche Änderung muss entschieden werden.
- Alternative mit gleichem Design: **30 × 20 cm**, `GR-ES-RE-300X200-T15`, Familiengrundpreis **79,99 €**. Größte Schrift dann 85,35 mm; die frische R2-Prüfung derselben Vorlage auf 300 × 200 mm meldet „passt“ ohne Fit-Hinweis. Die Zuordnung, Produktbezeichnung und der abweichende Preis müssten ausdrücklich entschieden werden; Hauptprodukt-ID 12600000 nicht stillschweigend umdeuten.

### 6500000 · TR1-V2A-9x6-D15

SVG-Motivkasten reicht im 60-mm-Master bis y=60.005 mm. Die JSON-Box endet gerundet bei 60.00 mm; maßgeblich für den Import ist der SVG-Kasten.

- Hauptprodukt: [linien/edelstahl-tuerschilder.json:1363](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/linien/edelstahl-tuerschilder.json#L1363). Größe und Grundpreis: [familien/edelstahl/steel-door-signs.json:1251](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/familien/edelstahl/steel-door-signs.json#L1251).
- Bogenübersicht: [designs/edelstahl-gravur-retro1-90x60/UEBERSICHT.md:27](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-retro1-90x60/UEBERSICHT.md#L27); Name „Herzlich Willkommen bei Familie mit Blumenwiese“. Masterbogen `TR1-V2A-9x6`, Mastermaß 90 × 60 mm.
- Größenquelle: [designs/edelstahl-gravur-retro1-90x60/TR1-V2A-9x6-D15/design.json:146](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-retro1-90x60/TR1-V2A-9x6-D15/design.json#L146): `sizes = []`; [designs/edelstahl-gravur-retro1-90x60/TR1-V2A-9x6-D15/design.json:147](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-retro1-90x60/TR1-V2A-9x6-D15/design.json#L147): `sizesOpen = ["TR1-V2A-9x6"]`.
- Zeichnung: [zeichnungen/edelstahl-schilder-2027/geometrie.json:2994](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/zeichnungen/edelstahl-schilder-2027/geometrie.json#L2994), Datensatz `TRT1-V2A-9x6`, Excelzeile 82, Zeichnungspfad 336. Ausdehnung 89.999961 × 60.000056 mm.
- Importbefund: „motiv-1: Element ragt über die Gestaltungsfläche hinaus.“.
- `UEBERSICHT.md` nennt die Retro-Familiengröße noch „offen – fehlt in Familie“. Das ist ein älterer Ableitungsstand: Die aktuelle Familie enthält RT1 90 × 60 und `sourceContourSizes` löst `TR1-V2A-9x6` korrekt auf. Feste Ø4-mm-Löcher: (6,30) und (84,30), zusätzlicher Lochschutz 1 mm. Andere RT1-Größen sind für dieses Design nicht durch `sizesOpen` belegt.
- Konkreter Vorschlag: [designs/edelstahl-gravur-retro1-90x60/TR1-V2A-9x6-D1/design.json:2](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-retro1-90x60/TR1-V2A-9x6-D1/design.json#L2) auf derselben Zielgröße. Im vorhandenen und frisch bestätigten Lauf „passt“ ohne Fit-Hinweis. D1 ersetzt das Motiv durch eine schlichte zweizeilige Gestaltung; diese inhaltliche Änderung muss entschieden werden.

### 6800000 · TR2-V2A-9x6-D12

Bei proportionaler Einpassung von 90.6×61.3 auf 90×60 mm verletzt motiv-1 die Konturfläche; spruch liegt in der festen Lochschutzzone. sizesOpen ist korrekt auf RT2 gemappt.

- Hauptprodukt: [linien/edelstahl-tuerschilder.json:1405](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/linien/edelstahl-tuerschilder.json#L1405). Größe und Grundpreis: [familien/edelstahl/steel-door-signs.json:1447](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/familien/edelstahl/steel-door-signs.json#L1447).
- Bogenübersicht: [designs/edelstahl-gravur-retro2-91x61/UEBERSICHT.md:25](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-retro2-91x61/UEBERSICHT.md#L25); Name „Herzlich Willkommen bei Familie mit Pusteblume“. Masterbogen `TR2-V2A-9x6`, Mastermaß 90.6 × 61.3 mm.
- Größenquelle: [designs/edelstahl-gravur-retro2-91x61/TR2-V2A-9x6-D12/design.json:138](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-retro2-91x61/TR2-V2A-9x6-D12/design.json#L138): `sizes = []`; [designs/edelstahl-gravur-retro2-91x61/TR2-V2A-9x6-D12/design.json:139](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-retro2-91x61/TR2-V2A-9x6-D12/design.json#L139): `sizesOpen = ["TR2-V2A-9x6","TR2-V2A-12x8"]`.
- Zeichnung: [zeichnungen/edelstahl-schilder-2027/geometrie.json:3295](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/zeichnungen/edelstahl-schilder-2027/geometrie.json#L3295), Datensatz `TRT2-V2A-9x6`, Excelzeile 90, Zeichnungspfad 329. Ausdehnung 89.999989 × 59.999925 mm.
- Importbefund: „motiv-1: Element ragt über die Kontur-Gestaltungsfläche hinaus.“; „spruch: Element liegt in einer Bohrloch-Schutzzone.“.
- Einpassfaktor `60/61.3 = 0.9787928222`, horizontaler Versatz `0.660685155` mm; kein Verziehen. Feste Ø4-mm-Löcher bleiben bei (7,995;30) und (82,005;30), Lochschutz 1 mm. `TR2-V2A-12x8` ist ebenfalls als Quellgröße genannt; der aktuelle Familiengrundpreis beträgt 19,99 € ([Familie:1475](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/familien/edelstahl/steel-door-signs.json#L1475)). Dieser nun bekannte Preis belegt weder einen Größenwechsel noch eine Freigabe.
- Konkreter Vorschlag: [designs/edelstahl-gravur-retro2-91x61/TR2-V2A-9x6-D1/design.json:2](https://github.com/Chris83638w/gravuru-katalog./blob/1be49ee792667357fff1061eb5d21bacf3b4e3c1/designs/edelstahl-gravur-retro2-91x61/TR2-V2A-9x6-D1/design.json#L2) auf derselben Zielgröße. Im vorhandenen und frisch bestätigten Lauf „prüfen“ mit „Seitenverhältnis weicht um 1.50 % ab (eingepasst).“. D1 ersetzt das Motiv durch eine schlichte zweizeilige Gestaltung; diese inhaltliche Änderung muss entschieden werden.

## Bedeutung der Quellübersichten und Zeichnung

Die gelesenen `UEBERSICHT.md` liegen je Lieferform-2-Reihe und nennen dort die ursprünglichen Bögen sowie Grün-/Rot-Zuordnungen. Die zusätzlich gelesenen ursprünglichen Bogenverzeichnisse `designs/bestand/boegen/<Bogen>/` enthalten `designs.json`, keine eigene `UEBERSICHT.md`. Grün/zugeordnet bedeutet eine dokumentierte Größenwahl; es ersetzt keine heutige Prüfung von Objektkasten, Kontur, Lochschutz und Schriftgrenze.

Die Zeichnungsprüfung beruht auf der versionierten `zeichnungen/edelstahl-schilder-2027/geometrie.json`. Deren Metadaten nennen Zeichnung-SHA256 `d5a021410ec2cb920496adb119e5d32d933f97a71092a42db1986b721bca53b1` und Excel-SHA256 `1c27161c5d77683ea7ff692586d76ff7ba5f310220ad220ff61f31103cf176c3`. Die historischen Originaldateien auf P: bzw. im Downloadordner wurden in diesem Auftrag nicht geöffnet. Dieser Prüflauf hat keine Konturen, Lochkoordinaten oder Preise verändert; er liest die bereits aktualisierten Preise der Quelle `1be49ee…`.

Aktuelle Prüfpfade im Code: [app/workshop/katalog-convert.mjs:249](https://github.com/Chris83638w/gravuru-2027/blob/3e42c13411003add34645bc258623851982e7809/app/workshop/katalog-convert.mjs#L249) (`sourceContourSizes`), [app/workshop/katalog-convert.mjs:272](https://github.com/Chris83638w/gravuru-2027/blob/3e42c13411003add34645bc258623851982e7809/app/workshop/katalog-convert.mjs#L272) (`scaleTemplate`), [app/workshop/katalog-convert.mjs:308](https://github.com/Chris83638w/gravuru-2027/blob/3e42c13411003add34645bc258623851982e7809/app/workshop/katalog-convert.mjs#L308) (`templateFit`), [app/platform/sources/app/shared/models/doorbell-preview.mjs:7](https://github.com/Chris83638w/gravuru-2027/blob/3e42c13411003add34645bc258623851982e7809/app/platform/sources/app/shared/models/doorbell-preview.mjs#L7) (1–100-mm-Schriftgrenze).

## Datenstruktur für das Dashboard

`2026-10-24-paket-i-pruefung.json` enthält `cases[10]`, `catalogReadback.entries[104]`, frische Alternativprüfungen und die Quellprüfsummen. Jede Hauptproduktreferenz bewahrt ID, CustomizationID, Startdesign, Linie, Unterkategorie, Größe, Preis, Passung und weitere Sperren.

- Beziehung: Eine Design-ID kann mehrere Hauptproduktreferenzen haben; daher `mainProducts[]`, kein einzelnes Hauptproduktfeld.
- `isStartDesign` bedeutet nur, dass mindestens eine Hauptproduktreferenz diese exakte Design-ID nennt.
- Größen: `main.sizesOffered ?? sub.sizesOffered ?? family.sizes`; ein ausdrückliches leeres Array bleibt leer.
- Preise: `family.sizes[].baseCents`, gegebenenfalls explizite Unterkategorie-Überschreibung. `null` bleibt offen. Befestigungspreis separat anzeigen.
- Größenzuordnung, tatsächlicher Import-Fit und `freigabe.status` getrennt anzeigen. Ein freigegebenes Design kann geometrisch scheitern; eine passende Vorlage ist nicht automatisch freigegeben.
- Für Retro `sizesOpen` über die vorhandene `sourceContourSizes`-Logik berücksichtigen. Fehlende Quellen ausdrücklich melden, keine automatische Ersatzgestaltung setzen.

Alle Alternativen in diesem Bericht sind Entscheidungsvorschläge. Es wurde kein Startdesign ersetzt und keine Größe, kein Preis, keine Kennung oder Freigabe geändert.
