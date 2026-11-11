# Produktpläne #230 – aktualisiert nach Uploadfreigabe

Stand 11.11.2026, lokale Fassung v8. **Sieben echte persistierte native Planpaare, 823/823 Variantenpreise korrekt.** Die Nutzerentscheidung ist übernommen: großes Acrylprodukt **Foto und SVG-Logo an**, sechs Kleinprodukte **Foto und Logo aus**. Diese Upload-Auswahl ist keine offene Nutzerfrage mehr.

Alle Pläne bleiben wegen der unten getrennt genannten Restpunkte valid:false. **0 Bestätigungen, 0 Ausführungen, 0 Live-/Shopify-/Bindungsänderungen.** Alle IDs gehören ausschließlich zum isolierten Prüfbestand.

| Produktakte | Varianten | Native Designs | Foto bestätigt | Logo bestätigt | Startvorschlag, noch offen |
|---|---:|---:|---|---|---|
| Acrylglas-3mm (v4) | 778 | 1205 | an | SVG an | TAE-V2A-8x5-D1 |
| Acrylglas-3mm-5x2 (v2) | 10 | 27 | aus | aus | TRE-V2A-5x2-D1 |
| Acrylglas-3mm-6x2 (v2) | 10 | 27 | aus | aus | TRE-V2A-6x2-D1 |
| Acrylglas-3mm-8x2 (v2) | 10 | 27 | aus | aus | TRE-V2A-8x2-D1 |
| Edelstahl-5x2 (v1) | 5 | 27 | aus | aus | TRE-V2A-5x2-D1 |
| Edelstahl-6x2 (v1) | 5 | 27 | aus | aus | TRE-V2A-6x2-D1 |
| Edelstahl-8x2 (v1) | 5 | 27 | aus | aus | TRE-V2A-8x2-D1 |

## Technisch umgesetzt und geprüft

- Nativer Weg: unveränderte gepinnte Katalog-/Excel-Quellen → planFamilyFormats → persistierte native Quellen → echte native Registry → ProductGroupTemplate.plan. Jedes Produkt hat ein nach ID, Revision und Hash gepinntes Modulprofil.
- Der bisherige SVG-Logo-Vertrag erlaubte ausschließlich Edelstahl ohne Foto. Der neue ausdrückliche Acrylgravur-Zweig unterstützt Foto und serverseitig geprüftes SVG gemeinsam. Modulprüfung, Upload-Auswahl, Dateitypen, Preistext und Hilfetexte stimmen überein. Der bestehende Edelstahlpfad bleibt ohne Foto; alte Revisionen behalten ihren Preisweg.
- Getrennte bestätigte Aufpreise: Foto 999 Cent, SVG-Logo 1299 Cent, zusätzliches/geändertes Motiv 169 Cent. Befestigungsaufschläge 269/329 Cent in den dynamischen Formatdaten. 164 historische Acryl-Schraubenabweichungen korrigiert, ohne die Original-Excel oder den Katalog zu verändern.
- 59/59 gezielte Modul-/UI-/Preis-/Checkoutvertragsprüfungen und 10/10 Medien-/HTTP-/Produktionsprüfungen bestanden. Zusätzlich die gemeinsame Foto-/SVG-Rastergravur-PDF mit Spiegelung geprüft. Echte SVG-Umwandlung, Original-/Ergebnis-Hashes, unveränderliche Speicherung und getrennte Zählung sind abgedeckt. Das sind lokale technische Nachweise, keine Live-Bestellabnahme.
- 823/823 Variantenpreise gegen die Originalextraktion; 14 absichtlich falsche Preise/fehlende Varianten erkannt; 4/4 bestehende Planprüfungen bestanden. Unabhängiger Agentenreview liegt bei.
- Sechs kleine Produkte behalten genau 13 bestätigte Auswahlmotive. schmetterlinge-1.svg bleibt ausgeschlossen; schmetterling-1.svg bleibt enthalten. Eingebettete Originalmotive sind unverändert; alle 13 Original-SVG sind beigefügt.
- 1.298 Auftragszeilen = 1.297 eindeutige Design-IDs. Doppelte TRE-V2A-7x2-D34 einmal übernommen, Rang 0 vor Rang 1. Die Auftragsliste selbst bleibt unverändert.

