# Getrennter Händlerstart · 09.10.2026

Fortsetzung auf `a46af0031167811855cb17631e51cf107f7215b6`, einschließlich ZIP-/Ordner-/Excel-Import und gesicherter Shopify-Rückkehrversion. Die vorhandene Operator-Testinstanz und die Live-Werkstatt wurden durch dieses Paket nicht umgestellt.

## Implementiert

Neue `ops/plesk/merchant-{config,runtime,manage}.mjs` und `merchant-app.cjs`: eigener Plesk-Start für die bestehende Händleroberfläche. Vier private Konfigurationsverweise, bestehender App-Schlüssel nur aus geschützter Datei in RAM, feste App-/Shop-Identität. Keine Automation-Tokens als App-Schlüssel, keine Admin-Schreibanbindung. Node 24+, vorhandenes Python 3.11+ mit den tatsächlich benötigten Bibliotheken, Cairo und Linux-Dateisperre geprüft. Keine zusätzlichen Python-Pakete auf dem Server installieren oder bestehende Umgebungen ändern.

Private Datenablage außerhalb von App/Git/alter Werkstatt, Kennzeichnung mit Origin, Eigentümer-/Dateirechteprüfung, kein Übernehmen fremder Dateien oder Datenbanken. Vorbereitung kennzeichnet nur leere eigene Ablagen. Vor der Datenbanköffnung gilt ein Betriebssystem-Lock; bei Verlust werden beide Listener geschlossen. LiteSpeed/Passenger darf nur den äußeren Listener übernehmen. Host und HTTPS-Proxywert sind fest; Weiterleitungsheader bestimmen kein Vertrauen.

Alle Werkstatt-APIs verlangen gültige Händler-Bearer-Token; Basic-Anmeldung und Kunden-Token öffnen keine Händlerdaten. CSRF bleibt zusätzlich erforderlich. Der bestehende authentifizierte App-Bridge-Host liefert dieselbe Oberfläche und eingeschränkte CSP. Privater Datei-/Manifest-/Kundeneditorzugriff bleibt gesperrt. Öffentliche HTML-Hülle ist kein anonymes Datenangebot.

Gezielte Ergänzung an `createWorkshop` und `createShopifyTestRuntime`: optionaler, ausschließlich für authentifizierte Händler zugelassener CSRF-Wert. Der neue Plesk-Start leitet ihn per HMAC aus App-Schlüssel, Origin und Client-ID ab. Ein LiteSpeed-Prozesswechsel verwirft damit keine offene Bearbeitung; Schlüssel- oder Originwechsel rotiert den Wert. Jede Anfrage benötigt weiterhin ihr eigenes gültiges kurzlebiges Shopify-Bearer-Token. Bestehender Operator- und Loopback-Start behalten ihre vorherigen Vorgaben.

Paketbauer unterstützt zusätzlich `--runtime shopify-merchant-test`, mit eigenem Einstieg und [eigener Plesk-Anleitung](../../ops/plesk/MERCHANT-README.md). Standard bleibt der private Operator-Test. Der neue Händlerstart ist kein fertiger Produktivmodus und keine bloße Umbenennung eines Testkennzeichens.

## Tatsächlich geprüft

- **6 neue Node-Prüfgruppen:** private Konfiguration/Schlüsselgrenzen, fremde/symlinkartige Daten, echte HTTP-Listener mit Host-/HTTPS-/Bearer-/CSRF-Schutz, konkurrierender Start, Speichern/Wiederöffnen/Neustart/Schlüsselrotation sowie Ablehnung eines beliebigen Programms statt Python.
- **15 betroffene vorhandene Laufzeitprüfungen** und **1 gezielte Operator-CSRF-Regressionsprüfung** bestanden. Kein unveränderter Produkt-/Druck-/Import-Gesamttest wiederholt.
- **Lokale Browserprüfung** der echten Oberfläche mit synthetischem App-Bridge-Provider: Produkt anlegen, neu öffnen, private Vorschaubilder mit Bearer laden; Desktop 1440 und Mobil 390 ohne horizontalen Überlauf oder JavaScript-Fehler. Beide Ansichten gesichtet. [Bericht](merchant-runtime-20261009/browser-report.json).
- Die erste Python-Prüffassung verlangte eine ungenutzte Zusatzbibliothek; die Prüfung wurde auf die tatsächlichen vorhandenen Projektanforderungen korrigiert. Für die lokale Prüfung eine isolierte Python-Umgebung aus den vorhandenen fixierten Anforderungen erstellt; keine Server-Python-Änderung.
- Die erste erweiterte Browserprüfung nutzte einen von der CSP gesperrten Ausdruck im Prüfharness. Der Harness nutzt jetzt eine Funktion; die CSP wurde nicht gelockert.

Bei der vorstehenden lokalen Browserprüfung sind Identität und HTTPS-Eingang simuliert. Diese lokale Prüfung belegt **keine echte Shopify-Händleranmeldung** und **keine neue HTTPS-Serverabnahme**. Der Checkout wurde nicht ausgelöst. Der vorhandene Kundenansicht-Link ist über den eingeschränkten Händlerhost noch kein funktionierender Kundenanschluss; das bleibt Bestandteil der nächsten Integration.

## Ergänzung: echte getrennte Plesk-Instanz

