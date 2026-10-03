# Gravuru 2027 – vollständige Übergabe, 02.10.2026

Aktueller Auftrag: Den heutigen Stand ohne Datenverlust für Codex Cloud bereitstellen. Lokale Weiterarbeit nicht als Cloud-Arbeit bezeichnen. Alte Übergaben vom 01.10. sind unvollständig: neue Importschritte und lokale Datenbanken fehlen darin. Das neue Paket ersetzt nicht die lokalen Originale. Keine Dateien löschen und keine vorhandenen Datenbanken überschreiben.

## Was mitgenommen wird

- Aktiver Quellbaum einschließlich Kundeneditor, Werkstatt, Tests, Excel-Vorlage und Ressourcen; lokale Git-Historie zusätzlich als Bundle.
- Drei zusammengehörige SQLite-Sicherungen: Produkte/IDs/Revisionen/Preise/Master/Importzuordnungen, Profile samt Einstellungen/Revisionen und unveränderte Design-Originale/SVG-Vorschauen.
- Vier historische Referenzarchive samt Quellenmanifest: Motive, Schriften, Acrylsockel/-szene, Materialreferenzen und ausgewählte Oberflächen.
- Alle 19 vom Nutzer genannten Acrylglasbilder, Daria-PDFs/Ebenen-ZIP und ursprüngliche Übergabedateien. Bereits erzeugte Design-/Druck-/Workflow-Ausgaben werden als historische Ergebnisse beigepackt, nicht pauschal als produktionsfähig freigegeben.
- Anforderungen, getroffene Entscheidungen, bekannte Grenzen, letzte Prüfnachweise und nächster fachlicher Schritt. Maßgeblich bleiben NEUE-WERKSTATT-PLAN.md und der neueste STATUS.md-Abschnitt.

Prüfsummen und Inventar stehen im MANIFEST.json des Übergabepakets. Die Sicherung hält Datenbankschreibzugriffe kurz an und nutzt SQLite-Backup inklusive noch nicht eingecheckter WAL-Änderungen. Es werden keine laufenden Datenbankdateien blind kopiert. Alle Revisionen und referenzierten Original-Hashes werden geprüft. Bei weiterem Bearbeiten nach dem dort genannten Sicherungszeitpunkt muss vor dem endgültigen Wechsel eine neue Sicherung entstehen.

## Bewusst getrennt

Die Datenbanken gehören in den privaten Dateispeicher der Cloud-Umgebung, nicht ins öffentliche oder private Quellrepository. Das gesamte Übergabe-ZIP enthält private Projektdaten und darf nicht öffentlich bereitgestellt werden. Der Quellbaum darf in das bestehende private Projekt-Repository. Kein Force-Push zwischen den unterschiedlichen lokalen/entfernten Historien.

Passwörter, Shopify-Schlüssel, GitHub-Anmeldung, .env-Dateien und Browsersitzungen werden nicht in Archive oder Git aufgenommen. Nötige Zugänge werden in der Cloud über deren geschützte Einstellungen bereitgestellt. Windows-Programme, persönliche lokale Plugins/Skills und installierte Python-Binärdateien sind keine portable Laufzeit. Node >=24, Python 3 und die festgehaltenen PDF-Abhängigkeiten dort neu bereitstellen. Die App selbst benötigt keine npm-Abhängigkeiten; das Hilfsprogramm zum Neubauen der Excel-Vorlage benötigt separat das im Skript genannte Artifact Tool. Die fertige XLSX liegt bereits bei.

Ungespeicherte Eingaben in geöffneten Browsern sind keine gespeicherten Produktrevisionen. Vor dem abschließenden Wechsel offene Produktänderungen speichern. Der Sicherungszeitpunkt bildet nur tatsächlich gespeicherte Datensätze ab.

## Wiederherstellen und abnehmen

1. Privates Paket vollständig am Ziel entpacken. `python3 verify-and-restore.py verify .` muss PASS melden; fehlende Eingaben offen klären.
2. `python3 verify-and-restore.py restore . /ABSOLUTER/NEUER/gravuru-2027` stellt Quellstand und alle drei Datenbanken in einem **neuen** Ordner wieder her. Ein vorhandener Zielordner wird abgewiesen. Weitere beigepackte Originale/Historie bleiben im Übergabeordner verfügbar.
3. Node >=24, Python 3, `python3 -m pip install --target .local-data/python -r app/workshop/requirements-import.txt` im wiederhergestellten Projekt. PyMuPDF-Lizenzentscheidung vor proprietärem Hosted-Release beachten; keine kommerzielle Lizenz behaupten.
4. `npm test`, `npm run build`, `node verify-reference.mjs`. PDF-Tests dürfen nicht stillschweigend übersprungen werden. Aktueller Vergleich: 137 verschiedene Tests erfolgreich, 76 Build-Ressourcen/ein Modell; neue Tests können die Anzahl erhöhen.
5. Server starten, Produkt-/Profilanzahl und stabile IDs mit MANIFEST vergleichen. Insbesondere reguläres Arbeitsprodukt, Daria-Testkopie und aktuell bearbeitetes Produkt prüfen. Designs/Originale, Revisionen, Profile, Preise, Foto-/Textbedienung und Einzel-/Serienimport testen. Erfolgreicher ZIP-Upload allein reicht nicht.
6. Erst nach tatsächlichem Cloud-Lauf Prüfbericht mit Cloud-Umgebung, Quellcommit, Paket-Hash, Zeitpunkt, Testergebnis und offenen Punkten sichern. Wiederhergestellte Daten regelmäßig außerhalb kurzlebiger Task-Zustände sichern.

Die aktuelle offizielle Cloud-Dokumentation nennt Computer-/Browserbedienung als noch nicht unterstützt. Daher dort mögliche automatisierte Prüfungen ausdrücklich von der anschließenden visuellen Browserabnahme unterscheiden; den bisherigen lokalen Browserzugriff nicht voraussetzen. Quelle: https://learn.chatgpt.com/docs/environments/cloud-environments (02.10.2026). Eine echte Roland-/Mimaki-/Gravurprobe bleibt an den Maschinen erforderlich.

## Nächster fachlicher Schritt nach der Migration

Importierte SVG/PDF sind bislang ein gesperrtes Gesamtmotiv. Editierbare Kundenfelder und Fotobereiche müssen ausdrücklich zugeordnet werden; keine verlustfreie Rekonstruktion aus Rasterbildern oder bereits in Pfade gewandelter Schrift behaupten. Danach Material-/Form-/Bohrmodell, Mehrfachdesign-/Varianten-Tabellen, Produktions-/Bestellsnapshots und Shopify-Anbindung ausbauen. Kein Neustart der bereits geprüften Werkstattbasis und keine neue Sicherungssuche. Aktuelle Importgrenzen und Qualitäts-/Lizenzfragen in STATUS.md erhalten.
