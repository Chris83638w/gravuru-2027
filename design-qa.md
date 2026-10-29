# Design QA — ausgewählte Richtung 6

**Ergebnis: passed** für die lokale visuelle Umsetzung und die unten geprüften Interaktionen. Dies ist keine Freigabe für eine Live-Installation oder echtes iOS.

Quelle: `docs/handoffs/issue48-d-20261029/sichtpruefung/variante-6-entwurf.png`, ursprünglich `outputs/konfi-design-20261029/06-werkzeugband.png`, 1672×941 px. Der Benutzer hat genau Nummer 6 gewählt. Tatsächliche Screenshots im selben Verzeichnis: `variante-6-desktop.jpg` (1280×720), `variante-6-iphone-13.jpg` (390×664), `variante-6-iphone-se.jpg` (375×548). Screenshot-Raster entspricht jeweils der angegebenen CSS-Viewportgröße, 1 Bildpixel je CSS-Pixel. Referenz zur Beurteilung proportional auf die Desktopansicht bezogen, nicht als Laufzeitbild verwendet.

Zustand: lokaler D8-Kandidat, 120×80 mm, Hausmotiv und vier vorhandene Textfelder, ausgewählter Spruch `Heimathafen\nvon`, 8-mm-Anzeige, 21,68 €. Text-Reiter aktiv, keine offenen Dialoge. Quelle und gerenderter Desktop wurden im selben Vergleichsaufruf angezeigt; zusätzlich Fokus auf Werkzeugband, Tab-Unterstreichung, Textfelder und Preisleiste. Handyansichten separat auf sichtbare Fläche, Berührungsziele und Überdeckung geprüft.

| Oberfläche | Abgleich |
| --- | --- |
| Layout und Proportionen | Weißer Kopf, vollständiges dunkles Band, ca. 58/42-Arbeitsbereich, senkrechter Trenner, kompakter Footer. Originalplatte bewusst ohne generierte Verzerrung. |
| Typografie und Hierarchie | Bestehende UI-Schrift, deutlichere Buttongewichte, klare Feldlabels; echte Schriftprobe als vorhandene Glyphenpfade. |
| Farben und Konturen | Anthrazit #252a2e mit heller Beschriftung; weiße Arbeitsflächen, neutrale Feldränder. Bestehende Funktionsfarben für Auswahl/Löschen bleiben. |
| Assets und Inhalte | Originalgeometrie, Schriftpfade und Motiv unverändert; Designentwurf nur Referenz, keine generierten Assets im Produkt. |
| Zustände und Bedienung | Desktop-Band, mobile zwei Reihen, Vollbild/Rückkehr, Eingabefokus und eingeklappte Felder geprüft; Schritte/Preis bleiben frei. |

## Korrekturschleife

1. Erste Umsetzung: Seitenränder der Legacy-Hülle und abgerundeter aktiver Tab wichen ab; gezielt auf den Editor begrenzt korrigiert. Textzeilen kompakter gemacht.
2. Klick auf die während eines Updates neu gezeichnete Schriftprobe öffnete den Dialog nicht zuverlässig. Pointer-Ereignisse treffen jetzt den stabilen Button; tatsächlicher Klick Desktop/Handy öffnet den Dialog. Papierkorb auf dunkler mobiler Leiste hell eingefärbt.
3. Unabhängige Sichtprüfung: keine P0/P1, zwei P2. Erstes Handyfeld war unter den sichtbaren Bereich gedrückt; mobile Überschrift/Abstände komprimiert, Feld vollständig sichtbar. Eingeklappter Spruch zeigte eine halbe Folgezeile; Zeilenhöhe/Überlauf korrigiert. Beide Ansichten danach neu erfasst. Keine offenen P0/P1/P2 für diesen Umfang.

## Nachweise

