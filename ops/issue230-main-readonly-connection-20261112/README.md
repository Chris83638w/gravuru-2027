# Main-only: echter Readonly-Anschluss für Plan und Reconcile

Separates additives Operatorunterpaket. Der eingefrorene Main-v2-Operator, seine 25 Dateien und sein Manifest `de182709cb4c004d338f666186cfa2785b755a708605adcf4d58b0c25721f416` bleiben unverändert. Keine Zugangsdaten, keine Live-Dateipfade und kein produktiver Lauf in diesem Paket.

Der neue Anschluss ersetzt ausschließlich den nativen Teil von `createConnections({readOnly:true,mode:'plan'|'reconcile'})`. Er ruft **keine** `createWorkshop`, `createProductRepository`, `createProfileLibrary`, `createProductionProfiles`, `orderIntake.idBindings` oder Checker-Konstruktion auf. Er öffnet ausdrücklich zwei vorhandene SQLite-Dateien mit `{readOnly:true}` und setzt auf beiden `PRAGMA query_only=ON`. Das Workshop-Schema muss wie die bestehende native Datenbank Version 4 und die verwendeten Tabellen müssen mandantengebunden sein. Keine Migration, Tabelle, Galeriecache oder Index wird angelegt.

## Feste Daten- und APIgrenze

`adapter-factory.mjs` prüft 12 native Quellpins gegen den beschriebenen Runtime-Stand `f85390bd3494920679b06c3b39cabf96c95c1343` und die beiden unveränderten Operator-Dateipins. Die feste 808er-Auswahl stammt aus dem vorhandenen `loadPinnedMapping` mit dessen Gzip-/JSON-Prüfsummen. Kein Titel-, Alias- oder Varianteninventarscan.

- Scope genau `gravuru`, `acryl`, `gravuru-design.myshopify.com`, Shopifyprodukt `16190784602492`, natives Produkt `cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0` und die gepinnten 808 Varianten. Getter erlauben nur Revision 1 oder 2 und die tatsächlichen bekannten Binding-Dokumenthashes. R2-Metadaten müssen exakt den vorhandenen Pin `52476368aa083eebf168c30f1f2ea54415b18f1d6c02b53e41173fa58a2ef075` erfüllen.
- `repository.get(id,{revision})` gibt die native Recordform einschließlich unveränderter `metadata`, `publishedRevision`, `createdAt`, `updatedAt` zurück. Historischer R1 bleibt auch bei Kopf R2 lesbar. Es gibt kein `save`, `importBatch`, `create` oder `head`-Schreiben. R1-Metadaten werden unverändert gelesen; ein zuvor nicht vorhandener R1-Metadatenhash wird nicht erfunden.
- Registry: vorhandenes `createShopProductBindingStore({database,orderIntake,tenantId,storeId,shopDomain,adapter,readOnly:true})`, davor derselbe native `createShopBindingReadAdapter`. Die exportierte Registry enthält die geforderten Scopefelder und ausschließlich `resolveMany`. Sie prüft Auswahl, tatsächliche cfg/R1/R2-Hashes und die passenden Metadaten innerhalb des vorhandenen synchronen Lese-Snapshots. Kein Provider und keine Aktivierung.
- `orderIntake.bindingPricing(bindingId)` liest alle tatsächlichen alten oder neuen Verträge anhand ihrer Binding-ID und ihrer festen Shop-/Main-/Varianten-/R1-R2-Zuordnung. Explizites SQL-null bleibt null; keine Vertragsneuberechnung, kein Datenverlust. `bindings()` liest nur Historien der 808 IDs und bricht bei einer fremden cfg/Revision ab. Es gibt keinen `idBindings`, `withBindingTransaction` oder Freigabeschreiber. Der für die native Store-Konstruktorsignatur erforderliche `bindVariants` ist ein stets werfender Schreibstopp.
- Katalogfreigaben werden mit dem unveränderten `createCatalogLiveOrders(...).approvals(inputs)` gelesen. Alle 808 historischen R1-Abfragen und die R2-Abfragen bleiben möglich; dessen rohe SQL-Dokumenthashprüfung wird beibehalten. Die schreibende `approve`-Methode wird nicht weitergegeben.
- Fertigungsprofile: eigener **lesender** SQL-Getter mit denselben konkreten Revisions-/Tenant-Joins wie `production-profiles.mjs`; Kompatibilität nutzt die vorhandenen reinen `productionSubject`/`profileBlockers`. Zusätzlich stimmt SHA256 der gespeicherten Profil-JSON-Bytes mit der gespeicherten SHA überein. Nur die zwei gepinnten Main-Dokumente dürfen diesen Getter verwenden. Kein Profil wird angelegt, auf einen aktuellen Kopf umgebogen oder als fertigungstauglich erklärt.
- Die Ressourcenbibliothek für Schriften/Motive/Farben wird nicht neu aufgelöst. Die bereits eingefrorenen vollständigen Revisionsmetadaten werden erhalten. Das ist kein Ersatz für einen Ressourcenänderungs-/Importvalidator oder eine neue Produktionsfreigabe. Beide SQLite-Verbindungen sind getrennte Lesesichten; keine atomare Cross-DB-Transaktion wird behauptet.

