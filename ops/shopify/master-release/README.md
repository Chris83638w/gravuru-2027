# Konfigurator-Master: Preisfunktion vom 30.10.2026

Chris hat die gemeinsam geprüfte Oberfläche als verbindlichen Master für alle Produktlinien freigegeben. Nur **Ausführungen** ist linienabhängig. Kein Import einer anderen Funkklingel-Oberfläche.

`price-v1.mjs` ist der unveränderte Quelltext der zuvor aktiven App-Version `gravuru-2027-shop-einstieg-20261026-v1`. Der neue Einstieg ergänzt den freigegebenen V2-Vertrag (12,99 € pro Logo) und das geprüfte Warenkorbbild. V1-Preise und Mengenrabatte bleiben unverändert. Auch V2 verwendet denselben Rabatt und dieselbe Rundung auf den vollständigen Stückpreis.

- Neue App-Version: `gravuru-2027-master-20261030-v1`.
- Bestehende Funktions-UID und Cart-Transform-Zuordnung bleiben erhalten.
- Grundlage ist eine vollständige Kopie des aktiven App-Projekts. Theme-Dateien, App-Einstellungen und Rechte werden nicht verändert.
- Veröffentlichung erfolgt mit vorheriger Kandidatenversion ohne Release und anschließendem Versionsvergleich.
- Rückweg: vorherige App-Version wieder freigeben. Keine alte Datenbank über neue Kundenstände kopieren.

Prüfung: `node --test ops/shopify/master-release/cart_transform_run.test.mjs`. Der Compilerbeleg steht in `compiled-function-proof.json`; er ist ein Beleg synthetischer WASM-Tests und ersetzt keinen Live-Warenkorbtest.

## Vorbereiteter V3-Vertrag vom 05.11.2026

V3 ergänzt bestätigte Checkbox-Zusätze über die app-eigene Tabelle `optionPrices`. `_gravuru_options` enthält sortierte, eindeutige IDs oder den ausdrücklichen Leerwert `-`, niemals Preise. `priced-options.mjs` wird von Backend und Preisfunktion gemeinsam verwendet und muss in beiden Auslieferungen vorhanden sein. V1-/V2-Arithmetik und historische Verträge bleiben erhalten. Die Änderung ist noch nicht veröffentlicht; der oben genannte Compilerbeleg belegt V3 nicht. Aktiver Shopify-Readback: `gravuru-2027-issue139-pricing-20261102-v1` (1191284113409). Aktuelles vollständiges App-Projekt vor einem Release neu zuordnen.
