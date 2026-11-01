# Funkklingeln: Auswahl nebeneinander und größer

Quelle vor Umsetzung: Chris am 01.11.2026 im Funkklingel-Chat: „Format und Position auch nebeneinander. dann kann auch alles wieder ein wenig größer präsentiert werden“. Umsetzung: drei Formatkacheln nebeneinander, zwei Positionskacheln in der folgenden Reihe; Rahmen, Farbe und Befestigung darunter im bereits freigegebenen gemeinsamen Block. Größere Vorschaubilder und Auswahlfelder; runde Farbauswahl bleibt bestehen. Hauptschritte, Optionen und Master-Funktionen bleiben erhalten. Keine neue Preis-, Maß-, Rechte- oder Produktregel. Keine Designs geändert; [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich.

Ergänzende Quelle vor Umsetzung: Chris am 01.11.2026: Gravur darf nicht auf Edelstahl gehen, die Vorschau darf beim Anklicken eines Texts nicht springen; alle Gestaltungselemente einschließlich „12a“ müssen verschiebbar sein, die Klingel bleibt fest. Danach prüfen und live stellen, Master-Funktionen nicht überschreiben.

Chrome-Befund: AOSU, 35×18, Klingel links, ganzer Rahmen. Hausnummer bei y=1,069 mm auf dem Edelstahl, Schriftgröße auf 3 mm geschrumpft. Die Randbegrenzung verwendet die ganze Edelstahlplatte, während Autofit die Acrylfläche prüft. Die eingeblendete Textleiste verändert zusätzlich die Vorschauhöhe nach Beginn einer Ziehgeste. Korrektur nur für native Funkklingeln: Acrylbegrenzung vor Autofit und Zeichnen, visuelle Begrenzung der Gravur sowie stabiler Werkzeugbereich. Rechte, Gerätegeometrie und allgemeine Master-Regeln bleiben maßgeblich.

Eigener Branch `dev/funkklingeln-auswahlreihen-20261101` ab main `781d743`. Bestehende Live-Freigabe gilt. Prüfungen und Live-Nachweis folgen.

## Umsetzung und lokale Prüfung

- Format: drei größere Kacheln, Position: zwei Kacheln darunter; 60-px-Abbildungen, Farbkreise 50 px. Unter 360 px umbrechende Formatkacheln.
- Randbegrenzung verwendet bei nativen Funkklingeln die gewählte Acrylauflage vor Autofit und Render. Objektbox und gegebenenfalls größere Glyphenumrisse werden gemeinsam begrenzt. Ein übergroßes Element bleibt validierungspflichtig. Vorschaugravur wird zusätzlich auf Acryl beschnitten; Gerätebild, Griffe und Fertigungsdaten bleiben getrennt.
- Permanenter Werkzeugplatz verhindert Größen-/Positionssprünge beim Auswählen. Bestehende Toolbar-Knoten und Ereignisse bleiben erhalten; andere Produktlinien nutzen weiter die Master-Platzierung.
- Direkte Millimetereingabe übernimmt Änderungen auch während der Eingabe über den bestehenden Größenbefehl. Keine Änderung der Elementrechte.
- 37 gezielte Grenz-/Darstellungs-/Mastertests und 82 weitere Rechte-/Foto-/Format-/Workflowprüfungen: 119 erfolgreich. Der erste erweiterte Lauf meldete eine fehlende neue Closure-Variable in der Foto-Testumgebung; diese wurde ergänzt, alle 24 Foto-Bedienprüfungen erneut erfolgreich. Build erfolgreich.
- Chrome Desktop 1920×855: Vorschau vor/nach Auswahl unverändert bei x=42, y=180, 1020,58×524,86 px. „12a“ per Ziehen versetzt, per Eingabe 24 mm tatsächlich als Schriftpfade gerendert. Ziehen auf Edelstahl stoppt innerhalb Acryl, kein Überstandhinweis.
- Chrome mit 390×844 px: Vorschau vor/nach Auswahl unverändert bei x=19,5, y=272,25, 351×180,5 px. „12a“ auch mobil per Ziehen versetzt. [Desktop](assets/2026-11-01-auswahlreihen/acrylgrenze-desktop.png), [Mobil](assets/2026-11-01-auswahlreihen/mobil-text.png).

## Bereitstellung ohne Überschreiben des Masters

Die aktive Laufzeit ist `private/funkklingeln-ausfuehrungsblock-20261101`. Zwei Dateien haben einen älteren Master-Stand als GitHub-main (`edge-clamp.mjs` aus `7eceb7d`, `workflow.mjs` aus `7d88a7b`). Der direkte Patch-Probelauf wurde deshalb gestoppt. Die geprüfte Übertragung baut auf den exakten vorhandenen Dateien auf und übernimmt nur die oben beschriebene Funkklingel-Änderung; keine anderen Master-Änderungen werden vorgezogen oder entfernt. Jede Ausgangs- und Zieldatei erhält eine SHA-Prüfung. Sechs Laufzeitdateien, drei Tests; übrige Dateien werden verglichen. Keine Shopify-, Katalog-, Bestell- oder Datenbankmutation.

Zielpfad: `private/funkklingeln-bedienkorrektur-20261101-v2`; Nachweise separat mit Suffix `-nachweis`. Der Rückweg ist die gesicherte `app.cjs.before` plus Neustart der bestehenden Plesk-Node-App. Live-Freigabe liegt ausdrücklich im Chat vor.

## Live-Nachweis am 01.11.2026

- [PR #100](https://github.com/Chris83638w/gravuru-2027/pull/100), Quellcommit `53a7516fda777462f8fa688a1929c442e06192d3`, Merge `0af8d81d47f0f74450972ce6fbb9b4c1660a723d`.
- Linux: 119/119 gezielte Tests und Build bestanden. 3.274 Dateien verglichen, genau neun erwartete Änderungen (sechs Laufzeitdateien, drei Tests), keine weitere Abweichung. Vor Umschaltung Ausgangs-/Ziel-SHAs und übrige Dateien erneut geprüft.
- Einstieg atomar auf Zielkopie umgeschaltet, Plesk-App neu gestartet. Einstieg-SHA danach `89378e30cd1cc4917e242575c2a797acd6b1305121583710b7f4034d4f146dcd`; Wrapper unverändert.
- Öffentlicher Editor HTTP 200, verweist auf `editor-0a2af0f2dea185e4.mjs`. Öffentliches Paket unter `/_acryl-bundle/`: HTTP 200, 1.328.621 Bytes, SHA-256 `5cc58d0d2463d4136b73dc7f31048c7a181c8aadcb6bc7a89599ecd239069249`, exakt identisch mit dem unter Linux geprüften Ziel.
- Zusätzlicher lokaler Chrome-Test: Gestaltungslinie `mark-0` erfolgreich verschoben (x=292,186 → 243,488 mm), Hausnummer und Namen getrennt bearbeitbar; Gerätebild bleibt fest.
- Grenze des Abschlusschecks: Neuer echter Shopify-Start erreicht die korrekte AOSU-Seite, der neue Editor-iframe bleibt im automatisierten Chrome leer (`about:blank`). Browser Use meldet eine angehaltene Dokumentantwort; direkter Chrome-Aufruf meldet `ERR_HTTP_RESPONSE_CODE_FAILURE`, während der unabhängige HTTP-Aufruf denselben Editor mit 200 und vollständigem Inhalt liefert. Kein Live-Warenkorbtest behauptet. Die Screenshots oben dokumentieren die lokale Chrome-Abnahme, keinen erfolgreichen Live-Endtest. Nächster Schritt: Chrome-Liveaufruf nach Auflösung der Browser-Unterbrechung prüfen; keine Auth-/Master-Regeln zur Umgehung ändern.

Servernachweise: `tests.log`, `build.log`, `manifest.json`, `file-checks.json`, `switch.json`, `app.cjs.before` und `start-r5.cjs.before` im genannten privaten Nachweisordner. Die erste unveränderte Patch-Probekopie und Uploadteile liegen separat; keine wiederkehrende Plesk-Aufgabe gespeichert.

## Ergänzung: regulärer Shop-Einstieg und Scrollbereich

Der normale Produktbutton „Jetzt personalisieren“ lädt den Live-Konfigurator in Chrome erfolgreich innerhalb der Shopify-Produktseite. Der separate Direktaufruf war damit kein erfolgreicher Gegencheck des regulären Kundenwegs. Im echten Shop wurde die zweite Ursache für den Auswahlsprung reproduziert: Nach Scrollen der langen Optionsliste springt die Dokumentposition beim Wechsel zum kurzen Textpanel zurück (82 px). Ergänzung ausschließlich im Funkklingel-CSS: rechte Bedienleiste scrollt selbst, Außenlayout bleibt auf Bildschirmhöhe; Vorschau und Gestaltungsdaten bleiben unverändert. Lokal nach Auswahl der untersten Befestigungen und Textauswahl: kein Größenwechsel und höchstens 1 px Dokumentrandbewegung. Die mobilen Regeln bleiben unverändert. 5/5 vorhandene Darstellungstests und Build erfolgreich. Live-Gegencheck nach dieser Ergänzung folgt.

## Abschließende Live-Abnahme

- [PR #103](https://github.com/Chris83638w/gravuru-2027/pull/103), Quelle `3e385edbdf2babefe47aeedd93c812301c6f7960`, Merge `c1a9cb6bb8999db6f57b9c5a4d3fee7ac95c85d0`. 5/5 Darstellungstests zusätzlich unter Linux erfolgreich, Build erfolgreich. Aktive vorherige Laufzeit kopiert, nur das Darstellungsmodul ergänzt; 3.274 Dateien verglichen, genau eine erwartete Änderung. Fremde Master-Änderungen bleiben unangetastet.
- Aktiv: `private/funkklingeln-stabile-bedienleiste-20261101`; Nachweise im gleichnamigen Ordner mit Suffix `-nachweis`. Einstieg `gravuru-2027-merchant/app.cjs` nach Umschaltung SHA-256 `fc3858ca56137384bd159d7718e6a5a82276846400c5cff3221f795d4cf62c65`. Wrapper unverändert, Plesk-App neu gestartet.
- Öffentliches Bundle `/_acryl-bundle/editor-a6692a9b99c8f829.mjs`: HTTP 200, 1.329.742 Bytes, SHA-256 `14019726dcf295c1960569e5ad2b704904444364e15f96552fed925fc7523689`, exakt zum Linux-Build passend.
- Echter Chrome-Weg: [AOSU-Produktseite](https://gravuru-design.myshopify.com/products/klingelschild-aosu-pro-v8p1ax11-personalisiert) → „Jetzt personalisieren“. Nach Neustart zeigte der erste Aufruf den Ladehinweis; der vorhandene „Neu laden“-Button öffnete den Editor erfolgreich. Die neue Version ist durch den eigenen Scrollbereich (`overflow-y: auto`, 737 px Höhe) im gerenderten DOM bestätigt. Keine Authentifizierungs-/Sicherheitsregeln verändert.
- Live 35×18 cm, Klingel links, ganzer Rahmen, Silikon: Preis 74,98 EUR. Auswahl der unteren Befestigung, dann „12a“: Vorschau 1020,578×524,859 px unverändert, y=179 → 180; Dokument-Scrollrand 1 → 0. Der frühere 82-px-Sprung ist behoben. Es verbleibt eine 1-px-Randbewegung.
- „12a“ direkt auf 24 mm gesetzt; tatsächlicher Schriftpfad mit Skalierung 0,024 bestätigt. Ziehen verschiebt die Hausnummer von x=208,832 auf 311,320 mm. Weiteres Ziehen auf Edelstahl stoppt bei x=321,772 mm; rechte sichtbare Grenze bei 1033,410 px auf der Acrylkante, kein Überstandhinweis. Gestaltungslinie wurde vorher separat erfolgreich verschoben; Klingelrechte und Gerätegeometrie unverändert.
- Drei größere Formatkacheln nebeneinander, zwei Positionskacheln in der nächsten Reihe, Rahmen und runde Farben darunter im gemeinsamen Block sichtbar. Hauptschritte erhalten. Screenshots: [Live-Auswahl](assets/2026-11-01-auswahlreihen/live-auswahlkacheln.png), [Live-Hausnummer an der Acrylgrenze](assets/2026-11-01-auswahlreihen/live-12a-acrylgrenze.png). Desktop-Endprüfung live; mobile Prüfung lokal bei 390×844 px, ergänzende Scrollregel nur Desktop.
- Kein neuer Warenkorb- oder Bestelltest in diesem UI-Auftrag; keine Shopify-, Katalog-, Bindungs- oder Datenbankmutation. Ursprünglichen Kundenentwurf nicht verändert; Prüfung im eigenen Browser-Entwurf.

Rückweg der letzten Ergänzung: `app.cjs.before` aus `funkklingeln-stabile-bedienleiste-20261101-nachweis` am bestehenden Einstieg wiederherstellen und dieselbe Plesk-Node-App neu starten. Das führt zur bereits geprüften Bedienkorrektur aus PR #100 (`funkklingeln-bedienkorrektur-20261101-v2`) zurück. Für einen vollständigen Rückweg gilt deren vorher dokumentierte Sicherung. Keine wiederkehrende Plesk-Aufgabe angelegt. Abschlussbericht auf eigenem Branch `dev/funkklingeln-live-abnahme-20261101`.
