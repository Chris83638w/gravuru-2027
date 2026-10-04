# Originaldarstellung: Nutzerkorrektur vom 04.10.2026

Basis `8438bc2a4638c0a2017d98fc9670169661711a1c`, eigener Folgebranch `task/uv-original-preview-20261004`, bestehende verwaltete Cloud-Laufzeit bestätigt. Vorherigen Pilot und private Originaldateien unverändert erhalten. Keine Server-/Shopify-/Produktionsänderung.

## Verbindliche Entscheidung

- Originalgestaltung soll 1:1 übernommen werden; insbesondere die Linien links stimmen für den Nutzer noch nicht.
- Beispielbild bleibt sichtbar und erhält einen anklickbaren Hinweis zum eigenen Fotoupload. Der Hinweis ist Bedienoberfläche, kein Druckmotiv.
- „Pia & Rafael“ bleiben zunächst im Design; der Nutzer hat ausdrücklich bestätigt, dass Kunden die Namen weiter ändern dürfen. Datum und Spruch bleiben ebenfalls unveränderte Vorgaben, keine automatischen Testnamen einsetzen.
- Massive Holzsockel verdecken unten 7 mm der Acrylplatte. Die Angabe meint Einstecktiefe, vom Nutzer bestätigt.

## Tatsächlich geändert und geprüft

Vorbereitungsskript erhält die Fotoebene samt vorhandener Maske/Bildausschnitt als getrennte, geprüfte Beispiel-SVG. Import speichert sie unveränderlich in der privaten Designablage, Zuordnung in `localResources.photoExamples`. Echte Kundenobjekte erhalten weder Beispielbildbytes noch eine Upload-ID. Referenzen/Assetexistenz werden geprüft, beim vollständigen Designerersatz und Entfernen eines Fotofelds aufgeräumt.

Kundenvorschau zeigt die Beispiel-SVG mit „Hier tippen & eigenes Foto hochladen“. Dekorationsflächen fangen den Fotoklick nicht mehr ab. Maus/Touch-Pointer und Tastatur öffnen die vorhandene Dateiauswahl. Nach einem echten Upload verschwinden Beispielfoto und Hinweis; Maske/Position bleiben unverändert. Die separate Vorschau ist nicht in `el.svg()` enthalten und ersetzt keine Produktionsmedien.

Ausgeführte Prüfung in dieser Cloud:

- `PYTHONPATH=/workspace/gravuru-2027-cloud-acceptance/.local-data/python npm test`: **152 bestanden, 0 Fehler, 0 Skips**.
- Build über vorhandene `build({outputDirectory})`-Funktion: **76 Ressourcen, 1 Modell**.
- Neues privates Pilotpaket aus unveränderter SVG erstellt. Separate private Entwicklungsdatenbank und geschützte Loopback-Vorschau, Port 8965; kein Bestandsrestore.
- Cloud-Chromium: unveränderte Namen/Datum/Spruch, Beispielbild schon vor Upload sichtbar, direkter Klick und Enter öffnen Dateiauswahl, Fotowechsel entfernt Hinweis und erhält Geometrie, Namen bleiben bearbeitbar, Neuladen zeigt ursprüngliche Vorgaben, 0 JavaScript-Seitenfehler. Desktop 1512×1080 und Mobil 390×844 angesehen.
- Holzsockel Eiche gewählt; gemeinsame Regel liefert 7 mm. Unterkante der Textobjekte liegt in der aktuellen 93-%-Einpassung oberhalb y=193 mm. Dies bestätigt diesen Vorschauzustand, keine neue Druckfreigabe und keine 1:1-Originalgeometrie.

Private Screenshots und Paket bleiben außerhalb von Git. Kein veröffentlichter Snapshot, kein öffentlicher Vorschaulink und keine Zusage dauerhafter privater Datenhaltung.

## Offene 1:1-Lücke – keine Abnahme behaupten

Direkter Sichtvergleich des Originalmockups mit der importierten Vorschau zeigt Unterschiede. Die hochgeladene `MASTER-ANLEITUNG.md`, Abschnitt 4, erklärt ausdrücklich: Foto/Olivenzweig wurden rekonstruiert und können vom Mockup abweichen; die Namensschrift ist eine ähnliche verfügbare Schrift, keine nachgewiesene Originalschrift. Das eingebettete SVG ist somit keine identische Ebenenquelle des Originalmockups. Die importierte Liniengeometrie stammt unverändert aus dieser SVG; sie wurde in dieser Korrektur nicht als vermeintlich exaktes Original neu erfunden. Auch die vorhandene 93-%-Einpassung wurde nicht still durch eine andere ungeprüfte Gestaltung ersetzt.

**Beispielbild-Bedienung korrigiert; exakte Linien/Schrift/Originaldarstellung noch nicht erfüllt.** Für nachweisliche 1:1-Übernahme fehlt die zum Mockup gehörende originale bearbeitbare Gestaltung einschließlich tatsächlicher Schrift oder originaler Schriftpfade. Eine Rekonstruktion anhand des PNG wäre als solche auszuweisen und visuell zu prüfen. Vor weiterer Serienvorbereitung diese Quelle/Abweichung klären; den Nutzer nicht erneut um das bereits vorhandene ZIP bitten. Kein anderer Agent gestartet.
