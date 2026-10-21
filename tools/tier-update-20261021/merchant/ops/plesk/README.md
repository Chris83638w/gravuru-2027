# Privates Plesk-Testpaket – Gravuru 2027

Dieses Paket enthält den aktuellen Neuaufbau einschließlich ZIP-Import, gemeinsamen Excel-Quellordnern und Schrift-/Motiv-/Fertigungsprofilzuordnung. `PACKAGE-MANIFEST.json` nennt den vollständigen Quellcommit und SHA-256 jeder enthaltenen Datei. Die nebenliegende `.sha256` gilt für das gesamte ZIP. Keine vorhandenen Datenbanken, Secrets, virtuellen Python-Umgebungen oder historischen Installationspakete enthalten.

**Ziel:** separate, passwortgeschützte HTTPS-Testinstanz für genau einen App-Prozess. Kein Shopify-Login, keine Shop-Schreibzugriffe, kein Deployment über dieses Dokument ausgelöst. Der bisherige Shopify-Start bleibt im Quellcode vorhanden, wird von diesem Paketstart aber nicht verwendet. Änderungen an der bestehenden Shopify-App sind nicht erforderlich.

**Hostingbefund 07.10.2026:** Der vorhandene Server verwendet LiteSpeed 6.3.7 (Apache nicht aktiv), Plesk 18.0.81 und Node 24.21.0. Die getrennte Subdomain `test-2027.gravuru-designwerkstatt.de` wurde angelegt und mit gültiger TLS-Prüfung erreicht. Die npm-Konsole sieht `/usr/bin/python3.12` (3.12.14), die geschützte Node-Weblaufzeit jedoch nicht: dort schlug die Auflösung des venv-Interpreters mit `ENOENT` fehl. `/opt/alt/python311/bin/python3` ist in beiden Laufzeiten ausführbar; die Konsole meldet dafür 3.11.16. Diesen vorhandenen Interpreter für die private Umgebung verwenden. `/usr/bin/python3` ist in der Konsole noch 3.6.8 und reicht nicht aus. Keine Interpreter oder Systembibliotheken als Umweg in die geschützte Laufzeit kopieren und keine globalen Sicherheitsgrenzen ändern. Eine bestandene npm-Prüfung allein ist noch keine Web-Abnahme.

LiteSpeed ersetzt `http.Server.listen()` und `address()` für den öffentlichen Anwendungssocket. Der interne Werkstattserver verwendet deshalb ausdrücklich die unveränderten Methoden von `net.Server` für einen eigenen Loopback-Socket. Nur der äußere, passwortgeschützte Server gelangt an den LiteSpeed-Listener. Passenger behält seinen eigenen Startweg. Einzelprozess- und Neustartverhalten auf dem jeweiligen Hosting weiterhin bestätigen; Passenger-Direktiven gelten nicht automatisch für LiteSpeed.

LiteSpeed kann einen inaktiven Prozess erneuern, während eine Editorseite geöffnet bleibt. Der private Teststart bindet den CSRF-Token deshalb kryptografisch an Testadresse und Testzugang. Normale Prozessneustarts verwerfen keine offenen Eingaben; ein Passwort-, Benutzer- oder Adresswechsel erneuert die Sitzung. Nach einer solchen Zugangsänderung die Test-App neu starten und Browserseiten neu anmelden. Private Entwurfstokens werden erst nach erfolgreicher Basic-Anmeldung weitergereicht. Die Shopify-Sitzungsprüfung und der normale lokale Start behalten ihre eigene unveränderte Anmeldung.

## 1. Einmalige Voraussetzungen in Plesk bestätigen

Eine Person mit funktionierendem Plesk-Browserzugriff richtet ausschließlich den neuen Testbereich ein. Plesk-API, SSH und VPN werden nicht benötigt. Die folgenden Namen sind **Vorschläge**, keine bereits eingerichteten Adressen/Pfade:

| Einstellung | Vorschlag |
| --- | --- |
| HTTPS-Testadresse | `https://test-2027.gravuru-designwerkstatt.de` |
| Application Root | `/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-2027-test` |
| Document Root | `/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-2027-test/public` |
| Private Daten | `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-data` |
| Eigenes Python | `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311` |

Der bisherige Ordner `/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-werkstatt` bleibt unberührt. Auch dessen `private/product-data`, Runtime-Auswahl, Python-Umgebung, App-Secret, Startdateien und Datenbanken nicht kopieren, verschieben oder als Testpfad verwenden.

Vor Beginn bestätigen:

- Eigene Subdomain mit DNS-Zuordnung, gültigem Zertifikat und Weiterleitung HTTP → HTTPS ausschließlich für diese Subdomain.
- Plesk-Erweiterung **Node.js**, Node **24 oder neuer**, npm-Skriptausführung über **Run script / Skript ausführen**. Es gibt keine npm-Laufzeitabhängigkeiten.
- Linux, Python **3.11 oder neuer**, `venv` und `pip`, Systembibliothek **libcairo**. Das alte Serverprotokoll belegt nicht die heutige Verfügbarkeit. Fehlende Systempakete muss die Hostingverwaltung bereitstellen; keine gemeinsam benutzten Pakete/Interpreter ändern.
- Ausgangs-HTTPS zu den Python-Paketquellen für die einmalige Installation mit unveränderter TLS-Prüfung; Schreibrechte des Test-App-Benutzers in den eigenen Testverzeichnissen.
- **Ein App-Prozess für diese Testinstanz.** Passenger Enterprise bietet `PassengerMaxInstances 1` je Virtual Host. Bei anderen Installationen muss die Hostingverwaltung einen unterstützten, auf diese Testinstanz beschränkten Einzelprozessbetrieb bestätigen. `PassengerMinInstances 1` ist keine Obergrenze. **Nicht** das globale `PassengerMaxInstancesPerApp` ändern: Das beträfe auch die laufende Werkstatt. Der Paketstart sperrt eine zweite Instanz derselben Datenablage; fehlende Einzelprozesskonfiguration nicht durch Entfernen der Sperre umgehen.

Ohne diese Möglichkeiten die Einrichtung an dieser Stelle an die Hostingverwaltung geben. Ein Dateimanager allein kann keine fehlende Node-/Python-/Prozesskonfiguration ersetzen.

## 2. Ausschließlich den neuen Testbereich vorbereiten

1. Unter **Websites & Domains** zuerst vorhandene Testbereiche prüfen. Einen vorhandenen Bereich nur verwenden, wenn seine Nutzung für diesen Test bestätigt ist, er keine fremde Anwendung überschreibt und seine App-/Datenpfade die Trennung erfüllen. Andernfalls eine eigene Test-Subdomain mit den obigen getrennten Verzeichnissen anlegen. Vorhandene Live-Domain nicht umstellen. HTTPS-Zertifikat zuordnen und HTTPS-Weiterleitung aktivieren.
2. Im **Dateimanager** das ZIP in den neuen Application Root hochladen und dort entpacken. Direkt dort müssen `app.cjs`, `package.json`, `PACKAGE-MANIFEST.json`, `app/`, `ops/` und `public/` liegen. Keine zusätzliche äußere ZIP-Verzeichnisebene verwenden.
3. ZIP nach Entpacken aus dem Server-Testordner entfernen oder außerhalb des Document Root privat ablegen. Der **Document Root muss `public/` sein**, niemals der Application Root. `public/` enthält nur `robots.txt`; Quellcode und Manifest gehören nicht in den Webroot.
4. Falls nötig den übergeordneten Ordner `private/` per Dateimanager anlegen. Die beiden letzten Verzeichnisse für Daten/Python noch leer lassen oder noch nicht anlegen. Keine vorhandenen Bestandsordner auswählen. Der Vorbereitungsbefehl kennzeichnet nur neue/leere Testordner und setzt dort Rechte **0700**; Dateien erhalten **0600**.
5. Unter **Node.js** für genau diese Subdomain einstellen: Node-Version **24+**, Modus **production**, Application Root wie oben, Document Root `public`, Startup File **`app.cjs`**. Je nach aktivem Webserver übernimmt Passenger oder LiteSpeed den Anwendungssocket; kein öffentlich freigegebener zusätzlicher Node-Port erforderlich. Den normalen Loopback-Start `app/configurator/variant-m/server.mjs` nicht als Plesk-Startdatei wählen.
6. In den **Apache & nginx-Einstellungen** ausschließlich dieser Test-Subdomain in den zusätzlichen **HTTPS-Apache-Direktiven** setzen:

   ```apache
   RequestHeader set X-Forwarded-Proto "https"
   ```

   Der Proxy muss den ursprünglichen Test-`Host` erhalten. Den Header serverseitig überschreiben, nicht vom Browser übernehmen; die HTTP-Seite muss vorher auf HTTPS umleiten. Den Header nicht für Live-Domain oder unverschlüsselten HTTP-VHost setzen. Fehlt das Feld oder das benötigte Apache-Modul, muss die Hostingverwaltung die gleichwertige Einstellung für diesen Test-VHost vornehmen. Der Node-Teststart verweigert Anfragen ohne diesen Nachweis.

