# Getrennte Betriebsprüfung des Konfigurator-Anschlusses

Stand: 21.10.2026. Diese Dateien gehören ausschließlich zum neuen lokalen Integrationspilot. Sie starten, ändern oder veröffentlichen weder den Bestandskonfigurator noch Plesk/Shopify. Keine neue Produktionsdatenbank und kein zweiter öffentlicher Server.

## Zwei getrennte Prüfungen

1. **`preflight-readonly.mjs`** prüft den Rechner, auf dem es bewusst ausgeführt wird. Ohne Optionen zeigt es nur allgemeine Hostdaten und die Node-Version des Prüfers. Mit explizitem Releaseordner liest es das `PACKAGE-MANIFEST.json` und verifiziert die darin benannten regulären Quellen gegen SHA-256. Es liest keine `.env`, private Konfiguration, Prozessargumente, Umgebungsvariablen oder Logs. Mit Datenordner werden nur Metadaten der drei bekannten Datenbanken, WAL/SHM und Lockdatei gelesen: keine Datenbankverbindung, kein Backup, kein Lockversuch, keine Migration. Unter Linux kann `--pid` die tatsächlichen Prozess-/cgroup-Limits einer zuvor bestätigten App-PID lesen. Ausgabe ausschließlich nach stdout; keine Dateien werden durch das Skript angelegt.
2. **`loopback-load.mjs`** übt ausschließlich GET-Transport eines synthetischen lokalen Modells. Es akzeptiert nur `http://127.0.0.1:<Port>` bzw. `http://[::1]:<Port>` ab Port 1024. Keine DNS-Namen, alternativen IP-Schreibweisen, URL-Parameter, externen Ziele, Weiterleitungen oder Proxy-Umgebungsvariablen. Es ruft nur `/pilot/health` und `/pilot/model` ab. Ohne den ausdrücklichen synthetischen Health-Vertrag beginnt keine Last. Keine POST-Anfragen, Entwürfe, Fotos, Datenbankschreibvorgänge, Warenkörbe oder Shopify-Aufrufe.

Die Hostprüfung ist keine Zugriffsmethode: Das Skript verbindet sich nicht selbst mit dem Server. Es importiert ausdrücklich keine Anwendungs-/Runtime-Module, weil deren Initialisierung Datenbanken öffnen oder verändern kann.

## Befehle

Im neuen Pilotordner:

```text
node --test ops/ops.test.mjs
node ops/preflight-readonly.mjs
node ops/loopback-load.mjs --url http://127.0.0.1:8970 --concurrency 1,2,4 --duration-ms 3000 --rps 10
```

Den Port des tatsächlich separat gestarteten Piloten verwenden. Die Beispiele starten selbst keinen Server. Die bestehenden Ports 8963/8966 dürfen nicht als Lasttestziel verwendet werden; ohne Pilot-Health-Vertrag verweigert das Werkzeug den Test ohnehin.

Nur nach bestätigtem Pfad und App-PID auf dem vorgesehenen Host:

```text
node preflight-readonly.mjs --release-root <bestätigter-Releaseordner> --data-dir <bestätigter-privater-Datenordner> --pid <bestätigte-Node-PID>
```

Die Platzhalter sind keine fertigen Serverbefehle. Keine PID aus einer veralteten Datei übernehmen. Kein Starten der Runtime, um ihre PID zu erhalten. Die Ausgabe mit Datenbankgrößen und Systemdaten bleibt zunächst privat. Ein passendes Manifest bestätigt Quellen, nicht den geladenen Prozessstand. Host-RAM/CPU sind keine App-Zuteilung.

Erwarteter Pilot-Handshake (GET `/pilot/health`):

```json
{"schema":"gravuru-integration-pilot/v1","mode":"synthetic-only","externalNetwork":false,"privateData":false}
```

Der lokale Pilot selbst muss Außenverbindungen ausschließen. Die Lasttest-Clientgrenze schützt den Netzwerktransport des Testwerkzeugs; sie ist kein unabhängiger Beweis über alle internen Funktionen eines beliebigen fremden Servers, der denselben Handshake behauptet.

