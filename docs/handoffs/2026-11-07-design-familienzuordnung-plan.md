# Designvorlagen anderen Produktfamilien zuweisen – Umsetzungsplan

Stand: 07.11.2026, Astra / Agent onlinezugang. Read-only Architekturprüfung auf `dev/astra-andenken-shop-pilot-20261107`, gelesener Codebezug `5018791574bd7332bcc15c35824608e5f75814d7`.

**Dies ist ausschließlich die Planung des nächsten Pakets. Der laufende Shop-Pilot wird zuerst abgeschlossen.** Diese Übergabe implementiert keinen Dienst, kein zusätzliches Speichersystem und keine Migration. Keine Host-, Shop-, Katalog- oder Datenbankänderung, kein Commit durch den Agenten. Ein neuer Umsetzungsauftrag muss die anschließend zuständigen Dateien und die erste überprüfbare Teilmenge festlegen.

## 1. Verbindliches Nutzerziel und Ablauf

Der Nutzer möchte direkt an jeder Designkarte dieselbe Gestaltung anderen Produktfamilien zuweisen, außerdem mehrere Designs gemeinsam auswählen und zuweisen. Zusätzlich sollen Produktlinien mit ihren tatsächlichen Rohlingen angelegt beziehungsweise verbunden werden können. Als Beispiel nennt er schwarzes und anthrazitfarbenes Acrylglas mit 3 mm, bezeichnet als „AS/AA 3 mm“.

Der geplante Bedienweg bleibt in der Galerie:

1. An einer Karte „Produktfamilien zuweisen“ oder mehrere Karten markieren. Die Auswahl für Zuordnungen bleibt getrennt von den vorhandenen Freigabehäkchen.
2. Für jede Original-ID den ausdrücklich gewählten, **gespeicherten** nativen Material-/Formatstand als Quelle festhalten. Ungespeicherte Karten zuerst speichern oder auslassen. Keine unbemerkte Auswahl einer anderen Materialfassung desselben Originals.
3. Ziellinie/Unterkategorie, konkrete Familien und verfügbare Rohlinge beziehungsweise Größen wählen. Klarnamen, Materialstärke und Maße anzeigen. Bereits vorhandene Ziele kennzeichnen und aus der Neuanlage ausschließen.
4. Einen festen Plan mit Quellrevision, Familienstand, Zielmaßen, tatsächlichen Optionen/Preisen, benötigten Anpassungen, Warnungen und nativen Zielvorschauen anzeigen. Keine automatischen Bestätigungen oder pauschalen Aussagen zur Produktionsreife.
5. Erst die bestätigte Zusammenstellung übernehmen. Geänderte Quellen, Ziele, Angebote oder Familienstände führen zu einem Konflikt und einem neu zu prüfenden Plan. Nach Rückkehr zeigt dieselbe Originalkarte ihre zusätzlichen Material-/Formatziele.

Ein Design bleibt die gesamte Gestaltung; ein Motiv ist ein einzelnes Element. Eine Mehrfachthemenzuordnung oder ein weiteres Material erzeugt keine zweite Originalkarte. Eine Zuordnung ist keine Freigabe, Veröffentlichung oder Shopify-Synchronisierung.

## 2. Vorhandene Grundlagen und tatsächliche Grenzen

