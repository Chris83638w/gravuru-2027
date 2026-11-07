# Mobile Demo R5 · besprochene Bedienkorrekturen

Stand: **07.11.2026, finales R5-Paket auf Code `07d5d8a435b756046549024f254402cfdcdcc354` getrennt veröffentlicht und per HTTP/Dateihashes geprüft.** Eigener Branch `dev/mika-mobile-demo-20261107`, Fortsetzung des [Draft-PR #193](https://github.com/Chris83638w/gravuru-2027/pull/193) auf dem gesicherten Stand `69124d20`. Dieser Nachtrag dokumentiert den freigegebenen Umfang, belegte Ergebnisse und offene Nachweise. Das frühere C4-Paket wurde nicht veröffentlicht. Dieser Nachtrag ist keine Verkaufsfreigabe.

Demo: [22 × 14 cm – frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r5/22x14.html?fresh=1), [30 × 20 cm – frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r5/30x20.html?fresh=1). Der bestehende Kundenkonfi und der Live-Shop wurden nicht ersetzt; endgültiger Kauf bleibt in dieser Demo gesperrt.

Die [Gesamtakte zu Demo und Anbindung](2026-11-07-mika-gesamtstand-mobile-demo-und-anbindung.md), die R4-Nachweise in `docs/reviews/2026-11-07-mobile-demo/` und die ursprünglichen Nutzerentscheidungen bleiben maßgeblich. Designquellen bleiben unverändert nach dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); dieses Paket gestaltet keine Vorlage neu.

## Auftrag und verbindliche Grenzen

Mikail hat die gesammelten Bedienkorrekturen der getrennten Demo zur Umsetzung freigegeben und verlangt zusätzlich eine sichtbare PC-Prüfung mit Screenshot. Die vollständige vorhandene Engine mit vorhandenen Motiven, Schriften, Designs, Fotos, Preisen und Optionen bleibt Grundlage. Nur die neue Demo-Oberfläche wird angepasst; bestehender Kundenkonfi, Live-Shop und Astras Arbeitskopie bleiben unverändert.

Der konkrete R5-Prüfumfang:

- Textbearbeitung übersichtlicher darstellen: Textbereich auswählen, dessen vorhandenes Textfeld und vorhandene Schrift-/Größenfunktionen nutzen; die Tastatur erst beim bewussten Bearbeiten des Felds öffnen. Neue Bedienelemente delegieren an die native Auswahl und Größenberechnung.
- Die konkurrierende obere **Text**-Werkzeugleiste ausschließlich im Demo-Layout ausblenden; der Demo-Texteditor leitet die Textbearbeitung in den unteren Bereich. Die originale **Foto-/Motivwerkzeugleiste bleibt kompakt oben**. Es gibt keinen neuen Umhänge-Mechanismus für `.ux-direct-edit`; die bestehenden Bedienelemente, Rechte und Callbacks bleiben erhalten. Eine angebotene Logofunktion folgt weiterhin ihren nativen Produktrechten.
- Die Tafel beim Texteingeben ausreichend sichtbar halten. Die Bildschirmtastatur darf nicht durch feste Demo-Abstände fast den gesamten Vorschauplatz aufbrauchen. Ansichtszoom und tatsächliche Objektgröße bleiben verschiedene Funktionen.
- Bewusstes Tippen auf die Vorschau darf den unteren Bearbeitungsbereich schließen; Verschieben, Skalieren, Drehen, Regler und andere Bedienaktionen dürfen ihn nicht versehentlich schließen oder während einer Geste die Tafelkoordinaten verschieben.
- Direkte Navigation zu Designs, Text, Motiven und Foto; Ausführung/Größe weiterhin erreichbar. Originale Undo-/Redo-/Ebenen-/Speicherfunktionen behalten. Nicht angebotene Produktfunktionen auch in der neuen Navigation nicht anzeigen.
- Direkter Foto-Upload über die vorhandene Uploadaktion; Auswahl vorhandener Fotos öffnet weiterhin keinen neuen Upload. Fotos bleiben vollständig, proportional, verschiebbar und löschbar; bestehende Masken bleiben erhalten.
- Sichtbare Warenkorbaktion mit passendem Symbol; sie öffnet weiterhin die native Prüfübersicht. Die statische Demo hat **keine echte Shopify-Kaufverbindung** und darf keinen erfolgreichen Kauf vortäuschen.
- PC-Ansicht zusätzlich sichtbar prüfen und einen Screenshot liefern. Die Demo bleibt getrennt; der bisherige PC-Kundenkonfi wird dadurch nicht ersetzt.

