# Mika · Konfi, Galerie, Shop-Anschluss und Sicherung

Stand: **06.11.2026, Sicherung 12:13:51 UTC / 13:13:51 Berlin**, spätere Abnahme-Ergänzung in Abschnitt 11, bestätigter Synchronisierungsumfang in Abschnitt 12 und vorgeschaltete Optionsabfrage in Abschnitt 13. Verfasser: Codex / Mika. Die Abschnitte 1–10 dokumentieren den Sicherungszeitpunkt; die Nachträge aktualisieren die offenen Punkte. Kein Releaseprotokoll und keine Verkaufsfreigabe.

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

- Alle lokal vorhandenen versionierten Dateien beider Arbeitskopien als ZIP, einschließlich noch uncommittierter bekannter App-/Testdateien; Git-Status, binärer Patch und SHA-256-Dateiinventar. Weil beide Arbeitskopien Sparse-Checkouts sind, ergänzen die unten beschriebenen Git-Zusatzarchive die ausgeblendeten versionierten Dateien zum vollständigen Quellbestand.
- UI: 1.530 Dateien, ZIP 39.183.641 Byte; SHA-256 `0f117a5f847c055f51caeb6b2f588eab9460773798b53d0e6a5c3fe8ee9439cc`.
- Galerie: 3.786 Dateien, ZIP 271.287.184 Byte; SHA-256 `c800db74d09f0491011a9b18e52bd8dc706408dd42d0f487f7c8c6796643a868`.
- **10 SQLite-Sicherungen** der beiden isolierten Testablagen mit SQLite-Backup-API, einschließlich WAL-Inhalt. Jede Kopie: `PRAGMA integrity_check = ok`. Keine einfache Kopie nur der geöffneten Hauptdatei.
- Die zugehörigen Import-Zuordnungen, Testmedien, Pilotpaket, vorhandenen Screenshots/Ergebnisdateien und Root-Prüfskript/-ergebnis.
- `CHECKPOINT.json` SHA-256: `8548107bdff4b54ad2d2b8079f5a1bd6823114fa05184d281d4a20948c7c6029`. ZIP-Inhalt vollständig gegen Dateihashes geprüft.

Zusätzliche, getrennte Git-Vervollständigung: `work/checkpoints/konfi-20261106T121351Z-git-complete/`. Die ersten Archive und ihr Manifest wurden dabei nicht überschrieben. Exakte Git-Blobs der festgehaltenen Snapshot-Commits wurden zusätzlich gesichert:

- UI: weitere **2.282** ausgeblendete Dateien, zusammen **3.812**. `konfi-ui-sparse-files.zip` SHA-256 `6e752912f8429619d01d054be85672bd7b0ee67c1cd4fe324770b94b97638473`.
- Galerie: weitere **220** ausgeblendete Dateien, zusammen **4.006**. `gallery-saveback-sparse-files.zip` SHA-256 `d34c0916fa197dcdf0bc9f1b5b5d829fee3c3c43895d36831d80958447633e1e`.
- Alle zusätzlichen ZIP-Einträge ebenfalls vollständig gelesen und gegen SHA-256 geprüft. `GIT-COMPLETION.json` SHA-256 `de12d77f4d702e932853c6f01a34caec347c91518385d9f2e545055d5f40298e`.

**Diese Markdown-Datei sichert Wissen, Entscheidungen und Referenzen. Sie ersetzt keine Datenbanksicherung.** Private Datenbanken/Medien bleiben lokal; sie werden nicht auf GitHub hochgeladen. Der Snapshot schützt diesen Arbeitsstand, ist aber **keine neue Komplettsicherung von Shopify/Plesk/Produktionsdaten** und kein Schutz gegen Ausfall des einzigen lokalen Datenträgers.

