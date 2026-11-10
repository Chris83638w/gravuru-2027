# UV-Gedenkkreuze · Größere Prio-Vorschau und polierte Acrylkante

## Auftrag und Umfang

Christopher hat die Darstellung der bestehenden UV-Gedenkkreuze im Prio-R15-Konfigurator am 10.11.2026 weiter präzisiert. Das Kreuz soll im quadratischen Ausschnitt größer wirken, die Fläche hinter der Schrift ruhig und neutral bleiben und die 5-mm-Acrylkante deutlicher als poliertes Glas erkennbar sein. Der bestehende gemeinsame Konfigurator und die UV-Kreuz-Ausführung tragen diese Anpassung. Die vier Produkte im Werkstatt-Prüfstand verwenden weiterhin die freigegebenen DXF-R2-Designs. [Prio-R15-Übergabe](2026-11-09-uv-cross-prio-glass.md) · [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

Issue 227 ist für die Produktvorbereitung übernommen. Die Arbeit in diesem Paket betrifft die Vorschau der vorhandenen UV-Gedenkkreuze. Bestellungen und Warenkorb sind im Werkstatt-Prüfmodus deaktiviert. [Workflow Issue 227](https://github.com/Chris83638w/gravuru-2027/issues/227).

## Vorschau und Fertigungsdaten

- `uv-cross-execution.mjs` zeichnet das Kreuz im gleichen quadratischen Ausschnitt nominal rund 26 % größer. Der Hintergrund ist neutral hellgrau. Die Vordergrundüberdeckung reicht nur über den unteren Randbereich und verdeckt dort den Erdspieß. Beim Zoomen oder Bearbeiten unterhalb der Überdeckung passt der Editor die vollständige Kontur in die Vorschau ein.
- `uv-cross-glass.mjs` zeichnet die Kante mit einem dunkleren polierten Band und einer hellen Lichtkante. Beide liegen innerhalb der unveränderten DXF-Silhouette. Die Kantenbreiten werden aus der Materialstärke abgeleitet. Die Fläche bleibt durchsichtig.
- Die Vorschau verwendet weiter die drei Originalkonturen in 110 × 200, 140 × 250 und 220 × 400 mm. Die bestehende PDF-Produktion nutzt die DXF-R2-Daten für rückseitigen UV-Druck auf 5 mm Klaracryl, motivbezogenes RDG_WHITE und 1,5 mm Überdruck bei Randkontakt. Die Layoutänderung schreibt ausschließlich die zwei Vorschaumodule. [DXF- und Drucknachweis](2026-11-09-uv-cross-dxf-module.md).

## Vier Produktakten nach Issue 227

Im Katalog sind je eine Excel-Bestandsreferenz für Hunde und Katzen mit und ohne Foto sowie die dazugehörigen JSON-Pläne, Quellenstände und Prüfsummen archiviert. Der Ordnerstand `r1` bezeichnet die Version der Bestandsreferenz. Die vier Akten dokumentieren die nativen Produktstände auf Revision 2. [Katalog-Commit `d0a11e9`](https://github.com/Chris83638w/gravuru-katalog./commit/d0a11e9321a69df45ecfd0464d06330359df3f61).

Die Basispreise 14,99 €, 22,99 € und 27,99 € und der einmalige Fotozuschlag von 3,00 € sind aus dem Chat belegt. Die 169 Cent je Zusatzmotiv sind als technisch vorhandener Wert aus R2 vermerkt. Die separate Bestätigung dieses Preises und die Freigabe der vier Excel-Versionen stehen aus. Die Akten führen offene Felder für Steuern und Preisgeltung, Plan-ID und Plan-Hash, Produktgruppen-Template, Modulprofil-ID und Revision sowie Shopbindung und Shopify-Hauptproduktbild.

## Paket und Stand der Prüfung

`uv-cross-prio-edge-20261110-v1.zip` basiert auf `91a69e36529f137192914e8ac4093533e215b14b`. Das Paket umfasst 28.393 Byte. SHA-256 `257c63faa44008224e412038ecfcf95849e2946af3cbc529cdad1daeea1e6d1f`. Die beiden Dateiprüfsummen des Ausgangsstands stimmen mit den zuvor installierten Vorschaupaketen überein.

32/32 gezielte Modul-, Kontur- und PDF-Tests bestanden lokal und 32/32 im privaten Linux-Vorabtest. Der Editor-Build bestand. V1 übernahm zwei Quelldateien und sicherte 18 Editor-Bündel. Der Plesk-Neustart ist abgeschlossen. Serverbelege `APPLIED.json`, `edge-contour-tests.txt` und `build.txt` liegen unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/uv-cross-dxf-20261109/reports/prio-edge-20261110-yIA92m/`. [Geschützte UV-Galerie](https://test-2027.gravuru-designwerkstatt.de/uv-gedenkkreuze/).

## V2 · Schmalere Acrylkante

Bei der Online-Sichtprüfung von V1 wirkte die dunkle Kante zu breit. V2 verschmälert beide auf die DXF-Silhouette begrenzten Kantenbänder und setzt feinere Lichtreflexe. Die zusätzliche Änderung betrifft `uv-cross-glass.mjs`. Sechs gezielte Modultests bestanden lokal.

`uv-cross-prio-edge-20261110-v2.zip` umfasst 25.446 Byte. SHA-256 `b1db64f6cc342f0732d5e8f1e2c64a1cba2459218aacf575f225d525032eb64d`. Das Paket verifizierte den installierten V1-Stand beider Vorschaumodule und ersetzte die Glasdarstellung. Auf dem privaten Linux-Host bestanden 32/32 Tests und der Editor-Build. Zwanzig Editor-Bündel wurden vor dem Wechsel gesichert, zehn ältere Bündel nach dem Plesk-Neustart wiederhergestellt. Serverbelege liegen unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/uv-cross-dxf-20261109/reports/prio-edge-20261110-v2-OEEtlI/`.

UV-H-O01 bestätigte die schmalere polierte Kante im aktiven Prio-Konfigurator. Die Maße 110 × 200, 140 × 250 und 220 × 400 mm ließen sich auswählen und ablesen. Bei 101 % Zoom war die vollständige Form innerhalb des quadratischen Ausschnitts sichtbar. Bildschirmbeleg im Arbeitschat `Prio-Konfi-Acrylkante-V2-ohne-Foto.webp` mit 24.534 Byte.

Der erneute Aufruf von UV-H-F01 für die abschließende Sichtprüfung der Fotoansicht wurde mit HTTP 403 abgewiesen. Die aktuelle Fotodarstellung unter V2 ist deshalb noch unbestätigt. Nächster Schritt ist dieser Browsercheck nach erneuter Anmeldung. [Geschützte UV-Galerie](https://test-2027.gravuru-designwerkstatt.de/uv-gedenkkreuze/).
