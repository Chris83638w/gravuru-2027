# Gravuru 2027 – Master-Bauplan

Stand: 30.09.2026. Diese Projektunterlage sichert die besprochenen Anforderungen und den nächsten Umsetzungsschritt. Sie ist ein Bauplan mit Übergabehinweisen, kein Nachweis einer fertigen App. Maßgeblich sind die Entscheidungen von Mikail in diesem Chat; vorgeschlagene Umsetzungsschritte sind unten ausdrücklich gekennzeichnet.

Ergänzende Recherche vom 30.09.2026: [Wettbewerbsvergleich und AR](KONFI-VERGLEICH-UND-AR.md). Behandelt nachweisbare Vergleichsfunktionen, zusätzliche Anforderungen für Kunden/Produktion sowie einen vorgeschlagenen personalisierten AR-Pilot für Wand und Tisch. Empfehlungen von bestätigten Anforderungen und fertigen Funktionen unterscheiden.

> Aktuelle Entscheidung vom 30.09.2026: Das neue eigenständige Projekt heißt **Gravuru 2027** (`Chris83638w/gravuru-2027`). Zunächst genügt eine hochwertige 2D-Vorschau. **AR wird auf später verschoben.** Frühere AR-Pilotempfehlungen sind kein aktueller Umsetzungsauftrag. Herkunftsangaben und bisherige Prüfergebnisse unten beziehen sich auf das alte Projekt. Siehe [START_HERE.md](START_HERE.md).
## Ziel und Arbeitsweise

Eine neue, getrennt testbare Shopify-App mit vollständiger Werkstattverwaltung auf Grundlage der brauchbaren Bestandsteile entwickeln. Den bestehenden Kundenkonfigurator einschließlich Motiven übernehmen und gezielt verbessern. Bestehende Vergleichsversion erhalten. Der Nutzer möchte die Oberflächen zunächst gemeinsam besprechen. Ausgewählte Bildentwürfe sind keine implementierten Funktionen.

Letzte ausdrückliche Vorgabe: den vorhandenen Quellcode auf Eignung, Logik, Ablauf und Verbesserungen prüfen; passende Teile übernehmen und andere ändern. „Master-Version“ bezeichnet hier die neue gemeinsame App-Grundlage. Eine „Mastervorlage“ ist dagegen ein wiederverwendbarer Produktdatensatz innerhalb dieser App.

Funktionen, geprüfte Ergebnisse und offene Voraussetzungen ehrlich unterscheiden. Keine automatische Behauptung verlustfreier Rekonstruktion beliebiger Bilder, vollständiger Vektorisierung, verbindlicher Druckfarbwiedergabe oder bereits erfolgter Veröffentlichung. Der Nutzer erwartet später eine nutzbare Excel-Datei und eine GitHub-Übergabe, mit der eine andere KI nahtlos weiterarbeiten kann.

## Nachweisbarer lokaler Bestand

Am 30.09.2026 im Quellcode gelesen; gezielte Prüfungen sind im Abschnitt „Prüfstand“ dokumentiert:

- `automation/product-pipeline/workbench.mjs`: Produkt-IDs, Anlegen/Bearbeiten/Archivieren, JSON-Dateiablage mit Revisionen, mehrere Designs je Produkt, PDF-Import, Prüfungen, Konfigurationsausgabe und Shopify-Übergabe.
- `automation/product-pipeline/workbench-library.mjs`: Material-, Kategorie-, Befestigungs- und Beschreibungsvorlagen; Materialreferenzen und Bibliotheksrevisionen.
- Der bestehende Produktvalidator erlaubt derzeit `rect` und `ellipse`, eine Produktbreite/-höhe und 0/2/4 Bohrungen. Das ist noch kein Nachweis für freie PDF-Konturen oder das geplante Variantenmodell.
- `configurator/variant-m/`: vorhandene Kundenruntime und lokale Acrylglas-Erweiterungen. `review-proposal.mjs` enthält die getrennte Diskussionsansicht mit `?model=acryl&review=1`.
- `configurator/variant-m/acrylic-print.py`: lokale Druckausgabe vorhanden. Die bisherigen Prüfungen und verbleibenden Grenzen stehen in `design-qa.md`; hier nicht erneut verifiziert.
- `automation/product-pipeline/customer-checkout-store.mjs`: bereits vorhandene SQLite-Ablage für Kundensitzungen, Mediendaten und unveränderliche Gestaltungspakete mit Prüfsummen. Nicht mit der JSON-basierten Produktverwaltung oder der geplanten gemeinsamen Produktdatenbank verwechseln.
- Diese Arbeitskopie ist unvollständig. Insbesondere fehlt lokal die vom Server erwartete `platform/sources/workshop/public/produktanlage.html`. Alte Übergabetexte beweisen keinen aktuellen Live-Stand. Vor Implementierung vollständigen Quellstand und Abhängigkeiten mit GitHub abgleichen.

Am 30.09.2026 über GitHub erneut bestätigt: privates Repository `Chris83638w/gravuru-shopify`, Quellbranch `feat/variante-m-profile-20260924`, Commit `b564422edadaf56a27a09f99e1140a546e5e7145`. Der Aufgabenbranch `task/acrylglas-konfigurator-20260929` stand vor dieser Dokumentationsarbeit auf derselben Basis. Reservierung des Dokumentationsbereichs in `PROJECT/GEMEINSAMER-STAND.md`: Commit `6ee78075d3f148443a11bd8b7e8347c585ad5fc3`. Diese Sicherung betrifft Bauplan und Prüfbericht. Lokale Acryl-Quelldateien, Medien und Laufzeitabhängigkeiten sind damit noch nicht vollständig auf GitHub gesichert; kein Deployment.

## Geprüfte Wiederverwendung für die Master-Version

