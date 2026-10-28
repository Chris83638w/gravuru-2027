# Kunden-Konfigurator: Auftrag 2 zu PR #41

Stand: 28.10.2026, Astra. Arbeitsbranch: `dev/konfi-ux-20261028-astra`. Quellbasis ist PR #41, `458f56b8cf1a1cf464c9934d46795d17036b4c33`; verbindlicher Folgeauftrag: `dev/konfi-ux-auftrag2-20261028-claude`, Stand `77fab45`, [Auftrag](https://github.com/Chris83638w/gravuru-2027/blob/77fab45b07f5ff7ba2bbfe37b3c7d81efd9d3d2c/docs/handoffs/2026-10-28-konfi-ux-auftrag2-astra.md). Die Umsetzung wurde in einer isolierten lokalen Quellkopie geprüft. Dieser Bericht beschreibt keine Bereitstellung, keinen Merge und keinen Live-Warenkorbtest.

Die neue Entscheidung zur Motivberechnung ersetzt die gegenteilige Entscheidung im [ersten Bericht](2026-10-28-konfi-ux-astra-bericht.md). Bereits gespeicherte Produkt-, Entwurfs- und Bestellstände werden dabei nicht umgeschrieben. Die Implementierung wurde über GitHub in drei neuen signierten Commits veröffentlicht: `917ff907` (Editor), `d0b94899` (Server), `37b9e624` (Shop-Verbindung). Für alle drei bestätigt die GitHub-API `verified:true`, `reason:valid`. Der alte PR-Commit `458f56b8` wurde nicht umgeschrieben. Readback gegen GitHub-Stand `37b9e624`: alle **72/72** geänderten Quelldateien sind bytegenau identisch mit dem geprüften lokalen Stand, alle mit LF. Die Dokumentationscommits werden im abschließenden PR-Kommentar genannt.

## Alle elf Auftragspunkte

