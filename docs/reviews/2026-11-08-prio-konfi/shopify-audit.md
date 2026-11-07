# Shopify-Anschluss des Prio-Konfigurators – Audit und Pilotplan

Stand: 08.11.2026. Reine Quelltext- und Dokumentationsprüfung durch Mika-Unteragent, ergänzt durch den unten genannten aktuellen Shopify-Lesezugriff des Hauptagenten. Keine Shopify-, Server-, Galerie- oder Konfiguratoränderung; keine Browserprüfung und kein Testkauf. Einzige neue Datei dieses Unterauftrags ist dieser Bericht. Frühere Test- und Livebelege werden als historische Nachweise eingeordnet, nicht als heute erneut geprüft.

## Ergebnis und aktuelle Entscheidung

Der schnellste belastbare Weg ist, **die freigegebene R15-Bedienoberfläche an den vorhandenen nativen Shopify-Anschluss anzuschließen**. Produktgruppen, Galerie-Rückspeicherung, Preisverträge, Entwurfssicherung, Warenkorb und Bestelleingang sind bereits als getrennte Bausteine vorhanden. Sie bilden noch keinen nachgewiesenen durchgehenden R15-Verkaufsweg. Eine neue Komplett-App oder ein pauschales Entsperren der Demo wäre hierfür der falsche erste Schritt.

Aktueller Pilot laut neuer Nutzerentscheidung: **Edelstahl-Türschilder, mit allen tatsächlich vorhandenen Stahlformen**, danach weitere Gruppen. Form, Größe und Befestigung kommen aus Produktdaten. Die konkreten Größen, Preise, Befestigungen und Zubehörangebote benötigen noch die Nutzerbestätigung. Die alten Schieferpreise 19,99/24,99 € sind keine Edelstahlpreise. Auch der im Code vorhandene Logo-Aufpreis ist keine neue Freigabe für diesen Pilot.

R15 darf nach Nutzerfreigabe in die offizielle Codebasis übernommen werden. Das ist keine implizite Freischaltung von Shopify-Checkout oder aller Shopprodukte. Gemeinsamen Konfi ändern künftig nur Mika und Nutzer; andere KIs liefern bestätigte produktbezogene Ausführungsdaten. Für die technische Übernahme ist ein gezieltes Integrationspaket nötig: der untersuchte R15-Zweig liegt **123 Commits / 805 geänderte Dateien** über lokalem `origin/main` (80.159 hinzugefügte, 507 entfernte Zeilen). Diesen gesamten Abstand nicht unbesehen zusammenführen. Der Hauptagent hält dafür Freigabevertrag und Dokumentation auf main sowie exakte Quell-Tags fest; die vollständige Quelle bleibt gesichert. Das ist von einer bereits erfolgten Laufzeitintegration zu unterscheiden.

## Untersuchte Stände und Beweislage

| Bereich | Lokaler Stand | Aussagekraft |
|---|---|---|
| R15-Konfi | `work/konfi-mobile-demo-20261107`, HEAD `863b7fd3` | Aktueller Code samt gesonderter Demo-Verpackung; keine Aussage über heute aktive Shopify-App-Version |
| Gemeinsame Ressourcen | `work/konfi-gemeinsame-ressourcen-20261107`, HEAD `6f859471` | Gemeinsame Grundplatten-/Schriftarbeit und bereits integrierter Galerie-Sync-Code |
| Verwaltungsabsicherung | `work/konfi-verwaltung-sync-20261107`, HEAD `3ad2cdc3` | Quellenauflösung je Vorgang, begrenzter Record-Cache, Material-/Stärke-/Seitenprüfung; laut Übergabe 43 gezielte Tests, isolierte Browserfolge |
| Galerie/Sync-Übergabe | `docs/handoffs/2026-11-06-mika-galerie-synchronisierung-und-produktgruppen.md` | 203 historische gezielte Tests; Shopify-GraphQL und Downloads im Anschluss-Test simuliert; ausdrücklich kein echter Checkout |
| Alter Shop-Einstieg | `ops/shopify/theme-block/README.md`, `app/workshop/SHOP-ENTRY.txt` | Historische Live-/Testthemebelege vorhanden, teilweise unterschiedliche Datumsstände; aktuellen Iststand vor Pilot lesend erheben |

