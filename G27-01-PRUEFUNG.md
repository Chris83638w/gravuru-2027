# G27-01 – Prüfstand vom 30.09.2026

## Umfang und Quellen

Getrennt lauffähige Kundenoberfläche mit einem Acrylprodukt und sechs Sockeln. Quellauswahl: `app/REFERENCE-UI.json`. Dessen Hashes beschreiben die Herkunft, nicht den aktuellen Änderungsstand. Aufgabenbranch: `task/g27-01-runnable-foundation`.

Wesentliche Dateien unter `app/configurator/variant-m/`: neuer `server.mjs` samt Test, `index.html`, selektiver `build.mjs`, gemeinsame Preis-/Rechteregeln in `acrylic-product.mjs`/`contract.mjs`, neue `field-mapping.mjs`, Kundenkorrekturen in `customer-tools`, `ux`, `workflow`, `photo-editor`, `help`, zugehörige Tests und native Testdaten. Alte Experiment-/Werkstattserver und Produktionspipeline sind nicht Laufzeitgrundlage.

## Automatisierte Nachweise

`node --test app/configurator/variant-m/*.test.mjs`: **57 bestanden, 0 fehlgeschlagen**. Build: **76 Ressourcen, ein Modell**. Die spätere reine Beschriftungsänderung für inklusive Acrylfotos wurde mit `node --check` geprüft.

- Alle 28 Preisfälle gegen feste erwartete Beträge: 2 Größen × 7 Sockelauswahlen × Wand ja/nein. Groß/Eiche/Wand: 3.697 Cent; kein Sockel ohne Aufpreis.
- Gemeinsame versionierte Preisquelle für Anzeige/Angebot. Feste Elemente dürfen weder entfernt, versteckt noch geometrisch verändert werden; freigegebene Farben/Inhalte bleiben editierbar.
- Fotozuordnung nur bei eindeutigem gleichen Feldschlüssel, Warnung bei fehlendem/mehrdeutigem Gegenstück; keine stille Übertragung anhand Reihenfolge.
- Sechs Regressionen prüfen registrierte Ereignisbehandlung in synthetischen DOM-Ports: mm-Werte über Eingabe/Fokuswechsel/Größenänderung und Erhalt fixer Fotoform. Keine echte Browserbedienung dieser Tests behaupten.
- Server: gültige Ressourcen, HEAD, Host-/Origin-Abweisung, Pfadbegrenzung, keine Admin-/Session-/Produktionsroute, POST abgewiesen, Live-Bestellung deaktiviert.

## Tatsächliche Browserbedienung

Normale Ansicht ohne `review=1`, eigener Port 8961; Desktop und 390 × 844. Temporäre Größenänderung danach zurückgesetzt.

- Alle sechs Sockel und ohne Sockel umgeschaltet. Kleine Preise: Buche 23,98 €, Eiche 24,98 €, Nussbaum 25,98 €, klar 18,98 €, satiniert 19,98 €, flach 20,98 €, ohne 14,99 €.
- Groß/Eiche/Wand sichtbar 36,97 €. Schriftgröße 12 mm im großen Format blieb nach Verlassen des Felds erhalten.
- Namen „Mia & Jörg“, Preset Blau und Farbwähler #008080 angewendet.
- Foto über den Hinweis im Bild durch eine lokale Test-PNG ersetzt; danach über „Ersetzen“ erneut ausgetauscht. Ein Fotofeld und unverändert neun Gestaltungselemente. Keine echten Kundendaten.
- Mobiler Doppelklick auf den Namen aktivierte die passende Textzeile. Kein Nachweis mit physischer Smartphone-Tastatur.
- Runde Farbbuttons, „Ausgewählte Farbe“, vier passende Reiter; keine Designauswahl/Zoom-/Druckbedienung in der Kundenansicht.
- Auswahl der unteren Textzeile: untere Eckgriffe sichtbar vor dem massiven Eichesockel. Abschließendes Browser-Fehlerprotokoll leer.

Lokale Screenshot-Nachweise im übergeordneten Arbeitsbereich `outputs/`: `gravuru-2027-pilot.jpg`, `gravuru-2027-mobile.jpg`, `g27-sockel-*.jpg`. Keine Freigabe fotografischer Gleichheit.

## Unabhängige Prüfung und Grenzen

Astra mit hohem Denkaufwand fand Fehler in mm-Schreibpfaden und beim Erhalt fixer Fotoform. Korrigiert und gezielt erneut geprüft; keine verbleibenden Blocker innerhalb dieses Prüfumfangs.

Nicht abgenommen: vollständiges G27-02/G27-05, Designverwaltung über eine neue Datenbank, Rückgängig in sämtlichen Abläufen, alle mobilen Browser, 100er-Import, Shopify-Testbestellung, neue Produktionsdateien mit Schriftpfaden/CMYK/Weiß/Konturen oder reale RIP-/Gravurprobe. Andere Positionsfelder verwenden teilweise noch 150-mm-Designkoordinaten; das gemeinsame Geometriemodell muss dies auflösen. Endgültige Schriftarten und vollständige visuelle Gleichheit zur Vorlage bleiben offen.
