# Geprüfte Sicherung vor Cloud-Übertragung

**Ergebnis: Lokale Sicherung und Probewiederherstellung erfolgreich. Cloud-Upload und Cloud-Abnahme sind noch offen.**

## Identität des Sicherungsstands

- Paket: `outputs/Gravuru-2027-Cloud-Sicherung-20261002.zip`, relativ zum gemeinsamen Arbeitsordner `wa`.
- Erfasst: 02.10.2026, 21:23:31 Uhr Europe/Berlin (19:23:31 UTC).
- Quellcommit: `3b2ac03d213ac913bcc61520b595f97dde6aa072`, Branch `task/g27-02-workshop`; Quellbaum zum Zeitpunkt der Sicherung sauber.
- Größe: 365.154.964 Bytes; 302 erfasste Dateien/Archive. Inhalte verschachtelter Referenzarchive sind darin nicht erneut als einzelne Dateien gezählt.
- SHA-256: `84caae721f88d409a54cea98692c4a21f28d3ff8db0ff163ffe88f3e18d7f434`.
- Keine fehlenden Dateien im ausdrücklich inventarisierten Umfang. 19 ursprüngliche Acrylmockups, Daria-Dateien, Übergaben, frühere Ergebnisse und vier Referenzarchive mitgesichert.

Diese Datei ist der nachträgliche Abnahmebericht und liegt zusätzlich neben dem ZIP; sie ist nicht Teil des oben genannten unveränderten Archivhashes. Weiteres Bearbeiten nach dem Sicherungszeitpunkt kann einen neuen Snapshot vor der Übertragung erforderlich machen.

## Datenbestand und Prüfungen

- Drei SQLite-Sicherungen mit Integritäts- und Fremdschlüsselprüfung, vollständig mit den Quelldaten abgeglichen: 7 Produkte/Master, 17 Produktrevisionen, 4 Importschlüssel, 2 Profile mit 2 Profilrevisionen und 5 Einstellungsrevisionen, 2 unveränderte Design-Originale und 3 daraus erzeugte Designressourcen.
- Alle Dateien mit SHA-256 geprüft; ZIP zusätzlich vollständig auf CRC und alle inventarisierten Inhalte auf SHA-256 geprüft. Git-Bundle unabhängig durch Git bestätigt.
- Alle gespeicherten Originaldateien und Vorschauen mit den in der Datenbank gespeicherten Prüfsummen abgeglichen. Acht Asset-Verweise in historischen Produktdokumenten vollständig auflösbar.
- Wiederherstellung in neuem separatem Ordner `work/gravuru-cloud-restore-check-20261002`, ohne Originale zu ändern. Alle sieben Produkte mit unveränderten IDs/Revisionen und alle 17 historischen Kundenmodelle über die echten Anwendungsfunktionen geladen; Profile und Designzuordnungen erfolgreich aufgelöst.
- Insbesondere aktuell geöffnetes Produkt `cfg_035361f7-91b7-4c28-b977-ab23670bd778`, Daria-Import `cfg_a20d644c-1e4c-4158-8f7b-2be30049722b` und reguläre Vorlage `cfg_ad9a9754-9bf2-416c-a366-da9c996cb841` enthalten.
- Build aus Wiederherstellung: 76 Ressourcen, ein Modell, 461.440 Editorbytes. Alle vier historischen Referenzarchive stimmen mit dem ursprünglichen Manifest überein; die separat entpackten 294 Referenzdateien wurden in diesem Lauf nicht erneut aufgebaut/geprüft.
- Frischer Testlauf im Wiederherstellungsordner: **137 Tests, 133 bestanden, 0 Fehler, 4 übersprungen**, weil PyMuPDF in dieser Sitzung nicht nutzbar war. Keine Behauptung eines vollständig bestandenen PDF-Umgebungstests. Frühere erfolgreiche PDF-Tests bleiben separat dokumentierte historische Nachweise. Beim Cloud-Aufbau PDF-Abhängigkeit bereitstellen und diese vier Tests ausdrücklich ohne Skip bestehen lassen.

Prüfdateien neben dem ZIP: `Gravuru-2027-Wiederherstellung-Tests.log`, `.zip.sha256`; im Paket `MANIFEST.json` und `VERIFICATION.json`. Wiederherstellung/Prüfung erfolgt mit `verify-and-restore.py`; vollständiger Ablauf in `source/CLOUD-UEBERGABE.md`.

## Offener Übertragungsschritt

GitHub-Connector meldete 404 für das bekannte Repository. Der bereits vorhandene Chrome-Zugang meldete eine Zugriffsrichtlinienstörung, auch nach einem dokumentierten Wiederholungsversuch. Die lokale Browseransicht läuft weiter; daraus folgt kein Zugriff auf Codex Cloud. Keine Uploads, neuen Cloud-Aufträge oder Veröffentlichungen vorgenommen.

Das vollständige ZIP gehört in einen privaten Cloud-Dateispeicher der vorgesehenen Codex-Umgebung; Datenbanken nicht ins Quellrepository einchecken. Quellcode kann separat ins bestehende private GitHub-Projekt. Erst dort entpacken, dieselben Prüfsummen/Datenmengen nachweisen, PDF-Abhängigkeit installieren, Tests/Build durchführen und Produktansicht abnehmen. Danach den Cloud-Prüfnachweis mit Umgebung und Quellstand ergänzen. Zugangsdaten über geschützte Einstellungen bereitstellen. Lokale Originale und Sicherung behalten.

Nicht enthalten: Passwörter, Browseranmeldungen, nur im Browser ungespeicherte Änderungen, Windows-Laufzeitprogramme und neu installierbare Paket-Caches. Diese Grenzen sind bewusst dokumentiert; das Paket ist keine pauschale Sicherung des gesamten Laptops.
