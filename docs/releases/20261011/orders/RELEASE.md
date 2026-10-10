# Testbestelleingang, Shopify-Version und Sicherung – 11.10.2026

Die Händlerlaufzeit läuft auf **`ca4f6cd5b5d2d0255485fb2bf3d73de339d485fc`**. Der signierte Eingang `/webhooks/shopify/orders-paid` wurde auf dem getrennten Händlerhost installiert und über HTTPS geprüft. Shopify-Version **`gravuru-2027-orders-20261011-build2`**, ID **`1162598875137`**, ist veröffentlicht und nachgelesen. Sie ergänzt ausschließlich die erforderliche Berechtigung `read_orders`. Alle sieben App-Module, 19 Theme-Dateien und die veröffentlichte Preisfunktion bleiben erhalten; der SHA-256 der 3.294-Byte-Wasm-Datei ist `f9360588df38eb108ec77ecd0276f46f4524841949c15a76d9789f332adb7890`. Gedenktafel Revision 2 mit Cormorant Garamond und neun Preisbindungen bleibt bestehen.

**Noch nicht verbunden:** Die anschließende Abfrage mit der eigenen App meldet `orders_scope_missing`. Shopify hat die Version veröffentlicht, der Shop hat die zusätzliche Berechtigung noch nicht gewährt. Der Registrierungshelfer brach vor einer Abonnement-Mutation ab. Nutzer wurde gebeten, die App erneut zu öffnen und eine angezeigte zusätzliche Bestellberechtigung in Shopify zu bestätigen. Kein tatsächliches Shopify-Testereignis, keine Bestellung, Zahlung oder Produktion ausgelöst. Die neue öffentliche Checkout-Gesamtstrecke bleibt offen.

## Tatsächliche Umgebung und erhaltene Historie

Verwaltete Cloud `ccarenv_b64_Y2NhcmVudl8xNjQ2ZWNjZjE3NmM4MTkxYjM3ZDhhMzgzMmM2Yzk0MA`: Debian 13, Linux 6.18.44, Node 24.19.0, Python 3.12.14. Arbeitswurzel `/workspace`, aktives Repository `/workspace/gravuru-restored`, Remote `https://github.com/Chris83638w/gravuru-2027.git`, eigener Branch `task/live-release-20261010`. Ursprünglicher Checkout `/workspace/gravuru-2027` sauber und unangetastet.

Quellen: `d16b3ceb5be4671b32b37db282f0135dc7c3ba46` ergänzt den expliziten HMAC-Eingang und Abonnementhelfer; `ca4f6cd5b5d2d0255485fb2bf3d73de339d485fc` korrigiert dessen Server-Probe und enthält die geprüften Shopify-Veröffentlichungshelfer. Die Produktbasis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70` ist weiterhin Vorfahr. Bis `ca4f6cd` sind 53 nachfolgende Commits erhalten; kein Reset, Rebase oder Force-Push. Paket und Betriebsnachweise werden im anschließenden Sicherungscommit ergänzt. Die drei Sicherungsbranches werden gemeinsam fortgeschrieben; endgültiger Remote-Abgleich steht in der Abschlussmeldung.

## Paket und Installation

[Aktuelles Installationspaket und automatischer Ablauf](../../../../deliverables/merchant-orders-20261011/README.md): Version **`0.1.0-recovery.20261010+ca4f6cd5b5d2`**, ZIP **27.238.032 Byte**, 390 Manifestdateien plus Manifest. SHA-256:

`4e03b3af7b1af7972153d6977c86ff36f3841bd74c768f780e921e7357a902bf`

[Getrennte Installation](package-install-v2.json) und [vollständige Paketaktivierung](activated-package-test-v2.json) bestanden: frische synthetische private Ablage außerhalb Git, Build, Konfigurationsprüfung, HTTP-Start, Händler-API-Schutz, zweimalige optionale Aktivierung ohne Duplikate, Schutz zwischenzeitlicher Konfigurationsänderungen, signierte lokale Testnachricht und persistierte Duplikaterkennung nach Neustart. Keine Shopify-Anfragen durch diese synthetische Paketprüfung.

[Server-Staging](server-stage-v2.json) bestätigt alle 390 Dateihashes, Build und bestehende private Konfiguration. Händlerziel ausschließlich Plesk Site 20, `app-2027.gravuru-designwerkstatt.de`, Node 24.21.0. Bisherige Kundenwerkstatt (Site 14) und Operator-Testinstanz (Site 19) bleiben unangetastet. Die Zwischeninstallation `d16b3ce` sowie ihr Paket bleiben mit eigenem Prüf- und Aktivierungsbeleg nachvollziehbar.

[Aktivierungsbeleg](server-activation-v2.json) und [unabhängiger Server-Readback](server-readback-v2.json) bestätigen die aktive Startdatei, sämtliche 390 installierten Dateien, unveränderte private Konfiguration und `test-only-2026-07`. [Abschließende HTTPS-Prüfung](https-check-v2.json): beide Seiten 200, Händler-API und unsignierter POST 401, GET am Bestelleingang 405, Browser-Origin 403. Vorher-Sicherung unter `/private/gravuru-merchant-backup-20261011-ca4f6cd`; alle drei Datenbanken erneut bytegleich zur privaten Cloud-Kopie, SQLite-Integrität bestanden. Die Aktivierungsantwort lief in ein Zeitlimit; anhand der neuen Startdatei und des separat gelesenen Belegs bestätigt, nicht erneut aktiviert.

## Shopify und Tests

[Veröffentlichung](shopify-publication.json), [Kandidatenabgleich](shopify-stage.json), [Erweiterungen](shopify-extension-check.json) und [tatsächlicher Abonnementstatus](shopify-subscription.json). Rückkehrversion: `1162554900481`. Die Freigabe prüft vorab die unveränderte aktive Version, sämtliche installierten Paketdateien, HTTPS-Grenzen und den gespeicherten Kandidaten; danach wird der aktive Modulstand erneut abgeglichen. Die Versionsveröffentlichung allein beweist keine Scope-Gewährung im Shop.

[Implementierung](IMPLEMENTATION.md), [Prüfgruppen](tests.json): vier HTTP-, sieben Händler-Laufzeit-, 16 Bestell-/Preisvertrags-/Versions- und drei Registrierungsprüfungen bestanden. Nach dem realen Probe-Befund zwei native HTTP-Transportprüfungen, drei Registrierungs- und drei Versionsprüfungen erneut bestanden. Diese Mengen überschneiden sich und dürfen nicht als unabhängige Gesamtsumme addiert werden. Echte HTTP-Verbindungen in den lokalen Tests; synthetische Identitäten und Bestellungen. Kein Ersatz für einen echten Shopify-Testkauf.

Die Nachricht wird nur mit korrekter Shopify-HMAC, festem Shop, API 2026-07, `orders/paid`, `test:true`, EUR und bezahltem, nicht storniertem Zustand angenommen. Bindung, Preis und Menge werden gegen unveränderliche lokale Angebote geprüft. Antwort nach Datenbank-Commit; Duplikate werden erkannt. Bestehende JWT-/CSRF-Grenzen bleiben aktiv. Keine Fertigung oder Dateifreigabe durch diesen Eingang.

## Private Sicherung und fehlende Dateien

Vor jedem Händlerwechsel konsistente Sicherung der drei SQLite-Dateien, Startdatei, privaten Konfiguration und bisherigen Laufzeit unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/`. Die Sicherung vor `d16b3ce` ist bytegleich zur bereits vorhandenen Cloud-Kopie `/workspace/recovery-private/merchant-font-20261011`: [SHA-256 und SQLite-Integrität](private-backup-check.json). 16 importierte PDF-Originale befinden sich in der privaten Originalbibliothek. Geheimnisse, Datenbanken, Entwürfe und Kundendaten bleiben außerhalb von Git und den Installationspaketen.

