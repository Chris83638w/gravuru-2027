# Sichtprüfung Schiefer – 04.11.2026 (Claude Schiefer)

Auftrag Chris 04.11. 15:10: „prüfe aber alle nochmal … übernehme auch unsere Designs aus dem Katalog 1:1“.

- `katalog-1zu1/` – Kontaktbögen der neuen 1:1-Reihen (Katalog #181), **Stand nach den Korrekturen**, nur angebotene Designs.
- `reihen/` – Kontaktbögen aller übrigen Schiefer-Reihen in einer repräsentativen Größe, **Stand vor den Korrekturen** (Grundlage der Befunde).
- `befund-katalog.tsv`, `befund-reihen.tsv` – Befunde der Prüfer (Reihe, Kennung, sperren/korrigieren, Grund).

Umsetzung: Katalog #177 / #178 / #181 (Commit „Sichtprüfung aller Reihen – Korrekturen“), Befunde zu #176 an Astra in #85.
Werkzeuge: `scripts/schiefer-designs/vergroessern.py` (ganze Gestaltung), `vergroessern_ebene.py` (einzelne Motive), `nachziehen.py` (einpassen).
Freigabe bleibt bei Chris.
