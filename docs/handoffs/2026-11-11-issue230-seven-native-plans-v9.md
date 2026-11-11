# Sieben Produktpläne – finaler Prüfstand v9

11.11.2026. **Alle sieben gespeicherten nativen Pläne sind jetzt technisch gültig: valid:true, keine offenen Planfehler. 823 von 823 Variantenpreisen stimmen mit den unveränderten Originalakten überein.** Noch keine Bestätigung oder Ausführung der Pläne und keine Veröffentlichung.

Chris bestätigte ausdrücklich: „Ja, inklusive 19 % MwSt.“ Das gilt für sämtliche angegebenen Grund- und Aufpreise der sieben Produkte. Die Beträge bleiben unverändert. [Dauerhafter Entscheidungsbeleg in #230](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6804508025). Der später ergänzte Link ändert das bereits gepinnte Entscheidungsmanifest nicht. Die bereits am 20.10.2026 bestätigte Mengenstaffel bleibt bestehen; eine erneute Rabattentscheidung war nicht erforderlich.

| Produkt | Varianten | Verfügbare native Designs | Foto | Logo |
|---|---:|---:|---|---|
| Acrylglas-3mm | 778 | 1205 | AN | SVG AN |
| Acrylglas-3mm-5x2 | 10 | 27 | AUS | AUS |
| Acrylglas-3mm-6x2 | 10 | 27 | AUS | AUS |
| Acrylglas-3mm-8x2 | 10 | 27 | AUS | AUS |
| Edelstahl-5x2 | 5 | 27 | AUS | AUS |
| Edelstahl-6x2 | 5 | 27 | AUS | AUS |
| Edelstahl-8x2 | 5 | 27 | AUS | AUS |

Die Staffel beträgt ab drei Stück 5 %, ab fünf 10 % und ab zehn 15 %. Sie gilt nach dem vorhandenen Vertrag auf den vollständigen Stückpreis einschließlich Befestigung, zusätzlichem/geändertem Motiv, Foto und SVG-Logo. Es gilt die höchste erreichte Stufe, einmal kaufmännisch auf ganze Cent gerundet. Der vorhandene Mengenanschluss rechnet je Warenkorbposition; eine neue Zusammenfassung unterschiedlicher Positionen wurde nicht eingeführt.

Bestehende Designs, Startvorlagen, Größen und Standardauswahlen werden beibehalten. Der Wunsch nach einem anderen Bild bezog sich auf das Shop-Produktbild. H1 wurde separat am vorhandenen Acrylprodukt übernommen; das ist kein Austausch einer Konfiguratorvorlage. Foto/Logo im großen Acrylprodukt bleiben AN; in allen sechs kleinen Produkten AUS. Die bestätigten Aufpreise von 999/1299 Cent sowie 169 Cent je zusätzlichem/geändertem Motiv und die Befestigungspreise bleiben erhalten.

Die sechs Kleinprodukte verwenden weiterhin genau die bestätigten 13 Auswahlmotive. Eingebettete Originalmotive bleiben erhalten. Rang 0 steht vor Rang 1. Hauptprodukt: 1.205 verfügbare native Designs aus 1.216 eindeutigen angefragten Haupt-IDs; neun native Geometrieausnahmen bleiben ausgeschlossen und zwei bewusst versteckte Designs bleiben versteckt. Die ursprüngliche Gesamtliste enthält 1.298 Zeilen, aber 1.297 eindeutige IDs. TRE-V2A-7x2-D34 bleibt einmal mit Rang 0 enthalten. Es wird keine Verfügbarkeit aller 1.298 Zeilen behauptet.

Die neun Geometriebefunde stehen in ../reviews/2026-11-11-issue230-native-plans-v9/design-exclusions.json und den beigefügten früheren Messberichten. Originale, Konturen und Toleranzen wurden nicht verändert. Bei unverändertem D1-Text auf 5×2 und 6×2 cm bleibt der bekannte Platzhinweis für ein zusätzliches 10-mm-Seitenmotiv; es wird kein Text automatisch verkleinert.

## Was v9 verändert

Der unveränderte v8-Bestand wurde über eine konsistente SQLite-Sicherung in ein neues lokales Verzeichnis übernommen. Die sieben echten Quellen und Vorlagen besitzen jetzt jeweils Revision 2. Die Quellen erhalten ausschließlich separate Metadaten zur bestätigten Steuer-/Staffel-/Designentscheidung. Produktdokumente und kompilierte Produktinhalte sind in kanonischer JSON-Darstellung identisch zu v8; es gibt kein erfundenes tax-Feld im Produktvertrag.

Die 15 bisherigen Planfehler waren ausschließlich offene Freitextfragen. Sie wurden einzeln mit ihrer Entscheidungsquelle abgeglichen und in neuen Vorlagenrevisionen entfernt. Der Hinweis auf weiterhin ausgeschlossene Designs steht als Prüfhinweis im Paket und erzeugt keine neue Auswahlpflicht. Anschließend erzeugte der unveränderte native Planservice sieben neue gültige Pläne. Die sieben historischen v8-Pläne bleiben zusätzlich in der lokalen Datenbank erhalten: **7 aktuelle v9-Pläne, 7 historische v8-Pläne, 7 Quellen, 14 Quellrevisionen, 0 Bestätigungen, 0 Ausführungen.**

Die neuen Excel-Nachträge beziehen sich auf genau diesen Stand; sämtliche bisherigen Blätter und Originalpreise bleiben erhalten. Das erste aktuelle Blatt ersetzt die historischen Offen-Vermerke zu Starts, Steuer und Mengenstaffel. Die endgültige Gesamtfreigabe bleibt ausdrücklich offen. Das externe Excel-Manifest bindet die neuen Dateien; der native creationKey bleibt an die Originalpreisakte gebunden.

## Nächster Schritt

Die fachlichen Angaben sind geklärt und die sieben lokalen Pläne technisch gültig. Das Paket ist keine Freigabe eines produktiven Imports. Claude prüft zuerst die tatsächlich geeignete Zielregistry, vorhandene Produkt-IDs und Bindungen. Lokale cfg-IDs und Planhashes sind Prüfstandsreferenzen; beim Aufbau im echten Register können neue IDs/Hashes entstehen. Die einmalige abschließende Stapelabnahme erfolgt deshalb erst am tatsächlich geeigneten, konkreten Ausführungsumfang. Dieses lokale Paket begründet keine vorgeschaltete zweite Freigaberunde.

Claude gleicht die Zielprodukte, Varianten, vorhandenen Bindungen und den tatsächlichen Serverstand ab und integriert die bereits gesicherten Codeänderungen gezielt. Keine pauschale Laufzeitkopie. Vor einem späteren Vorgang die Quell-/Template-/Modulrevisionen und zusätzlich die separaten Motivprofilrevisionen/Hashes vergleichen: Der native Planservice schützt die Motivbibliothek-Revision nicht automatisch. Warenkorb-, Bestell- und Produktionsprüfung bleiben getrennte Schritte. Die Ausgliederung der Edelstahl-Kleinformate gehört in einen konkret abgeglichenen Umsetzungsplan.

Dieser v9-Lauf hat keine Shopify-, Server- oder Live-Datenbankänderung ausgeführt. Die separat bestätigte H1-Bildübernahme bleibt davon unberührt. Die historischen v8- und 9b0a4fd-ZIP-Pakete werden nicht verändert.

## Exakte Planpaare

| Produkt | Native Plan-ID | planHash |
|---|---|---|
| Acrylglas-3mm | pgp_80a0c3b9-b599-428f-8626-05e3ace880b6 | 83cd95dc900fcbc9631086f54c26591e2dbab75d285cc80fa46d64673f63bb33 |
| Acrylglas-3mm-5x2 | pgp_7307b213-09ef-4758-b525-88aea139502d | cd2405c8f0a53544cfaaf87f97d84234ba9c51d58ec6b0e388bb7212ef141392 |
| Acrylglas-3mm-6x2 | pgp_6831ea29-73f3-40c4-abfa-834c8479d93d | df492d24f7da24f765ff62b8b03daf44865d839045191f3b3e449ca8f37cc09f |
| Acrylglas-3mm-8x2 | pgp_1d526e2a-fe1d-4749-be52-5386cf227afe | 8531d241fd230a52a14a4c77bf314bdc49c578a679fc5d0d1d9a6a439f995d53 |
| Edelstahl-5x2 | pgp_7699e1dc-2f19-427d-a983-0fd6610f9bd9 | 24840f5fe16a074e5f842ae85bb6529285bee334254d5d82d99f98efc9f09117 |
| Edelstahl-6x2 | pgp_b216801b-a754-447b-be24-308e5f47de18 | 8423f66172c8ff0258d5ca60591f42861457ba9634805d92941431dcfbf0764f |
| Edelstahl-8x2 | pgp_869d2800-de7c-48d6-96f4-87a5f889186e | 634a3d3f45e462a03a4b79add03cc0d323e7587378d8cc402a3495f638652199 |

Codebasis: 64e026e8fd15b129a16cc97189b28506aa9e8ac2. Katalog: 8236b8bfab7322447ec46661c116fa526331af3d. Originalpreisakten: bf8824c80347f63ffeb2c05cc9a34a9ffed6f9bd. Entscheidungsmanifest (kanonischer SHA-256): 730168634964272693b514e3efd742975bd56af30a96a7ae751a2aed7fe71a64. Vollständige Pins stehen in ../reviews/2026-11-11-issue230-native-plans-v9/summary.json.
