# Funkklingeln: Produktlinienfilter und Designressourcen-Korrektur

Stand: 29.10.2026. Autor: Astra/Codex. **Nur vorbereitet und lokal getestet; nicht live.**

## Branch und Umfang

- Eigener Branch: `dev/funkklingeln-filter-ressourcen-20261029-astra`.
- Basis: PR #42, Commit `bfbd9188ac4446611bc5e71b55b74c804aec5767` (Galerie-Leistungsverbesserung), nicht ein eigenständiger Ersatz dafür.
- Die Korrektur baut auf dem vorhandenen Galerie-, Preis-, Bindungs- und Ressourcensystem auf. Keine Produktmigration, keine neuen Shopify-Varianten, keine Theme- oder Metafeldänderungen.
- Keine Shopify-Schreibaufrufe, keine Plesk-Änderungen, kein Neustart, keine Webhook-Änderungen, kein Merge nach main.

## Produktlinienfilter

`shop-gallery-model.mjs` leitet den Galerie-Bereich aus dem festen Produktdokument ab:

1. Native Funkklingeln: exakter `config.doorbell.modelKey` bei Schema `gravuru-doorbell/v1`. Damit bleiben die drei Hauptprodukt-Formate desselben Modells verbunden; andere Klingelmodelle erscheinen nicht.
2. Andere Produkte: genau eine eindeutige `linie-…` in `document.categoryIds`, wie sie der vorhandene Katalogimport bereits schreibt. Keine Ableitung aus Material, Anzeigename, Familie oder Form.
3. Fehlende, ungültige oder mehrdeutige Zuordnung: nur Designs desselben Konfigurator-Produkts. Bei älteren Produkten ohne eindeutige Linie werden also keine fremden Produkte als vermeintlich kompatibel angeboten. Es werden dabei keine Kategorien ergänzt oder Produktrevisionen geändert.

Der Bereich wird ausschließlich als leichte, interne Galerie-Metadaten projiziert. Preis-/Geometrie-Konfiguration und gespeicherte Dokumente bleiben unverändert.

`shop-design-gallery.mjs` filtert vor Freigabeprüfung, Deduplizierung, Gesamtzahl und Seiteneinteilung. Der gemeinsame Cache enthält weiterhin alle geprüften Karten des Stores und kann ohne Kundensitzung vorgewärmt werden. Die erste Anfrage schränkt deshalb nicht versehentlich den Cache für andere Produktlinien ein. Die bestehenden Pausen-/Freigabeprüfungen bleiben pro Anfrage aktiv.

Auch beim Auflösen eines signierten Ziels werden Quell- und Zielbereich erneut aus den festen Modellen geprüft. Vorschau und Designwechsel verwenden denselben Zielprüfer: Ein zuvor ausgestellter Link zu einer anderen Produktlinie wird mit `shop_gallery_changed` abgelehnt. Es entsteht dabei kein Warenkorb.

## Designressourcen

Problem: Der Acryl-Host schreibt transportbezogene Pfade in ausgelieferten JavaScript-Modulen um. Der bisherige feste Text `/api/workshop/design-assets/` in `artworkFragment()` wurde dabei ebenfalls umgeschrieben. Unveränderte importierte Designbeschreibungen passten anschließend nicht mehr zur strengen Prüfung im Browser.

Korrektur: `artwork-resource.mjs` setzt den kanonischen Datenpfad aus festen Segmenten zusammen. Damit bleibt die unveränderliche Designbeschreibung identisch, sowohl im Einzelmodul als auch im erzeugten Editor-Bündel. Die Bilddaten werden weiterhin über den vorhandenen authentifizierten Elternrahmen aufgelöst.

Die Prüfungen für SHA-Formate, Dateityp, Seitennummern, Maße, Grenzen, `embeddedOnly` und exaktes SVG-Fragment werden nicht gelockert. Fremde URLs, transportseitige Acryl-Pfade innerhalb der Datenbeschreibung und zusätzlich eingeschleustes Markup bleiben ungültig. Keine Neuberechnung oder Ersetzung von Produkt-SHAs.

## Prüfung

Alle Ergebnisse lokal unter Windows / Node 24.19.0; kein Live-Funktionstest und keine aktuelle Produktionslastmessung.

