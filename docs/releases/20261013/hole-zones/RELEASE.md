# Familie bearbeiten, Übernahme auf Produkte, Bohrloch-Schutzzone · 13.10.2026

Branch `task/plugin-design-pipeline-20261013`. **Nicht installiert, nicht veröffentlicht.** Live-App, Shop und private Daten unverändert.

## 1. Familie direkt bearbeiten

Verwaltung → Produktfamilien → **Bearbeiten**: Name, Material, Gestaltungsrand, Schutzzone, „Ohne Bohrung“, zugelassene Schriften, Stilnotizen; Formgruppen (eckig/oval, Eckenradius); Bohrbilder (Lage, Ø, Randabstand, Aufpreis, SKU-Endung); Größen (Maße, Form, Grundpreis, Befestigungen, hinzufügen/entfernen). Jede Speicherung = neuer Familienstand. Hat jemand anderes inzwischen gespeichert, wird nichts überschrieben und ein Hinweis erscheint. [Bildschirmfoto](../families/familie-bearbeiten.png)

## 2. Änderungen auf erzeugte Produkte übernehmen

„Auf Produkte übernehmen …“ zeigt je Produkt, was sich ändert (z. B. „Grundpreis: 10,99 € → 11,99 €“, Maße, Form, Befestigung). Erst nach Bestätigung erhält jedes betroffene Produkt einen neuen Stand. Designs, Kundenfreigaben, SEO und Kategorien bleiben erhalten. Produkte, die inzwischen anders bearbeitet wurden, werden nicht überschrieben. Passt ein Design nicht mehr in eine verkleinerte Größe, wird das Produkt nicht geändert und mit Hinweis gemeldet.

## 3. Schutzzone und Text-Hinweis (Paket C)

- Konfigurator und Händler-Editor zeichnen um jedes Bohrloch die Schutzzone (Lochrand + 1 mm) gestrichelt, nur bei gewählter Befestigung mit Bohrung. Nie in Fertigungsdateien.
- **Texte** in der Schutzzone: Hinweis unter dem Schild („Der Text „…“ liegt im Bereich eines Bohrlochs …“), keine Sperre. **Motive und Fotos**: kein Hinweis (Nutzerentscheidung).
- Der Hinweis erscheint auch dann, wenn gleichzeitig eine andere Meldung offen ist.
- Gesicherter Bestellstand erhält den Prüfvermerk „Prüfvermerk Bohrloch: Text … bei x | y mm“ für die Fertigung.
- [Kundenansicht](kundenansicht-hinweis.png) · [Händler-Editor](werkstatt-hinweis.png)

## 4. Größenänderung mit Bohrbild-Regel (Rest Paket B)

„Schildgröße & Form“ im Produkt passt Bohrlöcher aus einer Familienregel mit gleichem Randabstand in mm an (Oval 90 × 60 → 120 × 80: Löcher bei 6 | 40 und 114 | 40 statt proportional 8 mm). Feste Altkoordinaten ohne Regel bleiben gesperrt.

## Gefundene und behobene Bedienfehler während der Prüfung

- Kunden-Hinweis lag zunächst in einem schrittabhängig ausgeblendeten Seitenbereich → jetzt direkt unter der Schildvorschau.
- Hinweis wurde bei gleichzeitig ungültiger Gestaltung nicht aktualisiert → jetzt unabhängig berechnet.

## Prüfungen

- `product-families.test.mjs` (10), `hole-proximity.test.mjs` (3), `steel-formats.test.mjs` unverändert grün.
- Browser `check-product-families.py`: 12/12 inkl. Bearbeiten, Übernahme und Konflikt; `check-hole-hints.py`: 7/7 (Händler + Kunde, Zone, Hinweis, K00 ohne Zone).
- Gesamtlauf und Betriebstests siehe STATUS.

## Offene Risiken

- Händler-Editor und Kundenansicht bewerten einen Text direkt an der Ovalkontur leicht unterschiedlich (Händler speichert, Kunde meldet „ragt über die ovale Gestaltungsfläche“). Vor Veröffentlichung angleichen.
- Mehrere Größen innerhalb eines Produkts mit Bohrbild bleiben gesperrt; Familien erzeugen ohnehin ein Produkt je Größe.
