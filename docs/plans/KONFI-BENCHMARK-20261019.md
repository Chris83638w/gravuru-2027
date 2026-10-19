# Konfigurator-Benchmark: FPD × Zakeke × Gravuru-Konfi

Stand: 19.10.2026 · Chris / Claude · Quelle: Claude-Doc https://claude.ai/code/artifact/26b74f55-36f2-4e6d-af87-abdb97d89fd2

## Kurzfassung

Unser Konfigurator hat die Grundlagen von FPD und Zakeke bereits (Canvas, Schriften, Motive, Fotoeditor, Live-Preis, Fertigungspaket). Was fehlt, liegt fast komplett auf der Kundenstrecke: Entwurf behalten, nach dem Warenkorb nochmal ändern, Pflicht- und Zeichenlimits je Textfeld, Auflösungs-Ampel, Rückseite als eigene Fläche, Mengenstaffel, Serien mit Namensliste. Zakeke ist das stärkere Vorbild für Produktlogik (Printing Method, Templates mit Sperren je Element, Druckdatei je Fläche mit Summary); FPD ist das stärkere Vorbild für kleine Editor-Details (Text-Link-Gruppen, Farb-Link, Bounding-Box-Modi). Beides zusammen taugt nicht als Vorlage für Datenhaltung: beide pflegen Produkt für Produkt, wir pflegen Familie × Formatreihe × Thema und erzeugen daraus.

**Übernehmen (14 Punkte):** Verfahrensprofil steuert Werkzeuge, Schriften, Farben, Ausgabe · Vorlagen mit Sperren je Element und Pflichtbearbeitung · Zeichen- und Zeilenlimit je Feld mit Autofit · Text-Link- und Farb-Link-Gruppen · Auflösungs-Ampel als Hinweis (nie Sperre) · Elemente „sichtbar, nicht gravierbar“ · Druckdatei je Fläche + Summary + Originalfoto als ZIP · Entwürfe im Kundenkonto plus Absprungschutz beim Neuladen · Ändern nach dem Warenkorb · Design-Galerie je Thema mit Direktlink · Mengenstaffel · Zusatzfelder ohne Vorschau (Dropdown, Datum, bedingt) · Mobile-first-Layout statt geschrumpfter Desktop · Namensliste/CSV für Serien (später).

**Anders machen (7):** Preis nur aus Familie/Optionen/Unterkategorie statt Regel-Builder je Zeichen · Fläche = Plattenkontur aus der Zeichnung statt rechteckiger Bounding Box · Varianten aus Familie × Größe × Befestigung erzeugt statt Variantenmatrix von Hand · Designs aus Katalog je Formatreihe statt „Layout-Quellprodukt“ · Gravurvorschau als Materialrendering statt Schwellwert-Negativ · Ablauf als geführte Schritte (Optionen → Design → Text → Foto → Prüfen) statt freier Modulsammlung · Kunden-KI aus, KI nur in der Designerstellung.

**Weglassen (8):** UI-Composer mit mehreren Layouts · Facebook/Instagram/Pixabay-Quellen · Zeichnen, Neon, QR (QR allenfalls Firmenschilder später) · Preis je cm² / Dynamic Views · 3D/AR (vertagt seit 30.09.) · Pro-Verkauf-Gebühren und Produktlimits (Vorteil des eigenen Konfis) · Doppel-Produkte für Mobile · versteckte Duplikat-Produkte je Design im Shop.

## Ausgangslage

Drei Systeme, drei Bauweisen. FPD und Zakeke sind Mietkonfiguratoren, die Produkt für Produkt eingerichtet werden; unser Konfigurator wird aus dem Katalog erzeugt. Verglichen wird die **Shopify-Fassung** von FPD (gleiche Designer-Engine wie das alte WooCommerce-Plugin auf gravuru.de, aber eigene App-Integration), WooCommerce spielt keine Rolle mehr.

|  | Fancy Product Designer (Shopify-App) | Zakeke (Visual Customizer + 3D-Konfigurator) | Gravuru-Konfi (Codex-Konfigurator + Designwerkstatt) |
| --- | --- | --- | --- |
| Hersteller / Herkunft | Ganymede Apps UG, Mettmann; App seit 2018, „Built for Shopify“, nur Englisch | Zakeke (Italien); Shopify, Woo, BigCommerce, Wix, Etsy u. a. | Eigenentwicklung, Repo `gravuru-2027` (Branch `task/steel-master-data-20261016`), Katalog `gravuru-katalog` |
| Zielgruppe | Textil, Hüllen, Geschenke, Merch | Print-on-Demand und 3D-Konfiguration | Gravur und UV-Druck auf Platten: Edelstahl, Acryl, Schiefer, Holz, Alu-Dibond |
| Produktmodell | FPD-Produkt mit Views und Layern, je Shopify-Produkt eine „FPD Source“ | Produkt → Sides → Print Areas; Printing Method je Produkt/Variante/Side | Material → Familie (Rohling, alle Größen/Bohrbilder) → Formatreihe → Design → Linie → Unterkategorie |
| Preisbildung | Pricing-Rules-Builder (Add-on), Cart Transform in Shopify | Regeln je Textlänge, Elemente, Farben, Sides, Mengenstaffel; Shopify per Duplikat-Produkt | Nur serverseitig: Größe + Befestigung (Familie), Optionen, Unterkategorie-Überschreibung; Cent-genau |
| Kosten | 30–290 $/Monat, Basic nur 10 Produkte / 40 Bestellungen | Planpreis + 1,5–1,9 % je Custom-Verkauf, 10/50/100 veröffentlichte Produkte | Eigener Host (Plesk), OpenAI nur für Designerstellung mit Budgetsperre |
| Stand (Okt. 2026) | Live-Produkt, Nachfolger „Chamevo“ in Arbeit | Live-Produkt, neues Customizer-UI (mobile-first) | 769 Tests grün, P1-Fixes gebaut aber nicht installiert; Warenkorb nur im Schiefer-Prüfstand; kein echter Shopify-Klickablauf nachgewiesen |

Was der Gravuru-Konfi heute kann (Auszug aus der Inventur): Tabs Optionen/Designs/Text/Motive/Foto, Canvas mit Zoom, Undo, Hilfslinien, Ebenen, Mehrfachauswahl; Schriftgröße in mm mit Autofit ab 4 mm, Schriftprobe mit eigenem Text, Warnung bei fehlenden Zeichen; Fotoeditor (Zuschnitt, Spiegeln, Radierer), Upload bis 4 Dateien à 15 MB; Motivbibliothek mit Suche; Live-Preis mit Preisdetails; Bohrloch-Schutzzone 1 mm mit Hinweis; Fertigungspaket SVG/PDF/PNG mit Manifest, Profile Gravur (Stahl/Schiefer) und UV (Roland/Mimaki); Familienschema v2 mit Excel-Rundlauf; Design-Import ZIP/Ordner; KI-Design und KI-Bilder für den Händler. Nicht nachgewiesen: Kurventext, Rückseite im Kundeneditor, Mengenstaffel, Teilen, Nachbestellung, Bögen/Nesting, Produktionsfreigabe (`productionReady` nie `true`).

