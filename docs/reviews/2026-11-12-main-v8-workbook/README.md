# Hauptacryl – Abschlussakte v8

Die vorhandene Hauptakte wurde um AusfuehrungV8, Varianten808 und BelegeV8 ergänzt. Sie dokumentieren die tatsächlich ausgeführte Aktualisierung und lösen keinen Import oder Reimport aus. Die bisherigen 18 Blätter bleiben unverändert als Herkunft erhalten.

Die v8-Datei hat SHA256 **b0e7274ce05876d34c5f63e7703768936678f960e69f242c64e1d17579a2fe92** (184.257 Bytes). Die Vorgängerakte v7 bleibt SHA256 65d706e1a99cc599ba7a1c577de028208a5efd356f97bd997f68be3f899cde29. Die Gesamtfreigabe „Ja, Gesamtpaket ausführen“ ist unter [#168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6829898414) belegt.

## Tatsächlicher Abschluss

Shopifyprodukt 16190784602492 und native Identität cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0 bleiben erhalten. Die native Zielrevision ist 2. Alle 808 Shopvarianten bleiben vorhanden: 778 gehören nach Operatorbeleg zu R2, 30 bleiben unverändert an R1. Die genehmigten 158 Preis- und 30 Labelkorrekturen betreffen 182 verschiedene Varianten (6 Überschneidungen). H1, beide Medien, konfi-Vorlage und historischer Einstieg-Alias bleiben erhalten. Shopify bleibt DRAFT.

Der [Operatorabschluss](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6832031956) stammt aus Commit f9af62fa193078afeee233ca1efdf6bf022caef6. Geliefert ist der originale Git-Kurzbericht mit 8.507 Bytes und SHA256 ae2a8b119f17f676faf263b48c076de883cbb7c1339f1078d7bed57c0ddaa95f. Er meldet 19/19, Abschluss 18:08:20Z, 22 Journaleinträge und ein geschlossenes Schreibfenster. Der darin gepinnte private Vollbeleg mit 11.296 Bytes/SHA256 73d5bc348c2ef8b0d226f5be7da848eaf70599583b0da9096a92bb275e52acff wurde nicht geliefert. Dasselbe gilt für einzelne native Bindingrecords und den vollständigen Operatorplan.

Der tatsächliche Main-Operatorplanhash 698c6734669dba47c06b6d9008d4f0a3bcb6236967f72a02ebd259ba0b614258 steht getrennt vom ursprünglichen Update-reviewHash und vom Pricingplan. Kein ProductGroup-planHash und kein neuer creationKey wurden erzeugt. Native Bindungsrevisionen sowie 808 erhaltene historische Preisverträge werden ausdrücklich dem tatsächlichen Operatorbericht zugeordnet; dessen 11 Konsistenzprüfungen sind getrennt ausgewiesen.

## Prüfungen

Der unabhängige Shopify-Rückvergleich erfolgte nach Abschluss auf 17 vollständigen Seiten bis 18:15:43Z. Alle 808 IDs, Preise, Optionen und SKUs passen; 0 Abweichungen, 16 Prüfungen bestanden. Die Quellen liegen separat unter [main-execution-complete](../2026-11-12-main-execution-complete/README.md), Manifest SHA256 3fa03b0ae523e7bd02d5bbc901d48a227c79e444823967f9bfce44b2973ce2f9. Dieser Shopread prüft keine nativen Tabellen oder Eigentümer-App-Preisfelder.

Der Erhaltungscheck bestätigt 14.257 Originalzellen und 16.227 Vorgängerzellen/Formeln unverändert. Alle 18 alten Blätter und 32 alte Paketdateien bleiben erhalten, darunter sämtliche bisherigen Worksheet-, Tabellen- und Relationsbytes. Alle 7.482 neuen Tabellenzellen stimmen nach Artifact-Reimport.

Sieben Ansichten wurden gelesen: alle drei neuen Blätter sowie Anfang, Übergang R2/R1 und Ende der 808er-Tabelle. Die vollständigen 808 Zeilen wurden maschinell verglichen; nicht jede Zeile wurde visuell geprüft. Root sah zusätzlich unabhängig AusfuehrungV8-1, Varianten808-3 und BelegeV8-2 ohne sichtbaren Textverlust.

Build und Graft endeten mit Exit 0. Der Reimport schrieb sämtliche erfolgreichen Zellprüfungen, sieben Bilder und den Abschlussbericht, endete danach jedoch mit **Exit 3221226505**. Die Ursache wurde nicht festgestellt. Dieser Prozessabschluss ist kein grüner Lauf; kein wiederholter breiter Lauf oder Excel-Desktoptest wird behauptet.

Die 16 geschützten alten ACTIVE-Produkte blieben in den von Root tatsächlich verglichenen Produktfeldern identisch. Inventarmengen und nicht abgefragte Metafelder sind ausgenommen. Die sechs abgeschlossenen Kleinproduktakten bleiben unverändert.

Review.json bündelt Umfang und Grenzen. belege/Manifest.json bindet die Akte an Vorgänger und Quellen; manifest.json versiegelt das Paket. repro/ enthält den reinen Dateinachtragsweg. Die Akte löst keine weitere Produktaktion oder Freigabe aus.
