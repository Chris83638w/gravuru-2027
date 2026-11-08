# Kompakte R15-Bedienung – nur freigegebene UI-Korrekturen

Nutzerfreigabe: „Setze alles um“, 08.11.2026. Isolierte Basis
`587a395841f3a7ff8ab4a1a7028e9505defad6ae`, Branch
`dev/mika-r15-controls-20261108`. Keine Modulaktivierung, keine Produkt-/Preis-/
Shopify-/Datenbankänderung und kein Main-Merge. Root übernimmt Live und Browser.

## Vier Produktionsdateien

- `app/configurator/mobile-demo/assets.mjs`: bestehende öffentliche Allowlist
  ausdrücklich um den neuen Helper ergänzen. Der erste Drei-Datei-Entwurf hatte
  diese Route übersehen; Roots Browserabnahme erkannte den 404 vor Veröffentlichung.
  Korrigiert in `e5d2195`, echter Importgraph/HTTP-Nachweis anschließend 2/2 grün.

- `app/configurator/mobile-demo/demo.mjs`: ausschließlich Helper importieren,
  installieren und beim Entfernen wieder abbauen.
- `app/configurator/mobile-demo/compact-controls.mjs`: neuer begrenzter Helper.
  Desktopaktionen unten in einer kompakten Gruppe; Vollansicht bzw. Rückkehr,
  Zurücksetzen, Undo/Redo, Hilfe, Ebenen. Alle Buttons delegieren an die vorhandenen
  nativen Aktionen einschließlich deren Freigaben; keine eigene Preis-/Editorlogik.
  Die native Vollansicht erhält diese Gruppe unmittelbar vor ihrem bestehenden
  Checkout. Oben werden nur die dadurch doppelten Aktionsleisten ausgeblendet;
  der nötige Platz für die ausgewählte Text-/Elementbearbeitung bleibt erhalten.
  Der vorhandene Produkt-Rückweg bekommt Pfeil, Kontrast und Umrandung.
- `app/configurator/mobile-demo/preview-action.mjs`: entfernt die volle 48-px-
  Vorschauzeile. Runder Plusbutton bleibt. Der graue Vergrößerungspfeil behält
  seine 44-px-Klickfläche und wird unter der rechten Produktkante positioniert.
  Die Vorschau erhält einen weißen Hintergrund. Die begrenzten Style-Regeln
  befinden sich im Helper; keine bestehende CSS-Datei wird ersetzt.

Doppelklick bzw. Doppeltipp schließt ausschließlich die native Vollansicht auf
freier Hintergrundfläche. Produktfläche, Objekte, Griffe und Bedienelemente
qualifizieren nicht; Bewegung, Mehrfinger und abgebrochene Pointer verwerfen
den Doppeltipp. Ein neuer primärer Pointer räumt einen durch SVG-Neuaufbau
verlorenen alten Pointer auf; ein echter zweiter Finger bleibt ausgeschlossen.
Kein Pinch-/Radzoom, keine Änderung der gespeicherten Gestaltung.

## Nachweise und Grenzen

57/57 gezielte Tests: `node --test app/configurator/mobile-demo/demo.test.mjs
app/configurator/variant-m/view-zoom.test.mjs
app/configurator/variant-m/toolbar-hosts.test.mjs`. Neue Fälle decken native
Aktionsweiterleitung und Status, Fullscreen-Rückkehr, freie Fläche versus
Produkt, Doppeltipp/Drag/Mehrfinger sowie verlorenen SVG-Pointer ab. Bestehende
Demo-/Checkout-/Viewportwechsel-/Dispose-/Touch- und Zoomtests bleiben grün.
Zusätzlich 2/2 echte Importgraph-/HTTP-Prüfungen mit
`node --test app/configurator/mobile-demo/native-overlay.test.mjs`, einschließlich
aller abhängigen Module, no-store und unveränderten 403/404/405-Sperren. Insgesamt
59 unterschiedliche Fälle grün. Nativer Build erfolgreich. Contract prüfte die UI-Dateien ohne konkreten
Funktionsblocker; die tatsächliche Positionierung bei kleinen Viewports,
Großansicht und ausgewähltem Foto benötigt Roots reale Browserabnahme.

Aktive `demo.css` weicht vom Gitstand ab und wird ausdrücklich nicht überschrieben.
Ebenso unverändert: alle übrigen CSS, Kundenmodule, Daten, UI-Reiter,
rechte Bearbeitungsspalte, Checkout, Zoom-/Reset-/Pointergrundlogik.

## Veröffentlichung und Rücknahme

Paket `outputs/r15-controls-20261108/r15-controls-patch.tar.gz` enthält ausschließlich
die vier Quellen, Vorherkopien der drei bestehenden Dateien, SHA256-Manifest,
diese Übergabe und einen rein lesenden Prüfmodus. Root prüft die Vorher-SHAs
gegen den aktuell veröffentlichten Stand, sichert und übernimmt nur die vier
Dateien. Das frühere Drei-Dateipaket ohne assets.mjs darf nicht verwendet werden.
Danach nativer Build in der exakt aktuellen Laufzeit; keine vollständige
isolierte Runtime oder deren CSS über die aktive App kopieren.

Vor Freigabe Handy und Desktop: Produkt-Zurück-Link, Normalansicht/Vollansicht,
Platzierung des grauen Pfeils außerhalb der Grafik, Plus, Resetbestätigung,
Undo/Redo/Hilfe/Ebenen, freie Doppeltippfläche, Elementverschieben nach Leer-Tap,
Tab-/Viewportwechsel und Checkout prüfen. Die Helper sind wieder entfernbar:
drei Vorherdateien zurück, ausschließlich neu hinzugefügten Helper entfernen,
erneut bauen und kontrolliert umstellen. Keine DB-/Shopify-Rücknahme erforderlich.
