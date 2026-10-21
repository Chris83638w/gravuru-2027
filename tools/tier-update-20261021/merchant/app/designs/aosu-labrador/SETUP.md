# Labrador-Vorschau aus einer frischen Arbeitskopie

## Voraussetzungen

- Git für den Abruf des privaten Repositorys, mit eigenem berechtigten GitHub-Zugang.
- Python 3.12.14 wurde getestet. Der Start verwendet nur die Python-Standardbibliothek; keine pip-Pakete, keine Node-Installation, keine Zugangsdaten und kein Vollarchiv erforderlich.
- Aktueller Chromium-basierter Browser mit SVG, Custom Elements, `structuredClone` und `DecompressionStream`. Andere Browser sind nicht abgenommen.
- Lokale HTTP-Verbindung zu 127.0.0.1. Nicht durch Doppelklick auf HTML starten.

## Einrichtung und Start

In PowerShell (Python muss als `python` verfügbar sein; alternativ unter Windows `py -3.12` verwenden):

```powershell
git clone --single-branch --branch design/aosu-labrador-2026-09-23 https://github.com/Chris83638w/gravuru-shopify.git gravuru-work
Set-Location gravuru-work
git rev-parse HEAD
python --version
python designs/aosu-labrador/start-preview.py --check
python designs/aosu-labrador/start-preview.py --port 8943
```

Dann http://127.0.0.1:8943/.preview/ öffnen. Falls der Port belegt ist, beispielsweise `--port 8945` verwenden und den Link entsprechend ändern. Beenden mit Strg+C. Auf macOS/Linux `python3` verwenden; diese Betriebssysteme wurden nicht separat getestet.

Strenger Starttest: `python -I designs/aosu-labrador/start-preview.py --port 8946 --offline-check`. `-I` ignoriert benutzerspezifische Python-Paketpfade; `--offline-check` setzt einen CSP-Header, der externe Browserressourcen blockiert. Das ist eine isolierte Prüfoption, keine Änderung an der Gestaltung oder am Referenzrenderer.

Der Starter verifiziert zuerst die Ressourcen anhand von SHA-256, erzeugt ausschließlich `.preview/` und bindet den Server nur an Loopback. `.preview/` ist generiert und wird nicht eingecheckt. Die freigegebenen Design-, Motiv- und Schriftdaten werden gelesen, nicht neu gezeichnet oder überschrieben.

Bei Prüfsummenfehlern nicht einfach die Liste neu erzeugen: zuerst Ursache und beabsichtigte Änderung prüfen. `refresh-inventory.py` ist nur für gepflegte Paketänderungen, nicht zur Umgehung fehlgeschlagener Integritätsprüfungen.

## Netzwerk und Abgrenzung

Für Clone beziehungsweise Python-/Browserinstallation wird Netzwerk benötigt. Nach Einrichtung benötigt das Laden der Labrador-Vorschau keine Shopify-CDN-Dateien mehr. Katalog, 51 Segmente, Schrift, Motiv, Klingel, Schraube und Edelstahltextur liegen lokal vor. SVG-Namespace-URLs sind keine Downloads.

Im unveränderten Referenzcode stehen weiterhin Shopify-Links, historische Produkt-/Variantenkennungen und Funktionen für spätere Bestell-/Hilfeflüsse. Diese Integrationen werden durch diesen lokalen Start nicht bereitgestellt oder getestet. Bestellung bleibt deaktiviert; keine echten Bestellungen ausführen. Links zu Versandbedingungen sind hier keine vollständige Shopseite. Ein vollständiger Offlinebetrieb sämtlicher Sonderaktionen wird nicht behauptet.

## Versionen und Herkunft

- Grundlage: Branchstand `78eda721adb48de7b0a643cb1d7962fdaf5229e8` einschließlich Abschnitt 21.
- Renderer bleibt die dokumentierte Variante-M-Referenz `variant-c-funkklingel/v5`.
- Profilrevision bleibt `modelle-live-20260919-v1`.
- Python zur Prüfung: 3.12.14; keine Python-Drittanbieterabhängigkeiten für den Start.
- Frühere Schriftgenerierung verwendete fontTools 4.65.0. Die erzeugten Konturen liegen bereits vor; Regenerierung ist kein Startschritt.
- Werkzeugversionen und tatsächlicher Frischkopietest: siehe `START-TEST.md`.
- Ressourcen mit Pfad, Zweck, Herkunft, Größe und SHA-256: `RESOURCE-INVENTORY.csv` / `.json`.
- Zusätzliche Archivherkunft: `resource-provenance.json`; aktuelle Bildvergleiche: `image-source-verification.json`.

Alle Einzeldateien sind klein genug für die direkte Ablage in diesem privaten Repository. Eine Release-/LFS-Zusatzlösung ist für dieses Paket nicht erforderlich. Keine ZIP-Vollsicherung und keine node_modules werden verteilt.

## Rechte und offene Nachweise

Siehe `RIGHTS-AND-DEPENDENCIES.md`. Die Ablage ist eine interne Projektübergabe im privaten Repository, keine öffentliche Bibliothekslizenz. Produktivfreigabe, Browser-/Exportabnahme und technische Startfähigkeit sind unterschiedliche Nachweise.
