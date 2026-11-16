# Lokaler Merge-Vorabcheck für Claude

11.11.2026. **30 Konfliktpfade: 20 Runtime-Dateien, neun Tests, STATUS.md.** Kein Checkout, Branchwechsel, Konfliktlösung, Commit oder Liveeinbau. HEAD und sämtliche Refs blieben identisch; der Historyclone hat weiterhin keinen Index. `merge-tree` erzeugte ausschließlich Vergleichsobjekte. Die noch fehlenden Promisor-Blobs wurden lesend von GitHub geladen.

| Bezug | Exakter Stand |
|---|---|
| Unsere Spitze, Stage 2 / ours | `b7f5ca2ac639462a4148fadd662b4b89466c484c` |
| Claude, Stage 3 / theirs | `ac10e6cee00469591514dcb4fa477b0547a54c48` |
| Gemeinsame Basis, Stage 1 | `7b8bc287012140cb3aba05f2aadbbe52248c6a55` |
| Unaufgelöster Vergleichsbaum | `44b286158d33e1c42640ddac15393b33ca0c03ab` |

Der vollständige, nicht flache Historyclone bestätigt eine gemeinsame Git-Basis. Die beiden Linien sind auseinanderentwickelt, **nicht historisch unabhängig**. Der `app`-Tree von b7f5ca2 ist exakt identisch zu 64e026e. Der Vergleichsbaum enthält Konfliktmarker und ist kein ausführbarer Integrationsstand.

## Konflikte und kleinster sinnvoller Prüfplan

Die Kurzpfade beziehen sich auf `app/`. Vollständige Pfade, alle drei Blobstände, Markerpositionen und Konfliktarten stehen in `merge-preview.json`. Quelltextkontexte wurden aus dem veröffentlichten JSON weggelassen; für die Auflösung die gepinnten Git-Blobs lesen.

| Reihenfolge | Konfliktdateien im Runtimecode | Erforderlicher Abgleich |
|---|---|---|
| 1. Ablage, Cache und Bindungen | `workshop/repository.mjs`, `catalog-live-orders.mjs`, `shop-product-binding-store.mjs`, `http.mjs` | Native Modulquellen-/Snapshotmethoden mit R15-Leseepochen und unveränderlichen Revisionsbelegen zusammenführen. Unterschiedliche `approval`-/`resolve`-Signaturen und Aufrufer gemeinsam prüfen. In HTTP beide Dienste initialisieren, exportieren und schließen; Worker, Warm-Timer, publicPreviewModel und Suchstatistik erhalten. |
| 2. Preis-/Kundenweg | `workshop/cart-personalization.mjs`, `shop-entry.mjs` | V3-Optionspreise neben bestehenden V1/V2-Verträgen erhalten; keine Kauf-/Revisionsprüfung verlieren. Galerieparameter `q` zusammen mit `withCustomerReadScope` und öffentlichen Vorschauanhängen weiterreichen. |
| 3. Editorvertrag | `configurator/variant-m/{contract,element-rights,logo-upload,module-profile,ux-model,ux}.mjs` | Bestätigtes Foto+SVG auf Hauptacryl und AUS bei Kleinprodukten erhalten. Cross-Realm-Prüfung mit `constructor.prototype===prototype` beibehalten; Galerie-Elementrechte gegen R15-Workbench abgleichen. Sichtbarkeits-Lader und Tabwechsel nicht durch pauschale Dateiauswahl verlieren. |
| 4. Galerie | `configurator/variant-m/product-design-gallery.mjs`, `workshop/shop-design-gallery.mjs`, `workshop/ui/shop-design-switch.mjs` | Suchquery/Pager/Analytics mit R15-Abbruch laufender Vorschauen, `AbortSignal`, Preview-Aktivität und Aufräumen verbinden. `start(...,{cardModel})` erhalten. Schnelltippen, Wechsel und pagehide dürfen weder alte Karten nachliefern noch laufende Anfragen hinterlassen. |
| 5. Dashboard | `workshop/design-dashboard.mjs`, `workshop/ui/design-dashboard-ui.mjs` | Konflikt ist die Rangfolge `katalogPrio` gegen `herkunftRang`. Bestätigte Originalpriorität in Server und Oberfläche konsistent halten. Automatisch übernommene Worker-Cachefunktionen zusätzlich prüfen. |
| 6. Mobile Vorschau | `configurator/mobile-demo/{assets,demo,preview-action}.mjs` | R15-Compact-Controls, Assetfreigabe und bestehende Vorschauanordnung erhalten; Lebenszyklus/Dispose und Zoom prüfen. Kein neuer Viewer aus den beiden Varianten ableiten. |
| 7. Logbuch | `STATUS.md` | Beide belegten Arbeitsstände zusammenführen, ohne den Vorabcheck als Installation auszugeben. |

