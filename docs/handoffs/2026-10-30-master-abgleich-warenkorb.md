# Warenkorb-Nachtrag und Master-Abgleich – 30.10.2026

## Auftrag und Grenze

Chris: „mach das . gedenk d sprechen wir ab“. Gemeint sind die gezielte Korrektur der technischen Warenkorbanzeige und der GitHub-Konfliktabgleich. Die Gedenktafel-Migration bleibt ausdrücklich einer separaten Abstimmung vorbehalten.

## Live-Theme

Im bestehenden MAIN-Theme **185833718140**, `gravuru-shopify-theme/production`, wurden ausschließlich `sections/main-cart.liquid` und `sections/cart-drawer.liquid` geändert. `cart-native-proof-visibility.patch` unter `ops/shopify/theme-block/` dokumentiert die Einfügung.

Bei nativen Positionen mit `_gravuru_config` **und** `_gravuru_rev` wird `Bearbeitbarer Entwurf` nicht mehr öffentlich ausgegeben. Der Wert bleibt gespeichert und für die Preisfunktion verfügbar. Vorschau und Bearbeiten-Link unter dem Bild bleiben erhalten. Der Filter der älteren Strecke bleibt unverändert.

| Datei | MD5 vorher | MD5 nachher |
| --- | --- | --- |
| main-cart.liquid | cfe9ad015aaee9a226d5337ed744fd77 | 4ceaa84cea8ad8730f59837a350089fc |
| cart-drawer.liquid | a97c0339a1a64b844357d90b4fa46519 | 1d2910e4bb8b8cd65fa1c828ef83814a |

Beide Dateien im angemeldeten Shopify-Admin gespeichert und danach vollständig über die lesende Anbindung zurückgelesen: exakt die geprüfte Einfügung plus ein abschließendes LF je Datei, keine weitere Änderung. Private Vollsicherungen vorhanden. Rückweg: nur die drei eingefügten Liquid-Zeilen entfernen; spätere fremde Theme-Änderungen nicht mit einer alten Vollkopie überschreiben.

Prüfung: **6/6 Liquid-Renderfälle**, native/ältere/normale Position je Datei; Schema-JSON und eindeutige Setting-/Block-IDs gültig. Shopify-Editor ohne Fehler, bereits vorhandene Warnungen unverändert. Der offizielle lokale Theme-Validator war wegen fehlendem `@shopify/theme-check-common` nicht verfügbar.

Live-Warenkorb nach Neuladen: technischer Hinweis weg, **fünf Bearbeiten-Links**, **fünf Positionen**, unverändert **134,00 EUR**. Der Screenshot und vollständige Quellen bleiben privat. Keine Warenkorbmutation, Bestellung oder Zahlung. Keine gesonderte visuelle Drawer-Abnahme behauptet: Der Shop verwendet die Warenkorbseite.

## GitHub-Abgleich ohne Oberflächenwechsel

`main` **b544f54d42f4f0dc635bf595d17daecbbb383d46** kontrolliert in `dev/konfi-live-20261030-astra` aufgenommen. Der gesamte Baum `app/` bleibt exakt identisch mit dem veröffentlichten Stand vor diesem Abgleich (**5db1e56**, Laufzeit **5f69917**). Auch die vorhandenen Anwendungstests bleiben unverändert.

Die neueren Funkklingel-Präsentationsmodule, ihre Integration und der nur dafür gedachte `check-doorbell-presentation.mjs` werden nicht Teil dieses Masters. Sie bleiben in der ursprünglichen main-Historie nachvollziehbar. Historische Hand-offs und unabhängige Offline-Designhilfen aus main werden bewahrt. Die zugehörigen Tests `doorbell-design-revision.test.mjs` und `prepare-doorbell-design-repair.test.mjs`: **4/4**, 0 Fehler/Skips. LF-Zeilenenden und Konfliktmarker geprüft.

Kein neuer Vollauf für den unveränderten Anwendungscode behauptet; die bisherigen abgestuften Live-Nachweise stehen in [der Master-Übergabe](2026-10-30-konfigurator-master-live.md). Keine neue Laufzeit veröffentlicht, kein Neustart, keine DB-/Katalogänderung, Master-Tag `konfigurator-master-20261030` bleibt auf `ce7c866`.

PR #77 bleibt zur Prüfung offen; #58 ist darin enthalten und darf nicht unabhängig doppelt übernommen werden. Nächster Schritt: den konfliktfreien Abgleich in #77 prüfen. Gedenktafel, echtes iPhone/Safari sowie Bestell-/Fertigungsabnahme bleiben separat offen.
