# Paket 1a – Kunden-Modellantwort ohne Wiederholungsarbeit (Bauanleitung)

Stand 10.11.2026 · Claude (Operator) im Auftrag von Chris · Branch `dev/claude-paket1-modellantwort-20261110`, Basis `8ceb866be1ed7b85fd8b0813babe78a833b60d11` (Mikas vorbereitetes Fünfdateienpaket, noch nicht live). **Nichts davon ist installiert oder veröffentlicht.** Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unberührt; keine Designs bearbeitet.

## 1. Auftrag und feste Regeln (Quelle: Chris im Claude-Chat, 10.11.2026)

- **Kundenseite eingefroren.** Der freigegebene R15-Konfi bleibt in Aussehen und Bedienung exakt gleich. Keine optische Änderung und keine Änderung an dem, was der Kunde bedienen kann, ohne vorherige Absprache mit Chris. Erlaubt ist nur Arbeit „unter der Haube“ (Auslieferung, Server, Abgleich).
- **Ein Schreiber.** Für Paket 1 hat Chris die Regel „gemeinsamer Konfi nur durch Mika“ aus `AGENTS.md` aufgehoben, weil Mika zwei Tage schlechtes Internet hat. Anleitung und Abnahme: Claude (Operator). Bau: Sonnet in der Cloud. Mika arbeitet in dieser Zeit nicht parallel an den unten genannten Dateien und liest das Ergebnis nach seiner Rückkehr gegen.
- **Kein Live-Schritt in diesem Auftrag.** Nur Branch, Tests, Messung, Übergabe. Installation auf Plesk folgt getrennt nach Abnahme und ausdrücklichem „live“ von Chris.
- Shopify hat Priorität. Amazon („Jetzt anpassen“, Bestellimport) ist als späteres Paket 5 vorgemerkt und ändert hier nichts.
- Diese Anleitung führt **keine neue Fachregel** ein (keine Preise, Rechte, Sperren, Standardwerte). Was fachlich geprüft wird, bleibt je Anfrage geprüft.

## 2. Befund, den dieses Paket behebt

Eigene Messung von außen (Rechenzentrum, 10.11.2026 ca. 07:20 Berlin, echter Shop-Einstieg Edelstahl-Türschild, frische Sitzung, nur Lesen):

| Messung | Ergebnis |
| --- | --- |
| `GET /api/shop-entry/model`, einzeln, dreimal | Antwort beginnt nach 1,25–1,42 s (davon ca. 0,4 s Verbindungsaufbau); 322 KB JSON, `private, no-store` |
| vier Modellabrufe gleichzeitig | 1,25 / 1,72 / 2,35 / 2,93 s – die Anfragen werden nacheinander abgearbeitet, rund 0,55 s je Abruf |
| statische Datei, während ein Modell läuft | 0,77 s statt 0,57 s |

Das passt zu Mikas lokaler Messung mit der echten r4-Bank (251 Designs, 80 Größen, 404 Kombinationen, 11,9 MB Dokument): Modellabruf 617–643 ms nach seiner Phasen-Optimierung ([Übergabe](2026-11-09-customer-read-snapshot.md)).

Ursache im Code (Basisstand):

1. `repository.get()` → `record()` liest und parst bei **jeder** Anfrage das vollständige Produktdokument (`JSON.parse(snap.document)`, rund 12 MB). `customerDatabaseRead` merkt es sich nur innerhalb einer synchronen Phase.
2. `http.mjs` `model()` hält zwar das gebaute Modell je gepinnter Revision (`modelCache`), liefert aber je Anfrage eine vollständige `structuredClone`-Kopie.
3. `shop-entry.mjs` `presentedModel()` baut daraus je Anfrage das Kundenmodell (`shopStartModel`, `slimmer.slim`), `designGallery.start()` die Startvorschau, `json()` serialisiert 322 KB.

Ein einziger Node-Prozess mit synchronem SQLite arbeitet das nacheinander ab. Bei zehn gleichzeitigen Kunden wartet der letzte allein auf das Modell mehrere Sekunden. **Korrektur zu meiner ersten Kurzfassung an Chris:** Das gebaute Modell wird bereits im Speicher gehalten; wiederholt werden Dokument-Lesen, Kopieren, Aufbereiten und Serialisieren.

