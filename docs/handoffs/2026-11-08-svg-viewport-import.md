# SVG-Logos: gültige Zeichenflächen übernehmen

Nutzerauftrag vom 08.11.2026: „Setze alles um“ nach der SVG-Seitenverhältnisfehlermeldung. Isolierte Basis `587a395841f3a7ff8ab4a1a7028e9505defad6ae`; kein Livezugriff, kein Layout-, Produkt-, Preis- oder Datenbankumbau.

## Korrektur

Nur `app/workshop/customer-vector-logo.py` ändert sich in der Laufzeit. Bisher mussten Außenmaße und `viewBox` praktisch dasselbe Seitenverhältnis haben. Gültige SVGs mit anderem Verhältnis oder anderer Ausrichtung wurden abgewiesen.

Für diese zuvor abgewiesenen Fälle wird die SVG-Viewport-Transformation vor der bestehenden Vektorverarbeitung berechnet: Standard/`meet`, `slice`, `none`, alle neun Ausrichtungen, Rundungen und verschobener Ursprung. Quelle: [SVG-Standard, Viewport-Abbildung](https://www.w3.org/TR/SVG2/coords.html#ComputingAViewportsTransform). Originaldatei, Weißaussparungen, Sicherheitsprüfungen und Logo-Aufpreis von 12,99 € bleiben erhalten. Es gibt keine Rastervektorisierung.

Alle bereits akzeptierten Dateien durchlaufen **unverändert** den alten `svg-black-v1`-Pfad. Dadurch bleiben gespeicherte Ausgabehashes auch beim Warenkorb-Bearbeiten und bei erneuter Serverprüfung gültig. Historische Dateien oder Bestellungen werden nicht neu geschrieben.

## Nachweise

- 29/29 Tests in `customer-vector-logo.test.mjs`, `customer-vector-logo-media.test.mjs` und `customer-vector-logo-pricing.test.mjs` bestanden.
- Zusätzlich 1/1 unabhängiger Renderer-Vergleich: fünf Original-SVGs und ihre normalisierte Farbvoransicht pixelgleich in allen RGBA-Kanälen (Standard, `none`, `slice`, Ausrichtungen, verschobener Ursprung).
- Sechs vor der Änderung aus der unveränderten Basis ermittelte SHA-256-Paare für schwarze Ausgabe und Farbvoransicht bleiben exakt gleich.
- Neue SVG mit anderem Seitenverhältnis erfolgreich durch Vorschau, erneute Medienprüfung, unveränderlichen Bestellsnapshot und native Produktions-SVG verarbeitet; Logo-Aufpreis unverändert.
- Bestehende PDF-/Warenkorb-/Kontotests einschließlich fremder bzw. manipulierter Medien bestanden. Ein erster lokaler PDF-Lauf scheiterte an fehlendem CairoSVG; dieselbe Baseline scheiterte ebenso. Nach Installation der bereits festgelegten `requirements-print.txt` im isolierten Testvenv bestand der Test.

Die konkrete Kundendatei liegt nicht vor. Diese Nachweise verwenden synthetische SVGs und ersetzen ihre Sichtprüfung nicht.

## Übergabe und Rücknahme

Privates Paket: `outputs/svg-viewport-20261108/patch-manifest.json`, Unterordner `patch/` und `rollback/`. Vor Übernahme muss der aktive Workerhash zum `beforeSha256` passen. Nur die eine Python-Datei austauschen; weder Kundenbundle noch CSS oder Produkte ändern.

Rücknahme: gesicherte ursprüngliche Workerdatei wiederherstellen, solange keine mit der neuen Erweiterung akzeptierten Logos gespeichert wurden. Nach solchen neuen Bestellungen nicht blind auf den alten ablehnenden Worker zurückgehen: deren Originale/Ergebnisbytes müssen weiter lesbar bleiben. Alle alten v1-Bestellungen sind vom Patch unverändert unterstützt.

Nächster Schritt: unabhängigen Review und Serverhash-Abgleich durch Root, dann Uploadprobe im tatsächlichen Konfi; Originaldatei des Kunden prüfen, sobald verfügbar.
