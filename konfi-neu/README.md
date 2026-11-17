# Konfigurator – Neuaufbau (`konfi-neu`)

Stand: 17.11.2026 · Branch `dev/konfi-neu-20261117-claude` · Auftrag von Chris im Chat: alles neu denken und
einmal neu aufbauen, nichts löschen.

**Kurz:** Ein zweiter, eigenständiger Konfigurator neben dem bestehenden. Er liest denselben Katalog, ist am Handy
nach unter einer Sekunde bedienbar, legt eine Gestaltung mit zwei Anfragen in den Warenkorb und hat für die
Produktanlage ein einziges Abgleich-Werkzeug. **Nichts davon ist live.** Der bestehende Konfi unter `app/`
ist unverändert; R15 bleibt die freigegebene Kundenoberfläche, bis Chris etwas anderes entscheidet.

## 1. Warum neu: die Befunde

Drei getrennte Code-Analysen und eigene Messungen. Belege in Klammern.

### Ladezeit

- Der Start ist eine **Kette aus drei Seiten**: Produktseite → Fenster-iframe auf der App-Domain → darin ein
  zweites iframe mit dem Editor. Der Editor wird erst angefordert, nachdem die Modellantwort da ist
  (`app/workshop/ui/shop-entry-page.mjs:18-50`).
- Das Editor-Paket hat **1,4 MB, nicht minifiziert** (430 KB komprimiert), dazu 375 KB HTML. Darin stecken zwei
  Oberflächen übereinander und Code, den der Start nicht braucht (`app/configurator/variant-m/bundle-build.mjs`).
- **Schriften kommen als JSON mit Glyphenpfaden**, 0,3 bis 1,1 MB je Schrift, und blockieren den ersten Bildaufbau.
- **Ein einziger Node-Prozess** liest je Anfrage bis zu 12 MB große Produktdokumente aus SQLite und kopiert
  11-MB-Modelle (`app/workshop/repository.mjs:106`, `app/workshop/http.mjs:251-288`). Nach jedem Neustart dauert
  der erste Abruf 6 bis 8 s.
- Dokumentiert unter gedrosseltem Handy-Netz (150 ms, 1,6 Mbit/s): **7,5 bis 10,9 s** bis bedienbar, 1,9 MB
  (`docs/handoffs/2026-11-16-p02-kernpaket`).

### Warenkorb

- Eine Position durchläuft rund **zehn Anfragen**, 17 Tabellen, 10 Arten von Tokens und Signaturen.
  Das Übergabe-Token liegt nur im Arbeitsspeicher (`app/workshop/shop-entry.mjs:111`): Ein Neustart bricht
  laufende Übergaben ab.
- Die Preisfunktion **vertraut Zählern in den Zeilenangaben** (`ops/shopify/master-release/price-v1.mjs:42-48`).
  Abweichungen fallen erst nach der Zahlung auf (offene Befunde F02, F14).
- **Höchstens 14 Gestaltungen je Warenkorb**, weil die Funktion an Shopifys Rechenlimit stößt.
- „Bearbeiten“ hängt am Browser-Speicher der App-Domain im iframe: anderes Gerät oder älterer Tab = kein Zugriff.

### Produktanlage

- **Mindestens elf getrennte Schreibwege** nach Shopify, je Produktlinie eigene Skripte. Kein gemeinsamer Abgleich.
- Die Zuordnung Variante ↔ Konfigurator liegt in eigenen Tabellen mit 60-Sekunden-Frist und Blöcken von 100.
  Gemischte Stände führten zu 409-Fehlern (30 Bindungen auf Revision 1, 778 auf Revision 2).
- Preise sind an bis zu sechs Stellen gespeichert; Abweichungen sind belegt (158 Variantenpreise, `STATUS.md`).
- Deploy: von Hand gebaute Pakete in 3,4-MB-Teilen, Umschalten per Textersetzung in `app.cjs`.

## 2. Der neue Aufbau

