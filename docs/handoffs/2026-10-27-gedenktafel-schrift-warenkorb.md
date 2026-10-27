# Gedenktafel: Schrift, Maße, Auswahlrahmen und Warenkorb

Basis Code main d103019, Branch dev/gedenktafel-schrift-warenkorb-20261027-astra.

Auftrag Chris: alle vier Fehler beheben, echte Gedenktafel mit Foto und Hausmotiv bis in den Warenkorb testen, aktuelle Gestaltung erhalten. Frühere ausdrückliche Erlaubnis zur sicheren Bereitstellung gilt fort. Der bestehende Kundentab bleibt ohne Neuladen geöffnet. Kein Kauf und keine Zahlung.

## Aktueller Abschluss: Foto-Vorschau und Bearbeiten (27.10.2026)

Dieser Abschnitt ersetzt die weiter unten dokumentierte frühere Einschränkung beim Öffnen der PNG und bei der alten Gedenktafel-Warenkorbdarstellung.

- Ursache der blockierten Einzelansicht: Shopify liefert die hochgeladenen Dateien mit `Content-Disposition: attachment`. Die Datei war vorhanden (HTTP 200); die direkte Navigation wurde vom Browser blockiert. Das Theme zeigt sie jetzt inline in einem zugänglichen Bilddialog.
- Die Gedenktafel nutzt das ältere Schema `gravuru-shopify-design/v1` und andere Eigenschaften als native Konfigurationen. Das Snippet erkennt beide Wege. Gespeicherte Vorschau und **Bearbeiten** stehen zusammen in der Bildspalte. Technische Dateieigenschaften bleiben im Warenkorb gespeichert und werden in dieser Zeile nicht rechts aufgelistet.
- Wiederherstellung lädt den zum exakten Cart-Key gehörenden Snapshot samt originalen und bearbeiteten Fotos. Nur Shopify-Uploadpfade desselben Shops; Produkt, Variante, Profilrevision, Mengen, Dateitypen und Größen werden geprüft. Die alte interne Profil-Produktkennung wird erst nach exaktem Vergleich mit der verifizierten Commerce-Produktkennung abgebildet. Es wird keine fremde oder ältere Revision still akzeptiert.
- Das eingebettete Editorfenster bleibt beim Laden im Layout, aber unsichtbar und ohne Bedienung. `display:none` hatte dessen Initialisierung blockiert. Freigabe der Bedienung erst nach bestätigter Wiederherstellung; Origin, Quellfenster und Sitzung müssen auf beiden Übergabestufen passen.
- Fotozuordnung, Masken/Ausschnitte, Texte und Objektanordnung werden exakt erhalten. Ersetzen erfolgt erst nach bestätigtem Upload und Preisrückprüfung; bei einer verlorenen Antwort wird die eindeutige Vorgangskennung abgeglichen. Erst danach wird genau der alte Cart-Key entfernt. Andere Positionen werden vor/nachher verglichen. Bei Fehler bleibt der bisherige Stand erhalten bzw. beide Stände sichtbar zur Prüfung.

### Tatsächlich ausgeführte Abnahme

1. Im vorhandenen Warenkorb: erste Gedenktafel mit Foto und Haus, GTD8B5-1, 220 × 140 mm, ohne Befestigung, Menge 1, 34,67 €.
2. Gespeicherte PNG im großen Dialog geöffnet: Foto links, Baum mittig, Haus rechts oben, Texte vollständig sichtbar.
3. **Bearbeiten** unter dieser Vorschau geöffnet. Editor bestätigt Wiederherstellung; Foto, Haus, Texte und Anordnung sichtbar gleich. Kein erneuter Foto-Upload.
4. Abschlussdialog: Menge 1 und 34,67 €. Einmal **In den Warenkorb**.
5. Rückkehr zu /cart: genau vier Positionen, aktualisierte Gedenktafel weiterhin 34,67 €, ein Zusatzmotiv und ein kostenpflichtiges Bild. Die drei übrigen Cart-Keys und Mengen unverändert.
6. Neu gespeicherte PNG erneut im großen Dialog sichtbar geprüft. Keine Bestellung und keine Produktions-PDF-Abnahme. Original-Kundentab nicht verändert.

Die lokalen Beweisbilder enthalten das Kundenfoto und werden deshalb nicht zu GitHub hochgeladen.

### Code, Bereitstellung und Prüfungen

