# Issue #48, Nachricht 16: Fehlerkorrekturen auf dem freigegebenen Master

Stand: 31.10.2026. Auftrag von Chris: zuerst die offenen Fehler aus Nachricht 16 beheben, die Master-Oberfläche optisch erhalten, Claude auf GitHub informieren, **nichts live stellen**.

Quelle: [Nachricht 16](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6529178973). Basis ist der Kopf von [PR #77](https://github.com/Chris83638w/gravuru-2027/pull/77), `261532ef314bad494a53467613fed61bd71153cf`. Eigener Branch: `dev/konfi-master-fixes-20261031-astra`.

Die bestehenden Gestaltungsvorgaben bleiben im [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) festgelegt. Diese Runde erstellt oder verändert keine Katalogdesigns.

## Änderungen

| Befund | Korrektur und Absicherung |
| --- | --- |
| Schwarze Flächen statt Rahmen/offener Linien beim Gravur-Import | Die einschlägige Korrektur aus #72 übernommen: `fill="none"`, Kontur, Strichbreite, Aussparungen und Deckkraft bleiben erhalten; nur die Farbe wird zur Gravurtinte. Eine volle Hüllbox gilt nicht mehr allein als Plattenhintergrund. Tests für Rahmen, offene Linie, volle Hüllbox ohne Rechteckfläche, echtes Plattenrechteck, `evenodd` und ungültige Attribute. |
| Unbeabsichtigter 2-mm-Rand | Ohne ausdrücklich gesetzten Rand verwendet ein erkanntes Gravurprofil 0 mm. Ausdrückliche Abstände, Druckprofile, Außenkontur und mechanischer Klingelbereich bleiben geprüft. Auch die Prüfung eingebetteter Vorlagenpfade verwendet den passenden Rand. |
| Gestaltung über Bohrlöchern gesperrt | Text und Motive dürfen auf Vorder- und Rückseite über Bohrungen liegen. Validierung, Platzierung, Einrasten, Klemmen am Rand und unveränderte Vorlagenposition behandeln das einheitlich. Bohrungsgeometrie und physische Konturprüfungen bleiben unverändert. Export- und Vorschautests behalten ihre getrennte Behandlung von Gestaltung und Bohrung. |
| Randkorrektur rundet wieder nach außen | Die berechneten Koordinaten bleiben präzise erhalten. Test mit gedrehten Objekten, versetzten Glyphenmaßen und wiederholtem Rendern prüft zulässige, stabile Positionen. |
| Verlinkter Text benutzt falsche Längenregel | Die tatsächliche Konfiguration wird bis `textLimits` durchgereicht. Tests für aktuelle 80-/500-Zeichen-Regeln, Mehrzeiligkeit und historische 50-Zeichen-Regel sowie den tatsächlichen Aufruf in der Oberfläche. Keine neue Zeichenregel eingeführt. |
| Entwurfstitel geht beim Aktualisieren verloren | Geladener bzw. erfolgreich gespeicherter Titel bleibt bei leerem Namensfeld erhalten. Umbenennen bleibt möglich; eine neue Kopie ohne eigenen Titel nutzt weiterhin den Produktnamen. Fehlgeschlagene Speicherung ändert den gemerkten Titel nicht. |
| Dokument-Listener überlebt den Editor | Der Außenklick-Listener wird bei Ausbau des Editors entfernt; wiederholte Installation erzeugt keine Doppelaufrufe. Prüfung vor Verarbeitung verhindert auch einen Aufruf vor Zustellung des Ausbau-Ereignisses. BFCache und echtes Verlassen der Seite werden unterschieden. |

Die zuvor vorhandenen Tests für ein Verbot von Gestaltung über Bohrlöchern wurden auf Chris' ausdrückliche Regel umgestellt. Kein Test wurde gestrichen. Echte Außenkonturverletzungen, spiegelbildliche Rückseiten, unveränderte Quelldaten und physische Bohrungen bleiben durch positive und negative Fälle abgesichert; die physische Geometriefunktion wurde nicht gelockert.

## Oberfläche und Daten

- Keine Änderungen an CSS, HTML-Vorlage, Beschriftungen, Farben, Layout, Preisen, Produkt-/Katalogdaten oder gespeicherten Gestaltungen.
- Lokaler Vergleich mit demselben D8-Prüfmodell auf `261532e`: **14/14 eingebundene Stylesheets identisch**, erzeugte Editor-Seite bis auf den notwendigen Bundle-Dateinamen identisch, Prüfmodelle identisch.
- Beide lokalen Builds erfolgreich; 76 Ressourcen geprüft. Die neue Hilfsdatei erhöht den Modulgraphen von 124 auf 125 Module.
- [Maschinenlesbarer Quellenvergleich mit Prüfsummen](issue48-master-fixes-20261031/source-comparison.json). Dies belegt Quellenidentität der Oberfläche, keine neue Sichtprüfung.
- Die Browsersteuerung wurde wegen nicht zuverlässig erkannter Windows-Browseradresse gestoppt. **Keine neuen Vorher-/Nachher-Screenshots, keine neue iPhone-/Safari- oder Live-Abnahme behauptet.** Bestehende Benutzer-Tabs und Gestaltungen blieben unangetastet.

## Tests und Grenzen

Der abschließende gezielte Windows-Prüflauf: **277/277 bestanden, 0 Fehler, 0 übersprungen, 0 abgebrochen**, 34 Testdateien, 160 Sekunden. Datei-Liste und Ergebnis stehen in [focused-tests.json](issue48-master-fixes-20261031/focused-tests.json). Die Auswahl enthält direkte Regressionen sowie Import, Rückseiten, Kontur-PDF, Export, Produktvalidierung, Designwechsel, Foto-/Logo-Oberfläche, Bundle und Sitzungsprüfung.

Ausführung: Node-Testläufer mit `--experimental-vm-modules`, `--test-concurrency=2`, `--test-timeout=120000`; vorhandene lokale Python-Umgebung über `GRAVURU_PYTHON` und `PATH`, `PYTHONUTF8=1`, `PYTHONIOENCODING=utf-8`. Tests verwenden ausschließlich lokale Fixtures, temporäre Dateien und lokale Testserver.

Im ersten abgeschlossenen gezielten Lauf waren 272/277 erfolgreich: drei alte Erwartungen verboten Gestaltung über Löchern; zwei Excel-Rundläufe scheiterten an Windows-CP1252 beim Ausgeben des Pfeilzeichens. Die drei Erwartungen wurden fachlich korrigiert, die Python-Ausgabe im Testprozess auf UTF-8 gesetzt. Keine Änderung am Excel-Produktionscode dafür.

Ein zusätzlich angestoßener Vollauf wurde nicht abgeschlossen: zuerst störten lokale Serverrechte/Python-Alias, nach Korrektur beanspruchten unveränderte PDF-Tests viel Zeit. Es gibt **keinen neuen grünen Vollauf** und keine Hochrechnung aus Claudes älterem Linux-Ergebnis. Frühere und aktuelle Läufe überschneiden sich und werden nicht addiert.

## Übergabe an Claude / vor einer späteren Veröffentlichung offen

1. Korrektur-PR prüfen und frischen Linux-Vollauf durchführen. Der PR zielt zunächst auf den noch offenen Master-Branch von #77, damit nur diese Korrekturen im Diff stehen; nach dessen Merge auf `main` umstellen bzw. geordnet übernehmen. Nicht zusätzlich die gesamte Arbeit aus #58/#77 doppelt übernehmen.
2. Sicht- und Bedienprüfung auf Desktop/iPhone: Randplatzierung, Text/Motiv über Bohrung, Linktext, Entwurfstitel und Schließen/erneutes Öffnen des Konfigurators. Kein neues Layout abnehmen: der freigegebene Master bleibt maßgeblich.
3. Die in Nachricht 16 erbetene Bestätigung von `app/workshop/requirements-logo.txt` **auf Plesk bleibt offen**. Keine frische Serverprüfung/Installation in dieser Runde. Lokal fehlt `picosvg`; die geänderten Bereiche benötigen es nicht. Die Logo-Konverter- und Shop-Entry-Suites wurden nicht als bestanden ausgegeben. Vor einer späteren Veröffentlichung den tatsächlich verwendeten Server-Python und die vollständigen Logo-Abhängigkeiten prüfen.
4. Der gesonderte Gedenktafel-Entwurf #78 ist nicht verändert. Sein Import-Fix ist bereits enthalten; die übrigen Korrekturen dieser Runde nach Review dort übernehmen, ohne die mit Chris abgestimmten Ausführungen zu überschreiben. Preise farbiger Abstandshalter und Nachrichten 17–19 sind kein Bestandteil dieser Korrekturrunde.

**Kein Merge, kein Deploy, keine Shopify-/Plesk-Änderung, kein Import und keine Datenmigration.** Der veröffentlichte Master bleibt auf seinem bisherigen Stand. Rückweg vor Veröffentlichung: diesen eigenständigen Korrektur-Branch nicht übernehmen; keine Live-Rücknahme nötig.
