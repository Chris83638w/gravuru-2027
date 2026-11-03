# Ein Master, unterschiedliche Produktoptionen: Vorschau und Quellenprüfung

## Neuester Stand: moderne Browser-Screenshots

Der modernere Bildentwurf ist jetzt in der lokalen Vorschau umgesetzt; ältere Hinweise zum noch nicht umgesetzten Bildentwurf sind damit überholt. Die Studie bleibt ein Layout-/Bedienbeispiel, kein vollständiger neuer Produktiveditor. Keine Live-Änderung, kein Merge.

[Gesamtansicht / Motive](2026-11-03-produktprofile-vorschau/modern-desktop-motive.jpg) · [Text](2026-11-03-produktprofile-vorschau/modern-desktop-text.jpg) · [Designs](2026-11-03-produktprofile-vorschau/modern-desktop-designs.jpg) · [Optionsicons](2026-11-03-produktprofile-vorschau/modern-desktop-optionen.jpg) · [Andenken Menschen](2026-11-03-produktprofile-vorschau/modern-andenken-menschen.jpg) · [Andenken Tiere](2026-11-03-produktprofile-vorschau/modern-andenken-tiere.jpg) · [375×548](2026-11-03-produktprofile-vorschau/modern-iphone-se-text.jpg) · [390×664](2026-11-03-produktprofile-vorschau/modern-iphone-13-text.jpg) · [Bildentwurf und Umsetzung](2026-11-03-produktprofile-vorschau/modern-vergleich.jpg).

Eine weiße Werkzeugzeile: gemeinsame Werkzeuge mittig über Canvas, Speichern ganz rechts. Ruhigere Kacheln, größere Beschriftungen, alle Kategorien/Originalmotive erhalten; gekoppelte Textauswahl pink, graue Größenpfeile dauerhaft sichtbar. Desktopplatte 939,87 px bei 1662×946, Footer 58 px. Kleine Handyansicht nachgebessert, damit Textleiste, Schritte und Preis lesbar bleiben. 20/20 gezielte Tests und Build grün. Screenshots zur Abnahme durch Chris; produktive Preis-/Formatbindung, vollständige Schrift-/Objektwerkzeuge und Designtransfer weiterhin separat.

Stand: 03.11.2026, Codex/Astra. Basis Code `3eb2ea43c5383571094b8da1017ade9f4884eb72`; eigener Branch `dev/konfi-produktprofile-vorschau-20261103-astra`. Auftrag von Chris: visuelle Vorschau der besprochenen Oberfläche, einfache Anbindung verschiedener Produkte, automatische Foto-Sichtbarkeit und gründlicher Ladezeit-Check. **Keine Änderungen an App-Laufzeit, Katalog, Shopify oder Live-Systemen.**

## Ergänzung: Andenken für Menschen und Tiere getrennt (03.11.2026)

Quelle: Chris' anschließende Chatentscheidung „Andenken auch in Tiere und Menschen unterscheiden“. Zwei ausdrücklich gebundene Empfehlungen in der lokalen Studie: **Andenken Menschen** mit Kreuz, Engel, Kerze, Herz, Rose und Flügeln (74 passende Originalmotive); **Andenken Tiere** mit Pfotenherz, Pfote in Hand, Regenbogen Tiere, Pusteblume mit Pfoten, Pfotenspur und Flügeln (44 Originalmotive). Die Motive sind kuratierte Vorschläge, keine bestätigte Verkaufsrangliste. Die Trennung betrifft nur „Bestseller“: alle 721 Motive / 47 Kategorien bleiben in beiden Profilen frei wählbar.

Fünf lokale Profilbeispiele statt vier. Das D204-Hundefoto gehört nur zur Tier-Ansicht; die Menschen-Ansicht verwendet eine Textgestaltung ohne erfundenes Portrait. Foto-Fähigkeit, Zubehörgruppen und unabhängige Entwürfe bleiben erhalten. Keine Änderung an produktiven Kennungen oder Katalogdaten.

