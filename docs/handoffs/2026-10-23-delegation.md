# Delegation gravuru 2027 · Aufgaben, Regeln und Anweisungen für alle Accounts · 23.10.2026 12:30

Von: Claude (Operator, Fable 5.1, Account 1 – Nutzung für diese Woche fast aufgebraucht). Für: Chris und die
anderen Accounts. Chris entscheidet, Account 2 baut und prüft, die ChatGPT-Accounts liefern abgeschlossene Pakete.
Jeder Account liest zuerst diese Datei, dann [STATUS.md](../../STATUS.md) (oberster Abschnitt), dann
[AGENTS.md](../../AGENTS.md) (Code) bzw. `CLAUDE.md` im Katalog-Repo. Stand: Code `main` b60692b, Katalog `main` 0fcf3cf,
Händlerhost auf c929cf3.

## 0. Regeln für alle (verbindlich)

1. **Ein Stand.** Repos: Code `Chris83638w/gravuru-2027`, Katalog `Chris83638w/gravuru-katalog.` – jeweils `main` ist die
   Wahrheit. Arbeit nur auf eigenem Branch `dev/<thema>-<datum>-<account>` (z. B. `dev/kontur-schema-20261023-claude2`).
   Lokale Arbeitskopien zählen nicht; Ergebnisse immer committen und pushen.
2. **Nichts erfinden.** Preise, Maße, Löcher, Schriften, Lizenzen: unbekannt bleibt `null`/„offen“. Die Zeichnung ist das Maß.
   Keine Schriftdateien ohne Lizenzbeleg. Kennungen (Familien-ID, Größenschlüssel, Design-ID, SKU) sind stabil.
3. **Nichts löschen, nichts hochladen.** Live-Systeme (Shopify, Amazon, Plesk) nur lesen/exportieren. Schreibzugriffe
   (Shopify productSet, Matrixify-Import, Theme/App-Version, `katalog-import --commit`) **nur nach ausdrücklicher Freigabe
   von Chris im selben Chat**, mit Zählern (wie viele neu/aktualisiert) vorher genannt. Vor jedem Löschen Chris informieren.
4. **Katalog bleibt gültig.** Nach jeder Katalogänderung `python3 -I scripts/build-katalog.py --katalog <katalog>` aus dem
   Code-Repo (bricht bei ungültiger Familie mit Exit 1 ab); erzeugte Dateien (`KATALOG.md`, `kataloge/`) mitcommitten,
   nie von Hand ändern. Dashboard-Änderungen im Katalog-Arbeitsbaum (`_aenderungen.jsonl`) nie verwerfen.
5. **Tests.** Node ≥ 22: `node --test <geänderte Testdateien>`; bekannte Umgebungsfehler (Python-Konturpakete,
   Fertigungs-PDF) nennen, nicht „fixen“. Jede Änderung: Test oder sichtbare Prüfung. Sollwerte nie an falsches
   Verhalten anpassen.