| Baustein | Vorhanden | Grenze für dieses Nutzerziel |
|---|---|---|
| [`scripts/lib/gallery-management-http.mjs`](../../scripts/lib/gallery-management-http.mjs) | Private `/originale/verwaltung` und Aktionen `context`, `templates`, `template-draft`, `template-create`, `template-save`, `creation-plan`, `creation-confirm`, `creation-execute`; Origin/CSRF und begrenzte JSON-Nutzlast | Keine Auswahl einzelner Galerie-Designs, keine Design-/Familienzuweisung, keine Linienanlage |
| [`app/workshop/ui/gallery-management.mjs`](../../app/workshop/ui/gallery-management.mjs), zugehörige HTML/CSS | Produktgruppen, konkrete Optionsauswahl, Anlageplan, Bestätigung | Quellen sind ganze vorbereitete Produkte. Karte und Sammelauswahl sind nicht angeschlossen |
| [`app/workshop/product-group-templates.mjs`](../../app/workshop/product-group-templates.mjs) | Versionierte Vorlagen, unveränderliche Pläne, Bestätigungen, Wiederholungsbelege, native Validierung und transaktionsgeschützte Anlage | `compile()` kopiert das ganze Quellprodukt einschließlich aller Designs. Kein selektives Übertragen eines Originals auf eine andere Familie. Dynamische Mehrformatoptionen werden nicht still verändert |
| [`scripts/lib/gallery-management-targets.mjs`](../../scripts/lib/gallery-management-targets.mjs) | `galleryProductGroupSources()` leitet Produktquellen aus vorbereiteten Galerie-Zielen und `design.katalog.target.familyId` ab | Kennt nur bereits importierte Produkte. Rohlinge ohne native Designziele werden keine Quelle. Kein Ableiten der Familie aus Namen oder Kürzeln |
| [`app/workshop/subcategory-materials.mjs`](../../app/workshop/subcategory-materials.mjs) | `familyIdsOffered`, `offeredFamilyIds()`, `subcategoryMaterialOffering()` | Nur Angebotsauswahl, keine Produkt-/Designanlage. `null`/fehlend erbt die Linie, `[]` ist ausdrücklich leer |
| [`app/workshop/catalog-structure.mjs`](../../app/workshop/catalog-structure.mjs), [`katalog-linien.mjs`](../../app/workshop/katalog-linien.mjs) | Lesen von Linien/Familien, Quellenhash, Änderungen am Unterkategorie-Angebot; Hauptprodukte bearbeiten/zuordnen/anlegen | `action:'add'` legt ein Hauptprodukt in einer bestehenden Linie an, keine neue Produktlinie. Katalogänderungen benötigen einen ausdrücklich verbundenen Katalog und schreiben dessen Dateien |
| [`app/workshop/product-families.mjs`](../../app/workshop/product-families.mjs) | Familienprüfung, versionierte Familienstände, CAS, Größen/Bohrbilder/Preise; idempotente native Produktanlage | `familyProductConfig()` erzeugt zunächst das Hilfsdesign „Familie Muster“. Es ist kein Katalogoriginal und kein Rohling. Direkte Familien-Produkterzeugung wird auf der privaten Galerie durch den Anlage-Gate abgefangen |
| [`app/workshop/gallery-shop-sync-native.mjs`](../../app/workshop/gallery-shop-sync-native.mjs) | `nativeSource()` sammelt einzelne Gestaltung, Rechte, benötigte Fonts/Motive/Raster, Fotos und Original-/processed-/editSource-Nachweise. `ensureNativeAssets()` erhält validierte Originalressourcen | `composeNativeTarget()` ist absichtlich auf bestehende Shop-Startdesigns, gleiche Geometrie, Materialart und Verarbeitung begrenzt. Nicht durch Abschwächen dieser Regeln zur allgemeinen Familienzuweisung umfunktionieren |
| [`app/workshop/katalog-convert.mjs`](../../app/workshop/katalog-convert.mjs) | `katalogFamilyToProduct()`, `scaleTemplate()`, `scaleEmbeddedMotifs()` und bestehende Zielvalidatoren | Quellkonvertierung ersetzt keinen aktuellen Nutzerstand. `scaleTemplate()` rundet Koordinaten auch bei Faktor 1; unveränderte 1:1-Kopien müssen exakt geklont werden |
| [`app/workshop/repository.mjs`](../../app/workshop/repository.mjs) | Native Produktrevisionen, `validate()`, CAS, `importBatch()` mit `beforeWrite`, Importjournal und Update-Einträgen | Kein fertiger öffentlicher „Design an Familie anhängen“-Dienst. `copy()` dupliziert ein ganzes Produkt. Mehrere Designs desselben Zielprodukts müssen in einer gemeinsamen neuen Revision zusammengeführt werden |
| [`scripts/lib/design-review-targets.mjs`](../../scripts/lib/design-review-targets.mjs) | Explizite Material-/Familien-/Formatziele, Original-ID, native Design-ID und Produktkey; strenge Paket-/Mappingvalidierung | Neue Verwaltungsprodukte stehen nicht automatisch im unveränderlichen Galeriepaket und Importmapping |
| [`scripts/lib/slate-review-gallery.mjs`](../../scripts/lib/slate-review-gallery.mjs), [`slate-review-approval-targets.mjs`](../../scripts/lib/slate-review-approval-targets.mjs) | Galerie, Kommentare, Freigaben, Ziel-Fingerprints und Cache | Paket/Mapping sowie Bearbeitungs-Allowlist werden beim Handleraufbau geladen. Eine neue Zuordnung muss nach Commit auch hier konsistent sichtbar werden |
| [`app/workshop/gallery-editor.mjs`](../../app/workshop/gallery-editor.mjs), [`slate-review-positions.mjs`](../../app/workshop/slate-review-positions.mjs) | Vollkonfi und schnelle Positions-/Größenänderung an erlaubten nativen Zielen | Zielregistrierung muss neue, nachgewiesene Zuordnungen aufnehmen; nicht einfach beliebige Datenbankprodukte für die Galerie freischalten |

