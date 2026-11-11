# Nativer Ressourcenpin-Leser für den Hauptupdate-Adapter

Separates additives Operatorpaket. Es ergänzt die bereits geprüfte Kontextbeschreibung um `createNativeUpdateResourcePinReader({profiles,productionProfiles})`. Die Funktion liefert einen synchronen `readResourcePins(document)` für den vorhandenen Update-Adapter. **Keine Datenbankkonstruktoren, Hostpfade, Schreibmethoden, Netzwerkzugriffe, neue fachliche Regeln, TTL oder automatische Wiederholung.** Das ursprüngliche Adapterpaket und dessen Manifest `79eb9502ad36ba793f13e69e6b47572267549e21fb64f6d4d81c747ae0f8aa98` bleiben unverändert.

## Anschluss

Vorgesehener Repositoryort: `ops/issue230-main-resource-pins-20261111/`. Die einzige fachliche Importabhängigkeit ist das benachbarte vorhandene `../issue230-main-update-review-20261111/update-review.mjs`, SHA256 `6f68a00b590b6dedb5af29229fea816e31b4cab2bea5e937a67ed220a9fdd571`. Dessen `digest` wird verwendet; keine zweite Hashimplementierung.

```js
import {createNativeUpdateResourcePinReader} from './read-resource-pins.mjs';
import {guardedMetadataSnapshot, captureUpdateObservation}
  from '../issue230-main-update-review-20261111/update-review.mjs';

// Belegte native Instanzen der zusammengehörigen Arbeitskopien injizieren.
const readResourcePins = createNativeUpdateResourcePinReader({profiles, productionProfiles});
const metadataSnapshot = guardedMetadataSnapshot(nativeSnapshotMetadata, readResourcePins);
// repository muss mit genau diesem snapshotMetadata-Callback konstruiert sein.
const context = {repository, metadataSnapshot, readResourcePins};
const observation = captureUpdateObservation(context, target, {evidence});
```

Das ist eine Anschlussbeschreibung, keine ausführbare Host-CLI. `nativeSnapshotMetadata` und vollständiger Validator sind weiterhin exakt aus dem Nicht-Formprodukt-Zweig von `http.mjs:156` zu übernehmen; `catalogOverview:productOverview` bleibt erforderlich. Die native Profilbibliothek hat keinen öffentlichen Tenantgetter: der Leser behauptet keine zuverlässige Tenant-/Storeprüfung dieser Instanzen. Richtige Kopien, Tenant `gravuru`, Auswahlkatalog/Fontregistrierung und Verdrahtung bleiben der konkrete Operatornachweis. Hauptzielhashes und cfg-/Revisionswachen bleiben unverändert beim vorhandenen Adapter. Auch dieser Leser erzeugt weder einen Kategorienfreigabebeleg noch einen produktiven `reviewHash` oder eine Zustimmung.

## Projektion und Änderungserkennung

Jeder Aufruf liest zwei komplette native Projektionen ohne Cache. Pro Projektion werden `profiles.settings()`, `profiles.resolve(document)`, die erforderlichen `profiles.get(id)`-Köpfe und `productionProfiles.resolve(document)` gelesen. Die Settingsrevision muss zur nativen Auflösung passen; jede tatsächlich gewinnende `source.profileRevision` muss zum gelesenen Profilpin passen. Anschließend müssen beide kompletten Projektionen gleich sein. Änderungen brechen ab; sie lösen keinen Retry und keine automatische Neuplanung aus.

Ausgabe exakt wie vom vorhandenen Adapter verlangt:

- `categoryIds`: ursprüngliche geordnete Kategorienliste.
- `categoryAssignments`: `{id,present,sha256}` für jede Kategorie, fehlende Zuordnung mit `null`.
- `settings`: `{revision,sha256}` über `{defaults,categories}`.
- `profiles`: stabil sortierte `{type,id,revision,sha256}` für alle tatsächlich geprüften Overrideprofile in Defaults, Kategorien und Produktzuordnungen, auch später überlagerte Profile. Inhaltsdigest über `{name,type,items}`.
- `resolutionSha256`: Digest des vollständigen nativen Auflösungssnapshots einschließlich Quellen, Warnungen und Bestsellerfilter.
- `productionProfile`: `null` oder `{id,revision,sha256}` des ausdrücklich gepinnten Fertigungsstands.

