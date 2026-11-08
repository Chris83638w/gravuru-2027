# Öffentliche Vorlagenvorschauen: unabhängiger Review

Stand: 08.11.2026, nach Wiederaufnahme. Geprüft wurde der isolierte Umsetzungsbaum `work/public-design-previews-20261108`, ausgehend von `6686e86` / `ad9b24a`, mit abschließendem Commit **[`552347034b75866b13c1d57af2980ae6c7e0c709`](https://github.com/Chris83638w/gravuru-2027/commit/552347034b75866b13c1d57af2980ae6c7e0c709)**. Der Autor bestätigt kein Quelldelta nach dem unabhängig geprüften acht-Dateien-Hashstand; der Arbeitsbaum ist sauber. **Keine Serveraktion, kein Deployment und keine Änderungen an Produktionscode durch den Reviewer.**

## Ergebnis

Die bisher gefundenen konkreten Fehler sind im geprüften Code korrigiert. Die begrenzten Service-, Vorlade- und echten lokalen HTTP-Prüfungen bestehen. Der tatsächliche Browserablauf und die Zusammenführung auf den aktuellen Kundenstand bleiben Roots getrennte Abnahme. Dieser Bericht ist keine Behauptung einer Liveaktivierung.

## Konkrete Befunde und Korrekturen

1. **Ungeprüfter öffentlicher Rückfall nach Entzug.** Der erste Integrationsstand fiel nach einer abgewiesenen persistenten Vorschau auf den alten In-Memory-Bodyhash zurück. Dieser Pfad prüfte die aktuelle Freigabe nicht erneut. Bei eingeschaltetem neuen Cache liefert der öffentliche GET jetzt ausschließlich dessen geprüfte Bytes. Galerie und Startmodell entfernen alte öffentliche URLs; fehlende Vorschauen nutzen weiterhin den vorhandenen authentifizierten POST. Ohne die optionale Cacheaktivierung bleibt der bisherige Pfad unverändert. Der lokale HTTP-Test deckt den alten Bodyhash, Pause/Entzug und den privaten Fallback ab.
2. **Alte Bildbytes unter neuer Modellidentität.** Unabhängig reproduziert: eine synthetische native Vorlage von 120 × 80 auf 140 × 80 ändern, ohne den Produktrevisionsschlüssel des Testdoubles zu ändern, und erneut vorbereiten. Die neue öffentliche Adresse enthielt zunächst die alten Bildbytes aus dem vorhandenen Galeriecache. Die explizite Vorbereitung nutzt jetzt eine frische Instanz desselben nativen Galerierenderers. Die neue Regression prüft geänderte Bildbytes; es wurde keine zweite Geometrie- oder Renderlogik eingeführt.
3. **Unbeabsichtigte Zeichenkodierung.** Änderungen wie `fÃ¼r` in bestehenden Meldungen von `configurator-integration.mjs` wurden entfernt. Es verbleiben nur die gewünschten Optionen und ihre Weitergabe.
4. **Tatsächliche Uploadkennzeichen.** Der öffentliche Vorlagenfilter berücksichtigt zusätzlich `uxUploadId` und `uxVectorLogo`, die der bestehende Kundenkonfi verwendet. Kundenbilder und gespeicherte Warenkorb-/Bestell-PNGs werden nicht als Quelle des öffentlichen Caches benutzt.

## Selbst ausgeführte Prüfungen

- Sechs direkte Speicherprüfungen mit synthetischen temporären Dateien: Rendererfingerprint, Schreiben/Lesen, getrennte Tenant-/Shopadressen bei identischen SVG-Bytes, Lesen nach Neustart, Ablehnung abweichender Bytes unter derselben Identität sowie Ablehnung von Rendererwechsel und manipulierten signierten Metadaten.
- `node --test app/workshop/public-design-previews.test.mjs app/workshop/shop-warm.test.mjs`: **15/15 bestanden**. Enthalten sind Bindungs-/Freigabewechsel, Modell-/Options-/Rendereridentität, Tenanttrennung, Manipulation, Kundendatenfilter, Vorbereitungskonflikt, Reprepare-Korrektur sowie Byte-/Mengenbudgets und Save-Data.
- Gezielt `node --test --test-name-pattern='public template HTTP|public template warmup|public preview|preview preparation' app/workshop/shop-entry.test.mjs app/workshop/acryl-employee-entry.test.mjs`: **2/2 bestanden**. Echter lokaler Requesthandler mit GET/HEAD, Neustart, fremdem Origin, Entzug, Legacy-Bodyhash, privatem POST-Fallback, fehlender öffentlicher Vorbereitungsroute und serverseitigen Aktivierungsoptionen. Zusammen mit dem vorigen Lauf sind das **17 unterschiedliche bestandene Tests** des abschließend geprüften Diffs.
- Diese beiden Läufe wurden nach der letzten Optimierung erneut ausgeführt: kompletter Modelldigest als JSON-Bytehash, intern wiederverwendetes geprüftes Kartenmodell und alle fünf privaten Medienkennzeichen. Ein geänderter JSON-Schlüsselaufbau kann konservativ einen Cachemiss verursachen; er kann keine abweichenden Bytes unter einer alten Identität legitimieren.
- Zusätzlicher Autorenbeleg, Testcode unabhängig gelesen: echte unveränderte r4-Bank mit **251 Designs, 80 Größen und 404 Varianten**, genau drei vorbereitete SVGs mit 140.037 / 139.106 / 139.156 Bytes. Transport/Freigabe im Test sind synthetisch. Das ist kein Nachweis eines produktiven Registryabrufs; dieser größere Lauf wurde nicht unnötig doppelt gestartet.
- Der Autor meldet für seinen abschließenden kombinierten Lauf **91/91 bestanden, keine Skips**. Dieser zusätzliche Lauf wird als Autorenbeleg ausgewiesen, nicht als eigene Wiederholung.
- `git diff --check`: keine Fehler. Breite vorhandene Tests wurden nicht erneut vollständig ausgeführt.

## Bewahrte Grenzen

Nur native, bereits freigegebene Vorlagen eines genau genannten Produkts und einer Variante werden vorbereitet, höchstens drei. Beim Startticket wird ausschließlich nachgeschlagen; fehlende Bilder lösen kein Rendering aus. Die Vorbereitung ist ein ausdrücklicher serverseitiger Auftrag ohne öffentliche Schreibroute. Der Speicher ist separat, signiert, größenbegrenzt und legt vollständige Dateien atomar ohne Überschreiben an.

Die Identität umfasst Tenant, Shop, feste Bindung, Produktrevision, Optionen, Design, vollständigen Modell-/Ressourcenhash und Renderergraph. Neue Serverabrufe prüfen die aktuelle Zuordnung und Freigabe. Schon im Browser zwischengespeicherte öffentliche Bilder können nach einem Entzug weiter vorhanden sein; eine rückwirkende Löschung wird nicht versprochen.

Gemeinsam geladene Szenen-/Spezialrenderer bleiben zunächst beim privaten Fallback. Dieser erste Anschluss ist kein Auftrag, alle 404 Varianten oder 251 Designs vorab zu rendern. Keine Produktrevision, Preisformel oder historische Bestellung wird verändert.

## Zusammenführung und nächste Abnahme

Die acht geprüften Produktionsdateien sind mit folgenden SHA-256-Pins festgehalten (jeweils unter `app/workshop/`). Änderungen nach diesen Pins erfordern einen erneuten gezielten Abgleich.

| Datei | SHA-256 |
|---|---|
| `acryl-employee-host.mjs` | `20cbb93fb4430e8a21c33ddccd132da17c111883a147b66d310b2f7a80b15766` |
| `configurator-integration.mjs` | `d45a83bccafbd90cbab8feafb37ce1594c56c370d8ff0c59efbce232537e8802` |
| `public-design-preview-cache.mjs` | `942a461c50d0ccd40bc268c59a81832edfd9b2c6f4b5e2a33354a11478c03868` |
| `public-design-previews.mjs` | `9706125dd4c008618330fec7213ee386dca58fc3c7e458446c6385b45c9fbc9e` |
| `shop-design-gallery.mjs` | `b55270782fd5589feb261859d3134b955f26814f55747895ff5b083cd2b4bc49` |
| `shop-entry.mjs` | `10c478683d0688a4fc4757664cec12afb42a46f1fddc6f37270c0ebf4d0bc3ed` |
| `shop-warm-manifest.mjs` | `2903be7c879e59adf95e19b6eb2ff0b6542b09931d0071ee1a7930bc67e2a19b` |
| `ui/shop-warm.mjs` | `74e1ccf61a6b698c76419b4ae40214f41ea6e020378371ac77ee3b3d8a294a05` |

Nur die acht Produktionsdateien des engen Pakets übernehmen; die beiden neuen Dateien sind `public-design-preview-cache.mjs` und `public-design-previews.mjs`. Bestehende Anschlüsse betreffen `acryl-employee-host.mjs`, `configurator-integration.mjs`, `shop-design-gallery.mjs`, `shop-entry.mjs`, `shop-warm-manifest.mjs` und `ui/shop-warm.mjs`. Der Galerieanschluss erlaubt ausschließlich dem internen Aufrufer, das bereits geprüfte Kartenmodell wiederzuverwenden; bestehende Aufrufe behalten ihre bisherige Prüfung.

**Aktuellen UI-Stand `e9c36ce` und spätere Korrekturen erhalten.** Die ältere Ausgangsbasis `ad9b24a` darf nicht als komplette Laufzeit über den aktuellen Kundenstand gelegt werden. Insbesondere `shop-entry.mjs` und `shop-design-gallery.mjs` mit parallel vorbereiteten Modulprüfungen gezielt zusammenführen. Anschließend prüft Root den echten Produktseiten-Vorabruf, die Wiederverwendung im Konfi und die Ladezeit am aktuellen Kundenstand. Bis dahin keine Live- oder vollständige Performanceabnahme behaupten.

Der unveränderte Designbestand folgt weiterhin dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); dieser Review verändert keine Gestaltung.
