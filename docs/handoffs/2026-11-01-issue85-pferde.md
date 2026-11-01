# Issue 85 · Bestands-Pferdeschilder

01.11.2026 · Codex / Sol High. Nutzer bestätigt Paketaufteilung mit Firmenschilder: Boxenschilder hier, Rund dort. Keine Doppelarbeit, kein Merge nach main, kein Import, nichts live.

Verbindlich: [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). Fachliche Quellen: Issue 85 Nachrichten 1–2, Größen/Formen ausschließlich `steel-door-signs`, Acrylziele gemäß #48 und Katalog-PR 11. Bereits vorhandene D74–D81 aus #63 werden nicht nochmals erstellt. Fehlende Vorlagenschriften ohne beschlossenen Ersatz bleiben offen.

## Stand

13 zusätzliche editierbare Master: 9 Rechtecke 80×53,3 mm und 4 Ovale 150×80 mm. 98 ausgefüllte Texte, 76 erhaltene Motivpfade, unterschiedliche fiktive Pferde-/Besitzerdaten. 39 native Materialvorschauen, 306 Größenprüfungen, 0 Passungsfehler; 20 Zielvorschauen behalten Prüfhinnweise. Alle Freigaben null.

Alle 111 Bestandsdatensätze zugeordnet: 13 übernommen, 30 Dubletten, 3 bereits in #63, 65 eigenständige Quellen offen. Davon 59 wegen fehlender Vorlagenschrift, 6 wegen Original-/Platzhalterqualität. Kein Ersatz ohne Entscheidung von Chris. Aktuelle Nachfrage steht im Nutzerchat; unbeantwortet bedeutet keine Freigabe.

Katalog: Branch `dev/issue85-pferde-bestand-20261101`, auf Katalog-PR 11 / `489fd3292` aufgebaut. Daten und Kontaktbogen unter `auftraege/2026-11-01-issue85-pferde/`, Master unter `designs/boxenschilder-gravur-80x53/` und `designs/boxenschilder-gravur-oval-150x80/`.

Code: gleicher Aufgabenbranch, basiert auf PR 86 / `970a689e36acbcdcf2c48c0b2b7cc4c34feab1fd`. Dessen native Zielvorschau erlaubt `mounting: K00`; kein doppelter Vorschaupatch. Die tatsächliche Größenübertragung erfolgt durch die vorhandene Funktion `scaleTemplate`, die auch der Zielvorschau-Handler verwendet.

## Wiederholen

1. `python scripts/issue85-pferde-bestand.py --katalog <Katalog> --out <Ausgabe>` – explizite Auswahl, Materialdubletten, bestehende Kennungen, editierbare Rohübernahme; rote technische Hilfen und Plattenfüllungen entfernt, Kreisbögen geometrisch gleichwertig in Bézierkurven normalisiert. Das verhindert falsche Motivboxen des alten Lesers.
2. `node scripts/issue85-pferde-layout.mjs <Katalog>` – native Schriftmessung, belegte Beispieltexte, Anordnung, Konturprüfung. Immer nach Schritt 1 ausführen; nicht auf bereits nachbearbeitetem SVG wiederholen.
3. `node scripts/issue85-pferde-pruefung.mjs <kleiner Prüfkatalog> <Ausgabe>/Zielvorschau` – nativer Zielvorschau-Handler, alle drei Familien, explizite Mastergröße und K00. Prüfkatalog enthält bytegleiche Familien/Schriften/Themen und diese 13 Master, keine anderen Designs erforderlich.
4. `python scripts/issue85-pferde-kontaktbogen.py --katalog <Katalog> --out <Ausgabe>` – Originale neben nativen Screenshots, alle 111 Zuordnungen. Benötigt Playwright/Chrome und Pillow.

Prüfungen: 15/15 `node --test app/workshop/design-target-preview.test.mjs`; Katalogbau `python scripts/build-katalog.py --katalog <Katalog> --metadata-only`, 13 gültige Familien. Artefaktprüfung: 13 Master, 98 Texte, alle 76 Vorlagen-Motivpfade erhalten, 39 offene Ziele; 306 native Größenprüfungen ohne „passt nicht“.

## Nächster Schritt

Entscheidung von Chris zu den 29 fehlenden Schriftbezeichnungen abwarten bzw. Originaldateien beschaffen. Sechs ausdrücklich aufgeführte Bild-/Platzhalterquellen im Original prüfen. Danach genau diese offenen Bestandsmaster ergänzen, erneut Kontaktbogen erzeugen. 20 Warnungsfälle einzeln visuell/fertigungstechnisch abnehmen. Kein Import oder Live-Auftrag ableiten.
