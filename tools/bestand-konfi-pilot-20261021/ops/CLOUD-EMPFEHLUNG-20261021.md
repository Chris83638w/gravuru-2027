# Cloud-Einordnung für Gravuru

21.10.2026. Empfehlung zur Planung, keine beauftragte Migration, kein angelegtes Cloudkonto und keine neuen laufenden Kosten.

Für Werbeaktionen ist eine verwaltete Cloud ein sinnvoller Kandidat. Sicherheit und Verfügbarkeit sind zu unterscheiden: automatische zusätzliche Instanzen helfen gegen Lastspitzen, eine Datenbank mit Standby gegen einzelne Ausfälle. Zugriffsrechte, vertrauliche Fotos, sichere Anwendung und getestete Wiederherstellung bleiben Betreiberaufgaben. Kein Anbieter macht eine Zusage von 100 Prozent unterbrechungsfreiem Gesamtbetrieb möglich.

## Konkreter Ausgangspunkt

Der vorhandene Host hat viel freie Leistung, aber der tatsächlich bestätigte Prozess läuft in `lve10005`. Für dieses Konto gelten 1 GB Arbeitsspeicher und 1 MB/s I/O. Ein einzelner Prozess, kooperative SQLite-Sperre und synchrone Bild-/Prüfpaketverarbeitung bleiben Engpässe, auch wenn derselbe Code unverändert auf eine Cloud-VM kopiert wird. Ein realer Kapazitätstest mit Foto-/DB-/Warenkorbarbeit steht aus. Aus den bisherigen synthetischen GET-Messungen folgt keine Käuferkapazität.

## Bevorzugter Prüfweg

Google Cloud ist ein passender Kandidat: Cloud Run für die zustandslosen Anfragen, privater Cloud Storage für Bilder/Prüfpakete, dauerhaft gespeicherte Aufträge für die Bildverarbeitung und Cloud SQL PostgreSQL mit bewusst eingerichteter Hochverfügbarkeit. Das ist eine technische Empfehlung, kein belegter Preisvorteil gegenüber AWS. AWS bietet ebenfalls verwaltete Rechenleistung, S3-Dateispeicher und RDS mit Multi-AZ. Zunächst einen Anbieter einsetzen; zwei parallel schreibende unabhängige Datenbestände würden zusätzliche Fehlerquellen schaffen.

Shopify bleibt für Warenkorb und Checkout zuständig. Die bestehende Preisfunktion wird weiterverwendet und nach Build-/Negativprüfung erweitert. Konfiguratoroberfläche und Produktfunktionen werden nicht wegen des Hostwechsels neu gestaltet.

## Begrenzter nächster Schritt

1. Fertiges privates Sicherungspaket auf einem zweiten unabhängigen privaten Ziel ablegen und dort anhand der Prüfsumme bestätigen. Die jetzige Sicherung auf demselben Plesk-Host ist noch kein Schutz gegen den Verlust dieses Hosts.
2. Aktuelle Daten-/Dateiablage, SQLite-Transaktionen, Auftragswiederholungen, Bilddecoder und Sitzung prüfen; Übergang zu einer zentralen Datenbank und privatem Objektspeicher planen. Eine PostgreSQL-Migration ist echte Arbeit und kein bloßer Konfigurationsschalter.
3. Für erwartete normale und Werbeaktionslast ein Kostenmodell einschließlich ständig verfügbarem Datenbankdienst, Backups, Dateispeicher und ausgehenden Daten erstellen. Budgetwarnungen, Maximalinstanzen, Datenbankverbindungen und getrennte Verarbeitung begrenzen die Last; Budgetwarnungen allein sind keine harte Ausgabensperre.
4. Eine getrennte Testumgebung mit synthetischen Daten aufbauen, Lastspitzen und Wiederherstellung messen; erst nach Abnahme umschalten. Der vorhandene Plesk-Dienst bleibt bis dahin maßgeblich. Zu jedem Zeitpunkt nur ein verbindlicher Schreibstand, mit dokumentiertem Rückweg.

## Herstellerquellen, am 21.10.2026 geprüft

- [Cloud Run: automatische Skalierung und Grenzen](https://docs.cloud.google.com/run/docs/about-instance-autoscaling)
- [Cloud Run: Sicherheitsaufbau](https://docs.cloud.google.com/run/docs/securing/security)
- [Cloud SQL: Hochverfügbarkeit und Failover](https://docs.cloud.google.com/sql/docs/postgres/high-availability)
- [Google Cloud: geteilte Sicherheitsverantwortung](https://docs.cloud.google.com/architecture/framework/security/shared-responsibility-shared-fate)
- [AWS RDS: Multi-AZ mit Standby](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html)

Automatische Skalierung und Standby sind keine Belege für die Zuverlässigkeit unseres noch anzupassenden Codes. Der bestehende Plesk-Betrieb wurde in dieser Aufgabe ausschließlich für die freigegebene Sicherung kurz unterbrochen und danach wiederhergestellt.