20/20 gezielte Vorschau-/Profil-/Hostingtests und Build grün. Browser bestätigt beide Themen; Profilumschaltung auf 375×548 sichtbar und ohne seitlichen Überlauf geprüft. Kein realer iPhone-/Warenkorb-/Linux-Volltest. [Menschen](2026-11-03-produktprofile-vorschau/themen-andenken-menschen.jpg), [Tiere](2026-11-03-produktprofile-vorschau/themen-andenken-tiere.jpg), [375×548](2026-11-03-produktprofile-vorschau/themen-andenken-tiere-375.jpg). Entwurfs-PR #161, nichts gemergt oder live gestellt. Nächster Schritt: Chris prüft die zwei Themenvorauswahlen; produktive Katalogbindung bleibt ein eigener Schritt.

## Ergänzung: Bestseller passend zum Produktthema (03.11.2026, erster Stand)

Chris: „Bestseller-Motive müssen sich ändern. Immer themenorientiert. Andenken, natürlich Kreuze usw., Türschilder andere.“ In der lokalen Vorschau bindet jedes Produkt jetzt ausdrücklich seine Motivempfehlungen. Keine Ableitung aus Material oder Titel und kein globaler Ersatz bei fehlender Zuordnung.

- Gedenktafel: Kreuz, Engel, Kerze, Blätterherz, Rose und Engelsflügel zuerst; 74 vorhandene Motive aus den passenden Themen. Türschild/Funkklingel: Haus, Strich-Haus, Herzlinie, Leuchtturm, Anker, Baum zuerst; 49 passende Motive. Zunächst 18 sichtbar, „Mehr anzeigen“ erweitert jeweils um 18. Beides sind kuratierte lokale Beispiele, keine belegten Verkaufsranglisten oder neuen Katalogfreigaben.
- Alle 721 Originalmotive und 47 Einzelkategorien bleiben zugänglich. Nur die Vorauswahl „Bestseller“ ist thematisch. Originalnamen, Kennungen und SVGs bleiben erhalten. Ein eigenes Thema lässt sich über `motifRecommendations` im Produktprofil zuweisen, unabhängig von Foto, Zubehör oder Material.
- 18/18 gezielte Vorschau-/Profil-/Hostingtests und Build grün. Browser: Produktwechsel zeigt die passende Startliste; bei Gedenktafeln 18→36 per „Mehr anzeigen“, freie Auswahl „Leuchttürme“ weiterhin möglich. Kein erneuter Linux-Gesamt- oder realer iPhone-Test für diese reine Filteränderung.
- Bilder: [Türschild](2026-11-03-produktprofile-vorschau/themen-tuerschild-motive.jpg), [Gedenktafel](2026-11-03-produktprofile-vorschau/themen-gedenktafel-motive.jpg).

Weiterhin ausschließlich lokale Studie / Entwurfs-PR #161. Der separat gezeigte modernere Bildentwurf ist noch keine vollständig umgesetzte Oberfläche. Die Manufaktur-Startseite gehört ausdrücklich in einen anderen Chat. Keine App-/Katalog-/Shopify-/Live-Änderung.

## Korrektur nach Chris' Rückmeldung (03.11.2026, vor der Themen-Ergänzung)

