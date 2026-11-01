# Auftrag an Astra Mika · Grabkreuze Acrylglas 5 mm (Probedurchlauf)

Auftraggeber: Chris (Chat 01.11.2026, 17:41). Abnahme und Endkontrolle: Claude. **Probedurchlauf** – an diesem Produkt prüfen wir den kompletten Weg von den Daten bis zum Shop.

## 1. Produkt (Vorgaben von Chris, nicht ändern)

| Punkt | Vorgabe |
|---|---|
| Produkt | Grabkreuz / Grabstecker in Kreuzform zum **Einstecken in die Erde** |
| Material | Acrylglas **5 mm**, Hochglanz |
| Ausführung | **Schwarz** und **Anthrazit** – Farbauswahl im Konfigurator |
| Verfahren | **Gravur hinter dem Material** (von hinten, spiegelverkehrt; Vorschau wirkt wie echtes Glas, Hochglanzoptik ist im Konfi schon vorhanden) |
| Größen und Preise | **11 × 20 cm 14,99 €** · **14 × 25 cm 23,99 €** · **22 × 40 cm 29,99 €** (brutto, Schwarz und Anthrazit preisgleich) |
| Motiv-Aufpreis | wie immer: **1,69 € je zusätzliches Motiv** |
| Staffelpreis | wie bisher: **ab 2 Stück 6 %, ab 3 Stück 10 %** |
| Zubehör / Befestigung | **keins** (keine Bohrungen, kein Klebeband, keine Optionen) |
| Fotogravur | **zunächst nicht** – keine Fotofelder |

**Wichtig – Erdteil:** Das Kreuz steckt ca. **5 cm in der Erde**. Im Konfigurator wird der Stecker unten um 5 cm gekürzt dargestellt (Vorschau = sichtbarer Teil). In diesen unteren 5 cm wird **nie** graviert; Text und Motive bleiben oberhalb, mit mindestens 5 mm Abstand zur Erdlinie.

## 2. Produkte und Designs

Je Zielgruppe ein eigenes Shop-Produkt (alle drei Größen × zwei Farben im selben Produkt).

| Produkt (Zielgruppe wie bei allen Andenken) | Designs |
|---|---|
| Menschen | 20 |
| Sternenkinder | 20 |
| Hunde | 20 |
| Katzen | 20 |
| Hamster | 10 |
| Pferd | 10 |
| Hase | 10 |
| Kaninchen | 10 |
| Meerschweinchen | 10 |
| Papagei | 10 |
| Wellensittich | 10 |
| Schildkröte | 10 |

= 12 Produkte, 160 Designs. Jedes Design auf allen drei Größen (gleiches Seitenverhältnis, ein Master je Design, nativ auf die anderen Größen).

## 3. Quellen (lesen, nicht ändern)

Katalog-Repo `gravuru-katalog.`, Ordner `designs/bestand/kreuze/`:

- **KZ-A = Gravur Acryl** – das sind die Vorlagen. **Vorhandene Gravur-Dateien 1:1 umsetzen** (gleiche Schriften, Motive, Aufteilung, Texte).
  - 11 × 20: 33 Designs · 22 × 40: 55 Designs · 14 × 25: **keine** Gravurvorlage → 1:1 aus dem passenden 11 × 20- bzw. 22 × 40-Master übertragen.
  - Übersicht: `bestand-gravur.jpg` (in diesem Ordner).
- **KZUV-A = UV-Druck Acryl** (33 Designs, 11 × 20 / 14 × 25 / 22 × 40) – nur als **Ideenquelle** für fehlende Designs, umgesetzt als einfarbige Gravur. Übersicht: `bestand-uv.jpg`.
- **Dubletten nur einmal übernehmen:** Gravur D19 = D41, D20 = D42, D52 = D56, D53 = D57, D54 = D58, D55 = D59; UV D10 = D20, D12 = D21, D13 = D22, D14 = D23, D15 = D24, D16 = D28, D17 = D29, D18 = D30, D19 = D31.
- **Konturen:** `konturen.json` (11 × 20 aus KZ-A-11x20-D0, 22 × 40 aus KZ-A-22x40-D18). **14 × 25 fehlt im Katalog** → Kontur aus der Corel-Datei `KZUV-A-14x25_Designs.cdr` (Server `V:\Produkte\Kreuze\UV\Gedenk\14x25`) übernehmen und mitliefern.
- Motive: Bibliothek `motive/` im Katalog (Tiere, Engel, Kreuze, Herzen, Federn …). Fehlt ein Tiermotiv (z. B. Schildkröte, Wellensittich), eigenes einfarbiges Vektormotiv nach `motive-eigene/`.

