# Schiefer: passende Produktgruppen und verbindliches Hauptbild-Design

## Auftrag und Zuständigkeit

Mikail, 04.11.2026: „Ja, setz das so um. Die 48 Tafeln mit allen passenden Zielgruppen, jeweils nur die passenden Designs anzeigen und mit dem Design vom Hauptproduktbild starten. Stimm dich mit dem Schiefer-Chat ab, damit nichts doppelt gemacht wird.“

[Auftrag/Abgrenzung in #85](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6627330257), [Bestätigung durch Astra Schiefer](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6627375627). Dieses Paket ergänzt #170/#166. Astra/Claude behalten Designziele, Designkorrekturen, Freigaben und die laufende Merge-Kette. Keine zweite Zielmigration und keine Katalog-JSONs geändert. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt verbindlich; hier werden vorhandene native Gestaltungen unverändert gefiltert.

## Fachliche Quellen

- Produktgruppen und gleiches Startdesign/Hauptbild: obiger Nutzerauftrag.
- Maße, Preise, Zubehör, Befestigungen: bestehende native 48-Tafeln-Vorbereitung, vier `schiefer-tafeln-*`-Familien aus dem Katalog. Keine eigene Preis-/Geometrielogik.
- Eignung und Freigabe: `design-targets.mjs`, `assignedSlateSizes` aus #170 und die bereits geprüften Templates aus `prepare-slate-products.mjs`. Aktuelle Katalogfreigaben und Größenziele werden nochmals abgeglichen; keine neue Freigabe.
- Thema: `design.json.themes`; Zielgruppe: `katalog.zielgruppe`, alternativ `targetGroup`. Fehlende Zielgruppe bleibt eine separate Zuordnung ohne erfundene Menschen-/Tierklassifikation.
- Mit/ohne Foto: tatsächliches `photoSlot` in der Originalvorlage. Separater Kunden-Fotoupload und vorhandene Aufpreise bleiben erhalten.
- Bereits festgelegte Hauptprodukte: `linien/*.json`, `subcategories[].startDesign` bzw. `mainProducts[].startDesign`. Diese behalten ihre individuellen Starter und teilen nur die passende Galerie. Für Gruppen ohne Hauptproduktvorgabe wird initial die erste stabile Katalog-ID gewählt und danach gespeichert.

## Fertig

`slate-product-groups.mjs` trennt Familie/Größe × Thema × Zielgruppe × Fotovorlage in native Produktdokumente. Fremde Designs und der allgemeine Startplatzhalter werden nicht mitgespeichert. Die bestehende serverseitige Produktauflösung lehnt fremde Design-IDs ab. Das gespeicherte Standarddesign wird direkt mit dem bestehenden nativen Renderer zum Hauptbild. Fehlende Starter oder Musterfoto-Ressourcen verursachen einen Fehler, keinen Ersatz.

`prepare-slate-product-groups.mjs` verarbeitet alle 48 Tafeln und schreibt native Konfigurationen, eine Starterliste, Hauptbilder als SVG, Variantenpreise und einen vollständigen Bericht. Wiederholungen verwenden dieselben Produkt-IDs/Revisionen. Eigene spätere Änderungen erhalten neue Revisionen; zwischenzeitliche fremde Änderungen werden erhalten und als Konflikt gemeldet. Ressourcen werden unveränderlich ergänzt. Bisherige, im neuen Plan nicht mehr vorkommende Gruppen werden gemeldet, nicht gelöscht.

`check-slate-product-groups.cjs` öffnet sämtliche erzeugten Einträge im echten Kundeneditor, prüft Startdesign/Galerie/Bildprüfsumme und rendert passende PNG-Hauptbilder. Keine künstliche neue Oberfläche.

## Nachgewiesener Stand

Codebasis: #170, ursprünglich `bb4680b1e2f73a5fae2e9dffa8aa095e72afa74a`; aktueller Nachtrag `863b78035d49bd6b0516bd1e3bbcd5e4898d796f` im eigenen Branch konfliktfrei integriert und gezielt nachgeprüft.
Katalogbasis: #171, `43fe1f23d17fa54b94f5ab4c5f9754dab8b18323`.

- Grundvorbereitung: 48 Tafeln, 268 freigegebene native Vorlagenzuordnungen, 0 Ausschlüsse.
- Gruppen: 10 Einträge auf 3 Tafeln, 136 Varianten, 346 Galerie-Verweise (Mehrfachverweise durch die bestehenden Hauptprodukte; keine 346 neuen Designs).
- Bestehende Starter: vier Hundeeinträge und zwei Katzeneinträge aus der Linie 22 × 14. Zusätzlich Tiergedenken und drei Monogramm-Einträge.
- 45 Tafeln haben in diesem übernommenen Stand noch keine passenden freigegebenen Vorlagen. Menschen ohne Foto, Hausnummern und Familienschilder sind in diesem Durchlauf daher noch nicht als Schiefer-Shopprodukte erzeugt.
- Wiederholung: 0 neue Einträge, alle 10 IDs erhalten, alle weiterhin Revision 1.
- 11/11 neue Tests; 11/11 Fotopreis-/Zieltests; 9/9 native Schieferprodukttests einschließlich Gravur-PDF und privater Kundensnapshots.
- Browser: 10/10 Einträge, richtige Starter und Galerieanzahlen, 10 PNG-Hauptbilder, keine JavaScript-Fehler. Edge/Chromium, 1440 × 1000. Bildansicht mit/ohne Foto visuell geprüft.

Kompakte Nachweise: [Prüfbericht](2026-11-04-schiefer-produktgruppen-mika/pruefung.json), [mit Foto](2026-11-04-schiefer-produktgruppen-mika/mit-foto-konfigurator.png), [ohne Foto](2026-11-04-schiefer-produktgruppen-mika/ohne-foto-konfigurator.png).

## Reproduktion

Node 24, vollständiger Katalog einschließlich Schriften/Rohlinge/Zubehör/Originalfotos, Python-Pakete gemäß `app/workshop/requirements-*.txt` plus FontTools; bei Windows `GRAVURU_PYTHON` auf die echte Python-Installation setzen. `--source` ist ein unveröffentlichter lokaler Vorbereitungslauf, `--out` ein eigener Arbeitsordner; dort keine manuellen Werkstattänderungen vornehmen. Während des Imports keinen zweiten Prozess in dieselbe Ausgabe schreiben lassen.

```sh
node scripts/prepare-slate-products.mjs --katalog ../gravuru-katalog --out ../slate-base
node scripts/prepare-slate-product-groups.mjs --katalog ../gravuru-katalog --source ../slate-base --out ../slate-groups
node --test app/workshop/slate-product-groups.test.mjs app/workshop/slate-photo-pricing.test.mjs app/workshop/slate-design-targets.test.mjs app/workshop/slate-product.test.mjs
node scripts/serve-slate-review.mjs --data ../slate-groups --port 8984
node scripts/check-slate-product-groups.cjs --data ../slate-groups --url http://127.0.0.1:8984
```

Browserprüfung benötigt Playwright und Chromium; alternativ `PLAYWRIGHT_CHANNEL=msedge`. `--starters <datei.json>` akzeptiert eine ausdrückliche Zuordnung Gruppen-Schlüssel → Katalog-Design-ID. Ein ungültiger oder inzwischen entfernter Starter wird nie still ersetzt. `starter-selections.json`, `group-state.json`, Datenbank und Ressourcen gemeinsam aufbewahren. `shopify-plan.json` ist ein Vorbereitungsmanifest mit lokalen Konfi-IDs, kein direkt ausführbarer Shopify-Mutationsaufruf.

## Genau nächster Schritt und Grenze

Astra/Claude liefern ihre Katalog-Zuordnungen, korrigierten Designs und freigegebenen Stände in #85. Darauf die native Grundvorbereitung in einem neuen Quellordner ausführen, anschließend die Gruppenvorbereitung erneut laufen lassen. Neue freigegebene Kombinationen entstehen automatisch, ohne weitere Einzelfall-Programmierung.

Inzwischen vorhanden: [Katalog-PR #176](https://github.com/Chris83638w/gravuru-katalog./pull/176), bei Abgabe noch Entwurf mit laufendem Bogen-Upload; sämtliche neuen Ziele bleiben unfreigegeben. Dieser unfertige Datenstand wurde nicht als fertiger Freigabestand ausgegeben. Die obigen Zähler und Nachweise bleiben reproduzierbar an `43fe1f2` gebunden.

Vor dem Shopimport vorhandene 48 allgemeine DRAFTs und die bereits früher angelegten Hunde-/Katzen-Hauptprodukte anhand der bestehenden IDs abgleichen. Die neuen Handles sind keine Erlaubnis, vorhandene Hauptprodukte doppelt anzulegen. Die lokalen Konfi-IDs müssen über den bestehenden Serverimport gebunden werden; Hauptbild, Standarddesign und dieselbe Revision gemeinsam übernehmen. Danach direkter Produktseiten-Einstieg und tatsächlicher Warenkorb-Ende-zu-Ende-Test auf dem gemeinsamen Zielstand. Die native Schieferbasis ist weiterhin `reviewOnly`; dieses Paket hebt keine Bestell-/Maschinenfreigabe auf.

Dieses Paket hat **0 Shopify-Schreibzugriffe, 0 Veröffentlichungen und keinen Main-Merge** ausgeführt. Es erledigt Gruppierung/Startbild und den getesteten lokalen Massenlauf; es behauptet keinen fertigen Live-Shop und keine Freigabe der noch offenen Designs.
