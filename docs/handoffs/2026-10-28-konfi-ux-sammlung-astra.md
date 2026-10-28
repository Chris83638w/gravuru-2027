# Konfigurator: UX-Sammlung von Chris für Astra · 28.10.2026

Stand: 28.10.2026, Claude als Operator. Chris hat am 28.10. (09:11–10:02) den Kunden-Konfigurator im Live-Shop durchgeklickt und die Punkte unten diktiert. Testprodukt: [Türschild Leuchtturm 12×8 (D8)](https://gravuru-design.myshopify.com/products/tuerschild-abger-ecken-v2a-personalisiert-leuchtturm-12x8) → „Jetzt personalisieren“ (Fenster über der Produktseite).

Basis: `main` (inkl. Schriften bei Bedarf, paralleles Laden, Direktstart – live seit 28.10. 07:49). Arbeitsbereich: vor allem `app/configurator/variant-m/` (ux.mjs, completion.mjs, adapter.mjs, workflow.mjs, mobile-steps.mjs, *.css) und `app/workshop/ui/shop-entry.html` (Fensterleiste).

**Screenshots** liegen in [`konfi-ux-20261028/`](konfi-ux-20261028/), Dateiname = Punktnummer.

## Rahmen

- Ziel: kompakter, moderner, **ein Stil**, gut bedienbar für **ältere Kunden** (große Schrift, klare Knöpfe, nichts überlappt).
- Desktop **und** Handy in einem Zug umsetzen. Kopfzeile, Sticky-Verhalten, Werkzeugleiste und Knöpfe sind dieselben Bausteine; zwei Durchgänge würden doppelte Arbeit und Stilbrüche bringen. Für die Handy-Toolbar steht eine Entscheidung von Chris noch aus (Punkt 25).
- Vorschauen für Chris immer **1:1 im echten Konfigurator** zeigen (z. B. per Playwright, CSS/DOM nur im Testbrowser einblenden), keine freien Skizzen.
- Proaktiv melden: Stilbrüche, uneinheitliche Gestaltung und Platzverschwendung.
- Keine Änderung an Preisen/Prüfregeln ohne Rückfrage. Live erst mit Chris' ausdrücklichem Satz („Ja, Du darfst … bereitstellen und die App neu starten.“). Eigener Branch `dev/<thema>-20261028-astra`, Tests, `STATUS.md`.

## Punkte von Chris

| # | Punkt | Bild |
|---|---|---|
| 1 | Motiv (Leuchtturm) ragt über die Kontur auf die weiße Fläche – Motive dürfen nicht über den Rand/die Rundung. | 01 |
| 2 | **Importer (Konfi-Import):** Ein zusammengehöriger langer Text gehört in **ein** Textfeld, nicht Zeile für Zeile. | – |
| 3 | Knöpfe oben (Vollbild, Rückgängig, Wiederholen, Hilfe) ragen in die Arbeitsfläche → mehr Abstand oder anders anordnen (Vorschlag: eigene Leiste/Randspalte). | 03 |
| 4 | Vollbild: Konfi und Produkt **so groß wie möglich** (ältere Kunden). Heute grauer Rand links, Schild klein, unterer Knopf abgeschnitten. | 04 |
| 5 | Oben geht viel Platz verloren: Fensterleiste „Schließen“ + Leiste „Zurück zum Produkt / Titel“ + Banner „Dein letzter Stand wurde wiederhergestellt“ → **eine** schmale Kopfzeile, Hinweis als kleine Pille. | 05 |
| 6 | Text-Optionen (Schrift, Größe, Mehr Optionen) **direkt unter der angetippten Textzeile** aufklappen, beim Verlassen zuklappen. Heute sieht der Kunde nicht, dass es Einstellungen gibt (Hinweis „▸ Schrift · Größe“ an jeder Zeile). | 06 |
| 7 | Konfi (Schild) **immer sticky** – beim Scrollen der Textliste bleibt das Schild sichtbar. | 07 |
| 8 | Motivnamen müssen sauber in die Kachel passen (Umbruch, Schriftgröße, gleiche Kachelhöhe). | 08 |
| 9 | **Aufpreis pro Motiv 1,69 €** (früher vorhanden). Heute steht „Motive sind im Preis enthalten“. Preislogik nur aus dem versionierten Produktstand, keine zweite Preislogik. | – |
| 10 | **Semantische Motivsuche** wie früher: „Wasser“ findet Wellen, Anker, Leuchtturm, Fische … (Synonyme/Kontext, nicht nur Namensteil). | – |
| 11 | Aufklapp-Pfeile („v“) wirken alt → modernes, dünnes Chevron überall. | 11 |
| 12 | Befestigung: **nur die Bildkacheln**, die Auswahlliste darüber entfällt. | 12 |
| 13 | Fußleiste (Preis, MwSt., Preisdetails, Staffel, Menge, Knopf) kompakter/moderner; Staffel in „Preisdetails“, loser grauer Strich weg. | 13 |
| 14 | Generell geht bei vielen Dingen unnötig Platz verloren (Abstände, Rahmen, Leisten straffen). | – |
| 15 | **Ein Stil:** Befestigungskacheln mischen Icons und Bilder → alles im Icon-Stil, wiederverwendbar für andere Materialien. | 15 |
| 16 | Neues Icon für den Reiter „Ausführungen“ (Zahnrad). Vorschläge A–H: [`v16-icon-vorschlaege.png`](konfi-ux-20261028/v16-icon-vorschlaege.png), Claude empfiehlt **A (Schieberegler)** – Entscheidung Chris offen. | 16 |
| 17 | Kleines **ⓘ** mit euren Infotexten bei „Material & Befestigung“ und überall, wo der Kunde entscheidet (Material, Größe, Schrift, Motiv-Aufpreis, Foto). Quelle der Texte bei Chris erfragen (alter FPD / Metafelder). | 17 |
| 18 | Zeichenbegrenzung **50 Zeichen pro Zeile** (heute 32 pro Feld); bei mehrzeiligen Feldern je Zeile. | – |
| 19 | „Schrift auf weitere Texte übertragen?“: Knöpfe nebeneinander; außerdem Zeilen halb so hoch, Texte schwarz statt grau, „Alle auswählen“. | 19 |
| 20 | Ausrichten-Knöpfe nebeneinander (Links / Mitte / Rechts als Symbolreihe; grauer Knopf wirkt gesperrt). | 20 |
| 21 | „Gestaltung fertig – weiter“ → **„In den Warenkorb“**. Claude empfiehlt: Überblick bleibt als letzte Kontrolle, dort „Jetzt in den Warenkorb“ – Bestätigung Chris offen. Menge mit −/+. | 21 |
| 22 | Hinweis „Überlagerung“ passt nicht (Scrollleiste, „Warnung ignorieren“ abgeschnitten, „Zoom“ liegt darüber) → umbrechen, Knöpfe darunter. | 22 |
| 23 | Grüne Text-Leiste neu: Desktop-Variante A (hell, Schrift in eigener Schrift, F/K, Ausrichten, −/+ Größe, Drehen, Löschen; sitzt über dem Text, weicht aus, verdeckt keine Werkzeuge). 1:1 im Konfi: [`v23-desktop-A-im-konfi.png`](konfi-ux-20261028/v23-desktop-A-im-konfi.png). „Text ändern“ entfällt (Doppeltippen = tippen). | 23 |
| 24 | Leiste „Vorlagenelement geschützt / Zum Löschen entsperren / Wieder sperren / Löschen“ **entfernen**. Löschen nur über den Papierkorb in der Leiste, danach „Entfernt – Rückgängig“. Pflichtfelder bleiben geschützt. | 24 |
| 25 | **Handy:** Schild groß und sticky oben, Werkzeuge nicht über der Arbeitsfläche (heute liegen Griffe/Drehpfeil über „Hilfe“), Kopfzeilen zusammenlegen. Text-Leiste: Varianten M1 (Bedienfeld unten), **M2 (Leiste direkt unter dem Schild, Claude-Empfehlung)**, M3 (schmale Pille) – alle 1:1 im Konfi: `v25-handy-M1/M2/M3.png`. Entscheidung Chris offen. | v25 |
| 26 | **Designs fehlen:** D8 hat im Katalog genau ein Design (`katalog-TAE-V2A-8x5-D8`), daher keine Design-Auswahl. Klären mit Chris: alle Designs derselben Reihe oder feste Auswahl je Produkt → Katalog/Importer. | – |

## Zusätzlich von Claude (proaktiv)

- **Pflichtfeld-Fehler sofort sichtbar:** „Name“ zeigt beim Öffnen rot „Pflichtfeld: Bitte den Beispieltext …“. Chris (21.10.) wollte das erst beim Abschluss. → erst nach „In den Warenkorb“ bzw. nach Verlassen des Feldes.
- **Feldnamen „Text 2 / Text 4 / Text 5“** sind nichtssagend → sprechende Namen aus der Vorlage (Vornamen, Zeile „von“, Adresse); ggf. im Importer setzen.
- **Zeichenzähler „14/32“** unter jedem Feld kostet je eine Zeile → nur ab ~80 % Füllung oder klein rechts im Feld.
- Im Fenster doppelte Kopfelemente: Schriftzug „gravuru“, „← Zurück“, „Entwurf speichern“ zusätzlich zur Fensterleiste → in die eine Kopfzeile (Punkt 5).
- Status-Text „Lokaler Prüfstand · Bestellung noch nicht verbunden“ steht im Shop-Einstieg noch im DOM (`ux.mjs` `.fk-order-status`) → im Shop-Einstieg entfernen.
- Zoom-Regler rechts: Beschriftung „Zoom“ überlappt Inhalte (Bild 22).
- Gesamte Knopf-/Kachelsprache vereinheitlichen (Rahmen, Radius, Höhe 44 px, aktive Auswahl gleich markiert).

## Erledigt bzw. bei Claude (nicht Astra)

- Branch `dev/konfi-ios-sicherheit-20261028-claude` (noch nicht live, Chris' Satz fehlt): (a) Shop-Fenster-Absicherung (iPhone „Knopf grau, tut nichts“ – Hinweis mit „Weiter warten / Neu laden / Ohne Fenster öffnen“), (b) leere Zusatztexte („Dein Text“) werden bei „Gestaltung fertig“ entfernt – Bild 00 (`completion.mjs` + `added-texts.mjs`). **Bitte auf `main` aufsetzen; `completion.mjs` wird mit diesem Branch leicht geändert – beim Merge abgleichen.**
- Punkt 27 **Warenkorbbild ohne Material** (bei Chris weiterhin flach) – prüft Claude an der Quelle.
- iPhone-Ursache „Knopf ausgegraut“ – Claude, Screenshot von Chris angefragt.

## Vorgehen (Vorschlag)

1. Stil-Grundlage zuerst: Knöpfe, Kacheln, Chevron, Icons, Abstände (Punkte 11, 14, 15, 16, 20).
2. Rahmen: eine Kopfzeile, sticky Schild, Werkzeugleiste/Randspalte, Fußleiste, Vollbild (3, 4, 5, 7, 13, 22, 25).
3. Text-Bedienung: Optionen unter der Zeile, neue Text-Leiste, Löschsperre weg, Übertragen-Dialog, Pflichtfeldanzeige, 50 Zeichen (6, 18, 19, 21, 23, 24).
4. Motive: Kontur (1), Kachelnamen (8), Aufpreis 1,69 € (9, nur mit Chris' OK), semantische Suche (10), ⓘ-Texte (17).
5. Katalog/Importer: langer Text in ein Feld (2), Designs je Produkt (26).

Jeweils 1:1-Bilder im echten Konfi (Desktop 1440 × 900 und iPhone 390 × 844) vor dem Merge an Chris.
