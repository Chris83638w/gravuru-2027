# Gravuru 2027 – vollständige Projektübergabe zur unabhängigen Prüfung

Stand: **12.10.2026**. Erstellt von Codex für Mikail und zur Weitergabe an Claude. Diese Zusammenstellung beschreibt Ziele, Entscheidungen, Umsetzung, Belege und Grenzen. Sie ist **keine unabhängige Prüfung** und keine pauschale Fertigmeldung.

## 1. Die wichtigste Einordnung

Wir bauen eine eigenständige Shopify-Werkstatt für personalisierte Gravur- und Druckprodukte. Der Händler soll komplette Produkte und Designs selbst erstellen, ändern, gruppieren und anschließend mit einer verlässlichen Kunden-, Bestell- und Fertigungsstrecke verbinden können.

Die neue **Händlerwerkstatt ist veröffentlicht** und enthält umfangreiche Bearbeitungs-, Import-, Vorlagen-, Profil-, Stapel- und KI-Funktionen. Für eine bestimmte Schiefer-Gedenktafel ist eine echte Shopify-Testbestellung einschließlich Foto und signiertem Bestelleingang belegt. Das bedeutet noch **keine vollständig abgenommene öffentliche Verkaufsstrecke für alle Produkte**. Insbesondere allgemeine Verkaufsbindung, Produktmedienübertragung, AOSU-Fertigung und physische Maschinenabnahmen bleiben offen.

Der Nutzer hat wiederholt Fehler in der tatsächlichen Bedienung gemeldet, obwohl vorherige technische Prüfungen bestanden waren. Diese Rückmeldungen sind Teil des Iststands: Synthetische Browserprüfungen haben die reale Shopify-Nutzung nicht vollständig abgedeckt. Die jüngsten Korrekturen sind belegt; eine persönliche Abnahme aller Abläufe durch den Nutzer steht weiterhin aus.

## 2. Welcher Stand geprüft werden soll

| Gegenstand | Tatsächlich festgestellter Stand |
| --- | --- |
| Repository | `https://github.com/Chris83638w/gravuru-2027` |
| Ausgangsbasis | `a2af162edd3a1dfa2106212c9f4b76c7ae351b70`; weiterhin Vorfahr des aktuellen Stands |
| Vollständiger Quell-/Berichtsstand vor dieser Übergabe | **`9d388e3e9f8e7cb5aa63e7a50d163cf1ca7d5e3a`** |
| Branch dieses Stands | `task/steel-ink-product-tabs-20261011` |
| Sicherungsbranches | `backup/account-recovery-20261010` und `task/full-backup-install-20261010`; am 12.10. erneut auf genau `9d388e3` bestätigt |
| Tatsächlich installierter Anwendungscode | **`7a168bc66adc9718bc9b0fefad97c338e546c57d`**; spätere Commits ergänzen Paket und Nachweise |
| Installierte Paketversion | **`0.1.0-recovery.20261010+7a168bc66adc`** |
| Achtung: `main` | Am 12.10. weiterhin `3ff2c2f8e7cb2565f60bd016f73a99ff6520152b`; **nicht die aktuelle Anwendung** |
| Neue Händleradresse | `https://app-2027.gravuru-designwerkstatt.de` |
| Öffnen als Händler | Shopify → Apps → Gravuru Konfigurator; Shop `gravuru-design` |
| Cloud-Arbeitsverzeichnis | `/workspace`; aktive Arbeitskopie `/workspace/gravuru-restored` |
| Laufzeit dieser Dokumentationsarbeit | Verwaltete Cloud, Anbieterkennung `cloud`, laufend/verbunden; Debian 13.6, Node 24.19.0, Python 3.12.14. Daraus folgt keine bestimmte AWS-/Azure-/GCP-Zuordnung. |
| Serverlaufzeit laut letztem Betriebsbeleg | Eigener Plesk-Händlerbereich, Node 24.21 und private Python-3.11-Umgebung |
| Änderungen beim Einstieg | Arbeitsbaum sauber; 100 zusätzliche erreichbare Commits gegenüber der Ausgangsbasis, einschließlich Sicherungs-/Dokumentationshistorie |
| Diese Übergabe | Eigener Branch `task/claude-overview-20261012`; nur Dokumentation und Prüfunterlagen, keine Änderung der Anwendung oder Live-Daten |

**Heute neu geprüft:** Am 12.10., 09:51 UTC, bestanden 17 lesende HTTPS-Prüfungen: HTML mit Hauptprodukt-/Design-Tabs erreichbar; zwölf JS-/CSS-Dateien bytegleich zur Arbeitskopie; vier private APIs antworten anonym korrekt mit JSON/401. GitHub-Branchspitzen und SHA-256 des Installationspakets erneut geprüft. Siehe [heutiger Nachweis](overview-20261012-checks.json).

**Zeitliche Grenze:** Der jüngste umfassende Server-/Datenbankbeleg stammt vom 11.10., etwa 19:46 UTC. Heutige HTTP-Prüfungen bestätigen Auslieferung und Zugangssperren, aber nicht sämtliche internen Serverdateien, aktuellen Datenbankinhalte oder einen echten angemeldeten Klickablauf. Keine erneuten bezahlten KI-Aufrufe, Shopänderungen oder Bestellungen für diese Übergabe.

## 3. Was wir vorhaben und verbindlich vereinbart haben

### Gesamtziel und Begriffe

- **Produkt/Hauptprodukt:** Rohling, Material, Form, Maße, zulässige Ausführungen, Befestigung, Zubehör, Preise und Darstellung.
- **Design:** die vollständige Gestaltung eines Schilds/Acrylglases mit Texten, Fotos und Motiven. Ein Produkt kann mehrere Designs enthalten.
- **Motiv:** ein einzelnes grafisches Element innerhalb eines Designs, nicht das ganze Produktlayout.
- **Mastervorlage:** wiederverwendbare Produktgrundlage. Eine daraus angelegte Produktkopie soll unabhängig bearbeitbar sein.
- **Kundenansicht:** bietet ausschließlich die vom Händler freigegebenen Änderungen an. Händlerrechte und Kundenrechte sind getrennt.
- **Nur 2D im aktuellen Umfang.** AR wurde ausdrücklich vertagt.

### Gewünschter vollständiger Ablauf