```
Katalog (gravuru-katalog.)                       einzige Quelle für Formen, Größen, Preise, Designs, Schriften
   │  node publish/publish.mjs                   einmal je Änderung, 70 s für den ganzen Katalog
   ▼
dist/daten/   kleine Dateien mit Inhalts-Hash    vom Webserver oder CDN, dauerhaft zwischenspeicherbar
   p/<produkt>.json   Familie + Startdesign in EINER Datei (Ø 15 KB übertragen)
   d/ g/ f/ s/ m/ v/  Designs, Auswahl je Größe, Familien, Schriften (WOFF2), Motive, Vorschaubilder
   ▼
Produktseite im Shop
   konfi.js (1 KB)  →  editor.js (18 KB übertragen)     direkt in der Shop-Seite, kein iframe
   ▼
„In den Warenkorb“
   1. POST /api/gestaltungen   Server prüft, rechnet den Preis nach, speichert unveränderlich
   2. POST /cart/add.js        eine Zeile mit Kennung, unterschriebener Preisangabe, Bild, Bearbeiten-Link
   ▼
Shopify   Preisfunktion prüft die Unterschrift · Kassenprüfung sperrt nur ungültige Zeilen
   ▼
Webhook orders/paid  →  bestellpositionen (jede Zeile mit Status „bereit“ oder „klaeren“ + Grund)
```

| Ordner | Inhalt |
|---|---|
| `core/` | Modell, Preis, Prüfung, Zeichnen, Unterschrift – läuft gleich in Browser, Server und Tests |
| `publish/` | Katalog → Dateien. `katalog-adapter.mjs` ist die einzige Stelle, die bestehende Fachlogik aus `app/` nutzt |
| `editor/` | Kundenoberfläche (Layout wie R15: Reiter Ausführung, Designs, Text, Motive, Foto) |
| `server/` | Dateien ausliefern, Gestaltungen speichern, Fotos annehmen, Bestellungen empfangen. Vier Tabellen |
| `shopify/` | Theme-Bausteine, Preisfunktion und Kassenprüfung (Rust), Referenzlogik |
| `abgleich/` | Shop lesen und Plan gegen den Katalog erzeugen; schreibt die Bindungsdatei |
| `dev/` | Test-Shop, Durchlauf- und Messskripte |
| `test/` | 19 automatische Tests |

### Entscheidungen im Aufbau und ihr Grund

1. **Veröffentlichen statt zur Laufzeit rechnen.** Der Kundenweg liest nur fertige Dateien. Fällt der
   Node-Prozess aus oder startet neu, lädt der Konfigurator trotzdem.
2. **Kein iframe.** Der Editor läuft in der Shop-Seite (eigener Bereich per Shadow DOM, das Theme bleibt
   unberührt). Damit entfallen zweite Domain, Sitzungstoken, Übergabe-Token und Speicherprobleme im iframe.
3. **Schriften als WOFF2.** 80 Schriften zusammen 2,3 MB statt 15 MB; geladen wird nur, was die Gestaltung nutzt.
   Ligaturen und kontextabhängige Varianten sind in der Darstellung aus, damit jeder Browser und die Fertigung
   gleich setzen.
4. **Der Warenkorb trägt den Zustand.** Kennung, Preisangabe und Bearbeiten-Zugang stehen in der Zeile. Der
   Server hält die Gestaltung dauerhaft; im Arbeitsspeicher liegt nichts Wichtiges.
5. **Unterschriebene Preisangabe.** Der Server unterschreibt Aufpreis und Staffel zusammen mit Gestaltung und
   Variante. Der Variantenpreis kommt aus Shopify selbst. Preisverträge in Metafeldern entfallen.
6. **Bindung über die SKU.** Größe und Befestigung ergeben die SKU; der Abgleich schreibt daraus eine Datei
   `bindung.json`. Keine Bindungstabellen, keine Fristen.
7. **Fachlogik wird nicht neu erfunden.** Welche Designs für welche Größe freigegeben sind, Konturen und
   Bohrbilder kommen beim Veröffentlichen aus den bestehenden, abgenommenen Funktionen.

## 3. Gemessen

