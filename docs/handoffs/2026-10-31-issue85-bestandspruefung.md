# Issue 85 – Quellenprüfung und parallele Bearbeitung

Codex, 31.10.2026. Auftrag: https://github.com/Chris83638w/gravuru-2027/issues/85, Nachrichten 1–4 vollständig gelesen. Gestaltung folgt dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Stand

Nachricht 4 (runde Schilder aus Quadratvorlagen) hat Vorrang. Derselbe Auftrag wird gleichzeitig im aktiven Chat „Firmenschilder“ umgesetzt, Branch `dev/issue85-design-transfer-20261031`. Dessen Dateien wurden ausschließlich gelesen. Hier entstehen keine zweiten runden Katalogeinträge. Die ergänzende Übernahme der Hunde-/Katzen-Bestände wurde dem Nutzer im Chat zur Aufteilung vorgeschlagen; Antwort noch offen.

Die beiliegende Quellenprüfung inventarisiert 163 Bestandsdatensätze: 35 Tierschilder sowie Hund/Katze/Kleintier aus Hinweisschildern, Türschildern und Hausnummern. Enthalten sind Quellpfade, IDs, Texte, Schriften, Importhinweise, Prüfsummen und exakte Inhaltsgruppen. Keine visuell bestätigte Deduplizierung und keine Bestands-ID→neues-Design-Zuordnung behauptet. Ziel-IDs bleiben null.

## Regelquellen

- Nachricht 1: editable Texte/Motive (Lieferform 2), Edelstahl und identische Acryl-3-mm-Ziele, Dubletten vor Umsetzung prüfen, bevorzugt V2A, reale Zielvorschau, getrennte PRs, keine Freigabe/kein Live-Schritt.
- Nachricht 2: weitere Hunde-/Katzen-/Kleintierbestände; vorhandene Rasse-Designs aus #61 erhalten. Memorials, Standbilder, Tierzubehör und Kreuze ausgeschlossen.
- Nachricht 3: zehn Pakete in vorgegebener Reihenfolge; fehlende Familien nur nach Preis-Excel, keine Werte erfinden.
- Nachricht 4: Rund zuerst, Master 65 mm, danach 85/120/160/200 mm, individuelle Kreis-Komposition und keine quadratischen Innenrahmen; ungeeignete Vorlagen dokumentieren.
- Bereits vorhandene Kennungsquelle: `familien/edelstahl/quellen/edelstahl-serie-2027-abgleich.md` nennt im Abschnitt „Neue Größen“ ausdrücklich `TR-V2A-6,5x6,5` bis `TR-V2A-20x20`. Design-ID-Schreibweise nach `designs/README.md` prüfen. TR ist damit als Quellenkürzel belegt, nicht frei erfunden. Alte Preisvorschläge dieses Dokuments ersetzen nicht die aktuelle Preis-Excel.

## Prüfnachweise und Grenzen

Siehe `docs/reviews/issue85-bestandspruefung/README.md`, `inventar.json` und vollständiger Issue-Auszug `AUFTRAG.md`. Der Generator liest einen festen Git-Stand; Änderungen am Katalog oder App-Verhalten erfolgen nicht. Es wurden noch keine neuen Design-SVGs, Kontaktbögen oder Zielvorschau-Prüfungen für dieses Paket erstellt.

Prüfung: 163 eindeutige Quellpfade, erneuter Lauf mit identischem Inventar, alle Ziel-IDs null; Git-Diff ohne Formatfehler. 34 Datensätze melden im historischen Import fehlende Schriften, 20 enthalten Hinweistexte; aktuelle Schrift- und visuelle Prüfung bleiben erforderlich. Keine exakt identischen Inhaltsgruppen gefunden, semantische Material-Dubletten weiterhin offen.

Reproduktion: `python scripts/design-pruefung/issue85-inventory.py --katalog <Katalog-Repo> --ref <catalogRevision-aus-inventar.json> --out <Ausgabeordner>`.

## Nächster Schritt

Aufteilung mit dem aktiven Chat klären; danach dessen runde Lieferung und Paket-Reihenfolge berücksichtigen. Bei Übernahme von Paket 3: visuell gegen Originale und bereits vorhandene LF2-Designs deduplizieren, Text/Motiv-Ebenen übernehmen, neue Ziel-IDs kollisionsfrei zuordnen, aktuelle Schriften/Familien prüfen und echte Konfi-Kontaktbögen erstellen. Hinweis-Hunde gehören zu Paket 1, Hausnummern zu Paket 5, keine zweite Zuordnung anlegen. Issue 85 ist weiterhin offen und nicht vollständig umgesetzt.
