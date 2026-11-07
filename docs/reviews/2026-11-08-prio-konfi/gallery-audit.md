# Prüfung: Prio-Konfi R15, Galerie und Edelstahl-Pilot

Stand 08.11.2026. Ausschließlich Quellcode, Git-Metadaten und GitHub-Übergaben gelesen; keine neuen Tests, Browser-, Server- oder Shopaktionen. Historische Abnahmen werden unten als solche bezeichnet. Einziger eigener Schreibvorgang: dieser Bericht.

**Verbindliche neue Zuständigkeit:** R15 ist die vom Nutzer bestimmte Konfi-Basis. Gemeinsame Kern-/UI-Änderungen ausschließlich durch Mika nach Nutzerabstimmung. Andere KIs dürfen nur vorher bestätigte produktspezifische Ausführungsdaten pflegen. Erster neuer Pilot: Edelstahl-Türschilder mit Form, Größe, Befestigung; alle vorhandenen Edelstahlformen berücksichtigen. Konkrete Größen, Preise und Befestigungen vor Anlage bestätigen lassen. Keine Designs automatisch neu erfinden.

## Ergebnis und entscheidende Grenzen

Der native Weg **Galerie → vollständiger Editor → dieselbe Galerievorlage** ist vorhanden. Produktgruppen mit bestätigtem Anlageplan und ein geschützter Update-Sync sind ebenfalls gebaut. **Die R15-Oberfläche ist noch nicht an diesen Galerie-/Shopweg angeschlossen.** Eine neue Konfi-Entwicklung ist dafür nicht nötig; nötig ist die geprüfte Integration der vorhandenen R15-Shell mit den bestehenden privaten und öffentlichen Verträgen.

1. R15 ist aktuell ein statisches, getrenntes Testpaket. Der Builder setzt `checkout:false`, `reviewOnly:true`, `orderEnabled:false`, entfernt echte Varianten-IDs und setzt `GravuruShopEntry=null`. Galerie-„Bearbeiten“ öffnet weiterhin `/editor.html` ohne R15-Installation. Das ist keine fertig kaufbare universelle R15-Anbindung.
2. Ein echter **Edelstahl-Andenken-Entwurf existiert bereits**: Shopify `16196606001532`, native Gruppe `cfg_95f1e9be-0a63-4168-8cbe-d19b789546a5` R1. Nicht erneut anlegen. Er ist ein anderer fachlicher Umfang als der jetzt gewünschte Türschild-Pilot.
3. Der bestehende Sync akzeptiert ausdrücklich nur das jeweilige **Startdesign**. Ein Shopprodukt mit vier Designs/vier Bildern wird damit noch nicht vollständig synchronisiert. Nebenentwürfe brauchen ihre eigene eindeutige Medienzuordnung; sie dürfen nicht still zum Hauptbild werden.
4. Astras neuere Design→Familienzuordnung ist bereits in PR194 gebaut und auf dem Host vorbereitet. Kein zweiter Adapter nötig. Online-Aktivierung und tatsächliche neue Chrome-Abnahme sind laut letzter Übergabe offen.
5. R15 und PR194 haben unterschiedliche Speicherstände: R15 verwendet V5 mit gemeinsamen Ressourcen; PR194 verwendet noch V4. Dateien oder Datenbanken dürfen nicht ungeprüft gegeneinander ausgetauscht werden.

## Gelesene Stände

