# Sechs Kleinproduktgruppen: native Identitäten auf Kopie lesen

Vorgesehener Repo-Ort: `ops/issue230-small-targets-copy-review-20261111/`. **Nur lesen**, kein App-Konstruktor, keine Migration, kein Serverstart, kein Import/Confirm/Execute, keine Shopabfrage. Der Helfer wählt keine Gewinner und legt nichts an.

Der veröffentlichte Shop-Lesebeleg enthält sechs Gruppen, **22 eindeutige Shopprodukte**, 32 Gruppenvorkommen und **126 eindeutige relevante Varianten**: Acryl5×2/6×2/8×2 je22, Stahl5×2 24 sowie6×2/8×2 je18. Die22 Produkte haben insgesamt2477 Varianten; deren übrige Varianten werden **nicht** erneut untersucht. Die16 eigenständigen ACTIVE-Schilder, fünf Sammelprodukte und ein Andenken-DRAFT bleiben getrennte Kandidaten. Status/Einordnung stammen ausschließlich aus dem gepinnten Audit, nicht aus einer neuen Live-Abfrage.

Feste Eingabe `docs/reviews/2026-11-11-small-products-duplicate-review/six-groups.json`, SHA256 `d2cb6cac1149da13db9ed9c2af83f27f3060a4531840636542e9fe95f4d6346f`. Die beigelegte `v9-source-aliases.json`, SHA `2ddc13a66c323ece8228867e1e8bf32388f7d82b129ff37128d37fb12a79f694`, pinnt die sechs tatsächlich gespeicherten inneren `config.profile.id`-Kennungen. `source-pin-check.json` bestätigt jede gegen OriginaldateiSHA und nativen Produktgruppenhash der lokalen v9-Quellen. Diese sechs lokalen cfg-UUIDs sind **Herkunftsbelege**, keine vorab bewiesenen Serverziele. Kein freier CLI-ID-/Hash-/Scope-Override.

## Präziser Umfang

- Alle Köpfe für genau126 bekannte Variant-IDs in `gravuru-design.myshopify.com`/Mandantgravuru werden per LEFT JOIN gelesen. Ein verwaister Kopf bleibt sichtbar. Ein falsches Produkt, falscher Store oder Hash wird als Konflikt gemeldet und nicht weggefiltert.
- Zugehörige `shop_product_binding_revisions` werden vollständig bis zur ausdrücklich begrenzten Prüfgröße getrennt ausgegeben, jeweils mit `isCurrentHead`. Mehr als10000 Historienzeilen oder1000 Kopfzeilen führen zum Abbruch, nie zu einem gekürzten Erfolg.
- `form_shop_bindings` für dieselben126 Variant-IDs wird separat gelesen, auch wenn beide neuen Registertabellen fehlen. Der historische Datensatz allein beweist keine aktuelle Shopprodukt-Zugehörigkeit. Fehlt nur eine der beiden neuen Registertabellen, ist das Schema unvollständig und wird abgewiesen.
- Zusätzlich: einmaliger exakter Lookup der sechs Aliasse **nur in gültigem JSON aktueller nativer Produktrevisionen**, mit `schema='gravuru-product/v1'`; keine Titel-, SKU-, Größen- oder alteRevisions-Heuristik. Mehrfachtreffer, archivierte Kandidaten und vorhandene ungebundene Entwürfe bleiben sichtbar. Sechs exakte lokale Quellen-UUIDs werden ebenfalls getrennt geprüft, ohne daraus eine Liveidentität zu behaupten.
- Für so belegte cfg-ID/Revision-Paare: aktueller Produktkopf, Revisionsstatus, Hash der gespeicherten JSON-Bytes und nativer ID-Binding-Dokumenthash. Vollständige Produktdokumente werden intern für diese Hashes gelesen; keine Vollmodelle, Font-/SVG-Daten, beliebigen Metadaten oder Preiswerte werden ausgegeben. Bestell-, Kunden- und Tokentabellen werden nicht abgefragt.

`identityAndHashConsistent` bzw. `consistentActiveBindingRows` prüft **nur Identität, Verknüpfung und Hash**. Es ist kein Nachweis nativer Nutzbarkeit: `archived`, `kind`, Revisionsstatus und weitere Runtimebedingungen sind damit nicht freigegeben. Die getrennt ausgegebenen Kopf-/Statusfelder mitlesen. `resolveMany`, Fertigungs-/Rechte-/Preis-/Assetvalidierung wurden nicht ausgeführt.

## Operatoraufruf auf vorhandener Sicherungskopie