## Am 21.10.2026 beobachtete Live-Grenzen

Die Hauptaufgabe hat lesend in Plesk/CloudLinux gesehen, nicht dieses Werkzeug:

- Physischer Host: AMD EPYC 9174F, 16 Kerne, 96 GB RAM; nutzbar 93,86 GB, verfügbar 63,48 GB; Load 1,63/1,71/1,95. Freier Platz unter `/var/www/vhosts`: 412,37 GB. Momentaufnahme, keine Reservierung für Gravuru.
- Konto **`gravuru_werkstatt`**, UID 10005, Domain `gravuru-designwerkstatt.de`: **SPEED 100 %, PMEM 1G, IO 1 MB/s, IOPS 1024, EP 20, NPROC 100**, Paket AdminSimple, CageFS aktiv.
- `gravuru.de` ist ein anderes Konto mit anderen Grenzen. Dessen 1600 %/unbegrenzte Werte gelten nicht automatisch für die Werkstatt.
- Die tatsächliche Zuordnung des laufenden Merchant-Prozesses zur cgroup/LVE dieses Kontos ist noch nicht bestätigt. Keine Schlussfolgerung über wirksame Prozesslimits allein aus Host-RAM oder der Domainansicht.

Diese Kontogrenzen sind ein möglicher Engpass für Foto-/Paketverarbeitung. EP/NPROC sind keine zugesicherte Zahl gleichzeitiger Konfigurator-Kunden. Aus diesen Werten wird keine Verkaufs-/Kampagnenkapazität versprochen.

## Geprüfter Quellstand und Betriebsmodell

Repository `Chris83638w/gravuru-2027`, Branch `dev/konfi-neu-20261019`, Commit **`bf5c059f13e0868d7c554616b7c35ff7a328ae62`**. Quellen wurden gezielt gelesen; keine privaten Konfigurationen geladen. Die folgenden Aussagen beschreiben diesen Quellstand, nicht automatisch die laufende Installation.

| Punkt | Quelle und Befund |
| --- | --- |
| Start | `ops/plesk/merchant-app.cjs:2–9`: Passenger/LiteSpeed-Start; ohne Passenger explizit Loopback. Kein Mehrprozess-Cluster wird hier eingerichtet. |
| Prozessmodell | `ops/plesk/merchant-runtime.mjs:16–26`: exklusive Datensperre, innerer HTTP-Server auf zufälligem Loopback-Port, äußerer Server im selben Node-Prozess. Innerer Port ist keine zweite unabhängige Instanz. |
| Schreibschutz bei mehreren Instanzen | `ops/plesk/lock.mjs:7–11`: Python `flock(LOCK_EX|LOCK_NB)` auf `.runtime.lock`; zweite Instanz für denselben Datenbereich wird abgewiesen. Diese Sperre nicht für Lasttests entfernen. |
| Zeitlimit | `ops/plesk/merchant-runtime.mjs:64`: Proxy-Upstream mit 120.000 ms Timeout. Längeres Timeout ist keine Kapazitätslösung. |
| Sicherung im Request | `app/workshop/http.mjs:525–539`: max. zwei native Reviews pro Prozess, JSON bis 100 MB; Paket wird vor HTTP-Antwort vorbereitet und gesichert. |
| Foto-/Review-Grenzen | `http.mjs:145`: prozesslokale `Set`s; `:625`/`:634`: weitere Review-/Fotoanfragen erhalten 409. Keine dauerhafte verteilte Warteschlange. |
| Payload/Kopie | `workshop-review.mjs:49` überträgt Original und Bearbeitung als Base64; `acrylic-review.mjs:53–56,83` prüft Bilder und baut ZIPs. Bytes im Speicher können über der Dateigröße liegen; tatsächliche Spitze messen. |
| Release-Provenienz | `scripts/build-plesk-test-package.py`: `PACKAGE-MANIFEST.json` mit Quellcommit, Dateigrößen und SHA-256; Node >=24. |

## Bestehender SQLite-Sicherungsweg