- 71/71 gezielte Tests auf dem gemeinsamen Prüfbranch; Liste und Umfang im [Bericht](docs/handoffs/2026-10-29-konfi-design-6-astra.md). Kein weiterer Vollauf behauptet.
- 900×720: Band wechselt ohne horizontalen Überlauf auf zwei Reihen; 1280×720 auf eine Reihe zurück.
- Schriftgröße 8→9, Rückgängig 8; Vollbild öffnen/schließen, Wechsel zu 375/390 und zurück; Schriftwahl per Klick und Feldoptionen auf/zu.
- Mehrzeiliger Spruch fokussiert 66 px, eingeklappt 44 px. Vier Texte nach Neuladen erhalten. Keine neuen Warnungen/Fehler im Browserprotokoll.
- Physisches Safari/iPhone, Bildschirmtastatur/Pinch und späterer echter Warenkorb bleiben gesondert offen. Kein Live-Zugriff.

---

# 11.10.2026 · Vorlagenabgleich: Originalfotomaske und M01/M02-Navigation

Umfang dieses Durchlaufs: bewahrte Fotoform, verständliche Elemente, Hauptnavigation und wahrheitsgemäße Verbindungs-/Bestellanzeigen. Keine vollständige visuelle Abnahme aller historischen Produktdesigns.

**Belege und Zustand:** Quelle `/workspace/recovery-private/reference-check/design-reference/produktuebersicht-variante-2.png` und `produktbearbeitung-variante-2.png` (je 1487 × 1058). Browseraufnahme bei 1440 × 1000 CSS-Pixeln, deviceScaleFactor 1, zusätzliche Mobilprüfung 390 × 844. Quelle proportional auf 1440 px Breite normalisiert; Umsetzung für gemeinsamen Vergleich auf die ersten 1025 px beschnitten. Kombinierte Eingaben `/workspace/recovery-private/template-r5-navigation/dashboard-comparison.png` und `editor-comparison.png` (2880 × 1055). Einzelaufnahmen `overview.png`, `editor-photo.png`, `profiles.png`, `profiles-mobile.png`, `overview-mobile.png` im selben privaten Verzeichnis. Gesamtaufnahmen inklusive Bild-/Eigenschaftenbereich geöffnet; Foto-/Eigenschaftenausschnitt und Kopfzeile darin lesbar. Private Produktbilder bleiben außerhalb Git.

Die Quelle zeigt Acrylglas und sechs illustrative Produkte; der geprüfte Bestand zeigt die tatsächlichen zwei Konfigurationen, im Editor eine Schiefer-Gedenktafel mit gewähltem Foto. Diese Unterschiede sind Daten-/Materialzustände, keine fehlenden vier Produkte. Referenz dient hier dem gemeinsamen Aufbau, nicht einem vorgetäuschten identischen Produktzustand.

**Vergleichsverlauf:**

- P1: Foto nach PDF-Aufbereitung rechteckig statt originaler Kreuzmaske. Quelle `GT-S-2_2.PDF`, unveränderliche Assetquelle privat vorhanden. Korrigiert durch eigene Originalmasken-Ressource in Import, Vorschau, Kundenansicht und Ausgabepaket; tatsächliche Browseransicht und Gravur-PDF geöffnet. Echte Musteraufnahme und Uploadhinweis bleiben sichtbar. Vollständige Cormorant Garamond entspricht der ausdrücklich gewählten Schriftalternative.
- P2: Zweizeilige überladene Hauptnavigation und widersprüchliche Verbindungs-/Bestelltexte. Vier primäre Wege nach M01/M02 wiederhergestellt, Zusatzwerkzeuge unter Verwaltung; Status aus Sitzung bzw. gespeicherten Bestellungen. Neue Kopfzeile und offene Profilseite in Desktop/Mobil geprüft.
- Erste neue Aufnahme zeigte fehlende Shell-Ressourcen. Statische Auslieferung ergänzt; erneut aufgenommen, keine 404 oder Konsolenfehler. Schriftupload über Verwaltung erreichbar; Master-Link öffnet Masteransicht. Die CSP bleibt strikt.
- P2: Technische Elementnamen und unlesbare Koordinaten. Elementnamen bearbeitbar; aktuelle Vorlage verwendet Kontur/Lebensdaten/Foto/Name. Anzeige auf zwei Dezimalstellen begrenzt, gespeicherte Originalgeometrie unverändert.

