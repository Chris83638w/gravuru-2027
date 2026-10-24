# Paket B – Kontur im Konfigurator · 24.10.2026

**Stand: implementiert und technisch geprüft; Browser-Sichtabnahme/Screenshot offen. Beide B-PRs bleiben Draft.** Das einmalige unabhängige Review fand zwei Rückseitenfehler; beide sind behoben und mit gezielten Regressionen geprüft.

- Code: [PR #12](https://github.com/Chris83638w/gravuru-2027/pull/12).
- Katalog: [PR #3](https://github.com/Chris83638w/gravuru-katalog./pull/3).
- Branch in beiden Repos: `dev/kontur-konfigurator-20261024-astra`.
- Feste Basis: Code main `603fa4415121d305cff31755ffab2c6af653919a`, Katalog main `9bd4d146bc0a308bc63b079e582f2a82712b6082`. Paket A war vor Arbeitsbeginn gemerged und wurde an der Quelle verifiziert.
- Direkter Nutzerauftrag: B nach A-Merge starten; C darf parallel laufen. Kein Merge durch Astra.

## Umsetzung

Ein browserkompatibles gemeinsames Konturmodul trägt den vorhandenen SVG-Parser und die analytische Pfadausdehnung weiter. Original-`outlinePath`, feste gewählte Bohrungen, `safeMarginMm` und `holeKeepoutMm` bleiben durch Familie, Produktvertrag, Vorschau und Ausgabe erhalten. Bohrungen kommen nur aus der gewählten Befestigung; K00 hat keine Bohrungen. Beide 9×6-Preise bleiben 1499 Cent, B02 kostet 249 Cent zusätzlich.

Vorschau/Materialtextur und Artwork verwenden den Originalpfad mit echten Ausschnitten. Die Gestaltungsfläche ist eine Innenabstandsmaske, kein verkleinerter Umriss. Gemeinsame Polygon-/Punktprüfungen kontrollieren konkave Einschnitte, Objektkanten und Bohrloch-Schutzzonen. Adaptive Polylinien haben 0,002 mm Toleranz plus konservative Reserve ausschließlich für Zulässigkeit/Abstand; die Produktionskontur bleibt eine Kurve aus dem Originalpfad. Dieselbe Prüfung steuert freie Platzierung, Skalierung, Ziehen und zulässige Einrastziele. Der bisherige freie Rechteck-/Oval-Größeneditor kann Konturmaße nicht neu skalieren.

Der Browser-Prüfdruck schreibt die ursprünglichen Kurven in PDF; quadratische Kurven werden exakt kubisch, SVG-Bögen in kurze kubische Abschnitte umgesetzt. Der Browser-Konturdruck ist ausdrücklich auf **0 mm Überdruck** begrenzt. Ein positiver Außen-/Weißversatz wird nicht als Rechteck angenähert; dafür bleibt die separate Werkstatt-Fertigungsausgabe maßgeblich.

Die native Gravurprüfung deckte einen CairoSVG-Fehler auf: Lochkreise mit derselben Umlaufrichtung wie eine Retro-Außenkontur wurden trotz evenodd gefüllt. Nur erzeugte Lochkreise werden jetzt gegen die Außenrichtung orientiert. Originalumriss und bestehende Grundformen bleiben unverändert. Vektor- und Rasterausgabe sparen Bohrungen und Außenraum aus.

Retro-Designquellen mit `sizesOpen` werden nur auf tatsächlich vorhandene RT1-/RT2-Größen abgebildet. Historisches RT2 90,6×61,3 mm wird mit Faktor 60/61,3 proportional und zentriert nach 90×60 mm übertragen und bleibt als „prüfen“ markiert. Keine verzerrte Übertragung, keine neuen Quellgrößen/IDs und keine Umzeichnung ungeeigneter Motive.

## Geänderte Bereiche

- Gemeinsame Konturgeometrie und Design-/Produktvalidierung; Workshop-Konturmodul bleibt kompatibler Re-Export.
- Familienkonfiguration, Katalogkonvertierung/-import, Konfiguratorvertrag und Standardvorlage.
- Editoradapter, Gestaltungsfläche, Materialclip, Einpassen, Platzierung, Randsperre, Hilfslinien, Flächen und Größeneditor.
- Native Artwork-Lochpfade, Browser-PDF-Konvertierung/-export.
- Originalgetreue RT1-/RT2-Testfixtures, neue Kontur-/Vertrags-/Produktions-/UI-/Drucktests.
- Kataloggenerator mit Regressionstest, reproduzierbare lokale Vorschau `scripts/preview-retro-contours.mjs`.
- STATUS und diese Übergabe mit [versionierten Belegen](2026-10-24-paket-b-belege/).

## Prüfung

In gezielten Teilprüfungen wurden insgesamt **171 eindeutige Node-Tests** und **11 Python-Generatortests** erfolgreich geprüft. Darin enthalten sind drei neue UI-Seitenwechselfälle und sechs neue Rückseiten-Vertragsfälle. Der 31er-Geometrieblock wurde in Teilprüfungen abgeschlossen: ein ursprüngliches localhost-EACCES wurde durch den gezielten Root-HTTP-Test nach vorhandener Netzwerkfreigabe aufgelöst; keine Fehlerbehebung durch geänderte Sollwerte. Bestehender Python-Vektorimport wurde mit dem projektspezifischen Runtime-Pfad ausgeführt. Einzelne Agentenläufe haben dokumentierte Kommandos/Zähler statt nachträglich erzeugter Rohlogs.

| Prüfblock | Bestandene Tests |
| --- | ---: |
| product-families + contour-path + shared contour-geometry | 31 |
| Konturvertrag mit echten RT1-/RT2-Quellen | 3 |
| katalog-convert + katalog-import nach Sperraufhebung | 19 |
| acrylic-artwork + native Produktionskette | 5 |
| Kontur-UI, einschließlich Reviewkorrekturen | 12 |
| Bestehende steel-formats | 3 |
| Browserdruck-Modell + vier echte Konturen | 12 |
| Bestehende Vertrag-/Editor-/Katalogquellenregressionen | 55 |
| Rückseitenvertrag + authoring + KI-Planung + drei bestehende Flächenfälle | 31 |
| Python-Kataloggenerator | 11 |

Native Produktion: **12 Messfälle**, vier Originalzeichnungen RT1/RT2 90×60 und 300×200 mm; Kontur-PDF, Vektorgravur, RT2-Raster und Spiegelung. Zusätzlich echter D1-Quellstand → unveränderlicher Review → `acrylicArtwork` → gespiegeltes Gravurpaket. Maximaler Seiten-/Außenmaßfehler **0,000484 mm**, Lochmitten-/Durchmesserfehler **0,000912 mm**, Kurvenabstand **0,000931 mm**; Grenze jeweils 0,1 mm. Keine Fonts oder eingebetteten Bilder in den geprüften Vektor-PDFs.

Originalpfade, Löcher und Maße wurden gegen die aktuelle `geometrie.json` verglichen. Quellzeichnung SHA256 `d5a021410ec2cb920496adb119e5d32d933f97a71092a42db1986b721bca53b1`; Kataloggeometrie SHA256 `0dd8cfcf31131281fe7c56baabbd6dd3a5b8858537f783a5452e7e080bbc3baa`. Maße/PDFs liegen im Unterordner `produktion/`. Große lokale Review-/Gravurarchive sind über Messbericht-Prüfsummen und Testskript reproduzierbar; die kleinen geprüften PDF-Ausgaben sind versioniert.

## Reviewkorrekturen und finaler Build

Der einmalige Reviewer fand zwei P2-Fehler: Rückseitenobjekte wurden gegen die Frontkontur validiert; beim Seitenwechsel konnte die Randsperre Objekte der anderen Seite verschieben. Beide sind behoben. Ein expliziter `surfaceObjectIssue`-Vertrag orientiert ursprüngliche Profile genau einmal für Back-Objekte in Kundeneditor, Studio, Werkstatt-Autor und KI-Plan. Bereits orientierte UI-Aufrufe behalten `objectIssue`. Die Randsperre hält Positionsanker je Fläche; Warnungen/Verkleinerung betreffen nur aktive Texte.

UI-Fixlauf **22/22**, Kern-Fixläufe zusammen **50 eindeutige Fälle**; darin 19 zuvor gezählte Importfälle, daher nicht doppelt in der obigen Summe. Die sechs neuen Kernfälle umfassen einen eingefrorenen Rückseiten-Review bis `acrylicArtwork`. Kein zweites unabhängiges Review wurde behauptet.

Rein lesender Nachweis: **735 konvertierte Katalogvorlagen / 2.404 Objekte, alle Front**; jeder neue Wrapper-Prüfwert entspricht exakt dem bisherigen Aufruf, keine fehlenden Schriften oder Konvertierungsfehler. Deshalb bleibt der vollständige B-Dry-run nach dieser Rückseitenkorrektur anwendbar; gezielte Importtests wurden erneut ausgeführt.

Finaler Build nach sämtlichen Fixes: Exit 0, **84 Module / 9 Styles / 76 geprüfte Ressourcen**; Browserbundle 990.986 Bytes, Gzip 333.316 Bytes. Das ist kein Screenshot-/Bediennachweis. Finaler Quellumfang: **45 Dateien** in `paket-b-source-manifest-final.json`; der vorherige 42-Dateien-Reviewstand und alle Fixlogs sind separat erhalten.

## Vollständiger Import-Probelauf

```text
node --max-old-space-size=6000 scripts/katalog-import.mjs --katalog <Katalogordner> --linie edelstahl-tuerschilder --alle-designs --dry-run --json <Bericht.json>
```

Exit **0**, **175,602 s**; **744 Produkte = 597 neu + 147 gesperrt**, 0 aktualisiert, **7.920 Vorlagen**. Keine fehlenden Schriften, keine fehlgeschlagenen Designkonvertierungen. Die 6000-MB-Option ist der unveränderte A-Vergleichsrahmen; die C-Speicheroptimierung ist hier nicht enthalten.

Alle **624 Nicht-Retro-Produktberichtseinträge sind vollständig JSON-identisch zu A**, ohne Normalisierung. 120 Retro-Positionen: **13 neu planbar**, 107 fachlich gesperrt. Keine allgemeine „Kontur offen“-Sperre mehr.

Verbleibend im gesamten Lauf:
- **130 Preisfälle**: 98 Retro- und 32 Rund-Positionen; weiterhin 12 Retro- und 4 Rund-Grundpreise offen.
- **10 Startdesignfälle**: 8 bisherige Zuordnungen sowie neu sichtbar `6500000 / TR1-V2A-9x6-D15` und `6800000 / TR2-V2A-9x6-D12`. Motive/Spruch passen nicht sicher zur Kontur bzw. Bohrung; Originale wurden nicht verändert.
- **7 Themen ohne passende Konturvorlage**: Hausnummern RT1/RT2, Hundeschilder RT1, Firmenschilder RT1/RT2, Pferdeschilder RT1/RT2. Es wird keine neutrale Ersatzvorlage erfunden.

Vollbericht verlustfrei als Gzip gespeichert. Unkomprimierte SHA256: `44c95cac0de0016f701062a74d6bf7130ca5fe080a5d2f1e69c6a8ddceb8858d`. `--alle-designs` gilt nur für diesen angeforderten Probelauf; keine redaktionelle Designfreigabe wurde gesetzt. Kein `--commit`, ausschließlich In-Memory-Datenbank.

## Katalog

```text
python -I scripts/katalog-contour.test.py
python -I scripts/build-katalog.py --katalog <Katalogordner>
```

Vollständiger Build Exit 0; **11 Familien, 12 Linien, 737 Master** gültig. Hashvergleich über 1.734 Dateien: Quellen, Preise, Designs, IDs, Zeichnungen, PNGs und Kontur-SVGs unverändert. Geändert sind ausschließlich KATALOG.md und 12 regulär neu erzeugte PDF-/Excel-Ableitungen. Der Rückplattenversatz bleibt als eigener Gap erhalten.

## Offene Browser-Abnahme und nächster Schritt

Die Browser-Erweiterung erhielt HTTP 403; danach beendete die Computer-Use-Sicherheitskontrolle die Bedienung, weil sie die aktuelle Windows-Browser-Adresse nicht zuverlässig bestimmen konnte. Keine Umgehung, keine Anpassung des Zugriffsschutzes, kein erfolgreicher Screenshot. Details und konkrete Bedienprüfschritte: [Browserabnahme offen](2026-10-24-paket-b-belege/browser-abnahme-offen.md).

Claude startet die lokale Prüfvorschau, prüft RT1/RT2 9×6 samt Bedienung und ergänzt den Screenshot in PR #12. **Erst danach B als vollständig abgenommen behandeln und beide B-PRs mergen.** Fehlende Preise/Designzuordnungen bleiben eigenständige fachliche Sperren.

Paket C ist separat in [PR #13](https://github.com/Chris83638w/gravuru-2027/pull/13) auf A geprüft. Beim Zusammenführen B-Konturgeometrie/Sperraufhebung sowie C-Streaming/sofortige Prüfsummen/SVG-Skalierung erhalten; anschließend kombinierten Stand gezielt und mit vollständigem Dry-run prüfen. Die C-Zähler 744/584/160 sind A-Basis, die B-Zähler 744/597/147 gelten hier.

Keine Livezugriffe, Deployments, Preisentscheidungen, Import-Commits oder Maschinenaktionen. `productionReady=false` bleibt bestehen; Material-/Maschinenparameter, Probegravur, Bestellbindung und Katalog-Deploy-Key bleiben außerhalb dieses Pakets.
