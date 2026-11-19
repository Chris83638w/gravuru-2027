# Studio P1 · Vom Shopify-Testauftrag zur Werkstatt

Chris hat Studio als bevorzugten Entwicklungsweg festgelegt. Dieses Paket erweitert den Entwurf #263 auf Basis von `fa1570d1`. R15 bleibt im Betrieb. Die Freigabe für den F02-Stahlversuch umfasst den eigenen Artikel mit zwei Heimathafen-Vorlagen, 90 × 60 mm, ohne Befestigung, 10,99 €. [Priorität und Grenzen](https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-7001779706) · [Testfreigabe](https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-6983996073)

## Ergebnis

Die reguläre Werkstatt findet die relevanten Shopify-Testaufträge nach SKU. Sie übernimmt die beiden bereits verwendeten Positionsformate. Der Server ordnet einen vorab gespeicherten Studio-Entwurf über seine ID zu. Bei den gekauften F02-Zeilen baut er die Zeichnung einmal aus der geprüften Vorlagenrevision und den UTF-8-Kundeneingaben auf. Die Zuordnung ist an Shop, Bestellung und Position gebunden. Ein zweiter Abruf und ein Dienstneustart verwenden denselben Stand. Nach einer Änderung im Katalog kann die gespeicherte Kaufrevision auch erstmalig abgerufen werden, solange ihre Originalressourcen in der Werkstatt vorliegen.

SVG, Kontur-PDF und Fertigungs-JSON laufen über die bestehende Werkstatt und deren Geometrie. Das JSON nennt Artikel, Variante, Position, Menge und Vorlagenrevision. Im F02-Format enthält es zusätzlich die Positionsreferenz. Nur der konfigurierte F02-Testartikel mit dem bestätigten Preis und einer bestätigten Testzahlung kommt für diesen Weg infrage.

## Gegenprüfung ohne Shopify-Zugang

Node.js 24, Python und die Python-Abhängigkeiten aus `app/personalisierungsstudio/requirements.txt` bereitstellen. Die folgenden Befehle laufen unter `app/personalisierungsstudio`.

~~~sh
node --test tests/studio.test.mjs tests/f02-orders.test.mjs
~~~

Die Tests verwenden die beiden versionierten Originalvorlagen, eine isolierte Datenbank und simulierte Shopify-Antworten. Sie decken auch die externe Werkstatt-HTTP-Schnittstelle mit zwei paginierten Bestellabrufen, bereits erzeugte Dateien, Erstattung unmittelbar vor Rückgabe, doppelte Positionsreferenzen, geänderte Menge und Version, fehlende Quelldaten, Berechtigungsfehler und eine später publizierte, sichtbar geänderte Vorlage ab. Wiederholung, Neustart und ein einzelner fehlgeschlagener Auftrag werden separat geprüft.

Zusätzlich wurden die privat gesicherten Gestaltungsangaben der beiden tatsächlich bezahlten F02-Testpositionen durch den neuen regulären Werkstattweg verarbeitet. Vier unterschiedliche Dateien entsprachen byteweise den bereits geprüften Referenzen. Die Bestellhülle, IDs, Zeitstempel und acht GraphQL-Antworten bei diesem Rückspiel wurden lokal nachgebildet. Diese Probe belegt die Kompatibilität mit den gekauften Positionsdaten. Der authentifizierte Abruf und der Zahlungsentzug auf einer echten internen Testbestellung bleiben offen.

| Ausgabedatei aus den beiden gespeicherten Testgestaltungen | SHA-256 |
| --- | --- |
| Hochzeitsanker, SVG | `57f603767512abf99e5b2ea256185812ce3e813e47688035e507f9cc6f71f60b` |
| Hochzeitsanker, PDF | `94fbc1131cc06a561334022bd420270a357b53d8dff2c9a706deab4699f19367` |
| Leuchtturm, SVG | `6cc2a2c0326aeb473004badcf6ac89b0c9a47ace35970e350512ed26fb412c13` |
| Leuchtturm, PDF | `2625847c97f8ee4f76412fd053c0fade7c2e72cbf8c9305c7cca26244ba143f6` |

## Offene Abnahme

1. Auf einer freigegebenen Werkstattinstanz mit Zugang zur F02-Admin-API den Abgleich ausführen und die bezahlten Positionen einzeln abrufen. Den Auftrag auch bei offenem oder entzogenem Zahlungsstatus prüfen. Konto, Lesetoken und Bestellinhalte gehören ausschließlich in diese interne Umgebung. [Betrieb des F02-Abgleichs](../../app/personalisierungsstudio/README.md#f02-testbestellungen-automatisch-in-der-werkstatt-finden)
2. Warenkorbseite und Warenkorbschublade zeigten bereits pro Gestaltung das persönliche Bild. Im eigentlichen Checkout ist die eigene Vorschau je Zeile verlinkt, die Miniatur zeigt den Standardartikel. Ein Eingriff in die shopweite Kassenprüfung ist außerhalb des Pilotumfangs. [Bezahlter Kundenweg](https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-6986672776)
3. Die bestätigte Schieferreferenz D230/D287 erfordert frei bewegliche und skalierbare Fotos, Texte und Motive, feste Bohrungen, tatsächliche Aufpreise, Zubehör und Werkstattmedien. Die Prüfung einer Serie mit 20 Motiven und die Schiefer-Fachabnahme stehen aus. [Studio-Arbeitspakete](https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-7001866969)
