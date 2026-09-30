# G27-01 – Übergabepaket

Datei: `GRAVURU-2027-G27-01.zip`.

SHA-256: `97a0e4bee8b0117f4ffa4628ede1394b256f6097f885824319aa91285240290a`.

Quelle: lokaler Commit `51d555e` auf `task/g27-01-runnable-foundation`. Vollständiger aktiver Quellbaum `app/` einschließlich seiner Ressourcen, `package.json`, Start-/Prüfdokumentation und Bauplan. Keine Kundendaten, laufende Datenbank, Zugangsdaten oder erzeugte Vorschau. Historische Referenz-ZIPs sind weiterhin separat im Repository; für den Pilotstart nicht nötig.

Das Archiv wurde frisch in einen separaten Ordner entpackt. Der Build daraus bestand mit 76 geprüften Ressourcen und einem Acrylmodell. Hashgeprüfte Referenzdateien behalten ihre Originalbytes auch im Git-Archiv; Zeilenenden werden dort nicht normalisiert.

In einen neuen Arbeitsordner entpacken, `LOKAL-STARTEN.md` lesen, `node app/configurator/variant-m/server.mjs --port=8961` ausführen. Weiterarbeit: G27-02 gemäß aktuellem `STATUS.md`. Geplante Ablage im privaten GitHub-Repository über einen separaten Aufgabenbranch; der tatsächliche Remote-Commit wird nach Upload separat vermerkt.

Die lokale Git-Historie wurde unabhängig initialisiert, weil der Connector das neue Repository nicht fand und Git keine Anmeldung verwenden konnte. Nicht per Force-Push auf die Remote-Historie übertragen. Sobald regulärer Zugriff vorhanden ist: Remote normal klonen, Aufgabenbranch vom aktuellen Remote anlegen und nur den geprüften aktiven Stand übernehmen; bestehende Änderungen vergleichen.
