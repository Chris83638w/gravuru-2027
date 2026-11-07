# Mobile Demo R5 – veröffentlichte Bedienkorrektur am 07.11.2026

38 gezielte Tests bestanden; separater R5-Ordner auf Quellcommit `07d5d8a4`. Die [R5-Übergabe](docs/handoffs/2026-11-07-mobile-demo-r5-bedienung.md) dokumentiert die lokalen C3/C4/Final-Bedienfälle und die genaue Abgrenzung. Öffentlich geprüft: frischer 22×14-Start mit Bruno/19,99 €, Textpanel mit nativen Feldern und Schrifthöhenregler, mehrzeilige Eingabe, lesbares Textfeld bei simulierter Tastaturhöhe, PC-Anordnung bei 1440×900; im geprüften öffentlichen Ablauf keine Konsolenwarnungen/-fehler.

[PC-Screenshot](docs/reviews/2026-11-07-mobile-demo/demo-r5-desktop-online-1440.jpg), [Handy-Screenshot](docs/reviews/2026-11-07-mobile-demo/demo-r5-text-online-390.jpg), [simulierte Tastaturhöhe](docs/reviews/2026-11-07-mobile-demo/demo-r5-tastatur-online-390x430.jpg), [Server-/HTTP-Belege](docs/reviews/2026-11-07-mobile-demo/). Vorherige 2061 öffentliche Dateien und Originale unverändert. Keine Live-Shop-Änderung oder tatsächliche Bestellung. Physischer Android-/iOS-Tastaturtest und Touchabnahme weiter offen. Historischer R4-Bericht folgt unverändert.

# Mobile Demo R4 – veröffentlicht und geprüft am 07.11.2026

**Ergebnis: lokale Funktions- und Sichtprüfung für die nachfolgend tatsächlich bedienten Fälle bestanden; getrennte Demo veröffentlicht und öffentlich zurückgelesen.** Physische Touch-/iOS-Tastaturprüfung bleibt offen. Der folgende frühere Abschnitt „Abnahme noch laufend“ bleibt als anfängliches Prüfprotokoll erhalten; für die unten benannten Fälle gilt dieser neuere Nachtrag.

Eigener Branch `dev/mika-mobile-demo-20261107`, unveränderter Engine-Grundstand `8ffeed8d90191cb89f1188a336751de2b2a4e0c0`. Paketnamespace `/konfi-demo/mobil-20261107-r4/`. Vollständige bestehende Schiefermodelle mit 43 Designs je Größe und allen 30 Produktschriften. Die mobile Demo ordnet vorhandene Werkzeuge neu; kein Motiv-/Schriftersatz, keine neue Preisberechnung. Bestehender Kundenkonfi und Astra-Arbeitskopie bleiben unverändert.

## Tatsächlich bediente eigene Demo

Die Bedienprüfungen entstanden verteilt über **R1 bis R4 mit gleicher Engine**: R1 Design/Größe/Schrift/Maske/Vollbild, R2 Undo/Namenlöschen; R4 Foto-Eckdrag, Regler, Fotolöschen, Reset, Querformat sowie öffentliche Suche/Werkzeuge. Die folgende Tabelle ist die gemeinsame Prüfbilanz; nicht jede Handlung wurde in R4 erneut ausgeführt. Grundplatten-/43-Design-Datenhashes sind erhalten, nicht alle 43 Designs einzeln visuell geprüft.

| Prüfung | Beobachtetes Ergebnis |
|---|---|
| Designwahl | 43 Designs vorhanden; Bruno → Emma gewechselt. |
| Größe / Basispreis | 22×14 → 30×20; Preis 19,99 → 24,99 €. |
| Motivsuche | Kategorie Blumen ausgewählt; Suchtext „kreuz“ zeigt trotzdem 18 passende Treffer. |
| Motivpreis / Löschen | Hinzufügen +1,69 €; anschließendes Löschen stellt den vorherigen Preis wieder her. |
| Schrift | Cinzel ausgewählt, sofort übernommen; Schriftauswahl schließt. |
| Foto | Neutrales Testbild vollständig auf der Tafel; Herz als Zuschnitt gewählt und mit Übernehmen angewendet. Keine Behauptung eines erneut gespeicherten Galerie-Fotoroundtrips. |
| Foto-Eckgriff / Auswahl / Regler | Eckgriff in Chrome per echter Browser-Mauseingabe gezogen: Größe 130 → 156; Bildrechteck 197,36×138,15 → 236,80×165,76 px; Seitenverhältnis 1,4286 unverändert. Klick auf das Foto öffnet keinen Upload. Pfeiltaste nach rechts verschiebt das Foto. Größenregler mit Pfeiltaste nach links: 156 → 155,9. Dies ist ein PC-/Chrome-Nachweis, kein physischer Touchtest. |
| Original zurücksetzen | Reset fragt vor dem Wiederherstellen der gewählten Originalvorlage nach. |
| Undo / Redo | Namensänderung Luna ↔ Bruno über die vorhandene Historie zurück-/wiederhergestellt. |
| Vorlagennamen löschen | Name tatsächlich gelöscht, danach mit Undo wiederhergestellt. |
| Vollbild | Native Vollbildansicht geöffnet und in die Demo zurückgekehrt; Werkzeuge wieder erreichbar. |
| Abschluss | Native Prüfübersicht mit den gewählten Werten geöffnet; endgültiger Checkout bleibt gesperrt. Keine Bestellung ausgelöst. |

**Darstellungen:** 360×740, 390×844, 430×932 CSS-Pixel; Querformat 844×390 mit rechtem Werkzeugbereich; Desktop 1440×900 mit zentrierter 600-px-Demo. Dies sind Browseransichten, keine Tests auf einem physischen Smartphone. Native Dialoge und die eigentlichen Werkzeugfunktionen bleiben erhalten.

Lokale Aufnahmen in `outputs/mobile-demo-20261107/`: `demo-start-390.jpg`, `demo-werkzeuge-390.jpg`, `demo-text-430.jpg`, `demo-text-844x390.jpg`, `demo-desktop-1440.jpg`. Das Uploadbild `foto-test-komplett.png` ist eine neutrale Testdatei. Die zuvor dokumentierten Zakeke-Aufnahmen bleiben reine Bedienreferenz; keine Produktgrafik daraus wurde übernommen.

