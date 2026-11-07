# Getrennte mobile Konfi-Demo

Das Paket enthält die vollständige bestehende Engine, die zwei bestehenden
Schiefermodelle (22 × 14 cm / 30 × 20 cm, jeweils 43 Hundedesigns) und die neue
Demo-Oberfläche. Es ist eine statische Bedienprobe. Es gibt keine Shopify-
Verbindung, Bestellanlage, Galerie-Rückspeicherung oder Server-Datenbank.

Bestätigte Preise bleiben 19,99 € und 24,99 €. Befestigungen, Zubehör, Bilder,
Designobjekte und Schriftkonturen kommen aus den vorhandenen Vollmodellen.
Der Builder prüft den Testumfang, erfindet keine Optionen und importiert nichts.

Der ausschließlich lesende Vergleich mit den veröffentlichten Prüfseiten vom
07.11.2026 ergab einen früheren Speicherversatz: Die Live-HTML-Seiten hatten schon
bei allen 43 Namen das vom Nutzer freigegebene Löschrecht; die lokalen Vollmodelle
enthielten noch `delete:false`. Außerdem war der Sammlungsfilter live deaktiviert.
Genau diese bestehenden Einstellungen übernimmt die Demo in ihre Kopie. Die
Live-HTML-Prüfsummen stehen in `PUBLISHED_REFERENCE` und im Paketmanifest; Design-
und Geometriedaten bleiben davon unberührt. Es wird nichts online zurückgeschrieben.

## Paket erstellen

In einem **eigenen Worktree**, hier auf Commit
`8ffeed8d90191cb89f1188a336751de2b2a4e0c0`, zuerst den vorhandenen Build ausführen:

```sh
node app/configurator/variant-m/build.mjs
node ops/mobile-demo/build.mjs \
  --output /absolute/new-demo-package \
  --namespace /konfi-demo/mobil-20261107-r1/ \
  --model-22x14 /absolute/dog-slate-review-20261105/scalable-22x14.json \
  --model-30x20 /absolute/dog-slate-review-20261105/scalable-30x20.json
```

Die Modelle werden nur gelesen. Geeignete gesicherte Quellen liegen außerdem
im Checkpoint `shared-resources-20261107T090130Z/dog-slate/`. Keine SQLite-Datei
öffnen, keinen Katalog neu importieren. `make-scalable-review-site.mjs` war der
historische Builder der öffentlichen Schiefer-Prüfseiten; seine Live-Pfade und
Aktivierungsskripte werden hier ausdrücklich nicht verwendet.

`--preview`, `--source` und `--commit` können explizit angegeben werden. Ein
vorhandener Ausgabeordner oder ein Ziel innerhalb des Quellbaums wird abgelehnt.
Ein fehlgeschlagener Build bleibt als unvollständige Kopie erhalten; ein neuer
Versuch bekommt einen neuen Zielordner. Nur ein Paket mit vollständig geschriebenem
`MANIFEST.json` gilt als abgeschlossen.

## Lokal testen

```sh
node --test ops/mobile-demo/build.test.mjs
node ops/mobile-demo/serve.mjs --directory /absolute/new-demo-package --port 8217
```

Adresse: `http://127.0.0.1:8217/konfi-demo/mobil-20261107-r1/22x14.html?fresh=1`.
`30x20.html` startet mit der größeren Tafel. Beide Modelle behalten die vorhandene
Größenauswahl. `index.html` öffnet den frischen 22×14-Start. Der Server bindet
standardmäßig nur Loopback; `--host` ist nur für eine ausdrücklich gewählte
getrennte Testumgebung vorgesehen.

## Hosting ohne Eingriff in den bisherigen Konfi

Das vollständig geprüfte Paket als **neuen Ordner** unter genau dem im Manifest
genannten Namespace bereitstellen. Nicht den bisherigen Produktvorschauordner,
`app.cjs`, Werkstattdaten, Shopify-App, Theme oder Host-Router ersetzen. Am
risikoärmsten ist eine eigene statische Demo-Instanz mit eigenem HTTPS-Link.
Bei einem vorhandenen Webhost muss die neue statische Route vor dessen App-Router
auflösbar sein. Ein lokaler Test bestätigt diese konkrete Hostkonfiguration nicht.

