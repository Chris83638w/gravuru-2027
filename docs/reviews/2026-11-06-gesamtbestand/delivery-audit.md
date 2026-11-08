# Unabhängige Lieferprüfung Gesamtbestand

Die Byte- und Strukturprüfung ist bestanden. Das ist **keine Gestaltungs-, Import- oder Shopfreigabe**. Es wurden keine Datenbankprodukte angelegt, keine Freigaben gesetzt und keine Katalogquellen geändert.

- Katalog-PR [#184](https://github.com/Chris83638w/gravuru-katalog./pull/184), Lieferung `86c1ff5f431acfe60d4cff388958112187005550`.
- Unveränderte Quelldaten: `3c6051fbbc7904969948950fae12cae2ae663f30`; die Git-Differenz enthält ausschließlich neue Dateien unter `auftraege/2026-11-06-gesamtbestand/`.
- Auftrag: [Claude in #85](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6688988751).
- Maschinenlesbare Zusammenfassung: [delivery-audit.json](delivery-audit.json).

## Verifizierter Umfang

| Prüfung | Ergebnis |
|---|---:|
| Dateien gegen gelieferten SHA-256 **und** gepinnten Git-Blob | 55.293 / 55.293 identisch |
| Zusätzliche Adapterquellen gegen Git | 17 Familien-JSON, 15 Linien-JSON und Hashindex selbst identisch |
| Stapel | 219: 27 Master, 192 Bestand |
| Register-IDs | 20.598 |
| Tatsächliche Designlieferungen | 19.533: 9.743 Master + 9.790 Bestand |
| Bestandseinträge nur als Verweis auf Master | 1.065 |
| Designversion SHA-256(SVG + JSON) | 19.450 / 19.450 identisch |
| Designs ohne SVG | 83, weiterhin offen |
| Unterschiedliche Rohlinge | 1.147 |
| Dry-runs | 219 Stapel + 1 zentrales Rohlingmanifest, IDs und Zähler konsistent |
| Eigenständige Prüftests | 7 bestanden, 0 fehlgeschlagen |

Die 88 zunächst nicht ausgecheckten Dateien (`motive/hunderassen`, `schneidvorlagen/grabstecker`) wurden anschließend aus demselben Commit ergänzt und vollständig mitgeprüft. Das war eine lokale Checkout-Lücke, kein Lieferfehler.

IDs sind eindeutig; alle 1.065 Masterverweise lösen auf. Registerzustände, Dateireferenzen, Dateigrößen, Rohlingversionen und Zielmaße stimmen mit den jeweiligen Manifesten überein. Mehrfachthemen erzeugen keine zusätzlichen Original-IDs. Die 28 Pilotmaster sind Teil des Gesamtbestands und dürfen beim späteren Import nicht erneut als neue Originale angelegt werden.

Die **583** unvollständigen Rohlingseinträge in der Liefer-README sind wiederholte Auftritte: 386 in den Stapelläufen plus 197 im zentralen Rohlinglauf. Es handelt sich um **197 unterschiedliche Rohlinge**, nicht 583 verschiedene Rohlinge. Der zentrale Lauf deckt zusätzlich 30 Rohlinge ab, die in keinem Stapel vorkommen. Insgesamt meldet er 950 neue und 197 unvollständige Rohlinge; ein Dry-run-Status „neu“ ist keine native Bearbeitbarkeits- oder Materialfreigabe.

## Konkrete offene Nachweise

1. **Zentrale Sicherheitsbewertung der Ersatzschriften fehlt.** `werkzeug/lib10.py` liest neben `ersatz-alle.json` die Datei `F-schriften-ersatz/ergebnis.json`. Diese zweite Datei ist nicht geliefert. Die 281 Einträge in `_details` enthalten 149 × `h`, 32 × `m`, 100 × `n`; diese Einstufung reicht nicht aus, um die behaupteten 151 sicheren / 129 unsicheren / 1 offenen Ersetzungen zu reproduzieren. Der Generator berücksichtigt zusätzlich Breiten- und Echttests. In den einzelnen Designmanifesten sind 1.509 explizite Unsicher-Befunde an 1.433 Designs mit 126 unterschiedlichen Originalschriftnamen vorhanden. Beispiele: `TQ-V2A-8x8-D14` und `TO-V2A-9x6-D38`. Diese Warnungen müssen sichtbar übernommen werden. Die Differenz 126/129 darf ohne die fehlende Tabelle weder als Freigabe noch als Beweis verlorener Warnungen interpretiert werden. Welcome/ParmaPetit bleiben gemäß Auftrag gesperrt.
2. **Historische Einpassungsverhältnisse fehlen teilweise bewusst.** 462 Textbefunde an 182 Designs enthalten `faktor: null` mit dem ausdrücklichen Hinweis, dass die Änderung bereits im Master angewandt wurde und das ursprüngliche Verhältnis nicht dokumentiert ist. Beispiele: `TRE-V2A-8x3,5-D21`, `TRE-V2A-8x3,5-D34`, `TRE-V2A-8x5-D14`. Das ist eine dokumentierte Nachweislücke; der gelieferte Textstand bleibt unverändert. Kein Faktor wird geraten oder erneut angewandt.

Weitere bisher deklarierte Blocker und Hinweise werden nicht beseitigt: Fotos/UV, 1.563 als vorbereitet klassifizierte Umbauten, 2.729 Umbenennungen, fehlende Familien/Rohlinge, Rendererbefunde, Originalnachweise und unklare Kategorien bleiben sichtbar. Zwei zusätzliche bereits offene Datensätze sind ebenfalls als Umbau klassifiziert; deshalb enthält die technische Hold-Liste 1.565 Umbau-IDs, während der vorbereitete Umbauzustand korrekt 1.563 zählt. Die endgültige Unterkategorienliste des Nutzers fehlt; es gibt keine belastbare globale Soll-Abdeckung.

## Vertrag für die anschließende Übernahme

- Original-ID und Herkunft erhalten. Bestandseinträge `verweiseAufMaster` verbinden und nicht duplizieren. Quellenfreigaben ausschließlich als historische `sourceApproval` führen; jeder neue Zielstand beginnt ungeprüft und unveröffentlicht.
- Material/Familie/Format aus `ziele[]`, `groessenMm` und den dazugehörigen Familienquellen übernehmen. `format.groessen` beschreibt die Quellreihe und ersetzt die materialabhängigen Zielschlüssel nicht. Keine Maße, Dicke, Lochbilder oder Produktprofile erfinden.
- Der globale Lieferhashindex umfasst keine Familien-/Linien-JSON. Deren zusätzliche gepinnte Git- und SHA-256-Nachweise stehen in `delivery-audit.json` unter `additionalAdapterSources`.
- Texte, Motive, Fotoebenen, Themen und alle Befunde aus den Quellen erhalten. Bereits angewandte Texteinpassung nicht nochmals ausführen. Rohlinge getrennt von Designvorlagen führen.
- Reihenfolge gemäß Auftrag: Türschilder Edelstahl/Acryl (`1-*`), danach `2-*`/`3-*`, weitere Mastergruppen und Bestand. Innerhalb der Galerie: Material → Produktart → Thema → Foto → Format → Original-ID.
- Die leeren Claude-Testablagen beweisen **keine Konfliktfreiheit mit vorhandenen Galerieprodukten, Kommentaren oder Freigaben**. Der echte additive Import und sein Erhaltsnachweis sind ein getrennter Prüfschritt.

## Wiederholung und Nachweise

```powershell
node scripts/audit-design-batch-delivery.mjs --katalog ../gravuru-gesamtbestand-quellen --out ../gesamtbestand-delivery-audit-neuer-lauf
node --test scripts/audit-design-batch-delivery.test.mjs
```

Das Ausgabeverzeichnis muss neu sein. Der Prüfer schreibt nur dort und nutzt keinen Importer. Git-Baumprüfungen haben Lazy-Fetch deaktiviert; fehlende Sparse-Dateien werden als ungeprüft ausgewiesen, niemals als erfolgreich umgangen.

Rohnachweise außerhalb Git: `work/gesamtbestand-delivery-audit-20261106-v2/`.

- `audit.json`: `d6206f00607629eaffd9b43c477677ef3bec66c2567920c72cfe4566e1496dfb`
- `file-verification.json`: `ce366bd2ab8b2588bc058373871d6af90820054381f3fe26055dd51426903638`
- Gelieferter Hashindex: `5f050d4994913ef1ef3e2d0393e7881476a727548b376a866bc101e424882311`

Der Bericht enthält keine Kundentexte, Kommentartexte oder übernommenen Freigabeereignisse. Native Rendererparität und visuelle Freigaben wurden durch diesen Lieferaudit nicht geprüft.
