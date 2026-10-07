# Aktuelles privates Plesk-Testpaket

- Quellcommit: `47ffda076a870bf1085f16a3449dfc2cece7655c`.
- Installationsdatei: [gravuru-2027-private-test.zip](gravuru-2027-private-test.zip), 27.190.407 Bytes / 25,9 MiB.
- SHA-256: `b41590bb66e211594979e857bab843a1824f9941f6891973b1410612fe031785`.
- Anleitung: [ops/plesk/README.md](../../ops/plesk/README.md).

Enthält den bisherigen Produktstand einschließlich ZIP-Import, Excel-/Formprofilzuordnungen, LiteSpeed-Anpassung für den privaten internen Listener und eine geprüfte private Konfigurationsdatei als optionalen Anschluss für Plesk-npm-Skripte. Die persönliche Konfigurationsdatei selbst, Zugangsdaten und Datenbanken sind nicht im Paket.

Fünf gezielte Prüfgruppen am tatsächlich entpackten Paket mit simulierter LiteSpeed-Übernahme und ohne App-Variablen im npm-Prozess bestanden: [Prüfbericht](../../docs/dashboard-20261004/plesk-hosted-package-20261007/report.json). Einschließlich Zugriffsschutz, Python/Cairo, SVG-/Excel-Import, SQLite, zweiter Prozess und Neustart ohne Duplikate. Zusätzlich fünf Node-Tests für private Konfiguration, Rechte, Symlinks, ungültige Inhalte und Bindungskonflikte bestanden.

Dieses Paket ersetzt die beiden früheren Varianten für die laufende Testbereitstellung. Die tatsächliche Serverabnahme wird gesondert dokumentiert; lokale Nachweise sind keine physische Druck- oder Shopify-Abnahme.