- Eine Werkzeugzeile direkt über dem Canvas: Zum Produkt links, Vollbild/Rückgängig/Wiederholen/Hilfe/Ebenen exakt mittig, Entwurf speichern rechts. Zusätzliche Produktüberschrift und Status mit zwei Häkchen entfernt.
- Canvas bei 1440×765: Platte jetzt 751,16 statt 562,5 CSS-px breit; 100% nutzt die tatsächlich verfügbare Fläche mit 2% Einpassreserve. Zoom skaliert die gesamte Platte samt Bemaßung: 125% = 938,96 px, Rückstellung wieder 751,16. Vergrößerte Bereiche sind scrollbar; Maßtexte bleiben 120/80 mm. Kein globaler 760-px-/Viewport-Höhencap mehr.
- Footer 58 statt 77 px (Desktop), 62 statt 72 px (Mobil), Button „In den Warenkorb“ führt weiterhin nur zur lokalen Prüfansicht. Kein echter Warenkorbzugriff.
- Alle **721 Originalmotive / 47 Kategorien**, plus „Alle Kategorien“ und „Bestseller“ (=49 Auswahleinträge). Originalnamen und SVGs aus dem bestehenden Runtime-Bestand. Master-Startauswahl mit 18 Motiven, Haus/Strich Haus/Herzlinie zuerst; keine behauptete Verkaufsrangliste oder neue Bestseller-Freigabe. Semantische Suche und Kategoriegruppen verwenden die vorhandenen Master-Helfer.
- Metadaten erst beim Öffnen von Motive (156.576 Bytes unkomprimiert), einzelne SVGs bei Bedarf. Kein kompletter Motiv-/Font-Bundle beim Start. Mehr anzeigen erweitert 18→36 direkt im Bereich.
- Optionskacheln wieder mit Icons. Befestigung verwendet den vorhandenen Master-Renderer; Funkklingel-/Zubehörbilder sind UI-Schemata der lokalen Muster, keine neue geometrische oder preisliche Produktbindung.
- Browser: Desktop 1440×765, 390×664 und 375×548. Auf SE Textleiste 61 px, zwei Zeilen; Schrittleiste endet bei y=486 genau vor dem Footer. 14/14 gezielte Vorschau-/Profil-/Hostingtests grün, Vite-Build grün. Kein erneut behaupteter Linux-Gesamtlauf oder realer iPhone-Test.

Aktuelle Bilder: [Desktop mit Optionen](2026-11-03-produktprofile-vorschau/korrektur-desktop-optionen.jpg), [Bestseller](2026-11-03-produktprofile-vorschau/korrektur-desktop-motive.jpg), [Leuchttürme](2026-11-03-produktprofile-vorschau/korrektur-desktop-kategorie.jpg), [iPhone SE](2026-11-03-produktprofile-vorschau/korrektur-iphone-se-text.jpg), [iPhone 13](2026-11-03-produktprofile-vorschau/korrektur-iphone-13-text.jpg). Diese Korrektur ersetzt die anfänglichen Angaben zu neun Motivbeispielen und zur kleineren Canvas-Größe.

**Weiterhin Entwurfs-PR #161, lokale Studie, keine Master-/Live-Installation. Visuelle Abnahme durch Chris offen.**

## Ergebnis zur Entscheidung

Den vorhandenen Master weiterverwenden. Jedes Produkt bindet ein versioniertes Optionsprofil und ausdrücklich erlaubte Fähigkeiten. Die Oberfläche entsteht daraus; Produktnamen, Materialbezeichnungen und vermutete Eigenschaften dürfen keine Schalter ersetzen. Neue Produkte mit vorhandenen Optionen sollen nur Katalog-/Excel-Zuordnungen benötigen. Ein wirklich neuer mechanischer Aufbau braucht weiterhin ein eigenes geprüftes Modul.

Die lokale Vorschau läuft bei Chris auf **http://127.0.0.1:8171/**. Oben lassen sich fünf Beispiele umschalten. Quellcode: [prototypes/produktprofile](../../prototypes/produktprofile/README.md). Es ist eine isolierte Bedien-/Layoutstudie, kein zweiter produktiver Konfigurator.

| Beispiel | Eigener Optionsbereich | Foto | Logo |
|---|---|---|---|
| Türschild | Formatanzeige, Befestigung | ausgeblendet | sichtbar |
| Andenken Menschen / Andenken Tiere (zwei Profile) | Befestigung einschließlich Silikon; Ständer; Spray jeweils getrennt | sichtbar | ausgeblendet |
| Funkklingel | Klingelposition, Acrylfarbe, Rahmen | ausgeblendet | ausgeblendet |
| Festes Produkt ohne Optionen | kompletter Optionsbereich entfällt | ausgeblendet | ausgeblendet |

Die Tabelle beschreibt **die fünf lokalen Muster**, keine neue Freigabe für alle Produkte dieser Art. Insbesondere darf aus „Schiefer“ oder „Gedenktafel“ keine pauschale Fotoerlaubnis folgen. Die tatsächliche Produkt-/Verfahrenszuordnung bleibt maßgeblich, auch bei Schiefer Premium ohne Foto.

## Verbindliche Grundlagen aus Chris' Chat

