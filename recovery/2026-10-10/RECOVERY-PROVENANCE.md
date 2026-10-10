# Wiederherstellung am 10.10.2026

Aktuelle Aufgabe: sichern, automatisch installierbar machen und isoliert prüfen. Keine Live-Umschaltung, keine Änderung der bestehenden Werkstatt. Historische Freigaben in älteren Dokumenten sind keine Anweisung für diesen Sicherungslauf.

## Tatsächlich erreichbare Umgebung

- Verwaltete Cloud-Instanz `ccarenv_b64_Y2NhcmVudl8xNjQ2ZWNjZjE3NmM4MTkxYjM3ZDhhMzgzMmM2Yzk0MA`, Debian GNU/Linux 13.6, Linux x86_64; Arbeitsverzeichnis `/workspace`.
- Startkopie `/workspace/gravuru-2027`, Branch `work`, Commit `3ff2c2f8e7cb2565f60bd016f73a99ff6520152b`, 17 versionierte Dateien; keine modifizierten oder unversionierten Dateien. Diese Kopie wurde nicht auf einen anderen Stand zurückgesetzt.
- Arbeitskopie für die Sicherung: `/workspace/gravuru-restored`, Branch `task/full-backup-install-20261010`.
- Node 24.19.0, npm 11.9.0, Python 3.12.14. Cloud-Zustand nach Start laufend/verbunden, Netzwerkrichtlinie zunächst enforced/unrestricted; spätere Revision 3 meldete unknown. Tatsächliche GitHub-/Plesk-HTTPS-Zugriffe separat nachgewiesen. Keine Konfiguration der Cloud verändert.
- Plesk-Anmeldevariablen waren bereitgestellt; Werte nicht ausgegeben oder ins Repository übernommen.

## Git und neuere Arbeit

