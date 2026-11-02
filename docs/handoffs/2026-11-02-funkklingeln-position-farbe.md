# Funkklingeln: Farbe neben Position · 02.11.2026 · Codex

Quelle vor Umsetzung: Chris im Funkklingel-Chat am 02.11.2026: Farbauswahl neben die Position der Klingel, damit die Befestigung nach oben rückt und alles sichtbar wird; Konfi um 6 % kleiner. Präzisiert: ausschließlich Funkklingeln. Darstellung als 94 % der bisherigen automatisch eingepassten Schildvorschau; echte Millimetermaße bleiben gleich. Vorhandene Master-Funktionen erhalten, insbesondere stabile Vorschau bei Textauswahl und verschiebbare Gestaltung auf Acryl. Bestehende Live-Freigabe für diesen Funkklingel-Ablauf liegt im Chat vor.

Eigener Branch `dev/funkklingeln-position-farbe-20261102-astra` auf main `06987af88ca0ff0e78f708873f6f36569ddbfebf`. Nur Funkklingel-Darstellung und zugehöriger bestehender Test; keine Änderung von Produktdaten, Designrechten, Preisen, Shop-Bindungen, Geometrie oder allgemeinen Master-Modulen. Keine Designänderung; [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich.

Geplante Anordnung: Format; Position und runde Farben nebeneinander; Edelstahlrahmen; Befestigung. Bei großem Desktop drei Befestigungen pro Reihe, bei schmalem Bildschirm zwei. Unter 380 px werden Position und Farbe zugunsten bedienbarer Felder untereinander angeordnet.

Lokale Abnahme unten; Linux- und Live-Nachweis werden nach tatsächlicher Durchführung ergänzt.

## Lokale Abnahme

Die Reihenfolge ist Format; Position und runde Acrylfarben nebeneinander; Edelstahlrahmen; Befestigung. Große Desktop-Formatkacheln zeigen die Silhouette neben Bezeichnung, Größe und Preis. Fünf Befestigungen passen in zwei Reihen. Unter 380 px stehen Position und Farbe untereinander, damit die Auswahl bedienbar bleibt.

Die native Schildvorschau verwendet 94 % der bisherigen Einpassung (Breite und Höhe). Kein zusätzlicher Transform, keine Änderung der Millimetermaße, Zoom-, Zieh- oder Produktionslogik. Der vorhandene feste Vorschau-/Werkzeugbereich bleibt erhalten.

- 14/14 bestehende gezielte Tests bestanden: `node --test app/configurator/variant-m/doorbell-presentation.test.mjs app/configurator/variant-m/doorbell-master-repair.test.mjs app/configurator/variant-m/doorbell-state.test.mjs`.
- Build: `node app/configurator/variant-m/build.mjs`, 76 Quellen geprüft; Paket `editor-ce0aec5019eba7f2.mjs`, 1.374.805 Bytes, gzip 466.176 Bytes. Lokaler Build auf aktuellem main; Serverpaket wird auf der tatsächlich aktiven Laufzeit separat gebaut.
- Chrome 1920×855: alle drei Formate gewechselt, Maße 160×280 / 240×200 / 350×180 mm korrekt. Position und Farbe auf gleicher Höhe; alle fünf Befestigungen oberhalb der Preisleiste sichtbar. 35×18 + Silikon: 74,98 EUR; Gegenposition und Anthrazit auswählbar.
- Wechsel zum Text und Auswahl von 12a: Vorschau unverändert (x 72,625; y 179; 959,328×493,375 px). Bestehende Rechte-, Format- und Kundentext-Tests grün; keine Master-Funktion neu implementiert.
- Chrome 390×844: Position und Farbe nebeneinander, Farbwahl bedienbar, kein horizontaler Überlauf (390/390 px). Weitere Ausführungen bleiben mobil scrollbar. Temporäre Bildschirmgrößen danach zurückgesetzt.
- Keine Warnungen/Fehler im lokalen Browserprotokoll. Kein neuer Warenkorb-/Bestelltest für diese Darstellungsänderung.

Bilder: [Desktop](assets/2026-11-02-position-farbe/desktop.jpg), [Handy](assets/2026-11-02-position-farbe/mobile.jpg), [Messwerte](assets/2026-11-02-position-farbe/browser-checks.json).

Die lokale Vorschau nutzt eine private Modellkopie vom 29.10. mit der vorhandenen Designrechte-Reparatur. Sie ist kein aktueller Live-Datenbankabzug. Der Screenshot belegt die lokale Bedienprüfung, noch keine Veröffentlichung.

## Kontrollierte Veröffentlichung

Nur `doorbell-presentation.mjs` als Laufzeitänderung und der angepasste bestehende Test werden in eine Kopie der aktuell aktiven Serverlaufzeit übertragen. Vorher: aktiven Einstieg, Wrapper und Modul-SHAs frisch lesen; bei Abweichung stoppen und vorhandene Änderungen integrieren. Danach Linux-Tests, Build und Vergleich aller übrigen Dateien. Einstieg sichern, atomar auf geprüfte Kopie umschalten, bestehende Plesk-Node-App neu starten. Öffentliche Bundle-Prüfsumme und normaler Shopify-Einstieg anschließend prüfen. Keine Katalog-, Shopify-, Bindungs- oder Datenbankmutation.

Rückweg: gesicherte `app.cjs.before` im privaten Nachweisordner am bestehenden Einstieg wiederherstellen und dieselbe Node-App neu starten. Veröffentlichung und Linux-Nachweis noch offen; bestehende Freigabe gilt, Plesk-Sitzung inzwischen angemeldet.
