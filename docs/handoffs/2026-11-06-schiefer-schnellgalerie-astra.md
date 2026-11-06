# Schiefer-Galerie: drei Spalten, Themen und Schnellbearbeitung

## Auftrag und Grenzen

Chris, dieser Chat am 06.11.2026: geschützten globalen Zugriff mit „JA“ freigegeben; nach Hunde ohne/mit Foto, Menschen ohne/mit Foto und weiteren Themen sortieren, Schiefer-Türschilder und Hausnummern ergänzen, Unteragenten einsetzen und Elemente schnell verschieben/speichern. Präzisierung: **drei Vorlagen nebeneinander, je Karte nur die Konfi-Version**. Kommentare bleiben je Original-ID. Ein Kommentar oder gespeicherter Entwurf ist keine Bildfreigabe; Einzel-OKs weiterhin im Chat. Eigener Branch/PR #180, kein main-Merge und keine Shopify-Veröffentlichung.

Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich. Originaldateien bleiben unverändert; dokumentierte Ersatzschriften sind durch Chris bereits erlaubt. Die neue Übersicht ersetzt auf ausdrücklichen Wunsch den bisherigen dreifachen Bildvergleich; Originalbelege bleiben im Paket erhalten. Neueste Claude-Hinweise in #85 wurden vor Beginn gelesen: Neue Struktur vor Bestsellern, keine abgeleiteten Referenzen als Originale ausgeben.

## Bedienung

- Drei Karten nebeneinander am Desktop; auf schmalen Geräten zwei bzw. eine.
- Je Karte eine native Konfi-Vorschau. Bei mehreren vorbereiteten Formaten wählt die Formatauswahl die Vorschau und denselben Editorstand; standardmäßig 30 × 20 cm, sofern vorhanden.
- „Verschieben & bearbeiten“ öffnet die gewählte Vorlage und Größe. Element direkt ziehen oder links auswählen, dann „Speichern & zurück“.
- Filter, Formatwahl und Rücksprungstelle bleiben erhalten. Ein direkter Rücksprung auf eine durch alte Filter versteckte Karte öffnet deren Kategorie.
- Kommentar eingeben und separat speichern. Versionskonflikte überschreiben keine neueren Kommentare. Offene Vorlagen haben eine Ursachenkarte mit Kommentarfeld, keine erfundene Konfi-Vorschau.

Die Kategorien stammen aus dem Katalog und nachgewiesenen Fotofeldern. 70 der bisherigen 180 Originale sind ausdrücklich „Tiere / Allgemein“; diese erscheinen als „Weitere Tiere“. Sie werden nicht anhand eines Beispielnamens oder Fotos zu Hundevorlagen umetikettiert. Fehlende Fotoangaben bleiben als „Fotozuordnung offen“ sichtbar.

## Browsernachweis an isolierter Kopie

`work/slate-online-ui-test-20261106-1/data` und `gallery` wurden mit SQLite-Backup inklusive WAL und allen vier Datenbanken vom aktuellen Benutzerstand getrennt gesichert. Diese Kopie enthält Teständerungen und darf **nicht** als finaler Online-Stand installiert werden.

Nachgewiesen im echten Chrome-Browser unter Port 8997:

- Drei unterschiedliche Hundevorlagen in einer Reihe; je Karte nur ein Vorschaubild.
- D217 von 30 × 20 auf 22 × 14 umgestellt; Vorschau und Editor öffnen das richtige Produkt und dieselbe Original-ID.
- D217 Text 4 durch Ziehen von X 116,99 / Y 26,16 auf X 120,94 / Y 29,08 verschoben, gespeichert, zur Galerie zurückgekehrt und erneut geöffnet: Stand 2 mit genau den gespeicherten Werten.
- Separate ungespeicherte Änderung löst den Verwerfen-Dialog aus; bewusst verworfen, keine zweite Speicherung.
- D65-Kommentar in einer tieferen Galeriezeile gespeichert und nach Editor-Rückkehr identisch zurückgelesen; Themenfilter und sichtbare Kartenposition erhalten.
- Direkter Hash-Rücksprung D50 aus vorherigem Hundefilter zeigt korrekt „Menschen ohne Foto“.
- Falsche Meldung „Design nicht enthalten“ im Schnellmodus behoben: Auswahlprüfung verwendet geladene Designdaten statt der dort ausgeblendeten Designkacheln.

Die Benutzer-Datenbanken wurden durch diese Bedienprüfungen nicht verändert. Bestehender Kommentar zu D5 war in der Sicherung vorhanden und blieb unverändert.

## Online-Stand

Der geschützte Laufzeitanschluss, sichere Sicherung und Erstinstallation in neue Datenordner sind implementiert. Nur mit explizitem `GRAVURU_SLATE_REVIEW_PACKAGE` wird die Galerie in der vorhandenen privaten Laufzeit aktiviert. HTTPS-Herkunft, Basic-Anmeldung und Schreibschutz gegen fremde Herkunft bleiben bestehen; keine Shopify-Verbindung. Anleitung: [private Schiefer-Galerie](../../ops/plesk/SLATE-REVIEW-README.md).