Produktdaten unverändert: Schiefer 22 × 14 cm für 19,99 € und 30 × 20 cm für 24,99 €, 43 bestehende Hundedesigns je Größe, alle vorhandenen Produktschriften und bestätigten Ausführungen. Keine neue Preis-, Fertigungs-, Foto-/Logo-Freigabe oder Vorlage erfinden.

## Sicherung vor R5

Vor den Bedienkorrekturen gesicherter Commit: **`69124d20`** (`Link completed mobile demo handoff to draft PR 193`).

- Archiv: `work/checkpoints/mobile-demo-feedback-20261107/before-feedback-69124d20.zip`.
- SHA256: **`3d1261e721c9b13a0ff42d9ae27b7a6cb18e86a19368233a9a3c72002c142928`**.
- Prüfsumme für diesen Nachtrag erneut lokal gelesen und mit dem übergebenen Wert identisch.
- Dies ist eine Codesicherung. Keine zusätzliche Datenbank- oder vollständige Shop-/Hostsicherung daraus ableiten.

Die bestehende öffentliche R4-Demo bleibt ein eigener Stand: [22 × 14 cm](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r4/22x14.html?fresh=1), [30 × 20 cm](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r4/30x20.html?fresh=1). Die bereits dokumentierte R4-Hostsicherung und Hashparität gelten für deren damalige Veröffentlichung. Für R5 wurden eine neue Vorprüfung und Sicherung ausgeführt; deren tatsächliche Belege stehen am Ende dieses Nachtrags.

## Technischer Anschluss ohne zweite Fachlogik

Die R5-Arbeit findet in `app/configurator/mobile-demo/` und dem zugehörigen statischen Paketbau unter `ops/mobile-demo/` statt. Der zugrunde liegende Editorstand bleibt die vorhandene Engine aus #192; kein Eingriff in `app/configurator/variant-m/`, keine geänderten Modelle, Ressourcen oder Shopbindungen gehört zu diesem Auftrag.

| Bereich | Bestehender Vertrag |
|---|---|
| Textbereich | Native `[data-ux-text]`-Felder und `[data-ux="select-content"]`; originaler Zustand, Limits und Undo bleiben zuständig. |
| Schriftgröße | Native `#ux-size`-Eingabe samt `input`/`change`; der Demo-Regler schreibt keine eigene Millimeter-/Skalierungslogik. |
| Elementwerkzeuge | Native `.ux-direct-edit` und ihre bisherige Platzierung behalten; kein Umhängen und kein Klonen. Nur ihre obere Textdarstellung wird Demo-begrenzt per CSS ausgeblendet. `hidden`, `disabled`, `data-object-kind` und native Lösch-/Skalier-/Drehrechte bleiben maßgeblich. |
| Foto hochladen | Originale Aktion `[data-ux="photo-upload"]`, synchron innerhalb des Nutzerklicks; native Auswahl von Uploadart, Dateityp, Zähler und Ersetzen-Ziel erhalten. |
| Fotobearbeitung | Originaler `[data-direct-open]` beziehungsweise `[data-ux="edit-upload"]`; keine neue Maske oder Bildumrechnung in der Demo. |
| Auswahl/Gesten | `el.state.selected`, native `render`-/`sync`-Kette und vorhandene Griffe. Nicht während Pointerdown die Vorschau wegen eines neu geöffneten Panels verkleinern. |
| Vollbild | Native `.c-large-preview` erhält vor Öffnen die originalen Bedienelemente zurück; bei Schließen zurück in die Demo. |
| Abschluss | Originale `.completion-finish` und native Prüfübersicht. Endgültiger Checkout bleibt unverbunden/gesperrt. |
| Rückbau | Listener, Observer, Wrapper, Originalpositionen, Attribute und Beschriftungen über `dispose()` wiederherstellen. |

