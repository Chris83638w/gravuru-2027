# Erste öffentliche Designvorschauen auf der Produktseite

Stand: 08.11.2026, lokal umgesetzt und geprüft; nicht veröffentlicht. Branch `dev/mika-public-design-previews-20261108`, Basis `ad9b24a`, Flugsicherung `6686e86`. Der nachfolgende Umsetzungscommit enthält diesen Bericht. Die aktuelle Live-Oberfläche `e9c36ce` / Dokumentation `c7710dec` wird durch dieses Paket nicht ersetzt.

## Fertiger Umfang

Der Nutzer möchte Motive, Schriften und Designkarten möglichst bereits auf der Shopify-Produktseite vorbereiten. Der bestehende begrenzte Schrift-/Motivabruf bleibt erhalten. Das optionale Paket ergänzt höchstens drei vorher erzeugte, freigegebene Originalvorschauen für genau ein serverseitig genanntes Produkt und eine Variante. Weder das Startticket noch ein öffentlicher Bildabruf rendern Bilder. Nicht vorbereitete Karten nutzen weiterhin den authentifizierten Vorschauweg.

Die erste Vorbereitung gilt ausschließlich für Produkt `16190784438652`, Variante `58104606556540`. Keine Schleife über 251 Designs oder 404 Varianten. Keine Änderung an Kundenlayout, Gestaltung, Preisen, Geometrie, Produktrevisionen, Bestellungen, Shopify oder Galeriedatenbanken. Designs folgen unverändert dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Acht Produktionsdateien

Unter `app/workshop/`:

| Datei | Zweck |
| --- | --- |
| `public-design-preview-cache.mjs` | Separater signierter Dateicache; stammt aus Flugsicherung 6686e86. |
| `public-design-previews.mjs` | Auswahl, Vorbereitung, aktuelle Freigabeprüfung und Wiederverwendung. |
| `shop-design-gallery.mjs` | Intern optional bereits geprüftes Modell verwenden; Standardaufruf unverändert. |
| `shop-entry.mjs` | Optionaler Anschluss, GET/HEAD, Warmmanifest und bestehende Galerieantwort. |
| `shop-warm-manifest.mjs` | Höchstens drei öffentliche Hashadressen. |
| `ui/shop-warm.mjs` | Bestehender unsichtbarer Warmup lädt diese innerhalb derselben Budgets. |
| `configurator-integration.mjs` | Zwei serverseitige Einstellungen durchreichen. |
| `acryl-employee-host.mjs` | Eng validierte optionale Umgebungswerte. |

Kein R15-Layout, keine CSS-Datei und kein Editor-Bundle-Modul geändert. Beim Zusammenführen mit PR220 dessen Modulprüfungen in `shop-entry.mjs` und `shop-design-gallery.mjs` erhalten. Keine vollständige alte Runtime über den aktuellen Stand kopieren.

## Gültigkeit und private Daten

Die signierte Identität bindet Store/Tenant/Shop, Shopify-Produkt und Variante, native Produktrevision, Binding/Zuordnungsrevision, Optionen/Grundpreis, Design-ID, vollständigen Modell-/Ressourcenhash und Renderergraph-Hash. Gleiche SVG-Bytes verschiedener Shops erzeugen verschiedene Adressen. Das bestehende Geheimnis steht weder in Dateien noch im Manifest.

Jeder neue öffentliche GET/HEAD löst die aktuelle Zuordnung erneut auf und prüft Pause/Freigabe, Revision und vollständigen Modellstand. Entzug, abweichender Renderer oder manipulierte Dateien liefern keine Vorschau. Bereits im Browser gespeicherte öffentliche Originalbilder lassen sich nachträglich nicht aus dessen Cache löschen; neue Manifest-/Serverabrufe sind gesperrt.

Keine Kundentexte oder Uploads: `media`, `uploadId`, `customerUploadId`, `uxUploadId` und `uxVectorLogo` schließen ein Original von der öffentlichen Vorbereitung aus. Es werden ausschließlich vorhandene native Originale durch den bestehenden Renderer verarbeitet. Externe/private SVG-Verweise werden abgewiesen.

Bei aktiviertem Feature werden alte, ungeprüfte In-Memory-Bodyhash-URLs weder ausgegeben noch als GET-Fallback akzeptiert. Private POST-Vorschauen bleiben erhalten. Ohne Konfiguration bleibt der bisherige Weg unverändert. Erneute Vorbereitung nach Modelländerung rendert frisch; alte In-Memory-Bytes können nicht unter neuer Identität gespeichert werden. Quelle/Bindung werden vor und nach Hintergrundschritten erneut verglichen.

## Explizite Vorbereitung

Nur im bestehenden Kundenhost ergänzen; dessen bestehende Freigabewerte bleiben unverändert:

```text
GRAVURU_PUBLIC_PREVIEW_DIRECTORY=/absoluter/normalisierter/privater/vorschaubereich
GRAVURU_PUBLIC_PREVIEW_PREPARE_PRODUCT=gid://shopify/Product/16190784438652
GRAVURU_PUBLIC_PREVIEW_PREPARE_VARIANT=gid://shopify/ProductVariant/58104606556540
```

