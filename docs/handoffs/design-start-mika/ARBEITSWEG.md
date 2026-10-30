# Arbeitsweg und Ausrüstung für Astra Mika – Pflicht in jedem Chat (30.10.2026)

Von: Claude (Operator). Gilt für alle Astra-Mika-Chats: Familienschilder (#64), Schiefer-Hauptchat (#70) und die Schiefer-Themen (#65–#69). Regeln und Aufträge stehen weiter in `START.md`, `schiefer/AUFTRAG.md` und im Design-Master. Diese Datei regelt nur das **Wie**.

**Warum:** Stand 30.10. hat Familienschilder 10 Muster lokal fertig. Der Upload ist abgebrochen, weil die Arbeitsumgebung ausgefallen ist. Schiefer hat noch kein Ergebnis. Ab jetzt prüft jeder Chat zuerst seine Werkzeuge und meldet sie. Erst dann wird gestaltet.

## 1. Start-Check – zuerst, Ergebnis wörtlich ins eigene Postfach

| Nr | Prüfung | Erwartet | Wenn nicht |
|---|---|---|---|
| 1 | `node -v` | `v24.x` (v22.5+ geht notfalls) | melden, nicht weiter |
| 2 | Arbeitsordner lesen: `Get-ChildItem "C:\Users\Mikail Erdem\Documents\ChatGPT\Produkte Design\Produkte-Design"` | Ordner `gravuru-2027` und `gravuru-katalog` | fehlt einer: Abschnitt 4 (Arbeitskopie) |
| 3 | Kein Umgebungsfehler | Befehle laufen | Bei `invalid sandbox permission path URI: file:///workspace is invalid on windows` oder `… must be absolute` ist die **Umgebung defekt**. Sofort stoppen, Fehler wörtlich melden. Chris startet die App neu oder öffnet einen neuen Chat im selben Projekt mit dem Arbeitsordner oben. Nicht „drumherum“ arbeiten. |
| 4 | GitHub **lesen** (Connector) | Datei `gravuru-2027/AGENTS.md` lesbar | melden |
| 5 | GitHub **schreiben** (Connector) | im eigenen Branch eine Datei `auftraege/<thema>/schreibtest.txt` anlegen, Commit-SHA melden | Weg B in Abschnitt 3 |
| 6 | **Konfi-Vorschau-Werkzeug** (Abschnitt 2) | Ausgabe endet mit `Fertig: {...}` | Fehlertext wörtlich melden |
| 7 | **Bild im Chat zeigen** | Kontaktbogen als **PNG-Datei in den Chat hochladen**, so wie beim erfolgreichen `D98-Pusteblume.png` | Niemals `sandbox:/C:/…`-Links verwenden, die öffnen nicht |

Erst wenn 1–7 grün sind, wird gestaltet. Ist ein Punkt rot, gilt: melden, nicht raten, nichts selbst umgehen, keine Schutzregeln ändern.

## 2. Werkzeug: echte Konfi-Vorschau ohne Server

Datei `gravuru-2027/scripts/design-pruefung/konfi-vorschau.mjs` (ab `main` vom 30.10.). Hat Deine Arbeitskopie sie nicht, lies sie über den Connector und lege sie genau unter diesem Pfad ab. Sie nutzt nur Code, der schon in Deiner Kopie ist.

```powershell
cd "C:\Users\Mikail Erdem\Documents\ChatGPT\Produkte Design\Produkte-Design\gravuru-2027"
node scripts\design-pruefung\konfi-vorschau.mjs --katalog="..\gravuru-katalog" --reihe=<designs-ordner> --out="..\pruefung\<thema>"
```

- Ergebnis: je Design eine **echte Konfi-Vorschau** (`<id>.svg`), `ergebnis.json` (passt / prüfen / passt nicht / FEHLER mit Gründen) und `kontaktbogen.html`.
- `kontaktbogen.html` im Browser öffnen, als PNG speichern (Screenshot), in den Chat hochladen und mit dem Branch hochladen.
- **Warum Pflicht:** Eigene Editor-Screenshots können Fehler verdecken. Bei den Pferdeschildern sah der eigene Kontaktbogen gut aus, der Konfi zeigte aber Rahmen als **schwarze Flächen**. Dieses Werkzeug zeigt, was der Kunde wirklich sieht.
- **Abnahmegrenze:**
  - kein `FEHLER`, kein `passt nicht`
  - jedes `prüfen` im Bericht begründet
  - keine schwarzen Flächen, wo Linien sein sollen
  - Text auf der kleinsten Größe mindestens 3 mm

## 3. Hochladen

**Weg A – Connector (bevorzugt):**
1. Eigener Branch: Familien `dev/familienschilder-20261029-astra-mika`, Schiefer `dev/schiefer-<thema>-20261029-astra-mika` (im Katalog, Code-Hilfsskripte im Code-Repo).
2. In **Paketen von höchstens 40 Dateien je Commit**. Nach jedem Paket die Commit-SHA und die Dateiliste in `auftraege/<thema>/upload-protokoll.md` eintragen.
3. Bricht etwas ab, geht es am letzten bestätigten Commit weiter. Nichts doppelt, nichts löschen.
4. Am Ende hier melden: Branch-Link, letzte Commit-SHA, Dateizahl.

**Weg B – wenn A nicht geht (Fehler wörtlich melden):**
- Den fertigen Ordner (z. B. `designs\familie-mika-120x80`) als ZIP packen und den Pfad hier melden.
- Chris lädt das ZIP im Claude-Chat hoch oder per github.com: Branch öffnen → „Add file“ → „Upload files“ → Ordner hineinziehen → „Commit changes“.
- Claude prüft danach jede Datei.

## 4. Arbeitskopie

- Code und Katalog liegen schon im Arbeitsordner (Start am 29.10. bestätigt).
- Fehlt etwas: nur gezielt über den Connector nachladen. Bei großen Dateien (> 50 MB) lädt Chris über die Pakete im Branch `dev/mika-arbeitspaket-20261029-claude` herunter (Branch als ZIP, siehe #64 Nachricht 4).
- Nichts aus `main` überschreiben, was Du nicht brauchst.

## 5. Was „fertig“ heißt

Rückmeldung im eigenen Postfach mit:
1. Branch-Link und Commit-SHA
2. `ergebnis.json` und Kontaktbogen-PNG (als Datei hochgeladen)
3. Bericht nach Design-Master §6 (Vorlage, Modus 1:1/Referenz/neu, Schriften, Motiv-IDs)
4. offene Fragen an Chris, nummeriert

Ohne diese Punkte gilt ein Paket nicht als geliefert. Keine Freigaben setzen, nichts live, kein Shopify.
