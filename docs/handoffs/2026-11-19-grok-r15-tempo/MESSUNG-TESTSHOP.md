# Messplan Testshop, zur Freigabe durch Chris

Kein Lauf ohne Freigabe. Keine Bestellung, keine Erstattung, keine Theme- oder Serveränderung. Eine Testposition, danach entfernt.

1. Produkt: das Ring-Schild, eine Ausführung, zwei verschiedene Gestaltungen, Menge 1.
2. Browser: Handyprofil 390×844, CPU vierfach, 150 ms, 1,6/0,75 Mbit/s. Zweiter Lauf Desktop ohne Drossel.
3. Am Klick „In den Warenkorb“ messen: `theme-cart`, `cart/data`, `cart/claim`, `cart/add.js`.
4. Bestanden, wenn `cart/add.js` JSON ist und kein Dateikörper, `_Entwurf` und `_gravuru_checkout_image` dieselbe `cdn.shopify.com/.../gravuru-gestaltung-….png` sind, und die Kasse diese URL als Positionsbild zeigt.
5. Zusätzlich die Warenkorbseite: Vorschau vergrößern, zweite Gestaltung bleibt getrennt, kein Bearbeiten-Knopf, Preis unverändert.
6. Die Testposition im Testshop löschen. Nichts auf den Live-Shop.
7. Zeitgrenze für diesen Weg: deutlich unter 8–15 s vom Klick bis zur Warenkorbseite. Ob die Kasse das Bild wirklich zeichnet, sieht nur dieser Lauf.

Lokal ist nur die simulierte Dateilatenz aus `docs/measurements/2026-11-17-konfi-tempo-p1-1b/live-sanitized.json` belegt: Token 1950 ms und Poll 2251 ms laufen gleichzeitig mit der Preisprüfung 1081 ms, nicht dahinter.
