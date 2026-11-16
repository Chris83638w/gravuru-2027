# Enger Operator-Updateplan für das bestehende Hauptacryl

**Lokal umgesetzt, noch nicht mit dem privaten Host verbunden. Kein produktiver Lauf und keine Live-CLI.** Der Adapter aktualisiert ausschließlich ein vorhandenes natives Produkt über das bestehende `repository.importBatch`. Er besitzt keine Shopify-, Binding-, Katalogfreigabe-, Veröffentlichungs- oder DB-Konstruktorfunktion. Appcode, v9 und die bisherigen Zielentwürfe bleiben unverändert.

Die neue Datei heißt ausdrücklich **Operator-Update-Review** mit `reviewHash`, nicht ProductGroup-Plan/`pgp`/`planHash`. Sie schließt die belegte creation-only-Lücke, ohne das Hauptprodukt neu anzulegen. Einmaliger Importschlüssel: `issue230.main-acryl.16190784602492.rev1-to2`. Das native Journal blockiert denselben Schlüssel mit anderem Fingerprint. Fingerprint und Reviewhash werden aus dem tatsächlichen JSON selbst berechnet, nicht aus ungeprüften mitgelieferten Dokumenthashes übernommen.

## Tatsächliche Readiness

`readiness.json` bleibt gesperrt: Der neue echte Kategorien-/Ressourcen-Kopienbefund, die Beobachtung durch den vollständigen tatsächlichen nativen Validator und die endgültige Excel-Nachtragsakte fehlen noch. Deshalb gibt es hier **keinen echten produktiven reviewHash und keinen Freigabebeleg**. Die Vorlage `observation-required.json` enthält absichtlich null/offen; sie wird vom Preparer zurückgewiesen. Die neun gezielten Tests und `copy-pilot-proof.json` belegen den Mechanismus ausschließlich auf selbst erzeugten nativen SQLite-Testdaten und ihrer separaten Kopie. Deren IDs, Ressourcenbelege und Zustimmung sind ausdrücklich synthetisch.

Die feste produktive Defaultpolicy enthält:

- `gravuru` / Store `acryl` / `gravuru-design.myshopify.com`, Shopify16190784602492.
- Native cfg `cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0`, erwarteter Kopf1, neuer Stand2, Status weiterhin draft/unveröffentlicht.
- Alter Bindinghash `d2886e119ea9715af2b8905ebab8ecc1d199b07f8653476ce5e0fa26cd8cca79`.
- Zielgruppenhash `ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407`, Zielbindinghash `f0bb7d95e89e3aae66ab04454d6476132fe197aaae7c1da48ce8209ced62d285`.

Nur synthetische Unit-/Kopientests injizieren eine andere Policy in die Modul-API. Die CLI hat keine Policy-, ID- oder Hash-Overrides und keinen Ausführungsbefehl. Beide Dokumenthashverfahren bleiben getrennt; der eigene `reviewHash`/Importfingerprint nutzt den lexikografischen Stringserializer über den ausdrücklich benannten Review-/Importinhalt.

## Vorhandene native Hooks, kein neuer Transaktionsmechanismus

`captureUpdateObservation(context,target,{evidence})` verlangt das injizierte echte Repository und ruft `head/get/validate/previewMetadata` auf. Die vollständige native Verdrahtung muss `validateProductDocument`, Ressourcenauflösung, Assetvalidierung und Fertigungsauflösung wie `http.mjs:156` enthalten. Eine einfache Identitätsfunktion ist kein zulässiger Produktivvalidator. Tatsächliche Kopf-/Dokument-/Metadatenhashes und tatsächliche Ressourcenpins werden in die Beobachtung übernommen; der Preparer bindet sie an den konkreten Zielinhalt.

Der aktuelle Binding-Read-Snapshot ist kein allgemeiner Schutz mehrerer Profil-DBs und wird nicht als solcher ausgegeben. Stattdessen verwendet `guardedMetadataSnapshot(nativeSnapshotMetadata,readResourcePins)` den **bereits vorhandenen `snapshotMetadata`-Hook des nativen Repository**. Dieser Hook wird bei `append` innerhalb der `importBatch`-Transaktion aufgerufen. Er verlangt vor dem tatsächlichen SQL-Insert exakt die freigegebenen Dokument-/Metadaten-/Ressourcenpins; ein Fehler wird vom nativen Repository als `invalid_snapshot_metadata` geworfen und rollt Produktrevision, Katalogindex und Importjournal zurück. Die gezielte Driftprüfung belegt genau diesen Zeitpunkt.

Das Repository muss mit diesem Wrapper als seinem tatsächlichen `snapshotMetadata`-Callback bereitgestellt werden. Der Adapter prüft die Verdrahtung vor dem Import über `previewMetadata` und den Aufrufzähler des Wrappers. Er konstruiert selbst keine Datenbank, errät keinen Hostpfad und verändert keine bestehende Appinstanz. `readResourcePins(document)` ist ein frischer synchroner Operatorleser der tatsächlichen Profilbibliothek; kein fest eingebautes JSON und keine alte Kopienantwort als Live-Leser. Ein späterer privater Anschluss muss diesen Kontext exakt nachweisen. Das ist keine behauptete globale Cross-DB-Transaktion: kontrolliert werden die tatsächliche native Metadatensnapshot-Ausgabe und die unmittelbar dazu geprüften Pins.

