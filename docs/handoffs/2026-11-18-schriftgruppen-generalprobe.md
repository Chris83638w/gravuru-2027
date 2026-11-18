# Schriftgruppen: private Online-Kopie vor der Generalprobe

Stand 18.11.2026, Astra mit Claude. Eigenes Folgepaket ab PR258/b3f9725; dessen Implementierung b0baaee ist von Claude mit 106/106 Linux-Tests abgenommen. Chris beauftragt den Anschluss der Bestandsprodukte mit Claude und untersagt Liveänderungen ohne sein „live“. Dieses Paket bereitet ausschließlich eine private Kopie vor. Keine neue Kunden-, Schrift-, Preis- oder Kapazitätsregel.

## Werkzeug und Nachweise

`ops/plesk/snapshot-native-online.py` öffnet die drei bestehenden WAL-Datenbanken ausschließlich `mode=ro`. Separate, durchgehend offene Kontrollverbindungen vergleichen jeweils ihren eigenen `data_version`-Wert vor und nach dem gemeinsamen Pin-Fenster. Änderungen in diesem Fenster führen zum Abbruch vor Zielerstellung. Spätere Quellschreibvorgänge sind erlaubt: die Backup-API liest die gehaltenen Transaktionen. Keine automatische Wiederholung und kein Live-Lock. Die Lesetransaktionen werden auch bei Abbruch geschlossen und vor Integritätsprüfung und Ressourcenkopien freigegeben.

