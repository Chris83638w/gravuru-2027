# Werkstatt-Korrekturen · 11.10.2026

Der Nutzer meldete blockierte Anmeldung und Anlage von Mastervorlagen, einen ungewollten Auswahlrahmen, fehlenden Rohlingwechsel, fehlenden Schrift-Upload und einen fehlgeschlagenen PDF-Import. Der frühere Testkauf belegt diese Verwaltungsabläufe nicht.

## Korrekturen

- App Bridge erhält die feste Shop-Angabe bereits vor dem Start. Mit der echten CDN-Datei und leerem Browserspeicher ist der bisherige Fehler `missing required configuration fields: shop` reproduziert; die Korrektur startet fehlerfrei. Navigation und History behalten öffentliche Shopify-Parameter. Neue Tabs gehen über Shopify. JWT-Prüfung, CSRF und feste Shopbindung bleiben aktiv; keine anonymen Ersatzschreibzugriffe.
- PDF/SVG-Import und seine Vorschau verwenden die tatsächliche Schiefergeometrie statt 150 × 200 mm Acrylglas. Originale und ältere Produktstände bleiben erhalten. Geschützte importierte Grafikressourcen werden in Verwaltungs- und Kartenvorschauen eingebettet, damit keine anonymen Bildabrufe scheitern.
- Elementauswahl verändert keine SVG-Rechtecke mehr. Die Tastaturauswahl bleibt über die Elementliste erreichbar. Positionsfelder verwenden ebenfalls die tatsächlichen Produktmaße.
- Unter **Hintergrund & Szene** lässt sich das **Rohlingbild austauschen**: JPEG, PNG oder WebP bis 15 MB, geprüfte Bilddatei, Original privat erhalten. Es gelten weiter die vorhandenen Produktmaße, Bohrungen und Preise; dies ist keine automatische Konstruktion eines anderen physischen Plattentyps.
- Hauptnavigation **Schriften & Profile**: TTF/OTF bis 8 MB hochladen, anschließend über **Neues Profil → Schriften** gruppieren. Vollständige Unicode-Zuordnung der Datei wird umgewandelt, nicht still beschnitten. Vollständiges lateinisches Alphabet und Ziffern erforderlich; variable Fonts und Dateien mit über 10.000 Zeichen bzw. über 8 MB Pfaddaten werden mit Hinweis abgelehnt. Originale und Ressourcen liegen privat in `design-assets.sqlite`, unveränderlich nach Inhalts-Hash. Neue Schrift kann im Produkt gewählt und gespeichert werden. Produktdatenlimit für vollständige Schriftpfade: 16 MB.

## Nachweise und Grenzen

- Browser-Klickfolge auf echter lokaler Händlerlaufzeit mit synthetischer App-Bridge-Identität: Schriftupload (Open Sans, 883 Zeichen), Gruppe speichern und nach Neuladen finden, Produktfont und Rohlingbild speichern und wieder öffnen, pixelgleiche Produktgrafik beim Wechsel der Auswahl, PDF-Vorschau 220 × 140 mm, Import speichern und wieder öffnen, neue Mastervorlage anlegen. Zusätzlich bestehende Desktop-/Mobil-Kundenansicht, Fotoupload, Prüfsicherung und synthetische Warenkorbantwort. 130 authentifizierte API-Aufrufe erfolgreich, keine JavaScript-Fehler.
- Echte CDN-Initialisierung getrennt geprüft. Dies beweist **keine echte Händleranmeldung im Browser des Nutzers**; dieser Browser ist hier nicht fernsteuerbar.
- 16 vorhandene Original-PDFs sowie drei neuere Original-Uploads aus der frischen Serversicherung passen auf die tatsächliche 220 × 140 mm große Gedenktafel. Prüfung in privaten Kopien; keine Produktdaten dadurch geändert. Die Zuordnung der drei jüngsten Dateien erfolgt nach Hash, nicht nach einem geratenen Screenshot-Dateinamen.
- Private SQLite-Sicherung vor Veröffentlichung und zusätzliche konsistente Sicherung beim angehaltenen Händlerprozess abgeschlossen. Bestellstände, Shopify-Produkt, Zahlungs-Testmodus und alte Kundenwerkstatt werden nicht bearbeitet. Es wird kein weiterer Kauf ausgelöst.

## Veröffentlichung und Sicherung

Live: Quellcommit **0754445b624961be390286f7575bfaefa080aa70**, Version **0.1.0-recovery.20261010+0754445b6249**, getrennte Händler-App unter https://app-2027.gravuru-designwerkstatt.de. 395 Dateien auf dem Server gegen das Paketmanifest geprüft. HTTPS, feste Shop-Angabe auf drei Verwaltungsseiten und sechs geänderte UI-Dateien geprüft; Verwaltungs-API und unsignierter Bestelleingang antworten ohne Anmeldung/Signatur mit 401.

**644 Tests bestanden, keine Fehler oder übersprungenen Tests.** Das ZIP wurde getrennt installiert, gebaut und gestartet. Bestell- und Testwarenkorb-Konfiguration bleiben idempotent; ein synthetischer signierter Eingang und Duplikaterkennung nach Neustart sind geprüft. Keine weitere echte Bestellung ausgelöst.

Vier vorhandene Produktrevisionen, zwei Profilrevisionen, 19 Designoriginale, 19 Designressourcen und das Rohlingbild stimmen vor und nach dem Wechsel inhaltlich überein. Gedenktafel bleibt auf Revision 2 mit Cormorant Garamond und neun Shopify-Variantenbindungen. Workshop- und Profildatenbank sind vor/nach Wechsel bytegleich. In der Ressourcendatenbank wurde nur die neue leere Schriftbibliothek ergänzt. Drei Datenbanken nach dem Wechsel nochmals serverseitig gesichert und als private Cloud-Kopien anhand SHA-256 und SQLite-Integrität geprüft.

[Versioniertes Installationspaket mit SHA-256](../../../../deliverables/merchant-repair-20261011/README.md). Quellstand, Paket und Nachweise werden auf `task/live-release-20261010`, `backup/account-recovery-20261010` und `task/full-backup-install-20261010` gesichert. Produktbasis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70` bleibt Vorfahr; keine neueren Änderungen verworfen.

Zugriffs-/Ablaufgrenzen: Der Stop-Helfer fand nach Abschalten des Händlerhosts keinen eindeutig laufenden Besitzer und brach vor einer Änderung ab. Statt unveränderter Wiederholung wurde die Aktivierung mit ihrer eigenen exklusiven Dateisperre ausgeführt. Die HTTP-Verbindung lief nach 55 Sekunden aus; der noch laufende Sicherungsprozess wurde geprüft und der fertige Aktivierungsbeleg abgewartet. Ein zusätzlicher Vergleichsprozess endete mit Exit 9 ohne Diagnose; der Vergleich wurde auf einen speichersparenden Python-Zeilenvergleich umgestellt und bestand. Keine unbestätigte Aktivierung wiederholt.

 Historische, nicht angeschlossene Cloud-Arbeitsplätze und nicht bereitgestellte Dateien bleiben unerreichbar; vorhandene Sicherungen werden nicht als Zugriff auf diese Quellen ausgegeben.
