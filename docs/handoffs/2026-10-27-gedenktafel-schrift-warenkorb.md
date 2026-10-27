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
- Bereitstellung und echter Browser-Warenkorbtest noch ausstehend; werden nach Durchführung ergänzt.

Private Fotos, Browser-Sitzungen und Kundengestaltungen gehören nicht ins Repository.