`executeApprovedUpdate` führt unter dem nativen Schreiblock in `beforeWrite` nochmals aus:

1. Unveränderte Revision1 samt Preimage-Metadatenhash; tatsächlichen aktuellen Produktkopf und Journal prüfen.
2. Ziel erneut durch den wirklichen nativen Validator prüfen; keine Normalisierung darf unbemerkt den freigegebenen Hash verändern. Frische Ressourcen-/Metadatenpins vergleichen.
3. Genau einen Updateeintrag mit fester cfg-ID, erwarteter Revision und berechnetem Importfingerprint importieren. Kein create-Fallback.
4. Dieselbe cfg-ID/Revision2, beide Dokumenthashes, Metadatenhash und Journal exakt zurücklesen. Wiederholung ist nur bei identischem Journal und unverändertem Kopf2 ein No-op; spätere Revision3 oder fremder Fingerprint sind Konflikte.

Die Ergebnisdatei (`receipt`) nennt eigenen Hash, reviewHash, approvalHash, Excel-SHA, Importkey/Fingerprint, tatsächliche Revision und neueRevisionen0/1. Der Aufrufer kann sie mit `writeNewJson` unveränderlich neu ablegen. Bricht die Prozessantwort nach einem bereits erfolgreichen Commit ab, ermöglicht dasselbe native Journal den eindeutigen Wiederholungsnachweis; keinen neuen Key zum Umgehen verwenden. Ein unvorhergesehener Readbackfehler nach Commit bedeutet Stop/Prüfung, keine behauptete automatische Rücknahme des bereits erfolgten Updates.

## Ressourcennachweis und Autoritätsgrenze

`observation.resourcePins` enthält nur geordnete Kategorien samt Zuordnungshashes, Settingsrevision/-hash, verwendete Profiltypen/IDs/Revisionen/Dokumenthashes, den Hash der vollständigen tatsächlichen nativen Profilauflösung sowie den Fertigungspin oder ausdrücklich null. Produktdokument und vollständige Profil-/Kundendaten gehören nicht in den kurzen Review.

Der neue Kategorienhelfer liefert Kategorien-/Settings-/Profilpins aus der Kopie. Für die Beobachtung müssen diese zum tatsächlichen nativen `previewMetadata`-Ergebnis passen. Die exakte private Abbildung der Bibliotheksfelder dokumentiert Claude beim Anschluss; keine Namen oder UUIDs raten. `resolutionSha256` ist der lexikografische Digest des tatsächlichen `metadata.profiles`-Snapshots, nicht der anders geformten öffentlichen Helferprojektion. Die Fertigungsdaten werden nur als ID/Revision/SHA gepinnt; vollständige native Metadaten bleiben intern und ihr Gesamtdigest wird verglichen.

`evidence` pinnt den echten Kategorienvergleich als Dateihash und den geprüften vollständigen Validatorquellstand. Der Adapter prüft feste Form, eindeutige Zuordnung und Hashes, **nicht die externe Wahrhaftigkeit einer behaupteten Nutzerantwort oder eines handgeschriebenen Prüfberichts**. Die Quelle muss der Operator tatsächlich verifizieren. Ein synthetisches `passed:true` oder eine frei erfundene Zustimmung erzeugt keine Autorität. Deswegen wird hier kein produktiver Beleg mit Platzhalterdaten erzeugt.

## Dateien erzeugen, noch nichts ausführen

Vorgesehener Paketort: `ops/issue230-main-update-review-20261111/`. Aus dem privaten nativen Kopien-/Operator-Kontext zuerst eine echte `observation.json` über `captureUpdateObservation` ablegen. Die konstante `origin.json` pinnt die unveränderte v9-XLSX/PGP-Herkunft. Dateipfade in den folgenden Aufrufen konkret ersetzen:

```sh
node ops/issue230-main-update-review-20261111/update-review-cli.mjs prepare \
  --target /PRIVATE/REVIEW/main-target-preserved-metadata.preview.json \
  --observation /PRIVATE/REVIEW/observation.json \
  --origin ops/issue230-main-update-review-20261111/origin.json \
  --output /PRIVATE/REVIEW/main-update-review.json

node ops/issue230-main-update-review-20261111/update-review-cli.mjs verify \
  --target /PRIVATE/REVIEW/main-target-preserved-metadata.preview.json \
  --review /PRIVATE/REVIEW/main-update-review.json
```

Kein `execute`-CLI-Befehl existiert. Der Export `executeApprovedUpdate(context,{review,approval,target,excelAddendumBytes,execute:true})` ist ausschließlich für den noch nachzuweisenden servereigenen Kontext vorgesehen; ohne ausdrückliches true, exakte Freigabe, Excelbytes und Metadatenhook wird abgebrochen.

