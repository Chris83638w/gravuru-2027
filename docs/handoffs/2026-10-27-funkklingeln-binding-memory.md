# Bindungsaktivierung: begrenzter Speicher und lineare Bestandsprüfung

Codex, 27.10.2026. Basis main b5b241c56e03fdb4a26b6378e124cb0959d63193; Aufgabenbranch dev/doorbell-binding-memory-20261027.

## Befund und Grenze

Der Server-Dryrun prüfte die drei AOSU-Produkte und 360 Shopify-Varianten erfolgreich. Der nachfolgende Apply endete nach ungefähr 32 Sekunden ohne Bericht oder Logausgabe. Laut separater lesender Serverprüfung blieben für die drei AOSU-Produkte Bindungsrevisionen und Live-Freigaben bei 0. Bestehende Kundenproduktseiten wurden nicht umgestellt.

Die 407-MB-Datenbank wird beim openWorkshopDb-Aufruf nicht insgesamt in JavaScript geladen. Der Repository-Konstruktor liest gegebenenfalls aktuelle Produkte einzeln zur Reparatur des abgeleiteten Katalogindexes. Order-Intake und Profilkonstruktoren laden beim Öffnen keine kompletten Bestellhistorien. Die drei echten AOSU-Dokumente sind jeweils ungefähr 150 KB groß; auf dem Server bestehen derzeit sechs alte Bindungen. Weder Speichermangel noch Prozesslimit ist als tatsächlicher Abbruchgrund belegt.

Drei unabhängig bestätigte Kosten wurden gezielt behoben:

- persist() hielt pro Variante einen vollständigen Produktrecord bis zum Transaktionsende. Nun teilen Varianten derselben Produktrevision einen identischen geprüften Record. Die Map existiert ausschließlich innerhalb derselben BEGIN-IMMEDIATE-Transaktion, nach sämtlichen bisherigen Einzelprüfungen und zusätzlichem DeepEqual. Quellen-, Metadaten-, Status-, Preis-, Revisions-, Head- und Frischeprüfungen bleiben erhalten.
- orderIntake.bindings() ersetzt 1+2N SQL-Abfragen durch einen mandantengebundenen LEFT JOIN. Alle bisherigen Shops/Produkte bleiben im Ergebnis; weder globale Konflikte noch fremde Produktbindungen werden ausgeblendet.
- readiness() indexiert die vollständige frisch gelesene Bindungsliste innerhalb eines Aufrufs. Varianten-Produkt-Konflikte und doppelte Auswahl innerhalb der aktuellen Produktrevision bleiben vollständig geprüft. Auch die bisherige Reihenfolge der Konfliktmeldungen bleibt erhalten. Keine Wiederverwendung zwischen Aufrufen oder über await.

## Prüfung

12/12 gezielte Tests bestanden unter 128-MB-Heap:

node --max-old-space-size=128 --test app/workshop/shop-product-binding-store.doorbell-memory.test.mjs app/workshop/order-intake.binding-list.test.mjs scripts/doorbell-shop-bind.test.mjs scripts/doorbell-pilot-bind.test.mjs

Enthalten: 100 native Bindungen mit 512 KB synthetischen Metadaten, genau ein dauerhaft gehaltener Produktrecord, unveränderte Preis-/Optionsbindungen, Ablehnung und atomarer Rollback bei später verändertem Record; 15.120 Bindungen mit genau einem SELECT; Mandantentrennung, komplette Shopliste, frisches Wiederlesen und globale Konflikte; voller 3-Produkte-/360-Varianten-Pilot samt drei exakten Freigaben und Wiederholung. Abschließende readiness-Reihenfolgekorrektur erneut gezielt bestanden. Unabhängiger Code-Review ohne funktionalen Blocker.

Alle Tests verwendeten synthetische lokale Daten. Keine Serverdatenbank oder Shopify-Einstellung durch diesen Teilauftrag geändert.

## Nächster Schritt

Nach Merge exakt diesen Codestand auf dem bestehenden Host bereitstellen. Vor erneutem Apply zuerst lesend openWorkshopDb und erste Variantenprüfung mit Stage-Zeitstempeln, process.memoryUsage(), process.resourceUsage().maxRSS und tatsächlichem Child-Exitcode/Signal erfassen. Die übergeordnete Bereitstellung bereitet diese Probe vor. Bei externer Beendigung Plesk-/Kernel-/Prozesslimitbelege prüfen; Heap nicht blind erhöhen.

Die vollständige Bindungsliste wird weiterhin pro Prüfschritt gelesen und gehasht. Die quadratischen SQL-Abfragen und readiness-Scans sind entfernt; das ist keine Zusage konstanter Gesamtlaufzeit für 15.120 Varianten. 60-Sekunden-Frischefrist, Transaktionen, Live-Freigaben, Webhooks und Hostflags wurden nicht gelockert. UI/Warenkorb und anschließende vollständige 126er-Freigabe bleiben separate reale Abnahmen im bestehenden Auftrag.
