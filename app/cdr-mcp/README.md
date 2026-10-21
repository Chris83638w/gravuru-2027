# gravuru CDR-Werkzeuge (MCP-Server für ChatGPT und Claude)

Liest CorelDRAW-Dateien (`.cdr`) ohne CorelDRAW – mit derselben Technik, mit der Claude die Bestandsbögen liest (libcdr, siehe `scripts/read-corel-design-sheets.py`). ChatGPT und Claude bekommen damit dieselben Möglichkeiten: Maße 1:1 in mm, Bohrbilder, Texte/Schriften, SVG und Vorschaubild.

| Werkzeug | liefert |
| --- | --- |
| `cdr_info` | Seiten (Maß in mm), Anzahl Pfade/Texte/Bitmaps, Schriften mit Häufigkeit |
| `cdr_measure` | jede Platte/Form: Rechteck, Quadrat, Rechteck mit runden Ecken (+ Eckenradius), Kreis, Oval, Freiform, auch aus Einzel-Schnittlinien gebildete Rechtecke; Breite, Höhe, Lage, Linienfarbe; je Platte die Bohrlöcher (Mitte relativ zur linken oberen Plattenecke, Ø, Abstand zu allen vier Kanten, bei Freiformen zur Kontur) und Lochabstände Mitte–Mitte; Texte auf der Platte; Größenübersicht |
| `cdr_texts` | alle Texte mit Schrift, Größe (pt, Versalhöhe ≈ mm), Farbe, Ausrichtung, Lage |
| `cdr_to_svg` | Seite als SVG 1:1 in mm (Text bleibt Text), Download-Link 24 h |
| `cdr_preview` | PNG-Vorschau der Seite (fehlende Schriften als Ersatzschrift, Bitmaps als Rahmen) |

**Regeln:** Bohrloch = geschlossener Kreis bis Ø 12 mm; Platte = geschlossene Kontur ab 8 × 8 mm. Gefüllte Flächen innerhalb einer Platte (Motive, Text in Kurven) zählen nicht als Platte. Bitmaps werden nicht gelesen (dadurch Sekunden statt Minuten je Datei). Nichts wird gerundet oder vereinheitlicht.

**Bekannte Grenzen:** libcdr kennt die horizontale Stauchung von Corel-Text nicht (Textbreite dann natürliche Breite), gedrehter Text erscheint als hohe schmale Box. Sehr alte CDR (vor Version 7) und verschlüsselte Dateien liest libcdr nicht.

## Aufbau

- `server.mjs` – MCP über Streamable HTTP (zustandslos, JSON-Antworten), ohne npm-Abhängigkeiten. Endpunkt `https://<host>/mcp/<token>`; das Token ist der Zugangsschutz (≥ 32 Zeichen, nur im Passwortmanager). Lädt die Datei (nur https, keine internen Adressen, höchstens 200 MB, 120 s), höchstens 2 Auswertungen gleichzeitig, Warteschlange 8. Dateien 30 min im Zwischenspeicher (mehrere Werkzeuge auf dieselbe Datei), Ergebnisse 24 h als Download, danach gelöscht. Protokolliert nur Werkzeug, Dauer, Fehler – keine Dateiinhalte.
- `cdr_engine.py` – Auswertung, nur Python-Standardbibliothek (3.10+; geprüft 3.11–3.13); Vorschau braucht CairoSVG.
- `app.cjs` – Startdatei für Plesk; `check.cjs` – Prüfung/Einrichtung.
- ChatGPT übergibt hochgeladene Dateien über `_meta["openai/fileParams"]` (Feld `file` mit `download_url`, `file_id`, `mime_type`, `file_name`); Claude und andere geben `url` an.

## Paket bauen

```bash
ops/cdr-mcp/build-package.sh            # → deliverables/cdr-mcp/gravuru-cdr-mcp-<datum>-<commit>.zip
```

Das Paket enthält libcdr portabel (cdr2raw mit allen Bibliotheken und eigenem Loader, ~43 MB entpackt, Lizenzen in `vendor/libcdr/licenses/`). Es braucht auf dem Server keine Systempakete außer Node ≥ 22 und Python ≥ 3.10.

