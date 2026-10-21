# Private Werkstattsicherung und getrennte Wiederherstellungsprüfung

Stand 21.10.2026. Der zunächst lokal entwickelte und synthetisch geprüfte Weg wurde anschließend durch die Hauptaufgabe tatsächlich auf Plesk ausgeführt: ausdrücklich freigegebene Wartungspause, unveränderter Snapshothelfer, drei konsistente DB-Sicherungen und bestandene getrennte Wiederherstellung. Die ursprüngliche Händleranwendung lädt wieder. Maßgebliche tatsächliche Belege und Grenzen stehen in `../live-securement-20261021.json`; die Anleitung unten beschreibt den reproduzierbaren Weg. Die Sicherungsdateien selbst bleiben privat.

## Nachgewiesener Sicherungsweg

Gezielt gelesen: `Chris83638w/gravuru-2027`, `dev/konfi-neu-20261019`, Ausgangscommit `bf5c059f13e0868d7c554616b7c35ff7a328ae62`. `ops/plesk/snapshot-merchant-data.py` wurde erneut direkt vom Branch gelesen: Git-Blob `01a61c75985067a98966190408b328ed17036361`, SHA-256 `3f0924c62bc6befc8f88c49eda7ca02691e0feb45584a1d6f1ea311622293840`. Die Hauptaufgabe hat am 21.10. denselben Helfer im aktiven Plesk-Release anhand des Hashs bestätigt; die übrigen Dev-Quellannahmen sind getrennt vom tatsächlich installierten älteren Release zu behandeln.

`snapshot-merchant-data.py:22–30` fordert dieselbe exklusive `.runtime.lock` wie `lock.mjs:7–11`, kopiert anschließend **alle drei DBs über SQLite Connection.backup**, prüft `quick_check` und schreibt SHA-256/Größe in `SNAPSHOT.json`. Der laufende Merchant-Prozess hält diese Sperre. Das Skript ist ausdrücklich ein Offline-Snapshot, kein parallel zur laufenden Werkstatt ausführbares Komplettbackup. Die Sperre ist kooperativ: fremde manuelle DB-Schreiber müssen ebenfalls ausgeschlossen sein. `runtimeLockHeld:true` im Beleg ist keine kryptographisch unabhängige Bestätigung eines Wartungsfensters.

Ein einzelnes SQLite-Online-Backup wäre konsistent für genau eine DB. Es ersetzt nicht den gemeinsamen stillstehenden Stand aus drei zusammengehörigen DBs. Keine laufende `.sqlite`-Datei per Dateimanager kopieren; WAL/SHM niemals löschen, um die Sperre oder den Sicherungsweg zu umgehen.

Bestätigte Angaben aus der Hauptaufgabe:

- Daten: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-merchant-data`.
- Aktiver Release: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-merchant-release-d18bc6c`.
- Vorhandenes Python 3.11: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311/bin/python`.
- Ausführung als `gravuru_werkstatt`, UID 10005; beobachteter Prozess gehört zur LVE/cgroup `lve10005`. Die PID ist eine Momentaufnahme, kein zukünftiges Stop-Ziel.
- Der genaue aktive Konfigurationspfad und sein Datenverweis werden vor dem Snapshot erneut bestätigt. Keine Konfigurationsinhalte oder Schlüssel in Befehlsausgaben kopieren.

## Umfang: drei DBs sind notwendig, allein aber kein vollständiger Anwendungsumzug

| Bestand | Enthalten / zusätzlich erforderlich |
| --- | --- |
| `workshop.sqlite` | Produktköpfe und unveränderliche Revisionen, Geometrie und Designzuordnungen in JSON, Entwürfe und Revisionen, private Kundenoriginale, Prüfstände/ZIPs, Warenkorb-/Bestell-/Ausgabejournale des jeweiligen installierten Schemas. Alle Tabellen werden vollständig gesichert; der Validator prüft nur ausdrücklich unterstützte Beziehungen. |
| `profiles.sqlite` | Schrift-/Motiv-/Farb-/Bestsellerprofile, historische Profil- und Zuordnungsstände, Fertigungsprofile und deren Revisionen. |
| `design-assets.sqlite` | Importierte byteidentische SVG/PDF-Originale (`design_sources`), geprüfte Vorschauen, Formkonturen mit Originalen/Geometrie, Materialoriginale, Beispiel-Fotooriginale, importierte Schriftoriginale. BLOBs werden im Validator stückweise gehasht. |
| Datenmarker | `.gravuru-shopify-merchant-test.json` wird vom Snapshot **nicht** kopiert. Der passende Marker muss separat privat gesichert werden; `merchant-config.mjs` prüft ihn vor einem Start. `.runtime.lock` sowie WAL/SHM sind keine wiederherzustellenden Ersatzdaten. |
| Release und gebündelte Ressourcen | Vollständiger aktiver Release mit Manifest, Startdatei/Startverweisen und enthaltenen Fonts/Motiven/Materialressourcen. Ein DB-Snapshot enthält keine außerhalb der DB liegenden Release-Dateien. Absolute Laufzeitverweise inventarisieren. |
| Konfiguration und Voraussetzungen | Bestätigte private Pfadkonfiguration, Eigentümer/Rechte, Runtime-Versionen und vorhandene Python-Bibliotheken dokumentieren. Kein blindes Neuinstallieren oder Einspielen neuer Migrationen beim Restore. |
| Geheimnisse | Nicht in GitHub, Release oder Prüfbericht. In bestehendem geschütztem Schlüssel-/Konfigurationsweg belassen; für einen anderen Rechner getrennten sicheren Wiederherstellungsweg festlegen. Ohne ihn ist die Anwendung nicht vollständig startbar. |
| Ältere Werkstatt / externe Materialoriginale | Die genannten drei DBs gehören zur Merchant-Laufzeit. Die früher genannten **171 Designs und sieben Plattenvorlagen** sind keine belegte Zählung dieses Schemas. Erst ihre tatsächliche Quellablage und Zuordnung bestätigen. Nicht automatisch `form_contours` mit allen historischen Plattenvorlagen gleichsetzen. Separate ältere SQLite-Ablagen erfordern ihren eigenen konsistenten Backupweg. Keine unbelegte Vollständigkeitsbehauptung. |

`merchant-config.mjs:57–68` erlaubt im Merchant-Datenordner nur diese drei DBs samt Journalen, Marker und Lock. Das spricht für DB-interne neuere Originalablage; es beweist keine vollständige Übernahme älterer Werkstattbestände. Beispielsweise liegen native Acryl-/Klingelpositionen im unverändert gesicherten Produktdokument; für Formprodukte wird zusätzlich die Konturquelle in `design-assets.sqlite` geprüft.

## Inventur vorab – logisch lesend, ohne Anwendungsstart

`inventory-private-sqlite.py` ist eigenständig, benötigt nur Python >=3.11 und keine Drittbibliotheken. Nur in einen bestätigten privaten Helferordner kopieren und als Eigentümer der Daten ausführen:

```sh
/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311/bin/python -I \
  /BESTAETIGTER-PRIVATER-HELFERORDNER/inventory-private-sqlite.py \
  --data-dir /var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-merchant-data
