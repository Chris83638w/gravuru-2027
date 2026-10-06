# Bestellung, gesicherte Gestaltung und Druckdateien verbinden

Branch `task/order-output-complete-20261006`, Basis `b64494f3fec7e46af9f5e9f12473b2d066e86294` einschließlich Vektor-/Mimaki-Konturkorrektur.

## Verhalten

Unter **Testbestellungen** zeigt jede Position ihre gespeicherten Ausgaben mit Verfahren, dpi, Weißmodus und Status. Die drei neuesten Ausgaben sind direkt verlinkt, alle zugehörigen über „Ausgaben zur Position“. Bei noch fehlender Datei führt die vorhandene gesicherte Gestaltung zu den Druck-/Gravureinstellungen. Kein automatischer Export allein durch das Öffnen einer Bestellung.

Die Zuordnung erfolgt anhand der unveränderlichen Prüfstand-ID der Position, **nicht** anhand des Produktnamens oder aktuellen Produktstands. Die Datenbank filtert vor der 200er-Anzeigegrenze; ältere Positionen verschwinden nicht wegen neuerer fremder Aufträge. Pro Gestaltung werden höchstens 200 neueste Aufträge gezeigt, Gesamtzahl und Grenze sichtbar. Dateien bleiben Prüfstand-Dateien; mehrere Positionen mit exakt demselben Prüfstand können dieselben Dateien verwenden.

Bestellbezug bleibt auf dem Weg Gestaltung → neue Ausgabe → Dateien erhalten. In der Ausgabeansicht stehen Bestellnummer, Produkt, Menge und aktueller Status; Rückweg zur Position und Einstellungen direkt erreichbar. Beim Wechsel auf eine andere Gestaltung wird der Bezug entfernt. Ein fremder Ausgabeauftrag mit unpassender Prüfstand-ID im URL wird in dieser Ansicht nicht als Bestelldatei angezeigt.

Teil-/Vollerstattung, Storno und widersprüchliche Statusmeldungen geben weiterhin den bestehenden Prüfhinweis. Archivierte Betreiberdateien dürfen zur Prüfung weiter heruntergeladen werden. Dies erzeugt **keine** neue Fertigungsfreigabe oder Kunden-Downloadberechtigung. Originalbestellung, Paket, Preis und Ausgabebytes unverändert. Anzeigezeiten Europe/Berlin.

## Änderungen und Prüfung

- `export-jobs.mjs`: parametrisierte reine Leseabfrage pro Prüfstand und Gesamtzahl.
- `http.mjs`: `GET /api/workshop/orders/:positionId/outputs` aus serverseitig gesicherter Positionszuordnung, bestehender geschützter Betreiberbereich.
- Bestell-, Prüfstand- und Ausgaben-UI: direkte Links, Statuskontext, gemeinsame Beschriftung; nur notwendige neue UI-Module in statischer Route freigegeben.
- 12 gezielte Tests bestanden, einschließlich eines neuen Regressionstests: gewünschter alter Auftrag bleibt neben 205 neueren fremden Aufträgen auffindbar.
- Echter Chromium-Durchlauf mit ausschließlich signierten synthetischen Testdaten: noch keine Ausgabe → Bestellgestaltung → neue Mimaki-Ausgabe → Farbe/Weiß/ZIP → Rückweg. Fremde Gestaltung desselben Produkts ausgeschlossen, falsche Kombination aus Position/Auftrag abgefangen, Statusänderung sichtbar, Download nach Storno bytegleich, keine Freigabe. Bestellung und Quellpaket unverändert. Desktop 1440, Handy 390, Tablet 768 Pixel ohne Überlauf oder JavaScript-Fehler.

[Browserbericht](bestellausgaben-browser-20261006.json) · [Handyansicht](bestellausgaben-mobil-20261006.png) · [Desktop](bestellausgaben-desktop-20261006.png) · [Bestellung mit Dateien, Tablet](bestellung-dateien-tablet-20261006.png).

Reproduktion: `PYTHONPATH=.local-data/python python3 scripts/check-order-outputs.py`. Die zusätzliche Fixture benutzt ausschließlich einen frischen markierten temporären Ordner, keine bestehenden privaten SQLite-Dateien.

**Cloud-Check:** 06.10.2026, 13:46:40–13:48:27 Europe/Berlin: **307 Tests bestanden, 0 Fehler/Skips**, Build 76 Ressourcen/1 Modell. [Bericht](bestellausgaben-cloud-20261006.json).

## Grenzen und nächste Abnahme

Keine echte Shopify-Bestellung, kein Live-Deploy, kein Kundenkonto-Download. Bestellungen weiterhin test-only. Die frühere angefangene Verknüpfung bleibt separat im Worktree erhalten; die fertig geprüfte Weiterführung ist dieser Branch auf der neueren PDF-Korrektur.

Neu bereitgestellte Corel-Dateien aus [PDF-VEKTOREN-KONTUR-20261006.md](PDF-VEKTOREN-KONTUR-20261006.md) benötigen noch den tatsächlichen Import-/Drucktest. Für die vollständige Betriebsabnahme fehlen weiterhin bestätigte Shopify-Test-App-Anbindung samt echten Acrylvarianten und sicherer dauerhafter privater Backendbetrieb. Keine neue Serverplanung oder erneute Cloud-Migration begonnen.
