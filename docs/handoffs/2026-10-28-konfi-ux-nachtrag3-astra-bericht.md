# Nachtrag 3: Design-Galerie nach Neustart – Astra, 28.10.2026

Stand: Implementierung auf eigenem Branch `dev/konfi-galerie-20261028-astra`, Basis `main 26952e48e857c9ad08b23bf4e8557f27dfdbc3eb` nach Merge von PR #41. Auftrag: `docs/handoffs/2026-10-28-konfi-ux-nachtrag3-astra.md` auf Claudes Nachtragsbranch.

**Zur Codeprüfung vorbereitet; keine Live-Änderung, kein Merge.** Der aktuelle Echtdatenlauf und Linux-Vollauf stehen noch aus. Die historischen Messwerte unten sind kein Nachweis für den heutigen Store mit rund 120 Funkklingelvarianten.

## Ursache und Änderung

Die Galerie baute bisher für jeden Produktstand das vollständige Kundenmodell einschließlich Ressourcen auf und verwarf die fertigen Karten nach zehn Sekunden. Beides ist im Code bestätigt; die genaue Laufzeitverteilung des gemeldeten 30,1-s-Livefehlers wurde hier nicht auf dem Server gemessen. Zusätzlich las und haschte die Funkklingel-Freigabeprüfung denselben großen Produktbeleg erneut je Variante.

- Revisionsgebundener, auf acht Store-Objekte begrenzter Cache ohne Zeitablauf. Gleichzeitige Aufrufe teilen denselben Aufbau; geänderte Köpfe werden erneut aufgebaut. Fehlgeschlagene Aufbauten werden verworfen und sind wiederholbar.
- Hintergrundaufbau nach Erzeugung des Shop-Einstiegs, ohne Kundensitzung oder Zieltoken.
- Neue Kartenprojektion aus dem festen Produktbeleg: Name, Designs und bestehende Preis-/Geometrieeingaben. Keine Materialaufbereitung, Schriftpfade oder Motivdateien. Vollständiges Modell weiterhin erst bei Vorschau/Produktwechsel. Auch die separat installierte ältere Laufzeit verwendet die Projektion direkt über ihr Repository.
- Pausen und Freigaben werden bei jeder Kartenantwort neu geprüft. Funkklingeln prüfen weiterhin die genaue Variante, Produktrevision und Freigabe; der Dokumenthash wird nur innerhalb dieser einen Anfrage wiederverwendet. Keine Freigabe im langlebigen Kartencache.
- Nach vier Sekunden liefert der Server einen eigenen Vorbereitungsstatus; der Aufbau läuft weiter. Der Client bricht eine ausstehende Anfrage nach fünf Sekunden ab. HTML-502, Netzwerk-/Antwortfehler landen im Galeriehinweis mit „Erneut versuchen“. Die bisherige Gestaltung bleibt geöffnet und erhalten.
- Stückpreise, Optionsauswahl, Geometrie, verborgene Designs, eingebettete Motive, Zielsignatur und exakte erneute Auflösung bleiben verbindlich. Es wurden keine Produktdaten oder Preisverträge geändert.

Die Zeitgrenzen verwenden den Node-/Browser-Ereigniszyklus. Sie sind keine harte Garantie bei vollständig blockierter CPU; größere Schleifen geben regelmäßig die Ausführung frei. Der noch offene aktuelle Kopielauf muss diesen Punkt auf realistischem Datenumfang bestätigen.

## Prüfungen

Gezielte Gruppe: **105/105 grün**, kein Skip. Enthält Cache-/Revisionswechsel, gemeinsamen Kaltaufbau, 4-s-Wartestatus, erneuten Versuch, Pause/Freigabe/Widerruf trotz warmem Cache, exakte Preise/Geometrien für Acryl und Funkklingeln, keine Vollmodellaufrufe für Karten, Anfrage-/Sitzungssicherheit, HTML-502, Netzwerkfehler, Clientabbruch sowie lesendes Benchmarking.

Windows-Vollauf, vorhandene lokale Python-Abhängigkeiten über PYTHONPATH (keine neue Installation):

| Bereich | Vorher (602a3ac, gleicher Codebaum wie main vor dieser Änderung) | Nachher |
| --- | --- | --- |
| variant-m | 404: 398 grün, 6 Fehler, 0 Skip | 404: 398 grün, 6 Fehler, 0 Skip |
| workshop | 1372: 1207 grün, 158 Fehler, 7 Skips | 1384: 1219 grün, 158 Fehler, 7 Skips |

Alle bisherigen Fehlernamen und normalisierten führenden Fehlersignaturen stimmen überein; keine neuen Fehler. Die Editorfehler betreffen den lokalen Python3-Start. Die Werkstattfehler werden als bestehende lokale Baseline berichtet, nicht pauschal als erfolgreiche Tests. Claudes ältere Linux-Zähler belegen diesen neuen Head noch nicht.

Finale Befehle:

