# „Immer mit Kontur“ – Bestellansicht nur noch PDF und SVG, für alle Produktarten

Claude (Unteragent des Operators), 21.11.2026. Zweig `dev/claude-immer-kontur-20261121`, aufgesetzt auf `efb44c44` (Astras Stand mit den Belegen der Folgeversion). Nichts davon ist aufgespielt.

Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt unverändert; an Designs wird nichts geändert.

## Entscheidung von Chris (21.11.2026)

- 15:22 Uhr, auf die Frage nach den zwei Annahmen zu 3.57: „3. nein, immer konturen.“
- 15:26 Uhr, Auswahl im Dialog: „Nur PDF + SVG, mit Kontur“ (dort erläutert als: jede Datei enthält immer die Kontur als Haarlinie, die Varianten ohne Kontur entfallen bei allen Produkten) und für die Funkklingel „Nur Acrylauflage“.
- 15:28 Uhr: „es geht hier nicht nur um funkklingel schilder“ und „gedenktafek und alles andere auch“.

Im Code steht dafür der Verweis „ENTSCHEIDUNGEN 3.61“. Die Zeile im Register trägt der Operator ein.

## Was sich ändert

| Vorher (3.57) | Jetzt |
| --- | --- |
| Bestellansicht je Position vier Knöpfe: PDF, PDF mit Kontur, SVG, SVG mit Kontur | zwei Knöpfe: **PDF** und **SVG**, beide immer mit Kontur als Haarlinie |
| nur native Produkte (Rezepte Gravur v7, Druck v8) | **alle Produktarten**: native Produkte (Gravur v8, Druck v9) und Formprodukte alter Art (Gravur v2, Druck v6) |
| Formprodukte alter Art: keine Dateien in der Bestellansicht, Hinweis „gibt es nicht“ | dieselben zwei Dateien; der Sonderfall-Hinweis entfällt |
| Druck: zusätzlich eine Druckdatei ohne Schnittlinie | entsteht nicht mehr |

Bild der Bestellansicht (lokale Werkstatt, synthetische Testbestellung): `docs/handoffs/2026-11-20-prio-c-technik-claude/bilder/32-bestellansicht-pdf-svg-mit-kontur.png`. Je eine gerenderte PDF mit Kontur: `33-gravur-pdf-mit-kontur.png`, `34-druck-pdf-mit-kontur.png` (jeweils mit vergrößertem Eckausschnitt, damit die Haarlinie zu sehen ist).

**Was die zwei Dateien sind**

- Gravur – PDF: die Gravurseite plus Kontur als Haarlinie auf eigener Ebene „Kontur“. SVG: die Gravurgestaltung plus Konturebene. Beide in der Ausrichtung der Gravur (gespiegelt wie sie).
- Druck – PDF: die Druckdatei mit Farbe und Weiß, die Schnittlinie als Haarlinie (bei Mimaki bleibt Weiß wie bisher die eigene Datei). SVG: die gesicherte Gestaltung, seitenrichtig, plus Konturebene.
- Haarlinie wie in 3.57 Punkt 4: PDF Linienbreite 0, SVG `stroke-width="0.05"`.
- Funkklingel: die Kontur der Acrylauflage; die Schnittdateien für Träger und Auflage bleiben getrennt im Paket.

**Vorhandene Ausgaben**

- Ausgaben vom 21.11. (Rezepte v7/v8, vier Dateien): Die Bestellansicht liefert aus ihnen sofort die Fassung mit Kontur – ohne Neuaufbau. Die Dateien ohne Kontur werden dort nicht mehr abgegeben. Beim Öffnen der Ausgaben einer Position entsteht wie bisher von selbst der Auftrag mit dem neuen Rezeptstand.
- Ältere Ausgaben ohne Dateinachweis und frühere Ausgaben von Formprodukten: Hinweis „PDF und SVG werden für diese Position neu erstellt.“, Neuaufbau beim Öffnen.
- Alle gespeicherten Ausgaben bleiben unter ihrem Schlüssel gültig und über „Ausgaben“ abrufbar.

**Unverändert**

- Die Seite „Ausgaben“ und das Prüfpaket: Gravur-PDF, getrennte Konturdatei, Fertigungs-SVG, gesicherte Gestaltung, Druck- und Weißdateien, Schnittdateien der Funkklingel.
- Die Editor-Pakete (siehe Prüfungen). `app/configurator/variant-m/print-export-model.mjs` ist nicht angefasst.

## Fachregeln und ihre Quelle