**Drei add/add-Konflikte:** `mobile-demo/preview-action.mjs`, `variant-m/module-profile.mjs`, `variant-m/module-profile.test.mjs`. Die übrigen 27 sind Inhaltskonflikte. Eine pauschale Auswahl von ours/theirs würde auf beiden Seiten Funktionen verlieren; es wurde keine solche Auswahl getroffen.

Die neun konfliktbehafteten Tests gehören zu den jeweiligen Gruppen: `mobile-demo/demo.test.mjs`; `variant-m/module-profile.test.mjs`, `ui-event-regressions.test.mjs`, `view-zoom.test.mjs`; `workshop/cart-personalization.test.mjs`, `customer-vector-logo-media.test.mjs`, `shop-entry-client.test.mjs`, `shop-entry.test.mjs`, `shop-product-binding-store.test.mjs`. Beide Testabsichten erhalten und nach der tatsächlichen Auflösung zusammen ausführen. Die konkreten weiteren Prüfkommandos stehen in `integration.md`.

## Automatisch zusammengeführt ist noch nicht geprüft

Git meldet sechs textuell konfliktfreie automatische Zusammenführungen: `variant-m/server.mjs`, `variant-m/view-zoom.mjs`, `workshop/customer-vector-logo.py`, `workshop/shop-design-gallery.test.mjs`, `workshop/shop-preparation.mjs`, `workshop/ui/shop-entry-client.mjs`. Diese Ergebnisse müssen insbesondere zu den manuell gelösten API-/Upload-/Abbruchverträgen passen. Es wurden auf dem unaufgelösten Baum bewusst keine Build-/Laufzeittests als bestanden ausgegeben.

**Die 19 tatsächlich abweichenden Serverdateien sind in diesem Vergleich nicht enthalten.** Darunter überschneiden sich `contract.mjs`, `ux.mjs` und `shop-entry.mjs` direkt mit Konflikten; `shop-preparation.mjs` wird von Git automatisch zusammengeführt und ist trotzdem live abweichend. Auch `product-preview.mjs` und die übrigen gemeldeten Serverdateien brauchen den gesonderten, gesicherten Dreierabgleich. Weder eine erfolgreiche Textauflösung noch diese 30er-Liste ersetzt ihre Sicherung/Übernahme.

Reproduktion im vollständigen Historyclone ohne Checkout:

```sh
git -c core.autocrlf=false merge-tree --write-tree --messages -z b7f5ca2ac639462a4148fadd662b4b89466c484c ac10e6cee00469591514dcb4fa477b0547a54c48
```

Exitcode 1 bedeutet hier nachgewiesene Konflikte, keinen abgebrochenen Git-Lauf. Rohbeleg `merge-preview.raw`; unveränderte HEAD-/Ref-Prüfsummen und Parameter in `merge-preview-run.json`; klassifizierte vollständige Ergebnisse in `merge-preview.json`. Dieser Vorabcheck verringert die Sucharbeit für Claude, schätzt aber weder Integrationsdauer noch Livefreigabe vorweg.