1. Produkt neu anlegen oder aus Master übernehmen; stabile Konfigurations-ID vergeben.
2. Material/Rohling, Form, Grundmaße, Größen, Zubehör, Befestigungen und echte Preise festlegen.
3. Eines oder mehrere Designs anlegen, PDF/SVG importieren oder KI-Vorschlag erstellen.
4. Eigene Texte, Motive und echte Musterfotos bearbeiten; Schriften/Designauswahl über Profile gruppieren.
5. Kundenrechte pro Element festlegen; Vorschau und zulässige Varianten prüfen.
6. Version speichern; mit Shopify-Produkt und Varianten verbinden; Veröffentlichung ausdrücklich erkennbar machen.
7. Kunde gestaltet, ersetzt Musterfoto und bestellt zum serverseitig geprüften Preis.
8. Bestellung bewahrt den exakten damaligen Stand einschließlich Originalmedien und Profilrevisionen.
9. Aus diesem Stand passende Druck-/Gravurdateien erzeugen; technische und reale Fertigungsabnahme trennen.

Einzelanlage, Stapelimport und KI sollen dieselben Produktregeln nutzen. Maße werden in **mm**, Preise in **ganzen Cent** geführt. Spätere Änderungen dürfen alte Bestellungen nicht verändern.

### Besonders wichtige Nutzervorgaben

- Keine festgebackenen Muster: komplette Neugestaltung mit eigenen Motiven und Texten muss möglich sein.
- PDF-Import soll proportional in die echte Schildkontur passen und soweit die Quelldatei es erlaubt getrennt bearbeitbare Bestandteile liefern.
- Auswahl, Verschieben, Größenänderung und Hilfslinien müssen sichtbar und bedienbar sein.
- Kein unerklärter dekorativer Rahmen bei Auswahl. Auswahlgriffe sind Bedienhilfen und gehören nie ins Produkt oder in die Fertigungsdatei.
- Rohlingbild und Szenenhintergrund austauschbar; Schildgröße und Form verständlich erreichbar.
- Ein **echtes Musterfoto** mit Hinweis „Hier eigenes Foto hochladen“, wie beim Acrylschild; keine leere weiße Uploadbox als Ersatz. Original-Fotoausschnitt/-maske erhalten.
- Schriften selbst hochladen und zu Gruppen/Profilen zusammenstellen.
- Vorhandene fertige Muster übernehmen: Acryl „Unser Anfang“, AOSU/Labrador und Edelstahl/Heimathafen einschließlich Leuchtturm.
- Katalog muss auch bei Tausenden Produkten strukturiert nutzbar sein.
- Edelstahlgravur schwarz; kein versteckter pauschaler Importabstand. Hauptprodukt und Designs als getrennte Tabs.
- Erreichbaren Entwicklungsstand vollständig sichern; private Daten und Geheimnisse außerhalb GitHub.
- Bestehende alte Kundenwerkstatt/Theme erhalten. Später ausdrücklich freigegeben wurde die Veröffentlichung der neuen Händlerwerkstatt und die weitere Integration. Daraus folgt keine automatische Freigabe beliebiger Bestellungen zur Fertigung.

## 4. Wie es technisch umgesetzt ist

### Architektur

Die aktive Anwendung verwendet vorhandene geeignete Teile des Kundenkonfigurators weiter und ergänzt neue Werkstattmodule. Sie ist keine vollständig neu geschriebene React-/Next-Anwendung.

| Bereich | Umsetzung und wichtige Quellen |
| --- | --- |
| Browseroberfläche | HTML/CSS und JavaScript-ES-Module unter `app/workshop/ui/`; Produkteditor, Katalog, Profile, Import, Bestellungen und KI als eigene Module |
| Kundenkonfigurator | `app/configurator/variant-m/`; bestehende Werkzeuge und Vorschau weiterverwendet, produktabhängig erweitert |
| Gemeinsame Darstellung | SVG-/Produktmodelle unter `app/platform/sources/app/shared/models/`; technische Darstellung und zusätzliche Szene getrennt |
| Backend | Node ≥24, HTTP-Routen in `app/workshop/http.mjs`, Produktauflösung und Fachmodule in `app/workshop/` |
| Persistenz | Drei private SQLite-Datenbanken: `workshop.sqlite`, `profiles.sqlite`, `design-assets.sqlite`; u. a. Produkte, Revisionen, Entwürfe, Jobs, Profile und unveränderliche Originalressourcen |
| PDF/Bilder/Konturen/Fonts | Begrenzte Python-Unterprozesse, u. a. PyMuPDF, Pillow, CairoSVG, fontTools und Geometriewerkzeuge; Abhängigkeiten in den jeweiligen `requirements-*.txt` |
| Shopify-Händlerzugang | App Bridge, kurzlebige Sitzungstoken, serverseitige Prüfung, zusätzlicher Host-/Origin-/CSRF-Schutz; private APIs ohne Anmeldung gesperrt |
| Shopify-Integration | Getrennte Module für Entwurfsübertragung, Variantenbindung, Warenkorb, Übergabejournal und signierten Bestelleingang |
| KI | Eigene serverseitige OpenAI-Adapter; dauerhafte Aufträge, Budgetreservierung, geprüfte Vorschläge, ausdrückliche Übernahme |
| Installation | Versionierte ZIPs mit Manifest/Prüfsummen; eigenes Staging, Build, Konfigurationsprüfung und atomarer Wechsel des Händler-Einstiegs über `ops/plesk/` |

Es gibt weiterhin verschiedene Produktpfade: native Acryl-/Schiefer-/Edelstahlmodelle und importierte freie Formprodukte. Gemeinsame Regeln bedeuten daher nicht, dass jede Bearbeitungsfunktion für jeden Produkttyp identisch ist. Gerade diese Übergänge sollte Claude prüfen.

### Versions- und Datenprinzip

- Produkte besitzen stabile IDs und fortgeschriebene Revisionen. Wiederherstellen erzeugt einen neuen Stand.
- Speichern prüft die erwartete Revision; parallele Änderungen sollen als Konflikt sichtbar werden.
- Originaldateien, abgeleitete Vorschauen und bearbeitete Produktstände werden getrennt geführt.
- Gesicherte Kunden-/Bestellstände halten Produkt-, Medien- und Profilversionen fest.
- Shopify-Übertragungen besitzen ein Journal gegen doppelte Anlage bei Wiederholung oder verlorener Antwort.
- Der aktuelle Katalogindex ist abgeleitet und soll Blättern ohne Laden sämtlicher Bild-/Schriftpakete ermöglichen.
- Der Händlerdienst läuft mit exklusiver Datensperre. Die derzeitige Betriebsform ist kein horizontal skaliertes Mehrprozesssystem.

## 5. Funktionsstand: was umgesetzt wurde – und wie weit

„Umgesetzt“ bezeichnet vorhandenen Code, nicht automatisch vollständige Live-Abnahme. Historische Belege gelten nur für den darin genannten Umfang.

