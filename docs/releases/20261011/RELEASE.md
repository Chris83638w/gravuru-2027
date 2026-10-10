# Veröffentlichung und Sicherung – 11.10.2026

Die getrennte Händlerwerkstatt läuft auf **`77b0472fb5fc5adc82dd3af4bccdf6787900b1ba`**. Die Gedenktafel wurde entsprechend der Nutzerentscheidung auf die vollständig vorhandene Werkstatt-Schrift **Cormorant Garamond** umgestellt: neue Revision 2, zwei Textfelder, 327 Zeichen einschließlich Umlauten und †. Revision 1 bleibt unverändert. Neun Ausführungen wurden lesend gegen die wirklichen Shopify-Varianten, Optionsnamen und Preise geprüft und intern unveränderlich an Preisrevision 30 gebunden.

## Tatsächliche Umgebung und Quellstand

Verwaltete Cloud-Laufzeit `ccarenv_b64_Y2NhcmVudl8xNjQ2ZWNjZjE3NmM4MTkxYjM3ZDhhMzgzMmM2Yzk0MA`, Debian 13, Linux 6.18.44 x86_64, Node 24.19.0, Python 3.12.14. Arbeitswurzel `/workspace`, aktives Repository `/workspace/gravuru-restored`, Remote `https://github.com/Chris83638w/gravuru-2027.git`, Branch `task/live-release-20261010`. Keine Rücksetzung auf die Produktbasis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70`; sie ist Vorfahr des veröffentlichten Quellstands, der 50 nachfolgende Commits enthält. Der ursprüngliche Checkout `/workspace/gravuru-2027` bleibt sauber und unverändert.

Die zuvor ungesicherten Warenkorb-/Schriftänderungen sind im Quellcommit enthalten. Installationspaket und abschließende Betriebsnachweise werden in einem folgenden Sicherungscommit auf die drei vorhandenen Branches `task/live-release-20261010`, `backup/account-recovery-20261010` und `task/full-backup-install-20261010` übertragen; den endgültigen Remote-Abgleich dokumentiert die Abschlussmeldung. Kein Force-Push und keine Änderung an `main`.

## Paket und Installation

[Installationspaket und automatisierter Ablauf](../../../deliverables/merchant-font-cart-20261011/README.md), Version `0.1.0-recovery.20261010+77b0472fb5fc`, ZIP 27.230.534 Byte, SHA-256:

`4d2b7142276482fdb5e95e5f5b84091516dceef280c5ada4e7b7c66fd22365e3`

[Isolierte Installation](merchant-package-install.json): 385 Manifestdateien geprüft, Build, Konfiguration und gestartete Laufzeit erfolgreich. [Vollständiger Übernahmehelfer](packaged-font-upgrade-check.json) in privater Datenkopie getestet: neue Revision und neun Bindungen, zweiter Lauf ohne Duplikate, spätere Händleränderung bleibt geschützt. HTTP-Aufrufe dort vollständig abgefangen; kein echter Shopzugriff durch diesen Test.

[Server-Staging](merchant-server-stage.json) und [Aktivierungsbeleg](merchant-server-activation.json): Plesk-App auf `app-2027.gravuru-designwerkstatt.de`, Node 24.21.0, neues privates Release-Verzeichnis. Vorherige Startdatei und Laufzeit sowie drei SQLite-Datenbanken vor dem Wechsel gesichert. Beim Aktivierungsaufruf lief die HTTP-Wartezeit ab; keine erneute Aktivierung. Stattdessen gespeicherten Beleg und tatsächlich aktive Startdatei unabhängig gelesen und ihre Prüfsumme abgeglichen.

[Übernahmebeleg](merchant-font-upgrade.json) und [zweite Serverabfrage](merchant-server-readback.json) bestätigen Revision 2, Cormorant Garamond, neun Bindungen, unveränderte Vorgängerrevision und SQLite-Integrität. [HTTPS-Prüfung](merchant-https-check.json): Übersicht und Kundenansicht HTTP 200, neue UI-Datei byteidentisch mit dem Quellstand, anonyme API HTTP 401. Die Shopify-App-Version und die bisherige Kundenwerkstatt wurden bei diesem Update nicht geändert. Der Browser-Öffnungsauftrag für Revision 2 ist kein Nachweis einer erfolgreichen echten Nutzeranmeldung.

## Private Sicherungen

Vorher-Sicherung: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-merchant-backup-20261011-77b0472`.

