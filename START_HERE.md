## Aktuell: Gleiche Acrylpreise in Konfi und Commerce-Zuordnung – 06.10.2026

Branch `task/acrylic-commerce-prices-20261006`, Basis `91541d6d331cb976196942b7c3ea2feb75117a4c` (Remote bestätigt). Die Commerce-Prüfung verwendet jetzt die bestehende versionierte Kalkulation statt einer zweiten Summe der Optionspreise. Damit werden große Sockel korrekt mit +100 Cent berücksichtigt: große Platte/Eiche/Wandhalterung **36,97 €**. Veraltete Preisbindungen werden auch direkt vor der Auswahl abgewiesen; Zusatzmotive/-fotos bleiben ohne bestätigte Aufpreis-Anbindung gesperrt.

**275 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell**, Cloud-Check 06.10.2026, 10:17–10:18 Uhr Europe/Berlin. [Prüfbericht](docs/dashboard-20261004/acryl-commerce-preise-cloud-report.json). Fünf gezielte neue Tests prüfen alle 28 Kombinationen, Mengen, geänderte Preisrevisionen, generische Produkte und gesperrte Aufpreise. Keine Shop-Verbindung oder Mutation; kein neuer Kundendialog. Nächster Schritt: native Acryl-Prüfstände in die lokale Warenkorb-/Testbestellprüfung übernehmen. Die folgenden Abschnitte sind historische Nachweise.

## Aktuell: Acryl-PDF aus dem unveränderlichen Prüfstand – 06.10.2026

Branch `task/acrylic-snapshot-output-20261006`, Basis `7b071fc64c6604affbdb5190bb1814d3ebf38427`. Dashboard-Prüfstand erzeugt native Acryl-PDF serverseitig aus gesicherten Textpfaden, Design- und Fotoquellen. Standard: PDF, 300 dpi, CMYK, RDG_WHITE nur unter Druck, keine Randzugabe; Mimaki/ZIP optional. Konturdownload, Vollfläche mit optionalem 1-mm-Rand und einmalige Spiegelung geprüft. Originalfoto und alte Ausgabe bleiben erhalten.

**270 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echter Browser Desktop/Handy/Tablet mit bearbeitetem Foto, beiden Exporten und Vergleich zur Konfi-Gestaltung bestanden; bisherige Formprodukt-/Testbestellstrecke erneut bestanden. [Nachweis und PDF-Vorschau](docs/dashboard-20261004/ACRYL-FERTIGUNG-AUS-PRUEFSTAND-20261006.md).

**Grenzen:** technische generische CMYK-Prüfung, noch keine ICC-/RIP-/Maschinenfreigabe oder echte Shopify-Bestellung. Native Acrylgravur und ausdrücklich nicht unterstützte Elementtypen werden abgewiesen. Keine Veröffentlichung; private Bestände bleiben außerhalb Git. Nächster Schritt: Preisparität der Acryl-Commerce-Zuordnung, danach native Bestellübergabe. Die folgenden Abschnitte sind historische Paketnachweise; die frühere Sperre der Acryl-Druck-PDF ist durch dieses Paket aufgehoben.

## Aktuell: Acryl-Konfi → unveränderlicher Werkstattprüfstand – 06.10.2026

Branch `task/acrylic-review-handoff-20261006`, Basis `8cb741d67fb867faefc70f97117a5f741fc5b705` (Remote bestätigt). Im bestehenden Acryl-Konfi nach „Gestaltung fertig“ jetzt „Für die Werkstattprüfung sichern“: natives Design, unveränderte Originalbilder, bearbeitete Bildfassung, Produktrevision, Schrift-/Motivquellen, Ausführung, Geometrie und serverberechneter Preis. Dashboard zeigt die gesicherte Gestaltung und Ausführung; ZIP/Originalfotos herunterladbar. Spätere Bearbeitungen bleiben getrennt, Wiederholungen erzeugen keine Doppelstände. Keine Umwandlung in ein Formprodukt.

**269 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echter Browser mit synthetischem Foto/Text und großer Platte/Eiche/Wandhalterung: 36,97 €, 7 mm Einstecktiefe, Desktop/Handy/Tablet bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-WERKSTATT-UEBERGABE-20261006.md).

**Grenzen:** Die gespeicherte PNG ist eine Browserreferenz, keine serverseitig reproduzierte Fertigungsdatei. Ausgabeaufträge und Shopify-Warenkorb sind für diese neue Acryl-Snapshotart ausdrücklich gesperrt; vorhandene Formprodukt-Ausgaben bleiben erhalten. Keine Veröffentlichung oder echte Bestellung. Private Daten liegen ausschließlich in der laufenden privaten Cloud-Aufgabe; GitHub sichert Code und synthetischen Nachweis, nicht eine dauerhafte gemeinsame Kundendatenbank. Nächster Code-Schritt: native Acryl-Fertigungsausgabe aus dem eingefrorenen Stand anbinden, ohne den älteren RGB-Commerce-Export als CMYK-Produktion auszugeben. Echte Shopify-App-Bindung und Maschinenabnahme separat offen. Folgende Abschnitte sind historische Nachweise.

## Aktuell: Gemeinsamer Konfi-Einstieg bis PDF/ZIP geprüft – 06.10.2026

Branch `task/konfi-form-completion-20261006`, Basis `3ddb7c4d6ba26f686a74bec0f680cec6b1354f36`. Formprodukte und Ausführungsgruppen öffnen jetzt den gemeinsamen Konfigurator-Einstieg mit Vorschau, Bearbeitungsreitern und integrierter Ausführungswahl. Vorhandener Acryl-Editor erhalten und erneut geprüft. Durchgehend: Excel → Kunde → unveränderlicher Werkstattprüfstand → Roland-PDF/Mimaki-ZIP → synthetische Testbestellung → neuer Produktentwurf ohne Kundenfoto. **268 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Gesamtnachweis, Bilder und genaue Grenzen](docs/dashboard-20261004/KONFI-GESAMTABLAUF-20261006.md).

Shopify-Link aus dem anderen Chat wiedergefunden und lesend bestätigt: `gravuru-design.myshopify.com`, Produkt `16138521641340` ist eine Schiefer-Grabtafel im Entwurf mit sieben Varianten. Nicht mit dem Acrylmuster gleichsetzen. Die Adresse fehlt nicht mehr. **Noch keine echte Shop-/Maschinenabnahme:** Testziel/App-Anbindung, Acryl-Warenkorbparität, Kundenkonto und reale Fertigungsprofile bleiben offen. Keine Shopify-Mutation, Veröffentlichung oder private Daten in Git. Nächster externer Schritt: konkretes Testziel und App-Anbindung freigeben; keine erneute Migrationsplanung. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Bestehenden Konfi angebunden geprüft – 06.10.2026

Branch `task/existing-konfi-binding-20261006`, Basis `84f649eab669486428c9450483605bbfd459660b`. Acryl-Dashboard öffnet den bestehenden Kundenkonfigurator; beide Editor-Vorschaulinks jetzt auf die gespeicherte Revision festgelegt und bei ungespeicherten Änderungen verborgen. Echter Browserlauf mit Dashboardänderung, späterer Revision und Neuladen des alten Links bestanden; Desktop/Handy/Tablet, keine JavaScript-Fehler. Fixture-Build **76 Ressourcen/1 Modell**. Die **268 Tests** des vorigen Pakets sind ein historischer Nachweis und wurden hier nicht wiederholt. [Prüfung und Grenzen](docs/dashboard-20261004/DASHBOARD-BESTEHENDER-KONFI.md).

