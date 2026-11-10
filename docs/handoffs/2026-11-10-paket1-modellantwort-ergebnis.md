# Paket 1a – Kunden-Modellantwort: Ergebnis des Bauers

Stand 10.11.2026 · Claude/Sonnet als Bauer, Claude als Operator · Branch `dev/claude-paket1-modellantwort-20261110`, Basis `8ceb866be1ed7b85fd8b0813babe78a833b60d11`. **Nichts installiert, nichts live, Schalter standardmäßig aus.** Kundenoberfläche (`app/configurator/`, `app/workshop/ui/`) und `ops/` sind byteweise unverändert. Design-Master unberührt, keine Designs bearbeitet.

Auftrag: [Bauanleitung](2026-11-10-paket1-modellantwort-bauanleitung.md).

## 1. Geänderte Dateien

| Datei | Zweck | Commit |
| --- | --- | --- |
| `scripts/customer-model-benchmark.mjs` (neu) | Messskript, synthetische Prüfbank (240 Designs, 80 Formate, Dokument 12,0 MB), Phasen, Erstabruf, Treffer, vier gleichzeitig | `45571f6` |
| `app/workshop/customer-model-response-cache.mjs` (neu) | LRU-Antwortspeicher, Schlüssel, Gültigkeit nur über Datenbankstand | `5d662ea` |
| `app/workshop/shop-entry.mjs` | Modellzweig mit Speicher; Schalter `modelResponseCache` (aus); `active()` in `activeContext()` + Freigabeprüfung geteilt; `requireDoorbellApproval` in `approvalKind` + `requireApproval` geteilt (gleiche Prüfung, gleiche Fehler) | `5d662ea` |
| `app/workshop/customer-read-scope.mjs` | `epoch` als benannter Export `databaseEpoch` (sonst unverändert) | `5d662ea` |
| `app/workshop/repository.mjs` | `readEpoch()` | `5d662ea` |
| `app/workshop/configurator-integration.mjs` | reicht `shopEntry.modelResponseCache: true` durch (nur dieser Wert gültig) | `5d662ea` |
| `app/workshop/acryl-employee-host.mjs` | `customerIntegrationFromEnv`: `GRAVURU_CUSTOMER_MODEL_CACHE` (nur `enabled`, sonst Fehler `customer_model_cache_env`, ohne Kundenanbindung ebenfalls Fehler) | `5d662ea` |
| `app/workshop/customer-model-response-cache.test.mjs`, `shop-entry-model-cache.test.mjs`, `shop-entry-model-cache-real.test.mjs` (neu) | 31 neue Tests | `02a9f58` |

## 2. Schritt 0 – Messung vor dem Umbau (lokal, synthetisch, keine Live-Aussage)

Prüfbank: echte SQLite-Werkstatt, Familienformate „alle Größen“ aus `app/workshop/test-fixtures/acryl3-rear`, 80 Formate, 240 Designs, Dokument 12 046 425 Byte, Antwort 612 620 Byte (live: 322 KB). Median aus 20 Abrufen, Millisekunden:

| Phase (jeweils eigene Lesephase) | Median |
| --- | --- |
| Dokument lesen + parsen (`repository.get`) | 66,8 |
| `model()` (Lesen + Kopie des gebauten Modells) | 98,8 |
| Kundenmodell (`shopStartModel` + Verschlanker) | 13,2 |
| `designGallery.start` (enthält hier ein zweites Dokument-Lesen; im echten Abruf teilt sich die Phase das Parsen) | 75,2 |
| Serialisieren | 4,5 |

Gesamt je Abruf lokal rund 100 ms, davon etwa zwei Drittel Dokument-Parsen. Das passt zur Anleitung (Lesen, Kopieren, Aufbereiten, Serialisieren wiederholt sich je Anfrage); die Zeit liegt nicht woanders. Absolute Werte liegen etwa um den Faktor 5 unter Live (550 ms), die Verteilung ist gleich.

