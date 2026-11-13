# Warenkorbstatus – Bericht vom 13.11.2026

Status **teilweise geprüft**. Sechs Bild-/Textvorschläge vom 12.11. bleiben unverändert und ungeprüft durch den Nutzer; kein Shopwrite oder Publish durch dieses Paket.

## Tatsächlicher Warenkorb am bestehenden Produkt

Der frisch gelesene [Claude-Bericht vom 13.11.](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6847480102) bestätigt den echten Konfigurator-zu-Shopify-Weg für ACTIVE-Edelstahl 16190784438652, Variante 58104606556540, RE 12×8 ohne Bohrung: 1999 Cent Grundpreis plus 169 Cent Hausmotiv ergeben 2168 Cent. Die berichteten Warenkorbfelder price, original_price und final_line_price sind jeweils 2168 Cent. Anschließend entfernte Claude ausschließlich die neu hinzugefügte Testzeile; der vorherige Warenkorb blieb erhalten. Keine Kasse, Bestellung oder Zahlung. Dies ist Claudes Operatorbericht, kein erneut von Astra ausgeführter Carttest.

Dieser Einzelpfad beweist weder Foto-/Logoaufschläge noch Staffeln, Mengenänderung, CartEdit-Zeilenersatz oder sämtliche Felder der sieben neuen Produktstände. Claude meldet außerdem eine anfängliche Überlappung des hinzugefügten Hausmotivs mit Rosenberg. Dieser separate Platzierungsbefund ist offen. Der Bericht nennt eine direkte Nutzerfreigabe an Claude; daraus folgt keine neue Veröffentlichungsfreigabe.

## Sieben Entwürfe und Preisquelle

Die [Prüfung 6dd50ed0](https://github.com/Chris83638w/gravuru-2027/blob/6dd50ed0/ops/plesk/warenkorb-20261112/README.md) enthält sieben DRAFT-bedingte HTTP-422-Ablehnungen. Das ist ein Sperrnachweis, kein erfolgreicher Warenkorb dieser Produkte. 438/438 bezeichnet Preisfälle mit tatsächlichen Preisfeldern in der JavaScript-Quelle, keinen vollständigen aktiven WASM-/Instruktionsnachweis. Das Originalbinary mit 20977 Bytes und SHA256 a5c59354755dcf73bdeca8006134847549d8712f70277634fab405db93532da2 ist nicht verfügbar. Ein anderer Build darf nicht als identisches Original gelten.

## Galerie, Menge und mobile Ansicht

Der spätere [Galerieeinbau ff1f1ca](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6835153436) ist laut Claude installiert: gemessene warme Abrufe 1,66–1,87 Sekunden, erster Abruf nach Neustart 3,3 Sekunden. Keine Aussage unter einer Sekunde.

Die zwei lokalen Korrekturen [aea809f](https://github.com/Chris83638w/gravuru-2027/blob/aea809f/docs/handoffs/2026-11-13-cart-mobile-fixes.md) sind mit 13/13 Mengen-/CartEdit- und 5/5 Mobilfällen, unabhängigen Reviews sowie lokaler Chrome-Sichtprüfung bei 390×844 an Claude übergeben. S82 behält Menge10/80,70€ nach vollständigem Neuladen; Main, A52 und S82 sind vollständig sichtbar, Vollbild/Reset/Abbruch geprüft. Das belegt keinen Einbau auf dem Host und keinen physischen Handylauf. Details: [Mobilbericht](mobile-konfi-review-20261113.md). Die bestätigten 5-mm-Schraubenköpfe bleiben unverändert.

Die frische lesende Produktprüfung [data/product-status-final.json](data/product-status-final.json), 13.11. 08:23 UTC, bestätigt sieben DRAFTs mit 808+45 Varianten. Bei den sechs kleinen Produkten sind Bilder und Beschreibungstexte noch leer. Diese Lesung prüft Status/Zähler, nicht erneut alle Variantenfelder.

Die [Statusdatei](data/cart-review.json) versorgt die Freigabeseite. Bilder-/Textfreigabe, Appinstallation und spätere Veröffentlichung bleiben getrennte Entscheidungen. Kein Publish als Testumweg.
