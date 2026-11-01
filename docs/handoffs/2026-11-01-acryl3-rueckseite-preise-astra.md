# Acrylglas 3 mm: Rückseitengravur und bestätigte Preise · Astra · 01.11.2026

Basis: Code `09bdf2105ba271a283b37070e6b61eeccccf78db`, Katalog `80fedf744855af0a957c3017c8dc4652cc40a6c6`. Eigene Branches `dev/acryl3-rueckseite-20261101-astra` / `dev/acryl3-rueckseite-preise-20261101-astra`. Keine Freigabe, kein Import, kein Merge, kein Live-Zugriff.

## Regelquellen und Umfang

- [Nachricht 37](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6554392347): Acryl 3 mm schwarz/anthrazit von hinten gravieren; lesbare Kundenvorschau, einmal gespiegelte Produktionsdateien, Edelstahl ungespiegelt. Glaswirkung für Konfi und Werkstatt, Vorher/Nachher für alle Formen.
- [Nachricht 38](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6554514221): ausschließlich fünf bestätigte Grundpreise ändern. Geometrie, Kennungen und übrige Preise erhalten.
- [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md): Originalgestaltungen, Motive und Katalogschriften erhalten. Dieses Paket erzeugt keine neuen Designs.
- Reihenfolge laut [Nachricht 39](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6554563538): 37 → 38 → 39 → 36. N39/N36 sind hier nicht implementiert.

## N37 umgesetzt

`acrylic-plate-preview.mjs` ergänzt ausschließlich bei nativen 3-mm-Acrylfamilien Schwarz/Anthrazit mit Rückseitengravur eine leichte Kante, einen dezenten Lichtreflex und eine helle, leicht matte Gravur unter der Glasoberfläche. `studioSvg` ist der gemeinsame Renderer von Konfi und Werkstatt-Zielvorschau. Die originale Plattenkontur einschließlich Bohrungen bleibt erhalten. Auswahlgriffe werden nicht weichgezeichnet. Bedienelemente, Layout, Edelstahl, 5-mm-Familien und Funkklingeloberfläche werden nicht verändert.

**Diagnose zur Spiegelung:** Die beiden Familien enthalten bislang keine explizite `engravingSide`. Der vorhandene Fallback `acrylic-engraving` hat aber bereits `mirror:true`; `familyProductConfig` übernimmt daraus `back`. Deshalb wurde keine weitere Spiegelung eingebaut. Beide Katalogfamilien erhalten die explizite Angabe. Der bestehende Exportweg spiegelt genau einmal.

Das Gravurpaket enthält zusätzlich `gravur-fertigung.svg`, direkt aus demselben vorbereiteten und orientierten SVG-Baum wie die PDF-Ausgabe. `gesicherte-gravurgestaltung.svg` bleibt die ungespiegelte Quelle. Bei zwei gestalteten Flächen erhalten die Dateien die bestehenden Seitensuffixe. Die Rezeptversion steigt auf v5, damit alte Exportpakete ohne diese Datei nicht aus dem Cache kommen. Glasreflexe und Bedienhilfen gelangen nicht in die Fertigung.

## N38: Familien und erzeugte Ansichten geprüft, Serienfrage noch offen

| Familie / SKU | vorher | nachher |
| --- | ---: | ---: |
| Stahl `GR-ES-EL-240X80-T15` | 30,99 € | 32,99 € |
| Stahl `GR-ES-EL-270X90-T15` | 36,99 € | 39,99 € |
| Stahl `GR-ES-EL-300X100-T15` | 44,99 € | 56,99 € |
| Acryl `TS-Acryl-OV-300X100-T30-SW` | offen | 39,99 € |
| Acryl `TS-Acryl-OV-300X100-T30-AN` | offen | 39,99 € |

13 Familien vollständig verglichen: außer diesen fünf Werten und zweimal `engravingSide: back` alle Felder gleich. Auch numerische Schreibweisen der Stahlgeometrie bleiben erhalten. 45×30 cm bleibt 159,99 €, 7×2 cm bleibt 8,99 €; die autoritative Geometrie des letzteren Schlüssels bleibt 70×23,3 mm.

