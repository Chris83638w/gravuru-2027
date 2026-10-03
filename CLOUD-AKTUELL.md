# Gravuru 2027 – aktueller Cloud-Einstieg

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
