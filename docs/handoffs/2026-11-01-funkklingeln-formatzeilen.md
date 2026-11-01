# Funkklingeln: schmale Formatzeilen

Auftrag vom 01.11.2026 im Funkklingel-Chat: alle Formate untereinander in schmalen Blöcken, optisch passend zu „Rahmen & Farbe“.

Regeln vor Umsetzung: ein Format je Zeile über die verfügbare Breite, vorhandenes Bild links, Bezeichnung/Maß daneben, vorhandener Preis rechts. Format- und Positionsgruppen ohne zusätzliche äußere Karte; Auswahl bleibt bebildert und bedienbar. Quelle: aktueller Nutzerauftrag und vorhandene Darstellung unter „Rahmen & Farbe“. Nur produktspezifisches CSS, keine Änderung fachlicher Regeln, Preise, Geometrie oder Master-Funktionen. Keine Designs bearbeitet; der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich.

Eigener Branch `dev/funkklingeln-formatzeilen-20261101-astra` auf main `273aaba`. Prüfung und Bereitstellung werden unten dokumentiert.

## Geprüfte Umsetzung

Nur CSS in `doorbell-presentation.mjs`: Format und Position einspaltig, schmale Zeilen (48 px Mindesthöhe, im Desktop 50,14 px tatsächlich), kompaktere Bilder/Abstände, ohne äußere Gruppenkarte. Platz für den Auswahlhaken neben dem Preis. Rahmen/Farbe, Befestigung sowie sämtliche Master-Funktionen unverändert.

5/5 vorhandene gezielte Tests bestanden; Build erfolgreich (76 geprüfte Ressourcen). Browserprüfung Desktop und 390×844: alle drei Formate in einer Spalte, keine horizontale Textüberbreite. Formatwechsel 35×18 → 24×20 → 35×18 mit bestehendem Silikon 74,98 → 64,98 → 74,98 EUR bestätigt. Für diese reine CSS-Änderung keine neuen Tests oder erneuter Warenkorb-/Datenbankvollauf nötig.

[Desktop](assets/2026-11-01-formatzeilen/desktop.png) · [Mobil](assets/2026-11-01-formatzeilen/mobil.png)

## Live-Nachweis 01.11.2026

Mit bestehender ausdrücklicher Live-Freigabe und erneuerter Plesk-Anmeldung veröffentlicht. [PR #91](https://github.com/Chris83638w/gravuru-2027/pull/91) gemergt als `0f03c8e9caa2984c9f6a6d48296254d75c095982`; Quellcommit `579474b7bc412489686cec28dc1e9c94aa6efe68`.

Ausgangslaufzeit `/private/funkklingeln-master-reparatur-20261031` nach `/private/funkklingeln-formatzeilen-20261101` kopiert (alle Pfade unter `/var/www/vhosts/gravuru-designwerkstatt.de`). Ausschließlich `doorbell-presentation.mjs` aus dem Commit übernommen, auf Linux die bestehenden fünf Tests erfolgreich ausgeführt und neu gebaut. 3.274 Dateien verglichen: außerhalb dieses Moduls und der generierten `.preview` keine Änderung. Startup-Zeiger nach Prüfung des bisherigen SHA atomar umgestellt, App in Plesk neu gestartet. Wrapper und Umgebungswerte erhalten; weder Shopify noch Katalog, Datenbank oder Bindungen geändert. Kein Cron-Job gespeichert.

Öffentlicher Editor und Bundle HTTP 200. Ausgeliefert: `editor-01b70464621cbee2.mjs`, 1.328.098 Bytes, SHA-256 `fbadcc6751bbe73a2ccb38c2d3213d2f23f8592a4d51d2900ea51df92b98af85`, exakt wie auf dem Server gebaut. Modul-SHA `c4f7d05d2cbd558f7555c8ef17edd732bfc7db79409a29c143d03ef2cfccfa1c`.

Frischen AOSU-Shop-Einstieg geöffnet und Desktop sowie 390×844 geprüft: drei Formatzeilen mit jeweils 50,14 px Höhe, Breite 482,5 px bzw. mobil 335 px, ohne horizontale Textüberbreite. Preise mit vorhandener Silikon-Auswahl beim Wechsel 35×18 → 24×20 → 35×18: 74,98 → 64,98 → 74,98 EUR. Keine Bestellung und kein Warenkorb-Schreibtest für diese CSS-Änderung.

[Live Desktop](assets/2026-11-01-formatzeilen/live-desktop.png) · [Live Mobil](assets/2026-11-01-formatzeilen/live-mobil.png)

Rückweg: Im privaten Nachweisordner `/private/funkklingeln-formatzeilen-20261101-nachweis` liegen `app.cjs.before`, `start-r5.cjs.before`, `tests.log`, `build.log`, `manifest.json` und `switch.json`. Bei Bedarf die gesicherte `app.cjs.before` nach `/gravuru-2027-merchant/app.cjs` unter Erhalt von Eigentümer/Rechten zurückspielen und App neu starten. Alte Laufzeit bleibt verfügbar. Aktueller Startup-SHA nach Umschalten: `53c8a8677b4f6034dea1d6f30bcd050f11cdc0814c800a858895edc1ee6176a6`.
