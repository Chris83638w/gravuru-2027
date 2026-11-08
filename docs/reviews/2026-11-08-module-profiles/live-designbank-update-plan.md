# Bestehende Edelstahl-Designbank r3 → r4: sicherer Aktualisierungsweg

Stand: 08.11.2026. **Nur Codeprüfung und Ablaufentwurf; kein Update ausgeführt.** Basis der lokalen Prüfung: PR #201, `49626dd715a564295712e53fb5a2515f90f54313`. Der Hauptagent kontrolliert Livezugriffe und Veröffentlichung. Der freigegebene Kundenkonfigurator wird für diesen Weg weder neu gebaut noch umgestaltet.

## Ergebnis

Die bestehende native Konfiguration kann unter derselben ID eine neue Designbank erhalten. Shopify-Produkt, alle 404 Varianten, Preise und Bestellstände bleiben bestehen. Der kleinste sichere Weg ist: neue native Revision anhängen, vollständig prüfen und **alle 404 aktiven Bindungen zusammen mit der Katalogfreigabe in einer einzigen Datenbanktransaktion umschalten**. Die bestehende Shopify-Preisdatei wird dabei nur gelesen.

Der alte `outputs/steel-shopify-20261108/native-update-runner-v2.mjs` darf dafür **nicht unverändert** benutzt werden: Er ist auf DRAFT und r2 → r3 festgelegt, schaltet kleine Gruppen einzeln um und erteilt die Katalogfreigabe erst danach. Ein bereits aktives Produkt hätte währenddessen gemischte Bindungen bzw. vorübergehend nicht freigegebene neue Bindungen. Zusätzlich erwartet er die alte unkomprimierte Preisdatei.

## Fest gebundener Ausgangsstand

| Eigenschaft | Geprüfter bzw. vom Hauptagenten frisch gelesener Stand |
|---|---|
| Native Produkt-ID | `cfg_ac514214-a313-4738-8008-00445ee1befd` |
| Shopify-Produkt | `gid://shopify/Product/16190784438652` |
| Shop / Tenant / Store | `gravuru-design.myshopify.com` / `gravuru` / `acryl` |
| Native Ausgangsrevision | 3 |
| Exakte gespeicherte Dokumentbytes SHA-256 | `bfca056e6e9e4a026e004c52e6bc95b35fc2b2567244a0116bf04d5c1e47245a` |
| Native Veröffentlichung | `publishedRevision: null`; Kundenfreigabe erfolgt hier über Katalogfreigabe und aktive Bindungen |
| Produktquelle | 8 Formen, 80 Größen, 404 gültige Größen-/Befestigungskombinationen, bisher 15 Designobjekte |
| Shopify-Status | ACTIVE; vor einem echten Lauf nochmals frisch prüfen |
| Kandidat des Designagenten | Gemeldet: 251 Designs, davon 236 zusätzlich; noch keine abschließende Freigabe in diesem Bericht |
| Live-Datenbank | `private/acryl-employee-20261021-v1/data/workshop.sqlite` |
| Live-Codebasis | `private/mika-steel-r15-shopify-20261108` |

Der oben genannte Hash bezieht sich auf die **exakten Dokumentbytes**. Der Binding-Store verwendet daneben einen kanonischen Dokumenthash. Diese beiden Hasharten ausdrücklich benennen und nicht versehentlich miteinander vergleichen.

## Bestehende Funktionen wiederverwenden