AGENTS, Entscheidungen/Startunterlagen und einschlägige Shopify-Anschlussanleitungen wurden berücksichtigt. Shopify-Plattformaussagen unten sind zusätzlich mit aktueller offizieller Dokumentation geprüft. Die lokal gepinnte Admin-/Webhook-Version ist an mehreren Stellen **2026-07**, während die Dokumentation aktuell **2026-10** als latest zeigt. Kein ungeprüftes Versionsupgrade während der UI-Übernahme; API-, Function- und Webhookversionen gemeinsam inventarisieren und bewusst versionieren.

## Bereits vorhandene Bausteine

### Produktseite → richtiges Produkt und Startdesign

`ops/shopify/theme-block/blocks/jetzt-personalisieren.liquid` zeigt einen App-Block nur für Produkte mit `custom.customization_id`. Sein Link enthält Shopify-Produkt-ID, ausgewählte Varianten-ID und Produkt-Rücksprungpfad. `assets/gravuru-personalisieren.js` hält die Variante über Formular, URL und Theme-Ereignisse aktuell. Der Link funktioniert auch ohne JavaScript.

`app/workshop/shop-entry.mjs` und `shopify-app-proxy.mjs` lösen die IDs über die native Registry auf, prüfen Shop und Proxy-Signatur und erzeugen eine begrenzte Sitzung. Preise werden nicht aus dem Link übernommen. Der Rückweg zum normalen Shop-Warenkorb ist bereits vorgesehen.

**Noch zu belegen:** Welcher vollständige App-/Theme-Release ist tatsächlich aktiv? Passt der reale Proxy-Pfad? Welche Produkte/Varianten sind auf welche native Revision gebunden? Führt das Hauptproduktbild beziehungsweise eine bewusst gewählte Designkarte tatsächlich zur passenden Original-ID und Startdesign-ID? Ein ähnlich benannter Bilddateiname genügt nicht. Der jetzige Theme-Link transportiert Produkt und Variante; falls mehrere Startdesigns auf einer Produktseite auswählbar sind, braucht diese konkrete Auswahl eine validierte Designzuordnung.

Theme App Extensions sind passend, weil sie App-Blöcke und eigene Assets integrieren und aktualisieren können. Den bestehenden vollständigen Erweiterungsstand erweitern, nicht aus einem unvollständigen Teilprojekt deployen. Die lokale Übergabe warnt ausdrücklich davor, dabei vorhandene Module versehentlich zu entfernen. [Shopify: Theme App Extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions).

