# Gravuru 2027 – aktueller Cloud-Einstieg

## Aktuell: Dashboard-Neuaufbau fortgesetzt – 04.10.2026

Maßgeblicher Einstieg: [CLOUD-HANDOVER.md](CLOUD-HANDOVER.md). Aktiver Aufgabenbranch `task/dashboard-customer-fields-20261004`, Basis `1b4626eab6cc2e7d22f815754583cc678e57d558`. Neu: ausdrückliche Text-/Fotofelder für importierte Designs mit Vorschau, mm-Einstellungen, runden Farben, Kundenrechten und unveränderlichen Produktrevisionen. 143 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Desktop-/Mobil-Browserablauf geprüft. [Nachweis und Bilder](docs/dashboard-20261004/PRUEFUNG.md).

Der vorhandene G27-02-Neuaufbau bleibt Grundlage. M01/M02 und die dokumentierten Änderungen gelten gemeinsam; die Gesamtansichten sind noch nicht vollständig umgesetzt. Nächster fachlicher Schritt: bestehende Produktübersicht mit echten Konfigurationsvorschauen nach M01 weiterentwickeln. Keine neue Migrations-/Serverplanung und keine Work-Verknüpfung als Voraussetzung. Private Bestandsdaten sind hier weiterhin nicht angebunden und für dieses Teilstück nicht erforderlich.

Die folgenden Übergabeabschnitte dokumentieren den vorherigen Stand; bei abweichenden nächsten Schritten gilt der aktuelle Einstieg oben.

## Aktueller Cloud-Übergabestand – 04.10.2026

**Cloud-Neustart/Quellabnahme, isolierter Cloud-Restore und GitHub-Leseübergabe bestanden. Der Nutzer hat die Weiterentwicklung ausschließlich in Codex Cloud beauftragt. Eine gemeinsame Serverinstallation ist dafür keine Voraussetzung. Produktion bleibt ungeprüft und nicht freigegeben.**

Fachliche GitHub-Basis: `infra/gravuru-2027-cloud-20261003`, Remote-HEAD am 04.10. geprüft: `f7c3f24db55003c28fec5274dfc5df2736926b6b`. Diese Dokumentübergabe liegt separat auf `infra/cloud-only-handoff-20261004`; kein Merge. Vor weiterer Arbeit aktuellen Remote-HEAD prüfen.