**Ergänzender Befund aus Schritt 0:** Auch ein Speichertreffer wäre nach Anleitung nicht schnell, solange `active(req)` unverändert das Dokument parst (`requireDoorbellApproval` ohne Konfiguration liest `repository.get`) und die Startvorschau über `designGallery.start` → `cardFor` ebenfalls liest. Siehe Abweichungen 1 und 2.

## 3. Messung vorher / nachher (HTTP, Server-Zeit, Median aus 20, lokal)

| | vorher (Basis) | Schalter aus (neuer Code) | Schalter an |
| --- | --- | --- | --- |
| Erstabruf (leerer Speicher) | 148,7 | 154,4 / 160,7 | 163,1 / 193,3 |
| Wiederholter Abruf (Treffer) | 99,6 | 98,6 / 100,6 | 3,9 / 3,9 |
| Vier gleichzeitig, langsamster (Client) | 441,9 | 494,6 / 448,6 | 25,8 / 18,6 |

Zwei Läufe je Spalte nachher (Streuung beachten). Zur Kontrolle des Erstabrufs je zweimal Median aus 60: aus 159,1 / 165,8 ms, an 173,7 / 171,4 ms, also etwa +6 % (Ziel höchstens +10 %); der Erstabruf serialisiert zusätzlich einmal das Modell, holt das Kartenmodell und legt ab. Treffer 4,2 ms (Ziel ≤ 20 ms), vier gleichzeitig 21–24 ms. Kommando: `node scripts/customer-model-benchmark.mjs --runs 20 --model-cache off|enabled`.

Grenzen der Messung: Loopback, kein Proxy, die Freigabe (`catalogLiveApproval`) ist im Messskript ein synthetischer Stub; die echte Abfrage ist eine einzelne Tabellenabfrage je Anfrage. Live bleibt die Verbindung (ca. 0,4 s Aufbau) und die Rechenleistung des Servers.

## 4. Tests

Node 24.22.2 (`/home/claude/tools/node_modules/.bin/node`), `GRAVURU_PYTHON=$(which python3)`.

- Python-Pakete: `pip install --break-system-packages -r ops/plesk/requirements.txt` **und** `-r app/workshop/requirements-logo.txt` (picosvg, skia-pathops). Die Logo-Datei steht nicht in `ops/plesk/requirements.txt`; ohne sie liefert der Basistest „customer logo conversion …“ in `shop-entry.test.mjs` 503 (`logo_converter_unavailable`). Das war die Ursache der 503 auf der Basis. Danach Basis: 109 von 109 grün. Alle Pakete, auch libcairo, ließen sich installieren; kein Test übersprungen.
- Anleitung 6.5, Befehl: `node --test app/workshop/customer-read-scope.test.mjs app/workshop/repository.test.mjs app/workshop/shop-product-binding-store.test.mjs app/workshop/shop-entry.test.mjs app/workshop/public-preview-model.test.mjs app/workshop/public-design-previews.test.mjs`
  - Basis: 109 Tests, 109 bestanden, 0 fehlgeschlagen, 0 übersprungen.
  - Nach dem Umbau (Schalter aus): 109 / 109 / 0 / 0, Sollwerte unverändert.
- Neue Tests (je Datei `node --test <Datei>`): `customer-model-response-cache.test.mjs` 9/9, `shop-entry-model-cache.test.mjs` 16/16, `shop-entry-model-cache-real.test.mjs` 6/6. Zusammen 31 neue Tests.
- Gesamtlauf `node --test app/workshop/*.test.mjs`: 1706 Tests, 1696 bestanden, 8 fehlgeschlagen, 2 übersprungen (Laufzeit 16 min). Die 8 Fehlschläge (`acrylic-photo-resolution.test.mjs` 3, `cart-priced-options.test.mjs` 4, `konfis.test.mjs` 1) treten **identisch auf der unveränderten Basis** `8ceb866` auf (in getrenntem Worktree geprüft) und berühren diese Änderung nicht; Ursache nicht untersucht.
- Prüfung der Prüfungen: Absichtlich eingebaute Fehler (konstanter Datenbankstand, Pause auf Treffer nicht prüfen, Freigabe auf Treffer nicht prüfen, Schriftverfügbarkeit nicht prüfen, Design aus dem Schlüssel) lassen jeweils gezielte neue Tests rot werden. Die Option im Schlüssel ist doppelt abgesichert (`bindingId`/`assignmentRevision`), dafür gibt es nur den Schlüsseltest im Unit-Test.

