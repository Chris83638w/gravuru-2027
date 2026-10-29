# Issue #48 – Nachrichten 12 und 13

Stand: 29.10.2026, Codex/Astra, PR #58. Erst Nachricht 12, danach 13. Keine Bereitstellung, keine Live-Datenänderung. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt für Gestaltung weiter; die ausdrücklich bestellte Kundenbedienung folgt Nachricht 13.

## Regeln und Quellen (vor der Implementierung)

| Regel | Quelle |
| --- | --- |
| Der Shop-Einstieg lädt ohne Editor-Vertrag; seine gesamte Importkette muss über die wirkliche Händlerhost-Auslieferung erreichbar sein. | [Nachricht 12](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6499938817), 29.10.2026 |
| Gewählte Ausführung und Menge bleiben beim Designwechsel erhalten. Kein stiller Rückfall auf eine andere Befestigung; bisherige Gestaltung und Foto bleiben bei Fehlern erhalten. Vollständige Prüfung und Preisberechnung im Editor/Server bleiben maßgeblich. | Teil D1 in Issue #48, präzisiert durch Nachricht 12 |
| Jedes einzelne Motiv ist löschbar und ersetzbar, unabhängig von seiner Verschiebbarkeit. | [Chris, Nachricht 13](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6499962726), 29.10.2026 |
| Nur ausdrücklich als Einheit verkaufte ganze Druck-Designs dürfen gesperrt sein; ein Code-Standardwert oder ein beliebiger Dateiimport ist keine solche Entscheidung. | Nachricht 13 und [Nachricht 14 / AGENTS.md](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6499988217) |
| D8 erhält einen vorbereiteten neuen Produktstand; alte Bestellungen und veröffentlichte Revisionen bleiben unverändert. Kein Live-Schreiben ohne Chris. | Nachricht 13 |
| Preise und Lochabstände werden hier nicht geändert; ihre Quelle bleibt die Preis-Excel. Keine neue Pflicht, kein neues Maß oder Sperrkriterium aus bisherigen Code-Standardwerten ableiten. | AGENTS.md, main `2717da5`; Chris in Issue #48 |

## Nachweise und offene Punkte

### Nachricht 12

- Shop-Einstieg verwendet `shop-selection-transfer.mjs` ohne weitere Importe. Nur Ausführung/Menge werden kopiert und unbekannte Gruppen/Befestigungen früh abgelehnt. Keine Standardwerte, Preisauflösung oder Rechte aus dem Editor werden hier geladen.
- Die vollständige Prüfung bleibt in `product-design-transfer.mjs` im Editor. Ein mitgegebenes, im Ziel unsichtbares Optionsfeld wird dort weiterhin abgelehnt; es wird nicht still verworfen. Alter Editor, Foto und Warenkorbkontext bleiben bei Fehlern erhalten.
- `shop-entry.test.mjs` verfolgt ab `shop-entry-page.mjs` alle statischen und literalen dynamischen Importe durch `createShopEntry.matches/handle`, genau die vorgeschaltete Auslieferung des Zwei-Store-Händlerhosts. Keine frei zugänglichen Editor-/Werkstattpfade hinzugefügt. Der Test scheiterte vor dem Fix am Import `product-design-transfer.mjs`; danach grün.
- **73/73 gezielte Tests bestanden**, keine Fehler/Skips: `shop-entry`, `shop-design-switch`, `acryl-host-routing`, `product-design-transfer`, `ui-event-regressions`. Kein erneuter Vollauf.
- Noch offen: 1:1 mit diesem neuen Code auf der echten Shopseite (Schraubenwahl, Schriftoptionen, durchgehendes Tippen) und echtes Safari. Die hier verfügbare Browsersteuerung bietet keine lokale Antwortüberschreibung der Live-Seite. Claudes genannter kombinierter Prüfbranch war beim Abruf nicht als Remote-Ref vorhanden. Keine Bereitstellung als Testumweg.

