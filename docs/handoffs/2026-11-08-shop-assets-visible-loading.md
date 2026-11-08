# Produktseiten-Vorladen und sichtbare Schrift-/Motivlisten

Stand: 08.11.2026, Codex/Mika. Eigener Branch `dev/mika-shop-asset-preload-20261108`, Basis `16eda61`. Auftrag: Kundeneditor schneller öffnen und Schriften/Motive bereits nach dem Produktseiten-Laden gezielt vorbereiten. Keine Änderung an Aufbau, Motiven, Schriftenkonturen, Preisen, Kundendaten, Warenkorb oder Produktfreigaben. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt verbindlich.

## Konkrete Ursache und Umsetzung

Bislang konnte das Öffnen der Motivauswahl den kompletten Katalog mit 703 Konturen (`motive-alle.json`, 13.386.007 decodierte Bytes) laden. Der Fontdialog wartete auf sämtliche angebotenen Konturen, bevor er eine verwendbare Auswahl zeigte. Hintergrundladen auf Desktop/WLAN verwendete ebenfalls die vollständigen Bibliotheken.

Jetzt bleibt der vollständige Metadatenindex für Suche und Kategorien vorhanden. Tatsächlich sichtbare Motivkarten und Schriftproben laden über die vorhandenen Einzeldatei-Loader, höchstens zwei gleichzeitig. Noch nicht geladene Schriftproben reservieren dieselbe Kartenfläche; geladene Schriften sind sofort auswählbar. Ein langsamer/fehlgeschlagener Abruf blockiert keine andere Karte. Wechsel der Kategorie/Suche entfernt noch nicht gestartete alte Anfragen. Konturen, Fontberechtigungen, Glyphenprüfung und Export bleiben dieselben. Der explizite Alt-Loader bleibt für historische native Bedienelemente erhalten; der aktuelle Kundenbereich ruft ihn nicht automatisch auf.

Nach Laden der Shopify-Produktseite und im Leerlauf liefert die bereits vorhandene signierte Startkarte zusätzlich eine kleine öffentliche Ressourcenliste. Eine nicht interaktive, unsichtbare App-Origin-Seite lädt daraus den Kernindex, die aktive HTML-/Bundleversion, höchstens drei tatsächlich verwendete Startschriften und sechs vorhandene Motive. Keine komplette Konfi-Initialisierung, kein Modell, Entwurf, Upload oder Warenkorb wird im Hintergrund geöffnet. Zwei parallele Abrufe, niedrige Priorität, maximal 6 MiB decodiertes Lesebudget; einzelne Antworten werden zusätzlich begrenzt. Save-Data/2g, ausgeblendete Produktseite und bereits geöffneter Editor verhindern diesen optionalen Start.

Der vorhandene Shopify-Baustein lädt bereits `/apps/konfigurator/shop-embed.mjs`. **Kein Theme-Umbau und kein Shopify-Schreibzugriff nötig.** Diese Umsetzung verwendet nur den etablierten Acryl-/Universal-Editorpfad `/_merchant-acryl-editor.html` mit `/konfigurator/shop/`; abweichende alte Editorpfade erhalten keinen spekulativen Zusatz.

## Gemessener Zustand vor Änderung

Öffentliche HTTPS-Abrufe von diesem Arbeitsplatz, keine Handy-/Lighthouse-Zahlen. Die Datenmengen sind ausdrücklich decodierte Antwortgrößen, soweit nicht separat als Content-Length bezeichnet.

| Ressource | Decodiert | Gemessene Zeit | Cache / Transferhinweis |
|---|---:|---:|---|
| Kernindex (30 Katalogschriften, 703 Motive) | 166.290 B | 697 ms | 1 h; Brotli Content-Length 44.542 B |
| Alle Motivkonturen | 13.386.007 B | 427 ms erste Antwort / 3.951 ms komplett | 1 h; Brotli, keine Content-Length im GET |
| Einzelmotiv Herz | 26.139 B | 108 / 109 ms | 1 h; Brotli Content-Length 10.558 B |
| Katalogschrift Allura | 770.311 B | 572 ms | 1 h; Brotli Content-Length 213.024 B |
| Editor-HTML | 373.915 B | 597 ms | private 5 min; Brotli Content-Length 100.462 B |
| Aktives Bundle `22ba7897da3f65ac` | 1.432.902 B | 203 / 462 ms | 1 Jahr immutable; Brotli |
| Shop-Einstieg | 2.257 B | 117 ms | private no-store |

Der Produktseiten-HTML-Abruf enthielt 1.414.062 decodierte Bytes und bestätigte den bestehenden Personalisieren-Link sowie den gemeinsamen Embed-Loader. Keine Cache-/CORS-Freigaben wurden verändert. Die öffentlichen Ressourcen hatten keinen Access-Control-Allow-Origin-Header. Deshalb nutzt das Warmup einen kleinen App-Origin-Frame innerhalb der Shopify-Seite: der spätere eingebettete Editor befindet sich in derselben Cache-Partition. Ein direkt als oberste Seite geöffneter Apphost kann eine andere Browser-Cache-Partition haben; Safari/Edge/Chrome benötigen weiterhin echte Browserabnahme. Vorladen spart keine erste Datenübertragung und garantiert keine feste Startzeit.

## Echter Stahl-Datensatz, unverändert

