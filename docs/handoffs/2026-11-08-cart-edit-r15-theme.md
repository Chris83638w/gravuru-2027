# R15 beim Warenkorb-Bearbeiten: Theme-Link ergänzen

## Nachtrag: echte Shopify-Property-Ausgabe geprüft

Der erste Theme-Patch wurde gespeichert, bestand aber die echte Warenkorb-Abnahme nicht. PR #209 liefert den Darstellungswert korrekt in der privaten Eigenschaft; Shopify gibt diese Eigenschaft in Liquid jedoch mit `&amp;` statt rohem `&` aus. Der erste lokale LiquidJS-Test benutzte normale JavaScript-Objekte und bildete diesen Shopify-Drop-Unterschied nicht ab. Der folgende Nachweis korrigiert diese Testgrenze ausdrücklich.

Im bereits vorhandenen unveröffentlichten Theme `190557716860` wurde ausschließlich `templates/cart.gravuru-r15-diagnostic.liquid` neu angelegt, ohne bestehende Dateien oder das MainTheme zu ändern. Root öffnete die echte Shopify-Vorschau mit dem Testwarenkorb. Der Diagnosetext gibt nur Zeilennummer, Zähler und Boolesche Werte aus, keine URLs, Namen oder Kundendaten. Bei der R15-Position: fünf Entity-Trenner, zwei Queryteile, vor Normalisierung UI-Zähler 0 / R15 false, nach einmaligem `replace: '&amp;', '&'` UI-Zähler 1 / R15 true. Bei beiden älteren Positionen ohne gespeicherte Darstellungswahl bleibt der Zähler 0. Diagnose-MD5: `0e8836227a4c06ec9bf0fd5b59f04614`; Quelle liegt neben dem Prüfbeleg. Root-Belege: `outputs/r15-final-corrections-20261108/shopify-liquid-entity-diagnostic.txt` und `.jpg`. Eine [bereits gemeldete Shopify-Liquid-Abweichung](https://github.com/Shopify/liquid/issues/1696) half bei der Hypothese; der konkrete Nachweis stammt aus diesem Shop.

Die abschließende Korrektur ergänzt **nur einen Filter** vor dem unveränderten Query-/Fragmentparser. Kein allgemeines HTML-/URL-Decoding, keine neue Zieladresse, keine andere ID und keine Lockerung der Einzelwertprüfung. Eine neue Regression zeigte zunächst zwei Fehler, danach bestehen 9/9 gezielte Tests, darunter HTML-escaped, doppelte, fremde und nur im Fragment stehende Werte. Ein unabhängiger Read-only-Review bestätigte zusätzlich 13 Varianten einschließlich gemischter, doppelt codierter und feindlicher URL-Inhalte.

Aktuelles Einzeldatei-Paket: `outputs/cart-edit-r15-theme-entities-20261108/patch/snippets/gravuru-warenkorb-bearbeiten.liquid`; Backup im benachbarten `backup`-Ordner. Gegen die aktuell gespeicherte Livefassung wurde bytegenau geprüft, dass ausschließlich dieser Filter hinzukommt.

- Erwarteter aktueller MD5: `f8c59d746d2413eae1b99f004bfac860`, SHA-256: `60217e0334a091285e85cf5178faa8e948157fb60298e3e9c13c0570f6a181dc`.
- Neuer MD5: `b83738890b508a1de9f0be80333e2456`, SHA-256: `e9e4f2b65cc7aac3d222d298fe0f34aa48706f39336db1f809778de6ec16e1b2`.

Nur Root/Nutzer übernehmen das MainTheme-Speichern und die abschließende echte Link-/Wiederöffnungsprüfung. Bis dahin ist der Status vorbereitet, nicht live abgenommen. Kein Serverneustart und keine Warenkorbdatenänderung nötig. Nach der Diagnose den Browser wieder auf das MainTheme umstellen.

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
