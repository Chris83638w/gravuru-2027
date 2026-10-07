# Privates Plesk-Testpaket – Gravuru 2027

Dieses Paket enthält den aktuellen Neuaufbau einschließlich ZIP-Import und gemeinsamen Excel-Quellordnern. `PACKAGE-MANIFEST.json` nennt den vollständigen Quellcommit und SHA-256 jeder enthaltenen Datei. Die nebenliegende `.sha256` gilt für das gesamte ZIP. Keine vorhandenen Datenbanken, Secrets, virtuellen Python-Umgebungen oder historischen Installationspakete enthalten.

**Ziel:** separate, passwortgeschützte HTTPS-Testinstanz für genau einen App-Prozess. Kein Shopify-Login, keine Shop-Schreibzugriffe, kein Deployment über dieses Dokument ausgelöst. Der bisherige Shopify-Start bleibt im Quellcode vorhanden, wird von diesem Paketstart aber nicht verwendet. Änderungen an der bestehenden Shopify-App sind nicht erforderlich.

## 1. Einmalige Voraussetzungen in Plesk bestätigen

Eine Person mit funktionierendem Plesk-Browserzugriff richtet ausschließlich den neuen Testbereich ein. Plesk-API, SSH und VPN werden nicht benötigt. Die folgenden Namen sind **Vorschläge**, keine bereits eingerichteten Adressen/Pfade:

| Einstellung | Vorschlag |
| --- | --- |
| HTTPS-Testadresse | `https://test-2027.gravuru-designwerkstatt.de` |
| Application Root | `/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-2027-test` |
| Document Root | `/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-2027-test/public` |
| Private Daten | `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-data` |
| Eigenes Python | `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python` |

Der bisherige Ordner `/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-werkstatt` bleibt unberührt. Auch dessen `private/product-data`, Runtime-Auswahl, Python-Umgebung, App-Secret, Startdateien und Datenbanken nicht kopieren, verschieben oder als Testpfad verwenden.

Vor Beginn bestätigen:

- Eigene Subdomain mit DNS-Zuordnung, gültigem Zertifikat und Weiterleitung HTTP → HTTPS ausschließlich für diese Subdomain.
- Plesk-Erweiterung **Node.js**, Node **24 oder neuer**, npm-Skriptausführung über **Run script / Skript ausführen**. Es gibt keine npm-Laufzeitabhängigkeiten.
- Linux, Python **3.11 oder neuer**, `venv` und `pip`, Systembibliothek **libcairo**. Das alte Serverprotokoll belegt nicht die heutige Verfügbarkeit. Fehlende Systempakete muss die Hostingverwaltung bereitstellen; keine gemeinsam benutzten Pakete/Interpreter ändern.
- Ausgangs-HTTPS zu den Python-Paketquellen für die einmalige Installation mit unveränderter TLS-Prüfung; Schreibrechte des Test-App-Benutzers in den eigenen Testverzeichnissen.
- **Ein App-Prozess für diese Testinstanz.** Passenger Enterprise bietet `PassengerMaxInstances 1` je Virtual Host. Bei anderen Installationen muss die Hostingverwaltung einen unterstützten, auf diese Testinstanz beschränkten Einzelprozessbetrieb bestätigen. `PassengerMinInstances 1` ist keine Obergrenze. **Nicht** das globale `PassengerMaxInstancesPerApp` ändern: Das beträfe auch die laufende Werkstatt. Der Paketstart sperrt eine zweite Instanz derselben Datenablage; fehlende Einzelprozesskonfiguration nicht durch Entfernen der Sperre umgehen.

Ohne diese Möglichkeiten die Einrichtung an dieser Stelle an die Hostingverwaltung geben. Ein Dateimanager allein kann keine fehlende Node-/Python-/Prozesskonfiguration ersetzen.

## 2. Ausschließlich den neuen Testbereich vorbereiten