## Feature-Matrix FPD × Zakeke × Gravuru-Konfi

Lesart der Spalte Gravuru: **vorhanden** = im Code belegt, **teilweise** = Baustein da, Strecke nicht komplett, **fehlt** = nicht nachgewiesen. Spalte Entscheidung verweist auf Abschnitt Entscheidungen (Ü = übernehmen, A = anders, W = weglassen, – = haben wir schon).

**Einstieg und Produktwahl**

| Funktion | FPD | Zakeke | Gravuru-Konfi | Entscheidung |
| --- | --- | --- | --- | --- |
| Start aus der Produktseite | Button „Customize“, App-Block, Lightbox oder inline | Button, freier Editor; Edit-Link nach Warenkorb | Tab-Editor auf der Produktseite | – |
| Varianten (Größe, Form, Befestigung) | je Variante ein FPD-Produkt zuweisbar | Variantenmatrix aus dem Shop, Bild + Print Area je Kombination | Familie × Größe × Befestigung erzeugt (Edelstahl 61 Größen, 309 Varianten geprüft) | A1 |
| Verfahren steuert Werkzeuge | „Industry Mode Engraving“: nur Deckkraft/Negativ | Printing Method: Tools, Fonts, Farben, DPI, Output je Produkt/Variante/Side | Produktionsprofile Gravur/UV nur in der Ausgabe | Ü1 |
| Design-/Vorlagenauswahl | Layouts-Modul (Views eines Quellprodukts), Design-Kategorien | Template-Galerie mit Kategorien und Direkt-URL, Default je Variante | Tab Designs mit Vorschau und Textübernahme beim Wechsel | Ü10, A4 |
| Geführter Ablauf | nein (Module, optional Tour) | nur im 3D-Konfigurator (Steps) | Tabs ohne Fortschritt | A6 |
| Zusatzfelder ohne Vorschau | Names & Numbers (Plus) | Extra Options: Text, Datum, Dropdown, Checkbox, Swatch, bedingt, mit Aufpreis | Optionsgruppen (Zubehör/Variante) ohne Bedingungen | Ü12 |

**Editor**

| Funktion | FPD | Zakeke | Gravuru-Konfi | Entscheidung |
| --- | --- | --- | --- | --- |
| Flächenbegrenzung | Bounding Box rechteckig: Inside / Clipping / Limit / None; Freiform nur per SVG-Maske | Print Area gezeichnet, PNG-Maske oder PDF-Layer (Cut/Safety/Bleed) | Plattenkontur aus Zeichnung, Rand 2 mm (versteckt, P2-1), Bohrloch-Schutzzone | A2 |
| Mehrere Flächen / Rückseite | Views | Sides × Print Areas, je Variante abschaltbar | nur Rückseitendruck gespiegelt in der Fertigung | Ü15 |
| Ebenen, Undo, Zoom, Hilfslinien | ja (Manage Layers) | Design-Panel als Layerliste, Quick Actions | ja; Undo greift auch in Designverwaltung (P2-6) | – |
| Elemente sichtbar, nicht druckbar | offen | ja (Hilfslinien, Platzhalter) | Fotohinweis-Bitmap, nicht systematisch | Ü6 |
| Mobile | responsiv; Forum empfiehlt Duplikat-Produkte für Mobile | eigenes Mobile-first-Layout | Code für Touch da, nie auf Gerät geprüft | Ü13, W7 |
| Mehrere UI-Layouts | UI Composer: Sidebar, Topbar, Off-Canvas, eigenes CSS | ein UI | ein UI | W1 |

**Text**

| Funktion | FPD | Zakeke | Gravuru-Konfi | Entscheidung |
| --- | --- | --- | --- | --- |
| Schriften | 1 500 Google Fonts + eigene TTF, je Produkt | TTF/OTF-Upload, je Printing Method eingeschränkt | 75 freigegebene, Sets je Unterkategorie, Michroma + Lato immer | – (Katalog) |
| Zeichen-/Zeilenlimit je Feld | nur in Preisregeln | Max Characters (Standard 250), Min/Max je Template-Feld | `maxLength/maxLines` im Vertrag, kundenseitig nicht belegt | Ü3 |
| Autofit | kein offizielles (nur Wunsch) | Autofit-Textbox schrumpft in feste Fläche | `fitText` ab 4 mm, freie Position | Ü3 (haben Kern) |
| Kurventext | ja, Radius-Bug (springt auf 200) | ja | fehlt | W6 (nur Rundschilder später) |
| Verknüpfte Texte | Text-Link-Gruppen (Inhalt), Color Linking | nein | geplant | Ü4 |
| Pflichtbearbeitung | offen | je Feld „muss bearbeitet werden“, je Side Pflicht | nur Foto `required` | Ü2 |
| Sperren je Element | draggable/removable/resizable | Verschieben, Skalieren, Löschen, Farbe, Font, Kurve, Editieren | Rechte je Element, serverseitig lückenhaft (P2-7) | Ü2 |
| Farben | 1 Farbe = Picker, mehrere = Palette; Farbpreise | Palette je Printing Method, Farblimit, PNG je Farbe | Druckpaletten für UV | Ü1 |

**Fotos und Motive**

| Funktion | FPD | Zakeke | Gravuru-Konfi | Entscheidung |
| --- | --- | --- | --- | --- |
| Upload-Quellen | lokal, Facebook, Instagram, Pixabay, PDF/SVG | JPEG, PNG, SVG, PDF, EPS, AI bis 50 MB | JPG/PNG/WebP bis 15 MB, 4 Dateien, 9,99 € je Datei | W2 |
| Auflösungsprüfung | Rating gut/mittel/schlecht seit 4.5.4, blockiert nie | Soll-DPI (300) gegen Fläche; aus / ignorierbar / sperrt Warenkorb | serverseitig, Warnung unter 300 dpi | Ü5 |
| Freistellen | KI-Hintergrund | KI automatisch oder mit Dialog, Vectorizer (Credits) | Radierer manuell; Team stellt frei | A7 |
| Masken / Fotoform | Crop mit SVG-Masken (`fpd_masks`) | Shapes, Fillable Shapes als Platzhalter | Fotofeld Rechteck/Kreis/Bogen, Musterfoto | – |
| Motivbibliothek | verschachtelte Kategorien, SVG umfärbbar | Clipart je Produkt, bepreisbar, Recolor nur SVG | 721 Motive, Suche, Bestseller, umfärben auf Gravur/Druck | – |
| KI für Kunden | Bildgenerierung, Upscale | Bild- und Designgenerator (Credits) | aus; KI nur Händler | A7 |

**Preis**

| Funktion | FPD | Zakeke | Gravuru-Konfi | Entscheidung |
| --- | --- | --- | --- | --- |
| Regelwerk | Pricing Rules: Textlänge, Zeilen, Bildgröße, Elemente, Farben, Fläche | Regeln + Fixpreis/Setup, je Side, je Upload | 3 Ebenen aus dem Katalog, Cent-genau, serverseitig | A3 |
| Mengenstaffel | offen | ja (25 → 23/20/18) | fehlt (Menge 1–99 ohne Staffel) | Ü11 |
| Live-Preis | pauschal zugesagt | nicht belegt; Shopify rechnet im Warenkorb nicht neu | ja mit Preisdetails-Dialog | – |
| Shopify-Mechanik | Cart Transform (Shopify Functions) | unsichtbares Duplikat-Produkt je Design | Storefront-API, Preisrevision im Journal | W8 |

