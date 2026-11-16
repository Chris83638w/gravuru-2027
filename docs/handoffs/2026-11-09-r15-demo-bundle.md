# R15: ein zusätzliches Paket statt einer Importkaskade

Stand: isolierter Branch `dev/mika-r15-demo-bundle-20261109`, Basis `4dc5653b`. Lokal geprüft; keine Veröffentlichung und keine Browserabnahme durch diesen Agenten.

## Änderung

Nur zwei Produktionsdateien:

- `app/configurator/variant-m/bundle-build.mjs`: bestehender Bundler erzeugt zusätzlich einen gehashten R15-Chunk. Der statische Einstieg `mobile-demo/shop-shell.mjs` erreicht 30 Module; 15 davon liegen schon im Kern und werden über dessen bestehende Blob-Modulinstanzen referenziert. Nur die 15 zusätzlichen Oberflächenmodule stehen im neuen Chunk. Kein zweiter Editor, keine zweite Preis- oder Geometrielogik.
- `app/workshop/ui/shop-warm.mjs`: liest neben dem aktiven Kern-Preload ausschließlich den ausdrücklich mit `data-gravuru-bundle="prio-r15"` markierten Chunk. Höchstens zwei Pakete, weiterhin zwei Worker und insgesamt 6 MiB. Save-Data/2G, Fehlerbehandlung, drei öffentliche Designvorschauen und die übrigen Ressourcenbudgets bleiben erhalten. Keine Ausführung des Editors beim Vorladen.

Die beiden bestehenden relativen Assetaufrufe in `demo.mjs` (CSS und Warenkorb-SVG) erhalten nur im erzeugten Bundle ihren ursprünglichen öffentlichen Absolutpfad. Die Host-Umschreibung nach `/acryl-configurator/` bleibt wirksam. CSS und SVG bleiben eigene Dateien. Sämtliche Demo-Quellen, Styles, Produkt-/Design-/Preis-/Modulregeln bleiben unverändert. `?module=einzeln` bleibt als bestehender Rückfall-/Entwicklungsweg erhalten.

## Nachweise

- 27/27 gezielte Tests: Bundler, tatsächlicher lokaler Assethost, Shop-Shell/Sitzungsgrenzen, Warmup und Acryl-Hostrouting.
- 3/3 gezielte native HTTP-Starttests: signiertes R15-Opt-in, gebundener Produkt-/Variantenstand, öffentliche Warmmetadaten ohne private Warenkorbentwürfe.
- Nach abschließender Verschärfung des Warmparsers dessen 7 Tests erneut grün. Insgesamt 30 unterschiedliche Fälle, keine Addition des Wiederholungslaufs.
- Vergleichsbuild mit dem unveränderten Bundler aus `4dc5653b`: Kernpaket und sämtliche bestehenden Produktchunks byteidentisch.
- Neuer R15-Chunk: `editor-bf7d088b9bdf015e.mjs`, 134.324 Bytes unkomprimiert / 38.138 Bytes gzip. 15 Module. Der statische R15-Teil wird von 30 Einzelmoduladressen zu einem Chunkrequest. Die zuvor beobachteten 46 Browserrequests umfassen weitere Ressourcen; sie werden hier nicht vollständig als eingespart behauptet.
- Erzeugte R15-Module wurden als echte ESM geladen und die bestehenden gleichen Ursprungs-, Objektidentitäts- und Produktsitzungsprüfungen ausgeführt. Fremde Sitzung/Konfiguration bleibt abgewiesen.
- Der echte lokale HTTP-Host liefert das neue Paket mit gzip und unveränderlichem Hash-Cache. Rohmodule bleiben als bestehender Fallback erreichbar.

Kommandos:

```text
node --test app/configurator/variant-m/bundle.test.mjs app/configurator/mobile-demo/native-overlay.test.mjs app/configurator/mobile-demo/shop-shell.test.mjs app/workshop/shop-warm.test.mjs app/workshop/acryl-host-routing.test.mjs
node --test --test-name-pattern="approved presentation opt-in|model route serves only|warm manifest is optional" app/workshop/shop-entry.test.mjs
```

Exakte Vorher-/Nachher-Hashes und Buildnachweis: `docs/reviews/2026-11-09-r15-demo-bundle/build-proof.json`. Beide Produktionsdateien sind LF-normalisiert; Paketbytes entsprechen Gitbytes.

## Übernahme und Rückweg

Vor Veröffentlichung die beiden Produktionsdateien gegen das Manifest prüfen, aktuelle komplette Runtime weiterverwenden und dort neu bauen. Die sichtbare R15-/Handy-/Desktopabnahme und tatsächliche Netzwerkmessung übernimmt Root. Bisherige Bedienung, Vorladen und Sitzungsschutz dabei prüfen.

**Bestehendes Verhalten des Builders beachten:** `buildProductEditorBundles` entfernt alte gehashte Bundle-Artefakte im Ausgabeordner. Deshalb niemals direkt im aktiven Ausgabeordner bauen. Der tatsächlich verwendete kombinierte Installer baut getrennt, prüft die Ergebnisbytes, ergänzt neue JS-/gzip-Dateien atomar und ersetzt das Editor-HTML zuletzt. Alte Artefakte bleiben durchgehend vorhanden. Der genaue veröffentlichte Stand und Rückweg stehen in der [aktuellen Übergabe](2026-11-09-performance-continuation.md).

Rückweg: genau diese beiden Quellen auf die gesicherte Basis zurückstellen, neu bauen und alte Bundle-Artefakte weiter bereithalten. Kein Produkt-, Profil-, Datenbank- oder Shopify-Rückweg erforderlich, da dieses Paket dort nichts schreibt.

Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unverändert maßgeblich; diese Änderung erzeugt oder verändert kein Design.
