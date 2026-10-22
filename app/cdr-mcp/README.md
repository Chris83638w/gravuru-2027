# gravuru CDR-Werkzeuge (MCP-Server für ChatGPT und Claude)

Liest CorelDRAW-Dateien (`.cdr`) ohne CorelDRAW – mit derselben Technik, mit der Claude die Bestandsbögen liest (libcdr, siehe `scripts/read-corel-design-sheets.py`). ChatGPT und Claude bekommen damit dieselben Möglichkeiten: Maße 1:1 in mm, Bohrbilder, Texte/Schriften, SVG und Vorschaubild.

| Werkzeug | liefert |
| --- | --- |
| `cdr_info` | Seiten (Maß in mm), Anzahl Pfade/Texte/Bitmaps, Schriften mit Häufigkeit |
| `cdr_measure` | jede Platte/Form: Rechteck, Quadrat, Rechteck mit runden Ecken (+ Eckenradius), Kreis, Oval, Freiform, auch aus Einzel-Schnittlinien gebildete Rechtecke; Breite, Höhe, Lage, Linienfarbe; je Platte die Bohrlöcher (Mitte relativ zur linken oberen Plattenecke, Ø, Abstand zu allen vier Kanten, bei Freiformen zur Kontur) und Lochabstände Mitte–Mitte; Texte auf der Platte; Größenübersicht |
| `cdr_texts` | alle Texte mit Schrift, Größe (pt, Versalhöhe ≈ mm), Farbe, Ausrichtung, Lage |
| `cdr_to_svg` | Seite als SVG 1:1 in mm (Text bleibt Text), Download-Link 24 h |
| `cdr_preview` | PNG-Vorschau der Seite (fehlende Schriften als Ersatzschrift, Bitmaps als Rahmen) |
| `cdr_source_status` | Einrichtung und Lesbarkeit des auf Plesk eingebundenen Produktordners |
| `cdr_list_files` | Unterordner und CDR-Dateien einer Ordnerebene, mit Seitenaufteilung |

**Regeln:** Bohrloch = geschlossener Kreis bis Ø 12 mm; Platte = geschlossene Kontur ab 8 × 8 mm. Gefüllte Flächen innerhalb einer Platte (Motive, Text in Kurven) zählen nicht als Platte. Bitmaps werden nicht gelesen (dadurch Sekunden statt Minuten je Datei). Nichts wird gerundet oder vereinheitlicht.

**Bekannte Grenzen:** libcdr kennt die horizontale Stauchung von Corel-Text nicht (Textbreite dann natürliche Breite), gedrehter Text erscheint als hohe schmale Box. Sehr alte CDR (vor Version 7) und verschlüsselte Dateien liest libcdr nicht.

## Aufbau

- `server.mjs` – MCP über Streamable HTTP (zustandslos, JSON-Antworten), ohne npm-Abhängigkeiten. Endpunkt `https://<host>/mcp/<token>`; das Token ist der Zugangsschutz (≥ 32 Zeichen, nur im Passwortmanager). Lädt die Datei (nur https auf Port 443, keine internen Adressen – geprüft wird die tatsächlich verbundene IP, auch nach Weiterleitungen –, höchstens 200 MB, 120 s), höchstens 2 Auswertungen gleichzeitig, Warteschlange 8; je Auswertung höchstens 3 GB Arbeitsspeicher und 2 GB entpackte Datei (Schutz vor Zip-Bomben). Dateien 30 min im Zwischenspeicher (mehrere Werkzeuge auf dieselbe Datei, insgesamt höchstens 3 GB), Ergebnisse 24 h als Download, danach gelöscht – auch nach einem Neustart. Protokolliert nur Werkzeug, Dauer, Fehler – keine Dateiinhalte. Hinweis: Das Token steht im Pfad und damit im Zugriffsprotokoll des Webservers (nur für Plesk-Admins sichtbar); bei Verdacht Token tauschen und in ChatGPT neu eintragen.
- `cdr_engine.py` – Auswertung, nur Python-Standardbibliothek (3.10+; geprüft 3.11–3.13); Vorschau braucht CairoSVG.
- `source.mjs` – optionaler, ausschließlich lesender Zugriff auf einen vom Betreiber eingebundenen Produktordner. Keine eigene SMB-Anmeldung oder Netzwerkeinrichtung.
- `bridge.mjs` – optionaler HTTPS-Empfänger für ausgehende CDR-Kopien vom Firmenrechner; separat authentifiziert und standardmäßig deaktiviert.
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
3. **Keine Konfiguration nötig.** Beim ersten Start legt die App im Ordner `private/` neben dem App-Ordner selbst an: `gravuru-cdr-mcp-token.txt` (Zugangscode, 40 Zeichen, Rechte 600) und `gravuru-cdr-mcp-data/` (Zwischenspeicher). Den Code nur aus dieser Datei kopieren (Plesk-Dateimanager) und in ChatGPT eintragen; niemand muss ihn abtippen oder im Chat weitergeben. Optional überschreibt `private/gravuru-cdr-mcp-config.json` die Werte:

   ```json
   {"schema": 1, "values": {"CDR_MCP_ORIGIN": "https://cdr.gravuru-designwerkstatt.de", "CDR_MCP_PYTHON": "python3"}}
   ```
   Download-Links nutzen sonst automatisch den aufgerufenen Host.