Abnahme nach Abschnitt 6:

1. Bytegleichheit: 3 Produkte × (ohne/mit Design) × 2 Optionssätze, echte SQLite-Werkstatt: Körper mit Speicher (erster Abruf und Treffer) gleich Körper ohne Speicher, auch Header; derselbe Sitzungsstand.
2. Ungültig nach Schreiben: neue Revision, Veröffentlichung, Archivierung, Kopie, Schreiben einer fremden Verbindung, Schemaänderung, jeweils nächster Abruf frisch und gleich ungespeichert. Zurückgerollter Versuch: `databaseEpoch` ändert sich bei zurückgerolltem eigenem Schreiben (Unit-Test, auch `repository.readEpoch` bei fehlgeschlagenem `save`); ein nie festgeschriebener Versuch einer *fremden* Verbindung ändert nichts und lässt den Eintrag gültig (richtig, es wurde nichts geschrieben).
3. Prüfungen bleiben: Pause (auch echter Konfi-Status), Freigabeentzug Katalog und Funkklingel, geänderte/entfernte Zuordnung, anderer Mandant, abgelaufene Sitzung, falsche Herkunft, fehlende/ungültige Sitzung, Begrenzer, ausgeschaltete Designauswahl: gleicher Status und Code wie ohne Speicher, jeweils mit warmem Eintrag; Reihenfolge der Prüfungen (Dokumentfreigabe vor Pause vor Modellfreigabe) wie auf der Basis.
4. Grenzen: Eintragsgrenze, Byte-Grenze (in Bytes, nicht Zeichen), Begrenzung gehaltener Modelle, zu große Einzelantwort; Fehlerantworten und Funkklingel mit nicht bereitem Verschlanker werden nicht gespeichert; Store ohne `readEpoch` oder `konfis.paused` bleibt wie bisher; Schreibvorgang während des Aufbaus wird nicht gespeichert.
5. Schalter aus = Basis: bestehende Suites unverändert grün (siehe oben); `customerIntegrationFromEnv` ohne Variable liefert dasselbe wie vorher.
6. Messung: siehe Abschnitt 3.
7. `git diff --stat` gegen die Basis zeigt nur Dateien aus Abschnitt 1; 0 geänderte Dateien unter `app/configurator/`, `app/workshop/ui/`, `ops/`.

## 5. Abweichungen von der Bauanleitung (mit Begründung)