**Nächster Schritt:** Freie Formprodukte in den vorhandenen Konfigurator einbinden; ihre bisherige separate Kunden-Testansicht ist dafür noch keine Abnahme. Danach durchgehender Kundenentwurf → Werkstatt → PDF/ZIP. Muster Acrylglasbild und separate Testseite unverändert; keine Veröffentlichung. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Excel bis Kundenkonfigurator zusammenhängend geprüft – 06.10.2026

Branch `task/excel-customer-flow-20261006`, Basis `e57a7defee4ff8e554f4f17c5beb0442120e224b`. Echte XLSX-/SVG-/PDF-Importe → drei Formprodukte → Design-Excel-Update → Gruppe aus Produktkatalog → alle drei Kundenausführungen, Texte speichern/neuladen und Designs wechseln. Spätere Preis-/Designänderung übernimmt ein alter Gruppenlink nicht still. Gefundene PDF-Rundungsabweichung bei maßgleicher Platzierung korrigiert, Originalmaß unverändert. **268 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; durchgehender Browserlauf Desktop/Handy/Tablet bestanden.** [Ergebnis, Bilder und wiederholbarer Ablauf](docs/dashboard-20261004/DASHBOARD-EXCEL-KUNDENABLAUF.md).

Nächster Schritt: Kundenentwurf → Werkstattprüfstand → PDF/ZIP-Ausgabe zusammenhängend abnehmen. Nur synthetische Prüfdaten; keine echte Bestellung oder Fertigungsfreigabe. Keine Veröffentlichung, kein Merge/PR; separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Designzuordnungen aus Excel bearbeiten – 06.10.2026

Branch `task/design-excel-export-20261006`, Basis `a06bab0cb0f3ec1eb1ef220992f4d39d1e6aa2e8`. Produktserien exportiert vorhandene Formprodukte mit Designnamen, IDs und Standardauswahl. Ohne neue Grafik bleiben Original, Platzierung, Kundenfelder und Rechte erhalten. Unveränderte Formprodukte werden übersprungen; Konflikte und Wiederaufnahme bleiben geprüft. **267 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echter Download/Bearbeitung/Reimport, Desktop/Handy/Tablet geprüft.** [Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-DESIGNZUORDNUNGEN-EXPORT.md).

Nächster Schritt: Tabellenablauf Produktanlage → Designzuordnung → Ausführungsgruppe → Kundenkonfigurator zusammenhängend prüfen. Keine privaten Bestände verwendet, keine Veröffentlichung, kein Merge/PR. Separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Ausführungen als ausgefüllte Excel bearbeiten – 06.10.2026

Branch `task/variant-excel-export-20261006`, Basis `61903f9ae655116f3c8b8e7ae774a7f19c0e96ea`. Ausführungen → Excel-Zuordnung exportiert ausgewählte Gruppen samt festen Produktständen und zusätzlicher Produktliste. Herunterladen → bearbeiten → prüfen → übernehmen im Browser geprüft; unveränderte Gruppen werden ohne neue Revision übersprungen. **263 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Handy/Tablet geprüft.** [Bedienung, Installation und Nachweis](docs/dashboard-20261004/DASHBOARD-AUSFUEHRUNGEN-EXPORT.md).

Neue Python-Anforderung für dynamische XLSX: `python3 -m pip install --target .local-data/python -r app/workshop/requirements-excel.txt`. Nächster Schritt: Designzuordnungen aus bestehenden Formprodukten für den Tabellenabgleich bereitstellen, ohne private Bilddateien oder Kundeninhalte zu exportieren. Kein Publish/Deploy, Merge, PR oder Zugriff auf private Bestände; bisherige Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Ausführungsgruppen per Excel zuordnen – 06.10.2026

Branch `task/variant-excel-20261006`, Basis `35e3cae6b34d6ef0daee099e0ada0f81bb63358d`. Neue XLSX-Vorlage mit **Gruppen**, **Varianten**, **Anleitung** und Oberfläche unter Ausführungen → Excel-Zuordnung. Vorschau, explizite Teilübernahme, gezielte Updates und Wiederaufnahme ohne doppelte Gruppen. Feste Produktrevisionen; ungenannte Ausführungen bleiben erhalten. **259 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Echter Excel-Upload/Download und Browserprüfung Desktop/Handy/Tablet bestanden.** [Vorlage, Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-AUSFUEHRUNGEN-EXCEL.md).

Nächster Schritt: vorhandene Gruppen und Produktreferenzen als befüllbare Excel-Datei exportieren, damit IDs/Revisionen nicht abgetippt werden müssen. Dieser Import verwendet bereits gespeicherte Produkte; keine automatische Größen-/Kundenfeldumrechnung. Kein Publish/Deploy, Merge, PR oder Zugriff auf private Bestände; separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Größen-/Materialausführungen verbinden – 06.10.2026

Branch `task/form-variants-20261006`, Basis `67205fa26b8b48fa02f5a0e3959a3f1dcddc91ed`. Backend verbindet vorbereitete freie Formprodukte zu einer gemeinsamen Kundenauswahl mit Standardausführung. Jede Größe/Materialkombination verweist ausdrücklich auf ihre Produktrevision mit passender Kontur, Bohrungen, Preis und Designs. Historie, Konflikte und Archivierung geprüft; alte Gruppenlinks übernehmen spätere Preise nicht still. **254 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browserprüfung Desktop/Handy/Tablet einschließlich Kundenwechsel und Konflikt.** [Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-AUSFUEHRUNGEN.md).

Nächster Schritt: Excel-Kindtabelle an diese geprüfte Ausführungszuordnung anschließen (noch offen). Keine automatische Größen-/Kundenfeldumrechnung. Kein Publish/Deploy, Merge, PR oder Zugriff auf private Bestände; separate Acryl-Testseite unverändert. Nachfolgende Abschnitte dokumentieren historische Pakete.

## Aktuell: Mehrere Designs je Formprodukt per Excel – 06.10.2026

Branch `task/batch-design-sheet-20261006`, Basis `d24d8297d8a751f7961d6b4c989b092783dca3a1`. Optionales Blatt **Designs** verbindet mehrere SVG/PDF-Seiten mit einer Produktzeile, ergänzt/ersetzt gezielte Designs und wählt ein Standarddesign. Bis 30 Designs pro Formprodukt; unberührte Kundenfelder/Rechte bleiben erhalten. Fehler blockieren das betroffene Produkt; Wiederholung und Updates bleiben revisionsgeschützt. **249 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Echte XLSX mit SVG und zwei PDF-Seiten, Desktop/Handy/Tablet und Kunden-Designwechsel geprüft.** [Bedienung, Aufnahmen und Nachweis](docs/dashboard-20261004/DASHBOARD-DESIGNTABELLE.md).

Nächster Schritt: separate Varianten-Kindtabelle mit expliziten Material-/Maßkombinationen und passender Designzuordnung. Keine automatische Variantenanlage durch diese Designzeilen. Kein Publish/Deploy, Merge oder Zugriff auf private Bestände; bestehende separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Vorhandene Produkte per Excel/CSV aktualisieren – 06.10.2026

Branch `task/batch-update-20261006`, Basis `5dc75f9e84db992e139cfc17ce43527601e07ea3`. Serienimport unterstützt ausdrücklich `action=update` mit Produkt-ID und erwartetem Stand. Leere Felder behalten Bestand; eigene Geometrie/Designrechte bleiben erhalten, kein Master wird neu darüberkopiert. Neue Revision unter gleicher ID; Wiederholung und zwischenzeitliche Bearbeitung gegen Überschreiben geschützt. **245 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte 22-Spalten-XLSX in Desktop/Handy/Tablet geprüft.** [Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-TABELLENAKTUALISIERUNG.md).

Nächster Schritt: offene Varianten-/Designzuordnung aus separaten Tabellen mit dem bestehenden Modell abgleichen. Kein Publish/Deploy, Merge oder Zugriff auf private Bestandsdaten. Folgende Abschnitte sind historische Paketnachweise.

