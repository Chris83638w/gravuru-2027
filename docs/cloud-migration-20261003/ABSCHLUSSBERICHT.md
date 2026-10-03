# Cloud-Migrationsprüfung – Gravuru 2027

Prüfdatum: 03.10.2026. **Erheblich gesichert, vollständige Laptop-Unabhängigkeit noch nicht nachgewiesen. Keine Livefreigabe.**

Repository: [Chris83638w/gravuru-2027](https://github.com/Chris83638w/gravuru-2027), privat. Aktueller Entwicklungsbranch: `infra/gravuru-2027-cloud-20261003`. Code-Prüfcommit: `529c6e5218a3faa9b8786ace7025fe4370a7092f`. Bildarchiv-Commit: `a055e287eb1ec34e0d18886eb1ffabb48f7d59d0`. Diese Dokumente ergänzen den Folgecommit; die aktuelle vollständige ID ist im GitHub-Commitverlauf ablesbar. Main und PR #1 wurden nicht integriert/verändert.

## 1. Quellen und genaue Prüfumfänge

| Umfang | Ergebnis |
|---|---|
| Aktiver lokaler Transportstand | 215 Dateien, 32.729.075 Byte; [Manifest](source-files.json) |
| Direkter GitHub-Vergleich gegen 529c6e5 | 206 exakt identisch, 6 nur CRLF/LF, 3 Dokumente geändert, 0 fehlend; [vollständige Liste](github-file-comparison-529c6e5.json) |
| Ursachen der 3 Textänderungen | README.md, START_HERE.md, STATUS.md enthalten zusätzlich je die Cloud-Validierungseinleitung; keine entfernten ursprünglichen Abschnitte. Inhaltlich geprüft. [Analyse](difference-analysis.json) ist historischer maschineller Vorbefund |
| Remote-Baum vor diesem Nachweispaket | 225 Dateien, 106.513.353 Byte auf 529c6e5; gegenüber der 215er-Basis 10 zusätzliche Bootstrap-/Referenz-/Nachweisdateien |
| Fünf weitere Arbeitsordner | 358 Dateien, 108.828.580 Byte inventarisiert; 67 Kandidaten mit 61.269.518 Byte ergänzend verschlüsselt gesichert |
| Fünf historische Download-ZIPs | 83.623.821 Byte, 352 Mitgliedsdateien/184.023.468 Byte unkomprimiert; 280 Vergleichskandidaten ergänzend gesichert |
| Entscheidungsbilder | 11 unveränderte PNGs, 8.382.623 Byte; Online-ZIP 8.289.104 Byte mit SHA-Manifest |
| Privates Backup | 528.682.206 Byte verschlüsselt (~0,529 GB), 16 Serverteile, vollständige Rückprüfung bestanden |

Die Umfänge überlappen und werden nicht zu einer erfundenen globalen Datei-/GB-Zahl addiert. Die historischen Kandidaten sind anhand SHA-256 gegen die Basis und erste Archivschicht bestimmt; verschachtelte Archive und fachliche Herkunft nicht vollständig abgeglichen. [Ordnerliste](inventory-extra/files.json), [Archivmitglieder](inventory-extra/archive-entries.json), [Archivliste](inventory-extra/archives.json). `SUMMARY.json` enthält den zeitlich früheren Vor-Upload-Inventarstatus; für Sicherungsstatus gilt dieser Bericht plus Rücktest.

Die 215 aktiven Quellen liegen normal unter app/ und anderen Quellpfaden in GitHub, nicht nur im ZIP. Das alte ZIP bleibt als geprüfter Transportnachweis. Historische Ergänzungen bleiben separat erhalten; keine blinde Übernahme in die App.

## 2. Lokaler Git-Stand

Letzte Nachprüfung: HEAD `3b2ac03d213ac913bcc61520b595f97dde6aa072` auf `task/g27-02-workshop`, 9 lokale Commits. Diese 9 Commit-IDs sind in der abgerufenen aktuellen Remote-Entwicklungshistorie nicht enthalten; ihr App-Inhalt wurde über den geprüften Transport materialisiert, die Originalhistorie liegt im verschlüsselten source-history.bundle. Keine Gleichsetzung von gesichert mit gemergt.

Stashes: **0**. Aktuelle relevante Arbeitsbaumreste: **1 geändert** (`STATUS.md`), **1 untracked** (`CLOUD-SICHERUNG-PRUEFUNG.md`). Beide Inhalte sind in der Sicherung/Quellübergabe bewahrt; kein Original überschrieben. Zwei lokale Worktrees, beide auf 3b2ac03; vier lokale Branches. Remote und lokale Branches gleichen Namens können unterschiedliche Historien haben. Metadaten im privaten Sicherungspaket erhalten.

## 3. Datenbanken und privater Rücktest

| Datenbank | Konsistentes Backup | Zweck / Bestand | Rücktest |
|---|---:|---|---|
| workshop.sqlite | 6.766.592 B | 7 Produkte, 17 Revisionen, 4 Importzuordnungen | SHA und integrity_check ok |
| profiles.sqlite | 28.672 B | 2 Profile, 2 Revisionen, Einstellungen | SHA und integrity_check ok |
| design-assets.sqlite | 10.235.904 B | 2 Originalquellen, 3 Designassets | SHA und integrity_check ok |

Zusammen 17.031.168 Byte. Keine bloß entbehrlichen Testdaten: individuelle Produktstände, Original-PDF/SVG und Revisionen erforderlich. SQLite-Backup-API verwendet; ursprüngliche Dateizeit/Größe kann wegen WAL vom konsistenten Backup abweichen. [Inventar mit Zeitpunkt, SHA und Tabellenzahlen](database-inventory-20261003.json).

Plesk-Ablage außerhalb des Webroots. Alle 16 Teile aus Serverdownloads geprüft, voller age-Hash korrekt, Entschlüsselung bestanden, 99 Ergänzungsmanifestdateien plus 302 Dateien des eingebetteten Basisarchivs geprüft. **Serverbackup-Rücktest BESTANDEN; Ausführung des Restores lokal isoliert. Cloudruntime-DB-Restore NICHT BESTANDEN / NOCH NICHT AUSGEFÜHRT.** [Maschinenlesbarer Beleg](SERVER-BACKUP-VERIFICATION.json), [genauer Wiederherstellungsweg](WIEDERHERSTELLUNG.md). Ein abgebrochener Sammel-ZIP-Download wird ausdrücklich nicht als gültiges ZIP gezählt; alle 16 vollständigen Payloadteile wurden dennoch verifiziert.

Schlüsselablage: Nutzer bestätigt vom Laptop unabhängig erreichbaren synchronisierten Passwortmanager; keine Einsicht durch Agenten, kein Schlüssel in GitHub/Chat. Unabhängige Wiederherstellung weiterer Zugänge bleibt offen.

## 4. Cloudlauf, Wissen, Konten und Schutz

- **Cloud-Quelltest BESTANDEN:** frisches Verzeichnis und separater Checkout in bestehender Linux-Cloudmaschine, ausschließlich GitHub-Quellen. 137 Tests, 0 Fehler, 0 Skips; Build bestanden, 76 Ressourcen/1 Modell; HTTP- und Host/Origin/CSRF-Prüfungen bestanden. [Detaillierter Bericht](CLOUD-VALIDIERUNG-529c6e5.md). Keine UI-/Maschinen-/Bestellabnahme daraus ableiten.
- Umgebung **gravuru-2027 veröffentlicht**, Sichtbarkeit „Nur ich“. Separater Neustartversuch landete in Scratch ohne Repo und wurde abgebrochen. Neue veröffentlichte Umgebung: **NOCH NICHT ERFOLGREICH GETESTET**. Browserliste zeigte „Unbekanntes Repository“ und keinen passenden Task-Start; Zuordnung/Auswahl muss gelöst werden. [Konkreter Folgeauftrag](NAECHSTER-CLOUD-TEST.md).
- [34 Entscheidungen](ENTSCHEIDUNGEN-REGISTER.md) und 11 Bildreferenzen dauerhaft zugeordnet. Bestätigung, Vorschlag, offene Frage und Umsetzung unterschieden. Vollständige frühere Chatrekonstruktion nicht bewiesen; endgültige Schriften, einzelne mobile Details, genaue Produktions-/Materialprofile bleiben offen.
- Zweiter OpenAI-Account **Chris Open AI: NICHT GETESTET**. Kein gemeinsamer Chat als Übernahmenachweis.
- CI **VORBEREITET**, nicht aktiv; keine Produktion. GitHub **Free tatsächlich geprüft**, alle vier Branches `protected:false`. Keine Tarifänderung. Unbeabsichtigte Produktionsänderungen sind dadurch nicht technisch ausgeschlossen. [Branch-/Zugangsstatus](BRANCH-UND-ZUGANGSSTATUS.md).

## 5. Antworten A–F

| Frage | Urteil |
|---|---|
| A – Laptop zerstört: einzigartige Datei verloren? | Für den ausdrücklich geprüften Sicherungsumfang keine verbleibende ungesicherte Datei bekannt. Globale Vollständigkeit aller historischen/temporären Quellen nicht bewiesen; daher kein uneingeschränktes Nein. |
| B – Chat weg: Wissen verloren? | 34 Regeln, Plan und 11 Referenzen gesichert; unklare Entscheidungen gekennzeichnet. Vollständigkeit jedes früheren Chats nicht bewiesen. |
| C – Frischer Cloudagent kann entwickeln? | Quellinstallation/Tests/Build in frischer Cloudkopie bestanden. Neustart der veröffentlichten Umgebung und nahtlose private Datenübernahme offen. |
| D – Weiterer OpenAI-Account? | Noch nicht getestet. |
| E – Wichtige private Daten gesichert/wiederherstellbar? | Inventarisierte drei DBs, Historie, Originale und Zusatzarchive verschlüsselt online und lokal aus Serverbytes wiederhergestellt. Unabhängiger Schlüssel-/Zugangsbezug und Cloudruntime-Restore offen. |
| F – Production geschützt? | Nicht angefasst, nicht freigegeben. Technischer vollständiger Schutz mangels Branchregeln/ungeprüfter externer Bindungen nicht bestätigt. |

## 6. Genau nächste Schritte

1. Neue Aufgabe explizit mit der veröffentlichten gravuru-2027-Umgebung verbinden; Repo-Zuordnung klären und den vorbereiteten Quell-/Vorschaunachweis ausführen.
2. Unabhängigen Plesk-/Keyzugang sicher bereitstellen und die 3 aktuellen SQLite-Backups in einer isolierten Cloud-Datenablage wiederherstellen; echte IDs/Revisionen prüfen.
3. Chris Open AI meldet sich separat an, liest denselben Testbranch/Commit und führt den unabhängigen Test aus.
4. Historische 67 Datei- und 280 Archivmitgliedskandidaten fachlich mit dem aktuellen Quellstand abgleichen; zusätzliche einzigartige Funktion/Daten nur gezielt integrieren. Verschachtelte Quellen und offene Wissenslücken abschließen.
5. Noch notwendige Zugangsnamen/Recovery-Orte prüfen und eine wirksame Schutzlösung festlegen. Tarifänderung, CI-Aktivierung oder Main-Merge nur ausdrücklich freigeben; Produktion weiter gesperrt behandeln.

LOCAL-ONLY CRITICAL FILES: 0 bekannte im ausdrücklich geprüften Sicherungsumfang; global nicht abschließend bestimmbar

UNVERIFIED SOURCES: global nicht abschließend bestimmt; 67 Datei- und 280 Archivmitgliedskandidaten fachlich noch ungeprüft (überlappend)

UNINTEGRATED CHANGES: 9 lokale Commit-IDs nicht in Remote-Historie, aber verschlüsselt gesichert und aktiver Inhalt materialisiert; zusätzliche historische Unterschiede nicht abschließend gezählt

LAPTOP KANN ENDGÜLTIG AUSGESCHALTET WERDEN:
NEIN
