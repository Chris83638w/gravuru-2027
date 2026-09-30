# Gravuru 2027 – Einstieg und Übergabe

Stand: 30.09.2026. Auftraggeber: Mikail. Kurze deutsche Erläuterungen, sichtbare Ergebnisse und ehrliche Grenzen sind wichtig. Bereits festgelegte Produktangaben nicht erneut erfragen.

## Maßgeblicher Projektstand

Das neue Projekt heißt **Gravuru 2027**. Repository: https://github.com/Chris83638w/gravuru-2027. Der alte Konfigurator dient als geprüfte Quelle und Vergleich. Keine blinde Kopie des gesamten Altbestands.

Neueste Entscheidung hat Vorrang vor früheren Vorschlägen: **2D genügt zunächst; AR ist auf später verschoben.** Eine 2D-Darstellung eines Wandbilds in einem eigenen Raumfoto kann später ohne Live-AR umgesetzt werden. Ein verlässlicher Maßstab einer solchen Fotomontage benötigt eine bekannte Referenzgröße; diese Funktion wurde noch nicht gebaut.

Die erste neue Kundenoberfläche ist lokal implementiert und geprüft. Aktive Dateien unter `app/`, Start über `LOKAL-STARTEN.md`, aktuelle Prüfung in `G27-01-PRUEFUNG.md`. Eingefrorene Referenzpakete mit 294 Dateien bleiben Herkunftsmaterial. Ein sichtbarer Button oder Screenshot beweist keine vollständige Bestellstrecke.

## Lesen und weiterarbeiten

1. `STATUS.md` und `AGENTS.md`: konkreter Fortschritt und Arbeitsregeln.
2. Aktives nächstes Paket **G27-02** in `UMSETZUNGSPAKETE.md`. `UEBERGABE-SOL-6.1.md` ist der historische Startauftrag; bereits erledigtes G27-01 nicht wiederholen.
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

Historische Referenzprüfung: 19 Tests, 104 Ressourcen, 7 Modelle, 294 Dateiprüfsummen. **Aktuelle Anwendung: 57 Tests, 76 ausgewählte Ressourcen, ein Acrylmodell.** Fotozuordnung anhand eindeutiger Feldschlüssel und gemeinsame Acrylpreisregeln sind jetzt implementiert. Details und verbleibende Grenzen in `G27-01-PRUEFUNG.md`; historische Befunde im Bauplan nicht als aktuellen Fehlerstand übernehmen.

Produktverwaltung hat dateibasierte Teile; SQLite existiert bereits für Kundensitzungen und Gestaltungspakete. Keine dieser Aussagen bedeutet, dass die neue verknüpfte Produktdatenbank fertig ist. PDF-/Druckausgaben, freier Konturimport, Produktion, Shopify und neue Stapelabläufe benötigen ihre jeweiligen durchgehenden Abnahmen.

Zwölf Materialbilder für Edelstahl, Leder, Holz und Acryl wurden wiedergefunden und unverändert gesichert. Schieferbeispiele liegen ebenfalls vor, die reine Rohlingreferenz ist noch nicht eindeutig zugeordnet. Keine neuen Uploads pauschal verlangen. Endgültige Schriftarten, unbestätigte Materialstärken und freigegebene Maschinen-/Farbprofile bleiben offene Voraussetzungen; Details im Materialregister und Bauplan.

## Als Nächstes

G27-02: gemeinsames Modell für Material, Formkontur, Variante, Bohrbild, Design, Kundenfelder und Produktionsprofil samt Speicherung/Revisionen. Aktive Acrylregeln wiederverwenden. Druck und Gravur abdecken; Verwaltung und Stapelverarbeitung verwenden dieselben Regeln. Den Namen Gravuru 2027 konsequent verwenden. Aktueller lokaler Pilot: http://127.0.0.1:8961/?model=acryl. Git-Transportgrenzen in `STATUS.md` beachten.
