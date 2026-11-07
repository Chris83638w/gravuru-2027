# Edelstahl-Andenken: tatsächlicher Shop-Entwurf und Übergabe an Mika

Stand 07.11.2026, Astra, eigener Branch `dev/astra-andenken-shop-pilot-20261107`, auf `5018791574bd7332bcc15c35824608e5f75814d7` / Draft #188. Dieses Paket ergänzt einen geprüften ersten Shop-Entwurf. Es aktiviert keine allgemeine Synchronisierung und veröffentlicht nichts.

## Auftrag und Ergebnis

Nutzerauftrag: „Ok, mach mit Mika weiter und erstellt den Shop-Piloten für die freigegebenen Edelstahl-Andenkenschilder mit den normalen Befestigungen. Erst als Entwurf, noch nichts live.“ Root hielt gemäß [#168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6705068407) den einzigen Shopify-Schreibweg. Keine doppelte Pilotanlage durch andere Accounts.

109 konkrete Edelstahl-/Formatstände waren am 07.11. um 09:26 UTC tatsächlich freigegeben. Sie verteilen sich auf 21 native Gruppen und 105 Befestigungsvarianten. **Dieser erste Pilot umfasst vier dieser 109 Designs in genau einer Größe.** Die übrigen 105 Designs, andere Größen und Acryl sind nicht in diesem Shop-Entwurf enthalten. Originale gemäß [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); keine Neugestaltung oder Agentenfreigabe.

| Gegenstand | Tatsächlicher Stand |
|---|---|
| Shopify | [Andenkenschild Edelstahl – 5 × 2 cm](https://admin.shopify.com/store/gravuru-design/products/16196606001532), `gid://shopify/Product/16196606001532` |
| Status | `DRAFT`, `publishedAt=null`, `onlineStoreUrl=null`; abschließender API-Readback im Belegordner |
| Privater Konfi | `cfg_95f1e9be-0a63-4168-8cbe-d19b789546a5`, Revision 1 |
| Galeriequelle | `cfg_356fc5ed-567e-4567-905c-378818fd5872`, Revision 1, unverändert |
| Originale | `TRE-V2A-5x2-D401`, `D406`, `D408`, `D410` (jeweils vollständiges Präfix); native Design-IDs `katalog-` + Original-ID |
| Rohling / Familie | `GR-ES-RE-50X20-T15`, `steel-door-signs`, Rechteck 50 × 20 × 1,5 mm |
| Medien | Vier Original-Konfi-Vorschauen, jeweils 1800 × 791 PNG; alle vier Shop-Medien `READY` |
| Bindung | Fünf vorhandene native `form_shop_bindings` auf genau Zielrevision 1, Preise und Optionen aus echtem Shop-Readback bestätigt |
| Sichtfreigabe | Keine zusätzlichen Häkchen gesetzt; Freigabe gilt weiterhin nur dem jeweiligen gespeicherten Galerie-Original/Material/Format |

| Normale Befestigung | Schlüssel | Preis | Shopify-Varianten-ID |
|---|---|---:|---|
| Ohne Bohrung | K00 | 7,99 € | 58162739446140 |
| Selbstklebend – glatte Flächen | KGL | 10,98 € | 58162739478908 |
| Selbstklebend – raue Flächen | KRA | 11,98 € | 58162739511676 |
| Mit 2 Bohrlöchern | B02 | 10,48 € | 58162739544444 |
| Mit 2 Schrauben | B02S | 10,68 € | 58162739577212 |

Bohrungen laut vorhandener Geometrie: 2 × Ø4 mm, Mittelpunkte (4,10)/(46,10) mm. Für Schrauben gilt die spätere bestätigte Preisquelle +269 Cent, nicht der ältere Extraktionswert +299 Cent; siehe `ENTSCHEIDUNGEN.md` 4.17/4.18 und historischen Status vom 26.10. Keine zweite Preis-/Geometrielogik eingeführt.

## Tatsächliche Ausführung und Sicherung

1. Quellen- und Freigabefingerprints gegen aktuelle private Galerie gelesen. Plan bindet Quelle R1, vier konkrete Designs und benötigte Originalressourcen. Geänderte/entzogene Freigaben verhindern den nativen Import.
2. Vor dem Schreiben frische SQLite-Sicherung aller fünf DBs mit `quick_check`, Prüfsummen und 348 vorhandenen Produktköpfen. Neuer Pilot als zusätzliche native Gruppe; danach 349, alle 348 bisherigen Köpfe unverändert. [Sicherungs-/Importbeleg](../reviews/2026-11-07-shop-pilot/native-import-proof.json).
3. Isolierter Operatorbereich `/var/www/vhosts/gravuru-designwerkstatt.de/private/steel-shop-pilot-20261107-v1`, darin `backup/`, `source.json`, `native-result.json`, `claim-result.json`, `reconcile-result.json`, getrennte `runtime/`. Keine Umschaltung der laufenden Anwendung. Aktive Site 19 bleibt `gravuru-2027-bulkapproval-3db1ef5d`; Site 20 unverändert.
4. Echte Shopify-Suche über den eindeutigen Handle einschließlich aller Status ergab null Treffer. Lokales Transferjournal reservierte einmalig. Genau ein `productSet` mit `status:DRAFT`, kein Publish. Anschließende vollständige Suche bestätigte genau einen Entwurf und alle fünf Varianten. Fünf native Standardbindungen gespeichert; Transfer `transfer_36bf4e4b-e1da-48eb-8a12-5dea6fa116cc` abgeschlossen. Bei unklarem Schreibausgang ausschließlich `reconcile`, niemals erneute Anlage.
5. Vier aus den freigegebenen nativen SVGs gerenderte PNGs über den Shopify-Connector hochgeladen, bestehende File-IDs per `fileUpdate.referencesToAdd` diesem Entwurf zugewiesen. Danach tatsächlicher Produkt-/Varianten-/Medien-Readback. Keine nachträgliche Designbearbeitung in den Bildern.

Plan SHA256 `6c48e87ce620d0661d01cbe2c218f9ef247764af68310bb710ff675a0d6adbb7`; natives Dokument SHA256 `b4978d16f814e93791336f545db82060c54be87eb6c5cbbbd169e5c9e49a6838`; Request SHA256 `c255f285d0a82761a49d23b02f900efbafb53788786d6bd8b9d36bc32689596e`. Der Handle lautet `gravuru-5b8d6aaea0f2451fc67bd8a62937d92e789a970ed0cf0c239db5af420e07a9af`.

Rückweg: Erst gezielt Operatorjournal/entstandenen Pilot vergleichen. Keine gesamte alte DB über neuere Nutzerarbeit zurückkopieren. Sicherung ist Wiederherstellungsquelle, kein automatischer Rollbackauftrag. Shop-Entwurf unveröffentlicht belassen, kein Löschen ohne Auftrag.

## Prüfung und konkrete Grenzen

- Sieben neue Vorbereitungstests bestanden: Freigaben/Ressourcen, zusätzliche unbestätigte Designs, veraltete/entzogene Stände, idempotente native Übernahme, Erhalt bearbeiteter Ziele, echter CLI-Aufruf mit Freigabe-DB sowie paralleler Widerruf und Freigabe der DB-Sperre nach Erfolg/Fehler.
- Zehn neue Abgleichtests bestanden: echte vollständige Belege, maximal 60 Sekunden alt, DRAFT/unveröffentlicht, falscher Shop/Preis/Optionen/IDs, verlorener Ausgang, Wiederaufnahme, lokale Bindungen und optionale ID-Registry. Kein Netzaufruf in diesem Operatoradapter.
- Bestehender Shop-Transfer-Regressionslauf: 22/22 bestanden, einschließlich echter lokaler HTTP-/CSRF-Prüfung. Der erste eingeschränkte Windows-Lauf scheiterte bereits beim Umbenennen temporärer Bundledateien (`EPERM`), nicht an Shopassertionen; unveränderter Test außerhalb dieser Dateibeschränkung erfolgreich. Insgesamt 39 verschiedene gezielte Tests bestanden, keine ausgelassen.
- Tatsächlicher Chrome-Kundenkonfi: vier Designs/fünf Befestigungen angezeigt; „Mit 2 Schrauben“ ergibt 10,68 €. Name als ausschließlich separaten Kundenentwurf auf `Pilotprüfung` geändert, Entwurf gespeichert und Prüfstand im Dashboard wieder geöffnet. [Speichern](../reviews/2026-11-07-shop-pilot/private-konfi-save.png), [Wiederöffnung](../reviews/2026-11-07-shop-pilot/private-konfi-readback.png).
- Prüfstand `proof_e6f3d973-f918-4517-8131-7164a060acd2`, Entwurf 1 / Produktstand 1. Dashboard bestätigt 50 × 20 mm, zwei Schrauben, 10,68 €. Dies ist keine Bestellung. Die Galerieoriginale wurden dadurch nicht geändert.
- GET-Prüfung der neuen Konfi-Seite, Modelle und D401-Vorschau jeweils HTTP 200. D401-SVG entspricht der freigegebenen Quelle (SHA256 `cebd9e1dc751b8012be53fbf17a6b156984e858f3f067fa90473ae38de4662b9`). Automatisierte browserfremde Direkteinstiege lieferten weiterhin 403; Adressleisteneinstieg im vorhandenen Chrome funktionierte. Das löst die frühere zeitweise Frame-Störung noch nicht allgemein.
- Abschließender erneuter Host-Readback um 10:05:59 UTC bestätigt Quelle R1 und alle vier Freigabeereignisse vollständig unverändert gegenüber dem Vorherstand: [Original-/Freigabeabgleich](../reviews/2026-11-07-shop-pilot/final-source-check.json).
- Das unabhängige Review fand eine Parallelitätslücke zwischen Freigabe-DB und nativer Import-DB. Für künftige Operatorläufe behoben: kurze `BEGIN IMMEDIATE`-Reservation der Freigabe-DB vor nativer Importtransaktion, `ROLLBACK` nach Commit/Rücklesen oder Fehler; keine Approvaldatenänderung. Sperrreihenfolge entspricht dem normalen Freigabepfad. Zwei zusätzliche Tests mit zweiter DB-Verbindung bestehen. Diese nachträgliche Härtung wurde nicht erneut auf dem Host ausgeführt; die oben dokumentierte tatsächliche Quelle und ihre vier Ereignisse sind unverändert geblieben.

**Noch nicht bewiesen/eingerichtet:** Shopify-Produktseite → Konfi → echter Warenkorb/Checkout, Produktion/Maschinenabnahme, dauerhafter `management.synchronizer`, signierter automatischer Medienweg und vollständige Sync-Registry. Kein Theme-/Metafieldanschluss an einen ungeprüften Kundenendpunkt gesetzt. Die zusätzliche storebezogene ID-Registry wurde nicht geschrieben: Im privaten Host gibt es keinen belegten bestehenden `store_id`-Kontext. Die fünf Standardbindungen sind tatsächlich vorhanden; das ist nicht gleichbedeutend mit Shop-End-to-End-Abnahme. `reviewOnly=true`, `orderEnabled=false`, `productionConfirmed=false` bleiben erhalten; keine `catalog_live_order_approvals` angelegt.

## Mika: jetzt genau diesen Pilot verwenden

Zuerst diese Übergabe, dann [echten Shop-Readback](../reviews/2026-11-07-shop-pilot/shopify-readback.json), [native Bindungen](../reviews/2026-11-07-shop-pilot/native-shop-bindings.json), [Medien-IDs](../reviews/2026-11-07-shop-pilot/shopify-image-references.json) und deinen Draft #185 lesen. Keine zweite Anlage.

Nächster Integrationsschritt: tatsächlichen Store-Kontext für deine Registry belegen, fünf vorhandene Varianten übernehmen, gleichen nativen Stand/Medien mit deinem Vorschau-/Differenz-/Syncpfad verbinden und privaten Shop→Konfi→Testwarenkorb-Nachweis liefern. Erst dann die verbleibenden bestätigten Gruppen planen. Root bleibt bis ausdrücklicher Übergabe alleiniger Shopify-Schreiber. Eigener Branch/Draft-PR, kein main-Merge, keine Live-/Site-20-Aktivierung.

## Claudes Gesamtlieferung ist noch nicht vollständig online

[Vollständiger Bestandsabgleich](../reviews/2026-11-07-shop-pilot/catalogue-online-coverage.json) bezieht sich ausdrücklich auf Lieferung `86c1ff5f` und den tatsächlich gelesenen Galeriestand vom 07.11., nicht auf einen behaupteten aktuellen Katalog-main.

- Online: 462 Originalkarten, 370 bearbeitbar, 240 Rohlinge, 2.449 vorbereitete +101 offene Material-/Formatziele.
- Von den zehn Türschild-Themen ist bislang der Probelauf plus Andenken übernommen. Die neun übrigen Themen enthalten 2.366 zusätzliche Original-IDs (Familie, Hinweis, Hausnummer, Pferde, Hochzeit, Firma, Willkommen, Hunde, Katzen).
- Diese neun Themen sind nicht „alle übrigen Materialien“. Die Gesamtlieferung enthält zusätzlich 17 andere Masterstapel und 192 Bestandsstapel. 20.598 Registereinträge sind keine Zahl einmaliger Designs; 1.065 Bestandsreferenzen zeigen auf Master und dürfen nicht doppelt angelegt werden.
- Die zehn vorbereiteten Türschildläufe umfassen bereits rund 20,47 GB minifizierte native Dokumentdaten mit wiederholten eingebetteten Ressourcen. Vor Massenimport Ressourcenteilung und seitenweises Laden absichern; nicht ungeprüft alles in einen Galeriestart laden. Claudes Quellvorbereitung ist nicht mit nativer Onlineübernahme gleichzusetzen.
- 129 unsichere Ersatzschriften sind Schriftzuordnungen, nicht pauschal 129 Designs. Weiter sichtbar markieren; echte Blocker auslassen. Endgültige Unterkategorienliste bleibt offen.

Die neu gewünschte [Zuordnung einzelner/mehrerer Designs zu anderen Familien und Produktlinien](2026-11-07-design-familienzuordnung-plan.md) ist fachlich/technisch vorbereitet, **noch nicht implementiert oder online**. Die vorhandenen 3-mm-Familien Schwarz/Anthrazit benutzen; historische AS/AA-Abstandshalter mit 5 mm getrennt halten. Zuordnung darf keine Sichtfreigabe übernehmen. Das ist das nächste Galeriepaket, nicht eine im Shop-Pilot versteckte fertige Funktion.