Lokal, Chromium, Test-Shop. Netzprofil „Handy“ wie in den bisherigen Messungen: 150 ms Latenz, 200 KB/s.
Je fünf Läufe, Median. Skripte: `dev/messen.cjs`, `dev/messen-warenkorb.cjs`.

| Messung | Alt (dokumentiert) | Neu |
|---|---:|---:|
| Handy kalt: Klick → bedienbar | 7,5 bis 10,9 s | **0,84 s** |
| dasselbe mit 4-fach gedrosseltem Prozessor | nicht gemessen | 0,93 s |
| Handy warm (zweiter Besuch) | 3,5 bis 4,6 s | 0,08 s |
| Desktop kalt | rund 0,6 s lokal | 0,16 s |
| Übertragene Daten bis bedienbar | 1,9 MB | 140 KB |
| Anfragen bis bedienbar | 19 bis 35 | 4 bis 5 |
| „In den Warenkorb“ → Warenkorb steht (Handy) | rund 10 s (iPhone-Test 29.10.) | **1,8 s** |
| Anfragen für eine Warenkorbposition | rund 10 | 2 |
| Editor-Code, komprimiert | 430 KB | 18 KB |

**Einschränkungen dieser Zahlen:** Die alten Werte stammen aus der Dokumentation und von anderen Produkten
(Acryl-Testmodell, Cardea), nicht aus einem direkten Vergleichslauf. Der Live-Server war aus dieser Umgebung
nicht erreichbar. Der neue Editor kann noch weniger als der alte (Abschnitt 5). Auf einem echten Handy und über
den echten Server ist noch nichts gemessen.

Vollständiger Kundenweg (`dev/durchlauf.cjs`, Desktop und Handy-Emulation): gestalten, Form und Befestigung
wählen, Design wechseln, Text ändern, Motiv einfügen und verschieben, Warenkorb, aus dem Warenkorb bearbeiten,
Position wird ersetzt. Beide Läufe bestanden, Preise stimmen mit dem Katalog (19,99 € → 22,48 € → 24,17 €,
bei 3 Stück 5 % → 68,88 €). Bildschirmfotos: `docs/handoffs/2026-11-17-konfi-neu/`.

## 4. Starten

```bash
npm install
```

```bash
node publish/publish.mjs --katalog <Pfad zum Katalog> --produkte dev/produkte-beispiel.json
```

```bash
node publish/vorschauen.mjs
```

```bash
node build.mjs
```

```bash
node server/server.mjs --dev
```

Danach http://127.0.0.1:8970/testshop/ öffnen. Tests: `npm test`.
Schriften brauchen beim Veröffentlichen Python mit `fonttools` und `brotli`.

## 5. Was noch fehlt

Ehrlich und nach Gewicht. Nichts hiervon ist versteckt eingebaut oder vorgetäuscht.

1. **Funkklingelschilder sind drin, aber noch nicht an Shopify gebunden.** Siehe Abschnitt 5a.
2. **Fertigungsdatei.** Der Bestelleingang speichert die Gestaltung, erzeugt aber noch kein PDF/SVG mit Text als
   Pfaden. Die bestehende Exportstrecke ist nicht angeschlossen.
3. **Oberfläche ist nicht R15.** Aufbau und Reiter sind angelehnt, aber neu gebaut. Es fehlen u. a.: Ausweichen
   bei Bohrung und Schraube (Entscheidung 3.40), Hilfetexte (ⓘ), Vollbild, Logo-Upload, Freistellen,
   Mengenstaffel-Anzeige, mehrsprachige Texte, „Oval“ statt „Ellipse“ als Kundenname (3.27).
4. **Fotos** sind mit einer Funkklingel im Browser bis in den Warenkorb durchgespielt (synthetisches Testbild).
   Nicht geprüft: Designs mit festem Fotofeld (Gedenktafeln), echte Handyfotos, HEIC, Freistellen.