Neue vollständige Sicherung: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-merchant-data-font-20261011`, zusätzlich privat in `/workspace/recovery-private/merchant-font-20261011`. [Serverbeleg](merchant-private-snapshot.json), [Cloud-Prüfung](merchant-private-cloud-copy.json).

| Datei | Bytes | SHA-256 |
| --- | ---: | --- |
| workshop.sqlite | 2.281.472 | e7bf4c38b4a73cfbefc76ffecf891a0dd261db79c42a399613013df5741354a3 |
| profiles.sqlite | 45.056 | e9f6590ee18d85fc40a24b9ef4ed4c702531230d7209fccad1e590f553e9fb3c |
| design-assets.sqlite | 15.228.928 | ca61d87380019f122d1fc6645ca226679ef63a59afe5a65c7c4f88a80af1fc49 |

Alle drei `quick_check` erfolgreich; Cloudbytes entsprechen dem Serverbeleg. Profil- und Originalbibliothek bleiben bytegleich zum vorherigen vollständigen Backup. Die Bibliothek mit den 16 zuvor übernommenen PDF-Originalen ist enthalten. Keine privaten Datenbanken, Originale, Kundendaten oder Geheimnisse werden nach GitHub übertragen. Frühere Sicherungen bleiben erhalten.

## Prüfung und verbleibende Grenzen

[Warenkorb-/Schriftbericht](CART-INTEGRATION.md): 119 gezielte Tests, ergänzend acht Schiefer-/Schrift- und vier Preisvertragsprüfungen sowie drei private Dateiprüfungen bestanden; Mengen überschneiden sich. Alle neun echten Ausführungen in privater Kopie gegen die gesicherte Preisfunktionsquelle geprüft, einschließlich vollständigem Rollback bei ungültigem letzten Preis und idempotenter Wiederholung. Desktop-/Mobil-Browserprüfung mit synthetischer Händleridentität; mobile Warenkorbseite zusätzlich visuell geprüft. Die Schriftdateiprüfung deckte einen zu strengen Kollisionsschutz auf; identisch vorhandene Fonts werden jetzt akzeptiert, abweichende nicht überschrieben.

Noch keine neue öffentliche Kunden-/Checkout-Gesamtstrecke, kein tatsächlich ausgeführter Shopify-Testkauf und kein Bestell-Webhook angeschlossen. `read_orders` fehlt in der bestätigten App-Berechtigung. Die Gedenktafel ist aktiv, aber nicht im Onlineshop-Vertriebskanal veröffentlicht. Nutzer hat Zahlungs-Testmodus bestätigt; das ersetzt keinen ausgeführten Kauf. Produktions-/Material-/Maschinenabnahmen bleiben offen und ihre Sperren wirksam. Der interne Preisvertrag allein schaltet diese Funktionen nicht frei.

## Erreichbare und fehlende frühere Dateien

Die ursprüngliche [Inventur und Herkunft](../../../recovery/2026-10-10/RECOVERY-PROVENANCE.md) und [Sicherungsinventur](../../../recovery/2026-10-10/REPORT.md) bleiben historische Nachweise. Seitdem zusätzlich gesicherte Plesk-Quellen, Erweiterungen, private Originale/Datenbanken und Veröffentlichungen stehen in den Berichten vom 10./11.10.; ältere Aussagen „keine Datenbanksicherung“ gelten nicht mehr für den aktuellen Stand.

Weiterhin nicht als Original verfügbar: frühere Cloud-Arbeitsverzeichnisse und temporäre Testausgaben, lokale Windows-Dateien, nicht eingebundene Anhänge, das ursprüngliche Prüf-ZIP und Git-Objekt `c64c197`. Sichtbare vollständige Chatdiffs wurden zuvor rekonstruiert; dies ersetzt keine ursprüngliche Bytefolge. Nicht gepushte, nicht im Bundle enthaltene und nicht ausdrücklich erreichbare Dateien lassen sich nicht als gesichert bestätigen. Keine Behauptung, jede jemals erstellte Datei sei wiedergefunden.
