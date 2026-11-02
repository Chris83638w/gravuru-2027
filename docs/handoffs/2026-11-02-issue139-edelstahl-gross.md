# Issue 139: Edelstahl 18×12 und 30×20 live

Codex, 02.11.2026. Chris hat die selbstständige Live-Umsetzung beider Bereiche im laufenden Chat ausdrücklich beauftragt. Quelle: [Issue 139 samt Kommentaren](https://github.com/Chris83638w/gravuru-2027/issues/139). Bestehende Vorlagen nach [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) übernommen; keine Motive, Preise, Maße oder Freigaben erfunden.

## Produkte und eigene Optionen

| Start | Größe | Shopify | Native Konfiguration |
| --- | --- | --- | --- |
| Pfote D32 | 18×12 | [16077799227772](https://gravuru-design.myshopify.com/products/tuerschild-abger-ecken-v2a-personalisiert-pfoten-18x12) | cfg_0ab7179f-bf0a-4cb6-a9b0-24557ebca8de r1 |
| Herzschlüssel D62 | 18×12 | [16077799326076](https://gravuru-design.myshopify.com/products/tuerschild-abger-ecken-v2a-personalisiert-schluessel-18x12) | cfg_a88114b5-847f-4b80-af5d-e4aa8e339a6d r1 |
| Herzen D65 | 30×20 | [16077799457148](https://gravuru-design.myshopify.com/products/tuerschild-abger-ecken-v2a-personalisiert-herzen-30x20) | cfg_049b4c26-d892-4266-902a-590d9e44a6d4 r1 |
| Haus und Herz D24 | 30×20 | [16077799555452](https://gravuru-design.myshopify.com/products/tuerschild-abger-ecken-v2a-personalisiert-haus-mit-herz-30x20) | cfg_f813188f-33f2-41e6-bdd8-25a9f069b536 r2 |

Die vier vorhandenen Produkt-IDs, Handles und bisherigen Grundvarianten wurden erhalten. 18×12 hat je fünf Befestigungen und 209 freigegebene Designs; 30×20 hat je sieben Befestigungen und 199 Designs. Insgesamt 24 Shopvarianten. Keine Funkklingel-, Foto- oder Logooptionen. Feste Größe, Startdesign, native Zuordnung und product.konfi gespeichert.

Preise in Cent aus steel-door-signs: 18×12 K00/KGL/KRA/B02/B02S = 2999/3298/3398/3248/3268; 30×20 zusätzlich B04/B04S = 7999/8298/8398/8248/8268/8288/8308. Mengen 3/5/10 erhalten 5/10/15 % auf den ganzen Stückpreis; zusätzliche Motive 169 Cent. Eigene app-gebundene Preisverträge nachgelesen. Alle Varianten gegen Shopify geprüft und eigenständige Katalog-Bestellfreigaben erfasst; keine Maschinenfreigabe.

## Produktseiten, Bilder und Suche

Vier neue Hauptbilder aus den echten Konfi-Startvorschauen generiert, als WebP 1536×1024 (382–407 kB) gespeichert. Individuelle Dateinamen mit fünf Suchbegriffen, beschreibende Alt-Texte ohne SKU. Alte Bilder erhalten; neue Datei-ID direkt zugeordnet und als erstes Bild nachgelesen. Quellen/Prompts im Bildmanifest.

Eigene Beschreibungen, Titel, SEO-CTA, Stichpunkte und Tags. 19 Attribute je Produkt exakt nachgelesen, darunter richtige Größen/Montage, Herstellerkontakt, Lieferzeit und Personalisierungshinweis aus den vorhandenen Shopangaben. Keine neue Rechtsprüfung behauptet. Die neue Vierergruppe teilt mit keinem der zehn Beschreibungen identische Fünfwortfolgen; im gesamten Zehnervergleich maximal vier gemeinsame Fünfwortfolgen zwischen zwei früheren Texten. Keine neue Keyword-Volumenrecherche behauptet.

Alle vier Produktseiten und die [Edelstahl-Collection](https://gravuru-design.myshopify.com/collections/familienschilder-aus-edelstahl) HTTP 200. Collection umfasst acht Edelstahlprodukte. ProductGroup mit verschachtelten Product-/Offer-Daten enthält alle 24 richtigen Preise und InStock; keine aggregateRating-Angabe erfunden. Die erste Prüfversion suchte nur ein direktes Product-Objekt und wurde auf die tatsächlich verschachtelte Struktur berichtigt.

## Echte Kundenwege und gefundene Fehler

- D32 Desktop: B02S, 1 × 32,68 Euro. Richtige Variante 58100820312444; Bearbeiten stellt Namen und Befestigung wieder her. Bedienbar nach 38,2 Sekunden.
- D62 Handy 390×844: K00, 29,99 Euro, Variante 57265914544508; Bearbeiten bestanden. Bedienbar nach 48,5 Sekunden.
- D65 Desktop: B04S, drei Stück, 78,93 Euro/Stück nach Rabatt, gesamt 236,79 Euro. Variante 58100822180220; Bearbeiten bestanden. Bedienbar nach 31,0 Sekunden.
- D24 Handy: K00, 79,99 Euro, Variante 57265914839420; erster Warenkorb-/Bearbeiten-Lauf bestanden, Bedienbarkeit 34,7 Sekunden. Dabei vertauschte Feldzuordnung in der Vorlage sichtbar: „Zuhause von“ war Name/Pflichtfeld, „Familie Hellwig“ Spruch. Katalog-PR 160 korrigiert genau diese zwei Feldkennungen; keine gestalterische Änderung. Neue native Revision 2 mit gleicher Varianten-/Preisliste, Revision 1 erhalten. Revision 2 anschließend ACTIVE und Online Store bestätigt; Handy-Test mit „Name: Koch“ bis Warenkorb 79,99 Euro und Wiederherstellung beim Bearbeiten bestanden, keine JavaScript-Ausnahme. Erster r2-Lauf brach nach 80 Sekunden Warenkorbwarten ab; Diagnosewiederholung mit längerem Beobachtungsfenster bestand. Editor im Wiederholungslauf nach 56,1 Sekunden bedienbar. Keine Behauptung einer behobenen Ladezeitstörung.

D24-Diagnose: Modellabruf zunächst 33,4 Sekunden, nach erneutem Öffnen 3,6 Sekunden; Gestaltungssicherung 22,3 Sekunden, Shop-Übergabedaten 14,7 Sekunden, Warenkorbabruf 4,5 Sekunden. Diese getrennten Netzwerkzeiten sind keine Gesamtzeit; die Ursache des ersten Timeouts ist damit nicht abschließend belegt.

Keine Browser-JavaScript-Ausnahmen in den bestandenen Abläufen. Einzelne HTTP 502/503 beim D32/D62-Lauf beobachtet; Wiederholung gelang. Die konkrete Ursache ist nicht abschließend belegt, daher kein dauerhaft fehlerfreier Betrieb behauptet. Ein lokaler Test wurde zuerst durch fehlende Netzwerkauflösung verhindert; erneut mit Netzwerkzugriff ausgeführt. Ein D32-Test änderte zunächst nur den Spruch und wurde korrekt am unersetzten Pflichtnamen gestoppt; Test auf tatsächliche Pflichtfelder berichtigt. Keine Zahlung/zusätzliche Bestellung in dieser Welle.

D24-Quellprüfung: SVG abgesehen von zwei Feldattributen und plattformüblichen Zeilenenden identisch; im nativen 199-Design-Plan exakt elf Änderungen (Feldkennungen/Pflichtzuordnung, daraus abgeleitete Löschrechte und Profilrevision). Alle sieben Preise/Varianten identisch. Vollbau 16 Familien einschließlich PDF/PNG/Excel bestanden. Katalog-main b5d8f28bc1b634412e628c2967fde587a92ff2fb seit 18:31:09 UTC sauber aktiv. Bereits gebundene ältere Produktrevisionen werden nicht nachträglich geändert; D24 in deren weiterer Galerie bleibt bis zur jeweiligen Neuübernahme auf dem alten Stand.

## Sicherungen und weiterer Auftrag

Private Belege: private/issue139-live-20261102-nachweis/wave-18x12-30x20. SQLite vor Import und vor Feldkorrektur jeweils gesichert/integritätsgeprüft; ursprüngliche Shopdaten/Preise, alte Revisionen und Bilder erhalten. Zwei unterbrochene Bindungsläufe ab gespeicherten Varianten fortgesetzt; ein kompletter Wiederanlauf mit dauerhaftem Protokoll erfolgreich, keine Produktdublette.

Issue 139 bleibt offen. Acht Edelstahl- plus zwei Acrylprodukte sind die bisherige Produktwelle, kein Nachweis für alle Größen/Linien. Weitere Türschildgrößen/Unterkategorien, AA/AS/SS, Grabstecker, AE und Schiefer, zusätzliche Testbestellungen je Linie, Filter/Google-Kanal/Tracking und echte Zahlungsbereitschaft offen. Schiefer-Serien-/Preis-/Bohrbildabweichung und 8×5-Mastergrößenwiderspruch bleiben gesondert. Rasseschilder mit fehlender Zielfreigabe werden nicht dadurch freigegeben.

Nächste Linie bereits ohne Datenänderung geplant: AA/AS/SS 21×7, D600/D606, je 26 freigegebene Designs und drei eigene Halterfarben. AA/AS 2098/2198/2198 Cent, SS 2298/2398/2398 Cent; zwei Ø8-Bohrungen, 10 mm Rand. Materialfarbe und Halterfarbe müssen beim Shopzuschnitt getrennt bleiben. Diese Planung ist noch keine Veröffentlichung.

## Versionierte Belege

[Messungen, Bindungen und Bildquellen](2026-11-02-issue139-edelstahl-gross/) sowie Kundenansichten [D32](2026-11-02-issue139-edelstahl-gross/D32-bearbeiten.png), [D62](2026-11-02-issue139-edelstahl-gross/D62-bearbeiten.png), [D65](2026-11-02-issue139-edelstahl-gross/D65-bearbeiten.png), [D24 Revision 2](2026-11-02-issue139-edelstahl-gross/D24-bearbeiten.png). Öffentliche Seitenprüfung fand vor der kurzen D24-Korrekturpause statt; ACTIVE/Publikation danach separat nachgelesen und echter Kundenweg bestanden.