**Entwürfe, Warenkorb, Bestellung**

| Funktion | FPD | Zakeke | Gravuru-Konfi | Entscheidung |
| --- | --- | --- | --- | --- |
| Entwurf speichern | Save Design (Konto) | Konto; ohne Konto nur Browser-Cache | Server-Entwurf mit Token (Acryl); Neuladen verliert Entwurf (P2-5) | Ü8 |
| Ändern nach Warenkorb | offen | Edit-Link (nicht Wix/Etsy) | fehlt | Ü9 |
| Teilen / Nachbestellen | Website: ja | Save & Share, Re-order-API | fehlt | Ü9 (später) |
| Serien mit Namensliste | Names & Numbers | Bulk-Variantenformular, CSV (Grow) | nur Admin-Stapelimport | Ü14 |
| Bestellstand unveränderlich | ja (Order Viewer) | Design-ID + SKU im Dashboard | ja, Webhook `ORDERS_PAID`; Storno nur teilweise (P2-8) | – |

**Produktion und Admin**

| Funktion | FPD | Zakeke | Gravuru-Konfi | Entscheidung |
| --- | --- | --- | --- | --- |
| Druckdatei | Basic 72 dpi; Print-Ready PDF/PNG mit DPI, Fonts eingebettet, Layer ausschließbar, ZIP mit Fonts/Kundenbildern | je Print Area PDF/PNG/SVG/DXF 300 dpi, Original-Upload, Summary (Positionen, Hex, Fontnamen), Gravur bis 11 Dateien | SVG/PDF/PNG + Manifest als ZIP, Profile Roland/Mimaki (`RDG_WHITE`, `CutContour`), Bohrungen als Schnitt | Ü7 |
| Schrift in Pfade | offen | nein (SVG referenziert Fontnamen) | ja, Text bleibt bis zur Bestellung Text | – (Vorteil) |
| Bleed / Schnitt / Safety | nicht dokumentiert | PDF-Layer, gespiegelte Dateien, Print Files Builder (Layout, QR) | Spiegelung am Profil, nicht serverseitig erzwungen | Ü7 |
| Freigabeprozess | Order Viewer, Export | Dashboard mit Nachbearbeitung | `productionReady` nie `true` | eigene Anforderung |
| Bögen / Nesting | nein | Advanced Print Files Builder | fehlt | später |
| Datenhaltung | Postmeta je Produkt, Archiv-Export, Templates verknüpfbar | in Zakeke, kein Export zwischen Konten, API Orders/Designs | JSON im Katalog, Excel-Rundlauf, SQLite-Familien, Design-Import ZIP | – (Vorteil) |
| 3D / AR | 3D-Ansicht | 3D-Konfigurator, AR iOS/Android | 2D-Szene, AR vertagt | W5 |

## Entscheidungen: übernehmen, anders, weglassen

Maßstab für jede Entscheidung: Hilft es dem Kunden, ein Schild in unter drei Minuten fehlerfrei zu bestellen, und lässt es sich aus dem Katalog erzeugen statt je Produkt pflegen? Was beides nicht erfüllt, fliegt raus.

**Übernehmen**

| Nr. | Punkt | Vorbild | Begründung |
| --- | --- | --- | --- |
| Ü1 | Verfahrensprofil steuert Werkzeuge, Schriften, Farbpalette, DPI und Ausgabeformat | Zakeke Printing Method | Wir haben Profile nur in der Ausgabe. Gravur braucht keine Farbwahl, UV braucht Palette; das gehört an eine Stelle, nicht in jedes Produkt. |
| Ü2 | Vorlagen mit Sperren je Element und Pflichtbearbeitung | Zakeke Pre-designed Templates | Unsere Designs sind genau das: Platte + feste Motive + Kundenfelder. Sperren (Verschieben, Skalieren, Löschen, Farbe, Font) und „muss bearbeitet werden“ verhindern den häufigsten Fehler: Musterfamilie Mustermann wird bestellt. Rechte je Element gibt es, serverseitig muss es dicht sein (P2-7). |
| Ü3 | Zeichen- und Zeilenlimit je Textfeld, Autofit in die Fläche | Zakeke Max Characters / Autofit-Textbox | FPDs größte belegte Schwäche ist Text, der aus der Box läuft. Wir haben `fitText` ab 4 mm; fehlt nur das Limit am Kundenfeld und die Anzeige „12/30“. |
| Ü4 | Text-Link- und Farb-Link-Gruppen | FPD | Ein Name auf Vorder- und Rückseite oder in zwei Zeilen wird einmal getippt. Inhalt und Farbe getrennt verknüpfen, Einzelabweichung erlaubt. |
| Ü5 | Auflösungs-Ampel als Hinweis, nie als Sperre | Zakeke | Zakeke kennt drei Modi; wir nehmen nur den weichsten. Jedes Foto wird angenommen, das Team prüft in der Freigabe (Entscheidung 19.10.). |
| Ü6 | Elemente „sichtbar, nicht gravierbar“ | Zakeke | Foto-Upload-Hinweis, Bohrlochmarkierung, Abstandshalter-Vorschau sind Hilfen, keine Gravur. Heute Einzelfall-Logik, künftig ein Flag je Ebene. |
| Ü7 | Fertigungspaket je Fläche: Datei + Summary (Texte, Schriften, Positionen, Farben) + Originalfoto als ein ZIP; Spiegelung und Bohrungen serverseitig erzwungen | Zakeke Print-Ready, FPD Print-Ready-ZIP | Wir haben Manifest und Profile; fehlt die menschenlesbare Summary für die Werkstatt und die Garantie, dass das Profil (nicht der Client) spiegelt. |
| Ü8 | Entwürfe im Kundenkonto; Sitzungsschutz gegen Neuladen ohne Konto | Zakeke (als Negativbeispiel: ohne Konto nur Browser-Cache) | Wie FPD/Zakeke: Speichern braucht ein Konto (Entscheidung 19.10.). Der Browser-Cache-Weg von Zakeke ist kein Entwurf, aber als Absprungschutz auf demselben Gerät sinnvoll (P2-5). |
| Ü9 | Ändern nach dem Warenkorb; später Teilen und Nachbestellen als Kopie | Zakeke Edit-Link, Re-order | Jede Änderung erzeugt eine neue Konfigurations-Revision, der Warenkorb verweist auf die aktuelle. Nachbestellung = neue Revision mit aktuellem Preis. |
| Ü10 | Design-Galerie je Unterkategorie mit Direktlink und Vorschau mit eigenem Text | Zakeke Template-Galerie, FPD Design-Kategorien | Shop zeigt je Unterkategorie die Designs ihres Themas (Katalogregel 12). Direktlink `?design=<id>` für SEO-Seiten und Werbung. |
| Ü11 | Mengenstaffel | Zakeke | Firmenschilder, Boxenschilder, Schlüsselanhänger werden mehrfach gekauft. Staffel als Familien- oder Unterkategorie-Preis (Ebene 1/3 des Katalogs), nie als Regel-Builder. |
| Ü12 | Zusatzfelder ohne Vorschau: Dropdown, Datum, Checkbox, bedingt sichtbar | Zakeke Extra Options | Zubehör (Abstandshalter-Farbe, Kordel, Ständer) und Fertigungshinweise brauchen keine Canvas-Darstellung. Bedingung z. B. „Abstandshalter-Farbe nur wenn Abstandshalter gewählt“. |
| Ü13 | Mobile-first-Layout als eigener Zustand, nicht geschrumpfter Desktop | Zakeke neues UI | Annahme: unsere Kunden kommen überwiegend mobil (Amazon-Gewohnheit); vor dem Start mit den Shop-Analytics prüfen. Werkzeuge unten, Platte oben, ein Schritt je Bildschirm. |
| Ü14 | Serien mit Namensliste (CSV/Excel), ein Design, Staffelpreis | Zakeke Bulk-Variantenformular, FPD Names & Numbers | Später (nach Verkaufsstart). Eigener Kundenablauf neben dem Admin-Stapelimport, wie im Werkstatt-Plan vorgesehen. |
| Ü15 | Mehrere Flächen mit Flächen-ID (Vorder-/Rückseite, Sets) | Zakeke Sides × Print Areas | Nur wo physisch vorhanden (Brettchen, Anhänger, Acryl von hinten). Je Fläche eigene Produktionsdatei und eigenes Verfahrensprofil. |

