# Amazon Custom: manueller Dateiimport und Produktionsbarcodes

Stand: 16.10.2026. Der autorisierte Zusatzauftrag ist im lokalen Entwicklungsstand implementiert: positionsbezogener JSON-/ZIP-Testimport, unveränderliche Originale und Revisionen, ausdrückliche Feldprüfung, A4-/A5-PDF-Begleitscheine mit Code 128, Druckwarteschlange und drei interne Scanschritte. Aktuelle Prüfergebnisse: [siehe Testnachweis](ABNAHME.md). Diese Funktionen verwenden ausschließlich Testdaten und bestätigen keine produktive Custom- oder Hardwareabnahme.

**Der aktuelle Kontomenüweg und ein echter manueller Custom-Download wurden nicht getestet. Es liegt keine Freigabe vor, echte Kundenpersonalisierungen in diese Testumgebung zu übernehmen.** Zunächst werden synthetische oder ausdrücklich als anonymisiert bestätigte Muster verwendet.

## Was Amazon offiziell dokumentiert

Die aktuelle Amazon-Custom-Programmseite nennt **Manage Orders** und **Order Reports** als Zugänge zu den Personalisierungsangaben. Custom-Produkte werden vom Händler erfüllt. [Amazon Custom](https://sell.amazon.com/programs/custom).

Ein Amazon-Mitarbeiter beschreibt bei einer Custom-Bestellung den Link **Customization Information** sowie in Bestellberichten die Spalte **Customized-URL** für den ZIP-Download. Das Paket kann JSON/XML mit Text-, Schrift-, Farb- und Auswahlwerten sowie hochgeladene Bilder und eine SVG-Datei für deren Positionierung enthalten. Der ältere Beitrag erwähnt auch MWS; dieser APIteil ist keine Grundlage für die aktuelle Integration. [Offizieller Amazon-Beitrag zum Custom-Fulfillment](https://sellercentral.amazon.com/seller-forums/discussions/t/f3cac93a-ffb3-4529-af10-640116e2ab03).

Amazon hat Änderungen des JSON-Inhalts einschließlich zusätzlicher `flatratepricedeltacontainercustomization`-Felder bekanntgegeben und zur Prüfung bestehender Verarbeitung aufgefordert. Deshalb wird kein unveränderliches, vollständig bekanntes Schema unterstellt. [Amazon: Änderungen an ZIP/JSON](https://sellercentral.amazon.de/seller-forums/discussions/t/dac17d0f-c2cf-4b4d-9dea-a843478e9678?mons_sel_locale=de_DE).

Die von der aktuellen Programmseite verlinkte [Custom-Hilfeseite G201757520](https://sellercentral.amazon.com/help/hub/reference/G201757520) führte beim öffentlichen Abruf zur Anmeldung. Ihr vollständiger Inhalt und die konkrete deutsche Beschriftung im gravuru-Konto wurden nicht verifiziert. Ein alter Händlerbeitrag über Spaltenkonfiguration wird deshalb nicht als aktueller offizieller Klickpfad übernommen.

## Vorgesehener manueller Ablauf

Dies ist eine Arbeitsanweisung zur späteren Prüfung im tatsächlich berechtigten Seller-Central-Konto, keine Bestätigung bereits ausgeführter Kontoschritte:

1. Verkäuferkonto und Marktplatz prüfen; die konkrete Bestellung in **Bestellungen verwalten / Manage Orders** anhand ihrer Amazon-Bestellnummer suchen.
2. Die richtige Bestellposition anhand SKU, ASIN, Artikel und Menge identifizieren. Eine Bestellung kann mehrere unterschiedliche Custom-Positionen enthalten.
3. Die tatsächlich angebotene Personalisierungsansicht bzw. Downloadfunktion der ausgewählten Position öffnen. ZIP unverändert in einen freigegebenen, geschützten lokalen Arbeitsordner herunterladen. Falls nur ein Berichtszugang vorhanden ist, den dokumentierten Custom-Verweis der betreffenden Berichtszeile verwenden; nicht irgendeinen Link desselben Auftrags übernehmen.
4. Bestellnummer, Positionskennung und Dateizuordnung prüfen, bevor die Datei in gravuru ausgewählt wird. Wenn die Positionskennung im Konto nicht sichtbar ist, bleibt die Zuordnung prüfpflichtig; SKU oder Dateiname allein ersetzen sie nicht.
5. Originaldatei und Herkunft dokumentieren; danach Inhalt prüfen. Einzelnes JSON kann zur Strukturanalyse dienen, enthält aber möglicherweise keine mitgelieferten Bilder oder SVG-Platzierungsangaben. Ein JSON-Erfolg ist daher keine vollständige Custom-Freigabe.
6. Erst eine eindeutig zugeordnete und fachlich geprüfte Gestaltung darf mit einem gesicherten Werkstattstand verknüpft werden. Fehlende Inhalte, Mehrdeutigkeiten, Storno oder geänderte Amazon-Daten sperren die Herstellung.

Keine Browserautomatik darf nebenbei weitere Käuferdaten einsammeln, Downloads aus anderen Konten übernehmen oder nicht dokumentierte Endpunkte verwenden. Signierte Downloadlinks gehören weder in Chat noch Git noch Barcode oder PDF.

## Manuell ist keine zusätzliche API-Berechtigung

Ein vom berechtigten Verkäufer bedienter Seller-Central-Download und ein SP-API-Abruf sind verschiedene Zugänge. Der dokumentierte manuelle Zugang beweist keine DTC-Genehmigung für die App. Orders `v2026-01-01` behandelt `customizedUrl` als personenbezogene Daten und verlangt für Custom-Daten händlererfüllter Aufträge DTC. Das entfallene RDT hebt diese Rollenpflicht nicht auf. [Amazon: Zugriff auf Orders-PII](https://developer-docs.amazon/sp-api/docs/access-orders-pii).

Der Zwischenweg umgeht keine Datenfreigabe: Vor echten Dateien sind Verarbeitungserlaubnis, benötigter Umfang, sichere Speicherung und Zugriffsrechte zu klären. Ein hochgeladenes ZIP kann Fotos, Namen, Nachrichten und personenbezogene Metadaten enthalten. Benutzerangaben wie „anonymisiert“ sind eine Klassifizierung, kein automatischer Anonymitätsnachweis. Der spätere manuelle Import darf die API-Sperre weder deaktivieren noch automatisch eine Custom-URL abrufen.

## Verbindliche Zuordnung im Datenmodell

Die folgenden Regeln gehören zum gravuru-Datenmodell, nicht zu einem behaupteten Amazon-Paketschema. `amazon-custom-import.mjs` speichert Originalbytes als private SQLite-BLOBs und ergänzt unveränderliche Import-/Bestätigungsrevisionen. Datenbanktrigger verhindern UPDATE/DELETE dieser Originale und Revisionen. `lineId`, Amazon-Bestellnummer, `orderItemId` und SKU müssen exakt zur vorhandenen Testposition passen. Veraltete Versionen/Hashes, Storno, Konflikte und geänderte Auftragskontexte werden abgewiesen.

| Bezug | Anforderung |
|---|---|
| Verkäufer / Marktplatz | Konto und Marketplace gehören zur Identität; keine kontenübergreifende Zuordnung nur anhand einer Nummer |
| Bestellung | Amazon-Bestellnummer unverändert als Text speichern; keine entfernten Bindestriche oder numerische Umwandlung |
| Position | Vorhandene `orderItemId` bzw. verifizierte Positionskennung verwenden; Bestellnummer plus SKU ist bei mehreren gleichen Artikeln nicht zwingend eindeutig |
| Menge / Exemplare | Bestellmenge separat; nicht annehmen, dass jede Einheit dieselbe Personalisierung hat oder jede Datei einer Einheit entspricht |
| Original | Implementiert: Dateigröße, Format, SHA-256, Importzeit und Testklassifikation; Dateiname nicht als alleiniger Identitätsbeweis. Die produktive personenbezogene Benutzer-/Auditzuordnung bleibt eine Betriebsanforderung |
| Wiederholung | Gleiche Datei für dieselbe Position idempotent behandeln; erneuter Import darf keinen zweiten Fertigungsauftrag erzeugen |
| Änderung | Abweichender Hash bzw. widersprüchlicher Inhalt erzeugt einen neuen Prüfstand oder einen Konflikt; bestehenden freigegebenen Stand nicht still überschreiben |
| Fehlende Zuordnung | Import ohne exakt passenden vorhandenen Positionsbezug abweisen; keine automatische Zuweisung zum ersten Artikel |
| Werkstatt | Produktrevision, vollständiges Design und unveränderlicher Prüfstand bleiben getrennt von Dateiinventar und einzelnen Motiven |

Ein Paket mit mehreren Positionen oder eine Bestellung mit mehreren Paketen benötigt eine explizite Zuordnung. Feldnamen und Zuordnungsregeln werden erst anhand autorisierter Muster bestätigt. Kundenangaben dürfen nicht ergänzt, geraten oder aus ähnlichen Altaufträgen übernommen werden.

Die Oberfläche zeigt zunächst Dateiinventar und mögliche Feldpfade. Der Nutzer wählt Texte, Optionen oder Bildreferenzen aus, prüft die tatsächlichen ausgewählten Werte und bestätigt genau diesen Review-Hash. Vergleich von Version, Hash und Auftragskontext schützt vor parallelen Änderungen; eine unverändert wiederholte erfolgreiche Bestätigung erzeugt keine zweite Revision. Bestätigte Felder können auf Testbegleitscheinen erscheinen. Bildreferenzen enthalten Hash und Inventarbezug, aber keine bestätigte Bildgeometrie. Der Status bleibt `productionReady:false`.

## Dateiprüfung und Datenschutz

Der Import verwendet die vorhandene Musterprüfung mit begrenzten Dateigrößen/-zahlen und Entpackmengen, Pfadprüfung, Dubletten- und Konflikterkennung. Die Oberfläche begrenzt JSON auf 1 MiB und ZIP auf 8 MiB. Es gibt keine Netzwerkanfrage und keine Extraktion in das Dateisystem. ZIP-Pfadtraversal, verschachtelte Archive, ZIP-Bomben, aktive SVG-Inhalte und XML-Entitäten werden abgefangen; nicht unterstützte Inhalte bleiben Prüfbedarf. XML wird nicht als Gestaltung importiert, SVG nicht gerendert und Bilddateien nicht dekodiert. Der Ablauf ist kein vollständiger Layoutkonverter.

Im Testbetrieb keine echten Dateien, vollständigen Bestellberichte, Custom-Texte oder Fotos in das Repository, Fehlerprotokolle, öffentliche Vorschauen oder externe Analysedienste schreiben. Auch Vorschaubilder, PDF-Ausgaben und Druckerspooldateien benötigen einen geregelten Lebenszyklus. Ein lokaler Pfad oder Barcode ersetzt keine Zugriffsprüfung.

Für operative PII gilt die in [Sicherheit und Aufbewahrung](SICHERHEIT-UND-AUFBEWAHRUNG.md) beschriebene Zweck-/Fristenprüfung. Die Umsetzung darf nicht ohne Freigabe bestehende Daten löschen. Die Richtlinienbasis bleibt die aktuelle [Amazon DPP](https://sellercentral.amazon.com/solution-provider/policy?policyType=DPP&locale=en_GB).

## Code 128 auf PDF in A4 und A5

Implementiert ist ein interner Testbegleitschein. **Ein solcher Barcode ist weder Versandlabel noch GTIN, ASIN, Frankierung oder Amazon-Versandbestätigung.** Der Encoder verwendet normales Code 128, Zeichensatz B, mit Modulo-103-Prüfzeichen. GS1-128 besitzt zusätzliche FNC1-/Application-Identifier-Semantik und wird hier nicht erzeugt. [GS1: Aufbau von GS1-128](https://support.gs1.org/support/solutions/articles/43000734455/).

Implementiertes Verhalten und Betriebsanforderungen:

- PDF-Seitenformat A4 (210 × 297 mm) oder A5 (148 × 210 mm), zwölf Millimeter Rand, grundsätzlich eine Position pro Seite; lange Texte erhalten eindeutig zugeordnete Fortsetzungsseiten. Höchstens 100 Druckaufträge bzw. 200 PDF-Seiten pro Ausgabe.
- Schwarze Vektorbalken auf Weiß, Start-/Prüf-/Stoppzeichen aus dem Encoder. Die vollständige Kennung wird nicht abgeschnitten. Der Textumfang ist aktuell WinAnsi/CP1252; nicht unterstützte Zeichen werden mit Fehler abgewiesen und nicht durch erfundene Ersatzzeichen verändert.
- Zwölf schmale Module Ruhezone je Seite; Modulbreite höchstens 0,33 mm und mindestens 0,254 mm. Zu lange Kennungen werden abgewiesen. Balkenhöhe 15 mm für die Bestellnummer und 12 mm für die Position. Diese Geometrie ersetzt keine Prüfung mit dem tatsächlichen Drucker/Scanner.
- Exakten kodierten Nutzwert unter dem Barcode menschenlesbar drucken. Keine geheimen URLs, Namen, Anschriften oder Personalisierungstexte kodieren.
- Die Bestellnummer und ein eigener Positionscode werden getrennt kodiert. `G27P-` plus 16 hexadezimale Zeichen identifiziert eine Position anhand Konto, Testherkunft, Marktplatz, Auftrag und Item. Kollisionsprüfung verhindert stilles Umhängen. Standardaktion ist „Auftrag öffnen“; bei mehreren Ergebnissen werden die Positionen angezeigt.
- Sichtbar sind Bestellnummer, Positionsbezug, SKU, Menge, Herkunft und Gestaltungsstand. Die Druckwarteschlange erkennt veränderte Quelldaten und sperrt veraltete Aufträge. **Der stabile Positionsbarcode enthält keine Druckrevision; ein Scan allein beweist deshalb nicht, dass ein altes Papier dem aktuellen Prüfstand entspricht.**
- Länge, Zeichen und bekannte Referenzen werden geprüft. Mehrdeutige Bestellnummern erfordern Konto-/Herkunft-/Marktplatzeingrenzung. Wiederholte Aktions-IDs sind gegen Doppelverarbeitung geschützt. Scan allein bestätigt keinen physischen Vorgang oder Amazon-Versand.
- Druck im vorgesehenen Format mit 100 % bzw. tatsächlicher Größe prüfen; automatisches „an Seite anpassen“ darf die Mindestmaße nicht unkontrolliert verkleinern.

Code-128-Fähigkeit und Untertypen sowie Längenlimits sind am Scanner konfigurierbar; aus einem erfolgreichen Softwaredecoder folgt deshalb keine erfolgreiche Hardwareintegration. Die Herstellerdokumentation trennt normales Code 128 von GS1-128. [Zebra DataWedge: Decoder und Code-128-Optionen](https://techdocs.zebra.com/datawedge/latest/guide/decoders/).

Beim **Auftragsimport** werden automatisch A4-Testbegleitscheine vorbereitet und als PDF gespeichert. Das gilt nicht als automatisches Drucken. Ein PDF-Fehler wird als fehlgeschlagene Dokumenterstellung kenntlich; der importierte Auftrag bleibt erhalten. Nach Custom-Bestätigung oder sonstiger Änderung kann ein aktueller Stand neu eingereiht werden. Gleicher Inhalt und gleiches Format erzeugen keinen doppelten Druckauftrag. Die Stapelauswahl nimmt alle Positionen jedes ausgewählten Auftrags auf.

Die Warteschlange trennt „Vorbereitet“, „PDF erstellt“ und „Ausdruck bestätigt“. Die Druckbestätigung verlangt genau die zuvor erzeugte PDF-Auswahl und bleibt eine Benutzerbestätigung, `physicalPrintingVerified:false`.

Nach ausdrücklicher Wahl einer Statusaktion sind intern die Schritte **Fertigung → Qualität → Versandvorbereitung** implementiert. Überspringen ist gesperrt; Storno, Änderungen und offene Pflichtprüfungen blockieren den Fortschritt. Ein Positionscode betrifft eine Position. **Ein Bestellbarcode mit bewusst gewählter Statusaktion betrifft alle zugehörigen Positionen.** Es werden ausschließlich Testfortschritte gespeichert; kein Label gekauft und keine Versandmeldung an Amazon gesendet.

## Abnahmekriterien und aktueller Status

| Prüfung | Erwartetes Ergebnis | Aktueller Nachweis |
|---|---|---|
| Manueller Portalweg | Richtige Position und unverändertes Original heruntergeladen | Im gravuru-Konto noch nicht getestet |
| Musterimport | JSON und ZIP korrekt erkannt; Grenzen/Fehler nachvollziehbar | Positionsimport und geschützte HTTP-/UI-Anbindung implementiert; siehe Testnachweis |
| Mehrere Positionen / gleiche SKU | Keine stille Fehlzuordnung | Exakte Bestell-/Positions-/SKU-Prüfung implementiert; siehe Testnachweis |
| Dublette / geänderter Inhalt | Kein Doppelauftrag; Änderung verlangt Prüfung | Idempotenz, unveränderliche Revisionen, Review-Hash und Versionsvergleich implementiert; siehe Testnachweis |
| Echte Gestaltungsparität | Texte, Bildauswahl, Beschnitt, Größen/Positionen/Schrift korrekt | Offen; keine echten Muster freigegeben |
| A4-/A5-PDF | Maße, Ruhezonen, Umbruch und lesbarer Nutzwert geprüft | Vektor-PDF, Stapel, Hashnachweis und Warteschlange implementiert; siehe Testnachweis |
| Unabhängiger Softwaredecode | Gerendertes PDF liefert exakt den erwarteten Nutzwert | Aktuelles Ergebnis siehe Testnachweis; kein Ersatz für Hardwaretest |
| Physischer Ausdruck | Ausdruck in beiden Formaten mit tatsächlichem Werkstattgerät lesbar | **Hardwareabnahme offen** |
| Scan in gravuru | Richtiger Auftrag/Position; ungültige, mehrdeutige und wiederholte Aktionen sicher behandelt | Auflösung und drei interne Teststufen implementiert; siehe Testnachweis. Physischer Scanner und Erkennung der Druckrevision allein aus dem Barcode nicht bestätigt |

Für die Hardwareabnahme Druckermodell, Auflösung, Papier, Skalierung, Scannermodell, Code-128-Konfiguration und übertragenen Nutzwert festhalten. Mindestens einen Auftrag mit mehreren Positionen, identischen SKUs und einen veralteten Prüfstand testen. Keine Scanquote oder Werkstatttauglichkeit behaupten, bevor diese Prüfung tatsächlich durchgeführt wurde.
