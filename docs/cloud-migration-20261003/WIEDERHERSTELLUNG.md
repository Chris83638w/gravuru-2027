# Wiederherstellung des gesicherten Standes

Datum: 03.10.2026. Keine Zugangswerte enthalten. Produktionsdaten nicht nach GitHub oder in öffentlich erreichbare Ordner kopieren.

## Normale Entwicklung

Repository `Chris83638w/gravuru-2027`, Branch `infra/gravuru-2027-cloud-20261003` in ein frisches Verzeichnis klonen. Normaler `app/`-Quellbaum vorhanden; für alltägliche Entwicklung nicht ein altes ZIP darüber entpacken. [CLOUD-AKTUELL.md](../../CLOUD-AKTUELL.md), AGENTS.md und aktuelles Umsetzungspaket lesen. Node 24, Python 3.12, PyMuPDF aus `app/workshop/requirements-import.txt` verwenden. `GRAVURU_PYTHON=python3 node scripts/cloud-check.mjs`, danach angeforderte separate npm-Prüfungen. Keine produktiven Secrets für diesen Test erforderlich.

`cloud_setup.py` bleibt Nachweis-/Notfallwerkzeug für das ursprüngliche Transportarchiv: nur in ein separates leeres Verzeichnis extrahieren. Es stellt den geprüften 215-Dateien-Ausgangsstand her, nicht spätere Commits. Nie ungeprüft über einen neuen Checkout schreiben.

## Private Bestände

In Plesk `gravuru.de` liegt `/gravuru-manufaktur-app/backups`, außerhalb des öffentlichen Webroots, Elternverzeichnis Rechte 700. Mit berechtigtem eigenen Konto folgende 17 Dateien herunterladen:

- `Gravuru-2027-Privatsicherung-20261003.parts.json`
- `Gravuru-2027-Privatsicherung-20261003.zip.age.part001` bis `part016`.

Jede Größe und SHA-256 gegen [SERVER-BACKUP-VERIFICATION.json](SERVER-BACKUP-VERIFICATION.json) prüfen. Die 16 Teile binär in Nummernreihenfolge in einer NEUEN Datei zusammenfügen. Ergebnis 528.682.206 Byte, SHA-256 `961cf4655e4a25c201324c72782df617acb61c34fb5a40f315549a8643d03a39`. Fehlende/abweichende Teile stoppen den Restore.

Den separat im Passwortmanager aufbewahrten `Gravuru-2027-Wiederherstellung.agekey` über den vorgesehenen sicheren Weg auf dem Wiederherstellungsrechner bereitstellen, niemals in den Chat oder ins Repository. Offizielles age verwenden, um in eine neue private Datei zu entschlüsseln. Das Schlüsselmaterial muss nicht angezeigt werden. Entschlüsseltes ZIP: 528.552.966 Byte, SHA-256 `858f93286de4adb02e50ed5fc400aee81c03288f1150abc4301cf7bda7ad62e1`.

ZIP-CRC und alle 99 Einträge des enthaltenen MANIFEST.json prüfen. Darin liegt die Basis `historical/Gravuru-2027-Cloud-Sicherung-20261002.zip`: 365.154.964 Byte, SHA-256 `84caae721f88d409a54cea98692c4a21f28d3ff8db0ff163ffe88f3e18d7f434`. Deren 302 Manifestdateien ebenfalls prüfen. Beide Zahlen überlappen durch Verschachtelung; nicht zu einzigartigen Gesamtdateien addieren.

Die drei aktuellen konsistenten Datenbanken liegen im ergänzenden ZIP unter `state/workshop.sqlite`, `state/profiles.sqlite`, `state/design-assets.sqlite`. Ihre Hashes, Zwecke und erwarteten Tabellenanzahlen stehen im [Datenbankinventar](database-inventory-20261003.json). Nur diese konsistenten Backups gemeinsam in eine neue, zugriffsbeschränkte Testdatenablage übernehmen; keine alten WAL-Dateien dazukopieren. `PRAGMA integrity_check` muss `ok` ergeben; Anzahl und fachliche IDs/Revisionen in der isolierten App prüfen, ohne Kundendaten ins Protokoll zu schreiben. Bestehende Cloud-Testdaten vorher separat sichern, nicht überschreiben. Produktionssystem nicht verwenden.

Lokale Git-Historie liegt als `source-history.bundle` im Basisarchiv; genauen Pfad im Manifest auflösen und in einer separaten Wiederherstellungskopie mit `git bundle verify` prüfen. Das Archiv bewahrt die 9 lokalen Commits, ersetzt aber keine fachliche Integration in die andere Remote-Historie. Zusatzordner und alte Downloadarchive sind erhalten, nicht automatisch zur aktiven Codebasis erklärt.

## Tatsächlich durchgeführter Rücktest

Alle 16 Teile stammen für den Rücktest aus vom Server heruntergeladenen Bytes. Ein zusätzlich serverseitig erzeugtes Sammel-ZIP brach beim Download ab; dieses ZIP selbst ist NICHT gültig. 15 vollständige Mitglieder daraus wurden über CRC und erwartete SHA-256 geprüft, Teil 016 einzeln heruntergeladen. Der daraus zusammengesetzte vollständige age-Payload, die authentifizierte Entschlüsselung, 99 + 302 Manifestprüfungen und alle 3 SQLite-Restores bestanden. Ausführung in einem isolierten lokalen Ordner, nicht im Cloudruntime. Beim späteren Restore am besten die 16 Einzelteile laden; nicht das abgebrochene Sammel-ZIP verwenden.

Die unabhängige Ablage des Schlüssels ist nutzerbestätigt. Ein Wiederherstellungslauf ausschließlich mit unabhängig beschafftem Schlüssel und ein DB-Restore in einer neuen Cloudumgebung bleiben offen.
