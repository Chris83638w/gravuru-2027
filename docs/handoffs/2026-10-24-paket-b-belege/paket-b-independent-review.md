# Paket B – einmaliges unabhängiges Review

Basis Code main 603fa4415121d305cff31755ffab2c6af653919a, Katalog main 9bd4d146bc0a308bc63b079e582f2a82712b6082. Geprüfter Dateistand: paket-b-final-source-manifest.json (42 Dateien) und paket-b-catalog-files.json (13 Ableitungen). Alle 42 SHA256 stimmen vor und nach der Prüfung mit dem Freeze überein. Keine Implementierungsänderung durch den Reviewer.

## Befunde

### P2 – Rückseitenobjekte gegen ihre eigene physische Kontur prüfen

Ort: app/configurator/variant-m/contract.mjs:22; ebenfalls app/platform/sources/app/shared/models/studio-products.mjs:21 (Eintritt für Produkt-/Werkstattvalidierung).

Paket B spiegelt die freie Kontur für Rückseiten in surfaceGeometry. customerLayoutIssue und die direkten objectIssue-Aufrufe der Studio-/Werkstattprüfung verwenden weiterhin die Vorderseitengeometrie unabhängig von object.surfaceId. Damit akzeptiert die Speicherung Gestaltung außerhalb der realen Rückseitenkontur bzw. in deren gespiegeltem Bohrschutz, während gültige Rückseitengestaltung abgelehnt wird. Im nativen Export wird danach korrekt die Rückseitenkontur benutzt; akzeptierte Elemente können dadurch abgeschnitten werden.

Reproduktion mit der asymmetrischen Kontur aus contour-ui.test.mjs, 90 × 60 mm, margin 2: Back-Objekt 2 × 4 mm bei (6,30) passt auf der Rückseite, customerLayoutIssue und validateStudio lehnen es ab. Bei (84,30) liegt es außerhalb der Rückseite, beide akzeptieren es. Das gleiche Problem betrifft asymmetrische feste Löcher. Die derzeitigen symmetrischen Retro-Katalogformen verdecken diesen Fall.

Fixrichtung: ursprüngliche Profilgeometrie genau einmal anhand der Objektfläche orientieren. Die Prüfung muss auch validateStudio / prepareConfig sowie Werkstatt-/KI-Aufrufer von objectIssue abdecken. Bereits orientierte UI-Geometrie darf dabei nicht erneut gespiegelt werden.

### P2 – Seitenwechsel darf die Gestaltung der anderen Seite nicht verschieben

Ort: app/configurator/variant-m/edge-clamp.mjs:54–59; Zusammenhang adapter.mjs:92–94.

uxProfileGeometry liefert die aktuell angezeigte, bei Back bereits gespiegelte Geometrie. installEdgeClamp legt diese auf jedes Objekt in state.objects an, auch auf unsichtbare Objekte der anderen Seite. surface-tabs blendet diese nur in DOM/Vorschau aus und setzt kein uxHidden. Deshalb verändert schon der Seitenwechsel die gespeicherte Gestaltung ohne Bearbeitungsgeste. Repro: gültiges Front-Objekt bei x=84 bleibt im ersten Render unverändert; Front→Back plus Render verschiebt dasselbe Front-Objekt auf x=78.99799999594688. Das ist keine erlaubte Änderung des Rückseitenobjekts, sondern eine Mutation der Vorderseite.

Fixrichtung: nur Objekte der aktiven Seite begrenzen oder für jedes Objekt dessen eigene bereits korrekt orientierte Geometrie verwenden; Positionscache passend zur Objektfläche führen. usability.mjs:196–198 überprüft ebenfalls alle Texte gegen die aktive Seitengeometrie und sollte denselben Vertrag verwenden.

## Reproduktion und Aufrufvertrag

Aus dem Aufgabenordner: node work/reports/paket-b-review-reproduce.mjs. Keine Browser-, Netzwerk- oder Datenbanknutzung. Originalausgabe: paket-b-review-reproduce.json. Das Skript bestätigt beide Fehler und zusätzlich die reale validateStudio-Ablehnung/Annahme.

Geprüfte Aufrufwege:
- contract.validateDesign / newEditableObject → customerLayoutIssue: ursprünglicher selectedProfile-Stand, Objektfläche bisher ignoriert.
- studio-products.validateStudio, workshop/ui/design-authoring.authorDesign und workshop/ai-design-plan: direkte objectIssue-Aufrufe auf ursprünglichem Profil. Hier ist objektbezogene Orientierung erforderlich.
- katalog-convert.templateFit: ursprüngliche Familiengeometrie; aktuelle Katalogvorlagen sind front. Kein doppelter Versatz/Spiegelung einzuführen.
- design-area.fittedArtwork / prepared-design.preparedPlacement: synthetische frontseitige Einpassbox, kein back surfaceId. steel-formats blockiert contour bereits ausdrücklich.
- adapter.profile(surface), uxProfileGeometry, usability.fitsSurface, workflow placement und contourGuides erhalten bereits orientierte Anzeigegeometrie. Hier nicht pauschal nochmals nach object.surfaceId spiegeln.
- acrylicArtwork verwendet surfaceGeometry(viewport.geometry,surfaceId) genau einmal vor nativeContour; Produktionsorientierung selbst ist korrekt.

## Übrige Prüfung

- Alle 42 Quell-/Test-/Fixture-Dateien gegen die SHA-geprüfte main603-Basis gelesen. Neuer gemeinsamer Parser, sichere Innenflächen-/Polygonprüfung, Einrasten, B02/K00, Lochwinding, native und Browser-PDF-Konvertierung sowie sourceContourSizes nachvollzogen.
- Alle 1.734 Dateien aus dem Katalog-Vorhermanifest gehasht: genau 13 angekündigte Ableitungen geändert, keine Quelle. KATALOG.md hat nur drei Status-/Textänderungen. Beide 9×6-Grundpreise bleiben 1499 Cent, die übrigen zwölf Retro-Grundpreise null; IDs/Freigaben und feste Löcher bytegleich.
- Die vier Produktions-Quellfälle stimmen mit geometrie.json bei Pfad, Löchern und Maßen überein. Beide D1-Testfixtures stimmen mit den jeweiligen originalen design.json/design.svg überein.
- Produktionsbericht und vorhandene Testlogs gelesen, keine erneute Volltestschleife. Messbericht belegt zwölf lokale Fälle mit Fehlern unter 0,001 mm; technische Produktionsfreigabe bleibt ausdrücklich offen.
- B-Dry-run Exit 0, 175,602213 s: 744 Produkte / 597 neu / 147 gesperrt / 7920 Vorlagen. Keine Kontur-offen-Sperren. 624 Nicht-Retro-Berichtszeilen sind gegenüber A identisch (vorliegender Vergleichsbeleg). Offene Preise, fehlende/ungeeignete Quellvorlagen bleiben gesperrt.
- Kein weiterer konkreter Befund in diesem Durchlauf. Keine Livezugriffe oder import --commit. Browser/Screenshot-Abnahme weiterhin offen wegen Sicherheitsstopp; diese Prüfung ersetzt sie nicht.

Review beendet. Root behebt die zwei Befunde und führt gezielte Regressionen aus; kein zweites unabhängiges Review erforderlich.