**Anders machen**

| Nr. | Punkt | Statt (Vorbild) | So bei uns |
| --- | --- | --- | --- |
| A1 | Varianten erzeugen | Variantenmatrix von Hand (Zakeke), FPD-Produkt je Variante (FPD) | Familie × Größe × Befestigung aus `familien/*.json`; Shopify-Varianten werden exportiert, nie gepflegt. Bohrbilder je Größe berechnet, nie mitskaliert. |
| A2 | Gestaltungsfläche | rechteckige Bounding Box mit vier Modi (FPD) | Fläche = Plattenkontur aus der Corel-Zeichnung minus Rand minus Bohrloch-Schutzzone. Zwei Verhalten reichen: Text „innen mit Hinweis“, Foto „Clipping“. Rand sichtbar als feine Linie, nicht versteckt (P2-1). |
| A3 | Preis | Regel-Builder je Zeichen, Element, Farbe, Fläche (beide) | Drei Katalog-Ebenen: Größe + Befestigung, Optionen, Unterkategorie-Überschreibung. Text ist bei Gravur inklusive; Fotos 2 und 3 je 9,90 € sind Optionen, keine Regeln. Preis nur serverseitig, Cent-genau, mit Revision. |
| A4 | Designs | Layout-Quellprodukt (FPD), Template je Produkt (Zakeke) | Ein Design je Formatreihe im Katalog, per Skript auf alle Größen der Reihe und alle Familien umgerechnet. Keine Kopie je Produkt. |
| A5 | Gravurvorschau | Schwellwert-Negativbild (FPD Engraving Mode) | Materialrendering: helle Gravur auf Edelstahl-/Schiefer-Textur, Rückseitengravur bei Acryl von vorn lesbar. P1-3 (Stahl grau) ist genau dieser Punkt. |
| A6 | Ablauf | Modulsammlung mit Sidebar (FPD), freier Editor (Zakeke Customizer) | Geführte Schritte mit Fortschritt: Optionen → Design → Text → Foto/Motiv → Prüfen. Jeder Schritt frei anspringbar, Pflichtfelder vor „In den Warenkorb“ geprüft. Desktop zeigt Schritte als Tabs (haben wir), Mobile als Bildschirme. |
| A7 | KI | Kunden-KI mit Credits (Zakeke), KI-Bildwerkzeuge im Editor (FPD) | Kunden-KI aus. KI nur in der Designerstellung (ChatGPT-Aufträge, Werkstatt-Stapel) mit Budgetsperre. Freistellen bleibt beim Team, Radierer für den Kunden reicht. |

**Weglassen**

| Nr. | Punkt | Warum |
| --- | --- | --- |
| W1 | UI-Composer mit mehreren Layouts, eigenem CSS je Produkt | Pflegeaufwand ohne Nutzen; ein Layout, das zum Theme Hyper passt. |
| W2 | Facebook-, Instagram-, Pixabay-Upload | API-Keys, Datenschutz, Pixabay-Freigabe 24–48 h; lokaler Upload und Kamera (Datei-Dialog auf dem Handy) decken alles. |
| W3 | Zeichnen, Neon-Text, QR im Editor | Nicht gravierbar oder nicht unser Sortiment. QR allenfalls später für Firmenschilder, dann als Admin-Element mit Lesbarkeitsprüfung im Endmaß. |
| W4 | Preis je cm² / Dynamic Views | Unsere Größen sind feste Familien-Größen aus der Zeichnung; Freimaß bleibt Anfrage. |
| W5 | 3D-Konfigurator und AR | Entscheidung vom 30.09.2026: 2D-Szene zuerst. Geometrie-Referenzen (Kontur, Stärke, Sockel) trotzdem im Datenmodell vorsehen. |
| W6 | Kurventext | Erst wenn runde Schilder in einer Familie sind; FPDs Radius-Bug zeigt den Aufwand. |
| W7 | Duplikat-Produkte für Mobile | FPD-Forum-Workaround; bei uns ein Produkt, zwei Layouts (Ü13). |
| W8 | Verstecktes Duplikat-Produkt je Design im Shop | Zakekes Shopify-Mechanik verschmutzt den Katalog; wir übergeben per Storefront-API mit Line-Item-Eigenschaften und serverseitiger Preisrevision. Cart Transform (FPD) nur prüfen, wenn der Preis im Warenkorb anders nicht sauber geht. |

## Anforderungen je Übernahmepunkt

Priorität: **P1** vor Verkaufsstart, **P2** erste Wochen danach, **P3** Ausbau. Jede Anforderung ist so formuliert, dass sie sich mit einem Test oder einer Klickprüfung abnehmen lässt. Stand-Spalte aus der Inventur (vorhanden / teilweise / fehlt).

