# Privater Hauptacryl-Zielvergleich auf gesicherten Kopien

Zielpfad im Repository: `ops/issue230-main-target-compare-20261111/`. Nur lesen. Keine normalen Workshop-/Profil-Konstruktoren, keine Migration, kein Serverstart, kein Import, keine Bestätigung, keine Zuordnungsaktivierung, kein Netzwerk-/Shopify-Aufruf. Der beigefügte `copy-guard.mjs` ist bytegleich zum bestehenden Operatorwerkzeug (`466ffb3e96fa8bcc2b569a3069abe7ea4ca00a856fae9a8cc65ac186b39a1671`).

Das Werkzeug vergleicht die gesicherte echte cfg-Revision 1 und alle 808 aktiven Bindungen mit dem unabhängig geprüften 778+30-Preview. Es gibt ausschließlich technische IDs, Revisionen, Hashes, Anzahlen und vollständige Options-/Preisdifferenzen aus. Vollständige Dokumente, SVG/Font-Ressourcen, beliebige Metadaten- oder Preisvertragsinhalte, Bestellungen, Kundendaten und Tokens werden nicht ausgegeben. Die Ergebnisdatei bleibt zunächst im privaten Prüfverzeichnis; nur die kompakte Ergebnisantwort ist zur Abstimmung vorgesehen.

## Einmalige Vorbereitung des bereits geprüften Zielmodells

Node 24 mit `node:sqlite`; aus dem Repositoryverzeichnis aufrufen. `review_dir` durch den **tatsächlichen privaten Prüfpfad** ersetzen. `workshop.copy.sqlite` und `profiles.copy.sqlite` müssen bereits erstellte, konsistente, eigenständige Sicherungskopien desselben Stores/Mandanten sein. Kein Kopieren einer laufenden SQLite-Datei mit weggeworfener WAL-Datei; das Werkzeug lehnt nichtleere WAL-/Journal-Abhängigkeiten ab. Bekannte Live-Datenordner und verlinkte Dateien sind ausgeschlossen. Der Prüfstand selbst erzeugt keine Sicherungskopie.

```sh
review_dir=/ABSOLUTER/PFAD/ZUM/PRIVATEN/PRUEFORDNER
node docs/reviews/2026-11-11-main-target-preview/materialize-label-preview.mjs \
  docs/reviews/2026-11-11-issue230-native-plans-v9/transport/Tuerschild-Acrylglas-3mm_v4/plan.json.gz \
  docs/reviews/2026-11-11-main-target-preview/label-changes.json \
  "$review_dir/main-target.preview.json"
```

Der Materialisierer schreibt ausschließlich eine **neue** Datei (`wx`) und prüft den eingefrorenen Quellplan sowie beide nativen Dokumenthash-Verfahren. Wenn diese Datei schon vorhanden ist, den vorhandenen Beleg prüfen oder einen neuen Dateinamen benutzen; kein blindes Überschreiben.

## Genau ein lesender Vergleichsaufruf

```sh
node ops/issue230-main-target-compare-20261111/compare-main-target-copy.mjs \
  --copy "$review_dir/workshop.copy.sqlite" \
  --profiles-copy "$review_dir/profiles.copy.sqlite" \
  --mapping docs/reviews/2026-11-11-main-target-preview/variant-mapping.preview.json.gz \
  --target "$review_dir/main-target.preview.json" \
  --intent docs/reviews/2026-11-11-main-target-preview/update-intent.preview.json \
  --tenant gravuru \
  > "$review_dir/main-target-comparison.json"
```

`gravuru` muss der tatsächlich festgestellte Mandant sein. Der Legacyfall ohne `tenant_id` in den vier nativen Produkt-/Bindungstabellen wird **nicht automatisch** gewählt. Nur wenn die gesicherte Quelle ausdrücklich der bestehende einzelne Gravuru-Store ist, `--legacy-single-store true` ergänzen. Dieser Weg lehnt jeden anderen Mandanten ab und meldet `productScope:explicit-single-store-gravuru-legacy`. Für ein modernes mandantenbezogenes Schema muss das Flag fehlen. Gemischte oder unbekannte Schemata werden abgewiesen; es findet keine Migration statt.

Ohne `--profiles-copy` kann der 808er-Bindungsvergleich laufen; die tatsächliche Profilauflösung wird dann ausdrücklich als ungeprüft gemeldet. Für den vollständigen angeforderten Rückbeleg die echte `profiles.sqlite`-Sicherung desselben Prüfstands bereitstellen. Diese Datei enthält Ressourcenbibliothek und Fertigungsprofile; die cmp-Modulprofile liegen in der Workshopkopie.

## Feste Prüfgegenstände und Hashverfahren

