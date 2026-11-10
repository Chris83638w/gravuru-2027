# Sieben Produktakten: Excelabgleich für #230 B

**Ergebnis: Die sieben Exceldateien sind exakt gepinnt und auslesbar. Der Umfang ergibt rechnerisch 823 angebotene Größen-/Farb-/Befestigungskombinationen. Diese Auswertung ist kein ausführbarer Produktplan und keine Freigabe.** Allen sieben Akten fehlen die aktuelle native Quellprodukt-ID mit Revision/Dokument und die konkrete Registryzuordnung. Plan-ID und Planhash bleiben deshalb ausdrücklich leer; der getrennte Plan-Runner darf keine Scheinpläne erzeugen.

## Quelle und Umfang

- Quellbranch: `dev/claude-kette-pilot-acryl-20261110`.
- Vollständig verifizierter Git-Pin: `bf8824c80347f63ffeb2c05cc9a34a9ffed6f9bd`; Remote-Pin am Ende erneut identisch gelesen.
- [Auftrag B](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6772867984), [Trennung vom Server-Code](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6772914392), [Mikas Übernahme nur Plan](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6774617558).
- [Spätere 13-Motive-Entscheidung](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6772716646) wird separat geführt. Die ursprünglichen Excelbytes wurden nicht geändert.
- Die Schnellstraße wurde inzwischen laut [Operatorprotokoll](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6773693287) von Chris bestätigt. Das hebt die Beschränkung dieses Probelaufs auf `plan` nicht auf.

Es wurden nur die sieben benannten XLSX, der benannte Stahl-Änderungsplan und gezielte historische Quellenhinweise gelesen. Keine aktuelle Produktionsdatenbank, keine Shopbindung, keine Bestätigung, Ausführung, Produktanlage oder Veröffentlichung wurde verändert.

## Exakte Datei-Paare

Alle Pfade liegen unter `docs/produktfreigaben/` am oben genannten Pin.

| Datei | SHA-256 | Größen | Analysierte Kombinationen | Grundpreis EUR |
|---|---|---:|---:|---:|
| Tuerschild-Acrylglas-3mm_v4.xlsx | `495e7e59d7abf6a46f1fb7098a75e666162e58be3cad99ad75de6db5d3923841` | 77 | 778 | 7,99–73,99 |
| Tuerschild-Acrylglas-3mm-5x2_v2.xlsx | `119e2f48ec4d92c91a1463946a95ef0d2f30deb2e07c0c13ce59c73583a339cd` | 1 | 10 | 6,99 |
| Tuerschild-Acrylglas-3mm-6x2_v2.xlsx | `7e588c53b57091cd5870a6bc24b81f5cca7d4ddb55cb722ce5156100d3267673` | 1 | 10 | 7,99 |
| Tuerschild-Acrylglas-3mm-8x2_v2.xlsx | `02a4b9749dcbacbd8d13957e5194ad4ae27cc0f2e81922f5a3b95b0151f47cc2` | 1 | 10 | 8,49 |
| Tuerschild-Edelstahl-5x2_v1.xlsx | `9fe8b60b35e3c9f4de5ab5d738608b49e509041cb584f4e8d6a9242fb09357d0` | 1 | 5 | 7,99 |
| Tuerschild-Edelstahl-6x2_v1.xlsx | `de58b14ae5e33146a52a17f7c1b176dd58cebb75479617d10852f5e91623e0f5` | 1 | 5 | 8,79 |
| Tuerschild-Edelstahl-8x2_v1.xlsx | `440f3a19ad1fac20d446b19b9fe9810a1daee6292d0ab3591a7f21f39dca7317` | 1 | 5 | 9,49 |

Stahl-Änderungsplan `Aenderungsplan-Tuerschild-Edelstahl-Kleinformate_v1.md`: SHA-256 `705a5082ef4c9b70b398f37314a6893d5183fa5a864f3d71dc9b1c0eb905219b`.

