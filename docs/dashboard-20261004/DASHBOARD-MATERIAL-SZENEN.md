# Formprodukte: Acrylmaterialien und Szenen – 05.10.2026

Arbeitsbranch `task/form-material-scenes-20261005`, Basis `a407c4114f3914d26f3a58baa8de4628a96161b0` aus `task/form-added-elements-20261005`. Bestehende Cloud-Arbeitsumgebung, unveränderter Repositorybezug `Chris83638w/gravuru-2027`. Alle Beispielprodukte und privaten Browserentwürfe dieser Prüfung sind synthetisch und nur in einer separaten temporären Testdatenbank. Keine Produktionsänderung, kein Site-Publish, kein Merge.

## Tatsächlich umgesetzt

- Vier ergänzende Oberflächen: klares, satiniertes, anthrazitfarbenes und schwarzes Acryl. Die bestehenden Edelstahl-, Holz- und Ledervorschauen bleiben angeschlossen.
- Backend „Produkt & Material“ → „Vorschau-Szene“: Helles Studio, warmer Hintergrund oder ohne Hintergrund. Neue Formprodukte beginnen mit Studio. Bestehende Dokumente ohne diese optionale Einstellung bleiben gültig und erhalten keinen automatisch gespeicherten Szenenwert.
- Auswahl wird mit der Produktrevision gespeichert. Ein historischer Stand zeigt seine damalige Auswahl; nachträgliche Änderungen betreffen weder alte Produktrevisionen noch bereits gespeicherte Prüfdateien.
- Materialkante aus der ausdrücklich eingetragenen Stärke, als feste 2D-Projektion. Keine Stärke aus Referenzdateinamen übernommen. Ohne Stärke keine Tiefenbehauptung. Die Kante folgt auch freien Außenkonturen. Originale Vorderfläche, Maße und Löcher bleiben unverändert.
- Gemeinsame Darstellung in Backend, Kundenansicht, Vollbild, Produktkarten und gesicherter Werkstattvorschau. Originales Design und Kundenfelder werden vor den dezenten Frontreflexen eingesetzt; ihre Produktionsfarben werden nicht verändert.
- Druck und Gravur verwenden weiterhin die separate Gestaltung. Szene, Kante, Reflexe und Materialoberfläche gelangen nicht in Farbdruck, Weißkanal oder Kontur-PDF.

Zusätzlich wurde ein beim echten Browserstart entdeckter Fehler der vorhandenen Produktübersicht behoben: Der Editor versuchte, das Symbol an den inzwischen entfernten Platzhalter `.upcoming-orders` zu hängen. Das brach die Initialisierung vor dem Laden der Produktliste ab. Er verwendet nun die vorhandene Testbestellungen-Navigation; fehlende optionale Symbolziele unterbrechen den Start nicht. Die inzwischen längere Navigation bricht außerdem um, statt die ganze Seite seitlich zu verbreitern.

## Referenzen und Grenzen

Die vier zugeordneten Originalmuster im unveränderten `REFERENZ-MATERIALIEN-20260930.zip` wurden tatsächlich angesehen und gegen die SHA-256-Werte in `referenzdaten.json` geprüft. Herkunft: [acrylic-provenance.json](../../app/workshop/ui/material-surfaces/acrylic-provenance.json). Sie enthalten bereits Designs; deshalb werden sie nicht als leere Rohlinge in den Konfigurator kopiert.

Die neue Oberfläche ist eine programmatisch gezeichnete **angenäherte 2D-Darstellung**, kein Herstellerfoto, keine farbverbindliche Freigabe und keine vollständige optische Simulation von Lichtbrechung. Verwendete Materialfarben und Deckkräfte sind Vorschaunäherungen. Ein heller oder warmer Studiountergrund wird angezeigt; echte freigegebene Produktszenen mit Halterungen fehlen für diese freien Formprodukte weiterhin. Die Darstellung verändert weder das historische Acrylmuster mit seinen Sockeln noch dessen Einstecktiefen.

