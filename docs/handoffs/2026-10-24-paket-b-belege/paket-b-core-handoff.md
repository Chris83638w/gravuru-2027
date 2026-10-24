# Paket B – Kerngeometrie und Import

Stand: lokale B-Arbeitskopie; CodeFreeze. Vollständiger Import-Probelauf erfolgreich: Exit 0, 175,602 s. Finale 20 Code-/Test-/Fixture-Dateien mit SHA256 stehen in paket-b-core-files.json. Keine Remote-Schreibzugriffe durch diesen Agenten.

## Vertrag und Verhalten

Original outlinePath bleibt in Millimetern erhalten; shape=contour, gewählte holes mit diameter, safeMarginMm und holeKeepoutMm laufen durch Familie, Produktmodell und Editorvertrag. Der gemeinsame Helper enthält exakten Parser, analytische Bounds, Spiegelung und normalisierte Befehle. Die innere Fläche wird aus Originalpfad, Randabstand und Bohrschutz maskiert. Zulässigkeitsprüfung kontrolliert Polygonkanten einschließlich konkaver Einschnitte und Bohrkreise; adaptive Polylinientoleranz 0,002 mm, konservative Sicherheitsreserve. Produktionskontur wird nicht durch die Polylinie ersetzt.

Retro-Quellgrößen aus sizesOpen werden ausschließlich auf bereits vorhandene RT1-/RT2-Größen abgebildet. Retro 2 90,6 × 61,3 → 90 × 60 wird proportional mit Faktor 60/61,3 zentriert, nicht verzerrt. Motivressourcen erhalten nur Maßskalierung; die Zentrierung liegt am Objekt, nicht doppelt im viewBox.

Nach vollständigem Produktionsnachweis sind die beiden A-Kontursperren aufgehoben. Fehlende Konturvorlagen erzeugen keinen neutralen Ersatz. Preise und fehlende Quellstartdesigns bleiben gesperrt. Voruntersuchung benannte zusätzlich 6500000/TR1-D15 und 6800000/TR2-D12 als nicht passende Quellgestaltungen; sie wurden nicht umgezeichnet.

## Geprüfte Testblöcke

Die folgenden Nachweise stammen aus tatsächlich ausgeführten Tool-Läufen. Es wurde keine rohe Logdatei nachgebaut.

- node --test app/workshop/product-families.test.mjs app/workshop/contour-path.test.mjs app/platform/sources/app/shared/models/contour-geometry.test.mjs: ursprünglicher Block 29/30 erfolgreich; ein HTTP-Test scheiterte ausschließlich an localhost EACCES. Damals hatte shared 6 Tests.
- node --test app/platform/sources/app/shared/models/contour-geometry.test.mjs: nach Ergänzung der Commands-/Nearest-Schnittstelle 7/7 erfolgreich. Damit umfasst der aktuelle Block 18 + 6 + 7 = 31 eindeutige Tests.
- node --test app/workshop/contour-contract.test.mjs: 3/3 erfolgreich, echte RT1-/RT2-Quellen und unveränderte Rechteckpolitik.
- node --test app/workshop/acrylic-artwork.test.mjs app/workshop/contour-production.test.mjs: final 5/5 erfolgreich, 167,454 s. Produktions-Test enthält 12 unabhängige Messfälle; Details in paket-b-production/validation.md und measurements.json.
- node --test app/workshop/katalog-convert.test.mjs app/workshop/katalog-import.test.mjs: final 19/19 erfolgreich, 8,476 s; nach Entfernen der A-Sperren.
- Root hat ausschließlich den noch offenen family-HTTP-Fall nachgeholt: 1/1 erfolgreich, Original-Log paket-b-family-http-test.log. Somit ist der oben genannte 31er-Block vollständig belegt.

Python für Produktionsprüfung: GRAVURU_PYTHON=work/pyenv/Scripts/python.exe, PYTHONPATH=work/pydeps; svgpathtools 1.7.2 und shapely 2.1.2. TEMP/TMP=work/test-tmp, PYTHONUTF8=1.

## Grenzen

Keine echte Browser-Sichtabnahme: Root meldet Sicherheitsstopp und keine weiteren Browserversuche. Keine Shop-, Maschinen- oder Import-Commit-Freigabe; productionReady=false. Rückplattenversatz einer freien Kontur bleibt offen. Browser-Prüfdruck nur 0 mm Überdruck laut Root; Serverausgabe bleibt separate native Fertigungsstrecke. Offene Quellpreise und ungeeignete Designs wurden nicht verändert. C-Speicheroptimierung ist nicht in diesen B-Code eingeflossen.

## Vollständiger B-Import-Probelauf

Aufruf: node --max-old-space-size=6000 scripts/katalog-import.mjs --katalog ../gravuru-katalog --linie edelstahl-tuerschilder --alle-designs --dry-run --json ../reports/paket-b-import-final.json. Originalausgabe in paket-b-import-final.log, Laufzeit/Exitcode in paket-b-import-final-run.json. Die 6000-MB-Option ist der unveränderte Vergleichsrahmen zu A; C bleibt separat.

Ergebnis: Exit 0, 175,602213 s; 744 Produkte, 597 neu, 147 gesperrt, 0 aktualisiert; 7920 Vorlagen. Sperrgründe: 130 offene Preise, 10 Startdesigns (8 bestehende + 6500000/TR1-D15 + 6800000/TR2-D12), 7 Themen ohne passende Konturvorlage. Letztere: Hausnummern RT1/RT2, Hundeschilder RT1, Firmenschilder RT1/RT2, Pferdeschilder RT1/RT2.

120 Retro-Positionen: 13 neu planbar, 107 gesperrt (98 Preise + 2 Startdesigns + 7 fehlende Vorlagen). Keine allgemeine Kontur-offen-Sperre. 624 bestehende Nicht-Retro-Positionen: 584 neu + 40 gesperrt; kompletter Vergleich der Produktberichtseinträge mit A: identisch. Keine fehlenden Schriften in Produkten oder Schrift-Sets, designs.failed leer. --alle-designs übergeht die redaktionelle Designfreigabe nur für diesen ausdrücklich angeforderten Probelauf. Keine Datenbank-Schreibfreigabe; Skript bestätigt :memory: und „nichts geschrieben“.

Bericht-SHA256: 44c95cac0de0016f701062a74d6bf7130ca5fe080a5d2f1e69c6a8ddceb8858d
