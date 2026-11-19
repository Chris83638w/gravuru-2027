# Studio im Testshop und die beiden Schiefer-Originale

Der zweite Account kann die Bestellzuordnung und den ersten Schiefer-Import unabhängig prüfen. Die Arbeiten gehören zu Entwurfs-PR #263. Die aktive Produktion läuft über R15. [Auftrag in #260](https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-7002634526)

## P1 · Von der Suchliste zur bezahlten Bestellposition

Die Shopify-Suche `test:true sku:"…"` liefert Bestellungen. Ein Treffer kann mehrere unterschiedliche Artikel enthalten. Studio liest deshalb jede gefundene Bestellung und gleicht pro Position die SKU aus `LineItem.sku`, Produkt-ID und Varianten-ID mit der freigegebenen F02-Konfiguration ab. Der Shopname in der Konfiguration und der tatsächliche Request-Host müssen zusammenpassen. Fehlt die Konfiguration für den reservierten Testshop, endet der Vorgang vor dem Netzaufruf. [Shopify-Feldreferenz](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/LineItem#field-LineItem.fields.sku)

Die Werkstatt verknüpft die unveränderliche Shopify-Positions-ID mit Bestellung und Gestaltungsauftrag in einer Datenbanktransaktion. Ein Entfernen der Position oder ein Neustart erhält die erste bezahlte Zuordnung. Bei einem bestehenden Datenbestand bezieht Studio frühere aktive Zuordnungen und bereits archivierte F02-Positionsaufträge ein. Vor der Dateiberechnung und unmittelbar vor der Rückgabe muss dieselbe Position aktiv und bezahlt sein. Das gilt auch für zwischengespeicherte Dateien.

**Kleines Gegenbeispiel.** Ein bezahlter Suchtreffer enthält vier Gestaltungen. Eine passt, drei tragen eine fremde SKU, Variante oder Produkt-ID. Eine weitere gefundene Bestellung enthält nur fremde Artikel. Zwei aufeinanderfolgende Anmeldungen ergeben zusammen genau eine gespeicherte Zuordnung. Bei einem zweiten Versuch wird die inzwischen entfernte Positions-ID in einer anderen Bestellung geliefert. Deren Download scheitert. Eine nach dem ersten Abruf erstattete Position liefert auch ihre bereits erzeugte PDF-Datei nicht mehr.

**Kosten.** Zwei überlappende Anmeldungen derselben laufenden Werkstatt teilen einen Abgleich. Eine spätere Anmeldung scannt erneut. Bei 101 synthetischen Suchtreffern mit einer Detailseite je Bestellung wurden 104 Aufrufe gezählt, davon drei Suchseiten mit höchstens 50 Treffern und 101 Detailabrufe. Weitere Positionsseiten und früher zugeordnete Aufträge außerhalb der Suchliste erhöhen die Anzahl. Wenn Shopify Kosten zurückliefert, weist der Abgleich `usage.requests`, `usage.costedRequests` und die Summe `usage.actualQueryCost` aus. Die Punktwerte im Test sind simuliert. Vor einer Ausweitung sind reale Kosten und Laufzeit im Testshop zu messen. Ein vollständiger Scan bei jeder Anmeldung wächst mit der Bestellhistorie. Für größere Bestände wäre ein Abgleich geänderter Aufträge mit periodischer Vollprüfung zu erproben. [Shopify-Kostenmodell](https://shopify.dev/docs/api/usage/limits)

**Nachweisstand.** Der Ausgangsstand `931115cb` bestand bei erneuter Ausführung 41 von 41 Tests. Am neuen Stand bestanden 52 von 52. Zwei privat gesicherte Gestaltungen aus bezahlten Testpositionen lieferten bei acht nachgebildeten Shopify-Leseantworten dieselben vier SVG-/PDF-Dateien wie zuvor. Die Positions-SKU in den Testantworten kam aus der freigegebenen Testkonfiguration. Der authentifizierte Abruf im F02-Shop ist offen. Der vorhandene Shopify-Zugang ist an einen anderen Shop gebunden. Die Netzfreigabe dieser Arbeitsumgebung umfasst die F02-Admin-API nicht. [Vorherige Dateiprüfsummen und privater Prüflauf](2026-11-19-studio-f02-werkstatt.md)

Für die echte Gegenprobe erst die beiden Gestaltungen des freigegebenen Testartikels abgleichen und SVG/PDF je Position über den Werkstatt-Download prüfen. Anschließend dieselbe bereits gecachte Datei nach einem tatsächlichen Statuswechsel des Testauftrags abrufen. Erwartet werden eine Sperre ohne Dateianhang sowie eine Sperre bei einem zurückgewiesenen Lesezugriff. Die Werkstattprotokolle des Testshops genügen für IDs und Einzelbelege. Ins Issue gehören lediglich Status, Zuordnungsergebnis und Prüfsummen. Die Checkout-Miniatur zeigt nach dem bisherigen Kauftest das Standardprodukt. Der persönliche Vorschaulink ist je Position vorhanden.

## P2 · Archivimport von D230 und D287

Beide Originale im Katalogstand `8236b8bf` enthalten als erstes Element `rect#platte` mit `fill="none"`, `stroke="#999"` und `stroke-width="0.2"`. Das war der erste konkrete Fehler beim direkten Import. Der paarweise Import prüft Größe und SVG-Eigenschaften und erfasst den grauen Rahmen als Plattenvorschau. Die gravierten Motivpfade behalten Geometrie, Füllfarbe und Füllregel. Mehrzeilige Schriften behalten die X-Anker und tatsächlichen Grundlinien der einzelnen `tspan`. D230 behält den Fotoausschnitt als historische Quellgeometrie. Seine spätere freie Kundenplatzierung ist gesondert zu prüfen. Ein ungeklärter Pfad, Textwiderspruch oder unbekannter Effekt bricht die Prüfung ab. Die reguläre Werkstatt akzeptiert das Dateipaar als ZIP zur Prüfung. [D230 mit Foto](https://github.com/Chris83638w/gravuru-katalog./tree/8236b8bfab7322447ec46661c116fa526331af3d/designs/bestand/gedenktafeln/Tiere/Hund/gravur-rechteck-D230) · [D287 ohne Foto](https://github.com/Chris83638w/gravuru-katalog./tree/8236b8bfab7322447ec46661c116fa526331af3d/designs/bestand/gedenktafeln/Tiere/Allgemein/gravur-rechteck-D287)

| Geprüft bei 300 × 200 mm | D230 | D287 |
| --- | --- | --- |
| Quelldaten | Sechs sichtbare Motivpfade, vier Textfelder auf sieben Grundlinien, ein Foto mit Clip, zwei ausgeblendete Hinweispfade | Sechs sichtbare Motivpfade, drei Textfelder auf fünf Grundlinien, kein Kundenfoto |
| SVG-Motivprobe | Alle 1.200 × 800 Pixel stimmen mit den isolierten Originalpfaden überein | Alle 1.200 × 800 Pixel stimmen überein |
| PDF-Motivprobe | Gleiche Pixelgrenzen. Schnittmenge/Vereinigung der eingefärbten Pixel 19.827/19.878 bzw. 99,74 % | Gleiche Pixelgrenzen. Schnittmenge/Vereinigung 83.086/83.215 bzw. 99,84 % |
| Lokale Schriftkonturen | Centaur 27/27, Georgia 10/10 Zeichen | Centaur 9/9, Stylish 24/24 Zeichen |

Die Pixelprobe vergleicht ausschließlich das sichtbare Hundeengel-Motiv. Sie enthält weder Text noch Foto oder Maschinenkontur. Das Original-SVG besitzt keine als `CutContour` ausgewiesene Ebene. Die Schriftprobe prüft für jedes unterschiedliche verwendete Zeichen außer Leerraum einen vorhandenen, gefüllten Umriss in der angegebenen Datei. Ein vollständiger Satzvergleich einschließlich Ligaturen, Abständen und Umbruch mit der Corel-Vorschau steht aus.

### Schriftquellen und Rechte

| Schrift | Geprüfte Datei | Stand für den Kundeneditor |
| --- | --- | --- |
| Centaur Regular | Lokale `CENTAUR.TTF`, Version 1.55, SHA-256 `1d9fec6f9b2b72203ea56a4c7e3b40499984829ff99ae8ae53340fd8d5f07fcb` | Originalfamilie vorhanden. Der prüfbare Lizenzbestand enthält keinen Nachweis für die Auslieferung als editierbare Web-/App-Schrift oder Glyphenbibliothek. |
| Georgia Regular | Lokale `georgia.ttf`, Version 5.59, SHA-256 `38dffcaf1fac89492f7c56c600a14daf36ae42f7c21985cd4134ae113124a58f` | Das eingefrorene Schriftregister führt Georgia unter den entfernten Schriften. Eine konkrete Freigabe für dieses Kundenprodukt ist offen. |
| Stylish Regular | Original-OTF aus dem gravuru-Katalog, 7NTypes / Situjuh Nazara, Version 1.00 vom 07.07.2022, SHA-256 `11585e2e87b2cb9e46458b92951da376f237b9111daa091c17f043905f5bdac7` | Im Katalog als nutzbar vermerkt, Einzelbeleg noch abzulegen. Creative Fabrica unterscheidet die Nutzung für Endprodukte von Nutzung im Online-Konfigurator. Der Google-Fonts-Namensvetter von AsiaSoft hat einen anderen Urheber. |

Die Originalbögen nennen die Schriftfamilien. Eine Auskunft über die beim Erstellen der CDR benutzte Binärversion fehlt. Die lokale Konturprobe verwendet die oben identifizierten Dateien. Der kommerzielle Editor benötigt einen zum tatsächlichen Einsatz passenden Rechtebeleg. Die Installations- und Dokumenteinbettungsflags allein belegen ihn nicht. [gravuru-Schriftregister](https://github.com/Chris83638w/gravuru-katalog./blob/8236b8bfab7322447ec46661c116fa526331af3d/schriften/schriften.json) · [Microsoft zu Font-Weitergabe](https://learn.microsoft.com/en-us/typography/fonts/font-faq) · [Stylish von Situjuh](https://www.creativefabrica.com/product/stylish-8/view/multi-user/) · [Creative-Fabrica-Lizenz](https://www.creativefabrica.com/subscription-license/) · [AsiaSoft-Nachweis der gleichnamigen Schrift](https://raw.githubusercontent.com/google/fonts/main/ofl/stylish/OFL.txt)

### Preise, Befestigung und Ständer

D230 kostet im Referenzprofil SL-21 mit zwei Montagebohrungen 32,99 € + 2,99 € = **35,98 €**. Die Ø-4-mm-Lochmitten liegen links/oben gemessen bei (19, 100) und (281, 100) mm. D287 mit klarem Acrylständer ergibt 23,99 € + 13,99 € = **37,98 €**. Beide Rechnungen stimmen zwischen Preisdatei, Tafel- und Zubehörregister überein. Das Rechteckfoto für die Zweierbohrung und das Produktfoto des klaren Ständers wurden auf der verknüpften Zubehörrevision gefunden. [Preisquelle](https://github.com/Chris83638w/gravuru-katalog./blob/8236b8bfab7322447ec46661c116fa526331af3d/preise/preise-chris-20261102.json) · [Rohling, Kontur und feste Bohrbilder](https://github.com/Chris83638w/gravuru-katalog./blob/ff1ea99ef92f3cce7069e7c9d41cdaa3e781e546/zeichnungen/schiefer-tafeln-2027/schiefer-tafeln.json) · [Zubehörmedien](https://github.com/Chris83638w/gravuru-katalog./blob/86aa4bcec5c62e0c46cfc61ed30a42418841d1ff/materialien/zubehoer/schiefer-zubehoer.json)

**Gegenbeispiel zur Katalogübernahme.** 17 der 48 Tafeln im eingefrorenen Stand vom 04.11. haben einen positiven Ständerhaken, obwohl Form oder Größe der später bestätigten Regel widersprechen. Darunter sind die Rechtecke 56 × 18 cm und 60 × 30 cm und die runden Tafeln SL-33 bis SL-36. SL-21 mit 30 × 20 cm erfüllt die Regel. Vor einer Verkaufsbindung gilt die Bestätigung für rechteckige und quadratische Platten bis 40 × 30 cm. Die Erstbehandlung in der Fertigung und das separat bestellbare 60-ml-Pflegespray sind zwei verschiedene Sachverhalte. Die Beträge oben beziehen sich auf je ein Stück und die jeweils genannte Option. [Bestätigte Ständerregel](https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-6976844579) · [Erstbehandlung und Pflegespray](https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-6976793924)

Für diese beiden Schieferfälle ist der Bestellweg mit frei beweglichem und skalierbarem Foto/Motiv/Text, festen Bohrungen, den tatsächlichen Staffelpreisen sowie identischem Betrag in Shop, bezahlter Position und Werkstatt offen. Die Beispiele sind gegen die Originalquellen gerechnet. Die historische Testzahlung betraf die Heimathafen-Designs. Eine Migrationsentscheidung setzt die vollständige Abnahme voraus.

## Gegenprüfung

Aus `app/personalisierungsstudio` mit den Abhängigkeiten der bestehenden Studio-App starten. Die ersten beiden Befehle funktionieren ebenso mit einer Original-JSON und danebenliegender gleichnamiger SVG. Der Werkstatt-Upload unterstützt das gemeinsame ZIP.

~~~sh
node cli.mjs inspect <original.zip>
node cli.mjs proof-corel <original.zip> --out <Motivprobe.pdf>
node --test tests/studio.test.mjs tests/f02-orders.test.mjs tests/corel-catalog.test.mjs
node tests/check-slate-profile.mjs <schiefer-tafeln.json> <preise-chris-20261102.json> <schiefer-zubehoer.json>
~~~

Für die Bildgegenprobe benötigt die Prüfumgebung Pillow, pypdfium2 und das Node-Modul sharp. Der Vergleich rendert die sechs Originalpfade unabhängig aus der Archiv-SVG und prüft sie gegen die SVG-/PDF-Motivprobe. Zwei Rasterer zeichnen geglättete Kanten unterschiedlich. Ausgewertet werden exakte SVG-Pixel sowie Außenkanten und Flächenüberdeckung im PDF.

~~~sh
python tests/compare-corel-motif-proof.py <Originalordner/design.json>
~~~

Die optionale Windows-Schriftprobe liest die Dateien privat und gibt pro Schrift Prüfsumme und Zeichenzahl aus.

~~~powershell
$fonts = @{Centaur='C:/Windows/Fonts/CENTAUR.TTF'; Georgia='C:/Windows/Fonts/georgia.ttf'; Stylish='<Katalogordner>/Stylish.otf'}
./tests/corel-original-outlines.ps1 -DesignJson '<Originalordner>/design.json' -FontFiles $fonts
~~~
