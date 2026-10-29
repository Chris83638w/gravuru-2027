# Nachtrag 6 – Galerie je Produktlinie und Klingelmodell

Stand: 29.10.2026. Ergänzung zu PR #42 auf bfbd9188ac4446611bc5e71b55b74c804aec5767; gemeinsam mit der kleinen Mausrad-Korrektur für PR #43 geprüft. Nur Code, Tests und Dokumentation. Kein Import, keine Freigabe, keine Shopify-Änderung, kein Livegang.

## Zusatzwunsch von Chris: reine Designkacheln

29.10.2026: Die Kacheln zeigen nur Vorschau und Designname. Zusätzliche Preis-, Form-, Größen- und Produktzeilen entfallen; auch der Einstieg kündigt diese Angaben nicht mehr an. Preis-/Größeninformation bei der Bestätigung eines tatsächlichen Produktwechsels bleibt dort erhalten. Keine Preisberechnung oder Zielbindung geändert.

Prüfung nach dieser kleinen Darstellungsänderung: 8/8 vorhandene Tests zu Textübernahme und Designwechsel bestanden; PR-42-Build und kombinierter Build erfolgreich. Desktop 1440 × 900 und Handy 390 × 664 / 375 × 548 erneut im lokalen Browser geprüft, Bilder ersetzt. Die vorherigen 122 gezielten Tests und der Vollauf unten beziehen sich auf den Stand vor dieser Textreduktion; kein erneuter Vollauf für diese reine Darstellungsänderung.

## Ergebnis

- Normale Produkte werden über die gespeicherte Katalog-Kategorie linie-<id> zugeordnet. Namen, Shopify-Titel und Profilnamen werden nicht als Linienkennung geraten.
- Funkklingeln erhalten einen eigenen Bereich aus Linie und dem nativen doorbell.modelKey. Nur die Formate desselben Modells erscheinen; Türschilder und andere Geräte bleiben ausgeschlossen. Ältere native Klingelimporte ohne Katalog-Kategorie dürfen ihren ausdrücklich gespeicherten Modellschlüssel verwenden.
- Fehlende oder mehrdeutige Linien und Klingeln ohne Modellschlüssel fallen sicher auf das aktuelle Produkt samt fester Revision zurück. Dadurch erscheinen gegebenenfalls weniger Designs, niemals der gesamte Store.
- Material- oder Verfahrenswechsel brauchen in derselben Linie eine ausdrückliche, freigegebene Paket-M-Zielzuordnung der Zielfamilie. Der Import speichert hierfür nur den vorhandenen Freigabebeleg in der festen Produktrevision; er setzt keine Freigabe. Alte Produkte ohne diesen Beleg werden für solche Wechsel nicht angeboten. Die Metadaten kommen erst bei einem später separat freigegebenen Import hinzu.
- Themen des aktuellen Profils werden zuerst sortiert. „Alle Themen“ erreicht weiterhin alle Designs derselben Linie; auch die bevorzugte Ansicht entfernt kein anderes Thema. Sortierung, Gesamtzahl und Seitengrenzen sind getestet.
- Galerieziele signieren zusätzlich Linien-/Modellbereich sowie Quellprodukt und Quellrevision. Auswahl und Vorschau lösen Ziel und Quelle neu auf und prüfen die Grenze erneut. Alte Galerietokens müssen neu geladen werden.
- Der gemeinsame Cache baut die leichten Produktkarten weiterhin nur einmal je Store-Revision auf; darin liegen getrennte Bereiche je Linie/Modell. Verfügbarkeitsprüfungen laufen erst nach der Bereichsauswahl. Keine Vollmodelle, Schriftdateien oder Motive für die Listen laden; die bestehende Vier-Sekunden-Antwort „Designs werden vorbereitet“ bleibt bestehen.

## Nachweise

