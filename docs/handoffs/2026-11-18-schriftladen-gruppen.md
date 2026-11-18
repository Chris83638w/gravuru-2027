# P1: Schriftgruppe plus Originaldesign, gezielt nachladen

18.11.2026 · Astra/Codex · Issue #254 / PR #255 · Basis 54f81ce auf der bestehenden P1-Linie ab Live-Stand be163c5d, nicht main. Nicht live.

## Entscheidung und abgegrenzter Schritt

Chris hat die 29 Schriften aus „Tür & Familie“ auch für „Hausnummer & Firma“ und „Andenken & Hochzeit“ ausgewählt. Hinzu kommen die Schriften des geöffneten Originaldesigns. Spätere Klarstellung: **„bis 35 wären es auch egal. Nur keine 66 mehr“**. Claudes Zählung am Katalog 8236b8b ergibt 29–32 sichtbare Schriften bei 9.885 Designs dieser drei Gruppen. Keine Abschneidefunktion, Massenersetzung oder neue harte Grenze. Quellen: [Auswahl](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6968589682), [Prüffälle](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6968625069), [35er-Klarstellung](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6968649021).

Dieser Code-Schritt setzt die gemeinsame Auswahlregel und das gezielte Nachladen um. Katalog-Sets, produktive Profile und Designs werden nicht geändert. Die zwei übrigen vorgeschlagenen Gruppen sind noch nicht von Chris bestätigt. Die aktuelle Auswahl ersetzt den früheren unverbindlichen Drei-Gruppen-Vorschlag in `2026-11-18-schriftgruppen-66.md`.

## Verhalten

- `designFontSelection` bildet Gruppe ∪ Originalschriften in einem gemeinsamen Modul für Browser und Server. Quelle ist ausschließlich das nach Optionen aufgelöste, geöffnete Design; Kundenobjekte und andere Galerie-Designs erweitern die Freigabe nicht. `null` behält das bisherige Verhalten.
- „Text hinzufügen“ lädt nur die Startschrift. Montserrat bleibt der bestehende Startwert, wenn erlaubt; sonst die erste verfügbare Gruppenschrift, bei leerer Gruppe die erste verfügbare Originalschrift. Ohne ladbare Schrift wird kein ungültiges Objekt angelegt.
- Optionales Vorladen filtert die bestehende Empfehlungsliste auf die Gruppe. Die Empfehlungsliste selbst bleibt unverändert. Originaldesign-Ressourcen werden weiterhin bei tatsächlichem Bedarf geladen.
- Preise, Prüfungen, Bindungen, Geometrie, Layout und Bedienablauf bleiben bestehen. Nur der ausdrücklich gewünschte Inhalt der Schriftliste ändert sich.

## Prüfung gegen Claudes elf Fälle

| Fall | Nachweis |
| --- | --- |
| 1–2: Originalschrift zurückwählen, Schrift von Text B auf Text A/neuer Zeile | Gemeinsame Regel und echte `/api/workshop/acrylic-drafts`-Routen: Erstellen 201, Aktualisieren 200; Browser Garamond Acryl → Montserrat → Garamond Acryl erfolgreich. |
| 3: Andere Designs / manipulierte Kundendaten | Liste enthält nur die aktuelle Quelle; Ressourcentest weist fremdes Design und eingeschobene `input.design` zurück; echte Entwurfsroute weist nicht erlaubte Schrift mit 422 zurück. |
| 4: Designwechsel / Rückgängig | Echter `captureDesignContent`/`carryDesignContent`-Transfer erhält Kundentext, übernimmt Schrift von B; Liste aus B, Wiederherstellung des vorherigen Zustands liefert wieder A. |
| 5: Familie / Funkklingel | Ausgewählte Formatvorlage gegen initiales/fremdes Profil getestet, einschließlich gegenüberliegender Klingelposition. Vorhandene Größen-, Zustands-, Undo- und Produktionsprüfungen mitgelaufen. |
| 6: Backendänderung nach Entwurf | Privater SQLite-Stand mit tatsächlicher Entwurfsroute: neues Backend-Profil sichtbar, gepinnte Produktrevision behält Montserrat; Entwurf bleibt speicherbar, altes Paket bytegleich, neues Warenkorbangebot erzeugbar. Kein echter Shopify-Warenkorb in diesem Test. |
| 7–9: Startwert, null, fehlende Datei | Ausführung des tatsächlichen Add-Text-Handlers; 29er-Gruppe lädt nur einen Startwert, abweichende Gruppe/[] funktionieren; fehlende/fehlgeschlagene Ressource erzeugt kein Objekt. Vorhandene Lazy-Loader-Tests filtern unbekannte Dateien. |
| 10: Anfragen vorher/nachher | Gleicher lokaler Browseraufbau, siehe Messung unten; zusätzlich Test einer ausgeschlossenen Empfehlung und leerer Gruppe. |
| 11: Gemeinsamer Prüfort | Native Entwürfe und Prüfstände in `http.mjs` sowie Shop-Einstieg `shop-entry.mjs` verwenden `prepareAcrylicReview` → `nativeReviewConfig`. `shop-entry` bindet Produktrevision an die Sitzung. Fertigung verarbeitet das eingefrorene geprüfte Paket; keine erneute Auswahl gegen eine heutige Liste. Werkstatt-Direktbearbeitung ist ein Autorenweg und darf weiterhin Originalschriften verwalten, keine zweite Kundenauswahlregel. Separater Formprodukt-Konfi ist nicht Teil dieses nativen Prio-Schritts. |

