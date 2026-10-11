# Edelstahlgravur, Randabstand und Produkt-/Designtabs

## Verhalten

Edelstahl-Vektorgrafiken aus SVG/PDF erscheinen schwarz. Originalfarben werden nicht überschrieben. Rein weiße Aussparungen bleiben frei; Raster- und gemischte Bildquellen behalten die bisherige Tonwertdarstellung. Aufbereitete PDF-Bestandteile werden einzeln erkannt. Die Farbauswahl wird bei Edelstahlgravur durch eine zutreffende Farbangabe ersetzt.

Beim Edelstahl-Import ist der Randabstand sichtbar und mit 0 mm vorbelegt. Er gehört zum geprüften Importplan und wird erst bei ausdrücklicher Übernahme gespeichert. Proportionen, originale Seitenweißräume und die echte Außenkontur gelten weiterhin. Andere Designs, Preise und historische Versionen bleiben erhalten. Bestehende Designs können unter Hauptprodukt → Schildgröße & Form mit „Ohne Rand neu einpassen“ bewusst angepasst werden.

Hauptprodukt und Designs sind eigene Tabs. Produkteinstellungen sind zusammen erreichbar; Designauswahl mit Suche und umgebrochenem Raster. Import, eigenes Design und KI sind getrennte Aktionen. Tastatur, mobile Darstellung und ungespeicherte Bearbeitung beim Tabwechsel geprüft.

## Prüfstand

- 120 authentifizierte lokale API-Anfragen im Browserablauf, synthetische App-Bridge-Anmeldung. Kein echter Shopify-Browserlogin behauptet.
- Pixelprüfung mit realem Browser: graue Vektor-PDF/SVG schwarz (RGB 0/0/0), weiße Aussparung frei, Rasterfoto und Druckfarben unverändert.
- Tatsächliches Edelstahlprodukt Revision 3 in privater Kopie: neun importierte Vektorelemente, randloses Einpassen und Originalerhalt geprüft. Keine Produktrevision live verändert.
- 18 anfängliche gezielte Tests sowie 19 abschließende Vertrags-/Randtests bestanden; Mengen überschneiden sich. Vollständiger Regressionslauf läuft noch.

## Sicherung und Veröffentlichung

Vorab alle drei privaten SQLite-Datenbanken mit Integrität und SHA-256 auf Server und in Cloud gesichert. Alle historischen Revisionen/Originale gegenüber letzter Sicherung erhalten; Nutzer hat zwischenzeitlich eine weitere Produktrevision und neun Ressourcen ergänzt. Aktueller Produktzeiger/Katalog spiegeln diese Nutzeränderung wider.

Eine erste synchrone Sicherung überschritt das Zeitlimit. Der unvollständige Versuch wurde nicht als Sicherung verwendet. Die erfolgreich geprüfte Sicherung lief danach als eigenständiger Hintergrundprozess in einem neuen Verzeichnis. Auch der fehlerhafte Downloadaufruf wurde mit korrigiertem relativen Pfad ersetzt.

Paketinstallation und Aktivierung stehen für diesen Commit noch aus. Private Inhalte bleiben außerhalb Git. Alte Live-Kundenwerkstatt/Theme unverändert. Produktionseinstellungen, Maschinenabnahme und öffentliche Verkaufsbindung sind keine neuen Freigaben dieses Pakets.