- Neue Module: `legacy-cart-restore.mjs`, Theme-Asset `gravuru-legacy-cart.js`, eng begrenzter Legacy-Patch und `ops/repair-memorial-cart-edit.mjs`.
- Server zuerst Dry-run (sechs Dateien), anschließend private Sicherung, SHA-Rückprüfung und Apply; danach Korrektur der internen Produktzuordnung mit separater Sicherung. Keine Preis-/Designänderung, keine Datenbank geöffnet. Sicherungen unter `private/gedenktafel-repair-20261027-astra/cart-edit-before` und `cart-edit-id-before`. Plesk **App neu starten** auf Domain gravuru-designwerkstatt.de / Anwendungsstamm gravuru-werkstatt; öffentlich ausgeliefertes neues Restore-Modul geprüft.
- Gezielt Wiederherstellung **11/11**; vorher gemeinsame betroffene Tests **23/23** (vor zusätzlichem Kennungstest).
- Finaler Konfigurator-Vollauf mit `--test-concurrency=1`: **316 / 308 bestanden / 8 fehlgeschlagen / 0 übersprungen**. Zwei EPERM beim Bundle-Rename, ein Kontur-Python- und fünf Druck-Python-Fehler wie die Basis. Zuvor paralleler Lauf 315 / 306 / 9; zusätzlicher gemeinsamer Build-Datei-Konflikt isoliert grün und im finalen seriellen Vollauf nicht vorhanden. Keine Assertion entfernt oder abgeschwächt.
- Shopify-Liquid-Stateless-Prüfung: Snippet und beide Sections ohne Fehler. Bestehende Komplexitätswarnungen der großen Sections bleiben. Das ersetzt keine vollständige Prüfung aller Theme-Abhängigkeiten.
- Vier Theme-Dateien im unveröffentlichten Theme **190557716860** angewendet und bytegleich zurückgelesen: zwei Sections (kleiner Integrationspatch), Snippet, neues JS-Asset. MAIN **185833718140** unverändert: Die Shopify-Anbindung erlaubt Theme-Schreibzugriffe nur auf unveröffentlichte Themes. Zur Live-Übernahme ausschließlich diese vier Dateien auf aktuelle MAIN-Quellen übertragen; nicht die gesamte Testkopie veröffentlichen.

## Befund

Produkt 16138083107196, Gedenktafel für Menschen 220×140, Vorschaupaket 03f5f62bc283227cf014008036999cc0925f88e9a25b736c, Profil P-f087d73f-b29e-43f8-ba1e-543d1daa95a8 Revision 30. Diese gespeicherte Vorschau ist älter als die neue native Shopstrecke.

PDF-Poppins-ExtraLight-ef6333db enthält kein kleines c. Der Renderer ließ es weg, die Messung brach vorher ab und behielt eine alte Breite (ca. 60 statt 139 mm ohne c). Eingabefeld und Fokusverlust zeigten verschiedene Dezimalwerte. Der Abschluss behielt die Fehlermeldung eines alten Versuchs; erneuter Klick bestätigte die fehlende Glyphe als aktuellen Blocker. Der gemeinsame Maß-/Drehungsfehler war nicht eindeutig.

## Umsetzung

- Vollständige vorhandene Katalogschrift Poppins ExtraLight, SHA-256 55c03314cc754e26f741f97890e5e9cbe3b3278fe3abcecfecafd60111b2643d, 469 Glyphen. Nur fehlende Glyphen ergänzen; alle vorhandenen Pfade und Vorschubbreiten bleiben erhalten. Einheiten und vorhandene lateinische Zeichenbreiten müssen zur Originalschrift passen. Kein Font-Binary im Code-Repo.
- Fehlende Zeichen sind als Fehlzeichen sichtbar; Messung aktualisiert den Rahmen auch im Fehlerfall, Bestellprüfung bleibt streng.
- Kundenanzeige, Eingabe und Plus/Minus in ganzen mm; Werkstatt-Präzision bleibt getrennt. Vorlagen werden nicht pauschal gerundet.
- Warenkorbfehler gehören zum geprüften Entwurf und verschwinden nach Änderungen bzw. vor neuer Prüfung. Position, Breite/Höhe und Drehung erhalten eigene Fehlermeldungen.
- main erhält die allgemeinen Korrekturen. legacy-patches/memorial-editor-compat.mjs portiert sie mit eindeutigen Quellankern auf das bestehende Vorschaupaket. ops/repair-memorial-preview.mjs prüft Produkt, Revision und Schrift-Hash, schreibt zunächst einen separaten Probelauf und benötigt für --apply eine neue private Sicherung. Syntaxprüfung, Prüfsummen, atomarer Dateitausch und Rücknahme bei Schreibfehler; keine Datenbanköffnung, Schemaänderung oder Preisänderung.

