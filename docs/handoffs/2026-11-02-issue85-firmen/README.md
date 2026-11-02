# Issue 85 · Firmen- und Praxisschilder

Codex, 02.11.2026. Basis: Code-main `06987af`, Katalog-main `fcb7550ba`. Aufgabenbranch in beiden Repos: `dev/issue85-firmen-20261102`. Auftrag: [Issue 85, Nachricht 1](https://github.com/Chris83638w/gravuru-2027/issues/85), Abgleich mit [Issue 62](https://github.com/Chris83638w/gravuru-2027/issues/62). Verbindlich: [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md), einschließlich Ergänzungen vom 02.11.2026. Nutzer: Firmen/Praxen fortsetzen, alles bearbeitbar, feine Schriften, keine PNGs; feine Ersatzschriften im laufenden Auftrag erlaubt.

## Ergebnis

107 Bestandsdatensätze vollständig zugeordnet. 20 Quellfassungen gehören zu den bereits vorhandenen fünf Gestaltungen D554–D558 mit insgesamt 25 Formfassungen und bleiben unverändert. Die übrigen 87 Quellfassungen ergeben nach Material-Dublettenprüfung 45 eigenständige Kompositionen. Dazu drei neue typografische Entwürfe: Praxis/Rund, Physiotherapie/Oval, Kanzlei/Rechteck.

**48 neue Master, 226 gleichproportionale Größenableitungen, 18 Reihen, 144 offene Materialziele.** Lieferform 2: SVG mit echten `text-N` und getrennten `motiv-N`-Gruppen plus JSON. Keine neuen Raster-Designs, keine Motive in der allgemeinen Bibliothek, keine neuen Schriftdateien. 16 Katalogschriften: 15 Regular-Schnitte (OS/2-Gewicht 400), Montserrat Light (300). Die globale Ersatztabelle bleibt unverändert.

Gleiche D-Nummern bedeuten im Bestand nicht immer dieselbe Gestaltung: A-D0 ist die Zahnarztpraxis, AV2A-D0 Yoga, S-D0 der Schlüsseldienst. V2A-D1 ist eine reine Textvorlage. Diese Unterschiede sind in `zuordnung.json` erhalten. Rechteck und Quadrat werden nicht als Materialdublette zusammengelegt.

## Fachliche Regeln und Quellen

- Issue 85: Edelstahl-Türschilder sowie identische Gravur auf Acryl 3 mm schwarz/anthrazit; ausschließlich vorhandene Familiengrößen. Preise und Familien unverändert. Alle neuen `ziele[].freigabe = null`.
- Design-Master §1/§7: 43 Kompositionen auf gleichem Seitenverhältnis behalten ihre Originalanordnung. Yoga 230×120 erhält eine neue Oval-Komposition, der Schlüsseldienst 200×300 ein eigenständiges Querlayout mit den zwei Originalschlüsseln. Die Familie bietet diese historischen Rechteck-/Hochformate nicht an.
- Nutzerwunsch und Master §2: keine fetten Schriften. Arial wird variiert; fehlende Originalschriften werden nachvollziehbar durch vorhandene feine Schnitte ersetzt. Pro Design 1–3 Schriften. Keine pauschale neue Schriftfreigabe.
- Lesbarkeit: Die vorhandene Firmenfassung D554 dokumentiert mindestens 3 mm tatsächliche Versalhöhe. Dasselbe konservative Prinzip bestimmt hier die kleinste angebotene Familiengröße; kein neuer globaler Validator oder universeller Mindestwert. Alle Texte in den neuen Mastern erreichen mindestens 2,99 mm (Rundungstoleranz). Detailreiche Motive erst ab 54 cm² gemäß Master.
- Motivgeometrie bleibt proportional. Große Füllflächen werden anhand der 15-%-Regel geprüft. Keine neuen freien Motive gezeichnet. Beispielkontakte sind erfunden; Originaldateien bleiben unverändert.
- Issue 85 / Master §7: Start ohne Befestigung. Die bereits in PR 86 vorgeschlagene kleine K00-Voreinstellung ist auf aktuellem main in Editor und Zielvorschau erneut angewendet; gebohrte Alternativen bleiben verfügbar, gebohrte-only Familien behalten ihre bisherige Vorgabe. Kein paralleler Renderer.

## Sichtkorrekturen

Die beiden D3-Trennlinien sind geschlossene, dünne Vektorkonturen mit echter Höhe statt nicht skalierbarer Nullhöhen-Objekte. Bei den beiden Reisebüro-D4-Fassungen wurde die im Bestands-JSON fehlerhafte negative X-Position der Fußzeile korrigiert. Beim neu aufgebauten Schlüsseldienst liegt die Überschrift oberhalb der Schlüssel und überlappt sie nicht.

D6: „Montag“ und „Sprechzeiten:“ aus Schriftkonturen als echte Textfelder wiederhergestellt. D9/D26: Telefon-Konturen als editierbare Beispielzeile ersetzt. Originalmotive behalten ihre Konturen, Farbe nur gravurgerecht einfarbig.

## Prüfnachweise

- 35 gezielte bestehende/ergänzte Tests grün: 20 Design-Editor-Tests, 15 Zielvorschau-Tests. Deckt Öffnen, Speichern/Neuladen, Skalierung, konkurrierende Änderungen, Rechte, Freigaben und Befestigungsvorgaben ab.
- Datenprüfung: 107 eindeutige Zuordnungen, 48 Master, 226 Ableitungen, keine Kennungskollision, ausschließlich echte Texte/Vektoren, gültige Katalogschriften, 1–3 Fonts, maximal 20 Editorobjekte, neue Freigaben null.
- [Native Zielprüfung](zielpruefung.json): **822 Größenprüfungen**, 144 Materialziele, **kein „passt nicht“**. 102 Ziele „passt“, 42 „prüfen“: bestehende Feinlinien-/Motivkonturhinweise und optionale Bohrlochhinweise. Die ältere 0,5-mm-Warnschwelle wird nicht still deaktiviert; Master erlaubt feine Linien um 0,3 mm. Keine Produktionsfreigabe daraus abgeleitet.
- [Editorprüfung](editor-pruefung.json): alle 48 Master geöffnet; **308 Texte und 75 Motivgruppen** als native bewegliche, skalierbare und löschbare Objekte; Textinhalt bearbeitbar. Browserprobe Yoga: Motivbreite 43,08 → 45 mm, Höhe proportional 46,56 → 48,633 mm; rückgängig. Name „Lena Sommer“ → „Lena Winter“ sichtbar aktualisiert; anschließend ausdrücklich verworfen. Geprüfter Katalogstand unverändert. Runde Praxis mit Montserrat Light direkt geöffnet.
- Vier vollständige Vergleichsseiten visuell geprüft, zusätzlich Acryl schwarz und anthrazit. JPG-Nachweise unter 0,6 MB pro Bild. Kein Kontaktbogen, ZIP oder Rasterbild im Katalog-Repo.
- [Flächenmessung aller Kontakt-JPGs](flaechennutzung.md): 48/48 Zielplatten erkannt. 31 erfüllen sämtliche Richtwerte, 17 begründete Ausnahmen aus unveränderten Corel-Anordnungen. **Alle fünf frei neu bzw. für ein anderes Format aufgebauten Kompositionen erfüllen die Richtwerte.** Die reine Textvorlage D1/Quadrat (17 % Gestaltungsrahmen) und Webdesign D14/Quadrat (−14,6 % vertikal) bleiben ausdrücklich zur Einzelabnahme; §1/§7 fordert die Beibehaltung gleichproportionaler Originalanordnungen.
- Vollständiger `build-katalog.py` mit **15 gültigen Familien**, PDF- und Excel-Erzeugung bestanden (PYTHONUTF8=1). Erzeugte Familienübersichten wurden auf den Ausgangsstand zurückgesetzt, da dieses Paket keine Familien ändert; keine unbeteiligten PDF-/Excel-/Konturdifferenzen aufgenommen. Erstlauf ohne vererbtes UTF-8 scheiterte an Windows-Konsolenausgaben der Unterprozesse; mit UTF-8 vollständig wiederholt.

## Bilder und genaue Gestaltungstabelle

[Vergleich 1](vergleich-1.jpg) · [Vergleich 2](vergleich-2.jpg) · [Vergleich 3](vergleich-3.jpg) · [Vergleich 4](vergleich-4.jpg) · [Acryl schwarz](acryl-schwarz.jpg) · [Rundes Praxisschild im Editor](editor-praxis-rund.jpg)

[48 Designs: Quelle, Modus, Fonts und Abweichungen](designs.md). Messbögen: [1](messung-1.jpg), [2](messung-2.jpg), [3](messung-3.jpg), [4](messung-4.jpg). Die historische linke SVG-Vorlage kann fehlende Originalfonts als Browserersatz zeigen. Rechts steht immer die echte native Zielvorschau mit tatsächlichen Katalogglyphen.

## Lokal öffnen und reproduzieren

[Kontaktbogen](http://127.0.0.1:8975/firmen-aktuell/kontaktbogen.html#seite-4) · [Rundes Praxisschild bearbeiten](http://127.0.0.1:8979/werkstatt/designs/bearbeiten/?katalogLinie=edelstahl-tuerschilder&katalogReihe=firmen-fs-a-85x85-rund&katalogDesign=FS-A-8.5x8.5-D27). Im Kontaktbogen Material/Form wählen und „Ansehen & bearbeiten“ öffnen. Lokale Prozesse müssen laufen.

```text
python scripts/design-pruefung/firmen-inventory.py --katalog <Katalog> --out <Nachweise>
python scripts/design-pruefung/firmen-transfer.py --katalog <Katalog>
python scripts/design-pruefung/firmen-derive.py --katalog <Katalog>
python scripts/design-pruefung/firmen-check.py --katalog <Katalog>
node app/configurator/variant-m/server.mjs --port=8979 --katalog=<Katalog>
node scripts/design-pruefung/firmen-proof.mjs --katalog=<Katalog> --out=<Nachweise> --url=http://127.0.0.1:8979
node scripts/design-pruefung/firmen-editor-check.mjs <Katalog> <editor-pruefung.json>
python scripts/design-pruefung/firmen-report.py --katalog <Katalog> --proof <Nachweise>
python scripts/build-katalog.py --katalog <Katalog>
```

Windows: Python mit FontTools/Pillow/Numpy/Scipy, `PYTHONUTF8=1`; `GRAVURU_PYTHON` auf denselben Interpreter, Poppler im PATH. Die lokale Proof-Cache enthält komplette native Antworten und gehört nicht ins Repo. Bei Rendereränderung frischen Proof-Ausgabeordner verwenden; bei Datenänderung werden betroffene Antworten automatisch neu berechnet. Transfer/Derive sind erstmalige, deterministische Erzeuger dieses Auftrags; nach manueller Editorpflege nicht ungeprüft erneut ausführen.

**Genau nächster Schritt:** Claude/Chris prüft die 48 Entwürfe und die dokumentierten Original-Ausnahmen, danach explizite Freigaben je Materialziel. Dieses Paket wird als zwei Draft-PRs übergeben. Kein Merge, kein Import, nichts live. Hausnummern aus Issue 85 sind ein eigenes Folgepaket; vorherige Hinweis-/Rundpakete werden nicht verändert.
