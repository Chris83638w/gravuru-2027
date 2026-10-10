# Authentifizierte Kunden-Vorschau – 10.10.2026

Auf Quellbasis `2662ddd`: neue Händlerseite `/werkstatt/kundenansicht/` lädt eine ausdrücklich gespeicherte Produktrevision über die vorhandene App-Bridge-Anmeldung. Acryl-/Schiefer-Konfigurator und freie Formen erhalten geschützte API-Aufrufe aus dem Elternfenster; keine Händler-JWTs in URLs oder Speicherung. Öffentliche Modelllisten bleiben gesperrt. Erweiterte Skriptrechte gelten nur für den historischen statischen Renderer; die Händlerseiten behalten ihre strengere CSP.

Produktkarten, Einzelbearbeitung und historische Vorschauen verweisen auf diesen Anschluss. Feste Acrylbilder sind erreichbar; private Vorlagenbilder werden authentifiziert geladen oder in die geschützte SVG-Antwort eingebettet. Private Entwürfe und Prüfstände bleiben in der Datenbank außerhalb von Git.

Prüfung: 40 gezielte Node-Tests bestanden. Tatsächlicher Chromium-Browser gegen die lokale zweistufige Händlerlaufzeit: Produktanlage, Acrylgestaltung mit synthetischem Foto, private Sicherung, freie Form mit importiertem SVG, private Sicherung, mobile Ansicht bestanden. Sämtliche beobachteten Werkstatt-API-Aufrufe authentifiziert und erfolgreich; keine JavaScript-Fehler. Identität und HTTPS-Eingang sind simuliert; keine echte Shopify-Anmeldung oder Testbestellung damit behauptet. [Browsernachweis](merchant-preview-browser.json).

Gefundene und korrigierte Fehler: fehlende Freigabe fester Acrylbilder; unangemeldeter privater SVG-Aufruf in der Formproduktvorschau. Der zunächst fehlende Foto-Upload war eine korrekt abgewiesene unvollständige Testgestaltung. Der Sandkasten erzeugt künstliche `.git`-Verzeichnisse und kollidiert mit dem Schutz privater Daten; Tests wurden genehmigt in eigenen temporären Verzeichnissen außerhalb dieses Sandkastens ausgeführt, ohne die Schutzprüfung zu entfernen.

Noch offen: vollständige Shopify-Warenkorb-/Bestellbindung des neuen Produkts, echte Händleranmeldung, Testbestellung im bestätigten Zahlungs-Testmodus und physische Fertigungsabnahme. Nächster Schritt: versioniertes Händlerpaket, private Bestandssicherung und überprüfbare Installation.

Abschlussregression: 655 Tests ausgeführt (654 direkt erfolgreich); fehlenden Browserkontext im Kartentest korrigiert und alle 16 betroffenen Folgeprüfungen bestanden. Fünf Aktivierungsprüfungen sichern Datenbankerhalt, Prozesssperre, konkurrierende Änderungen, Quellprüfsummen und Ausschluss der alten Werkstatt. [Genaue Zählung](merchant-regression.json).
