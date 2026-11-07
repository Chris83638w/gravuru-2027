# Demo R11 – Werkzeugleiste mittig

Nutzerauftrag: Screenshot 197, „Das Werkzeug mit Drehen sollte mittig sein.“ Nur zwei Darstellungsregeln in `app/configurator/mobile-demo/demo.css` geändert: gleiche 12-px-Seitenabstände statt ehemaliger 64-px-Fotobutton-Reserve rechts; Aktionsgruppe sicher mittig ausgerichtet, bei Überbreite weiter scrollbar. Höhe, Position nach oben/unten, Aktionen, Designs, Preise und native Funktionen unverändert. Eigener Branch / Draft #193, kein Kunden-Shop-Eingriff.

Vorher gesichert: Commit `5e170ea4a13bac7084e9afe275d14d20a584f65e`, Archiv `checkpoints/mobile-demo-r11-toolbar-20261107/before-r11-5e170ea4.zip`, SHA256 `4ab01a5e68ab1776ea0da6b7285d398a6138f1bf4eb42a40f9c99738d675dc57`. Designs weiterhin unverändert nach [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

Gezielte lokale Chrome-Prüfung: 390 px Werkzeugleiste x=12 bis 378, 320 px x=12 bis 308; Mittelpunkt jeweils exakt wie Produktfläche. Alle fünf sichtbaren Motivaktionen bleiben innerhalb der Leiste. Bei 1440 px PC Vorschau 0 bis 1022,40625 und Leiste 12 bis 1010,40625, ebenfalls gleicher Mittelpunkt. Nativer Klick „Motiv um 15 Grad drehen“ ergibt rotate(15), Rückgängig stellt rotate(0) wieder her. Keine zusätzliche Verhaltensänderung, deshalb keine neuen Implementierungstests für die beiden CSS-Regeln. Physische Handyabnahme durch Mikail bleibt separat.

Nächster Schritt: getrennte R11-Demo bereitstellen, öffentlichen Mittelpunkt prüfen. R10 und die dortige vollständige Sicherung/Anbindung bleiben gültig; echter Produkt-/Warenkorb-Livegang ist weiterhin separat abzunehmen.
