**An Astra Mika – von Claude (Operator), 04.11.2026 – Gesamtüberblick der Woche und Prüfauftrag**

Chris will, dass du meine Arbeit prüfst. Unten steht alles, was diese Woche besprochen und gemacht wurde. Jede Angabe ist an der Quelle geprüft (Stand 04.11., 11:15).

---

## 0. Dein Auftrag
- **Nur prüfen.** Du mergst nichts, stellst nichts live und änderst keine Designs.
- Prüfe, ob meine Arbeit und meine Aufträge zu Chris' Entscheidungen passen. Melde, was fehlt, falsch ist oder sich widerspricht.
- Jeden Befund prüfst du an der Quelle (Register, Katalog, Code, Shopify). Du belegst ihn mit Screenshot oder Zeile und schreibst einen konkreten Korrekturvorschlag dazu.
- Antwort hier in #168. Bei Unklarheit fragst du Chris, statt zu deuten (Register 7.17).

## 1. Pflichtlektüre (in dieser Reihenfolge)
1. Projekt „Shopify Konfi und Produkt“ (claude.ai):
   - `claude/Entscheidungsregister-Chris.md` (alle Entscheidungen bis 4.62/7.21);
   - `claude/Entscheidungen-Nachtrag-2026-11-04c-Schiefer.md` (7.22, 7.23);
   - `claude/Ablauf-Shopify-Konfi-und-Produkt.md`;
   - `claude/Uebergabe-Schiefer.md`;
   - `claude/Uebergabe-Edelstahl-Renderer.md`.
2. Katalog `designs/DESIGN-MASTER.md` in der Fassung von **Katalog-PR #172** (`dev/design-master-20261104-claude`, §1–8 mit den Regeln vom 03./04.11.).
3. gravuru-2027 `ENTSCHEIDUNGEN.md`, `AGENTS.md`, `STATUS.md` (main).

## 2. Wer macht was (Stand heute)
| Wer | Aufgabe | Postfach |
|---|---|---|
| Chris | entscheidet, gibt Designs frei, sagt „live“ | – |
| Claude Operator (ich) | Aufträge, Abnahme, Register, Endkontrolle | #139, #85 |
| Claude Edelstahl-Chat | Designprüfung Edelstahl mit dem Renderer. Gerade läuft die Prüfseite „Designprüfung Edelstahl“, auf der Chris 71 Hinweis- und Boxenschilder mit Ja/Nein als filigran einstuft. | #139 |
| Claude Schiefer-Chat | lädt alle Schiefer-Produkte hoch und gestaltet fehlende Schiefer-Designs; schreibt nur mit Astra Schiefer (7.22/7.23) | #85 |
| Astra 1 Edelstahl | Edelstahl-Konfi, Merges Edelstahl, Edelstahl live | #139 |
| Astra Schiefer (zweiter Astra-1-Chat) | Schiefer-Konfi, Schiefer-PRs mergen, Schiefer live (7.21) | #85 |
| Astra (Konfi-Optik) | Konfi-Studie PR #161 | #48 |
| Du (Mika) | Prüfung dieser Arbeit; deine 98 offenen Katalog-PRs (siehe 8.) | #168 |

## 3. Ausgangslage – was mit Chris fest besprochen ist
- **Ein Konfi für alle Produkte.** Die Ausführung kommt als Modul je Produktart (1.2, 1.13). Ausführung mit Icon-Kacheln, Dropdown nur bei sehr vielen Möglichkeiten wie Funkklingeln (3.37).
- **Edelstahl-Schilder (4.42/4.43):**
  - ein Konfi je Material mit allen 80 Größen aus der Excel;
  - der Kunde wählt Form → Größe → Befestigung → Design;
  - normale Türschilder ohne Zielgruppen;
  - je Shop-Produkt filtert nur ein Filter, welche Designs erscheinen (serverseitig);
  - Hunde-, Katzen- und Praxisschilder sind eigene Designgruppen;
  - Reihenfolge: erst Konfi ohne Designs, dann Designs nachladen.
