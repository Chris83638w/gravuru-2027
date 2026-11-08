# Warenkorbvorschau: geprüfte Uploads vollständig einbetten

## Umfang und gesicherte Grundlage

Nutzerauftrag: funktionierenden Warenkorb mit Größen, Befestigung und Logo prüfen; freigegebenen Konfi-Aufbau erhalten. Root hat die dabei gefundene fehlende Logoabbildung ausdrücklich zur eng begrenzten Reparatur zugewiesen. Keine Änderungen an Layout, Designs, Preisen, Zuschnitt oder Shopify-Produkten. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unverändert gültig.

Isolierter Branch `dev/mika-cart-preview-uploads-20261108`, Git-Basis `eb5da37ea1a29be3edc601049d7ad2fab6b690d0`. Aktive Runtime-Basis: `private/mika-steel-r15-shopify-20261108`. Vor jeder Änderung wurden die beiden betroffenen Originaldateien in `outputs/cart-preview-uploads-20261108/backup/` gesichert und ihre SHA-256 mit `outputs/steel-design-bank-repair-20261108/live-runtime-manifest.json` verglichen:

| Datei | Exakte aktive SHA-256 vorher |
|---|---|
| `app/configurator/variant-m/adapter.mjs` | `0765d4cdab7661ea661a43c5bb81376d24c2cf6659fe7d29768338adfca8f070` |
| `app/configurator/variant-m/ux.mjs` | `6a112310029b8673ea047ab215e53f66e1aa52f44f74db9385a71ffafe93f99e` |

## Ursache und Änderung

Der geprüfte SVG-Upload wird in `ux.mjs` als Blob-URL registriert und als `<image href="blob:…">` im Editor angezeigt. `shop-cart.mjs` erzeugt die Kundenvorschau über `el.png()`. Dieses Rasterverfahren in `adapter.mjs` bettete bisher nur das Materialbild ein; die Upload-URL blieb im eigenständig gerasterten SVG stehen. Der korrekte Einbettungspfad in `printArtwork()` erzeugt die separate Fertigungsreferenz und wurde für die Kundenvorschau nicht benutzt.

Die neue Einbettung benutzt dieselbe Dateiauswahl wie `printArtwork()` (`asset.blob || asset.file`) und liest ausschließlich die vom Editor registrierten Uploads. `ux.mjs` stellt dafür eine geschlossene Funktion über seiner bestehenden Datei-Map bereit. `adapter.mjs` ruft sie vor dem unveränderten PNG-Rasterverfahren auf. Originale, Fotobearbeitungen und geprüfte SVGs bleiben byteidentisch; Bildpositionen, Transformationen, Masken und Abmessungen werden nicht geändert.

`preview-uploads.mjs` holt keine URLs aus dem SVG per Netzwerk. Nicht registrierte Blob-Bildquellen werden abgelehnt. Die bestehenden Grenzen gelten weiter: JPG/PNG/WebP bis 15 MB; SVG bis 2 MB, ausdrücklich geprüfte Version `svg-black-v1` und passender bestätigter `outputSha256`. Als SVG wird ausschließlich die geprüfte `asset.blob`-Fassung eingebettet, niemals das ungeprüfte Original.

Serverpfad unverändert: `acrylic-review.mjs` sichert `customerPreview` als `gestaltung-kundenansicht.png`. `theme-cart.mjs` und `customer-design-image.mjs` bevorzugen diese Datei gegenüber `gestaltung-referenz.png`. Bereits gesicherte Warenkorb-/Bestellrevisionen werden nicht verändert. Eine neue Konfiguration bzw. bestätigte Bearbeitung erzeugt eine neue korrigierte Vorschau.

## Tatsächliche Prüfungen

