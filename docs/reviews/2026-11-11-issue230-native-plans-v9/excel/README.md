# Aktuelle Excel-Nachträge zum Planstand v9

11.11.2026. Sieben neue vollständige Produktakten mit dem ersten Blatt **PlanstandV9**. Hauptacryl: Akte v6. Acryl 5×2, 6×2 und 8×2: jeweils v4. Edelstahl 5×2, 6×2 und 8×2: jeweils v3.

Der neue Nachtrag enthält die bestätigten Bruttopreise einschließlich **19 % Mehrwertsteuer**, die am 20.10.2026 bestätigten Mengenstaffeln (ab 3 Stück 5 %, ab 5 Stück 10 %, ab 10 Stück 15 %), unveränderte Starts und Uploadentscheidungen sowie die sieben gültigen lokalen v9-Planpaare. Quell- und Vorlagenrevisionen sind jeweils 2; Modul- und Motivprofilverweise bleiben erhalten.

**Die konkrete Gesamtbestätigung und Ausführung bleiben offen.** Ein gültiger lokaler Plan ist keine Veröffentlichung. Das Hauptprodukt enthält 1.205 Designs. Seine neun Geometrieausnahmen und zwei absichtlich ausgeblendeten IDs bleiben separat und werden nicht freigegeben. Die sechs Kleinprodukte enthalten jeweils 27 Designs.

Die Preisoriginale und die vorherigen Akten wurden nicht überschrieben. Sämtliche früheren Blätter, einschließlich des v8-Nachtrags, bleiben als historische Quellen erhalten. Der aktuelle Stand steht ausschließlich auf dem neuen ersten Blatt.

Die Prüfung ergab:

- **17.968 ursprüngliche Zellen** einschließlich Werte und Formeln unverändert.
- **18.710 Zellen der vorherigen v8-Akten** einschließlich ihres Nachtrags unverändert.
- Sämtliche ursprünglichen und vorherigen Worksheet-, Tabellen- und Worksheet-Relationsdateien bytegleich.
- **823/823 Variantenpreise** gegen die ursprüngliche Excel-Extraktion korrekt.
- Exakte v9-Plan-, Quell-, Vorlagen- und Modulprofilverweise sowie Original-, Vorgänger- und Entscheidungsbeleg-Hashes geprüft.
- Alle sieben neuen Akten erneut eingelesen, ihre neuen Blätter gerendert und visuell geprüft.

`Manifest.json` bindet die sieben neuen XLSX-Dateien per SHA256. Der native Plan bleibt an die ursprüngliche Preisakte gebunden; die neue Akte verweist auf den Plan und enthält keinen eigenen Hash. Dateibytes des Entscheidungsbelegs und sein kanonischer nativer JSON-Hash werden ausdrücklich unterschieden. `Inhaltspruefung.json` dokumentiert den direkten OOXML-Abgleich unabhängig von der Autorenbibliothek; `Sichtpruefung.json` dokumentiert Einlesen, Zellprüfung und Darstellung.
