# Aktueller Cloud-Auftrag – 03.10.2026

Dieser Branch übernimmt die bereits lokal implementierte Gravuru-App. Die Aussage auf dem alten `main`, die neue App existiere noch nicht, ist dort historisch und beschreibt nicht den aktuellen lokalen Stand.

Privates Repository: `Chris83638w/gravuru-2027` (ID 1397611510). Übertragungsbranch: `infra/gravuru-2027-cloud-20261003`. Main und Entwurfs-PR #1 nicht mergen oder überschreiben. Der neue Branch erbt die unveränderte Remote-Historie. Lokale Historie liegt zusätzlich im privaten Sicherungsbundle, nicht als Force-Push.

## Jetzt in einer frischen Cloud-Arbeitskopie

1. Diesen Branch abrufen. `cloud_setup.py --output /tmp/gravuru-2027-fresh` mit Python 3 ausführen. Das Ziel darf noch nicht existieren. Der Helfer prüft Transport-ZIP, jede der 215 aktuellen Quelldateien und die vier Referenzarchive. Keinen Laptop-Pfad verwenden.
2. Im neuen Ziel Node 24 und Python 3 verwenden. `python3 -m pip install --no-cache-dir --target .local-data/python -r app/workshop/requirements-import.txt` und `GRAVURU_PYTHON=python3 node scripts/cloud-check.mjs`. Zusätzlich die ausdrücklich angeforderten `npm test` und `npm run build` dort ausführen, Ergebnisse sichern. Referenz lokal: 137 Tests bestanden, 0 übersprungen, 76 Build-Ressourcen/ein Modell. Ein Windows-Lauf ist kein Cloud-Beleg.
3. Dateien anhand `CLOUD-SOURCE-MANIFEST.json` SHA-256-genau vergleichen. `CLOUD-SOURCE-COMPARISON.json` belegt Materialisierung, nicht die Übertragung der Datenbanken.
4. Nur nach bestandenen Prüfungen den aktuellen `app/`-Quellbaum und passende Root-Dateien auf diesem Entwicklungsbranch als normale Git-Dateien einchecken. Vorher Git-Status prüfen; fremde Änderungen erhalten. Historisches Transport-ZIP und Referenzen behalten. Keine `.local-data`, Cachedateien, Zugangsdaten, Kunden- oder Datenbankinhalte in Git. Kein Force-Push, kein Merge, keine Produktionsveröffentlichung.
5. Cloud-Installation auf diesen aktuellen Quellbaum umstellen. Vor Freigabe alle Tests erneut aus einer frischen veröffentlichten Entwicklungsumgebung belegen. Entwicklungsserver nur in geschützter Vorschau prüfen; keine öffentliche ungeschützte Werkstatt anbieten.

Die bisherigen 19 Cloud-Tests betrafen nur den alten Vergleichskonfigurator. Sie sind kein Nachweis für die neue Werkstatt. Die Behauptung einer vollständigen Migration ist bis zur zusätzlichen Datenübernahme falsch.

## Noch nicht übertragen / noch nicht nachgewiesen

- Lokales geprüftes Gesamtpaket mit drei SQLite-Backups: 365.154.964 Byte, SHA-256 `84caae721f88d409a54cea98692c4a21f28d3ff8db0ff163ffe88f3e18d7f434`. Sieben Produkte, 17 Revisionen, Profile, zwei unveränderte Originaldesignquellen und drei Vorschaudesigns müssen privat verschlüsselt und wiederherstellbar gesichert werden. Keine Datenbanken in Git.
- Zusätzliche Bestandsprüfung: fünf Projektordner mit 358 Dateien. 67 Dateien sind gegen das erste Paket und dessen erste ZIP-Ebene noch nicht abgedeckt. Fünf weitere Downloadarchive sind vorhanden; darin teils historischer privater Datenbankinhalt. Keine pauschale Veröffentlichung. Vier besprochene Screenshots wurden lokal wiedergefunden.
- Alle historischen Verzeichnisse, verschachtelte Archive, tatsächliche Serverdaten und nur browsergespeicherte Zustände sind noch nicht vollständig geprüft. Unklare Quellen ausdrücklich markieren.
- Zweiter berechtigter OpenAI-Account und 24-Stunden-Test sind nicht geprüft. Geheimnisse niemals als Werte ausgeben; benötigte Namen und Wiederherstellbarkeit getrennt dokumentieren.
- GitHub-Webhooks/Actions/Deployment-Umgebungen/Pages waren für dieses Repository nicht eingerichtet. Shopify-Themeübersicht war beim Zugriff nicht lesbar; tatsächliche Shopify-Verknüpfungen bleiben UNGEPRÜFT. Keine Production-Secrets oder Shopify-Mutationen verwenden.
- Produktionsdruck, Gravur, Bestellungen und vollständige Shopify-Strecke sind fachlich noch nicht fertig; siehe aktuelle STATUS.md und UMSETZUNGSPAKETE.md nach Materialisierung.

Verbindliche Abschlussfragen: lokale-only/abweichende Dateien, nicht gepushte Historie, Datenbank-Restore, entscheidendes Screenshotwissen, tatsächlicher Cloud-Lauf, Test durch zweiten Account, sichere CI und Branchschutz jeweils mit Beleg oder ausdrücklichem NICHT GEPRÜFT. Der Laptop darf erst nach vollständigem Nachweis als entbehrlich bezeichnet werden.
