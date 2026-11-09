# Lokale Browserabnahme des Galerie-Lebenszyklus

Geprüfter Produktionsstand: `6c310120d48daef12b16e9568916a62ecd278597`. Eigener Chrome-Tab, CUA, keine Änderung anderer Tabs oder ihrer Ansicht. Chrome 156 unter Windows. Nach dem Klick auf „Browser-Prüflauf starten“ waren **12/12 Ergebnisse sichtbar grün**. Die [gespeicherten Ereignisse](browser-evidence.json) stammen vom lokalen HTTP-Server, die Ergebnisse aus dem tatsächlichen Browserlauf.

## Wiederholen

Im Repository dieses Branches:

```powershell
node ops/proofs/gallery-switch-lifecycle-browser.mjs
```

Dann einen eigenen Tab unter `http://127.0.0.1:8267/` öffnen und „Browser-Prüflauf starten“ drücken. Für einen neuen Lauf den eigenen Prüfserver beenden und neu starten; er sammelt seine Ereignisse absichtlich für genau einen Lauf. Die neue Ergebnisdatei wird ausschließlich unter `.local-data/gallery-switch-lifecycle-proof/browser-evidence.json` gespeichert. Falls Port 8267 bereits belegt ist, zuerst den zugehörigen eigenen Prüfprozess identifizieren; keinen fremden Server beenden.

## Tatsächlicher Nachweis

- Der erste Frame hatte ein fertiges Bild und weitere wartende Bilder.
- Beim Wechsel wurden seine zwei laufenden Abrufe abgebrochen. In der Wartephase kamen keine weiteren alten Vorschauanfragen hinzu.
- Ein absichtlich fehlgeschlagener Modellabruf stellte denselben Frame wieder her. Nur fehlende Bilder wurden weitergeladen; das fertige Bild behielt seine Blob-URL.
- Beim erfolgreichen Wechsel blieb der alte Frame pausiert. Das erste Vorschaubild des neuen Frames startete erst nach dessen Ready-Signal (Ereignis 17 vor 18).
- Der vorhandene Zurück-Button zeigte den ursprünglichen Frame wieder. Nur fehlende Bilder wurden angefordert; das fertige Bild wurde insgesamt genau einmal angefordert.

Der Harness importiert die echten `product-design-gallery.mjs` und `shop-design-switch.mjs` samt ihren Abhängigkeiten. Karten, HTTP-Antworten und Editorzustand sind synthetisch; ein Modellfehler und lange Bildantworten werden bewusst erzeugt. Keine Produkt-, Kunden-, Shopify- oder Datenbankzugriffe. Dieser Nachweis ergänzt die 24 Modulprüfungen; er misst weder Live-Ladezeit noch Abbruch einer bereits begonnenen Server-Renderarbeit. Beide Produktionsdateien blieben nach dem geprüften Commit unverändert.