### Nachricht 13 einschließlich Audit aus Nachricht 14

Einzelne Motive erhalten beim Erzeugen einer neuen Vorlage oder eines neuen Produktdokuments `replace:true` und `delete:true`, unabhängig von `move` und `scale`. Ein festes Motiv kann in seinem unveränderten Feld ersetzt oder entfernt werden. Technische Objekte und Hilfsebenen bleiben ausgenommen. Gespeicherte Revisionen werden beim Lesen nicht umgeschrieben.

Die Ausnahme heißt ausdrücklich `design.wholePrintDesign: true`. Sie ist nur bei Verfahren Druck zulässig, muss ein Wahrheitswert sein und wird weder aus dem Material noch aus dem Dateityp abgeleitet. Beim Dateiimport gibt es dafür ein Häkchen mit entsprechender Beschriftung. Im vorbereiteten JSON-Paket bzw. Katalog muss die Kennzeichnung selbst enthalten sein. Vorschau-/Übernahmetoken binden diese Auswahl an das geprüfte Dokument.

| Geprüfte Stelle | Befund und Änderung |
| --- | --- |
| `katalog-convert.mjs` | Die Kopplung der beiden Motivrechte an `movable` erzeugte die falsche Sperre. Neue Motive jetzt ersetz-/löschbar, Bewegung/Skalierung bleiben getrennt. |
| `design-import.mjs` | Dateiimport war pauschal gesperrt. Jetzt nur mit ausdrücklicher Druck-Kennzeichnung; sonst ersetz-/löschbares Motiv im festen Feld. Originaldatei-/Hashprüfung bleibt erhalten und ist von Kundenrechten getrennt. |
| `editable-design.mjs` | Extrahierte Grafikbestandteile waren pauschal gesperrt. Neue Motive folgen der Regel; Fotos und echte Texte behalten eigene Rechte. Noch nicht umgewandelte PDF-Schriftkonturen gelten technisch als Motive. |
| `prepared-design.mjs` | Vorbereitetes Motiv war pauschal gesperrt. Neue Motive folgen der Regel; ausdrücklich gekennzeichnete ganze Druck-Designs bleiben geschützt. |
| `customer-fields.mjs` | Erzeugt Text-/Fotofelder, keine Motive. Bestehende Motivrechte bleiben beim Ergänzen solcher Felder erhalten; pauschaler Sperrhinweis berichtigt. |
| `ui/design-authoring.mjs` | Neu eingefügtes Motiv erhielt false/false. Jetzt true/true; Kennzeichnung eines ganzen Druck-Designs wird berücksichtigt. |

Kundendialog und Acryl-Schutzschicht berücksichtigen ausdrücklich gespeicherte Ersetz-/Löschrechte. Bei gesperrter Skalierung bleibt das Feld exakt gleich groß; das neue Motiv wird proportional darin dargestellt. Geometrie-/Duplizierschutz sowie technische Elemente und die Fotoaufnahme bleiben geschützt. Alte explizite false-Rechte gelten weiterhin bis zu einem neuen Produktstand.

**132/132 gezielte Tests bestanden**, 0 Fehler/Skips, 19,63 s: Katalogkonverter, Produktmodell, Dateiimport, Werkstattbearbeitung, Kundenfelder, vorbereitete/zerlegte Vorlagen, Revisionsvorbereitung, echte UI-Handler, Elementrechte und Vertrag. Danach nur der geänderte Kennzeichnungsfall (null/String/Zahl) nochmals **1/1 grün**. Nachricht 12 separat 73/73; die Mengen überschneiden sich und werden nicht addiert. Kein neuer Vollauf. Claudes [Linux-Lauf 1854/1854 auf 2aa16cc](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6500411419) betrifft seinen vorherigen kombinierten Prüfstand, nicht diese abschließenden Änderungen.