| Funktion / Ort | Verwendung und Grenze |
|---|---|
| `repository.importBatch`, `app/workshop/repository.mjs:242` | Idempotentes Update derselben ID mit Importschlüssel, Kandidatenfingerprint und `expectedRevision: 3`. Historische Revisionen bleiben unverändert. PR-Stand bietet `beforeWrite` innerhalb der Transaktion; tatsächliche Live-Version vor Verwendung prüfen. |
| `repository.save`, `repository.mjs:318` | Vorhandenes CAS-Append, aber ohne Importjournal. Für den einmaligen wiederaufnehmbaren Lauf ist `importBatch` geeigneter. |
| `repository.publish`, `repository.mjs:344` | **Nicht für diese Aktivierung verwenden.** Es hängt eine weitere Revision an; es ist nicht die Katalogfreigabe. |
| `prepareShopProduct` | Einzige native Quelle der gültigen 404 Optionen/Grundpreise. Vorher und nachher vollständige Gleichheit prüfen. |
| `createShopProductBindingChecker(...).check`, `shop-product-binding-check.mjs` | Frischer lesender Shopify-Abgleich, native Produkt-/Profil-/Preisprüfung; kleine Mengen, maximal 100 IDs je Anfrage. Bestehende Varianten-IDs verwenden, keine neuen Varianten anlegen. |
| `planShopProductBindings`, `shop-product-binding-plan.mjs` | Erzeugt servereigene feste Pläne aus frischen Shopify-Belegen und nativer Quelle. Pläne nicht als vertrauenswürdiges Browser-JSON übernehmen. |
| `orderIntake.idBindings({personalizationPricingFor})`, `order-intake.mjs:192` | Registry mit ausdrücklich gesetztem, synchronem Preisprovider. Ohne Provider können neue Bindungen ohne Zusatzpreisvertrag entstehen. |
| `registry.persist({plan,expectedHeads})`, `shop-product-binding-store.mjs:127` | Maximal 100 Einträge je Aufruf, prüft Quelldokument, Kopfstände, Preise und Frische nochmals. Unterstützt SAVEPOINT innerhalb einer bereits geöffneten Transaktion. |
| `orderIntake.approveCatalogLiveProducts`, `catalog-live-orders.mjs:27` | Prüft alle gültigen Varianten auf dieselbe aktuelle Revision und native Preise. Nutzt eine vorhandene Transaktion mit; Katalogfreigabe deshalb in dieselbe äußere Transaktion legen. |
| `expandPricingVariants`, `pricing-history.mjs:36` | Aktuellen komprimierten Preisvertrag vollständig auflösen. |
| `resolvedPricingHistory`, `pricing-history.mjs:40` | Feste historische Revisionen einschließlich Delta-Preisen vollständig auflösen. |
| `capturePersonalization`, `cart-personalization.mjs` | Pro Variante aus frisch aufgelöstem Vertrag und Kandidat den gespeicherten Zusatzpreisvertrag ableiten und exakt mit r3 vergleichen. |

## Preisfix von heute unbedingt erhalten

Der veröffentlichte Preisfix speichert den V2-Vertrag Revision 2 und V1-Verlauf Revision 1 verlustfrei mit `variantSequence`, `variantsFromRevision` und `variantDeltas`. Die 94 abweichenden historischen Grundpreise bleiben dabei absichtlich erhalten. Die reparierte Datei hat 2.318 UTF-8-Bytes; letzter bestätigter SHA-256:

`6b0e4d19ba2f50e638637d03c6e8c0796f93f09d8d362bcf453b495d04a0eb46`.

`inspectProductPricing` liefert das rohe `jsonValue`, keine expandierte Variantentabelle. Deshalb vor dem Binding:
1. Frisch mit der besitzenden App lesen; Shop, Produkt, Währung, ACTIVE-Status und Vertragsstand prüfen.
2. Rohe Vertragsstruktur und, sofern verfügbar, exakte Metafeldbytes samt SHA sichern/pinnen.
3. Aktuellen Vertrag mit `expandPricingVariants(raw)` und Historie mit `resolvedPricingHistory(raw)` vollständig auflösen; IDs/Preise/Revisionen/Staffeln unverändert vergleichen.
4. Für jede der 404 aktuellen Varianten `capturePersonalization(expanded, {variantId, baseCents, document: candidate})` bilden. Ergebnis muss dem vorhandenen bestätigten r3-Vertrag entsprechen.
5. Genau diesen frisch geprüften Vertrag synchron an die Registry liefern. Keine browserseitigen Preise verwenden.