Die private Runtime in [`ops/plesk/runtime.mjs`](../../ops/plesk/runtime.mjs) setzt keinen Katalogpfad ausdrücklich. Ohne verbundenen Katalog liefert `catalogStructure` den eingebauten älteren Strukturstand. Gleichzeitig verlangt `offeringFor` im Galeriehandler `effectiveFamilyIds`; eine vorhandene Produktgruppenoberfläche beweist deshalb noch keinen vollständigen Anlageanschluss. Diese Verbindung vor der Umsetzung gezielt prüfen. Ein ungeprüfter schreibbarer Checkout auf dem Host ist keine Lösung.

## 3. Echte 3-mm-Quellen und historische 5-mm-Familien

Gelesene Quellen liegen im unveränderten Checkout `work/gravuru-gesamtbestand-quellen`, Lieferung PR184 `86c1ff5f431acfe60d4cff388958112187005550`, Quellstand `3c6051fbbc7904969948950fae12cae2ae663f30`. Familien-/Linienbelege sind zusätzlich zum Lieferhashindex geprüft; siehe [Lieferaudit](../reviews/2026-11-06-gesamtbestand/delivery-audit.json).

| Katalogpfad | Familie / Identität | Dicke | Größen |
|---|---|---:|---:|
| `familien/acryl/acryl-3mm-tuerschilder-schwarz.json` | `acryl-3mm-tuerschilder-schwarz`; `acrylic`, Variante `schwarz` | 3 mm | 80 |
| `familien/acryl/acryl-3mm-tuerschilder-anthrazit.json` | `acryl-3mm-tuerschilder-anthrazit`; `acrylic`, Variante `anthrazit` | 3 mm | 80 |
| `familien/acryl/acryl-as-abstandshalter.json` | `acryl-as-abstandshalter` / historisch AS | 5 mm | 54 |
| `familien/acryl/acryl-aa-abstandshalter.json` | `acryl-aa-abstandshalter` / historisch AA | 5 mm | 54 |

Die Linie `linien/acryl-tuerschilder.json` heißt bereits „Acrylglas Türschilder 3 mm“ und enthält beide echten 3-mm-Familien. Die getrennte Linie `linien/acryl-schilder-abstandshalter.json` enthält die historischen AA-/AS-/S/S-Familien. Daher zuerst vorhandene Familien und Linie verbinden; keine Dubletten nur wegen der Nutzerbezeichnung „AS/AA 3 mm“ anlegen.

3-mm-Schlüssel sind beispielsweise `TS-Acryl-RE-80X20-T30-SW` und `TS-Acryl-RE-80X20-T30-AN`; historische 5-mm-Schlüssel etwa `AS-RE-210X70` und `AA-RE-210X70`. Rohmaße, Konturen, Befestigungen und Preise dürfen nicht anhand der Kürzel umgedeutet werden. Beide 3-mm-Familien gravieren laut Quelle von hinten. Die 3-mm-Geometrie ist aus `steel-door-signs` übernommen; diese Herkunft ist kein Grund, Material-/Verfahrenseinstellungen aus dem Stahlprodukt zu kopieren.

Die Oberfläche kann „AS – Schwarz, 3 mm“ beziehungsweise „AA – Anthrazit, 3 mm“ als erklärende Anzeige verwenden; interne Familien-/Größenkennungen bleiben eindeutig. Der Grundpreis für Oval schmal 30 × 10 cm ist in der 3-mm-Quelle offen. Keine Preise oder Gewichte erfinden.

## 4. Native Zuordnung ohne Originaldubletten

Der bestehende Zielvertrag bleibt maßgeblich:

```text
Original-ID
  → familyId + sizeKey + reviewMaterial
  → productKey + productId + nativeDesignId
  → konkrete gespeicherte Produktrevision
```

