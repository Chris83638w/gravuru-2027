# #230 – konkrete Übergabe zur Integration durch Claude

Stand 11.11.2026. Chris hat den Einbau und die Abstimmung mit Claude jetzt beauftragt. Technische Bestandsaufnahme und Prüfung sind Arbeitsschritte, keine neue Freigabeanfrage. Dieser Bericht wurde isoliert und lesend vorbereitet; keine Servermutation, kein Merge, kein Push. Root koordiniert GitHub und Claude.

## Fest gepinnte Grundlagen

| Stand | Commit |
|---|---|
| Aktuelles GitHub-main, frisch über GitHub gelesen | `76269aa85b5dd7e22957fb138de7d404758d9ea5` |
| Gemeinsamer historischer Mergebase laut GitHub | `207c0c7e5cb628b70c7df051202e16afa4f6c004` |
| Mika-Basis vor unseren B-/C-Änderungen | `411188db5777d7fb0ec06c6fab2f6faf85270fc9` |
| B mit Uploads, Kleinprodukt-Motivplatzierung und nativen Planunterlagen | `6298f7af22056333569b030c249ce64568e46beb` |
| C: Designsuche, Suchauswertung, Materialschatten | `9b0a4fddb73177ec1012c3ae12c0f11c7c55591c` |
| Angefragter Folgebranch, finale Klarstellung/H1-Dokumentation | `64e026e8fd15b129a16cc97189b28506aa9e8ac2` |
| Claudes GitHub-Workerstand, ebenfalls frisch gelesen | `ac10e6cee00469591514dcb4fa477b0547a54c48` |

