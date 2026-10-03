# Gravuru 2027 – Cloud-Einrichtung

Stand: 03.10.2026. Ergänzung zu CLOUD-UEBERGABE.md, kein Ersatz der fachlichen Anforderungen.

## Verifizierter Ausgangspunkt

- Aktive lokale App: Branch `task/g27-02-workshop`, Commit `3b2ac03d213ac913bcc61520b595f97dde6aa072`.
- Infrastruktur wird getrennt unter `infra/gravuru-2027-cloud-20261003` vorbereitet. Die laufende Werkstatt und ihre Datenbanken bleiben unangetastet.
- Lokales Sicherungspaket: `Gravuru-2027-Cloud-Sicherung-20261002.zip`, 365.154.964 Byte; SHA-256 `84caae721f88d409a54cea98692c4a21f28d3ff8db0ff163ffe88f3e18d7f434`.
- Paket lokal auf Integrität geprüft und separat wiederhergestellt. Enthält 7 Produkte, 17 Produktrevisionen, 3 Datenbanken, 19 Musterbilder und die im Manifest erfassten Quellen. Das beweist noch keine Vollständigkeit aller historischen Projektordner.
- Noch keine Cloud-Übertragung oder veröffentlichte Cloud-Umgebung nachgewiesen. Kein produktiver Shopify-Auftrag und kein unbegrenzter Hintergrundbetrieb freigegeben.

## Einrichtung in Codex Cloud

Unter ChatGPT → Einstellungen → Codex Cloud → Umgebungen wird `Chris83638w/gravuru-2027` ausgewählt. Die bestehende GitHub-App hat zunächst nur Zugriff auf `gravuru-team` und `gravuru-shopify`; zusätzliche Repository-Freigabe muss ausdrücklich bestätigt werden. Keine pauschale Freigabe aller Repositories.

Vor einem Push externe Auslöser prüfen: Bei der Kontrolle am 03.10. wurden keine Repository-Webhooks, keine GitHub-Deployment-Umgebungen und keine aktivierte GitHub-Pages-Seite gefunden. Shopify ist als GitHub-App installiert; tatsächliche Shopify-Branchbindungen und Actions sind noch zu prüfen. Deshalb bedeutet ein neuer Branch allein keine garantierte Isolation.

Quellcode muss als normaler Git-Baum auf einem eigenen Branch verfügbar sein. Das alte ZIP in Entwurfs-PR #1 ist nicht der aktuelle Arbeitsstand. Bestehende Remote-Historie erhalten; kein Force-Push und kein Überschreiben des Default-Branches.

## Reproduzierbare Entwicklungslaufzeit

Benötigt: Node.js 24, Python 3.10 oder neuer und die festgehaltene PDF-Abhängigkeit. Die Anwendung benötigt keine npm-Pakete. In der Cloud aus dem Repository-Verzeichnis:

```sh
python3 -m pip install --no-cache-dir --target .local-data/python -r app/workshop/requirements-import.txt
GRAVURU_PYTHON=python3 node scripts/cloud-check.mjs
```

Der Check bricht bei fehlendem PDF-Konverter, fehlerhaften Referenzarchiven, fehlgeschlagenen oder übersprungenen Tests ab. Er speichert maschinenlesbare Ergebnisse und Logs in `.test-output/`. Er startet keinen öffentlich erreichbaren Server und führt keine Shopify-Schreiboperationen aus. PyMuPDF-Lizenzentscheidung vor einem proprietären Hosted-Release bleibt offen.

Danach private Daten separat aus dem geprüften Paket in ein neues Ziel wiederherstellen. Die drei Datenbanken nicht in Git aufnehmen. Abgleich aller IDs, Revisionen, Originaldateien und Profile laut CLOUD-UEBERGABE.md. Erst die geprüfte Umgebung veröffentlichen und einen begrenzten Übernahmetest starten. Cloud-Ausführung und visuelle Abnahme getrennt belegen.

## Haltbarkeit und Restarbeiten

Cloud-Aufgabenlaufzeit ist kein dauerhafter Backup-Speicher. Privater dauerhafter Speicher für Originale und Datenbankpakete sowie eine unabhängige zweite Sicherung sind noch festzulegen/zu prüfen. Keine Datenbanken oder Geheimnisse als Quellcode hochladen. Aktuelle Änderungen seit dem Sicherungszeitpunkt durch eine abschließende konsistente Ergänzung sichern.

Der 24-Stunden-Test bei ausgeschaltetem Laptop benötigt eine gesonderte Aktivierung mit Kosten-/Laufzeitgrenze. Eine gespeicherte Anleitung beweist keinen laufenden Scheduler. Ein Live-Shop ist ein eigener Abnahmeschritt.

Offizielle Grundlage: https://learn.chatgpt.com/docs/environments/cloud-environments und https://learn.chatgpt.com/docs/cloud. Cloud-Aufgaben unterstützen laut geprüftem Dokumentationsstand noch keine Computer-/Browserbedienung. Persönliche lokale Plugins und Windows-Installationen nicht voraussetzen.
