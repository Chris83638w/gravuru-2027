# Paket J · 10 gesperrte Startdesigns einpassen · 24.10.2026

Für **Astra High** (Codex, GPT-5, Reasoning high), **nach** dem Fix von PR #16 (Vorschau-Gate) im selben Account.
Entscheidung von Chris (24.10., Chat): **Designs einpassen** – das Motiv bleibt, Motiv bzw. Schrift werden nur so wenig
wie nötig verkleinert oder verschoben. Startdesigns werden **nicht** auf D1 getauscht.
Weitere Entscheidung: Rund 8,5 × 8,5 = 14,99 € (Katalog `1be49ee`). Damit sind alle Edelstahl-Grundpreise gesetzt.

---

Du bist Programmierer im Projekt gravuru 2027 (Chris, Inhaber; Deutsch, Du, kurz). Boss ist Claude: Er prüft und merged.
Basis: Code `main` (nach PR #16), Katalog `main` `1be49ee`. Lies deine eigene Übergabe
`docs/handoffs/2026-10-24-paket-i-startdesign-sperren.md` (die 10 Fälle mit Quellen und Nachrechnung) sowie
`gravuru-katalog./designs/README.md` (Lieferform 2).

**Ziel:** Die 10 Hauptprodukte 5300000, 5400000, 5500000, 5800000, 6100000, 6200000, 6500000, 6800000, 10600000 und
12600000 haben auf ihrer zugeordneten Größe keine `size_fit`- bzw. `design_invalid`-Sperre mehr. Startdesign und
Zuordnung bleiben gleich; Kennungen bleiben stabil.

Vorgehen:
1. **Erst messen, dann ändern.** Prüfe je Fall die tatsächlichen Pfade, nicht nur den Objektkasten (Ellipse bzw. Kontur
   mit `designArea.marginMm`, Lochschutzzonen). Ergebnis je Fall: „Pfade liegen schon innen“ oder „ragt um x mm hinaus“.
2. **Pfade schon innen:** Dann ist die Sperre ein Artefakt der Kastenprüfung. Die Prüfung in `templateFit`
   (bzw. der Ovalprüfung, die sie nutzt) wird für Oval und Kontur pfadgenau: Die Kastenprüfung bleibt als schneller
   Vorfilter, die Pfadprüfung entscheidet. Eigener Commit mit Tests (innen / knapp außen / Lochschutz). Der Editor
   klemmt weiterhin wie bisher; prüfe, dass die Startposition im Konfigurator nicht verschoben wird.
3. **Wirklich außen:** Kleinstmögliche Korrektur im Master: das betroffene Element gleichmäßig um seinen Mittelpunkt
   skalieren und/oder verschieben, auf 0,01 mm gerundet, mit 0,2 mm Luft. `design.json` und `design.svg` müssen
   dieselbe Geometrie zeigen. Andere Elemente bleiben unverändert. Ausnahme Retro II D12: Den Spruch aus der
   Lochschutzzone schieben. Für die beiden Fälle mit 0,003 bzw. 0,005 mm reicht eine Verschiebung.
4. **D57 auf 420 × 280 (Schrift 119,49 mm > 100 mm):** Die kleinste Lösung wählen, die nur diesen Fall betrifft. Falls
   das Schema eine Begrenzung je Größe kennt, diese nutzen. Sonst die Master-Schrift so weit verkleinern, dass 420 × 280
   ≤ 100 mm ergibt, und im Bericht zeigen, wie D57 auf den anderen Größen aussieht. Die 100-mm-Grenze nicht anheben;
   das wäre eine Fertigungsentscheidung von Chris.
5. Protokoll je geändertem Design in `_aenderungen.jsonl` (wer: „Astra (Paket J)“, was, alt → neu, Grund).
   **Keine Freigabe setzen.** `python3 -I gravuru-2027/scripts/build-katalog.py --katalog gravuru-katalog.` mit Exit 0.
6. Nachweis: `designDashboardWithFit` für `edelstahl-tuerschilder` → 104 Zuordnungen, 0 `size_fit`/`design_invalid`
   bei den 10, die übrigen 94 unverändert (Fit-Status gleich). Alle nicht betroffenen Design-Dateien bytegleich
   (Prüfsummen vorher/nachher).
7. **Bericht für Chris** (`docs/handoffs/2026-10-24-paket-j-bericht.md`): je Fall vorher/nachher als PNG nebeneinander
   (aus `design.svg` gerendert, Zielgröße), Änderung in mm/%, Status. Branches `dev/designs-einpassen-20261024-astra`
   in beiden Repos (falls Code betroffen), PRs gegen `main`, Absatz oben in `STATUS.md`.

Regeln wie immer: nichts erfinden, nichts löschen, keine Live-Systeme, kein Merge, kein Force-Push, LF-Zeilenenden,
Katalog-JSON nicht umformatieren.
