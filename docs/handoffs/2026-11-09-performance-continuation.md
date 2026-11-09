# Kunden-Ladezeit: veröffentlicht, Restengpässe noch offen

Stand 09.11.2026, Codex/Mika. Integrationszweig `dev/mika-r15-resume-integration-20261108`, PR222, veröffentlichte Basis `4afd1a2b27e43efba2e1bd4f03119ff52b9e0bc6`. **Elf Produktionsdateien wurden um 10:54:11 UTC / 11:54 Berlin gesichert veröffentlicht; anschließend wurde die App in Plesk neu gestartet.** Der echte Kundenkonfi startet, das R15-Paket wird verwendet und der mobile Kopf ist korrekt. Die Gesamtladezeit ist noch nicht abgenommen: Modell-/Galerieantworten und Designwechsel bleiben langsam. Details und Grenzen unten.

## Auftrag und Grenze

Kunden-Ladezeit verbessern, vorhandene freigegebene Bedienung, Preise, Originaldesigns und Produktbindungen erhalten. Einzige neue sichtbare Änderung: im mobilen Kopf das Gravuru-Logo ausblenden und den vorhandenen Button „Zurück zum Produkt“ verbreitern. Desktop bleibt dadurch unverändert. Keine neuen Produktoptionen, kein Shopify-Theme-/Produkt-Schreibzugriff und keine Modulprofilzuweisung.

## Zusammengeführte Änderungen

1. `84bdfb92` / Agent `a143acbc`: fünf Serverdateien. Geprüfte Produktrevisionen werden innerhalb einer synchronen Anfragephase wiederverwendet. Keine anfrageübergreifende Cachefreigabe; Bindung, Preisstand, Rechte und Änderungen bleiben frisch geprüft. 96/96 Tests plus sechs unabhängige Gegenproben. Lokaler nativer Modellabruf 617–643 ms gegenüber 1.180–1.239 ms. [Details](2026-11-09-customer-read-snapshot.md).
2. `323d5f1c` / Agent `8071f696`: zehn mobile CSS-Zeilen. Logo/Identitätsblock ausblenden, vorhandenen Rückbutton verbreitern. Sichtprüfung bei 390 px und gemessene Breiten 320/360/430 px: alle sechs Kopfaktionen erreichbar, keine horizontalen Überläufe. Desktop weiterhin mit bisherigem Kopf. Keine Änderung an Bedienfunktionen.
3. `83f83a08` / Agent `e4ead10d`: drei Clientdateien. Beim Optionswechsel alte Vorschauabrufe abbrechen, Warteschlange leeren und beide Ladeplätze sofort für die neue Auswahl freigeben. Verspätete alte Antworten verändern keine neuen Karten. 42/42 Tests und zwei enge unabhängige Diffprüfungen ohne Befund. Ein bereits laufender synchroner Serverrender lässt sich hierdurch nicht rückwirkend abbrechen. [Details](2026-11-09-design-preview-abort.md).
4. `e8dbc446` / Agent `5a34fa23`: zwei Dateien. R15-Präsentation als eigenes Paket mit 15 zusätzlichen Modulen, 134.324 Bytes / 38.138 Bytes gzip. 15 bereits vorhandene Abhängigkeiten verwenden dieselben Kerninstanzen. Produktseiten-Warmup lädt ausschließlich Kern plus markiertes R15-Paket innerhalb des bestehenden 6-MB-Limits mit zwei parallelen Abrufen. Keine pauschale Vorladung aller Größen oder Motive. 30 unterschiedliche gezielte Tests plus unabhängiger Graph-/Pfadreview. [Details](2026-11-09-r15-demo-bundle.md).

Insgesamt elf Produktionsdateien. Die Kopfkorrektur und die drei Performancekorrekturen sind getrennt nachvollziehbar. Der einzige Zusammenführungskonflikt lag in `STATUS.md`; alle Einträge sind erhalten.

## Gemeinsame Prüfung

Zusätzlicher integrierter Lauf: **23/23 bestanden, kein Skip**:

`node --test app/configurator/variant-m/bundle.test.mjs app/configurator/variant-m/first-panel-preload.test.mjs app/workshop/shop-warm.test.mjs`

Lokaler nativer HTTP-Host unter `http://127.0.0.1:8230/steel`, echte unveränderte r4-Quelle (251 Originale, acht Formen, 80 Größen, 404 Kombinationen), Datenbank ausschließlich im Speicher, keine Shopify- oder Kundenspeicher-Schreibverbindung. Alle 36 tatsächlichen Live-Styles als Basis; ausschließlich die freigegebene mobile Kopfkorrektur überschreibt `demo.css`. Beide zusätzlich vorhandenen Serverkorrekturen in `option-media.mjs` und `family-formats.mjs` sind erhalten.

Sichtbarer Browserlauf Desktop/Mobil:

- R15-Oberfläche startet korrekt; kein einzelner R15-`.mjs`-Abruf mehr. Geladen werden Kern, R15-Paket, benötigter Ausführungs-Chunk und die vorhandenen CSS-/Symbolressourcen.
- Text geändert; Schrift Michroma → Allura gewählt; Auswahl schließt wie bisher.
- Motiv „Haus“ ergänzt, per emulierten Touchereignissen verschoben, Bewegung rückgängig gemacht, nach Textauswahl erneut verschoben und gelöscht. Die Motivabmessungen bleiben bei beiden Bewegungen unverändert.
- Preis 19,99 € → 21,68 € → 19,99 € nach Hinzufügen/Entfernen; keine Bestellung ausgelöst.
- Zurücksetzen öffnet die bestehende Bestätigung und stellt nach Bestätigung die Originalvorlage wieder her.

Das ist eine Browserprüfung mit mobiler Größe und Touchereignissen, **kein physisches Android-/iOS-Gerätetestat**. Der lokale Host bildet keinen authentifizierten Live-Galerieabruf und keinen Shopify-Warenkorb ab; diese Anschlussfälle sind durch gezielte Tests abgesichert, ihre erneute Liveprüfung bleibt ausstehend.

Gebauter Kern: `editor-257c5700803ea894.mjs`, SHA-256 `152219814c7bc1e249979bf90108040ed9ef6a56f45ec9ca8e2e13ab7fc6758f`.
R15: `editor-bf7d088b9bdf015e.mjs`, SHA-256 `85980521d93b13147e844a0bf7986f128ff92fdd078fecead57f2494f0db513c`.

## Tatsächliche Live-Messung vor dieser Veröffentlichung

Shopify-Produktseite: https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen

Im echten Browser am 09.11.2026 um 08:31 UTC: Modellabruf 9.306 ms, Editor-HTML 1.995 ms, Galerieliste 2.385 ms, privater Vorschauabruf 4.690 ms. Gleichzeitig waren vorhandenes Kernpaket und drei vorbereitete Originalvorschauen aus dem Cache schnell. Insgesamt 46 Editorressourcen; zusätzliche ungecachete Modulabrufe kosteten teils 700–2.500 ms. Diese Zahl bezeichnet nicht ausschließlich R15-Module.

Diese Messung bestätigt das gemeldete Problem. Lokale Millisekundenwerte dürfen nicht als bereits erzielte Liveverbesserung ausgegeben werden. Das neue R15-Paket beseitigt einen konkreten Abrufpfad; Server-/Verbindungszeiten müssen nach Veröffentlichung erneut gemessen werden. Weitere Schriftproben und Motive außerhalb der begrenzten Startauswahl werden weiterhin bei Bedarf geladen.

## Sicherung und Veröffentlichung

Lokale Belege unter `outputs/r15-resume-integration-20261108/`: `customer-before-20261109.json`, `mobile-header-width-proof.json`, `mobile-header-390.png`, `combined-browser-resources.json`, `combined-browser-proof.json`, `combined-mobile-390.png`, `performance-patch-manifest.json` und `install-performance.cjs`. Gesicherte [Live-Vorhermessung](../reviews/2026-11-09-performance-continuation/customer-before-20261109.json), [Kopfbreiten](../reviews/2026-11-09-performance-continuation/mobile-header-width-proof.json), [gemeinsame Browserbelege](../reviews/2026-11-09-performance-continuation/combined-browser-proof.json) und [Ressourcenabrufe](../reviews/2026-11-09-performance-continuation/combined-browser-resources.json); Sitzungs-URLs/Token sind nicht enthalten.

Der neue kombinierte Installer ersetzt den **nicht ausgeführten** Einzelinstaller `install-read-scope.cjs`. Nicht beide nacheinander blind anwenden. Er prüft den aktiven Wrapper, alle elf Baselines, 35 unveränderte Styles, zwei fremde aktive Quellen und das bisherige Editor-HTML; zusätzlich sind drei Builderquellen und zwei bestehende Lazy-Dateien gegen Änderung geprüft. `--check` schreibt nichts. Die tatsächliche Anwendung sichert alte Quellen, Editor und Bündel, prüft Syntax und baut ausschließlich in einen getrennten Ausgabeordner. Der Build-Unterprozess darf die aktive Vorschau nicht beschreiben. Erst nach exakter Prüfung der lokal getesteten Ergebnis-Hashes werden neue JS-/gzip-Dateien atomar ergänzt und das Editor-HTML zuletzt atomar ersetzt. Alte Bündel bleiben durchgehend für bereits offene Kundenkonfiguratoren verfügbar. Bei Fehler werden bereits installierte Quellen und gegebenenfalls das Editor-HTML zurückgesetzt; alte Bündel werden gar nicht verändert. Keine Datenbank oder Shopify-Daten zurückspielen. Bestehender Beleg/abweichende Baseline stoppt eine Wiederholung.

Historische lokale Installationsprüfung am 09.11.2026 um 09:19 UTC: echter Build mit genau dem eingebetteten Unterprozess in 476 ms; HTML und beide JS-/gzip-Paare exakt passend; 15 aktive HTML-/Bündel-/Lazy-Dateien unverändert. [Prüfbeleg](../reviews/2026-11-09-performance-continuation/installer-staging-review.json). Erster Installer-SHA `eb331dba14844f5659f3260e2ddc82adae241f046d947d68c4f18f214ea46f77`. Dieser wurde später sicher zurückgerollt und durch die unten beschriebene plattformverträgliche Version ersetzt. Nicht erneut ausführen.

