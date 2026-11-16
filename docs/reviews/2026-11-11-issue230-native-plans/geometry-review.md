# Neun Geometrieausfälle unabhängig eingeordnet

11.11.2026 · ausschließlich lokale Analyse · keine Originale oder Prüftoleranzen verändert.

**Die neun Ausschlüsse lassen sich nicht pauschal als Fehler einer rechteckigen Begrenzungsbox aufheben.** Der vorhandene Prüfer berücksichtigt bereits echte Motivpfade und Schriftkonturen. Er meldet für alle hier betroffenen Objekte `false` für den tatsächlichen Pfad, nicht `null` für einen nicht unterstützten Pfad. Sieben Fälle zeigen bei der unabhängigen Nachmessung einen Überstand jenseits der konservativen Messgrenze. Zwei liegen im Mikrometerbereich und bleiben ausdrücklich Grenzfälle.

Je Design wurde das **erste in `family-report.json` ausgeschlossene Zielformat** genauer nachgemessen. Das ist kein Maximum über sämtliche angebotenen Größen. Die vollständige Liste aller gemeldeten Zielgrößen steht zusätzlich im JSON unter `allReportedOccurrences`.

| Design | untersuchtes Ziel, mm | betroffenes Element | größte gemessene Überschreitung in diesem Ziel | Einordnung |
|---|---:|---|---:|---|
| TO-V2A-12x4-D5 | 120 × 40 | motiv-2 | 0,000079 mm | Grenzfall; unter 0,0021 mm |
| TO-V2A-15x8-D5 | 300 × 160 | motiv-2 | 0,000782 mm | Grenzfall; unter 0,0021 mm |
| TO-V2A-15x8-D9 | 300 × 160 | motiv-1 | 0,005021 mm | tatsächlicher Pfadüberstand |
| TO-V2A-9x6-D46 | 90 × 60 | motiv-1 | 0,003097 mm | kleiner tatsächlicher Pfadüberstand |
| TR1-V2A-9x6-D19 | 90 × 60 | motiv-1 | 0,005000 mm | tatsächlicher Pfadüberstand; Original enthält y = 60,005 mm |
| TR1-V2A-9x6-D5 | 90 × 60 | motiv-1 und motiv-2 | 0,097000 mm | tatsächlicher Pfadüberstand; Original enthält x = −0,097 mm |
| TR1-V2A-9x6-D9 | 90 × 60 | motiv-1 | 0,121903 mm | tatsächlicher Pfadüberstand |
| TR2-V2A-9x6-D15 | 90 × 60 | motiv-2 | 0,200775 mm | tatsächlicher Pfadüberstand |
| TR-V2A-6.5x6.5-D803 | 85 × 85 | text-1, „HARTMANN“, gedreht | 1,829868 mm | tatsächlicher Buchstabenüberstand |

Die vier ovalen Motive wurden zusätzlich direkt mit den unveränderten SVG-Koordinaten vor der Rundung von Objektmitte und Objektgröße gerechnet. Auch dort ergeben sich negative Randabstände: 0,000231 / 0,000782 / 0,004208 / 0,002736 mm Überstand in derselben Tabellenreihenfolge. Beim ersten und zweiten Motiv ist das eine numerische Mikroabweichung an der Originalkontur, keine Grundlage, den Entwurf still zu ändern oder eine reale Fertigungsabweichung dieser Größenordnung zu behaupten. Bei den anderen zwei vergrößert die Konverterrundung den schon im Original vorhandenen Überstand geringfügig.

## Prüfmethode und Grenzen

Quellen: Katalog-Commit `8236b8bfab7322447ec46661c116fa526331af3d`, v6-Familienbericht und eingebettete echte Schriftressourcen. Original-JSON und SVG wurden mit `git show` gelesen; ihre SHA256 und die betroffenen Objektpositionen stehen in `geometry-analysis.json`. Die Pläne v7 übernehmen dieselben Originalressourcen und Ausschlüsse.

Die native Konvertierung wird wiederholt, anschließend werden tatsächliche Kurven beziehungsweise Glyphen mit den Vorschautransformationen aufgelöst. Pfadauflösung: 0,00005 mm; zusätzliche Abtastung gerader Verbindungen höchstens alle 0,02 mm; Konturpolygon des bestehenden Modells: 0,002 mm. Konservativ bleiben Werte innerhalb ±0,0021 mm unentschieden. Die präzisere SVG-Zusatzprobe verwendet bei den ersten drei ovalen Motiven 0,00001 mm, beim komplexeren D46 0,00005 mm. Ellipsen werden analytisch gegen ihre echten Halbachsen gemessen; Außenpunkte erhalten eine gesonderte Lösung, da die native `ellipseEdgeDistance` nur für Innenpunkte definiert ist.

Damit ist ein Überstand an den aufgezeichneten Punkten prüfbar. Die Stichproben sind kein mathematischer Beweis der Fehlerfreiheit jedes anderen Pfadabschnitts oder aller Größen. Es wurden weder Fertigungstoleranzen festgelegt noch Bilder als Livebeleg erzeugt.

## Konkreter nächster Schritt

1. Die zwei Mikro-Grenzfälle mit Originalpräzision in einem gezielten Konverter-Regressionsfall nachstellen und die bestehende Randreserve gegen die tatsächlich vorgesehene Genauigkeit prüfen. Keine globale Lockerung und keine automatische Einpassung aller Designs.
2. Für die sieben nachgewiesenen Überstände eine gesonderte, versionierte Korrekturvorschau vorbereiten: Original daneben, betroffene Linie beziehungsweise Buchstaben und minimale Verschiebung/Skalierung sichtbar. Erst eine konkrete freigegebene Korrektur darf das Original im Kundenangebot ersetzen.
3. Danach die neun Designs in allen in `allReportedOccurrences` genannten Größen erneut durch denselben nativen Familienplan prüfen. Bis dahin bleiben die Ausschlüsse nachvollziehbar bestehen; die zwei anderen, absichtlich `hidden` gesetzten Katalogdesigns sind hiervon getrennt und bleiben ausgeblendet.

Reproduktion: `node analyze-geometry.mjs RUN KATALOG CODE NEUE_JSON` (RUN v6 oder v7; die Analyse liest nur Dateien und schreibt ausschließlich die angegebene neue Ergebnisdatei).
