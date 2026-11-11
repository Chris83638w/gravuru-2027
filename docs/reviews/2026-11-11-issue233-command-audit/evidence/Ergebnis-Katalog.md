# Katalogübernahme erfolgreich

**11.11.2026, 18:02:53 Uhr MEZ:** Der Serverkatalog wurde von `b5d8f28bc1b634412e628c2967fde587a92ff2fb` auf den beauftragten Stand `8236b8bfab7322447ec46661c116fa526331af3d` übernommen. Die anschließende Serverprüfung ist erfolgreich.

| Ergebnis | Nachweis |
|---|---|
| Katalogdateien übernommen | **552: 168 neu, 384 geändert** |
| Vollständige Nachprüfung | **553 endgültige Dateiprüfsummen korrekt** |
| Sicherung | **385 vorhandene Dateien geprüft gesichert**, dazu die vorherige Abwesenheit der 168 neuen Dateien; ursprünglicher Git-Index und HEAD gesichert |
| Bestehende Werkstattbearbeitungen | **Alle 3 erhalten**: D20-JSON, D20-SVG und Änderungsprotokoll |
| SVG | Bytegleich zur vorherigen lokalen Bearbeitung |
| JSON | Lokale Gestaltung und neue Katalogregeln zusammengeführt |
| Änderungsprotokoll | Ergänzungen beider Seiten erhalten |
| Abschluss | Richtiger Branch und Zielstand, genau 3 verbleibende lokale Änderungen, **keine Schreibsperre und kein offenes Schreibjournal** |

**Shopify-Produkte: 0 neu, 0 überarbeitet.** Dieser Lauf aktualisierte den Serverkatalog. App-Dateien blieben unverändert; es gab keinen Neustart.

Vor dem Lauf wurde um **18:00:33 Uhr MEZ** der alte Stand erneut geprüft. Die Prozessprüfung fand unter 9 Prozessen desselben Benutzerkontos keine passenden Git-/Import-Schreiber, keine Schreibsperren und keine unlesbaren Prozessangaben. Die gelesene `app.cjs` verweist direkt auf den vorgesehenen Katalogordner. Der native Katalog-Schreibschutz sicherte zusätzlich den Übernahmelauf ab.

Der verwendete Übernahmeprüfer V2 stammt unverändert aus Commit `8ab147140f305ea1f6a47b4e106b7af3367bc76d`. Seine Prüfsumme wurde vor Ausführung kontrolliert. Die unabhängige lokale Prüfung bestand **8 von 8 Tests**, einschließlich Erhalt der lokalen Änderungen und gezielt ausgelöster Rücknahme nach einem Fehler.

## Sicherung und Belege

Privater Sicherungsordner auf dem Server:

`/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-catalog-ff-20261111/2026-11-11T17-02-47-073Z-0c6e01f5-07e2-4d44-ba86-fc5e623c5f6e`

Darin liegen der Erfolgsbeleg `success.json`, der ursprüngliche Zustand `before.json`, die gesicherten Dateien und der ursprüngliche Index/HEAD.

- [Server-Nachprüfung als Bild](Server-Nachpruefung.jpg)
- [Zurückgelesene Serverergebnisse](Server-Nachpruefung.txt)
- [Kundenkonfigurator nach der Übernahme](Kundenkonfigurator-danach.jpg)
- [Gelesener Zustand des Kundenkonfigurators](Kundenkonfigurator-danach.txt)
- [Strukturierter Prüfbeleg](Pruefbeleg.json)

## Sichtprüfung des vorhandenen Kundenkonfigurators

Der vorhandene Edelstahl-Konfigurator wurde nach der Übernahme erfolgreich geöffnet: **12 × 8 cm, 19,99 €, 21 verfügbare Designs**. In der geöffneten Designliste stehen die originalen Textvorlagen zuerst, beginnend mit „Zwei Zeilen, mittig“, „Zwei Zeilen, versetzt“ und „Zwei Zeilen mit Trennlinie“. Einzelne weiter unten liegende Vorschaubilder waren im gespeicherten Seitenzustand noch als nachladend gekennzeichnet.

Dies ist eine begrenzte Sichtprüfung des bestehenden Produkts. Es wurde kein Warenkorbknopf betätigt; die sieben neuen Produktpläne und eine Freigabe der 1.298 Designs wurden damit nicht geprüft.

## Noch getrennt abzunehmen

Die sichtbare Werkstattprüfung einschließlich Ladezeit und Reihenfolge der Designs nach der Katalogübernahme folgt separat. Es liegt keine neue Laufzeitmessung der Werkstatt vor. Dieser Bericht behauptet keine vollständige Browser-/Warenkorbabnahme, keine Freigabe der 1.298 Designs und keine neue Veröffentlichung im Kundenkonfigurator. Die weitere Designfreigabe liegt laut Übergabe beim Operator.
