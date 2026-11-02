# Firmen- und Praxisschilder (Edelstahl-Türschilder + Acryl 3 mm) – Abschlussbericht

Auftrag: gravuru-2027 Issue #122 · Katalog-Branch `dev/firmenschilder-fertig-20261101` · 02.11.2026 (Neustart nach Stopp; Vorgänger hatte nichts committet)
Acryl 3 mm schwarz/anthrazit nutzt dieselben Designs (Ziele `acryl-3mm-tuerschilder-schwarz/-anthrazit` offen, Freigabe nur Chris).

## Inventur vorher/nachher (Thema `firmenschilder`, angeboten)
| Formatreihe | vorher | nachher | davon Signature | Designs je Größe |
|---|---|---|---|---|
| 50x20 | 0 | 4 | 0 | 5 × 2: 4 |
| 60x20 | 0 | 4 | 0 | 6 × 2: 4 |
| 70x23 | 0 | 4 | 0 | 7 × 2: 4 |
| 80x20 | 0 | 4 | 0 | 8 × 2: 4 |
| 80x35 | 0 | 4 | 0 | 8 × 3,5: 4 · 12 × 5,25: 4 · 16 × 7: 4 · 24 × 10,5: 4 · 32 × 14: 4 · 40 × 17,5: 4 |
| 90x30 | 0 | 4 | 0 | 9 × 3: 4 · 12 × 4: 4 · 15 × 5: 4 · 18 × 6: 4 · 21 × 7: 4 · 24 × 8: 4 · 27 × 9: 4 |
| oval-120x40 | 0 | 4 | 0 | 12 × 4: 4 · 15 × 5: 4 · 18 × 6: 4 · 21 × 7: 4 · 24 × 8: 4 · 27 × 9: 4 · 30 × 10: 4 |
| 80x53 | 0 | 11 | 3 | 8 × 5: 6 · 9 × 6: 6 · 12 × 8: 10 · 15 × 10: 11 · 18 × 12: 11 · 21 × 14: 11 · 24 × 16: 11 · 30 × 20: 11 · 42 × 28: 11 · 45 × 30: 11 |
| ab-80x53 | 0 | 11 | 3 | 8 × 5: 6 · 9 × 6: 6 · 12 × 8: 10 · 15 × 10: 11 · 18 × 12: 11 · 21 × 14: 11 · 24 × 16: 11 · 30 × 20: 11 · 42 × 28: 11 · 45 × 30: 11 |
| retro1-90x60 | 0 | 10 | 3 | 9 × 6: 6 · 12 × 8: 9 · 15 × 10: 10 · 18 × 12: 10 · 21 × 14: 10 · 24 × 16: 10 · 30 × 20: 10 |
| retro2-91x61 | 0 | 10 | 3 | 9 × 6: 6 · 12 × 8: 9 · 15 × 10: 10 · 18 × 12: 10 · 21 × 14: 10 · 24 × 16: 10 · 30 × 20: 10 |
| oval-90x60 | 0 | 10 | 3 | 9 × 6: 6 · 12 × 8: 8 · 15 × 10: 10 · 18 × 12: 10 · 21 × 14: 10 · 24 × 16: 10 · 30 × 20: 10 |
| oval-150x80 | 0 | 10 | 3 | 30 × 16: 10 · 15 × 8: 8 · 22,5 × 12: 10 |
| 80x80 | 0 | 12 | 3 | 8 × 8: 7 · 10 × 10: 9 · 12 × 12: 10 · 16 × 16: 11 · 20 × 20: 12 · 26 × 26: 12 · 30 × 30: 12 |
| 65x65-rund | 1 | 5 | 0 | 6,5 × 6,5: 5 · 8,5 × 8,5: 5 · 12 × 12: 5 · 16 × 16: 5 · 20 × 20: 5 |

**Jede Größe der Linie hat jetzt mindestens 1 Firmen-/Praxisschild** (kleinste Größen: mindestens 4). Ziel 8 Designs je Reihe ab 9×6 erreicht (Retro 1/2, Oval 9×6, Oval 15×8: 10; Quadrat: 12; 8×5 und abg. Ecken: 11), unter 9×6 je 4 (Rund 5 mit D74).
Designs mit viel Text (Öffnungszeiten) werden erst ab der Größe angeboten, auf der jede Zeile ≥ 3 mm Versalhöhe hat (`hinweisGroessen` in design.json).