7. Request-Limit für den Test-VHost mindestens **25 MiB** und Proxy-Zeitlimit mindestens **120 Sekunden**, soweit im Hosting nötig. Das ZIP wird lokal im Browser entpackt, einzelne SVG/PDF-Seiten werden als JSON hochgeladen. Kein globales Limit anderer Anwendungen verändern.

## 3. Werte sicher für Vorbereitung und Node-Anwendung setzen

**Auf dem vorhandenen Plesk bestätigt:** Weder die npm-Konsole noch **Skript ausführen** erben die benutzerdefinierten App-Variablen. Für dieses Hosting eine private Konfigurationsdatei verwenden: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-config.json`. Der übergeordnete Ordner muss bereits **0700**, die Datei **0600** haben und dem Test-App-Systembenutzer gehören. Kein Symlink, kein Git-Ordner, kein Webroot. Die Datei ausschließlich über den angemeldeten Plesk-Dateimanager verwalten; sie gehört nicht in das ZIP.

Dateiformat: JSON-Objekt mit `schema: 1`, `purpose: "private-test-runtime"` und einem Objekt `values`, das genau diese sechs Zeichenketten enthält:

| Name | Wert / Bedeutung |
| --- | --- |
| `GRAVURU_TEST_ORIGIN` | Tatsächliche neue HTTPS-Adresse, ohne Pfad oder abschließenden `/` |
| `GRAVURU_PRIVATE_DATA_DIR` | Absoluter neuer Datenpfad aus Schritt 1 |
| `GRAVURU_TEST_PYTHON_DIR` | Absoluter neuer Python-Verzeichnispfad aus Schritt 1 |
| `GRAVURU_BOOTSTRAP_PYTHON` | In npm **und Weblaufzeit** verfügbarer Python-3.11+-Interpreter; hier `/opt/alt/python311/bin/python3` |
| `GRAVURU_TEST_USERNAME` | Eigener Testbenutzer, z. B. `gravuru-test` |
| `GRAVURU_TEST_PASSWORD` | Neues starkes Testpasswort aus dem Passwortmanager, 24–200 druckbare ASCII-Zeichen |

Das Passwort ausschließlich im Passwortmanager und in dieser privaten Serverdatei verwalten. Nicht in Chat, Paket, Repository, Screenshot, npm-Befehl oder Befehlsargumente schreiben. Es ist unabhängig von Plesk-/Server-/Shopify-Zugangsdaten. Keine `GRAVURU_SHOPIFY_*`-Werte aus dem Live-System übernehmen.

Der Standardpfad ist `<übergeordneter App-Ordner>/private/<App-Ordnername>-config.json`. Vorbereitung, Prüfung und App lesen dieselbe Datei. Abweichender Pfad nur ausdrücklich über `GRAVURU_TEST_CONFIG_FILE`, weiterhin privat und außerhalb der Anwendung. Unzulässige Rechte, fremder Besitzer, Symlinks, unbekannte Felder und widersprüchliche gleichnamige App-Variablen sperren den Start. Auf diesem Server deshalb keine zweite Kopie der sechs Werte unter **Benutzerdefinierte Umgebungsvariablen** behalten. Andere Installationen ohne private Datei können weiterhin die vollständigen sicheren Laufzeitvariablen verwenden.

`GRAVURU_PYTHON` wird vom Teststart auf `<GRAVURU_TEST_PYTHON_DIR>/bin/python` gesetzt. Kein globales `PYTHONPATH`, keine gemeinsame Live-Python-Installation verändern. `GRAVURU_TEST_PORT` ist nur für lokale Prüfungen ohne Passenger vorgesehen und muss in Plesk nicht gesetzt werden.

## 4. Installation und Start per Plesk-Schaltfläche

Im Bereich **Node.js → Run script / Skript ausführen**, jeweils in dieser Testanwendung:

1. **`plesk:prepare`** ausführen. Es prüft Python 3.11+, initialisiert ausschließlich die eigenen leeren Testordner, erstellt dort eine eigene Python-Umgebung und installiert die in `ops/plesk/requirements.txt` referenzierten Pakete. Keine globale pip-Installation, keine Kopie alter Daten. Bei Erfolg: `prepared: true`, `serverStarted: false`.
2. **`plesk:check`** ausführen. Es prüft Konfiguration, private Verzeichnisse, SQLite, Python-Imports und eine kleine Cairo-Konvertierung. Es gibt nur Statusangaben aus, keine Passwörter. Erwartet: `configured: true`, `sqlite: true`, `dependencies: true`, `cairo: true`. `httpsVerified: false` ist hier korrekt: Ein lokaler Vorabcheck beweist noch keinen Browserzugriff.
3. **Restart App / Anwendung neu starten** ausschließlich für die Test-Subdomain. Startdatei bleibt `app.cjs`. Keinen Live-Worker beenden und keine Live-`restart.txt` anfassen.

Falls Plesk zum Aktivieren der npm-Skriptliste zunächst **NPM install** verlangt, ist das in diesem separaten Paket möglich: Die Node-Paketdatei hat keine Abhängigkeiten und keine Installations-Hooks. Python wird ausschließlich über `plesk:prepare` installiert.

`plesk:prepare` darf bei unterbrochener Installation dieselben gekennzeichneten Testordner weiterverwenden. Es darf **nicht** gegen einen Bestands-/Live-Ordner laufen. Fremde, nicht leere Verzeichnisse werden abgewiesen. Fehlerausgaben nennen die fehlende Voraussetzung; Zugangsdaten nicht in Fehlerberichte kopieren.

Die erstmalige Paketinstallation kann auf diesem Hosting länger als fünf Minuten dauern. Der private Installationsschritt hat deshalb ein begrenztes Zeitfenster von 15 Minuten; der normale Web-Request erhält dadurch kein höheres Limit. Bei abgebrochener Browserverbindung zuerst laufende Installer und den privaten Abschlussstatus prüfen, bevor dieselbe Vorbereitung erneut gestartet wird. Keine parallelen pip-Installationen in derselben Testumgebung ausführen. Eine begonnene Installation oder ein alter Status `running` ist kein Erfolgsnachweis; maßgeblich sind Exitcode 0, `prepared: true` und die anschließende Prüfung.

## 5. Neue Hosting-Abnahme im Browser

Diese Prüfung betrifft die **neue Bereitstellung**, nicht eine Wiederholung der abgeschlossenen Produktabnahmen:

1. Privates Browserfenster öffnen, `https://<Testadresse>/__test/health` aufrufen. Zertifikat muss gültig sein; ohne Anmeldung muss die Browser-Passwortabfrage erscheinen. Nach Anmeldung: `ready: true`, `scope: private-operator-test`, `shopifyConnected: false`.
2. `https://<Testadresse>/werkstatt/` öffnen. Der private Testzugang erlaubt sämtliche Bedienungen innerhalb dieser neuen Datenablage; Zugang nur an berechtigte Tester geben. Der unveränderte vorhandene Konfigurator und die Produktserien müssen laden. Bei dieser ersten Installation gibt es nur den mitgelieferten Master und keine alten Produkte/Bestellungen.
3. Mit einer **synthetischen** SVG-/Excel-Datei einen kleinen Import durchführen; Importbericht/Excel herunterladen. Damit sind auf dem Zielserver SQLite, Python-Subprozesse und Dateiausgaben tatsächlich geprüft. Ein gültiger Health-Status allein beweist diese Strecke nicht.
4. Nur diese Testanwendung neu starten. Testprodukt muss erhalten bleiben; anschließend keine neue/duplizierte Übernahme. Vor Produktions- oder Massentests die Zielserver-Abnahme dokumentieren.
5. Ohne Anmeldung darf kein `/api/workshop/products` erreichbar sein. `/.env`, `/PACKAGE-MANIFEST.json`, `/ops/plesk/config.mjs` und `/private/` dürfen auch angemeldet keine Dateien liefern. Die Datenablage liegt ohnehin außerhalb des Webroot.

