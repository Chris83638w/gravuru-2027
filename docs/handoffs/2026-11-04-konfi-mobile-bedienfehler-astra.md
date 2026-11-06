# Handy-Bedienfehler im veröffentlichten Konfigurator

Stand 04.11.2026, Astra. Basis c731934, eigener Branch `dev/konfi-mobile-bedienfehler-20261104-astra`. Auftrag von Chris: bestehende freigegebene Gestaltung erhalten, fehlende feste Vorschau, Textauswahl und unlesbare Kopfzeile beheben; anschließend geprüft live stellen. Keine Änderung an Preisen, Produktdaten, Designs oder Kennungen.

## Ursache und begrenzte Korrektur

Die neue `modern-layout.css` überschrieb den vorhandenen mobilen Aufbau: `.ux-layout` scrollte insgesamt, während `.ux-editor` nicht mehr selbst scrollte. Die feste Bühnenhöhe 250 px passte bei ausgewähltem Text nicht in den verbleibenden Platz; die Vorschau schnitt Teile des Schildes ab. Zusätzlich reservierte die Desktop-Fußleistenregel auf dem Handy unnötige 68 px.

Die Korrektur stellt den vorhandenen mobilen Mechanismus wieder her: feste Vorschau innerhalb der viewportgebundenen Shell, nur Eingabefelder scrollbar, adaptive Vorschauhöhe aus `--ux-mobile-preview-h`, Bühne mit der tatsächlich verfügbaren Höhe, kein Desktop-Fußabstand auf dem Handy. Desktopregeln bleiben unverändert. Der vorherige Kontrastfix c731934 für Kopfwerkzeuge und Speichern bleibt enthalten. `position:relative` allein ist kein Sticky-Fehler: entscheidend ist, welcher Bereich scrollt.

## Eigene Prüfungen

- Nativer lokaler Editor mit vorhandenem Edelstahl-Prüfprodukt, Chrome 390 × 664 und 375 × 548 sowie Desktop.
- Eingabefeld außerhalb des sichtbaren Ausschnitts gewählt: Editor scrollt von 0 auf 131 px; Layout bleibt bei 0; Vorschau bleibt bei y=54, Höhe 332 px (390 × 664).
- Direkt auf Textobjekt auf dem Schild geklickt: Auswahl und passende Textwerkzeugleiste wechseln zum Namen; keine Änderung des Textinhalts. Bemaßung liegt innerhalb der Vorschau.
- Bei 375 × 548 Vorschau y=54/Höhe 274, Bemaßung endet bei y=296 und damit vor dem Vorschauende y=328; Preis/Navigation bleiben sichtbar. Vollbild geöffnet und verlassen, Auswahl bleibt erhalten.
- Keine JavaScript-Fehler oder Warnungen im geprüften lokalen Ablauf.
- 41/41 vorhandene Tests grün, 0 Fehler/Skips: `mobile-steps`, `mobile-standard-plate`, `toolbar-hosts`, `ui-event-regressions`; Build erfolgreich, `git diff --check` sauber.

Lokale Nachweise (keine Live-Abnahme): [390 × 664](2026-11-04-konfi-mobile-bedienfehler-astra/lokal-390x664.jpg), [375 × 548](2026-11-04-konfi-mobile-bedienfehler-astra/lokal-375x548.jpg), [Desktop](2026-11-04-konfi-mobile-bedienfehler-astra/lokal-desktop.jpg).

## Bereitstellung und Abgleich

Zum Zeitpunkt dieses Nachweises **noch nicht live**. Bekannte aktive Basis: `private/mika-konfi-korrektur-r2-20261104`, Bundle `editor-b28dfac637a5c2a7.mjs`, Startdatei-SHA `d1994393ac740f3acee602edc45f01e267d0daa5b39768bb06ec1559200a83fd`. Vor Auslieferung frisch vergleichen, bei Abweichung stoppen und neu abgleichen. Keine Datenbank zurücksetzen.

Mika bearbeitet separat Kategorie-Dropdown/Bestseller und mobile Navigation nach #161, siehe [Abstimmung](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6634834752). Dieser Fix baut diese Funktionen nicht doppelt. Gemeinsame Oberfläche nach Integration erneut prüfen. Der vollständige echte Shopify-Warenkorbtest bleibt bis dahin offen.

Der zuvor von Astra geteilte `/apps/konfigurator/start`-Direktlink leitet auf den App-Host weiter. Für den eingebetteten Shop-Einstieg die [Shopify-Produktseite](https://gravuru-design.myshopify.com/products/tuerschild-abger-ecken-v2a-personalisiert-leuchtturm-12x8) mit „Jetzt personalisieren“ verwenden. Ein Link auf die lokale React-Studie ist kein funktionierender Kundeneditor.
