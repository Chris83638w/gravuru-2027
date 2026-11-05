# Schiefer: Konfi-Anschluss und Datenaufbau, 05.11.2026

## Aktueller Nachtrag: Hundetest und Preisvertrag

Dieser Nachtrag ersetzt die Live-/Scope-Angaben des darunter erhaltenen Erstbefunds. Mikail hat den Test auf **22×14 und 30×20 cm, Hund ohne Foto** begrenzt und anschließend **alle 43 Vorlagen nach seiner Sichtprüfung** gewählt. Keine Katalogfreigabe wurde vorweggenommen. Das gemeinsame optionale Foto-Modul bleibt erhalten; die 43 ausgewählten Vorlagen enthalten keine Fotofelder.

- [22×14 cm prüfen](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/22x14.html)
- [30×20 cm prüfen](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/30x20.html)

Beide Seiten sind **Bedienprüfungen ohne Shop-Warenkorb**. 46 passende Hunde-Master im Originalkatalog, je Größe 43 nach geometrischer Passprüfung; D1060, D1083 und D1086 wegen Überständen ausgeschlossen. Die 22×14-Zuordnung stammt aus dem ursprünglichen `sizeTransfer.targetLabels` und Mikails Testauftrag; die bisherige Produktionshilfe `assignedSlateSizes` enthält 22×14 noch nicht. Keine gefälschten `freigabe`-/`ziele`-Einträge. Startdesign Bruno/D1000, Originalschriften und Originalmotive, Grundpreise 2.199/2.399 Cent. Der Testimport verwendet stabile Import-IDs und erzeugt zwei interne Produkte, keine Shopify-Produkte.

Aktive Serverlaufzeit: `private/mika-konfi-hundetest-20261105`, aus vollständiger vorhandener Laufzeit kopiert; bestehende Host-Anpassungen erhalten. Startup-SHA `8b1de55dc177f79cf35a47cbd4d75bca98ea75ea7532b12d89e8cb1c144d4d9d`, Bundle `editor-59e7c06a4e1ad9ed.mjs`. Astra-Integration plus Schieferregeln: Linux 64/64; abschließende Galerie-/Host-/Regeltests 21/21. Kopie der bisherigen Einstiegdatei als Rückweg; keine alte Datenbank über neue Kundendaten zurückkopieren.

Öffentliche Testseiten laden denselben nativen Editor. Designgalerie startet mobil kompakt: erste Designkarten sind bei 390×664 ohne Herunterscrollen sichtbar. Gemeinsame Originalbilder und Schriften werden über gehashte Ressourcen geladen. UTF-8 steht vor den eingebetteten Testdaten, damit das Sterbezeichen korrekt bleibt. Real geprüft: Bruno, 30×20 23,99 EUR, zusätzliches Motiv +1,69 EUR, Rückgängig zurück zum Grundpreis, klarer Ständer +13,99 EUR. Bohrbilder unverändert aus Katalog: 22×14 vier Millimeter / Randabstand 17 mm; 30×20 vier Millimeter / Randabstand 19 mm.

**Offener Befund:** Bruno kann bei zwei Bohrungen die linke Datumszeile mit dem Loch überlagern. Die vorhandene automatische Montage-Einpassung ist bislang ausdrücklich auf drei Metall-/Acrylfamilien begrenzt. Die Sichtprüfung ist deshalb noch keine Fertigungsfreigabe. Keine neuen Lochabstände oder Schraubenkopfmaße geraten.

### Vorbereiteter V3-Aufpreisvertrag

`gravuru-personalization-pricing/v3` ergänzt eine app-eigene Preistabelle `optionPrices`. Der Warenkorb übermittelt ausschließlich sortierte eindeutige Options-IDs in `_gravuru_options`; `-` bezeichnet ausdrücklich keine ausgewählten Zusätze. Checkbox-Preise müssen beim Binden exakt den gespeicherten Produktdaten entsprechen. Snapshot und Warenkorbangebot prüfen ausgewählte IDs, Werte, Beträge und Summe. Shopify errechnet den Zuschlag aus der app-eigenen Tabelle. V1/V2, historische Verträge, Logos, Rabattstaffeln, Cent-Rundung und geprüfte Checkout-Bilder bleiben erhalten.

174/174 lokale Tests bestanden: Cart-Personalisierung, acht Zubehörkombinationen bei beiden Grundpreisen, zusätzliche Motive, Mengen, hypothetische vorhandene Staffelverträge, Manipulationsfälle, Bestellannahme, gespeicherter Entwurf, Wiederöffnen und bisherige Verträge. Keine neuen Rabattstaffeln für Schiefer eingeführt. Bezahlte andere Eingabearten und Rückseitenzuschläge bleiben gesperrt, bis sie gesondert angebunden sind. Die neue gemeinsame Datei `ops/shopify/master-release/priced-options.mjs` muss mit der Serverlaufzeit ausgeliefert werden.

