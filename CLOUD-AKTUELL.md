# Gravuru 2027 – aktueller Cloud-Einstieg

## Nächste Einrichtung konkret vorbereitet – 04.10.2026

Die [Infrastrukturvorbereitung](infra/private-runtime/README.md) auf `infra/private-runtime-preparation-20261004` enthält den privaten Startadapter, Dienst-/Zugangsvorlagen und lesende Serverinventur. Sie ist nicht installiert. Sieben neue synthetische Startschutz-Prüfungen bestanden; keine Wiederholung der 137 App-Tests oder des Builds. Der Zugang zur Serververwaltung fehlt in Mikails Aufgabe weiterhin. Nach Bereitstellung dieses Zugangs folgt die Serverinventur, danach die private Installation und gemeinsame Daten-/Browserabnahme. Produktentwicklung bleibt bis zum Migrationsabschluss pausiert.

Chris' Setup- und Restore-Chats gehören laut übermittelten Statusantworten zu seiner Konfiguration; diese muss nicht dieselbe ID wie Mikails Cloud-Aufgabe haben. Ein solcher ID-Unterschied macht die bestandenen Nachweise nicht ungültig.

## Aktueller Cloud-Übergabestand – 04.10.2026

**Cloud-Neustart/Quellabnahme, isolierter Cloud-Restore und GitHub-Leseübergabe bestanden. Vollständige Migration und Produktion noch nicht freigegeben. Produktentwicklung bis zum Migrationsabschluss pausiert.**

Fachliche GitHub-Basis: `infra/gravuru-2027-cloud-20261003`, Remote-HEAD am 04.10. geprüft: `f7c3f24db55003c28fec5274dfc5df2736926b6b`. Diese Dokumentübergabe liegt separat auf `infra/cloud-only-handoff-20261004`; kein Merge. Vor weiterer Arbeit aktuellen Remote-HEAD prüfen.

