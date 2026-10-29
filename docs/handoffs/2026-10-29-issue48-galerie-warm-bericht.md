# Issue #48 – Teil A: Galerie nach Ruhepause

Stand: Codex/Astra, 29.10.2026. Basis main e48b7f3. Branch dev/konfi-galerie-warm-20261029-astra. Entwurf; keine Installation oder Live-Abnahme.

## Umsetzung

- Vorbereitete Karten liegen als abgeleiteter, HMAC-geschützter Stand in shop_gallery_cache auf der vorhandenen privaten Werkstatt-Verbindung. Schlüssel: Mandant/Shop/Store, galleryRevision; darin getrennte Linien-/Modellbereiche. Pro Store wird nur der aktuelle Stand gehalten.
- Explizite Feldauswahl: keine Sitzungskennung, Kundenentwürfe, persönlichen Fotos oder Ziel-Tokens. Tokens entstehen erst pro Antwort/Sitzung. Geändertes Geheimnis, falscher Bereich, beschädigter Stand oder Revision erzwingen Neuaufbau.
- Pausen und Funkklingel-Freigaben werden weiterhin je Antwort geprüft. Zielwechsel löst die aktuelle Bindung weiterhin exakt auf. Preis/Geometrie kommen unverändert aus den gemeinsamen Funktionen. Kacheln bleiben Bild plus Designname, ohne Preistext.
- Ein zusätzlicher abdeckender Index shop_gallery_revision_status_v1 verhindert, dass die Revisionsprüfung große Dokumentseiten lesen muss, um an das Statusfeld zu kommen. Alte Nur-lese-Datenkopien funktionieren ohne Index; schreibende Werkstatt-Verbindungen legen ihn einmalig an. Kein Produkt- oder Freigabestand wird migriert.
- Die Bindungsprüfung hält nach dem Hashen nur Prüfwert und Fertigungsstatus im Speicher. Zuvor blieben alle vollständigen Produktdokumente bis zum Ende der Prüfung erhalten.
- Messereignisse: Datenbanklesen, JSON-Parsing, kanonisches Hashen, Bindungen, Modellaufbau, Profilauswahl, Preis-/Geometrieauswahl, Cache-Lesen/-Schreiben. Nur technische Zähler/Zeiten und Store-ID.
- Einzahl: „1 verfügbares Design“, sonst „N verfügbare Designs“.

## Messung – ausdrücklich synthetisch

65 gültige synthetische Acryl-Dokumente, 64 aktive Bindungen, 571.793.408 Byte SQLite; große eingebettete SVG-Flächen, keine echten Kunden-/Shopdaten. Der Index liegt auf einer separaten Kopie derselben Dokumente. node --max-old-space-size=2048, auch im neu gestarteten Kindprozess. Vorher: unveränderte Galerie/Registry aus main e48b7f3 mit demselben Messskript. Quellen werden während der Messung nur gelesen und per SHA-256 vor/nach kontrolliert. Leere SQLite-WAL-Hilfsdateien zählen nicht als Datenänderung.

| Messung | main vorher | Teil A nachher |
| --- | ---: | ---: |
| Kalter Aufbau ohne Galerie-Stand | 9,261 s | 6,120 s |
| Revisionsprüfungen zusammen | 3341,77 ms / 6 Aufrufe | 3,48 ms / 7 Aufrufe |
| Warme Antwort | 1440,82 ms | 156,02 ms |
| Nach Prozessneustart | erneut Vorbereitung, 8,807 s Aufbau | erste Karte nach 144,43 ms |
| Produktmodelle nach Neustart | 64 | 0 |
| Maximaler Prozessspeicher im ersten Lauf | 1347,68 MiB | 543,56 MiB |

