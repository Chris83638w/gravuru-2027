# Funkklingeln: alle Ausführungen in einem Block

Quelle und Regel vor Umsetzung: Chris korrigiert am 01.11.2026 im Funkklingel-Chat: „Format darunter Position, dann Rahmen, dann Farbe und dann die Befestigung in einem Block“. Unter dem bestehenden Hauptschritt Ausführungen stehen deshalb alle fünf Gruppen direkt untereinander; die drei Untertabs entfallen. Schmale Format-/Positionszeilen, bebilderte Rahmen/Befestigungen und runde Farbauswahl bleiben erhalten. Keine neue Fachregel, kein Preis-, Geometrie-, Rechte- oder Master-Eingriff. Keine Designs geändert; der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich.

Eigener Branch `dev/funkklingeln-ausfuehrungsblock-20261101` ab main `10eee72`. Bestehende Live-Freigabe gilt auch für diese Korrektur. Nur das Funkklingel-Darstellungsmodul gezielt in die aktuelle aktive Laufzeit übernehmen.

Umsetzung: Untertab-Navigation und Ausblendregeln entfernt; ein beschrifteter gemeinsamer Auswahlblock mit fünf Gruppen. Vorhandene Master-Haupttabs, Bilder, Farbkreise und Auswahlbehandlung bleiben erhalten. 5/5 bestehende Tests, Build (76 geprüfte Ressourcen) und sichtbare Desktop-/390px-Handyprüfung bestanden: Reihenfolge bestätigt, alle fünf Gruppen erreichbar; Farbauswahl und Befestigungswechsel ohne Tabwechsel bedienbar. 35×18 mit/ohne Silikon: 74,98/69,99 EUR.

[Desktop](assets/2026-11-01-ausfuehrungsblock/desktop.png) · [Mobil](assets/2026-11-01-ausfuehrungsblock/mobil.png).

## Live-Nachweis

[PR #94](https://github.com/Chris83638w/gravuru-2027/pull/94) gemergt als `b5c83567275e500fe60ac6ca6e874b84abcd9b53`, Quellcommit `03b223d1c71959d8399d13b2f36156638073b896`. In eine Kopie der aktiven Laufzeit `/private/funkklingeln-formatzeilen-20261101` ausschließlich das Darstellungsmodul übernommen; Ziel `/private/funkklingeln-ausfuehrungsblock-20261101`. Alle Serverpfade unter `/var/www/vhosts/gravuru-designwerkstatt.de`. 5/5 Tests unter Linux bestanden, Build erfolgreich, 3.274 Dateien verglichen: außerhalb des einen Moduls und generierter `.preview` keine Änderung. Modul-SHA `cc26541886bac190fe6dbec048e38ff0d1515d84b1c4c53ffcabe9af979cd7c0`.

Startup nach gesichertem Vorher-Abgleich atomar umgestellt und App neu gestartet. Wrapper und Umgebungswerte erhalten; kein Shopify-, Katalog-, Datenbank- oder Bindungseingriff. Kein Cron-Job angelegt. Öffentliches Editor-HTML und Bundle HTTP 200; `editor-faabffe2a3396f58.mjs`, 1.325.365 Bytes, SHA `33fb85e46270f714eea504505d04a0d3b499204f3bf4ab5861ede05ae84c595d` exakt bestätigt.

Frischer AOSU-Shop-Einstieg: fünf sichtbare Gruppen in der vorgegebenen Reihenfolge, unveränderte Haupttabs Ausführungen/Designs/Text/Motive. Live mobil Befestigung Silikon → keine → Silikon, Preis 74,98 → 69,99 → 74,98 EUR bestätigt. Keine Bestellung/kein Warenkorb-Schreibtest erforderlich für diese Darstellungsänderung. [Live Desktop mit vollständigem Block](assets/2026-11-01-ausfuehrungsblock/live-desktop.png) · [Live Mobil](assets/2026-11-01-ausfuehrungsblock/live-mobil.png).

Rückweg: `/private/funkklingeln-ausfuehrungsblock-20261101-nachweis/app.cjs.before` unter Erhalt von Eigentümer/Rechten nach `/gravuru-2027-merchant/app.cjs` zurückspielen und App neu starten. Alte Laufzeit bleibt verfügbar. Nachweisordner enthält auch `manifest.json`, `switch.json`, Test-/Build-Protokolle und Wrapper-Sicherung. Startup-SHA nach Umschalten `70d2a69ae6b5fa052817470d85c9fe1a2013085621b31e3c6c080649fd5725e1`. Keine offenen Schritte für diese Korrektur.