## Einrichtung auf Plesk (eigene Subdomain, nichts Bestehendes wird angefasst)

1. **Subdomain** anlegen, z. B. `cdr.gravuru-designwerkstatt.de`, mit Let’s-Encrypt-Zertifikat und Weiterleitung HTTP → HTTPS.
2. **Dateimanager:** ZIP in den neuen App-Ordner hochladen (z. B. `/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-cdr-mcp`) und dort entpacken. Direkt darin liegen `app.cjs`, `server.mjs`, `vendor/`, `public/`.
3. **Private Konfiguration** außerhalb des Webroots anlegen: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-cdr-mcp-config.json`

   ```json
   {"schema": 1, "values": {
     "CDR_MCP_TOKEN": "<40 Zeichen aus dem Passwortmanager, nur Buchstaben und Ziffern>",
     "CDR_MCP_ORIGIN": "https://cdr.gravuru-designwerkstatt.de",
     "CDR_MCP_DATA": "/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-cdr-mcp-data",
     "CDR_MCP_PYTHON": "python3"
   }}
   ```
   Rechte der Datei: nur der Besitzer darf lesen (600).
4. **Node.js** für die Subdomain: Node 22 oder neuer, Modus production, Application Root = App-Ordner, Document Root = `public`, Startup File = `app.cjs`.
5. **Skript ausführen:** `check` → erwartet `"ready": true`. Für Vorschaubilder einmal `node check.cjs --setup` (legt `private/gravuru-cdr-mcp-python` mit CairoSVG an), dann `CDR_MCP_PYTHON` auf `<dieser Ordner>/bin/python` setzen und App neu starten. Ohne CairoSVG funktioniert alles außer `cdr_preview`.
6. **Prüfen:** `https://cdr.gravuru-designwerkstatt.de/health` → `{"ok":true,…}`.

## In ChatGPT verbinden

Stand der OpenAI-Doku (Okt. 2026): eigene MCP-Server laufen im **Entwicklermodus** (Plus, Pro, Business, Enterprise, Edu; nur im Web). Bei Business/Enterprise muss ein Admin den Entwicklermodus zuerst freigeben.

1. ChatGPT im Browser → Settings → **Apps & Connectors** → Advanced settings → **Developer mode** an (deutsche Oberfläche entsprechend).
2. **Erstellen**: Name „gravuru CDR“, Beschreibung „CorelDRAW-Dateien ausmessen und auslesen“, URL `https://cdr.gravuru-designwerkstatt.de/mcp/<token>`, Authentifizierung **keine** (das Token im Pfad schützt).
3. „Werkzeuge scannen“ → fünf Werkzeuge erscheinen → Erstellen.
4. Im Chat: **+** → Mehr → „gravuru CDR“ auswählen, `.cdr` hochladen, z. B. „Miss alle Schilder mit Bohrlöchern aus und gib mir eine Tabelle Größe, Lochabstand, Randabstand“.

## In Claude verbinden

Als eigenen Remote-MCP-Konnektor mit derselben URL hinzufügen. Claude kann Dateien nicht direkt übergeben; dafür `url` mit einer https-Adresse der Datei verwenden. In dieser Arbeitsumgebung liest Claude CDR ohnehin direkt.

## Prüfung

- `node --test app/cdr-mcp/cdr-mcp.test.mjs` – Engine und Protokoll mit synthetischer libcdr-Ausgabe (keine Kundendateien im Repo).
- Echte Dateien (21.10.2026, lokal, nicht im Repo): Edelstahl-Sammelbogen (21 Platten, 18 Löcher, darunter 18 × 12 aus Einzellinien), Gedenktafel-Designbogen 78 MB (24 Platten, 6,5 s), Schlüsselanhänger-Bogen (368 Platten, 367 Löcher, 1,3 s), Schablonen; Durchlauf mit dem offiziellen MCP-Python-Client gegen den Server; portables libcdr-Bündel mit leerer Umgebung = identisches Ergebnis wie System-libcdr; Python 3.11/3.12/3.13 identisch.
