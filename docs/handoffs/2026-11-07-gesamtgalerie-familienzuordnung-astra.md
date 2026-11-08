# Gesamtgalerie und Familienzuordnung · Astra · 07.11.2026

## Stand der Übergabe

Die vollständige lokale Zusammenführung und der Vorschau-Nachtrag V2 sind geprüft. Der private Host-STAGE läuft; sein Abschluss, die Aktivierung der neuen Zuordnung, die Plesk-Umschaltung und die tatsächliche Chrome-Abnahme sind noch offen. Die folgenden Bestandszahlen sind lokale Paket-/Quellnachweise, keine Behauptung einer bereits abgeschlossenen Onlineübernahme.

| Bestand nach Zusammenführung und Vorschau-Nachtrag V2 | Geprüfte Anzahl |
| --- | ---: |
| Originalkarten, einschließlich erhaltener Altstände | 19.661 |
| Originale mit mindestens einem nativ bearbeitbaren Ziel | 6.623 |
| Originale mit weiterhin offener Konfi-Aufbereitung | 13.038 |
| Vorbereitete native Material-/Formatziele | 51.259 |
| Zugeordnete native Produktgruppen | 3.141 |
| Separate Rohlinge | 1.147 |
| Lieferstapel | 219 |
| Echte Familien / Produktlinien | 16 / 7 |
| Zusätzliche Katalogvorschauen im Nachtrag V2 | 3.447 |
| Karten ohne Bild nach vollständiger Anwendung von V2 | 0 |

Eine sichtbare Katalogvorschau ist kein bearbeitbares oder freigegebenes natives Design. Die 13.038 offenen Originale bleiben ausdrücklich offen; der Nachtrag macht sie sichtbar und verändert weder ihre Zielzuordnung noch ihre Produktionsfreigabe.

## Auftrag und Grenzen

Chris beauftragt die vollständige Übernahme der fehlenden Claude-Lieferung in die private Galerie und die Einzel-/Mehrfachzuordnung vorhandener Designs zu weiteren Familien. Kein main-Merge, keine Shopify-Veröffentlichung, keine Änderung an Site 20. Eigener Branch `dev/astra-galerie-gesamtimport-familien-20261107`, auf dem bisherigen Pilotstand `536d9a891b7bfdee2bda20415e77b550264a873b`.

## Verbindliche Quellen

- Claude: Issue #85, Kommentar `6688988751`; Kataloglieferung `86c1ff5f431acfe60d4cff388958112187005550`, Quellstand `3c6051fbbc7904969948950fae12cae2ae663f30`, PR184.
- 219 Stapel, 19.533 eigenständige Lieferoriginale und 1.065 reine Masterverweise. Keine doppelten Karten aus Verweisen.
- Frischer Gesamtaudit: 55.293/55.293 Dateihashes, 19.450/19.450 Originalversionshashes und 1.147 zentrale Rohlingeinträge geprüft. Die übrigen 83 Originale haben laut Lieferung keinen SVG-Versionsnachweis. Das bedeutet nicht, dass ihre Katalogbilder oder sämtliche Originaldaten fehlen; die Lieferlisten und der tatsächliche Git-Bestand wurden getrennt geprüft.
- 16 echte Familien und sieben Linien werden als unveränderlicher Katalogsnapshot ausgeliefert. Keine abgeleiteten Wunschmaße, erfundenen Familien oder ersetzten Preis-/Befestigungsregeln.

Maßgebliche Nachweise: [Quell-/Vorbereitungsübersicht](../reviews/2026-11-07-complete-gallery/prepared-source-summary.json), [finale Zusammenführung](../reviews/2026-11-07-complete-gallery/final-combine-audit.json), [Vorschau-Nachtrag V2](../reviews/2026-11-07-complete-gallery/source-preview-supplement-v2-proof.json). Der frühere V1-Nachweis mit 59 verbleibenden Vorschau-Lücken ist als Zwischenstand erhalten; für die Bildabdeckung gilt ausschließlich V2.

## Umsetzung

`prepare-complete-design-review.mjs` prüft vorhandene Pakete und erstellt fehlende Stapel einzeln. Native Dokumente werden während der Vorbereitung auf Platte geschrieben; Fontdaten behalten ihre bestehende Darstellung. Ungebundene oder blockierte Quellen bleiben mit Originalvorschau und konkretem Grund sichtbar. `central-blanks-v2` ergänzt 30 Rohlinge, die in keinem Designstapel enthalten sind. Vier reine Verweisstapel erzeugen keine leeren Galeriekarten.

