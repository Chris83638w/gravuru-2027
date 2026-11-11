# Kundenkonfi: Motivtreffer live, Übertragungsengpass belegt

Stand 09.11.2026, Codex/Mika. Diese Übergabe ergänzt und aktualisiert die [Performance-Fortsetzung](2026-11-09-performance-continuation.md). Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich; keine Designs geändert.

## Tatsächlich veröffentlicht

Quellstand `767701ee59c14ef550b6b1c1468013869b8fe188`, am **09.11.2026 um 15:10:27 UTC** in die bestehende Runtime installiert. Danach App über Plesk neu gestartet. Das historische `restartPending: true` der zuvor geschriebenen Quittung ist damit erledigt.

Genau vier Produktionsdateien:

- `app/workshop/http.mjs`
- `app/workshop/public-design-previews.mjs`
- `app/workshop/shop-entry.mjs`
- `app/configurator/variant-m/refinements.mjs`

Die Serverdateien vermeiden wiederholte große Modellkopien beim Abruf vorhandener öffentlicher Originalvorschauen. Aktuelle Bindungs-, Preis-, Mandanten- und Freigabeprüfungen bleiben bestehen. Der Trefferfix erlaubt das Greifen sichtbarer Motivkonturen durch unsichtbare Text-Hilfsflächen; sichtbarer Text und gesperrte Elemente behalten ihre Regeln.