Die bestehende native Werkzeugleiste setzt ihren Platz bei Updates selbst neu (`direct-editing.mjs`, `toolbar-hosts.mjs`). R5 führt deshalb **keine zweite Platzierungssteuerung** ein. `text-editor.mjs` ersetzt ausschließlich den Demo-Einstieg `uxEditText` durch die native Textauswahl mit unterem Panel; keine neue obere Eingabebox und kein automatisches Tastaturöffnen. `dispose()` stellt den vorherigen Einstieg wieder her. Foto-/Motivleiste und Vollbild bleiben nativ.

Der ursprüngliche Platzverlust bei offener Tastatur ist rechnerisch belegt: R4 übernimmt `visualViewport.height`, nimmt für die offene Vorschau 43 % minus 40 px und weitere 100 px Innenabstand. Bei 400 px verbleibender Höhe bleiben so nur 32 px für die Platte; das Sheet zwischen 45 % und dem festen 150-px-Footer hat lediglich 70 px einschließlich Kopf. R5 korrigiert die Demo-Aufteilung mit eigener Tastaturerkennung, kompakterem Footer und kleineren Vorschauabständen; die Produktgeometrie bleibt unverändert.

## Unabhängige lesende Prüfung und geschlossene Befunde

Geprüft wurde zunächst der laufende R5-Diff von `demo.mjs`, ergänzt um die vorhandenen nativen Ereignis- und Werkzeugverträge; anschließend wurden die beiden gemeldeten Stellen im Code `52185d9d` gezielt nachgelesen. Keine Browsersteuerung, kein Testlauf und keine Codeänderung durch den dokumentierenden Prüfer. Die nachfolgenden Browserergebnisse wurden von Root mitgeteilt; Code, Sicherungs- und finale ZIP-/Manifest-Hashes sowie das 38-Tests-Protokoll wurden für diese Dokumentation gelesen.

Beide konkreten Zwischenbefunde sind im nachgelesenen Endstand behoben:

1. **Tipp-Erkennung behoben:** Capture liegt jetzt am Hostelement vor den nativen ShadowRoot-Handlern; der tatsächliche innere Knoten kommt aus `composedPath()`, Griffe werden mit `[data-ux-handle]` ausgeschlossen. Abschluss erfolgt nach `pointerup` in einer Microtask statt in einem möglicherweise unterdrückten Klick. Die native Geste darf zuerst enden. Root hat mit echter Browser-Mauseingabe bestätigt: Produkt antippen → Panel `closed`; Motiv um 20 px ziehen → Motiv bewegt, Panel bleibt offen.
2. **Nicht vorhandene Fotofunktion behoben:** Die Footer-Erzeugung überspringt fehlende native Tabs (`if (!toolButtons.has(key)) continue`). Vorhandene, aber verborgene/gesperrte Tabs und die native Uploadaktion werden weiterhin aktualisiert. Eine fehlende Fotofunktion erzeugt keinen toten Foto-Navigationsbutton mehr.

Für native Vollbildrückgabe und `dispose()` wurde bei dieser gezielten lesenden Prüfung kein zusätzlicher konkreter neuer Fehler nachgewiesen; die automatisierten Rückgabe-/Fehler-/Rückbautests sind Bestandteil des gemeldeten grünen Laufs. Die Tastatur-Erkennung bewahrt die vor dem Öffnen gemessene Höhe. Android-typische gleichzeitige Verkleinerung von `innerHeight` und `visualViewport`, Rotation sowie gewöhnliche kleine Höhenänderungen sind im Helfertest abgedeckt. Das ist kein physischer Android-/iOS-Test.

