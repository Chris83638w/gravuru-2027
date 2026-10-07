# Test-Dateifreigaben und Widerruf im Browser – 07.10.2026

Folgepaket nach der gespeicherten Excel-Abnahme, Basis **`cc2e7d8812a4c2036e3f381e918707660e77bc1e`**, Branch `test/customer-file-grants-ui-20261007`. Schließt die in `INTEGRIERTER-ABSCHLUSS-20261006.md` noch offene sichtbare Händlerbedienprüfung der Dateifreigaben. Produktcode in diesem Paket unverändert.

## Tatsächlich geprüft

Chromium lädt die echte Bestelloberfläche gegen einen ausschließlich lokalen Testserver mit aktiviertem bestehenden Test-Sitzungsprüfer. Die Fixture erzeugt pro Lauf zufällige **synthetische** Signierschlüssel, zwei signierte Testbestellungen mit verschiedenen Kunden und vorbereitete Dateibytes. Das bereitgestellte `shopify.idToken()` ist eine Testfunktion, keine echte App Bridge oder Shopify-Anmeldung. Keine Shopify-Netzwerkanfrage, Zahlung, echten Kundendaten oder externe Veröffentlichung.

Fünf zusammenhängende Prüfgruppen bestanden:

1. Vor ausdrücklicher Freigabe ist die Kunden-Dateiliste leer. PDF ist vorausgewählt. Bewusste Händlerfreigabe und Wiederholung erzeugen genau einen Eintrag. Passender Kunde erhält exakt die per SHA-256 nachgewiesenen Bytes mit `no-store`; anderes Kundenkonto erhält 404.
2. Fehlende separate Weißdatei erzeugt keine Freigabe. Erst die ausdrückliche ZIP-Auswahl erlaubt das zusätzliche Datenpaket, ebenfalls mit korrektem SHA-256.
3. Neu laden stellt die Freigaben wieder her und wählt erneut PDF vor. Widerruf über den Button sperrt die alte PDF-Freigabe mit 404, bleibt nach erneutem Öffnen sichtbar und lässt die gesonderte ZIP-Freigabe unverändert.
4. Während eine Freigabenabfrage für Position A aussteht, im Dashboard Position B wählen. Die anschließend eintreffende Antwort für A überschreibt weder Ausgabewahl noch Liste von B. Eine folgende Freigabe gehört ausschließlich zu B.
5. Eine signierte synthetische Erstattungsmeldung sperrt neue Freigaben und bereits freigegebene Downloads (409); Kundenliste leer. Händler sieht die konkrete Ablehnung. Der ursprüngliche Bestellstand bleibt bytegleich im JSON-Vergleich.

Desktop 1440, Mobil 390 und Tablet 768 ohne horizontalen Überlauf; keine JavaScript-Fehler. Desktop- und Mobilansicht gesichtet. Fixture-Build: 76 Ressourcen, 1 Modell, 461440 Editor-Bytes.

```sh
PYTHONPATH=.local-data/python python scripts/check-customer-file-grants.py
node --check scripts/fixtures/customer-file-grants.mjs
git diff --check
```

Der erste Testskriptlauf verwendete einen zu breiten Locator, der zusätzlich das umgebende Detailpanel traf. Nur den Testselektor auf das unmittelbar zugehörige Freigabepanel korrigiert. Anschließend PASS; nach Ergänzung der expliziten Synchronisierung auf die verspätete Antwort nochmals PASS. Keine zusätzlichen Produktfehler gefunden und keine unveränderten Backend-/Druckabnahmen wiederholt.

[Maschinenlesbarer Prüfbericht](customer-file-grants-20261007/report.json) · [Desktop](customer-file-grants-20261007/file-grants-desktop.png) · [Mobil](customer-file-grants-20261007/file-grants-mobile.png)

## Grenzen und nächster Anschluss

Die Dateibytes sind ausdrücklich vereinfachte synthetische Zugriffsprüfdaten, **keine druckfähigen PDFs oder Produktionspakete**. Der echte Kundenkonto-UI-Anschluss wurde nicht abgenommen; dessen HTTP-Zugriff wird hier mit synthetischen Kunden-Sitzungen geprüft. Keine Zusage dauerhafter Hostingablage, Maschinen-/ICC-Freigabe oder realer Bestellung.

Plesk-Einrichtung bleibt pausiert. Echte Shopify-Anbindung bleibt getrennte Folgeaufgabe: eigene App-Anmeldung sicher an die Laufzeit binden, vorhandenes geschütztes HTTPS-Testbackend bestätigen, echte Testvariante zuordnen und vollständige Testbestellung durchführen. Diese abhängigen Schritte werden nicht durch den lokalen Test ersetzt. Keine neue App oder Umgebung und keine Live-Veröffentlichung.