Schiefer bleibt ausdrücklich ohne bestätigte leere Rohlingreferenz. Kein künstlicher Rohling wird als gelieferte Originalreferenz ausgegeben. Fertigungs-, ICC-, RIP- und Maschinenabnahme bleiben offen.

## Neue Prüfung

- `node scripts/cloud-check.mjs`: **231 Tests, 0 Fehler, 0 Skips**; Python-/Referenzprüfung und Build bestanden. Der Testschritt nutzt dieselbe Suite wie `npm test`; Build dieselbe Implementierung wie `npm run build`.
- Testzeit: **05.10.2026, 21:09:04–21:10:06 Uhr Europe/Berlin** (19:09:04–19:10:06 UTC). Linux, Node v24.19.0. Laufnachweis im beigefügten JSON; frühere 229-/137-Testberichte sind historische Nachweise.
- Build: **76 Ressourcen, 1 Modell**. Bestehender Acryl-Editor unverändert.
- Neue automatische Prüfung: originale Geometrie und historische Dokumente ohne Szenenfeld, erlaubte Szenenwerte, offene/bekannte Stärke, Reihenfolge des Designs vor Frontreflexen.
- Zusätzlicher echter PDF-Test: schwarzes Acryl mit warmer Szene und 5-mm-Kante. PDF bleibt 60 × 40 mm; freie Stellen und Bohrung enthalten weder Druckfarbe noch Weiß; vorhandenes Druckmotiv erhält weiterhin Weiß.
- Chromium: 1536/390/768 Pixel; Speichern/Neuladen, feste historische Revision, Konturumschaltung, direkte Kunden-Textbearbeitung und Vollbild. Keine JavaScript-Fehler und kein horizontaler Überlauf.
- Produktübersicht: alle vier eingebetteten Acrylkarten tatsächlich geladen; Suchfilter und Desktop-/Mobil-/Tabletbreite geprüft. Keine JavaScript-Fehler/kein Seitenüberlauf. Echtes mobiles Doppeltippen und Abbrechen am schwarzen Acrylprodukt geprüft.
- Gerenderte Pixel geprüft: Lochmitte bei allen vier Acrylvarianten Alpha 0; unbedruckte Vorderfläche klares Acryl Alpha 33/255, satiniertes 199/255, Anthrazit/Schwarz 255/255. Prüfung ohne Studiountergrund; keine Verwechslung von Hintergrund und Druckweiß.

## Ansichten aus dem geprüften Browserlauf

[Produktübersicht](material-scenes-overview.png) · [Übersicht mobil](material-scenes-overview-mobile.png) · [Übersicht Tablet](material-scenes-overview-tablet.png).

[Backend mit Szenenauswahl](material-scenes-backend.png) · [Kundenansicht Desktop](material-scenes-customer-desktop.png) · [Handy](material-scenes-customer-mobile.png) · [Tablet](material-scenes-customer-tablet.png).

[Klares Acryl](material-acrylic-clear.png) · [Satiniert](material-acrylic-satin.png) · [Anthrazit](material-acrylic-anthracite.png) · [Schwarz](material-acrylic-black.png) · [Vorhandene Eiche mit Materialkante](material-oak.png).

Der erste zusätzliche Übersichtstest scheiterte am beschriebenen Startfehler. Erst nach der Korrektur wurden die Karten und Touchbedienung erfolgreich geprüft; der vollständige Cloud-Check wurde wegen dieser Codeänderung erneut ausgeführt.

Nächster unabhängiger Umsetzungsschritt: verbleibende Dashboard-Abläufe für Materialien/Formen und Stapelanlage anhand der ausgewählten Vorgaben abgleichen und fortsetzen. Die echte Shopify-Strecke benötigt weiterhin den im anderen Chat bereitgestellten Store-Bezug und dessen autorisierte Anbindung; diese Aufgabe kann dessen Wert nicht behaupten. Kein erneuter Restore nötig, um am Dashboard weiterzuarbeiten.