## 3. Ziel

Die fertige Kunden-Modellantwort für eine unveränderte Kombination aus Produktrevision, Zuordnung, Optionen und Design wird **einmal** erzeugt und danach wiederverwendet – solange nachweislich nichts geschrieben wurde. Alle Prüfungen, die an Sitzung, Zuordnung, Freigabe und Pause hängen, laufen weiter **bei jeder Anfrage frisch**.

Zielwerte (Vorschlag des Operators, keine Vorgabe von Chris): Treffer-Serverzeit im Median höchstens 20 ms bei der großen Prüfbank; vier gleichzeitige Treffer stapeln sich nicht mehr spürbar; Erstabruf nicht langsamer als heute (±10 %).

## 4. Umsetzung

### 4.1 Schritt 0 – erst messen

Ein lokales Messskript `scripts/customer-model-benchmark.mjs` (Vorbild `scripts/shop-gallery-benchmark.mjs`) mit einer **synthetischen** großen Prüfbank: gleiche Größenordnung wie r4 (ca. 250 Designs, 80 Formate, Dokument ≥ 10 MB), erzeugt aus den vorhandenen Testhilfen – keine echten Produkt-, Kunden- oder Shopdaten. Es misst je Phase (Dokument lesen/parsen, `model()`, `presentedModel`, `designGallery.start`, Serialisieren) und gibt Median aus 20 Abrufen aus. Ergebnis vor dem Umbau in den Bericht. Weicht die Verteilung stark vom Befund ab, **stoppen und im Bericht melden**, nicht blind weiterbauen.

### 4.2 Antwortspeicher im Kundeneinstieg

Neue Datei `app/workshop/customer-model-response-cache.mjs` (klein, ohne Abhängigkeit auf UI):

- Begrenzter LRU-Speicher: höchstens 64 Einträge **und** höchstens 64 MB Gesamtgröße (beides als Konstante, per Option überschreibbar für Tests). Bei Überschreitung ältesten Eintrag verdrängen.
- Eintrag: fertig serialisierter JSON-Text des Kundenmodells (`presented`), der private Teil der Startvorschau (ohne `previewUrl`), die Freigabeart (siehe 4.4), der Stand der Produktdatenbank (siehe 4.3).
- Schlüssel: `storeId`, `productId`, `productRevision`, `bindingId`, `assignmentRevision`, kanonisch sortierte `binding.options`, `designId` oder `null`, Zustand des Verschlankers (siehe 4.5).
- Kein Timer, keine Ablage auf Platte, kein Speicher über Prozessneustarts.

In `app/workshop/shop-entry.mjs`, nur im Zweig `action==='model'`:

- Unverändert zuerst: Methodenprüfung, Parameterprüfung, `checkOrigin`, `active(req)` (Sitzung, Begrenzer, frische Zuordnung, Freigabe).
- Danach Treffer suchen. **Treffer nur**, wenn der gespeicherte Datenbankstand gleich dem aktuellen ist (4.3) und Pause- sowie Freigabeprüfung frisch bestanden sind (4.4).
- Bei Treffer: Antwort aus dem gespeicherten JSON-Text zusammensetzen; `publicPreviews.attach(...)` für die Startvorschau weiterhin je Anfrage; Sitzungsfelder (`expiresAt`, `customerId`) und `binding` je Anfrage frisch.
- Ohne Treffer: exakt der heutige Weg; danach Eintrag ablegen.
- Die Antwort muss **bytegleich** zur heutigen sein (gleiche Feldreihenfolge wie `json(res,200,{model,startPreview,binding,editorPath,shopDomain,themeCartPath,expiresAt,customerId,productionReady})`).
- `allowedAssets(...)` dient im Modellzweig nur dem Vorwärmen des Asset-Index. Bei Treffer darf der Aufruf entfallen, **wenn** ein Test belegt, dass die Asset-Route danach weiterhin dieselben Dateien liefert bzw. ablehnt (auch nach Verdrängung aus `assetIndex`). Sonst den Index mit dem Eintrag zusammen halten.