Die **Konfigurationsrevision 4** verlangt keine **Preisrevision 4**. Bei ausschließlich zusätzlichen Designs bleibt der unveränderte aktuelle Preisvertrag Revision 2. Kein neues Metafeld, kein Zurückschreiben der unkomprimierten 18.557-Byte-Datei, kein Function-Release und keine Änderung historischer Preisverträge. Der dokumentierte Funktionstest bis zehn verschiedene Warenkorbpositionen wird durch diesen Designbankwechsel nicht zu einer Freigabe größerer Sammelwarenkörbe.

## Konkreter Ablauf für einen später separat geprüften Updatehelfer

1. **Ausgangssicherung:** konsistente private SQLite-Sicherung samt Integritätsprüfung, unveränderliche r3-Dokumentbytes, alle 404 aktiven Köpfe mit Binding-IDs/Zuordnungsrevisionen/Preisen/Verträgen, vorhandene Katalogfreigaben, Bibliotheks-/Asset-/Schriftstände und Runtime-Hashes sichern. Keine öffentlichen Kundendaten oder Datenbanken ins Repository aufnehmen.
2. **Kandidat prüfen:** dieselbe native ID, alle bisherigen Design-IDs und deren Inhalte unverändert; ausschließlich beauftragte zusätzliche Designs. Alle Quellen/Fonts/Motive/Original-IDs auflösbar. Alle 404 nativen Auswahl-/Preis-/Geometrieergebnisse identisch; Form-/Größen-/Befestigungsdaten, Module und Standarddesign unverändert. Quelle und Kandidat mit exaktem und kanonischem Hash pinnen.
3. **Frischer Shopify-Lesebeleg:** alle 404 bekannten IDs, Produktzugehörigkeit, Status und tatsächliche Preise abgleichen. Zusätzlich vollständige Produktvariantenliste mit Pagination lesen, um neue/fehlende Varianten zu erkennen. Preisvertrag wie oben prüfen. Keine Shopify-Mutation.
4. **r4 anhängen:** idempotentes natives Update derselben ID, erwartete Revision 3; keine neue Produktkopie. Vor dem Schreiben unter Datenbanksperre Ausgangsquelle/Bibliotheken/404 Köpfe erneut vergleichen. Nach dem Append bleiben die Kundenbindungen zunächst vollständig auf r3.
5. **Aktivierung vorbereiten:** neue native Pläne für die gleichen 404 IDs in Blöcken bis 100 erzeugen. Alle Netzwerkanfragen vor der Schreibtransaktion abschließen. Plan-/Preisbelege müssen bis zum Abschluss innerhalb der vorhandenen Frist von höchstens 60 Sekunden bleiben; bei Überschreitung abbrechen und mit neuen Belegen neu vorbereiten, Frist nicht vergrößern.
6. **Ein gemeinsamer Commit:** auf genau derselben Datenbankverbindung wie Registry und Katalogfreigabe `BEGIN IMMEDIATE`; vollständige 404 Ausgangsköpfe plus Kandidatenhash/Bibliotheksstand/Preisfrische nochmals vergleichen. Dann alle Registry-Blöcke persistieren. Danach Katalogfreigabe für dieselbe r4 und dieselben 404 Varianten anlegen. Vollständigen neuen Zustand und alle 404 neuen Preisverträge noch innerhalb der Transaktion prüfen. Erst dann einmal `COMMIT`. Jeder Fehler führt zu `ROLLBACK` der gesamten Aktivierung. Kein `await`, keine Shopify-Anfrage und kein Einzelblock-Commit innerhalb dieser Transaktion.
7. **Rücklesen:** exakt 404 r4-Köpfe, vollständige r4-Katalogfreigabe, identische Grund-/Zusatzpreise und Shopify-IDs; r3-Bindungen, r3-Verträge, alte Designstände, Entwurfs-/Angebots-/Bestellstände unverändert. Der Shopify-Vertrag bleibt im bereits reparierten Format unverändert.
8. **Kundenprüfung:** neuer Produkteinstieg mit festem Startdesign, weitere Größen/Befestigungen, SVG-Logo-Aufpreis, Warenkorb, Wiederöffnung. Einen existierenden r3-Warenkorb-/Bestellstand ausdrücklich separat prüfen; keinen alten Stand still auf r4 umschreiben.

