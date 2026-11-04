# Schiefer-Tafeln – Erzeugung der Prüfseite, Konturen und Liste

Erzeugt aus den finalen Quellen die Seite „Schiefer-Tafeln“ (alle 48 Tafeln 1:1, blaue Haarlinie, Lochbilder mit Lochabstand Mitte–Mitte und Lochmitte–Rand, Preise) und die vier Kontur-SVGs je Kategorie.

Quellen (nichts schätzen):
- `docs/handoffs/design-start-mika/schiefer/` – Zeichnung `Gedenktafeln_Schiefer.svg`, `konturen-und-loecher.json`, Excel `Schiefer-Gedenktafeln-Groessen-2026-10-29.xlsx` (Spalte M = Lochbild)
- Katalog `preise/preise-chris-20261102.json` (`schiefer`, `schieferOptionen`) und `auftraege/2026-10-31-menschen-schiefer/*/produkt-geometrien.json` (korrigierte Herzkonturen)

Aufruf (Arbeitsordner mit `art/boegen/` = Kontaktbögen aus dem Katalog-Auftrag):
```
SCHIEFER_WORK=<arbeitsordner> GRAVURU_KATALOG=<gravuru-katalog> python3 tools/schiefer-tafeln/schiefer-html.py      # -> art/schiefer-tafeln.html + art/seed-tafeln.json
SCHIEFER_WORK=<arbeitsordner> GRAVURU_KATALOG=<gravuru-katalog> python3 tools/schiefer-tafeln/schiefer-haar-kat.py  # -> schiefer-1..4-*.svg
```
Regeln von Chris (03.11.): Kategorien Premium / Geschnitten (inkl. 7×2, 8×3,5, 8×5) / Naturschiefer mit Bruchkante (inkl. Herz-Reihe) / Kordelschilder (Bruchkante); Abstandshalter 12 mm breit; alles blaue Haarlinie, Originalgröße.
