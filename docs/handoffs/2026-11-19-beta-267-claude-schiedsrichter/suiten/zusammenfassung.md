# Gesamtsuite je Stand (Claude, 19.11.2026)

Aufruf je Arbeitskopie: `node --test app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs` (Umfang wie `npm test`), Node 24.22.3, Python 3.13 mit PyMuPDF 1.28.2, `python3` und `GRAVURU_PYTHON` auf dieselbe Umgebung gesetzt.

| Stand | Tests | bestanden | fehlgeschlagen | übersprungen | Dauer |
| --- | ---: | ---: | ---: | ---: | ---: |
| A `f7504182` (Freeze nach der Kurskorrektur) | 2797 | 2792 | 1 | 4 | 19,0 min |
| B `60f05317` (Freeze nach der Kurskorrektur) | 2794 | 2786 | 4 | 4 | 18,2 min |
| A `347aa63f` (früherer Stand) | 2795 | 2790 | 1 | 4 | 18,7 min |
| B `b85bc416` (früherer Stand) | 2802 | 2794 | 4 | 4 | 18,2 min |

## Fehlgeschlagene Tests

**A `f7504182` (Freeze nach der Kurskorrektur)**
- Werkstatt einheitlich: jede Werkstattseite trägt dieselbe erzeugte Kopfzeile und das gemeinsame Raster

**B `60f05317` (Freeze nach der Kurskorrektur)**
- native photo density follows physical scale and crop zoom, not pan or rotation
- edited image pixels and each placement determine density; originals remain intact
- free uploads use contained image dimensions rather than the photo-slot cover
- Werkstatt einheitlich: jede Werkstattseite trägt dieselbe erzeugte Kopfzeile und das gemeinsame Raster

**A `347aa63f` (früherer Stand)**
- Werkstatt einheitlich: jede Werkstattseite trägt dieselbe erzeugte Kopfzeile und das gemeinsame Raster

**B `b85bc416` (früherer Stand)**
- native photo density follows physical scale and crop zoom, not pan or rotation
- edited image pixels and each placement determine density; originals remain intact
- free uploads use contained image dimensions rather than the photo-slot cover
- Werkstatt einheitlich: jede Werkstattseite trägt dieselbe erzeugte Kopfzeile und das gemeinsame Raster

## Einordnung

- „Werkstatt einheitlich: jede Werkstattseite trägt dieselbe erzeugte Kopfzeile …“ (`app/workshop/konfis.test.mjs`) schlägt auch am Ausgangsstand `f84433f8` fehl. Kein Bezug zu #267.
- Die drei Tests zur Fotoauflösung (`app/workshop/acrylic-photo-resolution.test.mjs`) schlagen am Ausgangsstand fehl (2 von 5 bestanden). A hat die Sollwerte an `PRIO-KONFI.md`, Zeile 47, angepasst; dort bestehen 5 von 5. B hat sie nicht angefasst.
- Keiner der Stände bringt einen neuen Fehlschlag in die Suite.
- Die Testzahlen unterscheiden sich, weil beide Teams eigene Tests ergänzt und B seine Mustertests wieder entfernt hat.
- Astra meldet für ihren Windows-Lauf 2.796 und 2.798 Tests mit denselben acht Fehlermeldungen auf beiden Seiten, davon sieben aus der Umgebung (fremder Bericht). Bei mir bleibt in beiden A-Ständen nur der Werkstatt-Test rot.
- Einen ersten Lauf, bei dem `python3` nicht auf die PyMuPDF-Umgebung zeigte, habe ich nach mehreren hundert Fehlschlägen abgebrochen. Die Ursache war meine Umgebung, nicht ein Kandidat.

## Weitere Läufe

| Prüfung | Ausgangsstand | A | B |
| --- | --- | --- | --- |
| Gegenprobe Bestellung und Dateien (eigener Einschub) | bestanden, Kontur-PDF nicht bytegleich | `347aa63f` und `f7504182`: bestanden, alles bytegleich | `b85bc416` und `60f05317`: bestanden, Kontur-PDF nicht bytegleich |
| `ops/shopify/*.test.mjs` ohne den Theme-Test | 36 von 36 | 36 von 36 (`347aa63f`) | 36 von 36 (`b85bc416`) |
| `ops/shopify/cart-edit-r15-theme.test.mjs` mit `liquidjs` 10.30.1 | 9 von 9 | 4 von 4, neue Tests (`347aa63f`) | 9 von 9 (`b85bc416`) |
| `app/workshop/acrylic-photo-resolution.test.mjs` | 2 von 5 | 5 von 5 | 2 von 5 |
| Astras Browserprüfung (`preview-cart-browser.cjs`) | – | `347aa63f`: 6 von 6, im Handyprofil 3 von 3 · `f7504182`: 2 von 2 | – |
| Eigene Tests von B an `b85bc416` (`beta-267-*.test.mjs`, `doorbell-selection.test.mjs`) | – | – | 19 von 19 |
| Ring-Tests von B an `949dae02` mit nachgereichter Schriftdatei | – | – | 3 von 3 (ohne: 1 von 3). Von B inzwischen zurückgezogen |
