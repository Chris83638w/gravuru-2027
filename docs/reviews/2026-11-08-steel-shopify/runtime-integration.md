# R15 → echte Shopify-Produktsitzung: technische Anschlussprüfung

Stand: 08.11.2026. Nur lesende Codeanalyse und lokale Tests; keine Runtime-Datei, kein Design, kein Server und kein Shop geändert. Der freigegebene Aufbau von CSS/HTML bleibt unverändert. Die Produktoptionen sind bis zur ausdrücklichen Bestätigung **pending**. Dieser Bericht ist kein Verkaufs- oder Veröffentlichungsnachweis.

Geprüfte Quelle: `work/konfi-mobile-demo-20261107`, Commit `863b7fd3f6121714ca2b693ffa092ae2edb4944b` (R15). Der Arbeitsbaum war vor und nach der Prüfung sauber. Pfade unten beziehen sich auf diese Quelle; Zeilen auf diesen Stand.

## Ergebnis und kleinster Weg

**Die bestehende native Shop-Anbindung weiterverwenden; R15 als ausdrücklich gewählte Oberfläche daran anschließen. Den Demo-Builder nicht in einen Shop-Builder verwandeln.** Produkt-/Variantenbindung, Preisprüfung, Originalmedien, Entwurfssicherung, Warenkorb und Rücksprung existieren bereits in der nativen Strecke. Eine zweite Umsetzung dieser Funktionen wäre unnötig und würde insbesondere die Zuordnung zu Produktrevision und Bestellposition gefährden.

Der kleinste konkrete Runtime-Vorschlag besteht aus:

1. Einem kleinen, getrennten Kunden-Adapter, der die R15-Oberfläche nur für die ausdrücklich ausgewählte Produktsitzung installiert und den Kontext aus dem vorhandenen Elternfenster übernimmt.
2. Einem einzigen Aufruf dieses Adapters **am Ende der nativen `installUX`-Initialisierung, vor `gravuru-ux-ready`**. Dieser Aufruf bleibt ohne explizites Opt-in wirkungslos. Dadurch funktionieren erster Einstieg und spätere Designwechsel gleich. Er gehört in Mikas freigegebenen Konfi-Änderungsweg; kein anderer Agent soll die gemeinsame Runtime eigenständig verändern.
3. Kleinen Kontextparametern in `demo.mjs`: Produkt-/Materialbezeichnung und verbundener Kundenmodus statt fest eingebautem „Schiefer“/„Mobile Demo“/„Bestellung nicht verbunden“. DOM-Struktur, Anordnung, CSS und vorhandene Aktionen bleiben identisch. Eine bloße CSS-Überschreibung würde sachlich falsche Texte verdecken, statt den Kontext korrekt anzuschließen.
4. Einer **separat freizugebenden** Lösung für das bisher rechteckige Motivgrößenlimit. Ohne diese Korrektur ist R15 nicht für alle acht Edelstahlformen bedienbar. Keine stillschweigende Abschaltung der Geometrieprüfung und keine Simulation einer Kontur durch ihre Rechteckbox.

Für die jetzt priorisierte Produktvorbereitung reichen zunächst der isolierte Connector, eine nachvollziehbare Vorprüfung und die Optionsbestätigung. Der Runtime-Hook kann danach als kleiner eigener Änderungssatz geprüft werden. Dieser Bericht implementiert ihn nicht.

## Warum das Demo-Paket nicht der richtige Bestellanschluss ist

`ops/mobile-demo/build.mjs` isoliert die Demo absichtlich:

- Zeilen 45–48: eigenes Bootstrap mit `GravuruMobileDemo`, `checkout:false`, `GravuruWorkshopReview=null`, `GravuruShopEntry=null`; `fetch`/XHR erlauben nur GET/HEAD im Demo-Namespace, `sendBeacon` ist deaktiviert.
- Zeilen 61–70: exakt zwei Schiefermodelle, jeweils 43 Designs und bestätigte Preise 1.999/2.499 Cent. Das ist keine universelle Edelstahl-Eingabeschnittstelle.
- Zeilen 112–116: neue Demo-IDs/Revisionen, `binding.kind:'local-review'`, `orderEnabled:false`, `productionConfirmed:false`, echte Varianten-IDs werden entfernt; `reviewOnly`/`productPreview` werden gesetzt.
- Zeilen 37–42: eigene Browser-/Upload-Speichernamensräume; Produktions- und Demodaten werden bewusst getrennt.

