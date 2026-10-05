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