## Neue Designs (D550–D562)
| D | Name | Modus | Formatreihen | Schriften | Motiv |
|---|---|---|---|---|---|
| D550 | Praxis · Dr. med. Lena Hartwig, feine Linie | neu | 15 | Cormorant Garamond, Montserrat Light | Linie 0,3 mm |
| D551 | Kanzlei Brandt · Waage | neu | 15 | Cinzel, Libre Baskerville | motive/berufe-und-gewerbe/anwalt-kanzlei-justiz-2.svg |
| D552 | Haustechnik Wendt · Werkzeug | neu | 15 | Roboto Slab, Lato | motive/berufe-und-gewerbe/handwerk-werkstatt-reparatur-1.svg |
| D553 | NORDLICHT · Studio, Linie bis an den Rand | neu | 15 | Michroma, Raleway | Linie 0,3 mm bis an den Rand |
| D554 | Praxis Dr. Kellner · Internist (Äskulapstab, Sprechzeiten) | 1:1 Bestand FS-V2A-D15 | Quadrat (ab 20×20) | Michroma | Corel-Motiv (beim Design) |
| D555 | Bergholz GmbH · Heizung/Sanitär, Schraubenschlüssel | 1:1 FS-D20 (Quadrat, 8×5, abg. Ecken) / Referenz (Retro, Ovale) | 7 | Antic Slab | Corel-Motiv |
| D556 | Kortmann GmbH · Heizung – Sanitär, Rohrleitung | 1:1 FS-D22 / Referenz | 7 | Roboto Slab | Corel-Motiv, Rohr als **Umriss** (Schwarzflächen-Regel) |
| D557 | Immobilienmakler Heimann GmbH · Haus mit Lupe | 1:1 FS-D23 / Referenz | 7 | Bellefair | Corel-Motiv (Kontur als Fläche) |
| D558 | Anwaltskanzlei · Paragrafen | 1:1 FS-D7 | Quadrat, 8×5, abg. Ecken (ab 15×10 / 16×16) | Cinzel | Corel-Motiv |
| ★ D560 | Signature · Monogramm-Siegel im feinen Ring (Albers & Partner) | neu | 7 | Cinzel, Cormorant Garamond, Montserrat Light | motive-eigene/firmenschilder/siegel-ring.svg |
| ★ D561 | Signature · ATELIER senkrecht an der Kante, feine senkrechte Linie (Sommerfeld) | neu | 7 | Bellefair, Raleway, Montserrat Light | Linie 0,3 mm |
| ★ D562 | Signature · BAU/WERK groß, senkrechte Linie, Spalte rechts | neu | 7 | Bebas Neue, Josefin Sans | Linie 0,3 mm |

Abweichungen je Design stehen in `design.json → deviations` (u. a. Beispielnamen/Telefonnummern erfunden statt Corel-Beispieldaten, Tippfehler „Öffnungzeiten“ korrigiert, einzelne Zeilen wegen breiterer Katalogschrift minimal verkleinert, Rohr als Umriss).
Signature-Designs: 7 Reihen ab 9×6-Fläche (8×5, abg. Ecken, Retro 1/2, Oval 9×6, Oval 15×8, Quadrat); auf Streifen/Langformaten bewusst nicht.

## Bestand `designs/bestand/firmenschilder/` (27 Designs D0–D26, je bis 4 Bögen)
In Lieferform 2 übernommen: D7, D15, D20, D22, D23 (als D558, D554, D555, D556, D557).
Noch offen (nicht übernommen, Grund): D1, D16 (Baskerville Old Face fehlt, kein Ersatz in der Tabelle) · D4 (Futura Md BT fehlt) · D5 (Schrift „kindergarten“ entfernt) · D12, D14 (Bauhaus 93/BOLICA fehlen) · D13 (Century751 BT fehlt; Skyline große Füllfläche) · D17, D25 (Abuget fehlt) · D19 (Castellar fehlt) · D9, D26 (großer gefüllter Blitz bzw. viele Kleinsymbole – nach Schwarzflächen-Regel umzuarbeiten) · D24 (gefüllter Teller, Negativfläche) · D8 (Comic Sans→Comic Neue, großes gefülltes Kreuz) · D2, D6, D11, D21 (Foto-/Logo-Platzhalter im Corel-Bogen) · D3, D10 (Arial/Times – übernehmbar, nächste Runde) · D18 (Bestatter, übernehmbar) · D0 (Yoga, UV-Paket) · D1/D26 Dubletten-Nähe zu D9.