1. **Startvorschau wird nicht im Eintrag gespeichert.** Anleitung 4.2: „privater Teil der Startvorschau“ im Eintrag. Das Ziel-Token (`startPreview.target`) enthält aber die Sitzungskennung (`sid`) und wäre für jede andere Sitzung falsch; bei Speicherung wäre die Trefferquote über verschiedene Kunden null. Stattdessen hält der Eintrag das Servermodell und das Kartenmodell desselben Produktstands (geteilt zwischen allen Einträgen dieser Fassung, höchstens 2 verschiedene Fassungen gleichzeitig) und stellt das Token bei jeder Anfrage über `designGallery.start(..., {cardModel})` neu aus. Test: zwei Sitzungen, ein Eintrag, zwei verschiedene Token.
2. **`active(req)` ist im Modellzweig aufgeteilt** (`activeContext` = Sitzung, Begrenzer, Zuordnung; danach die Freigabeprüfung). Grund: Die unveränderte `active()` liest bei jeder Anfrage das 12-MB-Dokument, ein Treffer wäre dann nie unter 70 ms. Auf Treffer wird die Freigabeprüfung mit der gemerkten **Art** (Katalog/Funkklingel/keine) frisch ausgeführt. Reihenfolge und Fehler wie bisher. Die übrigen Routen nutzen weiter `active()` (jetzt `activeContext` + dieselbe Prüfung, Verhalten gleich).
3. **Zusätzliche Prüfung auf Treffer: Schriftdateien.** Ausgelagerte Schriften (`lazyFonts`) sind Dateien im Verschlanker mit begrenzter Ablage. Auf der Basis legt jeder Abruf sie neu an; ein Treffer täte das nicht. Darum zählt ein Eintrag nur als Treffer, wenn der Verschlanker jede Datei der Antwort noch liefern kann, sonst wird neu gebaut. Test mit verdrängten Dateien.
4. **Zustand des Verschlankers (4.5):** Schlüssel enthält „bereit/nicht bereit“. Gewöhnliche Produkte werden auch im Zustand „nicht bereit“ gespeichert, weil ihr Aufruf immer `deferAll` ohne Katalog nutzt (Antwort hängt nicht vom Katalog ab); Funkklingel-Modelle werden nur bei „bereit“ gespeichert. Das ist eine Auslegung von „nicht bereit → nicht speichern“; bitte bestätigen. Ein Wechsel nach „bereit“ erzeugt einen neuen Schlüssel, nie eine veraltete Antwort (Test).
5. **Speicher-Parameter:** `createShopEntry({modelResponseCache})` (`true` = Standardgrenzen, Objekt = Grenzen für Tests, sonst Konfigurationsfehler 503). Umgebungswert nur mit Kundenanbindung gültig (wie die Vorschau-Variablen).
6. **`configurator-integration.mjs`** steht nicht ausdrücklich in Abschnitt 5, ist aber die Stelle, die den Wert vom Host an den Einstieg reicht (zwei Zeilen plus Schlüsselprüfung).
7. **Zusatz Schlüssel:** `unitCents` der Zuordnung steht zusätzlich im Schlüssel (die Startvorschau prüft den Grundpreis dagegen).
8. **`allowedAssets` entfällt auf Treffer.** Die Asset-Route berechnet den Index bei Bedarf selbst; Test vergleicht Antworten mit/ohne Speicher.
9. **Messskript-Prüfbank:** 240 statt 251 Designs, 80 Formate, Dokument 12,0 MB; Polster nur an Designs, die der Start nicht mitschickt. Freigabe im Messskript synthetisch.

## 6. Offene Punkte und Risiken

- **Zustand ohne Schlüssel und ohne frische Prüfung je Anfrage:** (a) Der Inhalt des gebauten Modells hängt außer am Produktstand an inhaltsadressierten Dateien des Grafikspeichers (`assets.resource`) und am Zustand des Verschlankers, Dateien der Rohlingbilder (`DEFAULT_SURFACE_DIR`) werden beim Start gelesen. Das ist dieselbe Annahme wie die bestehende Modellablage in `http.mjs` („feste Revision ist unveränderlich“); der neue Eintrag lebt aber bis zum nächsten Datenbankschreibvorgang, die bestehende Ablage nur 8 Einträge lang. Würde ein Grafikinhalt zu gleichem Hash ersetzt, bliebe ein Eintrag bis zum nächsten Schreibvorgang. (b) Der Datenbankstand betrifft nur die Produktdatenbank. Pause (`konfis`), Freigaben (`orderIntake`), Zuordnung (`registry`) liegen woanders und werden deshalb je Anfrage frisch gelesen, nie gespeichert. Sonst keine mir bekannte Lücke.
- **Speicher:** Treffer halten das Servermodell (bis 2 Produktfassungen). Gemessen an der synthetischen Prüfbank (12-MB-Dokument): rund 12 MB Heap je gehaltenem Modell, also etwa 25 MB zusätzlich bei 2 Fassungen, plus höchstens 64 MB Antworttext (Standardgrenze). Die echte r4-Bank und der Plesk-Prozess sind nicht gemessen.
- **Treffer teilt dem Betrieb nichts mit:** keine Kennzahl, kein Log für Treffer/Fehltreffer. Vor dem Live-Schritt ggf. ein Zähler (nicht Teil dieses Auftrags).
- **Echte Freigabeabfrage und `registry.resolve`** bleiben je Anfrage (Absicht); ihre Kosten sind in den lokalen Zahlen nur teilweise enthalten (Freigabe im Skript Stub).
- Die 8 Fehlschläge des Gesamtlaufs (Abschnitt 4) bestehen schon auf der Basis; bitte getrennt klären.
- Nicht getestet: echter Plesk-Betrieb, echte Shopify-Sitzung, echte r4-Bank, Handy-/PC-Sichtprüfung (laut Anleitung erst bei Installation).
- Nächster Schritt: Abnahme durch den Operator, danach Installation mit `GRAVURU_CUSTOMER_MODEL_CACHE=enabled` erst nach ausdrücklichem „live“ von Chris.