4. **Node.js** für die Subdomain: Node 22 oder neuer, Modus production, Application Root = App-Ordner, Document Root = `public`, Startup File = `app.cjs`.
5. **Skript ausführen:** `check` → erwartet `"ready": true` (vor dem ersten Start steht dort `firstStart: true`, das ist in Ordnung). Für Vorschaubilder einmal `node check.cjs --setup` (legt `private/gravuru-cdr-mcp-python` mit CairoSVG an), dann `CDR_MCP_PYTHON` auf `<dieser Ordner>/bin/python` setzen und App neu starten. Ohne CairoSVG funktioniert alles außer `cdr_preview`.
6. **Prüfen:** `https://cdr.gravuru-designwerkstatt.de/health` → `{"ok":true,…}`.

## Produktordner vom Dateiserver lesen (ab Version 1.1.0)

Die laufende Plesk-App allein stellt noch keine Verbindung zum Windows-Dateiserver her. `V:\Produkte` ist laut `gravuru-katalog./STAND.md` die Freigabe `\\bi-srv01-fs01\Neue-Struktur\Produkte`. Auf Linux muss dieser **Produkte**-Ordner bereits an einem absoluten lokalen Pfad eingebunden sein; alternativ ist eine verwaltete Kopie möglich, deren Aktualität dann gesondert gesichert werden muss. Der tatsächliche Plesk-Pfad und die Erreichbarkeit dieser Freigabe wurden hier noch nicht geprüft.

1. Betreiber stellt die Einbindung über das vorhandene private Netz bereit. Der Plesk-App-Benutzer benötigt Lese- und Verzeichniszugriff; Quelle nach Möglichkeit bereits beim Mount nur lesbar einbinden. Zugangsdaten bleiben in der Serververwaltung.
2. In den bestehenden `values` der privaten Konfigurationsdatei **ergänzen**, nicht die Datei ersetzen: `"CDR_MCP_SOURCE_ROOT": "/tatsaechlicher/pfad/zu/Produkte"`. Alternativ dieselbe Umgebungsvariable in der App setzen. Der Beispielpfad ist ein Platzhalter. Ohne Einstellung funktionieren Uploads weiter; Serverzugriff meldet „nicht eingerichtet“.
3. Beim Upgrade `server.mjs`, `source.mjs` **und** `bridge.mjs` aus demselben Stand in den bestehenden App-Ordner übernehmen (oder das neue Paket verwenden). Private Konfiguration, Token, libcdr und Python bleiben bestehen. App neu starten und die Werkzeugdefinitionen des Konnektors aktualisieren: fünf bestehende Werkzeuge erhalten `server_path`, zwei neue Werkzeuge kommen hinzu.
4. `cdr_source_status {}` aufrufen. `erreichbar: true` belegt einen lesbaren Ordner, noch keine erfolgreiche Verbindung zur erwarteten Freigabe. Mit `cdr_list_files` bekannte Unterordner prüfen und anschließend die konkrete CDR auslesen.

Beispiel für den aus der CSV bekannten 7×2-Bogen (dessen Existenz und Inhalte sind noch live zu prüfen):

```json
{"server_path":"V:\\Produkte\\Türschilder\\Gravur\\Edelstahl\\__NEU\\7x2\\[CDR]\\TRE-V2A-7x2_Designs.cdr"}
```

Dieses Argument gilt für `cdr_info`, `cdr_texts`, `cdr_measure`, `cdr_to_svg` und `cdr_preview`. Genau eine Quelle angeben: `file`, `url` oder `server_path`. Für `cdr_list_files` einen Ordner angeben; die Antwort enthält relative Pfade zur direkten Weiterverwendung. Standard: 100 Einträge, maximal 200, Fortsetzung mit `naechsterOffset`; keine rekursive Vollinventur. Unter Linux die Schreibweise der Dateien einschließlich Groß-/Kleinschreibung übernehmen.