V3 ist zum Zeitpunkt dieses Eintrags **nicht auf Shopify veröffentlicht**. Frischer Readback am 05.11. bestätigt `gravuru-2027-issue139-pricing-20261102-v1`, Version `1191284113409`, als aktiv. Das ältere Projekt `konfigurator-master-20261030/shopify-project` ist daher keine ungeprüfte Releasegrundlage. Erst vollständiges aktives App-Projekt sichern/vergleichen, isoliert kompilieren, Kandidat ohne Release, danach gezielte Auslieferung und echter Shop-Warenkorbtest. Sichtfreigabe aller 43 durch Mikail weiterhin offen. Abstimmung über #168; kein paralleler Neuaufbau der Designs.

## Historischer Erstbefund vor der heutigen Integration

## Auftrag und Quelle

Mikail beauftragt im eigenen Chat die Übernahme des neuesten Astra-Konfis, eine genaue Prüfung am Desktop/Handy und eine erste kaufbare Produktgruppe **Schiefer-Gedenktafeln einschließlich geprüftem Warenkorb**. Zunächst eigener Shopify-Shop; der Anschluss soll später erweiterbar sein. Abstimmung über [Postfach #168](https://github.com/Chris83638w/gravuru-2027/issues/168), keine parallele Designproduktion.

**Zusätzliche Anweisung vom 05.11.:** Auswahlmöglichkeiten im ersten Modul (Format, Größe, Ausführung) vor ihrer Übernahme konkret vorlegen und vom Nutzer bestätigen lassen. Vorhandene Standardwerte sind keine neue Freigabe. Mikail hat anschließend **Tiere zuerst – vorhandene freigegebene Vorlagen** gewählt und die konkret vorgelegten Optionen für Naturschiefer 22×14 cm mit **„alles richtig.“** bestätigt: ohne Befestigung; 2/4 Löcher, jeweils auch mit Schrauben; 2/4 Abstandshalter in Edelstahl/Schwarz/Bronze/Gold/Weiß; Silikon; klare/schwarze Acrylständer.

Basis: Astra [PR #177](https://github.com/Chris83638w/gravuru-2027/pull/177), Funktion `8b26efd`, Übergabe `b03ca250ab6d7aac8870384cc0a1ae2f073885b4`. Eigener Branch `dev/mika-konfi-anschluss-20261105`. #177 ist ein Entwurf auf #174, nicht der nachgewiesene Live-Stand. Letzte historische Live-Abnahme: `2206775`, Leuchtturm + Motiv = 21,68 EUR am 04.11.; ausdrücklich keine Abnahme von #177.

Designgrundlage bleibt der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). Keine neuen Designs, Ersatzschriften oder Freigaben erzeugt.

## Belegter Fehler und eng begrenzte Korrektur

`slate-customer-rules.mjs` erkannte nur das ältere gemeinsame Thema `gedenken`. Der reale Katalog verwendet auch `gedenktafeln`, `tiergedenktafeln`, `hundegedenktafeln` und `katzengedenktafeln` (`themen.json`, Katalogstand `43fe1f23`). Dadurch wurden bei tatsächlichen Gedenktafeln Acrylständer entfernt und die Motivstartgruppe auf `home` gestellt.

Die Korrektur erkennt diese ausdrücklichen Katalog-IDs: Menschen → `remembranceHuman`, Tiere/Hunde/Katzen → `remembranceAnimal`. Das ältere `gedenken` behält seine vom Import bestimmte Zielgruppe. Keine Klassifizierung über Namensfragmente; das allgemeinere `andenkenschilder` wird nicht ungefragt zum Gedenktafeltyp erklärt.

Bereits im Chat ausdrücklich entschiedene Regeln bleiben: zusätzliche Motive 169 Cent; Acrylständer nur für Gedenktafeln, ausgenommen 600×300 und 300×600 mm; keine Ständer bei Monogrammen oder normalen Hundeschildern. Diese Korrektur führt keine neue Ausführung oder Preisregel ein. Sie ist noch nicht live übernommen.

## Produktdaten und Anschluss

Die vorhandene Vorbereitung enthält 48 physische Platten. Der derzeit freigegebene Importausschnitt enthält 10 Hauptprodukte mit 136 Varianten und 346 Designzuordnungen, verteilt auf drei Plattenformate. Sieben Hauptprodukte sind Tiergedenktafeln mit Foto auf Naturschiefer 220×140 mm. Menschen-Designs und zusätzliche Passformzuordnungen existieren in weiteren Katalogarbeiten; ihre vorhandenen Dateien werden nicht mit einer abgeschlossenen Produktfreigabe gleichgesetzt.

Bedienprüfung: vorhandenes Produkt `cfg_c251181d-c6b5-40a8-a25f-7293de231954`, Revision 1; Start `katalog-GT-S-22x14-D220` / Emma, 17 Hundedesigns, 28,99 EUR einschließlich eines Fotofelds. Alte vorbereitete Daten wurden für die Prüfung mit der aktuellen Kundenregel gelesen, nicht unverändert veröffentlicht.

Shopify ist erreichbar: GravuruDesign, `gravuru-design.myshopify.com`, Plus. Der vorhandene alte Menschenartikel `16138083107196` ist ACTIVE, hat aber ältere Varianten/Preise. Er ist kein Beleg für die Richtigkeit des neuen Imports. Vorbereitete neue Platten/Monogramm stehen als DRAFT. Kein Shopify-Schreibzugriff in diesem Prüfungspaket.

**Warenkorbgrenze:** `personalizationForSnapshot` in `cart-personalization.mjs` weist zusätzliche `fieldCents` und `backCents` ausdrücklich zurück. Silikon und Acrylständer sind im vorbereiteten Schiefermodell solche Zusatzfelder. Diese Preise erscheinen im Editor, sind damit aber noch nicht kaufbar angeschlossen. Bestätigte Kombinationen müssen entweder vollständig auf Shopify-Varianten gebunden oder über einen geprüften, versionierten Aufpreisvertrag angebunden werden. Reine Warenkorbtexte transportieren keinen belastbaren Preis.

## Datenaufbau: gemeinsam wiederverwenden

1. Ein Editor mit gemeinsamen Text-, Motiv- und Fotomodulen.
2. Ein Produktprofil je angebotener Auswahl: Material, physische Form und mm-Maße, erlaubte Befestigungen/Zusätze, Preise, Produktionsprofil, passende Designs und Startdesign.
3. Originale Grundplattenbilder, Schriften und Motive einmal verwalten und über stabile IDs/Hashes referenzieren. Verschiedene Materialien, Kanten oder tatsächlich verschiedene Sonderkonturen können verschiedene Originale brauchen.
4. Design = Anordnung von Text, Foto und Motiven. Eine neue Gestaltung benötigt keine neue Grundplatten-Masterdatei. Passende Größen müssen ohne Verzerrung geprüft werden.
5. Shopify-Anschluss als austauschbare Schicht für Produkt-/Varianten-IDs, verbindliche Preise, Warenkorb und Bestellstand. Versionierte Bestellsnapshots und abgeleitete Hauptbilder sind sinnvoll; sie sind keine neuen Original-Master.

Rechteck, Ellipse usw. lassen sich aus echten Maßen erzeugen. 90×60 und 400×300 mm haben verschiedene Seitenverhältnisse. Bei gleichem beispielhaften Lochdurchmesser 4 mm beträgt dessen Anteil an der Breite 4,44 % bzw. 1 %. Die Lochwirkung folgt der tatsächlichen Plattengröße; die Größe wird nicht durch willkürlich veränderte Löcher simuliert. Lochdurchmesser und Randabstände stammen weiterhin aus der Preis-/Geometrietabelle.

Der vorhandene Renderer arbeitet bereits mit mm-Geometrie und `diameter/2`; Materialvorschau und Fertigungskontur sind getrennt. Produktgruppen kopieren derzeit Konfigurationsdaten; Ressourcen sind teilweise inline eingebettet. Im geprüften vorbereiteten Vollmodell: 26 eingebettete Bildvorkommen, 19 verschiedene Bildinhalte. Die Materialfläche ist einmal je Konfiguration vorhanden; wiederholte Abstandshalterbilder verursachen weitere Datenkopien. Das belegt Optimierungspotenzial, nicht 26 Grundplattenkopien. Der echte Shop-Einstieg hat bereits Startdesign- und Schrift-Nachladen (`shop-start-model.mjs`, `shop-model-slim.mjs`); die Größe des lokalen Vollmodells darf nicht als gemessene Shop-Startlast ausgegeben werden.

Schnellster Weg: bestehendes Katalog-/Tabellenmodell → bestehender Import mit Prüfung und stabilen IDs → Shopify-API → echter Preis-/Warenkorbtest. Die Shell startet das Skript, die API schreibt Produkte; keine konkurrierenden Methoden. Für 48 Platten ist kein neuer Konfi-Baukasten nötig. Gemeinsame Medien auslagern/nachladen, ohne den ersten Verkauf durch eine große Neuarchitektur aufzuhalten.

## Ausgeführte Prüfungen

- 15/15: Schiefer-Kundenregeln und Produktgruppen, einschließlich der echten Themen-IDs, 60×30-Ausnahme, Zielgruppe und Motivpreisvertrag.
- 60/60: Astras geänderte Dialoge, Galerie-Nachladen, mobile Vorschau, Werkzeugleisten, Entscheidungshilfe, Bundle und Designwechsel.
- Build: `editor-589bddfcecfee489.mjs`, 142 Module, 16 Styles.
- Lokaler echter Browser mit Original-Schieferdaten: korrektes Startdesign Emma, 17 Hundedesigns, je Befestigungswahl ein Rechteckbild, kein zweites Fotomodul in Ausführung, kurze Abstandshalter-Beschriftung.
- 390×664: Textauswahl hält die Platte bei 330×210 px; Motive zunächst 18/44, Nachladen 36/44; Kategorie Pfoten 15/15. Preisfolge 28,99 → 30,68 → 32,37 EUR; ein Motiv entfernen → 30,68 EUR. Keine Bestellung ausgelöst.
- 375×548: Navigation und Warenkorbknopf sichtbar. Der direkte Prüfrahmen zeigt die interne Galerie; die tatsächliche Shop-Galerie und der Designwechsel über den Shop-Einstieg sind deshalb gesondert offen.
- Direkter Geometrie-Readback nach Wahl von zwei Bohrlöchern: SVG `viewBox="0 0 220 140"`, Kreise `(17,70,r=2)` und `(203,70,r=2)`. Das sind echte 4-mm-Löcher mit 17-mm-Randabstand. Wechsel Susi → Emma setzt das lokale Design ohne zusätzliche Rückfrage um; anschließend wieder 28,99 EUR ohne Zusatzmotiv/Befestigung.
- Vollständiger lokaler Testbefehl mit maximal vier parallelen Testdateien: 2.126 Tests, 2.044 bestanden, 77 Fehler, fünf übersprungen. Alle 77 Fehler erklärt: 73 Test-Fixtures riefen den fehlenden Alias `python3` auf, ein Excel-Test scheiterte an Windows-Textcodierung, drei Testdateien benötigten die noch nicht ausgecheckte `2026-10-22-shopify-7x2-hauptprodukte.json`.
- Prüfumgebung korrigiert, **sämtliche 29 betroffenen Testdateien erneut ausgeführt: 181/181 bestanden**, keine Fehler/Übersprünge. Python 3.12.14, private virtuelle Umgebung, Repo-Versionen der Python-Abhängigkeiten, `PYTHONUTF8=1`. Keine globale Python-Installation verändert und kein Anwendungscode zur Umgehung eines Tests angepasst. Der vollständige Befehl wurde danach nicht nochmals wiederholt; die ursprünglichen Fehler werden nicht rückwirkend als bestanden ausgegeben. Linux bleibt separat offen.
- Erster unbeschränkter Vollversuch wurde wegen Last beendet; fehlendes Verzeichnis `legacy-patches` danach nachgeladen. Dieser abgebrochene Lauf ist kein Nachweis.

Bedienbilder: [Desktop – Ausführung](schiefer-konfi-anschluss-20261105/desktop-ausfuehrung.png), [Handy – Motive](schiefer-konfi-anschluss-20261105/mobile-motive.png). Unveröffentlichter Prüfstand; die aufgelisteten Ausführungen wurden inzwischen bestätigt.

## Offen und genau nächster Schritt

Nutzerantworten sind eingetroffen (Tiere zuerst; Optionen bestätigt). Mikail hat sich erneut in Plesk angemeldet, im Chrome-Profil Mika. Aktueller Server-Readback bestätigt weiterhin `private/mika-konfi-motive-navigation-r2-20261104`, Bundle `editor-e8a5b0efbda2f2a6.mjs`, Startup-SHA `17e18c046f7f9aeafe22917bd982065f00acf87a4e1742c2f1ea38eb3ff9fdcc`, Node 24.22.2 und verfügbares Test-Python 3.11.18. Astras neues `mobile-preview-layout.mjs` fehlt noch in dieser aktiven Laufzeit. GitHub, Shopify und der Serverzugang funktionieren. Linux-Vollauf noch offen.

Nächster Schritt: bestätigte Kombinationen und Produktionsprofil aus vorhandenen Quellen festlegen, Warenkorbpreisbindung schließen, isolierten Serverstand prüfen, Desktop/Handy und echten Shopify-Warenkorb einschließlich Mengen-/Motiv-/Zubehörpreis sowie Wiederöffnen testen. Erst der erfolgreiche vollständige Weg belegt die erste kaufbare Gruppe. Keine doppelte Designarbeit durch Astra/Schiefer anfordern.