- [Neue Mikail-Cloud-Abnahme](https://github.com/Chris83638w/gravuru-2027/blob/5e40517a85a07d7226989b3863ce025f382aaa20/docs/cloud-migration-20261003/CLOUD-ACCOUNT-A-TEST.md), Marker `5e40517a85a07d7226989b3863ce025f382aaa20`: 137 bestanden, 0 Fehler, 0 Skips; Build 76 Ressourcen/1 Modell; geschützte HTTP-Routen sowie Host/Origin/CSRF geprüft. Die Auswahl Cloud → gravuru-2027 ist durch den Nutzerscreenshot belegt.
- [Chris' isolierter Cloud-Restore](docs/cloud-migration-20261003/CLOUD-RESTORE-NACHWEIS-20261004.md), Originalnachweis `e624833aecf6382f9b5edb4c432eb4e7c81a5cb2`, abgeschlossen 04.10.2026 um 14:13 Europe/Berlin: 16 Teile, 528682206 verschlüsselte Bytes, Archiv-/Manifest-/DB-Prüfungen bestanden. Werkstatt: 7 Produkte/17 Revisionen/4 Importitems; Profile: 2 Profile/2 Profilrevisionen/1 Bibliothekseinstellung/5 Einstellungsrevisionen; Designressourcen: 2 Originalquellen/3 Assets. Keine alten WAL-/SHM-Dateien übernommen.
- Mikail hat den Nachweis am 04.10. gegen 14:25 direkt von GitHub gelesen und beide Remote-HEADs sowie AGENTS.md, CLOUD-AKTUELL.md und STATUS.md geprüft. Dokumentierte Wissensübergabe bestanden; kein Zugriff auf Chris' private Laufzeitdateien.

Die vorstehenden Tests wurden für diese Dokumentübergabe nicht wiederholt. Alte Aussagen »Cloud-Restore/Neustart offen« sind für diese bestandenen isolierten Prüfungen überholt. Dauerhafte gemeinsame private Datenablage, Zugriff beider Konten, App-Anbindung und visuelle Abnahme bleiben offen.

## Ab jetzt ausschließlich Cloud

Fester Mikail-Einstieg: **Gravuru 2027 – Cloud – Mikail**, angepinnt, Chat `01a101bb-342f-750b-b481-82c3c3a5c072`. Erfolgreicher Chris-Cloud-Chat: [Ausführen](https://chatgpt.com/local/01a106a7-64fd-7184-9d6f-f597e2f6f078), `01a106a7-64fd-7184-9d6f-f597e2f6f078`. Chris' alter Chat »Gravurro 2027 Vista: aktueller Stand«, `01a101c8-c6b7-76b2-ad67-4247a489d074`, hat keine Secret-/Hostbindung und widerlegt den neuen erfolgreichen Restore nicht.

Alle mögliche Entwicklung und Ausführung erfolgt ausschließlich in Codex Cloud, unabhängig vom Laptop. GitHub hält den dokumentierten Code-/Entscheidungsstand. Pro Aufgabe eigener Branch; vor Konto-/Chatwechsel autorisierte Änderungen committen/pushen und Iststand, tatsächlich ausgeführte Prüfungen, Grenzen und genau nächsten Schritt dokumentieren. Keine automatische Chatgedächtnissynchronisierung. Keine neue Scratch-/Umgebungs- oder Sicherungssuche als Einstieg; keine alten Archive über den aktiven app/-Quellbaum entpacken. Private Daten und Secrets niemals nach GitHub oder in veröffentlichte Snapshots übernehmen; keine Laptopdateien voraussetzen.

Chris' restaurierte Dateien liegen privat nur in seiner laufenden Aufgabe und sind von Mikails Aufgabe nicht als erreichbar bestätigt. Die Cloud-VM ist keine dauerhafte gemeinsame Datenbank. Laut [offizieller Cloud-Dokumentation](https://learn.chatgpt.com/docs/environments/cloud-environments) besteht standardmäßig Wiederherstellbarkeit bis sieben Tage nach Aktivität; Computer-/Browserbedienung ist aktuell nicht unterstützt. Keine vollautomatische visuelle Abnahme versprechen. Der wiederherstellbare verschlüsselte Serversnapshot ist kein gemeinsamer laufender Schreibdatenbestand.

**Aktueller Auftrag: Cloud-Entwicklung mit Work vorbereiten.** Die spätere Nutzerentscheidung hebt die bisherige Entwicklungspause auf. Die separate Planung auf `infra/private-runtime-preparation-20261004` wird nicht weiterverfolgt oder installiert. Für diesen Entwicklungseinstieg sind keine Änderungen an gravuru.de, der bestehenden Werkstatt, Plesk oder Shopify erforderlich. Eine dauerhaft gemeinsame private Datenablage bleibt eine separate offene Aufgabe; Entwicklung mit synthetischen Daten kann bereits in der vorhandenen Cloud erfolgen. Chris' private restaurierte Daten werden dabei nicht als hier verfügbar ausgegeben.

### Einstieg für Work

Repository: `Chris83638w/gravuru-2027`. Einstieg mit aktueller Übergabe: `infra/cloud-only-handoff-20261004`; dieser enthält den unveränderten G27-02-App-Code der geprüften Basis `f7c3f24db55003c28fec5274dfc5df2736926b6b`. Für fachliche Änderungen davon einen eigenen Aufgabenbranch ableiten. `main` ist noch der historische Stand.

Gewünschte Aufteilung: Work für Gestaltung, Bilder und Abstimmung; Codex Cloud für Repository, Implementierung und Prüfungen. GitHub hält die gemeinsame dokumentierte Übergabe. Diese Zuordnung ist ein Arbeitsauftrag, noch kein Nachweis einer technischen Work-Verknüpfung. Die verfügbaren Werkzeuge dieses Chats können weder die Work-Quellenauswahl bedienen noch eine Work-Aufgabe an diese Cloud-Umgebung binden. Keine automatische Synchronisierung oder laptopunabhängige Ausführung allein aus einer ausgewählten Quelle ableiten.

**Genau nächster Schritt:** in Work die tatsächlich angebotene Quellen-/Ausführungszuordnung prüfen und, sofern unterstützt, die bestehende Codex-Cloud-Umgebung verwenden. Vor Änderungen muss die ausführende Aufgabe Cloud-Laufzeit, Repository, Branch und vollständigen Commit bestätigen und AGENTS.md/START_HERE.md lesen. Falls Work nur lesenden Quellzugriff bietet, bleiben Implementierung und Tests in der bestehenden Codex-Cloud-Aufgabe; Entwürfe werden ausdrücklich übergeben. Kein neuer Server und keine neue Umgebung als Umweg.

Nächstes fachliches Paket nach dieser Zuordnung: explizite Kundenfelder und austauschbare Fotobereiche für importierte Designs auf der vorhandenen G27-02-Basis. Bestehende Produkt-/Profilrevisionen, Einzel- und Serienimport erhalten. Unveränderte Funktionen nicht als neu gebaut oder neu geprüft ausgeben.

Der Nutzerscreenshot zeigt den älteren G27-01-Stand mit 57 Tests (»Unser Anfang«, sechs Sockel, zwei Größen, Text/Farbe/Foto). Die spätere G27-02-Basis mit Werkstatt, Profilen, SVG/PDF-Designerersatz und Excel-Stapelanlage sowie 137 Tests bleibt maßgeblich; kein Rücksetzen auf G27-01. Exakte visuelle Gleichheit des restaurierten Standes zum Screenshot ist ungeprüft. Fachlich als nächstes Paket: explizite Kundenfelder/Fotobereiche in importierten Designs. Beliebige Pfad-PDFs sind nicht automatisch editierbar. Materialien/Formen/Bohrbilder, vollständige Shopify- sowie Druck-/Gravurstrecke bleiben offen.

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
