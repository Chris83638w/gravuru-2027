# #230 – weicher Materialschatten für Acryl und Edelstahl

11.11.2026 · Codex/product_plans · Ausgangscommit 6298f7af22056333569b030c249ce64568e46beb. Nutzerkorrektur im aktuellen Chat: Acryl wirke wegen der harten versetzten Kontur wie zwei Schilder; weicher natürlicher Schatten für Acryl und Edelstahl. MATERIALREFERENZEN.md bleibt maßgeblich. Originaltexturen, Farben, Frontkonturen, Texte, Maße und gespeicherte Materialstärken bleiben unverändert.

## Ursache und Umsetzung

Der Kundeneditor ergänzte bereits plateDepthPreview für familyFormats; die native productPreview ließ diese Ebene aus. Beide Wege verwenden studioSvg → acrylicPlatePreview. Dort lag unter der Acrylfront eine zweite, hart verschobene Vollkontur. Das war eine willkürliche Vorschauprojektion, keine bestätigte technische Geometrie.

- material-surface.mjs: derselbe getrennte, nicht interaktive Guide-Schatten mit weicherem Verlauf und gerichteter Verschiebung; keine Materialfläche oder Gestaltung wird ersetzt.
- product-preview.mjs: familyFormats erhält denselben Schatten wie der Kundeneditor. Szenenbild, Textur und Originalgestaltung liegen weiter in ihrer bisherigen Reihenfolge.
- acrylic-plate-preview.mjs: verschobene Vollkontur entfernt. Die bestehende feine Front-Randkante, Oberflächenfarben, Reflexion und Rückseitengravurbehandlung bleiben erhalten. Kein zusätzlicher versetzter Körper, kein Glow. Die Materialangabe 3 mm und Produktionsgeometrie werden nicht verändert.

## Prüfung

11/11 gezielte Tests bestanden: material-surface-preview.test.mjs, product-preview-mounting.test.mjs und backing-preview-viewport.test.mjs. Abgedeckt sind die nicht interaktive Schattenschicht, bytegleiche vorhandene SVG-Inhalte nach Entfernen dieser Schicht, Kontur-/Ellipsenbezug, unveränderte Bohrlochlogik, genau eine Acrylfront ohne verschobene Kopie, bestehende Randkante und unveränderte Viewport-/Montagegeometrie.

Fünf direkte Vorher-/Nachher-Ansichten aus den echten unveränderten v8-Plänen: Acryl 120×80, 50×20, 80×20 mm; Edelstahl 50×20 und 80×20 mm. Renderer ist jeweils productPreview, vorher aus dem eingefrorenen B-Arbeitsbaum, nachher aus diesem neuen Arbeitsbaum. Quellen-/Plan-/SVG-Hashes stehen in preview-provenance.json. Materialvergleich.png wurde tatsächlich betrachtet; die früher isolierte schwarze zweite Acrylkontur ist verschwunden, Stahl zeigt einen diffusen Schlagschatten. Keine Browseraufnahme behauptet; die Browserprüfung übernimmt der Root-Agent.

Zusätzlich wurden aus allen fünf echten Konfigurationen unveränderliche lokale In-memory-Prüfpakete erzeugt und mit acrylicArtwork vor/nach dem Patch verarbeitet. Die erforderlichen Namenfelder erhielten ausschließlich im Kundentest den kurzen Musterwert „Koch“, weil der bestehende Checkoutvertrag unveränderte Beispielnamen ablehnt. Die gespeicherten Designs und die gezeigten Vergleichsbilder behalten ihre Originaltexte. **Alle fünf Produktions-SVG sind bytegleich, alle Produktionskonturen identisch; Schatten und Materialdekorationen fehlen im Export.** Nachweise: production-comparison.json. Kein PDF-/Maschinenfreigabenachweis daraus abgeleitet.

Reproduktion der gezielten Tests:

```powershell
node --test app/configurator/variant-m/material-surface-preview.test.mjs app/workshop/product-preview-mounting.test.mjs app/configurator/variant-m/backing-preview-viewport.test.mjs
```

Die ausgeführten Realquellen-Skripte stehen im Sitzungsordner unter work/material-review/render-comparison.mjs und verify-production.mjs; sie lesen die eingefrorenen v8-Pläne sowie beide lokalen Codebäume. Der Produktionscheck nutzt das bereits vorhandene Python-/Pillow-Importumfeld. Ergebnisse liegen unter outputs/Materialvorschau-230. Keine Datenbank, XLSX oder native Plan-ID wurde verändert. Kein Commit, Push, Deployment oder Liveproduktzugriff durch diesen Teilauftrag; Root integriert den gemeinsamen Such-/Materialbranch.
