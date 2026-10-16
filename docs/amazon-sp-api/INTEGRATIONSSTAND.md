# Technischer Integrationsstand

Stand: 16.10.2026. Lokaler Entwicklungsstand mit statischer Amazon-Sandbox und synthetischen Daten. Die Funktionen nutzen die bestehende Node-/SQLite-Werkstatt, deren Produktstände und gesicherte Gestaltungen.

## Module und belastbare Grenzen

| Modul | Implementierter Entwicklungsstand | Noch nicht nachgewiesen / freigegeben |
|---|---|---|
| API-Verbindung | LWA, Token-Cache mit Ablaufpuffer und gemeinsamer Erneuerung; HTTPS-Hostliste; Timeouts und begrenzte Wiederholungen; Fehler-/Logreduktion | Produktive Verkäuferautorisierung und produktive Endpointrechte |
| Bestellungen | Orders `v2026-01-01`, nicht eingeschränkte Projektion, eindeutige Konto-/Marktplatz-/Auftrags-/Positionszuordnung, wiederholbarer Import, Statusänderungen/Storno, Fortsetzungsstände | Automatischer Import echter Verkäuferbestellungen |
| Dashboard | Amazon-Bereich innerhalb der Werkstatt; Testpositionen, Herkunft, Währung, Prüfbedarf, SKU-/Produktstand- und Prüfstandzuordnung | Produktive Cloudbereitstellung und echte Produktionsabnahme |
| Amazon Custom | JSON-/ZIP-Testimport exakt zu Auftrag/Position/SKU; unveränderliche Originale und Revisionen; manuelle Feldwahl, Vorschau, Review-Hash und Versionsvergleich bei Bestätigung | DTC, echter manueller/API-Download, echte Formatmuster, vollständiges Bildlayout und Produktionsparität |
| Begleitscheine und Scans | Automatische A4-PDF beim Auftragsimport; A4-/A5-Stapel, Code 128 für Auftrag/Position, Druckwarteschlange, interne Teststufen Fertigung → Qualität → Versandvorbereitung | Physischer Druck-/Scannertest; kein Carrierlabel, keine Fertigungs- oder Versandfreigabe |
| Artikel | Lesemethoden für Listings/Catalog mit Rollengates; lokale SKU/ASIN-, Angebots-, Bestands-, Varianten- und Fehlerdatenstruktur | Vollständiger Händlerkatalog, echter Finanz-/Bestandsabgleich; keine Listingmutation |
| Versand | Prüfung von Restmengen, Paketdaten und Versand-/Lieferfenstern; Entwurf einer Amazon-Versandbestätigung | Adresse, Carrieranbindung, Labels, Lieferscheinausgabe, tatsächliche Trackingereignisse und Versandrückmeldung |
| Wirtschaftlichkeit | SKU-/ASIN-bezogene Centberechnung mit gleicher Währungs-/Steuerbasis; unbekannte Kosten bleiben unbekannt; tatsächliche Werte von Prognosen getrennt | Automatischer Kostenabgleich, Helium-10-Daten, Ads-Autorisierung, echte Kostenbelege |
| Aufbewahrung | Reine Vorschau mit Datenklassen, Fristen, dokumentierten Ausnahmen und Prüfbedarf | Automatische Löschung, produktiver Backup-/Restoreprozess und rechtliche Freigabe |

Aktuelle Zahlen und Umfang der automatisierten Prüfungen einschließlich Custom-Import, PDF und Scans: [siehe Testnachweis](ABNAHME.md). Der tatsächliche Sandboxaufruf und die lokale Browserprüfung sind separat belegt. Frühere Teilzahlen gelten nicht automatisch als Gesamtabnahme der Erweiterung.

## API-Vertrag

