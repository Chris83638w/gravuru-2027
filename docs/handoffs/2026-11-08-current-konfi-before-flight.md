# Aktueller Konfi: gesicherter Stand vor der Flugpause

Stand: 08.11.2026, 17:05 Uhr Berlin, Codex/Mika. Dieser Bericht unterscheidet veröffentlichte Funktionen, lokal geprüfte Pakete und noch offene Kundenmeldungen. Er ergänzt die älteren Übergaben und ist der Wiedereinstieg für den nächsten Chat. Keine vollständige Server-/VPS-Sicherung behaupten: gesichert sind die jeweiligen Quellen, Wrapper, Pakete und bereits beschriebenen privaten Datenbankstände.

## Verbindlicher Auftrag und Schutz des Aufbaus

- Ein gemeinsamer Konfi, unterschiedliche bestätigte Produktgruppen- und Modulprofile. Kein neuer Editor je Produkt.
- Den freigegebenen Aufbau nur nach ausdrücklicher Abstimmung mit Mikail verändern. Andere KIs dürfen ihn nicht nebenbei umbauen. Produktoptionen vor dem Anlegen bestätigen lassen.
- Edelstahl-Türschilder: 8 Formen, 80 Größen, 404 bestehende Varianten; genaue Größenbezeichnungen bestätigt. Kein Foto, SVG-Logo 12,99 € je Logo. Die vorhandenen 251 Designvorlagen erhalten.
- Designs, Grundplatten und Schriften gemeinsam verwenden; stabile Original-IDs und bestehende Bestellstände erhalten. Galerieänderung und Produkt-Synchronisierung gehören in eine überprüfbare, wiederaufnehmbare Strecke.
- [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt verbindlich. Dieser Auftrag gestaltet keine Vorlagen neu.
- Aktuell sammelt der Nutzer weitere Screenshots und sagte **„Warte noch“**. Neue unten aufgeführte Layoutwünsche sind notiert, aber noch nicht umgesetzt. Diagnose und Sicherung laufen weiter.

## Nutzbare Kundenlinks

- [Shopify-Produktseite mit Hintergrundvorbereitung](https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen)
- [Direkter Konfi-Einstieg](https://gravuru-design.myshopify.com/apps/konfigurator/start?product=16190784438652&variant=58104606556540&ui=prio-r15)

Ein Direktstart durchläuft nicht zuerst die Produktseite. Der Vorladeeffekt muss deshalb über den ersten Link geprüft werden. Keine generierten signierten Sitzungstokens in Übergaben kopieren.

## Tatsächlich veröffentlichter Kundenstand

Aktive Runtime:
`/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-r15-assets-20261108-v1`

Kundenwrapper:
`/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-2027-merchant/app.cjs`

Wrapper-SHA256: `d1727087287f51f218b0fd2ccfadd97e1b81e104a246ad71080e36320b8fc372`

Bundle: `/_bundle/editor-6b08ecd29481848d.mjs` (152 Module, 16 Styles; 1.434.560 decodierte Bytes / 479.488 gzip im Build).

### 16:41 Berlin: erneute Touch-Auswahl und kompakte Vorschau

[Draft-PR 215](https://github.com/Chris83638w/gravuru-2027/pull/215), Branch `dev/mika-r15-customer-hotfix-20261108`, HEAD `58debfb`.

Nur drei Laufzeitdateien: `demo.mjs`, `preview-action.mjs`, `view-zoom.mjs`. Der runde Plus-Button und die kleinen grauen Vollbildpfeile öffnen vorhandene Funktionen. Die Wieder-Auswahl nach freiem Touch räumt einen verwaisten Primärkontakt auf, der nach Austausch des SVG-Knotens ohne Abschlussereignis verbleiben konnte. Echte zweite Finger bleiben von diesem Sonderfall getrennt. Keine neue Pinch-/Mausrad-Zoomfunktion.

Chromium mit Touch-Eingabe in 390 × 844 geprüft: Text nach freiem Tipp erneut auswählen/verschieben; Motiv platzieren, abwählen und wieder verschieben; Vollbild öffnen/schließen und Motiv erneut bewegen. Reale Shopify-Einbettung zusätzlich geprüft. Kein physisches Handy als getestet ausgeben. Ein Motiv erhöhte den Preis von 19,99 € auf 21,68 €; keine Bestellung ausgelöst.

1062 andere Appdateien blieben identisch. Die bereits aktive Reset-Position `.stage.append(bar)` wurde als Basis dokumentiert, nicht neu eingeführt. `design-reset.mjs` SHA256 `a3a4d09c22205fa2f2ba824b6788757774512743e75f8617146e78f8bd9a8f06` erhalten.

Vorherige Runtime: `private/mika-steel-r15-shopify-20261108`. Zwischenstand nach Touchfix: `private/mika-r15-touch-ui-20261108-v1`, Bundle `editor-72df81c9093744f7.mjs`, Wrapper-SHA `e71bc152ecce3c9c2fd2a94ccef18d856842f94fde826efa67961280ec839009`.

### 16:54 Berlin: begrenztes Vorladen und Einzelressourcen

[Draft-PR 216](https://github.com/Chris83638w/gravuru-2027/pull/216), Quellcommits `3a596688693122c4bda70c2c6257227953b84727` und `f33ef4513777ab31f07f90332fc4a48cf05aa86d`. Zusammengeführte Root-Basis: `c76e2a7` auf `dev/mika-r15-performance-acceptance-20261108`.

Nur acht Laufzeitdateien verändert; 1060 andere bestehende Appdateien identisch. Touch-/Vorschaufix erhalten, keine CSS-/Theme-/Produkt-/Preis-/Datenbankänderung. Zwei gleichzeitige Einzelabrufe für sichtbare Motivkarten und Schriftproben. Der vorherige Gesamtabruf von 703 Motivkonturen (13.386.007 decodierte Bytes) wird von diesen Listen nicht mehr automatisch verwendet.

Die bestehende Shopify-Einbettung startet nach Produktseitenladen einen unsichtbaren Ressourcen-Vorlader. Aktueller Umfang: Kernindex, aktives HTML/Bundle, höchstens drei Startschriften und sechs vorhandene Motive. Für den echten r4-Start: 484-Byte-Manifest, native Michroma-Schrift und sechs Hausmotive. Save-Data/2g, ausgeblendete Seite und bereits offener Editor verhindern diesen optionalen Start. **Das ist noch kein vollständiges Vorladen aller Designs, Motive und Schriften.**

Nachweis: lokale Browserprüfung mit gedrosseltem Netz, sechs Einzelmotive statt Gesamtpaket; Kreuz-Suche trotz vorheriger Kategorie; Platzierung von drei Motiven; Schriftliste sofort geöffnet, nach Scrollen echte Dancing-Script-Probe gewählt. Kein `motive-alle.json`-Abruf. Review fand eine Zwölfergrenze bei sichtbaren Karten; korrigiert und unabhängig 15/15 sichtbare Karten geprüft. Testsätze überschneiden sich und werden nicht addiert.

Nach Veröffentlichung: echte Shopify-Produktseite erzeugt Warmiframe und richtiges Ressourcenmanifest; „Jetzt personalisieren“ öffnet den funktionsfähigen eingebetteten Konfi. **Cachetreffer, ein messbarer Zeitgewinn am physischen Handy und sämtliche Designvorschauen wurden dabei nicht nachgewiesen.** Cross-Origin-Netzwerkmessung war in der verfügbaren Browsersteuerung eingeschränkt. Keine pauschale Aussage „alles vorgeladen“ oder „Performance fertig“.

Kundenmeldung nach Veröffentlichung: weiterhin langsam; Designs und Motive erscheinen erst beim Öffnen des Bereichs. Diese Meldung ist offen und wird gerade separat diagnostiziert. Späteres Live-Schalten verbessert dies nicht automatisch.

## Sicherungen und Rücknahme

Lokale Belege unter dem Arbeitsverzeichnis `C:/Users/Mikail Erdem/Documents/Codex/2026-11-04/lie/`:

- `outputs/r15-ui-touch-refresh-20261108/`: Patchmanifest, Vorherquellen, Vorbereitungs-/Aktivierungsbeleg und `live-mobile-compact-preview.png`.
- `outputs/r15-performance-acceptance-20261108/`: Vorbereitungs-/Aktivierungsbeleg, `browser-resource-proof.json`, `live-shop-embedded.png` und geprüftes Rolloutpaket.
- Aktuelles Performance-Paket: `r15-assets-reviewed-v1.tar.gz`, SHA256 `76d95ad4d3e5d435f9c9ff7221af8d1fdb612bf59102e933632977708e7db390`.
- Beide Runtimewechsel sicherten vorherige Quellen und Wrapper in `pre-switch-backup/`. Alte Runtimeverzeichnisse bleiben erhalten.

Performance-Rücknahme: ausschließlich den gesicherten Kundenwrapper auf `private/mika-r15-touch-ui-20261108-v1` zurückstellen und nach bekanntem App-Verfahren neu laden. Dadurch bleiben Touch-/Vorschaufix erhalten. Keine Datenbank zurückspielen, keine Medien oder Shopify-Daten löschen. Vor jeder späteren Rücknahme aktuellen Wrapperhash prüfen; zwischenzeitliche Releases nicht überschreiben.

Die beiden Draft-PRs 215/216 basieren auf `snapshot/mika-r15-active-20261108` bei `16eda6117945ff6e13c828ea2bf7781a853285d6`. Kein unkontrollierter Gesamtmerge des gegenüber älterem Main großen Runtime-Snapshots.

## Module, Galerie und Shopify-Synchronisierung

- [PR 213](https://github.com/Chris83638w/gravuru-2027/pull/213): private Modulverwaltung V2 auf `private/mika-module-connect-20261108-v2` unter `test-2027.gravuru-designwerkstatt.de` veröffentlicht. Zwei Modulprofile „mit Logo“/„ohne Logo“ vorhanden; keine Kundenprodukt-Zuweisung vorgenommen. Beide produktiven Schreibschalter aus. Authentifizierte Serverprüfung bestanden; Browserabnahme des privaten Verwaltungsfensters nicht als erledigt ausgeben.
- [PR 214](https://github.com/Chris83638w/gravuru-2027/pull/214), `57f6f70bc79eeb4f0d1655e80792b5d9fdd59db7`: geprüfte, wiederaufnehmbare Profilaktivierung für 251 Designs und 404 Varianten einschließlich Konfliktprüfung, abgebrochener Shopify-Antwort, Neustart, Rücknahme und Wiederholung. **Vorbereitet, nicht produktiv aktiviert.**
- Neuer kombinierter Kunden-Modulpatch auf `c76e2a7` wird getrennt gesichert. 12 Laufzeitdateien; bereits vorhandene UI, alle 36 CSS-Dateien, Touch-/Vorschaufix und Performance müssen erhalten bleiben. Cross-Realm-Profilkorrektur gehört dazu. Agent liefert eigenen Draft-PR und Manifest; kein stiller Rollout.
- **Veralteten Kandidaten `private/mika-r15-modules-20261108-v1` nicht aktivieren.** Ihm fehlen neue Touch-/Performance-Korrekturen.
- Galerie-/Original-ID-Zuordnungen und Astra-Arbeit nicht überschreiben. Der gemeinsame Modulkern ist noch keine vollständig abgenommene Galerie→Kundenprodukt→Shopify-Synchronisierung.

## Neu gesammelte Punkte — noch nicht umgesetzt

1. Desktop-Vollbild: kompakte Bedienleiste unten statt oben; links neben Zurücksetzen Vollansicht/Rückkehr, rechts Rückgängig/Wiederholen/Hilfe/Ebenen. Mehr Fläche für das Schild. Nicht über die ganze Plattenbreite strecken.
2. Grauen Vorschau-Balken entfernen; Vergrößern-Pfeile direkt unten rechts an die Produktfläche setzen.
3. „Zurück zum Produkt“ als klar erkennbaren kontrastreichen Button mit Pfeil und Umrandung darstellen.
4. SVG-Upload meldet unterschiedliche Seitenverhältnisse von Zeichenfläche und Dateimaßen. Nur Screenshot liegt vor, keine konkrete SVG-Datei. Diagnose bestätigt: `customer-vector-logo.py:142–143` erzwingt praktisch identische Verhältnisse; gültige 200×100-Außenmaße bei quadratischer `viewBox`, `preserveAspectRatio=none` und bloße Rundungen werden reproduzierbar abgewiesen. Zeile 131 sperrt außerdem andere gültige Ausrichtungen. Der [SVG-Standard](https://www.w3.org/TR/SVG2/coords.html#ComputingAViewportsTransform) regelt abweichende Verhältnisse ausdrücklich. Nicht nur Sperre löschen: Zeilen 145–147 überschreiben danach die Maße/Ausrichtung. Sichere Korrektur normalisiert die native Viewport-Abbildung in passive Pfade. Bestehende Original-/Ausgabeprüfsummen (`customer-vector-logo-media.mjs:37–38`) müssen für alte Dateien bytegleich bleiben oder über eine versionierte Konvertierung reproduziert werden. Bisher nur Diagnose, keine Änderung.
5. Langsame Motive/Designs: Designvorschauen fehlen vollständig im Warmmanifest; Bilder starten beim sichtbaren Design-Tab per IntersectionObserver. Erste Berechnung geschieht über authentifiziertes POST mit `no-store`, der Hash-GET-Pfad steht erst nach Erzeugung im Server-RAM bereit. Der Warmloader wählt für Stahl sechs Hausmotive; der sichtbare Bestsellerbereich verwendet eine andere Starterauswahl. Daher kein deckungsgleiches Vorladen der ersten sichtbaren Karten. Empfohlene nächste Umsetzung: gemeinsame Auswahl der tatsächlich sichtbaren Starterressourcen, revisionsgebundene vorab erzeugte Designvorschauen, kleine Hintergrundwarteschlange nach wichtigem Produktseiteninhalt. Keine komplette Bibliothek vorausladen. Messung von Netzwerk, Vorschauerzeugung und Browserdarstellung trennen. Noch nicht umgesetzt.

## Nachtrag: gemeinsames Modulpaket gesichert

Agent-Branch `dev/mika-r15-modules-performance-20261108`, Produktionscode `61fcb3f`, Dokumentstand `7ec611a` ist auf GitHub. [Modul-Übergabe](https://github.com/Chris83638w/gravuru-2027/blob/dev/mika-r15-modules-performance-20261108/docs/handoffs/2026-11-08-r15-modules-performance.md), [Prüfnachweis](https://github.com/Chris83638w/gravuru-2027/blob/dev/mika-r15-modules-performance-20261108/docs/reviews/2026-11-08-r15-modules-performance/verification.md).

Zwölf-Datei-Paket lokal `outputs/r15-modules-performance-20261108/r15-modules-performance-patch.tar.gz`, SHA256 `aa8c7fc64c0164b6c12af73901eeab4c6eb684f1a01629360c27ed512d86c380`. Manifest-SHA256 `5beeddd7b5dff1a1dbd8be356ae8ba117b50b08184715d69aabe3f27c2fbfc07`. Laut Agent 41 geschützte Dateien byteidentisch; Build erfolgreich. 272/274 Tests im ersten Lauf, zwei veraltete Testannahmen korrigiert und beide betroffenen Dateien mit 19/19 nachgeprüft; damit 274 unterschiedliche Fälle erfolgreich, kein addierter Fantasiezähler. Eigenständige Root-Browserabnahme des kombinierten Pakets noch offen. Kein Livezugriff, keine Profilaktivierung, keine neue Oberfläche.

## Nächster Arbeitsschritt

Zuerst die beiden laufenden Diagnosen und den neuen Modul-Draft-PR hier ergänzen. Auf weitere Screenshots/Startsignal für Layout warten. Danach ausschließlich bestätigte Punkte als enges Paket vorbereiten, gegen aktiven Stand prüfen und mit sichtbarem Handy-/Desktopnachweis abnehmen. Die Flugpause beendet die Internetverfügbarkeit; keine weitere Onlinearbeit ohne Verbindung versprechen.

Für dauerhafte Erinnerung: diesen Einstieg, `STATUS.md`, die verlinkten Einzelübergaben und Issue #168 gemeinsam aktuell halten. Jeder Abschluss nennt exakten Stand, live/vorbereitet/offen, Beleg, Rücknahme und nächsten Schritt. Der nächste Chat soll diesen Bericht zuerst lesen, statt historische Aussagen „fertig“ ungeprüft zu übernehmen.
