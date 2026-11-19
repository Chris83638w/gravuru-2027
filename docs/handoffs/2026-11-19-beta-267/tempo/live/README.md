# Prio-Konfi R15 im veröffentlichten Shopify-Shop · 19. November 2026

Der Designwechsel im veröffentlichten R15 sank im Median von 977 auf 191 ms. Die geprüfte Designkarte erschien im Datensparmodus in acht von acht Versuchen. Neue Ring-Kundenbilder zeigen jetzt auch die Klingelkamera. Der gesamte Warenkorbvorgang dauerte zuletzt 6,06 s. Davon entfielen 1,79 s auf das Warten auf das bestätigte Kassenbild. [Ring-Produkt im Shop](https://gravuru-design.myshopify.com/products/klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert) · [Freigabe von Chris](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7017499306)

## Einzeln gemessene Änderungen

| Stand im Shop | Geprüfte Originalkarte im Datensparmodus | Designwechsel, Median | Letzter Klick bis alle persönlichen Warenkorbbilder sichtbar sind, Median |
| --- | ---: | ---: | ---: |
| Ausgangsstand `9af3a1ac` | 0/8 innerhalb von 3 s | 977 ms | 6,59 s |
| `38f6272a` · Schriften und Motive der sichtbaren Karte gezielt laden | 8/8, Median 59 ms | 588 ms | 6,38 s |
| `f5bc51bb` · Bereits bestimmtes physisches Ring-Profil beim Zeichnen wiederverwenden | 8/8, Median 57 ms | 266 ms | 6,59 s |
| `c4f855e0` · Passende Bildbreite für die Warenkorbzeile anfordern | 8/8, Median 59 ms | 272 ms | 6,49 s |
| `98ecce47` · Persönliches Bild und Vergrößerung im R15-Warenkorb, Bearbeiten-Link entfernt | 8/8, Median 55 ms | 278 ms | 6,67 s |
| `14b53038` · Gebundenes Ring-Foto in der persönlichen Kundenansicht neuer Entwürfe mitspeichern | 8/8, Median 28 ms | 191 ms | 6,06 s |

Im Datensparmodus übersprang der Lader benötigte Schrift- und Motivkonturen auch für eine sichtbare Designkarte. In der Galerie ermittelte R15 das gewählte physische Produktprofil beim Zeichnen wiederholt. Im Warenkorb wartete der Server vor der Freigabe der Bilddaten auf das bestätigte Kassenbild. Anschließend lud die Warenkorbzeile auch auf einem normalen PC das große Bild. Die passende Anzeigebreite spart Bilddaten. Der beobachtete Zeitgewinn von 0,54 s über die gesamte Strecke lässt sich keinem einzelnen Änderungsschritt zuschreiben. [Vier isolierte Änderungen auf dem Produktionsstand](https://github.com/Chris83638w/gravuru-2027/compare/9af3a1ac...98ecce47) · [Einzelmessungen](Messwerte.json)

## Warenkorb und Speicherung

| Messpunkt | Vorher | Auf dem veröffentlichten Endstand |
| --- | ---: | ---: |
| Entwurfsaufruf bis erstes Antwortbyte, Median | 728 ms | 819 ms |
| Entwurfsaufruf bis vollständige Antwort, Median | 730 ms | 820 ms |
| Davon serverseitiger Datenbankschreibschritt, Median | 9,8 ms | 10,9 ms |
| Bilddatenaufruf bis erstes Antwortbyte, Median | 2,35 s | 2,24 s |
| Darin Warten auf das bestätigte Kassenbild, Median | 2,03 s | 1,79 s |
| Gesamter Warenkorbvorgang, Spanne | 5,69–8,76 s | 5,66–6,65 s |
| Warenkorb unter 5 s | 0/12 | 0/12 |

Die Wartezeit für das Kassenbild liegt innerhalb des Bilddatenaufrufs. Die beiden Werte dürfen beim Lesen der Tabelle nur einmal in die Gesamtzeit eingehen.

| Gerät und Browsercache | Warenkorb vorher | Warenkorb zum Abschluss |
| --- | ---: | ---: |
| PC, erster Artikel | 6,84 s | 6,34 s |
| PC, zweiter Artikel | 6,33 s | 5,94 s |
| Handybreite, erster Artikel | 6,80 s | 6,00 s |
| Handybreite, zweiter Artikel | 6,53 s | 6,14 s |

Je Feld gingen drei Läufe ein. Die zwölf ursprünglichen Datenbankschreibvorgänge dauerten 7,97–26,56 ms. Bei den Entwürfen 3/6/9/12 waren es 8,79/10,27/9,34/8,66 ms. Am letzten Stand lagen dieselben vier Werte bei 8,50/9,31/17,64/10,57 ms. Ein einzelner Zwischenlauf auf Stufe 2 erreichte 727 ms. Die auf der getrennten Beta beobachtete regelmäßige Schreibpause trat in der Produktionsreihe nicht auf. Datenbank- und Hosting-Einstellungen blieben deshalb auf ihrem bestehenden Stand. [Alle Stufen, erste und vollständige Antwort sowie jeder dritte Entwurf](Zusammenfassung.json)

## Bilder, Bedienung und Fertigung

- Vor der Fotokorrektur fehlte das Ring-Gerät schon im gespeicherten Original. Keiner der 24 charakteristischen Bildpunkte war zu erkennen. Vier zusätzliche Vorversuche luden noch den bisherigen Exportcode. Sie blieben außerhalb der Zeitreihe. Der anschließende Prüfbrowser lud die exakten neuen Module und bestätigte auf PC und Handybreite vier Positionen. Bei beiden Gestaltungen stimmten 24/24 Kameramerkmale. Der veröffentlichte Stand reproduzierte das Ergebnis. Im Strichdesign waren je 16/16 Punkte beider Zierlinien sichtbar, im Kontrollentwurf je 0/16. Die Korrektur gilt für neue Ring-Kundenansichten. Bereits gespeicherte Entwürfe behalten ihr damaliges Bild. [Gerätefoto und Motiv je Prüfschritt](Geraetefoto.json) · [Gesonderte Freigabe und Vorabprüfung](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7018997812)
- In allen 72 regulär gemessenen Warenkorbvorgängen stimmten Variante, Preis, Menge, feste Revision und Bildzuordnung. Je eigenem Warenkorb erhielten „Haus Nord 12“ und „Haus Süd 27“ dieselbe Shopify-Variante zu 49,99 € je Stück. Auf PC und Handybreite ließen sich die Bilder im Warenkorb und im seitlichen Warenkorb zuordnen. Das Öffnen der Vorschau lieferte das Original mit 952 × 1600 Pixeln. Nach dem Entfernen von Nord blieb auch nach erneutem Laden Süd mit 49,99 € übrig. Der Bearbeiten-Link entfällt für native R15-Positionen. Frühere Positionen des separaten Upload-Editors behalten ihre eigene Bedienung. [Warenkorb am PC](PC-Vorschau.png) · [Warenkorb auf Handybreite](Mobil-Vorschau.png)
- Das veröffentlichte Theme liefert für bestätigte R15-Shopify-Bilder je nach Pixeldichte 160, 320 oder 480 Pixel Breite. Die Vergrößerung öffnet die originale URL. Im Chrome-Einzelabruf mit leerem Cache sank die übertragene Datenmenge bei einfacher Pixeldichte für die vollständige Kundengestaltung mit Gerätefoto von 24.693 auf 5.440 Bytes im Median (−78 %). Der Browser erhielt das große Bild als WebP und das kleine als AVIF. Die gemessene Abrufdauer streute. Auch der reine PNG-Vergleich bestätigt Größe, Proportionen und den jeweiligen Bildinhalt. [Browsermessung](Browser-Bildvergleich.json) · [PNG-Maße und Bildvergleich](Bildgroessen.json)
- Die echte Shopify-Kasse zeigte nach beiden Theme-Schritten und nach der Ring-Fotokorrektur zwei unterschiedliche, der jeweiligen Gestaltung zugeordnete Bilder. Die Prüfung endete vor der Bestellung. Ein echter Auftrag in der Bestellansicht und dessen Übergabe an die Werkstatt bleiben für die separate Freigabe der Shopify-Übergabe offen. [Kasse, Vergrößerung und Entfernen](Kasse-und-Bedienung.json)
- Alle 80 gespeicherten Testpakete (72 in der Zeitreihe und acht aus den beiden Vorprüfungen) bestanden die ZIP- und SHA-256-Prüfung aller manifestierten Dateien (fünf bei Nord, sieben bei Süd). Die zwölf Pakete des Ausgangsstands hatten beim abschließenden erneuten Lesen denselben Hash wie vor der ersten Änderung. Aus beiden Ring-Gestaltungen jeder Stufe erzeugte der Produktionsrenderer erneut Gravur-SVG, Stahl- und Acryl-Kontur-SVG sowie beide Schnitt-PDFs. Alle drei SVGs waren je Gestaltung bytegleich. Bei den PDFs stimmten alle Bytes außerhalb der Ziffern im Erstellungszeitstempel überein. Die Abmessungen betrugen 160 × 280 mm, mit drei Textfeldern. [Fertigungspakete und Exportprüfsummen](Fertigung.json)

## Ausgelieferter Stand und Rückweg

Das veröffentlichte Shopify-Produkt öffnet den Editor auf `app-2027.gravuru-designwerkstatt.de`. Der Node-Prozess lief bei der Identifikation mit PID 113651 auf `9af3a1ace4ca8a38d5266a44485984a223195ac4`. Der Startdatei-Hash war zu Beginn und am Ende identisch. Die Änderungen an Karten und Designwechsel liefern neue statische Browserdateien aus. Bestehende Tabs können ihre bisherigen Dateien weiter laden. Zwei Änderungen betreffen genau eine Vorlage des aktiven Shopify-Themes `190984126844`. Die abschließende Ring-Fotokorrektur `14b53038` läuft seit 18:57 UTC ebenfalls im Browser. Der Quellvergleich ist vom Beta- und vom Grok-Zweig getrennt. [Dateien, SHA-256, Uhrzeiten, Shopify-Rücklesen und bestätigte Wiederherstellung aller drei Datenbankkopien](Auslieferung.json) · [Isolierter Vergleich aller fünf Änderungen](https://github.com/Chris83638w/gravuru-2027/compare/9af3a1ac...14b53038)

Für die sichtbaren Ressourcen bestanden 97 gezielte Tests. Der anschließende Editorlauf bestand 265 Tests, darunter Foto, Designwechsel, Textübernahme und Druck. Weitere 46 Tests für Warenkorbübergabe, Shopify-Kassenbild, Bestelleingang, Revisionen und Exporte bestanden mit den im Projekt vorgesehenen PDF-Bibliotheken. Die Theme-Prüfung umfasste sechs Typen von Warenkorbpositionen sowie die Browserauswahl der Bildbreiten bei einfacher, doppelter und dreifacher Pixeldichte. Die Shopify-Schablone wurde vor beiden Uploads validiert.

Der Rückweg für jede Editoränderung wurde auf einer privaten Kopie mit dem eingesetzten Umschaltskript vorwärts und rückwärts erprobt. Das Skript gleicht die erwarteten Dateihashes ab. Die erste Zeile nimmt nur das Gerätefoto für zukünftige Kundenbilder zurück. Für das Zurücknehmen aller drei Browseränderungen auf dem Host im Verzeichnis der Domain gilt die angegebene Reihenfolge.

```sh
/opt/alt/python311/bin/python3 private/astra-r15-267-live-sicherung-20261119T1806Z/kundenbild-umschalten.py 14b53038421e6eb819c2ae6d253bfb72eefa6873 rollback
/opt/alt/python311/bin/python3 private/astra-r15-267-live-sicherung-20261119T1806Z/anzeige-umschalten.py f5bc51bb75a806d4b78c38b7b6305738dd52b0fc rollback
/opt/alt/python311/bin/python3 private/astra-r15-267-live-sicherung-20261119T1806Z/anzeige-umschalten.py 38f6272aa1e8f55a952371efb27910bb43b98787 rollback
```

Für den Shopify-Rückweg zuerst aus demselben aktiven Theme `snippets/gravuru-warenkorb-bearbeiten.liquid` neu abrufen und den vollständigen SHA-256 mit dem Auslieferungsbeleg abgleichen. Auf dem Endstand (`37b7aeef…`) stellt der rückwärts angewandte erste Patch den Stand mit kleinen Bildern (`f3d0d464…`) wieder her. Der zweite stellt den Ausgangsstand (`e9e4f2b6…`) wieder her. Beide Rückwege wurden bytegenau erprobt. Je Schritt nur diese eine Datei mit `shopify theme push --only snippets/gravuru-warenkorb-bearbeiten.liquid --allow-live --nodelete` an das geprüfte Theme übertragen und aus Shopify erneut lesen. Bei abweichendem Hash zuerst die zwischenzeitliche Änderung abgleichen. Der Rückweg benötigt keine Datenbankwiederherstellung. [Erster Rückwärtspatch](../../../../../ops/shopify/theme-block/r15-live-nur-vorschau.patch) · [Zweiter Rückwärtspatch](../../../../../ops/shopify/theme-block/r15-live-kleine-vorschaubilder.patch)

## Messung wiederholen

In Chrome 157.0.8103.78 wurden pro Stand drei frische PC- und drei frische mobile Browserkontexte geöffnet. Jeder fügte zwei voneinander unterscheidbare Gestaltungen hinzu. PC hatte 1440 × 960, die Handyemulation 390 × 844 Pixel. Die Zeitreihe nutzt Pixeldichte 1 und keine künstliche Netz- oder CPU-Drosselung. Runden 1 und 3 melden den Datensparmodus. Die zusätzliche Bedienprüfung auf Handybreite verwendet Pixeldichte 3. Ein physisches Smartphone war nicht angeschlossen.

Die Kartenmessung beginnt, sobald die Karte `FK-VERDECKT` in den sichtbaren Bereich gebracht wurde. Erst korrekt bezeichnete SVG-Pfade und zwei weitere Zeichenzyklen zählen als sichtbar. Der Designwechsel misst vom Klick bis zur bestätigten neuen Auswahl plus zwei Zeichenzyklen. Die Warenkorbuhr läuft vom letzten Bestätigungsklick, bis **alle** persönlichen Bilder auf der Shopify-Warenkorbseite dekodiert und sichtbar sind. Funktions- und Hashprüfungen laufen danach. Die Chronologie sowie die tatsächlich geladenen Browserdateien stehen in den Einzelwerten. [Browser-Prüfung](../../../../../tools/beta-267/measure-live-r15.cjs)

Für die Wiederholung werden Node 24, Playwright und installiertes Chrome benötigt. Der letzte Parameter ist ein absoluter Ausgabeordner außerhalb des Repositorys. Je Aufruf einen neuen Messnamen verwenden. `editor` läuft ohne Warenkorbeintrag. `cart` erzeugt bei drei Runden zwölf eigene Testpositionen im laufenden Shop.

```sh
node tools/beta-267/measure-live-r15.cjs sichtpruefung editor 1 /absoluter/pfad/r15-messungen
R15_SMALL=1 R15_PREVIEW_ONLY=1 R15_CHECK_PHOTO=1 node tools/beta-267/measure-live-r15.cjs warenkorb cart 3 /absoluter/pfad/r15-messungen
```

Für einen Wechsel der eigentlichen Shopify-Übergabe verlangt Chris einen belegten Durchlauf mit Bestellansicht, fester Revision und Fertigungsübergabe sowie eine eigene Freigabe. Der offene Zeitanteil ist der Ausgangspunkt für diese Gegenprüfung. [Bedingungen für die Shopify-Übergabe](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7017499306)
