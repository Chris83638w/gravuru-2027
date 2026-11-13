# Mobile Plattenansicht: Zurücksetzen außerhalb der Plattenzeile

13.11.2026. Lokaler, noch nicht installierter Fix. Exklusiv geändert: `app/configurator/variant-m/design-reset.mjs`, `design-reset.test.mjs` und `modern-navigation.css` im Kandidaten. Keine Änderungen an `ux.mjs`, Session-/Mengenlogik, Galerievertrag oder Produkt-/Preis-/Material-/Schraubendaten. Keine Serveraktion, kein Commit oder Push.

## Tatsächlicher Befund

Root prüfte den echten Shop-Proxy in Chrome mit 390 × 844 Pixeln. A52 mit Schrauben: SVG 245 × 98 Pixel, linke Position −0,65625 Pixel; die links danebenliegende 20-mm-Maßangabe fehlt. S82: SVG 312 × 78 Pixel, `viewBox="0 0 80 20"`, linke Position −34,15625 Pixel; etwa 34 Pixel der Platte fehlen links, der Resetknopf ist rechts angeschnitten. Screenshot A52 unter `outputs/Shopfreigabe-230-20261112/konfi-A52-mobile.png` wurde vom Autor angesehen. Main AB 120 × 80 sowie D23-Suche/Auswahl wurden von Root als funktionierend gemeldet. Das sind Vorherbelege, keine Browserabnahme des lokalen Fixes.

## Ursache und Änderung

`design-reset.mjs` hängte `.ux-design-reset` unmittelbar in `.stage`. Die Stage ist eine horizontale Flexzeile (`ux.css`), die Platte wird anhand des gesamten inneren Stagebereichs bemessen und schrumpft nicht (`usability.css`). Der ebenfalls nicht schrumpfende Resetblock nimmt zusätzliche Breite ein. Die gemeinsame Zentrierung schiebt die Platte links hinaus; `view-zoom.css` schneidet die Stage ab. Die Maßangabe liegt nochmals links außerhalb der Platte. Schraubengröße oder Produktionsgeometrie sind nicht die Ursache.

Die vorhandenen Regeln in `modern-navigation.css:99–110` sehen bereits einen separaten Steuerblock in der vertikalen Vorschau vor. Der Fix setzt denselben Resetblock unmittelbar hinter `[data-ux-stage]` in `.ux-preview`. Keine zweite Schaltfläche oder duplizierte Ereignisbehandlung.

`native-shell-ui.mjs:21–29` verschiebt die echte Stage beim Vollbildaufruf in `.fk-live-preview` und beim Schließen zurück. Der Resetblock folgt im Vollbild als direktes Geschwister hinter der Stage, vor der folgenden Leiste. Er liegt weiterhin außerhalb der horizontalen Plattenzeile. Beobachtet wird nur das `open`-Attribut des existierenden Dialogs; der Close-Rückweg wird zusätzlich direkt behandelt.

Die vorhandene Sheet-Oberfläche `mobile-demo/demo.mjs` verschiebt diese Steuerelemente selbst in `.md-controls` und besitzt eigene Vollbild-Proxys. Bei aktivem `data-mobile-demo` erhält sie deshalb die normale Zeile selbst; im Vollbild bleibt der ursprüngliche Stage-Elternknoten für ihre vorhandenen Selektoren erhalten. Der neue Beobachter nimmt dieser Oberfläche den Knopf nicht wieder weg.

## Im echten lokalen Browser gefundene und korrigierte Höhenregression

Root prüfte danach den lokalen echten Konfigurator ohne den Sheet-Override: S82 wurde zwar vollständig sichtbar, aber nur 88 × 22 Pixel groß. Die Vorschau war 375 × 212 Pixel, davon belegte die neue Resetzeile 56 Pixel. Der Bühne blieben 156 Pixel mit unveränderten 18 Pixeln oberem und 116 Pixeln unterem Innenabstand. Ergebnis: nur 22 Pixel nutzbare Plattenhöhe. Screenshot `outputs/Shopfreigabe-230-20261112/konfi-S82-local-native-small.png` ist der Fehlerbeleg des ersten Fixstands, keine finale Abnahme.

