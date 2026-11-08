# Wiederaufnahme: aktuelle R15-Module und begrenztes Design-Vorladen

Stand: 09.11.2026, Codex/Mika. Eigener Branch `dev/mika-r15-resume-integration-20261108`, Draft PR222. **Runtime am 09.11.2026 um 00:17 Berlin veröffentlicht, Plesk anschließend neu gestartet.** Keine neue Produktprofilzuweisung, kein Main-Merge, kein Theme-/Shopify-Produkt-Schreibzugriff. Die bestehende Kundenanbindung verwendet weiterhin ihre bisherigen Datenverzeichnisse und Bindungen.

## Verbindlicher Ausgangspunkt

- Freigegebener Kundenaufbau aus `e9c36ce12d38fcb36bcb4b4c57add458d1859af7`, dokumentierte Basis `c7710dec6f2c4f6d0b36073ad2dc623fd5d5ac05`.
- Gestapelte Module aus PR220, `957306a26ea53f1df19c9f49786feb30fe1f5b1e`.
- Cache aus PR221: `6686e86` und `552347034b75866b13c1d57af2980ae6c7e0c709`. Übernahmen hier `e381a5c0` und `f4c370fcc6bfdd388f63f14ea339046ea1103aca`.
- Ein fachlicher Konflikt in `shop-design-gallery.mjs`: optionales vorbereitetes `cardModel` UND bestehende Prüfung `moduleEnabled(...,'designs')` erhalten. `shop-entry.mjs` automatisch vereinigt und anschließend geprüft. Beide bisherigen STATUS-Einträge erhalten.
- Designquellen, Preise, Formen, Lochgeometrie und Produktbindungen bleiben erhalten. Design-Master: https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md . Keine neuen Produktoptionen erfunden.

## Gesicherter Stand

Die lokale Flugkopie wurde am 08.11.2026 um 23:35 Berlin vollständig gelesen: 288.704 Dateien, 35.522.284.154 Bytes, keine Lesefehler. 288.695 aktuelle Quellen sind identisch. Die neun Unterschiede sind ausschließlich Dateien der inzwischen fortgesetzten Cachearbeit. Private Prüfliste und Abschlussbeleg liegen im bestehenden Sicherungsordner `lie-flight-backup-20261108-1750/`; keine privaten Datenbanken oder Zugangsdaten in GitHub.

Manifest-SHA-256: `2ff4cb16764fe20175c9ff1ecc04efa7f922870f803c899d0d2c5ad5c1f4dcc9`. Der Beleg heißt `snapshot-verification-receipt.json`; der alte angekündigte Beleg `backup-receipt.json` wurde nicht erzeugt. Snapshot selbst nicht verändert. Code-Gitbundle aus der Flugpause bleibt gültig; Katalog-Historybundle und ZIP-Zwischenversuche bleiben ausdrücklich unvollständig.

**Plesk-Auftrag 1158 weiterhin offen:** direkte Auftragsansicht meldet fehlenden Zugriff; Server-Backupmanager zeigt reguläre nächtliche Serverbackups, jedoch keinen eindeutigen Abschluss dieses Abonnementauftrags. Das ist weder Erfolgs- noch Fehlernachweis. Kein zweites Vollbackup gestartet. Die einmalige Wiederanlauf-Automation wurde nach dem tatsächlichen Wiederanlauf gelöscht.

## Lokale Integrationsprüfung

