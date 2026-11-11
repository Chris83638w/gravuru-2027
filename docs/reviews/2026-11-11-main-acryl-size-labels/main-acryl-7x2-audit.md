# Hauptacryl: Audit der Bezeichnung 7 × 2 cm

Stand: 11.11.2026, lokale Quellenprüfung und eigener Shopify-Leseabruf 20:07 UTC / 21:07 MEZ. Anlass: [Claude #168, Kommentar 6805862166](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6805862166). Nur gelesen; Code, Katalog, v8/v9, Excel, Preise, Server und Shopify unverändert.

## Ergebnis und Soll

**Die bestätigte Größe ist 70 × 23,3 mm = 7 × 2,33 cm.** Im eingefrorenen v9-Quelldokument und im kompilierten nativen Plan ist diese Geometrie korrekt. Der angezeigte Text „7 × 2 cm“ stammt bereits verkürzt aus dem Katalog. Er ist kein Beleg einer 70 × 20-mm-Platte. Auch die zehn tatsächlich gelesenen Shopify-SKUs enthalten eindeutig `RE-70X23P3`, obwohl ihre Titel „Rechteck · 7 × 2 cm“ zeigen.

Die Beschriftung soll **„Rechteck · 7 × 2,33 cm“** lauten. Das setzt eine bereits ausdrücklich bestätigte Größe korrekt um und benötigt keine neue Geschäftsentscheidung. Kein Rundungsalgorithmus im aktuellen Konverter ist zu reparieren. Empfohlen ist eine eng begrenzte, vorab vergleichbare **Labelkorrektur am tatsächlichen Zielregister und den zugehörigen Shopify-Auswahlwerten**. Alle vorhandenen IDs, SKUs, Maße, Konturen, Befestigungen und Preise dabei erhalten. v9 bleibt als versiegelter Prüfstand unverändert; eine spätere Zielrevision erhält ihren eigenen Nachweis.

Dieser Audit autorisiert **keine Variantenlöschung**, keine Preisänderung und keine Änderung eines Edelstahlprodukts.

## Historische Bestätigung und Original-Excel

[Chris, 10.11.2026 14:25, vom Operator wortgetreu protokolliert](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6768539445): „7x2,33 gehört zud en skalierbarenb größen“. Derselbe Eintrag präzisiert: bleibt im Hauptprodukt als Rechteck-Reihe 3:1; eigene Kleinprodukte sind nur 5 × 2, 6 × 2 und 8 × 2 cm. Die frühere gegenteilige Lesart des Operators von 14:11 wurde ausdrücklich korrigiert.

[Station 1 v4, Commit bf8824c](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6768691678) setzt dies in 77 Hauptgrößen und 778 Kombinationen um; die zuvor irrtümlich gesonderte 7×2,33-Datei wurde verworfen.

Original `work/product-plans-run-v9/excel/Tuerschild-Acrylglas-3mm_v4.xlsx`, SHA256 `495e7e59d7abf6a46f1fb7098a75e666162e58be3cad99ad75de6db5d3923841`, direkt aus XLSX-XML gelesen:

- `Varianten!A23`: `TS-Acryl-RE-70X23P3-T30`.
- `D23`: „7 × 2,33 cm“; `E23/F23`: 70 / 23.3 mm; `N23`: 3:1.
- `H23/I23`: 7,99 € Grundpreis / 0,00 € fester Zuschlag; `M23`: bestätigt.
- `Freigabe!C22`: „7 × 2,33 cm ist skalierbar und bleibt im Hauptprodukt (jetzt 77 Größen); eigene Produkte sind nur 5 × 2, 6 × 2, 8 × 2“.
- Befestigungsaufschläge `Optionen!F171:F175`: 0 / 2,99 / 3,99 / 2,49 / **2,69** €; die Preisbestätigungen stehen bei K172:K175. Beide Farben haben Zuschlag 0 (F169:F170).

Die Serie 3:1 ist die benannte Skalierungsreihe. Maßgeblich bleibt die bestätigte katalogisierte Höhe **23,3 mm**, nicht eine neu berechnete unendliche Dezimalzahl 70/3.

## Native Identität und Umfang

- Shopify-Zielprodukt: `gid://shopify/Product/16190784602492`; beim eigenen Leseabruf weiterhin DRAFT, 808 Varianten.
- Lokale v9-Quelle: `cfg_8d95909c-fcd9-4cf8-87e7-152eb21e7204`, Revision 2; Dokumenthash `d4aa5e78a870decbecbda937e76feb740c299f8e52bd5c1fd3a8d93a93f715ad`.
- Lokaler v9-Plan: `pgp_80a0c3b9-b599-428f-8626-05e3ace880b6`, `valid:true`; Planhash `83cd95dc900fcbc9631086f54c26591e2dbab75d285cc80fa46d64673f63bb33`.
- Schwarzer Größenschlüssel: `TS-Acryl-RE-70X23P3-T30-SW`; Anthrazit: `TS-Acryl-RE-70X23P3-T30-AN`.
- Beide Varianten tragen Geometrie 70 × 23,3 mm; jeweils K00/KGL/KRA/B02/B02S, somit **10 Kombinationen**. Quelldokument und kompilierter Plan stimmen semantisch einschließlich Konturparametern überein.
- Hauptplan: 77 Größen / 778 Kombinationen. Die Differenz gegenüber 808 Shopify-Varianten stammt aus den drei separaten Kleinformaten 5×2/6×2/8×2 mit je zehn Kombinationen. **Die zehn 7×2,33-Kombinationen gehören weiterhin ins Hauptprodukt.**

Lokale cfg-/Plan-IDs sind Prüfstandreferenzen, keine Aussage über produktive Register-IDs. Dieser Audit hat keine aktive Server-Konfiguration aus der Zielregistry gelesen. Die Live-SKUs belegen die Größenidentität, nicht selbst einen erfolgreichen Produktionsabruf.

## Alle zehn tatsächlich gelesenen Shopify-Varianten: Beschriftung und Preis

Produkt-GID wie oben; Varianten-GIDs jeweils `gid://shopify/ProductVariant/<ID>`. Vollständige SKU je Tabellenzeile: `156-TS-Acryl-RE-70X23P3-T30-<Farbe>-<Befestigung>`. SW = Schwarz, AN = Anthrazit. Ist-/Soll-Label in cm, jeweils mit unverändertem Präfix „Rechteck · “ und unveränderten Farb-/Befestigungstexten.

| Shopify-Varianten-ID | Farbe / Befestigung | Ist-Label cm | Soll-Label cm | Ist € | v9-Soll € | Ist minus Soll € |
|---|---|---|---|---:|---:|---:|
| 58104615993724 | SW / K00 | 7 × 2 | 7 × 2,33 | 7,99 | 7,99 | 0,00 |
| 58104616026492 | SW / KGL | 7 × 2 | 7 × 2,33 | 10,98 | 10,98 | 0,00 |
| 58104616059260 | SW / KRA | 7 × 2 | 7 × 2,33 | 11,98 | 11,98 | 0,00 |
| 58104616092028 | SW / B02 | 7 × 2 | 7 × 2,33 | 10,48 | 10,48 | 0,00 |
| 58104616124796 | SW / B02S | 7 × 2 | 7 × 2,33 | 10,98 | 10,68 | 0,30 |
| 58104616157564 | AN / K00 | 7 × 2 | 7 × 2,33 | 7,99 | 7,99 | 0,00 |
| 58104616190332 | AN / KGL | 7 × 2 | 7 × 2,33 | 10,98 | 10,98 | 0,00 |
| 58104616223100 | AN / KRA | 7 × 2 | 7 × 2,33 | 11,98 | 11,98 | 0,00 |
| 58104616255868 | AN / B02 | 7 × 2 | 7 × 2,33 | 10,48 | 10,48 | 0,00 |
| 58104616288636 | AN / B02S | 7 × 2 | 7 × 2,33 | 10,98 | 10,68 | 0,30 |

**Acht Preise stimmen überein; beide B02S-Varianten liegen im bestehenden Shop 0,30 € höher.** Das ist ein bereits vorhandener Unterschied, keine Änderung dieses Audits und kein Anlass, den bestätigten v9-Sollpreis an den Shop anzupassen.

Sollpreisquelle: [Chris bestätigt Grundpreise und Aufpreise am 10.11.2026 12:57](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6766806272): zwei Schrauben **2,69 €**, vier Schrauben 3,29 €. Der Kommentar erklärt ausdrücklich, dass die älteren Acryl-Katalogwerte 2,99/3,39 € nicht gelten. Für dieses Format daher 7,99 + 2,69 = **10,68 €**. Die Original-Excel `Optionen!F175/I175/K175` und der v9-Preisbaum stimmen damit überein. Preise sind gemäß späterer Bestätigung brutto inkl. 19 % MwSt.; keine Neuberechnung. Labelkorrektur und späterer bewusster Preisabgleich sind **zwei getrennte Punkte**.

Der get_product-Abruf enthält die ersten 50 von 808 Varianten. Darin liegen sämtliche erwarteten zehn eindeutigen Farb-/Befestigungs-Kombinationen dieses Größenpaars; die übrigen 758 wurden in diesem Audit nicht nochmals vollständig gelesen.

## Herkunft der Labels und allgemeiner Umfang

Katalogpin `8236b8bfab7322447ec46661c116fa526331af3d`:
`familien/acryl/acryl-3mm-tuerschilder-schwarz.json` und `…-anthrazit.json` führen schon `label: "7 × 2 cm"` neben `widthMm:70,heightMm:23.3`. Der Original-Excel-Text ist dagegen korrekt. Ein historischer Erzeugungsalgorithmus dieser Katalogstrings ist damit nicht bewiesen.

Aktueller Konverter `app/workshop/katalog-family-formats.mjs`:

- Zeile 86 kopiert `label:size.label` in das Format; Geometrie wird davon unabhängig aus der nativen Familie kopiert.
- Zeile 18 fügt nur den Formnamen hinzu: `Formname + " · " + s.label`.
- Zeilen 96 und 102 verwenden diesen Text für Shopify-Varianten und die native Größenauswahl.

Hier gibt es **keine mathematische Rundung**. Ein generischer Formatterfix würde den nachgewiesenen Ursprung verdecken und unnötig weitere Produkttexte verändern.

Alle 77 numerischen cm-Labels des Hauptplans wurden gegen die tatsächlichen Millimetermaße geprüft: **74 stimmen, drei sind verkürzt**. Die gezielte Zuordnung für Acryl lautet:

| Form / Geometrie mm | Schwarzer Schlüssel | Anthrazit-Schlüssel | Ist-Größenlabel | Soll-Größenlabel | v9-Kombinationen |
|---|---|---|---|---|---:|
| Rechteck / 70 × 23,3 | TS-Acryl-RE-70X23P3-T30-SW | TS-Acryl-RE-70X23P3-T30-AN | 7 × 2 cm | 7 × 2,33 cm | 10 |
| Rechteck / 80 × 53,3 | TS-Acryl-RE-80X53P3-T30-SW | TS-Acryl-RE-80X53P3-T30-AN | 8 × 5 cm | 8 × 5,33 cm | 10 |
| Abgerundet / 80 × 53,3 | TS-Acryl-AB-80X53P3-T30-SW | TS-Acryl-AB-80X53P3-T30-AN | 8 × 5 cm | 8 × 5,33 cm | 10 |

Auf Katalogebene wurden die drei vorhandenen vollständigen Türschildfamilien mit je 80 Größen gelesen: beide Acrylfarben sowie Stahl. Genau dieselben drei Größenlabels sind je Familie verkürzt: **9 von 240 Katalogrecords**, davon sechs Acrylrecords. Stahlkeys `GR-ES-RE-70X23P3-T15`, `GR-ES-RE-80X53P3-T15`, `GR-ES-AB-80X53P3-T15` sind nur Auditbefund; **keine Änderungsfreigabe für Stahl**. Keine Aussage über andere Katalogfamilien.

## Umsetzungshinweis und Belege

Für die tatsächliche Zielvorbereitung: die drei konkreten Acryl-Größenpaare anhand Schlüssel **und** übereinstimmender nativer Maße auswählen; ausschließlich zugehörige Größenlabels in Format, Größenauswahl und Exportansicht konsistent berichtigen. Vorher/Nachher-Vergleich muss unveränderte Produkt-/Varianten-IDs, SKU, Geometrie, Befestigungsmenge und Preise nachweisen. Kein globales Ersetzen von „8 × 5“ ohne Form-/Schlüsselbezug. Vorhandene native Revisions-/Freigabeschritte bleiben bestehen. Ein gesonderter Preisabgleich darf erst im dafür vorgesehenen tatsächlichen Zielbatch stattfinden.

Belege im selben Ordner:

- `main-acryl-7x2-shopify-readback.json`: eigener Leseabruf, zehn vollständige Shopify-IDs/SKUs/Titel/Preise.
- `main-acryl-7x2-local-audit.json`: native Geometrie, 10 Preise, alle drei Labelabweichungen und drei Katalogfamilien.
- `main-acryl-7x2-excel-cells.json`: unmittelbar aus Original-XLSX gelesene Zellwerte/Formel, keine Tabellenbearbeitung.
- `main-acryl-7x2-historical-decisions.json`: drei unmittelbar gelesene GitHub-Entscheidungen mit URLs.
- `audit-main-acryl-labels.mjs`: rein lesender lokaler Prüfer; schreibt nur den Audit-JSON. Reproduktion ab Workspacewurzel: `node work/restabschluss/audit-main-acryl-labels.mjs`.

Es wurde kein Codepatch erstellt, keine native Planung neu erzeugt und nichts bestätigt, ausgeführt, gebunden oder veröffentlicht.