Die Kombinationen sind eine nachvollziehbare Analyse der ausdrücklich je Größe aufgeführten Werte. Sie sind keine bestätigten neuen Shopifyvarianten oder neuen SKUs. Gerade die Farbauswahl/Standards sind teilweise noch offen.

## Größen, Optionen und Preise

Haupt-Acryl: `Varianten!A7:N83` enthält 77 Größenzeilen. Die sieben angegebenen Formen verteilen sich auf Rechteck RE 24, abgerundetes Rechteck AB 10, Quadrat QU 7, Oval OV 17, Rund R 5, Retro 1 RT1 7 und Retro 2 RT2 7. `7 × 2,33 cm` bleibt in Zeile 23. Die genaue Zuordnung der zusätzlich erwähnten Designreihe „Abgerundete Seiten“/TAS-A ist in `Offene Fragen!A12:F12` weiterhin offen; daraus wird keine achte Form erfunden.

`Optionen!A7:K780` enthält 774 echte Optionszeilen, davon 389 Befestigungswerte. Jede der 77 Größen hat zwei preisgleiche Acrylfarben; daraus entstehen 389 × 2 = 778 rechnerische Kombinationen. Kleinformat-Acryl hat je eine Größenzeile (`Varianten!7`), zwei Farben und fünf Befestigungen (`Optionen!7:16`), also je 10. Stahlklein hat eine Größenzeile und fünf Befestigungen (`Optionen!7:13`), also je 5.

| Befestigung | Aufpreis EUR | Geltung aus Excel |
|---|---:|---|
| K00 ohne Befestigung | 0,00 | alle; Acryl-Standardstatus noch offen |
| KGL glatte Fläche | 2,99 | nur konkret aufgeführte Größen |
| KRA raue Fläche | 3,99 | nur konkret aufgeführte Größen |
| B02 zwei Bohrlöcher | 2,49 | nur konkret aufgeführte Größen |
| B02S zwei Schrauben | 2,69 | nur konkret aufgeführte Größen |
| B04 vier Bohrlöcher | 2,89 | nur aufgeführte Hauptproduktgrößen |
| B04S vier Schrauben | 3,29 | nur aufgeführte Hauptproduktgrößen |

Die Änderungsentscheidung für Schrauben ist ausdrücklich protokolliert; ältere Acrylquellen mit 2,99/3,39 EUR werden nicht übernommen. Keine Bohrloch-/Schraubenoption wird über den vorhandenen Größenbezug hinaus erweitert. Das Ausblenden nicht verfügbarer Optionen und des ganzen Foto-Reiters steht in `Module!A21:A24` und bleibt technische Abnahmepflicht.

Variable Leistungen stehen getrennt: weiteres/geändertes Motiv 1,69 EUR, Logo 12,99 EUR, Acrylfoto 9,99 EUR. Diese Beträge sind nicht pauschal in der Kombination enthalten. Zulässigkeit, Anzahl und bestätigtes Modul müssen zusätzlich passen; ein eingetragener Preis erlaubt das Modul nicht automatisch.

Alle 83 Variantenpreisformeln in Spalte J haben keinen gespeicherten Ergebniswert. Ein `data_only`-Leser würde daher leere Werte liefern. Die Analyse rechnet ausschließlich das sichtbare H+I und anschließend konkrete Befestigungs-/Farbaufschläge; sie rechnet die XLSX nicht neu und setzt leere Werte nicht auf 0. Sechs numerische XMLwerte zeigen binäre Nachkommarestwerte, z. B. `8.789999999999999`. Sie werden unter offengelegter enger Toleranz auf 879 Cent abgebildet; Rohwerte/Zellen bleiben im Ergebnis erhalten.

## Konkrete Lücken und Widersprüche

