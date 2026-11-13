# Warenkorbrückkehr und mobile Vorschau: geprüfte lokale Korrekturen

13.11.2026, Astra/Codex. **Lokal geprüft, noch nicht installiert.** Grundlage ist Claudes Warenkorbbericht [6dd50ed0](https://github.com/Chris83638w/gravuru-2027/blob/6dd50ed0/ops/plesk/warenkorb-20261112/README.md). Der von Claude bereits installierte Galeriefix `ff1f1ca` bleibt erhalten; `contract.mjs` wird nicht geändert.

## Ergebnis

- Beim gewöhnlichen Wiederöffnen bleibt die Bestellmenge erhalten. Der bestehende lokale Sitzungsschutz speichert optional eine ganze Menge 1–99; alte Datensätze ohne Feld bleiben mit Menge 1 lesbar. Ein gültiger ausdrücklicher CartEdit-Link hat vor lokaler Ressourcen-, Upload-, Gestaltungs- und Mengenwiederherstellung Vorrang. Native Authentifizierung und Revisionsprüfung bleiben unverändert.
- Die Resetleiste liegt außerhalb der horizontalen Plattenzeile. Dadurch wird die Vorschau kleiner Formate auf dem Handy nicht links abgeschnitten. Der zusätzliche Steuerbereich erhält seine eigene Höhe; Maßbeschriftung und Zoom behalten ihren freien Platz. Native Vollbildansicht und die vorhandene Sheet-Oberfläche behalten denselben Resetknopf und ihre jeweiligen Abläufe.
- Die bestätigten 5-mm-Schraubenköpfe bleiben unverändert. Bei 20 mm Schildhöhe entsprechen sie korrekt 25 % der Höhe. Kein Eingriff in Preise, Varianten, Material, Bohrungen oder Produktionsgeometrie.

## Enger Datei-Umfang

Vier Laufzeitdateien unter `app/configurator/variant-m/`:

1. `session-guard.mjs`
2. `ux.mjs`
3. `design-reset.mjs`
4. `modern-navigation.css`

Dazu zwei gezielte Testdateien: `session-guard.test.mjs` und `design-reset.test.mjs`. Basis- und Ergebnispins sowie enge Patches liegen im [Prüfpaket](../reviews/2026-11-13-cart-mobile-fixes/README.md).

## Nachweise und Grenzen

- Mengenpaket: 13/13 gezielte Tests, drei Syntaxprüfungen; unabhängiger Quellen- und Hashreview. Ein im Review gefundener CartEdit-Vorrangkonflikt wurde vor Übernahme behoben und mit früh/spät eintreffender echter `installCartEdit`-Wiederherstellung geprüft.
- Mobilpaket: 5/5 gezielte DOM-/Reset-/Vollbild-/CSS-Vertragstests; unabhängiger Quellen- und Hashreview. Eine erste lokale Höhenregression (88 × 22 px) wurde vor Übernahme korrigiert.
- Tatsächlicher lokaler Editor im Chrome-Browser bei 390 × 844: Edelstahl 8 × 2 vollständig sichtbar, SVG 312 × 78 px bei x=31,5; Acryl 5 × 2 vollständig sichtbar, SVG 230 × 92 px bei x=72,5. Hauptprodukt 120 × 80 vollständig sichtbar. Vollbild, Resetbestätigung, Abbrechen und Rückkehr geprüft. S82 Menge 10 und 80,70 € bleiben nach einem vollständigen Neuladen erhalten.
- Lokaler Kandidatenbuild: 76 Ressourcen, 159 Module, 16 Styles; Bundle `editor-7403859a21f2eac0.mjs`. Lokale v9-Produktdaten und synthetische Bindungen, keine Shopify-Schreibverbindung. Das ist kein installierter Host- oder physischer Smartphone-Nachweis.
- Unverändert offen: tatsächliche Shopify-Warenkorbzeile/Mengenwechsel/Ersetzen wegen DRAFT-422 und aktiver WASM-Lauf mangels Originalbinary. Diese Korrekturen lösen diese getrennten Voraussetzungen nicht.

## Nächster Schritt für Claude

Die vier Laufzeitdateien gegen den aktuellen, von dir gesicherten Kandidaten prüfen und nur bei passenden Basispins in deine neue Kopie übernehmen. Deinen Galeriefix und weitere bereits vorhandene Änderungen erhalten; kein pauschaler Austausch der App aus diesem Branch. Wenn dein Paket zusätzlich den schnelleren Konfiguratorstart enthält, diesen Teil separat ausweisen und gemeinsam gezielt prüfen.

Einbau und Neustart erfolgen ausschließlich im Umfang der dafür tatsächlich erteilten Nutzerfreigabe. Dieser technische Handoff erteilt keine neue Freigabe. Nach Einbau denselben mobilen Ablauf und den tatsächlichen Rückweg mit Menge 10 prüfen und in #168/#233 dokumentieren. Alle sieben Produkte bleiben DRAFT; keine Produktveröffentlichung oder Bestellung.
