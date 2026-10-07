# Gespeicherte Excel-Serien und Ausführungsgruppen – 07.10.2026

Basis `79c570061141c8c432e90962c19ed8845cad62b5`, Branch `test/saved-excel-resume-20261007`. Vorhandener Neuaufbau und Browserabnahme `0202493f715d53316eb893e94fb672c4ac8eeb04` erhalten. Keine neue Umgebung, keine Migration und keine Live-Veröffentlichung.

## Ergebnis

Die gezielte Bedienprüfung beider gespeicherter Importarten ist bestanden. Ein reproduzierter Bedienfehler wurde in beiden Oberflächen behoben: Scheiterte das erneute Öffnen einer gespeicherten Prüfung, blieb vorher der alte Prüfplan anwendbar. Jetzt wird die Übernahme sofort gesperrt und erst nach erfolgreicher erneuter Prüfung freigegeben. Die bisherigen Eingaben bleiben für Wiederholung, Bericht und Speicherung erhalten; eine verständliche Meldung erklärt den nächsten Schritt. Backend, Datenbankschema, Preis-/Geometrieprüfung und Importjournal unverändert.

Tatsächlich im Chromium mit echten XLSX-Dateien und temporären synthetischen Daten geprüft:

- Drei Produkte, davon ein ungültiger Preis: privat speichern, identisch erneut speichern, neu öffnen ohne erneute Dateiauswahl; Speichern erzeugt noch kein Produkt.
- Zwei gültige Produkte ausdrücklich übernehmen; nach erfolgreicher Speicherung die HTTP-Antwort im Browser verwerfen. Echter Server-/SQLite-Neustart, gespeicherte Prüfung wieder öffnen: zwei vorhandene Produkte erkannt.
- Fehlerdatei über die Oberfläche herunterladen: genau eine Produktzeile und ihre Design-Kindzeile, festgehaltener Masterstand. In Excel korrigieren, als neuen Prüfstand speichern, wieder öffnen, genau ein Produkt ergänzen. Wiederholung erzeugt null Produkte; vorhandene Dokumente, beide Designs und Standardauswahl bleiben erhalten.
- Dasselbe für drei Ausführungsgruppen mit je zwei Varianten: zwei Gruppen übernehmen, Antwortverlust und Prozessneustart, Fehlerdownload mit genau einer Gruppe und **beiden** Varianten. Eine Produktrevision ausdrücklich korrigieren; genau eine Gruppe ergänzen, Wiederholung null. Gruppenstände, Produktdokumente und Produktrevisionen bleiben erhalten.
- Getrennte Listen für Produkte/Gruppen. Entfernen einer gespeicherten Prüfung zunächst abbrechen, dann bestätigen: Produkte, Gruppen und Importhistorie bleiben erhalten.
- Bei Produkt- und Gruppenänderung HTTP-503 beim Öffnen simulieren: alter Prüfplan gesperrt, Eingaben erhalten, erfolgreicher Wiederholversuch möglich.
- Parallel geänderte Produkt-/Gruppenrevision beim Wiederöffnen als Fehler anzeigen. Fehlerdatei und gespeicherte Eingabe behalten `expected_revision=1`. Erst die ausdrückliche Korrektur auf Revision 2 und erneute Vorschau erlauben das Update auf Revision 3; sämtliche anderen Dokumentfelder unverändert.
- Desktop 1440, Mobil 390 und Tablet 768 ohne horizontalen Seitenüberlauf; keine JavaScript-Fehler. Vier Screenshots gesichtet.

## Nachweise

```sh
PYTHONPATH=.local-data/python python scripts/check-saved-excel-resume.py
PYTHONPATH=.local-data/python python scripts/check-saved-excel-conflicts.py
node --check app/workshop/ui/batch-ui.mjs
node --check app/workshop/ui/variant-batch-ui.mjs
git diff --check
```

Beide finalen Browserläufe PASS, zusammen sieben dokumentierte Ablaufgruppen. Der Konfliktlauf schlug vor der Produktkorrektur gezielt für beide weiter aktiven Übernahmebuttons fehl. Anschließend beide betroffenen Browserläufe erneut bestanden. Jeder Fixture-Build: 76 Ressourcen, 1 Modell, 461440 Editor-Bytes. Bestehende Backend-Lastprüfungen (100 Zeilen/97+3) und allgemeine Browserabnahmen nicht wiederholt oder als neue Ergebnisse gezählt.

[Wiederaufnahmebericht](saved-excel-resume-20261007/resume-report.json) · [Fehler-/Konfliktbericht](saved-excel-resume-20261007/conflict-report.json)

[Produkte mobil](saved-excel-resume-20261007/products-mobile.png) · [Gruppen Desktop](saved-excel-resume-20261007/groups-desktop.png) · [Gruppen mobil](saved-excel-resume-20261007/groups-mobile.png) · [Gesperrte Übernahme nach Ladefehler](saved-excel-resume-20261007/products-load-error.png)

## Grenzen und Fortsetzung

Keine privaten Bestandsdaten geöffnet, keine Shopify-/Plesk-Anfrage, kein Deployment. Loopback-Browserprüfung unter vorhandenen Host-/Origin-/CSRF-Regeln; keine echte Shopify-Händleranmeldung. Appseitige Persistenz ist keine Zusicherung dauerhafter Cloud-Ablage.

Plesk-Einrichtung ist auf Nutzerwunsch pausiert. Echte Shopify-Anbindung bleibt offene Folgeaufgabe: sichere Anmeldung des eigenen App-Prozesses, geschütztes HTTPS-Testbackend, echte Testvariantenbindung und Testbestellung. Der zuvor bestätigte lesende Connectorzugriff ersetzt diese Voraussetzungen nicht.

Nächstes unabhängiges vereinbartes Paket innerhalb Bestellung/Produktion: die noch nicht visuell abgenommene Händlerbedienung der kaufgebundenen Test-Dateifreigabe einschließlich Widerruf mit synthetischer Anmeldung prüfen (siehe `INTEGRIERTER-ABSCHLUSS-20261006.md`). Kein echter Kundenkontoanschluss oder Zahlungserfolg wird dadurch behauptet.
