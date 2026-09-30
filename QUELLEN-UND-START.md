# Quellenpaket und reproduzierbarer Einstieg

Stand 30.09.2026. Vier ZIPs sichern **294 vorhandene Dateien**. Sie sind eine eingefrorene Vergleichs-/Wiederverwendungsgrundlage. Die aktive neue App ist noch zu implementieren. Das gesamte historische Shopify-/Werkstattprojekt ist nicht als vollständig migriert zu bezeichnen.

## Inhalt

| Archiv | Dateien | Zweck |
| --- | ---: | --- |
| `REFERENZ-QUELLCODE-20260930.zip` | 183 | Lokale Kundenmodule, Produktpipeline, gemeinsame Modelle, historische Werkstattreferenz, QA und zehn Schiefer-Beispielbilder. |
| `REFERENZ-MOTIVE-UND-ACRYL-20260930.zip` | 92 | Bestehende Motiv-/Schriftkataloge, Lizenzen/Herkunft, Labrador-Ressourcen, Acrylvorlage und sechs Sockelansichten. |
| `REFERENZ-MATERIALIEN-20260930.zip` | 17 | Zwölf ausgewählte Materialbilder plus fünf Herkunftsdokumente. Siehe `MATERIALREFERENZEN.md`. |
| `REFERENZ-OBERFLAECHE-20260930.zip` | 2 | Ausgewählte Entwürfe für Produktübersicht und Produktbearbeitung; Bildmockups, keine fertige Verwaltung. |

Originalbytes, Dateigrößen, ursprüngliche lokale Pfade und SHA-256 für alle Dateien/Archive stehen in `QUELLEN-MANIFEST.json`. `.preview`, Cache, installierte Abhängigkeiten, lokale Kunden-/Bestelldatenbanken, `.env` und frühere Exportergebnisse wurden nicht eingepackt. Ältere Dokumente innerhalb der Referenzen sind historische Nachweise; deren Pfade und Behauptungen werden dadurch nicht aktuell.

## Prüfen und auspacken

Node.js 24 ist die vorhandene Quellvoraussetzung, dieser Paketstand wurde mit 24.19.0 geprüft. Aus dem neuen Repository-Hauptordner:

```powershell
node .\verify-reference.mjs
Expand-Archive -LiteralPath .\REFERENZ-QUELLCODE-20260930.zip -DestinationPath .
Expand-Archive -LiteralPath .\REFERENZ-MOTIVE-UND-ACRYL-20260930.zip -DestinationPath .
Expand-Archive -LiteralPath .\REFERENZ-MATERIALIEN-20260930.zip -DestinationPath .
Expand-Archive -LiteralPath .\REFERENZ-OBERFLAECHE-20260930.zip -DestinationPath .
node .\verify-reference.mjs --extracted=.
```

Die Archivordner `legacy-reference/`, `material-references/` und `design-reference/` sind in `.gitignore`, um die gepackten Referenzen nicht noch einmal als aktive Anwendung einzuchecken. In einem bestehenden ausgepackten Ordner nicht pauschal überschreiben; zuerst Prüfsummen abgleichen. Linux/macOS: dieselben ZIPs in denselben Ordner entpacken, dann dieselbe Node-Prüfung. Kein Token ist für diese lokale Dateiprüfung nötig.

Aus `legacy-reference/`:

```powershell
node --test configurator/variant-m/contract.test.mjs configurator/variant-m/acrylic-product.test.mjs
node configurator/variant-m/build.mjs
node configurator/variant-m/server.mjs --port=8961
```

Die neue Vergleichskopie kann unter `http://127.0.0.1:8961/?model=acryl` geöffnet werden, **nachdem** der Server gestartet ist. Port ist ein Vorschlag; bei Belegung einen freien wählen. Der frühere Konfigurator auf 8951 wird nicht ersetzt. In diesem Vorbereitungslauf wurden Build und Tests aus der entpackten Kopie ausgeführt; die Browserbedienung dieser Kopie und der Serverstart auf 8961 wurden noch nicht erneut geprüft.

## Gezielte Quellenwahl

Alle Pfade in dieser Tabelle sind relativ zu `legacy-reference/`:

| Thema | Einstieg | Umgang |
| --- | --- | --- |
| Kundenkonfi/Bedienung | `configurator/variant-m/adapter.mjs`, `ux.mjs`, `customer-tools.mjs`, `photo-editor.mjs` | Funktionen mit Akzeptanzkriterien übernehmen, keine neue UI von null. |
| Konfiguration/Preise | `configurator/variant-m/contract.mjs`, `acrylic-product.mjs` | Doppelte Zubehörregeln vereinheitlichen, bestätigte Preise bewahren. |
| Acrylbild/Sockel | `configurator/variant-m/acrylic-scene.mjs`, `acrylic-base-anchors.mjs`, `designs/acrylic-unser-anfang/` | Referenzassets erhalten, realistische Darstellung und Verdeckung prüfen. |
| Druckpilot | `configurator/variant-m/acrylic-export.mjs`, `acrylic-print.py`, `acrylic-print.test.py` | Getrennte Python-Abhängigkeiten erforderlich; dieser neue Pakettest hat die Druckstrecke nicht erneut abgenommen. |
| Verwaltung/Import | `automation/product-pipeline/workbench.mjs`, `workbench-library.mjs` | IDs/Revisionen/Abläufe übernehmen; heutige Grenzen PDF und einzelne Form/Größe beachten. |
| Bestellstand | `automation/product-pipeline/customer-checkout-*.mjs` | Eigentum/Revisionen/Hashes übernehmen; keine Kundendatenbank mitkopiert. |
| Renderer/Geometrie | `platform/sources/app/shared/models/` | Gemeinsame Geometrie prüfen; bestehende Rechteck/Ellipse-Sonderfälle nicht als freie Konturen ausgeben. |
| Motiv-/Schriftbestand | `designs/aosu-labrador/runtime/` samt Inventar/Lizenzen | Große Segmente maschinell abfragen; nicht komplett als Prompt lesen. Endgültige Schriften sind noch offen. |
| Alter Admin-Entwurf | `continuation/werkstatt-source-20260923/` | Historische Teilreferenz, nicht startfähiges vollständiges Admin-Backend. |
| Diskussionsansicht | `configurator/variant-m/review-proposal.mjs` | Kein Zielkern: enthält feste Positionen und pauschale Ausblendungen. |

## Was noch fehlt oder separat zu prüfen ist

- Vollständiger authentifizierter Shopify-App-/Werkstattstand. Die Acrylkopie enthält nicht `platform/sources/workshop/public/produktanlage.html`. Die wiedergefundene Übergabe vom 23.09.2026 liegt lokal unter `C:/Users/Mikail Erdem/Documents/Codex/2026-09-23/wir-setzen-die-bestehende-gravuru-werkstatt/work/handover-stage`; dortige Admin-Quellen sind ein anderer historischer Stand. Gezielt vergleichen, keine Datenbanken/Geheimnisse übernehmen.
- Alle weiteren vom Nutzer gelieferten Acryl-Designbilder sind noch nicht als konfigurierbare Vorlagen umgesetzt. Die Referenz „Unser Anfang“ ist der erste Pilot.
- Reine Schiefer-Rohlingreferenz noch eindeutig zuordnen. Die vorhandenen Schieferbeispiele enthalten bereits Design. Holz-/Lederstärken aus den Bildmustern sind teilweise unbestätigt.
- Schrift-/Motivrechte nach bestehenden Herkunftsdokumenten prüfen. Das private Referenzpaket ist keine Freigabe als öffentliche Assetbibliothek.
- Farb-/Maschinenprofil, echte RIP-/Produktionsprüfung und durchgehender Shopify-Checkout bleiben eigene Abnahmen. 19 bestandene Tests beweisen diese nicht.

## Tatsächlich in dieser Vorbereitung geprüft

- Alle vier Archive erneut geöffnet und auf CRC-/SHA-256-Integrität geprüft; alle 294 entpackten Dateien stimmen mit dem Manifest überein.
- Node 24.19.0, aus einer separaten entpackten Kopie: **19 Tests bestanden, 0 fehlgeschlagen** (`contract.test.mjs`, `acrylic-product.test.mjs`).
- Build aus derselben Kopie: **104 vorhandene Referenzressourcen geprüft, 7 Modelle erzeugt, Editor 460892 Bytes**.
- Stahl-, Leder- und erstes Schieferbeispiel visuell geöffnet. Aktuelle Materialdateien aus der historischen Revision 5 zugeordnet; keine Bildbearbeitung, keine neue Materialfreigabe.

Testkopie lokal: `work/gravuru-2027/.handoff-check/`. Alle Angaben beziehen sich auf dieses konkrete Referenzpaket, nicht auf neue implementierte Funktionen.