- Kombinierter Lauf: 105 erfolgreiche Tests, kein Fehler; ein zusätzlicher Realbanktest war mangels gesetzter Dateivariablen zunächst übersprungen. Ausschließlich diesen Test mit korrektem lokalen Quellpfad nachgeholt: 1/1 bestanden. Insgesamt **106 unterschiedliche Fälle bestanden**, kein verbleibender Skip.
- Geprüft: Cache, echte HTTP-Einstiegswege, Warmmanifest, Hostkonfiguration, Galerie, Modulruntime und reale r4-Bank. Keine Browser-/Liveabnahme daraus abgeleitet.
- Reale r4-Quelle: SHA-256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`, 251 Originale, acht Formen, 80 Größen und 404 Kombinationen. Beide Logo-Profile erhalten alle Originale/Preise. Quelle unverändert.
- Genau drei Originalvorschauen erzeugt (140.037 / 139.106 / 139.156 Bytes), lokal ca. 2,16 s Vorbereitung, 0,14 s URL-Ermittlung, 0,45 s drei geprüfte Dateilesungen. Dies sind lokale Testzeiten, keine Handy-/Serverzusage.
- Paket enthält **18 Produktionsdateien**, vier davon neu. 68 geschützte Quelldateien einschließlich Zentrierung, Touch, SVG-Worker und aller Git-CSS-Dateien bytegleich zur Basis. Kein Ersatz von Designs oder sonstigen Bildressourcen.
- Der erste lokale Build `editor-a04598dac378d8b2.mjs` wurde nicht veröffentlicht: Die frische Serverprüfung fand zwei weitere vorhandene Korrekturen. Diese sind erhalten, siehe nächster Abschnitt. Alle 36 aktiven Styles blieben bytegleich.

## Tatsächlich veröffentlichter Stand und Rücknahme

- Neue Runtime: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-r15-resume-20261108-v1`.
- Vorherige Runtime bleibt vollständig unter `private/mika-r15-final-feedback-20261108-v1` erhalten.
- Aktiver Wrapper `gravuru-2027-merchant/app.cjs`: SHA-256 `e679ca2dd1285c7925126bec3ef67bf1b775e080f6306e3210a996874b90d53c`.
- Gesicherter vorheriger Wrapper unter `mika-r15-resume-20261108-v1/pre-switch-backup/customer-app.cjs`: SHA-256 `8127113f65285489b5dfcde46dc9462159703cf43f6e6c5081f01a6a776e4dcf`.
- Rücknahme nur nach frischer Wrapperprüfung durch Wiederherstellen dieses Startverweises und App-Neustart. **Keine Datenbank zurückspielen**, da inzwischen Bestellungen entstehen können. Nach späteren Profilzuweisungen ist zusätzlich die Modulkompatibilität zu beachten.
- Ergänzend erhaltene aktive Quellen: `app/configurator/variant-m/option-media.mjs` (7.943 Bytes, SHA-256 `48821e6157517ef403e7edb6932da8eca3692705f82f7ddeca473404e4b58db0`) und `family-formats.mjs` (15.710 Bytes, SHA-256 `183d00d611042e2c2d9f6097787859656388adcc6ef92ae52c3c6498e4deb210`). Sie erhalten vorhandene Befestigungsbilder sowie zusammengehörige Texte beim Formwechsel. Nicht durch ältere Gitbasis ersetzen.
- Mit diesen Quellen exakt nachgebaut: `.preview/bundle/editor-70b3f27030bbc2db.mjs`, 1.449.563 Bytes / gzip 483.560, SHA-256 `8303578ed51aef266c9ace003d83340236111c1fbe737f75fa86bc2d1a2e0745`.
- Gebautes HTML: 373.304 Bytes, SHA-256 `14574d69939f210a4b6d8f5b3241c72610dc739ee843cf456102c133cd6aa2b9`.
- 154 Module, 16 Styles, 30 nachladbare Schriften, 703 nachladbare Motive; 76 Bundleverweise geprüft. 1.050 übrige Appdateien und 369 weitere Codedateien gegenüber der frisch erfassten alten Runtime unverändert.
- Ableitungsspeicher `private/mika-public-original-previews-20261109-v1`, Berechtigung 0700, bestehender App-Benutzer. Nur drei Originalvorschauen für Produkt `16190784438652` / Variante `58104606556540`; keine Kundengestaltungen. Die drei optionalen Startvariablen stehen im Aktivierungsbeleg. Bestehende Auftrags-/Daten-/Katalogpfade wurden nicht geändert.
- Lokale Belege: `server-prepared-receipt.json` und `server-activated-receipt.json` unter `outputs/r15-resume-integration-20261108/`. Der Aktivierungsbeleg entstand vor dem nachfolgenden Plesk-Neustart; dessen Feld `restartPending` ist deshalb historisch, kein aktueller Zustand.

## Paket und Nachweise

Lokale Nachweise unter `outputs/r15-resume-integration-20261108/`:

- `integration-tests.log` und `real-module-bank.log`.
- `package/patch-manifest.json`: alle Vorher-/Nachher-SHAs, Schutzliste und aktive Styles.
- `package/verify.mjs`: ausschließlich lesende Prüfung mit `--package`, `--before <runtime>` oder `--after <runtime>`.
- `r15-resume-patch.tar.gz`: 173.709 Bytes, SHA-256 `4295a29906bce6d50bff59a5cc670450fe54bf02f89e80c9c9c2688c48d83029`.
- Manifest-SHA-256: `e449251b046def0eead402ec6413cdbef813ea857c371c83cf5ba192267680d7`.
- Reproduzierbarer Quellpaket-/Buildhelfer: `scripts/package-r15-resume.mjs`. Er schreibt nur lokale Ausgaben, nie Server, Shopify oder Produktdaten.

