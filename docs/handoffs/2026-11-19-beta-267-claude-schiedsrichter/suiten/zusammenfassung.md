# Gesamtsuite je Stand (Claude, 19.11.2026)

Aufruf je Arbeitskopie: `node --test app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs` (Umfang wie `npm test`), Node 24.22.3, Python 3.13 mit PyMuPDF 1.28.2, `python3` und `GRAVURU_PYTHON` auf dieselbe Umgebung gesetzt.

| Stand | Tests | bestanden | fehlgeschlagen | übersprungen | Dauer |
| --- | ---: | ---: | ---: | ---: | ---: |
| A `347aa63f` | 2795 | 2790 | 1 | 4 | 18,7 min |
| B `b85bc416` | 2802 | 2794 | 4 | 4 | 18,2 min |

## Fehlgeschlagene Tests

**A `347aa63f`**
- Werkstatt einheitlich: jede Werkstattseite trägt dieselbe erzeugte Kopfzeile und das gemeinsame Raster

**B `b85bc416`**
- native photo density follows physical scale and crop zoom, not pan or rotation
- edited image pixels and each placement determine density; originals remain intact
- free uploads use contained image dimensions rather than the photo-slot cover
- Werkstatt einheitlich: jede Werkstattseite trägt dieselbe erzeugte Kopfzeile und das gemeinsame Raster

## Einordnung

- „Werkstatt einheitlich: jede Werkstattseite trägt dieselbe erzeugte Kopfzeile …“ (`app/workshop/konfis.test.mjs`) schlägt auch an der Basis `f84433f8` fehl. Kein Bezug zu #267.
- Die drei Tests zur Fotoauflösung (`app/workshop/acrylic-photo-resolution.test.mjs`) schlagen an der Basis fehl (2 von 5 bestanden). A hat die Sollwerte an `PRIO-KONFI.md`, Zeile 47, angepasst; dort bestehen 5 von 5. B hat sie nicht angefasst.
- Keiner der beiden Kandidaten bringt einen neuen Fehlschlag in die Suite.
- Die Testzahlen unterscheiden sich, weil beide Teams eigene Tests ergänzt haben. Die drei Ring-Tests an `949dae02` (`beta-267-ring.test.mjs`) bestehen bei mir erst, wenn unter `/usr/share/fonts/truetype/macos/Inter-Regular.ttf` eine Schriftdatei liegt.
- Einen ersten Lauf, bei dem `python3` nicht auf die PyMuPDF-Umgebung zeigte, habe ich nach mehreren hundert Fehlschlägen abgebrochen. Die Ursache war meine Umgebung, nicht ein Kandidat.

## Weitere Läufe

| Prüfung | Basis | A | B |
| --- | --- | --- | --- |
| `ops/shopify/*.test.mjs` ohne den Theme-Test | 36 von 36 | 36 von 36 | 36 von 36 |
| `ops/shopify/cart-edit-r15-theme.test.mjs` mit `liquidjs` 10.30.1 | 9 von 9 | 4 von 4 (neue Tests) | 9 von 9 |
| `app/workshop/acrylic-photo-resolution.test.mjs` | 2 von 5 | 5 von 5 | 2 von 5 |
| `app/workshop/konfis.test.mjs` | 5 von 6 | 5 von 6 | 5 von 6 (aus der Suite) |
| Eigene Tests von B an `b85bc416` (`beta-267-*.test.mjs`, `doorbell-selection.test.mjs`) | – | – | 19 von 19 |
| Ring-Tests von B an `949dae02` mit nachgereichter Schriftdatei | – | – | 3 von 3 (ohne: 1 von 3) |