## N1 – Gültigkeit je Produkt statt je Datenbankdatei (Nachbesserung nach Bauanleitung Abschnitt 9)

Stand 10.11.2026. Der Operator-Befund stimmt: `readEpoch` galt für die ganze Datei; Motivsuche, Entwürfe, Konfi-Status und Aufträge schreiben in dieselbe Datei und hätten jeden Eintrag verworfen. Jetzt gilt ein Eintrag nur, solange der **Stand des einen Produkts** unverändert ist. Der Schalter bleibt standardmäßig aus; ohne Schalter läuft alles wie die Basis.

### N1.1 Umbau in Kürze

- `repository.revisionState(id,{revision})` (neu, `repository.mjs`): liefert `{tenantId,id,revision,headRevision,headPublishedRevision,archived,status,schema}`. Fehler identisch zu `repository.get` (Status, Code, Text, Reihenfolge der Prüfungen: Produkt/Mandant 404 `not_found`, Revisionszahl 422 `invalid_revision`, Revision 404 `revision_not_found`). Läuft über `customerDatabaseRead` wie `get`.
- Bei **jeder** Anfrage frisch gelesen (auch bei Treffern). Der Stand-Text ist Teil der Trefferbedingung: anderer Stand = Eintrag verworfen und als „Invalidierung“ gezählt, danach Neubau. Nur dieser eine Eintrag geht verloren, nicht der ganze Store. Ein Schemawechsel steckt im Stand (`main`/`temp` `schema_version`) und verwirft damit nach und nach alles.
- `readEpoch` bleibt, aber nur noch für „während des Aufbaus wurde geschrieben → nicht ablegen“ (Punkt 4 des Auftrags); zusätzlich wird der Produktstand nach dem Aufbau erneut gelesen und muss dem davor entsprechen.
- Jeder Fehler beim Lesen des Stands (Produkt weg, fremder Mandant, Revision fehlt, Schreibvorgang während des Lesens) heißt: nicht aus dem Speicher; der bisherige Weg wirft dann den Fehler selbst. So sind Status und Code mit warmem Eintrag zwangsläufig dieselben wie ohne Speicher.
- Zähler: `modelCache.takeCounts()`; der Shop-Einstieg schreibt über den vorhandenen `logger` höchstens eine Zeile je Minute `{"event":"model_response_cache",hits,misses,stores,invalidations,evictions,entries,bytes,models}` (nur Zahlen, nur wenn etwas passiert ist, bei der nächsten Modellanfrage nach Minutenwechsel; kein Zeitgeber).

### N1.2 Eingaben des gespeicherten Antwortteils (Auftrag 3)

Der gespeicherte Teil ist: serialisiertes `presentedModel(...)`, `activeKind`, `modelKind`, `startDesignId`, `fontHashes`, das gehaltene Servermodell (`held`: `model`, `cardModel`). Quellen: `modelFor` → `workshop.model` (`customerModelFor` → `model` → `buildModel`) und `presentedModel` → `shopStartModel`, `slimmer.slim`, `selectedProfile`; Karten: `workshop.galleryModel` → `shopGalleryModel(repository.get(...))`. Einstufung: **K** = im Schlüssel, **F** = je Anfrage frisch (nie gespeichert), **P** = Produktstand (Teil der Trefferbedingung), **U** = unveränderlich bzw. von der bestehenden `modelCache`-Ablage in `http.mjs` ebenso eingefroren (gleiche Annahme, ausdrücklich), **offen** = Meldung.

