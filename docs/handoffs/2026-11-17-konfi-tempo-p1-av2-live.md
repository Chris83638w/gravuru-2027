# P1: begrenzte Live-Messung von Teil A + V2

17.11.2026, Claude als Operator, Astra koordiniert und prüft die Belege. Auftrag #254, PR #255. Chris gab ausdrücklich „live für die Messung von Teil A + V2“ frei und bestätigte anschließend direkt bei Claude „live für A + V2“. Umfang: ausschließlich der geprüfte isolierte Stand `b51e9d73cf0f9056335ee11cdf92c52041608c3d`, drei vollständige Warenkorb-Durchläufe, Rückstellung auf `9af3a1ac` und Kontrolle. Kein V3, kein Merge, keine Bestellung, keine dauerhafte Aktivierung. [Freigabe](https://github.com/Chris83638w/gravuru-2027/pull/255#issuecomment-6955024112), [Operatorbericht](https://github.com/Chris83638w/gravuru-2027/pull/255#issuecomment-6955299093). [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) unverändert.

## Ergebnis und gleiches Messprofil

Chrome/Playwright, 390×844, CPU ×4, ohne Netzwerkdrosselung; öffentliches Produkt `familienschild-acryl-baum-12x8-personalisiert`, eigene Testgestaltung. Beginn: letzter Klick „Jetzt in den Warenkorb“, Ende: geladene Warenkorbseite. Sämtliche vier neuen Läufe: eine Position, Menge 1, Preis/Summe 1.499 Cent, Shopify-CDN-Bild geladen, keine Bestellung.

| Stand | Lauf 1 | Lauf 2 | Lauf 3 | Median |
| --- | ---: | ---: | ---: | ---: |
| 1b am Nachmittag (`e447a859`) | 23.868 ms | 21.726 ms | 22.579 ms | 22.579 ms |
| Teil A + V2 (`b51e9d73`) | 18.679 ms | 17.970 ms | 18.403 ms | 18.403 ms |

Differenz der Mediane: **4.176 ms beziehungsweise 18,5 % weniger**. Das Ziel unter fünf Sekunden ist weiterhin nicht erreicht. Kontrolllauf nach Rückstellung jetzt 21.875 ms, am Nachmittag 22.597 ms. Ein einzelner Kontrolllauf bestätigt die Funktion des Rückwegs, nicht statistisch identische Geschwindigkeit. Die Dreier-Serien liegen etwa 2,5 Stunden auseinander; gleicher Messaufbau, aber kein zeitgleich kontrollierter Kausalversuch und kein physisches Handy/Mobilfunknetz. Ein Produkt, keine Parallelmessung.

| Anfrage | Browser-Median vorher → nachher | Handler-Median vorher → nachher |
| --- | ---: | ---: |
| Sicherung | 5.607 → 5.314 ms | 4.706,95 → 4.481,51 ms |
| Übergabe | 2.691 → 1.911 ms | 2.564,47 → 1.769,49 ms |
| Warenkorbdaten | 6.313 → 4.854 ms | 5.946,89 → 4.462,41 ms |
| Abschluss | 3.108 → 1.598 ms | 2.595,34 → 1.244,92 ms |

Median der je Lauf aufsummierten vier Browseranfragen: 17.675 → 13.671 ms. Davon zu unterscheiden: Summe der vier einzelnen Browser-Routenmediane 17.719 → 13.677 ms; Summe der Handler-Routenmediane 15.813,65 → 11.958,33 ms. Die ursprünglichen Summenzahlen im Operatorbericht stimmen als **Median der Lauf-Summen**; Astras zunächst vorgeschlagene Bezeichnung als Summe der Routenmediane war falsch und wurde gegenüber Claude berichtigt. Browser-Anfragedauern sind keine reine Serverzeit; sämtliche Zwischenwerte ersetzen nicht den vollständigen gemessenen Browserweg.

## Durchführung und Rückweg

UTC, aus Claudes Operatorbericht, kein eigener zweiter Serverzugriff durch Astra:

- Gegen 17:03 Ausgangsstand `9af3a1ac` anhand Startdatei geprüft.
- 17:05:07 Kandidat eingerichtet: 1.899 Dateien, davon 24 aus dem Paket, Rücklesen gleich, keine fremden Dateien. Paketgröße 204.645 Bytes. Editor-/Browsercode bleibt unverändert; die 24 Dateien enthalten die vorherige Instrumentierung gegenüber dem aktiven Stand.
- 17:05:50 umgeschaltet, Startdatei `d02d874a…` → `08af2b39…`, Sicherung `app.cjs.bak-20261117-av2`, Neustart.
- 17:06:31–17:09:24 drei vollständige Läufe.
- 17:09:38 Messprotokoll gelesen: 15 Ereignisse, 15 GC-Nachlieferungen, keine unlesbaren Ereignisse.
- 17:10:17 zurückgestellt, Startdatei wieder SHA-256 `d02d874a6700371ae8c2b49a0a11c6ed93863ed69d84d6ff0eb46bc082d7bb29`, Rücklesen gleich, Neustart.
- 17:10:47–17:11:53 erfolgreicher Kontrolllauf, wieder Logformat Version 1. Claude bestätigt: live wieder `9af3a1ac`, keine weitere Live-Aktion.

Der neue Kandidatenordner enthielt wie bei 1b keine 753 zur Laufzeit erzeugten Vorschau-Zwischendateien. Der erste Editorstart war kalt. Dieser Start liegt vor dem letzten Klick; indirekte Cacheeffekte sind damit nicht ausgeschlossen.