`main` stand weiterhin auf `3ff2c2f`. Die Produktbasis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70` ist ein Vorfahr von `d8a09447dba5acdce285f0f6584ee2eb067a0de8`: 14 zusätzliche Commits, 109 geänderte Dateien. Alle 113 beim Abruf erreichbaren Branchspitzen sind im vorhandenen Sicherungscommit `0b095e82345249e5af7915bb111d25c1246f18f0` enthalten. Dessen Produktbaum war dennoch auf `a2af162` eingefroren. Historien-Erhalt ist nicht dasselbe wie Funktionsintegration.

Über den Plesk-Dateimanager wurde ausschließlich lesend das vorhandene private Git-Bundle `gravuru-memorial-6f384f4-20261009.bundle` heruntergeladen: 28.668.567 Bytes, SHA-256 `2d7dc3add4c3f5209dd6a3c2a2a6fb1f6ec6b5c4c9f82c64030de867d95eeed7`. Die Prüfsumme entspricht exakt dem Nachweis aus dem früheren Chat. `git bundle verify` bestanden. Voraussetzung `d8a0944` erfüllt; wiederhergestellter Commit `6f384f4da4f0e5f43f67de73f6f89e596dd6ccd3` enthält 76 gegenüber `d8a0944` geänderte Dateien. Der Merge mit dem alten Sicherungsbranch erhält sämtliche Elternhistorien und exakt den neueren Produktbaum; keine alte Variante wurde darüberkopiert.

Der wiederhergestellte Quellbaum umfasst 1.093 Dateien und 388.376.857 Bytes: App 436, Dokumente/Berichte 489, Lieferpakete 50, Betrieb 26, Skripte 58, Wurzeldateien 34. `SOURCE-FILES.json` enthält Dateipfade und SHA-256; `CONTENT-CHECK.json` dokumentiert Archiv-/Inhaltsprüfung. Ressourcen in ZIPs wurden einschließlich verschachtelter Archive auf CRC, bekannte Geheimnismuster und SQLite-Signaturen geprüft. Das ist keine Garantie gegen jede denkbare vertrauliche Information.

## Jüngste Dokumentation aus dem verlorenen Chat

Im Chat „gravuru-2027 NEU“ ist der spätere Commit `c64c197a27de09cbbb54b70817b38556742d1dea` protokolliert. Sein Git-Objekt und das Original-ZIP sind hier nicht vorhanden. Die vollständigen Dateidiffs für `STATUS.md`, `docs/reviews/CLAUDE-AUFTRAG-20261009.md`, `docs/reviews/AENDERUNGEN-UND-PRUEFLUECKEN-20261009.md` und `scripts/build-claude-review.py` waren lesbar und wurden in Reihenfolge wieder angewandt. `github-auth-observation-20261009.json` wurde aus dem vollständig protokollierten Erstellungsbefehl rekonstruiert und als Rekonstruktion gekennzeichnet. Dies ist kein behaupteter byteidentischer Wiederfund des ursprünglichen Commits oder ZIPs. Der damalige Produktcode blieb auf `6f384f4`.

## Älteres Erweiterungsprojekt

`Chris83638w/gravuru-shopify` wurde als private lokale Spiegelkopie abgerufen: 15 Branches, 27 Git-Refs, HEAD `b564422edadaf56a27a09f99e1140a546e5e7145`. Alle erfassten Refs sind in dessen bestehendem Branch `backup/account-recovery-20261010` verankert. `LEGACY-REFS.json` hält die IDs fest. Das zusätzliche Quellarchiv `legacy-extension-sources-b564422.zip` sichert 34 Dateien der Storefront-/Preis-Erweiterungen einschließlich der 14 zuvor vermissten Theme-Assets und des Preisfunktions-Quellcodes. Keine WASM-Datei in den abgerufenen Git-Historien gefunden. Identität mit der aktuell veröffentlichten Shopify-Erweiterung nicht nachgewiesen; kein Deployment daraus ausgeführt.

Vom Plesk-Ordner `private/gravuru-theme-recovered-65VDmX` sind außerdem fünf eingebettete Theme-Dateien und deren damaliges Herkunftsmanifest gesichert. Download-Dateigrößen geprüft; SHA-256 in `theme-download-receipt.json`.

## Private Daten und nicht erreichbare Cloud-Dateien

- `/workspace/library-files`, `/workspace/shared/downloads` und `/workspace/scratch` waren leer. Keine hochgeladenen Altdateien, keine angehängten Arbeitsbäume oder Artefakte dieser Aufgabe vorhanden.
- Die alten `/tmp/codex-cloud-agent-…/app_servers/thread_service/workspace`-Verzeichnisse, `/workspace/gravuru-private`, `/workspace/gravuru-review-20261009`, `/workspace/artifacts` und die alten Testausgaben sind hier nicht als frühere Inhalte verfügbar. Lesbare Chatprotokolle geben keinen Zugriff auf deren damaliges Dateisystem.
- Das alte ZIP `/workspace/gravuru-review-20261009/gravuru-2027-unabhaengige-pruefung.zip` (historische SHA-256 `0e1ceda6c05d2e4c92f58a53fe620e8ba8258d284c0fd1df261b5b9aaf684787`) wurde nicht wiedergefunden. Seine vollständige ursprüngliche Bytefolge wird nicht als gesichert behauptet.
- Lokale Windows-Dateien früherer Chats sind nicht eingebunden. Nicht gepushte und nicht im wiedergefundenen Bundle/Chatdiff enthaltene Dateien können nicht zugesichert werden. Gelöschte oder nicht sichtbare Chats sind nicht vollständig inventarisierbar.
- Auf Plesk per Dateiliste bestätigt: private Operator-/Händlerdatenordner, Python-Umgebungen, Konfigurationen und Token-Datei sowie weitere private Shopify-Bestandsabzüge. Geheimnisdateien und Datenbanken wurden nicht geöffnet, kopiert oder nach GitHub übertragen. Keine konsistente Datenbanksicherung erstellt; diese Daten verbleiben außerhalb von Git. Nicht jeder private Bericht wurde gelesen: Rohberichte können Token-/Kundendaten enthalten.
- Bestehende Live-Werkstatt, Datenbanken, Domains, App-Konfigurationen und Dienste wurden nicht geschrieben, neugestartet oder umgeschaltet. Nur Anmeldung, Dateilisten und gezielte Download-GETs auf Plesk.

## Zugriffsfehler und angepasste Wege

Der erste Git-Abruf scheiterte am im Sandbox-Netz nicht erreichbaren Proxy. Mit ausdrücklich freigegebenem Netzwerkzugriff erfolgreich; kein identischer erfolgloser Wiederholungsversuch. Der Browser scheiterte an CA-Vertrauen; ein einzelner Import der bereitgestellten Proxy-CA half nicht. Der breitere Import aller System-CAs wurde automatisch wegen dauerhafter Vertrauensänderung abgewiesen und nicht durchgeführt. Stattdessen erfolgreicher Python-HTTPS-Client mit vorhandener System-CA und aktiver TLS-Prüfung. Keine Abschaltung der Zertifikatsprüfung.

Die Sandbox legt synthetische `.git`-Marker in Schreibwurzeln an. Dadurch wurde die korrekte Sperre privater Daten innerhalb von Git in einem Test ausgelöst. Die Schutzfunktion blieb unverändert; erneuter Test außerhalb dieser Sandbox-Marker in eigener temporärer Ablage erfolgreich. Ein erster Testlauf ohne passenden Loopback-Zugriff wurde abgebrochen; danach begrenzter Lauf mit korrektem Netzwerkzugriff. Alle diese Einschränkungen betreffen die Testumgebung, nicht einen behaupteten Produktfehler.
