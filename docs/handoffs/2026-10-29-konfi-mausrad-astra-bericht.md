# Mausrad über Texten, Motiven und Auswahlgriffen

Stand: 29.10.2026. Ergänzung auf PR #43, Basis e741a51bc3031f1b2856b8cae8bd10ce8064749c. Kein Livegang.

Der Ansichtszoom nimmt Mausrad-Ereignisse jetzt auch an, wenn ein Element innerhalb der Schildszene wegen SVG-Verknüpfung oder Auswahlgriff als Bedienelement erkannt wird. Echte Formulare und Werkzeugleisten, Fotobearbeitung sowie Handy-Eingaben behalten ihre bisherigen Regeln. Zeigerziehen und Objektgrößen werden nicht umgestellt.

Neue Regression prüft Text, Motiv mit Bedienelement-Vorfahre und Auswahlgriff: Nur die Ansicht ändert sich, der gespeicherte Objektzustand bleibt gleich; Werkzeugleisten und Handy bleiben ausgenommen. Zoom/Zoommodell **26/26**, kombiniert mit Nachtrag 6 **122/122** grün. Build erfolgreich.

Native lokale Browserprüfung auf dem kombinierten Stand: Mausrad über ausgewähltem Text, Leuchtturmmotiv und Größengriff jeweils **100 % → 182 %**, Schrift **10 mm → 10 mm**. Bei normalen Textzentren war der Zoom auch vor dieser Ergänzung bereits funktionsfähig; der neue Fix schließt die Bedienelement-Ausnahme innerhalb der Szene. Deshalb kein behaupteter allgemeiner Vorher-Fehler für jeden Text.

[Bilder](konfi-mausrad-20261029-astra/README.md): Desktop 1440 × 900, Handy 390 × 664 und 375 × 548. Reale lokale Mausrad-Eingaben; Handy-Bilder sind Chromium-Viewport-Prüfungen, keine Safari-Abnahme.

Kombinierter Windows-Vollauf: **1810 / 1731 bestanden / 74 fehlgeschlagen / 5 übersprungen**. 73 Fehler durch python3-Store-Alias/Spawn, einer durch Python-cp1252-Ausgabe. Alle 74 Fehlertestnamen bereits in früheren Windows-Protokollen. Keine Tests gestrichen oder abgeschwächt. [Details und Log-Prüfsummen](konfi-mausrad-20261029-astra/tests.json).

Offen: frischer kombinierter Linux-Vollauf, echte Safari-Zwei-Finger-Prüfung und Abnahme am Live-Shop erst nach Chris' ausdrücklicher Freigabe. Galerie-Nachtrag 6 gehört zu PR #42 und muss vor dem gemeinsamen Livegang mitgeprüft werden. N7/D8-Preisvertrag bleibt separat offen.
