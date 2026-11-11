# Unabhängiger Review der Materialvorschau

11.11.2026. Lesender Review durch den zweiten Agenten; keine Server-, Produkt-, Katalog- oder Datenbankänderung.

Der finale Diff betrifft drei Vorschaufunktionen: den separaten Plattenschatten, seine Einbindung in die native Produktvorschau und die Acrylglasdarstellung. Die verschobene harte Vollkontur ist entfernt. Die vorhandene feine Randkante, Flächenfarben und der Gravurfilter bleiben erhalten. Materialstärke und Quellgeometrie werden nicht geändert. Der diffuse Schatten trägt weiterhin die Kennzeichnung als Vorschau-/Hilfsebene und wird vor der Platte gezeichnet.

Die drei finalen Dateien wurden nach dem letzten Kantenfix erneut gelesen. Kein funktionaler Fehler im begrenzten geprüften Umfang gefunden. Die vier endgültigen Kontaktbögen mit insgesamt 21 echten Materialansichten wurden visuell geprüft: Schatten weich, keine zweite harte Plattenkontur, Texte und Motive vorhanden und lesbar. Die Einzelansichten und ihre exakten Rendererprüfsummen stehen in `../2026-11-11-issue230-start-alternatives/Quellen.json`.

Den Reproduktionslauf `verify-production.mjs` und seinen Beleg **production-comparison.json** unabhängig gelesen: Beide Codeversionen erhalten dasselbe native, lokal vorbereitete Kundenpaket aus fünf tatsächlichen v8-Quellen. Nur erforderliche Beispielnamen werden für diesen lokalen Test im Speicher gleichlautend auf „Koch“ gesetzt. Alle fünf Vergleiche melden bytegleiche Gravur-SVGs, identische Geometrie, unveränderte Quelldokumente und keine Schatten-/Materialdekorationen in den Gravurdateien. Die Hashpaare stimmen im Beleg jeweils überein. Die Vorschauänderungen liegen außerhalb dieser Produktionsfunktion.

Dieser Review bestätigt den begrenzten Code-/Darstellungsvergleich und den nachvollzogenen Produktionsbeleg. Er behauptet keine neue Designfreigabe, keinen Live-Einsatz und keine vollständige Warenkorb-, Bestell- oder Maschinenabnahme. Die separate Browserprüfung übernimmt der Hauptagent.