## Liveprüfung und noch offener Leistungsnachweis

Die tatsächliche veröffentlichte Shopify-Produktseite wurde nach Verlassen der Theme-Prüfvorschau geöffnet. Produktstart, R15-Einbettung, bestehende Werkzeuge und Startpreis 19,99 EUR sichtbar. Nachweis: `live-desktop-acceptance.jpg`. Der Start liefert die korrekten Produkt-/Varianten-IDs; die Antwort ist frisch und nicht zwischengespeichert.

Erste Messung vor der unten beschriebenen Korrektur: Startschrift Michroma und Katalog mit 0 übertragenen Bytes aus dem Browsercache (ca. 5 ms). Drei Originalbilder waren korrekt signiert vorbereitet, fehlten aber im Warmmanifest; direkter Bildabruf ergab 404. Der bisherige private Vorschauweg blieb erreichbar. Gemessene private Vorschauabrufe lagen bei ca. 2,8–4,7 s; der Modellabruf bei 3,6 s. Diese Messung belegt keine vollständige Ladezeitoptimierung.

Ursache isoliert: `public-design-previews.current()` übergab beim Abrufen eine vollständige Bindung an den Resolver. Die echte Registry akzeptiert genau die beiden Shopify-IDs. Die Vorbereitung mit genau zwei IDs funktionierte, spätere Abrufe wurden als ungültige Identität zurückgewiesen. Die Cache-Dateien selbst wurden mit der bestehenden Serverkonfiguration erfolgreich validiert.

