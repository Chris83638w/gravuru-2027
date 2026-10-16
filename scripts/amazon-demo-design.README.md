# Native Amazon-Testzuordnung

`node scripts/amazon-demo-design.mjs` ergänzt ausschließlich die dedizierte lokale Datenbank unter `.local-data/amazon-sandbox/`. Ein frei wählbarer Datenbankpfad wird nicht akzeptiert. Verknüpfte Zielpfade werden abgelehnt, parallele Seed-Aufrufe durch eine Sperrdatei verhindert. Vorhandene Produktstände werden nach dem Lauf auf unveränderten Inhalt geprüft.

Voraussetzungen: Node 24+, `GRAVURU_PYTHON` mit dem Pfad zur eingerichteten Python-Installation, Pakete aus `app/workshop/requirements-import.txt` und `app/workshop/requirements-photos.txt`. Die vorhandene Python-Konfiguration und `.local-data/python` werden verwendet. Es gibt keine gerätespezifischen absoluten Pfade im Seed.

Der Lauf erstellt ein deutlich bezeichnetes TEST-Acrylprodukt, einen echten nativen Werkstatt-Prüfstand mit Menge 2 und eine synthetische Amazon-Position. Die gespeicherte PNG-Vorschau wird aus dem tatsächlichen `acrylicArtwork`-SVG mit den vorhandenen Schriftpfaden über PyMuPDF gerendert und durch die bestehende Fotoprüfung verarbeitet. Dies ist keine Maschinen- oder Fertigungsfreigabe. Es gibt keine Amazon-Anfrage und keine Produktionsaktion.

Standardmäßig bleiben SKU-Bindung und Prüfstandzuordnung offen, damit sie im Amazon-Bereich der bestehenden Werkstatt sichtbar durchgeführt werden können. `--assign` führt dieselbe lokale Testzuordnung unmittelbar aus. Die ausgegebenen Produkt-, Snapshot- und Positions-IDs werden außerdem als `amazon-demo-design.json` im Sandboxverzeichnis gespeichert.

Wiederholung verwendet denselben Prüfstand und dieselben Bestellidentitäten. Ein unvollständig angelegtes, später verändertes TEST-Produkt wird nicht überschrieben. Stornierte Positionen werden nicht wieder aktiviert. Nach Prozessabbruch bleibt gegebenenfalls `amazon-demo-design.lock` zurück; vor manueller Entfernung sicherstellen, dass kein Seed mehr läuft.

Regression: `node --test app/workshop/amazon-native-flow.test.mjs`. Der Test verwendet eine neue temporäre Datenbank, echte Produkt-/Prüfstandspeicherung und den tatsächlichen HTTP-Server. Bindung, Mengenprüfung, Hash, Wiederholung, spätere Produktänderung und Stornosperre werden ohne gemockte Repository- oder Snapshot-Funktionen geprüft.

Form-Prüfstände besitzen im bisherigen Schema keinen Mengenvertrag. Eine solche Zuordnung erhält deshalb `quantityVerified:false` und den Blocker `snapshot-quantity-unverified`. Ihre Menge wird nicht als geprüft dargestellt. Native Prüfstände müssen exakt die bestellte Menge enthalten.