Quellen: [SQLite data_version](https://www.sqlite.org/pragma.html#pragma_data_version), [Online Backup API](https://www.sqlite.org/backup.html). Die gemeinsame Prüflogik ist unsere getestete Ableitung, keine von SQLite zugesicherte atomare Mehrdatenbank-Transaktion. Sachliche Zwischenzustände einer über mehrere Datenbanken verteilten Anwendungstransaktion kann ein Online-Snapshot nicht ausschließen; fachliche Bestandsprüfung bleibt Teil der Generalprobe.

Pro Datenbank: `integrity_check`, `foreign_key_check`, Tabellenzähler gegen dieselbe gepinnte Quelle. Ressourcen vor/nach dem Lauf vollständig inventarisiert und gehasht, tatsächlicher Einstieg und Konfigurationshash zusätzlich gegen die bereits geprüften Werte gepinnt. `SNAPSHOT.json` wird erst nach Erfolg exklusiv geschrieben; sein externer SHA ist Voraussetzung der Wiederherstellung. Alle Dateien der wiederhergestellten Kopie werden nochmals gegen exakt diesen Beleg geprüft. `immutable=1` nur auf geschlossenen eigenständigen Kopien.

10 gezielte Tests: lokal 9 bestanden, 1 Windows-Symlink-Fall übersprungen; Linux-Prüfung durch Claude noch offen. Reale WAL-Dateien, konkurrierender Commit beim Pinnen, spätere Schreibvorgänge ohne Wartezeit, geänderte Ressourcen/Konfiguration, beschädigter Beleg, FK-Fehler, bestehendes/öffentliches/überlappendes Ziel, Zeit-/WAL-/Platten-/Speicherabbruch samt Freigabe der Leser. [Gleiches synthetisches Profil vor/nach Kopie und Wiederherstellung](../measurements/2026-11-18-font-online-snapshot-synthetic.json): Quelle 1→2, Kopie und Wiederherstellung jeweils 1; drei Datenbank-SHAs unverändert. Ein Windows-Lauf: Kopie 0,140 s, Wiederherstellung 0,031 s. Simulierte Ressourcenwerte, kein Server-, Handy- oder Kundenzeitbeleg.

## Tatsächlicher Umfang und Grenzen

[Rein lesende Serverbelege](../measurements/2026-11-18-font-online-snapshot-source.json), 07:47–08:28 UTC:

- Drei aktive Datenbanken zusammen rund 5,04 GB; WAL 37.953.472 Bytes. SQLite 3.54.1, alle drei WAL.
- Katalog ohne `.git`: 81.750 Dateien / 4.692.671.427 Bytes / keine Links. Nutzlast insgesamt rund 9,73 GB plus kleine Start-/Statusdateien.
- Freie Platte 353.877.360.640 Bytes. Host verfügbar 68.406.120.448 Bytes; eigene cgroup 12 GiB Limit, rund 1,10 GiB Nutzung, rund 10,90 GiB Reserve.
- Alle vier Pfadliterale im echten `app.cjs` vorhanden und exakt passend. Einstieg unverändert, Hash im Beleg.

Enthalten sind drei DBs, Katalogressourcen, zwei tatsächliche Startdateien und Importstatus (unter `support`, zunächst nicht als aktive Runtime-Datei). Shopify-Konfiguration nur SHA, keine Zugangsdaten kopiert. Nicht enthalten: `.git`, zwei alte Sicherungsverzeichnisse mit rund 16,5 GB, abgeleitete Katalog-/Motivcaches, bestehender Runtime-Lock, ausführbare Release-/Legacy-Daten. **Dies ist eine geprüfte Daten-/Ressourcenkopie, noch keine startfähige vollständige Appkopie.** Für späteren Hoststart müssen auch Legacy-Daten isoliert sein; niemals gegen Live-Legacy-Daten starten.

Explizite Laufgrenzen zur Abstimmung mit Claude, keine P3-Lastgrenzen: 1.800 s, gesamte WAL höchstens 1 GiB, Host und begrenzte cgroup jeweils mindestens 6 GiB frei, Python-Adressraum maximal 512 MiB, Platte weiterhin mindestens 28 GiB frei. Die Plattenreserve entspricht drei gemessenen Nutzlasten aufgerundet; vorhandene Reserve ist deutlich größer. 512 MiB ist ein konservatives Prozessbudget, noch kein gemessener Bedarf bei 81.750 Dateien. Überschreiten bricht ab, statt Werte automatisch zu erhöhen. RLIMIT_AS gilt für Python, nicht als Behauptung zu Node-RSS. Reale Spitzen-RSS/Laufzeit/WAL werden erst beim Serverlauf belegt.

Claude bestätigt diese sechs Laufgrenzen im direkten Chat am 18.11.2026. Ebenso bestätigt er Poppins ausschließlich im isolierten Probekatalog: exakter PR192-Commit `58d1ec358cbae206a9fa0a133d5cc36fced94293`, Schriftdatei 160.316 Bytes plus Lizenz, vollständiger SHA im späteren Probebeleg. Live-Katalog/PR-Merge bleiben unangetastet. Werkzeug-/Kommandoreview steht noch aus.

## Konkreter isolierter Ablauf zur Prüfung

1. Claude prüft Werkzeug und [Capture-Konfiguration](2026-11-18-font-online-snapshot-capture.json) unter Linux. Vor Ausführung frische Ressourcen-/Einstiegsmessung; bei Abweichung stoppen, keine automatische Anpassung. Alle acht bekannten Webverzeichnisse sind ausgeschlossen.
2. Neues privates Werkzeugverzeichnis `/var/www/vhosts/gravuru-designwerkstatt.de/private/font-online-tool-20261118-01`, 0700; Python-Datei und Konfiguration exklusiv 0600, Bytes/SHA gegen Reviewstand kontrollieren. Existierende Ziele werden nicht überschrieben. Noch nicht auf dem Server erstellt.
3. Ein Aufruf, mit eigener privater Protokolldatei und Exitstatus; keine Appunterbrechung:

```text
/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311/bin/python /var/www/vhosts/gravuru-designwerkstatt.de/private/font-online-tool-20261118-01/snapshot-native-online.py capture --config /var/www/vhosts/gravuru-designwerkstatt.de/private/font-online-tool-20261118-01/capture.json
```

4. Ergebnis/Exitstatus abwarten, nur Zähler/Pfade/Hashes weitergeben. Bei Abbruch bleibt eine private Teilkopie ohne Erfolgsbeleg; keine Wiederholung, kein Überschreiben, keine automatische Löschung. Der Fehler ist zu klären und Chris zu melden.
5. Erfolgs-SHA ausdrücklich in die [Restore-Konfiguration](2026-11-18-font-online-snapshot-restore.json) übernehmen, separat exklusiv 0600 speichern. Ihr Platzhalter ist keine ausführbare Freigabe. Wiederherstellung ausschließlich in neues privates Geschwisterziel:

```text
/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311/bin/python /var/www/vhosts/gravuru-designwerkstatt.de/private/font-online-tool-20261118-01/snapshot-native-online.py restore --config /var/www/vhosts/gravuru-designwerkstatt.de/private/font-online-tool-20261118-01/restore.json
```

6. Belegvergleich und reale Laufzeit/RSS berichten. Kopien mit Kundendaten bleiben ausschließlich privat auf dem Server; keine Datenbank oder Kundenzeile in Git/Chat/Download. Löschung erst nach Rückmeldung an Chris.

## Danach noch offen

Native Generalprobe mit eigenem Lock/Planordner: echte gegenseitige Sperrwirkung auf diesem Dateisystem, Normal-/Wartungskonfiguration vergleichen, Bestandsherkunft, Plan/Ausführung/Wiederanlauf/Rückweg, Speicher und vollständigen Start-/Stoppablauf messen. Ausführbare Kandidatkopie und isolierte Legacy-Daten vorher konkret vorbereiten. Katalog-PR192/Poppins weiterhin ungemergt: isolierte Anwendung des geprüften Kandidaten nur als Probestand mit Claude abstimmen. Kein Merge dadurch ersetzt.

Ein auf der Kopie nach neuer Profilsynchronisierung erzeugter Plan ist wegen Zeitstempeln/Profilkennungen nicht automatisch auf live übertragbar; derzeit zwei getrennte Wartungsfenster vorgesehen. Auch der spätere komplette Weg bis in den Warenkorb bleibt separat zu messen. Keine feste 5-Sekunden-Regel, Zielbild Variante C bei unverändertem Prio-Konfi. Nichts live ohne Chris' „live“.