Standardmäßig akzeptiert werden relative Pfade sowie die Präfixe `V:\Produkte`, `\\bi-srv01-fs01\Neue-Struktur\Produkte` und `\\bi-srv01-fs01.lan.gravuru.de\Neue-Struktur\Produkte`. Abweichende Präfixe lassen sich mit `CDR_MCP_SOURCE_PREFIXES` als JSON-Liste in der Konfiguration bzw. JSON-Text in der Umgebung ersetzen. Die Präfixe sind nur Pfadübersetzungen; sie öffnen keine Netzwerkverbindung.

Der Zugriff bleibt auf den eingestellten Produktordner beschränkt: keine Fremdlaufwerke, `..` oder Symlinks nach außen; nur reguläre CDR-Dateien. Jede Auswertung nutzt eine frische lokale Lesekopie (maximal 200 MB gemäß bestehender Einstellung), prüft Änderungen während des Kopierens und entfernt die Kopie danach auch bei Auswertungsfehlern. `quelle` enthält relativen Pfad, SHA-256, Bytes und Änderungszeit zur Nachvollziehbarkeit. Originale werden weder bearbeitet noch verschoben. Wie bei Uploads können abgeleitete SVG/PNG/JSON-Ergebnisse 24 Stunden über geschützte Zufallslinks verfügbar sein. Netzwerkmounts mit hängenden Kernelzugriffen benötigen zusätzlich passende Zeitüberschreitungen auf Betriebssystemebene.

Die grünen Überschriften lassen sich mit `cdr_texts` anhand der Textfarben prüfen. Ob zwei Fassungen Original und Gravuroptimierung darstellen, muss anhand der realen Datei und der bestätigten Zuordnungsregel beurteilt werden; diese Erweiterung legt keine Shopify-Produkte an.

## In ChatGPT verbinden

Stand der OpenAI-Doku (Okt. 2026): eigene MCP-Server laufen im **Entwicklermodus** (Plus, Pro, Business, Enterprise, Edu; nur im Web). Bei Business/Enterprise muss ein Admin den Entwicklermodus zuerst freigeben.

1. ChatGPT im Browser → Settings → **Apps & Connectors** → Advanced settings → **Developer mode** an (deutsche Oberfläche entsprechend).
2. **Erstellen**: Name „gravuru CDR“, Beschreibung „CorelDRAW-Dateien ausmessen und auslesen“, URL `https://cdr.gravuru-designwerkstatt.de/mcp/<token>`, Authentifizierung **keine** (das Token im Pfad schützt).
3. „Werkzeuge scannen“ → sieben Werkzeuge erscheinen → Erstellen.
4. Im Chat: **+** → Mehr → „gravuru CDR“ auswählen, `.cdr` hochladen, z. B. „Miss alle Schilder mit Bohrlöchern aus und gib mir eine Tabelle Größe, Lochabstand, Randabstand“.

## In Claude verbinden

Als eigenen Remote-MCP-Konnektor mit derselben URL hinzufügen. Claude kann Dateien nicht direkt übergeben; dafür `url` mit einer https-Adresse der Datei verwenden. In dieser Arbeitsumgebung liest Claude CDR ohnehin direkt.

## Prüfung

- `node --test app/cdr-mcp/*.test.mjs` – Engine, Protokoll und Serverquelle mit synthetischer libcdr-Ausgabe (keine Kundendateien im Repo). Neu: V:/UNC-Zuordnung, Umlaute/Klammern, Status, Listen/Seitenaufteilung, Pfadgrenzen/Symlinks, Größenlimit, Aktualität, D-Nummer/Textfarbe sowie Entfernen der Lesekopien bei Erfolg und Fehler.
- Echte Dateien (21.10.2026, lokal, nicht im Repo): Edelstahl-Sammelbogen (21 Platten, 18 Löcher, darunter 18 × 12 aus Einzellinien), Gedenktafel-Designbogen 78 MB (24 Platten, 6,5 s), Schlüsselanhänger-Bogen (368 Platten, 367 Löcher, 1,3 s), Schablonen; Durchlauf mit dem offiziellen MCP-Python-Client gegen den Server; portables libcdr-Bündel mit leerer Umgebung = identisches Ergebnis wie System-libcdr; Python 3.11/3.12/3.13 identisch.

## Ausgehende Übertragung vom Firmenrechner (ab 1.2.0)

Für V:\Produkte ohne Verbindung von Plesk ins Firmennetz: Der lokale Helfer in
`ops/cdr-bridge/` sendet geprüfte CDR-Kopien ausgehend per HTTPS. Die Einrichtung,
Windows-Starter und Grenzen stehen in dessen README. Der Upload-Empfänger ist
standardmäßig aus und benötigt einen eigenen privaten Kopienordner und ein
separates Upload-Token. Die bestehenden MCP-Lesewerkzeuge geben für Kopien
Quellzeit, Empfangszeit und SHA-256 zurück. Sie behaupten keinen Livezugriff auf V:.