| Bereich | Vorhandene Umsetzung | Stand / Grenze |
| --- | --- | --- |
| Produkte und Master | Anlegen, öffnen, kopieren, aus Master erstellen, speichern, Revisionen, archivieren; stabile IDs | In Händlerwerkstatt vorhanden; konkurrierende Änderungen und Wiederöffnung technisch geprüft |
| Katalogstruktur | Liste/Karten, Suche, Material/Kategorie, Sortierung, 24/48/96 pro Seite, gemeinsame Kategoriezuweisung | Mit 3.000 synthetischen Produkten geprüft; keine Lastabnahme mit Tausenden realen großen PDFs |
| Produkt-/Designtabs | Hauptprodukt mit Einstellungen/Verknüpfungen; Designs als suchbares, umbrechendes Raster; getrennte Aktionen für Import/eigenes Design/KI | Seit letztem Release live; Tastatur, Mobilansicht und Erhalt ungespeicherter Änderungen im lokalen Browser geprüft |
| Freies Gestalten | Texte/Motive/Fotofelder hinzufügen, auswählen, verschieben, skalieren, entfernen, Reihenfolge ändern; numerische Positionierung und Rückgängig/Wiederholen | Native Gestaltung vorhanden; importierte Dateien benötigen je nach Inhalt vorherige Aufbereitung |
| Hilfslinien | Schildmitte/-rand sowie Kanten/Mitten anderer Elemente; Einrasten, Schalter, Alt zum freien Verschieben | In jüngstem Browserablauf geprüft; nur beim Ziehen, nicht in Exporten |
| Kundenrechte | Inhalt, Farbe, Fotoersatz, Position, Größe und Löschen getrennt freigeben | Händlerbearbeitung soll nicht durch Kundenbeschränkungen blockiert werden; serverseitige Prüfung vorhanden |
| PDF-/SVG-Designimport | Seitenwahl, Vorschau/Plan, proportionale Einpassung, Originalerhalt, gezielter Designersatz; Aufbereitung in Bestandteile | Kein beliebiges PDF wird automatisch zu perfektem semantischem Text-/Fotolayout |
| PDF-Texte | Schriftkonturen originalgetreu erhalten; gezielte Umwandlung in bearbeitbaren Werkstatttext mit vorhandener vollständiger Schrift | Outlines enthalten nicht automatisch eine komplette Schrift; Texte in flachen Bildern brauchen eigene Bearbeitung |
| Fotofelder | Echtes Musterfoto, sichtbarer Uploadhinweis, Fotoersatz/Ausschnitt; PDF-Masken und Transformationen erhalten | Schiefer-Kreuzmaske in Händler, Kundenansicht und technischem Paket geprüft; fremde nicht unterstützte Masken werden abgewiesen |
| Schriften und Gruppen | Verwaltung → Profile; TTF/OTF-Upload, Auswahl und Reihenfolge im Schriftprofil, Zuordnung zu Produkt/Kategorie/Standard | Fester Schriftschnitt, bis 8 MB; vollständiges lateinisches Alphabet/Ziffern und 1–10.000 Unicode-Zeichen verlangt. Variable Fonts werden abgewiesen. Nutzungsrechte separat klären. |
| Weitere Profile | Motive, Farben, Bestseller; Vererben/Überschreiben/bewusst leer; Auswirkungsprüfung und Revisionen | Vorhanden; nicht mit einem fertigen universellen Dateimanagementsystem gleichsetzen |
| Rohling und Szene | Getrennter Austausch des Material-/Rohlingbilds und des Szenenbilds; Standard wiederherstellbar | Ein neues Bild allein ändert keine technische Kontur oder reale Materialstärke |
| Edelstahlgröße/-form | Einlagiger Stahl: Grundmaße, Rechteck, Rundung, Oval/Kreis; ganze Designs passend skalieren | Zusätzliche Kundenformate derzeit gleiche Proportionen und ausdrücklich eingetragene Preise; festes Bohrbild braucht gesonderte Geometriefreigabe |
| Freie Formprodukte | Separate Konturbibliothek aus SVG/einseitigem Vektor-PDF, Außen-/Innenkonturen, mm-Geometrie, Formprodukt, Designs/Kundenfelder und technische Ausgabe | Eigener Produktpfad mit Grenzen; nicht gleichbedeutend mit beliebiger Formbearbeitung jedes existierenden AOSU-/Acrylprodukts |
| Schwarze Stahlgravur | Reine importierte Vektorgrafik wird im Stahlprofil schwarz dargestellt; Weiß bleibt Aussparung, Original unverändert | Raster-/gemischte Quellen behalten Tonwerte; Bildschirmprofil ist keine Laserparameter-Freigabe |
| Importabstand Stahl | Sichtbarer Randabstand, Vorgabe 0 mm; bestehende Gestaltung bewusst über „Ohne Rand neu einpassen“ anpassen | Eigene PDF-Weißräume und Proportionen bleiben; echte Außenkonturprüfung bleibt aktiv. Bestehende Produkte nicht automatisch umgeschrieben. |
| Excel und Stapel | XLSX-Vorlagen, Varianten/Designzuordnung, Dateien/Ordner/ZIP, Quellenzuordnung, Prüfplan, gespeicherte Jobs, zeilenweise Fehler/Korrektur, Wiederaufnahme, Profilzuordnung | Technische und historische Browserbelege; Drive ist davon getrennt. Keine aktuelle echte 1.000-Produkt-Shopübertragung belegt. |
| Shopify-Entwürfe | Aus gespeichertem Stand Vorbereitung/Prüfung, journalgestützte Entwurfsanlage und Variantenabgleich | `draft-only` aktiviert; echte Anmeldung/lesende Produktabfrage geprüft. Allgemeine Neuanlage wurde im jüngsten Paket nicht durch echte Mutation abgenommen. |
| Shopify-Kauf | Begrenzter Händler-Testwarenkorb für ausdrücklich festgelegte Schieferrevision; Fotoaufpreis, Preisbindung, signierter Eingang | Echte Testbestellungen belegt, keine öffentliche universelle Verkaufsfreigabe |
| Bestell-/Ausgabeverwaltung | Gesicherte Stände, wiederholbare technische Ausgaben, Status-/Prüfvermerke; testbasierte Datei-/Erstattungslogik | Kundenkontoanschluss, allgemeine kaufgebundene Downloads und reale Betriebsabnahme nicht insgesamt abgeschlossen |
| Fertigung | SVG/PDF/PNG/Originale/Manifest/ZIP je unterstütztem Pfad; Druck-/Weiß-/Konturtrennung und Gravurprüfungen | Technische Prüfexporte vorhanden; reale Maschinen-/RIP-/ICC-Abnahme bleibt gesondert |
| KI einzeln | Native Layout-/Textänderung, neues Motiv, ausgewähltes Musterfoto bearbeiten; Vorschau und explizite Übernahme | Echte Text- und Bild-API-Antworten geprüft; keine automatische Veröffentlichung |
| KI stapelweise | Kompatible Produkte, serielle dauerhafte Warteschlange, Pause/Abbruch/Fortsetzen, Vergleich und Einzelübernahme | 100 synthetische Produkte mit 97 Entwürfen/3 Konflikten geprüft; kein realer bezahlter Großstapel |
| Google Drive | Anforderung und lokale Quellenabläufe vorbereitet | Eigene autorisierte Werkstatt-Anbindung und Quellordner weiterhin offen |
| AR | Zurückgestellt | Nicht Bestandteil des jetzigen Fertigstellungsumfangs |

