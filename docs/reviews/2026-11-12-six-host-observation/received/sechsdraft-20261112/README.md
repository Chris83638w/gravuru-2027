# Sechs neue DRAFTs – privater Kopienanschluss (12.11.2026)

Auftrag: #168 6820642883. Paket: `ops/issue230-six-draft-execution-20261112` @ `1e1bbc36` (Branch `dev/astra-issue230-integration-candidate-20261111`), Manifest `f752b6f1…9512`.

**Ergebnis: bestanden, 15/15 Prüfungen.** Werte in `kompakt-serverwerte.json`.

## Was lief
`sd-lauf.mjs` (ein Prozess, Plesk-Node-Konsole, Kandidat `f85390b`):
1. Paket (13 Dateien) aus `sd-paket.json` entpackt und gegen Manifest + 4 native Pins geprüft.
2. Weitere Kopie der Sechsgruppen-Kopie (`sechsgruppen-20261112T084929Z` → `sechsdraft-20261112T103445Z`); Quelle vorher/nachher hashgleich.
3. Tatsächliche Fabrik: `createWorkshop({filename,seedConfig,legacy,shopifySessions:test-only})` aus `app/workshop/http.mjs`.
4. Tatsächliches natives `groups.confirm` + `groups.execute` der sechs gespeicherten Pläne, Akteur „SYNTHETISCHE TEST-Zustimmung (Kopienlauf Claude, keine Nutzerfreigabe)“.
5. `prepareSixDrafts(entries,{native})` mit `{group, plan: groups.getPlan(id), execution, record: repository.get(execution.products[0].productId)}`.
6. `executeSixDrafts` mit injiziertem Shopify (aus Astras Testharness): verlorene Create-Antwort → Stopp → zweiter Versuch abgewiesen → `action:'reconcile'` → Replay → sechs Driftfälle.

## Anschlusspunkte (so wie der Host sie hat)
| Paket erwartet | Privater Anschluss |
|---|---|
| `repository` | `workshop.repository` |
| `orders` | `workshop.orderIntake` |
| `transferJournal` | `workshop.customerDrafts.shopDraftTransfers` |
| Gruppen | `workshop.configureModuleManagement({filename, sourceRegistry: nativeModuleSources(repository)}).groups` |
| `adapter` | `createShopBindingReadAdapter({storeId:'acryl', tenantId, shopDomain, productionProfileScope:{storeId:'acryl',tenantId}, workshop})` – wie `configurator-integration.mjs:46` |
| `native` | `loadNativeFunctions(<Kandidat>)` |
| `draftTransport`, `shop` | im Kopienlauf synthetisch; produktiv: `native.createShopDraftTransport(<App-Zugang>)` und `createSixDraftShopSteps({client, readonlyReader, native})` mit echtem Admin-Client |

Für den Anschluss war **keine Änderung am Paket und kein neuer Appcode** nötig.

## Grenzen
Siehe `grenzen` in `kompakt-serverwerte.json`. Kurz: Shopify synthetisch, Zustimmung synthetisch, Kopien-IDs, kein HTTP-/Sitzungsweg.
