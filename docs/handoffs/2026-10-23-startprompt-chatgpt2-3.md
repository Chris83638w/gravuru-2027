# Startprompts für ChatGPT-Account 2 (Paket G) und 3 (Paket H) · 23.10.2026

Einstellungen (Chris: Qualität vor Kosten): beide als **Codex** (Agent mit Repo-Zugriff und Ausführung), Modell GPT-5 bzw.
stärkstes Codex-Modell, Reasoning **high**. Repos als Ordner: `gravuru-2027` (Code) und `gravuru-katalog.` (mit Punkt).
Account 2 braucht zusätzlich die gravuru-Matrixify-Skills (Ordner/Plugin „gravuru-matrixify“, Skills 01–12, 18) und den
Shopify-Vollexport `docs/handoffs/2026-10-23-shopify-edelstahl-hauptprodukte.txt` (liegt im Code-Repo).

## ChatGPT 2 · Paket G – Matrixify-Texte für neue Edelstahl-Hauptprodukte

---

Du arbeitest im Projekt gravuru 2027 der gravuru GmbH (Chris, Inhaber; Deutsch, Du, kurz). Zwei Repos liegen als Ordner
vor: Code `gravuru-2027` und Katalog `gravuru-katalog.`; Branch `main` ist jeweils die Wahrheit. Lies zuerst
`gravuru-2027/docs/handoffs/2026-10-23-delegation.md` (Abschnitt 0 Regeln, Abschnitt 2, dann Paket G), dann
`gravuru-katalog./CLAUDE.md`, `gravuru-katalog./linien/README.md` und die gravuru-Matrixify-Skills (Skill 07 Assembler ist
die Zentrale; 01 Titel, 02 Body HTML, 03 Stichpunkte/Untertitel, 04 SEO, 05 Tags, 06 Rich-Text, 10 Collections, 11
Qualitätsprüfung, 12 Handle/SKU, 08 Validator, 18 Backup-Export).

Dein Paket G: **importfertige Matrixify-Datei mit Texten für die neuen Edelstahl-Hauptprodukte** – nur Texte, Metafelder,
SEO, Tags und Collections. Varianten, Preise, SKUs und Metafeld `custom.customization_id` kommen NICHT von dir (die setzt
`shop-sync` aus dem Katalog); du legst keine Produkte an und importierst nichts.

Grundlage:
- `gravuru-katalog./linien/edelstahl-tuerschilder.json`: Unterkategorien mit `mainProducts` (96 Einträge: `id` =
  CustomizationID, `name` = Arbeitstitel, `startDesign`, `sizesOffered`, `externalIds.sku`, teils
  `externalIds.shopifyProductId`). Zielmenge: alle Hauptprodukte **ohne** `shopifyProductId` (die ohne Shop-Produkt).
- `gravuru-katalog./familien/edelstahl/steel-door-signs.json`: Material (Edelstahl gebürstet 1,5 mm, Gravur schwarz),
  Größen mit Maßen/Gewicht, Befestigungen (selbstklebend glatt/rau, 2/4 Bohrlöcher, Schrauben) – daraus kommen die Fakten
  für Texte; nichts erfinden, was dort nicht steht.
- Design je Hauptprodukt: `gravuru-katalog./designs/<reihe>/<startDesign>/design.json` (Name, Texte, Themen) und
  `design.svg`; Übersicht je Reihe `UEBERSICHT.md`. Reihe = Ordner, der die Design-Kennung enthält (z. B. `TRE-V2A-9x6-D5`
  liegt in `designs/edelstahl-gravur-90x60/`).
- `gravuru-2027/docs/handoffs/2026-10-23-shopify-edelstahl-hauptprodukte.txt`: bestehende Shop-Produkte
  (`SKU|ProduktID|Status|Handle|Preis|Varianten|customization_id|Titel`) als Stilvorbild für Titel/Handle und um Dubletten
  zu vermeiden (Skill 24 SKU-Wächter-Logik: nie einen Handle oder eine SKU erzeugen, die es schon gibt).

Vorgehen:
1. Liste der Zielprodukte aus der Linie erzeugen (Skript `scripts/matrixify-edelstahl-texte.py` im Code-Repo, Dry-run):
   je Produkt CustomizationID, Unterkategorie, Startdesign, Größe(n), Designname, Themen, Basis-SKU.
2. Je Produkt nach den Skills: Titel (01) nach gravuru-Namensformel, Handle (12) ohne Dublette, Body HTML (02, 9 Abschnitte),
   Stichpunkte + Untertitel (03), SEO Title/Description/Alt-Texte (04), Tags mit Tags Command REPLACE (05), Rich-Text-Felder
   montage/material_zusammensetzung/sicherheitshinweise (06), Collections (10). Material-/Maßangaben nur aus der Familie.
3. Qualitätsprüfung jedes Textes mit Skill 11 (Score, Mindestnote laut Skill), Validator Skill 08 ohne Blocker.
4. Ausgabe: Matrixify-XLSX `gravuru-2027/docs/handoffs/<datum>-matrixify-edelstahl-texte.xlsx` (nur Spalten für Texte,
   Metafelder, SEO, Tags, Collections; Command UPDATE über Handle, keine Variantenzeilen) + Bericht
   `<datum>-matrixify-edelstahl-texte.md` (Zähler, Score je Produkt, offene Punkte: fehlende Bilder, unklare Titel,
   Themen-Zweifel) + die Quell-JSON der Texte je Produkt (für spätere Wiederholung per Skript).
5. Branch `dev/matrixify-texte-<datum>-chatgpt2` im Code-Repo, Commit, Push; Absatz **oben** in `STATUS.md` (Datum,
   „ChatGPT 2“, Commit, Zähler), kurze Übergabe in `docs/handoffs/`. **Kein Matrixify-Import, kein Shopify-Zugriff** –
   den Import macht ein anderer Account nach Freigabe von Chris, und erst, nachdem `shop-sync` die Produkte angelegt hat.

