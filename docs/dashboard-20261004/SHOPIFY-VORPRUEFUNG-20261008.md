# Lesende Shopify-Vorprüfung · 08.10.2026

## Ergebnis

Quellcommit `583ad9a3aa68b8369f8cfa82b6fdd4f67971622b`, aufbauend auf `d8a09447dba5acdce285f0f6584ee2eb067a0de8`; ZIP-/Excel-/Ordnerimport und die bestandene HTTPS-Abnahme erhalten. Neuer wiederverwendbarer Admin-Anschluss und CLI-Befehl `shopify:preflight`, auf der getrennten Test-Site 19 installiert und tatsächlich ausgeführt. Keine Weboberfläche ersetzt, bestehender privater Webstart weiterhin `shopifyConnected: false`.

Der neue Anschluss liest den vorhandenen App-Schlüssel ausschließlich aus seiner geschützten Serverdatei. Er authentifiziert den eigenen Prozess über Client Credentials, hält den Token nur im Arbeitsspeicher und erneuert ihn vor Ablauf. Feste Shop-/App-Identität, API 2026-07, gültige TLS-Prüfung, keine Weiterleitungen, begrenzte Antwortgröße/Zeit, keine automatischen HTTP-Wiederholungen und keine Ausgabe von Upstream-Fehlertexten oder Geheimnissen. Die öffentliche Schnittstelle bietet nur zwei feste Leseabfragen; kein beliebiger GraphQL-Aufruf oder Token-Getter.

Die Variantenprüfung verwendet `prepareShopProduct` und damit das vorhandene gemeinsame Preis-/Variantenmodell. Eine explizite vorgeschlagene Zuordnung wird gegen genaue Shopify-IDs, Produkt, Optionen, Währung und ganze Cent geprüft. Keine Namenssuche und keine automatische Bindung. Der Bericht enthält Produktrevision und Quellenhash; Preisänderungen verlangen eine neue Prüfung. Teilzuordnungen und zusätzliche Motiv-/Fotoaufpreisbindungen bleiben sichtbar. Ein passender Admin-Preis beweist weder Storefront-Verfügbarkeit noch einen sicheren Testkauf.

## Gezielt geprüft

29 neue lokale Tests, alle bestanden:

- 21 Prüfungen des Admin-Anschlusses: Token gemeinsam bei parallelen Aufrufen, rechtzeitige Erneuerung, feste Identität, genaue Varianten-IDs, Weiterleitungen/401/Versionswechsel/GraphQL-Fehler, Antwortgrößen, Timeout, Geheimnisredaktion, fehlerhafte Geldbeträge, fehlende Varianten.
- 5 Prüfungen der Zuordnung: alle 28 Acryl-Ausführungen aus dem kanonischen Modell; getrennte Preis-/Options-/Produkt-/Status-/Währungsfehler; Teilzuordnung; geänderte Preisrevision; doppelte/fremde/manipulierte Eingaben vor Netzwerkzugriff; Formprodukte mit eindeutiger Standardausführung. Keine lokalen Bindungen oder Produktänderungen durch die Vorprüfung.
- 3 Prüfungen privater Dateien/CLI: reguläre private Datei ohne Umschreiben; Symlinks, Git-Pfade, fremde Leserechte und Größen abgewiesen; fehlerhafte Eingaben ohne Netzwerkzugriff und ohne Offenlegung gemeldet.

Ausgeführt: `node --test app/workshop/shopify-admin-readonly.test.mjs`, `node --test app/workshop/shopify-variant-preflight.test.mjs ops/plesk/shopify-preflight.test.mjs`, anschließend nur der neu ergänzte Formtest per `--test-name-pattern`. Paketgenerator syntaktisch geprüft; ZIP-CRC, sämtliche Manifest-Prüfsummen und genau sechs geänderte/zusätzliche Paketdateien gegenüber der vorherigen Lieferung geprüft. Keine bestandene unveränderte Browser-, Import-, Druck- oder Neustartabnahme wiederholt.

## Neuer Nachweis auf dem echten Server

[Serverbericht](shopify-preflight-20261008/server-report.json) · [Paketupdate](shopify-preflight-20261008/update.json)

- Node 24.21.0, Paketquelle `583ad9a`, alle 364 manifestierten Dateien überprüft. Nur neue Prüfbefehle/Module, Anleitung und Paketskript ergänzt; privater HTTP-Start, Produkteditoren, Datenbanken und private Konfiguration unverändert. Kein Neustart/Installer erforderlich.
- CLI mit dem vorhandenen Schlüssel tatsächlich ausgeführt. Erwartete bestehende App `423276544001` in `gravuru-design.myshopify.com`, Euro, kein Partner-Entwicklungsshop. `read_orders` weiterhin nicht erteilt. Das ist eigene Prozessauthentifizierung, keine Händler-/Kundenanmeldung im Browser.
- Bewusst **unpassender Lesekandidat**, keine fachlich freigegebene Testvariante: Variante `56510851907964`, Produkt `15927621124476`, gegen den vorhandenen synthetischen Acryl-Teststand Revision 2 geprüft. Ergebnis: **4000 Cent statt 1499 Cent**, zusätzlich andere physische Optionen. CLI **Exitcode 2** und `price_mismatch`, `options_mismatch` wie erwartet. Keine lokale Zuordnung, kein Shop-Schreibzugriff und keine Veröffentlichung.
- Für diesen Aufruf eine ausschließlich synthetische Eingabedatei privat mit 0600 angelegt und im selben Prozess wieder entfernt. Schlüssel weder kopiert noch protokolliert. Keine Kunden-/Bestellinhalte abgefragt oder gesichert.

## Weiter offen

Bestätigter Testshop oder vorhandener Testzahlungsweg, explizit passende Testvariante, Händler-/Kundenanmeldung, Storefront-/Aufpreisprüfung, signierte tatsächliche Bestellzuordnung und kaufgebundene Kundenkontofreigabe. Der aktuelle reguläre Plus-Shop darf nicht als risikoloser Entwicklungsstore behandelt werden. Änderungen an der laufenden App-Konfiguration weiterhin nur nach konkreter Freigabe mit Rückweg. Keine echte Bestellung durchgeführt.

Drive-OAuth noch nicht eingerichtet; KI-Anbieter/Kostenrahmen offen; physische RIP-/ICC-/Material-/Geräteabnahme extern. Die Plesk-API-/SSH-/VPN-Einrichtung bleibt zurückgestellt.

GitHub-Anmeldung fehlt in dieser Cloud-Sitzung: lesendes `git ls-remote` meldet fehlende HTTPS-Anmeldedaten, Laufzeitstatus enthält keine Credential-Bindung. Umsetzung lokal committet und Testserver aktualisiert; GitHub-Sicherung nicht als erfolgt ausgeben. Benutzer zur sicheren Wiederverbindung des vorhandenen GitHub-Zugangs aufgefordert. Nach Wiederverbindung normalen Push ohne Force auf `feat/excel-profile-assignments-20261007` ausführen und vollständigen Remote-Commit bestätigen.
