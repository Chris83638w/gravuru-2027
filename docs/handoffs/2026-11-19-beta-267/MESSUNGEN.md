# Messprotokoll zur Beta #267

Der aktuelle letzte Messpunkt ist der vollständig sichtbare Warenkorb mit den individuellen Bildern beider Positionen. [Aktuelle PC- und Handy-Messung](WARENKORB-VORSCHAU.md)

Lokaler Chrome 157.0.8103.78 auf demselben Windows-PC. Desktop 1365 × 900 bei normaler CPU, mobil 390 × 844 mit Touch-Emulation und vierfacher CPU-Drosselung. Beide Ansichten verwenden den Loopback-Transport ohne Netzdrossel. Drei voneinander unabhängige Browserkontexte je Gerät und Version. Jeder Kaltstart leert den HTTP-Cache und erhält einen frischen Sitzungsspeicher. Der Warmlauf lädt die gleiche URL im gleichen Kontext erneut. Die drei Versionen rotieren pro Wiederholung. Der Testserver liefert Produktmodell und einzelne Quellen absichtlich mit ihren eigenen Cache-Regeln aus.

## Ring mit 16 Originaldesigns

Zeiten in Sekunden. Jede Zelle zeigt Median (Minimum–Maximum), drei Einzelwerte. „Nativ“ verwendet die native Darstellung des lokalen Vorher-Builds. „R15 vorher“ verwendet auf derselben Codebasis die R15-Oberfläche. „Beta“ enthält die Überarbeitung der Profilberechnung. Ausgangsdesign „Strichdesign“, erste Auswahl „Klar & modern“, Rückwechsel „Strichdesign“. Verwendet wurden die originalen Katalogdaten für 16 × 28 cm. [Einzelwerte](ring.json)

| Gerät | Ansicht | Cache | Start bis bedienbar | Erste zwei Karten | Erste Auswahl | Rückwechsel | Texteingabe |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| PC | Nativ | kalt | 0,94 (0,84–0,98) | 0,13 (0,12–0,21) | 0,31 (0,30–0,31) | 0,29 (0,29–0,32) | 0,33 (0,28–0,33) |
| PC | Nativ | warm | 0,94 (0,91–0,96) | 0,12 (0,11–0,13) | 0,34 (0,31–0,35) | 0,30 (0,28–0,30) | 0,28 (0,28–0,29) |
| PC | R15 vorher | kalt | 1,05 (1,02–1,12) | 0,04 (0,03–0,10) | 0,34 (0,34–0,37) | 0,31 (0,30–0,32) | 0,22 (0,20–0,25) |
| PC | R15 vorher | warm | 1,07 (1,04–1,10) | 0,03 (0,03–0,03) | 0,33 (0,32–0,36) | 0,32 (0,31–0,33) | 0,24 (0,20–0,30) |
| PC | Beta | kalt | 0,84 (0,81–0,90) | 0,02 (0,02–0,03) | 0,18 (0,17–0,21) | 0,14 (0,14–0,15) | 0,12 (0,11–0,14) |
| PC | Beta | warm | 0,84 (0,80–0,91) | 0,02 (0,02–0,02) | 0,17 (0,16–0,17) | 0,15 (0,15–0,17) | 0,12 (0,12–0,12) |
| Mobil | Nativ | kalt | 6,09 (5,95–7,35) | 0,37 (0,35–0,41) | 2,13 (1,81–2,87) | 3,18 (1,74–3,39) | 2,30 (2,27–2,46) |
| Mobil | Nativ | warm | 6,57 (5,62–8,21) | 0,34 (0,24–0,36) | 2,77 (2,16–3,17) | 2,17 (1,75–3,70) | 2,16 (1,97–2,84) |
| Mobil | R15 vorher | kalt | 6,83 (5,82–7,69) | 0,58 (0,43–1,36) | 2,16 (2,15–2,25) | 1,84 (1,72–1,85) | 1,87 (1,65–2,59) |
| Mobil | R15 vorher | warm | 7,69 (7,47–7,73) | 0,53 (0,50–0,90) | 2,49 (2,10–2,54) | 2,13 (1,81–2,45) | 2,41 (1,62–3,11) |
| Mobil | Beta | kalt | 5,33 (4,03–5,40) | 0,45 (0,32–0,46) | 1,07 (1,02–1,45) | 1,07 (0,91–1,52) | 1,10 (0,97–1,11) |
| Mobil | Beta | warm | 4,88 (4,21–5,40) | 0,46 (0,44–0,47) | 1,24 (1,19–1,69) | 1,03 (0,88–1,19) | 0,91 (0,90–2,50) |

