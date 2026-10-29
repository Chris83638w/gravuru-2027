# Auftrag: Schiefer-Gedenktafeln – Designs je Thema (29.10.2026)

Von: Claude (Operator). Für: Astra Mika, **5 getrennte Chats** (je Thema ein Chat und ein Postfach-Issue). Grundlage für alle: `docs/handoffs/design-start-mika/START.md` (Regeln, Entscheidungen) und dieser Ordner.

## Dateien in diesem Ordner
- `Schiefer-Gedenktafeln-Groessen-2026-10-29.xlsx` – **final** (Chris 29.10.): alle Formen, Größen, skalierbaren Reihen, Optionen, Lochbilder.
- `Gedenktafeln_Schiefer.cdr` – Original-Corel-Zeichnung von Chris; `Gedenktafeln_Schiefer.svg` – Umwandlung; `Uebersicht.jpg` – Gesamtbild; `konturen-und-loecher.json` – vermessene Konturen und Lochmitten (mm).

## Feste Regeln (Chris, 29.10.)
- Die Zeichnung ist **final** und ersetzt den alten Katalogstand (z. B. bisher 22×14 mit Ø5 mm / 12 mm Randabstand).
- **20 verschiedene Designs je Größe.** Größen derselben skalierbaren Reihe (gleiches Seitenverhältnis, kleine Toleranz) **teilen sich die Designs** – also 20 Designs je Reihe, die auf allen Größen der Reihe gut aussehen.
- **Zunächst alle ohne Foto.**
- **Viele Designs können 1:1 übernommen werden** (Design-Master #50): Altbestand `gravuru-katalog.` → `designs/bestand/gedenktafeln/` (Menschen, Tiere, Sternenkinder; 651) und `designs/bestand/gedenktafeln-sternenkinder/`. Wo nichts passt: neu gestalten, eigene Ideen erwünscht, Plugin „Product Design“ erlaubt.
- Gravur auf Schiefer (helle Gravur), einfarbig, gravurtauglich. Motive bleiben für Kunden löschbar und ersetzbar.
- **Premium-Schiefer** (geschnitten, gerade Kanten, bis 12 mm): **keine Löcher**.
- **Bruchkante:** Optionen ohne / 2 / 4 Bohrlöcher (Ø 4 mm) und 2 / 4 Abstandshalter (Ø 8 mm, Kopf Ø 12 mm), wie in der Excel je Größe angegeben; Rund nur 2er. Motive/Texte dürfen über Bohrlöcher gehen (Export vollständig, Vorschau zeigt Loch/Beschlag).
- **Kordelschilder** sind ein eigenes Produkt, nur Kordel, keine Varianten. **Blaue** Formate: Lieferform, nicht veränderbar.
- Gestaltungsrand: laut Katalogfamilie; ist er offen oder widersprüchlich (22×14 heute 0 mm, 30×20 heute 10 mm), **als Frage an Chris melden**, nicht festlegen.

## Skalierbare Reihen (je Reihe 20 Designs)
| Nr | Reihe | Größen (Gruppe) |
|---|---|---|
| 1 | 3 : 1 | 30×10, 38×13, 56×18 (Bruchkante); 30×10 (Kordel) |
| 2 | 2 : 1 | 40×20, 60×30 (Bruchkante); 20×10 (Kordel, blau) |
| 3 | 3 : 2 | 15×10, 22×14, 30×20 (Bruchkante); 30×20 (Premium); 22×14, 30×20 (Kordel) |
| 4 | 2 : 3 | 20×30 (Bruchkante, Premium) |
| 5 | 4 : 3 | 20×15 (Premium), 40×30 (Premium, Bruchkante) |
| 6 | 3 : 4 | 15×20, 30×40 (Premium) |
| 7 | 5 : 4 | 25×20 (Kordel, blau) |
| 8 | 4 : 5 | 20×25 (Kordel, blau) |
| 9 | Quadrat | 10×10, 13×13, 16×16, 20×20, 22×22, 25×25, 30×30 (Bruchkante); 20×20 (Kordel) |
| 10 | Rund | Ø 20, 22, 28, 35,5 (Bruchkante) |
| 11 | Herz | 10×10, 20×20, 25×25 (Herz-Reihe); 10×10 (Kordel, blau) |
| 12 | Herz 24×19 | geschnitten |
| 13 | Herz 22,5×26,7 | Kordel, blau |
| 14 | Herz schief | 18×13, 26×19 (geschnitten) |
| 15 | Kreuz | 21,5×30 (geschnitten) |
| 16 | Stern | ca. 20×19 (geschnitten) – nur Sternenkinder |
| 17 | Knochen | ca. 23×10,5 (geschnitten) – nur Hunde |

## Themen und Chats (je ein Postfach)
| Chat | Reihen |
|---|---|
| Menschen | 1–15 |
| Hunde | 1–15 + 17 (Knochen) |
| Katzen | 1–15 |
| Gemischte Tiere (Pferde, Hamster, Kaninchen, Vögel …) | 1–15 |
| Sternenkinder | 1–15 + 16 (Stern) |
Kreuz (15) ausdrücklich auch bei Tieren (Chris: wird schon auf Amazon verkauft).

## Ablauf je Chat
1. **Muster zuerst:** 5 Designs in den Reihen 3 : 2, Quadrat und Rund, je auf der kleinsten und größten Größe der Reihe, als **Kontaktbogen 1:1 aus dem echten Konfigurator** (Vorlage daneben). Freigabe durch Chris.
2. Danach Reihe für Reihe bis je 20 Designs; nach jeder Reihe Kontaktbogen und Rückmeldung im Postfach.
3. Eigener Branch im Katalog `dev/schiefer-<thema>-<datum>-astra-mika`, signierte Commits. Nichts live, nichts in Shopify, Preise nur aus der Excel (fehlende Preise als offen melden).
