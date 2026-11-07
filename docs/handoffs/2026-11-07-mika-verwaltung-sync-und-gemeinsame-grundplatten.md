# Mika · Verwaltung, Synchronisierung und gemeinsame Grundplatten

Stand: 07.11.2026. Eigener Branch `dev/mika-verwaltung-sync-absicherung-20261107` auf Astras Draft-PR #187, festgehaltener Ausgangscommit `6b799d9a79c789d097c970c6283cd4369d02f97b`.

## Auftrag und Grenze

Mikail beauftragte zunächst die Prüfung von #187 ohne Änderung. Nach der Rückmeldung erlaubte er, die gefundenen Verwaltungs-/Sync-Lücken getrennt zu beheben, ohne Astra während seiner anderen Korrekturen zu stören. Dieses Paket ändert ausschließlich die Quellenauflösung der Produktgruppen und den Identitätsvergleich beim Designabgleich. Es verändert weder Astras Branch noch bestehende private Datenbanken, die Online-Galerie oder den Live-Shop. Kein Main-Merge, keine Freigabe eines echten Designs, keine echte Shopify-Übertragung. Keine Kontaktaufnahme mit Astra in diesem Arbeitspaket.

Die umfassende vorherige Sicherung und die Nutzerentscheidungen bleiben in [der Gesamtübergabe auf dem Dokumentationsbranch](https://github.com/Chris83638w/gravuru-2027/blob/docs/mika-konfi-gesamtstand-20261106/docs/handoffs/2026-11-06-mika-konfi-gesamtstand-und-sicherung.md) erhalten. Dieses Paket arbeitet in einer neuen Arbeitskopie; seine Tests erzeugen eigene synthetische Datenbanken. Es ist keine neue Sicherung des laufenden Servers und behauptet das auch nicht.

Für Designarbeiten gilt weiterhin der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). In diesem Paket werden keine Designs umgestaltet.

## Ausgangsstand aus Astras Übergabe

- #187 ist ein Entwurf auf #186; #186 enthält Mikas #185. Materialauswahl, Bestätigung vor Produktanlage und Sync-Kern waren gegenüber #185 unverändert.
- Astras dokumentierter privater Online-Code ist `e166741c`; die zwei späteren Commits bis `6b799d9a` ergänzen Dokumentation/Nachweise. Das ist kein neuer Live-Test durch Mika.
- Privat dokumentiert: 462 Originale, 370 nativ bearbeitbar, 2.449 vorbereitete Ziele, 348 Produktgruppen, 240 Rohlinge. Weitere vorbereitete Importstapel sind noch lokal. Ein vorbereiteter Stand ist keine Verkaufsfreigabe.
- Vorlagen/Rohlinge/Alles, Schnellbearbeitung und voller Konfi mit Rückspeicherung sind vorhanden. Die zeitweise leere Chrome-Einbettung bleibt separat bei Astra.
- Der reale Galeriehost hat den Sync-Dienst noch nicht angeschlossen. Die lokale Verwaltung mit synthetischem Shop ist kein Nachweis für einen aktiven Shopify-Abgleich.

