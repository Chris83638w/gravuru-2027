# Funkklingeln: 42 Modelle, 126 Hauptprodukte

Stand 27.10.2026, Codex. Vorbereitete Migration; diese Übergabe behauptet weder einen GitHub-Merge noch eine Live-Veröffentlichung. Der Nutzer hat die Übernahme ins neue System, 126 Hauptprodukte, Erhalt aller Optionen und Positionen sowie direkte Veröffentlichung ausdrücklich freigegeben. Der frühere Funkklingel-Ausschluss im Katalog ist für diese 42 Modelle damit aufgehoben. Acht noch nicht eindeutig identifizierte Zusatzgeräte sind ausgeschlossen.

## Herkunft und Umfang

- Codebasis: Chris83638w/gravuru-2027, d103019b6dc0eb29413345a83af17036ce021055.
- Katalogbasis: Chris83638w/gravuru-katalog., 53d29d835ce453d7858ffc340d311f32be8124dc. Vor Merge den aktuellen Stand erneut prüfen.
- Katalogziel: migrationen/funkklingeln-42x3-20261027/. Lokale Quelle: work/doorbell-migration/catalog-stage/ im ursprünglichen Aufgabenordner.
- 42 Modelle aus 18 Marken, je drei Einstiege: 16×28 cm Hochformat, 24×20 cm Querformat, 35×18 cm länglich. 42 bestehende Shop-Produkte übernehmen, 84 ergänzen. 63 Startfarben Schwarz, 63 Anthrazit.
- Jeder Einstieg behält drei Formate, zwei Acrylfarben, vier Rahmen und fünf Befestigungen: 120 Varianten, insgesamt 15.120. Davon 5.040 bestehende und 10.080 neue Shopify-Varianten. Gegenposition und Designwechsel erzeugen keine zusätzliche Kaufvariante.
- Grundpreise 4.999 / 5.999 / 6.999 Cent; Befestigung K00 +0, GWS +599, KRA/SIL +499, B04S +369 Cent. Neue SKUs erst nach erneutem Shopabgleich; kein Nummernbereich reserviert.
- 176 Quellen und 735 Bibliotheksdateien erhalten. Alle 911 Kopien am 27.10.2026 erneut gegen ihre ursprünglichen lokalen Dateien und SHA-256 bytegenau geprüft.
- 522 originale Schnittpfade, 5.922 Textobjekte und 1.848 feste Dekorelemente erhalten. 42 Gerätezuordnungen teilen 35 unterschiedliche WebP-Dateien. Gerätebilder gelangen nicht in die Schnittdaten.
- 30 vorhandene Schriftressourcen und 703 Motive exakt gegen die neue Laufzeit zugeordnet, 82 private SVG-Dekorationen über den bestehenden Assetimport. Keine neuen Lizenzbehauptungen; vorhandene teilweise unvollständige Nachweise stehen in resource-provenance.json.

Manifest-SHA-256: 98014562f22f360dd7ae70335a701e711a8b4b9a7d0096190b3985e7f3f17233.

Dryrun-Report-SHA-256: d4a5a6fccbc4f2fb0c63b54aeb2888b2e5dcfd2d98a131970571c2e60f9847b3.

## Prüfung

import-dryrun/import-report.json bestätigt 126 validierte Dokumente, shopifyMutations: 0 und publicationPerformed: false. documents/ enthält 126 Dokumente, asset-index.json 82 Dekorressourcen. Die zuvor abgeschlossene Importerabnahme meldete 7/7 Tests grün, einschließlich echtem Import in isolierte Datenbanken und Wiederholung mit null Duplikaten, gleichen IDs und Fingerprints. Für diese reine Dokumentationsübergabe wurden die bestandenen Tests nicht erneut ausgeführt.

payload-audit.json: 146.717–158.200 Byte je Dokument, gzip 23.278–27.912 Byte, keine Fontglyphen inline. Die elf Startvorlagen-Schriften sind zwischen den drei Formaten jedes Modells identisch.

audit.json und static-verification.json sind historische Aufbereitungsnachweise. Dort noch offene Adapterarbeiten werden vom späteren Importreport belegt. Fertigung, Kundenstrecke und Bindung werden von ihren Implementierungspaketen gesondert dokumentiert. Der Importbericht ist keine Live-Freigabe.

## Importbefehle

Aus dem Code-Repo mit Node 24 oder neuer; relativer Katalogpfad muss auf den vollständigen Katalog-Checkout zeigen:

```sh
node scripts/import-doorbell-catalog.mjs \
  --catalog ../gravuru-katalog/migrationen/funkklingeln-42x3-20261027 \
  --work-dir ../funkklingeln-import-pruefung \
  --dry-run
```

Vollständiger isolierter Importtest, ohne Shopify-Zugriff:

