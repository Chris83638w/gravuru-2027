# Funkklingeln: lesender Live-Gegencheck nach PR #49 · 29.10.2026

Account: Codex/Astra. Auftrag von Chris: „Prüf bitte nochmal Issue 46, ob es jetzt live ist. Wenn ja, mach den lesenden Gegencheck für alle Modelle und Größen fertig und antworte Claude dort. Noch nichts live ändern.“

## Ergebnis und Stand

**PR #49 ist bereitgestellt. Der vollständige Daten-, Bindungs-, Galerie- und Ressourcen-Gegencheck für die bekannten 42 Modelle in jeweils drei Formaten ist bestanden. Die Verkaufsstrecke ist damit ausdrücklich noch nicht vollständig abgenommen.**

- [Claude: Bereitstellung in Issue #46](https://github.com/Chris83638w/gravuru-2027/issues/46#issuecomment-6495901678), [PR #49](https://github.com/Chris83638w/gravuru-2027/pull/49): Merge `62ead38d1c2413ca208c7932c8eb6c3116a7914f`, 29.10.2026 11:47:57 UTC. Laut Operator Plesk-Bereitstellung und Neustart um 13:50 Serverzeit.
- Selbst gelesen: öffentlich ausgeliefertes `/acryl-configurator/variant-m/artwork-resource.mjs`, HTTP 200; segmentierter Designressourcen-Pfad vorhanden. SHA-256 des tatsächlich getesteten Moduls: `8cde16fd0217005668b0cf4f65fd55d9502f42550d1f2f898bb635b057d6deb4`.
- Prüfzeitraum dieses Gegenchecks: 29.10.2026, ca. **12:22–12:36 UTC**. Keine historischen Ergebnisse als neue Live-Tests ausgegeben.
- Eigener reiner Berichtsbranch: `dev/funkklingeln-live-gegencheck-20261029-astra`, Basis `2468bd1480f8f5d94c6197926c11ce5f7fbdea1e`. Diese Berichtsgrundlage ist **nicht** die Behauptung eines weiteren Deployments.
- Keine Shopify-Mutation, keine Bindung geschrieben, kein Import, Theme-Update, Deployment, Neustart, Warenkorb oder Testauftrag. Serverdatenbank ausschließlich SQLite `readOnly: true`, Lesetransaktion mit Rollback; keine Anwendungskonstruktoren/Migrationen.

## Vollständigkeit: alle bekannten Modelle und Größen

[Einzelübersicht aller 126 Produkte](2026-10-29-funkklingeln-live-gegencheck-products.csv) enthält Marke/Modell, Größe, Produkt-ID, Handle, Status, Veröffentlichung, Konfigurator-ID/Revision, Dokument-/Bindungs-SHA, Anzahl passender Bindungen und HTTP-/Ressourcenergebnisse.

| Prüfung | Ergebnis |
| --- | --- |
| Marken / Modelle / Hauptprodukte | 18 / 42 / 126 |
| Hochformat 16 × 28 cm | 42 Produkte, Grundpreis 4.999 Cent |
| Querformat 24 × 20 cm | 42 Produkte, Grundpreis 5.999 Cent |
| Länglich 35 × 18 cm | 42 Produkte, Grundpreis 6.999 Cent |
| Shopify-Status ACTIVE | 126 |
| Varianten vollständig gelesen | 15.120 = 126 × 120; keine weitere Variantenseite |
| Varianten-ID, SKU, Preis, Optionen gegen Manifest | 15.120 passend, 0 Abweichungen |
| Standardvarianten | 126 passend |
| Native aktuelle Bindungen | 15.120 passend |
| Native Produkte / Approval-Dokumente / Importjournale | jeweils 126 passend |
| Konfiguratorrevision | jeweils 1 |

Shopify frisch über lesende Admin-GraphQL-Abfragen erfasst. Rohdatenexport bleibt lokal, SHA-256 `a655c943115b152219552e8023ba4213eea70959606661afc23739c7f09b89f6`. Native Prüfung 12:29:20–12:29:21 UTC: aktive Produktrevision, Dokumentprüfsumme, Shopbinding-Kopf und Revision, Formbindung, Auswahl, Store `acryl`, Varianten-ID und Preis sowie Approval mit genau 120 Varianten-IDs je Produkt und Importjournal geprüft. Keine Abweichungen.

SHA-256 der originalen Manifestbytes auf dem Server: `b5f592ee14419af648ee420e569badbe1ef9ca5099874b8c79809fdf5b1838d3`. Die im JSON mitgeführte historische Manifest-Prüfsumme `ac81822…` betrifft eine neu serialisierte Darstellung; sie ist nicht dieselbe Bytequelle.

Befestigungszuschläge und vorhandene Farb-/Rahmen-/Formatoptionen wurden gegen den bestehenden Vertrag abgeglichen; kein neues Preissystem. Zusatzpreise: 0 / 599 / 499 / 499 / 369 Cent.

## Tatsächliche öffentliche App-Endpunkte

Für **jedes** der 126 Produkte den bestehenden Shopify-App-Proxy mit seiner Standardvariante gelesen, anschließend mit der erhaltenen kurzlebigen Sitzung das echte Live-Modell und sämtliche Galerieseiten gelesen. Sitzungstickets nur im Arbeitsspeicher, nicht im Bericht/Repository.

- **126/126** `/apps/konfigurator/start?product=…&variant=…&format=json`: HTTP 200.
- **126/126** `/api/shop-entry/model`: HTTP 200 und korrekte Konfigurator-ID, Revision und Shopify-Variante.
- Alle drei Formatdefinitionen pro Modell einschließlich Geometrie, Rahmen, Befestigung und Grundpreis stimmen mit den ursprünglichen Importdokumenten überein.
- **504 tatsächlich gelesene Galerieseiten**, insgesamt **18.144 Kartenantworten**. Jede Galerie liefert die drei Formate genau desselben Klingelmodells; keine fremden Modelle. 144 Karten je Einstieg.
- Zusätzlich die **6.048 eindeutigen Karten der 42 Modellgalerien** gegen den frischen Shopify-Bestand geprüft: Konfiguratorprodukt/-revision, Shopify-Produkt/-Variante, EUR-Preis und Breite/Höhe stimmen vollständig; 0 Abweichungen.
- **2.268 Designressourcen tatsächlich per HTTP heruntergeladen**, alle HTTP 200 und alle Bytes mit der hinterlegten `previewSha256` identisch. Nicht nur Pfade gezählt oder 18 Beispielressourcen geprüft. Erkennung mit dem tatsächlich ausgelieferten korrigierten `isArtworkResource`.
- **30.240 Geometrieauflösungen** aus frisch geladenen Live-Modellen: 120 Kombinationen × 2 Positionen × 126 Produkte. Gegenüberliegende Position mathematisch korrekt, Klingelbreite/-höhe bleiben aufrecht, lokale Schnittpfade passend verschoben, bestehendes symmetrisches Befestigungslochbild erhalten. Das verwendete Positionsmodul wurde mit Deployment-Commit `62ead38` verglichen, Git-Blob `ef86ee3aba9cae2d7d120c11c391feb092e6e00c`. Dies ist eine berechnete Geometrieprüfung, kein fotografischer oder maschineller Fertigungsnachweis.

Galerie-Antwortzeiten aus 504 bereits laufenden Live-Anfragen: Median **382 ms**, p95 **494 ms**, Minimum 217 ms, Maximum 823 ms. Gemessen bis Antwortheader; **kein Kaltstart-/Neustarttest und keine vollständige Renderzeit**.

Maschinenlesbare Zähler und Grenzen: [Prüfnachweise](2026-10-29-funkklingeln-live-gegencheck-evidence.json).

## Öffentlich sichtbare Shopify-Produkte: weiterhin offen

**ACTIVE bedeutet hier nicht vollständig veröffentlicht oder angebunden.**

- **42 Hochformate veröffentlicht**, aber alle 42 ohne `custom.customization_id`.
- **84 Quer-/Langformate ACTIVE, jedoch unveröffentlicht**; ihre 84 Konfigurator-Metafeldwerte passen bereits.
- Alle 126 öffentlichen Produkt-URLs gelesen: 42 Produktseiten ohne neuen Einstieg; 84 leiten auf die Startseite um. Kein neuer Konfigurator-Einstieg über die geprüften Marker `#gravuru-konfi` / `apps/konfigurator/start` / Embed-Pfad.
- Der direkte App-Proxy-Start funktioniert bei allen 126. Das ersetzt **nicht** den fehlenden „Jetzt personalisieren“-Einstieg auf der Produktseite.

**Keine Korrektur vorgenommen.** Später den bereits vereinbarten D8-/Pilotweg verwenden; kein neuer Theme-Sonderweg.

## Sichtprüfung: nicht abgenommen

Zusätzlicher Chrome-Aufruf des AOSU-Pro-Hochformats: korrekter Titel im Elternfenster, eingebetteter Editor blieb leer. Die Browser-Automatisierung meldete ausdrücklich eine angehaltene Dokumentantwort; das Frame blieb `about:blank`. Ein normaler Reload löste dies nicht. Direkter lesender Abruf der Editor-HTML lieferte HTTP 200 und vollständigen Inhalt.

Daraus folgt **kein gesicherter Anwendungsfehler**, aber auch **kein bestandener visueller Test**. Screenshot lokal gesichert als `aosu-hochformat-live.png`; Prüfsumme im JSON. Claude sollte den sichtbaren Editor ohne Automatisierung prüfen. Desktop-/echter Mobiltest und späterer Warenkorbtest bleiben getrennte Abnahmen. Es wurde kein künstliches Ergebnis in die Oberfläche eingesetzt.

## Live-Schalter und Webhooks, nur gelesen

12:34:08 UTC: vorhandenes `ensureDoorbellWebhooks` im Probelauf `apply: false`, Client nur für GraphQL-`query` zugelassen:

| Topic | Ergebnis | Zielhost |
| --- | --- | --- |
| ORDERS_PAID | keep | app-2027.gravuru-designwerkstatt.de |
| ORDERS_UPDATED | keep | app-2027.gravuru-designwerkstatt.de |
| ORDERS_CANCELLED | keep | app-2027.gravuru-designwerkstatt.de |

Gespeicherte Startkonfiguration enthält die bisherigen Marker `approved-20261027` und `merchant-test-only`. Keine Änderung am Live-Schalter `GRAVURU_DOORBELL_LIVE_ORDERS`. Die tatsächlichen 126 Modellstarts passieren die laufende Zugangsprüfung. Kein direkter Dump der Prozessumgebung und **kein Nachweis einer abgeschlossenen Bestellverarbeitung**.

## Bestellstrecke und zusätzliche Geräte

Claude meldet in seinem Bereitstellungskommentar ausdrücklich: Acryl-Shop-Bestellungen kommen noch nicht in der Werkstatt-Bestellansicht an und erzeugen noch keine Fertigungsdateien; **Issue #48 Teil C** wird dafür bearbeitet. Das betrifft auch Funkklingeln. Diese Meldung bleibt hier ein **offener Produktionsblocker**, kein von uns erneut durch eine Bestellung geprüfter Fehler. Webhook-Konfiguration allein reicht nicht als Abnahme.

Die **acht zusätzlichen, noch nicht eindeutig benannten Geräte mit 24 vorbereiteten Größen-Zuordnungen** bleiben getrennt blockiert (`blocked_identity_and_image_cut_association`). Ihre Identität und Bild-/Ausschnittzuordnung sind durch PR #49 nicht geklärt. Die oben bestandenen Zahlen umfassen vollständig die 42 bekannten Modelle × drei Formate; sie schließen diese acht Geräte nicht heimlich ein. Weitere freigegebene Grundpreise bleiben im vorhandenen Größenplan erhalten.

## Nächster Schritt für Claude / Freigabegrenze

1. Issue #48 Teil C abschließen und Bestellübernahme samt Fertigungsdateien nachweisen.
2. Sichtbaren Editor auf Desktop und Mobil manuell bestätigen; den hier dokumentierten Automatisierungsstillstand von einem echten Renderingfehler unterscheiden.
3. Danach den bestehenden Pilotablauf für Produktmetafeld/Shop-Einstieg und Veröffentlichung verwenden. Weiterhin **nur nach Chris' ausdrücklicher Live-Freigabe**, zuerst ein Pilot samt Warenkorb-/Bestellweg, dann der übrige Bestand.
4. Acht Zusatzgeräte erst nach eindeutiger Modell- und Konturzuordnung aufnehmen.

Dieser Auftrag verändert ausschließlich Bericht/Prüfnachweise auf dem eigenen Branch und die ausdrücklich gewünschte Antwort in Issue #46.