Diese Sperren sollen erhalten bleiben. Nur `checkout:true` setzen, `reviewOnly` löschen oder die Demo-IDs durch Shop-IDs ersetzen stellt keine sichere Bestellstrecke her. Das statische Demopaket enthält außerdem zusätzliche native Module und Bundles; `mobile-demo/` allein ist kein vollständiger Konfigurator.

## Bereits vorhandene native Schnittstellen

| Abschnitt | Datei / Schnittstelle | Unverändert wiederverwenden |
|---|---|---|
| Shop-Einstieg und Sitzung | `app/workshop/shop-entry.mjs`, `createShopEntry`; `shop-entry-session.mjs` | Signierter Einstieg, Bindungsregistry, Mandant/Shop, Produkt/Variante, feste Produktrevision, Ablauf und erneute Bindungsprüfung. |
| Modell und Ressourcen | `app/workshop/ui/shop-entry-client.mjs`, `createShopEntryClient()` | `loadInitialModel`, `loadResources`, `request`, `loadDesignGallery`, `switchDesign`, `submitThemeCart`. Sessiontoken nur über den vorgesehenen Header. |
| Elternfenster und Editor | `app/workshop/ui/shop-entry-page.mjs`, `activate(entry,designGallery)` | Setzt `GravuruModelProfile`, `UniversalConfig`, `GravuruPreviewResources`, `GravuruWorkshopReview`, `GravuruMerchantRequest`, `GravuruShopEntry`; erstellt das native Editor-iframe. |
| Native Modellbildung | `app/workshop/http.mjs:230–267`, `buildModel` | Universalprodukt inklusive Edelstahl wird als `key:'acryl'` über den universellen Editor bereitgestellt. Der technische Schlüssel bedeutet hier nicht das tatsächliche Material. |
| Editor-Build | `app/configurator/variant-m/build.mjs:118–122` | Native Module/Schriften/Materialhydrierung, `adapter.installUniversal`, `ux.installUX`; kein eigener Renderer im Connector. |
| R15-Oberfläche | `app/configurator/mobile-demo/demo.mjs`, `installMobileDemo(el, config)` | Verschiebt die echten nativen Bedienelemente und delegiert weiterhin deren Aktionen, History, Mengenfeld, Preise, Text-/Motiv-/Fotobearbeitung und Vollbild. |
| Abschluss | `variant-m/completion.mjs:25–39` → `workshop-review.mjs:16–22` → `shop-cart.mjs:37–90` | Die äußere `.completion-finish` öffnet die Übersicht; die echte Shop-Aktion wird in deren Footer installiert. Prüfung, private Sicherung und servergeprüfte Übergabe bleiben erhalten. |
| Rückkehr zum Produkt | `mobile-demo/product-return.mjs`; `shop-entry-page.mjs` | Native `gravuru-fk-close`-Nachricht an den gleichoriginigen Elternrahmen; dieser kennt `backUrl` bzw. den eingebetteten Shop-Kontext. Keine neue frei zusammengesetzte Zieladresse. |
| Designwechsel | `app/workshop/ui/shop-design-switch.mjs` | Signierte Zielauswahl, neues gebundenes Modell/neue Sitzung, Texte-/Optionstransfer, Rückkehr zum vorherigen iframe bei Fehler. |

### Kontext, den der Adapter lesen darf

Das Elternfenster stellt bereits bereit:

- `UniversalConfig`: vollständiger nativer Produktvertrag; insbesondere `profile`, Optionen, Designs und Ressourcen.
- `GravuruWorkshopReview = {productId, productRevision}`: feste Speicher-/Prüfbindung.
- `GravuruShopEntry`: dieselbe Produktbindung, Shop-Domain, Shopify-Produkt-/Varianten-ID, Ablauf, `request`, `submitCart`, `cartMode:'theme'`, `themeCartPath`, `backUrl`, Einbettungsstatus und `designGallery`.

