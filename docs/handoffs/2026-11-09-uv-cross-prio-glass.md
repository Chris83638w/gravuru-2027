# UV-Gedenkkreuze im Prio-R15-Konfigurator

Christopher hat am 09.11.2026 den Anschluss der UV-Gedenkkreuze an die Prio-R15-Oberfläche, eine polierte Acrylkante entlang der gelieferten Kontur und den Zugriff auf den geschützten Testserver ausdrücklich freigegeben. Die bereits freigegebenen Designs und der Auftrag zum gemeinsamen Online-Konfigurator sind in der [ursprünglichen Übergabe](2026-11-09-uv-gedenkkreuze.md) dokumentiert. Die Gestaltung folgt dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Aktiver Prüfstand

Die 20 Galeriekarten öffnen ihre konkrete Gestaltung aus einem der vier Produktstände auf Revision 2 über `ui=prio-r15`. Der native Werkstatt-Prüfmodus prüft Produkt-ID und Revision und nutzt die vorhandene Aktion „Gestaltung prüfen“. Bestellungen und Warenkorb sind in diesem Modus deaktiviert.

Die quadratische Gartenszene zeigt das Kreuz mit verdecktem Erdspieß. Die Vorschau zeichnet eine schmale polierte Kante auf der DXF-Silhouette und lässt die Fläche transparent. Außenmaße, Produktionskontur und Druckprofil beziehen sich auf die in der [DXF-Übergabe](2026-11-09-uv-cross-dxf-module.md) geprüften Produktstände. [Geschützte UV-Galerie öffnen](https://test-2027.gravuru-designwerkstatt.de/uv-gedenkkreuze/).

## Paket und Serverprüfung

- Basis `24779d5cd97e488580abdc3c88c4b44b34630d75` auf `dev/uv-gedenkkreuze-anschluss-20261109`. Das Paket übernimmt neun Laufzeitdateien für Prio-Oberfläche, Galerieeinstieg und Glasvorschau. Die Prüfdateien werden in einer isolierten Kopie ausgeführt.
- `uv-cross-prio-glass-20261109-v4.zip` mit 125.030 Byte und SHA-256 `04ed224b7f2365800c494b840682644ab66c0ef21bc6af9b32510b0f2d82d665`. Der Vorabtest verifiziert die Paketdateien und die aktiven Quelldateien. Vor der Übernahme sichert das Paket die ersetzten Dateien und die vorhandenen Editor-Bündel. Die Übernahme meldet 0 neue und 0 revidierte Produkte.
- Auf dem privaten Linux-Host bestanden 55/55 Prio-Tests und 21/21 Glas-, Kontur- und PDF-Tests. Der Editor-Build erzeugte ein Modell. `node deploy.mjs apply` prüfte und übernahm die Quellen. Nach dem Plesk-Neustart stellte `node deploy.mjs restore-bundles <Nachweisordner>` vier vom normalen Build entfernte, ältere Bündel aus der Sicherung wieder her. Insgesamt wurden zwölf vorhandene Bündel gesichert.
- Laufzeit unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/uv-cross-dxf-20261109/runtime`. `APPLIED.json`, `prio-review-tests.txt`, `glass-contour-tests.txt`, `build.txt` und die Sicherungen liegen unter `../reports/prio-glass-20261109-SbZYed/`.

## Sichtprüfung

UV-H-O01 zeigte im aktiven Prio-Konfigurator die quadratische Gartenszene und die polierte Kante. Die drei Größen-Icons wechselten auf 110 × 200, 140 × 250 und 220 × 400 mm bei 14,99 €, 22,99 € und 27,99 € Grundpreis. Bildschirmbelege im Arbeitschat sind `Prio-Konfi-UV-Kreuz-korrigiert.jpg` und `Prio-Konfi-Groessenicons.jpg`.

Abgeschlossen: 20/20 Gestaltungen aus dem aktiven Prio-Konfigurator aufgenommen, je fünf Hunde/Katzen mit und ohne Foto. Native Design-ID, quadratische Bühne, 11 × 20 cm und die zehn vorhandenen Beispielfotos geprüft. Vier sortierte WebP-Kontaktbögen und eine eigenständige HTML-Galerie enthalten diese Browseraufnahmen. Alle 20 JPEG-Dateien sind unterschiedlich. Die Aufnahmen wurden visuell kontrolliert; diese Abnahme betrifft die Vorschau, nicht einen neuen Drucker-/RIP-Test oder die Shop-Bestellstrecke.
