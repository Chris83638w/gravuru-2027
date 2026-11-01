# Nachauftrag Astra Mika · Grabkreuze Hunde – Gestaltung neu (01.11.2026)

Bewertung Claude und Chris zur Lieferung vom 01.11.2026 (Katalog-PR #125, Code-PR #109): **Technik in Ordnung, Gestaltung nicht abnahmefähig.** Chris: „nicht ordentlich gearbeitet“. Dieser Nachauftrag ergänzt `AUFTRAG.md` und `designs/DESIGN-MASTER.md` – beide gelten weiter vollständig.

## 1. Was nicht passt (Befunde aus dem Kontaktbogen Schwarz 11×20)

1. **Zu gleichförmig:** 17 der 20 Designs haben denselben Aufbau (Motiv oben – Name im Querbalken – Jahre – kurzer Spruch) und nur 4 Motive (Pfote, Herz mit Hund, Rose, Herz). Das ist eine Kopie, keine Auswahl. Design-Master §4.4: „Familie, aber keine Kopie“.
2. **Fläche verschenkt:** Der Stamm ist unten oft leer, Sprüche sind sehr klein. Design-Master §4.2: Fläche gut nutzen, ruhiger, aber gefüllter Gesamteindruck.
3. **Vorlagen nicht genutzt:** Nur 3 Originale übernommen. Vorhandene Gravur-Vorlagen sind 1:1 umzusetzen (AUFTRAG §3, Design-Master §1). „Schrift fehlt“ ist kein Grund mehr – siehe Abschnitt 2.

## 2. Schriften (Entscheidung Chris 01.11.2026: „nimm unsere Schriften“)

Fehlende Originalschriften werden ersetzt (steht jetzt in `schriften/README.md` und `schriften.json → replacements`, Katalog-main 2cfe4db):

| Original | Ersatz |
|---|---|
| Clarissa | Alex Brush |
| Playlist | Homage |
| Standlist | Ashley |
| Sophie Robinson | Allura |
| Century Gothic | Montserrat |
| Champagne & Limousines | Montserrat Light |

## 3. Die 20 Hunde-Designs – Pflichtliste

**A. Gravur-Originale 1:1 (8)** – Katalog `designs/bestand/kreuze/`, Schriften nach Abschnitt 2, Motive und Aufteilung wie im Original:

| Design | Name im Beispiel | Hinweis |
|---|---|---|
| KZ-A D0 | Tapsy | bereits geliefert, bleibt |
| KZ-A D1 | Buffy | Fotofeld entfällt (zunächst ohne Fotogravur), Rest rückt zusammen |
| KZ-A D41 (= D19) | Paula | |
| KZ-A D42 (= D20) | Clarissa | Pfotenspur |
| KZ-A D46 (= D30) | Balu | |
| KZ-A D48 (= D34) | Frieda | Spruch „Du warst, du bist …“ |
| KZ-A D53 (= D57) | Kira | bereits geliefert, bleibt |
| KZ-A D55 (= D59) | Rocky | bereits geliefert, bleibt |

Nicht übernehmen: D16/D17 (Herzform-Kreuze – formgebunden, Design-Master §7), Katzen-Designs (D35/D36/D40/D49/D50/D54/D58), Dubletten.

**B. UV-Originale als Gravur (4)** – `KZUV-A` D26 (Cooper), D27 (Bella), D32 (Moritz, ohne Fotofeld), D33 (Flocke): Aufteilung, Schriften und Motive als **sehr starke Referenz**, einfarbig als Gravur umgesetzt (Modus „Referenz“).

**C. Weitere Vorlagen (5–6)** – aus den **39 Hunde-Gedenktafeln** im Katalog (`designs/bestand/gedenktafeln/Tiere/Hund/`): Motive, Schriften und Stimmung übernehmen, auf die Kreuzform neu proportioniert (Modus „Referenz“). Andere Motive als in A/B (z. B. Hunderassen, Knochen, Halsband, Hundekopf, Sternschnuppe, Regenbogen).

**D. Ganz neue Designs (2–3)** – eigene Ideen, deutlich andere Anordnung (Design-Master §5).

## 4. Qualitätsmaßstab (wird bei der Abnahme geprüft)

- **Mindestens 8 verschiedene Motive** über die 20 Designs, kein Motiv öfter als dreimal.
- **Mindestens 5 verschiedene Aufbauten**, z. B.: Name senkrecht im Stamm; Motiv im Querbalken neben dem Namen; Motiv groß im Kreuzungspunkt; Spruch im Querbalken, Name im Stamm; Daten links/rechts im Querbalken (wie Tapsy); Motiv unten im Stamm über der Erdlinie.
- **Fläche nutzen:** Der sichtbare Stamm ist bis ca. 1 cm über der Gestaltungsgrenze gestaltet oder bewusst ruhig mit einem Motiv; Sprüche nicht kleiner als nötig (mindestens 3 mm Versalhöhe auf 11 × 20, gern größer).
- **Rangfolge:** Name zuerst und am größten, Motiv ist Blickfang, aber nicht größer als der Name.
- Schriften 1–3 je Design, über die Serie variiert; nicht überall dieselbe Schreibschrift.
- Kein Design ohne Text; nichts verdeckt etwas; Erdteil frei.

## 5. Ablauf und Lieferung

1. **Zuerst nur ein Kontaktbogen** (Schwarz 11 × 20, alle 20 Designs, Original klein daneben) an Claude in #76. Erst nach Claudes Abnahme die übrigen Größen/Farben und erst danach die anderen 11 Produkte.
2. **Kontaktbögen und Vorschaubilder nicht mehr in den Katalog committen** (Speichergrenze GitHub). Im Katalog nur `design.json`/`design.svg`. Kontaktbögen als **JPG (max. 2 MB je Bogen)** im Code-Repo unter `docs/handoffs/grabkreuze-hunde-<datum>/`.
3. Die bisherigen PNG-Kontaktbögen und SVG-Vorschauen in PR #125 wieder herausnehmen.
4. Die Browser-/Bedienprüfung im Konfi übernimmt Claude, sobald die Gestaltung abgenommen ist.
