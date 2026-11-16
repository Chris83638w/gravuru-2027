# Unabhängiger Review: Galeriecache v4

12.11.2026. **Kein offener Quell-/Belegbefund im geprüften Umfang.** Rein lesender Abschlussreview, keine eigenen Tests, Datenbanköffnungen, Serverläufe oder Codeänderungen. Paketmanifest `148771202c7e936459795d4d0cd62ccbb42c8ebde253ce2d3b17a821f9ead651`: alle 21 Einträge in Länge und SHA256 geprüft, keine Abweichung und keine Datenbanken enthalten.

Codec-SHA256 `8d2451a35813c02c03814d949db92380262c0e7bb6312dea45bc9deb10823a0d`; Benchmark-SHA256 `b251e8832f670a501c7a05bf14d7df66e08ecee3519e408e9a689ef1928b4590`. Die v3-Testreferenz ist exakt Gitblob `3c1d44c78750c6ef8e1b1ef993b34d3d95f81b7b` aus e49659f, unabhängig mit `git hash-object` abgeglichen.

## Quellprüfung

- Die vorhandene Feldfreigabeliste bleibt gleich. Karten und Quellen werden in ihrer bisherigen Reihenfolge zeilenweise projiziert, in höchstens 256 Zeilen/1 MiB UTF8 pro Block komprimiert und im selben atomar gespeicherten `payload`/`mac`-Datensatz abgelegt. Kein zusätzlicher vollständiger Projektionsgraph und kein vollständiger unkomprimierter Payloadstring; keine neue Datenbankstruktur.
- V4-HMAC mit eigener Domain wird vor JSON-Auswertung/Inflation geprüft. Blockzahl/-bytes, Gesamtsummen, kanonisches Base64, Scope/Revisionskontext und `maxOutputLength` verhindern unbegrenzte einzelne Inflation. Gesamtgrenzen: 512 MiB dekomprimierte Blöcke, 64 MiB Envelope. Sources sind ebenfalls geblockt.
- Der im Vorreview gefundene Fall doppelter Scope-/Sourceschlüssel wurde behoben: kein stilles Überschreiben bei `new Map`, sondern vollständiger Cachemiss. Nichtstring-Schlüssel und falsche Sourcepaarform werden ebenfalls verworfen; gezielte signierte Fehlformatfälle liegen bei.
- V2/V3 sind bewusst Cachemisses, kein unbeschränkter alter JSON-Parse als Rückfall. Fehler und Limits betreffen nur den abgeleiteten Cache. Die bestehende `restoreOrBuild`-Behandlung behält eine erfolgreich gebaute Galerie bei Schreibfehlern; keine Teilgalerie, Produktänderung oder neue Freigabesemantik.
- Die Benchmarkergänzung gibt bei `--restart-child` die vorhandenen Ereignisse sofort auf stderr aus: Ereignis, Store, RSS und fest aufgezählte endliche Zahlenwerte. Keine zusätzlichen Ressourcen-/Datenbanklesungen für diese Ausgabe; stdout und die Standardaufrufsemantik bleiben erhalten.

## Belege

48/48 gezielte Autorprüfungen grün; Log-SHA256 `8eda0b14e41de985ad5a235803edb97f59d08f3910a330ac278aefd175a2e289`. Testquellen und Ergebnis gelesen, nicht erneut ausgeführt. Logische V3-Gleichheit einschließlich Unicode, Optionen, Sparse-/Sharedarrays und Privacy, Blockgrenzen, ein nahezu 1-MiB großer hochentropischer Block, Auth-/Scope-/Revisionsfehler, falsche Counts, defekte Daten und Inflationsüberlauf sind abgedeckt. Bestehende Galerie-/AllSizesprüfungen erhalten Suche, Auswahl, Preise und Bindungswachen.

Messquelle und Windows-Wächter gelesen: echte synthetische SQLite-Schreibphase und anschließend eigener readonly Reopen-Prozess, 1-GiB-Abbruchwächter/30 Sekunden, keine erzwungene GC während Encode/Write/Decode. Sechs Prozesse exit0. Bei identischen 100.000 Karten sinkt Cold-Gesamt-MaxRSS von 718,93 auf 378,71 MiB, Reopen-Gesamt von 468,14 auf 367,65 MiB. Der logische Inhaltshash ist gleich (`084090b28e6ffb1928f2abfd8048f980c1e5e65e58f89c2b040ce66287aef73c`). V4 mit 250.000 Karten: Cold 551,60 MiB, Reopen 635,70 MiB. Kein riskanter 250k-Altvergleich ausgeführt.

Der Messbericht grenzt richtig ab: Gesamtpeaks enthalten die anschließenden Prüfsummen; `afterWrite` ist deshalb kein isolierter SQLite-Peak. Die Originalmessungen besitzen keine nachträglich behaupteten per-run Quellpins. Reproduktionswächter dürfen die vorhandenen Lognamen nicht überschreiben; README verlangt eine neue isolierte Ausgabekopie. Ergebnisdatei-SHA256 `bd2075c3908817e689f006b1b7147e75586f5119d1ac1206fd309f193e5b2a21`.

## Verbleibende reale Grenze

Dies bestätigt die Wirksamkeit am begrenzten synthetischen Generator, nicht am echten 245.830-Karten-Store oder im gemeinsamen LVE. Kompressionsrate und endgültiger restaurierter Kartengraph hängen von echten Daten ab; synchrone Kompression blockiert weiterhin den Eventloop. Die unveränderte SQLite-Lese-API kann zudem einen alten großen Klartextcache bereits vor dessen Ablehnung laden.

Deshalb weiterhin ein einzelner begrenzter Operator-Coldlauf mit frischer separater Cachedatei, anschließend separater readonly Reopen mit `cache_hit`, unveränderten Quellhashes und eigener RSS-/LVE-Beobachtung. Mischhost, Worker und 60-Sekunden-Sitzung sind getrennte offene Nachweise. Der separat committete Binding-Epochfix fcd1047 wird nicht als Teil dieser Codec-Messung ausgegeben.