- Ein unveränderlicher gemeinsamer Master; Unterschiede der Produktlinien betreffen deren Ausführungen und Fähigkeiten.
- Befestigungen nach Excel. Bei Gedenktafeln Silikon unter Befestigung; zusätzlich ein Ständer in Klar oder Schwarz; Spray unabhängig dazu. Keine Preise oder Lochgeometrie erfinden.
- Foto ausblenden, wenn beim konkreten Produkt nicht möglich. Foto und Vektorlogo sind getrennte Fähigkeiten.
- Zusammengehörige Zeilen wie „Heimathafen / von“ in einem mehrzeiligen Feld. Designwechsel übernimmt Kundentexte und Fotos, die neue Vorlage bestimmt ihre Anordnung. Nicht jedes alte Motiv automatisch mitnehmen.
- Designkacheln nur als Bilder mit Lupe unten rechts. Motive: Suche, Kategorie mit Bestseller vorausgewählt, drei Spalten, „Mehr anzeigen“ im selben Bereich; Anklicken fügt hinzu.
- Vorlagenmotiv inklusive; weitere/geänderte Motive 169 Cent, eigenes Vektorlogo 1299 Cent. Bindung und echte Preisberechnung bleiben im bestehenden Master.
- Entfernte dunkle Kopfzeile, kompakte gemeinsame Werkzeugzeile, etwas kleinere Arbeitsfläche mit sichtbarer Bemaßung, farbig abgesetzter Footer; Zoomregler in der Vorschau. Mobil wächst die Vorschau beim Scrollen.
- Gestaltung und Originalbilder bleiben erhalten; keine Schriftdateien ins Code-Repo. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt für echte Designs verbindlich. Diese Studie gibt keine neue Produktionsgestaltung frei.

## Befunde an der aktuellen Quelle

### 1. Gute vorhandene Grundlage, nicht neu bauen

[execution-registry.mjs](../../app/configurator/variant-m/execution-registry.mjs), [product-execution-module.mjs](../../app/configurator/variant-m/product-execution-module.mjs) und [product-module-context.mjs](../../app/configurator/variant-m/product-module-context.mjs) trennen bereits gemeinsame Bedienung und Ausführungen. Geräteerkennung verwendet gespeicherte Schemas. Die Pakete für Ausführungen werden separat gebaut. [mobile-steps.mjs](../../app/configurator/variant-m/mobile-steps.mjs) kann Schritte aus sichtbaren Bereichen ableiten. Diese Teile erhalten und erweitern.

### 2. Profilwahl ist noch nicht vollständig datengetrieben

`familyExecution()` enthält feste Listen von Familienkennungen. Selbst ein ausdrücklich gespeichertes `productExecution.kind` wird gegen diese Zuordnung geprüft. Neue Familien mit bekannten Optionen benötigen deshalb teilweise Codeänderungen. `generic` fasst außerdem verschiedene Fälle zusammen: bewusst keine Spezialausführung, unbekannte Zuordnung und deaktiviertes Modul.

Vorschlag: im Katalog einen geprüften Profilverweis mit Version speichern. Beim Import gegen ein Register bekannter Module validieren. **Explizit „keine Optionen“ ist gültig; fehlende/ungültige Zuordnung ist ein Importfehler**, nicht stillschweigend eine leere Oberfläche. Bestehende Kennungen unverändert übernehmen. Neue Profilkennungen erst im gemeinsamen Register festlegen.

### 3. Gedenktafel-Zubehör darf nicht aus Bohrlöchern abgeleitet werden

[memorial-execution.mjs](../../app/configurator/variant-m/memorial-execution.mjs) teilt Werte der Gruppe `mounting` anhand leerer `holes` in „Befestigung“ und „Zubehör“ auf; beide Bereiche behalten dieselbe Auswahlgruppe und bieten Zubehör **alternativ** zur Befestigung. Damit wäre ein dort gebundener Ständer nicht unabhängig von Silikon/Bohrlöchern. Silikon ohne Löcher kann zudem im falschen Abschnitt erscheinen.

Das neue Gedenktafel-Modul ist laut aktuellem Stand noch deaktiviert; dies ist **kein Nachweis, dass alle heutigen Live-Gedenktafeln diesen Fehler haben**. Vor seiner Freischaltung explizite getrennte Gruppen in Quelle und Preisvertrag herstellen: Befestigung, Ständer (ohne/klar/schwarz), Imprägnierspray (ohne/mit). Keine Zuordnung nur anhand von `holes.length`.

