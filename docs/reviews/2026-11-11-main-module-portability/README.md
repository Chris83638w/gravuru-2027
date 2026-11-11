# Hauptprodukt: portabler Modul-Snapshot

11.11.2026. Reiner lokaler Nachweis; keine Datenbank, kein Import, keine Profilanlage. Der geprüfte Vorläufer-Zielstand hat Produktgruppen-SHA `2da2130230341917f7a99d2a12889c1e2f10e408f64d3532e9c5ea6bae65713c` und ID-Binding-SHA `deb2ce71bf57d5ff85e5f186378d94f58edeecc1ce4d7c4151bebf6e8072886f`. Der anschließend separat erstellte Entwurf mit erhaltenen Namen/SEO/Kategorien ist nicht dieser Beleg.

**Ergebnis:** Ein fehlender Modulregisterdatensatz blockiert das direkte identitätserhaltende Hauptprodukt-Update nicht. Das Produkt enthält mit `config.moduleProfile` bereits Schema, Herkunfts-ID, Revision und alle sieben booleschen Schalter. Runtime, `validateProductDocument` und der direkte `repository.importBatch`-Pfad laden diese Schalter nicht aus der Modulbibliothek nach. Bestätigt sind `text/designs/motifs/options/photo/logo=true`, `colors=false`. Fehlende Tabellen sind hier eine Frage der Administration/Herkunft, kein nachgewiesener Foto-/SVG-Ausfall.

`native-snapshot-proof.json` beweist die native Prüfung am tatsächlichen unveränderten Zieldokument: `passed=true`, kein Dateischreibrecht, kein Register/Repository/SQL-Konstruktor, gleiche beiden Dokumenthashes vor/nach Validierung. Die übrigen echten Ressourcen-, Asset-, Fertigungs-, Varianten-, Preis- und Revisionsprüfungen sind damit ausdrücklich nicht ersetzt.

## Zwei unterschiedliche native Wege

| Weg | Modulbibliothek |
|---|---|
| Bestehendes Hauptprodukt direkt mit `repository.importBatch` als Update derselben `cfg_*` und erwarteter Revision aktualisieren | Eingebetteter vollständiger Snapshot wird nativ validiert. Kein cmp-Lookup im normalen Workshopvalidator. Importjournal/CAS und alle übrigen Prüfungen bleiben bestehen. |
| Sechs spätere Kleinprodukt-Anlagen über die vorhandenen ProductGroupTemplates mit gewähltem Modulprofil | `pinnedModule` liest echten tenant-richtigen Registerdatensatz; Plan pinnt ID/Revision/SHA. `currentPlan` prüft aktuellen Kopf nochmals bei Bestätigung, Ausführung und unmittelbar vor dem Schreiben. Diese Registerpins müssen tatsächlich vorhanden sein. |

Der Gruppen-Execute-Pfad erzeugt Neuanlagen; er ist kein Ersatz für das Haupt-Update. Keine lokale UUID muss jetzt künstlich in den Server geschrieben werden. Ein später absichtlich neu angelegtes Verwaltungsprofil erhält nativ eine neue UUID; das verlangt neue passende Template-/Planpins und bei Verwendung im Produkt einen neuen Dokumenthash. Bestehende sieben v9-Pläne bleiben unverändert.

## Wo die Verwaltung tatsächlich liegt

Die bisherige Kopienprüfung hat Modulregistertabellen in der Workshop-Kopie gesucht. Das belegt keine globale Abwesenheit. `ops/plesk/module-management-production-config.mjs` konfiguriert ausdrücklich eine getrennte private `mika-module-connect-20261108-v2/module-management.sqlite`; ob dieser Pfad aktuell gemountet ist, muss der Operator anhand seines tatsächlichen privaten Loaders feststellen. Keine Pfadannahme durch eine Datenbankanlage bestätigen.

`GET /api/workshop/configurator-modules` ist als Existenzprobe ungeeignet: die lazy Initialisierung kann Tabellen anlegen. `createConfiguratorModuleProfiles` erstellt nativ zwei Tabellen (`configurator_module_profiles`, `configurator_module_profile_revisions`) sowie zwei Unveränderlichkeitstrigger. Der umfassendere Managementkonstruktor erstellt zusätzlich die Gruppenverwaltung. Ein künftiger Kopientest einer ausdrücklich benötigten Profilanlage würde deshalb in einer neuen isolierten Kopie nur den reinen Profilkonstruktor verwenden, `create({name,modules},{actor})`, danach `get(id,{revision:1})`/Hash prüfen und schließen. Hier wurde das nicht ausgeführt und es ist für den direkten Hauptpilot nicht erforderlich.

Das genaue bestätigte Dokument steht in `approved-module-document.json`; sein nativer Profil-Dokumenthash ist `426c0c7c30fef430107c46f2a8cdb729a897e69211f6bd92f65b36112816901f`. Dieser Hash umfasst Name+Module, nicht die neu erzeugte UUID. `create` akzeptiert keine erzwungene ID. Eine Prüfung liefert nur ID/Revision/SHA/Schalter zurück, keine fremden Bibliotheksinhalte.

## Quellstellen und Wiederholung

`app/configurator/variant-m/module-profile.mjs`: validateModuleProfile/moduleEnabled/applyModuleProfile; `app/workshop/product-model.mjs:109`: validateProductDocument; `repository.mjs:126,295`: documentValue/importBatch; `http.mjs:156`: tatsächlicher Validator mit Ressourcen/Assets/Fertigung, separate lazy Modulverwaltung169–186; `product-group-templates.mjs:125–130,188–194`: echte Registerpins; `configurator-module-profiles.mjs`: Konstruktor/create/CAS; `cart-personalization.mjs:32–67`: vollständiger Snapshot im Preisvertrag.

PowerShell aus der Workspacewurzel (Node24; die Ausgabeumleitung schreibt nur den Beleg, der Prüfprozess besitzt kein Schreibrecht):

```powershell
$code = (Resolve-Path 'work/issue230-integration-candidate').Path
$probe = (Resolve-Path 'work/restabschluss/main-module-portability/probe-native-snapshot.mjs').Path
$inputFile = (Resolve-Path 'work/restabschluss/main-target-preview/target-document.preview.json.gz').Path
node --permission "--allow-fs-read=$code/app" "--allow-fs-read=$probe" "--allow-fs-read=$inputFile" $probe $code $inputFile
```

Der Beleg pinnt die geprüften Quelldateien selbst; kein pauschaler HEAD-Guard und keine Behauptung einer abgeschlossenen Livebestellung. Der unabhängige Review steht daneben. Ein normaler HTTP-PATCH ist wegen seiner bestehenden 16-MiB-Grenze für das rund48,55-MB-Dokument nicht der geeignete Transport; das rechtfertigt keine Änderung der Grenze oder neue Servermutation.