Der Paketserver kann unverändert hinter einem getrennten HTTPS-Reverse-Proxy
laufen. Er prüft beim Start sämtliche SHA-256-Werte und vor jeder Antwort erneut
die Datei; er liefert nur manifestierte Dateien in diesem Namespace aus und
weist POST/PUT/DELETE sowie alle anderen App-/Shop-Routen ab. Textdateien werden
bei akzeptiertem gzip vorkomprimiert ausgeliefert. Die Dateien selbst sind auch
mit einem normalen statischen Webserver nutzbar; dort JS/CSS/JSON-MIME-Typen und
Textkomprimierung prüfen und `X-Robots-Tag: noindex, nofollow, noarchive` setzen.

Im Browser werden nur GET/HEAD innerhalb der Demo sowie lokale Blob/Data-URLs
zugelassen; API-Schreibversuche und Beacons werden vor dem Netzwerk abgefangen.
Die Demo verwendet die vorhandene Gestaltungs- und Preisprüfung sowie deren
Prüfübersicht und Kontodialog. Der tatsächliche Shop-Checkout, entfernte APIs
und Schreibzugriffe auf ein Kundenkonto bleiben blockiert; es entsteht keine
echte Bestellung und kein gespeicherter Kontoentwurf.

## Isolation und unveränderte Gestaltung

- Eigene Produktbindungen und Profilrevisionen ausschließlich in der Paketkopie.
- Eigene Sessionpräfixe, Toolbarpräferenz und Foto-IndexedDB; kein Lesen oder
  Aufräumen der bisherigen Konfi-Fotos. Die ursprünglichen Quelldateien bleiben
  unverändert. `?fresh=1` startet weiterhin ohne automatische Wiederherstellung.
- Alle Renderer, Bündel, Styles, Katalogschriften und 703 Bibliotheksmotive sind
  lokal gepinnt. Zusätzlich enthalten die Produktschriften ihre vollständigen
  Originalkonturen einschließlich Fett- und Sonderzeichen, jeweils mit SHA-Datei.
- Grundplatten und Designbilder bleiben als exakte Data-URLs erhalten;
  die Zubehörbilder werden ohne Neukodierung in eigene SHA-Dateien ausgelagert.
  Designobjekte und beide skalierbaren Profile werden nicht neu gestaltet.
- `MANIFEST.json` enthält Eingabehashes, Quellcommit, Datei-Hashes sowie die gleichen
  Vorher-/Nachher-Hashes für Designs und Grundplatten. Es enthält keine Zugangsdaten.
- Die bisherige Engine wird nur in der erzeugten Kopie auf Demo-URLs und
  Speichernamen umgeschrieben; kein bestehendes Kernmodul wird verändert.

Die Veröffentlichung dieses Pakets ist eine eigene Aktion. Weder Builder noch
lokaler Server übertragen etwas auf einen Host. Für eine neue Demo-Version einen
neuen Ordner/Namespace verwenden; Rücknahme heißt, lediglich diesen neuen
Demo-Link nicht mehr anzubieten. Den bisherigen Konfi muss man dafür nicht ändern.

## Geprüftes R4-ZIP und additive Plesk-Veröffentlichung

Finaler Bedienprüfstand mit Querformat-CSS: `mobil-20261107-r4`.
Das ZIP enthält **exakt 2.002 Einträge**: die Dateien des Paketmanifests und
`MANIFEST.json`. Es ist **83.314.284 Bytes** groß. R3 bleibt als vorheriger lokaler
Prüfstand erhalten und ist nicht das finale Veröffentlichungspaket.

| Datei/Stand | SHA-256 |
| --- | --- |
| `gravuru-mobile-demo-r4.zip` | `713bac99dd7372eca7780f5634ac5410e47b2dfc5595670802f449c118afda94` |
| R4 `MANIFEST.json` | `f354482b23fb6635a1cec1621390649a6836cd2f7815e67def3f04ce0641ba06` |
| `archive.py` | `3dac4c30311a452c697348998fbd48e3c7a4af359324a647acffa181cb9972ec` |
| vorbereitetes `publish-plesk.cjs` | `92612adb8993c51f35a2d57b81a6703e7dbf25dd5cf00541ca934c694fc51d10` |

`archive.py` erstellt das ZIP reproduzierbar aus einem abgeschlossenen Paket:

```sh
python ops/mobile-demo/archive.py pack \
  --directory /absolute/mobile-demo-package-20261107-r4 \
  --output /absolute/new/gravuru-mobile-demo-r4.zip \
  --manifest-sha256 f354482b23fb6635a1cec1621390649a6836cd2f7815e67def3f04ce0641ba06
```

