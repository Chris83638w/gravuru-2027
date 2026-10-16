# Berechtigungsbericht

Prüfung am **16.10.2026** im angemeldeten Amazon Solution Provider Portal. Profil, Anwendung und tatsächlich getestete Operation werden getrennt bewertet. Screenshots des Portals befinden sich im lokalen Übergabepaket; sie werden nicht ungeprüft in das Repository übernommen.

## Profil und Entscheidungen

Das Entwicklerprofil wurde geöffnet. Der Fall **21853960501** steht im Portal auf **„Beantwortet“**. Die Entscheidung vom **07.10.2026, 22:02 EEST** bewilligt globalen Marketplace-Zugriff für die berücksichtigten Rollen. **Direct-to-Consumer Shipping (Restricted)** war ausdrücklich nicht Bestandteil dieser Bewilligung; die Entscheidung verweist für diesen Bedarf auf eine neue Profileinreichung.

Die folgenden neun Rollen sind im aktuellen Profil ausgewählt und wurden mit der Teilbewilligung abgeglichen:

| Profilrolle | Einordnung für gravuru | Erfolgreicher produktiver API-Test |
|---|---|---|
| Product Listing | Angebote, SKU/ASIN, Katalog und Listingfehler | Nein |
| Pricing | Preisabfragen und Gebührenprognosen | Nein |
| Amazon Fulfillment | Amazon-Erfüllungsfunktionen; nicht automatisch eigener FBM-Versand | Nein |
| Buyer Communication | Zugeordnete Kommunikationsfunktionen; kein beliebiger Kundendatenzugriff | Nein |
| Selling Partner Insights | Zugeordnete Berichts-/Analysefunktionen | Nein |
| Finance and Accounting | Finanztransaktionen und Gebührenauswertung | Nein |
| Inventory and Order Tracking | Nicht eingeschränkte Bestell-/Bestandsinformationen | Nein; statische Orders-Sandbox separat nachgewiesen |
| Amazon Logistics | Zugeordnete Logistikfunktionen; kein Ersatz für DTC bei Amazon Custom | Nein |
| Brand Analytics | Zugeordnete Markenanalysefunktionen; weitere Kontovoraussetzungen können gelten | Nein |

**Nicht bewilligt:** DTC. DTC war bei der ersten Bestandsprüfung nicht ausgewählt und wurde anschließend aufgrund der ausdrücklichen Antragsautorisierung im **ungesendeten Portalentwurf** ausgewählt. Das ist keine neue Genehmigung. Tax Invoicing und Tax Remittance sind weiterhin nicht ausgewählt. Diese Tabelle belegt keine pauschale Freigabe sämtlicher Operationen einer API. Maßgeblich sind Rollenmatrix, Anwendung, Verkäuferautorisierung und konkreter API-Test.

Eine Supportnachricht vom **08.10.2026** zum Fall **22422088341** bezeichnete den Antrag als weiterhin in Prüfung. In der begrenzten Nachrichtensuche wurde keine spätere Entscheidung gefunden. Das belegt weder eine laufende neue DTC-Prüfung noch eine inzwischen erteilte DTC-Genehmigung. Für die Umsetzung gilt weiterhin: **DTC fehlt**.

## Anwendung und Autorisierung

Im Portal existiert die Anwendung **AMZ_GRAVURU_01** als **Sandbox-Anwendung**. Eine produktive, für den Verkäufer autorisierte private Anwendung ist in diesem Prüfstand nicht nachgewiesen. Die Existenz der Sandbox-App ist unabhängig von der Profilbewilligung zu bewerten.

Nach ausdrücklicher Freigabe wurde ein Sandbox-Refresh-Token erstellt und außerhalb des Repositorys gesichert. LWA- und Sandboxzugang wurden tatsächlich getestet. Zugangsdaten und Tokenwerte sind weder Bestandteil dieses Berichts noch des API-Nachweises.

| Nachweisebene | Ergebnis |
|---|---|
| Entwicklerprofil und globale Teilbewilligung | Eingesehen; neun oben genannte ausgewählte Rollen |
| Registrierte Anwendung | AMZ_GRAVURU_01, Sandbox |
| LWA | Echter Tokenabruf HTTP 200 |
| Orders `v2026-01-01`, `getOrder` | Echter Aufruf der statischen EU-Sandbox HTTP 200 |
| Produktive Orders-Leserechte | Nicht geprüft; produktive Abrufe in der integrierten Laufzeit gesperrt |
| Produktive Listings/Catalog/Fees/Finances | Nicht geprüft |
| Amazon Custom / Empfängeradresse | DTC fehlt; kein Abruf echter eingeschränkter Daten |
| Buy Shipping / Carrierkonto | Kein produktiver Tarif-/Label-/Trackingtest |
| Cloud-Sicherheitskontrollen | Nicht technisch geprüft |

Die Rootadresse antwortete zunächst mit einer 1.651 Byte großen Plesk-Standardseite. Die anschließende Prüfung des tatsächlichen Pfads [app-2027.gravuru-designwerkstatt.de/werkstatt/](https://app-2027.gravuru-designwerkstatt.de/werkstatt/) lieferte **HTTP 200**, **16.336 Byte** und den Seitentitel **„Gravuru 2027 · Werkstatt“**. Damit ist die erreichbare Webanwendung belegt. Interne Cloudkonfiguration, aktiver Quellstand, Datenbank, Betreiber/Region und Sicherheitsumsetzung sind weiterhin ungeprüft. Die neue Amazon-Integration wurde nicht produktiv deployed.

## Was für produktive Bestellungen und Custom fehlt

Für nicht eingeschränkte Bestelldaten kann grundsätzlich eine passende vorhandene Nonrestricted-Rolle ausreichen. DTC ist nicht pauschal Voraussetzung jedes Bestellabrufs. Es fehlen jedoch eine nachgewiesene produktive Anwendung und Verkäuferautorisierung, geprüfte Betriebsbedingungen und die ausdrückliche Freigabe eines begrenzten Echtdatenabrufs. Die Sandbox-Autorisierung ersetzt diese Schritte nicht. [Amazon-Rollenmatrix](https://developer-docs.amazon/sp-api/docs/role-mappings), [Private Selbstautorisierung](https://developer-docs.amazon/sp-api/docs/self-authorization).

Die Orders API `v2026-01-01` klassifiziert `orderItems.product.customization.customizedUrl` als personenbezogene Daten. Für Custom-Daten händlererfüllter Bestellungen verlangt Amazon **Direct-to-Consumer Shipping (Restricted)**. In dieser API-Version entfällt das RDT, nicht die Rollenpflicht. Steuerrollen ersetzen DTC für Custom nicht. Vor einem späteren Test müssen die Rolle bewilligt, der App zugeordnet und die erforderliche Autorisierung hergestellt sein. [Amazon: Access Orders PII](https://developer-docs.amazon/sp-api/docs/access-orders-pii).

Die DTC-Antragstellung ist ausdrücklich autorisiert. DTC und fünf sachliche Texte wurden im Portalentwurf ergänzt; der Antrag wurde **nicht abgeschickt**, weil der Nutzer die Schutzmaßnahmen als bisher geplant bzw. unsicher eingeordnet hat und sieben vorhandene Ja-Angaben nicht belegt sind. Es fehlen tatsächliche Sicherheitsnachweise, keine weitere allgemeine Einreichungserlaubnis. [Aktueller Antragsstand](DTC-ANTRAGSSTAND.md), [Antwort-/Nachweismatrix](DTC-SICHERHEITSFRAGEN.md).
