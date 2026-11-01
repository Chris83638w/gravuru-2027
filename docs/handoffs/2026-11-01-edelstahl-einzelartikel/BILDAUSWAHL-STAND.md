# Bildauswahl für 80 Edelstahl-Einzelartikel

01.11.2026 · Astra · Entwurfs-PR #107 · keine Shopify-/Live-Änderung.

Chris hat **„versetzt“** ausdrücklich bestätigt: `TRE-V2A-8x3,5-D4`, Familie/Hoffmann mit Linie, ausschließlich für 8 × 3,5 cm. Genau ein Artikel je Form und Größe, keine Unterkategorie-Doppelungen, kein Start-/Titelbilddesign doppelt. Der Master bleibt optisch und im Code unverändert.

## Bildauswahl

- [Filterbare Bildauswahl mit Originalvergleich](bildauswahl.html): lokal öffnen.
- Kontaktbögen direkt auf GitHub: [1–16](kontaktbogen-1.png), [17–32](kontaktbogen-2.png), [33–48](kontaktbogen-3.png), [49–64](kontaktbogen-4.png), [65–80](kontaktbogen-5.png).
- [Artikeltexte und Bildangaben](seo-vorschau.html), [CSV](artikel-uebersicht.csv), [vollständige Entwürfe](artikel-entwuerfe.json).
- [Bild-/Passprüfung und Browsernachweise](bildpruefung.json), [Gesamtprüfung](pruefung.json), [25 Schriftquellen](schriftquellen-pruefung.json).

| Inhalt | Geprüfter Stand |
|---|---|
| Artikel/SEO | 80/80 Form-/Größenkombinationen; je 80 eindeutige Titel, Handles, SEO-Titel und Meta-Beschreibungen |
| Preise/Befestigungen | 404 Kombinationen aus der Familie, keine Grundpreise offen |
| Startdesigns | 72 Vorschläge; jede D-Grundgestaltung höchstens einmal, auch über unterschiedliche Formnamen hinweg |
| Bilder | 72 native Konfigurator-Aufnahmen + 72 Originalvergleiche |
| Kompression | 144 verlustfreie WebP; dekodierte RGBA-Pixel gegen jeweilige PNG-Aufnahme identisch |
| Automatische Passprüfung | 4.680 Design-/Größenpaare; 13 verworfen; Auswahl 69 × `passt`, 3 × `prüfen`, 0 × `passt nicht` |
| Freigaben | Fünf Rund-Vorschläge ohne Zielfreigabe; keine neue Freigabe gesetzt |
| Schriften | 25 Dateien gegen Katalog-main geprüft; Glyphenressourcen stimmen mit dem zugehörigen Konvertierungscache überein |
| Sichtprüfung | Alle fünf Kontaktbögen angesehen; zwei Aufnahmeausschnitte korrigiert und einzeln nachgesehen; D4 ebenfalls einzeln geprüft |
| Galeriebedienung | 80 Karten, Filter zeigt acht offene Plätze, Originalvergleich aufklappbar; 390 × 664 ohne horizontales Überlaufen |
| App, Katalog, Shop, Live | Keine Änderungen, kein Import, kein Merge |

Die erste namensbasierte Vorauswahl hatte 42 Vorschläge; mit den lokalen Größen-/Rund-Quellen waren zunächst 75 verschiedene Namen möglich. Verschiedene Namen können jedoch denselben D-Grundentwurf meinen. Deshalb ist jetzt vorsorglich jeder D-Grundentwurf nur einmal vergeben. Das ist eine konservative redaktionelle Vorauswahl, keine automatische Bildfreigabe. Acht Plätze bleiben sichtbar offen, statt sie mit umbenannten Kopien aufzufüllen.

Die native Szene nutzt Katalogschriften als Glyphenpfade. Der aufklappbare Originalvergleich rendert das unveränderte Katalog-SVG mit seiner echten Schriftdatei. Zielgrößen verwenden das bestehende `scaleTemplate(..., {contain:true})`. Motive wurden nicht umgezeichnet, gespiegelt oder ersetzt. Die Screenshots sind Prüfbilder, noch keine abgenommenen Shopmedien. Von 240 geplanten Shopbild-Plätzen sind 72 Frontvorschauen konkret; echte Materialdetailfotos und endgültige Maßbilder bleiben offen. Die Kontaktbögen dienen nur der Prüfung.

## Offene Plätze und Hinweise

| Plätze | Ursache und nächster Schritt |
|---|---|
| Nr. 11, 13, 15: Rechteck 21 × 7, 24 × 8, 27 × 9 cm | Alle 72 passenden D-Grundgestaltungen sind bereits einmal vergeben. Zusätzliche eigenständige Gestaltungen als Bilder vorschlagen und mit Chris abstimmen; keine Kennungen erfinden. Die Verteilung kann sich bei der Bildabnahme ändern. |
| Nr. 76–80: Retro geschwungen 15 × 10, 18 × 12, 21 × 14, 24 × 16, 30 × 20 cm | Keine zulässige Zuordnung nach `assignTargetSeries`, auch mit PR #99. Claude: Anschluss/Quelle gegen #106/#99 klären. Bindende Größen-/Seitenverhältnisprüfung bleibt aktiv. |
| Nr. 19: D4, 8 × 3,5 cm | Prüfwert Linie 0,325 mm; Textnähe zu Bohrlöchern bei B02/B02S. Gewünschte Gestaltung unverändert. Bild ohne Bohrung; Lochvarianten gesondert prüfen. |
| Nr. 74/75: Retro geschwungen 9 × 6 / 12 × 8 cm | Bestehendes Einpassen meldet 1,50 % Seitenverhältnisabweichung. Originalvergleich und Abnahme offen; keine Änderung an Quellkontur/Motiv. |

