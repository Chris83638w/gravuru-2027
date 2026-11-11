# Hauptacryl: tatsächliches Ziel und verbleibende Pilotprüfungen

11.11.2026, Codex/Astra. Dieses Paket ergänzt ausschließlich lesende Belege und eine lokale Dateivorschau. Anwendung unverändert zu `af6fd986c735d97bddc974261398ab8c4e88e00b`; kein Server-/Shopify-/Produkt-/Binding-Schreibzugriff. Keine neue Preis- oder Designentscheidung von Chris nötig.

## Identität und vollständiger Abgleich

Claude hat auf der gesicherten Serverkopie die tatsächliche native Identität belegt: `cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0`, Revision 1, Store `acryl`, Shopify `16190784602492`, alle 808 aktiven Bindungen. [Operatorbefund](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6806442706).

Der [Zielentwurf](../reviews/2026-11-11-main-target-preview/README.md) ordnet **778/778** v9-Kombinationen eindeutig vorhandenen Shopify-IDs zu; **30 vorhandene Restvarianten bleiben erhalten**. Keine neue Hauptprodukt-ID, keine Löschung. H1 bleibt Hauptbild; beide vorhandenen Bilder, Status und historische Revisionen bleiben erhalten. Genau sechs Textfelder korrigieren die drei schon geometrisch richtigen Größenlabels. Alle 778 Zielpreise sind v9-identisch. Gegen den vollständig gelesenen bestehenden Shopstand: **620 gleich, 138 B02S jeweils 30 Cent und 20 B04S jeweils 10 Cent zu hoch**. Vollständige Delta-Tabelle liegt bei.

Eine reine Dokumentrevision schaltet keine bestehende Bindung um. Ein späterer ausdrücklicher Wechsel der 778 Zuordnungen braucht aktuelle Köpfe, frische Shopify-Preise und neue revisionsgebundene Binding-IDs; Produkt- und Varianten-IDs bleiben gleich. Die 30 übrigen können weiter auf Revision 1 zeigen. Ein aktualisierter Kopf allein erteilt weder Verkaufs- noch Produktionsfreigabe.

Die [unabhängige Prüfung](../reviews/2026-11-11-main-target-preview/independent-review.md) bestätigt vollständig Varianten, Preise, sechs Textänderungen, fünf unveränderte v9-Quellen und die reine Vorschaugrenze. Ein vor Veröffentlichung gefundener Unterschied der Hashverfahren wurde korrigiert: Produktgruppen-/Transporthash `2da2130230341917f7a99d2a12889c1e2f10e408f64d3532e9c5ea6bae65713c`, ID-Bindinghash `deb2ce71bf57d5ff85e5f186378d94f58edeecc1ce4d7c4151bebf6e8072886f`. Gespeicherte SQL-JSON-Bytes sind nochmals gesondert zu prüfen. Keine Dokumentbytes zur Vereinheitlichung verändert.

**Genau nächster Zielschritt:** [lesender Vergleich auf Claudes Kopie](../reviews/2026-11-11-main-target-preview/operator-readonly-check.md): bestehendes Dokument/Metadaten, alle 808 nativen Bindungsverträge, tatsächliche Modul-/Ressourcen-/Fertigungsprofile und vorhandene Katalogfreigabe. Ganze Serverdokumente bleiben beim Operator; Rückgabe nur IDs, Revisionen, Hashes, Zähler und konkrete Deltas. Ein enges automatisches Vergleichswerkzeug wird separat nachgereicht. Noch kein ausführbarer Importpayload und kein bestätigter pgp-Plan für das tatsächliche Ziel.

## Tatsächlicher Shop-Einstieg und zusätzlich gefundener Startfehler

[Route und aktiver Themebeleg](../reviews/2026-11-11-main-shop-entry-review/main-shop-entry-route-review.md): MAIN-Theme `190984126844` nutzt `custom.customization_id` tatsächlich nur als Nicht-leer-Schalter. Der Start geht über Shopify Produkt-/Varianten-ID und native Registry; keine neue Alias-ID ist aus der abweichenden Kennung abzuleiten. Der private Hostresolver und die tatsächlich ausgelieferten JS-Bytes müssen noch vom Operator belegt werden; anonymer Abruf war 403.

[Gezielte 250er-Prüfung](../reviews/2026-11-11-main-shop-entry-review/main-variants-over250-review.md): Für Kandidat und nachgebildete Theme-Liste ist eine falsche Startvorauswahl reproduziert, beispielsweise Variante `58104626479484` an Position 331. Direkter Serverstart, spätere native Variantenwahl und Warenkorbtransport sind dagegen nicht auf 250 begrenzt; sechs gezielte Prüffälle belegen die Abgrenzung. Eine kleine separat geprüfte Embed-Korrektur folgt. Bis dahin **keine abgeschlossene Bedienabnahme** behaupten. Claude wurde in [#168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6806736241) informiert.

## Die vier bekannten Baseline-Testfehler

[Fotodichte](../reviews/2026-11-11-baseline-triage/baseline-photo-triage.md): drei überholte pauschale `cover`-Annahmen; tatsächliche gemeinsame Platzierung erhält ohne Maske/Crop das ganze Bild. Zusätzlicher Foto-Platzierungsvertrag 4/4 grün, mit explizitem Crop stimmen die alten Zahlen. Echte Foto-/Wiederöffnen-/Fertigungsprobe bleibt erforderlich.

[Werkstattnavigation](../reviews/2026-11-11-baseline-triage/baseline-konfis-triage.md): Seiteninventar 19 statt tatsächlich 23; dahinter eine echte uneinheitliche Verwaltungsnavigation. Kein bewiesener Kundenpilotfehler. Als separates Verwaltungsseitenpaket behandeln, keine pauschale Testausnahme. Keine Änderung dieser Tests oder Appdateien in diesem Paket.

## Abschlussgrenze

Claude führt Linux-, Datenbank-, tatsächliche Modell-/Bank-, PC-/Handy- und Leistungstests sowie den Pilotdurchlauf fort. Nach konkretem Zielvergleich und Pilot erhält Chris einen tatsächlichen Gesamtumfang zur Freigabe; keine weitere Abnahme der unveränderten lokalen v9-Pläne. Bestehende Produktentscheidungen nicht erneut fragen. Veröffentlichung, Variantenlöschung und Auswahl/Änderung alter Kleinprodukte werden nicht aus dieser technischen Abstimmung abgeleitet. Bis hier: **0 neue Produkte, 0 Preis-/Variantenänderungen durch dieses Paket, 0 Veröffentlichungen**.
