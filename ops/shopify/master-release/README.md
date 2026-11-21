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

Der neue Beleg `dog-options-compiled-proof.json` prüft V3 als kompilierte WASM-Datei: 18 gemischte Positionen mit V1/V2/V3 sowie drei abgewiesene Manipulationsfälle. Kein Live-Warenkorb-/Veröffentlichungsnachweis. Wegen alter glibc-Bibliotheken ist auf dem Plesk-Host kein Compilerlauf möglich; das geprüfte Artefakt wurde mit offizieller CLI 4.9.0 in einem getrennten lokalen Arbeitsordner gebaut.

`dog-options-candidate-proof.json` bestätigt den inaktiven Shopify-Kandidaten `gravuru-2027-slate-options-20261105-v1` (1195873796097). Der aktive Stand bleibt 1191284113409. Theme-/Konfigurationsdateien stimmen mit dem kopierten aktiven Projekt überein; vollständiger Versionsmanifestvergleich und echter Warenkorb bleiben offen. Noch kein V3-Release.

## Entwurfsnachweis unter privatem Schlüssel (21.11.2026, vorbereitet)

Chris, 21.11.2026: „Bearbeitbarer Entwurf“ soll für Kunden nicht mehr sichtbar sein. `cart_transform_run.mjs` liest den Nachweis deshalb auch aus `designPrivate` (Schlüssel `_gravuru_entwurf`) und behandelt ihn exakt wie den sichtbaren; `cart_validation_run.graphql` fragt den Schlüssel mit ab. Jede künftige Fassung aus diesem Ordner muss beides behalten und die Zeile `designPrivate: attribute(key: "_gravuru_entwurf") { value }` auch in die Abfrage der Preisfunktion übernehmen – sonst bekämen neue Positionen keinen Preis. Freigabe-Quelle der Folgefassung und Tests: `../entwurf-privat-release/`.
