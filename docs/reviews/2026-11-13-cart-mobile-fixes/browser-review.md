# Sichtprüfung des lokalen Kandidaten

13.11.2026, Root. Echter gebauter Konfigurator im Chrome-Browser; Viewport 390 × 844, anschließend zurückgestellt. Lokaler Host auf Loopback, v9-Quellen und synthetische Bindungen, Shop-/Cartänderungen gesperrt. Kein physisches Smartphone und keine Serverinstallation.

Der bestehende Testhost aktivierte zunächst ausdrücklich die zusätzliche Sheet-Oberfläche. Diese zeigte S82 vollständig mit 319 px Breite bei x=28. Anschließend wurde nur in der neuen lokalen Hostkopie dieses Präsentations-Override entfernt, um die von Root zuvor live beobachtete normale Oberfläche zu prüfen. Der erste Mobilpatch verkleinerte hier die Platte auf 88 × 22 px. Ursache war doppelt belegter Höhenbedarf. Nach dem gezielten CSS-Nachtrag wurden folgende endgültigen Ergebnisse sichtbar geprüft:

| Fall | Ergebnis |
| --- | --- |
| S82, native normale Ansicht | 80 × 20 mm; SVG 312 × 78 px bei x=31,5, beide Maße vollständig sichtbar; Reset in eigener Zeile |
| A52, native normale Ansicht | 50 × 20 mm; SVG 230 × 92 px bei x=72,5, beide Maße vollständig sichtbar |
| Main, native normale Ansicht | 120 × 80 mm vollständig sichtbar; Reset und Zoom getrennt, Foto-/Logo-Reiter vorhanden |
| S82 Vollbild | Ganze Platte und beide Maße sichtbar; Reset bleibt erreichbar |
| Reset im Vollbild | Echte Bestätigung erscheint; Abbrechen erhält die Gestaltung; Rückkehr zur Konfiguration funktioniert |
| S82 Menge | 1 → 10 ergibt 80,70 €; vollständiges Neuladen erhält sichtbare Menge 10 und 80,70 € |

Bildbelege liegen in `screenshots/`. Der lokale Neuöffnungstest bestätigt den Sitzungsschutz; er ist kein erfolgreicher Shopify-CartEdit- oder Bezahlvorgang. Die frühen/späten privaten CartEdit-Vorrangfälle sind gesonderte gezielte Autorenprüfungen mit nativen Prüfpfaden und Testports.

Die alten Livebefunde bleiben im Bild-/Text-Freigabepaket als Vorherzustand erkennbar. Ein Operator muss die gleichen relevanten Abläufe nach einem genehmigten tatsächlichen Einbau erneut auf dem Host prüfen.
