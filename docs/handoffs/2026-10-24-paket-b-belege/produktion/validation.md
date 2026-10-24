# Paket B – nativer Produktionsnachweis

Lokaler Prüfstand, keine Maschinen- oder Shopfreigabe.

- 5/5 Node-Tests bestanden; Laufzeit 167,454 s. Vier Konturrichtungs-/Bestandsregressionen und ein vollständiger Produktionsketten-Test mit 12 Messfällen.
- Originalzeichnungen: TRT1-V2A-9x6, TRT1-V2A-30x20, TRT2-V2A-9x6, TRT2-V2A-30x20. Pfade, Maße und feste Bohrungen byte-/wertgleich zum aktuellen Katalog geprüft.
- Kette: Familie → gewähltes Profil bzw. reine Geometrie bei offenem Großformatpreis → nativeContour → Kontur-PDF; vier Vektor-Gravurausgaben; RT2 9×6 zusätzlich Vektorspiegelung, Grauraster ungespiegelt/gespiegelt.
- Echter RT2-D1-Quellstand: proportional erhaltene Vorlage → eingefrorener Review → acrylicArtwork → createAcrylicEngravingProof. Das Quellpaket blieb unverändert; Schriftpfade im Vektor-PDF, keine Fonts oder eingebetteten Rasterbilder.
- Maximaler Seiten-/Außenmaßfehler: 0.000483750 mm. Maximaler Lochmitten-/Durchmesserfehler: 0.000911628 mm. Maximaler Kurvenabstand: 0.000930287 mm. Grenze jeweils 0,1 mm. Kurvenvergleich unabhängig mit svgpathtools/Shapely, analytische kubische Grenzen.
- Gefundener und behobener Produktionsfehler: CairoSVG berücksichtigt clip-rule/fill-rule=evenodd hier nicht wie erwartet. Erzeugte Lochkreise laufen nun gegen die Außenrichtung; Originalkontur bleibt unverändert. Alte Grundformen unverändert. Bohrungen und Außenbereich werden in Vektor/Raster weiß, schwarze Gravur bleibt schwarz. Lediglich Graurundung Vektor/Raster akzeptiert ±1/255.
- Offene Großformatpreise wurden nicht ersetzt. Produktionspaket bleibt productionReady=false; Material-/Maschinenparameter, Probegravur und Bestellbindung bleiben offen.

Zeichnungs-SHA256: d5a021410ec2cb920496adb119e5d32d933f97a71092a42db1986b721bca53b1

Aktuelle geometrie.json SHA256: 0dd8cfcf31131281fe7c56baabbd6dd3a5b8858537f783a5452e7e080bbc3baa

Fixture-SHA256: 36cdadb485de8f420753571b7bbc7347e1c1d9ceb0a9e40c6615fde35796736a

measurements.json SHA256: 839b912eebdd3b25fdd84176cd3db0b47d092cabbc494bf41fb997b2ddc837f1
