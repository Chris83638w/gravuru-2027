# Funkklingeln: Bestand und Bindungsprobelauf, 28.10.2026

Codex/Astra. Branch `dev/funkklingeln-anbindung-20261028-astra`, Codebasis `f200509ea106445f4dc86238ac99404b9d0cbca2`. **Nur Prüfung und Probelauf; keine Live-Änderung.**

## Ergebnis

| Prüfung | Ergebnis |
| --- | --- |
| Hauptprodukte im Shopify-Bestand | 126, alle ACTIVE |
| Herkunft | 42 bestehende Produkte weiterverwendet, 84 zuvor neu angelegt; heute 0 angelegt |
| Varianten | 15.120, genau 120 pro Produkt |
| Veröffentlichungen im Onlineshop | 42 veröffentlicht, 84 unveröffentlicht |
| Fehlende Produkte gegenüber dem fixierten Katalogplan | 0 |
| Variantenabgleich: ID, SKU, Preis, Optionen | 15.120 passend, 0 abweichend |
| Gespeicherte aktive Bindungen inkl. Revision und SHA | 15.120 passend, 0 abweichend |
| Aktuelle Konfiguratorrevision | Revision 1 bei allen 126 Produkten |
| Importdokument und Importfingerprint unverändert | 126/126 |
| Startvariante und Startpreis | 126/126 passend |
| Metafeld `custom.customization_id` | 84 korrekt; 42 fehlen; 0 falsch |
| Eigene App-Webhooks | alle drei vorhanden, Ziel app-2027 |
| Gezielte vorhandene Tests | 17/17 bestanden |

Alle Produkt-IDs, Handles, Status, Veröffentlichungszustände, Konfigurator-IDs und Revisionen stehen in [products-126.csv](2026-10-28-funkklingeln-audit/products-126.csv). Der vollständige [Bindungsplan für 15.120 Varianten](2026-10-28-funkklingeln-audit/variant-binding-plan-15120.csv.gz) ist gzip-komprimiertes UTF-8-CSV. Er enthält pro Variante Shopify-Produkt/Variante, SKU, Konfigurator-Produkt/Revision, Preis, alle vier internen Optionswerte, Shopify-Optionsnamen/-werte und beide Dokument-SHAs. Nach dem Entpacken sind es 15.120 Datenzeilen.

Die Varianten sind bereits korrekt gespeichert. Das offene Problem liegt beim Produkteinstieg und bei der Veröffentlichung, nicht bei fehlenden Variantenbindungen.

## Belege und Abgrenzung

