# Vorhandenen Galerie-Lifecycle auf die aktuelle Kundenbasis übernehmen

Stand 10.11.2026, Codex/Mika. **Getrennt vorbereitet, nicht veröffentlicht.** Eigener Branch `dev/mika-gallery-lifecycle-integration-20261110` auf `f69c8dbfd1703e4abe2da80c1955d086cddbe547`. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unverändert maßgeblich; keine Designs bearbeitet.

## Herkunft und Sicherung

Der vorhandene Patch `6c310120d48daef12b16e9568916a62ecd278597` wurde unverändert übernommen. Die zwei Produktionsdateien und zwei zugehörigen Tests auf der aktuellen Basis waren exakt identisch zu seinem Elternstand; `git apply --check` meldete keinen Konflikt. Keine neue Implementierung und kein vollständiger historischer Branch-Merge.

Vor der Übernahme wurden alle vier vorherigen Dateien samt Basis-, Quell- und SHA-256-Pins separat unter `outputs/r15-gallery-lifecycle-integration-20261110/before/` und `baseline.json` gesichert. Der ursprüngliche Patch liegt dort als `source.patch`. Der Root-Arbeitsbaum blieb unberührt.

Genau zwei Produktionsdateien:

| Datei | SHA-256 vorher | SHA-256 nachher |
|---|---|---|
| `app/configurator/variant-m/product-design-gallery.mjs` | `3fd3dd7cd080a08868e91feece9cd536e7795ab3636cbbcf5c773d490d75961e` | `041ac15c181b664282ec9e337704d17f6624894c5fec7a3f8b20d9c6975dbfcd` |
| `app/workshop/ui/shop-design-switch.mjs` | `7eb0f39b94948165f1d17bf5b0bafc6ccd271e0d3def12fc3a05070b8d092fc9` | `83af68c2c70b902d577cef0110e560720962a09decb931c8ba732c4f90677e0c` |

Während eines Designwechsels werden alte Vorschauabrufe abgebrochen und neue angehalten. Erst nach dem Ready-Signal lädt die neue Galerie Bilder. Nach Fehler oder „Zurück“ werden nur fehlende Bilder wieder geladen; fertige Bilder bleiben. Höchstens zwei parallele Abrufe und drei spekulativ vorgewärmte Karten bleiben erhalten. Save-Data, Optionswechsel, Sessionprüfung und Foto-/Warenkorbkontextübernahme bleiben bestehen. Keine Layout-, Preis-, Produkt-, Modulprofil-, Datenbank- oder Shopify-Änderung.

## Aktueller Abgleich mit #168

Am 10.11. alle vier Beiträge seit 09.11. gelesen; API-Ergebnis vollständig mit vier Einträgen. Besonders relevant:

- [Live-Stand und äußerer Transferengpass, 09.11. 20:15 UTC](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6750351733): `767701ee` veröffentlicht, Galerie `6c310120`/`59e02af2` ausdrücklich noch nicht live. Die Kundenbasis `f69c8dbf` enthält den entsprechenden Bericht. Der langsame oder abgebrochene Kernpaketdownload bleibt ein eigener Befund.
- [Produktfreigabe/Excel-Regeln, 09.11. 22:15 UTC](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6752904671): vor neuen Produkten weiterhin bestätigte Module, Optionen und Preise; kein zusätzlicher Kundeneditor-Auftrag aus dieser Dokumentation. Dieses Paket legt keine Produkte an und verändert keine Freigaben.

Die früheren beiden Beiträge [09:14 UTC](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6736405359) und [11:13 UTC](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6738644304) beschreiben die vorausgegangene Performanceprüfung und Veröffentlichung. Kein jüngerer abweichender Galerie-Patch ist in diesen Beiträgen genannt.

## Tatsächlich neu geprüft

24/24 gezielte Tests auf der neuen Integration grün, keine übersprungen, Node 24.22.1:

```powershell
node --test app/configurator/variant-m/first-panel-preload.test.mjs app/workshop/shop-design-switch.test.mjs app/configurator/variant-m/gallery-pager.test.mjs
```

Belegt: Pause vor Wechselanfrage; alte Observer-/Idle-Arbeit startet nichts; verspätete Antworten verändern weder Bilder noch aktuelle Ladeplätze; Ready-Grenze; Save-Data; Fehlerwiederaufnahme; Zurück; unveränderte Fotos, Optionen, Menge und Warenkorb-IDs. `git diff --check` sauber.

Zusätzlicher nativer Bundle-Build in getrennten Ausgabeordnern: 154 Kernmodule, 16 gebündelte Styles, R15-Paket mit 15 Modulen. Geräte-, Ausführungs- und R15-Pakete sind vor/nachher bytegleich. Nur das Kernpaket ändert sich erwartungsgemäß. Alle übrigen getrackten App-Dateien bleiben unverändert. [Maschinenlesbarer Beleg](../reviews/2026-11-10-gallery-lifecycle-integration/proof.json).

Das ältere Paket `outputs/r15-gallery-lifecycle-20261109` wurde nur lokal gelesen: seine zwei Patchpayloads rekonstruieren exakt diese neuen Quellen. Installer-SHA `782fa652eb0281149bfeb12ff25b0d79dcdbbd2409193a0580112a5226a641ba`, Gzip-SHA `975abe4f83b8cc89877f50f7d69313ce4f03fd4b9c65ef5eef008f70b80a4e21`; entpackter Installer bytegleich. **Nicht ausgeführt.** Die historischen Installer-Rücknahmeprüfungen werden nicht als neuer Lauf gezählt.

Der vorhandene [Browserbeleg 59e02af2](https://github.com/Chris83638w/gravuru-2027/blob/59e02af2f877774c660cfd067f1ea9881ec89477/docs/reviews/2026-11-09-gallery-switch-lifecycle/browser-proof.md) umfasst 12/12 synthetische lokale Browserfälle mit genau diesen Produktionsbytes. Er ist ein historischer Beleg, keine neue Live-/Handyabnahme.

## Grenze und nächster Schritt

Root kann diesen Integrationscommit übernehmen. Vor einer späteren Veröffentlichung weiterhin frischer Abgleich der aktiven Quellen, aller 36 Styles, beiden fremden aktiven Quelldateien, Wrapper und HTML. Der Repository-Build ist ausdrücklich kein Ersatz für den Build mit den geschützten aktiven Serverquellen. Das bestehende Paket darf nur bei unveränderten Vorbedingungen verwendet werden; alte gehashte Bündel müssen für offene Kundensitzungen erhalten bleiben.

Danach Designwechsel, absichtlichen Ladefehler und Zurück im echten Einstieg prüfen. Keine pauschale Gesamtladezeitverbesserung zusagen: Abbruch eines Browserabrufs beendet nicht sicher bereits laufendes serverseitiges Rendering; der äußere Pakettransfer ist unabhängig. Rücknahme betrifft ausschließlich beide vorherigen Quellen und den daraus kontrolliert erzeugten Editorstand, keine Daten oder Produktzuordnungen.
