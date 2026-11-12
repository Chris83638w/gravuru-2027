# Issue230: genau sechs neue Shopify-DRAFTs

Lokales Operatorpaket, 12.11.2026. Keine App-/API-/Hoständerung und keine Ausführung gegen Shopify. Die Produktinhalte sind die sechs unveränderten, unabhängig gegen v9 geprüften Kleinproduktverträge: Acryl 5×2/6×2/8×2 mit je zehn Varianten, Edelstahl dieselben Größen mit je fünf Varianten. Insgesamt 45. Kein Hauptproduktupdate, keine Änderung an den 16 ACTIVE-Altprodukten, keine Veröffentlichung/Löschung/Medienmutation.

## Warum dieser Anschluss erforderlich ist

`createShopDraftTransfer` besitzt bereits DRAFT-productSet, einen aus Shop+cfg abgeleiteten stabilen Handle, vollständigen Varianten-/Preisreadback und ein dauerhaftes Claim/Unknown/Reconcile-Journal. Es erzeugt zunächst klassische Formbindungen. Ohne den hier ergänzten Operatoranschluss würden diese Bindungen **ohne** Personalisierungsvertrag festgeschrieben; die native API erlaubt dessen nachträgliches Ergänzen nicht.

Die Komposition stellt daher zuerst den neu entstandenen eigenen DRAFT vollständig fest, schreibt und liest dessen aus dem tatsächlichen nativen Dokument abgeleiteten Preisvertrag und ruft erst danach synchron das unveränderte `orders.bindVariants` mit diesem geprüften Vertrag auf. Der Callback startet kein Netzwerk. Danach folgen die vorhandenen nativen ID-Plan-/CAS- und Katalogfreigabedienste. Es wird keine zweite Preisformel eingeführt: Grundpreise kommen aus `prepareShopProduct`; der vorhandene `capturePersonalization` validiert jeden Vertrags-/Variantenwert einschließlich Staffel und ausgeschalteter Uploadrechte.

## Tatsächliche Eingaben, keine erfundenen Ziel-IDs

`prepareSixDrafts(entries,{native})` erwartet genau sechs Einträge:

```js
{ group: 'Tuerschild-Acrylglas-3mm-5x2_v2',
  plan: groups.getPlan(actualPlanId),
  execution: actualGroupsExecuteResult,
  record: repository.get(actualGroupsExecuteResult.products[0].productId) }
```

Die anderen fünf Gruppennamen stehen in `references.json`. Der Gruppen-execute gehört zum gesondert bestätigten nativen Anlageablauf und wird **nicht** von diesem Paket aufgerufen. Ein Vorbereitungsquellenrecord oder ein hier erfundener cfg-/pgp-/Shopify-Wert wird nicht eingesetzt. Der Vorbereiter prüft den vollständigen nativen Planhash, execute-Zuordnung, R1/draft/publishedRevision null, abweichende Ziel-/Quellen-ID, vollständigen Dokumentfingerprint und die bestätigte v9-Gleichheit mit ausschließlich abgebildeter Modul-/Motivprofil-ID. Alle 45 Preis-/Optionszeilen müssen zu den nativen Shoprequests passen.

Die sechs konkreten Requests können erst nach dem tatsächlichen nativen execute entstehen, weil Handle, Quelltag und native cfg-ID daraus abgeleitet werden. Vorher liegt bewusst kein scheinbar fertiger produktiver Request mit Kopien-IDs vor. Die einzige Nutzerzustimmung zum inhaltlich definierten Gesamtpaket kann diese technische ID-Erzeugung einschließen; der Operator bindet ihren echten Beleg anschließend an den errechneten `reviewHash`. Das Paket verlangt keine zweite Nutzerantwort nur wegen frisch erzeugter IDs.

Optionaler Offline-Aufruf (keine Konstruktoren/Netzverbindung):

```text
node prepare-requests.mjs --native-root <geprüftes-f853-Repo> --executed-records <sechs-tatsächliche-Records.json> --out <neue-private-Requests.json>
```

## Vorhandene Hostobjekte einstecken

Der Operator verwendet die bereits bewiesene native Acryl-Fabrik und seine authentifizierten Shopify-Clients. Dieses Paket enthält absichtlich keine geratene private Startdatei, Datenbankadresse, Tokenlesefunktion oder neue HTTP-Route. Erforderlich:

