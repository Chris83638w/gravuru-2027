# Beta #267 · Claude · Phase A: Codepfad, Messreihe, Paritätsmatrix

Account: Claude (Operator, hier als Prüfer). Auftrag: [Issue #267](https://github.com/Chris83638w/gravuru-2027/issues/267), Abschnitte 2, 3 Phase A und 5. Stand: 19.11.2026, 12 Uhr UTC.
**Keine Runtime-, Shop- oder Preisänderung.** Dieser Branch enthält nur diese Übergabe, Messskripte, Rohdaten und Belegbilder.
Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich; diese Übergabe gestaltet nichts um.

## 1. Kurzfassung

1. **Das schnelle Klingelschild läuft im selben Konfigurator wie die langsamen Produkte.** Gleicher Loader, gleiche Editor-Datei, gleiches Bundle, gleiche vier Warenkorbschritte. Der Unterschied liegt in den Daten des Produkts.
2. **Schneller ist es an zwei Stellen:** Der Designwechsel läuft im Gerät (keine Serveranfrage), und der Warenkorb braucht 7,6 s statt 14,9 s (Türschild) oder 21,3 s (Familienschild).
3. **Nicht schneller ist es beim Öffnen und beim Tippen.** Vom Tipp bis zum bedienbaren Editor vergehen im Handyprofil 10,6 s, beim Türschild 11,4 s. Ein Tastendruck kostet beim Klingelschild sogar am meisten.
4. **Vom 5-Sekunden-Ziel ist auch das schnelle Produkt weit entfernt:** Handy kalt rund 20 s für den ganzen Weg, Desktop rund 10 s.
5. **Meine Strategie:** kein neuer Konfigurator. Die Beta ist R15 mit vier abgegrenzten Paketen (Warenkorb ohne Wartearbeit, Designs lokal, leichter Start, flüssiges Tippen). So bleibt die Funktionsparität erhalten, und jedes Paket lässt sich einzeln messen und zurücknehmen.

## 2. Geprüfter Stand

| Gegenstand | Stand | Wie geprüft |
|---|---|---|
| Live-Shop `gravuru-design.myshopify.com` | 19.11.2026, 11:02–11:50 UTC | Headless Chrome 153, 35 Läufe plus Sondierungen |
| Live-Loader `/apps/konfigurator/shop-embed.mjs` | bytegleich mit Repo-Stand `9af3a1a` | Vergleich nach Einsetzen der Editor-Adresse |
| Editor | `_merchant-acryl-editor.html`, Bundle `editor-53e0cbea74e77305.mjs` | in allen drei Produkten geladen |
| R15-Code | `9af3a1a` | Stichproben, Fundstellen unten; Testlauf vom Morgen: 2.733 bestanden, 4 fehlgeschlagen, 4 übersprungen |
| Studio | `cf36da6` | vollständig, siehe #265 |
| Öffentliche Produkte | 88: 85 Klingelschilder, 2 Acryl-Familienschilder, 1 Edelstahl-Türschild | `/products.json` |
| Bestellung #1017 | Testbestellung vom 21.09.2026 | nur lesend über die Admin-Schnittstelle, nur Feldnamen ausgewertet |

Nicht gelesen: die Antworten von Astra und Grok/Cursor in #267 und #266. Das ist Absicht, der Auftrag verlangt zuerst die eigene Meinung.

## 3. Welcher Codepfad steckt hinter dem schnellen Produkt?

Verglichen habe ich drei Live-Produkte:

- **R** Referenz: `klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert`
- **T** Türschild Edelstahl: `tuerschild-edelstahl-form-und-groesse-selbst-waehlen` (der Prio-Konfi aus der Messung vom 16.11.)
- **F** Familienschild Acryl: `familienschild-acryl-baum-12x8-personalisiert` (Messung vom 17.11.)

| Merkmal | R Klingelschild | T Türschild | F Familienschild |
|---|---|---|---|
| Loader | `shop-embed.mjs` | derselbe | derselbe |
| Editor-Datei und Bundle | `_merchant-acryl-editor.html`, `editor-53e0cbea…` | dieselben | dieselben |
| Darstellung | Standard | `ui=prio-r15` | Standard |
| Designs | 16, im Produktmodell (`FK-…`) | 21, je eigenes Katalogdesign | rund 40, je eigenes Katalogdesign |
| Designwechsel | im Gerät, 0 Anfragen | Server: `design-switch`, `model`, Editor lädt neu | wie T |
| Startmodell | 19 kB | 123 kB | 71 kB |
| Entwurf beim Warenkorb | 69 kB | 258 kB | 107 kB |
| Vier eigene Serverschritte, Handy | 4,9 s | 12,4 s | 18,9 s |

**Gegenprobe mit gleichem Produkt und gleichen Designs:** Ich habe das Klingelschild in der Prio-Darstellung geöffnet (Startadresse mit `ui=prio-r15`, nur in meinem Testbrowser). Der Designwechsel blieb lokal (2,9 s und 3,1 s im Handyprofil), der Start wurde langsamer (14,9 s statt 10,6 s, 1,57 MB statt 0,92 MB). Die Darstellung entscheidet also nicht über den Designwechsel, das Datenmodell tut es. Bild: `bilder/03-…`.

Fundstellen am Stand `9af3a1a`:

- Lokale Designkarten: `app/configurator/variant-m/adapter.mjs:388` (`c-design-card`, Auswahl über `el.state.designId`).
- Galeriekarten: `app/configurator/variant-m/product-design-gallery.mjs:103` (`ux-product-choose`).
- Wechsel über den Server: `app/workshop/ui/shop-design-switch.mjs:1–30` und `app/workshop/shop-entry.mjs:596`. Der Kommentar dort sagt es selbst: Die alten Editorfenster bleiben im Dokument stehen. In der Messung standen nach einem Wechsel zwei Editorfenster im Dokument.
- Miniaturen der lokalen Karten werden bei jeder Änderung neu gezeichnet: `adapter.mjs:306–348`. *Hypothese:* Das erklärt die langen Tastendrücke beim Klingelschild. Bewiesen ist es nicht.

## 4. Messreihe

**Aufbau.** Headless Chrome 153.0.8010.12 aus einem Rechenzentrum, über einen Proxy, der TLS neu aufbaut. Handyprofil wie in #252: 390 × 844, CPU ×4, 150 ms, 1,6/0,75 Mbit/s. Desktop: 1366 × 900, ungedrosselt. Kalt heißt frischer Browser je Lauf, warm heißt zweiter Besuch im selben Browser. Je Zelle drei gewertete Läufe, Median und Spanne. Ein p95 gebe ich bei drei Läufen nicht an, das wäre Scheingenauigkeit. Die Reihen liefen nacheinander, nie parallel.

**Vergleichbar** sind die Spalten untereinander (gleiche Maschine, gleiche Stunde). Die absoluten Werte gelten für diese Anbindung. Ein echtes Handy im Mobilfunk kann anders liegen.

### Handy, kalt (Sekunden, Median und Spanne)

| Messpunkt | R Klingelschild | R in Prio-Darstellung | T Türschild | F Familienschild |
|---|---:|---:|---:|---:|
| Produktseite: größtes Bild sichtbar | 2,3 (2,3–2,4) | 1,8 (1,7–2,0) | 4,0 (3,9–4,2) | 4,6 (4,4–4,6) |
| Produktseite fertig geladen | 8,4 (8,3–8,5) | 8,5 (8,4–9,2) | 7,7 (7,6–8,3) | 8,0 (7,7–8,2) |
| Tipp „Jetzt personalisieren“ → Editor bedienbar | 10,6 (10,4–10,7) | 14,9 (14,2–15,1) | 11,4 (11,2–11,5) | 11,7 (11,4–11,8) |
| Designkacheln gefüllt | 0,6 (0,5–0,7) | 1,0 (0,9–1,2) | 1,0 (0,9–1,1) | 2,6 (2,4–2,7) |
| 1. Designwechsel | 3,2 (2,9–3,2) | 2,9 (2,5–3,5) | 6,9 (6,6–7,0) | 5,9 (5,8–6,3) |
| 2. Designwechsel | 2,8 (2,6–2,9) | 3,1 (3,0–3,2) | 7,5 (7,5–7,8) | 6,4 (6,2–7,4) |
| Tastendruck → Anzeige | 1,3 (1,1–1,3) | 1,2 (1,1–1,2) | 0,7 (0,7–1,0) | 0,7 (0,6–0,8) |
| Letzter Tipp → Position im Warenkorb | 7,6 (7,4–8,1) | nicht gemessen | 14,9 (14,0–15,0) | 21,3 (20,5–21,4) |
| Letzter Tipp → Warenkorb-Seite geladen | 10,0 (9,8–10,4) | nicht gemessen | 17,5 (16,7–17,7) | 24,1 (22,8–24,1) |

### Desktop, kalt

| Messpunkt | R Klingelschild | T Türschild |
|---|---:|---:|
| Produktseite: größtes Bild sichtbar | 1,4 (1,0–1,4) | 1,1 (1,0–1,2) |
| Klick → Editor bedienbar | 3,2 (3,1–3,5) | 3,6 (3,6–3,7) |
| 1. Designwechsel | 0,8 (0,7–0,8) | 2,3 (2,2–2,3) |
| 2. Designwechsel | 0,6 (0,5–0,6) | 2,2 (2,0–2,2) |
| Tastendruck → Anzeige | 0,2 | 0,1 |
| Letzter Klick → Position im Warenkorb | 5,3 (5,3–5,8) | 10,8 (10,7–11,7) |
| Summe der vier eigenen Serverschritte | 4,0 (3,9–4,5) | 9,5 (9,4–10,4) |

**Warm** hilft wenig: Am Handy bleibt der Weg bis zum Editor bei 8,8 s (R) und 7,1 s (T), obwohl nur noch 56 kB und 145 kB vom Konfi-Server kommen. Die Zeit geht also in die Rechenarbeit im Gerät, nicht ins Netz. Alle Tabellen stehen in `messung/auswertung.md`.

**Bearbeiten aus dem Warenkorb** (je ein Lauf): Klick auf „Bearbeiten“ bis Editor bedienbar 9,2 s (R, Handy), 8,2 s (T, Handy), 3,6 s (R, Desktop).

**Abgleich mit Chris’ Beobachtung** („Designwechsel sofort, Warenkorb ca. 8 s“): passt. Desktop 0,6–0,8 s und 5,3 s, Handyprofil 2,8–3,2 s und 7,6 s.

**Ganzer Weg nach der Messstrecke aus #265** (Seite sichtbar + Tipp bis Editor + letzter Tipp bis Position): Handy kalt R 20,5 s, T 30,3 s, F 37,6 s. Desktop kalt R 9,9 s, T 15,5 s. Ziel sind rund 5 s.

### Wo die Warenkorbzeit bleibt

Der Live-Server liefert `Server-Timing`. Ein Diagnoselauf je Produkt im Handyprofil:

| Schritt | R Server | T Server | Größte Anteile |
|---|---:|---:|---|
| Entwurf sichern (`acrylic-drafts`) | 0,66 s | 2,49 s | T: `review_validate` 0,74, `customer_preview` 0,66, `review_zip` 0,31 |
| `theme-cart` | 0,29 s | 1,09 s | T: Angebot auflösen 0,47, `variant_binding` 0,28 |
| `cart/data` | 1,91 s | 3,87 s | **`checkout_image_wait` 1,81 s (R) und 2,72 s (T)** |
| `cart/claim` | 0,09 s | 0,93 s | T: Angebot auflösen 0,36, `cart_claim` 0,39 |
| Summe | 2,95 s | 8,38 s | |

Drei Dinge fallen auf:

1. **Das Warten auf das Checkout-Bild** kostet bei jedem Produkt 1,8 bis 3,1 s (im Desktoplauf 3,06 s). Das ist der größte Einzelposten und hängt nicht vom Produkt ab.
2. **Das Angebot wird in drei der vier Schritte neu aufgelöst.** Beim Türschild kostet das jedes Mal 0,35–0,47 s, beim Klingelschild 0,02–0,03 s.
3. **Am Handy zählt die Sendegröße des Entwurfs.** 258 kB brauchen bei 0,75 Mbit/s allein 2,8 s, 69 kB 0,7 s.

Dazu kommt bei allen Produkten das Laden der Warenkorb-Seite nach dem Hinzufügen: 2,4–2,8 s am Handy.

### Auffälligkeiten

- **3 von 48 Öffnungen meldeten binnen 90 s nicht „bereit“** (einmal Handy, zweimal Desktop). Ursache offen. Es kann an meiner Messumgebung liegen. Nächster Schritt: mit Netzprotokoll nachstellen.
- **Platzhalterkachel:** In der Prio-Darstellung bleibt beim ersten Öffnen eine Designkachel leer, bis sie nachgezeichnet ist (`bilder/03-…`).
- **Beispieltexte gehen unverändert in den Warenkorb:** Beim Klingelschild landeten „Mustermann“ und „Musterstraße“ in der Position, obwohl ich nur ein Feld geändert hatte (`bilder/04-…`). Ob das gewollt ist, ist eine Fachfrage an Chris. Eine Regel dazu kenne ich nicht, ich schlage keine vor.

### Nicht gemessen

- **Foto:** kein Upload in das Live-System ohne Freigabe. Keines der drei Produkte hat im Test einen Foto-Reiter gezeigt.
- **PDF- und SVG-Export:** entsteht nach der Bestellung auf dem Server. Ohne Bestellung und Werkstattzugang nicht messbar.
- **Aufpreise live:** Das Auswahlfeld für die Befestigung bot im Test nur „Ohne Befestigung“. Den Weg Aufpreis → Warenkorb konnte ich so nicht prüfen.
- **Mehrere Positionen, Mengenstaffel, echtes Gerät im Mobilfunk.**

## 5. Paritätsmatrix (erste Fassung)

**Live** = heute im Live-Shop gesehen oder gemessen. **Lokal** = bestandene Tests in meinem Lauf der R15-Suite am Stand `9af3a1a` (Zahl = Treffer zum Stichwort, kein Vollständigkeitsbeweis). **Historisch** = an älterem Stand belegt. **Offen** = kein Beleg oder nicht geprüft.

| Nr. | Funktion | Stand | Beleg | Testfall für die Beta |
|---|---|---|---|---|
| A1 | Ein Editor für alle Produkte | Live | drei Produkte, gleiche Datei und gleiches Bundle | je Profil denselben Build öffnen |
| A2 | Profil Funkklingel (Edelstahl mit Acrylauflage) | Live | 85 Produkte, R gemessen | Durchlauf R |
| A3 | Profil Edelstahl-Türschild | Live | T gemessen | Durchlauf T |
| A4 | Profil Acryl-Türschild 3 mm | Live | F gemessen | Durchlauf F |
| A5 | Profil Schiefer | Lokal, kein Live-Produkt | 25 Tests; Preis und Bohrbild 30×20 widersprüchlich (#265, H7) | erst nach Klärung der Stammdaten |
| A6 | Profil UV-Druck | Lokal, kein Live-Produkt | 51 Tests (Farbregeln, Mindestschrift) | Durchlauf Boxenschild |
| A7 | Profil Holz | Offen | 3 Tests zu Vorschautönen, kein Produkt | offen |
| A8 | Fähigkeiten je Profil | Live teilweise, Lokal | T zeigt „Logo“, R nicht; Test „foreign product, profile or revision fails closed“ | Foto an Profil ohne Foto wird abgewiesen |
| B1 | Design wählen und wechseln | Live | gemessen, lokal und über Server | Durchlauf mit Zeitbudget |
| B2 | Designsuche | Live gesehen, nicht bedient | Suchfeld vorhanden; 30 Tests | Suche nach Name und Nummer |
| B3 | Text, Schrift, Größe | Live (Text), Lokal | Text bis in die Warenkorbposition; 96 Tests | Text, Schrift, Größe ändern |
| B4 | Motive | Live gesehen, Lokal | Reiter vorhanden; 119 Tests | Motiv mit Aufpreis 1,69 € |
| B5 | Verschieben, Skalieren, Drehen, Löschen, Ersetzen | Lokal | 35, 42 und 17 Tests | Zeigergesten am Handy |
| B6 | Ebenen | Live gesehen, Lokal | „Ebenen (4)“; 31 Tests | Reihenfolge ändern |
| B7 | Rückgängig, Wiederholen | Live gesehen, Lokal | nach Designwechsel aktiv; 21 Tests | drei Schritte zurück und vor |
| B8 | Zoom, Vollbild | Live gesehen, Lokal | „Ansicht“, „Vollbild öffnen“; 19 Tests | Zoom am Handy |
| B9 | Zurücksetzen auf das Original | Live gesehen, Lokal | Test „reset loads the selected template without carrying edits …“ | Zurücksetzen behält Optionen |
| C1 | Foto hochladen | Lokal | 172 Tests; live nicht geprüft | Upload im geschützten Stand |
| C2 | Foto frei verschieben, skalieren, beschneiden | Lokal **mit Lücke** | drei fehlgeschlagene Tests in `acrylic-photo-resolution.test.mjs` | vor der Beta grün oder fachlich entschieden |
| C3 | Logo | Live gesehen, Lokal | Reiter am Türschild; 35 Tests | SVG-Logo mit 12,99 € |
| C4 | Masken und Fotoebenen | Lokal | Test „original photo mask survives replacement …“; 38 Tests | Maskendesign bis Fertigungspaket |
| C5 | Überlappung nur als Hinweis | Lokal | Test „many overlaps produce only the single canvas note …“ | Hinweis ohne Sperre |
| D1 | Form, Größe, Befestigung wählbar | Live gesehen | Auswahlfelder vorhanden | je Profil alle Optionen durchschalten |
| D2 | Grundpreis im Editor gleich Warenkorb | Live | R 49,99 €, T 19,99 €, F 14,99 € in `/cart.js` | je Profil |
| D3 | Aufpreise | Lokal | Tests „native charged extras fail closed …“; 170 Preis-Tests; live nicht geprüft | 12 festgelegte Kombinationen |
| D4 | Mengenstaffel | Lokal | 29 Tests | Menge 5, 10, 25 |
| D5 | Bohrlöcher fest | Lokal | Test „… fixed drilling within 0.1 mm“ | Bohrbild je Befestigung |
| D6 | Schiefer: Imprägnierung, Ständer, Zubehör | Offen | Zubehörregister nicht auf Katalog-main; Ständer-Kennzeichen bei 17 von 48 Platten regelwidrig (#265) | nach Klärung |
| D7 | Preis kommt nur vom Server | Lokal | Test „malformed quantities and browser supplied prices/cart IDs rejected before offer“ | Negativtest gegen die Beta |
| E1 | Werkstatt: bearbeiten und synchronisieren | Lokal | 28 Tests; live nicht geprüft | Änderung bis Shop |
| E2 | Serienanlage | Lokal | 25 Tests | Serie 20 × 2 |
| E3 | Freigegebene Version an der Position | Live, Lokal | `_gravuru_rev`, `_gravuru_config`; 179 Tests | alte Revision wird abgewiesen |
| F1 | Richtige Variante | Live | eine Position, Menge 1, Preis wie Editor | je Profil |
| F2 | Angebot an der Position | Live | `_gravuru_offer` | manipuliertes Angebot wird abgewiesen |
| F3 | Vorschaubild ohne Umweg über das Gerät | Live | `cart/add.js` sendet 1,2–1,3 kB | bleibt so |
| F4 | Mehrere verschieden gestaltete Positionen | Offen für R15 live | heute nicht geprüft | zwei Gestaltungen derselben Variante |
| F5 | Bearbeiten aus dem Warenkorb | Live, Lokal | 3 Läufe; Test „edit identifies the exact current cart line …“ | Bearbeiten ändert nur die eigene Zeile |
| F6 | Warenkorb ohne Seitenwechsel | Offen | heute lädt die Warenkorb-Seite | Entscheidung Chris |
| G1 | Bestelleingang | Lokal | Tests „webhook authenticates exact raw bytes …“, „order intake admits only the exact configuration revision …“ | bezahlt, unbezahlt, storniert |
| G2 | Storno und Erstattung | Lokal | `order-refund-intake.test.mjs`; live nicht geprüft | Teilerstattung |
| G3 | Fertigungspaket | Lokal | `acrylic-engraving-proof.mjs`: Kontur-PDF 1:1, Gravur-SVG, gesicherte Gestaltung, Prüf-PDF; beim Klingelschild zusätzlich Schnitt-PDF und -SVG für Träger und Auflage | Paket aus Testbestellung |
| G4 | Dateiverweise an Bestellung #1017 | Historisch | sieben Verweise (PDF 1:1, Entwurf, Gravur-Vektoren, Acryl-Schnitt, Edelstahl-Bohrbild, bearbeitbarer Entwurf, Produktzuordnung), Profilversion `modelle-live-20260919-v1` | siehe Hinweis unten |
| G5 | Nachfertigung desselben Stands | Lokal | 91 Tests zu unveränderlichen Ständen | alte Bestellung nach Vorlagenänderung |
| G6 | Probe an der Maschine | Offen | #265 | Muster |
| H1 | Bedienung am Handy und PC | Live | Bilder 01–09 | Aufnahmen je Paket |
| H2 | Tastatur und Zugänglichkeit | Lokal | 108 Tests; live nicht systematisch | Durchlauf nur mit Tastatur |
| H3 | Entwurf speichern und wieder aufrufen | Live gesehen, nicht bedient | Knopf „Entwurf speichern“ | Wiederaufruf nach einem Tag |

**Hinweis zu #1017.** Die Bestellung belegt, dass es Fertigungsdateien an der Bestellposition gab. Sie stammt aber aus dem früheren Weg: Die Dateien wurden im Kundengerät erzeugt und als öffentliche Shopify-Uploads angehängt. Heute trägt die Position nur Verweise, die Fertigungsdaten entstehen auf dem Server aus dem gesicherten Entwurf. Das halte ich für richtig. Was aus dem Gerät des Kunden kommt, darf nie Fertigungsquelle sein. Tempo sollte die Beta nicht über diesen alten Weg zurückholen.

**Die sechs Studio-Blocker aus #265, bezogen auf eine Beta auf R15-Basis:** B1 (Preisrechnung) und B2/B3 (alte Kaufstände, Nachfertigung) entfallen, weil R15 Preisfunktion und eigenen Bestellstand hat (lokal belegt, live offen). B5 (starres Fotofeld) entfällt, mit der Lücke C2. B4 (Speichergrenzen, Löschläufe) ist für R15 offen: Meine 20 Testentwürfe von heute liegen auf dem Server, ob der 45-Tage-Löschlauf greift, habe ich nicht geprüft. B6 (Schriftrechte) gilt unverändert.

## 6. Eigene Beta-Strategie (vor Abstimmung)

**Grundsatz:** Die Beta ist R15 plus Schalter, kein zweites System. Parität entsteht dadurch von selbst und wird durch einen automatischen Durchlauf je Profil bewiesen.

| Paket | Inhalt | Belegter Hebel | Berührt |
|---|---|---|---|
| **1 Warenkorb ohne Wartearbeit** | Checkout-Bild nicht im Klickweg abwarten. Angebot einmal auflösen statt dreimal. Entwurf sichern, sobald die Übersicht aufgeht (V3 ist gebaut, aber aus). | 1,8–3,1 s Bildwartezeit; beim Türschild rund 1 s für wiederholtes Auflösen; 1,5–6,6 s Entwurf | Server, Loader |
| **2 Designs lokal** | Die Designs einer Größe kommen als festes Paket mit dem Start. Wechsel im Gerät, ohne Neuladen. Der Server bindet das gewählte Design beim Warenkorb. | 6–7,5 s → rund 3 s am Handy, 2,2 s → 0,7 s am Desktop | Editor, Serververtrag |
| **3 Leichter Start** | Erst Produkt, Design und Textfelder aus einem festen Paket zeigen, die Werkzeuge danach laden. | 10–12 s am Handy sind Rechenarbeit, warm kaum besser | gemeinsamer Start |
| **4 Flüssiges Tippen** | Miniaturen nicht bei jedem Tastendruck neu zeichnen. | 1,3 s je Taste beim Klingelschild im Handyprofil | Editor |
| **5 Theme** | Produktseite entschlacken, Warenkorb an Ort und Stelle öffnen. | 2,3–4,6 s bis zum Bild, 2,4–2,8 s Warenkorb-Seite | Theme, Entscheidung Chris |

Reihenfolge nach Nutzen je Risiko: 1, 4, 2, 3. Paket 3 ist das größte und entscheidet über die 5 Sekunden. Ob dafür Bausteine aus Studio taugen (leichter Start, feste Vorlagenpakete), sollte Phase B am Code entscheiden. Das Rückgrat von Studio brauche ich dafür nicht.

**Drei wichtigste Risiken**

1. **Gemeinsame Laufzeit.** 85 Live-Produkte hängen am selben Editor. Jede Beschleunigung im Kern kann sie treffen. Deshalb Schalter, geschützte Adresse, Paritätsdurchlauf als Tor und Abstimmung mit Mika und Mikail.
2. **Integrität, wenn Arbeit aus dem Klickweg wandert.** Ein vorab gesicherter Entwurf kann älter sein als der letzte Stand. Der letzte Klick muss den Inhalt per Prüfsumme bestätigen, sonst wird neu gesichert. Der Preis bleibt allein beim Server.
3. **Tempo hängt an den Daten.** Das Klingelschild ist schnell, weil seine Daten klein sind. Schiefer mit Foto wird wieder schwer. Es braucht Obergrenzen je Profil (Startmodell, Entwurf) und einen Fotoweg im Hintergrund. Dazu kommen Blocker, die mit Tempo nichts zu tun haben: Schriftrechte, Schiefer-Stammdaten, die drei roten Fototests.

## 7. Was ich übernehme und welche Freigaben ich brauche

**Ich übernehme:**

1. Das Mess- und Paritätstor: diese Messreihe als wiederholbarer Lauf gegen jeden Beta-Stand, mit der Zeittabelle aus #265.
2. Den Paritätsdurchlauf für die drei Live-Profile und die Negativtests aus dem Auftrag (falscher Preis, fremde Kennung, alte Revision, unbezahlte oder stornierte Bestellung, manipulierte Daten).
3. Die Prüfung jedes Beta-Pakets auf Preis, Angebotsbindung, Versionierung, Datenhaltung und Schriften.
4. Die Nachverfolgung der sechs Blocker und der offenen Stammdatenfragen.

**Freigaben, die ich brauche:**

- **Chris:** weitere Messläufe im Live-Shop. Jeder Warenkorblauf legt einen Testentwurf und einen Wegwerf-Warenkorb an. Besser wäre eine geschützte Beta-Adresse oder der F02-Testshop.
- **Chris:** was mit den 20 Testentwürfen von heute geschehen soll. Ich lösche nichts ohne Ansage.
- **Mika und Mikail:** jede Änderung an gemeinsamem Start, Designwechsel und Übergabe.
- **Chris:** Theme (Warenkorb an Ort und Stelle, Produktseite).
- **Chris:** Leserechte auf Bestellungen im Testshop für die Negativtests zum Zahlungsstand.

## 8. Nebenwirkungen meiner Messung

20 Testentwürfe auf dem Konfi-Server (erkennbar am Text „abcde“), 20 Wegwerf-Warenkörbe in anonymen Browsersitzungen, keine Bestellung, keine Zahlung, kein Upload. Bestellung #1017 nur gelesen. Im Repository steht nur dieser Branch.

## 9. Dateien

- `2026-11-19-beta-267-claude-phase-a/messung/`: `messung.mjs`, `diagnose.mjs`, `lauf.sh`, `nachlauf.sh`, `auswertung.py`, Rohdaten `messung.jsonl` (32 Läufe) und `diagnose.jsonl` (3 Läufe, ohne Sitzungskennungen), `auswertung.md`.
- `2026-11-19-beta-267-claude-phase-a/bilder/`: neun Bildschirmaufnahmen, Handy und Desktop.

## 10. Nächster Schritt

Sobald Astra den ersten Beta-Stand nennt: dieselbe Messreihe und der Paritätsdurchlauf für R, T und F dagegen, Ergebnis in #267. Bis dahin stelle ich die drei Öffnungen ohne Bereitmeldung mit Netzprotokoll nach.