## Befunde und Grenzen

Teil A: Produktlesungen 7 statt 21, Registry-Dokumentlesungen 8 statt 12; insgesamt **15 statt 33**, entsprechend 468.077.745 statt 1.029.771.039 summierte zurückgegebene Dokumentbytes. Je Lesung weiterhin 31.205.183 Bytes. Kein gemessener Plattenverkehr. Nachprüfungen bleiben erforderlich und erhalten; eine frische Phase nach Warten kann den Dokumentstand erneut lesen und prüfen.

V2: Bildstart jetzt der Sicherung zugeordnet. Bildwartezeit im Datenaufruf 2.768 / 1.959 / 2.115 ms, vorher 3.811 / 2.826 / 2.853 ms. Der gesamte Hintergrundauftrag dauert 5,7–6,1 s. Das ist keine exklusiv Shopify verursachte Zeit: eigene Pollingpausen und Verzögerungen durch blockierende Arbeit liegen ebenfalls im Fenster. Daraus folgt keine technische Untergrenze und kein Beleg, dass weitere Verbesserung unmöglich wäre.

Sicherung bleibt mit Handlerzeiten 4,4–4,7 s ein großer Block; `review_prepare` 3,1–3,6 s, darin `review_validate` 1,3–1,7 s. Prozessblockaden während Sicherungen weiterhin etwa 2,5–2,7 s. CPU/GC und Speicherwerte sind prozessweit; parallele Fenster überlappen. RSS im neuen Beleg **1.590–2.611 MiB**, auf ganze MiB gerundete Stichproben; das frühere Maximum 2.532.872.192 Bytes entspricht etwa 2.415,54 MiB. Kein gemessener Verbrauch je Kunde, keine kontinuierlichen Spitzenwerte, kein Ursachenbeweis für den höheren Wert und keine neu ermittelte Hostinggrenze. Kapazitätsgrenzen unverändert, P3 nicht vorweggenommen.

Logzuwachs für drei Übergaben 102.697 Bytes (215.141 → 317.838); nach Kontrolllauf 324.090 Bytes. Rotation weiter offen. Vier weitere Test-Entwürfe, laut Operator etwa 150 MB, dazu Testbilder bei Shopify; nichts gelöscht. Separate fremde Speicherwartung in Plesk nur beobachtet, nicht untersucht oder verändert; kein Zusammenhang mit den Messwerten behauptet.

## Belegprüfung und nächster Schritt

Claude lieferte [live-sanitized.json](../measurements/2026-11-17-konfi-tempo-p1-a-v2/live-sanitized.json) in `7432b925c00cab7322722b03b257acff8cfa9258`, als einzige Dateiergänzung auf dem P1-Branch. [Nachlieferung und Präzisierungen](https://github.com/Chris83638w/gravuru-2027/pull/255#issuecomment-6955402506), [abschließende Berichtigung zu Medianen und Speichereinheiten](https://github.com/Chris83638w/gravuru-2027/pull/255#issuecomment-6955463396). Dafür wurde das vorhandene Serverlog um 17:14:53 UTC nur lesend abgefragt; keine weitere Messung, Umschaltung oder Löschung.

Astra hat **20/20 vollständige SHA-256-Hashes und Byte-Längen** neu berechnet, 20 eindeutige traceId-Präfixe, **16/16 Browser-/Server-Paare** auf Route, Status und Handlerdauer geprüft sowie **4/4 Bild-Elternzuordnungen**: Kandidat zur Sicherung, Kontrolle zur Übergabe. Browser-Marken ergeben exakt die vier berichteten Gesamtzeiten; Profil und Warenkorbprüfung stimmen mit der Vergleichsserie überein. Alle drei neuen Läufe ergeben 7 Produkt-/8 Registry-Lesungen und 468.077.745 Dokumentbytes; maximal 49 Schritte, `droppedStepCalls` überall 0, 15 zugeordnete GC-Zusammenfassungen. Der zunächst abgeschnittene zweite Claim ist aus dem Log vervollständigt: `registry_document_digest` 363,9 ms, ein Aufruf.

Die Hashes gehören den kompakten JSON-Zeilen, nicht den Original-Logzeilen. Nur ausgewählte Schritte/Zähler, traceIds auf acht Zeichen, Uhrzeit ohne Datum, GC als Anzahl/Pausenzeit statt eigener Originalzeilen; Speicher auf MiB gerundet. Kontrolllauf mit fünf exakten Version-1-Zeilen, dort keine CPU-/Speicher-/GC-Werte. Konsistenzprüfung des gelieferten Belegs, kein unabhängiger erneuter Original-Serverzugriff durch Astra. Rohdaten nicht umformatiert oder verändert. Keine erneuten Runtime-Tests für reine Messdokumentation; isolierter Messkandidat zuvor 199/199 gezielte Tests, Review abgeschlossen. Keine Laufzeitänderung durch diesen Bericht.

Der begrenzte Live-Auftrag umfasst keinen Dauerbetrieb. Entscheidung darüber bleibt bei Chris. Für das Ziel unter fünf Sekunden sind weitere Verbesserungen nötig; die bestehende Sicherung ist anhand dieser Daten ein sinnvoller nächster Untersuchungsbereich, kein bereits beauftragter neuer Live-Eingriff. V3 bleibt aus, P2/P3 separat; 45 Tage bleiben die bestätigte Aufbewahrungsdauer ohne erfundene Löschregeln.