Der Start endet, wenn der Editor bereit ist und die Designnavigation bedient werden kann. Die Kartenzeit beginnt beim Öffnen des Designbereichs. Beide ersten Karten müssen die echte Ring-Geometrie zeichnen; ein Platzhalter zählt nicht. Die nächsten beiden Zeiten enden bei passender interner Design-ID, aktiv markierter neu gerenderter Karte und zwei Zeichenzyklen des Browsers. Die Textzeit reicht von der Eingabe bis zum bestätigten Objekttext und zwei Zeichenzyklen. Die Auswahl erfolgt über DOM-Klickereignisse der originalen Bedienelemente. Betriebssystem-Zeigegerät und virtuelle Tastatur sind dabei nicht gemessen.

## Acryl mit eigenem Testfoto

Gleiches Browserprofil, derselbe lokale Prüfstand, drei Kalt-/Warmpaare je Geräteklasse. Upload bis zum Fotoobjekt. Speichern ab der letzten sichtbaren Bestätigung bis zum bestätigten, lokal erneut gelesenen Entwurf mit Dateiauswahl. Die getrennten Exportzeiten umfassen den Klick, Serverberechnung und vollständig empfangene Datei. Die 12 Messläufe liefen ohne Bildschirmaufzeichnung. Die beiden Filme wurden in eigenen Durchläufen aufgenommen. [Einzelwerte](acryl.json)

| Gerät | Cache | Foto | Gesicherter Entwurf | SVG | Kontur-PDF | Druck-PDF | Entwurfs-ZIP |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| PC | kalt | 0,18 (0,17–0,19) | 1,52 (1,51–1,64) | 0,51 (0,33–0,63) | 1,84 (1,73–2,37) | 5,46 (5,30–5,47) | 0,11 (0,11–0,15) |
| PC | warm | 0,23 (0,15–0,23) | 1,52 (1,52–1,53) | 0,41 (0,34–0,47) | 1,86 (1,70–2,73) | 5,50 (5,36–6,08) | 0,10 (0,10–0,13) |
| Mobil | kalt | 1,13 (0,92–1,67) | 3,03 (2,14–3,07) | 0,40 (0,33–0,44) | 1,71 (1,66–1,90) | 5,14 (5,14–5,28) | 0,12 (0,10–0,15) |
| Mobil | warm | 0,85 (0,71–0,94) | 2,34 (2,16–3,23) | 0,34 (0,34–0,41) | 1,63 (1,59–1,92) | 5,21 (5,01–5,44) | 0,12 (0,10–0,15) |

## Verkaufstrecke

