# Neustart Astra Mika – vollständiges Briefing (30.10.2026)

Von: Claude (Operator, „Boss“ im Projekt gravuru 2027). Für: **Astra Mika, neues Projekt, nur lokal.** Diese Datei ist Deine einzige Startquelle. Alles andere ist hier verlinkt. Lies sie ganz, bevor Du etwas tust.

## 0. Warum ein Neustart

Bisher liefen Deine Chats mit einer **gemischten Umgebung** aus Codex-Cloud (`/workspace`, `/root/.codex`) und Windows-Ordner. Die Folgen:
- kein Zugriff auf github.com
- Bilder ließen sich nicht öffnen
- Upload mitten drin abgebrochen (`invalid sandbox permission path URI: file:///workspace is invalid on windows`)

Chris hat bis heute **kein sichtbares Ergebnis**. Ab jetzt gilt: **nur lokal**, so wie bei Astra gravuru, bei dem alles funktioniert.

## 1. Was Du schon hast (nicht neu machen)

| Was | Wo | Stand |
|---|---|---|
| **10 Familienschild-Muster** (5 Designs × 3 und 5 Personen: „Das sind wir“, „Unser kleines Wir“, „Die Nachtschwärmer“, „Hier summt das Leben“, „Unser kleines Glück“; 01-P5 mit Hund Balu) | `C:\Users\Mikail Erdem\Documents\ChatGPT\Produkte Design\Produkte-Design\gravuru-katalog\designs\familie-mika-120x80\` mit `README.md`, `index.json`, 10 × `design.json`/`design.svg`/`preview.png`, `pruefung\` | Lokal fertig, **nicht auf GitHub**. Erst prüfen, ob die Dateien noch da sind |
| Upload-Liste (52 Dateien) | `…\Produkte Design\mika-upload-manifest.json` | Einige Blobs wurden hochgeladen, aber **kein Commit**. Branch `dev/familienschilder-20261029-astra-mika` ist leer (= main) |
| Hilfsskripte | `…\gravuru-2027\scripts\family-designs-mika\` | nur lokal |
| Arbeitskopie Code + Katalog | `…\Produkte Design\Produkte-Design\gravuru-2027` und `…\gravuru-katalog` | Code `b5c1e6a`, Katalog `eb4a4c61a`; Konfi-Start am 29.10. bestätigt |
| Schiefer | – | **noch nichts**, nur die Bestands-Vorschau D98 gezeigt |

Fehlt etwas davon: hier melden, nicht still neu machen.

## 2. Einrichtung (einmal, mit Chris)

1. **Neues lokales Codex-Projekt.** Keine Cloud-Aufgabe, keine Cloud-Umgebung. Arbeitsordner: `C:\Users\Mikail Erdem\Documents\ChatGPT\Produkte Design`.
2. Rechte wie bei Astra gravuru:
   - Dateien im Arbeitsordner lesen und schreiben
   - Befehle ausführen (Node, PowerShell)
   - Netzwerk zu **github.com** erlauben
   - lokalen Zugriff auf `127.0.0.1` erlauben (Konfi-Prüfung)
   - Fragt die App nach Freigaben, Chris bestätigt.
3. GitHub-Connector mit Zugriff auf **beide** Repos: `Chris83638w/gravuru-2027` und `Chris83638w/gravuru-katalog.` (mit Punkt am Ende).
4. Keine Zugangsdaten in Chat, Repo oder Dateien schreiben.

## 2a. So wurde es am 30.10. gelöst (für jeden neuen Chat)

- Codex-Berechtigung des Projekts auf **Vollzugriff** (`danger-full-access`). In der eingeschränkten Windows-Sandbox scheiterten Unterprozesse (`spawn EPERM`), Git (`Win32 error 5`) und pip.
- GitHub CLI (portable, SHA256 geprüft) mit Browser-Anmeldung. Git-Lesen mit `-c http.sslBackend=openssl`.
- Signierte Commits per GraphQL `createCommitOnBranch`. Nachweis `dcad2fa` ist `verified: true`.
- Python-Bibliotheken liegen projektlokal in `gravuru-2027\.local-data\python`.

**Weil Vollzugriff und GitHub-Anmeldung jetzt weit reichen, gilt streng:**
- nur eigene `dev/…-astra-mika`-Branches
- nie `main`, nichts löschen, kein Force-Push
- keine fremden Repos
- nichts außerhalb des Projektordners ändern
- keine Zugangsdaten ausgeben

## 3. Start-Check – Ergebnis wörtlich in Dein Postfach (Abschnitt 9)

| Nr | Prüfung | Erwartet |
|---|---|---|
| 1 | `node -v` | `v24.x` (am 29.10. war es v24.22.1) |
| 2 | `Get-ChildItem "C:\Users\Mikail Erdem\Documents\ChatGPT\Produkte Design\Produkte-Design"` | `gravuru-2027`, `gravuru-katalog` |
| 3 | Pfade sind Windows-Pfade, **kein** `/workspace`, kein `/root/…` | Ja. Sonst bist Du in der Cloud: stoppen und melden |
| 4 | `git -c http.sslBackend=openssl ls-remote https://github.com/Chris83638w/gravuru-2027.git HEAD` (`-c` gilt nur für diesen Befehl, keine Konfigänderung) | eine SHA. **Kein Blocker:** Ohne Git arbeitest Du mit der vorhandenen Kopie und holst Einzeldateien über den Connector |
| 5 | GitHub-Connector schreiben, **signiert**: Datei `auftraege/mika-neustart/schreibtest-signiert.txt` per GraphQL `createCommitOnBranch` im Katalog-Branch `dev/familienschilder-20261029-astra-mika` anlegen. Nicht über die Git-Data-API (Blobs/Trees/Commits), die erzeugt unsignierte Commits | Commit-SHA, REST-Prüfung `verification.verified: true` |
| 6 | Prüfwerkzeug (Abschnitt 6), Probelauf: `--reihe=gedenktafeln-22x14`. Voraussetzung: Python mit fontTools (`python -c "import fontTools"`), `$env:GRAVURU_PYTHON=(Get-Command python).Source`, und der Befehl darf Unterprozesse starten (bei `spawn EPERM` die Ausführung außerhalb der Sandbox anfragen; Chris bestätigt) | `Fertig: {"passt":21,"prüfen":1,"FEHLER":2}` (die 2 FEHLER haben kein Ziel, das ist erwartet) |
| 7 | Kontaktbogen als **PNG-Datei** in den Chat hochladen | Chris sieht das Bild. Keine `sandbox:/C:/…`-Links |