Der Korrespondenzaudit bewahrt alle bisherigen 462 Originalkennungen. 197 Bestands-Pfadkennungen verweisen auf vorhandene Karten; 52 davon haben einen neueren, abweichenden Quellstand und erhalten einen separaten Hinweis. 64 andere Masterquellen mit bereits verwendeter Designnummer bekommen eine quellengebundene Kennung. Bisherige native Gestaltung, Originaldateien, Kommentare und Freigaben werden dabei nicht ersetzt. Eins-zu-viele-Verweise bleiben Beziehungen.

`combine-complete-design-review.mjs` prüft sämtliche Dateihashes vor Zusammenführung und vor Wiederverwendung. Rohlinge werden nach Material, Familie und Quellkennung getrennt. Identische Rohlinge behalten historische Vorschaupfade; abweichende Konturen, Maße oder Bildhashes sind Konflikte.

Die Galerie zeigt höchstens 60 Karten pro Seite in drei Spalten. Suche und Filter umfassen den Gesamtbestand. Die vorhandene Quellhierarchie aus Produkt, Zielgruppe und Unterkategorie wird zusammen mit dem Fotozustand angezeigt und gefiltert. Dadurch bleiben Menschen/Tiere sowie mit/ohne Foto getrennt, ohne Quelldaten umzuklassifizieren. Verfahren ohne Quellenangabe und unbelegte Fotozuordnungen bleiben ausdrücklich offen. Die endgültige Unterkategorienliste von Chris wird nicht vorweggenommen. Ungespeicherte Schnellbearbeitungen blockieren einen verlustreichen Wechsel; der Editor-Rücksprung führt über die Original-ID zur passenden Seite und Karte.

Familienzuordnung erfolgt über eine separate Einzel-/Mehrfachauswahl an den Karten. Auswahl → vorhandene Linie/Unterkategorie/Familie/Größe → native Vorschau → ausdrücklich übernehmen. Gleiche Maße bewahren die editierbaren Objekte exakt; andere Formate verwenden die vorhandene native Skalierung und Einpassungsprüfung. Fotoquellen, Masken, Texte, Schriften und Rechte bleiben erhalten. Neue Ziele sind ungeprüft. Vorhandene Ziele werden nicht überschrieben.

Registrierung und neue native Gruppen werden gemeinsam im bestehenden Importjournal gespeichert. Die unveränderliche erste Revision trägt `katalog.galleryAssignment`; daraus wird die Galerie-Allowlist nach Neustart wiederhergestellt. Eine gesonderte Mapping-Datenbank gibt es nicht. Quellrevision, Katalog, Preis-/Befestigungsangebot und Zielbestand werden vor der atomaren Anlage erneut geprüft. Ein wiederholter Auftrag legt nichts doppelt an.

Die Familien stammen aus dem geprüften Katalog. Die tatsächlichen Acryl-3-mm-Familien für Schwarz und Anthrazit bleiben eigenständig; historische AS-/AA-5-mm-Kennungen werden nicht als 3 mm umgedeutet. Produktlinien und Rohlinge werden als vorhandene Auswahl angeboten, nicht aus einer frei eingegebenen Bezeichnung erfunden. Pro Auftrag sind höchstens 60 Quellen und 120 konkrete Design×Ziel-Einträge zulässig; zu große native Vorschaupakete müssen aufgeteilt werden. Die Zuordnungsauswahl ist von den Freigabehäkchen getrennt.

## Begrenzte Datenabfragen und Freigaben

Die Gesamtgalerie wird serverseitig gefiltert und seitenweise geliefert; sie erzeugt kein HTML für alle rund 20.000 Karten auf einmal. Für die angezeigte Seite werden zunächst leichte Freigabemetadaten gelesen. Frische native Fingerprints und die passenden Vorschaubilder werden anschließend nur für höchstens 60 aktuell ausgewählte Material-/Formatziele geladen, nicht für sämtliche Formate dieser Originale. Die Sammelfreigabe bezeichnet ausdrücklich die angezeigten, geladenen Prüfziele. Ein gültiger Bild-/Fingerprintstand bleibt Voraussetzung; neue Zuordnungen erhalten keine automatische Freigabe.

