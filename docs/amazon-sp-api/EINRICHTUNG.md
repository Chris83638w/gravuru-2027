# Lokale Sandbox einrichten und prüfen

Diese Anleitung gilt ausschließlich für den separaten Entwicklungsstand. Es erfolgen keine produktiven Amazon-Abfragen, keine Bestelländerungen und keine Labelkäufe.

## Voraussetzungen

- Checkout des Branches `task/amazon-sp-api-20261016` mit erhaltenem Sicherungspunkt des vorherigen Stands.
- **Node.js 24**; das Projekt verwendet unter anderem `node:sqlite`. Für die Amazon-Module sind keine zusätzlichen npm-Abhängigkeiten erforderlich.
- Für die echte statische Sandboxprüfung: autorisierter Sandbox-Zugang in einer privaten Datei **außerhalb** des Git-Repositorys.
- Für reine synthetische Beispiele ist kein Amazon-Zugang erforderlich.

Alle folgenden Befehle werden im Repository-Verzeichnis ausgeführt. Ein vorhandener Arbeitsstand wird weder zurückgesetzt noch durch einen neuen Clone überschrieben.

```powershell
node --version
git branch --show-current
node scripts/amazon-sandbox-preview.mjs --demo
```

Die Ausgabe nennt die lokale Adresse `http://127.0.0.1:8971/werkstatt/amazon/`. In der Amazon-Seite lassen sich synthetische Beispielpositionen laden und ein Teststorno durchspielen. Ohne Zugangsspeicher ist die echte Sandboxprüfung deaktiviert. Ein anderer freier Port ist mit `--port=8972` möglich.

## Zugangsspeicher

`GRAVURU_AMAZON_CREDENTIALS_FILE` enthält **nur einen absoluten Dateipfad**, keinen Schlüssel oder Token. Unter Windows ist DPAPI verpflichtend; Klartext-JSON wird abgewiesen. Der geprüfte Zugangsspeicher verwendet dieses Format:

```json
{"format":"gravuru-windows-dpapi/v1","data":"<DPAPI-verschlüsselter Inhalt>"}
```

Der Loader entschlüsselt mit Windows DPAPI `CurrentUser`. Die Datei ist an denselben Windows-Benutzer und dessen geschützte Umgebung gebunden. Sie ist kein portables Cloud-Secret. Den Zugriff auf den Ordner und die Datei auf den ausführenden Benutzer und erforderliche Systemidentitäten begrenzen; ein öffentlich lesbarer Speicherort ist ungeeignet. Das vorhandene Sandboxsecret wurde unter diesen Bedingungen verschlüsselt und anschließend erneut erfolgreich getestet.

Nur unter POSIX ist für einen späteren dedizierten SecretStore auch JSON mit den Schlüsseln `clientId`, `clientSecret`, `refreshToken` unterstützt. Diese Werte gehören ausschließlich in den geschützten serverseitigen Speicher. Unter POSIX verlangt der Loader eine reguläre private Datei ohne Gruppen-/Weltrechte, typischerweise Modus `0600`. Die tatsächliche Verschlüsselung des SecretStores bzw. Datenträgers bleibt eine Betriebsanforderung. Keine Klartextdatei in Git, Chat, Frontend oder Kommandozeilenargumente kopieren.

Der Loader lehnt relative Pfade, Symlinks, Dateien im Repository, ungültige Formate und zu große Dateien ab. Entschlüsselungsfehler werden ohne Geheimwerte gemeldet. Für Cloudbetrieb müssen eigene Secretverwaltung und Zugriffsrechte eingerichtet und geprüft werden; das ist nicht Bestandteil dieses lokalen Teststarts.

Beispiel mit einem **anzupassenden privaten Pfad**:

```powershell
$env:GRAVURU_AMAZON_CREDENTIALS_FILE = 'C:\privat\gravuru\amazon-sandbox.json'
node scripts/amazon-sandbox-preview.mjs --demo
```

Danach in der Amazon-Seite **„Amazon-Sandbox prüfen“** ausführen. Der Server lädt die Zugangsdaten; der Browser erhält keine Token. LWA liefert ein kurzlebiges Zugriffstoken, das ausschließlich im Arbeitsspeicher zwischengespeichert wird. Wiederholte Anforderungen teilen eine laufende Token-Erneuerung.

Optional führt folgender Start alle fünf Minuten dieselbe statische Prüfung aus:

```powershell
node scripts/amazon-sandbox-preview.mjs --automatic
```

`--automatic` benötigt den Zugangsspeicher und ist **kein produktiver Bestellabgleich**. Beenden mit Strg+C beendet Server und Timer. Eine laufende Vorschau nicht parallel auf demselben Port starten.

## Erwartetes Testergebnis

Der feste Sandboxaufruf lautet `GET /orders/2026-01-01/orders/171-9876543-2109876`. `probeSandbox()` nutzt die im offiziellen Modell vorgeschriebenen Fixture-Parameter und einen fest vorgegebenen Sandboxhost. Die enthaltenen Käufer-/Empfängergruppen gehören ausschließlich zu diesem synthetischen Amazon-Testfall; die Antwort wird vor Rückgabe auf freigegebene Felder reduziert. Reguläre Auftragsmethoden lassen diese Datengruppen nicht zu.

Das öffentliche Beispiel liefert einen Echo Dot mit **BRL 299,90** und Marktplatz **Amazon.com.br**. Das gilt auch beim Aufruf des EU-Sandboxhosts. Es ist kein Nachweis einer deutschen Bestellung, kein Umsatz der gravuru GmbH und keine Währungsumrechnung. Der Import muss Herkunft und BRL erhalten.

Ein wiederholter Import darf keine zweite identische Auftragsposition erzeugen. SKU-Zuordnung und Prüfstandverknüpfung bleiben innerhalb der vorhandenen Werkstatt. Testpositionen lösen keine reale Fertigung aus; fehlende Personalisierung oder Änderungen können die Bearbeitung sperren.

Testdaten liegen getrennt unter `.local-data/amazon-sandbox/`, einschließlich `workshop.sqlite` und generierter Vorschau. Diese Laufzeit öffnet nicht die vorhandene reguläre Werkstattdatenbank. Keine Datendateien einchecken oder vorhandene Bestände zum Testen löschen.

## Automatisierte Prüfungen

```powershell
node --test app/workshop/amazon-*.test.mjs
npm test
```

Die automatisierten Tests verwenden injizierte Netzwerkantworten bzw. synthetische Daten. Sie benötigen keinen echten Token. Getestet werden unter anderem API-Guards, Tokenverwaltung, Wiederholungen, Datenminimierung, Importidentität, Änderungen, Zuordnung, Custom-Dateigrenzen und fachliche Vorschauen. Der [echte Netzwerknachweis](nachweise/sandbox-probe-2026-10-16.json) ist separat dokumentiert und wird durch Unit-Tests nicht ersetzt. Zahlen und Browserbefunde stehen im [Abnahmeprotokoll](ABNAHME.md).

Einige bestehende Regressionstests verwenden Python mit `openpyxl`. Falls ein Windows-Python-Alias statt des eingerichteten Runtimes aufgerufen wird, `GRAVURU_PYTHON` auf dessen absoluten ausführbaren Pfad setzen und die betroffenen Prüfungen erneut ausführen. Das ist unabhängig von den reinen Amazon-Clienttests.

## Fehler einordnen

| Zustand | Vorgehen |
|---|---|
| Kein Zugangsspeicher | Synthetische Beispiele verwenden oder serverseitigen Dateipfad korrekt setzen |
| Credential-Datei abgewiesen / DPAPI nicht lesbar | Absoluten Pfad, Dateirechte, Repositorygrenze, Format und Windows-Benutzer prüfen; keine Werte ausgeben |
| LWA 401/ungültige Autorisierung | App und Sandbox-Autorisierung im Portal prüfen; keine Token in Tickets oder Logs übernehmen |
| API 403 | Operation/App-Berechtigung prüfen; der Client wiederholt 403 nicht automatisch |
| API 429 | Quoten beachten; begrenzter Backoff und `Retry-After` sind implementiert |
| Langer `Retry-After` | Später neu versuchen; keine aggressive Warteschleife |
| Sandboxerfolg mit BRL/Brasilien | Erwartetes öffentliches Fixture; keine Marktplatzberechtigung daraus ableiten |
| Produktionsclient übergeben | Integrierter Service lehnt ihn ab; es gibt keinen HTTP-Schalter zur Freigabe |

Der nächste produktive Schritt wird erst nach Vorliegen der in [Berechtigungen](BERECHTIGUNGEN.md) und [Sicherheit](SICHERHEIT-UND-AUFBEWAHRUNG.md) genannten Nachweise vorbereitet und konkret freigegeben.