1. **Native Quelle fehlt bei allen sieben neuen Angeboten.** `Freigabe!C11` lautet „nicht vorhanden (Neuanlage)“; die Erläuterung verneint eine belegte native Produktrevision. Die Arbeitsnamen in C7 sind keine Repository-ID. C23/C24 Plan-ID/Hash, C25/C26 Template-ID/Revision und C27/C28 Modulprofil-ID/Revision sind leer. C14 Shop/Mandant ist ebenfalls offen. Kein nativer Quellenexport oder Registry-Mapping darf daraus erfunden werden.
2. **Designstand veraltet/offen.** C16/C17 und `Offene Fragen` nennen D1–D73 beziehungsweise ungeklärte Kleinformatbestände. Das Informationsblatt `Designs` ist keine Pilotfreigabe. Die spätere Vorgabe ist Katalog #185/Pin `8236b8bfa`, 1.298 Designs, Rang 0 vor Rang 1; die XLSX nennt dagegen `3c6051fb`. Das muss als neue überprüfte Quellenzuordnung gepaart werden. Startdesign und Hauptproduktbild sind weiterhin nicht eindeutig freigegeben; `TAE-V2A-8x5-D1` ist nur Vorschlag.
3. **Kleinformat-Motive nachträglich geändert.** Die Dateien nennen 14 Motive und offene Auswahl. Die spätere Entscheidung benennt 13 ohne `schmetterlinge-1`, rechts/links neben Text; `strich-horizontal`/`feine-trennlinie` dürfen mittig oder mit versetztem Text liegen. Das ist eine getrennte spätere Vorgabe, keine nachträglich veränderte Excelversion. Die ausstehende Designanpassung PR187 darf nicht als bereits fertig gelten.
4. **Acryl-Logo widersprüchlich.** Hauptprodukt `Module!C12/D12/I12`: an/offen/offen. `Optionen!E15/K15`: ja/bestätigt. I15 erklärt für die Aktivierung nur einen nicht widersprochenen Operatorvorschlag. Der Preis 12,99 EUR ist dokumentiert bestätigt; daraus folgt keine bestätigte Logoaktivierung.
5. **Kleinformat-Foto/Logo bleiben offen.** Acryl `Module!C11/C12` sowie `Optionen!E15:E16/K15:K16` sind offen; „aus“ ist nur Operatorvorschlag. Stahl-Foto ist ausdrücklich aus; Stahl-Logo bleibt offen. Diese offenen Wünsche werden weder als true noch als false exportiert. Haupt-Acryl-Foto ist dagegen in Modulzeile 11 und Optionenzeile 16 dokumentiert bestätigt; die technische Rückseitengravur/Spiegelung bleibt zu prüfen.
6. **Farben sind semantisch zuzuordnen.** Acryl `Module!colors` beschreibt Schwarz/Anthrazit als Platten-/Materialwahl, keine frei wählbare Gravurfarbe. Nicht ungeprüft den Runtime-Farbeditor aktivieren. `Optionen!farbe` und Standard Schwarz stehen weiterhin auf offen. Foto, Logo oder Farbe werden nicht durch bloße Fähigkeitsfelder freigegeben.
7. **Explizite Freigabeblöcke noch offen.** `Freigabe!B33:B38` steht bei allen Akten auf offen. Spätere Einzelentscheidungen in Zeilen 39–47 sind wichtig, aber keine pauschale Produkt-/Publikationsfreigabe. Steuerkontext und Mengenstaffel in C19 beziehungsweise Haupt-`Offene Fragen!9` sind ausdrücklich nicht beantwortete Operatorvorschläge. Bei Stahl wurde die Frage nach weiteren Modulwünschen noch nicht beantwortet; das Acryl-Nein darf nicht still übertragen werden.
8. **Keine fertigen Verkaufskombinationsschlüssel.** Das Blatt Varianten enthält Größenzeilen, nicht alle 823 Kombinationen; Spalte G mit festen Options-JSON ist leer. Die Analyse erhält deshalb Größe/Farbe/Befestigung separat. Bei Stahl verweist K7 nur auf die alte Variante; das ist keine ID eines neuen Produkts und auch kein direkt verwendbarer einzelner API-Wert.

