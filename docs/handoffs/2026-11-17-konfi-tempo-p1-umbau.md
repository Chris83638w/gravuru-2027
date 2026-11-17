# P1: Warenkorb-Umbau nach der Ursachenmessung

Auftrag #254, PR #255; Basis `105e398` auf dem P1-Branch, weiterhin auf dem Live-Ausgangspunkt `be163c5d`/`dev/claude-warenkorb-v4-20261116`, nicht main. Chris beauftragt den Umbau mit „dann los“. Keine neue Live-Freigabe. Letzter bestätigter Live-Stand bleibt `9af3a1ac`.

Keine sichtbare Konfi-Änderung, keine Änderung an Preisen, Bindungen oder Pflichtprüfungen. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich. P2/P3 und P4 sind nicht Bestandteil dieses Umbaus.

## Teil A: wiederholte Lesungen

Die vorhandene `withCustomerReadScope` wird für die synchronen Abschnitte der vier Warenkorbrouten verwendet. Beim Einlesen des Bodys und beim Warten auf Shopify endet sie sofort; die Fortsetzungen eröffnen jeweils eine frische Phase. Kein Dokumentcache über Anfragen, kein neuer Timer, keine Datenbanktransaktion. Produktköpfe und aktive Bindungen werden weiterhin gelesen; gleichbleibende Datenbank-Epochen (eigene Änderungen, fremde Commits, Haupt-/TEMP-Schema) sind der Gleichheitsnachweis für die Wiederverwendung gelesener Dokumente und daraus berechneter Prüfsummen. Schlüssel enthalten Besitzer/Datenbank, Mandant, Produkt und Revision; Bindungs-/Shop-Prüfungen bleiben außerhalb der gemerkten Dokumentwerte.

Tiefes Einfrieren wird als `customer_read_freeze` gemessen; `customer_read_hit` und `customer_read_overflow` zeigen Treffer bzw. die Grenze von 16 Einträgen. `droppedStepCalls` macht die Grenze von 64 Schrittnamen sichtbar. Namen werden vor verschachtelter/asynchroner Arbeit reserviert, damit die Grenze auch bei Überlappung gilt.

125 gezielte Tests grün: echte Kunden-/Warenkorbwege, alte/neue Clients, Preis-/Bindungs-/Revisionsfehler, Datenbank-Epochen einschließlich Rollback und zweiter Verbindung, getrennte Kundenphasen und beide Messgrenzen. Der HTTP-Durchlauf verändert Revision, Zuordnung und Preis während des Bild-Wartens: `/data` und der folgende `/claim` lehnen jeweils mit dem bestehenden Fehlercode ab. Alle bisherigen Angebotsauflösungen bleiben erhalten.

### Gleiche lokale Profile vor/nach Teil A

Windows, Node 24.22.1, Core Ultra 5 235, echte temporäre SQLite-Registry, Loopback ohne Drosselung, synthetische Shopify-Antwortzeiten 60/100/25/40 ms. Je ein Aufwärmlauf und drei Messläufe, Median in ms. Vorher `105e398`, nachher der Teil-A-Diff dieses Commits (JSON nennt noch den HEAD vor dem Commit). Derselbe Runner lädt jeweils den angegebenen Checkout. Keine echte Shopify-Anfrage oder Bestellung.

| Anfrage | Kleines Muster vorher/nachher | Strukturfixture vorher/nachher |
|---|---:|---:|
| Entwurf sichern | 859,44 / 864,53 | 3.184,78 / 3.163,68 |
| Übergabe | 22,18 / 16,96 | 1.658,90 / 1.201,13 |
| Daten | 260,04 / 252,15 | 2.420,26 / 1.388,14 |
| Bestätigen | 27,52 / 11,34 | 1.864,90 / 828,02 |

