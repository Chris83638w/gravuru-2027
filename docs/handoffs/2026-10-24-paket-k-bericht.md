# Paket K · Handy-Dashboard und echte Schriftvorschau

Stand: 24.10.2026, Codex / Astra. Branch `dev/dashboard-handy-20261024-astra`, Basis [main da750f1](https://github.com/Chris83638w/gravuru-2027/commit/da750f1b4e7079092913d126220bb7e9857e5f47), Katalog [27d46be](https://github.com/Chris83638w/gravuru-katalog./commit/27d46beeae8cd91748ae8096f0bb63a4c550573a). Der Commit dieses Berichts enthält die geprüften neun Code-/Testdateien; ihre SHA-256 stehen im [Prüfnachweis](2026-10-24-paket-k-pruefung.json).

## Ergebnis

Unter 1100 px sind die Filter standardmäßig geschlossen. Nach abgeschlossener Filterwahl klappt die Auswahl zu und die Seite springt zur Designliste; beim Tippen in die Suche bleibt sie ruhig. Unter 640 px startet die Ansicht mit Kacheln. Vorschau, Auswahl und Aktionen sind ohne seitliches Scrollen erreichbar und mindestens 44 px groß. Auch eine ausdrücklich gewählte Tabellenansicht bleibt als beschriftete Karten bedienbar. Vorschau und Bestätigung passen auf 360 px. Beim Drehen bleiben ungespeicherter Name, Markierung und Fokus erhalten.

Die SVG-Route wandelt Texte mit `katalog.fontResources` und `convertFont` in echte Glyphenpfade um. Anker start/middle/end, mehrzeilige tspans mit x/y/dx/dy, Laufweite und Füllfarbe werden berücksichtigt. Die Produktion verwendet Glyphenfortschritte plus Laufweite zwischen Zeichen; Vorschau und Produktion ergänzen kein Kerning oder GSUB/GPOS. Katalogtexte bleiben editierbar. PNG-Auslieferung, Sitzungstoken, `acrylRoute`, CSP und Freigabesperren bleiben erhalten.

Fehlende Schriften/Zeichen oder nicht sicher unterstützte Typografie lassen das ganze betreffende Textelement unverändert. `X-Gravuru-Preview-Warnings` liefert dazu URI-kodiertes JSON, begrenzt und Unicode-sicher. Keine Ersatzschrift wird erzeugt. Der Cache ist auf 64 Vorschauen / 16 MiB und 32 Schriftversionen / 64 MiB serialisierte Ressourcendaten begrenzt; Schlüssel enthalten SVG-Prüfsumme und Schriftstand. Auch nachträglich vorhandene Schriftdateien werden erkannt.

## Prüfungen

**139/139 Tests, 0 Fehler, 0 Skips, 0 Abbrüche**, Windows, Node 24.20.0, Python 3.12.14; 19,42 s. Zwölf Dateien: Dashboard, UI, Startdesigns, Glyphen, Schriftbibliothek, Katalogquelle/-Konvertierung/-Import, Händleranfragen/-Medien, Admin-Host und Acryl-Routing. Bestehende Assertions und Tests erhalten. [Vollständiges Protokoll](paket-k-nachweise/tests.log); exakter Aufruf und Dateiliste im Prüfnachweis. Kein neuer Gesamtvollauf aller Repository-Tests und kein Linux-Lauf.

780 SVG-Dateien / 1.772 Textelemente: **1.758 umgewandelt, 14 mit Warnung erhalten**. Zwei reguläre Designs betreffen Welcome (`TQ-V2A-8x8-D14`) und ParmaPetit (`TO-V2A-9x6-D38`). Weitere zwölf Texte in sechs ausgeblendeten `_testlauf-beispiele` betreffen Champagne&Limousines und MINIMALIST. Alle Fälle stehen im Prüfnachweis. Bei vorhandenen Schriften fehlt kein tatsächlich verwendetes Zeichen.

| Stichprobe | Kalt | Warm | Warnungen |
| --- | ---: | ---: | ---: |
| TRE-V2A-8x5-D57 | 1.072,15 ms | 1,86 ms | 0 |
| TR2-V2A-9x6-D12 | 665,63 ms | 3,12 ms | 0 |

Messung des Renderaufrufs auf Windows, kalt einschließlich TTF-Konvertierung; Katalogöffnung, HTTP und Browserstart ausgenommen. Warme Antwort jeweils bytegleich. Gesamter SVG-Korpus: 13,14 s.

D57 und TR2-D12: alle fünf Textzeilen haben dieselben Glyphenpfade wie Paket J. Nach Anwendung der damaligen Zielgrößen-Matrizen nur für diesen Vergleich beträgt die maximale Abweichung der Glyphen-Hüllboxkoordinaten 0,00000002594 mm bei 0,000001 mm Toleranz. Das Dashboard liefert weiterhin die Mastervorschau. [Geometrienachweis](paket-k-nachweise/j-geometry.json).

Playwright 1.62.1 / Chrome 155.0.8059.85, lokal eingebettet mit synthetischem Sitzungstoken: iPhone-13-Profil 390 × 664, Pixel-7-Profil 412 × 839, zusätzlich Dialoge bei 360 × 740. Geprüft: Filter, Kacheln, Tippflächen, Überlauf, Vorschau vor Auswahl, Bestätigungsdialog und Namensentwurf beim Drehen. **78 Anfragen, 0 Schreibzugriffe**, alle API-Anfragen authentifiziert, keine Browserfehler. Die Bestätigung wurde abgebrochen. Geräteemulation, keine physischen Telefone und keine Live-Shopify-Abnahme.

Desktop 1280 × 900: Startansicht vor/nachher byteidentisch; Tabellenbilder liegen in dieser Aufnahme unterhalb des sichtbaren Ausschnitts. Der bestehende horizontale Desktop-Überlauf (Dokumentbreite 1463 px) bleibt unverändert. Die Handyansichten haben keinen seitlichen Überlauf.

1.843 erworbene Katalogquelldateien, darunter 780 Design-JSON, 780 SVG und 81 Schriftdateien, gegen den Git-Stand geprüft und nach den Tests erneut unverändert gehasht. Historische `designs/bestand` und 116 andere, hier nicht benötigte Artefakte waren nicht Teil der lokalen Kopie. Keine Katalogänderung oder Schriftdatei im Code-PR. Alle geänderten Textdateien LF. Getrennte Code-Reviews ohne offene P1/P2.

## Screenshots

| Profil | Liste | Echte Schriftvorschau | Bestätigung |
| --- | --- | --- | --- |
| iPhone 13 | [Liste](paket-k-bilder/iphone-13-liste.png) | [D57](paket-k-bilder/iphone-13-vorschau.png) | [Dialog](paket-k-bilder/iphone-13-bestaetigung.png) |
| Pixel 7 | [Liste](paket-k-bilder/pixel-7-liste.png) | [TR2-D12](paket-k-bilder/pixel-7-vorschau.png) | [Dialog](paket-k-bilder/pixel-7-bestaetigung.png) |

[360 px Vorschau](paket-k-bilder/handy-360-vorschau.png) · [360 px Bestätigung](paket-k-bilder/handy-360-bestaetigung.png) · [Desktop vorher](paket-k-bilder/desktop-1280-vorher.png) · [Desktop nachher](paket-k-bilder/desktop-1280-nachher.png).

## Übergabe an Claude

PR gegen main prüfen, insbesondere echten eingebetteten Token-Pfad und Glyphen-Fallbacks. Danach liegt die Merge-Entscheidung bei Claude. Kein Merge, kein Livezugriff und keine Designfreigabe durch Astra; Chris' Designprüfung bleibt erforderlich. Fehlende Katalogschriften sind als Quellenbefund dokumentiert, nicht durch Ersatz oder Datenänderung verdeckt.