**Fünf Prüfflächen:** Typografie nutzt bestehende Schrift-/Feldhierarchie; kein neuer Markenfont erfunden. Abstand/Grid folgt vierteiliger Kopfzeile und dreispaltigem Editor; zusätzliche echte Bearbeitungsfunktionen brauchen rechts Scrollraum. Grüntöne, helle Flächen und Fokusmarkierung erhalten. Tatsächliche Material-/Fotobilder scharf und ohne Ersatzzeichnungen; Maske aus Originaldaten, keine Nachzeichnung. Texte unterscheiden lokale Sitzung, Shopify-Testbetrieb und öffentliche Freigabe.

**Bedienung:** Foto ersetzen, Text ändern, Auswahl/Ziehen, Speichern/Neuladen, Schriftupload/Gruppe und Rückgängig/Wiederholen im umfassenden Händlerbrowser bestanden. Gesonderte Navigation bei 390 px ohne Überlauf. Authentifizierung synthetisch; echte Shopify-Händlersitzung dadurch nicht bewiesen. Der blaue dünne Auswahlgriff ist reine Bedienoberfläche und wird nicht ausgegeben.

**Nachlauf:** Keine P0/P1/P2-Abweichung im abgegrenzten Paket offen. Ein pixelgleicher Nachbau sämtlicher Motive, Produktfotos und historischem PDF-Schriftsatz ist nicht behauptet. Externe Anschlüsse und Maschinenabnahme siehe Releasebericht.

final result: passed

---

# Visuelle und funktionale Ergänzungsprüfung – M02-Varianten, 05.10.2026

Umfang: Variantensteuerung innerhalb der bestätigten M02-Struktur. Die Fotoansicht `docs/dashboard-20261004/dashboard-m02-continuation.png` wurde gemeinsam mit `referenzen/M02.png` bei 1487 × 1058 geprüft: Bereiche/Elemente links, vollständige vorhandene Szene mittig, Fotoeigenschaften rechts bleiben erhalten. Die neue Optionenansicht `dashboard-m02-options.png` ist eine funktionale Ergänzung, für deren genaue Felder kein separater ausgewählter Mockup vorliegt; sie übernimmt die bestehenden M02-Form-/Fokusregeln. Eigenschaftenausschnitt und Mobilaufnahme separat geprüft.

- Typografie: bestehende Überschrift-/Feldhierarchie; Gruppentitel, Klartextlabels und explizit benannte Startauswahl. Keine neuen Fonts.
- Layout: Dreispaltenstruktur bleibt; Varianten rechts über dem gemeinsamen Preisprofil. Lange Angaben umbrechbar, 390 px ohne Überlauf. Preis oberhalb des Produkts; kein Dialog verdeckt die Gestaltung.
- Farben: unverändertes M02-Grün, helle Gruppenränder, klar markierte Checkboxen und Fokus. Letzte verbleibende Option ist deaktiviert, mit Erklärung zur Mindestanzahl.
- Bilder: ursprüngliche Szene/Designs und Sockel unverändert; explizite Ausführung bestimmt den Sockel, Backend-Defaults bestimmen den ersten Vorschaustand. Keine Wandhalterszene erfunden.
- Inhalte: tatsächlicher Katalog aus dem nativen Modell, eindeutige Freigabe und Startauswahl, sichtbarer Hinweis bei notwendigem Ersatz. Preis kommt aus der bestehenden serverseitigen Auflösung. Keine zweite Kalkulation.

Browserablauf mit synthetischem Produkt: Auswahl reduzieren und erneut aktivieren, gültige Startauswahl, Entwurf/Speichern/Reload, Übernahme im echten Kundenrenderer, 36,97/14,99 Euro, Verlustschutz beim Verlassen und Mobil. Keine Seitenfehler. Kein vollständiger Screenreader- oder Fertigungsnachweis. Die Wandhalterung wird als Option/Preis verarbeitet, ohne neue Szenengrafik. Alle P1/P2-Befunde des geprüften Pakets behoben; persönliche visuelle Abnahme bleibt ausstehend.

