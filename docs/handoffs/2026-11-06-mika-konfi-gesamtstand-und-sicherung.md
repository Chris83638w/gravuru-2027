# Mika · Konfi, Galerie, Shop-Anschluss und Sicherung

Stand: **06.11.2026, Sicherung 12:13:51 UTC / 13:13:51 Berlin**. Verfasser: Codex / Mika. Dies ist der nachvollziehbare Übergabestand vor der weiteren Entwicklung; kein Releaseprotokoll und keine Verkaufsfreigabe.

## 1. Aktueller Nutzerauftrag und Grenzen

Mikail hat beauftragt:

1. Die feste Werkzeuganordnung neben der Platte reversibel testen und zwei echte Screenshots zeigen.
2. Astras vollständigen Auftrag aus [#168 · 6683765158](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6683765158) übernehmen: **Bearbeiten → vollständiger Konfi → dieselbe native Galerievorlage speichern → richtige Karte / Vorschau / Schnellbearbeitung / Freigabestatus aktualisieren**.
3. Passende Anbindung und Optimierungen prüfen, mit Unteragenten aufteilen.
4. Vor dem Weiterarbeiten umfassend sichern und eine Markdown-Übergabe auf GitHub ablegen. Prüfen, wie die Verwaltung nach Livegang Produkte/Designs mit Shopify synchronisieren kann. Währenddessen muss das Gespräch weiter möglich bleiben.

**Verbindliche Arbeitsgrenzen:** Nur besprochene Änderungen. Optimierungen erklären und vorschlagen, nicht ungefragt umsetzen. Eigene Branches/PRs; **kein Main-Merge und kein Kunden-Live** in diesem Auftrag. Galerie-Import/Materialadapter bleiben bei Astra; Quelllieferungen bei Claude. Keine Testdatenbank auf einen bestehenden Host übertragen. Keine Zugangsdaten, Kundendaten oder privaten SQLite-Dateien ins Repository. Bildfreigaben erteilt Mikail/Chris.

## 2. Zielbild und fachliche Entscheidungen des Nutzers

- Ein gemeinsamer Konfi für zunächst den eigenen Shopify-Shop; Anschluss später erweiterbar. Gemeinsame Module für Text, Motive und Foto/Logo. Material, Geometrie, zulässige Größen, Ausführung, Preise und Ressourcen werden über Produktprofile angebunden.
- Keine eigenständige Konfi-Kopie je Produkt. Grundplatte/Materialressource wiederverwenden; tatsächliche Geometrie, Seitenverhältnis und Bohrmaße je Format berücksichtigen. Nur durch größere/kleinere Löcher eine andere Plattengröße vorzutäuschen wäre fachlich unzureichend.
- Ursprünglicher Verkaufsstart: Schiefer-Gedenktafeln für Tiere/Hund ohne Foto, zunächst **22 × 14 und 30 × 20 cm**, alle **43 Vorlagen erst nach Sichtprüfung**. Das Drei-Stunden-Ziel war eine erste kaufbare Gruppe einschließlich geprüftem Warenkorb; daraus folgt keine heutige Verkaufsfreigabe.
- Vom Nutzer ausdrücklich gesetzte Basispreise dieser Schiefergruppe: **19,99 € / 24,99 €**, Größenunterschied **5,00 €**. Keine Übertragung dieser Preise auf Edelstahl oder andere Gruppen.
- Passende Zielgruppen/Designs filtern; mit dem Design des angeklickten Hauptproduktbilds starten. Skalierbare zulässige Größen im Konfi auswählbar, mit passendem Preis. Die zulässige Ausführung muss vor einer neuen Produktgruppe mit dem Nutzer geklärt werden.
- Für Naturschiefer-Gedenktafeln 22 × 14 bestätigt: ohne Bohrung; 2/4 Bohrlöcher; jeweils auch mit Schrauben; 2/4 Abstandshalter in Edelstahl, Schwarz, Bronze, Gold, Weiß; Silikon; Acrylständer klar/schwarz. Ständer ausschließlich für Gedenktafeln und nicht 60 × 30 cm; keine Ständer bei Monogrammen. Technische Zusätze wie „12 mm breit“ nicht in Kundenlabels.

Die folgende Bedienliste dokumentiert Nutzerentscheidungen aus diesem Chat. Sie bedeutet **nicht**, dass jeder Punkt in diesem Sicherungsschritt erneut vollständig abgenommen wurde. Der aktuelle R12-Stand und die jeweiligen Nachweise sind maßgeblich.

| Bereich | Festgelegtes Verhalten |
|---|---|
| Vorschau | Am PC beim Scrollen sichtbar/sticky. Platte groß und gut gestaltbar; keine Sprünge beim Elementwechsel. Keine ungenutzten Werkzeugflächen außerhalb der jeweils nötigen Bearbeitung. |
| Werkzeuge | Foto-/Motiv-/Logo-Bearbeitung kompakt; Drehen mittig. Regler und Zurücksetzen sauber ausrichten. Neue Anordnung zunächst abschaltbarer Test. |
| Hinweise | Ein schmaler Überlagerungshinweis direkt unter der Platte, einmalig und ohne Verdrängen der Vorschau. Lange Rechte-Erklärung entfernen. |
| Text | Bei Auswahl Textoptionen darunter öffnen, ohne Sprung der Platte. Schriftklick direkt übernehmen und Auswahl schließen. Längere Texte dürfen nicht unbemerkt abgeschnitten erscheinen. |
| Motive | Suchbegriff hat Vorrang vor Kategorie. Kategorien besser erkennbar. Nur Kategorie **Grundmotive samt Inhalt** entfernen; andere Motive und Vorlagenmotive bleiben. Kurzer schwarzer Preishinweis **„Je Motiv 1,69 €.“**, klein und ohne Button-/Kastenoptik. |
| Löschen | Alle bearbeitbaren Texte, Motive, Fotos und Logos müssen über sichtbaren Papierkorb löschbar sein; technische Geometrie ist kein Kundenelement. |
| Fotos | Upload vollständig anzeigen, nicht automatisch beschneiden. Größer und mittig platzieren. Verschiebbar, löschbar und ausdrücklich auch über Eckgriffe größenverstellbar. Klick auf ein vorhandenes Foto darf keinen versehentlichen Neu-Upload auslösen. |
| Fotoeditor | Vorhandene Werkzeuge wiederverwenden; Zuschnittformen Herz, Oval hochkant, Stern, Wolke; Original wiederherstellbar. Original, bearbeitete Fassung und Bearbeitungsquelle dürfen beim Speichern nicht verloren gehen. |
| Zoom | Ansichtszoom über Regler, nicht Mausrad oder Zwei-Finger-Geste. Spätere ausdrückliche Entscheidung: Foto-Eckgriffe sind erlaubt. Fotogrößenregler ohne mm-Zusatz. |
| Neustart | Nutzer möchte von vorn testen. Zurücksetzen auf die gewählte Originalvorlage erst nach Bestätigung; nicht unbemerkt alle gespeicherten Entwürfe löschen. |
| Vollbild | „Zurück zur Konfiguration“ klar erkennbar; knapper Hinweis zum Verschieben. Hilfe-/Warnzeichen gut sichtbar. |
| Abschluss | Moderne kompakte Kaufleiste, Warenkorbbutton grün. Preise und Optionen nicht nebenbei verändern. |
| Auswertung | Häufige Motiv-Suchbegriffe in der Shopify-App anzeigen; Nutzer hat die Funktion zwischenzeitlich bestätigt. Kein neuer Analytics-Livetest in diesem Paket. |

## 3. Stände, Branches und Zuständigkeiten

| Paket | Stand / Branch | Bedeutung |
|---|---|---|
| Kunden-Konfi R12 | `8cb8c3caa63f9066020252e79932a5c984e951dc`, Bundle `editor-f5c81c94a6bbe07a.mjs` | Zuletzt dokumentierter Kundenstand; in diesem Auftrag kein erneuter Server-Readback/Deploy. |
| Reversible feste Werkzeuge | `4548fa6790bc871b97ad6d80ad12bf770bb6c146`, `dev/mika-konfi-anschluss-20261105`, [PR #178](https://github.com/Chris83638w/gravuru-2027/pull/178) | Lokal gebaut/geprüft, nicht live. |
| Bestehende private Galerie | `b7e6d6fc`, [PR #180](https://github.com/Chris83638w/gravuru-2027/pull/180) | Astras dokumentierter privater Schieferstand. |
| Edelstahl-Pilot/Adapter | `b2e6857517fa0694887bba3f20c8b2a6099cf5a6`, `dev/astra-edelstahl-galerie-pilot-20261106`, [PR #181](https://github.com/Chris83638w/gravuru-2027/pull/181) | Astra; noch kein Edelstahl-Hostimport. |
| Galerie-Rückspeicherung | `dev/mika-galerie-saveback-20261106`; R12-Integration `66f5c991`, erster Service `367a92db`, Adapterintegration `9ff22beadc9e5c9036322dbcdc8ddb36fcca9321`; danach WIP-Sicherungscommit **`2a8b8abe69bcf52be04f30a1cbd0dfbb8fa29b73`** auf GitHub | Mika-Unteragent; die bekannten Quell-/Teständerungen wurden nach dem lokalen Snapshot ausdrücklich als unfertiger Checkpoint committed/gepusht. Private Daten ausgeschlossen. Noch in Abnahme. |
| Diese Sicherungsakte | `docs/mika-konfi-gesamtstand-20261106` | Reine Dokumentation; kein Funktions-/Hostwechsel. |

Aufteilung: Root Mika koordiniert, prüft unabhängig und dokumentiert. Unteragent `galerie_saveback` implementiert/prüft den Rückweg. Unteragent `shop_sync_audit` untersucht den Shop-Anschluss **nur lesend**. Astra übernimmt Import, Material-/Formatadapter und Galerie-Lieferprüfung. Keine parallele Bearbeitung derselben Zuständigkeit.

## 4. Reversible Werkzeuganordnung: abgeschlossenes Testpaket

- Aktivierung ausschließlich mit `tools=fixed` **und** einem Modell mit `productPreview:true` oder `reviewOnly:true`. Ohne Parameter bisherige R12-Anordnung.
- PC: Werkzeuge rechts neben der Platte. Handy: zwei feste Reihen unter der Platte. Originalfunktionen/Handler wiederverwendet.
- **57/57 gezielte Tests**, Build und sichtbare Chrome-Prüfung bei 1440 × 765 sowie 390 × 844. Geprüfte Elementwechsel/Scrollen verschieben die Platte nicht.
- Zwei echte Screenshots wurden im Chat gezeigt: `outputs/konfi-feste-werkzeuge-pc.jpg`, `outputs/konfi-feste-werkzeuge-handy.jpg`. Das graue Rechteck ist ein synthetisches Testfoto.
- Keine Prüfung auf physischem Handy, kein neuer Warenkorb-/Logo-Endnachweis und kein Deployment dieses Tests.
- [Detaillierte Übergabe](https://github.com/Chris83638w/gravuru-2027/blob/dev/mika-konfi-anschluss-20261105/docs/handoffs/2026-11-06-konfi-feste-werkzeuge-test-mika.md), [Issue-Bericht](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6683961810).

## 5. Verbindlicher Galerie-Anschluss

**Katalog/Lieferform 2 → Quellen-/Hashprüfung → native Objekte → explizites Material-/Formatziel → versionierte private Produktablage → derselbe Konfi/Renderer.** Keine flache Gesamtbild-Kopie und kein Browser-only-Speicher.

Die Zuordnung bleibt explizit: Original-ID, Material, `sizeKey`, echte Maße, `target.productKey`, importierte `cfg_…` und `target.nativeDesignId`. Original-ID nie aus einem nativen Slug zurückraten. Beispiel: Original `TRE-V2A-8x3,5-D1`, natives Design `katalog-TRE-V2A-8x3-5-D1`. Der historische Größenindex `GR-ES-OV-300X159P9-T15` bedeutet in der gelieferten Geometrie 300 × 160 mm; `design.json` ist maßgeblich.

Der neue private Host ist `/originale/editor?configuration=…&design=…&originalId=…`. Er lädt den bestehenden vollständigen Konfi. Das Kundenentwurfs-Angebot „Für die Werkstattprüfung sichern“ bleibt ein anderer Speicherweg und ist **kein** Ersatz für Galerie-Saveback.

- Server löst Ziel auf, prüft Material/Größe/Original und erwartet die geladene Produktrevision.
- Nur das adressierte native Design wird ersetzt. Die Produktrevision umfasst weiterhin die ganze Produktgruppe; parallele Änderungen führen zu Konflikt statt Überschreiben.
- Betreiberrechte werden zur Bearbeitung aufgelöst; gespeicherte Kundenrechte und technische Schutzmerkmale bleiben erhalten.
- Fotos: Original, verarbeitete Fassung, Quelle der erneuten Bearbeitung und Rezept dauerhaft in der bestehenden Ressourcenablage. Originalmaske erhalten; keine flüchtigen Blob-URLs persistieren.
- Nach Speichern richtige Karte/Größe/Filter wiederherstellen; Vorschau und Schnellbearbeitung laden denselben Stand. Nur tatsächliche Gestaltungsänderungen entwerten die jeweilige Freigabe. Kommentare bleiben unabhängig.
- Identische Wiederlieferung darf bearbeitete Köpfe/Kommentare/Freigaben nicht überschreiben. Astras additive Importlogik verwenden, nicht ungeprüft den allgemeinen Katalog-Reimport.

Wichtige Module: `app/workshop/gallery-editor.mjs`, `gallery-photo-media.mjs`, `app/workshop/ui/gallery-editor.*`, `app/configurator/variant-m/gallery-workbench.mjs`, `scripts/lib/gallery-editor-http.mjs`. Astras `scripts/lib/design-review-targets.mjs` bleibt die maßgebliche Material-/Zielauflösung.

## 6. Prüfnachweise zum Sicherungszeitpunkt

### Echter Edelstahlpilot, isolierte Datenbank

Quelle [Katalog-PR #183](https://github.com/Chris83638w/gravuru-katalog./pull/183), Liefercommit `5e0c3f151bbbb9cdae08e0562561014f727b40fe`, Quellcommit `3c6051fbbc7904969948950fae12cae2ae663f30`. 28 Originale, 73 Rohlinge/Produktdokumente, 146 passende Formatziele; 500 referenzierte Dateien und 3 eindeutige Schriftdateien. Keine Fotos im Stahlpilot.

Root hat Quellen aus Git bytegetreu ausgepackt, Astras Paket erneut vorbereitet und **73 Produkte in eine neue lokale Testablage** importiert. **146/146** Ziele öffnen über den neuen Service mit korrekter Original-ID/Geometrie/nativen Objekten. **8/8 No-op-Prüfungen** ändern weder Dokument noch Revision: alle sechs Größen der Komma-ID sowie beide kleinen Ovale `TO-V2A-15x8-D1/D3` bei 150 × 80 mm. Nachweis lokal `work/steel-saveback-qa-proof.json`.

### Unabhängiger echter Browserlauf am PC

Isolierter Produktkopf `cfg_9ba0064d-6438-4f8a-84a2-78bd070f2408`, Original `TRE-V2A-8x3,5-D1`, 120 × 52,5 mm:

1. In Testkopie D1 und Nachbar D66 bestätigt; D1-Kommentar gesetzt.
2. Voll-Konfi: Rosenberg → Sommer; speichern/zurück: **Revision 2**, richtige Karte, Filter und Größe erhalten, Vorschau aktualisiert. D1 „Geändert · erneut prüfen“, D66 weiter bestätigt, Kommentar erhalten.
3. Schnellbearbeitung verschiebt Text: **Revision 3**; derselbe neue Stand öffnet im Voll-Konfi.
4. Zwei Tabs auf Revision 3: erster speichert Winter → **Revision 4**. Zweiter versucht Altstand → klarer Konflikt; ungespeicherter Text bleibt erhalten, Link zum aktuellen Stand angeboten. Kein stilles Überschreiben.

Screenshots: `outputs/galerie-rueckspeichern-pc.jpg`, `outputs/galerie-speicherkonflikt-pc.jpg`. Nur synthetische lokale Bestätigungen; **keine echten Bildfreigaben**.

Handyansicht 390 × 844: kleinstes Oval D1 bereits mit korrekter 150 × 80-mm-Geometrie geöffnet. Vollständiger mobiler Speichern-/Rückkehrnachweis und zweites Oval noch abschließen.

Unteragent meldete **5 Service- sowie 13 HTTP/Material/Navigationstests bestanden**. Danach einzelne Korrekturen am Foto-Rückweg; abschließender Testlauf steht aus. Der Foto-Roundtrip war zum Snapshot **noch nicht vollständig bestanden**.

## 7. Offene Punkte – nicht als erledigt ausgeben

- Im privaten Betreiber-Konfi war die Kaufleiste noch sichtbar; nur dort entfernen, Kundenkonfi unverändert lassen. Labels dort „Zur Galerie“ / „Vorlage speichern“.
- Foto-/Masken-Roundtrip im Browser einschließlich erneuter Bearbeitung, Zuschnitt, Wiederöffnen, Originalwiederherstellung fertig prüfen. Die enge Sicherheitsrichtlinie blockierte `fetch(blob:)`; direkte Übergabe der behaltenen Dateien wurde vorbereitet, ohne Sicherheitsregeln aufzuweichen.
- Neue Logo-Uploads sind noch nicht vollständig an native Galerieassets angeschlossen. Der Adapter lehnt unverbundene Uploads ausdrücklich ab. Keine Logos heimlich in Fotos umwandeln oder als fertig behaupten.
- Ressourcen-/Startupfehler müssen sichtbar werden und unvollständiges Speichern verhindern; Zeitüberschreitung darf die Oberfläche nicht dauerhaft sperren.
- Vollständige No-op-Treue im Browser, Text/Schrift/Motiv/Foto-Funktionen, Handy-Rückkehr und saubere finale Diff-/Testabnahme abschließen.
- Renderer-Fingerprint hängt bisher auch am großen `http.mjs`: sachfremde Serveränderungen können Freigaben vorsorglich entwerten. **Optimierungsvorschlag**, keine heimliche Lockerung des Freigabeschutzes.
- Claudes Lieferlücken: README-Hashindex veraltet; zusätzliche B02S-Probe für beide kleinsten Ovale fehlt. Das ist nicht durch unsere Editorprüfung als Liefernachweis ersetzt.
- Edelstahl ist nicht online. Kein neuer Hostbackup/Hostimport in diesem Sicherungsschritt; Kunden-, Shopify-, Bestell- und Produktionsstrecke separat abnehmen.

## 8. Tatsächlich angelegte Sicherung und Wiederaufnahme

Die schreibenden Tests/Agenten wurden für den Snapshot angehalten. Lokaler unveränderter Sicherungsordner:

`work/checkpoints/konfi-20261106T121351Z/`

Enthalten:

- Vollständiger aktueller versionierter Quellbestand beider Arbeitskopien als ZIP, einschließlich noch uncommittierter bekannter App-/Testdateien; Git-Status, binärer Patch und SHA-256-Dateiinventar.
- UI: 1.530 Dateien, ZIP 39.183.641 Byte; SHA-256 `0f117a5f847c055f51caeb6b2f588eab9460773798b53d0e6a5c3fe8ee9439cc`.
- Galerie: 3.786 Dateien, ZIP 271.287.184 Byte; SHA-256 `c800db74d09f0491011a9b18e52bd8dc706408dd42d0f487f7c8c6796643a868`.
- **10 SQLite-Sicherungen** der beiden isolierten Testablagen mit SQLite-Backup-API, einschließlich WAL-Inhalt. Jede Kopie: `PRAGMA integrity_check = ok`. Keine einfache Kopie nur der geöffneten Hauptdatei.
- Die zugehörigen Import-Zuordnungen, Testmedien, Pilotpaket, vorhandenen Screenshots/Ergebnisdateien und Root-Prüfskript/-ergebnis.
- `CHECKPOINT.json` SHA-256: `8548107bdff4b54ad2d2b8079f5a1bd6823114fa05184d281d4a20948c7c6029`. ZIP-Inhalt vollständig gegen Dateihashes geprüft.

**Diese Markdown-Datei sichert Wissen, Entscheidungen und Referenzen. Sie ersetzt keine Datenbanksicherung.** Private Datenbanken/Medien bleiben lokal; sie werden nicht auf GitHub hochgeladen. Der Snapshot schützt diesen Arbeitsstand, ist aber **keine neue Komplettsicherung von Shopify/Plesk/Produktionsdaten** und kein Schutz gegen Ausfall des einzigen lokalen Datenträgers.

Wiederaufnahme: erst diese Datei und jüngste Ergänzung lesen, Arbeitsbranch/HEAD abgleichen. Quellarchive in einen **neuen** Ordner entpacken, nicht über laufende Arbeit. Testdaten nur als zusammengehörigen Satz einschließlich Importzuordnung/Assets wiederherstellen. Erst Integrität, Quellhashes und Ziele prüfen, dann lokalen Server starten. Alte Testdaten nie über echte Hostdaten schreiben. Vor jeder späteren Hostaktivierung frischen konsistenten Hostsnapshot einschließlich Produkt-, Ressourcen-, Kommentar- und Freigabeablagen erstellen.

## 9. Shop-Spiegel: Ist-Stand und empfohlener nächster Anschluss

**Bereits im Code:** Shop-Export/-Planung, Dry-run, SKU-Zuordnung, Konflikt-/Journalmechanismen und Entwurfsanlage (`scripts/shop-export.mjs`, `scripts/shop-sync.mjs`); native Produktbindungen mit Shopify-IDs, fester Konfi-Revision, Historie und konkurrierendem Speicherschutz (`shop-product-binding-*`). Der neuere `shop-draft-transfer` hat wiederholbare Entwurfsübertragung mit eindeutiger Zuordnung.

**Noch keine vollständige Spiegelung:** Der bestehende Katalog-Shop-Sync liest Katalogdateien und deren Hashes, nicht automatisch die gerade bearbeitete native Galerie-Revision. Es fehlt der gezielte Weg **freigegebene native Revision → Änderungsplan → Shopify-Bindung/Produktdarstellung**. Der aktuelle Galerieeditor lehnt veröffentlichte Produktköpfe ausdrücklich ab und erlaubt nur `reviewOnly`; für spätere Live-Pflege braucht es einen Entwurf neben dem freigegebenen Live-Stand. Diesen Schutz nicht einfach entfernen. `design-publication-status.mjs` erklärt derzeit ausdrücklich `automaticShopifyUpdate:false` und `canPublish:false`.

Die zusätzliche lesende Anschlussprüfung fand im alten `shop-sync`: `inventoryItem.tracked=false`, komplette Varianten-/Metafeldlisten und automatische Wiederholung unklarer Schreibfehler im allgemeinen Client. Gleicher Designhash kann andere Daten-/Preisänderungen überspringen. Diese Bausteine deshalb nicht unverändert als universellen Live-Abgleich aktivieren. Shopify dokumentiert die Ersetzungs-/Löschwirkung fehlender Listeneinträge bei [productSet](https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/productSet); gezielte [metafieldsSet-Änderungen mit compareDigest](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet) sind für den neuen Anschluss geeigneter. Der neuere `shop-draft-transfer` bietet bereits sichere Entwurfszuordnung/Journal/Rücklesen. Kein dieser Befunde wurde heimlich im bestehenden Sync geändert.

Empfehlung zur Besprechung, noch nicht implementiert:

1. Galerie/Werkstatt als Bearbeitungszentrale für Designs und freigegebene Produktdaten; Shopify als Bestell-/Bestandsstelle.
2. Lesender Shop-Ist-Abgleich und feste Zuordnung über Shopify-IDs statt Titelabgleich.
3. Änderungsübersicht je Produkt: alter/neuer Stand, betroffene Felder, Konflikte, fehlende Voraussetzungen.
4. Bewusster Befehl „Mit Shopify abgleichen“; nur ausgewählte freigegebene Änderungen übertragen. Keine automatische Veröffentlichung als Nebenwirkung.
5. Warteschlange/Journal, wiederholbare Übertragung, Prüfung durch Rücklesen. Bestellungen behalten ihren unveränderlichen alten Konfi-/Medienstand.
6. Rücknahme als kontrollierte neue Übertragung einer früheren freigegebenen Revision; vorher betroffene Shopify-Felder sichern. Kein blindes Zurückspielen alter Gesamt-Shopdaten. Allgemeine Produkt-/Bestands-Webhooks wurden im geprüften Code nicht gefunden; vorhandene Bestell-Webhooks sind davon zu unterscheiden. Später Ereignisse plus ergänzende Kontrollabfragen gemäß [Shopify-Webhooks](https://shopify.dev/docs/apps/build/webhooks).

Offene Nutzerentscheidung zum Snapshot: zunächst nur Designs oder Produkte und Designs zentral verwalten. Vollständiger automatischer Zweiwege-Abgleich, Bestandsverwaltung und automatische Live-Veröffentlichung sind nicht beauftragt.

## 10. Dauerhafte Erinnerung und nächster Schritt

Ein Chatgedächtnis allein ist keine zuverlässige Projektablage. Fester Einstieg: **`docs/handoffs/MIKA-START-HIER.md`**. Darin auf die aktuellste Übergabe, offene Punkte und Verantwortlichkeiten verweisen. Entscheidungen mit Datum/Quelle getrennt vom Ist-Stand führen. Nach jedem abgeschlossenen Paket Commit/PR, tatsächlich ausgeführte Tests und verbleibende Grenzen ergänzen. Neue Chats sollen zuerst den Einstieg und die neueste Übergabe lesen.

Optimierungsvorschlag: vor Releases zusätzlich versionierte externe Datensicherung mit Wiederherstellungsprobe und eine automatisch erzeugte Übersicht „Code / privater Testhost / Kundenhost / Produktrevisionen“. Nicht ohne Besprechung als neue Automation aktivieren.

**Unmittelbar nächster Schritt:** nach gesicherter GitHub-Übergabe Galerie-Saveback-Abnahme fortsetzen, private Kaufleiste korrigieren, Foto-/Masken-Rückweg und Handy-Rückkehr belegen, eigenen PR samt ehrlichem Nachweis in #168 liefern. Parallel Shop-Anschluss nur analysieren und mit Mikail besprechen. Kein Main-Merge/Kunden-Live.