**Fehlende Designs ergänzen:** erst die Bestandsdesigns den Zielgruppen zuordnen (z. B. Tiernamen wie Balu, Tiger, Rocky → Hund/Katze), dann je Produkt bis zur Zielzahl neu gestalten – im Stil der Reihe, nicht kopieren.

## 4. Gestaltungsregeln (Design-Master, verbindlich)

- `designs/DESIGN-MASTER.md` und `designs/README.md` (Lieferform 2) im Katalog gelten.
- **Kein Schild ohne Text** – jedes Design hat mindestens Name/Daten.
- Keine Zeile unter 3 mm Versalhöhe auf **11 × 20**; Texte im Querbalken bzw. Stamm, nie über die Kontur.
- Motiv nie verzerrt oder abgeschnitten; nichts überdeckt etwas.
- Beispieltexte realistisch und je Design anders (Tiere meist nur Jahre, Sternenkinder ein Datum). Sprüche rechtefrei.
- Gestaltet wird schwarz auf weiß; die Werkstatt stellt daraus die Gravur hell auf dunkel (Schwarz bzw. Anthrazit) dar.

### 4a. Proportionen von Motiv und Text (wie besprochen)

- **Rangfolge:** Name zuerst und am größten; Daten deutlich kleiner, aber lesbar; Spruch ruhig und klein. Zusätze wie „In Liebe“ oder „Unser Sonnenschein“ etwas kleiner als der Name.
- **Fläche nutzen:** Querbalken und Stamm gut ausfüllen – kein verlorenes Motiv und kein winziger Text in viel Leerraum, aber auch nichts gequetscht. Optische Mitte statt rechnerischer Mitte; der sichtbare Teil endet 5 cm über der Spitze.
- **Motivgröße nach Sicht:** Das Motiv ist Blickfang, aber nicht größer als der Name. Passen beide nicht, bleibt das Motiv und der Text wird angepasst (umbrechen, umstellen, kleiner bis zur Mindesthöhe).
- **Schriften:** 1–3 je Design aus den 84 freigegebenen Schriften, innerhalb der Serie variieren, Namen gern Schreibschrift, Daten gut lesbar.
- **Bewusste Asymmetrie** ist erlaubt (Schrift als Gegengewicht zum Motiv). Eine Serie wirkt wie eine Familie, aber nicht wie eine Kopie.
- **Formgebundene Elemente** (z. B. Eckornamente einer Rechteckplatte) nicht auf die Kreuzform übertragen.
- **Je Serie 2–3 ganz neue Designs** ohne Vorlage (Design-Master Abschnitt 5).

### 4b. Produktaufbau (wie bei allen Linien)

- **Ein Shop-Produkt je Unterkategorie**, Name „Linie – Unterkategorie“ (z. B. „Grabkreuz Acryl – Hunde“). Im Konfi stehen alle passenden freigegebenen Designs der Zielgruppe.
- **Startdesign = Design auf dem Hauptbild**, steht im Konfi an erster Stelle.
- **Farbe ist eine Option** (Schwarz/Anthrazit) im selben Produkt, Größe ebenfalls; keine weiteren Optionen.
- **Konfi-Optik einheitlich** wie bei den Türschildern (Türschild = Maßstab): kompakte Kacheln, große Vorschau, Bereich „Format & Größe“, gleiche Produktseite und gleiches Theme wie alle anderen Produkte.
- **Materialbild:** ein Bild je Farbe für alle Größen, ein Größenwechsel ändert die Oberfläche nicht.
- **Familie im Katalog:** neue Produktfamilie (Maße, Konturen, Preise, Staffel, Farben, Erdteil 5 cm) nach dem Muster der vorhandenen Acryl-Familien; Preise nur aus diesem Auftrag.
- Freigaben (`freigabe`) setzt nur Chris.

## 5. Shop (SEO-optimiert)

- Je Produkt: Titel, Handle, Beschreibung, Stichpunkte, SEO-Titel/-Beschreibung, Bild-Alt-Texte, Tags und Collection nach den gravuru-Matrixify-Skills (01–05, 10, 12).
- Hochladen **als Entwurf (DRAFT)**. **Aktiv geschaltet wird erst nach Claudes Endkontrolle und Chris' ausdrücklichem „OK live“.**
- **Produktfotos:** macht Chris separat mit Astra – bis dahin Konfi-Vorschau als Platzhalter.

## 6. Lieferung und Abnahme

1. Kontaktbogen je Produkt aus dem **echten Konfi** (Schwarz und Anthrazit, alle drei Größen, Erdteil ausgeblendet), Original klein daneben.
2. Designs als Lieferform 2 auf einem Branch im Katalog-Repo, Produktdaten/Familie als PR.
3. Meldung in Postfach #76 an Claude. Erst nach Claudes Prüfung wird gemergt; Befunde kommen mit Screenshot zurück.