```

Ausgabe: nur drei Dateinamen/-größen, Schemahash/-version, Tabellen-/Revisions-/Originalzahlen, Anzahl FK-Fehler. Keine Produktnamen, Kundentexte, IDs, Tokens oder BLOB-Inhalte. Je DB eine eigene Lesetransaktion; **kein gemeinsamer atomarer Stand**. Zeitgrenze pro DB ca. 10 s, 1 s Sperrwartezeit. Bei unbekannten Schemata/SQLitefehlern keine Rohfehlermeldung. SQLite `mode=ro`/`query_only` verändert keine Tabellen, kann aber den bestehenden WAL-SHM-Index benutzen; keine Zusage unveränderter SHM-Bytes. Vorhandene WAL ohne SHM führt zur Verweigerung. `immutable=1` ist für laufende Datenbanken ungeeignet und wird hier nicht verwendet.

## Einmaliger Snapshot im abgestimmten Wartungsfenster

1. Exakten Dienst, Konfiguration, Datenpfad, Quellhash, freien privaten Speicher und Eigentümer bestätigen. Private Ziele außerhalb Webroot/Git festlegen. DBs plus separate Restorekopie brauchen mindestens zweimal die DB-Größe, zusätzliche Reserven für Archive/Releasequellen berücksichtigen. Keine festen Zusagen aus Host-Freiplatz allein ableiten.
2. Nur die bestätigte Merchant-App in Plesk geordnet stoppen. Neue Anfragen/automatischen Neustart während des Fensters verhindern. Auf Abschluss laufender Foto-/Prüf-/Ausgabevorgänge und Ende des Sperrhalters warten. Andere Sites/Shopify nicht stoppen. Nie `kill -9`, Lockdatei-Löschen oder blindes Stoppen einer alten PID verwenden.
3. Den vorhandenen geprüften Snapshothelfer **einmal** starten. Er muss die Sperre selbst erhalten. Bei Sperrfehler abbrechen und Ursache klären; keinen zweiten Kopierweg improvisieren. Nachstehende Platzhalter vor der Ausführung gegen die bestätigten privaten Pfade austauschen:

```sh
/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311/bin/python -I \
  /var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-merchant-release-d18bc6c/ops/plesk/snapshot-merchant-data.py \
  --config /BESTAETIGTER-AKTIVER-KONFIGURATIONSPFAD.json \
  --destination /BESTAETIGTER-PRIVATER-SICHERUNGSORDNER/snapshot-20261021-NEU
```

4. Erfolg nur bei Exit 0, neuem `SNAPSHOT.json` und drei bestätigten Prüfsummen. Ein abgebrochener Teilordner wird nicht weiterverwendet oder überschrieben; geschützt erhalten und kennzeichnen. Während desselben ruhenden Standes Marker und notwendige nicht geheime Pfad-/Releasebelege separat privat sichern. Keine Schlüsselwerte in den Konsolenbeleg aufnehmen.
5. Die gleiche bestehende Merchant-App mit unveränderter Startkonfiguration wieder starten, Anmeldung/Lesezugriff und Journale kontrollieren. Nach einem abgeschlossenen Snapshot kann die getrennte Restoreprüfung außerhalb der Ausfallzeit stattfinden. Ein fehlgeschlagener Snapshot wird nicht als Sicherung freigegeben.

## Getrennte Wiederherstellung: ausführbarer Prüfer

Den neuen Helfer `restore-private-snapshot.py` in den privaten Helferordner übertragen; mit einem **noch nicht vorhandenen** privaten Geschwisterordner des Snapshots aufrufen:

```sh
/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311/bin/python -I \
  /BESTAETIGTER-PRIVATER-HELFERORDNER/restore-private-snapshot.py \
  --snapshot /BESTAETIGTER-PRIVATER-SICHERUNGSORDNER/snapshot-20261021-NEU \
  --destination /BESTAETIGTER-PRIVATER-SICHERUNGSORDNER/restorecheck-20261021-NEU \
  --private-paths-confirmed
