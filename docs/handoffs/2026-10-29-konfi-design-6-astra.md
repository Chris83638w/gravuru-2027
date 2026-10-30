# Gewählte Designrichtung 6: Werkzeugband

Stand 29.10.2026. Chris: „nimm mal bitte die 6“. Gemeint ist ausdrücklich der sechste neutrale Entwurf, `06-werkzeugband.png` (ImageGen `exec-c032a58e-f7d6-423a-8699-38b489e8f531.png`). Der zuvor abgelehnte beige Entwurf gehört nicht zur Nummerierung. Die Auswahl ersetzt den vorangegangenen grauen Farbnachtrag.

## Umsetzung und Bilder

Desktop: weißer kompakter Kopf, durchgehendes dunkles Werkzeugband (#252a2e), allgemeine Werkzeuge links, ausgewählte Textwerkzeuge rechts. Weißer Arbeitsbereich mit senkrechter Trennlinie, aktive Reiter als dunkle Unterstreichung. Eingabe und „Schrift & Größe“ stehen nebeneinander. Preisleiste kompakt. Unter 768 px bleiben die allgemeinen Werkzeuge im Kopf und die ausgewählten Textwerkzeuge in zwei dunklen Reihen unter der Platte; Schritte und Preis sind frei. Das erste 44-px-Textfeld ist ohne weiteres Scrollen vollständig sichtbar.

| Quelle / Ansicht | Bild |
| --- | --- |
| Gewählter generierter Entwurf, nur UI-Referenz | [Nummer 6](issue48-d-20261029/sichtpruefung/variante-6-entwurf.png) |
| Tatsächlicher Desktop 1280 × 720 | [Screenshot](issue48-d-20261029/sichtpruefung/variante-6-desktop.jpg) |
| Tatsächliche Handygröße 390 × 664 | [Screenshot](issue48-d-20261029/sichtpruefung/variante-6-iphone-13.jpg) |
| Tatsächliche Handygröße 375 × 548 | [Screenshot](issue48-d-20261029/sichtpruefung/variante-6-iphone-se.jpg) |

Die reale Platte, Originalglyphen und das vorhandene Hausmotiv werden weiter vom bestehenden Renderer gezeichnet. Keine generierte Produktzeichnung übernommen, keine Schriftdateien hinzugefügt, keine Kennungen, Geometrien oder Preisverträge geändert. Die ursprünglichen Toolbar-Knoten wechseln ihren Platz; Listener und Zustand bleiben erhalten. Mobile/Vollbild kehren in ihre bisherigen Funktionsplätze zurück.

Beim Abgleich korrigiert: Legacy-Seitenränder, abgerundete Tab-Unterstreichung, Schriftvorschau als instabiles Klickziel (Klick gehört jetzt dem bleibenden Button), zu dunkler mobiler Papierkorb, Platz für das erste Handyfeld und eine angeschnittene zweite Zeile im eingeklappten Feld. Mehrzeiliger Inhalt bleibt erhalten; das Feld wächst beim Fokus und fällt beim Verlassen auf 44 px zurück.

## Prüfung

**71 Tests, 71 bestanden, 0 Fehler, 0 übersprungen**, auf `dev/konfi-gemeinsame-pruefung-20261029-astra` nach Integration der Quelländerungen. Enthalten sind fünf neue Fälle für Desktop/Mobil/Vollbild, ursprüngliche Knoten/Listener, Rückwechsel und Initialisierung vor dem Layout. Im bestehenden Foto-Test wurde nur der echte neue Helper in den Testkontext aufgenommen; keine Assertion gestrichen.

```powershell
node --test app/configurator/variant-m/toolbar-hosts.test.mjs app/configurator/variant-m/text-toolbar-position.test.mjs app/configurator/variant-m/toolbar-placement-ui.test.mjs app/configurator/variant-m/toolbar-placement-model.test.mjs app/configurator/variant-m/photo-position-ui.test.mjs app/configurator/variant-m/ui-event-regressions.test.mjs app/configurator/variant-m/mobile-steps.test.mjs
```

Build erfolgreich. Chromium-Bedienprüfung: Desktop 1280×720, Zwischenbreite 900×720, Handyformate 390×664 und 375×548; Werkzeugband bei 900 px ohne horizontalen Überlauf in zwei Reihen. Schriftgröße 8→9 mm und Rückgängig auf 8; Vollbild öffnen/verlassen und anschließender Wechsel zu Handy/Desktop; Schriftwahl mit normalem Klick am Desktop und Handy; „Schrift & Größe“ auf/zu. Spruchfeld beim Fokus 66 px, nach Verlassen 44 px. Alle vier Texte inklusive `Heimathafen\nvon` vor/nach Neuladen gleich. Keine Warnungen/Fehler im Browserprotokoll während dieser Prüfung. Sichtabgleich siehe [design-qa.md](../../design-qa.md).

Kein neuer Vollauf für die Layoutänderung. Der ältere Vollauf und seine 23 reproduzierten Baseline-Befunde bleiben ausdrücklich im [vorangegangenen Bericht](2026-10-29-konfi-sichtpruefung-astra.md) dokumentiert; 71 gezielte Tests ersetzen keine Aussage über den vollständigen Testbestand.

## Übergabe und Grenzen

Bestehender Entwurfs-PR [#58](https://github.com/Chris83638w/gravuru-2027/pull/58), weiter auf C / #54 gestapelt. Gemeinsamer Prüfbranch `dev/konfi-gemeinsame-pruefung-20261029-astra`; lokale Vorschau `http://127.0.0.1:8153/?model=acryl&configuration=d8`. Nur auf Chris' Rechner bei laufendem Server erreichbar. Der ursprüngliche Gestaltungstab/Prüfserver 8152 blieb unangetastet.

Offen vor Installation: gemeinsame Sichtfreigabe durch Chris, echtes iPhone/Safari mit Bildschirmtastatur und Zwei-Finger-Zoom, Ziehen am Drehgriff, Linux/Baseline-Befunde. Vor dem echten Shoptest weiterhin aktuelle D8-Quellrevision/Hash und neue Preisbindung einschließlich Cart Transform/Rückweg prüfen. Keine Shopify-/Live-Änderung, kein Import, kein Merge nach main, kein Force-Push; lokale Vorschau ohne Konto-/Bestellverbindung.
