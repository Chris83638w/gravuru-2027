# Demo R9 – bewusste Überlagerung und knappes Einpassen

Stand: 07.11.2026, eigener Branch `dev/mika-mobile-demo-20261107`, Draft #193. Bezug: Screenshot 183 und anschließende Präzisierung „Ein kleiner Abstand soll bleiben“. Die vorangehende R8-Übergabe und die Gesamtakte zu Galerie/Shopanbindung bleiben gültig. Designs folgen weiterhin dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); hier werden keine Vorlagen verändert.

## Sicherung und Umfang

Vor Änderungen: `checkpoints/mobile-demo-r9-overlap-20261107/before-r9-5d0a7907.zip`, SHA256 `930056d9ad3b166d4d6adfdc56a7a18d32e3a182097fff5a7a057cb13cf89ca9`. Ausgangsstand R8 `5d0a7907`.

Nur die zusätzliche Demo erhält das Verhalten. Kein Main-Merge, keine Änderung am Kundenkonfi, Shopify, Galerie oder an Astras Arbeitsstand. Keine Änderungen an Produktoptionen, Preisen, Schriften, Originaldesigns oder Grundplatten. Bestellung/Konto/Galerie bleiben in der statischen Demo getrennt.

## Nutzerentscheidung und Umsetzung

- Bei reiner Überlagerung zusätzlich **„So übernehmen und weiter“**. Das bestätigt genau die aktuelle Gestaltung; die bestehende Übersicht öffnet ohne Positionsänderung. Es ist keine Bestellung und keine pauschale Freigabe anderer Fehler.
- Bestätigung ist nur im Arbeitsspeicher und an Inhalt, Geometrie, Material/Größe, Optionen, Designrevision und tatsächlich gerenderte Konturen gebunden. Auswahl, Fokus und Ansichtszoom sind keine Designänderungen. Nach einer Änderung ist erneut zu bestätigen.
- Automatisches Einpassen verwendet native Schrift-/Motiv-/Foto-SVGs und dieselbe Gravurmaske wie die bestehende Überlagerungsanzeige. Transparente Ränder sind keine belegte Fläche. Die vorhandene Text-/Motivprüfung wird präzisiert, keine zusätzliche Foto-Pflichtsperre eingeführt.
- Nur betroffene und verschiebbare Elemente werden verschoben, bevorzugt Text. Keine Verkleinerung, Inhaltsänderung oder Rotation. Kleiner Konturabstand als Demo-Auslegung der Nutzerpräzisierung: rund 0,5 mm, auf das Prüfraster aufgerundet. Die Suche ist begrenzt und sucht eine nahe Position; kein mathematisch globales Optimum zugesichert.
- Bestehende erlaubte/absichtliche Template- und Fotopaarungen werden nicht auseinandergerissen. Neue Kollisionen werden vermieden. Ohne sicheren Platz bleibt alles unverändert, und die bewusste Übernahme bleibt erreichbar.
- Native Rand-, Rechte-, Pflichttext-, Foto- und Bestellprüfungen bleiben bestehen. Die Original-Platzierung bei neuen Elementen und die native Randkorrektur bleiben unverändert. Ein erfolgreicher Konturschritt ist mit einmal „Rückgängig“ umkehrbar.

## Aufbau und Rückweg

`mobile-demo/overlap-consent.mjs` hält die ausdrückliche Entscheidung; `contour-placement.mjs` plant allein Positionen aus binären Masken; `overlap-review.mjs` bindet native Render-/Randfunktionen an. Der native Workflow erhält zwei optionale Hooks. Ohne installierten Demo-Adapter läuft sein bisheriger Pfad unverändert. Der Paketbauer nimmt die drei neuen Module auf.

Asynchrone Änderungen, Abbruch, fehlende/inkonsistente Bildmasken und veraltete Prüfstände geben die Gestaltung nicht versehentlich frei. Generierte SVG-Filterkennungen werden für den Fingerabdruck vereinheitlicht; echte Pfade/Bilder/Zuschnitte bleiben enthalten. Leere optionale Textfelder zählen wie im nativen Gate nicht als belegte Kontur.

## Abnahme

