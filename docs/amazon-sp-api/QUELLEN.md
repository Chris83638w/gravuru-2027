# Offizielle Quellen und Recherchegrenzen

Recherche und Abruf: **16.10.2026**. Die Quellen beschreiben API-Verträge und Richtlinien. Die tatsächlichen Kontoberechtigungen ergeben sich separat aus dem [Portalbefund](BERECHTIGUNGEN.md); produktive Funktionsfähigkeit ist nicht aus Dokumentation ableitbar.

## Orders, Rollen und Autorisierung

| Quelle | Verwendete Aussage |
|---|---|
| [Orders v2026-01-01 – Einführung](https://developer-docs.amazon/sp-api/changelog/new-introducing-the-orders-api-v2026-01-01) | Neue Version, veröffentlicht am 28.01.2026 |
| [SP-API-Abkündigungen](https://developer-docs.amazon/sp-api/docs/sp-api-deprecations) | Sechs ältere Orders-Leseoperationen: Entfernung am 27.03.2027 |
| [Orders-Migrationsleitfaden](https://developer-docs.amazon/sp-api/docs/orders-api-migration-guide) | Neues Datenmodell und geänderter PII-Zugriff |
| [searchOrders](https://developer-docs.amazon/sp-api/lang-en_us/reference/searchorders) | Suchparameter, `includedData`, Zeitfenster und Pagination |
| [getOrder v2026-01-01](https://developer-docs.amazon/sp-api/lang-es_es/reference/getorder-3) | Einzelabruf und Antwortstruktur |
| [Offizielles Orders-OpenAPI-Modell](https://github.com/amzn/selling-partner-api-models/blob/main/models/orders-api-model/orders_2026-01-01.json) | Feldnamen, Enums und statische Sandbox-Fixtures |
| [Access Orders PII](https://developer-docs.amazon/sp-api/docs/access-orders-pii) | Custom-URL als PII; DTC/FBM; neue Orders ohne RDT |
| [Rollenmatrix](https://developer-docs.amazon/sp-api/docs/role-mappings) | Operationsbezogene Rollen statt pauschaler API-Freigabe |
| [Rollen in SP-API](https://developer-docs.amazon/sp-api/docs/roles-in-the-selling-partner-api) | Rollen-/Berechtigungsmodell |
| [Selbstautorisierung](https://developer-docs.amazon/sp-api/docs/self-authorization) | Private Anwendungen; App-/Verkäuferautorisierung |
| [LWA / Aufruf von SP-API](https://developer-docs.amazon/sp-api/lang-it_IT/docs/onboarding-step-8-call-the-sp-api-in-production) | Refresh-Token-Austausch über LWA |
| [Entfall IAM / SigV4](https://developer-docs.amazon/sp-api/lang-es_ES/changelog/sp-api-will-no-longer-require-aws-iam-or-aws-signature-version-4) | Seit 2023 kein IAM-/SigV4-Zwang für SP-API-Aufrufe |
| [Marketplace-IDs](https://developer-docs.amazon/sp-api/docs/marketplace-ids) | DE `A1PA6795UKMFR9`; Fixturemarktplatz Brasilien gesondert |
| [Regionale Endpunkte](https://developer-docs.amazon/sp-api/docs/sp-api-endpoints) | Feste EU-/NA-/FE-Hosts |
| [SP-API-Sandbox](https://developer-docs.amazon/sp-api/docs/sp-api-sandbox) | Statische Testantworten und Grenzen des Nachweises |

## Amazon Custom

- [Amazon-Mitarbeiterauskunft zu Custom-ZIP-Dateien](https://sellercentral.amazon.com/seller-forums/discussions/t/f3cac93a-ffb3-4529-af10-640116e2ab03): mögliche JSON/XML-, Bild- und SVG-Inhalte. Das ist keine vollständige versionierte Layoutspezifikation.
- [Offizielle deutsche Seller-Forum-Auskunft](https://sellercentral.amazon.de/seller-forums/discussions/t/dac17d0f-c2cf-4b4d-9dea-a843478e9678?mons_sel_locale=de_DE): Custom-Dateien und Gestaltungshinweise.
- Maßgeblich für den heutigen APIzugriff bleiben [PII-Matrix](https://developer-docs.amazon/sp-api/docs/access-orders-pii) und [Orders-Modell](https://github.com/amzn/selling-partner-api-models/blob/main/models/orders-api-model/orders_2026-01-01.json). Vendor-spezifische Base64-Regeln dürfen nicht ungeprüft auf Seller-Custom-URLs übertragen werden.

## Artikel, Gebühren, Finanzen und Ereignisse

| Quelle | Verwendete Aussage |
|---|---|
| [Listings searchListingsItems](https://developer-docs.amazon/sp-api/reference/searchlistingsitems) | SKU-/ASIN-Suche, Angebote, Verfügbarkeit, Beziehungen und Probleme |
| [Catalog getCatalogItem](https://developer-docs.amazon/sp-api/reference/getcatalogitem) | Katalogdatensatz und ASIN-Beziehungen |
| [Product Fees getMyFeesEstimateForSKU](https://developer-docs.amazon/sp-api/reference/getmyfeesestimateforsku) | Prognose per POST ohne Listingänderung |
| [Finances listTransactions](https://developer-docs.amazon/sp-api/reference/listtransactions) | Finanztransaktionen; Zeitraum-/Verzögerungs- und Paginationgrenzen |
| [Notification types](https://developer-docs.amazon/sp-api/docs/notification-type-values) | ORDER_CHANGE und Listingereignisse |
| [Amazon-Änderungsprotokoll](https://developer-docs.amazon/sp-api/changelog) | Aktuelle Versions-/Abkündigungshinweise; unter anderem Listings Issues |

Notifications sind eine spätere Erweiterung. Der aktuelle Branch richtet keine SQS-/EventBridge-Ressourcen oder Subscriptions ein. Bei einer späteren Umsetzung ist `LISTINGS_ITEM_ISSUES_CHANGE` **2023-12-13** zu verwenden; die frühere Version 1.0 ist laut Amazon seit 26.08.2026 eingestellt. Werbung bleibt eine getrennte Datenquelle mit eigener Ads-Autorisierung.

## Amazon-Versand

- [confirmShipment](https://developer-docs.amazon/sp-api/reference/confirmshipment): v0-Schreiboperation; im Branch nur Requestentwurf.
- [Merchant Fulfillment](https://developer-docs.amazon/sp-api/docs/merchant-fulfillment-api): Buy Shipping und DTC-Rolle.
- [Shipping-v2-Migration](https://developer-docs.shipping.amazon.com/apis/docs/amazon-shipping-migration-guide): aktueller Integrationsweg und Autorisierung; Amazon Logistics kein allgemeiner DTC-Ersatz.
- [Shipping-v2-FAQ](https://developer-docs.shipping.amazon.com/apis/docs/frequently-asked-questions): Verfügbarkeiten; daraus wurde keine konkrete DE-Kontofreigabe abgeleitet.
- [Shipping-v2-Modell](https://developer-docs.shipping.amazon.com/apis/docs/shipping-api-v2-model) und [Versandworkflow](https://developer-docs.shipping.amazon.com/apis/docs/workflow-for-creating-a-shipment): Tarif-, Kauf-, Dokument- und Trackingoperationen.
- [Neue DHL-Prüfoptionen in Deutschland](https://developer-docs.amazon/sp-api/changelog/new-enum-values-for-domestic-shipments-in-the-germany-amazon-store): zusätzliche Merchant-Fulfillment-Enums ab 01.10.2026.

## Versanddienstleister

| Quelle | Verwendete Aussage |
|---|---|
| [DHL Paket DE Versenden REST v2](https://developer.dhl.com/api-reference/parcel-de-shipping-post-parcel-germany-v2?language_content_entity=de) | OAuth, separate Sandbox, Validierungsmodus und Produktivfreischaltung |
| [DPD Webservices](https://esolutions.dpd.com/entwickler/dpdwebservices.aspx) | Login-/Shipmentservices und Vertragsbezug |
| [DPD Sandbox](https://esolutions.dpd.com/entwickler/dpdwebservices/sandbox.aspx) | Separater Testzugang |
| [DPD Developer Guidelines](https://esolutions.dpd.com/dokumente/API_Developer_Guidelines.pdf) | Login-/Shipmentlimits; PDF direkt nicht vollständig abrufbar, nur offizieller indexierter Auszug geprüft |
| [Deutsche Post INTERNETMARKE REST](https://developer.dhl.com/api-reference/deutsche-post-internetmarke-post-paket-deutschland?lang=de) | SOAP-Ende 31.12.2025; eigene Entwickler-Portokasse für Tests erforderlich |

Es wurden keine Carrierzugänge verwendet, keine produktiven Tarife bestätigt und keine Versandlabels gekauft.

## Datenschutz, Sicherheit und Aufbewahrung

- [Aktuelle Amazon DPP](https://sellercentral.amazon.com/solution-provider/policy?policyType=DPP&locale=en_GB).
- [Aktuelle Amazon AUP](https://sellercentral.amazon.com/solution-provider/policy?policyType=AUP&locale=en_GB).
- [Amazon-Richtlinienupdate, wirksam seit 25.08.2026](https://developer.amazonservices.com/policy-update-for-sp-api).
- [Amazon: Datenverschlüsselung](https://developer-docs.amazon/sp-api/docs/protecting-amazon-api-applications-data-encryption).
- [Amazon: Aufbewahrung und Wiederherstellung](https://developer-docs.amazon/sp-api/lang-en_en/docs/protecting-amazon-api-applications-data-encryption-and-recovery).
- [§14b UStG](https://www.gesetze-im-internet.de/ustg_1980/__14b.html), [§147 AO](https://www.gesetze-im-internet.de/ao_1977/__147.html), [§257 HGB](https://www.gesetze-im-internet.de/hgb/__257.html).
- [DSGVO, amtlicher EUR-Lex-Text](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679).

Die rechtlichen Fristen sind nach Dokumentklasse und Zweck anzuwenden. Weder alte Richtlinien-PDFs noch eine einzige allgemeine Versandfrist ersetzen die aktuelle Prüfung. Umgesetzt ist ausschließlich eine Löschvorschau.
