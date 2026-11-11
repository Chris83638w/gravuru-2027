# Editor-Integration – lokaler Abschluss

Stand: 11.11.2026. Arbeitsbaum `work/issue230-integration-candidate`, laufender Merge `0e200d8` (B/C/v9) + `ac10e6cee00469591514dcb4fa477b0547a54c48` (R15), zusätzlich gesicherte Serverdateien aus `0d6d23d94d088d17b61397237537fdf42260117c`. Keine Serveraktion, kein Git-Add, Commit oder Push durch diesen Agenten. Runtime-Code eingefroren; Root übernimmt Gesamtbuild und Browserabnahme.

## Ergebnis der Konfliktlösung

- **Designsuche + R15-Ladeverhalten zusammengeführt:** Suchbegriff und Seitenabfrage bleiben verbunden. Jeder Such-/Ausführungswechsel verwirft alte Listen und bricht alte Vorschauanfragen ab; verspätete Ergebnisse erzeugen keine sichtbaren Bilder oder Blob-URLs. R15 behält zwei parallele Vorschauladungen, drei zunächst vorbereitete Bilder, Save-Data, Pausieren beim Produktwechsel und vollständige Aufräumung beim Verlassen. Neue Laufzeitregression verwendet das echte Suchsteuerelement.
- **Bestätigte Uploads erhalten:** Hauptacryl Gravur darf Foto und geprüftes SVG gleichzeitig; native Modulprofile bleiben verbindlich. Die sechs kleinen Produktprofile werden dadurch nicht erweitert. Materialfarbige SVG-Vorschau ändert keine Produktionsbytes. R15s Reiter-Rückfall respektiert deaktivierte Module; Legacy-Produkte behalten den bisherigen Text-Reiter.
- **Modulprofile:** Die strengere B/C-Prüfung erlaubt echte Elternfenster-Objekte, weist Klassen, Arrays, eingeschmuggelte Prototypen und ungültige Felder/Versionen weiter ab. R15s zusätzlicher Frame-Regressionstest wurde mitgeführt. Kein Getter wird zum Lesen des Konstruktors aufgerufen.
- **Galerie-Werkstatt:** Normale eingebettete Werkstatt behält ihre Bearbeitung. Im Galerie-Kontext bleiben technische Ebenen, Hilfslinien und Rastermotive geschützt; die B/C-Erhaltung von Originalmedien bleibt eingebunden.
- **Zoom:** `view-zoom.mjs` ist unverändert exakt R15/ac10. Die zusätzlichen Tests zu verlorenem primären Touch und ersetztem SVG-Ziel wurden übernommen. Keine neue Zoomlogik.

## Aktuelle Serverdeltas

Alle 11 diesem Agenten zugewiesenen Dateien aus dem 19-Dateien-Snapshot wurden geprüft. Sechs entsprechen im endgültigen Kandidaten exakt dem gesicherten Serverstand: `acrylic-scene.css`, `acrylic-scene.mjs`, `scalable-size-state.mjs`, `workshop-review.mjs`, `family-formats.mjs` und die neue `scalable-acrylic-scene.mjs`.

**Historische Nachprüfung nach Claudes [Operatorbeleg](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6805603018):** Die zunächst übernommenen Serverfassungen von `modern-navigation.css` und `view-zoom.css` hatten keinen belegten neueren Auftrag. Ausschließlich die eigenen Übernahmen dieser beiden Dateien wurden deshalb zurückgenommen; beide sind jetzt bytegleich ac10/B/C. Die breitere Git-Basis enthält spätere Arbeit, ist aber nicht automatisch in jedem einzelnen Modul neuer.