203/203 gezielte Node-Tests bestanden: Demo-Shell, Text, Auswahl, Navigation, Überlagerungsentscheidung (24), Kontursuche (19), neue Integration (22), Paket/Publikation sowie native Workflow-/Vertrags-/Customer-tools-Tests. Zwei Unteragenten prüften ihre Module und lasen die Integration; keine offenen konkreten Blocker. Protokoll: `outputs/mobile-demo-20261107/r9-tests.txt`.

Lokaler Chrome bei 1440×1000 und 390×844: Übernahme öffnet native Übersicht ohne Objektänderung; Beispielname bleibt Pflichtfeld. Einpassen mit kleinem Abstand ändert nur `text-1` von (138;42,356) auf (138;22,8723), w=63,92099/h=42,924 bleiben gleich, übrige Elemente bleiben an ihren Positionen. Einmal Rückgängig stellt den vorherigen Stand wieder her. Kontrollierter Fall mit nicht verschiebbaren überlappenden Elementen: kein Teilstand geschrieben, Fehler sichtbar im Dialog, anschließend bewusste Übernahme weiterhin erfolgreich. Kontrollierter Randfehler: Übernahmebutton verborgen. Ein realer Kauf ist in dieser Demo weiterhin absichtlich nicht möglich. Handyprüfung im Desktop-Browser ist keine Abnahme eines physischen Android-/Edge-Geräts.

## Veröffentlichung und öffentliche Prüfung

Veröffentlicht ausschließlich unter dem neuen Pfad `/konfi-demo/mobil-20261107-r9/`, Quellcommit `04bfb9c032bebea1bf528c3b2ac935601123de72`. [22×14 frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r9/22x14.html?fresh=1), [30×20 frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r9/30x20.html?fresh=1). R8 bleibt unverändert als Rückweg erreichbar.

Paket: 83.370.072 Bytes, 2.019 Archivdateien; ausschließlich im neuen Ziel kam eine `.htaccess` hinzu. ZIP SHA256 `5a53b43480f4f6495d30d29b0b6bf559c1c368ed07f5664e066625086a54d257`; Manifest SHA256 `fdbeaf71845679fbc197eb219af3598a439abb8a74169a3a49fbfa8ec2a315eb`. Vorabprüfung ohne Schreiben, anschließend private Originalsicherung und Public-Inventar unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/mobil-20261107-r9-before-publication`. **10.099 bisherige öffentliche Dateien und die vier geschützten Originale hashgleich erhalten.** Kein Neustart, Routerwechsel, Shopify- oder Datenbankschreiben.

Elf öffentliche HTTP-Stichproben einschließlich der drei neuen Module und beider Einstiegseiten: 200, bytegleich zum Paket, korrekter Inhaltstyp, Brotli, no-store/noindex. Chrome bei 390×844: grüner Übernahmebutton sichtbar; Betätigung öffnet die native Übersicht und lässt sämtliche Objekte unverändert. Bei 1440×1000: erneute Änderung verlangt neue Bestätigung; automatisches Einpassen verschiebt nur `text-1` von (138,1;42,356) nach (138,1;22,8723), Größe und andere Elemente bleiben gleich; ein Undo stellt den Ausgangsstand wieder her. Der kontrollierte Überlagerungsfall wurde ausschließlich im Testtab aufgebaut. Abschließend frisch auf Originalvorlage geladen und Ansichtsemulation zurückgenommen. 30×20 öffnet mit 24,99 €; 22×14 mit 19,99 €. Keine Browser-Konsolenfehler bei der abschließenden frischen Ansicht. Kein echter Kauf ausgeführt.

Nachweise: [Vorprüfung](../reviews/2026-11-07-mobile-demo/host-preflight-r9.json), [Veröffentlichung](../reviews/2026-11-07-mobile-demo/host-publication-r9.json), [HTTP](../reviews/2026-11-07-mobile-demo/http-public-r9.json), [Bedienprüfung](../reviews/2026-11-07-mobile-demo/r9-public-browser.json), [203 Tests](../reviews/2026-11-07-mobile-demo/r9-tests.txt), [Handydialog](../reviews/2026-11-07-mobile-demo/r9-public-overlap-mobile.png), [Desktop nach Einpassen](../reviews/2026-11-07-mobile-demo/r9-public-fit-desktop.png).

Nächster Schritt nach R9: Mikail prüft die neue Demo am Handy. Weitere Änderungen nur nach Besprechung; anschließend die weiterhin dokumentierten Backend-/Designgruppen-/Synchronisierungsaufgaben fortsetzen.