6. **Logbuch.** Nach jedem Paket ein Absatz **oben** in `STATUS.md` (Datum, Account, Commit, Kommandos ohne Geheimnisse,
   Prüfungen, offene Grenzen, nächster Schritt). Übergaben in `docs/handoffs/<datum>-<thema>.md`. Fragen an Chris als
   GitHub-Issue in `gravuru-2027` mit Label `entscheidung` (Issue #10 ist das laufende Entscheidungs-Issue).
7. **Keine Geheimnisse** (Tokens, Secret-Pfade, Zugangsdaten) in Repo, Chat, Issues oder Logs. Firmenserver (V:/Y:): nur
   neue Dateien anlegen, nie Bestehendes überschreiben.
8. **Kurz und deutsch** mit Chris („Chris“, Du). Erst prüfen, dann melden. Masterbegriffe: „Motiv“ = einzelnes Element,
   „Design“ = ganze Gestaltung einer Platte.
9. **Modelle/Kosten.** Massenarbeit per Skript, nicht per Hand im Chat. Subagenten nur mit Briefing (Ziel, Dateien,
   Regeln, Tests, Abbruch). Reviewer je Änderung einmal.

## 1. Claude-Account 2 (Fable) – Operator für die Bauarbeit

Rolle: wie Account 1 (siehe AGENTS.md „Zusammenarbeit mehrerer Accounts“). Du vergibst die Pakete A–D an eigene günstige
Subagenten, prüfst (Reviewer + Stichprobe an der Quelle), mergst nach `main`, führst das Logbuch und holst
Entscheidungen bei Chris. Zusätzlich übernimmst du die Host-Schritte (Plesk über Chris’ Chrome) und – nach Freigabe – die
Shopify-Strecke aus [2026-10-23-upload-account-edelstahl.md](2026-10-23-upload-account-edelstahl.md).

Startprompt für Chris (zum Einfügen):
> Du bist Operator des Projekts gravuru 2027 (Repos Chris83638w/gravuru-2027 und Chris83638w/gravuru-katalog., `main`).
> Lies `docs/handoffs/2026-10-23-delegation.md`, dann `STATUS.md` (oben) und `AGENTS.md`. Arbeite die Pakete A–D in der
> Reihenfolge ab, Paket E nur nach meiner Freigabe. Entscheidungen fragst du mich kurz; Live-Uploads nie ohne mein „ja“.

### Paket A – Form „Kontur“ im Katalogschema (zuerst)

Entscheidung Chris 23.10.2026 (Issue #10, Punkt 3, Option A): freie Formen (Retro 1/2 jetzt, Kreuze/Herzen später) kommen
als eigene Form ins Familienschema; der Konfigurator folgt in Paket B.

- Dateien: `app/workshop/product-families.mjs` (SHAPES, validateFamily, geometryOf, familyGaps, Schablonen-SVG),
  `app/workshop/acrylic-artwork.mjs` (nativeContour), `app/workshop/katalog-convert.mjs` (Profilgeometrie Zeile ~287),
  Tests daneben; Katalog: `familien/edelstahl/steel-door-signs.json`, Quelle
  `zeichnungen/edelstahl-schilder-2027/geometrie.json` (Zeilen `kind: retro1|retro2`, `outline` = SVG-Pfad in mm ab 0/0,
  `holes` = feste Lochpositionen), Skript `scripts/katalog-edelstahl-serie.py` (überspringt Konturformen heute),
  Linie `linien/edelstahl-tuerschilder.json` (8 Retro-Hauptprodukte aus `linien/_inventar/FancyCustomizationIDs.csv`,
  CustomizationIDs 6400000–7100000, Skript `scripts/katalog-hauptprodukte.py`).
- Ziel: Formgruppe `shape:"contour"`; je Größe `outlinePath` (geschlossener Pfad in mm, Ursprung 0/0, Breite/Höhe =
  Pfadausdehnung ±0,05 mm) und `holesMm:[{x,y,diameterMm}]` (statt Randregel). `geometryOf` liefert den Pfad; `nativeContour`
  zeichnet ihn; Schablonen-SVG und KATALOG.md zeigen die Form; `familyGaps` meldet „Form „Kontur“ im Konfigurator noch nicht
  angeschlossen“ (wie bei `plaque`), bis Paket B fertig ist; `katalog-convert` legt den Konfi-Umriss vorerst als Rechteck
  der Pfadausdehnung an und markiert das Produkt als „gesperrt: Kontur offen“.
- Dann: `katalog-edelstahl-serie.py` erweitert (Retro-Zeilen → Größen `GR-ES-RT1-90X60-T15` …, Preise: 9×6 je 1499 ct
  (Vorgabe Chris), übrige 12 `null` = offen), `--apply`, `build-katalog.py`, 8 Retro-Hauptprodukte eintragen
  (`katalog-hauptprodukte.py` Dry-run → `--apply`), Import-Dry-run (`node --max-old-space-size=6000 scripts/katalog-import.mjs
  --katalog … --linie edelstahl-tuerschilder --alle-designs --dry-run --json …`).
- Abnahme: Familie gültig; 14 Retro-Größen + 8 Hauptprodukte im Katalog; Tests `product-families`, `katalog-convert`,
  `katalog-import`, `acrylic-artwork` grün (plus neue Tests für Kontur-Validierung und Pfad-Ausdehnung); Dry-run meldet
  Retro als „gesperrt: Kontur offen“, sonst keine neuen Fehler. Review durch Reviewer-Agent, Befunde beheben.
- Nicht: bestehende Formen ändern, Preise erfinden, Löcher aus Randregeln „berechnen“ (Kontur hat feste Löcher).

### Paket B – Kontur im Konfigurator

- Dateien: `app/configurator/variant-m/` (Vorschau/Editor, Plattenumriss, Gestaltungsfläche, Einrasten), Werkstatt-Vorschau
  (`material-presentation.mjs`, `material-preview.mjs`), Produktionsausgabe (`contour-pdf.py`, Gravur-/Kontur-Export),
  `katalog-convert.mjs` (Sperre aus Paket A aufheben).
- Ziel: Kontur aus `outlinePath` als Plattenform in Vorschau, Gestaltungsfläche (Innenversatz = `designArea.marginMm`,
  Löcher als Schutzzonen), Schablone und Produktionsdatei (Pfad 1:1 in mm). Keine zweite Geometrielogik: Vorschau, Preis
  und Produktion aus demselben Familienstand.
- Abnahme: Retro 9×6 im lokalen Konfigurator sichtbar (Screenshot), Produktions-PDF-Kontur = Zeichnung (Maßvergleich
  Breite/Höhe/Lochmitten ≤ 0,1 mm, Vergleich gegen `zeichnungen/edelstahl-schilder-2027/geometrie.json`), Tests grün,
  Dry-run: Retro-Produkte nicht mehr gesperrt. Review.

### Paket C – Import speicherschonend

- Problem: `scripts/katalog-import.mjs` Dry-run Edelstahl braucht ~6 GB Heap (624 Produkte × bis 74 Vorlagen, alles im
  Speicher + Bericht). Auf dem Host nicht tragbar.
- Ziel: je Unterkategorie/Größe planen, Vorlagen nicht doppelt halten (SVG einmal je Design), Bericht streamen; Standard-Heap
  (≤ 2 GB) reicht für die ganze Linie; gleiche Zähler wie vorher (584 neu / 40 gesperrt am 23.10. mit `--alle-designs`).
- Abnahme: Laufzeit und Spitzenspeicher im STATUS-Absatz, Tests `katalog-import.test.mjs` grün, Bericht identisch.

### Paket D – Katalog auf den Host

- Plesk (Chris’ Chrome, Domain app-2027.gravuru-designwerkstatt.de): zweites Git-Repo `gravuru-katalog.` wie beim Code-Repo
  (Deploy-Key der Domain in GitHub als Read-only-Deploy-Key – Chris trägt ihn ein), Ziel `/private/gravuru-katalog`, Modus
  manuell. Dann `GRAVURU_KATALOG=/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-katalog` in
  `gravuru-2027-merchant/app.cjs` (neben den drei vorhandenen Variablen), App im Node.js-Manager neu starten.
- Prüfung: `/werkstatt/designs/` und `/werkstatt/katalog/` zeigen Katalogdaten (hinter der Händleranmeldung im Shopify-Admin);
  Logs ohne neue Fehler. Runbook-Vorbild: `docs/plans/HOST-UMZUG-MAIN-20261023.md`; Shell-Schritte als Plesk-Aufgabe
  „Jetzt ausführen“ mit Log in `private/probe-main-20261023/NN.log`.
- Danach gibt Chris im Dashboard Designs frei (Button „Freigeben“). Ohne Freigaben plant `shop-sync` nichts.

### Paket E – Shopify-Strecke (nur nach Freigabe von Chris)

Genau nach [2026-10-23-upload-account-edelstahl.md](2026-10-23-upload-account-edelstahl.md): Export (lesend) → `shop-sync`
Dry-run mit Zählern an Chris → Freigabe wörtlich → `--apply` / `--apply --create` → Matrixify-Texte (Paket G der
ChatGPT-Accounts) → `shop-bind` → Shop-Einstieg (`ops/shopify/SHOP-EINSTIEG.md`) → bezahlte Testbestellung. Vorher sind
Chris’ offene Entscheidungen zu klären: Rund-Preise 8,5/12/16/20, Retro-Preise, 8 Hauptprodukte mit Startdesign ≠ Größe
(Katalogseite → „Bearbeiten“).

## 2. ChatGPT-Accounts – abgeschlossene Pakete per Skript

Gemeinsame Anweisungen: eigener Branch je Paket, Skripte nach `gravuru-2027/scripts/`, Daten ins Katalog-Repo, immer erst
Dry-run mit Bericht (`.md`, Zähler + Liste „offen“), dann `--apply` nur wenn Chris den Bericht gesehen hat. Nichts in
Shopify/Amazon schreiben. Ergebnis: Commit + Absatz in `STATUS.md` + kurze Übergabe in `docs/handoffs/`. Python 3.11+,
`pip install fonttools pymupdf cairosvg` falls nötig; Python-Skripte, die fremde Dateien lesen, mit `python3 -I` starten.

Startprompt (für jeden ChatGPT-Account, Paketbuchstabe einsetzen):
> Du arbeitest im Projekt gravuru 2027 (Repos Chris83638w/gravuru-2027 und Chris83638w/gravuru-katalog.). Lies
> `docs/handoffs/2026-10-23-delegation.md` Abschnitt 0 und 2, dann dein Paket. Halte dich an die Regeln; frage Chris nur
> bei echten Entscheidungen; liefere Dry-run-Bericht und Commit auf eigenem Branch.

### Paket F – Konturen aus Corel lesen (ChatGPT 1)

- Quelle: Corel/SVG-Zeichnungen der Formen (Chris nennt den Pfad; Vorbild `zeichnungen/edelstahl-schilder-2027/geometrie.json`,
  erzeugt aus `EDELSTAHL_SCHILDER_NEUE_GROESSEN_v2.svg` + Excel). Leser-Vorbild: `scripts/read-corel-plates.py`,
  `scripts/corel-linie.py`.
- Ziel: je Form/Größe eine Zeile {id, form, kind, widthMm, heightMm, outline (Pfad in mm ab 0/0, geschlossen), holes,
  thicknessMm, weightG falls bekannt, sourceNote, drawingSha256}. Zuerst alle Retro-/Kreuz-/Herz-Formen, die Chris für 2027
  will. Kalibrierung gegen Maßangaben der Zeichnung (Abweichung ≤ 0,1 mm, sonst „prüfen“).
- Abnahme: `zeichnungen/<linie>-<jahr>/geometrie.json` + `platten.md` (Tabelle), Prüfsummen, Bericht mit Abweichungen.
  Keine Preise erfinden (Preisspalte nur aus Excel von Chris, sonst `null`).

### Paket G – Matrixify-Texte für neue Edelstahl-Hauptprodukte (ChatGPT 2)

- Grundlage: `linien/edelstahl-tuerschilder.json` (96 Hauptprodukte, `externalIds`), Shopify-Export
  `docs/handoffs/2026-10-23-shopify-edelstahl-hauptprodukte.txt` (welche schon im Shop sind), gravuru-Matrixify-Skills
  (Titel, Body HTML, Stichpunkte, SEO, Tags, Collections, Validator) – Regeln der Skills gelten.
- Ziel: für Hauptprodukte **ohne** `shopifyProductId` eine importfertige Matrixify-XLSX (nur Texte/Metafelder/Collections,
  keine Varianten/Preise – die kommen aus `shop-sync`), Dry-run-Bericht, Qualitätsprüfung (Skill 11). Kein Import.
- Abnahme: XLSX + Bericht in `docs/handoffs/`, Validator ohne Blocker, Liste offener Punkte (fehlende Bilder, unklare Titel).

### Paket H – Bestandsbögen Acryl/Kunststoff als Lieferform 2 (ChatGPT 3)

- Vorbild Edelstahl: `scripts/build-design-reihe.py`, `read-bestand-designs.py`, Bestand `designs/bestand/boegen/`,
  Ersatzschriften `schriften/ersatz-tuerschilder.json`, Regeln `designs/README.md` (Text bleibt Text, Motive einfarbig,
  Master je Formatreihe, `themes`, `sizes`).
- Ziel: Formatreihen für Acryl (25 Bögen) und Kunststoff (14 Bögen) wie bei Edelstahl anlegen (`designs/<reihe>/<id>/`),
  Übersichten `UEBERSICHT.md`, Schriften nur aus `schriften.json`; fehlende Schriften melden, nie ersetzen (außer
  entschiedene Ersatzliste). Keine Freigabe setzen (`freigabe` bleibt leer – Chris entscheidet im Dashboard).
- Abnahme: `build-katalog.py` ohne Fehler, Bericht je Reihe (Designs, grün/offen, fehlende Schriften), Commit auf Branch.

## 3. Chris – was nur du kannst

- Deploy-Key des Katalog-Repos in GitHub eintragen (Paket D; Account 2 nennt dir den Schlüssel).
- Issue #10: Rund-Preise 8,5/12/16/20 und Retro-Preise (außer 9×6) nennen oder „offen“ lassen.
- Im Dashboard (`/werkstatt/designs/`) Designs prüfen und freigeben, sobald der Katalog auf dem Host ist.
- Freigaben für `katalog-import --commit` und jeden Shopify-Schreibzugriff (mit Zählern im Chat).
- Pfad der Corel-Zeichnungen für Paket F nennen.

## 4. Reihenfolge und Abhängigkeiten

A → B (Kontur), parallel C und D; E erst nach D + Freigaben + Entscheidungen. F, G, H sind unabhängig und können sofort
starten. Jedes Paket endet mit Commit, Tests, STATUS-Absatz; Account 2 merged A–D nach `main`, die ChatGPT-Branches werden
von Account 2 geprüft und gemergt (Katalogänderungen nur mit gültigem Build).