**Belegte Ausnahme `family-formats.mjs`:** [Commit 586a7541](https://github.com/Chris83638w/gravuru-2027/commit/586a7541dfa5b973e9a790d0954f964f62057d3e) vom 08.11. enthält exakt den übernommenen Diff; seine [Übergabe](https://github.com/Chris83638w/gravuru-2027/blob/586a7541dfa5b973e9a790d0954f964f62057d3e/docs/handoffs/2026-11-08-steel-shape-text-fix.md) dokumentiert die ausdrückliche Freigabe für vollständige Namensgruppen beim Formenwechsel. Die Dateihistorie in ac10 endet bereits am 03.11. mit `3d763b2` und enthält den Fix nicht. Ein zusätzlicher isolierter Vergleich beider tatsächlichen Module belegt: Eingabe `name=Test Eins`, `name-2=Familie` → ac10 gibt `Test`/`Eins` aus, Kandidat erhält `Test Eins`/`Familie`. Der Fix bleibt deshalb mit Roots bestätigter technischer Abstimmung erhalten. Keine neue Namensregel und keine Ausweitung der Spruchübernahme; die vorherige Übernahme anderer geänderter Texte bleibt bestehen. Belege: `agent-editor-history-review.json` und `agent-editor-name-negative-control.json`.

In `contract.mjs` wurde ausschließlich die zusätzliche Validierung des gespeicherten `customerUI.presentation`-Werts integriert; B/Cs Acryl-SVG-Regel bleibt erhalten. In `ux.mjs` wurde der allgemeine Aufruf des Acryl-Installers integriert; dessen enger Filter routet ausschließlich skalierbaren Acryl-Farbdruck in die neue Szene. Die B/C-Suche, Uploadregeln und R15-Ressourcensteuerung bleiben erhalten.

**Bewusste Abweichung:** `option-media.mjs` bleibt auf dem gemeinsamen B/C-/ac10-Stand mit getrennten Symbolen für KGL/glatt und KRA/rau. Der Server-Snapshot aliasiert beide wieder auf dasselbe Symbol und entfernt den bereits dokumentierten Hinweis „Chris 03.11.2026“. Die vorhandene UI-Regression verlangt getrennte Symbole und besteht. Dies wurde Root zur Integrationsentscheidung gemeldet; keine neue Produktregel erfunden.

Die neue Acrylszene verändert nur die Vorschau: physische Seitenverhältnisse und vorhandene Sockelanker stammen aus dem nativen Profil, weiße Motive und verschachtelte Fotomasken bleiben erhalten. `svgBody(false)` umgeht den Vorschau-Umbau vollständig. Beim Größenwechsel werden nur unveränderte originale Motiv-/Masken-/Assetreferenzen auf die passende Zielreferenz übertragen; eigene Uploads, Ersatzmotive und Ausschnitte bleiben erhalten. Formwechsel übernimmt eine geänderte mehrteilige Namensgruppe vollständig, sodass ein mehrwortiger Vorname keinen unveränderten Nachnamen überschreibt.

## Prüfungen

**180 unterschiedliche Prüfungen bestanden**, kein Skip: 10 Galerie-/Vorschauladung, 33 Modul-/Realm-/Zoom, 106 kombinierte Editorprüfungen und 31 Familien-/Resetprüfungen. Alle eigenen `.mjs`-Dateien bestehen `node --check`; keine Konfliktmarker in `app/configurator/variant-m`, `git diff --check` dort ohne Befund.

Ausgeführt aus dem Kandidaten:

```powershell
node --test app/configurator/variant-m/first-panel-preload.test.mjs app/configurator/variant-m/module-profile-realm.test.mjs app/configurator/variant-m/module-profile.test.mjs app/configurator/variant-m/view-zoom.test.mjs
node --test app/configurator/variant-m/first-panel-preload.test.mjs
node --test app/configurator/variant-m/scalable-acrylic-scene.test.mjs app/configurator/variant-m/scalable-sizes.test.mjs app/configurator/variant-m/contract.test.mjs app/configurator/variant-m/element-rights.test.mjs app/configurator/variant-m/logo-upload.test.mjs app/configurator/variant-m/ui-event-regressions.test.mjs app/configurator/variant-m/native-design-search.test.mjs app/configurator/variant-m/design-search.test.mjs app/configurator/variant-m/gallery-pager.test.mjs app/configurator/variant-m/gallery-workbench.test.mjs app/configurator/variant-m/material-surface-preview.test.mjs app/configurator/variant-m/product-design-gallery-label.test.mjs
node --test app/configurator/variant-m/family-formats.test.mjs app/configurator/variant-m/design-reset.test.mjs
```

Im ersten 43er-Lauf scheiterte ausschließlich der neue Suchtest an seiner falschen Erwartung `haus` statt des vertragsgemäß erhaltenen `Haus`. Nur die Testannahme wurde korrigiert. Danach bestanden alle 10 Tests dieser Datei; die übrigen 33 waren bereits grün. Die Runtime wurde dafür nicht geändert. Logs: `editor-first-tests.log`, `editor-preload-final.log`, `editor-combined-tests.log`, `editor-family-final.log` im selben Verzeichnis.

Nach Rücknahme der zwei CSS-Deltas: `node --test app/configurator/variant-m/view-zoom.test.mjs app/configurator/variant-m/design-reset.test.mjs` erneut **23/23 grün** (`editor-css-baseline-tests.log`), dazu der oben belegte echte Modulvergleich als Negativkontrolle. Diese 23 sind bereits in den 180 unterschiedlichen Prüfungen enthalten und werden nicht doppelt gezählt. Der endgültige Bildvergleich auf PC/Handy bleibt bei Root/Operator.

## Dateien und Übergabe

`agent-editor-merge.json` enthält die genaue Liste der 24 bearbeiteten bzw. bewusst erhaltenen Dateien mit Bytezahlen und SHA-256 sowie den Vergleich zum Server-Snapshot. Zusätzlich darin: der Read-only-Review von `server.mjs` und `view-zoom.mjs`. Die konfliktfreie Serverintegration enthält sowohl B/Cs Modulprofilroute als auch R15s weitere erlaubte UI-Ressourcen. Keine Änderung dieser beiden Dateien durch diesen Agenten.

Root: finalen Gesamtbuild und die kombinierte Browserprüfung aus diesem nach der historischen Nachprüfung eingefrorenen Stand verwenden, insbesondere mobile Suche mit Abbruch/Leeren, neue skalierbare Acrylszene samt Größen-/Sockelwechsel sowie Reset/Zoom/Fotoregler mit der erhaltenen ac10-CSS-Fassung. Diese lokalen Tests belegen keine Live-Installation, keinen Checkout und keinen Produktionsauftrag. Die übrigen acht Server-Snapshot-Dateien liegen bei den anderen Eigentümern; der vollständige 19er-Abgleich wird zentral zusammengeführt.
