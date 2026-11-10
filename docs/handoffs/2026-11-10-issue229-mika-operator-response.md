# Mika: Auftrag #229, Verkaufsfähigkeit und Produktkette

Stand 10.11.2026. Operator ist Claude. Geprüfter Kundenquellstand `8e394cd0`; laut [Operator-Livebeleg](https://github.com/Chris83638w/gravuru-2027/issues/229#issuecomment-6766553764) ist Paket 1a-2 live. Dieser Auftrag enthält **keine neue Liveprüfung oder Installation**. Eigener Branch `dev/mika-issue229-verification-20261110`; nur Diagnoseprüfung und Dokumentation. Keine Produktivdatei, Kundenoberfläche, Preise, Designs, Produktbindung oder Freigabe geändert.

## Auftrag und Priorität

[Issue #229](https://github.com/Chris83638w/gravuru-2027/issues/229), insbesondere [Prioritätswechsel](https://github.com/Chris83638w/gravuru-2027/issues/229#issuecomment-6765906978): Frage zur ursprünglichen Schutzwirkung beantworten, vier Warenkorbtests vor Verkauf klären, Produktanlage nach #227 priorisieren, Galerie nur auf Ursache/Aufwand prüfen. Paket-1a-Review ist zurückgestellt; kein weiteres Performancepaket. Die Produktkette wird inzwischen in [#230](https://github.com/Chris83638w/gravuru-2027/issues/230) gesteuert. Neuere Entscheidungen dort ersetzen ältere Produktstände.

## 1. Warum bei jedem Abruf neu gelesen wurde

Beabsichtigt sind die aktuellen Prüfungen, nicht eine bestimmte Anzahl großer JSON-Lesevorgänge:

- `shop-product-binding-store.mjs`: aktuelle ausdrückliche Shopify-Zuordnung und Integrität des festen Produktbelegs (`document_sha256`), aktuelle Archivierung/Produktart und Bindungsprüfung.
- `catalog-live-orders.mjs`: Freigabe muss noch zur Variante und dem festen Produktstand passen.
- `konfi-status.mjs`: Pause muss sofort auf Kundenrouten wirken; keine zeitverzögerte Freigabe aus einem Cache.
- `public-design-previews.mjs`: öffentliche Vorschau ist an Bindung, vollständigen Produkt-/Ressourcenstand und Renderer gebunden; kein falsches oder nach Änderung veraltetes Vorschaubild.

Das wiederholte vollständige Parsen/Hashen desselben unveränderlichen Dokuments ist keine eigenständige fachliche Vorgabe. Eine reine Ableitung darf unter dem belegten unveränderten Stand wiederverwendet werden; Mandant, neue Zuordnung/Freigabe/Pause und Integritätsvergleich müssen weiter frisch geprüft werden. Dies beantwortet die ursprüngliche Schutzabsicht und ersetzt keine vollständige Cacheabnahme. Antwort bereits [in #229 dokumentiert](https://github.com/Chris83638w/gravuru-2027/issues/229#issuecomment-6768003525).

## 2. Vier rote Warenkorbtests

[Ausführliche Diagnose](2026-11-10-issue229-cart-priced-options-diagnose.md) und [strukturierter Nachweis](../reviews/2026-11-10-issue229-cart-priced-options/proof.json).

Auf Basis `8ceb866b` und Claude `8e394cd0` scheitern alle vier Tests identisch bereits im Fixture-Aufbau: Sie erwarten V3 für kostenpflichtige freie Zusatz-Checkboxen, der aktive Server unterstützt V1/V2. Kein Cache-Regress. Es gibt eine reale, begrenzte Funktionslücke: positive `optionFields`-Aufpreise werden vor dem Angebot abgewiesen. In den geprüften Fällen werden weder falsche Bindungen noch zu billige Angebote gespeichert.

- Drei neue Diagnoseprüfungen bestanden: V3-Vertrag abgewiesen ohne Schreiben; sieben kostenpflichtige Checkboxkombinationen vor Angebot abgewiesen; bestätigte Montagevariante mit vollständigem Variantenpreis bis zum lokalen Checkout-Transform korrekt, billigere falsche Varianten-ID abgewiesen.
- 22 vorhandene V1/V2-, Motiv-, Foto- und SVG-Logopreisprüfungen bestanden.
- Die vier alten V3-Erfolgserwartungen bleiben unverändert rot; keine Skip-Kosmetik, keine abgeschwächte Preisprüfung. Historische Testbeträge sind keine Produktpreisfreigaben.
- Die lokale Prüfung des eingecheckten Checkout-Transform ist kein Nachweis der aktuell installierten Shopify-Function oder einer heutigen echten Bestellung.

**Folge für den Start:** Bestätigte Form-/Größen-/Befestigungsvarianten und vorhandene V1/V2-Zuschläge nutzen. Unabhängiges kostenpflichtiges Zubehör als Checkbox benötigt ein vollständiges gesondertes V3-Paket samt tatsächlicher Function und Warenkorbabnahme. Nicht eigenmächtig in Varianten umformen, um die fehlende Anbindung zu umgehen.

## 3. Galerie 2,7–9,6 Sekunden: Ursache und Aufwand, kein Bau

`shop_gallery_cache_hit.ms` in `shop-design-gallery.mjs:107–136` misst das Wiederherstellen des persistenten Gesamtgalerie-Snapshots: SQLite-Payload lesen, HMAC prüfen, JSON parsen, Maps aufbauen (`shop-gallery-snapshot.mjs:23–29`). Das ist keine Bildberechnung und kein Messwert jedes warmen Designabrufs. Bei unveränderter Revision wird die RAM-Promise wiederverwendet. Der Edelstahl-Allgrößenweg mit `sourceModel` umgeht die Gesamtgalerie für die eigentliche Designliste (`shop-design-gallery.mjs:181–210`, `shop-entry.mjs:546–553`). Die synchrone Startarbeit kann trotzdem den gemeinsamen Prozess und erste Kundenanfragen blockieren.

Die Integration richtet zwei Stores ein; beide werden vorgewärmt (`configurator-integration.mjs:44–69`, `shop-entry.mjs:294–297`). Zwei `cache_hit` sind deshalb erklärbar. `public_preview_prepared` wird dagegen je `createShopEntry` nur einmal gestartet (`shop-entry.mjs:293`). Zwei solche Ereignisse zeigen mehrere Initialisierungen, **beweisen ohne PID/Instanzkennung aber keine zwei gleichzeitig laufenden Prozesse**.

Der Operator berichtet einen ersten Abruf von 6–8 Sekunden nach Neustart. Das ist eine konkrete Startverzögerung; ein dauerhaft langsamer warmer Edelstahl-Galerieaufruf ist allein aus diesen Logs nicht belegt.

Kleinster nächster Prüfschritt, falls Claude ihn beauftragt: kontrollierter Start mit PID, Instanzkennung, Store, Snapshot-Bytezahl und getrennten Lese-/HMAC-/Parsezeiten, verglichen mit erstem und warmem Galerieabruf. Keine Kundendaten protokollieren. Grobe Aufwandsschätzung **1–2 Stunden für Messung und Auswertung**. Korrekturaufwand erst danach: Doppelinitialisierung und Snapshotumbau sind unterschiedliche Aufgaben. Keine dieser Änderungen wurde gebaut.

## 4. Produktlinien: heutige Anlagebereitschaft

Für einen **neuen vollständigen Produktstapel** ist in den gelesenen Quellen noch keine aktuelle Station-3-Freigabe aus genauer Excel-Version und `planHash` belegt. Vorhandene Shopprodukte dürfen deshalb nicht erneut angelegt werden. Historische Tests sind keine heutige Komplettabnahme.

| Linie | Belegter Stand | Fehlender Schritt |
|---|---|---|
| Edelstahl-Türschilder | Bestehendes Produkt `16190784438652`, historisch 80 Größen/404 Varianten; Module Ausführung/Designs/Text/Motive/Logo, kein Foto; Nutzerbestätigung für diese Matrix vorhanden. | Neue Designlieferung sichten/freigeben. Der neue Plan 80→77 Größen und 404→389 Varianten ist **noch nicht bestätigt**; nichts entfernen. Bestehende IDs erhalten, dann exakten Änderungsplan abnehmen. |
| Acryl-Türschilder 3 mm | Aktuelle Excel **v4**, `bf8824c`: 77 Größen/778 Kombinationen, bestätigte Acrylgrundpreise und Montagepreise, Foto 9,99 €/Motiv 1,69 €/Logo-Preis 12,99 €. | Konkrete Modul-/Formen-/Designoffenpunkte abschließen; Plan und 1:1-Kontaktbögen; ausdrückliche Station-3-Freigabe. Historische feste D8/D10-Produkte und Serie auf Doppelanlage prüfen. |
| Funkklingelschilder | Historisch vorhandene Strecke: 126 Konfigurationen/42 Modelle/15.120 Variantenbindungen; echter Warenkorbbeleg vom 29.10. | Aktuellen Produkt-, Bindungs- und Veröffentlichungsstand lesen und Bestellung/Fertigung je Startteilmenge prüfen; neue Modelle nur nach neuer Excel-/Planfreigabe. |
| Hausnummern AA/AS/S-S | Größen-/Preis-/Befestigungsdaten vorbereitet; 194 Designarbeitszuordnungen in der geprüften Quelle ohne Freigabe. | Konstruktion/Bohrungen und Designs bestätigen; bedingte Halterfarben im tatsächlichen Kundenweg; produktbezogene Excel/Planfreigabe und Bindung. |
| Pferde-/Boxenschilder 30×20 | Bestehende Muster und native Edelstahlmatrix vorhanden; fünf Ausgangsmuster bestätigt. Erweiterte/überarbeitete Fassungen nicht pauschal freigegeben. | Exakten 30×20-Teil auswählen, offene Designbefunde sichten, Module/Preise/Excel/Plan bestätigen. Keine komplette Neuerstellung erforderlich. |
| Acryl-Grabkreuze | Hunde-/Katzenvorlagen vorhanden; Größenpreise 14,99/23,99/29,99 € im Auftrag; kein pauschaler aktueller Freigabenachweis. | Letzte Designs, Farbe/Größe, Excel/Plan und Bindung bestätigen. Die separat gemeldeten 102 Grabstecker-Shopentwürfe nicht mit diesen 50 Vorlagen gleichsetzen. |
| Gedenktafeln | Schiefer Hund 22×14/30×20: 43 Vorlagen technisch vorbereitet, Grundpreise 19,99/24,99 € bestätigt; Sichtfreigabe des gesamten 43er-Pakets nicht belegt. | Sichtfreigabe, genaue Options-/Zubehörmatrix mit Preisen in Excel/Plan; bei bezahlten unabhängigen Checkboxen V3-Lücke beachten; Bindung, Warenkorb und Fertigung prüfen. |

Quellen: [#227](https://github.com/Chris83638w/gravuru-2027/issues/227), [Acryl-v4 und Edelstahländerungsplan](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6768691678), [Designentscheidung](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6768799678), `2026-11-08-steel-product-entry.md`, `2026-10-29-funkklingeln-live-abschluss-astra.md`, `2026-11-05-schiefer-konfi-anschluss-mika.md`, [Hausnummern-Datengrenzen](https://github.com/Chris83638w/gravuru-katalog./blob/main/docs/handoffs/2026-10-29-hausnummern-abstandshalter-bericht.md), [Pferdebefunde](https://github.com/Chris83638w/gravuru-2027/issues/63#issuecomment-6543539695), [Grabkreuze](https://github.com/Chris83638w/gravuru-2027/issues/76#issuecomment-6627507596).

**Neueste Designbasis:** 700 Hauptprodukt-Master plus je 17 Kleinformat-Originale für 5×2/6×2/8×2 aus Katalog-PR185, nicht bloß die alte D1–D73-Teilmenge. 7×2,33 bleibt im Hauptprodukt. Historische 751 Katalogfreigaben ersetzen Chris' gewünschte manuelle Station-3-Sichtung nicht. „Abgerundete Seiten“, Kleinformat-Motive und Foto/Logo für Kleinformate sind laut letzter Matrixmeldung noch offen. Designübernahme liegt bei einem anderen Chat; hier wurden keine Originale verändert.

## 5. Schnellster vorhandener Anschluss für den Pilot

**Ein Prio-Konfi, ein bestätigter Datenplan, genau ein Importverantwortlicher.** Mika übernimmt den Importweg nach Zuweisung/Koordination durch Claude und genauer Station-3-Freigabe; der Design-Chat liefert die freigegebene native Vorlage, Claude führt Entscheidungen und Abnahme zusammen. Kein konkurrierender Import desselben Produkts.

1. Frischen Ist-Export von Produkt, nativer Revision und vorhandenen Shopify-IDs sichern; bekannte Artikel wiederverwenden statt neu anlegen.
2. Excel v4 bzw. Nachfolgeversion und native Varianten-/Modulübersicht abgleichen. Die vollständige Excel-Prüfsumme gemeinsam mit `planId`, `planHash`, Quell-/Profil-/Vorlagenrevision und Originaldesigngruppe in den Freigabebeleg aufnehmen. Das ist vorläufig ein expliziter gepaarter Beleg, **kein bereits implementierter XLSX-Autoimport**.
3. `ProductGroupTemplate.plan → confirm → execute` erzeugt geprüfte **lokale Entwürfe**, nicht automatisch Shopifyprodukte. Vorlagen und alle Abhängigkeiten werden erneut geprüft. Keine allgemeine Freigabe für spätere Produkte daraus ableiten.
4. Vorhandene native Vorbereitung (`prepareShopProduct`, geprüfter Draft-Transport) und `planShopProductBindings`/`persist` mit frischem Shopify-Rücklesen verwenden; alle Varianten, Endpreise, Module und Startdesign vergleichen. Der bestehende `scripts/shop-sync.mjs` plant Katalog-Hauptprodukte je Größen-/Produktzuschnitt; er darf für das neue Allgrößen-Hauptprodukt nicht ungeprüft mit alten Annahmen angewandt werden. Auch der eng festgelegte Andenken-Pilotskript ist kein generischer Acrylimport.
5. Gleiches Hauptbild/Startdesign, erlaubte Designgruppe, tatsächlicher Produktlink, Warenkorb mit Varianten und erlaubten Zuschlägen, Wiederöffnung und Produktionsdatei prüfen. Online erst nach dem konkreten Operator-/Chris-Auftrag; keine Nebenwirkung des Draftimports.

### Was noch nicht aktiv bzw. kein Startzwang ist

- Private Modulbibliothek und lokale Produktentwürfe existieren. Ein Profil speichern weist es keinem Kundenprodukt automatisch zu.
- **PR223** beschleunigt die atomare native Bindungsphase; kein neuer Konfi, keine Freigabe und kein Schalteröffnen. Für große Änderungsstapel nützlich, aber keine Voraussetzung zum Planen eines Piloten. Nicht dessen ältere Registrydatei über Claudes inzwischen geänderte Kundenruntime kopieren.
- **PR224** verbindet Profilbibliothek und vorhandenen Galerieabgleich in der privaten Vorschau. `executionEnabled:false` und `writesEnabled:false` bleiben gesetzt; dieser Pfad kann noch keine Shopprodukte ändern. Installation/Abnahme dieses Deltas ist nicht belegt. **PR228** enthält zusätzlich nur den privaten Quelloptions-Neuladefix.
- **Excel → Planhash automatisch importieren** ist noch nicht angeschlossen. Ein einfacher bestätigter Pilot braucht dafür keinen vollständigen Verwaltungsneubau; der genaue Excel-/Planabgleich muss trotzdem dokumentiert werden.
- **Galerieabgleich für vorhandene Shopprodukte** ist ein anderer Vorgang als Neuanlage; Plan, Bestätigung, Journal, Konfliktprüfung und Bindungsaktivierung beibehalten. Keine pauschalen Schreibschalter für den Verkaufsstart öffnen.

Private Codebelege auf PR228 `f4645189`: `product-group-templates.mjs:237–256`, `configurator-module-http.mjs:25–54`, `gallery-shop-sync.mjs:226–233`, `scripts/lib/gallery-production-preview-mount.mjs:20`; [Verwaltungsprüfung](https://github.com/Chris83638w/gravuru-2027/pull/228). Keine private Verwaltungsdatei aus diesem älteren Stand wurde in die aktuelle Kundenruntime übernommen.

## 6. Die 102 Grabstecker: vorhandene Arbeit erhalten

Gegenprüfung zu [#230/6768678814](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6768678814): Die [Übergabe vom 03.11.](2026-11-03-issue139-grabstecker-drafts.md) und deren [Nachweis](2026-11-03-issue139-grabstecker-drafts/nachweis.json) dokumentieren bereits 102 native Konfigurationen, 268 Varianten-/Preisbindungen und zehn Designs je Größe. Die heutigen drei fehlgeschlagenen Starts beweisen daher nicht, dass es ursprünglich nur Shop-Hüllen gab.

**Nur fünf Kundenstarts waren freigegeben, 97 absichtlich gesperrt.** Die fünf Shopify-Produkt-IDs sind `16190551064956`, `16190553063804`, `16190553489788`, `16190554603900`, `16190552867196`; Kennung `chris-issue139-20261103-five-draft-samples`. Damalige Bindungsquelle: `private/acryl-employee-20261021-v1/data/workshop.sqlite`, Store `acryl`, Shop `gravuru-design.myshopify.com`. Diese Identitäten und die heutige aktive Registry zuerst vergleichen. Alle fünf historischen Warenkorbstichproben endeten wegen DRAFT mit Shopify 422; sie sind **keine erfolgreichen Kaufnachweise**.

Archivierter Planer erzeugte je Produkt `review-config.json`, `plan.json`, `product-set.json`. Vollständige Batch-Eingaben/Journale liegen laut Übergabe in `private/issue139-stakes-upload-20261103`. In den geprüften committed Übergaben, Nachweisen und Laufskripten wurde kein ausdrücklicher `planHash`/`plan_hash` gefunden. Der private Serverordner wurde in diesem Auftrag nicht gelesen; sein Inhalt wird nicht als fehlend behauptet.

Nächster Schritt nach Claudes Auswahl: bestehende Produkt-/Varianten-IDs gegen die aktuelle Datenbank, Store-Zuordnung und Freigabe lesen; fehlende oder abweichende Verknüpfung gezielt reparieren. **Keine zweite Serienanlage.** Chris' Design-/Preisprüfung und heutige genaue Planfreigabe stehen davor; nach autorisierter Veröffentlichung echte Bestellung und Fertigung prüfen.

## 7. Designsuche: nur Plan zur Bestätigung

Neuester [Auftrag #230/6769668530](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6769668530): Designsuche mit derselben Suchauswertung wie Motive, Plan vor Einbau bestätigen lassen. Keine Umsetzung in diesem Auftrag.

Iststand: Das alte lokale Feld ist in `app/configurator/variant-m/layout.mjs:16` ausdrücklich verborgen. Die aktuelle Shopify-Galerie lädt seitenweise 40 Designs und hat keinen entsprechenden Suchparameter. Das alte Feld nur einzublenden würde nicht zuverlässig alle 700 Designs durchsuchen. Name, ID und Themen sind verfügbar; aussagekräftige Motivnamen/Schlagwörter fehlen bei manchen importierten technischen Ressourcen und müssen aus gepflegten Katalogmetadaten kommen.

Vorschlag zur Bestätigung durch Chris:

1. Ein Feld „Design suchen“ direkt über den Designkarten: mobil unter dem Kopf „Zurück / Designs / Fertig“, am PC oben in der rechten Werkzeugbox. Keine weitere Layoutänderung.
2. Suche nach Designname, Design-ID, Themen und **vorhandenen gepflegten** Motivnamen/Schlagwörtern. Original-Sprüche optional und vorab entscheiden. Persönliche Kundennamen/Lebensdaten sind keine Suchindexquelle; keine erfundenen Stichwörter aus SVG-Dateinamen.
3. Serverseitig vor der Seiteneinteilung suchen: alle für Form/Größe zulässigen freigegebenen Designs, nicht nur die bereits geladenen Karten. Bestehende Freigaben, Mindestflächen und Modulregeln bleiben erhalten.
4. Bestehende Suchauswertung erweitern, keine zweite Anwendung: Bereich „Motive / Designs / Alle“ ergänzen; Herkunft „Shop / Vorschau“ bleibt getrennt. Bestand der Motivzählung erhalten. Vertrags-/Speicherzusatz ist noch nötig (`motif-search-analytics.mjs`, `motif-search-stats.mjs`, bestehende Werkstattansicht).
5. Nur abgeschlossene Suchbegriffe, Trefferzahl und Produktgruppe zählen; vorhandene Normalisierung/Ausschlüsse verwenden. Keine Tastaturhistorie, Uploads oder Kundenkennungen protokollieren. Die Suche selbst kann vom Kunden eingegebene personenbezogene Begriffe enthalten; deshalb vorhandene Filter nicht als vollständige Anonymitätsgarantie ausgeben.

Vor Bau bestätigen: genaue Suchfelder, Original-Sprüche ja/nein und Position auf Handy/PC. Die verpflichtende Designsuche gehört in den neuen Produktplan und die Station-2-Kontaktbögen; sie ist noch nicht eingebaut.

## Abschlussgrenze

Die Warenkorbursache, Galerieeinordnung und Produktlinien-Offenpunkte sind belegt; keine behauptete Gesamtfertigstellung oder Prozentzahl. Der aktuelle Konfi-Aufbau und alle vorhandenen Produktbindungen bleiben unberührt. Neue Produkte warten auf die jeweiligen konkreten offenen Daten und Station-3-Freigaben, nicht auf einen neu programmierten Konfigurator.
