# Dashboard M02 · Produktbearbeitung, 05.10.2026

Aufgabenbranch: `task/dashboard-m02-editor-20261005`. Basis: `b51f7fb6fa5ef4f9ed2b53832858f2035fc283e4` auf `task/dashboard-product-cards-20261005`, vor Beginn mit GitHub abgeglichen. Umsetzung und Browserprüfung in der vorhandenen Cloud; Konto „mika“ ist Nutzerangabe.

## Ergebnis

Die bestätigte M02-Anordnung ist an die bestehende Werkstatt angebunden: links Bereiche und tatsächliche Designelemente, mittig die große Acrylvorschau, rechts Eigenschaften des ausgewählten Elements. Auswahl funktioniert über die Liste sowie direkt auf dem Produkt. Die vorhandene native Produktszene bleibt unverändert; das generierte Landschaftsfoto aus M02 wird nicht als neue Produktressource nachgebaut. Darstellung von Eiche/Buche/usw. verwendet bestehende Sockelbilder, Anker und Einstecktiefen.

- Texte, Schriftwahl, Fett/Kursiv, ganze mm-Schritte, runde Farbvorschläge und Positionswerte bearbeiten.
- Kundenrechte getrennt einstellen: Inhalt, Farbe, Verschieben, Größe, Löschen nach Entsperren. Die vorhandene serverseitige Prüfung verhindert Freigaben für technisch feste Bereiche. Fotoausrichtung innerhalb der festen Fotofläche bleibt Kundenfunktion.
- Beispielfoto ersetzen (JPG/PNG/WebP bis 10 MB); Originalbytes im geprüften SVG-Quellarchiv der privaten Designablage, Zuordnung erst beim Produktspeichern übernehmen. Frühere Produktrevisionen und Master bleiben unverändert. Die Kundenansicht verwendet das gespeicherte Beispiel ebenfalls.
- Uploadhinweis pro Fotofeld bearbeiten/einblenden; Speicherung in `config.photo.hints`, Prüfung von Feldzuordnung, Textlänge und Boolean. Texte im SVG escapen. Beim Kopieren/Entfernen/Import eines Designs werden die Zuordnungen mitgeführt bzw. entfernt.
- Sofortige Entwurfsvorschau über CSRF-geschützten, validierenden `POST /api/workshop/products/:id/editor-preview`; keine Produktspeicherung. Veraltete Revisionen werden abgewiesen. Änderungen kurz hervorheben, bei Fehlern letzten Stand als nicht aktuell kennzeichnen.
- Bestehende Preise, Profile, Designersatz/PDF-/SVG-Import, Kundenfeldzuordnung, Kopie, Archiv und Verlauf weiter erreichbar. Der PDF-/SVG-Import verwendet den vorhandenen Prüfablauf; beliebige PDFs werden nicht automatisch zu editierbaren Einzelteilen.

## Tatsächlich geprüft

Cloud-Prüfung 05.10.2026, Abschluss etwa 05:55 UTC / 07:55 Berlin:

- `npm test`: **175 bestanden, 0 Fehler, 0 Skips**. Neuer HTTP-Integrationstest: ausgewähltes Design, Sockel/Format, keine Revision durch Vorschau, ungültige Zuordnung/Rechte, Versionskonflikt, CSRF und fremde Origin.
- `npm run build`: **76 Ressourcen, 1 Modell**, 461440 Editorbytes.
- Chromium/Playwright, Desktop 1487 × 1058 und Mobil 390 × 844: Elementwahl, Text/Schrift/Fett/Kursiv/mm/Farbe, feste Kundenfelder, Vorschau vor Speicherung, Speichern/Neuladen/Verlauf, Ungespeichert-Dialog, Fotoersatz, Fotohinweis, alle Bereiche, Sockelwechsel, mobile Bedienung ohne horizontalen Überlauf.
- Eigener Kundenansicht-Browserlauf bestätigt das neue Beispielfoto aus der gespeicherten Designablage. Kopierdialog ohne versehentliches Formularspeichern; Archivieren/Wiederöffnen mit deaktivierten Eingaben im Archiv; Tastaturnavigation durch Bereiche geprüft. Keine JavaScript-Seitenfehler in diesen Abläufen.
- Visueller Vergleich und Grenzen: [design-qa.md](../../design-qa.md). [Desktop](dashboard-m02-desktop.png), [Eigenschaften](dashboard-m02-inspector.png), [Textbearbeitung](dashboard-m02-text.png), [Mobil](dashboard-m02-mobile.png).

Alle Laufdaten sind synthetisch in drei **In-Memory-Datenbanken**. Kein privater Bestand und keine Kundendaten wurden übernommen oder veröffentlicht. Der Prozess auf Cloud-Loopback-Port 8973 ist eine Entwicklungsvorschau, keine dauerhaft gemeinsame Datenablage und kein öffentlicher Dashboard-Link.

## Grenzen und nächster Schritt

Das separate **Muster Acrylglasbild**, private Site-Version 12, bleibt unverändert. Dieses Dashboard wurde nicht auf diese Site hochgeladen. Keine Server-/Shopify-/Plesk-Mutation, kein Merge, keine Produktivveröffentlichung.

M02 ist damit als bedienbare Produkt-/Elementansicht angebunden; Shopify-Bestellungen, freie Szenenhintergründe, weitere Material-/Formmodelle und Produktionsabnahme bleiben eigene offene Funktionen. Mobil wurde eine responsive Folge aus Vorschau, Bereichen und Einstellungen umgesetzt; sie ist kein bereits vom Nutzer freigegebener Mobilentwurf.

**Genau nächster Schritt:** die Produktübersicht nach M01 mit großen fotografischen Produktkarten korrigieren. Der vorherige M01-Bericht war keine vollständige visuelle Abnahme des vereinbarten Dashboards.
