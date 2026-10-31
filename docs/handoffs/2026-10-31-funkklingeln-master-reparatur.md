# Funkklingeln im aktuellen Master – Reparatur

Basis: `06f1fead1b43548c876394e1c4d951ce25e2343c` (Master #77, #79, #80, Live-Nachweis #81).
Branch: `dev/funkklingeln-master-reparatur-20261031-astra`.

## Auftrag und Regeln vor der Umsetzung

Chris, 31.10.2026 im Funkklingel-Chat: vereinbarte Material-/Befestigungsauswahl und Darstellung wiederherstellen; Master-Funktionen nicht überschreiben. Zusätzlich störende gestrichelte Linie erklären/korrigieren und die nicht vergrößerbare Hausnummer „12a“ prüfen.

| Regel | Quelle |
| --- | --- |
| Gemeinsame Master-Oberfläche, Text-/Motiv-/Foto-/Logo-/Warenkorbfunktionen erhalten; nur produktspezifische Ausführungen ergänzen | Issue #48 Nachrichten 17/19 und Master-Abgleich #77; aktueller direkter Auftrag |
| Untertabs Format & Position / Rahmen & Farbe / Befestigung; Format und Position als getrennte bebilderte Blöcke; runde Farbauswahl und kompakte Kacheln | Chris 29.10., Issue #46, PR #60 und dessen Live-Nachweis #74 |
| Vorhandene Materialreferenz für Edelstahl und realistischere Acrylkante verwenden | Chris 29.10., PR #60; keine Material-/Produktionsdaten ändern |
| Bestehende Texte auch neben/unter der Klingel skalierbar; die größte freie Rechteckfläche dient der Erstplatzierung und ist keine zusätzliche Gestaltungsbeschränkung | Vorhandene freigegebene modellbezogene Vorlagen und bereits geprüfte PR-60-Korrektur; direkter Screenshot „12a“ vom 31.10. |
| Rechte anhand des tatsächlich gewählten Formats/der Position anwenden; keine gesperrten Eigenschaften freischalten | Versionierte Produktrechte, PR #60, Issue #46 |
| Preise, Geometrie, Produktrevisionen, Bindungen und Fertigung unverändert; keine neuen Foto-/Logo-Preise oder Upload-Freigaben | Direkter Auftrag; Issue #48 Nachrichten 17/19 (separates Muster noch offen) |
| Keine dauerhafte technische Erstplatzierungsgrenze in der normalen Funkklingel-Kundenvorschau; Auswahl-/Ziehhilfen des Masters erhalten | Chris' Screenshot/Frage vom 31.10.; bestehende Trennung zwischen Vorschauhilfen und Fertigung |

## Befund

Beim Master-Abgleich wurde der spätere Funkklingel-Anteil ausdrücklich ausgespart (Issue #48, Master-Abgleich #77). Aktuelles main enthält daher weder `doorbell-presentation.mjs` noch die Materialvorschau und formatbezogene Rechte-/Texteinpasskorrektur aus #60. Der Master selbst bleibt die Basis; kein Rücksetzen auf #60.

Die gestrichelte Linie stammt aus `designAreaPreview`: Das größte freie Rechteck vor/neben dem Gerät wird als Gestaltungsrand gezeichnet. `workflow.mjs` benutzt dasselbe Rechteck zum automatischen Verkleinern bereits platzierter Texte. Eine Hausnummer neben dem Gerät liegt außerhalb dieses Rechtecks und wird deshalb bis zur Mindestgröße verkleinert, obwohl sie auf die Acrylfläche passt.

## Prüfung / Veröffentlichung

In Arbeit. Noch kein neuer Live-Stand behauptet.

## Lokale Abnahme vor Serverprüfung

- 75/75 gezielte Tests (Funkklingel, Rechte, Galerie, Geometrie, Warenkorbprüfung), 0 Fehler/Skips.
- Separater Master-Kontrolllauf: 46/46 (zusätzliche Texte, Textgrößen, Foto-/Positionierung, Shop-Einstieg), 0 Fehler/Skips.
- Build erfolgreich: 76 geprüfte Ressourcen, 127 Module, 14 unveränderte Master-Stylesheets; `editor-abf5b412e64a4a3e.mjs`, 1.326.141 Bytes (gzip 452.135).
- Eingefrorene Modellkopie vom 29.10. mit bereits veröffentlichter Designreparatur: 126 Produkte, 42 Modelle, 30.240 Ausführungs-/Positionskombinationen, 378 unterschiedliche Designsätze, 1.512 bebilderte Auswahlgruppen und 8.064 Layoutprüfungen; keine Quelldokumente geändert. Dies ist kein frischer Live-Datenbanknachweis.
- Echter lokaler Editor: 12a im Texttab von 15 auf 17 mm vergrößert; nach Wechsel auf 35×18, Gegenposition, Anthrazit, Seitenrahmen und Silikon sowie Neuladen erhalten. Preis 74,98 EUR. 16 unterschiedliche Designs in der aktuellen Master-Galerie. Kompakte Auswahl auch bei 390×664 bedienbar.

Reproduzierbar mit `node scripts/check-doorbell-master-presentation.mjs <models-export> --repair-proposal`. Ohne den Schalter werden aktuelle Exportdaten unverändert geprüft.

Screenshots: [12a mit 17 mm](assets/2026-10-31-doorbell-master-repair/12a-17mm-desktop.png), [Befestigung](assets/2026-10-31-doorbell-master-repair/befestigung-desktop.png), [Master-Designgalerie](assets/2026-10-31-doorbell-master-repair/designs-desktop.png), [Mobil](assets/2026-10-31-doorbell-master-repair/mobile-390.png).

## Geplanter kontrollierter Serverweg

Eigene Kopie der aktuellen Laufzeit `private/konfigurator-master-20261031-fixes`, Abgleich aller app-Dateien mit main-Basis, danach nur die im Branch geänderten Dateien überlagern. Linux-Tests und Build vor dem Wechsel. Erst anschließend Startup-Zeiger gezielt auf die geprüfte neue Kopie ändern und Node-App neu starten. Vorherige Startdatei sichern; Rückweg: Startdatei wiederherstellen und App neu starten. Kein Import und keine Änderung an Katalog, Preisen, Produktrevisionen, Bindungen oder Shopify.

Linux-Ergebnisse und tatsächlicher Live-Nachweis werden nach Ausführung ergänzt. Kein Safari-/Bestell-/Produktions-Endtest behauptet.