Ein App Proxy bildet Shopify-Pfade auf den App-Server ab; pro App existiert eine Proxy-Wurzel mit Unterpfaden. Dies ist ein geeigneter signierter Einstieg, aber kein Ersatz für serverseitige Produkt-, Sitzungs- und Rechteprüfung. Große unveränderliche Assets müssen nicht zusätzlich über jede dynamische Proxy-Antwort laufen. [Shopify: App Proxies](https://shopify.dev/docs/apps/build/online-store/app-proxies).

### Produktgruppen und bestätigte Optionen

`app/workshop/product-group-templates.mjs`, `scripts/lib/gallery-management-http.mjs` und die private Verwaltungsoberfläche speichern versionierte Gruppen und konkrete Anlagepläne. Die Bestätigung bindet Vorlage, Quellrevision, konkrete Angebote und Materialauswahl. Änderungen daran verlangen eine neue Prüfung. Die Anlage erfolgt über das vorhandene native Importjournal und `repository.importBatch`, nicht über eine zweite Produktdatenbank.

Die Unterkategorie kann über `familyIdsOffered` bestimmen, welche bestehenden Materialfamilien angeboten werden. Fehlend/null bedeutet Vererbung, leere Liste keine neuen Angebote, eine Liste eine ausdrückliche Auswahl. Damit sind „diese Türschildgruppe in Edelstahl und Acryl anbieten“ und spätere materialabhängige Optionen bereits strukturell möglich. Materialauswahl allein erzeugt noch keinen geprüften Kontur-, Gravur- oder Produktionsadapter.

**Wichtig:** „Bestätigen & Entwürfe anlegen“ erzeugt bisher **lokale native Entwürfe**. Es ist noch kein vollständiger Shopify-Neuproduktimport. Erforderlich ist die Verbindung dieses bestätigten Plans mit einem gezielten Shopify-DRAFT-Publisher und anschließender Registry-Zuordnung.

### Galerie ändern → synchronisieren

Vorhanden sind `gallery-shop-sync.mjs`, `gallery-shop-sync-native.mjs`, `gallery-shop-sync-transport.mjs`, `gallery-shop-sync-media.mjs`, `gallery-shop-sync-activation.mjs` und `scripts/lib/gallery-shop-connection.mjs`.

Der Anschluss liest Shop, Produkt, Varianten, Preise, Medien und `gravuru.gallery_release`, vergleicht den Baseline-Stand und verwendet für das Release-Metafeld `metafieldsSet` mit `compareDigest`. Shop-Schreibzugriff und Ausführung sind standardmäßig ausgeschaltet; Medienänderungen haben eine weitere ausdrückliche Schranke. Mehr als 250 Varianten oder 100 Medien mit Folgeseite führen im aktuellen Release-Reader zum Abbruch statt einer falschen Teilbestätigung.

Die Aktivierung verlangt eine echte Binding-Transaktion, feste Produkt-/Variantenidentität, passende Revisionen und einen frischen Shopify-Lesestand. Ein eigener Vorgangsspeicher ermöglicht Wiederaufnahme. Das ist die richtige Grundlage für den gewünschten Knopf **„Synchronisieren“**.

Dieser Sync aktualisiert **bestehende zugeordnete Hauptprodukte**, vor allem Release-Referenz und gezielt zugeordnete Bilder. Er ist keine vollständige Spiegelung von Beschreibungen, Preisen, Lagerbestand und Bestellungen. Das soll in der Oberfläche klar benannt werden: „Design und Produktbilder aktualisieren“, später bei Bedarf weitere ausdrücklich verwaltete Felder.

`metafieldsSet` ist atomar und unterstützt Vergleich vor Schreiben; bei abweichendem Digest muss neu gelesen und der Konflikt angezeigt werden. Das passt zum bestehenden Ansatz. Die aktuelle Grenze ist 25 Metafelder beziehungsweise 10 MB pro Aufruf. [Shopify: metafieldsSet](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet).

### Warenkorb, Aufpreise und unveränderliche Bestellung

`app/configurator/variant-m/shop-cart.mjs` verwendet den nativen Cart-Gateway. Vor Übergabe werden Pflichtangaben/Layout, laufende Uploads, Menge, Originalmedien, Gestaltung und Vorschauen geprüft und privat gesichert. Der konkrete Zustand darf sich während der Übergabe nicht unbemerkt ändern.

`app/workshop/cart-personalization.mjs` berechnet aus dem serverseitigen Preisvertrag: Grundvariante, Motive, Fotos, gegebenenfalls Logos, bestätigte bezahlte Optionen und vorhandene Mengenstaffeln. Kein Browser-Gesamtpreis wird als Wahrheit übernommen. Der V3-Vertrag unterstützt konkret hinterlegte Checkbox-Aufpreise; das ist **kein generischer Beleg**, dass jeder neue Zubehörtyp bereits preislich angeschlossen ist.

`theme-cart.mjs` und die Theme-Cart-Clients übertragen einen gesicherten Prüfstand in den normalen Shopify-Cookie-Warenkorb. Sie lesen danach Position, Variante, Menge, Preis und Vorschau zurück. Beim Bearbeiten bleibt die alte Position erhalten, bis die neue exakt geprüft ist; andere Konfigurationen desselben Produkts sollen erhalten bleiben. Bei unklarer POST-Antwort gibt es kein blindes erneutes Hinzufügen. Übergaben laufen ab und sind teilweise prozessgebunden; ein Serverneustart während der Übergabe muss kundenverständlich behandelt werden.

Der Ajax-Warenkorb führt Varianten und ihre Eigenschaften; Eigenschaften sind Metadaten, kein frei festsetzbarer Verkaufspreis. Änderungen mit `properties` ersetzen den bisherigen gesamten Eigenschaftssatz. Unterstrich-Eigenschaften sind außerdem keine Geheimnisablage: sie bleiben über Liquid/Ajax zugänglich. Private Originalfotos, Sitzungsschlüssel und Produktionsdateien gehören dort nicht hinein. [Shopify: Cart API](https://shopify.dev/docs/api/ajax/reference/cart).

`shopify-order-webhook.mjs` verifiziert rohe HMAC-signierte Daten und bestätigt erst nach dauerhaftem lokalem Commit. `order-intake.mjs` prüft unter anderem bezahlt/EUR, gebundene Produktrevision, Angebot, Menge und Preis und bindet Bestellpositionen an unveränderliche Prüfstände. Unpassende Positionen werden als Fehler erfasst; `productionReady` bleibt zunächst false. Fertigung und Zahlungsbestätigung sind damit ausdrücklich getrennt. Spätere Galerieänderungen dürfen solche Bestellstände nicht ersetzen.

## Kritische offene Punkte vor dem ersten Stahl-Pilot

### 1. Shop-Plan bestätigt; aktive Preisfunktion noch prüfen

`ops/shopify/master-release/price-v1.mjs:55` liefert **`lineUpdate`** mit `fixedPricePerUnit`. Die aktuelle Shopify-Dokumentation erlaubt diese Operation nur in Development- oder Plus-Shops. Functions in Custom Apps sind zudem Plus-abhängig; allgemeine Functions-Verfügbarkeit ist kein Beleg für gerade diese Preisoperation. [Shopify: Cart Transform API](https://shopify.dev/docs/api/functions/latest/cart-transform), [Shopify: Functions-Verfügbarkeit](https://shopify.dev/docs/apps/build/functions).

**Aktueller Lese-Nachweis des Hauptagenten vom 08.11.2026 über den Shopify-Connector `get_shop_info`:** Shop „Gravuru Design“, `gravuru-design.myshopify.com`, **Shopify Plus**, EUR, Deutschland. Domain und Währung entsprechen dem Repo-/Shop-Einstieg. Der Plan-Gate ist damit für diesen Shop erfüllt. Offen bleiben App-Verteilung und Scopes, tatsächlich installierte und aktivierte Function-Version, ihre Preisverträge und das konkrete Fehlerverhalten. Diese Punkte nicht aus dem Plus-Status ableiten.

Die bestehende Function prüft Typen, Bereiche, Produkt-/Preisrevisionen und optionale Preislisten. Ihr eigener Kommentar hält fest, dass Personalisierungsattribute **keine Signaturen** sind. Vor Verkaufsfreigabe deshalb die tatsächliche Schutzkette testen: Motivanzahl reduzieren, Aufpreise entfernen, Referenz ändern und Fehler der Function auslösen. Es ist aus dieser Quelltextprüfung nicht bewiesen, dass jeder solche Versuch bereits den Checkout blockiert. Späteres Zurückhalten einer fehlerhaft bezahlten Bestellung ist wertvoll, aber kein Ersatz für einen korrekten Checkoutpreis.

Falls die benötigte Preisoperation im Zielshop nicht zulässig ist: gezielt eine für diesen Shopplan passende Preisabbildung entscheiden, etwa echte Zusatzvarianten/-positionen mit geprüfter Bindung und Mengenlogik oder einen dafür geeigneten geprüften App-Anschluss. Keine sichtbaren Aufpreise nur im Konfi anzeigen. Diese Alternative ist eine offene Architekturentscheidung, kein bereits fertiger Ersatz.

### 2. Der alte allgemeine Import ist nicht der sichere Galerie-Updater

`scripts/shop-sync.mjs:195–203` erzeugt `productSet`-Eingaben. Bestehende Varianten ohne Soll-Entsprechung werden bereits als Konflikt erkannt. Trotzdem bleiben zwei konkrete Punkte:

- Die Eingabe enthält nur ein oder zwei `custom`-Metafelder und keine vollständige fremde Metafeldliste. Bei Listenersatz darf dies nicht als harmloses Teilupdate verstanden werden.
- Jede erzeugte Variante setzt `inventoryItem.tracked:false`. Das kann bestehende Lagerverfolgung ändern und braucht eine bewusste produktbezogene Regel statt stiller Übernahme.

Neuprodukte werden als DRAFT ohne Texte/Bilder vorbereitet. Das Script besitzt Journal, Shop-/Währungsprüfung und Rücklesekontrolle, ist aber nicht mit der neuen Optionsbestätigung zu einem einzigen Publisher verbunden. Es pinnt API 2026-07.

Shopify beschreibt `productSet` als Synchronisierung eines Sollzustands: in gelieferten Listen werden fehlende Einträge entfernt; nicht gelieferte andere Felder bleiben erhalten. Für gezielte Variantenänderungen gibt es eigene BulkCreate/Update/Delete-Mutationen. Empfehlung: neue DRAFT-Produkte mit vollständigem, bestätigtem Plan; Updates feldbezogen, Metafelder über CAS, keine unbeabsichtigte Löschsemantik. [Shopify: productSet](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productSet).

### 3. Demo-Verpackung ist absichtlich kein Verkaufskanal

`ops/mobile-demo/build.mjs:46–47,75,112` setzt `checkout:false`, eigene Speicher-Namensräume, Demo-IDs/Revisionen, `local-review`, `orderEnabled:false`, `productionConfirmed:false` und entfernt `GravuruWorkshopReview`/`GravuruShopEntry`. Diese Schutzmaßnahmen nicht einfach durch Suchen/Ersetzen umkehren.

Die minimale Promotion übernimmt die bestätigte Oberfläche und ihre notwendigen Module in eine echte native Produktsitzung. Produkt-ID, Revision, Profil, Preis und Cart-Gateway kommen dort aus dem bestehenden Serveranschluss. Demo bleibt separat testbar. Vor dem Main-PR Herkunft und Abhängigkeiten der R15-Dateien erfassen; fremde Verwaltungs-/Importarbeiten im 805-Dateien-Diff nicht beiläufig mitnehmen.

### 4. Alle Stahlformen brauchen echte Konturen

Die gemeinsame Grundplatte ist eine wiederverwendbare Darstellung, keine Geometriequelle. Form, Breite/Höhe, Lochdurchmesser/-positionen und Fertigungsbereich müssen in realen Maßen aus dem bestätigten Profil kommen. Das optische Verhältnis kleiner/großer Bohrungen darf daraus berechnet werden. Es ersetzt nicht das Seitenverhältnis oder eine andere Form.

Ein konkreter R15-Grenzfall: `mobile-demo/motif-size-limit.mjs:8–13,64` unterstützt derzeit nur Rechtecke ohne Rundung. Andere Konturen behalten bei dieser Begrenzung ihre alte Motivgröße. Für **alle Stahlformen** ist das kein fertiger universeller Anschluss. Konturabhängige Begrenzung mit nativer Geometrie ergänzen und pro Form prüfen; Motive weder verzerren noch in eine pauschale Rechteckfläche zwingen.

### 5. Foto/Logo müssen Profilfähigkeiten sein

R15 kopiert den `hidden`-/`disabled`-Zustand der nativen Tabs in Menü, Fußleiste und Desktopreiter (`demo.mjs:257–266`). `ux-model.mjs:16–19` versteckt den Upload-Tab bei deaktivierter Fotofunktion ohne vorhandene Foto-/Logoebenen; explizite Vektorlogos sind eine Ausnahme.

Der Serverpfad `acrylic-review.mjs:42` verwendet `validateProductDesign`; `contract.mjs:338` verweigert `photoSlot` bei `photo.enabled:false`. Logo ist separat: `contract.mjs:339` und `ux-model.mjs:4` behandeln fehlendes `logo.enabled` teilweise als erlaubt. Daher für den neuen Stahl-Pilot **Foto und Logo ausdrücklich festlegen**. Falls nur Logo erlaubt ist, den Bereich als Logo benennen, nicht als Foto. Bestehende Vektorlogo-Regeln und Preise nicht automatisch auf alle Stahlangebote übertragen.

Pflichtabnahme mit manipulierten Requests: deaktiviertes Foto einschleusen, Foto als Logo deklarieren, fremde Original-ID verwenden, versteckte Uploadebene über Reset/Cart-Edit zurückholen. Erwartung: keine unerlaubte Gestaltung oder Medienannahme. Das Tab-Verbergen allein reicht nicht.

## Minimaler verlässlicher Pilotablauf

1. **Sichern und inventarisieren:** Codeversion, vollständiges App-Erweiterungsprojekt, Theme-Dateien, native Produkt-/Binding-/Entwurfsdatenbanken, Assetstore, aktive Preisverträge, Shopify-Produkt-/Varianten-/Metafeld-/Medienexport und aktuelle Webhookkonfiguration. Geschützte Daten bleiben privat; Markdown-Manifest mit Prüfsummen und Wiederherstellungsweg. Eine Git-Zusammenfassung ist keine Datenbank-/Foto-/Shop-Sicherung.
2. **R15 gezielt integrieren:** eigener Integrationsbranch von aktueller offizieller Basis; bestätigte UI samt notwendigen Abhängigkeiten. Checkout zunächst unverändert gesperrt. Mobile/Desktop-Rückweg, Auswahl, Reset, Fotos/Logos, Skalierung und Undo prüfen. Keine pauschale Übernahme des gesamten gestapelten Zweigs.
3. **Stahlgruppen bestätigen:** alle vorhandenen Formen aus echten Quellen auflisten; je Form nur bestätigte Größen, Preise, Befestigungen und Zubehör. Foto-/Logo-/Text-/Motivfähigkeiten ausdrücklich. Unbekannte Werte als offen anzeigen. Ein Prüfplan deckt die ganze Gruppe ab; nicht für jedes Design dieselben Stammdaten neu pflegen.
4. **Galerie-Veröffentlichungsstand erzeugen:** Original-ID + Designrevision + Gruppen-/Profilrevision + Form-/Material-/Format-ID + Ressourcenhashes. Produktbild und Startdesign aus genau diesem Stand. Gemeinsame Grundplatten/Fonts per Referenz; keine Kopie pro Design. Bestellungen speichern ihre unveränderliche Revision.
5. **Shopify-DRAFT-Pilot:** bestätigten Plan zunächst auf wenige repräsentative Angebote anwenden, die jede vorhandene Stahlform abdecken. Wiederholbarer Publisher mit stabiler Zuordnung, Journal und Readback; kein neues Produkt bei bloßem Wiederholen. Titel, Bild, Preis und Variante kontrollieren. Danach die übrigen bestätigten Designs derselben Gruppe stapelweise.
6. **Echte Verbindung in unveröffentlichtem Theme/geeignetem Testsystem:** Produktseite → exakt passendes Design/Format → Optionen → gesicherter Entwurf → normaler Warenkorb → Bearbeiten derselben Position. Zwei verschiedene Gestaltungen desselben Artikels müssen getrennt bleiben. Nur Preise/Formen anbieten, deren Vertrag vollständig angeschlossen ist.
7. **Checkout- und Auftragstest:** alle Aufpreisarten, Menge, ggf. bestehende Rabatte, Rückkehr, Netzunterbrechung, doppelte Klicks, Reload, Sessionablauf und manipulierte Attribute. Bezahlter Testauftrag muss denselben unveränderlichen Gestaltungsstand, Originalmedien und Geometrie in der Werkstatt zeigen. Kein automatischer Fertigungsstart nur aufgrund eines Screenshots oder Cart-Erfolgs.
8. **Bewusste Verkaufsfreigabe:** erst nach ausgewiesenem Ergebnis die konkret geprüften Produkte/App-/Themeversion aktivieren. Produkt ACTIVE allein bedeutet nicht alle gewünschten Vertriebskanäle; Veröffentlichung auf den passenden Kanal ist ein eigener Schritt. [Shopify: publishablePublish](https://shopify.dev/docs/api/admin-graphql/latest/mutations/publishablePublish).

Eine feste Stunden-Zusage wäre vor dem aktiven Preisfunktionscheck und der Konturprüfung unseriös. Der Plus-Plan ist inzwischen bestätigt. Function und Konturen zuerst prüfen; sie bestimmen, ob der bestehende Anschluss direkt nutzbar ist oder ein separates Anpassungspaket nötig wird.

## Danach schnell viele Designs veröffentlichen

Empfohlenes Verhältnis: **Designgruppe → viele Designs; Produktgruppe → bestätigte Formate/Materialien/Ausführungen; Angebot → konkrete Shopify-Zuordnung + Startdesign**. Die Designgruppe „Hunde ohne Foto“ ist somit sinnvoll. Für Edelstahl entsprechend Türschildgruppen definieren. Ein Designwechsel braucht kein erneutes Hochladen aller Fonts und Grundplatten.

„Synchronisieren“ soll einen gespeicherten Vorher/Nachher-Plan zeigen: neue Produkte, aktualisierte Designrevisionen/Bilder, unveränderte Angebote, Konflikte, offene Freigaben. Vor Neuanlage bleibt die Optionsbestätigung obligatorisch. Synchronisierung aktualisiert nur eigene verwaltete Felder; Lager, Bestellungen und Zahlungen bleiben Shopify-Verantwortung. Fremde Shopänderungen werden sichtbar und nicht still überschrieben.

Für den ersten kleinen Pilot sind wenige kontrollierte GraphQL-Mutationen einfacher zu überprüfen. Für große bestätigte Stapel danach JSONL-Bulkjobs mit Status pro Eingabezeile, Ergebnisauswertung, Retry nur fehlgeschlagener Einträge und anschließendem Registry-Readback. Seit API 2026-01 erlaubt Shopify bis zu fünf parallele Bulk-Mutationen pro App/Shop und bis zu 100 MB JSONL. „Job fertig“ ersetzt nicht die Prüfung von `userErrors` je Datensatz. [Shopify: Bulk-Import](https://shopify.dev/docs/apps/build/apis/graphql-admin/bulk-operations/imports).

## Ladeperformance und Serveranschluss

Der Theme-Button lädt heute noch keinen vollständigen Konfi im Hintergrund. Nach dem signierten Einstieg sind bereits Vorwärmung und Nachladen vorhanden: `shop-entry-client.mjs:92–135` lädt maximal vier warme Ziele mit niedriger Priorität und ermittelt bis zu 24 Schrift-/Motivressourcen; gehashte Fonts und Vorschaubilder haben langfristige immutable-Antworten (`shop-entry.mjs:367–375`). Für andere Produkte als Funkklingeln betrachtet die Startressourcenfunktion derzeit mehrere Profildesigns, nicht ausschließlich das tatsächlich gewählte Startdesign.

Empfehlung für den nächsten abgegrenzten Performanceauftrag:

- Produktseite und Hauptbild zuerst; kleiner Theme-Einstieg nur auf wirklich angebundenen Produktseiten.
- Nach stabiler erster Darstellung und bei verfügbarer Verbindung gezielt Konfi-Kern, gewählte Grundplatte, Startdesign und dessen Schriften/Motive vorwärmen. Keine gesamte Font-/Motivbibliothek und kein versteckter vollständiger Konfi pro Produktkarte.
- Produkt-/Variantenwechsel verwirft falsche Vorladearbeit. Doppelte Requests zusammenführen; bei Datensparmodus oder langsamer Verbindung nur beim klaren Öffnungsinteresse vorladen.
- Schriftenliste zunächst mit kleinen Vorschauen, tatsächliche Pfaddaten bei Auswahl; Motive pro Kategorie beziehungsweise sichtbarer Seite; Fotoeditor erst bei Fotofunktion. Rendering muss die wirklich benötigten Startressourcen abwarten, damit kein Ersatzfont die Platzierung verändert.
- Identische gehashte Asset-URLs zwischen Produktseite und Konfi verwenden. Browser-Cachepartitionen, Origin, CORS und Zugangsschutz prüfen: Hintergrundladen auf Shopify garantiert nicht automatisch Cache-Wiederverwendung auf einem anderen App-Host. Keine privaten Entwurfsdaten öffentlich cachen.

Shopify empfiehlt nicht blockierende Scripts sowie Theme-App-Assets über CDN und nur auf benötigten Seiten. Das unterstützt die gestufte Empfehlung; es ist kein bereits gemessener Geschwindigkeitsgewinn dieses Projekts. [Shopify: Storefront-Performance](https://shopify.dev/docs/apps/build/performance/storefront), [Shopify: nicht kritische Scripts defer/async](https://shopify.dev/docs/storefronts/themes/best-practices/performance/defer-scripts).

Vor späterer Veröffentlichung echte Messungen: DNS/TLS, TTFB Produktseite/Proxy/Modell, kalt/warm über Mobilfunk, LCP/INP/CLS, Startdesign vollständig sichtbar/bedienbar, Zahl/Bytes der Requests, Font-/Motiv-Nachladezeit, Fotoverarbeitung, Cart-Latenz, Server-RAM/CPU, Node-Neustart und DB-Lockverhalten. Drei bis fünf gleichzeitige kleine Tests sind für den ersten Pilot sinnvoller als sofortige Massentests. Aktuelle Servererreichbarkeit oder Kapazität wurde in diesem reinen lokalen Audit nicht behauptet.

## Webhooks und Betrieb

Vorhandenen dauerhaften Eingang beibehalten: HMAC über Originalbytes, Duplikate erkennen, schnell nach Speicherung antworten; schwere Exporte separat. Die aktuelle offizielle Vorgabe nennt einen Antwortzeitraum von fünf Sekunden und acht Wiederholungen über vier Stunden. Die lokal mitgelieferte Webhook-Skilldatei enthält abweichende alte Angaben; maßgeblich ist die aktuelle Shopify-Dokumentation. [Shopify: Webhookprüfung und Zustellung](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries).

Zusätzlich zum bezahlten Eingang Storno/Erstattung, geänderte Produkte/Varianten und verlorene Zustellungen behandeln. Ein regelmäßiger lesender Abgleich gleicht Lücken aus. Keine garantierte Reihenfolge oder exakt einmalige Zustellung unterstellen. Galeriesync und Shop-Webhooks dürfen keine gegenseitige Endlosschleife erzeugen: Vorgang, erwarteten Hash und Quelle speichern; fremde Änderungen als Konflikt behandeln.

## Konkrete nächste Arbeitsaufteilung

- **Mika + Nutzer:** alleinige Verantwortung für gemeinsame R15-Oberfläche, verlässliche Produktionsintegration und Abnahme von Mobile/Desktop.
- **Produktdaten-Agent/Astra nach Abstimmung:** vollständige vorhandene Stahlformen, echte Maß-/Preis-/Optionsquellen und bestätigte produktbezogene Profile; keine Änderungen am Shared-Konfi.
- **Shopify-Anschluss:** zunächst ausschließlich aktuelle App/Theme/Proxy/Preisfunktion/Shopplan/Bindings lesen; dann separater Plan für gezielten DRAFT-Publisher und R15-Integration.
- **Abnahme:** eine Prüfliste mit realen IDs, Revisionen, Soll-/Istpreisen, Bild-/Designzuordnung und Bestellnachweis. Lokale Tests, Testshop und echter Verkauf klar getrennt ausweisen.

Damit entsteht die vom Nutzer gewünschte einfache Verwaltung: Design in der Galerie bearbeiten, konkreten Stand bestätigen, synchronisieren und denselben Stand im Shop wiederfinden. Der schnellste Weg nutzt die vorhandenen Sicherheits- und Datenbausteine, schließt die benannten Verbindungen und bewahrt die bereits gekauften Gestaltungen unverändert.
