# Optionaler Modulanschluss an Astras bestehende Galerie

Stand: 08.11.2026. Eigener Branch `dev/mika-pr194-module-host-20261108`, ausschließlich auf der gesicherten Basis `d689044b19ce922ef8a410342b7f7b839216935b` (PR #194). Keine Dateien oder Prozesse in Astras Arbeitsbaum geändert. Keine Shopify-Anfrage, kein Live-Schreibzugriff, keine Kundenoberfläche verändert. Der Basiscommit ist die Code-Sicherungsgrenze; eine Sicherung produktiver Datenbanken wird hier nicht behauptet, weil dieser Patch keine solchen Daten öffnet.

## Fertiger Anschluss

`scripts/serve-slate-review.mjs` akzeptiert optional `--management-config ABSOLUTER_PRIVATER_PFAD.mjs` zusammen mit dem bisherigen `--gallery`. Ohne diesen Schalter bleibt die bisherige Verwaltung angeschlossen. Der Konfigurationspfad kommt ausschließlich vom Serverstart, niemals aus URL, Browserformular oder Request. Der neue Loader sucht keine Dateien oder Zugangsdaten selbstständig und akzeptiert keine entfernte URL.

Das gewählte lokale Modul exportiert `configureGalleryManagement(context)`. Der Kontext enthält dieselbe bereits geöffnete `workshop`, `filename`, `dataDirectory`, `galleryDirectory` und `importsFile`. Die Funktion gibt genau eine Factory zurück:

- `connect(context)` für den bereits implementierten `createGalleryModuleManagementHost`; oder
- den bisherigen `synchronizer(context)`-Anschluss für bestehende Installationen.

Der neue `connect`-Kontext besteht aus `sourceWorkshop`, `filename`, `sourceRegistry`, `sourceApproval` und `csrfToken`. Alle Werte stammen aus dem echten `createSlateGalleryHandler`. Die Rückgabe ist der bestehende synchrone Host mit `handle(req,res,url)` und `close()`. Asynchrone oder unvollständige Hostobjekte werden abgewiesen.

Es wird genau ein Verwaltungshandler verwendet: Bei `connect` entsteht kein zweiter interner Produktgruppenservice. Der angeschlossene Handler läuft an derselben bisherigen Stelle nach `refreshRegistry()`. Produktanlage-Gate, Galerieeditor, Sichtfreigaben, ursprüngliche Host-/Origin-/CSRF-Prüfungen und der unveränderte Werkstatt-/Session-Fallback bleiben erhalten. Der private Modulhost aus dem Modul-Sync-Paket nutzt wiederum den vorhandenen `createGalleryManagementHandler`; es entsteht keine zweite Oberfläche.

Die bereitgestellte `sourceRegistry` folgt dynamisch Astras `createGalleryReviewRegistry` und dem nativen `gallery-assignment:`-Importjournal. `targets(options)` verwendet `galleryProductGroupSources` einschließlich des bestehenden sparsamen `onRecord`-Callbacks. `offeringFor(scope)` verwendet den bisherigen freigegebenen Familienumfang samt Fingerabdruck. `scopes()` liefert dieselben vorhandenen Produktlinien/Unterkategorien mit ihren konkreten Quellschlüsseln. Ein nachträglich geänderter Familienumfang erscheint deshalb auch nach dem Start im nächsten Prüfplan. `sourceApproval` bleibt auf genau Produkt-ID, Design-ID, Original-ID sowie aktuelle Sichtfreigabe begrenzt.

## Verbindung mit dem Modul-Sync-Paket

Dieser kleine Patch enthält bewusst nicht erneut die Engine oder Modulbibliothek. Für Module ein/aus benötigt der zusammengeführte Stand zusätzlich den geprüften Branch `dev/mika-module-sync-20261108` einschließlich dessen Performancekorrektur, aktuell `324a6434c2e506f222dd3056b4333ad36af38b8d`. Erst dieser gemeinsame Stand besitzt `scripts/lib/gallery-module-management-host.mjs` und die bestätigte Modul-Synchronisierung.

Die private Serverkonfiguration ruft dann in `connect` den vorhandenen `createGalleryModuleManagementHost` auf. Sie reicht den unveränderten Kontext durch und ergänzt ausschließlich die bereits bestätigten serverseitigen Anschlusswerte:

1. tatsächliche Zielwerkstatt einschließlich ihres bestehenden Mandanten-/Shop-/Variantenregisters;
2. Shopdomain und authentifizierter GraphQL-Leser aus der vorhandenen App-Anmeldung;
3. konkrete bestehende Quell-/Zielprodukt-, Design-, Original-, Shopify-Produkt- und Varianten-IDs;
4. gewählte Modulprofil-ID mit Revision und bestätigter nativer Ursprungsrevision;
5. eigenen absoluten Pfad für das getrennte Syncjournal;
6. gegebenenfalls vorhandene Medien-IDs, Bildexport und gesicherten Medienadapter; ohne Bildänderung ausdrücklich keine Medienübernahme;
7. geprüfte Preisquelle einschließlich komprimierter V2-Historie beziehungsweise den vorhandenen serverseitigen Preisprovider.

`executionEnabled` und `writesEnabled` bleiben ausdrücklich `false`, bis der konkrete Abgleich freigegeben wurde. Der neue Startschalter schaltet diese Werte nicht ein. Die obigen tatsächlichen Betriebswerte sind hier absichtlich nicht geraten und keine Zugangsdaten sind Bestandteil des Patches. Ein vorhandener 8203-Link liefert diese Angaben nicht: Der bekannte Starter dort war eine synthetische Testverwaltung; beim letzten lesenden Check war kein Listener aktiv.

Für die Modulverwaltung `/werkstatt/module/` kommt die bestehende Oberfläche/API aus dem Modul-Sync-Paket hinzu; sie muss dieselbe Profilablage benutzen. Falls dort zusätzlich Produktgruppen bearbeitet werden sollen, muss auch deren Host-Injektion dieselbe Galerie-`sourceRegistry` verwenden; die Standardregistry nativer Produkte ist keine alternative Galerie-Familienzuordnung. Dieser Patch fügt dem alten PR194-Stand keine zweite Moduloberfläche hinzu.

## Gezielte Nachweise

Ausgeführt mit der gebündelten Node-Laufzeit:

`node --test --test-concurrency=1 scripts/slate-management-mount.test.mjs scripts/gallery-management.test.mjs`

**4 Tests bestanden.** Nachgewiesen sind: ohne Konfiguration unveränderter Standard, ausschließlich explizite lokale Factory, ein tatsächlich am PR194-Galeriehandler montierter Dienst, aktuelle Quellen/Familienfingerabdrücke, unveränderte Produktanlage-Bestätigung, fremder Host/Origin/CSRF gesperrt, bestehende Galerieroute erreichbar, ursprüngliche Sichtfreigabe vor einem echten nativen Synchronisierungsplan notwendig, Vorher/Nachher-Vorschauen und null Shopify-Schreibzugriffe durch Montage/Plan. Die zwei ursprünglichen Galerieverwaltungstests sind unverändert mitgelaufen.

Der erste parallele Teststart kollidierte beim gemeinsamen lokalen Preview-Bundlebau; deshalb wurde der vorhandene Build einmal abgeschlossen und der Testlauf sequenziell wiederholt. Ein falsch gelesener verschachtelter Testantwortwert wurde korrigiert; die eigentliche API blieb unverändert. Keine vollständige produktive Galerie, Kundenbestellung oder Artwork-Abnahme wird aus diesem synthetischen Handler-Test abgeleitet. Originaldesigns folgen weiterhin dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Übernahme und Rückweg

Den Patch gemeinsam mit dem vorhandenen Modul-Sync-Paket in einen gesonderten Integrationsstand übernehmen. Dort zunächst eine Kopie der echten Galeriedaten und die tatsächlichen festen Shopzuordnungen nur lesend anschließen, den konkreten Plan prüfen und die Schutz-/Konfliktfälle wiederholen. Erst anschließend den bestätigten Abgleich gesondert aktivieren. Astras derzeitiger Prozess wird durch diesen Patch nicht umgestellt.

Solange keine Synchronisierung aktiviert wurde, genügt ein Serverstart ohne `--management-config` für den bisherigen Verwaltungsweg. Nach einer späteren echten Aktivierung müssen zuerst die betroffenen aktiven Produkt-/Variantenrevisionen auf zuvor geprüfte Stände zurückgeführt werden; Profile, Historie, Preisverträge und Journale nicht löschen und Modulprodukte nicht unter einer Runtime ohne Modulprüfung ausliefern.
