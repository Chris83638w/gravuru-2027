# Galerie: gemessener Speicherfix für den nächsten echten Kopienlauf

12.11.2026, Codex/Astra. Eigener Branch `dev/astra-issue230-integration-candidate-20261111`; dieser Commit folgt auf `fcd104771f71c9fb4f48c03c5085ba99c0272675` und bildet mit dessen Lesekorrektur den neuen Runtimekandidaten. Kein Liveabschluss.

Claudes [echter Phasenbeleg](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6809368576) zeigte 245.830 Karten bei 548 MiB, danach den Abbruch über 1,8 GiB beim Speichern. Zwei byteidentische v3-Ansätze zeigten lokal keinen Vorteil und werden nicht ausgeliefert. Der neue v4-Codec komprimiert die unveränderte Feldauswahl in begrenzten Blöcken; die bestehende SQLite-Tabelle und payload/mac-Schnittstelle bleiben erhalten. HMAC vor Entpacken, keine frühe Deduplizierung und keine Änderung von Preis, Auswahl, Bindung oder Freigaben. Alte abgeleitete v2/v3-Caches gelten bewusst als Miss. Die fachlichen Produkt-/Designstände bleiben unverändert.

## Exakte Dateien gegenüber dem e496-Kandidaten

| Datei | SHA256 |
|---|---|
| app/workshop/shop-product-binding-store.mjs | 119a276d75bb83a67457f0e2ad37849f27a56b7a1b4a9789f527d4efbb8bc600 |
| app/workshop/shop-gallery-snapshot.mjs | 8d2451a35813c02c03814d949db92380262c0e7bb6312dea45bc9deb10823a0d |
| scripts/shop-gallery-benchmark.mjs | b251e8832f670a501c7a05bf14d7df66e08ecee3519e408e9a689ef1928b4590 |

Der Benchmark gibt bei `--restart-child` sofort die vorhandenen Messereignisse mit RSS und festen Zahlenfeldern auf stderr aus; stdout bleibt Ergebnis-JSON. Genau zwei Appdateien plus ein Messwerkzeug ändern den ausgeführten Pfad gegenüber e496. Weitere Commitdateien sind Tests/Nachweise.

## Was geprüft ist

66 gezielte Store-/Epochfälle im vorherigen Teilcommit und 48 unterschiedliche Snapshot-/Galerie-/CLI-Fälle in diesem Stand grün. Unabhängige Quell- und Methodikreviews, keine weitere Komplettsuite behauptet. Die vier früher dokumentierten Linux-Baselinefehler werden durch diese Zahlen nicht umgedeutet.

Die kontrollierte synthetische Gegenprobe verwendet je getrennte Cold-/Reopen-Prozesse mit demselben Generator. 100.000 Karten: Cold-Gesamtpeak 718,93 → 378,71 MiB, Reopen 468,14 → 367,65 MiB; derselbe logische Inhalts-SHA. Zusätzlich ausschließlich v4 mit 250.000 Karten: Cold 551,60 MiB, Reopen 635,70 MiB. Gesamtpeaks enthalten die jeweiligen Diagnose-Prüfsummen. Alle sechs Prozesse exit0 unter 1 GiB Wächter, keine Heapgrenzanhebung. Dies ist kein Beleg für die tatsächliche Serverlast oder den Mischhost.

[Vollständige Belege und Grenzen](../reviews/2026-11-12-gallery-snapshot-v4/README.md), Paketmanifest SHA `148771202c7e936459795d4d0cd62ccbb42c8ebde253ce2d3b17a821f9ead651`; 21 exakt geprüfte Dateien, keine Datenbanken. Die sechs Quell-/Testkopien stimmen mit dem Kandidaten überein. Neue Cachegrenzen betreffen nur abgeleitete Speicherung; bei Fehlschlag bleiben die bereits aufgebauten Karten verwendbar.

## Genau nächster Schritt für Claude

1. In #233 ein einziges Kopienfenster ankündigen. Neuen Kandidaten aus dem gemeldeten Gesamtcommit bauen bzw. die drei oben gehashten Dateien kontrolliert in eine weitere isolierte Kopie von e496 übernehmen. Rücklesen, Basis und Deltaliste belegen; laufende R15-App unverändert lassen.
2. Den bisherigen `--local-copy --restart-child`-Aufruf mit tatsächlichem Tenant/Store/Shop, unveränderter echter Arbeitskopie und einer **neuen separaten** Messcachedatei ausführen. Ein Prozess, dieselben Grenzen: Prozess 1,8 GiB, Konto 3,3 GiB, zeitlich begrenzt. Keine Heap-/LVE-Erhöhung und keine parallelen Benchmarkprozesse.
3. Nur nach erfolgreichem Cold mit `shop_gallery_cache_saved` diesen Prozess beenden und separaten Reopen mit derselben Messcachedatei ausführen. Erwartet `shop_gallery_cache_hit`, kein Neuaufbau. Jeweils Exit, vollständige stderr/stdout-Belege, Prozess-/Kontospitze, Cache-Payloadbytes und Kopienhashes vor/nach berichten. Kalter Lesefehler/Write-failed ist kein bestandener Reopen.
4. Danach vollständige isolierte Hostsitzung entsprechend [Anschlussdokumentation](2026-11-11-operator-copy-context.md), inklusive separat gesichertem Legacy-Store und unveränderten nativen Prüfungen. 60 Sekunden Beobachtung ist keine Verkürzung der echten TTL. Keine Cart-/Order-Nebenwrites im Lesetest. Erst nach echtem Kopien-/Sitzungsbeleg die bereits von Chris ausdrücklich freigegebene Programmumschaltung mit Rückweg prüfen; keine neue Produkt-/Veröffentlichungsfreigabe ableiten.

Kategorienvergleich ist positiv; Legacy-Kleinidentitäten und konkreter nativer Hauptupdate-Review sind unabhängig offen ([Abstimmung](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6809492918)). Keine sechs Neuanlagen aus fehlenden Köpfen nur im Acrylregister ableiten. Preise/19% MwSt., Uploads, Starts und H1 sind bestätigt und werden nicht erneut erfragt. Achtspaltige Live-Suchstatistik bleibt bis zum funktionierenden neuen Runtimepfad unangetastet.

[Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); keine Designänderung in diesem Paket.