| Bestand | Entscheidung für die neue Grundlage | Grund / erforderliche Anpassung |
| --- | --- | --- |
| Kundeneditor, Motivbibliothek, Text-/Fotowerkzeuge | Weiterverwenden und produktabhängig erweitern | Bedienung und vorhandene Ressourcen erhalten; Fähigkeiten, Profile und Geometrie aus einem Produktstand ableiten. |
| `contract.mjs`, Geometrieprüfungen, Cent-Berechnung | Regelwerk weiterverwenden | Produktsonderfälle und doppelte Preisregeln ersetzen; Auswahl und Bestellung serverseitig gegen dieselbe Version prüfen. |
| `workbench.mjs` / `workbench-library.mjs` | Abläufe und Prüfungen übernehmen, Speichermodell erweitern | IDs, Revisionen, Archivierung, Material-/Verfahrensprüfung und Importprüfung sind brauchbar. Eine einzelne Form/Größe je Produkt reicht nicht. |
| Produkt-JSON-Dateien | Kontrolliert in verknüpfte Datenbank migrieren | Beziehungen, konkurrierende Bearbeitung, Stapeljobs und Suche benötigen ein gemeinsames transaktionales Modell; bestehende IDs erhalten. |
| SQLite-Kundenspeicher | Eigentumsprüfung, Prüfsummen und wiederholbare Vorgänge übernehmen | Ein guter vorhandener Baustein; ersetzt nicht die neue Produktverwaltung. Datenmigration und Zugriffsschutz separat prüfen. |
| Fünf Bearbeitungsprofile | Als Darstellungs-/Methodenprofile weiterverwenden | Der Quellcode nennt sie ausdrücklich keine Maschinenparameter. Freigegebene Produktionsprofile mit Versionsbindung ergänzen. |
| SVG-/PDF-Ausgabe und Schriftpfade | Nach Verfahren getrennt übernehmen und prüfen | Schriftkonturen sind nützlich; freier Formpfad, Weiß, CMYK, Bildauflösung und Gravurraster benötigen eigene Abnahmen. |
| Acryl-Szene und Sockelwechsel | Als Pilot und Referenz verwenden | Produktabhängige Szene, Geometrie und Verdeckung generalisieren; fotografische Glaubwürdigkeit anhand realer Rohlinge prüfen. |
| `review-proposal.mjs` | Ausschließlich Diskussionsprototyp | Versteckt Reiter pauschal und nutzt feste Prozentpositionen. Akzeptierte Gestaltung in reguläre, bedingte Komponenten übertragen. |
| Vorhandene Shopify-Übergabe | Bindung, Journal und Entwurfsablauf prüfen und übernehmen | Mehrere Produktbindungen, echte Variantenpreise und wiederholte Imports dürfen keine Duplikate oder unbemerkten Live-Änderungen erzeugen. |

## Logikprüfung und vorrangige Verbesserungen

„Befund“ bezeichnet beobachteten Code oder die aktuelle Oberfläche. „Planungsrisiko“ bezeichnet eine im neuen Modell zu verhindernde Fehlfunktion; nicht jeden solchen Fehler gibt es bereits im Bestand.

| Priorität | Befund oder Planungsrisiko | Konsequenz für die Master-Version |
| --- | --- | --- |
| Hoch | **Befund:** `carryPersonalObjects` verwendet nach erfolgloser Feldzuordnung den ersten freien Fotoplatz (`ux-model.mjs`, Zeilen 9–25). Ein synthetischer Test ordnete ein Feld `wedding` dem Feld `baby` zu. | Gemeinsame semantische Feldkennung oder ausdrücklich hinterlegte Zuordnung verlangen. Andernfalls Bild in der persönlichen Ablage behalten und Zuordnung anbieten. Kein ungefragtes Umdeuten oder freies Zusatzobjekt außerhalb der neuen Form. |
| Hoch | **Befund:** Großformat-Sockelaufschlag ist sowohl in `acrylic-product.mjs:26` als auch in `contract.mjs:96` fest codiert. Aktuelle Preisprüfungen bestehen. | Eine gemeinsame Varianten-/Zubehörpreisregel mit Cent-Beträgen; Backend berechnet verbindlich. Nicht als bereits beobachteten falschen Preis darstellen. |
| Hoch | **Befund:** Produktvalidator kennt nur Rechteck/Ellipse und eine Breite/Höhe (`workbench.mjs:51–68`); Import akzeptiert dort PDF (`:98–105`). | Freie Formen und SVG-Designs benötigen echte Adapter und ein Variantenmodell. Nur einen weiteren Uploadbutton einzubauen erfüllt die Anforderung nicht. |
| Hoch | **Befund:** Produktionsprofil fehlt als verbindliches Maschinenprofil; Acryl enthält `iccProfile:null`. | Darstellungsfarbe und Produktion trennen. Fertigungsfreigabe nur mit vollständigem, geprüftem Profil. RGB-Bildschirmanzeige und PNG nicht als CMYK-Druckmaster ausgeben. |
| Hoch | **Planungsrisiko:** Ein Größenwechsel skaliert bereits im PDF enthaltene Bohrungen mit. | Außenform und parametrisierte Bohrbilder getrennt führen. Bei eingebetteten Löchern Originalgeometrie erhalten und Größenvarianten erst nach expliziter Zuordnung der Bohrregeln freigeben. |
| Hoch | **Planungsrisiko:** Durchscheinende Tönung wird von pauschaler Weißhinterlegung deckend gemacht. | Transparenz-/Weißregel je Bereich und Fertigungsprofil abbilden; in separater Weißvorschau prüfen. |
| Hoch | **Planungsrisiko:** Geänderter Master oder Drive-Datei verändert eine laufende Bestellung. | Bestellungen und veröffentlichte Produktstände auf unveränderliche Revisionen und Originalmedien binden. Aktualisierung erst als neue geprüfte Revision. |
| Hoch | **Planungsrisiko:** 100 Produkte × Größen × Formen × Designs erzeugen unzulässige Kombinationen. | Explizite Zuordnungstabellen und Verträglichkeitsprüfung. Nicht jede Kombination automatisch anlegen; fehlende Standardgestaltung blockiert die betroffene Variante. |
| Mittel | **Befund:** Basisansicht zeigt technische Einstecktiefe, Zoom, Designs und Backend-Druckaktion; Vorschaugriffe unten sind verdeckt. Die separate Diskussionsansicht löst Teile nur durch Sonderregeln. | Benutzeroberfläche anhand tatsächlicher Funktionen/Designauswahl aufbauen. Werkzeug-Overlay vor Szene/Sockel; Fertigungsaktion ausschließlich in autorisierter Verwaltung. |
| Mittel | **Befund:** Fotoersatz-Hinweis ist in der erfassten Vorschau klein; „Zeile 1–5“ beschreibt die Bedeutung der Texte nicht. | Größeren kontrastreichen Hinweis und semantische Bezeichnungen wie Namen, Ort und Datum aus den Vorlagen übernehmen. Tastaturbedienbaren Foto-Button ergänzen. |
| Mittel | **Planungsrisiko:** Gesperrtes Motiv verhindert zugleich erlaubte Text-/Farbänderungen. | Rechte je Element getrennt: Inhalt, Farbe, Fotoersatz, Verschieben, Skalieren, Löschen. Festes Layout schließt freigegebene Inhalte nicht aus. |
| Mittel | **Planungsrisiko:** Ein wiederholter Stapeljob legt zweite Produkte an oder überschreibt eine neuere Bearbeitung. | Stabile Zeilen-/Datensatz-IDs, erwartete Revision, Vorgangskennung und Konfliktansicht. Erfolgreiche Zeilen nicht erneut anlegen. |

