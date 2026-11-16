# Geschützte Schiefer-Galerie mit Bearbeiten und Kommentaren

Die optionale Galerie verwendet dieselbe private Operator-Laufzeit wie `README.md`:
HTTPS, eigene Zugangsdaten, exakter Host/Origin und ein nur lokal erreichbarer
innerer Server. Die Adresse lautet **`https://<eigene-testadresse>/originale/`**.
Der vorhandene Werkstatteditor bleibt unter `/werkstatt/` erreichbar. Beides ist
ein privater Prüfstand, keine Shopify-Veröffentlichung oder Produktionsfreigabe.

Eine neue separate Plesk-Testinstanz verwenden. Weder den App-Start noch die Daten
einer vorhandenen `gravuru-werkstatt`-/Shopify-Instanz umstellen. Ein historischer
Hostname aus anderen Übergaben ist kein Nachweis einer heute freien Instanz.

## 1. Laufzeitpaket und aktuelle Daten getrennt erstellen

Das Codepaket wird wie bisher aus einem **committeten** eigenen Branch gebaut:

```sh
python scripts/build-plesk-test-package.py --commit HEAD --output /private-output/slate-runtime.zip
```

Es enthält ausschließlich Code, einschließlich der exakt aufgeführten
Galerie-Module, UI-Dateien und Installationstools. Keine Datenbanken, Kommentare,
Zugangsdaten oder Arbeitsverzeichnisdateien werden automatisch aufgenommen.

Für die Daten eine **neue** Sicherung aus dem aktuellen bearbeiteten Stand erstellen:

```sh
python ops/plesk/slate-review-snapshot.py capture \
  --data /absolute/current-review-data \
  --gallery /absolute/current-original-package \
  --output /absolute/private-new-snapshot
python ops/plesk/slate-review-snapshot.py verify --snapshot /absolute/private-new-snapshot
python ops/plesk/slate-review-snapshot.py archive \
  --snapshot /absolute/private-new-snapshot \
  --output /absolute/private-snapshot.zip
```

Unter Windows den vorhandenen vollständigen Python-Programmpfad verwenden. Alle
Pfade bleiben außerhalb von Git. Der Snapshot ist privat und enthält Nutzereingaben.

Das Skript prüft die Originalpaket-Prüfsummen und sichert `workshop.sqlite`,
`design-assets.sqlite`, `profiles.sqlite` und `review-comments.sqlite` mit der
SQLite-Backup-Funktion. Dabei sperrt es die vier Datenbanken kurz gemeinsam gegen
neue Schreibvorgänge; belegte Datenbanken führen nach fünf Sekunden je Sperrversuch
zum Abbruch. Bereits bestätigte WAL-Änderungen werden übernommen, WAL-/SHM-Dateien
werden nicht roh kopiert. IDs, Revisionen, Kommentare und `local-review-import.json`
bleiben erhalten. Ein Katalog-Reimport würde Benutzeränderungen gefährden und ist
für diesen Weg nicht vorgesehen.

`ONLINE-SNAPSHOT.json` wird erst am Ende geschrieben und enthält Inventar und
SHA-256 jeder Datei. Die Archivdatei erhält eine eigene `.sha256`-Datei. Ein
abgebrochener Versuch wird nicht automatisch entfernt oder überschrieben; für
einen neuen Versuch einen neuen Ausgabeordner wählen.

## 2. Getrennte private Zielpfade konfigurieren

### Zusätzliche Katalogbereiche vorab in einer Kopie ergänzen

Türschilder oder Hausnummern werden als separates, geprüftes Originalpaket ergänzt.
Zuerst eine neue Snapshot-Kopie der bisherigen Daten erstellen und deren lokalen
Prüfserver für die Ergänzung anhalten. Dann:

```sh
node scripts/extend-slate-original-review.mjs \
  --base /absolute/base-original-package \
  --addon /absolute/new-slate-addon-package \
  --data /absolute/new-review-copy/data \
  --gallery-out /absolute/new-combined-gallery
```

Das Werkzeug prüft beide Quellpakete vollständig und verlangt neue Original-IDs,
Produktkeys und Paket-Produkt-IDs aus demselben gepinnten Katalogstand. Die
bisherigen Produkte werden nur auf Existenz geprüft; ihr aktueller bearbeiteter
Stand muss ausdrücklich nicht mehr der alten Katalogfassung entsprechen.
Kommentare und Profilablagen werden nicht geöffnet oder verändert. Gleiche
Ressourcenpfade dürfen nur bytegleich zusammenfallen. Ursprüngliche Wurzelberichte
bleiben bytegleich unter `source-packages/<Manifest-Hash>/` erhalten; Manifest und
Prüfsummen des kombinierten Pakets werden neu erzeugt.