Vollständiger Katalogbau durchgeführt; 3 betroffene PDFs mit je 13 A3-Querformatseiten geöffnet und geprüft. Unbeteiligte generierte Familienansichten bytegleich erhalten. Excel aus allen 13 finalen Familien neu erzeugt: **5.956 Zellen verglichen, exakt 7 Änderungen** (5 Grundpreise, 2 Gravurseiten). Keine Design-/Ziel-Freigabe geändert.

**Vor Abschluss N38 klären:** Die alte Stahlserie verwendet für 24×8 / 27×9 `TS-V2A-OV-240X80-T15` / `TS-V2A-OV-270X90-T15`, statt der bestätigten `GR-ES-EL-*`-Schlüssel. 30×10 fehlt in beiden alten Serien (je 79 Größen, Familien je 80). Keine Serienkennung erfunden oder überschrieben; Serien noch unverändert. [Konkrete Rückfrage an Claude](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6554654257).

Dieselbe Rückfrage klärt N39: Acryl ist seit N35 ausdrücklich unter OV vereinheitlicht, während N39 wieder Oval/Ellipse getrennt nennt. Die Entscheidung wird vor der Formauswahl benötigt.

## Nachweise und Tests

- `app/workshop/acryl3-rear.test.mjs`: **25/25 bestanden, 0 übersprungen**. Drei gepinnte Familien (240 Größen); je acht Formen in beiden Acrylfarben und Stahl. Kundenvorschau und Werkstatt bleiben lesbar; tatsächliche SVG/PDF-Ausgabe inklusive RT1/RT2, Oval und schmalem Oval. PDF-Pfadgrenzen belegen die Spiegelung, keine Schriftdateien oder Rasterbilder in der Vektorausgabe. Eine manipulierte Client-Spiegelungsangabe wird übersteuert.
- 11 bestehende Testdateien: **66 unterschiedliche Tests bestanden**. Erster Lauf im Windows-Temporärverzeichnis: 41/66, 25 Rechtefehler beim Umbenennen. Mit eigenem temporären Prüfverzeichnis: 61/66; verbleibende 5 ausschließlich `EACCES 127.0.0.1`. Genau diese 5 mit erlaubtem lokalem Netzwerk erneut: 5/5. Keine Assertion geändert, kein Test entfernt.
- Zusammen **91 unterschiedliche bestandene Tests**, 0 Skip. Nach rein textueller Erhaltung der JSON-Zahlenschreibweise die Fixture-Prüfsumme nochmals geprüft: 1/1, nicht zusätzlich gezählt.
- Konfigurator-Build und `git diff --check` bestanden. Linux-Vollauf steht bei Claude aus.
- Python-Prüfabhängigkeiten und `python3`-Aufrufhilfe ausschließlich lokal außerhalb des Repos; keine Systeminstallation, keine Schriftdateien im Code-Repo.

Bestehende Testdateien: `acrylic-engraving`, `form-engraving-proof`, `output-orientation`, `acrylic-artwork`, `design-target-preview`, `acrylic-import-tint`, `family-acrylic-product`, `contour-path`, `surfaces` unter `app/workshop/`, dazu `material-surface-preview` und `customer-orientation` unter `app/configurator/variant-m/`.

[Katalogbelege auf dem Begleitbranch](https://github.com/Chris83638w/gravuru-katalog./tree/dev/acryl3-rueckseite-preise-20261101-astra/auftraege/2026-11-01-acryl3-rueckseite-preise): 16 Vorher-/Nachher-Paare, zwei Kontaktbögen, Preis-/Excel-Vergleich und echtes RT2-D1-Beispiel mit Kundenname „Mustermann“ als gespiegelte SVG/PDF plus lesbarer Vorschau. Rund zeigt mangels bestehendem Master nur die Platte; der Exporttest verwendet dort ausdrücklich ein synthetisches F. Keine Fertigungsfreigabe behauptet.

## Nächster Schritt

Claude: N37-Code und Katalogbelege prüfen, Linux-Vollauf; die zwei Quellenfragen in #48 beantworten. Danach ausschließlich die bestätigten Serienpreise ergänzen und N38 abschließen. Anschließend N39 Form/Größe, danach N36 reversible Ausweichbewegung. Nicht mergen oder live stellen.