## Excel und tatsächlicher Freigabebeleg ohne Hashkreis

Der neue Review pinnt die **vorherige v9-XLSX v6** und deren echten PGP-Plan als Herkunft. Erst wenn die echte Ziel-/Kategoriebeobachtung steht, entsteht ein neues versioniertes XLSX-Nachtragsblatt: reviewHash, exakte cfg-ID1→2, Zielhashes, Importfingerprint, erhaltene Namen/SEO/Kategorien und nur die bekannten Größenlabels; sämtliche bisherigen Preisblätter und Summen unverändert. Das neue XLSX verweist auf reviewHash, der Review selbst enthält keinen Selbsthash dieses künftigen XLSX. Ein externer Freigabebeleg pinnt danach reviewHash **und** den finalen XLSX-Dateihash.

`approval-evidence` zeichnet ausschließlich eine bereits tatsächlich gegebene Antwort auf. `decision.json` enthält `acceptedReviewHash` und `decision:{accepted:true,actor,quote,source,recordedAt}`; Wortlaut und Quelle müssen echt sein. Der neue Beleg ist nicht die Nutzerfrage und erzeugt keine Zustimmung:

```sh
node ops/issue230-main-update-review-20261111/update-review-cli.mjs approval-evidence \
  --target /PRIVATE/REVIEW/main-target-preserved-metadata.preview.json \
  --review /PRIVATE/REVIEW/main-update-review.json \
  --decision /PRIVATE/REVIEW/actual-user-decision.json \
  --excel /PRIVATE/REVIEW/Tuerschild-Acrylglas-3mm_v7.xlsx \
  --output /PRIVATE/REVIEW/main-update-approval.json
```

Alle Ausgaben verwenden `wx`,0600 und fsync; keine bestehenden Freigabe-/Reviewdateien überschreiben. Der exemplarische v7-Name bezeichnet den künftig anzulegenden Nachtrag, keine bereits erzeugte Akte. Dieser Freigabebeleg gilt im Adapter ausschließlich für **1 natives Produktupdate**. Die nachfolgenden Shop-/Binding-/Freigabeschritte müssen in der einmaligen konkreten Gesamtfreigabe separat ausdrücklich genannt und mit ihren eigenen unveränderlichen Belegen nachgewiesen werden; der Adapter führt sie nicht aus.

## Geplanter anschließender Umfang – außerhalb dieses Adapters

Nach dem separat genehmigten nativen Update:158 konkrete Preisreduktionen und30 Größenbeschriftungen am vorhandenen Shopify-Produkt, keine sonstigen Feld-/ID-/Medien-/Statusänderungen; vollständige808-Readbacks. Dann778 vorhandene Varianten in8 Blöcken bis100 an Revision2 binden, jeden Block mit frischen nativen Shopify-/Preis-/Kopfbelegen und `expectedHeads`;30 Restvarianten vollständig bei Revision1 belassen. Keine alten Belege über die native Frist hinaus verwenden. Anschließend technische Katalogfreigabe für genau Revision2/778 Bindungen, alte Rev1-Freigabe bleibt. Öffentliche Veröffentlichung und echter Bestell-/Produktionslauf sind nicht automatisch eingeschlossen. Die sechs Kleinproduktziele werden unabhängig zunächst über22 Kandidaten/126 relevante Varianten geklärt; keine ACTIVE-Übernahme oder Neuanlage hier.

## Gezielte lokale Prüfung

```sh
GRAVURU_UPDATE_TEST_CODE_ROOT=/ABSOLUTER/GEPRUEFTER/APP-CODE \
  node --test ops/issue230-main-update-review-20261111/update-review.test.mjs
```

Neun Fälle grün: erster nativer Kopienimport und Replay, unveränderte fremde Produkte/Quellkopie, fehlende ausdrückliche Ausführung, manipulierte Freigabe/Ziel/Excel, Kopfkonflikt, Ressourcen-/Validatoränderung, tatsächlicher Snapshot-Rollback, fehlender Hook, fehlender Kategorienbeleg, unveränderliche Ausgabedateien und spätere Revision-/Journalkonflikte. Die Fallanzahl wird nicht mit den einzelnen Assertions addiert. Keine weitere breite App-Suite wurde wiederholt.

Ein normaler Testlauf verändert den beigefügten Kopienbeleg nicht. Nur mit ausdrücklich gesetztem `GRAVURU_UPDATE_PILOT_PROOF=/NEUER/SEPARATER/PFAD.json` wird ein neuer synthetischer Beleg geschrieben, ausschließlich mit `wx`. Vorhandene Belege werden abgewiesen. Der betroffene erste Test wurde nach dieser Reprokorrektur gezielt nochmals grün geprüft; `test-repro-preservation.txt` bestätigt den unveränderten bestehenden Beleg-SHA.