## Aktuell: Materialgerechte Gravur für Edelstahl, Holz und Leder – 06.10.2026

Branch `task/material-engraving-preview-20261006`, Basis `725a7c62b9be6536f9bdd2cd502547424228e867`. Vorhandene fünf Materialreferenzen erneut angesehen; Gravur wirkt auf Edelstahl dunkel/neutral, auf Eiche/Buche/Kirsche/Leder dunkelbraun, abgestuft nach Quellhelligkeit/Alpha. Druck bewahrt Originalfarben. Backend, Produktkarten, Kundenbearbeitung und unveränderliche Ausgaben geprüft. **241 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browser Desktop/Handy/Tablet.** [Vergleichsbild und Nachweis](docs/dashboard-20261004/DASHBOARD-MATERIALGRAVUR.md).

Nächster Schritt: verbliebene Dashboard-Import-/Variantenabläufe mit dem dokumentierten Soll abgleichen. Schiefer-Rohlingreferenz, reale Maschinenprobe und echte Shopify-Teststrecke bleiben separat offen. Keine Veröffentlichung oder Änderung privater Bestände. Die folgenden Abschnitte sind historische Paketnachweise.

## Aktuell: Helle Acrylgravur statt Druckfarben – 06.10.2026

Branch `task/acrylic-engraving-preview-20261006`, Basis `150aa8ea5344f8577686b1ffdff5d40b8e77851f`. Gemeinsame Materialvorschau zeigt bei Gravur helle Acrylwirkung entsprechend Quellhelligkeit/Alpha; Druck behält Originalfarben. Weiße und transparente Quellbereiche bleiben ohne Gravur, Fotoabstufungen erhalten. Backend-/Kundenansicht einschließlich direkter Texteingabe geprüft; Originale und technische Ausgabe unverändert. **239 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** [Vergleichsbilder, Tonwertprüfung und Grenzen](docs/dashboard-20261004/DASHBOARD-ACRYLGRAVUR-VORSCHAU.md).

Historischer nächster Schritt: weitere Materialgravuren; im Paket oben abgeglichen. Reale Laser-/RIP-Probe und echte Shopify-Teststrecke bleiben offen. Kein Publish/Deploy oder Merge; bisherige separate Testseite nicht aktualisiert. Nachfolgende Pakete sind historische Nachweise.

## Aktuell: Matte UV-Aufdruckansicht und glänzender Hinterdruck – 06.10.2026

Branch `task/uv-print-surface-20261006`, Basis `0a0a7bf3d018ed00e687227724bf57810181298a`. Im Formprodukt-Backend ist die Druckansicht wählbar: vorne matt mit dezenten Druckpunkten oder hinter klarem Acryl mit Glasreflexion. Speichern/Neuladen und Kundenansicht geprüft. Vorhandene Produktstände bleiben erhalten; reine Vorschauwahl ohne Änderung von Druckparametern oder Spiegelung. **237 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browser Desktop/Handy/Tablet.** [Bilder und Nachweis](docs/dashboard-20261004/DASHBOARD-UV-DRUCKANSICHT.md).

Die Fragen zu Matt/Hochglanz und „UV-Markern“ sind geklärt. Historischer nächster Schritt: Acrylgravurvorschau; im Paket vom 06.10.2026 oben umgesetzt. Keine Veröffentlichung, kein Eingriff in private Bestände. Frühere Paketabschnitte darunter sind historische Nachweise.

## Aktuell: Formserien und vollflächiger Farbdruck – 05.10.2026

Branch `task/form-batch-20261005`, Basis `fdbb5be293a0517767d2f0f20a56b6b2b0281620`. Freie Formmaster jetzt im bestehenden Excel-/CSV-Serienimport: Material, Stärke, Verfahren, Szene, genaue Kontur und Kundenrechte vererben; Grundpreis und SVG/PDF-Design je Zeile zuordnen. Prüfen, partielle Anlage und Wiederaufnahme ohne Duplikate; direkte Formeditorlinks und mobile Ergebniskarten. **235 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Excel-/Browserprüfung Desktop/Handy/Tablet.** Vollflächige Farb-PDF mit Weiß, Bohrung und optionalem Außenrandüberdruck zusätzlich geprüft. [Ergebnis und farbiges Prüfbeispiel](docs/dashboard-20261004/DASHBOARD-FORMSERIEN.md).

Historischer nächster Schritt; am 06.10.2026 beantwortet und umgesetzt: matte Vorderdruckansicht mit feinen UV-Druckpunkten, glänzender Hinterdruck durch klares Acryl. Keine Veröffentlichung oder Maschinenfreigabe. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Acrylmaterialien und Szenen für Formprodukte – 05.10.2026

Branch `task/form-material-scenes-20261005`, Basis `a407c4114f3914d26f3a58baa8de4628a96161b0`. Klares/satiniertes/anthrazitfarbenes/schwarzes Acryl als dokumentierte 2D-Näherung; persistente Backend-Szenenauswahl und Kante aus tatsächlicher Produktstärke. Dieselbe Ansicht in Backend, Kunde, Vollbild, Produktkarte und Prüfstand. Produktübersicht lädt wieder (veraltetes Symbolziel korrigiert); Navigation ohne Seitenüberlauf. Geometrie/Bohrungen unverändert; Szene und Material bleiben aus der Druckdatei. **231 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Handy/Tablet und Transparenzpixel geprüft.** [Ergebnis, Materialherkunft, Aufnahmen und Grenzen](docs/dashboard-20261004/DASHBOARD-MATERIAL-SZENEN.md).

Keine Maschinen-/Livefreigabe; keine Veröffentlichung. Schiefer-Rohling und echte freigegebene Produktszenen für freie Formen bleiben offen. Nächster unabhängiger Schritt: weitere Material-/Form- und Stapelabläufe im Dashboard. Die folgenden Abschnitte dokumentieren frühere Arbeitspakete.

## Aktuell: Eigene Texte und Motive in Formprodukten – 05.10.2026

Branch `task/form-added-elements-20261005`, Basis `5dd07c49da473c309281d6203e600ecca9577f4d` (Produktcode `0265ed5ad83c05fd3d7569ccb522b75e8b464e94`). Kunden ergänzen eigene Texte und Motive aus der vorhandenen Bibliothek; freie Platzsuche, Farben/Drehung, direkte Bearbeitung, Löschen/Rückgängig und revisionsgeschütztes Speichern. Backend-Freigaben je Design, unveränderliche Prüfstände und PDF-/Vorlagenübernahme angeschlossen. **229 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Desktop/Mobil/Tablet und Touch geprüft.** [Ergebnis, Aufnahmen und Grenzen](docs/dashboard-20261004/DASHBOARD-EIGENE-ELEMENTE.md).

Bestehender Chat laut Nutzer wieder erreichbar; Sicherung und ausführliche Übergabe bleiben erhalten. Keine neue Umgebung oder Veröffentlichung. Nächste unabhängige Arbeit: verbleibende Material-/Szenendarstellung. Echte Shopify-Teststrecke und Maschinenabnahme bleiben offen; angefragte Store-Adresse laut Nutzer bereits in anderem Chat, hier nicht lesbar. Folgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: Projektzusammenfassung und vorsorgliche Sicherung – 05.10.2026

