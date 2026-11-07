# Demo R15 – mobile Ausführung sofort sichtbar

Anlass: Screenshot 207. Die Befestigungsauswahl war hinter Überschriften, großen Abständen und Fußleiste kaum zu erkennen. Der erneute konkrete Korrekturauftrag setzt den zuvor offenen Punkt aus Screenshot 199 fort. Nur die getrennte Demo ändern; bestehende Funktionen, Designs, Preise, Desktop, Shop und Astras Arbeit erhalten.

## Sicherung und Umfang

Vollständige Quellsicherung vor Änderung: `checkpoints/mobile-demo-r15-ausfuehrung-20261107/before-r15-4e9ce615.zip`, 299.217.922 Bytes, SHA256 `467d3a03df93b9ba53a83ebde2ff511b891cf3230262115311f20da9c945c33b`. Ausgangscommit `4e9ce615`. Eigener Branch `dev/mika-mobile-demo-20261107`, Draft-PR #193, kein Main-Merge.

Nur CSS im Demo-Adapter, beschränkt auf Hochkant-Handyansichten bis 599 px Breite und ab 551 px Höhe:

- Bei geöffnetem Ausführungsmenü kompaktere Vorschau, dadurch mehr Auswahlfläche. Die Maßbeschriftung bleibt sichtbar.
- Doppelte Überschrift im Ausführungsbereich entfällt; kleinere Abstände und kompakte Auswahlkarten.
- Material/Größe/Befestigung bleiben feste Reiter mit eigenen Informationsbuttons, auch bei 320 px ohne horizontalen Überlauf.
- Die vorhandene native `.m-options`-Scrollfläche erhält eine dunklere Scrollleiste. Kein zusätzlicher Scrollcontainer, kein Popup, keine verschobenen Datenelemente.
- Text, Motive, Foto, geschlossene Vorschau und Desktop erhalten keine neue Vorschauhöhe. Modelle, Preislogik und Auswahlaktionen unverändert.

## Prüfung

38 gezielte Tests für Demo-Integration und Optionsnavigation bestanden; `git diff --check` sauber. Unabhängiges CSS-Review ohne wesentlichen Befund. Keine neuen Implementierungs-Spiegeltests für diese reine Layoutkorrektur.

Chrome mit simulierten Viewports: Bei 390×844 wächst die nutzbare Optionsfläche von rund 166 auf 297 px. R14 schnitt bereits die erste Reihe an; R15 zeigt vier Befestigungen vollständig und den Anfang weiterer Optionen. Bei 360×740 und 320×640 ist mindestens die erste Reihe vollständig sichtbar. 320-px-Reiter messen 294 px bei 294 px verfügbarer Breite, kein horizontaler Überlauf.

Native Bedienprüfung: 2 Bohrlöcher → 22,98 €, Wechsel auf 30×20 → 27,98 €, 2 Abstandshalter schwarz → 31,98 €. Farbwahl übernimmt direkt. Materialinformation öffnet und schließt. Beim Scrollen um 370 px bleiben die Reiter an identischer Position. Kein Zustands-Patch im Browser.

Vergleich R14/R15 bei 390×844: geschlossene Vorschau jeweils 660 px, Textvorschau jeweils 244,76 px. Desktop bei 1366×768: identische Vorschauposition und -größe. Test auf simulierten Browsergrößen, keine Behauptung einer physischen Handyprüfung.

Vorläufige Belege liegen in `outputs/mobile-demo-20261107/`: `r15-tests.txt`, `r15-local-browser.json`, `r15-before-mobile.png`, `r15-local-mobile.png`, `r15-local-320.png`. Endgültige Paket- und öffentliche Prüfnachweise folgen unten. Ziel ausschließlich `/konfi-demo/mobil-20261107-r15/`. Die statische Demo führt weiterhin keinen echten Shop-Checkout aus.
