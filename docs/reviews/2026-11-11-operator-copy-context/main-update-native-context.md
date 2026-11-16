# Hauptacryl: tatsächlicher nativer Anschluss für den Kopienpilot

Quellprüfung am Candidate `feebb04`, ausschließlich gelesen. Kein Konstruktor, Pilot, Test oder Serverzugriff ausgeführt. Ergänzung zu `ops/issue230-main-update-review-20261111/`; dessen Manifest und produktive Readiness bleiben unverändert (`reviewHash:null`). Die folgenden Ausschnitte sind Anschlussbeschreibung, keine Live-CLI und kein Ausführungsbeleg.

## API-genaue Zuordnung

| Zweck | Tatsächliche API / Quelle | Bedeutung für diesen Hauptprodukt-Pilot |
|---|---|---|
| Vollständiger nativer Validator | `http.mjs:156`: `validateProductDocument(value)` → `profiles.resolve(document)` → `assets.validateDocument(document)` → `productionProfiles.resolve(document)` → `document` | Dies ist exakt der vorhandene Nicht-Formprodukt-Zweig. Das konkrete Hauptziel ist das Universalprodukt; `isFormProduct(document)` muss falsch bleiben. Kein bloßer Schema- oder Identitätsvalidator. |
| Produktmetadaten | `http.mjs:156`: `{profiles:profiles.resolve(document), productionProfile:productionProfiles.resolve(document)}` | Vollständigen nativen Rückgabewert intern erhalten. Nicht durch die verkürzte Operatorprojektion ersetzen. Der Adapter pinnt dessen gesamten lexikalischen Digest. |
| Bestehende Instanzen | `createTenantWorkshop` gibt in `http.mjs:1203` `repository`, `profiles`, `productionProfiles`, `assets`, `fonts` zurück | Vorhandene Getter können geprüft werden. Eine Instanz auf einer Live-Datei ist dadurch keine Instanz auf der isolierten Kopie. |
| Produktrepository | `createProductRepository({filename,tenantId,validateDocument,snapshotMetadata,catalogOverview})` in `repository.mjs:16` | Es gibt **keinen** Setter für den intern geschlossenen Metadatenhook. Für den Guard einen dedizierten Repository auf der Arbeitskopie konstruieren. Nicht `repository.previewMetadata` überschreiben: der echte Insert ruft weiterhin den Konstruktorcallback auf. |
| Katalogprojektion | `http.mjs:156`, `productOverview` aus `product-preview.mjs` | `catalogOverview:productOverview` für dieses Universalprodukt mitgeben. Der Repositorydefault `()=>({})` wäre für einen echten Updatepilot kein gleichwertiger Katalogindex. |
| Ressourcenauflösung | `profiles.resolve(document)` in `profile-library.mjs:253` | Intern eigene synchrone `BEGIN`/`COMMIT`-Lesetransaktion. Rückgabe: `selections`, `sources`, `settingsRevision`, `categoryPriority`, `warnings`. Validiert Profiltypen und Katalogzugehörigkeit; wendet Defaults, geordnete Kategorien, Produktzuordnung und Bestsellerfilter an. |
| Einstellungen | `profiles.settings()` oder `profiles.settings({revision})` in `profile-library.mjs:141` | Rückgabe `{revision,defaults,categories,updatedAt}`; kein Feld `document` und kein gespeicherter SHA. Für den Inhaltsdigest ausschließlich `{defaults,categories}` verwenden. |
| Ressourcenprofil | `profiles.get(id,{revision})` in `profile-library.mjs:217` | Rückgabe `{id,revision,name,type,items,createdAt,updatedAt}`. **Nicht** `get(id,revision)` und nicht `record.document`. Inhalt für den Digest ist `{name,type,items}`. Ohne Revisionsoption wird der aktuelle Kopf gelesen. |
| Tatsächlicher Auswahlkatalog | `profiles.catalog()`, `profiles.registerFonts(fonts.list())` (`http.mjs:149–150`) | Native Bibliothek wird mit `workshopCatalog(seedConfig.localResources)` initialisiert und um die Fontbibliothek ergänzt. Nicht ausschließlich aus dem neuen Zieldokument oder den 13 Motiven nachbauen. |
| Assetvalidierung | `assets.validateDocument(document)` in `design-assets.mjs:116` | Prüft vorhandene Material-/Szenenbilder, Foto-/Maskenassets, importierte Originalressourcen und editableSource. Sie konvertiert oder importiert dabei nichts. |
| Fertigungsprofil | `productionProfiles.resolve(document)` / `productionProfiles.get(id,revision)` in `production-profiles.mjs:49–59` | Hier ist die zweite `get`-Position tatsächlich die Zahl. `resolve` gibt `null` oder `{id,revision,document,sha256,createdAt,productionReady:false,blockers}` zurück und prüft Material, Methode, Stärke und Archivstatus. `sha256` stammt aus den gespeicherten JSON-Bytes; nicht durch einen anders kanonisierten Hash ersetzen. |

