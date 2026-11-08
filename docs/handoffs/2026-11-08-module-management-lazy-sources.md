# Privater Modulanschluss – gezieltes Nachladen der Quellen

Stand: 08.11.2026, Codex/Mika. Ergänzung zu PR 213. Kein Kundenlayout, keine Preis- oder Modulregel geändert.

## Konkreter Befund

Der installierte Stand a71b3eb lieferte die Verwaltungsseite (HTTP 200, 5.401 Bytes), aber der anschließende `/originale/verwaltung/api/context`-Abruf endete auf dem echten privaten Server nach 20.023 ms ohne Antwort. Der Erstabruf las über `templates.sources()` alle vollständigen Galeriedokumente. Die Bereichsliste wiederholte denselben Scan indirekt. Die Quelle umfasst 3.142 Produkte und rund 23,5 GB; eingebettete Schriften und Bilder gehören nicht in einen Listenabruf.

## Enger Fix

- Initiale Galerie- und Modulverwaltung verwenden ausschließlich kleine, vorhandene Import-/Zielmetadaten. Kein vollständiges Quelldokument, keine Optionen und keine Modulrechte werden für die Übersicht geladen.
- Fehlende Familienangaben bleiben offen. Die Übersicht ist keine Freigabe; Auswahl, Entwurf und Bestätigung prüfen weiterhin die wirklichen aktuellen Quelldokumente.
- Nur ausdrücklich ausgewählte Schlüssel laden native Details. Profilübernahme, Vorlagenöffnung, Aktualisierung und der nach Speichern offen bleibende Editor erhalten die vollständigen Optionen der Quelle.
- Synchronisierungsziele werden nach dem ersten Render separat geprüft. Beide bestehenden Schreibschalter bleiben unverändert.
- Jede Plan-/Bestätigungs-/Anlageprüfung liest frisch. Kein Cache über Anfragen oder Schreibgrenzen; unbekannte Schlüssel werden abgewiesen.

## Lesende Abnahmewege

1. `GET /originale/verwaltung/api/context`: 200, gespeicherte Vorlagen/Katalog/kleine Quellen, `targets: []`, `targetsDeferred: true`, `sync.executionEnabled: false`.
2. `GET /api/workshop/configurator-modules`: bestehende Händleranmeldung; 200, zwei gespeicherte Stahlprofile, Quellübersichten und Bereiche, `localOnly: true`, `shopifyWrites: 0`.
3. `GET /originale/verwaltung/api/sync`: tatsächliche fest zugeordnete Profilziele; `status.executionEnabled: false`. Dies ist die nachgelagerte Prüfung, kein Erstabruf.
4. Detailabrufe: `GET /originale/verwaltung/api/sources?key=<vorhandener Schlüssel>` beziehungsweise `GET /api/workshop/configurator-modules/sources?key=<Schlüssel>`. 1–100 eindeutige bekannte Schlüssel; echte Revision, `detailsLoaded: true`, Optionen und native Modulverfügbarkeit. Mehrere Schlüssel als wiederholte `key`-Parameter.

Private Host-/Origin-Prüfungen und Händler-/CSRF-Schutz bleiben unverändert. Keine Sitzungsdaten oder CSRF-Werte in öffentliche Nachweise schreiben.

## Prüfungen

Gezielter Lauf 7/7 grün: `scripts/lib/gallery-management-lazy-sources.test.mjs`, `scripts/lib/gallery-module-management-host.test.mjs`, `app/workshop/configurator-module-http.test.mjs`, `scripts/gallery-management.test.mjs`.

Der neue Test verwendet die echte Galerie-Registry, beide HTTP-Wege und den nativen Speicher. Beide Erstabrufe lösen **0 vollständige Dokumentlesungen** aus. Detailabruf und Entwurf lesen nur das gewählte Produkt, nie die andere Produktquelle. Unbekannte/mehrfache/leere Schlüssel, fremder Ursprung und eine geänderte Quellrevision bleiben gesperrt; nach veralteter Bestätigung entsteht kein Produkt. Bereits vorhandene lokale Entwurfs-/Bestätigungs-/Sync-Regressionsfälle bleiben grün.

Syntaxprüfungen beider Verwaltungs-JS und `git diff --check` grün. Unabhängiger Review durch module_contract: keine offenen Blocker. Kein erneuter breiter Testlauf und keine Behauptung einer bereits bestandenen Server-/Browserabnahme. Das installierte v1-Paket und dessen Sicherungen wurden nicht überschrieben.

## Auslieferungsgrenze

Eigenes `runtime-v2`-Archiv; nur acht Verwaltungsproduktionsdateien unterscheiden sich von v1. Quellhost muss vor Umstellung gesichert und danach gemessen werden. Kundenhost, R15-Oberfläche, Designs, Größen, Preise, bestehende Warenkorb-/Bestellsnapshots und beide Modul-/Sync-Datenbanken bleiben unverändert. Allgemeine Modulregeln sind weiterhin noch nicht im Kundenhost aktiviert; dieser getrennte Anschluss bleibt offen.
