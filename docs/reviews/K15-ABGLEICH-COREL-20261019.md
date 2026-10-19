# K15 · Abgleich Corel-Zuordnungen ↔ Python-Importer

Stand: 19.10.2026 · Branch `dev/konfi-neu-K15-amazon-import` · **nur lesend**: Kopien der produktiven Dateien wurden ausgewertet, auf Server und Rechner wurde nichts geschrieben. Die `Amazon-Import ASIN zu Design-CDR.xlsm` war während des Abgleichs in Excel geöffnet (laufender Workflow).

Daten und Werkzeug: [`k15-corel-abgleich-20261019/`](k15-corel-abgleich-20261019/) (erzeugt mit `scripts/compare-corel-amazon-mapping.py`, SHA-256 der Quellen in `abgleich.json`). Code-Referenz: [`corel-skripte/`](../../corel-skripte/README.md).

## Quellen

| Datei | Ort | Stand |
| --- | --- | --- |
| `Amazon-Import ASIN zu Design-CDR.csv` | `V:\Amazon\` (wird aus der gleichnamigen `.xlsm` erzeugt; Hinweis in der CSV: „Daten, die hier nachträglich eingetragen werden, bleiben nicht bestehen“) | 1 554 510 Byte, cp1252, `;` |
| `Schiften Aliasse.csv` | `Y:\20_Martin\Corel\Amazon Import\` | 154 Zeilen, UTF-8 |
| `Schiefer Schriftartenhäufigkeit.xlsx` | `V:\Produkte\Gedenktafeln\Gravur\Schiefer\` | Schriften in den Schiefer-Design-CDRs mit Häufigkeit |
| Katalog-Schriftbibliothek | `gravuru-katalog./schriften/schriften.json` @ `8590ebd2` | 75 Schriften |
| Python-Mapping | `amazon/asin-mapping.json`, `font-aliases.json`, `design-overlays.json` @ `4571232` | 1 ASIN, 1 Alias, 1 Motivbox |

## Ergebnis in Zahlen

| | Corel (produktiv) | Python-Importer (K15) |
| --- | --- | --- |
| ASINs | **3 266** eindeutige (3 368 Zeilen, 335 Folgezeilen `>` für Mehr-View-Produkte, 44 Produktabschnitte) | **1** (`B013T1VRKS`) |
| Abdeckung | – | 1 / 3 266 |
| Schrift-Aliase | 154 Einträge auf 91 Zielschriften | 1 Eintrag (`MINIMALIST → Minimalist`) |
| Zielschriften im Katalog | 21 von 91 | – |
| Schablonen | Spalte `Schablonenpfad` in **keiner** Zeile belegt | – |

Größte Abschnitte: Gedenktafeln 878, Türklingel 338, Hochzeitsschilder 263, Wandbilder 204, Türschilder 183, Kordelschilder 161, Namensschilder 160, Grabstecker 115, Hausnummern 123 (Rest in `abgleich.json`).

## Befunde

**1. Referenzfall bestätigt, und die Familie 22 × 14 gibt es in der Produktion.** `B013T1VRKS` steht in Zeile 546 (Abschnitt Gedenktafeln): `Dateipfad = V:\Produkte\Gedenktafeln\Gravur\Schiefer`, `Größe = ja`. Corel hängt den Größenordner an (Ordnername passt zur Amazon-Größenauswahl, sonst bei `automatisches Größenmanagement` gleiches Seitenverhältnis), dann den Designordner `<Standardname>-D<Nr>`. Ergebnis für den Referenzfall: `V:\Produkte\Gedenktafeln\Gravur\Schiefer\22x14\GT-S-22x14-D201\Export\GT-S-22x14-D201.cdr` (vorhanden, 37 KB). Unter `22x14` liegen 179 Designordner (D1–D293 mit Lücken) plus Grundform `GT-S-22x14`. Schiefer-Gravur hat außerdem 14x22, 20x15, 20x20, 20x30, 25x10, 30x11, 30x20, 30x60, 38x13, 40x20, 40x30, 60x30 sowie Stern/Knochen/Herz. → **K15 offen 1** („Familie 22 × 14 fehlt“) betrifft nur den neuen Katalog, nicht die Produktion; die Maße der Platte lassen sich aus `GT-S-22x14.cdr` belegen statt als Platzhalter zu führen.

**2. Die Motivlage ist schon da: in der Design-CDR.** `design-overlays.json` führt D201 als „geschätzt, kalibrieren“ aus der Amazon-Vorschau. Die Amazon-Overlays werden aber von `AmazonExport` aus genau diesen Design-CDRs erzeugt (400 × 400). Die Motivbox muss also nicht aus PNGs kalibriert werden (`calibrate-amazon-overlays.py`, nicht gebaut), sondern kann aus `GT-S-<Größe>-D<Nr>.cdr` gelesen werden. Der vorhandene CDR-Parser `scripts/read-corel-design-sheets.py` (Light-Pass) ist dafür der Ansatzpunkt.

**3. Größenzuordnung funktioniert in Corel über Ordnernamen, nicht über eine Tabelle.** Für den Referenzfall gibt es keine `Konfi-Options-Übersetzungen`; Corel findet `22x14` aus „ca. 22x14 cm“ über den Ordnernamen-Anfang. Nur 339 Zeilen haben Übersetzungen, in zwei Formen: einfache Liste `Amazon-Wert:Ordner|…` (z. B. `24x30 cm:24x30|30x40 cm:30x40|60x80 cm:30x40`) und JSON-Regeln mit `Matches/Conditions/Result(s)` je View (Material, Edelstahlrahmen → `designNumber`, `desVar(n)`, Platzhalter wie `%EDELSTAHL ECKEN%` im Pfad). `familyBySize` im Python-Mapping deckt nur die einfache Form ab; die Regelform (vor allem Türklingeln Acryl + Edelstahl, 106 Zeilen) fehlt im Modell.

**4. Schriften: die größte Lücke.** 70 der 91 Corel-Zielschriften stehen nicht im Katalog, darunter Windows-/Kaufschriften (Century Gothic, Georgia, Constantia, Comic Sans MS, Edwardian Script ITC, Copperplate Gothic, Arial) und Familien mit vielen Schnitten (Poppins, Roboto, IBM Plex Serif, Taviraj, EB Garamond). Gewichtet nach der Schiefer-Häufigkeitstabelle deckt der Katalog **56 %** der Schriftverwendungen in den Schiefer-Designs ab (1 963 von 3 499). Häufigste fehlende: Champagne & Limousines 161, Caviar Dreams 148, Poppins ExtraLight 115, Arvo 96, Georgia 95, Stylish 80, Centaur 78 (D201 nutzt Allura + Centaur), Ampera 57, „Unbekannt (Fontbase prüfen)“ 56. Der Python-Importer bricht bei solchen Schriften mit `font_unknown` ab – korrekt nach Spezifikation (kein stiller Ersatz), aber bei realen Bestellungen häufig. Hinweis: Die Tabelle zählt Schriften in den Designvorlagen; welche Schrift der Kunde im Amazon-Konfigurator wählt, kann abweichen (Referenzfall: Great Vibes).

**5. Corel verliert Schnitte.** `getFontAlias` bildet z. B. „Century Gothic Bold Italic“ auf „Century Gothic“ ab; danach wird nur bei Namen, die auf „Bold“ enden, Fett gesetzt. Kursiv und „Bold Italic“ werden nicht gesetzt (Kommentar `TODO` in `AmazonImport.processText`). Bei der Paritätsprüfung sind Abweichungen bei kursiven Schnitten also ein Corel-Fehler, kein Python-Fehler.

**6. Datenqualität der Corel-Tabelle.** 96 ASINs stehen mehrfach, 37 davon mit widersprüchlichen Angaben (anderer Pfad, andere Design-Nummer, anderer Abschnitt, z. B. `B0979Q5JMR` als Gedenktafel und als Sternenkinder). Corel nimmt immer die **erste** Zeile (`AmazonImportViewManager`: erste Fundstelle, `Exit For`); die übrigen sind tote Einträge – im Index als `_corel_aktiv: false` markiert. Einige Pfade zeigen in `[Archiv]`-Ordner. Drei Sonderzeilen (`?B09GP7ZWPD`, „FEHLT ! !“, „Von Amazon gelöscht“) werden von Corel nicht als ASIN erkannt. In der Alias-Tabelle steht `amazone` doppelt (gleiches Ziel). Kopfspalte D enthält ein defektes Zeichen (`ausgef�ltt`, Byte 0x81).

## Was das für K15 heißt

- Der Python-Importer ist heute ein Einzelfall-Werkzeug (1 von 3 266 ASINs). Für eine Paritätsprüfung in der Breite braucht er die Corel-Tabelle als Quelle, nicht eine handgepflegte `asin-mapping.json`.
- Vorschlag (nicht umgesetzt, Entscheidung Chris): `asin-mapping.json` künftig **aus** `corel-asin-index.json` erzeugen (Linie aus Abschnitt, Familie aus Pfad + Größenordner, Design aus `-D<Nr>`), nur die Regelform (Befund 3) bleibt handgepflegt. Die `.xlsm` bleibt die führende Quelle; nichts wird dorthin zurückgeschrieben.
- Schriften: Entscheidung nötig, ob der Katalog um die fehlenden Schriften erweitert wird (Lizenzen prüfen; Windows-Schriften sind auf den Corel-PCs installiert, aber nicht frei weitergebbar) oder ob der Importer bei Systemschriften auf eine lokal installierte Datei zurückgreifen darf.

## Nächste Schritte (nur lesend)

1. `GT-S-22x14.cdr` und `GT-S-22x14-D201.cdr` mit `scripts/read-corel-design-sheets.py` lesen: Plattenmaß belegen, Motivbox D201 ersetzen (Befund 1, 2).
2. Paritätslauf am Referenzfall: dieselbe ZIP einmal durch Corel (macht Chris bzw. Werkstatt wie gewohnt; PDF-Export ablegen) und einmal durch `import-amazon-order.py`; Vergleich von Textlage, Schriftgröße, Fotoausschnitt.
3. Für die nächste Bestellung mit anderer Schrift prüfen, wie oft `font_unknown` real auftritt (Befund 4).

## Nicht geprüft

Ob alle 3 266 Dateipfade auf `V:` existieren; Inhalt der Regel-Übersetzungen im Einzelnen; welche Schriften im Amazon-Konfigurator tatsächlich zur Auswahl stehen (Amazon-Vorlagenexport fehlt); Stand der `.gms` auf den Werkstatt-PCs.