| Bereich | Ergebnis |
| --- | --- |
| Galerie, Projektion, Lasttest, Designressourcen | 31/31 bestanden |
| HTTP-Einstieg, Galerie-Vorschau/-Wechsel, Browser-Client, Vorschauwarteschlange | 54/54 bestanden |
| Bindungslisten/-speicher, Klingelauswahl, Positionen, Zustandsübernahme und Darstellung | 22/22 bestanden |
| Summe gezielter Tests | **107/107 bestanden, keine Skips** |
| Vollständiger Editor-Build | bestanden; 76 geprüfte Ressourcen, 108 Module, 14 Styles |
| Lokale vorhandene Importdokumente | **126**, exakt **42 Modellgruppen mit je 3 Formaten** |
| Designressourcen nach echter Host-Umschreibung des erzeugten Bündels | **2.268/2.268 gültig** |
| Vergleich aller Optionskombinationen mit der leichten Projektion | **15.120**, Preise und Geometrie identisch |
| Eingabedokumente | SHA-256 vor/nach Vergleich identisch, unverändert |

Der abschließende Build erzeugte lokal `editor-569257494af12812.mjs` (1.162.656 Bytes, gzip 380.587 Bytes). Auch daraus wurden nach der echten Host-Umschreibung sämtliche 2.268 Ressourcen erneut erfolgreich geprüft. Das erzeugte Bündel und private Importdokumente sind keine eingecheckten Artefakte.

Synthetischer SQLite-Lasttest mit 150 aktiven Bindungen: erste Seite kalt 627,34 ms, warm 10,69 ms, nach neuem Galerieobjekt 622,05 ms; maximaler beobachteter Event-Loop-Abstand kalt 36,86 ms. Nur zwei leichte Produktlesevorgänge für den kalten Aufbau, keine zusätzlichen beim warmen Zugriff; 40 Karten auf Seite eins. Das ist ein lokaler Regressionstest, keine Zusage für Produktionslaufzeiten oder ein echter Server-Neustart.

Die neuen Tests prüfen insbesondere: getrennte Linien bei gleichem Material, mehrere/fehlende Kategorien, drei Formate desselben Klingelmodells, Ausschluss anderer Modelle, korrekte Pagination, Cache-Nutzung durch verschiedene Quellprodukte, alte signierte Ziele, HTTP-Vorschau und Designwechsel, sowie die reale Host-Umschreibung für Einzelmodul/Bündel und unveränderte Sicherheitsprüfungen der Designressourcen.

### Reproduzierbare Befehle im Repository

```powershell
node --test app/workshop/shop-gallery-model.test.mjs app/workshop/shop-design-gallery.test.mjs app/workshop/shop-design-gallery.load.test.mjs app/configurator/variant-m/artwork-host-path.test.mjs app/configurator/variant-m/preview-resource.test.mjs
node --test app/workshop/shop-entry.test.mjs app/workshop/shop-entry-client.test.mjs app/workshop/shop-gallery-preview-queue.test.mjs
node --test app/workshop/order-intake.binding-list.test.mjs app/workshop/shop-product-binding-store.doorbell-memory.test.mjs app/configurator/variant-m/doorbell-selection.test.mjs app/configurator/variant-m/doorbell-state.test.mjs app/configurator/variant-m/doorbell-ui.test.mjs
node app/configurator/variant-m/build.mjs
```

Die zusätzliche Dokumentprüfung verwendete die schon vorhandenen lokalen 126 Importdokumente: Projektion je Dokument, Gruppierung nach Modellschlüssel, Validierung aller Artwork-Referenzen mit dem aus dem tatsächlich umgeschriebenen Bündel geladenen Ressourcenmodul, Vergleich von `physicalGeometry` und `quote` für jede Optionskombination und jedes Design. Private Quelldokumente wurden weder hochgeladen noch geändert.

## Bereitstellung und Rückweg — nicht ausgeführt

Dieser Branch enthält PR #42 plus diese Ergänzung. Vor einer später ausdrücklich freigegebenen Bereitstellung müssen beide gemeinsam geprüft werden. Die in PR #42 noch offenen Nachweise an einer aktuellen Store-Kopie mit voller Funkklingelmenge und unter Linux werden durch die lokalen Tests hier nicht ersetzt.

Danach gilt weiterhin der dokumentierte Pilotweg: ein Produkt, sichtbarer Einstieg, richtige Linie und Ressourcen, Formate/Positionen/Preise, Warenkorb samt Screenshot, erst anschließend weitere Produkte. Die bisherigen Shopify-Einstiegs-/Metafeldarbeiten bleiben getrennte Live-Schritte.

Da diese Korrektur keine gespeicherten Produkt-, Bestell- oder Bindungsdaten ändert, benötigt ein Rückweg keine Datenmigration. Bei einer späteren Bereitstellung ist der vorherige App-Commit festzuhalten und bei Bedarf wieder bereitzustellen. Nur diese Ergänzung zurückzunehmen würde den fehlenden Filter und den Ressourcenfehler wiederherstellen; der vorhandene Live-Schalter ist dafür kein Ersatz.

**Chris hat für diesen Auftrag ausdrücklich nur Vorbereitung und Tests beauftragt. Es wurde nichts live gestellt.**
