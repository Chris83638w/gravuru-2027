# Issue 139 – neutraler Start und getrennte historische Geräteerweiterung

Quelle: Claude in #139, Kommentare 6588814817, 6589023089, 6589176539 und 6589326864. Fortsetzung in PR 153; kein Deployment. Produktzähler aus den vorherigen Wellen: neu 2, überarbeitet 8, gesamt live 10.

## Änderung

Der native Adapter ruft die ursprünglichen Funkklingel-`prepare`/`finish`-Ketten nicht mehr auf. `native-shell-state.mjs` übernimmt Maße, Produktkennung und Revision aus dem validierten Produkt; historische Shopify-Varianten und Geräte-Standardwerte werden nicht übernommen. `native-shell-ui.mjs` stellt nur gemeinsame DOM-Anschlüsse, Preis/Menge/Warenkorb und den bearbeitbaren Vollbildbereich bereit. Die vorhandene native Preis-, Geometrie- und Warenkorblogik bleibt zuständig.

Die drei historischen Geräte-Skriptblöcke werden beim Build aus der unveränderten Referenz abgeleitet und separat geschrieben. Im nativen Editor wird diese Datei weder angefordert noch ausgeführt; ausschließlich der bestehende Referenzpfad ohne `UniversalConfig` lädt sie vor seinem Start. Der gebaute gemeinsame HTML-Start umfasst jetzt 371.965 Bytes. Die native moderne Funkklingel verwendet weiterhin ihre produktgebundenen Ausführungen. Die Vollbild-Werkzeuge haben auf dem Handy eine eigene Zeile, damit „Design auswählen“ nicht über anderen Schaltflächen liegt.

## Geprüft

- 197 betroffene Tests unter Linux mit dem vorhandenen Python-Umfeld bestanden, einschließlich Zustandsquelle und Referenz-Nachladegrenze. [Protokoll](2026-11-03-issue139-neutraler-start/linux-tests.txt).
- Edelstahl D24: Vollbild öffnen/schließen, B02, Text „Koch“, Designwechsel; Text und Befestigung bleiben erhalten.
- Acryl D8: entsprechend, zusätzlich Anthrazit; Preis 17,48 €, Farbe bleibt beim Designwechsel erhalten.
- AOSU: Wechsel auf 24×20 cm, Klingel links, seitlicher Rahmen, Anthrazit, B04S; Text „Koch“ bleibt erhalten, Preis 63,68 €. Vollbild öffnen/schließen. Vier Geräte-Dropdowns und Befestigungskacheln bleiben getrennt von der Türschildoberfläche.
- Bei allen drei Browserläufen keine JavaScript-Fehler, historische `prepare`/`finish`-Aufrufe 0, historische Geräte-Datei nicht geladen und ihre globalen Gerätefunktionen nicht definiert. Beim AOSU-Test einzig ein fehlendes Favicon ohne Produktfunktion.

Die isolierten Läufe mit echten öffentlichen Modellen, Chrome mobil 390×844, 9 Mbit/s, 150 ms und CPU 4×: Edelstahl 4,87 s, Acryl 5,06 s, AOSU 7,40 s. Diese Werte sind Entwicklungsvergleiche, **keine Live-Zielabnahme** mit `scripts/konfi-messen.cjs`. AOSU lag vor dem neutralen Finish im gleichen Kandidatenaufbau bei 16,87 s. Kein Warenkorbauftrag in diesen drei isolierten Läufen.

[Edelstahl Vollbild](2026-11-03-issue139-neutraler-start/edelstahl.png) · [Acryl Vollbild](2026-11-03-issue139-neutraler-start/acryl.png) · [AOSU Vollbild](2026-11-03-issue139-neutraler-start/funkklingel.png)

[Edelstahl Browserdaten](2026-11-03-issue139-neutraler-start/edelstahl.json) · [Acryl Browserdaten](2026-11-03-issue139-neutraler-start/acryl.json) · [AOSU Browserdaten](2026-11-03-issue139-neutraler-start/funkklingel.json)

## Offen und nächster Schritt

Der moderne statische Modulgraph enthält weiterhin produktbezogene Modelle/Installer und bisher auch Händler-Verwaltungsimporte. Die vollständige R2-Trennung ist damit noch nicht abgeschlossen. Nächster Schritt: neutrale Validierung von Händler-/Geräteverwaltung lösen, anschließend ausgewählte Produktmodule getrennt laden. R6–R8-Sicht-/Warenkorbnachweise, Gedenktafel-/Grabstecker-Anbindung und Desktop/Handy-Zielmessung je Linie bleiben offen. Claude prüft das Modulregister vor Merge; Bulk-Pipeline und Navigation folgen nach diesem Paket.
