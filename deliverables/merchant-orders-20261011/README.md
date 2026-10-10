# Händlerwerkstatt: signierter Testbestelleingang – 11.10.2026

Version `0.1.0-recovery.20261010+ca4f6cd5b5d2`, Quellcommit `ca4f6cd5b5d2d0255485fb2bf3d73de339d485fc`.

- Paket: `gravuru-merchant-orders-v2-20261011.zip`, 27.238.032 Byte.
- SHA-256: `4e03b3af7b1af7972153d6977c86ff36f3841bd74c768f780e921e7357a902bf`.
- 390 geprüfte Laufzeitdateien plus Manifest; automatischer Installer, Aktivierung, optionaler Testbestelleingang und fest begrenzter Shopify-Registrierungshelfer.
- Keine Geheimnisse, Kundendaten, privaten Datenbanken oder privaten PDF-Originale. Vorhandene private Konfiguration und Daten werden getrennt benötigt.

## Automatischer Ablauf

1. `sha256sum -c gravuru-merchant-orders-v2-20261011.sha256` im Paketverzeichnis ausführen.
2. `ops/plesk/install-archive.py`, `stage-merchant-release.py` und `activate-merchant-release.py` aus dem geprüften ZIP in ein neues privates Hilfsverzeichnis extrahieren.
3. `stage-merchant-release.py --archive <ZIP> --sha256 <Prüfsumme> --target <neues privates Release-Verzeichnis> --config <private Händler-Konfiguration> --node <Node-24-Pfad>` prüft Manifest und Konfiguration und erstellt den Build.
4. Nur den betreffenden Händlerprozess anhalten. `activate-merchant-release.py --root <gravuru-2027-merchant> --release <Release-Verzeichnis> --config <Konfiguration> --backup <neues privates Sicherungsverzeichnis> --expected-entry-sha256 <geprüfte bisherige Startdatei-Prüfsumme>` prüft die exklusive Datenbanksperre, sichert alle drei Datenbanken samt Start-/Laufzeitdateien und wechselt atomar die Startdatei.
5. Optional vor dem Neustart `GRAVURU_SHOPIFY_CONFIG_FILE=<Konfiguration> node <Release-Verzeichnis>/ops/plesk/enable-order-webhook.mjs <Sicherungsverzeichnis>` ausführen. Der Helfer verlangt die passende Aktivierung und unveränderte gesicherte Konfiguration. Er ergänzt ausschließlich `test-only-2026-07`; Wiederholung ist idempotent, zwischenzeitliche Änderungen bleiben geschützt.
6. Händlerprozess starten; Seiten und geschützte APIs über HTTPS prüfen. Unsigned POST auf `/webhooks/shopify/orders-paid` muss 401 liefern. Dies erzeugt keine Bestellung.
7. Erst nach geprüfter Veröffentlichung der minimalen Shopify-Berechtigung `read_orders`: `GRAVURU_SHOPIFY_CONFIG_FILE=<Konfiguration> node <Release-Verzeichnis>/ops/plesk/register-order-webhook.mjs`. Der Helfer prüft eigene App, tatsächlich gewährte Berechtigung, bestehenden Vertrag und Erreichbarkeit. Er legt höchstens ein festes `ORDERS_PAID`-Abonnement mit `test:true` und notwendigen Feldern an und bestätigt es lesend. Bei unklarer Antwort zuerst das private Versuchsprotokoll und Shopify lesen; keine unveränderte erneute Create-Anfrage.

[Getrennte Installationsprüfung](../../docs/releases/20261011/orders/package-install-v2.json) und [vollständige Paketaktivierung mit Neustart](../../docs/releases/20261011/orders/activated-package-test-v2.json) bestanden. Die signierten Testnachrichten hierfür waren synthetisch und ausschließlich lokal.

[Veröffentlichungsbericht](../../docs/releases/20261011/orders/RELEASE.md). Das Paket allein aktiviert keinen Kunden-Checkout, löst keine Zahlung aus und erteilt keine Produktionsfreigabe. Die bisherige Kundenwerkstatt wird nicht ersetzt.

Das erste Paket `gravuru-merchant-orders-20261011.zip` (Quelle `d16b3ce`, SHA-256 `6b233c85bd1a7787be42de248f35ccfe318b426973ec3ff505f7dd2cb724537d`) bleibt als Zwischenstand erhalten. Sein Registrierungshelfer scheitert sicher an der automatisch gesetzten Browser-Metadaten-Kopfzeile des Node-fetch-Aufrufs. Für neue Installationen ausschließlich das korrigierte v2-Paket verwenden. Laufzeit und Schutzregeln des Bestelleingangs sind in beiden Paketen gleich.
