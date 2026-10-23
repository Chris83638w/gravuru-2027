# Paket A – Kontur im Katalogschema

Arbeitsstand: in Umsetzung. Code-Basis 6e44085f, Katalog-Basis 0fcf3cf. Account: Astra High.

1. Aktuelles main, Übergabe, Arbeitsregeln und Issue #10 prüfen.
2. Konturpfade streng validieren und ihre tatsächliche Ausdehnung auf ±0,05 mm prüfen.
3. Feste Lochpositionen je Größe übernehmen, ohne Randregelberechnung.
4. geometryOf, nativeContour und Schablonen um Konturen ergänzen.
5. Im Import die Konturgröße mit „Kontur offen“ sperren; bestehende Formen erhalten.
6. 14 Retro-Größen aus geometrie.json übernehmen, 9×6 je 1499 Cent, übrige Preise null.
7. 8 Retro-Hauptprodukte mit stabilen CustomizationIDs ergänzen.
8. Katalog neu erzeugen; gezielte Tests und vollständigen Import-Dry-run ausführen.
9. Einmal unabhängiges Review, Befunde beheben und Prüfnachweise dokumentieren.
10. Code- und Katalog-PR dem Boss übergeben; kein Merge und kein Livezugriff.

Der Abschlussbericht ergänzt Ergebnisse, Zähler und verbleibende Grenzen.
