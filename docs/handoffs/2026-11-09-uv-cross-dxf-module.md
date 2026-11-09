# UV-Gedenkkreuze · DXF, eigenes Modul und Überdruck

Chris hat am 09.11.2026 im selben Chat klares Acryl in der Vorschau, die drei gelieferten DXF-Konturen, Größen-Icons, ein eigenes Modul und 1,5 mm Überdruck im Export beauftragt. Die Bohrungsoption entfällt in der Kundenauswahl. Maßgeblich sind die bereits bestätigten 5 mm Klaracryl mit Hinterdruck, 1499/2299/2799 Cent Grundpreis und einmalig 300 Cent Foto. Die ausdrückliche Freigabe für den gemeinsamen Anschluss gilt fort. Die Übernahme folgt dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Umsetzung und Regeln

- Das Produktmodul `uv-cross` gilt ausschließlich für die Familie `uv-gedenkkreuze-acryl-klar`. Es nutzt den gemeinsamen Editor und dessen Foto-, Preis- und Exportfunktionen.
- Die Größen-Icons verwenden die jeweilige Schnittkontur. K00 ist die interne Standardbefestigung. Die Vorschau zeigt durchscheinendes Glas mit polierter Kante und leichten Reflexen. Die Druckobjekte entsprechen der freigegebenen Gestaltung.
- Die gelieferten DXFs enthalten je eine geschlossene Kontur mit sechs Viertelkreisbögen und originaler Spießspitze. Außenmaße 110 × 200, 140 × 250 und 220 × 400 mm. Originale und SHA-256 liegen im Katalog unter `schneidvorlagen/kreuze/dxf-2026-11-09/`.
- Das Roland-Profil erzeugt den Hinterdruck mit 300 dpi, motivbezogenem RDG_WHITE und einmaliger Spiegelung. Randberührende Farbe und Weiß erhalten 1,5 mm Überdruck. CutContour bleibt maßhaltig.

## Bereitstellung und Serverprüfung

Aktiver privater Runtime unter `/private/uv-cross-dxf-20261109/runtime`. Arbeitsbranch `dev/uv-gedenkkreuze-anschluss-20261109`. `e13dd8b` liefert DXF, Modul und Überdruck. `c689379` berücksichtigt Zeilenenden und die Server-Testumgebung. `0c2b333` verwendet bei der Aktivierung den bereits abgeschlossenen Historiennachweis. `31fb4d1` präzisiert die Prüfung der geglätteten PDF-Kanten. `d70ffc6` ergänzt den Gartenhintergrund, `3daba5b` liefert ihn als kompaktes WebP.

Staging auf dem tatsächlichen Linux-Host bestanden. 6 Modul- und 8 Drucktests, insgesamt 14/14. Vor der Revisionierung wurden `workshop.sqlite` (rund 23 GB), `profiles.sqlite` und `design-assets.sqlite` gesichert. Der Import aktualisierte genau vier vorhandene Produkt-IDs von Revision 1 auf 2, insgesamt **4 aktualisiert, 0 neu**. SHA-256 bestätigte 3.142 übrige Produktköpfe und alle 3.156 älteren Revisionen unverändert.

