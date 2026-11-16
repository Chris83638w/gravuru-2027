# Unabhängige Gesamtprüfung · Gravuru 2027

**Stand: 16. November 2026 · Auftrag: [Issue 239](https://github.com/Chris83638w/gravuru-2027/issues/239) · Prüfung ohne Änderungen an Anwendung, Produktdaten oder Freigaben**

## Ergebnis

**Ich würde den untersuchten Gesamtprozess noch nicht als durchgehend abgenommen einstufen.** Die neue Preisfunktion und die Checkout-Prüfung sind tatsächlich installiert. Die Datenbanken bestehen die ausgeführten Integritätsprüfungen; die geprüften Grundpreise stimmen überein. Es gibt aber zwei kritische Lücken an der Grenze zwischen Warenkorb und gespeichertem Entwurf sowie einen reproduzierbar defekten Bearbeiten-Weg.

Die wichtigsten Ergebnisse:

| Bereich | Feststellung |
|---|---|
| Installation | Version `gravuru-2027-preis-einzelsperre-20261116-b1`, ID `1223825227777`, direkt bei Shopify als aktiv zurückgelesen. **9 von 9 Modulkonfigurationen** stimmen mit dem Kandidaten B überein. |
| Laufzeit | Plesk startet `kandidat-68334981-20261113`. Drei für die Hauptbefunde maßgebliche Dateien stimmen per SHA-256 mit dem geprüften Quellstand überein. |
| Shopumfang | **1.196 aktive Produkte, 24.598 Varianten** vollständig aufgelistet; 1.194 Produkte haben eine Onlineshop-URL. „Aktiv“ bedeutet also nicht automatisch öffentlich angeboten. |
| Preisvertrag → Shopify | **501 Varianten aus 14 Produkten**, keine Abweichung, keine fehlende Variante in einer aktivierten Gravuru-Preistabelle. Kein untersuchtes Preis-Metafeld über 10.000 Bytes. |
| Excel → Shopify | **424 Varianten aus drei Produkten** centgenau mit der aktuellen Katalog-Excel abgeglichen: 404 Edelstahl, 20 Acryl D8/D10. Jede Zeile hat einen Zellnachweis. |
| Datenbanken | Sechs SQLite-Dateien aus aktivem und älterem Datenbereich: `quick_check = ok`, keine gemeldeten Fremdschlüsselverletzungen. Zusätzlich drei zentrale logische Verknüpfungen im aktiven Speicher ohne verwaiste Datensätze. |
| Anwendungstests | **2.702 Tests: 2.684 bestanden, 7 fehlgeschlagen, 11 übersprungen.** Ursachen unten getrennt bewertet. |
| Preisvergleich | **2.250 gültige Fälle** ohne Unterschied zwischen alter und neuer Preisberechnung; **1.500 ungültige Fälle** mit Checkout-Fehler. Zusätzlich gezielte Gegenproben zu manipulierbaren Angaben. |
| Echter Kundenweg | Produkt → Editor → Entwurf → Warenkorb → Kasse ohne Kauf getestet. Mengenänderung und Bearbeiten-Fehler reproduziert. Eigener Testartikel anschließend entfernt; Warenkorb wieder leer. |

**Grenze der Aussage:** Dies ist eine Prüfung der unten genannten Quellen, Installationen, Daten und Abläufe. Keine vollständige Sicherheitszertifizierung, keine Sichtprüfung sämtlicher 24.598 Varianten und kein Nachweis eines bezahlten Auftrags bis zur tatsächlichen Fertigung. Offene Prüfungen sind ausdrücklich ausgewiesen.

## 1. Prüfbasis und Vorgehen

Die Prüfung begann ohne vorausgesetztes Projektwissen mit Issue 239, den Repository-Regeln, `ENTSCHEIDUNGEN.md`, Status, Übergaben, Quellcode und Katalog. Danach wurden dokumentierte Aussagen mit dem tatsächlich laufenden System abgeglichen.

| Quelle | Fixierter Stand / Verwendung |
|---|---|
| Code-Repository | `Chris83638w/gravuru-2027`, Audit-Checkout `546d4b0a26d68306e23c05438675e2d41cc5aef9`, Branch der Einzelsperre. |
| Code-main | Zusätzlich gesichtet: `76269aa85b5dd7e22957fb138de7d404758d9ea5`. Dieser Stand und seine Einstiegsdokumentation allein beschreiben die laufende Installation nicht ausreichend. |
| Katalog | `Chris83638w/gravuru-katalog.`, main `8236b8bf`, Merge #186. Stammdaten, Familien, Geometrie und verfügbare Excel-Dateien gelesen. |
| Fachliche Entscheidungen | `ENTSCHEIDUNGEN.md`, insbesondere Regeln zu Preisen, Logo, Befestigungen, Entwurfserhalt und Abstand. Frühere Regeln wurden nicht stillschweigend als aktuelle Vorgabe übernommen. |
| Shopify | Lesende Abfragen des Produktbestands und der app-eigenen Preis-Metadaten, aktive App-Version und Module, Sichtprüfung von Checkout-Regeln und FPD-Warnung. |
| Plesk | Laufzeit-Einstieg, Speicherorte, Dateirechte, Datenbanken, Release-Dateien und sichtbare Sicherungskonfiguration. Datenbanken ausschließlich mit `mode=ro` und `query_only` geöffnet. |
| Browser | Veröffentlichtes Theme, Desktop und mobile Ansicht, echter eigener Warenkorb. Eine anfänglich vorhandene Theme-Vorschau wurde erkannt und verlassen; deren Befunde werden hier nicht als Fehler des veröffentlichten Themes gewertet. |

Keine Anwendung geändert, keine Produkte oder Preise geschrieben, keine Freigabe erteilt, nichts veröffentlicht, keine Bestellung bezahlt, keine Serverdaten gelöscht. Die einzige fachliche Teständerung war ein eigener Warenkorbartikel mit dem Text „Audit 239“, der wieder entfernt wurde. Der normale Testweg erzeugte einen privaten Entwurf/ein Angebot auf dem Server; diese Prüfhistorie wurde nicht gelöscht. Es wurden keine Kundeninhalte oder Zugangsdaten in das Belegpaket übernommen.

## 2. Rekonstruierter Ablauf und Datenmodell

### Vom Produkt zur Fertigung

1. **Vorgabe und Katalog:** Excel/Zeichnungen und dokumentierte Entscheidungen liefern Maße, Befestigungen und Preise. Familien und Designs werden im Katalog versioniert. Die Katalogregeln behandeln JSON als technischen Hauptbestand; Excel/PDF können daraus erzeugte Ausgaben sein. Das ist von der fachlichen Originalquelle zu unterscheiden.
2. **Werkstatt:** Produktfamilien, Produktrevisionen, Varianten und Fertigungsprofile werden in SQLite gespeichert. Freigaben und feste Shopify-Zuordnungen verbinden einen konkreten Produktstand mit einem Shopartikel.
3. **Shop-Einstieg:** Shopify verweist über den App-Proxy auf die Plesk-Anwendung. Eine begrenzte Sitzung bindet Produkt/Variante an das Kundenmodell. Der Editor lädt Designs, Schriften und weitere Ressourcen.
4. **Gestaltung:** Texte, Motive, Logos beziehungsweise Fotos und Ausführung werden im Editor bearbeitet. Für den Warenkorb wird ein privater Stand mit Prüfabbild und Angebot gesichert.
5. **Warenkorb:** Die Shopify-Zeile enthält Variante und Menge sowie Entwurfs-, Revisions- und Preisattribute. Die Preisfunktion berechnet den Stückpreis anhand app-eigener Produktdaten und dieser Attribute.
6. **Checkout:** Die neue Checkout-Funktion prüft die Preisvoraussetzungen. Sie prüft dabei **nicht die vollständige serverseitige Angebotsbindung**. Hier entstehen die Hauptbefunde F01/F02.
7. **Zahlungseingang:** Erst `orders/paid` gleicht Variante, Menge, Preis, Personalisierung und Angebotsalter mit dem gespeicherten Angebot ab. Unzulässige Positionen werden als Fehler protokolliert; gültige Positionen desselben Ereignisses können weiterlaufen. Das ist ein Schutz vor falscher Produktion, aber kein Schutz vor einer bereits erfolgten Zahlung.
8. **Produktion und Download:** Produktionsfreigaben, Ausgabeprüfungen und Kundendownload-Berechtigungen bilden weitere getrennte Schritte. Ein angenommener Zahlungseingang wird nicht automatisch als fertigungsbereit behandelt.

**Zentrale Beziehungen:** Produkt → Produktrevision → Prüfstand → Angebot → Konfigurationsrevision → Shopify-Warenkorbzeile → bezahlte Bestellposition → Produktionsfreigabe/Ausgabeprüfung → Downloadberechtigung.

### Tatsächliche Speicheraufteilung

Der Einstieg `gravuru-2027-merchant/app.cjs` verweist auf `private/kandidat-68334981-20261113/scripts/acryl-employee-entry.cjs`. Daneben besteht eine ältere kombinierte Laufzeit. Es gibt deshalb **zwei relevante Datenbereiche**, die nicht verwechselt werden dürfen:

| Datenbereich | Datei | Größe in Bytes | Schema-Version | Prüfergebnis |
|---|---|---:|---:|---|
| Aktiv: `private/acryl-employee-20261021-v1/data` | `workshop.sqlite` | 4.352.729.088 | 4 | quick_check ok, FK-Prüfung ohne Fehler |
| Aktiv | `design-assets.sqlite` | 166.719.488 | 0 | quick_check ok, FK-Prüfung ohne Fehler |
| Aktiv | `profiles.sqlite` | 77.824 | 2 | quick_check ok, FK-Prüfung ohne Fehler |
| Älter: `private/gravuru-2027-merchant-data` | `workshop.sqlite` | 410.042.368 | 3 | quick_check ok, FK-Prüfung ohne Fehler |
| Älter | `design-assets.sqlite` | 170.434.560 | 0 | quick_check ok, FK-Prüfung ohne Fehler |
| Älter | `profiles.sqlite` | 45.056 | 1 | quick_check ok, FK-Prüfung ohne Fehler |

Die unterschiedlichen Schema-Versionen sind **für sich kein Fehler**: Es handelt sich um unterschiedliche Speicher/Laufzeitgenerationen. `user_version = 0` ist ebenfalls kein Beweis einer beschädigten Datenbank.

Im aktiven Werkstattspeicher wurden unter anderem folgende Mengen ermittelt:

| Datengruppe | Anzahl |
|---|---:|
| Produkte / Produktrevisionen | 1.090 / 4.419 |
| Prüfstände | 100 |
| Warenkorb-Konfigurationen / Revisionen | 76 / 97 |
| Angebote | 97 |
| Bestellereignisse / Bestellpositionen | 5 / 6 |
| Gespeicherte Übernahmefehler | 0 |
| Exportjobs / Produktionsfreigabe-Ereignisse | 0 / 0 |
| Aktuelle feste Shopify-Zuordnungen | 16.725 |
| Katalog-Freigaben / Funkklingel-Freigaben | 27 / 252 |
| Deklarierte Fremdschlüssel / Trigger | 22 / 76 |

Zusätzlich geprüft: Angebot ohne Prüfstand = 0; Konfigurationsrevision ohne Angebot = 0; Bestellposition ohne Angebot = 0. Die sechs gespeicherten Bestellpositionen tragen alle `test=true`. Das sagt nichts über alle Bestellungen des gesamten Shopify-Shops aus, wohl aber über die vorgefundenen Nachweise in diesem Datenspeicher.

Die Datenbank hat 18.997 freie Seiten à 4.096 Bytes, rund 77,8 MB beziehungsweise 1,8 % ihrer Datei. Daraus ergibt sich kein Anlass für eine ungeplante Bereinigung. Ein vollständiger semantischer Abgleich aller Tabellen, Assets und Fertigungsdateien wurde damit noch nicht erbracht.

## 3. Befunde mit Priorität

### F01 · Kritisch · Normale Mengenänderung erreicht die Kasse mit unpassendem Angebot

**Reproduziert:** Edelstahl 12 × 8 cm, ohne Bohrung, eigener Name „Audit 239“, zunächst Menge 1 zu 19,99 €. Im normalen Warenkorb wurde die Menge auf 4 geändert. Shopify zeigte 18,99 € pro Stück und **75,96 €** gesamt. Die Kasse öffnete sich damit ohne entsprechenden Entwurfsfehler.

Die Bearbeiten-Verknüpfung blieb auf Konfigurationsrevision 1. Eine gezielte lesende Datenbankabfrage zum eigenen Testentwurf bestätigt weiterhin **Angebotsmenge 1**. Der geprüfte und auf dem Server per Hash bestätigte Bestelleingang lehnt eine abweichende Menge oder einen abweichenden Stückpreis erst bei `orders/paid` ab. Die Ablehnungsnachricht lautet sinngemäß, dass Variante, Menge oder Preis vom gesicherten Entwurf abweichen.

**Auswirkung:** Ein gewöhnlicher Kundenhandgriff erzeugt einen Warenkorb, den die spätere Bestellübernahme nicht regulär verarbeiten kann. Ein bezahlter Endzustand wurde bewusst nicht hergestellt; die Kombination aus live erreichter Kasse, eigener Datenbankzeile und aktivem Übernahmecode belegt die Lücke vor der Zahlung.

**Nächster Schritt:** Mengenänderungen müssen das gesicherte Angebot und seine Preisstufe erneuern oder bis zur erneuten Gestaltung wirksam abgefangen werden. Vor Zahlung muss dieselbe Bindung gelten wie beim Bestelleingang. Dazu einen durchgehenden Regressionstest Editor → normale Theme-Mengenänderung → Checkout → simuliertes Zahlungsereignis einführen.

Belege: [Warenkorb mit Menge 4](audit-239-belege/warenkorb-menge-vier.jpg), [Kassenansicht](audit-239-belege/kasse-menge-vier.jpg), [Datenbanknachweis](pruefdaten/database-deep-audit.json), [aktiver Übernahmecode, Zeile 365](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/workshop/order-intake.mjs#L365).

### F02 · Kritisch · Aufpreise sind vor Zahlung nicht an den echten Entwurf gebunden

Die Preisfunktion liest Mengen kostenpflichtiger Extras aus Warenkorb-Attributen. Die Checkout-Prüfung verwendet dieselben Preisregeln. Ein nichtleerer Wert für „Bearbeitbarer Entwurf“ reicht an dieser Stelle; Existenz, Inhalt und Angebotszuordnung werden nicht vollständig geprüft.

**Gezielte lokale Gegenproben mit der ausgelieferten Quelle:**

| Unveränderter Preisvertrag / gezielt geänderte Angabe | Ergebnis der Preisfunktion | Checkout-Fehler |
|---|---:|---:|
| Motivanzahl 1 | 21,68 € | 0 |
| Derselbe Entwurfsbezug, Motivanzahl 0 | 19,99 € | 0 |
| Logoanzahl 1 | 32,98 € | 0 |
| Derselbe Entwurfsbezug, Logoanzahl 0 | 19,99 € | 0 |
| Entwurfswert durch beliebigen nichtleeren Text ersetzt | 19,99 € | 0 |
| Angebot und Konfigurationsbezug entfernt, beliebiger Entwurfswert bleibt | 19,99 € | 0 |

**Auswirkung:** Die Checkout-Sperre deckt fehlerhafte Preisformate und Vertragsstände ab, aber nicht alle inhaltlich falschen oder manipulierten Personalisierungen. Die spätere strenge Übernahme schützt die Produktion, kann jedoch zu bereits bezahlten Fehlerfällen führen. Es wurde **kein manipulierter Live-Kauf** durchgeführt.

**Nächster Schritt:** Entwurf, Revision, Variante, Menge, Zusatzbestandteile und Preis vor Zahlung manipulationsgeschützt miteinander verbinden. Die Lösung muss im gemessenen Function-Budget bleiben; eine zusätzliche reine Formatprüfung genügt nicht.

Belege: [Gegenproben](pruefdaten/price-audit-results.json), [Preis-V1, Zeile 44](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/ops/shopify/einzelsperre-release/preis/src/master-release/price-v1.mjs#L44), [Logo-Zuordnung, Zeile 48](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/ops/shopify/einzelsperre-release/preis/src/master-release/cart_transform_run.mjs#L48), [Checkout-Gegenprüfung](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/ops/shopify/einzelsperre-release/pruefung/src/cart_validation_run.mjs).

### F03 · Wichtig · „Bearbeiten“ öffnet den eben angelegten Warenkorbentwurf nicht

Nach dem regulären Anlegen des Testartikels wurde „Bearbeiten“ im Warenkorb angeklickt. Ergebnis: **„Diese Gestaltung ist auf diesem Gerät nicht mehr zugänglich. Die Warenkorbzeile bleibt unverändert.“** Das trat in einem weiteren Tab und anschließend auch im ursprünglichen Tab auf. Kein Browserwechsel, keine Löschung des Browserspeichers.

Der Code sucht die private Entwurfsberechtigung in tabgebundenem `sessionStorage`. Der Start im eingebetteten Editor und das spätere Öffnen als eigenständige Seite haben unterschiedliche Kontexte. **Die genaue Browserursache ist noch einzugrenzen**; die sichtbare Funktionsstörung und die Abhängigkeit vom lokalen Zugriffsschlüssel sind dagegen bestätigt. Es wurde nicht in gespeicherte Browser-Geheimnisse eingegriffen.

**Nächster Schritt:** Den eigenen Entwurfszugriff beim Wechsel zwischen Einbettung, Warenkorb, eigenständigem Editor und erneutem Aufruf zuverlässig erhalten. Dazu gleiche/neue Tabs, Neuladen und mobile Browser prüfen. Die Autorisierung darf dabei nicht aufgeweicht werden.

Belege: [Fehler im ursprünglichen Tab](audit-239-belege/warenkorb-bearbeiten-originaltab.jpg), [zweiter Tab](audit-239-belege/warenkorb-bearbeiten-fehler.jpg), [Startprüfung, Zeile 146](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/workshop/ui/shop-entry-client.mjs#L146), [Entwurfszugriff, Zeile 17](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/configurator/variant-m/cart-edit.mjs#L17).

### F04 · Wichtig · Angebotsablauf wird erst nach Zahlung streng durchgesetzt

Angebote werden mit sieben Tagen Gültigkeit gespeichert. Der Bestelleingang lehnt abgelaufene Zuordnungen ab. Die aktuelle Checkout-Funktion prüft dieses serverseitige Ablaufdatum nicht. Ein gültig aussehender alter Warenkorb kann daher dieselbe Lücke zwischen Zahlbarkeit und Verarbeitbarkeit erreichen wie F01.

**Belegniveau:** Quellcode und bestehende Tests; kein sieben Tage alter Live-Kauf. **Nächster Schritt:** Ablauf vor Zahlung erkennen und das Angebot nachvollziehbar erneuern oder den Kunden zur erneuten Bestätigung führen.

Quellen: [Erzeugung, Zeile 282](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/workshop/order-intake.mjs#L282), [Ablehnung, Zeile 379](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/workshop/order-intake.mjs#L379).

### F05 · Wichtig · Einzelsperre ist kein Schutz gegen ein überschrittenes Laufzeitbudget

Die isolierte Behandlung fachlich ungültiger Positionen funktioniert in den ausgeführten Fällen. Ein Laufzeitabbruch wegen Ressourcenmangel bleibt jedoch ein anderer Fehlerfall. Die Preisfunktion hat live `blockOnFailure=true`; auch die Checkout-Regel sperrt bei Funktionsproblemen.

Die Release-Dokumentation nennt etwa 3,2 Mio. beziehungsweise 3,3 Mio. Anweisungen für eine konkrete echte Eingabe und eine Grenze von **14 verschiedenen Gestaltungen**, vorher 15. Diese Zahl ist eine dokumentierte Messung, **keine allgemeine Garantie für jeden Warenkorbmix**. Im Audit wurde kein neuer umfassender WASM-Belastungslauf mit sämtlichen Kombinationen durchgeführt.

Shopify nennt für bis zu 200 Positionen 11 Mio. Anweisungen, 128 kB Eingabe und 40 kB Ausgabe. Ein Preis-Metafeld über 10.000 Bytes wird nicht geliefert. Keines der aktuell gelesenen 14 Preis-Metafelder überschreitet diese Einzelgrenze. [Offizielle Grenzen, API 2026-07](https://shopify.dev/docs/api/functions/2026-07#limitations).

**Nächster Schritt:** Aktuelle Binärdateien mit 14/15/16 unterschiedlichen Gestaltungen, alten Preisrevisionen, gemischten Gravuru-/FPD-/Zubehörpositionen und wachsenden Metadaten messen. Für Überschreitungen einen getesteten Kundenweg festlegen. Kein blindes Abschalten der Checkout-Sperre.

Quelle: [Release-Messung und Rückweg](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/STATUS.md#L1).

### F06 · Wichtig · FPD zeigt weiterhin eine eigenständige Funktionsstörung

In Shopify ist neben Gravuru eine FPD-Warenkorbtransformation aktiv. Ihre Detailansicht meldet Funktionsfehler seit 30. April 2026 und einen Zusammenhang mit abgebrochenen Checkouts. Bei FPD ist die Sperre bei Funktionsfehlern ausgeschaltet. Dieser Hinweis ist **kein Beweis**, dass jeder aktuelle Checkout ausfällt oder Gravuru die Ursache ist.

**Nächster Schritt:** Aktuelle FPD-Ausführungsprotokolle mit den konkret betroffenen Artikeln/Warenkörben abgleichen. Einen FPD-Kaufweg sowie einen gemischten Warenkorb separat prüfen. Weder deaktiviert noch „mitbehoben“ wurde FPD in dieser Prüfung.

Beleg: [FPD-Detailansicht](audit-239-belege/fpd-funktionsfehler.jpg).

### F07 · Wichtig · Preis- und Geometriequellen sind nicht vollständig geschlossen

**Bestätigt:** Die aktuelle Katalog-Excel stimmt bei 424 geprüften Varianten centgenau mit Shopify überein. Die technische Kette Shopify-Grundpreis → app-eigene Preistabelle stimmt bei allen 501 dort erfassten Varianten.

**Nicht damit bewiesen:** Dass jede Zahl aller aktiven Produkte auf die letztgültige Originalentscheidung von Chris zurückgeführt ist. Die aktuelle `Stammdaten-Gravuru.xlsx` ist eine Katalogausgabe; ein Vergleich mit ihr ist kein unabhängiger Nachweis gegen das ursprüngliche Lieferdokument.

Konkrete offene Punkte:

- `geometrie.json` nennt 81 Quellzeilen und verweist auf `Edelstahlschilder_final_CDR_2.xlsx` mit SHA-256 `1c27161c5d77683ea7ff692586d76ff7ba5f310220ad220ff61f31103cf176c3`. Diese Originaldatei wurde in den untersuchten Repository-Bäumen nicht gefunden. Die vorhandene `Edelstahl-Schilder-Liste.xlsx` hat eine andere Prüfsumme: `fc3e423a58d6c25cf5196a2693107f50eadaebffdabae0035378a0a28440fb70`. Das beweist keine falsche Geometrie, verhindert aber den lückenlosen Originalabgleich.
- Entscheidung 4.18 beschreibt Acryl-Befestigungen als gleich zu Edelstahl. Der aktuelle Katalog und die Acryl-Excel enthalten für zwei/vier Schrauben 2,99/3,39 €, Edelstahl 2,69/3,29 €. Die zwei live geprüften Acrylprodukte stimmen mit ihrer Excel überein. **Die eindeutige spätere Freigabe für diese unterschiedliche Behandlung ist in dieser Prüfung nicht belegt.** Deshalb keine automatische Bewertung als falscher Shoppreis.
- Zwei ältere öffentlich erreichbare Edelstahlprodukte 30 × 20 cm stehen ohne Befestigung auf 79,99 €, während das große neue Edelstahlprodukt in dieser Größe 74,99 € verwendet. Unterschiedliche Artikel können absichtlich unterschiedlich bepreist sein; eine verbindliche Regel für diesen Unterschied wurde nicht nachgewiesen.
- Für die restlichen aktiven Varianten fehlt in diesem Audit ein vollständiger Zell- und Freigabenachweis. Diese Abdeckung ist **offen / ohne nachgewiesene Originalquelle**, nicht pauschal „falsch“.

**Nächster Schritt:** Eine verbindliche Quellenmatrix führen: Produkt/Variante → Fachentscheidung → Originaldatei mit Hash → Blatt/Zelle → Katalogrevision → veröffentlichte Produktrevision → Preis-Metafeldrevision. Fehlende Originale und Preisunterschiede gezielt klären; historische Bestellungen dabei unverändert lassen.

Quellen: [424 Zellvergleiche](pruefdaten/excel-variantenvergleich.csv), [Geometriequelle](https://github.com/Chris83638w/gravuru-katalog./blob/8236b8bf/zeichnungen/edelstahl-schilder-2027/geometrie.json), [Katalog-Excel](https://github.com/Chris83638w/gravuru-katalog./blob/8236b8bf/kataloge/Stammdaten-Gravuru.xlsx), [Entscheidung 4.18](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/ENTSCHEIDUNGEN.md#L133), [Preisrunde 4.49](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/ENTSCHEIDUNGEN.md#L164).

### F08 · Wichtig · Der allgemeine Testschutz ist nicht grün und nicht als Freigabesperre nachgewiesen

Der vollständige Anwendungslauf hat sieben Fehler. Drei sind Windows-Aufräumfehler. Drei Fototests erwarten weiterhin ein vollständiges Ausfüllen des Fotobereichs, während die aktuelle Positionierung für bestimmte unveränderte rechteckige Fotos ein vollständiges Einpassen verwendet. Der siebte Test erwartet eine überholte Liste der Werkstattseiten. Das sind konkrete Widersprüche zwischen Test und Implementierung; daraus allein folgt noch kein falsches Kundenfoto oder eine kaputte Navigation.

Für den geprüften Release-Commit wurden keine GitHub-Statuschecks oder Workflow-Läufe gefunden. Der vorhandene Workflow `test-portability-linux.yml` ist ausdrücklich auf den Branch `dev/windows-tests-20261024-astra` beschränkt. Er ist kein allgemeiner Schutz für andere Freigaben.

**Nächster Schritt:** Fotoverhalten fachlich entscheiden/bestätigen und passende Assertions korrigieren; Werkstattseiten und gemeinsame Navigation konsistent prüfen; Windows-Aufräumen getrennt beheben. Danach einen reproduzierbaren Linux-Testlauf für den tatsächlichen Freigabestand als verbindliche Prüfung einrichten. Die elf übersprungenen Fälle dürfen nicht als bestanden zählen.

Quellen: [Testauswertung](pruefdaten/testauswertung.txt), [Fototests](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/workshop/acrylic-photo-resolution.test.mjs), [Werkstattprüfung, Zeile 160](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/app/workshop/konfis.test.mjs#L160), [branchbeschränkter Workflow](https://github.com/Chris83638w/gravuru-2027/blob/546d4b0a26d68306e23c05438675e2d41cc5aef9/.github/workflows/test-portability-linux.yml#L12).

### F09 · Wichtig · Sicherung vorhanden, Wiederherstellbarkeit nicht praktisch belegt

Plesk zeigt eine tägliche Sicherung um 02:00 Uhr mit Google Drive als Ziel; die letzte sichtbare Sicherung war vom 16. November um 02:11 Uhr. Der private Hauptordner hat Modus 0700, die untersuchten SQLite-Dateien und die relevante Geheimnisdatei Modus 0600. Das ist positiv.

**Offen:** Ob eine isolierte Wiederherstellung beide tatsächlich genutzten Datenbereiche, Assets, Profile, App-Konfiguration und passende Runtime vollständig und konsistent zurückbringt. Eine Sicherungsliste beweist das nicht. Ebenso wurde keine Live-Rückschaltung ausgeführt.

Im privaten Bereich wurden 900 Einträge gezählt, darunter 12 `kandidat-…`- und 33 `gravuru-merchant-release-…`-Verzeichnisse. Sie sind nicht pauschal als Müll einzustufen. Der aktive Wrapper referenziert mehr als einen historischen Bereich.

**Nächster Schritt:** Rücksicherung in eine getrennte Umgebung; anschließend Integritätsprüfung, ein bekannter Entwurf, Bestellzuordnung und Produktionsdatei prüfen. Für alte Verzeichnisse eine Liste „aktiv referenziert / Rückfall / archiviert / ungeklärt“ mit Hash und Datum erstellen. **Nichts wurde gelöscht.**

### F10 · Wichtig · Echte Abnahme bis Produktionsdatei bleibt offen

Im aktiven Werkstattspeicher wurden sechs Test-Bestellpositionen, aber keine Exportjobs und keine Produktionsfreigabe-Ereignisse gefunden. Bestehende Tests sichern viele einzelne Regeln ab, darunter unveränderliche Zuordnungen, Wiederholung von Webhooks und getrennte Behandlung fehlerhafter Positionen. Sie ersetzen keinen fachlich bestätigten vollständigen Auftrag.

**Nächster Schritt:** Nach F01–F03 einen vereinbarten Abnahmeauftrag in geeigneter Testumgebung durch den gesamten Weg führen: Preis → Zahlungssimulation → Übernahme → Produktionsfreigabe → Vektor-/Konturdatei → Maße/Bohrungen → Downloadberechtigung. Auch Wiederholung, Abbruch und Erstattung prüfen. Keine echte Zahlung wurde für diesen Audit ausgelöst.

### F11 · Wichtig · Mehrere konkurrierende „aktuelle“ Projektstände erschweren Übergaben

`START_HERE.md` führt prominent auf einen Stand vom 12. Oktober und die frühere Laufzeit `7a168bc`. Die reale Laufzeit ist `68334981`; das Preis-Release stammt aus einem anderen Branch. `STATUS.md` unterscheidet außerdem vorbereitete, noch nicht installierte Mengen-/Mobilkorrekturen von der später aktivierten Designwechsel-Laufzeit. Im Katalog beginnt `STAND.md` mit 3. November, obwohl main einen späteren Merge enthält.

**Auswirkung:** Ein neuer Bearbeiter kann bei korrektem Lesen einer einzelnen Datei vom falschen Live-Stand ausgehen. Nicht jeder ältere Ordner und nicht jeder ältere Text ist deshalb ungenutzt.

**Nächster Schritt:** Ein kurzes verbindliches Betriebsmanifest pflegen: Code-SHA, Katalog-SHA, Runtime-Pfad, beide Datenbereiche, Theme-ID, aktive App-Version, Modulprüfsummen, Sicherung und Rückfallversion. Vorbereitete Änderungen klar getrennt aufführen. Ältere Nachweise als Historie erhalten.

### F12 · Kleinigkeit · Sichtbare Testnavigation und interne Entwurfskennung

Im veröffentlichten Theme steht „Ebene 1 Test“ in der Navigation. In der Kassenübersicht erscheint „Bearbeitbarer Entwurf: gravuru:proof_…“ als technische Zeichenfolge. Beides hilft Kunden bei ihrer Entscheidung kaum.

**Nächster Schritt:** Sichtbare Navigation auf beabsichtigte Ziele prüfen; Entwurfsreferenz intern erhalten und Kunden eine verständliche Bezeichnung beziehungsweise Vorschau zeigen. Kein vollständiger Link-Crawl wurde durchgeführt.

### F13 · Kleinigkeit · Aktives Nullpreisprodukt ist nicht öffentlich veröffentlicht

„Türschild Linea – Edelstahl 8 × 3,5 cm“, Produkt `16083969147260`, Variante `57311791415676`, hat 0,00 € und Status ACTIVE. `onlineStoreUrl` ist leer; der direkte Produktaufruf ergab 404.

**Bewertung:** Ein interner Pflegepunkt, **kein in dieser Prüfung belegter kostenlos kaufbarer Artikel**. Vor einer späteren Veröffentlichung muss ein gültiger Preis beziehungsweise eine ausdrückliche Nullpreisregel vorliegen.

### F14 · Wichtig · Fehlende Erkennungsdaten können die Prüfung vollständig umgehen

Wenn Preis-Metadaten fehlen, aber Gravuru-Personalisierungsattribute vorhanden sind, wird die Position in der Gegenprobe korrekt gesperrt. Fehlen **beide** Erkennungssignale, behandeln die Funktionen die Position wie einen gewöhnlichen Artikel. Auch ein entsprechend deaktivierter Vertrag kann übersprungen werden.

**Belegniveau:** Lokaler Fehlerfalltest, keine aktuell nachgewiesene betroffene Live-Variante. Der vollständige aktuelle Abgleich fand keine fehlenden Varianteneinträge innerhalb aktivierter Preisverträge.

**Nächster Schritt:** Für zwingend personalisierte Produkte eine verlässliche, vom Kunden nicht entfernbar ableitbare Kennzeichnung prüfen und fehlende erforderliche Preisverträge als Konfigurationsfehler erkennen. Nicht versehentlich gewöhnliche Zubehör- oder FPD-Produkte blockieren. Beleg: [Gegenproben](pruefdaten/price-audit-results.json).

## 4. Block A · Einzelsperre, Checkout und Rückweg

### Tatsächliche Installation

Aktive Shopify-Version: `gid://shopify/Version/1223825227777` / `gravuru-2027-preis-einzelsperre-20261116-b1`. Direkt mit dem bestehenden App-Zugang zurückgelesen, nicht nur aus der Übergabe übernommen.

Alle neun Modulkonfigurationen stimmen mit dem gespeicherten Kandidaten B überein: `app_home`, `gravuru-personalization-price`, `app_access`, `branding`, `gravuru-checkout-guard`, `gravuru-storefront`, `data`, `app_proxy`, `webhooks`.

| Datei im Release-Projekt | Bytes | SHA-256 |
|---|---:|---|
| B · Preisfunktion | 22.036 | `8b33937d43aba7c8e86b1c4c3341e3e9224f1ab43d043608f7cbdee4d8f8bf4e` |
| B/A · Checkout-Prüfung | 23.127 | `93b5f15cee38d7f87a5d50dacc7b7324a302d754fbece1fb81e820f22f563a6a` |
| A · nachgebaute frühere Preisfunktion | 20.945 | `3c82b825873c7d8f2b31b82d49fafc9b85ff670744c0d00011f141d792eb1cd6` |

Shopify meldet für die aktiven Funktionsmodule ebenfalls 22.036 und 23.127 WASM-Bytes; die zurückgelesenen Modulkonfigurationen sind identisch zum Kandidaten. Die Hashwerte oben stammen aus den auf dem Server vorhandenen Release-Binärdateien. Ein separater Download der von Shopify intern gespeicherten Binärdatei erfolgte nicht.

Die Checkout-Regel `218759548` ist eingeschaltet und sperrt bei Funktionsproblemen. Gravurus Cart Transform `172523900` ist aktiv und ebenfalls mit `blockOnFailure=true` eingestellt. Beide Funktionen verwenden API `2026-07`. [Installationsdaten](pruefdaten/live-release-audit.json), [Regelansicht](audit-239-belege/kassenregel-aktiv.jpg).

**Wichtige Rückweg-Unterscheidung:** Version A enthält einen Nachbau der früheren Preisquelle mit 20.945 Bytes. Die frühere aktive Binärdatei hatte laut Status 20.977 Bytes. A ist deshalb nicht bytegleich zur Originalversion `1199363391489`. Die ausgeführten Vergleichstests fanden keine Preisabweichung in den 2.250 gültigen Fällen; das ersetzt keinen universellen Gleichheitsbeweis.

Als dokumentierte Rückwege existieren A (`1223817953281`) und die Originalversion `1199363391489`. Keine Rückschaltung wurde ausgeführt. Die Auswahl muss danach erfolgen, ob nur die neue Einzelsperre oder auch die neue Checkout-Prüfung zurückgenommen werden soll; anschließend aktive Module und Warenkorb-/Checkout-Verhalten erneut lesen und prüfen.

### Funktionsverhalten

Die neue Preisfunktion behandelt fachlich fehlerhafte Positionen einzeln und wirft diese nicht mehr pauschal aus der gesamten Berechnung. Die Gegenfunktion sperrt den Checkout in `CHECKOUT_INTERACTION` und `CHECKOUT_COMPLETION`; reine Warenkorbarbeit wird nicht dadurch blockiert. Gewöhnliche nicht erkannte Artikel bleiben unbehandelt. Die unveröffentlichte V3-Zubehörlogik wurde nicht als installierter Stand ausgegeben.

Bestanden: sieben gezielte Release-Tests; fünf Prüfungen zur Erhaltung der App-Module; eigener unabhängiger Preisvergleich. Weiter offen sind der vollständige reale FPD-/Zubehörmix, neue Lastmessungen und die Bindung an das gespeicherte Angebot (F01/F02/F04/F14).

## 5. Block B und D · Kundenoberfläche und Ablauf

Geprüft wurde das veröffentlichte Theme `190984126844`, „Gravuru Edelstahl-Konfi Prüfvorschau 08.11.2026“. Der öffentliche Einstieg verwendet `ui=prio-r15`. Die zuvor vorhandene Vorschau eines unveröffentlichten anderen Themes wurde nicht mit der öffentlichen Oberfläche verwechselt.

| Prüfschritt | Ergebnis / Belegniveau |
|---|---|
| Öffnen des großen Edelstahlprodukts und Editors | Erfolgreich; 19,99 € für 12 × 8 cm ohne Befestigung. |
| Desktop / mobile Ansicht | Sichtprüfung durchgeführt, mobile Stichprobe bei 390 × 844. Belege im Paket. Keine vollständige Browser-/Gerätematrix. |
| Eigenen Namen über Designwechsel erhalten | „Audit 239“ blieb beim Wechsel zwischen zwei Zweizeilen-Designs erhalten. Live bestanden. |
| Pflichtname | Leerer Name führte zu einem Pflichtfeldhinweis; kein Warenkorbabschluss. Live bestanden. |
| Menge 0 / 100 | Eingabe ungültig bei min 1/max 99; bei 100 verweigerte der Editor den Übergang und meldete „Menge: 1 bis 99.“ |
| Menge 99 | Gültig; rund 12 × 12 cm zu 22,99 € ergibt mit 15 % Staffel und Rundung pro Stück 1.934,46 €. Kein Hinzufügen dieses Großmengenentwurfs. |
| Formwechsel | Abgerundetes Rechteck 15 × 10 cm → Rund wählte 12 × 12 cm. Live-Stichprobe für die nächstliegende Größe bestanden. |
| Textabstand 2 mm | Quellcode-/Testprüfung im Anwendungslauf; keine vollständige manuelle Messung aller Schrift-/Form-/Befestigungskombinationen. |
| Fotos beim Designwechsel / Ziel ohne Fotobereich | Durch Quellcode und vorhandene automatisierte Fälle untersucht. Kein vollständiger neuer Live-Fotoupload-Durchlauf in diesem Audit. |
| Eigener Warenkorbartikel → Kasse | Erfolgreich bis zur unbezahlten Kassenansicht; zugleich Mengenlücke F01 belegt. |
| Warenkorb → Bearbeiten | Reproduzierbar fehlgeschlagen, F03. Dadurch kein erfolgreicher Bearbeiten-/Ersetzen-/Duplikatfreiheitsnachweis in diesem Live-Durchlauf. |
| Produktbilder | Auf der geöffneten Hauptproduktseite 23 Bilder im DOM; bei der Prüfung kein fertig geladenes Bild mit fehlender natürlicher Breite. Kein shopweiter Bild-Crawl. |
| Browserfehler | In den abgefragten Fehlerlogs des untersuchten Produkt-/Warenkorbwegs kein entsprechender JavaScript-Fehler. Das widerlegt die sichtbaren fachlichen Fehler nicht. |
| Leistung | Laden und Bedienbarkeit beobachtet. Keine belastbare neue Kaltstart-/Mobilfunkmessung, kein LCP-/INP-Freigabenachweis. |

Beispiele: [Live-Editor Desktop](audit-239-belege/r15-desktop-live.jpg), [Live-Editor mobil](audit-239-belege/r15-mobil-live.jpg), [Pflichtname](audit-239-belege/r15-pflichtname-mobil.jpg), [Menge 100 gesperrt](audit-239-belege/r15-menge-100-gesperrt.jpg).

Der Warenkorb war vor dem Test leer. Nach dem Test wurde genau die eigene Position entfernt. [Nachweis des leeren Warenkorbs](audit-239-belege/warenkorb-bereinigt.jpg). Keine Zahlungs- oder Adressdaten eingegeben, keine Bestellung abgeschlossen.

## 6. Block C · Preise und Quellen

Die Preisprüfung ist in drei Ebenen getrennt:

| Ebene | Umfang | Ergebnis |
|---|---|---|
| Vollständigkeit der Bestandsaufnahme | 1.196 aktive Produkte / 24.598 Varianten | Vollständig paginiert. 140 Produkte haben das ältere Konfigurator-Zuordnungsfeld; dieses Feld allein beschreibt nicht sämtliche Personalisierungswege. |
| Shopify-Grundpreis ↔ app-eigener Preisvertrag | 501 Varianten / 14 Produkte | Keine Abweichung, kein fehlender Eintrag innerhalb dieser Verträge. |
| Katalog-Excel ↔ aktuelle Shopify-Variante | 404 Edelstahl + 20 Acryl | 424 Übereinstimmungen. Grundpreis und Befestigungsaufpreis getrennt aus den Zellen gelesen. |
| Fachliche Originalquelle ↔ jede veröffentlichte Variante | Gesamter Shop | Nicht vollständig geschlossen; F07. |

Die aktiven Kernverträge enthalten Staffeln **ab 3: 5 %, ab 5: 10 %, ab 10: 15 %**. Der Code wendet sie auf den vollständigen Stückpreis einschließlich einschlägiger Extras an und rundet einmal in Cent. Die unabhängigen Fälle deckten Mengen 1, 2, 3, 4, 5, 9, 10, 11, 98 und 99 sowie verschiedene Zusatzmengen und Umrechnungskurse ab.

Das große Edelstahlprodukt verwendet V2, Revision 2, mit zusätzlichem Motiv 1,69 € und Logo **12,99 €**. Seine Metadaten umfassen 2.318 Bytes. Acryl D8 und D10 verwenden V1, Revision 1, mit zusätzlichem Motiv 1,69 €, Fotoaufschlag 0 und jeweils 574 Bytes. Ein fehlendes Logo-Preisfeld bei diesen V1-Verträgen wurde nicht pauschal als Fehler gewertet: Edelstahl-Logo und Acryl-Fotofunktion haben unterschiedliche freigegebene Regeln.

Die Entscheidung zum Edelstahl-Logo ist in 4.49 dokumentiert. Die im Audit bestätigte korrekte Höhe des Aufpreises löst die fehlende Bindung der Logoanzahl an den Entwurf nicht (F02).

## 7. Block E · Betrieb, Rechte und Rücksicherung

Beobachtete Umgebung: Plesk Obsidian 18.0.82, CloudLinux 8.10, Node 24.22.3. Der Kundenbetrieb läuft auf Plesk; Shopify-App-Versionen ersetzen diesen Server nicht.

Positiv sind die private Ablage, die restriktiven Rechte der geprüften Daten/Geheimnisdateien, die unauffälligen SQLite-Prüfungen, versionierte Angebote/Revisionen und die vorhandene Sicherungskonfiguration. Die Datenbank enthält 76 Trigger; der Quellcode schützt unter anderem Konfigurationen und Bestellbezüge gegen nachträgliches Überschreiben. Ein lesender Audit testet diese Schutztrigger nicht durch Änderungen an echten Daten.

Offen bleiben: praktisch erprobte Wiederherstellung, vollständige Assetreferenzprüfung, fachlicher Fertigungsnachweis, dauerhafte Speicher-/Wachstumsüberwachung und die Einordnung aller historischen Verzeichnisse. Eine pauschale Bereinigung oder ein Runtime-Wechsel wäre auf Basis dieses Audits nicht gerechtfertigt.

## 8. Block F · Tests, Widersprüche und technische Altstände

### Tatsächlich ausgeführte Prüfung

| Lauf | Ergebnis | Einordnung |
|---|---|---|
| Gesamte Anwendung: `app/configurator/variant-m/*.test.mjs`, `app/workshop/*.test.mjs` | 2.702 / 2.684 bestanden / 7 Fehler / 11 übersprungen | Mit isoliert installierten Python-Hilfsprogrammen und vorhandener Windows-Portabilitätshilfe. |
| `ops/shopify/*.test.mjs` nach Bereitstellung von LiquidJS 10.30.1 | 45 / 37 bestanden / 8 Fehler | Alle acht Fehler in der POSIX-Dateirechte-/Besitzerprüfung unter Windows. Kein Nachweis eines gleichartigen Plesk-Fehlers. |
| Gezielte neue Preis-/Checkout-Release-Prüfungen | 7 / 7 bestanden | Einzelsperre und Gegenprüfung. |
| App-Erhaltung / Manifestprüfungen | 5 / 5 bestanden | Überschneidung mit dem ops-Bereich; nicht zur Gesamtsumme addieren. |
| Unabhängiger Preisvergleich | 2.250 gültige + 1.500 ungültige Fälle | Kein Preisunterschied in gültigen Fällen, jeder ungültige Fall mit Checkout-Fehler. Zusätzlich Gegenproben F02/F14. |

Der erste unvollständig eingerichtete lokale Lauf hatte zahlreiche Fehler durch fehlende Hilfsprogramme beziehungsweise noch nicht ausgecheckte Dateien. Diese Rohzahl wurde **nicht** als Zahl von Produktfehlern übernommen. Maßgeblich ist der spätere konfigurierte Lauf.

### Die sieben verbleibenden Anwendungsfehler

| Datei / Fälle | Ursache und Folgerung |
|---|---|
| `acrylic-photo-resolution.test.mjs`, drei Fälle ab Zeilen 7, 15, 24 | Erwartete Pixeldichte/Rahmenfüllung passt nicht zum geänderten Einpassen bestimmter Fotobereiche. Test und aktuelle Produktregel müssen abgestimmt werden. Eine reale falsche Druckauflösung ist damit allein nicht bewiesen. |
| `customer-model-response-cache.test.mjs`, Fälle ab Zeilen 77, 95, 117 | `hookFailed`, Windows `EPERM` beim Aufräumen temporärer Datenbankverzeichnisse. Getrennt vom getesteten fachlichen Verhalten behandeln. |
| `konfis.test.mjs`, Zeile 160 | Tatsächliche HTML-Seitenliste und `WORKSHOP_PAGES` weichen ab, unter anderem bei Galerie-, Modulprofil- und Motivsuchseiten. Registrierung und gemeinsame Oberfläche konsistent prüfen. |

**Nicht geprüft und daher nicht behauptet:** dass sämtliche historischen Dateien toter Code sind; dass der komplette Produktionszweig fehlerfrei ist; dass die elf übersprungenen Fälle unnötig sind; dass sämtliche Windows-Fehler auf Linux ebenfalls auftreten. Die konkrete Runtime-Zuordnung ist belastbarer als die Namen alter Verzeichnisse.

## 9. Abdeckung von Issue 239 und verbleibende Arbeit

| Block | Erledigt | Noch nicht belegt |
|---|---|---|
| A · Preis/Checkout | Aktive Version, neun Module, Rule-Status, Release-Binärdateien, Quellvergleich, Preis-/Fehlerfälle, Rückwege dokumentiert | Neue vollständige WASM-Lastmatrix; realer Mischwarenkorb mit FPD/Zubehör; Rückschaltung praktisch ausgeführt; manipulationsgeschützte Angebotsbindung |
| B · Konfigurator | Aktive Runtime, Namenerhalt, Pflichtfeld, Mengengrenzen, konkrete Form-/Größenwahl, Desktop/Mobil, Quell-/Testprüfung | Alle Designs/Schriften/Bohrungen/Fotozustände manuell; erfolgreiche Bearbeitung einer bestehenden Warenkorbzeile |
| C · Datenkette | Gesamter aktiver Shopbestand; alle gefundenen app-eigenen Preisverträge; 424 Excel-Zellabgleiche; Quellenkonflikte | Originalquelle und Entscheidung je weiterer Variante; vollständiger Geometrieabgleich gegen die referenzierte Original-Excel |
| D · Kundenweg | Eigener Entwurf bis unbezahlte Kasse; konkrete Fehler reproduziert; Testartikel entfernt | FPD vollständig; Zahlung bis Fertigung; vollständiger Link-/Bild-Crawl; belastbare Leistungsmessung |
| E · Betrieb | Laufzeit- und Datenpfade, sechs Datenbanken, zentrale Beziehungen, Rechte-Stichprobe, Sicherungsanzeige, Verzeichniszählung | Restore-Test, vollständige historische Abhängigkeitsliste, wiederholte Betriebs-/Wachstumsbeobachtung |
| F · Qualität | Breiter Testlauf, Fehlerursachen eingeordnet, CI-Lücke, veraltete Einstiege und nicht installierte Änderungen erkannt | Grüner Linux-Lauf des tatsächlichen Freigabestands; allgemeine CI-Freigabesperre; vollständiger Nachweis ungenutzten Codes |

### Empfohlene Reihenfolge

1. **F01 und F03 zusammen bearbeiten:** Ein konsistenter Mengen-/Bearbeitenweg muss Entwurf, Angebot, Warenkorb und spätere Übernahme auf demselben Stand halten.
2. **F02, F04 und F14 vor Zahlung absichern:** Inhaltliche Entwurfsbindung, Gültigkeit und Kennzeichnung personalisierungspflichtiger Produkte.
3. **F05 und F06 belastbar abnehmen:** Aktuelle WASM-Grenzfälle und die getrennte FPD-Störung, einschließlich Mischwarenkorb.
4. **F07 und F08 schließen:** Verbindliche Quellenmatrix und reproduzierbare, fachlich passende Tests mit Freigabeschranke.
5. **F09–F11 abschließen:** Isolierte Rücksicherung, vollständiger Abnahmeauftrag und ein gemeinsames Betriebsmanifest.
6. **F12/F13 aufräumen:** Sichtbare Testtexte, kundenverständliche Entwurfsanzeige und unveröffentlichte Nullpreisartikel.

Die nächsten Änderungen lassen sich damit konkret planen. **Dieser Bericht selbst erteilt keine Freigabe und hat keine der beschriebenen Korrekturen durchgeführt.**

## Belegpaket

- [Befundliste als CSV](Befunde-Issue-239.csv)
- [424 Varianten mit Excel-Zellnachweis](pruefdaten/excel-variantenvergleich.csv)
- [Preis-Gegenproben](pruefdaten/price-audit-results.json)
- [Vollständiger Metadaten-/Shoppreisabgleich als Zusammenfassung](pruefdaten/owner-price-audit.json)
- [Direkt gelesene aktive Version und neun Module](pruefdaten/live-release-audit.json)
- [Datenbankprüfungen](pruefdaten/active-database-check.json) und [vertiefte Verknüpfungsprüfung](pruefdaten/database-deep-audit.json)
- [Testauswertung](pruefdaten/testauswertung.txt)
- [Belegverzeichnis mit Prüfsummen](pruefdaten/belegmanifest.json)

Alle Werte sind Momentaufnahmen des Prüfungstags. Personenbezogene Bestelldaten, private Entwurfszugangsschlüssel und Anmeldedaten sind nicht Bestandteil dieses Pakets.
