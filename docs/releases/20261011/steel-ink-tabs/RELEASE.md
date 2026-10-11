# Edelstahlgravur, Randabstand und Produkt-/Designtabs

## Verhalten

Edelstahl-Vektorgrafiken aus SVG/PDF erscheinen schwarz. Originalfarben werden nicht überschrieben. Rein weiße Aussparungen bleiben frei; Raster- und gemischte Bildquellen behalten die bisherige Tonwertdarstellung. Aufbereitete PDF-Bestandteile werden einzeln erkannt. Die Farbauswahl wird bei Edelstahlgravur durch eine zutreffende Farbangabe ersetzt.

Beim Edelstahl-Import ist der Randabstand sichtbar und mit 0 mm vorbelegt. Er gehört zum geprüften Importplan und wird erst bei ausdrücklicher Übernahme gespeichert. Proportionen, originale Seitenweißräume und die echte Außenkontur gelten weiterhin. Andere Designs, Preise und historische Versionen bleiben erhalten. Bestehende Designs können unter Hauptprodukt → Schildgröße & Form mit „Ohne Rand neu einpassen“ bewusst angepasst werden.

Hauptprodukt und Designs sind eigene Tabs. Produkteinstellungen sind zusammen erreichbar; Designauswahl mit Suche und umgebrochenem Raster. Import, eigenes Design und KI sind getrennte Aktionen. Tastatur, mobile Darstellung und ungespeicherte Bearbeitung beim Tabwechsel geprüft.

## Prüfstand

- 120 authentifizierte lokale API-Anfragen im Browserablauf, synthetische App-Bridge-Anmeldung. Kein echter Shopify-Browserlogin behauptet.
- Pixelprüfung mit realem Browser: graue Vektor-PDF/SVG schwarz (RGB 0/0/0), weiße Aussparung frei, Rasterfoto und Druckfarben unverändert.
- Tatsächliches Edelstahlprodukt Revision 3 in privater Kopie: neun importierte Vektorelemente, randloses Einpassen und Originalerhalt geprüft. Keine Produktrevision live verändert.
- 18 anfängliche gezielte Tests sowie 19 abschließende Vertrags-/Randtests bestanden; Mengen überschneiden sich. Vollständiger Lauf: 727 Prüfungen, zunächst 726 bestanden und ein veralteter Farb-Sollwert. Nach Anpassung von Dunkelgrau auf das ausdrücklich verlangte Schwarz bestanden alle 19 Prüfungen des betroffenen Vertrags-/Randbereichs. Keine offenen Testfehler.

## Sicherung und Veröffentlichung

Vorab alle drei privaten SQLite-Datenbanken mit Integrität und SHA-256 auf Server und in Cloud gesichert. Alle historischen Revisionen/Originale gegenüber letzter Sicherung erhalten; Nutzer hat zwischenzeitlich eine weitere Produktrevision und neun Ressourcen ergänzt. Aktueller Produktzeiger/Katalog spiegeln diese Nutzeränderung wider.

Eine erste synchrone Sicherung überschritt das Zeitlimit. Der unvollständige Versuch wurde nicht als Sicherung verwendet. Die erfolgreich geprüfte Sicherung lief danach als eigenständiger Hintergrundprozess in einem neuen Verzeichnis. Auch der fehlerhafte Downloadaufruf wurde mit korrigiertem relativen Pfad ersetzt.

Quellstand **7a168bc66adc9718bc9b0fefad97c338e546c57d**, Version **0.1.0-recovery.20261010+7a168bc66adc**, ist auf dem getrennten Händlerhost aktiviert. 425 Manifestdateien beim Staging geprüft; getrennte Installation und Start bestanden. 17 HTTPS-Prüfungen bestätigen neue Tabs, bytegleiche ausgelieferte JS/CSS-Dateien und geschützte API. Genau ein neuer Händlerprozess nach Aktivierung bestätigt. Bestehende Konfiguration erhalten, vier KI-Aufträge/34 Cent unverändert. [Installationspaket und Prüfsumme](../../../../deliverables/merchant-steel-ink-tabs-20261011/README.md).

Alle Zeilen in 50 Tabellen sind nach dem Wechsel unverändert erhalten. Drei Nachher-Datenbanksicherungen auf dem Server per SHA-256/SQLite geprüft; sie sind bytegleich zur heruntergeladenen Vorher-Sicherung. Daraus wurde eine separat benannte, erneut geprüfte private Cloud-Kopie angelegt. Aktuelles Edelstahlprodukt bleibt Revision 3; keine automatische Anpassung seiner Gestaltung.

Code, Ressourcen, Nachweise und versioniertes ZIP sind auf GitHub unter `task/steel-ink-product-tabs-20261011`, `backup/account-recovery-20261010` und `task/full-backup-install-20261010` gesichert. Produktbasis a2af162 und alle neueren lokalen Vorgängercommits erhalten. Private Inhalte bleiben außerhalb Git. Alte Live-Kundenwerkstatt/Theme unverändert. Produktionseinstellungen, Maschinenabnahme und öffentliche Verkaufsbindung sind keine neuen Freigaben dieses Pakets.