## 6. Vorhandene Produkte und Originaltreue

Letzter vollständiger Datenbeleg vom 11.10.: **vier Produkte und drei Master**, insgesamt sieben Datensätze und 13 Revisionen. Spätere nicht gespeicherte Browseränderungen sind darin nicht enthalten.

| Muster | Tatsächlicher Stand |
| --- | --- |
| Acryl „Unser Anfang“ | Vorhandener Master und Produktkopie, jeweils Revision 1. Musterfoto, Texte und sechs Sockel übernommen. Zwei Größen: 150 × 200 mm / 14,99 EUR und 200 × 266,7 mm / 19,99 EUR; 3 mm Acryl. |
| Acryl-Zubehör | Kleine Sockel: Buche 8,99, Eiche 9,99, Nussbaum 10,99, klar 3,99, satiniert 4,99, flach Nussbaumoptik 5,99 EUR. Groß jeweils +1 EUR; ohne Sockel kein Aufschlag. Wandhalterung zusätzlich 5,99 EUR. 28 Kombinationen aus zwei Größen, sieben Sockelwahlen und Wandhalterung ja/nein. |
| Schiefer-Gedenktafel mit Foto | Produkt Revision 5; neun Preis-/Variantenbindungen für den begrenzten Testkauf. Originalfoto-Maske aus `GT-S-2_2.PDF`; bearbeitbare Texte, Fotofeld und Motiv. Frühere Revisionen erhalten. |
| Schrift der Gedenktafel | Nutzer entschied sich für eine vorhandene vollständige Werkstatt-Schrift. Cormorant Garamond ersetzt die nur 24 Zeichen umfassende Edwardian-PDF-Teilmenge für freie Texte. Das ist eine bewusste Abweichung vom ursprünglichen Schriftbild, keine identische Rekonstruktion. |
| AOSU-Klingelschild/Labrador | Master plus Produktkopie, Revision 1, 160 × 280 mm. Vier editierbare Elemente, Michroma, Klingelbild, vier Rahmen, zwei Acrylfarben, fünf Befestigungen; 40 Ausführungen, Basis 49,99 EUR plus Befestigung. Technischer zweilagiger Aufbau bleibt fest. |
| Edelstahl/Heimathafen | Master Revision 1; Produkt zuletzt Revision 3, 90 × 60 mm. Ursprünglich Leuchtturm- und Ankerlayout, danach Nutzeränderung/PDF-Import. Letzter geprüfter Produktstand enthält zwei Designs; im importierten Design neun Vektorelemente. Nicht automatisch wieder mit ursprünglichen Mustern überschreiben. |
| Charlotte-Groner-Stahlreferenz v4 | Originalabbildung separat vorhanden. Keine identische editierbare native Quelldatei gefunden. Referenzbild und native Muster sind ausdrücklich zu unterscheiden. |

**Keine pauschale Aussage „alles wie in den Vorlagen“.** Die bestätigten M01-/M02-Oberflächen dienten als Grundlage. Spätere Nutzervorgaben änderten Navigation, Katalog und Tabs. Reale Rohlingdarstellung, Licht, Schriftbild und jedes Design müssen weiterhin sichtbar am jeweiligen Original geprüft werden. Beispielkarten aus Mockups sind keine echten Produkte.

## 7. Gemeldete Fehler und zugehörige Korrekturen

| Nutzerbeobachtung | Bearbeitung / heutige Aussage |
| --- | --- |
| „Shopify-Anmeldung nicht verfügbar“, leere Produkte/Profile | App-Bridge-Kontext, Authentifizierungsfehler und Zeitabweichung behandelt; bedienbare Wiederverbindung ohne Verlust offener Gestaltung. Nutzer bestätigte danach angezeigte Produkte; 19 authentifizierte Serverzugriffe dokumentiert. Das ersetzt keine Gesamtprüfung aller Klickpfade. |
| Seite ohne Gestaltung/CSS | Fehlende statische Modulfreigaben in einem Browserlauf gefunden und behoben. Heute zwölf ausgelieferte JS-/CSS-Dateien auf Status, Inhalt und Quellgleichheit geprüft. Der einzelne Screenshot einer „Index“-Dateivorschau beweist für sich allein nicht die Ursache auf dem Livehost. |
| Dicker weißer Rahmen bei Auswahl | Auswahlbedienung überarbeitet; echte Auswahlgriffe/Maus/Touch geprüft. Bedienelemente werden nicht als Gravur-/Druckinhalt exportiert. |
| Elemente nicht auswählbar/verschiebbar | Händlergestaltung erweitert, Auswahlgriffe und Aufbereitung importierter Inhalte ergänzt; Kundenrechte getrennt. Native Einzelobjekte sind bearbeitbar; flache Bildpixel bleiben keine unabhängigen Objekte. |
| PDF nicht bearbeitbar | Aufbereitung standardmäßig angeboten; einzelne Vektor-/Foto-/Textbestandteile, gezielte Schriftumwandlung. Für strukturell ungeeignete Quellen bleibt manuelle Zuordnung nötig. |
| Foto fehlt / falsche Uploadbox / falscher Ausschnitt | Echtes Musterfoto mit lesbarem Hinweis, Fotoersatz und Erhalt der originalen Kreuz-/Fotomaske ergänzt und technisch geprüft. |
| Schieferplatte/Hintergrund nicht austauschbar | Rohling-/Szenenbildwechsel und Standardwiederherstellung ergänzt; Bild und technische Kontur bleiben getrennt. |
| Keine Schriften-/Gruppenverwaltung | TTF-/OTF-Upload unter Verwaltung → Profile; Schriftprofil erstellen, speichern und zuordnen. |
| Größen und Form beim Stahl fehlen | Grundmaße und Grundformen sowie zusätzliche proportionale Formate mit eigenen Preisen ergänzt. Zweilagiges AOSU separat behandeln. |
| Import „ragt über Gestaltungsfläche hinaus“ | Stahlimport verwendete einen unpassenden Acrylbereich; auf tatsächliche Stahlkontur korrigiert. Rechteck/Oval und erreichbare Originale geprüft. Die genaue Datei `GT1E86_1.PDF` ist nicht ausdrücklich verfügbar. |
| Ungewollter Sicherheitsrand | Für neuen Stahlimport explizit 0 mm als Vorgabe; bestehende Designs können bewusst neu eingepasst werden. Keine automatische Veränderung gespeicherter Nutzerdesigns. |
| Gravur grau statt schwarz | Rein vektorielle Stahlimporte nun RGB 0/0/0; echte Pixelprüfung für SVG/PDF, Weißaussparung und unveränderte Fototonwerte. |
| Hilfslinien fehlen | Sichtbare Ausrichtungs-/Einrastlinien beim Ziehen mit Schaltern und Alt-Unterdrückung ergänzt. |
| Übersicht ungeeignet für Tausende Produkte | Kategorien-/Materialfilter, kompakte Liste, Sortierung, Seitensteuerung und abgeleiteter Datenbankindex ergänzt. |
| Unübersichtliche horizontale Designleiste | Hauptprodukt-/Design-Tabs und suchbares Raster; Erstellen/Import/KI als getrennte Aktionen. |

