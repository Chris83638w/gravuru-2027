# Tatsächlich ausgeführter Frischkopie-Starttest

Datum: 23.09.2026. Keine Shopify- oder Main-Änderungen.

## Testaufbau

1. Ressourcenpaket nach `design/aosu-labrador-2026-09-23` gepusht.
2. Direkt von GitHub mit `git clone --single-branch --branch design/aosu-labrador-2026-09-23 ...` in einen zuvor nicht existierenden Testordner geklont. Kein Kopieren der ursprünglichen Werkstatt oder `.preview`, kein alternates-/Hardlink-Clone.
3. Python im isolierten Modus (`-I`, keine User-Site-Pakete/PYTHONPATH) gestartet.
4. Erster Durchlauf: `start-preview.py --check`, danach Server auf Port 8945. 103 Ressourcen erfolgreich geprüft, HTML aufgebaut, Vorschau im Browser geladen.
5. Zweiter Durchlauf aus einem weiteren neuen GitHub-Clone des Commits **4789fe2e49197fb6e9518a23a9a8884371c65235**: `python -I designs/aosu-labrador/start-preview.py --port 8946 --offline-check`.
6. HTTP 200 und CSP-Header nachgewiesen. `connect-src 'self'`, `img-src 'self' data: blob:`, lokale Frames/Schriften; keine externen Runtime-Downloads zulässig.
7. Browseransicht erfolgreich: Labrador, Familie/Müller/22, Klingel, Stahl-/Acrylansicht, Optionen und deaktivierter Warenkorb sichtbar. Hilfslinien initial aus. Browser-Fehler-/Warnungsprotokoll für diesen Durchlauf leer.

Die folgende Dokumentation ergänzt den getesteten Commit. Runtime, Gestaltung und Starter werden dadurch nicht geändert. Die Ressourcenliste enthält nach Aufnahme dieses Berichts eine zusätzliche Dokumentdatei.

## Werkzeuge

- Betriebssystem: Windows, PowerShell.
- Python 3.12.14; ausschließlich Standardbibliothek zum Prüfen/Bauen/Starten.
- Git 2.53.0.windows.3.
- Browser: Codex In-app Browser (Chromium-basiert). Exakte Engine-Buildnummer nicht separat erhoben; keine plattformübergreifende Abnahme.
- Node 24.19.0 lokal festgestellt, aber im Labrador-Start nicht verwendet.
- fontTools 4.65.0 gehört zur historischen Generierung, nicht zur Einrichtung dieses Starts.

## Datenintegrität

- 51 Bibliothekssegmente gegen die vorhandenen Referenzhashes abgeglichen; Katalogmanifest gegen dokumentierten Kataloghash.
- Design-JSON, Motiv-JSON, Labrador-SVG und beide Michroma-Vektordateien byte-identisch zum Ausgangscommit 78eda72.
- Drei verwendete Bildantworten lokal gesichert; Archiv-/CDN-Abgleich dokumentiert. AOSU-CDN-Datei weicht von der Archivdatei ab und wurde nicht stillschweigend durch diese ersetzt.
- Gezielte Secrets-Mustersuche in neuen Quellen und dekodierten Bibliotheken ohne Fund. Kein umfassendes externes Sicherheitsaudit.
- Keine Datenbanken, Kunden-/Bestellexporte, Login-Dateien oder Vollarchive aufgenommen.

## Aussage und Grenzen

**Nachgewiesen:** Die Labrador-Vorschau startet aus einer frischen GitHub-Kopie ohne das ursprüngliche Vollarchiv, ursprüngliche Werkstattordner, fontTools oder Bibliotheksdateien eines anderen Kontos. Der getestete Initialaufruf funktioniert mit blockierten externen Browserressourcen.

Nicht neu geprüft: Speichern/Wiederöffnen, Fertigungsexporte, Warenkorbübergabe, alle Optionen, vollständige mobile Bedienung, andere Browser/OS, produktive Veröffentlichung und vollständiger Offlinebetrieb sämtlicher Sonderaktionen. Keine bekannten oder neu beobachteten Konfigurator-/Exportprobleme nebenbei repariert. Keine PageSpeed-Bewertung.

Getrennte Werkstatt-Quellreferenz nicht gestartet oder deployed. Ihre Live-Versionszuordnung, Auth-/Backend-Infrastruktur, Medienregister, weitere Admin-Seiten und universeller Checkout bleiben offen. Rechtebelege für 24 zusätzliche Schriftfamilien und individuelle Motive sind im ausgewählten Quellenpaket nicht vollständig vorhanden; siehe RIGHTS-AND-DEPENDENCIES.md.