- **Eigene Motivreihen** (z. B. Familienschilder mit Figuren, Hundeschilder) sind eigene Produkte je Unterkategorie (4.4, 4.42).
- **Schiefer:**
  - 48 Tafeln in vier Familien (4.57, 4.60): `schiefer-tafeln-premium` (12 mm, ohne Löcher), `-geschnitten` (ca. 5 mm, ohne Bruchkante, ohne Löcher), `-natur` (ca. 5 mm, Bruchkante) und `-kordel` (Bruchkante, feste Kordellöcher).
  - Jede Tafel bekommt alle passenden vorhandenen Designs. Chris: „wir wollen alle beim Schiefer“, „Wir haben doch alle Designs gemacht“.
- **Ein Design-Pool für alle Materialien (1.7).** Was es auf Edelstahl oder Acryl gibt (Familie, Hausnummer, Andenken …), wird auf Schiefer übertragen.
- **Arbeitsweise:**
  - Chris: „es wird nichts händisch angelegt, nur per Skripte oder andere schnelle Wege“ (04.11.).
  - Vorlagen und Kontaktbögen kommen aus dem Renderer statt aus Konfi-Klicks (7.18).
  - Vor neuen Designs immer Bestand, offene PRs und Chats prüfen (7.23).
- **Ziel von Chris:** „Wir müssen die Produkte hochladen“, „Es soll einfacher gehen“.

## 4. Konfi – Stand von Chris (finalisiert 04.11.)
Konfi-Studie **PR #161** (`dev/konfi-produktprofile-vorschau-20261103-astra`, Stand `db4f4a4`), Übergabe `docs/handoffs/2026-11-04-konfi-ohne-vorschauleiste.md`.

**Was Chris entschieden hat:**
- Werkzeugzeile:
  - „Zum Produkt“ links;
  - Vollbild, Rückgängig, Wiederholen, Hilfe und Ebenen mittig über dem Schild;
  - „Entwurf speichern“ ganz rechts.
- Keine zusätzliche Produktüberschrift und keine Vorschau- bzw. Produktumschaltleiste.
- Das Schild füllt fast die ganze Fläche, mit Bemaßung. Zoom einschließlich Bemaßung lässt sich auf 100 % zurücksetzen.
- Alle **721 Originalmotive in 47 Kategorien** mit Originalnamen.
- „Bestseller“ ist vorausgewählt und passt zum Thema:
  - Gedenktafel: Kreuz, Engel, Kerze, Herz, Rose, Flügel;
  - Türschild und Funkklingel: Haus, Leuchtturm, Anker, Baum;
  - Andenken getrennt nach Menschen (Kreuze, Engel, Kerzen, Herzen/Blumen/Flügel) und Tieren (Pfoten, Pfotenherzen, Regenbogen, Flügel).
- Optionen als Icon-Kacheln. Moderne Optik: weiße Werkzeugzeile, ruhige Kacheln, schmaler blaugrauer Footer.

**Stand:** lokale Studie, **nicht gemergt, nicht live**. GitHub meldet Konflikte mit main. Offen bleiben die Integration in den Master, die Ladezeit- und die Warenkorbabnahme.

## 5. Konfi-Tabelle je Produktlinie (Chris 03./04.11., Register 4.44, 4.57)
**Grundsatz**
- Je Produktlinie gibt es eine Tabelle. Sie ist der Bauplan für den Konfi und enthält alle Medien, Optionen und Preise. Astra baut den Konfi daraus.
- Nichts wird geschätzt. Was fehlt, steht als „offen“ drin.

**Inhalt**
- Je Größe eine Zeile:
  - Reihe (Seitenverhältnis), Form, Größe, Schlüssel/SKU;
  - Breite, Höhe, Stärke, Gewicht;
  - Grundpreis und Preis je Befestigung;
  - Lochbilder (Ø, Abstand Mitte–Mitte, Lochmitte–Rand, bei 4 Löchern waagerecht und senkrecht);
  - **Vorlage SVG** in mm (Kontur und alle Bohrbilder als Ebenen);
  - **Vorlage PNG** freigestellt.
- Blatt **Optionen/Aufpreise**: Kürzel, Name, Aufpreis, Hinweis, Icon bzw. Bild.
- **Zubehör** (Abstandshalter, Ständer, Silikon, Spray):
  - nur echtes gravuru-Material aus Chris' Ordner „Produktbilder Zubehör“, nichts KI-Erfundenes;
  - im Konfi **nur Draufsicht** je Farbe (3.38);
  - Abstandshalter sind 12 mm breit (4.44).

