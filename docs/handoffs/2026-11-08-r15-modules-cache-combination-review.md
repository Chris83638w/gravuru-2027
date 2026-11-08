# R15: unabhängiger Review von Modulregeln und Vorschaucache

Geprüfter Integrationscommit: **`f4c370fcc6bfdd388f63f14ea339046ea1103aca`**, aus PR220-Basis `957306a26ea53f1df19c9f49786feb30fe1f5b1e` plus Cache-Commits `e381a5c0` und `f4c370fc` (Originale `6686e86` und `55234703`). Eigener Reviewbranch: `review/mika-r15-modules-cache-20261108`. Keine Änderungen im Root-Arbeitsbaum, an Produktionsdateien, Server, Shop oder UI.

## Ergebnis

**Kein konkreter Blocker gefunden; 22 unterschiedliche gezielte Tests bestanden.** Der manuelle Galerie-Merge erhält den Modulschutz vor der optionalen Wiederverwendung des geprüften Kartenmodells. Der automatisch zusammengeführte Shop-Einstieg verbindet den öffentlichen Cache mit den weiterhin bestehenden Modul-, Sitzungs-, Produktrevisions- und Uploadprüfungen.

Das Designmodul lässt sich auch mit aktivem persistentem Cache abschalten: keine neuen Karten, keine alten öffentlichen Adressen und kein Wechsel/Rendering mit zuvor ausgegebenen Galerietokens. Das eigene Startdesign und alle Originale bleiben bestehen. Logo aus verhindert den echten HTTP-Upload auch dann, wenn native `logo.enabled`-/`vectorUpload`-Flags weiterhin wahr sind. Foto aus bleibt beim Speichern und bei der Preisbildung verbindlich.

## Neue Kombinationsprüfungen

Zwei neue Tests liegen ausschließlich in diesem Reviewbranch:

1. `public-design-previews.test.mjs`: erst drei öffentliche Vorlagen vorbereiten, dann Designmodul deaktivieren. Vorhandene URLs werden ungültig, Vorbereitung liefert null Bilder ohne Renderaufruf. `gallery.start(..., {cardModel})` umgeht die Sperre nicht. Galerie lehnt ab, Originaldesigns/Geometrie bleiben bytegleich. Ein unvollständiges Profil wird vom nativen Galerieaufruf abgewiesen; der optionale spekulative Cache lässt solche Vorlagen vollständig weg.
2. `shop-entry.test.mjs`: echter lokaler HTTP-Handler mit aktivem Cache. Nach Abschalten des Designmoduls liefert ein zuvor gültiges Bild 404, das Warmmanifest keine Vorschau und das Modell keinen Galerie-Starttoken. Galerie, Vorschau-POST und Designwechsel verweigern alte signierte Ziele mit 403. SVG-Upload bei Logo aus wird vor Konvertierung mit 422 abgelehnt; Tarif bleibt 1.299 Cent. Quelle und Cachedateizahl bleiben unverändert.

Die erste eigene Testfassung erwartete bei ungültigem Profil auch vom optionalen Cache eine Exception. Dessen bestehendes Verhalten ist bewusst „keine erlaubten Kandidaten“. Der Test prüft jetzt die fachlich relevante Sperre und zusätzlich die native Exception; dafür wurde kein Produktionscode verändert.

## Selbst ausgeführte Nachweise

```text
node --test app/configurator/variant-m/module-runtime.test.mjs
```

**11/11:** gemeinsame Reiter/Uploadgates, Logo an/aus mit 1.299-Cent-Tarif, Fotoverbot, manipulierte Kundendaten, ausgeschaltete Text-/Motiv-/Design-/Options-/Farbmodule, native Preise und Legacy-Konfiguration.

```text
node --test --test-name-pattern='active V1/V2|disabled motif|legacy raster-logo|explicit logo-off|retained V2|enabled photos' app/workshop/cart-personalization.test.mjs
```

**6/6:** strikte V1/V2-Verträge, Ablehnung von V3, bestehende Motivkosten/Fotoinklusion, ausdrückliches Logo-aus mit Nullzählung und alte Bestell-/Preisstände.

```text
node --test --test-name-pattern='combined|disabled source design|public gallery and switch|disabled design module' app/workshop/public-design-previews.test.mjs app/workshop/shop-entry.test.mjs app/workshop/shop-design-gallery.test.mjs
```

**5/5:** beide neuen Kombinationsfälle und drei vorhandene Galerie-/Startschutzfälle. Keine Skips. `git diff --check` sauber. Keine breite Wiederholung der separat geprüften Gesamtsuiten.

## Exakte Produktionspins

Diese Bytes sind zwischen Reviewbaum und Root-Arbeitsbaum identisch. Der Cachebaustein hat nach Git-Checkout andere Zeilenendbytes als im ursprünglichen Autorenbaum, ohne inhaltlichen Git-Diff. Für die Integration gelten diese tatsächlichen Pins:

| Datei | SHA-256 |
|---|---|
| `app/workshop/shop-design-gallery.mjs` | `0000cf9ca9c9a2e49627be5c7e945ede35244ea3ce73c07fb704e34bd07165ef` |
| `app/workshop/shop-entry.mjs` | `8bf53f6048cd4ef3409169c728ad570f136c47c2b92fa8d2fb57dabff65ceb44` |
| `app/workshop/public-design-previews.mjs` | `9706125dd4c008618330fec7213ee386dca58fc3c7e458446c6385b45c9fbc9e` |
| `app/workshop/public-design-preview-cache.mjs` | `c5744102d9b2675809fad7cca3ecbb16c7f1b429f3d2d4e12f9b8000cbe60bdd` |
| `app/configurator/variant-m/module-profile.mjs` | `1b6ef98458d11020b68219082f3ab6e35d0f344cb786828996cb21eae95164eb` |
| `app/configurator/variant-m/module-runtime.mjs` | `2ff141318caa5b2f26e53aca42524c0198b6bac4f63d10146d37d57713a63a97` |
| `app/workshop/cart-personalization.mjs` | `2aa4ef46b03ff70ac5db49b06e657c9a86c6f4584299c9ce11cff7b1fd93d481` |

## Grenze und nächster Schritt

Lokale Code-/HTTP-Kombinationsprüfung, keine Server- oder echte Handyabnahme. Root prüft auf dem aktuellen R15-Stand den Browserablauf und tatsächlichen Produktseiten-Vorabruf. `e9c36ce` und neuere freigegebene Bedienkorrekturen erhalten; keine alte Laufzeitkopie verwenden. Schon im Browser gespeicherte öffentliche Originalbilder lassen sich rückwirkend nicht löschen; neue Serverabrufe und Manifeste prüfen die aktuelle Berechtigung.

Designs bleiben gemäß [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) unverändert. Keine Produktrevision, Profilaktivierung oder Änderung historischer Bestellungen.