Nur die neuen Schiefer-Produkte werden in einem atomischen Datenbankbatch angelegt.
Die neue Zuordnung enthält sämtliche bisherigen Mapping-Einträge unverändert und
wird zuletzt atomisch ersetzt. Bei einem Abbruch können ausschließlich neue
unveränderliche Assets/Importjournal-Einträge verbleiben; sie werden beim erneuten
Versuch mit einem **neuen Galerie-Ausgabepfad** geprüft und wiederverwendet.
Bereits veränderte unzugeordnete Importprodukte führen zum Abbruch. Ein bereits
vollständig ergänztes Mapping wird beim Wiederholen nicht zurückgesetzt.

Danach den Prüfserver mit der ergänzten Datenkopie und der **neuen kombinierten**
Galerie starten. Erst nach Prüfung daraus den endgültigen Online-Snapshot erzeugen.
`load-slate-original-review.mjs` darf für diesen Ergänzungsweg nicht über die
bisherigen bearbeiteten Produkte laufen.

### Plesk-Konfiguration

In der privaten Konfiguration aus `README.md` kommt genau eine optionale Angabe
hinzu: **`GRAVURU_SLATE_REVIEW_PACKAGE`**, ein absoluter privater Galerieordner.
Die sechs vorhandenen Angaben bleiben erforderlich. Daten, Galerie, Python und
Anwendung müssen voneinander getrennt sein; Daten/Galerie/Python liegen außerhalb
der Anwendung und außerhalb von Git. Der öffentliche Document Root bleibt `public`.

`GRAVURU_PRIVATE_DATA_DIR` und `GRAVURU_SLATE_REVIEW_PACKAGE` müssen für die
Installation **noch nicht existieren**. Zugangsdaten nur in Plesk oder der
geschützten Konfigurationsdatei hinterlegen; nie in den Snapshot schreiben.

Das private Datenarchiv außerhalb der Anwendung hochladen und auspacken. Vor dem
Import die äußere Archiv-Prüfsumme mit der lokal erhaltenen Prüfsumme vergleichen.

## 3. Snapshot installieren, dann Python vorbereiten

Im Wurzelverzeichnis der **neuen** Laufzeit, mit ihrer privaten Konfiguration:

```sh
node ops/plesk/install-slate-review.mjs --snapshot /absolute/uploaded-snapshot
npm run plesk:prepare
npm run plesk:check
```

Der Installer nutzt `GRAVURU_BOOTSTRAP_PYTHON`, prüft das vollständige Inventar,
alle Datei-Prüfsummen, SQLite und die Zuordnung der Designs. Erst danach erstellt
er neue Ordner und kopiert die Daten. Bestehende Zielordner werden immer abgelehnt.
Private Rechte sind 0700/0600. Instanzmarkierungen mit der exakten HTTPS-Origin
werden zuletzt geschrieben; unvollständige Installationen können nicht starten.

`plesk:prepare` darf **erst nach dem Snapshot-Installer** laufen, weil es sonst
bereits den leeren Datenordner anlegt. Es ergänzt die getrennte Python-Umgebung,
ohne die installierten Daten neu anzulegen. Anschließend wird nur die neue
Testinstanz auf `app.cjs` gestartet. Kein Main-Merge und keine Shopify-Publikation.

## 4. Online prüfen und eine Schreibstelle festlegen

Ohne Anmeldung müssen Galerie, Bilder, Kommentar-API und Editor 401 liefern.
Mit Anmeldung müssen Galerie, ausgewählte Vorschaubilder und Editor laden. Einen
eigens bezeichneten Testkommentar und eine Testverschiebung nur in einer
entbehrlichen Testkopie prüfen; nach erneutem Öffnen und nach Prozessneustart muss
der Stand erhalten bleiben. Fremde Origins und falsche CSRF-Werte müssen scheitern.

Die CSRF-Werte bleiben über Prozesswechsel stabil, sind aber an Instanz, Benutzer
und Passwort gebunden. Das private Gateway reicht den Galerie-CSRF-Header erst
nach Anmeldung und exakter Host-/Origin-Prüfung weiter. Die inneren Loopback-
Prüfungen bleiben aktiv. Ein Kommentar ist keine Designfreigabe.

Ab dem Wechsel zur Online-Galerie dort weiterarbeiten. Die bisherige lokale Kopie
nicht parallel bearbeiten: Die Ablagen synchronisieren sich nicht automatisch.
Vor späteren Aktualisierungen einen frischen Snapshot der inzwischen maßgeblichen
Online-Daten erstellen. Niemals einen alten lokalen Snapshot über einen neueren
Online-Stand legen. Alte Instanz und Sicherung für Rückkehr aufbewahren.

## Überprüfbarer Stand

Automatisierte Tests decken Authentifizierung, Host/Origin, beide CSRF-Header,
Galerie-Kommentare, optionale Daten-Whitelist, WAL-Inhalte, Revisionen, unveränderte
IDs, Prüfsummen, private Archive und das Verbot des Überschreibens ab.
Die tatsächliche Plesk-Adresse, Anmeldung, Python/Cairo und der Browser-Ablauf auf
dem Host müssen nach der konkreten Installation geprüft werden; lokale Tests sind
kein Nachweis einer erfolgten Online-Bereitstellung.