Die UI verwendet kurze, geschützte POST-Leseanfragen, damit 60 lange Originalpfade nicht die URL-Grenze des Hosts überschreiten:

- `POST /originale/assignments?action=context` mit `{sourceKeys:[...]}`; `plan` und `execute` bleiben getrennte Schritte.
- `POST /originale/approvals?action=read` mit `{originalIds:[...],targetKeys:[...]}`; höchstens 60 Originale und 60 ausgewählte Prüfziele.

Beide Lesevarianten verwenden die bestehende Origin-/CSRF-Prüfung und begrenzte JSON-Nachrichten. Sie erteilen keine Freigabe und legen keine Produkte an. Die bisherigen kurzen GET-Varianten bleiben kompatibel. Die bekannten Werkstatt-Auswahllisten verwenden paginierte `catalog=1`-Metadaten; die große Legacy-Produktantwort wird dort nicht mehr als Auswahlliste geladen. Die HTTP-Rendererdatei und der Fingerprintschutz wurden hierfür nicht abgeschwächt.

## Vollständige Katalogvorschauen, Quellenkorrektur und Schriftbefunde

Der unveränderte Nachtrag `source-preview-supplement-20261107-v2.zip` enthält 3.447 neue Vorschauzuordnungen:

- **3.353 gerenderte Original-SVGs:** isoliertes Chromium ohne Netzwerk, explizit geladene und belegte Schriften, Glyphenprüfung und belegte Originalfotos. Dokumentierte Ersatzschriften bleiben nachvollziehbar. Originalfarben und Quellen wurden nicht verändert; eine kontrastierende Anzeigeunterlage macht helle Gravuren sichtbar.
- **35 bereits vorhandene Original-PNGs:** bytegleich übernommen. Originalkennung, `files[]`, Paketindex und tatsächliche Quelldatei stimmen überein; dafür wird kein neuer Schrift-/Rendernachweis vorgetäuscht.
- **59 weitere PNGs aus dem gepinnten Katalog:** ebenfalls bytegleich übernommen. Ein vollständiges rohes Commitobjekt und 72 binäre Git-Treeobjekte belegen den jeweiligen Originalpfad bis zum PNG-Blob. Git-Objektidentitäten und Bild-SHA256 werden unabhängig geprüft; eine bloße Hashbehauptung im Manifest genügt nicht.

**Korrektur des früheren Quellenbefunds:** Bei den letzten 59 Karten existieren `preview.png` und `design.json` bereits im gepinnten Git-Stand. Die Liefermanifeste hatten `dateien:[]` gesetzt, weil die zusammengeführte `design.svg` fehlt. Es waren fehlende Lieferverweise bzw. fehlende Galerie-Ressourcen, nicht 59 fehlende Katalogbilder. V2 schließt diese Anzeigelücke, ohne die SVG-Verfügbarkeit oder native Bearbeitbarkeit zu behaupten. Siehe [getrennten Liefer-/Quellbefund](../reviews/2026-11-07-complete-gallery/missing-originals-59.json).

Acht Schrift-/Glyphenbefunde bleiben fachlich offen und sind vollständig durch unveränderte Original-PNGs sichtbar:

- Ungeklärte historische Schriftzuordnung: `GT-S-30x20-D80`, `GT-S-30x20-D97`, `GTSK-S-30x20-D2`, `GT-S-30x20-D203`, `GT-S-30x20-D227`, `GT-S-30x20-D264`, `GT-S-30x20-D271`.
- `GTSK-S-30x20-D4`: In der belegten Schrift `Segoe UI Emoji` fehlt das benötigte Stern-Glyph `U+2B50`.

Diese Befunde wurden weder durch freie Ersatzschriften noch durch Layoutänderungen verdeckt. Alle 19.661 Karten besitzen nach V2 eine native oder eine ausdrücklich als Katalogvorschau bezeichnete Darstellung; die acht Renderbefunde erzeugen keine verbleibende Bildlücke und keine zusätzliche Freigabe.

V2 ist lokal vollständig gelesen und gegen Base, zusammengeführtes Addon, Originalkennungen, Quellbytes und Hashindizes geprüft. Der tatsächliche Produktionsparser hat alle 3.447 Einträge bestanden. Zusätzlich bestehen 26 isolierte Linux-Tests des Operators, unter anderem für gefälschte Git-Nachweise, falsche Quellen, vorhandene native Ziele/Vorschauen, parallele Aktivierung und atomaren Rückweg. Der lokale Parserbeleg liegt unter `work/source-preview-supplement-v2-validator-proof.json` und enthält keine Datenbankinhalte; bei dieser Prüfung wurden keine Datenbanken geöffnet.

