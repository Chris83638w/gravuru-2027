# Design QA – gravuru Salbei

final result: blocked

Ziel: die gewählte Salbei-Richtung mit einer Primärfarbe, ruhiger Bildführung, einer Hero-Aufnahme, drei Kacheln und Mega-Menü in einem Shopify-Theme umsetzen.

## Tatsächlich geprüft

- Alle fünf lokal gespeicherten Motive einschließlich des Materialbilds wurden visuell betrachtet. Sie entsprechen der neutral-warmen Bildrichtung; es sind generierte Illustrationen.
- Strukturprüfung der 68 JSON-Dateien und 42 Abschnittsschemas: nach Korrektur ungültiger Radiuswerte keine gefundenen Fehler. Setting-IDs, Blocktypen, Bereichs-/Auswahlwerte, Template-/Gruppenverweise und Blockreihenfolgen geprüft.
- JavaScript-Syntax mit Node geprüft. Menüs nutzen native `details`/`summary`; Escape, Außenklick und Fokuswechsel sind implementiert, aber noch nicht im Browser abgenommen.
- Der ursprüngliche Font-Handle wurde anhand der offiziellen Shopify-Schriftliste auf `cormorant_n4` korrigiert. Die Darstellung der Schrift ist noch nicht gerendert geprüft.
- Farben können zentral geändert werden; native Dawn-Button-/Linkvariablen sind an die Primärfarbe gebunden.

## Blockaden

1. Der Browserlauncher startet nicht: `MXC launcher: cannot locate required Windows platform directory: HRESULT 0x80070003`. Kein Browser-Screenshot und keine bestandene visuelle Prüfung werden behauptet.
2. Zwei schema-gültige `themeCreate`-Aufrufe mit öffentlichen, fest versionierten Dawn-ZIP-Quellen scheiterten mit `Src is empty (source)`. Beide lieferten `theme: null`. Es gibt daher keine erzeugte Theme-ID und keinen verifizierten Vorschau-Link.
3. Der Upload eines lokal gespeicherten Hero-Bildes über den Shopify-Bildupload schlug mit internem Fehler fehl. Kein CDN-Upload wurde als erfolgreich gewertet.
4. Shopify CLI konnte in der verfügbaren lokalen Umgebung nicht ausgeführt werden. Vollständiger Theme Check und Shopify-Liquid-Laufzeitprüfung stehen aus.

## Noch abnehmen

Nach erfolgreichem Import: Startseite und Produktseite bei Desktop- und Mobilbreiten, kein horizontaler Überlauf, Bildausschnitte, Schrift, Mega-Menü per Maus/Touch/Tastatur, Escape/Fokus und Theme-Editor-Blockauswahl. Bearbeitung von Primärfarbe, Text, Bild und Reihenfolge speichern und wieder aufrufen. Lange Produktnamen, leere Kollektion und mehrere Varianten prüfen. Sprachwechsel mit übersetzten Inhalten und lokalisierten Links prüfen. Warenkorb, vorhandenen Konfigurator und B2B mit realen Shop-Bindungen separat prüfen.

Keine Veröffentlichung, kein neuer Checkout, keine Bestellung und keine Fertigung ausgelöst.