## 8. Shopify: Was „live“ und „veröffentlicht“ derzeit bedeuten

Drei unterschiedliche Vorgänge dürfen nicht verwechselt werden:

1. **Werkstattcode veröffentlicht:** Die neue Händler-App ist erreichbar und wird in Shopify geöffnet.
2. **Produktstand gespeichert/geprüft oder als Shopify-Entwurf übertragen:** Das ist noch keine öffentliche personalisierte Bestellung.
3. **Öffentlicher Verkaufsartikel mit Kundenkonfigurator, Preisen, Warenkorb und Fertigungsbindung:** Diese vollständige Strecke muss je unterstütztem Produktweg abgenommen werden.

Der Nutzer bestätigte, dass der Shop noch nicht öffentlich live ist und der Zahlungstestmodus aktiviert wurde. Echte Testkäufe nutzten den Shopify-Testgateway; keine echte Abbuchung oder Fertigungsauslösung wurde daraus freigegeben.

Der vollständig dokumentierte Foto-Testkauf für Schiefer Revision 5 betrug **32,98 EUR Produkt + 4,99 EUR Versand = 37,97 EUR**. Shopify bestätigte `test: true`, `PAID`, `UNFULFILLED`. Genau eine Bestellposition wurde dem gespeicherten Stand zugeordnet. `productionReady: false` und `customerDownloadAllowed: false` blieben gesetzt.

Die Bestellanbindung wurde mit signiertem `ORDERS_PAID`-Eingang und Testfilter aufgebaut. Der allgemeine Shopify-Entwurfsweg ist aktiviert und verwendet serverseitigen Zugriff. Im jüngsten Formatpaket wurde der echte Tokenaustausch und lesende Produktzugriff geprüft, **keine neue Produktmutation**. Medienübertragung, kontrollierte Aktualisierung bestehender Shopartikel und öffentliche Verkaufsbindungen bleiben gesonderte Arbeit.

Frühere Veröffentlichungsversuche scheiterten an unvollständigen Theme-/Function-Artefakten. Spätere Releases enthalten Prüfungen zum Erhalt der bestehenden sieben Shopify-Module. Alte Berichte über fehlenden Shopify-Anschluss vom 09.10. sind deshalb keine Beschreibung des aktuellen Händlerstands. Umgekehrt darf die Veröffentlichung des Händlereinstiegs nicht als Austausch/Neuveröffentlichung des bisherigen Kundenthemes dargestellt werden.

Quellen: [Foto-Testkauf](../releases/20261011/template-r5/RELEASE.md), [Bestellanbindung](../releases/20261011/orders/RELEASE.md), [Format-/Shopify-Entwurfsanschluss](../releases/20261011/formats/RELEASE.md).

## 9. KI, OpenAI und Product Design

**Vereinbart:** OpenAI als Anbieter; Budget von 100 wurde als **100 EUR pro Monat** eingeordnet und im Werkstattbudget umgesetzt.

Die KI kann bestehende native Texte/Layouts anpassen, Motive erzeugen und ausdrücklich ausgewählte Musterfotos bearbeiten. Sie verwendet die vorhandene Produktlogik und prüft Vorschläge gegen das Produktmodell. Sie ersetzt nicht Geometrie-, Preis-, Kundenrechte- oder Fertigungsprüfung. Ergebnisse werden verglichen und ausdrücklich als neue Version übernommen.

- Text-/Layoutanbieter laut Aktivierungsbeleg: `gpt-4.1-2025-04-14`.
- Bildanbieter: `gpt-image-1.5`.
- Dauerhafte Budgetreservierung, serielle Stapelwarteschlange, Pause/Abbruch/Fortsetzen, Konfliktbehandlung.
- API-Schlüssel geschützt auf dem Server, nicht in Browser oder Git.
- Letzter Betriebsbeleg: vier KI-Aufträge, **34 Cent im Werkstattbudget**, keine zusätzlichen Aufträge durch das jüngste Release.
- Tarifprüfung/Freigabe laut Konfiguration bis **10.11.2026, 12:38:17 UTC**. Danach erneuern; dieser Wert ist nicht das Verfallsdatum des API-Schlüssels.
- Die 34 Cent sind der protokollierte Werkstattstand, kein heute ausgelesener vollständiger OpenAI-Rechnungsauszug. Externe Nutzung desselben Schlüssels wird damit nicht automatisch erfasst.

**Product-Design-Plugin:** Der Nutzer fand dessen Entwurfsarbeit gut und möchte sie weiter nutzen. Das Plugin unterstützt die Entwicklungs-/Designarbeit. Es wurde nicht als eigenständiges Plugin in die Shopify-Laufzeit eingebettet. Die tatsächliche KI-Funktion der Werkstatt läuft über eigene OpenAI-API-Adapter. Keine automatische Gleichheit der Funktionen oder Ergebnisse behaupten.

Quellen: [OpenAI-Aktivierung](../releases/20261011/openai-active/RELEASE.md), [Bildfunktionen](../releases/20261011/ai-images/RELEASE.md), [Stapelgestaltung](../releases/20261011/ai-batch/RELEASE.md).

## 10. Fertigung und Qualitätsgrenzen

Technisch vorhanden sind maßbezogene Konturen, Textpfade, eingebettete Originalbilder, Gravurprüfungen sowie Druck-/Weiß-/Schnittausgaben. Roland `RDG_WHITE` und `CutContour`, separate Mimaki-Farb-/Weißausgaben, Spiegelung und 300-dpi-Ausgabevorgaben sind in historischen technischen Prüfungen behandelt.

Das bedeutet nicht, dass jedes Produkt für jede Maschine freigegeben ist:

- Generisches DeviceCMYK ist kein gemessenes Material-/Drucker-ICC-Profil.
- Ein SVG oder PNG ist nicht allein dadurch ein verbindlicher CMYK-Druckmaster.
- Fotos bleiben Raster mit tatsächlicher Auflösung; Vektorexport erzeugt keine verlorenen Details neu.
- Anzeigeprofil und schwarze Stahlvorschau legen keine Laserleistung/Geschwindigkeit oder Gravurchemie fest.
- Szene, Sockel, Auswahlrahmen, Hilfslinien und Fotohinweis gehören nicht in technische Separationen.
- Der zweilagige AOSU-Aufbau braucht noch seine getrennte technische Fertigungsausgabe; eine unpassende einlagige Ausgabe wird gesperrt.
- Die frühere Nutzerbestätigung einer konkreten Roland-PDF ist nur für diesen Prüffall belegt, keine umfassende Produktionsfreigabe sämtlicher späterer Exporte.
- Reale Corel-/Mimaki-/RIP-/Material-/Maschinenprüfung sowie Wiederholbarkeit der vollständigen Produktionsstrecke bleiben Abnahmeaufgaben.

## 11. Was gesichert und wiederhergestellt wurde

### Erreichbarer Projektbestand

Der ursprüngliche Sicherungsauftrag wurde über Git-Historie, ein geprüftes privates Server-Git-Bundle und nachvollziehbar rekonstruierte Dokumentationsdiffs bearbeitet. Die Ausgangsbasis und neueren Elternhistorien wurden erhalten. **Historie enthalten** und **Funktionen im aktuellen Produktbaum integriert** wurden dabei getrennt betrachtet.

Am Ausgangscommit dieser Übersicht enthält Git **1.617 Dateien**: 494 unter `app/`, 809 Dokumente/Nachweise unter `docs/`, 120 Dateien in Lieferpaketen, 56 Betriebsdateien, 74 Skripte, 30 Recovery-Dateien und 34 Wurzeldateien. Diese Zählung umfasst historische Pakete/Berichte und ist keine Zahl aktueller Funktionen.

Zusätzliche Referenzquellen des älteren Projekts `Chris83638w/gravuru-shopify` wurden gesichert. Referenzmaterial und aktive App bleiben unterscheidbar. Alte Produktdateien werden nicht ungeprüft über neuere Nutzeränderungen kopiert.

### Private Daten

Private Datenbanken, Original-Uploads, Kunden-/Bestellinformationen und Schlüssel gehören nicht ins Repository oder allgemeine Prüfpaket. Der letzte Release belegt vollständigen Zeilenerhalt in **50 Tabellen** und konsistente Sicherungen von:

| Datenbank | Größe im letzten Sicherungsbeleg |
| --- | ---: |
| `workshop.sqlite` | 49.651.712 Byte |
| `profiles.sqlite` | 45.056 Byte |
| `design-assets.sqlite` | 20.066.304 Byte |

Server- und private Cloud-Sicherungen sind dokumentiert. Die Cloud-Verzeichnisse `merchant-before-steel-ink-20261011-v2` und `merchant-after-steel-ink-20261011` unter `/workspace/recovery-private/` samt drei Datenbankdateien wurden heute erneut als vorhanden festgestellt. Die Nachher-Serverdateien waren bytegleich zur Vorher-Sicherung; die getrennte Cloud-Nachherkopie wurde aus diesen bereits heruntergeladenen identischen Bytes angelegt und geprüft. Kein neuer Download wird dafür behauptet.

Heute wurden diese Datenbanken nicht neu restauriert oder mit aktuellen Live-Daten abgeglichen. Nicht gespeicherte Browserentwürfe sind durch eine Datenbanksicherung nicht automatisch geschützt. Ein außerhalb dieser Cloud laufender regelmäßiger Sicherungs-/Notfallwiederherstellungsdienst wird durch diese Einzelbelege nicht nachgewiesen.

### Nicht vollständig verfügbare frühere Dateien

- Frühere temporäre Cloud-Verzeichnisse und gelöschte Aufgaben-Dateisysteme sind nicht automatisch zugänglich.
- Frühere lokale Windows-Dateien sind nicht eingebunden.
- Das ursprüngliche Claude-Prüf-ZIP vom 09.10. und dessen spätester Dokumentationscommit `c64c197…` wurden nicht byteidentisch wiedergefunden; lesbare Dokumentationsdiffs wurden als solche rekonstruiert.
- Nicht gepushte und nicht im Bundle/Chatdiff enthaltene Dateien können nicht als gerettet zugesichert werden.
- Die konkret im Screenshot benannte `GT1E86_1.PDF` ist nicht ausdrücklich vorhanden. Konturimport wurde mit erreichbaren Originalen und geeigneten Testdateien geprüft.
- Die vollständige native Quelle des Charlotte-Groner-v4-Musters fehlt; die Abbildung ist vorhanden.
- Ein Chat-Screenshot oder ein Ordnername beweist nicht den Zugriff auf die zugrunde liegende Originaldatei.

Quelle: [Recovery-Herkunft vom 10.10.](../../recovery/2026-10-10/RECOVERY-PROVENANCE.md). Dessen damalige Aussage „keine Datenbanksicherung erstellt“ beschreibt nur diesen frühen Wiederherstellungslauf; spätere private Sicherungen sind separat belegt.

## 12. Installationspaket und Betrieb

Aktuelles Händlerpaket:

- Datei: `deliverables/merchant-steel-ink-tabs-20261011/gravuru-merchant-steel-ink-tabs-20261011.zip`
- Version: `0.1.0-recovery.20261010+7a168bc66adc`
- Größe: **28.666.379 Byte**
- SHA-256: **`bbe80f53cc2148323ecfb978051c145fc64d05847d5ec01a285abf9f2209ca51`** – heute erneut berechnet und bestätigt.
- 425 Manifestdateien; Anwendung, Ressourcen und Installationshelfer, keine privaten Datenbanken/Schlüssel.

Automatisierter Ablauf: `stage-merchant-release.py` prüft Archiv/Manifest, entpackt in neues Releaseverzeichnis, baut und prüft die private Konfiguration. `activate-merchant-release.py` erstellt bei gestopptem Händlerprozess und freier Datensperre private Sicherungen und ersetzt atomar den Händlereinstieg. Danach nur diesen Dienst starten und HTTP-/Prozess-/Datenprüfung ausführen. Bestehende Vorlagen nicht erneut importieren.

Der aktuelle Plesk-Startweiterleiter `start-r5.cjs` lädt `app.cjs`. Ihn beim nächsten Wechsel berücksichtigen. Globale Server- oder Themeänderungen sind kein Teil dieses Ablaufes.

Eine getrennte Installation einschließlich Build/Start wurde für dieses Paket durchgeführt. Das ist kein vollautomatischer Neuaufbau eines beliebigen Servers ohne DNS/TLS, passende Python-Abhängigkeiten, private Konfiguration und kontrollierte Datenwiederherstellung.