## Belegte R5-Prüfungen

**38/38 gezielte automatisierte Tests bestanden:** 13 Adaptertests (`app/configurator/mobile-demo/demo.test.mjs`), 13 Textbedienungstests (`app/configurator/mobile-demo/text-editor.test.mjs`), sechs Pakettests (`ops/mobile-demo/build.test.mjs`) und sechs Veröffentlichungsskripttests (`ops/mobile-demo/publication.test.mjs`). Protokoll: `outputs/mobile-demo-20261107/r5-tests.txt`, 38 bestanden, 0 Fehler, 0 übersprungen. Der zusätzliche Textfall sichert die Wiederanzeige der Schriftgrößenbedienung nach Reset und erneutem Texteinstieg. Kein neuer Volltestlauf der gesamten Anwendung behauptet. Die früheren 22/22 Tests und R1–R4-Bedienproben bleiben historische Nachweise; sie werden nicht nochmals zur R5-Zahl addiert.

Root hat folgende Browserfälle geprüft. Die ursprünglichen Fälle stammen vom lokalen **C4-Paket auf `52185d9d`**; ältere C3-Fälle und Nachprüfungen am **finalen Paket auf `07d5d8a4`** sind ausdrücklich gekennzeichnet. Kein vollständiger neuer Durchlauf sämtlicher historischer Fälle ausschließlich am Finalpaket behauptet.

| Ablauf | Tatsächlich bestätigtes Ergebnis |
|---|---|
| Ansichten | 390×844, 360×740 und PC 1440×900 visuell geprüft. |
| Tastaturplatz | 390×430 als verkleinerter sichtbarer Bereich simuliert; Textfeld 349×91 px, Schriftgröße 16 px. Kein physischer Smartphone-/Bildschirmtastaturtest. |
| Schrift | Nativen Schriftendialog geöffnet, Cinzel gewählt; Schrift übernommen und Dialog geschlossen. |
| Größenregler | Native Schriftgröße über Regler 36 → 37 verändert. |
| Texthistorie | Namen geändert und über Undo zurückgenommen. |
| Pflichtfeld | Warenkorbaktion bei fehlendem Pflichttext öffnet das Textpanel und fokussiert das richtige Feld. |
| Prüfübersicht | Mit „Balu“ öffnet die native Prüfübersicht; 19,99 € sichtbar, endgültiger Kauf deaktiviert. Keine Bestellung. |
| Antippen / Ziehen | Echte Browser-Mauseingabe: Produkt-Tap schließt das Panel; 20-px-Drag verschiebt das Motiv, Panel bleibt offen. Das Host-Capture-/Pointerup-Verhalten wurde tatsächlich bedient. |
| Foto-Shortcut | Am C3-Zwischenpaket nativen Dateidialog ausgelöst, vollständige neutrale Test-PNG mit Eckgriffen eingefügt; Preis 29,98 €. C4 verkleinert die Foto-Paneldarstellung per CSS. Upload über den Shortcut am Finalpaket nochmals geprüft; der doppelte große Uploadblock ist dort unsichtbar. |
| Foto-Eckgriff | Am C4-Paket per echter Browser-Mauseingabe skaliert: Bildrechteck 197,3577×138,1504 → 155,9590×109,1713 px; Seitenverhältnis rund 1,42857 erhalten, Panel bleibt offen. |
| Fotozuschnitt | Original als vollständiges Rechteck ohne automatischen Zuschnitt gezeigt. Herzmaske im nativen Fotoeditor bewusst gewählt und übernommen. Kein neuer Galerie-/Konto-Speicherrundlauf daraus ableiten. |
| Reset und erneuter Texteinstieg | Am Finalpaket Namen „Kalle“ gesetzt, Reset auf Original „Bruno“, anschließend Text wieder geöffnet: Schrifthöhe sichtbar (`visible:true`). Die nach Reset fehlende Größenbedienung ist damit gezielt im Browser und automatisiert abgesichert. |
| Foto löschen / Preis | Am Finalpaket Foto gelöscht; Gesamtpreis 29,98 → 19,99 €. |
| Größenoption | Am Finalpaket 22×14 → 30×20 gewählt; Basispreis 24,99 €. |
| Vollbildrückkehr | Am Finalpaket aus dem nativen Vollbild zurückgekehrt; Warenkorbaktion weiterhin sichtbar. |

