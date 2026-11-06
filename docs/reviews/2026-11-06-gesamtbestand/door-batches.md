# PR186 – Edelstahl-/Acryl-Türschilder: lokale Stapelübergabe

**Stand 06.11.2026:** Alle zehn Stapel sind lokal erzeugt und geprüft. **Chris hat mit „Ja, private Galerie jetzt umschalten“ den Wechsel genehmigt; Site 19 läuft nach Umschaltung und App-Neustart auf `267d46e4`.** Pilot (28 Originale/146 Zielstände) und Andenken (109 Originale/1.926 neue Zielstände) sind damit privat online: zusammen 137 neue Originale, Gesamtstand 462 Originale, 370 nativ bearbeitbar, 2.449 vorbereitete Ziele, 348 Gruppen und 240 Rohlinge. Die neuen Ziele der übrigen neun Stapel bleiben lokale Vorbereitung. [Historischer Stagingnachweis](host-stage-proof.json) unverändert; tatsächliche Aktivierungsbelege in [door-batches.json](door-batches.json).

53/53 lesende HTTPS-Prüfungen nach dem Neustart bestanden; Altbestand vor, unmittelbar vor und nach dem Wechsel logisch gleich und stabil zur frischen Snapshotbasis. **Voll-Konfi im tatsächlichen Browser derzeit mit leerem iframe: Fehlerbehebung und Online-Bedienabnahme bleiben offen.** HTTP-Antworten ersetzen keinen Nachweis für funktionierende Bearbeitung/Rückspeicherung. Kein Shopwechsel, keine echte Designfreigabe.

2.503 Originale, davon 2.382 mit vorbereiteten Fassungen und 121 lieferseitig offen. 42.832 neue native Material-/Größenfassungen, 146 referenzierte Pilotziele, 2.639 private Formatgruppen in **32 Paketen mit höchstens 100 Gruppen**. Keine neue Nutzerfreigabe, Shopveröffentlichung oder Fertigungsfreigabe. Andere Materialgruppen sind nicht Bestandteil dieses Nachweises.

| Stapel | Originale | Vorbereitet | Offen | Neue Zielstände | Gruppen | Pakete |
|---|---:|---:|---:|---:|---:|---:|
| Familie | 1.298 | 1.256 | 42 | 22.954 | 479 | 5 |
| Hinweise | 243 | 211 | 32 | 4.470 | 240 | 3 |
| Hausnummern | 182 | 182 | 0 | 2.793 | 240 | 3 |
| Pferde | 181 | 168 | 13 | 2.802 | 240 | 3 |
| Hochzeit | 148 | 148 | 0 | 2.616 | 240 | 3 |
| Andenken | 109 | 109 | 0 | 1.926 | 240 | 3 |
| Firmen | 107 | 94 | 13 | 1.584 | 240 | 3 |
| Willkommen | 99 | 96 | 3 | 1.650 | 240 | 3 |
| Hunde | 68 | 50 | 18 | 897 | 240 | 3 |
| Katzen | 68 | 68 | 0 | 1.140 | 240 | 3 |

**Quellen und Prüfnachweis:** Katalogquelle `3c6051fbbc7904969948950fae12cae2ae663f30`, Lieferung PR184 `86c1ff5f431acfe60d4cff388958112187005550`. Originale SVG/JSON bleiben bytegleich; Themen und ursprüngliche IDs bleiben erhalten. Alle 42.832 neuen Zielstände sowie 118.890 Texte und Anker-/Grundlinienpositionen einschließlich 693 gedrehter Texte bestanden den Abgleich. Prüftoleranzen: Schriftgröße/Zeilenabstand 0,01 mm, Anker/Grundlinie 0,03 mm. Andenken- und Familien-Pakettests jeweils 9/9 ohne Fehler oder Skip.

**Offen und sichtbar:** Insgesamt 2.385 offene Zielstände. 45 zusätzliche native Zielblocker betreffen ausschließlich Familie: 15 überschreiten die native Schriftgrößengrenze, 30 enthalten Motive außerhalb Oval/Kontur. Keine automatische Anpassung der Originale. Beispiel: `TRE-V2A-8x5-D57` / `GR-ES-RE-450X300-T15` überschreitet 100 mm Schriftgröße; `TR1-V2A-9x6-D10` / `GR-ES-RT1-300X200-T15` ragt über die Kontur. Außerdem bleiben 4.793 nicht blockierende Prüfhilfen und 15 Originale mit ausdrücklichem Hinweis „Ersatz unsicher, bitte ansehen“ sichtbar.

**D412-Berichtigung:** Der Hinweis für `TRE-V2A-8x3,5-D412` betrifft eine hauchdünne Kontur von höchstens etwa 0,0393 mm gegenüber 0,3 mm Mindestkontur. Die frühere Formulierung „Motivüberstand“ in [#85/6691208088](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6691208088) war falsch; Code und UI-Hinweis waren korrekt. Keine Veränderung des Originalmotivs.

Für Hausnummern/Pferde/Katzen/Willkommen fehlt eine eigene Unterkategorie in der Acryl-Linie. Galerie-Unterkategorien und Design-Themen bleiben erhalten; der private Produktträger verwendet dort die vorhandene neutrale Kategorie `namensschilder`. Eine spätere Shopzuordnung ist separat zu klären.

**Lastnachweis:** Rehydriertes natives JSON: **20.468.558.785 Bytes = 19.520,34 MiB**, 58 tatsächlich verwendete Schriftressourcen; größtes Dokument 22.391.725 Bytes. Gemessen wurden UTF-8-Bytes des minifizierten Dokument-JSON einschließlich exakt eingebetteter Fonts. Dies ist **keine tatsächliche RAM-, Heap-, RSS- oder SQLite-Messung**. Streaming-Import und begrenzte Dokumentauflösung wurden separat von Root/onlinezugang implementiert und geprüft. Offen bleiben insbesondere Datenbank-Fontduplikation und die vollständige HTML-Galerie; vor dem gesamten Onlineausbau sind Pagination/gezieltes Nachladen zu berücksichtigen.

Die [sanitisierte JSON-Übergabe](door-batches.json) enthält alle zehn vollständigen Zähler, **alle 32 Manifestpfade mit überprüfter SHA256**, sämtliche **45 einzelnen Blocker mit Original-ID/Familie/Größe/Grund**, Prüfwerte je Stapel und Lastwerte. Alle Pfade sind relativ zur Arbeitsbereichwurzel.

Belegdateien:

- `work/design-door-batches-20261106-summary.json` – SHA256 `faddeec3e1388c1b348b0cd7f9751895d0b7db682327812dc315069eae1d98c8`
- `work/design-door-batches-20261106-text-audit.json` – SHA256 `9132f5a8870c6bae506b3c666b5d485bde4cf420038f53677a567eacdbf5761d`
- `work/design-door-batches-20261106-native-json-size.json` – SHA256 `c6930e306044733147a59c61449662d3f7039d1c5b2781ae5e8e399d72867603`

Codebezug: `scripts/prepare-design-batch-review.mjs`, `scripts/lib/design-batch-plan.mjs`, `scripts/prepare-design-batch-review.test.mjs` im Codecheckout `work/gravuru-gesamtbestand-galerie`. Diese Übergabe ändert weder Code noch Paketdaten.