Eine atomare lokale Datenbanktransaktion ist keine globale Sperre für Shopify. Shopify-Änderungen anderer Bearbeiter müssen durch frische vorherige und anschließende Lesebelege erkannt werden. Bei Abweichung keine automatische fremde Änderung zurückschreiben.

## Wiederaufnahme, Rückkehr und alte Kundensitzungen

- Vor dem Append darf nur exakt r3 mit dem gesicherten Hash vorliegen. Ein beliebiger zwischenzeitlicher r4-Stand wird nicht übernommen.
- Nach Absturz zwischen Append und Aktivierung darf nur exakt der eigene journalgebundene Kandidat r4 mit noch vollständig alten 404 Köpfen fortgesetzt werden. Nach erfolgreicher Aktivierung ist ein identischer Wiederholungsaufruf ein No-op.
- Ein Mischstand der 404 Köpfe ist bei diesem neuen Ablauf ein Konflikt, keine automatisch zu reparierende Restmenge.
- Historische Zeilen werden nie überschrieben, gelöscht oder durch Rückkopieren einer alten Gesamtdatenbank zurückgesetzt. Eine fachlich notwendige Rückkehr wäre eine neue Revision mit der gesicherten r3-Gestaltung und erneuter vollständiger Aktivierung; nicht die Behauptung, die Historie sei zurückgedreht.
- `shop-entry.mjs:128–133` bindet die offene Kundensitzung an aktuelle Produkt-/Binding-/Zuordnungsrevision. Beim Wechsel kann eine bereits offene r3-Sitzung daher mit `shop_entry_changed` abbrechen und einen neuen Produkteinstieg verlangen. Bestehende Bestell-/Warenkorbsnapshots bleiben gespeichert; eine unterbrechungsfreie Fortsetzung alter offener Editoren ist damit **nicht** zugesichert. Auch die Cart-Revisionsroute verwendet aktuell `active(req)`; Wiederöffnung muss gezielt geprüft werden.

## Abgleich mit der allgemeinen Synchronisierung

Der separate Sync-Agent erweitert `gallery-shop-sync-activation.mjs` auf dem bestehenden Galerie-Sync-System um einen verpflichtend geprüften Preisprovider, vollständige Varianten-Pagination und kleine Registry-Pläne innerhalb einer gemeinsamen Transaktion. Diese Arbeit ist passend für die spätere allgemeine Händlerverwaltung. Sie ist nicht automatisch im heute laufenden Server vorhanden.

Der reine r3→r4-Designbankwechsel braucht weder einen neuen Konfi noch die ganze zukünftige Shop-Synchronisierung. Ein eng begrenzter, getesteter nativer Append-/Aktivierungshelfer genügt. Der lokale PR-Stand besitzt noch kein allgemeines `orderIntake.withBindingTransaction`; der Helfer muss die bereits verwendete konkrete Verbindung kontrollieren, oder die separat geprüfte Sync-Erweiterung muss gezielt integriert werden.

## Noch zu erfüllen, bevor irgendeine Aktivierung behauptet werden darf

- Abschließende Kandidatenprüfung und Hash des endgültigen 251-Design-Dokuments.
- Sicherung und frische Live-Belege des Hauptagenten.
- Aktuellen Live-API-/Schemastand gegen die oben genannten Funktionen prüfen; besonders Importguard, Preisdecoder und gemeinsame Verbindung.
- Gezielter lokaler Test des späteren Aktivierungshelfers: Fehler im letzten Block sowie Fehler bei Katalogfreigabe rollen **alle** Kopfänderungen zurück; Preis-/Quell-/Kopfkonflikt erzeugt keine Teilaktivierung; gleicher Lauf ist idempotent; alte Snapshots bleiben identisch.
- Tatsächliche Aktivierung und Kunden-Warenkorbabnahme erst durch den Hauptagenten im ausdrücklich freigegebenen Umfang.

Dieser Bericht ist kein ausgeführter Aktivierungsnachweis und enthält keinen neuen Live-Zugriff.

