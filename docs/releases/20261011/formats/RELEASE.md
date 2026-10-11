# Formate, Designimport, Katalog und Hilfslinien · 11.10.2026

## Änderungen

- Händlereditor: Hilfslinien für Schildmitte, Rand und Kanten/Mitten anderer Elemente. Einrasten mit vier Bildschirmpixeln Abstand; Schalter für Hilfslinien und Einrasten, Alt unterdrückt Einrasten. Nur während des Ziehens, nicht in Fertigungsdateien.
- Einlagiges Edelstahlschild: Grundmaß und Form (Rechteck, abgerundet, Oval/Kreis) bearbeiten; komplette Designs proportional in die wirkliche Kontur einpassen. Zusätzliche Kundenformate mit gleichen Proportionen und ausdrücklich eingetragenen Einzelpreisen. Kunde, Vorschau, Shopify-Vorbereitung und Export verwenden dieselbe Geometrie/Preisquelle. Noch offene Form-/Größeneingaben werden beim Speichern übernommen.
- Hintergrund & Szene: Rohlingbild sowie getrenntes Szenenbild austauschen; Standardhintergrund wiederherstellen. Szene bleibt außerhalb technischer Ausgaben.
- PDF/SVG: zuvor wurde bei Edelstahl fälschlich der Acrylbereich verwendet. Einpassen berücksichtigt nun die tatsächliche Kontur samt Sicherheitsrand, auch oval/abgerundet. Andere Designs und Originaldateien bleiben erhalten; editierbare Aufbereitung folgt auf die Einpassung.
- Katalog: kompakte Liste oder Karten, Material/Kategorie, Suche, Sortierung, 24/48/96 Produkte pro Seite und gemeinsame Kategoriezuweisung. Abgeleiteter SQLite-Index liest beim Blättern keine vollständigen Schrift-/Design-/Bildpakete; Originalrevisionen bleiben unveränderlich. 3.000 Produkte geprüft. Auswahl gilt ausdrücklich nur für die sichtbare Seite.
- Shopify: eindeutiger Weg vom gespeicherten Stand zur bestehenden journalgestützten Entwurfsübertragung. Eigene App-Anmeldung mit kurzlebigem, nur im Speicher gehaltenem Token; keine neuen Berechtigungen angefordert. Shopify-Entwurf und öffentlicher Konfigurator/Checkout sind getrennte Freigaben.

## Prüfung vor Veröffentlichung

726 Regressionstests bestanden; 29 abschließende gezielte Prüfungen bestanden (überlappende Mengen). Isolierter echter Händler-Backend-/Browserablauf mit synthetischer Shopify-Identität: Größen-/Preiswahl, Hintergrund, Hilfslinien beim Ziehen, Speichern/Neuladen, Kundengestaltung und PDF-Einpassung. Desktop/Mobil sichtbar geprüft. Kein echter Shopify-Nutzerlogin durch den Test.

19 unterschiedliche erreichbare Original-PDFs in einer privaten Datenkopie auf dem tatsächlich vorhandenen Edelstahlprodukt Revision 2 jeweils rechteckig/oval eingepasst und zur Bearbeitung aufbereitet. 38 Konturprüfungen, Originale bytegleich, Produktstand unverändert. Die genaue Datei unter dem Screenshot-Namen `GT1E86_1.PDF` ist nicht ausdrücklich verfügbar; der Fehler wurde mit einem übergroßen PDF sowie den erreichbaren Originalen geprüft. Der erste Originaltest hatte vorhandene Motivressourcen nicht mitgeladen; danach vollständige private Ressourcenkopie verwendet. Erster Browserlauf fand fehlende statische Modulfreigaben; Ursache behoben und erfolgreich neu geprüft.

Vor der Installation: drei private Datenbanken auf Server und in Cloud gesichert; SHA-256 und SQLite-Integrität stimmen überein. Gegenüber voriger Veröffentlichung sind die neueren Produktänderungen und zwei zusätzliche SVG-Ressourcen erhalten. Private Daten, Quellen-PDFs und Geheimnisse sind nicht im Repository.

## Grenzen

AOSU besitzt eine feste, zweilagige technische Konstruktion; diese allgemeine Formbearbeitung gilt für das einlagige Edelstahlschild. Größenänderungen mit festem Bohrbild benötigen eine eigene freigegebene Geometrie. Zusätzliche Größen eines Produkts haben dieselben Proportionen; andere Grundproportionen über Produkt → Schildgröße & Form. Keine erfundenen Preise oder Maschinenfreigabe.

