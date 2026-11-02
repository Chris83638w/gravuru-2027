# Issue 139 – Master-Konfigurator: Bestandsprüfung und Modulgrenze

Quelle: ENTSCHEIDUNGEN.md auf main 66ad324, insbesondere 1.1–1.13, 2.10 und R1–R9; Claude-Kommentare 6588814817 und 6589023089. Dies ist der konkrete Umbauplan zur Prüfung in PR 153, **noch keine implementierte Modultrennung**.

## Erster umgesetzter Trennungsschritt

Die vier allgemeinen Funktionen `setTextSize`, `measureText`, `textGlyphLayout` und `textPaths` liegen nun unverändert in `platform/sources/app/shared/models/text-paths.mjs`. 19 gemeinsame Browsermodule importieren direkt den neutralen Baustein. `doorbell-preview.mjs` exportiert sie für bestehende Aufrufer weiter, behält aber seine eigene Geräteansicht und den alten CDN-Schriftlader. Der gemeinsame Bündelgraph enthält diesen Geräte-/CDN-Lader nicht mehr; ein Regressionstest sichert die Trennung. 193 betroffene Linux-Tests und 14 lokale Schriftpfad-/Bündeltests bestanden. Mobiler D24-Test mit „Koch“, B04 und Designwechsel bestanden, keine Browserfehler. Das ist ein erster Schritt, keine vollständige R2-Abnahme.

Claude-Ergänzung 6589176539 ebenfalls gelesen: kein Aufblitzen der alten Oberfläche und kein doppelter Kopf; bis zur Bedienbereitschaft neuer Ladebildschirm mit Produkt/Startdesign. Die historische Oberfläche darf nicht bloß überdeckt werden. Dieser DOM-/Mount-Umbau bleibt offen und gehört zur unten beschriebenen Trennung von prepare/finish, mit Bildfolge als Abnahme. Der Text „Motivbibliothek wird geladen“ allein beweist keinen vollständigen Bibliotheksdownload: im isolierten Starttrace wurden Kernkatalog und die zwei Startschriften gemessen, nicht motive-alle.json. Das tatsächliche Live-Verhalten ist separat zu prüfen.

## Heute tatsächlich gemeinsam geladen/ausgeführt

| Datei | Befund |
|---|---|
| `build.mjs` / eingefrorene `editor-source.html` | Gemeinsame HTML-Schale enthält alte Stahl-/Funkklingel-Erweiterungen, ihre DOM-Aufbauten und sync-Ketten. Die kleinen Guards des Ladezeit-PR überspringen einzelne Arbeiten, entfernen diese Module aber nicht. Referenzdatei bleibt unverändert. |
| `adapter.mjs` | Alle Produkte hängen sich an `window.Funkklingel.prepare/finish/thumb`; originalPrepare/originalFinish laufen auch bei Türschildern. Statische Importe von doorbell-ui, -presentation, -lazy-designs. `installDoorbellPresentation` wird immer aufgerufen und prüft erst im Modul den Typ. |
| `ux.mjs` | Importiert doorbell-lazy-designs statisch; ruft dessen Installer auch bei anderen Produktarten auf. |
| `workflow.mjs` | Statischer Import von doorbell-ui; die konkreten Geräteflächen-Zweige sind bedingt, der Code wird trotzdem geliefert. |
| `contract.mjs`, `design-content.mjs`, `studio-products.mjs`, `print-geometry.mjs`, `customer-rights.mjs`, `lazy-resources-model.mjs`, `product-design-gallery.mjs` | Gemeinsamer Importgraph enthält doorbell-selection; studio-products zieht zusätzlich den Gerätekatalog ein. Preis-/Geometrieprüfung ist typabhängig, Import nicht. |
| `studio-svg.mjs` | Importiert doorbell-material-preview. |
| `bundle-build.mjs` | Ein Bündel enthält den ganzen statischen Graphen: aktuell 133 Module. Eine bedingte Installer-Abfrage allein erfüllt die neue Forderung daher nicht. |
| `doorbell-preview.mjs` | Ursprünglich auch allgemeine Schriftpfad-/Textmessfunktionen; inzwischen in text-paths.mjs extrahiert, siehe erster Trennungsschritt. Geräteansicht und alter Schriftlader bleiben separat. |

## Vorgesehenes Register

