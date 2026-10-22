# Fortsetzung der Browserabnahme: Preisanzeige und Foto

Ausgangscommit: `5246eddb7211d16929e003cd3d3a0a17cdafdfc9`, Branch `task/universelle-konfi-anbindung-20261022`. Diese Ergänzung aktualisiert den Browser-Zwischenstand in `ID-PREISSTAND-20261022.md`. Die dort nachgewiesenen Testbestellungen #1024/#1025 bleiben unverändert gültig.

## Beobachtet und korrigiert

Die bereits geöffnete Shopify-App ließ sich über Katalog und Kundenansicht bedienen. Texteingabe, Fotoauswahl und Vorschau wurden im Browser beobachtet; die Dateiauswahl wurde vom Nutzer bestätigt und bedient. Die früher leere Einbettung ist damit nicht generell behoben: Ein separat neu geöffnetes App-Fenster blieb erneut leer. Keine Änderungen an Anmeldung, CSP oder sonstigen Schutzmechanismen.

Mit zwei Exemplaren und einem Foto zeigte der Editor tatsächlich 63,20 € an, während der gemeinsame Warenkorbdienst und die vorher abgenommene Testbestellung korrekt 62,00 € berechneten. Ursache: `ux.mjs` addierte die ungekürzten Fotokosten nach der Staffelberechnung. Die Editoranzeige verwendet jetzt dieselbe Funktion `commercePrice` wie die Bestellstrecke. Fotoaufschläge werden einmal berücksichtigt; die bestehenden nicht auf den Gesamtpreis bezogenen Altstaffeln bleiben erhalten. Preisdetails zeigen ungekürzte Komponenten und den tatsächlichen Rabatt je Stück.

Beide unterschiedlichen Editorfassungen wurden gezielt geändert, nicht gegeneinander ausgetauscht:

- Legacy: `c10b4b897421a769f4809a2a5515dc87b613edc8cad352a8658da78a6cf13112` → `96d7c897080a0c3fed63cea32661a5452a3afdcb2fcfe10b4c9cf1ca6c6a07c0`.
- Acryl: `5a43141e43eecc4ffeb1f9856319ff4392b5fa13047d72f4caffb2d35e5cab53` → `8b4edfca04ddbf5cfe724d8fcae9064bef21fad1d924d8bbc717cce26201f5c4`.

`legacy-patches/preview-price-compat.mjs` akzeptiert nur diese überprüften Ausgangsdateien. Der vorhandene Release-Builder wendet den Patch auf beide getrennten Originalquellen an. Die kanonische `app/configurator/variant-m/ux.mjs` enthält dieselbe Änderung für den neueren Editor. Die übrigen Funktionen und die Unterschiede zwischen beiden Quellständen bleiben erhalten.

## Tatsächlich geprüft und installiert

- Sechs gezielte Tests führen die tatsächliche `updatePrice`-Funktion aus: zwei/drei Exemplare mit Foto, Einzelstück/ohne Staffel, historische Staffel, Befestigung/Motivaufschlag und Entfernen des Fotos. Je sechs Tests mit neuer und alter Editorfassung bestanden. Der unveränderte vorherige Quelltext scheitert bei vier dieser sechs Prüfungen; 63,20 statt 62,00 € wird reproduziert.
- Die vorhandenen 29 vollständigen Stückpreisstaffel-Tests des lokalen geprüften Preispakets bestanden. Diese sind getrennt von den neuen sechs Browseranzeige-Regressionen zu zählen.
- Paket `gravuru-preview-price-fix-v1.zip`, 42.022 Bytes, SHA-256 `1cc637ebe545a567ca132baba0f44cee343ce95b96ef865fd0247c663245c98b` privat auf den vorhandenen Testhost übertragen und vor Ausführung geprüft.
- Installer sicherte beide alten Dateien, prüfte die erwarteten Hashes und die Syntax und ersetzte nur die beiden statisch ausgelieferten `ux.mjs`. Kein Prozessneustart, keine Datenbank geöffnet, keine Shopify-Änderung. Sofortige Rücknahme bei Installationsfehler; unbekannte oder konkurrierende Änderungen werden nicht überschrieben.
- HTTP-Auslieferung geprüft: Legacy-Hash entspricht der installierten Datei. Acryl-HTTP-Hash `7b4c5d2211dc337f957272fafbbd47f09957b0d5fcc4eae3fd01fca171d7ed4a` entspricht der installierten Datei nach den bestehenden Pfadumschreibungen des Acryl-Hosts.
- Plesk meldete zuvor einen Prüfbefehl über der erlaubten Länge von 980 Zeichen. Der abgewiesene Aufruf wurde privat dokumentiert; neue Aufrufe bleiben darunter. Eine frische kurze Leseprüfung bestätigt HTTP 200 und die unveränderte Prüfsumme des privaten Abschlussarchivs. Keine neue wiederkehrende Aufgabe angelegt.

