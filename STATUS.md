# Aktueller Stand – Gravuru 2027

Stand: 30.09.2026. **Aktives nächstes Paket: G27-01 – getrennte lauffähige Grundlage.**

## Abgeschlossen

- Eigenständiges privates Repository: `Chris83638w/gravuru-2027`.
- Ausgangsdokumentation auf GitHub: Commit `573d882588d968964bfd2a1e17414b22c3f69eac`.
- Umsetzungspakete, Startauftrag für GPT-6.1 Sol, Arbeitsregeln und Materialzuordnung vorbereitet.
- Vier Referenzarchive mit 294 Dateien: bestehender Quellcode, Motive/Schriften, Acrylressourcen, zwölf Materialbilder und zwei ausgewählte Oberflächenentwürfe.
- Probeentpackung und alle Datei-/Archivprüfsummen erfolgreich. 19 vorhandene Tests bestanden; Build erfolgreich mit 104 geprüften Ressourcen und 7 Modellen. Details in `QUELLEN-UND-START.md`.

## Keine Fertigbehauptung

Die neue App ist noch nicht implementiert. Referenzarchive sind keine automatische Migration. Vollständige Admin-/Shopify-Installation, freie PDF/SVG-Konturen, neue Produktdatenbank, Excel-Stapelimport und Bestellproduktion sind noch umzusetzen bzw. durchgehend zu prüfen. Aktuelle Modellwahl wurde nicht geändert und kein neuer KI-Chat gestartet.

## Neu berücksichtigt

Edelstahl, Schiefer, Leder und Holz gehören neben Acryl zur Grundlage. In der historischen Sammlung ist **Edelstahl v4** ausgewählt; v6 war eine falsche Zwischenzuordnung. Leder 2 mm und Holz 5 mm sind dort nur Bildannahmen. Schiefer-Designbeispiele liegen vor, reine Rohlingreferenz noch nicht eindeutig zugeordnet. `MATERIALREFERENZEN.md` lesen.

## Genau weiter so

G27-01 aus `UMSETZUNGSPAKETE.md` bearbeiten. Die Referenzen anhand `QUELLEN-UND-START.md` prüfen, benötigte Module in einen neuen Arbeitsbereich übernehmen und einen bedienbaren lokalen Stand mit eigener Startanleitung zeigen. Danach gemeinsames Modell G27-02. Keine erneute vollständige Recherche oder Gesamtplanung.

## Fortschritt pro Paket ergänzen

Paket / Status / Branch und Commit / betroffene Dateien / konkret ausgeführte Tests / Ergebnislink / offene Grenzen / nächstes Paket. Historische Tests nicht als aktuelle Ergebnisse neuer Änderungen fortschreiben.

## CDR-Werkzeuge für ChatGPT/Claude (21.10.2026, Branch `dev/cdr-mcp-20261021`)

- `app/cdr-mcp/`: MCP-Server (Streamable HTTP, ohne npm-Abhängigkeiten) + `cdr_engine.py` (libcdr): `cdr_info`, `cdr_measure` (Platten, Bohrlöcher, Rand- und Lochabstände in mm), `cdr_texts`, `cdr_to_svg`, `cdr_preview`. ChatGPT-Dateiübergabe über `openai/fileParams`.
- Paket für Plesk: `ops/cdr-mcp/build-package.sh` (portables libcdr, ~18 MB ZIP; nicht im Repo). Einrichtung und ChatGPT-Verbindung: `app/cdr-mcp/README.md`.
- Geprüft: `node --test app/cdr-mcp/cdr-mcp.test.mjs` 13/13; echte CDR-Dateien lokal (siehe README „Prüfung“); MCP-Python-Client-Durchlauf; Plesk-Ordneraufbau mit `check.cjs` simuliert.
- Offen: Subdomain + Upload in Plesk (Chris), Token im Passwortmanager, Verbindung in ChatGPT und ein echter Test mit hochgeladener CDR (Dateiübergabe von ChatGPT ist nur nach Doku geprüft).

## CDR-Serverquelle vorbereitet (22.10.2026, Branch `task/cdr-server-source-20261022`)

- Anlass: Die CSV verweist auf `V:\Produkte\…\7x2\[CDR]\TRE-V2A-7x2_Designs.cdr`; der bestehende MCP-Dienst kann nur Uploads/HTTPS lesen. Die dokumentierte Zuordnung lautet `V:\Produkte` → `\\bi-srv01-fs01\Neue-Struktur\Produkte` (Quelle: `gravuru-katalog./STAND.md`).
- Umsetzung: `app/cdr-mcp/source.mjs`, `server.mjs` (Version 1.1.0), `source.test.mjs`, angepasstes `cdr-mcp.test.mjs`, `README.md` und `ops/cdr-mcp/build-package.sh`. Optionaler Produktordner, `cdr_source_status`, `cdr_list_files`, `server_path` für die fünf bestehenden Werkzeuge; begrenzter Lesezugriff, aktuelle Lesekopie je Auswertung, Quellenprüfsumme. Keine Shopify-Schreibzugriffe.
- Geprüft: `node --test app/cdr-mcp/*.test.mjs` mit synthetischen CDR/libcdr-Daten, 23/23 erfolgreich (Node 24, Python 3.12). Upload/SVG-Rückwärtskompatibilität, Zugriffsschutz, Pfadübersetzung, Ordnerlisten, Dateigröße/Aktualität, D-Nummer/Textfarbe und Kopienbereinigung. Zusätzlich `bash -n ops/cdr-mcp/build-package.sh` und `git diff --check`.
- Grenzen: Nicht auf Plesk installiert; kein aktuelles Paket mit echtem libcdr neu gebaut. Tatsächlicher Mountpfad, Netzwerkverbindung und reale 7×2-Design-CDR sind aus dieser Umgebung nicht verifiziert. Synthetische D5-Testdaten belegen keine echten Produktinhalte. Frühere echte CDR-Prüfungen gelten nicht als Prüfung dieser Änderung.
- Nächster Schritt: Bestehende Plesk-App und lesbare Einbindung des Produktordners prüfen, `CDR_MCP_SOURCE_ROOT` setzen, Version aktualisieren und Werkzeuge neu einlesen. Danach den bekannten 7×2-Bogen tatsächlich lesen, grüne Überschriften und doppelte Gravurfassungen mit Chris zuordnen; erst daraus die Shopify-Daten vorbereiten.
