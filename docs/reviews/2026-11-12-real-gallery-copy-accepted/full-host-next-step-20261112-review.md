# Nach echtem Cold/Reopen: nächster enger Abnahmeschritt

12.11.2026, rein lesender unabhängiger Review. Frisch gelesen: [Claudes Ergebnis 07:18](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6816307301), [vorheriger Kontowächterabbruch](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6811815791), [übermittelte Speicherentscheidung von Chris](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6815624140) und [Legacy-Sicherung](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6811910513). Außerdem die beiden aktuellen Übergaben, der vorhandene HTTP-/Sitzungsvorschlag und die tatsächlichen Host-/Sitzungsquellen in f85390b. Kein eigener Benchmark, Hoststart, Test, Serverzugriff oder Appänderung.

**Bewertung: Das enge Kopienkriterium ist nach dem Operatorbeleg bestanden. Der nächste sinnvolle Schritt ist der bereits vorgesehene isolierte tatsächliche Zwei-Store-Host mit nativer Sitzung. Ein weiterer Galeriebenchmark oder eine weitere Speicheroptimierung auf Verdacht ist daraus nicht erforderlich.** Dies ist noch keine Liveabnahme.

## Was konkret bestanden ist

Gemeldeter Kandidat `f85390bd3494920679b06c3b39cabf96c95c1343`, drei Quelldateien vor beiden Läufen geprüft. Cold/Reopen jeweils Exit 0, kein Wächterabbruch, 1.531,7/1.610,7 MiB Prozesspeak unter der ausdrücklich unveränderten **1.800-MiB-Prozessgrenze**. Cold erreicht `cache_saved`, Reopen `cache_hit` und null leichte Produktlesungen; dieselbe Quellkopie bleibt vor/nach beiden Läufen bei `487c9f5238f0ebd1ce88437e3661e9790c589512fc187d4ddc6cded5e2095bc4`. Das ist der zuvor fehlende echte Nachweis für die beiden Korrekturen.

Die Bindungsphase sank von 81,221 auf 33,437 s, davon Dokumentlesen von 58,705 auf 10,847 s. 245.830 Karten wurden gebaut; der 14.254.081-Byte-Cache wurde in 4,233 s gespeichert. Die verbleibende Spitze liegt laut Operator nun in der Bindungsphase. Das rechtfertigt keine ungefragte Verschiebung der bereits erfüllten Kriterien.

**Speicherrahmen sauber fortschreiben:** Die ursprüngliche Übergabe nennt noch 3,3 GiB Konto und keine Anhebung. Die spätere Chris-Entscheidung erlaubte mehr Kontospeicher; Claude meldet nun PMEM 12G als zurückgelesenen Wert und einen Kontowächter von 6.500 MiB RSS-Summe. Beobachtet wurden 3.598/3.835 MiB. Nicht behaupten, die ursprüngliche 3,3-Grenze sei eingehalten worden oder wir hätten PMEM selbst geändert/geprüft. Der Kontorahmen wurde geändert, das Prozesskriterium nicht. RSS-Summe und CloudLinux-PMEM sind getrennte Messgrößen.

## Vor dem Hoststart noch genau zu belegen

Die Legacy-Sicherung existiert jetzt (drei Dateien, quick_check/Hashes im verlinkten Operatorbeleg). Das schließt die frühere Sicherungslücke, **nicht automatisch die Hostverdrahtung**. Benötigt wird nur ein kompakter technischer Anschlussbeleg:

- Tatsächliche private Einstiegdatei/Fabrik und Releasepin beider Stores, einschließlich externem `legacyRelease`; f85390b allein bezeichnet diesen externen Anschluss nicht. `createAcrylEmployeeHost` startet Legacy vor dem separaten Acryl-Datenpfad-Override.
- Aufgelöste Kopienpfade beider Dreierbestände sowie Lock-/Journal-/Preview-/Katalog-/Worker-/Buildausgaben; keine Verbindung zu Live oder Sicherungsoriginalen. Nur Pfade/Dateipins, keine privaten Konfigurationen oder Geheimnisse.
- Tatsächlich wirksame Worker/Warm/Delay-, Modellcache-/Slimmer-/Preview- und TTL-Optionen. Workeroptionen stammen auch aus globalem `process.env`. Kein stilles Abschalten teurer Hostbestandteile, wenn danach Vollhostgleichheit behauptet wird.