| Nr. | Anforderung | Prio | Stand |
| --- | --- | --- | --- |
| Ü1.1 | Jede Familie trägt genau ein Verfahrensprofil (`gravur-stahl`, `gravur-schiefer`, `gravur-acryl-rueck`, `uv-roland`, …). Das Profil legt fest: erlaubte Werkzeuge (Textfarbe ja/nein, Foto ja/nein), Schrift-Set, Farbpalette, Mindestlinienstärke, Soll-DPI, Ausgabeformat und Spiegelung. | P1 | teilweise (Profile nur in Ausgabe) |
| Ü1.2 | Der Editor blendet Werkzeuge aus, die das Profil verbietet; Gravurprodukte zeigen keine Farbwahl. Testfall: Edelstahl-Türschild hat keinen Farbwähler, UV-Acryl hat Palette mit genau den Profilfarben. | P1 | fehlt |
| Ü2.1 | Jede Ebene eines Designs hat Rechte: verschieben, skalieren, drehen, löschen, Farbe, Schrift, Inhalt ändern. Der Server lehnt Konfigurationen ab, die Rechte verletzen oder neue Ebenen anlegen (schließt P2-7). | P1 | teilweise |
| Ü2.2 | Textfelder können `required: true` tragen. „In den Warenkorb“ ist gesperrt, solange ein Pflichtfeld noch den Mustertext enthält; der Kunde sieht, welches. Testfall: Design mit „Familie Mustermann“ lässt sich nicht unverändert bestellen. | P1 | fehlt (nur Foto) |
| Ü3.1 | Jedes Textfeld hat `maxLength` und `maxLines`; Standard kommt aus dem Thema (`themen.json`): Namensschilder/Hausnummern 32 / 2, Gedenktafeln 78 / 4, Hinweis- und Firmenschilder 52 / 3; ein Design kann abweichen. Der Editor zeigt „12/32“ und nimmt kein weiteres Zeichen an. | P1 | teilweise (im Vertrag, nicht im Editor) |
| Ü3.2 | Autofit verkleinert bis zur Mindestgröße des Profils (Gravur 4 mm); wird sie unterschritten, bleibt die Mindestgröße und das Feld meldet „Text zu lang“. Kein Text darf die Fläche verlassen (FPD-Schwäche). | P1 | vorhanden (Kern), Meldung fehlt |
| Ü4.1 | Textfelder können einer Link-Gruppe angehören (`linkGroup: "name"`); Tippen in einem Feld füllt alle Felder der Gruppe. Einzelabweichung löst die Verknüpfung für dieses Feld mit sichtbarem Hinweis. | P2 | fehlt |
| Ü4.2 | Farb-Link getrennt vom Text-Link (`colorGroup: "akzent"`), nur bei Verfahren mit Farbwahl. | P3 | fehlt |
| Ü5.1 | Nach Foto-Upload berechnet der Server die effektive Auflösung aus Zuschnitt und Endmaß in mm. Ampel: grün ≥ Soll-DPI, gelb ≥ 60 % davon, rot darunter. | P1 | teilweise (Berechnung da) |
| Ü5.2 | Bei rot keine Sperre und keine Bestätigung: ein freundlicher Hinweis im Editor und ein Vermerk „Auflösung niedrig“ in Summary und Freigabe, damit das Team prüft. Jedes Foto wird angenommen (Entscheidung 19.10.). | P1 | fehlt |
| Ü6.1 | Ebenen im Design-SVG tragen `role: guide` (sichtbar, nicht in der Fertigungsdatei) oder `role: print`. Fotohinweis, Bohrlochmarkierung, Rand und Abstandshalter-Vorschau sind `guide`. Testfall: Fertigungs-SVG enthält keine `guide`-Ebene. | P1 | teilweise (Einzelfälle) |
| Ü7.1 | Fertigungspaket je Bestellposition = ein ZIP: je Fläche Produktionsdatei (SVG/PDF nach Profil), `summary.pdf` mit Vorschau, Texten, Schriften, Schriftgrößen, Positionen in mm, Material, Größe, Befestigung, Optionen; Originalfotos; `manifest.json`. | P1 | teilweise (Manifest da, Summary fehlt) |
| Ü7.2 | Spiegelung, Bohrungen als Schnittlinie und Schrift-in-Pfade werden ausschließlich serverseitig aus dem Profil erzeugt; ein Client-Flag kann sie nicht ändern. Testfall: Acryl-Rückseite liefert gespiegelte Datei, auch wenn der Client `mirror:false` sendet. | P1 | teilweise |
| Ü7.3 | Freigabeprozess: Status `eingegangen → geprüft → freigegeben → in Fertigung → fertig/Fehler`; `productionReady` wird nur durch eine Person oder eine bestandene automatische Prüfung `true`. | P1 | fehlt |
| Ü8.1 | Sitzungsschutz ohne Konto: Der Stand (inkl. Foto-Referenzen) wird lokal im Browser gehalten; Neuladen oder Tab-Absturz auf demselben Gerät stellt ihn wieder her (schließt P2-5). Nichts davon liegt auf dem Server. | P1 | teilweise (nur Acryl) |
| Ü8.2 | Entwurf speichern nur mit Kundenkonto (Shopify Customer Account): „Entwurf speichern“ führt ohne Konto zur Anmeldung/Registrierung; danach liegt der Entwurf mit Fotos serverseitig im Konto, Liste „Meine Entwürfe“, 90 Tage. Kein Gast-Entwurf, kein Mail-Link. | P1 | fehlt |
| Ü9.1 | Warenkorbposition trägt Konfigurations-ID und Revision; „Bearbeiten“ öffnet den Editor mit dieser Revision, Speichern erzeugt die nächste und ersetzt die Position samt Preis. | P1 | fehlt |
| Ü9.2 | Bestellhistorie zeigt „Nochmal bestellen“ = neue Revision mit aktuellem Preis und aktueller Familie; alte Größen, die es nicht mehr gibt, werden mit Hinweis auf die nächste Reihe eingepasst. | P3 | fehlt |
| Ü10.1 | Design-Galerie je Unterkategorie aus `themen.json`/`design.json.themes`; Reihenfolge: Bestseller, dann neu. Vorschau rendert den aktuellen Kundentext in jedes Design. | P1 | teilweise (Tab Designs) |
| Ü10.2 | Direktlink `?design=<design-id>&size=<sku>` öffnet den Editor vorbelegt; jede Unterkategorie hat eine eigene Shop-URL (Collection) mit ihrer Galerie. | P2 | fehlt |
| Ü11.1 | Staffelpreise je Familie (`sizes[].tiers`) und je Unterkategorie überschreibbar; Editor zeigt die Staffel neben der Menge; Warenkorb rechnet bei Mengenänderung serverseitig neu. | P2 | fehlt |
| Ü12.1 | Optionsgruppen können `visibleIf` tragen (z. B. Abstandshalter-Farbe nur bei gewählten Abstandshaltern) und Feldtypen Text, Datum, Dropdown, Checkbox ohne Canvas-Darstellung; Werte landen in Summary und Bestellung. | P2 | teilweise (Gruppen ohne Bedingung) |
| Ü13.1 | Unter 768 px eigenes Layout: Platte oben fixiert, ein Schritt je Bildschirm, Werkzeugleiste unten, Fortschritt sichtbar; Texteingabe öffnet die Tastatur, ohne die Platte zu verdecken. Abnahme auf echtem iPhone und Android, nicht nur im Emulator. | P1 | teilweise (Code, ungeprüft) |
| Ü14.1 | Serienbestellung: ein Design, Liste aus CSV/Excel oder Tabelle im Browser (Name je Zeile, Menge je Zeile), Vorschau je Zeile, Staffelpreis auf die Summe, eine Bestellposition je Zeile. | P3 | fehlt |
| Ü15.1 | Flächen mit ID (`front`, `back`) je Familie; je Fläche eigenes Profil, eigene Produktionsdatei, eigene Guide-Ebenen; der Editor wechselt per Reiter. Nur Familien mit physischer zweiter Fläche bekommen `back`. | P2 | fehlt |

**Eigene Anforderungen ohne Vorbild, aus dem Benchmark bekräftigt**

