# Schiefer-Designs (Claude, 04.11.2026)

Auftrag Chris 04.11.2026: „Deine Aufgabe ist es für alle Größen, wie besprochen Designs anzufertigen, und dies für unterschiedliche Zielgruppen und Unterkategorien“ – „du machst aber nur Schiefer Produkte und kannst im Zweifel Designs von Edelstahl auf Schiefer übertragen“ – „prüfe aber, da in dieser Woche bereits sehr viele Designs gemacht wurden“.

Nichts neu erfunden, wo es schon etwas gab:

| Skript | Zweck |
|---|---|
| `korrektur.py` | Korrekturen aus #128 an Mikas Menschen-Mastern (alle Formen außer Kreuz): Textfehler, Datumsumbrüche, Rangfolge Name > Spruch (optische Größe), Haarlinien, Motivabstand ≥ 3 mm, Dubletten nicht anbieten, doppelte Beispielnamen. `--kreuz`: nur Text/Namen/Dubletten für das Kreuz. |
| `kreuz.py` | Kreuz 21,5 × 30 nach Hausstil §8 neu aufbauen: Name groß im Querbalken, Daten darunter, Foto im Kopf, ein Motiv im Stamm (72 % Stammbreite), Spruch nur ohne Motiv. Reihenfolge: erst `korrektur.py --kreuz`, dann `kreuz.py`. |
| `schiefer-uebertrag.py` | Freigegebene Edelstahl-Türschild-Designs (Familien, Hausnummern, Willkommen, Andenken, Hochzeit, Hunde, Katzen) auf die Schiefertafeln übertragen; je Seitenverhältnis ein Master, Gruppe mittig, Schrift ≤ 100 mm in der größten Zielgröße. |
| `einzelfix.py` | Nach `korrektur.py`: fünf Einzelfälle, bei denen Foto, Motiv oder Datum danach die Kontur berührten (MEM-090, 049, 094, 106, neu-erinnerung-02) – Element in 5-%-Schritten um seine Mitte verkleinern bzw. in den Plattenbogen setzen, bis der Renderer „passt“ meldet. |
| `slate-sizes.mjs` + `slate-sizes-apply.py` | `sizes` (und beim Übertrag `formatreihe`) nach `app/workshop/slate-design-targets.mjs` aus #170 setzen; das Python-Skript schreibt formattreu. |
| `aelib.py`, `aelayout.py`, `build_helpers.py` | übernommen aus `scripts/ae-tuerschilder/` (AE-Chat #131, Branch `dev/ae-tuerschilder-20261102`). |
| `svgedit.py` | Text/Motiv/Foto im vorhandenen Lieferform-2-SVG verschieben und neu setzen (IDs und `data-feld` bleiben). |

Prüfung: `scripts/render-vorlagen.mjs` (Kontaktbögen mit Prüfstatus). Bögen liegen in `docs/handoffs/2026-11-04-schiefer-designs/`.
