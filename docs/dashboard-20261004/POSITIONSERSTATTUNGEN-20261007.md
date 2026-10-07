# Erstattungszuordnung je Testbestellposition

07.10.2026. Fortsetzung in derselben Cloud-Aufgabe, Branch `task/order-line-refunds-20261007`, Basis `c19cbd8606258860848608938965536286d90519`. Die Browserabnahme `0202493f715d53316eb893e94fb672c4ac8eeb04` und spätere Anschlussvorbereitung bleiben erhalten. Keine Migration, Hostingänderung, neue Umgebung oder Live-Veröffentlichung.

## Verhalten

Bisher zeigte jede Position nur den späteren Zahlungsstatus der gesamten Bestellung. Jetzt ergänzt das Testbestell-Dashboard die **Erstattungszuordnung dieser Position**: gemeldete Menge, Warenwert und Steueranteil. Beispiel: Von zwei bestellten Stück sind einer Position 1 Stück, 30,00 EUR Warenwert und 6,97 EUR Steuer zugeordnet; eine andere Position derselben Bestellung erhält diese Werte nicht.

Warenwert (`subtotal`/`subtotal_set.shop_money`) und Steuer (`total_tax`/`total_tax_set.shop_money`) werden getrennt übernommen, ohne eine unbestätigte Steuerinklusivannahme, einen Auszahlungsbetrag oder einen neuen verbleibenden Kaufpreis zu berechnen. Geldrückfluss benötigt zusätzlich den Transaktionsnachweis. Versand, Gebühren und sonstige Rückerstattungen werden nicht auf Produktpositionen verteilt. Es wird keine Erstattung ausgelöst.

- Eingang weiterhin nur über die vorhandenen HMAC-geprüften **Test**-Bestellnachrichten `orders/updated`, `orders/cancelled` und datierte `orders/paid`; keine neue `refunds/create`-Annahme.
- `refunds` fehlt: keine Positionswerte bekannt. `refunds: []` ist ein ausdrücklich leerer Bericht. Eine spätere Nachricht ohne Angaben kennzeichnet den letzten bekannten Bericht als älter; sie ersetzt ihn nicht durch null Euro.
- Kumulative Berichte werden nach Shop-Änderungszeit ausgewertet. Mehrfache Lieferung oder ein älterer Nachzügler addiert keinen weiteren Betrag. Zwei Teilzuordnungen werden nur innerhalb des letzten konsistenten Gesamtberichts zusammengerechnet.
- Geänderte/entfernte frühere Zuordnungen, widersprüchliche Berichte zur selben Zeit oder Mengen oberhalb der bestellten Menge führen zu einem Prüfhinweis und ausgeblendeten Beträgen. Kein automatisches Auflösen solcher Konflikte; eine spätere echte Abstimmungsfunktion bleibt offen.
- Vorhandene Kunden-Dateifreigaben sind auch bei Bestellstatus „Bezahlt“ gesperrt, wenn eine Erstattungszuordnung oder ungeklärte Zuordnungsänderung vorliegt. Die bestehende allgemeine Sperre bei Teil-/Vollerstattung oder Storno wird nicht gelockert.
- Ursprüngliche Position, Menge, Preis, Produkt-/Gestaltungsstand und Produktionsdateien bleiben unverändert.

## Speicherung und Änderungen

Neue kleine Tabelle `form_order_refund_reports` in der bereits verwendeten privaten Datenbank; keine zusätzliche Datenbankdatei. Gespeichert werden nur Ereigniszuordnung und normalisierte Refund-/Positions-IDs, Mengen und Cent-Werte. Keine ursprünglichen Webhook-Payloads, Kundentexte, E-Mails, Transaktionsbelege oder Tokens. INSERT erfolgt innerhalb der vorhandenen Bestelltransaktion; UPDATE/DELETE sind wie bei den Statusmeldungen geschützt. Bestehende Statusmeldungen ohne Detailbericht bleiben ausdrücklich unbekannt; keine erfundenen historischen Werte.

Neue Module `app/workshop/order-refunds.mjs`, `order-refunds.test.mjs`, `order-refund-intake.test.mjs`; bestehende Statusprojektion, Bestellanzeige und gezielte Downloadtests ergänzt. Neuer Browsernachweis `scripts/check-order-line-refunds.py` verwendet ausschließlich temporäre synthetische Bestellungen mit zwei Positionen.