Der Adapter darf diese Werte **nicht neu erfinden oder verändern**. Er sollte vor Installation prüfen, ob die beiden Bindungen übereinstimmen und die nativen Voraussetzungen vorhanden sind. Das ist eine UI-Voraussetzung; die Serverprüfung bleibt die Bestellberechtigung. `checkout:false` im Demo-Global ist kein ausreichender Shop-Sicherheitsmechanismus, und `orderEnabled:false` im nativen Legacy-Shell-Modell ist kein Fehler, den man pauschal „reparieren“ sollte.

`http.mjs` erzeugt bewusst eine sichere Legacy-Shell und versieht das Universalmodell mit der tatsächlichen Repository-ID/Revision. `validateFamilyFormats` verlangt weiterhin `local-review`/`orderEnabled:false`. Die echte Katalog-Verkaufsfreigabe liegt separat in `shop-entry.mjs:102–108`: `catalogLiveOrders` und eine passende `catalogLiveApproval`. Diese Trennung erhalten.

### Initialisierung und Ready-Signal

R15 erwartet derzeit `window.GravuruMobileDemo` (`demo.mjs:19–20`). Seine automatische Initialisierung wartet auf `ready` und eine Nachricht, deren `source === window` ist (`322–331`). Das funktioniert in der alleinstehenden Demo, weil deren `window.parent === window` ist.

Im nativen Shop-iframe sendet `ux.mjs:543` dagegen an `window.parent`. Einfach `demo.mjs` daneben zu laden würde deshalb nicht zuverlässig installieren. Außerdem muss als Konfiguration ausdrücklich `window.parent.UniversalConfig` übergeben werden; der heutige Defaultparameter liest `window.UniversalConfig`.

Empfohlen: Adapter aus der nativen Initialisierung explizit mit dem fertigen Element aufrufen; R15-Installation abwarten, **dann** das vorhandene `gravuru-ux-ready` senden. Dadurch sehen weder Start-Ladekarte noch Designwechsel eine halbfertige Oberfläche. Ein selbst erzeugtes frühes Ready-Signal oder pauschale Timer-/Nachrichtenweiterleitung wäre unnötig fragil.

Wichtig: `shop-design-switch.mjs:45–53` erstellt weitere iframes und wartet ebenfalls auf `gravuru-ux-ready`. Ein Hook nur im ersten `shop-entry-page`-iframe reicht nicht. Der vorgeschlagene native End-of-init-Hook gilt automatisch für jedes neue Element. Fehler beim Installieren müssen den vorhandenen Fehler-/Rollbackweg nutzen; keinen nativen Fallback still als R15 ausgeben.

### Kontexttexte und Fähigkeiten

Noch fest auf Demo/Schiefer gesetzt sind `demo.mjs:42–46`, `80` und `273`. Die Zusammenfassung muss ihre Material-/Formatinformation aus dem **gerade ausgewählten nativen Profil** und `state.width/height` beziehen, den Produktnamen aus dem geladenen Modell. Nicht nur den Erstzustand berücksichtigen.

Die R15-Navigation übernimmt `hidden`/`disabled` der nativen Tabs und beobachtet Änderungen (`demo.mjs:257–267`). Das ist richtig und soll so bleiben. Für Edelstahl müssen Foto-/Logo-Fähigkeiten explizit aus dem bestätigten Produktprofil kommen. Die native Regel in `ux-model.mjs:16–20` blendet den Fotoreiter bei nicht fotofähigen Produkten ohne entsprechende Ebene aus; freigegebene SVG-Vektorlogos bilden eine eigene Ausnahme.

Der aktuelle Katalogpfad `katalog-family-formats.mjs:113–115` enthält eine ältere Regel „Edelstahl kein Foto, SVG-Logo 12,99 €“. Das ist ein nachweisbarer Bestandswert, **keine neue Nutzerbestätigung für diesen Pilot**. Logos/Fotos und Preisregeln vor Anlage ausdrücklich bestätigen bzw. pending lassen. Die bestehende R15-Fußzeile nennt den Upload-Reiter fest „Foto“, das Menü „Fotos & Logos“: bei einem Logo-only-Produkt muss die Beschriftung als kontextabhängiger Text geprüft werden, ohne die Anordnung zu ändern.

