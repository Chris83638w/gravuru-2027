# Vorhandene Schiefer-Designs an die neuen Tafeln anbinden

Auftrag: [Claude 6626324410](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6626324410), keine Neugestaltung gemäß 6626406251. [6626733037](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6626733037) nimmt `schiefer-menschen-*` vollständig aus diesem Paket: Diese Reihen bearbeitet Claude Schiefer. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt für Vergleich und Prüfung; seine Neugestaltungsregel wird hier ausdrücklich durch den Auftrag ausgeschlossen.

## Regeln und Quellen

- Ausschließlich bestehende Formatreihen, Formen und Maße aus den vier Schieferfamilien; Zuordnung nach dem ausdrücklichen Raster in 6626324410. Die 3:1-Reihe darf proportional, ohne Verzerrung, auf 30×10, 38×13 und 56×18 eingepasst werden. Kein allgemeines Öffnen anderer Seitenverhältnisse.
- Naturherz, geschnittenes Herz, schiefes Herz, Stern, Knochen und Kreuz werden über Formatreihe/Gruppe der echten Quellkontur zugeordnet. Die Formprüfung anderer Materialien bleibt unverändert. Kreuz ist für Claudes kommende Reihe vorbereitet, hier entstehen keine Kreuz-Designs.
- Neue Familienziele haben `freigabe: null`. Bestehende 249 Dateien einschließlich Freigaben bleiben unverändert. Fotoverbot der Premiumtafeln bleibt verbindlich; Fotos werden nicht entfernt.
- Gruppen Tiere, Menschen, Sternenkinder, Familie, Monogramme werden aus der vorhandenen Zielgruppe als native Designfilter übernommen. Bestehender zusätzlicher Hunde-Filter bleibt.

## Ergebnis und Reproduktion

Katalogbasis: `43fe1f23d17fa54b94f5ab4c5f9754dab8b18323`. Von 3.166 Quellen: 2.695 neu zugeordnet, 249 bestehend unverändert, 120 an Claude übergeben/unverändert, 102 nicht zuordenbar. 3.118 neue Familienziele, 5.658 Größen-Zuordnungen; keine Freigabe gesetzt. Die 102 Fälle betreffen Kordel 15×9 und 20×15 (je 51). Weitere 63 bereits zugeordnete Quellen zeigen nur auf Acryl; sie wurden gemäß Auftrag nicht erweitert und sind in #85 zur Klärung gemeldet.

```text
node scripts/map-slate-design-targets.mjs --katalog <Katalog> --write
node scripts/audit-slate-design-targets.mjs --katalog <Katalog> --base 43fe1f23d17fa54b94f5ab4c5f9754dab8b18323
node scripts/plan-slate-review.mjs --katalog <Katalog> --out <Plan.json>
node scripts/render-vorlagen.mjs --katalog <Katalog> --familie schiefer-tafeln-<natur|premium|geschnitten|kordel> --plan <Plan.json> --out <Arbeitsordner>/slate-design-render-<Art> --png --bogen --breite 700
python scripts/measure-slate-review.py --index <Renderordner>/index.json --out <Katalog>/auftraege/2026-11-04-schiefer-designziele/<Art>/flaechenpruefung.json
node scripts/finalize-slate-review.mjs --katalog <Katalog> --work <Arbeitsordner> --family <Art>
python scripts/compress-slate-sheets.py --katalog <Katalog>
node scripts/summarize-slate-review.mjs --katalog <Katalog>
python scripts/build-katalog.py --katalog <Katalog>
```

Der Wiederholungslauf ist unverändert; fremd geänderte Dateien werden anhand der Prüfsumme abgelehnt. Audit gegen Git-Quellen prüft sämtliche 3.166 Metadaten; nur Ziele und Größen wurden ergänzt (JSON-Neuschreibung normalisiert negative Null und Zeilenenden). Keine SVG-, Foto- oder Motivänderung.

## Validierung und Grenzen

Gezielte Tests: 78/78 für Zielauflösung, Konturen, Vorschau, Konvertierung und Quelle; anschließend 20/20 einschließlich neuem Kreuz-Test und Vorschau. Zusätzlich 9/9 Schiefer-Produkttests mit Python-Fotoprüfung. Ein erster Lauf ohne eingerichteten Python-Pfad scheiterte bei der Foto-Prüfung; mit dem vorhandenen Laufzeitsystem ist dieser Test grün.

Lokale erneute Produktvorbereitung: **48 Produkte, 268 bestehende Design-Zuordnungen, 0 ausgeschlossene freigegebene Designs**. Unfreigegebene neue Ziele erscheinen nicht im Kundenprodukt. Nach einer späteren Freigabe kann die Vorbereitung die ausdrücklich erlaubten Größen proportional einpassen; Geometrie, Fotoverfügbarkeit und Designprüfung bleiben maßgeblich. Katalogbau: 20 gültige Familien.