Node24, aus Repo-Wurzel. `review_dir` ist ein tatsächlicher privater Prüfpfad. Bereits erzeugte konsistente Standalone-Kopie mit Endung `.copy.sqlite` verwenden; keine normale laufende WAL-Datei kopieren. Bekannte Live-Datenverzeichnisse, Links/Hardlinks und nichtleere WAL-/Journal-Dateien werden abgewiesen. Der identische bestehende `copy-guard.mjs` wird verwendet; zusätzliche Lesegrenzen liegen im Helfer.

```sh
review_dir=/ABSOLUTER/PRIVATER/PRUEFPFAD
node ops/issue230-small-targets-copy-review-20261111/inspect-small-targets-copy.mjs \
  --copy "$review_dir/workshop.copy.sqlite" \
  --groups docs/reviews/2026-11-11-small-products-duplicate-review/six-groups.json \
  --native-aliases ops/issue230-small-targets-copy-review-20261111/v9-source-aliases.json \
  --tenant gravuru --store-id acryl \
  > "$review_dir/small-target-identities-acryl.json"
```

`--store-id` ist die tatsächlich konfigurierte Registry-Storekennung dieser Kopie (`acryl` oder `legacy`), kein geratenes Materialmerkmal. Für einen nachgewiesenen separaten Legacy-Store dessen eigene Kopie und `--store-id legacy` benutzen. Fehlt `tenant_id` ausdrücklich in allen drei alten Produkt-/Revisions-/Formbindingtabellen, zusätzlich `--legacy-single-store true`; für moderne tenant_id-Tabellen muss das Flag fehlen. Gemischte Tabellenformen oder andere Mandanten werden abgewiesen. Storekennung und altes SQL-Schema sind verschiedene Angaben; das Legacy-Schemaflag allein legt keinen Store fest.

Alle DB-Handles öffnen `readOnly:true`, setzen `query_only` und halten eine Lesetransaktion. DatenbankSHA vor und nach dem Lesen mit 1-MiB-Puffer, kein Vollpuffer einer4-GB-Datei. Änderungen währenddessen führen zum Abbruch. Keine Nutzdatenänderung, auch beim Fehler. Die sechs aktuellen Aliasabfragen werden als **ein** exakter SQL-Lookup ausgeführt; bei großen JSON-Dokumenten kann dessen Lese-/Parsephase dauern.

## Rückgabe für die sechs Zielentscheidungen

Privat vollständig sichern: `copyEvidence`, `scope`, `perGroup`, `activeBindings`, `bindingRevisionHistory`, `historicalFixedBindings`, `nativeAliasCandidates`, `nativeSourceIdCandidates`, `nativeCfgRevisions`, `missingBindingTables` und `issues`. Für die gemeinsame Besprechung genügen zunächst die sechs `perGroup`-Zeilen samt dazugehörigen cfg-/Revisions-/Hash-/Statusbelegen und Konflikten.

Kein Kopf ≠ kein existentes natives Produkt. Keine Shopify-Metafelder ≠ keine native Bindung. Kein Treffer auf die **sechs exakten** Aliasse/UUIDs ≠ vollständiger Negativbeweis für alle denkbaren anders benannten Altentwürfe. Deshalb enthält der Helper keine Meldung „neu anlegen“, keine automatische Gewinnerauswahl und keine Zusammenführung aktiver Produkte. `readyForImport:false` bleibt immer gesetzt. Tatsächliche vorhandene Zielzahlen dürfen erst aus dem späteren Operator-Kopienbeleg benannt werden.

## Lokaler Prüfbeleg

Vier bedeutungsvolle synthetische Tests bestanden,0 übersprungen: vollständiger126er-Scope mit historischer Revision und ungebundenen Mehrfachaliasen; fehlende/nebenläufig unvollständige Register; verwaister Kopf/falsches Produkt/Store/Hash/Revision; explizite Legacy-/Tenant-/Datei-/WAL-/Quellpingrenzen. Fremde Mandanten/Shops/Varianten und nur historische Aliasse bleiben ausgeschlossen, fehlerhaftes JSON ist geschützt, keine privaten Dummyinhalte in Ausgabe; Kopienbytes unverändert. `tests.txt` dokumentiert den Lauf. Keine echte Serverkopie wurde hier geöffnet.

```sh
node --test ops/issue230-small-targets-copy-review-20261111/inspect-small-targets-copy.test.mjs
```

Bei anderem Scratch-Ort `GRAVURU_SMALL_CODE_ROOT=/ABSOLUTER/REPOPFAD` für den vorhandenen Audit setzen; kein Codex-Pfad ist eingebaut. App, v9-Pläne und veröffentlichter Hauptacryl-Helfer bleiben unverändert.
