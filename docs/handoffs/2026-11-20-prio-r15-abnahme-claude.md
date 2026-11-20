# #267 · Prio-R15 für den Ring mit Shopify-Warenkorb: Ausgangslage vor der Abnahme (Claude, 20.11.2026)

Auftrag: [koordinierter Auftrag von Chris in #267](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7031593545), Abschnitt „Claude – unabhängige Abnahme“. Reihenfolge laut Auftrag: (1) richtige Prio-R15-Oberfläche, (2) Ring und Shopify-Warenkorb, (3) sichere Bestellung und Fertigung, (4) Tempo.

Dieser Bericht hält die Ausgangslage fest und legt den Maßstab für die Abnahme offen. Während der Prüfung hat Astra eine geschützte Prüfseite und die Testbestellung #1035 aus der Prio-Ansicht des Rings gemeldet. Die Bestellung habe ich gelesen. Die Prüfseite kann ich nicht öffnen: Ohne Anmeldung antwortet sie mit 401, ich habe keinen Zugang und erfrage keine Kennwörter (N). Dieselbe Ansicht erreiche ich über den Shop mit der Kennung an meiner eigenen Anfrage.

**Nur gelesen.** Ich habe die Referenz, zwei Produktseiten und den Editor geöffnet, nichts gespeichert, keinen Warenkorb angelegt und nichts bestellt. Die beiden Testbestellungen habe ich in Shopify gelesen. Keine Änderung an Shop, Theme, Server, Preisen oder den Branches der Teams. **Keine Freigabe durch diese Prüfung.**

Kennzeichnung: **S** = selbst reproduziert · **F** = fremder Bericht · **N** = nicht prüfbar.

## Ergebnis

1. **Der Ring hat im Shop eine andere Bedienleiste als die Referenz, weil seiner Produktseite die Prio-Kennung fehlt** (S). Das Edelstahl-Türschild trägt sie und öffnet die Prio-Oberfläche.
2. **Das war schon gestern Mittag so**, vor allen Live-Änderungen (S, mein Bild aus Phase A). Astra hat in der Nacht keine alte Oberfläche eingesetzt.
3. **Mit der Kennung öffnet der Ring heute schon die Prio-Oberfläche mit seinen eigenen Daten** (S, nur in meinem Prüfbrowser): 16 Ring-Designs, drei Formate mit Preisen, Klingelposition, vier Rahmen, fünf Befestigungen mit Aufpreisen, zwei Acrylfarben. Der Schritt ist also klein. Den Warenkorb aus dieser Ansicht habe ich nicht selbst ausgelöst. Astras Testbestellung #1035 stammt aus ihr: Die Bearbeiten-Adresse beider Positionen endet auf `ui=prio-r15` (S gelesen).
4. **Die Prio-Oberfläche im Shop weicht an drei Stellen von der Referenz ab** (S). Das muss Chris entscheiden.
5. **Die drei Testbestellungen #1033, #1034 und #1035 stimmen** (S): je zwei Positionen derselben Variante zu 49,99 €, eigene Bilder, eigene Revisionen. Die zwei bestellten Bilder von #1035 habe ich abgerufen: Rahmen, Gerätefoto, Text und Zierwinkel sind vollständig.
6. **Die Tempogewinne von gestern gelten für den Ring in der bisherigen Leiste.** Das Edelstahl-Türschild in der Prio-Oberfläche war in meiner Messung vom 19.11. deutlich langsamer, und der Ring öffnete mit Prio-Kennung langsamer als ohne.

## Die vier Ansichten (S)

| | 1 Referenz | 2 Edelstahl-Türschild | 3 Ring heute | 4 Ring mit Kennung |
| --- | --- | --- | --- | --- |
| Adresse | `/konfi-demo/mobil-20261107-r15/22x14.html` | Produktseite im Shop | Produktseite im Shop | Produktseite im Shop, Kennung nur in meinem Prüfbrowser ergänzt |
| Kennung `#gravuru-konfi-presentation` auf der Seite | – | vorhanden, `ui: prio-r15` | **fehlt** | fehlt |
| Start-Adresse | – | endet auf `&ui=prio-r15` | ohne `ui` | von mir um `&ui=prio-r15` ergänzt |
| Oberfläche | Prio | Prio | andere Leiste | Prio |
| Editor-Paket | eigenes, eingefrorenes Paket vom 07.11. unter `/konfi-demo/…/_bundle/` | `/_acryl-bundle/editor-52542041…` | dasselbe wie 2 | dasselbe wie 2 |
| Warenkorb | abgeschaltet (laut Freigabevertrag, F) | Shopify, laut Astra geprüft (F) | Shopify, zwei Testbestellungen (S gelesen) | nicht geprüft |
| Produktdaten | Schiefer 22 × 14, 19,99 € | Edelstahl 12 × 8, 19,99 € | Ring 16 × 28, 49,99 € | Ring 16 × 28, 49,99 € |

![Vier Ansichten auf dem Handy](2026-11-20-prio-r15-abnahme-claude/bilder/01-vier-ansichten-handy.png)

![Vier Ansichten am PC](2026-11-20-prio-r15-abnahme-claude/bilder/02-vier-ansichten-pc.png)

## Der Ring war schon gestern so (S)

Links mein Bild aus Phase A vom 19.11. gegen 13 Uhr (Bukarest), vor der ersten Live-Änderung um 20:15 Uhr. Rechts heute. Die Leiste ist dieselbe. Neu ist nur, dass die Designkarten gefüllt sind.

![Ring gestern und heute](2026-11-20-prio-r15-abnahme-claude/bilder/04-ring-gestern-und-heute-pc.png)

## Ring mit Kennung: was schon da ist (S)

Geprüft in meinem Prüfbrowser auf PC und in Handybreite, ohne zu speichern.

| Bereich | Befund |
| --- | --- |
| Designs | 16 Ring-Designs, am PC alle sichtbaren Karten gezeichnet, „Strichdesign“ gewählt |
| Ausführung, Reiter Material | Acrylfarbe: 2 Werte |
| Ausführung, Reiter Größe | Format: Hochformat 49,99 €, Querformat 59,99 €, Länglich 69,99 € |
| Ausführung, Reiter Befestigung | Position der Klingel (unten, oben), Edelstahlrahmen (4 Werte), Befestigung (5 Werte, Aufpreise 5,99 / 4,99 / 4,99 / 3,69 €) |
| Text | Felder, Schrift, Größe, Ausrichtung; Griffe zum Ziehen, Drehen und Löschen |
| Motive | Suche und Kategorien |
| Fotos | kein Reiter, wie in der bisherigen Ring-Leiste |

![Ring und Edelstahl in der Prio-Oberfläche](2026-11-20-prio-r15-abnahme-claude/bilder/03-ring-und-edelstahl-prio-designs-ausfuehrung.png)

Kleinigkeit im vierten Bild der Handyreihe: Der runde Plus-Knopf verdeckt die Maßangabe „160 mm“ unter dem Schild.

**Nicht selbst ausgelöst:** Speichern, Warenkorb, Kasse und Bestellung aus dieser Ansicht. Dafür braucht es einen Schreibzugriff, den ich ohne Freigabe nicht mache. Gelesen habe ich Astras Testbestellung #1035 aus dieser Ansicht, siehe unten.

## Abweichungen zwischen Referenz und Prio im Shop (S)

| Stelle | Referenz | Prio im Shop (Edelstahl) |
| --- | --- | --- |
| Handy, Knopf unter dem Schild | Schaltfläche „Gestalten +“ | runder Knopf „+“ |
| Handy, Kopfzeile | „Zurück zum Produkt“ als Text, daneben das gravuru-Zeichen | „Zurück zum Produkt“ als umrandete Schaltfläche, kein Zeichen |
| PC, Werkzeuge | Rückgängig, Wiederholen, Ebenen, Speichern, Hilfe oben rechts | nur Speichern oben rechts; die übrigen stehen unten neben „Vollansicht“ und „Zurücksetzen“ |

Die Referenz lädt ein eigenes, am 07.11. eingefrorenes Paket. Der Shop lädt den heutigen Editor.

## Testbestellungen in Shopify gelesen (S)

| | #1033 | #1034 | #1035 |
| --- | --- | --- | --- |
| Angelegt | 19.11., 22:34 Uhr | 19.11., 22:37 Uhr | 20.11., 08:03 Uhr |
| Art | Test, Testzahlung, bezahlt, nicht versandt, nicht storniert | ebenso | ebenso |
| Summe | 99,98 € | 99,98 € | 99,98 € |
| Positionen | 2 × Variante `57471227756924`, Artikelnummer `FK-AV2A-16x28-1441`, je 49,99 € | ebenso | ebenso |
| Gestaltung | „Strichdesign“ mit „Haus Süd 27“, „Klar & modern“ mit „Haus Nord 12“ | ebenso | ebenso |
| Je Position | 15 Angaben; eigene Konfiguration, eigenes Angebot, eigenes Bild auf dem eigenen Server und eigenes Kassenbild bei Shopify | ebenso | ebenso |
| Ansicht | bisherige Leiste | bisherige Leiste | Prio (`ui=prio-r15` in der Bearbeiten-Adresse) |

![Bestellte Bilder aus #1035](2026-11-20-prio-r15-abnahme-claude/bilder/05-bestellung-1035-bestellte-bilder.png)

Auffällig in allen sechs Positionen: Im Gravurtext steht „Name: Haus Süd 27 · Text „Mustermann“: Mustermann · Text „12a“: 12a“. Die beiden unveränderten Beispieltexte sind mitbestellt. Die Angabe „Bearbeitbarer Entwurf“ hat keinen Unterstrich und enthält eine technische Kennung.

Gestern Mittag hatte die Ring-Position im Warenkorb 11 Angaben (S, Phase A), heute 15. Hinzugekommen sind „Bearbeitbarer Entwurf“, `_gravuru_motifs`, `_gravuru_uploads` und `_gravuru_revision`. Astra nennt dafür die Freigabe von Chris zur Preiszuordnung des Ring-Artikels (F).

## Live-Stand `b36a8eef` (S)

Branch `dev/astra-r15-live-267-20261119`: der bisherige Live-Code `9af3a1ac` plus elf einzelne Commits, 28 Dateien. Die Ständerregel für Schiefer und die Fototests sind nicht enthalten. Enthalten ist eine Änderung an der Bestellannahme (`order-intake.mjs`).

| Prüfung | Ergebnis |
| --- | --- |
| Gegenprobe Bestellung (Preis, Revision, zehn manipulierte Zustellungen, Storno) | unverändert richtig |
| SVG und Druck-PDF bei Wiederholung | bytegleich |
| Kontur-PDF bei Wiederholung | nicht bytegleich, wie schon vor den Änderungen |
| Gesamtsuite (Umfang wie `npm test`) | 2.743 von 2.751 bestanden, 4 übersprungen, 4 Fehler. Dieselben vier Tests schlagen am bisherigen Live-Code `9af3a1ac` fehl (drei zur Fotoauflösung, einer zur Werkstatt-Kopfzeile). Kein neuer Fehlschlag |

Stand B `83fa4bd3`: Gegenprobe unverändert richtig (S). Die Gesamtsuite für B folgt mit der Abnahme.

## Tempo: Ausgangswerte für den gewünschten Weg

Meine Messung vom 19.11. im Live-Shop, Handyprofil, Median aus drei Läufen (S). Alle Werte stammen von vor den Live-Änderungen.

| Messpunkt | Ring, bisherige Leiste | Ring mit Prio-Kennung | Edelstahl in Prio |
| --- | ---: | ---: | ---: |
| Tipp „Jetzt personalisieren“ bis Editor bedienbar | 10,6 s | 14,9 s | 11,4 s |
| Daten bis Editor bereit | 0,92 MB | 1,57 MB | 1,05 MB |
| Designwechsel | 2,8 bis 3,2 s, im Gerät | 2,9 bis 3,1 s, im Gerät | 6,9 bis 7,5 s, über den Server |
| Letzter Tipp bis Position im Warenkorb | 7,6 s | nicht gemessen | 14,9 s |
| davon vier eigene Serverschritte | 4,9 s | – | 12,4 s |

Am PC lag das Edelstahl-Türschild beim Warenkorb bei 10,8 s bis zur Position. Astra misst heute 12,07 s bis zum sichtbaren Bild (F). Die Änderungen von gestern haben diesen Weg demnach nicht spürbar beschleunigt.

## Maßstab für die Abnahme

Sobald Astra liefert, prüfe ich in dieser Reihenfolge. Für A und B gelten dieselben Punkte.

1. **Oberfläche.** Ring-Produktseite trägt die Kennung, Start-Adresse enthält `ui=prio-r15`, Editor zeigt die Prio-Leiste auf PC und Handy. Vergleichsbild mit Referenz und Edelstahl. Der Knopf unter dem Schild zeigt nur „+“. Die Material-Darstellung im Konfi bleibt wie heute: Edelstahl gebürstet, Acrylglas mit Kante und Glanz (Hinweis von Chris, 20.11., siehe unten).
2. **Ring-Daten.** 16 Designs, 3 Formate, 2 Positionen, 4 Rahmen, 5 Befestigungen, 2 Farben, 120 Varianten, Preise wie in Shopify. Texte, Motive frei bewegen und skalieren.
3. **Warenkorb.** Zwei Gestaltungen derselben Variante als getrennte Positionen, eigene vergrößerbare Bilder, richtiger Preis, Entfernen ja, Bearbeiten nein. Dasselbe Bild in der Kasse. Das bestellte Bild lege ich neben das Konfi-Bild, auch für das Material.
4. **Bestellung und Fertigung.** Testbestellung über die Testzahlung, in Shopify gelesen. Revision, Preis, SVG, PDF und Kontur passen zur Position.
5. **Tempo.** Edelstahl-Prio und Ring getrennt, PC und Handy, kalt und warm, mehrere Läufe. Echte Shop-Messung und Nachstellung getrennt ausgewiesen.

## Entscheidungen von Chris (20.11.2026, 08:15 Uhr, im Chat mit Claude)

1. Zum Knopf unter dem Schild, wörtlich: „nur ein + Zeichen“. Der Knopf zeigt also nur „+“, wie heute in der Prio-Ansicht im Shop. Zur Kopfzeile auf dem Handy und zur Lage der Werkzeuge am PC hat Chris nichts gesagt. Dort wird nichts geändert, solange keine andere Ansage kommt.
2. Zum unveränderten Beispieltext, wörtlich: „Ja, der Nachname soll geändert werden, der Kunde kann das aber auch übernehmen.“ Mein Verständnis: Steht im Nachnamen-Feld noch der Beispieltext, fragt der Konfi vor dem Warenkorb nach. Der Kunde kann ändern oder den Text ausdrücklich übernehmen. Es gibt keine Sperre.

3. Nachfrage von mir, ob das auch für Hausnummer und erste Zeile gilt. Chris um 08:17 Uhr, wörtlich: „ja auch da. Nur bei Familie natürlich nicht oder Willkommen, dass ist ja sehr allgemein“. Die Rückfrage gilt also auch für die unveränderte Hausnummer („12a“). Bei allgemeinen Wörtern wie „Familie“ oder „Willkommen“ gibt es keine Rückfrage.

Nicht entschieden und deshalb nicht einzubauen: andere Beispielangaben in anderen Produkten, zum Beispiel Vornamen, Straße oder Daten auf Gedenktafeln. Dafür braucht es vor dem Bau eine Liste der Beispielfelder je Produkt und die Bestätigung von Chris.

Die Rückfrage ist eine Änderung an der gemeinsamen R15-Bedienung. Sie läuft nach `PRIO-KONFI.md` über Mika in Abstimmung mit Mikail und kommt nach der Umstellung des Rings, nicht als Teil der Tempo-Patches.

## Hinweis von Chris zur Material-Darstellung (20.11.2026, 08:17 Uhr, im Chat mit Claude)

Chris wörtlich: „aber wir hatten auch mal die die Klingel realistischer gemacht. Das Edelstahl sieht echter aus und vor allem auch das Acrylglas“.

Quelle des damaligen Auftrags: [Übergabe vom 29.10.2026](2026-10-29-funkklingeln-aosu-auswahl-nachtrag.md), dort: „Zusätzlich soll die Edelstahlplatte realistisch erscheinen und Acrylglas mehr Tiefe/Glanz erhalten.“ Umgesetzt in Commit `dc11ca3c` (`doorbell-material-preview.mjs`): Edelstahl-Maserung als Bild hinter dem Acryl, Acrylkante aus der Stärke, Lichtverlauf und Reflex.

Geprüft habe ich drei Dinge.

1. **Im Konfi ist diese Darstellung heute da (S).** In der bisherigen Leiste und in der Prio-Ansicht, in der Vorschau und auf den Designkarten. Beide Ansichten nutzen dieselbe Zeichnung. Im Code ist sie seit dem 29.10. gleich geblieben: Die Farbverläufe für Stahl und Acryl in `studio-svg.mjs` sind zwischen `dc11ca3c` und dem Live-Stand `b36a8eef` zeichengleich. Geändert wurde nur die Datei der Maserung, am 16.11. von PNG (1.440.952 Bytes) auf WebP (97.754 Bytes). Bildvergleich beider Dateien: gleiche Maße 1536 × 1024, mittlere Abweichung 1,7 von 255 je Farbkanal, Kontrast 34,2 gegen 34,3.
2. **Im bestellten Bild fehlt die Edelstahl-Maserung (S).** Die zwei Bilder der Testbestellung #1035 zeigen den Rahmen glatt grau. Das Acrylglas sieht dort aus wie im Konfi.

   ![Konfi gegen bestelltes Bild](2026-11-20-prio-r15-abnahme-claude/bilder/06-edelstahl-konfi-gegen-bestelltes-bild.png)

   Ursache im Live-Code `b36a8eef` gelesen: Das Bild für den Warenkorb entsteht im Gerät des Kunden aus der Zeichnung. Dabei lädt der Browser keine fremden Bilddateien. `embedSurface` in `app/configurator/variant-m/material-surface.mjs` packt deshalb Bilder vorher in die Zeichnung, aber nur `config.materialSurface` und seit `14b53038` (19.11.) das Ring-Gerätefoto. Funkklingel-Produkte haben kein `materialSurface`. Die Maserung (`/_runtime/images/gravuru-edelstahl-feine-maserung-vorschau.50e74d27e1f6f494.webp`) wird nicht eingepackt, es bleibt der glatte Verlauf darunter.
3. **Einordnung: schon vorher vorhanden.** Am bisherigen Live-Code `9af3a1ac` packte `embedSurface` ebenfalls nur `config.materialSurface` ein. Kein neuer Fehler durch die Patches, kein Fehler an Daten, Preis oder Fertigung. Kein Blocker für die Ring-Umstellung.

Eigene Korrektur: Im Abschnitt „Testbestellungen in Shopify gelesen“ und in meinem Kommentar von heute Morgen habe ich die bestellten Bilder von #1035 als passend beschrieben. Die fehlende Maserung habe ich dabei nicht bemerkt.

Nicht geprüft (N): das bestellte Bild eines Edelstahl-Türschilds und anderer Funkklingel-Modelle. Nach dem gelesenen Code gilt der Weg für alle Funkklingel-Schilder, gesehen habe ich es nur am Ring.

## Offen bei Chris

- Soll die Edelstahl-Maserung auch ins bestellte Bild (Warenkorb, Kasse)? Meine Empfehlung: ja, mit Messung von Bildgröße und Zeit vorher und nachher, weil das Bild im Gerät des Kunden entsteht. Bis zur Entscheidung keine Bitte um Umbau.
- Liste weiterer Beispielangaben je Produkt (Vornamen, Straße, Daten), sobald die Rückfrage gebaut werden soll.
- Eigene Testwarenkörbe brauche ich vorerst nicht. Astras Testbestellungen lese ich in Shopify gegen und rufe die bestellten Bilder ab.

## Wiederholen

`node ansicht.mjs <demo|ring|edelstahl> <pc|mobil> [--prio] [--tiefe] [--reiter]` mit Chrome und Playwright. Das Skript öffnet nur Seiten und den Editor. `--prio` ergänzt die Kennung an der eigenen Anfrage. Rohwerte: [rohwerte/](2026-11-20-prio-r15-abnahme-claude/rohwerte/).