Die lokale simulierte Tastaturansicht liegt unter `outputs/mobile-demo-20261107/demo-r5-tastatur-390x430.jpg`; die tatsächlich abgelegten öffentlichen R5-Aufnahmen stehen unten. Frühere R4-Screenshots werden nicht als R5 ausgegeben. Die Sichtprüfung umfasst nicht alle 43 Designs einzeln.

## Finales R5-Paket und verbleibende Grenzen

- Quellcommit: **`07d5d8a435b756046549024f254402cfdcdcc354`**.
- Lokales Paket: **`work/mobile-demo-package-20261107-r5-final/`**.
- Manifest-SHA256: **`d8c63b0ca0e6d81fa661c3c9cc272e159c6f963722728b8706521bd9ecc5fcd0`**.
- ZIP: **`outputs/mobile-demo-20261107/gravuru-mobile-demo-r5-final.zip`**.
- ZIP-SHA256: **`65d48898f59ce12d3c544da2c36e31ce6b00860001be827f93993d32452b85ee`**; **83.328.904 Bytes**. Dateigröße, ZIP-Hash und Manifest-Hash für diesen Nachtrag nochmals lokal bestätigt.
- Das vorherige C4-ZIP `gravuru-mobile-demo-r5.zip` (Quellcommit `52185d9d`, ZIP-SHA256 `4df6bd0ac7ed8bd3cba0d48f98b6b69e277dba9eac7e5442ff8b22e56564e273`, Manifest-SHA256 `4817ffe1edafeecd9e706a218408e801df3ac36da12f888ddb9ee17783a15c7c`) war nur ein **privater Zwischenstand und wurde nicht veröffentlicht**. Veröffentlicht wurde ausschließlich das oben bezeichnete Finalpaket.
- Kein Diff der vorhandenen Engine unter `app/configurator/variant-m/` oder der gemeinsamen Modelle unter `app/platform/sources/app/shared/` gegenüber dem gesicherten R4-Dokumentationsstand `69124d20`.

## Tatsächlich bestätigte Veröffentlichung

- **Namespace:** `/konfi-demo/mobil-20261107-r5/`. Das finale Paket enthält 2004 manifestierte Nutzdateien plus `MANIFEST.json` (2005 ZIP-Einträge); die zusätzliche Auslieferungsregel `.htaccess` liegt ausschließlich im neuen Demo-Verzeichnis.
- **Neue Servervorprüfung:** `outputs/mobile-demo-20261107/host-preflight-r5.json`, lesend (`verify-only`, `changesPerformed:0`). 2061 bereits vorhandene öffentliche Dateien inventarisiert, einschließlich des früheren Demo-Stands; die vier bisherigen Originaldateien `start-r5.cjs`, `app.cjs`, `22x14.html`, `30x20.html` mit ihren bisherigen Hashes geprüft.
- **Private Sicherung:** `/var/www/vhosts/gravuru-designwerkstatt.de/private/mobil-20261107-r5-before-publication`. Vier Originalkopien und vollständiges vorheriges Public-Inventar; keine Datenbank- oder Shopvollsicherung behauptet.
- **Veröffentlichungsbeleg:** `outputs/mobile-demo-20261107/host-publication-r5.json` bestätigt `verified:true`, `originalFilesUnchanged:true` und `oldPublicInventoryUnchanged:true`. Vorher-/Nachher-Inventarhash identisch: **`f837a273c32723db608dd3b997fcde418f4e2c905f50907597f930f0b23d13dd`**. Kein Neustart, keine Routeränderung, `shopWrites:0`, `databaseWrites:0`.
- **Öffentliche Rückleseprüfung:** `outputs/mobile-demo-20261107/http-public-r5.json` bestätigt acht HTTPS-Stichproben mit HTTP 200, gzip, korrekten MIME-Typen und exakt erwarteten Dateihashes: Manifest, beide Einstiegs-HTMLs, `demo.mjs`, `demo.css`, `text-editor.mjs`, Warenkorbsymbol und Katalogsegment. `no-store` sowie `noindex, nofollow, noarchive` gesetzt; Gesamtergebnis `verified:true`. Die PC-Abrufzeiten sind keine gemessenen Handy-/Lasttestzeiten.