## Startdesign-Vorschlag (Hauptbild/Platz 1)
**D550 in der Reihe 8×5 (Vorschau 30×20)**: klassisches Praxisschild, in allen 15 Formatreihen und allen Größen verfügbar, rein typografisch (kein branchenfremdes Motiv), ruhig und groß lesbar – passt für Ärzte, Kanzleien und Büros gleichermaßen. Platz 2: Signature D560 (Monogramm-Siegel) als Blickfang.

## Offene Fragen an Chris
1. **Logo-Platzhalter:** Firmen wollen oft ihr Logo. Soll es für Edelstahl-Gravur einen Logo-Upload/Platzhalter geben? Nicht gebaut (keine Regel vorhanden).
2. Fehlende Bestandsschriften (Baskerville Old Face, Futura, Bauhaus 93, Abuget, Castellar, Century751): Ersatz festlegen, dann können D1, D4, D12–D14, D16, D17, D19, D25 übernommen werden.
3. Retro 2: Die Vorschau meldet bei allen Designs der Reihe „Seitenverhältnis weicht um 1,5 % ab (eingepasst)“ (Master 90,6 × 61,3 mm gegenüber 9 × 6 cm) – betrifft die ganze Reihe, nicht nur diese Designs.

## Selbstprüfung (DESIGN-MASTER)
- Kein Schild ohne Text; Name jeweils zuerst und am größten (Ausnahme 1:1-Originale D557/D558: Firmenart und Name gleich groß wie in der Vorlage).
- Motive nie verzerrt; Corel-Motive bleiben beim Design; keine großen Schwarzflächen (Rohr als Umriss, Bibliotheksmotive Linie/Kontur, Tinte ≤ 27 % der Motivbox).
- Unter 9×6 nur Standardpiktogramme (Waage, Werkzeug) oder reine Typografie.
- Jede Zeile ≥ 3 mm Versalhöhe auf der kleinsten angebotenen Größe (geprüft mit echten Schriftkonturen); Konfi-Textkasten und Builder-Rand geprüft, Passung „passt“ (ohne Befestigung).
- Freiflächen: neue Designs und Referenzen als Gruppe mittig eingepasst und gemessen (Tabelle unten); 1:1-Originale unverändert (Ausnahme §7).
- Ehrlich: D555-Referenz (Retro/Oval) hat kleine Info-Zeilen und ist erst ab 15×10 bzw. 18×12 verfügbar; D554 nur Quadrat ab 20×20. D562 im Quadrat bewusst schmaler Block (Gruppe mittig).

## Freiflächen-Messung (flaeche-messen.py, alle 107 Platten der 15 Bögen)
Alle neuen Designs und Referenzen: ok (Versatz ≤ 3 %, Fläche ≥ 30 %, Querformat Höhe ≥ 45 %). Abweichungen nur bei unveränderten 1:1-Originalen (Ausnahme §7).

