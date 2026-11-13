# Quellenprüfung für sechs Shopbildvorschläge

12.11.2026. Nur vorhandene Dateien gelesen, Bilder angesehen und Prüfsummen verglichen. Keine Bildbearbeitung, Neugestaltung, Produktänderung oder Veröffentlichung. Dieser Bildbrief empfiehlt vorhandene Gestaltungen für die noch freizugebenden Shopbilder; die bestätigten Konfigurator-Startvorlagen bleiben jeweils `katalog-TRE-V2A-{5x2|6x2|8x2}-D1`.

## Konkrete Bildreferenzen

Alle Pfade in der Tabelle sind relativ zum Arbeitsordner. Der gemeinsame PNG-Ordner ist `outputs/Startdesign-Alternativen-230/Einzelansichten/`. Alle sechs genannten PNGs wurden tatsächlich angesehen; ihre SHA256 stimmen mit `outputs/Startdesign-Alternativen-230/Quellen.json` überein. Die drei vorgeschlagenen Design-IDs und Originaltexte sind außerdem in den sechs tatsächlichen Kopienrecords unter `work/restabschluss/claude-75a304eb/ops/plesk/sechsgruppen-20261112/records/*/source-document.json.gz` vorhanden.

| Produkt / tatsächlicher DRAFT | Bestehende Designreferenz | Originaltext / Anordnung | Native PNG | Materialquelle |
|---|---|---|---|---|
| Acryl 5 × 2 cm · `16203675074940` | `TRE-V2A-5x2-D4` | „Familie“ links oben, Linie, „Hoffmann“ rechts unten; Michroma | `B1-acrylic.png` | Acryl Schwarz, Referenz A unten; Anthrazit ist Produktoption |
| Acryl 6 × 2 cm · `16203715281276` | `TRE-V2A-6x2-D23` | „Vanessa“ oben links / „Krüger“ rechts unten, bestehendes Haus links unten; Rochester | `C2-acrylic.png` | Acryl Schwarz, Referenz A; Anthrazit ist Produktoption |
| Acryl 8 × 2 cm · `16203716100476` | `TRE-V2A-8x2-D801` | große „27“ links, senkrechte Linie, „Familie“ / „KAYA“ rechts; Poppins ExtraLight / Montserrat Light / Montserrat | `D3-acrylic.png` | Acryl Schwarz, Referenz A; Anthrazit ist Produktoption |
| Edelstahl 5 × 2 cm · `16203716854140` | `TRE-V2A-5x2-D4` | exakt dieselbe D4-Gestaltung, dunkel auf Metall | `B1-steel.png` | Native Originaltextur S unten |
| Edelstahl 6 × 2 cm · `16203717804412` | `TRE-V2A-6x2-D23` | exakt dieselbe D23-Gestaltung, dunkel auf Metall | `C2-steel.png` | Native Originaltextur S |
| Edelstahl 8 × 2 cm · `16203718459772` | `TRE-V2A-8x2-D801` | exakt dieselbe D801-Gestaltung, dunkel auf Metall | `D3-steel.png` | Native Originaltextur S |

Native Design-IDs tragen zusätzlich das Präfix `katalog-`. Diese Auswahl ist ein Bildvorschlag, keine neue Festlegung der Startdesigns. `outputs/Startdesign-Alternativen-230/README.md` dokumentiert ausdrücklich die Korrektur des früheren Missverständnisses: Die Designs bleiben, gemeint ist das Produktbild im Shop. Die historischen Labels B1/C2/D3 sind nur Bildreferenzen.

## Verbindliche Geometrie für alle sechs Bilder

Die gespeicherten Produktprofile und die Vorschauquellen stimmen überein: Rechteck (`shape:"rect"`), **Eckenradius 0 mm**, Startausführung ohne Bohrungen (`holes:[]`, K00). Keine abgerundeten Ecken, keine Ovale und keine Bohrungen aus anderen Materialmustern übernehmen.