| Gepinntes Artefakt | SHA256 |
| --- | --- |
| V2-ZIP · 270.738.758 Bytes · 3.524 Dateien | `275a643955b63d776697a2ac749169969c25f88cadd3d221897b4a05438e1833` |
| `supplement-manifest.json` V2 | `3221955808592c83cd5ad9eb8bef257b7956d9c5d9e423d2856ccac12e05502d` |
| Geprüfter `complete-gallery-previews.py` | `57a0ef05d71714152afd045dadeb97e2dc985fc6451a5f34929a175983824147` |

## Private Inbetriebnahme

Frische Sicherung aller fünf Datenbanken unter `private/complete-gallery-20261107-v1/backup`, Ausgangsbestand 349 native Gruppen. Die aktive Galerie hatte 462 Karten und 348 zugeordnete Gruppen; die zusätzliche Gruppe gehört zum separaten Shopify-DRAFT-Piloten und bleibt erhalten.

Der Import ergänzt nur neue native Gruppen und erzeugt mit `--mapping-out` eine separate Zuordnungsdatei. Die gemeinsame Datenbank erhält dabei neue Entwürfe; vorhandene Köpfe, Revisionen und Nutzerinhalte dürfen nicht ersetzt werden. Aktive Galeriezuordnung und aktive Konfiguration bleiben bis zur kontrollierten Umschaltung unverändert. `ops/plesk/complete-gallery-stage.py` prüft ZIPs, Build, Konfiguration und alte Datenbankzeilen. Gleichzeitige Änderungen an bestehenden Produktköpfen verlangen eine erneute Prüfung, keine stille Überschreibung.

`complete-gallery-previews.py` ergänzt ausschließlich die noch nicht aktivierte `private/complete-gallery-20261107-v1/gallery`. Er verlangt die Pins von ZIP, Nachtragsmanifest und bisheriger `STAGE-READY.json`. Die aktive Zuordnungsdatei muss noch exakt den Vorher-Hash besitzen; Aktivierungsbelege oder ein `ACTIVATED`-Marker sperren den Vorgang. Bestehende Vorschauen und native Ziele werden abgewiesen. Originaldateien, native Dokumente, Kommentare, Freigaben und Konfiguration werden nicht beschrieben.

Vor der Ergänzung werden Manifest, Hashindex, Stage-Nachweis und Quellenbelege außerhalb der Galerie privat gesichert. Die Galerie-Metadaten werden atomar ersetzt; `STAGE-READY.json` wird erst nach Rücklesen mit aktualisiertem `galleryManifestSha256` und `supplementProof` wieder bereitgesetzt. Bei einem Abbruch bleibt sie gesperrt oder erhält den überprüften alten Stand zurück. Die Git-Belege für die 59 Katalogbilder liegen ebenfalls ausschließlich in dieser privaten Operatorsicherung, nicht als neue Originaldateien in der Galerie.

Vorschauoperator und Aktivator verwenden gemeinsam `STAGE/.metadata.lock`. `complete-gallery-activate.py` darf die Zuordnung zusätzlich nur bei gestoppter privater Runtime unter deren Laufzeitsperre atomar ersetzen. Er überprüft den Vorschau-Nachweis, schreibt Aktivierungsbeleg und `ACTIVATED.json` und schaltet selbst weder Plesk noch Shopify um. Alte Codewurzel, Galerie und gesicherte Zuordnung bleiben der Rückweg. Ein Rückweg darf keine inzwischen hinzugekommenen Kommentare oder Freigaben durch Wiederherstellen kompletter Datenbanken verwerfen.

**Aktueller Serverstatus, 07.11.2026, 17:19 UTC:** STAGE-Import und V2-Ergänzung sind auf dem tatsächlichen Host erfolgreich abgeschlossen. 1.564 Importtransaktionen ergänzten 2.793 neue Gruppen; insgesamt liegen 3.142 native Gruppen vor, davon 3.141 Galeriegruppen und der bereits bestehende separate Shop-DRAFT-Pilot. Alle 349 bisherigen Produktköpfe sind unverändert. Die fünf Datenbanken bewahren sämtliche bisherigen geprüften Zeilen: 240 Assets, 2 Profile, 723 Werkstattzeilen, 4 Kommentarzeilen und 113 Freigabe-/Ereigniszeilen. Die 109 bestehenden Bestätigungen wurden nicht verändert. Die aktive Zuordnung und Konfiguration sind weiterhin unverändert.

