# Umsetzungsplan: Produktfamilien, Plugin-Designs, Bohrbilder und Veröffentlichung

Stand **13.10.2026** · Verfasser: Claude (Master-Operator „gravuru 2027") · Branch `task/plugin-design-pipeline-20261013` · Basis `4e2713b` (Anwendungscode = installierter Stand `7a168bc`).

Dieses Dokument ist der verbindliche Bauplan für die nächsten Pakete. Es ersetzt keine früheren Nachweise und behauptet keine fertigen Funktionen. Prüfgrundlage: [Claude-Prüfbericht vom 12.10.](../reviews/CLAUDE-PRUEFBERICHT-20261012.md).

---

## 1. Ziel in einem Satz

Designs entstehen im ChatGPT-Plugin **Product Design**. Alles danach läuft ohne KI und ohne Handarbeit: automatisch vorbereiten, prüfen, in passende Produkte importieren, dem Kunden mit der echten Form, Größe und Befestigung zeigen und kontrolliert veröffentlichen.

## 2. Getroffene Entscheidungen

| Thema | Entscheidung | Quelle |
| --- | --- | --- |
| Designerstellung | Im ChatGPT-Plugin „Product Design" (Abo, nicht API). Die Werkstatt übernimmt Vorbereitung, Prüfung und Import ohne KI. | Nutzer 12./13.10. |
| Trennung | **Design** = Texte, Motive, Foto. **Hauptprodukt** = Form, Größe, Material, Bohrbild, Befestigung, Zubehör, Preise. Das Plugin liefert nie Geometrie oder Preise. | Masterbegriffe 04.10. |
| Motive über Bohrlöchern | **Erlaubt**, ohne Hinweis. | Nutzer 13.10. |
| Texte über Bohrlöchern | **Hinweis**, keine Sperre. | Nutzer 13.10. |
| Fotos über Bohrlöchern | Erlaubt, ohne Hinweis (dort wird ohnehin gebohrt). | Claude |
| Schutzzone | **1 mm** um den Lochrand. | Nutzer 13.10. |
| Bohrungspreise | Aus den vorhandenen Stammdaten übernehmen: dort ist die Bohrung (B02/B04) eine eigene SKU **ohne Aufpreis**. | Nutzer 13.10. (Preise liegen vor), Stammdaten |
| Stammdaten-Excel | Wird später vom Nutzer erstellt. Bis dahin dienen die vorhandenen Stammdaten (s. Abschnitt 2a) als Testgrundlage. | Nutzer 13.10. |
| Testmaterial | Edelstahl-Türschilder für Familie/Bohrbild/Veröffentlichung; die sechs vorhandenen Plugin-Designs 13–18 (Acryl UV) für die Plugin-Strecke. | Claude |
| Wissensablage | **Eine** Werkstatt-Datenbank mit **Produktfamilien** als eigener Ebene. Pro Familie ein automatisch erzeugtes **Familien-Briefing** für eigene Chats/Projekte. Keine getrennten Datenbanken pro Familie. | Nutzer-Anregung 13.10., Entscheidung Claude |
| Veröffentlichung | Shopify-Veröffentlichung und Fertigungsfreigabe bleiben je ein bewusster Klick. Alles andere ohne Doppeleingabe. | Claude |
| Reihenfolge | Erst **eine** Familie vollständig durchziehen (Edelstahl-Türschilder), dann die anderen Familien. Formprodukte und AOSU-Fertigung zurückgestellt. | Claude |
| KI-Budget der Werkstatt | Für diese Strecke nicht nötig. Separat vereinfachen (Paket H). | Claude |

## 2a. Bereits vorhandene Grundlagen (13.10. geprüft)

**Edelstahl-Stammdaten:** `Chris83638w/gravuru-shopify`, `platform/sources/workshop-seed/import.json` (Stand `b564422`):
- 61 Edelstahlschilder 1,5 mm in fünf Formgruppen: Rechteck 27, Ecken R5 10, Oval 10, Quadrat 7, Ellipse 7.
- Je Produkt Maße, Eckenradius, Grundpreis in Cent, SKU (`GR-ES-OV-90X60-T15`) und Bohrbild als Regel (`count`, `edgeMm`, Ø 4 mm, SKU-Endung `-B02`/`-B04`), z. B. Oval 90 × 60: 2 Löcher, 6 mm Randabstand, 10,99 €.
- Randabstände 4/6/8/15 mm je nach Größe; Großformate 4 Löcher.
- Dazu 148 native Designs und 721 Motive.
- Kein Bohrungsaufpreis in den Daten. Zum Vergleich: Schiefer B02 2,99 €, B04 3,99 €; Edelstahl-Gedenktafel 30 × 20 vier Löcher 2,99 € (`steel-builder/PREISE.md`).

**Plugin-Designs:** Privates Release `resources-acrylglas-150x200-20260929` im selben Repository, beide ZIPs am 13.10. heruntergeladen, SHA-256 identisch mit Dokumentation, nur privat außerhalb Git entpackt:
- Sechs Acryl-UV-Designs 13–18 (150 × 200 mm) als PDF mit **benannten PDF-Ebenen**: `02 Foto - austauschbar`, `03 Rahmen und Schmuck`, `04 Botanische Dekoration`, `05 Titel - editierbarer Text`, `06 Namen - editierbarer Text`, `07 Datum - editierbarer Text`, `08 Spruch - editierbarer Text`, teils `01 Farbflächen`/`01 Namensfeld`.
- Texte sind **echter Text** (z. B. „Jule & Finn"), Foto und Dekoration getrennt als PNG mit Alpha, Vorschau-PNG je Design.
- Design 18 zusätzlich als bearbeitbare SVG (bisheriger Pilot).
- Schriften im PDF nur als Teilmengen: Garamond, Segoe Script, Georgia Bold, Calibri. Für Kundentexte werden vollständige Werkstatt-Schriften zugeordnet (vorhanden: Garamond Acryl, Freestyle Acryl). Segoe Script, Georgia und Calibri sind Microsoft-Schriften; Nutzungsrechte für die Werkstatt sind nicht belegt. Ersatz wird ausdrücklich gekennzeichnet.

Folge: Die Exportvorgabe (Paket D) übernimmt **dieses vorhandene Ebenenschema** statt ein neues zu erfinden. Der Serienlauf (Paket E) liest PDF-Ebenen direkt.

**Warum eine Datenbank statt mehrerer:** Familien teilen Schriften, Motive, Profile, Bestellungen und Shopify-Bindungen. Getrennte Datenbanken würden diese Daten doppeln, Sicherung und Wiederherstellung vervielfachen und familienübergreifende Suche unmöglich machen. Die Trennung, die du willst („nicht immer neu erklären"), entsteht über die Familie als Datensatz plus das daraus erzeugte Briefing. Die Familie wird **einmal** gepflegt, Chats, Plugin, Importer und Konfigurator lesen alle dieselbe Quelle.

---

## 3. Zielablauf

```
Produktfamilie (einmal gepflegt, z. B. „Edelstahl-Türschilder")
  ├─ Formen, Größen, Material, Bohrbild-Regeln, Befestigungen, Preise, Schriften
  ├─ → Gestaltungsschablonen (SVG je Form/Größe, mit Bohrlöchern und Schutzzonen)
  └─ → Familien-Briefing (Text + Schablonen für ChatGPT-Projekt / Claude-Projekt)
          │
          ▼
ChatGPT „Product Design" gestaltet nach Briefing + Exportvorgabe
          │  Ordner je Design: design.svg, deko-*.png, beispielfoto.*, original.png
          ▼
Serienlauf (Skript, ohne KI)
  ├─ Ebenen am Namen erkennen → Importpaket je Design
  ├─ Prüfbericht je Design × Variante (Schriftzeichen, Auflösung, Maße, Texte im Bohrbereich …)
  └─ Übersichtsseite: Original | Werkstatt-Vorschau mit Testnamen/-foto je Variante
          │
          ▼
Werkstatt-Import (Mehrfachimport, 1:1 oder konturgerecht eingepasst)
  → in ein Produkt oder alle passenden Produkte der Familie
          │
          ▼
Kundenkonfigurator: echte Form, Bohrlöcher je Befestigung, Schutzzonen, Text-Hinweis
          │
          ▼
Shopify-Entwurf (Varianten + Preise + Vorschaubilder) → bewusster Klick „Veröffentlichen"
          │
          ▼
Bestellung → unveränderlicher Stand → Fertigungsdatei (Bohrungen als Schnitt, Hinweis bei Text im Bohrbereich)
```

---

## 4. Voraussetzung: P1-Fehler zuerst

Diese vier Fehler liegen direkt auf der Strecke und werden **vor** Paket A behoben (je eine kleine Korrektur plus Test, siehe Prüfbericht):

| Fehler | Warum er hier blockiert |
| --- | --- |
| P1-4 Vorbereitete Pakete nutzen auf Stahl die Acrylfläche | Genau der Importweg der Plugin-Designs |
| P1-3 Kundenansicht zeigt Stahl-Vektorgravur grau | Edelstahl ist die erste Familie |
| P1-1 Gravurdatei schwärzt Weiß und Fotos | Fertigung der ersten Familie |
| P1-2 Überlagerte Elemente nicht anklickbar | Importierte Designs bestehen aus vielen Ebenen |

---

## 5. Pakete

### Paket A · Produktfamilien als Datensatz

**Zweck:** Alles, was für eine Produktreihe gilt, wird einmal festgehalten und von allen Stellen gelesen.

**Datenmodell** (neue Tabelle `product_families` in `workshop.sqlite`, mit Revisionen wie Produkte):

| Feld | Beispiel Edelstahl-Türschilder |
| --- | --- |
| `id`, `name` | `steel-door-signs`, „Edelstahl-Türschilder" |
| `material` | Edelstahl gebürstet, 1,5 mm, Verfahren `steel-engraving` |
| `shapes[]` | Rechteck (Eckenradius 0/3 mm), Oval |
| `sizes[]` | 90 × 60, 120 × 80, … mit Grundpreis in Cent und SKU-Baustein |
| `mountingRules[]` | siehe Paket B (K00 ohne, B02, B04, Abstandshalter …) mit Aufpreis in Cent |
| `designArea` | Randabstand in mm (Vorgabe 0), Schutzzonen-Maß |
| `fonts[]` | zugelassene Werkstatt-Schriften für diese Familie |
| `skuPattern` | `GR-ES-{form}-{b}X{h}-T15-{befestigung}` |
| `briefingNotes` | Stil, Zielgruppe, Do/Don't (frei, vom Händler gepflegt) |

**Produkte** verweisen auf ihre Familie (`familyId`, `familyRevision`). Eine neue Familienrevision ändert bestehende Produkte **nicht** automatisch. Die Werkstatt zeigt „Familie geändert: übernehmen?" mit Vorschau der Auswirkung (vorhandene Profil-Auswirkungsprüfung wiederverwenden).

**Anlegen der Familie:**
- Aus den vorhandenen Stammdaten (Abschnitt 2a, 61 Produkte) per Import-Skript mit festem Schlüssel je SKU. Später aus der Stammdaten-Excel des Nutzers (gleiches Feldschema, Abgleich statt Duplikat).
- Oberfläche: Verwaltung → Produktfamilien (Liste, Bearbeiten, Revisionen).
- Aus einer Familie lassen sich **Produkte erzeugen**: Form × Größe → je ein Werkstattprodukt mit Befestigungsoptionen als Varianten. Wiederholtes Erzeugen erzeugt keine Duplikate (fester Schlüssel je Form/Größe).

**Familien-Briefing:** Knopf „Briefing herunterladen" erzeugt eine ZIP mit
- `BRIEFING.md`: Familie in Klartext (Formen, Größen, Bohrbilder, Schutzzonen, zugelassene Schriften, Stilnotizen, Exportvorgabe aus Paket D)
- `schablonen/*.svg`: Gestaltungsschablonen je Form/Größe (Paket C)
- `schriften.txt`: exakte Schriftnamen, die das Plugin verwenden darf

Dieses Paket legst du einmal in ein **ChatGPT-Projekt „Edelstahl-Türschilder"** (für das Plugin) bzw. ein Claude-Projekt (für Entwicklungs- und Prüfarbeit). Dann musst du dort nichts mehr erklären. Ändert sich die Familie, wird das Briefing neu erzeugt und im Projekt ersetzt.

**Abnahme A:**
- Familie Edelstahl-Türschilder mit 90 × 60 Rechteck und Oval, K00 und B02 angelegt, gespeichert, wieder geöffnet, Revision 2 erzeugt, Revision 1 unverändert.
- Zwei Produkte daraus erzeugt, erneutes Erzeugen ohne Duplikat.
- Briefing-ZIP enthält alle Formen/Größen, Schablonen bytegleich bei gleicher Revision.

### Paket B · Bohrbild als Regel

**Heute:** Bohrlöcher sind feste Koordinaten je Option. Der Konfigurator zeigt sie, die Fertigungsdatei schneidet sie. Größenwechsel mit Bohrbild ist gesperrt. Motive/Texte werden bewusst nicht gegen Löcher geprüft. Beim Heimathafen-Produkt fehlen die Löcher.

**Neu: Regel statt Koordinaten**

```json
{ "id": "B02", "label": "2 Bohrlöcher links/rechts", "layout": "left-right",
  "diameterMm": 4, "edgeMm": 6, "keepoutMm": 1, "priceCents": 0,
  "spacers": false }
```

| `layout` | Lage | Rechteck | Oval |
| --- | --- | --- | --- |
| `left-right` | mittig links/rechts, `edgeMm` von Lochmitte zum Rand | ✅ | ✅ (horizontal zur Kontur gemessen) |
| `top-bottom` | mittig oben/unten | ✅ | ✅ (vertikal gemessen) |
| `corners` | vier Ecken, `edgeMm` zu beiden Kanten | ✅ | ❌ abgelehnt mit Erklärung |
| `top-center` | eine Bohrung oben mittig | ✅ | ✅ |

- Eine Funktion `holesFor(geometry, rule)` berechnet die Löcher für jede Größe/Form. Vorschau, Prüfung, Preis, Schablone und Fertigung nutzen **nur** diese Funktion.
- Bestehende feste Koordinaten bleiben gültig (Altbestand). Neue Produkte nutzen Regeln.
- Damit fällt die Sperre „Größenänderungen mit festem Bohrbild" weg: Bei neuer Größe werden die Löcher mit gleichem Durchmesser und gleichem Randabstand neu berechnet, nicht proportional verschoben.
- Serverprüfung: Loch vollständig in der Kontur (vorhanden), Mindestabstand zwischen Löchern, Durchmesser 2–10 mm.
- Abstandshalter (vorhandene Vorschau mit Kappen und Farbaufpreis) hängen an der Regel.

**Heimathafen-Korrektur:** Neue Revision des Edelstahl-Produkts mit K00 und B02 (Ø 4, 6 mm, ohne Aufpreis laut Stammdaten). Bestehende Revision 3 bleibt erhalten, keine Designänderung.

**Abnahme B** (Prüfdaten aus G27-03 plus Nutzerbeispiel):
- 90 × 60 Oval, B02, Ø 4, 6 mm → Löcher bei (6 | 30) und (84 | 30).
- 120 × 80 Rechteck, Ø 4, Randabstand 8 → zwei bei (8 | 40)/(112 | 40), vier bei (8 | 8)/(112 | 8)/(8 | 72)/(112 | 72).
- Größenwechsel 90 × 60 → 120 × 80 mit B02/6 mm → (6 | 40)/(114 | 40), Randabstand bleibt 6 mm.
- `corners` auf Oval wird mit verständlicher Meldung abgelehnt.
- Fertigungsdatei enthält die Löcher als Schnittkontur, **keine** Schutzzonen.

### Paket C · Darstellung für Kunde und Händler

- **Bohrlöcher** als echte Aussparung (vorhanden), zusätzlich **Schutzzone** als dezenter gestrichelter Ring (Lochrand + `keepoutMm`, Vorgabe **1 mm**), nur in der Vorschau.
- Beim **Ziehen** eines Elements werden die Schutzzonen deutlicher eingeblendet.
- **Texte:** Berührt ein Text eine Schutzzone, erscheint ein Hinweis: „Dieser Text liegt im Bereich eines Bohrlochs. Dort wird gebohrt; Teile des Textes können fehlen." Keine Sperre. Der Hinweis erscheint einmal zusätzlich vor „In den Warenkorb".
- **Motive und Fotos:** kein Hinweis.
- **Befestigungswechsel** (z. B. K00 → B02): Löcher und Zonen erscheinen sofort; betroffene Texte zeigen den Hinweis.
- **Bestellstand** speichert `textNearHole: true` je betroffener Position. Die Fertigungsübersicht zeigt das als Prüfvermerk.
- Händler-Editor zeigt dieselben Zonen und Hinweise.

**Abnahme C:** Browserprüfung Desktop/Mobil auf 90 × 60 Oval B02: Text auf (6 | 30) zeigt Hinweis, Motiv auf (6 | 30) zeigt keinen, Wechsel K00 → B02 zeigt Löcher sofort, Export-SVG ohne Zonen und Hinweis, Bestellstand enthält den Vermerk.

### Paket D · Exportvorgabe für das Plugin

Eine feste, kopierbare Anweisung (Teil des Familien-Briefings). **Grundlage ist das Ebenenschema, das das Plugin bei 13–18 bereits verwendet hat** (Abschnitt 2a). Zwei gleichwertige Lieferformen:

**Form 1 – PDF mit benannten Ebenen (bereits vorhanden):** eine Seite in Endmaß, PDF-Ebenen `NN Rolle - …`: `Foto - austauschbar` → Fotofeld, `<Name> - editierbarer Text` → Kundentextfeld, alle übrigen → feste Dekoration/Motiv. Foto und Dekoration zusätzlich als PNG mit Alpha (wie `Einzelobjekte/`).

**Form 2 – SVG-Ordner** (für Gravur und neue Designs):

```
<design-id>/
  design.svg          Pflicht
  deko-*.png          optional, Transparenz als echter Alphakanal
  beispielfoto.jpg    optional, wird nur Vorschau
  original.png        optional, Mockup zum Vergleich
  design.json         optional: Name, Kategorie, Kundenrechte-Abweichungen
```

**Regeln für `design.svg`:**
- `width`/`height` in mm, `viewBox="0 0 B H"`, Maße exakt wie die Schablone der Zielgröße.
- Oberste Ebenen sind `<g id="…">` mit festen Namen:

| Ebenenname | Inhalt | Wird zu |
| --- | --- | --- |
| `foto-<name>` | genau ein Bild mit Maske (Rechteck, Kreis oder Bogen) | Fotofeld, Bild = Beispielfoto |
| `text-<name>` | genau ein `<text>`, `text-anchor="middle"`, Schrift aus `schriften.txt` | bearbeitbares Kundentextfeld |
| `motiv-<n>` | Vektorgrafik | festes Motiv (einzeln anwählbar) |
| `deko-<n>` | Vektor oder eingebettetes PNG | feste Dekoration |

- Texte **als echten Text**, nicht in Pfade umwandeln. Kein Text im Dekobild.
- Keine Transformationen/Stile auf Ebenen (vorher auflösen), keine Skripte, keine externen Links.
- Gravurprodukte: Motive einfarbig schwarz auf transparent, keine Graustufenflächen.
- Schutzzonen der Schablone für Texte freihalten. Motive dürfen darüber.

**Abnahme D:** Die sechs vorhandenen Designs 13–18 (Form 1) und mindestens ein neues Edelstahl-Design (Form 2) laufen ohne Nacharbeit durch Paket E.

### Paket E · Automatische Vorbereitung und Serienlauf

**Erweiterung `scripts/prepare-layered-design.py`:**
- Zuordnungsdatei wird optional. Rollen werden aus den Ebenennamen (Paket D) abgeleitet. Die bisherige explizite Zuordnung bleibt für Altfälle (Design 18) gültig.
- Fotomasken Rechteck und Kreis zusätzlich zum bestehenden Bogen.
- Textfelder erhalten `fieldKey`/`label` aus dem Namen (`text-namen` → „Namen").
- **Neuer Eingang PDF-Ebenen** (Form 1): Ebenen über die PDF-Ebenenstruktur (OCG) einzeln rendern bzw. auslesen; Text mit Position, Größe, Farbe, Ausrichtung aus dem Textlayer; Foto aus der Fotoebene mit Maske; übrige Ebenen als Dekoration. Schriftteilmengen werden **nicht** übernommen, sondern über eine Zuordnungstabelle Familie → Werkstatt-Schrift ersetzt und im Bericht als Abweichung genannt.

**Neues Kommando `scripts/prepare-design-series.py`:**

```sh
python3 scripts/prepare-design-series.py \
  --input  /PRIVAT/plugin-ausgaben/edelstahl/ \
  --family steel-door-signs \
  --output /PRIVAT/importpakete/edelstahl-2026-10-13/
```

Erzeugt:
- je Design `<id>.json` (Importformat `gravuru-prepared-design/v1`)
- `bericht.json` und `bericht.csv` mit Status Grün/Gelb/Rot je Design × Variante
- `uebersicht.html`: links Original, rechts Werkstatt-Vorschau **mit demselben Renderer wie Konfigurator** (Node, `studioSvg`), mit Testnamen „Änne & Jörg Müller-Lüdenscheidt", Testfoto, je Form/Größe/Befestigung

**Prüfungen (ohne KI):**

| Prüfung | Ergebnis |
| --- | --- |
| Maße passen zu einer Familiengröße | Rot, wenn nicht |
| Schrift zugelassen und vorhanden | Rot |
| Zeichenabdeckung inkl. ÄÖÜäöüß € – „ " | Gelb mit fehlenden Zeichen |
| Rasterauflösung ≥ 300 dpi auf Endgröße | Gelb |
| `<text>` in Deko/Motiv-Ebene | Rot |
| Text berührt Schutzzone einer Befestigung | Gelb mit Variante |
| Motiv über Bohrloch | nur Info |
| Ebenen ≤ 20, keine aktiven Inhalte | Rot |
| Gravur: Graustufen in Motiv | Gelb |

Rote Designs erzeugen kein Paket. Wiederholter Lauf mit gleichen Dateien erzeugt gleiche Pakete (Prüfsumme), ohne Duplikate.

**Abnahme E:** Design 18 (Altzuordnung) unverändert reproduziert; Designs 13–17 aus den PDF-Ebenen ohne Zuordnungsdatei; ein absichtlich fehlerhaftes Design (Text in Deko, fehlendes ß, 150 dpi) liefert die erwarteten Rot/Gelb-Meldungen; Übersicht sichtbar geprüft.

### Paket F · Import in die Werkstatt

- **1:1-Platzierung**, wenn Paketmaße = Produktmaße (± 0,5 mm). Sonst **konturgerechte Einpassung** über `designArea()` und `fittedArtwork()` (behebt P1-4 dauerhaft). Die Vorschau zeigt „1:1" oder „eingepasst auf xx %".
- **Mehrfachimport:** mehrere Pakete auf einmal wählen → Liste mit Status je Design → „Alle gültigen übernehmen" erzeugt **eine** neue Produktrevision. Konflikt mit neuerer Revision → nichts übernommen, Meldung.
- **In mehrere Produkte:** „Auf Produkte der Familie anwenden" nutzt die vorhandene Stapel-Jobverwaltung (Wiederaufnahme, Fehler je Produkt, `expectedRevision`). Jedes Design wird nur in Produkte übernommen, deren Größe/Form es laut Bericht verträgt.
- **Kompatibilität:** Jedes Design speichert, für welche Formen/Größen/Befestigungen es geprüft ist. Der Konfigurator bietet nur passende Designs an.

**Grenze, bewusst benannt:** Designs werden heute **pro Produkt kopiert**, höchstens 60 Designs je Produkt. Für Phase 1 reicht das. Eine zentrale Design-Bibliothek, auf die Produkte nur verweisen, ist ein größerer Umbau und wird erst entschieden, wenn die erste Familie läuft und die echte Designanzahl bekannt ist.

**Abnahme F:** 5 Pakete gleichzeitig in 2 Produkte der Familie; 1:1 auf 90 × 60 bestätigt; Oval-Produkt bekommt nur geeignete Designs; Wiederholung ohne Duplikate; parallele Änderung erzeugt Konflikt statt Überschreiben.

### Paket G · Shopify und Veröffentlichung (für die erste Familie)

- Shopify-Entwurf mit **Varianten aus der Familie** (Form/Größe × Befestigung) und Preisen in Cent aus dem Produktstand.
- **Vorschaubilder** je Design und Variante aus demselben Renderer übertragen (heute fehlt die Medienübertragung).
- **Aktualisieren** eines bestehenden Entwurfs nach neuer Revision (heute nur Neuanlage).
- **Status-Ampel** je Produkt: Design fertig → Kundenansicht geprüft → Shopify-Entwurf → öffentlich → Fertigung freigegeben.
- **„Veröffentlichen"** als bewusster Klick mit Zusammenfassung (Preis, Varianten, Designs).
- Vorher aus dem Prüfbericht beheben: Storno/Erstattung empfangen (P2-8), Teilannahme statt Ablehnung (P2-9), hängende Übertragung (P2-10).

**Abnahme G:** Echte Testbestellung im Shopify-Testmodus für Edelstahl 90 × 60 Oval mit B02 und Text nahe Bohrloch: Preis stimmt, Bestellstand mit Hinweisvermerk, Fertigungsdatei mit Bohrungen als Schnitt, Stahlgravur schwarz, Weiß frei; **danach eine echte Gravurprobe**.

### Paket H · KI-Budget vereinfachen (klein, parallel möglich)

- Harte Grenze bei OpenAI: eigenes Projekt, Guthaben, automatische Aufladung aus.
- In der Werkstatt: Reserve nach tatsächlichem Höchstpreis statt pauschal 4,26 €; Freigabe bei Fehlerantwort/Abbruch; Kostenklärung per Knopf statt Dauersperre; Kurs als Einstellung; Ablauf der Preisprüfung nur als Warnung; Tageslimit.
- Erneuerung der Preisprüfung **vor dem 10.11.2026**, falls H bis dahin nicht fertig ist.

---

## 6. Reihenfolge

| Schritt | Inhalt | Ergebnis für dich |
| --- | --- | --- |
| 1 | P1-Fehler 1–4 | Stahl beim Kunden schwarz, Gravurdatei korrekt, Import auf Stahl passt |
| 2 | Paket A (Familie Edelstahl-Türschilder) + Briefing | ChatGPT-Projekt „Edelstahl-Türschilder" einrichten, nichts mehr erklären |
| 3 | Paket B + C | Bohrlöcher als Regel, sichtbar mit Schutzzone und Text-Hinweis |
| 4 | Paket D + E | Plugin-Designs → Serienlauf → Übersichtsseite |
| 5 | Paket F | Mehrfachimport in alle passenden Edelstahlprodukte |
| 6 | Deine Bedienabnahme | feste Checkliste auf echtem Shopify-Zugang |
| 7 | Paket G + Gravurprobe | erstes öffentlich bestellbares Produkt |
| 8 | Nächste Familien | Acryl, Schiefer … nach demselben Muster |
| parallel | Paket H | KI-Budget ohne Sperrfallen |

Jedes Paket: eigener Commit, Tests für den **Nutzerablauf** (nicht nur die Funktion), Browserprüfung, `STATUS.md` fortschreiben, keine Live-Änderung ohne deine Freigabe.

## 7. Noch offen beim Nutzer

1. **Stammdaten-Excel Edelstahl:** kommt später; bis dahin Test mit den vorhandenen Stammdaten.
2. **Bohrungsaufpreis:** aus Stammdaten ohne Aufpreis übernommen. Falls Edelstahl-Türschilder doch einen Aufpreis haben, genügt eine Zahl.
3. **Schriftersatz** für Segoe Script, Georgia Bold, Calibri: Vorschlag folgt mit Vergleich im Serienbericht; Entscheidung dann dort.

## 8. Bewusst nicht in diesem Plan

- Keine automatische Veröffentlichung, keine automatische Fertigungsfreigabe.
- Keine Formprodukt-Fotos und keine AOSU-Fertigungsausgabe vor Abschluss der ersten Familie.
- Keine Vektorisierung flacher Fotos, keine erfundenen Schriften oder Produktionsprofile.
- Kein direktes Hochladen aus ChatGPT in die Werkstatt in Phase 1. Optional später über einen eingeschränkten Zugang, der nur Entwürfe in einen Eingangskorb legt.