Alle selbst berechneten Digests verwenden den lexikalischen Stringserializer des Update-Adapters. Zeitstempel werden nicht in Settings-/Profilinhaltsdigests aufgenommen. Der Fertigungs-SHA bleibt der **native gespeicherte JSON-Bytehash**; er wird nicht neu kanonisiert. Die anders benannten Rohbyte-/Objektkanonisierungswerte des älteren SQL-Kategorienhelfers werden nicht ungeprüft übernommen. Ein neuerer Fertigungsprofilkopf verändert eine ausdrücklich gepinnte historische Revision nicht.

Jede native Ressourcenauflösung besitzt ihre eigene Profil-Lesetransaktion. Zwei vergleichbare Lesungen plus die bestehenden `beforeWrite`-/Snapshotprüfungen sind **keine gemeinsame Cross-DB-Transaktion** und kein universeller Schutz gegen beliebige externe Schreiber. Beim Kopienpilot gibt es keine fremden Schreiber. Spätere produktive Kontextfreigabe bleibt separat.

## Gezielter Beleg

`read-resource-pins.test.mjs`: **acht gezielte Fälle grün**, erster Lauf 7/7 in `tests.txt`, anschließend ausschließlich der neue achte Fall 1/1 in `test-shadowed-insert.txt`. Keine vollständige Suite wiederholt. Echte native `createProfileLibrary`-/`createProductionProfiles`-Instanzen mit synthetischen Daten, zusätzlich eine neu erzeugte Workshopdatenbank und ihre separate Arbeitskopie. Der Kopienpilot benutzt native Produkt-, Ressourcen-, Asset- und Fertigungsvalidatoren sowie die vorhandenen `captureUpdateObservation`, `guardedMetadataSnapshot` und `repository.importBatch`.

Belegt: alle Overridepins, Kategoriepriorität/Empty/Bestsellerfilter, native Fertigungs-SHA/historische Revision, Zeitstempelunabhängigkeit, Settings- und Profilrennen, Änderung eines überlagerten Profils, fehlende Ressourcen/ungeeignete Fertigung/asynchrone Leser, eine identitätserhaltende Revision plus unverändernder Replay, fremdes Produkt und Quelldatei unverändert. Ändert sich ein echtes Profil im tatsächlichen Snapshotinsert, werden die Workshoprevision und das Importjournal zurückgerollt. Die separate Profiländerung wird ausdrücklich **nicht** als mit zurückgerollt behauptet.

Der achte Fall ändert dabei gezielt ein überlagertes Defaultprofil: der vollständige finale native Metadatensnapshot bleibt nachweislich identisch. Trotzdem erkennt der zusätzliche Ressourcenpin-Guard die Änderung im echten Insert (`invalid_snapshot_metadata` / `snapshot_resources_changed`), Produktkopf bleibt1 und das Importjournal leer. Damit ist dieser Guard unabhängig vom Metadatenvergleich geprüft. `verification-initial7.json` bewahrt den ursprünglichen Beleg; `verification.json` beschreibt beide begrenzten Läufe mit ihren jeweiligen Test-/Loghashes.

```sh
# Am vorgesehenen Repositoryort, automatische Codewurzel ../..:
node --test ops/issue230-main-resource-pins-20261111/read-resource-pins.test.mjs
# Für eine isolierte Scratchablage:
GRAVURU_UPDATE_TEST_CODE_ROOT=/ABSOLUTER/APP-CODE node --test /SCRATCH/read-resource-pins.test.mjs
```

Ein Testlauf verändert keine Paketbelege und öffnet keine echte Operator-/Serverdatenbank. Testentscheidungen, Excelbytes, cfg-IDs und Ressourcen stammen ausschließlich aus synthetischen Fixtures. Kein Appcode geändert und keine Installation oder produktive Ausführung durch dieses Paket.