Runtime unverändert: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-r15-resume-20261108-v1`.

- Sicherung: `pre-switch-backup/server-hit-followup-20261109-v1`
- Installationsbeleg: `server-hit-followup-20261109-receipt.json`
- Installer-SHA: `eb67ae6ab0032c017b6885801caad5d1c19c5cd8bc7b92063b63af7194f17f0e`
- Core: `editor-e49b3da45a697a36.mjs`
- HTML-SHA: `c2cff8848d89b0a2260ed5a7f5d824e08b1837482241445d310606d4ee2545d4`
- R15-Paket unverändert: `editor-bf7d088b9bdf015e.mjs`

Frischer Vorherabgleich, 49 geschützte Dateien, alle 36 Styles, zwei fremde aktive Korrekturen, Wrapper und 1069 App-Dateien geprüft. Getrennter Build, HTML zuletzt atomar ersetzt, zwölf historische Bündeldateien erhalten. Kein Shopify-, Datenbank-, Preis-, Produktbindungs- oder Layoutwechsel. Lokale Rücknahme- und Wiederholungsproben sowie unabhängiger Installerreview bestanden.

## Tatsächliche Kundenprüfung

Einstieg: [Edelstahl-Türschild im Shopify-Shop](https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen). Frische Sitzung über die Produktseite geöffnet; Sitzungsfragmente nicht gespeichert oder veröffentlicht.

Mit echter Browserbedienung und emulierten Touchereignissen bei 390 × 844:

1. Original „Zwei Zeilen, mittig“, 12 × 8 cm, 19,99 € geöffnet.
2. Motiv „Haus“ ergänzt: 21,68 €.
3. Motiv auf Text „Familie“ gezogen, danach anderen Text gewählt und Motiv abgewählt.
4. Sichtbare Motivkontur innerhalb der transparenten Textauswahl erneut gegriffen. Motivposition von x59,985/y28,9795 auf x74,3564/y37,6024 geändert; Breite22,9700/Höhe20 unverändert. Beide Texte unverändert.
5. Sichtbarer Textbuchstabe weiterhin als `text-2` auswählbar.
6. Zurücksetzen bestätigt: Originalgestaltung und 19,99 € wiederhergestellt. Keine Bestellung oder Warenkorbübergabe ausgelöst.

Wichtig: In diesem konkreten Live-Lauf war der gebündelte Download zuvor abgebrochen. Die geprüfte Interaktion lief deshalb über den bestehenden Einzelmodul-Fallback mit denselben veröffentlichten Quellen. Keine erfolgreiche vollständige Core-Übertragung in genau diesem Browserlauf behaupten. Der vollständige Core wurde separat bytegenau geprüft; lokale Bündel-/SVG-/Touchprüfungen stehen in der [Treffer-Übergabe](2026-11-09-overlap-pointer-hit.md).

Desktopzustand sichtbar kontrolliert, mobile Kopfkorrektur bestätigt. Alle Testgrößen zurückgestellt. Kein physisches Android-/iOS-Testat.

## Ladezeit: konkreter Übertragungsbefund

Der Engpass ist **noch nicht vollständig erledigt**.

- Frischer Browserlauf: Modell 3630 ms, Galerieliste 2565 ms. Einzelne öffentliche Vorschaubilder vom Server aus zunächst 602–1276 ms, während eines weiteren Kundenstarts 6739–8440 ms. Diese Schwankung ist dokumentiert; keine gleichmäßige Verbesserung behaupten.
- Der neue Core brach im Kundenbrowser nach 115,8 s ab: nur 196568 komprimierte bzw. 418213 entpackte Bytes. Erwartet werden nach der bestehenden Acryl-Pfadumschreibung 1454759 Bytes. Konsolenwarnung: `Editor-Bündel nicht geladen, Einzelmodule`. Anschließend 167 Editor- und 18 Plattform-Einzelabrufe; insgesamt 201 Editor-Ressourcen in diesem Lauf. Das erklärt die extreme Wartezeit. Der funktionierende Fallback wurde nicht entfernt.
- Unabhängiger externer HTTP-Abruf desselben Core: HTTP200, gzip, 545987 übertragene Bytes, 1454759 entpackte Bytes; erster Antwortteil nach3,417 s, vollständig nach43,988 s. SHA `12c0c828986e8acf132e34ca078527b21b577c69edc96a5405d1e0b002c09af4` stimmt exakt mit dem lokal umgeschriebenen Bündel überein. Alle154 Module einschließlich fünf Einstiegsmodule vorhanden.
- **Serverseitiger HTTPS-Abruf genau derselben öffentlichen URL am19:59:58 UTC: HTTP200, 545987 gzip-Bytes, Header38 ms, vollständig51 ms.** Das grenzt den langen Transfer auf den äußeren Verbindungsweg ein. Es beweist weder einen bestimmten Internetanbieterfehler noch einen ausschließlich lokalen Browserfehler; die Messungen sind getrennte Zeitpunkte.
- Ein früherer Browserabruf von `shop-entry-page.mjs` lieferte einmal200 mit leerem Body. Serverdatei6649 Bytes korrekt; zwei unabhängige HTTP-Gegenproben korrekt, nach Neuladen vollständiger Body. Anschließend abgelaufene Testsitzung durch frischen Produkteinstieg ersetzt. Keine Codeänderung allein wegen dieses einmaligen Befunds.

Kein kaputtes Bundle, keine fehlenden Motive und keine allgemeine Servererschöpfung belegt. Proxyfristen nicht pauschal erhöhen. Der Acrylhost puffert/transformiert den Core vollständig; die innere120-s-Inaktivitätsgrenze erklärt einen schon begonnenen äußeren Teiltransfer nicht unmittelbar. Weitere Diagnose bei Wiederholung: genaue `loadingFailed`-Meldung, LiteSpeed-Zugriffs-/Fehlerlog, HTTP/2-Verbindung und äußere Übertragung vergleichen. Öffentliche gehashte Dateien lassen sich anschließend ggf. statisch/vorkomprimiert ausliefern; private APIs bleiben getrennt geschützt.

## Nächster vorbereiteter Schritt

Galerie-Lifecycle `6c310120d48daef12b16e9568916a62ecd278597`, Browserbeleg `59e02af2f877774c660cfd067f1ea9881ec89477`: genau `product-design-gallery.mjs` und `ui/shop-design-switch.mjs`. Alte Galerieabrufe beim Designwechsel pausieren, neue erst nach Ready starten; Fehler/Zurück laden nur fehlende Karten weiter. Zwei parallele Abrufe, drei spekulativ vorgewärmte Karten bleiben. 24 gezielte Prüfungen und12 lokale Browserfälle mit synthetischen Antworten; unabhängiger Review ohne Blocker. **Noch nicht veröffentlicht und noch nicht in diesen Integrationsbranch übernommen.**

Eigenes vorbereitetes Paket außerhalb Git: `outputs/r15-gallery-lifecycle-20261109/`, Installer-SHA `782fa652eb0281149bfeb12ff25b0d79dcdbbd2409193a0580112a5226a641ba`. Vor Ausführung aktuellen Live-Stand erneut prüfen; nicht den bereits ausgeführten Vierdateieninstaller wiederholen.

Danach Modulverwaltung PR223/224 getrennt prüfen. Noch keine neue produktive Profilzuordnung. Aktueller Konfi-Aufbau, Preise, Designs und Bindungen bleiben geschützt.

## Sicherungen und Belege

Sanitisierte Belege: `docs/reviews/2026-11-09-server-hit-live/`. Rohdaten, Paket und Bilder lokal unter `outputs/r15-server-hit-followup-20261109/`. Keine Tokens oder Kundendaten enthalten.

Plesk-Vollbackup1158 bleibt **ohne eindeutigen Abschlussbeleg**: Detailansicht Zugriff verweigert, Dump-Verzeichnis lesend EACCES. Nicht als fehlgeschlagen oder abgeschlossen ausgeben. Kein zweites Vollbackup starten. Die zuvor vollständig geprüfte lokale Flugkopie bleibt erhalten (288704 Dateien, 35522284154 Bytes, vollständige Lese-/SHA-Prüfung).

Rücknahme nur aus der genannten Einzelpaketsicherung: vier Quellen und vorheriges HTML mit Hashabgleich wiederherstellen, danach gezielter Appneustart. Historische Bündel bleiben vorhanden; keine Datenbank oder Shopify-Daten zurückspielen.
