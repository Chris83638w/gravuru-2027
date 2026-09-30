# Gravuru 2027 – Einstieg und Übergabe

Stand: 30.09.2026. Auftraggeber: Mikail. Kurze deutsche Erläuterungen, sichtbare Ergebnisse und ehrliche Grenzen sind wichtig. Bereits festgelegte Produktangaben nicht erneut erfragen.

## Maßgeblicher Projektstand

Das neue Projekt heißt **Gravuru 2027**. Repository: https://github.com/Chris83638w/gravuru-2027. Der alte Konfigurator dient als geprüfte Quelle und Vergleich. Keine blinde Kopie des gesamten Altbestands.

Neueste Entscheidung hat Vorrang vor früheren Vorschlägen: **2D genügt zunächst; AR ist auf später verschoben.** Eine 2D-Darstellung eines Wandbilds in einem eigenen Raumfoto kann später ohne Live-AR umgesetzt werden. Ein verlässlicher Maßstab einer solchen Fotomontage benötigt eine bekannte Referenzgröße; diese Funktion wurde noch nicht gebaut.

Die neue App befindet sich in der Ausarbeitung. Dieses Repository enthält Dokumentation und eingefrorene Referenzpakete mit 294 Dateien. Ein vorhandener Button, ein Screenshot oder eine Bildidee beweist keine funktionierende komplette Strecke.

## Lesen und weiterarbeiten

1. `STATUS.md` und `AGENTS.md`: konkreter Fortschritt und Arbeitsregeln.
2. `UEBERGABE-SOL-6.1.md` und das aktive Paket **G27-01** in `UMSETZUNGSPAKETE.md`: Arbeitsauftrag mit Abnahme.
3. `QUELLEN-UND-START.md`: Archive prüfen, Quellen gezielt öffnen, vorhandenen Build reproduzieren. `MATERIALREFERENZEN.md` sichert die Materialauswahl und ihre Grenzen.
4. Passende Abschnitte in `NEUE-WERKSTATT-PLAN.md` nachschlagen: bestätigte Anforderungen, Preise und Befunde. `KONFI-VERGLEICH-UND-AR.md` ist ergänzender Hintergrund, keine Pflicht zur erneuten Recherche; AR bleibt vertagt.

## Herkunft

- Altes Repository: `Chris83638w/gravuru-shopify`.
- Am 30.09.2026 geprüfter Quellbranch: `feat/variante-m-profile-20260924`, Commit `b564422edadaf56a27a09f99e1140a546e5e7145`.
- Aufgabenbranch mit dokumentierter Planung: `task/acrylglas-konfigurator-20260929`.
- Letzter dokumentierter Vergleichsstand dort: `e34dffaa6f9c90edd2cfcce58fa1e08541731092`.
- Lokale alte Arbeitskopie: `C:/Users/Mikail Erdem/Documents/Codex/2026-09-29/wa/work/acrylic-konfi`.
- Die lokale Arbeitskopie enthält Acryl-Erweiterungen und Medien, die nicht vollständig in den alten GitHub-Commits stehen. Die ausgewählten Quellen und Ressourcen sind jetzt in den Referenzarchiven mit SHA-256-Manifest eingefroren. Das gesamte historische App-/Werkstattprojekt bleibt davon zu unterscheiden.
- Lokal gezeigte Basisansicht: `http://127.0.0.1:8951/?model=acryl`; Diskussionsansicht ergänzt `&review=1`. Lokale Adresse ist keine öffentliche Bereitstellung und keine Startgarantie auf einem anderen Rechner.

## Geprüfter Bestand und Grenzen

In der jetzigen Vorbereitung bestanden 19 Tests aus `contract.test.mjs` und `acrylic-product.test.mjs` erneut, aus der probeweise entpackten Kopie. Build mit 104 geprüften Ressourcen und 7 Modellen erfolgreich. Alle 294 Dateiprüfsummen stimmen. Ein zuvor synthetisch reproduziertes Fotozuordnungsrisiko und doppelte Preisregeln sind noch nicht behoben. Die Befunde stehen im Master-Bauplan.

Produktverwaltung hat dateibasierte Teile; SQLite existiert bereits für Kundensitzungen und Gestaltungspakete. Keine dieser Aussagen bedeutet, dass die neue verknüpfte Produktdatenbank fertig ist. PDF-/Druckausgaben, freier Konturimport, Produktion, Shopify und neue Stapelabläufe benötigen ihre jeweiligen durchgehenden Abnahmen.

Zwölf Materialbilder für Edelstahl, Leder, Holz und Acryl wurden wiedergefunden und unverändert gesichert. Schieferbeispiele liegen ebenfalls vor, die reine Rohlingreferenz ist noch nicht eindeutig zugeordnet. Keine neuen Uploads pauschal verlangen. Endgültige Schriftarten, unbestätigte Materialstärken und freigegebene Maschinen-/Farbprofile bleiben offene Voraussetzungen; Details im Materialregister und Bauplan.

## Als Nächstes

G27-01: geeignete Bestandsmodule gezielt in eine getrennte lauffähige Grundlage übernehmen und lokal bedienbar zeigen. Danach G27-02: gemeinsames Modell für Material, Formkontur, Variante, Bohrbild, Design, Kundenfelder und Produktionsprofil. Beide Verfahren Druck und Gravur abdecken; Verwaltung und Stapelverarbeitung verwenden dieselben Regeln. Den Namen Gravuru 2027 konsequent verwenden. Modellumschaltung oder neuer Chat sind mit dieser Vorbereitung noch nicht erfolgt.