final result: passed

---

## Vorherige M01-Prüfung

# Visuelle Prüfung – M01-Produktübersicht, 05.10.2026

Geltungsbereich: M01-Übersicht und Verwaltungsaktionen für das vorhandene Acrylmodell. Referenz `docs/dashboard-20261004/referenzen/M01.png` und fertige Aufnahme `docs/dashboard-20261004/dashboard-m01-overview.png`, jeweils 1487 × 1058 Pixel und deviceScaleFactor 1. Beide Bilder nach der letzten Korrektur gemeinsam geöffnet und betrachtet. Ergänzend `dashboard-m01-overview-mobile.png` (390 × 844 CSS-Viewport, ganze Seite) und `dashboard-m01-selection-mobile.png`.

## Vergleich und Korrekturen

- P1 Ausgangsstand: kleines Portrait mit großen leeren Seitenflächen. Jetzt breite fotografische Komposition aus der echten vorhandenen Szene, vollständige Platte und vorhandener Sockel. Keine Generierung neuer Produktgestaltungen oder Austausch der Originalarbeit. Materialmischung und sechs Beispiele im M01-Mockup sind keine gespeicherten Produkte; drei ausdrücklich synthetische Acrylprodukte zeigen den tatsächlichen Adapterumfang.
- P2 erste Umsetzung: Seitenstreifen/Tablettübergang versetzt, Suchsymbol über dem Feld. Korrigiert: nur äußerster leerer Szenenrand verlängert, unveränderte Mittelkomposition, keine vertikale Verschiebung; Suchsymbol korrekt im Feld. Platte und Sockel jetzt vollständig in der Kartenkomposition enthalten.
- P2 fehlende Kartenaktionen: Mehrmenü, beschriftete Checkboxen, sichtbare Auswahlleiste und Archivbestätigung funktionieren über reale vorhandene API. Die Bestellstrecke bleibt sichtbar als „folgt“ gekennzeichnet.
- P2 Kopf zu hoch: Navigation und oberer Abstand an M01 angeglichen. Zusätzliche Zeile für sichtbare Auswahl und Anzahl bewusst erhalten. Aktionsicons aus Tabler 3.35.0 (MIT), passend zur bereits eingesetzten M02-Bibliothek.

## Fünf Prüfflächen

- Typografie: bestehender Schriftstack; 32-px-Seitentitel, 18-px-Kartentitel, gut getrennte Detailzeilen. Stabile lange technische IDs werden nicht durch ausgedachte CFG-Nummern ersetzt; vollständiger Wert im Titelattribut und in der Bearbeitung kopierbar.
- Layout: drei gleich breite Karten, 16-px-Abstände, Bild dominiert; kleinere Displays zwei/eine Spalte. Mobil 390 px ohne horizontalen Überlauf. Titel dürfen umbrechen; Aktionen bleiben bedienbar.
- Farben: Dashboard-Grün aus ausgewähltem M01/M02, helle neutrale Flächen. Kundenkonfigurator-Farben nicht verändert. Auswahl und Fokus erkennbar.
- Bilder: gespeicherte Revision, echter Renderer, Originalfoto/-design/-sockel. Querformat durch Verlängerung leerer Bildränder. Landschaftsfotos des generierten Mockups sind weiterhin keine gelieferten Produktionsassets. Keine behauptete Pixelgleichheit; fachliche Originaltreue hat gemäß Nutzer Vorrang.
- Inhalt: echte gespeicherte Größen, Status, Stand und Designanzahl; Beispielnamen klar als Prüfprodukte. Shopify und Bestellungen werden nicht als angebunden ausgegeben. Fotoabbildung ist von Kundenstandard getrennt beschriftet.

## Bedienprüfung und Grenzen

