# Privates Übergabepaket aus bereits geprüften Sicherungen

Der unabhängig geprüfte Helfer `pack-private-handover.py` wurde am 21.10.2026 durch die Hauptaufgabe auf Plesk ausgeführt. Snapshot, Restore v2 und Paketprüfung sind erfolgreich abgeschlossen; die ursprüngliche App ist wieder online. Es war kein weiteres Stoppen und keine neue DB-Sicherung nötig.

Ergebnis: **547.051.372 Bytes**, zwölf Mitglieder, SHA-256 `715bca5a25b0b51e21e078818554576e72c08b886a8dc6a7c6d81fd3726bd555`. Jede Datei im Paket wurde per SHA-256 und ZIP-CRC erneut geprüft; Gesamtpaket und Beleg haben Rechte 0600. Die unten genannten Ausgabepfade existieren bereits und dürfen nicht erneut als neue Ausgabe verwendet werden. Der private Browserdownload hat noch keine bestätigte lokale Datei geliefert; eine zweite unabhängige private Kopie steht aus.

Der Helfer hat keine frei wählbaren Quell-/Zielpfade. Er läuft nur unter Linux als bestehender Eigentümer UID 10005, benötigt Python ≥3.11 und liest genau zehn freigegebene Dateien unter `/var/www/vhosts/gravuru-designwerkstatt.de/private`:

- `gravuru-snapshot-20261021/`: exakt `workshop.sqlite`, `profiles.sqlite`, `design-assets.sqlite`, `SNAPSHOT.json`.
- `gravuru-restorecheck-20261021/RESTORE-CHECK.json`.
- `gravuru-merchant-release-d18bc6c/quellsicherung-d18bc6c-20261021.zip` (28.980.925 Bytes; SHA-256 `57bff9f9dd1c978718e0687241fb9c43b16703cc91bd040db72d83ee3fa10460`).
- `gravuru-source-restore-receipt-20261021.json`.
- `gravuru-handover-20261021/context/`: exakt `storage-marker.json`, `start-r5.cjs`, `app.cjs`.

Er liest keine Live-DB, Konfiguration oder Schlüsseldatei, öffnet SQLite nicht, startet keinen Dienst und baut keine Netzverbindung auf. Die Kontextdateien sind die vom Koordinator ausdrücklich als zu sichernde Dateien bereitgestellten Kopien; der Helfer durchsucht keine weiteren Ordner nach Inhalten. Bytegleiche Daten bleiben bytegleich, einschließlich Status abgelehnter Designs.

Vor Ausführung durch den Koordinator unabhängig prüfen. Die feste Private-Wurzel muss Eigentümer UID 10005 und Rechte 0700 haben. Unterverzeichnisse/Dateien dürfen nicht gruppen- oder weltbeschreibbar sein; Eigentümer müssen passen. Symlinks, Hardlinks, Sonderdateien, zusätzliche Snapshot-/Kontextdateien und bereits vorhandene Ausgaben führen zum Abbruch. Der Helfer nutzt relative `openat`-Zugriffe mit `O_NOFOLLOW`, hält Eingabedateien offen und vergleicht ihre Metadaten nach dem Lesen. Er ändert keine Rechte vorhandener Quellen.

Nach Upload des geprüften Helfers an einen bestätigten privaten Ort als `gravuru_werkstatt` ausführen:

```sh
/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311/bin/python -I \
  /BESTAETIGTER-PRIVATER-HELFERPFAD/pack-private-handover.py --create
```

Feste neue Ausgaben, beide exklusiv mit 0600:

```text
/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-handover-20261021/gravuru-private-handover-20261021.zip
/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-handover-20261021/PACKING-RECEIPT.json
```

Die ZIP enthält zwölf Mitglieder: zehn Originaldateien, `README-DE.txt` mit Wiederherstellungsreihenfolge und `MANIFEST.json` mit Größen, Hashs, Ausschlüssen und Prüfgrenzen. Der externe Beleg enthält zusätzlich den Manifest-Hash und ZIP-Hash. Die DB-Hashes müssen in Snapshot und bestandenem Restorebeleg übereinstimmen; die Quell-ZIP muss ihrem festen, zuvor geprüften Hash und Quell-Restorebeleg entsprechen. Alle Beleg-Hashes werden frisch aufgenommen. Die ZIP wird vollständig erneut gelesen: je Mitglied SHA-256 und CRC, anschließend SHA-256 der ganzen ZIP. Das benötigt mehrere vollständige I/O-Durchläufe; bei den beobachteten Kontolimits kann es dauern. `ZIP_STORED` vermeidet zusätzliche Kompressionslast, das Ergebnis ist ungefähr so groß wie die Summe seiner Eingaben. Kein produktiver Lasttest.

Erfolg: Exit 0, stdout ausschließlich `bytes`, `sha256`, `members`. Fehler: Exit 2 und fester Fehlercode, keine Rohfehlermeldung, privaten Inhalte oder Pfade. Ein teilweise erzeugtes Paket bleibt privat erhalten, wird nicht automatisch gelöscht/überschrieben und darf ohne erfolgreich geschriebenen Beleg nicht übertragen werden. Keine automatische Wiederholung mit abweichenden Pfaden.

Die ZIP ist **nicht verschlüsselt** und enthält private Daten. Ausschließlich sicher privat übertragen, nie GitHub/Release/Webroot. Benötigte Konfiguration und Geheimnisse separat über den bestehenden sicheren Weg übertragen; ohne sie ist kein vollständiger Neustart nachgewiesen. Die historischen 171 Designs/sieben Plattenvorlagen bleiben unzugeordnet. DB- und Quell-Restore beweisen noch keinen vollständigen Anwendungsneustart oder eine mm-genaue Fertigungsprüfung.
