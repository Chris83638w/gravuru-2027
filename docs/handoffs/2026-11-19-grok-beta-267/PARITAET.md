# Parität, Stand V0

| Bereich | Diese Beta | Beleg |
| --- | --- | --- |
| Gemeinsamer Editor | unverändert R15 | kein neuer Editor |
| Freie Gestaltung vor dem Warenkorb | vorhanden, nicht neu gebaut | bestehende R15-Werkzeuge |
| Foto, Text, Optionen | in der synthetischen Kette | `beta-267-e2e.test.mjs` |
| Feste Bohrbilder | Konturen der beiden Gestaltungen gleich, Text verschieden | derselbe Test |
| Preis | nur `quote()` / Manifest | 5498 Cent aus der Fixture |
| Warenkorb, zwei Gestaltungen, eine Variante | lokal | Screenshots und Buch |
| Bearbeiten aus dem Warenkorb | entfernt im lokalen Warenkorb | HTML ohne Link; Theme-Schnipsel noch der alte |
| SVG und PDF | reproduzierbar, `productionReady: false` | Rastergravur, weil ein Foto nicht vektorisiert wird |
| Edelstahl, Acryl, Schiefer, Holz, UV | nicht erneut gegen Katalog und Preis-Excel geprüft | offen |
| Schriften, Tippen, Cookie-Banner | unverändert | offen |
| Live-Shop, Theme, Plesk | nicht angefasst | Grenze |

Harte Sperren, die diese V0 nicht auslöst: kein vertauschtes Bild in den Tests, kein falscher Fixture-Preis, keine Fertigungsfreigabe. Offen und damit nicht siegfähig: der echte Shop zeigt den Bearbeiten-Schnipsel noch, und der ganze Kundenweg ist nicht neu unter 5 Sekunden gemessen.