Cloud-Chromium/Playwright mit In-Memory-Prüfbestand, einschließlich echter konkurrierender API-Änderung, Archivierung/Zurückholen, Kopieren, Suche, Filter, Auswahl, Tastatur, Mobil und Bildfehler. Keine Seitenfehler. Kein natives In-App-Browsersteuerungswerkzeug oder öffentliche Dashboard-URL behauptet; kein Sites-Publish. Vollständige Screenreader-, Bestell- oder Fertigungsabnahme ist nicht Teil dieses Pakets.

P3: Die breite Szene bleibt optisch schlicht, da bestehende Originalressourcen weiterverwendet werden. Eine neue fotografische Umgebung wäre eine separate Gestaltungsauswahl. Persönliche Nutzerabnahme der neuen Karten und mobilen Anordnung bleibt ausstehend.

final result: passed

---

## Vorherige M02-Prüfung (weiterhin gültig für ihren Geltungsbereich)

# Visuelle Prüfung – M02 Produktbearbeitung, 05.10.2026

Geltungsbereich: ausgewählte M02-Bearbeitungsansicht mit bestehender Produktszene und den nachträglich vereinbarten Kundenrechten. Keine Abnahme der gesamten Werkstatt oder von M01.

Quelle: `docs/dashboard-20261004/referenzen/M02.png`, 1487 × 1058 Pixel. Gerenderte Umsetzung: `docs/dashboard-20261004/dashboard-m02-desktop.png`, gleiche CSS-/Pixelgröße und deviceScaleFactor 1. Zustand: „Designs & Elemente“, Foto ausgewählt, synthetisches Produkt mit Eichenblock. Beide Dateien nach der letzten Korrektur gemeinsam im Bild-Tool betrachtet; zusätzlich `dashboard-m02-inspector.png` als lesbarer Ausschnitt. Mobil: `dashboard-m02-mobile.png`, 390 × 844 CSS-Viewport, Ganzseitenerfassung; separate Textinteraktion `dashboard-m02-mobile-text.png`.

## Vergleich und Korrekturen

- P1 Ausgangsstand: bisheriger Formulareditor ohne zentrale Produktvorschau. Jetzt drei Spalten in M02-Proportionen (20,3 % / flexibel / 26,3 %), kontextbezogene Eigenschaften und große reale Vorschau. Bedienung per Elementliste und Produktklick überprüft.
- P2 erste Umsetzung: Checkboxtexte klebten an den Eingaben, Produktbild-Auswahl wurde von einem transparenten Rahmen abgefangen, Symbole/Design-Miniaturen fehlten. Behoben: spezifische Flexabstände, dekorative Trefferflächen ohne Pointer-Ereignisse, lizenzierte Tabler-SVGs (3.35.0, MIT) und tatsächliche gespeicherte Designvorschauen.
- P2 Zwischenstand: automatische Scrollbewegung schnitt in der Aufnahme die Hauptnavigation ab; Bereichsbuttons waren zentriert. Jetzt Öffnen am Seitenanfang und linksbündige Bereichsnavigation. Neu aufgenommen und zusammen mit M02 betrachtet.
- P2 Fotospalte zu hoch durch redundante Erklärtexte. Gekürzt; Fotovorschau, Ersetzen, Rechte, Hinweis und Originalerhalt sind bei Desktop sichtbar. Eigenschaftenausschnitt erneut geprüft.

## Fünf Prüfflächen