- Tatsächliches Produkt `cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0@1`, Store acryl, Shop gravuru-design.myshopify.com, Produkt `16190784602492`, 808 aktive Zuordnungen; derzeit erwartet Zuordnungsrevision 1.
- Erwarteter tatsächlicher Rev1-**ID-Binding**-Hash: `d2886e119ea9715af2b8905ebab8ecc1d199b07f8653476ce5e0fa26cd8cca79`.
- Ziel-**Produktgruppen**-Hash: `2da2130230341917f7a99d2a12889c1e2f10e408f64d3532e9c5ea6bae65713c`.
- Ziel-**ID-Binding**-Hash: `deb2ce71bf57d5ff85e5f186378d94f58edeecc1ce4d7c4151bebf6e8072886f`.
- Zusätzlich SHA der unveränderten SQL-JSON-Bytes für die Katalogfreigabe. Die unterschiedlichen Hashverfahren werden nicht angeglichen. Numerische Font-Schlüssel sind der belegte Grund ihrer Abweichung.
- Mapping und Intent sind als exakte Dateibytes gepinnt. Die CLI besitzt keine Argumente, die Produkt-, Hash- oder Mengengrenzen überschreiben. Kein HEAD==af6-Guard: Die geprüfte Produktbasis bleibt af6; ein nachfolgender Start-/Dokumentationsfix wie a038 ändert diese Datenpins nicht.

Die vollständigen 778 Zieloptionen und Preise stammen aus der bereits nativ geprüften Mappingdatei; der Helfer berechnet keine eigenen Preise. Die 30 erhaltenen Optionen werden über **eindeutige exakte** Shop-Auswahltexte gegen das tatsächliche alte Dokument geprüft; Mehrdeutigkeiten bleiben Fehler. Für sie wird kein neuer Sollpreis erfunden. Alle 808 vorhandenen nativen Stückpreise werden zusätzlich gegen den bestehenden vollständigen Shopify-Lesebeleg geprüft.

Aktuelle Ressourcenprofile werden nur für den konkreten bekannten Hauptschnitt projiziert: keine Kategorien, viermal `inherit`, daher aktuelle Standardzuordnungen. Andere Schnitte werden abgewiesen. Profil-IDs, Revisionen, Auswahlzahlen/-hashes und Abweichungen werden ausgegeben, keine Motiv-/Schriftlisten. Fertigung enthält tatsächlichen Dokumentverweis und den gespeicherten Metadatenpin `{id,revision,sha256}` getrennt. Personalisierung zeigt tatsächliche Aufpreise, `motifCharge`, Staffel-, Modul- und Optionspins; null bleibt ausdrücklich null. Das ersetzt keine native Laufzeit-/Maschinenabnahme.

## Erwartete minimale Rückgabe

Claude kann direkt die ausgegebene kompakte JSON-Datei bereitstellen. Benötigt werden insbesondere:

- `copyEvidence` (Sicherungsnamen, SHA, unverändert) und `target` (Kopf/Status, drei Hashverfahren, Feldhash-Differenzen);
- `coverage`, `activeGroups`, Hash der vollständigen technischen Tabelle und **alle** `deltas`;
- `moduleProfile`, `resourceProfiles`, `productionProfile`, Personalisierungsgruppen und vorhandener Katalogfreigabepin;
- `issues` und `pending` auch dann vollständig, wenn die anderen Vergleiche bestanden sind.

`comparisonCompleted:true` bedeutet nur, dass der Lesevergleich abgeschlossen ist. `identityAndCoveragePassed` betrifft Identität und Vollständigkeit, **nicht** die Übereinstimmung aller Preise/Profile; dafür die eigenen Zähler/Deltas lesen. `readyForImport` bleibt immer **false**. Ein Exitcode 0 ist somit kein Import-/Veröffentlichungsbeleg. Bei Schema-/Datei-/Pinfehlern: Exitcode 1, `comparisonCompleted:false`, konkreter Fehler, keine automatische Anpassung.

Eine Produktionskopie von 4,35 GB wird beim Vorher-/Nachher-Dateihash in festen **1-MiB-Blöcken** gelesen; kein Vollpuffer. `fd` wird im `finally` geschlossen. Der gesamte Vorgang braucht entsprechend zweimal die sequenzielle Dateilesezeit; eine lange Hashphase ist kein Anlass, den Prozess als Import zu behandeln oder weitere Serverprozesse zu starten. JSON des gezielt gelesenen Produktstands wird weiterhin im Speicher geparst; komplette Datenbankbytes werden nie gepuffert.

## Geprüfter Umfang

`node --test ops/issue230-main-target-compare-20261111/compare-main-target-copy.test.mjs`

**9/9 gezielte synthetische Tests grün**, 0 übersprungen. Voller 808er-Test mit 778+30, 138×30/20×10 Cent Abweichung, alle Optionen, Modul-/Ressourcenpins und Kataloghash; keine geheimen Modell-/Metadaten-/Vertragstexte im Ergebnis; DB-Bytes unverändert. Zusätzlich falsche/mangelnde/zusätzliche IDs/Köpfe/Optionen, Pin- und Schemaabweichungen, fehlende Profilkopie, WAL-/Dateipfadgrenzen, explizite Legacygrenze, gespeicherter Fertigungspin/motifCharge, Standardprofilfilter sowie blockweises Hashen über mehrere Blockgrenzen.

Diese lokalen Tests liefen auf Windows/Node 24. Es wurde **keine 4-GB-Testdatei** erzeugt und noch keine echte Serverkopie verglichen. Der nächste Nachweis ist genau der private Leseaufruf oben. Keine zusätzliche App-Testserie oder Runtimeänderung erforderlich.
