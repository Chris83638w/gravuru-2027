# Shopify-Zugriff und Rückkehrversion bestätigt · 09.10.2026

Der Nutzer hat den App-Automation-Token selbst in der vorbereiteten privaten Plesk-Datei hinterlegt. Reguläre Datei, Anwendungseigentümer, Datei 0600 und Elternverzeichnis 0700 bestätigt; kein Schlüsselwert ausgegeben, ins Repository übernommen oder ins Installationspaket gepackt.

## Tatsächlicher Abruf

Shopify CLI 4.9.0, bestehende App **Gravuru Konfigurator**, Client-ID `9640dd7a6907f0c73e7013ea8c24869b`. Der korrigierte private Sicherungshelfer beendet den echten Serverlauf mit **Exitcode 0**. Zwei Konfigurationsabrufe und zwei Versionslisten bestätigen unveränderte Konfigurationswerte und dieselbe aktive Version:

- Aktive Version: **`variante-m-embedded-motifs-20260928`**.
- Versions-ID: `gid://shopify/Version/1146632241153`, 20 gelistete Versionen.
- App-URL: `https://gravuru-designwerkstatt.de/produktanlage.html`, eingebettet.
- Redirects: `https://gravuru.de/shopify-designwerkstatt-20260920/` und die App-URL.
- Erforderliche Scopes: `read_files,read_metaobjects,read_products,read_publications,write_files,write_metaobjects,write_products,write_publications`; optional `write_cart_transforms`.
- Direkter Admin-Zugriff: online, aktiviert. Webhook-API `2026-07`, keine Abonnements in der abgerufenen App-Konfiguration und kein App Proxy. Dies ist keine vollständige Inventur separat über die Admin API registrierter Webhooks.
- App-eigene Produkt-Metafelddefinition `personalization`, JSON, Händlerzugriff lesend; beim späteren Release erhalten.

Originaldateien, reduzierte Versionsliste und Abschlussmanifest liegen ausschließlich in `private/gravuru-release-baseline-VbDT5z` auf dem Server. Semantischer Konfigurationshash `911735a81806235fddc2b0fee3b6c26020ac91bacd6438f2bb49a7e2ad02a39c`; die unterschiedlichen Hashes der beiden unveränderten TOML-Dateien stehen im Manifest. [Servernachweis](shopify-release-baseline-20261009/access-confirmed.json) · [Konfigurationsinventur](shopify-release-baseline-20261009/configuration-inventory.json).

## Im echten Betrieb erkannte Helferfehler behoben

Der erste Abruf nach Hinterlegung scheiterte bei der Versionsliste: CLI-Exitcode 2, `--config=before cannot also be provided when using --client-id`. Die Versionsabfrage nutzt jetzt ausschließlich die unmittelbar zuvor auf die feste Client-ID geprüfte Konfigurationsdatei. Geerbte Shopify-Flagvariablen bleiben entfernt.

Anschließend erkannte der rohe Dateihash unterschiedliche TOML-Reihenfolgen als Änderung. Python 3.11 `tomllib` bestätigt gleiche Werte; der Helfer vergleicht jetzt alle geparsten Werte in kanonischer Darstellung und sichert zusätzlich beide unveränderten Originaldateien mit ihren eigenen Hashes. Tatsächlich unterschiedliche Werte oder aktive Versionen brechen weiterhin ab. Auch eine lokale Dateiänderung während des CLI-Aufrufs verhindert einen Abschluss.

**15 gezielte lokale Prüfungen bestanden**, einschließlich CLI-Flagvertrag, abweichender Formatierung, echter Inhaltsänderungen, ungültigem TOML, Dateischutz, App-Identität und Geheimnisredaktion. Abschließend echter Serverlauf erfolgreich. Keine unveränderte Produkt-/Browser-/Druckabnahme wiederholt.

Installierter privater Helfer: `gravuru-shopify-deploy-tools/read-baseline-a3d551e7.mjs`, SHA-256 `a3d551e762e3e380b5d2962caa4b84bd5b89fbc16097b009a4fbe92f3649b364`. Vorherige Helfer und fehlgeschlagene Abrufverzeichnisse erhalten. Weblaufzeit und Installationspaketquelle `583ad9a` unverändert.

## Vorhandene Erweiterungen und offene Veröffentlichung

Eigener lesender Admin-API-Aufruf mit API `2026-07`, HTTP 200 und geprüfter App-Identität: **`gravuru-personalization-price`**, Typ `cart_transform`, Function-ID `01a0e45d-c47f-70b9-9d5a-a2c72120ae01`. Ein zugehöriger Cart Transform `gid://shopify/CartTransform/172523900`, **`blockOnFailure: true`**. Beide Listen vollständig, keine weitere Seite. Keine Mutation und kein Checkout ausgelöst. [Nachweis](shopify-release-baseline-20261009/existing-functions.json).

Der Nutzer-Screenshot zeigt außerdem eine aktive Onlineshop-Erweiterung und einen Checkout-Fehler. Das ist ein eigener historischer UI-Nachweis; die konkrete Ursache des Checkout-Fehlers ist noch nicht bestimmt. Quellen dieser Erweiterungen sind weder im aktuellen Projekt/Git-Verlauf noch in der begrenzten Serverinventur gefunden worden. Durchsucht: zugängliche Anwendungsordner bis Tiefe 5; private Daten, Abhängigkeiten und System-/Cacheverzeichnisse ausgeschlossen, keine Symlinks verfolgt. Die private Werkzeugablage enthält ebenfalls kein ursprüngliches Erweiterungsprojekt. [Inventur](shopify-release-baseline-20261009/extension-file-inventory.json).

Die tatsächlich installierte CLI-Hilfe für `app logs` beschränkt den Shopfilter auf Development- bzw. Shopify-Plus-Sandbox-Shops und beschreibt einen Echtzeitstream, keinen historischen Fehlerabruf. Für den regulären Shop ist hier kein entsprechender Sandbox-Nachweis vorhanden. Deshalb kein ungeeigneter Logstream und kein Testkauf als Umweg. Zur konkreten Fehlerursache fehlt der historische Function-Fehlereintrag aus dem Dev-Dashboard; nur Fehlercode/technische Meldung, keine Warenkorb-/Kundendaten übernehmen. Die Freigabe eines sicheren Testzahlungswegs bleibt davon getrennt.

**Kein Deployment aus dem unvollständigen Konfigurationsprojekt:** Konfiguration und Rückkehrversion sind gesichert, Erweiterungsquellen noch nicht. Die aktive App-URL bleibt unverändert. Händler-/Kundenanschluss, passende Varianten-/Preisbindung, Bestellberechtigungen und belastungsfreier Testkauf bleiben offene Implementierung bzw. Abnahme. Die Veröffentlichungsfreigabe liegt vor; keine neue allgemeine Freigabe erforderlich.

GitHub-HTTPS-Authentifizierung fehlt auch in aktueller Cloud-Revision 70 (`git ls-remote`: fehlende Anmeldedaten). Lokale Git-Sicherung und private Serverinstallation sind davon getrennt; kein erfolgreicher Push behauptet.