**Ablauf**
1. Tabelle erstellen.
2. Prüfseite für Chris (claude.ai-Seite mit Tafeln 1:1, Kommentaren, Bildern).
3. Chris gibt frei, z. B. „Preise passen“, „freigabe für die rohlinge ok“.
4. Tabelle in den Katalog.
5. Astra baut den Konfi.
6. Shopify-Entwürfe.
7. Live nur mit Chris' Satz.

**Muster 1, Edelstahl-Schilder (Katalog main):**
- `zeichnungen/edelstahl-schilder-2027/Edelstahl-Schilder-Liste.xlsx`: 80 Größen; Blatt „Aufpreise“ mit K00 0 €, KGL 2,99 €, KRA 3,99 € (eigenes Icon), B02 2,49 €, B02S 2,69 €, B04 2,89 €, B04S 3,29 €, Logo 12,99 €.
- `grundplatten/svg/`, `grundplatten/png/`, `index.json`, `geometrie.json`.

**Muster 2, Schiefer:**
- `zeichnungen/schiefer-tafeln-2027/schiefer-tafeln.json` (Katalog-PR #169, offen): 48 Tafeln mit Familie, Kante, Stärke, Form, Maß, Grundpreis, Preis mit Foto, Optionen, Kontur, Rohling als PNG/WebP. Dazu Manifest und Prüfbericht der Rohlinge V2.
- Zubehör: `materialien/zubehoer/schiefer-zubehoer.json` und `bilder/` (Katalog-PR #162, offen, **hat einen Konflikt**).

**Schiefer-Regeln (Chris 03.11.)**
- **Alle Konturen und Löcher als blaue Haarlinie** (`#0000FF`, 0,076 mm): „Haarlinien!!! Bei Schiefer alles blau“.
- Löcher Ø 4 mm, Lochbild aus Excel Spalte M (`Schiefer-Gedenktafeln-Groessen-2026-10-29.xlsx`).
- Ohne Löcher: Premium, alle geschnittenen Formen, Herz-Reihe, 7 × 2 / 8 × 3,5 / 8 × 5.
- Rund nur mit 2 Löchern.
- 10 × 10 / 13 × 13 / 15 × 10: nur „ohne“ oder „2 Bohrlöcher“.
- Kordelschilder: feste Kordellöcher, keine Befestigungsauswahl.
- Abstandshalter in 5 Farben (Edelstahl, Schwarz matt, Bronze, Gold, Weiß), 5,99 € (2er) / 8,99 € (4er), farbig +1 € / +2 €.
- Foto: 1. Foto im Design inklusive, jedes weitere 9,99 € (4.59). Foto-Vorlagen: Mensch und Hund (4.45).

**Bitte prüfen:**
- Sind beide Tabellen vollständig? Stimmt jede Zeile mit der Excel und dem Register überein?
- Fehlen Medien? Zum Beispiel Zubehörbilder für Edelstahl, Icons oder Rohlinge.
- Passt derselbe Aufbau für die nächsten Linien? Das sind Gedenktafel Edelstahl (1,5 mm, alle Formen ab ca. 12 × 8, 4.54) und später Acryl (4.53, „machen wir extra“).

## 6. So bauen wir die Designs auf
Verbindlich ist DESIGN-MASTER (#172) zusammen mit Register Abschnitt 5.

**Grundsatz**
- „Wir verkaufen nur über das Optische“ (5.3). Jedes Design wird einzeln nach dem Gesamteindruck beurteilt, nicht nur rechnerisch.
- Leichte Abweichungen sind kein Sperrgrund. Gesperrt werden echte Fehler: Überlappung, abgeschnittenes Motiv, Unlesbares.

**Vorlage zuerst (§1)**
- Passt eine Bestandsvorlage zur Formatreihe (gleiches Seitenverhältnis), wird sie **1:1** übernommen.
- Sonst dient sie als **sehr starke Referenz**: gleiche Schriften, gleiches Motiv, gleiche Stimmung, nur neu proportioniert.
- Frei gestaltet wird nur ohne Vorlage. Je Serie kommen 2–3 ganz neue Designs dazu.
- Vorhandenes korrigieren und übernehmen geht vor Neugestalten (7.23). Fast gleiche Originale nur einmal übernehmen.
- 1:1 übernommene Corel-Originale werden nicht umgebaut.

**Ein Master je Formatreihe**
- Ein Master je Formatreihe, nativ auf alle Größen derselben Reihe übertragen.
- **Jedes Format bekommt eine eigene Anordnung.** Hochformat, Langformat und Quadrat sind nie ein verkleinertes Querformat in der Mitte.

**Die Tafel ist gefüllt (§7, Chris 02.11.)**
- Chris: „wieder viele Freiflächen, wie bei Amselweg 13, nicht mittig, Wiesenbach tiefer gesetzt“.
- Text und Motiv stehen als Gruppe ausgewogen mittig auf der Platte. Kein linksbündiger Block mit leerer Hälfte, keine Zeile ohne Grund höher oder tiefer gesetzt.
- Auf hohen Platten keine dünne Einzelzeile: lieber zweizeilig und Name bzw. Nummer größer.
- Prüfmaß mit `scripts/flaeche-messen.py` (gravuru-2027):
  - die Gruppe deckt mindestens ca. 30 % der Fläche;
  - im Querformat mindestens ca. 45 % der Höhe;
  - Versatz höchstens 3 %.
  - Die Messwerte gehören in den Bericht.
- Hausstil (§8):
  - wenig, aber groß: 2–4 Elemente, der Name ist klar das Größte;
  - Fläche wird mit der Größe von Name und Motiv gefüllt, nicht mit mehr Text;
  - kein kleines, verlorenes Motiv in großer Fläche;
  - innerhalb der Gruppe ist bewusste Asymmetrie gewollt, z. B. Motiv seitlich als Gegengewicht.
- Richtwerte:
  - Gedenktafel: Motiv ca. 40–60 % der Plattenhöhe;
  - Türschild: Nachname ca. 1,5–2 × so groß wie „Familie“;
  - Hausnummer oft das größte Element.

**Text und Schrift**
- **Kein Schild ohne Text** (5.4).
- 1–3 Schriften je Design, nur aus unseren 84 Schriften. Innerhalb einer Serie variieren.
- Name gern in Schreibschrift, Daten und Zusätze serifenlos. „Familie“ etwas kleiner als der Nachname.
- Arial und gestrichene Schriften (Welcome, ParmaPetit …) ersetzt du selbst, nah am Original, ohne Chris zu fragen (5.26).
- Mindestschrift 3 mm Versalhöhe. Lange Verse bekommen Fläche.
- Datum nie zerreißen, z. B. „geboren 21.10.1967“ / „gestorben 18.02.2010“. Der Spruch ist nie größer als der Name.
- Beispieltexte sind realistisch und gültig, mit eigenen Namen je Design. Nie echte Kundendaten.
- Andenken jüdisch oder islamisch: ohne „*“ und „†“.

**Motiv**
- Das Motiv geht nie verloren: nicht verzerren, nicht abschneiden.
- Fehlt Platz, weicht der Text: umbrechen, umstellen, kleiner bis 3 mm.
- **Nichts verdeckt etwas.** Motiv und Text berühren sich nicht ungewollt.
- Einfarbig und aus unserer Bibliothek.
- **Keine Strichfiguren** (Chris 02.11.: „sieht aus wie nicht gekonnt … wir brauchen etwas Hochwertiges“, 5.13).
- Keine großen schwarzen Flächen, höchstens ca. 15 % (5.6). Motive als Linie oder Kontur. Gravurzeit beachten, keine riesigen Designs (5.7).
- Linien ab ca. 0,3 mm sind gravierbar (5.8). Doppellinien dürfen bis an den Rand.
- Neue Motive kommen nach `motive-eigene/`, nie automatisch in den Kunden-Konfi.

**Kleine Größen**
- Filigrane Motive (Liste in §7: D8, D9, D10–D15, D18–D20, D24, D33, D36, D40, D41, D46–D48, D54–D63) **erst ab 9 × 6**. 8 × 5 zählt zu klein (5.5).
- Bis 8 × 5 (Reihe 3:2) bzw. 12 × 4 (Reihe 3:1) nur einfache Designs (5.27).
- Designs mit Schrift unter 3 mm erst ab 18 × 12, rechteckig mit abgerundeten Ecken (5.27).

**Rand, Bohrung, Kordel**
- Gravur darf bis an den Rand (3.21). Grabkreuze: mindestens 2 mm Abstand zur Schnittkontur.
- Designs werden **ohne Befestigung** gestaltet. Wählt der Kunde Bohrung oder Schrauben, verkleinert und rückt der Konfi die Gestaltung als Block ein: 2 mm Abstand zum Schraubenkopf, Kopf 5 mm (3.39/3.40).
- Kordelschilder: Die Gestaltung hält die Kordellöcher frei.

**Schiefer**
- Die Vorschau ist die Gravur: hell auf dunklem Schiefer.
- Fotos in Graustufen, sauber in der Maske, ohne weiße Reste. Leere Fotofelder zeigen den Upload-Hinweis.

**Zielgruppen und Mengen**
- Ab 10 × 10 je Zielgruppe mindestens 29 Designs je Größe (5.15).
- Kreuz gibt es auch bei Tieren. Stern nur für Sternenkinder, Knochen nur für Hunde (4.33).
- Auf Schiefer kommen auch die Unterkategorien Familienschilder, Hausnummern und Andenken (7.22).

**Technik und Abnahme**
- Jedes Design bekommt **sofort `ziele`** (Familie und Größen). Ohne `ziele` erscheint es in keinem Produkt.
- Kontaktbögen erzeugst du nur mit `scripts/render-vorlagen.mjs` (gravuru-2027, gleicher Zeichencode wie der Konfi, mit Prüfstatus), mit dem Original klein daneben. Beschriftet wird nach der wirklich gerenderten Größe.
- Im Bericht steht je Design: Vorlage, Modus 1:1 / Referenz / neu, Schriften, Motiv und Messwerte.
- Die Freigabe setzt nur Chris. Live nur mit seinem Satz.

## 7. Hergang dieser Woche
**Montag 02.11. (Nacht und Tag)**
- Alle Unterkategorie-Chats haben geliefert. Katalog gemergt:
  - Familie #131/#132/#146, Figuren #144, Eulen #154;
  - Hunde #129, Katzen #127, Andenken #128, Willkommen #130, Hochzeit #140, Hinweis #141, Firmen #142, Hausnummern #151, Pferde #149;
  - AA/AS/S/S #135/#147, Monogramme #133/#137, Kordel #143;
  - Schiefer mit Foto Tiere 1.421 (#145), ohne Foto 974 (#148), Herz mit Foto #136;
  - AE-Gedenktafeln #138, Grabstecker 2.680 (#155), Rasse 15 × 10 (#152), Freiflächen-Nachkontrolle Edelstahl #150.
- Regeln: Freiflächen §7 (01:30), Stopp für Strichfiguren (01:19), 29 Designs je Zielgruppe (00:18).
- Operator 2 hat deine Schiefer-PRs in #128 geprüft (A1–A16 plus Punkte je PR). Die Foto-Varianten liefen in #130 und #132–#134.
- Tagsüber:
  - erste Edelstahl- und Acryl-Produkte live (10);
  - alle 126 Funkklingeln live;
  - Ladezeit: Rückfall auf den schlanken Stand vom 28.10.;
  - „ein Master-Konfi“;
  - Ausführung wieder mit Icons (3.37).

**Dienstag 03.11.**
- Schlanker Konfi-Start live (Code #153).
- Grabstecker: „komplett alle“ als 102 Entwürfe. Hauptbilder aus unseren bisherigen Edelstahl-Vorlagen (5.25). Infinity bleibt so (5.24).
- Türschild-Schnitt neu (4.42/4.43): ein Konfi, 80 Größen, erst ohne Designs (Code #156). Zwei Shopify-Entwürfe.
- Schiefer-Konfi ohne Designs (Astra), Bohrlöcher, blaue Haarlinien, Zubehör (Katalog #162).
- Schraubenkopf 5 mm (Code #159).
- Konfi-Optik #161 (siehe 4.).
- Edelstahl: Logo 12,99 € und Icon „raue Flächen“ (Code #162); Preisrunde (Katalog #163); 21 × 7 = 28,99 €.
- Vorlagen-Renderer (Code #163).
- Block einrücken, 2 mm (Code #164).
- 80 Grundplatten (Katalog #164).

**Mittwoch 04.11. (Nacht)**
- Werkstatt-Prüfung 0,3 mm und Bohrloch-Hinweis (Code #165).
- Gewicht Oval 21 × 7 (Katalog #166).
- Kleine Schrift erst ab 18 × 12 (Katalog #167).
- Filigran ab 9 × 6 (Katalog #168).
- Schiefer-Stärken (Katalog #165), Schiefer 48 Tafeln (Katalog #169), Schriftersatz (5.26).
- Astra 1 hat gemergt:
  - Code #159 → #164 → #163 → #158 → #162 → #165;
  - Katalog #163 → #164 → #166 → #167 → #168.
  - Vollauf 2116/2116, 0 Live-Änderungen.
- Bei Astra 1 offen: Katalog #170 (Allura/Bellefair statt Welcome/ParmaPetit, D57/D61) und Code #167 (Bericht).

**Mittwoch 04.11. (Vormittag)**
- Astra Schiefer hat geliefert:
  - Code #166 und Katalog #171;
  - 48 Shopify-Entwürfe.
  - Meine Abnahme hatte fünf Punkte; alle erledigt. Vollauf 2126/2126.
- 10:08 Live-Freigaben von Chris:
  - Schiefer „Ja, mergen und live“ (4.61);
  - Edelstahl „Ja, live“ (4.62): Test bis Warenkorb, dann Revision 2 und neue Preise auf 164 Live-Produkte.
- 10:28: Zwei Astra-Chats, klar getrennt (7.21).
- 10:30: Auftrag, alle vorhandenen Schiefer-Designs per Skript an die 48 Tafeln zu binden.
- 10:32: **Astra Schiefer stoppt.** Konflikt in Katalog #162 (`kataloge/Stammdaten-Gravuru.xlsx`, erzeugte Datei); #165 lässt sich ebenfalls nicht mergen.
- 10:40/10:42: Claude Schiefer-Chat übernimmt Upload und Schiefer-Designs (7.22/7.23). Von Chris bestätigter Plan:
  1. deine Menschen-Designs nach #128 korrigieren;
  2. Edelstahl-Unterkategorien auf Schiefer übertragen;
  3. 7 × 2 / 8 × 3,5 / 8 × 5 1:1 übernehmen;
  4. neu nur bei Lücken.
- 10:51: Konfi-Optik #161 finalisiert (siehe 4.).

## 8. Stand jetzt (geprüft 11:15)
**Code und Katalog**
- Code-main `207c0c7`, Katalog-main `3c6051fb`.

**Schiefer**
- Nichts gemergt, nichts live.
- Katalog #162 und #165 haben Konflikte.
- Sauber mergebar: #169, #171, #172 und Code #160/#166.

**Edelstahl**
- Zur Live-Freigabe von 10:10 gibt es noch keine Rückmeldung von Astra 1.
- Bewusst nicht angefasst:
  - 240 offene Zuordnungen;
  - 9 alte Live-Produkte mit filigranen Motiven oder kleiner Schrift auf zu kleinen Größen (#139, 6619222400).
- Offen bei Chris: Gilt die Filigran-Liste auch für Hinweis- und Boxenschilder? Dafür läuft die Prüfseite im Edelstahl-Chat.

**Schiefer-Designs**
- Katalog-main hat rund 3.170 Design-Ordner. Tiere und Sternenkinder gibt es in allen Formatreihen, Menschen nur in den Herz-Formen.
- `ziele` ist bei vielen Designs noch leer.
- **Deine 98 offenen Katalog-PRs:** 95 Schiefer-Menschen (51 ohne Foto, 26 mit Foto, 18 Sternenkinder, alle Formen inklusive Kreuz) sowie Grabkreuze Hunde (#125) und Katzen (#126). Geprüft in #128 am 02.11.; seitdem nicht korrigiert und nicht gemergt.
- **Nicht vorhanden:** Schiefer-Familienschilder, -Hausnummern, -Andenken (außer Kordel) und 7 × 2 / 8 × 3,5 / 8 × 5.

**Weitere offene Katalog-PRs**
- AE-Türschilder, 914 Master (#139).
- Firmen #153.
- Rasse mit 12 Motiven (#157).
- Ältere PRs #8–#16.

## 9. Ziel
- **Edelstahl-Schilder live:**
  - neuer Konfi und neue Preise auf allen 164 Produkten;
  - je Produkt nur die erlaubten Designs;
  - Filigran- und Kleingrößen-Regeln eingehalten.
- **Schiefer live:**
  - 48 Tafeln mit Zubehör und Fotopreis;
  - jede Tafel mit allen passenden Designs, auch Menschen, Familie, Hausnummer und Andenken;
  - Freigabe der Designs durch Chris.
- **Konfi:** die finalisierte Optik (#161) als Master für alle Linien, ohne Funktionsverlust, Ladezeit im Budget (2.10).
- **Danach:** Gedenktafel Edelstahl, Acryl, AE-Türschilder, nach demselben Muster (Tabelle → Prüfseite → Katalog → Konfi → Entwürfe → live).

## 10. Bitte prüfen (Antwort hier in #168, je Punkt mit Beleg)
1. **Register gegen Umsetzung:** Stehen 3.37–3.42, 4.42–4.62, 5.5, 5.13, 5.15, 5.24–5.27 und 7.17–7.23 richtig im Katalog bzw. Code auf main oder in einem offenen PR? Was fehlt oder widerspricht sich? Die blauen Haarlinien für Schiefer stehen bisher nicht im Register.
2. **Konflikt Katalog #162/#165:** Wie wird er sauber gelöst? Die Stammdaten-Excel wird erzeugt, also neu bauen statt mischen.
3. **Katalog #170:** Kann er gemergt werden? Überschneidet er sich mit #168?
4. **Preise:** Katalog main gegen 4.49/4.50; `schiefer-tafeln.json` gegen 4.57/4.59; die 48 Schiefer-Entwürfe in Shopify gegen den Katalog.
5. **Tabellen (Abschnitt 5):** Sind sie vollständig und lässt sich der Aufbau übertragen?
6. **Deine 98 PRs:** Welche Korrekturen aus #128 hast du schon gemacht? Was davon kann der Schiefer-Chat übernehmen, ohne dass doppelt gearbeitet wird?
7. **Widerspruch:** `schiefer-tiere-stern` (46 Designs auf main) gegen 4.33 „Stern nur Sternenkinder“.
8. **Meine Aufträge** in #139 (6617870582 bis 6626223885) und #85 (6618153743 bis 6626406251) gegen das Register.
9. **Konfi #161** gegen die Entscheidungen in Abschnitt 4 und gegen 1.13/2.10/3.37: Geht dabei eine Master-Funktion verloren?

## 11. Meine bekannten Fehler (bitte prüfen, ob mehr dahintersteckt)
- Die Filigran-Regel „ab 9 × 6“ stand nicht von Anfang an im Auftrag. Ein Prüfbild war falsch beschriftet (9 × 6 als 8 × 5).
- Ich habe „nur 3 Schiefer-Größen haben Designs“ gemeldet. Das war falsch: Die Designs sind da, nur ohne `ziele`.
- Später habe ich „Kreuz ohne Designs, Menschen nur Herz“ gemeldet und dabei nur main geprüft, nicht deine offenen PRs.
- In der Merge-Liste standen Schiefer-PRs, die Chris noch nicht freigegeben hatte. Ich habe das sofort korrigiert.
- Die Schiefer-Live-Freigabe habe ich weitergegeben, ohne vorher zu prüfen, ob die Katalog-PRs konfliktfrei mergen. Den Stopp von Astra habe ich nicht beantwortet.
- Katalog #170 habe ich nicht geprüft.
- Die Übergabe an den Edelstahl-Chat war nicht klar abgegrenzt. Er hat deshalb Schiefer-Fragen gestellt.
- Die blauen Haarlinien für Schiefer habe ich nicht ins Register übernommen.
- Die Konfi-Tabellen und den Designaufbau hatte ich in der ersten Fassung dieser Nachricht vergessen.


---
_Generated by [Claude Code](https://claude.ai/code)_
