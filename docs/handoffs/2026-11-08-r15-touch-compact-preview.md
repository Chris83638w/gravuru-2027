# R15 – Touch-Wiederwahl und kompakte Vorschau

## Auftrag und Grenze

Kundenfreigabe vom 08.11.2026: Den großen Vorschaubutton durch vier graue Außenpfeile rechts unter dem Produkt ersetzen; „Gestalten +“ wieder als runden Plusbutton anzeigen. Das gemeldete Blockieren beim erneuten Antippen/Verschieben und die Überlagerung von Ansicht/Zurücksetzen im Vollbild korrigieren. Sonst bleibt der freigegebene Aufbau erhalten.

Keine Produkt-, Design-, Varianten-, Options- oder Preisänderung. Keine Themeänderung. Die gesonderte Modulverwaltung und das Vorladen gehören nicht in diesen engen Hotfix.

## Änderung

- `mobile-demo/demo.mjs`: Pluszeichen und korrekte Rückkehr der bestehenden Kopfleisten-Elemente nach Vollbild.
- `mobile-demo/preview-action.mjs`: 24-px-Pfeilsymbol in einer 44-px-Bedienfläche mit zugänglichem Namen „Produkt vergrößern“, gleiche native Vollbildfunktion. Plus mittig, Pfeile rechts. Im mobilen Vollbild bleiben Ansicht und Zurücksetzen getrennt bedienbar.
- `variant-m/view-zoom.mjs`: Ein neuer, vom Browser als primär gemeldeter Touchkontakt bereinigt einen verwaisten alten Kontakt. Echte zweite Finger bleiben wie zuvor gesperrt. Keine neue Pinch- oder Mausradbedienung.

Ursache des Touchfehlers: Beim Abwählen wird der berührte SVG-Knoten ersetzt. Im reproduzierten Chromium-Fall kam danach kein Endereignis mehr an. Die nächste Berührung wurde deshalb fälschlich als zweiter Finger behandelt. Nur zusätzliche End-Listener waren keine vollständige Lösung.

## Wichtige vorhandene Serverabweichung

Der aktive Server hängt den bestehenden Zurücksetzen-Bereich mit `.stage.append(bar)` ein. Der ältere Gitstand verwendete dagegen `[data-ux-stage].after(bar)`. Commit a8a33ce sichert die tatsächlich aktive Variante. Diese Datei wird **nicht** erneut aus der alten Quelle veröffentlicht. SHA-256 der zu bewahrenden Datei: `a3a4d09c22205fa2f2ba824b6788757774512743e75f8617146e78f8bd9a8f06`.

## Prüfung

- 46 gezielte Tests für Demo/Vollbild/Rückkehr und View-Zoom bestanden.
- Unabhängiger CUA-Test im echten Chromium mit emuliertem Touch, 390 × 844, auf isoliertem Host. Das ist kein physischer Handynachweis.
- Text nach Abwahl erneut verschoben: Position 66.811/53.361 → 62.859/49.409.
- Neues Hausmotiv nach Platzierung und Abwahl erneut verschoben: 56.5/15 → 65.841/10.
- Vollbild über neues Pfeilsymbol geöffnet, zurückgekehrt, Motiv erneut abgewählt und verschoben: 65.841/10 → 60/15.749. Breite 22.970, Höhe 20 und Drehung 0 blieben unverändert.
- Vollbild: Zurücksetzen endet bei x132; Ansicht beginnt bei x140. Beide 44 px hoch, 8 px Abstand, keine Überlagerung.
- Plus öffnet die bestehenden Werkzeuge. Der native Vollbilddialog bleibt derselbe.
- Lokaler Prüfhost verwendet das unveränderte echte Edelstahl-r4-Dokument mit 251 Designs/80 Größen, In-Memory-Datenbank und gesperrten Remote-Schreibaktionen.

Lokale Nachweise liegen unter `outputs/r15-ui-touch-refresh-20261108/`: `mobile-cua-accepted.png`, `mobile-compact-actions.png`, `mobile-fullscreen.png`, `patch-manifest.json`.

## Gesicherte Veröffentlichung

Quellstand: 7daab90, separat von den Moduländerungen. Paket verändert ausschließlich die drei oben genannten Laufzeitdateien. Vorbedingung ist die exakte Prüfsumme der drei alten Dateien und des Kundenstarters. Bestehendes Runtime-Verzeichnis bleibt als Rückfall erhalten, zusätzlich werden Kundenstarter und die drei Originaldateien gesichert.

Alle übrigen Appdateien werden mit dem aktiven Stand verglichen. Bestehende Datenbankpfade, Shopify-Konfiguration und Produktdaten bleiben erhalten. Erst nach gesondertem Build wird der Kundenstarter umgeschaltet. Rückfall erfolgt ausschließlich durch Wiederherstellen des gesicherten Starters und Neustart, nicht durch Zurücksetzen von Bestell- oder Produktdatenbanken.

**Veröffentlicht:** 08.11.2026, 15:41:15 UTC (16:41 Uhr Berlin). Kandidat `private/mika-r15-touch-ui-20261108-v1` ersetzt ausschließlich den Startpfad; 1062 übrige Appdateien stimmen mit dem zuvor aktiven Stand überein. Build: `/_bundle/editor-72df81c9093744f7.mjs`, 151 Module, 16 Styles, 478288 gzip-Bytes. Starter vorher `31781a783270f4704d0a1831f62aa50a4c44566a6ec6fa18c691a1205a81f6b9`, danach `e71bc152ecce3c9c2fd2a94ccef18d856842f94fde826efa67961280ec839009`.

Öffentlicher Shopify-Nachtest bestand: erneutes Textverschieben nach Abwahl, neues Motiv nach Platzierung/Abwahl verschieben, neues Pfeilsymbol öffnet vorhandenes Vollbild, Ansicht/Zurücksetzen mit 8 px Abstand. Preisprüfung 19,99 € → 21,68 € nach einem Motiv. Keine Bestellung ausgelöst. Live-Screenshot: `outputs/r15-ui-touch-refresh-20261108/live-mobile-compact-preview.png`. Belege: `prepared-receipt.json`, `activated-receipt.json`. Gesicherter alter Starter: `private/mika-r15-touch-ui-20261108-v1/pre-switch-backup/customer-app.cjs`; alte Runtime bleibt vorhanden.

## Parallel gesichert

- PR213: private Modulverwaltung, Profile mit/ohne Logo gespeichert, keine automatische Kundenprofil-Zuweisung.
- PR214: gesonderte Produktionstransaktion mit 251 Designs/404 Varianten, Wiederaufnahme, Konflikt-/Rollbackschutz; beide Schreibschalter weiterhin aus.
- Hintergrundladen: eigener Zweig `dev/mika-shop-asset-preload-20261108`, noch getrennt in Prüfung.
