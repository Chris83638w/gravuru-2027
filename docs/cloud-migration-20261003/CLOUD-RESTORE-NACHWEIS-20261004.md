# Gravuru 2027 – isolierter Cloud-Restore und Übergabe

**Ergebnis: bestanden. Keine Produktionsfreigabe.** Dieser Nachweis dokumentiert die isolierte Wiederherstellung der privaten Sicherung in einer Cloud-Aufgabe. Er wurde neu aus aggregierten Prüfergebnissen geschrieben; private Rohberichte, Datenbanken, Zugangsdaten und Kundeninhalte sind nicht Bestandteil dieses GitHub-Nachweises.

## Herkunft und Zeitpunkt

- Repository: [Chris83638w/gravuru-2027](https://github.com/Chris83638w/gravuru-2027).
- Fachlicher Basisbranch: `infra/gravuru-2027-cloud-20261003`.
- Vollständiger geprüfter Quellcommit: `f7c3f24db55003c28fec5274dfc5df2736926b6b`.
- Tatsächlich ausgecheckter Branch beim Restore: `work`, mit genau diesem HEAD. Vier bereits vorhandene Dokumentänderungen blieben unverändert.
- Cloud-Aufgabe: `01a106a7-64fd-7184-9d6f-f597e2f6f078` (»Ausführen«).
- Abschluss der Restoreprüfung: **04.10.2026, 14:13:20 Uhr Europe/Berlin** (`2026-10-04T12:13:20.567156+00:00`).
- Datenquelle: ausschließlich die geschützte Serversicherung, per HTTPS in dieser Cloud-Aufgabe übertragen. **Keine Laptopdateien als Datenquelle.**
- Prüfgrundlagen im genannten Quellcommit: [Wiederherstellungsanleitung](WIEDERHERSTELLUNG.md), [Server-Prüfliste](SERVER-BACKUP-VERIFICATION.json) und [Datenbankinventar](database-inventory-20261003.json).
- Übergabebranch: `test/cloud-restore-20261004`, in einem separaten Worktree direkt aus dem oben genannten Quellcommit angelegt. Dieser Übergabeschritt enthält ausschließlich diese Markdown-Datei.

## Transfer, Entschlüsselung und Archive

Der erneute Manifesttest lieferte anonym HTTP **401** und mit Anmeldung HTTP **200**, jeweils am Endhost `gravuru.de`. Sessionproxy, TLS-Prüfung und Cloud-Hostliste blieben unverändert. Transferweiterleitungen wurden nicht verfolgt. Das Manifest stimmte mit allen 16 Teilreferenzen der committed Server-Prüfliste überein.

Alle **16 Teile** wurden einzeln nach Größe und SHA-256 geprüft und in Nummernreihenfolge zusammengefügt: **528682206 verschlüsselte Bytes**. Die Entschlüsselung erfolgte mit dem offiziellen `age v1.2.1`; der Wiederherstellungsschlüssel wurde über einen flüchtigen Linux-Speicherdeskriptor übergeben und nicht dauerhaft als Datei abgelegt.

| Geprüftes Archiv | Bytes | Bestätigter SHA-256 |
|---|---:|---|
| Verschlüsseltes Gesamtarchiv | 528682206 | `961cf4655e4a25c201324c72782df617acb61c34fb5a40f315549a8643d03a39` |
| Entschlüsseltes ergänzendes ZIP | 528552966 | `858f93286de4adb02e50ed5fc400aee81c03288f1150abc4301cf7bda7ad62e1` |
| Eingebettetes historisches ZIP | 365154964 | `84caae721f88d409a54cea98692c4a21f28d3ff8db0ff163ffe88f3e18d7f434` |

Bestanden sind die CRC-Prüfung aller ZIP-Mitglieder, Größen und SHA-256 aller **99 ergänzenden Manifestdateien** sowie aller **302 historischen Manifestdateien**. Keine Manifestdatei fehlt. Sichere Archivpfade und zulässige Dateitypen wurden geprüft; keine Pfadausbrüche oder Symlinks wurden extrahiert. **99 + 302 bezeichnet wegen der Verschachtelung keine Anzahl einzigartiger Dateien.**

Das historische ZIP enthält zusätzlich acht Dateien außerhalb seines historischen Manifests:

1. `VERIFICATION.json`
2. `verify-and-restore.py`
3. `state/workshop.sqlite-wal`
4. `state/workshop.sqlite-shm`
5. `state/profiles.sqlite-wal`
6. `state/profiles.sqlite-shm`
7. `state/design-assets.sqlite-wal`
8. `state/design-assets.sqlite-shm`

Diese acht Dateien sind durch den vorgegebenen Gesamtarchiv-SHA-256 und ihre ZIP-CRC abgedeckt, jedoch nicht durch einzelne Einträge des historischen Manifests. Sie wurden nicht in die neue Testdatenablage übernommen; insbesondere **keine alten WAL-/SHM-Dateien**. Ein erster Prüflauf hatte die zusätzlichen Mitglieder wegen einer zu strengen Annahme zur Manifestabdeckung abgewiesen. Nach Korrektur dieser Annahme wurden alle angeforderten Prüfungen bestanden; die erwarteten Hashes wurden nicht verändert.

Das enthaltene `source-history.bundle` wurde separat extrahiert. **`git bundle verify` bestanden**; keine Historie in den Arbeitscheckout importiert und kein Merge durchgeführt.

## Aktuelle Datenbanken

Nur die drei konsistenten aktuellen Sicherungen aus `state/` des ergänzenden Archivs wurden gemeinsam in eine neue private Cloud-Testablage übernommen. Verzeichnisse haben Modus `0700`, Datenbanken und Prüfberichte `0600`. Bestehende Datenablagen wurden nicht überschrieben. Die SQLite-Prüfungen liefen mit `mode=ro&immutable=1`; die Datenbankhashes blieben anschließend unverändert.

| Datenbank | Bytes | Bestätigter SHA-256 |
|---|---:|---|
| `workshop.sqlite` | 6766592 | `c205c245a6fd57edbf37025ad69a02f80248e610fdb181e1193f5840a08ca88d` |
| `profiles.sqlite` | 28672 | `bf31afc26905a537bb3ca36faa8619c4bed0b641483d01b58ef87692f982aba1` |
| `design-assets.sqlite` | 10235904 | `b1b89e8e6f6400057f841683186c06bef75b6c2b9e5a3e22b6e8c23b6d63f2a0` |

| Datenbank | Bestätigte Tabellenzahlen | SQLite-Ergebnis |
|---|---|---|
| Werkstatt | `products`: 7; `product_revisions`: 17; `import_items`: 4 | `integrity_check = ok`; keine Fremdschlüsselverletzung |
| Profile | `profiles`: 2; `profile_revisions`: 2; `profile_library_settings`: 1; `profile_settings_revisions`: 5 | `integrity_check = ok`; keine Fremdschlüsselverletzung |
| Designressourcen | `design_sources`: 2; `design_assets`: 3 | `integrity_check = ok`; keine Fremdschlüsselverletzung |

Zusätzlich bestätigt: konsistente Produkt-/Profil-IDs und lückenlose Revisionsfolgen bis zum aktuellen Stand; gültige Veröffentlichungs- und Importbezüge; passende aktuelle Profileinstellungen zur letzten Einstellungsrevision; korrekte Quell-, Vorschau- und Asset-ID-Hashes der Designressourcen. Kundeninhalte oder konkrete fachliche Datensatz-IDs werden hier nicht veröffentlicht.

Das Inventar enthält keine separate Soll-Liste einzelner IDs und Revisionen. Die Bestätigung stützt sich auf die exakten vollständigen Datenbankhashes, die Inventar-Tabellenzahlen und die zusätzlichen internen Konsistenzprüfungen; eine nicht vorhandene Soll-Liste wurde nicht vorgetäuscht.

## Frühere Abnahme und verbleibende Grenzen

**137 Tests und Build mit 76 Ressourcen / 1 Modell** gehören zum früheren [Account-A-Nachweis am Commit `5e40517a85a07d7226989b3863ce025f382aaa20`](https://github.com/Chris83638w/gravuru-2027/blob/5e40517a85a07d7226989b3863ce025f382aaa20/docs/cloud-migration-20261003/CLOUD-ACCOUNT-A-TEST.md). Sie wurden in diesem Restore- und Übergabeschritt **nicht erneut ausgeführt**.

Der Restore ist ein isolierter Cloud-Wiederherstellungsnachweis. Die Testablage ist **keine dauerhafte und keine automatisch zwischen Konten synchronisierte Datenbank**. Dauerhafte gemeinsame Datenablage, Zugriff des zweiten Kontos auf diese Daten und visuelle Abnahme bleiben offen. Die Datenbanken sind dadurch noch nicht in eine gemeinsam bereitgestellte App integriert. Keine Produktion, kein Shopify-/Plesk-Schreibzugriff und kein veröffentlichter Snapshot mit Klartextdaten.

## Fortsetzung für beide Nutzer

1. Den **aktuellen** Branch `infra/gravuru-2027-cloud-20261003` aus GitHub als fachliche Arbeitsbasis verwenden und den tatsächlich ausgecheckten vollständigen HEAD mit `git rev-parse HEAD` prüfen und dokumentieren. Dieser Testbranch enthält nur den Nachweis, keine fachliche Weiterentwicklung.
2. Vor der Fortsetzung diesen Nachweis auf `test/cloud-restore-20261004` sowie [CLOUD-AKTUELL.md](https://github.com/Chris83638w/gravuru-2027/blob/infra/gravuru-2027-cloud-20261003/CLOUD-AKTUELL.md), [AGENTS.md](https://github.com/Chris83638w/gravuru-2027/blob/infra/gravuru-2027-cloud-20261003/AGENTS.md) und [STATUS.md](https://github.com/Chris83638w/gravuru-2027/blob/infra/gravuru-2027-cloud-20261003/STATUS.md) auf dem aktuellen fachlichen Basisbranch lesen. Ältere Aussagen »Cloud-Restore offen« werden für diese konkrete isolierte Aufgabe durch diesen datierten Nachweis ergänzt; die genannten offenen Grenzen bleiben bestehen.
3. Eigene Arbeitsbranches für weitere Aufgaben verwenden. Vorhandene Änderungen und private Daten nicht überschreiben. Keine alten Archive über `app/` entpacken.
4. Vor jeder Übergabe die autorisierten Änderungen nach GitHub pushen und den tatsächlichen Commit, die ausgeführten Prüfungen, offene Grenzen und genau den nächsten Schritt dokumentieren.
5. **Gemeinsames Wissen kommt aus GitHub, nicht automatisch aus getrennten Chats.** Beide Konten lesen denselben Nachweis im Repository; daraus folgt keine automatische Freigabe oder Synchronisierung privater Laufzeitdaten.

Nächster offener Übergabeschritt: die dauerhafte gemeinsame private Datenablage und deren Zugriff für beide Konten gesondert festlegen und prüfen; danach die visuelle Abnahme durchführen. Dieser Nachweis erteilt keine Produktionsfreigabe.
