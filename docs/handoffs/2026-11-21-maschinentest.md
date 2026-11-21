# Maschinentest der Bestelldateien (PDF und SVG, immer mit Kontur)

Claude (Operator), 21.11.2026. Grundlage: ENTSCHEIDUNGEN 3.60 (Chris, 21.11.2026, 15:22 Uhr: „2. ja“) und 3.61. Für die Fertigung steht dieselbe Anleitung als Dokument bei Chris („Maschinentest: Fertigungsdateien mit Kontur“). Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt unverändert; an Designs wird nichts geändert.

**Voraussetzung:** Der Serverstand mit 3.61 ist aufgespielt. Nur Testmaterial, nichts für Kunden fertigen. Bis zur Rückmeldung gilt keine Datei als an der Maschine abgenommen.

## Wo die Dateien liegen

Werkstatt → Bestellungen → Testbestellung „Claudetest“ (z. B. #1042, Familien-Namensschild Acrylglas 12 × 8 cm, Gravur) → „Dateien zu dieser Gestaltung“ → PDF und SVG. Aktiv, sobald „Fertigungsdatei: Fertig“ dasteht.

## Laser (Gravur), PDF

1. Größe 1:1 (an einer Kante nachmessen).
2. Kontur auf eigener Ebene „Kontur“, Haarlinie – als eigene Linie erkennbar?
3. Konturfarbe: Schiefer blau, Funkklingel rot (Kontur der Acrylauflage), sonst schwarz – passt das zu den Farbzuordnungen am Laser?
4. Behandelt die Software die Kontur als Anlege- oder Schnittlinie, oder würde sie sie mitgravieren? Getrennt ein- und ausschaltbar?
5. Spiegelung richtig?
6. Probegravur auf einem Reststück: Gravurbild sauber, Kontur nicht mitgraviert?

## UV-Drucker, PDF

1. Größe 1:1 im RIP.
2. Schnittlinie als Haarlinie in der Sonderfarbe `CutContour`: als Kontur erkannt oder mitgedruckt?
3. Roland: Weiß (`RDG_WHITE`) in derselben Datei?
4. Mimaki: Weiß bleibt eine eigene Datei unter „Ausgaben zur Position öffnen“ – reicht das so?
5. Spiegelung richtig?

## SVG in Corel

1. Größe 1:1.
2. Kontur als Gruppe „kontur“, 0,05 mm – kommt sie als Haarlinie an?
3. Gravur: SVG gespiegelt wie die Gravur-PDF – passt das?
4. Druck: SVG seitenrichtig, Druck-PDF gespiegelt – passt das, oder beide gleich?

## Rückmeldung

Je Punkt „geht“ oder „geht nicht, weil …“, mit Foto oder Bildschirmfoto, an Chris. Entscheidend: (1) Wird die Kontur mitgraviert, geschnitten oder gedruckt? (2) Welche Konturfarbe braucht jede Maschine?
