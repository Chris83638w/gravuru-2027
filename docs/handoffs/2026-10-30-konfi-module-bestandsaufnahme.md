# Bestandsaufnahme: gemeinsamer Konfigurator und Ausführungen je Produktlinie

Stand: 30.10.2026. Nur Quellprüfung und Dokumentation, kein Umbau.

Auftrag: [Issue #48, Nachricht 19](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6532012541), mit den Befunden aus [Nachricht 16](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6529178973) und den späteren Mustern aus [17](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6531164256)/[18](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6531322966).

Geprüfte Anwendung: **261532ef314bad494a53467613fed61bd71153cf**, Kopf von [PR #77](https://github.com/Chris83638w/gravuru-2027/pull/77). Der Anwendungscode entspricht dem zuvor freigegebenen Masterstand. Aktuelle Schiefer-Excel aus **main 59f2f831f4939e19396f3c5a4b1007b0f362b294** separat gelesen. PR #77 ist beim Abgleich offen, PR #72 weiterhin Entwurf. Keine Aussage über einen neuen Live- oder Volltestlauf.

## Ergebnis für Chris

Ein gemeinsamer Master mit unterschiedlichen Ausführungen ist auf der vorhandenen Grundlage möglich. Viele Bausteine existieren bereits. Es fehlt vor allem die vollständige Verbindung zwischen Excel, Produktfamilie und den einschaltbaren Funktionen.

Chris' Nachtrag im Chat: **„wir können die aber auch nach und nach hochladen“**. Deshalb je Produktlinie die Excel-Vorgaben und Bilder nachreichen, den betreffenden Profilstand prüfen und später einzeln freigeben. Die erste Linie muss nicht auf vollständige Unterlagen aller anderen Linien warten. Das Hochladen von Unterlagen ist noch keine Installation im Shop.

Die abgenommene Oberfläche bleibt der Master. Vorhandene Produkt-, Familien-, Design- und Profilkennungen sowie veröffentlichte Revisionen bleiben bestehen. Neue Bezeichnungen wie „KONFI-MASTER-001“ sind nicht als beschlossene Kennungen anzulegen.

## Vorhandene Datenkette

`scripts/family-excel.py` liest die Familien-Stammdaten. Familien und Linien im Katalog liefern über `familyProductConfig` und `katalog-convert.mjs` den Produktstand. Dessen vorhandene Konfiguration wird vom gemeinsamen Vertrag geprüft und von Oberfläche, Preisberechnung und Bestellstrecke verwendet.

Diese Kette erweitern. Keine zweite Profildatei mit abweichenden Preisen oder Bohrbildern daneben einführen. Die unten genannten neuen Angaben sind eine **Feldbedarfs-Liste**, noch kein freigegebenes neues Schema.

## Bausteine und fehlende Angaben

| Baustein | Heute im Master vorhanden | Profil-/Excel-Bedarf und verbleibende Arbeit |
| --- | --- | --- |
| **Kern** | `build.mjs`, `ux.mjs`, `adapter.mjs`, `contract.mjs`, `commerce.mjs`; gemeinsame Vorschau, Text, Motive, Ebenen, Entwürfe und Warenkorb. Produktbindung, Profilkennung und feste Revision sind Pflicht. `textRules`, `motifCharge`, Elementrechte existieren. | Bestehende Kennungen und Preis-/Geometrieverträge weiterverwenden. Keine Kopie der Oberfläche pro Linie. Excel hat noch keine durchgängige Zuordnung für Text- und Motivregeln; aktuelle Masterregel erhalten. |
| **Größe und Form** | Familien: `groups`, `sizes`, Radien, Breite/Höhe, Grundpreis, Gewicht, erlaubte Befestigungen. Allgemeine Geometrie und Konturen sind vorhanden. `steel-formats.mjs` ist ein eigener Edelstahlweg. | Blätter **Größen/Befestigungen** nutzen. Formatwechsel zur Wiederverwendung aus dem Edelstahlweg lösen, ohne feste Bohrbilder/Konturen zu skalieren. Skalierbare Reihen ausdrücklich zuordnen; bloße ähnliche Maße sind keine Freigabe. |
| **Befestigung** | `mountingRules`, Auswahl `mounting`, berechnete oder feste Lochmitten, Schrauben-/Abstandshaltervorschau und Aufpreise. | Lage, Anzahl, Durchmesser, Lochmitten/Randabstand, Beschlag und erlaubte Größen aus den Quellen. Kopfmaße und andere geometrische Beschlagdaten müssen eindeutig zugeordnet sein. Nichts aus einer anderen Produktlinie übernehmen. |
| **Zubehör** | Familien-`options` kennt Zubehör, Varianten und Mehrfachauswahl. `optionFields` unterstützt Text, Datum, Auswahl und Checkbox mit Bedingungen. Einzelauswahlen werden bereits angezeigt/berechnet. | **Lücke:** `familyOptionGroups` übernimmt nur `selection === 'single'`; Mehrfachgruppen fallen dort heraus. Für Ständer und Spray/Silikon Auswahlregeln, gegebenenfalls Menge sowie Artikel-/SKU-Zuordnung durchgängig klären. Eine Checkbox ist nicht automatisch eine vollständige Zubehörbestellung mit Bestand und Versand. |
| **Farbe und Rahmen** | Einfache Familienoptionen; bedingte Abstandshalterfarbe. Funkklingelrahmen/-farben in `doorbell-selection.mjs`; Acryl besitzt weitere eigene Darstellung. | Bestehende Optionen und `visibleIf` nutzen. Rahmengeometrie und Materialfarben nicht allein aus beliebigen Farbnamen ableiten. Nachtrag: Chris hat Originalbilder für Edelstahl, Gold, Weiß, Bronze und Schwarz geliefert; konkrete Zuordnung je Produktlinie in Excel abgleichen. |
| **Format und Position** | `config.doorbell` enthält Modell, Formatprofile, Rahmen und Standard-/Gegenposition. `nativeDoorbellConfig` prüft diese Kombinationen gegen reale Geometrie. | Modellkennung, erlaubte Formate/Positionen, Geräteausschnitt und Plattenaufbau müssen referenziert werden. Dafür hat die Familien-Excel noch keinen vollständigen Importweg. Mechanische Regeln bleiben modellbezogen. |
| **Foto-Upload** | Upload, Vorschau, Bearbeiten, Freistellen, Medienbindung; `photo.enabled`, `includedCount`, `extraPriceCents`. Familien speichern bisher nur Anzahl, Zusatzpreis und Notiz. | Excel-Spalten für ausdrückliches Mit/Ohne und Preisregeln fehlen. Neues Foto auf einem Design ohne Fotofeld ist bei importierten Designs derzeit gesperrt. Inklusive-Foto-Regel ist global je Konfiguration, nicht je Design. Beides vor Muster 17 ergänzen. |
| **Logo-Upload** | `logo.enabled/vectorUpload/extraPriceCents`, SVG-Prüfung und schwarze Gravurfassung mit Bestätigung. Bestehender Vektorlogo-Vertrag: 12,99 EUR. | Familien-Schema und Excel haben noch kein Logo-Feld. Der Vektorweg lässt derzeit nur Edelstahlgravur **ohne Foto-Upload** zu. Foto plus Vektorlogo und andere Oberflächen brauchen einen gemeinsam geprüften Vertrag; nicht nur zwei Schalter setzen. |
| **Rückseite** | `surfaces.mjs`: Vorder-/Rückseite, Aufpreis, Spiegelung, getrennte Ausgabe. Excel-Felder sind vorhanden. | Vorhandene Felder weiterverwenden. Unterschiedliche Verfahren auf Vorder-/Rückseite sind im Vertrag derzeit ausdrücklich ausgeschlossen. Acrylgravur von hinten ist nicht automatisch eine zweite gestaltbare Seite. |
| **Mengenstaffel** | `quantity-tiers.mjs`, Familien-/Größenstaffel, Excel **Staffel**, Rabatt oder Stückpreis. Bestehende Bestellverträge kennen auch `quantityTierScope`. | Bestehende Daten nutzen. Geltungsbereich des Rabatts einschließlich Optionen/Uploads unverändert aus dem jeweiligen Produktvertrag übernehmen, keine neue pauschale Regel. |
| **Materialvorschau** | `material-surface.mjs`, Materialressourcen, Konturbeschnitt, Szene; `process-profiles.mjs` liefert Verfahren/Werkzeuge. | Material, Variante, Stärke, Verfahren sind in Excel vorhanden. Bild-/Ressourcenreferenzen und Oberfläche je Modul brauchen eine eindeutige Zuordnung. Kein Material oder Verfahren aus einem Produktfoto erraten. |

Quellbezüge: [Vertrag](../../app/configurator/variant-m/contract.mjs), [Familienmodell](../../app/workshop/product-families.mjs), [Excel-Werkzeug](../../scripts/family-excel.py), [Importkonverter](../../app/workshop/katalog-convert.mjs), [Uploadregeln](../../app/configurator/variant-m/ux-model.mjs), [Vektorlogo](../../app/configurator/variant-m/logo-upload.mjs), [Funkklingel-Auswahl](../../app/configurator/variant-m/doorbell-selection.mjs), [Rückseiten](../../app/configurator/variant-m/surfaces.mjs).

## Sonderwege, die beim schrittweisen Ausbau erhalten werden müssen

- **Acryl:** `config.acrylic` sowie `variant-m/acrylic-product.mjs` verbinden feste Größen, Sockel, Wandhalterung, Einstecktiefe, Skalierung und eine eigene Preisstruktur. Die Fotobehandlung ersetzt dort das vorhandene Foto. Dieser Weg ist nicht allein eine allgemeine Zubehörliste. Seine Sockel, Farben und Preise sind keine Vorgaben für Gedenktafeln.
- **Edelstahlformate:** `config.steelFormats` verlangt passende Proportionen. Konturen und bestimmte feste Bohrbilder sind ausgenommen. Beim Herauslösen müssen diese Grenzen und Originalmaße erhalten bleiben.
- **Funkklingeln:** `config.doorbell` berücksichtigt Geräteausschnitt, Plattenaufbau, Rahmen und Position. Ein mechanischer Plattenkonflikt darf nicht mit dem erlaubten Überdecken eines Loches durch gedruckte/gravierte Gestaltung verwechselt werden.
- **Schiefer-Adapter:** `app/workshop/slate-product.mjs` lässt heute nur rechteckige, lokale Prüfprodukte und genau eine Optionsgruppe `mounting` zu; vollständige Centpreise werden verlangt. Ein Muster mit mehreren Zubehörgruppen und offenen Preisen passt nicht unverändert durch diesen Adapter.
- **Familienadapter:** `familyProductConfig` setzt zunächst Foto/Logo aus. `katalog-convert.mjs:441` aktiviert Foto anschließend, wenn importierte Vorlagen Fotofelder besitzen und das Verfahren es zulässt. Die Entscheidung wird damit heute teilweise aus den Vorlagen abgeleitet statt vollständig aus einer ausdrücklichen Excel-Freigabe.
- **Foto/Logo:** `ux-model.mjs:5–8` sperrt Fotos bei importierten Vorlagen ohne Fotofeld. `uploadQuote` bekommt die Inklusivregel aus der Produktkonfiguration und unterscheidet nicht automatisch nach der gewählten Vorlage. `contract.mjs:39/83` koppelt Vektorlogo zusätzlich an Edelstahlgravur, 12,99 EUR und ausgeschalteten Fotoupload.
- **Verfahrensprüfung:** `process-profiles.mjs` führt auch bei Edelstahlgravur das allgemeine Werkzeug `photo`. Das ist keine fachliche Freigabe für Edelstahl-Fotogravur. Chris' ausdrückliches Verbot muss beim künftigen Foto-/Logo-Profil berücksichtigt bleiben.

## Abgleich mit der Excel

Der bestehende Rundlauf hat die sichtbaren Blätter **Materialien, Familien, Größen, Befestigungen, Optionen, Staffel, Lesen**. Vorhandene Konturen werden zusätzlich im verborgenen Blatt **_Konturgeometrie** in verlustlosen JSON-Teilen mit `outlinePath` und `holesMm` gesichert und wieder eingelesen. Fehlen diese Originaldaten bei einer Kontur, bricht der Import ab. **Diesen bereits vorhandenen Schutz erhalten, nicht neu bauen.**

Bereits übertragbar: Material/Verfahren, Abmessungen/Radien, Preis/Gewicht, Befestigungszuordnung, einfache Optionen, Bedingungen, Zusatzfelder, Staffel und Rückseite. Noch nicht vollständig übertragbar:

1. Foto ausdrücklich mit/ohne; Inklusivfoto je Design bzw. eindeutiger Verweis auf dessen Regel; Preis neues Foto und weiteres Foto.
2. Logo ausdrücklich mit/ohne; Vektorverfahren, Aufpreis und passende Oberfläche.
3. Text-/Motivpolitik des Masters sowie deren Zuordnung, ohne historische Revisionen umzuschreiben.
4. Mehrfachzubehör vom Excel-Feld bis zu Auswahl, Preis und Bestellung; benötigte Artikelkennung und Mengen-/Kombinationsregeln.
5. Modell-/Geräteausschnitt, Rahmen-/Materialressourcen und die Zuordnung zu Ausführungen.

Der Import baut Familien aus den bekannten Spalten neu auf. Ein nicht abgebildetes Familienfeld wird nicht allgemein durch einen beliebigen „Restdaten“-Mechanismus erhalten. Bei einer Erweiterung ist daher auch der Export/Import-Rundlauf vorhandener Fotoangaben zu berücksichtigen. Ein Feld nur in Excel hinzuzufügen reicht nicht.

### Aktuelle Schiefer-Zeichnungsübersicht

[Original auf main 59f2f83](https://github.com/Chris83638w/gravuru-2027/blob/59f2f831f4939e19396f3c5a4b1007b0f362b294/docs/handoffs/design-start-mika/schiefer/Schiefer-Gedenktafeln-Groessen-2026-10-29.xlsx) gelesen, unverändert:

- Vier Blätter: **Größen & Optionen, Optionen, Skalierbare Reihen, Offene Fragen**. Das ist eine fachliche Übersicht, noch nicht das oben beschriebene Importformat mit Familien-/Optionskennungen.
- **Optionen!F5/F6:** neue Aufpreise 5,90 EUR für zwei und 9,90 EUR für vier Abstandshalter.
- **Optionen!F8:** farbiges Zweierset zusätzlich 1,00 EUR, Viererset zusätzlich 2,00 EUR. Konkrete Farben sind in **D8** ausdrücklich offen.
- **Optionen!B3:C4:** Montagebohrungen Ø4 mm; für 22×14 ungefähr 17 mm Randabstand zur Lochmitte. **B5:** Abstandshalterbohrung Ø8 mm, Kopf 12 mm. Die endgültigen Lochmitten kommen aus der Zeichnung, nicht aus pauschalem Runden der Näherungsangaben.
- Leere neue Preiszellen sind keine 0-EUR-Freigabe. Die bisherigen Katalogpreise in Spalte E nicht unbemerkt als neu beschlossen behandeln.
- Das spätere Muster bleibt nach Nachricht 17/18 ohne Preisanzeige.

## Zubehörbilder von Chris, 30.10.2026

Während der Bestandsaufnahme geliefert und als unveränderte Referenzdateien aufgenommen:

| Referenz | Originalbild |
| --- | --- |
| Acrylglasständer klar | [Original](konfi-module-20261030/zubehoer/acrylstaender-klar.jpg) |
| Acrylglasständer schwarz | [Original](konfi-module-20261030/zubehoer/acrylstaender-schwarz.jpg) |
| Imprägnierspray „Gedenktafel Protector“, 60 ml | [Original](konfi-module-20261030/zubehoer/gedenktafel-protector.png) |

Originalnamen, Dateigrößen und SHA-256 stehen in [quellen.json](konfi-module-20261030/zubehoer/quellen.json). Die Kopien wurden gegen die drei gelieferten Originaldateien verglichen. Keine Bildbearbeitung oder Komprimierung.

Das Spray ist von Chris als **Imprägnierspray** benannt. Chris hat danach zusätzlich das Originalbild für **Silikonkleber** geliefert: beide als eigenes Zubehör führen. Aus den Bildern wurden keine Ständermaße, Tragfähigkeiten, Artikelkennungen oder Preise abgeleitet. Diese Angaben können mit der nächsten Produktlinien-Excel folgen.

### Bildnachtrag: Abstandshalter und Silikon

Neun neue Abstandshalterbilder: Produktansichten in Edelstahl, Gold, Weiß, Bronze und Schwarz sowie Draufsichten in Edelstahl, Gold, Weiß und Bronze. Chris erlaubt die Draufsichten für den Konfigurator. **Schwarz von oben fehlt ausdrücklich.** Dazu das Silikonbild, insgesamt zehn neue Originaldateien. Der erneut mitgeschickte schwarze Acrylständer ist per SHA-256 mit der bereits gespeicherten Datei identisch und wurde nicht doppelt abgelegt. [Bildübersicht und Verwendung](konfi-module-20261030/zubehoer/README.md). Keine Anwendung oder Live-Darstellung geändert.

## Befunde aus Nachricht 16 an der Quelle

| Befund | Ergebnis der Quellprüfung und nächster begrenzter Schritt |
| --- | --- |
| Gravurlinien werden schwarz gefüllt | Bestätigt: `katalog-convert.mjs:229` erhält Stroke, Fill-Rule und Opazität nur im Druckzweig, Gravur bekommt `fill=currentColor`. [PR #72](https://github.com/Chris83638w/gravuru-2027/pull/72) enthält die vorgesehene Korrektur und bleibt Entwurf (Kopf 78d3645). In späterem Fix gezielt übernehmen/abgleichen und D75/D76 prüfen; jetzt nicht gemerged. |
| Gestaltungsrand 2 statt 0 mm | `app/platform/sources/app/shared/models/design-content.mjs:42` hat den Rückfall `safeMarginMm ?? 2`. Ein ausdrücklich gesetztes 0 wird bereits beachtet. Quelle/fachlichen Standard für Gravur beim Fix berichtigen; mechanische Funkklingel- und Acrylflächen nicht pauschal aufheben. |
| Bohrloch sperrt Gestaltung | Die allgemeine Konturprüfung hat die genannte Sperre weiterhin. **Präzisierung:** `contract.mjs:26` entfernt im normalen Kundenpfad die Löcher bereits vor der Prüfung. Deshalb kein Beleg dafür, dass alle Warenkorbpfade blockiert sind. Direkte Vorschau-/Import-/Konturaufrufe müssen gezielt vereinheitlicht werden; mechanische Plattenprüfung erhalten. |
| Randkorrektur rundet nach außen | `edge-clamp.mjs:32` rundet die korrigierten Koordinaten nachträglich auf 0,01 mm. Beim Fix die endgültigen Werte gegen dieselbe Geometrie prüfen. |
| Textregeln bei Designlink | `design-gallery-model.mjs:106` ruft `textLimits` ohne die Produktkonfiguration auf. **Aktuelle Mastervorgabe ist 80 Zeichen je Feld**, siehe `app/workshop/customer-ux-policy.mjs:8`. Eine Korrektur muss die tatsächliche Profilregel weiterreichen; nicht pauschal die ältere 50-Zeichen-Angabe einsetzen. |
| Entwurfstitel | `account-drafts.mjs:61` sendet bei leerer Eingabe den Profilnamen. Beim Aktualisieren vorhandenen Titel erhalten, sofern keine ausdrückliche Umbenennung vorliegt. |
| Listener ohne Abbau | `workflow.mjs:56` installiert einen anonymen Listener am Dokument ohne dortigen Abbau. Beim Fix an den Lebenszyklus des Editors binden. |

Zusätzlicher Quellhinweis für die Foto-Erweiterung: `photo-upload.mjs:29–30/103` kann aus dem Tastaturpfad eine Trefferprüfung ohne endliche Bildschirmkoordinaten aufrufen. Gezielte Tastaturprüfung vormerken; in diesem Paket nicht geändert oder im Browser reproduziert.

## Fachlich festhalten und offenlassen

- Bestehender Master: zusätzliches/geändertes Motiv **1,69 EUR**, Vorlagenmotiv inklusive; Vektorlogo **12,99 EUR je Logo**. Kein Zurücksetzen durch die allgemeine Formulierung „Logo-Preis offen“.
- Nachricht 17: **neues Foto 9,99 EUR**. Preis für ein weiteres Foto eines Foto-Designs laut Claude noch zwischen bisher 8,99 und 9,99 EUR offen. Eine globale Inklusivzahl bildet die verlangte Unterscheidung noch nicht ab.
- Für neue Profile: Foto-/Logo-Freigabe je tatsächlich gestalteter Oberfläche und Verfahren. Keine Fotos auf Edelstahl gravieren.
- Neue Abstandshalterpreise sind belegt; Bildreferenzen für fünf Farben liegen jetzt vor. Zuordnung je Produktlinie, Zubehörpreise/-kennungen, exakte Ständermaße und Auswahlregeln sind aus den Produktvorgaben zu übernehmen, nicht aus den Fotos abzuleiten.
- Fehlende Angaben als offen führen. Vorhandene technische Null-/Erstauswahl-Rückfälle sind keine neue fachliche Entscheidung.
- Eingangs genannte Gedenktafel- und AOSU-Muster erst nach Chris' Entscheidung über den nächsten Schritt; lokal, ohne Preisanzeige.

## Empfohlene Reihenfolge zur Entscheidung

1. Befunde aus Nachricht 16 als kleine getrennte Korrekturen auf dem Master bearbeiten. Vorhandene PR-72-Lösung abgleichen, keine doppelte Entwicklung. Jeweils nur betroffene Prüfungen, danach gemeinsamer Abgleich.
2. Als ersten Ausbau Ausführungen/Befestigung/Zubehör durch die bestehende Familie und Excel führen. Einfache Optionen erhalten; Mehrfachauswahl und Bestellzuordnung vervollständigen.
3. Foto/Logo-Freigabe und Preisregeln zwischen Familie, Design, Import, Oberfläche und Server vereinheitlichen. Dafür sind die oben genannten offenen Entscheidungen relevant.
4. Erst danach Schiefer- und AOSU-Muster aus Nachricht 17. Die nächste Produktlinie kann später mit eigenen Unterlagen folgen. Oberfläche, bestehende Revisionen und funktionierende Bestellverträge bleiben erhalten.
5. Veröffentlichung jedes geprüften Profilstands separat. Der vorliegende Bestandsbericht löst weder Import noch Installation aus.

## Prüfstand und Übergabegrenze

Gelesen wurden die genannten Quelldateien, Issue-Nachrichten 16–19, die PR-Stände sowie die vier Blätter/Struktur und die Optionswerte der Excel auf 59f2f83. Die drei Zubehörbilder wurden unverändert kopiert und jeweils per SHA-256 gegen das Original geprüft.

**Keine Anwendung geändert, kein Import, keine Migration, kein Merge, kein Deploy, keine neue Browserabnahme.** Keine Funktionstests erneut ausgeführt: dieses Paket enthält nur Bericht, Status und Bildreferenzen.

Claude meldet in Nachricht 16 für 261532e einen Linux-Vollauf mit **1935 Tests: 1919 bestanden, 16 wegen fehlender Logo-Python-Pakete fehlgeschlagen**; nach deren Installation betroffene Dateien **53/53**. Das ist kein neu ausgeführter einzelner Vollauf 1935/1935. Den aktuellen Paketstand auf Plesk habe ich in dieser lesenden Repository-Inventur nicht erneut geprüft.

Nächster Schritt: Chris bestimmt den ersten begrenzten Ausbau/Fix. Claude erhält diesen Bericht direkt in Issue #48; keine manuelle Kopierübergabe nötig.
