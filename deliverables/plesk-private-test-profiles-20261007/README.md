# Aktuelles Plesk-Testpaket mit Excel-Profilen

[Installations-ZIP](gravuru-2027-private-test.zip) · [SHA-256-Datei](gravuru-2027-private-test.sha256) · [Installation](../../ops/plesk/README.md) · [Vorlagen und Druckproben](../testabnahme-20261007/README.md)

- Vollständiger Quellcommit: `2c46b7fc3b93a6d9f601a37b3c46ee881f38bec3`.
- Größe: **27.187.995 Bytes, 25,9 MiB**, 361 Dateien.
- SHA-256: `9d08a8bba5a6ddb7de5ea6adeee523ab4778e296415ebb0b752e9bbea25ddca0`.
- Eigenes Installationspaket aus Git-Quellen, keine größere Projektsicherung. Enthält ZIP-Import, Excel-Profilzuordnungen und privaten Operator-Start. Kein Secret, keine Kundendaten/Bestandsdatenbank, kein Shopify-Transport im Paketstart.

Das ältere gleichnamige Paket unter `plesk-private-test-20261007` bleibt als früherer Stand erhalten. Für die neue Testinstallation diese aktualisierte Fassung verwenden.

## Aktuelle Paketprüfung

`python3 scripts/check-plesk-test-package.py deliverables/plesk-private-test-profiles-20261007/gravuru-2027-private-test.zip`: **5 Prüfgruppen PASS** am 07.10.2026, tatsächliches entpacktes ZIP und `app.cjs`. Anlass: neues Installationsartefakt mit geändertem Produktcode und zusätzlichem Laufzeitmodul; keine neue allgemeine Produktabnahme.

Manifest/Datei-SHA, private Ablage, `plesk:prepare`, `plesk:check`, Python/Cairo, Passwort-/Host-/Origin-/CSRF-/Dateisperren, zweiter Prozess, SVG-/Excel-/SQLite-Bedienung und Neustart ohne Datenverlust/Duplikate lokal geprüft. Node 24.19.0, Python 3.12.14. Desktop/390 ohne JavaScript-Fehler; beide Screenshots gesichtet.

[Maschinenlesbarer Bericht und Screenshots](../../docs/dashboard-20261004/plesk-profile-package-20261007/).

**Kein echter Plesk-/Passenger-/HTTPS-Nachweis.** Der lokale Test verwendet einen simulierten HTTPS-Headerproxy und eine isolierte Python-Testumgebung. Das ersetzt weder Serverinstallation noch TLS/Zertifikat, dortige Rechte, Paketnetzwerk oder physischen Druck. Testlink weiterhin unbestätigt; manuelle Plesk-Bedienung erforderlich.
