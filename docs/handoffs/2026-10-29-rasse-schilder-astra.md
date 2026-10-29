# Rasse-Schilder – Musterauftrag, Codex/Astra, 29.10.2026

## Quellen und fachliche Regeln vor der Umsetzung

- Auftrag: [Issue 61, Nachricht 1](https://github.com/Chris83638w/gravuru-2027/issues/61#issuecomment-6503468259), vollständige Übergabe `docs/handoffs/2026-10-29-rasse-schilder-auftrag.md` auf `dev/rasse-schilder-20261029-claude`; [Nachricht 2](https://github.com/Chris83638w/gravuru-2027/issues/61#issuecomment-6503583888) ergänzt eigene Katzenporträts.
- Aktuelle Nutzervorgabe in diesem Chat: **„nein, je größe und rasse 12 verschiedene designs“**. Daher zwölf verschiedene Gestaltungen pro Rasse, in jeder beauftragten Größe/Form. Keine bloßen Textwechsel als zwölf Entwürfe zählen.
- Musterstufe: Labrador, Golden Retriever, Deutscher Schäferhund, Dackel, Französische Bulldogge. **Aktuelle Nutzervorgabe auf die Frage nach drei Katzenmustern: „weit aus mehr“.** Deshalb auf 25 tatsächlich ausgearbeitete Katzenrassen erweitert. Die Bibliotheksauswahl und Stilfreigabe bleiben bei Chris; weitere Hunderassen folgen nach Musterfreigabe.
- Hunde: detaillierte Originalvektoren aus `gravuru-katalog./motive/hunderassen/`; Herkunft und gewählte Variante nennen. Katzen: eigene Zeichnungen, keine fremden Fotos/Stockbilder abpausen.
- Edelstahlgravur, einfarbig; Größen/Konturen aus `serien/edelstahl-tuerschilder-2027.json`. Hunde: Oval 3:2 und 15:8, Rechteck eckig/abgerundet 3:2, nur die Größen der Übergabe. Katzenmuster zunächst Oval/Rechteck 3:2 gemäß Nachricht 2.
- Texte: Hunde „Hier wacht …“ und „Achtung …“, Katzen „Hier wohnt …“ und „Achtung …“. Weitere Schildarten nur nach Bestätigung. Text bleibt als editierbarer Text im SVG; Motive proportional, löschbar und ersetzbar.
- [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md): vorhandene passende Vorlagen übernehmen oder als starke Referenz; sonst Herkunft „neu“. 1–3 freigegebene Schriften pro Design, Variation innerhalb der Serie. Kontaktbögen aus dem echten lokalen Konfigurator, Quelle daneben. Freigabe bleibt offen.
- Mindestschriftgröße 3 mm: `app/workshop/process-profiles.mjs`, dokumentierte Entscheidung Chris 20.10.2026. **Mindestlinienstärke ist dort null/offen**; keine Maschinenfreigabe oder erfundene Grenze. Numerische Strichmaße als Gestaltungswerte ausweisen; Fertigungsprüfung bleibt offen.
- Keine Preis-, Größen-, Bohrbild-, Kundenbibliotheks- oder Liveänderungen. Neue Katzenmotiventwürfe vor Freigabe bei den Designs und in `motive-eigene/`, nicht in `motive/katzenrassen/` oder `motive/motive.json`. Katalogübernahme nach Chris' Freigabe ist Folgeschritt (Nachricht 2).

## Ergebnis und Prüfbasis

Eigene Branches `dev/rasse-schilder-20261029-astra` in beiden Repositories. Codebasis `2717da599366df8ad8cbdc4645624d236a42ab23`, Katalogbasis `eb4a4c61a411a2b1753cb3ff691551b577c68fe0`. Vor dem Commit gegen den aktuellen Code-main `b5c1e6a` abgeglichen: inzwischen nur zusätzliche Übergabedokumente, keine Überschneidung mit diesen Änderungen. Katalog-main unverändert. D1001–D1360 im ursprünglichen und frisch gelesenen Git-Baum frei.

- **360 Rassenentwürfe**, umgesetzt in **8.100 SVG/JSON-Paaren**: fünf Hunde × 25 Größen/Formen × zwölf = 1.500; 25 Katzen × 22 Größen/Formen × zwölf = 6.600. 675 Kombinationen aus Rasse, Form und Größe enthalten jeweils zwölf unterschiedliche Anordnungs-/Schriftkombinationen.
- Zwölf neue Kompositionen: sechs „Hier wacht/wohnt“, sechs „Achtung“. Je zwei Schriften, insgesamt elf aus der freigegebenen Liste. Text bleibt Text; drei freiwillige, bearbeitbare Felder. Porträt und Zierform bleiben eigenständige Motive. Größenvarianten tragen `varianteVon` und `transfer`.
- Hunde: detaillierte Original-Katalogporträts proportional erhalten. Katzen: 25 eigene ImageGen-Illustrationen, binär mit VTracer vektorisiert. Original-PNG, exakte Prompts und SHA-256 beider Fassungen liegen im Katalogauftrag. Die Vektorisierung ist eine Annäherung; feinste Details benötigen die tatsächliche Laser-/Materialprobe.
- 25 Katzenporträts und sieben eigene Zierformen in `motive-eigene/` registriert. Kundenbibliothek `motive/motive.json` unverändert; sämtliche Design- und Familienfreigaben `null`.
- Vorlagensuche in den Edelstahlreihen: vorhandene „Hier wohnt“-Familien-/Namensschilder (z. B. D7 Segelboot, D25 Haus/Herz) sind keine Rasseporträtvorlagen für diesen Auftrag. Neue D1001–D1360 ausdrücklich als **neu / ohne bestehende Schildvorlage** dokumentiert; Bildquelle jeweils daneben auf den Kontaktbögen.

## Umsetzung im Code

`scripts/build-rasse-schilder.py` erstellt die zwölf Kompositionen in den belegten Größen. `vectorize-rasse-portraits.py` bereitet eigene Originalzeichnungen auf. `document-rasse-schilder.py` registriert Motive und prüft die vollständige Matrix. Die Review-/Capture-/Kontaktbogen-Skripte verwenden den echten Lieferform-2-Konverter und Kundeneditor mit den originalen Familienmaßen, Schriften und Edelstahl-v4-Oberflächen. Der lokale Prüfserver hat keine Datenbank oder schreibende Shopanbindung.

Der Lieferform-2-Konverter sperrte bisher feste Gravurmotive auch gegen Löschen/Ersetzen. Nach Chris' Entscheidung vom 29.10. sind diese Rechte jetzt unabhängig von Verschieben/Skalieren. Hilfsebenen und bestehende Druckrechte bleiben unverändert. Ein eigener Regressionstest prüft diese Grenze.

## Ausgeführte Prüfungen

- `node --test app/workshop/katalog-convert.test.mjs app/workshop/katalog-source.test.mjs app/configurator/variant-m/element-rights.test.mjs`: **40/40 bestanden**.
- `review-rasse-schilder.mjs --validate`: **8.100/8.100 passt**, null Importfehler. Echte Glyphenressourcen, vollständige SVG-Pfade, tatsächliche Zielkontur, korrekte Familiengrößen, Motiv-Lösch-/Ersetzrechte und Datei-Hashes geprüft. Build: 76 geprüfte Ressourcen, 111 Module, 14 Styles.
- `document-rasse-schilder.py`: **675/675** Kombinationen mit zwölf unterschiedlichen Layouts, je drei Textfeldern, Mindestschriftgröße 3 mm, ohne Rasterbilder im SVG; Freigaben offen und SHA-256 konsistent.
- Echte Browserbedienung für Hund/Oval und Katze/Rechteck: Name zu „Maja“ geändert, Porträt gelöscht, Löschung rückgängig; geänderter Name bleibt erhalten; Ersetzrecht aktiv, keine Browserfehler. Dies prüft keine Bestellung.
- Sichtkorrekturen: Bogen um die Ohren erweitert und als native Bézierkurven geliefert; Abstand zwischen Name und unterer Rassezeile in Layout 6/9/12 vergrößert. Nach jeder geometrischen Änderung gesamte Passungsprüfung erneut ausgeführt.
- Vollständiger `build-katalog.py` in isolierter Kopie derselben Stammdaten: **11 PDFs / 33 Seiten, 11 PNGs und Excel mit acht Blättern**, geöffnet/geprüft. KATALOG.md inhaltlich identisch; nur Windows-Zeilenenden unterscheiden sich byteweise. Unveränderte Familienartefakte werden deshalb nicht ersetzt. Die ersten Windows-Läufe scheiterten an fehlenden lokalen Bibliotheken/UTF-8-Einstellung; abschließender Lauf erfolgreich.
- Kontaktbogenprüfung wird im Katalog unter `auftraege/rasse-schilder-20261029/pruefung/` mit pixelgenauen Ausschnitten und Hashes dokumentiert.

## Reproduktion

Voraussetzungen: Node, Python mit `fonttools`, `svgpathtools`, `vtracer`; Playwright und Sharp für Browser-/Kontaktbögen. Die Schriftumwandlung liest `GRAVURU_PYTHON`; zusätzliche Python-Module können über `PYTHONPATH` bereitgestellt werden. Unter Windows `PYTHONIOENCODING=utf-8` setzen. `GRAVURU_BROWSER` kann auf einen vorhandenen Chrome zeigen, `GRAVURU_NODE_MODULES` auf das Verzeichnis installierter Node-Pakete.

```text
python scripts/vectorize-rasse-portraits.py --sources <Original-PNG-und-Prompt-Ordner> --katalog <Katalog>
python scripts/build-rasse-schilder.py --katalog <Katalog>
python scripts/document-rasse-schilder.py --katalog <Katalog>
node scripts/review-rasse-schilder.mjs --katalog=<Katalog> --out=<Prüfstand> --validate
node scripts/review-rasse-schilder.mjs --katalog=<Katalog> --out=<Prüfstand> --port=4317
node scripts/capture-rasse-schilder.mjs --review=<Prüfstand> --out=<Screenshots>
node scripts/contact-rasse-schilder.mjs --katalog=<Katalog> --captures=<Screenshots> --out=<Kontaktbögen>
node scripts/check-rasse-interaction.mjs --url=http://127.0.0.1:4317 --out=<Bediennachweis>
```

Gezielte Sichtkorrekturen können mit `build-rasse-schilder.py --layouts 6,9,12` erneuert werden; anschließend Matrix und Passung erneut prüfen und den lokalen Server mit dem neuen Manifest starten.

## Offene Abnahme und nächster Schritt

Chris prüft die Kontaktbögen und bestätigt Stil, bevorzugte Layouts sowie die endgültige Katzenauswahl. Die übrigen Hunderassen folgen entsprechend Nachricht 1 nach dieser Musterfreigabe. Die 25 Katzen sind ausgearbeitete Vorschläge als Antwort auf „weit aus mehr“, keine veröffentlichte oder fachlich zertifizierte Rassendatenbank. Weitere Schildtexte bleiben offen.

Die verbindliche Mindestlinienstärke für diesen Laser-/Materialstand fehlt (`minStrokeMm: null`). Dafür eine reale Gravurprobe in der kleinsten Größe abnehmen; erst danach Fertigungsfreigabe. `motive/katzenrassen/` und Kundenbibliothek erst nach ausdrücklicher Übernahmefreigabe füllen. Keine Live-, Shopify-, Merge- oder Veröffentlichungsaktion Bestandteil dieses Ergebnisses.

Die Arbeitsumgebung hat keine konfigurierte Commit-Signatur. Die Review-Commits werden transparent als **unsigned, Autor Codex** dokumentiert; die gewünschte signierte Übernahme muss ein Maintainer mit eingerichteter Signatur durchführen. Issue 61 bleibt als Postfach offen.