| Teil | Gepinnter Stand / Aussage |
|---|---|
| Offizielle R15-Basis | Code `157d0da290993628dd9db9aa82ddb0708bad182f`; aktuelle Dokumentation/HEAD `863b7fd3f6121714ca2b693ffa092ae2edb4944b`, `dev/mika-mobile-demo-20261107`, Draft193. |
| Galerie-Rückspeicherung | `f8e55358272fe9fabdb29de7db15c6592f2cfecc`, Draft184; vollständiger R12-Editor und Materialadapter integriert. |
| Verwaltung und Sync | `fa48154232816c8a31768107208231d5c190e574`, Draft185; zusätzliche Identitäts-/Leistungskorrekturen `3ad2cdc3947db211c1c5864c3acb8faa1883fa62`. Beide in R15 enthalten. |
| [Code-PR187](https://github.com/Chris83638w/gravuru-2027/pull/187) | Offener Draft, HEAD `6b799d9a79c789d097c970c6283cd4369d02f97b`: Navigation/Schnellbearbeitung, nicht der neueste Galeriegesamtstand. Historischer privater Online-Beleg vorhanden. |
| [Katalog-PR183](https://github.com/Chris83638w/gravuru-katalog./pull/183) | Offen, ungemergt, `c1c389ca53bd3677be74c50ffe86e172e363397d`: 28 Originale, 73 Rohlinge, 146 Formatvorschauen. Pilotlieferung, nicht alle Edelstahlformen mit freigegebenem Originaldesign. |
| [Tatsächlicher Shop-Pilot, PR191](https://github.com/Chris83638w/gravuru-2027/blob/536d9a891b7bfdee2bda20415e77b550264a873b/docs/handoffs/2026-11-07-andenken-shop-pilot-astra.md) | `536d9a891b7bfdee2bda20415e77b550264a873b`: vier Andenkendesigns auf 50×20×1,5 mm, fünf echte Variantenbindungen, vier READY-Medien, DRAFT/unveröffentlicht. |
| [Neueste Übergabe in #168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6710614014) / [PR194](https://github.com/Chris83638w/gravuru-2027/pull/194) | `d689044b19ce922ef8a410342b7f7b839216935b`, Runtime `01c3da9a33249eba2600079d689b5b1769f88f7e`: 19.661 Karten mit Bild, 6.623 teilweise/vollständig nativ bearbeitbar, 13.038 offen, 51.259 vorbereitete Ziele. Host-STAGE fertig; aktive Galerie laut Übergabe weiterhin 462 Karten. Keine neue Hostprüfung durch diesen Audit. |

## Vollständige Formenquelle für den neuen Türschild-Piloten

Maßgeblich: [Katalog `familien/edelstahl/steel-door-signs.json`](https://github.com/Chris83638w/gravuru-katalog./blob/c1c389ca53bd3677be74c50ffe86e172e363397d/familien/edelstahl/steel-door-signs.json#L15). Beim heutigen lesenden Abruf ist diese Datei auf Katalog-main bytegleich: Git-Blob `2e046d4a26bb524cfb15efad1b281ba316a7f0ea`.

| Kennung | Vorhandene Form | Größen im Katalog |
|---|---|---:|
| RE | Rechteck | 27 |
| AB | Abgerundete Ecken R5 | 10 |
| QU | Quadrat | 7 |
| OV | Oval | 10 |
| EL | Ellipse | 7 |
| R | Rund | 5 |
| RT1 | Retro 1, eckig | 7 |
| RT2 | Retro 2, geschwungen | 7 |
| **Summe** | **8 Formen** | **80 Größen** |

**Nicht die ältere gebündelte Datei als Gesamtbestand verwenden:** `app/designs/steel-door-signs/family.json` im R15-Baum hat nur fünf Formen/61 Größen; Rund und Retro fehlen dort. Die native Engine kann Freiformkonturen/`outlinePath`/`holesMm` bereits verarbeiten (`app/workshop/product-families.mjs`). Die vollständige geprüfte Katalogfamilie muss als Datenquelle dienen, ohne UI-Neubau oder erfundene Geometrie.

PR183 lässt Retro 2 ausdrücklich aus, weil dort kein freigegebenes Pilot-Original gefunden wurde. Das bedeutet nicht, dass die Form fehlt. Für den neuen Pilot alle acht Formen in die Angebots-/Prüfmatrix aufnehmen; fehlende passende Originale offen markieren. 80 Kataloggrößen sind weder 80 automatisch bestätigte Verkaufsangebote noch eine Freigabe sämtlicher Preis-/Befestigungskombinationen. Historische AA/AS-Familien mit 5 mm sind außerdem nicht die neueren Schwarz-/Anthrazitfamilien mit 3 mm.

## Gebaut und tatsächlich noch abzunehmen

| Funktion | Vorhandener Vertrag | Offene Abnahme / Grenze |
|---|---|---|
| Originalbogen → editierbare Vorlage | Lieferform 2 mit Text-, Motiv-/Dekoelementen und Originaldateien; `katalog-convert.mjs`, `design-review-targets.mjs`; keine reduzierte Gesamtbild-Attrappe. | Offene Originale, unklare Schriften/Glyphen und fehlende native Ziele bleiben offen. Eine Katalogvorschau ist keine native oder Fertigungsfreigabe. |
| Speichern in dieselbe Galerievorlage | `app/workshop/gallery-editor.mjs:29–48,90–163`, `variant-m/gallery-workbench.mjs`, `scripts/lib/gallery-editor-http.mjs`; feste cfg-/Design-/Original-ID, Material/Größe, erwartete Produktrevision. Andere Designs bleiben erhalten; No-op erzeugt keine Revision. | R15-Shell privat integrieren und exakt diesen Vertrag erneut prüfen. Der Werkstatt-Prüfstand ist weiterhin ein anderer Speicherzweck. |
| Fotos/Masken | `gallery-photo-media.mjs`: Original, bearbeitete Fassung, erneute Bearbeitungsquelle/Rezept und Originalmaske dauerhaft; keine blob-/Sessionreferenz als Galeriequelle. | Neuer R15-Integrationslauf: Upload, erneuter Zuschnitt, Speichern, Neuöffnen, neue Vorschau und alte Revision; kein Browserentwurf darf die Serverquelle ersetzen. |
| Neue Logos in Galerievorlagen | Kunden-Logoeditor mit geprüfter SVG-Schwarzfassung existiert (`variant-m/logo-upload.mjs`); vorhandene native Kataloggrafiken werden erhalten. | **Galerie-Saveback für neue Logo-Uploads fehlt:** `variant-m/gallery-workbench.mjs:55` weist Uploads außerhalb `photoSlot` zurück; serverseitig ist transienter `image`-Typ nicht zugelassen. Die früheren Stahl-/Hund-Prüfprofile hatten Logo deaktiviert, deshalb beweisen deren bestandene Tests keinen Logo-Roundtrip. Für aktivierte Profile original SVG/Raster, geprüfte Fassung, `svg-black-v1`-Hashes und erneutes Ersetzen nativ anbinden; nicht als beliebiges Motiv umetikettieren. |
| Freigabe | `scripts/lib/design-review-approvals.mjs`; Fingerprint bindet das gespeicherte Design, Ressourcen und Darstellung. Geänderte Vorlage erneut prüfen. | Nicht auf andere Materialien/Größen vererben; Teilabnahme nicht als Freigabe der gesamten Originalfamilie ausgeben. |
| Design → Familie/Format | PR194 `app/workshop/gallery-design-assignments.mjs:93–161`; vorhandene Zielauswahl, native Vorschau, atomare Registrierung, Neustartwiederherstellung aus R1, vorhandene Ziele unangetastet. | Noch nicht im R15-Branch integriert/online abgenommen. Gleiche Maße bewahren Objekte, andere Maße verwenden proportionale native Einpassung. Neue Ziele ausdrücklich ungeprüft. |
| Gruppe und Optionen | `app/workshop/product-group-templates.mjs`: versionierte Vorlagen; alle vorhandenen Optionsgruppen/Zusatzfelder; Bestätigung an exakten Plan, Template-/Quellrevision und Materialangebot gebunden; letzte Prüfung in echter Importtransaktion. | Erstellt **lokale native Entwürfe**, keine Shopify-Produkte. Einschränkungen alter Mehrformatmodelle werden bewusst blockiert, wenn ihr Formatadapter sie sonst übergehen würde (`:128–137`). Kein universeller neuer Optionstyp ohne Anschluss. |
| Shopify-Erstanlage | `app/workshop/shop-draft-transfer.mjs`; Journal/Reservierung und Wiederaufnahme vorhanden. PR191 belegt eine echte unveröffentlichte Pilotanlage. | Neuer Türschild-Pilot benötigt seinen bestätigten Umfang und eindeutigen Erstanschluss; vorhandenen Andenken-Piloten nicht duplizieren. |
| Bestehende Produkte synchronisieren | `gallery-shop-sync*.mjs`, `scripts/lib/gallery-shop-connection.mjs`; Plan, Quellfreigabe, Revision-/Remotevergleich, eigenes Journal, gezielte Medienupdates, Bestellhistorie unverändert. | Host verdrahtet noch keinen dauerhaften `management.synchronizer`; Storekontext, ID-Registry, signierte HTTPS-Bildroute und echte Ende-zu-Ende-Abnahme offen. Default-Schreibschalter aus. |

## Präzise Anschlussrisiken

- **Identität:** Original-ID darf nicht aus einem bereinigten Native-Slug zurückgeraten werden (`TRE-V2A-8x3,5-D1` ist ein belegter Fall). Zusammen festhalten: Original-/Quellkennung, cfg, native Design-ID, Materialfamilie, echte Größe, Revision. Die Gesamtlieferung enthält zusätzliche quellengebundene IDs bei historisch mehrfach verwendeten Designnummern.
- **Konflikte:** Galerie speichert gegen die Revision der gesamten Produktgruppe. Zwei Änderungen an unterschiedlichen Designs können deshalb trotzdem einen Konflikt erzeugen; das ist Schutz, kein Auftrag zur stillen Zusammenführung. Ein einmal geplanter Sync muss Quelle, Angebot, Bindung und Remotezustand erneut prüfen.
- **Startbild und Nebenentwürfe:** `app/workshop/gallery-shop-sync-native.mjs:132` blockiert Nicht-Startdesigns; `gallery-shop-sync.mjs:57` blockiert mehrere Ziele desselben Shopprodukts in einem Plan. Der vierdesignige Andenken-Pilot ist daher noch kein Beleg für kompletten Galerieabgleich. Ein Medienvertrag muss pro Bild die betreffende Design-ID und Kunden-Starteinstieg eindeutig festlegen.
- **Erstfreigabe:** `gallery-shop-sync-activation.mjs:21` erwartet vorhandene Katalog-Verkaufsfreigabe. PR191 hat bewusst keine `catalog_live_order_approvals`, keinen geprüften Shop→Konfi→Warenkorbweg und keine belegte `store_id`. Diese Schutzstufe nicht umgehen, um einen grünen Sync-Test zu erhalten.
- **Logo-Betriebsart:** Der echte Vektorlogo-Kundenweg fordert `/api/workshop/customer-vector-logo/preview`, Produkt-/Revisionsbindung und Hashprüfung (`logo-upload.mjs:23–32`). Die statische R15-Demo kann diesen Serverweg nicht durch das bloße Sichtbarmachen eines Buttons liefern. Logoaktivierung ist produktbezogen festzulegen; die gemeinsame Bearbeitung bleibt Mikas Zuständigkeit.
  Der vorhandene gemeinsame Türschild-Formatadapter aktiviert SVG-Logos für `steel-door-signs` (`katalog-family-formats.mjs:113–115`, historisch bestätigter Aufpreis 1299 Cent). Die ältere Einzelprodukt-Erzeugung startet dagegen mit `logo.enabled:false` (`product-families.mjs:261`). Dieser Unterschied muss im konkreten Pilotprofil ausdrücklich geprüft werden; die neuen Vorgaben Form/Größe/Befestigung ersetzen keine solche Profilprüfung.
- **Material-/Formatwechsel:** Der Update-Sync blockiert abweichende Geometrie, Materialvariante/Stärke/Familie und Fertigungsverfahren (`gallery-shop-sync-native.mjs:135–150`). Familienzuordnung und neue Sichtprüfung müssen davor stattfinden. Direkte pauschale Koordinatenübernahme kann Text, Lochabstände, Konturen, Fotozuschnitte und Bearbeitungsrechte falsch abbilden.
- **Gemeinsame Ressourcen:** R15 enthält `product-document-resources.mjs` und Browser-Lazyressourcen. Byteidentische vollständige Fonts/Grundplatten können gemeinsam referenziert werden; reale Form, Millimetermaße, Löcher und Produktrevision bleiben eigenständig. 22×14 und 30×20 haben unterschiedliche Seitenverhältnisse und tatsächlich verschiedene Bilder. Ein Grundplattenbild ersetzt keine Geometriequelle.
- **Zwei Entwicklungsstränge:** R15 `repository.mjs:39` unterstützt V5; PR194 dieselbe Stelle nur V4. PR194 ergänzt unter anderem Assignment-Lesen im Repository. Bei Zusammenführung müssen **beide** Funktionen samt direkten SQL-Lesern, unveränderten Dokumenthashes, gemeinsamen Ressourcen und begrenzten Abrufen erhalten bleiben. Keine ältere Runtime auf kompakte V5-Daten setzen.

## Empfohlener Ablauf ohne Doppelarbeit

1. **R15 einfrieren und Zuständigkeit festhalten.** Unveränderlichen Quell-/Paketstand als gemeinsame UI-Basis; private Galerie und Kundenbestellung als unterschiedliche Betriebsarten derselben Engine anschließen. Der statische Demo-Builder darf nicht zum Produktions-Produktimport umgedeutet werden.
2. **Vorhandenes Original wählen.** Gepinnter Katalogbogen/Original-ID, echte Ressourcen und aktueller gespeicherter Galeriequellstand. Bei Bearbeitung dieselbe Vorlage speichern; Quellenfehler offen melden, keine neuen Designs erzeugen.
3. **Gruppe, passende Designs und Startdesign bestimmen.** Für Edelstahl alle acht Formen berücksichtigen; je Form reale Kataloggrößen. Zielgruppe und Fotozustand filtern. Jede Shop-Hauptbild-/Konfi-Startdesignzuordnung ausdrücklich speichern; keine Nebenentwürfe als neuen Standard einschleusen.
4. **Form-/Größenziele über Astras bestehenden Adapter vorbereiten.** Vorhandene Ziele wiederverwenden, neue Ziele proportional/native prüfen. Erst Vorschau, dann eigene konkrete Material-/Formatfreigabe. R15-Saveback mit Fotos/Masken und Konfliktfall abnehmen.
5. **Konkrete Optionen bestätigen lassen.** Vollständige Matrix Form → Größe → zulässige Befestigungen → Preis/Aufpreis → Default/Abhängigkeiten vorlegen. Angebotsauswahl/Quellrevision an Bestätigung binden. Danach lokale native Entwürfe idempotent anlegen; keine pauschale Übernahme der Schieferregeln.
6. **Shopify-DRAFT einmalig erstellen bzw. bestehendes Ziel binden.** Serverseitigen Shopkontext, Produkt-/Varianten-/Medien-IDs und erwartete Preise rücklesen. Den bestehenden Andenken-Piloten nur für seine konkrete Anschlussprüfung verwenden; neuen Türschildumfang getrennt halten.
7. **R15 → Testwarenkorb → Bestell-/Produktionsstand prüfen.** Passendes Hauptbild öffnet richtiges Startdesign; Form, Größe, Optionen und Preis bleiben konsistent. Historische Bestellung an unveränderliche Design-/Medien-/Profilrevision binden. Erst danach Verkaufsfreigabe, keine automatische Live-Veröffentlichung.
8. **Spätere Änderungen bewusst synchronisieren.** Galerie speichern → konkrete neue Sichtfreigabe → Vorher/Nachher-Plan → gezieltes Übertragen → vollständiges Rücklesen. Unklare Shopify-Antwort nur abgleichen, nicht blind erneut senden. Nebenentwurfs-/Mehrformat-Sync vorher ausdrücklich ergänzen und prüfen.

## Minimale sichere Übernahme auf main

Lesend verifiziert: lokales `origin/main` = `207c0c7e5cb628b70c7df051202e16afa4f6c004`. R15-HEAD liegt **123 Commits / 805 geänderte Dateien** darüber (244 app, 135 scripts, 34 ops, 382 docs, 8 tools, 1 designs, STATUS). Ein Gesamtmerge ist somit keine reine R15-Oberflächenübernahme und würde umfangreiche Galerie-, Speicher-, Bestell- und Syncarbeiten mitnehmen.

**Sofort klein und sicher möglich:** Auf main die verbindliche R15-Referenz, Quellcommit/Pakethash, Zuständigkeit und getrennten Integrationsplan dokumentieren. Das wäre eine offizielle Basisfestlegung, ausdrücklich noch keine ausführbare Runtimeübernahme. Dieser Audit hat auch das nicht geschrieben.

**Für echte R15-Quelldateien auf main:** Separaten Integrations-PR vom aktuellen main erstellen, nur benötigte Shellmodule/Assets und ihren nachgewiesenen nativen Abhängigkeitsstand übernehmen. `demo.mjs` ruft native Hooks auf; `edge-resize.mjs` importiert native Kontur-/Schriftmessung, der Builder verwendet den echten Editorbundle. Deshalb ist weder nur der letzte CSS-Commit `157d0da2` noch unbesehen allein der Ordner `mobile-demo/` ein belegter vollständiger Port. Welche nativen Dateien minimal erforderlich sind, muss per Abhängigkeits- und Vertragsprüfung im Kandidaten belegt werden. Die heutigen 38 R15-Tests belegen nicht einen unbekannten main-Port.

Galerie-/V5-/PR194-Integration separat prüfen und nicht als Nebenwirkung der UI-Promotion einschleusen. Falls stattdessen der gesamte bestehende Branch als Runtimebasis übernommen werden soll, den tatsächlichen erweiterten Umfang offen benennen und dessen Abnahme durchführen. Main-Änderung, Hostbereitstellung und Shopfreigabe bleiben getrennte Aktionen; die neue Main-Autorisierung ist kein Auftrag für Server- oder Shopwrites.

## Nachweisorte im lokalen R15-Arbeitsbaum

Basisverzeichnis: `C:/Users/Mikail Erdem/Documents/Codex/2026-11-04/lie/work/konfi-mobile-demo-20261107/`.

- `docs/handoffs/2026-11-06-mika-galerie-rueckspeicherung.md` – historischer vollständiger Saveback einschließlich Foto-/Konflikt-/Rücksprungbelegen.
- `docs/handoffs/2026-11-06-mika-galerie-synchronisierung-und-produktgruppen.md` – Montagevertrag, genaue Grenzen, synthetische Shopprüfung.
- `docs/handoffs/2026-11-07-mika-verwaltung-sync-und-gemeinsame-grundplatten.md` – Identitäts-/Leistungsschutz; Ressourcenabschnitt dort historischer Vorschlag.
- `docs/handoffs/2026-11-07-mika-gemeinsame-grundplatten-und-schriften.md` – später umgesetztes V5, lokale Kopiemigration, 90 bytegleich hydrierbare Revisionen / 236 Vorschauen; kein Nachweis einer bereits migrierten Astra-Hostdatenbank.
- `docs/handoffs/2026-11-07-mobile-demo-r15-ausfuehrung.md` – tatsächlicher R15-Paket-/HTTP-/Browsernachweis; keine echte Bestellung.
- Aktuelle Astra-Fortsetzung: [gepinntes PR194-Handoff](https://github.com/Chris83638w/gravuru-2027/blob/d689044b19ce922ef8a410342b7f7b839216935b/docs/handoffs/2026-11-07-gesamtgalerie-familienzuordnung-astra.md). Seine offenen Aktivierungsfelder nicht durch ältere PR187-Abnahmen ersetzen.

Optimierungsvorschlag zur Abstimmung: eine einzige serverseitig gepflegte Übersicht je Verkaufsangebot mit Original-ID, Designversion, Form/Größe, Startdesign, Optionsbestätigung, Shopbindung und Freigabestatus. Sie soll vorhandene Register zusammenführen, keine zweite Design-/Preisablage schaffen. Nicht umgesetzt.
