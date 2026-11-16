# Gemeinsame Module auf dem freigegebenen Stand nach der Flugpause

## Stand und Umfang

08.11.2026, Codex/Mika. Neuer isolierter Branch
`dev/mika-r15-modules-current-20261108`, Basis
`c7710dec6f2c4f6d0b36073ad2dc623fd5d5ac05`. Diese enthält den zuletzt
veröffentlichten Kundenstand `e9c36ce12d38fcb36bcb4b4c57add458d1859af7`
und den [verbindlichen Wiederanlaufbericht](2026-11-08-flight-backup-and-resume.md).

Ausschließlich das App-Delta aus PR217, Produktionscommit
`61fcb3fb05bdcb636d1cb92e06917e175b64306a`, wurde dreiseitig auf diese
aktuelle Basis übertragen. Alle Codeänderungen passten konfliktfrei. Es wurde
keine alte vollständige Runtime kopiert. Zwölf Produktionsdateien, neun
zugehörige Testdateien; kein Kundenlayout, CSS, Produkt, Profil oder Preis geändert.

Fachregel bleibt Mikails bestätigter Auftrag: ein gemeinsamer Konfigurator mit
schaltbaren Modulen, konkrete Produktgruppenoptionen vor Anlage bestätigen.
Edelstahl: acht Formen, 80 Größen, kein Foto, optional SVG-Logo mit bestehendem
Preis von 12,99 EUR. Keine zusätzlichen Produktionsrechte aus Modulschaltern.
Designs werden nicht bearbeitet; der bestehende Design-Master bleibt verbindlich.

**Nur vorbereitet:** kein Server-/Shopify-Zugriff, keine produktive Datenbank-
oder Profilzuweisung, kein Main-Merge. Private Ausführungsschalter bleiben aus.
Isolierte Tests dürfen ihre eigenen temporären Datenbanken verwenden.

## Erhalt und Nachweis

- Zentrierung in normaler Desktop- und Vollansicht, kompakte Aktionen,
  Vorschauknöpfe, Freiflächen-Doppeltipp, Bewegung/Zoom/Reset und R15-Aufbau
  bleiben bytegleich zur aktuellen Basis. Sämtliche CSS-Dateien bleiben erhalten.
- Der neue SVG-Viewport-Worker aus `151d8825` bleibt unverändert. Seine Tests
  bestätigen gültige unterschiedliche Außen-/ViewBox-Verhältnisse und
  bytegleiche bereits akzeptierte v1-Ausgaben.
- Erste sechs zulässige Motive, drei authentifizierte Designkarten, sichtbare
  Font-/Motivkarten, begrenzte Queue und Produktseiten-Warmup bleiben erhalten.
  Ein öffentlicher persistenter Designvorschaucache ist ein eigener Auftrag.
- R15 liest `gravuru-configurator-modules/v1` mit fester ID/Revision und sieben
  vollständigen booleschen Schaltern. Ohne Profil gilt die bisherige native
  Freigabe; mit Profil greifen dieselben Schranken in UI, direktem Aufruf,
  Gestaltung, Logo-Upload und Preis-/Warenkorbprüfung.
- Die unverändert gelesene echte r4-Datei hat SHA256
  `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`.
  Beide Logo-Profile erhalten 251 Designs, acht Formen, 80 Größen, sämtliche
  404 Optionskombinationen und Grundpreise, Ressourcen, Geometrien und
  Startdesign. Der Quellstand wird nicht geschrieben. Bestehende Live-Bindungen
  und Bestellungen wurden nicht geöffnet oder geändert.

## Gezielte Prüfungen

274 unterschiedliche Fälle in 23 Testdateien. Im ersten parallelen Lauf
273 bestanden; eine Datei traf unter Windows auf `EPERM`, weil zwei Tests
dieselbe temporäre Builddatei umbenannten. Der betroffene Testlauf
`lazy-resources.test.mjs` anschließend allein: 17/17 bestanden. Keine
Produktcodeänderung oder Sollwertanpassung wegen dieses Testlaufkonflikts.

Geprüft wurden Modulvertrag inklusive Cross-Realm-Daten, Foto/Logo und native
Fähigkeiten, Manipulationsablehnung, Preis-/Altstandskompatibilität,
Galerie-/Variantenwechsel, Shop-Einstieg/Warmup, SVG-Import und gespeicherte
Ausgaben, sichtbares Nachladen, frühe Karten, Queue, Touch/Zoom/Reset,
R15-Präsentation und tatsächlicher öffentlicher Asset-Importgraph.