Zusätzliche Verbesserung: Den Import von **Formkonturen**, **Designvorlagen** und **Kundenfotos** schon beim Einstieg eindeutig benennen. PDF/SVG darf das Design ersetzen, ohne versehentlich Materialform, Preis oder Produktbindung auszutauschen. Eine flache Datei kann trotzdem nicht zuverlässig beliebige Texte und Fotoplatzhalter automatisch erkennen; notwendige Zuordnung muss als verständlicher Prüfschritt sichtbar sein.

## Gemeinsamer Ablauf der neuen Werkstatt

1. **Grundlage wählen:** vorhandenen Master verwenden oder Konfiguration anlegen. Sofort stabile ID vergeben; Entwurf bleibt speicherbar, auch wenn noch Angaben fehlen.
2. **Material und Form festlegen:** Referenz und Stärke wählen, Kontur importieren, Originalmaß prüfen. Varianten, Bohrbilder und Zubehör zuordnen; unzulässige Kombinationen erklären.
3. **Designs zuordnen:** PDF/SVG ersetzen oder KI-Entwurf erzeugen. Editierbare Felder, erlaubte Änderungen und passende Form-/Größenvarianten bestimmen. Eine Standardgestaltung pro erlaubter Variante setzen.
4. **Profile und Darstellung prüfen:** Schriften, Motive, Farbwahl, Transparenz, Szene und Fertigung auswählen. Kunde sieht nur freigegebene Möglichkeiten. Masterwerte dürfen übernommen, ausdrücklich überschrieben oder bewusst leer gesetzt werden.
5. **Prüfen und aktivieren:** Vorschau, Preise, Pflichtfelder, Schrift-/Bildqualität, Konturen und Fertigungsprofil prüfen. Fehler blockieren die betroffene Freigabe, nicht das Speichern des Entwurfs. Shopify-Verknüpfung und Veröffentlichung gesondert sichtbar machen.
6. **Kunde gestaltet:** erlaubte Form/Größe/Design wählen, Text/Farbe ändern und Foto ersetzen. Beim Wechsel kompatible Daten erhalten, Unpassendes verständlich anzeigen; keine stillen Verluste. Rückgängig umfasst zusammengehörige Änderungen.
7. **Bestellung sichern:** aktuelle Auswahl, Preis, Geometrie, Medien und Versionen serverseitig prüfen und unveränderlich speichern. Ein im Browser geänderter Preis darf nicht maßgeblich sein. Fehlendes Pflichtfoto verhindert Abschluss.
8. **Produktion ausgeben:** aus exakt diesem Bestellstand SVG/PDF/PNG und Originale erzeugen. Hintergrundszene, Hilfsrahmen und Uploadhinweise bleiben außerhalb der Fertigung. Fehlgeschlagene Ausgaben sind erneut ausführbar, ohne eine neue Bestellung anzulegen.

Stapelverarbeitung verwendet dieselben Schritte und Regeln wie Einzelanlage. Tabellenansicht beschleunigt Zuordnungen, Galerie die Sichtprüfung und Detailbearbeitung einzelne Ausnahmen. KI-Vorschläge bleiben prüfbare Entwürfe. Eine Sammeländerung zeigt vorher, welche Produkte sie tatsächlich betrifft.

## Daten- und Zustandsregeln

Vorgeschlagene Modellgrundlage, noch nicht implementiertes Datenbankschema:

- Material, Formkontur, Bohrbild, Zubehör, Szene, Schrift-/Motiv-/Fertigungsprofil sind wiederverwendbare Datensätze mit eigener ID und Revision.
- Konfiguration und Konfigurationsrevision bilden den Produktstand. Zugeordnete Varianten referenzieren erlaubte Material/Form/Größe/Befestigung; Designzuordnungen begrenzen die gültigen Gestaltungen.
- Medienreferenzen enthalten Original, Prüfsumme, Dateityp, physische Maße beziehungsweise Pixelmaße und Herkunft. Produktions- und Vorschauableitungen sind getrennt.
- Shopify-Bindungen verbinden Shop, Produkt und Variante mit einem freigegebenen Konfigurationsstand. Keine Zuordnung allein anhand ähnlicher Namen.
- Importjob und Importzeile enthalten Ziel-ID, erwartete Revision, Eingabefingerabdruck, Bearbeitungsstatus, Fehler und Wiederaufnahmeinformation.
- Bestellung/Position hält den geprüften Auswahlstand mit Medien- und Profilrevisionen fest. Produktionsauftrag und Ausgaben beziehen sich auf genau diese Position.
- Produktzustände: Entwurf → geprüft → aktiv → archiviert. Änderung einer aktiven Fassung erzeugt einen neuen Entwurf; bestehende Fassung bleibt reproduzierbar. Archivieren entfernt die neue Auswahlmöglichkeit, nicht historische Bestellbelege.
- Importzustände: eingelesen → zugeordnet → geprüft → Entwürfe gespeichert → Aktivierung/Shopify-Übertragung. Teilerfolge und Konflikte je Zeile führen; keine falsche globale Erfolgsmeldung.
- Bei mehrfacher Unterkategorie-Zuordnung genau ein maßgebliches Profil oder ausdrückliche Produktzuordnung bestimmen. Nicht zufällig die zuerst gelesene Kategorie verwenden. Geerbter Wert, explizite Auswahl und bewusst leeres Profil sind verschiedene Zustände.