- Finale Vorschaukorrektur: geprüfte SVG-Bytes bleiben schwarz und unverändert; nur Editor- und Bestätigungsansicht erhalten die Acryl-Gravurfarbe. Unabhängiger Rasterbeleg zeigt #e1e4e5 mit freien Aussparungen. 39/39 gezielte Logo-/UI-/Motivtests grün; normaler Build mit 154 Modulen erfolgreich. Keine Livebrowser-Abnahme.
- Im erweiterten historischen Planservice-Lauf bleiben drei Cache-/Lesezähler-Tests rot; dieselben drei scheitern unverändert auf sauberem Ausgangscommit 78f178e. Kein neuer Fehler dieses Patches; genaue Logs liegen bei.

## Aktuelle Excel-Nachträge

Sieben neue versionierte XLSX ergänzen die unveränderten Preisoriginale. Das erste Blatt „BestätigteUploads“ ist der aktuelle Nachtrag mit tatsächlicher v8-Planbindung. Historische Freigabeblätter bleiben als Originalbeleg erhalten. Alle ursprünglichen Werte/Formeln wurden unabhängig verglichen, sämtliche ursprünglichen Preisblätter sind unverändert. Die Startvorschläge sowie Steuer-/Staffelantworten bleiben ausdrücklich offen.

| Preisoriginal | Aktueller Nachtrag |
|---|---|
| Tuerschild-Acrylglas-3mm_v4.xlsx | Tuerschild-Acrylglas-3mm_v5.xlsx |
| Tuerschild-Acrylglas-3mm-5x2_v2.xlsx | Tuerschild-Acrylglas-3mm-5x2_v3.xlsx |
| Tuerschild-Acrylglas-3mm-6x2_v2.xlsx | Tuerschild-Acrylglas-3mm-6x2_v3.xlsx |
| Tuerschild-Acrylglas-3mm-8x2_v2.xlsx | Tuerschild-Acrylglas-3mm-8x2_v3.xlsx |
| Tuerschild-Edelstahl-5x2_v1.xlsx | Tuerschild-Edelstahl-5x2_v2.xlsx |
| Tuerschild-Edelstahl-6x2_v1.xlsx | Tuerschild-Edelstahl-6x2_v2.xlsx |
| Tuerschild-Edelstahl-8x2_v1.xlsx | Tuerschild-Edelstahl-8x2_v2.xlsx |

Der native Plan bindet den SHA der Originalpreisakte; der Nachtrag nennt Plan-ID/Hash und Quell-/Profilrevisionen. Ein separates Manifest bindet die neuen XLSX-Dateien. Kein zirkulärer Selbsthash.

## Verbleibende Punkte

