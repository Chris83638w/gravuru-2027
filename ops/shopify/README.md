# Shopify-Veröffentlichung der vorhandenen App

Nutzerfreigabe am 08.10.2026: „dann setz es live“, konkretisiert zu „alles bei shopify online“. Ziel ist die neue Werkstatt über die **bestehende** Shopify-App „Gravuru Konfigurator“, Client-ID `9640dd7a6907f0c73e7013ea8c24869b`, Shop `gravuru-design.myshopify.com`. Keine neue App und keine ungeprüfte Veröffentlichung der synthetischen Testprodukte. Bestehende Werkstatt/Produktionsdaten bleiben erhalten.

## Aktueller Anschluss · 09.10.2026

Der Nutzer hat den App-Automation-Token sicher hinterlegt. Echter lesender CLI-Abruf erfolgreich, aktive Version **`variante-m-embedded-motifs-20260928`** und Originalkonfigurationen privat gesichert. [Aktueller Nachweis](../../docs/dashboard-20261004/SHOPIFY-ZUGRIFF-BESTAETIGT-20261009.md). Die folgende Bedienungsanleitung bleibt für eine spätere Token-Erneuerung erhalten; die Hinterlegung ist **keine aktuelle offene Nutzeraufgabe**.

## Sichere Zugangseinrichtung und Erneuerung

Der eigene App-Prozess kann sich über den vorhandenen App-Schlüssel bei der Admin API anmelden. Dieser Zugang ist kein Shopify-CLI-Veröffentlichungszugang. Der hier verfügbare Browser wurde am 08.10.2026 beim Aufruf des Shopify Admins zur Anmeldeseite `accounts.shopify.com/lookup` weitergeleitet. Keine angemeldete Shopify-Kontositzung verfügbar; Plesk-Anmeldung funktioniert separat.

**Einmaliger Bedienungsschritt durch den Kontoinhaber:**

1. [Shopify Dev Dashboard](https://dev.shopify.com/dashboard/) öffnen und die bestehende App **Gravuru Konfigurator** auswählen.
2. **App settings → App Automation Token → Create token**. Laufzeit **1 Monat**, dann **Generate token**. Keine neue Shopify-App erzeugen.
3. Den Token ausschließlich in der vorbereiteten privaten Plesk-Datei hinterlegen: **Dateien → Basisverzeichnis → private → gravuru-shopify-app-automation-token**. Speichern und im Chat nur „hinterlegt“ melden. Keine Schlüsselwerte oder Screenshots davon schicken.

Serverdatei: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-shopify-app-automation-token`, reguläre Datei **0600**, privater Elternordner **0700**, Anwendungseigentümer. Zunächst leer vorbereitet, am 09.10.2026 durch den Nutzer befüllt. Diese Datei gehört nicht in App-Paket, Repository, Datenbank oder öffentliches Webverzeichnis. Den Token ausschließlich im Kindprozess als `SHOPIFY_APP_AUTOMATION_TOKEN` an die Shopify CLI übergeben, niemals als Befehlsargument oder in eine protokollierte `export TOKEN=...`-Zeile schreiben. Keine ausführliche CLI-Protokollierung (`--verbose`).

## Vorbereiteter technischer Weg

Shopify CLI **4.9.0** wurde separat unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-shopify-deploy-tools` installiert (npm Exitcode 0). CLI-Versionsaufruf sowie die Hilfen für `app config link` und `app versions list` auf dem Server jeweils Exitcode 0. [Tatsächlicher Zugangsnachweis](../../docs/dashboard-20261004/shopify-publication-access-20261008/report.json). Keine globale Node-/npm-Installation ersetzt. Das Backend bleibt auf Plesk; `shopify app deploy` hostet keinen Node-/Python-/SQLite-Server.

Nach sicherer Token-Hinterlegung zuerst ausschließlich die bestehende App-Konfiguration und aktive Version sichern:

- `app config link --client-id 9640dd7a6907f0c73e7013ea8c24869b` in ein neues privates Arbeitsverzeichnis; keine vorhandene Konfiguration überschreiben und kein `--reset`.
- `app versions list --config before --path <privates-Arbeitsverzeichnis> --json`; die zuvor abgerufene Konfiguration muss auf die feste Client-ID geprüft sein. `--client-id` und `--config` sind in CLI 4.9.0 gegenseitig ausgeschlossen. Aktive Versionskennung als tatsächlichen Rückweg festhalten.
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

## Automatischer lesender Abruf · 09.10.2026

`read-baseline.mjs` ist der separate Betriebshelfer für die bestehende App. Er wird privat neben der installierten CLI abgelegt; er verändert weder das Werkstatt-Installationspaket noch den laufenden Webprozess. Auf dem Server kann der eigene Node-Prozess ihn nach Token-Hinterlegung ohne weitere Argumente ausführen. Er liest den Token direkt aus der oben genannten 0600-Datei; keine Werte in Befehlsargumenten.

Der Helfer verwendet ausschließlich `app config link` und `app versions list` für die feste Client-ID bzw. die darauf geprüfte Konfiguration, ohne App-Neuanlage, `--force`, `--reset`, Deployment oder Release. Jeder Versuch bekommt ein neues privates Verzeichnis `gravuru-release-baseline-*`. Zwei Konfigurationsabrufe und zwei Versionslisten müssen bei allen geparsten Konfigurationswerten und der aktiven Version übereinstimmen. TOML wird mit dem vorhandenen Python 3.11 (`/opt/alt/python311/bin/python3`, Standardbibliothek `tomllib`) gelesen; die Reihenfolge von Tabellen darf sich unterscheiden. Beide Originaldateien bleiben unverändert erhalten; semantischer Hash und beide Rohdateihashes stehen im Manifest. Erst dann wird `BASELINE.json` als Abschlussnachweis geschrieben. Ein fehlender Token beendet den Vorgang vor CLI-Aufruf und Sicherungsverzeichnisanlage. Fehlerantworten werden nicht roh ausgegeben, deaktivierte TLS-Prüfung wird abgewiesen.

Gesichert werden die beiden Konfigurationsdateien, eine Versionsliste ohne Mitarbeiternamen/Freitextmeldungen und die aktive Versionskennung samt Tag. Die eigentlichen Erweiterungsquellen sind damit **noch nicht** vollständig gesichert: `extensionsSourceBackupComplete: false`, `deploymentReady: false`, `released: false` bleiben ausdrücklich im Ergebnis. Erst die vollständige Erweiterungsinventur und der tatsächliche Händler-/Kundenanschluss erlauben den nächsten Veröffentlichungsschritt.

Gezielte neue Prüfung: `node --test ops/shopify/read-baseline.test.mjs`. Die bestehende Produkt-/Browser-/Druckabnahme wird durch diesen eigenständigen Betriebshelfer nicht geändert.

Aktuell installierter privater Helfer: `gravuru-shopify-deploy-tools/read-baseline-a3d551e7.mjs`. **15 gezielte lokale Prüfungen und echter Serverlauf erfolgreich.** [Aktueller Serverstatus vom 09.10.2026](../../docs/dashboard-20261004/SHOPIFY-ZUGRIFF-BESTAETIGT-20261009.md). Vorheriger Helfer `read-baseline-3996475.mjs` und sein Fehlversuch bleiben als historische Nachweise erhalten.