5. **Shopify-Funktion** ist als Programm gebaut und gegen die Referenz geprüft, aber nicht als Erweiterung
   verpackt und nicht in Shopify gelaufen. Rechenschritte sind nicht gemessen. Siehe `shopify/README.md`.
6. **Abgleich** erzeugt den Plan und die Bindung, schreibt aber noch nichts nach Shopify. Das Anwenden ist
   bewusst ein eigener, freizugebender Schritt.
7. **Vorschau gegen Bestand.** Verglichen wurde ein einziges Design (TRE-V2A-7x2-D5) mit dem bestehenden
   Renderer `scripts/render-vorlagen.mjs`: Lage und Größe von Text und Linien stimmen. Ein Vergleich aller
   Designs fehlt und gehört vor jede Freigabe (Kontaktbogen nach Design-Master).
8. **82 Vorschaubilder fehlen** für Schiefer-Größen, die im Katalog noch keinen Preis haben und deshalb nicht
   veröffentlicht sind. Die übrigen 16.235 Bilder entstehen je Material.
9. **Nur am Bildschirm geprüft:** kein echtes iPhone, kein Safari, kein Lauf über Plesk.

## 5a. Funkklingelschilder

Seit 17.11. abgedeckt: alle 42 Geräte mit drei Formaten (Hochformat 16 × 28, Querformat 24 × 20, Länglich 35 × 18),
4.032 Designs, 126 Produkte. Quelle ist der Katalog (`migrationen/funkklingeln-42x3-20261027`); Lage der Klingel,
Gegenposition und Designs rechnet beim Veröffentlichen die bestehende Logik (`publish/klingel.mjs`).

- **Aufbau:** Edelstahlplatte unten, Acrylglas darauf. Der Rahmen ist der sichtbare Edelstahlrand. Graviert wird
  nur auf dem Acryl; die Klingel liegt als Bild darüber und ist fest.
- **Auswahl:** Format, Klingelposition, Rahmen und Farbe als Auswahllisten, Befestigung als Bildkacheln
  (Entscheidung 3.37). Die Klingelposition ist keine Shop-Variante und steht deshalb in der Warenkorbzeile.
- **Preise** aus dem Katalog: 49,99 / 59,99 / 69,99 € je Format, Befestigung +0 bis +5,99 €. Geprüft:
  24 × 20 mit Schrauben = 63,68 €.
- **Hinter der Klingel wird nie graviert** (Entscheidung 3.33): Texte werden neben der Klingel eingepasst, und
  der Warenkorb weist Elemente ab, die auf der Klingel liegen.
- **Foto** (Chris, 17.11.2026): Hochladen, Ausschnitt, Verschieben; Darstellung in Graustufen, weil graviert wird.
  9,99 € je Foto. Im Browser bis in den Warenkorb durchgespielt (59,99 € + 9,99 € = 69,98 €).
- **Schraubenkopf 5 mm** (Entscheidung 3.39, von Chris am 17.11. für Funkklingeln bestätigt).
- **Gemessen** (Handy-Profil, kalt, 5 Läufe, WP Cardea 2): bedienbar nach **1,36 s** mit 194 KB. Für dasselbe
  Gerät sind beim bestehenden Konfi 7,5 s dokumentiert.

Offen bei den Funkklingeln:

1. **Bindung an Shopify steht** (Abschnitt 5b): alle 84 aktiven Funkklingel-Produkte mit je 120 Varianten.
2. **Designs der Querformate** entstehen mit demselben Erzeuger wie der Live-Stand (Revision 2), sind aber nicht
   mit der Server-Datenbank verglichen.
3. **Mindestgrößen** (Hausnummer ≥ 20 mm, Zusatzzeilen ≥ 6 mm, Entscheidung 3.33) werden nicht geprüft – im
   bestehenden Konfi auch nicht.
4. **Abstand zur Klingel:** Abgewiesen wird nur Überlappung, kein 5-mm-Abstand (wie im Bestand).
5. **Positionswechsel** lädt das Design neu; eigene Texte bleiben, eigene Verschiebungen nicht.
6. **Schriften Nunito und Poppins** gibt es im Katalog nur als Glyphendaten. Daraus baut die Veröffentlichung
   WOFF2-Dateien mit denselben Buchstabenformen. Der Lizenznachweis ist laut Katalog offen.
