# Konfi: Textoptionen durch bewussten Außenklick schließen

Stand 06.11.2026, Codex/Mika, Branch `dev/mika-konfi-anschluss-20261105`, Draft-PR #178. Aufbau auf `b6b1b749` (R9). R10 seit **01:32:14 UTC / 02:32 Uhr Berlin** aktiv: `editor-5478bb63b8153f24.mjs`.

## Auftrag und Abgrenzung

Mikails Präzisierung im Chat: **„oder wenn er wo anders bewusst hindrückt“**. Die offene Bedienfrage aus R9 ist damit entschieden: „Schrift & Größe“ bleibt beim Schreiben, Fokusverlust und Scrollen offen und schließt bei einem bewussten Klick/Tipp außerhalb des aktuellen Textbearbeitungsbereichs. Ein anderer Text erhält seine eigenen Optionen. Keine dauerhaft gleichzeitig geöffneten Optionsboxen eingeführt.

Nur `app/configurator/variant-m/text-fields.mjs` und die neue Regressionstestdatei `text-field-dismissal.test.mjs` geändert. Layout, Preisberechnung, Produktmodelle und Designvorlagen bleiben unverändert. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich. Abstimmung über Issue #168, Reservierungskommentar 6674205324.

## Verhalten

- Ein tatsächlicher Außenklick/-tap klappt die Optionsbox zu; bloßes Pointerdown, Wischen, Ziehen und abgebrochene Berührung tun dies nicht.
- Eingabe und Fokusverlust schließen die Box nicht. Der vorhandene Pfeil bleibt ein ausdrücklicher Schalter.
- Optionen innerhalb der Textzeile, direkte Textwerkzeuge und Schriftwahldialog bleiben nutzbar, ohne die Box vorzeitig zu entfernen.
- Klick in ein anderes Textfeld öffnet dessen Optionen darunter. Klick außerhalb des gesamten Konfigurators schließt ebenfalls.
- Die bestehende Positionskorrektur bleibt erhalten. Beim ausdrücklichen Wechsel oder Schließen eines Panels kann sich die Liste natürlich neu anordnen, insbesondere am oberen mobilen Scrollanschlag. Es wird keine vollständige Null-Versatz-Garantie behauptet.

## Prüfung und Veröffentlichung

**268/268 Regressionstests lokal und 268/268 auf Linux**, null Fehler/übersprungene Tests; beide Builds erfolgreich. Fünf neue Tests prüfen bewussten Außenklick gegenüber Scroll-/Touchgesten, Fokusverlust, Dialog-/Toolbarbedienung, Textwechsel sowie Klick außerhalb des Shadow-DOM-Hosts.

Echte lokale Browserprüfung:

- Desktop: Name öffnen, Schriftwahl öffnen und Cinzel direkt übernehmen; Optionsbox bleibt offen. Wechsel zu Lebensdaten öffnet nur deren Box. Klick auf die Überschrift schließt sie.
- Handyansicht 390×844: Touch-Scroll lässt die Box offen; gezielter Tap auf die freie Canvasfläche schließt sie.

Veröffentlichter Prüfstand:

- Desktop: Textbox öffnen und per Außenklick schließen bestätigt.
- Handyansicht 390×844: nach Touch-Scroll `aria-expanded=true`; nach bewusstem Tap außerhalb alle drei Textboxen `aria-expanded=false`. Screenshots vor und nach dem Tap in den lokalen Ausgaben gesichert (`textbox-offen-r10-20261106.jpg`, `textbox-nach-aussenklick-r10-20261106.jpg`). Browseremulation, kein physisches Smartphone.
- Beide Seiten/Modelle und das Hauptbundle mit vier nachgeladenen Modulen HTTP 200. Beide Produktmodelle bytegleich: 43 Designs, 1999/2499 Cent Basispreis und 169 Cent Zusatzmotiv.
- Vor Veröffentlichung Hashabgleich mit aktiver R9-Quelle, versionierter privater Serverstand, Tests und Build. Sicherungen und Vorversion erhalten; keine Datenbankänderung.

[Maschinenlesbarer Nachweis](2026-11-06-konfi-textoptionen-aussenklick-nachweis.json). Kein neuer Warenkorb-/Bestellnachweis, Produktlaunch oder Merge.

## Nächster Schritt

Mikails Sichtprüfung über den [frischen Testlink](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/22x14.html?fresh=1). Ein eigener Testtab wurde frisch gestartet; bestehende Nutzer-Tabs wurden nicht neu geladen. Die Designfreigabe und anschließende Produkt-/Warenkorbabnahme bleiben gesondert offen.