## Tatsächlich geprüft

**39 unterschiedliche gezielte Node-Prüfungen bestanden, 0 Fehler/Skips**, darunter 12 neue Prüfungen. Betroffene Bestellannahme und Kunden-Dateifreigabe wurden wegen der geänderten Statusprojektion mitgeprüft; unveränderte allgemeine Browserabnahme nicht wiederholt. Wiederholungen nach Verfeinerung des neuen Codes sind nicht als zusätzliche Tests gezählt.

```sh
node --test app/workshop/order-refunds.test.mjs app/workshop/order-intake.test.mjs app/workshop/customer-downloads.test.mjs
node --test app/workshop/order-refund-intake.test.mjs
node --test --test-name-pattern='line refund' app/workshop/customer-downloads.test.mjs
```

Nach der abschließenden Validierungsverfeinerung beide neuen Node-Testdateien erneut bestanden (10 Tests). Geprüft sind unter anderem EUR-Centgenauigkeit, Shop- statt Darstellungswährung, unsichere IDs/fremde Bestellreferenzen, atomarer Fehlerfall, HMAC/Live-Ablehnung, doppelte/verspätete Zustellung, Neustart, datensparsame Speicherung und Sperre bereits erteilter Kundendownloads.

**Neue Browserprüfung bestanden**, abschließender Lauf 07.10.2026 **12:52:12–12:52:20 Europe/Berlin**:

```sh
PYTHONPATH="$PWD/.local-data/python" python3 scripts/check-order-line-refunds.py
```

Zwei Positionen getrennt anzeigen, leer/fehlend/älter/widersprüchlich unterscheiden, Originalposition und Snapshot-Hash unverändert, Desktop 1440/Handybreite 390/Tabletbreite 768 ohne Seitenüberlauf oder JavaScript-Fehler. Kein physischer Gerätetest. Fixture-Build: 76 Ressourcen, 1 Modell, 461440 Editor-Bytes. JavaScript-Syntax und `git diff --check` erfolgreich.

[Browserbericht](order-line-refunds-20261007/report.json) · [Mobile Positionsanzeige](order-line-refunds-20261007/allocation-390.png) · [Konfliktanzeige](order-line-refunds-20261007/conflict-768.png). Beide Bilder tatsächlich angesehen. Keine Produktivdaten im Nachweis.

## Abgrenzung und Fortsetzung

Nutzerergänzung vom 07.10.2026: Im alten Chat konnte der **Shopify-Connector authentifiziert Shop-, Produkt- und Variantendaten lesen**. Keine Testvariante wurde zugeordnet, keine Shopdaten geändert. Dies ist ein übergebener Nachweis, kein in diesem Arbeitspaket wiederholter Connector-Aufruf und keine Anmeldung unseres App-Prozesses.

Plesk-Zugang, eigener HTTPS-Testhost, sichere App-Laufzeitbindung und echte Testbestellzustellung bleiben offen. Nur diese abhängigen Schritte pausieren. Die neue Zuordnung ist mit synthetischen signierten Nachrichten geprüft, nicht gegen eine echte Shopify-Rückzahlung. Geldflussabgleich und bestätigte Auflösung widersprüchlicher Erstattungsberichte bleiben eigene nächste Erweiterungen.

Nächster unabhängig möglicher Abnahmeschritt: die noch nicht sichtbar abgenommenen gespeicherten Excel-Serien und Ausführungsgruppen im Dashboard wieder öffnen und gezielte Fehlerkorrektur prüfen; die abgeschlossene allgemeine Konfiguratorabnahme nicht erneut ausführen.

Feldsemantik am 07.10.2026 anhand der offiziellen Dokumentation geprüft: [RefundLineItem](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/RefundLineItem), [Refund und erforderlicher Transaktionsnachweis](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Refund), [JSON-Felder der Rückerstattungen](https://shopify.dev/docs/api/admin-rest/2026-07/resources/refund). Die letzte Quelle beschreibt das bestehende Webhook-Datenformat; es wurde kein neuer REST-API-Aufruf implementiert.
