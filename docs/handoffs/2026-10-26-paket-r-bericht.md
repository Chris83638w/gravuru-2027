# Paket R · erster PR: Zielprüfung und Rückkehr · 26.10.2026

Codex / Astra. Auftrag: Nachtrag vom 26.10. zuerst separat; R1 und R3 folgen danach.

## Basis und Grenzen

- Codebasis `376b5b6537291a81c418b0e26835a9e14359f51b`, Branch `dev/paket-r-20261026-astra`.
- Katalogbasis `fd50c645996a216b57f6c573808bc2486e5970f4`. Vor Browseränderungen wurden alle 761 Master-design.json der privaten Testkopie gegen diese Git-Blobs geprüft: 761 identisch, 0 Abweichungen.
- Keine echten Katalogänderungen, Freigaben, Importe, Shopify-Aufrufe oder Merges. Browseränderungen betreffen ausschließlich die private Testkopie.

## Verhalten

- Kacheln und neue Ansicht „Zielprüfung“ zeigen die echte Zieloberfläche mit Kontur und Bohrungen. Vorgabe ist die erste kompatible Größe. Filter für Linie, Reihe, Thema, Status und Startdesigns bleiben nutzbar.
- 24 Kacheln je Seite, höchstens drei gleichzeitig laufende Vorschauabrufe, Zwischenspeicher anhand der aktuellen Quellprüfsumme. Nicht sichtbare Kacheln laden erst beim Sichtbarwerden.
- „Alle geprüften mit „passt“ freigeben“ erfasst nur geladene und tatsächlich sichtbare Vorschauen der Sitzung. Bestätigungsdialog mit Anzahl; pro Ziel derselbe authentifizierte PATCH mit erneuter Prüfung unter Schreiblock. „prüfen“ bleibt einzeln nach Öffnen, „passt nicht“ und fehlende Schriften bleiben gesperrt.
- Größen tragen Maße plus tatsächlichen Formgruppennamen und sind nach Form gruppiert; kompatible Größen stehen zuerst (Issue #24). „Rund: 0 Designs“ wird ausdrücklich angezeigt.
- Bearbeiten öffnet im eingebetteten Editor. Zurück erhält das Dashboard-Dokument, Filter, Reihe, Ansicht, Scrollposition und geladene Bilder. Nach dem Speichern wird nur die betroffene Kachel ersetzt und deren Zielprüfung verworfen. Ungespeicherte Änderungen verlangen eine ausdrückliche Entscheidung.
- Im Händlerhost erhält der Editor für jede API-Anforderung einen frischen Sitzungstoken über den geprüften Elternkanal. Herkunft, Fenster, Kanal und Designidentität werden geprüft; die API-Authentifizierung bleibt unverändert.

## Prüfungen

Gezielte Modulprüfungen: Dashboard und Cache 64/64; Backend-Zielvorschau 14/14; Editor/Host/Rückkehr 65/65. Der vollständige Windows-Lauf und die Browserbelege werden vor Übergabe unten ergänzt.

## Anschließend R1 und R3

Sammelzuordnung und Hauptprodukte erhalten einen separaten Folge-PR. Eine fachliche Rückfrage zur bisherigen Trennung von Designfreigabe und offenen Preisen steht in [Issue #25](https://github.com/Chris83638w/gravuru-2027/issues/25); der vorliegende R2-PR ändert diese Regel nicht.