7. **Darstellung nicht mit dem Bestand verglichen**, auch nicht Bild für Bild.

## 5b. Bindung an den Shop (Stand 17.11.2026)

Gelesen wurden die öffentlichen Produktdaten von `gravuru-design.myshopify.com` (kein Zugangsschlüssel, nur
lesen): `abgleich/shop-lesen-oeffentlich.mjs`. Ergebnis von `abgleich/abgleich.mjs` in `abgleich/stand-20261117/`:

| | |
|---|---:|
| aktive Produkte im Shop | 87 |
| davon einem veröffentlichten Konfigurator-Produkt zugeordnet | 87 |
| gebundene Varianten | 10.340 |
| Preisabweichungen Shop gegen Katalog | 0 |
| fehlende Varianten | 0 |

- **Funkklingeln:** 84 Produkte × 120 Varianten = 10.080, zugeordnet über die Optionswerte (Farbe, Format und
  Rahmen, Befestigung) und gegen das Format in der SKU geprüft.
- **Edelstahl-Türschild „Form und Größe selbst wählen“:** 250 von 404 Varianten gebunden. Die öffentlichen Daten
  liefern höchstens 250 Varianten je Produkt; für die übrigen 154 ist ein Abzug mit Admin-Leserecht nötig
  (`abgleich/shop-lesen.mjs`).
- **Acryl-Türschilder (2 Produkte):** je 5 Varianten in Schwarz gebunden. Die je 5 Varianten in Anthrazit kennt
  der Neuaufbau noch nicht: Im Katalog sind Schwarz und Anthrazit zwei Familien, im Shop eine Farbauswahl in
  einem Produkt. Das fehlt noch.
- Der Server liest die Datei über `GRAVURU_BINDUNG`. Eine Auswahl ohne gebundene Variante wird als „nicht
  bestellbar“ abgewiesen, nie mit einem geratenen Preis verkauft.
- Geschrieben wurde nichts. Der Plan enthält keine einzige schreibende Maßnahme.

## 6. Offene Punkte für Chris

- **Zuständigkeit:** `PRIO-KONFI.md` legt fest, dass nur Mika den gemeinsamen Konfi ändert. Dieser Neuaufbau
  liegt deshalb getrennt und ersetzt nichts. Ob er R15 ablösen, ergänzen oder nur als Vorlage für einzelne
  Teile dienen soll (z. B. zuerst nur Veröffentlichung und WOFF2-Schriften im bestehenden Konfi), ist deine
  Entscheidung.
- **Funkklingel: Zusatzmotive.** Foto mit 9,99 € je Foto ist von dir am 17.11. bestätigt. Offen ist, ob Kunden
  bei Funkklingeln auch Motive aus der Bibliothek hinzufügen dürfen (bei Türschildern 1,69 € je Motiv). Bis
  dahin ist der Reiter „Motive“ bei Funkklingeln aus, wie im bestehenden Konfi. Logo bleibt ebenfalls aus.
- **Fotopreis:** Im Katalog steht für Schiefer 22 × 14 „jedes weitere Foto 8,99 €“; das Entscheidungsregister
  nennt 9,99 € als neueren Wert (1.20). Der Neuaufbau nimmt den Katalogwert.
- **Schriften kürzen:** OFL-Schriften werden auf lateinische Zeichen reduziert. Vier Schriften fehlen als Datei
  im Katalog (Ashley Marie, Soulmate, Standlist, Daniel Black).
- **Anthrazit:** Die Anzeigefarbe für Acryl anthrazit (`#3a3d40`) habe ich gewählt; sie ist nicht aus einer
  Quelle.
- **Offene Katalogwerte**, die das Veröffentlichen meldet: 3 Größen ohne Grundpreis, 16 Befestigungen ohne
  Preis oder Bohrbild (`dist/daten/stand.json`, Abschnitt `hinweise`).
