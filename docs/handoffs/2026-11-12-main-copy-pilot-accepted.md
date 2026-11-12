# Hauptupdate-Kopienpilot bestanden; Programmstand f85390b live

12.11.2026, Codex/Astra. Dieser Nachtrag dokumentiert tatsächliche Operatorergebnisse und Nutzerantworten; keine zusätzliche App- oder Produktänderung durch Codex.

## Tatsächlicher Kopienpilot

[Claude meldet alle elf Bedingungen bestanden](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6818540526). Die vorher unabhängig geprüfte Testhülle `uo-pilot.mjs` bei `3e5bdf48`, SHA256 `5d271313d7ae5a5bdbb6be2993e86a0637f9e70e749a35a510bcbd99b544a136`, lief auf drei neuen R1-Kopien. Tatsächliche v7-Datei: `65d706e1a99cc599ba7a1c577de028208a5efd356f97bd997f68be3f899cde29`; tatsächlicher Review: `8e8814cabbddb0354e0af029e1bdb09f0a668f69af03dd056792a99c6b7d517d`. Synthetischer Testentscheid nur im Speicher, keine Nutzerzustimmung oder produktive approval.json.

| Fall | Berichtetes tatsächliches Ergebnis |
|---|---|
| A: Update | Revision1→2, draft, genau1 neue Revision und1 Journaleintrag; Produkte1078 unverändert, Revisionen4406→4407, Journal4285→4286, Bindungsköpfe16680 und Bindungsrevisionen33059 unverändert;19,5s |
| A: Wiederholung | replayed=true, neueRevisionen0, alle Zählungen unverändert;16,1s |
| B: andere Excelbytes | exakt excel_changed, Daten unverändert |
| B: fremder Kopf2 | exakt head_changed, keine weitere Revision und kein Importjournal dieses Updates |
| C: Profiländerung im Insert-Hook | exakt invalid_snapshot_metadata / snapshot_metadata_changed, Trigger genau einmal; Kopf wieder1, Journalnull, Workshop-Zählungen unverändert |
| Sicherungen | alle drei Quell-Sicherungsdateien nachher bytehashgleich zum Manifest |

C prüft den wirklichen Insert-Hook innerhalb der nativen Transaktion nach der vorläufigen Kopfänderung. Die Nachprüfung belegt logische Workshop-Rücknahme anhand Kopf, Journal und Zählungen. Eine Byte-SHA-Prüfung der C-Arbeitsdatei enthält der Pilot nicht; keine solche Behauptung übernehmen. Die separat veränderten Profilsettings sind nicht Bestandteil des Workshoprollbacks. Die Original-Sicherungsdateien werden dagegen tatsächlich gehasht. Der kleine private Rohbeleg und vollständige Receipthashes wurden zur Archivierung angefordert, nicht als neuer Test oder Umschaltblocker.

Alle elf Werte passen zum bytegeprüften Programm der Testhülle. [Unabhängiger Ergebnisreview](../reviews/2026-11-12-main-native-observation/main-copy-pilot-result-review.md). Dies ist keine produktive Produktänderung und keine pauschale Produktionsfreigabe. Der unverändert fehlende cmp-Registerpin betrifft die separate Gruppenplanung; der direkte Hauptupdatepfad mit vollständigem eingebettetem Modul-Snapshot hat diesen Kopientest bestanden.

## Neue Nutzerantwort zur Programmumschaltung

Auf die konkrete Frage zur erneuten Aktivierung des heute dreimal geprüften Programmstandes, Sicherung, Neustart, echter Shopprüfung und Rückweg antwortete der Nutzer neu: **„Ja, erneut umschalten und prüfen“**. Anschließend verlangte er **„schreib ihm direkt“** und danach **„Versuch es nochmal im Browser und schreib Claude direkt. Meine Freigabe zur erneuten Umschaltung hast du. Bitte mach den Rest mit ihm fertig.“**