Nachher-Aufbau: Bindungsprüfung 3,720 s (Lesen 1,060 s, Parsing 0,384 s, Hashen 2,248 s), Modelle 2,211 s, Profilauswahl 0,012 s, Auswahl/Preis/Geometrie 0,015 s. Der neue Cache umgeht diese Arbeit nach dem Prozessneustart. Die Revisionsprüfung war in diesem Versuch ein großer vermeidbarer Anteil; der Index beseitigt ihn, ohne die geprüften Felder zu entfernen.

Rohmessungen: [vorher](issue48-galerie-messung-20261029/vorher-synthetisch.json), [nachher](issue48-galerie-messung-20261029/nachher-synthetisch.json).

Zusätzliche ältere lokale 35,7-MB-Prüfdatenbank: erste Karte nach echtem Neustart 285,09 ms; diese Kopie ist kein Nachweis des aktuellen Live-Datenbestands. Lasttest mit 150 SQLite-Bindungen ebenfalls erfolgreich; kein zusätzlicher Modellaufbau beim Wiederöffnen.

## Prüfungen

- 97 verschiedene gezielte Tests grün: 95er-Lauf (Galerie, Last, Projektion, Registry, Legacy, Shop-Einstieg, Einzahl); anschließend Registry 24/24 einschließlich zwei weiterer Index-/Benchmark-Tests.
- Build erfolgreich: 111 Module, 14 Styles; Referenzressourcen geprüft.
- Erster vollständiger Windows-Lauf vor dem abschließenden Index: 1815 Tests, 1737 bestanden, 73 fehlgeschlagen, 5 übersprungen. Die Fehler laufen über den nicht verfügbaren Windows-python3-Aufruf.
- Abschließender Vollauf mit dem bereits vorhandenen Test-Interpreter-Adapter scripts/test-portability/full-tests-python-windows.mjs läuft; Ergebnis wird nachgetragen. Der Adapter ändert nur den Interpreter-Aufruf, keine Assertion.

## Wiederholen

Nur in einem privaten lokalen Prüfverzeichnis:

~~~sh
node scripts/shop-gallery-synthetic-fixture.mjs --synthetic-only --out /privat/synthetisch.sqlite
node --max-old-space-size=2048 scripts/shop-gallery-benchmark.mjs --local-copy --db /privat/synthetisch.sqlite --cache-db /privat/galerie-cache.sqlite --tenant gravuru --store synthetic --shop synthetic.myshopify.com --source-label synthetisch
~~~

Für die konsistente Live-Kopie die tatsächlichen Mandanten-/Storewerte und ggf. --legacy-single-store / --doorbell-live-orders aus deren bestehender Konfiguration verwenden. Nichts automatisch freigeben. Der Cache muss eine andere Datei sein; auch gleiche Dateien über Pfad-Aliase werden abgewiesen. Eine schreibbare Testkopie einmal über die vorhandene Werkstatt-Initialisierung öffnen, um den Index anzulegen; danach misst das Skript ausschließlich lesend.

## Offen / Übergabe an Claude

1. Aktuelle private ~570-MB-Live-Kopie fehlt hier; in Issue #48 angefragt. Die tatsächliche Ursache der dort beobachteten sechs Minuten ist daher noch nicht abschließend bewiesen. Mit der Kopie Schritte messen und vergleichen, insbesondere Variantenanzahl und Revisionsabfrage.
2. Frischer Linux-Vollauf sowie später ausdrücklich autorisierter Passenger-Neustart/Proxy-Test mit vorhandenem Cache. Der lokale Funktionsaufruf misst keinen Live-HTTP-/Proxyweg.
3. Teil B folgt auf eigenem Branch. DESIGN-MASTER.md (Katalog main 7ad09b5, Rundschreiben in #48) gelesen; bestehende Designs werden nicht ungefragt umgestaltet.

Rückweg: Code auf vorherigen Stand zurücknehmen. Die zusätzlichen abgeleiteten Cache-Daten und der Index werden vom alten Code ignoriert; Produkt-, Bestell- und Freigabedaten unverändert. Keine Plesk-/Passenger-Einstellung, kein Shopify-Schreibzugriff, kein Merge, keine Katalogänderung.
