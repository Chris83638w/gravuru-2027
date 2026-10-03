# Branches, Zugänge und CI – 03.10.2026

Gültiger Entwicklungsbranch: `infra/gravuru-2027-cloud-20261003`. App-Codebasis: `529c6e5218a3faa9b8786ace7025fe4370a7092f`; Bildnachweise: `a055e287eb1ec34e0d18886eb1ffabb48f7d59d0`. Der diese Dokumentation enthaltende Folgecommit ergänzt ausschließlich Nachweise und Einstieg. Die genaue aktuelle Commit-ID steht in GitHub bzw. `git rev-parse HEAD`.

| Bezug | Stand und Bedeutung |
|---|---|
| main | `3ff2c2f8e7cb2565f60bd016f73a99ff6520152b`; unverändert, noch keine freigegebene aktuelle Produktionsbasis |
| task/g27-01-package | `36f7c16494feb24abc980f9813a1dec855cc4975`; historisches Paket |
| task/g27-02-cloud | `e8021251a3bf86590798b85dca1bbf001c1fa88c`; historische ZIP-Übergabe |
| PR #1 | Offen, Draft, unverändert; historische G27-02-Paketbasis, nicht der aktuelle materialisierte app/-Quellbaum |
| Lokales task/g27-02-workshop | `3b2ac03d213ac913bcc61520b595f97dde6aa072`; separate Geschichte mit 9 lokalen Commits, als source-history.bundle verschlüsselt online gesichert |

Keine Main-Integration ohne ausdrückliche Freigabe. Kein Force-Push. Eine lokale Arbeitskopie mit gleichem Branchnamen wie der Cloudbranch hat eine andere Historie: nicht zurücksetzen, nicht blind pushen. Für weitere Arbeit einen neuen Aufgabenbranch vom geprüften Remote-Entwicklungsstand erstellen. Kleine PRs mit konkreter Abnahme, keine automatische Produktion.

## Konten und Wiederherstellung

| Zugang | Nachgewiesen | Noch offen |
|---|---|---|
| GitHub | Repositoryzugriff und normale App-Dateien; Connectorberechtigung für dieses Repository ausdrücklich genehmigt | Konto-Recovery von unabhängigem Gerät |
| OpenAI A | Erster Cloudlauf: 137 Tests ohne Fehler/Skips, Build und HTTP-Schutzprüfungen bestanden | Neue veröffentlichte Umgebung tatsächlich auswählen/starten; Fehlversuch landete ohne Repository in Scratch |
| Chris Open AI (Konto B) | Nutzer hat diese Kontobezeichnung genannt | Zugriff, identischer Commit und eigener ungefährlicher Test NICHT GETESTET |
| Backup-Schlüssel | Nutzer bestätigt synchronisierten Passwortmanager und vom Laptop unabhängige Erreichbarkeit | Agent hat den Passwortmanager nicht geprüft; praktische Wiederherstellung auf unabhängigem Gerät offen |
| Plesk-Backup | 16 verschlüsselte Teile vollständig zurückgelesen, alle Hashes/Entschlüsselung/3 SQLite-Restores bestanden | Plesk-Zugang unabhängig wiederherstellen; drei DBs in Cloudruntime integrieren |
| Shopify, SSH, weitere APIs | Kein zusätzlicher Zugang eingerichtet oder als entbehrlich bewiesen | Tatsächlich benötigte Namen/Rollen/Recovery-Orte inventarisieren, keine Werte in Chat/Git |

Nur die Schlüsselablage ist nutzerbestätigt. Daraus folgt keine Bestätigung für sämtliche anderen Zugänge. [Backupnachweis](SERVER-BACKUP-VERIFICATION.json), [Wiederherstellungsweg](WIEDERHERSTELLUNG.md).

## Tarif und Schutz

GitHub Settings → Billing and licensing → Licensing zeigte tatsächlich **GitHub Free**, 2.000 enthaltene Actions-Minuten/Monat. Das ist kein Nachweis eines unverbrauchten Restkontingents. Alle vier gelesenen Branches: `protected:false`. Die private Schutzregel-Oberfläche erklärte Regeln im aktuellen Plan für nicht durchgesetzt; im Tarifvergleich waren geschützte private Branches/erforderliche Statusprüfungen nicht enthalten. Kein Tarifwechsel vorgenommen.

Deshalb ist wirksamer Schutz gegen Force-Push/Löschung NICHT bestätigt. Produktion wurde durch diese Migration nicht verändert; das beweist keine systemweite Deploymentsperre. Bestehende externe Shopify-/Deploy-Bindungen müssen separat zugeordnet werden. **Produktionszugang: NICHT FREIGEGEBEN.**

## Sichere CI vorbereitet

[ci.yml.vorbereitet](ci.yml.vorbereitet) liegt bewusst außerhalb `.github/workflows`. Manueller Start, Leserechte, gepinnte offizielle Actions, Node 24/Python 3.12, PyMuPDF-Pin, Tests/Build, 20-Minuten-Limit. Keine Shopify-Mutation, kein Plesk-Deploy, keine Produktionssecrets. Status: **VORBEREITET, NICHT AKTIV, NICHT IN ACTIONS GETESTET**.

Für workflow_dispatch muss die Workflowdatei auf dem Standardbranch vorhanden sein; kein eigenmächtiger Merge oder Standardbranchwechsel als Umweg. [GitHub-Dokumentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch). Aktivierung und Kostenlimit nach gesonderter Freigabe; der vorliegende Auftrag verlangt mindestens Vorbereitung.