Kontaktbögen zeigen Original und echte Zielvorschau je Format/Gruppe/Größe. Bildmessung nutzt `flaeche-messen.py` unverändert. Schiefertextur kann dabei als Gravur erkannt werden; unauffällige Werte sind kein Qualitätsnachweis. Vorhandene Quellmesswerte und Auffälligkeiten werden ergänzend ausgewiesen. Nur Chris gibt die Bögen frei. Grenzfälle werden nicht umgestaltet.

Endstand: 5.926 Zielprüfungen für 2.881 Designs auf 296 Kontaktbögen. 1.745 technisch passend, 2.823 zur Sichtprüfung, 722 nicht passend und 636 ohne gültige Zielvorschau (522 Premium-Fotoausschlüsse; 114 Fälle der vorhandenen Schriftgrößengrenze 1–100 mm). Zusätzliche Lücke: Kordel 30×10. Monogramme werden aus dem vorhandenen Thema/der Unterkategorie erkannt, da ihre Quell-Zielgruppe „Allgemein“ lautet; dazu gezielter Test 6/6. WebP-Kontaktbögen sind gegenüber den Renderer-PNGs pixelidentisch geprüft.

Dieses Paket enthält keine Live-Änderung. Es baut auf Code-PR #166 / Katalog-PR #171 auf und ersetzt deren Abnahme nicht. Die separate Veröffentlichungskette folgt 6626148423; der Excel-Konflikt #162 darf seit 6626528187 durch Neubau auf dem zusammengeführten Stand gelöst werden und wird separat dokumentiert.

## Abschluss und Merge-Vorbereitung

Katalog [PR #176](https://github.com/Chris83638w/gravuru-katalog./pull/176) vollständig bei `c0cffc85e0f703fa06e5e6cae61745aec47d5a24`, Git-Baum `425759262e44995a173e1135cb602b463119b177` exakt gleich dem auditierten lokalen Ergebnis. Elf kleine Upload-Commits wegen GitHub-Verbindungs-/Serverfehlern, keine Inhaltsänderung und kein Force-Push. [Alle Bögen und Größen](https://github.com/Chris83638w/gravuru-katalog./blob/c0cffc85e0f703fa06e5e6cae61745aec47d5a24/auftraege/2026-11-04-schiefer-designziele/README.md).

[Claude 6627912053](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6627912053): Tiere dürfen Stern. Alle 46 `schiefer-tiere-stern` bereits auf `GT-SG-ST-200X190P6` zugeordnet; keine automatische Freigabe. Knochen bleibt Hunde. Keine neuen Designbilder angefertigt.

[Claude 6627843448](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6627843448): auch #165 per Neubau lösen. Katalog [PR #179](https://github.com/Chris83638w/gravuru-katalog./pull/179), Kopf `d6dd77d2f64462a9dbe7456926854da5d2b1563e`, gegen #165 `ad3ecde`; tatsächlicher Git-Remote-main nach Fetch/ls-remote `3c6051f`. Vollbau 16 gültige Familien, Premium 12 mm in JSON und Excel (Familien/Materialien), keine Quellenänderung. Nachweisordner `auftraege/2026-11-04-schiefer-premium-excelkonflikt/`. Erster Fix für #162: [PR #173](https://github.com/Chris83638w/gravuru-katalog./pull/173), `3919d12`.

Erneute GitHub-Einzelprüfung: Code #160/#166/#170 sowie Katalog #169/#171/#173/#176/#179 konfliktfrei; #162/#165 weiterhin konfliktbehaftet, da ihre Fix-PRs noch nicht übernommen sind. Vorgesehene Reihenfolge nach Review: #173 in Katalog #162, #179 in Katalog #165; Code #160 → #166 → #170; Katalog #162 → #165 → #169 → #171 → #176. Nach jedem Schritt neu prüfen; zusammengeführte erzeugte Excel bei erneutem Konflikt neu bauen. Einzelne mergeable-Zustände belegen noch keine konfliktfreie gesamte Reihe. Mikas Produktgruppenplan und Claudes neue Menschen-/Kreuzdesigns bleiben getrennte Pakete.

Vor Veröffentlichung weiterhin ausstehend: Claude-Review beider Excel-Fixes und der neuen Design-Codeänderung, Designfreigaben durch Chris, Vollauf auf gemeinsamem Stand und echter Desktop-/Mobilweg bis Warenkorb. Kommentar 6627843448 nennt zusätzlich blaue Haarlinie `#0000FF`, 0,076 mm und Löcher gemäß Register 4.64. Im erneut abgerufenen Register aus PR #158 fehlen 4.61/4.63/4.64/4.65/7.24 noch; die genaue neuere Quellenfassung wird in #85 angefordert. Diese Produktionsvorgabe ist durch das Zuordnungs-/Excelpaket nicht als umgesetzt oder abgenommen nachgewiesen. Kein main-Merge, keine Live-Änderung dieses Pakets.
