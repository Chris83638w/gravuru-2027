# Automatische getrennte Installation · 10.10.2026

Version **`0.1.0-recovery.20261010+a9bfbfbc463e`**, Quellcommit `a9bfbfbc463e8eb54903097873f6e240a3c8a392`. Produktcode einschließlich der wiederhergestellten Arbeiten bis `6f384f4`; keine Rücksetzung auf `a2af162`.

- ZIP: `gravuru-2027-0.1.0-recovery.20261010.zip`, **27.212.538 Bytes**, 371 Einträge einschließlich Manifest, 370 manifestierte Dateien.
- SHA-256: `551ef1c8ddd985cfd55ad5730bb8d5586ab0090bc75fe3703ae515a5eeee78c5`.
- `install.py` ist der mitgelieferte Installer; `SHA256SUMS` sichert ZIP und Installer zusätzlich gemeinsam.
- Keine Datenbank, Kundenbestellung, privaten Originaluploads oder Zugangsdaten. Das Paket enthält die Operator-Testlaufzeit und den aktuellen Code der Händlerlaufzeit. Standardstart ist die geschützte Operator-Testinstanz; dies ist keine fertige Shopify-Verkaufsfreigabe.

## Installation

Linux x86_64 mit Node.js 24+, npm, Python 3.11+ einschließlich `venv`, `flock` und Systembibliothek `libcairo.so.2`. Netzwerkzugriff zum Python-Paketindex erforderlich. Die unmittelbaren Python-Abhängigkeiten sind versioniert; die tatsächlich getesteten transitiven Versionen stehen im Prüfbericht. Keine Zusage eines dauerhaft netzunabhängigen Builds. Optional kann `--wheelhouse /absoluter/pfad` eine vorbereitete vollständige Wheelsammlung verwenden.

Die drei Dateien ZIP, `install.py` und `SHA256SUMS` aus diesem Ordner herunterladen. Prüfen:

```sh
sha256sum --check SHA256SUMS
```

Zwei **neue absolute Verzeichnisse** unter einem bestehenden, für den Anwendungseigentümer schreibbaren Elternordner wählen. Keine Git-Verzeichnisse, keine vorhandene Installation oder öffentliche Dokumentenablage verwenden. Beispiel mit bewusst nicht öffentlicher Testadresse; für eine spätere eigene Instanz die Origin ausdrücklich auf deren neue HTTPS-Adresse setzen:

```sh
python3 install.py \
  --archive gravuru-2027-0.1.0-recovery.20261010.zip \
  --sha256 551ef1c8ddd985cfd55ad5730bb8d5586ab0090bc75fe3703ae515a5eeee78c5 \
  --target /srv/gravuru-recovery-20261010 \
  --private-root /srv/gravuru-recovery-private-20261010 \
  --origin https://recovery.example
```

Der Installer verifiziert zuerst ZIP-Prüfsumme, vollständige Dateiliste und jede Manifestprüfsumme, verweigert unsichere Archive und vorhandene Zielverzeichnisse und erstellt danach die neue App. Er erzeugt eine private Konfiguration (0600 in Ordner 0700), ein zufälliges separates Testpasswort und eine eigene Python-Umgebung. `plesk:prepare` und `plesk:check` werden automatisch ausgeführt. Erfolg steht in `INSTALL-RECEIPT.json` im privaten Ordner. Bei Fehlern bleiben ausschließlich die neu erstellten Verzeichnisse zur Diagnose erhalten; keine automatische Löschung oder Wiederverwendung fremder Daten.

Es wird **kein Dienst gestartet, keine Domain angelegt und keine bestehende Plesk-/Shopify-Konfiguration verändert**. Für den späteren Start dieser neuen Instanz den Pfad ihrer privaten `config.json` als `GRAVURU_TEST_CONFIG_FILE` setzen und `node app.cjs` im neuen App-Verzeichnis ausführen. Die HTTPS-/Proxy-Konfiguration der eigenen neuen Site folgt `INSTALLATION.md` im ZIP. Nur `public/` darf Dokumentenroot sein. Benutzername/Passwort ausschließlich aus der privaten Konfiguration lokal sicher übernehmen, nicht in Git, Chat oder öffentliche Dateien kopieren.

Ein erneuter Installationsaufruf auf dieselben Verzeichnisse wird absichtlich verweigert. Es gibt keinen automatischen Live-Update- oder Datenbank-Migrationsmodus.

## Tatsächlich geprüft

Der mitgelieferte Installer wurde mit genau diesem ZIP in neuen temporären App-/Daten-/Python-Verzeichnissen ausgeführt. Installation aus dem Paketindex, Cairo/SQLite, eigener Startprozess, Authentifizierung, Host-/CSRF-Schutz, private Dateisperren, synthetisches Speichern, Prozessneustart und Einprozesssperre bestanden. Manipulierte Prüfsumme, manipulierte Manifestdatei und vorhandene Zielverzeichnisse werden vor Änderungen zurückgewiesen. [Maschinenlesbarer Installationsnachweis](../../recovery/2026-10-10/INSTALL-TEST.json).

Weitere Prüfergebnisse und Grenzen: [Sicherungsbericht](../../recovery/2026-10-10/REPORT.md). Lokale simulierte HTTPS-/Shopify-Identität ist keine neue Server-, echte Shopify-Anmelde-/Bestell- oder physische Druckabnahme.

Der neuere Händlerstart ist außerdem im gesicherten bestehenden Paket unter `../shopify-merchant-20261009/` erhalten. Historische Installation und aktuelle Quellsicherung klar unterscheiden; nichts über die Live-Werkstatt entpacken.