| Nr. | Anforderung | Prio |
| --- | --- | --- |
| E1 | P1-Fixes installieren (Gravurdatei schwarz, überlagerte Elemente, Stahl grau, Acryl-Fläche auf Stahl) und den echten Shopify-Klickablauf einmal mit Testzahlung durchlaufen; bis dahin kein Verkaufsstart. | P1 |
| E2 | Rand und Bohrloch-Schutzzone als feine sichtbare Linie zeigen (kein versteckter Standardrand, P2-1); Text im Bohrbereich nur mit Hinweis, keine Sperre (Entscheidung 13.10.). | P1 |
| E3 | Eine ungültige Position lehnt nur diese Position ab, nicht die ganze Bestellung (P2-9). | P1 |
| E4 | Schriftupload prüft Ä, Ö, Ü, ß, € und Ziffern; Schrift ohne diese Glyphen wird nicht freigegeben (P2-13). | P1 |
| E5 | Keine Werte erfinden: Familien mit offenem Preis oder offener Stärke sind im Shop nicht buchbar (Katalogregel 2). | P1 |

## Vorlagenstruktur aus der Soll-Bestandsliste

Die Vorlagenstruktur des Konfigurators ist die Struktur des Katalogs; FPD und Zakeke kennen nur Ebene 4 (Template) und Ebene 5 (Produkt). Die beiden blauen Ebenen sind die, die der Konfigurator wirklich lädt: Familie und Design. Alles andere ist Herleitung oder Verkaufsbezug.

&#91;embedded content: Katalog-Ebenen → Konfigurator · 6 Ebenen\]

Familie (blau) ist das Produktmodell, Design (blau) die Vorlage; Material liefert das Profil nach oben, Linie und Unterkategorie den Verkaufsrahmen nach unten.

**Was die Soll-Bestandsliste beisteuert.** `linien/SOLL-BESTAND.xlsx` (17.10.2026, ohne Funkklingeln) hat vier Blätter; jedes wird zu einer Ebene oben:

| Blatt | Umfang | Wird zu | Chris entscheidet (gelbe Spalten) |
| --- | --- | --- | --- |
| Linien | 57 Serverprodukte | Ebene 5 Linie + Ebene 6 Unterkategorien (Vorschlag je Thema) | Soll ja/nein/später, Priorität 1–3; Türklingel, Grabstecker, Archiv sind raus (19.10.) |
| Größen | 1 481 Größen (Baum + Register) | Ebene 2 Familie: nur Größen mit Soll = ja; „Neue Größe“ überträgt Designs | Soll, Neue Größe (B×H cm), Zielfamilie |
| Designs | 1 597 `[CDR]`-Ordner, 33 659 Designs; Light-Pass 19.10.: 4 362 Hauptdesigns + 3 004 Varianten in 43 Linien | Ebene 4 Design: ein Master je Design-Nummer und Formatreihe, Varianten (Form/Material/Farbe) hängen daran | Kopieren ja/nein, Bemerkung; je Linie Excel mit Zielgruppe/Unterkategorie/Foto |
| Schriften je Produkt | 320 Schriften × Linie (Cinzel 5 892, Michroma 3 742, Allura 3 097 …) | Ebene 6 Schrift-Set je Unterkategorie aus der echten Nutzung; nicht lizenzierte Schriften (Champagne & Limousines 2 654) brauchen Ersatz | Schriftersatz-Zuordnung (offene Entscheidung 8) |

**Was das für die Vorlage im Konfigurator heißt (Anforderungen V1–V6)**

| Nr. | Anforderung | Prio |
| --- | --- | --- |
| V1 | Der Konfigurator lädt genau zwei Dinge: eine Familie (Größen, Bohrbilder, Optionen, Profil) und die Designs der Formatreihe der gewählten Größe, gefiltert auf das Thema der Unterkategorie. Keine Produktkopien, keine Design-Kopien je Größe. | P1 |
| V2 | Ein Design ist nur in Größen seiner Formatreihe wählbar. Passt es nach Größenwechsel nicht (andere Reihe), bietet der Editor das nächste passende Design derselben Nummer an oder meldet „in dieser Größe nicht verfügbar“. | P1 |
| V3 | Kundenfelder entstehen aus den `text-<n>`-Ebenen des Design-SVG (Mustertext, Schrift, Größe in mm, Position); Sperren, Limits, Pflicht und Link-Gruppen stehen in `design.json`. Motive (`motiv-`, `deko-`) sind gesperrt, Fotofelder (`foto-`) sind Uploads. | P1 |
| V4 | Jede Unterkategorie zeigt ihr Thema: Designs mit diesem Thema (ein Design kann mehrere haben), das Schrift-Set des Themas (Michroma + Lato immer), Motivkategorien des Themas zuerst. | P1 |
| V5 | Bestandsdesigns in alten Größen kommen nur über die Spalte „Neue Größe“ in den Konfigurator: gleiche Reihe automatisch, nahe Reihe eingepasst und mit „prüfen“ markiert, sonst Neugestaltung. Alte Größen werden nie stillschweigend Familien-Größen (Katalogregel 7). | P1 |
| V6 | Varianten derselben Design-Nummer (andere Form, Material, Farbe) sind ein Design mit Varianten-Einträgen, nicht mehrere Designs; der Editor zeigt die Variante, die zur Familie passt. | P2 |

## Entscheidungen vom 19.10.2026

Die sechs offenen Punkte hat Chris am 19.10.2026 entschieden; die Anforderungen oben sind entsprechend angepasst.

| Nr. | Entscheidung | Ergebnis |
| --- | --- | --- |
| 1 | Auflösungs-Sperre (Ü5.2) | **Keine Sperre, jedes Foto wird angenommen.** Ampel bleibt als Hinweis; bei rot ein Satz „Das Foto ist klein, wir holen das Beste raus“, keine Bestätigung nötig. Das Team prüft in der Freigabe. Grund: praktisch alle Fotos sind umsetzbar, eine Sperre kostet Umsatz. |
| 2 | Standard-Zeichenlimit (Ü3.1) | **Je Thema**, Werte 30 % über meinem Vorschlag: Namensschilder/Hausnummern 32 Zeichen / 2 Zeilen, Gedenktafeln 78 / 4, Hinweis- und Firmenschilder 52 / 3. Designs können abweichen; Autofit ab 4 mm fängt den Rest. |
| 3 | Entwurf speichern (Ü8) | **Nur mit Kundenkonto.** Kein Gast-Entwurf, kein Mail-Link. Zusätzlich (Entscheidung Claude): Sitzungsschutz auf demselben Gerät – Neuladen oder Tab-Absturz stellt den Stand wieder her, ohne dass etwas auf dem Server liegt; das ist kein Entwurf, sondern Absprungschutz. |
| 4 | Mengenstaffel (Ü11) | **Wie vorgeschlagen:** Firmenschilder, Boxenschilder, Schlüsselanhänger, Hinweisschilder, Brettchen; Stufen ab 5 / 10 / 25 Stück; Prozentwerte aus den `rabatt_stufe1–3`-Metafeldern des alten Shops. Türschilder, Hausnummern, Gedenktafeln ohne Staffel. |
| 5 | Rückseite (Ü15) | **Wie vorgeschlagen:** zweite Fläche nur bei Brettchen, Schlüsselanhänger, Autoanhänger, Lesezeichen. Platten bleiben einseitig; Acryl von hinten ist Spiegelung im Profil. |
| 6 | Preis im Shopify-Warenkorb (W8) | **Erst Testbestellung** mit der bestehenden Storefront-Übergabe im Testzahlungsmodus; Shopify-Function nur, wenn Preis oder Mengenänderung falsch ankommt. Keine Duplikat-Produkte. |

