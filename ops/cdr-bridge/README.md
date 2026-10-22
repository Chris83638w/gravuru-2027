# CDR-Übertragung aus V:\Produkte

Der Firmenrechner liest Originaldateien und sendet geprüfte Kopien per HTTPS an
`https://cdr.gravuru-designwerkstatt.de/bridge/v1/file`. Danach kann der bestehende
CDR-Dienst sie unter dem relativen Pfad oder mit `V:\Produkte\…` auslesen.
Es gibt keine eingehende Verbindung in das Firmennetz und keine SMB-/VPN-Anmeldung
auf Plesk. Das Verfahren liefert den Stand der letzten Übertragung, keinen
Livezugriff auf das Netzlaufwerk. Es löscht weder Originale noch entfernte Kopien.

## Stand am 22.10.2026

Version 1.2.0 ist nach ausdrücklicher Freigabe auf Plesk aktiviert. Live geprüft:
HTTPS-Übertragung, SHA-256, HEAD, getrennte Anmeldung, Ablehnung falscher Prüfsummen
und MCP-Ordnerliste/Herkunft als Kopie. Der synthetische Test ist privat archiviert.
Der echte 7×2-Bogen
ist noch nicht übertragen oder ausgewertet. Die Windows-Starter sind vorbereitet,
aber mangels Windows-/V:-Zugriff hier nicht auf Chris' Rechner ausgeführt.

## Einmal lokal starten

1. Paket auf dem Windows-Rechner entpacken, auf dem `V:\Produkte` lesbar ist.
2. `7x2-pruefen.cmd` doppelklicken. Voraussetzung: Python 3.10 oder neuer
   (`py -3` oder `python`). Der Prüflauf zeigt nur Pfad und Dateigröße, ohne Netzwerkzugriff.
3. `7x2-senden.cmd` starten. Liegt `cdr-bridge-token.txt` im entpackten Ordner,
   wird der separate Upload-Zugang automatisch verwendet; sonst wird er verdeckt
   abgefragt. Den Zugang nicht in einen Chat schreiben. Das bestehende MCP-Token gilt nicht.
   Das vorbereitete Paket mit Zugang liegt ausschließlich im privaten Plesk-Ordner:
   `private/Gravuru-CDR-7x2-Start.zip`. Nur auf dem eigenen Firmenrechner entpacken,
   nicht auf einem gemeinsamen Laufwerk ablegen oder weitergeben.
4. `7x2-ergebnis.json` enthält Pfad, SHA-256, Größe, Quellzeit und Transferergebnis,
   keine Zugangsdaten. Erst „übertragen“ mit bestätigter Prüfsumme oder „unverändert“
   belegt eine passende, bereits bestätigte Kopie.

Standarddatei:

```text
V:\Produkte\Türschilder\Gravur\Edelstahl\__NEU\7x2\[CDR]\TRE-V2A-7x2_Designs.cdr
```

Falls V: nur in der interaktiven Windows-Sitzung existiert, kann ein Rechner im
Firmennetz denselben bekannten Share über UNC lesen:

```powershell
py -3 cdr_bridge.py --root "\\bi-srv01-fs01\Neue-Struktur\Produkte"
py -3 cdr_bridge.py --root "\\bi-srv01-fs01\Neue-Struktur\Produkte" --send --report 7x2-ergebnis.json
```

Das ist kein automatischer Fallback auf einen anderen Bestand: Der gewählte
Quellordner erscheint im Plan und Bericht. `C:\katalog-quelle` nicht ohne geprüfte
Zuordnung/Originalpfade einsetzen; Light-Kopien können vom Original abweichen.

## Alle CDR-Dateien und spätere Aktualisierung

Zunächst den Umfang anzeigen, anschließend ausdrücklich senden:

```powershell
py -3 cdr_bridge.py --all
py -3 cdr_bridge.py --all --send --report produkte-ergebnis.json
```

Jeder Lauf prüft SHA-256; identische, bestätigte Kopien werden nicht erneut geladen.
Bei Fehlern stoppt der Lauf. Nach Behebung erneut ausführen; bereits bestätigte
Dateien werden übersprungen. Dateien über 200 MiB, Verknüpfungen/Junctions und
Dateien, die sich während des Lesens ändern, werden abgewiesen. Die Standardgrenze
auf dem Empfänger beträgt 5 GiB inklusive Prüfmetadaten und Platz für einen
Dateiaustausch; eine Vollinventur kann mehr Platz benötigen.

Für einen später separat eingerichteten Windows-Aufgabenplaner kann
`--token-file "C:\geschuetzter-ordner\upload-token.txt"` genutzt werden. Die Datei
nur für das ausführende Benutzer-/Dienstkonto lesbar machen und außerhalb
gemeinsamer Ordner ablegen. Kein Zeitplan wird von diesem Paket installiert.

## Plesk-Empfänger aktivieren (Betreiber)

Am 22.10.2026 nach Freigabe durchgeführt; die folgenden Schritte dokumentieren
die Einrichtung. Separater Upload-Zugang und privater Kopienordner sind aktiv,
Dateien und Konfiguration gesichert. Zugangsdaten und Firmen-CDRs liegen nicht im Repository.

