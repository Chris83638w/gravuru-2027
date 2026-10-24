# Paket E: shop-sync offline vorbereitet · 24.10.2026

Stand: Code-main `1a52b7f3150ff45fa09d253481832f836b02e86d` (B+C gemerged), Katalog-main `b05b09529d4c6ab61cd4612352978e687106f32c`.
Auftrag: „… bereite für Paket E das shop-sync-Dry-run-Skript auf dem Katalogstand vor – ohne Live-Zugriff.“
Eigener Branch: `dev/shop-sync-offline-20261024-astra`. Paket D und die Durchführung von E bleiben bei Claude.

## Fertig

`scripts/shop-sync-dry-run.mjs` nutzt die bestehenden `targetsForLine`-/`planShopSync`-Funktionen. Keine zweite Preis-, SKU- oder Befestigungslogik. Bestehende Shop-Skripte unverändert.

- Ohne lokalen Export: Katalog-Vorprüfung; `plan:null`, **keine ermittelten create/update/unverändert/konflikt-Zähler**.
- Mit lokalem Export: derselbe Shop-Planer mit echten Freigaberegeln; Plan plus verständlicher Bericht. Teilexporte ausdrücklich markiert, keine Neuanlage aus fehlenden Teilexport-Treffern.
- Kein Client wird erzeugt, keine Zugangsdaten gelesen. Keine Optionen für `--apply`, `--create`, `--alle-designs`, `--daten-aktualisieren` oder frei durchgereichte Argumente.
- Ausgaben nur in einem **neuen Ordner außerhalb des Katalogs**: `bericht.md`, `bericht.json`, mit Export zusätzlich `plan.json`. Quellen- und Exportprüfsummen im Bericht.
- Exit 0 bedeutet „Bericht erstellt“, keine fachliche Freigabe. Fehlende, falsche oder unvollständig strukturierte Exporte und unbekannte Optionen brechen mit Exit 1 ab.

## Tatsächlich ausgeführte Katalog-Vorprüfung

```text
node --max-old-space-size=2048 scripts/shop-sync-dry-run.mjs --katalog ../gravuru-katalog --linie edelstahl-tuerschilder --out ../reports/paket-e-offline-20261024
```

| Größe | Ergebnis |
| --- | ---: |
| Hauptprodukte / Hauptprodukt-Größen | 104 / 104 |
| Soll-Varianten | 530 |
| Katalogeinträge mit / ohne Shopify-Produkt-ID | 104 / 0 |
| Unterschiedliche Startdesigns | 102 |
| Ziele mit freigegebenem Startdesign | 0 |
| Ziele mit offenen Planervoraussetzungen | 104 |
| Ziele ohne offene Planervoraussetzungen | 0 |

Alle 104 Ziele: Startdesign nicht freigegeben. Zusätzlich Grundpreis offen bei `7000000` und `7100000` (Retro 2, 12 × 8 cm). Keine Freigaben gesetzt, keine Preise geändert.
Die 104 hinterlegten Shopify-IDs sind Katalogangaben, **kein frisch geprüfter Shopbestand**. Der bestehende Planer ordnet Shop-Produkte anhand von SKUs zu.
Paket G ist nach seinem Auswahlkriterium „ohne shopifyProductId“ auf diesem Katalogstand leer (0 Hauptprodukte); deshalb kein Matrixify-Paket erzeugt.

Bericht: [Markdown](2026-10-24-paket-e-offline-belege/bericht.md), [JSON mit Einzelgründen und Quellenprüfsummen](2026-10-24-paket-e-offline-belege/bericht.json).
865 tatsächlich vom Katalogleser/Planer gelesene JSON-/SVG-Dateien sind Git-Blob-identisch mit Katalog-main; zusätzlich alle 1474 Edelstahl-design.json/design.svg-Dateien geprüft. Die lokale Kopie enthält nicht sämtliche Motive und fremde Designreihen; diese werden für diesen Edelstahl-Abgleich nicht verwendet.
93 vorhandene/ergänzte Code- und Fixture-Dateien entsprechen dem gepinnten Code-main.

## Prüfung

- Neuer Offline-Wrapper: `node --test scripts/shop-sync-dry-run.test.mjs` **9/9 bestanden**, 0 übersprungen. Fetch-Trap mit synthetischen Credentials aktiv; 16 allgemeine ungültige Exportfälle plus fehlende/falsch typisierte SKU, Full-/Teilexport, Freigaben, Planergleichheit, unveränderte Eingaben, Argumente und LF geprüft.
- Unveränderte Bestandssuite: `node --test --test-reporter=tap scripts/shop-sync.test.mjs` mit `TEMP`/`TMP` im Workspace: **8 bestanden, 0 fehlgeschlagen, 1 optionaler historischer Test übersprungen** (dessen lokaler Teilexport fehlt).
- Erster Bestandslauf im Windows-Sandbox-Temp: 7 bestanden, 1 `EPERM` beim Journal-Umbenennen, 1 Skip. Derselbe Mock-Apply-Test einzeln im Workspace-Temp 1/1; vollständiger Bestandslauf dort anschließend 8/8 ausführbare Tests grün. Kein Code-Fix für diesen Umgebungsfehler.
- Belege: [Offline-Tests](2026-10-24-paket-e-offline-belege/offline-tests.tap), [Bestandstests](2026-10-24-paket-e-offline-belege/shop-sync-tests.tap), [Quellprüfung](2026-10-24-paket-e-offline-belege/quellpruefung.json).

Einmaliges unabhängiges Review: ein P2-Befund behoben: fehlendes oder falsch typisiertes SKU-Feld im lokalen Export wird abgelehnt, damit daraus keine falsche Neuanlage entsteht; eigene Regression ergänzt.
Alle neuen/geänderten Textdateien LF. Keine Shopify-/Hostanfrage, kein Katalog-Import-Commit, keine Katalogänderung und kein Merge durch Astra.

## Nächster Schritt für Claude

1. Diesen Code-PR prüfen und mergen. Paket D und Chris’ Designfreigaben weiterführen.
2. Einen **frischen vollständigen** `products.json`-Export gemäß bestehender Paket-E-Übergabe beschaffen; dieser Vorbereitungslauf hat keinen Export angefordert oder verwendet.
3. Mit aktuellem Katalog und lokalem Export, aus dem Code-Repo:

```text
node --max-old-space-size=2048 scripts/shop-sync-dry-run.mjs --katalog <lokaler-katalog> --linie edelstahl-tuerschilder --export <lokaler-export>/products.json --out <neuer-berichtordner>
```

4. Bericht und Einzelgründe prüfen; zusätzlich den **Werkstatt-Import-Dry-run** für Design/Größenzuordnung heranziehen. Die bekannte Zuordnungsprüfung des Imports wird vom Shop-Planer nicht ersetzt.
5. Konkrete create/update/unverändert/offen/konflikt-Zähler Chris vorlegen. Eine Freigabe muss sich auf den dann aktuellen Plan beziehen. Den späteren Schreibablauf ausschließlich nach [Paket-E-Übergabe](2026-10-23-upload-account-edelstahl.md) ausführen.

Kein echter Shop-Abgleich und keine Uploadfähigkeit aus dem aktuellen Katalogbericht abgeleitet. Die noch offenen 12 Retro-/4 Rundpreise sowie Design/Größenzuordnungen bleiben Entscheidungen im Katalog; dieser Lauf betrachtet nur die 104 angebotenen Hauptprodukt-Größen, nicht sämtliche 80 Familiengrößen.