```

Der Schalter bestätigt, dass der Operator die privaten Pfade/Rechte und den fertigen Offline-Snapshot geprüft hat; er schaltet keine Netzverbindung oder Anwendung frei. Der Snapshotordner muss **genau** drei DBs und `SNAPSHOT.json` enthalten. Bei WAL/SHM, zusätzlichen Dateien, falscher Prüfsumme, Git-Verzeichnis, Symlinks/Hardlinks oder vorhandenem Ziel verweigert der Helfer. Er kopiert ausschließlich die fertigen Sicherungsdateien, öffnet nur die Kopien mit `mode=ro&immutable=1`, prüft `integrity_check` und Fremdschlüssel, vergleicht anschließend nochmals alle ursprünglichen und kopierten Dateihashes. Er startet keine Runtime, führt keine Migration aus und reaktiviert kein Design.

Zusätzliche, gezielte Inhaltsprüfungen: Produktkopf/aktivierte Revision/Masterbezug, historische Profil-/Fertigungsprofile, tenantgetreue Original-/Vorschau-/Material-/Fontbezüge, Formkonturquelle und gespeicherte Geometrie, Design-IDs, native Entwurfs-/Prüfstands-/Produktrevisionen, Originalfoto- und Prüfpaket-Hashes. Der Bericht zählt aktuelle und historische **Designzuordnungen**, nicht zwingend eindeutige Designs des Altsystems. Große Originale/ZIPs werden in 1-MB-Blöcken gehasht; keine gesammelte BLOB-Liste im Arbeitsspeicher.

Exit 0 heißt nur: die drei Sicherungs-DBs wurden bytegleich in getrennte Dateien zurückgespielt und die unterstützten Prüfungen waren erfolgreich. Exit 2 heißt: verweigert, technische Prüfung fehlgeschlagen oder inkonsistente Beziehung gefunden. Bei einer späteren Verweigerung bleibt der bereits neu angelegte private Testordner erhalten; keine automatische Löschung. Der Inhaltsbericht `RESTORE-CHECK.json` enthält nur Zählungen/Hashs/Fehlercodes, keine Zeilenwerte. Auch ein erfolgreicher Bericht bleibt zunächst privat.

`completeApplicationRestoreProven` bleibt **immer false**: tatsächlicher Linux-Lock, gesamter installierter Ressourcenbestand, Marker/Schlüssel, alle Legacy-/Warenkorb-/Bestellregeln, ZIP-Inhaltsdekodierung, native Geometrieneuberechnung in mm sowie mechanische Fertigungsfreigabe und isolierter Anwendungsstart sind nicht dadurch bewiesen. Die vollständigen DB-Bytes bewahren diese Daten; das ist keine unabhängige inhaltliche Fertigungsprüfung. Ein späterer Teststart muss komplett vom echten Shopify/Webhook-/Warenkorb-/KI-Transport getrennt werden und mit einem passenden Release erfolgen, niemals einfach die Live-Konfiguration übernehmen.

## Lokale Tests und verbleibende Zugänge

`python -I ops/restore-private-snapshot.test.py`: **15/15 synthetische Tests bestanden** mit Python 3.12.14 unter Windows. Tatsächlich benutzt wurde SQLite `Connection.backup`; der Linux-`flock` des unveränderten Originalhelfers konnte unter Windows nicht ausgeführt werden. Der erste Testlauf zeigte offen gebliebene SQLite-Verbindungen im Testaufbau; der Aufbau schließt jetzt jede Verbindung ausdrücklich. Ein zusätzlicher Quellabgleich korrigierte eine zu strenge Gleichsetzung: Die native Archiv-Prüfanforderung (`manifest.source.draftId`) ist vom privaten `adraft_`-Besitz samt Revision getrennt. Der neue Test bildet diese gültige Trennung ab; weiterhin geprüft werden Snapshot-, Produkt-/Revisions- und Designbindung. Danach und nach Umstellung der BLOB-Prüfung auf blockweises Lesen alle Tests erfolgreich.

Benötigt für den echten Nachweis: als Dateneigentümer ausführbarer privater Helferordner, bestätigte aktive Pfadkonfiguration ohne Schlüsselausgabe, abgestimmtes Stop-/Startfenster, freie private Snapshot-/Restoreziele, vollständige aktive Release-/Ressourcenquellen, Zuordnung der älteren 171 Designs/sieben Plattenvorlagen bzw. aktuelle tatsächliche Zahlen sowie ein sicherer privater Download-/Übertragungsweg. Ein Plesk-Backup-Verzeichnis oder Release-ZIP allein ersetzt weder SQLite-Snapshot noch Wiederherstellungsnachweis. Keine DB, Kundendatei, Zugangsdaten oder unbereinigten Belege auf GitHub hochladen.