1. Unter **Websites & Domains** eine eigene Test-Subdomain mit den obigen getrennten Verzeichnissen anlegen. Vorhandene Live-Domain nicht umstellen. HTTPS-Zertifikat zuordnen und HTTPS-Weiterleitung aktivieren.
2. Im **Dateimanager** das ZIP in den neuen Application Root hochladen und dort entpacken. Direkt dort müssen `app.cjs`, `package.json`, `PACKAGE-MANIFEST.json`, `app/`, `ops/` und `public/` liegen. Keine zusätzliche äußere ZIP-Verzeichnisebene verwenden.
3. ZIP nach Entpacken aus dem Server-Testordner entfernen oder außerhalb des Document Root privat ablegen. Der **Document Root muss `public/` sein**, niemals der Application Root. `public/` enthält nur `robots.txt`; Quellcode und Manifest gehören nicht in den Webroot.
4. Falls nötig den übergeordneten Ordner `private/` per Dateimanager anlegen. Die beiden letzten Verzeichnisse für Daten/Python noch leer lassen oder noch nicht anlegen. Keine vorhandenen Bestandsordner auswählen. Der Vorbereitungsbefehl kennzeichnet nur neue/leere Testordner und setzt dort Rechte **0700**; Dateien erhalten **0600**.
5. Unter **Node.js** für genau diese Subdomain einstellen: Node-Version **24+**, Modus **production**, Application Root wie oben, Document Root `public`, Startup File **`app.cjs`**. Die Node-Erweiterung nutzt Passenger; kein öffentlich freigegebener zusätzlicher Node-Port erforderlich. Den normalen Loopback-Start `app/configurator/variant-m/server.mjs` nicht als Plesk-Startdatei wählen.
6. In den **Apache & nginx-Einstellungen** ausschließlich dieser Test-Subdomain in den zusätzlichen **HTTPS-Apache-Direktiven** setzen:

   ```apache
   RequestHeader set X-Forwarded-Proto "https"
   ```

   Der Proxy muss den ursprünglichen Test-`Host` erhalten. Den Header serverseitig überschreiben, nicht vom Browser übernehmen; die HTTP-Seite muss vorher auf HTTPS umleiten. Den Header nicht für Live-Domain oder unverschlüsselten HTTP-VHost setzen. Fehlt das Feld oder das benötigte Apache-Modul, muss die Hostingverwaltung die gleichwertige Einstellung für diesen Test-VHost vornehmen. Der Node-Teststart verweigert Anfragen ohne diesen Nachweis.

7. Request-Limit für den Test-VHost mindestens **25 MiB** und Proxy-Zeitlimit mindestens **120 Sekunden**, soweit im Hosting nötig. Das ZIP wird lokal im Browser entpackt, einzelne SVG/PDF-Seiten werden als JSON hochgeladen. Kein globales Limit anderer Anwendungen verändern.

## 3. Werte sicher in der neuen Node-Anwendung setzen

Unter **Node.js → Custom environment variables / Benutzerdefinierte Umgebungsvariablen** nur für die Test-Subdomain eintragen:

| Name | Wert / Bedeutung |
| --- | --- |
| `GRAVURU_TEST_ORIGIN` | Tatsächliche neue HTTPS-Adresse, ohne Pfad oder abschließenden `/` |
| `GRAVURU_PRIVATE_DATA_DIR` | Absoluter neuer Datenpfad aus Schritt 1 |
| `GRAVURU_TEST_PYTHON_DIR` | Absoluter neuer Python-Verzeichnispfad aus Schritt 1 |
| `GRAVURU_BOOTSTRAP_PYTHON` | Vorhandener Python-3.11+-Interpreter; Standard `/usr/bin/python3`, gegebenenfalls von der Hostingverwaltung bestätigen lassen |
| `GRAVURU_TEST_USERNAME` | Eigener Testbenutzer, z. B. `gravuru-test` |
| `GRAVURU_TEST_PASSWORD` | Neues starkes Testpasswort aus dem Passwortmanager, 24–200 druckbare ASCII-Zeichen |

Das Passwort ausschließlich im Passwortmanager und im geschützten Plesk-Eingabefeld verwalten. Nicht in Chat, Paket, Repository, Screenshot oder Befehlsargumente schreiben. Es ist unabhängig von Plesk-/Server-/Shopify-Zugangsdaten. Keine `GRAVURU_SHOPIFY_*`-Werte aus dem Live-System übernehmen.

`GRAVURU_PYTHON` wird vom Teststart auf `<GRAVURU_TEST_PYTHON_DIR>/bin/python` gesetzt. Kein globales `PYTHONPATH`, keine gemeinsame Live-Python-Installation verändern. `GRAVURU_TEST_PORT` ist nur für lokale Prüfungen ohne Passenger vorgesehen und muss in Plesk nicht gesetzt werden.

## 4. Installation und Start per Plesk-Schaltfläche

Im Bereich **Node.js → Run script / Skript ausführen**, jeweils in dieser Testanwendung:

1. **`plesk:prepare`** ausführen. Es prüft Python 3.11+, initialisiert ausschließlich die eigenen leeren Testordner, erstellt dort eine eigene Python-Umgebung und installiert die in `ops/plesk/requirements.txt` referenzierten Pakete. Keine globale pip-Installation, keine Kopie alter Daten. Bei Erfolg: `prepared: true`, `serverStarted: false`.
2. **`plesk:check`** ausführen. Es prüft Konfiguration, private Verzeichnisse, SQLite, Python-Imports und eine kleine Cairo-Konvertierung. Es gibt nur Statusangaben aus, keine Passwörter. Erwartet: `configured: true`, `sqlite: true`, `dependencies: true`, `cairo: true`. `httpsVerified: false` ist hier korrekt: Ein lokaler Vorabcheck beweist noch keinen Browserzugriff.
3. **Restart App / Anwendung neu starten** ausschließlich für die Test-Subdomain. Startdatei bleibt `app.cjs`. Keinen Live-Worker beenden und keine Live-`restart.txt` anfassen.