## Alle acht Konturen: Stand und Lücken

Die lokale gepinnte Fixture `app/workshop/test-fixtures/acryl3-rear/steel.json` enthält folgende 80 Größen. Die Fixture belegt Code-/Geometrieumfang, ersetzt aber nicht die aktuelle bestätigte Katalogquelle des Connectors.

| Quellform | Geometrie | Größen | R15-Motivgrößenlimit heute |
|---|---|---:|---|
| RE | `rect`, Radius 0 | 27 | Rechteckiger Grenztest aktiv |
| AB | `rect`, Radius 5 mm | 10 | Größen-/Drehänderung wird zurückgenommen |
| QU | `rect`, Radius 0 | 7 | Rechteckiger Grenztest aktiv |
| OV | `ellipse` | 10 | Größen-/Drehänderung wird zurückgenommen |
| EL | `ellipse` | 7 | Größen-/Drehänderung wird zurückgenommen |
| R | `ellipse` | 5 | Größen-/Drehänderung wird zurückgenommen |
| RT1 | `contour`, Originalpfad | 7 | Größen-/Drehänderung wird zurückgenommen |
| RT2 | `contour`, Originalpfad | 7 | Größen-/Drehänderung wird zurückgenommen |

Die ältere Datei `app/designs/steel-door-signs/family.json` enthält nur RE/AB/QU/OV/EL und 61 Größen. **Nicht als komplette Pilotquelle nehmen.**

`mobile-demo/motif-size-limit.mjs:8–15` akzeptiert nur ungerundete Rechtecke; `64–73` stellt bei allen anderen Geometrien die vorherige Größe/Drehung wieder her. Da `demo.mjs:283` den Hook bedingungslos installiert, ist dies ein konkreter Funktionsblocker für sechs Formen, nicht bloß fehlende Testabdeckung.

Native Geometrie ist bereits breiter vorhanden:

- `workshop/product-families.mjs:210`: echte Breite/Höhe, Form, Radius und bei Konturen `outlinePath`, feste `holesMm`, optionale Ausschnitte.
- `variant-m/edge-clamp.mjs:55–71`: `clampToContour` nutzt die gemeinsame Flächenprüfung; Positionen werden begrenzt, übergroße Objekte aber nicht einfach passend gerechnet.
- `mobile-demo/edge-resize.mjs:16–24`: verwendet die nativen Kontur-/Textgrenzen vor dem normalen Einpassen.
- `variant-m/family-formats.mjs`: Auswahl, passende Designs, Geometrie, Befestigungsbohrungen, skalierte Übernahme und Preise kommen aus demselben Formatvertrag.

Minimal nötige Weiterentwicklung: Motivvergrößerung auf jeder Form gegen die vorhandene reale Flächenprüfung prüfen, erlaubte Verkleinerung/Drehung erhalten und bei Überschreitung auf eine verifizierte gültige Größe begrenzen. Größen allein gegen `width × height` zu begrenzen genügt für Kreis/Oval/Retro nicht. Den bestehenden Bewegungstest einfach einzusetzen genügt ebenfalls nicht, weil er kein Größenlimit berechnet. Das ist eine kleine, aber fachlich eigenständige Änderung mit Tests; kein Datenadapter kann sie glaubwürdig ersetzen.

`family-formats.mjs:23` fasst EL für die sichtbare Formwahl unter OV zusammen. Beide Quellformen und Größen existieren intern. „Alle acht Konturen“ bedeutet deshalb nicht automatisch acht sichtbare Form-Reiter. Die bestehende Zusammenfassung ist vor einer etwaigen Änderung fachlich zu besprechen.

Bei Formwechsel können Designs ohne freigegebene Zuordnung nicht angeboten werden. `familyFormatSelection` weist Größen ohne `designIds` zurück. Die aktuelle Testfixture enthält den Kreis absichtlich ohne freigegebenes Design. Alle Formen im Katalog zu haben ist deshalb noch kein Nachweis, dass jede Form sofort ein verkaufbares Originaldesign besitzt.

