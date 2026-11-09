# Motivkontur unter leerer Text-Hilfsfläche

Basis: `77805437e0b609252ed5f19682394180a61ef54e`. Branch: `dev/mika-overlap-hit-20261109`. Nur lokal vorbereitet; keine Live-, Produkt-, Datenbank- oder Shopify-Änderung.

## Auftrag und Ursache

Mikails gemeldeter Motiv-Touchfehler wurde vom Root live reproduziert: Das Haus lässt sich zuerst verschieben, bei Überlagerung mit dem Textrahmen wird stattdessen der Text bewegt. Die native Vorschau zeichnet mit `textOnTop:true` alle Texte zuletzt. Das transparente direkte Rechteck jedes Textobjekts ist ebenfalls treffbar und kann die sichtbar darunterliegende Motivkontur abfangen. Die Reihenfolge in `state.objects` allein bestimmt daher nicht den nativen Treffer.

Der neue Auftrag erlaubt ausschließlich eine Korrektur dieser Trefferentscheidung. Design, Textvorrang, Export, Layout und Bearbeitungsrechte bleiben bestehen. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt unverändert; keine Designvorlage wurde bearbeitet.

## Genau eine Produktionsdatei

`app/configurator/variant-m/refinements.mjs`:

- Nur wenn das Pointerziel das transparente erste direkte Rechteck eines Textobjekts ist, wird die native ShadowRoot-Trefferliste geprüft.
- Native SVG-Konturtests (`isPointInFill`/`isPointInStroke`) und inverse Bildschirmtransformation berücksichtigen verschachtelte SVGs, Drehung und Zoom. Keine Rechteck-Näherung für Motive und kein pauschaler Vorrang der vorherigen Auswahl.
- Eine sichtbare, verschiebbare Motivkontur darf diesen Gestenbeginn übernehmen. Sichtbare Textkonturen, andere bemalte Elemente oder gesperrte Motive werden nicht durchdrungen.
- Ohne passende Kontur bzw. ohne unterstützte APIs bleibt der bisherige Texttreffer erhalten. Kleine Texte behalten ihre vergrößerte Hilfsfläche.
- Fotos, Rasterbilder und SVG-`use` ohne unmittelbar prüfbare Geometrie werden nicht als Motivkontur umgedeutet. Die normale Auswahl über deren eigene Fläche bleibt unverändert.

SHA-256 vorher: `4added85a3e4e9065915b24a0cd2e26a478db58ed3ad84934bce1d21df2b9539`

SHA-256 nachher: `795300b87cb2895e143e9a70535c239867afb03b6e55bea93934523952a3803b`

## Ausgeführte Prüfungen

`node --test app/configurator/variant-m/overlap-pointer-hit.test.mjs app/configurator/variant-m/photo-position-ui.test.mjs app/configurator/variant-m/ui-event-regressions.test.mjs`: **61/61 bestanden**. Davon zehn neue gezielte Handlerfälle: Maus/Touch, Wiederwahl, Glyphenvorrang, Motivtransparentrand, fehlende oder gesperrte Rechte, transparente/unsichtbare Farbe, native transformierte Kontur, Foto-/Sperrblocker, Größenhandles und Fehlerfallback. Der bestehende Foto-/Rechte-/UI-Ablauf bleibt grün.

Zusätzliche echte Browserprobe über `node scripts/probe-overlap-pointer.mjs 8233`, ausschließlich Loopback und synthetische Daten. Sie verwendet den vorhandenen `studioSvg`-Renderer sowie den tatsächlichen Gestenblock aus `refinements.mjs` im echten ShadowRoot. **9/9 Desktop und 9/9 bei 390 × 844**; die Serien enthalten 25° Drehung und 125% Zoom. Die automatischen Gesten verwenden synthetische PointerEvents, die Treffermessung läuft in der echten Browser-SVG-Engine.

Darüber hinaus reale Browser-Eingaben über CUA/CDP:

- Desktop-Maus von `(672,49; 307,21)` nach `(700,49; 317,21)`: Haus x `50 → 55,89`, Text x bleibt `50`.
- Mobile Touchbewegung von `(160,48; 279,13)` nach `(180,48; 284,13)`: Haus x `50 → 57,40`, Text x bleibt `50`.
- Gegenprobe auf sichtbarer F-Kontur von `(154,39; 333,18)` nach `(174,39; 338,18)`: Text x `50 → 57,40`, Haus x bleibt `50`.

Alle Größen bleiben unverändert. Viewport- und Touch-Emulation anschließend zurückgesetzt. Keine fremden Browserregisterkarten verändert. JSON-Protokolle und Prüfbilder: [Prüfordner](../reviews/2026-11-09-overlap-hit/).

## Nächster Schritt und Rücknahme

Unabhängiger enger Review ist angefragt. Root kann anschließend die eine Produktionsdatei auf der exakten aktiven Basis übernehmen, das vorhandene Kundenpaket neu bauen und die reale überlagerte Haus-/Textgestaltung erneut prüfen. Frühere Bundledateien für offene Kundensitzungen behalten. Rücknahme: exakt diese Quelldatei auf den vorherigen SHA zurückstellen und das vorherige Paket verwenden. Keine Datenmigration nötig. Diese lokale Probe ersetzt keine Geräteabnahme auf einem echten Handy oder eine Liveabnahme.
