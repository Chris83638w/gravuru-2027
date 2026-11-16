# Ladezeiten des Gravuru-Konfigurators

Messung am 16. November 2026 für [Issue 239](https://github.com/Chris83638w/gravuru-2027/issues/239). Geprüft wurden das große Edelstahl-Türschild, das Acryl-Türschild D8 und das Funkklingelschild WP Cardea 2 im veröffentlichten Shop. Der Server startete weiterhin `kandidat-68334981-20261113`.

Der Konfigurator braucht im Shopfenster am Desktop rund **2 bis 2,6 Sekunden**. Bei vollständig übertragenen Editor-Dateien unter dem Mobilnetzprofil dauerte allein der direkte Editorstart **7,5 bis 14,5 Sekunden**. Mit bereits gespeicherten Dateien öffnete Acryl unter demselben Netzprofil in **1,55 Sekunden**. Die Zahlen zeigen, dass vor allem der erste Download und die Reihenfolge der Abrufe zählen.

## Messwerte

Gemessen wurde bis zur Fertigmeldung der Anwendung. Dann ist das Laden-Overlay ausgeblendet und der Editor kann Eingaben annehmen. Materialbilder und Galerie-Vorschaubilder können danach noch laden. Im Shopfenster startet die Uhr beim tatsächlichen Klick auf „Jetzt personalisieren“. Beim direkten Editoraufruf startet sie mit der Navigation zum Editor. Die Mediane beruhen auf kleinen Stichproben.

| Produkt | Shopfenster am Desktop, Cacheumgehung im Test-Tab | Shopfenster bei 390 × 844, Drosselung im Shop-Tab | Direkter Editor bei 390 × 844, Kernpaket neu übertragen | Direkter Editor, Browsercache vorhanden |
|---|---|---|---|---|
| Edelstahl | 2,02–2,57 s, n=4, Median 2,17 s | 2,79 s, n=1 | 7,46 s, n=1 | 4,67 s in einem gemischten Lauf mit gecachtem Kernpaket |
| Acryl D8 | 2,28–2,38 s, n=3, Median 2,29 s | 2,69 s, n=1 | 8,14 und 14,52 s, n=2 | 1,54 und 1,55 s, n=2 |
| WP Cardea 2 | 1,92–2,40 s, n=3, Median 2,03 s | 2,71 s, n=1 | 7,58 s, n=1 | 3,30 s, n=1 |

- Edelstahl am Desktop nach Vorwärmen auf der Produktseite: 1,56–1,87 s, Median 1,82 s, n=3. Beim erneuten Öffnen desselben bereits geladenen Fensters wurde in der kontrollierten Stichprobe kein neuer Konfi-Startabruf beobachtet.
- Die drei mobilen Produktseiten lieferten das HTML nach 4,15–4,94 s vollständig aus. Das ist die Zeit bis zum Ende der HTML-Übertragung, unabhängig von der anschließenden Konfi-Zeit.
- Mobilnetzprofil: Chrome unter Windows, 390 × 844, eingestellt auf 1,6 Mbit/s Download, 0,75 Mbit/s Upload und 150 ms Latenz. Die Drosselung des eingebetteten fremden Hosts wurde im Shop-Tab nicht durchgehend bestätigt. Der separate direkte Editoraufruf mit demselben freigegebenen Produkteinstieg erfasst seine tatsächlichen Downloads unter diesem Profil. Physische Geräte, unterschiedliche Netze, Feldperzentile und ein Serverneustart stehen als weitere Abnahme aus. [Chrome-Netzwerkprofil](https://developer.chrome.com/docs/devtools/network/reference#throttle)

## Was zuerst verbessert werden kann

### P01 · Materialbild kleiner machen und im Browser behalten

WP Cardea 2 lud `gravuru-edelstahl-feine-maserung-vorschau.png` mit **1.440.952 B**, `Cache-Control: private, no-store`. Im wiederholten gedrosselten Lauf begann die Übertragung bei 6,92 s und endete bei 18,89 s. Die Bedienung war schon bei 7,58 s möglich. Die Textur betrifft damit vor allem den Zeitpunkt der vollständigen Materialvorschau und belegt parallel Bandbreite.

Eine WebP-Datei mit **97.754 B** ist bereits unter derselben öffentlichen Vorschau-Route abrufbar. PNG und WebP haben in den vorliegenden Dateien jeweils 1.536 × 1.024 Pixel. Das sind **1,34 MB bzw. 93 % weniger** für diese einzelne Datei. Bei 1,6 Mbit/s entspricht die Datenmenge rechnerisch rund 6,7 Sekunden Übertragung. Die tatsächlich gewonnene Zeit ergibt sich aus der Gegenmessung mit den übrigen parallelen Downloads.

Die WebP-Textur im Klingelschild-Renderer verwenden und öffentliches, unveränderliches Vorschaumaterial unter einer URL mit Inhaltshash im Cache speichern. Materialwirkung und Kontur am Handy und Desktop abnehmen. [Klingelschild-Renderer](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/platform/sources/app/shared/models/doorbell-material-preview.mjs#L5) · [Live-WebP](https://app-2027.gravuru-designwerkstatt.de/_acryl-runtime/images/gravuru-edelstahl-feine-maserung-vorschau.webp)

### P02 · Vor der Bedienbarkeit nur Kerncode und Ressourcen des Startdesigns laden

Das gemeinsame Kernpaket `editor-0bb2be6ce333600c.mjs` umfasst **503.031 B übertragen und 1.512.902 B entpackt**. Im gedrosselten Profil brauchte dieser einzelne Download in vier untersuchten Läufen etwa **3,4–4,5 s**. Das Paket hat bereits `public, max-age=31536000, immutable`. Im warmen Acryl-Lauf kamen für dieses Paket **0 B über das Netz**.

- **Kernpaket nach Startbedarf schneiden.** Erst Grundeditor, sichtbares Produkt und Startdesign laden. Bilder bearbeiten, Motivbibliothek und weitere Bedienelemente bei Aufruf nachladen, soweit sie für den initialen Arbeitszustand entbehrlich sind. Die bestehende Vorwärmung kann das kleinere Startpaket nach erkennbarer Nutzerabsicht laden. [Vorwärmung](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/workshop/ui/shop-embed.mjs#L274)
- **Schriften und Kernkatalog genau einmal beziehen.** In beiden Acryl-Kaltläufen wurden drei gleiche Schriftdateien einmal im äußeren Startfenster und erneut im Editor geladen. Je Wiederholung sind das zusammen rund **246 kB komprimierte Schriftdateien**. Der Kernkatalog mit rund 45 kB wurde in denselben Läufen ebenfalls zweimal übertragen. Vorwärmung und Editor sollten dieselben laufenden Abrufe oder gültigen Cache-Einträge nutzen. Das Startdesign soll nur die Schriften laden, die es tatsächlich braucht. [Startressourcen](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/workshop/ui/shop-entry-page.mjs#L19)
- **Ressourcen anderer Designs nachladen.** Vor dem ersten Klingelschild-Editor wurden 18 private Design-SVGs geladen. Im Wiederholungslauf lagen sie zwischen 1,25 und 1,90 s, danach begann das Editor-HTML. Der Code sammelt Ressourcen aller Designs und wartet auf die Abrufe. Für die erste Anzeige nur Ressourcen des gewählten Designs abwarten. Private Ressourcen weiterhin mit der bestehenden Berechtigungsprüfung liefern. [Ressourcenabruf](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/workshop/ui/shop-entry-client.mjs#L164)

### P03 · Galerie-Vorschauen und Designwechsel verkürzen

Bei Edelstahl kam die Galerieliste in einem gedrosselten Lauf **0,46 s nach Editor-Bereitschaft**. Die ersten drei Vorschauen brauchten zusammen rund **303 kB** und waren erst **rund 3,06 s nach dem Fertigsignal** vollständig geladen. Kleine Vorschauen für Karten auf dem Server erzeugen und größere Varianten bei Bedarf laden. Die vorhandene Begrenzung paralleler Vorschauabrufe ist dafür eine gute Grundlage.

Der Wechsel von „Zwei Zeilen, mittig“ auf „Zwei Zeilen, versetzt“ brauchte **3,98 s**. Browserfolge: Wechsel-API 0,84 s, Modell 1,06 s, Editor-HTML 0,74 s, danach Start der neuen Vorschau. Der Austausch baut einen neuen Editor im Hintergrund auf. Bei Designs innerhalb desselben validierten Produktstands prüfen, welche Daten und Ressourcen der bestehende Editor wiederverwenden kann. Entwurfserhalt, Fehler-Rückkehr und neue Produktzuordnungen separat abnehmen. [Galerievorschauen](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/configurator/variant-m/product-design-gallery.mjs#L59) · [Designwechsel](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/workshop/ui/shop-design-switch.mjs#L52)

### P04 · Ausreißer des Modellabrufs mit Serverphasen korrelieren

Das Acryl-Modell hatte in beiden Läufen **10,5 kB**. Die Zeit vom Absenden der Anfrage bis zum ersten Byte war einmal **0,21 s** und einmal **2,54 s**. Der langsamere Lauf hatte auch höhere Wartezeiten bei anderen Abrufen. Ein Anteil von Netzwerk, Proxy und Anwendung lässt sich aus der Browser-Stichprobe allein nicht zuordnen.

Der Modellcache ist live eingeschaltet. Die lesend ausgewerteten aggregierten Plesk-Zähler enthalten Cache-Treffer. Eine Stichproben-Zeile mit zwei zeitlich erfassten Aufrufen meldete insgesamt 33 ms für die Zuordnung und 743 ms für die öffentliche Startvorschau. Das sind Abschnittssummen ohne Zuordnung zu den einzelnen Browserläufen. Die bestehenden Messfelder um eine anonyme Korrelationskennung und Transferzeit ergänzen. Danach gezielt den Abschnitt mit den auffälligen Wartezeiten verbessern. [Server-Messfelder](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/workshop/shop-entry.mjs#L239)

Für die Abnahme nach jedem Paket dieselben drei Produkte mit neu übertragenen und vorhandenen Dateien messen. Die Zeiten bis zur Bedienbarkeit, bis zur vollständigen Materialvorschau, bis zu den ersten Galeriekarten und für den Designwechsel festhalten. Als erste Prüfwerte bieten sich ein kleinerer Startdownload und eine Textur unter 100 kB an. Preis, Gestaltung und Entwurfserhalt gehören in die Gegenprobe.

[Einzelmessungen](pruefdaten/performance-starts.csv) · [Netzwerkdaten und Cache-Zähler](pruefdaten/performance/)