## Preis, Format und Startdesign: eine Quelle behalten

`variant-m/contract.mjs:224–265` ist die zentrale Angebotsberechnung. Familienformatpreise stammen aus `familyFormatPrice` (Grundpreis der gewählten Variante plus zugehörige Befestigung), ergänzt um die bestehenden Motiv-/Feld-/Rückseiten-/Staffelregeln. `motifCharge:'all'` und `extraMotifCents` bestimmen, ob alle sichtbaren Motive oder nur zusätzliche Motive kostenpflichtig sind. Das ist keine CSS-/UI-Frage und darf nicht im Connector ein zweites Mal berechnet werden.

`shop-entry.mjs:231–279` löst die gespeicherten Optionen erneut auf die aktive eindeutige Shopify-Variante auf; Seitenvarianten und Browserpreise sind nicht maßgeblich. Fehlende/mehrdeutige Variantenbindungen müssen vor jeder Übergabe stoppen. Optionsbestätigung, Preise und Freigabe müssen sich auf genau die Produktrevision beziehen, die diese Zuordnung verwendet.

Für Größen verwenden:

- `familyFormats` für alle kataloggebundenen Formen/Größen einschließlich Retro-Konturen;
- nicht pauschal `steelFormats`: dort sind Konturen und Größen mit anderen Proportionen ausdrücklich eingeschränkt;
- `shopStartModel` für kleines Startmodell und `product-design-gallery`/`shop-design-switch` für spätere Designs.

`shop-start-model.mjs` übernimmt das gebundene Startdesign und bei „alle Größen“ zusätzlich den passenden Ersatz je Format. Der gespeicherte vollständige Serververtrag bleibt erhalten. Das Hauptproduktbild muss daher mit einer stabilen Design-ID verknüpft sein, nicht durch Bilddateiname/Bilderkennung erraten werden. Nicht freigegebene bzw. unpassende Designs nicht als Ersatz erfinden.

## Testnachweise aus dieser Prüfung

Keine echten Shopify-Aufrufe/Bestellungen. Die folgenden lokalen Tests verwenden Fixtures und Testserver.

### 112 gezielte Tests ohne angezeigten Fehler

Ausgeführt gemeinsam mit dem Node-Dot-Reporter:

- `mobile-demo/demo.test.mjs`
- `mobile-demo/product-return.test.mjs`
- `mobile-demo/edge-resize.test.mjs`
- `mobile-demo/motif-size-limit.test.mjs`
- `variant-m/family-formats.test.mjs`
- `workshop/contour-contract.test.mjs`
- `workshop/shop-entry-client.test.mjs`
- `workshop/shop-entry-session.test.mjs`

Der Lauf zeigte 112 erfolgreiche Punkte und wurde beendet. Abgedeckt sind u. a. echte native Aktionen statt doppelter Eventhandler, Rückbau, Tab-Fähigkeiten, Vollbild, Maus/Touch-Ecken, Ellipsengrenze, sichere Sitzung, ausgewählte Varianten/Preise, Retrofit-Konturpfade und feste Bohrungen.

### Erweiterter Shop-Test: 41 bestanden, 2 fehlgeschlagen

`shop-entry.test.mjs`, `shop-entry-flow.test.mjs`, `cart-priced-options.test.mjs`: 43 Tests, 41 bestanden, 2 Fehler, Node-Exitcode 1. Fehler anschließend gezielt ausgelesen; keine weiteren breiten Läufe.

1. `shop-entry.test.mjs:66`: Vektorlogo-Konvertierung liefert **503 `logo_converter_unavailable`** statt 200.
2. `shop-entry-flow.test.mjs:76`: Entwurf mit Testfoto liefert **422 `invalid_customer_photo`** statt 201. Damit ist dieser vollständige Warenkorb-/Webhook-Flow in der aktuellen Umgebung nicht grün nachgewiesen.

