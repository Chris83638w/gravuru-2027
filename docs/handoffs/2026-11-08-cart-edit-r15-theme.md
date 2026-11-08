# R15 beim Warenkorb-Bearbeiten: Theme-Link ergänzen

## Konkreter Folgefehler und Umfang

Root hat PR #209 veröffentlicht und die echte Shopify-Strecke geprüft. Die R15-Oberfläche blieb beim Kundenabschluss aktiv, die Warenkorbaktualisierung gelang mit gleichem Preis, aber der im Theme gerenderte Bearbeiten-Link enthielt weiterhin kein `ui`. Ursache: `snippets/gravuru-warenkorb-bearbeiten.liquid` baut seinen Link selbst aus der aktuellen Warenkorbposition und ignorierte die gespeicherte Darstellungswahl in `_gravuru_bearbeiten`.

Dieser Folgefix ergänzt ausschließlich diese einzelne Theme-Datei. Der bestehende lokale App-Proxy-Link und seine Produkt-/Varianten-/Konfigurations-/Revisions-/Zeilen-/Rücksprungwerte werden weiter aus derselben Warenkorbposition erzeugt. Aus dem gespeicherten Link wird nur ein einzelner exakter `ui=prio-r15`-Parameter übernommen. Keine fremde Zieladresse und keine darin gespeicherten IDs werden übernommen. Mehrfachwerte, andere Werte, nur im Fragment stehende Werte und Werte ohne Query bleiben wirkungslos. Legacy-Zeilen behalten ihren bestehenden Link.

Nutzerauftrag und Root-Freigabe: den freigegebenen Aufbau beim Bearbeiten erhalten; keine neue Oberfläche. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unverändert. Keine Design-, Preis-, DB-, Server- oder sonstige Themeänderung. Kein Livezugriff durch den Unteragenten.

## Exakte Livebasis statt pauschaler Git-Dateikopie

Root hat das MainTheme `190984126844` unmittelbar vorher über den Shopify-Connector ausgelesen. Gesicherter Originalstand:

- Datei: `outputs/r15-final-corrections-20261108/gravuru-warenkorb-bearbeiten.before.liquid`
- MD5 entsprechend Shopify: `62fe3f4568d23eb44587cce516da312d`
- SHA-256: `7867ca8c4e3dd72e2edf1b33ca9ca2dc667c42cd682eec5863a59e155d7c9cfd`

Die Git-Fassung enthält bereits einen zusätzlichen `_gravuru_bild`-Vorschaufallback, der in diesem Live-Snippet fehlt. Diesen Unterschied gleicht der Fix ausdrücklich nicht an. Die Git-Datei behält ihren Fallback; das deploybare Einzeldatei-Paket entsteht durch exakt dieselbe R15-Ergänzung auf dem unveränderten Live-Export. Eine Renderprüfung und ein bytegenauer Rückvergleich sichern diese Trennung.

Deploybare Datei: `outputs/cart-edit-r15-theme-20261108/patch/snippets/gravuru-warenkorb-bearbeiten.liquid`

- Nachher-MD5: `f8c59d746d2413eae1b99f004bfac860`
- Nachher-SHA-256: `60217e0334a091285e85cf5178faa8e948157fb60298e3e9c13c0570f6a181dc`

Root prüft den aktuellen Vorherchecksum, aktualisiert ausschließlich diesen Theme-Dateischlüssel, liest ihn erneut und vergleicht den Nachherchecksum. Kein Serverneustart, kein Editorbundle-Build und keine Datenbankmutation nötig. Danach Warenkorb neu laden, tatsächlichen Link auf `ui=prio-r15` prüfen und denselben Konfigurationsstand öffnen. Bereits per PR #209 gesicherte R15-Positionen können vom korrigierten Theme-Link profitieren, ohne ihre Daten erneut zu schreiben; ältere Positionen ohne gespeicherte Darstellungswahl bleiben Legacy.

Rollback: ausschließlich denselben Theme-Dateischlüssel aus dem exakten Live-Backup zurückstellen und Checksum vergleichen. Keine Warenkorbposition löschen oder historische Gestaltung verändern.

## Gezielte Prüfung

7/7 Tests grün, 0 übersprungen, ca. 219 ms. Tatsächliche Liquid-Auswertung für die Live-Patchfassung und die Git-Fassung; kein Spiegeltest eines selbst erfundenen URL-Parsers. Getestet: korrekter gespeicherter R15-Wert, fremde gespeicherte Zieladresse/IDs werden nie übernommen, 13 fehlende/ungültige/doppelte/Fragmentfälle, normale native Zeilen bytegleich zur jeweiligen Ausgangsausgabe, Legacy-Link unverändert. Die beiden Shopify-Bildfilter sind im Test explizite unbenutzte Stubs; Vorschaubildfallbacks werden nicht als neu geprüft behauptet. `doc` und `stylesheet` werden nur für den unabhängigen Renderer mechanisch ausgeblendet bzw. als Style-Markup ersetzt. Der Produktionscode bleibt unverändert Shopify-Liquid.

Test: `node --test ops/shopify/cart-edit-r15-theme.test.mjs`.

Explizite lokale Testabhängigkeit: [LiquidJS](https://liquidjs.com/tutorials/setup.html) `10.30.1`, kein neuer Produktionsbestandteil. Npm-Paket `https://registry.npmjs.org/liquidjs/-/liquidjs-10.30.1.tgz`, vor dem Entpacken SHA-512 geprüft: `P1Iz14WUHZdfbOYwHOIhtl/iAWIOYk1ks5l9rPZlDM6vZo+6BLeYIuWHAPkIz+U8Mm8HKZKITIrjX7DQJO2fqA==`. Verwendetes `dist/liquid.browser.umd.js` hat SHA-256 `170bc09c38dd37f41aa3d031de14228f3aadc53e0ed54ee1f0d5bdc4620a60a2`. Standardtestpfad `.local-data/liquidjs/package/dist/liquid.browser.umd.js`, alternativ `GRAVURU_LIQUIDJS_MODULE` auf diese lokale Datei setzen. Mit `GRAVURU_THEME_PATCH_OUTPUT` kann der Test das deterministische Live-Patchartefakt schreiben. Ohne vorhandenen Renderer schlägt die Prüfung ausdrücklich fehl, statt unbemerkt zu überspringen.

Die Parameterzerlegung verwendet vorhandene Shopify-Liquid-Filter, insbesondere [split](https://shopify.dev/docs/api/liquid/filters/split). Kein Schema oder neuer Einstellungswert wird eingeführt.

Gitbasis: PR #209, Commit `71f5f4d`, eigener Branch `dev/mika-cart-edit-r15-theme-20261108`. Root übernimmt Review, Upload und reale Browserabnahme. Die grüne lokale Prüfung behauptet keine bereits erfolgte Veröffentlichung.
