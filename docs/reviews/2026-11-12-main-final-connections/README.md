# Main-Anbindung: enger Quellenreview des Standes e8c5cea7

12.11.2026. Drei tatsächlich veröffentlichte Dateien vollständig gelesen, nicht importiert oder ausgeführt. Ergebnis: **zwei konkrete Runnerbefunde gemeldet; darüber hinaus kein offener Quellbefund in diesem Abgleich.** Root hat die Hinweise bereits direkt an Claude und unter [#233·6831673236](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6831673236) übermittelt. Neue Runnerbytes werden nach Eingang getrennt geprüft; dieser Bericht ist noch keine Bestätigung eines korrigierten Standes.

## Konkrete Befunde

1. `ml-lauf.mjs:114`, `shop_draft_808_vorzustand`: Der Vergleich `bc.protectedProduct.customization?.value===CFG` ist falsch. Das tatsächlich gelesene und zu erhaltende Shopifyfeld enthält `katalog-formate-acryl-tuerschilder-familienschilder-eb5fe26624befe4a`, nicht die SQL-ID `cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0`. Andernfalls wird ein korrekter Planbeleg `bestanden:false`, und Apply stoppt später an `ml_plan_ungeprueft`. Enger Fix nur an der Runner-Vorprüfung auf den belegten Alias; keine Produktmetafeldänderung.
2. `ml-lauf.mjs:118,143`: `zaehler_unveraendert:gleich(ergebnis.vorher,ergebnis.nachher)` nimmt noch mandantenweite Tabellenzähler in die harte Plan-/Reconcile-Abnahme auf. Unabhängige berechtigte Liveaktivität könnte dadurch einen falschen Stopp auslösen. Die unveränderten Operatorprüfungen für den festen Mainstand/808 IDs bleiben verbindlich; globale Zähler gehören wie schon in `ml-update.mjs` nur in den informativen Beleg. Kein Nachweis, dass aktuell eine solche parallele Änderung stattgefunden hat.

## Übrige geprüfte Anbindung

- `ml-update.mjs` verwendet den vorhandenen nativen Updateadapter mit gepinntem Ziel, Review, XLSX und Ressourcenvergleich. Ausführung verlangt vorhandene Zustimmung und frische Sicherung. Harte Vor-/Nachprüfungen betreffen Main-R1/R2, dessen Revisionen und Importjournal; globale Zähler sind inzwischen ausdrücklich informativ. Die Vorprüfung öffnet normale native Instanzen und ist daher zutreffend nicht als reiner Readonly-DB-Zugriff bezeichnet. Keine Shopify-/Binding-/Katalogmutation in diesem Updatebaustein.
- `ml-connections.mjs` trennt plan/reconcile von apply/finish. Erstere verwenden das unveränderte readonly5eea-Paket und ausschließlich `graphqlRead`. Letztere verwenden die belegte native `createWorkshop`-Fabrik, genau einen `createShopBindingReadAdapter`, die über `createMainBindingConnection({workshop,adapter,pricing})` markierte Registry und dieselbe Adapter-/Pricinginstanz im `createMainNativeGateway`. Kein erneut erzeugter unregistrierter Checkeradapter. Der echte native Shopify-Readonlyreader ist mit dem vorhandenen Eigentümer-App-Zugang verbunden.
- Die echten808 alten Binding-IDs/Verträge, das Preisfeld und der frische Functionbeleg werden beim ersten Plan privat erfasst. Der unveränderte Main-Preisanschluss liest/prüft diese Daten erneut und bindet den synchronen Provider vor neuen unveränderlichen R2-Verträgen. Ziel-R2-Dokument/Metadaten,30 aktive Rest-R1 und alle808 historischen Preisverträge bleiben unter den vorhandenen Pins/Readbacks.
- `fr-callback.mjs` ist auf SHA `a19760739bd0ece91d56becc6c645e4e9cfc3ba886cb9e43d85287fbb42b1839` geprüft und wird tatsächlich als `verifyActiveFunction` injiziert. Der Runner prüft vor Anschluss das unveränderte Readerpaket. Keine Ersetzung durch konstante Functionevidenz, keine umdatierten Zeitstempel; die vorhandene60s-Prüfung bleibt im unveränderten Mainpaket.
- Shopify-Mutationen sind im Anschluss auf exakt `UPDATE_VARIANTS`/`SET_PRICING` begrenzt, `mutationRetries:0`; der Schreibtransport sendet einmal und enthält keinen Retry. Nur reine GraphQL-Leseoperationen dürfen bei THROTTLED erneut gelesen werden. Netz ist auf den festen Shophost begrenzt. Nach unbestätigtem Apply/Finish hält der Runner an, statt automatisch zu wiederholen oder zu reconciliieren. Vorhandenes persistentes Journal/Lock, einzelne Schritte und expliziter Reconcile bleiben erhalten.
- Endreadback prüft808Shop-IDs,158Preise/30Labels/182betroffeneVarianten,778R2+30aktiveR1,808erhaltene historische Verträge,778neue Verträge, genaue R2-Katalogabdeckung und erhaltene R1-Freigabe. Der Runner veröffentlicht kein Produkt. Die abschließende globale Zählerabweichung ist bereits nur informativ/null.

## Bytebelege und Grenze

Alle drei lokalen Empfangsdateien stimmen nach Bytezahl, SHA256 und Gitblob-ID mit [e8c5cea73c351513816283f1b1cd4f97156c1c11](https://github.com/Chris83638w/gravuru-2027/tree/e8c5cea7/ops/plesk/ausfuehrung-20261112) überein:

| Datei | Bytes | SHA256 |
|---|---:|---|
| ml-update.mjs |18143|`098ae9869ca94e7c4467f01212565a3dda53d6e4b5dc35ab251f8b9b9140c718`|
| ml-connections.mjs |12176|`ecc6a54f074dbeae155f243fc9470cc556d0d1aa3323e80181f7e5bd435891ee`|
| ml-lauf.mjs |32064|`b075fc960ec5e8bd158e15c9a851e5c297076e98cd7236ef3e26a39492960745`|

Zusätzlich die25Dateien des Mainpakets `de182709…1f416`,8Dateien des Readonlypakets `5eea1f58…68d01`,5Dateien des Readers `2a4ddc33…7d83` und der Originalcallback unabhängig bytegeprüft. `checks.json` SHA256 `2d18c70b87015820e1f8deb2a1552e601e79f8119a842cf5be8c9c44c9046c85` hält diese Abgleiche fest. Dieser Review ist kein eigener Datenbank-/Server-/Shoplauf und keine erneute Nutzerfreigabe. Keine Tests, Gitaktionen oder Runtimeänderungen durch den Reviewer.