| Formatreihe | Nr. | Design | Breite | Höhe | Fläche | Versatz x | Versatz y | Befund |
|---|---|---|---|---|---|---|---|---|
| 50x20 | 1 | D550 | 79 % | 77 % | 61 % | +0.3 % | -0.3 % | ok |
| 50x20 | 2 | D551 | 87 % | 51 % | 44 % | +0.1 % | +0.3 % | ok |
| 50x20 | 3 | D552 | 88 % | 62 % | 55 % | +0.0 % | +0.3 % | ok |
| 50x20 | 4 | D553 | 95 % | 63 % | 59 % | +0.0 % | -0.3 % | ok |
| 60x20 | 1 | D550 | 65 % | 78 % | 51 % | +0.2 % | -0.1 % | ok |
| 60x20 | 2 | D551 | 87 % | 62 % | 54 % | +0.1 % | +0.3 % | ok |
| 60x20 | 3 | D552 | 88 % | 75 % | 66 % | +0.0 % | +0.3 % | ok |
| 60x20 | 4 | D553 | 95 % | 73 % | 69 % | +0.0 % | +0.0 % | ok |
| 70x23 | 1 | D550 | 86 % | 76 % | 66 % | +0.3 % | +0.0 % | ok |
| 70x23 | 2 | D551 | 87 % | 63 % | 55 % | +0.1 % | +0.6 % | ok |
| 70x23 | 3 | D552 | 88 % | 75 % | 66 % | +0.0 % | +0.6 % | ok |
| 70x23 | 4 | D553 | 95 % | 72 % | 68 % | +0.0 % | +0.0 % | ok |
| 80x20 | 1 | D550 | 84 % | 82 % | 68 % | +0.2 % | +0.8 % | ok |
| 80x20 | 2 | D551 | 81 % | 78 % | 64 % | +0.2 % | +0.8 % | ok |
| 80x20 | 3 | D552 | 68 % | 78 % | 53 % | +0.0 % | +0.4 % | ok |
| 80x20 | 4 | D553 | 96 % | 82 % | 79 % | -0.0 % | +0.0 % | ok |
| 80x35 | 1 | D550 | 87 % | 76 % | 67 % | -0.0 % | +0.4 % | ok |
| 80x35 | 2 | D551 | 87 % | 59 % | 51 % | +0.1 % | +0.5 % | ok |
| 80x35 | 3 | D552 | 87 % | 74 % | 64 % | -0.6 % | -0.5 % | ok |
| 80x35 | 4 | D553 | 96 % | 52 % | 50 % | +0.0 % | +0.2 % | ok |
| 90x30 | 1 | D550 | 86 % | 60 % | 51 % | +0.3 % | +0.3 % | ok |
| 90x30 | 2 | D551 | 88 % | 78 % | 68 % | +0.2 % | +0.0 % | ok |
| 90x30 | 3 | D552 | 72 % | 80 % | 58 % | -0.5 % | -0.6 % | ok |
| 90x30 | 4 | D553 | 96 % | 69 % | 66 % | +0.0 % | +0.0 % | ok |
| oval-120x40 | 1 | D550 | 80 % | 54 % | 43 % | +0.2 % | +0.0 % | ok |
| oval-120x40 | 2 | D551 | 71 % | 64 % | 46 % | +0.1 % | +0.3 % | ok |
| oval-120x40 | 3 | D552 | 63 % | 72 % | 45 % | -0.3 % | -0.4 % | ok |
| oval-120x40 | 4 | D553 | 97 % | 61 % | 59 % | +0.0 % | -0.3 % | ok |
| 80x53 | 1 | D550 | 87 % | 50 % | 43 % | +0.0 % | +0.1 % | ok |
| 80x53 | 2 | D551 | 86 % | 57 % | 49 % | +0.1 % | +0.6 % | ok |
| 80x53 | 3 | D552 | 86 % | 66 % | 56 % | -0.1 % | +0.2 % | ok |
| 80x53 | 4 | D553 | 96 % | 55 % | 52 % | +0.0 % | +0.0 % | ok |
| 80x53 | 5 | D555 | 92 % | 84 % | 78 % | +2.3 % | +3.5 % | PRÜFEN: senkrecht +4 % – 1:1-Original unverändert (§7 Ausnahme) |
| 80x53 | 6 | D556 | 98 % | 88 % | 87 % | +0.0 % | +2.4 % | ok |
| 80x53 | 7 | D557 | 95 % | 90 % | 86 % | +1.1 % | +2.1 % | ok |
| 80x53 | 8 | D558 | 93 % | 82 % | 76 % | +0.1 % | +1.2 % | ok |
| 80x53 | 9 | D560 | 89 % | 66 % | 59 % | -0.0 % | +0.0 % | ok |
| 80x53 | 10 | D561 | 84 % | 56 % | 47 % | +1.3 % | -0.8 % | ok |
| 80x53 | 11 | D562 | 87 % | 47 % | 41 % | -0.1 % | +0.0 % | ok |
| ab-80x53 | 1 | D550 | 87 % | 50 % | 43 % | +0.0 % | +0.1 % | ok |
| ab-80x53 | 2 | D551 | 86 % | 57 % | 49 % | +0.1 % | +0.6 % | ok |
| ab-80x53 | 3 | D552 | 86 % | 66 % | 56 % | -0.1 % | +0.2 % | ok |
| ab-80x53 | 4 | D553 | 96 % | 55 % | 52 % | +0.0 % | +0.0 % | ok |
| ab-80x53 | 5 | D555 | 92 % | 84 % | 78 % | +2.3 % | +3.5 % | PRÜFEN: senkrecht +4 % – 1:1-Original unverändert (§7 Ausnahme) |
| ab-80x53 | 6 | D556 | 98 % | 88 % | 87 % | +0.0 % | +2.4 % | ok |
| ab-80x53 | 7 | D557 | 95 % | 90 % | 86 % | +1.1 % | +2.1 % | ok |
| ab-80x53 | 8 | D558 | 93 % | 82 % | 76 % | +0.1 % | +1.2 % | ok |
| ab-80x53 | 9 | D560 | 89 % | 66 % | 59 % | -0.0 % | +0.0 % | ok |
| ab-80x53 | 10 | D561 | 84 % | 56 % | 47 % | +1.3 % | -0.8 % | ok |
| ab-80x53 | 11 | D562 | 87 % | 47 % | 41 % | -0.1 % | +0.0 % | ok |
| retro1-90x60 | 1 | D550 | 87 % | 56 % | 49 % | +0.0 % | -0.1 % | ok |
| retro1-90x60 | 2 | D551 | 86 % | 55 % | 47 % | +0.1 % | +0.4 % | ok |
| retro1-90x60 | 3 | D552 | 86 % | 65 % | 56 % | -0.2 % | +0.0 % | ok |
| retro1-90x60 | 4 | D553 | 96 % | 53 % | 50 % | +0.0 % | +0.0 % | ok |
| retro1-90x60 | 5 | D555 | 89 % | 47 % | 42 % | +0.0 % | -0.5 % | ok |
| retro1-90x60 | 6 | D556 | 89 % | 78 % | 70 % | +0.0 % | +0.2 % | ok |
| retro1-90x60 | 7 | D557 | 89 % | 61 % | 54 % | +0.0 % | +0.0 % | ok |
| retro1-90x60 | 8 | D560 | 89 % | 66 % | 58 % | -0.1 % | -0.2 % | ok |
| retro1-90x60 | 9 | D561 | 84 % | 56 % | 47 % | +1.3 % | -1.1 % | ok |
| retro1-90x60 | 10 | D562 | 87 % | 47 % | 41 % | -0.1 % | -0.2 % | ok |
| retro2-91x61 | 1 | D550 | 86 % | 55 % | 47 % | -0.1 % | -0.2 % | ok |
| retro2-91x61 | 2 | D551 | 85 % | 55 % | 46 % | +0.0 % | +0.5 % | ok |
| retro2-91x61 | 3 | D552 | 85 % | 64 % | 55 % | -0.1 % | -0.2 % | ok |
| retro2-91x61 | 4 | D553 | 90 % | 52 % | 46 % | +0.0 % | -0.1 % | ok |
| retro2-91x61 | 5 | D555 | 88 % | 47 % | 41 % | -0.1 % | -0.5 % | ok |
| retro2-91x61 | 6 | D556 | 88 % | 77 % | 68 % | +0.0 % | +0.2 % | ok |
| retro2-91x61 | 7 | D557 | 88 % | 60 % | 53 % | +0.0 % | +0.2 % | ok |
| retro2-91x61 | 8 | D560 | 88 % | 65 % | 57 % | +0.1 % | +0.0 % | ok |
| retro2-91x61 | 9 | D561 | 83 % | 55 % | 45 % | +1.3 % | -1.1 % | ok |
| retro2-91x61 | 10 | D562 | 86 % | 46 % | 40 % | -0.1 % | -0.2 % | ok |
| oval-90x60 | 1 | D550 | 81 % | 53 % | 43 % | -0.1 % | +0.2 % | ok |
| oval-90x60 | 2 | D551 | 80 % | 53 % | 43 % | +0.1 % | +0.3 % | ok |
| oval-90x60 | 3 | D552 | 72 % | 65 % | 47 % | -0.1 % | +0.2 % | ok |
| oval-90x60 | 4 | D553 | 96 % | 51 % | 49 % | +0.0 % | -0.2 % | ok |
| oval-90x60 | 5 | D555 | 85 % | 46 % | 39 % | +0.1 % | -0.6 % | ok |
| oval-90x60 | 6 | D556 | 73 % | 65 % | 47 % | +0.0 % | +0.2 % | ok |
| oval-90x60 | 7 | D557 | 80 % | 56 % | 45 % | +0.1 % | +0.2 % | ok |
| oval-90x60 | 8 | D560 | 78 % | 58 % | 45 % | +0.0 % | -0.2 % | ok |
| oval-90x60 | 9 | D561 | 80 % | 53 % | 43 % | +1.2 % | -1.0 % | ok |
| oval-90x60 | 10 | D562 | 86 % | 46 % | 40 % | -0.1 % | -0.2 % | ok |
| oval-150x80 | 1 | D550 | 76 % | 62 % | 47 % | +0.0 % | +0.3 % | ok |
| oval-150x80 | 2 | D551 | 75 % | 61 % | 46 % | +0.1 % | +0.6 % | ok |
| oval-150x80 | 3 | D552 | 64 % | 73 % | 47 % | -0.2 % | +0.1 % | ok |
| oval-150x80 | 4 | D553 | 97 % | 59 % | 57 % | -0.0 % | +0.0 % | ok |
| oval-150x80 | 5 | D555 | 81 % | 55 % | 44 % | +0.1 % | -0.4 % | ok |
| oval-150x80 | 6 | D556 | 66 % | 73 % | 48 % | +0.0 % | +0.2 % | ok |
| oval-150x80 | 7 | D557 | 74 % | 65 % | 48 % | -0.1 % | +0.0 % | ok |
| oval-150x80 | 8 | D560 | 72 % | 67 % | 48 % | +0.0 % | +0.0 % | ok |
| oval-150x80 | 9 | D561 | 75 % | 62 % | 47 % | +1.2 % | -1.1 % | ok |
| oval-150x80 | 10 | D562 | 82 % | 56 % | 45 % | -0.1 % | +0.0 % | ok |
| 80x80 | 1 | D550 | 68 % | 80 % | 54 % | +0.2 % | +0.3 % | ok |
| 80x80 | 2 | D551 | 74 % | 84 % | 62 % | +0.3 % | +0.8 % | ok |
| 80x80 | 3 | D552 | 56 % | 85 % | 48 % | -0.3 % | +0.5 % | ok |
| 80x80 | 4 | D553 | 96 % | 49 % | 47 % | -0.0 % | +0.1 % | ok |
| 80x80 | 5 | D554 | 93 % | 80 % | 75 % | +0.7 % | +6.4 % | PRÜFEN: senkrecht +6 % – 1:1-Original unverändert (§7 Ausnahme) |
| 80x80 | 6 | D555 | 95 % | 77 % | 73 % | +1.5 % | +5.5 % | PRÜFEN: senkrecht +5 % – 1:1-Original unverändert (§7 Ausnahme) |
| 80x80 | 7 | D556 | 99 % | 77 % | 76 % | +0.0 % | +2.5 % | ok |
| 80x80 | 8 | D557 | 92 % | 78 % | 72 % | -0.2 % | +2.7 % | ok |
| 80x80 | 9 | D558 | 94 % | 67 % | 63 % | +0.0 % | +4.9 % | PRÜFEN: senkrecht +5 % – 1:1-Original unverändert (§7 Ausnahme) |
| 80x80 | 10 | D560 | 57 % | 85 % | 49 % | +0.3 % | -0.1 % | ok |
| 80x80 | 11 | D561 | 83 % | 52 % | 43 % | +1.6 % | -1.0 % | ok |
| 80x80 | 12 | D562 | 43 % | 86 % | 37 % | -0.2 % | -0.1 % | ok |
| 65x65-rund | 1 | D74 | 56 % | 63 % | 35 % | +0.2 % | +2.6 % | ok |
| 65x65-rund | 2 | D550 | 78 % | 57 % | 44 % | +0.4 % | +0.3 % | ok |
| 65x65-rund | 3 | D551 | 77 % | 57 % | 44 % | +0.3 % | +0.7 % | ok |
| 65x65-rund | 4 | D552 | 72 % | 64 % | 46 % | +0.0 % | +0.4 % | ok |
| 65x65-rund | 5 | D553 | 96 % | 39 % | 38 % | +0.2 % | +0.0 % | ok |

Entwurfs-PR Katalog: https://github.com/Chris83638w/gravuru-katalog./pull/142