Die geschützte Galerie ist auf **Site 19** installiert: **https://test-2027.gravuru-designwerkstatt.de/originale/**. Chris hat die Plesk-Anmeldung selbst abgeschlossen. Code aus Commit `f0df298b8e4d9d0f4e238a176623e5bcbab09e96` und ein frisches Snapshot des tatsächlichen Benutzerstands wurden in neue, getrennte Ordner installiert. Die vorhandene Test-Anmeldung wurde unverändert übernommen; keine Zugangsdaten ausgegeben oder neu erzeugt. Site 20, Shopify und Kunden-Konfigurator bleiben unberührt.

Serverprüfung erfolgreich: Node 24.22.2, SQLite, Python 3.11.18, benötigte Python-Pakete und Cairo; 325 Originale und 35 Produktgruppen zurückgelesen. Über die tatsächliche HTTPS-Adresse: ohne Anmeldung `401`, mit bestehender Anmeldung `/__test/health` → `200`, `ready:true`, `shopifyConnected:false`. Die zusätzliche Anmeldung der Galerie im Benutzerbrowser ist getrennt von Plesk und noch offen; daraus wird keine bestandene externe Browser-Bedienprüfung abgeleitet.

**34/34 Prüfungen über die tatsächliche HTTPS-Adresse bestanden** ([Bericht](../reviews/2026-11-06-schiefer-schnellgalerie/online-http-audit.json), [Prüfskript](../reviews/2026-11-06-schiefer-schnellgalerie/probe-online.py)): Galerie mit 325 Karten, 233 nativen Vorschauen und 17 Themen-/Fotogruppen; CSS/JS; native SVGs und passende Editorlinks für GT-S-30x20-D5, TRE-S-10x10-D12 und TQ-S-20x20-D15; vorhandener D5-Kommentar mit identischem Hash und Revision; gültiger Galerietoken erreicht die Inhaltsprüfung, fehlender Token/fremde Herkunft werden abgewiesen; neun private Datenpfade liefern keine Bytes. Keine gültige Schreibanfrage und keine Testkommentare an Benutzer-IDs; alle Kommentare vorher/nachher identisch. Lokale Browserprüfung von tatsächlichem Speichern steht oben, Online-Browserprüfung bleibt ausdrücklich offen. Ein erster Prüflauf enthielt die falsche Test-ID `TRE-S-20x20-D15`; nur das Prüfszenario wurde auf die im Manifest vorhandene ID `TQ-S-20x20-D15` korrigiert, keine Vorlage geändert.

Nach der Plesk-Pfadänderung musste Site 19 ausdrücklich neu gestartet werden: vorher antwortete der alte Prozess für `/originale/` mit `404`, danach die neue Galerie mit `200` und 550.265 HTML-Bytes. Health allein wurde deshalb nicht als Galerienachweis gewertet.

Serverbasis `/var/www/vhosts/gravuru-designwerkstatt.de`:

- Anwendung: `gravuru-2027-schiefer-review-20261106`, Dokumentenstamm darin `public`, Startdatei `app.cjs`.
- Daten: `private/slate-review-data-20261106`; Galerie: `private/slate-review-gallery-20261106` (private Rechte, Herkunftsmarker erst nach vollständiger Hashprüfung).
- Konfiguration: `private/gravuru-2027-schiefer-review-20261106-config.json`; bestehende private Python-Umgebung `private/gravuru-2027-test-python311` wiederverwendet.
- Übertragene Pakete: `private/slate-review-upload-20261106`; überprüftes Snapshot: `private/slate-review-snapshot-20261106`.
- Rückwechsel: Site 19 auf bisherigen Anwendungsstamm `/gravuru-2027-test` und Dokumentenstamm `/gravuru-2027-test/public` stellen, App neu starten. Bisheriger Code, private Konfiguration und Daten wurden nicht überschrieben oder gelöscht. Rückwechsel ist dokumentiert, nicht ausgeführt.

Dateiprüfung lokal und auf dem Server identisch:

| Paket | Bytes | SHA-256 |
| --- | ---: | --- |
| `slate-online-code-20261106-1.zip` | 31.502.875 | `af70a4d3c2e37b95b5a66d548053ab52650c642832e5c43f2b8af9fc21ed72cb` |
| `slate-online-deploy-20261106-1.zip` | 516.972.557 | `246edd033b26678ceafa753bb52c5d933ad51013bea434bbf318fdc5bc54aef3` |

Das Daten-Snapshot enthält 2.760 Nutzdateien (949.997.252 Bytes), vier SQLite-Sicherungen mit `quick_check=ok`, Zuordnungen und unveränderliche Katalogbelege. Das Archiv enthält zusätzlich das Prüfrezept `ONLINE-SNAPSHOT.json`; sämtliche Mitgliedsdateien wurden auf Größe und Hash geprüft. Keine isolierten UI-Teständerungen übernommen. [Plesk-Einstellungen](../reviews/2026-11-06-schiefer-schnellgalerie/online-plesk.png).