[Wörtliche neue Antwort und vollständige Frage in #168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6817935040). Die zunächst fehlgeschlagene Browserübermittlung wurde im nächsten Auftrag erfolgreich wiederholt; die Nachricht wurde sichtbar im bestehenden Claude-Chat abgesendet. Claude hat die neue Antwort als Grundlage seines [angekündigten Umschaltfensters](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6818552737) übernommen. Kein erneutes Ja zur selben Handlung erforderlich. Diese Zustimmung umfasst ausdrücklich keine Produktanlage/-änderung oder Veröffentlichung.

## Tatsächlicher Livewechsel und Kundenprüfung

[Claude bestätigt die Umschaltung](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6818929492): am 12.11. um 09:31 genau eine Zeile in `app.cjs` von `mika-r15-resume-20261108-v1` auf `kandidat-f85390b-20261112` geändert, anschließend Plesk-Neustart. Runtime `f85390b` läuft seit 09:32. `app.cjs` danach: 1.720 Byte, SHA256 `d372c2f8830a0605efd4baedf41b910c38d8709c68dc802dd6313c10220bf5c2`. Vorherige Datei gesichert als `claude-paket1a-20261110/app.cjs.bak-20261112T083141Z-vor-kandidat-f85390b-20261112`; frische Acryl-Sicherung `20261112T082349Z` und Legacy-Sicherung `20261112T082744Z`. Rückweg auf den vorherigen Laufzeitordner plus Neustart bleibt vorhanden. Keine Produktänderung, Veröffentlichung oder Systemeinstellungsänderung in diesem Fenster.

Der [tatsächliche Kundenbefund](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6818929895) belegt:

- Bleibender Host PID 560356 seit 09:32:22; 245.830 Galeriekarten kalt aufgebaut und gespeichert. Beobachtete Kontospitze 2,56 G, danach 1,11 G; Host-RSS 754 MiB um 09:38 und 496 MiB um 09:40 bei gemeldeter 12G-Kontogrenze.
- Echter signierter Shopify-Proxy: Edelstahlmodell 200, 21 Designs, Suche `herz` mit 2 Treffern; Legacy-Schieferprodukt 16138083107196/Variante 57509812633980 mit Modell 200 und tatsächlichem Konfi-Einstieg. Hauptacryl-DRAFT mit Modell 200 und 1 Karte.
- Reale Edelstahl-Produktseite in der Theme-Vorschau „Produktseite 2027 – Kopie 10.11.“: Produktknopf öffnet iframe mit geladenen Assets; 12×8 cm/19,99 €, Designwechsel und dieselbe Sitzung nach mehr als 60 s mit 9×6 cm/14,99 € erfolgreich. Einzelne und parallele Modellabrufe blieben 200. Legacy-Vorschau mit Designs und 22,99 € geöffnet.
- 390px-iframe mit mobiler Anordnung und Preisfußzeile geprüft. Dies war eine Breitenprüfung im Desktopbrowser, kein echtes Touch-Handy.

Direkt nach dem Neustart gab es zunächst PID 560321 mit `shop_gallery_warm_failed`/`ERR_INVALID_STATE`, sechs Sekunden später den bleibenden Prozess. Kein Stacktrace oder Speicherabbruch gemeldet. Claudes Erklärung eines geordneten LiteSpeed-Prozessendes ist ausdrücklich **nicht bewiesen**. Das historische Auftreten ähnlicher Logzeilen und der danach stabile Prozess sind dokumentiert; daraus wird weder eine neue Fehlerursache noch ein spekulativer Fix abgeleitet.

## Sichtbeleg und noch offene Teilprüfungen

Root hat im Claude-Chat das vom Operator angebotene Bild `konfi-pc-nach-umschaltung.jpg` geöffnet und visuell gelesen: Edelstahl „Familie Pielstädt“, 120×80 mm, weicher dunkelgrauer diffuser Schatten rechts/unten, keine zweite harte Kontur. Das ist **[Roots Sichtprüfung des Operator-Screenshots](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6819192410)**, keine eigene erneute Konfi-Bedienung und keine Acrylabnahme. Die lokale UI-Aufnahme liegt außerhalb des Repositories unter `outputs/Claude-Abstimmung-230/2026-11-12-stahlschatten-shop-sichtbeleg.jpg`; das Originalbild wurde nicht separat heruntergeladen.

Die [konkrete Nachforderung](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6818980840) bleibt für folgende Punkte offen:

- Hauptacryl-Variante 58104626479484, Position 331, über den echten Produktknopf/iframe mit 12×8-Schwarz-K00-Vorauswahl. Das erfolgreiche Hauptmodell allein belegt den früheren 250-Varianten-Themefehler nicht. Nur vorhandene Händlervorschau, keine Veröffentlichung dafür.
- Sichtbarer weicher **Acryl**schatten ohne zweite harte Kontur.
- Werkstatt-Designliste und tatsächliche Katalogworker-Arbeit. Bisher sind der eingebettete Werkstatt-iframe und keine neue `merchant_session_rejected`-Zeile berichtet, kein Workerlastnachweis. Die genaue Quelle der vom Operator genannten Screenshot-Ablehnung wurde angefragt. Soweit erlaubt, genügt eine normale lesende Bedien-/Textprüfung; keine Schutzumgehung und keine automatisch neu an den Nutzer übertragene Pflicht.

Warenkorb, Bestellung, Entwurf und Webhook wurden nicht ausgelöst. Echtes Touch-Handy bleibt ungetestet. Die Live-Datenbank behält laut Operator die vorhandene achtspaltige `motif_search_daily`. Der Laufzeitwechsel ist damit tatsächlich erfolgt; die genannten einzelnen Funktionsnachweise sind noch offen.

Die sechs neuen Kleinproduktgruppen werden getrennt vorbereitet. Der inzwischen eingegangene [Operatorbericht](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6819186960) meldet auf einer neuen Zielkopie sechs gültige gespeicherte Pläne mit 10/10/10/5/5/5 Varianten, insgesamt 45, unveränderten v9-Preisen und ausschließlich kopieneigenen Quellen-/Vorlagen-/Profilkennungen. `confirm:0`, `execute:0`, Shopify-Schreibzugriffe0; die sechs angelegten Quellprodukte und Profile existieren nur auf dieser Arbeitskopie. Die tatsächlichen Plan-/Quell-/Profildateien wurden [zur unabhängigen Prüfung und Aktenbindung angefordert](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6819192410); deren Prüfung wird hier noch nicht behauptet. [Vorhandener API-/Pinablauf](../reviews/2026-11-12-main-v7-copy-review/six-new-groups-copy-plan-prerequisites.md).

Die konkrete Produktausführung wird aus den tatsächlich geprüften Unterlagen gesondert vorgelegt, ohne bereits entschiedene Preise/Steuer/Designs/Uploads oder Altartikelwahl erneut zu fragen. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); keine Designänderung.