## Backend-Verwaltung und Abo-Modell

Zwei Dinge, die der Benchmark bisher nur gestreift hat: Wie verwaltet gravuru die Konfiguratoren im Backend, und was muss anders sein, wenn andere Händler denselben Konfigurator im Abo nutzen (Entscheidung Chris, 19.10.: ja, später). Meine Linie als Boss: **gravuru zuerst live, aber ab jetzt nichts mehr bauen, das nur für gravuru funktioniert.** Jede Tabelle bekommt einen Mandanten, kein Pfad, Preis oder Shop-Token ist hartkodiert. Das Abo-Modell selbst kommt erst nach dem Verkaufsstart; wer es vorher baut, zahlt doppelt.

**Backend heute gegen FPD/Zakeke**

| Bereich | FPD (Shopify-App) | Zakeke | Gravuru-Werkstatt heute | Lücke |
| --- | --- | --- | --- | --- |
| Produkt anlegen | Product Builder: Views, Layer, Vorlagenbibliothek, Templates verknüpfbar | Produkt aus Shop importieren, Sides/Print Areas zeichnen, Printing Method zuweisen | Familie als JSON/Excel-Rundlauf, Produkte per Stapelimport; Schablonen und Briefing-ZIP | Keine Oberfläche, die ein Nicht-Entwickler allein bedient; Katalog-Anbindung (Issue #5) offen |
| Designs verwalten | Design-Kategorien, Upload, JSON-Export | Template-Galerie je Produkt, Default je Variante, Element-Sperren im UI | Design-Import ZIP/Ordner/PDF, Übersichtsseiten mit Markierungen, Excel-Rückimport | Sperren, Limits, Themen je Design nur in Dateien, nicht klickbar |
| Schriften/Motive | Google Fonts + TTF-Upload je Produkt | TTF/OTF-Upload, je Printing Method | 75 freigegebene Schriften, Sets per Excel, 721 Motive | Lizenznachweis und Sets ohne UI; Umlaut-Prüfung fehlt (P2-13) |
| Bestellungen | Order Viewer, Print-Ready-Export, Dropbox/S3, Webhook | Dashboard mit Vorschau je Side, Design-ID, Nachbearbeitung, Zapier/Order Desk | Auftrags-UI, Output-Prüfungen, Prüfstände; Freigabe nie `true` | Freigabeprozess, Sammeldownload, Bögen |
| Rechte | ein Händlerkonto | ein Händlerkonto, Sales Channels | jeder Shop-Mitarbeiter = voller Zugriff | Rollen Produktpflege / Freigabe / Fertigung fehlen |
| Installation | App Store, 14 Tage Test, Billing über Shopify | App Store, Plan + Gebühr je Verkauf | Plesk-Host, Extension-Build, manuelle Aktivierung | Kein Onboarding, kein Billing, keine Mandanten |

**Anforderungen Backend (B) – für gravuru selbst**

| Nr. | Anforderung | Prio |
| --- | --- | --- |
| B1 | Die Werkstatt liest Familien, Designs, Schriften und Themen aus dem Katalog-Repo (Issue #5), nicht aus `app/designs/`; Änderung im Katalog + Freigabe „importieren“ = Stand im Konfigurator. | P1 |
| B2 | Produkt-Cockpit: eine Seite je Linie mit Familie, Größen, Optionen, Preisen (inkl. offener Werte rot), Unterkategorien, Designs, Schrift-Set; Vorschau wie der Kunde sie sieht; Freigabe-Knopf. Excel bleibt als Massenweg bestehen. | P1 |
| B3 | Design-Editor für den Händler: Sperren, Limits, Pflicht, Link-Gruppen, Guide-Rolle je Ebene klickbar setzen (schreibt `design.json`). | P2 |
| B4 | Freigabeprozess mit Status, Sammeldownload je Tag/Material, Fehlerliste mit Grund; Bestellung bleibt unveränderlich. | P1 |
| B5 | Rollen: Produktpflege, Freigabe, Fertigung, Verwaltung; jede Änderung mit Wer/Wann. | P2 |
| B6 | Backup/Restore-Skript mit Probelauf; Rollback einer Familien-Revision ohne Datenverlust in Bestellungen. | P1 |
| B7 | KI-Kosten: Reserve exakt je Auftrag, Freigabe bei Fehler automatisch, Guthaben-Konto bei OpenAI ohne Auto-Aufladung (Vorschlag aus dem Budget-Chat). | P2 |

**Anforderungen Abo-Modell (S) – für andere Händler**

| Nr. | Anforderung | Prio |
| --- | --- | --- |
| S1 | Mandant als erste Spalte in jeder Tabelle (Familien, Designs, Schriften, Bestellungen, Entwürfe, Uploads); gravuru ist Mandant 1. Kein Zugriff über Mandantengrenzen, auch nicht für Dateien. | P1 (Architektur jetzt) |
| S2 | Je Mandant eigene Shop-Verbindung (Shopify-Token, Webhooks, Storefront), eigene Fertigungsprofile, eigener Katalog. gravurus Designs, Motive und Schriften sind eine getrennte Bibliothek, die nur mit gebuchter Designpaket-Option sichtbar ist; vorher Lizenz der 49 eigenen Schriften und der 721 Motive für Fremdnutzung prüfen. | P1 (Architektur), Rest P3 |
| S3 | Vertriebsweg: **Shopify-App** (Custom, später Public) mit Shopify Billing (Pläne, Testphase, Nutzungsgebühren); kein eigenes Abrechnungssystem, keine anderen Shopsysteme (Entscheidung 19.10.). | P3 |
| S4 | Onboarding in unter 30 Minuten ohne gravuru-Hilfe: Shop verbinden → Familie aus Vorlage wählen (Rechteck, Oval, mit Bohrbild) → Größen und Preise eintragen → erstes Design aus Galerie → Testbestellung. Maßstab ist Zakekes Produkt-Import und FPDs Vorlagenbibliothek. | P3 |
| S5 | Pläne nach Nutzung (Produkte/Bestellungen je Monat), **keine Gebühr je Verkauf im Grundplan** (Zakekes 1,5–1,9 % ist der meistgenannte Kritikpunkt). Einzige nutzungsabhängige Gebühr: **Designpaket-Option** – Aufpreis je Bestellung mit gravuru-Design, über Shopify Usage Charges (Entscheidung 19.10.). Planinhalte legt Chris später fest. | P3 |
| S6 | White-Label im Editor (Farben, Logo, Schrift des Mandanten) über die vorhandenen Design-Tokens; kein zweites Theme je Mandant. | P3 |
| S7 | Datenschutz je Mandant: Auftragsverarbeitungsvertrag, Löschfristen je Mandant, Kundenfotos nie mandantenübergreifend; Hosting-Standort EU. | P3 (Vertrag vor erstem Fremdkunden) |
| S8 | Fertigungsausgabe mandantenfähig: jeder Mandant hat eigene Profile; gravurus Laser-Profile sind nicht Standard für andere. | P3 |

**Entschieden am 19.10.2026**

| Frage | Entscheidung Chris |
| --- | --- |
| Wer sind die anderen Kunden? | **Nur Shopify-Händler.** Vertriebsweg ist eine Shopify-App mit Shopify-Billing (S3); kein eigenes Login ohne Shop, keine anderen Shopsysteme. |
| Designs und Motive für Fremdkunden? | **Nicht im Grundpreis.** gravuru-Designs und -Motive nur als zubuchbare Option je Plan, abgerechnet mit **Aufpreis je Bestellung**, in der ein gravuru-Design verwendet wird. Der leere Konfigurator mit eigener Bibliothek ist der Standard. |
| Zeitpunkt | **Frühestens 3 Monate nach gravuru-Verkaufsstart.** Bis dahin nur die Architektur mandantenfähig halten (S1, S2). |

## Methode und Quellen

Drei Stränge, alle am 19.10.2026: (1) Inventur des eigenen Konfigurators aus dem Repo `gravuru-2027`, Branch `task/steel-master-data-20261016` (Hilfe-, UX- und Workflow-Module, Werkstatt-Tests, Prüfbericht vom 12.10., Releases vom 11.–16.10.); (2) FPD aus Hersteller-Doku, Forum und Shopify-App-Listing; (3) Zakeke aus Help-Center, Entwickler-Doku, Blog zum neuen UI, Demo-Store, App-Store- und Capterra-Bewertungen. Die Soll-Bestandsliste und der Light-Pass stammen aus dem Repo `gravuru-katalog.` (`linien/SOLL-BESTAND.xlsx`, `designs/bestand/LIGHT-PASS-2026-10-19.md`, `STAND.md`).

**Grenzen.** Kein bezahlter Zugang zu FPD oder Zakeke; Feature-Aussagen sind Doku-Stand, nicht Praxistest. Der FPD-Editor auf gravuru.de (WooCommerce) ließ sich im Browser nicht aufnehmen (Renderer eingefroren) und ist ohnehin nicht Maßstab, da WooCommerce abgelöst ist. REA war nur gegen den Lenovo-Hintergrundbrowser erreichbar, nicht gegen Chrome; die Web-Analyse lief deshalb über Doku und Browser-Lesen. „Fehlt“ beim Gravuru-Konfi heißt „im Code nicht gefunden“, nicht „sicher nicht vorhanden“.

**Quellen FPD:** [Shopify-App-Listing](https://apps.shopify.com/fancy-product-design) · [Getting started with Shopify](https://support.fancyproductdesigner.com/support/solutions/articles/13000074909-getting-started-with-shopify) · [Bounding Boxes](https://support.fancyproductdesigner.com/support/solutions/articles/5000548169-using-bounding-boxes-to-restrict-elements) · [Pricing Rules](https://support.fancyproductdesigner.com/support/solutions/articles/13000036185-create-pricing-rules) · [Text Link Groups](https://support.fancyproductdesigner.com/support/solutions/articles/13000105306-using-text-link-groups-to-sync-the-content-between-text-layers) · [Upload Zone](https://support.fancyproductdesigner.com/support/solutions/articles/13000070317-creating-an-upload-zone) · [Print-Ready Export](https://support.fancyproductdesigner.com/support/solutions/articles/13000093102-create-production-materials-for-a-customized-order) · [Engraving Setup](https://support.fancyproductdesigner.com/support/solutions/articles/13000105720-setup-for-engraved-products) · [Variations](https://support.fancyproductdesigner.com/support/solutions/articles/13000032251-using-variations-to-change-the-product-template-in-the-designer) · [Farben](https://support.fancyproductdesigner.com/support/solutions/articles/13000109081-why-there-is-no-color-options-) · Forum: [Textbox/Autofit](https://support.fancyproductdesigner.com/support/discussions/topics/13000000752), [Text läuft aus Box](https://support.fancyproductdesigner.com/support/discussions/topics/13000035181), [Kurventext-Radius](https://support.fancyproductdesigner.com/support/discussions/topics/13000021690), [Mobile](https://support.fancyproductdesigner.com/support/discussions/topics/13000023513) · [CodeCanyon-Kommentare](https://codecanyon.net/comments/31807748)

**Quellen Zakeke:** [Visual Product Customizer](https://www.zakeke.com/solutions/visual-product-customizer/) · [Neues Customizer-UI](https://test.zakeke.com/blog/introducing-the-new-zakeke-customizer-ui) · [Printing Methods](https://zakeke.zendesk.com/hc/en-us/articles/360016836099) · [Pre-designed Templates](https://zakeke.zendesk.com/hc/en-us/articles/360016320114) · [Text-Tool](https://zakeke.zendesk.com/hc/en-us/articles/4406007851282) · [Autofit-Textbox](https://zakeke.zendesk.com/hc/en-us/articles/360015681240) · [Auflösungsprüfung](https://zakeke.zendesk.com/hc/en-us/articles/360016059114) · [Extra Options](https://zakeke.zendesk.com/hc/en-us/articles/25246484297116) · [Pricing Rules](https://zakeke.zendesk.com/hc/en-us/articles/360015984779) · [Mengenstaffel](https://zakeke.zendesk.com/hc/en-us/articles/360017896059) · [Print Files](https://zakeke.zendesk.com/hc/en-us/articles/360016291573) · [Gravur-Output](https://zakeke.zendesk.com/hc/en-us/articles/360017411080) · [PDF-Layer Bleed/Cut](https://zakeke.zendesk.com/hc/en-us/articles/4403442390930) · [Designs speichern](https://zakeke.zendesk.com/hc/en-us/articles/360016060414) · [Edit nach Warenkorb](https://zakeke.zendesk.com/hc/en-us/articles/360013019499) · [Shopify-Duplikatprodukt](https://zakeke.zendesk.com/hc/en-us/articles/360013667339) · [Bulk-Variantenformular](https://zakeke.zendesk.com/hc/en-us/articles/360012930340) · [3D Preview & AR](https://zakeke.zendesk.com/hc/en-us/articles/360011939619) · [Preise](https://admin.zakeke.com/en-US/pricing) · [Shopify-Bewertungen](https://apps.shopify.com/zakeke-interactive-product-designer) · [Capterra](https://www.capterra.com/p/162400/Zakeke/reviews/)

**Quellen intern:** `gravuru-2027`: `KONFI-VERGLEICH-UND-AR.md` (30.09.), `NEUE-WERKSTATT-PLAN.md`, `docs/reviews/CLAUDE-PRUEFBERICHT-20261012.md`, `docs/releases/20261013/p1-fixes/RELEASE.md`, `app/configurator/variant-m/{help,ux,workflow}.mjs`, `app/workshop/*.test.mjs` · `gravuru-katalog.`: `README.md`, `STAND.md`, `themen.json`, `linien/*.json`, `designs/README.md`.