Quellen: [Astras aktuelle Übergabe](https://github.com/Chris83638w/gravuru-2027/blob/6b799d9a79c789d097c970c6283cd4369d02f97b/docs/handoffs/2026-11-06-galerie-navigation-astra.md), [Importstand](https://github.com/Chris83638w/gravuru-2027/blob/6b799d9a79c789d097c970c6283cd4369d02f97b/docs/reviews/2026-11-06-gesamtbestand/door-batches.md).

## Änderungen dieses Pakets

### Produktgruppen laden

Die Galerie löste bisher für jedes Designziel das vollständige Produkt erneut auf. Anschließend baute jeder einzelne Quellenaufruf die komplette Zuordnung erneut auf. Bei 348 Gruppen und 2.449 Zielen ergibt der alte erfolgreiche Aufrufpfad rechnerisch 855.049 native Lesezugriffe.

Die Zuordnung wird jetzt einmal je Vorgang aufgebaut; der Galerieadapter liest jedes Produkt einmal und behält nur die Zuordnung Design-ID → Familie. Native Dokumente werden innerhalb des jeweiligen Vorgangs in einem Cache mit höchstens **zwei Datensätzen insgesamt** wiederverwendet; aktuelle und historische Revisionen teilen dieses Limit. Es gibt keinen dauerhaften Cache, der spätere Änderungen verschluckt. Bestätigung und Ausführung lesen neu; die letzte Prüfung läuft weiterhin innerhalb der Importtransaktion.

Quelle der unveränderten Fachregeln: Mikails ausdrückliche Bestätigungspflicht vor Neuanlagen sowie #185. Optionen, Aufpreise, Maße, Familie, Materialangebot, Wiederholungsschutz und Konfliktverhalten werden nicht neu definiert.

### Exakte Materialzuordnung beim Designabgleich

Eine gemeinsame Materialart allein reicht nicht: z. B. zwei Acrylglasvarianten können dasselbe Fertigungsverfahren besitzen. Der Abgleich prüft jetzt zusätzlich vorhandene Variante, tatsächliche Stärke, gespeicherte Gravurseite und ausdrückliche Katalogfamilie. Profil, ausgewählte Formatvariante und Designbank müssen zusammenpassen. Eine fehlende optionale Variante bei Edelstahl/Schiefer wird nicht erfunden; alte eindeutige Familienzuordnung in der Formatvariante bleibt nutzbar. Fehlende oder widersprüchliche notwendige Angaben werden konkret gemeldet.

Quelle sind die vorhandenen nativen Familien-/Materialmodelle und Mikails Auftrag, Materialien getrennt und korrekt zu behandeln. Keine Ableitung aus Dateinamen, Bezeichnungen oder bloßer Bildfarbe; insbesondere keine Umdeutung von AA/AS in andere Acrylglasfamilien. Es werden keine neuen Produktmöglichkeiten oder Preise festgelegt.

Der Vergleich erfolgt vor der Übernahme von Foto-/Maskenressourcen, vor neuen Zielrevisionen und vor einer Shopanfrage. Auch ein gespeicherter älterer Sync-Plan wird beim Ausführen erneut geprüft. Bestehende Bestellungen und frühere Revisionen bleiben unverändert.

## Prüfungen

**43 unterschiedliche gezielte Tests bestanden, in Teilläufen:**

- 20 Produktgruppen-/Quellenadaptertests: 348 Produkte / 2.449 verschachtelte Designziele ergeben **696 native Reads und einen Registry-Aufbau**. Die Lastfixture liest jeweils eigenständig geparste Dokumente mit über 500 KB; Verdrängung aus dem Cache und gemeinsames Head-/Historienlimit sind gesondert geprüft. Änderungen unmittelbar vor der Transaktion werden weiterhin erkannt. Keine gemessene Server-RAM- oder Browserbeschleunigung behauptet.
- 19 Sync-Tests: 13 bestehende und 6 neue Identitätstests. Variante, Stärke und Familie werden jeweils auch mit echter synthetischer Foto-/Maskenquelle geprüft: null Assetimporte, null Remoteanfragen, keine neue Zielrevision oder Bindung bei Konflikt. Exakte Zuordnung, Bestellhistorie, konkurrierende Änderungen und unterbrochene Übertragung/Wiederanlauf bleiben geprüft.
- 4 HTTP-/Anschlusstests: tatsächlich montierte private Verwaltung, Bestätigungszwang und idempotente Anlage; genehmigter Designabgleich; standardmäßig ausgeschalteter echter Anschluss; Bildübernahme, gezieltes Medienupdate und Aktivierung mit nachgebildetem Shopify-Transport.

Ein erster Integrationslauf bestand in drei von vier Fällen. Der vierte erwartete noch die alte Linkbeschriftung aus #185; #187 hat sie absichtlich in „Verwaltung“ geändert. Der Test prüft jetzt das tatsächliche Verwaltungsziel samt aktueller Beschriftung; anschließend bestand auch dieser Fall. Die Oberfläche selbst wurde dafür nicht geändert. Ein erster paralleler Agentenlauf kollidierte beim gemeinsamen Windows-Testbuild; außerdem fehlte dort der gebündelte Pythonpfad. Die betreffenden Prüfungen bestanden anschließend sequenziell mit gesetztem Pfad. Kein Test wurde deshalb übersprungen.

Reproduktion mit dem gebündelten Node und Python; `GRAVURU_PYTHON` auf dessen Python setzen, `PYTHONPATH` auf die bereits bereitgestellten Prüfabhängigkeiten. Wegen des gemeinsamen Preview-Builds sequenziell ausführen:

```text
node --test --test-concurrency=1 app/workshop/product-group-templates.test.mjs scripts/lib/gallery-management-targets.test.mjs app/workshop/gallery-shop-sync.test.mjs app/workshop/gallery-shop-sync-materialidentity.test.mjs scripts/gallery-management.test.mjs scripts/lib/gallery-shop-connection.test.mjs
```

**Sichtbare Bedienprüfung:** eigener Server auf `127.0.0.1:8204`, neue ausschließlich synthetische Datenablage, keine Verbindung zum echten Shopify-Shop. Zwei Quellen auswählen → Optionen zusammenstellen → Vorlage speichern → konkreten Anlageplan prüfen → Bestätigungsbutton zunächst gesperrt → Häkchen setzen → genau zwei Entwürfe gespeichert. [Desktopnachweis](../reviews/2026-11-07-verwaltung-sync/desktop-bestaetigte-testentwuerfe.jpg).

In der Browseransicht 390 × 844: Sync-Ziel wählen → fehlende exakte Designfreigabe angezeigt → Synchronisieren bleibt gesperrt. Dokumentbreite 375 bei Viewport 390, kein horizontaler Überlauf in diesem Zustand. Die mobile Screenshot-Aufnahme brach zweimal mit einem Browser-Timeout ab, obwohl Bedienung und Zustandsabfrage funktionierten; daher kein mobiler Bildnachweis behauptet. Browsergröße anschließend zurückgesetzt. Kein physisches Smartphone getestet.

Ein dritter Unteragent prüfte beide Änderungen unabhängig. Sein konkreter Befund zum zunächst unbegrenzten Dokumentcache wurde vor Abschluss durch das gemeinsame Zwei-Datensatz-Limit behoben. Danach kein offener konkreter Reviewbefund. `git diff --check` sauber.

## Nutzerentscheidung: gemeinsame Grundplatten

Mikail fragte am 07.11., ob dieselben Tafelfotos für jedes Design dupliziert werden. Sein gewünschter Aufbau: ein wiederverwendbares Grundplattenbild für passende Angebote; Design und Befestigung als getrennte Ebenen; skalierbare Größen im korrekten Verhältnis.

**Befund:** Gemeinsame Daten sind derzeit mehrfach in nativen Produkt-/Größenständen eingebettet. Das bedeutet nicht, dass für jedes Design eine neue Tafel fotografiert oder gestaltet wurde. Besonders umfangreich sind wiederholte Schriftdaten: Astras Andenken-Messung nennt 1.656.286.500 Bytes gegenüber 8.594.405 Bytes eindeutiger vollständiger Schriften. Diese Werte beschreiben vorbereitete Dokumentinhalte, keine gemessene Server-RAM- oder SQLite-Größe. [Messung und Importgrenzen](https://github.com/Chris83638w/gravuru-2027/blob/6b799d9a79c789d097c970c6283cd4369d02f97b/docs/handoffs/2026-11-06-gesamtbestand-galerie-astra.md).

**Empfohlener Aufbau, noch nicht migriert:**

1. Grundplatten/Materialtexturen und Schriften einmal unveränderlich mit Inhalts-ID speichern; Produkte und Designstände verweisen darauf. Bestehende Ressourcenablage verwenden, keinen zweiten Bildspeicher daneben bauen.
2. Formkontur und reale Breite/Höhe in Millimetern separat speichern. Ein ausreichend hochauflösender Master kann bei gleicher Form und gleichem Seitenverhältnis mehrere Größen bedienen. 9 × 6 und 30 × 20 haben beide 3:2; 22 × 14 hat ein anderes Seitenverhältnis. Kontur, Rundungen, Ränder und Oberflächenstruktur dürfen nicht ungeprüft verzerrt werden.
3. Bohrungen und Beschläge anhand ihrer tatsächlichen Durchmesser/Positionen aus den bestehenden maßgeblichen Produktdaten zeichnen. Bei gleicher Bildschirmbreite erscheinen gleich große reale Bohrungen auf 9 × 6 etwa 3,33-mal so groß wie auf 30 × 20. Die Größe wird trotzdem als echte Geometrie geführt, niemals nur aus dem Lochbild abgeleitet. Preis, Export und Fertigung verwenden diese echten Maße.
4. Texte, Motive, Fotos/Masken und ihre Positionen getrennt vom Rohling halten. Eine fertige Vorschau je Design/Angebot bleibt sinnvoll; sie rechtfertigt keine erneute Kopie des Grundplattenmasters in jeder Revision.
5. Vor einer Migration eine separate vollständige Sicherung, Vorschau-/Exportvergleich sowie Rückwechsel vorbereiten. Historische Bestellungen behalten ihre unveränderlichen Ressourcenbezüge; bestehende Originale erst nach bestätigtem Erhaltungsnachweis behandeln.

Dieser Wunsch ist festgehalten, aber **kein Ressourcenumbau ist in diesem Patch enthalten**. Er berührt Import, Speicherung und Renderer und wird als gemeinsames Folgepaket abgestimmt, sobald Astras aktuelle Arbeit abgeschlossen ist.

## Genau nächste Schritte

1. Dieses getrennte Paket nach Astras laufenden Korrekturen gegen seinen dann aktuellen Stand prüfen und integriert abnehmen; nicht einfach dessen Dateien ersetzen.
2. Vor breitem weiteren Import gemeinsame Ressourcen und serverseitig gestuftes Galerieladen umsetzen. Der bisherige Online-Nachweis umfasst bereits 6.809.529 Bytes HTML für 462 Karten; Bilder-Lazy-Loading allein begrenzt diese Kartendaten nicht.
3. Einen echten freigegebenen Designstand mit eindeutiger Quelle/Zielfamilie/Größe/Shopbindung in einer privaten Kopie abnehmen. Danach erst den tatsächlichen Hostanschluss vorbereiten; keine stillschweigende Live-Aktivierung.
4. Jede Produktneuanlage bleibt an Mikails Bestätigung der vollständigen produktspezifischen Optionen gebunden. Beispiele wie Klebeband oder Bohrungen sind keine allgemeine feste Optionsliste.