Die bestehende erlaubte Routenauswahl und äußere Netz-/Transportisolation bleiben: keine Cart-/Order-/Shopifywriter, auch kein Theme-Cart-GET, der Checkoutbilder erzeugen kann. `merchant-test-only` alleine ist keine Schreibsperre. Der Start einer Werkstatt kann auf der Wegwerfkopie erwartete Migrationen/abgeleitete Cachewrites erzeugen; deshalb nicht pauschal deren komplette Bytegleichheit verlangen. Die Sicherungsoriginale bleiben unverändert.

## Minimaler tatsächlicher Sitzungsbeleg

| Feldgruppe | Erforderlicher konkreter Wert |
|---|---|
| Identität und nativer Einstieg | Pro tatsächlichem Store eine belegte bestehende aktive Produkt-/Variantenbindung. Für Hauptacryl: Shopify `16190784602492`, native `cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0` R1 plus konkrete Variante/Assignmentrevision. Native Proxy-Signatur → echte ausgegebene Sitzung, keine direkt erfundenen Tokens/Bypässe. Legacyziel aus seinen vorhandenen neun Köpfen exakt benennen; nichts neu binden. |
| Zeit und Betrieb | Start-/Endzeit, mindestens 60 s echte Beobachtungsdauer, gleiche Prozessidentität ohne Neustart/503/Wächterabbruch. Tatsächliche TTL und `expiresAt` unverändert; Default vier Stunden ist kein Auftrag für eine künstliche 60-s-TTL. Warmup-/Workeraktivität und tatsächliche Überlappung mit den bereits vorgesehenen begrenzten parallelen Leseanfragen nennen. |
| Positive Bedienpfade | Erfolgreicher nativer Start, Modell- und Galerieantwort zu Beginn und nach mindestens 60 s; tatsächlicher Store/cfg/Revision, Auswahloptionen, native Preise und Treffer-/Seitenzahlen mit dem jeweiligen gepinnten Stand vergleichen. Benötigte Entry-/iframe-/Editorressourcen aus den zurückgegebenen Pfaden erreichbar; HTTPstatus, Dauer und Fehlerzahl berichten. Die 208 Benchmarkkarten sind keine vorgegebene Hauptproduktzahl. |
| Schutz und Nebenwirkungen | Fehlende/gefälschte Sitzung und fremde Origin werden nativ abgewiesen. Keine erfolgreiche Cart-/Order-/Shopwriteaktion; wirksame äußere Sperre benennen. Originalhashes unverändert; erwartete Schreibvorgänge auf Testkopien von Produkt-/Bindungs-/Bestelländerungen trennen. Keine Kundendaten/Token/Vollmodelle in den Bericht. |
| Speicher und Abschluss | Verwendete Prozess-/Kontoabbruchgrenzen vorher festhalten; Peak des gesamten isolierten Hosts einschließlich Worker und parallel weiterlaufender Dienste separat als Prozess-/Kontowerte, Ende/Exit und Cache-/Workerereignisse nennen. Keine stillschweigende Grenzerhöhung und keine aus dem Einprozessbenchmark abgeleitete Vollhostgarantie. |

Es werden hier keine neuen Ladezeitgrenzen oder zusätzliche Produktentscheidungen erfunden. Konkrete Antwortzeiten und Wiederholungen belegen zunächst die vorhandene Stabilitätsanforderung. Ein reiner `createShopEntry`-Harness darf nur als nativer Entryteiltest gelten, wenn die private Mischhostfabrik/Assetverdrahtung nicht tatsächlich verwendet wurde.

Nach erfolgreicher isolierter Hostsitzung kann Root die bereits erklärte Programmumschaltung im belegten Freigabescope mit Rückweg bewerten. Produktupdate/-anlage/-publikation, echte Warenkörbe/Bestellungen, v9-Übernahme und der konkrete Hauptupdate-Review bleiben davon getrennt. Die bestätigten fachlichen Angaben werden nicht erneut abgefragt.
