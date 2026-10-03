# Cloud-Abnahmetest Konto A – 03.10.2026

Ergebnis: Quellinstallation, automatisierte Tests, Build und geschützte HTTP-Entwicklungsvorschau BESTANDEN. Neue Ausführung; historische Ergebnisse wurden nicht übernommen. Keine vollständige Datenmigration oder Produktionsfreigabe.

## Umgebung und Herkunft

- Aufgabenstart laut Nutzer: Cloud → gravuru-2027. Tatsächlich ausgeführt in einer laufenden verwalteten Cloudinstanz, Provider `cloud`, Arbeitsverzeichnis `/workspace`; kein Laptopzugriff.
- Instanz: `ccarenv_b64_Y2NhcmVudl81ZDliZDA5YTEwM2M4MTkxOWUwMDBlZjJmYjM2YmMzZg`.
- Konfiguration: `16de3a2f-12b3-4882-b5d7-afb410207d93~cecfg_6ac0eabed9e081a182773b56699e0905`, Revision 2; aktuelle Beobachtungen, Phase running, connectivity connected. Statusschnittstelle liefert keinen Anzeigenamen und keine Repositorybindung; die Auswahlbezeichnung ist daher Nutzerangabe, nicht unabhängig bestätigte Metadaten.
- Tatsächliche Repositoryzuordnung: vorhandener Cloudcheckout und frischer Klon haben origin `https://github.com/Chris83638w/gravuru-2027.git`.
- Frischer Klon: `/workspace/gravuru-2027-cloud-acceptance`, direkt aus GitHub mit `git clone --branch infra/gravuru-2027-cloud-20261003 --single-branch`.
- Ausgangsbranch: `infra/gravuru-2027-cloud-20261003`.
- Vollständiger geprüfter Commit: `f7c3f24db55003c28fec5274dfc5df2736926b6b`; identisch zum Mindeststand, zusätzlich ancestry check erfolgreich.
- Debian GNU/Linux 13.6, Node v24.19.0, Python 3.12.14, npm 11.9.0. PyMuPDF 1.28.2 gemäß `app/workshop/requirements-import.txt` neu unter `.local-data/python` installiert.
- CLOUD-AKTUELL.md, AGENTS.md, package.json, NAECHSTER-CLOUD-TEST.md sowie START_HERE.md und UMSETZUNGSPAKETE.md gelesen.
- Netzwerk: dokumentierter Proxy, restriktive Policy, kein VPN. Runtime-Status meldet Policy state unknown und keine konfigurierten Secrets/Identitäten; erfolgreiche GitHub-/Paketoperationen sind separat tatsächlich beobachtet.

## Neue Prüfergebnisse

Testfenster 03.10.2026, ca. 12:27–12:31 UTC (14:27–14:31 Europe/Berlin).

- `python -m pip install --target .local-data/python -r app/workshop/requirements-import.txt`: erfolgreich.
- `node scripts/cloud-check.mjs`: PASS, 12:29:08.053–12:29:25.007 UTC. Python/PDF, Referenzen, Tests und Build jeweils Exit 0. 137 Tests, 0 Fehler, 0 Skips.
- Vier Referenzarchive gemäß QUELLEN-MANIFEST.json verifiziert; alle elf Screenshotdateien im SCREENSHOT-REFERENZEN-20261003.zip anhand SCREENSHOT-MANIFEST.json nach Größe und SHA-256 geprüft.
- Separat `PYTHONPATH="$PWD/.local-data/python" npm test`: 137 bestanden, 0 Fehler, 0 Skips, 0 cancelled, 0 todo.
- Separat `npm run build`: Exit 0, 76 geprüfte Ressourcen, 1 Modell, editorBytes 461440.
- Erster eingeschränkter Werkzeuglauf konnte den Proxy nicht erreichen; erster Cloud-Check meldete EPERM beim Python-Unterprozess. Mit explizitem Netzwerkzugriff im Cloud-Ausführungswerkzeug bestanden Klon und kompletter neuer Check. Kein Proxy- oder Policy-Bypass.

## Geschützte Vorschau

Cloudprozess bindet ausschließlich `127.0.0.1:8961`; keine öffentliche Freigabe und kein externer Tunnel. Bestehende Server-/Werkstattmodule unverändert verwendet; synthetischer Master ausschließlich in `:memory:` für Produkte, Profile und Designassets. Keine persistente Vorschau-Datenbank und kein Restore.

HTTP-Prüfung: `/?model=acryl`, `/editor.html`, `/werkstatt/`, `/werkstatt/profile/`, `/werkstatt/serien/`, `/models.json`, `/api/workshop/products`, `/api/workshop/profiles` und `/api/workshop/import-template` jeweils 200 und nichtleerer Inhalt. Fremd-Host, Fremd-Origin und `Sec-Fetch-Site: cross-site` jeweils 403; POST auf Produkte ohne CSRF ebenfalls 403. Kein Token protokolliert. Die Vorschau wurde nach der Prüfung beendet.

Diese Prüfung belegt HTTP-Erreichbarkeit und Schutzverhalten sowie die automatisierten Funktionsprüfungen. Keine visuelle Browser-/Bedienabnahme, reale Bestellstrecke oder Maschinenabnahme. Der Cloud-Anzeigename und eine konfigurierte Repositorybindung sind über die verfügbare Statusschnittstelle nicht unabhängig belegbar; die tatsächlich verwendete GitHubquelle ist belegt.

## Umfang und nächste Grenze

Genau diese Datei wird auf `test/cloud-account-a-20261003-1230` committed und gepusht. Keine Produktänderung, kein Main-Merge, keine Shopify-/Plesk-Mutation. Vier reine CRLF/LF-Checkoutabweichungen wurden im eigenen frischen Klon auf die Originalbytes zurückgesetzt; keine inhaltliche Änderung. Temporäre Testartefakte bleiben außerhalb des Commits.

Bestehende Datenbanken unverändert; kein Zugriff auf private Backup-/Recovery-Daten. Datenbankwiederherstellung, Konto-B-Test und vollständige Migrationsabnahme bleiben offen. Die begrenzte Quell-/HTTP-Abnahme ist kein Nachweis ihrer Erfüllung.