Regeln: nichts erfinden (Maße, Material, Lieferzeiten, Zertifikate nur aus Katalog oder Skills), keine KI-Floskeln (Skill 22
Humanizer-Regeln), Deutsch mit korrekten Umlauten, keine Geheimnisse, nichts löschen, bestehende Shop-Texte nicht
überschreiben (nur Produkte ohne `shopifyProductId`). Frage Chris nur bei echten Entscheidungen (z. B. Themenzuordnung
unsicher), sonst arbeite durch und liefere Datei + Bericht.

## ChatGPT 3 · Paket H – Bestandsbögen Acryl und Kunststoff als Lieferform 2

---

Du arbeitest im Projekt gravuru 2027 der gravuru GmbH (Chris, Inhaber; Deutsch, Du, kurz). Zwei Repos liegen als Ordner
vor: Code `gravuru-2027` und Katalog `gravuru-katalog.`; Branch `main` ist jeweils die Wahrheit. Lies zuerst
`gravuru-2027/docs/handoffs/2026-10-23-delegation.md` (Abschnitt 0 Regeln, Abschnitt 2, dann Paket H), dann
`gravuru-katalog./CLAUDE.md`, `gravuru-katalog./designs/README.md` (Lieferform 2) und
`gravuru-katalog./schriften/README.md`.

Dein Paket H: **Bestandsbögen Acryl (25 Bögen) und Kunststoff (14 Bögen) als Lieferform-2-Formatreihen anlegen**, genau
so, wie es für Edelstahl schon gemacht wurde.

Vorbild Edelstahl (alles im Katalog unter `designs/`): Bestand `designs/bestand/boegen/<Bogen>/<Design>/design.json` +
`design.svg` (maschinell gelesene Bögen, je Design Texte, Motive, Platte), Formatreihen `designs/edelstahl-gravur-*/`
(je Design `design.json` + `design.svg` + ggf. `original.png`, Reihe mit `index.json` und `UEBERSICHT.md`), Protokolle
`_aenderungen.jsonl`. Werkzeuge im Code-Repo: `scripts/build-design-reihe.py` (Lieferform 2 je Formatreihe aus dem
Bestand: Master je Reihe, Übertragung auf die Familiengrößen, `sizes`, `themes`, Schriftprüfung), `scripts/read-bestand-designs.py`
(Bögen lesen; Ersatzschriften nur aus `--ersatz`), `scripts/corel-linie.py` (Linienübersicht aus Bögen). Lies deren
Docstrings; Aufrufbeispiele stehen oben in den Dateien.

Vorgehen:
1. Bestand prüfen: Welche Acryl-/Kunststoff-Bögen liegen in `designs/bestand/boegen/` schon gelesen vor (`designs.json`
   je Linie unter `designs/bestand/<linie>/`)? Fehlende Bögen nennen (Chris liefert Corel/PDF), nicht selbst „nachbauen“.
2. Familien und Linien zuordnen: Acryl → `familien/acryl/*.json` und `linien/acryl-tuerschilder.json` /
   `linien/acryl-schilder-abstandshalter.json`; Kunststoff → prüfen, ob eine Familie existiert (`familien/`), sonst als
   „Familie offen“ melden und die Reihe trotzdem anlegen, aber ohne `sizes`-Zuordnung. Formatreihe = Bogen-Seitenverhältnis
   (±1 %); alte Größen ohne passende Familiengröße als „alte Größe“ kennzeichnen, nie stillschweigend in Familien aufnehmen.
3. `build-design-reihe.py` je Reihe im Dry-run, Bericht lesen, dann schreiben: Text bleibt Text, Motive einfarbig als
   Pfade, eigene Motive bleiben beim Design (nie nach `motive/`), Schriften nur per Name aus `schriften/schriften.json`;
   Ersatz nur nach `schriften/ersatz-*.json` (entschiedene Liste), fehlende Schriften im Bericht melden, nie ersetzen.
   `themes` aus `themen.json` zuordnen; unsichere Zuordnung als `themenVorschlag` markieren. **Keine Freigabe setzen**
   (`freigabe` bleibt leer – Chris entscheidet im Design-Dashboard).
4. `python3 -I gravuru-2027/scripts/build-katalog.py --katalog gravuru-katalog.` muss ohne Fehler durchlaufen (Exit 0).
5. Bericht je Reihe (`UEBERSICHT.md` + `BERICHT.md`: Designs gesamt, übertragbar, alte Größe, fehlende Schriften, offene
   Themen). Branch `dev/bestand-acryl-kunststoff-<datum>-chatgpt3` im Katalog-Repo, Commit mit Begründung, Push; Absatz
   **oben** in `gravuru-2027/STATUS.md` (Datum, „ChatGPT 3“, Commit, Zähler) und kurze Übergabe in `docs/handoffs/`
   (eigener Branch im Code-Repo). Große Bilddateien (`original.png`, Vorschau-PNGs) bleiben laut `.gitignore` außerhalb
   von Git.

Regeln: nichts erfinden (keine Maße, Preise, Schriften, Lizenzen), nichts löschen, keine Schriftdateien hinzufügen,
Kennungen stabil (Design-IDs = Bestandskennung, Reihenordner wie bei Edelstahl `acryl-gravur-<BxH>` bzw. `kunststoff-…`),
nichts in Shopify/Plesk schreiben, keine Geheimnisse im Repo. Frage Chris nur bei echten Entscheidungen (fehlende Bögen,
unklare Familie), sonst arbeite durch und liefere Bericht + Commit.
