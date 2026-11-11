# Produktgruppen: gezielte Quellenauflösung je Operation

Stand: 11.11.2026, Integrationskandidat `work/issue230-integration-candidate`. Lokaler Code-/Testnachweis; keine Server- oder Produktänderung.

## Befund

Die drei bereits auf der B/C-Basis bekannten Fehler lagen in der Anzahl der Aufrufe der Quellenregistry, nicht in einem geleerten Dokumentcache. `sourceLookup.source()` fragte für jeden noch unbekannten Alias separat `registry([key])` ab. Zwei bzw. drei Aliase lösten deshalb zwei bzw. drei Registry-Abfragen in derselben Operation aus. Der Zwei-Dokumente-LRU für aktuelle und historische native Datensätze war weiterhin aktiv. Dieser Befund wurde vor der Korrektur an Root gemeldet; er ist kein neu zugeschriebener Mergefehler.

## Änderung

Nur `app/workshop/product-group-templates.mjs` und dessen Testdatei geändert. Die in der jeweiligen Operation bekannte Quellenmenge wird zusammen an die Registry übergeben und einmal im Lookup gehalten. Auswahlbezogene Aufrufe laden weiterhin nur die ausgewählten Quellen; die ausdrücklich vollständige Quellenliste bleibt vollständig. Es gibt keinen dienstweiten Registry- oder Dokumentcache.

Der gemeinsame LRU bleibt unverändert auf zwei native Datensätze begrenzt. Aktuelle Köpfe und historische Revisionen teilen weiterhin dieses Limit. Bestätigung sowie beide Ausführungsprüfungen verwenden jeweils einen neuen Lookup; IDs, feste Revisionsbezüge, Hashvergleiche, Revisionskonflikte und der unmittelbar vor dem Repository-Schreiben ausgeführte Guard bleiben erhalten. Keine Preis-, Freigabe- oder Produktregel geändert.

## Prüfung

- Vorher: die drei gezielt ausgewählten bestehenden Tests reproduziert, **0/3 bestanden**; beobachtete Registry-Zähler **3, 2, 2**, jeweils Sollwert **1**.
- Nachher: `node --test app/workshop/product-group-templates.test.mjs` — **22 Tests, 22 bestanden, 0 Fehler, 0 übersprungen**.
- Neue Regression: zwei Aliase derselben Quelle werden als vollständige Auswahl zusammen übergeben; keine unbeschränkte Registry-Anfrage und kein Zugriff auf ein unbeteiligtes natives Produkt. Jede neue Operation liest erneut den aktuellen Kopf.
- Der bestehende Lebenszyklustest prüft zusätzlich die tatsächlich an die Registry übergebene Auswahl bei Entwurf, Validierung, Anlage, Revision, Planung, Bestätigung und beiden Ausführungsprüfungen.
- Bestehende Sollzahlen unverändert. Bestehende Prüfungen auf Zwei-Dokumente-LRU, historische Revisionen, Fehleraliase, Mandantentrennung, feste Bestätigung, Preis-/Optionsschutz, unveränderte Quellen und Änderungen unmittelbar vor dem Schreiben bestanden.
- `git diff --check` für beide Dateien ohne Befund.

Kein Commit, Push, Git-Staging oder erneuter breiter Testlauf durch diesen Agenten. Root übernimmt Gesamtprüfung und Integration.