## Korrekturen und technische Nachweise

- Alte lokale Vollmodelle hatten bei 43 Vorlagennamen je Größe noch `delete:false`; die veröffentlichten Prüfseiten enthielten bereits das bestätigte Löschrecht. Demo-Kopien gleichen genau diese Rechte und den bereits deaktivierten Sammlungsfilter ab. `required:true` bleibt bestehen; der native Löschvertrag unterstützt ausdrücklich löschbare Pflichttexte. Originale und produktive Daten werden nicht geschrieben.
- Der Erklärungstext zu erlaubten Elementänderungen ist bereits im veröffentlichten R12 enthalten; seine spätere Ausblendung lag nur im separaten festen-Werkzeugtest. Er ist jetzt allein im Demo-Layout ausgeblendet, ohne Berechtigungen zu lockern.
- Lesender R12-Abgleich: Live-Hauptbundle-SHA stimmt mit dem dokumentierten R12-Beleg überein; 16/16 enthaltene Styles gleich. 141/149 Hauptmodule nach Host-URL- und Bundlernormalisierung identisch, übrige Änderungen sind nachvollziehbare aktuelle Galerie-/Ressourcen-/Sortier-/Kontur- und Iconstände. Kein fehlender veröffentlichter R12-Kundenfix gefunden. Dies ist keine erneute Prüfung aller separat geladenen Server-Nebenbundles.
- **22/22 automatisierte gezielte Tests bestanden:** zehn Demo-Adaptertests, sechs Paket-/Isolationsprüfungen und sechs Veröffentlichungsskripttests. Native Knoten/Callbacks, versteckte/gesperrte Produktfunktionen, Undo/Redo, Vollbild/Fokus/Validierungsrückkehr, rückbaubare Installation, Modell-/Font-/Bild-Erhalt, Namespace-/Symlinkgrenzen, erlaubte statische Lesewege und gesperrte Schreibwege sind abgedeckt. Die Veröffentlichungstests prüfen standardmäßig lesenden Modus, additive Auslieferung mit Sicherung und Erhalt vorhandener Bytes, Vorbedingungen vor Schreibbeginn, Überschreibschutz sowie ZIP-Traversal-/Duplikat-/Symlinkabwehr. Kein physischer Geräte- oder Livecheckoutnachweis daraus ableiten.
- Manifest R4: SHA256 `f354482b23fb6635a1cec1621390649a6836cd2f7815e67def3f04ce0641ba06`; ZIP `gravuru-mobile-demo-r4.zip`: SHA256 `713bac99dd7372eca7780f5634ac5410e47b2dfc5595670802f449c118afda94`.
- Tatsächliche Servervorprüfung: `outputs/mobile-demo-20261107/host-preflight-r4.json`, Aktion `verify-only`, `changesPerformed:0`. Paket-Hashes identisch, 58 vorhandene öffentliche Dateien inventarisiert; Inventar-SHA256 `d3506ad4391b42069b6a44fb9c33dbbc4bcbdf4576007abb3e3e0347f2c8f6ed`. Die folgende Veröffentlichung wurde getrennt ausgeführt und nachgeprüft.

## Tatsächliche getrennte Veröffentlichung und öffentlicher Test