| Eingabe | Quelle | Einstufung |
|---|---|---|
| Produktdokument der gepinnten Revision (`record.document`) | `repository.get(id,{revision})`, Tabelle `product_revisions`, Trigger `immutable_revision_update/_delete` | K (`productId`, `productRevision`) + U (Trigger) |
| Profilauswahl der Revision (`record.metadata.profiles`) | gleiche Zeile, unveränderlich | K + U; `http.mjs` friert sie in `modelCache` ebenso ein |
| `configuration.{id,revision,publishedRevision}` | `record` der gepinnten Revision; `publishedRevision` stammt aus der Snapshot-Zeile (unveränderlich), nicht aus dem Kopf | K + U. Der Kopf (`headPublishedRevision`) steht trotzdem im Produktstand: jede Veröffentlichung verwirft den Eintrag |
| Produktkopf (aktuelle Revision, Veröffentlichung, Archivierung) | Tabelle `products` | P (neu in `revisionState`); für Akryl-Modelle fließt er heute nicht in die Antwort, steht aber zur Sicherheit im Stand |
| Mandant | `tenant` des Repositorys, 404 bei fremdem Produkt | P (Fehler wie `get`) |
| Pause (`konfis.paused`) | Tabelle des Konfi-Status | F (Treffer prüft vor Freigabe 2, 423) |
| Katalog-/Funkklingel-Freigabe | `orderIntake.*LiveApproval` | F (Art der Freigabe `activeKind`/`modelKind` ist U aus dem Dokument, die Freigabe selbst F) |
| Sitzung, Begrenzer, Herkunft, Zuordnung (`registry.resolve`) | `activeContext` | F |
| Optionen, Preis (`unitCents`), `bindingId`, `assignmentRevision` der Zuordnung | `context.binding` | K |
| `design`-Parameter | Anfrage | K |
| Zustand des Verschlankers (`none/cold/ready`), Schriftenablage auf der Platte | `slimmer.ready()`, `slimmer.fontFile(hash)` | K (Zustand) + F (`fontsAvailable` je Treffer) |
| Materialbild (`/api/workshop/material-surfaces/<sha>.png`), Motivquellen (`assets.resource`) | `design-assets`: inhaltsadressiert (SHA-256), Trigger `design_asset_immutable`/`material_surface_immutable`, kein `DELETE` im Code | U (Inhalt = Schlüssel; gleiche Annahme wie `modelCache`) |
| Schriften `formFonts`, Katalog-Ressourcen `workshopResources()`, `themeCatalog`, `SIGN_PLACEMENT_FAMILIES`, `familyExecution` | Moduldateien bzw. Optionen, einmal je Prozess geladen (`catalog.mjs` `loaded`) | U je Prozessleben (Neustart leert den Speicher ohnehin); gleiche Annahme wie `modelCache` |
| Familien, Korrekturen, Katalogstruktur, Profilbibliothek (`profiles.resolve`) | werden von `buildModel` für gepinnte Revisionen **nicht** gelesen (`profiles.resolve` nur ungepinnt, `families`/`corrections`/`catalogStructure` gar nicht; per Durchsicht von `buildModel`, `resolveProduct`, `embedMaterialSurface`) | nicht Eingabe |
| Startvorschau (Ziel-Token mit `sid`), `publicPreviews.attach`, `expiresAt`, `customerId`, `publicBinding` | je Anfrage | F |
| Uhrzeit | nur in Sitzung/`expiresAt` | F |
| **offen** | keine | – |

