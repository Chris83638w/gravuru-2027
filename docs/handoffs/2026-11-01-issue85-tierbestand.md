# Issue 85 · Tierbestand mit vorhandenen Schriften und TSK · 01.11.2026

260 bearbeitbare Fassungen im Katalog: 25 Rechteckmaster, zehn echte Schiefer-Knochenmaster, 15 Originalgrößen, 210 native Größenvarianten. Alle 35 Tierschildquellen zugeordnet; zwei Farb-/Namensvarianten zusammengeführt. Schriftwahl durch Chris ausdrücklich erlaubt. Foto nur Acryl 3 mm, größere Namen bei Bronko/Cooper. Quelle: [Review 6555301953](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6555301953).

68 gezielte Werkstatttests erfolgreich. Alle 260 Fassungen / 580 Ziele nativ geprüft: 544 passt, 26 prüfen, zehn ausschließlich Materialstärke offen. 210 Varianten / 1.000 Elemente erneut eingelesen, maximal 0,004 mm Rundung, genaue Fotomasken erhalten. 99 Master-/Originalgrößen-HTTP-Antworten und zwölf zusätzliche große Materialvorschauen; 15 Kontaktbogenseiten insgesamt und Mobilansichten geprüft. Katalogbau für 14 Familien erfolgreich, 520 Dateihashes dokumentiert.

Die zehn TSK-Konturen bestehen geometrisch, aber die genaue Materialstärke fehlt und bleibt null. Die Bilder sind bis dahin als Konturbelege markiert. Knochen-Grundpreis und Foto-Aufpreis bleiben gemäß Issue offen, alle Freigaben null. Die frühere Acryl-PR-11-Abhängigkeit ist durch main aufgelöst. Alte rechteckige TSK-Studien sind historische Belege und keine aktiven Master.

## Änderungen und Prüfung

- Größenexport behält das bestehende Quellpräfix auch dann, wenn eine andere Bogenreihe zuerst dieselbe Zielgröße verwendet.
- Native Zielauflösung berücksichtigt eigene Größenschlüssel abgeleiteter Acrylfamilien und gemeinsame Geometrie zwischen schwarzer/anthraziter Ausführung. Größenbeschränkungen und Konturvergleich bleiben bindend.
- Native Produktvorschau maskiert auch leere Foto-Platzhalter auf Acryl/Edelstahl mit der Originalkontur; Kreise werden nicht als Rechteck angezeigt.
- Explizite K00-Vorschau aus dem runden Auftrag auf aktuellem main weitergeführt; Bewertung aller zulässigen Befestigungen unverändert.
- Platten-PDF berücksichtigt ausdrücklich bestätigte Ausführung ohne Befestigung; keine neue Befestigungsoption, keine erfundene Stärke.

## Dateien und Reproduktion

Katalog: `designs/tierbestand-*/`, neue Familie `familien/schiefer/schiefer-knochen-23x10.json`, Lieferung `auftraege/issue85-tierbestand-20261101/README.md`. Dort Quellenzuordnung (163 Bestand + zwei neue Designs; 15 Originalgrößen separat), Kontaktbögen, native Prüfungen und 520 Prüfsummen. Unbeteiligte Rasse-/Rund-/Hausnummernarbeiten bleiben getrennt; Issue 85 insgesamt bleibt offen.

1. `python scripts/design-pruefung/tierbestand.py --katalog <Katalog> --out <Entwuerfe>`; Python-Umgebung wie `read-bestand-designs.py`. `GRAVURU_PYTHON` auf diesen Interpreter setzen.
2. `node scripts/design-pruefung/tierbestand-sizes.mjs --katalog=<Katalog> --designs=<Entwuerfe> --out=<separater-Pruefkatalog> --runtime-code=<Code>`; vollständige Git-JSON-Objekte erforderlich. Nie in den Quellkatalog generieren.
3. `node scripts/design-pruefung/tierbestand-size-check.mjs --katalog=<Pruefkatalog> --runtime-code=<Code>`. Der Größenexport schreibt vollständige Reihenindizes einschließlich Master und Originalgrößen.
4. `node scripts/design-pruefung/tierbestand-target-check.mjs --katalog=<Pruefkatalog> --out=<alle-ziele.json>` für alle 260 Fassungen / 580 Ziele.
5. `node scripts/design-pruefung/tierbestand-preview.mjs --katalog=<Katalog> --designs=<Entwuerfe> --out=<Pruefung> --runtime-code=<Code>`; privater HTTP-Prüfstand, keine Imports.
6. `node scripts/design-pruefung/tierbestand-screens.mjs <Pruefung>`; `GRAVURU_NODE_MODULES` (Playwright), `GRAVURU_BROWSER` setzen.
7. `node --test app/workshop/design-targets.test.mjs app/workshop/design-target-preview.test.mjs app/workshop/design-variants.test.mjs app/workshop/katalog-photo-assets.test.mjs app/workshop/design-target-rules.test.mjs`.
8. `python scripts/build-katalog.py --katalog <Katalog>`; 14 Familien. PDF-Knochen: zwei Seiten, eine Kontur ohne Löcher, Stärke/Preis offen. Visuell mit Poppler geprüft.

[Katalog-PR 14](https://github.com/Chris83638w/gravuru-katalog./pull/14) · [Code-PR 89](https://github.com/Chris83638w/gravuru-2027/pull/89). Kein Merge, kein Import, nichts live. Fehlende Schieferstärke ist im Chat angefragt; keine weitere Schrift-/Kennungsentscheidung nötig.
