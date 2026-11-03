# Issue 139: bestehende Massenlauf-Pipeline erweitert

Codex/Astra 1, 03.11.2026. Dritter Schritt aus [Claudes Auftrag](https://github.com/Chris83638w/gravuru-2027/issues/139#issuecomment-6597574311), nach Bereitstellung/Messung und Ausführungsmodulen. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt; keine Designs, Motivpfade, Schriften oder Freigaben geändert.

## Quellen und Regeln

- Code-Grundlage main 04d6f6bc0e1242f8b8b37f43fa2c050a3126bcfa. Claudes vorhandene Pipeline unverändert übernommen und gezielt erweitert: Branch dev/shop-schnitt-massenlauf-20261102-claude / 8990b7142addc652f8fc34a21274d0c83e6148de.
- Katalog main 5171686f6341f6bfe1c354f5a25a626d8cb37ae2 plus exakt Claudes Liniendatei aus b6f5a829803a569fdfb432f32860d62f49cd6c23 (SHA-256 d0e21e11c1ccc33e5744a292bc50dbaca1aa2c50511290c546bd1b9d794654e6). Der alte Branch enthält weitere historische Designstände; diese wurden nicht zurückkopiert. Separate additive Katalog-Integration der einen Linie.
- Grabstecker: Form × Zielgruppe, Größe wählbar, nur deren Designs, Start in mittlerer Größe; Quelle Chris-Zitate 02.11. im ursprünglichen [Ablauf](2026-11-02-shop-schnitt-massenlauf.md). Infinity ausdrücklich zurückgestellt.
- Türschilder: feste Form/Größe × Unterkategorie × zwei verschiedene Startdesigns. Schwarz/Anthrazit sind Varianten desselben Acrylprodukts. Preise/Bestellvarianten ausschließlich aus dem vorhandenen nativen Planer; kein eigener Preisrechner.

## Ergebnis, keine Upload-Zählung

| Linie | Unterkategorien | gesamte Produktplanung | vollständig erzeugte native Konfigurationen |
|---|---:|---:|---:|
| Grabstecker Edelstahl | 1 | 91 | 91 |
| Türschilder Edelstahl | 11 | 1.760 | 5 |
| Türschilder Acryl | 7 | 1.120 | 5 |

**101 native Konfigurationen und dazu 101 ProductSet-DRAFT-Dateien tatsächlich erzeugt.** Alle Preise/Varianten, eindeutige Optionskombinationen, ungetrackter Bestand, feste Türschildgröße, Acryl-Farbpaare und Grabstecker-Zielgruppen/Größen geprüft. 0 blockierte Konfigurationen, 0 doppelte Handles. Die 2.880 Türschildzeilen sind ein Plan, keine 2.880 fertigen Konfigurationen oder Shopartikel. Je Unterkategorie erster Lauf 100, weitere 60 über offset; native Stichproben mit limit=5.

[Prüfmanifest aller 101 Dateien mit SHA-256](2026-11-03-issue139-massenlauf/pruefung.json), [Grabstecker samt vollständiger Handle-Liste](2026-11-03-issue139-massenlauf/grabstecker.json), [Türschildplanung mit Handles und Zählern](2026-11-03-issue139-massenlauf/tuerschilder.json), [15 ProductSet-Beispieldateien](2026-11-03-issue139-massenlauf/beispiele). Große Konfigurationen mit eingebetteten Schriften bleiben im Arbeitslauf; sie sind anhand von Quelle, Befehl und Hash reproduzierbar.

## Erweiterungen am selben Skript

- --limit=1…100 und --offset, Folgelauf im Bericht; bestehende Ausgabe wird nie überschrieben. Fehler je Produkt dokumentiert, restlicher Lauf fortgesetzt.
- Zwei unterschiedliche Startdesigns auch bei Namen ohne Zielgruppen-Segment; keine Verdoppelung der Acryl-Farben in einzelne Produkte.
- Freigaben und passende Größen über vorhandenes assignTargetSeries/approvedForFamily. Katalog kann einmal eingelesen und für alle Unterkategorien verwendet werden. Vergleich zum vollständigen Grabsteckerlauf: alle 91 Handles, Schnitte und Preise exakt gleich.
- Varianten ohne verfügbares Design nicht exportieren; mindestens eine gültige Shopify-Option erhalten. Variantenbindung folgt derselben gefilterten Reihenfolge.
- Windows-Aufruf mit pathToFileURL korrigiert; vorher blieb der direkte Skriptaufruf ohne Ergebnis. Keine neue Uploadstrecke.

## Wiederholung

Aus dem Code-Repo, Katalogpfad und neuen Ausgabeordner einsetzen; GRAVURU_PYTHON auf vorhandene Python-Umgebung mit fontTools setzen:

```sh
node scripts/shop-schnitt-plan.mjs --katalog=<katalog> --linie=grabstecker-edelstahl --unterkategorie=andenkenschilder --form --ohne-formen=GS-INFINITY --limit=100 --output=<neuer-ordner>
node scripts/shop-schnitt-plan.mjs --katalog=<katalog> --linie=edelstahl-tuerschilder --unterkategorie=familienschilder --je=anzahl --anzahl=2 --limit=100 --offset=0 --output=<neuer-ordner>
node scripts/shop-schnitt-plan.mjs --katalog=<katalog> --linie=acryl-tuerschilder --unterkategorie=familienschilder --je=anzahl --anzahl=2 --limit=100 --offset=100 --output=<neuer-ordner>
```

Für reine Planung --nur-plan, für 5 native Beispiele --limit=5. Für alle Unterkategorien dieselbe run-Funktion mit einmal geöffnetem Katalog und den IDs aus line.subcategories verwenden. Freigegebene individuelle Texte über --texte=<datei> einsetzen. Renderer und anschließende Import-/DRAFT-/Bindungsschritte bleiben Claudes ursprünglicher Ablauf.

## Prüfungen

- Linux-Gesamtlauf node --test --test-concurrency=2: 2.307 Tests, 2.290 bestanden, 15 zunächst fehlgeschlagen, 2 übersprungen. Keine pauschale Behauptung eines fehlerfreien Erstlaufs.
- Ein veralteter UI-Quellanker auf executionOptionGroups angepasst; gleiche fünf Befestigungen, Preise, Klickhandlung und barrierefreie Alternative weiter geprüft.
- Fünf Händlerfälle: richtige vorhandene Python-Testumgebung explizit über GRAVURU_MERCHANT_TEST_PYTHON. Neun CDR-Fälle: PermissionError bei Ausführung der synthetischen Hilfsdatei unter /tmp; TMPDIR auf privates Testverzeichnis gesetzt. Keine Produktcode- oder Host-Sicherheitseinstellung dafür geändert.
- Betroffene Dateien in Nachprüfungen vollständig bestanden: 24 UI-, 10 Händler-, 23 CDR- und 7 Pipeline-Tests (64 verschiedene Tests). Rohprotokolle oben im Nachweisordner. Pipeline auch Windows 7/7.
- Echter Browsernachweis der Ausführungen samt Größenwechsel/Fotobereich und Pakettrennung im [Schritt-2-Bericht](2026-11-03-issue139-ausfuehrungen.md).

## Vor Veröffentlichung noch erforderlich

Die Serien verwenden gekennzeichnete Entwurfstexte. Grabstecker: 4.095 Beschreibungspaare mit gemeinsamen Fünfwortfolgen, 0 identische Titel/SEO-Felder. Türschilder: 12.720 Beschreibungspaare je Unterkategorie; durch Kürzung 195 (Stahl) bzw. 128 (Acryl) Gruppen gleicher Titel/SEO-Felder. Das ist **keine Textabnahme** und wird nicht als bestanden ausgegeben. Individuelle Texte, fertige Hauptbilder, native DB-Imports/Variantenbindungen und fünf echte Shop-/Warenkorb-Stichproben nach Claudes Ablauf fehlen noch; erst danach seine Stichprobe und ACTIVE/Navigation.

Module in PR #154 noch zur Prüfung. Bei Gedenktafel 22×14 zusätzlich historische Zubehör-/Fotopreise gegenüber Preisdatei vom 02.11., Vorlagenlimit 104/100 und Originalspruch >80 Zeichen offen (Details Schritt 2). Grabstecker-Linie muss in Katalog-main. PR #153 ist live; Zeitziele noch nicht erfüllt (Handy Stahl/Acryl/AOSU 11,9/9,5/9,6 s). Keine neuen Produkte hochgeladen: **dieser Schritt neu 0; bisherige Zählung 2 neu / 8 überarbeitet / 10 live unverändert.**

Genau nächster Schritt: Claude prüft Module/Pipeline und additive Katalog-Linie anhand der verlinkten Kandidaten. Danach individuelle Serientexte/Hauptbilder vervollständigen, die vorhandene Skriptstrecke für DRAFT-Import/Bindung und fünf Shop-Stichproben fortsetzen; die Freigabe von PR #153 nicht auf die neuen Moduländerungen übertragen.
