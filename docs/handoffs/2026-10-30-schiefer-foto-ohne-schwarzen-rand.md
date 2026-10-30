# Schieferfotos ohne sichtbaren schwarzen Bildrand

Nutzerkorrektur, 30.10.2026: Schwarze Bildhintergründe dürfen im Konfi nicht als Rechteck oder Rahmen auf der Schieferplatte erscheinen.

Die 7.140 SVG-Kundenansichten enthalten deshalb `mix-blend-mode:screen` ausschließlich auf dem Originalfoto und `isolation:isolate` am SVG. Schwarz trägt in diesem Darstellungsmodus keine Helligkeit bei; das Material bleibt dort sichtbar. Helle Fotodetails werden auf das Material gerechnet. Dies ist eine reversible Gravurvorschau, keine Änderung oder Neucodierung der Bilddatei. Auch die originale Maske, der Upload-Hinweis, dekorative Vorlagenrahmen und die blauen technischen Konturen bleiben unverändert.

Für die native Konfi-Integration: denselben Darstellungsmodus innerhalb der vorhandenen Fotomaske auf die Schiefer-Gravurfotos anwenden. Material und Foto müssen im gleichen isolierten Vorschaukontext liegen. Upload-Hinweis und Konturen außerhalb der geblendeten Fotoebene halten. Das Originalfoto im Produktions-/Download-Datenpfad unverändert speichern. Diese Einstellung gilt für die Gravurvorschau auf Schiefer, nicht pauschal für Farbdruckprodukte.

Die gelieferten eigenständigen SVG-Vorschauen und Kontaktbögen sind aktualisiert. Die zuvor dokumentierte native Übernahme freier Fotomasken und eingebetteter Fotos bleibt offen. Eine Live-Änderung am Konfi wird nicht behauptet.

Prüfung: `fotorand-pruefung.json` belegt, dass nur die Darstellungsattribute ergänzt wurden. Pixelvergleich und sichtbare Beispiele stehen unter `fotorand-korrektur/`.


7140 Vorschau-Dateien geändert; 11070 Gravur-/Editierdateien bytegleich. Pixelprüfung auf drei Materialtönen: jeweils 218262 schwarze Bildpixel exakt durch die Materialdarstellung ersetzt, 16735 helle Fotodetail-Pixel weiterhin sichtbar. Galerie: 11346 lokale Verweise, keine fehlenden Dateien.

Katalog: https://github.com/Chris83638w/gravuru-katalog./commit/ac05d1e428c54b0c78f1874a540220eae30c3e46 (verified true).

Hunde-Katzen-Foto-Alle-Groessen-SVG-ohne-Fotorand.zip · 2975421110 Bytes · SHA-256 fd2e0e091d9d1797340e4fd7a671b02187eac05b2ed7586b458acd03e47ec861 · ZIP-CRC bestanden.

Hunde-Katzen-Foto-Kontaktboegen-ohne-Fotorand.zip · 34176430 Bytes · SHA-256 38f3e013dba3c3027f48a67f51390add7ad7eda5e3ad3c794b89dd1267e01108 · ZIP-CRC bestanden.

Reproduktion im Projektordner: fix-schiefer-photo-background.py → check-schiefer-photo-background.cjs → render-schiefer-photo-series.cjs → verify-schiefer-photo-gallery.cjs → package-schiefer-photo-background.py. Der Paketbau nutzt die unveränderte Vorversions-ZIP für bereits komprimierte Einträge und prüft anschließend alle Einträge per CRC. Die Quelldateien des nativen Konfis wurden nicht verändert; der Operator muss die dokumentierte Darstellungsregel bei der Foto-/Maskenintegration übernehmen.