Die neue Orders API **v2026-01-01** ist offiziell veröffentlicht. Die sechs älteren v0-Leseoperationen sollen laut Amazon am **27.03.2027** entfallen. Dieser Termin darf nicht pauschal auf `confirmShipment` übertragen werden. [Versionseinführung](https://developer-docs.amazon/sp-api/changelog/new-introducing-the-orders-api-v2026-01-01), [Abkündigungen](https://developer-docs.amazon/sp-api/docs/sp-api-deprecations).

| Zweck | Dokumentierter Pfad | Lokale Behandlung |
|---|---|---|
| Bestellungen suchen | `GET /orders/2026-01-01/orders` | `searchOrders`; höchstens 100 Ergebnisse je Seite, validiertes Zeitfenster und Fortsetzung |
| Einzelbestellung | `GET /orders/2026-01-01/orders/{orderId}` | `getOrder`; explizite Feldprojektion |
| Eigene Listings | `GET /listings/2021-08-01/items/{sellerId}` und `/{sku}` | Nur lesen, Rollengate Product Listing |
| ASIN-Katalog | `GET /catalog/2022-04-01/items/{asin}` | Nur lesen, Rollengate Product Listing |
| Gebührenprognose | `POST /products/fees/v0/listings/{SellerSKU}/feesEstimate` | Berechnung, keine Preisänderung; Ergebnis bleibt Schätzung |
| Finanztransaktionen | `GET /finances/2024-06-19/transactions` | Nur lesen, Rollengate Finance and Accounting |
| Versandbestätigung | `POST /orders/v0/orders/{orderId}/shipmentConfirmation` | Ausschließlich lokaler Requestentwurf; keine Transportmethode |

Die regulären Orders-Methoden verlangen nicht eingeschränkte `includedData`-Werte. Käufer, Empfänger, Custom-URL, Freitextgründe und andere nicht freigegebene Felder werden nicht gespeichert. Ein vorhandener Custom-Verweis kann als boolesches `customizationAvailable` erhalten bleiben, ohne die URL weiterzugeben. Ein fehlender Verweis ist wegen fehlender Rechte kein Beweis, dass ein Produkt ohne Personalisierung hergestellt werden darf.

`searchOrders` verwendet genau eines von `createdAfter` und `lastUpdatedAfter`, sichere Zeitgrenzen und dieselben Filter beim Seitenwechsel. Die Datenbank schreibt Seite und Fortsetzungsstand gemeinsam. Wiederholte Cursor und widersprüchliche Wiederaufnahme werden abgewiesen. Amazon-Quoten sind operations- und kontospezifisch; ein erfolgreicher Fixtureaufruf belegt keine dauerhafte Produktionsrate. [Orders-Referenz](https://developer-docs.amazon/sp-api/lang-en_us/reference/searchorders).

## Personalisierung und Designwerkstatt

Amazon dokumentiert im neuen Modell den geschützten Custom-Dateiverweis. Es gibt keinen dokumentierten `includedData=CUSTOM`- oder `PRODUCT`-Parameter. Die möglichen ZIP-Inhalte umfassen nach offiziellen Amazon-Hinweisen JSON/XML, Kundenbilder und Gestaltungsinformationen; daraus folgt noch kein stabiler, vollständig veröffentlichter Layoutvertrag. [Orders-Modell](https://github.com/amzn/selling-partner-api-models/blob/main/models/orders-api-model/orders_2026-01-01.json), [Amazon-Auskunft zu Custom-Dateien](https://sellercentral.amazon.com/seller-forums/discussions/t/f3cac93a-ffb3-4529-af10-640116e2ab03).

Der Inspektor nimmt ausschließlich als synthetisch oder anonymisiert gekennzeichnete, ausdrücklich zur Prüfung freigegebene Muster an. Diese Klassifizierung wird nicht automatisch bewiesen. Das Modul lädt nichts herunter, entpackt nichts in das Dateisystem und rendert keine Kundeninhalte. JSON-Felder werden als mögliche Kandidaten mit `reviewRequired` gemeldet; XML wird nicht strukturell importiert, SVG nicht gerendert und Bilder nicht dekodiert. Das Ergebnis bleibt `productionReady:false`.

Darauf aufbauend speichert `amazon-custom-import.mjs` Testoriginale mit SHA-256 in der vorhandenen privaten SQLite-Ablage. Bestellnummer, Position und SKU werden exakt abgeglichen. Ausgewählte Texte/Optionen und Bildreferenzen werden zunächst geprüft und anschließend gegen Version, Hash und unveränderten Auftragskontext bestätigt. Das ersetzt weder ein gesichertes Gesamtbildlayout noch die bestehende native Prüfstandzuordnung. Details und Bedienung: [Custom-Dateiimport und Barcodes](CUSTOM-DATEIIMPORT-UND-BARCODES.md).

`amazon-paperwork.mjs` und `amazon-paperwork-pdf.mjs` erzeugen unveränderliche Testbegleitscheine mit vollständiger Bestellnummer und einem stabilen `G27P-`-Positionsbarcode. PDF-Erstellung, Benutzerbestätigung eines Ausdrucks und interner Scanfortschritt sind getrennt. Standardmäßig öffnet ein Scan nur den Auftrag. Eine ausdrücklich gewählte Stufenaktion betrifft beim Bestellbarcode alle zugehörigen Positionen; beim Positionsbarcode eine Position. Druckwarteschlange und Auftragskontext besitzen Änderungsschutz, der stabile Barcode selbst kodiert jedoch keine Druckrevision. Physische Geräte und vollständiger Custom-Layoutabgleich bleiben ungetestet.

Vor der späteren Abnahme sind autorisierte Muster je Produkttyp erforderlich: Texte, Bilddateien, Designwahl, Varianten, Stückzahl, Einheiten, Schrift, Flächen und Positionierung müssen mit dem tatsächlichen Auftrag verglichen werden. Ein Motiv bleibt ein einzelnes Gestaltungselement; ein Design ist die vollständige Komposition. Die Integration darf diese bestehenden Begriffe nicht vermischen.

## Versand und Wirtschaftlichkeit

`amazon-fulfillment.mjs` erzeugt nur Entwürfe. Ein gekauftes Label würde noch keine physische Übergabe oder Zustellung beweisen. Unbekannter Status bleibt unbekannt; Teilmengen, Storno und widersprüchliche Restmengen blockieren einen Versandentwurf. Der Requestentwurf für Amazon verlangt unter anderem eine bestätigte Übergabe an den Carrier. Er wird nicht versendet.

Amazon Buy Shipping / Merchant Fulfillment verlangt DTC. Shipping API v2 ist als neuer Integrationsweg dokumentiert; ihre konkrete DE-/Kontoverfügbarkeit wurde hier nicht bestätigt. Direkte Carrierwege sind DHL Versenden REST v2, DPD Webservices und Deutsche Post INTERNETMARKE REST. Vertrags-/Testzugänge sind ungeprüft. INTERNETMARKE SOAP wurde laut Anbieter zum 31.12.2025 eingestellt; eine gewöhnliche Portokasse ist keine kostenlose Testkasse. [Carrierquellen](QUELLEN.md#versanddienstleister).

Die Wirtschaftlichkeitsrechnung umfasst Amazongebühren, Werbung, Versand, Material, Produktion und Retouren. Alle Beträge müssen sich auf dieselbe Menge bzw. Zuordnung und denselben Zeitraum beziehen. Fehlende Kosten werden nicht als Null gerechnet; Bruttosaldo ist kein Netto-Deckungsbeitrag. Gebührenprognosen ersetzen keine tatsächlichen Finanztransaktionen. Fremdwährungen werden nicht still umgerechnet. Die Auswahl unterstützter Kalkulationswährungen ist explizit; das BRL-Sandboxbeispiel muss deshalb nicht automatisch kalkulierbar sein.

Helium 10 benötigt eine erneute Anmeldung; in diesem Stand wurden keine Helium-10-Kostendaten übernommen. Amazon Ads verwendet eine separate API-Autorisierung. Beide sind unabhängige Datenquellen, keine automatisch vorhandenen SP-API-Berechtigungen.

## Noch offene Abnahmen

1. Neue Custom-/PDF-/Scanprüfungen im [Testnachweis](ABNAHME.md) festhalten; tatsächlichen Drucker und Scanner für A4/A5 separat abnehmen.
2. Erreichbare Werkstatt unter `/werkstatt/` ist bestätigt. Dahinterliegende Cloudarchitektur, Benutzerrollen, Secrets, Verschlüsselung, Backups und Wiederherstellung prüfen; dieser Branch ist dort nicht installiert.
3. Produktive private App und Verkäuferautorisierung klären; anschließend einen ausdrücklich freigegebenen Minimalabruf nicht eingeschränkter Bestellungen testen.
4. Bereits autorisierten DTC-Antrag nach belegter Sicherheitsprüfung wahrheitsgemäß vervollständigen und einreichen. DTC und fünf Texte stehen im ungesendeten Portalentwurf; sieben vorhandene Ja-Angaben sind nicht belegt. Nach Amazon-Entscheidung App-/Autorisierungsebene prüfen.
5. Custom-Dateien mit autorisierten Mustern in die vorhandene Designwerkstatt abnehmen.
6. Carrier- und Kostenquellen zunächst in deren echten Testumgebungen anschließen; produktive Schreib-/Kaufaktionen jeweils gesondert freigeben.
