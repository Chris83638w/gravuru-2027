# P1: Warenkorb-Umbau nach der Ursachenmessung

Auftrag #254, PR #255; Basis `105e398` auf dem P1-Branch, weiterhin auf dem Live-Ausgangspunkt `be163c5d`/`dev/claude-warenkorb-v4-20261116`, nicht main. Chris beauftragt den Umbau mit „dann los“. Keine neue Live-Freigabe. Letzter bestätigter Live-Stand bleibt `9af3a1ac`.

Keine sichtbare Konfi-Änderung, keine Änderung an Preisen, Bindungen oder Pflichtprüfungen. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich. P2/P3 und P4 sind nicht Bestandteil dieses Umbaus.

## Teil A: wiederholte Lesungen

Die vorhandene `withCustomerReadScope` wird für die synchronen Abschnitte der vier Warenkorbrouten verwendet. Beim Einlesen des Bodys und beim Warten auf Shopify endet sie sofort; die Fortsetzungen eröffnen jeweils eine frische Phase. Kein Dokumentcache über Anfragen, kein neuer Timer, keine Datenbanktransaktion. Produktköpfe und aktive Bindungen werden weiterhin gelesen; gleichbleibende Datenbank-Epochen (eigene Änderungen, fremde Commits, Haupt-/TEMP-Schema) sind der Gleichheitsnachweis für die Wiederverwendung gelesener Dokumente und daraus berechneter Prüfsummen. Schlüssel enthalten Besitzer/Datenbank, Mandant, Produkt und Revision; Bindungs-/Shop-Prüfungen bleiben außerhalb der gemerkten Dokumentwerte.

Tiefes Einfrieren wird als `customer_read_freeze` gemessen; `customer_read_hit` und `customer_read_overflow` zeigen Treffer bzw. die Grenze von 16 Einträgen. `droppedStepCalls` macht die Grenze von 64 Schrittnamen sichtbar. Namen werden vor verschachtelter/asynchroner Arbeit reserviert, damit die Grenze auch bei Überlappung gilt.

125 gezielte Tests grün: echte Kunden-/Warenkorbwege, alte/neue Clients, Preis-/Bindungs-/Revisionsfehler, Datenbank-Epochen einschließlich Rollback und zweiter Verbindung, getrennte Kundenphasen und beide Messgrenzen. Der HTTP-Durchlauf verändert Revision, Zuordnung und Preis während des Bild-Wartens: `/data` und der folgende `/claim` lehnen jeweils mit dem bestehenden Fehlercode ab. Alle bisherigen Angebotsauflösungen bleiben erhalten.

### Gleiche lokale Profile vor/nach Teil A

Windows, Node 24.22.1, Core Ultra 5 235, echte temporäre SQLite-Registry, Loopback ohne Drosselung, synthetische Shopify-Antwortzeiten 60/100/25/40 ms. Je ein Aufwärmlauf und drei Messläufe, Median in ms. Vorher `105e398`, nachher der Teil-A-Diff dieses Commits (JSON nennt noch den HEAD vor dem Commit). Derselbe Runner lädt jeweils den angegebenen Checkout. Keine echte Shopify-Anfrage oder Bestellung.

| Anfrage | Kleines Muster vorher/nachher | Strukturfixture vorher/nachher |
|---|---:|---:|
| Entwurf sichern | 859,44 / 864,53 | 3.184,78 / 3.163,68 |
| Übergabe | 22,18 / 16,96 | 1.658,90 / 1.201,13 |
| Daten | 260,04 / 252,15 | 2.420,26 / 1.388,14 |
| Bestätigen | 27,52 / 11,34 | 1.864,90 / 828,02 |

Produkt-Revisionslesungen in beiden Profilen: 4/4/7/6 → 2/2/2/1. Registry-Lesungen und sämtliche Bytes, CPU-, Blockzeit-, Speicher- und GC-Werte stehen in den [Rohdaten](../measurements/2026-11-17-konfi-tempo-p1-umbau/). Die 31.205.208-Byte-Strukturfixture enthält 16.601 synthetische Vektorressourcen-Bäume (83.005 Objekte/Arrays zusätzlich) in einem inerten Konfigurationsfeld, weiterhin ein wählbares Design mit neun Elementen. Kein Kundendokument. Die echte Knotenzahl ist unbekannt; keine strukturelle Gleichheit behauptet. Einfrieren im ersten gemessenen Lauf 31,53 / 22,06 / 26,62 / 10,53 ms je Anfrage, inklusive aller Wiederholungen in dieser Anfrage, nicht je Dokument.

Ausstehend für die vollständige Bewertung: zweites 31,2-MB-Profil mit wenigen großen Zeichenketten, zwei gleichzeitige Kunden und 20 aufeinanderfolgende Übergaben. Kein Beleg für unter fünf Sekunden am Handy; der gesamte echte Browserweg muss vor Live gesondert gemessen werden.

## V2/V3 und Aufbewahrung

Noch nicht in Teil A enthalten. V2 soll das bytegleiche Kunden-PNG direkt nach erfolgreicher Sicherung an Shopify vorgeben, ohne dabei Angebot oder Warenkorb-Konfiguration zu erzeugen. `_gravuru_bild` bleibt im bisherigen Angebotsformat; die neue signierte Prüfstandadresse dient ausschließlich als interne Uploadquelle. V3 soll identische, schon laufende/fertige Sicherungen beim Öffnen der bestehenden Übersicht wiederverwenden; abschaltbar, zunächst aus.

Chris hat auf die offene Aufbewahrungsfrage zuletzt **45 Tage für unbenutzte Entwürfe** vorgegeben; dies ersetzt seine vorherigen 30 Tage. Noch keine Löschlogik oder Löschung, keine Live-Aktivierung. Definition/Schutz benutzter Prüfstände, technische Bereinigung und Shopify-Dateien müssen vor einer Aktivierung konkret geprüft werden; aus der Frist keine weiteren Regeln ableiten. Direkt an Claude und in #254 gemeldet.

Nächster Schritt: Claudes Teil-A-Review, ergänzende Messungen und die getrennten Implementierungs-Commits V2/V3; danach Gesamtprüfung. Nichts live ohne neue Freigabe Chris.
