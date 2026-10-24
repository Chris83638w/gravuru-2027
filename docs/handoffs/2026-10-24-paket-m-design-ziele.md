# Paket M · Ein Design für mehrere Materialien, Verfahren, Linien und Formen · 24.10.2026

Für **Astra High** (Codex, GPT-5, Reasoning high). Basis: Code `main` (≥ diesem Commit), Katalog `main` (≥ c11f968).
Überarbeitet nach einer ausführlichen Befragung von Chris am 24.10. (siehe „Produktwissen“). Nichts davon erfinden
oder umdeuten. Was hier offen ist, bleibt offen.

## Produktwissen (Chris, 24.10.2026)

**Shop-Struktur**
- Gravur und Druck sind **getrennte Produkte**, in Shopify und Amazon gleich.
- SKU für Druck: Präfix **UV** statt GR, sonst gleich (z. B. `UV-ES-RE-120X80-T15`).
- **Eigenes Produkt je Material.** Ausführungen innerhalb eines Materials sind **je Linie verschieden** eigenes
  Produkt oder Variante:
  - Acryl: transparent, schwarz, anthrazit, weiß, rosa, satiniert, bedruckt, babyblau
  - Holz: Eiche, Buche, Kirsche, Walnuss
  - Schiefer: natur, premium

  Die Linie muss das festlegen können.
- Beide Verfahren gibt es bei Edelstahl, Schiefer, Acrylglas und Holz.
- Linien mit beiden Verfahren: Tür-/Namensschilder, Gedenktafeln/Grabschmuck, Hausnummern, Hinweis-/Firmenschilder,
  Türklingeln, Boxenschilder, Hundeschilder, Schlüsselanhänger, Lineal, Stiftehalter, Standherzen, Acrylglasbilder,
  Brettchen, Kinderzimmerschilder, Weihnachtsanhänger, Grabstecker, Grabkreuze.
- Die Ausführung bei Druck ist meist identisch zur Gravur (Größen, Stärke, Bohrungen, Befestigung). Bei einzelnen
  fertigen Produkten weicht sie ab.
- Preise: Druck hat eine **eigene Preisliste** (Foto-/Farbaufpreise stehen darin). Grundsätzlich soll die
  Preisliste künftig entstehen, wenn Chris eine CDR-Linie liefert. Heute gibt es keine Druckfamilie für Edelstahl,
  Schiefer oder Holz.

**Gestaltung**
- Druck darf farbig sein: farbige Startdesigns (aus Corel und von Astra mit dem Product-Design-Plugin), und der
  Kunde färbt zusätzlich um (Farbwahl wie im vorhandenen Muster-Konfi).
- Fotos sind grundsätzlich überall möglich (Druck auf allen Materialien; Gravur auf Schiefer, Edelstahl, Acryl,
  Holz). Ob ein Produkt Fotos hat, hängt am Produkt. Freistellen bestimmt das Design.
- Nie Gravur und Druck auf derselben Platte.
- Acryl-Druck je Produkt vorne oder hinten, Weiß-Unterdruck je Produkt (Familie). Der Druckexport existiert
  (`print-export*.mjs`: Roland/Mimaki, Weiß motif/full/none, Spiegeln, Beschnitt, 300/600 dpi).
- Gravurwirkung laut Materialbibliothek (`processing-profiles.mjs`, `material-presentation.mjs`): Edelstahl dunkel,
  Schiefer fast weiß, Acryl weiß-matt, Holz dunkelbraun. **Für Walnuss fehlt ein Ton.**
- Mindestschrift beim Druck wie bei der Gravur: **3 mm**. Feine Details: **Gravur auf V2A unter 0,5 mm
  Linienstärke ist kritisch** (Warnung).
- „Für außen geeignet“ wird je Familie gekennzeichnet.

**Ablauf**
- Designs sind **frei über Linien übertragbar**, auch auf **andere Formen** (Rechteck, Oval, Herz, Kreuz,
  Kontur), jeweils als **Variante**: automatisch eingepasst, mit eigener Vorschau und Freigabe.
- Ziele bekommt ein Design als **Vorschlag nach Thema, Chris bestätigt**.
- **Freigabe getrennt je Ziel.** Das **Team darf bearbeiten und freigeben**; der Urheber kommt aus der Sitzung.
- Neue Hauptprodukte für weitere Materialien und Verfahren: **nur Bestseller zuerst**, die Liste nennt Chris.
- Produktbilder: zuerst gerendert und natürlich wirkend, später Fotos für Bestseller.
- Nächste Linie nach Edelstahl-Türschildern: **Gedenktafeln Schiefer**.

## Paket M (dieser Auftrag): Ziele, Varianten, Vorschläge

