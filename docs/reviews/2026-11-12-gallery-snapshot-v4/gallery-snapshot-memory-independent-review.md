# Unabhängiger Methodikreview: Galerie-Snapshot-Speicherbelege

**Abgeschlossen, kein offener methodischer Blocker für den ausdrücklich lokalen synthetischen Vergleich.** Keine eigenen Mess-, Test-, SQLite- oder Serverläufe ausgeführt und keine geprüften Dateien geändert. Dies ist kein Abnahmebeleg für den realen Server oder die gesamte Anwendung.

Geprüft wurden zunächst `gallery-snapshot-memory/measure.mjs`, `watch.py`, `watch-v4.py` und deren Ergebnisse, anschließend der finale getrennte Cold-/Reopen-Vergleich im eingefrorenen Paket `work/restabschluss/gallery-snapshot-v4`. Die **21 Manifesteinträge** stimmen nach eigener Hash-/Längenprüfung. Manifest-SHA256: `148771202c7e936459795d4d0cd62ccbb42c8ebde253ce2d3b17a821f9ead651`. Finale Methodik: `measure-cycle.mjs`, `watch-cycle.py`, `cycle-watched-results.json`, sechs einzelne Ergebnisdateien, README und Provenienzsidecar.

## Vergleichbarkeit und Inhalt

Für 100.000 Karten verwenden v3 und v4 denselben deterministischen Generator, dieselbe Anzahl Bindungen (8.334), Namen/Suchtexte/Optionen und dieselbe Reihenfolge. Je Cold- und Reopen-Lauf entsteht ein frischer, nacheinander gestarteter Node-Prozess. Die v3-Referenz entspricht dem eingefrorenen e49659f-Codec; der Referenz-SHA `71f3b47e10ca2bfbce22f9712c2a3b76e48fb4757443cdfa5d58b354377e8902` ist im Paket gepinnt. Der finale v4-Quell-SHA lautet `8d2451a35813c02c03814d949db92380262c0e7bb6312dea45bc9deb10823a0d`.

Die Cold-Läufe schreiben über den tatsächlichen `createShopGalleryCache` in getrennte neue SQLite-Dateien. Die Reopen-Prozesse öffnen jeweils genau die vorher erzeugte Datei `readOnly:true`, decodieren über den zugehörigen Codec und bilden einen laufenden logischen Hash über sämtliche Scope-Schlüssel, Zeilen und Quellen. Beide 100k-Reopens ergeben denselben SHA256:

`084090b28e6ffb1928f2abfd8048f980c1e5e65e58f89c2b040ce66287aef73c`.

Das belegt Inhaltsgleichheit dieses vollständigen synthetischen Vergleichs trotz absichtlich unterschiedlicher Payloadbytes/HMAC-Domains. 250.000 Karten mit 20.834 Bindungen wurden **nur mit v4** geprüft; dies ist ein zusätzlicher Belastungsnachweis, kein Alt-/Neuvergleich bei dieser Anzahl.

## Grenzen und Messpunkte

Alle sechs Aufrufe verwenden dieselbe Form `node --expose-gc`, denselben lokalen 1.024-MiB-Wächter, 20-ms-Abtastung und 30-s-Zeitgrenze. Es gibt keinen unterschiedlich gesetzten V8-Heapparameter. Einmalige erzwungene GC direkt vor Encode erfolgt bei beiden Cold-Varianten; während Encode/Schreiben/Decode wird keine GC erzwungen. Die separaten Reopen-Prozesse rufen ebenfalls keine erzwungene GC auf. Diese kontrollierte Ausgangslage ist gegenüber einem bereits belasteten Produktionsprozess ausdrücklich eine Vereinfachung.

Der Wächter erfasst Windows-Working-Set-Stichproben und kann kurze Spitzen verpassen. Die Ergebnisdateien enthalten zusätzlich den Prozess-Höchstwert `process.resourceUsage().maxRSS`. Für die Tabelle ist dieser Höchstwert maßgeblich, nicht allein die Stichprobenserie. Beispiel: v4/250k-Reopen zeigt im Polling 624,10 MiB, im Prozess-Höchstwert 635,70 MiB; die höhere Zahl wird korrekt berichtet. Alle sechs Prozesse endeten mit Exit0, kein Wächterabbruch.

| Karten | Format | Encode-Höchstwert MiB | Cold-Gesamt MiB | Reopen bis Decode MiB | Reopen-Gesamt MiB |
|---:|---|---:|---:|---:|---:|
| 100.000 | v3 | 599,49 | 718,93 | 371,96 | 468,14 |
| 100.000 | v4 | 371,89 | 378,71 | 320,20 | 367,65 |
| 250.000 | nur v4 | 548,25 | 551,60 | 580,43 | 635,70 |

Cold-Gesamt erfasst **Encode, tatsächliches SQLite-Dateischreiben und die anschließende diagnostische Payload-SHA-Berechnung**. Die letzte erzeugt ebenfalls temporäre UTF8-Daten; daher sind diese Zahlen kein isolierter SQLite-Schreibpeak. Auch das JSON-Feld `afterWrite` wird im Ausgabeobjekt erst nach dieser Prüfsumme ausgewertet. Reopen-Gesamt schließt den laufenden logischen Prüfhash ein; `decodeMaxRssMiB` wurde davor erfasst. Die finale README benennt diese zuvor präzisierte Abgrenzung korrekt.

## Provenienz und Aussagegrenze

Die Aufrufskripte zeigen identische Node-Flags und Umgebung. `provenance.json` nennt Node v24.20.0 und `C:\Program Files\nodejs\node.exe`, **nach den Läufen** in derselben Umgebung festgestellt. Ursprüngliche Ergebnis-JSONs enthalten keine pro Lauf eingebetteten Executable-/Quellhashes. Das Sidecar kennzeichnet diese Grenze ausdrücklich; eine stärkere rückwirkende Provenienz wird nicht behauptet. Die jetzt versiegelten Quellen/Ergebnisdateien sind eindeutig nachprüfbar, die Quellenkontinuität zwischen Messung und Versiegelung ist zusätzlich die dokumentierte Aussage des ausführenden Agents.

Die negativen v3-Versuche bleiben als historische Befunde getrennt: der WeakSet-Replacer senkte die gemessene Spitze nicht, die Row-JSON/join-Variante ebenfalls nicht. Sie dürfen nicht als erfolgreicher v4-Messlauf bezeichnet werden.

Der Generator enthält viele wiederholte Zeichenfolgen und zwölf Karten je Bindung. Seine Kompressionsrate, Ausgangsobjektgröße und lokale Windows-Speicherspitze sind nicht auf die realen 245.830 Karten, Linux/CloudLinux, die 4-GB-Kontogrenze oder den gesamten Mischhost einschließlich Worker übertragbar. Ein echter Cold-/cache_saved- und separater Reopen-/cache_hit-Kopienlauf bleibt erforderlich; anschließend erst Vollhost-/Sitzungsabnahme. Das lokale Ergebnis erlaubt keine Aktivierung und keine neue reale Abnahmebehauptung.

Reproduktion nur in einer neuen isolierten Ausgabe-/Workspacekopie: die Wächter öffnen feste Lognamen mit Schreibmodus, während der Cold-Code vorhandene `.synthetic.sqlite`-Dateien absichtlich ablehnt. Ein erneuter Start im versiegelten Ordner würde Beleglogs beschädigen. Der finale README-Hinweis ist korrekt. Die erzeugten Datenbanken enthalten ausschließlich synthetische Daten und wurden nicht ins Paket übernommen.