- Typografie: vorhandener Systemschriftstack, 22-px-Titel, 21-px-Eigenschaftstitel, 15-px-Bereichsnavigation, 13–14-px-Eingaben. Gestaltungsschriften aus vorhandenen Fontressourcen; keine neuen Schriftdateien oder erfundenen Fontfreigaben.
- Layout: durchgehende Dreispaltenstruktur, Vorschauhöhe 620 px, separater Designstreifen. Mobil keine abgeschnittenen Schaltflächen oder horizontale Überbreite. Rechteinschränkungen und zusätzliche Elemente führen zu mehr Einträgen als im Beispielmockup.
- Farben: Grün/helle Flächen der M02-Referenz. Die frühere ungefragte Übertragung der grauen Konfiguratorfarbe auf das Dashboard wurde zurückgenommen. Kein Eingriff in die Konfiguratorfarbgestaltung.
- Bilder: Originalressourcen und bestehender Designrenderer, inklusive bestehender Sockelbilder. Die echte native Szene liegt im Hochformat vor; sie bleibt proportional vollständig sichtbar und ist nicht das generierte Landschaftsfoto aus M02. Dies folgt der Nutzervorgabe zur Weiterverwendung vorhandener Produktarbeit, keine behauptete fotografische Pixelgleichheit. Beispielbild/Dateizuordnung auch nach Speichern geprüft.
- Inhalte: echte Feldnamen/Revisionen/Rechte statt fiktiver Shopify-Zuordnungen. Positive Schalter „Frei verschiebbar“/„Größe veränderbar“ entsprechen den später vereinbarten Backend-Freigaben; feste Flächen sind gesperrt. Bestellungen sichtbar als „folgt“, freie Szenen und Shopify im jeweiligen Bereich als offen benannt.

## Interaktionen und Grenzen

Chromium/Playwright in der vorhandenen Cloud auf geschütztem Loopback 8973. Kein verfügbares natives In-App-Steuerungswerkzeug; keine behauptete Sites-Preview oder Veröffentlichung. Tests und die tatsächlich geprüften Browserhandlungen sind in `docs/dashboard-20261004/DASHBOARD-M02.md` aufgeführt. Keine JavaScript-Seitenfehler in den geprüften Abläufen. Keine vollständige Accessibility-/Shopify-/Produktionsabnahme.

P3: Die Mobilanordnung ist ein umgesetzter Vorschlag, dessen persönliche Abnahme noch aussteht. Landschaftsszene aus dem generierten Mockup nicht als Originalasset vorhanden; bestehende native Szene bewusst erhalten. M01-Karten bleiben das folgende separate Paket.

final result: passed

---

## Historische Prüfung; keine Gesamtfreigabe

Der folgende frühere M01-Bericht wurde im anschließenden Abgleich korrigiert: „passed“ belegte nicht die vollständige Übereinstimmung mit M01/M02. Große fotografische M01-Karten waren weiterhin offen, M02 damals noch nicht angebunden.

# Visuelle Prüfung – Dashboard M01, 05.10.2026

Source visual truth: `docs/dashboard-20261004/referenzen/M01.png`, 1487 × 1058 Pixel. Bestätigte große Produktkarten und obere Navigation. Nutzerauftrag: vorhandenes Dashboard fortsetzen, funktionierende Komponenten und tatsächliche Produktdaten wiederverwenden. Keine Erzeugung der sechs fiktiven Mockup-Produkte.

Implementation: `docs/dashboard-20261004/dashboard-m01-desktop.png` (1487 × 1058 Pixel/CSS, deviceScaleFactor 1), `dashboard-m01-mobile.png` (390 CSS-Pixel breit, Screenshot des gesamten Dokuments bei 390 × 844 Viewport), `dashboard-card-detail.png` als lesbarer Kartenausschnitt. Gerendert mit Chromium/Playwright ausschließlich in der Cloud auf geschütztem Loopback-Port 8972. Kein zugängliches natives In-App-Browsersteuerungswerkzeug; kein behaupteter terminal.local-/Sites-Preview-Lauf.

Quelle und erste Umsetzung gemeinsam im Bild-Tool betrachtet; nach Korrektur Desktop/Mobil sowie Kartendetail erneut geöffnet. Vergleichszustand: Produktübersicht ohne geöffneten Editor. Drei aktive synthetische Prüfprodukte statt sechs Mockup-Produkte; andere Datenzahl bewusst, kein Pixelgleichheitsanspruch.

## Befunde und Korrekturen