Ergebnis: **nichts steht auf „offen“.** Ehrlich benannte Annahmen (nicht neu, sondern dieselben wie `modelCache` in `http.mjs`): (a) Revisionszeilen und Assets sind unveränderlich/inhaltsadressiert; (b) Prozessdateien (Katalog, Schriften, Theme) ändern sich nicht im laufenden Prozess; (c) die Mandantenzeile der Revision entspricht der des Produkts (so werden sie geschrieben; siehe Abweichung N1-A).

### N1.3 Tests

- `customer-model-response-cache.test.mjs`: jetzt 10 Tests (vorher 9; Stand-Semantik und Zähler umgeschrieben, neu: `revisionState` – gleiche Fehler wie `get` für 10 Fälle plus fremden Mandanten, liest weder `document` noch `metadata` (Anweisungen mitgeschrieben), blind für Motivsuche-Tabelle/anderes Produkt/anderen Mandanten, reagiert auf Revision/Veröffentlichung/Archivierung/Schema).
- `shop-entry-model-cache.test.mjs`: jetzt 20 (vorher 16). Neu bzw. neu gefasst: kundenseitige Schreibvorgänge verwerfen nicht, Änderungen dieses Produkts wirken sofort mit Bytegleichheit danach; Produktstand wird je Anfrage gelesen; **Optionen** (nur Optionen ändern sich bei gleicher Zuordnung → neue Antwort, zurück → alte Antwort, andere Reihenfolge → gleicher Eintrag); unbekanntes Produkt/fehlende Revision mit warmem Eintrag = Status/Code/Text wie ohne Speicher; Zähler über `logger` (eine Zeile je Minute, nur Zahlen).
- `shop-entry-model-cache-real.test.mjs`: jetzt 7 (vorher 6), echte SQLite-Werkstatt: Änderungen dieses Produkts (Revision, Veröffentlichung, Archivierung, Schema) wirken sofort; echte Motivsuche (`createMotifSearchStats` auf derselben Datei, auch 20 Eingaben hintereinander), Konfi-Status eines anderen Produkts, Revision/Veröffentlichung/Archivierung/Kopie anderer Produkte, fremde Verbindung (Zeilen, zurückgerollt) lassen den Eintrag stehen und die Antwort bytegleich; Optionen mit echtem Modell.
- Mutationsproben (jeweils rückgängig gemacht): Gültigkeit wieder auf `readEpoch` → 5 neue Tests schlagen fehl; Optionen aus dem Schlüssel → 3 Tests (Schlüsseltest + beide Optionentests); Stand beim Abruf ignoriert → 6 Tests.

Kommandos und Zähler (Node 24, `GRAVURU_PYTHON=$(which python3)`):

- `node --test app/workshop/customer-model-response-cache.test.mjs app/workshop/shop-entry-model-cache.test.mjs app/workshop/shop-entry-model-cache-real.test.mjs` → 37 Tests / 37 grün / 0 Fehlschläge / 0 übersprungen.
- Basis-Suites (6.5): `node --test app/workshop/customer-read-scope.test.mjs app/workshop/repository.test.mjs app/workshop/shop-product-binding-store.test.mjs app/workshop/shop-entry.test.mjs app/workshop/public-preview-model.test.mjs app/workshop/public-design-previews.test.mjs` → 109 / 109 / 0 / 0, unverändert gegenüber vorher.
- Gesamtlauf `node --test app/workshop/*.test.mjs` (vor der letzten Korrektur unten): 1712 Tests / 1701 grün / 9 Fehlschläge / 2 übersprungen. 8 davon sind die bekannten der Basis `8ceb866` (acrylic-photo-resolution 3, cart-priced-options 4, `Werkstatt einheitlich …` 1). Der neunte war `tenant.test.mjs` „Grep: keine Abfrage ohne Mandantenfilter“: meine erste `revisionState`-Abfrage hatte keinen `tenant_id`-Filter. Ursache behoben (Verbund über `products.tenant_id`, Index bleibt abdeckend, 0,03 ms), `tenant.test.mjs` danach einzeln 9/9 grün, die 37 und die 109 Tests oben danach neu gelaufen. Der Gesamtlauf wurde nach dieser Korrektur NICHT noch einmal komplett wiederholt.

