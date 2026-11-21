# Maschinentest der Bestelldateien (PDF und SVG, immer mit Kontur)

Claude (Operator), 21.11.2026; am selben Tag angepasst an die Musterdatei von Chris (Verweis im Code „ENTSCHEIDUNGEN 3.62“). Grundlage: ENTSCHEIDUNGEN 3.60 (Chris, 21.11.2026, 15:22 Uhr: „2. ja“), 3.61 und die Vorgabe unten. Aufbau der Dateien, Belege und Bilder: [Bestelldateien nach Muster](2026-11-21-bestelldateien-nach-muster.md). Für die Fertigung steht dieselbe Anleitung als Dokument bei Chris („Maschinentest: Fertigungsdateien mit Kontur“). Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt unverändert; an Designs wird nichts geändert.

**Voraussetzung:** Der Serverstand mit den Bestelldateien nach Muster ist aufgespielt. Bis dahin liefern die Knöpfe die Dateien des Stands 3.61 (gespiegelt wie die Gravur, Kontur schwarz, Breite 0). Nur Testmaterial, nichts für Kunden fertigen. Bis zur Rückmeldung gilt keine Datei als an der Maschine abgenommen.

## Vorgabe von Chris (21.11.2026)

- 17:07 Uhr, mit der Musterdatei: „so müssen die dateien aussehen“
- 17:08 Uhr: „bei druckbaren war es äußere Kontur in den haarlinien rosa von Roland (Schmuckfarbe) und Bilder bei hinterdruckten Acrylglas erst Farbe und dan Rdg White. Aber bei der ausgabe muss der druck zu sehen. Wir drehen es dann in corel draw um“
- 17:17 Uhr: „blaue linien sind nur für die konturen , damit man es in den schablonen anlegen kann. bei schildern aus acrylglas gibt es ausnahmen, weil da die löcher im anschliss der gravur geschnitten werden und daher rot benötigen,“
- 17:18 Uhr: „nur beim druck Betsellungen ist es die schnittkontur von roland, sprich rosa, da sonst farbe gedruckt wird“

## Wo die Dateien liegen

Werkstatt → Bestellungen → Testbestellung „Claudetest“ (z. B. #1042, Familien-Namensschild Acrylglas 12 × 8 cm, Gravur) → „Dateien zu dieser Gestaltung“ → PDF und SVG. Aktiv, sobald „Fertigungsdatei: Fertig“ dasteht. Nach dem Aufspielen baut die Position ihre Dateien beim ersten Öffnen neu; solange steht dort „PDF und SVG werden für diese Position neu erstellt.“

## Laser (Gravur), PDF

1. Größe 1:1; die Seite ist die Platte (an einer Kante nachmessen). Funkklingel: die Seite ist die Acrylauflage.
2. Nicht gespiegelt, auch bei Gravur von hinten – in Corel umdrehen. Passt das für alle Gravurprodukte?
3. Eine Ebene „03 Gravur“ mit der ganzen Gravur in Schwarz – kommt sie so an? Die Gravur ist auf die Plattenkontur beschnitten (wie in der Musterdatei); in Corel kommt das ggf. als PowerClip an – stört das?
4. Außerhalb der Ebene, direkt auf der Seite (keine Gruppe, kein Rahmen): blaue Linie = Außenkontur zum Anlegen in der Schablone. Bei Acrylglas rote Linien = Löcher und Ausschnitte, die nach der Gravur geschnitten werden. Alle Linien 0,001 mm – als Haarlinie erkannt? Blau wird weder graviert noch geschnitten, Rot geschnitten?
5. Edelstahl, Schiefer und andere Materialien: Löcher stehen als **blaue** Linie in der Datei (Annahme, von Chris nicht gesagt). Richtig so, oder sollen sie dort fehlen?
6. Mit Foto: Graustufenbild in der Ebene „03 Gravur“, Konturen als Linien darüber – brauchbar?
7. Probegravur auf einem Reststück: Gravurbild sauber, blaue Linie nicht mitgraviert, rote Linie als Schnitt?

## UV-Drucker, PDF

1. Größe 1:1 im RIP.
2. Nicht gespiegelt; der Druck ist beim Öffnen zu sehen – in Corel umdrehen. Bleiben die Schmuckfarben und Ebenen nach dem Umdrehen erhalten?
3. Jede Kontur (Außenform und Ausschnitte) als Linie von 0,001 mm in der Schmuckfarbe `CutContour` (rosa): als Schnittkontur erkannt und nicht mitgedruckt?
4. Roland: Farbe und Weiß (`RDG_WHITE`) in derselben Datei, Ebenen in der Reihenfolge Farbe, `RDG_WHITE`, `CutContour` – stimmt der Druckablauf (hinterdrucktes Acrylglas: erst Farbe, dann Weiß)?
5. Mimaki: Weiß bleibt eine eigene Datei unter „Ausgaben zur Position öffnen“ und ist dort wie bisher nach Profil gespiegelt, die Bestelldatei nicht – passt das zusammen?

## SVG in Corel

1. Größe 1:1, nicht gespiegelt.
2. Gravur: Gruppe „03 Gravur“ (Kennung `gravur`), danach `aussenkontur` (blau) und bei Innenkonturen `ausschnitte` (rot) oder `innenkonturen` (blau); Linien 0,001 – kommen Gruppen und Haarlinien an?
3. Druck: letzte Gruppe „CutContour“ in Rosa (#ff00ff), Linie 0,001. SVG kennt keine Schmuckfarben – muss die Linie in Corel der Schmuckfarbe zugewiesen werden, oder genügt die PDF?
4. Formprodukte alter Art: Die Gravur-SVG zeigt die Farben der Vorschau, die PDF reines Schwarz – stört das?

## Rückmeldung

Je Punkt „geht“ oder „geht nicht, weil …“, mit Foto oder Bildschirmfoto, an Chris. Entscheidend: (1) Wird eine Kontur mitgraviert oder mitgedruckt? (2) Stimmen Blau, Rot und `CutContour` mit den Farbzuordnungen der Maschinen? (3) Löcher bei Edelstahl und Schiefer: blau lassen oder weglassen?
