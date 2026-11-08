# Echte Edelstahlquelle · lokale Funktionsabnahme 08.11.2026

Ausgangsstand: `49626dd715a564295712e53fb5a2515f90f54313`, PR #201. Diese Prüfung ergänzt den früheren technischen Blanko-Nachweis um die vorhandene native Quelle `normal-door-native-plan.json` (`nativeUpdate.document`) aus dem Edelstahl-Anschluss. Es wurden keine neuen Designs erzeugt oder bestehende Designs geändert.

## Sicherung und getrennte Prüfumgebung

Vor der Änderung am lokalen Starthelfer wurden dieser sowie die drei Verwaltungsdateien privat nach `.local-data/module-acceptance-20261108/backup/` kopiert. Git-Ausgangsstand und SHA-256-Dateiliste liegen dort. Die ursprüngliche Produktquelldatei blieb unverändert. Dokument-SHA-256: `bfca056e6e9e4a026e004c52e6bc95b35fc2b2567244a0116bf04d5c1e47245a`.

Die Prüfdatenbank liegt getrennt unter `.local-data/module-acceptance-20261108/real-steel/`. Der Starthelfer akzeptiert jetzt optional eine vorhandene native JSON-Quelldatei und ein separates Unterverzeichnis innerhalb `.local-data`; ohne diese Angaben bleibt die bisherige technische Demo verfügbar. Ein Quellbeleg bindet eine vorhandene Prüfdatenbank an den ursprünglichen Dokumenthash. Eine andere Quelle darf nicht unbemerkt in dieselbe Datenbank gelangen. Der Server bleibt ausschließlich an `127.0.0.1` gebunden.

## Bestandene echte Funktionskette

Die vorhandene Quelle enthält **8 Formen, 80 Größen, 404 gültige Größen-/Befestigungskombinationen und 15 vorhandene Designobjekte**. Über die reguläre lokale Händler-API wurden zwei Modulprofile, zwei Vorlagen, zwei konkrete Anlagepläne und anschließend zwei bestätigte Produktentwürfe angelegt:

- Edelstahl-Türschilder mit Logo: Logo eingeschaltet, Foto ausgeschaltet.
- Edelstahl-Türschilder ohne Logo: Logo und Foto ausgeschaltet.

Beide Pläne enthalten jeweils alle **404** konkreten Prüfzeilen. Die Anlage ohne Bestätigung wird abgelehnt. Nach Bestätigung entstehen ausschließlich lokale Entwürfe, ohne Veröffentlichungsrevision und ohne Shopify-Schreibzugriff. Ein erneuter identischer Aufruf erzeugt keine doppelten Produkte.

Die gespeicherten Produkte wurden über die Händler-API und anschließend über `/models.json?configuration=…&revision=1` erneut geladen. Die Modulwerte bleiben erhalten. Alle Formen, Maße, Befestigungen, Ressourcen und 15 Designobjekte sind in beiden Produkten identisch zur Quelle. **808 Preis- und Geometrievergleiche** gegen die native ursprüngliche Konfiguration bestanden. Eine zusätzliche neue Datenbankverbindung bestätigte die gespeicherten Produktstände und den unveränderten Quellhash.

CSRF-Schreibanfragen ohne Token werden weiterhin mit HTTP 403 abgewiesen. Cross-Site-Zugriff auf die lokale Verwaltungsseite bleibt HTTP 403. Keine Schutzregel wurde abgeschwächt.

Die anschließende zentrale Browserprüfung traf am 08.11.2026 um 09:36:50 UTC ebenfalls diese Sperre: Host korrekt `127.0.0.1:8221`, kein Origin-Header, aber `Sec-Fetch-Site: cross-site`, `Sec-Fetch-Mode: navigate`, `Sec-Fetch-Dest: document`. Das optionale lokale Diagnoseprotokoll zeichnet ausschließlich Pfad, Methode, Status und diese unkritischen Header auf; keine Cookies, Token oder Querywerte. Damit ist der konkrete Grund des HTTP 403 belegt. Die Schutzregel und Browserheader wurden nicht verändert.

## Aussagegrenzen

Dies ist eine lokale Funktionsabnahme mit der echten vorhandenen Produktquelle. **Eine Browser-Sichtprüfung ist in diesem Nachweis nicht enthalten.** Die 15 Designobjekte wurden auf unveränderte Daten geprüft, nicht neu gestalterisch freigegeben. Keine Live-Datenbank, kein Shopify-Produkt und keine bestehende Kundengestaltung wurden geändert. Die 212 früheren automatischen Tests wurden nicht ohne Anlass erneut ausgeführt.

Lokale Verwaltungsadresse für die zentrale Sichtprüfung: `http://127.0.0.1:8221/werkstatt/module/`. Detaillierte IDs und Ergebnislinks: [real-steel-local-acceptance.json](real-steel-local-acceptance.json). Datenbanken und vollständige private Quelldatei gehören nicht ins Repository.
