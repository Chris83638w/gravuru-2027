# Edelstahl-Türschilder: ein Artikel je Form und Größe

> **Aktueller Stand: [Bildauswahl mit 72 verschiedenen D-Grundgestaltungen und acht offenen Plätzen](BILDAUSWAHL-STAND.md).** Chris hat D4 ausdrücklich mit „versetzt“ bestätigt. Die nachfolgende erste Text-/Quellenbestandsaufnahme mit 42 Vorschlägen bleibt als historische Herleitung erhalten; ihre damaligen Zähler und offenen Punkte sind durch den neuen Bildbericht ersetzt. Die verlinkten JSON-/CSV-/HTML-Artefakte enthalten bereits den neuen Stand.

01.11.2026 · Astra · redaktioneller Entwurf, keine Shopify- oder Live-Änderung.

Chris hat den bisherigen N39-Shopify-Zuschnitt ersetzt: **genau ein Artikel je Form und Größe**, keine zusätzlichen Artikel je Unterkategorie. Dazu eigene SEO-Texte und Bildangaben. Anschließend: **„kein design kommt doppelt. 8x3,5 machst du mit dem strich design“**. Die Entscheidungen stehen in [Issue #48](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6558386752).

Die neue Vorgabe gilt für Startgestaltung und Titelbild der Artikel. Die passende freigegebene Designauswahl im Konfigurator bleibt verfügbar. D4 pauschal auf allen Artikelstartseiten wäre jetzt falsch. Das Aussehen des freigegebenen Masters wird nicht geändert. Nur Edelstahl; keine Funkklingeln, Acryl- oder Gedenktafeln.

## Ergebnis zur Prüfung

| Inhalt | Stand |
|---|---|
| Artikelzeilen | 80, jede tatsächliche Form-/Größenkombination genau einmal |
| Titel, URL-Vorschlag, SEO-Titel, Meta-Beschreibung | Je 80; keine identischen Werte innerhalb des Pakets |
| Untertitel, Stichpunkte, Beschreibung | Je Artikel; HTML mit neun kurzen Abschnitten |
| Maße, Material, Grundpreis, Befestigungen | Aus Katalog übernommen, Preise in Cent; keine offene Grundpreiszeile |
| Startdesign-Vorschläge | 42 unterschiedliche Katalognamen; noch kein visueller Dublettennachweis |
| Noch ohne Startdesign-Vorschlag | 38; Größen-/Rund-Anschluss auf dieser Basis offen |
| Bildplanung | 240 Bildplätze: Front, Materialdetail, Maßbild; noch 0 Bilddateien geprüft/geliefert |
| Vorhandene Katalogbindungen | 104 Altreferenzen, für 35 neue Artikelgrößen Kandidaten vorhanden |
| Shopify-IDs, SKU, CustomizationID | Keine erfunden; neue Zielfelder absichtlich null |
| Schreibzugriffe, Import, Merge, Live | 0 |

Dateien:

- [Artikelübersicht als CSV](artikel-uebersicht.csv): 80 Zeilen zur Abstimmung.
- [Vollständige Text- und Bildentwürfe](artikel-entwuerfe.json): Texte, Preisquellen, Befestigungen, alte Bindungskandidaten, offener Status.
- [Lesbare lokale Textvorschau](seo-vorschau.html): HTML herunterladen/öffnen; keine Shop- oder Bildvorschau.
- [Quellenprüfung und offene Größen](pruefung.json).
- [Offline-Generator](build-drafts.mjs) und [Quellleser](read-catalog.mjs): keine Shopify-API und keine Importfunktion.

## Verbindliche Quelle und Grenzen

Codebasis `b3b0886ad26f95fe374c2e54651b79b118cb444a`, Katalog `c8356aa27de5340b8dcd647e6454bd2852232bdb`. Familienquelle `familien/edelstahl/steel-door-signs.json`, Linie `linien/edelstahl-tuerschilder.json`, vorhandene Edelstahl-Master unter `designs/`. Blob-IDs stehen im Prüfbericht und bei jedem Designvorschlag. Geometrie, Preise, Kennungen und Freigaben wurden nicht geändert. Für spätere Designarbeit gilt der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/c8356aa27de5340b8dcd647e6454bd2852232bdb/designs/DESIGN-MASTER.md).