| Format | Plattenmaß | Frontflächenverhältnis | Acrylstärke | Edelstahlstärke |
|---|---|---|---|---|
| 5 × 2 cm | 50 × 20 mm | 2,5 : 1 | 3 mm | 1,5 mm |
| 6 × 2 cm | 60 × 20 mm | 3 : 1 | 3 mm | 1,5 mm |
| 8 × 2 cm | 80 × 20 mm | 4 : 1 | 3 mm | 1,5 mm |

Die PNG-Dateien haben einschließlich transparentem Rand/Schatten 1200 × 527, 1200 × 452 bzw. 1200 × 359 Pixel. **Nicht die ganze Leinwand auf das Plattenverhältnis stauchen.** Maßgeblich ist die sichtbare Frontfläche. Eine Platte, feine zusammenhängende Stärkenkante und weicher diffuser Schatten; keine versetzte zweite harte Plattenkontur. Möglichst frontale Produktansicht, Originalanordnung und Motive unverändert. Ein heller neutraler Hintergrund ist als Shopbildvorschlag möglich; keine zusätzlichen Befestigungen oder Zubehörteile suggerieren.

## Materialquellen und Grenzen

**S – tatsächlich eingebettete Edelstahloberfläche:**

`work/issue230-integration-candidate/app/designs/aosu-labrador/runtime/images/gravuru-edelstahl-feine-maserung-vorschau.png`

SHA256 `74f75d42041d70b20bb559ebe317006c1058534bfedcb6fe0f490c872f44e3e6`, 1.440.952 Bytes. Visuell geprüft: feine horizontale Bürstung, neutraler Silberton, breites weiches helles Zentrum; keine körnige Aluminiumoptik und kein Chromspiegel. Die Bytes dieser Datei sind exakt gleich der eingebetteten `config.materialSurface` aller drei Stahl-Kopienrecords **und** der Bildressource in den drei genannten Stahl-Vorschau-SVGs. Damit ist die konkrete Texturzuordnung belegt.

`MATERIALREFERENZEN.md` nennt zusätzlich `edelstahl-gewaehlte-originalfassung-v4.png` als gewählte gestaltete Originalreferenz, nicht v6. Die vorhandene Kopie `app/workshop/ui/material-surfaces/steel-reference-v4.png` wurde ebenfalls angesehen: Sie enthält Leuchtturm, Namen und abgerundete Ecken. Sie ist nur Material-/Gravurbeleg, **keine** Kontur- oder Gestaltungsvorlage für die eckigen Kleinformate.

Die ebenfalls angesehene Datei `C:/Users/Christopher Koch/Documents/Codex/2026-11-03/wo/outputs/Edelstahl-Originalretusche/Edelstahl-Original-ohne-Gravur.png` ist eine ältere leere Montage mit runden Ecken. Laut ihrer aktuellen `Herkunft.md` wurde die Innenfläche durch dieselbe vorhandene Textur ersetzt; sie ist ausdrücklich nicht pixelidentisch mit der gravierten Fotovorlage. Deshalb für diese sechs Bilder die bereits richtigen nativen kleinen PNGs bevorzugen, die große Rundkontur nicht übernehmen.

**A – Acryl Schwarz / Anthrazit, originale Materialmuster:**

Gemeinsamer absoluter Ordner:
`C:/Users/Christopher Koch/Documents/Codex/2026-09-27/gravuru-produktanlage-shopify-fortsetzung-20260927/outputs/Materialrohlinge-2026-09-28/originale/`

| Datei | SHA256 | Sichtbefund |
|---|---|---|
| `acryl-schwarz-3mm.png` | `be4b1987e802ddd9aeecb45683c26804683a4ca9e6bb4aa1c21b70573e13d72d` | tiefschwarze glatte Front, dezenter Lichtreflex, helle Gravur |
| `acryl-anthrazit-3mm.png` | `9dd7303c08680f1bee1c1fd0f3f8cfa6de7a2cdf683b7129b13fde0c9cfd047e` | deutlich graue anthrazitfarbene Front, ähnliche Lichtführung, helle Gravur |