~~~text
node --test app/configurator/variant-m/*.test.mjs
node --test --test-concurrency=4 app/workshop/*.test.mjs
node app/configurator/variant-m/build.mjs
~~~

Der vollständige Werkstattlauf verwendet vier parallele Testdateien, damit gleichzeitige Python-/CPU-Arbeit die Zeitmessung nicht beliebig überlastet. Die Lastprüfung lässt die neue zulässige Vorbereitungsantwort zu, fordert anschließend weiterhin alle 40 Karten und einen erfolgreichen erneuten Aufruf. Es wurde keine Prüfung gestrichen. Zwei Zwischenlaufbefunde (mehrdeutige Benchmark-Testquelle und bisheriger Sofort-Karten-Sollwert unter voller Parallelität) wurden vor dem finalen Lauf korrigiert. Build erfolgreich: 108 Module, 14 Styles, Bundle `editor-3cd908f1ae95198a.mjs`.

## Messwerte, Quellen sauber getrennt

| Datengrundlage | Kalt | Warm | Neustart |
| --- | --- | --- | --- |
| Synthetischer Lasttest, 150 aktive SQLite-Bindungen, 2 Produktstände, 40 Karten; finaler Vollauf | 2431,07 ms | 37,96 ms | 2512,51 ms (neue Galerie im selben Prozess) |
| Historische reale Produktbelege vom 26./27.10., 2 lokale Testbindungen, 15 Karten | 802,24 ms | 425,28 ms | 786,98 ms kalt / 455,36 ms warm (neuer Node-Prozess) |

Im synthetischen finalen Lauf: maximale Ereigniszyklusverzögerung kalt/warm 158,07 / 15,21 ms; zwei Kartenprojektionen je Aufbau. Historische Kopie: D8-Beleg rund 11,47 MB und Schieferbeleg rund 3,23 MB; null vollständige Modellaufrufe und null Asset-Leseaufrufe. DB und WAL vor/nach dem Benchmark SHA-256-identisch. JSON: [historische-kopie-messung.json](konfi-galerie-20261028-astra/historische-kopie-messung.json).

Die historischen Produktbelege sind echt, ihre lokalen Bindungen sind Testdaten. Sie enthalten nicht die aktuelle Funkklingelmenge. Präzisierung zur frühen Rückfrage auf PR #41: Die dort zunächst als synthetisch bezeichnete lokale Kopie enthält diese historischen Belege, bleibt aber für den aktuellen Store unzureichend.

## Aktuellen Datenstand lesend nachmessen

Das neue Skript `scripts/shop-gallery-benchmark.mjs` öffnet SQLite ausdrücklich lesend, führt keine Migration aus und verwendet die produktive Bindungs-/Galerielogik. Es misst kalten und warmen Aufruf einschließlich genauer Quellbindung, danach einen tatsächlich neu gestarteten Node-Prozess. Keine Netzwerkanfrage, kein Import, keine Kundentabelle, keine neue Freigabe; Ausgabe nur Zähler, Zeiten und Prüfsummen. Es ersetzt keinen HTTP-/Plesk-Livetest.

Eine konsistente aktuelle private SQLite-Kopie mit aktiven Bindungsköpfen, festen Produktrevisionen, Options-/Preis- und gegebenenfalls bestehenden Funkklingel-Freigabebelegen ist noch nötig. Keine Kundenentwürfe, Uploads, Bestellungen oder Tokens mitliefern; keine DB ins Repo. Bei WAL eine konsistente SQLite-Sicherung erstellen, nicht nur die Hauptdatei eines laufenden Stores kopieren.

~~~text
node scripts/shop-gallery-benchmark.mjs --local-copy --db <private-kopie/workshop.sqlite> --tenant gravuru --store <exakte-konfigurierte-store-id> --shop gravuru-design.myshopify.com --source-label <Zeitpunkt-und-Herkunft-der-Kopie>
~~~

`--legacy-single-store` nur passend zum kopierten Legacy-Schema; `--doorbell-live-orders` nur wenn der entsprechende konfigurierte Store-Schalter tatsächlich aktiv ist. Der Schalter umgeht keine gespeicherte Freigabe. Fehlt der Nachweis, bleibt die Funkklingel ausgeschlossen.

Rückfrage an Claude: https://github.com/Chris83638w/gravuru-2027/pull/41#issuecomment-6477621827 . Bis zum Abschluss dieser Übergabe keine Antwort mit aktuellem Kopiepfad erhalten. Nächster Schritt: aktuelle Kopie bereitstellen, denselben Branch damit kalt/warm/nach Prozessneustart messen, Linux-Vollauf und Review. Danach erst Chris um die ausdrückliche Bereitstellungsfreigabe bitten.

## Sichtprüfung

[Vier Bilder und genaue Grenzen](konfi-galerie-20261028-astra/README.md): Desktop 1440 × 900, Handy 390 × 664 und 375 × 548. Gebauter Editor, lokaler Testtransport für Vorbereitung/Fehler. „Erneut versuchen“ funktioniert in beiden Fällen; Dialog schließen erhält Gestaltung und Preis. Der allgemeine Konfigurator-Ladefehler erscheint bei diesen Galeriefehlern nicht. Kein physischer Safari- oder Live-Shop-Nachweis, keine Produktwahl und kein Warenkorb ausgelöst.