Produkt-Revisionslesungen in beiden Profilen: 4/4/7/6 → 2/2/2/1. Registry-Lesungen und sämtliche Bytes, CPU-, Blockzeit-, Speicher- und GC-Werte stehen in den [Rohdaten](../measurements/2026-11-17-konfi-tempo-p1-umbau/). Die 31.205.208-Byte-Strukturfixture enthält 16.601 synthetische Vektorressourcen-Bäume (83.005 Objekte/Arrays zusätzlich) in einem inerten Konfigurationsfeld, weiterhin ein wählbares Design mit neun Elementen. Kein Kundendokument. Die echte Knotenzahl ist unbekannt; keine strukturelle Gleichheit behauptet. Einfrieren im ersten gemessenen Lauf 31,53 / 22,06 / 26,62 / 10,53 ms je Anfrage, inklusive aller Wiederholungen in dieser Anfrage, nicht je Dokument.

Ergänzende Messungen abgeschlossen (gleicher Runner, getrennte Prozesse nacheinander, feste Checkouts `105e398`/`cdd63ea`). Acht große Zeichenketten ergeben 31.205.209 Bytes: Sicherung 2.760,98 → 2.556,45 ms, Übergabe 1.580,51 → 1.098,46 ms, Daten 2.342,16 → 1.300,93 ms, Claim 1.769,27 → 722,10 ms. Rohdaten `blobs-*.json`.

Zwei gleichzeitige Kunden, drei Runden nach einer Aufwärmrunde (`pair-*.json`): beide vollständig erfolgreich; weiterhin deutlich längere Antwortzeiten durch gegenseitige Blockierung. Der alte Runner speichert bei gerader Stichprobenzahl den **oberen Median** (vierter von sechs Werten): Sicherung 8.437,99 → 7.151,47 ms, Daten 6.120,54 → 4.039,34 ms. Diese Werte sind ausdrücklich nicht das arithmetische Mittel der beiden mittleren Werte; Einzelwerte stehen unverändert in `samples`. Kein Kapazitätslimit aus diesen Zahlen abgeleitet, P3 bleibt getrennt.

20 Übergaben nacheinander, zusätzlich ein Aufwärmlauf, Strukturfixture, `--expose-gc` für beide Checkouts (`memory-*.json`): Heap nach explizitem GC vor/nach der Serie 155.871.056 → 157.440.640 Bytes (Basis), 155.879.432 → 157.795.080 Bytes (Teil A). Rund 1,6 bzw. 1,9 MB Zuwachs einschließlich bewusst gehaltener Messereignisse/Übergaben; keine 31-MB-Dokumentansammlung je Kunde erkennbar. Kein Beweis absolut konstanten Heaps oder einer Hosting-Speichergrenze. RSS und Heap in den Anfrageereignissen sind Vorher-/Nachher-Stichproben, **keine kontinuierlich gemessenen Spitzenwerte**. CPU/GC bei überlappenden Anfragen nicht exklusiv zurechnen.

Kein Beleg für unter fünf Sekunden am Handy; der gesamte echte Browserweg muss vor Live gesondert gemessen werden.

## V2/V3 und Aufbewahrung

V2 ist im zweiten Implementierungs-Commit enthalten. Direkt nach erfolgreichem Speichern startet die Bildvorbereitung mit einer signierten Prüfstandadresse. Shop, Store, Snapshot, Pakethash, Endung und eigener HMAC-Zweck sind gebunden; nur GET/HEAD liefern das gleiche geprüfte PNG, niemals Archiv oder Originale. Wie die bestehende Angebotsadresse kein eigenes Ablaufdatum: lesbar nur solange das unveränderliche Paket vorhanden ist. Kein Sitzungsobjekt im Hintergrundauftrag, Elternzuordnung im Messlog bleibt. Kein Angebot und keine Warenkorb-Konfiguration beim Bildstart.

