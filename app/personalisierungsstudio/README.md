# gravuru Studio

Ein Shopify-Konfigurator für vorhandene gravuru-Vorlagen. Kunden wählen ein Design, ändern den Text und können das vorhandene Motiv verschieben, ersetzen oder entfernen. Ein explizites Fotofeld erlaubt einen Bild-Upload. Die Werkstatt ruft die gekaufte Bestellposition als SVG, PDF oder JSON ab.

Die lokale Probe verwendet die zwei erhaltenen Edelstahlgestaltungen „Unser Heimathafen“ mit Anker und Leuchtturm, 90 × 60 mm, K00 ohne Bohrungen. Sie übernimmt die sechs ursprünglichen Textobjekte und vier Schriftfamilien. Die gültige Rechtezuordnung für eine Weitergabe an andere Händler bleibt je Ressource zu prüfen. [Originale und Herkunft](../designs/steel-heimathafen/README.md)

## Ausprobieren

Node.js 24, Python 3.10 oder neuer und die Python-Pakete aus dieser Mappe werden benötigt. Die folgenden Befehle laufen im Verzeichnis `app/personalisierungsstudio`.

~~~sh
python -m pip install -r requirements.txt
node cli.mjs demo
~~~

Unter Windows verwendet Studio `python`, auf anderen Systemen `python3`. Über `STUDIO_PYTHON` lässt sich der Interpreter auswählen. Die Probe läuft unter [127.0.0.1:4391](http://127.0.0.1:4391). Über „In den Warenkorb“ und „Testbestellung für die Werkstatt erzeugen“ gelangt die personalisierte Bestellposition in die Werkstatt. Dort stehen die Downloads und der Designimport zur Verfügung. Die lokale SQLite-Datei liegt standardmäßig unter `.studio/`. Beim nächsten Demostart sind die zwei Muster erneut der Demovariante zugeordnet. Bereits gesicherte Bestellpositionen behalten ihre Zeichnung.

Eine einzelne HTML-Datei für die interne Designabnahme entsteht mit `node demo-html.mjs Designprobe.html`. Nach dem Öffnen im Browser funktionieren Vorlagenwechsel, Texte, Motivbearbeitung und SVG-Download offline. Die Datei enthält alle für diese beiden Gestaltungen verfügbaren Schriftzeichen. Ihre Dateigröße ist vom übertragenen Datenumfang der Shopseite unabhängig.

## Bestehende Designs importieren

In der Werkstatt eine Quelldatei wählen und „Quelle prüfen“ ausführen. Bei einer geeigneten Vorlage zeigt Studio Design-IDs und Millimetermaße. Erst „Vorlagen übernehmen“ ordnet die geprüfte Revision der eingetragenen Varianten-ID zu. Eine Änderung der Datei zwischen Prüfung und Übernahme erfordert eine neue Prüfung. In der lokalen Probe ist die Zuordnung auf die Testvariante begrenzt.

| Quelle | Bearbeitung |
| --- | --- |
| Natives gravuru-Werkstatt-JSON mit `product` und `designs[].state.objects` | Die hier unterstützte rechteckige Ausführung übernimmt Maß, Texte, Originalschriften, Motive, Positionen und Rotation aus dem Bestand. Unbekannte Ebenen oder abweichende technische Ausführungen brauchen eine eigene Zuordnung. |
| Vorbereitetes SVG aus CorelDRAW oder einem anderen Vektorprogramm | Physische Seitenmaße in mm und eine deckungsgleiche ViewBox ab 0/0. `CutContour` ist ein geschlossener Pfad oder eine Gruppe solcher Pfade in Seitenkoordinaten. Auch Innenkonturen und Kurven sind möglich. Gefüllte Motivpfade und Gruppen bleiben vektoriell. Einfache Textobjekte mit bekannter Originalschrift bleiben editierbar. Ein Rechteck mit `data-studio-photo="true"` definiert ein optionales, mittig füllendes Fotofeld. |
| Fancy Product Designer `product.json` oder Original-ZIP | Die Vorprüfung liest jede Ansicht, native Texte mit Schriftnamen, Bildebenen und ausdrücklich markierte Uploadzonen. Druckbild, Produktansicht, Masken und Schnittlinie benötigen eine bestätigte Zuordnung vor der Veröffentlichung. |
| Erschlossenes Corel-Katalog-`design.json` | Die Werkstatt liest ein ZIP mit zusammengehöriger `design.json` und `design.svg`. Die Prüfung ordnet Originalpfade, Füllregeln, Textzeilen mit Grundlinien, Fotoclip und Bedienhinweise zu. Der Plattenrahmen bleibt als Vorschau gekennzeichnet. Eine einzelne JSON-Datei liefert weiterhin die Bestandsübersicht. |
| Zakeke | Als Vergleich für die Kundenbedienung erfasst. Ein nativer Projektimport gehört noch zum offenen Umfang. |

Die Schriftprüfung verwendet den vorhandenen Werkstattkatalog. SVG-Effekte, eingebettete Stilregeln, mehrzeilige Tspan-Layouts und freie Masken außerhalb des unterstützten SVG-Profils meldet die Importprüfung. Fehlende Konturen und Druckelemente werden nicht aus Vorschaubildern abgeleitet. Die historische Stahlprobe hat einen übernommenen Testpreis von 10,99 Euro. Im Shop gelten die gebundene Shopify-Variante und deren Preis.

~~~sh
node cli.mjs inspect FPD-Paket.zip
node cli.mjs inspect Corel-Katalogvorlage.zip
node cli.mjs proof-corel Corel-Katalogvorlage.zip --out Motivprobe.svg
node cli.mjs proof-corel Corel-Katalogvorlage.zip --out Motivprobe.pdf
node cli.mjs import /pfad/zu/design.svg --shop beispiel.myshopify.com --product 70001 --variant 90002
~~~

## Shopify und Werkstatt

Die Theme App Extension liegt unter `extensions/studio`. Das Konfigurationsbeispiel beschreibt einen App-Proxy, der die Unterseiten von `/apps/gravuru-studio/` an `/studio/` weiterleitet. Für einen isolierten Testshop sind eine eigene App-Registrierung, ein HTTPS-Reverse-Proxy, die zugehörigen Zugangsdaten und eine ausdrücklich gebundene Testvariante erforderlich. Die Produktvorlage muss für diese Artikel den Studio-Kaufbutton verwenden. Schnellkauf, beschleunigter Checkout und weitere Theme-Kaufbuttons sind am gewählten Theme separat abzunehmen, damit jeder Kaufweg die Gestaltung mitführt.

Ein vorhandenes Produktformular kann über die Blockeinstellung mit seiner HTML-ID angegeben werden. Studio übernimmt dessen Zusatzfelder, Verkaufstarif und Pflichteingaben. Nach der Gestaltung sichert der Server einmal den Entwurf und seine Vektorgeometrie. Ein normaler Shopify-Warenkorbaufruf verknüpft die private Eigenschaft `_gravuru_studio` mit der Position. SVG- und PDF-Erstellung liegen außerhalb dieses Kaufwegs. Bei verlorener Warenkorbantwort prüft Studio vor einem erneuten Hinzufügen, ob die Position bereits existiert. [Shopify Cart Ajax API](https://shopify.dev/docs/api/ajax/reference/cart)

Der Server bindet an Loopback. Der Proxy überprüft Shopify-Signatur und Zeitstempel. Die Werkstatt im Browser unter `/werkstatt` und die Werkstatt-API verwenden pro Instanz den freigegebenen Shop. `SHOPIFY_API_SECRET` und `STUDIO_OPS_TOKEN` kommen aus der Betriebsumgebung, für den Bestellabruf zusätzlich `SHOPIFY_ADMIN_TOKEN` mit `read_orders`. Eine vorhandene Händlerregistrierung muss diesen Zugang bereitstellen. Automatisches öffentliches Händler-Onboarding, Abrechnung sowie Installation über den Shopify App Store sind offen. [App-Proxy-Signatur](https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies)

~~~sh
node cli.mjs serve --shop beispiel.myshopify.com
node cli.mjs sync --shop beispiel.myshopify.com --order 123456789
node cli.mjs export --shop beispiel.myshopify.com --order 123456789 --line 987654321 --format pdf --out auftrag.pdf
~~~

| Werkstatt-API mit Bearer-Zugang | Ergebnis |
| --- | --- |
| `POST /api/orders/{Shopify-Bestell-ID}/sync` | Liest alle Seiten der Bestellung über die Admin GraphQL API, bestätigt Shop, Produkt, Variante und Entwurf und übernimmt die Positionen atomar. |
| `GET /api/orders` | Zugeordnete Bestellpositionen mit aktueller Menge und Status. |
| `GET /api/orders/{ID}/lines/{Positions-ID}/{svg,pdf,json,original}` | Liest den Shopify-Auftrag erneut. Eine aktive bezahlte Position erhält die Datei der gebundenen Zeichnungsrevision. `original` liefert das zugehörige hochgeladene Foto. |
| `POST /api/imports/check` und `POST /api/imports/publish` | Die Händleroberfläche prüft eine einzeln übermittelte Quelle in einem eigenen Prozess und bindet eine geprüfte Revision. |

Die GraphQL-Anbindung verwendet Version 2026-10, `currentQuantity` und `customAttributes`. Werkstatt-API und CLI lesen bei jedem Dateidownload den Zahlungsstatus und die Position bei Shopify, auch für bereits erzeugte Dateien. Der Pilot gibt Dateien bei `PAID`, positiver aktueller Menge, korrekter Zuordnung und aktiver Bestellung aus. Ein anderer Zahlungsstatus oder widersprüchliche Zahlungsstände mit gleichem Zeitstempel führen zu HTTP 409. Bei fehlendem API-Zugang oder fehlgeschlagenem Abruf bleibt die Datei gesperrt. Teilzahlungen, offene Rechnungen und Teilrückzahlungen benötigen vor einer Betriebsfreigabe eine ausdrückliche Regel für die betroffenen Positionen. Der Download erteilt keine Maschinenfreigabe. Nur der lokale Demoweg verarbeitet seine simulierten Bestellungen mit Status `TEST`. [Shopify-Zahlungsstatus](https://shopify.dev/docs/api/admin-graphql/2026-10/enums/OrderDisplayFinancialStatus) · [Shopify-Bestellposition](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/LineItem)

### F02-Testbestellungen automatisch in der Werkstatt finden

Der F02-Entwurf speichert eine Positionsreferenz und die Gestaltung auf der gekauften Shopify-Zeile. Studio kann diese Form ebenso wie die serverseitige Gestaltungs-ID lesen. Die Werkstatt benötigt den zum Kauf freigegebenen Originalkatalog in ihrer Datenbank.

Für diesen Testshop verweist `STUDIO_F02_BINDING` auf eine private JSON-Datei. Sie enthält `shop` (gravuru-f02-test.myshopify.com), `product` und `variant` als dezimale ID-Zeichenketten, die genaue Test-`sku`, `revision` als SHA-256 des freigegebenen Katalogindex und `unitCents` gleich 1099. Den Lesetoken der installierten F02-App als `SHOPIFY_ADMIN_TOKEN` an die freigegebene Werkstattumgebung übergeben. Der Werkstattserver verwendet zusätzlich `STUDIO_OPS_TOKEN`. Für den reinen F02-Werkstattmodus genügt die Leseanbindung.

~~~sh
node cli.mjs sync-f02 --shop gravuru-f02-test.myshopify.com --db pfad/zur/werkstatt.sqlite
~~~

Beim Anmelden an der so konfigurierten Werkstatt läuft derselbe Abgleich. Er sucht Testbestellungen anhand der vorgesehenen Artikelnummer, folgt allen Ergebnisseiten und überprüft eine bereits bekannte Zuordnung auch dann, wenn die Position aus der Trefferliste verschwindet. Ein erneuter Lauf verwendet dieselben Gestaltungen. Bei einem teilweise fehlgeschlagenen Abgleich enthält die Antwort die ungeprüften Bestell-IDs in `unverified`. Der CLI-Aufruf liefert dann einen Fehlerstatus. Der nächste erfolgreiche Abgleich kann diese Bestellungen nachholen.

Jeder Dateiabruf liest den Shopify-Auftrag vor der Berechnung und direkt vor der Rückgabe erneut, auch bei gespeicherten Dateien. Variante, Revision, Preis und Freigabe der F02-Zeile sowie ihr Bezug zur bezahlten Position werden geprüft. Ein Wechsel von Status, Auftragsstand, Menge oder Gestaltung sowie ein fehlgeschlagener Abruf sperren die Ausgabe. [Shopify-Bestellfilter](https://shopify.dev/docs/api/admin-graphql/2026-10/queries/orders) · [Wiederholbare P1-Prüfung](../../docs/handoffs/2026-11-19-studio-f02-werkstatt.md)

## Fertigung und Prüfung

Die Vorschau und die Vektordateien nutzen dieselbe Geometrie. Die Materialtextur gehört ausschließlich zur Vorschau. Texte werden aus den Originalglyphen zu Pfaden. Das SVG führt die Schnittlinie in einer eigenen Gruppe `CutContour`. Das PDF führt sie als überdruckende Sonderfarbe `CutContour` mit 0,1 mm Strichbreite. Ein optionales Foto bleibt als Bild eingebettet. Seine Originalbytes sind über die zugehörige Position abrufbar. Eine spätere Vorlagenrevision verändert die gesicherte Bestellung nicht. Für Gravur, UV-Druck, Weißkanäle, Sonderkonturen und Maschinenprofile ist die jeweilige Werkstattabnahme maßgeblich.

~~~sh
node --test tests/studio.test.mjs
node demo-html.mjs Designprobe.html
node tests/browser.mjs messung Designprobe.html
python tests/verify-print.py messung
~~~

Der Browserlauf benötigt Playwright und Chromium. `CHROME_PATH` wählt eine vorhandene Chrome-Installation, `STUDIO_4G=1` ergänzt fünf kalte und fünf warme Läufe bei 150 ms Latenz, 1,6 Mbit/s Empfang und 0,75 Mbit/s Versand. Die Druckprüfung benötigt zusätzlich pypdf und `pdftoppm` aus Poppler. Sie prüft physische Seitenmaße, überdruckenden Farbauszug, tatsächliche Pfadoperatoren und vergleicht das gerasterte PDF mit der unabhängigen SVG-Darstellung in Chromium.
