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

Die Browseridentität und der HTTPS-Eingang sind simuliert. Dies belegt **keine echte Shopify-Händleranmeldung** und **keine neue HTTPS-Serverabnahme**. Der Checkout wurde nicht ausgelöst. Der vorhandene Kundenansicht-Link ist über den eingeschränkten Händlerhost noch kein funktionierender Kundenanschluss; das bleibt Bestandteil der nächsten Integration.

## Nächster konkreter Anschluss

Getrennten freien Plesk-Bereich prüfen, Händlerpaket dort installieren, `plesk:merchant:prepare`/`check`, echten HTTPS-Schutz und Neustart nachweisen. Danach bestehende Shopify-Erweiterungen vollständig erhalten und erst den konkreten App-URL-Wechsel ausführen. Erweiterungsquellen/GitHub-Zugriff, historischer Checkout-Fehlereintrag, vollständige Warenkorb-/Bestell-/Kundenkontostrecke und ein sicherer Testzahlungsweg bleiben offen. Keine synthetischen Produkte ungeprüft veröffentlichen.

Der Nutzer wünscht eine Gegenprüfung durch Claude. Hier ist weder ein Claude-Werkzeug noch eine Claude-CLI vorhanden. Der [Prüfauftrag](../reviews/CLAUDE-AUFTRAG-20261009.md) mit Quellpaket bereitet die externe Prüfung vor; **keine erfolgte Claude-Prüfung behaupten**. Die hier ausgeführten Prüfungen stammen aus dieser Codex-Sitzung.

Offizielle Shopify-Referenz am 09.10.2026 gelesen: [ID Tokens](https://shopify.dev/docs/apps/build/authentication-authorization/id-tokens) – HS256 mit App-Schlüssel prüfen, Audience/Issuer/Destination/Zeitgrenzen kontrollieren, kurzlebige Token nur an den eigenen Backendhost senden. Beispiele aus Skills ersetzen diese Vorgaben nicht.
