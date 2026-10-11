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
- Private SQLite-Sicherung vor Veröffentlichung, zusätzliche Sicherung beim angehaltenen Händlerprozess vorgesehen. Bestellstände, Shopify-Produkt, Zahlungs-Testmodus und alte Kundenwerkstatt werden nicht bearbeitet. Es wird kein weiterer Kauf ausgelöst.

Installations-/Veröffentlichungsnachweis wird nach dem geprüften Paket ergänzt. Historische, nicht angeschlossene Cloud-Arbeitsplätze und nicht bereitgestellte Dateien bleiben unerreichbar; vorhandene Sicherungen werden nicht als Zugriff auf diese Quellen ausgegeben.