Branch `dev/design-ziele-20261024-astra` (Code und Katalog, falls Daten betroffen), PRs gegen `main`, Bericht
`docs/handoffs/2026-10-24-paket-m-bericht.md`, Absatz oben in `STATUS.md`.

1. **Ziel = Familie (Material, Ausführung, Verfahren).** design.json bekommt `ziele` mit eigener `freigabe` je
   Ziel. Das bisherige `freigabe` gehört zum Ziel der eigenen Familie(n). Migration per Skript, erst Dry-run mit
   Zählern, dann `--apply`. Keine Freigabe darf verloren gehen oder dazukommen. Das Schema in `designs/README.md`
   dokumentieren.
2. **Linien.** Ein Design erscheint in einer Linie über ein Ziel der Linie. Import und `shop-sync` nehmen ein Design
   nur, wenn **das Ziel dieser Familie** freigegeben ist. Die Edelstahl-Startdesigns bleiben vorher und nachher gleich
   (Test). Die Linie bekommt eine Angabe, ob Ausführungen (Farbe, Holzart, natur/premium) eigene Produkte oder
   Varianten sind. Erst nur Schema, Validierung und Anzeige; Import und Shop folgen in einem eigenen Paket.
3. **Dashboard.**
   - Je Design: Ziele mit Vorschau auf der echten Oberfläche (`familyProductConfig`), Passung nach den Regeln des
     Verfahrens und Freigabe nach geöffneter Vorschau, wie in Paket I.
   - „Vorschläge“: Aus den Themen des Designs und den Unterkategorien der Linien schlägt das System Ziele vor;
     Bestätigen geht je Ziel oder gesammelt.
   - Eine Inhaltsänderung (Paket L) setzt **alle** Ziel-Freigaben zurück.
   - Unterkategorien (`themes`) per Häkchen aus `themen.json` über den bestehenden PATCH mit Protokoll.
   - Fehlt die Familie für ein Ziel (z. B. Druck auf Edelstahl), steht dort „Familie fehlt“, und der Fall kommt in den
     Bericht. Keine Familien, Größen oder Preise erfinden.
4. **Varianten** für ein anderes Seitenverhältnis, eine andere Form oder eine andere Linie: Erzeugung wie in
   `scripts/build-design-reihe.py`. Text bleibt Text, Motive bleiben Pfade, `transfer.from` verweist aufs Original,
   bei Contain-Einpassung wird die Abweichung in % angezeigt. Nie still strecken. Die Kennung folgt der README-Regel;
   ist sie unklar, frag Claude. Jede Variante hat eigene Ziele und Freigaben und ist im Editor (Paket L) bearbeitbar.
5. **Regeln:**
   - Mindestschrift 3 mm für Druck und Gravur.
   - Gravur auf V2A: Linien unter 0,5 mm → Warnung „prüfen“, mit Ort. Das gilt für Konturen von Motiven; nichts
     automatisch ändern.
   - Farbige Elemente oder Fotos auf einem Gravurziel melden „passt nicht“ mit Grund.
   - Ein einfarbiges Gravurdesign darf 1:1 auf ein Druckziel.
   - Walnuss-Gravurton in der Materialbibliothek ergänzen, als dunkle, kontrastarme Näherung, ausdrücklich als
     Näherung markiert.
   - Feld „für außen geeignet“ im Familienschema: optional, ohne Wert = unbekannt. Werte nicht erfinden.

**Abnahme:**
- Tests: Migration, Ziele, Freigabe/Rücksetzung je Ziel, Import/shop-sync je Ziel, Vorschläge, Varianten (Format,
  Form, Linie), Regeln, Themen-PATCH. Bestehende Tests grün; Linux-Vollauf macht Claude.
- Beispiel auf einer **Katalogkopie**: ein Schiefer-Hunde-Design 22×14 mit den Vorschlägen und Zielen Schiefer ·
  Gravur 22×14 (1:1), Edelstahl · Gravur 30×20 (Variante), Acryl 30×20 (Variante) und einer Form-Variante
  (z. B. Herz, falls eine Familie existiert, sonst „Familie fehlt“). Screenshots Desktop und iPhone.
- Bericht: fehlende Familien (Druck je Material, Holz, Formen) als Liste für Chris.

**Nicht in Paket M** (eigene Pakete danach):
- N: Druckfamilien und Preisliste aus CDR-Linien. Chris liefert die CDR-Linie, daraus entstehen Größen und
  Ausführungen und eine Preisliste zum Ausfüllen.
- O: Hauptprodukte für Bestseller ableiten (Liste von Chris).
- P: gerenderte Produktbilder je Material und Verfahren.
- Import und Shop für Ausführungen als Variante.

Regeln wie immer: keine Freigabe setzen, keine Live-Systeme, kein Import, kein Merge, kein Force-Push, nichts
erfinden, Kennungen stabil, LF-Zeilenenden, keine Schriftdateien ins Code-Repo.