- `repository` und `orders = workshop.orderIntake`, Tenant `gravuru`, Store `acryl` (auch für die nativen kleinen Edelstahlprodukte).
- `transferJournal = workshop.customerDrafts.shopDraftTransfers`, vorhandener dauerhafter nativer Transfer-Speicher.
- Vorhandener `createShopBindingReadAdapter` über genau diese Workshop-/Profilinstanzen; dessen `productionProfileScope` muss die tatsächliche Fabrik belegen.
- `draftTransport` aus dem vorhandenen `createShopDraftTransport` mit dem bestehenden privaten Draftkontext; kein selbst konstruierter Token im Paket.
- Authentifizierter `client.graphql(query,variables)` mit `{data,errors}`-Antwort und nativer `readonlyReader.inspectVariants`. Der Operatoradapter nutzt ausschließlich drei festgelegte GraphQL-Operationen in `shopify-steps.mjs`; Shop/App-Identität wird zurückgelesen.
- Tatsächlicher Händler-`principal`; keine synthetische Rolle als Produktionsauthentifizierung verwenden.
- Bestehender Nutzerbeleg `approval.id`, gebunden an `approval.reviewHash`. Das native Katalogfreigabefeld speichert genau diesen Beleg; es ist persistent und keine Shopify-Veröffentlichung.

```js
const native = await loadNativeFunctions(verifiedRuntimeRoot);
const review = prepareSixDrafts(actualExecutedEntries, {native});
const shop = createSixDraftShopSteps({client, readonlyReader, native});
const log = openPrivateLog(newPrivateExecutionLogPath);
try {
  const result = await executeSixDrafts(review, {
    native, repository, orders, transferJournal, draftTransport, shop, adapter,
    principal, approval: {id: actualApprovalReference, reviewHash: review.reviewHash},
    checkpoint: log.checkpoint, action: 'create'
  });
  // Result exklusiv in neuer privater Datei archivieren; keine Vollmodelle loggen.
} finally { log.close(); }
```

Dies ist der konkrete Integrationsvertrag, kein Nachweis, dass ein noch nicht übergebener privater Host bereits so verkabelt ist. Vor dem späteren echten Lauf muss der Operator seine tatsächlichen Instanzen/Clientquelle nennen. Kein beliebiger DB-Konstruktor wird im Paketcode versteckt.

## Reihenfolge und Wiederaufnahme

1. Alle sechs aktuellen nativen Zielrecords/Requests vor dem ersten Schreibschritt erneut vergleichen.
2. Native Transferabsicht und Handlelookup; höchstens eine Anlage je nativer Transferidentität. DRAFT-status, Handle, Titel/SEO, Quelltag, vollständige 5/10 Optionen und Preise zurücklesen.
3. `$app.personalization`: bestehender v1-Preisvertrag, Revision 1 für das neue Produkt; Variant-IDs/Grundpreise aus Readback plus nativen Varianten, Zuschläge und Staffel direkt aus gespeichertem Dokument. Jede Variante nativ validieren. Nur bei wirklich fehlendem Metafeld mit `compareDigest:null` schreiben; widersprechende bestehende Werte stoppen. Danach vollständiger Rücklesebeleg.
4. Erst jetzt klassische native Bindungen samt Preisvertrag; anschließend pro Produkt ein frischer nativer Bindingcheck (5/10, höchstens100) und unmittelbare native CAS-Persistenz. Alle ID-Heads, Preise und gespeicherten Personalisierungsverträge zurücklesen.
5. Native versionsgebundene Katalogfreigabe für genau diese Produkt-/Revisionspaare schreiben und je Variante zurücklesen. Keine Bestellungen, Warenkörbe oder Fertigungsfreigabe.
6. Erst danach `templateSuffix:konfi` (nur aus leerem Wert) und `custom.customization_id` mit tatsächlicher neuer cfg-ID (nur fehlendes Metafeld/CAS). Abschließend nochmals vollständiger DRAFT-/Varianten-/Preis-/Einstiegsreadback. Keine Variante wird aktualisiert, entfernt oder als zusätzliche Designvariante angelegt.

Unbestätigte Schreibantwort: sofort stoppen, kein automatischer Retry. Der native Transfer bleibt `unknown`; mit **explizitem** `action:'reconcile'` nur den bestehenden Entwurf zuordnen. Ein unbekannter Create ohne bestätigten Remoteentwurf wird niemals nochmals gesendet. Noch gar nicht begonnene Gruppen dürfen im selben weiterhin autorisierten Gesamtpaket danach erstmals angelegt werden. Preis-/Einstiegsmetafelder werden bei identischem Rücklesewert übersprungen; neue writes sind nur CAS-geschützte Ergänzungen fehlender Werte. Das Templateupdate ist auf dieselbe bereits identifizierte neue DRAFT-ID begrenzt und idempotent. Shopify bietet dafür keine native Gesamttransaktion mit SQLite; das Paket behauptet eine solche nicht. Das fsync-JSONL ergänzt das dauerhafte native Transferjournal um Teilschritte.