Am 09.10.2026 vorhandene Domains zuerst gelesen; kein geeigneter freier Händlerbereich vorhanden. Neue Subdomain **https://app-2027.gravuru-designwerkstatt.de/werkstatt/**, Plesk-Site 20 in bestehendem Abonnement 14. Anwendung `gravuru-2027-merchant`, Dokumentenroot `public`, Start `app.cjs`, Node 24.21.0, Produktionsmodus der Laufzeit bei ausdrücklich bleibendem Händler-Testmodus. Gültiges TLS; HTTP leitet mit 301 auf denselben HTTPS-Pfad. Nur diese Site erhielt den festen HTTPS-Proxyheader. Keine globalen Einstellungen geändert.

Installiert: **27.204.504 Bytes (25,9 MiB)**, SHA-256 `50de25951d7e3ab0bbebacac9cd87b42ddbb17219d7e42f77adc6b48b21af105`, Quellcommit **5884f3e5becbb3226691fd0dc98beb5d8440306e**. ZIP und sämtliche 369 Manifestdateien vor/nach dem Entpacken geprüft. Neue private Konfigurationsdatei 0600 und eigene Datenablage; vorhandener App-Schlüssel nur referenziert, bestehendes privates Python 3.11.16/Cairo wiederverwendet, keine Paketinstallation darin. `npm run plesk:merchant:prepare` und `npm run plesk:merchant:check` erfolgreich.

Echte HTTPS-Serverprüfungen mit gültiger TLS-Prüfung und ohne Weiterleitungen: HTML 200, anonyme/ungültige Bearer-Anfragen 401, private Dateien/Manifest/ZIP 403 oder 404, fehlender CSRF 403. Ein kurzlebiger synthetischer Händler-JWT blieb ausschließlich im Serverprozess. Damit neues Testprofil angelegt (201), wieder geöffnet (200), ausschließlich diese App neu gestartet, Profil exakt erhalten und unter derselben ID/Revisionsfortsetzung bearbeitet (200). Alter CSRF-Wert blieb gültig. Prozess-ID wechselte; vorher/nachher genau ein App-Prozess beobachtet und zweite Datensperre abgewiesen. **Dies ist ein echter Hostingnachweis mit synthetischer Identität, keine echte Shopify-Anmeldung.**

Die erste Probe erwartete für `/.env` genau 404; Plesk sperrt diese Datei bereits mit 403. Probe auf beide gültigen Sperrantworten korrigiert, ohne Produkt-/Sicherheitsänderung. Ursprünglicher Befund bleibt erhalten. Direkter anonymer Browseraufruf zeigt fehlende Shopify-Anmeldung und App-Bridge-Meldung zum fehlenden `shop`-Kontext; das ist keine bestandene eingebettete Browserabnahme. [Installationsübersicht](merchant-runtime-20261009/server-installation.json), [HTTPS vor Neustart](merchant-runtime-20261009/server-before-v2.json), [nach Neustart](merchant-runtime-20261009/server-after.json), [Browserbefund](merchant-runtime-20261009/server-public-browser.json). Exakt verwendete serverseitige Proben liegen bei den Berichten; enthalten keine Schlüsselwerte.

## Nächster konkreter Anschluss

Bestehende Shopify-Erweiterungen vollständig erhalten und danach den konkreten App-URL-Wechsel ausführen. Erweiterungsquellen/GitHub-Zugriff, historischer Checkout-Fehlereintrag, vollständige Warenkorb-/Bestell-/Kundenkontostrecke und ein sicherer Testzahlungsweg bleiben offen. Keine synthetischen Produkte ungeprüft veröffentlichen. Rückweg für den neuen Host: ausschließlich Node-App von Site 20 stoppen, Daten erhalten; alte App-Konfiguration wurde nicht geändert.

Der Nutzer wünscht eine Gegenprüfung durch Claude. Hier ist weder ein Claude-Werkzeug noch eine Claude-CLI vorhanden. Der [Prüfauftrag](../reviews/CLAUDE-AUFTRAG-20261009.md) mit Quellpaket bereitet die externe Prüfung vor; **keine erfolgte Claude-Prüfung behaupten**. Die hier ausgeführten Prüfungen stammen aus dieser Codex-Sitzung.

Offizielle Shopify-Referenz am 09.10.2026 gelesen: [ID Tokens](https://shopify.dev/docs/apps/build/authentication-authorization/id-tokens) – HS256 mit App-Schlüssel prüfen, Audience/Issuer/Destination/Zeitgrenzen kontrollieren, kurzlebige Token nur an den eigenen Backendhost senden. Beispiele aus Skills ersetzen diese Vorgaben nicht.

## GitHub und vorhandene Erweiterungen

Tatsächlicher Push dieses Zweigs am 09.10.2026: Exit **128**, `could not read Username for https://github.com: terminal prompts disabled`. Kein Push bestätigt. Die GitHub-Verbindung der Cloud-Laufzeit muss für `Chris83638w/gravuru-2027` und das historische Erweiterungsrepository `Chris83638w/gravuru-shopify` sicher wieder eingebunden werden; keine Tokens im Chat. Lokale Commits und eine zusätzliche private Git-Bundle-Sicherung erhalten den Fortschritt.

Installierte Shopify CLI 4.9.0 gezielt lesend untersucht: `app import dashboard-extensions` importiert Payments-/Flow-/Marketing-/Subscription-/Admin-Link-Konfigurationen, keine Theme-/Function-Quellen. Kein Import/Deployment ausgeführt; vorhandene Erweiterungen bleiben unverändert. [Nachweis](shopify-release-baseline-20261009/extension-import-capability.json). Der Automation-Token ist weiterhin vorhanden und geprüft; er wird hierfür nicht nochmals angefordert.
