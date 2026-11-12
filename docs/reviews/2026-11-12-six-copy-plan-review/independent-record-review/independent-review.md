# Unabhängiger Sechsgruppenreview – 12.11.2026

## Ergebnis

Die tatsächlich veröffentlichte Testhülle und ihre sechs Eingabesätze sind gegen die vorhandenen v9-Originaldaten geprüft. Alle Eingabeprüfungen sind bestanden: 45 Varianten (10/10/10/5/5/5), je 27 Designs, dieselben 13 Motiv-IDs in derselben Reihenfolge, Original-Excel-Verweise, Optionen, Preise, Startdesigns, Themen und Module. Die 14 im Runner genannten nativen Quelldateien stimmen bytegenau mit dem lokalen Integrationsstand überein. Kein konkreter Produktdatenfehler festgestellt.

Die vollständige inhaltliche Gleichheit der **tatsächlich neu gespeicherten Kopienpläne** ist noch nicht unabhängig aus ihren Dateien nachgerechnet. Dazu fehlen die bereits angeforderten get-Records/Pläne und der vorhandene rohe TESTBELEG. Das ist eine Beleggrenze, kein Anlass für einen neuen Lauf, eine Codeänderung oder einen Stopp des bereits getrennt geprüften Programmwechsels.

## Gelesene Originale und eigene Nachrechnung