`_gravuru_bild` bleibt unverändert im Angebotsformat: insbesondere `ops/shopify/thank-you-preview/src/model.mjs` akzeptiert nur diese Adresse. Die neue Adresse ist ausschließlich interne Shopify-Uploadquelle und wird nicht als neue Warenkorbeigenschaft ausgegeben. Vorabstart, theme-cart und /data verwenden dieselbe URL und damit denselben Dateinamen (SHA-256 der URL). Eine neue Entwurfsrevision hat einen neuen Snapshot und damit eine neue Datei. Laufende Aufgaben/Cache weiterhin höchstens 64/256; keine neuen Limits. Neustart findet die Datei anhand des Namens wieder. Eine konkurrierende fileCreate-Ablehnung wird durch erneutes Nachschlagen derselben Datei aufgefangen; keine umbenannten Duplikate. Andere Fehler bleiben beim echten /data-Aufruf sichtbar, beeinflussen die erfolgreiche Sicherung jedoch nicht.

185 gezielte Backend-/bisherige Warenkorbtests erfolgreich (zwei Python-Aufrufprobleme durch den bereits vorhandenen Python-3-Pfad behoben und gezielt nachgeprüft). Zusätzliche Fälle: alle Bestandteile der neuen Signatur, anderes Paket/Store/Shop, nur PNG, Bytegleichheit mit Angebotsadresse, keine Konfiguration beim Bildstart, kein Start nach fehlerhafter Sicherung, fehlgeschlagener Vorabstart mit erfolgreicher späterer Übergabe, zwei gleichzeitig startende Service-Instanzen, ausgeschöpfte Aufgabenliste mit Wiederholung, neue Revision/neue Quelle, alte Warenkorb-Clients und Bestellvorschau.

V2-Vergleich: gleicher Blob-Aufbau, eine Aufwärmung/drei Läufe, Teil A → Teil A+V2, Rohdaten `v2-before.json`/`v2-after.json` (nachher nennt noch HEAD `cdd63ea` vor dem Commit). Sicherung 2.566,21 → 2.584,45 ms, Übergabe 1.097,92 → 1.100,83 ms, Daten 1.282,82 → 1.181,67 ms, Claim 730,96 → 739,12 ms. Erste gemessene Bild-Wartezeit 187,83 → 84,92 ms. Der früher begonnene Hintergrundlauf dauert insgesamt etwa 1,88 statt 0,89 s, weil nun auch die blockierende Übergabe in seinem Zeitfenster liegt. **V2 allein bringt in diesem Profil etwa 0,1 s; die Blockierung wird nicht beseitigt.** Genau ein Start im Entwurfsereignis; Übergabe/Daten nutzen denselben Auftrag. Kein Nachweis realer Shopify-Latenz.

V3 folgt als getrennter Commit: identische, schon laufende/fertige Sicherungen beim Öffnen der bestehenden Übersicht wiederverwenden; abschaltbar, zunächst aus.

Chris hat auf die offene Aufbewahrungsfrage zuletzt **45 Tage für unbenutzte Entwürfe** vorgegeben; dies ersetzt seine vorherigen 30 Tage. Noch keine Löschlogik oder Löschung, keine Live-Aktivierung. Definition/Schutz benutzter Prüfstände, technische Bereinigung und Shopify-Dateien müssen vor einer Aktivierung konkret geprüft werden; aus der Frist keine weiteren Regeln ableiten. Direkt an Claude und in #254 gemeldet.

Nächster Schritt: Claudes Teil-A-Review, ergänzende Messungen und die getrennten Implementierungs-Commits V2/V3; danach Gesamtprüfung. Nichts live ohne neue Freigabe Chris.

## V3: Vorbereitung auf der vorhandenen Übersicht

Der dritte Implementierungs-Commit ergänzt das stille Vorabsichern ausschließlich für Prio R15 hinter `GRAVURU_CUSTOMER_PRE_SAVE_ON_REVIEW=enabled`. Nicht gesetzt = aus. Der Host gibt die Freigabe pro Modellantwort weiter; ungültige Werte werden abgewiesen. Keine Live-Konfiguration gesetzt. Das Öffnen der bereits vorhandenen Übersicht startet dieselbe Bild-/Entwurfssicherung, die bisher erst beim letzten Klick lief. Erst der letzte Klick beginnt weiterhin Angebot, Preisprüfung und Warenkorbübergabe.