V2 wurde anschließend mit allen 3.447 Bildern auf die inaktive Galerie angewendet, davon 59 bytegleiche und per Git-Commit/Tree/Blob nachgewiesene Katalog-PNGs. Originalziele und native Dateien sind erhalten; der Bildnachtrag schrieb keine Datenbank und keine Konfiguration. Der neue Stand hat 19.661 Originalkarten, 6.623 zumindest in einem Format bearbeitbare Originale (6.612 vollständig, 11 teilweise vorbereitet), 13.038 weiterhin offene Originale und 51.259 vorbereitete Material-/Formatziele. Alle Karten haben eine native oder originale Katalogvorschau.

**Noch nicht aktiviert:** Die Plesk-Sitzung ist während des Imports abgelaufen; die erneute Anmeldung wurde beim Nutzer angefragt. Site 19 zeigt weiterhin die bisherige Galerie mit 462 Karten. Der Aktivator wurde nicht ausgeführt, keine Plesk-Pfade oder Dienste wurden verändert. Aktivierung, Plesk-Umschaltung und die tatsächliche Chrome-Abnahme bleiben offen. Es gibt für Site 19 keinen bereits belegten CLI-Ersatz für sicheren Stopp, beide Plesk-Pfadwechsel und Start; ein historischer `tmp/restart.txt`-Nachweis einer anderen Anwendung ersetzt diese Schritte nicht. Der Zielzugang bleibt `https://test-2027.gravuru-designwerkstatt.de/originale/`.

### Abschließender Hostbeleg — nach tatsächlicher Prüfung ergänzen

| Schritt | Status / noch einzutragender Beleg |
| --- | --- |
| Append-only-STAGE abgeschlossen | Bestanden: [Host-Stage](../reviews/2026-11-07-complete-gallery/host-stage-ready.json), Runtime `01c3da9a33249eba2600079d689b5b1769f88f7e`, 349 alte Köpfe und alle geprüften Nutzerzeilen erhalten |
| V2 auf der inaktiven Galerie angewendet | Bestanden: [Host-Vorschau-Nachweis](../reviews/2026-11-07-complete-gallery/host-preview-supplement-ready.json), 3.447 Ergänzungen, 0 offene Bildnachträge, aktive Zuordnung/Konfiguration unverändert |
| Aktivierung bei gestoppter Runtime | Offen: `ACTIVATION-RECEIPT.json`, `ACTIVATED.json`, Sicherungs-/Rückwegpfad |
| Site 19 auf neue Code-/Galeriefassung umgestellt | Offen: tatsächliche Plesk-Pfade, Neustart und Zeitpunkt |
| Geschützter HTTP-/Daten-Erhaltungsbeleg | Offen: wirkliche Hostantworten, nachgewiesene Bilder/Filter/API-Pfade und Erhalt laufender Nutzerfreigaben; keine Geheimnisse protokollieren |
| Chrome-Abnahme | Offen: tatsächliches Laden, Filtern/Blättern, Schnellbearbeitung und voller Editor samt Speichern/Rücksprung; erfolgreiche lokale oder andere Browserprüfungen ersetzen diesen Nachweis nicht |

Diese offenen Felder dürfen erst durch echte Host-/Browserergebnisse ersetzt werden. Ein lokaler Test oder ein laufender STAGE-Prozess gilt nicht als Onlinefreigabe.

### Verbindliche Fortsetzung nach Plesk-Anmeldung

Der Import und der Vorschauoperator sind fertig und dürfen nicht erneut gestartet werden. Auf Site 19 die bestehende App anhalten, dann den bereits geprüften Aktivator mit Codecommit `01c3da9a33249eba2600079d689b5b1769f88f7e` und Mapping-SHA `f399e6731928b92dcdb0d7898f9df9ad676c14316af6a5918247aee00ad720af` ausführen. Der finale `STAGE-READY.json`-SHA ist `2c63d454573f1a90f9ae01d6bab2a2bd8beb2dc11255eb776391947c360f9c2c`; er enthält den Bildnachtrag. Der Aktivator sichert die dann aktuellen Kommentare/Freigaben/Profile nochmals und verlangt die exklusive Runtime- und Metadatensperre.