Die ursprünglichen beiden Dateien und die Installationsquittung liegen privat unter `gravuru-tier-operations-20261022/preview-price-before-v1/`. Die lokale Vorbereitung bewahrt die Originalquellen sowie `analysis/preview-price-fix-v1/canonical-before.mjs`. Vollständige Datenbanksicherungen und bisherige Bestellbelege bleiben unverändert.

## Verbindliche Fotoregel und behobener Fotoblocker

Neueste Nutzerentscheidung: **höchstens 15 MB je Foto, keine zusätzliche Megapixelgrenze für den Upload**. Technisch bleibt die bereits bestehende Grenze `15 * 1024 * 1024` Bytes erhalten. Ein gültiges einzelnes JPEG, PNG oder WebP wird geprüft; animierte und beschädigte Dateien werden weiterhin abgewiesen. Maximal vier Fotos/Logos bleiben unverändert.

Der ursprüngliche Server wies das neue PNG mit 24,9 Megapixeln trotz nur 419.262 Bytes ab. Eine zwischenzeitlich eingespielte Angleichung der Vorschau an die alte 20-MP-Servergrenze ist durch diese Nutzerentscheidung ausdrücklich überholt und ersetzt. Beide Editorfassungen haben jetzt keinen zusätzlichen Pixel-Grenzwert beim Upload. Bestehende Begrenzungen für abgeleitete Browser-Bearbeitungsbilder sind keine Uploadgrenze und verändern das Original nicht.

`photo-import.py` ersetzt die pauschale Pixelgrenze durch isolierte Linux-Verarbeitung: maximal zwei gemeinsame Worker je Unix-Benutzer, je 512 MiB Adressraum und 20 CPU-Sekunden. Der vorhandene Node-Aufrufer behält seine 30-Sekunden-Frist sowie die Ausgabelängenprüfung. Überlastung wird mit einer verständlichen Meldung beendet. Die Grenzen schützen die Verarbeitung; sie garantieren nicht, dass jede beliebige oder beschädigte komprimierte Datei verarbeitet werden kann. Lokale Windows-Tests prüfen Funktion und Dateigröße, die Ressourcenbegrenzung wurde gesondert auf dem Linux-Testhost geprüft.

Für die Vorschau wird vor großen Kopien auf höchstens 1600 × 1600 Pixel verkleinert. EXIF-Ausrichtung, Transparenz und der bestehende Monochrommodus bleiben berücksichtigt. Produktionsmaße beziehen sich weiter auf das orientierte Original. Die Originalbytes werden nicht verändert.

