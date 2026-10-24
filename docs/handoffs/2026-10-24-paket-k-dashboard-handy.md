# Paket K · Design-Dashboard auf dem Handy nutzbar · 24.10.2026

Für **Astra High** (Codex, GPT-5, Reasoning high). Basis: Code `main` (≥ 7901144), Katalog `main` (≥ 27d46be).
Anlass: Chris will die Startdesigns auch am Handy prüfen und freigeben (Chrome auf Android, admin.shopify.com,
eingebettete App). Heute geht das nicht. Zwei Befunde von Claude, beide an der Quelle belegt:

1. **Layout:** Ab ≤ 1100 px stehen die Filterlisten (Linie, Formatreihe/Bogen mit rund 40 Einträgen, Material)
   als `aside` **über** der Designliste (`design-dashboard.css`, Zeile mit `@media(max-width:1100px)`). Ein Tippen
   filtert zwar, aber die Liste liegt weit unterhalb des Bildschirms. Chris' Screenshot: „Egal wo ich drauf drücke,
   es öffnet sich nichts.“ In der Tabelle liegen außerdem „Auswählen/Freigeben“ rechts außerhalb des Bildschirms.
2. **Schriften:** `design.svg` enthält Texte als `<text font-family="…"><tspan x dy>…</tspan></text>` (780 Designs,
   1772 Textelemente; `text-anchor` start/middle/end, vereinzelt `letter-spacing`). Die Vorschau zeigt die echte
   Schrift nur, wenn sie auf dem Gerät installiert ist (Chris' PC). Auf dem Handy erscheint eine Ersatzschrift, und
   damit ist die Prüfung „Texte und Schriften“ dort wertlos.

---

Du bist Programmierer im Projekt gravuru 2027 (Chris, Inhaber; Deutsch, Du, kurz). Boss ist Claude: Er prüft und
merged. Branch `dev/dashboard-handy-20261024-astra`, PR gegen `main`, Bericht im PR und Absatz oben in `STATUS.md`.

**Ziel A – Vorschau mit echten Schriften auf jedem Gerät.** `/api/workshop/designs/svg` liefert SVG-Dateien mit
Texten als Glyphenpfaden aus den Katalogschriften. Gleiche Glyphendaten wie Fit-Prüfung und Produktion
(`katalog.fontResources` + `convertFont`); prüfe, ob die Produktion Kerning/Laufweite anders setzt, und gleiche die
Vorschau daran an. Unterstützt werden `text-anchor`, `tspan x/dy`, `letter-spacing` und `fill`. Fehlt eine Schrift
oder ein Zeichen, bleibt der `<text>` stehen und die Antwort bekommt einen Hinweis-Header. Nichts erfinden, kein
Ersatz. Cache je Datei-Prüfsumme + Schriftstand (begrenzt). Kalt- und Warmzeit im Bericht. Keine Änderung an den
Katalogdateien. PNG bleibt unverändert. Gilt für Vorschaubild und Vorschau-Dialog gleichermaßen; Token-Weg,
`acrylRoute` und CSP bleiben unverändert.

**Ziel B – Handy-Layout.** Unter 1100 px: Die Designliste kommt zuerst. Die Filter sind einklappbar (z. B. ein
Knopf „Filter“, standardmäßig zu) oder kompakt als Auswahlfelder. Nach einer Filterwahl springt die Seite zur
Liste. Unter 640 px gilt standardmäßig die Ansicht „Kacheln“: Vorschau öffnen, Auswählen und Freigeben müssen ohne
seitliches Scrollen erreichbar sein, Tippflächen ≥ 44 px. Vorschau- und Bestätigungsdialog passen auf 360 px Breite.
Die Desktop-Ansicht bleibt unverändert.

**Abnahme:** Tests für die Text→Pfad-Umwandlung (Anker start/middle/end, mehrzeilig über `tspan`, `letter-spacing`,
fehlende Schrift/fehlendes Zeichen), Routentest (eingebettet mit Token, SVG enthält keine `<text>` mehr, wenn alle
Schriften da sind), bestehende Dashboard-, UI-, Medien-, Admin-Host- und Routingtests grün. Playwright-Screenshots
im PR: iPhone 13 und Pixel 7 (Liste, geöffnete Vorschau mit echten Schriften, Bestätigungsdialog) sowie Desktop
1280 px unverändert. Stichprobe D57 und TR2-D12: Vorschau-Text deckungsgleich mit dem Paket-J-Kontaktblatt.

Regeln wie immer: keine Freigabe setzen, keine Katalogdaten ändern, keine Live-Systeme, kein Merge, kein
Force-Push, LF-Zeilenenden, keine Schriftdateien ins Code-Repo.