**Behoben und tatsächlich live geprüft:** Einzeiler aus `126574a4`, hier übernommen als `b3e188f5`; 11/11 gezielte Service-Tests im integrierten Baum grün. Unabhängig mit nativem Werkstatt-Modell, realem Slimmer, echter r4-Bank und striktem Zweifelder-Resolver reproduziert: vorher prepare3/warm0/GET404, nachher drei URLs, GET/HEAD200, identische Dateien nach echtem Prozessneustart, kein Rendering beim Kundenstart. [Unabhängiger Review](https://github.com/Chris83638w/gravuru-2027/blob/review/mika-public-preview-start-20261109/docs/handoffs/2026-11-09-public-preview-native-start-review.md), Commit `bf46b342`.

Einzeldatei am 09.11.2026 um 00:34:35 Berlin mit Vorher-SHA und Wrapper-Prüfung gesichert/ersetzt, anschließend App-Neustart. `public-design-previews.mjs`: vorher `9706125dd4c008618330fec7213ee386dca58fc3c7e458446c6385b45c9fbc9e`, nachher `58151ce11021a41592492a3ea62f303074826b810f32db7e69e41d0b8df9b6cf`. Rückweg unter `pre-switch-backup/public-design-previews.before-identity-fix.mjs`; Beleg `server-preview-identity-fix-receipt.json`. Bundle und Rendererfingerprint unverändert, bestehende drei Cachedateien ohne Neuberechnung wiederverwendet.

Danach tatsächliche Shopify-Produktseite neu geladen, Warmmanifest mit einer Startschrift, sechs Motiven und drei Vorschau-URLs geprüft, erst anschließend Konfi geöffnet. Browsermessung im echten eingebetteten Konfi:

| Ressource | Abrufdauer | Übertragene Bytes |
| --- | ---: | ---: |
| Startdesign (140.037 Bytes Inhalt) | 4,7 ms | 0 |
| Erste drei Galerievorschauen | 14,8 / 45,1 / 7,0 ms | jeweils 0 |
| Startschrift Michroma | 9,7 ms | 0 |
| Sechs Startmotive | 3,2–8,4 ms | jeweils 0 |
| Konfi-Bundle | 15,5 ms | 0 |

Die öffentliche Bildroute liefert HTTP200 und `public, max-age=31536000, immutable`. Sichtbare Designauswahl mit 21 verfügbaren Karten geprüft; Screenshot `live-design-cache-acceptance.jpg`. Vollbeleg `live-warm-proof.json` im lokalen Ausgabeordner, ohne Sitzungsgeheimnisse. Das ist **Desktop-Browsercache-Nachweis**, keine pauschale Zusage für jedes Handy, jede Variante oder alle Designs.

**Verbleibende Performancearbeit:** Produktmodell in diesem Lauf 3,72 s, Galerieliste 2,03 s; eine weitere nicht vorbereitete Vorschau 4,45 s. Noch nicht behaupten, der ganze Konfi starte sofort. Nachladelogik bleibt begrenzt; keine Vollbibliothek oder 404 Varianten beim Produktseitenbesuch laden. Frische Handy-/Netzprüfung und enges Profiling dieser Serverabrufe sind die nächsten Messschritte. Keine neue Live-Warenkorbabnahme in diesem Schritt.

Ergänzende Einzelmessung derselben öffentlichen Route über die aktuelle Arbeitsplatzverbindung: HEAD200 nach 1,49 s; komprimierter GET200 mit 101.773 übertragenen Bytes, erstes Byte nach 1,07 s, vollständig nach 2,36 s. Unkomprimiert 139.106 Bytes: erstes Byte 1,50 s, vollständig 6,01 s. Das trennt den sichtbaren Transferanteil von der ersten Antwort, beweist aber keine reine Serverlaufzeit. Netzwerk und serverseitiger Modellpfad sind getrennt zu untersuchen; Cachetreffer vermeiden beide Kosten.

## Module: separate Aktivierungsvorbereitung

Die zuerst beobachtete 60-s-Fristüberschreitung in PR214 ist isoliert behoben, ohne diese Frist zu erhöhen. [Draft PR223](https://github.com/Chris83638w/gravuru-2027/pull/223) enthält die enge native Batchkorrektur (`173b414a2444afe55f86fd195c8bc7b2c4539230`, Dokumentationsstand `fce83b0494e320ce3821be25edad27ab747332f5`). Fremde Trigger/TEMP-Tabellen/Indexabweichungen bleiben auf dem vollständig vergleichenden Weg.

39 unterschiedliche gezielte Tests grün, darunter drei echte vollständige Durchläufe mit 251 Designs und jeweils 404 Zuordnungen: später Fehler mit vollständiger Rücknahme (39,638 s), verlorene Antwort mit Wiedererkennung/Logo aus (38,808 s), bestätigte neue Logo-an-Revision (45,670 s). Unabhängiger Review 15/15 gezielte Tests, einschließlich vier zusätzlicher nativer Regressionen; [Nachweis](https://github.com/Chris83638w/gravuru-2027/blob/review/mika-binding-batch-20261108/docs/handoffs/2026-11-09-binding-batch-review.md).

**PR214/223 ist noch nicht produktiv aktiviert.** Nächster Schritt: vorhandenen Backend-Bedienweg für Profilwahl → konkrete Änderungsübersicht → Nutzerbestätigung prüfen und integrieren. Keine stillschweigende neue Produktzuweisung. Erst danach getrennte Liveabnahme der bestätigten Zuordnung und Warenkorbprüfung.

Eine bereits gespeicherte Profilrevision darf später nicht mit profilunkundiger alter Runtime betrieben werden. Fachliche Rücknahme erfolgt als neue bestätigte Revision; historische Bestellungen bleiben unverändert.

## Zusätzliche Browserprüfung nach wiederhergestellter Verbindung

Die lokale integrierte Runtime läuft für die Bedienprüfung auf Port 8224 mit echtem r4-Datensatz und allen 36 aktiven Styles, ausschließlich In-Memory-Datenbank und gesperrtem Shopify-Transport. Desktop: Text geändert, Vollansicht geöffnet, zentrierte Werkzeuge visuell bestätigt. Browserfenster mit 390 × 844 Pixeln: Motivauswahl geöffnet, Haus hinzugefügt, Preis von 19,99 auf 21,68 EUR; danach Element gelöscht und Preis wieder 19,99 EUR, Ebenenzahl drei auf zwei. Temporäre Fenstergrößenvorgabe anschließend zurückgesetzt. Diese Prüfung ist keine echte Touchgeräte- oder Live-Warenkorbabnahme.

Nachweise lokal: `desktop-acceptance.jpg`, `mobile-acceptance.jpg`, `server-package-proof.jpg` im Ausgabeordner. GitHub-Integration: Draft PR222. Unabhängiger Kombinationsreview 040c7e7b ist als 491b82ad übernommen; zwei zusätzliche Modul-/Cache-Regressionsfälle eingeschlossen.