## Minimaler native Callback-Anschluss

Voraussetzung: `profiles`, `assets`, `productionProfiles` zeigen bereits nachweislich auf die **zusammengehörigen isolierten Arbeitskopien**, `copyWorkshopFilename` ist deren ausdrücklich benannter Workshop-Pfad, `tenantId` ist `gravuru`. Die Imports kommen aus dem geprüften Appcode; die vier Adapterexporte aus `update-review.mjs`. `readResourcePins` ist der unten beschriebene frische Leser dieses gleichen Kontexts.

```js
const nativeValidate = value => {
  const document = validateProductDocument(value);
  if (isFormProduct(document)) throw Error('Dieser Anschluss gilt nur für das Haupt-Universalprodukt.');
  profiles.resolve(document);
  assets.validateDocument(document);
  productionProfiles.resolve(document);
  return document;
};
const nativeSnapshotMetadata = document => ({
  profiles: profiles.resolve(document),
  productionProfile: productionProfiles.resolve(document)
});
const metadataSnapshot = guardedMetadataSnapshot(nativeSnapshotMetadata, readResourcePins);
const repository = createProductRepository({
  filename: copyWorkshopFilename, tenantId,
  validateDocument: nativeValidate, snapshotMetadata: metadataSnapshot,
  catalogOverview: productOverview
});
const context = {repository, metadataSnapshot, readResourcePins};
// Erst mit dem tatsächlichen Kategorienbefund und geprüfter Quellprovenienz:
const observation = captureUpdateObservation(context, target, {evidence});
```

`captureUpdateObservation` liest und validiert über diesen Kontext. Der Konstruktor davor ist **kein** read-only Audit: Repository-, Profil-, Fertigungs- und Assetkonstruktoren können Schemas/Initialwerte schreiben oder migrieren. Nur ausdrücklich entbehrliche **Arbeitskopien** verwenden; gesicherte Ausgangskopien unverändert halten. `createWorkshop(...)` dafür nicht aufrufen: es initialisiert zusätzlich viele fachfremde Dienste/Tabellen. Der native Bibliothekskonstruktor bietet kein `readOnly`-Argument; ein erfundenes solches Argument schafft keinen Schreibschutz.

## Exakte Projektion für `readResourcePins(document)`

Die APIs liefern alle Inhalte, aber **keine fertige** Adapterstruktur `resourcePins`. Der kleine private Leser muss die folgenden Felder synchron aus den tatsächlichen Instanzen projizieren; die Autorität bleibt beim belegten Kontext. Für die hier vorgeschlagenen Inhaltsdigests wird durchgehend `digest` aus dem Adapter verwendet (lexikalischer Stringserializer):

| Adapterfeld | Nativer Eingang / feste Projektion |
|---|---|
| `categoryIds` | Kopie von `document.categoryIds` in Originalreihenfolge: `extern-shopifyproductid-16190784602492`, danach `linie-acryl-tuerschilder`. |
| `categoryAssignments` | Für jede ID: `{id,present:Object.hasOwn(settings.categories,id),sha256:present?digest(settings.categories[id]):null}`. Keine fremden Kategorien exportieren. |
| `settings` | `{revision:settings.revision,sha256:digest({defaults:settings.defaults,categories:settings.categories})}`. Vollständige Settings bleiben intern; Hash/Revision genügen außen. |
| `profiles` | Alle tatsächlich geprüften `override`-Referenzen der vier Defaults, der zwei vorhandenen geordneten Kategorien und der Produktzuordnungen sammeln; nach `type:id` deduplizieren und stabil sortieren. Auch später überlagerte Referenzen zählen: der native Resolver prüft sie vor der Überlagerung. Je Referenz `profiles.get(profileId)` und `{type,id,revision,sha256:digest({name,type,items})}` übernehmen. Kein Profil erfinden; `inherit`/`empty` erzeugen keinen Pin. |
| `resolutionSha256` | `digest(profiles.resolve(document))`: der vollständige echte native Snapshot einschließlich Quellen, Warnungen und Reihenfolgeregel. **Nicht** der Digest der verkürzten Helferübersicht. |
| `productionProfile` | `const p=productionProfiles.resolve(document); p===null?null:{id:p.id,revision:p.revision,sha256:p.sha256}`. |

