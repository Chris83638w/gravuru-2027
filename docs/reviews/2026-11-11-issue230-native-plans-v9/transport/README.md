# Kompakter nativer Plantransport v9

Vorgesehener Repositorypfad: `docs/reviews/2026-11-11-issue230-native-plans-v9/transport/`. Dieser Ordner ist als eigenes Staging für Root vorbereitet; nur Root übernimmt und veröffentlicht ihn im Arbeitszweig.

Enthalten sind sieben vollständige native `plan.json.gz` und sieben `source-document.json.gz`, jeweils aus dem unveränderten v9-Lauf. Die Komprimierung verändert keine JSON-Bytes. Daneben liegen die kleinen Pair-, Quellenmetadaten- und Vorlagenbelege sowie Entscheidungen und Prüfübersichten. Keine SQLite-Datenbank, kein Git-Verzeichnis und kein Serverpaket sind enthalten. Bereits vorhandene Katalog-/Medienressourcen werden nicht erneut als separates Assetpaket übertragen; eingebettete native Ressourcen bleiben in den originalen JSON-Dateien erhalten.

Die Nutzdaten umfassen **68.985.006 Bytes** (65.79 MiB); die größte Einzeldatei umfasst **15.283.191 Bytes** (14.58 MiB). Jede Datei liegt unter der konservativ gewählten Transportgrenze von 50 MiB. Nur die sieben vollständigen Pläne umfassen zusammen 32.86 MiB; Quellen können bei Bedarf separat gelesen werden.

## Lesen und prüfen

Aus beliebigem Arbeitsverzeichnis mit Node.js:

```text
node PFAD_ZUM_TRANSPORT/verify-transport.mjs
```

Der Prüfer ist rein lesend, benötigt nur Node-Standardmodule und prüft alle transportierten Datei-SHA-256-Werte, 14 Entpackungs-SHA-Werte, sieben native Planhashes, sieben kanonische Quellenhashes sowie die Anzahl 823. Er benötigt weder SQLite noch Zugangsdaten oder Netzverbindung. Der Manifest-Hash ist zusätzlich in `SHA256SUMS.txt` enthalten. Der Prüfer ersetzt keinen unabhängig übertragenen Hashanker und keine fachliche Zielabnahme.

Ein vollständiger Plan lässt sich direkt im vorhandenen Import-/Analysecode lesen, ohne eine Datenbank zu übernehmen:

```js
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const plan = JSON.parse(gunzipSync(readFileSync(planGzipPath)));
// Native Produktdaten: plan.products[0].document
```

Die tatsächlichen sieben Pfade, unveränderten Planhashes und vorgesehenen Shopziele stehen in [TARGETS.md](TARGETS.md) und maschinenlesbar in `manifest.json`. Die vorhandene v9-Summary enthält historische lokale Abnahmestatusformulierungen und bleibt als Originalbeleg unverändert; das konkrete weitere Vorgehen richtet sich nach dieser Zielmatrix und den bereits bestätigten Entscheidungen. Es ist keine weitere Nutzerfragerunde vorgesehen.

## Grenzen

Keine Bestätigung/Ausführung oder Zielregistry-Änderung wird durch Kopieren oder Prüfen ausgelöst. Lokale Plan-IDs werden nicht als bereits vorhandene Produktions-IDs ausgegeben. Die sechs Kleinprodukte sind nach vorherigem Dublettencheck als Neuanlagen vorgesehen; das Hauptacryl 16190784602492 wird unter Erhalt seiner tatsächlichen bestehenden Identität aktualisiert. Die 30 bisherigen Hauptvarianten außerhalb des 778-Solls bleiben als gesonderter Zielabgleich sichtbar, ohne pauschale Löschanweisung.
