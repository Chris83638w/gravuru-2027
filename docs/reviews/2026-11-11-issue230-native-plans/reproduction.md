# Reproduktion #230 B

Codebasis `411188db5777d7fb0ec06c6fab2f6faf85270fc9` plus die Skripte und den Acryl-Foto/SVG-Vertragsfix dieses Branches. Die Modulprofil-/Produktplan-Implementierung dieser Codebasis ist eine Integrationsvoraussetzung; der Fix ist kein isoliert auf dem älteren GitHub-main anwendbares Produktflag. Keine Main-Integration oder Serverinstallation ist erfolgt. Node 24.20.0; Python 3.12 mit fontTools 4.68.0. Unveränderter Katalogcheckout exakt `8236b8bfab7322447ec46661c116fa526331af3d`, Excel-Gitobjekte `bf8824c80347f63ffeb2c05cc9a34a9ffed6f9bd` vorhanden. Keine Netz-/API-Zugriffe der Planrunner.

```powershell
$env:GRAVURU_PYTHON = 'C:\Users\Christopher Koch\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$env:PYTHONPATH = 'C:\Users\Christopher Koch\Documents\Codex\2026-11-09\ken\work\vendor'
node scripts/issue230-native-plans.mjs ../product-plans-catalog ../new-source-run
node scripts/issue230-finalize-local-plans.mjs ../new-source-run ../product-plans-catalog ../new-final-run
node scripts/verify-issue230-variant-pairs.mjs ../new-final-run
node --test scripts/issue230-product-plan-audit.test.mjs
```

Jeder Ausgabeordner muss neu sein. Der erste Lauf konvertiert die Originale nativ und registriert ausschließlich echte lokale Quellen. Der zweite übernimmt nur den bereits geprüften Quelleninhalt, verifiziert ihn gegen die persistierte erste SQLite, korrigiert Rangpriorität bei der dokumentierten Listen-Dublette, speichert die echte 13-Motiv-Auswahl und die bestätigten Upload-Module (Hauptacryl Foto/SVG an, kleine sechs Foto/Logo aus). Er legt neue Quellen/Vorlagen/Pläne in einer separaten Datenbank an. Keine `confirm`-/`execute`-Aufrufe und keine produktiven Änderungen.

Neue Läufe erzeugen neue UUIDs, also andere PlanIDs und PlanHashes. Die konkreten hier vorgelegten IDs gehören zum privaten Paket `product-plans-run-v8` samt beiden SQLite-Dateien; sie dürfen nicht als serverseitige IDs ausgegeben werden. Die Datenbanken enthalten nur den neu erzeugten lokalen Prüfbestand und werden nicht ins Repository committed.

Ergebnis der ausgeführten Prüfung: sieben Planpaare, 823 Variantenpreise ohne Abweichung; 14 absichtliche Preis-/Mengenfehler erkannt, 4/4 vorhandene Vertragsprüfungen grün. Unabhängiger Review und exakte Paketdateien/Prüfsummen liegen zusätzlich im privaten Ausgabepaket.

Zusätzlicher Uploadnachweis: 59 Modul-/Runtime-/UI-/Preisprüfungen und 10 Medien-/lokale HTTP-/Produktionsprüfungen bestanden. Die neue gemeinsame Foto-/SVG-Raster-PDF wurde nach Ergänzung der PDF-Prüfung separat erneut ausgeführt und bestanden. Für Medienprüfungen sind `app/workshop/requirements-logo.txt` sowie die vorhandenen Import-/Foto-/Kontur-/Print-Abhängigkeiten und libcairo erforderlich. Die beiden HTTP-Tests benötigen ausschließlich Loopback. Alle Testprodukte sind ausdrücklich synthetisch und gehören nicht zu den sieben echten Planquellen.

```powershell
node --test app/workshop/customer-vector-logo-pricing.test.mjs app/configurator/variant-m/module-profile.test.mjs app/configurator/variant-m/module-runtime.test.mjs app/configurator/variant-m/logo-upload.test.mjs app/configurator/variant-m/ui-event-regressions.test.mjs
node --test app/workshop/customer-vector-logo-media.test.mjs
```

Die für den ausgeführten Medienlauf verwendeten vorhandenen lokalen Abhängigkeiten stehen unter `2026-10-23/files-pasted-by-the-user-du/outputs/n36-20261101/python-logo`, `2026-10-23/files-pasted-by-the-user-du/work/pydeps` und dem oben genannten Font-Vendor. `CAIROCFFI_DLL_DIRECTORIES` verweist auf `2026-10-21/https-www-google-com-url-q/work/tools/inkscape-1.4.4/inkscape/bin`, jeweils relativ zu `Documents/Codex`. Keine Abhängigkeiten wurden ins Repo kopiert oder live installiert.

Die gesonderte Motivprofilrevision ist kein automatisch vom aktuellen `ProductGroupTemplate.currentPlan` geprüfter Bestandteil. Profilrevision, Dokumenthash und SQLite-Hash sind daher im privaten Paket festgehalten und vor späterer Ausführung erneut zu prüfen; derzeit bleiben alle Pläne wegen offener Fachfragen ohnehin nicht ausführbar.

## Finale lokale Prüfung und Grenzen

Nach dem Materialfarb-Fix: 39/39 Tests aus `logo-upload.test.mjs`, `ui-event-regressions.test.mjs` und `small-sign-motif-placement.test.mjs` bestanden. `npm run build` danach erfolgreich: 76 Referenzen geprüft, 154 Module gebündelt. Ein unabhängiger Rastervergleich von tatsächlichem Editor-/Dialogmarkup zeigt Ink #e1e4e5 und freie Aussparungen bei unverändertem geprüftem SVG-Hash. Keine Livebrowser-Sichtprüfung behauptet.

Im erweiterten Planservice-Testlauf bestanden 47/50 Fälle. Drei historische Cache-/Lesezählerfälle scheiterten; dieselben drei scheitern auch im sauberen isolierten Ausgangscheckout `78f178e99150a3d8b67853607d1140dc4cfc6199` ohne diesen Runtime-Patch. Die Logs `product-plans-final-integration-tests.log` und `product-plans-baseline-tests.log` sind im Paket. Dieser Befund wird nicht als vollständig grüne Gesamtprüfung ausgegeben; die gezielten Upload-, Platzierungs- und Preisnachweise sind davon getrennt.

Die neuen versionierten Excel-Nachträge nennen die tatsächlichen v8-PlanIDs/Hashes und Quellrevisionen. Der native Plan bindet weiterhin den SHA der unveränderten Original-Preisakte. Der neue XLSX-SHA wird von einem externen Paketmanifest gebunden; ein zirkulärer Selbsthash ist nicht vorgesehen. Startgestaltung, Steuerkontext und Mengenstaffel bleiben ohne ausdrückliche Nutzerantwort offen. Neue Fachentscheidungen erfordern neue Planpaare und aktualisierte Nachträge.
