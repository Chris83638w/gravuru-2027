# Strukturprüfung – gravuru Salbei

11.10.2026. `node validate_theme.mjs` meldet nach den Korrekturen: **68 JSON-Dateien, 42 Abschnittsschemas, 0 gefundene Fehler**.

Geprüft: JSON-Syntax, doppelte Setting-IDs und Blocktypen, Standardwerte für Bereiche und Auswahlfelder, Preset-Einstellungsnamen, Abschnitts- und Blockverweise, gespeicherte Bereichs-/Auswahlwerte einschließlich der globalen Einstellungen, vorhandene Abschnittsreihenfolgen und vollständige Blockreihenfolgen. Der Validator setzt bei Fehlern einen ungleich null Exit-Code und ist ohne fest codierten Arbeitsplatzpfad wieder ausführbar.

Zwei ungültige globale Radiuswerte wurden von 3 auf 4 geändert, passend zu Shopifys 2er-Schritten. Der nicht bestätigte Schrift-Handle `cormorant_garamond_n4` wurde auf den in Shopifys Schriftliste enthaltenen Handle `cormorant_n4` korrigiert. `node --check theme/assets/gravuru-salbei.js` bestand.

`package_theme.py` prüft ZIP-Integrität, Dateianzahl und SHA-256 jeder eingepackten Datei. Das Paket enthält nur Theme-Dateien aus den vorgesehenen Ordnern; Base64-Übertragungsdateien sind ausgeschlossen. Das Dawn-Lizenzdokument ist im Quellbaum und als Asset enthalten.

Grenzen: Diese Strukturprüfung ersetzt keinen Shopify Theme Check, keinen Liquid-Renderlauf und keine Browserprüfung. Shopify CLI konnte lokal nicht gestartet werden. Ein separater GitHub-Prüflauf mit Shopifys offizieller Action wird vorbereitet; sein Erfolg wird erst nach tatsächlichem Ergebnis berichtet. Der Shopify-Import und der Bild-CDN-Upload sind technisch gescheitert. Vollständige Details in `design-qa.md`.