```sh
GRAVURU_DOORBELL_CATALOG=../gravuru-katalog/migrationen/funkklingeln-42x3-20261027 \
  node --test scripts/import-doorbell-catalog.test.mjs
```

Serverimport: vor Ausführung Hostpfade, Mandant und Schema prüfen, SQLite-Sicherung samt Integritätsprüfung erstellen. Nur den neuen Acryl-Speicher verwenden; den Legacy-Speicher niemals mit Schema v4 öffnen. Keine Geheimnisse im Aufruf:

```sh
cd /var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-main
/opt/plesk/node/24/bin/node scripts/import-doorbell-catalog.mjs \
  --catalog /var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-katalog/migrationen/funkklingeln-42x3-20261027 \
  --work-dir /var/www/vhosts/gravuru-designwerkstatt.de/private/funkklingeln-import-20261027 \
  --apply \
  --database /var/www/vhosts/gravuru-designwerkstatt.de/private/acryl-employee-20261021-v1/data/workshop.sqlite \
  --asset-database /var/www/vhosts/gravuru-designwerkstatt.de/private/acryl-employee-20261021-v1/data/design-assets.sqlite \
  --tenant gravuru
```

Der Import erzeugt interne Produktstände und Assets, keine Shopify-Produkte oder SKUs. orderEnabled und productionConfirmed bleiben false. Kundenfreigabe erfolgt separat revisionsgebunden. Gegenposition verschiebt Klingel und asymmetrische Montagegeometrie gemeinsam aufrecht, ohne Gerätespiegelung oder Rotation.

## Katalog-Commit

work/doorbell-migration/catalog-commit-index.json liegt außerhalb des Datenpakets. 1.295 Commitpfade mit lokaler Quelle, Größe, Git-Blob-SHA, SHA-256 und Encoding; 66.162.368 Byte, 1.253 unterschiedliche Git-Blobs. Vor Upload Dateihashes mit dem Index vergleichen.

Vier lokale Aufbereitungsskripte sind ausgeschlossen: archive_legacy_resources.py, build_manifest.py, build_native_inputs.py, verify_stage.py. Ausführbare Importlogik gehört ins Code-Repo. Historische JS-/HTML-Dateien unter sources/ bleiben unveränderte gehashte Quellenbelege und werden nicht ausgeführt.

AGENTS.md verlangt nach Katalogänderungen einen Bau aus dem vollständigen Checkout:

```sh
python scripts/build-katalog.py --katalog ../gravuru-katalog
```

Der bestehende Generator liest familien/, linien/, themen.json und struktur.json; migrationen/ wird nicht eingelesen. Der Bau validiert bestehende Familien und erneuert ihre Ansichten. Er validiert oder zeigt diese mehrlagigen Funkklingeln nicht automatisch. Dafür ist der native Importer zuständig. Keine falsche gravuru-product-family/v2-Familie erzeugen und KATALOG.md nicht von Hand ändern. Plattformabhängig regenerierte Familienartefakte nur bei inhaltlicher Änderung übernehmen. Beim tatsächlichen Commit STAND.md um dieses native Paket und den Veröffentlichungsstand ergänzen.

## Noch vor der Live-Fertigmeldung

1. Code und diesen Nachweis auf eigenem Aufgabenbranch committen, STATUS.md ergänzen; Katalog separat committen. Aktuelle fremde Änderungen vor Merge erhalten.
2. Uncommittete Design-/Protokolländerungen im Serverkatalog sichern und erhalten. Code und Katalog bereitstellen, Acryl-Datenbanken sichern und oben beschrieben importieren.
3. 126 Hauptbilder prüfen, 84 neue Shopprodukte mit frischen SKUs anlegen, 42 vorhandene Seiten einschließlich SEO aktualisieren. Neue Konfigurator-Vorlage und Startwerte zuweisen, alten Launcher entfernen; bestehende Markenkategorien verwenden.
4. Bindungsmanifest aus echten Shopify-IDs und dem echten Importreport bilden. Mit frischem vollständigem Export alle 15.120 Varianten prüfen und über scripts/doorbell-shop-bind.mjs binden; vorgesehene Freigabeoptionen: --apply --live --approve-live --approval-id user-20261027-funkklingeln. Export und Manifest werden vom Veröffentlichungsschritt erstellt.
5. Kundenstart, alle Optionen und Positionen, Textgestaltung, Warenkorb-Rückkehr und Fertigungsbundle sichtbar prüfen. Keine echte Zahlung. Erst nach bestätigter Veröffentlichung aller 126 Seiten als live fertig melden.

Durch dieses Katalog-Teilpaket wurden keine Live-Daten, Shopify-Artikel, GitHub-Branches oder Serverdateien verändert.