| Punkt | Umsetzung und maßgebliche Quellen |
| --- | --- |
| **1 · Motivpreis** | Neue Vorschläge/Importstände verwenden `motifCharge:'additional'` und 169 Cent. Gleiches Vorlagenobjekt mit gleicher Motivkennung bleibt enthalten; Ersatz oder zusätzliches Motiv wird berechnet. `customer-ux-policy.mjs`, `katalog-import.mjs`, `contract.mjs`, `decision-help.mjs`, `usability.mjs`, Preistext in `adapter.mjs`. Historische `all`-Stände bleiben mit ihrer gesicherten Regel lesbar. Details und Grenzen der Preisbindungsprüfung unten. |
| **2 · Textleiste A/B** | Standard B: `plate`, 8 px Abstand oberhalb der Platte und seitlich an der Auswahl orientiert, auf die Bühne begrenzt. Bei Ansichtszoom sitzt sie am oberen Bühnenrand. Vergleich A: `selection`, 6 px oberhalb der Griffe, Faktor 0,78. Mobil bleibt M2 unter dem Schild, auch im Vollbild. `direct-editing.mjs`, `text-toolbar-position.mjs`, `layout.mjs/.css`. |
| **3 · Vollbildkopf** | Zurück heißt im Vollbild „Vollbild verlassen“, einschließlich zugänglichem Namen. Der zusätzliche kleine Produkttitel ist dort verborgen. Die vorhandene Rückkehrfunktion bleibt erhalten. `layout.mjs/.css`. |
| **4 · Informationen** | ⓘ steht neben „Text bearbeiten“, an den Motiv-Navigationsbegriffen und neben dem jeweils erklärten Material-/Größen-/Befestigungsbegriff. Keine ineinander verschachtelten Knöpfe; bestehende Ereignisse bleiben an ihren Bedienelementen. `decision-help.mjs`, `ux-details.mjs/.css`. |
| **5 · Produktzoom** | Ansicht 100–400 %, Mausrad um den Mauszeiger, Ziehen auf freier Fläche, Pinch und Verschieben mit Touch. Kleine angetippte Elemente erhalten einen sanften Autozoom; reduzierte Bewegung wird berücksichtigt. Dunkelgraue Leiste, Mini-Karte nur beim Zoom, kurzer Hinweis und ⤢ mit „Ganzes Schild“. Mobil ohne +/−. Foto-Ausschnittzoom bleibt getrennt. `view-zoom-model.mjs`, `view-zoom.mjs/.css`. |
| **6 · Griffe** | Sichtbare Kästchen 19 × 19 px, weiß und abgerundet, mit kräftigeren Pfeilen; Drehgriff entsprechend kleiner. Unsichtbare Tippfläche weiterhin 44 × 44 px. Doppelte alte SVG-Griffe werden verborgen; der grüne Auswahlrahmen bleibt. `selection-arrows.mjs`, `refinements.mjs`, `ux-details.css`. |
| **7 · Hover/Auswahl** | Hover ändert nur den Rand. Ausgewählte Kacheln haben dunklen Rand und Haken. Gemeinsame Behandlung für vorhandene Options-, Motiv- und Designkacheln sowie die neue produktübergreifende Galerie. `ux-details.mjs/.css`, `product-design-gallery.mjs`. |
| **8 · Motivkacheln/Ebenen** | Kacheln passen den tatsächlich gezeichneten SVG-Inhalt einschließlich Linien und Strichbreiten ein. `getScreenCTM()` berücksichtigt verschachtelte SVG-Ansichten; Vorlagengrafiken bleiben unverändert. Graue gleich große Platzhalter während des Bestseller-Ladens. „Ebenen (n)“ steht bei den Vorschauwerkzeugen; mobil als beschriftetes Symbol in der Kopfzeile. `motif-tile-fit.mjs/.css`, `layout.mjs`, `workflow.mjs`. |
| **9 · Handyfläche** | Vorschauwerkzeuge wechseln in die Kopfzeile neben Speichern; Titel wird gekürzt. 5 % seitlicher Bühnenabstand ermöglicht rund 90 % Plattenbreite. Tastaturerkennung umfasst auch direkte Texteingabe auf der Platte; Vollbild und M2-Leiste berücksichtigen den sichtbaren Bildschirmbereich. `layout.mjs/.css`, `mobile-steps.mjs`, `direct-editing.mjs`. |
| **10 · Wiederherstellung** | Einzeilig „✓ Stand wiederhergestellt“. Nach etwa vier Sekunden verschwindet die gesamte Pille, einschließlich des zuvor leeren Kästchens. Öffnet der Kunde ihre Optionen, wird das kontrolliert behandelt. `ux-details.mjs/.css`. |
| **11 · Andere Formen/Größen** | Produktübergreifende Galerie aus aktiven, für denselben Datenbereich und Shop gebundenen Produktständen. Echte Plattenvorschau, Form, Größe und berechneter Preis; bewusste Auswahl mit Bestätigung. Neue Sitzung bindet an das genaue Zielprodukt und die Zielvariante. Passende Kunden-Texte können übernommen werden; Rückkehr erhält den vorherigen Editor. `shop-design-gallery.mjs`, `shop-product-binding-store.mjs`, `shop-entry.mjs`, `shop-design-switch.mjs`, `product-design-gallery.mjs`, `product-design-transfer.mjs`. |

Umsetzung und Prüfungen folgten der vorgeschlagenen Reihenfolge: **1 → 2/3 → 6/7/4/10 → 9/8 → 5 → 11**. Änderungen an den gemeinsam genutzten Shop-Einstiegsdateien wurden auf die Weitergabe der Toolbar-Variante und die Einbindung des separaten Designwechsel-Coordinators begrenzt; Claudes parallele iPhone-Absicherung und Entfernung leerer Zusatztexte bleiben beim Zusammenführen ausdrücklich zu prüfen.

## Preisregel und tatsächlicher Shop-Einstieg

Der Informationswortlaut für neue Stände mit 169 Cent lautet genau:

> Das Motiv der Vorlage ist im Preis enthalten. Jedes weitere oder geänderte Motiv: +1,69 €.

Die Quote bleibt die gemeinsame Preisquelle. Die Import-/Proposal-Regel erzeugt ausschließlich neue Vorschläge mit `additional`; es gibt keinen pauschalen Laufzeit-Override alter Konfigurationen. Ein vorhandener `motifCharge:'all'`-Stand behält seine alte Berechnung und den dazu passenden Hinweis. Bestehende Preise und private Bestellnachweise werden dadurch nicht rückwirkend geändert.

Im historischen D8-Export ist das Vorlagenmotiv an seine Kennung gebunden, `embeddedOnly:true` und nicht zum Ersetzen freigegeben. „Zusätzliches Hausmotiv“ und „Vorlagenmotiv ersetzen“ sind deshalb unterschiedliche Testfälle. Das Plus-Motiv wurde lokal geprüft; ein Motivtausch in dieser konkreten Vorlage wird nicht als tatsächlich bedient behauptet. Die Berechnung eines erlaubten Ersatzes ist separat getestet.

