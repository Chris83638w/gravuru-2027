# Strukturprüfung – gravuru Salbei

11.10.2026. `node validate_theme.mjs` meldet nach den Korrekturen: **68 JSON-Dateien, 42 Abschnittsschemas, 0 gefundene Fehler**.

Geprüft: JSON-Syntax, doppelte Setting-IDs und Blocktypen, Standardwerte für Bereiche und Auswahlfelder, Preset-Einstellungsnamen, Abschnitts- und Blockverweise, gespeicherte Bereichs-/Auswahlwerte einschließlich der globalen Einstellungen, vorhandene Abschnittsreihenfolgen und vollständige Blockreihenfolgen. Der Validator setzt bei Fehlern einen ungleich null Exit-Code und ist ohne fest codierten Arbeitsplatzpfad wieder ausführbar.

Zwei ungültige globale Radiuswerte wurden von 3 auf 4 geändert, passend zu Shopifys 2er-Schritten. Der nicht bestätigte Schrift-Handle `cormorant_garamond_n4` wurde auf den in Shopifys Schriftliste enthaltenen Handle `cormorant_n4` korrigiert. `node --check theme/assets/gravuru-salbei.js` bestand.

`package_theme.py` prüft ZIP-Integrität, Dateianzahl und SHA-256 jeder eingepackten Datei. Das Paket enthält nur Theme-Dateien aus den vorgesehenen Ordnern; Base64-Übertragungsdateien sind ausgeschlossen. Das Dawn-Lizenzdokument ist im Quellbaum und als Asset enthalten.

Der erste offizielle Shopify Theme Check fand fehlende eigene Übersetzungsschlüssel in den übrigen Dawn-Sprachen. Diese haben jetzt einen expliziten englischen Rückfalltext; die sieben Zielsprachen behalten ihre Übersetzungen. Der lokale Validator prüft zusätzlich die Vollständigkeit der eigenen Übersetzungsschlüssel.

Der erneute offizielle **Shopify Theme Check bestand: 0 Fehler, 11 Warnungen** auf Commit `f5e49829371a58c243bbf34f40524470d4a3af7b`. Die Warnungen betreffen Dawn-Bausteine sowie dieselben übernommenen Stellen in `gravuru-product.liquid`. Es wurde keine Prüfvorschrift abgeschaltet oder herabgestuft. [Tatsächlicher GitHub-Prüflauf](https://github.com/Chris83638w/gravuru-2027/actions/runs/38151897163), strukturierter Bericht in `theme-check-result.json`.

Grenzen: Ein statischer Theme Check ersetzt weder einen Shopify-Liquid-Renderlauf noch eine Browserprüfung. Der Shopify-Import und der Bild-CDN-Upload sind technisch gescheitert. Vollständige Details in `design-qa.md`.
