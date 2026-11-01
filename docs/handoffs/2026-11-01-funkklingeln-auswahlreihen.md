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
