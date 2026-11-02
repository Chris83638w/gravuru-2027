# Issue 139: erste Produktbindungen und Ladefehler · Codex · 02.11.2026

Chris verlangt im laufenden Chat, beide Astra-Bereiche selbst live zu setzen. Optionen bleiben produktspezifisch. Alle Preise/Staffeln stammen aus Katalog und bestätigten Regeln; keine neuen Designs oder Freigaben erfunden. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Tatsächlich veröffentlicht

PR 145/main `6b752ca` und Shopify-App-Version `gravuru-2027-issue139-pricing-20261102-v1` seit 14:14/14:15 UTC live. WASM-SHA `7ebe66dea6371c7b5286f5b4a63296abf46908c43605c34e0201631037c46336`, 26 Linux-Tests und zehn kompilierte Fälle. D8-Preisrevision 2 enthält den vorherigen V2-Stand einschließlich exakt gespeicherter Altangebote; D10-Preisrevision 1. App-eigene Metafelder nachgelesen.

Zwei bestehende ACTIVE-Produkte, jeweils fünf Befestigungen und 208 freigegebene Designs, fester Start/12×8, ohne Foto/Logo:

- [Leuchtturm D8](https://gravuru-design.myshopify.com/products/tuerschild-abger-ecken-v2a-personalisiert-leuchtturm-12x8): Shopify 16077798965628, Konfi `cfg_98436fb0-886d-4af8-bc11-f45ef809684c` r4.
- [Laubbaum D10](https://gravuru-design.myshopify.com/products/tuerschild-abger-ecken-v2a-personalisiert-laubbaum-12x8): Shopify 16077799063932, Konfi `cfg_9f058cdb-85c1-45dd-8783-f45931d1e193` r2.

Alle zehn Varianten nach frischem Shopify-Preisabgleich gebunden; beide vollständigen Produkte in `catalog_live_order_approvals` freigegeben. Vorlage `konfi`, feste Produktschnitt-Metafelder und customization_id 4100000/4200000 gespeichert/nachgelesen. Produkt-IDs, ursprüngliche Varianten-IDs, alte Konfigurationen und bezahlte Stände erhalten. Aktuelle Werkstattdatenbank vor Import per SQLite-Backup gesichert/integritätsgeprüft. Gesamtabgleich aller fünf Varianten überschritt die 60-Sekunden-Frischegrenze und rollte ohne Aktivierung zurück; anschließend jede Variante einzeln frisch geprüft/gespeichert, Produktfreigabe erst nach vollständiger Bindung. Frischegrenze unverändert.

## Beim Kundentest gefundene Ladefehler

Die echte 208-Design-Galerie war erst nach etwa 102 Sekunden bedienbar; der vorher eingeblendete Wartehinweis blieb stehen. `shop-embed.mjs` blendet ihn jetzt bei der verspäteten vertrauenswürdigen Bereitschaftsmeldung aus, außer während einer laufenden Warenkorbübergabe. Herkunfts-/Fensterprüfung unverändert.

`adapter.mjs` projizierte für jeden Vorschauzugriff alle Familienvorlagen erneut. Das gewählte Familienprofil wird nun für unveränderte physische Optionen wiederverwendet. Der 64-Karten-Cache wurde bei 208 Designs ständig geleert; Familien behalten nun die Vorlagen der aktuellen Ausführung und verwerfen sie beim Optionswechsel. Funkklingeln behalten ihr bisheriges Verhalten, insbesondere PR 146/Dropdowns. Keine Preis-, Geometrie-, Freigabe- oder Designänderung.

44 bestehende gezielte Tests bestanden; Browserprüfung des verspäteten Ready-Signals, ausbleibender erneuter Warnung und weiterhin sichtbarer Warenkorbübergabe bestanden. Lokaler Build erfolgreich. Kandidatenvergleich mit echten Produktdaten: D8 bedienbar nach 23,2 statt 101,8 Sekunden; kompletter Weg mit fünf geänderten Texten und Menge 3 in 66,3 Sekunden. Echter Shop-Warenkorb: 3 × 18,99 = 56,97 Euro, korrekte Varianten-ID und Bearbeiten-Link. Kandidatenpaket im Prüf-Browser ersetzt; dieser Geschwindigkeitsnachweis ist noch kein Live-Nachweis des Pakets.

D10-Kundenweg mit bisherigem Paket ebenfalls bis zum echten Warenkorb bestanden: 19,99 Euro, richtige Variante und Bearbeiten-Link, jedoch mit Wartehinweis und 240 Sekunden Gesamtdauer. Beim ersten D8-Lauf beendete der erwartete Seitenwechsel eine Browserauswertung; die wiederholte Warenkorbprüfung war erfolgreich. Keine Zahlung/Bestellung ausgelöst.

Private Servernachweise: `private/issue139-live-20261102-nachweis/pricing`, `wave-12x8`, `loading`. Im gleichen Zeitraum veröffentlichte ein anderer Chat PR 146 nach `private/funkklingeln-dropdown-20261102`. Diese Laufzeit enthält alle neuen Preis-/Katalog-Bestellfunktionen unverändert und ist Grundlage dieser Korrektur. Vor Veröffentlichung aktuelles main/Live-Einstieg erneut abgleichen.

## Offen

Ladepaket aktivieren, beide Kundenwege ohne Testersatz erneut prüfen, Handy/Bearbeiten/Zusatzmotiv und Produktionsdateien prüfen. Bilder/SEO/Collections der ersten zwei Produkte noch nicht neu erstellt. Helium 10 DE abgefragt: „namensschild haustür“ 3.239, „türschild familie“ 198 monatliche Amazon-Suchen; weitere vier gelieferte Begriffe mit 0, zwei angefragte nicht geliefert. Kein Google-Suchvolumen daraus ableiten. Restliche Größen/Unterkategorien und Linien aus beiden Astra-Teilen sowie offene AE-/Schieferquellen weiterhin nicht erledigt. Issue 139 bleibt offen.