Shopify-Produktentwurf ist noch keine öffentliche personalisierte Bestellstrecke. Medienübertragung, neue Verkaufsbindungen, öffentlicher Checkout, AOSU-Fertigungsexport und Maschinenabnahme bleiben getrennte offene Arbeitspakete. Bisherige Kundenwerkstatt und Shopify-Theme werden durch dieses Paket nicht verändert.

Nächster Schritt: öffentliche Verkaufsbindung samt Testbestellung als eigenes Paket.

## Aktivierter Stand

Händlerhost läuft seit 11.10.2026, 18:04 UTC auf Quellstand `880f124948c7e884a8a36d5636bff0a99fbbd2ee`, Version `0.1.0-recovery.20261010+880f124948c7`. [Installationspaket und SHA-256](../../../../deliverables/merchant-formats-20261011/README.md). Frisch getrennt installiert, gebaut, Kundenansicht geladen und anonyme private API gesperrt. 425 Manifestdateien auf Paket und Server geprüft. Gesicherte Aktivierung ersetzte nur den Einstieg des Händlerhosts; laufender neuer Prozess nach Konfigurationswechsel bestätigt. 15 HTTPS-Prüfungen bestanden, UI-Module bytegleich, geschützte APIs liefern strukturierte 401-Antworten.

Tatsächlicher Tokenaustausch der vorhandenen eigenen App, bereits gewährtes `write_products` und lesende Shopify-Produktabfrage mit Shop-/Europrüfung bestanden. Entwurfsanschluss über geschützte Konfiguration aktiviert. Keine Shopify-Mutation ausgeführt, kein neuer Artikel veröffentlicht. 34 Cent bisherige KI-Kosten unverändert; kein bezahlter KI-Auftrag durch diese Prüfungen.

Browserabnahme: 112 authentifizierte lokale API-Anfragen erfolgreich, synthetische Shopify-Identität. Das belegt keinen vollständigen Klickablauf mit der echten Shopify-Nutzeranmeldung. [Hilfslinien](drag-guides.png), [Katalog](catalog.png), [Mobil](catalog-mobile.png).

Bedienung nach vollständigem Neuladen der Shopify-App:

1. Produkte → Bearbeiten → Designs & Elemente: Element ziehen. **Hilfslinien** und **Einrasten** stehen unter der Elementwerkzeugleiste.
2. Produkt → **Schildgröße & Form**: Grundmaße und Form wählen; Designs werden als zusammenhängende Gestaltung eingepasst. Optionen & Preise → **Verfügbare Schildgrößen** für Kundenformate/Preise.
3. Hintergrund & Szene: **Rohlingbild austauschen** oder **Szenenbild austauschen**. Danach speichern.
4. Produktübersicht: **Material**, **Kategorie**, **Sortieren** und **Ansicht**; aktuelle Seite auswählen → **Kategorie zuweisen**.
5. Gespeichertes Produkt → **Shopify** → Vorbereitung für diesen Stand öffnen → prüfen → als Shopify-Entwurf übertragen. Öffentlichen personalisierten Verkauf erst nach eigener Kunden-/Checkout-Bindung freigeben.

## Sicherung nach Aktivierung

Alle bisherigen Zeilen in 49 Tabellen sind unverändert erhalten, einschließlich 7 Produkt-/Masterdatensätzen, 12 Produktrevisionen, 31 Designressourcen und bestehender Bestellstände. Der neue abgeleitete Katalogindex enthält alle 7 aktuellen Datensätze ohne fehlende oder veraltete Revision. Keine Gestaltung wurde durch die Installation neu gespeichert.

Drei Datenbanken nach Aktivierung auf dem Server und zusätzlich außerhalb Git in dieser Cloud gesichert; SHA-256 stimmt jeweils mit dem Serverbeleg überein, SQLite-Integrität geprüft. Private Cloudablage: `/workspace/recovery-private/merchant-after-formats-20261011`; vorheriger Stand separat unter `merchant-before-formats-20261011`. Aktivierungssicherung enthält darüber hinaus frühere Laufzeit und geschützte Konfiguration auf dem Server. Kein privater Datenbestand im Installations-ZIP oder Repository.

Berichte: `regression-tests.txt`, `final-targeted.txt`, `browser.json`, `original-import.json`, `package-install.json`, `package-content-check.json`, `server-stage.json`, `server-activation.json`, `server-runtime.json`, `https.json`, `shopify-connection.json`, `shopify-draft-activation.json`, `preservation-all-tables.json`, `private-cloud-before.json`, `private-cloud-after.json`, `live-catalog.json` und `environment.json`.
