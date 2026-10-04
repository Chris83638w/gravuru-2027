# Gemeinsamer privater Entwicklungsdienst – vorbereitet, nicht installiert

Diese Infrastrukturvorbereitung schließt den Umzug noch nicht ab. Der Serverzugang
fehlt in Mikails Cloud-Aufgabe. Es wurde weder ein Dienst bereitgestellt noch eine
private Datenbank geöffnet, übertragen oder veröffentlicht. Chris' isolierter
Restore bleibt durch den bestehenden GitHub-Bericht belegt.

## Ziel und Dateien

Ein zentraler Entwicklungsdienst verwaltet die drei SQLite-Datenbanken gemeinsam
auf dauerhaftem lokalem Serverspeicher. Mikail und Chris greifen mit getrennten
Zugangsdaten auf denselben privaten HTTPS-Dienst zu. Die SQLite-WAL-Dateien werden
nicht zwischen Codex-VMs synchronisiert oder auf ein Netzlaufwerk gemountet.

- `start.mjs` verwendet die vorhandenen App-Module unverändert und bindet nur
  Loopback. Es verlangt einen expliziten Datenpfad außerhalb des Repositorys,
  alle drei vorhandenen SQLite-Dateien mit privaten Rechten und einen nichtleeren
  Produktbestand. Fehlende Daten werden nicht durch einen Entwicklungs-Master ersetzt.
- `gravuru-private-dev.service.example` ist eine noch anzupassende systemd-Vorlage.
  Ein eigener Benutzer, private Rechte, beschränkte Schreibpfade und `flock`
  begrenzen den Dienst auf die separate Entwicklungsablage.
- `nginx-private.conf.example` ist eine noch anzupassende TLS-Zugangsvorlage.
  Sie prüft den äußeren Host/Origin vor der Übersetzung auf den internen Host;
  CSRF bleibt eine zusätzliche Anwendungsprüfung. Zugangsdaten werden nicht an
  die App weitergereicht. Beide Nutzer benötigen eigene private Anmeldungen.
- `server-readiness.sh` liest ausschließlich technische Servermetadaten.
  Es enthält keine Verbindung oder Anmeldung und nimmt keine Änderungen vor.

Die Beispielpfade `/opt/gravuru-2027/current` und
`/var/lib/gravuru-2027-dev/state` sind Vorschläge, keine gefundenen Serverpfade.
Alle Großbuchstaben-Platzhalter der Nginx-Datei sind vor einer Prüfung zu ersetzen.
Die Vorlagen niemals in einen bestehenden Produktions-vHost einfügen. Ob das
vorhandene Hosting eigene Node-Dienste, systemd oder entsprechende Plesk-verwaltete
Alternativen erlaubt, ist erst durch die Serverinventur festzustellen.

## Konkrete fehlende Voraussetzung

Ein autorisierter Servershell-/Verwaltungszugang zum vorhandenen Hosting mit
geeigneter Cloud-Netzwerkbindung. Ein HTTPS-Backup-Passwort ist kein Nachweis
dieser Verwaltungsrechte. Der Cloud-Runtime-Connector hier kann ausschließlich
Status lesen; die Plugin-Suche hat keinen passenden verbundenen Plesk-Zugang
geliefert. Chris' Restore-Chat war aus diesem Konto nicht abrufbar. Kein Versuch,
dessen Zugriffsschranke zu umgehen oder Zugangswerte aus fremden Prozessen zu lesen.

Die beiden Kontokonfigurationen müssen nicht dieselbe ID haben. Aus den vom Nutzer
übermittelten Statusantworten gehören Chris' Setup- und Restore-Chats zu
`b9735c78-b7aa-4b3e-8171-9734dc4cc190~cecfg_6ac0b86d6e3c819fb5c1394ebf36bced`;
Mikails Arbeitschat gehört zu
`16de3a2f-12b3-4882-b5d7-afb410207d93~cecfg_6ac0eabed9e081a182773b56699e0905`.
Verschiedene IDs sind kein Fehlerbeweis und kein Grund, Umgebungen neu anzulegen.

## Durchführung nach hergestelltem Zugang

1. Mit `bash server-readiness.sh` im autorisierten Serverkontext zunächst nur
   Metadaten prüfen. Dauerhaftigkeit des Dateisystems, verfügbaren Dienstmanager,
   eigenes privates TLS-Ziel und unterstützte Zugangsbeschränkung feststellen.
2. Aus diesem Entwurf die konkreten Pfade und Dienstdefinitionen ableiten. Node 24,
   Python/PyMuPDF 1.28.2 und gebaute Vorschauartefakte müssen für den ausgewählten
   unveränderten App-Commit verfügbar sein. Secrets ausschließlich über die
   vorhandene sichere Zugangskonfiguration bereitstellen, niemals im Chat oder Git.
3. Eine NEUE private Entwicklungsablage erstellen. Die drei DBs gemeinsam gemäß
   `WIEDERHERSTELLUNG.md` bereitstellen, alle erwarteten Originalhashes vor der
   ersten Appöffnung vergleichen. Keine Bestandsdateien oder alten WALs übernehmen.
   Den unveränderten Restore-Ausgangsstand getrennt aufbewahren; der Appdienst
   erhält eine eigene Arbeitskopie.
4. Dienstkonto, Verzeichnis 0700 und DB-Dateien 0600 prüfen. Gemeinsame Sicherungen
   aller drei DBs nur bei gestopptem schreibendem Dienst oder durch einen eigens
   verifizierten koordinierten Sicherungsablauf erstellen. Unverschlüsselte
   Arbeitsbestände bleiben außerhalb von Git und veröffentlichten Cloud-Snapshots.
5. Private Zugangsschicht mit zwei eigenen Identitäten einrichten. Vor Aktivierung
   die konkrete Konfiguration prüfen (`nginx -t` bzw. Hosting-Äquivalent). Danach
   anonym 401, beide berechtigten Nutzer 200, Fremd-Host/-Origin und Schreiben ohne
   CSRF 403 verifizieren. Lokaler Appport bleibt von außen unerreichbar.
6. Fortbestand nach Dienstneustart und Zugriff aus beiden autorisierten Konten
   prüfen; unabhängig gespeicherte verschlüsselte Sicherung und Rücktest belegen.
   Temporäre VM-Dateien dürfen nicht als dauerhaft oder kontenübergreifend gelten.
7. Geschützte visuelle App-Abnahme mit restauriertem Bestand durchführen. Erst
   nach diesen Nachweisen Migration abschließen und Produktentwicklung fortsetzen.

## Prüfung dieser Vorbereitung

Nur die neuen Startschutz-Prüfungen mit synthetischen SQLite-Dateien werden hier
ausgeführt (`node --test infra/private-runtime/start.test.mjs`). Sie prüfen keine
echten Daten oder Serverinstallation. Die früheren 137 App-Tests und der Build
76/1 werden nicht als neue Ergebnisse ausgegeben oder ohne Anlass wiederholt.
Die Nginx-/systemd-Vorlagen sind ohne Serverkonfiguration nicht betriebsgeprüft.
