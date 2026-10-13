# Livegang: belegter Abgleich vom 13.10.2026

Der Nutzer hat Installation und Livegang ausdrücklich freigegeben. Dieser Bericht dokumentiert die tatsächlich ausgeführten Prüfungen und die noch bestehende Ausführungsgrenze; er ist keine Veröffentlichung oder vollständige Produktionsabnahme.

## Erhaltener Quellstand

- Neuester hier abgerufener Produktstand: `4d7c150351b5f62a7572d8c21d067e6290d3a566`, Branch `task/plugin-design-pipeline-20261013`.
- Getrennte Arbeitskopie `/workspace/gravuru-go-live-20261013`, eigener Branch `task/go-live-preflight-20261013`. Die ursprüngliche saubere Arbeitskopie auf `work` wurde nicht zurückgesetzt.
- Der Stand enthält die neueren P1-Korrekturen und Produktfamilien vom 13.10. Seine Berichte bezeichnen diese Änderungen ausdrücklich als **nicht installiert**.
- Der wiedergefundene Projektüberblick vom 12.10. dokumentiert installierten Code `7a168bc66adc9718bc9b0fefad97c338e546c57d` auf `https://app-2027.gravuru-designwerkstatt.de`. Das ist historische Serverevidenz, keine heutige Prüfung der Serverdateien.
- Die frühere Basis `d8a0944` vom 7.10. ist überholt und darf nicht ungeprüft installiert werden.

## Heute tatsächlich geprüft

- Git-Fetch der Recovery- und aktuellen Entwicklungsbranches erfolgreich; neue Arbeitskopie aus dem bestätigten Commit angelegt.
- Lesende Shopify-Abfrage: App `Gravuru Konfigurator`, `gid://shopify/App/423276544001`, installiert als `gid://shopify/AppInstallation/941403308412`.
- Aktuell gewährte Bereiche: `read_files`, `read_metaobjects`, **`read_orders`**, `read_products`, `read_publications`, `write_files`, `write_metaobjects`, `write_products`, `write_publications`, `write_cart_transforms`, `read_cart_transforms`.
- Cloud-Status: laufend/verbunden, Beobachtungen aktuell; Netzwerk eingeschränkt auf Paketmanager, keine zusätzlichen Hosts, keine gemeldeten Secret-/Variablenbindungen.
- Prüfung ausschließlich auf Vorhandensein: `GRAVURU_PLESK_USERNAME`, `GRAVURU_PLESK_PASSWORD`, `GRAVURU_PLESK_API_KEY` und `GRAVURU_SHOPIFY_CLIENT_SECRET` nicht in dieser Laufzeit eingebunden. Keine Werte gelesen oder ausgegeben.
- Ein lesender HTTPS-Versuch zu `app-2027.gravuru-designwerkstatt.de` über den vorgesehenen Proxy: CONNECT mit HTTP 403 abgewiesen, curl-Exitcode 56. Der Zielserver und dessen TLS-Handshake wurden nicht erreicht. Ein curl-Ausgabewert `ssl_verify_result=0` ist unter diesen Umständen kein erfolgreicher TLS-Nachweis.

Der Shopify-Connector ist eine eigenständige Verbindung. Sein erfolgreicher Lesezugriff belegt weder Plesk-Anmeldung noch authentifizierten Zugriff des Anwendungsprozesses.

## Vor Installation erforderlich

1. In der bestehenden Umgebung die vorgesehenen HTTPS-Ziele `gravuru.highspeed.cloud` (Plesk auf 8443) und `app-2027.gravuru-designwerkstatt.de` freigeben. Kein Proxy-Bypass, keine globale uneingeschränkte Freigabe erforderlich.
2. Die vorhandenen persönlichen Einträge `GRAVURU_PLESK_USERNAME` und `GRAVURU_PLESK_PASSWORD` an diese Laufzeit binden; keine neuen Tokens allein wegen dieses Befunds erzeugen. Werte gehören ausschließlich in die sichere Konfiguration.
3. Nach bestätigter Bereitstellung genau einmal Zugriff prüfen. Dann aktiven Serverstand, Einstieg und private Konfiguration lesend abgleichen; aktuelle private Datenbanken sichern und ihre Integrität prüfen.
4. Nur den tatsächlich vorgesehenen neuen Release bauen, getrennt installieren und passend prüfen. Vor Aktivierung sicherstellen, dass keine neuere Arbeit oder private Daten überschrieben werden. Den vorhandenen Aktivierungs-/Rückweg unter `ops/plesk/` verwenden.
5. Öffentliche Verkaufsbindung, reale Kunden-/Warenkorbstrecke und Produktionsausgabe sind gesondert zu bestätigen. Der dokumentierte Händler-Testkauf für eine Schieferrevision beweist nicht den Verkauf aller Produkte. Unbestätigte Stammdaten der jüngsten Familien nicht als Verkaufswerte verwenden.

Keine Anwendung, Shopify-App-Konfiguration, Produkte, Bestellungen, Zahlungen, private Daten oder Servereinstellungen wurden bei diesem Abgleich geändert. Keine kostenpflichtige KI-Anfrage. Keine unveränderten historischen Testläufe wiederholt.