Das Vorbild ist `scripts/lib/gallery-production-readonly-target.mjs`. Dessen vorhandene 404er-Produktgrenze und Annahme „kein Fertigungsprofil“ werden nicht auf Main übertragen. Main hat eigene exakte 808 IDs und ein tatsächliches Fertigungsprofil. Der neue Reader besitzt keine Galerieauflistung und gibt keine Bestellungen/Kundendaten aus.

## Private Verdrahtung

Einmal anhand der tatsächlich bekannten lokalen Pfade vorbereiten:

```js
const adapterFactory = await createMainProductionReadonlyAdapterFactory({
  codeRoot,             // geprüfter vorhandener Runtimebaum, keine Hostkonstruktion
  operatorRoot,         // unverändertes Main-v2-Paket
  workshopFilename,    // absoluter realer Pfad der vorhandenen workshop.sqlite
  profilesFilename,    // absoluter realer Pfad ihrer vorhandenen profiles.sqlite
});

// Innerhalb der privaten createConnections-Funktion, nur für plan/reconcile:
const target = await adapterFactory({readOnly, mode});
// target.native ist schon createMainReadOnlyGateway({workshop,registry}).
// Der bestehende Preisanschluss erhält exakt diese Getter:
const pricing = createMainPricingConnection({
  native: pricingFunctions,
  repository: target.workshop.repository,
  orders: target.workshop.orderIntake,
  shopify, targetDocument, evidence, verifyActiveFunction,
});
return {shopify, native:target.native, pricing, close:target.close};
```

Fehlschläge beim anschließenden privaten Zusammensetzen müssen `target.close()` aufrufen. Der `shopify`-Gateway wird für diese Modi nur mit dem vorhandenen authentifizierten **Lesetransport** erstellt; kein `graphqlWriteOnce` injizieren. `createMainPricingConnection` erhält dabei seine vorhandene Schnittstelle, deren `writePricingOnce` ohne Schreibtransport ohnehin abweist. Der native AdapterFactory-Modus verweigert `apply` und `finish-catalog`, bevor eine DB geöffnet wird. Die schreibende produktive Factory wird durch dieses Paket weder ersetzt noch freigegeben.

Tatsächlich noch privat zuzuordnen sind die zwei vorhandenen DB-Dateipfade und der geprüfte Runtime-/Operatorpfad. Für die **vollständige** bestehende `createConnections` bleiben außerdem der Eigentümer-App-Lesetransport, der echte aktuelle Functioncallback sowie Ziel-/ursprüngliche Evidenzeingaben erforderlich. Diese bereits bekannten Gegenstellen werden hier nicht durch Platzhalter erfunden. Es gibt keine Credential-/Environment-Erkennung und keine automatische Auswahl fremder Datenbanken.

SQLite wird bewusst nicht mit `immutable=1` geöffnet: reale vorhandene WAL-Zustände werden vom nativen SQLite-Leseweg berücksichtigt. Keine WAL-Dateien entfernen oder für diesen Anschluss einen alten Snapshot als aktuellen Shopzustand ausgeben. Readonly schützt die SQL-Daten; daraus wird keine Aussage abgeleitet, dass SQLite nie betriebliche Sidecar-Dateien berührt.

## Kleine lokale Fixtureprüfung

`tests.log`: 3/3 gezielte Fälle bestanden, keine Skips. Tatsächliche native ReadOnly-Registry, Adapter und Katalogleser auf ausschließlich synthetischen kleinen SQLite-Dateien: 808 gepinnte IDs mit 778 R2-/30 R1-Heads, 808 weiterhin lesbare R1-Verträge, native Metadatenform/Fertigungsprofil/Katalogfreigaben. Ein direkter DDL-Versuch auf der verwendeten Workshopverbindung wird durch SQLite abgewiesen; nach dem Lesen bleiben beide Datenbankdateien bytegleich. Dokument-/Metadatenpinabweichung und fremder Fertigungsprofilmandant werden abgewiesen. Die produktive Factory akzeptiert die synthetischen Dokumentpins nicht und weist Schreibmodi vorher ab.

Nach der letzten engen Begrenzung des historischen `bindings()`-Getters wurde nur der betroffene erste Fall erneut ausgeführt (`scoped-history-test.log`: 1/1). Er prüft auch die 1.586 erhaltenen R1/R2-Historienzeilen. Keine neue breite Suite. Die minimalen gespeicherten Fixture-Dokumente sind keine native Main-Produktvalidierung, reale Produktionsprofile oder echte Hostdaten.

Reproduktion in einer separaten Paketkopie mit Node 24:

```sh
GRAVURU_NATIVE_ROOT=/ABS/gepruefter-runtime \
GRAVURU_MAIN_OPERATOR=/ABS/unveraendertes-main-v2 \
node --test readonly-target.test.mjs
```

Der Test schreibt nur neue synthetische Dateien unter `.test-runs/`; diese gehören nicht ins Paket. Der low-level `openScopedReadonlyTarget` hat für Fixtures ein ausdrückliches `expected`-Argument. Die tatsächliche `adapterFactory` leitet diesen Scope ausschließlich aus dem gepinnten Main-Operator/Mapping ab und bietet keinen erwarteten Hash-Override.
