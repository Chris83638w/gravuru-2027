# Echter Konfigurator bei 390 × 844 Pixeln

13.11.2026, Astra/Root. Chrome mit vorübergehendem Viewport 390 × 844; danach zurückgestellt. Einstieg jeweils über den echten Shopify-App-Proxy mit tatsächlicher Produkt- und Varianten-ID. Kein Simulator des Konfigurators, aber auch kein physisches iPhone-/Android-Gerät. Keine Veröffentlichung oder Bestellung, keine Warenkorbzeile angelegt oder gelöscht.

| Produkt / Variante | Beobachtung |
|---|---|
| Main 16190784602492 / 58104626479484 | Vorschau 120 × 80 mm, 14,99 €, 124 Designs; Suche D23 liefert 1 Treffer; Auswahl des Hausdesigns wird übernommen. Foto-/Logo-Reiter sichtbar. |
| A52 16203675074940 / 58189617791356 | 50 × 20 mm, 27 Designs, keine Foto-/Logo-Auswahl. Bestehender Testentwurf mit Schrauben und zusätzlichem Motiv: 11,37 € bei Menge 1, 96,60 € bei Menge 10; anschließend Menge wieder auf 1 gesetzt. |
| S82 16203718459772 / 58190028734844 | 80 × 20 mm, 27 Designs, keine Foto-/Logo-Auswahl. Bestehender Testentwurf mit Briefmotiv: 11,18 € bei Menge 1. |

Die bestehenden lokalen Prüfentwürfe von Claude wurden sichtbar wiederhergestellt; es wird kein frischer unveränderter Standardentwurf für A52/S82 behauptet. Textänderung, Foto-/Logo-Upload und erfolgreicher Shopify-Warenkorb wurden in diesem engen Mobilteil nicht neu geprüft. Die sieben tatsächlichen Shopify-422-Antworten und die 438 JS-Preisfälle bleiben Claudes gesonderte Belege.

## Konkreter Mobilfehler

Die Resetleiste steht neben der Platte innerhalb derselben horizontalen Vorschauzeile. Auf kleinen Formaten verdrängt sie die Platte nach links:

- A52: sichtbares Platten-SVG `viewBox 0 0 50 20`, Breite 245 px, Höhe 98 px, linke Position −0,65625 px; linke Maßbeschriftung abgeschnitten.
- S82: `viewBox 0 0 80 20`, Breite 312 px, Höhe 78 px, linke Position −34,15625 px; etwa 34 px der linken Plattenseite abgeschnitten, Resetknopf rechts ebenfalls teilweise außerhalb.
- Äußerer Viewport und Iframe jeweils 390 px; keine Behauptung über einen Geometrie- oder Materialfehler.

Screenshots: `konfi-main-mobile.png`, `konfi-main-mobile-design.png`, `konfi-A52-mobile.png`, `konfi-S82-mobile.png`. Diese zeigen den geprüften laufenden Stand vor einer Korrektur. Der lokale Reparaturvorschlag wird separat geprüft; diese Datei bestätigt keine Installation.

## Geprüfte lokale Korrektur, noch nicht installiert

Die beiden Korrekturen sind inzwischen in [aea809f](https://github.com/Chris83638w/gravuru-2027/blob/aea809f/docs/handoffs/2026-11-13-cart-mobile-fixes.md) gesichert und an Claude übergeben. 13/13 gezielte Mengen-/CartEdit-Fälle, 5/5 Mobil-/Resetfälle und unabhängige Quellen-/Hashreviews sind bestanden.

Root prüfte zusätzlich den tatsächlichen lokalen Kandidaten bei 390 × 844: S82 wieder vollständig mit 312 × 78 px bei x=31,5; A52 mit 230 × 92 px bei x=72,5; Main vollständig. Vollbild, Resetbestätigung, Abbrechen und Rückkehr funktionieren. S82 Menge 10 und 80,70 € bleiben nach vollständigem Neuladen erhalten. Die lokalen Bilder `konfi-*-local-fixed.png`, `konfi-S82-local-fullscreen.png` und `konfi-S82-local-quantity-restored.png` zeigen diesen Kandidaten. Das ist keine Hostinstallation und keine echte Shopify-Warenkorbzeile.

## Freigabeseite

Die separate Bild-/Textübersicht wurde ebenfalls bei Desktopbreite und 390 × 844 geprüft. Alle sechs Shopbilder laden; Produktdetails sind lesbar. Bei 390 px war die Dokumentbreite 375 px, ohne horizontalen Überlauf. `review-mobile-detail.png` zeigt A52. Das ist eine Prüfung der Freigabeübersicht und ersetzt den obigen echten Konfiguratorlauf nicht.
