# Cloud-Validierung vom 03.10.2026

Branch: `infra/gravuru-2027-cloud-20261003`. Ausgangs-HEAD: `9ca2d1256c006b20d4a4ca238deca34426b1b2ff`; Quellarchiv-Commit: `3b2ac03d213ac913bcc61520b595f97dde6aa072`.

Transportarchiv: 24.160.875 Byte, SHA-256 `87a5476f3ee6c192c894e7ad4c91cf9baaffac50614d7fabb8b96ab034e672a6`. `cloud_setup.py` wurde in `/tmp/gravuru-2027-fresh-20261003-01` ausgeführt: 215/215 Dateien identisch, 4 Referenzarchive geprüft. Bericht `CLOUD-SOURCE-COMPARISON.json` bleibt der unveränderte Nachweis der Extraktion, kein Prüfsummenmanifest späterer Dokumentationsänderungen.

Plattform Linux x86_64, Kernel 6.18.44; Node.js 24.19.0; Python 3.12.14; PyMuPDF 1.28.2 per gepinnter Requirements-Datei installiert. Keine Produktionsschlüssel oder npm-Abhängigkeiten nötig.

| Prüfung | Ergebnis |
| --- | --- |
| `GRAVURU_PYTHON=python3 node scripts/cloud-check.mjs` | PASS; 137 bestanden, 0 Fehler, 0 Skips; PDF, Archive und Build PASS |
| `GRAVURU_PYTHON=python3 PYTHONPATH="$PWD/.local-data/python" npm test` | 137 bestanden, 0 Fehler, 0 Skips |
| `npm run build` | PASS; 76 Ressourcen, 1 Modell |
| HTTP in frischem Verzeichnis und materialisiertem Checkout | Kundenkonfi/Editor/Werkstatt/Profile/Serien 200, 1 synthetisches Produkt, Acrylpreis 1499 Cent |
| Schutzprüfungen | Fremder Host/Origin und POST ohne CSRF: 403 |

Logs in `/tmp/gravuru-2027-fresh-20261003-01/.test-output/`, zusätzlich kopiert nach `/workspace/gravuru-2027-current/.test-output/`. Cloudbericht: `cloud-check-2026-10-03T08-39-14-898Z/report.json`; `tests.log`, `python-pdf.log`, `references.log`, `build.log`, außerdem `npm-test.log`, `npm-build.log`, `install-python.log`. HTTP-Bericht im aktuellen Checkout: `.test-output/http-readiness.json`. Logs und lokale Testdaten sind ignoriert und werden nicht committed.

Sechs vorhandene Dateien wurden vor Übernahme als abweichend erkannt: `.gitignore`, `QUELLEN-MANIFEST.json`, `README.md`, `START_HERE.md`, `STATUS.md`, `UMSETZUNGSPAKETE.md`. Sie stammen auf dem abgerufenen Branch aus dem alten Main-Stand; keine neuere Remoteänderung lag vor. Der Referenzmanifest-Unterschied ist ausschließlich CRLF/LF. Die anderen Änderungen übernehmen den aktuellen Stand (einschließlich korrekt 28 statt 42 Variantenkombinationen). Dokumentation wird anschließend um diesen tatsächlichen Cloud-Nachweis ergänzt. `cloud_setup.py`, `CLOUD-AKTUELL.md`, Transport-ZIP und alle vier Referenz-ZIPs bleiben erhalten. Keine App-Logik oder Tests verändert.

Der alte Main-Checkout wurde mit kompletter Git-Metadaten- und Referenzkopie nach `/tmp/gravuru-2027-main-preserved-20261003.tar.gz` archiviert und jede reguläre Datei bytegleich geprüft. Dieses lokale Erhaltungsarchiv enthält keine Aussage zur privaten 365-MB-Sicherung und ist kein dauerhafter Backup-Speicher.

Dies ist ein frisches Verzeichnis und ein separater Git-Checkout in der bereits laufenden Cloud-Maschine, keine neu gestartete veröffentlichte Umgebung. Die verfügbaren Tools können den Konfigurationsentwurf speichern, aber keine Umgebung veröffentlichen oder eine neue Aufgabe starten. Deshalb bleibt die Nachprüfung nach Veröffentlichung offen.

NICHT GEPRÜFT/ÜBERTRAGEN: private 365-MB-Sicherung und drei Datenbank-Restores, zusätzliche historische Quellen/verschachtelte Archive und Screenshotwissen, lokale-only Historie außerhalb des 215-Dateien-Transports, zweiter Account, 24-Stunden-Laptop-aus-Test, aktuelle CI/Branchschutz und externe Deploy-/Shopify-Bindungen. Keine Shopify-/Plesk-Schreiboperation, kein Deploy, kein Force-Push, kein Main-Merge. Eine vollständige Migration oder Entbehrlichkeit des Laptops wird nicht behauptet.

`git diff --cached --check` meldet vorhandene CRLF-/Leerraumstellen in den unverändert übernommenen Quellen und bytegeschützten Referenzen. Diese wurden nicht automatisch formatiert; Log `.test-output/source-whitespace.log`. Tests und Build bestehen. Git normalisiert reguläre Textdateien gemäß der mitgelieferten `.gitattributes`; hashgeschützte Ressourcen bleiben ausdrücklich `-text`.

