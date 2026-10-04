# Dashboard-Kundenfelder – neue Cloudprüfung

Zeitpunkt des Abschlussabgleichs: 2026-10-04T18:46:52+02:00 (Europe/Berlin). Basis `1b4626eab6cc2e7d22f815754583cc678e57d558`, Aufgabenbranch `task/dashboard-customer-fields-20261004`. Ausschließlich diese Cloud-Aufgabe, keine private Bestandsdatenbank.

## Tatsächlich ausgeführt

- `node --test app/workshop/customer-fields.test.mjs`: sechs neue Tests bestanden. Original-/Historienerhalt, alle 28 Preisvarianten, Kundenrechte, ungültige Eingaben, veränderte Vorschau, paralleles Speichern, Feldentfernung, Designerersatz, CSRF und HTTP-Speicherung geprüft.
- `PYTHONPATH=/workspace/gravuru-2027-cloud-acceptance/.local-data/python npm test`: 143 bestanden, 0 Fehler, 0 Skips. Dies ist ein neuer Lauf wegen der aktuellen Implementierungsänderungen, zusätzlich zum historischen 137-Test-Nachweis.
- `npm run build` und vorhandenes `build()` beim Start der isolierten Vorschau: 76 Ressourcen, 1 Modell; unveränderter Editorgrundkörper mit 461440 Bytes. JavaScript-Syntax der neuen/angepassten UI-Module geprüft.
- Chromium/Playwright in dieser Cloud, Vorschau nur `127.0.0.1:8963`, drei In-Memory-Datenbanken: echte Bedienfolge SVG importieren → Text/Fotofeld ergänzen → Schlüssel zuordnen → 4,5 mm festlegen → Vorschau prüfen → speichern → neu laden. Beide Felder vorhanden; Änderungen entwerten die vorherige Speicherfreigabe.
- Browser: Farbpunkte tatsächlich 30 × 30 Pixel, Radius 50 %. Desktop 1512 × 1080; schmale Ansicht 390 × 844 ohne horizontalen Dialogüberlauf, erreichbare Speicheraktionen. Keine ungefangenen JavaScript-Ausnahmen im Ablauf.
- Kundenansicht erst nach `gravuru-ux-ready` geprüft: Feldbezeichnung „Namen“, Textänderung zu synthetischen Beispielnamen, gesperrte Schriftgröße und Grundpreis 14,99 €. Synthetisches PNG im ausdrücklich gewählten Feld `photo-main` hochgeladen; Position (75/65) und Größe (90/80 mm) bleiben erhalten.
- Beim initialen Laden des übernommenen Kundeneditors wurden zusätzlich vier 404-Anfragen auf `/undefined` beobachtet. Der Editor erreicht trotzdem seinen Bereitschaftszustand und die obigen Funktionen wurden danach geprüft. Diese Startanfragen sind noch zu bereinigen; keine vollständig fehlerfreie Gesamtabnahme behaupten.

## Sichtbare Ergebnisse

- [Desktop: Kundenfelder](customer-fields-desktop.png)
- [Schmale Ansicht: Einstellungen und Speicheraktionen](customer-fields-mobile.png)
- [Kundenansicht: benanntes Textfeld und Fotobereich](customer-preview.png)

Die Bilder zeigen synthetische Testdaten. Das reduzierte Rahmenmotiv dient der Feldprüfung und ersetzt kein freigegebenes Kundendesign. Die M02-Aufteilung ist auf den neuen Feldeditor angewandt; die gesamte fotografische Dashboardgestaltung und M01-Kartenansicht sind nicht als fertig abgenommen.

## Abgleich des übernommenen Neuaufbaus

215 manifestierte Ausgangsdateien: 206 bytegleich, sechs ausschließlich Zeilenendenabweichungen, drei fortgeschriebene Dokumente (README/START_HERE/STATUS), null fehlend. Vier Referenzarchive erneut per Größe/SHA-256 bestätigt; alle elf Screenshotoriginale mit Manifest abgeglichen. Sechs aktuelle Referenzen zusätzlich unverändert als einzelne PNGs bereitgestellt, damit das ZIP nicht der einzige Zugang bleibt.

Keine alten Datenbanken, Secrets, Laptopdateien oder fremden Clouddateien verwendet. Kein Merge und kein Live-Deployment. Die Funktionsprüfung belegt das neue Teilstück, keine Druck-/Gravur- oder Shopify-Abnahme.