[Paketbeschreibung](../../deliverables/merchant-steel-ink-tabs-20261011/README.md) · [Betriebsanleitung](../../ops/plesk/MERCHANT-README.md). Die Betriebsanleitung enthält historische Einleitungsabschnitte; aktuelle Releaseberichte ergänzen die späteren Anschlüsse.

## 13. Welche Prüfungen tatsächlich belegt sind

| Prüfung | Nachweis | Was sie nicht beweist |
| --- | --- | --- |
| Jüngste Regression | Vollständiger Lauf 727 Tests: zunächst 726 bestanden, ein alter Sollwert `#191919`; Anforderung wurde `#000000`. Danach alle 19 betroffenen Vertrags-/Randtests bestanden. | Kein behaupteter zweiter komplett grüner 727er-Lauf; überlappende Teilmengen nicht addieren. |
| Jüngster Browserablauf | 120 erfolgreiche lokale authentifizierte API-Anfragen, Desktop/Mobil, Tabs, Suche, Bedienung, Import, Speichern/Wiederöffnen | Shopify-Identität und HTTPS-Eingang synthetisch; keine vollständige echte Händleranmeldung durch diesen Lauf |
| Stahlfarbe | Sechs Browser-Pixelproben: Vektor-PDF/SVG schwarz, Weißaussparung frei, Rasterfoto/Druck unverändert | Keine physische Gravurprüfung |
| Tatsächliches Stahlprodukt | Revision 3 in privater Kopie; neun Vektorelemente, schwarze Darstellung, 0-mm-Einpassung und Originalerhalt geprüft | Kein Überschreiben des Liveprodukts oder ungespeicherten Browserstands |
| Original-PDF-Import | 19 unterschiedliche erreichbare Original-PDFs jeweils auf Rechteck/Oval: 38 Prüfungen, Originale bytegleich | Nicht dieselbe Menge wie frühere 20-Dateien-Berichte; keine Prüfung jeder je erwähnten PDF |
| Katalog | 3.000 synthetische Produkte, paginierter Datenzugriff | Keine Last-/Dauerbetriebsfreigabe für 3.000 komplexe reale Produktpakete |
| Paket | Frische getrennte Installation/Build/Start und 425 Manifestdateien | Keine universelle Wiederherstellung aller externen Dienste |
| Liveauslieferung heute | 17 lesende HTTPS-Prüfungen, zwölf Dateien bytegleich, private APIs anonym gesperrt | Keine aktuelle angemeldete Klickprüfung oder vollständige Backend-/Datenbankinventur |
| Echte Händlerverbindung | Nutzerbestätigung sowie 19 authentifizierte Serverzugriffe nach Verbindungsreparatur | Kein vollständiger Ende-zu-Ende-Abnahmekatalog |
| Echte Bestellung | Schiefer Revision 5 mit Foto, Testgateway, Preis, signierter Eingang, gespeicherter Stand | Keine allgemeine neue öffentliche Bestell-/Fertigungsstrecke für alle Materialien |
| Echte KI | Text-/Layoutantwort und zwei Bildanfragen; anschließende Korrektur/Prüfung eines Motivs | Keine automatische Qualität jeder künftigen Generierung oder großer bezahlter Stapel |
| Datenerhalt | Letzter Release: alle bisherigen Zeilen in 50 Tabellen unverändert; drei Sicherungen mit SHA-256/SQLite geprüft | Keine Sicherung unbekannter Altcloud-Dateien oder offener Browseränderungen |

Quellen zum jüngsten Paket: [Release](../releases/20261011/steel-ink-tabs/RELEASE.md), [Tests](../releases/20261011/steel-ink-tabs/tests.json), [Browser](../releases/20261011/steel-ink-tabs/browser.json), [Pixel](../releases/20261011/steel-ink-tabs/pixels.json), [Originalprodukt](../releases/20261011/steel-ink-tabs/actual-product.json), [Installation](../releases/20261011/steel-ink-tabs/package-install.json), [Datenerhalt](../releases/20261011/steel-ink-tabs/backup-after.json).

## 14. Noch offen – empfohlene Reihenfolge

Diese Priorisierung ist eine Empfehlung für Prüfung und Weiterarbeit, keine neue Zusage bereits fertiger Funktionen.

1. **Echte Bedienabnahme im Shopify-Rahmen:** Produkte, Master, Profile und jeweils native/importierte Designs; Auswahl, Maus/Touch, Hilfslinien, Foto, Form/Größe, Speichern, Wiederöffnen, Sitzungswechsel und Mobilansicht. Alle gemeldeten Fehler gezielt nachstellen.
2. **Vorlagentreue sichtbar abgleichen:** jedes erreichbare Original gegen Händler- und Kundenansicht; bewusste Schriftänderungen und flache Referenzbilder kennzeichnen. Fehlende konkrete Quellen benennen.
3. **Allgemeine Shopify-Strecke abschließen:** Entwurfsanlage mit echtem Testprodukt, Bilder, kontrollierte Aktualisierung, Varianten-/Preisbindung, öffentliche Kundenrouten, Warenkorb und signierter Eingang für Acryl und Stahl. Bestehende Altstrecke dabei erhalten.
4. **AOSU-Ausgabe vervollständigen:** Stahlträger und Acrylteil getrennt, mit ihren tatsächlichen Ausschnitten/Maßen; kein generischer einlagiger Ersatz.
5. **Produktionsabnahme:** reproduzierbares Paket aus genau dem Bestellstand, echte Schrift-/Foto-/Weiß-/Kontur-/Spiegelungsprüfung und reale Maschinen-/RIP-/ICC-Proben.
6. **Drive anschließen:** eigener autorisierter Werkstattzugriff, konkreter Quellordner, Datei-IDs, revisionsgebundene Originalkopien. Chat-Connector allein reicht nicht.
7. **Betrieb absichern:** dokumentierter Restore aus privatem Backup, regelmäßige Sicherung außerhalb der flüchtigen Arbeitsumgebung, Verhalten bei Neustart/Verbindungsverlust und großen Beständen; Budget-/Tarifprüfung rechtzeitig erneuern.
8. **Dokumentation bereinigen:** maßgeblicher Einstieg, Branchstrategie und veraltete „aktuell/offen“-Abschnitte konsistent machen. Keine historischen Belege still löschen.

Weitere konkrete Prüfthemen: PyMuPDF-Lizenzwahl (laut vorhandener Startdokumentation AGPL/kommerzielle Lizenz), Schrift-/Bildnutzungsrechte und tatsächlich freigegebene Material-/Maschinenparameter. Hier liegt kein vollständiger aktueller Freigabenachweis vor; keine pauschale Rechtsverletzung behaupten.

## 15. Auffällige Dokumentationswidersprüche

