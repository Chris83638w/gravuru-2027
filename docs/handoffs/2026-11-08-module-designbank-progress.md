# Konfi-Module und Edelstahl-Designbank – gesicherter Arbeitsstand

Stand: 08.11.2026. Dieser Nachweis unterscheidet vorbereitete Änderungen von tatsächlicher Veröffentlichung.

## Unveränderliche Vorgaben

- Ein gemeinsamer, freigegebener R15-Konfigurator. Keine neue Oberfläche pro Produktgruppe.
- Kundenaufbau, Bedienung und bestehende Gestaltung bleiben unverändert.
- Produktgruppen bestimmen verfügbare Module und zulässige Ausführungen. Vor Neuanlage werden konkrete Optionen und Preise bestätigt.
- Edelstahl-Türschilder: alle acht Quellformen, 80 Größen, 404 gültige Ausführungen. Fotos aus; optional SVG-Logo für 12,99 EUR. Ausgangsdesign Familie Rosenberg.
- Historische Bestell-/Warenkorbstände und Preise dürfen durch Synchronisierung nicht umgeschrieben werden.

## Nachgewiesene Sicherung des veröffentlichten Servers

Die private Sicherung `mika-module-design-backup-20261108-v1` ist abgeschlossen. Zeitraum: 08.11.2026, 10:36:45 bis 10:38:42 Uhr Europe/Berlin.

Gesichert wurden alle sechs SQLite-Dateien der nativen Werkstatt und Händleranbindung mit Integritätsprüfung, zugehörige JSON-Dateien, beide Startdateien und die aktive Laufzeit. Insgesamt 13 Dateien. Datenbanken und private Nutzdaten werden nicht in GitHub abgelegt.

Belegdatei auf dem Server: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-module-design-backup-20261108-v1/receipt.json`.

Exakte SHA-256 des Belegs: `4adcfced9feac1a0c6c8d9649cf9590aeaf63bfd664b53746c7f7fc60ed985ef`.

Aktive Codebasis: `private/mika-steel-r15-shopify-20261108`. Ein zusätzlicher, lesend erzeugter Vergleich umfasst 770 Quellmodule. Manifest-SHA-256: `5f10e8caa033dc922562e8d3d57b80640e7f451d06a46ba2f0acfac954e91e94`.

## Module: lokale Abnahme mit echten Produktdaten

[PR #201](https://github.com/Chris83638w/gravuru-2027/pull/201) enthält versionierte Module, Produktgruppen-Vorlagen und bestätigte Anlagepläne. Die echte Edelstahlquelle wurde lokal einmal mit und einmal ohne Logo angelegt. Beide Entwürfe behalten alle 80 Größen, 404 Kombinationen und die 15 ursprünglichen Designobjekte. 808 Preis-/Geometrievergleiche bestanden; Wiederholung erzeugt keine Duplikate.

Siehe [vollständige lokale Abnahme](../reviews/2026-11-08-module-profiles/real-steel-local-acceptance.md). Die zentrale Browser-Sichtprüfung ist noch offen: Die Automatisierungsnavigation sendet `Sec-Fetch-Site: cross-site` und wird durch den bestehenden lokalen Schutz mit 403 zurückgewiesen. Keine Schutzregel wurde abgeschwächt.

## Fehlende Designs: geprüfter Datenkandidat

Der alte Import beschränkte die normale Türschildgruppe auf D1: 15 formatspezifische Originale, aber jeweils nur eine Wahl pro Größe. Der neue additive Kandidat enthält 251 bereits vorhandene, passend freigegebene Originale; abhängig von der Größe 9–23 Wahlmöglichkeiten. AB 12×8 und RE 15×10 erhalten jeweils 21.

Alle 80 Größen, 404 Preis-/Befestigungskombinationen, bisherigen Originale und Rosenberg als Start bleiben erhalten. Vier ungeeignete Originale und drei Größenzuordnungen zweier weiterer Originale wurden dokumentiert und nicht still umgestaltet.

Bestanden: 7.021 Struktur-/Galerie-/Preisprüfungen, 1.497 Vorlagenverträge und 37 Kundenfälle mit eigener Texteingabe. Das gemessene native Startmodell wächst nur von 309.081 auf 311.691 Byte; komprimiert von 120.638 auf 122.259 Byte. Weitere Designs und Schriftpfade werden nachgeladen.

Kompakter Kandidat: `candidate-product-document.compact.json`, SHA-256 `edbb74578eae61fa2dc288ab04588aa7115a0d0b88c4306b7b8a823d66cecb4a`. Transportdatei: `candidate-product-document.compact.json.gz`, 3.275.617 Byte, SHA-256 `747d7c3246a180f465ecb36206f5b81078f9ef7a6fe73460e4035bd3ba1ff7e1`.

Die Transportdatei liegt geprüft ausschließlich unter `private/mika-steel-designbank-update-20261108-v1/`. Noch keine Produktrevision oder aktive Bindung wurde dadurch geändert.

## Ausstehende Übernahme

Die native Ausgangsrevision 3 wurde frisch gelesen und entspricht exakt der gesicherten Quelle. Für Revision 4 werden die vorhandenen Repository-/Binding-Funktionen verwendet; alle 404 Zuordnungen und die Katalogfreigabe müssen zusammen in einer Transaktion wechseln. Der frühere DRAFT-Importhelfer eignet sich dafür nicht unverändert.

Der bestehende komprimierte Shopify-Preisvertrag bleibt unverändert. Siehe [Aktivierungsprüfung](../reviews/2026-11-08-module-profiles/live-designbank-update-plan.md). Der sichere Operator-Lauf und seine Fehlertests werden separat vorbereitet. Live-Aktivierung und anschließender Kunden-/Warenkorbtest sind noch nicht erfolgt.

Die allgemeine Synchronisierung wird auf der vorhandenen Galerie-Sync-Engine ergänzt: bestätigte Moduländerungen und genau zugeordnete Designs, vollständiges Lesen der 404 Varianten, unveränderte Preise und atomare Aktivierung. Auch diese Ergänzung ist noch keine Live-Freigabe.
