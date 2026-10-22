# Geschützte Anbindung über Shopify-IDs – Arbeitsstand 22.10.2026

**Historischer Vorbereitungsstand.** Aktivierung, Preisumstellung und die inzwischen abgeschlossenen Testbestellungen #1024/#1025 samt automatischem Werkstatteingang sind in [ID-PREISSTAND-20261022.md](ID-PREISSTAND-20261022.md) dokumentiert. Die nachfolgenden offenen Punkte beschreiben den damaligen Zeitpunkt.

Aufgabenbranch: `task/universelle-konfi-anbindung-20261022`, Ausgangsbasis `48d7a63d32b0d7d4560ec16e9473bb3cb8eecb1c`.

## Enthaltener Quellstand

- Exakte Shopify-Produkt- und Varianten-ID werden an einen bestimmten Datenspeicher, ein Produkt und eine unveränderliche Revision gebunden. Frische serverseitige Shopify-Leseprüfung, Centpreisvergleich und erwarteter Zuordnungsstand sind vor dem Schreiben erforderlich. Keine Auswahl des ersten oder neuesten passenden Produkts.
- Altdatenbestand und neuer Acryl-Bestand verwenden ihre vorhandenen Datenbankverbindungen. Der ausdrücklich bestätigte einzelne Altbestand wird dadurch nicht als mandantenfähige Datenbank ausgegeben.
- Geschützter Händler-Testzugang für beide Editortypen; keine anonyme Freigabe interner Mitarbeiter-APIs. Authentifizierung, Herkunftsprüfung und CSRF bleiben erforderlich.
- Warenkorb anlegen, weitere Gestaltung ergänzen und konkrete Position aktualisieren. Fremde Positionen und ihre Mengen werden geprüft. Unbekannter Ausgang wird nicht durch einen blinden erneuten Aufruf ersetzt.
- Unveränderliche Konfigurationsrevision zum Bearbeiten eines Warenkorbstands. Ursprüngliche und bearbeitete Fotos bleiben im privaten Prüfstand erhalten. Konfigurations-ID und Revision werden bei der Bestellübernahme geprüft.
- Testbestellungen beider Datenspeicher werden über den bestehenden signierten Webhook zugeordnet. Unveränderte Rohdaten, Signaturprüfung und Wiederholungsschutz bleiben erhalten. Keine gemeinsame SQL-Transaktion über beide Datenspeicher wird behauptet.
- Vollständiger Stückpreis als Grundlage ausdrücklich hinterlegter Mengenstaffeln. Es wird keine allgemeine Staffel für alle Produktarten erfunden.

Die Dateien unter `legacy-patches/` enthalten Original-Quellfixtures und einen durch Prüfsumme begrenzten Kompatibilitätspatch. `ops/legacy-host-overlay/` enthält die beiden kleinen Factory-Erweiterungen für den gesicherten Altrelease. Die aktuellen Hauptmodule dürfen nicht pauschal über den vollständigen alten Kundeneditor kopiert werden.

## Ausgeführte Prüfungen

- 126 unterschiedliche lokale Prüfungen der Warenkorb-, Revisions- und Preisverträge bestanden.
- 40 lokale Prüfungen des geschützten Zugangs, des Webhookroutings und der Hostzusammenführung bestanden; darunter 16 HTTP-Prüfungen über Loopback.
- Legacy-Kompatibilität nach Ergänzung der Bestellrevision: 9 von 9 Prüfungen bestanden.
- Browser-Hilfsmodul für die ID-Sitzung: 5 von 5 Prüfungen bestanden. Syntaxprüfung der ergänzten Browsermodule bestanden.
- Beide vollständigen Releasekopien lokal aus den gesicherten Originalquellen gebaut und mit getrennt wiederhergestellten Daten gestartet. 34 und 799 Datensätze; unveränderte Inhalte der bisherigen 50 beziehungsweise 65 Tabellen bestätigt. Die bereits vorhandene betriebliche Zeitspalte `tenant_settings.updated_at` ist ausdrücklich vom Inhaltsvergleich ausgenommen; die Einstellungswerte sind verglichen.
- Vollständiges Quellpaket privat auf den Server übertragen; Integrität und Builds beider Releases bestätigt. Eine zusätzliche vollständige Datenprüfung auf dem Server wurde wegen sehr langsamer Ausführung beendet. Sie zählt nicht als bestandene Server-Wiederherstellungsprüfung.
- Alle 19 Dateien der separat vorbereiteten Shopify-Theme-Erweiterung gegen die tatsächlich aktive Version bestätigt. Die neue Preisversion ist zu diesem Dokumentstand noch nicht freigegeben.

## Grenzen und nächster Schritt

Dies ist noch kein Nachweis einer abgeschlossenen Shopify-Testbestellung mit der neuen universellen Anbindung. Aktivierung, echter Browserdurchlauf, Prüfung von Foto und Bearbeiten-Link sowie Mengen 2 und 3 bis zur bezahlten Shopify-Testbestellung stehen noch aus. Eine Testbestellung ist keine Fertigungsfreigabe.

Der native Editor behält seine bisherige Bedienung. Bei neuem Wiederöffnen sind die bearbeiteten Fotobytes gesichert; die vollständige Wiederherstellung sämtlicher nativer Foto-Schieberegler ist noch separat zu prüfen. Formprodukte haben weiterhin ihren bestehenden Preisvertrag; für bisher nicht unterstützte variable Zusatzpreise oder Mengenstaffeln ist ein ausdrücklicher gemeinsamer Vertrag mit Shopify erforderlich.

Der Zugriff läuft vorerst ausschließlich für angemeldete Händler. Sitzungen und der aktuelle Warenkorbkontext sind im Speicher begrenzt; das dauerhafte Übergabejournal verhindert unkontrollierte Wiederholung nach Neustart. Keine Zusage einer dauerhaften Kundenkonto-Warenkorbverwaltung oder unbegrenzter Lastfähigkeit.

Private Datenbanken, Fotos, Sicherungsarchive, Zugangsdaten und private Startkonfigurationen sind nicht Teil dieses Commits. Die überprüfte Datensicherung liegt getrennt auf dem Rechner des Nutzers. Für eine vollständige Wiederherstellung sind Quellstand, private Sicherung und vorhandene Serverkonfiguration zusammen erforderlich. Ein Git-Clone allein enthält die privaten Werkstattdaten nicht.

Nächster Schritt: Den vorbereiteten geschützten Serveranschluss kontrolliert aktivieren, die konkreten Pilot-IDs mit frischer Shopify-Prüfung speichern, die Preisfunktion als nicht freigegebenen Kandidaten prüfen und anschließend die autorisierten Testkäufe durchführen. `main` bleibt unverändert.