Bei 403 zuerst exakten Host und das nur im HTTPS-VHost gesetzte Proxy-Protokoll prüfen; keine Schutzprüfung abschalten. Bei zweitem App-Prozess Einzelprozesskonfiguration klären. Bei Python-/Speicherfehlern private Pfade und Servervoraussetzungen prüfen. Der Startfehlerbericht nennt ausschließlich festgelegte Fehlercodes, bekannte Quelldateien mit Zeilennummern und bei `ENOENT` die Verfügbarkeit festgelegter Python-Pfade; keine Fehlermeldungen mit Eingabewerten. Die Konsole kann andere Interpreter sehen als die Weblaufzeit. Browser-Basic-Anmeldung kann bis zum Schließen des privaten Fensters gespeichert bleiben; dieses Fenster danach schließen.

## 6. Grenzen, spätere Shopify-Anmeldung und Rücknahme

- Die Plesk-/Passenger-Installation auf dem echten Server muss noch durch die Person mit Browserzugriff bestätigt werden. Lokale Paketprüfungen beweisen weder das heutige Hosting noch DNS, Zertifikat oder Ressourcenlimits.
- Keine echten Kundendaten, Live-Bestellungen oder Produktionsdatenbanken in den Test importieren. Die Musterdaten sind keine Maschinen-/ICC-Freigabe.
- Das Paket startet als privater Operator-Test. Es verwendet keinen Shopify-App-Schlüssel und richtet keinen echten Login, Webhook, Warenkorb oder Shop-Entwurfstransport ein. Für die spätere echte Shopify-Strecke sind vorhandene App-Identität/Secret, HTTPS-Testziel und die erlaubte App-URL gesondert abzugleichen. Die bestehende Live-App-URL wird hier nicht geändert und keine neue App angelegt.
- Für Rücknahme ausschließlich die neue Testanwendung deaktivieren. Private Testdaten separat behalten/sichern; nicht in die laufende Werkstatt zurückspielen. SQLite-Sicherungen nur bei gestoppter Testanwendung konsistent mit allen zusammengehörigen Dateien durchführen. Updates und Datenübernahme sind kein automatischer Teil dieses Erstinstallationspakets.