Ab diesem Stand ist die Online-Datenbank die Arbeitsablage für Online-Kommentare und Änderungen. Lokale Sicherungen und der lokale Editor werden nicht automatisch mit ihr synchronisiert; ein erneuter Vollimport darf Online-Änderungen nicht überschreiben.

## Katalogerweiterung und Prüfungen

Das gepinnte Inventar enthält 906 eindeutige Schiefer-Master. Zusätzlich zu den bisherigen 180 Gedenktafeln wurden die 129 echten Schiefer-Türschilder und 16 Hausnummern aufgenommen: 145 Originale, 435 bytegleiche Originaldateien. 88 Türschildmaster sind als native Vorlage vorbereitet (45 in 20 × 20, 43 in 10 × 10 cm), 297 native Elemente, 7 neue Produktgruppen. Alle Größen exakt im Familienkatalog vorhanden; Skalierung 1, Versatz 0. Außerhalb der Originalplatte vollständig unsichtbare Corel-Bogennummern sind nur aus der nativen Darstellung ausgeschlossen und mit Originalbox protokolliert. Teilweise sichtbare Texte bleiben erhalten.

57 Ergänzungen bleiben offen: 16 Hausnummernmaster in 14 × 22 ohne exakte Formatbindung im gepinnten Familienkatalog, 7 UV-Drucke, 32 Schriftfälle ohne dokumentierten Ersatz sowie TRE-S-10x10-D35 und -D56 wegen tatsächlich teilweise überstehender Texte. Keine neue Platte, Drehung oder Schriftzuordnung erfunden. Die 10-/20-cm-Master sind trotz gleicher Serienzugehörigkeit unterschiedlich angeordnet und bleiben getrennte Original-IDs. Der Audit bestätigt 58 solche Paare, keine identische proportionale Dublette.

Zusammen: **325 Original-IDs, 233 mit mindestens einer bearbeitbaren Größe, 232 vollständig und 1 teilweise vorbereitet, 92 ohne native Größe, 377 gültige Größenfassungen und 35 Produktgruppen**. 292 Gravur/33 UV. Der frühere `preparedDesigns`-Zähler bedeutete vollständige Größenpaare und darf nicht mit dem Ergänzungszähler addiert werden; die kombinierte Galerie hat eindeutige Aggregatfelder.

Katalogartefakte: `work/slate-catalog-inventory-v1/inventory.json`, `work/slate-catalog-extension-preparation-v3`, `work/slate-catalog-extension-package-v1`. 885 Addon-Dateihashes, 435 Originaldateihashes und 7 Produkt-Rücklesevergleiche geprüft. 9 Katalog-Node-Tests, 2 neue Adaptertests sowie 4 bestehende Adaptertests bestanden. Die tatsächliche Browserdarstellung wurde an D15 und D12 überprüft. D12 sichtbare Schrift endet bei 98,772 mm innerhalb der 100-mm-Platte; ein vorheriger Sharp-Kontaktbogen ohne WebP-Material war irreführend und ist kein maßgeblicher Nachweis. [Browserbeleg](../reviews/2026-11-06-schiefer-schnellgalerie/tuerschilder-browser.png).

Galerie/Kommentare: 14 gezielte Tests bestanden. Editor: 35 gezielte Tests sowie nach Korrektur der falschen Designmeldung 6 Auswahl-/Kontexttests bestanden. Private Laufzeit und Ergänzung: 14 Linux-Tests, 5 Snapshot-/Archivtests bestanden. Keine daraus abgeleitete Behauptung eines neuen vollständigen Projekttestlaufs.

Der echte Ergänzungsimport wurde zuerst an `work/slate-review-expanded-source-20261106-1/data` und `work/slate-original-package-v5-all-slate-test` geprüft: alle 28 bisherigen Produktstände vollständig gehasht und unverändert, Mapping unverändert, Kommentare/Profile bytegleich; 7 neue Gruppen hinzugefügt. Die Testsicherung enthält danach einen anderen Stand als ihr ursprüngliches Snapshot-Receipt und darf nicht direkt als geprüftes Online-Snapshot verwendet werden.

Danach wurde dieselbe Ergänzung in den tatsächlichen Benutzerstand `work/slate-original-review-v3` übernommen und unter `work/slate-original-package-v5-all-slate` zusammengestellt: alle 28 alten Produktstände vollständig unverändert, alte Zuordnungen und Kommentare erhalten, nur sieben neue Gruppen ergänzt. Sicherung davor: `work/slate-before-gallery-extension-20261106-1`; Audit: `work/slate-gallery-extension-final-audit.json`. Das finale Online-Snapshot `work/slate-online-deploy-20261106-1` wurde erst danach erzeugt. Lokale Übersicht: `http://127.0.0.1:8998/originale/`.