Zentraler Grundsatz: Vorschau, Preis und Export verwenden dieselbe aufgelöste Variante mit derselben Version. Bildschirmdarstellung darf zusätzliche Effekte besitzen, aber keine unabhängige Produktionsgeometrie.

## Prüfstand vom 30.09.2026

**Ausgeführt:** `node --test configurator/variant-m/contract.test.mjs configurator/variant-m/acrylic-product.test.mjs`: 19 Tests bestanden, 0 fehlgeschlagen. Erfasst unter anderem Acrylgrößen/Zubehörpreise, feste Geometrie, bearbeitbare Texte, Datenbindung und Uploadregeln. Zusätzlich kleiner synthetischer Aufruf von `carryPersonalObjects` mit verschieden benannten Fotofeldern; unerwünschte automatische Ersatzzuordnung reproduziert. Keine echten Kundenbilder verwendet.

**Aktuelle Browserbelege:** bestehende Basisansicht `http://127.0.0.1:8951/?model=acryl`, ohne Reload und ohne Veränderung der Gestaltung; nur zu den Textwerkzeugen gescrollt. Beide Screenshots im selben Lauf erfasst, als Originaldateien gespeichert und anschließend geöffnet:

1. Produktvorschau – **verbesserungsbedürftig**: Bild, Sockel und Preis sichtbar; untere Auswahlgriffe verdeckt, kleiner Fotohinweis, technische Einstecktiefe und Zoom weiterhin sichtbar. Hilfe liegt teilweise über dem unteren Bedienbereich. Beleg lokal: `PROJECT/audit-20260930/01-kundenvorschau.png`.
2. Textwerkzeuge – **brauchbare Grundlage mit Nacharbeit**: Texteingaben und ausgewähltes Feld erkennbar, Produktminiatur bleibt erreichbar; anonyme Zeilennamen, weiterhin fünf Reiter. Beleg lokal: `PROJECT/audit-20260930/02-textwerkzeuge.png`.

Die aktuelle Zugänglichkeitsstruktur bestätigt außerdem mm-Schriftgröße, „Eigene Farbe“ und „Druckdatei vorbereiten“. Allgemeine Texteingaben sind beschriftet; sichtbare kleine Ziele und verdeckte Griffe sind Bedienrisiken. Vollständige Tastatur-, Screenreader-, Kontrast- und Mobilgeräteprüfung ist damit nicht abgeschlossen. Die Screenshots gehören zum lokalen Prüfbericht und sind durch einen reinen Markdown-Upload nicht automatisch auf GitHub verfügbar.

**Grenzen:** Kein neuer kompletter Checkout, Probedruck, Master-Editor, freier Konturimport, Excel-/Drive-Import oder KI-Hintergrunddienst in diesem Lauf durchgehend getestet. Die neue Werkstatt ist noch nicht implementiert. Auch ein Bestehen der 19 vorhandenen Tests belegt diese geplanten Funktionen nicht.

## Bestätigte Oberflächen

- Produktübersicht: Variante 2, große fotografische Produktkarten, Suche nach Name/ID und Zugriff auf Master/Stapelverwaltung.
- Produktbearbeitung: Variante 2, links Bereiche und Elemente, mittig große realistische Produktvorschau, rechts Einstellungen zum gewählten Element.
- Referenz Produktübersicht: `C:/Users/Mikail Erdem/.codex/generated_images/01a0ebde-0530-7131-be42-b0868343b18a/exec-43aadbc2-b8d7-4973-97c9-9876ef46062a.png`.
- Referenz Produktbearbeitung: `C:/Users/Mikail Erdem/.codex/generated_images/01a0ebde-0530-7131-be42-b0868343b18a/exec-7bcb71f5-9667-4985-b9d7-896d0aabd2e5.png`.
- Stapelverarbeitung: drei Entwürfe gezeigt, noch keine einzelne Variante ausdrücklich gewählt. Vorgeschlagen ist, Tabelle für Zuordnung, Galerie für Sammeländerungen und Detailvorschau mit KI-Bearbeitung als ergänzende Ansichten zu verwenden.
- Stapelreferenzen in sichtbarer Reihenfolge: `exec-cb1e2313-ad99-433d-8e46-3f3e51fbcfe5.png`, `exec-b94c5a76-b747-431e-9d1e-ffea67263912.png`, `exec-15c85c27-5049-4087-9461-460e9a9bc00d.png` im gleichen Bildordner.
- Bildtexte und Produkte in diesen Mockups sind Beispieldaten. Insbesondere keine ungeprüften Gruppenänderungen über unvereinbare Materialien hinweg übernehmen. Bei Implementierung ausgewählte Referenzen in einen versionierbaren Projektordner kopieren.

## Produktmodell

Eine Konfiguration besitzt eine stabile eigene ID und kann mit Shopify-Produkten verknüpft werden. Technische bestehende IDs erhalten; beispielhafte `CFG-...`-Kennungen aus Mockups nicht ungeprüft als neue reale Datensätze behandeln.

Eine Konfiguration verbindet Material, Stärke, eine oder mehrere Formen, Größenvarianten, Befestigungen, Designvorlagen, Preise, Profile und eine passende Szene. Diese Bestandteile getrennt und wiederverwendbar verwalten. Ein Edelstahlschild darf beispielsweise oval, rechteckig und quadratisch innerhalb desselben Kundenkonfigurators angeboten werden.

Größen sind Child-Varianten mit eigenen Kennungen und gegebenenfalls Preis/SKU/Befestigungsfreigaben. Wiederverwendbare Größenprofile ersparen wiederholte Zeilen für 100 Produkte. Formabhängige Varianten begrenzen erlaubte Kombinationen; nicht automatisch jedes Material mit jeder Form und jeder Befestigung kombinieren.