Der alte Commerce-Pfad verlangt für berechnete Extras `priceMode:'shopify-cart-transform'`. Der aktuelle Shop-Einstieg gibt dieses Feld in seinem öffentlichen `binding` nicht aus. Aus dem Fehlen des Feldes im Modell-Readback lässt sich deshalb **nicht** ableiten, dass das aktuelle D8-Backend keinen Aufpreisvertrag hat. Der gespeicherte Gedenktafel-Nachweis eines anderen Produkts mit diesem Modus ist ebenfalls kein Beleg für D8. Keine aktive Produkt- oder Preisbindung wurde für diesen Auftrag verändert.

Ein belegter fehlender Aufpreisvertrag liefert jetzt den verständlichen Hinweis: „Diese kostenpflichtige Änderung ist für dieses Produkt derzeit noch nicht bestellbar. Verwende das Motiv der Vorlage und entferne kostenpflichtige Extras, um fortzufahren. Deine Gestaltung bleibt erhalten.“ Eine veraltete oder beschädigte Preisbindung wird davon getrennt behandelt: „Der Preis dieser Gestaltung konnte nicht bestätigt werden. Bitte öffne das Produkt erneut. Deine Gestaltung bleibt erhalten.“ Fremde Produkt-/Bindungsfehler werden nicht als fehlende Aufpreisfreigabe umgedeutet; Statuscodes und Prüfungen bleiben erhalten.

Auch in der Galerie werden Basisbindung und Vorlagen-Gesamtpreis getrennt geprüft: `quote(config, [], …)` muss dem festen Variantenpreis entsprechen; die Karte zeigt `quote(config, design.objects, …)`. Damit verschwinden gültige historische `all`-Vorlagen nicht aus der Auswahl. Ein abweichender Basispreis wird weiterhin abgewiesen.

## A/B-Zuordnung, Wiederherstellung und Ansichtszoom

`?leiste=a`/`?leiste=b` wirken nur im eingebetteten Shop-Fenster. Standard ist `plate`. Eine optionale spätere 50/50-Zuteilung ist implementiert, bleibt jedoch ohne `textToolbarExperiment:true` ausgeschaltet. Bei fehlendem oder gesperrtem Browserspeicher bleibt die Vorgabe stabil.

Die Zuordnung wird als validierte `ui.textToolbarPlacement` in privaten Gestaltungsständen, gesicherten Nachweisen und beim Wiederöffnen erhalten. Sie ist keine Produktoption, kein zusätzliches sichtbares Warenkorbfeld und kein Preisbestandteil. Eine ausdrückliche Vergleichsadresse hat auch nach späterem Wiederherstellen Vorrang; ohne Adresse gilt die gespeicherte Zuordnung. Der Originalentwurf wird zuerst vollständig validiert: Ungültige UI-Daten oder ein fremdes Produkt werden durch die A/B-Adresse nicht akzeptabel gemacht.

Ansichtszoom verändert ausschließlich die Darstellung und keine Designkoordinaten, Schriftmaße oder Fotorezepte. Platte und verbundene visuelle Ebenen erhalten dieselbe Transformation. Griffe und Textleiste liegen außerhalb der Skalierung und werden neu positioniert. Eine zweite Berührung beendet eine angefangene Objektgeste vor dem Pinch; eine aktive Fotobearbeitung behält ihre eigene Bedienung. Der alte Regler zur Vorschaugröße entfällt.

## Umfang und Sicherheit des Designwechsels

Die Galerie liest die ausdrücklich aktiven Zuordnungen aus der vorhandenen Registry. Sie importiert keine Katalogdaten, setzt keine Freigabe und bietet keine ungebundenen Produkte an. Die Katalog-Zielfreigabe bleibt Aufgabe des bestehenden Importwegs; auf der Kundenseite zählen die daraus bereits aktivierten festen Produktstände. Verborgene, ausdrücklich nicht freigegebene oder als „passt nicht“ markierte Designs werden ausgeschlossen. Pro Design/Form/Größe erscheint eine Karte; beim aktuellen Produkt wird die aktuelle Variante bevorzugt, sonst die günstigste ausdrücklich gebundene Ausführung. Pagination: 40 Karten, Vorschauen erst bei Bedarf und höchstens zwei gleichzeitig.

Die Zielauswahl ist HMAC-signiert und an Quellsitzung, Store, Produktrevision, Binding und Zuordnungsrevision gebunden. Preview und Wechsel lösen das Ziel erneut auf. Fremde Mandanten/Shops/Stores, archivierte oder pausierte Produkte, geänderte Zuordnungen, nicht passende Modelle und falsche Basispreise werden verweigert. Die vorhandene gesonderte Live-Freigabeprüfung für mehrteilige Funkklingeln bleibt erhalten.

