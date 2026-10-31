# PR #80: Review-Korrektur und Logo-Paketnachweis

Stand: 31.10.2026. Branch `dev/konfi-master-fixes-20261031-astra`, vor diesem Nachtrag `7eceb7d12d75ca012fa900e1302ef5c1aec4304e`. Chris: „hast eine nachricht. führe es direkt aus, hast das okay“. Aktuelles `main` beim Abruf: `06f5ba7537f6cedc9aaf7dbae0c810fa71167697`.

## Verbindliche fachliche Abgrenzung

- [Nachricht 27](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6541700225): alter Bohrloch-Test in `app/platform/sources/app/shared/models/contour-geometry.test.mjs` korrigieren; echte Bohrungsprüfungen behalten. Logo-Abhängigkeiten auf Plesk nur lesen.
- [Nachricht 28](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6541726181) ersetzt Punkt 2 aus Nachricht 27: **Kunden-Konfigurator** erlaubt Gestaltung über Löchern. **Werkstatt/Prüfstrecke** verlangt weiterhin eine Prüfung bei `text_near_hole`, damit angebotene Vorlagen sauber sind. `design-target-rules.mjs` und dessen Tests bleiben unverändert.
- [Nachricht 29](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6541845053): Gravur bis zum Rand ist auch in der Prüfstrecke zulässig. Claude hat dafür [Katalog-PR #10](https://github.com/Chris83638w/gravuru-katalog./pull/10), `bfe509c`, vorbereitet. Diese Runde verändert keine Katalogdaten. Reihenfolge: Testkorrektur → Claudes erneute Prüfung → später #80 und Katalog-PR #10 zusammen veröffentlichen.

## Genau diese Korrektur

Im bestehenden Test wird für dieselben fünf Typen (`text`, `motif`, `photoSlot`, `image`, `graphic`) die exakte leere Rückgabe von `objectIssue` erwartet. Der Testname benennt die Unterscheidung zwischen physischer Geometrie und Kunden-Gestaltung.

Die vorhandenen Assertions für `contourContainsPoint`, `contourContainsPolygon`, Randabstände, eingeschlossene Bohrung, Konturverletzung und physische Bohrungsvalidierung sind unverändert. Kein Test gelöscht. Seit `7eceb7d` wurden keine Laufzeitdateien, Stylesheets, Oberfläche, Preise oder Katalogdaten geändert.

## Testnachweise

- Vorher auf `7eceb7d`: betroffenes Modul **7 Tests, 6 bestanden, 1 Fehler**, erwarteter Fehler `/Bohrloch/` gegenüber tatsächlichem `''`.
- Nachher auf Windows: **38 Tests, 38 bestanden, 0 Fehler, 0 übersprungen, 0 abgebrochen**, 872,1386 ms; fünf Dateien:
  - `app/platform/sources/app/shared/models/contour-geometry.test.mjs`
  - `app/platform/sources/app/shared/models/embedded-motif-fit.test.mjs`
  - `app/workshop/design-target-rules.test.mjs`
  - `app/configurator/variant-m/master-geometry-regressions.test.mjs`
  - `app/configurator/variant-m/contour-ui.test.mjs`
- Ausführung: `node --test --test-reporter=tap` mit den fünf genannten Pfaden.
- Bestehender Werkstatt-Test `real mounting holes warn for text without blocking intentional hole proximity or motifs` bleibt grün und erwartet weiterhin `prüfen` / `text_near_hole`.
- Kein neuer Projekt-Vollauf, Build oder Browserlauf für diese reine Testkorrektur. Claudes vorheriger Linux-Testmerge war laut Nachricht 27 **2.028 Tests / 2.025 bestanden / 1 Fehler / 2 Echtkatalog-Skips**; dieser Befund wird nicht zum frischen Vollauf umgedeutet.

## Plesk: tatsächliche Logo-Umgebung nur gelesen

Prüfzeit **31.10.2026, 11:51:00 Uhr Europe/Bucharest** (09:51:00 UTC). Die Python-Auswahl und relevanten Python-Suchpfade wurden aus den tatsächlich laufenden Werkstatt-Python-Prozessen 2049102 und 2049103 abgeleitet. Prüfung mit demselben Interpreter und dem Suchpfad des Logo-Moduls, `-B` / `PYTHONDONTWRITEBYTECODE=1`; keine Paketinstallation.

Interpreter: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311/bin/python`, **Python 3.11.18**. Trotz des historischen Namens `test-python311` ist dies die von den laufenden Werkstatt-Prozessen verwendete Python-Auswahl.

| Paket | Soll laut requirements-logo.txt | Installiert | Import |
| --- | --- | --- | --- |
| picosvg | 0.23.0 | 0.23.0 | ok |
| skia-pathops | 0.9.2 | 0.9.2 | ok |
| lxml | 6.1.3 | 6.1.3 | ok |
| absl-py | 2.5.1 | 2.5.1 | ok |
| fontTools, zusätzliche Abhängigkeit | nicht dort festgelegt | 4.61.1 | ok |

Geprüfte Module: `picosvg.svg`, `pathops`, `lxml.etree`, `absl`, `fontTools`. Die Plesk-Prüfung lief einmal über „Jetzt ausführen“, ohne die Aufgabe zu speichern. Anschließend Abbrechen; Aufgabenliste weiterhin genau eine bestehende tägliche Sicherung. Keine Live-Datei, Konfiguration, Datenbank oder Katalogdaten geändert; kein Neustart. Der Nachweis bestätigt Pakete und Imports, keinen neuen echten Kunden-Logo-/Warenkorbtest.

## Übergabe

PR #80 nach dem bereits erfolgten Merge von #77 auf `main` ausrichten; Entwurfsstatus erhalten. Claude prüft den aktualisierten Stand erneut, einschließlich Linux-Vollauf. Master-Optik bleibt unverändert. #78 bleibt unberührt. Gemeinsame Veröffentlichung von #80 und Katalog-PR #10 erfolgt nach der in Nachricht 29 vorgegebenen Reihenfolge; hier kein Merge oder Deploy.