## Bisherige Prüfungen

- Gezielt 21/21 bestanden.
- Konfigurator-Vollauf 290/298 bestanden; acht unveränderte Windows-/Python-Umgebungsfehler wie im vorherigen Hauptstand (Bundle-rename EPERM, Kontur-/PDF-Python).
- Zusätzliche Werkstattprobe 7/18: elf Umgebungsfehler (Python/Fotoprüfung und temporäre Bundle-Datei); nicht als grüne Abnahme zählen.
- Echter Paket-Probelauf: 14 Vorlagen byteinhaltlich unverändert, 1.157 vorhandene Glyphen unverändert; drei Poppins-Teilmengen um zusammen 1.312 fehlende Glyphen ergänzt. Wunschmann: zehn Pfade, bei 22 mm nominaler Schriftgröße 150,656 mm Textbreite. Preis-, Foto- und Geometrieeinstellungen unverändert.
- Zusätzlicher Manifest-Test 7/7 auf Windows und Linux bestanden. Der Server prüft Dateigröße und SHA-256 im privaten Vorschau-Manifest. Das Reparaturskript aktualisiert dieses Manifest mit; die erste Dateibereitstellung ohne Manifest wurde unmittelbar zurückgenommen.
- Die öffentliche Vorschau lädt gemeinsame Module aus der aktiven September-Laufzeit statt aus dem gespeicherten Paket. ops/repair-memorial-runtime.mjs aktualisiert deshalb ausschließlich vier geprüfte Module plus Fehlerstatus-Helfer mit eigener Sicherung und verlangt anschließend einen App-Neustart.
- Vorschaupaket samt Manifest und zentrale Laufzeit sind gesichert bereitgestellt; App-Neustart und anschließender Teiltest im echten Warenkorb sind abgeschlossen (Nachtrag unten).

Private Fotos, Browser-Sitzungen und Kundengestaltungen gehören nicht ins Repository.

## Nachtrag: Shopify 422 und Preisrevision

Shopify fordert Preisrevision 31; die öffentliche Vorschau sendet 30. Identischer isolierter Warenkorbtest: 30 → HTTP 422, 31 → HTTP 200 / 24,68 € mit Hausmotiv. Reparatur verknüpft den vollständig geprüften Shopify-Preisvertrag (neun Varianten, Motiv/Foto, komplette Mengenstaffel ab 2 −6 %, ab 3 −10 %) mit unveränderter Gestaltungsrevision 30. Probelauf, zweite Preisabfrage, private Sicherung, Prüfsummen und Rücknahme; keine Shopify-Mutation oder DB-Migration. Vorschau/Übergabe verwenden dieselben ausgelagerten Rabattfunktionen. Vollauf 305: **297 bestanden, dieselben 8 Windows/Python-Fehler**, vorher 300: 292/8. 10 gezielte Prüfungen grün. Türschild mit Hausmotiv im Testtheme sichtbar bis /cart einschließlich Vorschau/Bearbeiten. Preisreparatur inzwischen angewendet; der vollständige Foto-plus-Haus-Warenkorbtest ist nach manuellem Upload ebenfalls gelungen (Nachtrag unten).

Server-Vorbereitung: `ops/repair-memorial-pricing.mjs --preview VORSCHAUORDNER --runtime AKTIVE_LAUFZEIT --credentials BESTEHENDE_PRIVATE_APP_JSON --out NEUER_PRIVATER_ORDNER`. Erst Probelauf; `--apply` verlangt `--backup NEUER_PRIVATER_ORDNER`. Das Skript liest nur das app-eigene personalisierungs-Metafeld. Alle neun Varianten und 169 Cent Motiv / 999 Cent Foto müssen exakt passen. Danach App neu starten, öffentlichen Stand und echten Warenkorb prüfen. Original-Kundentab bleibt ohne Neuladen erhalten. Chris hat Teiltests ausdrücklich erlaubt.