Technische Grundlage für Passenger-Einstellungen: [offizielle Apache-Konfigurationsreferenz](https://www.phusionpassenger.com/docs/references/config_reference/apache/#passengermaxinstances), geprüft am 07.10.2026. Die verfügbare Plesk-Oberfläche, Erweiterungen und konkreten Berechtigungen vor Ort bleiben zu bestätigen.

## 7. Separater lesender Shopify-Prüfbefehl

Der private Webstart bleibt unverändert ohne Shopify-Verbindung. Zusätzlich kann eine angemeldete Bedienperson in **der Test-Site 19** den eigenen Node-Prozess prüfen. Der Befehl verwendet die bestehende App „Gravuru Konfigurator“ und ausschließlich zwei feste lesende Admin-GraphQL-Abfragen. Er ändert keine App-Konfiguration, Produkte, Bindungen, Bestellungen oder Webhooks.

In „Node.js-Befehle ausführen“ (`npm` ist bereits vorangestellt):

```text
run shopify:preflight -- --secret-file /var/www/vhosts/gravuru-designwerkstatt.de/gravuru-werkstatt/private/shopify-app-secret
```

Der bereits vorhandene Schlüssel wird auf dem Server aus seiner geschützten Datei gelesen: reguläre Datei 0600, gleicher Eigentümer, keine Symlinks, außerhalb dieser App und jedes Git-Verzeichnisses. Weder Inhalt noch Token werden ausgegeben oder kopiert. Der Token bleibt nur im Arbeitsspeicher; bei längerer Nutzung erneuert der Adapter ihn vor Ablauf. Keine automatische Wiederholung fehlgeschlagener HTTP-Anfragen. HTTPS-Prüfung bleibt aktiv; Weiterleitungen werden abgelehnt. Dieser CLI-Zugriff ist getrennt von den sechs bisherigen privaten Webstart-Einstellungen; dort kein Shopify-Secret ergänzen.

Für eine **explizit vorgeschlagene**, noch nicht gespeicherte Variantenbindung unterstützt derselbe Befehl zusätzlich `--binding-request /absoluter/privater/pfad.json`. Die private Datei enthält genau `record` (vollständiger unveränderter Produktdatensatz mit Revision aus der Werkstatt), `shopifyProductId` (Shopify-Produkt-GID) und `mappings` (`key` aus der bestehenden Shopvorbereitung, numerische `variantId` als Text). Keine Preise/Optionen per Hand ergänzen: Sie werden aus dem gemeinsamen Produktmodell ermittelt. Der Befehl liest nur die angegebenen Varianten und vergleicht Produkt, physische Optionen, Preis und Euro-Währung. Er sucht keine Produkte nach ähnlichem Namen und speichert keine Zuordnung.

Exitcode 0 = Prüfung erfolgreich ausgeführt, bei Varianten alle angefragten Zeilen passend. `complete` zeigt zusätzlich, ob alle Ausführungen enthalten sind. Exitcode 2 = fachliche Abweichung; Exitcode 1 = unbestätigte Verbindung/Eingabe. **Auch bei `matches: true` bleiben `bindingSaved`, `checkoutReady` und `published` falsch.** Admin-Preisprüfung bestätigt weder Storefront-Verfügbarkeit noch Aufpreise, Zahlung, Kundenanmeldung oder Bestellannahme. Regulärer Plus-Shop ist kein bestätigter Testzahlungsweg. Vor jeder späteren Bindung erneut gegen den aktuellen gespeicherten Produktstand prüfen; diesen Bericht nicht als dauerhafte Freigabe verwenden.
