# Galerie: Gesamtsicherung, Arbeitsstand und weitere Shop-Verwaltung

Erstellt am 06.11.2026 auf Chris' Auftrag: vor weiterem Ausbau umfassend sichern und zusammenfassen, als Markdown auf GitHub ablegen und eine verlässliche Fortsetzung über Chatgrenzen ermöglichen. Neuer eigener Dokumentationsbranch `dev/astra-galerie-sicherung-sync-20261106`, Ausgangscommit `b2e6857517fa0694887bba3f20c8b2a6099cf5a6`, auf Code-PR #181. Keine Anwendung geändert, keine Shop-Synchronisierung ausgeführt, kein main-Merge und kein Live-Release.

**Fester Einstieg für kommende Chats:** [GALERIE-START-HIER.md](../../GALERIE-START-HIER.md). Dieses Dokument beschreibt den bekannten Stand und die nachgewiesene Sicherung; eine Markdown-Datei allein ist keine Datenbanksicherung.

## 1. Auftrag und verbindliche Entscheidungen

Der anfangs auf Schiefer beschränkte Auftrag wurde ausdrücklich auf **alle Materialien** erweitert. Nach bestandenem Pilot präzisiert Chris: Claude soll **alles Vorhandene aufbereiten – alle Designs, Themen, Größen, Formen, Materialien und die passenden Rohlinge**. Der Pilot normale Edelstahl-Türschilder ist die geprüfte Vorlage für weitere Lieferungen, nicht die endgültige Umfangsgrenze.

- Unsere eigenen Originaldesigns aus der **neuen Katalogstruktur** übernehmen. Passende Originale 1:1 erhalten; keine Neugestaltung aus ähnlichen Beispielen. [Verbindlicher Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).
- Original-IDs und Herkunft erhalten. Gleiche Originale in mehreren Themen referenzieren, statt Kopien anzulegen. Alle tatsächlichen passenden Formate berücksichtigen, keine künstlichen Kombinationen erzeugen.
- Alle Serienanlagen/Übernahmen per Skript, API oder Shell. Wiederholbare Stapel, vollständige Inventare, Prüfsummen und Rücklesevergleiche.
- Fehlende Originalschriften: Chris hat die **dokumentierten Ersatzschriften** erlaubt; verwendeten Ersatz ausdrücklich nachweisen.
- Fotos dort einsetzen, wo die Originalvorlage eine Maske/Fotofläche vorsieht; thematisch passende Beispiele, Original und Bearbeitungsrezept erhalten. Farbe korrekt als Druck behandeln. Die Vorlagen mit gelben Sternen `GTSK-S-30x20-D2` und `D4` wurden als UV-Druck korrigiert.
- Übersicht: **drei Karten nebeneinander**, schnell scrollbar; genau eine Konfi-Version je Original, Formatwahl innerhalb der Karte. Materialübersicht, Themen wie Hunde/Menschen mit/ohne Foto, Türschilder/Hausnummern usw.; Rohlinge separat nach Material/Form/Größe.
- Schnellbearbeitung direkt in der sichtbaren Karte: Text/Element verschieben, speichern, ohne jedes Mal den großen Editor zu laden. Unter „Bearbeiten“ soll der vollständige Konfi mit allen Funktionen öffnen und dieselbe Vorlage speichern.
- Kommentarfeld, Freigabehäkchen je relevantem Designstand, Übersicht bestätigt/offen/geändert/Quelle fehlt. Chris bestätigt die Gestaltung. Änderungen müssen die betroffene Freigabe nachvollziehbar entwerten.
- Chris liefert die vollständige Unterkategorienliste noch. Deshalb derzeit keine belegbare vollständige Sollabdeckung und keine Aussage „alles vorhanden“.
- Eigene Branches und PRs, nicht nach main mergen. Der andere Astra-1-Chat koordiniert main in #139. Kunden-Live ausschließlich nach Chris' ausdrücklichem Satz. Freigabehäkchen ist keine Veröffentlichung.

## 2. Zuständigkeiten und zentrale Links