- [22×14 cm – frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r4/22x14.html?fresh=1), [30×20 cm – frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r4/30x20.html?fresh=1).
- `outputs/mobile-demo-20261107/host-publication-r4.json` bestätigt `verified:true`, `originalFilesUnchanged:true` und `oldPublicInventoryUnchanged:true`. Alle 58 bisherigen öffentlichen Dateien plus `start-r5.cjs`, `app.cjs` und beide alten HTMLs hashgleich; Neustart und Routeränderung false, Shop-/Datenbankschreibzugriffe 0. Nur der zusätzliche Demo-Namespace wurde veröffentlicht.
- Private Sicherung vor Veröffentlichung: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mobil-20261107-r4-before-publication`, vier Originalkopien und vollständiges Public-Inventar. Dies ist keine Datenbanksicherung und keine neue Shopvollsicherung.
- `outputs/mobile-demo-20261107/http-public-r4.json`: sechs öffentliche Stichproben (beide Einstiegs-HTMLs, JS, CSS, Katalogsegment und Motiv-JSON) mit HTTP 200, gzip, richtigem MIME-Typ, Manifestgleichheit, `Cache-Control: no-store` und `X-Robots-Tag: noindex, nofollow, noarchive`. Die gemessenen Einzelabrufe vom PC sind keine Handy-/Lasttestzeiten.
- Öffentliche Demo in Chrome bei 390 px tatsächlich bedient: Start Bruno und 19,99 €, fünf Werkzeuge vorhanden; Kategorie Blumen plus Suchwort „kreuz“ zeigt 18 Treffer. Keine Konsolenwarnungen oder -fehler im geprüften Ablauf. Die übrigen oben genannten Handlungen verteilen sich auf lokale R1–R4-Prüfungen mit gleicher Engine; kein vollständiger zweiter R4-/Online-Durchlauf aller Fälle behauptet. Die öffentlichen R4-Dateihashes entsprechen dem fertigen R4-Paket.
- Repositorykopien der Screenshots sowie HTTP-/Hostnachweise: [docs/reviews/2026-11-07-mobile-demo](docs/reviews/2026-11-07-mobile-demo/). Die lokalen Demo-Server 8217–8220 sind nach Ende der Prüfung beendet; der öffentliche statische Demolink bleibt erreichbar.

**Noch offen:** echte Touchgesten und iOS-Bildschirmtastatur. Nicht alle 43 Designs wurden einzeln neu freigegeben. Keine aktivierte native Galerie-/Kundenspeicherung in dieser statischen Demo, keine echte Shopify-Kaufprüfung. Kundenkonfi und Shop wurden nicht ersetzt, kein Main-Merge oder Astra-Eingriff. Commit-/PR-Link wird nach Erstellung ergänzt.

---

# Mobile Demo – sichtbare Prüfung vom 07.11.2026

## Auftrag und Grenzen

Eigener Branch `dev/mika-mobile-demo-20261107`, Basis `8ffeed8d90191cb89f1188a336751de2b2a4e0c0`. Neue mobile Bedienoberfläche als abschaltbarer Zusatz zum vorhandenen Editor. Keine Änderung am bisherigen Konfi, keine neue Preis-/Geometrielogik, keine Shopify-Schreibzugriffe, kein Main-Merge und keine Arbeit in Astras Arbeitskopie.

## Referenz tatsächlich bedient

[Zakeke-Beispiel](https://store.zakeke.com/apps/zakeke?pid=5788997451932&handle=custom-phone-case&locale=en), Chrome mit 390 × 844 CSS-Pixeln. Prüfung mit neutralem Testtext „Demo“ und einem Motiv aus Zakekes eigener Galerie; keine Kundendaten hochgeladen und keine Bestellung ausgelöst.

- Plus öffnet die Werkzeugliste als unteres Panel.
- Text eingegeben und bestätigt; Textwerkzeuge erscheinen.
- Schrift „Aladin“ ausgewählt; Schriftgröße von 120 auf 80 geändert. Angezeigte Objektmaße ändern sich von 8,24 × 3,26 auf 5,49 × 2,18 cm.
- Text gelöscht; Design-Schaltfläche verschwindet. Rückgängig stellt die Gestaltung wieder her.
- „Images gallery“ geöffnet; sichtbare Kategorien, Suche und Kategorie „Funny Faces“ geprüft.
- „Snowman 1“ eingefügt; Original-Werkzeuge Entfernen, Ersetzen, Farben, Maske und Maße erscheinen.
- Maskenliste geöffnet; unter anderem Stern, Herz und Quadrat sichtbar. Maskenanwendung wurde nicht getestet.
- Kein echter Smartphone-/Touchtest behauptet. Browserbreite ist emuliert. Drag-/Pinch- und Checkoutprüfung der Referenz nicht durchgeführt.

Referenzaufnahmen liegen im lokalen Ausgabeordner `outputs/mobile-demo-20261107/` als `zakeke-bildbearbeitung-390.jpg` und `zakeke-werkzeuge-390.jpg`. Es werden keine Zakeke-Produktgrafiken in die Gravuru-Demo kopiert.

## Eigene Demo – Abnahme noch laufend

Die folgenden Nachweise werden nach der tatsächlichen Browserprüfung ergänzt. Ein erfolgreicher Build allein gilt nicht als Sichtprüfung.

- [ ] Startansicht 390 × 844 mit Originaltafel, Originaldesign und Preis
- [ ] Werkzeugmenü und alle fünf bestehenden Module
- [ ] Größen-/Preiswechsel, Motive und Suche
- [ ] Texte und Schriftwechsel
- [ ] Foto: vollständiger Upload, Größe, Maske, Löschen
- [ ] Rückgängig / Wiederholen / bestätigtes Zurücksetzen
- [ ] Hilfe / Ebenen / Vollbild / Speichern / Abschlussprüfung
- [ ] Weitere Mobilbreite, Querformat, Desktop
- [ ] Getrennte URL, Daten- und Browserablage; unveränderter bisheriger Konfi

## Sicherung

Vor Beginn neues vollständiges Git-Codearchiv `work/checkpoints/mobile-demo-20261107/baseline-8ffeed8d.zip`, SHA256 `e62c495dbe6544b6eb6735787ad6dd39cc8ca7e29ececaefc95d093edb0a3714`. Dies ist eine Codesicherung, keine neue Datenbank- oder Serversicherung.


---

# Design QA — Orientierung und sichtbare Bemaßung

Lokale Sichtprüfung Desktop 1280×720, 390×664 und 375×548: flacher Kundenkopf, aktive Feld-/Objektmarkierung, Feldname in der Schriftleiste, mobile zwei Reihen mit vollständig sichtbarem Papierkorb, komplette Bemaßung und freier Preis. Schraubenköpfe metallisch und 3,6 mm, Bohrungen unverändert. Eigene Texte und synthetisches Foto nach Design-/Größenwechsel in separater Testkopie erhalten. 146/146 gezielte Tests und Build bestanden. [Bilder, genaue Regeln und Grenzen](docs/handoffs/2026-10-30-konfi-orientierung-astra.md). Kein Live-/Safari-/Linux-Nachweis; Nutzeroriginale unangetastet.

# Design QA — Layoutnachtrag nach Richtung 6

Neun gesammelte Punkte umgesetzt. Lokale Sichtprüfung Desktop 1440×900, iPhone-13-Viewport 390×664 und SE-Viewport 375×548. Heller Werkzeugblock oberhalb der Platte, dunkle Kopfzeile, pinke Griffe, sichtbare Designs und weitere Bibliotheksmotive. Direkteingabe tatsächlich 42 px / Cinzel und ohne Zweizeilen-Scrollbalken am Desktop; Gravurgröße unverändert 8 mm. Mobile Textleiste zweireihig, Schritte/Preis frei, kein horizontaler Hüllenüberlauf. Bestehende Nutzerentwürfe unangetastet. [Bilder und Grenzen](docs/handoffs/2026-10-30-konfi-layout-nachtrag-astra.md). Kein Live-/Safari-Nachweis; zusätzliche Bestseller-Dateien von Chris stehen aus.

# Design QA — Kundenlogo-Vergleich

Lokaler SVG-Upload auf gesonderter D8-Kopie geprüft: Originalfarben/Schwarz auf echter Platte, kontrollierte Bestätigung, Abbruch unverändert, 12,99 € separat im Gesamtpreis, keine Foto-Bildbearbeitung für geprüfte Vektoren. Neue Logo-Dialogschrift und Buttons werden auf 16 px gehalten; 390×664 und 375×548 sind innen scrollbar. [Bilder und vollständige Grenzen](docs/handoffs/2026-10-29-kundenlogos-gravur-astra.md). Die damals gesammelten Layoutwünsche sind im Nachtrag vom 30.10. umgesetzt. Kein Live-/Safari-Nachweis.

# Design QA — ausgewählte Richtung 6

**Ergebnis: passed** für die lokale visuelle Umsetzung und die unten geprüften Interaktionen. Dies ist keine Freigabe für eine Live-Installation oder echtes iOS.

Quelle: `docs/handoffs/issue48-d-20261029/sichtpruefung/variante-6-entwurf.png`, ursprünglich `outputs/konfi-design-20261029/06-werkzeugband.png`, 1672×941 px. Der Benutzer hat genau Nummer 6 gewählt. Tatsächliche Screenshots im selben Verzeichnis: `variante-6-desktop.jpg` (1280×720), `variante-6-iphone-13.jpg` (390×664), `variante-6-iphone-se.jpg` (375×548). Screenshot-Raster entspricht jeweils der angegebenen CSS-Viewportgröße, 1 Bildpixel je CSS-Pixel. Referenz zur Beurteilung proportional auf die Desktopansicht bezogen, nicht als Laufzeitbild verwendet.

Zustand: lokaler D8-Kandidat, 120×80 mm, Hausmotiv und vier vorhandene Textfelder, ausgewählter Spruch `Heimathafen\nvon`, 8-mm-Anzeige, 21,68 €. Text-Reiter aktiv, keine offenen Dialoge. Quelle und gerenderter Desktop wurden im selben Vergleichsaufruf angezeigt; zusätzlich Fokus auf Werkzeugband, Tab-Unterstreichung, Textfelder und Preisleiste. Handyansichten separat auf sichtbare Fläche, Berührungsziele und Überdeckung geprüft.

| Oberfläche | Abgleich |
| --- | --- |
| Layout und Proportionen | Weißer Kopf, vollständiges dunkles Band, ca. 58/42-Arbeitsbereich, senkrechter Trenner, kompakter Footer. Originalplatte bewusst ohne generierte Verzerrung. |
| Typografie und Hierarchie | Bestehende UI-Schrift, deutlichere Buttongewichte, klare Feldlabels; echte Schriftprobe als vorhandene Glyphenpfade. |
| Farben und Konturen | Anthrazit #252a2e mit heller Beschriftung; weiße Arbeitsflächen, neutrale Feldränder. Bestehende Funktionsfarben für Auswahl/Löschen bleiben. |
| Assets und Inhalte | Originalgeometrie, Schriftpfade und Motiv unverändert; Designentwurf nur Referenz, keine generierten Assets im Produkt. |
| Zustände und Bedienung | Desktop-Band, mobile zwei Reihen, Vollbild/Rückkehr, Eingabefokus und eingeklappte Felder geprüft; Schritte/Preis bleiben frei. |

## Korrekturschleife

1. Erste Umsetzung: Seitenränder der Legacy-Hülle und abgerundeter aktiver Tab wichen ab; gezielt auf den Editor begrenzt korrigiert. Textzeilen kompakter gemacht.
2. Klick auf die während eines Updates neu gezeichnete Schriftprobe öffnete den Dialog nicht zuverlässig. Pointer-Ereignisse treffen jetzt den stabilen Button; tatsächlicher Klick Desktop/Handy öffnet den Dialog. Papierkorb auf dunkler mobiler Leiste hell eingefärbt.
3. Unabhängige Sichtprüfung: keine P0/P1, zwei P2. Erstes Handyfeld war unter den sichtbaren Bereich gedrückt; mobile Überschrift/Abstände komprimiert, Feld vollständig sichtbar. Eingeklappter Spruch zeigte eine halbe Folgezeile; Zeilenhöhe/Überlauf korrigiert. Beide Ansichten danach neu erfasst. Keine offenen P0/P1/P2 für diesen Umfang.

## Nachweise

- 71/71 gezielte Tests auf dem gemeinsamen Prüfbranch; Liste und Umfang im [Bericht](docs/handoffs/2026-10-29-konfi-design-6-astra.md). Kein weiterer Vollauf behauptet.
- 900×720: Band wechselt ohne horizontalen Überlauf auf zwei Reihen; 1280×720 auf eine Reihe zurück.
- Schriftgröße 8→9, Rückgängig 8; Vollbild öffnen/schließen, Wechsel zu 375/390 und zurück; Schriftwahl per Klick und Feldoptionen auf/zu.
- Mehrzeiliger Spruch fokussiert 66 px, eingeklappt 44 px. Vier Texte nach Neuladen erhalten. Keine neuen Warnungen/Fehler im Browserprotokoll.
- Physisches Safari/iPhone, Bildschirmtastatur/Pinch und späterer echter Warenkorb bleiben gesondert offen. Kein Live-Zugriff.

---

# 11.10.2026 · Vorlagenabgleich: Originalfotomaske und M01/M02-Navigation

Umfang dieses Durchlaufs: bewahrte Fotoform, verständliche Elemente, Hauptnavigation und wahrheitsgemäße Verbindungs-/Bestellanzeigen. Keine vollständige visuelle Abnahme aller historischen Produktdesigns.

**Belege und Zustand:** Quelle `/workspace/recovery-private/reference-check/design-reference/produktuebersicht-variante-2.png` und `produktbearbeitung-variante-2.png` (je 1487 × 1058). Browseraufnahme bei 1440 × 1000 CSS-Pixeln, deviceScaleFactor 1, zusätzliche Mobilprüfung 390 × 844. Quelle proportional auf 1440 px Breite normalisiert; Umsetzung für gemeinsamen Vergleich auf die ersten 1025 px beschnitten. Kombinierte Eingaben `/workspace/recovery-private/template-r5-navigation/dashboard-comparison.png` und `editor-comparison.png` (2880 × 1055). Einzelaufnahmen `overview.png`, `editor-photo.png`, `profiles.png`, `profiles-mobile.png`, `overview-mobile.png` im selben privaten Verzeichnis. Gesamtaufnahmen inklusive Bild-/Eigenschaftenbereich geöffnet; Foto-/Eigenschaftenausschnitt und Kopfzeile darin lesbar. Private Produktbilder bleiben außerhalb Git.

Die Quelle zeigt Acrylglas und sechs illustrative Produkte; der geprüfte Bestand zeigt die tatsächlichen zwei Konfigurationen, im Editor eine Schiefer-Gedenktafel mit gewähltem Foto. Diese Unterschiede sind Daten-/Materialzustände, keine fehlenden vier Produkte. Referenz dient hier dem gemeinsamen Aufbau, nicht einem vorgetäuschten identischen Produktzustand.

**Vergleichsverlauf:**

- P1: Foto nach PDF-Aufbereitung rechteckig statt originaler Kreuzmaske. Quelle `GT-S-2_2.PDF`, unveränderliche Assetquelle privat vorhanden. Korrigiert durch eigene Originalmasken-Ressource in Import, Vorschau, Kundenansicht und Ausgabepaket; tatsächliche Browseransicht und Gravur-PDF geöffnet. Echte Musteraufnahme und Uploadhinweis bleiben sichtbar. Vollständige Cormorant Garamond entspricht der ausdrücklich gewählten Schriftalternative.
- P2: Zweizeilige überladene Hauptnavigation und widersprüchliche Verbindungs-/Bestelltexte. Vier primäre Wege nach M01/M02 wiederhergestellt, Zusatzwerkzeuge unter Verwaltung; Status aus Sitzung bzw. gespeicherten Bestellungen. Neue Kopfzeile und offene Profilseite in Desktop/Mobil geprüft.
- Erste neue Aufnahme zeigte fehlende Shell-Ressourcen. Statische Auslieferung ergänzt; erneut aufgenommen, keine 404 oder Konsolenfehler. Schriftupload über Verwaltung erreichbar; Master-Link öffnet Masteransicht. Die CSP bleibt strikt.
- P2: Technische Elementnamen und unlesbare Koordinaten. Elementnamen bearbeitbar; aktuelle Vorlage verwendet Kontur/Lebensdaten/Foto/Name. Anzeige auf zwei Dezimalstellen begrenzt, gespeicherte Originalgeometrie unverändert.

**Fünf Prüfflächen:** Typografie nutzt bestehende Schrift-/Feldhierarchie; kein neuer Markenfont erfunden. Abstand/Grid folgt vierteiliger Kopfzeile und dreispaltigem Editor; zusätzliche echte Bearbeitungsfunktionen brauchen rechts Scrollraum. Grüntöne, helle Flächen und Fokusmarkierung erhalten. Tatsächliche Material-/Fotobilder scharf und ohne Ersatzzeichnungen; Maske aus Originaldaten, keine Nachzeichnung. Texte unterscheiden lokale Sitzung, Shopify-Testbetrieb und öffentliche Freigabe.

**Bedienung:** Foto ersetzen, Text ändern, Auswahl/Ziehen, Speichern/Neuladen, Schriftupload/Gruppe und Rückgängig/Wiederholen im umfassenden Händlerbrowser bestanden. Gesonderte Navigation bei 390 px ohne Überlauf. Authentifizierung synthetisch; echte Shopify-Händlersitzung dadurch nicht bewiesen. Der blaue dünne Auswahlgriff ist reine Bedienoberfläche und wird nicht ausgegeben.

**Nachlauf:** Keine P0/P1/P2-Abweichung im abgegrenzten Paket offen. Ein pixelgleicher Nachbau sämtlicher Motive, Produktfotos und historischem PDF-Schriftsatz ist nicht behauptet. Externe Anschlüsse und Maschinenabnahme siehe Releasebericht.

final result: passed

---

# Visuelle und funktionale Ergänzungsprüfung – M02-Varianten, 05.10.2026

Umfang: Variantensteuerung innerhalb der bestätigten M02-Struktur. Die Fotoansicht `docs/dashboard-20261004/dashboard-m02-continuation.png` wurde gemeinsam mit `referenzen/M02.png` bei 1487 × 1058 geprüft: Bereiche/Elemente links, vollständige vorhandene Szene mittig, Fotoeigenschaften rechts bleiben erhalten. Die neue Optionenansicht `dashboard-m02-options.png` ist eine funktionale Ergänzung, für deren genaue Felder kein separater ausgewählter Mockup vorliegt; sie übernimmt die bestehenden M02-Form-/Fokusregeln. Eigenschaftenausschnitt und Mobilaufnahme separat geprüft.

- Typografie: bestehende Überschrift-/Feldhierarchie; Gruppentitel, Klartextlabels und explizit benannte Startauswahl. Keine neuen Fonts.
- Layout: Dreispaltenstruktur bleibt; Varianten rechts über dem gemeinsamen Preisprofil. Lange Angaben umbrechbar, 390 px ohne Überlauf. Preis oberhalb des Produkts; kein Dialog verdeckt die Gestaltung.
- Farben: unverändertes M02-Grün, helle Gruppenränder, klar markierte Checkboxen und Fokus. Letzte verbleibende Option ist deaktiviert, mit Erklärung zur Mindestanzahl.
- Bilder: ursprüngliche Szene/Designs und Sockel unverändert; explizite Ausführung bestimmt den Sockel, Backend-Defaults bestimmen den ersten Vorschaustand. Keine Wandhalterszene erfunden.
- Inhalte: tatsächlicher Katalog aus dem nativen Modell, eindeutige Freigabe und Startauswahl, sichtbarer Hinweis bei notwendigem Ersatz. Preis kommt aus der bestehenden serverseitigen Auflösung. Keine zweite Kalkulation.

Browserablauf mit synthetischem Produkt: Auswahl reduzieren und erneut aktivieren, gültige Startauswahl, Entwurf/Speichern/Reload, Übernahme im echten Kundenrenderer, 36,97/14,99 Euro, Verlustschutz beim Verlassen und Mobil. Keine Seitenfehler. Kein vollständiger Screenreader- oder Fertigungsnachweis. Die Wandhalterung wird als Option/Preis verarbeitet, ohne neue Szenengrafik. Alle P1/P2-Befunde des geprüften Pakets behoben; persönliche visuelle Abnahme bleibt ausstehend.

final result: passed

---

## Vorherige M01-Prüfung

# Visuelle Prüfung – M01-Produktübersicht, 05.10.2026

Geltungsbereich: M01-Übersicht und Verwaltungsaktionen für das vorhandene Acrylmodell. Referenz `docs/dashboard-20261004/referenzen/M01.png` und fertige Aufnahme `docs/dashboard-20261004/dashboard-m01-overview.png`, jeweils 1487 × 1058 Pixel und deviceScaleFactor 1. Beide Bilder nach der letzten Korrektur gemeinsam geöffnet und betrachtet. Ergänzend `dashboard-m01-overview-mobile.png` (390 × 844 CSS-Viewport, ganze Seite) und `dashboard-m01-selection-mobile.png`.

## Vergleich und Korrekturen

- P1 Ausgangsstand: kleines Portrait mit großen leeren Seitenflächen. Jetzt breite fotografische Komposition aus der echten vorhandenen Szene, vollständige Platte und vorhandener Sockel. Keine Generierung neuer Produktgestaltungen oder Austausch der Originalarbeit. Materialmischung und sechs Beispiele im M01-Mockup sind keine gespeicherten Produkte; drei ausdrücklich synthetische Acrylprodukte zeigen den tatsächlichen Adapterumfang.
- P2 erste Umsetzung: Seitenstreifen/Tablettübergang versetzt, Suchsymbol über dem Feld. Korrigiert: nur äußerster leerer Szenenrand verlängert, unveränderte Mittelkomposition, keine vertikale Verschiebung; Suchsymbol korrekt im Feld. Platte und Sockel jetzt vollständig in der Kartenkomposition enthalten.
- P2 fehlende Kartenaktionen: Mehrmenü, beschriftete Checkboxen, sichtbare Auswahlleiste und Archivbestätigung funktionieren über reale vorhandene API. Die Bestellstrecke bleibt sichtbar als „folgt“ gekennzeichnet.
- P2 Kopf zu hoch: Navigation und oberer Abstand an M01 angeglichen. Zusätzliche Zeile für sichtbare Auswahl und Anzahl bewusst erhalten. Aktionsicons aus Tabler 3.35.0 (MIT), passend zur bereits eingesetzten M02-Bibliothek.

## Fünf Prüfflächen

- Typografie: bestehender Schriftstack; 32-px-Seitentitel, 18-px-Kartentitel, gut getrennte Detailzeilen. Stabile lange technische IDs werden nicht durch ausgedachte CFG-Nummern ersetzt; vollständiger Wert im Titelattribut und in der Bearbeitung kopierbar.
- Layout: drei gleich breite Karten, 16-px-Abstände, Bild dominiert; kleinere Displays zwei/eine Spalte. Mobil 390 px ohne horizontalen Überlauf. Titel dürfen umbrechen; Aktionen bleiben bedienbar.
- Farben: Dashboard-Grün aus ausgewähltem M01/M02, helle neutrale Flächen. Kundenkonfigurator-Farben nicht verändert. Auswahl und Fokus erkennbar.
- Bilder: gespeicherte Revision, echter Renderer, Originalfoto/-design/-sockel. Querformat durch Verlängerung leerer Bildränder. Landschaftsfotos des generierten Mockups sind weiterhin keine gelieferten Produktionsassets. Keine behauptete Pixelgleichheit; fachliche Originaltreue hat gemäß Nutzer Vorrang.
- Inhalt: echte gespeicherte Größen, Status, Stand und Designanzahl; Beispielnamen klar als Prüfprodukte. Shopify und Bestellungen werden nicht als angebunden ausgegeben. Fotoabbildung ist von Kundenstandard getrennt beschriftet.

## Bedienprüfung und Grenzen

Cloud-Chromium/Playwright mit In-Memory-Prüfbestand, einschließlich echter konkurrierender API-Änderung, Archivierung/Zurückholen, Kopieren, Suche, Filter, Auswahl, Tastatur, Mobil und Bildfehler. Keine Seitenfehler. Kein natives In-App-Browsersteuerungswerkzeug oder öffentliche Dashboard-URL behauptet; kein Sites-Publish. Vollständige Screenreader-, Bestell- oder Fertigungsabnahme ist nicht Teil dieses Pakets.

P3: Die breite Szene bleibt optisch schlicht, da bestehende Originalressourcen weiterverwendet werden. Eine neue fotografische Umgebung wäre eine separate Gestaltungsauswahl. Persönliche Nutzerabnahme der neuen Karten und mobilen Anordnung bleibt ausstehend.

final result: passed

---

## Vorherige M02-Prüfung (weiterhin gültig für ihren Geltungsbereich)

# Visuelle Prüfung – M02 Produktbearbeitung, 05.10.2026

Geltungsbereich: ausgewählte M02-Bearbeitungsansicht mit bestehender Produktszene und den nachträglich vereinbarten Kundenrechten. Keine Abnahme der gesamten Werkstatt oder von M01.

Quelle: `docs/dashboard-20261004/referenzen/M02.png`, 1487 × 1058 Pixel. Gerenderte Umsetzung: `docs/dashboard-20261004/dashboard-m02-desktop.png`, gleiche CSS-/Pixelgröße und deviceScaleFactor 1. Zustand: „Designs & Elemente“, Foto ausgewählt, synthetisches Produkt mit Eichenblock. Beide Dateien nach der letzten Korrektur gemeinsam im Bild-Tool betrachtet; zusätzlich `dashboard-m02-inspector.png` als lesbarer Ausschnitt. Mobil: `dashboard-m02-mobile.png`, 390 × 844 CSS-Viewport, Ganzseitenerfassung; separate Textinteraktion `dashboard-m02-mobile-text.png`.

## Vergleich und Korrekturen

- P1 Ausgangsstand: bisheriger Formulareditor ohne zentrale Produktvorschau. Jetzt drei Spalten in M02-Proportionen (20,3 % / flexibel / 26,3 %), kontextbezogene Eigenschaften und große reale Vorschau. Bedienung per Elementliste und Produktklick überprüft.
- P2 erste Umsetzung: Checkboxtexte klebten an den Eingaben, Produktbild-Auswahl wurde von einem transparenten Rahmen abgefangen, Symbole/Design-Miniaturen fehlten. Behoben: spezifische Flexabstände, dekorative Trefferflächen ohne Pointer-Ereignisse, lizenzierte Tabler-SVGs (3.35.0, MIT) und tatsächliche gespeicherte Designvorschauen.
- P2 Zwischenstand: automatische Scrollbewegung schnitt in der Aufnahme die Hauptnavigation ab; Bereichsbuttons waren zentriert. Jetzt Öffnen am Seitenanfang und linksbündige Bereichsnavigation. Neu aufgenommen und zusammen mit M02 betrachtet.
- P2 Fotospalte zu hoch durch redundante Erklärtexte. Gekürzt; Fotovorschau, Ersetzen, Rechte, Hinweis und Originalerhalt sind bei Desktop sichtbar. Eigenschaftenausschnitt erneut geprüft.

## Fünf Prüfflächen

- Typografie: vorhandener Systemschriftstack, 22-px-Titel, 21-px-Eigenschaftstitel, 15-px-Bereichsnavigation, 13–14-px-Eingaben. Gestaltungsschriften aus vorhandenen Fontressourcen; keine neuen Schriftdateien oder erfundenen Fontfreigaben.
- Layout: durchgehende Dreispaltenstruktur, Vorschauhöhe 620 px, separater Designstreifen. Mobil keine abgeschnittenen Schaltflächen oder horizontale Überbreite. Rechteinschränkungen und zusätzliche Elemente führen zu mehr Einträgen als im Beispielmockup.
- Farben: Grün/helle Flächen der M02-Referenz. Die frühere ungefragte Übertragung der grauen Konfiguratorfarbe auf das Dashboard wurde zurückgenommen. Kein Eingriff in die Konfiguratorfarbgestaltung.
- Bilder: Originalressourcen und bestehender Designrenderer, inklusive bestehender Sockelbilder. Die echte native Szene liegt im Hochformat vor; sie bleibt proportional vollständig sichtbar und ist nicht das generierte Landschaftsfoto aus M02. Dies folgt der Nutzervorgabe zur Weiterverwendung vorhandener Produktarbeit, keine behauptete fotografische Pixelgleichheit. Beispielbild/Dateizuordnung auch nach Speichern geprüft.
- Inhalte: echte Feldnamen/Revisionen/Rechte statt fiktiver Shopify-Zuordnungen. Positive Schalter „Frei verschiebbar“/„Größe veränderbar“ entsprechen den später vereinbarten Backend-Freigaben; feste Flächen sind gesperrt. Bestellungen sichtbar als „folgt“, freie Szenen und Shopify im jeweiligen Bereich als offen benannt.

## Interaktionen und Grenzen

Chromium/Playwright in der vorhandenen Cloud auf geschütztem Loopback 8973. Kein verfügbares natives In-App-Steuerungswerkzeug; keine behauptete Sites-Preview oder Veröffentlichung. Tests und die tatsächlich geprüften Browserhandlungen sind in `docs/dashboard-20261004/DASHBOARD-M02.md` aufgeführt. Keine JavaScript-Seitenfehler in den geprüften Abläufen. Keine vollständige Accessibility-/Shopify-/Produktionsabnahme.

P3: Die Mobilanordnung ist ein umgesetzter Vorschlag, dessen persönliche Abnahme noch aussteht. Landschaftsszene aus dem generierten Mockup nicht als Originalasset vorhanden; bestehende native Szene bewusst erhalten. M01-Karten bleiben das folgende separate Paket.

final result: passed

---

## Historische Prüfung; keine Gesamtfreigabe

Der folgende frühere M01-Bericht wurde im anschließenden Abgleich korrigiert: „passed“ belegte nicht die vollständige Übereinstimmung mit M01/M02. Große fotografische M01-Karten waren weiterhin offen, M02 damals noch nicht angebunden.

# Visuelle Prüfung – Dashboard M01, 05.10.2026

Source visual truth: `docs/dashboard-20261004/referenzen/M01.png`, 1487 × 1058 Pixel. Bestätigte große Produktkarten und obere Navigation. Nutzerauftrag: vorhandenes Dashboard fortsetzen, funktionierende Komponenten und tatsächliche Produktdaten wiederverwenden. Keine Erzeugung der sechs fiktiven Mockup-Produkte.

Implementation: `docs/dashboard-20261004/dashboard-m01-desktop.png` (1487 × 1058 Pixel/CSS, deviceScaleFactor 1), `dashboard-m01-mobile.png` (390 CSS-Pixel breit, Screenshot des gesamten Dokuments bei 390 × 844 Viewport), `dashboard-card-detail.png` als lesbarer Kartenausschnitt. Gerendert mit Chromium/Playwright ausschließlich in der Cloud auf geschütztem Loopback-Port 8972. Kein zugängliches natives In-App-Browsersteuerungswerkzeug; kein behaupteter terminal.local-/Sites-Preview-Lauf.

Quelle und erste Umsetzung gemeinsam im Bild-Tool betrachtet; nach Korrektur Desktop/Mobil sowie Kartendetail erneut geöffnet. Vergleichszustand: Produktübersicht ohne geöffneten Editor. Drei aktive synthetische Prüfprodukte statt sechs Mockup-Produkte; andere Datenzahl bewusst, kein Pixelgleichheitsanspruch.

## Befunde und Korrekturen

- P1, erste Kartenvorschau: gemeinsamer Renderer lehnte die intern eingesetzte Bild-Data-URL ab und zeigte „Bild nicht verfügbar“. Korrigiert durch internen, ausschließlich nach dem Rendern ersetzten Bildverweis. Originalrenderer/Produktdaten unverändert. Nachkontrolle: echtes mitgeliefertes Beispielfoto und jeweilige gespeicherte Namen sichtbar. HTTP-Test prüft fehlende Platzhalter und unveränderte Revision.
- P2, erste Mobilansicht: geerbter Zeilenumbruch drängte die Navigation in eine schmale rechte Spalte. Erstkorrektur horizontale Reihe, Nachkontrolle zeigte abgeschnittenen Profile-Zugang. Endkorrektur 2×2-Navigation; aktuelle Mobilaufnahme zeigt alle vier Zugänge ohne horizontalen Überlauf.
- P2, Datenmenge: ungekürzte PNG-Quellen verursachten über 4 MB eingebettete Daten pro Karte. Nur für Dashboard-Vorschauen auf 543 × 724 JPEG abgeleitet (zusammen 85.905 Bytes vor Base64); Herkunft und Hashes in `app/workshop/preview-assets/provenance.json`. Druckoriginale unverändert.

## Fünf Prüfflächen

- Typografie: vorhandener Inter/Segoe-UI/Arial-Systemstack; klare 32-px-Überschrift, 18-px-Kartentitel, 12-px-Metadaten. Kleine ID bricht kontrolliert um. Keine neue Schriftlizenz behauptet.
- Abstände/Layout: obere Navigation, breite Aktionszeile, Such-/Filterreihe, drei Karten pro Desktopzeile, zwei bei mittlerer Breite, eine mobil. Darstellung der vollständigen Platte statt Beschneiden auf ein Landschaftsbild: bewusst zur lesbaren echten Designkontrolle.
- Farben: Weiß/Hellgrau/Graphit wie zuletzt am Konfigurator beschlossen; Design-/Fotofarben erhalten. Statusbadges bleiben semantisch getrennt. Fokus, Filterzustand und Primäraktionen sichtbar.
- Bildqualität: vorhandene Quellen und gemeinsamer Designrenderer; keine generierten Ersatzprodukte. Vorschauen revisionsbezogen, ohne Bediengriffe. Kartenausschnitt geprüft, Foto sichtbar und Konturen sauber. Keine behauptete fotografische Übereinstimmung mit nicht vorhandenen Holz-/Schieferprodukten aus M01.
- Inhalt: tatsächliche Konfigurations-ID, Revision, Verfahren, Grundformat und Designzahl. Keine erfundenen Shopify-IDs, Verknüpfungen, Bestellungen oder Freigaben. Nur vorhandene Profile/Stapelverwaltung verlinkt.

## Interaktionen und Grenzen

Chromium: Suche, leere Treffer, Druck/Gravur/Archiv, Masteransicht, Kopie aus gewähltem Master, erneut öffnen, ungespeicherte Eingaben beim Wechsel bewahren/gezielt verwerfen, mobile Navigation ohne Überlauf. Keine Seitenfehler. 174 Quelltests erfolgreich, nach Bildoptimierung zwei HTTP-Integrationstests erneut erfolgreich. Build 76 Ressourcen/1 Modell.

Der M02-Produkteditor ist weiterhin der nächste Ausbau; bestehender Editor funktioniert. Der Bildschirm ist aktuell im Cloud-Entwicklungsserver geprüft, nicht als zusätzliche gehostete Dashboard-Site veröffentlicht. Das separate „Muster Acrylglasbild“ bleibt Version 12.

P3: Bei später vorliegenden weiteren Material-/Produktbildern mehr visuelle Vielfalt; keine erfundenen Datensätze dafür anlegen.

final result: passed

---

## Historischer Bericht der Konfiguratorarbeit

# Visuelle Prüfung – kompakte Direktbearbeitung

Source visual truth: Nutzerscreenshot im Chat vom 04.10.2026 (großes weißes Textformular über dem Acrylfoto). Auftrag ist ausdrücklich Verbesserung dieses Bereichs, keine identische Nachbildung des unerwünschten Formulars. Reproduzierte Baseline aus Commit 911874e: `/workspace/gravuru-uv-pilot-private/compact-before.png`.

Implementation: `/workspace/gravuru-uv-pilot-private/compact-desktop.png`, `/workspace/gravuru-uv-pilot-private/compact-mobile.png`.

Desktop: Quelle und Umsetzung 1512 × 1080 Pixel / CSS-Pixel, deviceScaleFactor 1. Gleiche Route, Original-Beispielfoto, ausgewählte Überschrift im Bearbeitungszustand. Beide Bilder gemeinsam in einem Tool-Ergebnis betrachtet; keine behauptete pixelgenaue Übereinstimmung mit dem anders beschnittenen Nutzerscreenshot. Mobil: 390 × 844, Faktor 1, zusätzliche responsive Kontrolle bei zum Editor gescrolltem Dokument.

## Vergleich und Korrekturen

- P1, Ausgangszustand: großes Formular verdeckt Gesicht und Foto. Ersetzt durch etwa 44 px hohe Werkzeugleiste am Vorschaurand und einzeilige Texteingabe am ursprünglichen Text. Nachweis Desktop Vorher/Nachher: Foto frei, restliches Design unverändert. Kein zusätzliches Bildmaterial erzeugt.
- P2, erster Mobilvergleich: obere Werkzeugleiste überlappt Vollbild. Korrektur: mobile Leiste an den unteren Vorschaurand. Nachkontrolle im neuen Mobilbild: Schrift, Größe, Farbe und Abschluss sichtbar, Vollbild bleibt am oberen Rand. Keine horizontale Überbreite.

## Fünf Prüfflächen

- Typografie: kompakte UI-Schrift, lesbare 16-px-Minimaleingabe; die Texteingabe darf eine Ersatzschrift verwenden, die echte Designschrift bleibt im gerenderten Design und Export. Keine Änderung an Schriftdaten.
- Abstände: Leiste außerhalb der Hauptfotofläche; kleine Inline-Eingabe statt Formularblock; Responsive-Lage geprüft. Der Nutzer kann unter der gewählten Stelle liegende Designteile während der Eingabe vorübergehend verdeckt sehen.
- Farben: vorhandenes dunkles Grün, weiße Oberfläche, runder Farbpunkt; sichtbarer Fokus und selektierter Text. Keine neuen Markenfarben.
- Bildqualität: Originalfoto, Linien und Dekoration aus bestehender Vorlage unverändert; keine Neugenerierung oder Rasterersetzung der Designassets.
- Beschriftungen: Schrift, mm, Abbrechen/Fertig. Masterbegriffe dokumentiert. Ungefragte Neugestaltung der übrigen Designübersicht unterlassen.

Browserinteraktionen: Desktop/Mobil; Textänderung live, Enter/Abbrechen, erster Auswahlbereich, Größe in ganzen mm, Fotoeditor und Doppelklick, Rechte, kein Uploadscroll, PDF-Download. Keine Konsolen-/Seitenfehler im geprüften Ablauf. Ausschnitte waren im voll aufgelösten gemeinsamen Vorher-/Nachhervergleich lesbar, deshalb kein zusätzlicher vergrößerter Crop nötig.

P0/P1/P2 offen: keine im geprüften Bereich. Keine Aussage über Farbverbindlichkeit oder private Sitzungsdaten anderer Browser.

final result: passed

## Nachtrag: obere linke Vorschau

Mobilbild `/workspace/gravuru-uv-pilot-private/complete-mini-feedback.png` bei 390 × 844 visuell geprüft: vollständige Acrylszene inklusive Beispielfoto, Design, Texten und Sockel sichtbar; proportionale vergrößerte Vorschau oben links. Leere Ränder innerhalb des Hinweisrahmens entfernt. Zunächst fehlendes Beispielfoto korrigiert: Vorschau-only-Markierung umfasst auch das Foto selbst und darf in der Bildschirmkopie nicht pauschal entfernt werden. Verschachtelte SVG-Größen behalten ihre Designmaße. Bediengriffe werden nicht dupliziert. Rahmen transient und ohne Bewegungsanimation. Kein neuer Bildinhalt und keine privaten Daten.