Mastervorlagen liefern Produktgrundlage, Darstellung, Funktionen und Profile. Beim Kopieren eine neue Konfiguration erstellen. Neue SVG/PDF-Designs ersetzen die Gestaltung dieser Kopie direkt. Master und bisherige Version bleiben erhalten. Änderungen müssen nachvollziehbar, wiederherstellbar und vor konkurrierendem Überschreiben geschützt sein.

Ziel ist eine dauerhafte Datenbank für verknüpfte Datensätze plus versionierte Dateiablage. Konkrete Technik und Migration erst nach vollständiger Bestandsprüfung festlegen. Die aktuell gelesene JSON-Ablage nicht als bereits fertige neue Datenbank darstellen.

## Materialien und Formkonturen

Materialdatenbank mit Rohlingreferenzen, Materialart, Stärke, Oberfläche, verfügbaren Rohmaßen, Fertigungsprofil und passenden Darstellungsressourcen. Bereits gelieferte Rohlingfotos und Werte inventarisieren, keine fehlenden Materialdaten erfinden.

Formkontur und gestalteter Inhalt sind unterschiedliche Upload-Rollen. Beispiel: Herzform aus Edelstahl plus eine separat gestaltete Gravur.

Der Nutzer liefert geschlossene Haarlinienpfade als SVG oder Vektor-PDF. Bei PDF ist die physische Originalgröße vorgegeben und 1:1 zu übernehmen. Außenmaß aus der tatsächlichen Konturgeometrie ermitteln; Seitenränder oder Haarlinienbreite sind keine zusätzliche Materialgröße. PDF-Einheiten, Transformationen und Seitenrotation berücksichtigen. SVG benötigt eine eindeutig definierte physische Größe. Außenkonturen und Innenausschnitte unterscheiden; bei mehrdeutiger Zuordnung verständliche Auswahl anbieten.

Weitere Größen entstehen nur durch ausdrücklich zugeordnete Varianten beziehungsweise freigegebene proportionale Skalierung. Ein geändertes Seitenverhältnis benötigt eine passende Form/Anordnung. Haarlinienpfade bleiben präzise Produktionsgeometrie. Mehrseitige Form-PDFs und mehrere getrennte Außenformen sind noch kein festgelegter Standardfall.

Bohrbilder werden über Anzahl, Durchmesser, Anordnung und Randabstand zur Lochmitte beschrieben. Beispiel Rechteck 120 × 80 mm, Durchmesser 4 mm, Randabstand 8 mm, Ursprung links oben:

- Keine Befestigung: keine Löcher.
- Zwei seitlich mittig: (8, 40), (112, 40) mm.
- Vier Ecken: (8, 8), (112, 8), (8, 72), (112, 72) mm.

Beim Größenwechsel bleiben Durchmesser und Randabstand standardmäßig absolut; Lochpositionen folgen den Regeln. Bei freien Formen werden passende Bezugspunkte benötigt. Bereits in der Konturdatei enthaltene Ausschnitte nicht versehentlich als zweite Bohrung hinzufügen. Material-/verfahrenabhängige Mindestabstände und Durchmesser prüfen. Vorschau zeigt echte Löcher; Gestaltung und Weißhinterlegung sparen die Löcher aus; Fertigung erhält deren Innenkonturen. Sicherheitsabstände für Inhalte gesondert führen.

## Designs und Kundenfelder

Ein Konfigurator darf 20 oder 30 Designalternativen haben, ohne dafür 30 Shopify-Produkte anzulegen. Im ersten Kundenreiter Form, Größe und Befestigung wählen, im zweiten die freigegebenen Designs. Größe bleibt beim Designwechsel erhalten. Kundenwerte lassen sich nur zwischen semantisch übereinstimmenden Feldern zuverlässig übertragen, etwa `familyName` oder `houseNumber`.

Backend-Zuordnung: Design-ID/Version, Datei, Konfigurator, Reihenfolge, Standarddesign, Aktivstatus und erlaubte Formen/Größen. Designs dürfen mehrfach verwendet werden. Für Oval, Rechteck und Quadrat separate Anordnungen derselben Gestaltung unterstützen. Keine automatische Verzerrung oder stilles Abschneiden.

SVG-/PDF-Upload ersetzt die bisherige Designgestaltung direkt in der Produktvorschau. Text, Fotofelder und Motive müssen als getrennte editierbare Elemente aufbereitet werden. Geschlossene Pfade garantieren die Formgeometrie, aber nicht automatisch die semantische Erkennung von Schrift/Fotofeldern innerhalb beliebiger Designs. Schriftkurven und flache Bilder brauchen gegebenenfalls Aufbereitung und Prüfung.

Backend-Funktion „Mit KI Product Designer bearbeiten“: Design unverändert übernehmen, vorhandenes Design nach Auftrag ändern oder neues Design aus Briefing erstellen. Auftrag je Produkt oder kompatibler Gruppe; optional Foto/Text/Elemente erhalten. Vorschau und Versionsvergleich vor Übernahme. Original erhalten. Kundenrechte bleiben getrennt: im Backend änderbare Gestaltungselemente dürfen im Kundenkonfigurator trotzdem gesperrt sein.

Das hier verwendete Product-Design-Plugin ist keine bereits eingebaute Funktion der Shopify-App. Laufende KI-Funktion benötigt eine eigene geeignete Integration, Zugang, Kostenregelung und Qualitätsprüfung. Foto-/Schriftänderungen und Vektorerhaltung nicht pauschal garantieren.

## Profile und Transparenz

Schrift- und Motivprofile getrennt verwalten: Default, Unterkategorie, explizite Produkt-/Masterzuordnung. Festgelegte Priorität: explizite Produktzuordnung vor Unterkategorie vor Default. Masterwerte liefern die Ausgangsvorgabe. Profiländerungen betreffen künftige Fassungen; bestehende Bestellungen behalten ihre gespeicherte Version.

Schriftprofil: verfügbare Familien, Reihenfolge und Standardschrift. Endgültige Schriftliste und Nutzbarkeit sind noch offen. Motivprofil: erlaubte Motive/Kategorien, Reihenfolge und Bestseller je Unterkategorie. Vorhandene Motivbibliothek übernehmen.

