# Gravuru 2027 lokal starten

Voraussetzung: Node.js 24 oder neuer. Keine npm-Paketinstallation nötig. Der Designimport benötigt zusätzlich Python 3, PDF außerdem PyMuPDF (siehe unten). Befehle im Projektordner ausführen, der `package.json` und `app/` enthält.

```powershell
node app/configurator/variant-m/server.mjs --port=8961
```

Danach http://127.0.0.1:8961/?model=acryl öffnen. Das Terminal muss laufen bleiben. Bei belegtem Port vorhandenen Server verwenden oder einen anderen freien Port angeben. Der alte Vergleich auf Port 8951 wird nicht ersetzt.

Werkstatt: http://127.0.0.1:8961/werkstatt/ – Produkte, Profile und Serien. Beim ersten Start wird der Acrylmaster angelegt. Dauerhafte lokale Daten liegen in `.local-data/`; diesen Ordner bei einem Rechnerumzug separat sichern. Er gehört nicht ins Quellrepository. Die Excel-Vorlage ist direkt in der Serienverwaltung herunterladbar.

Der Server baut die Vorschau beim Start. `app/configurator/variant-m/.preview/` ist ein ignoriertes Build-Ergebnis. Referenzarchive müssen für diesen Pilot nicht ausgepackt werden; alle benötigten Ressourcen liegen unter `app/`.

## SVG/PDF-Designimport

Python wird über `GRAVURU_PYTHON`, die vorhandene Codex-Python-Installation oder schließlich `python` (Windows) / `python3` gefunden. Eine abweichende Installation kann vor dem Serverstart ausdrücklich gewählt werden:

```powershell
$env:GRAVURU_PYTHON = 'C:\Pfad\zu\python.exe'
& $env:GRAVURU_PYTHON -m pip install --target .local-data/python -r app/workshop/requirements-import.txt
```

Den Beispielpfad durch den tatsächlichen Python-Pfad ersetzen. Auf Mikails aktuellem Rechner ist PyMuPDF 1.28.2 bereits im ignorierten Ordner `.local-data/python` installiert; keine erneute Installation bei jedem Start. Unter einer normalen Python-Installation kann stattdessen `python -m pip install --target .local-data/python -r app/workshop/requirements-import.txt` verwendet werden. Für SVG allein genügen Python-Standardmodule.

Designersatz in der Werkstatt unter **Designs & Texte → SVG / PDF ersetzen …**. Höchstens 15 MB; SVG-Schriften als Pfade, PDF-Seite ausdrücklich wählbar. Originale/Prüfvorschauen liegen in `.local-data/design-assets.sqlite`, Produkte und Profile in den benachbarten Datenbanken. Nur das ausgewählte Design wird ersetzt. Importierte Gesamtgrafiken haben noch keine automatisch einzeln editierbaren Kundenfelder.

Für mehrere Produkte **Produktserien** öffnen, aktuelle Excel-Vorlage herunterladen und pro Zeile `design_file` mit dem exakten Dateinamen füllen. `design_page` wählt bei PDFs die Seite; `design_id` ist optional das Ziel-Design im Master, `design_fit` optional `visible` oder `original`. Alle benötigten SVG-/PDF-Dateien zusätzlich zur Tabelle gemeinsam auswählen. Ohne `design_file` bleibt das Masterdesign erhalten. Vor Anlage werden Zuordnung, Vorschau und Fehler angezeigt. Mit importierten Gesamtmotiven die Textspalten leer lassen. Erneutes Importieren derselben Serie mit denselben Importschlüsseln legt keine Dubletten an.

PyMuPDF ist laut Paketmetadaten unter AGPL-3.0 oder kommerzieller Artifex-Lizenz erhältlich. Für ein proprietäres Hosting ist die Lizenzwahl vor Bereitstellung zu klären; der lokale Pilot ist keine freigegebene Produktionsinstallation.

## Prüfungen

```powershell
node --test app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs
node app/configurator/variant-m/build.mjs
```

Mobile Sichtprüfung (K11, geführte Schritte unter 768 px) bei laufendem Server mit vorinstalliertem Playwright/Chromium: `node scripts/check-mobile-steps.mjs http://127.0.0.1:8961 deliverables/konfi-neu-K11` (Screenshots 390×844 je Schritt und 1280×800, `report.json`).

Build mit 76 Ressourcen und einem Acrylmodell. Aktueller Funktions- und Prüfstand: `STATUS.md`. `G27-01-PRUEFUNG.md` beschreibt nur die ursprüngliche Kundenoberfläche.

## Grenzen

Dieser Server bindet ausschließlich lokal. Schreibende Werkstattaktionen verwenden Host-/Origin-Prüfung und Sitzungstoken; eine Händleranmeldung für öffentliches Hosting fehlt noch. Shopify und Bestellproduktion sind nicht angeschlossen. Gestaltungen sind keine gespeicherten Bestellungen. Sichtbare Abschluss-/Entwurfsfunktionen des übernommenen Editors belegen keine neue Bestellstrecke. Nicht unverändert öffentlich hosten.