### 4. Foto-Schutz existiert bereits, ein gemeinsamer Entscheider fehlt noch

[contract.mjs](../../app/configurator/variant-m/contract.mjs) verlangt ein ausdrückliches `photo.enabled`, entfernt bei deaktiviertem Foto entsprechende Vorlagen/Platzhalter und prüft Fotoobjekte. [katalog-convert.mjs](../../app/workshop/katalog-convert.mjs) berücksichtigt `process.tools.photo`. Das ist zu erhalten.

[ux.mjs](../../app/configurator/variant-m/ux.mjs) und [ux-model.mjs](../../app/configurator/variant-m/ux-model.mjs) verteilen die Anzeigeentscheidung jedoch auf mehrere Helfer: Verfahrensfähigkeit, Fotoeinschaltung, Fotoslot der gewählten Vorlage, alte Upload-Ebene und Vektorlogo. Einzelne Helfer behandeln fehlende Werte großzügiger als der Vertragsprüfer. Das ist ein Konsistenzrisiko, **kein nachgewiesener Sicherheitsdurchbruch**.

Ein gemeinsamer Resolver sollte aus Produktprofil + Verfahren + aktueller Vorlage erlaubte Aktionen berechnen. UI, Schrittleiste, Hilfe, Import und Serverprüfung müssen dieselbe Entscheidung verwenden. Ohne Fotoerlaubnis weder Fototab noch Upload-/Beispielaufrufe laden. Ein erlaubtes Logo bleibt davon unabhängig. Bei einem Wechsel auf ein Produkt ohne Foto bestehende Kundendaten nicht still löschen: unvereinbare Gestaltung erklären und Rückkehr ermöglichen; verbotene Ausgabe serverseitig verhindern.

## Einfache Produktanlage ohne spätere Sonderfälle

Die Excel-Vorgaben bleiben fachliche Quelle, der versionierte Katalog ist der geprüfte Laufzeitstand. Keine zweite Preis-/Geometrietabelle im UI.

| Angaben je Artikel/Produktstand | Zweck und Prüfung |
|---|---|
| stabile Produkt-/Linien-/Familienkennung; Profilverweis + Version | eindeutig auf bestehendes Modul auflösen; unbekannt blockiert Import |
| Material + Verfahren; Form/Größenverweise | vorhandene Geometrie und passende Designs verwenden |
| Befestigungsgruppe und erlaubte Werte | nur vorgegebene Bohrungen/Halter/Silikon; genau zulässige Kombinationen |
| Zubehörgruppen, Einzel-/Mehrfachwahl, Pflicht ja/nein | Ständer und Spray unabhängig; leere Gruppen gar nicht anzeigen |
| Foto erlaubt, Logo erlaubt; Quellstatus | ausdrücklich ja/nein; unbekannt bleibt offen, keine automatische Materialvermutung |
| Designbearbeitung frei oder bewusst gesperrtes Gesamtdesign | Druckdesigns bei Bedarf erst entsperren; keine versehentliche Sperre normaler Motive |
| Referenz auf Preisregel und Shopify-Variantenbindung | Centbeträge aus Quelle; vollständig mit Optionen/Produktion abgleichen |
| Bilder und erklärende Texte je Option | Originale referenzieren; keine erfundenen Zubehördaten |

Für viele Produkte darf dasselbe Profil wiederverwendet werden. Produktbezogene Einschränkungen (z. B. nur eine Befestigung) stehen in den gebundenen Daten. Ein Produkt ohne wählbare Werte benötigt keinen Ausführungsschritt. Preise/Bohrungen bleiben auch bei versteckter Auswahl im Produktstand erhalten.

Vor jedem Import: Dry-run mit Anzahl Produkte, Profilverteilung, Foto/Logo ja-nein-offen, fehlenden Preisen, ungültigen Kombinationen, fehlenden Bildern und nicht zuordenbaren Designs. Danach lokale Vorschau je Profil und je abweichender Kombination. Erst nach Freigabe normale bestehende Import-/Shop-Pipeline. Veröffentlichung und Prüfstatus nicht aus dem bloßen Vorhandensein eines Profils ableiten.