### N1.4 Messung (lokal, synthetisch, Server-Zeit, Median aus 20; Skript `--motif-search none|between`)

Mit `between` wird vor jedem Abruf eine echte Motivsuche in `motif_search_daily` derselben Datei protokolliert (eigene Verbindung, 60 Suchen je Lauf).

| Lauf | Erstabruf (Server) | Wiederholter Abruf (Server / Client) | vier gleichzeitig (langsamster, Client) |
|---|---|---|---|
| Schalter aus, ohne Schreiben | 153,5 | 104,0 / 106,1 | 458,9 |
| Schalter aus, Motivsuche dazwischen | 153,4 | 103,2 / 107,0 | 454,2 |
| Schalter an, ohne Schreiben | 166,6 | 4,2 / 5,1 | 20,7 |
| Schalter an, **Motivsuche dazwischen** | 168,3 | 4,2 / 5,1 | 19,7 |

Zum Vergleich der Vorversion (Stand-der-Datei): ohne Schreiben 3,9 ms; **mit** Motivsuche dazwischen wäre sie bei jedem Abruf ein Fehltreffer (≈ Erstabruf-Zeit) gewesen – nicht gemessen, aus dem Aufbau folgend; die neue Variante belegt den Gegenfall. Der Erstabruf kostet etwa 8 % mehr als ohne Speicher (153,5 → 166,6; Stand lesen, Antwort serialisieren, Kartenmodell halten). Lokale Werte, keine Live-Aussage; Freigabe im Skript ist ein Stub.

### N1.5 Abweichungen von der Anleitung und offene Punkte

- **N1-A, `revisionState` liest die Snapshot-Spalten `status`/`published_revision`/`created_at` nicht.** Sie liegen in `product_revisions` hinter der bis zu 12 MB großen Spalte `document`; SQLite liest dafür die ganze Überlaufkette (gemessen 2,1 ms je Aufruf, in der Messung 6,8 statt 3,9 ms am Treffer). Stattdessen: Dasein der Revision über den Index `(product_id, revision)` mit Verbund auf `products.tenant_id` (der Wächtertest `tenant.test.mjs` verlangt einen Mandantenfilter in jeder Abfrage), Kopfzeile aus `products`. Die Spalten der gewählten Revision sind unveränderlich (Trigger) und stehen damit nicht im Stand; `configuration.publishedRevision` stammt aus dieser unveränderlichen Zeile. Folge: der Mandant wird an der Produktzeile gefiltert, nicht an der Revisionszeile (beide werden mit demselben Mandanten geschrieben). Gemessen mit `revisionState`: 0,03 ms. Wenn der Operator die Snapshot-Spalten dennoch im Stand will, kostet das pro Anfrage ~2 ms.
- **N1-B, Produktstand enthält den Kopf (neue Revision, Veröffentlichung, Archivierung) auch dort, wo die Akryl-Antwort ihn heute nicht liest.** Absicht (vorsichtig): solche Änderungen verwerfen den Eintrag und kosten einmal einen Neubau.
- **N1-C, Schemawechsel verwerfen alles** (Stand enthält `schema_version`). Zur Laufzeit legt kein Kundenweg Tabellen an (`CREATE TABLE IF NOT EXISTS` ändert die Version nicht, wenn die Tabelle da ist); bei einer Migration im laufenden Betrieb beginnt der Speicher neu.
- Treffer-Zähler `hits` zählt einen Treffer, dessen ausgelagerte Schrift fehlt, als Fehltreffer (`unusable`).
- Veraltete Einträge (anderer Stand) werden erst beim nächsten Abruf desselben Schlüssels oder durch Verdrängung entfernt und belegen bis dahin Platz (und ein gehaltenes Modell, ca. 12 MB, gegen die Grenze von 2). Begrenzung bleibt wirksam.
- Der Zeilen-Zähler erscheint nur bei Modellanfragen; ohne Anfragen kommt keine Zeile (kein Zeitgeber, absichtlich).