Wiederaufnahme: erst diese Datei und jüngste Ergänzung lesen, Arbeitsbranch/HEAD abgleichen. Quellarchiv und zugehöriges Sparse-Zusatzarchiv in einen **neuen** Ordner entpacken, nicht über laufende Arbeit. Testdaten nur als zusammengehörigen Satz einschließlich Importzuordnung/Assets wiederherstellen. Erst Integrität, Quellhashes und Ziele prüfen, dann lokalen Server starten. Alte Testdaten nie über echte Hostdaten schreiben. Vor jeder späteren Hostaktivierung frischen konsistenten Hostsnapshot einschließlich Produkt-, Ressourcen-, Kommentar- und Freigabeablagen erstellen.

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

## 11. Nachtrag nach Fortsetzung der gesicherten Arbeit

**Die zuvor offenen Kernprüfungen sind inzwischen bestanden:** 150/150 betroffene Regressionen, private Kaufleiste entfernt, Foto-/Masken-Rückweg geprüft. Finaler Funktionscommit **`f8e55358272fe9fabdb29de7db15c6592f2cfecc`**, [Draft-PR #184](https://github.com/Chris83638w/gravuru-2027/pull/184) auf Astras Pilotbranch. GitHub-Kopf zurückgelesen: ungemergt, mergebar. Der PR enthält zusätzlich die benötigte bestehende R12-Integration, deshalb ist sein Gesamtdiff größer als nur der neue Speicheradapter. [Funktionsübergabe mit sechs Screenshots](https://github.com/Chris83638w/gravuru-2027/blob/dev/mika-galerie-saveback-20261106/docs/handoffs/2026-11-06-mika-galerie-rueckspeicherung.md) und [Abschlussmeldung in #168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6685068758) gehören zur Abnahme. Kein Main-Merge, keine private Hostaktivierung, kein Kunden-/Shopify-Live.

Root-Browsernachweise in Chrome:

- Kleine Ovale D1 und D3, 150 × 80 mm: unverändertes Speichern ohne neue Revision; D1-Textänderung zur richtigen Karte, Filter/Format erhalten.
- D3: Michroma → Cinzel gespeichert (Produktrevision 3), Bibliotheksmotiv Haus ergänzt → Revision 4, nach erneutem Öffnen über den Papierkorb gelöscht → Revision 5. Originale Linie und Texte blieben erhalten.
- Die erste Hausübertragung scheiterte an einem nicht kanonischen Bibliotheksfragment. Korrigiert durch vorhandenen passiven Assetimport, ohne den Validator zu lockern. Beide tatsächlichen Haus-IDs durch Tests abgedeckt.
- Kontrolliert blockierte Editorressource: sichtbare Fehlermeldung, Speichern und Speichern/zurück gesperrt. Nach Aufheben der Testblockade wieder normale Bearbeitung. Netzwerkblockade und mobile Größenüberschreibung anschließend entfernt.
- `outputs/galerie-rueckspeichern-handy.jpg`, `outputs/galerie-motiv-schrift-handy.jpg`, `outputs/galerie-ladefehler-handy.jpg` ergänzen die PC-Belege. Mobile Ansicht ist weiterhin kein physischer Handytest.

Unteragent-Fotonachweis, ausdrücklich **synthetischer isolierter Schieferfall**: vorhandene Originalmaske, Herz-Zuschnitt/Spiegelung → Revision 2; nach Neuladen Rezept erneut geöffnet; Sternzuschnitt → Revision 3; zusätzlicher unbehandelter Upload ohne Farbänderung → Revision 4. Originalbytes beider Fotos nach Rücklesen unverändert. Original, verarbeitete Fassung und Bearbeitungsquelle getrennt erhalten; der bestehende Originalquellenindex ist ebenfalls angebunden. Unabhängiger Code-Review entdeckte und verifizierte die Korrektur eines zuvor abweichenden Standardfarbvergleichs. Keine neuen unabhängigen Blocker in Identität, Maske, Konfliktschutz oder Rückkehr gefunden.

**Logo-Umfang präzisiert:** alle 73 echten Stahlpilotprodukte haben `logo.enabled=false` und `photo.enabled=false`; das geprüfte vorhandene Hundemodell hat ebenfalls `logo.enabled=false` bei aktiviertem Foto. Es fehlt deshalb keine aktivierte Logo-Funktion in diesen geprüften Profilen. Künftige Logo-Uploads benötigen getrennte Original-/Vektorprüfungs-/Ersetzen-Provenienz; Umwandeln in ein normales Motiv würde diese verlieren. Keine ungefragte Logo-Aktivierung.

Weitere Optimierungsvorschläge, nicht umgesetzt: eindeutige Ebenennamen („Haus“, „Trennlinie“ statt zweimal „Motiv“), präzisere Renderer-Fingerprintgrenze und kontrollierter Entwurf-/Shop-Abgleich. Der Nutzer bat beim Begriff „Shop-Spiegel“ um eine einfachere Erklärung; der gewünschte Umfang wurde anhand „Produkt öffnen → ändern → prüfen → im Shop übernehmen“ erläutert. Daraus folgt noch keine automatische Shopveröffentlichung oder pauschale Freigabe neuer Shopfunktionen.

**Aktueller nächster Schritt:** Astra kann PR #184 gemeinsam mit #181 prüfen und die getrennte private Hostübernahme vorbereiten. Vor dieser Aktivierung frischen Hostsnapshot erstellen; keine bearbeitete lokale Testdatenbank hochladen. Mit Mikail zuerst Umfang und Bedienung der zentralen Shopverwaltung klären. Physische Handyabnahme, echte Shop-/Bestellstrecke und künftige Logoaktivierung bleiben getrennte Aufgaben.

## 12. Bestätigte Synchronisierung und Materialauswahl je Unterkategorie

### Nutzerentscheidung vom 06.11.2026

Mikail hat die zuvor offene Bedeutung der Synchronisierung ausdrücklich konkretisiert: Türschild-Designs in der Galerie bearbeiten, dann **„Synchronisieren“** drücken; anschließend sollen die zugehörigen Shop-Produkte den neuen Stand übernehmen. Zusätzlich soll bei einer Unterkategorie gewählt werden können, in welchen Materialien ihre Produkte angeboten werden, beispielsweise Edelstahl, Acrylglas, AA und AS.

Dies ist das bestätigte Ziel der Funktion, **kein bereits vorhandener Synchronisierungsnachweis und keine Aufhebung von „eigener Branch/PR, kein Main-Merge, kein Kunden-Live“**. Speichern in der Galerie und Übernahme in den Shop bleiben zwei bewusst getrennte Schritte. Eine ungefragte Veröffentlichung bei jeder Textänderung ist nicht beauftragt. Auch ein automatischer Zweiwege-Abgleich beliebiger Shopify-Felder ist damit nicht beschlossen.

Gewünschte Bedienung:

1. Unterkategorie öffnen und angebotene Materialien auswählen.
2. Gemeinsame Designvorlage in der Galerie bearbeiten und den neuen Stand prüfen.
3. Mit **„Synchronisieren“** die eindeutig zugehörigen Produkte aktualisieren; kein erneutes manuelles Hochladen derselben Designs.
4. Ergebnis pro Produkt sichtbar machen: übernommen, unverändert oder mit konkretem Problem offen. Erfolg erst nach Rücklesen melden.

Als Bedienvorschlag vor der Umsetzung: Materialauswahl als verständliche Häkchen statt technischer Familienkennungen; vor der Ausführung eine kurze Übersicht der betroffenen Produkte und noch fehlenden Voraussetzungen. Dieser Vorschlag wurde dokumentiert, noch nicht als neue Oberfläche gebaut.

### Verifizierte Grundlage und Materialbegriffe

Die beiden Unteragenten haben den Funktionsstand `f8e55358` und die vorhandenen Katalog-/Galerieverträge unabhängig gelesen. Neue Shopify-Schreibzugriffe oder Anwendungstests waren für diese reine Anschlussprüfung nicht erforderlich und wurden nicht ausgeführt.

- `repository.mjs` kann bereits unter derselben `cfg_*` einen neuen Entwurf neben der unveränderten `publishedRevision` speichern. Der vorhandene Test „published document is immutable while subsequent drafts evolve“ belegt diesen Vertrag. Diese Fähigkeit muss nicht neu gebaut werden.
- `shop-entry.mjs` lädt die ausdrücklich gebundene Revision. Der `shop-product-binding-store` kann eine Bindung unter Beibehaltung der cfg-ID kontrolliert weiterstellen; erwartete Bindungsrevisionen schützen vor parallelem Überschreiben.
- Die private Galerie in PR #184 speichert heute **eine bestimmte Material-/Größenfassung**. Ihre Produktrevision ist noch keine gemeinsame Masterrevision für alle Materialien. `sourceVersion` und ursprüngliche Katalog-SVG ändern sich dabei nicht automatisch.
- Der Katalog kennt bereits Master mit expliziten Zielen je Familie. Gleichlautende Namen, gleiche D-Nummern oder das Entfernen von ID-Präfixen sind keine sichere Zuordnung.
- **AA = Acrylglas anthrazit 5 mm; AS = Acrylglas schwarz 5 mm**, anhand der vorhandenen Familien [acryl-aa-abstandshalter](https://github.com/Chris83638w/gravuru-2027/blob/f8e55358272fe9fabdb29de7db15c6592f2cfecc/app/designs/acrylic-standoff-signs/aa.json) / [acryl-as-abstandshalter](https://github.com/Chris83638w/gravuru-2027/blob/f8e55358272fe9fabdb29de7db15c6592f2cfecc/app/designs/acrylic-standoff-signs/as.json). Beide verwenden rückseitige Acrylgravur. Sie sind von den bereits unterstützten 3-mm-Acryl-Türschildfamilien zu unterscheiden und dürfen nicht über den gemeinsamen Oberbegriff `acrylic` zusammenfallen. Diese Bestandsangaben sind kein neuer Preis-/Stärkenbeschluss.
- `line.families` gilt bisher für die ganze Linie. Eine ausdrückliche Materialauswahl je Unterkategorie fehlt. `planFamilyFormats()` übernimmt derzeit die Linienfamilien; die vorhandene Türschild-Aggregation unterstützt nur ihre ausdrücklich registrierten Familien. Eine auswählbare neue Familie ist deshalb noch kein Beweis für einen fertigen Kundenanschluss.
- Der materialfähige Galerieadapter ist momentan für Schiefer und Edelstahl ausgelegt. Das Material liegt an der Original-Zeile; gleiche Original-ID ein zweites Mal als anderer Materialeintrag wird beim additiven Zusammenführen abgewiesen. Belege: [Zielvertrag](https://github.com/Chris83638w/gravuru-2027/blob/f8e55358272fe9fabdb29de7db15c6592f2cfecc/scripts/lib/design-review-targets.mjs) und [Überschneidungsprüfung](https://github.com/Chris83638w/gravuru-2027/blob/f8e55358272fe9fabdb29de7db15c6592f2cfecc/scripts/extend-slate-original-review.mjs). Für eine gemeinsame Vorlage mit mehreren Materialien muss **Material/Familie am jeweiligen Ziel** aufgelöst werden. Nicht für AA/AS einfach neue künstliche Originale duplizieren. Diese Weiterentwicklung bleibt mit Astras Import-/Zieladapter zu koordinieren.

### Kleinster passender Anschluss

Der vorgeschlagene Weg verwendet den bearbeiteten nativen Stand: **Galerieversion → explizite Format-/Materialziele → geprüfter Änderungsplan → neue Revisionen der vorhandenen Shop-Konfigurationen → Shopdarstellung und Bindungen gezielt aktualisieren**. Der alte Katalog-Sync darf nicht stattdessen die ursprünglichen SVGs erneut importieren.

Für den ersten Anschluss genügt eine unveränderliche Quellreferenz; eine zusätzliche globale Masterdatenbank ist nicht zwingend erforderlich:

```text
Quelle:
  originalId
  sourceStoreId + sourceCfgId + sourceDesignId + sourceRevision
  designFingerprint + Ressourcen-Prüfsummen

Ziele:
  lineId + subcategoryId + familyId + sizeKey
  targetCfgId + targetDesignId + erwartete Zielrevision
  Shopify-Produkt-/Varianten-IDs + erwartete Bindungsrevisionen

Auftrag:
  operationId + planSha256
  bisherige/neue cfg-Revisionen und Bildzuordnungen
  Ergebnis der Rückleseprüfung + Aktivierungsstand
```

Der neue Planer soll vorhandene Geometrie-, Skalierungs- und Preisregeln wiederverwenden. Ein materialbezogener Rohling wird referenziert; das Design benötigt keine eigene duplizierte Grundplattendatei. Verschiedene Proportionen, Bohrungen und Druck-/Gravurprofile müssen weiterhin zum jeweiligen Ziel passen. Ein separat bearbeiteter Zielstand darf nicht unbemerkt durch die neue gemeinsame Vorlage überschrieben werden; der Plan muss diesen Unterschied ausweisen.

| Auslöser | Geplanter gezielter Abgleich |
| --- | --- |
| Text, Schrift, Motiv, Foto/Masken oder Anordnung geändert | Bearbeiteten nativen Stand und benötigte Ressourcen in die zugehörigen bestehenden Konfigurationen übernehmen; neue Revision erstellen. |
| Haupt-/Galeriebild zeigt dieses Design | Nur die zugeordneten Bilder aus genau diesem neuen Stand neu erzeugen und aktualisieren. |
| Bestehendes Startdesign bearbeitet | Startdesign-ID beibehalten, Inhalt aktualisieren. |
| Anderes Startdesign ausdrücklich gewählt | Konfi-Standard und Produktschnitt gemeinsam prüfen und aktualisieren. |
| Nur Gestaltung geändert | Keine Preis-, Bestands-, Varianten-ID-, Titel- oder SEO-Änderung daraus ableiten. |
| Materialangebot geändert | Eigenen Angebotsplan mit betroffenen Produkten/Varianten, Rohlingen, Größen, Optionen und Preisen anzeigen; bestehende Shopartikel nicht als Nebenwirkung löschen. |

Die revisionsgebundene Bestellfreigabe muss zum aktivierten Konfi-Stand passen. Lokaler Bindungswechsel und Freigabe brauchen eine gemeinsame konsistente Übernahme; Shopify und lokale Datenbank sind keine gemeinsame Transaktion. Externe Teilschritte daher protokollieren, zurücklesen und bei Unterbrechung gezielt fortsetzen. Historische Bestellungen behalten ihren ursprünglichen Stand. Rücknahme erfolgt als kontrollierte neue Übertragung eines alten Inhalts, nicht durch Umschreiben historischer Revisionen.

### Materialauswahl: Schema-Vorschlag, noch nicht implementiert

Die bestehende Katalog-Liniendatei und ihr Änderungsprotokoll können um `subcategories[].familyIdsOffered` ergänzt werden. Vorschlag: fehlend/null übernimmt die bisherige Linienauswahl; eine explizite Liste benennt die angebotenen Familien; eine leere Liste bedeutet keine neuen Angebote. Die Bedeutung einer Abwahl für bereits veröffentlichte Produkte gehört in den sichtbaren Angebotsplan, nicht in eine automatische Löschung.

Validierung, Katalogoberfläche, Import-/Formatplaner und Shopplaner müssen dieselbe aufgelöste Auswahl lesen. Nur Häkchen in der Oberfläche zu ergänzen wäre unvollständig. Bisher materialgebundene Linien brauchen für andere Materialien eine ausdrückliche Zuordnung; `themeId` allein ersetzt weder Zielgruppe noch Mit-/Ohne-Foto-Unterteilung. Die konkreten Materialhäkchen pro Unterkategorie legt Mikail fest; sie wurden hier nicht pauschal gesetzt. Keine Preise, Größen oder Befestigungen werden dabei erfunden.

### Offene Arbeit und Verantwortung

- **Mika:** nativen Design-Sync-Planer, geprüfte Quell-/Zielreferenzen, Änderungsübersicht, Journal und gezielten Shopify-Anschluss vorbereiten; bestehende Bindungen und Ressourcenablage verwenden.
- **Astra:** gemeinsame Original-/Material-/Formatziele und Unterkategorie-Materialauswahl mit dem bestehenden Katalog-/Importweg abstimmen. Kein konkurrierender zweiter Importadapter von Mika.
- **Claude:** Originalquellen/Rohlinge und deren Herkunft weiter nach dem vereinbarten Liefervertrag bereitstellen.
- `shop-draft-transfer` bleibt ein Weg für Neuanlagen; `acrylShop.update` aktualisiert nur ein Release-Metafeld. Keines davon ist bereits der vollständige Galerie-Synchronisieren-Knopf.
- Aktuelle Kundensitzungen bekommen bei einem Bindungswechsel eine Neuladeaufforderung. Vor Live-Abnahme muss bewusst geprüft werden, wie laufende Gestaltungen erhalten und fertiggestellt werden; in dieser Analyse keine Sitzungslogik geändert.
- Vor der ersten echten Aktivierung: frischer Host-/betroffener Shopdaten-Snapshot, konkrete Zielvorschau, Konflikt-/Wiederholungs-/Unterbrechungstest und Warenkorbprüfung mit exakt derselben aktivierten Revision. Die frühere private Galerieabnahme ersetzt diesen Nachweis nicht.

Offizielle API-Prüfung vom 06.11.2026: [productSet 2026-07](https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/productSet) ersetzt fehlende Einträge übergebener Listen; für den gezielten Anschluss sind vollständige Fremdlisten daher ungeeignet. [metafieldsSet](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/metafieldsSet) unterstützt bedingte Updates per `compareDigest`; atomar ist dabei nur dieser einzelne Metafeld-Aufruf, nicht der gesamte Shop-/Datenbankabgleich. Die aktuell laufende API-Version wird dadurch nicht ungefragt geändert.

**Stand dieses Nachtrags:** bestätigten Funktionsumfang und geprüften Anschlussvertrag dokumentiert. Noch kein neuer Synchronisierungsbutton, kein Materialhäkchen gesetzt, kein Shopprodukt verändert, keine Live-Freigabe. Die Sicherungen aus Abschnitt 8 bleiben unverändert; der neue Wissensstand wird zusätzlich versioniert auf GitHub gesichert.

## 13. Vor jeder Produktneuanlage: tatsächliche Optionen abfragen

### Nutzerentscheidung und unmittelbare Klarstellung vom 06.11.2026

Mikail verlangt vor dem Neuanlegen von Produkten eine Abfrage, welche Befestigungen, Zubehörteile und sonstigen Ausführungen angeboten werden sollen. Die von ihm genannten Beispiele (Bohrungen, selbstklebend, Klebeband für bestimmte Untergründe usw.) hat er unmittelbar danach ausdrücklich als **bloße Beispiele** klargestellt.

**Verbindlich ist der Abfrageablauf, nicht eine aus diesen Beispielen abgeleitete Optionsliste.** Daraus entstehen weder neue Standardwerte noch bestätigte Produkteigenschaften, Aufpreise oder erlaubte Kombinationen. Auch die frühere Bestätigung bestimmter Schiefer-Gedenktafeloptionen gilt nicht automatisch für andere Produktgruppen.

Weitere Klarstellung im selben Austausch: **Je nach Produktgruppe gibt es wesentlich mehr Möglichkeiten.** Die Abfrage und Datenstruktur dürfen deshalb weder auf die genannten Beispiele noch auf feste Bereiche „Befestigung/Zubehör“ begrenzt werden. Jede Produktgruppe braucht eine vollständige, erweiterbare Zusammenstellung ihrer eigenen Optionsbereiche. Bereichsnamen, Auswahlmöglichkeiten, erforderliche oder optionale Angaben, zulässige Kombinationen, Material-/Größenabhängigkeiten und Aufpreise müssen aus ihren bestätigten Regeln kommen. Unbekannte Möglichkeiten bleiben offen, bis Mikail sie konkret benannt bzw. vorhandene passende Daten bestätigt hat.

Architekturfolge für die Vorbereitung: gemeinsamen Konfi weiterverwenden und produktspezifische Optionen über Produktgruppen-Einstellungen beschreiben. Zusätzliche gewöhnliche Auswahlbereiche sollen keine Kopie des Konfis erfordern. Eine völlig neue Bearbeitungsfunktion kann eine Erweiterung des gemeinsamen Konfis brauchen; die Aussage „jede denkbare Funktion geht allein durch neue Daten“ wäre nicht belegt. Der konkrete unterstützte Umfang ist je neuer Produktgruppe zu prüfen.

Für den vorgesehenen Anlageablauf gilt:

1. Vor dem Erstellen neuer Produkte **alle** gewünschten Optionsbereiche und Möglichkeiten für genau die bezeichneten Produkte abfragen und vollständig anzeigen, nicht nur Befestigung und Zubehör.
2. Nur die dafür bestätigte Auswahl anlegen. Wenn Material oder Größe unterschiedliche Möglichkeiten erfordern, diese Unterschiede vorab sichtbar machen und klären.
3. Bereits gespeicherte Regeln dürfen eine vorbereitete Auswahl liefern, ersetzen aber nicht die vom Nutzer ausdrücklich gewünschte Bestätigung vor der Neuanlage.
4. Preise, Geometrie, technische Eignung und zulässige Kombinationen aus den vorhandenen maßgeblichen Daten übernehmen; fehlende oder widersprüchliche Angaben gezielt klären. Keine Werte aus einer beispielhaften Formulierung erfinden.
5. Bestätigte Auswahl mit dem betroffenen Produkt-/Anlageumfang festhalten, damit Galerie, Konfi und Shop denselben Stand verwenden. Eine Freigabe für benannte Produkte ist keine pauschale Freigabe aller künftigen Produkte.

Die neue Abfrage betrifft **Produktneuanlagen**. Ein reiner Designabgleich bestehender Produkte soll deren Befestigungen, Zubehör und Preise weiterhin nicht als Nebenwirkung ändern. Soweit ein Abgleich zusätzliche neue Produkte erfordern würde, greift für diese Neuanlagen zuerst die Optionsabfrage.

Optimierungsvorschlag, noch nicht umgesetzt: gespeicherte Produktgruppen-Einstellungen beim nächsten Anlegen als prüfbaren Vorschlag zeigen, sodass Mikail sie bestätigen oder gezielt ändern kann, statt bekannte Optionen jedes Mal neu einzutippen. Keine ungefragte Übernahme.

**Stand:** Anforderung und Klarstellung dokumentiert; keine Klebeband-/Befestigungsoption aktiviert, keine Produktdaten geändert und noch keine neue Abfrageoberfläche implementiert. Diese Ergänzung gehört in den gemeinsamen Anlage-/Synchronisierungsvertrag von Mika und Astra.
