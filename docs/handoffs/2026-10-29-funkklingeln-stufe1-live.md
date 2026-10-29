# PR #56 Stufe 1 – genau ein Metafeld live

29.10.2026 · Codex/Astra · **Ausgeführt und anschließend angehalten.**

## Freigabe und Umfang

Chris schränkte seine vorherige allgemeine Freigabe ausdrücklich ein: **„hast aber auch eine neue nachricht issue 57 Du darfst pr56 ausführen: genau 1 mETAFELD“**. Ausgeführt wurde ausschließlich die eine Änderung aus [Issue #57, Nachricht 1](https://github.com/Chris83638w/gravuru-2027/issues/57#issuecomment-6499018877).

- Produkt: AOSU Pro Hochformat 16 × 28 cm, `16124413084028`.
- Metafeld: `custom.customization_id`, Typ `single_line_text_field`.
- Wert: `cfg_c3ee3fcf-bf87-42e3-af2a-98b680cdb576`.
- Vorher frisch gelesen: ACTIVE, veröffentlicht, Metafeld nicht vorhanden.
- Mutation mit **compareDigest:null**, genau ein Input, keine anderen Produktfelder.
- Ergebnis: **1 Metafeld geschrieben / 0 userErrors**; Shopify-Änderungszeit **14:14:46 UTC / 16:14:46 Europe/Bucharest**.
- Neue Metafeld-ID: `gid://shopify/Metafield/200525930004860`.
- Separater Readback bestätigt ID, Wert und Digest.

[Journal mit Vorher/Nachher und Request](funkklingeln-einstieg-20261029/stufe1-live-journal.json).

## Öffentlicher Nachweis

[Produktseite öffnen](https://gravuru-design.myshopify.com/products/klingelschild-aosu-pro-v8p1ax11-personalisiert).

Anonymer öffentlicher GET um **14:17:06 UTC**: HTTP 200, keine Umleitung; genau ein `#gravuru-konfi`, Embed-Modul vorhanden, richtige Produkt-ID, Startvariante `57465408291196`, 120 Varianten im Einstiegsdatensatz.

Chrome-Sichtprüfung: genau ein sichtbarer grüner **„Jetzt personalisieren“**-Button. Ziel enthält richtige Produkt-ID, Startvariante und Rücksprungpfad. Screenshot lokal gesichert als `produktseite-einstieg.png` und im Chat angezeigt. Keine manuelle Überprüfung des vollständigen Editors durch Chris vorweggenommen.

Zusätzlicher lesender Abgleich aller 126 Produkte gegen den vorbereiteten Plan: **nur dieses eine Produkt hat einen geänderten Metafeld-/Publikationsstand**. Verbleibend: **41 fehlende Metafelder, 84 unveröffentlichte Produkte**.

## Stopp / nächster Schritt

Keine weiteren Metafelder gesetzt, keine Produkte veröffentlicht. Kein Theme-, App-, Server-, Bindungs-, Varianten- oder Preis-Schreibzugriff; kein Merge/Deployment, kein Warenkorb oder Auftrag. Editor nicht geöffnet; PC-/iPhone-Abnahme übernimmt Chris wie in Issue #57 vereinbart.

Die vorherige allgemeine Freigabe wird nach Chris' Konkretisierung nicht für Stufe 2/3 verwendet. Erst nach seiner Sichtprüfung und neuem ausdrücklichen Satz fortsetzen. Teil C / PR #54 bleibt offen; automatische Werkstatt-/Fertigungsübergabe wird nicht als fertig bezeichnet.