Nach einer vom Nutzer gemeldeten Chat-/Linkstörung ist der bestehende Chat laut dessen Rückmeldung wieder da. Wir arbeiten hier weiter; kein neuer Chat oder neue Cloud-Umgebung angelegt. [Detaillierte Projektübergabe mit allen Entscheidungen, offenen Punkten und Startanleitung](docs/chat-recovery-20261005/MIKAIL-PROJEKTUEBERGABE.md), [Sicherungsübersicht](docs/chat-recovery-20261005/README-ZUERST.md). Dokumentbranch `docs/chat-recovery-mika-20261005`, Produktbasis `0265ed5ad83c05fd3d7569ccb522b75e8b464e94` auf `task/form-direct-edit-20261005`, per Git frisch bestätigt. Keine Produktänderung und kein neuer Testlauf; letzter dokumentierter Nachweis bleibt 226/0/0, Build 76/1. Private Datenbanken/Browserentwürfe sind nicht Bestandteil der Quellcodesicherung. Die angefragte Shopify-Adresse wurde laut Nutzer bereits in einem anderen Chat angegeben; der genaue Wert ist hier nicht verfügbar. Nachfolgend frühere Paketabschlüsse.

## Aktueller gesicherter Arbeitsstand – 05.10.2026

Branch `task/form-direct-edit-20261005`, GitHub-Basis `2c932f013332f827ec7471aab1b8bbb42186ae6a`. Direkte Text-/Fotobearbeitung für Formprodukte mit großer Gesamtvorschau, ganzen Schrift-mm, Farbpunkten, Auswahlgriffen, expliziter Löschfreigabe, Abbrechen und Touch. Edelstahl erhalten; Eiche/Buche/Kirsche/Leder als separat abgeleitete leere Materialvorschauen ergänzt. **Cloud-Check: 226 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Desktop/Mobil/Tablet und echte Touch-Eingaben geprüft.** [Bedienung, Bilder, Prüfungen und Restumfang](docs/dashboard-20261004/DASHBOARD-DIREKTBEARBEITUNG-ABSCHLUSS.md).

Der Branch enthält die bisherige Verwaltung, Ausgabe- und synthetische Testbestellstrecke einschließlich Produktentwurf aus Bestellgestaltung. **Keine Live-/Maschinenfreigabe:** Echter Shopify-Checkout/Kundenkonto benötigt bestätigten Entwicklungsstore und sichere App-Anbindung; danach reale RIP-/Maschinenprobe. Weitere Formprodukt-Motive, Materialansichten/Szenen und vollständige UV-Originale bleiben im verlinkten Restumfang ausdrücklich offen. Keine neue Serverplanung, keine Veröffentlichung, keine privaten Daten in Git. Nächste nötige Nutzerangabe für den echten Shoptest: ausschließlich dessen `…myshopify.com`-Adresse. Die folgenden Abschnitte sind historische Pakete.

## Aktuell: Produktentwurf aus Bestellgestaltung – 05.10.2026

Branch `task/order-product-drafts-20261005`, GitHub-Basis `7786a685bb8d4e876805a5196f88280abdca601c`. In Testbestellungen lässt sich eine gesicherte Formprodukt-Gestaltung nach Vorschau als eigener Produktentwurf übernehmen: Layout, Farben, Schriftgrößen, Feldrechte und entfernte Felder bleiben erhalten. Beispieltexte wahlweise aus der Vorlage oder ausdrücklich aus der Gestaltung; Kundenfotos werden zu austauschbaren Fotobereichen. Originalprodukt und Bestellung bleiben unverändert; wiederholtes Anlegen erzeugt kein Duplikat. **222 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browser Desktop/Mobil/Tablet einschließlich Neuladen und Öffnen des Produkteditors.** [Nachweis und Aufnahmen](docs/dashboard-20261004/DASHBOARD-PRODUKT-AUS-BESTELLUNG.md).

Geprüft mit synthetischen signierten Testpositionen, keine echte Shopify-Bestellung. Neuer Entwurf bleibt privat und ohne Shop-Verknüpfung. Weitere Materialdarstellung und Acryl-Parität sind unabhängig weiterzuführen; tatsächlicher Shopify-Test wartet auf die bestätigte Store-Anbindung. Maschinen: Roland mit VersaWorks bestätigt, genauer Mimaki-RIP weiterhin offen. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Warenkorb-Übergabe im Backend – 05.10.2026

Branch `task/checkout-handoff-20261005`, GitHub-Basis `0785d0fe7bfe2f6266996382b09220139ddfd642`. Gesicherte Formprodukt-Gestaltungen können jetzt ohne Shell einer Shop-Variante zugeordnet und für den Test-Warenkorb vorbereitet werden. Feste Revision, Preis und Menge; private Gestaltung bleibt außerhalb des Warenkorbs. **219 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browser Desktop/Mobil/Tablet einschließlich Neuladen und nachfolgender Produktänderung.** [Nachweis und Aufnahme](docs/dashboard-20261004/DASHBOARD-WARENKORB-UEBERGABE.md).

**Nutzerbestätigung:** Roland LEF-200 und MO-240 mit VersaWorks. Für Mimaki 2513 EX sagte der Nutzer „die von Mimaki“; genauer Name und Version bleiben offen. RasterLink ist nicht als bestätigt eingetragen. Auswahlhilfe ohne Änderung vorhandener Profilstände.

Die Übergabe wurde lokal vorbereitet und ihr GraphQL-Schema geprüft; kein Warenkorb an einen Shop gesendet. Für die echte Teststrecke fehlen bestätigter Entwicklungsstore und dessen Anbindung. Nächster externer Schritt: nur dessen `…myshopify.com`-Adresse nennen; keine Zugangsdaten im Chat. Kundenkonto-Kaufberechtigung und Maschinenabnahme bleiben offen. Frühere Abschnitte sind historische Pakete.

## Aktuell: Signierte Testbestellungen – 05.10.2026

Branch `task/order-intake-20261005`, GitHub-Basis `a06d821bd5389016d92d0ff0087c7f066c4f864a`. Neue Backend-Ansicht für unveränderliche Testpositionen mit festem Formprodukt-, Preis- und Prüfstand. Empfang prüft die Signatur der Originalnachricht, Shop, Variante, Menge und serverseitigen Preis; mehrfache Zustellung dupliziert keine Position. **215 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browserprüfung Desktop/Mobil/Tablet inklusive Produktänderung und PDF-Download.** [Nachweis und Grenzen](docs/dashboard-20261004/DASHBOARD-TESTBESTELLUNGEN.md).

**Nur synthetische, signierte Testnachrichten geprüft; keine echte Shopify-Testbestellung.** Empfang standardmäßig deaktiviert, Live-Bestellungen gesperrt. Keine Kundenkonto-Downloadberechtigung oder Maschinenfreigabe. Nächster Schritt: Entwicklungsstore zuordnen und den tatsächlichen Test-Checkout anbinden; weitere unabhängige Dashboard-Arbeiten bleiben möglich. Store-Adresse und RIP-Namen sind angefragt, keine Zugangsdaten. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Shop-Vorbereitung und Umfangsabgleich – 05.10.2026

Branch `task/dashboard-readiness-20261005`, GitHub-Basis `82db3b5798ae9b27443e041f94c4517fd3b2f0a7`. Werkstatt → Shop vorbereiten zeigt feste Produktstände, Designs, SEO und Ausführungen mit bestehenden Preisregeln (28 Acrylkombinationen). JSON-Übergabe ohne Übertragung an Shopify. Formprodukte: Seitentitel/Kurzbeschreibung speichern; historische Preise bleiben unverändert. **211 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet einschließlich nachfolgender SEO-Bedienprüfung.** [Ergebnis und ehrlicher Umfangsabgleich](docs/dashboard-20261004/DASHBOARD-SHOPVORBEREITUNG.md).

**Nächster Schritt:** authentifizierte Bestellübernahme und unveränderliche Positionen vorbereiten. Echte Shopify-Testbestellung, Kaufberechtigung im Kundenkonto und Maschinenabnahme sind noch offen. Weitere Materialableitungen/UV-Originale stehen separat im Abgleich; das Gesamtprojekt ist nicht als vollständig abgenommen bezeichnet. Kein externer Dashboard-Publish, kein Live-Systemzugriff. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Technische Gravurausgabe – 05.10.2026