- `README.md` beschreibt großteils den Stand vom 03.10.; `LOKAL-STARTEN.md` behauptet noch fehlende Händleranmeldung und nicht bearbeitbare Gesamtimporte. Diese Aussagen sind als damaliger Stand zu lesen.
- `START_HERE.md` und `STATUS.md` enthalten viele chronologisch aufeinanderfolgende „Aktuell/Live“-Abschnitte. Spätere Belege überstimmen frühere offene Punkte nur im tatsächlich geprüften Umfang.
- Masterplan vom 30.09. nennt teilweise dezimale Schrift-mm; die spätere Paketfestlegung verlangt ganze mm. Nicht durch isoliertes Lesen des ältesten Plans die neuere Entscheidung rückgängig machen.
- Claude-Berichte vom 09.10. nennen noch fehlenden KI-/Shopify-Anschluss und GitHub-Sicherung. Seitdem sind wesentliche Teile umgesetzt und gesichert; die alten Dokumente bleiben Fehlerhistorie.
- `main` enthält nicht den aktuellen Produktbaum. Ein Review ausschließlich dieses Branches würde das falsche Projekt prüfen.
- „Live“, „alle Tests bestanden“, „vollständig“ und „wie die Vorlage“ müssen jeweils mit Zeit, Version, Testart und fachlichem Umfang angegeben werden.

## 16. Einstieg für Claude: relevante Dateien

Zuerst diese Übersicht, dann `AGENTS.md`, jüngste Abschnitte von `START_HERE.md`/`STATUS.md`, `UMSETZUNGSPAKETE.md`, `NEUE-WERKSTATT-PLAN.md` und `MATERIALREFERENZEN.md` lesen. Die alten Quellen sind Anforderungen/Historie, kein alleiniger Livebeweis.

Für die Codeprüfung:

- Produkt/Version/Preis: `app/workshop/` sowie `app/configurator/variant-m/contract.mjs`.
- Händlerzugang/Routes: `app/workshop/http.mjs`, `app/workshop/ui/merchant-request.mjs`, `ops/plesk/merchant-runtime.mjs`.
- Gestaltung/Tabs: `app/workshop/ui/product-editor-ui.mjs`, `app/workshop/ui/app.mjs`, `app/workshop/ui/editor-guides.mjs`, `app/workshop/ui/editor.css`.
- PDF/SVG: `app/workshop/design-import.mjs`, `design-assets.mjs`, `editable-design.mjs`, `design-converter.py`, `native-font-replacement.mjs`.
- Stahl: `app/workshop/ui/steel-options-ui.mjs`, `app/workshop/specimen-product.mjs`, `app/platform/sources/app/shared/models/processing-profiles.mjs`, `studio-svg.mjs` im selben Modellordner.
- Schriften/Profile: `app/workshop/font-library.mjs`, `font-import.py`, `profile-library.mjs`, `ui/profiles-ui.mjs`.
- Shopify: `app/workshop/shop-draft-transfer.mjs`, `shopify-draft-token.mjs`, `storefront-cart.mjs`, `shopify-order-webhook.mjs`, `order-intake.mjs` und Journale.
- KI: `app/workshop/ai-design-jobs.mjs`, `ai-batch-jobs.mjs`, `openai-design-provider.mjs`, `openai-image-provider.mjs`.
- Tests/Browserprüfungen: `*.test.mjs` in Appmodulen und `scripts/check-*.py`; jüngste Belege unter `docs/releases/20261011/`.
- Installation/Sicherung: `ops/plesk/`, `deliverables/merchant-steel-ink-tabs-20261011/README.md`, `recovery/2026-10-10/RECOVERY-PROVENANCE.md`.

Normale lokale Befehle aus `package.json`: `npm test`, `npm run build`, `npm start`. Node ≥24 und passende Python-Abhängigkeiten sind nötig. Ausschließlich eine frische Testablage verwenden; niemals unbesehen vorhandene private/live Daten in Tests einbinden. Für reine Codeprüfung sind keine Serverzugänge oder Kundendaten erforderlich.

## 17. Prüfauftrag zum direkten Weitergeben

> Prüfe Gravuru 2027 unabhängig anhand dieser Übergabe und des tatsächlichen Quellstands `9d388e3e9f8e7cb5aa63e7a50d163cf1ca7d5e3a` bzw. eines nur um diese Übergabe ergänzten Stands. Der installierte Anwendungscode ist `7a168bc66adc9718bc9b0fefad97c338e546c57d`. Prüfe nicht versehentlich den veralteten `main`-Branch.
>
> Ziel ist ein zuverlässiger Händlerablauf von Produkt/Master über Gestaltung, PDF-/Foto-/Schriftbearbeitung und Shopify-Bindung bis zur reproduzierbaren Bestell-/Fertigungsausgabe. Unterscheide native Produkte, freie Formprodukte und den zweilagigen AOSU-Aufbau. Die Nutzervorgaben und gemeldeten Fehler stehen in dieser Übersicht.
>
> Übernimm Codex-Aussagen und PASS-Berichte nicht ungeprüft. Ordne jede wesentliche Aussage ein als: im Code vorhanden, mit echten lokalen Komponenten getestet, synthetisch/external gemockt, tatsächlich live belegt, nur vom Nutzer bestätigt oder offen. Prüfe besonders Authentifizierung, Revisions-/Originalerhalt, Kundenrechte, Kontur-/Preisgleichheit, PDF-Aufbereitung, Masken, Schriftpfade, Shopify-Wiederholschutz und KI-Budget. Prüfe auch, ob die Oberfläche ihre Funktionen tatsächlich erreichbar macht.
>
> Liefere konkrete Fehler mit Datei/Funktion, Reproduktionsweg, Auswirkung und kleinster sinnvoller Korrektur. Trenne bewiesene Fehler von Risiken und fehlenden Nachweisen. Bewerte die Priorität, vermeide pauschale Komplett-Neuentwicklung. Nenne ausdrücklich, welche Originale oder Zugänge für eine Prüfung fehlen.
>
> Prüfe zunächst lesend beziehungsweise in isolierter Testumgebung. Ändere keine Live-App, kein Theme, keine Produkte, Bestellungen oder privaten Daten; führe keine kostenpflichtigen KI-Aufrufe oder Veröffentlichungen aus. Keine Geheimnisse anfordern oder in Berichte aufnehmen. Markiere Produktionsfreigabe und öffentliche Verkaufsstrecke nur dann als abgeschlossen, wenn die passenden echten Belege vorliegen.
>
> Gewünschtes Ergebnis: (1) kurze Gesamtbewertung, (2) Soll-/Ist-Matrix, (3) priorisierte bestätigte Befunde, (4) Test- und Beleglücken, (5) umsetzbare Reihenfolge der nächsten Schritte. Ein Code-/Dokumentationsreview ist keine echte Maschinen- oder vollständige Liveabnahme.