- [Neue Mikail-Cloud-Abnahme](https://github.com/Chris83638w/gravuru-2027/blob/5e40517a85a07d7226989b3863ce025f382aaa20/docs/cloud-migration-20261003/CLOUD-ACCOUNT-A-TEST.md), Marker `5e40517a85a07d7226989b3863ce025f382aaa20`: 137 bestanden, 0 Fehler, 0 Skips; Build 76 Ressourcen/1 Modell; geschützte HTTP-Routen sowie Host/Origin/CSRF geprüft. Die Auswahl Cloud → gravuru-2027 ist durch den Nutzerscreenshot belegt.
- [Chris' isolierter Cloud-Restore](docs/cloud-migration-20261003/CLOUD-RESTORE-NACHWEIS-20261004.md), Originalnachweis `e624833aecf6382f9b5edb4c432eb4e7c81a5cb2`, abgeschlossen 04.10.2026 um 14:13 Europe/Berlin: 16 Teile, 528682206 verschlüsselte Bytes, Archiv-/Manifest-/DB-Prüfungen bestanden. Werkstatt: 7 Produkte/17 Revisionen/4 Importitems; Profile: 2 Profile/2 Profilrevisionen/1 Bibliothekseinstellung/5 Einstellungsrevisionen; Designressourcen: 2 Originalquellen/3 Assets. Keine alten WAL-/SHM-Dateien übernommen.
- Mikail hat den Nachweis am 04.10. gegen 14:25 direkt von GitHub gelesen und beide Remote-HEADs sowie AGENTS.md, CLOUD-AKTUELL.md und STATUS.md geprüft. Dokumentierte Wissensübergabe bestanden; kein Zugriff auf Chris' private Laufzeitdateien.

Die vorstehenden Tests wurden für diese Dokumentübergabe nicht wiederholt. Alte Aussagen »Cloud-Restore/Neustart offen« sind für diese bestandenen isolierten Prüfungen überholt. Dauerhafte gemeinsame private Datenablage, Zugriff beider Konten, App-Anbindung und visuelle Abnahme bleiben offen.

## Ab jetzt ausschließlich Cloud

Fester Mikail-Einstieg: **Gravuru 2027 – Cloud – Mikail**, angepinnt, Chat `01a101bb-342f-750b-b481-82c3c3a5c072`. Erfolgreicher Chris-Cloud-Chat: [Ausführen](https://chatgpt.com/local/01a106a7-64fd-7184-9d6f-f597e2f6f078), `01a106a7-64fd-7184-9d6f-f597e2f6f078`. Chris' alter Chat »Gravurro 2027 Vista: aktueller Stand«, `01a101c8-c6b7-76b2-ad67-4247a489d074`, hat keine Secret-/Hostbindung und widerlegt den neuen erfolgreichen Restore nicht.

Alle mögliche Entwicklung und Ausführung erfolgt ausschließlich in Codex Cloud, unabhängig vom Laptop. GitHub hält den dokumentierten Code-/Entscheidungsstand. Pro Aufgabe eigener Branch; vor Konto-/Chatwechsel autorisierte Änderungen committen/pushen und Iststand, tatsächlich ausgeführte Prüfungen, Grenzen und genau nächsten Schritt dokumentieren. Keine automatische Chatgedächtnissynchronisierung. Keine neue Scratch-/Umgebungs- oder Sicherungssuche als Einstieg; keine alten Archive über den aktiven app/-Quellbaum entpacken. Private Daten und Secrets niemals nach GitHub oder in veröffentlichte Snapshots übernehmen; keine Laptopdateien voraussetzen.

Chris' restaurierte Dateien liegen privat nur in seiner laufenden Aufgabe und sind von Mikails Aufgabe nicht als erreichbar bestätigt. Die Cloud-VM ist keine dauerhafte gemeinsame Datenbank. Laut [offizieller Cloud-Dokumentation](https://learn.chatgpt.com/docs/environments/cloud-environments) besteht standardmäßig Wiederherstellbarkeit bis sieben Tage nach Aktivität; Computer-/Browserbedienung ist aktuell nicht unterstützt. Keine vollautomatische visuelle Abnahme versprechen. Der wiederherstellbare verschlüsselte Serversnapshot ist kein gemeinsamer laufender Schreibdatenbestand.

**Genau nächster Migrationsschritt:** eine konkret benannte private, dauerhafte Datenquelle samt unterstütztem authentifiziertem Zugangsverfahren für beide Konten bereitstellen und deren Dauerhaftigkeit/Zugriff prüfen; danach alle drei DBs gemeinsam anbinden und die visuelle App-Abnahme durchführen. In Mikails aktueller Runtime (Revision 53) sind keine Secrets, Identitäten oder Runtimevariablen konfiguriert, keine Fähigkeiten ausgewiesen und keine benutzerdefinierten Hosts freigegeben. Vorhandene Cloud-Shellwerkzeuge curl/ssh/sftp ersetzen diese fehlende Zugangskonfiguration nicht. Ein dokumentiertes Werkzeug zum Anlegen/Freigeben einer gemeinsamen persistenten Datenablage ist hier nicht verfügbar. Keine Server-/Plesk-/Shopify-/Produktionsmutation zur Umgehung.

Der Nutzerscreenshot zeigt den älteren G27-01-Stand mit 57 Tests (»Unser Anfang«, sechs Sockel, zwei Größen, Text/Farbe/Foto). Die spätere G27-02-Basis mit Werkstatt, Profilen, SVG/PDF-Designerersatz und Excel-Stapelanlage sowie 137 Tests bleibt maßgeblich; kein Rücksetzen auf G27-01. Exakte visuelle Gleichheit des restaurierten Standes zum Screenshot ist ungeprüft. Fachlich nach Migrationsabschluss: explizite Kundenfelder/Fotobereiche in importierten Designs. Beliebige Pfad-PDFs sind nicht automatisch editierbar. Materialien/Formen/Bohrbilder, vollständige Shopify- sowie Druck-/Gravurstrecke bleiben offen.

## Historischer Cloud-Einstieg – 03.10.2026

Die folgenden Aussagen dokumentieren den damaligen Stand. Für Neustart und isolierten Cloud-Restore gelten die neueren Nachweise oben.

Stand 03.10.2026. **Weiterentwicklung vorbereitet; vollständige Cloud-Migration noch nicht abgenommen. Produktion NICHT FREIGEGEBEN.**

Aktueller Entwicklungsbranch: `infra/gravuru-2027-cloud-20261003`. Geprüfter App-Code: `529c6e5218a3faa9b8786ace7025fe4370a7092f`; spätere Commits ergänzen Referenzbilder und Prüfunterlagen. Den aktuellen Commit mit `git rev-parse HEAD` festhalten. Main ist weiterhin der historische Stand, kein eigenmächtiger Merge.

1. [Abschlussprüfung mit Zahlen und offenen Grenzen](docs/cloud-migration-20261003/ABSCHLUSSBERICHT.md)
2. [Nächster konkreter Cloud-/Accounttest](docs/cloud-migration-20261003/NAECHSTER-CLOUD-TEST.md)
3. [34 Produkt-/Bedienentscheidungen und 11 Originalreferenzen](docs/cloud-migration-20261003/ENTSCHEIDUNGEN-REGISTER.md)
4. [Private Sicherung und Wiederherstellung](docs/cloud-migration-20261003/WIEDERHERSTELLUNG.md)
5. [Branches, Zugänge und vorbereitete CI](docs/cloud-migration-20261003/BRANCH-UND-ZUGANGSSTATUS.md)

Normaler Quellbaum unter `app/`, nicht nur ZIP. Erster frischer Cloud-Quelltest: **137 bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell**. 215-Dateien-Vergleich: 206 bytegleich, 6 nur Zeilenenden, 3 dokumentarische Ergänzungen, 0 fehlend. Historischer [Cloudlaufbericht](CLOUD-VALIDIERUNG-20261003.md).

**Privates Serverbackup geprüft:** 528.682.206 verschlüsselte Byte, 16 Teile vollständig zurückgelesen, Entschlüsselung/Manifeste und 3 SQLite-Restores bestanden. Der Restore lief lokal isoliert; drei DBs sind noch nicht in der Cloud-App integriert. Recovery-Key unabhängig gespeichert laut Nutzerbestätigung. Keine Zugangswerte oder Datenbanken im Repository.

Cloud-Umgebung veröffentlicht („Nur ich“). Neuer Taskstart landete jedoch in Scratch ohne Repo. Der wirkliche Neustart dieser veröffentlichten Umgebung und Konto B („Chris Open AI“) sind offen. Nicht wieder eine falsche Umgebung als Erfolg zählen. GitHub Free/Branches ungeschützt; CI nur vorbereitet.

Anschließend fachlich weiter: G27-02 Kundenfelder für importierte SVG/PDF-Designs, danach Material-/Form-/Bohrmodell. Bereits gebaute Werkstatt, Profile, XLSX und Designimport gezielt weiterverwenden. Druck-/Gravurexport, Shopify-Bestellstrecke und Livebetrieb bleiben eigene offene Abnahmen. AGENTS.md und UMSETZUNGSPAKETE.md beachten.