- Vollständiger frischer Shopify-Leseexport: 28.10.2026, 11:15:21–11:30:03 UTC; 1.324 Shopprodukte mit 26.655 Varianten, einschließlich aller Variantennachläufe. Der vollständige Shopabzug wurde für shopweite SKU-Kollisionen geprüft; nur Funkklingelergebnisse sind hier abgelegt.
- Katalog: `Chris83638w/gravuru-katalog.`, Commit `caf50a6151cb0251813e341193487b0d9c3a2be3`, Datei `migrationen/funkklingeln-42x3-20261027/main-products-126.json`, Git-Blob `71c3e7645939dd1f797514f05f91d3da1fe4ba3f`. Umfang: 42 Modelle × drei Hauptformate. Die Aussage „0 fehlen“ bezieht sich auf diesen Plan, nicht auf noch nicht aufgenommene zusätzliche Modelle oder Größen.
- Native Datenbankprüfung: 11:47:53–11:53:12 UTC. SQLite ausschließlich mit `readOnly:true`, Schema 4. Pro Modell isolierter Prozess; keine Repository-Konstruktoren mit Migration, keine Bestell- oder Kundentabellen.
- Vorhandenes Bindungsmanifest: SHA-256 `b5f592ee14419af648ee420e569badbe1ef9ca5099874b8c79809fdf5b1838d3`.
- Wiederverwendet: `validateDoorbellManifest`, `validateDoorbellExport`, `readDoorbellRecords`/ `validateDoorbellRecords` aus `scripts/doorbell-shop-bind.mjs`; damit derselbe `prepareShopProduct`-Preis- und Variantenweg. Keine neue Preis-, SKU- oder Geometrielogik.
- Die fünf geprüften Serverdateien (Bindung, Pilot, Webhooks, Shopvorbereitung, Bindungsspeicher) stimmen per Git-Blob-SHA mit der Codebasis überein. Das ist kein Nachweis des gesamten laufenden Deployments.
- Zusätzlich wurden aktive Bindungsköpfe gegen immutable Bindungen und Optionsauswahl geprüft. `bindingDocumentSha256` bezeichnet den kanonischen JSON-Digest des bestehenden Bindungssystems; `documentSha256` bezeichnet den SHA-256 der gespeicherten Dokumentbytes. Die beiden Hasharten sind bewusst verschieden.
- Alle 126 aktuellen Dokumente stimmen strukturell mit den ursprünglichen Importdokumenten überein; die Importfingerprints stimmen ebenfalls. Damit sind Optionen, Gegenpositionen, Geräte- und Lochgeometrie im gespeicherten Stand erhalten. Eine neue visuelle Abnahme der Gegenpositionen oder des Warenkorbs wurde noch nicht durchgeführt.
- Historische Freigaben `user-20261027-funkklingeln` sind für alle 126 Stände vorhanden und passen. Sie ersetzen **nicht** Chris’ jetzt ausdrücklich verlangte neue Freigabe.
- Details: [Zusammenfassung](2026-10-28-funkklingeln-audit/summary.json), [native Leseprüfung](2026-10-28-funkklingeln-audit/native-readonly-report.json), [Dateiprüfsummen](2026-10-28-funkklingeln-audit/files-sha256.json).

## Shop-Einstieg

Aktives Theme: `185833718140`, `gravuru-shopify-theme/production`.

Der aktuelle globale Einstieg ist bereits in `sections/footer-group.json`, Abschnitt `custom_liquid_xCyNJV`, vorhanden: Auf Produktseiten mit nichtleerem `custom.customization_id` wird `#gravuru-konfi` mit Produkt-/Varianten-IDs ausgegeben und `/apps/konfigurator/shop-embed.mjs` geladen. Diesen bestehenden Weg weiterverwenden.

- 42 veröffentlichte Bestandsprodukte: Standard-Produktvorlage, Metafeld fehlt. Der neue globale Einstieg wird dort deshalb nicht ausgegeben.
- 84 neue Produkte: Vorlage `funkklingeln-2027`, korrektes natives Metafeld; noch nicht im Onlineshop veröffentlicht. Aus der korrekten Vorlage-/Metafeldkombination allein wird keine öffentlich abgenommene Produktseite behauptet.
- Sichtprüfung AOSU Pro: 49,99 €, normale Farb-/Rahmen-/Befestigungswahl und „In den Warenkorb legen“ sichtbar; kein „Jetzt personalisieren“.
- Sichtprüfung Leuchtturm D8 `16077798965628`: 19,99 €, „Jetzt personalisieren“ mit korrekt gesetzten Produkt-/Varianten-IDs sichtbar. D8 verwendet die bestehende Kennung `4100000`.
- Beide Funkklingel-Vorlagen enthalten weiterhin `variant_picker`. Das aktuelle `shop-embed.mjs` blendet Kaufknöpfe und Menge aus, **nicht** die Variantenwahl. Für die früher verlangte Auswahl ausschließlich im Konfigurator bleibt deshalb eine gezielte Funkklingel-Vorlagenanpassung erforderlich.
- Keine alte gesamte Theme-Kopie veröffentlichen: Sie würde den inzwischen eingebauten globalen Einstieg und neuere fremde Änderungen gefährden.

Beleg: [Theme und Sichtprüfung](2026-10-28-funkklingeln-audit/theme-evidence.json).

