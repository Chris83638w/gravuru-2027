# Tatsächlicher privater Modulanschluss – 08.11.2026

## Verbindlicher Umfang

Ein gemeinsamer freigegebener R15-Konfigurator; Module je Produktgruppe statt eines neuen Konfigurators. Kundenaufbau, Designs, Preise und alte Bestellstände bleiben erhalten. Vor neuen Produkten werden die Optionen bestätigt. Die private Verwaltung und die Kundenlaufzeit sind getrennte Prozesse; die Installation der Verwaltung aktiviert keine neuen Kundenregeln.

## Auf dem Server erledigt

- Vorherige Sicherung abgeschlossen um 13:54:00 UTC: acht SQLite-Datenbanken mit Integritätsprüfung und SHA256, acht Start-/Konfigurationsdateien und drei ergänzende Galerie-/Importdateien. Kein vollständiges VPS-Abbild. Private Ablage: `private/mika-module-connect-20261108-v2/pre-mount-backup-v2` und `pre-mount-files-extra`. Receipt-SHA256 `e4ae36a7e450fc295b4955266e556a36474bf0ed81f6d8a6d50162321339c83e`.
- Paket aus Commit `a71b3eb4bfdbb02a8d6b811c9f188fefcac72f06` installiert: 1.267 Dateien, 48.287.862 entpackte Bytes. Archiv-SHA256 `b201770cf73a6aaaa984a20adb35e909387bba030f47da201ca065fa00102512`, Manifest-SHA256 `15e5a424b1e61ad7270643c1ecdf3dead0a9d4f9db245a8f477e4be9a51edf0d`. Vollständige Dateiüberprüfung bestanden.
- Reale lesende Vorprüfung über die vorhandene Shopify-App und native Datenbank bestanden: Revision 4, Preisrevision 2, 251 Originale, 80 Größen, 404 Verbindungen. Keine Shopify-/Produkt-Schreibaktion. Vorprüfungs-Receipt-SHA256 `0fc995b4a18db675df82a2bc90d0f1d5da0ed820c7dbe51311a8a745210ac4f1`.
- Zwei reguläre Modulprofile einmalig in der separaten Modulbibliothek angelegt: **Edelstahl-Türschilder · mit Logo** und **Edelstahl-Türschilder · ohne Logo**, jeweils Revision 1. Ausschließlich `logo` unterscheidet sich. Ausführung, Designs, Text, Motive sind an; Fotos und Farben aus. Kein Zielprodukt dafür geändert.
- Privater Quellhost um 14:22:54.347 UTC auf dieses Paket umgestellt. Die aktive `gallery-4`, vorhandene Datenablage und Anmeldung bleiben dieselben. Die vorbereitete Gesamtgalerie wurde nicht aktiviert. Beide Synchronisations-Schreibschalter bleiben aus.

## Tatsächlich beobachtete Prüfungen und offene Grenzen

Der erste Start musste den vorhandenen abgeleiteten Produktkatalog für 2.793 von 3.142 Einträgen aufbauen. Das geschah in einer Transaktion und dauerte mehrere Minuten. Die fehlenden Katalogeinträge standen danach auf **0**, bei unverändert 3.142 Produkten und 3.142 Importzuordnungen. Keine vorsorgliche Änderung an Startreihenfolge oder Frischeprüfung.

Der tatsächlich gestartete innere Verwaltungsserver lieferte für `/originale/verwaltung` **HTTP 200**, 5.401 Zeichen, SHA256 `c7024355756fa6f7b16e644069f83d61c451cb2787abb9ef7ae2a18d53d550c5`.

Der anschließende Abruf `/originale/verwaltung/api/context` brach nach **20.023 ms** mit Zeitüberschreitung ab. Im Code ist dafür das vollständige Laden aller großen Quelldokumente samt indirekter Bereichsscans identifiziert. Ein getrenntes v2-Paket soll leichte Listen zuerst liefern und Details erst bei konkreter Auswahl lesen. Dieser Fix ist zum Zeitpunkt dieses Berichts **noch nicht veröffentlicht oder abgenommen**.

Die abschließende sichtbare Browserprüfung und ein normaler Neustart nach dem einmaligen Katalogaufbau stehen noch aus. Die Browsersteuerung wurde während der Prüfung automatisch gestoppt, weil sie das aktuelle native Browserfenster nicht eindeutig zuordnen konnte. Das ist kein Nachweis eines Fehlers im Kundenkonfigurator. Die bisherige lokale echte Mount-/Plan-/Neustartprüfung ersetzt diese offene Serverabnahme nicht.

## Kundenstand unverändert

Der Kunden-Startwrapper hatte nach dem privaten Mount weiterhin SHA256 `31781a783270f4704d0a1831f62aa50a4c44566a6ec6fa18c691a1205a81f6b9`. Kundenhost, CSS, Theme, native Produktrevision 4 und bestehende Bestellungen wurden in diesem Schritt nicht verändert.

Der aktive R15-Kundenstand kennt die allgemeinen Modulprofile noch nicht vollständig. Der gezielte Anschluss betrifft zwölf Funktionsdateien und wird getrennt vorbereitet; keine Änderung an der freigegebenen Oberfläche. [Genaue Dateigrenze, Tests und Rücknahme](../reviews/2026-11-08-module-customer-runtime/README.md). Erst nach kompatibler Kunden-/Serverprüfung darf eine neue Produktrevision mit Modulprofil aktiviert werden.

## Rücknahme des privaten Mounts

Nur den Quell-Startwrapper `gravuru-2027-bulkapproval-3db1ef5d/app.cjs` aus der gesicherten Fassung wiederherstellen und dessen eigenen Neustart auslösen. Ursprünglicher SHA256 `c8b4d25ce0992bb0aec4b8a4456899ac5aa02272ddd1a69ce656bc16488bc222`, installierter SHA256 `12084efd6c9969f9e3069df10774ebe59045dac924cdc157e7f0326c51478d53`. Die ursprüngliche Konfiguration wurde nicht überschrieben; das Paket verwendet eine neue private Kopie. Keine Datenbank über zwischenzeitliche Händlerarbeit zurückkopieren und den Kundenhost nicht umschalten.

## Nächste konkrete Arbeit

1. Privaten Listenabruf gezielt beschleunigen und unabhängig prüfen; als eigenes v2-Paket veröffentlichen.
2. Tatsächliche Verwaltungsabrufe, zwei gespeicherte Profile, Neustart und weiterhin gesperrte Shopify-Ausführung prüfen.
3. Zwölf Modul-Funktionsdateien auf der exakt aktiven R15-Basis vorbereiten, Legacy/Logo an-aus/Preis-/Speichergrenzen prüfen. Danach erst kontrollierter Kundenanschluss, zunächst ohne Änderung der r4-Produkte.
4. Einen konkreten Profilplan bestätigen und prüfen, bevor eine neue Produktrevision/Shopify-Bindung geschrieben wird. Keine automatische Anlage neuer Artikel als Nebenwirkung.

Die Arbeit liegt in [PR 213](https://github.com/Chris83638w/gravuru-2027/pull/213). Private Rohdaten und Geheimnisse bleiben auf dem Server bzw. in lokalen Nachweisen; GitHub enthält nur Beschreibung und Prüfsummen.