Danach Anwendungsstamm `/gravuru-2027-complete-01c3da9a`, Dokumentenstamm `/gravuru-2027-complete-01c3da9a/public`, Startdatei `app.cjs` setzen und nur diese private App starten. Vorheriger Anwendungsstamm ist `/gravuru-2027-bulkapproval-3db1ef5d`; bestehende Datenbanken niemals durch alte Backups ersetzen. Alle Operatordateien liegen unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/complete-gallery-20261107-v1/`.

Anschließend den geprüften `readback.py` ausführen: Schutz ohne Anmeldung, private Betriebsart ohne Shopify, 19.661 Originale im Manifest und der Seitenübersicht, höchstens 60 Karten auf Seite 1, 109 identische Bestätigungen und drei bytegleiche Original-PNG-HTTP-Antworten. Er schreibt einmalig `ONLINE-READBACK.json`; es existiert bisher kein solcher erfolgreicher Onlinebeleg. Readback-Helper-SHA `39b5bdb1ffc8e45f8fba0faa5768c263a7391a51c0988915021f1cbb79818036`, 11/11 Linux-Tests bestanden. Aktivator-SHA `3e137f737b86a4d7db5376a4e7a2d22c6ace89a702028952ad728f9a06129137`, 15/15 Linux-Tests bestanden. Alle drei hochgeladenen Helper-SHAs wurden tatsächlich auf dem Host zurückgelesen.

Chrome-Prüfung: Originale `TRE-V2A-5x2-D401` und `TRE-V2A-5x2-D406`, Quelle Edelstahl 5 × 2 cm, über die gesonderten Zuordnungshäkchen auswählen. Belegte Zielkombination: Linie `acryl-tuerschilder`, Unterkategorie `andenkenschilder`, Familie `acryl-3mm-tuerschilder-schwarz`, Größe `TS-Acryl-RE-60X20-T30-SW` (6 × 2 cm). AS 3 mm / 5 × 2 cm ist für beide Originale bereits vorhanden und muss als vorhandene Zuordnung behandelt werden. Die tatsächliche Planantwort vor einer Übernahme prüfen; kein blindes Wiederholen. Nur eine neu erzeugte, ungeprüfte Zielvariante verschieben/speichern, im vollen Konfi öffnen, den Testversatz zurücksetzen/speichern und nach Neuladen prüfen. Bestehende bestätigte Quellen unverändert lassen, keine Freigabehäkchen setzen. Screenshots und konkrete neue Konfi-IDs erst nach dieser echten Bedienfolge ergänzen. Danach Abschlussrückmeldung in #85 und #168.

Die normalen Galerie-/Zuordnungspfade verwenden Metadaten und begrenzte Dokumentabrufe. Die ältere Verwaltungs-Quellübersicht liest beim kalten Aufbau weiterhin große native Dokumente sequenziell; diese verbleibende Leistungsgrenze ist keine Freigabe für ungefilterte Vollabrufe der rund 23 GB nativen Daten.

## Mika / Shop-Anbindung

Die Zuordnung verwendet dieselben nativen Produkte, Editor-/Schnellspeicherung und unveränderlichen Revisionen. Sie erteilt keine Sicht- oder Shopfreigabe. Shopübernahme muss weiterhin konkrete Material-/Formatfreigaben und den tatsächlichen gespeicherten Fingerprint prüfen. Der bestehende Edelstahl-Andenken-Pilot bleibt Shopify-DRAFT; keine Veröffentlichung, Warenkorbaktivierung oder automatische Shop-Synchronisierung in diesem Paket.

## Weiterhin offene Sachfragen

Echte Lieferblocker, fehlende native Zielfamilien, ungeklärte Schriftzuordnungen und fehlende zusammengeführte SVGs bleiben sichtbar erhalten. Fehlende Lieferverweise sind vom tatsächlichen Quellbestand zu unterscheiden; für die kanonische Galerie sind nach V2 keine fehlenden Bilder mehr nachgewiesen. Die endgültige Unterkategorienliste kommt von Chris. Neue Katalogstände überschreiben keine Nutzerbearbeitung. Diese fachlichen Entscheidungen sind keine automatischen Importkorrekturen und werden nicht durch die bessere Bildabdeckung aufgehoben.
