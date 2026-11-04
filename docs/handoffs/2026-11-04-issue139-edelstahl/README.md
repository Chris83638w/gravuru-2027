# #139 · Astra 1 · Code, Katalog und Edelstahl-Entwürfe · 04.11.2026

Auftrag: [Claude 6617870582](https://github.com/Chris83638w/gravuru-2027/issues/139#issuecomment-6617870582) und Ergänzungen in #139; AGENTS auf main und ENTSCHEIDUNGEN aus PR 158 gelesen. **0 neue Produkte, 2 überarbeitete DRAFTs, 95 Variantenpreise aktualisiert, 0 Live-Änderungen, kein Deployment, keine neue Live-/Bestellfreigabe.**

## Merges

Code in Reihenfolge 159 → 164 → 163 → 158 → 162 → 165 auf main, letzter Merge **207c0c7e5cb628b70c7df051202e16afa4f6c004**. PR 164 Konflikt mit 159 auf getestete Kombination 5-mm-Schraubenkopf + 2-mm-Abstand aufgelöst (131c1d0e). Code-main und abschließend getesteter kumulativer Arbeitsstand haben identischen Dateibaum. Katalog 163 → 164 → 166 → 167 auf main, **9be5bd0d14d33e915744de679ea28e0ee16d5f79**. Code 160 und Katalog 162/165 (Schiefer) nicht gemergt.

## Prüfungen

Alle Stufen mit Build unter Linux / Node 24.22 / vorhandenem Python-Venv. Vollsuite: node --test --test-concurrency=4 --test-reporter=tap app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs.

| Stufe | Volltest | Nachprüfung |
|---|---:|---|
| Code 159 | 2108/2110 | Zwei zeitabhängige Ausfälle unter fünf parallelen Vollsuiten; betroffene Dateien separat 16/16 |
| +164 | 2112/2112 | vollständig grün |
| +163 | 2112/2114 | Zwei Ausfälle unter Parallelbelastung; betroffene Dateien 40/40 |
| +158/+162 | 2113/2114 | Export-Zeitlimit unter Parallelbelastung; Datei separat 15/15 |
| +165 (914…) | 2115/2115 | vollständig grün |
| +aktualisierte 158/165 (d233411e) | **2116/2116** | allein laufende Vollsuite, 0 Fehler, 0 übersprungen, ca. 380 s |

Keine Testgrenzen geändert. 158 enthält nur Dokumentation; die aktuelle Dokumentation ist im letzten Vollteststand enthalten. Katalogbau vor und nach den Merges/Designkorrekturen: 16 Familien gültig, Exit 0. 80 Grundplatten mit exakten Katalogmaßen und Bohrbildern überprüft; 160 SVG-/PNG-Ausgaben vorhanden. Vier korrigierte Designs: 3 passt, D14 wegen unveränderter 0,139-mm-Motivkontur prüfen. D57/D61 explizit in 8 × 5 cm abgewiesen, ab 9 × 6 cm dargestellt.

## Zwei vorhandene Shopify-Entwürfe aktualisiert

| Produkt | Änderung | Verifiziert |
|---|---|---|
| 16190784438652 – Türschild Edelstahl – Form und Größe selbst wählen | 94 von 404 Preisen nach Katalog; pricing v2 / Revision 2, extraLogoCents 1299; native Konfiguration cfg_ac514214-a313-4738-8008-00445ee1befd auf Revision 2 | Alle 404 Preise und nativen Bindungen gelesen und passend; DRAFT, 0 Veröffentlichungen, keine öffentliche URL |
| 16131897262460 – Edelstahl Familienschild mit Pusteblume · 30 × 20 cm | Variante 57491681771900: 79,99 → 74,99 € | Nachgelesen: 74,99 €, DRAFT, keine öffentliche URL |

Der zweite Altentwurf besitzt keine native Konfi-/Preisvertragsbindung; dort ausschließlich Preis geändert. Beim Sammelentwurf ist Foto weiter aus, Logo SVG mit 12,99 € vorbereitet. Die vorhandene Bestellfreigabe betrifft Revision 1; Revision 2 erhält hier **keine** Livefreigabe. Daher keine erfolgreiche Kunden-Warenkorb-/Bestell- oder Produktionsabnahme behauptet. Geometrien, Designs, Material und IDs der bestehenden Konfiguration bei Preisaktualisierung unverändert geprüft. Die Shopify-App besitzt ihre privaten Metafelder; deshalb erfolgte diese eng begrenzte Aktualisierung über ihre vorhandenen Servermodule. Keine Codebereitstellung.

Rückweg: serverseitige Sicherung vor Änderung unter private/astra1-steel-draft-prices-20261104/before.json, journal.jsonl und verified.json (keine Zugangsdaten). Alte Preise/Bindungen und native Revision 1 erhalten; Preisvertrag-v1-Historie erhalten. Ein Rückweg wurde vorbereitet, nicht ausgeführt. Keine Bestell- oder Kundendaten in diesem Bericht.

## Livebestand: nur Prüfliste

781 durch Edelstahl-Suche gefundene Produkte gelesen. **164 vorhandene ACTIVE/UNLISTED-Produkte / 1.530 Varianten** weichen bei den in dieser Preisrunde geänderten Katalogpositionen ab. Insgesamt weichen bei eindeutig zugeordneten Größen **223 Produkte / 5.452 Varianten** vom jetzigen Katalog ab; diese größere Zahl enthält ältere Abweichungen. [Vollständige Variantenliste](edelstahl-live-preisabweichungen.csv), Preise in Cent; priceRoundAffected trennt beide Gruppen.

**240 Produkte ohne eindeutige Zuordnung** stehen separat in [Zuordnung offen](edelstahl-zuordnung-offen.csv). Keine Maße geraten, insbesondere alte 8×5-SKUs nicht stillschweigend als 80×53,3 mm behandelt. Canonical GR-ES-SKUs, explizite Produktschnitte und exakte Alt-SKU-Maße verwendet. GR-C-Alias ausschließlich für Produkt 16121424773500 mit vorhandener Katalog-Quellenreferenz. Alle Varianten der zugeordneten Produkte vollständig gelesen; keine verbleibende Varianten-Paginierung. Keine Aussage, dass die Suchauswahl den gesamten Shopbestand abdeckt.

Die 19 Mindestgrößen-Designs aus Katalog 167 wurden gegen explizite Startdesign-Zuordnungen geprüft: dort keine zu kleine Zuordnung. **Ein SKU-Prüffall:** ACTIVE-Produkt **16078289797500**, „Türschild Edelstahl personalisiert – Haus 15×10 cm“, SKU TRE-V2A-15x10-D25. Es referenziert D25 unter 18×12; mangels expliziter Designbindung aktuelle Bild-/Konfi-Zuordnung vor einer Liveänderung prüfen. Produkte ohne eindeutige Design-ID sind nicht als fehlerfrei bestätigt. Keine Live-Bindung geändert.

### 164 Produkte der aktuellen Preisrunde

| Shopify-ID | Status | Titel | Betroffene Varianten |
|---|---|---|---:|
| 16077793329532 | ACTIVE | Türschild Edelstahl V2A personalisiert 6×2 cm | 1 |
| 16077793624444 | ACTIVE | Türschild Edelstahl V2A personalisiert – Haus 6×2 cm | 1 |
| 16077793755516 | ACTIVE | Türschild Edelstahl V2A personalisiert – Vogel Silhouette 6×2 cm | 1 |
| 16077799457148 | ACTIVE | Großes Familienschild mit Herzen – Edelstahl 30 × 20 cm | 7 |
| 16077799555452 | ACTIVE | Haustürschild mit Haus und Herz – Edelstahl 30 × 20 cm | 7 |
| 16077801947516 | ACTIVE | Türschild Quadrat Edelstahl V2A personalisiert – Laubbaum 20×20 cm | 1 |
| 16077802045820 | ACTIVE | Türschild Quadrat Edelstahl V2A personalisiert – Haus 20×20 cm | 1 |
| 16077802078588 | ACTIVE | Türschild Quadrat Edelstahl V2A personalisiert – Segelboot 20×20 cm | 1 |
| 16077802275196 | ACTIVE | Türschild Edelstahl V2A personalisiert 12×5,25 cm | 1 |
| 16077802439036 | ACTIVE | Türschild Edelstahl V2A personalisiert – Pusteblume 12×5,25 cm | 1 |
| 16077802504572 | ACTIVE | Türschild Edelstahl V2A personalisiert – Fußball-Symbol 12×5,25 cm | 1 |
| 16078290452860 | ACTIVE | Türschild Edelstahl personalisiert 30×20 cm | 1 |
| 16078290485628 | ACTIVE | Türschild Edelstahl personalisiert – Pfoten 30×20 cm | 1 |
| 16078290518396 | ACTIVE | Türschild Edelstahl personalisiert – Laubbaum 30×20 cm | 1 |
| 16078290616700 | ACTIVE | Türschild Edelstahl personalisiert – Anker 42×28 cm | 1 |
| 16078290813308 | ACTIVE | Türschild Edelstahl personalisiert – Herz-Punkte-Ornament 42×28 cm | 1 |
| 16078290846076 | ACTIVE | Türschild Edelstahl personalisiert – Dreieck 42×28 cm | 1 |
| 16120816861564 | UNLISTED | TEST – Variante B – Edelstahl – Rechteck | 33 |
| 16120817058172 | UNLISTED | TEST – Variante B – Edelstahl – Abgerundete Ecken R5 | 13 |
| 16120817090940 | UNLISTED | TEST – Variante B – Edelstahl – Quadrat | 8 |
| 16120817156476 | ACTIVE | TEST – Variante B – Edelstahl – Oval | 15 |
| 16120817189244 | UNLISTED | TEST – Variante B – Edelstahl – Ellipse | 5 |
| 16120835375484 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Zeitloses Versprechen | 13 |
| 16120835408252 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Unsere Initialen | 13 |
| 16120835473788 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Rosen für zwei | 13 |
| 16120835604860 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Herzen verbunden | 13 |
| 16120835801468 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Wir sagen Ja | 13 |
| 16120835867004 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Modern verheiratet | 13 |
| 16120836227452 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Tauben im Glück | 13 |
| 16120836260220 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Unser Heimathafen | 13 |
| 16120836325756 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Festlich verziert | 13 |
| 16120836391292 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Du und ich | 13 |
| 16120836456828 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Liebe wächst | 13 |
| 16120836489596 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Gemeinsam unterwegs | 13 |
| 16120836555132 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Unser großer Tag | 13 |
| 16120836686204 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Ringe und Namen | 13 |
| 16120836784508 | ACTIVE | Hochzeitsschild Edelstahl rechteckig 9 × 6 cm – Florale Ecken | 13 |
| 16120836850044 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Architektur klar | 13 |
| 16120836915580 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Medizinisch ruhig | 13 |
| 16120836948348 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Kanzlei klassisch | 13 |
| 16120837046652 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Salon mit Schwung | 13 |
| 16120837112188 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Fotografie Atelier | 13 |
| 16120837144956 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Handwerk mit Haltung | 13 |
| 16120837243260 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Yoga in Balance | 13 |
| 16120837374332 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Innenräume mit Sinn | 13 |
| 16120837505404 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Café Lieblingsplatz | 13 |
| 16120837669244 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Für Tier und Mensch | 13 |
| 16120837865852 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Floristik Blütenzeit | 13 |
| 16120837996924 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Nadel und Faden | 13 |
| 16120838127996 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Studio Typografie | 13 |
| 16120838226300 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Praxis in Bewegung | 13 |
| 16120838357372 | ACTIVE | Firmenschild Edelstahl rechteckig 9 × 6 cm – Beratung auf Augenhöhe | 13 |
| 16120838422908 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Ein Name genügt | 13 |
| 16120838521212 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Klar und persönlich | 13 |
| 16120838619516 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Zwei Haushalte | 13 |
| 16120838783356 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Post für uns | 13 |
| 16120838881660 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Bitte keine Werbung | 13 |
| 16120839045500 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Unser kleines Haus | 13 |
| 16120839176572 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Monogramm links | 13 |
| 16120839471484 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Lieblingspost | 13 |
| 16120839635324 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Zwei Namen ein Zuhause | 13 |
| 16120839766396 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Alle unter einem Dach | 13 |
| 16120839831932 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Wohnung drei | 13 |
| 16120839963004 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Feine Schrift | 13 |
| 16120840192380 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Mit vier Pfoten | 13 |
| 16120840323452 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Botanische Post | 13 |
| 16120840388988 | ACTIVE | Briefkastenschild Edelstahl rechteckig 9 × 6 cm – Postfach klassisch | 13 |
| 16120840487292 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Herzlich willkommen | 13 |
| 16120840683900 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Versetzt und elegant | 13 |
| 16120840749436 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Zuhause mit Herz | 13 |
| 16120840913276 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Eingang links | 13 |
| 16120842125692 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Eingang rechts | 13 |
| 16120842223996 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Eingang oben | 13 |
| 16120842322300 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Eingang unten | 13 |
| 16120842355068 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Bitte bei uns klingeln | 13 |
| 16120842453372 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Namen untereinander | 5 |
| 16120842486140 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Tür auf fürs Glück | 13 |
| 16120842551676 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Unser Heimathafen | 13 |
| 16120842617212 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Hausnummer und Name | 13 |
| 16120842649980 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Blühender Eingang | 13 |
| 16120842715516 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Einfach ankommen | 13 |
| 16120842748284 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Lilie und Name | 13 |
| 16120842813820 | ACTIVE | Türschild Edelstahl rechteckig 9 × 6 cm – Willkommen im Gartenhaus | 13 |
| 16120842846588 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Die Klassiker | 13 |
| 16120842879356 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Familienglück im Schwung | 13 |
| 16120842977660 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Pusteblumenzeit | 13 |
| 16120843043196 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Unser Lebensbaum | 13 |
| 16120843075964 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Hier lebt das Glück | 13 |
| 16120843108732 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Unter bunten Wimpeln | 13 |
| 16120843141500 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Florale Familienbande | 13 |
| 16120843305340 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Ein Herz für uns | 13 |
| 16120843436412 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Alle Namen gehören dazu | 13 |
| 16120843600252 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Haus voller Liebe | 13 |
| 16120843731324 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Mit Hund und Herz | 13 |
| 16120844059004 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Ankerplatz Familie | 13 |
| 16120844157308 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Ornament und Tradition | 13 |
| 16120844255612 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Zusammen ist Zuhause | 13 |
| 16120844288380 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Schlichte Familieninitiale | 13 |
| 16120844353916 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Pur · untereinander | 13 |
| 16120844419452 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Fliegende Samen | 5 |
| 16120844452220 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Rosen am Namen | 5 |
| 16120844484988 | ACTIVE | Türschild Edelstahl oval 9 × 6 cm – Lebensbaum | 5 |
| 16120844517756 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Sonnenschein | 5 |
| 16120844550524 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Pur · versetzt | 13 |
| 16120845042044 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Einfachstrich · untereinander | 13 |
| 16120845140348 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Unser Haus gezeichnet | 5 |
| 16120845205884 | ACTIVE | Türschild Edelstahl oval 9 × 6 cm – Zuhause bei Vanessa | 5 |
| 16120845238652 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Herz unter unserem Dach | 5 |
| 16120845271420 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Haus mit Herzen | 5 |
| 16120845468028 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Einfachstrich · versetzt | 13 |
| 16120845926780 | ACTIVE | Türschild Edelstahl oval 9 × 6 cm – Klingel und Name | 5 |
| 16120845959548 | ACTIVE | Briefkastenschild Edelstahl oval 9 × 6 cm – Post für zwei | 5 |
| 16120845992316 | ACTIVE | Türschild mit Hundemotiv Edelstahl oval 9 × 6 cm – Willkommen mit Balou | 5 |
| 16120846025084 | ACTIVE | Türschild mit Hundemotiv Edelstahl oval 9 × 6 cm – Familie mit Sam | 5 |
| 16120846090620 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Doppelstrich · untereinander | 13 |
| 16120846221692 | ACTIVE | Familienschild Edelstahl rechteckig 9 × 6 cm – Doppelstrich · versetzt | 13 |
| 16120846254460 | ACTIVE | Türschild mit Hundemotiv Edelstahl oval 9 × 6 cm – Hund mit Leine | 5 |
| 16120846287228 | ACTIVE | Türschild mit Hundemotiv Edelstahl oval 9 × 6 cm – Pfote und Sammy | 5 |
| 16120846319996 | ACTIVE | Türschild mit Hundemotiv Edelstahl oval 9 × 6 cm – Zwei Pfoten und Lucky | 5 |
| 16120846352764 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Zuhause mit Millie | 5 |
| 16120846483836 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Namen versetzt | 5 |
| 16120846647676 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Hier leben wir mit Oskar | 5 |
| 16120846680444 | ACTIVE | Hochzeitsschild Edelstahl oval 9 × 6 cm – Unendlich verbunden | 5 |
| 16120846713212 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Drei Herzen | 5 |
| 16120846745980 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Kolibri | 5 |
| 16120846778748 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Ein Strich – untereinander | 5 |
| 16120846942588 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Ein Strich – versetzt | 5 |
| 16120846975356 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Linien oben und unten | 5 |
| 16120847073660 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Ankerplatz | 5 |
| 16120847106428 | ACTIVE | Türschild Edelstahl oval 9 × 6 cm – Vogel im Flug | 5 |
| 16120847139196 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Zwei Tauben | 5 |
| 16120847204732 | ACTIVE | Hochzeitsschild Edelstahl oval 9 × 6 cm – Tauben im Herz | 5 |
| 16120847237500 | ACTIVE | Türschild Edelstahl oval 9 × 6 cm – Kleiner Vogel | 5 |
| 16120847270268 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Segelboot | 5 |
| 16120847401340 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Heimathafen | 5 |
| 16120847434108 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Vogel auf dem Zweig | 5 |
| 16120847466876 | ACTIVE | Türschild Edelstahl oval 9 × 6 cm – Willkommen mit Vogelzweig | 5 |
| 16120847499644 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Schmetterlinge | 5 |
| 16120847532412 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Verschlungene Herzen | 5 |
| 16120847663484 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Herzbaum | 5 |
| 16120847761788 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Willkommen mit Pusteblume | 5 |
| 16120847794556 | ACTIVE | Hochzeitsschild Edelstahl oval 9 × 6 cm – Herz für zwei | 5 |
| 16120847827324 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Französische Lilie | 5 |
| 16120847860092 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Herzlinie über dem Namen | 5 |
| 16120847892860 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Geschwungene Zierlinie | 5 |
| 16120847958396 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Pusteblume mit Vögeln | 5 |
| 16120848253308 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Florale Herzranke | 5 |
| 16120848286076 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Hier lebt, liebt und lacht | 5 |
| 16120848318844 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Rosen unter dem Namen | 5 |
| 16120848351612 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Willkommen zu Hause | 5 |
| 16120848384380 | ACTIVE | Türschild Edelstahl oval 9 × 6 cm – Blüten am Namen | 5 |
| 16120848580988 | ACTIVE | Hochzeitsschild Edelstahl oval 9 × 6 cm – Herz mit Zweigen | 5 |
| 16120848613756 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Schlüssel zum Zuhause | 5 |
| 16120848646524 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Unsere Familie mit Vornamen | 5 |
| 16120848679292 | ACTIVE | Hochzeitsschild Edelstahl oval 9 × 6 cm – Mr. und Mrs. | 5 |
| 16120848777596 | ACTIVE | Hochzeitsschild Edelstahl oval 9 × 6 cm – Initialen mit Ringen | 5 |
| 16120848810364 | ACTIVE | Türschild Edelstahl oval 9 × 6 cm – Eingang links | 5 |
| 16120848843132 | ACTIVE | Türschild Edelstahl oval 9 × 6 cm – Eingang rechts | 5 |
| 16120848875900 | ACTIVE | Türschild Edelstahl oval 9 × 6 cm – Eingang oben | 5 |
| 16120849006972 | ACTIVE | Türschild Edelstahl oval 9 × 6 cm – Eingang unten | 5 |
| 16120849039740 | ACTIVE | Türschild Edelstahl oval 9 × 6 cm – Kein Eingang | 5 |
| 16120849072508 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Doppelstrich – untereinander | 5 |
| 16120849105276 | ACTIVE | Familienschild Edelstahl oval 9 × 6 cm – Doppelstrich – versetzt | 5 |
| 16121424773500 | ACTIVE | Edelstahlschild selbst gestalten – Variante C | 74 |

## Offen und nächste Schritte

[Katalog-PR #170](https://github.com/Chris83638w/gravuru-katalog./pull/170) für zwei Schriften und D57/D61 samt JPG-Originalvergleich/Kontaktbogen separat zur Claude-Prüfung. Welcome-Originalfont fehlt; dessen linke Darstellung ist ausdrücklich nur Layoutreferenz. D14-Motivwarnung bleibt offen. Live-Preisübernahme, Deployment und neue Live-/Bestellfreigabe erst nach Chris' Satz. Die unveröffentlichten Entwürfe sind fachlich aktualisiert, aber nicht als produktionsabgenommen dargestellt.

## Nachtrag #168: Filigran-Mindestfläche

[Claudes Ergänzung 6619122090](https://github.com/Chris83638w/gravuru-2027/issues/139#issuecomment-6619122090) ebenfalls erledigt: Katalog #168 nach Code #165 gemergt, Commit **3c6051fbbc7904969948950fae12cae2ae663f30**. Alle 287 Dateien im PR geprüft: ausschließlich mindestFlaecheCm2 54 / mindestGroesse ergänzt. Unter Linux **3.157 Kombinationen aus 287 Designs und allen 11 Familiengrößen unter 54 cm² korrekt gesperrt**. Finaler Metadatenbau: 16 Familien, Exit 0. Code-Volltest 2.116/2.116 enthält bereits die dafür erforderliche neue Sperrlogik.

Zusätzlicher Shopabgleich über alle 781 Suchtreffer einschließlich Entwürfen: keine zu kleine explizite Startdesign-Zuordnung; **acht bestehende ACTIVE-Produkte mit entsprechender Alt-SKU**. Die aktuelle Bild-/Konfi-Bindung vor einer Livekorrektur prüfen; dies sind nachvollziehbare SKU-Prüffälle, keine behauptete End-to-End-Zuordnung. [Maschinenlesbarer Abgleich](edelstahl-filigran-pruefung.json). Nichts an diesen Produkten geändert.

| Shopify-ID | Status | Produkt | SKU | Fläche cm² |
|---|---|---|---|---:|
| 16077794541948 | ACTIVE | Türschild Abger. Ecken V2A personalisiert – Pusteblume 8×5 cm | TAE-V2A-8x5-D14 | 40 |
| 16077794705788 | ACTIVE | Türschild Abger. Ecken V2A personalisiert – Pfoten 8×5 cm | TAE-V2A-8x5-D33 | 40 |
| 16077800112508 | ACTIVE | Türschild Oval Edelstahl V2A personalisiert – Vögel 12×4 cm | TO-V2A-12x4-D48 | 48 |
| 16077800210812 | ACTIVE | Türschild Oval Edelstahl V2A personalisiert – Herzranke 12×4 cm | TO-V2A-12x4-D58 | 48 |
| 16077800407420 | ACTIVE | Türschild Oval Edelstahl V2A personalisiert – Pusteblume 12×4 cm | TO-V2A-12x4-D12 | 48 |
| 16077800440188 | ACTIVE | Türschild Oval Edelstahl V2A personalisiert – Ornament 12×4 cm | TO-V2A-12x4-D60 | 48 |
| 16077802242428 | ACTIVE | Türschild Edelstahl V2A personalisiert – Schlüssel 8×3,5 cm | TRE-V2A-8x3,5-D62 | 28 |
| 16077803291004 | ACTIVE | Türschild Edelstahl V2A personalisiert – Pfoten 9×3 cm | TRE-V2A-9x3-D33 | 27 |