Branch `task/form-engraving-20261005`, GitHub-Basis `6a23acc56a7f98f629107dd4f8769a901a2af164`. Gesicherte Formprodukte: Graustufenraster aus Originalfotos oder echte Vektorformen/Schriftpfade, ohne Druckweiß. Standard PDF/300 dpi, Kontur separat im optionalen ZIP; einmalige Spiegelung, Profilvorgaben und persistente Ausgabeaufträge. Rasterbilder werden im Vektormodus ausdrücklich abgelehnt. **208 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browserablauf Desktop/Mobil/Tablet mit PDF-/ZIP-Download.** [Ergebnis und Grenzen](docs/dashboard-20261004/DASHBOARD-GRAVURPRUEFUNG.md).

**Nächster Schritt:** verbleibende Dashboard-, Kunden- und Bestellabläufe abgleichen und fortsetzen. Reale RIP-/ICC-/Material-/Maschinenabnahme fehlt; keine Produktionsfreigabe. Die drei genannten Druckmaschinen ersetzen kein Gravurmaschinenprofil. Kein externer Dashboard-Publish; Acrylmuster unverändert. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: Persistente Ausgabeaufträge – 05.10.2026

Branch `task/export-queue-20261005`, GitHub-Basis `720d0d1243375109cc237dac4ef9d7d87e416f0a`. Werkstatt → Ausgaben: Status, Verlauf, Wiederholung nach Fehler und gesicherter PDF-/ZIP-Download. Druckaufträge laufen nach Verlassen der Browserseite weiter; dieselbe private Datenbank erhält sie über Prozessneustarts. Doppelte Anforderungen und verspätete alte Ergebnisse überschreiben keine Ausgabe. **204 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browserablauf Desktop/Mobil/Tablet einschließlich PDF und ZIP geprüft.** [Ergebnis](docs/dashboard-20261004/DASHBOARD-AUSGABEAUFTRAEGE.md).

**Nächster Schritt:** Gravurausgabe ohne Druckweiß an dieselben unveränderlichen Prüfstände anbinden; danach weitere Dashboard-/Bestellabläufe. Maschinen bekannt: Roland LEF-200, Roland MO-240, Mimaki 2513 EX; RIP-/ICC-/Maschinenabnahme offen. Keine Bestellung, dauerhafte gemeinsame Ablage oder externe Dashboard-Veröffentlichung behauptet. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Versionierte Fertigungsprofile – 05.10.2026

Branch `task/production-profiles-20261005`, GitHub-Basis `62243a23ad8734a28c30f9f9552dfe0f1730b865`. Werkstatt → Fertigungsprofile: Druck-/Gravurvorgaben erstellen, ändern, historische Stände ansehen, kopieren und archivieren. Formprodukte binden eine feste Profilrevision passend zu Verfahren, Material und tatsächlicher Stärke. Prüfstände übernehmen Profilinhalt und Prüfsumme unveränderlich; die Druckausgabe startet mit diesen gesicherten Vorgaben. **201 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; vollständiger Cloud-Browserablauf Desktop/Mobil/Tablet mit PDF-Download geprüft.** [Ergebnis](docs/dashboard-20261004/DASHBOARD-FERTIGUNGSPROFILE.md).

**Bestätigte Maschinen (Nutzer, 05.10.):** Roland LEF-200, Roland MO-240, Mimaki 2513 EX. RIP-Software, konkrete Material-/ICC-Profile und reale Maschinenabnahme sind noch nicht benannt beziehungsweise bereitgestellt. Keine automatisch freigegebenen Maschinenprofile. **Nächster Schritt:** Persistente Ausgabeaufträge mit Status, Fehleranzeige und Wiederaufnahme; danach Gravurausgabe. Das Gesamtprojekt wird gemäß Nutzerauftrag weitergeführt. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Schriftpfade in der technischen Druck-PDF – 05.10.2026

Branch `task/form-vector-text-20261005`, GitHub-Basis `886a7573b91f7c25edbe491205435af8e2401416`. Explizite Textfelder gesicherter Formprodukte erscheinen jetzt als echte CMYK-Vektorpfade mit identischen Weißkonturen in der Prüf-PDF. Reihenfolge zu Fotos, Mehrzeiligkeit, vorhandene Schriftform, Kursivtransformation und einmalige Spiegelung bleiben erhalten. 300 dpi bleibt der Bildstandard; Schriftpfade sind davon unabhängig. Rezept v2 bewahrt zuvor gespeicherte v1-Dateien. **199 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Desktop-/Mobil-/Tabletprüfung und PDF-/ZIP-Downloads.** [Ergebnis und Grenzen](docs/dashboard-20261004/DASHBOARD-SCHRIFTPFADE.md).

**Nächster Schritt:** Versioniertes Fertigungsprofilmodell an den festen Prüfstand anbinden, ohne reale ICC-/Maschinenparameter zu erfinden. Importierte Designquellen (einschließlich darin fest enthaltener Schrift) und Fotos sind weiterhin gerastert; Gravurausgabe und Maschinenfreigabe bleiben offen. Kein externer Dashboard-Publish, keine Änderung des gesicherten Acrylmusters. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Technische Druckprüfung für Formprodukte – 05.10.2026

Branch `task/form-print-proof-20261005`, GitHub-Basis `2b2d75a2ecf1061275feffa76c7da9f90a3d9ba0`. Gesicherte Gestaltungen erhalten im Backend eine technische PDF-Ausgabe: CMYK/300 dpi, Roland `RDG_WHITE` oder Mimaki-Vektorweiß, standardmäßig nur unter bedruckten Elementen, optionaler 1-mm-Überdruck bei Außenrandkontakt und einmalige Rückseitenspiegelung. Originalfotos, freie Außenkontur und Bohrungen bleiben maßgeblich. PDF oder ZIP mit Originalen; erzeugte Varianten bleiben unveränderlich gespeichert. **197 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Cloud-Browserdownloads auf Desktop sowie Mobil-/Tabletprüfung.** [Ergebnis, Installation und Aufnahmen](docs/dashboard-20261004/DASHBOARD-DRUCKPRUEFUNG.md).

**Grenze:** technische Prüfung, keine Produktionsfreigabe. Farbgestaltung einschließlich Text ist in dieser PDF gerastert; Schriftpfade bleiben im gesicherten SVG. Weiß/Schnittkontur sind Vektoren. ICC-/Maschinenfreigabe und Gravurausgabe fehlen weiterhin. **Nächster Schritt:** Schrift-/Designvektoren in der Druckausgabe erhalten und das versionierte Fertigungsprofil daran anbinden. Keine erfundenen Maschinenparameter. Kein externer Dashboard-Publish; Acrylmuster erhalten. Nachfolgende Abschnitte sind historische Arbeitspakete.

## Aktuell: Unveränderliche Prüfstände im Backend – 05.10.2026

Branch `task/form-production-snapshots-20261005`, GitHub-Basis `280c773c72b55aefecdc0d5d6680fdd0cd07d663`. Gespeicherte Formprodukt-Kundenentwürfe können jetzt unveränderlich für die Werkstattprüfung gesichert werden. Neue Backend-Übersicht mit fester Gestaltung, Produkt-/Entwurfsrevision, Preis, Originalen, Prüfsummen und klaren Fertigungshindernissen. Downloads: reine 1:1-Kontur-PDF, vollständiges Prüfpaket und Originalfotos separat als ZIP. **194 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Desktop-/Mobil-/Tablet-Browserprüfung einschließlich Downloads.** [Ergebnis und Aufnahmen](docs/dashboard-20261004/DASHBOARD-PRUEFSTAENDE.md).