Lokaler, zuvor vom Server gesicherter r4-Stand: SHA-256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`, 11.906.263 Bytes, 251 Originaldesigns und 80 Größen. Die bestehende Startprojektion und Font-Auslagerung erzeugten eine **484-Byte-Ressourcenliste**: exakte native Startschrift Michroma (205.976 decodierte Bytes) plus sechs vorhandene Motive (zusammen 72.017 Bytes). Ableitung lokal 87,96 ms. Vorher-/Nachhervergleich des gesamten Quelldokuments identisch. Keine neue Designprojektion, keine neuen Preisregeln. Dateien/Belege lokal unter `outputs/shop-asset-preload-20261108/`.

## Tests und Build

- 38/38 vollständige Lazy-Loader-/Build-/Server- und Shop-Client-Tests grün. Enthält eigene native Font-Hashes, Draftressourcen vor Wiederherstellung, Fehler/Retry, Origin-/Sessiongrenzen und Warenkorb-/Produktseiteneinbettung. Zwei vorher veraltete Session-Testfixtures an die bereits aktive Upload-Wiederherstellung angeglichen; dieser Produktionspfad blieb unverändert.
- 43/43 im vorherigen gezielten Warmup-/Queue-/UI-Regressionstestlauf grün. Zusätzliche Queue-Negativtests im späteren Lauf grün: keine Endlosschleife bei fehlendem Index, versteckte/offscreen Karten, neue Suchergebnisse, Callback mit korrektem Window-Kontext. Die Sets überschneiden sich; Zahlen nicht addieren.
- 4/4 gezielte echte Shop-HTTP-Tests grün: neue Warmseite, vorhandene Startkarte, minimales Manifest, kompletter Modulgraph. POST/Query/cross-site Script abgewiesen; Warenkorb-Bearbeiten bekommt kein Warmup-Manifest.
- Build: 76 Ressourcen geprüft, 30 Katalogschriften, 703 Motive, 152 Module/16 Styles. Lokales Bundle `editor-7a02612da71b732b.mjs`, 1.433.312 Bytes / 479.188 gzip. Diese lokale Builddatei ist kein Livepaket.
- **Browser-/Handy-Abnahme und Liveveröffentlichung offen; Root übernimmt.** Noch keine Aussage über realen Handy-Startzeitgewinn oder Safari-Cachetreffer.

## Enge Übernahme, Sicherung und Rücknahme

Nur diese acht Produktionsdateien übernehmen:

1. `app/configurator/variant-m/background-loading.mjs`
2. `app/configurator/variant-m/lazy-resources.mjs`
3. `app/configurator/variant-m/ux.mjs`
4. `app/configurator/variant-m/visible-resource-loader.mjs` (neu)
5. `app/workshop/shop-entry.mjs`
6. `app/workshop/shop-warm-manifest.mjs` (neu)
7. `app/workshop/ui/shop-embed.mjs`
8. `app/workshop/ui/shop-warm.mjs` (neu)

Vorherdateien aus Basis 16eda61 und SHA-256-Manifest liegen im lokalen Paket. Vor Übernahme aktuelle Serverhashes vergleichen. Der inzwischen getrennt veröffentlichte Touch-/Vorschauhotfix ändert `demo.mjs`, `preview-action.mjs` und `view-zoom.mjs`: diese Dateien hier **nicht** ersetzen. Aktive `demo.css`, Wrapper, andere Shopfixes und aktuelle Kundenprofil-Gates erhalten. Modulpatch und dieser Patch berühren beide `ux.mjs`/`shop-entry.mjs`; dort die engen Deltas zusammenführen, keine komplette Runtime kopieren.

Im tatsächlichen bestehenden Runtimebaum einmal mit `node app/configurator/variant-m/build.mjs` neu bauen. Dadurch entsteht der neue inhaltsadressierte Bundlepfad aus den tatsächlich aktuellen Quellen einschließlich Hotfix. Bestehende Server-/Shop-Einstiegsdateien und eventuelle fest verdrahtete Runtime-Wrapper nur nach deren bekanntem Deploymentverfahren kontrolliert neu laden. Kein Wildcard-Cachelöschen, kein lokales Bundle über den Serverbuild kopieren.

Zur Rücknahme die fünf gesicherten vorhandenen Quellen wiederherstellen und im gleichen aktuellen Runtimebaum neu bauen/restarten. Die drei neuen, dann unreferenzierten Dateien können liegen bleiben. Keine Datenbank, Medien, Shopify-Produkte, Entwürfe oder Bestellungen anfassen.

## Quellen und nächste Abnahme

[Shopify Theme Performance](https://shopify.dev/docs/storefronts/themes/best-practices/performance) und [Preload sparsam verwenden](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-preload-resource-hints-sparingly) begründen die begrenzte Nachladefolge. [Chrome Cache-Partitionierung](https://developer.chrome.com/blog/http-cache-partitioning) und [MDN Speculative Loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading) erklären die Origin-/Einbettungsgrenzen. Die konkrete Partition-Wiederverwendung ist eine Umsetzungserwartung, kein bereits gemessener Browserbeweis.

Nächste Abnahme durch Root: Produktseite normal laden, begrenzte Warmabrufe prüfen; Editor öffnen; Fontdialog sofort mit echten bereits geladenen Proben, später sichtbare Proben nachladen; Motive suchen/Kategorie wechseln/weiterscrollen ohne `motive-alle.json`; Element platzieren und Warenkorb einschließlich SVG-Logo unverändert prüfen. Mobile/Desktop und bewusst langsame Verbindung; Netzwerkfehler/erneutes Öffnen; anschließend getrennte Freigabe/Veröffentlichung.
