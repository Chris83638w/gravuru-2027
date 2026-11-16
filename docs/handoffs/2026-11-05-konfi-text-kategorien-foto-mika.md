# Konfi: freigegebene Text-, Kategorie- und Fotobedienung

Stand 05.11.2026, Codex/Mika, Branch `dev/mika-konfi-anschluss-20261105`, PR #178. Aufbau auf `42499995`; aktive Prüfversion R7 `editor-958a103c84550164.mjs`, seit 22:20:42 UTC. Umfang vorab in [Issue 168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6670713116) reserviert. Keine fremden Änderungen überschrieben; keine Änderung an Produktmodellen, Preisen, Designs, Bestellung oder Datenbank.

## Auftrag und Regeln mit Quelle

Mikails letzter Auftrag im Chat: „Setze jetzt alle besprochenen Änderungen am Konfi um und teste sie am Handy und PC. Bitte wirklich nur diese Punkte ändern, nichts anderes. Ändere nichts bestehendes“.

Die zuvor gesammelten Punkte dieses Pakets:

- Beim Anklicken eines Textfeldes soll „Schrift & Größe“ automatisch darunter öffnen. Das manuelle Schließen bleibt erhalten.
- Motivkategorien deutlicher auffindbar: vier sichtbare Auswahlflächen mit Symbolen und zusätzlicher Box „Alle Kategorien anzeigen“, Auswahl sofort wirksam. Nur vorhandene Kategorien; die Suche hat weiterhin Vorrang.
- „das Foto muss auch an den Ecken um das Foto größenverstellbar sein !!!“ Diese spätere ausdrückliche Anforderung ersetzt die frühere Beschränkung der Fotogröße auf einen Regler. Der Regler bleibt verfügbar. Ansichtszoom weiterhin nur per Regler, kein neues Rad-/Pinch-Zoom.
- „Wenn ich ein Foto hochlade, muss es auch weiter mittig und größer gesetzt werden.“ Nur ein neu erzeugtes freies Foto startet zentriert in einer Fläche von höchstens 60 % Tafelbreite/65 % Tafelhöhe, proportional passend zum vollständigen Original. Die alte Freiplatzsuche darf dieses Foto nicht anschließend verkleinern/versetzen. Bestehende Fotos und Ersatzuploads behalten ihre Geometrie; feste Vorlagenfelder bleiben unverändert.
- „Foto bearbeiten Button und auch Motive kleiner halten“, „gleiches bei einem möglichen Logo“: kompakte vorhandene Aktionsleiste für diese Elementarten, Textleiste unverändert.
- „alle Zeichen und Buttons kontrollieren. EIn Fragezeichen und ! muss immer gut erkennbar sein.“ Kräftigere Oberflächensymbole, explizit gefüllte Punkte, erkennbare deaktivierte Bedienzeichen. Keine Veränderung der gravierten Motivressourcen.

Keine neuen fachlichen Optionen, Sperren, Preise oder Ausführungen. Weiterhin maßgeblich: [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). Dieses Paket verändert keine Designs.

## Umsetzung

`text-fields.mjs`: Öffnen am Textfeld bei Fokus/Klick. `category-picker.mjs` und `modern-navigation.css`: sichtbare vorhandene Kategorien, sofortige Auswahl, kompakte Menübox und Aktionsleisten. `direct-editing.mjs`: Elementart als Darstellungsmerkmal. `customer-rights.mjs`, `refinements.mjs`, `photo-position.mjs`: vorhandene proportionale Foto-Eckbedienung wieder zugänglich, unter Erhalt der Produktrechte. `photo-upload-geometry.mjs`, `ux.mjs`, `workflow.mjs`: größerer mittiger Erstupload ohne automatische anschließende Freiplatzverkleinerung. `ui-icons.mjs`: erkennbare Konturen/Punkte. Vier passende Testdateien ergänzt/aktualisiert.

## Nachweise

- Lokal **253/253**, Linux **253/253**, 0 Fehler/übersprungene Tests; Build jeweils erfolgreich. Gezielte Suite umfasst Rechte, Textsteuerung, Fotos/Masken, Wiederherstellung, Kategorien/Suchvorrang, Größen/Preisvertrag, mobile Navigation und Konverter. Der tatsächliche Upload-Sync ist gegen nachträgliche Verkleinerung abgesichert.
- Isolierter Browser mit synthetischem Testfoto: Desktop 1440×709, Handyansichten 390×844 und 375×740. Textfeld öffnet die Steuerung darunter; Kategorie sofort übernommen; „kreuz“ liefert 18 Treffer trotz Kategorie Blumen. Kategoriebox zweispaltig, 44-px-Auswahlflächen, kein horizontaler Seitenüberlauf.
- 400×600-Testfoto auf 22×14 startet vollständig bei x=110/y=70 mm mit 60,67×91 mm. Desktop-Eckziehen vergrößert proportional; Rückgängig und Regler funktionieren. Touch-Eckziehen vergrößert/verkleinert; Löschen entfernt das Foto und seinen Aufpreis, Rückgängig stellt es wieder her. Foto-Aktionsleiste 133,5 px, Motiv-Aktionsleiste 182,8 px breit statt volle Vorschau. Logo verwendet denselben kompakten Stil; kein separates Logo-Uploadprodukt in dieser Hunde-Prüfstrecke getestet.
- Live: Text-Autosteuerung und neue Kategorien am Desktop sowie 390×844 bestätigt. Nutzer-Tab tatsächlich neu geladen: dieselben **7 Elemente / 4 Fotos**, gleiche Positionen, Größen und Rotation vor/nach Prüfung. Nur Auswahl und Reiter für die Sichtprüfung bedient. Bildschirmfotos lokal gesichert, keine Kundenfotos ins Repository übernommen.
- Beide öffentlichen Prüfseiten, beide JSON-Modelle und alle fünf referenzierten Moduldateien HTTP 200. Beide JSON-Dateien bytegleich zum Vorherstand: 43 Designs, 1999/2499 Cent, Zusatzmotiv 169 Cent.
- [Maschinenlesbarer Nachweis](2026-11-05-konfi-text-kategorien-foto-nachweis.json). Handyprüfung im Browser einschließlich Touch-Eingaben, **kein Test auf physischem Smartphone**.

## Veröffentlichung und Grenzen

Änderungen mit Vorher-Hashes geprüft, isolierte Serverkopie aus R6 erstellt, gezielten Patch eingespielt, dort Tests und Build ausgeführt. Danach nur Laufzeitpfad und die Modul-Ladeabschnitte der zwei HTML-Prüfseiten umgeschaltet. R6 und Sicherungen bleiben vorhanden. Die gesamte Modulzuordnung wurde übernommen, einschließlich der vier unveränderten nachgeladenen Module. Produkt-JSON und Kundendaten unverändert. Der aktive Server enthält weiterhin seine vorhandenen Host-Anpassungen; deshalb unterscheidet sich sein gebündelter Dateiname vom lokalen Prüfbuild.

Die 43 Designs benötigen weiterhin Mikails Sichtfreigabe. Keine neue Produktveröffentlichung, kein neuer echter Warenkorb- oder Produktionsnachweis; der V3-Preiskandidat wurde nicht aktiviert. Nächster Schritt: Mikails Sichtprüfung dieser sechs Bedienkorrekturen im aktualisierten Konfi. Weitere Änderungen erst nach seinem konkreten Auftrag.

[Konfi öffnen](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/22x14.html)
