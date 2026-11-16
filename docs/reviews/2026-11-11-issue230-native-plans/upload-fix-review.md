# Unabhängiger Review: Foto und SVG-Logo auf Acryl

11.11.2026. Begrenzter lesender Review der laufenden Änderungen in `work/product-plans-final`; keine Produkt-/Datenbank-/Servermutation und keine Browsersteuerung.

## Geprüfter Umfang

- Änderungen an `contract.mjs`, `module-profile.mjs`, `ux-model.mjs`, `ux.mjs`, `logo-upload.mjs`, `decision-help.mjs` und den zugehörigen Upload-/Preis-/Medientests.
- `customer-vector-logo.py`: ausschließlich materialneutrale Fehlermeldung geändert. Verbot von Rasterbildern/foreignObject, Schriftanforderung, Element-/Attribut- und Komplexitätsgrenzen bleiben erhalten.
- Alle sieben echten v7-Produktpläne nur lesend mit `uploadAllowed`, `photoAvailableForDesign`, `vectorLogoAllowed` und `nativeModuleAvailability` ausgewertet: Hauptacryl Foto und SVG-Logo gleichzeitig an; sämtliche sechs Kleinprodukte Foto/Logo aus.
- Edelstahlpfad verlangt weiterhin ausgeschaltete Fotofunktion, Vektoropt-in und 1299 Cent. Die neue Alternative ist auf Material Acryl und `acrylic-engraving` begrenzt.

## Gefundener und behobener Fehler

Der bisher nur für Edelstahl gebaute SVG-Pfad zeigte die geprüften schwarzen Gravurflächen auch auf schwarzem Acryl unverändert schwarz. Sowohl Bestätigungsdialog als auch nachfolgender Editor ignorierten die helle Gravurfarbe. Der reale neue Anwendungsfall machte diesen Fehler sichtbar.

Der Autor ergänzte einen gemeinsamen Vorschaufilter für Acrylgravur. Dieser verwendet die vorhandene Processing-Ink `#e1e4e5`, erhält den Alphakanal und verändert weder SVG-Blob noch Prüfsummen/Produktionsbytes. Der Dialog erhält das aktuell gewählte Produktprofil. Edelstahl bleibt ohne neuen Filter.

## Unabhängige Nachprüfung

Der Prüflauf `reproduce-acrylic-vector-preview.mjs` führt die tatsächliche aktuelle `uxObjectSVG`-Funktion und `confirmVectorLogo` mit einer synthetischen geprüften schwarzen Ringfläche aus. Ein minimales DOM-Modell genügt; keine UI-Automation, kein Upload und keine Datenbank nötig. Das erzeugte aktuelle SVG-Markup beider Wege wird anschließend rasterisiert.

- Editorpixel in Gravurfläche: **225/228/229/255** = `#e1e4e5`, vollständig sichtbar.
- Dialogpixel an derselben Stelle: **identisch**.
- Aussparung in beiden Wegen: Hintergrund **23/25/27/255** = `#17191b`; keine aufgefüllte weiße Fläche.
- Geprüfter SVG-Blob vor/nach Vorschau: SHA identisch.
- Alphazeile des Filters: unverändertes Alpha.
- Edelstahlvorschaufilter: leer, bisherige schwarze Darstellung erhalten.

Belege: `acrylic-vector-preview-after.json` und `acrylic-vector-preview-after.png` (Editor links, Bestätigungsdialog rechts). Die ursprüngliche Fehlerreproduktion bleibt in `acrylic-vector-preview-review.json` erhalten.

Die verbliebenen materialbezogenen Dialogwörter wurden anschließend zu „Gravurvorschau“ und „Logo als Gravur“ korrigiert. Der abschließende Prüflauf bestätigt die materialneutrale Frage (`dialogAsksBlackPreview: false`) bei unverändert richtigen Pixeln und unveränderten SVG-Produktionsbytes. Kein weiterer funktionaler Fehler im geprüften Umfang gefunden. Eine vollständige Kundenbedienungs-/Warenkorb-/Produktionsabnahme ist durch diesen begrenzten Review nicht behauptet.