| Regel im Code | Quelle |
| --- | --- |
| Bestellansicht: nur PDF und SVG, beide immer mit Kontur, bei allen Produkten | Chris, 21.11.2026, 15:22/15:26/15:28 Uhr |
| Funkklingel: Kontur der Acrylauflage | Chris, 21.11.2026, 15:26 Uhr |
| Kontur als Haarlinie (PDF 0, SVG 0,05 mm) | ENTSCHEIDUNGEN 3.57 Punkt 4 („immer haarlinien“) |
| Gravur ohne Fertigungsprofil: Vektor ohne Foto, sonst Raster 300 dpi | ENTSCHEIDUNGEN 3.57 Punkt 5, unverändert |
| Konturfarbe: Funkklingel rot, Schiefergravur blau, sonst schwarz; Druck-PDF in der Sonderfarbe `CutContour` der Druckdatei | **keine Entscheidung von Chris** – die Farben der bisherigen Kontur- und Druckdateien, unverändert übernommen |

**Offen, bitte entscheiden oder im Maschinentest klären:** Für Formprodukte aus Schiefer gilt jetzt dieselbe Farbregel wie beim nativen Schieferprodukt, also eine blaue Kontur in den zwei Bestelldateien. Die getrennte Konturdatei des Formprodukts ist dagegen weiter schwarz (unverändert gelassen, damit die bisherigen Dateien gleich bleiben).

## Geänderte Dateien

- `app/workshop/print-delivery.mjs` – zwei Formate, Dateinachweis `gravuru-order-files/v2`, Abbildung der bisherigen Ausgaben (`pdf` ← `pdf-contour`, `svg` ← `svg-contour`), eine Farbregel für native und Formprodukte, Druck nur noch mit Haarlinie.
- `app/workshop/acrylic-engraving-proof.mjs` (v8), `app/workshop/acrylic-print-proof.mjs` (v9).
- `app/workshop/form-engraving-proof.mjs` (v2), `app/workshop/form-print-proof.mjs` (v6) – Formprodukte führen die zwei Dateien.
- `app/workshop/http.mjs`, `app/workshop/cross-store-orders.mjs` – Meldungen und Hinweise; kein Sonderfall „Formprodukt alter Art“ mehr.
- `app/workshop/ui/order-store-context.mjs`, `app/workshop/ui/orders-ui.mjs`, `app/workshop/ui/orders.html` – zwei Knöpfe, Hilfetext.
- `app/workshop/production-summary.mjs` – Dateibeschreibungen.
- Tests: `order-files.test.mjs` (11 Tests, davon 2 neu für Formprodukte), `surfaces.test.mjs`, `photo-color-export.test.mjs`, `production-summary.test.mjs`, `form-print-proof.test.mjs`.

## Was Astra aufspielt

- **Nur den Server** (mit Neustart). Kein Editor, kein Theme, keine App-Version, kein Schalter, keine Datenumstellung.
- Die Werkstattseite „Bestellungen“ kommt vom Server; nach dem Aufspielen die Seite einmal neu laden.
- Wirkung sofort: Die vorhandenen Testbestellungen zeigen zwei Knöpfe und liefern die Fassung mit Kontur aus ihrer gespeicherten Ausgabe. Beim ersten Öffnen einer Position entsteht ein neuer Ausgabeauftrag (einer je Position, nacheinander wie bisher).
- Sichtprüfung ohne Messung: eine Testbestellung öffnen → zwei Knöpfe und der Hilfetext „Beide enthalten immer die Kontur als Haarlinie“; PDF laden → Ebene „Kontur“ bzw. beim Druck `CutContour`, Linienbreite 0; SVG laden → letzte Ebene `<g id="kontur" …>`.

**Rückweg:** Server zurück auf `815a0cfb`. Es geht nichts verloren: Die neuen Ausgaben bleiben gespeichert. Der alte Stand liest ihren Dateinachweis nicht und baut für eine Position beim Öffnen die Ausgabe seines Rezeptstands (wieder) auf; die Ausgaben vom 21.11. sind dafür noch vorhanden.

## Prüfungen (lokal, synthetische Daten)

