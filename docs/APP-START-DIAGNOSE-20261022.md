# Diagnose des leeren App-Starts · 22.10.2026

Ausgangsstand: `1382509d689a954f6f7801f7f52c94b2dbacdd92`, Aufgabenbranch `task/universelle-konfi-anbindung-20261022`. Kein Anwendungsfix oder neuer Serverstand wurde mit dieser Diagnose ausgeliefert.

## Tatsächlich beobachtet

- Die im ursprünglichen Chrome-Tab wiedergeöffnete gespeicherte Gestaltung bleibt sichtbar und bedienbar: ein Foto, vier Ebenen, gewählter Freistellwunsch, Menge 2 und 62,00 EUR. Dieser Tab wurde während der Fehlerreproduktion nicht neu geladen oder gespeichert.
- Ausschließlich eine getrennte, bereits offene Produktvorschau ohne das private Foto wurde automatisch neu geladen. Shopify zeigte anschließend seine Navigation, der App-Frame blieb bei `about:blank`.
- Die dokumentierte Browserdiagnose meldete dabei: **"Raw CDP is unavailable while Browser Use is resolving a paused document response."** Im Netzwerkprotokoll war die Dokumentanforderung an die App erfasst, aber keine zugehörige abgeschlossene Dokumentantwort. Es wurde keine angehaltene Antwort übergangen oder Browser-Sicherheitsfunktion deaktiviert.
- Auch die Gegenprobe über Shopify-Startseite und App-Menü innerhalb derselben gesteuerten Sitzung löste den Zustand nicht auf. Daher diesen Weg nicht als geprüfte Lösung empfehlen.
- Separater lesender HTTPS-Abruf derselben Kundenansichtsroute: HTTP 200, 1.143 Bytes, HTML mit sichtbarem Ladehinweis, App-Bridge-Einbindung und Kundenansichtsmodul. Kein X-Frame-Options-Header. Die vorhandene CSP erlaubt die tatsächliche Shop-Domain und `admin.shopify.com`; sie wurde nicht geändert.
- Die erfassten Browsermeldungen enthielten Shopify-Hinweise zu Initialisierung/Statistikberechtigungen, aber keinen Fehler aus dem Gravuru-Editor. Das allein beweist nicht die Fehlerfreiheit aller Startpfade.

## Schlussfolgerung und Grenze

Der aktuelle reproduzierte Test wird bereits beim Dokumentladen durch die Browsersteuerung angehalten. Ein verursachender Fehler im Konfiguratorcode ist damit **nicht nachgewiesen**; ebenso wenig ist ein dauerhafter Ladefix nachgewiesen. Die vorherige manuelle Wiederöffnung durch den Nutzer funktionierte. Eine Codeänderung oder Abschwächung von Anmeldung/CSP würde diesen Befund nicht gezielt beheben.

Keine erneuten Bestellungen, Revisionen, Datenbankänderungen, Uploads oder Shopify-Einstellungsänderungen. Originalgestaltung und private Sicherung bleiben erhalten. Screenshots und bereinigte Diagnosequittung liegen nur lokal im privaten Ordner `shopify-tier-tests/browser-abnahme/`.

## Genau nächster Schritt

Die angehaltene Dokumentantwort der Browsersteuerung muss zunächst aufgelöst bzw. der direkte Einstieg unabhängig von dieser Steuerung geprüft werden. Bei einem dort ebenfalls auftretenden Fehler die erste fehlgeschlagene Dokument-/Modulanfrage erfassen und nur deren nachgewiesene Ursache korrigieren. Anschließend direkte Öffnung und gespeicherte Gestaltung mit Foto erneut abnehmen. Kein automatisches Umleiten, Neuspeichern oder Ersetzen des Entwurfs als Umweg.

Die bereits bestandenen Preis-/Foto- und Shopify-Testbestellprüfungen bleiben gültig. Die Freigabe sämtlicher Produkte, die öffentliche Kundenstrecke und Fertigungsfreigaben bleiben eigene offene Grenzen.
