# Paket A · Produktfamilien · 13.10.2026

Branch `task/plugin-design-pipeline-20261013`. **Nicht installiert, nicht veröffentlicht.** Live-App, Shop und private Daten unverändert. Plan: [PLUGIN-DESIGN-STRECKE](../../../plans/PLUGIN-DESIGN-STRECKE-20261013.md), Abschnitt 5 Paket A (Teile von B).

## Was jetzt geht

Werkstatt → Verwaltung → **Produktfamilien**:
1. „Edelstahl-Türschilder (vorhandene Stammdaten) übernehmen“ legt die Familie an.
2. Formgruppe filtern, Größe anklicken → **Gestaltungsschablone** (Kontur, Bohrlöcher, 1 mm Schutzzone; reine Zeichenhilfe).
3. Größen auswählen → **Produkte erzeugen**: je Größe ein Werkstatt-Produktentwurf mit Befestigung „Ohne Bohrung“ und dem Bohrbild der Stammdaten, Grundpreis in Cent, Startdesign. Wiederholen erzeugt keine Duplikate. Nichts wird im Shop veröffentlicht.
4. **Briefing herunterladen**: ZIP mit `BRIEFING.md`, `schriften.txt`, `familie.json` und 61 Schablonen – für ein ChatGPT-Projekt „Edelstahl-Türschilder“.

## Umsetzung

| Teil | Datei |
| --- | --- |
| Bohrbild als Regel (`left-right`, `top-bottom`, `corners`, `top-center`), Löcher aus Regel berechnet, Schutzzonen, Regel aus Koordinaten nur bei exakter Reproduktion | `app/platform/sources/app/shared/models/mounting-rules.mjs` |
| Familienablage mit unveränderlichen Revisionen (SQLite-Trigger), Konfliktprüfung, Produkterzeugung über Importschlüssel `family:<id>:<sku>`, Schablone, Briefing | `app/workshop/product-families.mjs` |
| Stammdaten-Übernahme mit Gegenprüfung jedes Bohrbilds | `scripts/import-steel-family.mjs` → `app/designs/steel-door-signs/family.json` |
| Schnittstelle `/api/workshop/families…` (gleicher Sitzungs-/CSRF-Schutz) | `app/workshop/http.mjs` |
| Oberfläche, Menüpunkt | `app/workshop/ui/families.html`, `families-ui.mjs`, `index.html`, `profiles.html`, Route in `server.mjs` |

## Datengrundlage

`Chris83638w/gravuru-shopify` @ `b564422`, `platform/sources/workshop-seed/import.json` (SHA-256 in `family.json`): 61 Edelstahlschilder 1,5 mm, 5 Formgruppen, 7 Bohrbild-Regeln. **Alle 63 Bohrbilder werden von den Regeln exakt reproduziert.** Bohrung laut Stammdaten ohne Aufpreis. 13 der verwendeten Schriften sind in der Werkstatt vorhanden.

## Prüfungen

- `product-families.test.mjs` (6): Planwerte 120 × 80 (2 Löcher bei 8|40 / 112|40, 4 Löcher in den Ecken), Nutzerbeispiel Oval 90 × 60 Ø 4 / 6 mm → (6|30) und (84|30), Größenwechsel hält 6 mm, Oval + Eckbohrung abgelehnt; Stammdaten gültig; Erzeugung einmalig je Größe; Preise K00/B02; neue Familienrevision ändert erzeugte Produkte nicht; Konflikt bei veraltetem Stand; Schablone/Briefing; HTTP mit CSRF.
- `npm test`: **715/715**; Ops 55/55, Python 5/5 und 8/8.
- Browser (`scripts/check-product-families.py`, frische Daten): Übernahme, Filter, Schablone, Auswahl, Erzeugung, Briefing-Download, Editor zeigt beide Bohrlöcher bei „2 Bohrlöcher“ – PASS ([Bericht](browser.json), [Familienseite](familienseite.png), [Editor](editor-oval-9x6-b02.png)).

## Grenzen / als Nächstes

- Bearbeiten der Familie in der Oberfläche ist noch nicht gebaut (Schnittstelle mit Revisionsschutz vorhanden).
- Schutzzone wird im Konfigurator noch nicht angezeigt, Text-Hinweis fehlt noch → **Paket C**.
- Erzeugte Produkte haben ein Startdesign; die 148 vorhandenen Designs folgen mit dem Serienimport (Paket E/F).
- Größenwechsel innerhalb eines Produkts mit Bohrbild nutzt noch die alte Sperre (`steel-formats.mjs`) → Umstellung auf Regel in Paket B.
- Nur Edelstahl in dieser Version.