## Ladezeit: belegter Stand und konkrete nächste Arbeit

Die folgenden Zeiten sind **die bereits eingecheckte Live-Messreihe vom 03.11., keine in diesem Auftrag neu gemessenen Live-Zeiten**. Quelle: [Issue139-Bereitstellung](2026-11-03-issue139-bereitstellung.md) mit Rohprotokollen und Skript-Hash. Sechs aufeinanderfolgende frische Browserkontexte, Handy CPU ×4.

| Produkt | Desktop bedienbar | Handy bedienbar | Produktmodell |
|---|---:|---:|---:|
| Edelstahl D8 12×8 | 22,9 s | 11,9 s | 150 KB |
| Acryl D8 12×8 | 12,8 s | 9,5 s | 24 KB |
| AOSU | 6,5 s | 9,6 s | 129 KB |

Ziele ≤4 s Desktop / ≤6 s Handy sind weiter verfehlt. **Beim Edelstahl-Desktoplauf kamen die Produktdaten erst nach 12,9 s an**, beim Handy nach 7,1 s; Acryl Desktop nach 6,4 s. Dies ist Zeit ab Messbeginn bis Datenankunft, **nicht gleichbedeutend mit 12,9 s reiner Server-Rechenzeit**. Ein kalter erster Start ist eine mögliche Erklärung, bisher nicht bewiesen.

Modellverkleinerung, WebP-Oberflächen, getrennte Gerätepakete, gehashte Bundle-Caches und Vorwärmen sind schon vorhanden. [shop-entry-client.mjs](../../app/workshop/ui/shop-entry-client.mjs) lädt private Designressourcen bereits mit bis zu sechs gleichzeitigen Abrufen. Eine erneute pauschale „alles lazy/parallel/WebP“-Umstellung würde die offene Wartezeit nicht erklären.

### Priorität 1: Wartezeit bis Produktdaten aufteilen

In [shop-entry.mjs](../../app/workshop/shop-entry.mjs) liegen auf dem Startpfad Sitzung/Variantenbindung, `modelFor()`, `allowedAssets()`, Startprojektion/Verkleinerung und Galerievorbereitung. `modelFor()` holt zunächst das vollständige Werkstattmodell. `allowedAssets()` scannt bei kaltem Cache das gesamte Modell über JSON-Serialisierung. Die vorhandene Cachebegrenzung ist zu erhalten. [shop-model-slim.mjs](../../app/workshop/shop-model-slim.mjs) muss bei kalten Einträgen ebenfalls Schriften/Projektion aufbereiten.

Nächste Änderung: eng begrenzte Zeitmarken/`Server-Timing` für Auth, Bindung, Datenlesen, Assetindex, Projektion, Galerie und Serialisierung; im Browser Shop-Einstieg, Weiterleitung, Editor-Dokument, Modellantwort, Startschriften und erste bedienbare Ansicht getrennt erfassen. Keine Sitzungstoken, Texte oder Fotos protokollieren. Ohne diese Aufteilung keine bestimmte Funktion als bewiesene Hauptursache benennen.

### Priorität 2: kalten Start und wiederholte Aufbereitung vermeiden

Nach Messbeleg unveränderliche Startprojektion/Assetindex einmal je veröffentlichtem Produktstand vorbereiten. Cache-Schlüssel mindestens Mandant, Produkt, Revision, gewähltes Startdesign/Variantenkontext und relevante Ressourcen-/Profilversion. Nur authentifizierte Antwort um die Projektion bauen; Sitzung und aktive Bindung weiterhin bei jeder Anfrage prüfen. Keine privaten Modelle öffentlich zwischenspeichern, keine fertigen Bestellstände überschreiben. Vorbereitung nach Deploy/Import gezielt ausführen; keine unkontrollierte Vollkatalog-Aufwärmung.

### Priorität 3: nur Startressourcen auf den kritischen Pfad