- P1, erste Kartenvorschau: gemeinsamer Renderer lehnte die intern eingesetzte Bild-Data-URL ab und zeigte „Bild nicht verfügbar“. Korrigiert durch internen, ausschließlich nach dem Rendern ersetzten Bildverweis. Originalrenderer/Produktdaten unverändert. Nachkontrolle: echtes mitgeliefertes Beispielfoto und jeweilige gespeicherte Namen sichtbar. HTTP-Test prüft fehlende Platzhalter und unveränderte Revision.
- P2, erste Mobilansicht: geerbter Zeilenumbruch drängte die Navigation in eine schmale rechte Spalte. Erstkorrektur horizontale Reihe, Nachkontrolle zeigte abgeschnittenen Profile-Zugang. Endkorrektur 2×2-Navigation; aktuelle Mobilaufnahme zeigt alle vier Zugänge ohne horizontalen Überlauf.
- P2, Datenmenge: ungekürzte PNG-Quellen verursachten über 4 MB eingebettete Daten pro Karte. Nur für Dashboard-Vorschauen auf 543 × 724 JPEG abgeleitet (zusammen 85.905 Bytes vor Base64); Herkunft und Hashes in `app/workshop/preview-assets/provenance.json`. Druckoriginale unverändert.

## Fünf Prüfflächen

- Typografie: vorhandener Inter/Segoe-UI/Arial-Systemstack; klare 32-px-Überschrift, 18-px-Kartentitel, 12-px-Metadaten. Kleine ID bricht kontrolliert um. Keine neue Schriftlizenz behauptet.
- Abstände/Layout: obere Navigation, breite Aktionszeile, Such-/Filterreihe, drei Karten pro Desktopzeile, zwei bei mittlerer Breite, eine mobil. Darstellung der vollständigen Platte statt Beschneiden auf ein Landschaftsbild: bewusst zur lesbaren echten Designkontrolle.
- Farben: Weiß/Hellgrau/Graphit wie zuletzt am Konfigurator beschlossen; Design-/Fotofarben erhalten. Statusbadges bleiben semantisch getrennt. Fokus, Filterzustand und Primäraktionen sichtbar.
- Bildqualität: vorhandene Quellen und gemeinsamer Designrenderer; keine generierten Ersatzprodukte. Vorschauen revisionsbezogen, ohne Bediengriffe. Kartenausschnitt geprüft, Foto sichtbar und Konturen sauber. Keine behauptete fotografische Übereinstimmung mit nicht vorhandenen Holz-/Schieferprodukten aus M01.
- Inhalt: tatsächliche Konfigurations-ID, Revision, Verfahren, Grundformat und Designzahl. Keine erfundenen Shopify-IDs, Verknüpfungen, Bestellungen oder Freigaben. Nur vorhandene Profile/Stapelverwaltung verlinkt.

## Interaktionen und Grenzen

Chromium: Suche, leere Treffer, Druck/Gravur/Archiv, Masteransicht, Kopie aus gewähltem Master, erneut öffnen, ungespeicherte Eingaben beim Wechsel bewahren/gezielt verwerfen, mobile Navigation ohne Überlauf. Keine Seitenfehler. 174 Quelltests erfolgreich, nach Bildoptimierung zwei HTTP-Integrationstests erneut erfolgreich. Build 76 Ressourcen/1 Modell.

Der M02-Produkteditor ist weiterhin der nächste Ausbau; bestehender Editor funktioniert. Der Bildschirm ist aktuell im Cloud-Entwicklungsserver geprüft, nicht als zusätzliche gehostete Dashboard-Site veröffentlicht. Das separate „Muster Acrylglasbild“ bleibt Version 12.

P3: Bei später vorliegenden weiteren Material-/Produktbildern mehr visuelle Vielfalt; keine erfundenen Datensätze dafür anlegen.

final result: passed

---

## Historischer Bericht der Konfiguratorarbeit

# Visuelle Prüfung – kompakte Direktbearbeitung

Source visual truth: Nutzerscreenshot im Chat vom 04.10.2026 (großes weißes Textformular über dem Acrylfoto). Auftrag ist ausdrücklich Verbesserung dieses Bereichs, keine identische Nachbildung des unerwünschten Formulars. Reproduzierte Baseline aus Commit 911874e: `/workspace/gravuru-uv-pilot-private/compact-before.png`.