Ein Kern für Designauswahl, Texte, Motive, freigegebene Foto-/Logo-Funktionen, Vorschau, Preis und Warenkorb. Auswahl eines Ausführungsmoduls über ein versioniertes Produktprofil, niemals über Titel oder Materialvermutung.

| Registerschlüssel | Ausführungsmodul | Quelle der Optionen |
|---|---|---|
| `door-sign` | feste Größe, Befestigung; Materialfarbe nur wenn im Produkt vorgesehen | familyFormats bzw. bestehendes Türschildprofil und Produktbindung |
| `stake` | Größe, keine Türschild-/Klingelbefestigung | Grabsteckerprofil aus Katalog/Excel |
| `memorial` | Befestigung und Zubehör, Foto entsprechend Freigabe | Gedenktafelprofil aus Katalog/Excel |
| `doorbell` | Format, Position, Rahmen, Farbe und vorgesehene Befestigung | vorhandenes gravuru-doorbell/v1-Profil |

Jeder Eintrag besitzt einen getrennten Browser-Einstieg für Ausführungsoberfläche und typbezogene Vorschau sowie die vorhandenen validierten Modellfunktionen. Der Kern lädt nur den ausgewählten Einstieg. Preise/Geometrie werden weiter aus derselben Produktrevision berechnet. Für ältere Produkte ohne eindeutige Typkennung wird die Zuordnung anhand ihrer gespeicherten Schema-/Quellkennung geprüft; keine stillschweigende Zuordnung zur Funkklingel.

Umbaufolge: neutrale Text-/SVG-Funktionen aus Gerätenamen lösen; Produktmodul-Lader und getrennte Bündel; ursprüngliche prepare/finish-Aufgaben in neutralen Kern und Gerätebaustein aufteilen; native Produkte ohne verdeckten Funkklingel-DOM mounten; vier Produktarten mit bestehenden Kundenaktionen vergleichen. Der unveränderte Referenzeditor bleibt Vergleich, kein zweiter Kundenkonfigurator.

Abnahme: Import-/Netzwerkprüfung zeigt bei Türschild/Grabstecker/Gedenktafel keine Geräte-Module oder Gerätekataloge; vorhandene Preis-/Geometrie-/Produktionsprüfungen; Screenshots der Ausführung je Linie; R6–R9 jeweils tatsächlich im Browser belegen. **Diese Nachweise fehlen noch.**

## Bereits belegter Zwischenstand und offene Abnahme

R1 Startprojektion: D24 155.716 Bytes JSON, 107.193 Bytes gzip; einzelne Vorlage und Schriften über vorhandenen Nachladeindex. Synthetischer Regressionstest mit 208 Vorlagen und großen Schriftdaten sichert das 600.000-Byte-Budget. Echte Produktmessungen je Linie mit `scripts/konfi-messen.cjs` und `--handy` stehen noch aus; isolierte Messungen mit zusätzlicher Netz-Drosselung sind nicht dieses Abnahmemaß.

R9 im isolierten echten Modell geprüft: Name „Koch“ und B04 (vier Bohrlöcher) bleiben bei Auswahl einer anderen Vorlage erhalten, 40 Galeriekarten, keine Browserfehler. Galerieantwort 52.060 Zeichen, deutlich unter 300 KB. Screenshot und Messdatei im Startmodell-Nachweisordner. Noch kein neuer Live-Nachweis.

R6, R7 und R8: bestehende gezielte Tests vorhanden, geforderte aktuelle Screenshots/Kunden-Warenkorbprüfung noch offen. R3–R5 bleiben verbindliche Regeln; dieses Paket darf weder Randabstand, Bohrlochwarnung noch Motivsperre hinzufügen. Eine vollständige aktuelle Sichtprüfung aller Linien wird nicht als erledigt behauptet.

Kein Deployment dieses Zwischenstands. Claude prüft Register und Trennung vor Merge. Bulk-Pipeline und Navigation folgen nach diesem Paket.


Nachtrag 03.11.2026: Der native Start wird außerhalb des Dokuments vorbereitet und erst mit fertiger UX eingesetzt; [Bildfolge und Lifecycle-Audit](2026-11-03-issue139-startansicht.md). Das beseitigt den sichtbaren Alt-UI-Zwischenstand. Die oben benannten historischen prepare/finish- und Importabhängigkeiten sind damit noch nicht entfernt.