| Zuständig | Aufgabe / aktueller Anschluss |
| --- | --- |
| Chris | Themen-Sollliste, Sichtprüfung und Designfreigaben, ausdrückliche Live-Freigabe |
| Claude | Vollständigen vorhandenen Katalog automatisiert in prüfbaren Stapeln liefern, Originale/Schriften/Rohlinge/Geometrien und Quellenfehler nachweisen |
| Astra, dieser Chat | Galerie verwalten, Lieferungen prüfen/importieren, native Zielzuordnung, Sortierung, Inline-Bearbeitung, Kommentare/Freigaben, Sicherung und Übergaben |
| Astra Mika | Vollständigen Kunden-Konfi als Betreibereditor anbinden; gezieltes Speichern derselben nativen Vorlage einschließlich Medien/Masken/Rezept, Revision und Rücksprung |
| Astra-1-Chat #139 | Gemeinsamen main-Stand und erlaubte Releases koordinieren |

- [#85: Galerie-/Schiefer-Koordination und letzter Pilotabschluss](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6684155990)
- [#168: vollständiger Mika-Auftrag](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6683765158)
- [#168: fertiger materialfähiger Adapter und Prüfabschluss](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6684148856)
- [Mikas letzter gelesener Zwischenstand: isolierter R12-Anschluss, Rückweg in Arbeit](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6684097836)
- [Code #180: bisherige Galerie](https://github.com/Chris83638w/gravuru-2027/pull/180), [Code #181: Edelstahladapter](https://github.com/Chris83638w/gravuru-2027/pull/181)
- [Katalog #183: geprüfter Pilot](https://github.com/Chris83638w/gravuru-katalog./pull/183), [Claude-Rückmeldung](https://github.com/Chris83638w/gravuru-katalog./pull/183#issuecomment-6684156339)

Die letzte Claude-Nachricht im Chat wurde um den gesamten Bestand erweitert. Dieses Dokument hält diese Erweiterung verbindlich fest; ein früherer GitHub-Kommentar mit „Edelstahl zuerst“ schränkt sie nicht ein.

## 3. Nachgewiesener Stand, sauber getrennt

| Bereich | Stand / Nachweis |
| --- | --- |
| Private Online-Galerie | https://test-2027.gravuru-designwerkstatt.de/originale/ ; Site 19, letzter bereitgestellter Code `76053a2f8e2ed8db31d1daf1219c8f6895998585`; frische Datensicherung am 06.11.2026 bestätigt 325 Originale / 35 Produktgruppen |
| Online-Bedienfunktionen | Drei Karten, Material-/Statusübersicht, direkte Positionsbearbeitung, Kommentare und revisionierte Freigaben vorhanden; 51/51 lesende Hostprüfungen plus Chrome aus vorigem Paket, keine neue Bedienabnahme durch diese Sicherung behauptet |
| Edelstahlpilot | Code `b2e6857517fa0694887bba3f20c8b2a6099cf5a6`; 28 Originale / 73 Rohlinge / 146 passende native Formatstände lokal geprüft; noch kein Edelstahl-Hostimport |
| Kombinierte lokale Prüfung | 353 Originale / 108 Produkte / 261 bearbeitbare Originale / 523 native Ziele / 73 separate Rohlinge; 624 Prüfeinträge inklusive 101 alter offener Quellen |
| Katalogquelle Pilot | `5e0c3f151bbbb9cdae08e0562561014f727b40fe`, Quellbasis `3c6051fbbc7904969948950fae12cae2ae663f30`; bei erneutem Lesen von #183 unverändert und ungemergt |
| Code #181 | Bei Sicherungsbeginn Draft, offen, ungemergt, Kopf `b2e68575`; abhängig von #180 |
| Vollständiger Konfi-Rückweg | Mika arbeitet isoliert daran; R12 auf seinem Prüfzweig angeschlossen, Save-back-Abnahme und Zusammenführung noch offen |
| Spiegelung / Shop-Synchronisierung | In dieser Galerie noch nicht umgesetzt und nicht aktiviert; nachfolgend ein Ausbauvorschlag |

Pilotprüfung: 79 gezielte Node- und 11 Snapshot-Tests bestanden; 500 Dateireferenzen und 101 Versionshashes geprüft. Alle 146 nativen Vorschauen und Freigabe-Fingerprints gültig. Verschieben → Speichern → erneutes Öffnen und identischer Wiederimport erfolgreich; 35 Altprodukte/41 Altrevisionen unverändert. Wiederimport nach Teständerung erhielt 108 Köpfe/115 Revisionen, Kommentare und Freigaben; die spätere Browseränderung erzeugte eine zusätzliche lokale Testrevision. Keine echten Nutzerfreigaben durch Astra.

Details und Bilder: [Edelstahlpilot](2026-11-06-edelstahl-galerie-pilot.md), [Online-Freigaben](2026-11-06-galerie-freigaben.md), [sortierte Schnellgalerie](2026-11-06-schiefer-schnellgalerie-astra.md), [Fotos/Bearbeitung](2026-11-06-schiefer-fotos-bearbeitung-astra.md). Frühere Mengen und Prüfungen sind historische Zwischenstände, nicht zusätzliche heutige Gesamtmengen.

## 4. Datenschnittstelle und was erhalten bleiben muss

Eingang von Claude: Lieferform 2 mit editierbarem SVG/JSON, getrennten Text-/Motiv-/Fotoobjekten, Schrift-/Ressourcenpfaden, Rohlingen, Millimetergeometrie, Original-IDs, Themen und Prüfsummen. Kataloggrößen aus `design.json` und Familienquellen lesen. Preise und Lochgeometrien bleiben an ihre autoritativen Excel-/Katalogquellen gebunden; keine zweite Rechenlogik.

`prepare-steel-review-pilot.mjs` erzeugt `gravuru-design-original-review/v1`. Das ältere `gravuru-slate-original-review/v1` bleibt unterstützt. `extend-design-review.mjs` übernimmt neue Produkte additiv auf einer getrennten Datenkopie. Identische Wiederlieferungen erzeugen keine Duplikate; veränderte Quellen/IDs ergeben Konflikte. Vorhandene Bearbeitungen werden nicht mit einer Katalogbaseline überschrieben.

Die Zielzuordnung enthält Original-ID, Material, Format/sizeKey, Maße, productKey/productId und nativeDesignId. Beispiel: Original `TRE-V2A-8x3,5-D66` wird nativ `katalog-TRE-V2A-8x3-5-D66`; Rückwege dürfen die Original-ID nicht aus dem Slug erraten. Mika muss genau das serverseitig aufgelöste Design mit erwarteter Produktrevision speichern. Bildoriginal, bearbeitete Fassung und Rezept dauerhaft speichern.

Die aktuelle Material-Allowlist unterstützt ausdrücklich Schiefer und Edelstahl. Weitere Materialien dürfen Claude bereits vollständig liefern; ihre nativen Adapter, Geometrien, Darstellung und Freigabe-Fingerprints müssen vor dem Galerieimport jeweils ergänzt und geprüft werden. Das generische Lieferformat allein beweist diese Unterstützung noch nicht.

Kommentare sind unabhängig. Bestätigungen liegen als Ereignisse in `review-approvals.sqlite` und binden an Design, Material/Format, wirksame Ressourcen und Renderer. Änderungen eines anderen Designs derselben Produktgruppe dürfen das OK nicht pauschal entwerten. Historische Katalogfreigaben sind Quelleninformation und werden nicht als neue Galerie-Freigaben übernommen. Bestehende Bestellstände müssen unveränderlich bleiben.

## 5. Sicherung vom 06.11.2026

Die Sicherung erfolgte **vor** einer Implementierung der vorgeschlagenen Shop-Verwaltung. Die Online-Anwendung und ihre Konfiguration wurden nicht umgestellt. Es wurde kein Shopify-Schreibaufruf und keine neue Designfreigabe ausgelöst.

### Tatsächlicher Online-Stand

- Erfassung UTC `2026-11-06T12:07:23.737275+00:00` (Startordner `20261106T120700Z`).
- Serverarchiv: `/var/www/vhosts/gravuru-designwerkstatt.de/private/galerie-gesamtsicherung-20261106T120700Z.tar.gz`.
- Server-Arbeitskopie mit Manifest: gleicher Pfad ohne `.tar.gz`.
- Zusätzliche lokale Kopie: `C:/Users/Christopher Koch/Documents/ChatGPT/Shopify Import/backups/galerie-20261106/galerie-gesamtsicherung-20261106T120700Z.tar.gz`.
- Archivgröße **594.453.964 Bytes**, SHA-256 **`5590c28bfd74f90231739df9eeea9ba4b376b7288e1634eabeee3200012a4283`**. Lokal unabhängig berechnet und mit Server verglichen: identisch.
- **4.281 Nutzdateien plus Wiederherstellungsmanifest**. Enthalten: konsistenter Galeriesnapshot mit 2.761 Dateien, tatsächlicher Laufzeitordner, private Konfiguration und Aktivierungsmarker.
- Alle fünf Datenbanken gesichert: `design-assets.sqlite`, `profiles.sqlite`, `workshop.sqlite`, `review-comments.sqlite`, `review-approvals.sqlite`; SQLite-Backup einschließlich bestätigter WAL-Inhalte, gemeinsame kurze Schreibsperren, anschließend `quick_check=ok`.
- Vollständiger Archivinhalt auf Dateigröße und SHA-256 gegen `RECOVERY-MANIFEST.json` geprüft. Snapshot-Mapping bestätigt 325 Originale und 35 Produkte.
- Das private Archiv enthält auch Zugangskonfiguration. Es bleibt außerhalb von GitHub und öffentlichen Webverzeichnissen; Zugangsdaten wurden nicht im Chat oder in diesem Dokument ausgegeben.

### Code, Quellen und lokaler Arbeitsstand

- Vollständiges Git-Bundle der Code-Historie bis `b2e68575`: `backups/galerie-20261106/gravuru-2027-b2e68575.bundle`, **248.489.608 Bytes**, SHA-256 `d4e605663f60d594fd0e7aa2a570b22452a168e616c676164aee61c4fac5b1d6`. `git bundle verify`: vollständig, gültig, kein externer Vorgänger nötig.
- Materialisierte Pilotquellen zusätzlich als `katalog-pilot-visible-sources.zip`: **743 Dateien**, **45.484.070 Bytes**, SHA-256 `9959d407c91f9e4a2dd21fe8997585ea7084e17b11f9757b0656c39f99593b57`; alle ZIP-Dateien gegen Größen/Hashes geprüft. Dies sichert den vorhandenen Sparse-Pilotcheckout, **nicht die gesamte Katalog-Git-Historie**. Die vollständigen Katalogquellen liegen weiterhin im Katalog-Repository.
- Reproduzierbares Codepaket `work/steel-review-runtime-b2e68575.zip`: 763 Einträge, 31.535.033 Bytes, SHA-256 `42398c99fd43085a841fcd6937f177367461805237b0e9626949880d5656da5e`; bereits aus dem Commit gebaut und vollständig geprüft.
- Lokaler kombinierter Edelstahl-Prüfstand: `backups/galerie-20261106/local-steel-review-20261106.zip`, **765.017.561 Bytes**, SHA-256 `759020c4b39d6ea9831eea9a140dc5ce9145a572b51ec2cdd74187e7ca8a59e3`. Alle 2.976 Nutzdateien plus Receipt im ZIP vollständig zurückgelesen und gehasht, alle fünf SQLite-Datenbanken konsistent; 353 Originale/108 Produkte. Details im [Sicherungsnachweis](../reviews/2026-11-06-galerie-sicherung/backup-proof.json). Er enthält Testverschiebungen und synthetische Freigabeereignisse. **Nie als echte Online-Nutzerdaten installieren.**
- GitHub enthält Code, Berichte, Prüfbelege und diese Zusammenfassung. Private Datenarchive bleiben getrennt. Der Nachweis nennt genau, was gesichert ist; dies ist kein vollständiges Shopify-, Bestell-, Theme-, Medien-CDN- oder Plesk-Gesamtsystembackup.

### Wiederherstellung

1. Gewünschten Stand auswählen: tatsächlichen Online-Snapshot oder ausdrücklich nur lokalen Prüfstand. SHA-256 zuerst mit dem Nachweis vergleichen. Eine unvollständige Sicherung ohne abschließendes Receipt nicht verwenden.
2. Archiv in einen **neuen privaten Ordner** entpacken, nicht über laufende Daten. `RECOVERY-MANIFEST.json` prüfen; im Unterordner `snapshot` mit dem gesicherten `ops/plesk/slate-review-snapshot.py verify --snapshot <snapshot>` alle Dateien, Datenbanken und Mapping prüfen.
3. Laufzeit und Galerie-Pythonumgebung in einer isolierten Testinstanz bereitstellen. Die private Konfiguration nur geschützt übernehmen und auf neue Daten-/Galeriepfade anpassen. Keine Zugangsdaten nach GitHub kopieren. Python/Node-Systeminstallation und Plesk-Verwaltung werden durch das Galeriearchiv nicht vollständig geklont.
4. `slate-review-snapshot.py install` legt ausschließlich neue Daten-/Galerieordner und Marker an. Richtigen Ursprung angeben; danach `plesk:check`, lesende Health-/Galerieprüfung und gezielte Wiederherstellungsprüfung auf der isolierten Kopie.
5. Ein produktiver Rückwechsel ist ein eigener, ausdrücklich erlaubter Schritt. Alten Datenstand erhalten; Freigabe-DB niemals löschen. Die ältere Codebasis vor Freigaben akzeptiert diese DB nicht ohne angepasste Speicher-Allowlist.
6. Falls GitHub nicht verfügbar ist: Code mit `git clone <bundle> <new-checkout>` aus dem vollständigen Code-Bundle herstellen. Der datierte Übergabe-Commit folgt erst nach dieser Sicherung und liegt zusätzlich auf GitHub sowie in den lokalen Markdown-Dateien.

Datei-/Datenbank-/Archivprüfungen sind ausgeführt. Ein kompletter Neustart einer wiederhergestellten Plesk-Instanz wurde in diesem Sicherungspaket **nicht** durchgeführt.

## 6. Vorschlag: Galerie als zentrale Produktverwaltung mit Shop-Abgleich

**Ja, das Ziel ist technisch möglich.** Shopify bietet APIs für Produktabgleich aus einer externen Datenquelle und Ereignismeldungen für Shopänderungen. Quellen: [Shopify – Sync product data](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections/sync-data), [Shopify – Webhooks](https://shopify.dev/docs/apps/build/webhooks). Die folgende Ausgestaltung ist ein Vorschlag; keine bereits funktionierende Vollspiegelung und keine durch diese Frage erteilte Veröffentlichungsfreigabe.

### Geplanter Benutzerablauf

1. Galerie zeigt die Produkte/Designs mit Material, Thema, Form, Größe, Rohling, Shop-Zuordnung und letztem Abgleich.
2. Direkt oder im vollständigen Konfi bearbeiten und als neue Arbeitsrevision speichern.
3. Vorher/Nachher prüfen und Gestaltung bestätigen. Der bisherige Shopstand bleibt bis zur ausdrücklichen Übertragung erhalten.
4. „Änderungen zum Shop prüfen“ zeigt betroffene Artikel, Varianten, Vorschaubilder, Texte, Preise und Konfi-Bindungen. „Im Shop geändert“ macht parallele Änderungen sichtbar.
5. Nach Freigabe „Mit Shop synchronisieren“. Das System schreibt nur die ausgewählten, freigegebenen Änderungen und liest sie anschließend vollständig zurück.
6. Ergebnis pro Artikel: synchron / Änderung ausstehend / Konflikt / fehlgeschlagen. Wiederholung setzt einen unvollständigen Auftrag fort und erzeugt keine Duplikate. Ein Rückweg ist an den protokollierten Vorzustand gebunden.

### Zuständigkeit der Daten – vor dem Bau festlegen

| Daten | Vorgeschlagene führende Quelle / Richtung |
| --- | --- |
| Designobjekte, Schriften, Masken, Rohlinge, Konfi-Geometrie | Katalog-/Werkstattdaten mit nachvollziehbarer Revision → freigegebener Konfi-Stand |
| Artikel-/Varianten-IDs, Veröffentlichungsstatus, aktueller Shopinhalt | Shopify zurücklesen; vorhandene IDs dauerhaft erhalten |
| Produkttexte, Bilder, Themenzuordnung | In der Verwaltung bearbeitbar; feldweise Zuständigkeit und erlaubte Übertragung festlegen |
| Preise, Zubehör, Lochgeometrie | Bestehende verbindliche Excel-/Katalogquellen; dieselbe native Preis-/Variantenlogik nutzen |
| Bestellungen, Zahlungen, tatsächlicher Bestand | Shopify bleibt für diese Abläufe maßgeblich; Anzeige bei Bedarf, keine Rückschreibung aus Designänderungen |
| Kommentare und gestalterische Freigaben | Private Galerie; nicht automatisch öffentliche Shopdaten |

„Gespiegelt“ bedeutet damit eine gemeinsame Verwaltungsansicht mit belegtem Abgleich. Es bedeutet nicht, dass Theme-Code, Checkout, Bestellungen und alle Apps automatisch in die Galerie kopiert werden. Sichtbare Produktdarstellung und editierbare Originalobjekte sind unterschiedliche Daten; ein Shopify-Vorschaubild kann die Originalobjekte nicht ersetzen.

### Technische Voraussetzungen und Wiederverwendung

- Vorhandene ID-Bindungen, native Produktrevisionen, Renderer und Shop-Vorprüfungen wiederverwenden. Im Code vorhanden: `shopify-admin-readonly.mjs`, `shopify-variant-preflight.mjs`, `acryl-shop-service.mjs` mit jobs/Read-back und `compareDigest`, `shopify-order-webhook.mjs`. Diese bereichsspezifischen Bausteine sind kein Nachweis einer fertigen allgemeinen Galerie-Synchronisierung.
- Pro Design-/Material-/Formatstand einen freigegebenen unveränderlichen Release-Stand erzeugen. Alte Bestellungen verweisen weiter auf ihren damaligen Stand. Offene Prüfvorlagen dürfen keine Kunden-Vorlage ersetzen.
- Eindeutige Zuordnung interner Produkt-/Design-IDs zu bestehenden Shopify-Produkt-/Varianten-IDs. Keine Abbildung nur über Titel oder Dateinamen.
- Drei Zustände vergleichen: letzter gemeinsamer Abgleich, neue lokale Revision, frisch gelesener Shopify-Stand. Bei beidseitiger Änderung desselben Feldes Konflikt zeigen, nicht still überschreiben.
- Persistente Übertragungsaufträge, Wiederanlauf, Fehlerprotokoll und abschließender Rücklesevergleich. Die beiden Systeme haben keine gemeinsame Datenbanktransaktion; Teilerfolge müssen ausdrücklich sichtbar sein.
- Ereignismeldungen aus Shopify prüfen und Duplikate abfangen; zusätzlich regelmäßigen vollständigen Abgleich als vorgeschlagenen Sicherungsmechanismus vorsehen.
- Für Teiländerungen gezielte Mutationen wählen. `productSet` kann bei enthaltenen Listen nicht mitgelieferte Einträge entfernen; daher keine unvollständige Variantenliste als Gesamtsynchronisierung schicken. [Offizielle Semantik](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productSet).
- Bearbeiten, gestalterisch bestätigen und veröffentlichen getrennt berechtigen. Die konkrete Rollenverteilung und später mögliche Automatik mit Chris festlegen; nicht aus dem bisherigen gemeinsamen Galerie-Login eine persönliche Identität ableiten.
- Regelmäßige private Sicherungen und Wiederherstellungsproben. Aufbewahrung, zusätzlicher unabhängiger Speicherort und Automatisierung noch festlegen; hier wurde keine wiederkehrende Aufgabe eingerichtet.

### Sinnvolle Reihenfolge

1. Bestandslieferungen und Mikas Konfi-Rückweg abschließen.
2. Shopify zunächst **lesend** spiegeln: reale IDs, Veröffentlichungsstände, Unterschiede und fehlende Bindungen anzeigen.
3. Einen bereits zugeordneten, unveröffentlichten Testartikel ändern, übertragen und vollständig zurücklesen. Wiederholung, Konflikt und Rückweg prüfen.
4. Ausgewählte veröffentlichte Artikel erst nach konkreter Freigabe aktualisieren; anschließend kontrollierte Stapel.
5. Automatische Teilabläufe nur für ausdrücklich vereinbarte Felder und Regeln ergänzen. Kein unkontrolliertes automatisches Publizieren durch Speichern eines Designs.

## 7. Offene Punkte und exakter nächster Schritt

- Claude: README-Prüfsummenindex korrigieren; TO-V2A-15x8-D1/D3 kleinste tatsächliche Größe 150×80 samt B02S-Prüfbildern ergänzen. Historischer Key `GR-ES-OV-300X159P9-T15` entspricht laut Quellen 300×160 mm. Fehlende Herkunftsrefs/alte Reihenindizes offen dokumentieren.
- Danach **gesamten vorhandenen Bestand** in prüfbaren Stapeln liefern; Inventar mit vorhanden/vorbereitet/geliefert/offen samt Grund und Gesamtfortschritt.
- Astra: neue tatsächliche Hostdaten sichern, Edelstahl auf dessen getrennte Kopie additiv übernehmen, Erhaltung und private Bedienung prüfen. Die Sicherung dieses Dokuments ist zeitgebunden; bei zwischenzeitlichen Nutzeränderungen frisch sichern.
- Mika: vollständige Save-back-Anbindung und Komma-ID-Rückweg auf dem materialfähigen Adapter abnehmen. Aktuelle Arbeit nicht mit einem fremden Branch überschreiben.
- Chris: verbindliche Unterkategorienliste; anschließend gestalterische Einzelabnahmen. Für spätere Shop-Synchronisierung Feldzuständigkeiten und Freigabeablauf konkret vereinbaren.
- Keine Garantie „alle Materialien fertig“, solange weitere Lieferungen und die Sollmatrix fehlen. Kein Kunden-Live aufgrund dieses Sicherungsauftrags.

## 8. Kontext über neue Chats zuverlässig erhalten

Das belastbare Projektgedächtnis liegt in versionierten Dateien und Daten, nicht allein im Chatverlauf. Vorschlag:

1. **Ein fester Einstieg:** `GALERIE-START-HIER.md` mit Rolle, gültigem Umfang, aktuellem Stand, Grenzen, Links und genau nächstem Schritt; kurz halten und nach jedem Paket aktualisieren.
2. **Ein Entscheidungsregister:** verbindliche Nutzerentscheidungen mit Datum/Quelle in das bestehende `ENTSCHEIDUNGEN.md` übernehmen. Vorschläge und noch offene Fragen ausdrücklich getrennt lassen; kein zweites widersprüchliches Register.
3. **Ein Arbeitslog:** `STATUS.md` plus datierte Übergabe nach jedem Paket; Quellcommit, Tests, Screenshots, Fehler, Sicherung und Live-/Merge-Status nennen.
4. **Ein maschinenlesbares Lieferregister:** stabile Original-/Material-/Format-IDs, Quellhash, Bearbeitungsrevision, Freigabestatus und Shop-Zuordnung. Der Chat ist keine Freigabedatenbank.
5. **Startsatz für jeden neuen Chat:** „Lies `GALERIE-START-HIER.md` auf dem aktuell benannten Galeriebranch, dann die verlinkte Gesamtübergabe, AGENTS/Entscheidungen und neueste Kommentare in #85/#168. Prüfe den tatsächlichen Stand, bevor du weiterarbeitest.“
6. **Optionaler dauerhafter Erinnerungsmerker:** nur Projekt, Rollen, feste Startdatei und die Regel „erst lesen, dann fortsetzen“ speichern. Änderliche Zähler/Livezustände immer frisch aus GitHub/Host lesen. In diesem Auftrag wurde das persönliche Memory-Verzeichnis nicht geändert; Chris hat zunächst einen Vorschlag verlangt.

Neue Chats synchronisieren sich nicht automatisch untereinander. Dieser feste Einstieg und die GitHub-Rückmeldungen geben ihnen denselben überprüfbaren Ausgangspunkt.