### 4.3 Gültigkeit: derselbe Nachweis wie in Mikas Phasen

`customer-read-scope.mjs` bestimmt bereits einen Datenbankstand aus `total_changes()`, `data_version` und Haupt-/TEMP-Schema-Version. Diese Funktion als benannten Export bereitstellen (z. B. `databaseEpoch(db)`), Verhalten der bestehenden Exporte unverändert.

`repository.mjs` bekommt eine lesende Methode (z. B. `readEpoch()`), die diesen Stand für die Produktdatenbank zurückgibt. Der Antwortspeicher vergleicht ihn bei jedem Zugriff. **Jeder** Schreibvorgang auf der Produktdatenbank – eigener, fremder, zurückgerollter, Schemaänderung – macht alle Einträge dieses Stores ungültig. Kein Versuch, „unschädliche“ Schreibvorgänge zu erkennen.

Hat ein Store diese Methode nicht (getrennt installierte Altlaufzeit), wird für ihn **nicht** gespeichert; er läuft wie heute.

### 4.4 Prüfungen, die bei jedem Treffer frisch bleiben

| Prüfung | Heute über | Bei Treffer |
| --- | --- | --- |
| Sitzung, Anfragebegrenzung, Herkunft | `active(req)`, `checkOrigin` | unverändert |
| Zuordnung aktuell, Mandant, Shop | `resolve()` in `active(req)` | unverändert; Zuordnungsfelder stehen zusätzlich im Schlüssel |
| Konfi pausiert (423) | Fehler aus `store.workshop.model()` | ausdrücklich frisch prüfen, gleicher Status/Code/Text wie heute |
| Katalog-/Funkklingel-Freigabe | `requireDoorbellApproval(store,binding,model.universal)` | Freigabeart (`katalog`, `funkklingel`, keine) im Eintrag merken, die **Freigabeabfrage selbst je Anfrage frisch**; nie das Ergebnis speichern |
| Modell gehört zur Zuordnung, `key==='acryl'` | `modelFor()` | beim Ablegen geprüft; Schlüssel enthält Produkt und Revision |
| Designauswahl ausgeschaltet (403) | `presentedModel()` | beim Ablegen geprüft; `designId` steht im Schlüssel; Fehlerfälle werden nie gespeichert |

Fehlerantworten werden grundsätzlich nicht gespeichert.

### 4.5 Verschlanker (`slimmer`)

`presentedModel()` hängt vom Zustand des Verschlankers ab (`slimmer.ready()`, ausgelagerte Schriften). Solange er nicht bereit ist oder sein Zustand sich ändern kann, **nicht speichern**; sonst seinen Zustand in den Schlüssel aufnehmen. Ein Test muss zeigen, dass vor und nach „bereit“ keine veraltete Antwort ausgeliefert wird.

### 4.6 Schalter

Neuer Start-Parameter des Kundeneinstiegs (Durchreichung über die bestehende Konfiguration, Umgebungswert `GRAVURU_CUSTOMER_MODEL_CACHE`, einziger gültiger Wert `enabled`, alles andere als Fehler vor dem Start – wie die bestehenden Schalter). **Voreinstellung aus.** Ohne Schalter ist das Verhalten exakt wie auf der Basis.

## 5. Dateien

Erlaubt zu ändern: `app/workshop/shop-entry.mjs`, `app/workshop/repository.mjs`, `app/workshop/customer-read-scope.mjs`, die Stelle, die den Schalter durchreicht (`acryl-employee-host.mjs` nur in `customerIntegrationFromEnv` und der Übergabe an den Einstieg, sonst nichts), zugehörige `*.test.mjs`. Neu: `app/workshop/customer-model-response-cache.mjs` samt Test, `scripts/customer-model-benchmark.mjs`.

**Nicht anfassen:** alles unter `app/configurator/` (Kundeneditor, Styles, Bundles), `app/workshop/ui/`, Preis-, Warenkorb-, Bestell- und Exportmodule, Mikas fünf Dateien dieses Pakets außer der genannten Schalterstelle, `ops/`, Installer, Theme. Keine neue npm-Abhängigkeit.

## 6. Abnahme (prüft der Operator, bevor Chris etwas sieht)

