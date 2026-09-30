# Gravuru 2027 – Einstieg und Übergabe

Stand: 30.09.2026. Auftraggeber: Mikail. Kurze deutsche Erläuterungen, sichtbare Ergebnisse und ehrliche Grenzen sind wichtig. Bereits festgelegte Produktangaben nicht erneut erfragen.

## Maßgeblicher Projektstand

Das neue Projekt heißt **Gravuru 2027**. Repository: https://github.com/Chris83638w/gravuru-2027. Der alte Konfigurator dient als geprüfte Quelle und Vergleich. Keine blinde Kopie des gesamten Altbestands.

Neueste Entscheidung hat Vorrang vor früheren Vorschlägen: **2D genügt zunächst; AR ist auf später verschoben.** Eine 2D-Darstellung eines Wandbilds in einem eigenen Raumfoto kann später ohne Live-AR umgesetzt werden. Ein verlässlicher Maßstab einer solchen Fotomontage benötigt eine bekannte Referenzgröße; diese Funktion wurde noch nicht gebaut.

Die neue App befindet sich in der Ausarbeitung. Dieses Repository enthält zunächst Dokumentation. Ein vorhandener Button, ein Screenshot oder eine Bildidee beweist keine funktionierende komplette Strecke.

## Lesen und weiterarbeiten

1. `NEUE-WERKSTATT-PLAN.md`: bestätigte Anforderungen, Preise, Wiederverwendung, konkrete Befunde und Abnahmekriterien.
2. `KONFI-VERGLEICH-UND-AR.md`: Wettbewerbsfunktionen und Ergänzungen. Frühere AR-Pilotempfehlungen sind durch die Entscheidung zum Aufschub überholt.
3. Quellen vollständig erfassen, mit dem tatsächlichen GitHub-Stand vergleichen und nur passende Bestandteile samt benötigten Ressourcen übernehmen.

## Herkunft

- Altes Repository: `Chris83638w/gravuru-shopify`.
- Am 30.09.2026 geprüfter Quellbranch: `feat/variante-m-profile-20260924`, Commit `b564422edadaf56a27a09f99e1140a546e5e7145`.
- Aufgabenbranch mit dokumentierter Planung: `task/acrylglas-konfigurator-20260929`.
- Letzter dokumentierter Vergleichsstand dort: `e34dffaa6f9c90edd2cfcce58fa1e08541731092`.
- Lokale alte Arbeitskopie: `C:/Users/Mikail Erdem/Documents/Codex/2026-09-29/wa/work/acrylic-konfi`.
- Die lokale Arbeitskopie enthält Acryl-Erweiterungen und Medien, die nicht als vollständiger Quellstand in den genannten GitHub-Commits gesichert sind. Vor Übernahme inventarisieren; nichts als vollständig verfügbar voraussetzen.
- Lokal gezeigte Basisansicht: `http://127.0.0.1:8951/?model=acryl`; Diskussionsansicht ergänzt `&review=1`. Lokale Adresse ist keine öffentliche Bereitstellung und keine Startgarantie auf einem anderen Rechner.

## Geprüfter Bestand und Grenzen

Im vorherigen Prüflauf bestanden 19 Tests aus `contract.test.mjs` und `acrylic-product.test.mjs`. Ein Fotozuordnungsrisiko bei ungleichen Feldnamen wurde synthetisch reproduziert. Preisregeln sind teilweise doppelt hinterlegt. Die ausgewählten alten Quellbausteine und weitere Befunde stehen im Master-Bauplan.

Produktverwaltung hat dateibasierte Teile; SQLite existiert bereits für Kundensitzungen und Gestaltungspakete. Keine dieser Aussagen bedeutet, dass die neue verknüpfte Produktdatenbank fertig ist. PDF-/Druckausgaben, freier Konturimport, Produktion, Shopify und neue Stapelabläufe benötigen ihre jeweiligen durchgehenden Abnahmen.

Endgültige Schriftarten, reale Materialreferenzen und freigegebene Maschinen-/Farbprofile bleiben dort als Voraussetzungen bezeichnet. Zuerst vorhandene Dateien inventarisieren, bevor erneut Uploads angefordert werden.

## Als Nächstes

Gemeinsames Modell für Material, Formkontur, Variante, Bohrbild, Design, Kundenfelder und Produktionsprofil konkretisieren. Danach einen vollständigen Druck- und Gravurpilot mit passender 2D-Darstellung aufbauen. Excel-Import und Verwaltung darauf aufsetzen. Den Namen Gravuru 2027 in Startseite und Dokumentation konsequent verwenden.
