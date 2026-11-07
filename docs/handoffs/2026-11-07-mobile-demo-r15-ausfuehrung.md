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

## Endgültiges Paket

Quellcommit `157d0da290993628dd9db9aa82ddb0708bad182f`. ZIP 83.392.489 Bytes, SHA256 `886d23f631c64d14c9f5048887382d130296e9a6160309d807ae07d815c95125`; Manifest SHA256 `ad8c4e8a8131b2f7487a365f4f39e0f11130369a72a10764fe578cbbd23c6ebb`. Beide Modelle enthalten unverändert 43 Designs und 30 Schriften; Design- und Materialhashes exakt wie in den Ausgangsmodellen. Endgültiges Demo-CSS bytegleich zum zuletzt geprüften Kandidaten. Private Server-Vorprüfung bestätigt 22.243 vorhandene Public-Dateien und unveränderte geschützte Originale.

## Veröffentlichung und öffentlicher Test

Am 08.11.2026 nach Mitternacht getrennt veröffentlicht: [R15 frisch testen](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r15/22x14.html?fresh=1). Private Hostsicherung `private/mobil-20261107-r15-before-publication`; alle 22.243 vorherigen öffentlichen Dateien und geschützten Originale unverändert. Kein Neustart, Routerwechsel, Shop- oder Datenbankschreiben. R14 bleibt als Rückweg erhalten.

17 öffentliche HTTP-Stichproben mit Status 200 und identischem Hash zum endgültigen Paket, no-store/noindex. Öffentlicher Browserablauf: Ausführung → Befestigung zeigt bei 390×844 vier vollständige Optionen. Auswahl von 2 Bohrlöchern zeigt 22,98 €. Scrollen um 370 px lässt die Reiter unverändert stehen. Screenshot direkt von der öffentlichen Demo. Abschließend Testansichten zurückgesetzt und Demo frisch geöffnet, keine gespeicherten Prüfeingriffe.

Nachweise: [Tests](../reviews/2026-11-07-mobile-demo/r15-tests.txt), [Build](../reviews/2026-11-07-mobile-demo/build-r15.json), [Archiv](../reviews/2026-11-07-mobile-demo/archive-r15.json), [Server-Vorprüfung](../reviews/2026-11-07-mobile-demo/host-preflight-r15.json), [Veröffentlichung](../reviews/2026-11-07-mobile-demo/host-publication-r15.json), [HTTP](../reviews/2026-11-07-mobile-demo/http-public-r15.json), [lokaler Browservergleich](../reviews/2026-11-07-mobile-demo/r15-local-browser.json), [öffentlicher Browser](../reviews/2026-11-07-mobile-demo/r15-public-browser.json), [vorher](../reviews/2026-11-07-mobile-demo/r15-before-mobile.png), [öffentlicher Screenshot](../reviews/2026-11-07-mobile-demo/r15-public-mobile.png), [320 px](../reviews/2026-11-07-mobile-demo/r15-local-320.png).