1. **Bytegleichheit:** Für mindestens drei Prüfprodukte × (ohne Design / mit Design) × zwei Optionssätze ist der Antwortkörper mit Speicher identisch zum Antwortkörper ohne Speicher (Sitzungsfelder ausgenommen nur, soweit sie aus derselben Sitzung ohnehin gleich sind).
2. **Ungültig nach Schreiben:** neue Revision, Veröffentlichung, Archivierung, zurückgerollter Schreibversuch, fremde Verbindung, Schemaänderung → nächster Abruf ist frisch und gleich dem ungespeicherten Ergebnis.
3. **Prüfungen bleiben:** Pause, Freigabeentzug (Katalog und Funkklingel), geänderte oder entfernte Zuordnung, anderer Mandant, abgelaufene Sitzung, falsche Herkunft, Begrenzer, ausgeschaltete Designauswahl liefern mit warmem Speicher denselben Status und Code wie ohne.
4. **Grenzen:** Eintrags- und Größengrenze greifen; Fehlerantworten und nicht bereite Verschlanker-Zustände werden nicht gespeichert; Altlaufzeit ohne `readEpoch` bleibt unverändert.
5. **Schalter aus = Basis:** bestehende Suites unverändert grün:
   `node --test app/workshop/customer-read-scope.test.mjs app/workshop/repository.test.mjs app/workshop/shop-product-binding-store.test.mjs app/workshop/shop-entry.test.mjs app/workshop/public-preview-model.test.mjs app/workshop/public-design-previews.test.mjs` (Node ≥ 24; Python-Abhängigkeiten aus `ops/plesk/requirements.txt`, `GRAVURU_PYTHON` setzen).
6. **Messung:** Messskript vorher/nachher, Median aus 20, Treffer und Erstabruf getrennt, vier gleichzeitige Abrufe. Lokale Werte sind keine Live-Aussage.
7. **Kundenseite unberührt:** `git diff --stat` gegen die Basis zeigt nur die Dateien aus Abschnitt 5; kein Byte unter `app/configurator/` und `app/workshop/ui/` geändert.

Sichtprüfung mit Vorher-/Nachher-Screenshots auf Handy und PC folgt erst bei der Installation, weil dieser Schritt die Oberfläche nicht berührt und lokal kein echter Shop vorliegt.

## 7. Bericht des Bauers

In `docs/handoffs/2026-11-10-paket1-modellantwort-ergebnis.md`: geänderte Dateien mit Commit, Messwerte vorher/nachher, ausgeführte Tests mit Zählern, jede Abweichung von dieser Anleitung mit Begründung, offene Punkte. Dazu ein kurzer Abschnitt oben in `STATUS.md` (Datum, „Claude/Sonnet als Bauer, Claude als Operator“). Unklare Fachfragen **nicht entscheiden**, sondern als offen melden.

## 8. Nicht Teil dieses Auftrags (vorgemerkt)

- **1b – Konfi-Dateien nicht mehr durch Node:** Mikas vorbereitete Bündel bleiben Grundlage; statische Auslieferung und der neue Speicher mit öffentlichem und privatem Bereich brauchen erst die Anbieterentscheidung von Chris.
- **Paket 2:** Galerieliste, Vorschau-Rendering und Abgleich in einen Hintergrunddienst; Überlastschutz (heute 240 Anfragen/Minute je Sitzung bei rund 110 Modellabrufen/Minute Gesamtleistung).
- **Paket 3:** `main` = live, automatische Installation, Branches aufräumen.
- **Paket 4:** Produktanlage aus Chat/Katalog nach #227, Werkstatt-Dashboards (Vorschläge erst an Chris).
- **Paket 5:** Amazon-Vorlagen aus denselben Daten, Amazon-Bestellimport.
- Entscheidung Chris 10.11.2026 zur Aufbewahrung: Kundenfotos und Druck-/Gravurdateien 45 Tage nach Versand löschen, Bestellstand ohne Foto 2 Jahre. Umsetzung mit dem neuen Speicher, nicht hier.

## 9. Nachbesserung N1 (Operator, 10.11.2026, nach Gegenlesen von `86ccee6`)