## Stahlbestand: 15 Varianten ausschließlich als Änderungsentwurf

Der MD-Plan betrifft das vorhandene Produkt `16190784438652`: 80 → 77 Größen und 404 → 389 Varianten. Die 15 alten IDs/SKUs stehen vollständig in `steelChangePlan.existing15VariantRows` und sind gegen den MD-Text geprüft. Historischer Preisabgleich je Kleinformat: fünf Zeilen, alle Differenzen 0; zusammen 167,83 EUR. Das ist kein aktueller Livepreisnachweis.

Die Ausgliederung wurde als Prinzip bestätigt, ihre Umsetzung am Bestand jedoch ausdrücklich noch nicht. Alte IDs, SKUs, Links, Bindungen, Warenkörbe und Auftragsstände müssen in einem eigenen freigegebenen Änderungsplan behandelt werden. Die drei neuen Produkte bekommen durch diese Analyse keine neue ID oder SKU; nichts wird entfernt.

## Eng geprüfte historische Quellen

- `docs/handoffs/2026-11-01-form-groesse-n39/acryl-tuerschilder.json` enthält `configurationPlanned=false`; kein Ersatz für eine neue Quellrevision.
- `app/workshop/test-fixtures/acryl3-rear/provenance.json` pinnt Testmaterial auf Katalog `80fedf744855af0a957c3017c8dc4652cc40a6c6`; dies sind keine aktuellen produktiven Quellen.
- `docs/handoffs/2026-11-03-issue139-massenlauf/beispiele/acryl/acryl-tuerschilder-re-60x20-familienschilder-tre-v2a-6x2-d1.json` enthält den historischen Schnitt `gravuru-shop-schnitt-product/v1`, Profil `katalog-formate-acryl-tuerschilder-familienschilder-8c01b1e4b24e2012`, `family-formats-e7d0e506460a80eb2e532b95`. Er enthält keine aktuelle native Produkt-ID/numerische Revision/Registry. B02S verwendet dort außerdem noch 2,99 EUR statt der neu bestätigten 2,69 EUR. Nicht als neue Quelle ausgeben.

Diese gezielte Suche behauptet nicht, dass es nirgends weitere native Produkte gibt. Sie belegt, dass die hier gepinnten Akten und genannten Quellen die erforderliche aktuelle Zuordnung nicht liefern. Der nächste Schritt ist der lesende, exakt gepinnte Quellenexport samt Registry und ein Abgleich gegen diese Excelwerte, dann erst ein echter `ProductGroupTemplate.plan`.

## Reproduzierbarer Analysebeleg

`extract_xlsx.py` liest unveränderte Git-Blobs per ZIP/XML, einschließlich Zelladressen, Formeln, expliziten Leerwerten und Blattstruktur. `normalize_inputs.py` erzeugt ausschließlich ein Analyseformat; es ruft keinen Import-/Plan-/Confirm-/Execute-Dienst auf.

Die vollständigen Inputs werden reproduzierbar unter `outputs/seven-product-excel-20261110/` erzeugt. Die komprimierte Kopie `normalized-inputs.json.gz` in diesem Bericht enthält denselben JSON-Body (uncompressed SHA-256 `2218e5d9e6917016e59526781e2f57c650c59b449f00f979d6a0d0605bfb61e9`). Kein neuer Runtimevertrag wird eingeführt. Sieben Quellhashes, Anzahl der Größen/Kombinationen, Geldwerte, 15 historische Varianten und leere Planreferenzen wurden durch ausgeführte Assertions überprüft.

Ausführung aus dem eigenen Worktree:

```text
python docs/reviews/2026-11-10-seven-product-excel/extract_xlsx.py
python docs/reviews/2026-11-10-seven-product-excel/normalize_inputs.py
```

Keine XLSX-Rückschreibung, keine Genehmigung und keine Runtime-/Shopdatenänderung. Layout, Kundenkonfi und vorhandene Produkte bleiben außerhalb dieses Auftrags.
