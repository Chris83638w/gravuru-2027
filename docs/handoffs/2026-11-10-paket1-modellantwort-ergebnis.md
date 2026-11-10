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