**Nächster Schritt:** Produktionsprofilmodell und technische Druck-/Gravur-Ausgabe an den festen Prüfstand anbinden; vorhandene Acryl-Exportmodule verwenden und freie Konturen ausdrücklich unterstützen. Reale Maschinen-/ICC-Freigaben, Zahlung/Shopify-Bestellbindung und gehostete Kunden-/Operatoranmeldung bleiben offen. Prüfstände sind keine Bestellungen oder druckfertigen PDFs. Kein externer Dashboard-Publish; Acrylmuster unverändert. Nachfolgende Abschnitte sind historische Arbeitspakete.

## Aktuell: Formprodukt-Kundenentwürfe und echte Übersichtsvorschauen – 05.10.2026

Branch `task/form-customer-editor-20261005`, GitHub-Basis `cb878ffaaf1f794f2aadb226b47dcc0f4f2091b6`. Gespeicherte Formprodukte öffnen jetzt einen eigenen privaten Kundenentwurf: Text/Schrift/ganze mm, Foto-Upload, Verschieben hinter festem Ausschnitt, Zoom/Drehung/Graustufen, Rückgängig und revisionsgeschütztes Speichern. Feldrechte werden serverseitig geprüft. Übersichtskarten zeigen das gespeicherte Design auf der vorhandenen Materialoberfläche. **193 Gesamttests bestanden; danach betroffene Prüfungen und echte Cloud-Browserabläufe erfolgreich. Build 76 Ressourcen/1 Modell.** [Umfang, Aufnahmen und Grenzen](docs/dashboard-20261004/DASHBOARD-FORMKUNDEN.md).

**Nächster Schritt:** Kundenentwurf mit unveränderlichem Bestell-/Produktionsstand verbinden; vorhandene Produktionsmodule wiederverwenden. Produktive Kundenanmeldung, Aufbewahrung und reale Maschinen-/Farbprofile bleiben offen. Die neue Ansicht läuft im geschützten Cloud-Entwicklungsserver; kein neuer extern erreichbarer Dashboard-Link und keine Shopveröffentlichung. Acrylmuster bleibt erhalten. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: Designs und Kundenfelder für Formprodukte – 05.10.2026

Branch `task/dashboard-form-designs-20261005`, GitHub-Basis `34bb395cfacba140a486bb987c8f90a98a90a736`. Bestehende SVG/PDF-Dateiablage für freie Formprodukte wiederverwendet: mehrere Designvorlagen, Originalmaß/proportionales Einpassen, Standarddesign, Textfelder mit vorhandenen Schriftpfaden/ganzen mm und explizite Fotobereiche. Material-/Designvorschau hält Originalkontur und Bohrungen frei. Gemeinsame Revisionen, Historie und Kopien bleiben erhalten. **191 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Cloud-Browserprüfung Desktop/Mobil/Tablet.** [Ergebnis und Aufnahmen](docs/dashboard-20261004/DASHBOARD-FORMDESIGNS.md).

**Nächster Schritt:** Formprodukt-Kundenansicht mit tatsächlichem Foto-Upload und serverseitiger Durchsetzung der gespeicherten Feldrechte anbinden. Fotobereiche sind bislang Backend-Platzhalter, keine fertige Bestell- oder Fertigungsstrecke. Kein Dashboard-Publish. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: Edelstahl-Oberfläche im Formprodukt – 05.10.2026

Branch `task/dashboard-material-preview-20261005`, GitHub-Basis `3d0d60480c283c19945ea8c534693f35830b5b19`. Materialansicht mit vorhandener reiner Edelstahlstruktur, umschaltbar zur Konturprüfung; originale Außenform und transparente Ausschnitte bleiben erhalten. Historische Stände berücksichtigen ihre Materialauswahl. Andere Materialien bleiben ausdrücklich ohne zugeordnete leere Oberfläche. **190 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet in Cloud-Chromium geprüft.** [Ansicht und Nachweis](docs/dashboard-20261004/DASHBOARD-MATERIALANSICHT.md).

**Nächster Schritt:** Designvorlagen und Kundenfelder an Formprodukte binden; weitere vorhandene Materialreferenzen getrennt zu leeren Oberflächen aufbereiten und sichtbar prüfen. Keine neue Materialstärke/Herstellerfreigabe abgeleitet, keine Veröffentlichung. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Formprodukte, Materialzuordnung und 1:1-Kontur-PDF – 05.10.2026

Branch `task/dashboard-form-products-20261005`, GitHub-Basis `7943804ad30a4e94e023c880d24ef9cec5d899a2`. Aus Konturvorlagen entstehen eigene Produktentwürfe in derselben Produktverwaltung, mit Material-/Stärkenangaben, eigenem Preis, unveränderlichen Revisionen, Historie/Kopie/Archiv und passender Vektor-Kontur-PDF. Acrylprodukte bleiben erhalten. **188 Gesamttests bestanden; anschließend 4 gezielte Formprodukt-/PDF-Tests bestanden. Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet tatsächlich geprüft.** [Ergebnis, Ansicht und PDF-Beispiel](docs/dashboard-20261004/DASHBOARD-FORMPRODUKTE.md).

**Nächster Schritt:** Designvorlagen und Kundenfelder an diese Formprodukte binden, ohne die Kontur zu verändern oder Gestaltungen zu verzerren. Formprodukte sind noch keine freigegebenen Kunden-/Fertigungsprodukte; Materialszene, Produktionsprofil und reale Maschinenabnahme bleiben offen. Kein Dashboard-Publish. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Formkonturen importieren und prüfen – 05.10.2026

Branch `task/dashboard-contour-import-20261005`, Basis `138dc8bbc3dc7f742d40f86fa813fc706a41ec26` (M02-Varianten, über GitHub bestätigt). Werkstatt → Formkonturen: geschlossene SVG-/PDF-Außenform mit Innenausschnitten in tatsächlichen mm importieren, Vorschau und unverändertes Original sichern, gespeicherte Vorlagen erneut öffnen. Bestehende Designs/Produkte unverändert. **185 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet mit synthetischen Konturdateien geprüft.** [Ergebnis, Installationsbefehl und Bilder](docs/dashboard-20261004/DASHBOARD-KONTUREN.md).

**Nächster Schritt:** Konturvorlage in das versionierte Material-/Formproduktmodell einbinden und dieselbe Geometrie in 2D-Vorschau und Produktionskontur nutzen. Importbibliothek ist fertig; freie Produkt-/Fertigungsanbindung und reale Maschinenabnahme bleiben offen. Kein Dashboard-Publish. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: M01 und M02-Variantensteuerung – 05.10.2026

Branch `task/dashboard-options-20261005`, Basis `092228adb0fbc6a14b0850cdeccee947c2c17a45` (M01-Karten/Verwaltungsaktionen, auf GitHub bestätigt). Zusätzlich in M02: verfügbare Größen, Sockel und Wandhalterungen samt Kunden-Startauswahl bearbeiten; gemeinsame Vorschau-/Preisauflösung und Revisionen. **177 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Backend → Speichern → echter Kundenkonfigurator in der bestehenden Cloud mit synthetischen Daten geprüft. [Ergebnis und Bilder](docs/dashboard-20261004/DASHBOARD-VARIANTEN.md). Muster Acrylglasbild erhalten, kein Dashboard-Publish.

**Nächster Schritt:** Maßhaltiger SVG-/PDF-Konturimport im Material-/Formmodell, getrennt vom Designimport; Originalmaße und vorhandene Materialreferenzen erhalten. Shopify/Bestellstrecke und reale Fertigungsabnahme bleiben offen. Die folgenden Abschnitte dokumentieren frühere Pakete.

## Aktuell: M01-Karten und Verwaltungsaktionen – 05.10.2026