1. Konkrete Startdesigns/-formate entscheiden. Vorschläge oben: main AB 12×8 cm, sonst die jeweilige feste Größe; alle ohne Befestigung, Acryl Schwarz. Die bestätigte Upload-Auswahl wird dabei nicht erneut erfragt.
2. Neun Hauptdesigns bestehen die native Kontur-/Randprüfung nicht. Messbericht und Messunsicherheit unter review/geometry-analysis.json bzw. Geometrie-Pruefbericht.md. Deutliche Überstände und Grenzfälle werden getrennt behandelt; kein Original wird verändert und keine Toleranz pauschal aufgeweicht. Zwei weitere IDs sind absichtlich hidden und bleiben ausgeblendet. Hauptprodukt: 1.205/1.216 eindeutige Listen-IDs; Kleinformate jeweils 27/27.
3. Kleinformat-Motive werden im bestehenden Adapter rechts/links neben Text platziert; die Strich-Ausnahmen bleiben erhalten. Der Realquellencheck umfasst sechs Produkte × 13 Motive. Bei unverändertem D1-Starttext auf 5×2 und 6×2 cm ist kein Platz für ein 10-mm-Seitenmotiv: der bestehende Platzhinweis bleibt sichtbar, Originaltexte werden nicht automatisch verändert. Dies ist keine neue Gestaltungssperre.
4. Steuer-/Mengenstaffelangaben und die Startgestaltung bleiben in den aktuellen Nachträgen ausdrücklich offen. Keine erneute Preis- oder Uploadentscheidung ableiten.
5. Der Planservice pinnt Modulprofile, schützt separate Motivbibliothek-Revisionen jedoch noch nicht automatisch. Vor späterer Ausführung die beigelegten Profilrevisionen und Hashes erneut vergleichen.
6. Sichtprüfung im echten Kundenkonfigurator, Kontaktbogen, Warenkorb-/Bestellabnahme und Station-3-Freigabe der endgültigen Excel-/Planpaare stehen weiter aus. Die bloß fehlende Station-3-Bestätigung ist keine zirkuläre fachliche Planfrage.

## Quellen und Reproduktion

Katalog 8236b8bfab7322447ec46661c116fa526331af3d; Excel bf8824c80347f63ffeb2c05cc9a34a9ffed6f9bd; saubere gepinnte Quellen und alle sieben Excel-Hashes geprüft. Codebasis 411188db5777d7fb0ec06c6fab2f6faf85270fc9 mit dem lokalen Aufgabenbranch und beigelegtem Codepatch. Native Quellen, zwei SQLite-Dateien, Originalakten, Profile, Planantworten und Reproduktionsnachweise gehören gemeinsam zum Paket. Keine Datenbank wird ins Repository übernommen. Neue Quellenentscheidungen erzeugen neue Plan-IDs und Hashes.

## Aktuelle Planpaare v8

| Produktakte | Native Plan-ID | Nativer PlanHash |
|---|---|---|
| Acrylglas-3mm (v4) | pgp_aad6d5ae-b255-4d19-8c92-9d91ba09d445 | 7079dae2814c9c17526ae3c254696ccd2b253318066b38a435f7a9cfb610e197 |
| Acrylglas-3mm-5x2 (v2) | pgp_03932c0e-6f8f-4177-8ab5-cf7891b5bcdc | 01cf26109b3e49708f122fc7fb46e2493faad1be1e07235b0ff33bed3e28bc96 |
| Acrylglas-3mm-6x2 (v2) | pgp_b6bd6b74-35e6-444e-b2cb-4bf64a49e280 | 66931afab9bcac13e82b87ffb2b8e47473fad169e1b623353015e69dc7e31bbc |
| Acrylglas-3mm-8x2 (v2) | pgp_6126fcb8-d8b7-4b5b-9410-9c09a9198b52 | 0aa24af4bd611f5a674642a98bb5603d12f23d4a7175cdea3afca55865e0ab95 |
| Edelstahl-5x2 (v1) | pgp_fae5b365-a7c0-4d85-9096-e9f5670b5b21 | ac2f8ce469cf862471a6c1c35f7c6a0142bf25b235b00b20e8038d23551a8309 |
| Edelstahl-6x2 (v1) | pgp_ea7f2afb-fb41-4e91-90e7-986d8d524cc8 | f87a05e734982b900f49de674d8748b2870113ad76b5a3e9c39b30ee2cdddf9e |
| Edelstahl-8x2 (v1) | pgp_c2098259-36a3-4048-a4e6-e3ffa70c9d68 | 5c4b729ea5be27e1ea9b4e4a6c65e94088803618219e5025836ca6e70654ec3e |

Originaldesigns folgen unverändert dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). Die Geometrieanalyse ist keine Designänderung und keine Designfreigabe.