Gezielte kombinierte Prüfung: **122/122 bestanden** (Galerie, Lasttest, leichte Modelle, Import, Shop-Einstieg und Client, Designwechsel, Zoom und Lupe). Separater Zoomlauf: 26/26. Beide Einzel-Builds und der kombinierte Build erfolgreich.

Kombinierter Windows-Vollauf aller app/configurator/variant-m/*.test.mjs und app/workshop/*.test.mjs mit --test-concurrency=8: **1810 Tests, 1731 bestanden, 74 fehlgeschlagen, 5 übersprungen**, 602,8 Sekunden. 73 Fehler betreffen den fest aufgerufenen python3-Store-Alias bzw. spawnSync python3 EOF; ein Excel-Test scheitert an Python-Ausgabe in cp1252 (Pfeilzeichen). Alle 74 Fehlertestnamen sind schon in den vorhandenen PR-42-/PR-43-Windows-Protokollen enthalten. Das ist ein Namensabgleich, kein neuer grüner Linux-Vollauf. Keine Assertion abgeschwächt, kein Test gestrichen.

Der erste Vollauf hatte drei zusätzliche fehlende lokale Legacy-Testdateien. Nach vollständigem Kopieren der Testquellen waren diese 24 Tests grün; der oben genannte erneute Vollauf enthält alle Quellen. Maschinenlesbare Zähler, Fehlernamen und Log-Prüfsummen: [tests.json](konfi-galerie-linie-20261029-astra/tests.json).

150 feste Bindungen unter gleichzeitig laufendem Vollauf: kalt 2462,07 ms, warm 46,61 ms, nach simuliertem Neustart 2750,02 ms; jeweils 40 Karten auf Seite 1. Zwei leichte Modelle je Kaltaufbau, keine schweren Modelle für Listen. Maximale Event-Loop-Verzögerung kalt 147,46 ms, warm 25,35 ms. Das sind lokale Messungen unter Last, keine Plesk-Messungen.

Der gemischte Testbestand enthält Türschilder, Hausnummern und zwei reale Klingel-Schemata mit unterschiedlichen Modellkennungen und mehreren Formaten. Tests decken manipulierte Signaturen, übernommene Tokens anderer Quellen, nachträglich geänderte Linien/Modelle, fehlende Kategorien und sämtliche fehlenden/falschen Ziel-Freigabebelege ab.

[Desktop- und Handybilder](konfi-galerie-linie-20261029-astra/README.md): 1440 × 900, 390 × 664 und 375 × 548. Lokale Browserprüfung mit tatsächlichen Galerie-/Ziel-/Vorschaufunktionen; Klingel A/B und Themen sind ausdrücklich Testdaten, Gerätebild mit TEST markiert. Keine neue Produktgestaltung und keine Live-Abnahme.

## Offen vor Freigabe

1. Claude: neuer gemeinsamer Linux-Vollauf von PR #42 und #43; nicht den früheren 1801/1801-Stand als Prüfung dieser Ergänzung übernehmen.
2. Echte iPhone/Safari-Prüfung beider Größen, insbesondere Scrollen der Galerie und unverändertes Zwei-Finger-Verhalten. Die Bilder sind Chromium-Ansichten in passender Größe.
3. Vor dem späteren Livegang vorhandene Linien-/Modellzuordnungen der aktiven Festrevisionen lesen; fehlende Belege nicht automatisch importieren oder freigeben.
4. Erst nach Chris' ausdrücklichem Satz bereitstellen; anschließend echte gemischte Produkte, Quelle/Zielwechsel und kalter Start auf Plesk prüfen. N7/D8-Preisvertrag bleibt ein eigener offener Punkt aus Nachtrag 2.

Rückweg: diese Ergänzung auf PR #42 zurücknehmen und Galerie neu öffnen, keine Datenmigration zurückzurollen. Ein Rückgang auf den alten Stand hebt allerdings die neue Linienbegrenzung wieder auf und ist deshalb keine Freigabe zum Livegang.