## Einstieg, Theme und Medien: tatsächliche Quellen

Der echte Themeexport `work/restabschluss/main-shop-entry-theme-evidence.json` (11.11., Theme190984126844/MAIN) belegt `product.konfi`, den globalen Footer-Einstieg und `custom.customization_id` als Nichtleer-Sichtbarkeitsschalter. Die maßgebliche Zuordnung erfolgt serverseitig über Shopify-Produkt-/Varianten-ID und native ID-Heads; der Metafeldwert ersetzt diese nicht. Der native cfg-Wert für neue Produkte entspricht zusätzlich der bestehenden Referenz `scripts/prepare-doorbell-shopify.mjs::activateAfterBinding`. Keine historischen `LEER`-/Hauptformatwerte werden auf kleine Produkte übertragen.

Die vorhandene Referenz `docs/handoffs/2026-11-03-issue139-grabstecker-drafts/laufskripte/upload-stakes139.mjs` belegt dieselbe v1-Preisvertragskonstruktion mit `capturePersonalization` und Metafield-CAS. Die aktuelle Quelle `cart-personalization.mjs` ist gepinnt. Die sechs Kleinprodukte benötigen keinen Vektorlogo-v2-Vertrag, weil beide Uploadmodule ausgeschaltet bleiben; gespeicherte Zuschlagswerte werden dennoch unverändert gemäß dem nativen Validator übernommen.

Es liegt in den sechs geprüften Produktakten keine konkrete freigegebene Zuordnung von Shopify-Hauptbilddateien vor. Deshalb überträgt dieses Paket **keine Medien** und verwendet H1 des großen Acrylprodukts nicht. Das ist kein Hindernis für die technische DRAFT-Anlage, aber eine genaue Grenze der Produktseitenfertigstellung. Tatsächlicher Browser-/App-Proxy-Einstieg, Vorschau, Warenkorb/Bestellung und reales Mobilgerät sind durch lokale Adaptertests nicht abgenommen.

## Prüfungen und Grenzen

`six-drafts.test.mjs` verwendet die tatsächlichen sechs rekonstruierten Produktinhalte, eine neue private Wegwerf-SQLite und unveränderte native Repository-/Transfer-/Intake-/Binding-/Freigabekernfunktionen. Shopify-Transport und Authidentität sind **ausdrücklich synthetisch**; globaler Fetch ist gesperrt. Keine Nutzerfreigabe wird hergestellt, kein bestätigter produktiver Plan ausgeführt. Prüfungen: verlorene Create-Antwort/kein Zweitcreate, Reconcile, 45 Bindungen mit Preisvertrag vor Erstbindung, 6 native Freigaben, vollständiger Replay ohne Mutationen, Preis-/ACTIVE-/Vertrags-/Head-Drift und fehlende Händlerrolle. Ergebnisse siehe Testlog.

Portabler Testaufruf nach Übernahme nach `ops/issue230-six-draft-execution-20261112` (Node 24; vom Repo aus):

```sh
GRAVURU_NATIVE_ROOT="/absoluter/Pfad/zum/geprueften-Runtime-Repo" \
GRAVURU_SIX_COPY_RECORDS="/absoluter/Pfad/zu/sechsgruppen-20261112/records" \
node --test ops/issue230-six-draft-execution-20261112/six-drafts.test.mjs
```

`GRAVURU_NATIVE_ROOT` zeigt auf den Repoordner mit `app/`; `GRAVURU_SIX_COPY_RECORDS` auf den empfangenen Recordordner mit den sechs Gruppenunterordnern und `plan.json.gz`. Beide Eingänge werden nur gelesen. Neue Testdatenbanken entstehen ausschließlich im Testpaketordner unter `.test-private-*` und werden anschließend entfernt. Ohne diese Variablen bleiben die bisherigen lokalen Scratchpfade als Komfortstandard erhalten; außerhalb dieses Workspaces beide absoluten Pfade ausdrücklich setzen. `tests-relocated.txt` belegt den Lauf einer tatsächlich an einen anderen Ort kopierten Paketfassung mit diesen zwei Eingängen; der Ausführungscode blieb bytegleich.

Die vier direkt importierten nativen Funktionsdateien werden in `native-pins.json` geprüft. Ihre weiteren unveränderten Abhängigkeiten gehören zum vom Operator verifizierten Runtimebaum; vier Pins sind kein Vollbaumhash. Keine Liveausführung, keine echten Shopify-Produkt-IDs und keine Medien- oder Verkaufsveröffentlichung in diesem Paket.