Build erfolgreich: 154 Module, 16 Styles, Editor-Bundle
`editor-622e0d4afd819f7c.mjs`, 1.448.642 Bytes / gzip 483.407 Bytes.
30 Fonts und 703 Motive bleiben einzeln nachladbare Ressourcen. Dies ist ein
lokaler Buildnachweis und kein Ersatz für den Build mit den tatsächlichen
aktiven Styles beim Root-Release. Eine neue Browser-/Live-Abnahme fand nicht statt.

Testbefehle und Ergebnisse:
`docs/reviews/2026-11-08-r15-modules-current/verification.json`;
lokale vollständige Protokolle unter `outputs/r15-modules-current-20261108/`.

## Anschluss an PR214: Vertrag geprüft, nicht ausgeführt

Der getrennte Aktivierungsadapter `57f6f70` verwendet dieselbe
`config.moduleProfile`-Struktur und `applyModuleProfile`. Seine feste r4-
Fähigkeitsquelle und aktuellen Zielköpfe bleiben getrennt. Er bindet ausdrücklich
benannte tatsächliche Profil-IDs und unveränderliche Revisionen an die bestehende
Registry, Bestätigung, Journal, native CAS-/404-Bindungsfreigabe und gespeicherte
Zusatzpreisverträge. Die Kundenprüfung bleibt V2-kompatibel; kein V3-Preisformat
wird durch diesen Patch eingeführt. Alte profilfreie Revisionen bleiben lesbar.

Beide PR214-Schalter sind standardmäßig aus. Dieser Patch aktiviert keinen
Adapter und ordnet keinem Kundenprodukt ein Profil zu. Der ausführende
PR214-Adapter benötigt weiterhin eigenen unabhängigen Schlussreview und echte
Mount-/Planabnahme auf dem aktuellen privaten Verwaltungsstand. Die früheren
isolierten PR214-Nachweise wurden hier nicht erneut als Live-Erfolg ausgegeben.

## Sicherung, enges Paket und nächster Schritt

Vor der Übernahme wurde ein lokales Quellarchiv der berührten Bereiche erstellt:
`outputs/r15-modules-current-20261108/base-app-backup.tar`, SHA256
`19611bba7cb7a38d5663199439f54a4178dba08643d17db481306519411c4689`.
Das ist eine Quellsicherung, keine Server-/Datenbanksicherung.

`scripts/package-r15-modules-current.mjs` erzeugt ausschließlich die zwölf
Quellen plus zehn Vorherdateien, SHA-Manifest und rein lesenden Prüfer. Alle
Präsentationsmodule, Styles, SVG-Worker und Warmup-Dateien sind zusätzlich als
unverändert zur Basis gehasht. Bekannte abweichende Live-CSS wird niemals durch
Git-CSS ersetzt; die Schutzliste ist ein Vorher/Nachher-Nachweis dieser Integration.

1. Root führt den parallel geprüften Cachepatch und dieses Moduldelta auf der
   dann aktuellen Basis zusammen. Mögliche gemeinsame Dateien sind
   `shop-entry.mjs` und `shop-design-gallery.mjs`; Modulguards und Cacheprüfungen
   müssen beide erhalten bleiben. Abweichende Vorher-SHAs verbieten blindes Kopieren.
2. Aktive Quellen frisch hashen und sichern. `node verify.mjs --before <runtime>`
   prüft nur die zwölf betroffenen Pfade. Dann ausschließlich diese Quellen in
   eine getrennte vorbereitete Runtime übernehmen, `--after` prüfen und dort bauen.
3. Root prüft den tatsächlichen Kundenaufbau, Nachladen/SVG, Foto/Logo an und aus
   mit isolierten Profilen sowie Warenkorb und Wiederöffnung. Das aktive r4-
   Produkt bleibt bis zu einer ausdrücklichen bestätigten Profilzuordnung unverändert.
4. Erst danach private PR214-Anbindung separat reviewen, tatsächlichen Profilplan
   samt 251/404-/Preisnachweis zeigen und bestätigen. Keine stillen neuen Bindungen.

Rücknahme vor erster Profilaktivierung: zehn gesicherte Vorherquellen und
vorheriges Bundle kontrolliert wiederherstellen; zwei neue, unreferenzierte
Moduldateien nur im geprüften Ziel entfernen. Keine Produkt-/DB-Rücknahme.
Nach Speicherung eines Modulprofils keinen profilunkundigen Leser aktivieren;
fachliche Rücknahme über neue bestätigte Revision, historische Stände erhalten.