**Befund – Fehler in meiner Anleitung 4.3, nicht im Bau:** Der Datenbankstand (`readEpoch`) gilt für die ganze Datei. In derselben Datei schreiben aber auch Kundenwege: `createMotifSearchStats({filename})` bei jeder Motivsuche, `createFormCustomerStore({filename})` bei Entwürfen, dazu Konfi-Status, Stapel- und KI-Aufträge. Jeder dieser Schreibvorgänge verwirft alle Einträge. Im echten Betrieb wäre der Speicher damit ständig leer; die lokale Messung zeigt das nicht, weil dort nichts dazwischen schreibt.

**Belegte Grundlage für die Korrektur:**
- `product_revisions` ist durch die Trigger `immutable_revision_update` und `immutable_revision_delete` unveränderlich (`repository.mjs`).
- Die bestehende Modellablage in `http.mjs` (`modelCache`) behandelt das gebaute Modell einer gepinnten Revision bereits als unveränderlich und setzt bei jedem Abruf nur `configuration:{id,revision,publishedRevision}` frisch aus dem Datensatz.

**Auftrag N1:**
1. Gültigkeit je Eintrag nicht mehr am Stand der ganzen Datei, sondern am **Stand des einen Produkts**: neue lesende Methode in `repository.mjs` (z. B. `revisionState(id,revision)`), die **ohne** die Spalte `document` zu lesen genau die Kopf- und Revisionsangaben liefert, die heute über `repository.get(id,{revision})` in die Antwort oder in Prüfungen einfließen (mindestens `revision`, `publishedRevision`, `status`/archiviert, Mandant). Sie muss für fehlendes Produkt, fehlende Revision und fremden Mandanten **dieselben Fehler** (Status und Code) liefern wie `repository.get`.
2. Dieser Produktstand wird bei **jeder** Anfrage frisch gelesen und ist Teil des Schlüssels bzw. der Trefferbedingung. Vorher belegen (Quelle nennen), welche Felder der Antwort vom Produktkopf abhängen; `configuration.publishedRevision` gehört sicher dazu.
3. Vor dem Umbau **vollständig auflisten**, was `buildModel`, `presentedModel` und der gespeicherte Teil der Antwort außer dem unveränderlichen Dokument lesen (Tabellen derselben Datei wie Familien, Korrekturen, Katalogstruktur; andere Dateien; Platte; Prozesszustand). Je Eintrag: bleibt je Anfrage frisch / steht im Schlüssel / wird von der bestehenden `modelCache`-Ablage ebenfalls eingefroren (dann gleiche Annahme, ausdrücklich benennen) / **offen**. Steht etwas auf „offen“, nicht umbauen, sondern melden.
4. Die Prüfung „während des Aufbaus wurde geschrieben → nicht ablegen“ bleibt mit `readEpoch` bestehen. Schemaänderungen verwerfen weiterhin alles.
5. Neue Tests: Kundenseitige Schreibvorgänge in derselben Datei (Motivsuche protokollieren, Entwurf speichern, Konfi-Status eines **anderen** Produkts) verwerfen den Eintrag **nicht**; neue Revision, Veröffentlichung, Archivierung und Pause **dieses** Produkts wirken sofort; gelöschtes/unbekanntes Produkt und fremder Mandant liefern mit warmem Eintrag denselben Status und Code wie ohne Speicher. Bytegleichheit aus 6.1 bleibt, auch nach einer Veröffentlichung dazwischen.
6. Zähler für Treffer, Fehltreffer und Verdrängungen über den vorhandenen `logger`/`onMeasure`-Weg, ohne Kunden- oder Sitzungsdaten, höchstens eine Zeile je Minute.
7. Messskript um einen Lauf erweitern, in dem zwischen den Abrufen eine Motivsuche protokolliert wird (vorher/nachher).
8. Offener Punkt aus dem Bericht: Test nachziehen, der belegt, dass geänderte **Optionen** der Zuordnung nicht den alten Eintrag liefern.

Grenzen und Dateien wie in Abschnitt 5; zusätzlich darf `http.mjs` **nicht** geändert werden. Bericht als Abschnitt „N1“ an die Ergebnisdatei anhängen, `STATUS.md` oben ergänzen.
