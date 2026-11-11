# Antwort a an Claude: Herkunft und Dateistände

Stand 11.11.2026. Read-only geprüft; keine Änderung am Server, an Git-Repositories, Plänen oder Exceldateien. Neue Belege nur unter `work/restabschluss/`.

**v8 ist eine parallel weiterentwickelte Linie mit gemeinsamer Geschichte, kein aus drei unabhängigen Wurzeln entstandener Stand.** `f464518` ist kein Nachfahre von `8ceb866`; beide haben den gemeinsamen Vorfahren `7b8bc287012140cb3aba05f2aadbbe52248c6a55`. Die Aussage „keine gemeinsame Git-Geschichte“ aus [Claude #168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6804728364) trifft damit nicht zu. Die praktische Integrationswarnung bleibt richtig: auseinanderentwickelte Linien und die tatsächlichen zusätzlichen Serveränderungen müssen zusammengeführt werden.

## Gemeinsame Historie und Herkunft

GitHub-Compare-Metadaten und danach dieselben Graphabfragen im neu geladenen, nicht flachen `work/issue230-integration-history` stimmen überein:

| Vergleich | Gemeinsamer Vorfahr | Nur Basis / nur Ziel |
|---|---|---:|
| [8ceb866 → f464518](https://github.com/Chris83638w/gravuru-2027/compare/8ceb866...f464518) | `7b8bc287012140cb3aba05f2aadbbe52248c6a55` | 50 / 94 |
| [2fb5949 → f464518](https://github.com/Chris83638w/gravuru-2027/compare/2fb5949...f464518) | `207c0c7e5cb628b70c7df051202e16afa4f6c004` | 5 / 151 |
| [2fb5949 → 8ceb866](https://github.com/Chris83638w/gravuru-2027/compare/2fb5949...8ceb866) | `207c0c7e5cb628b70c7df051202e16afa4f6c004` | 5 / 107 |
| [8ceb866 → 6298f7af](https://github.com/Chris83638w/gravuru-2027/compare/8ceb866...6298f7af) | `7b8bc287012140cb3aba05f2aadbbe52248c6a55` | 50 / 97 |
| aktueller Operator `ac10e6c` → Follow-up `b7f5ca2` | `7b8bc287012140cb3aba05f2aadbbe52248c6a55` | 71 / 101 |

`2fb5949` ist hier der von Claude zitierte Main-Stand, keine Behauptung über den inzwischen weitergelaufenen aktuellen Main.

| Commit | Im Commit gespeicherter Zeitpunkt, nach UTC normalisiert | Herkunft / Bedeutung |
|---|---|---|
| `207c0c7e` | 04.11.2026 00:26:20 UTC | Merge PR #165, gemeinsamer Vorfahr zum zitierten Main |
| `7b8bc287` | 08.11.2026 11:40:28 UTC | „fix: embed accepted uploads in customer cart preview PNG“, gemeinsamer Vorfahr der beiden Arbeitslinien |
| `f4645189c3dd8e5ba6f2aa2a3c11c16c604f33d5` | 10.11.2026 05:12:50 UTC | „fix: retain complete module source options after plan review“, Parent `56be0409defa92653d9400a4ed3e688f4e94210d` |
| `8ceb866be1ed7b85fd8b0813babe78a833b60d11` | 10.11.2026 06:07:38 UTC | „Secure reviewed five-file performance release package and rollback evidence“, Parent `3bfe6a3151517ffdfb78ba5e010ab55de0aeace0` |
| `411188db5777d7fb0ec06c6fab2f6faf85270fc9` | 11.11.2026 09:59:53 UTC | direkter Parent `f464518`; sieben Excel-Akten auditiert, keine Änderung unter `app/` |
| `78f178e99150a3d8b67853607d1140dc4cfc6199` | 11.11.2026 16:51:05 UTC | direkter Parent `411188db`; sieben native lokale Planpaare vorbereitet |
| `6298f7af22056333569b030c249ce64568e46beb` | 11.11.2026 17:32:09 UTC | direkter Parent `78f178e`; bestätigte Uploadmodule, Pläne und Excel-Nachträge |

Die B-Herkunft ist also exakt `f464518 → 411188db → 78f178e → 6298f7af`. `f464518` ist zeitlich sogar knapp eine Stunde älter als `8ceb866`; daraus folgt keine pauschale fachliche Vorrangregel. Die B/C-Änderungen nach dieser Basis sind gesonderte Änderungen, nicht Bestandteil der folgenden Basisdateimatrix.

## Warum lokal eine getrennte Wurzel erscheinen konnte

- `work/search-material-final` verwendet das gemeinsame Git-Verzeichnis von `work/product-plans-final`; `git rev-parse --is-shallow-repository` meldet **true**. Unter anderem ist `411188db` dort eine Shallow-Grenze. Deren tatsächlicher Parent `f464518` wird bei der Graphtraversierung ausgeblendet.
- `work/restabschluss/code-integration` meldet zwar **false**, enthält aber nicht alle Elternobjekte. `git log 411188db` scheiterte konkret am fehlenden `f4645189c3dd8e5ba6f2aa2a3c11c16c604f33d5`. Das ist kein Beleg für vollständige Historie.
- Der neue History-Clone enthält nach Roots Fetch die nötigen Commits. `git merge-base 8ceb866 f464518`, `git merge-base 2fb5949 f464518` und `git merge-base b7f5ca2 ac10e6c` geben die oben genannten Vorfahren tatsächlich aus.

Damit ist der lokale Fehlbefund erklärt; welche Beschränkung genau Claudes dortige Kopie hat, wurde hier nicht am Server geprüft.

## Welche Basisdateien sind weiterentwickelt?

Eine Kennzeichnung „v8 ist überall neuer“ wäre falsch. Ich habe **die beiden Endpunktbäume direkt** mit dem gemeinsamen Vorfahren verglichen, ohne GitHubs auf den Merge-Base bezogene Dateiliste als Endpunktdiff auszugeben.

Exakter Filter: alle Git-Blobs unter `app/`, ausgenommen Pfade mit `.test.`. Das enthält auch HTML und ausdrücklich benannte Fixture-Hilfen. Ergebnis: **64 unterschiedliche gemeinsame Dateien; 27 Pfade nur in v8, 8 nur im Live-Commit.** Von den 64 sind **34 nur in v8**, **15 nur im Live-Commit** und **15 in beiden Linien** gegenüber dem gemeinsamen Vorfahren verändert.

Die von Claude genannten **120/11/66** sind unter diesem offen gelegten Filter nicht reproduziert. Ohne seine genaue Pfadliste werden die zwei zusätzlichen „66“-Dateien nicht geraten. Der komplette Vergleich einschließlich der 27/8 zusätzlichen Pfade steht in `claude-answer-a-history.json`. Für die tatsächliche Serverintegration muss zusätzlich der frische 19-Dateien-Snapshot berücksichtigt werden.

Bedeutung:
- **nur v8 geändert:** Live-Datei ist byteidentisch zum gemeinsamen Vorfahren; v8 hat einen anderen Blob.
- **nur Live geändert:** v8-Datei ist byteidentisch zum gemeinsamen Vorfahren; Live hat einen anderen Blob.
- **beide geändert:** beide Endstände unterscheiden sich voneinander und vom gemeinsamen Vorfahren; inhaltliche Zusammenführung erforderlich.
- Diese Herkunftsklassifikation ist keine automatische Freigabe zum Ersetzen. Auch ein ausschließlich auf einer Linie veränderter Stand kann berechtigte, noch separat zu prüfende Funktionen enthalten.

Die folgende Matrix zeigt gekürzte **Git-Blob-OIDs**, keine Server-SHA-256. Vollständige OIDs stehen im JSON.

| Datei | Entwicklung seit gemeinsamem Vorfahren | Vorfahr | Live 8ceb866 | v8 f464518 |
|---|---|---|---|---|
| `app/configurator/mobile-demo/assets.mjs` | beide geändert | `d03c5bcb0133` | `b1c03186664f` | `bbb421041ef6` |
| `app/configurator/mobile-demo/demo.css` | nur Live geändert | `19d8100cd874` | `360465a62c68` | `19d8100cd874` |
| `app/configurator/mobile-demo/demo.mjs` | beide geändert | `48f01a3097a5` | `5a10624dbbee` | `1443b0af731a` |
| `app/configurator/mobile-demo/preview-action.mjs` | beide geändert | `fehlt` | `21cb85c7d270` | `fd8799a2c35a` |
| `app/configurator/variant-m/background-loading.mjs` | nur Live geändert | `f9896c1443ce` | `198dc6b60e3d` | `f9896c1443ce` |
| `app/configurator/variant-m/build.mjs` | nur Live geändert | `8fa844b58248` | `715f284204ee` | `8fa844b58248` |
| `app/configurator/variant-m/bundle-build.mjs` | nur Live geändert | `38507ecfa74d` | `ec0cfac203d1` | `38507ecfa74d` |
| `app/configurator/variant-m/design-reset.mjs` | nur Live geändert | `978c0d4e214a` | `72a8f34e935e` | `978c0d4e214a` |
| `app/configurator/variant-m/element-rights.mjs` | beide geändert | `6c039c6c2014` | `25b4d643d260` | `a41cfc2593e8` |
| `app/configurator/variant-m/layout.mjs` | nur v8 geändert | `82ac00a90d32` | `82ac00a90d32` | `1a9a8a273e07` |
| `app/configurator/variant-m/lazy-resources.mjs` | nur Live geändert | `043e50ad26af` | `c5879f99bcfd` | `043e50ad26af` |
| `app/configurator/variant-m/module-profile.mjs` | beide geändert | `fehlt` | `4f4b4dfdaaaf` | `b12ed04cdf1e` |
| `app/configurator/variant-m/product-design-gallery.mjs` | nur Live geändert | `f60e15281d3e` | `c6129dbfd37f` | `f60e15281d3e` |
| `app/configurator/variant-m/profile-selection.mjs` | nur Live geändert | `3f4fe095d8fe` | `38ae62b0c0bd` | `3f4fe095d8fe` |
| `app/configurator/variant-m/refinements.mjs` | nur Live geändert | `90b02b59708e` | `59acf00bbbab` | `90b02b59708e` |
| `app/configurator/variant-m/server.mjs` | beide geändert | `fec3448b1319` | `ac9d355224b0` | `463668ea2362` |
| `app/configurator/variant-m/ux.mjs` | beide geändert | `c3b39d003627` | `34805adb2467` | `e0f142bd5295` |
| `app/configurator/variant-m/view-zoom.mjs` | beide geändert | `c673037104f9` | `7d41ee8ca8a6` | `2b06f98c8db0` |
| `app/platform/sources/app/shared/models/studio-svg.mjs` | nur v8 geändert | `39b0addbb9f0` | `39b0addbb9f0` | `c2d60ec2d52a` |
| `app/workshop/acryl-employee-host.mjs` | nur Live geändert | `e070ccd13984` | `4236d81290ba` | `e070ccd13984` |
| `app/workshop/cart-personalization.mjs` | beide geändert | `3adb984772a4` | `4801bc8ff19b` | `3cecad0704d2` |
| `app/workshop/catalog-live-orders.mjs` | nur v8 geändert | `8362c6d9e968` | `8362c6d9e968` | `2af923f393d4` |
| `app/workshop/catalog-structure.mjs` | nur v8 geändert | `d51bb2a0532a` | `d51bb2a0532a` | `638bdeb9909d` |
| `app/workshop/configurator-integration.mjs` | nur Live geändert | `1bc2ddb36032` | `321c4da1f973` | `1bc2ddb36032` |
| `app/workshop/customer-photo.mjs` | nur v8 geändert | `46c83c8ffdcf` | `46c83c8ffdcf` | `4ba9d801aee4` |
| `app/workshop/customer-vector-logo.py` | nur Live geändert | `8fb586741100` | `d2635b99bd50` | `8fb586741100` |
| `app/workshop/design-assets.mjs` | nur v8 geändert | `0b38bf900bf7` | `0b38bf900bf7` | `fe89efe56156` |
| `app/workshop/design-dashboard.mjs` | nur v8 geändert | `b3020371917f` | `b3020371917f` | `5d3f165a2041` |
| `app/workshop/design-target-dashboard.mjs` | nur v8 geändert | `409e80f555cc` | `409e80f555cc` | `21738234526c` |
| `app/workshop/http.mjs` | beide geändert | `ea771bbbf0c8` | `9b22d8058333` | `37d69129d992` |
| `app/workshop/katalog-convert.mjs` | nur v8 geändert | `554ec3bc8c28` | `554ec3bc8c28` | `7917ecfc3d4e` |
| `app/workshop/katalog-family-formats.mjs` | nur v8 geändert | `d500efcab562` | `d500efcab562` | `43e9f8b185a0` |
| `app/workshop/katalog-import.mjs` | nur v8 geändert | `f69ef0cbbcca` | `f69ef0cbbcca` | `eaea1886d722` |
| `app/workshop/katalog-linien.mjs` | nur v8 geändert | `74db63cc54cb` | `74db63cc54cb` | `ee7ae2fe1d6a` |
| `app/workshop/katalog-source.mjs` | nur v8 geändert | `5959e1eec5c4` | `5959e1eec5c4` | `697c4f81a655` |
| `app/workshop/order-intake.mjs` | nur v8 geändert | `fbfba90a0fb2` | `fbfba90a0fb2` | `376a983ab7b9` |
| `app/workshop/photo-import.py` | nur v8 geändert | `bd2d8b37c34c` | `bd2d8b37c34c` | `602a58f41442` |
| `app/workshop/product-model.mjs` | nur v8 geändert | `213c7a206b65` | `213c7a206b65` | `f105f36fe181` |
| `app/workshop/product-preview.mjs` | nur v8 geändert | `32c8fb4965dc` | `32c8fb4965dc` | `778e05f96a06` |
| `app/workshop/repository.mjs` | beide geändert | `b1a890ff43b2` | `0a83dad6fc59` | `d97f56442d7d` |
| `app/workshop/shop-design-gallery.mjs` | beide geändert | `f87c5b38af68` | `bfb3347a08fc` | `6f54b62ef50e` |
| `app/workshop/shop-draft-transfer.mjs` | nur v8 geändert | `6fb03cb11db6` | `6fb03cb11db6` | `6992740cc100` |
| `app/workshop/shop-entry.mjs` | beide geändert | `5c2f6628467e` | `6d3418c6ac4d` | `50639143f2c4` |
| `app/workshop/shop-preparation.mjs` | beide geändert | `c669668fec2e` | `96dfdd47b57c` | `c02e4d9a5f15` |
| `app/workshop/shop-product-binding-adapter.mjs` | nur v8 geändert | `494e3a95d51f` | `494e3a95d51f` | `41e04299ab3f` |
| `app/workshop/shop-product-binding-check.mjs` | nur v8 geändert | `7605b4034085` | `7605b4034085` | `76014266df17` |
| `app/workshop/shop-product-binding-plan.mjs` | nur v8 geändert | `cd68350b8a69` | `cd68350b8a69` | `264cd2c26675` |
| `app/workshop/shop-product-binding-read-snapshot.mjs` | nur v8 geändert | `e742aab4f55c` | `e742aab4f55c` | `0461f3dfc80a` |
| `app/workshop/shop-product-binding-store.mjs` | beide geändert | `71ab6199219a` | `1309b2150593` | `dbd42603a16b` |
| `app/workshop/slate-product-groups.mjs` | nur v8 geändert | `83a148d2a2a0` | `83a148d2a2a0` | `74634bda98b2` |
| `app/workshop/ui/app.mjs` | nur v8 geändert | `67249678f788` | `67249678f788` | `0836cf2c92c5` |
| `app/workshop/ui/batch-ui.mjs` | nur v8 geändert | `3faa3a2be1ce` | `3faa3a2be1ce` | `e6d883b02698` |
| `app/workshop/ui/catalog-structure-ui.mjs` | nur v8 geändert | `6459e0dc49ca` | `6459e0dc49ca` | `b086379d8349` |
| `app/workshop/ui/catalog-structure.css` | nur v8 geändert | `f4d7df3da063` | `f4d7df3da063` | `8a1eec8b359b` |
| `app/workshop/ui/catalog-ui.mjs` | nur v8 geändert | `ba3800685bcc` | `ba3800685bcc` | `40b909a62443` |
| `app/workshop/ui/customer-preview-link.mjs` | nur v8 geändert | `05dd68c00558` | `05dd68c00558` | `9f9163b4baf8` |
| `app/workshop/ui/design-dashboard-ui.mjs` | nur v8 geändert | `467c745920f4` | `467c745920f4` | `7e028d4b539a` |
| `app/workshop/ui/editor.css` | nur v8 geändert | `c1e8b0afd897` | `c1e8b0afd897` | `3ec970c8f203` |
| `app/workshop/ui/form-variants-ui.mjs` | nur v8 geändert | `f113053c1816` | `f113053c1816` | `3d82f991a659` |
| `app/workshop/ui/konfis.html` | nur v8 geändert | `328e13aadfad` | `328e13aadfad` | `1eaab782935a` |
| `app/workshop/ui/product-editor-ui.mjs` | nur v8 geändert | `4ba2ecfa25c0` | `4ba2ecfa25c0` | `a2470ed4da66` |
| `app/workshop/ui/shop-design-switch.mjs` | nur Live geändert | `ee24cb34248b` | `9434bf4bf7f9` | `ee24cb34248b` |
| `app/workshop/ui/shop-embed.mjs` | nur Live geändert | `fbe7b1e838bf` | `d18967afd92b` | `fbe7b1e838bf` |
| `app/workshop/ui/shop-entry-client.mjs` | nur Live geändert | `1a14322fc899` | `3e215b951bdf` | `1a14322fc899` |

## Lokaler Acryl-Commit 6cf536f und aktuelle Serverdateien

Commit `6cf536f206cd3b50e77bd2bbb1df9be390c35e8f` ist lokal unter **`refs/remotes/origin/dev/acryl-original18-konfi-20261110`** in `work/restabschluss/code-integration` vorhanden. Parent ist `f69c8dbfd1703e4abe2da80c1955d086cddbe547`, Tree `999abda57543239939e3c43465bf0db8eb4793e6`. Commitzeit 10.11.2026 17:16:21 +01:00. GitHub lieferte bei Abfrage des gekürzten und vollständigen Commit-Hashs jeweils „No commit found“. Die lokale Remote-Tracking-Referenz beweist somit keine aktuelle Abrufbarkeit auf GitHub.

**Objektvollständigkeit:** Alle 4.283 eindeutigen geprüften Objekte des Snapshots einschließlich Commit, Root-Tree, Unterbäumen/Blobs und direktem Parent sind lokal vorhanden; 0 fehlend. Damit ist der Snapshot lesbar. Eine vollständige transitive Vorgeschichte oder ein problemlos ausführbarer Push ist damit nicht behauptet.

**Umfang gegenüber direktem Parent:** 35 Dateien, **+1.912 / −9 Zeilen**: 11 Laufzeitdateien, acht App-Testdateien, 14 Skriptdateien (darunter ein Test), zwei Dokumente. Vollständige Dateiliste und Diffstat stehen im separaten JSON.

**Nur 10 von 11 Serverpräfixen passen.** `app/workshop/shop-entry.mjs` weicht ab. Die folgenden vollständigen SHA-256 stammen aus unveränderten Git-Blob-Bytes; die Serverseite stammt ausschließlich aus Claudes veröffentlichten Sieben-Zeichen-Präfixen:

| Datei | SHA-256 in 6cf536f | Serverpräfix | Abgleich |
|---|---|---|---|
| `app/workshop/batch.mjs` | `07b1ea062561485c6ecfca5ed3f34d9237c42f7a71e0ea8b2f69ab1079c18b78` | `07b1ea0` | passt |
| `app/workshop/product-model.mjs` | `1993bc362715e9a7736d6ad6d170a4a111ec607f3bdcce207d6fd5e2bdc9cb65` | `1993bc3` | passt |
| `app/workshop/shop-entry.mjs` | `364703b87c00522a663257301dafff1998c744308febea7543dfc358c69b0d50` | `ab2dfbc` | **abweichend** |
| `app/workshop/shop-preparation.mjs` | `4410b6a61593efcb4a6539cb65c53139ed957d0879943e1ff946563ea0bee6c4` | `4410b6a` | passt |
| `app/configurator/variant-m/acrylic-scene.css` | `372bf868189a5b07bde21905035a06ea30c6f283aa567ea16b9701f4264b5e6e` | `372bf86` | passt |
| `app/configurator/variant-m/acrylic-scene.mjs` | `9dc52c5e3023da9aa3674a8a09442cff87fbab278efe56f1f89b8f0b086e0586` | `9dc52c5` | passt |
| `app/configurator/variant-m/contract.mjs` | `c8a6eb14ef56b0d9565728708d93ccc9362b5bcc3d53fc80b1b6be092dc98393` | `c8a6eb1` | passt |
| `app/configurator/variant-m/scalable-size-state.mjs` | `149e44ad34fa4f07d25f4e2b7c078b43297163ffcb1607da875d5e364f707257` | `149e44a` | passt |
| `app/configurator/variant-m/ux.mjs` | `a0018174ebde933edc8fa83c0559efcb2d98c704719380ecbd7c9217e2200ed6` | `a001817` | passt |
| `app/configurator/variant-m/workshop-review.mjs` | `4248d5521f9d943f95f32647bdedc5a913437dc0260c97f0a9d924dcdeed5a1e` | `4248d55` | passt |
| `app/configurator/variant-m/scalable-acrylic-scene.mjs` | `e83864e3dc1bb5881ce368c7244820c0b1eeb5c2d0e1661786289f85b02f73c4` | `e83864e` | passt |

Der ganze historische Commit ist **nicht pauschal zum Push freigegeben**. Die beauftragte Sicherung der **19 aktuellen Server-Code-Dateien ohne STATUS, Datenbanken oder Kundendaten** bleibt der richtige Integrationsinput. `6cf536f` ersetzt diese Sicherung bereits wegen des abweichenden `shop-entry.mjs` nicht. Es wurden keine Tokenwerte ausgegeben.

## Belege und Reproduktion

- `claude-answer-a-history.json`: vollständige dreiseitige Datei-OIDs, Klassifikation und GitHub-Compare-Metadaten.
- `claude-answer-a-6cf.json`: vollständiger 35-Dateien-Umfang, elf SHA-256, Snapshotvollständigkeit; begrenzter Musterscan ohne Werte.
- `audit-6cf536f.mjs`: ausschließlich lesende Reproduktion des lokalen Commit-/Dateiaudits; ein neuer JSON-Ausgabepfad vermeidet Überschreiben des Belegs.
- GitHub-Endpunktbäume: `git/trees/608acc8d4ac6b3a59e4956b5c37d5b11ad13d798?recursive=1` (Live), `git/trees/85ed528477cbabc71083ade520ca9db82fe887b1?recursive=1` (v8), `git/trees/7b8bc287012140cb3aba05f2aadbbe52248c6a55?recursive=1` (Vorfahr). Alle drei Antworten hatten `truncated:false`; 4.319 / 4.735 / 4.196 Einträge einschließlich Unterbäumen.
- Lokale Graphprüfung im vollständigen History-Clone: `git merge-base 8ceb866 f464518`; `git merge-base 2fb5949 f464518`; `git merge-base b7f5ca2 ac10e6c`; `git rev-list --left-right --count ac10e6c...b7f5ca2`.

Damit ist Frage a beantwortet. Die genaue Einpflegereihenfolge der abhängigen B/C-Module und der tatsächliche Server-Snapshot sind getrennte Integrationsinputs, keine durch diesen Audit vorweggenommene Freigabe.
