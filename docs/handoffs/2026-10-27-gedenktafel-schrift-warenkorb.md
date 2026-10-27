# Gedenktafel: Schrift, Maße, Auswahlrahmen und Warenkorb

Basis Code main d103019, Branch dev/gedenktafel-schrift-warenkorb-20261027-astra.

Auftrag Chris: alle vier Fehler beheben, echte Gedenktafel mit Foto und Hausmotiv bis in den Warenkorb testen, aktuelle Gestaltung erhalten. Frühere ausdrückliche Erlaubnis zur sicheren Bereitstellung gilt fort. Der bestehende Kundentab bleibt ohne Neuladen geöffnet. Kein Kauf und keine Zahlung.

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
