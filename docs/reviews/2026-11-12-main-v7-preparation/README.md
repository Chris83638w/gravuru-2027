# Hauptacryl v7: Unterlagenstruktur vor dem echten nativen Review

Stand 12.11.2026, letzter ausgewerteter Operatorbericht 07:18. Dies ist eine lesend vorbereitete Struktur, keine neue Excelakte, keine Freigabe, kein Import- oder Shopify-Payload. App, versiegelter v9-Lauf, bestehende Zielvorschau und v6-XLSX wurden nicht verändert. `main-v7-target-matrix.json` enthält ausschließlich bereits belegte Zielwerte und ausdrücklich leere spätere Belegfelder.

## Neuer belegter Stand

- Der Kategorienvergleich auf der tatsächlichen Acrylkopie ist abgeschlossen: 808 Identitäten/Optionen passen; beide beibehaltenen Kategorie-IDs haben dort keine eigene Profilzuordnung. Standards und Kategorien ergeben dieselbe Auswahl/Herkunft, ohne Fehler. Der gespeicherte Rev1-Metadatensatz ist `{}`. `readyForImport:false` ist die absichtliche Grenze des reinen Vergleichshelfers, kein zusätzlicher negativer Kategorienbefund. Die damaligen SQL-Projektionshashes dürfen nicht als neue native Adapter-Ressourcenpins eingesetzt werden. [Operatorergebnis](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6809368576)
- Der zweite Registercheck ist abgeschlossen: innerhalb der festgelegten sechs Gruppen, 22 Shopprodukte und 126 Varianten liefert Legacy keine Köpfe, Historien-/Festbindungen, sechs exakten Aliasse, lokalen UUIDs oder cfg-Treffer. Zusammen mit Acryl bestehen genau 45 Bindungsköpfe an zwei Mehrgrößenprodukten; 81 weitere Varianten haben in beiden geprüften Registern keinen Kopf. Dies ist keine weltweite Negativaussage über beliebig benannte native Produkte. [Legacyprüfung und drei Belegdatei-SHAs](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6811910513)
- Kalt/Reopen des Galerie-Messwerkzeugs auf der echten Acrylkopie sind mit f85390b bestanden. Der Bericht kündigt danach erst den isolierten Vollhost-Sitzungstest und anschließend `captureUpdateObservation` an. Weder dieser Vollhostnachweis noch die tatsächliche native Hauptproduktbeobachtung liegen in den ausgewerteten Quellen vor. Kein Schluss auf Aktivierung oder Produktfreigabe. [07:18-Bericht](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6816307301)

Die alten, versiegelten Readiness-Dateien bleiben historische Belege: ihr damaliges „Kategorien fehlen“ ist inzwischen erledigt. Die native Beobachtung mit vollständigem Validator, frischer Metadatenausgabe und dem tatsächlichen Ressourcenpin-Leser bleibt erforderlich. Ein Fehlen der separaten Modulprofilbibliothek ist für den eingebetteten Hauptprodukt-Snapshot kein Runtime-/Direktupdateblocker; spätere native Kleinprodukt-Gruppenpläne benötigen ihre echten Registrypins.

## Verbindlicher Zielumfang der späteren Hauptakte

| Teil | Exakter vorbereiteter Umfang | Beleg/Erhaltung |
|---|---|---|
| Identität | Shopify `16190784602492`; native `cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0`, Rev1 → vorgesehene Rev2 | Identitätserhaltendes Update, keine Neuanlage |
| Varianten | Alle 808 vorhandenen IDs und SKUs erhalten | 778 dem neuen Ziel zugeordnet, 30 vollständig bei Rev1 belassen |
| Preise | 620 der 778 schon gleich; 138 B02S um 30 Cent, 20 B04S um 10 Cent auf den unveränderten v9-Sollpreis reduzieren | Kein neuer Preisbeschluss; vollständige 158-Zeilen-Tabelle aus dem bestehenden Mapping |
| Beschriftungen | Rechteck70×23,3: „7 × 2,33 cm“; Rechteck80×53,3 und abgerundet80×53,3: „8 × 5,33 cm“ | Drei Größen, je10 Varianten; ausschließlich Beschriftung, Geometrie unverändert |
| Überschneidung | 6 der30 Beschriftungsänderungen gehören zugleich zu den158 Preisänderungen | 182 verschiedene Varianten mit Preis- und/oder Labeländerung; keine Addition zu188 |
| Bindungen | 778 bestehende Varianten auf dieselbe cfg Rev2, 8 Blöcke mit höchstens100 | Frische vollständige native Belege und erwartete Zuordnungsköpfe je Block; 30 Restvarianten unberührt |
| Katalogfreigabe | Genau Rev2 und ihre778 Bindungen nach erfolgreichem Abgleich | Eigener technischer Schritt; Rev1-Freigabe und30 Restbindungen erhalten |
| Metadaten/Medien | Vorhandener Name, SEO, Kategorienreihenfolge, H1 und sonstige Bilder erhalten | DRAFT bleibt; keine Veröffentlichung, keine Variantenlöschung |
| Gestaltung/Module | Bestätigte Startvorlagen beibehalten; Haupt Foto+SVG an; bestätigte Rechte | Kein LEER-Zusatz, keine neue Designauswahl; keine erneute Preis-/Steuer-/Staffelfrage |

