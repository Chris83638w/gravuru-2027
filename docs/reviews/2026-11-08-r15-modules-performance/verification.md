# Nachweis der isolierten Zusammenführung

Basis: `c76e2a79f358bf0a38da45771745b7d76559bf3b`.
Produktionsdiff: `61fcb3fb05bdcb636d1cb92e06917e175b64306a`.
Keine Änderungen an Servern, Shopify, Produktdokumenten, Bindings oder Profilzuweisungen.

Im Arbeitsbaum zuerst `node app/configurator/variant-m/build.mjs` ausführen.
Für den tatsächlichen r4-Nachweis die Umgebungsvariable `GRAVURU_REAL_STEEL_DOCUMENT`
auf den gesicherten Kandidaten `candidate-product-document.live-normalized.compact.json`
setzen (SHA256 im Paketmanifest). In dieser Windows-Umgebung wurde zusätzlich
`GRAVURU_PYTHON` auf die bereits vorhandene `.local-data/module-check-python/Scripts/python.exe`
des Worktrees `universal-module-profiles-20261108` gesetzt.

Der einmalige Hauptlauf nutzte `node --test` mit diesen 24 Dateien:

```text
app/configurator/variant-m/module-profile.test.mjs
app/configurator/variant-m/module-runtime.test.mjs
app/configurator/variant-m/logo-upload.test.mjs
app/workshop/cart-personalization.test.mjs
app/workshop/shop-entry.test.mjs
app/workshop/shop-design-gallery.test.mjs
app/configurator/mobile-demo/demo.test.mjs
app/configurator/variant-m/view-zoom.test.mjs
app/configurator/variant-m/preview-uploads.test.mjs
app/configurator/variant-m/ui-event-regressions.test.mjs
app/configurator/variant-m/shop-cart.test.mjs
app/configurator/variant-m/native-overlay.test.mjs
app/workshop/shop-entry-client.test.mjs
app/workshop/theme-cart-flow.test.mjs
app/workshop/shop-design-gallery-variant.test.mjs
app/workshop/shop-preparation.test.mjs
app/workshop/slate-shop-preparation.test.mjs
app/configurator/variant-m/element-rights.test.mjs
app/workshop/r15-module-bank.test.mjs
app/configurator/variant-m/lazy-resources.test.mjs
app/configurator/variant-m/visible-resource-loader.test.mjs
app/workshop/shop-warm.test.mjs
app/workshop/shop-entry-session.test.mjs
app/configurator/variant-m/design-reset.test.mjs
```

Ergebnis: 274 Fälle, 272 bestanden, zwei veraltete Testannahmen (siehe Übergabe).
Nur diese beiden Testfixtures wurden angepasst; danach:

```text
node --test app/configurator/variant-m/design-reset.test.mjs app/configurator/variant-m/lazy-resources.test.mjs
19 Tests, 19 bestanden, 0 fehlgeschlagen
```

Alle 274 unterschiedlichen Fälle sind damit erfolgreich geprüft. Die 19
Wiederholungsfälle sind keine zusätzlichen unterschiedlichen Tests. Quelländerungen
nach dem Hauptlauf beschränkten sich auf die zwei Testfixtures, Dokumentation und
den Paketgenerator; kein ungeprüfter Produktionscode wurde nachgeschoben.

Lokale Logdateien unter `outputs/r15-modules-performance-20261108/`:

| Datei | SHA256 |
| --- | --- |
| `tests.log` | `4312482b03559115605452ddcbfa3a59ff605e9282fb8d6d3705f28cbe44af30` |
| `tests-targeted-repeat.log` | `62195f3cacb87cda498793f2647bbcc43493329c79ceabfbf3db0b8df38083ae` |
| `build.log` | `7a0a0586cfde2666328625472134049aaf4bfa014b80037c2157228c94874de9` |

Der Paketprüfer bestätigt zwölf Quellen sowie zehn Vorhersicherungen; 41
geschützte Basisdateien sind unverändert. Der manifeste Bundle-/Quellstand ist
nicht automatisch ein Live- oder Browsernachweis. Eine tatsächliche kombinierte
Handy-/PC-Abnahme und die konkrete produktive Profilzuweisung stehen noch aus.
