# Getrennter Shopify-Händlerstart auf Plesk

Dieses Paket startet die vorhandene neue Werkstatt mit App-Bridge-/Händler-Sitzungsprüfung. Es ist eine **getrennte Händler-Testinstanz**: keine neue Shopify-App, keine Produktpublikation, kein Warenkorbtransport und keine Bestell-Webhooks. Die öffentliche HTML-Hülle enthält keine privaten Produktdaten; alle Werkstatt-APIs verlangen eine gültige Händleridentität der bestehenden App. Für Schreibzugriffe bleibt zusätzlich CSRF erforderlich. Kein Basic-Anmeldeersatz und kein anonymer API-Rückfall.

Die bestehende private Operator-Testinstanz und die laufende Werkstatt behalten ihre eigenen Verzeichnisse, Startdateien und Datenbanken. Dieses Paket nicht darüber entpacken. Auch eine erfolgreiche TLS-/Serverprüfung ersetzt nicht die echte Öffnung über Shopify und keine vollständige Bestellabnahme.

## Vorbereiteter getrennter Bereich

Zuerst prüfen, ob auf Plesk bereits ein geeigneter freier Bereich existiert. Vorgesehene neue Adresse bei fehlendem Bereich: `https://app-2027.gravuru-designwerkstatt.de`. Dies ist eine Zieladresse, solange kein eigener Servernachweis vorliegt.

- Anwendungsroot: `/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-2027-merchant`.
- Dokumentenroot: dessen Unterordner `public`.
- Node.js **24+**, Startdatei `app.cjs`, Produktionsmodus der Node-Laufzeit; das Produkt bleibt ausdrücklich im Händler-Testmodus.
- TLS mit gültigem Zertifikat; HTTP auf HTTPS weiterleiten. Nur diese Site muss den vertrauenswürdigen Header `X-Forwarded-Proto: https` am Node-Eingang setzen und eingehende gleichnamige Werte ersetzen. Die Anwendung akzeptiert ausschließlich den exakten konfigurierten Host und diesen HTTPS-Wert.
- Genau ein App-Prozess. Zusätzlich sperrt ein echter Linux-`flock` die Datenablage. Ein zweiter Prozess darf keine Datenbank öffnen. Der interne Loopback-Listener bleibt außerhalb der LiteSpeed-/Passenger-Übernahme.
- Neue Daten: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-merchant-data`, ausschließlich 0700/0600, eigene Kennzeichnung. Keine Produktions- oder Operator-Datenbanken kopieren.
- Vorhandenen geprüften privaten Python-Interpreter **nur verwenden**, nicht ersetzen oder darin Pakete nachinstallieren: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311/bin/python`.

## Private Konfiguration

Außerhalb der Anwendung in `private/gravuru-2027-merchant-shopify.json`, Datei **0600**, privater Elternordner **0700**, gleicher Anwendungseigentümer:

```json
{
  "schema": 1,
  "purpose": "shopify-merchant-test-runtime",
  "values": {
    "GRAVURU_SHOPIFY_APP_ORIGIN": "https://app-2027.gravuru-designwerkstatt.de",
    "GRAVURU_PRIVATE_DATA_DIR": "/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-merchant-data",
    "GRAVURU_SHOPIFY_CLIENT_SECRET_FILE": "/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-werkstatt/private/shopify-app-secret",
    "GRAVURU_SHOPIFY_PYTHON": "/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311/bin/python"
  }
}
```

Die Datei enthält nur Verweise, keine Schlüsselwerte. Der bestehende App-Schlüssel wird ausschließlich zur Laufzeit aus seiner privaten Datei gelesen. Der **App-Automation-Token ist hierfür nicht der richtige Schlüssel**; er bleibt ausschließlich beim CLI-Veröffentlichungswerkzeug. Kein Schlüssel in Paket, Git, Befehlsargumenten oder Browser. Eine abweichende Konfigurationsdatei kann mit `GRAVURU_SHOPIFY_CONFIG_FILE` als Pfad ausgewählt werden; widersprüchliche Feldbindungen werden abgewiesen.

## Installation und begrenzte Abnahme

1. Das Paket in den separaten Anwendungsroot hochladen, entpacken und Manifest/Quellcommit prüfen. Keine vorhandene Werkstatt ersetzen.
2. Private Konfiguration wie oben sicher anlegen. Neue Datenablage leer lassen; bei vorhandenen fremden Daten stoppt der Helfer.
3. `npm run plesk:merchant:prepare`: vorhandene Python-/Cairo-/SQLite-/Importmodule prüfen und ausschließlich eine leere neue Datenablage kennzeichnen. Kein Paketdownload, keine Änderung vorhandener Python-Installation.
4. `npm run plesk:merchant:check`: Node/Dateirechte/Verweise/Datenkennzeichnung/Python prüfen. Erfolg bedeutet noch keine echte Händleranmeldung.
5. Nur diese Node-App starten. Die App-Hülle unter `/werkstatt/` darf HTTP 200 liefern; `/api/workshop/products` und `/__shopify/health` müssen ohne gültiges Händler-Bearer-Token HTTP 401 liefern. Private Dateien, Manifest und Kundeneditor sind nicht freigegeben.
6. Nach korrektem Shopify-Anschluss echte Händleranmeldung, Speichern/Wiederöffnen, private Bilder/Downloads und Neustart prüfen. Ein offener Editor erhält seinen CSRF-Wert über Prozesswechsel; App-Schlüssel-/Origin-Wechsel rotiert ihn. Bearer-Token bleiben kurzlebig und werden unabhängig davon bei jeder Anfrage geprüft.

App-URL der vorhandenen Shopify-App erst ändern, wenn deren Erweiterungen gesichert und der konkrete Release-Diff bestätigt sind. Gesicherte vorherige Version: `variante-m-embedded-motifs-20260928`, `gid://shopify/Version/1146632241153`. Keine bestehenden Erweiterungen aus einem leeren CLI-Projekt versehentlich entfernen. Die allgemeine Veröffentlichungsfreigabe liegt bereits vor.

Rückweg für diesen getrennten Host: nur diese Node-App stoppen; Datenablage und Paket erhalten. Die bestehende App-Konfiguration bleibt bis zur gesonderten tatsächlichen Umstellung unverändert. Bei einem späteren Shopify-Release zusätzlich die gesicherte vorherige Version wieder freigeben.

## Lokale gezielte Prüfung

```sh
GRAVURU_MERCHANT_TEST_PYTHON=/absoluter/pfad/zur/geprueften/python-umgebung/bin/python node --test ops/plesk/merchant-runtime.test.mjs
GRAVURU_MERCHANT_TEST_PYTHON=/absoluter/pfad/zur/geprueften/python-umgebung/bin/python python scripts/check-merchant-host.py
```

Die Browserprüfung verwendet eine synthetische Identität und einen simulierten HTTPS-Eingang. Sie ist ausdrücklich keine echte Shopify-/HTTPS-Serverabnahme. Claude wurde hier nicht ausgeführt; ein separates Prüfbriefing bezeichnet klar die tatsächlichen und noch fehlenden Nachweise.
