# UV-Gedenkkreuze: DXF, eigenes Modul und Überdruck

Quelle: Chris im selben Chat am 09.11.2026: klares Acryl sichtbar, gelieferte drei DXFs als Konturen, keine Option „Ohne Bohrung“, Größen als Icons, eigenständiges Modul, echte Konturen im Export mit 1,5 mm Überdruck. Vorher bestätigte 5 mm Klaracryl, Hinterdruck und Preise 1499/2299/2799 Cent sowie einmalig 300 Cent Foto bleiben. Design-Master im Katalog gilt; keine neue Gestaltung, keine Motivverzerrung. Die bestehende ausdrückliche Freigabe für den gemeinsamen Anschluss gilt fort.

## Umsetzung und Regeln

- Produktmodul `uv-cross`, nur für Familie `uv-gedenkkreuze-acryl-klar`. Gemeinsamer Editor, Foto-, Preis- und Exportkern bleiben die Grundlage.
- Größen-Icons verwenden die jeweilige Kontur. K00 bleibt intern gültig, ist aber keine Kundenauswahl. Glasdarstellung ist ausschließlich Vorschau: durchscheinende Fläche, polierte Kante, leichte Reflexe; Druckobjekte bleiben unverändert.
- Drei gelieferten DXFs: mm, geschlossene Konturen, 110×200/140×250/220×400, je sechs echte Rundungen. Quellen und SHA-256 im Katalog unter `schneidvorlagen/kreuze/dxf-2026-11-09/`.
- Druckprofil: Roland, 300 dpi, RDG_WHITE motivbezogen, 1,5 mm Farbe/Weiß-Überdruck, einmal spiegeln. Überdruck erweitert randberührende Druckfarbe außerhalb der unveränderten Schnittlinie. Innenliegende Motive bekommen keine künstliche Vollfläche. Keine neue Sperre für verschobene Kundenelemente.
- Native Revisionierung aktualisiert genau vier vorhandene IDs R1→R2, erwartet Revision 1, wiederholbarer Importjournal-Schlüssel. Historische Revisionen und fremde Produktköpfe werden geprüft und erhalten.

## Vorprüfung

60/60 native Größen-/Preis-/Konturfälle und 180 Größenwechsel bestanden. 60 Text-/Motivausgaben unverändert; drei PDF-Schnittkonturen mit DXF-Endpunkten und Rundungen abgeglichen. 22 UI-/Modulregressionen bestanden. Export: native Fotostichprobe in allen drei Größen sowie drei echte Randüberdruckproben bestanden. Direkte lokale HTTP-Tests benötigen freigegebenen Loopback; vollständiger Linux-Lauf erfolgt beim Staging.

## Übernahme

`scripts/deploy-uv-cross-dxf-private.mjs`: getrennte Runtime, Basishashschutz, Vorprüfung, Sicherung der drei Datenbanken, vier atomare Revisionen, unveränderliche Historie, Aktivierung und HTTP-Prüfung. `scripts/audit-uv-cross-dxf-print.mjs` prüft alle 60 realen Druckausgaben plus 1,5-mm-Randproben und Original-DXF-Hashes. Noch kein Live-Nachweis in diesem Vorbereitungsstand; danach diese Übergabe ergänzen.

ICC, RIP und physischer Probedruck bleiben separate Abnahmen; keine reale Bestellung oder Shopify-Veröffentlichung.