Beide Bilder wurden angesehen und stimmen byteweise mit den Referenzpins in `app/workshop/ui/material-surfaces/acrylic-provenance.json` überein. Beide Originalmuster enthalten vorhandene Schrift und zwei Bohrungen; diese Bestandteile nicht in die Kleinproduktbilder übertragen. Der native Acrylrenderer ist laut Provenienz eine prozedurale 2D-Näherung, **keine pixelidentische Materialfotografie**. Alle genannten kleinen Acryl-PNGs zeigen Schwarz. In diesem Einzelansichtenpaket existiert keine Anthrazitfassung. Für sechs erste Bilder bietet sich Schwarz als dargestellte, bereits vorhandene Startfarbe an; Anthrazit bleibt in Titel/Text eine echte verfügbare Variante. Soll Anthrazit im Bild gezeigt werden, ausdrücklich am geprüften Anthrazitmuster orientieren und als neuen Shopbildentwurf kennzeichnen.

**Pixelgenauigkeit:** Die unveränderten nativen PNGs bewahren die geprüfte Darstellung. Eine mit Imagegen veränderte Perspektive/Oberfläche darf nicht als pixelidentischer Originalmaterialnachweis bezeichnet werden. Im Bildauftrag deshalb jeweils die passende native PNG sowie die zugehörige Materialreferenz verwenden; keine freie stilistische Materialersetzung verlangen.

## Quelldateien und Prüfsummen

Katalogstand der Vorschauen: `8236b8bfab7322447ec46661c116fa526331af3d`. Die drei tatsächlichen Design-JSONs wurden gelesen; ihre SHA stimmen mit `Quellen.json`:

- `work/product-plans-catalog/designs/edelstahl-gravur-50x20/TRE-V2A-5x2-D4/design.json` — `44290e4977baf237f5c85b9198bcab71256e219889e24cc0a32a774a34592fd4`
- `work/product-plans-catalog/designs/edelstahl-gravur-60x20/TRE-V2A-6x2-D23/design.json` — `3b907dd3c6c760b6320aa9005268c56a5c6ad51f52ff216b52350d47f2ac39fc`
- `work/product-plans-catalog/designs/edelstahl-gravur-80x20/TRE-V2A-8x2-D801/design.json` — `2e2118698d17a52df34a9c63a1a46fa09caa13a949dd7f989f8d8b3039d30cf7`

| PNG | Geprüfter SHA256 |
|---|---|
| B1-acrylic.png | `c4cb0348d116e8ff0394ac81c2cdd29ee7c164a3114cabdcb3784aac8d36f7cb` |
| B1-steel.png | `ea02af353a3a68666559d3ede7ee8c3fc934ec991a4c34d7d6c84f895483f1c5` |
| C2-acrylic.png | `6f34765ec94475a80a2a5500786688cae89a2b4ef4f2f12b3dcfd0330e7242ab` |
| C2-steel.png | `794633a8a631f812550a3ddcaff3878ec3079fb9ac00c1ceb5d084664130ecb0` |
| D3-acrylic.png | `de2bc45d5415a9c406f8a7deaa73d765659a28227cc8a8bbf67e74bae41cb70e` |
| D3-steel.png | `edd513ee8d79fd5788f823a074a6eac8900fa9f0056025768f28272133928597` |

Die tatsächlichen sechs Produkt-IDs und finalen Akten stammen aus `outputs/Produktplaene-230-sechs-Abschluss-20261112/appendix-index.json`: Acryl jeweils `_v6.xlsx`, Edelstahl jeweils `_v5.xlsx`. Dieser Beleg meldet die Produkte als DRAFT und ohne Shopbilder; hier wurde kein neuer Shopify-Liveabruf vorgenommen. Keine Freigabe oder Veröffentlichung der vorgeschlagenen Bilder behauptet.
