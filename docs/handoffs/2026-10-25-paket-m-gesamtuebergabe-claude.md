# Paket M – vollständige Übergabe an Claude

Stand: 25.10.2026 · Codex/Astra · Quellenbasis Code `7f849b9`, Katalog `7f4a048`.

## Austausch über GitHub

Chris hat am 25.10.2026 festgelegt: „nein immer über github, da muss euer austausch sein“. Übergaben, Prüfergebnisse und Rückfragen zwischen Claude und Codex werden deshalb im jeweiligen GitHub-Repository über versionierte Übergaben, Issues und PR-Kommentare ausgetauscht. Lokale Dateien oder dieser Chat allein sind keine gemeinsame Übergabe. Neue Arbeiten beginnen auf dem jeweils aktuellen `main`; dieser Text hält den hier geprüften Stand fest.

Claude, hier die vollständige Übergabe zu Paket M und den anschließenden Foto-/Maskenwünschen von Chris. Spätere Entscheidungen in dieser Nachricht ersetzen widersprechende Aussagen in älteren Berichten.

**Aktueller Stand und Arbeitsbasis**

Paket M ist gemerged: [Code-PR #20](https://github.com/Chris83638w/gravuru-2027/pull/20), Merge 2be167a, einschließlich Astra-Fotoergänzung 85d6e3a; [Katalog-PR #5](https://github.com/Chris83638w/gravuru-katalog./pull/5), Merge 7f4a048. Katalog-PR #5 änderte ausschließlich zwei README-Dateien.

Chris hat den Stand „Code main 25e8d0b, Katalog 7f4a048, gemerged und live“ übermittelt. Beim erneuten Repository-Abgleich am 25.10. steht Code-main bereits auf 7f849b9; Katalog-main bleibt 7f4a048. Neue Entwicklung vom aktuellen main aus beginnen, nicht vom alten Paket-M-Branch oder seiner Basis 67b8f1c.

Der Live-Stand wurde in dieser Zusammenfassungsrunde nicht neu am Host getestet. STATUS.md dokumentiert Claudes Deployment mit Laufzeit 88469d0 und Katalog 7f4a048 sowie die Prüfung im Shopify-Admin. Die ältere Aussage „nicht gemerged/nicht live“ beschreibt nur Astras damalige Abgabe.

**Ursprünglicher Paket-M-Auftrag**

Ein Design soll mehrere Materialien, Verfahren, Linien und Formen bedienen. design.json erhält ziele mit eigener Freigabe pro Familienziel. Linien zeigen Designs über diese Ziele; Import und shop-sync dürfen nur das jeweils freigegebene und passende Ziel übernehmen. Inhaltsänderungen setzen die Zielfreigaben zurück.

Das Dashboard zeigt Ziele auf der echten Familienoberfläche, Vorschläge nach Thema und Themen als Häkchen. Fehlende Familien heißen „Familie fehlt“; keine Familie, Preise oder physische Angaben erfinden. Varianten werden proportional eingepasst, mit editierbarem Text, geometrischer Herkunft und Abweichung in Prozent.

Weitere Regeln: 3 mm Mindestschrift, V2A-Details unter 0,5 mm warnen, Walnuss-Ton als Näherung kennzeichnen, outdoorSuitable optional und bei fehlender Angabe unbekannt. Die ursprüngliche pauschale Regel „Foto auf Gravur = passt nicht“ wurde später ausdrücklich korrigiert – siehe unten.

**Beschlossene Kennungen – verbindlich**

1. Nur anderes Material/Verfahren: keine Variante, nur neues Ziel. Der Materialcode bleibt der des Master-Bogens.
2. Anderes Format: nur Format in cm tauschen, D-Nummer behalten. Vorhandene Bogen-Schreibweise hat Vorrang.
3. Andere Form/Linie: Kürzel aus vorhandenen Bögen der Ziel-Linie/-Form verwenden, D-Nummer behalten. Ohne belegtes Kürzel: „Kennung offen“, nichts anlegen, mit Claude klären.
4. Gegen Lieferform-2-Designs, sämtliche relevanten Indizes und Bestand prüfen. Nie überschreiben oder still umbenennen. Gleiches Original über varianteVon: Ziel am vorhandenen Design ergänzen; bereits vorhandenes Ziel: „schon vorhanden“. Fremde Belegung: „Kennung belegt“, beide Vorschauen und ausdrückliche Teamentscheidung für „Ziel hinzufügen“. Nur im Bestand: „Bestandsfassung vorhanden“, keine automatische Anlage.
5. Vorhandenen Reihenordner mit gleichem Präfix nutzen; andernfalls Ordner nach Ursprungsmuster mit index.json. katalog.series = Ordner, katalog.key = <Ordner>-D<n>, varianteVon = Originalkennung, transfer.from/fromKey = geometrische Quelle. D-Nummern sind innerhalb ihres Bogens zu verstehen, nicht als weltweit eindeutige Designnummern.

Beispiel: GT-S-22x14-D204 → GT-S-30x20-D204 in designs/gedenktafeln-30x20/. Edelstahl 30×20 ist ein Ziel dieses Designs. GT-V2A-30x20-D204 wäre ein fremder Bogen. Alle 24 Designs der Reihe gedenktafeln-22x14 sind für 30×20 bereits im Bestand belegt. Übernahme gehört zu Paket Q.

Automatisches Einpassen wurde nur mit freier synthetischer Kennung D999998 auf einer privaten Katalogkopie gezeigt: 9×3 → 12×8, 50 % Seitenverhältnisabweichung. Das ist keine neue echte Produktkennung.

**Chris’ Wünsche nach der Kennungsentscheidung**

Chris fragte nach dem schwarzen Rahmen hinter dem Hund, nach der Sichtbarkeit des Hundes im Konfigurator und danach, ob sich das Foto auf der Tafel verschieben lässt. Danach präzisierte er: Bei einer Herzmaske oder anderen Form muss die komplette Maske samt Foto verschiebbar sein. Der schwarze Rahmen soll nicht sichtbar sein.

Die Umsetzung trennt deshalb:
- „Fotofeld bewegen“: gesamte Form/Maske samt Foto gemeinsam bewegen; Ausschnitt bleibt erhalten.
- „Foto im Ausschnitt ausrichten“: Bild innerhalb der Form verschieben, zoomen oder drehen, mit den vorhandenen Konfi-Pfeilen.
- Bewegungs- und Austauschrechte bleiben unabhängig. Feste Felder behalten ihre Einschränkungen. Im Ausschnittmodus verdeckt die schwebende Bearbeiten-Taste keine der vier Pfeilflächen.

Das ist Unterstützung vorhandener nativer Masken; keine allgemeine Übernahme oder Reparatur sämtlicher LF2-/Bestandsmasken wurde damit erledigt.

**Graustufen und echte Vorlagen-PNGs – letzte Präzisierung beachten**

Chris sagte zunächst: Fotos bei Schieferprodukten und bei Gravuren auf Acrylglas automatisch in Graustufen; unter Bearbeiten wieder zum Original zurückkehren.

Danach stellte er ausdrücklich klar: **Gemeint ist der Upload durch den Kunden. Für unsere Vorlagen nehmen wir unsere echten PNGs.**

Daraus folgt:
- Nur Kunden-Fotouploads auf Schiefer und bei Acrylgravur erhalten die Graustufenvorgabe.
- „Bild bearbeiten → Original wiederherstellen“ bleibt möglich. Die explizite Wahl überlebt Speichern, Wiederöffnen und Reload; Originalbytes bleiben erhalten.
- Vorlagen-PNGs, Beispiele, Platzhalter und Logos nicht automatisch umwandeln oder durch erzeugte Ersatzbilder ersetzen.
- Das echte Vorlagenfoto, etwa der Hund, ist vom späteren Kunden-Upload zu unterscheiden. Für die Fotoergänzung wurde ein synthetisches Kundenfoto getestet; das ist kein Nachweis für jede reale D204-Vorlage im Live-Konfigurator.
- Die helle Materialdarstellung ist ein Vorschaueffekt und verändert keine Maschinenpolarität. Die gewählte Graustufenbearbeitung wird bei der entsprechenden Druckausgabe berücksichtigt. Native Druckcache-Version ist v6.

**Schwarzer Bereich bei D204 bleibt offen**

Im alten 30×20-Bestand steckt das schwarze Rechteck bereits in foto-1.jpg und preview.png. Die echte transparente 22×14-PNG ist anders ausgerichtet und enthält einen Upload-Hinweis; sie wurde nicht still gegen die Bestandsfassung ausgetauscht.

Ein zwischenzeitlicher Versuch, die Bestandsvorschau neu zusammenzusetzen, wurde nach Chris’ PNG-Präzisierung vollständig zurückgenommen und nicht veröffentlicht. Die Originaldateien blieben unverändert.

Chris’ Wunsch „Der schwarze Rahmen sollte nicht sichtbar sein“ ist damit nicht erledigt. Bei Paket Q anhand der richtigen Originalquelle klären. Nicht pauschal Schwarzpixel löschen – dadurch könnten dunkle Bilddetails verloren gehen.

**Claudes Nachbesserungen nach dem Merge haben Vorrang**

- Fotofelder auf Gravur sind erlaubt, wenn tools.photo des Verfahrens dies unterstützt. Ohne Fotoangabe der Familie lautet die Bewertung „prüfen“, nicht pauschal „passt nicht“.
- Neutraltöne mit höchstens 16/255 Kanalabstand gelten nicht als Farbe. Corel-Schwarz #1b1918 darf keine Farbsperre auslösen.
- Die Zielvorschau auf dem Händlerhost wird an die neue Laufzeit geroutet.

Diese Zielprüfung ist getrennt von der Kunden-Upload-Graustufenvorgabe. Sie erteilt keine automatische Freigabe und färbt keine Vorlagen-PNG um. Ältere Berichte mit pauschaler Fotofeldsperre oder „Zielregeln unverändert“ sind bezüglich dieser späteren Änderungen überholt.

STATUS.md nennt für Gedenktafeln 22×14 jetzt 74 „passt“ und 4 „prüfen“. Bei Edelstahl bleiben 647 Produkte und dieselben 97 Sperren; 52 Rechteck-Designs entfallen gewollt auf Ellipsenplatten. 20 Startdesigns erhalten neue Prüfhinweise, keine Sperre. Die frühere Zahl „473 gesperrte Vorlagen“ wurde im aktuellen STATUS korrigiert: 294 Design-Größen-Kombinationen aus 36 Designs plus 3 Hauptprodukte waren betroffen; 473 zählte Meldungen.

**Migration, Freigaben und Prüfungen**

Auf der privaten Kopie: 761 Master, 759 eindeutig migriert; D234/D235 bleiben wegen mehrdeutiger Familienzuordnung offen. Freigaben 0 → 0. Alle 104 Hauptproduktzuordnungen und 761 Designfingerprints blieben bei der Zielmigration unverändert.

Laut aktuellem STATUS ist der echte Katalog weiterhin nicht migriert; Legacy-Modus, 0 Freigaben. Eine reale Migration erst nach Rücksprache. Merge und Deployment sind keine Freigabe der Designs und kein durchgeführter Produktimport.

Prüfnachweise chronologisch:
- Ältere Astra-Basis vor Fotoergänzung: 188 Dateien, 1449 Tests, 1442 bestanden, 7 Skips, keine Fehler.
- Astra-Fotoergänzung 85d6e3a: alle 44 Konfigurator-Testdateien 286/286 grün; 35/35 unterschiedliche betroffene Werkstatt-Tests in 9 Dateien grün. 15 anfängliche Windows-Python-Startfehler wurden mit dem vorhandenen Windows-Preload erfolgreich nachgeprüft; keine Assertions abgeschwächt.
- Browser: Desktop und iPhone-13-Emulation, synthetisches Foto mit Herzmaske; gemeinsame Bewegung, Undo/Redo, Crop, Originalreset, Speichern und Reload; vier freie Pfeilzentren. Kein physisches iPhone.
- **Neuester dokumentierter Gesamtstand von Claude:** Linux-Vollauf auf Merge-Stand mit Fixes: 1525 Tests, 1524 bestanden, 0 Fehler, 1 optionaler Realkatalog-Skip. Import-Dry-runs und Live-Stichproben sind in STATUS.md dokumentiert. Die frühere Bitte, diesen Linux-Vollauf erst noch auszuführen, ist damit überholt.

**Bereits vereinbarte Dashboard-Bedienung beibehalten**

Auf dem Handy Designs zuerst, Filter einklappbar, Kacheln; echte Schriften als Glyphenpfade in der Vorschau. Bedienung wie im Konfigurator mit Pfeilen. Rote Hilfsrahmen um Bohrlöcher bleiben unsichtbar; sie dienen der mechanischen Konfliktprüfung. Startdesign-Freigaben dürfen die Vorschauprüfung nicht umgehen; fehlende Schriften blockieren weiterhin.

**Quellen für die Weiterarbeit**

- [Aktuelles STATUS.md – hier geprüfter Stand 7f849b9](https://github.com/Chris83638w/gravuru-2027/blob/7f849b9c77f71971b60758630c0e66fc40fd86b8/STATUS.md)
- [Kennungsregeln und Familienziele im Katalog](https://github.com/Chris83638w/gravuru-katalog./blob/7f4a048148a3a35548909c92978e99360c0988e6/designs/README.md#kennungen-für-varianten-paket-m--claude-24102026)
- [Paket-M-Bericht – historischer Astra-Stand](https://github.com/Chris83638w/gravuru-2027/blob/85d6e3a088ec03638f4de1d4bd31d5fa5a8787a6/docs/handoffs/2026-10-24-paket-m-bericht.md)
- [Foto-Nachtrag mit Screenshots, Rohlogs und Quellhashes](https://github.com/Chris83638w/gravuru-2027/blob/85d6e3a088ec03638f4de1d4bd31d5fa5a8787a6/docs/handoffs/2026-10-25-paket-m-kundenfotos.md)

Bitte diese Zusammenfassung als verbindlichen Gesprächskontext verwenden. Offene Quellen-/Kennungsfragen ausdrücklich klären. Keine neuen Freigaben, Migrationen, Imports oder Live-Aktionen allein aus dieser Übergabe ableiten. Kennungen stabil, LF-Zeilenenden, keine Schriftdateien ins Code-Repo.


**Genau nächster Schritt:** Claude liest diese Übergabe und gleicht offene Punkte mit dem aktuellen `STATUS.md` ab. Insbesondere den eingebetteten schwarzen Bereich in D204 für Paket Q offen halten; keine bereits gemergte Foto-/Maskenarbeit erneut als ausstehende Implementierung behandeln. Rückfragen und Ergebnisse im zugehörigen GitHub-PR oder Issue festhalten.
