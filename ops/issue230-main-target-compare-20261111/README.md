# Hauptacryl-Kopienvergleich: erhaltene Kategorien

Eng begrenzter Nachtrag zum veröffentlichten Helper `630adcc0ee6dcdbb04e4345452d07604b83f59cb`, vorgesehener Ort weiterhin `ops/issue230-main-target-compare-20261111/`. Kein App-Code geändert. Es bleibt ein **streng lesender Kopienvergleich**, kein Import-/Bindungs-/Freigabewerkzeug.

Neues Ziel erhält die tatsächlichen Kategorien in fester Reihenfolge: `extern-shopifyproductid-16190784602492`, `linie-acryl-tuerschilder`; fonts/motifs/colors/bestsellers bleiben `inherit`. Native Reihenfolge: Standard → Kategorien in Dokumentreihenfolge (letztes nicht-inherit gewinnt) → Produkt. Anschließend Bestsellerfilter auf freigegebene Motivauswahl. Die frühere Default-only-Projektion konnte diesen Fall nicht belegen.

`resolve-main-category-profiles-readonly.mjs` liest nur diese zwei Kategoriezuordnungen und tatsächlich benötigte Profile, alle SQL-Abfragen mandantenbezogen und auf einer `readOnly`/`query_only`-Verbindung. Der gesamte Settings-JSON-Datensatz wird intern gehasht; ausgegeben werden keine vollständigen Bibliothekslisten, Profilnamen, unbeteiligten Kategorien oder Dokumente. Der native Konstruktor wird auf der Kopie **nicht** aufgerufen, da er migrieren könnte. Der Helfer benötigt zusätzlich `--resolver-source`; die Datei muss zur geprüften nativen Quelle passen (reine CRLF→LF-Normalisierung erlaubt), SHA `d3aa96dd7800f3e98bd2706b20bb2a0eb5b47adc9172099547453225e8460e51`.

## Kopienaufruf

Node24. Aus Repo-Wurzel starten. `review_dir` durch den tatsächlichen privaten Prüfpfad ersetzen. Bereits geprüfte eigenständige `*.copy.sqlite`-Sicherungen ohne nichtleere WAL/Journal-Abhängigkeit verwenden; keine Live-Dateien oder Originalbackups verändern. Die kopierten Datenbanken werden weiterhin blockweise vor/nach dem Lesevorgang gehasht. Der bestehende 808er-/778+30-Vergleich und alle bisherigen Pfad-/Mandanten-/Hashgrenzen bleiben erhalten.

Falls die bisherige, geprüfte Label-Preview aus dem ersten Vergleich bereits vorliegt, erzeugt der reine Dateimaterialisierer daraus eine **neue** Metadaten-Preview. Er prüft beide Quellhashes und überschreibt keine Datei:

```sh
review_dir=/ABSOLUTER/PRIVATER/PRUEFPFAD
node docs/reviews/2026-11-11-main-target-preserved-metadata/materialize-metadata-preview.mjs \
  "$review_dir/main-target.preview.json" \
  docs/reviews/2026-11-11-main-target-preserved-metadata/metadata-changes.json \
  "$review_dir/main-target-preserved-metadata.preview.json"

node ops/issue230-main-target-compare-20261111/compare-main-target-copy.mjs \
  --copy "$review_dir/workshop.copy.sqlite" \
  --profiles-copy "$review_dir/profiles.copy.sqlite" \
  --mapping docs/reviews/2026-11-11-main-target-preview/variant-mapping.preview.json.gz \
  --target "$review_dir/main-target-preserved-metadata.preview.json" \
  --intent docs/reviews/2026-11-11-main-target-preserved-metadata/update-intent.preview.json \
  --resolver-source app/workshop/profile-library.mjs \
  --tenant gravuru > "$review_dir/main-target-category-comparison.json"
```

Die ausdrücklich nachgewiesene alte Single-Store-Schemaform benötigt wie bisher zusätzlich `--legacy-single-store true`; bei modernen tenant_id-Tabellen muss es fehlen. Keine automatische Schemawahl. Ohne Profilkopie ist die Ressourcenaussage ausdrücklich ungeprüft. Fehlender/falscher Resolverquellhash, falsche Kategorien/Reihenfolge, geänderte Produktzuordnungen, fremde Profile oder fehlende Zuordnungsköpfe werden abgewiesen. CLI-Produkt-/Hashpins bleiben fest und besitzen keine Override-Argumente.