Eigener Bereich „Transparenz“ im Produkteditor: aktivieren, Bereiche/Elemente zuordnen, frei einfärbbare Tönung mit Palette/Farbwähler und Deckkraft. Transparenz separat mit Schachbrett und Weißansicht prüfen. Kundenfreigabe explizit je Produkt/Master. Transparente Tönung betrifft Designbereiche, nicht automatisch Materialfoto oder Hintergrundszene.

Weißregel für normale Druckbereiche: Weiß unter allem Nichttransparenten. Vollständig transparente Bereiche und Löcher erhalten keine Farbe und kein Weiß. Für bewusst durchscheinende Farbtönung ist eine gesonderte Weißregel nötig; konkrete Dichte/Unterlegung noch mit Fertigungsprofil und Probedruck bestimmen. Bildschirmvorschau ist kein verbindlicher Nachweis realer Transmissionswirkung.

## Realistische Vorschau und Kundenerlebnis

Jedes Produkt braucht passende hochwertige Szene und glaubwürdiges Material. Stärke, sichtbare Kanten, Oberflächenstruktur, Reflexe, Licht und Schatten berücksichtigen. Geometrie und Darstellung müssen bei Form-/Größenwechsel zusammenpassen. Eine flache Grafik mit Schlagschatten erfüllt diese Anforderung nicht. Vorschau kann eine angenäherte Materialdarstellung sein; Qualität mit tatsächlichen Rohlingreferenzen prüfen.

Hintergrund, Schatten, Sockel und Darstellungsreflexe gehören nicht in Produktionsgrafiken. Fertigung nutzt präzise ebene Geometrie. Gemeinsame Geometriegrundlage verhindert Abweichungen zwischen Vorschau und Export.

Bestätigte Kundenkorrekturen:

- Designs-Reiter ausblenden, wenn keine Auswahl vorhanden ist. Designkategorien/-kollektionen nur ausdrücklich aktiviert anzeigen. Designs untereinander zeigen.
- Druckdatei-Vorbereitung nur im Backend.
- Schriftgröße ausschließlich in mm anzeigen und bearbeiten. Dezimalwerte erhalten (vorgeschlagene Schrittweite 0,1 mm); der Nutzer hat keine Beschränkung auf ganze Millimeter verlangt. Die Rundung in der Diskussionsansicht nicht ungeprüft übernehmen.
- Farbbuttons perfekt rund; Bezeichnung „Ausgewählte Farbe“.
- Kundenirrelevante technische Hinweise wie Einstecktiefe ausblenden.
- Auf Mobilgeräten Text durch Doppeltippen direkt bearbeiten.
- Auswahlgriffe immer vor Sockel/Produktdarstellung; keine verdeckten Bedienelemente.
- Zoom nur bei nutzbarer Funktion anzeigen.
- Beispielbilder sichtbar halten; größerer, höher platzierter Uploadhinweis und direkt anklickbare Fotofläche.
- Feste Designmotive nicht verschiebbar; freigegebene Texte/Farben/Fotos veränderbar.

## Excel und Stapelimport

Später eine echte `.xlsx`-Vorlage mit Auswahllisten, Pflichtfeldern, Beispielen und Fehlerhinweisen erstellen. Feldschema mit Importer gemeinsam versionieren. Datenblätter sollen logisch getrennt werden, ohne normale Importe unnötig kompliziert zu machen:

| Blatt | Zweck |
| --- | --- |
| Anleitung und Einstellungen | Schemaversion, Quellen, Standardordner, Importmodus und gemeinsame Vorgaben |
| Produkte | Konfigurator-ID, Master, Titel, Zielgruppe, Profile, Preis-/Shopify-Zuordnung |
| Größenvarianten | Konfigurator/Form bzw. Größenprofil, Varianten-ID, Breite/Höhe, Preis, SKU |
| Designzuordnung | Design-ID, Datei, Konfigurator, Form-/Größenfreigaben, Reihenfolge, Standard, optional KI-Auftrag |
| Materialien und Formen | Material-/Form-IDs, Stärke/Oberfläche, Konturdatei; PDF-Originalmaße automatisch ermitteln |
| Befestigungen | Wiederverwendbare Bohrbilder, Maße, Zuordnung und Aufpreise |
| Profile | Schrift-, Motiv- und Fertigungsprofilzuordnungen |

IDs verbinden Datensätze; Dateinamen oder Dateiverweise verbinden Ressourcen. Gemeinsame Quellordner einmal hinterlegen, Unterordner/Abweichungen je Zeile zulassen. Für KI-Ergebnisse optional eigenen Ausgabeort. Aktualisieren anhand bestehender IDs; wiederholte Imports dürfen keine unbemerkten Duplikate erzeugen. Lösch-/Archivierungsverhalten ausdrücklich statt aus fehlenden Zeilen ableiten.

100 Produkte als Ziel für Stapelprüfung. Importierte Daten zuerst zuordnen und prüfen, dann Entwürfe anlegen/aktualisieren. Fehler je Zeile sichtbar, Fortschritt speicherbar, nur fehlgeschlagene Vorgänge erneut bearbeiten. Verträglichkeit von Sammeländerungen nach Material/Form/Verfahren prüfen. Kein einzelner Fehler darf erfolgreiche Entwürfe verlieren lassen.

Dateiquellen: lokaler Datei-/Ordner-/ZIP-Upload sowie Google Drive als zusätzliche Quelle. Ein lokaler Pfad in Excel gewährt einer gehosteten App keinen Dateizugriff. Für automatischen lokalen Zugriff ist eine bewusste lokale Verbindung nötig.

Google Drive benötigt eine eigene autorisierte Werkstatt-Anbindung. Die Chat-Verbindung ist davon getrennt. Ordner auswählen, Dateien eindeutig auflösen (intern Datei-IDs speichern), Leserechte prüfen, benötigte Originale versioniert in eigener Ablage sichern. Änderungen im Drive dürfen bestehende Produkte oder Bestellungen nicht heimlich austauschen. Schreibzugriff für Ergebnisordner nur, wenn benötigt und freigegeben. Ein automatischer dauerhafter Ordner-Wächter ist noch nicht beauftragt; Import auf Nutzeraktion zuerst.