Branch: `dev/astra-issue230-search-material-20261111`. `9b0a4fd → 64e026e` enthält **keine App-/Runtimeänderung**. main und Folgebranch divergieren: 156 voraus / 7 zurück. Der vollständige lokale Treevergleich umfasst **1.023 Dateien, davon 306 unter app/**. Die GitHub-Compare-Antwort endet bei 300 Dateien und reicht für eine Installationsliste nicht aus.

**Keine vollständige Branchkopie und kein blindes main-Deployment:** Der Server läuft laut [Claudes #233-Nachinstallation](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6781907100) mit gezielten Ergänzungen, die weder main noch unser Folgebranch vollständig enthalten. Der Katalog wurde [bereits auf 8236b8bf übernommen](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6802255704); nicht erneut importieren/resetten. Die drei dokumentierten lokalen Katalogänderungen erhalten.

## Fertige lokale Integrationsunterlagen

Alle Pfade in diesem Bericht sind relativ zu diesem Übergabeordner.

| Datei | Inhalt / genaue Anwendungsbasis |
|---|---|
| `B-runtime.patch` | 14 App-/Testdateien, exakt `411188db → 6298f7af` |
| `C-material-runtime.patch` | 33 App-/Testdateien, exakt `6298f7af → 9b0a4fd` |
| `C-http-searchKind-only.patch` | Nur vier enge Suchauswertungs-Hunks in http.mjs; erfolgreich gegen Claudes ac10e6c geprüft |
| `changed-B.{json,tsv}`, `changed-C-material.{json,tsv}` | Vollständige geänderte Dateien einschließlich Tests und Git-Blob-IDs |
| `changed-main-to-final.{json,tsv}` | Vollständiger Vergleich main gegen 64e026e; **keine Deployment-Allowlist** |
| `prerequisites-main-to-base.{json,tsv}` | Bereits vor B bestehende Abweichungen; 287 App-Dateien |
| `runtime-dependencies.json`, `direct-missing-dependencies.tsv` | Statische lokale Importkanten, Haupt-/Basis-/Ziel-Blobs und SHA-256 |
| `patch-verification.json` | Alle 46 verschiedenen B/C-App-/Testdateien nach beiden Patches bytegleich zum Ziel; Patchprüfsummen |
| `claude-source-hashes.json`, `claude-ac10e6c/` | Fünf blobgenau mit GitHub abgeglichene Claude-Quelldateien |
| `claude-http-check/app/workshop/http.mjs` | Isolierter HTTP-Integrationsentwurf: Claude-Datei plus ausschließlich searchKind-Hunks; Syntaxprüfung bestanden |

Die beiden Gesamtpatches passen auf ihre dokumentierte Basis; sie sind **kein Nachweis**, dass sie unverändert auf die aktuelle Serverdatei passen. Der HTTP-Entwurf erhält nachweislich `customerReadMemo`, `publicPreviewModel`, Worker-Weiche, gzip, Warm-Timer und Worker-Close. Er wurde noch nicht als integrierte Anwendung ausgeführt. Die Patchprüfung setzt `core.autocrlf=false`, damit Windows-Dateizeilen keine falschen Hashabweichungen erzeugen.

## Welche Runtimeänderungen dazugehören

Die 46 verschiedenen Dateien enthalten **28 Runtime-Dateien** und 18 Tests/Fixtures. Exakte Namen stehen in den Manifesten; fachliche Zuordnung:

| Bereich | Runtime-Dateien |
|---|---|
| Bestätigte Foto-/SVG-Uploads, enger Kleinprodukt-Motivstandard | `variant-m/{contract,decision-help,logo-upload,module-profile,motif-placement,ux-model,ux}.mjs`; `workshop/customer-vector-logo.py` |
| Suche im Editor | `variant-m/{design-search-control,design-search,native-design-search,product-design-gallery,workflow}.mjs`; `product-design-gallery.css` |
| Öffentliche Galerie und Wechsel | `workshop/{shop-design-gallery,shop-entry,shop-gallery-model,shop-gallery-snapshot}.mjs`; `workshop/ui/{shop-design-switch,shop-entry-client}.mjs` |
| Gemeinsame Suchauswertung | `variant-m/motif-search-analytics.mjs`; `workshop/{http,motif-search-stats}.mjs`; `workshop/ui/motif-searches.{html,mjs}` |
| Weiche Materialvorschau | `variant-m/material-surface.mjs`; `workshop/product-preview.mjs`; `platform/sources/app/shared/models/acrylic-plate-preview.mjs` |

Alle Tabellenpfade beginnen mit `app/configurator/`, `app/` beziehungsweise `app/platform/` entsprechend der vollständigen Manifestpfade. Der Cross-Realm-Fix von `module-profile.mjs` gehört dazu: reale iframe-Konfigurationen wurden vorher trotz gültiger gespeicherter Profile abgewiesen. Exaktes Schema, Revisionen und Boolesche Freigaben bleiben strikt.

**Vorgängerabhängigkeiten nicht überspringen:** Der konservative statische Importgraph umfasst 327 lokale Dateien; 36 fehlen auf main, 112 unterscheiden sich dort vom Ziel. Dazu zählen Modulprofile/-Runtime, `configurator-module-http`, `configurator-module-profiles`, `product-group-templates`, Galerie-Pager/-Workbench, Uploadvorschau, Photo-Design-Pricing, Textbounds, ursprüngliche Motivsuchauswertung und `ops/shopify/master-release/priced-options.mjs`. Diese Zahl ist ein Prüfinventar, kein Auftrag, sämtliche Vorgängerfeatures blind zu übernehmen. Claude gleicht die Blobs gegen den tatsächlich installierten Stand ab. Dynamische Assets/CSS und Build-Ressourcen sind zusätzlich zu prüfen.

Zu prüfen sind insbesondere die bestehende Seiten-/Assetfreigabe für `/werkstatt/motivsuche/` in `server.mjs`, `shopify-admin-host.mjs`, `acryl-employee-host.mjs`, Navigation und `motif-searches.css`; die vorhandene Modulquellenregistrierung vor dem ersten Request; sowie vollständige Build-/Bundle-Auslieferung. Diese Grundlagen ändern unsere B/C-Patches nicht. `package.json` bleibt gegenüber main unverändert, Node **>=24** ist vorgegeben; neue Suchfunktionen benötigen kein neues npm-Paket. B benutzt weiterhin den vorhandenen Python-/SVG-/Rasterpfad, dessen echte Serverabhängigkeiten Claude prüfen muss.

## Gemischten Laufzeitstand erhalten

Frische GitHub-Quelldateien bestätigen die in #233 gemeldeten SHA-256-Präfixe:

| Datei | SHA-256-Präfix |
|---|---|
| `design-dashboard.mjs` | `a84d7044cca71ede` |
| `http.mjs` | `88f4565d961f4736` |
| `katalog-worker.mjs` | `881afbcfc81f589a` |
| `katalog-worker-client.mjs` | `3c4107bbebcd373e` |

Die vollständigen Hashes stehen im Manifest. Sie sind eine Referenz für Claudes **frische** Serverprüfung, keine Behauptung eines heute erneut beobachteten Serverzustands.

- Beide Workerdateien fehlen in main **und** 64e026e. Sie müssen mit Claudes Betriebsparametern erhalten bleiben. Das frühere deaktivierte Vorrechnen nicht nebenbei anschalten.
- Unser historischer `design-dashboard.mjs` würde Caches, `herkunftRang` und die Worker-Cache-Exports entfernen. Worker ac10e6c importiert `exportDashboardCache`, `importDashboardCache`, `dashboardCacheWrites`; eine Komplettkopie des Dashboards würde ihn konkret brechen. Material-/Unterkategorieänderungen nötigenfalls als einzelne fachliche Hunks auf Claudes Datei portieren; Cache-/Ranglogik erhalten. Kein B-/C-Hunk verlangt einen Dashboardaustausch.
- Claudes `http.mjs` enthält außerdem `customer-read-scope.mjs`/`publicPreviewModel`, Worker-Routen, Invalidierung und Komprimierung. Die bloße Branchdatei verlöre diese Funktionen. Hier nur den geprüften Suchart-Patch und gegebenenfalls konkret fehlende Modulregistrierung integrieren.
- `shop-entry.mjs` ist ein Operator-Integrationspunkt. C ergänzt ausschließlich den erlaubten Queryparameter `q` und reicht ihn an `designGallery.list` weiter. Bestehende Signatur-, Sitzungs-, Binding-, Kauf- und Ursprungsschutzlogik erhalten.
- `app.cjs`, Startumgebung, aktive Datenbank-/Katalogpfade und öffentliches Routing bleiben unter Claudes Kontrolle. Ein lokaler v8-Host ersetzt diesen Nachweis nicht.

## Einbaureihenfolge und Datenbankschutz

1. Claude protokolliert vor Änderungen aktive Codewurzel, Startkommando, HEAD/Dirty-Status, tatsächliche Datei-/Bundlehashes sowie konfigurierte Datenbank- und Katalogpfade. Keine Geheimnisse/Bestellinhalte ins Issue. Oben genannte Dateien plus `shop-entry.mjs`, `acryl-employee-host.mjs`, `build.mjs`, `bundle-build.mjs` und Modul-/Galeriegrundlagen gegen Manifest prüfen. Aktuelle Prozesskennung neu ermitteln, historische PIDs nicht wiederverwenden.
2. In separater Integrationskopie Claudes aktuellen Stand erhalten, notwendige Vorgänger-Hunks und B, danach C/Material einarbeiten. Nicht den Gesamtbranch auf main oder live kopieren. Repoeigene gezielte Tests und Build auf **diesem integrierten Stand** ausführen. Die beigefügten originalen Patches dienen als exakte Änderungsquelle.
3. Vor dem ersten Start des neuen Codes konsistente private SQLite-Sicherung über das vorhandene SQLite-Backupverfahren erstellen, einschließlich aller tatsächlich betroffenen Dateien; keine rohe Kopie einer schreibenden WAL-Datenbank. Integrität, Schema, Tabellenzählungen und Suchaggregatsummen aller Mandanten/Herkünfte aus der Sicherung festhalten. Restore in isolierter Kopie prüfen. Quell-/Assetrollbackpaket und bestehende Runtime-Parameter sichern.
4. Die Suchmigration zuerst an dieser isolierten Datenkopie testen. `createMotifSearchStats` migriert bereits beim Öffnen durch `createWorkshop`, nicht erst beim ersten Suchereignis. `BEGIN IMMEDIATE`, busy timeout 5 s, exakter alter Spalten-/Primärschlüsseltest, Kopie in Hilfstabelle, atomarer Austausch/Commit; bei Fehler Rollback. Alte Zeilen erhalten `search_kind='motif'`, neue PK: `(tenant,day,product_group,term,source,search_kind)`. Alle alten Zähler und Mandanten bleiben erhalten. Unbekanntes Schema untersuchen, nicht übergehen.
5. Falls Modulverwaltung am Host neu ist, deren **tatsächlich konfigurierte** Ablage ebenfalls sichern: `configurator_module_profiles`/`_revisions`, `product_group_templates`/`_revisions`, `product_group_creation_plans`, `product_group_confirmations`, `product_group_creation_results`. Diese CREATE-IF-NOT-EXISTS-Grundlagen sind von der Suchmigration getrennt. Keine lokale `workshop.sqlite` über eine Serverdatenbank kopieren. Plan-/Quellenimport nur über den nativen Registerpfad mit aktuellen Pins; Codeeinbau führt keine Pläne automatisch aus.
6. Erst nach grünem Staging den konsistenten Code-/Bundle-/CSS-Stand im vorhandenen Operatorverfahren aktivieren. Während Suchschemawechsel keine alten und neuen Writer parallel betreiben. Alte gehashte Assets für bestehende Editorseiten erreichbar lassen; kein Gesamtcache-Löschen. Gallery-Snapshot v3 invalidiert alte Suchmetadaten gezielt; Originaldesigns bleiben unverändert. Aktive neue Prozess-/Dateihashes und ersten fehlerfreien Start protokollieren.
7. Liveprüfungen unten ausführen und mit neuen Belegen in #230/#233 melden. Erst danach Codeeinbau als live geprüft bezeichnen.

**Rollback:** Die alte Suchversion schreibt `ON CONFLICT(tenant,day,product_group,term,source)`; nach der Migration existiert nur der neue Sechser-Schlüssel. Deshalb ist „alten Code zurück, neue DB behalten“ kein funktionierender vollständiger Rückweg. Bevorzugt einen auf das neue Schema kompatiblen Rücknahmestand vorbereiten. Eine DB-Sicherung nur dann zurückspielen, wenn seit dem Snapshot keine zu erhaltenden neuen Bestellungen/Revisionen/Ereignisse geschrieben wurden. Andernfalls keine gesamte Werkstattdatenbank zurücksetzen: neue Ereignisse unverändert sichern und eine gesondert geprüfte tabellenbegrenzte Rückmigration beziehungsweise kompatible Vorwärtskorrektur einsetzen. Bei abgebrochener Migration Originalschema/-daten samt fehlender Hilfstabelle prüfen.

## Genaue lokale Testbefehle für den Integrationsstand

Im integrierten Repo, Node >=24, mit eigener temporärer Datenablage und ohne produktive DB/Shop-Zugang ausführen. Die Python-/Cairo-/Pillow-Abhängigkeiten müssen dem bestehenden Server-Uploadpfad entsprechen. Unter Windows bei Temp-EPERM `TEMP`/`TMP` auf einen eigenen Workspace-Tempordner setzen; unter Linux entsprechend `TMPDIR`.

```sh
node --test app/configurator/variant-m/design-search.test.mjs app/configurator/variant-m/gallery-pager.test.mjs app/configurator/variant-m/native-design-search.test.mjs app/workshop/shop-design-gallery.test.mjs app/workshop/shop-entry-client.test.mjs app/workshop/shop-gallery-model.test.mjs app/workshop/shop-design-gallery-alle.test.mjs app/workshop/shop-design-gallery-variant.test.mjs
node --test app/configurator/variant-m/module-profile-realm.test.mjs app/configurator/variant-m/module-profile.test.mjs app/configurator/variant-m/module-runtime.test.mjs
node --test app/configurator/variant-m/motif-search-analytics.test.mjs app/workshop/motif-search-stats.test.mjs app/workshop/motif-search-http.test.mjs app/workshop/motif-search-ui.test.mjs
node --test app/workshop/shop-entry.test.mjs
node --test app/configurator/variant-m/contract.test.mjs app/configurator/variant-m/logo-upload.test.mjs app/configurator/variant-m/ui-event-regressions.test.mjs app/configurator/variant-m/small-sign-motif-placement.test.mjs app/workshop/customer-vector-logo-pricing.test.mjs app/workshop/customer-vector-logo-media.test.mjs
node --test app/configurator/variant-m/material-surface-preview.test.mjs app/workshop/product-preview-mounting.test.mjs app/configurator/variant-m/backing-preview-viewport.test.mjs
node --test app/workshop/katalog-worker.test.mjs app/workshop/design-dashboard-cache.test.mjs app/workshop/design-dashboard.test.mjs app/workshop/design-dashboard-startdesigns.test.mjs
npm run build
git diff --check
```

Worker-/Dashboard-Cachetests stammen aus main/Claude und dürfen durch unsere historische Branchbasis nicht verschwinden. Bei notwendigen Modulregistrierungsänderungen zusätzlich `configurator-module-http.test.mjs`, `configurator-module-profiles.test.mjs`, `product-group-templates.test.mjs`, `gallery-module-sync.test.mjs` ausführen. Vollständige Quellreferenzen/Ressourcen müssen beim Build verfügbar sein; `.preview` allein ist kein Quellpaket.

Bereits nachgewiesen am unveränderten Folgebranch: Suchkern 66/66; mehrere eng abgegrenzte Erweiterungs-/Realm-/Analyticsläufe; abschließende native CSS-/Fokusregression; Material 11/11; fünf bytegleiche Produktions-SVG; Build 157 Module/16 Styles/76 geprüfte Referenzen. 35/35 lokale HTTP-Suchfälle an sieben v8-Produkten und echter Desktop-/Mobilbrowser bestanden. Diese teils überlappenden Läufe nicht addieren; sie ersetzen keinen Test des neu zusammengesetzten Serverstands. Der frühere Logo-Test benötigte korrekt eingerichtete Python-Abhängigkeiten; drei historische Cache-/Lesezählerfehler waren bereits auf der Basis vorhanden und werden nicht als behoben ausgegeben.

## Noch fehlende Livebelege nach dem Einbau

- Tatsächlich ausgelieferte Editor-, Modul-, CSS- und API-Version: authentifizierter Shopify-/Acrylpfad, kein lokaler Reviewhost. 401/403-Schutz für fremde Sitzung, Bindung und Händlerstatistik unverändert.
- Desktop und Handy: `Haus`, `D23`, `23`, Nulltreffer, Leeren, schnelle Eingabefolge/Zurückwechseln, Enter/Escape, Tastatur und Größenwechsel während einer Anfrage. Berechtigung, Material/Form/Größe und aktive Zielzuordnung vor Suche/Paging. Große Trefferliste vollständig in 40er-Seiten, keine doppelte Suchmeldung. Zwei bewusst versteckte und neun geometrisch ausgeschlossene Vorlagen bleiben ausgeschlossen.
- Nativer Editor: D23 zeigt wirklich nur eine Karte; übrige Karten `display:none`, inert und aus dem Fokus. Leeren stellt originale Rangaufteilung wieder her. Kein Cross-Realm-Fehler bei gepinntem Modulprofil.
- Suchauswertung im realen Händlerzugang: Design/Motiv getrennt; Shop/Vorschau unabhängig; Nulltreffer und historische Motive erhalten; Filter nach Neuladen und Prozessneustart gleich. Bestehender Kanal `/api/workshop/motif-search-events`, kein neuer Empfänger.
- Hauptacryl Foto und SVG-Logo gemeinsam: Auswahl, sichtbare Vorschau, korrekter Zusatzpreis und erneutes Öffnen. Alle sechs kleinen Produkte Foto/Logo aus. Motivstandard nur für die bestätigten 13 IDs/kleinen Produktgrößen; bei D1 5×2/6×2 kein garantierter 10-mm-Seitenplatz ohne Textänderung.
- Echte Teststrecke Editor → Warenkorb → Bearbeiten → Bestellung → reproduzierbare Produktionsausgabe mit gemischtem Foto/SVG prüfen. Schatten/Materialszene bleiben aus der Produktionsdatei; Rückseitenspiegelung genau einmal. Lokale Tests sind keine Maschinenabnahme und kein Nachweis einer veröffentlichten Verkaufsbindung.
- Parallel zur Kundenansicht eine kalte und warme Werkstatt-Designliste messen: Worker aktiv, Cache konsistent, keine Wiederkehr des je-Design-Kontext-Hashes oder mehrfacher identischer Produkt-DB-Lesevorgänge. Speicher/Timeouts und erste echte Logs prüfen; historische Serverzahlen nicht als neue Messung ausgeben.

Metadatenumfang ehrlich: Hauptacryl 1.157/1.205 Designs mit mindestens einem unbenannten eingebetteten Motiv, je Kleinprodukt 24/27. Suche nutzt vorhandene Namen, Nummern, Themen und explizite Motivschlagworte; keine vollständige automatische Motivverschlagwortung behaupten. Bestehende Starts/Designs bleiben nach Chris' Klarstellung; H1 wurde bereits ausschließlich als Shop-Hauptbild übernommen. Keine zusätzliche A/B/C/D-Auswahl verlangen. Fachlich offene Steuer-/Staffelangaben und aktuelle native Planfreigaben werden separat von Root/B fortgeschrieben und blockieren nicht die autorisierte technische Codevorbereitung.
