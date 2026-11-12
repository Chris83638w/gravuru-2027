# Sechs-DRAFT-Kopienanschluss und aktive App-Version

Reiner Dokumentationsnachtrag vom 12.11.2026. [Unabhängiger Review](six-host-and-active-version-review.md), [lokale Datei-/Quellprüfungen](six-host-and-active-version-review.checks.json), [Empfangsmanifest](receipt-manifest.json).

`received/` enthält genau die fünf unverändert erhaltenen Dateien aus `dev/claude-db-sicherung-20261111@041527dd`, `ops/plesk/sechsdraft-20261112/` und `ops/plesk/versionsbeleg-20261112/`. Quelle ist [#1686821399022](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6821399022). Bytezahl und SHA256 stehen im Manifest; `.gitattributes` verhindert Zeilenendenkonvertierung. Der darin archivierte `sd-lauf.mjs` ist ausschließlich gelesene Belegquelle und wurde hier nicht ausgeführt.

Der Operator meldet 15/15 Bedingungen des echten nativen Serverkopienanschlusses. Die unabhängige Prüfung umfasste 16/16 Datei-/Quell-/Zählerchecks, keine erneuten Servertests. Die aktive Releaseversion ist als aktueller Operator-Dashboard-Seitentext belegt. Voller TESTBELEG, JSONL und Paketcontainer sind nicht geliefert; ihre berichteten Pins werden nicht als eigene Byteprüfung ausgegeben. Die Datei `aktive-appversion-lesebeleg.json` hat keinen zusätzlichen mitgelieferten Upstream-Prüfsummeneintrag; ihr Empfangshash wird hier lediglich festgehalten.

## Reine lokale Reproduktion

`review-six-host-files.mjs` liest ausschließlich Dateien und vier `git show f85390b:<path>`-Blobs. Keine Appimports, DB-Konstruktoren oder Netzaufrufe. Es schreibt nur eine neue ausdrücklich benannte Ergebnisdatei mit `wx`; die archivierte Checksdatei bleibt unverändert.

```text
node docs/reviews/2026-11-12-six-host-observation/review-six-host-files.mjs /ABS/NEUE-Pruefung.json
```

Voraussetzung: vollständiger Repositorycheckout mit `f85390b`, den in Git gelieferten sechs Kopienakten und den Operatorpaketen. Optional verweist `GRAVURU_REVIEW_REPO` auf einen solchen Checkout. Quellen unter `received/` bleiben relativ zum Skript. Gegenüber der ursprünglich gelaufenen Workspacefassung wurden ausschließlich diese Eingangs-/Ausgangspfade portabel gemacht; Prüfalgorithmus und Inhalte sind identisch. Keine Wiederholung beim Archivieren; Herkunfts- und Skripthashes stehen im Empfangsmanifest.

Diese Unterlagen erteilen keine Produktzustimmung. Kopien-IDs und synthetische Shopify-/Testzustimmungen sind nicht produktiv verwendbar. Die archivierten unabhängigen Reviews bleiben auf ihrem damaligen Stand unverändert. Inzwischen ist der separate Main-v2-Kopienlauf unter [#1686821759961](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6821759961), `4aa14410`, geliefert: laut Operator 20/20 mit echter Factory, synthetischem Shopify und TEST-Functionbeleg; sein unabhängiger Review läuft gesondert. Praktische Exklusivität und konkrete automatische frische Function-Beobachtung sind noch offen. Die manuelle Versionsbeobachtung ersetzt keinen laufenden Frischecallback.