Aktiver Runtimepfad unverändert: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-r15-resume-20261108-v1`. Wrapper-SHA `e679ca2dd1285c7925126bec3ef67bf1b775e080f6306e3210a996874b90d53c`. Vorheriges Editor-HTML-SHA `14574d69939f210a4b6d8f5b3241c72610dc739ee843cf456102c133cd6aa2b9` ist nur der historische Rückweg, nicht das neue aktive HTML.

## Tatsächliche Veröffentlichung und Nachprüfung

- Erster Serverlauf stoppte vor Veröffentlichung des Editor-HTML: Linux und Windows erzeugten identischen JS-Inhalt, aber unterschiedliche gzip-OS-Kennbytes (Byte 9: `03` statt `0a`). Alle elf Quellen wurden zurückgesetzt; HTML und alte Bündel blieben unverändert. Der Rücksetzbeleg ist gesichert.
- Installer v2 akzeptiert die Betriebssystemkennzeichnung nur nach begrenztem Entpacken und exakter Übereinstimmung mit dem vorgegebenen JS-Inhalt. Roh-JS und HTML bleiben streng hashgeprüft. Geänderte entpackte Bytes werden weiterhin abgewiesen. Installer-SHA: `f6a7d642d8eb03ac4e86ab0ca9b8590745399b7dc45b11d25e4282d791714bdf`.
- Frische Vorprüfung 10:53:51 UTC: elf Baselines und 37 geschützte Dateien korrekt; kein Schreibzugriff. Installationsbeleg 10:54:11 UTC: elf Dateien installiert, zehn alte Bündelartefakte erhalten, keine Datenbank-/Shopify-Schreibaktion.
- Sicherung: `pre-switch-backup/performance-20261109-v2/` innerhalb der aktiven Runtime. Livebeleg: `performance-20261109-receipt.json`. App anschließend über Plesk neu gestartet. Das historische Feld `restartPending: true` im unmittelbar zuvor geschriebenen Installationsbeleg ist durch diese spätere UI-Aktion erledigt.
- Aktive Pakete: `editor-257c5700803ea894.mjs` und `editor-bf7d088b9bdf015e.mjs`. Im echten Browser 17 Editor-HTTP-Ressourcen statt zuvor 46; beide Pakete aus Cache in 13–18 ms. Keine Einzel-R15-Modulkaskade.
- Alle drei vorbereiteten öffentlichen SVG-Vorschauen liefern HTTP 200. Nach einmaligem Laden im weiteren Designwechsel aus Cache in 7–14 ms. Der servereigene HTTPS-Abruf derselben ersten SVG: Header nach 638 ms, fertig nach 645 ms, 140.037 Bytes, unveränderlicher öffentlicher Jahrescache.
- Gegenprobe im Kundenbrowser weiterhin langsam: Modell 8.623 ms, Galerieliste 3.967 ms, erste drei SVG-Abrufe 5.032/13.811/9.038 ms. Beim Designwechsel: Wechselantwort 7.298 ms, anschließendes Modell 12.204 ms und Editor-HTML 4.053 ms. Diese Werte enthalten Warte-/Übertragungszeit und sind keine reinen Server-CPU-Zeiten. HTTP/2 ist aktiv; die Messung zeigt sowohl Zeit bis zur Antwort als auch lange Übertragung. Keine pauschale Geschwindigkeitszusage.
- Live bei 390 × 844: Logo verborgen, größerer Rückbutton; Wechsel von „Zwei Zeilen, mittig“ auf „Zwei Zeilen mit Trennlinie“ abgeschlossen. Motiv ergänzt, einmal per emuliertem Touch korrekt verschoben; Breite/Höhe unverändert. Aufpreis 19,99 → 21,68 €, bestätigtes Zurücksetzen wieder 19,99 €. Keine Bestellung.
- Offener Befund: Bei Überlagerung von hinzugefügtem Haus und Text „Familie“ griff ein späterer Touchzug den Text. Kein bestandener Wiederholungstest für diesen Überlagerungsfall behaupten; separater Hit-Test-Review läuft. Kein physisches Handytestat.

Sanitisierte Livebelege werden im Reviewordner ergänzt; Sitzungsfragmente, Tokens und Kundendaten gehören nicht in GitHub. Nächster enger Schritt: redundante große Modellkopien/Hashes beim Abruf fertiger Originalvorschauen prüfen, bestehende frische Freigabe-/Bindungsprüfungen zwingend erhalten. Keine erneute Vollinstallation oder neues Vollbackup blind auslösen.

Modulverwaltung PR223/224 bleibt danach der nächste getrennte Schritt. Keine produktive Profilzuweisung vorgenommen. Plesk-Vollbackupauftrag1158 weiterhin ohne eindeutigen Abschlussbeleg; kein zweites Vollbackup gestartet. Die bereits vollständig geprüfte lokale Flugsicherung bleibt erhalten.