Branch `task/dashboard-m01-overview-20261005`, Basis `8227eb7db836de5e30779e42fdd7bd36cb1a68f4`. Große Produktkarten mit tatsächlichem Design und vollständiger Platte, Größen/Stand/Designanzahl, Kopieren und revisionsgeschützte Einzel-/Mehrfacharchivierung samt Wiederherstellung. M02 und Muster Acrylglasbild bleiben erhalten. **176 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Cloud-Browserprüfung Desktop/Mobil mit synthetischen Daten, einschließlich parallelem Speicherkonflikt. [Ergebnis und Bilder](docs/dashboard-20261004/DASHBOARD-M01.md). Kein Dashboard-Publish.

**Nächster Schritt:** Verfügbare Acrylgrößen/Sockel und Startauswahl in M02 „Optionen & Preise“ über das bestehende Variantenmodell bearbeitbar machen. Shopify, weitere Materialadapter und echte Produktionsabnahme sind weiterhin offen. Die folgenden Abschnitte dokumentieren frühere Pakete.

## Aktuell: M02-Produktbearbeitung – 05.10.2026

Branch `task/dashboard-m02-editor-20261005`, Basis `b51f7fb6fa5ef4f9ed2b53832858f2035fc283e4`. Große Entwurfsvorschau zwischen Bereichen/Elementen und Eigenschaften; Text/Schrift/mm/Farbe, Kundenrechte, Beispielfotoersatz und Uploadhinweis angebunden. Vorhandene Speicher-/Import-/Verlauffunktionen weiterverwendet. **175 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Desktop/Mobil mit synthetischen Daten in der bestehenden Cloud geprüft. [Ergebnis, Grenzen und Bilder](docs/dashboard-20261004/DASHBOARD-M02.md). Keine Dashboard-Veröffentlichung; Muster Acrylglasbild unverändert.

**Nächster Schritt:** M01-Produktkarten entsprechend der ausgewählten fotografischen Übersicht korrigieren. Die älteren „fertig“-Aussagen sind keine vollständige Dashboard-Abnahme.

## Schnellzugriff: Muster Acrylglasbild – 05.10.2026

