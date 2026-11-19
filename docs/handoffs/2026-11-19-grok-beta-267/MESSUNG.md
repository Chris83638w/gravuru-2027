# Messung V0

Rohwerte: [messwerte.json](messwerte.json). Drei Läufe, Median der Läufe. Umgebung: diese Cloud-VM, Node 22.23.4. Nicht Chris' Rechner, nicht das Live-Netz, kein Shopify-Aufruf.

## Definition

Technisch verursachte Wartezeit ist die Zeit, die das Programm warten lässt. Die freie Gestaltungszeit des Kunden zählt nicht. Ziel aus #267 bleibt etwa 5 Sekunden über den ganzen Kundenweg. Diese Lieferung behauptet das nicht. Gemessen sind nur die drei geänderten Stellen.

| Stelle | Median | Was das bedeutet |
| --- | ---: | --- |
| Profil, erster Aufruf, vergrößerte Fixture | 9,76 ms | 2500 zusätzliche Vorlagenobjekte, damit die Kopie überhaupt sichtbar wird |
| Profil, weitere Aufrufe derselben Auswahl | 3,39 ms | etwa ein Drittel, weil die Berechnung liegt und nur noch die Rückgabekopie läuft |
| Checkout-Bild, blockierend, simulierte 2000 ms | 2000,39 ms | der bisherige `cart/data`-Weg wartet die Bildverarbeitung ab |
| Checkout-Bild, Vorschau zuerst | 1,48 ms | persönliche PNG ist da, Shopify-Datei wird nicht abgewartet |
| Seitenmodul, erster Abruf | 1,33 ms, 7155 Byte | lokal, fast ohne Netz |
| Seitenmodul, ETag | 0,57 ms, 0 Byte, Status 304 | der Körper wird nicht erneut geschickt |

Die frühere Live-Messung bleibt daneben stehen: `cart/data` etwa 2,2–3,1 s, Designwechsel am Desktop etwa 0,26–0,38 s, davon der größte Teil `structuredClone`. Die vergrößerte Fixture erreicht diese 250 ms nicht. Sie zeigt die Richtung, nicht den Live-Wert. Ein erneuter Lauf auf dem echten Ring-Profil gehört auf die geschützte Adresse.

## Browser

`scripts/beta-267-demo.mjs` öffnet den lokalen Warenkorb in Headless-Chrome.

- Desktop 1365×900: [PC-Warenkorb.png](PC-Warenkorb.png). Zwei Zeilen, Variante gleich, Bilder „NORD 12“ und „SUED 27“, je 54,98 €, Summe 109,96 €, nur „Entfernen“.
- Handy 390×844: [Mobil-Warenkorb.png](Mobil-Warenkorb.png). Dieselbe Seite, Bild über dem Text.
- Klickprüfung: Vergrößern öffnet den Dialog, Entfernen lässt genau „Haus Süd 27“ stehen, kein Bearbeiten-Text. Siehe [browser-pruefung.json](browser-pruefung.json).

Die Bilder im Warenkorb sind lokale Prüf-PNGs mit dem kurzen Wort der Gestaltung. Die Fertigungsdateien der End-to-End-Prüfung sind davon getrennt und enthalten die Texte „Haus Nord 12“ und „Haus Süd 27“ als Pfade.
