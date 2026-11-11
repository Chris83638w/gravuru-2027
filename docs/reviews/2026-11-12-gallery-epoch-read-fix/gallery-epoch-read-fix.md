# Galerie: kompakte Revisionsbelege je unverändertem Datenbankstand

12.11.2026. Lokale Implementierung nach dem Operator-Phasenbeleg #168·6809368576: Bindungsprüfung rund 81 s (Dokumentlesen 58,7 s, Hashen 19 s, Parsen 1,8 s), darunter keine beobachtete 1-GB-Spitze. Der tödliche Anstieg folgte erst beim Snapshot-Encoding/-Schreiben. **Dieser Patch reduziert wiederholte Bindungslesungen; er behauptet keine Behebung der getrennten Encoding-Spitze.** Kein Serverlauf, Commit oder Staging.

## Änderung

Nur `app/workshop/shop-product-binding-store.mjs` und die neue Testdatei `app/workshop/shop-product-binding-gallery-epoch.test.mjs` gehören zu diesem Teilpaket. Der vorhandene `databaseEpoch` bleibt unverändert und wird ausschließlich von `listActiveForGallery` für seinen eigenen kurzlebigen Cache verwendet. Der Schlüssel liegt innerhalb derselben Store-/DB-Instanz und umfasst Produkt-ID plus festgehaltene Revision.

Bei unverändertem Epochwert werden die bereits berechneten Rohbytehashes von Dokument/Metadaten wiederverwendet. Produktkopf, Archivierung, Art und Revisionsstatus werden weiterhin pro Bindung aus der Datenbank gelesen; gespeicherte Bindung, Optionen und Preis werden ebenfalls weiterhin frisch geprüft. Bei einem Epochwechsel erfolgt wieder ein vollständiger Rohvergleich gegen den ursprünglichen Beleg. Ein geänderter Stand wird nicht zur neuen Ausgangsbasis erklärt. Eine zweite Epochprüfung umfasst auch den Dokument-/Digest- und Bindungsleseabschnitt; erst danach werden die kompakten Werte zur Wiederverwendung gespeichert.

Der Cache enthält keine Rohstrings oder vollständigen Produktobjekte und endet mit diesem Galerielauf. Bei einer bereits bestehenden DB-Transaktion wird er nicht benutzt. `resolve`, `resolveMany`, `listActive`, `persist`, der rohe Write-Snapshotguard, die REPLACE-/Triggerprüfungen und ihre Transaktionen bleiben im bisherigen Pfad. Keine Änderung an Preislogik, Freigabe, Tenant-/Storeauswahl, Cacheformat oder Kundenmodellen.

## Nachweis

**66/66 gezielte Tests bestanden, 0 fehlgeschlagen/übersprungen.** Ausgeführt wurden Store-, Batch-, Customer-read-scope-, Gallery-memory- und die neue Gallery-epoch-Testdatei. Vollständiger Log: `gallery-epoch-targeted-tests.txt`.

Die 15 neuen Fälle belegen insbesondere:

- Echtes SQLite mit nativer Registry sowie explizitem mandantenlosem Legacy-Schema: 101 Bindungen derselben Revision ergeben genau **2 vollständige Dokumentlesungen**, 102 Produktzeilenlesungen einschließlich dieser beiden und 101 frische Bindungslesungen. Der zweite Galerielauf liest erneut zweimal; keine Datenbankwrites. `recursive_triggers=0` bleibt unverändert. Aus dem vorherigen Quellpfad ergeben sich 101 Stempelrohlesungen plus ein Dokumentlesen/Parsen, also 102 Rohlesungen; kein gesonderter Altstand-Lastlauf wurde dafür durchgeführt.
- Eigene und fremde Metadatenänderung, REPLACE, Archivierung, Status-, Art- und Kopfwechsel zwischen zwei asynchronen Abschnitten werden erkannt; die erste geprüfte Achtergruppe bleibt erhalten, spätere betroffene Bindungen werden verworfen.
- Rückgerollte Writes sowie Haupt-/TEMP-Schemaänderungen erzwingen einen neuen vollständigen Vergleich. Bei unveränderten Daten bleiben alle 101 Bindungen erhalten; eine Schatten-Revisions-Tabelle mit geänderten Metadaten wird verworfen.
- Mutation innerhalb einer Cachetreffer-Bindungslesung wird vor der Ausgabe erkannt und ersetzt den ursprünglichen Beleg nicht.
- Auch die native Tabelle mit unveränderlichen Revisionstriggern kann per `INSERT OR REPLACE` bei ausgeschaltetem rekursiven Trigger und anschließender Wiederaktivierung keinen alten Beleg wiederverwenden.

Die bestehenden gesperrten Schreib-, CAS-, fremde-DB-, historische-Revisions-, Preis-/Options-, Rollback- und Snapshotfälle bleiben grün. Der bestehende 40×2-MiB-Retentionstest bleibt ebenfalls grün (202.712 B maximal nach GC festgehalten, 0 SQLwrites). Dieser Wert ist ausdrücklich kein Peak-RSS-Nachweis der echten 242-Produkt-Kopie.

## Pins und Grenze

- Checkout-Basis: `bf919f1751ab097cd8ac5886d70cd7b461a0f20a`; dieser Teilpatch ist noch nicht committet. Root meldete nach unabhängigem Diffreview der Epochsemantik, `productRow` und Baselinebewahrung keinen Befund.
- Store-SHA256: `119a276d75bb83a67457f0e2ad37849f27a56b7a1b4a9789f527d4efbb8bc600`.
- Neue Testdatei-SHA256: `4e852989f912adad699a3929d637f50ebf6a9e4041952d7e378ca2532be81086`.
- Testlog-SHA256: `7bfda7fcd3a08beb3430b551b5df27fcb7f16c9e7c6c04e8a157965ff3986578`.

Die echte Laufzeitwirkung muss später im einzelnen Operator-Kopienlauf gemessen werden. Die weiterhin frischen schmalen SQL-Abfragen und Epochabfragen verursachen Aufwand; gezählte JS-Rohdokumentlesungen sind kein direkter Messwert für alle SQLite-Seitenzugriffe. Kein neuer Index oder Schreibzugriff wurde eingeführt. Der byteidentische Snapshotfix wird separat vom anderen Agenten geprüft und integriert.