Acht offene Plätze bedeuten nicht acht neue, bereits freigegebene Katalog-IDs. Die fünf Rund-Vorschläge sind ebenfalls noch nicht freigegeben.

## Quellen

Code `b3b0886ad26f95fe374c2e54651b79b118cb444a`, Katalog-main `c8356aa27de5340b8dcd647e6454bd2852232bdb`. Familie `familien/edelstahl/steel-door-signs.json`, Linie `linien/edelstahl-tuerschilder.json`. Nur in einer privaten Prüfsicht ergänzt:

- Katalog-[PR #99](https://github.com/Chris83638w/gravuru-katalog./pull/99), `021038063546299aff411c843cf7f2abb9d971c1`: ausschließlich 2.196 zusätzliche `sizes`-Zuordnungen in 513 Dateien; aktuelle Texte/Freigaben aus main bleiben erhalten. Kein pauschales Überschreiben mit dem älteren PR-Stand.
- Rund-[PR #12](https://github.com/Chris83638w/gravuru-katalog./pull/12), `62404b12d429b439e0f8738d6bc81b23e15bd25d`: 72 Rund-Master als Prüfquelle, Freigabefelder unverändert.
- Code-[PR #106](https://github.com/Chris83638w/gravuru-2027/pull/106) wird nicht nachgebaut oder mitgemergt. PR #107 ändert keine App-Logik.

JSON-/SVG-Blob-IDs und übernommene Größen stehen je Vorschlag in den Nachweisen. Die 104 alten Hauptprodukte sind Bindungskandidaten, kein aktueller Shopify-Abgleich. Neue Ziel-IDs bleiben offen. Vor Übertragung aktuelle Produkte/Handles/Medien lesen; nicht pauschal 80 zusätzliche Duplikate erzeugen. Artikelbindung, Preisvertrag, Größenwechsel, Warenkorb und Wiederbearbeitung sind für diese Entwürfe noch abzunehmen. Verkaufsbenennung und echte Maße getrennt erhalten. Weitere SEO-/Artikelanforderungen stehen in der [ursprünglichen Checkliste](README.md#seo-und-bilder-vollständig-bis-zur-veröffentlichung-verfolgen).

Weitere Designarbeit folgt dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/c8356aa27de5340b8dcd647e6454bd2852232bdb/designs/DESIGN-MASTER.md). Keine neue Freigabe, keine Änderung an Kennungen, Preisen, Konturen oder Originalmotiven.

## Reproduktion

[reproduktion/](reproduktion/) enthält die Quell-/Browser-Skripte. Benötigt: privates Katalog-Repo mit den genannten Commits, lokaler Katalog-Checkout samt Schriften, Node/Chrome, Playwright und Sharp. `GRAVURU_REVIEW_DEPENDENCIES` kann auf die Paketdatei der lokalen Browser-Testabhängigkeiten zeigen. Keine Schriften oder großen Glyphen-/Konfigurator-Caches ins Code-Repo aufnehmen.

1. `read-catalog.mjs <Repo> <Prüfordner> c8356aa27de5340b8dcd647e6454bd2852232bdb`; nochmals nach `<Prüfordner>/pr99` mit `021038063546299aff411c843cf7f2abb9d971c1`.
2. `reproduktion/prepare-visual-source.mjs <Repo> <lokaler-Katalog> <Prüfordner>`: Originalblobs prüfen, nur Größen aus #99 ergänzen, Rund-Prüfquelle lesen.
3. `reproduktion/build-visual-proposals.mjs <Prüfordner>/visual-source.json <lokaler-Katalog> <Prüfordner> [Font-Konfiguration.json]`: native Konvertierung/Passprüfung, einmalige D-Grundgestaltung, D4 fest reserviert. Ohne Font-Konfiguration werden die Schriftquellen konvertiert.
4. `reproduktion/visual-server.mjs <Prüfordner>`: lokale Vorschau auf 127.0.0.1:8192.
5. `reproduktion/capture-visuals.mjs <Prüfordner> <lokaler-Katalog>`: Bilder und Pixelvergleich. Wiederverwendung nur bei derselben Größe/Design-ID; für geänderte Quellstände neuen Prüfordner verwenden.
6. `apply-visual-proposals.mjs <Entwurfsordner> <Prüfordner>/visual-source.json <Prüfordner>/visual-proposals.json <Prüfordner>/browser-captures.json`; referenzierte Bilder nach `<Entwurfsordner>/bilder/` kopieren. `reproduktion/check-contact.mjs <Entwurfsordner>` prüft die Galerie und erzeugt Kontaktbögen.

Die Quelllesung, Vorschlagsbildung, Browseraufnahme und Galerieprüfung wurden ausgeführt; die portablen Skriptfassungen zusätzlich syntaktisch geprüft. Kein App-Code geändert, deshalb kein wiederholter Konfigurator-Vollauf. Nächster Schritt: Bildabnahme mit Chris, Quellenlücken mit Claude auf Issue #48, anschließend aktueller Shopify-Leseabgleich und konkrete Artikelentwürfe.