## Aktueller Stand nach Bereitstellung und Theme-Nachtrag

- `07eb6de`: Preisreparatur nach 10/10 Linux-Tests und geprüftem Dry-run bereitgestellt. Dreizehn Dateien; Sicherung `private/gedenktafel-repair-20261027-astra/pricing-before/`, Abschlussmarker `APPLIED.json`. Anschließend Plesk „App neu starten“. Öffentliche sieben betroffene URLs HTTP 200, neue Helfer bytegleich. Profil und 14 Designs sowie zuvor ergänzte Schriften unverändert.
- Echte Gedenktafel über normale Produktseite: Hausmotiv, keine Bohrung/Befestigung, Menge 1, **24,68 € im tatsächlichen Shopify-Warenkorb**. Entwurf und Produktionsdateien übernommen. Mengenstaffel in der Oberfläche: zwei Stück **46,40 €**; danach für den Warenkorb wieder Menge 1. Foto war in diesem erlaubten Teiltest nicht enthalten.
- Echtes Türschild mit Hausmotiv und „Test Haus“: **19,99 € im tatsächlichen Shopify-Warenkorb**, danach auch im Produktionstheme sichtbar. Keine Bestellung. Bestehende Warenkorbzeilen und der ursprüngliche Kundentab bleiben erhalten.
- Vollständiger neuer Browserdurchlauf Gedenktafel **Foto + Haus** am 27.10. abgeschlossen: Chris hat das Kundenfoto im separaten Testtab hochgeladen. Sichtbar im Editor: Foto, Hausmotiv, bestehender Baum und Texte. Normale Produktseite → Abschlussdialog → „In den Warenkorb“ → tatsächliche Shopify-Warenkorbposition, Menge 1, **34,67 €**. Genau ein zusätzliches Motiv und ein kostenpflichtiges Bild; Preisaufteilung 22,99 € + 1,69 € + 9,99 €. Entwurf, Originalbild, Layout-PDF, Gravur-SVG, Layout mit Bildern, Ausrichtung und bearbeitbarer Entwurf als Links an derselben Position vorhanden. Drei bestehende Positionen erhalten, jetzt vier. Keine Bestellung, ursprünglicher Kundentab unverändert.
- Prüfumfang dieses vollständigen Warenkorbtests: echter Shop und echte Übergabe, Warenkorb wurde im unveröffentlichten Testtheme 190557716860 dargestellt. Die neu gespeicherte PNG-Vorschau ließ sich anschließend im Browser nicht separat öffnen (ERR_BLOCKED_BY_CLIENT / Navigationstimeout). Daher keine zusätzliche visuelle Abnahme der gespeicherten Datei und keine Produktions-PDF-Abnahme behaupten. Die Gedenktafel verwendet weiterhin die ältere Warenkorbdarstellung mit Dateilinks; der neue Bearbeiten-Link betrifft bislang die native Türschild-Strecke. Lokaler Screenshot vorhanden; Kundenfoto und seine Dateilinks werden nicht ins Repository übernommen.
- Chris' Nachtrag „Bearbeiten unter dem Foto, nicht rechts in der Aufzählung“: umgesetzt im Testtheme `190557716860`, Desktop und Handy 390×844 geprüft. Kleiner Sections-Patch und Snippet unter `ops/shopify/theme-block/`. In Produktion unverändert; MAIN-Dateizugriffe sind durch die Shopify-Anbindung gesperrt. Nur diese drei Theme-Dateien übernehmen, nicht pauschal die ganze Testkopie veröffentlichen.
- Bearbeiten aus der Vorschau öffnet wieder die gespeicherte Türschild-Gestaltung (Haus, Text, sieben Ebenen). Zunächst HTTP 503 um 10:55:18 +0100, LiteSpeed meldete Connection reset/refused ohne laufenden App-Prozess. Erneutes Laden gelang; keine Änderung an der Sitzungsprüfung nötig.
- Liquid-Snippet besteht sämtliche Prüfungen. Für die beiden unvollständig kopierten Sections dieselben 97 fehlenden Theme-Referenzen/Übersetzungen vor und nach dem Patch, keine neuen Fehler. Shopify-Upsert ohne Fehler, zurückgelesene Quellen stimmen. Vollaufzahlen aus dem Preisnachtrag unverändert: 305 / 297 bestanden / 8 bekannte Windows-Python-Fehler.