Beim veröffentlichten Ring-Produkt wurden sechs Wechsel je Bildschirmgröße mit der Maus-/Browsersteuerung bestätigt. Desktop hin 1,142 / 0,903 / 0,856 s, zurück 0,836 / 0,873 / 0,842 s. Bei Handybreite hin 0,982 / 0,834 / 0,846 s, zurück 0,983 / 0,988 / 0,764 s. Diese Zeit enthält die Bedienaktion und das Auslesen der aktiven Auswahl. Ein einzelner Desktop-Einstieg bis zum ausgelesenen geöffneten Dialog dauerte 3,879 s. Die Läufe lagen in derselben Sitzung und sind kein Kalt-/Warmvergleich. Beim ersten Auslesen waren drei Vorschauen vorhanden und 13 weitere Karten noch Platzhalter. [Referenzprodukt](https://gravuru-design.myshopify.com/products/klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert)

Nach Chris’ Freigabe meldete der parallele Astra-Shoptest auf 1440 × 960 den bestätigten Warenkorb nach **6,739 s** beim ersten und **6,176 s** beim zweiten Hinzufügen. Aktualisieren dauerte **6,722 s**, Wiederöffnen bis zum bestätigten alten Text **5,023 s**. K00 und B04S behielten zwei eigene Vorschaubilder und Positionen. Der native Shopweg endete vor Checkout. Die heutige R15-Beta läuft auf einem anderen Host. Ein gemeinsamer Median aus diesen Strecken wäre irreführend. Auch der frühere #262-Vergleich und Studios F02-Zeiten stammen von anderen Produkten. [Shopversuch](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7007810056) · [R15-Vergleich aus #262](https://github.com/Chris83638w/gravuru-2027/issues/262)

Für das Fünf-Sekunden-Ziel werden auf **einem** Käuferweg Einstieg, für die Interaktion blockierende Ressourcennachladung und Übermittlung bis zum vollständigen bestätigten Warenkorb mit persönlichem Bild gemessen. Freie Bearbeitungszeit wird abgezogen. Überlappende Wartezeiten werden nur einmal gezählt. Der Wiederaufruf und die späteren Produktionsdownloads werden zusätzlich einzeln ausgewiesen. Die lokale Ring- und die lokale Acrylreihe werden nicht zu einer künstlichen Gesamtsumme addiert.

Die ausdrücklich gewählte R15-Darstellung im Live-Shop, die zusätzlichen Datensparläufe auf dem gemeinsamen Beta-Build und die Auswertung beider unabhängigen Prüfungen stehen im [ergänzenden Messprotokoll](SHOP-UND-INTEGRATION.md).

## Wiederholen

1. Den Code dieses PR und einen separaten Checkout der Basis f84433f8 bereitstellen. Verzeichnis tools/beta-267 einschließlich slate-register.mjs auch in den Vorher-Checkout kopieren. Node 24, Chrome, Playwright und die vorhandenen Werkstatt-Python-Abhängigkeiten verwenden. Der Katalog benötigt separaten Lesezugriff.
2. Im Katalog-Checkout die geprüften Originalbytes ausgeben. Unter Windows verhindert die Git-Einstellung core.autocrlf=false beim Archivieren eine Veränderung der Manifest-Prüfsummen. Die Variable GRAVURU_KATALOG verweist auf den entpackten Ordner oberhalb von migrationen.
3. Den aktuellen Prüfstand mit node tools/beta-267/preview.mjs 18267 und die Vorher-Version mit Port 18268 starten. Beide lauschen nur auf 127.0.0.1. GRAVURU_SCHIEFERREGISTER bindet optional die unveränderte Datei zeichnungen/schiefer-tafeln-2027/schiefer-tafeln.json aus ff1ea99 für den vierten Prüfartikel ein. GRAVURU_PYTHON kann den vorhandenen Werkstatt-Interpreter angeben. CHROME267 kann den installierten Chrome angeben.
4. Den Ring-Vergleich mit node tools/beta-267/browser.cjs ergebnis-ring und den Fotoweg mit node tools/beta-267/acceptance.cjs ergebnis-acryl ausführen. Das optionale BETA_FILM=1 erfasst echte Bildschirmbilder mit Zeitstempeln, BETA_RUNS=1 begrenzt diesen separaten Filmdurchlauf.
5. node tools/beta-267/options.cjs prüft jede Ring-Option und den Rückwechsel. node tools/beta-267/slate.mjs PFAD-ZUM-ORIGINALREGISTER prüft alle 48 Platten gegen die hinterlegte Git-Prüfsumme.
6. node --test app/workshop/theme-cart-flow.test.mjs prüft den synthetischen Bestellweg und liest die tatsächlichen PDF-Seitengrößen. GRAVURU_BETA_EVIDENCE kann auf einen privaten Ausgabeordner für die Musterdateien verweisen.

7. Für den Datensparvergleich beide Prüfstände starten und `node tools/beta-267/measure-visible-designs.cjs 18268 18267 ergebnis-karten` ausführen. Die Vorher-Version, das kontrollierte Drei-Sekunden-Fenster und die erzeugten Einzelwerte sind im ergänzenden Messprotokoll angegeben.

[Desktop mit Ring-Designs](PC-Designs.png) · [Mobile Ring-Ansicht](Mobil-Designs.png) · [Desktop-Film mit Foto und Dateien](PC-Foto-und-Dateien.gif) · [Mobiler Film mit Foto und Dateien](Mobil-Foto-und-Dateien.gif)