GitHub-Sicherung umfasst erreichbaren Code, Werkstattressourcen, Dokumentation, Tests, Installationshelfer, versionierte Pakete und bereinigte Nachweise. Frühere Sicherungen bleiben erhalten. Die [bisherige Inventur und Herkunft](../../../../recovery/2026-10-10/RECOVERY-PROVENANCE.md) und der [vorige Sicherungsbericht](../RELEASE.md) gelten ergänzend: frühere Cloud-Arbeitsverzeichnisse und temporäre Testausgaben, lokale Windows-Dateien, nicht eingebundene Anhänge, ursprüngliches Prüf-ZIP und Git-Objekt `c64c197` sind weiterhin nicht als Original erreichbar. Rekonstruierte Chat-Diffs sind keine zurückgewonnenen Originaldateien; keine externe Claude-Prüfung wurde durchgeführt.

## Fehlversuche und gezielte Korrekturen

- Direkte Shopify-Kandidatenkopie wurde wegen fehlender Wasm-/Theme-Uploadressourcen abgewiesen und nicht unverändert wiederholt. Danach vollständiger Build aus den gesicherten Erweiterungsquellen mit `--no-release` und Hash-Abgleich.
- Kandidatenprüfung hielt zunächst wegen Shopify-sortierter Scopes an. Der einzige Unterschied wurde als alphabetische Reihenfolge derselben Rechte nachgewiesen; Prüfung gezielt korrigiert, vorhandener Kandidat nachgelesen und bestätigt. Kein zweites Deployment dafür.
- Native Node-`fetch`-Probe enthielt automatisch `Sec-Fetch-Mode` und wurde korrekt als Browser-Aufruf abgewiesen. Transport auf native HTTPS-Anfrage ohne Browser-Metadaten umgestellt und getestet; keine Abschwächung der Browsersperre. Erst danach veröffentlicht.
- Eine automatische Freigabeprüfung verwechselte das Plesk-Staging mit der zuvor gescheiterten Shopify-Kandidatenkopie. Nach Vergleich der konkreten Skripte und Ziele wurde das Plesk-Staging freigegeben und erfolgreich ausgeführt; keine offene Ablehnung.
- Bei HTTP-Wartezeitüberschreitungen keine unveränderte erneute Aktivierung oder Veröffentlichung: gespeicherte Belege, Dateien und Prozesse geprüft. Plesk-Downloads verschachtelter Dateien benötigten ausdrücklich `currentDir`; korrigierter Pfad statt unveränderter Wiederholung.

Nächster abhängiger Schritt: tatsächlich gewährtes `read_orders` bestätigen, festes Abonnement `ORDERS_PAID` mit Filter `test:true` und begrenzten Feldern genau einmal anlegen und nachlesen. Danach Kunden-/Checkout-Strecke verbinden und im vom Nutzer bestätigten Zahlungs-Testmodus prüfen. Produkt-Vertriebskanal, echte Händleranmeldung und Produktions-/Material-/Maschinenabnahmen bleiben eigene Nachweise.