## Exakte neue Pins und Ergebnis

- Ziel-Produktgruppen-/Transporthash: `ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407`.
- Ziel-ID-Binding-Hash: `f0bb7d95e89e3aae66ab04454d6476132fe197aaae7c1da48ce8209ced62d285`.
- Neue Intent-Dateibytes: `fcfddddeae4a188ef980a67912e247d85bb42b46c1d4836de669207b01b2282b`.
- Unveränderte Mapping-**dekomprimierte JSON-Bytes**: `3d476d9d964158c1f96a9e55b5de5a2cfa36afd8b5d3bcd86313c12be2c77591`; deren **Gzip-Dateibytes** haben separat SHA `3d0647b2cb671ba09199b6f9c4b9cdbfa58f24a0eafb1d2d672a18823070c9bf`. Diese Verfahren nicht vertauschen.
- Tatsächliche cfg-/Rev1-/Bindingpins unverändert aus630adcc. Keine native Produkt- oder Profilrevision wurde hier erstellt.

Benötigte kompakte Rückgabe: `resourceProfiles.categoryEvidence` einschließlich `categoryAssignments`, `settingsPin`, `profilePins`, `defaultsOnly.snapshot`, `withCategories.snapshot`, `categoryChangesSelections`, `categoryChangesSources`, plus `copyEvidence`, `issues` und `pending`. Leere Änderungslisten belegen **gesondert**, dass die Kategorien auf dieser Kopie weder die Auswahl noch ihre Quelle ändern. Andernfalls stehen die betroffenen Ressourcenarten und exakten Herkunftspins im Ergebnis. Gleicher Auswahlinhalt allein ist keine gleiche Quelle.

`resourceProfiles.expectedLocalV9` bleibt aus Kompatibilitätsgründen benannt wie bisher: Das ist ausschließlich der **historische lokale v9-Stand ohne Kategorien**, kein vorgegebenes Soll der echten Kategorien. Der neue Intent markiert diese Herkunft ausdrücklich und bleibt `targetResolutionVerified:false`. Aktuelle Kategorieauflösung und tatsächliche gespeicherte Rev1-Metadaten (`target.actualStoredProfiles`, jetzt mit categoryId) werden getrennt ausgewiesen. `readyForImport:false` bleibt zwingend. Katalogmitgliedschaft und reale Font-/SVG-Verfügbarkeit bleiben native Laufzeitprüfung (`catalogAvailabilityValidated:false`), keine verdeckte Freigabe durch SQL.

## Geprüft

14/14 synthetische Tests bestanden, darunter native `createProfileLibrary().resolve()` als Vergleichsinstanz **ausschließlich auf neu erzeugten Testdateien**. Geprüft: Override-Reihenfolge, inherit/empty/fehlend, gleiche Auswahl mit anderer Quelle, Bestsellerfilter, Source-Hash, falsche Reihenfolge/Mandant/Profiltyp, Kopien-Bytes unverändert und bisherige vollständige808er-Prüfung. `tests.txt` ist der tatsächliche Lauf. `artifact-pin-check.json` bestätigt zusätzlich die echten neuen Datei-/Zielpins rein aus den gelieferten Artefakten, ohne eine echte Datenbank zu öffnen.

Nach Ablage am vorgesehenen Repositorypfad:

```sh
node --test ops/issue230-main-target-compare-20261111/compare-main-target-copy.test.mjs \
  ops/issue230-main-target-compare-20261111/resolve-main-category-profiles-readonly.test.mjs
```

Bei abweichendem Scratch-Ort den vorhandenen Code explizit über `GRAVURU_COMPARE_CODE_ROOT=/ABSOLUTER/REPOPFAD` angeben. Es ist kein lokaler Codex-Pfad fest eingebaut. Kein Server- oder Kopienlauf auf echten Daten wurde von diesem Agenten ausgeführt; diese konkrete Kategoriebelegung bleibt bis zu Claudes Ergebnis offen.