Ausgeführt: neun gezielte Testdateien, **93/93 bestanden**, inklusive Build-, HTTP-, SQLite-, Format-, Auswahl- und Nachladeprüfungen. Python für die echte Bildprüfung über `GRAVURU_PYTHON` gesetzt. Befehl:

```text
node --test app/configurator/variant-m/profile-selection.test.mjs app/configurator/variant-m/family-formats.test.mjs app/configurator/variant-m/doorbell-selection.test.mjs app/configurator/variant-m/doorbell-state.test.mjs app/configurator/variant-m/font-loading-actions.test.mjs app/configurator/variant-m/lazy-resources.test.mjs app/configurator/variant-m/preload-queue.test.mjs app/workshop/native-review-resources.test.mjs app/workshop/font-selection-draft-http.test.mjs
```

## Vorher-/Nachher-Messung

Desktop-Chrome, gleicher Rechner und Viewport, localhost, dasselbe Acrylmodell, identisches **synthetisches 29er-Profil aus vorhandenen Laufzeitdateien** (nicht Chris' ausgewählte 29 Katalogschriften), Textreiter offen, reguläres anfängliches Vorladen beendet, danach Zähler zurückgesetzt und einmal „Text hinzufügen“. Vorher-Code 54f81ce, Nachher-Code dieses Schritts. Ein Lauf je Version, kein Mobilfunkprofil, keine Warenkorb-Endzeit und keine belastbare Zeitverteilung.

| Beobachtung | Vorher | Nachher |
| --- | ---: | ---: |
| Schriftanfragen nach Klick | 27 | 0 |
| Gezählt am Server: Antwortbytes dieser Schriftdateien | 3.950.428 | 0 |
| Klick bis neue Textzeile + nächster Animation Frame | 738,1 ms | 246,7 ms |

Montserrat war durch das reguläre Vorladen bereits vorhanden. Ohne vorhandene Startschrift fordert der gezielte Handler genau eine an (separater Test), statt die ganze Liste zu laden. Antwortbytes sind keine vollständigen Netzwerkbytes oder RSS-Werte. [Rohwerte](2026-11-18-schriftladen-messung.json).

Reproduzierbarer lokaler Aufbau: `node tools/performance/font-loading-fixture.mjs <Checkout-Pfad> <Port>` aus einem Scratch-Verzeichnis; erzeugt dort `work/font-ui-<Port>` mit privater SQLite-Datei. Vorher-Checkout an 54f81ce und Nachher-Checkout an getrennten Ports starten. Im Browser `/` öffnen, Textreiter, Vorladen abwarten, „Messung zurücksetzen“, „Text hinzufügen“. Messung wird im lokalen Kopfbereich angezeigt; der eigentliche Konfi wird unverändert eingebunden. Kein externer Zugriff, kein Live-Import. Nicht als Admin-Server verwenden (Werkstatt-UI bleibt zugriffsgeschützt).

## Offen und genau nächster Schritt

Claude prüft diesen Commit. Danach die bestätigten Gruppen und die dauerhafte Backend-Pflege als eigenen überprüfbaren Schritt anschließen: `ensureFontSet` in `katalog-import.mjs` überschreibt derzeit manuell bearbeitete Listen beim nächsten Import. Vorschlag: bestehende Backend-Bearbeitung an das zugehörige kanonische Katalog-Set anbinden, mit Änderungsprotokoll und normaler Revisionsbildung; keine zweite unabhängige Gruppenliste. Das ist **noch nicht umgesetzt**, bestehende Importregeln bleiben hier unverändert.

Der höhere Server-RSS-Sockel ist mit diesem Browser-Schritt **nicht geklärt oder behoben**. Die bisherigen großen gespeicherten Produkt-/Schriftdaten bleiben ein separater Mess-/Umbaupunkt. Das eigentliche Ziel bleibt Variante C: fertige Daten möglichst von Shopify, direkte Bedienung, wenig eigene Serverarbeit beim Kundenklick. Keine feste Fünf-Sekunden-Regel. Keine Live-Aktivierung ohne Chris' ausdrückliches „live“.