## Bestellweg – nur gelesen

Eigene App `gid://shopify/App/423276544001`, API `2026-07`. `ensureDoorbellWebhooks({apply:false})` hat Identität, API-Unterstützung, Bestell-Leserecht, vollständig paginierte eigene Abonnements, Filter und Feldauswahl geprüft:

| Topic | Abonnement-ID | Ziel |
| --- | --- | --- |
| ORDERS_PAID | 2157499449724 | https://app-2027.gravuru-designwerkstatt.de/webhooks/shopify/orders-paid |
| ORDERS_UPDATED | 2157499515260 | https://app-2027.gravuru-designwerkstatt.de/webhooks/shopify/doorbell-orders-status |
| ORDERS_CANCELLED | 2157499580796 | https://app-2027.gravuru-designwerkstatt.de/webhooks/shopify/doorbell-orders-status |

Alle drei: JSON, Filter `test:false`, Aktion `keep`. Das bestehende PAID-Testabonnement `2149402706300` mit `test:true` bleibt erhalten. Das Feld `confirmed:false` im Rohbericht ist der unveränderte Rückgabewert des Dry-runs; es bedeutet hier keine fehlende Subscription. Es wurden keine Webhooks angelegt, geändert, gelöscht oder probeweise zugestellt. Erfolgreiche Verarbeitung einer echten Bestellung wird damit nicht behauptet.

## Tests und genauer nächster Schritt

`node --test scripts/doorbell-shop-bind.test.mjs scripts/doorbell-pilot-bind.test.mjs scripts/doorbell-webhooks.test.mjs`

Node v24.19.0: 17 bestanden, 0 fehlgeschlagen. 116 benötigte Quell-/Ressourcendateien gegen Git-Blob-SHAs geprüft. Anfangs fehlende lokale Referenzdateien wurden aus demselben Commit ergänzt; keine Test-Sollwerte geändert. [Testnachweis](2026-10-28-funkklingeln-audit/tests.json).

**Aktuelle Grenze aus dem Nutzerauftrag, Punkt 6:** „Live-Schritte: Erst nach Chris’ ausdrücklichem Satz. Zuerst 1 Pilotprodukt, Warenkorb-Test mit Screenshot, dann der Rest.“

Vorbereitet ist ausschließlich AOSU Pro V8P1AX11 Hochformat, Shopify `16124413084028`, Konfigurator `cfg_c3ee3fcf-bf87-42e3-af2a-98b680cdb576`, Revision 1, 120 Varianten, Start 49,99 €. [Plan für genau ein Pilotprodukt](2026-10-28-funkklingeln-audit/pilot-one-product.json).

Nach Chris’ ausdrücklicher Freigabe: dieses eine Produkt unmittelbar frisch gegen Shopify/DB prüfen, den bestehenden Einstieg aktivieren und die Funkklingel-Darstellung gezielt bereinigen; alle Optionen und Positionen im Konfigurator erhalten. Dann Browserprüfung von drei Formaten, zwei Positionen, korrekter Vorschau und Preis bis in den Warenkorb mit Screenshot. Erst nach bestandenem Pilot die übrigen 125 übernehmen und die 84 neuen Seiten veröffentlichen. Keine bezahlte Bestellung.

**Achtung:** `doorbell-pilot-bind` ist derzeit fest auf drei AOSU-Produkte/360 Varianten begrenzt. Es darf nicht unverändert als der jetzt verlangte Ein-Produkt-Pilot ausgeführt werden. Die vorhandenen korrekten Bindungen nicht unnötig neu schreiben. Keine Wiederverwendung dieses Auditexports als frischen Live-Beleg nach zeitlichem Abstand.

Heute: keine Shopify-Schreiboperation, keine Bindung/Freigabe geschrieben, keine Theme-Änderung, kein Deployment/Neustart, kein Warenkorb-Test. Nur private Prüfartefakte und dieser Branch wurden erstellt.
