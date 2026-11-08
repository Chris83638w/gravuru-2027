# R15 – freigegebene Bedienkorrekturen, SVG und Nachladen

Stand 08.11.2026, 17:36 Berlin. Auftrag: „Setze alles um“. Laufzeit seit 17:28:22 Berlin veröffentlicht. Kein weiterer Layoutumbau freigegeben.

## Tatsächlich online

- Desktop: kompakte Leiste mit Vollansicht/Zurück zur Konfiguration, Zurücksetzen, Rückgängig, Wiederholen, Hilfe und Ebenen unter dem Produkt; obere doppelte Werkzeuge in der Desktop-Vollansicht entfallen.
- Produktnahes graues Vergrößerungssymbol, kein grauer Querbalken. Runder Plusknopf bleibt. Sichtbarer Produkt-Zurück-Button mit Pfeil.
- Doppelklick bzw. Doppeltippen ausschließlich auf freie weiße Vollbildfläche schließt die Vollansicht. Produkt, Elemente und Bedienelemente sind ausgenommen.
- SVG-Außenmaße und ViewBox dürfen unterschiedliche Seitenverhältnisse besitzen. Normalisierung respektiert preserveAspectRatio und beschneidet nur entsprechend der SVG-Spezifikation. Sicherheits-/Vektorregeln bleiben. Bereits akzeptierte v1-Ausgaben sind bytegleich.
- Erste sechs erlaubte Motive werden vorbereitet; erste drei authentifizierte Designvorschauen laden im Editor vor Taböffnung. Produktseiten-Vorwärmen startet früher.

## Sicherung / Veröffentlichung

