# Gemeinsamer Konfigurator: bestätigter Modul-/Galerieabgleich

Stand: 08.11.2026. Isolierter Branch `dev/mika-module-sync-20261108`, Ausgangspunkt `49626dd715a564295712e53fb5a2515f90f54313` (PR #201). Keine Veröffentlichung, kein echter Shopify-Schreibzugriff, kein Kundenlayout geändert. Die Sicherungsgrenze steht in [module-sync-baseline](2026-11-08-module-sync-baseline.md).

## Zweck und Grenze

Ein bestehendes Produkt behält seine Konfigurator-ID, Shopify-Produkt-ID, Varianten-IDs, Formen, Größen, Befestigungen und Grundpreise. Eine neue bestätigte Modulprofilrevision schaltet vorhandene Fähigkeiten ein oder aus. Eine ausdrücklich zugeordnete Gruppe bereits existierender Designs kann ihren aktuellen freigegebenen Galeriestand übernehmen. Die vorhandene Synchronisierungsengine erzeugt eine konkrete Vorher/Nachher-Vorschau, verlangt die Bestätigung genau dieses Plans und protokolliert den anschließenden Abgleich.

Es gibt keinen neuen Produktimporter und keine zweite unabhängige Synchronisierungsengine. Der Anschluss verwendet PR #185/#189 und die vorhandene native Produkt-, Varianten- und Freigaberegistry. Astras Galerie-/Familienregister aus PR #194 bleibt für tatsächliche Original- und Formatzuordnungen zuständig. Referenz für Originale: [DESIGN-MASTER](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

Produktneuanlage bleibt beim bestätigten Produktgruppenworkflow aus PR #201. Angebotsänderungen wie neue Größen, andere Preise, Variantenanlage/-löschung, neue Materialien, Bestand, Produkttitel und SEO gehören nicht zu diesem Gestaltungs-/Modulabgleich und werden nicht stillschweigend ausgeführt.

## Herkunft des bestehenden Codes

Die folgenden Dateien stammen aus `3ad2cdc3947db211c1c5864c3acb8faa1883fa62`, Branch `dev/mika-verwaltung-sync-absicherung-20261107` (PR #185/#189). Sie fehlen in Basis `49626dd`; deshalb erscheinen sie dort zunächst als neue Dateien. Es handelt sich um eine Übernahme der vorhandenen Engine, nicht um eine Neuentwicklung derselben Funktionen.

| Übernommene Datei | Anpassung gegenüber `3ad2cdc` |
| --- | --- |
| `app/workshop/gallery-shop-sync.mjs` | Optionaler Modul-/Gruppenadapter; konkrete persistierte Bestätigung; mehrere getrennte Designvorschauen; Preisbeleg vor lokaler Neurevision und vor Aktivierung prüfen. Journal, Wiederanlauf, Lease, Konfliktstatus und Umgang mit unklarer Shopify-Antwort bleiben aus der vorhandenen Engine. |
| `app/workshop/gallery-shop-sync-native.mjs` | Ausdrücklich zugeordnete Nebenentwürfe derselben geprüften Format-/Materialfassung zulassen; Starter-ID nicht ändern. Alle Material-, Original-, Geometrie- und Ressourcenprüfungen bleiben. |
| `app/workshop/gallery-shop-sync-transport.mjs` | Vollständige Variantenpagination statt maximal 250; doppelte/wechselnde Seiten sperren; App-eigenes Preis-Metafeld lesen und im unveränderten Commerce-Beleg festhalten. |
| `app/workshop/gallery-shop-sync-activation.mjs` | Bestehende Preisverträge übernehmen/prüfen; Varianten in Blöcken bis 100 innerhalb einer gemeinsamen Bindungs-/Freigabetransaktion; komprimierte Preisquelle mit vorhandenem `pricing-history.mjs` decodieren. |
| `app/workshop/gallery-shop-sync-media.mjs` | Unverändert übernommen: dedizierte bestehende Medien-IDs, kontrollierter Bildexport, Eigentumsprüfung und Inhaltsnachweis. |
| `app/workshop/gallery-shop-sync-media.test.mjs` | Unverändert übernommen. |
| `app/workshop/gallery-shop-sync.test.mjs` | Unverändert übernommen. |
| `app/workshop/gallery-shop-sync-materialidentity.test.mjs` | Nur Testkompatibilität: vorhandenes `repository.get(id).revision` anstelle der in dieser Basis fehlenden `repository.head`-Abkürzung. |
| `app/workshop/gallery-shop-sync-test-fixture.mjs` | Ausschließlich isolierte Tests: optionale Dokumenttransformation/Preisprovider; initiale Bindungsprüfung in Blöcken bis 100 für 404 Varianten. |
| `scripts/lib/gallery-shop-connection.mjs` | Optional die Modulbibliothek und den geprüften Preisprovider an den bestehenden Anschluss geben. Beide echten Schreibschalter bleiben standardmäßig aus. |
| `scripts/fixtures/gallery-editor.mjs` | Unverändert übernommene synthetische Foto-/Editorfixture. |
| `app/workshop/gallery-photo-media.mjs` | Unverändert übernommener nativer Original-/Bearbeitungs-/Maskenspeicher; notwendige Abhängigkeit der vorhandenen Foto-Synchronisierung. |
| `scripts/lib/gallery-management-http.mjs` | Bestehende private `/originale/verwaltung`-Routen wiederverwendet; nur `sync-confirm` an dieselbe Engine angebunden. Host-/Origin-/CSRF-Schutz bleibt. |
| `app/workshop/ui/gallery-management.html` / `.mjs` | Bestehende Admin-Verwaltung: genaue Sync-Bestätigung, Modulstatus vorher/nachher und einzelne Designvorschauen ergänzt; Link zur vorhandenen Modulverwaltung. |
| `app/workshop/ui/gallery-management.css` | Unverändert übernommen. Kein Kunden-CSS geändert. |
| `scripts/lib/gallery-shop-connection.test.mjs` | Unverändert übernommen; beide Anschluss-/Medienfälle bestanden. |

Kleine bestehende Host-Anschlüsse aus demselben Stand: `design-assets.mjs` bindet den privaten `galleryPhotos`-Speicher an; `http.mjs` gibt nur die bereits vorhandene `editorPreview`-Funktion an interne Serverdienste weiter. Keine neue öffentliche Route und kein Kunden-UI wurde dadurch angelegt. `order-intake.mjs` erhält die vorhandene synchrone äußere Bindungstransaktion sowie einen internen mandantengeprüften Leser für unveränderliche Preisverträge.

Neue Dateien dieses Auftrags: `gallery-module-sync.mjs`, dessen Tests und `gallery-shop-sync-pagination.test.mjs`. Die kleine `cart-personalization.mjs`-Erweiterung ist unten erklärt. Die separat beauftragte Bindungsperformancekorrektur liegt in `shop-product-binding-store.mjs`, `shop-product-binding-read-snapshot.mjs` und `catalog-live-orders.mjs`; ihr Prüfnachweis wird nach Abschluss ergänzt.

## Anschluss an den bestehenden Host

Der vorhandene Server erstellt `createGalleryShopConnection` mit seinen echten Quell-/Zielwerkstätten, Mandanten-/Shopbindung, der Modulbibliothek, seinem authentifizierten GraphQL-Transport und seiner bestehenden Original-/Zielregistry. Diese Argumente kommen ausschließlich aus Serverkonfiguration, niemals als ungeprüftes Browserdokument.

Eine feste Registry-Zuordnung kann zusätzlich enthalten:

```js
moduleUpdate: {
  id: "ID-aus-der-Modulbibliothek",
  revision: 3,
  sourceRevision: 1 // bestätigte native Ursprungsrevision desselben Produktes
},
designs: [
  {
    source: {productId: "bestehende-Galerie-ID", designId: "vorhandene-ID", originalId: "Katalog-Original-ID"},
    target: {designId: "bereits-zugeordnetes-Zieldesign"}
  }
]
```

Dies ist eine Strukturillustration mit Platzhaltern, keine importierbare Produktzuordnung. Für reine Moduländerungen wird `designs` ausgelassen; ohne Bildänderung muss `media: []` und `mediaRequired: false` ausdrücklich gesetzt werden. Für Gruppenbilder muss jede bereits existierende Medien-ID ihr `designId` nennen. Ein Nebenentwurf darf nicht versehentlich das Hauptproduktbild überschreiben.

Der Ablauf ist `plan({targetIds})` → konkrete Änderungen/Vorschauen zeigen → `confirm({planId, planSha256, accepted:true})` → `execute({planId, planSha256, confirmationId})`. Eine neue Galerie-, Profil-, Produkt-, Registry-, Preis- oder Shopify-Commerceänderung macht den geprüften Stand ungültig. Wiederholen desselben erfolgreich abgeschlossenen Vorgangs erzeugt weder eine zweite Produktrevision noch doppelte Varianten-/Shopify-Schreibvorgänge.

Die vorhandene Verwaltungsansicht ist jetzt im Paket enthalten und an die konkrete Plan-/Bestätigungs-/Ausführungsfolge angeschlossen. `createGalleryModuleManagementHost` in `scripts/lib/gallery-module-management-host.mjs` verbindet genau diese bisherigen Routen, dieselbe Modulbibliothek und denselben bestätigten Produktgruppenservice mit der vorhandenen Syncengine. Es verlangt Astras serverseitige `sourceRegistry` (`targets`, `offeringFor`, `scopes`), `sourceApproval` und feste Shopzielzuordnungen; ein Ersatzkatalog wird nicht geraten. Beide echten Schreibschalter sind standardmäßig aus.

Astras bisheriger Host liegt in PR #185/#189 beziehungsweise PR #194, nicht in Basis `49626dd`. Sein `createSlateGalleryHandler` besitzt bereits den Einstieg `management.synchronizer({workshop, sourceApproval})`. Beim Zusammenführen kann der neue Adapter aus denselben Registry-/Freigabeobjekten erstellt und `host.handle(req,res,url)` vor dem bisherigen Galerie-Fallback verwendet werden; bei `false` bleibt der vorhandene Router zuständig. Den alten kompletten Slate-Server haben wir nicht über die neuere Galerie kopiert. Die tatsächliche Montage in Astras laufendem Prozess ist noch offen; dieser Nachweis ist lokal.

### Sichere ausführbare Ansicht

`node scripts/serve-gallery-module-sync-demo.mjs --port=8209` öffnet die bestehende Verwaltung unter `http://127.0.0.1:8209/originale/verwaltung#synchronisieren`. Sie verwendet temporäre native Testprodukte, die echte Plan-/Bestätigungs-/Bindungslogik und ausschließlich eine lokale nachgebildete Shopify-Antwort. Es gibt keine Zugangsdaten und keinen externen Request. In „Synchronisieren“ das vorhandene Test-Türschild auswählen, die Logo-an→aus-Differenz prüfen, das Bestätigungsfeld anhaken und „Im Testsystem synchronisieren“ betätigen. Die ursprünglichen Produkt-/Varianten-IDs bleiben erhalten. `Strg+C` beendet die Demo und entfernt nur ihren vorher geprüften eigenen temporären Ordner.

Die Demo ist ein Sync-Prüfstand. Der Link „Konfi-Module“ öffnet die bereits vorhandene Modulverwaltung einschließlich ihrer bisherigen Session-/CSRF-API im selben Preview-Host. Dort gespeicherte Revisionen des Demo-Profils erscheinen im nächsten Abgleichplan; ein alter Plan wird dadurch ungültig. Moduländerungen speichern zunächst nur lokale Daten und benötigen weiterhin eine eigene genaue Sync-Bestätigung. Die vollständige echte Astra-Galerie wird nicht durch diese temporäre Werkstatt ersetzt. Das Musterdesign ist synthetisch und keine Artwork-Abnahme.

## Preise und alte Bestellungen

Das App-eigene Shopify-Metafeld `$app.personalization` wird nur gelesen. Sein unveränderter Rohinhalt einschließlich Historie gehört zum Remote-Prüfbeleg. `expandPricingVariants` und `resolvedPricingHistory` aus der vorhandenen Preisstrecke lösen `variantSequence`, `variantsFromRevision` und historische Deltas auf. Pro exakter Variante werden der native Grundpreis und die Zusatzpreisregeln erneut geprüft. Alternativ darf ein ausdrücklich serverseitig eingesetzter, bereits geprüfter Preisprovider liefern; Testpreise aus Fixtures sind kein solcher produktiver Nachweis.

Ein gültiges versioniertes Profil mit `logo:false` darf den bestehenden V2-Preisvertrag behalten. Der Tarif 1299 Cent und die Preisrevision ändern sich dadurch nicht. Native Logo-aus-Quotes dürfen ausschließlich bei diesem expliziten gesicherten Profil ihren fehlenden Logo-Zähler als 0 an den V2-Warenkorb übergeben. Jeder positive oder ungültige Logo-Zähler wird gesperrt. Ohne Modulprofil gilt die bisherige strenge V1/V2-Zuordnung unverändert. Upload-, Design-, Entwurfs- und Preisprüfungen verbieten das ausgeschaltete Logo weiterhin serverseitig.

Alte Produktrevisionen, Cart-/Order-Snapshots, Bindungszeilen und Preisverträge werden nicht umgeschrieben. Ein historisch bestellbares Logo bleibt in seinem alten freigegebenen Snapshot bestellbar. Neue Konfiguratorsessions richten sich nach der aktiven Produktrevision; die vorhandene Shop-Entry-Prüfung darf bereits offene alte Editor-Sessions bei einem Headwechsel zur erneuten Prüfung auffordern.

## Umfang der Designgruppen

Mehrere bestehende Designs derselben exakt geprüften Material-/Formatfassung sind einzeln zugeordnet, freigegeben und in der Vorschau sichtbar. Nicht zugeordnete Designs und die Startdesign-ID bleiben erhalten. Fotos/Masken werden mit Original, Bearbeitungsquelle, Rezept und Masken-ID übertragen, nicht als flaches Screenshotbild.

Eine Moduländerung darf dagegen die ganze vorhandene 80-Format-Familie unverändert mitnehmen. Ein freies Artworkupdate über alle 80 Größen wird bewusst nicht durch Skalierungsannahmen erzeugt: Dafür braucht es Astras ausdrückliche Format-/Familienzuordnung beziehungsweise den bereits vorhandenen kontrollierten Append-Runner. Neue Designs/Varianten und ungeprüfte Zuordnungen werden hier nicht hinzugefügt.

## Prüfstand

Alle bisherigen Prüfungen verwenden isolierte SQLite-Dateien und einen synthetischen Shopify-Transport ohne Netzwerkzugriff. Kein tatsächlicher Warenkorb oder Checkout im Live-Shop wurde durch diesen Auftrag verändert.

- 30 gezielte Prüfungen für Runtime-/Upload-/Entwurfsregeln, V2-Preisbindung, Warenkorbantwort, Datenbank-Wiederöffnung, Legacy/Historie, HTTP-Gates und vollständige 404-Variantenpagination bestanden.
- 6 neue kleinere Sync-Prüfungen bestanden: Logo aus/an am selben Produkt, Bestätigungspflicht/Idempotenz, geändertes Profil nach Bestätigung, fehlender/falscher Preisvertrag, zwei bestehende Designkarten, komprimierte V2-Historie und abgelaufener 60-Sekunden-Beleg. Die Zählung bezieht sich auf Testfälle, einzelne Fälle prüfen mehrere dieser Punkte.
- Vorhandene Sync-/Material-/Medienprüfungen: 28 direkt bestanden; die beiden übernommenen Foto-Fälle bestanden nach Anschluss ihrer bereits vorhandenen Abhängigkeit und Verwendung der gebündelten Python-Laufzeit. Ein optionaler Chromium-Rastertest bleibt übersprungen, solange dessen Offline-Browser nicht ausdrücklich eingerichtet ist.
- Der echte native 404-Varianten-Datenbanklauf ist nach der begrenzten Performancekorrektur bestanden: 404 vorhandene IDs, 8 Formen/80 Größen, atomare Umschaltung und vollständiger Rückweg bei spätem Freigabefehler. Der Familien-Test benötigte einschließlich Aufbau und mehreren Aktivierungen 242,3 s; das ist keine Einzelaktivierungszeit. Gemeinsam mit dem separaten 60-Sekunden-Frischetest waren es 245,6 s. Die Frist bleibt unverändert; zwei zuvor wegen unnötiger Wiederholungsarbeit kontrolliert gestoppte Läufe zählen nicht als bestanden.
- 5 Anschluss-/Hostprüfungen bestanden: 2 unveränderte bestehende Connection-/Medientests und 3 neue Tests für die tatsächlich montierte private Verwaltungsroute, exakte Bestätigung, CSRF-/Origin-/Host-Schutz, unveränderte IDs, Idempotenz, Profiländerung nach Bestätigung sowie den bestehenden Modul-Editor mit Speichern und neuem bestätigtem Syncplan. Ein anfänglicher Testfehler durch vom Test-`fetch` überschriebenen Host-Header wurde mit einem echten `http.get`-Request geprüft; der fremde Host wird mit 403 abgewiesen.

Gebündelte Laufzeit unter Windows: `GRAVURU_PYTHON` muss auf die vorhandene Python-Laufzeit zeigen; Windows-Store-Aliase sind keine funktionierende Fotoprüfung. Relevante Tests liegen in `gallery-module-sync.test.mjs`, `gallery-shop-sync*.test.mjs`, `cart-personalization.test.mjs`, `module-runtime.test.mjs` und `configurator-module-http.test.mjs`.

Browser-Sichtprüfung und echte Shopify-Aktivierung sind nicht Bestandteil dieses lokalen Nachweises. Keine Artwork-Sichtfreigabe wird aus der leeren synthetischen Familienfixture abgeleitet.

## Rückweg und ausstehende Aktivierung

Vor produktiver Aktivierung: Code auf die gesicherte Basis zurücknehmen ist möglich; derzeit besteht kein Live-Rollbackbedarf. Nach einer später bestätigten Aktivierung zuerst die betroffenen veröffentlichten Produkt-/Variantenbindungen auf einen vorher geprüften Stand zurückführen. Nicht bloß die Runtime zurückrollen, solange Modulprodukte aktiv sind. Profile, Plan-/Operationsjournal, alte Preisverträge und Produktrevisionen nicht löschen.

Bei unklarer Shopify-Antwort wird zunächst nur `reconcile` gelesen; kein automatischer zweiter Schreibversuch. Ein Konflikt nach privater Neurevision lässt die vorherige aktive Bindung unverändert. Für eine fachliche Rücknahme einer bereits erfolgreich übernommenen Gestaltung/Modulauswahl wird eine neue Änderungsvorschau aus dem gesicherten alten Inhalt erstellt und bestätigt. Historie wird nicht überschrieben.

Vor produktiver Freigabe bleiben: gemeinsamer Review, reale große Designbank-Performance gesondert prüfen (die leere 404-Familienfixture belegt sie nicht), kontrollierte Montage an Astras laufende Registry/Verwaltungsansicht, korrekte authentifizierte App-Preisquelle und ausdrückliche Aktivierung der bestehenden Schreibschalter. Der freigegebene Aufbau des Kundenkonfigurators bleibt unverändert.