## Shopify und Produktion

Nach Prüfung Konfiguration mit bestehendem Shopify-Produkt verbinden oder neues Produkt als Entwurf mit Varianten, Bildern und SEO-Vorschlägen anlegen. Veröffentlichung als eigener sichtbarer Schritt. Materialpreise, Varianten und reale Bindungen serverseitig prüfen. Ein Konfigurator kann mehrere Produktbindungen haben; Bestellung muss die tatsächlich verwendete Zuordnung festhalten.

Pro Bestellung und Position unveränderlichen Stand mit Konfiguration, Form, Größe, Design/Version, Kundenwerten, Profil/Version, Preisen/Optionen und Originalmedien sichern. Daraus wiederholbar Produktion erzeugen: SVG mit Konturen, PDF mit Konturen, PNG, Originalbilder, Vorschau und Manifest, gesammelt als ZIP. Schriften im SVG/PDF in Pfade umwandeln. Fotos bleiben Raster in ihrer tatsächlichen Auflösung; Vektorexport erzeugt keine verlorene Bildinformation neu.

Druck und Gravur brauchen eigene Fertigungsprofile. Druck: CMYK gemäß freigegebenem Profil, definierte Schnittkontur, passende Weißhinterlegung; Rückseitendruck genau einmal spiegeln. Für die bestätigte Roland-Ausgabe `CutContour` und `RDG_WHITE` verwenden. PNG ist üblicherweise eine RGB-Vorschau/zusätzliche Ausgabe; CMYK-Produktionsdatei im geeigneten Format führen. SVG nicht ohne Nachweis als verlässlich CMYK-separiert bezeichnen. Gravur: geeignete Vektor-/Rasterausgabe, getrennte Schnittkonturen und verfahrensgerechte Farben; keine erzwungene Druck-Weißebene.

## Bestätigtes Acrylglas-Beispiel

3 mm Acryl, Hochformat 150 × 200 mm für 14,99 EUR und 200 × 266,7 mm für 19,99 EUR. Rückseitendruck gespiegelt. Preise pro Sockel im kleinen Format: Buche massiv 8,99; Eiche massiv 9,99; Nussbaum massiv 10,99; Acryl klar flach 3,99; Acryl satiniert flach 4,99; Holz flach Nussbaumoptik mit schwarzer Laserkante 5,99 EUR. Großformat jeweils 1,00 EUR mehr pro Sockel. Ohne Sockel kein Sockelaufschlag. Unsichtbare Wandhalterung zusätzlich auswählbar, 5,99 EUR für beide Größen.

Einstecktiefe massiv 7 mm; flach 5 mm, flache Ständer 5 mm hoch und im kleinen Format ungefähr 10 mm seitlicher Überstand je Seite. Sockel im Großformat entsprechend anpassen, genaue reale Abmessungen für endgültige Vorschau prüfen. Einsteckbereich wird bedruckt, wichtige Designelemente bleiben sichtbar. Kunden wählen den Sockel.

Die derzeit vorbereitete lokale Gestaltung ist „Unser Anfang / Anna & Lukas“. Weitere vom Nutzer gelieferte Designs sind nicht automatisch bereits als konfigurierbare Vorlagen umgesetzt. Endgültige Schriftwahl und exakte fotografische Materialdarstellung bleiben zu prüfen; siehe `design-qa.md`.

## Vorgeschlagene Umsetzungsreihenfolge

1. Vollständigen aktuellen GitHub-Quellstand und bestehende App-/Werkstattteile erfassen. Getrennte neue Testumgebung mit dokumentierter Startanleitung aufsetzen; Vergleichsversion erhalten. Neue Anforderungen aus diesem Dokument mit den tatsächlichen Modellen abgleichen.
2. Gemeinsames Datenmodell und Datei-/Versionsablage für Material, Kontur, Variante, Bohrbild, Design und Konfiguration umsetzen. Darauf die ausgewählte Produktbearbeitung und die Material-/Formverwaltung aufbauen. Keine zweite unabhängige Geometrie für den Export.
3. Einen vollständigen lokalen Pilot erstellen: Edelstahlschild mit drei Formen, je zulässigen Größen und Befestigungen, zunächst drei zugeordneten Designs. Originalkontur importieren, Vorschau realistisch darstellen, Kundenwahl speichern und SVG/PDF maßhaltig ausgeben. Reale Referenzdateien verwenden; synthetische Testdaten ausdrücklich markieren.
4. Parallel am vorhandenen Acryl-Beispiel Druck/Weiß/Spiegelung/Fotoersatz und variable Sockel verifizieren. Damit sind Gravur und Druck vor Ausbau abgedeckt.
5. Passende Excel-Vorlage und wiederholbaren Import auf denselben Modellen bauen. Erst kleine Menge prüfen, dann 30 Designs in einem Konfigurator und 100 Produkte mit gemischten zulässigen Varianten. Fehlerfälle, Wiederaufnahme und Aktualisierung abdecken.
6. Google Drive, KI-Gestaltung und Shopify-Entwürfe anbinden; echte Bestellung und Produktionspaket anschließend zusammenhängend testen. Veröffentlichung erst nach überprüfbarer Produkt-/Preis-/Fertigungsstrecke.

Diese Reihenfolge ist ein Umsetzungsvorschlag nach der Frage „was nun?“, keine abgeschlossene Freigabe konkreter neuer Screenshots oder Auswahl einer Datenbanktechnik.

## Abnahmekriterien für den ersten Pilot

- Eine stabile Konfigurator-ID mit eindeutig zugeordneten Formen, Größen und Designs.
- PDF-Originalkontur wird ohne Größenänderung importiert; Haarlinien und Innenausschnitte korrekt berücksichtigt.
- Bohrpositionen im 120 × 80-mm-Beispiel stimmen; Variante vergrößert nicht unbeabsichtigt Bohrdurchmesser/Randabstand.
- Form-/Größenwechsel zeigt nur passende Designs und Optionen, erhält kompatible Kundeneingaben und schneidet nichts still ab.
- Materialstärke/Kanten in der Vorschau erkennbar, Szene nicht im Export; Darstellung anhand Materialreferenz geprüft.
- Text bleibt im Kundeneditor bearbeitbar und erhält im Produktions-SVG/PDF unveränderte Konturen durch Pfadwandlung.
- SVG/PDF-Abmessungen entsprechen Bestellung; Herstellung und Vorschau nutzen denselben gespeicherten Geometriestand.
- Erneuter Import aktualisiert gezielt statt zu duplizieren; frühere Version wiederherstellbar.