Die vorhandene Einstellung `GRAVURU_CUSTOMER_INTEGRATION=merchant-test-only` bleibt Voraussetzung. Root legt den tatsächlichen privaten Betriebspfad fest; außerhalb öffentlicher Dateien und Produkt-/Uploaddatenbanken, für den vorhandenen Prozess schreibbar. Es gibt keinen neuen HTTP-Endpunkt zum Starten der Vorbereitung.

Mit beiden IDs läuft nach Hoststart einmal im Hintergrund die begrenzte Vorbereitung. Das interne Promise `publicPreviewPreparation` und das Protokollereignis `public_preview_prepared` belegen Ergebnis und Byteanzahl. Bereits passende Dateien werden ohne Rendering wiederverwendet. Danach können beide PREPARE-Werte entfernt werden; DIRECTORY allein liest vorhandene Dateien. Ohne DIRECTORY gibt es keine neue Cachefunktion. Unvollständige Werte werden vor Datenbanköffnung abgelehnt.

Rücknahme: optionale Werte entfernen und gesicherten Runtime-/Wrapperstand wiederverwenden. Abgeleitete Cachedateien können liegen bleiben; keine Originale, Historien, Bindungen oder Datenbanken löschen. Die aktuelle Zentrierung sowie SVG-/Pointer-/Warenkorbreparaturen bleiben geschützt.

## Budgets und Grenzen

- Maximal drei Originalvorschauen je explizitem Auftrag; 2 MiB je SVG und 64 MiB Dateispeicher. Kein automatisches Löschen alter Einträge.
- Bestehender Browser-Warmup: zwei parallele Abrufe, insgesamt 6 MiB dekodiertes Budget, Save-Data/2G und Abbruch bleiben erhalten.
- Zunächst nativer eigener Flachprodukt-Galerieweg, insbesondere Edelstahlfamilie. Separate Szenen-, Funkklingel- und Acrylrenderer bleiben beim privaten Fallback; keine allgemeine Materialfreigabe erfunden.
- Andere Größen/Formen und spätere Karten bleiben normal erreichbar. Die Designauswahl wird nicht eingeschränkt.
- Aktuelle Bindungs-/Freigabe- und Modellhashprüfung benötigt weiterhin Serverarbeit. Echte Browser-Cachetreffer und Kundenladezeiten sind erst in der anschließenden Liveabnahme messbar.

## Tatsächlicher Prüfnachweis

Abschließender kombinierter Lauf: **91/91 grün, 0 übersprungen**, 17,9 Sekunden. Cache/Service, Warmup, Hostkonfiguration, echter HTTP-Kundeneinstieg und bestehende Galerie-/Warenkorbregressionen. HTTP: GET/HEAD, Neustart, Warmmanifest ohne Start-Rendering, privater POST-Fallback, Fremd-Origin, Entzug und alter Bodyhash. Weitere negative Fälle: fremder Tenant/Shop, Rendererwechsel, manipulierte Datei, Modellwechsel mit erneuter Vorbereitung, fehlende Freigabe und fünf echte Kundenmedienkennzeichen.

Der reale lokale r4-Datensatz `candidate-product-document.live-normalized.compact.json` wurde ausschließlich gelesen: SHA-256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`, 11.906.263 Bytes. **251 Originale, 80 Größen, 404 Kombinationen** bleiben bytegleich, genau drei Renderaufrufe. Bindungs-/Freigabetransport dieses Tests ist synthetisch; keine Live-Datenbankabnahme behauptet.

Native SVG-Größen: 140.037, 139.106 und 139.156 Bytes. Abschließender lokaler Paralleltest: Vorbereitung 4,85 s, URL-Ermittlung 0,35 s, drei frisch geprüfte Dateilesungen zusammen 0,70 s. Keine versprochenen Handy-/Serverzeiten.

```text
node --test app/workshop/public-design-previews.test.mjs app/workshop/public-design-previews-bank.test.mjs app/workshop/shop-warm.test.mjs app/workshop/acryl-employee-entry.test.mjs app/workshop/shop-entry.test.mjs app/workshop/shop-design-gallery.test.mjs
```

Für den vorhandenen SVG-Logo-Test benötigt der vollständige Lauf den funktionsfähigen `GRAVURU_PYTHON`-Pfad. Der Banktest überspringt sich auf Rechnern ohne das lokale r4-Artefakt; hier wurde er tatsächlich ausgeführt.

Unabhängiger Review: Entzug-/In-Memory-/Encodingbefunde korrigiert; abschließend 15 Service-/Warmtests plus zwei gezielte HTTP-/Hosttests unabhängig grün. Kein offener konkreter Blocker. Shopify-/Handy-Browserabnahme und Veröffentlichung bleiben Root vorbehalten.

## Nächster Schritt

Root übernimmt `6686e86` plus nachfolgenden Umsetzungscommit in die aktuelle Runtime, führt PR220-Modulprüfungen zusammen und bereitet nur die genannte Startvariante vor. Dann auf der Produktseite prüfen: Warmmanifest enthält bis zu drei persistente SVG-Adressen; dieselben Adressen erscheinen bei den entsprechenden Galeriekarten. Netzwerkanfragen, Neustart ohne Rendering und privates Nachladen weiterer Karten am Handy/PC beobachten. Keine Aussage „alles vollständig vorgeladen“.