- Original-IDs einschließlich Kommas bleiben unverändert. Die native, gegebenenfalls geslugte ID ist ein separates explizites Feld.
- Ein neues Ziel erweitert dieselbe Originalkarte. Bestehende identische Zielidentität bedeutet „bereits zugeordnet“, keine neue Kopie und keine neue Revision.
- Eine erneute Zuordnung darf eine inzwischen bearbeitete Zielfassung nicht mit der alten Quelle überschreiben. „Bestehendes Ziel aktualisieren“ wäre ein eigener, ausdrücklich bestätigter Vorgang.
- Die ausgewählte Quellrevision umfasst die tatsächlich gespeicherte Gestaltung einschließlich Fotozuschnitt und Schriften. Nicht erneut aus Katalog-SVG konvertieren, wenn dadurch Nutzerbearbeitungen verloren gingen.
- Zielmaterial, Dicke, Kontur, Bohrbilder, Verfahrensprofil, Preis und Optionen stammen aus dem gewählten Familien-/Produktstand. Designrechte und benötigte Ressourcen werden vollständig erhalten; bestehende andere Designs, Preise, Kundenrechte und Profilbindungen bleiben unverändert.
- Bei gleicher physischer Geometrie ohne erforderliche Anpassung die Gestaltung ohne Rundungsdrift übernehmen. Andere Größen/Formen benötigen einen ausgewiesenen Plan mit nativer Vorschau. Überstände, ungeeignete Fotos oder fehlende Ressourcen bleiben offen; keine Abschaltung der Validatoren.
- Gleich benannte Schriften/Motive mit anderem Inhalt sind ein Konflikt. Kein stilles Austauschen gemeinsam genutzter Ressourcen. Foto-Original, Bearbeitungsquelle, bearbeitete Fassung und Zuschnitt bleiben über den validierten Assetstore erhalten.

Die Speicherung soll auf **vorhandenem Repository, nativen Revisionen und Importjournal** aufbauen. Es wird kein zweites Design- oder Freigabesystem eingeführt. Erforderliche Registrierungsmetadaten sind im nächsten abgegrenzten Auftrag so zu verbinden, dass Produktrevision und veröffentlichte Galerie-Zielregistrierung nach Fehlern/Wiederanlauf konsistent bleiben. Eine Sammlung zusätzlicher JSON-Dateien nebenher oder ungeprüftes „Produkt speichern, anschließend Mapping ändern“ erfüllt dies nicht.

Die bisherige unveränderliche Paketbasis bleibt Erhaltungsnachweis. Zusätzliche, serverseitig geprüfte Zuordnungen brauchen einen nachweisbaren gemeinsamen Lesevertrag für Galerie, Konfi und Freigaben. Ob dieser aus vorhandenen Journal-/Revisionsmetadaten abgeleitet oder um kleine Registrierungsmetadaten im selben Store ergänzt wird, ist **vor Implementierung** festzulegen. Ein separates Overlay-Datensystem ist mit diesem Plan nicht genehmigt.

## 5. Zielfreigaben, Kommentare und Veröffentlichung

[`design-review-approvals.mjs`](../../scripts/lib/design-review-approvals.mjs) bleibt der einzige Freigabespeicher. Das vorhandene Schiefer-Schlüsselformat wird nicht verändert. Neue Material-/Größenziele erhalten eigene Zielschlüssel und zunächst keine Freigabeereignisse. Historische Katalogfreigaben bleiben Herkunftsmetadaten.

Die bestehende Freigabe des Quellziels darf nicht auf das neue Ziel übertragen werden. Vorhandene Kommentare bleiben an der Original-ID. Bereits bestätigte andere Ziele behalten ihre Ereignishistorie. Falls tatsächliche Renderer- oder Ressourcenumstellungen einen anderen Fingerprint erzeugen, ist „erneut prüfen“ sichtbar zu erklären; der Fingerprintschutz wird nicht abgeschwächt.

Eine private Zielzuordnung aktiviert weder Shopprodukte noch Kundenbestellung oder Fertigung. Der bestehende Shop-Synchronisierungsdienst bleibt ein getrennt bestätigter Anschluss. Sein Transport, Startdesignschutz, bestehende Bindungsfreigaben und Preiskontrollen werden für dieses Paket nicht geöffnet.

## 6. Produktlinien und Rohlinge

Für vorhandene Linien/Familien zuerst deren aktuelle Identität und Quellenstand anzeigen. „Neue Produktlinie“ ist von „neue Produktfamilie“, „weiterer Rohling“ und „neues Produkt aus vorhandener Familie“ zu unterscheiden; die UI soll diese Begriffe erklären, ohne technische Kennungen zur Hauptbedienung zu machen.