## Zusätzliche Ablaufprüfungen vor Freigabe

| Prüffall | Erwartung |
| --- | --- |
| 0, 1 oder 30 zugeordnete Designs | Ohne gültiges Design kann ein Entwurf gespeichert, aber nicht als gestaltbares Produkt aktiviert werden. Bei genau einer Vorlage keine unnötige Designauswahl; bei mehreren nur kompatible Vorlagen anzeigen. |
| Größenwechsel mit Namen, Foto und Zusatzmotiv | Werte bleiben erhalten, Fotoausschnitt wird geprüft, ungeeignete Inhalte werden nicht still abgeschnitten oder anders zugeordnet. |
| Formwechsel Rechteck → Oval → Herz | Außenkontur, Lochbild, sichtbare Fläche und Export stimmen; fehlende Designfreigabe wird erklärt. |
| Großformat ohne Sockel / mit Sockel / mit zusätzlicher Wandhalterung | 19,99 EUR ohne Zubehör; jedes Sockelmodell genau 1 EUR über dem kleinen Format; Wandhalterung immer zusätzlich 5,99 EUR, nie Sockelaufschlag ohne Sockel. |
| Lochbild 2 → 4 → keine und anschließender Größenwechsel | Keine alten Löcher bleiben zurück; Durchmesser und Randabstand entsprechen den Regeln; Innenkonturen in Vorschau und Fertigung identisch. |
| Fester Designtext oder Fotoplatzhalter | Erlaubte Inhalts-/Farbänderung funktioniert; verbotenes Verschieben/Entfernen wird auch außerhalb der sichtbaren UI serverseitig verhindert. |
| Bewusst transparente Fläche, getönte Fläche, deckender Druck | Farb- und Weißebenen entsprechen der gewählten Regel; Sockel, Fotohinweis und Szene erscheinen in keiner Produktionsseparation. |
| Schriften fehlen oder Foto ist zu klein | Eindeutige Meldung mit betroffenem Element; keine stille Ersatzschrift oder behauptete Verbesserung der Originalauflösung. |
| Profiländerung und Änderung einer Mastervorlage | Neue Fassung zeigt die betroffenen Produkte vor Übernahme; bereits gespeicherte Bestellung bleibt unverändert reproduzierbar. |
| 100 Importzeilen, davon 3 fehlerhaft | 97 gültige Entwürfe erhalten, 3 Fehler mit Ursache/Zeile sichtbar. Wiederholung erzeugt keine zusätzlichen Produkte. |
| Zwei Bearbeiter speichern denselben Stand | Zweiter Schreibvorgang erhält einen nachvollziehbaren Konflikt; kein unbemerktes Überschreiben. |
| Doppelte Dateinamen, verschobene Drive-Datei oder fehlende Rechte | Auflösung anhand eindeutiger Referenz; klarer Fehler ohne falschen Ersatz. Bereits gesicherte Originale bleiben erhalten. |
| Abbruch nach Shopify-Anlage, erneuter Import | Vorhandenes Übertragungsjournal/Binding verwenden; keine zweite Produktanlage. |
| Bestellung nach späterer Designänderung erneut exportieren | Frühere Geometrie, Schriftpfade, Foto, Spiegelung, Weiß-/Schnittkonturen und Maße werden exakt aus dem damaligen Stand geladen. |

Diese Tabelle definiert künftige Abnahmen. Sie behauptet nicht, dass diese Fälle bereits alle bestanden wurden.

## Noch benötigte Angaben oder Nachweise

- Endgültige Schriftarten und passende Nutzungsrechte; bis dahin Testschriften eindeutig kennzeichnen.
- Vollständige reale Materialreferenzen und relevante Kontur-/Design-Dateien inventarisieren. Keine pauschale neue Upload-Aufforderung, bevor vorhandene Dateien geprüft sind.
- Maschinen-/Materialprofile, gewünschte Weißregel für Tönungen und physische Probedrucke beziehungsweise Probegravuren.
- Später Drive-Zugang, KI-Provider/Kostenrahmen, getrennte Shopify-App-/Testshop-Verbindung. Zugangsdaten nicht in Excel, Quellcode oder Übergabedokumente schreiben.
- Auswahl/Verfeinerung der Materialverwaltung und noch nicht abschließend gewählten Stapelansichten.

## Übergabe an die nächste KI

Zuerst diese Datei lesen, dann tatsächlichen Quellstand prüfen. Keine ImageGen-Mockups als fertige App ausgeben. Vorhandene Runtime und Motivressourcen bewahren. Nutzer bevorzugt kurze deutsche Erläuterungen und nachvollziehbare sichtbare Ergebnisse. Bereits beantwortete Produktangaben nicht erneut erfragen. Keine langen unbemerkten Werkzeug-Wartezeiten: frühere Browser-Dateiuploads waren problematisch. Relevante technische Hindernisse konkret benennen.

In diesem Schritt wurden Quellcode und Ablauf geprüft, 19 vorhandene Tests ausgeführt, ein Fotozuordnungsrisiko reproduziert, die bestehende Kundenansicht erfasst und dieser Bauplan mit Prüfbericht erstellt. Keine neue Datenbank, Excel-Datei, Drive-Verbindung oder Shopify-App wurde dadurch implementiert. Die Dokumentationssicherung erfolgt im genannten Aufgabenbranch; aktuelle Commit-Kennung im gemeinsamen Stand nachsehen. Beim tatsächlichen Implementierungsabschluss Startanleitung, vollständige Quellen, ausgewählte Ressourcen und Prüfnachweise gemeinsam versionieren. Einen vollständigen gesicherten App-Stand erst nach Rückprüfung behaupten.