`ops/plesk/snapshot-merchant-data.py` ist eine **koordinierte Offline-Sicherung**: dieselbe exklusive `.runtime.lock`, kanonische private Pfade außerhalb Git, neuer privater Zielordner, `sqlite3.Connection.backup()` für `workshop.sqlite`, `profiles.sqlite`, `design-assets.sqlite`, anschließend `PRAGMA quick_check` und SHA-256 je Sicherung.

Der laufende Dienst hält die Sperre; das Sicherungsskript darf nicht parallel erfolgreich behauptet werden. Für eine konsistente Sicherung der drei zusammengehörigen Datenbanken ist ein abgestimmtes Stillstandsfenster bzw. ein gesondert geprüfter gemeinsamer Sicherungsweg erforderlich. SQLite-Online-Backup einer einzelnen DB ist nicht automatisch ein atomarer Stand aller drei DBs. Der vorhandene Snapshot umfasst diese drei Datenbanken, nicht automatisch sämtliche später ergänzten Dateispeicher. Zugehörige externe Dateien müssen separat inventarisiert werden.

Dieser Preflight führt den Sicherungsweg **nicht aus** und kopiert keine laufenden Datenbankdateien. Ein Wiederherstellungstest braucht einen getrennten privaten Testordner und darf niemals gegen die Originaldaten arbeiten.

## Messstufen für eine spätere Kampagnenprüfung

| Stufe | Messung | Voraussetzung / Aussage |
| --- | --- | --- |
| A, jetzt | GET-Modelltransport mit 1/2/4 gleichzeitigen lokalen Anfragen, insgesamt max. 10 neue Anfragen/s; p50/p95/p99, Status, Bytes, Fehler | Nur das lokale Testgerüst. Keine Aussage über den Plesk-Host, SQLite, Foto-Uploads oder Verkäufe. |
| B | Echte Adapter-Validierung und Preisberechnung, Produkt-/Staffelwechsel | Synthetische feste Produktrevision, keine Shopify-Anfrage. Erst nach vorhandenem Adapter sinnvoll. |
| C | Original + bearbeitetes Foto verschiedener Größen; Speichern und Wiederladen | Getrennte Testdatenbank, identische Bibliotheken/Node/Python wie Zielrelease. CPU/RSS, IO, Wartedauer und 409 messen. Keine privaten Kundenfotos. |
| D | Wiederholte Bestellübergabe, Abbruch, Neustart und Wiederaufnahme | Shopify-Transport vollständig lokal ersetzt. Nachweisen, dass keine doppelten Aufträge entstehen; kein Lasttest gegen Shopify. |
| E | Produktionsdatei-Jobs | Getrennte lokale Testwarteschlange und synthetische Pakete. Nicht im Request des Kunden künstlich auf Fertigungs-PDF warten. |
| F, separat | Kampagnenspitzen und Wiederanlauf auf passender Staging-Infrastruktur | Erst nach Lastmodell, wirksamen Limits und isoliertem Testdienst. Kein Lasttest auf Live-Plesk aus diesem Paket. |

Der Transporttest ist geschlossen/ratenbegrenzt. Er zeigt nicht automatisch das Verhalten bei offenen Marketing-Ankünften. Er stoppt beim ersten Nicht-200/Timeout/Netzfehler und erhöht danach die Last nicht weiter. Höchstens 16 parallele Anfragen, 50 neue Anfragen/s, vier Stufen à höchstens 15 s, 2 MB je Antwort, keine automatische Wiederholung. Sinnvolle Zielwerte für Kundenerlebnis, Ausfallzeit und Wiederherstellung sind noch festzulegen; keine unbelegte Kundenzahl ableiten.

Für echte Redundanz später: statische UI/CDN, versionierte freigegebene Produktmodelle, private Uploadablage, dauerhafte Job-Warteschlange, passende gemeinsame/hochverfügbare Datenbank und mindestens zwei geeignete Appinstanzen. SQLite auf einem Netzlaufwerk plus entfernte Sperre ist kein Failover-Konzept. Zunächst kann der bestehende Plesk-Dienst mit geklärten Kontolimits und getrennten Workeraufgaben weiterverwendet werden.