Reproduktion: `node --import ./scripts/test-portability/full-tests-python-windows.mjs --test --test-concurrency=2` mit den elf Dateien `app/workshop/{katalog-convert,product-model,design-import,design-authoring,customer-fields,prepared-design,editable-design,motif-rights-revision}.test.mjs` und `app/configurator/variant-m/{ui-event-regressions,element-rights,contract}.test.mjs` (Klammerliste nur Kurzschreibweise). Windows: bestehende Python-Umgebung über GRAVURU_PYTHON/PYTHONPATH, PYTHONUTF8=1. Nachprüfung: `node --test --test-name-pattern="catalogue whole print design" app/workshop/katalog-convert.test.mjs`.

### D8: vorbereiteter Produktstand, nicht gespeichert oder live

- Produkt `cfg_98436fb0-886d-4af8-bc11-f45ef809684c`, Design `katalog-TAE-V2A-8x5-D8`, Motiv `motiv-1`.
- Quelle: private Originalkopie mit **Revision 1**. Offline-Kandidat für **Revision 2**, nicht als aktueller Live-Stand behauptet.
- Exakt zwei Werte geändert: `replace:false → true`, `delete:false → true`. Nach Zurücksetzen dieser zwei Werte ist der vollständige Dokumentvergleich identisch.
- Fünf Befestigungen vorher/nachher: K00 **19,99 €**, KGL **22,98 €**, KRA **23,98 €**, B02 **22,48 €**, B02S **22,68 €**. Preis und physische Geometrie jeweils identisch. Erhaltung gespeicherter Werte, keine neue Preisentscheidung.
- Ersetzen durch das echte Bibliotheksmotiv „Haus“ (`import-b56d5711a75f34c1fa8d9c30`) und Entfernen bestehen die neue Servervalidierung. Beide werden von der alten Revision weiterhin abgewiesen.
- Beide privaten Original-Bestellarchive behalten ihre ursprünglichen SHA-256-Prüfsummen (**2/2 identisch**). Keine Bestellung überschrieben.

| Dokument | SHA-256 über JSON.stringify(document) |
| --- | --- |
| Quellprodukt | `ec7a58bb00c0dc382431f8260ea5c0041b4850fb8fd276448089a84edbfc8793` |
| Offline-Kandidat | `45a5e6a764878735802f91a64348cee90c01341171e338184efc2c9cd96c228a` |

Reproduzierbare Vorbereitung ohne Datenbank-/Netzzugriff:

~~~sh
node scripts/prepare-motif-rights-revision.mjs --record private-record.json --design katalog-TAE-V2A-8x5-D8
node scripts/prepare-motif-rights-revision.mjs --record private-record.json --design katalog-TAE-V2A-8x5-D8 --out new-private-plan.json
~~~

Eingabe: `{id, revision, document}` aus einem bereitgestellten Produktstand. Ohne `--out` nur Bericht; mit `--out` ausschließlich eine neue lokale Datei, kein Überschreiben. Ausgabe enthält Quellrevision, vorgeschlagene Folgerevision, Hashes und Änderungen. Kein Commit-/Live-Schalter. Private Produkt-/Bestelldokumente und Schriftdaten liegen nicht im Code-Repo. Claude kann den Kandidaten aus seiner Originalkopie reproduzieren. Vor einer später genehmigten Übernahme aktuelle Revision und Quellhash vergleichen; bei Abweichung frisch vorbereiten. Speicherung/Bindung erst über den regulären Revisionsweg und nach Chris' Freigabe.

### Lokale Sichtprüfung mit echter D8-Kopie

Gebaute Anwendung auf localhost: B02S gewählt, Leuchtturm durch Haus ersetzt, „Kein Motiv“ entfernt es, Rückgängig stellt es wieder her. „Familie Müller“ durchgehend in dasselbe Feld getippt; Schriftoptionen unter der Zeile → Cinzel → nur diesen Text übernommen. Schraubenwahl und **22,68 €** bleiben bestehen. Desktop 1440 × 1000, iPhone-13-Größe 390 × 664 und SE-Größe 375 × 548. Chromium mit diesen Ansichtsgrößen beweist nicht die iOS-Tastatur/Safari.

