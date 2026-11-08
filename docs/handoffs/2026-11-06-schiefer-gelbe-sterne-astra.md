# Korrektur: gelbe Sterne gehören zum Druck

Chris präzisierte die falschen Gravurzuordnungen am 06.11.2026 mit **„mit gelben sternen“**. Die Originalvorschauen bestätigen zwei Fälle:

| Unveränderte Design-ID | Name | Bisherige Quellangabe | Korrigierte Zuordnung |
| --- | --- | --- | --- |
| GTSK-S-30x20-D2 | Tabea | Gravur | UV-Druck |
| GTSK-S-30x20-D4 | Lara | Gravur | UV-Druck |

Die vorige Aussage „kein farbiger Gravurtreffer“ war zu weitgehend. Der erste Scan nutzte eine Farbflächen-Schwelle von 0,8 Prozent und übersah die kleinen gelben Sterne (gezielte Gelbflächenprüfung: etwa 0,177 bzw. 0,336 Prozent). Maßgeblich ist hier die visuelle Prüfung zusammen mit Chris' Aussage. Keine automatische Verfahrensentscheidung aus einem Schwellenwert.

Die beiden IDs sind im aktuellen Paket und in der lokalen Galerie **UV-Druck**. Katalogoriginale und IDs bleiben bytegleich/unverändert. Die Korrektur ist mit Original-Vorschauhash und Chris' Aussage in `scripts/data/slate-process-corrections-20261106.json` gebunden; die native Vorbereitung verwendet sie automatisch. Die gelben Sterne werden nicht als weiße Gravur umgewandelt. Beide Designs waren schon vorher wegen fehlender Schriften/Emoji-Zeichen offen und bleiben bis zur originalgetreuen Druckaufbereitung offen. Sie haben keine importierten nativen Produktvorlagen, die umgestellt werden müssten.

## Aktueller Stand

180 Originale: **154 Gravur, 26 UV-Druck**. Weiterhin 144 in beiden Größen vorbereitet, 289 Größenfassungen, 28 lokale Gruppen. Offen: 10 Gravur und 26 Druck, zusammen 36. 0 Bildfreigaben.

Ausgangspunkt ist weiterhin der Katalogcommit `dc0a0f6c2d59a93cbe2727709e0657e5d1697b06`. Seine beiden falschen `process`-Angaben wurden nicht im unveränderten Rohoriginal überschrieben. Claude erhält die konkreten IDs in #85 zur Korrektur des Katalogs und seiner Ableitungen. Die bisherige Übergabe zu Fotos/Editor bleibt für die übrigen Funktionen gültig, ihre Verfahrenszahlen und Fehlzuordnungs-Aussage sind durch diesen Nachtrag ersetzt.

Lokale Dateien relativ zu `C:/Users/Christopher Koch/Documents/ChatGPT/Shopify Import/`:

- Vorbereitung: `work/slate-original-preparation-v4-drucksterne`.
- Neues unveränderliches Paket: `work/slate-original-package-v4-drucksterne`.
- Bearbeitbare Daten bleiben unverändert in `work/slate-original-review-v3` (kein erneuter Import, bestehende Änderungen bleiben erhalten).
- Galerie: http://127.0.0.1:8996/originale/ → Thema **Sternenkinder**, Verfahren **UV-Druck** zeigt genau die beiden Vorlagen.
- Manifest SHA256: `8914ccc84c9b0adb6749ca150834453721df9d7bb00cb813a98ce9e57f09e24e`.

## Prüfung und Reproduktion

5 gezielte Tests bestanden: wiederholbare Korrektur, Eingabeschutz, Ablehnung veränderter Belege oder bereits vorbereiteter/importierter Designs, Galerieziele und offener Druckstatus. Alle 1.879 Paketdateihashes geprüft. Die 28 nativen Produktdefinitionen und 118 Ressourcen sind identisch zum vorigen Paket; 617 Originaldateien bytegleich, 144 Größenpaare/867 Objekte maßhaltig, 28 Rücklesevergleiche bestanden. Browserfilter bestätigt genau D2 und D4 als Druck. Keine neue Bildfreigabe; kein Gesamtlauf für diese Metadatenkorrektur nötig.

Für eine bestehende Vorbereitung zuerst einen neuen Ausgabeordner als Kopie erstellen, dann:

```powershell
node scripts/correct-slate-processes.mjs --data <neue-Vorbereitung>
node scripts/audit-slate-originals.mjs --katalog ../gravuru-schiefer-originalquellen --data <neue-Vorbereitung>
node scripts/package-slate-originals.mjs --data <neue-Vorbereitung> --out <neuer-Paketordner>
node scripts/serve-slate-review.mjs --data ../slate-original-review-v3 --gallery <neuer-Paketordner> --port 8996
```

Bei vollständiger neuer Vorbereitung wendet `prepare-slate-originals.mjs` dieselben geprüften Korrekturen direkt auf das Quellinventar an. Die Korrektur von schon vorbereiteten Designs wird absichtlich abgelehnt und benötigt eine ausdrückliche Migration; hier sind beide Ziele noch offen.

Eigener Branch/PR #180. Kein main-Merge, Hostimport, Shopify-Schreibzugriff oder Livegang.
