# Paket B – Reviewbefund Rückseitenvalidierung behoben

CodeFreeze: acht finale Dateien in paket-b-surfaces-fix-files.json (SHA256/Bytes). Keine GitHub-, Browser-, Live- oder Import-Commit-Aktion. Kein zweites Review.

## Korrektur

Die reine surfaceGeometry-Implementierung liegt einmal im gemeinsamen contour-geometry.mjs und wird aus surfaces.mjs reexportiert. Ihre Spiegelung ist inhaltlich unverändert. objectIssue bleibt für bereits orientierte Geometrie unverändert; neuer surfaceObjectIssue orientiert ausschließlich Back-Objekte aus ursprünglichem Produktprofil. Front verwendet direkt denselben bisherigen Aufruf. Contract (customerLayoutIssue/validateDesign), validateStudio/prepareConfig, Werkstatt-authorDesign einschließlich fitPosition und KI-Planvalidierung nutzen den ausdrücklichen Originalprofil-Vertrag. UI-Adapter/fitsSurface bleiben bei bereits orientierter Geometrie.

## Testbelege

- Neue contour-surfaces.test.mjs: 6 Fälle; gültiges Back x=6 und ungültiges x=84, feste asymmetrische Lochmitten, unveränderte Front-/Grundformregeln, validateStudio/prepareConfig, Kundenvalidierung, eingefrorener Review → acrylicArtwork, Werkstatt- und KI-Änderungen. Quellen bleiben unverändert.
- Finaler Lauf: node --test app/workshop/contour-surfaces.test.mjs app/workshop/design-authoring.test.mjs – 11/11, 3,044 s; Original-Log paket-b-surfaces-authoring-final.log. Nach der letzten Klarstellung des fitPosition-Vertrags erneut gezielt ausgeführt.
- node --test app/workshop/katalog-convert.test.mjs app/workshop/katalog-import.test.mjs app/workshop/design-authoring.test.mjs app/workshop/ai-design.test.mjs – 41/41, 8,431 s; Original-Log paket-b-surfaces-regression-tests.log. Davon authoring 5 im finalen 11er-Lauf nochmals enthalten, nicht doppelt zählen.
- Gepinnte bestehende surfaces.test.mjs von main 603fa4415121d305cff31755ffab2c6af653919a, Blob-SHA1 758461308695fd4a1327d3cf070aa380a933fa5a, lokal unverändert geprüft. node --test --test-name-pattern='Vorderseite allein|Rückseite validiert je Fläche|Offener Aufpreis' app/workshop/surfaces.test.mjs – 3/3, 0,741 s; Original-Log paket-b-surfaces-existing-tests.log. Die übrigen Excel-/Fertigungstests wurden für diesen reinen Seitenvalidierungsfix nicht wiederholt.
- Insgesamt 50 eindeutige Fälle in den Fixläufen: 6 neu + 5 authoring + 17 AI + 19 convert/import + 3 bestehende surfaces. Keine neue allgemeine Gesamtsuite.

## Katalognachweis und bisheriger Dry-run

Rein lesender Zähllauf check-b-catalog-front.mjs: 737 Master, 2 ausgeblendet, 735 tatsächliche Vorlagen konvertiert, 2404 Objekte – alle 2404 Front, 0 Back; keine Schriftlücken oder Konvertierungsfehler. Für jedes Objekt ist surfaceObjectIssue identisch zum bisherigen objectIssue geprüft. Original-Log paket-b-surfaces-catalog-front.log; Detailbericht paket-b-surfaces-catalog-front.json, SHA256 2e016a1ee8bba1c9dffaef3414b9a251de54eae4d78da3b94392ba8689da60b2.

Damit beeinflusst der Rückseitenzweig die vorhandenen realen Katalogobjekte nicht. Zusammen mit den grünen convert/import-Regressionsprüfungen bleibt der vorhandene vollständige B-Dry-run (744 / 597 neu / 147 gesperrt) gültig; nach Abstimmung mit Root kein erneuter Vollimportlauf. Der native PDF-Renderer ist unverändert; der neue Review-Test prüft die Orientierung des eingefrorenen Back-Artworks. Browser-/Maschinenfreigabe bleibt offen.