Falls Plesk zum Aktivieren der npm-Skriptliste zunächst **NPM install** verlangt, ist das in diesem separaten Paket möglich: Die Node-Paketdatei hat keine Abhängigkeiten und keine Installations-Hooks. Python wird ausschließlich über `plesk:prepare` installiert.

`plesk:prepare` darf bei unterbrochener Installation dieselben gekennzeichneten Testordner weiterverwenden. Es darf **nicht** gegen einen Bestands-/Live-Ordner laufen. Fremde, nicht leere Verzeichnisse werden abgewiesen. Fehlerausgaben nennen die fehlende Voraussetzung; Zugangsdaten nicht in Fehlerberichte kopieren.

## 5. Neue Hosting-Abnahme im Browser

Diese Prüfung betrifft die **neue Bereitstellung**, nicht eine Wiederholung der abgeschlossenen Produktabnahmen:

1. Privates Browserfenster öffnen, `https://<Testadresse>/__test/health` aufrufen. Zertifikat muss gültig sein; ohne Anmeldung muss die Browser-Passwortabfrage erscheinen. Nach Anmeldung: `ready: true`, `scope: private-operator-test`, `shopifyConnected: false`.
2. `https://<Testadresse>/werkstatt/` öffnen. Der private Testzugang erlaubt sämtliche Bedienungen innerhalb dieser neuen Datenablage; Zugang nur an berechtigte Tester geben. Der unveränderte vorhandene Konfigurator und die Produktserien müssen laden. Bei dieser ersten Installation gibt es nur den mitgelieferten Master und keine alten Produkte/Bestellungen.
3. Mit einer **synthetischen** SVG-/Excel-Datei einen kleinen Import durchführen; Importbericht/Excel herunterladen. Damit sind auf dem Zielserver SQLite, Python-Subprozesse und Dateiausgaben tatsächlich geprüft. Ein gültiger Health-Status allein beweist diese Strecke nicht.
4. Nur diese Testanwendung neu starten. Testprodukt muss erhalten bleiben; anschließend keine neue/duplizierte Übernahme. Vor Produktions- oder Massentests die Zielserver-Abnahme dokumentieren.
5. Ohne Anmeldung darf kein `/api/workshop/products` erreichbar sein. `/.env`, `/PACKAGE-MANIFEST.json`, `/ops/plesk/config.mjs` und `/private/` dürfen auch angemeldet keine Dateien liefern. Die Datenablage liegt ohnehin außerhalb des Webroot.

Bei 403 zuerst exakten Host und das nur im HTTPS-VHost gesetzte Proxy-Protokoll prüfen; keine Schutzprüfung abschalten. Bei zweitem App-Prozess Einzelprozesskonfiguration klären. Bei Python-/Speicherfehlern private Pfade und Servervoraussetzungen prüfen. Browser-Basic-Anmeldung kann bis zum Schließen des privaten Fensters gespeichert bleiben; dieses Fenster danach schließen.

## 6. Grenzen, spätere Shopify-Anmeldung und Rücknahme

- Die Plesk-/Passenger-Installation auf dem echten Server muss noch durch die Person mit Browserzugriff bestätigt werden. Lokale Paketprüfungen beweisen weder das heutige Hosting noch DNS, Zertifikat oder Ressourcenlimits.
- Keine echten Kundendaten, Live-Bestellungen oder Produktionsdatenbanken in den Test importieren. Die Musterdaten sind keine Maschinen-/ICC-Freigabe.
- Das Paket startet als privater Operator-Test. Es verwendet keinen Shopify-App-Schlüssel und richtet keinen echten Login, Webhook, Warenkorb oder Shop-Entwurfstransport ein. Für die spätere echte Shopify-Strecke sind vorhandene App-Identität/Secret, HTTPS-Testziel und die erlaubte App-URL gesondert abzugleichen. Die bestehende Live-App-URL wird hier nicht geändert und keine neue App angelegt.
- Für Rücknahme ausschließlich die neue Testanwendung deaktivieren. Private Testdaten separat behalten/sichern; nicht in die laufende Werkstatt zurückspielen. SQLite-Sicherungen nur bei gestoppter Testanwendung konsistent mit allen zusammengehörigen Dateien durchführen. Updates und Datenübernahme sind kein automatischer Teil dieses Erstinstallationspakets.

Technische Grundlage für Passenger-Einstellungen: [offizielle Apache-Konfigurationsreferenz](https://www.phusionpassenger.com/docs/references/config_reference/apache/#passengermaxinstances), geprüft am 07.10.2026. Die verfügbare Plesk-Oberfläche, Erweiterungen und konkreten Berechtigungen vor Ort bleiben zu bestätigen.