Bereitstellung über `scripts/deploy-uv-cross-dxf-private.mjs`. Die Protokolle `STAGED.json`, `IMPORTED.json`, `ACTIVATED.json` und `VERIFIED.json` liegen beim Runtime-Paket. Der Import ist über seinen Journal-Schlüssel wiederholbar. Die Serverprüfung bestätigte 20/20 Vorschauen und 20/20 Editor-Einstiege mit HTTP 200. [Vorlagenübersicht](https://test-2027.gravuru-designwerkstatt.de/originale/) → **UV-Gedenkkreuze**.

## Browser und Druck

Die lokale Prüfung bestand für 60/60 native Größen-, Preis- und Konturfälle und 180 Größenwechsel. Alle 60 Text-/Motivausgaben waren bytegleich zur vorherigen Prüfung. Im geschützten Online-Konfigurator bestätigten alle 60 Design-Größen-Kombinationen Kontur, Außenmaß und Grundpreis. Beim Hunde-Fotodesign UV-H-F01 und Katzen-Fotodesign UV-K-F01 blieben Texte und hochgeladenes Foto in allen drei Größen erhalten. Ein zweiter Upload beim Katzen-Fotodesign ersetzte das Foto bei einmaligem Zuschlag von 300 Cent. Der Browser bestätigte transparente Acrylfläche und sichtbare Glaskante.

`scripts/audit-uv-cross-dxf-print.mjs` prüfte die 60 PDF-Druckausgaben mit Testdaten sowie drei zusätzliche Randproben. 58 bestanden im ersten Durchlauf. Bei UV-K-O03 und UV-K-O05 prüft die Nachmessung die sichtbare Deckkraft direkt im PDF. Dadurch wurden die geglätteten Randpixel genauer bewertet. Die Nachprüfung änderte ausschließlich die Messmethode. Exportcode und Gestaltung blieben unverändert. Ergebnis 60/60 Druckausgaben und 3/3 Randproben mit 1,5 mm Überdruck für Farbe und RDG_WHITE. ICC, RIP und physischer Probedruck bleiben separate Abnahmen.

Der Gartenhintergrund nach Chris’ Bildreferenz läuft im privaten Konfigurator mit `d70ffc6`. Die sechs Modultests auf dem Server und die Browser-Sichtprüfung bestanden. Der Hintergrund gehört zur Bildschirmvorschau.

Die erste Gartenfassung im Querformat wurde mit `3daba5b` als WebP ausgeliefert. Hostprüfung und Browser-Sichtprüfung mit und ohne Foto bestanden. Die Belege liegen unter `reports/garden-webp/{APPLIED,VERIFIED}.json`. Der vollständige Drucknachweis liegt unter `reports/uv-cross-print-audit-final.json`.

## Quadratische Gartenvorschau

`d1905a7` ist im geschützten Online-Konfigurator aktiv. Auf Chris’ erneuten Wunsch wurde der Garten mit der integrierten Bildfunktion quadratisch komponiert. Der Boden belegt die unteren 24 % des Hintergrunds. Das WebP misst 1254 × 1254 Pixel und 144.228 Byte. Es ist 93,78 % kleiner als die PNG-Quelle mit 2.320.314 Byte. Das Kreuz wird aus der aktuellen DXF-Kontur und den editierbaren Gestaltungselementen gezeichnet. Die Bilddatei enthält ausschließlich die Gartenszene.

Die Vordergrundebene überdeckt den vollständigen Spieß ab der Bodenlinie auf 76 % der quadratischen Fläche. Bei mehr als 100 % Zoom oder bei einem ausgewählten Gestaltungselement unter der Bodenlinie blendet der Editor die Vordergrundebene aus und zeigt die ganze Kontur zum Bearbeiten. Das Vorschauglas nutzt die physische Materialstärke von 5 mm für die polierte Kante und zeigt eine dezente Lichtbrechung im Hintergrund.

15 gezielte lokale Modul- und Exporttests sowie sechs Modultests auf dem Host bestanden. Die Änderung betrifft die Vorschau. Produktrevisionen und Druckexport entsprechen weiterhin dem geprüften DXF-R2-Stand.

Die abschließende Browser-Sichtprüfung bestand im aktiven Online-Konfigurator. Auf dem Desktop maß die Vorschau bei allen drei Produktgrößen 669 × 669 Pixel. Mobil maß sie 390 × 390 Pixel bei einer Bildschirmfläche von 390 × 844 Pixeln. Der geladene WebP-Garten, die polierte 5-mm-Kante, die dezente Lichtbrechung und der in der Erde liegende Spieß wurden sichtbar geprüft. Bei 101 % Zoom erschien die vollständige Kontur. Das Zurücksetzen auf 100 % stellte den Erd-Vordergrund wieder her. Nachweis `square-scene-browser.json`, Bildschirmaufnahme `UV-Gedenkkreuze-Quadratisch-Acryl-Konfi.jpg`.