Die Rohdateien enthalten 737 Edelstahl-Designs, davon 715 mit gesetztem Stahl-Zielfreigabe-Flag. Das ist **keine** nachgeladene Werkstatt-/Kundengalerie-Zählung und ersetzt nicht Claudes gemeldete 714. Der Generator prüft vorhandene Größen mit `assignTargetSeries` des aktuellen Codes. Er macht **keine** neue Glyphen-, Kontur- oder Produktionsabnahme. 42 belegte Vorschlagszeilen sind deshalb ebenfalls keine Zusage 42 verkaufsfertiger Artikel.

Einige alte Verkaufsbezeichnungen sind gerundet: etwa 7 × 2 cm bei 70 × 23,3 mm, 8 × 5 cm bei 80 × 53,3 mm und 30 × 16 cm bei 300 × 159,9 mm. Der Entwurf verwendet die tatsächlichen Katalogmaße, behält die alte Bezeichnung zusätzlich in `catalogLabel` und der CSV. Keine Geometrie oder stabile Kennung umbenannt. Vor Übertragung sind die sichtbaren Maßtexte gegen die freigegebene Verkaufsbenennung zu prüfen.

## 8 × 3,5 cm und keine doppelten Startdesigns

Für `GR-ES-RE-80X35-T15` ist **`TRE-V2A-8x3,5-D4` – „Zwei Zeilen, versetzt mit Linie“** reserviert. Die aktuelle Quelle enthält „Familie“ und „Hoffmann“ in Michroma mit langer Linie. Dies entspricht der zuletzt von Claude benannten versetzten Bestseller-Fassung. Chris hat jetzt „Strich-Design“ gesagt; **D4 ist die daraus und aus dem vorherigen Auftrag abgeleitete konkrete Fassung**, keine neue Freigabe. D3 („Zwei Zeilen mit Trennlinie“, mittig) existiert daneben.

Der Generator reserviert D4 nur für diesen Artikel und verteilt weitere Vorschläge ohne wiederholte normalisierte Designnamen. Er bevorzugt bestehende Formatzuordnungen und echte Mastermaße. **Verschiedene IDs oder Namen allein beweisen keine unterschiedlichen Designs.** Vor Artikelanlage ist daher ein Kontaktbogen aller 80 Startbilder nötig: ähnliche Varianten und formübertragene Kopien derselben Gestaltung gemeinsam prüfen; nur unterschiedliche freigegebene Gestaltungen als Artikelstart übernehmen. Die jetzt vorgeschlagenen 42 Namen sind eine Vorauswahl, keine von Chris getroffene Bildauswahl.

## SEO und Bilder vollständig bis zur Veröffentlichung verfolgen

