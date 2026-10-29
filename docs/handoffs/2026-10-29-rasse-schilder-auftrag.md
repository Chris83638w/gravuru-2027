# Auftrag: Hunde- und Katzenschilder je Rasse (29.10.2026)

Von: Claude (Operator). Für: Design-KI. Postfach: Issue „Postfach Rasse-Schilder“ in `gravuru-2027`.

## Ziel (Chris, 29.10.)
Für jede Hunderasse (und später jede Katzenrasse) eigene **Türschild-Designs** mit dem **detaillierten Rasse-Porträt als Vektor** (keine einfache Silhouette). Schildarten je Rasse: **„Hier wacht …“, „Achtung …“** und weitere dieser Art.

## Gestaltung
- **Süß** wirken: Die vorhandenen Rasse-Vektoren dürfen dafür **leicht umgestaltet** werden (freundlicher Ausdruck, weichere Linien). Rasse muss klar erkennbar bleiben.
- **Stimmiges Gesamtbild:** alle Rassen im gleichen Stil, gleiche Strichstärke, gleiche Schriftfamilie je Schildart, gleicher Aufbau. Ein Kunde, der zwei Rassen nebeneinander sieht, soll eine Serie erkennen.
- Gravur auf Edelstahl: einfarbig, keine Graustufen/Verläufe, keine Haarlinien unter der Mindeststrichstärke. Schrift erst bei Bestellung in Pfade (Regel Katalog).
- Texte mit Platzhaltern, die der Kunde ändert (z. B. Name des Hundes).

## Produkte und Größen (nur Gravur, Edelstahl)
Nur **große ovale** und **rechteckige** Schilder **ab ca. 12 × 8 cm**, damit Porträt und Text gut passen (Quelle: Serie `serien/edelstahl-tuerschilder-2027.json` im Katalog):
- **Oval 3 : 2:** 12×8, 15×10, 18×12, 21×14, 24×16, 30×20
- **Oval 15 : 8:** 15×8, 22,5×12, 30×16
- **Rechteck 3 : 2** (eckig und abgerundet): 12×8, 15×10, 18×12, 21×14, 24×16, 30×20, 42×28, 45×30
- Nicht: lange Streifen (z. B. 24×8, Oval 12×4 … 27×9), Quadrate.
Ein Design je Seitenverhältnis-Reihe skaliert auf alle Größen der Reihe; je Reihe einmal 1:1 prüfen.

## Vorlagen
- **Hunde:** `gravuru-katalog.` → `motive/hunderassen/` (69 Vektoren, rund 55 Rassen; Kontaktbogen `motive/_uebersicht/hunderassen.png`). Mehrere Varianten einer Rasse (z. B. Golden Retriever, Labrador): die schönste als Grundlage, im Bericht nennen.
- **Katzen:** Im Katalog gibt es **keine Katzenrassen**. Quelle klärt Chris – bis dahin **nur Hunde**.

## Ablauf
1. **Muster zuerst:** 5 Rassen (Labrador, Golden Retriever, Deutscher Schäferhund, Dackel, Französische Bulldogge), je „Hier wacht …“ und „Achtung …“, jeweils Oval 3:2 und Rechteck 3:2 – als **1:1-Bilder im echten Konfigurator** zur Freigabe durch Chris. Erst nach Freigabe weiter.
2. Danach alle Rassen in Paketen zu 10, gleicher Stil.
3. Weitere Schildarten nur nach Chris' Bestätigung (Vorschläge im Bericht nennen, nicht selbst festlegen).

## Regeln (AGENTS.md)
- Fachlogik nur mit Quelle (Chris/Excel/Katalog); nichts erfinden. **Jedes Motiv bleibt für den Kunden löschbar und ersetzbar.**
- Preise/Größen nur aus Excel bzw. Katalog. Keine Shopify-Änderung, nichts live.
- Eigener Branch im Katalog (`dev/rasse-schilder-<datum>-<name>`), signierte Commits, Bericht + Bilder, Rückmeldung im Postfach-Issue.
- Bei Fragen: im Postfach-Issue stellen, Chris entscheidet.