- Runtime `server.mjs`, `source.mjs`, `bridge.mjs` gemeinsam installieren,
  vorhandene Dateien/Prüfsummen sichern und synthetische Tests auf dem Host prüfen.
- Eigenen, leeren Kopienordner außerhalb aller Webroots anlegen, z. B.
  `/var/www/vhosts/gravuru-designwerkstatt.de/private/cdr-produkte`, Eigentümer
  `gravuru_werkstatt`, Rechte 0700. Nicht auf Original-/Mountordner zeigen.
- Separates zufälliges Upload-Token mit mindestens 40 URL-sicheren Zeichen in
  einer privaten Datei mit 0600 ablegen; weder bestehendes MCP-Token wiederverwenden
  noch Token in URLs, Logs oder Repository schreiben.
- Private App-Konfiguration um folgende Werte ergänzen, vorhandene Werte erhalten:

```json
{
  "CDR_MCP_BRIDGE_ENABLED": "1",
  "CDR_MCP_BRIDGE_ROOT": "/var/www/vhosts/gravuru-designwerkstatt.de/private/cdr-produkte",
  "CDR_MCP_SOURCE_ROOT": "/var/www/vhosts/gravuru-designwerkstatt.de/private/cdr-produkte",
  "CDR_MCP_BRIDGE_TOKEN_FILE": "/var/www/vhosts/gravuru-designwerkstatt.de/private/cdr-bridge-token.txt",
  "CDR_MCP_BRIDGE_MAX_MB": "5120"
}
```

Die Werte gehören in das bestehende `values`-Objekt. App über Plesk neu starten.
`/health` muss 1.2.0 zeigen; unauthentifiziertes HEAD auf `/bridge/v1/file` muss
401 liefern. Mit Upload-Token einen kleinen synthetischen Bogen in einem klaren
Test-Unterordner übertragen, SHA-256 und MCP-Herkunftsangaben prüfen. Danach den
echten 7×2-Bogen vom Firmenrechner übertragen. Proxy-/Webserverlimit bei Bedarf
gezielt bis zur bestehenden App-Grenze von 200 MiB anpassen; hier noch nicht geprüft.

Deaktivieren: `CDR_MCP_BRIDGE_ENABLED` entfernen/auf `0` setzen, App neu starten;
für vollständige Abschaltung des Kopienlesens zusätzlich `CDR_MCP_SOURCE_ROOT`
entfernen. Kopien/Belege für Diagnose behalten, Originale bleiben unverändert.

Ein abgebrochener Prozess kann `.bridge-upload.lock` und `.upload-*` hinterlassen.
Der Empfänger entfernt eine alte Sperre nicht eigenmächtig. Betreiber prüft, ob
noch eine Übertragung läuft, sichert die Reste und gibt dann den Ordner frei.

Für die einmalige Konfigurationsänderung liegt `activate-bridge.py` bei. Als
bestehender App-Benutzer zunächst `check`, nach Freigabe `activate` ausführen.
Es erzeugt ein separates privates Token, einen leeren Kopienordner und eine
Sicherung der bisherigen Konfiguration. Es gibt keine Token aus und startet
die App nicht selbst neu. Vorhandene Quelle/Token werden nicht überschrieben.

## Prüfung

`node --test app/cdr-mcp/*.test.mjs`: 29 synthetische Server-/Engine-/Quellentests.
`python3 -m unittest discover -s ops/cdr-bridge -p 'test_*.py' -v`:
9 Python-Tests: zwei Aktivierungstests (Sicherung, unveränderte Altdaten,
privates Token, Rücknahme bei Fehler) und sieben Clienttests, davon ein kompletter Python→Node→Datei→HEAD-Durchlauf
über Loopback-HTTP; TLS-Vorgaben zusätzlich am Transport geprüft. Geprüft sind u. a. Übertragung,
unveränderte Dateien, getrennte Anmeldung, Pfadgrenzen, Prüfsummenfehler,
Speichergrenze, Sperren und Herkunftsbelege. Diese Prüfungen ersetzen weder den
echten Windows-/Firmenserverlauf noch eine echte CDR-Inhaltsprüfung.

## Auftrag für Claude Desktop am Firmenrechner

> Lies die beiliegende README und führe zuerst nur `cdr_bridge.py` ohne `--send`
> aus. Quelle ausschließlich V:\Produkte oder die entsprechende dokumentierte
> UNC-Freigabe. Ziel zunächst der genaue 7×2-Designbogen. Prüfe Python 3.10+ und
> Dateizugriff, ändere keine Originale. Mit dem bereits aktivierten Plesk-Empfänger und
> lokal bereitgestellten separaten Upload-Token den 7×2-Lauf ausführen und
> `7x2-ergebnis.json` bereitstellen. Token niemals im Chat ausgeben. Keine
> Shopify-Produkte anlegen; zuerst echte D-Nummern/grüne Überschriften und die
> darunterliegenden Gravurfassungen gemeinsam prüfen.