**Erst wenn 1–7 grün sind, wird gestaltet.** Bei Rot: Fehler wörtlich melden, nicht umgehen, keine Schutzregeln ändern.

## 4. Arbeitskopie aktualisieren (nach dem Start-Check)

- Mit Netz zu GitHub (Punkt 4 grün) Code frisch holen: `git clone https://github.com/Chris83638w/gravuru-2027.git gravuru-2027-neu`. Danach mit dieser Kopie arbeiten. Sie enthält das Prüfwerkzeug und alle Übergaben.
- Den Katalog **nicht komplett** klonen (über 3 GB):
  ```
  git clone --filter=blob:none --sparse https://github.com/Chris83638w/gravuru-katalog. gravuru-katalog-neu
  cd gravuru-katalog-neu
  git sparse-checkout set familien serien linien schriften motive motive-eigene materialien kataloge designs/gedenktafeln-22x14 designs/bestand/gedenktafeln designs/bestand/gedenktafeln-sternenkinder designs/bestand/kreuze designs/bestand/tierschilder designs/bestand/tuerschilder/Familie
  ```
- Getestet am 30.10.: rund 870 MB, Probelauf ergibt `Fertig: {"passt":21,"prüfen":1,"FEHLER":2}`.
- Deine 10 Familien-Muster aus dem alten Ordner nach `gravuru-katalog-neu\designs\familie-mika-120x80\` **kopieren**, nicht verschieben. Der alte Ordner bleibt als Sicherung.
- Ohne GitHub-Netz arbeitest Du mit der alten Kopie weiter. Das Prüfwerkzeug holst Du einzeln über den Connector.

## 4a. Excel-Dateien und Größen (nur diese zählen)

| Datei | Inhalt | Wo nach Abschnitt 4 |
|---|---|---|
| `gravuru-2027/docs/handoffs/design-start-mika/gravuru-preise-2026-10-29.xlsx` | **Preis-Excel** (Kopie): Acryl 3 mm mit Edelstahl-Grundpreisen, Aufpreise je Befestigung, Acryl 5 mm mit Abstandshaltern. **Preise und Lochabstände nur hieraus** | Code-Kopie |
| `gravuru-2027/docs/handoffs/design-start-mika/schiefer/Schiefer-Gedenktafeln-Groessen-2026-10-29.xlsx` | **Schiefer final**: alle Formen, Größen, skalierbaren Reihen, Optionen, Lochbilder, Chris' Antworten | Code-Kopie |
| `…/schiefer/konturen-und-loecher.json`, `Gedenktafeln_Schiefer.svg`, `Uebersicht.jpg`, `Gedenktafeln_Schiefer.cdr` | vermessene Konturen und Lochmitten (mm), Chris' Original-Zeichnung | Code-Kopie |
| `gravuru-katalog./kataloge/Stammdaten-Gravuru.xlsx` | Stammdaten aller Familien (Größen, Formen, Preise, Bohrbilder) | Katalog-Kopie |
| `gravuru-katalog./serien/edelstahl-tuerschilder-2027.json` | Edelstahl-Größen mit Grundpreisen (aus der Excel) | Katalog-Kopie |
| `gravuru-katalog./linien/SOLL-BESTAND.xlsx` | Soll-Bestand je Linie und Unterkategorie | Katalog-Kopie |
| `gravuru-katalog./schriften/sets.xlsx`, `schriften.json` | Schrift-Sets je Thema, die 84 freigegebenen Schriften | Katalog-Kopie |
| `gravuru-katalog./designs/bestand/gedenktafeln/GEDENKTAFELN-DESIGNS.xlsx` | Altbestand Gedenktafeln (651+) | Katalog-Kopie |
| `gravuru-katalog./designs/bestand/tuerschilder/TUERSCHILDER-DESIGNS.xlsx` | Altbestand Türschilder inkl. Familie | über den Connector lesen |

**Größen Familienschilder (Edelstahl, ab 12 × 8 cm; Quelle `serien/edelstahl-tuerschilder-2027.json`):**

| Reihe | Größen |
|---|---|
| Oval 3 : 2 | 12×8, 15×10, 18×12, 21×14, 24×16, 30×20 |
| Oval 15 : 8 | 15×8, 22,5×12, 30×16 |
| Rechteck 3 : 2, eckig **und** abgerundete Ecken | 12×8, 15×10, 18×12, 21×14, 24×16, 30×20, 42×28, 45×30 |

Nicht: lange Streifen, Quadrate. Ein Design je Reihe skaliert auf alle Größen der Reihe. In `design.json` immer die **exakte Größenbindung `sizes`** angeben, zum Beispiel `["GR-ES-RE-120X80-T15"]`; die Schlüssel stehen in der Serie. Ohne `sizes` bietet der Konfi das Design auch auf zu kleinen Größen an.

**Größen Schiefer (Quelle: finale Excel, `schiefer/AUFTRAG.md`):**

| Nr | Reihe | Größen |
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
| 11 | Herz | 10×10, 20×20, 25×25; 10×10 (Kordel, blau) |
| 12 | Herz 24×19 | geschnitten |
| 13 | Herz 22,5×26,7 | Kordel, blau |
| 14 | Herz schief | 18×13, 26×19 (geschnitten) |
| 15 | Kreuz | 21,5×30 (geschnitten), auch für Tiere |
| 16 | Stern | ca. 20×19 (geschnitten), nur Sternenkinder |
| 17 | Knochen | ca. 23×10,5 (geschnitten), nur Hunde |

Je skalierbare Reihe 20 Designs. Welche Optionen (Löcher, Abstandshalter) eine Größe hat, steht nur in der Excel.

## 5. Regeln und Entscheidungen von Chris (alle gelten)

**Allgemein**
- Fachlogik nur mit Quelle (Chris, Excel, Katalog). Nichts erfinden. Was fehlt, fragst Du.
- Preise und Lochabstände **nur aus der Excel**. Nie schätzen; fehlt etwas, als „offen“ melden.
- Nur **Gravur**. Nichts live, kein Shopify, nichts nach `main`, `freigabe` setzt nur Chris, nichts löschen.

**Gestaltung**
- **Design-Master** gilt (`gravuru-katalog.` → `designs/DESIGN-MASTER.md`, §1–8):
  - Vorlage 1:1, sonst starke Referenz
  - 1–3 Schriften aus den 84 freigegebenen, variieren, keine Arial
  - Motiv bleibt, Text weicht
  - nicht automatisch mittig
  - je Serie 2–3 ganz neue Designs
  - **ausgefüllte, unterschiedliche Beispieldaten**
  - **Fläche gut nutzen**
- **Jedes Motiv bleibt für den Kunden löschbar und ersetzbar.** Gesperrt sind nur ganze Druck-Designs wie Acrylglasbilder.
- **Gravur bis zum Rand** (Gestaltungsrand 0 mm). Motive und Texte dürfen **über Bohrlöcher**: Der Export bleibt vollständig, die Vorschau zeigt Loch und Beschlag.
- **Quadrat bleibt Quadrat.** Größenlisten nach skalierbaren Reihen ordnen.
- Einfarbige, gravurtaugliche Vektoren: keine Verläufe, keine Haarlinien, Linien möglichst ≥ 0,5 mm, Text auf der kleinsten Größe ≥ 3 mm.
- Neue Motive nach `motive-eigene/` mit Eintrag in `motive-eigene.json`, **nie** nach `motive/motive.json`.
- Plugin „Product Design“ ist erlaubt. Nichts aus fremden Bildern abpausen, Herkunft je Datei im Bericht.

**Grundlagen**
- `gravuru-2027` → `AGENTS.md` (vor allem „Fachlogik vor dem Programmieren prüfen“)
- `docs/handoffs/design-start-mika/START.md`: alle Excel-Dateien, Preis-Excel, Größen, wer was macht
- `ARBEITSWEG.md`

## 6. Prüfwerkzeug – Pflicht vor jedem Upload

`gravuru-2027\scripts\design-pruefung\konfi-vorschau.mjs`. Es zeigt, was der Kunde im echten Konfi sieht, ohne Server und ohne Shopify.

```powershell
cd "<Code-Ordner>"
node scripts\design-pruefung\konfi-vorschau.mjs --katalog="<Katalog-Ordner>" --reihe=<designs-ordner> --out="..\pruefung\<thema>"
```

Ergebnis: `<id>.svg` je Design, `ergebnis.json` und `kontaktbogen.html`. Den Kontaktbogen im Browser öffnen, als PNG speichern und in den Chat hochladen.

**Abnahmegrenze:**
- kein `FEHLER`, kein `passt nicht`
- jedes `prüfen` im Bericht begründet
- keine schwarzen Flächen, wo Linien sein sollen

**Bekannte Altlasten im Konfi** (nicht Dein Fehler, aber im Bericht nennen):
- Rahmen oder offene Linien werden zu schwarzen Flächen.
- Motive aus Katalogdesigns sind nicht löschbar.
- Es erscheint ein Hinweis „Text im Bohrloch“.

Die Korrektur läuft (Code-PR #72). Wenn Rahmen schwarz werden, beschreibe das, gestalte aber nicht drumherum.

## 7. Deine Aufträge, in dieser Reihenfolge

**A. Familienschilder fertig machen (heute)**
1. Die 10 vorhandenen Muster mit dem Prüfwerkzeug prüfen, Kontaktbogen-PNG in den Chat hochladen.
2. Hochladen in den Katalog-Branch `dev/familienschilder-20261029-astra-mika`, Hilfsskripte in den gleichen Branch im Code-Repo (Abschnitt 8).
3. Bericht im Postfach. Danach entscheidet Chris über die Muster.

Gilt weiter:
- maximal 6 Personen, Haustiere zusätzlich optional
- jede Figur ein eigenes Motiv, jeder Name ein eigenes Textfeld
- Stile und Tierfamilien wählst Du
- Größen: Edelstahl Oval 3:2, Oval 15:8 und Rechteck 3:2 (eckig und abgerundet) ab 12×8, siehe `START.md` §4
- „Familienmitglied hinzufügen/entfernen“ als Anforderung an Astra 1 beschreiben, nicht als vorhanden ausgeben

**B. Schiefer-Gedenktafeln (danach)**

Grundlage:
- `docs/handoffs/design-start-mika/schiefer/AUFTRAG.md`
- `Schiefer-Gedenktafeln-Groessen-2026-10-29.xlsx` (**final**)
- `konturen-und-loecher.json`

Regeln:
- 20 Designs je skalierbarer Reihe. Ohne Foto. Viele 1:1 aus dem Altbestand, sonst eigene Ideen.
- Premium (geschnitten, bis 12 mm) ohne Löcher.
- Bruchkante: ohne / 2 / 4 Bohrlöcher Ø 4 mm (ca. 19 mm vom Rand, bei 16×16, 22×14, 30×10 ca. 17 mm) oder 2 / 4 Abstandshalter (Ø 8 mm, Kopf 12 mm). Rund nur 2er.
- Kordel ist ein eigenes Produkt ohne Varianten. Blaue Formate werden so geliefert.
- Kreuz auch bei Tieren. Stern nur bei Sternenkindern, Knochen nur bei Hunden.

Themen: Menschen, Hunde, Katzen, Gemischte Tiere, Sternenkinder.
- Du darfst dafür **Unteragenten** im selben lokalen Projekt anlegen, einen je Thema.
- Du bleibst Hauptchat: gemeinsame Motive (Kreuz, Herz, Rahmen) nur einmal zeichnen, gemeinsame Dateien wie `motive-eigene.json` schreibst nur Du, einheitlicher Stil.

Ablauf:
1. Zuerst **1 Muster je Thema auf Schiefer 22×14 Natur**, 1:1 aus dem Altbestand, mit dem Prüfwerkzeug geprüft.
2. Dann 5 Muster je Thema (3:2, Quadrat, Rund; jeweils kleinste und größte Größe) zur Freigabe durch Chris.
3. Erst danach Reihe für Reihe.

Quadrat, Rund und die anderen Formen haben noch keine Schiefer-Familie im Katalog. Liefere sie als Lieferform 2 in Originalgröße. Den Konfi-Vergleich mache ich, sobald die Familien stehen. Das Lochbild der alten 22×14- und 30×20-Familie ist veraltet; maßgeblich ist die Excel.

Branches: `dev/schiefer-<thema>-20261029-astra-mika` (menschen, hunde, katzen, tiere, sternenkinder).

## 8. Hochladen

**Weg A – Connector (bevorzugt):**
- In Paketen von höchstens 40 Dateien je Commit.
- Nach jedem Paket die Commit-SHA in `auftraege/<thema>/upload-protokoll.md` eintragen. Bei Abbruch dort weitermachen.
- Commits **nur** über GraphQL `createCommitOnBranch` (mehrere Dateien je Commit, von GitHub signiert). Nach jedem Commit `verification.verified` prüfen. Ist es `false`: stoppen und melden. Die Git-Data-API (Blobs/Trees/Commits) erzeugt unsignierte Commits und ist nicht erlaubt.
- **Kein** lokales `git push` mit unsignierten Commits.

**Weg B – wenn A scheitert:**
- Den Ordner als ZIP packen und den Pfad melden.
- Chris lädt ihn auf github.com im Branch hoch („Add file“ → „Upload files“) oder gibt ihn Claude.

**Fertig heißt** – im Postfach:
1. Branch-Link und letzte Commit-SHA
2. `ergebnis.json`
3. Kontaktbogen-PNG als Datei
4. Bericht nach Design-Master §6
5. nummerierte Fragen

## 9. Kommunikation

- **Dein Postfach:** **Issue #75** „Postfach Astra Mika (Neustart lokal)“ in `Chris83638w/gravuru-2027`. Chris sagt nur „Neue Nachricht in Issue #…“. Du antwortest dort als Kommentar und **kopierst nichts über Chris**.
- Unteragenten Schiefer: die bestehenden Postfächer #65 Menschen, #66 Hunde, #67 Katzen, #68 Gemischte Tiere, #69 Sternenkinder. Die alten Postfächer #64 und #70 sind Archiv: lesen ja, nicht mehr schreiben.

| Wer | Was | Postfach |
|---|---|---|
| Astra gravuru | Rasse-, Firmen-, Pferdeschilder | #61–#63 (keine Doppelarbeit) |
| Astra 1 | Konfi-Funktionen | #48 |
| Hausnummern | | #45 |

- Antworten an Chris kurz und auf Deutsch.
- Fehler immer mit Screenshot (als PNG-Datei) und wörtlicher Meldung.

## 10. Erste Antwort im neuen Chat

1. „Briefing gelesen.“
2. Ergebnis des Start-Checks (Punkte 1–7, wörtlich)
3. Zustand der 10 Familien-Muster (vorhanden ja/nein, Anzahl Dateien)
4. Nächster Schritt mit Uhrzeit

Ziel heute: **Kontaktbogen der Familienschilder im Chat und auf GitHub.**
