# Hauptprodukt-Unterlage: belegter Umfang vorbereitet

12.11.2026, Codex/Astra. Dokumentationsnachtrag; Runtime unverändert f85390b. [Unterlagenstruktur](../reviews/2026-11-12-main-v7-preparation/README.md) und [Zielmatrix](../reviews/2026-11-12-main-v7-preparation/main-v7-target-matrix.json) sind vorbereitet. Keine Excel-v7-Datei, keine Ausführungsdatei und keine Freigabe erzeugt.

Das bestehende Hauptacryl16190784602492 und cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0 bleiben erhalten. Geplant ist Revision1→2 für778 bestehende Zielvarianten;30 Restvarianten bleiben beiRevision1. Alle808 IDs/SKUs sowie Name/SEO/Kategorien/H1 und DRAFT-Status erhalten.158 historische Shoppreise werden auf die unveränderten bestätigten v9-Preise korrigiert;30 Varianten erhalten präzisere Größenbeschriftungen.6 Varianten betreffen beide Änderungen, daher182 verschiedene Varianten. Kein neuer Preis- oder Designbeschluss.

Root hat die Mapping- und v9-XLSX-Hashes sowie778+30/158/30/6/182 unabhängig lesend nachgerechnet; [Zählbeleg](../reviews/2026-11-12-main-v7-preparation/root-count-check.json). Das ist keine neue Prüfung des Livezustands und kein Produkttest. Autorprüfung und vorhandene Operatorbelege schließen Kategorien-/Legacy-Leselücken. Vor echten Schreibschritten müssen aktuelle Shop-/Kopf-/Preisbelege separat frisch gewonnen werden.

Nächster Eingang ist Claudes tatsächlicher nativer Kopienlauf mit `captureUpdateObservation`, vollständigem Validator, Ressourcenleser und Update-/Replay-/Rollbackbeleg. Daraus entstehen der echte updateReviewHash und erst anschließend die neue XLSX-v7-Akte unter Erhaltung aller bisherigen Blätter. Aktuelle Review-/Observation-/Importfingerprint-/v7-/Freigabehashes bleiben ausdrücklich null. Alte v9-Pläne und die aktuelle v6-XLSX bleiben unverändert.

Die spätere konkrete Gesamtunterlage benennt natives Update,158 Preise,30 Labels,778 Bindungen in8 Blöcken und Rev2-Katalogfreigabe als separate Schritte. Der vorhandene native Updateadapter führt die Shop-/Bindungs-/Katalogschritte nicht selbst aus. Keine Platzhalterfreigabe vorlegen. Die16 ACTIVE-Kleinprodukte und30 alten Hauptbindungen bleiben erhalten; sechs Kleinproduktziele sind trotz geklärter Registerlage noch nicht ausgewählt.

Keine erneute Abfrage bestätigter Preise/19% MwSt., Uploads, Startvorlagen oder H1. Keine App-/DB-/Shopänderung, keine neuen Produkte, keine Veröffentlichung. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); keine Designänderung.