Die ergänzende CSS-Regel reserviert für die tatsächlich separate native Resetzeile weitere 56 Pixel, sodass die vorherige Bühnenhöhe erhalten bleibt. Beim gemessenen S82-Fall ergeben sich 268 Pixel Vorschau minus 56 Pixel Resetzeile = 212 Pixel Bühne und rechnerisch wieder 78 Pixel Plattenhöhe. Die 30-Pixel-Seitenränder und der untere Raum für Bemaßung/Zoom bleiben unverändert; ein pauschales Kürzen des unteren Innenabstands würde diese Elemente wieder aufeinanderlegen. Im Fotomodus wird die Zusatzzeile erst nach dem bisherigen Höhenlimit ergänzt. Die neuen Regeln gelten ausschließlich mobil, ohne `data-mobile-demo`, bei direktem Reset-Kind in `.ux-preview`; Vollbild und Sheet erhalten keine neue CSS-Höhenregel.

## Gezielte Prüfungen

Mit Node v24.20.0 ausgeführt: `node --test app/configurator/variant-m/design-reset.test.mjs`. **5 bestanden, 0 Fehler, 0 übersprungen.** `tests-final.log` enthält den tatsächlichen finalen Lauf. Die Ergänzungen prüfen die konkret gefundenen Sheet- und Höhenregressionen.

1. Originalvorlage zurücksetzen, Produktoptionen und Undo erhalten.
2. Explizite Bestätigung erforderlich; Abbruch und geschlossener Dialog ändern nichts.
3. Resetblock außerhalb der Stage; zweimal normal → Vollbild → zurück mit demselben Element; bestehende Bestätigungsbehandlung bleibt aktiv; Maße, Befestigung, Text und Objekte unverändert.
4. Vorhandene Sheet-Steuerleiste behält ihren Knopf nach zweimaligem Vollbild-Rückweg; deren ursprüngliche Vollbildselektoren passen weiter.
5. Tatsächliche mobile Höhenfunktion plus CSS-Vertrag: 375/390 Pixel, Seitenverhältnisse 2,5/3/4/1,5; Plattenfläche bleibt wie zuvor, S82 nicht mehr auf 88 Pixel reduziert, 30-Pixel-Maßränder und Foto-Höhenlimit erhalten.

Die DOM-Prüfung verwendet eine gezielte zustandsvolle Baumfixture. Sie prüft Elternknoten, Reihenfolge, Listener und Zustände, **kein Browser-CSS-Layout**. `git diff --check` ohne Befund. Basisdateien stimmen bytegleich mit Runtime f85390bd; ff1f1ca verändert laut Operatorbeleg ausschließlich `contract.mjs`. Exakte Basis-/Ergebnishashes und Patchhash stehen in `pins.json`; `change.patch` ist der enge Diff.

## Vorhandener lokaler Browseranschluss

`work/restabschluss/host-integration-v9.mjs` ist der bereits vorhandene isolierte Host für echte v9-Konfigurationen, setzt aber ausdrücklich `presentation:'prio-r15'` und zeigt damit die Sheet-Oberfläche. Diese blieb im lokalen Root-Browsercheck vollständig sichtbar (S82: x28, Breite319 Pixel). Das ist kein Nachweis für die native Toolbar-/Tab-Oberfläche des tatsächlichen Shopstarts.

Root hat deshalb nur in der gesonderten Testhostkopie `work/restabschluss/host-mobile-fixes-20261113.mjs` diesen Override entfernt; der Host läuft lokal auf Port8737. Er verwendet den echten Kandidaten und v9-Konfigurationen mit synthetischen lokalen Bindungen, keine Shopwrites. Nach Neubau mit der ergänzten CSS-Regel sind A52/S82 bei390 ×844 Pixeln sowie Vollbild/Rückweg gezielt erneut anzusehen. Diese finale Sichtprüfung ist noch offen. Kein Ersatz-HTML, keine umfangreiche neue Kampagne und keine Serverinstallation aus dem lokalen Ergebnis ableiten.