- 19 Tests grün: `preview-uploads.test.mjs`, `logo-upload.test.mjs`, `shop-cart.test.mjs`, `cart-edit.test.mjs`.
- 2 CLI-Integrationstests grün: `preview-uploads-integration.test.mjs`. Ein synthetisches T-SVG mit Aussparung läuft durch den vorhandenen echten Serverkonverter; die eingebetteten Bytes entsprechen exakt dessen geprüfter Ausgabe. Ein echtes 4×4-PNG behält sämtliche Pixel einschließlich Alpha 128. Originaldateien bleiben unverändert.
- Build grün: 151 Module, 16 Stylesheets, Kernbundle `/_bundle/editor-2751340a3bfbd074.mjs`. Dies ist nur der Buildnachweis des isolierten Git-Arbeitsbaums, **kein freigegebenes Live-Bundle**.
- `git diff --check` sauber.
- Es wurde kein Browser gestartet. Der vorbereitete Headless-Ansatz brach vor dem Browserstart an einer fehlenden Python-Abhängigkeit ab und wurde anschließend entfernt. Die tatsächliche Browser-/Warenkorb-Pixelprüfung übernimmt Root über CUA nach Review.

Der erfolgreiche CLI-Lauf nutzte den bereits vorhandenen Interpreter `work/universal-module-profiles-20261108/.local-data/module-check-python/Scripts/python.exe` über `GRAVURU_PYTHON`. Kein neues Python-Paket wurde installiert.

## Exakt begrenztes Deployment und Cache

Nur diese drei Runtime-Dateien übernehmen, mit Vorher-SHA-Prüfung und Sicherung:

1. `app/configurator/variant-m/adapter.mjs`
2. `app/configurator/variant-m/ux.mjs`
3. neu: `app/configurator/variant-m/preview-uploads.mjs`

Das vorbereitete Einzeldateipaket samt Vorher-/Nachher-SHA liegt in `outputs/cart-preview-uploads-20261108/patch/` und `patch-manifest.json`. Nicht den gesamten Branch oder seine erzeugten Dateien über den Server kopieren: Der vollständige Modulvergleich fand bereits bestehende R15-Abweichungen in `option-media.mjs`, `family-formats.mjs` und `design-reset.mjs`. Diese sowie die separaten Serverkorrekturen bleiben erhalten.

Der bestehende aktive Runtime-Baum muss aus genau seinem eigenen Quellstand neu gebaut werden. `app/configurator/variant-m/build.mjs` schreibt `.preview/editor.html` und erzeugt über `buildProductEditorBundles()` die gehashten Pakete unter `.preview/bundle/`. `createShopifyTestRuntime()` führt diesen Build beim Start aus; der Acryl-Händlerhost ruft diesen bestehenden Einstieg auf. Keine pauschale Dateilöschung und keine zusätzlichen Neustartschleifen verwenden.

`server.mjs` liefert `/_bundle/editor-<hash>.mjs` mit einem Jahr immutable Cache. Im vorgeschalteten Acrylhost heißt der Pfad `/_acryl-bundle/…`; dessen Cache ist ebenfalls immutable. Das neu erzeugte `editor.html` referenziert automatisch den neuen Hash. `/_merchant-acryl-editor.html` kann gemäß `acrylCacheControl()` jedoch bis zu 300 Sekunden im privaten Browsercache liegen. Deshalb nach dem einmaligen kontrollierten Neustart mit frischer Editor-Navigation bzw. browserseitig erzwungenem Neuladen prüfen, dass tatsächlich der neue Bundlepfad geladen wird. Das Leeren beliebiger Serververzeichnisse ersetzt diesen Nachweis nicht. Keine Änderung an bestehenden Cache-/Sessionregeln gehört zu diesem Patch.

## Rücknahme und nächster Schritt

Vor Aktivierung ist der Branch vollständig isoliert. Nach Aktivierung die beiden gesicherten Quelldateien zurückstellen und das neue Hilfsmodul bei Bedarf entfernen; anschließend im selben aktiven Runtime-Baum den ursprünglichen Build wiederherstellen und einmal kontrolliert neu starten. Historische Konfigurationen, Datenbanken, Preise und Bilder nicht löschen oder umschreiben.

Root prüft den Diff und die drei Runtime-SHAs, baut ausschließlich im aktiven R15-Baum und prüft danach im echten Konfi: geprüftes Logo sichtbar im Warenkorbbild, transparente Bereiche korrekt, Größen-/Befestigungs-/Logopreis unverändert. Ein echtes Shopify-Ergebnis ist durch die lokalen Tests noch nicht behauptet.
