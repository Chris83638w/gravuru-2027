# Reproduktion #230 B

Codebasis `411188db5777d7fb0ec06c6fab2f6faf85270fc9` plus die drei Skripte dieses Branches. Node 24.20.0; Python 3.12 mit fontTools 4.68.0. Unveränderter Katalogcheckout exakt `8236b8bfab7322447ec46661c116fa526331af3d`, Excel-Gitobjekte `bf8824c80347f63ffeb2c05cc9a34a9ffed6f9bd` vorhanden. Keine Netz-/API-Zugriffe der Runner.

```powershell
$env:GRAVURU_PYTHON = 'C:\Users\Christopher Koch\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$env:PYTHONPATH = 'C:\Users\Christopher Koch\Documents\Codex\2026-11-09\ken\work\vendor'
node scripts/issue230-native-plans.mjs ../product-plans-catalog ../new-source-run
node scripts/issue230-finalize-local-plans.mjs ../new-source-run ../product-plans-catalog ../new-final-run
node scripts/verify-issue230-variant-pairs.mjs ../new-final-run
node --test scripts/issue230-product-plan-audit.test.mjs
```

Jeder Ausgabeordner muss neu sein. Der erste Lauf konvertiert die Originale nativ und registriert ausschließlich echte lokale Quellen. Der zweite übernimmt nur den bereits geprüften Quelleninhalt, verifiziert ihn gegen die persistierte erste SQLite, korrigiert Rangpriorität bei der dokumentierten Listen-Dublette, speichert die echte 13-Motiv-Auswahl und das als Vorschlag gekennzeichnete Kleinformat-Modulprofil. Er legt neue Quellen/Vorlagen/Pläne in einer separaten Datenbank an. Keine `confirm`-/`execute`-Aufrufe und keine produktiven Änderungen.

Neue Läufe erzeugen neue UUIDs, also andere PlanIDs und PlanHashes. Die konkreten hier vorgelegten IDs gehören zum privaten Paket `product-plans-run-v6` samt beiden SQLite-Dateien; sie dürfen nicht als serverseitige IDs ausgegeben werden. Die Datenbanken enthalten nur den neu erzeugten lokalen Prüfbestand und werden nicht ins Repository committed.

Ergebnis der ausgeführten Prüfung: sieben Planpaare, 823 Variantenpreise ohne Abweichung; 14 absichtliche Preis-/Mengenfehler erkannt, 4/4 vorhandene Vertragsprüfungen grün. Unabhängiger Review und exakte Paketdateien/Prüfsummen liegen zusätzlich im privaten Ausgabepaket.

Die gesonderte Motivprofilrevision ist kein automatisch vom aktuellen `ProductGroupTemplate.currentPlan` geprüfter Bestandteil. Profilrevision, Dokumenthash und SQLite-Hash sind daher im privaten Paket festgehalten und vor späterer Ausführung erneut zu prüfen; derzeit bleiben alle Pläne wegen offener Fachfragen ohnehin nicht ausführbar.
