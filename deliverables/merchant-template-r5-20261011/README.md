# Händlerwerkstatt · Originalmaske und Navigation

Version `0.1.0-recovery.20261010+9b77eb16d8ec`, Quelle `9b77eb16d8ec7453f58590becf66d829ffe9f2c8`.

ZIP: `gravuru-merchant-template-r5-20261011.zip` (27.273.126 Bytes, 401 geprüfte Dateien plus Manifest).

SHA-256: `23c26fc573654bc2965cb8f7ee17ecf5f587bb63c44c99a7d4a11618afcb4ab5`

Der automatisierte Staging-/Aktivierungsablauf steht in `INSTALLATION.md` im ZIP und `ops/plesk/MERCHANT-README.md`. Staging prüft Prüfsumme, Manifest, Laufzeitkonfiguration und Build; Aktivierung sichert vorherige Laufzeit, Konfiguration und alle drei privaten Datenbanken, verlangt den erwarteten Einstiegspunkt und arbeitet unter exklusiver Sperre. Keine privaten Daten oder Zugangsdaten im Paket. Produktrevisionen werden ausschließlich separat und mit Versionsvergleich übernommen.

Isolierte Installation, Start, Zugangsschutz sowie Aktivierung und Neustart mit synthetischen Daten geprüft. [Release](../../docs/releases/20261011/template-r5/RELEASE.md).

Live-Nachweis: Revision 5 samt echtem Testkauf erfolgreich; 401 Serverdateien und 25 HTTPS-Prüfungen bestanden. Auf der aktuellen Plesk-Site 20 ist `start-r5.cjs` der feste Weiterleiter mit `require('./app.cjs');` (0640). Er bleibt bei weiteren Aktivierungen erhalten; der Aktivierungshelfer wechselt weiterhin `app.cjs`. Den Webserver nach Übernahme gezielt neu starten und HTTPS prüfen. Die Startumstellung war wegen einer 503-Störung nach Deaktivieren/Aktivieren nötig; keine globale Webserveränderung.