[**Muster Acrylglasbild öffnen**](https://gravuru-design-test-mika.gravur4you-cy.chatgpt.site/?model=acryl&v=0608ef1) · [Gesicherte Version und Übergabe](docs/dashboard-20261004/MUSTER-ACRYLGLASBILD.md). Der aktuelle Konfiguratorstand ist als private Site-Version 12 archiviert. Entwicklungsbasis `f4c9a2068f7d159def5f88f2a841bf01c1a59bd8`; nicht auf frühere Einstiege zurücksetzen. Die folgenden Abschnitte dokumentieren frühere Arbeitspakete.

# Gravuru 2027 – Einstieg und Übergabe

## Aktuell: Dashboard-Neuaufbau fortgesetzt – 04.10.2026

Maßgeblicher Einstieg: [CLOUD-HANDOVER.md](CLOUD-HANDOVER.md). Aktiver Aufgabenbranch `task/dashboard-customer-fields-20261004`, Basis `1b4626eab6cc2e7d22f815754583cc678e57d558`. Neu: ausdrückliche Text-/Fotofelder für importierte Designs mit Vorschau, mm-Einstellungen, runden Farben, Kundenrechten und unveränderlichen Produktrevisionen. 143 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Desktop-/Mobil-Browserablauf geprüft. [Nachweis und Bilder](docs/dashboard-20261004/PRUEFUNG.md).

Der vorhandene G27-02-Neuaufbau bleibt Grundlage. M01/M02 und die dokumentierten Änderungen gelten gemeinsam; die Gesamtansichten sind noch nicht vollständig umgesetzt. Nächster fachlicher Schritt: bestehende Produktübersicht mit echten Konfigurationsvorschauen nach M01 weiterentwickeln. Keine neue Migrations-/Serverplanung und keine Work-Verknüpfung als Voraussetzung. Private Bestandsdaten sind hier weiterhin nicht angebunden und für dieses Teilstück nicht erforderlich.

Die folgenden Übergabeabschnitte dokumentieren den vorherigen Stand; bei abweichenden nächsten Schritten gilt der aktuelle Einstieg oben.

## Aktueller Einstieg – 04.10.2026

**Ab jetzt ausschließlich Codex Cloud weiterentwickeln; GitHub sichert Code und Entscheidungen. Work ist für Gestaltung und Bilder vorgesehen, seine Cloud-Verknüpfung muss noch bestätigt werden.** Zuerst [CLOUD-AKTUELL.md](CLOUD-AKTUELL.md), [STATUS.md](STATUS.md) und [AGENTS.md](AGENTS.md) lesen. Neue Mikail-Cloud-Abnahme (137/0/0, Build 76/1), Chris' isolierter Cloud-Restore und GitHub-Leseübergabe sind bestanden. [Restorebericht](docs/cloud-migration-20261003/CLOUD-RESTORE-NACHWEIS-20261004.md) unverändert aus `e624833aecf6382f9b5edb4c432eb4e7c81a5cb2` übernommen. Dauerhafte gemeinsame private Datenablage, Zugriff beider Konten, Anbindung und visuelle App-Abnahme bleiben offen. Keine Produktionsfreigabe.

Fester Einstieg: »Gravuru 2027 – Cloud – Mikail«, `01a101bb-342f-750b-b481-82c3c3a5c072`. GitHub-Basis `infra/gravuru-2027-cloud-20261003`, Remote-HEAD `f7c3f24db55003c28fec5274dfc5df2736926b6b`; Dokumentübergabe separat auf `infra/cloud-only-handoff-20261004`. Cloud-Arbeitsweise und genau nächster Schritt stehen in CLOUD-AKTUELL.md. Die folgenden Abschnitte bleiben historische Nachweise und überstimmen diesen Einstieg nicht.

## Frühere Nachweise und ursprüngliche Übergabe

## Cloud-Übernahme geprüft (03.10.2026)

Aktueller normaler Quellbaum unter `app/` auf `infra/gravuru-2027-cloud-20261003`, übernommen aus dem SHA-256-geprüften Transportstand `3b2ac03d213ac913bcc61520b595f97dde6aa072`. Ausgangsbranch tatsächlich abgerufen: `9ca2d1256c006b20d4a4ca238deca34426b1b2ff`. Die folgenden älteren lokalen/GitHub-Aussagen sind historische Nachweise.

Frisches Verzeichnis in der bestehenden Linux-Cloud-Maschine: 215/215 Quelldateien identisch, vier Referenzarchive korrekt. Node 24.19.0, Python 3.12.14, PyMuPDF 1.28.2. `cloud-check.mjs` und separat `npm test`: jeweils 137 bestanden, 0 Fehler, 0 Skips; `npm run build`: 76 Ressourcen, ein Modell. Kundenkonfi, Editor, Werkstatt/Profile/Serien und Produkt-/Modell-API per HTTP geprüft; fremder Host/Origin und Schreiben ohne CSRF werden mit 403 abgewiesen. Keine Browserabnahme dieses Cloud-Laufs.

Nachweis: `CLOUD-VALIDIERUNG-20261003.md`, `CLOUD-SOURCE-COMPARISON.json`. Kein privater Datenbank-Restore; nur automatisch erzeugter synthetischer Entwicklungs-Master. Keine Produktivveröffentlichung, kein Main-Merge. Neu veröffentlichte Cloud-Maschine, zweiter Account, 24-Stunden-Laptop-aus-Test und vollständige private Sicherung bleiben NICHT GEPRÜFT. Nächster Schritt: Entwicklungsumgebung veröffentlichen und in einer neuen Aufgabe validieren; Datenmigration separat sicher vorbereiten.

Stand: 02.10.2026. **Aktueller Auftrag: vollständige, geprüfte Sicherung und Cloud-Übergabe ohne Datenverlust vorbereiten (CLOUD-UEBERGABE.md).** Ein tatsächlicher Cloud-Lauf ist noch nicht bestätigt. Auftraggeber: Mikail. Kurze deutsche Erläuterungen, sichtbare Ergebnisse und ehrliche Grenzen sind wichtig. Bereits festgelegte Produktangaben nicht erneut erfragen. Der Nutzer erwartet die vollständige Umsetzung und hat ausdrücklich zu wenig sichtbaren Fortschritt kritisiert. Zwischenstände nicht als Ende des Auftrags behandeln.

Aktueller Stand: 137 verschiedene Tests erfolgreich abgedeckt, einschließlich echter PDF-Konvertierung; Build mit 76 Ressourcen/einem Modell. Kundenprodukt `cfg_ad9a9754-9bf2-416c-a366-da9c996cb841` bleibt regulär bearbeitbar, Revision 10. Produktverwaltung, Kategorieprofile und XLSX-Stapelanlage bestehen. Neu: SVG/PDF ersetzt nach Vorschau genau ein ausgewähltes Design, Originaldateien und Revisionen bleiben gespeichert. Im Browser mit der vorhandenen Daria-PDF in einer separaten Kopie `cfg_a20d644c-1e4c-4158-8f7b-2be30049722b` geprüft. Importierte Vorlagen sind zunächst feste Grafiken; Kundenfelder werden nicht automatisch rekonstruiert. Der Excel-Stapelimport verknüpft jetzt Dateinamen/PDF-Seiten mit bis zu 100 Produktzeilen; Vorschau und echte Dreier-Testserie sind geprüft. Nächste Umsetzung: explizite Kundenfelder für importierte Designs; anschließend Material-/Form-/Bohrmodell. Shopify und Produktionsstrecke bleiben offen. Keine Wiederholung der abgeschlossenen Grundarbeiten und keine neue Sicherungssuche. Nach Rechnerneustart Anwendung laut `LOKAL-STARTEN.md` starten; URLs allein starten keinen Server.

**Zuerst den neuen Abschnitt in STATUS.md lesen.** Aktive Anwendung unter `app/` auf Branch `task/g27-02-workshop`. Einstieg: http://127.0.0.1:8961/werkstatt/. Historische G27-01-Angaben unten sind kein aktueller Funktionsumfang. G27-02-Basis liegt als ZIP in GitHub-Entwurfs-PR #1; die neuen Designimport-Änderungen vom 02.10. sind bislang lokal. Kein Cloud-Auftrag läuft.

## Maßgeblicher Projektstand

Das neue Projekt heißt **Gravuru 2027**. Repository: https://github.com/Chris83638w/gravuru-2027. Der alte Konfigurator dient als geprüfte Quelle und Vergleich. Keine blinde Kopie des gesamten Altbestands.

Neueste Entscheidung hat Vorrang vor früheren Vorschlägen: **2D genügt zunächst; AR ist auf später verschoben.** Eine 2D-Darstellung eines Wandbilds in einem eigenen Raumfoto kann später ohne Live-AR umgesetzt werden. Ein verlässlicher Maßstab einer solchen Fotomontage benötigt eine bekannte Referenzgröße; diese Funktion wurde noch nicht gebaut.

Die erste neue Kundenoberfläche ist lokal implementiert und geprüft. Aktive Dateien unter `app/`, Start über `LOKAL-STARTEN.md`, aktuelle Prüfung in `G27-01-PRUEFUNG.md`. Eingefrorene Referenzpakete mit 294 Dateien bleiben Herkunftsmaterial. Ein sichtbarer Button oder Screenshot beweist keine vollständige Bestellstrecke.

## Lesen und weiterarbeiten

1. `STATUS.md` und `AGENTS.md`: konkreter Fortschritt und Arbeitsregeln.
2. Aktives nächstes Paket **G27-02** in `UMSETZUNGSPAKETE.md`. `UEBERGABE-SOL-6.1.md` ist der historische Startauftrag; bereits erledigtes G27-01 nicht wiederholen.
3. `QUELLEN-UND-START.md`: Archive prüfen, Quellen gezielt öffnen, vorhandenen Build reproduzieren. `MATERIALREFERENZEN.md` sichert die Materialauswahl und ihre Grenzen.
4. Passende Abschnitte in `NEUE-WERKSTATT-PLAN.md` nachschlagen: bestätigte Anforderungen, Preise und Befunde. `KONFI-VERGLEICH-UND-AR.md` ist ergänzender Hintergrund, keine Pflicht zur erneuten Recherche; AR bleibt vertagt.

## Herkunft

- Altes Repository: `Chris83638w/gravuru-shopify`.
- Am 30.09.2026 geprüfter Quellbranch: `feat/variante-m-profile-20260924`, Commit `b564422edadaf56a27a09f99e1140a546e5e7145`.
- Aufgabenbranch mit dokumentierter Planung: `task/acrylglas-konfigurator-20260929`.
- Letzter dokumentierter Vergleichsstand dort: `e34dffaa6f9c90edd2cfcce58fa1e08541731092`.
- Lokale alte Arbeitskopie: `C:/Users/Mikail Erdem/Documents/Codex/2026-09-29/wa/work/acrylic-konfi`.
- Die lokale Arbeitskopie enthält Acryl-Erweiterungen und Medien, die nicht vollständig in den alten GitHub-Commits stehen. Die ausgewählten Quellen und Ressourcen sind jetzt in den Referenzarchiven mit SHA-256-Manifest eingefroren. Das gesamte historische App-/Werkstattprojekt bleibt davon zu unterscheiden.
- Lokal gezeigte Basisansicht: `http://127.0.0.1:8951/?model=acryl`; Diskussionsansicht ergänzt `&review=1`. Lokale Adresse ist keine öffentliche Bereitstellung und keine Startgarantie auf einem anderen Rechner.

## Geprüfter Bestand und Grenzen

Historische Referenzprüfung: 19 Tests, 104 Ressourcen, 7 Modelle, 294 Dateiprüfsummen. **Aktuelle Anwendung: 137 Tests, 76 ausgewählte Ressourcen, ein Acrylmodell.** Fotozuordnung anhand eindeutiger Feldschlüssel und gemeinsame Acrylpreisregeln sind implementiert. Aktueller Umfang in `STATUS.md`; `G27-01-PRUEFUNG.md` beschreibt nur die erste Kundenoberfläche. Historische Befunde im Bauplan nicht als aktuellen Fehlerstand übernehmen.

Neue Produktverwaltung speichert in SQLite mit Revisionen/Metadaten und Migrationen. Bestehende historische Kundensitzungs-/Produktionsmodule sind noch nicht daran angeschlossen. PDF-/Druckausgaben, freier Konturimport, Produktion und Shopify benötigen ihre jeweiligen durchgehenden Abnahmen.

Zwölf Materialbilder für Edelstahl, Leder, Holz und Acryl wurden wiedergefunden und unverändert gesichert. Schieferbeispiele liegen ebenfalls vor, die reine Rohlingreferenz ist noch nicht eindeutig zugeordnet. Keine neuen Uploads pauschal verlangen. Endgültige Schriftarten, unbestätigte Materialstärken und freigegebene Maschinen-/Farbprofile bleiben offene Voraussetzungen; Details im Materialregister und Bauplan.

## Als Nächstes

G27-02: gemeinsames Modell für Material, Formkontur, Variante, Bohrbild, Design, Kundenfelder und Produktionsprofil samt Speicherung/Revisionen. Aktive Acrylregeln wiederverwenden. Druck und Gravur abdecken; Verwaltung und Stapelverarbeitung verwenden dieselben Regeln. Den Namen Gravuru 2027 konsequent verwenden. Aktueller lokaler Pilot: http://127.0.0.1:8961/?model=acryl. Git-Transportgrenzen in `STATUS.md` beachten.