Technische Grundlagen: [Pillow zur Pixelwarnung](https://pillow.readthedocs.io/en/stable/reference/Image.html) und [Python-Ressourcenlimits](https://docs.python.org/3/library/resource.html). Die Absicherung erfolgt durch tatsächliche Prozesslimits und gemeinsame Slots, nicht durch das bloße Abschalten einer Warnung.

## Neue tatsächlich bestandene Abnahme

- Lokal acht erfolgreiche Fototests, einschließlich des tatsächlichen privaten Uploads; drei ausschließlich für Linux gedachte Prüfungen dort übersprungen. Auf dem Linux-Testhost zehn Prüfungen bestanden; lediglich der optionale lokale Privatdateitest dort übersprungen. Geprüft: gültige Formate, 48-MP-PNG, exakt 15 MB/15 MB + 1 Byte, beschädigte Dateien, Mehrbild-PNG, EXIF, Alpha/Monochrom, Prozesslimits, Dekompressionsangriff und gemeinsame Workerbelegung.
- Paket `gravuru-photo-15mb-v1.zip`: 46.674 Bytes, SHA-256 `3a1f652a4f2244abdbadd489aab8a1d09061451e2448c77d4b6b9681b12553c4`. Vier gezielte Dateien installiert: beide bestehenden `ux.mjs` und beide identischen `photo-import.py`. Vorherige Dateien privat gesichert; Hash- und Syntaxprüfung, Linux-Tests vor dem Austausch. Keine Datenbank beim Installieren geöffnet, kein Node-Neustart und keine Shopify-Einstellung verändert.
- Endgültige Dateihashes: Legacy-UX `9f7e9ce0c589d76b957c0cf356a707594b7598efb1e6a7e646b9457fe60b2dff`; Acryl-UX `5e566c881caf34b04deff523215239ac571d89602eebf17beb56f9b596aaa170`; beide Fotoworker `5316af4e529d6b18999d18cc72e824878e8f4ee2459979cc544ac31240588822`.
- Der bereits offene Browserentwurf ließ sich danach ohne erneuten Foto-Upload erfolgreich als Revision 1 sichern. Textänderung und Foto blieben erhalten. Der Testwarenkorb bestätigte 62,00 € für zwei Exemplare einschließlich Foto.
- Dieselbe Gestaltung wurde im sichtbaren Shopify-Testcheckout abgeschlossen: zwei Exemplare, 62,00 € Artikel + 4,99 € Versand = 66,99 €. Shopify-Bestell-ID `13746109022588`. Ausschließlich Test Payment Gateway; keine echte Zahlung oder Fertigungsfreigabe.
- Automatischer Werkstatteingang bestätigt: genau eine Position, Menge 2, Stückpreis 3.100 Cent, Gesamt 6.200 Cent, `test=true`, Status `test-paid-event-recorded`, `productionReady=false`, `customerDownloadAllowed=false`. Unveränderliche Konfigurationsrevision 1 zugeordnet.
- Originalfoto serverseitig und im anschließend heruntergeladenen privaten Prüfpaket byteidentisch bestätigt. Paket lokal 5.692.074 Bytes; ZIP-Prüfung und alle acht enthaltenen Dateiprüfsummen bestanden. Private Quittungen, Paket und Checkout-Screenshot liegen im bestehenden lokalen privaten Sicherungsordner unter `shopify-tier-tests/browser-abnahme/`, nicht in GitHub.
- Der gesicherte Stand wurde im Dashboard erneut geöffnet: 62,00 €, Menge 2, ein Originalfoto und unveränderte Originalpixelmaße sichtbar. Die früheren Prüfstände bleiben vorhanden.

## Offene Prüfgrenzen und genau nächster Schritt

Die neu geladene Preisanzeige ist über die tatsächliche ausgeführte UI-Funktion geprüft. Der bis zur Bestellung verwendete Browserentwurf hatte noch die vor dem Fix geladene Anzeige von 63,20 €; sein bestätigter Warenkorb und Checkout zeigten korrekt 62,00 €. Das vollständige Wiederöffnen dieser Konfigurationsrevision im frisch geladenen Editor und der sichtbare Wechsel zwischen zwei/drei Exemplaren (62,00 €/89,04 €) sind deshalb noch separat abzunehmen. Die erfolgreiche neue Fotobestellung ersetzt diese offene UI-Prüfung nicht. Die frühere Drei-Stück-Testbestellung bleibt nachgewiesen; mit dem neuen Foto wurde jetzt die Zwei-Stück-Strecke geprüft.

Zuerst diesen gespeicherten Stand im neuen Editor wieder öffnen und die Preisansicht prüfen. Die bei einem separaten neuen App-Fenster leere Einbettung anschließend gezielt untersuchen. Danach weitere konkrete Produkt-/Varianten-IDs prüfen; es sind weiterhin neun Legacy-Varianten und eine Acryl-Variante gebunden, nicht sämtliche Produkte freigegeben.

Für einen neuen vollständigen Quellstand den vorhandenen `prepare-combined-id-release.mjs` mit den gesicherten getrennten Originalquellen verwenden. Er wendet beide gezielten Editor-Patches an und übernimmt den neuen Fotoworker in beide Stores. `install-photo-15mb.py` ist ausschließlich der quittierte einmalige Übergang von den dokumentierten Zwischenhashes auf dem Testhost; ein Git-Clone ersetzt nicht die privaten Originalquellen und Datenbestände. Frühere private Installationspakete sind historische Rücknahmen, keine aktuellen Release-Bausteine.

Keine Fotos, privaten Prüfstandpakete, Datenbanken, Zugangsdaten oder Checkout-Tokens in GitHub.