- Operatorbericht: [#1686819186960](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6819186960), Archivierungsanfrage: [#1686819192410](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6819192410). Die beiden frisch gelesenen Texte sind in `operator-comments.json` gesichert.
- `dev/claude-db-sicherung-20261111@26b5993b`, `ops/plesk/sechsgruppen-20261112/sg-plaene.mjs`: 21.073 Bytes; SHA-256 `5b48e6357bb7d78b144de7a861f2871b6c14316dc8ee08b4c371b6bb06a3bbc8`.
- `sg-eingaben.json`: 20.795 Bytes; SHA-256 `08f6dbed3cd54f97f3f324d80c51cc65d8d97348f1533a8e12551f72e68b8fde`.
- `TESTBELEG-sechsgruppen.json` ist an diesem Git-Pfad/Commit beim Abruf nicht vorhanden (404). Der vom Operator genannte SHA `a541d5d1f1f5a34b967fcb7cc228d01148083d48dd9e7c9bfa79f5f9080998b2` ist deshalb bislang eine Operatorangabe.
- Eigene Nachrechnung: `compare-inputs-v9.mjs` und `input-v9-review-final.json`. Nur vorhandene JSON-/Gzip-Dateien gelesen und gehasht; keine App-Imports, Datenbanken, nativen Konstruktoren, Serveraktionen oder erneute Planerzeugung. Alle sechs alten v9-Pläne und ihre Quellen vollständig berücksichtigt.

Die Eingaben enthalten pro Gruppe einen Hash des **vollständigen** kompilierten Produktdokuments. Der Runner setzt hierfür ausschließlich `profileAssignments.motifs.profileId` und `config.moduleProfile.id` auf `null` (Zeile 135). Keine anderen Felder werden entfernt: Geometrie, Ressourcen, Preisobjekte und sonstiger Inhalt bleiben im kanonischen Vergleich. Dieser Erwartungshash stimmt für alle sechs Gruppen mit unserem unveränderten v9-Dokument überein. Ein entsprechendes `true` im tatsächlichen TESTBELEG bzw. die eigene Nachrechnung der neuen Dokumente belegt daher genau die behauptete Zwei-ID-Abbildung; daraus wird gegenwärtig noch kein Dateibeweis der neuen Dokumente abgeleitet.

Hashverfahren bleiben getrennt: Modulprofil und Produktgruppeninhalt verwenden rekursiv objektsortiertes JSON. Der Motivprofilpin `fcce86f72ad8f3aba398bc2d655ec44bb172ca0df50cec1156c466a02b056cf4` ist der native gespeicherte JSON-Bytehash von `{name,type,items}`; der zusätzlich berechnete kanonische Motivhash lautet `8c3edbbe0ac9742b97babc8a82fe1b197cfb7101fee3d29ddb0c77baa9b473ca`. Der erste eigene Diagnoseauszug `input-v9-review.json` enthielt zunächst die falsche Annahme eines kanonischen Motivpins. Dies wurde durch Lesen des nativen Speichercodes geklärt; maßgeblich ist `input-v9-review-final.json`. Kein Produktionsfehler und keine Datenkorrektur.

## Anschluss und Isolation

Der Runner erzeugt ein neues exklusives Verzeichnis, kopiert die drei zusammengehörigen Sicherungsdateien mit `COPYFILE_EXCL`, prüft ihre SHAs und reicht ausschließlich Dateipfade unter diesem neuen Verzeichnis an die nativen Bibliotheken/Registry weiter (Zeilen 58–83). Der lokale Build schreibt ebenfalls in einen neuen Unterordner. Der Nicht-Formprodukt-Validator und die Snapshot-Metadaten entsprechen dem aktuellen nativen HTTP-Anschluss: Produktvalidierung, Ressourcenauflösung, Assetvalidierung und Fertigungsprofilauflösung. Der Standardanschluss `createConfiguratorModuleManagement({filename,repository,tenantId:'gravuru'})` verwendet die tatsächlichen nativen Produktquellen. Der Code ruft weder `confirm` noch `execute` noch eine Shopify-Schreibfunktion auf. Sechs vorbereitende Quellen werden ausdrücklich nur auf der Kopie angelegt.

Das fehlende lokale Modul-/Motivregister wird auf der Kopie mit den vorhandenen v9-Inhalten angelegt, anschließend werden tatsächliche IDs verwendet. Der Modulprofil-Hash wird im Gesamtpass geprüft. Die Motiv-IDs müssen vorher im tatsächlichen nativen Katalog vorhanden sein, ihre Auflösung wird je Quelle protokolliert. Quellen-/Vorlagenrevision 1 auf einer frischen Kopie ersetzt nicht die Provenienz der historischen v9-Revision 2; neue IDs und neue Planhashes sind deshalb erwartbar.

Der Operator meldet ausdrücklich Netzwächter, 14 geprüfte Pins und unveränderte Sicherungen. Im veröffentlichten Runner sind `SG_*`-Pfadparameter und `SG_OHNE_PINS` vorhanden; die Hülle ist ein operatorgeführter Kopientest, kein unveränderlicher Live-Importer. Der importierte `./vh-netzwaechter.mjs` ist am selben Git-Verzeichnis/Commit ebenfalls nicht verfügbar (404). Seine tatsächliche lokale Platzierung/Aktivierung wird hier nicht aus dem fehlenden Git-Sibling rekonstruiert. Die genannten Schutz- und Laufzeitwerte sind bis zum vorhandenen Rohbeleg entsprechend als Operatornachweis gekennzeichnet.

## Aussage der Passfelder

`e.bestanden` (Zeile 136) verlangt gültigen zurückgelesenen Plan, unveränderten Creation-Key, lokale Ausführung, null Shopify-Schreibvorgänge/keine Bestätigung, Kombinationen, vollständiges variantReview, Optionen, Preisobjekt, Optionsgruppen, 27 gleiche Design-IDs, Foto/Logo aus und dieselben 13 aufgelösten Motive. Die 13 Gesamtfelder ergänzen Zähler/Journal/Bindungen und Sicherungshashes.

Einige stärkere Aussagen werden separat protokolliert, aber nicht in den aggregierten Pass aufgenommen: insbesondere der volle Zwei-ID-Dokumentvergleich, Start/Thema/Module, Quellenreadback und Vorlage-Zielinhalt. Auch ein Prozess-Exit 0 allein beweist nicht `bestanden:true`. Der Bericht nennt diese Einzelwerte ausdrücklich als gleich; die schon vorhandenen Einzelbooleans und vollständigen Records können den Nachweis ohne Neulauf schließen. Die derzeit fehlende Rohdatei macht daraus keinen belegten Datenfehler. Unveränderte Tabellenzähler allein sind zudem kein Zeilen-/Datei-Identitätsbeweis; der Runnerpfad selbst enthält keine Binding-/Import-/Shop-Schreiboperation.

## Kleinster Abschluss

Die bereits angeforderten tatsächlichen Plan-, Quellen-, Vorlagen- und Profilrecords sowie TESTBELEGE archivieren. Dann Planhashes mit dem nativen Verfahren nachrechnen, die tatsächlichen 45 variantReview-Zeilen vergleichen und das vollständige Dokument unter genau den beiden bekannten ID-Abbildungen vergleichen. Kopien-IDs bleiben sichtbar als Kopien-IDs, `confirm:0`/`execute:0`; ein Excel-Kopiennachtrag behauptet keine produktive Registryanlage. Keine Wiederholung des Kopienlaufs oder zusätzliche Freigabefrage aus diesem Review abgeleitet.