Für die vorbereitete Plesk-Strecke das ZIP in `private/` und beide Werkzeuge in
einen **neuen privaten Ordner** hochladen. Datei-Prüfsummen nach dem Upload mit
obiger Tabelle vergleichen. Keine Werkstatt-/Start-/Routerdatei austauschen.

Die folgenden Befehle sind eine Anleitung, kein Nachweis ihrer Ausführung.
Zuerst **nur prüfen** (ohne Veröffentlichungs-Schalter gibt es keine Schreibaktion):

```sh
node /var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-mobile-demo-r4-ops/publish-plesk.cjs \
  --zip /var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-mobile-demo-r4.zip \
  --zip-sha256 713bac99dd7372eca7780f5634ac5410e47b2dfc5595670802f449c118afda94 \
  --manifest-sha256 f354482b23fb6635a1cec1621390649a6836cd2f7815e67def3f04ce0641ba06 \
  --namespace /konfi-demo/mobil-20261107-r4/
```

Nur für die tatsächlich freigegebene Veröffentlichung denselben Aufruf separat
mit `--publish-new-demo` ausführen. `archive.py` muss neben der CJS-Datei liegen;
beim programmgesteuerten Aufruf kann `helper` ausdrücklich übergeben werden.
Der Host-Pythonpfad ist auf die vorhandene private Python-3.11-Umgebung gesetzt.

Vor dem ersten öffentlichen Schreibzugriff prüft das Rezept ZIP und Manifest,
alle ZIP-Einträge sowie die bekannten Prüfsummen von `start-r5.cjs` und beiden
vorhandenen Schiefer-HTML-Seiten. Es sichert `start-r5.cjs`, `app.cjs`, `22x14.html`
und `30x20.html` in einem neuen privaten Ordner und erstellt ein vollständiges
Hashinventar des bisherigen Public-Verzeichnisses. Bestehende Symlinks werden als
Links inventarisiert und nicht verfolgt. Die Sicherung ist 0700/0600 geschützt.

Das validierte ZIP wird ausschließlich in einen neuen privaten Zwischenordner
entpackt. Absolute Pfade, Traversierung, Duplikate, Symlinks, unerwartete Dateien,
verschlüsselte Einträge und abweichende Größen/Prüfsummen führen zum Abbruch.
Erst danach entsteht exklusiv:

```text
/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-2027-merchant/public/konfi-demo/mobil-20261107-r4/
```

Zusätzlich zur exakten Paketkopie erhält nur dieser neue Ordner eine `.htaccess`
für MIME-Typen, Komprimierung und No-Store/Noindex-Header. Diese zusätzliche Datei
wird separat im privaten Abschlussbericht gehasht. Bestehende Elternkonfiguration
bleibt unangetastet. Neue öffentliche Verzeichnisse/Dateien bekommen 0755/0644,
auch bei einer restriktiven Prozess-Umask. Alte Rechte werden nicht geändert.

Anschließend müssen alle alten Start-/HTML-Dateien und sämtliche vorherigen
Public-Dateihashes identisch sein. Der Nachweis steht unter
`private/mobil-20261107-r4-before-publication/{BEFORE,AFTER}.json`.
**Kein App-Neustart, keine Routeränderung, keine Datenbank und keine Shopify-API.**
Ein bereits vorhandenes Ziel oder eine bereits vorhandene Sicherung wird abgelehnt.
Bei einem Abbruch bleiben Sicherung und gegebenenfalls unvollständiger neuer
Demo-Ordner zur Prüfung erhalten; es gibt kein automatisches Löschen oder
Zurücküberschreiben von Bestandsdateien.

Die abschließende HTTPS-Prüfung erfolgt separat: neue Seite/JavaScript/Schriften
laden mit passenden MIME-Typen, Start und Größe funktionieren, Texte/Motive/Fotos
bleiben bearbeitbar, Bestandslinks liefern unverändert ihren alten Stand. Erst
dieser tatsächliche Hosttest belegt einen auf dem Handy erreichbaren Link.

Gezielte lokale Nachweise:

```sh
node --test ops/mobile-demo/build.test.mjs ops/mobile-demo/publication.test.mjs
```

Der Veröffentlichungs-Test arbeitet ausschließlich in frischen temporären
Verzeichnissen. Er prüft den Standard ohne Schreibaktion, vollständige Sicherung,
Bestandsparität, ZIP-Pfadschutz, beschädigte Prüfsummen und das Überschreibverbot.
