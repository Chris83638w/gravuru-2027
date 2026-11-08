# Vollständige Texte beim Edelstahl-Formenwechsel

Stand 08.11.2026, Mika-Unteragent. Grundlage `3a780000d44ae6f6671d8560c5b9ff919738ac91`, eigener Branch `dev/mika-steel-shape-text-fix-20261108`, PR-Basis `dev/mika-steel-product-entry-20261108`. Keine Veröffentlichung durch diesen Agenten.

## Zweck und bestätigte Regel

Der Hauptagent hat die ausdrückliche Nutzerfreigabe für die eng begrenzte Fehlerkorrektur weitergegeben: Bei AB120×80 mit Name „Test Eins“ und unverändertem zweiten Feld „Familie“ muss der Formenwechsel beide Texte vollständig erhalten. Das entspricht auch ENTSCHEIDUNGEN.md 3.27 (Kundentexte bleiben beim Formenwechsel). Keine Änderungen am freigegebenen Konfi-Aufbau, an Preisen, Katalogvorlagen oder Shopdaten. Es werden keine Designs bearbeitet; der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unverändert verbindlich.

## Ursache und Korrektur

`familyFormatState` gab bisher nur geänderte einzelne Textobjekte an `transferTexts` weiter. Damit fehlte das unveränderte `name-2=Familie`. Die bestehende Zuordnung erkannte irrtümlich einen Wechsel von einem auf zwei Namensfelder und zerlegte „Test Eins“ in „Test“ / „Eins“.

Die vorhandene Funktion `changedCustomerTexts` ergänzt nun die unveränderten Teile derselben Namens-/Datengruppe. Die vorherige Auswahl geänderter Texte bleibt als Vereinigung erhalten: insbesondere selbst geänderte Sprüche und eigene Zusatztexte werden beim Formenwechsel weiterhin übertragen. Ein bloßer Ersatz durch `changedCustomerTexts` hätte diese bestehende Funktion eingeschränkt. Ausgeblendete und nicht kundeneditierbare Quelltexte bleiben ausgeschlossen.

`transferTexts`, die Zuordnungsregeln, die Zieltypografie und die vorhandene Einpassung sind unverändert. Bei gleichen Anzahlen werden eindeutige Feldschlüssel wie `name`, `name-2`, `name-3` verwendet, unabhängig von Zielobjekt-Reihenfolge oder Objekt-ID. Der bereits bestehende Wechsel von einem Gesamt-Namensfeld zu mehreren Feldern bleibt erhalten. Mehrdeutige doppelte Feldschlüssel werden weiterhin nicht geraten; nicht zugeordnete Texte bleiben als separate editierbare Objekte erhalten.

## Prüfungen

65 Tests bestanden, 0 fehlgeschlagen, 0 übersprungen:

- 6 neue Regressionen in `app/configurator/variant-m/family-format-text-transfer.test.mjs`: vollständiger Name plus unveränderter zweiter Name, Rückwechsel, drei Namensfelder mit anderer Zielreihenfolge, bestehende Einfeld-/Mehrfeldzuordnung, Mehrdeutigkeit ohne Textverlust, andere geänderte Texte, unveränderte Zielvorlagen, versteckte/nicht editierbare Felder und echter nativer Produktplan.
- 37 bestehende Tests in `family-formats.test.mjs` und `workflow.test.mjs`: Formate, Bearbeitungszustand, Preise, erlaubte Varianten, Entwurf/Export und bisherige Textübernahme.
- 22 bestehende Tests in `bundle.test.mjs`, `customer-orientation.test.mjs` und `product-design-transfer.test.mjs`: Bündelvertrag, tatsächlicher Designwechsel, Texte/Fotos, eindeutige Feldzuordnung und Texteingabe.

Realer lokaler Prüfeingang: `outputs/steel-shopify-20261108/normal-door-native-plan.json`, SHA-256 `8f994b378cbb4b7b1fcf833b4907af1317ded452838c6509ef284b75300ee95f`, Startdesign `katalog-TAE-V2A-8x5-D1`. Geprüft AB120×80/K00 → RE150×100/KGL → AB120×80/K00. Name bleibt „Test Eins“ beziehungsweise nach erneuter Eingabe „Test Zwei“, das zweite Feld bleibt „Familie“. Ausgangszustand und Konfigurationsdaten bleiben bytegleich. Der Plan enthält keine für den Fix nötige neue Produktdatenänderung und wird hier nicht dupliziert.

Reproduktion mit Node ≥24 im Aufgaben-Worktree:

```powershell
$env:GRAVURU_STEEL_NATIVE_PLAN='<workspace>/outputs/steel-shopify-20261108/normal-door-native-plan.json'
node --test app/configurator/variant-m/family-format-text-transfer.test.mjs app/configurator/variant-m/family-formats.test.mjs app/configurator/variant-m/workflow.test.mjs
node --test app/configurator/variant-m/bundle.test.mjs app/configurator/variant-m/customer-orientation.test.mjs app/configurator/variant-m/product-design-transfer.test.mjs
node app/configurator/variant-m/build.mjs
```

Ohne die Umgebungsvariable laufen fünf synthetische Regressionen; nur der zusätzliche echte lokale Produktplantest wird mit ausdrücklichem Hinweis übersprungen. Im hier berichteten Prüflauf war die Variable gesetzt.

## Build und genaues Paket

Bestehenden Build unverändert ausgeführt: 76 Referenzressourcen geprüft, 150 Kernmodule, 16 Stylesheets. Neues Kernbundle `editor-eb6b798c7398f566.mjs` (1.426.167 Bytes, gzip 476.894 Bytes). Gegen den vorhandenen R15-Build `editor-bab5a1fa49ee42d2.mjs` ist exakt ein eingebettetes Modul verändert: `family-formats.mjs`. Alle gebündelten Stylesheets und die acht anderen Bundle-Dateien sind bytegleich. `editor.html` unterscheidet sich ausschließlich durch den Kernbundle-Dateinamen.

Vier Laufzeitdateien stehen mit SHA-256 und Ausgangshashes im [Manifest](../reviews/2026-11-08-steel-shape-text-fix/manifest.json), als reine Pfadliste in [deployment-files.txt](../reviews/2026-11-08-steel-shape-text-fix/deployment-files.txt). Generierte Dateien liegen lokal unter `.preview/`, sind per Build reproduzierbar und werden nicht als große Artefakte eingecheckt.

Nicht kopieren: `models.json`, `guides.json`, `assistant.js`, Lazy-Ressourcen, Katalogdaten oder Datenbanken. Vor Aktivierung die Ausgangshashes prüfen, die vier betroffenen Dateien privat sichern und das alte gehashte Kernbundle für noch offene Sitzungen erhalten. Rückweg: alte Quelldatei und alten Editor-Einstieg wiederherstellen; keine Datenmigration notwendig.

## Offen und genauer nächster Schritt

Der Hauptagent übernimmt Sicherung und eine kontrollierte Aktivierung, danach Browser-/Warenkorbabnahme mit dem exakten AB→RE-Fall und Rückwechsel. Dieser Agent hat keine Shop-, Theme-, Server-, Datenbank- oder Browseränderung vorgenommen. Lokale Modell-/Bundleprüfungen sind kein Ersatz für die tatsächliche Warenkorbprüfung. Die parallel untersuchte Logo-Preisfrage gehört ausdrücklich nicht in diesen Fix.