Die drei Berichte wurden für diese Niederschrift tatsächlich gelesen. Folgende neue Aufnahmen der öffentlichen R5-Demo sind inzwischen lokal abgelegt; ihre Existenz und von null abweichende Dateigröße wurden für diesen Nachtrag geprüft:

- PC: `outputs/mobile-demo-20261107/demo-r5-desktop-online-1440.jpg` (136.309 Bytes).
- Textbereich in Handyansicht: `outputs/mobile-demo-20261107/demo-r5-text-online-390.jpg` (44.261 Bytes).
- Simulierter verkleinerter Tastaturbereich: `outputs/mobile-demo-20261107/demo-r5-tastatur-online-390x430.jpg` (19.155 Bytes). Auch diese Aufnahme ist kein physischer Smartphone-/iOS-Tastaturtest.

Alle drei Aufnahmen, die drei Server-/HTTP-Berichte und das 38-Tests-Protokoll sind zusätzlich im [Prüfverzeichnis dieses Branches](../reviews/2026-11-07-mobile-demo/) gesichert. [PC-Screenshot](../reviews/2026-11-07-mobile-demo/demo-r5-desktop-online-1440.jpg), [Handy-Textansicht](../reviews/2026-11-07-mobile-demo/demo-r5-text-online-390.jpg), [simulierte Tastaturhöhe](../reviews/2026-11-07-mobile-demo/demo-r5-tastatur-online-390x430.jpg).

Root hat öffentlich den frischen Bruno-Start mit 19,99 €, den Texteinstieg mit nativen Feldern und Größenregler sowie mehrzeilige Eingabe bestätigt. Bei simulierter Tastaturhöhe 390×430 lag das Textfeld vollständig sichtbar zwischen y=269,5 und y=360,5: 349×91 px, 16-px-Schrift. Im geprüften öffentlichen Ablauf keine Konsolenwarnungen/-fehler. Keine physische Tastatur daraus ableiten.

Kein Main-Merge, keine Shopify-Schreibzugriffe und kein Austausch des bestehenden Kundenkonfis. R4 bleibt als separater vorheriger Demo-Stand erhalten. Die öffentlichen Aufnahmen und HTTP-Stichproben sind kein vollständiger neuer Durchlauf sämtlicher zuvor lokal geprüfter Bedienfälle.

**Offen:** physische Handy-/iOS-Tastatur- und Touchprüfung sowie Mikails Sichtfreigabe. Historische Foto-/Masken-/Vollbildfälle nicht ungeprüft als vollständigen erneuten öffentlichen Finalpaket-Durchlauf ausgeben. Genau nächster Schritt: Mikail die getrennte Demo mit PC-Screenshot zur Sichtprüfung geben und seine Rückmeldung sammeln. Eine spätere Übernahme in den Kundenkonfi bleibt ein eigener abgestimmter Schritt.