Die komplette 808er Identitätsmatrix existiert bereits in `docs/reviews/2026-11-11-main-target-preview/variant-mapping.preview.json.gz`; sie wird gepinnt weiterverwendet. Die spätere v7-Unterlage benötigt keinen erneuten Gesamtexport des Shops. Frische Ziel-/Shop-/Bindingbelege vor einer tatsächlichen Mutation bleiben davon getrennt.

## Vorgesehene neue Akte, Originaldatei bleibt erhalten

Herkunft ist **der aktuelle v9-Lauf**, dessen Haupt-XLSX den Dateiversionsnamen `Tuerschild-Acrylglas-3mm_v6.xlsx` trägt, nicht ein alter Lauf v6. Datei: `outputs/Produktplaene-230-v9/Excel-Nachtraege/Tuerschild-Acrylglas-3mm_v6.xlsx`, 122423 Bytes, SHA `37a704d892b0f24fffdd87c7c5090652e5a949f3091dd8117ff83567e49d1429`. Der SHA wurde für diese Vorbereitung erneut lesend geprüft.

Die spätere `Tuerschild-Acrylglas-3mm_v7.xlsx` wird als neue Datei angelegt. Alle bisherigen Arbeitsblatt-, Tabellen- und Relationsdateien bleiben bytegleich. Neue Blätter enthalten:

1. **HauptzielV7:** verständlicher konkreter Umfang, echte cfg/Shop-ID, Rev1→2, 808=778+30, Status und Erhaltung; echter `updateReviewHash` ausdrücklich als Operator-Update-Review bezeichnet. Der v9-`pgp`-Plan bleibt Herkunft, nicht das Update-Ausführungsobjekt.
2. **Preisabgleich158:** alle158 IDs/SKUs, Istpreis, unveränderter v9-Sollpreis und Differenz; Herkunft des Iststands und Zeitpunkt nennen. Originalpreisblätter/Summen nicht ändern.
3. **Groessenlabels30:** alle30 IDs/SKUs, bestehende/bereinigte Beschriftung, echte mm-Geometrie; Preisüberschneidungen ausweisen.
4. **Erhalten30:** alle30 Restvarianten mit vorhandener ID/SKU, Optionen/Preis und Bindung Rev1; keine neue Einordnung als zu löschende oder umzubindende Varianten.
5. **BelegeV7:** exakte Quell-/Zielhashverfahren, native Observation/Validator-/Ressourcenpins, v9-Herkunft, Kategorienbeleg und Kopienpilotbericht; echte Nachweise von noch fehlenden klar trennen.
6. **AblaufV7:** die separat ausführbaren Schritte natives Update, Shoppreis/Labels, acht Bindungsblöcke und Rev2-Katalogfreigabe, jeweilige Vor-/Nachprüfung und Stop bei Drift. Keine Behauptung, der reine Updateadapter führe diese Folgeschritte aus.

Die unveränderte maschinenlesbare vollständige778+30-Mappingdatei ist eine separat gepinnte Anlage. Keine überladene Darstellung aller778 Zeilen im Startblatt. Die endgültige Blattgestaltung/Erzeugung erfolgt erst mit dem Spreadsheet-Verfahren nach Vorliegen des echten Reviews; jetzt wurde keine XLSX erstellt.

## Belegfolge ohne Selbsthash und ohne fingierte Zustimmung