- Vorhandene 3-mm-Familien und ihre 80 Größen je Farbe wiederverwenden.
- Fehlende Linienzuordnung beziehungsweise Unterkategorie-Angebote über die vorhandene Angebotslogik führen. `familyIdsOffered` steuert zulässige Auswahl, ersetzt aber die konkrete Zielanlage nicht.
- Neue Familien benötigen einen versionierten vollständigen Familienstand mit Herkunft, Kontur, Maßen, Material/Dicke, Bohrbildern, verfügbaren Optionen und Preisen. Unbekannte Angaben bleiben offen.
- Rohlinge bleiben eigene Einträge ohne erfundenes Design oder Mustertext. Der vorhandene `pack.blanks`-Vertrag enthält Familie, Größe, Material, Maße und echte Vorschau; `blankPreviewUrl()` lässt aktuell geprüfte WebP-Pfade unter `originals/_blanks/` zu.
- Falls für eine neue Familie nur belastbare Geometrie, aber kein Katalogbild existiert, muss eine native Geometrievorschau ausdrücklich als solche gekennzeichnet werden. Kein fremdes Materialfoto als vermeintliches Original einsetzen.
- Vor Produkterzeugung weiterhin alle tatsächlichen Optionen und Ausführungen konkret anzeigen und bestätigen. Den privaten [`gallery-management-creation-gate.mjs`](../../scripts/lib/gallery-management-creation-gate.mjs) nicht umgehen.

## 7. Bekannte Importblocker und Grenzen des Gesamtbestands

Die Zuordnungsfunktion darf die vorhandenen Offen-Befunde nicht in „vorbereitet“ verwandeln. Die folgenden Zahlen beziehen sich auf die bezeichneten Liefer-/Prüfstände, nicht auf eine neue vollständige Onlineübernahme:

1. **Gesamtlieferung:** [Lieferaudit](../reviews/2026-11-06-gesamtbestand/delivery-audit.md) mit 219 Stapeln, 20.598 Register-IDs, 19.533 tatsächlichen Designlieferungen und 1.065 reinen Masterverweisen. 83 Designs ohne SVG bleiben offen. Die 28 Pilotmaster überlappen absichtlich und dürfen nicht als neue Originale dupliziert werden.
2. **Rohlinge:** 197 unterschiedliche unvollständige Rohlinge; die Zahl 583 in Lieferangaben zählt wiederholte Auftritte. „Neu“ im Dry-run beweist keine native Verwendbarkeit.
3. **Schriften:** Die zentrale Datei `F-schriften-ersatz/ergebnis.json` fehlt. Unsicherheitsklassifikation nicht vollständig reproduzierbar; 1.509 ausdrückliche Unsicher-Befunde an 1.433 Designs bleiben sichtbar. Welcome/ParmaPetit bleiben gemäß Lieferauftrag gesperrt. Dokumentierte Ersatzschriften sind vom Nutzer zugelassen, aber unsichere Zuordnung wird dadurch nicht pauschal freigegeben.
4. **Historische Einpassung:** 462 Textbefunde an 182 Designs mit `faktor:null`, weil die Änderung schon im Master angewandt wurde. Den gelieferten Stand erhalten, keine zweite Anpassung oder erfundenen Rückrechnungsfaktoren.
5. **Umbauten und Identitäten:** 1.563 vorbereitete Umbauten, technisch 1.565 IDs einschließlich zweier bereits offener Datensätze; außerdem 2.729 Umbenennungen. Bestehende Holds, Herkunft und Alias-/Masterverweise nicht still auflösen. Fehlende Familien, Fotos/UV, Rendererbefunde und Originalnachweise bleiben individuell offen.
6. **Erste Türschild-Materialgruppe:** [Zehn-Stapel-Bericht](../reviews/2026-11-06-gesamtbestand/door-batches.md) und [Einzelbelege](../reviews/2026-11-06-gesamtbestand/door-batches.json): 2.503 Originale, 121 lieferseitig offen; 2.385 offene Zielstände. Darunter 45 zusätzliche native Familienziele: 15 überschreiten 100 mm Schriftgröße, 30 enthalten Motive außerhalb Oval/Kontur. 4.793 nicht blockierende Hinweise und 15 Originale mit unsicherem Ersatz bleiben sichtbar. Keine automatische Layoutkorrektur.
7. **Weitere Materialien:** Der Batchadapter unterstützt derzeit nur `steel-door-signs` und die beiden echten 3-mm-Acryl-Türschildfamilien. Andere Materialgruppen brauchen ihre geprüften Adapter und Quellen, auch wenn die Galerie einen Materialnamen anzeigen kann.
8. **Schiefer:** [Audit fehlender nativer Vorlagen](../reviews/2026-11-07-gallery-usability/blocked-slate-originals-and-topics.json) enthält 93 mindestens teilweise offene Originale: tatsächliche Glyphenüberstände, fehlende Schrift-/Glyphenressourcen sowie Quell-/Format-/Druckgrenzen. D79/D80/D83 und weitere dort einzeln dokumentierte Überstände nicht automatisch verschieben oder verkleinern. Kein vorhandener Operator-Reparaturpfad darf als Freigabe ungültiger Produktionsgeometrie ausgegeben werden. 70 nicht genauer belegte Tierarten bleiben als unklar markiert.
9. **Unterkategorien:** Für Hausnummern/Pferde/Katzen/Willkommen fehlt im geprüften Acryl-Linienstand eine eigene Unterkategorie; bisherige private Träger verwendeten `namensschilder`, ohne die Galerie-Themen zu verlieren. Diese technische Trägerwahl ist keine bestätigte künftige Shopstruktur. Die spätere Feinsortierung bleibt offen; Mensch/Hund/weitere Tiere sowie mit/ohne Foto sind bereits bekannte Grundgruppen.
10. **Skalierung und Onlineübernahme:** 32 vorbereitete Pakete enthalten 2.639 Gruppen und etwa 19.520 MiB rehydriertes natives JSON; dies ist keine RAM-/SQLite-Messung. Vollständige Fontkörper sind mehrfach eingebettet. Streaming-Import, begrenzter Dokumentcache und persistierte Fingerprints existieren; vollständiges HTML, gestuftes Kartenladen und Ressourcenredundanz bleiben Grenzen vor einer Gesamtübernahme. Kein ungebremstes Laden aller Produktdokumente in eine Zuordnungs-Auswahlliste.
11. **Vorhandener Importer:** `extend-design-review.mjs` validiert und ergänzt neue Produktgruppen; Wiederholungen vergleichen unveränderliche Baselines und erhalten Nutzerstände. Er ist kein API-Adapter zum Anhängen von Designs an bestehende Gruppen. Hashkonflikte, bearbeitete unzugeordnete frühere Importprodukte, kollidierende IDs/Ressourcen, unklare Herkunft oder verändertes Mapping führen zum Abbruch, nicht zum Überschreiben.

Historische Übergaben enthalten zwischenzeitlich behobene Browserprobleme. Für den Stand des laufenden Shop-Piloten gilt dessen abschließender neuer Nachweis; diese Planung trifft keine neue Aussage über Live-Status oder dessen Abschluss. Ebenso bedeutet die lokale Vorbereitung aller Türschildpakete nicht, dass alle privat online oder im Shop importiert sind.

## 8. Vorgeschlagener enger Implementationsschnitt nach Pilotabschluss

Die folgenden neuen Namen sind Vorschläge, noch keine implementierten Schnittstellen:

| Teilpaket | Dateien / bestehender Anschluss | Prüfergebnis |
|---|---|---|
| A: Reiner Zuordnungsplan | Neues `app/workshop/gallery-design-assignments.mjs` und Test; vorhandene native Quellen-/Ressourcenfunktionen, Familienkonverter, `repository.validate()` | Einzel-/Mehrfachauswahl erzeugt prüfbare native Zielvorschauen ohne Produktwrite. Bestehende Ziele werden erkannt |
| B: Gemeinsame Registrierung und Commit | Bestehende `repository.mjs`-/Importjournal-Schnittstelle nur soweit nötig erweitern; `design-review-targets.mjs`, `gallery-management-targets.mjs`; gegebenenfalls kleiner Adapter `scripts/lib/gallery-review-registry.mjs` | Genau-einmal-Verhalten, CAS, atomare oder nachweisbar wiederanlaufbare Sichtbarkeit, kein zweites Design-/Freigabesystem |
| C: Private API | `scripts/lib/gallery-management-http.mjs` plus fokussierte Tests; geplante Aktionen `assignment-context`, `assignment-plan`, `assignment-execute` unter bestehendem privaten API-Präfix | Browser liefert nur registrierte Kennungen und Plan-ID/Hash; Server bestimmt Quelldokumente. Gleiche Auth-/Origin-/CSRF-Grenze; keine Browserdateipfade oder fremden Produktdokumente |
| D: Karte und Mehrfachauswahl | `slate-review-gallery-page.mjs`, `slate-review-gallery-ui.js`, `slate-review-gallery.css` oder isoliertes UI-Modul; bestehende Verwaltungsseite für Familien-/Linienauswahl | Filter, Materialwechsel, ungespeicherte Entwürfe, Abbrechen und Rücksprung bleiben korrekt |
| E: Gemeinsame Leser | `slate-review-gallery.mjs`, `slate-review-approval-targets.mjs`, `app/workshop/gallery-editor.mjs`, `slate-review-positions.mjs` | Neue Ziele sofort und nach Neustart sichtbar/editierbar; alte Ziele/IDs/Kommentare/Freigaben bleiben erhalten |
| F: Linien/Rohlinge | Vorhandene `product-families.mjs`, `catalog-structure.mjs`, `katalog-linien.mjs`, `subcategory-materials.mjs` und die Verwaltungs-UI | Vorhandene 3-mm-Linie wiederverwendet; neue Linien/Familien nur mit bestätigter Quelle; echte Rohlinge getrennt |
| G: Paketierung | `scripts/build-plesk-test-package.py`, gegebenenfalls eng notwendige private Runtime-/Storageprüfungen und Tests | Neue Module im vollständigen Paket; bestehende private Runtime importierbar. Keine automatische Bereitstellung |

Die Zuordnungsidentität und die Wiederanlaufstrategie müssen vor Teil B konkret mit Root und Mika abgestimmt werden. Keine vorgezogene neue Datenablage während des laufenden Piloten.

## 9. Abnahme und offene Entscheidungen für den nächsten Auftrag

Mindestens auf isolierten Daten prüfen:

- Ein gespeichertes Design in gleicher Größe von Stahl auf beide echten 3-mm-Familien; Quellstand und andere Zielstände exakt unverändert.
- Mehrere ausgewählte Designs, die dieselbe native Zielgruppe treffen: gemeinsam übernehmen, genau eine Zielrevision, keine verlorenen Nachbardesigns.
- Wiederholen desselben Plans, bereits vorhandenes Ziel, geänderte Quelle/Zielrevision/Familie/Angebotsliste, Ressourcen-Kollision und Abbruch/Wiederanlauf.
- Foto mit Original, bearbeiteter Fassung und Zuschnitt/Reset; fehlende Fotozulässigkeit im Ziel bleibt nachvollziehbar offen.
- Kein Rundungsverlust bei 1:1; Formatwechsel mit Konturverletzung wird abgewiesen und sichtbar erklärt.
- Ein Original mit Komma-ID; nach Zuordnung weiterhin eine Karte, korrekte native IDs und Rücksprünge.
- Alte Kommentare/Freigabeereignisse/Produktrevisionen und Preise/Optionen/Profile unverändert; neue Ziele ungeprüft; kein Shop-/Bestell-/Fertigungsanschluss.
- Rohling ohne Gestaltung, vorhandene 3-mm-Linie ohne Duplikat und historische AS/AA-5-mm-Ziele unverändert.
- Reale private Browserfolge erst nach getrennter Freigabe zur Bereitstellung. GET- oder Unit-Tests ersetzen keine Bedienabnahme.

Noch konkret festzulegen: erste Pilot-Originale und Zielgrößen; Wiederverwendung vorhandener Zielgruppen bei mehreren passenden Trägern; dauerhaft verbundene Quelle für Linien/Familien; vollständig definierte Registrierung/Commit-Grenze; Verhalten bei bewusst gewünschter Aktualisierung eines bereits zugeordneten Ziels. Ungeklärte Familienwerte bleiben offen. Grundziel, Mehrfachauswahl, echte 3-mm-Familien und getrennte Rohlinge sind bereits entschieden und werden nicht erneut grundsätzlich zur Diskussion gestellt.

**Nächster Schritt:** Root schließt den laufenden Shop-Piloten einschließlich Nachweisen ab und erteilt danach den eng begrenzten Schreibauftrag für Teil A sowie den abgestimmten Registrierungsvertrag. Bis dahin bleibt diese Datei eine Planung.
