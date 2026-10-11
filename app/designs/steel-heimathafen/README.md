# Erhaltene Edelstahl-Gestaltungen

Zwei native Heimathafen-Designs aus `Chris83638w/gravuru-shopify`, Sicherungscommit `d34535968b40ad4dfed496e081b9241059a6863f`, `platform/sources/workshop-seed/import.json`. Originalkennungen, Maße, Texte, Fonts und Motivzuordnung in `source.json`; Shopify-Zuordnungen ausdrücklich entfernt. Quellprüfsumme steht im JSON.

Die Motive stammen bytegetreu aus dem bereits gesicherten Werkstattkatalog und werden mit dessen verschachtelten SVG-Koordinaten durch den vorhandenen geschützten Designimport aufbereitet. Schriftpfade: Montserrat, Lora, Allura. Modell 90 × 60 × 1,5 mm, Grundpreis 1.099 Cent; zusätzliches Motiv 169 Cent aus dem alten Profilbestand. Die vorhandenen Designmotive sind im Preis enthalten.

Das frühere flache Materialbild „Charlotte Groner“ liegt separat unter `app/workshop/ui/material-surfaces/steel-reference-v4.png`; SHA-256 `bceaac4cd6bdba8aa1b5428625856d6eeec37a2d40ba0210bbbcb670b36198f4`. Es ist die erhaltene v4 aus `REFERENZ-MATERIALIEN-20260930.zip`. Kein passender nativer Charlotte-Groner-Stand wurde gefunden; die zwei Katalogdesigns sind nicht dessen identische Rekonstruktion. Die Werkstatt zeigt diese Unterscheidung unter „Hintergrund & Szene“.

Import: `app/workshop/specimen-import.mjs` erzeugt je einen Master und eine Produktkopie für Edelstahl und AOSU/Labrador. Feste Importschlüssel verhindern Duplikate und überschreiben keine späteren Bearbeitungen. Acrylstände bleiben erhalten.