Die Konvertierung ist nicht allein JavaScript: `customer-vector-logo.mjs` startet Python; der Worker benötigt u. a. `pathops` und `picosvg`. `customer-photo.mjs` startet `photo-import.py` über `GRAVURU_PYTHON` oder `python3`. Die konkrete fehlende/fehlerhafte Komponente wurde nicht abschließend bestimmt; die Fehler nicht als sicher harmlose Testumgebung abtun. Vor SVG-Logo-Freigabe und späteren Fotoprodukten die tatsächlich verwendete Serverlaufzeit mit bekannten Originaldateien prüfen. Es wurde nichts nachinstalliert.

### Was die vorhandenen Tests noch nicht beweisen

- Kein echter R15-Shop-iframe inklusive erster Bereitschaft, Designwechsel, Rückkehr und Warenkorb wurde hier im Browser geprüft.
- Der Test „80 source sizes“ dupliziert Testformate. Er beweist Vertragskapazität, nicht alle 80 echten Maße/Preise/Befestigungen.
- Motivgrößenlimit-Tests beweisen heute ausdrücklich das Zurücknehmen auf nicht unterstützten Flächen; sie beweisen keine bedienbare Kurvenform.
- Die Materialdatei-Wiederverwendung wird im vorhandenen Test explizit nur für RE, RT1, RT2, OV, QU verglichen.
- Kein vollständiger Browser-/Produktionsnachweis für freigegebene Originaldesigns jeder der acht Formen, insbesondere den in der Fixture nicht verfügbaren Kreis.
- Keine Bestätigung offener Pilotoptionen durch den Nutzer; keine Live-Preisfunktions-/Variantenaktivierung durch diese Prüfung.

## Konkrete Abnahme für den späteren kleinen Adapter

1. **Unverbundene Demo bleibt unverbunden:** bisherige Pakete, Daten, Speicherbereiche und R15-Anordnung unverändert; Kundensitzungsmodus nur explizit aktivieren.
2. **Erster Einstieg:** gewählte Shopify-Produkt-/Varianten-ID lädt exakt die gebundene Produktrevision, Material/Form/Größe/Befestigung und Original-Startdesign; R15 ist vor Ready sichtbar, keine native Zwischenoberfläche.
3. **Designwechsel:** gleiches Verhalten für jedes neue iframe; fehlendes Asset/abgelaufene Sitzung stellt den vorherigen Stand wieder her. Keine Entwurfs- oder Fotoverluste durch Wechsel/Zurück.
4. **Alle acht Formen:** je kleinste/größte Größe plus jedes abweichende Bohrbild; Randziehen, Skalieren, Drehen und Verkleinern von Text/Motiv/erlaubtem Logo, auch nach Größenwechsel und Undo. Echte Kontur sowie Druck-/Gravur-SVG gegen denselben Vertrag prüfen.
5. **Preis und Bestellbindung:** jede erlaubte Größen-/Befestigungskombination, Mengenstaffel falls bestätigt, zusätzliche Motive und freigegebene Uploads; Vorschaupreis = gesicherter Preis = servergeprüfte Warenkorbposition. Fehlende/mehrdeutige Bindung und veraltete Revision bleiben blockiert.
6. **Fähigkeiten:** bei Stahl kein Fotodialog, sofern nicht ausdrücklich anderes Material/Verfahren freigegeben; Logo-Reiter und Zusatzpreis nur nach bestätigter Regel. Client-UI und Server erlauben dieselben Optionen.
7. **Bedienung:** Desktop und mobile Tastatur, gleichbleibende R15-Anordnung, Warenkorb-/Übersichtsaktion nur einmal, Rücksprung zum richtigen Produkt, erneutes Bearbeiten genau derselben Warenkorbzeile.
8. **Runtime-Vollständigkeit:** Modulgraph/CSS/Fonts/Materialressourcen auf dem Zielhost prüfen, inklusive CSP und Pfaden. Den neuen Adapter als eigenes, gepinntes Artefakt ausliefern; kein pauschaler Merge sämtlicher R15-Branch-Dateien.

Das freigegebene Layout kann erhalten bleiben. Die fachliche Freigabe hängt an bestätigten Produktdaten, vollständigen Formfähigkeiten und der bestehenden serverseitigen Bestellstrecke – nicht daran, ob in der Demo bereits ein grüner Warenkorbknopf sichtbar ist.