Implementation: `/workspace/gravuru-uv-pilot-private/compact-desktop.png`, `/workspace/gravuru-uv-pilot-private/compact-mobile.png`.

Desktop: Quelle und Umsetzung 1512 × 1080 Pixel / CSS-Pixel, deviceScaleFactor 1. Gleiche Route, Original-Beispielfoto, ausgewählte Überschrift im Bearbeitungszustand. Beide Bilder gemeinsam in einem Tool-Ergebnis betrachtet; keine behauptete pixelgenaue Übereinstimmung mit dem anders beschnittenen Nutzerscreenshot. Mobil: 390 × 844, Faktor 1, zusätzliche responsive Kontrolle bei zum Editor gescrolltem Dokument.

## Vergleich und Korrekturen

- P1, Ausgangszustand: großes Formular verdeckt Gesicht und Foto. Ersetzt durch etwa 44 px hohe Werkzeugleiste am Vorschaurand und einzeilige Texteingabe am ursprünglichen Text. Nachweis Desktop Vorher/Nachher: Foto frei, restliches Design unverändert. Kein zusätzliches Bildmaterial erzeugt.
- P2, erster Mobilvergleich: obere Werkzeugleiste überlappt Vollbild. Korrektur: mobile Leiste an den unteren Vorschaurand. Nachkontrolle im neuen Mobilbild: Schrift, Größe, Farbe und Abschluss sichtbar, Vollbild bleibt am oberen Rand. Keine horizontale Überbreite.

## Fünf Prüfflächen

- Typografie: kompakte UI-Schrift, lesbare 16-px-Minimaleingabe; die Texteingabe darf eine Ersatzschrift verwenden, die echte Designschrift bleibt im gerenderten Design und Export. Keine Änderung an Schriftdaten.
- Abstände: Leiste außerhalb der Hauptfotofläche; kleine Inline-Eingabe statt Formularblock; Responsive-Lage geprüft. Der Nutzer kann unter der gewählten Stelle liegende Designteile während der Eingabe vorübergehend verdeckt sehen.
- Farben: vorhandenes dunkles Grün, weiße Oberfläche, runder Farbpunkt; sichtbarer Fokus und selektierter Text. Keine neuen Markenfarben.
- Bildqualität: Originalfoto, Linien und Dekoration aus bestehender Vorlage unverändert; keine Neugenerierung oder Rasterersetzung der Designassets.
- Beschriftungen: Schrift, mm, Abbrechen/Fertig. Masterbegriffe dokumentiert. Ungefragte Neugestaltung der übrigen Designübersicht unterlassen.

Browserinteraktionen: Desktop/Mobil; Textänderung live, Enter/Abbrechen, erster Auswahlbereich, Größe in ganzen mm, Fotoeditor und Doppelklick, Rechte, kein Uploadscroll, PDF-Download. Keine Konsolen-/Seitenfehler im geprüften Ablauf. Ausschnitte waren im voll aufgelösten gemeinsamen Vorher-/Nachhervergleich lesbar, deshalb kein zusätzlicher vergrößerter Crop nötig.

P0/P1/P2 offen: keine im geprüften Bereich. Keine Aussage über Farbverbindlichkeit oder private Sitzungsdaten anderer Browser.

final result: passed

## Nachtrag: obere linke Vorschau

Mobilbild `/workspace/gravuru-uv-pilot-private/complete-mini-feedback.png` bei 390 × 844 visuell geprüft: vollständige Acrylszene inklusive Beispielfoto, Design, Texten und Sockel sichtbar; proportionale vergrößerte Vorschau oben links. Leere Ränder innerhalb des Hinweisrahmens entfernt. Zunächst fehlendes Beispielfoto korrigiert: Vorschau-only-Markierung umfasst auch das Foto selbst und darf in der Bildschirmkopie nicht pauschal entfernt werden. Verschachtelte SVG-Größen behalten ihre Designmaße. Bediengriffe werden nicht dupliziert. Rahmen transient und ohne Bewegungsanimation. Kein neuer Bildinhalt und keine privaten Daten.