Vorhandene Bundle-/Vorwärmlogik erhalten. Startschrift, Grundplatte und tatsächlich sichtbares Foto priorisieren; Designs/Motive paginiert und erst bei Bedarf. Foto-/Logo-Module für unzulässige Produkte gar nicht anfordern. In `shop-model-slim.load()` werden Katalog-Fontdateien nacheinander geladen; begrenztes Parallelisieren prüfen, aber erst klären, ob dieser Hintergrundpfad den konkreten Start blockiert. Keine riesige Bibliothek als vermeintliche Abkürzung in den Browser verschieben.

### Abnahme für die spätere Optimierung

Gleiche drei echten Produkte plus Foto-Gedenktafel; je kalter Serverprozess und warmer Prozess, frische Browser-Caches, Desktop und Handy-Bedingungen. Ein Läufersatz ohne Auswahl günstiger Wiederholungen; Teilzeiten, Datenmengen und Fehler nennen. Die UI darf frühe Bedienbarkeit nicht melden, solange Startschrift/Foto fehlen. Anschließend Gestaltung, Größen-/Designwechsel, Preisvertrag, Entwurf und Warenkorb prüfen. Kein Erfolg anhand der schnellen isolierten Studie behaupten.

## Nachweise dieser lokalen Arbeit

- 22 gezielte bestehende Tests bestanden: Ausführungsregister, Geräteauswahl, Logo-Upload, Startprojektion und Modellverkleinerung. Erstlauf 21/22 mit Windows-`EPERM` beim Umbenennen einer temporären Bundledatei; derselbe Lauf mit eigenem TEMP/TMP im Arbeitsverzeichnis 22/22, ohne Assertions zu ändern.
- 5 Profiltests bestanden: Foto/Logo getrennt; kein leerer Optionsschritt; Silikon + schwarzer Ständer + Spray gleichzeitig; fehlende Fähigkeitsdaten abgewiesen; keine Gedenktafeloptionen bei Funkklingel.
- React/Vite-Build und 4 Hosting-Verpackungstests erfolgreich. Keine App-Datei verändert. Kein Vollauf der unveränderten Produktiv-App erforderlich; dies ist keine neue Live-Abnahme.
- Browser: Desktop, 390×664 und 375×548. [Sichtprüfung und Grenzen](../../prototypes/produktprofile/design-qa.md). [Türschild](2026-11-03-produktprofile-vorschau/desktop-tuerschild.jpg), [Texteingabe](2026-11-03-produktprofile-vorschau/desktop-text.jpg), [Gedenktafel](2026-11-03-produktprofile-vorschau/desktop-gedenktafel.jpg), [Funkklingel](2026-11-03-produktprofile-vorschau/desktop-funkklingel.jpg), [ohne Optionen](2026-11-03-produktprofile-vorschau/desktop-ohne-optionen.jpg).

## Grenzen und nächster Schritt

Die Studie verwendet lokale Originalbilder/-schriften und einen kleinen Katalogauszug. Keine vollständige Bibliothek oder verbindliche Bestsellerliste. Sie demonstriert Layout, Profilumschaltung, getrennte Auswahlgruppen, Textfelder, Modale, Zoom, Entwurf, Upload und lokale Hinzufügung. Die produktive Geometrie-, Drag-, Schrift-, Preis-, Logo-Konverter-, Designtransfer- und Warenkorblogik wird **nicht** durch diese Studie ersetzt. Andere Designkacheln zeigen ihre Originale; übernommen werden Eingaben in den lokalen Zustand, noch nicht semantisch in jede fremde Vorlage eingebaut. Funkklingel-Farbe/Rahmen sind Auswahlbeispiele, keine fertige Material-/Geometriesimulation. Das Gedenktafelbild ist ein Optionsmuster mit Original-D204-Fotobeispiel, keine neue D204-Freigabe. Fotos werden lokal angezeigt, nicht zum Server übertragen.

Als Nächstes Chris' visuelle Rückmeldung einarbeiten. Danach ein separates Paket für den gemeinsamen Profilresolver und das Zubehör-Datenmodell; parallel inhaltlich getrennt die Startzeitinstrumentierung. Bestehende Preis-/Katalogarbeiten von Claude abgleichen. **Nichts aus dieser Vorschau automatisch in den Master übernehmen oder live stellen.**
