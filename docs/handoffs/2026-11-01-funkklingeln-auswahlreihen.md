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

Geplanter Zielpfad: `private/funkklingeln-bedienkorrektur-20261101-v2`; Nachweise separat mit Suffix `-nachweis`. Der Rückweg ist die gesicherte `app.cjs.before` plus Neustart der bestehenden Plesk-Node-App. Umschaltung erst nach erfolgreichem Linux-Test/Build, Dateivergleich und Merge; Live-Freigabe liegt ausdrücklich im Chat vor.