- **Gezielte Tests:** 466 Tests in 76 Dateien, alle bestanden (Lauf 1: 43 Dateien, 304 Tests – Ausgaben, Rezepte, Bestelleingang, Bestellansicht, Formprodukte, Funkklingel, Schiefer; Lauf 2: 33 Dateien, 162 Tests – übrige Bestell-, Kontur-, Funkklingel-, Schiefer- und Werkstatttests samt `http.test.mjs`). Kein Gesamtlauf; den macht der Operator auf dem zusammengeführten Stand.
- **Übrige Paketdateien unverändert:** 13 Ausgaben (native Gravur Vektor/Raster/mit Foto, nativer Druck Roland/Mimaki, Funkklingel ungespiegelt/gespiegelt, Formgravur Raster/Vektor/mit Foto/Schiefer, Formdruck Roland/Mimaki) aus denselben gespeicherten Prüfpaketen einmal mit `efb44c44` und einmal mit diesem Stand gerechnet und Datei für Datei verglichen. Von 191 gemeinsamen Dateien sind 112 Byte für Byte gleich und 27 PDF gleich bis auf Erstelldatum und Dokument-ID (so schwanken sie auch zwischen zwei Läufen desselben Stands); 13 sind die `summary.pdf` mit Zeitpunkt und Prüfsummen im Inhalt. Die übrigen 39 sind die JSON-Angaben der Ausgabe (`gravurpruefung.json`, `druckpruefung.json`, `manifest.json`, `summary.json`); sie unterscheiden sich nur in Rezeptstand, Dateinachweis, Dateiliste und Beschreibungstexten. Keine sonstige Abweichung. Entfallen: `druck-1zu1-ohne-schnittlinie.pdf` (nativer Druck). Neu: die zwei Bestelldateien bei Formprodukten.
- **Kontur deckungsgleich zur Gestaltung (Formprodukte):** Die Gestaltung liegt in Millimetern (`viewBox="0 0 Breite Höhe"`), wie die Kontur. Die Konturebene der SVG trägt denselben Pfad, auf den die Gestaltung selbst beschnitten ist (`form-design-clip`); gespiegelt liegen beide unter derselben Spiegelung. In der PDF liegt die Haarlinie punktgleich auf der getrennten Konturdatei, die Designfläche an ihrem Maß (3…17 × 3…23 mm, gespiegelt 43…57 mm). Es war keine Umrechnung nötig.
- **Gegenproben:** 15 einzelne Rückbauten (alte Ausgabe liefert wieder die Datei ohne Kontur, vier Formate, Schiefer-Formprodukt nicht blau, Druck ohne Schnittlinie, Rezeptstand nicht erhöht, SVG ohne Kontur, 0,05 mm statt Haarlinie, Formgravur/-druck ohne Bestelldateien, Kontur falsch oder nicht gespiegelt, Sonderfall Formprodukt, dritter Knopf, alter Hilfetext, kein Neuaufbau beim Öffnen) – jeder von einem Test erkannt, danach wiederhergestellt.
- **Editor-Pakete unverändert:** vor und nach der Änderung dieselben sechs Dateien mit gleichem Inhalt, darunter Kern `editor-583629bc80164050.mjs` und Darstellung `editor-d6521828989e096a.mjs`.
- **Echter Browser (lokale Werkstatt):** zwei aktive Knöpfe, neuer Hilfetext; der Klick auf „PDF“ lädt `…-gravur-1zu1-mit-kontur.pdf` (Bild 32).

Nicht geprüft: alles am echten Shop und an den Maschinen.

## Grenzen und Prüfpunkte für die Fertigung

1. **Die Gravurdatei trägt die Kontur jetzt immer.** Sie liegt auf eigener Ebene „Kontur“ als Haarlinie – bei Schiefer blau, bei der Funkklingel rot, sonst **schwarz**. Ob die Lasersoftware sie als Anlegelinie behandelt oder mitgraviert bzw. schneidet, zeigt erst der Maschinentest. Bei Rastergravur liegt die Kontur als Vektor über dem Graustufenbild.
2. **Druck:** Die Schnittlinie steht als Haarlinie in der Sonderfarbe `CutContour` der Druckdatei (dort bisher 0,05 mm). Ob RIP und Drucker die Haarlinie als Schnitt nehmen oder mitdrucken, zeigt der Maschinentest. Die Weißdatei bei Mimaki gibt es weiter nur über „Ausgaben“.
3. **Druck-SVG seitenrichtig, Druck-PDF gespiegelt nach Profil** – wie bisher.
4. **„Ausgaben“ behält die getrennten Dateien**, auch die Gravur-PDF ohne Kontur und die getrennte Konturdatei. „Immer mit Kontur“ gilt für die Bestellansicht. Soll es auch dort gelten, ist das eine eigene Entscheidung.
5. Der Knopf „Ausgabe“ legt bei Gravur ohne Profil weiter einen zweiten Auftrag neben dem automatischen an (bekannte Grenze, unverändert).
6. Ältere, nicht zweischichtige Funkklingel-Prüfstände bekommen wie bisher keine Fertigungsausgabe („noch nicht angebunden“) und damit keine Dateien.
7. Formprodukte haben nur eine Fläche; eine Rückseite gibt es dort nicht.