Ein Wechsel erzeugt eine neue private Sitzung für das gewählte Ziel. Alte `config`, `rev` und `line` werden nicht übernommen. Bei fehlgeschlagenem Laden wird die ursprüngliche Oberfläche wieder aktiv; beim erfolgreichen Wechsel bleibt ihr Frame mit Texten und ausgewählten Fotodateien für „Zur vorherigen Gestaltung“ erhalten. Produktübergreifend werden nur vom Kunden geänderte Texte mit eindeutig passendem `fieldKey`, erlaubter Inhaltsbearbeitung und passenden Textgrenzen übertragen. Schrift, Geometrie, Rechte, Fotos, Logos und zusätzliche Motive stammen weiterhin aus dem Ziel beziehungsweise bleiben im vorherigen Entwurf.

Beim geprüften historischen D8 → Schiefer-Paar sind die Textrollen nicht eindeutig genug. Daher erfolgt dort keine erfundene Feldzuordnung: Der vollständige nicht übernommene Text wird mit Erklärung angezeigt und bleibt im ursprünglichen Entwurf erhalten. Die automatische Übernahme bei eindeutig passenden Textrollen ist durch gezielte Tests geprüft.

## Browsernachweise und Bilder

Die Bildgalerie liegt unter [konfi-ux-20261028-auftrag2-astra/README.md](konfi-ux-20261028-auftrag2-astra/README.md). Dort werden die Vorher-/Nachher-Nachweise mit Punktnummer, Ansicht und genauer Aussage zugeordnet. Desktop: 1440 × 900. Handyansicht: 390 × 844, emuliert; keine Abnahme auf einem physischen iPhone/Safari.

Verwendet wurde die echte lokale Editor-Laufzeit mit vorhandenen D8-/Schiefer-Modellkopien und deren Originalressourcen. Der Warenkorbtransport des Nachweises ist lokal simuliert. Im Browser geprüft:

- D8 mit enthaltenem Vorlagenmotiv: **19,99 €**; nach zusätzlichem Hausmotiv: **21,68 €**.
- Bewusster Wechsel von **12 × 8 cm** zu **22 × 14 cm Schiefer**, angezeigter Zielpreis **22,99 €**.
- Die lokale Warenkorboberfläche erhielt das Zielprodukt mit Shopify-Variante **57509812633980** und dem korrekten Preis. Kein Eintrag in einen echten Shopify-Warenkorb, kein Checkout und keine Bestellung.
- „Zur vorherigen Gestaltung“ brachte den eingegebenen Text **„Test Produktwechsel“** exakt zurück. Nicht eindeutig zuordenbare Texte wurden vollständig zur manuellen Übernahme angezeigt.

Die historischen Shopify-IDs im Test sind keine neu angelegten Produkte. Die lokal erfolgreichen Abläufe belegen den Programmweg und die übergebenen Zielkennungen; sie ersetzen keine erneute Prüfung der aktiven Live-Preisbindung nach einer später genehmigten Bereitstellung.

## Tests und Build

| Prüfung | Gesamt | Grün | Fehler | Übersprungen |
| --- | ---: | ---: | ---: | ---: |
| variant-m: letzter veröffentlichter Bericht für PR-Basis `458f56b8` | 350 | 339 | 11 | 0 |
| variant-m: aktueller Vollauf unter Windows | 399 | 393 | 6 | 0 |
| Workshop: rekonstruierte PR-Basiskopie `458f56b8`, gleiche Windows-Umgebung | 1.322 | 1.149 | 160 | 13 |
| Workshop: aktueller Vollauf unter Windows | 1.362 | 1.197 | 158 | 7 |
| Galerie + Shop-Einstieg + SQLite-Bindungen, gezielt | 60 | 60 | 0 | 0 |
| Zoom + Bundle nach letzter Knopf-/Darstellungskorrektur | 20 | 20 | 0 | 0 |

Die Gruppen überschneiden sich und dürfen nicht addiert werden. Die erste Tabellenzeile ist ausdrücklich die Zahl aus dem vorherigen Bericht, kein neu behaupteter Referenzlauf. Die sechs aktuellen variant-m-Fehler betreffen PDF-/Kontur-Export über den nicht nutzbaren Windows-`python3`-Alias. Es wurden keine Assertions abgeschwächt und keine Tests gestrichen.

