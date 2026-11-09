# UV-Gedenkkreuze im Prio-R15-Konfigurator

## Nachtrag vom 09.11.2026 · Heller Studiohintergrund

Christopher zur Lesbarkeit der Vorschau im selben Chat

> Die Schrift und Motive sind vor dem Gartenhintergrund zu dunkel und kaum lesbar. Bitte prüfe die Darstellung und nutze einen helleren Ton, es muss kein Garten sein.

Der aktive Prio-Prüfstand nutzt eine helle, ruhige Studiofläche mit dezenter Standlinie. Sie gilt für die quadratische Vorschau der UV-Kreuze und deren Großansicht. Die dunklen Schriften und Motive von UV-H-O01 waren im Online-Konfigurator deutlich lesbar, die polierte Acrylkante blieb erkennbar. Der Hintergrund ist eine reine Bildschirmdarstellung. Designfarben, Druckexport, Preise und Produktdatenbank entsprechen weiterhin DXF-R2. Bildschirmbeleg im Arbeitschat `Prio-Konfi-helle-Vorschau.jpg`. [Geschützte UV-Galerie öffnen](https://test-2027.gravuru-designwerkstatt.de/uv-gedenkkreuze/).

Das Paket `uv-cross-prio-light-20261109-v1.zip` auf Basis `71e213117e8031e1b7a32ac3b40c532dc81f82b8` übernahm ausschließlich `app/configurator/variant-m/uv-cross-execution.mjs`. Paketgröße 22.199 Byte, SHA-256 `99224eff50c783a3daa4914fdd15c60f1c767f0ae21cfaf12d6b5ddeb9b5ee0a`. Sechs lokale Modultests und 21/21 Tests auf dem privaten Linux-Host bestanden. Der Editor-Build erzeugte ein Modell. Vor der Übernahme wurden 16 bestehende Editor-Bündel gesichert. Nach dem Plesk-Neustart wurden sechs ältere Bündel aus der Sicherung wiederhergestellt.

Serverbelege `APPLIED.json`, `light-contour-tests.txt` und `build.txt` unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/uv-cross-dxf-20261109/reports/prio-light-20261109-XNoSFQ/`. 20/20 neue Browseraufnahmen aus dem Prio-Konfi geprüft: fünf Hunde ohne Foto, fünf Hunde mit Foto, fünf Katzen ohne Foto und fünf Katzen mit Foto, jeweils 11 × 20 cm. Die dunklen Namen und Lebensdaten sowie die feineren braunen, grünen und rosafarbenen Motive sind vor der ruhigen hellen Fläche besser erkennbar. Vier WebP-Tafeln und die eigenständige HTML-Galerie `UV-Gedenkkreuze-20-Studiovorschauen.html` liegen im Arbeitschat; die frühere Gartenserie bleibt als Vergleich erhalten.

## Prio-R15-Anschluss und erste Sichtprüfung

Christopher hat am 09.11.2026 den Anschluss der UV-Gedenkkreuze an die Prio-R15-Oberfläche, eine polierte Acrylkante entlang der gelieferten Kontur und den Zugriff auf den geschützten Testserver ausdrücklich freigegeben. Die bereits freigegebenen Designs und der Auftrag zum gemeinsamen Online-Konfigurator sind in der [ursprünglichen Übergabe](2026-11-09-uv-gedenkkreuze.md) dokumentiert. Die Gestaltung folgt dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Aktiver Prüfstand

Die 20 Galeriekarten öffnen ihre konkrete Gestaltung aus einem der vier Produktstände auf Revision 2 über `ui=prio-r15`. Der native Werkstatt-Prüfmodus prüft Produkt-ID und Revision und nutzt die vorhandene Aktion „Gestaltung prüfen“. Bestellungen und Warenkorb sind in diesem Modus deaktiviert.

Die erste Prio-Fassung zeigte das Kreuz in der quadratischen Gartenszene mit verdecktem Erdspieß. Die Vorschau zeichnet eine schmale polierte Kante auf der DXF-Silhouette und lässt die Fläche transparent. Außenmaße, Produktionskontur und Druckprofil beziehen sich auf die in der [DXF-Übergabe](2026-11-09-uv-cross-dxf-module.md) geprüften Produktstände.

## Paket und Serverprüfung

- Basis `24779d5cd97e488580abdc3c88c4b44b34630d75` auf `dev/uv-gedenkkreuze-anschluss-20261109`. Das Paket übernimmt neun Laufzeitdateien für Prio-Oberfläche, Galerieeinstieg und Glasvorschau. Die Prüfdateien werden in einer isolierten Kopie ausgeführt.
- `uv-cross-prio-glass-20261109-v4.zip` mit 125.030 Byte und SHA-256 `04ed224b7f2365800c494b840682644ab66c0ef21bc6af9b32510b0f2d82d665`. Der Vorabtest verifiziert die Paketdateien und die aktiven Quelldateien. Vor der Übernahme sichert das Paket die ersetzten Dateien und die vorhandenen Editor-Bündel. Die Übernahme meldet 0 neue und 0 revidierte Produkte.
- Auf dem privaten Linux-Host bestanden 55/55 Prio-Tests und 21/21 Glas-, Kontur- und PDF-Tests. Der Editor-Build erzeugte ein Modell. `node deploy.mjs apply` prüfte und übernahm die Quellen. Nach dem Plesk-Neustart stellte `node deploy.mjs restore-bundles <Nachweisordner>` vier vom normalen Build entfernte, ältere Bündel aus der Sicherung wieder her. Insgesamt wurden zwölf vorhandene Bündel gesichert.
- Laufzeit unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/uv-cross-dxf-20261109/runtime`. `APPLIED.json`, `prio-review-tests.txt`, `glass-contour-tests.txt`, `build.txt` und die Sicherungen liegen unter `../reports/prio-glass-20261109-SbZYed/`.

## Sichtprüfung

UV-H-O01 zeigte im aktiven Prio-Konfigurator die quadratische Gartenszene und die polierte Kante. Die drei Größen-Icons wechselten auf 110 × 200, 140 × 250 und 220 × 400 mm bei 14,99 €, 22,99 € und 27,99 € Grundpreis. Bildschirmbelege im Arbeitschat sind `Prio-Konfi-UV-Kreuz-korrigiert.jpg` und `Prio-Konfi-Groessenicons.jpg`.

Abgeschlossen: 20/20 Gestaltungen aus dem aktiven Prio-Konfigurator aufgenommen, je fünf Hunde/Katzen mit und ohne Foto. Native Design-ID, quadratische Bühne, 11 × 20 cm und die zehn vorhandenen Beispielfotos geprüft. Vier sortierte WebP-Kontaktbögen und eine eigenständige HTML-Galerie enthalten diese Browseraufnahmen. Alle 20 JPEG-Dateien sind unterschiedlich. Die Aufnahmen wurden visuell kontrolliert; diese Abnahme betrifft die Vorschau, nicht einen neuen Drucker-/RIP-Test oder die Shop-Bestellstrecke.
