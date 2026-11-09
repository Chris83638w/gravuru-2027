# Schiefer-Designs 04.11.2026 (Claude, Chat „Schiefer“)

Auftrag Chris 04.11.: für alle Schiefergrößen Designs je Zielgruppe und Unterkategorie; nur Schiefer; im Zweifel von Edelstahl übertragen; vorher prüfen, was diese Woche schon entstanden ist.

## Was es schon gab (nicht neu gemacht)
- main: Tiere/Sternenkinder in allen Formen (#145, #148), Menschen nur Herzformen (#136), Kordel Familie/Willkommen (#143), Monogramme.
- Mikas 95 offene `dev/ms-*`-PRs: Menschen für alle Formen inkl. Kreuz – mit den Befunden aus #128 noch offen.

## Katalog-PRs
| Branch | Inhalt |
|---|---|
| `dev/schiefer-menschen-20261104-claude` | Mikas Menschen-Master zusammengeführt (Commit 1ff64df98) und nach #128 korrigiert; Kreuz nach Hausstil §8 neu. 18 Reihen, 2.097 Master, davon 1.956 angeboten (8 MEM-Nummern je Form nicht angeboten). |
| `dev/schiefer-tuerschilder-20261104-claude` | 955 Türschild-Master aus freigegebenen Edelstahl-Designs (Familien, Hausnummern, Willkommen, Andenken, Hochzeit, Hunde, Katzen) für Naturschiefer-Rechtecke, Quadrat, Rund, Premium und geschnitten 7×2 / 8×3,5 / 8×5. |

Beide bauen auf `dev/astra1-schiefer-familien-20261104` (Katalog #171, vier Schieferfamilien) auf.

## Prüfung
Renderer `scripts/render-vorlagen.mjs` mit dem Code aus #166. Alle Master „passt“; „prüfen“ nur wegen Bohrloch-Hinweisen (Register 3.41). Kontaktbögen hier als JPG (`menschen-*.jpg`, `tuerschilder-*.jpg`).

Lokaler Prüf-Hack (nicht committet): `PRUEF_KONTUR=1` in `app/workshop/design-targets.mjs`, weil `namedForm()` Kreuz→cross, Herz→heart und Rechteck→rect liefert, die Familien aber `contour:KR/HR/HS/ST/RE` führen. Ohne diese Anpassung meldet der Renderer „Andere Form …“ bzw. „Quellform nicht eindeutig“ für Kreuz, Herz schief, Stern und die Kordel-Rechtecke – betrifft den Code von #166, nicht die Designs.

## Offen / für Chris
- Freigabe je Design (nur Chris).
- Nicht angeboten: MEM-115, 119, 148, 353, 377 (Dubletten), 372, 378 (Ringe), 338 (Mini-Schrift A7).
- Noch nicht aus Edelstahl übertragen: Hochformate (20×30, 15×20, 30×40) und die Kordeltafeln (dort gibt es Familie/Willkommen aus #143).
- MEM-131 (alle Formen): Rahmenecken stehen schon in Mikas Vorlage weit unterhalb des Fotos.
- Motiv-Text-Abstände unter 3 mm bei kleinen Größen stammen 1:1 aus den freigegebenen Edelstahl-Vorlagen.
