# Galerie: hier weiterarbeiten

Stand: 06.11.2026. Diese Datei ist der feste Einstieg für Astra, Claude, Mika und neue Chats. Sie ersetzt kein frisches Prüfen des tatsächlichen Host-/Shopstands.

1. [Gesamtsicherung, vollständiger Arbeitsstand und Vorschlag zur Shop-Synchronisierung](docs/handoffs/2026-11-06-galerie-gesamtsicherung-und-shop-synchronisierung.md) lesen.
2. `AGENTS.md` auf main und das aktuelle `ENTSCHEIDUNGEN.md` lesen (ursprünglicher Auftrag: [Register aus PR #158](https://github.com/Chris83638w/gravuru-2027/blob/dev/entscheidungen-zubehoer-20261103-claude/ENTSCHEIDUNGEN.md)); anschließend `START_HERE.md`, aktives Paket in `UMSETZUNGSPAKETE.md`, neuesten Abschnitt in `STATUS.md` und neueste Kommentare in [#85](https://github.com/Chris83638w/gravuru-2027/issues/85) und [#168](https://github.com/Chris83638w/gravuru-2027/issues/168). Neuere direkte Nutzerentscheidungen gelten vor dem historischen Registerstand.
3. Code-PR [#181](https://github.com/Chris83638w/gravuru-2027/pull/181) baut auf [#180](https://github.com/Chris83638w/gravuru-2027/pull/180) auf. Vor Änderungen tatsächliche Branchköpfe prüfen. Nur eigener Aufgabenbranch/PR; main koordiniert der andere Astra-1-Chat in #139.

## Unverzichtbarer Kontext

- Auftrag ist **alle vorhandenen Designs, Themen, Größen, Formen und Materialien einschließlich Rohlingen**. Der Edelstahlpilot beschränkt den Gesamtauftrag nicht. Claude liefert automatisch, Astra verwaltet/importiert die Galerie, Mika baut den vollständigen Konfi-Rückweg.
- Katalogoriginale aus der neuen Struktur, stabile IDs, getrennte editierbare Objekte, dokumentierter Schriftersatz. Keine händische Serienanlage, keine erfundenen Formate/Themen/Freigaben.
- Drei Vorlagen nebeneinander, eine Konfi-Karte je Original, Material-/Themen-/Fotofilter, Rohlingübersicht, direkte Positionsbearbeitung, Kommentare, Freigaben und Lückenübersicht. Chris' verbindliche Unterkategorienliste steht aus.
- Private Online-Galerie: Schiefer, zuletzt bestätigte Laufzeit `76053a2f`. Edelstahl: lokal geprüft bei `b2e68575`, noch nicht online. Vollständiger Kunden-Konfi mit Rückspeicherung ist bei Mika in Arbeit.
- **Gestalterische Bestätigung, technische Prüfung und Shop-Veröffentlichung sind getrennte Zustände.** Keine Veröffentlichung allein durch ein Galeriehäkchen. Kunden-Live nur mit Chris' ausdrücklichem Satz.
- Vor Datenänderungen aktuelle Sicherung erstellen. Niemals lokale Testdaten über echte Nutzerstände installieren. Private Datenbanken und Zugangsdaten gehören nicht nach GitHub.

## Nächste Arbeit

1. Claude: zwei Pilotkorrekturen, dann den gesamten verfügbaren Bestand stapelweise nach dem geprüften Lieferschema liefern.
2. Astra: private Edelstahlübernahme aus **frischem tatsächlichem Hostsnapshot**, vorhandene Bearbeitungen/Kommentare/Freigaben erhalten und zurücklesen.
3. Mika: vollständigen Konfi mit gezieltem Speichern derselben nativen Vorlage und Rücksprung abnehmen.
4. Shop-Verwaltung: zunächst lesender Bestandsabgleich und Änderungsübersicht; die in der Gesamtübergabe beschriebene Synchronisierung ist ein Vorschlag, noch keine implementierte oder freigegebene Automatik.

Nach jedem abgeschlossenen Paket diese kurze Datei, `STATUS.md` und die datierte Übergabe aktualisieren; Commit, Prüfnachweise, offene Punkte und nächsten Schritt nennen. Keine alten Statusangaben stillschweigend als aktuell übernehmen.
