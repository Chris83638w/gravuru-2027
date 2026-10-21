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