- Quellbranch: `dev/mika-r15-final-feedback-20261108`, Laufzeitcode `ad9b24a793e3052f29e278652a561d47549e548d`, [PR219](https://github.com/Chris83638w/gravuru-2027/pull/219).
- Vorher: `private/mika-r15-assets-20261108-v1`.
- Unveränderte Sicherung vor Eingriff: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-r15-before-final-feedback-20261108-v1`. 1.439 Quelldateien/ops/scripts/package/Wrapper; Manifest SHA256 `d3fe988b33b512f75045b306be3b4b39541a3b15afb2109976e90133c1bdf1cf`. Keine vollständige VPS-/Datenbanksicherung behaupten; vorhandene private Datenbanksicherungen bleiben bestehen.
- Aktiv: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-r15-final-feedback-20261108-v1`.
- Paket `outputs/r15-final-feedback-20261108/r15-final-feedback-v1.tar.gz`, SHA256 `2c73b67eed626388c75af2d5747e3153b29307a873f3ccf777ca45b07bcaa28e`.
- Zwölf Laufzeitdateien, 1.052 sonstige App-Dateien vor/nach bytegleich. Alle 36 aktiven Styles erhalten. Keine Produkt-, Theme-, Galerie-, Preis- oder Datenbankmutation durch Veröffentlichung.
- Wrapper vorher SHA256 `d1727087287f51f218b0fd2ccfadd97e1b81e104a246ad71080e36320b8fc372`, danach `8127113f65285489b5dfcde46dc9462159703cf43f6e6c5081f01a6a776e4dcf`.
- Bundle `editor-9651e7f6d9a7a1f9.mjs`; 152 Module, 16 gebündelte Styles. Die zusätzlichen mobilen Darstellungsdateien separat ausliefern; `compact-controls.mjs` ist ausdrücklich in der Asset-Allowlist enthalten. Ein fehlender Allowlist-Eintrag wurde bei der lokalen Browserabnahme erkannt und vor Veröffentlichung behoben.
- Server `prepared-receipt.json` und `activated-receipt.json` in der aktiven Runtime; `pre-switch-backup` enthält bisherigen Wrapper und ersetzte Quellen.

## Nachweise und Grenzen

- 59 gezielte UI-/Asset-/Touchtests, 66 Lade-/Build-/Shopclienttests, 29 SVG-/Medien-/Preis-/Historientests sowie ein unabhängiger RGBA-Renderervergleich bestanden. Die 66 Fälle zusätzlich im integrierten Baum wiederholt; nicht doppelt zählen.
- Lokaler Browser mit tatsächlich aktiven Styles; anschließend echte Shopify-Einbettung geprüft. Desktop und 390 × 844 Chrome-Touchsimulation, kein physisches Smartphone.
- Freiflächen-Doppelklick und Doppeltippen schließen lokal und live die Vollansicht. Produktnahes Icon und sichtbarer Zurück-Button beobachtet. Native Aktionen weiterverwendet.
- Synthetisches SVG mit width=200, height=100 und quadratischer ViewBox: tatsächliche serverseitige Vorschau akzeptiert, weißes Loch erhalten, im Editor übernommen. Preis 21,68 → 34,67 EUR (+12,99), Verschieben funktioniert, nach Entfernen wieder 21,68 EUR. Original-Kundendatei nicht vorhanden; kein beliebiges SVG als geprüft behaupten.
- Motiv mehrfach bewegt und per Rückgängig auf Ausgangstransform `translate(65.8414306640625 10) rotate(0)` zurückgeführt. Touchsimulation hatte zwischenzeitlich einen Steuerungs-Timeout; abgebrochenen Pointer bereinigt und nächste Bewegung geprüft. Kein physischer Edge-Handynachweis. Testlogo wieder entfernt. Kein neuer Warenkorbabschluss/Kauf.
- Live-Ressourcen zeigen drei zusätzliche `design-gallery-preview`-Abrufe vor Öffnen des Designreiters (ca. 1,8–3,5 s pro Vorschau auf dieser Verbindung). Es ist damit noch keine hinreichend schnelle kalte Mobilverbindung nachgewiesen.
- Beim ersten Abruf unmittelbar nach Passenger-Neustart zeigte Shopify kurz einen Drittanbieterfehler; anschließendes Neuladen erreichte den vollständigen Editor. Nicht als dauerhafter Fehler oder als unterbrechungsfreie Umschaltung darstellen.
- Browserbilder: `outputs/r15-final-feedback-20261108/live-desktop.png`, `live-desktop-fullscreen.png`, `live-mobile.png`, `live-svg-viewport-preview.png`.

## Noch in Arbeit, nicht als online bezeichnen

Designbilder bereits auf der Shopify-Produktseite: eigener persistenter öffentlicher Vorschauindex, an erlaubte Produktrevision, Optionen, Renderer und Assets gebunden, maximal drei Startkarten. Keine privaten Kundengestaltungen/Uploads; kein Renderauftrag pro Startticket. Agent `module_contract` implementiert getrennt, `module_runtime` prüft Entzug, Mandanten und veraltete Daten. Root übernimmt Integration/Tests/Veröffentlichung gesondert. Bereits freigegebenes Layout bleibt unverändert.

Module: PR217 und Aktivierungstransaktion PR214 bleiben getrennt vorbereitet; keine neuen Produktprofil-Zuweisungen durch dieses Release.

## Rücknahme

Vor jeder Rücknahme aktuelle Wrapper-/Dateihashes prüfen. UI-/Performancepatch getrennt rücknehmbar. **Alten SVG-Worker nicht pauschal wiederherstellen, sobald neu akzeptierte SVGs in Kundengestaltungen gespeichert wurden:** sonst kann deren erneute Prüfung scheitern. Den kompatiblen neuen Worker erhalten oder vorher eine kompatible versionierte Rücknahme prüfen. Keine Datenbank/Produkte zurücksetzen.

## Kundenlinks

- [Produktseite](https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen)
- [Konfi](https://gravuru-design.myshopify.com/apps/konfigurator/start?product=16190784438652&variant=58104606556540&ui=prio-r15)

Keine signierten Sitzungstokens oder Zugangsdaten in diese Übergabe schreiben.
