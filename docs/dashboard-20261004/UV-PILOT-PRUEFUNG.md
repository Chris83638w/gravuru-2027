# UV-Designpilot: tatsächliche Prüfung vom 04.10.2026

Abgeschlossen gegen 17:45 UTC in der bestehenden verwalteten Cloud-Laufzeit (provider cloud, running/connected, aktueller Status geprüft). Kontoname mika ist Nutzerangabe. Repository Chris83638w/gravuru-2027, Aufgabenbranch `task/uv-design-pilot-20261004`, Ausgangscommit `51841fda34a8e49f5f3d3634e77ef965720cdef7`; geprüfte Änderungen in diesem Commit. Keine Laptop-, Server-, Shopify- oder Produktionsaktion.

## Quelle und Ergebnis

Nutzeranhang `Master-Acrylglas-Roland-mit-Beispiel.zip`, 15316863 Bytes, SHA-256 `f49918022cb88612ea001935d8ec6db5397cfb393c0989999e1b4da684ab8f36`, stimmt mit dem privaten GitHub-Release überein. Sichere Extraktion in neue private Cloud-Ablage außerhalb des Repositorys, 17 Manifestdateien mit Länge und SHA-256 vollständig geprüft. Keine Skripte aus dem Archiv ausgeführt. Tatsächlich angesehen: Originalmockup, Foto, Dekoration und SVG-Struktur. SVG-Quelle SHA-256 `f6be9bb3b2526ab829dcd9c2419060147c95d0a0d94d79e404f2eaaea413b43b`.

Vorbereitungsskript plus explizite Zuordnung erzeugen `gravuru-prepared-design/v1`: neun Ebenen, vier Texte und ein austauschbares Bogenfoto. Das Beispielfoto ist nicht im erzeugten Paket. Bestehende SVG-Dekoration/PNG mit Alpha bleiben erhalten. Import passt die Zeichenfläche proportional mit Faktor 0,93 in die bestehende sichere Acrylfläche; Originalmaß 150 × 200 mm ist kein bestätigtes Produktionsmaß der Vorschau.

## Implementierung

- `scripts/prepare-layered-design.py` und dokumentierte Pilotzuordnung: geprüfte Ebenen vorbereiten, unsichere/abweichende Quellen ablehnen, Ausgabe exklusiv mit Modus 0600 anlegen.
- `app/workshop/prepared-design.mjs`, HTTP und bestehender Importdialog: prüfen, Vorschau zeigen, neues Design als Revision ergänzen; keine bestehenden Designs überschreiben. Sanitizer, Revisionsprüfung und CSRF weiterverwenden.
- Gemeinsames Modell/Renderer: Bogenmaske und Textlaufweite; Kundenrechte schützen Geometrie. Kundenfeldeditor erhält Ebenenreihenfolge/Laufweite bei späterer Bearbeitung.
- Konfigurator: Standarddesign beachten, Foto anhand seines tatsächlichen Felds ersetzen. Zweiter Upload erzeugt keine zusätzliche Ebene. Gesperrte Textgrößen werden nicht beim Normalisieren gerundet oder automatisch geändert.

## Ausgeführte Prüfungen

| Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| `PYTHONPATH=/workspace/gravuru-2027-cloud-acceptance/.local-data/python npm test` | 150 bestanden, 0 Fehler, 0 Skips |
| `npm run build` | 76 Ressourcen, 1 Modell |
| `node --test app/workshop/prepared-design.test.mjs` nach exklusiver 0600-Ausgabeanpassung | 6 bestanden, 0 Fehler, 0 Skips |
| Original-SVG mit `prepare-layered-design.py` und Pilotmapping | 9 Ebenen, 5 Felder; Beispielfoto entfernt |
| Geschützte Vorschau, Cloud-Chromium/Playwright | Importvorschau, Hinzufügen, gespeicherte Revision und Wiederöffnen bestanden |
| Kundenbearbeitung | Erstes echtes Beispielfoto nur zum privaten Test, anschließend synthetisches Ersatzfoto; weiterhin 9 Objekte, gleiche Bogenmaske/Abmessungen |
| Textprüfung | Änne & Jörg, Datum 18.05.2022, längerer Spruch; bearbeitetes Modell über validate-design mit HTTP 200 bestätigt |
| Varianten | Größenwechsel erhält Geometrie; 14,99 € → 19,99 € im Browser; alle 28 Preisoptionen im Regressionstest unverändert |
| Sichtprüfung | Desktop 1512 × 1080 und Mobil 390 × 844 angesehen, keine JavaScript-Seitenfehler |

Bei den ersten Läufen wurde ein echter Fehler beim wiederholten Fotoaustausch entdeckt und behoben; ein Regressionstest ruft den echten Uploadhandler zweimal auf. Fehlende Schriftglyphe U+2013 wurde als Grenze bestätigt; der Test erwartet die korrekte Fehlermeldung statt einer heimlichen Ersetzung. Die abschließenden Ergebnisse oben sind neue Prüfungen dieser Umsetzung, nicht Chris' Restore oder der historische 137-Test-Nachweis.

Vorschau ausschließlich Loopback `127.0.0.1:8964`, isolierte Entwicklungsdatenbank mit synthetischem Ausgangsprodukt und privatem Pilotimport. Keine Verbindung zu Chris' Bestandsdaten. Screenshots, Originaldateien, erzeugtes Vorlagepaket und SQLite bleiben privat außerhalb von Git. Diese Dateien sind nur für die laufende Aufgabe nachgewiesen, keine dauerhafte gemeinsame Ablage und kein öffentlicher Vorschau-Link.

## Grenzen und Übergabe

Funktionspilot für eine bereits in Ebenen vorhandene Vorlage bestanden. Keine automatische Zerlegung beliebiger flacher Bilder/PDFs; keine gesamte 18er-Serie fertiggestellt. Garamond Acryl enthält keinen Gedankenstrich U+2013. Visuelle Nutzerfreigabe/Pixelgleichheit zum ursprünglichen Mockup, vollständige Schriftabdeckung und Produktionsrenderer mit bestätigtem Farb-/Weiß-/Kontur-/Spiegelungsprofil fehlen. Das historische Druck-PDF wurde nicht als neu erzeugte personalisierte Druckdatei ausgegeben. Keine Bestellung/Shopify-/RIP-/Maschinenabnahme.

Nächster Arbeitsschritt: genau ein weiteres Originaldesign gemäß [VORLAGENFORMAT.md](VORLAGENFORMAT.md) vorbereiten und vergleichen. [Product-Design-Anweisung](PRODUCT-DESIGN-AUFTRAG.md) ist konkretisiert. Weitere hochauflösende Originale sind hier noch nicht bereitgestellt; kein Agent oder Serienlauf gestartet. Für den vorhandenen Pilot ist kein erneutes Hochladen erforderlich.