| Feld/Prüfung | Vorbereitung hier | Vor Import/Veröffentlichung erforderlich |
|---|---|---|
| Produkttitel und H1 | Material, Form, tatsächliche Größe | H1 genau einmal im Theme, keine internen Projektzusätze |
| SEO-Titel/Meta | 80 individuelle Werte, alle Titel ≤ 60 und Beschreibungen ≤ 160 Zeichen | Darstellung prüfen; Zeichenbudget ist Redaktionsziel, keine Google-Garantie |
| Produktbeschreibung | Neun Abschnitte, Untertitel und Stichpunkte | Nach bestätigtem Startbild passende individuelle Designbeschreibung ergänzen; keine erfundenen Eigenschaften |
| URL/Handles | 80 eindeutige Vorschläge im Paket | Gegen aktuellen Shopify-Bestand prüfen; bestehende URLs/IDs nicht blind ersetzen |
| Bilder | Pro Artikel Front, Detail, Maße mit Dateinamen | Echte Kontur/Größe und endgültiges Design, keine Bediengriffe, keine gespiegelten oder verzerrten Motive |
| Alt-Text | Bildbezogene Entwürfe; Hauptbild bei offenem Design null | An jeder tatsächlichen Bilddatei prüfen; keine Keywordliste und keine unzutreffenden Bilddetails |
| Bildbeschreibung | Getrennte Entwürfe für Bildunterschriften | Nur verwenden, wenn das Bild den beschriebenen Inhalt zeigt |
| Bildtechnik | WebP-Dateinamen vorgesehen | Originale erhalten; visuell verlustfreie Qualität prüfen, responsive Größen, Abmessungen gegen Layoutsprünge, Hauptbild zügig laden |
| Befestigungsbilder | Quellenoptionen je Größe vorhanden | Nur angebotene Befestigungen zeigen; nicht enthaltene Teile nicht als Lieferumfang darstellen |
| Kategorien/Verlinkung | Vorschlag „Edelstahl-Türschilder“ und sachliche Tags | Bestehende Collection-IDs/Regeln prüfen; Kategorien dürfen dieselben Artikel verlinken, nicht nochmals erzeugen |
| Technisches SEO | Prüfumfang dokumentiert | Eigene Seiten-URL/Canonical, Breadcrumbs, Sitemap, erreichbare Bilder, keine Entwurfsseiten im Index |
| Produktdaten für Suchmaschinen | Keine erfundenen Angebote/IDs | Product/Offer aus echten Varianten mit echtem Preis, EUR, Verfügbarkeit, URL und Medien; ggf. ProductGroup für zusammengehörige Größen korrekt abbilden |
| Rechtliche/geschäftliche Texte | Keine neuen Versprechen | Bestehende freigegebene Angaben zu Versand, Lieferzeit, Material, Montage und Sicherheit übernehmen; keine Bewertungen, GTIN, Garantien oder Wetterfestigkeit erfinden |

Die Entwürfe sind keine Keyword-Volumenanalyse und kein Rankingversprechen. Verwendet wurden die Produktbegriffe und belegten Merkmale. Keine Matrixify-Datei als validiert bezeichnet: Die im historischen Paket G genannten gravuru-Matrixify-Skills waren in diesem Lauf nicht verfügbar; Metafeldschlüssel, Assembler und Importspalten sind erst im passenden Übertragungspaket gegen den realen Shop-Vertrag zu prüfen.

