# Hauptacryl: bestehende Kategorien und Ressourcenauflösung

Quelle: `app/workshop/profile-library.mjs:180–203` bei `630adcc0ee6dcdbb04e4345452d07604b83f59cb`, Blob `c67b4b3cbdcee96b497fa8a3f429afac0d75cfb5`, SHA256 nach reiner CRLF→LF-Normalisierung `d3aa96dd7800f3e98bd2706b20bb2a0eb5b47adc9172099547453225e8460e51`. Keine neue Fachregel: Dies ist die bestehende native Reihenfolge, auch belegt durch `profile-library.test.mjs:90–111`.

Für jede der vier Ressourcenarten fonts/motifs/colors/bestsellers gilt:

1. Standardzuordnung anwenden.
2. Kategorien in **gespeicherter Reihenfolge** durchlaufen: zuerst `extern-shopifyproductid-16190784602492`, danach `linie-acryl-tuerschilder`.
3. Produktzuordnung anwenden. Hier bleiben alle vier ausdrücklich `inherit`.

`inherit` verändert die bisherige Auswahl/Herkunft nicht; `empty` ersetzt sie durch eine explizit leere Liste; `override` lädt den aktuellen Kopf des genannten Profils mit dessen Revision. Die **letzte nicht-vererbende** Kategorie gewinnt. Fehlende Kategoriezuordnung wird übergangen; eine vorhandene ungültige Zuordnung/fehlende Profilrevision führt zum Fehler, nicht still zum Standard. Danach werden Bestseller auf eine ggf. eingeschränkte Motivauswahl gefiltert. Bei ungebundener Auswahl bleibt `null` erhalten, nicht `[]`.

Die IDs haben aufgrund ihres Namens keine Sonderpriorität. Entscheidend ist ausschließlich ihre Reihenfolge im Dokument. Das Beibehalten der vorhandenen Kategorien kann daher Auswahl, Quellen-ID oder Profilrevision gegenüber `categoryIds:[]` ändern. Selbst bei identischer Auswahl kann ein anderer Profil-/Kategorie-Herkunftspin vorliegen. Der veröffentlichte Helper630adcc prüfte ausdrücklich nur `[]` und Standardzuordnungen; dessen gemeldete 0 Abweichungen belegen diesen neuen Fall **nicht**.

Beim nativen Speichern/Validieren benutzt `http.mjs:156` `profiles.resolve(document)` und speichert das Ergebnis in Revisionsmetadaten. Ein ausdrücklich versionierter Editor nutzt den gespeicherten Metadatenstand, der unversionierte aktuelle Editor löst erneut auf (`http.mjs:308`). Daher aktuelle Auflösung, historischer lokaler v9-Snapshot und bereits gespeicherter tatsächlicher Rev1-Snapshot getrennt ausweisen. Dieser Vergleich verändert keine eingebetteten Originalfont-/SVG-Ressourcen.

## Eng begrenzter Prüfhelfer-Vorschlag

`main-target-category-compare-helper/` enthält eine getrennte Erweiterung des veröffentlichten Kopienhelfers. Sie akzeptiert ausschließlich die beiden genannten Kategorien in genau dieser Reihenfolge und vier Produkt-inherit-Zuordnungen; tatsächliches und vorgeschlagenes Dokument müssen diese Angaben identisch behalten. Alle bisherigen Produkt-, Dokument-, Bindungs-, Mapping-, Intent-, Mandanten- und Kopiensicherungen bleiben bestehen. Ein neuer expliziter `--resolver-source` bindet die Projektion an die oben gelesenen nativen Quellbytes; kein HEAD-Guard und kein App-Import/Konstruktor auf einer echten Kopie.

Die Projektion gibt nur folgende technische Belege aus: Quellen-IDs/-Revisionen, geordnete Kategorie-IDs, Vorhandensein und Hash der beiden Kategoriezuordnungen, Settings-Revision mit Hash der gespeicherten JSON-Bytes und kanonischem Dokumenthash, Profile-IDs/-Revisionen und Dokumenthashes aller tatsächlich durchlaufenen Overrides, Auswahlzahlen/-hashes, Zahl ausgefilterter Bestseller sowie Änderungsliste Standard-only → Kategorien. Vollständige Auswahllisten, Profilnamen, unbeteiligte Kategorien und Bibliotheksinhalte werden nicht ausgegeben.

`categoryChangesSelections:[]` und `categoryChangesSources:[]` wären der gesonderte Beleg, dass die beibehaltenen Kategorien auf **dieser** konsistenten Kopie nichts ändern. Vorhandene Nicht-inherit-Kategoriezuordnungen werden ausdrücklich geprüft und im Herkunftsweg sichtbar. Ohne tatsächlichen Kopienlauf bleibt das Ergebnis offen. Ein einmaliger passender Kopienstand beweist außerdem keinen unveränderten zukünftigen Bibliotheksstand; Settings- und Profilpins sind vor einer späteren Übernahme erneut abzugleichen.

Die native Ressourcenverfügbarkeit gegenüber dem aktuell geladenen Font-/Motivkatalog ist bewusst kein SQL-Sicherheitsersatz: `catalogAvailabilityValidated:false` bleibt sichtbar. Der echte Resolver prüft dabei zusätzlich die Katalogmitgliedschaft. Die enge Projektion wurde gegen native `createProfileLibrary().resolve()` ausschließlich auf erzeugten Testbibliotheken verglichen; es wurde kein nativer Bibliothekskonstruktor auf der Operator-Kopie gestartet.

14 gezielte synthetische Tests bestanden: 9 vollständige Kopienhelperfälle einschließlich 808/778+30, plus 5 Resolverfälle (echtes natives Vergleichsergebnis; Overridefolge/inherit/empty; gleicher Inhalt bei anderem Quellenpin; fehlende Kategorien; Bestsellerfilter; geänderte Quellbytes/falsche Reihenfolge/fremder Mandant; falscher Profiltyp). Testdatenbankbytes blieben im Leseschritt unverändert. Kein Serverzugriff, keine Änderung an App/v9/alter Preview und kein Shopzugriff.

Neue Metadaten-Zielpins stammen separat von product_plans: Produktgruppen-/Transporthash `ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407`, ID-Binding-Hash `f0bb7d95e89e3aae66ab04454d6476132fe197aaae7c1da48ce8209ced62d285`. Der endgültige Helfer pinnt zusätzlich den dazu passenden aktualisierten Intent; weder alte Zielhashes noch ein alter Intent dürfen als neuer Freigabebeleg weiterverwendet werden.
