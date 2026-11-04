# Schiefer-Gruppen: Import in den vorhandenen Händlerstore

## Aktuelle Abstimmung: Astra 1 und der veröffentlichte Konfi-Stand

Mikail hat klargestellt: **Astra 1 ist für den Konfigurator zuständig; Bezugspunkt ist Issue #48.** Die bisherige pauschale Weiterleitung des Konfi-Anschlusses an #139 war falsch. Die Schiefer-Katalog-/Designabstimmung bleibt in #85, dieses Importpaket bei Mika.

[Astra 1, neueste Veröffentlichung in #48](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6630438646) und die [vollständig gelesene Übergabe](https://github.com/Chris83638w/gravuru-2027/blob/db4f4a4efdd411e8d28aec2d126e488a1b9b0c48/docs/handoffs/2026-11-04-konfi-ohne-vorschauleiste.md) setzen **PR #161, Commit `db4f4a4efdd411e8d28aec2d126e488a1b9b0c48`**, als gemeinsamen Oberflächenbezug. Keine Vorschau-/Produktumschaltleiste; Zum Produkt links, Werkzeuge mittig, Speichern rechts; thematische Bestseller und Andenken Menschen/Tiere getrennt. Die Veröffentlichung ist eine GitHub-Übergabe der lokalen Bedienvorschau. Produkt-/Preisbindung, vollständige Bearbeitung und Warenkorb müssen laut Astra noch in den bestehenden Master integriert werden. Beispieloptionen und Beispielpreise sind keine Produktquelle für den Import.

Frische lesende Hostprüfung am 04.11. um **12:18 UTC** bestätigt weiterhin `start-r5.cjs` → `app.cjs` → `private/issue139-doors-156-20261103`; beide Piloten scheitern unverändert an den Befestigungsoptionen. Keine neu aktive Konfi-Version nachgewiesen, keine Produktdaten geschrieben. Das ist kein Widerspruch zur Veröffentlichung auf GitHub.

**Erster Importpilot wird das Monogrammschild allein**, unabhängig vom D220-Quellfoto und den alten Hundevarianten. Separates Paket `slate-monogram-pilot-import.json.gz` aus derselben geprüften Quelle: 1 Produkt, 15 Varianten, 82 Designs, 7.698.555 Bytes, SHA-256 `45be63433a69153724010b8ff7066930f12ba611ea3992c28549b453907b05b6`. Lokal erzeugt und durch den bestehenden Paketvalidator geprüft; noch nicht auf den Host hochgeladen oder dort importiert. Erzeugung: `node scripts/slate-group-import.mjs --package --source ../slate-product-groups-v2 --only MG-S-22x14-D1 --out ../slate-monogram-pilot-import.json.gz`.

## Auftrag und Quellen vor der Umsetzung

Mikail, 04.11.2026: Nach der Entscheidung Skript + API, Start über Shell, zunächst zwei vollständige Pilotprodukte: „leg los“. Weiter gilt sein Auftrag für alle 48 Tafeln, passende Zielgruppen/Galerien und Start mit dem Hauptbild-Design. Abstimmung und Zuständigkeit: [#85, Importanschluss](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6628776171).

- Produktdokumente, Varianten, Preise und Bilder kommen unverändert aus der geprüften Vorbereitung in Code-PR #173, Katalogstand `43fe1f23d17fa54b94f5ab4c5f9754dab8b18323`. Keine neue Geometrie-, Preis-, SKU- oder Designfreigabelogik.
- Katalog-Freigaben und neue Zielzuordnungen verbleiben bei Astra/Claude in #85. Den gemeinsamen Konfigurator betreut Astra 1 in #48; siehe aktuelle Klarstellung oben. Kein fremder Branch, Datenbankersatz oder Startdateiwechsel.
- Bestehende native Repository-Revisionen, unveränderliche Originalressourcen und Shopify-Produkt-/Varianten-IDs müssen erhalten bleiben. Der neue Import ergänzt den vorhandenen Store und prüft vorab Preise mit dessen Laufzeit.
- Pilot mit Foto: `GT-S-22x14-D220`, bestehendes Shopify-Produkt `16168868348284`. Pilot ohne Foto: `MG-S-22x14-D1`. Quellen zu Hauptprodukten: Kataloglinien und `serien/hunde-gedenktafeln-22x14-2027.json`; historische Serienpreise werden nicht verwendet.

## Tatsächlicher Ausgangsstand

Lesende Serverprüfung 04.11.2026: Laufzeit `private/issue139-doors-156-20261103`, Datenordner `private/acryl-employee-20261021-v1/data`, Schema 4. In diesem Store **0 native Schieferprodukte** (`profile.material.kind = slate`). Startdatei SHA-256 `6898d5b5fb9dc4266b3dab2a9ff4233b9c3d50e2bdd8f1494eb83bee4513a597`. Das neue Gruppenmodul fehlt. [Meldung an den Operator](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6628988907).

Das vorhandene Hundeprodukt ist DRAFT mit 48 älteren Varianten (Befestigung × Ständer × Silikon), Grundpreis 25,99 €. Der vorbereitete native Stand hat 15 Befestigungs-/Farbkombinationen, Fotogrundpreis 28,99 €, Zubehör als Checkboxen. Ein vollständiges `productSet` mit nur diesen 15 Varianten würde alte Varianten löschen. Dieser Fall muss vor jedem Shop-Schreiben als Konflikt erkannt werden; kein zweites Hundeprodukt als Umweg.

## Ausführung und Nachweise

`scripts/slate-group-import.mjs` erstellt ein komprimiertes Paket ausschließlich aus vorbereiteten Produktrevisionen und ihren referenzierten Originalressourcen. Es verifiziert Dokument-/Dateiprüfsummen, Freigabe-Metadaten, vollständige native Variantenpreise und rendert das Hauptbild erneut zum Vergleich. Unbekannte Ressourcentabellen, fremde Mandanten, kollidierende Profile, veränderte unveränderliche Ressourcen und fremde Produktbearbeitungen werden abgewiesen.

Im vorhandenen Zielstore werden Ressourcen nur ergänzt und Produkte über das bestehende Importjournal gespeichert. Vor Änderungen erstellt die SQLite-Backup-API Sicherungen der beiden betroffenen Datenbanken. Eigene Änderungen hängen Revisionen an. Identische Wiederholungen schreiben keine Produktrevisionen; ein nach einem Prozessabbruch fehlender Journalstand wird aus identischen importierten Datensätzen rekonstruiert. Gleichzeitige Importläufe werden ausgeschlossen. Die ursprünglichen lokalen Vorbereitungs-IDs werden nicht als Server-IDs ausgegeben.

`scripts/check-slate-import-runtime.mjs` importiert die Produktprüfung und Preisvorbereitung aus der **ausdrücklich angegebenen aktiven Codewurzel**. Beim Schreiben ist dieser Schritt zwingend. Er erzeugt Versionsprüfsummen und Ergebnisse je Pilot. Der Aufrufer muss die Codewurzel aus der aktiven Startdatei ablesen, nicht einen beliebigen neueren Checkout angeben.

### Tatsächlich geprüft

- 27/27 gezielte Tests (Import, Gruppen, Fotopreis, Größenziele). Nach Ergänzung der Wiederaufnahme auch die fünf Importtests erneut grün.
- Echter lokaler Pilotimport: 2 Produkte, 30 Varianten, 17 Originale/17 Vorschauen ergänzt; bereits vorhandenes Produkt unverändert. Wiederholung: 0 neue Produkte, 0 neue Revisionen, 0 neue Ressourcen. Sicherung vorhanden.
- Echte Browserprüfung **nach** dem Import: 2/2, D220 mit 17 Hundedesigns und MG-D1 mit 82 Monogrammen, jeweils gespeichertes Startdesign, richtige Hauptbildprüfsumme, keine JavaScript-Fehler. [Prüfbericht](2026-11-04-schiefer-import-mika/browser-checks.json), [Foto-Konfigurator](2026-11-04-schiefer-import-mika/mit-foto-konfigurator.png), [Monogramm-Konfigurator](2026-11-04-schiefer-import-mika/ohne-foto-konfigurator.png).
- Paket `slate-pilot-import.json.gz`: 26.695.637 Bytes, SHA-256 `be90543607337ff4d86d7ce0596a70dfd901168b977b3518aad491a64bc76db2`. In Plesk nach `private/mika-schiefer-import-20261104/` hochgeladen, SHA auf dem Host bestätigt, privater Ordner 0700 und Paket 0600. Keine Kundendaten, keine Zugangsdaten im Paket.
- **Aktueller Host inkompatibel:** Beide Piloten scheitern mit „Schiefer benötigt eine eindeutige Befestigungsauswahl mit ausdrücklichen Bohrbildern.“ [Tatsächliches Serverergebnis](2026-11-04-schiefer-import-mika/server-runtime-check.json). Auch `runtime-check.json` liegt neben dem Paket auf dem Host. Der Schreibimport wurde dort nicht ausgeführt. [Anschluss an Astra #139 gemeldet](https://github.com/Chris83638w/gravuru-2027/issues/139#issuecomment-6629285920).
- Shopify-Abfrage gegen Schema 2026-07 validiert. **0 Shopify-Schreibzugriffe, 0 aktive Produktimporte, 0 Aktivierungen, kein Main-Merge und kein Wechsel der laufenden App.**

### Separater sichtbarer Quellfehler

Beim Hunde-Pilot ist „Foto-Upload hier klicken“ bereits in `designs/gedenktafeln-22x14/GT-S-22x14-D220/foto-1.png` eingebrannt, am Originalbild visuell bestätigt. Der Bildrenderer blendet seinen eigenen UI-Hinweis aus, kann diesen Rasteraufdruck aber nicht verlustfrei entfernen. Das paketierte Bild ist deshalb **kein freigegebenes fertiges Verkaufsbild**. Für den Shop braucht es das ursprüngliche Foto ohne Aufdruck; anschließend Vorbereitung und Paket erneut erzeugen. Keine generierte Ersatzaufnahme, keine heimliche Änderung der Katalogvorlage. Der Monogramm-Pilot hat diesen Fehler nicht. Bild-/Designfreigabe bleibt beim Schiefer-Team.

## Reproduktion

Node 24. Innerhalb des Code-Checkouts:

```sh
node scripts/slate-group-import.mjs --package --source ../slate-product-groups-v2 --only GT-S-22x14-D220,MG-S-22x14-D1 --out ../slate-pilot-import.json.gz
node --test scripts/slate-group-import.test.mjs app/workshop/slate-product-groups.test.mjs app/workshop/slate-photo-pricing.test.mjs app/workshop/slate-design-targets.test.mjs
```

Auf dem Host, nach dem gemeinsamen Deployment und mit der **dann tatsächlich aktiven Codewurzel** in `ACTIVE_CODE` (der heute gelesene Stand scheitert erwartungsgemäß):

```sh
ROOT=/var/www/vhosts/gravuru-designwerkstatt.de
STAGE="$ROOT/private/mika-schiefer-import-20261104"
TARGET="$ROOT/private/acryl-employee-20261021-v1/data"
node "$STAGE/check-slate-import-runtime.mjs" --bundle "$STAGE/slate-pilot-import.json.gz" --runtime "$ACTIVE_CODE"
node "$ACTIVE_CODE/scripts/slate-group-import.mjs" --bundle "$STAGE/slate-pilot-import.json.gz" --target "$TARGET" --runtime "$ACTIVE_CODE" --out "$STAGE/import-plan.json"
node "$ACTIVE_CODE/scripts/slate-group-import.mjs" --bundle "$STAGE/slate-pilot-import.json.gz" --target "$TARGET" --runtime "$ACTIVE_CODE" --apply --out "$STAGE/import-result.json"
```

Das Paket ist bis zum Austausch des Hunde-Originalfotos ein Diagnose-/Prüfpaket. Die Laufzeitprüfung kann unabhängig davon bereits ausgeführt werden. Nach einer Katalogkorrektur muss aus einem frischen nativen Grundlauf erneut paketiert werden; das Paket nicht von Hand ändern. Sicherung und Importjournal privat behalten. Bei abweichenden/mittlerweile manuell bearbeiteten Gruppen nicht das Journal löschen, sondern die Zuordnung prüfen.

## Genau nächster Schritt

1. Mit Astra 1 in #48 den Anschluss an den gemeinsamen Master abstimmen: Oberflächenbezug #161, native Schiefer-Funktionen aus #166/#170/#173 und dieser Import. Die tatsächlich aktive Codewurzel nach Integration melden. Dieser Chat wechselt die Startdatei nicht parallel.
2. Das separate Monogramm-Paket gegen diese aktive Laufzeit prüfen, dann zuerst dieses Produkt nativ importieren. Erst die zurückgegebenen IDs/Revisionen für Shopify verwenden. Shopify-Abgleich/Bildübertragung und native ID-Bindung bleiben danach auszuführen; bei Bindungen das **vollständige** `options`-Objekt einschließlich Abstandshalterfarbe verwenden, nicht nur `mounting`.
3. Für den zweiten Pilot liefert das Schiefer-Team D220-Originalfoto ohne eingebrannten Hinweis. Für den alten Hunde-Shopartikel eine Variante-erhaltende Übernahme der 48 Bestandsvarianten auf die neue native Auswahl festlegen. Kein blindes `productSet` und keine zweite Hundeanlage. Das Hunde-Paket danach aus der korrigierten Quelle neu erzeugen.
4. Produktseiteneinstieg und echter Warenkorbtest, anschließend derselbe Lauf für weitere passende freigegebene Gruppen. Katalogstand `43fe1f2` enthält weiterhin 10 vorbereitete Einträge auf 3 Tafeln; 45 Tafeln warten auf passende freigegebene Designs. Die neuen Katalogpakete #176/#177/#178 werden nicht durch diesen Import freigegeben.

Dieses Paket erledigt den geprüften nativen Storeimport und dessen Laufzeitprüfung. Es behauptet ausdrücklich keine fertige Shopify-Synchronisierung, Warenkorbfreigabe oder vollständige Veröffentlichung der 48 Größen.