Aktuell geprüfte Primärquellen: [Google Bild-SEO](https://developers.google.com/search/docs/appearance/google-images), [Google Seitentitel](https://developers.google.com/search/docs/appearance/title-link), [Shopify SEO-Felder](https://help.shopify.com/en/manual/promoting-marketing/seo/adding-keywords), [Google Produktvarianten](https://developers.google.com/search/docs/appearance/structured-data/product-variants). Alt-Texte beschreiben das sichtbare Bild; Titel sind verständlich und unterscheidbar. Bilder als echte HTML-Bildelemente einbinden. Mehrseitige Größenangebote müssen in ihren strukturierten Daten zu den sichtbaren Produkten passen.

## Anschluss an den Master und bestehende Artikel

Jeder Artikel benötigt eine eindeutige Bindung aus `familyId + sizeKey + startDesignId`. Der Einstieg muss genau seine Form, Größe und das gewählte Startdesign öffnen, mit K00 als Startbefestigung. Der bestehende pauschale N39-Start AB 12 × 8 cm darf die Einzelartikelgröße nicht überschreiben. Die Master-Oberfläche bleibt gleich. Ein Größen-/Formwechsel muss zur dazugehörigen Artikel-/Variantenbindung und zum richtigen Preis führen; Texte/Fotos gemäß bestehender Erhaltungsregeln, Warenkorb und Wiederbearbeitung sind dabei zu prüfen.

Die 104 alten Katalog-Hauptprodukte sind nur Referenzen. Bei mehreren Altartikeln derselben Größe entscheidet der Abgleich, welcher vorhandene Artikel weitergeführt wird oder ob ein neuer Entwurf notwendig ist. Keine alten Artikel löschen, keine bisherigen Bestellbindungen verändern. Redirects erst für ausdrücklich abgelöste URLs anhand einer geprüften 1:1-Zuordnung. Historischer Shopify-Export vom 23.10. ist kein aktueller Dublettennachweis.

## Offene Arbeit für Claude/Astra

1. **Quellen anschließen:** [Code-PR #106](https://github.com/Chris83638w/gravuru-2027/pull/106) und [Katalog-PR #99](https://github.com/Chris83638w/gravuru-katalog./pull/99) waren beim aktuellen Nachlesen noch offene Entwürfe. Sie bearbeiten die Größenlücken bereits; nichts doppelt bauen. Rund stammt in der anderen Prüfkopie aus Katalog-PR #12 und ist nicht Bestandteil des hier geprüften `main`. Die 38 Zeilen im Prüfbericht danach neu auswerten.
2. **Startbilder finalisieren:** Strich-D4 für 8 × 3,5 cm; weitere Gestaltung je Artikel einmal. Originalvergleich, Kontaktbogen und Glyphen-/Konturprüfung für die konkreten Zielgrößen. Keine Freigabe erfinden oder automatisch setzen.
3. **Aktueller Shopify-Leseabgleich:** bestehende IDs, Handles, Medien, SEO-/Metafelder und Variantenzuordnung exportieren. Änderungsplan inklusive Erhalt alter URLs/Bestellbindungen erstellen. Keine pauschale Neuanlage von 80 zusätzlichen Duplikaten.
4. **Bilder und Texte fertig zuordnen:** 240 Plätze sind Bildplanung, keine fertigen Medien. Originale verifizieren; Titelbild-Alttexte erst nach feststehender Gestaltung verwenden. Nicht vorhandene Detailfotos nicht vortäuschen.
5. **80 Einzelartikel vorbereiten:** Größenbindung und Preisvertrag im Master, passende freigegebene Designliste, Preview/DRAFT und Screenshots Desktop/iPhone. Keinen alten N39-Sammelproduktimport verwenden.
6. **Abnahme des Kundenwegs:** Artikeleinstieg, Form/Größe, Designwechsel, Befestigung, Texte, Warenkorbpreis, Bild, Bearbeiten-Link und Rückweg. Danach erst kontrollierte Veröffentlichung gemäß aktueller Freigabe. Dieser PR führt keinen dieser Live-Schritte aus.

## Reproduktion und Prüfung

Im Code-Repo auf der genannten Basis, mit dem privaten Katalog-Checkout und einem eigenen temporären Ausgabeordner:

```powershell
node docs/handoffs/2026-11-01-edelstahl-einzelartikel/read-catalog.mjs <Katalog-Checkout> <Quell-Ausgabeordner> c8356aa27de5340b8dcd647e6454bd2852232bdb
node docs/handoffs/2026-11-01-edelstahl-einzelartikel/build-drafts.mjs <Quell-Ausgabeordner>/catalog-source.json <Entwurfs-Ausgabeordner>
```

Der Leser holt ggf. fehlende Git-Objekte, ändert aber keine Katalogdatei/Referenz. Der Generator schreibt ausschließlich die vier benannten Ergebnisdateien in seinen Ausgabeordner. Ein bestehender solcher Entwurf wird dabei ersetzt; deshalb für Vergleiche einen separaten Ordner verwenden.

Prüfungen: 80/80 Größen vorhanden; Kunde-Form plus reale Maße eindeutig; 80 eindeutige Titel/Handles/Metas; 42 Vorschläge mit unterschiedlichen Namen; 8 × 3,5 cm genau D4; alle Preise/Befestigungen aus der Familie; keine erfundene Ziel-ID; alle Bildplätze ausdrücklich ungeprüft. LF und Git-Diff separat geprüft. Keine App-Quelldatei verändert; deshalb kein erneuter Vollauf bereits geprüfter Konfigurator-Tests.
