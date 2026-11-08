# Edelstahl: Designauswahl nach Variantenwechsel

## Auftrag und verbindliche Regeln

Mikails freigegebener Prio-Aufbau bleibt unverändert. Größen, Formen, Befestigungen, Logo-Regel und Preise stammen aus den bereits bestätigten Produktdaten (08.11.2026, #168). Dieser Fix ändert keine fachliche Freigabe. Root beauftragte gezielt den Ladeweg der bereits aktiven Edelstahl-Designbank r4: Start funktioniert, nach Form/Größe/Befestigung bricht die Designauswahl nach fünf Sekunden ab. Kein längerer Client-Timeout, keine neue Kundenbegrenzung, keine Layoutänderung.

## Nachgewiesene Ursache und Änderung

`shop-design-gallery.mjs::variantBinding` übersprang beim Start den Store-Scan. Bei jeder geänderten Ausführung rief es dagegen `registry.listActive()` auf und validierte damit auch Dokumente sämtlicher unbeteiligter Produkte. Diese synchrone Arbeit verhindert, dass die vorhandene viersekündige Galeriefrist rechtzeitig antwortet. Roots Netzwerkbeleg: Rechteck 15×10 cm/KGL, Request nach 5,008 Sekunden clientseitig abgebrochen.

Die Korrektur übernimmt das bestehende Prinzip des Warenkorbpfads: Gespeicherte, tenantgebundene Bindungsoptionen liefern nur mögliche Varianten-IDs. Jede ausgewählte ID wird anschließend über die aktive Registry frisch aufgelöst. Shop, Tenant, Store, Shopify-Produkt und Variante, native Produkt-ID/Revision sowie vollständige Optionen müssen identisch passen. Kein oder mehr als ein aktiver Treffer wird abgelehnt. Bestehende Preisprüfung, signierte Designziele, versteckte/nicht freigegebene Designs und Pausierung bleiben unverändert. Legacy-Adapter ohne native Bindungsquelle behalten den bisherigen validierenden Weg.

Nur Produktionsdatei: `app/workshop/shop-design-gallery.mjs`.

- Unveränderte Livebasis SHA256: `da04e5a6968e2930574705c13575861d1f62edb3d92644117e223627611888b2`.
- Geprüfter Fix SHA256: `5e750f516b5e0b5b4234e33fc0d556bc97c546097a6376772a11028f2f2d3f26`.
- Eigener Branch: `dev/mika-steel-gallery-lookup-fix-20261108`, Basis `4d2f5bec14e685c7e39c29befc28bf757aba00a9`.

## Prüfung

28 bestehende Galerietests und vier neue Variantenprüfungen bestanden. Neue Fälle: unveränderter Einstieg, andere Befestigung, andere Form/Größe, keine globalen Scans, fremde gespeicherte Optionen, fehlende aktive ID, zwei aktive Treffer, ungültiger Store/Tenant/Shop/Produkt/Revision/Optionen, falscher Preis, verborgenes Design, entzogene Designfreigabe und pausierter Konfi.

Zusätzlicher Nachweis mit dem echten freigegebenen 251er-Kandidaten: dieselben vier Fälle gegen eine isolierte Laufzeit mit 62 transitiven Modulen. Jede Abhängigkeit ist bytegleich mit dem zuvor gelesenen Servermanifest; ausschließlich die Galeriedatei trägt den Fix. Das ist insbesondere wegen des gesonderten Live-Stands von `family-formats.mjs` wichtig. Kandidat-SHA: `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`. Er wird nicht geändert oder im PR kopiert.

Kommandos: `node --test app/workshop/shop-design-gallery.test.mjs app/workshop/shop-design-gallery-variant.test.mjs`; zusätzlich gezielte Variantenprüfung mit `GRAVURU_GALLERY_RUNTIME` und `GRAVURU_GALLERY_CANDIDATE` auf den gesicherten lokalen Dateien. Echte Shopify-IDs, Kundendaten oder Sitzungsschlüssel werden nicht benötigt. Das lokale Modell-Timing ist kein belegtes Server-Timing.

## Veröffentlichung und Rückweg

Root hält den exklusiven Server-/Browserzugriff. Vor Austausch die tatsächliche Live-Datei auf den oben genannten Vorher-SHA prüfen und separat sichern. Nur diese eine Datei übertragen, Nachher-SHA prüfen und die vorhandene Anwendung kontrolliert neu starten, damit der ESM-Modulcache den neuen Stand lädt. Keine DB-/Shopify-/Themeänderung, keine Übernahme des achtteiligen privaten Operator-Overlays. Rückweg: exakt die gesicherte Einzeldatei wiederherstellen und kontrolliert neu starten. Alte Kundenentwürfe und Bestellungen bleiben unangetastet.

Nächster Schritt durch Root: frischen Kundenstart öffnen, Startdesign/D3 sowie Rechteck 15×10 cm/KGL prüfen, Design wählen, Warenkorb vergleichen; tatsächliche Ladezeit und HTTP-Erfolg dokumentieren. Bis dahin ist dies ein lokal getesteter Fix, kein behaupteter Liveabschluss.