Ein exakter kanonischer Vergleich statt eines kollisionsfähigen Hashs umfasst Produktbindung, Design, bereinigte Objekte, Optionen, Menge, gespeicherte Editoroptionen, Warenkorbbearbeitung und verwendete Medien einschließlich unveränderlicher Blob-Identitäten und Logo-Metadaten. Der Schlüssel bleibt nur im Speicher. Eine identische laufende oder fertige Sicherung wird wiederverwendet. Änderungen werden seriell nach einer laufenden Sicherung gespeichert, damit keine konkurrierenden privaten Revisionen entstehen. Vor und nach der Vorbereitung sowie vor der Übergabe wird Gleichheit geprüft. Fehler beim Vorbereiten bleiben still und werden beim echten Klick erneut versucht. Seitenende beendet die Wiederverwendung; kein automatischer Warenkorb.

107 gezielte Tests im abschließenden V3-Lauf bestanden: bestehende HTTP-Kunden-/Theme-/Nicht-Theme-Wege, Konfiguration, Clients, laufende und fertige Wiederverwendung, sofortiger Klick, Änderungen/Menge/Medien/Cart-Edit, Rückgängig, serielle Revisionen, Vorabfehler/Wiederholung und Schließen während laufender Arbeit. Drei bestehende Windows-Aufräumfehler im Modellcache-Test wurden auf `105e398` reproduziert; ausschließlich Test-Cleanup zusammengelegt, Datenbank vor Verzeichnisentfernung geschlossen. Keine Laufzeitänderung dafür.

Sichtprüfung mit echtem gebautem Editor in Chrome, 390×844, gleiches mitgeliefertes Muster und identische Daten: [Übersicht vorher](../measurements/2026-11-17-konfi-tempo-p1-umbau/p1-uebersicht-vorher.jpg) / [nachher](../measurements/2026-11-17-konfi-tempo-p1-umbau/p1-uebersicht-nachher.jpg) bytegleich (SHA-256 `186165af3d583c6638040c386add85a6529c6341c882ad7167f4d1e818dbc80b`). [Bestehender Fehler vorher](../measurements/2026-11-17-konfi-tempo-p1-umbau/p1-fehler-vorher.jpg) / [nachher](../measurements/2026-11-17-konfi-tempo-p1-umbau/p1-fehler-nachher.jpg) ebenfalls bytegleich (`cab2a10005ce6e5fe4aee4520ccc91253748b9b07bf9547b098ae9d807d77b4`). Lokale reproduzierbare Fixture: `node scripts/preview-cart-presave.mjs <checkout> <port> [enabled]`, echte Browser-Bildvorbereitung mit synthetischem Speichern (1 s); die Übergabe endet absichtlich im bekannten Fehler, kein Shopify-Zugriff. Zähler: nach Übersicht 1 Sicherung/0 Übergaben; nach Klick 1/1; unverändertes Wiederöffnen weiterhin 1/1; nach Textänderung und Wiederöffnen 2/1; nach erneutem Klick 2/2. Damit kein zusätzlicher Save beim Klick auf unveränderten Stand. Dies ist Funktions-/UI-Nachweis, kein Lauf bis zum bestätigten Shopify-Warenkorb und keine Handy-Geschwindigkeitsfreigabe.

Teil A und V2 sind bereits gleichprofilig vor/nach gemessen. V3 verschiebt Sicherungszeit vor den finalen Klick, sofern die Übersicht lang genug offen war; sofortiger Klick wartet auf denselben Auftrag. Der echte gesamte Handyweg einschließlich Shopify bleibt vor Aktivierung zu messen. Claudes Review von Teil A verlangt F1/F2 sowie ergänzende Tests/Dokumentation; diese werden in einem Folgecommit abgearbeitet. V2 ist direkt zum Review übermittelt. V3 bleibt aus, Aufbewahrung 45 Tage bleibt ohne erfundene Bereinigungsregeln. Nächster Schritt: Review-Nachweise und Claudes V2/V3-Prüfung. Nichts live.
