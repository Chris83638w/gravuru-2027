# Katzenmotive – Nutzernachtrag zu Issue 61

## Verbindliche Anforderung und Quelle

Chris im fortgesetzten Chat am 29.10.2026: **„immer verschiedene Katzen gesichte / Motive“**. Die vorherigen zwölf Layouts mit jeweils demselben Rasseporträt reichen deshalb nicht. Pro Katzenrasse werden zwölf eigenständige Motive gezeichnet und den zwölf Designs zugeordnet. Diese zwölf Motive werden proportional in die bereits beauftragten Größen/Formen übernommen. Ziel: **25 Rassen × zwölf = 300 Katzenmotive** in den bestehenden 6.600 Katzenschildern. Die 1.500 Hundeschilder gehören weiterhin zur Musterstufe aus Nachricht 1.

Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt. Motivwechsel ist hier ausdrücklich vom Nutzer beauftragt; Motive bleiben vollständig, proportional und als eigenständige Ebene lösch-/ersetzbar. Maße, Preise, Texte, Schriften und Freigaben werden durch diesen Nachtrag nicht neu festgelegt.

## Arbeitsstand

Die native Bilderzeugung und Sichtprüfung laufen. Motiv 01 jeder Rasse bleibt das vorhandene eigene Original. 02–12 werden einzeln neu erzeugt, mit anderen Gesichtern, Kopfansichten, Pfoten-/Körperposen und einem Katzenpaar. Keine geometrische Spiegelung oder Rotation des gleichen Porträts als Ersatz für ein neues Motiv. PNG, exakter Prompt und Entstehungs-/Sichtprüfvermerk werden je Motiv erhalten. Bei abweichender tatsächlicher Pose ist der Sichtprüfvermerk maßgeblich.

Die neue Quellzuordnung ist vorbereitet. Fehlende Motive werden niemals stillschweigend durch Motiv 01 ersetzt. Quellbilder und Vektoren müssen pro Rasse zwölf unterschiedliche SHA-256-Werte besitzen; die tatsächliche Unterschiedlichkeit wird zusätzlich visuell beurteilt. Der Generator prüft die vollständigen Quellen vor dem Schreiben der Designs. Die Matrixprüfung fordert auch je Rasse/Form/Größe zwölf unterschiedliche Motivquellen. Auf jedem Kontaktbogen steht die zu genau diesem Design gehörende Motivquelle.

Neue Vektoren: `motive-eigene/rasse-schilder-20261029/varianten/<rasse>/02.svg` bis `12.svg`; Herkunftsindex daneben. Originalbilder und Prompts: `auftraege/rasse-schilder-20261029/portrait-quellen/varianten/<rasse>/`. Allgemeine Kundenbibliothek bleibt unberührt. Alle Ergebnisse weiterhin Entwürfe ohne Stil-/Fertigungsfreigabe.

## Prüfung und Reproduktion

- Vier Regressionstests zur Motivzuordnung bestanden: vollständige Reihenfolge, fehlendes Motiv, doppelte Quelle, veränderte Datei mit veraltetem Hash. Erster Lauf scheiterte nur am nicht beschreibbaren Windows-Temp-Verzeichnis; mit lokalem `TEMP`/`TMP` erfolgreich.
- Syntax der geänderten Generatoren geprüft. End-to-End-Prüfung der neuen 300-Motiv-Fassung und neue Kontaktbögen sind **noch ausstehend**.
- Aktueller Code-main `092303d` mit Merge-Commit `5a37c81` übernommen; beide STATUS-Einträge erhalten. Auf dieser Basis bereits 40/40 Konverter-/Quell-/Rechtetests, 8.100 native Passungen sowie 24 Browseraufnahmen und zwei Bedienprüfungen des Vorgängerstands erfolgreich. Diese Nachweise bestätigen nicht die noch entstehenden neuen Motive.
- Die auf main angelieferten 20 Textdateien mit einer einzelnen CRLF-Schlusszeile sind auf der Platte bytegleich zu HEAD. Git meldet dafür wegen der LF-Attribute Normalisierungsunterschiede; diese fremden Dateien werden nicht in den Motivänderungscommit aufgenommen.

Nach vollständiger Bilderzeugung:

```text
python scripts/vectorize-rasse-portraits.py --sources <neue Originale> --katalog <Katalog> --variants
python scripts/build-rasse-schilder.py --katalog <Katalog>
python scripts/document-rasse-schilder.py --katalog <Katalog>
node scripts/portrait-rasse-schilder.mjs --katalog=<Katalog> --out=<Motivübersichten>
```

Danach nativen Prüfstand, Browseraufnahmen, Kontaktbögen und Katalogbau wie in der [ursprünglichen Übergabe](2026-10-29-rasse-schilder-astra.md) erneuern. `package-rasse-review.py` erhält zusätzlich `--motif-sheets <Motivübersichten>` und lässt nur 300 nachgewiesene Motive zu. Die Galerie bekommt eine eigene Motivansicht. Bestehende Entwurfs-PRs: [Code #71](https://github.com/Chris83638w/gravuru-2027/pull/71), [Katalog #8](https://github.com/Chris83638w/gravuru-katalog./pull/8). Kein Merge nach main und keine Liveaktion.

Nächster Schritt: vollständige Bildserien fertigstellen, alle 6.600 Katzenschilder neu erzeugen, erneut prüfen und diesen Arbeitsstand durch den abgeschlossenen Nachweis ergänzen.