Alle **158** aktuellen Workshop-Fehler besitzen im Vergleichslauf denselben Testnamen und dieselbe führende Fehlersignatur wie auf der PR-Basis: **keine zusätzlichen Fehler in diesem Vergleich**. Die Fehlergruppen umfassen Python-/Worker-Beschränkungen; die übrigen Fehler werden durch die Baseline-Zuordnung belegt und nicht pauschal allein anhand ihrer Anzahl als Windows-Fehler erklärt. Ein Linux-Vollauf ist nicht erfolgt.

Transparenz zur Basiskopie: Zunächst fehlten 210 Dateien aus `scripts`, `legacy` und `docs`. Sie wurden ausschließlich dann aus der vorhandenen lokalen Quelle ergänzt, wenn ihr Git-Blob-SHA mit dem GitHub-Baum von `458f56b8` übereinstimmte. Vier Legacy-Dateien waren lokal nicht verfügbar. Zwei Fehler traten nur im Vergleichslauf auf: `shop-product-binding-legacy.test.mjs` konnte wegen eines fehlenden Legacy-Patches nicht starten; ein `steel-formats`-Test mit übergroßer Vektorgrafik scheiterte dort im Worker und ist aktuell grün. Daraus wird keine Behauptung zweier fachlicher Fehlerbehebungen abgeleitet. Die Baseline-Ladelücke und unterschiedliche Skip-Zahlen bleiben Teil der Auswertung.

Die 60 gezielten Servertests umfassen zehn Galerie-, 31 Shop-Einstiegs- und 19 SQLite-Tests, davon 20 neue Tests für diesen Schritt. Darunter: Signatur-/Sitzungsbindung, Scope, falsche Basispreise, Legacy-Motivgesamtpreis, Revisionen, archivierte/pausierte/manipulierte Modelle, Pagination und aktuelle Assignment-Heads. Ein echtes synthetisches ZIP mit Foto wird durch den bestehenden Revisionsleser geprüft: Die ursprüngliche Sitzung kann die alte Konfiguration lesen; nach Produktwechsel verweigert derselbe Endpunkt sie mit `404/cart_private`; die ursprüngliche Sitzung bleibt anschließend funktionsfähig. SQLite-Dateien und Verbindungen werden im Test sauber geschlossen.

Weitere gezielte Prüfungen decken A/B-Wiederherstellung mit dem echten Draft-Validator, Rechte und Preisregeln, passende/mehrdeutige Textübernahme, Zoomgesten und Motiv-Einpassung ab. Der letzte vollständige Lauf liegt vor der abschließenden kleinen Darstellungskorrektur des Zoom-Reset-Knopfes; danach wurden Zoom und Bundle mit **20/20** erneut geprüft.

Finaler lokaler Editor-Build: **`bbcd6a7a9dc831ab`**, **107 Module**, **14 Styles**, **1.155.266 Bytes**, **378.501 Bytes gzip**, **76 geprüfte Originalressourcen**. Keine Schriftdateien wurden neu ins Code-Repo aufgenommen.

Gezielte Wiederholung im Repo:

~~~sh
node --test app/workshop/shop-design-gallery.test.mjs app/workshop/shop-entry.test.mjs app/workshop/shop-product-binding-store.test.mjs
node --test app/configurator/variant-m/toolbar-placement-ui.test.mjs app/configurator/variant-m/toolbar-placement-model.test.mjs app/configurator/variant-m/toolbar-placement-contract.test.mjs
node --test app/configurator/variant-m/view-zoom.test.mjs app/configurator/variant-m/view-zoom-model.test.mjs app/configurator/variant-m/bundle.test.mjs
node app/configurator/variant-m/build.mjs
~~~

## Übergabe und verbleibende Abnahme

1. Claude prüft den PR-Diff, den Preisvertragsschutz, A/B-Metadaten und den produktübergreifenden Sitzungswechsel; seine parallelen iPhone-/Zusatztextänderungen sind beim Zusammenführen zu erhalten.
2. Chris prüft die Desktop-/Handybilder und beide Leistenvarianten. Die Kundenzuteilung bleibt ausgeschaltet.
3. Den dokumentierten GitHub-Readback und die Bildzuordnung prüfen; Linux-Vollauf und ausgewiesene Baseline-Lücken separat bewerten.
4. Erst nach einer ausdrücklichen Freigabe für dieses Paket bereitstellen und die App neu starten. Danach aktive Preisbindungen und einen echten Shop-Warenkorb erneut prüfen. Dieser Auftrag führte keine Live-Schreibaktion, keinen Import, keine neue Freigabe und keine Bestellung aus.
