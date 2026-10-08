# Shopify-Veröffentlichung der vorhandenen App

Nutzerfreigabe am 08.10.2026: „dann setz es live“, konkretisiert zu „alles bei shopify online“. Ziel ist die neue Werkstatt über die **bestehende** Shopify-App „Gravuru Konfigurator“, Client-ID `9640dd7a6907f0c73e7013ea8c24869b`, Shop `gravuru-design.myshopify.com`. Keine neue App und keine ungeprüfte Veröffentlichung der synthetischen Testprodukte. Bestehende Werkstatt/Produktionsdaten bleiben erhalten.

## Konkreter derzeitiger Anschluss

Der eigene App-Prozess kann sich über den vorhandenen App-Schlüssel bei der Admin API anmelden. Dieser Zugang ist kein Shopify-CLI-Veröffentlichungszugang. Der hier verfügbare Browser wurde am 08.10.2026 beim Aufruf des Shopify Admins zur Anmeldeseite `accounts.shopify.com/lookup` weitergeleitet. Keine angemeldete Shopify-Kontositzung verfügbar; Plesk-Anmeldung funktioniert separat.

**Einmaliger Bedienungsschritt durch den Kontoinhaber:**

1. [Shopify Dev Dashboard](https://dev.shopify.com/dashboard/) öffnen und die bestehende App **Gravuru Konfigurator** auswählen.
2. **App settings → App Automation Token → Create token**. Laufzeit **1 Monat**, dann **Generate token**. Keine neue Shopify-App erzeugen.
3. Den Token ausschließlich in der vorbereiteten privaten Plesk-Datei hinterlegen: **Dateien → Basisverzeichnis → private → gravuru-shopify-app-automation-token**. Speichern und im Chat nur „hinterlegt“ melden. Keine Schlüsselwerte oder Screenshots davon schicken.

Serverdatei: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-shopify-app-automation-token`, reguläre Datei **0600**, privater Elternordner **0700**, Anwendungseigentümer. Leer vorbereitet; kein Schlüssel erzeugt oder hineingeschrieben. Diese Datei gehört nicht in App-Paket, Repository, Datenbank oder öffentliches Webverzeichnis. Den Token später ausschließlich im Kindprozess als `SHOPIFY_APP_AUTOMATION_TOKEN` an die Shopify CLI übergeben, niemals als Befehlsargument oder in eine protokollierte `export TOKEN=...`-Zeile schreiben. Keine ausführliche CLI-Protokollierung (`--verbose`).

## Vorbereiteter technischer Weg

Shopify CLI **4.9.0** wurde separat unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-shopify-deploy-tools` installiert (npm Exitcode 0). CLI-Versionsaufruf sowie die Hilfen für `app config link` und `app versions list` auf dem Server jeweils Exitcode 0. [Tatsächlicher Zugangsnachweis](../../docs/dashboard-20261004/shopify-publication-access-20261008/report.json). Keine globale Node-/npm-Installation ersetzt. Das Backend bleibt auf Plesk; `shopify app deploy` hostet keinen Node-/Python-/SQLite-Server.

Nach sicherer Token-Hinterlegung zuerst ausschließlich die bestehende App-Konfiguration und aktive Version sichern:

- `app config link --client-id 9640dd7a6907f0c73e7013ea8c24869b` in ein neues privates Arbeitsverzeichnis; keine vorhandene Konfiguration überschreiben und kein `--reset`.
- `app versions list --client-id 9640dd7a6907f0c73e7013ea8c24869b --json`; aktive Versionskennung als tatsächlichen Rückweg festhalten.
- Vorhandene Erweiterungen vollständig inventarisieren und deren Quellen erhalten. Kein Deployment aus einem unvollständigen leeren Projekt: Laut Shopify werden beim Deployment nicht enthaltene Erweiterungen entfernt.
- Exakte aktuelle App-URL, Einbettung, Redirects, Scopes, Proxy-/Webhook-Konfiguration aus diesem Abruf übernehmen. Historische URL `https://gravuru-designwerkstatt.de/produktanlage.html` antwortete am 08.10.2026 mit HTTP 200; das beweist weder ihre heutige Zuordnung im Dev Dashboard noch den Login der neuen Werkstatt.
- Erst den tatsächlichen Konfigurationsunterschied samt gesicherter vorheriger Version dokumentieren; Backend mit passenden Händler-/Kundenrouten verbinden und gezielt prüfen. Für ein vorgemerktes Release `app deploy --no-release` verwenden. Eine veröffentlichte App-Version muss anschließend tatsächlich in Shopify geöffnet und geprüft werden.

Die allgemeine Veröffentlichungsfreigabe liegt vor. Fehlende Kontositzung/Token ist eine technische Zugangsvoraussetzung, keine erneut angefragte Veröffentlichungsfreigabe.

## Was eine Veröffentlichung noch nicht automatisch löst

Der derzeitige Paketstart ist ein geschützter Operator-Test. Er verwendet Basic-Anmeldung; Shopify-Händler-/Kundenrouten, Warenkorbtransport und Webhooks werden darin noch nicht verbunden. Die vorhandenen Module für Warenkorb und Bestellannahme arbeiten ausdrücklich im Testmodus. `read_orders` fehlt aktuell. Die zuletzt gelesene Variante hat 40,00 € und andere Optionen als der synthetische 14,99-€-Stand; sie ist nicht zugeordnet. Ein echter durchgehender Testkauf ohne Belastung, Kundenkonto-Dateifreigabe und physische Fertigungsfreigabe bleiben offen. Keinen Testmodus nur umbenennen oder Schutz entfernen, um „alles live“ zu behaupten.

Die Token-Hinterlegung ermöglicht zunächst den tatsächlichen App-Konfigurationsabruf und das weitere Anschließen. Sie beweist noch keinen vollständigen Produktivbetrieb. Shopify kann für zusätzliche Scopes außerdem eine Zustimmung des Shopinhabers verlangen. Keine echte Belastung, kostenpflichtigen Dienste, Produktionsdatenbank-Ersetzung oder ungeprüfte Produktpublikation auslösen.

## Offizielle Quellen, geprüft am 08.10.2026

- [App Automation Tokens: an eine einzelne App gebunden, Erstellung und sichere Umgebungsvariable](https://shopify.dev/docs/apps/build/dev-dashboard/app-automation-tokens)
- [CLI-Deployment, `--no-release`, Versionen und Entfernung fehlender Erweiterungen](https://shopify.dev/docs/apps/launch/deployment/deploy-in-ci-cd-pipeline)
- [Bestehende Konfiguration abrufen](https://shopify.dev/docs/api/shopify-cli/app/app-config-link)
- [App-Versionen auflisten](https://shopify.dev/docs/api/shopify-cli/app/app-versions-list)