1. Claude verbindet den bereits geprüften Adapter und Ressourcenpin-Leser mit dem tatsächlichen vollständigen nativen Kontext auf einer neuen Arbeitskopie. `captureUpdateObservation` ermittelt die echten Preimage-, Validator-, Zielmetadaten- und Ressourcenpins; der Kategorienbeleg wird mit seinem tatsächlichen Dateihash referenziert. Kein Übertragen alter SQL-Projektionswerte als Adapterpin.
2. Daraus erzeugt `prepare` den echten Operator-Update-Review samt `reviewHash` und Importfingerprint; `verify` prüft denselben Zielinhalt. Ein etwaiger noch fehlender tatsächlicher Kopienpilot/Review wird separat geliefert, niemals aus den vorhandenen synthetischen Regressionen abgeleitet. Dies ist keine produktive Ausführung und keine Nutzerfreigabe.
3. Neue XLSX v7 verweist auf diesen Reviewhash. Eine separat versiegelte Ablaufanlage pinnt die778/30-Mengen,158 Preise,30 Labels und vorgesehenen Bindungs-/Katalogschritte. Die tatsächlichen vorübergehend gültigen Schreibbelege werden erst für den späteren autorisierten Ablauf frisch gewonnen.
4. Ein externer Paketmanifest-SHA bindet Review, XLSX-v7-SHA und Ablaufanlage. Erst dieses vollständige Paket ist abnahmefähig. Im jetzigen Plan bleiben diese Werte `null`.
5. Erst nach einer tatsächlichen Zustimmung wird deren Wortlaut/Quelle gegen die exakten Paket-/Review-/Excelpins aufgezeichnet. Der vorhandene Adapterbeleg autorisiert technisch ausschließlich **ein natives Produktupdate**. Eine spätere einmalige Gesamtfrage muss die separat benannten Shop-, Bindungs- und Katalogschritte ausdrücklich mit umfassen; aus dem Adapterbeleg allein folgt deren Freigabe nicht.

Keine Freigabefrage mit Platzhalterhash stellen. Die bestätigten Sachentscheidungen zu Preisen, 19% MwSt., Staffeln, Uploads, Startvorlagen und H1 werden als Belege fortgeführt und nicht erneut abgefragt.

## Abgrenzung der sechs Kleinprodukte

Die echte Identitätslücke ist nun innerhalb beider Register geklärt. Die16 ACTIVE-Einzelprodukte bleiben trotzdem vorhandene Shopprodukte und erhalten weder automatisch eine neue Bindung noch ein Überschreiben. Die45 vorhandenen Köpfe gehören ausschließlich Hauptacryl und Hauptstahl; sie sind nicht sechs freie Kleinproduktidentitäten. Das Fehlen der sechs exakten v9-Aliasse und lokalen UUIDs ist kein Anlass, diese lokalen UUIDs auf dem Server zu erzwingen.

Separater, noch festzulegender Zielumfang: entweder sechs zusätzliche DRAFT-Produkte mit45 Varianten (Acryl je10, Stahl je5) unter Erhaltung aller bestehenden Kandidaten oder ausdrücklich benannte vorhandene Shopziele. Keine dieser Alternativen ist durch die neuen Lesebelege genehmigt. Für gewählte Neuanlagen sind echte Zielquellen/-profilpins und sechs native Gruppenpläne vorzubereiten; Haupt-v7 enthält dafür keine Ausführungsvollmacht. Keine neue Prüfung der1519 Shopprodukte nötig, solange keine Zieländerung neue Kandidaten relevant macht.

## Fehlende Eingänge – konkret

- Tatsächliche native `observation.json` mit vollem Validator und frischen sechs Ressourcenpinfeldern; vollständiger nativer Kontext-/Kopiennachweis und Ergebnis des angekündigten Vollhosttests noch offen.
- Daraus echte Reviewdatei/`reviewHash`/Importfingerprint sowie unabhängiger Abgleich des konkreten Hauptziels. Vorhandene synthetische Kopientests sind Mechanismusbelege, kein ausgeführter Real-Kopienpilot.
- Danach neue v7-Datei, unveränderliche Ablaufanlage und deren externe Manifestpins; erst anschließend genaue Produktpaketabnahme. Keine aktuell vorliegende Produktzustimmung wird behauptet.

Keine Tests, Server-/Shopzugriffe oder Schreibaktionen an Produktdaten wurden für diese Vorbereitung ausgeführt. Ausschließlich vorhandene lokale Unterlagen und die drei genannten GitHub-Originalkommentare wurden gelesen.