- [390 × 664: Haus ersetzt Leuchtturm](issue48-d-20261029/nachtrag12-13/iphone13-motiv-ersetzt.jpg)
- [390 × 664: Motiv entfernt](issue48-d-20261029/nachtrag12-13/iphone13-motiv-entfernt.jpg)
- [390 × 664: Schrift und Text übernommen](issue48-d-20261029/nachtrag12-13/iphone13-schrift-uebernommen.jpg)
- [375 × 548: Schrift und Preis sichtbar](issue48-d-20261029/nachtrag12-13/iphone-se-schrift-uebernommen.jpg)
- [Desktop: Schrift und Preis](issue48-d-20261029/nachtrag12-13/desktop-schrift-uebernommen.jpg)

### Verbleibende Abnahme

1. Nachricht 12: neuer Stand im echten Shop mit lokaler Browser-Dateiumleitung, einschließlich echtem Designwechsel mit Schrauben. Lokaler D8-Editor beweist Bedienung, nicht Shop-Einstieg/Live-Designwechsel.
2. Echte iOS-Safari-Prüfung und Linux-Prüfung dieser Änderungen; vorhandener Linux-Bericht betrifft vorherigen Prüfstand.
3. D8-Kandidat mit aktueller Produktrevision vergleichen; neue Revision/Bindung erst nach Chris' ausdrücklichem Live-Satz. Historische Bestellungen unverändert.
4. Übrige Grenzen aus dem [D-Bericht](2026-10-29-issue48-kundenbedienung-bericht.md): echte Danke-Seite/E-Mail und Shopify-Zeitmessung unter 3 s. E bleibt Vorschlag in #59.
5. Fachliche Rückfrage: Nach Entfernen sämtlicher Gestaltungselemente blockiert die bestehende Mindestinhaltprüfung weiterhin den Abschluss. Ob ein vollständig leeres Schild bestellt werden soll, ist hier nicht entschieden; D8 mit verbleibenden Texten ist davon nicht betroffen.

## Zoom-Nachtrag von Chris, 29.10.2026

Regel → Quelle: [Chris' Entscheidung im Chat, in Issue #48 festgehalten](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6501287270): keine Lupe; mobil Zwei-Finger-Zoom, Desktop Mausrad. Ersetzt die frühere Vorgabe für Lupe und Desktop-Zoomleiste. Keine neue Freigabe zur Installation.

Lupe wird nicht mehr geladen/angeschlossen; keine Zoomleiste, Plus-/Minus- oder „Ganzes Schild“-Zoomknöpfe. Die Ansicht verwendet die volle Breite ohne 60-px-Reserve. Navigation setzt die Ansicht zurück; die Bearbeitungsgriffe und mm-Hilfen bleiben erhalten. Zoom verändert weiterhin weder Schrift-/Objektgrößen noch Fotos, gespeicherte Gestaltung oder Rückgängig-Verlauf.

**57/57 gezielte Tests grün**, keine Fehler/Skips: view-zoom, view-zoom-model, drag-assistance, ui-event-regressions. Bestehende Tests für die entfernten Bedienelemente auf die neue Entscheidung umgestellt; Zwei-Finger-Schutz, Mausrad über Texten/Motiven, Koordinaten und unveränderte Gestaltung weiter geprüft. Der historische Hilfsmodultest für die nicht mehr eingebundene Lupe ist kein Nachweis eines aktiven Kundenelements. Kein weiterer Vollauf.

Chris möchte die gemeinsame lokale Vorschau vor der Installation Schritt für Schritt prüfen. Die Vorschau ist keine Shopify-/Safari-/Installationsabnahme.