Beispiel für die korrekte Profilgetterform und Inhaltsprojektion:

```js
const p = profiles.get(profileId); // aktueller Kopf der echten Profilbibliothek
const pin = {
  type: p.type, id: p.id, revision: p.revision,
  sha256: digest({name: p.name, type: p.type, items: p.items})
};
// Historischen belegten Inhalt gezielt lesen:
const pinned = profiles.get(pin.id, {revision: pin.revision});
```

Der bestehende read-only Kategorienhelfer liefert **zusätzlich andere ausdrücklich benannte Hashverfahren** (`storedDocumentSha256`, `canonicalDocumentSha256`, `assignmentSha256`). Diese Werte dürfen nicht ungeprüft in die hier definierten lexikalischen Inhaltsfelder eingesetzt werden. Sein Bericht ist der gehashte Kategorienbeleg; native Auflösung und Adapterpins entstehen aus dem tatsächlichen Kontext. Fertigungs-SHA bleibt hingegen ausdrücklich der gespeicherte native SHA.

Für den isolierten Kopienpilot gibt es keine konkurrierenden Schreiber auf den Profil-/Assetkopien. Beim späteren privaten Anschluss müssen Settings-/Profilköpfe vor und nach der Projektion unverändert sein, `nativeResolved.settingsRevision` zur gelesenen Settingsrevision passen und die Auflösung wiederholt denselben vollständigen Wert ergeben; Drift bedeutet Abbruch. Der Adapter liest Pins mehrfach und vergleicht außerdem den tatsächlichen Metadatensnapshot unmittelbar vor dem Insert unter der nativen Produkttransaktion. Das ist **keine gemeinsame Transaktion** über Workshop-, Profil- und Assetdatenbank und kein universeller Schutz vor beliebigen externen Schreibern.

## Genau noch von Claude benötigter privater Kontext

1. **Die drei zusammengehörigen Kopienpfade**: Workshopdatenbank, `profiles.sqlite`, `design-assets.sqlite`, dazu Herkunft/Backupstand und dass nur die neue Arbeitskopie geöffnet wird. Die App leitet die zwei Begleitdateien gewöhnlich aus dem Workshopverzeichnis ab; tatsächliche Hostpfade sind hier nicht belegt und werden nicht geraten.
2. **Der echte Ressourcen-/Fontkatalog dieser Appinstanz**: bevorzugt belegter Rückgabestand von `profiles.catalog()`; andernfalls tatsächlicher `seedConfig.localResources`-Ursprung plus `workshopCatalog(...)` und registrierte `fonts.list()`. Ohne diese Daten ist die native Katalogzugehörigkeitsprüfung nicht nachgestellt. Keine Geheimnisse/Schlüssel nötig.
3. **Aktiver geprüfter Appcode und Metadatenhook-Verdrahtung**: tatsächliche Modulpfade/Quellhashes sowie derselbe `metadataSnapshot`-Callback bei Repositorykonstruktion und im Context. Der neue Anschlussquelltext mit diesem vollständigen Validator ist die sinnvolle Quelle für `nativeValidatorSourceSha256`; nicht ein unbelegter Platzhalterhash.
4. **Der echte Kategorienvergleichsbericht und seine Datei-SHA** für das erhaltene Metadatenziel `ae09cbf6…e407` / Binding `f0bb7d95…d285`. Daraus erst `categoryComparisonPassed:true` mit belegtem Erfolg setzen. Das Ziel selbst, Origin-v9-Excelpin und der feste cfg-/Rev1-Preimage sind bereits gepinnt; sie werden nicht neu gewählt.

Tenant `gravuru`, Store `acryl`, Shopdomain, cfg-ID, erwartete Revision1 und Zielhashes sind bereits fest. Keine zusätzliche UUID-/Modulprofilanlage, kein Shopifytoken, keine Session-/Händlergeheimnisse und kein Katalog-/Shop-/Binding-Schreiber werden für diesen Anschluss benötigt. Die sechs Kleinproduktidentitäten und die endgültige konkrete Produktfreigabe bleiben davon getrennt. Nach belegtem Kopienkontext kann der bereits vorhandene Adapterpilot verwendet werden; dieser Lesereview behauptet noch keinen erfolgreichen tatsächlichen Serverkopienlauf.
