# Issue 139 – Startmodell und direkte Produktgalerie

## Auftrag und Quellen
Chris hat am 02.11.2026 die Fortsetzung nach Claude-Kommentar https://github.com/Chris83638w/gravuru-2027/issues/139#issuecomment-6586013095 ausdrücklich gestartet. Reihenfolge: ein Ladezeit-PR, danach eine Bulk-Pipeline und Läufe. Größen, Preise, Freigaben, Befestigungen und Materialoptionen bleiben aus den bestehenden festen Katalogrevisionen. Keine neuen fachlichen Regeln oder erfundenen Quellenpreise.

Neuere verbindliche Ergänzungen 6588814817 und 6589023089 gelesen, ebenso ENTSCHEIDUNGEN.md auf main 66ad324: Abnahme mit `scripts/konfi-messen.cjs` (+ `--handy`), je Linie, Modell ≤600 KB, Desktop ≤4 s, Handy ≤6 s. Diese Vorgabe ersetzt die vorherige pauschale Drei-Sekunden-Grenze. [Bestandsprüfung und vorgesehenes Modulregister](2026-11-02-issue139-modulregister.md); die vollständige Modultrennung ist noch offen.

## Umsetzung
- Der öffentliche Einstieg sendet für feste Türschilder nur die ausgewählte Vorlage, einschließlich der zugehörigen Familienvorlage und Elementrechte. Der vollständige gespeicherte Produktstand bleibt Grundlage der serverseitigen Preis-, Warenkorb- und Produktionsprüfung.
- Schriften werden unter Inhalts-Hash nach Bedarf geladen; der feste Produktfont gewinnt bei gleichnamigen abweichenden Katalogfonts. Start und Warenkorb-Bearbeiten wählen die richtige Vorlage vor dem Mounten. Private Entwurfszugänge bleiben in Headern.
- Die feste Produktgalerie verwendet direkt die freigegebenen Vorlagen dieses Produkts. Kein Laden aller Shopprodukte und kein Wechsel der festen Größe. Weitere Vorlagen kommen erst beim Auswählen; Schaltfläche, Übernahme und Zurückweg verwenden den vorhandenen sicheren Designwechsel.
- Vorschaudateien erhalten Inhalts-Hash und immutable Browsercache. Signierte Auswahlziele und Freigaben werden weiterhin geprüft. Begrenzter Speicher, Rückfall auf authentifizierte Erzeugung nach Cache-Verdrängung/Neustart.
- Vorbereitete Funkklingel-Galerie-Beschleunigung enthalten. Verdeckte alte Vorschauarbeiten bei festen Türschildern entfallen; unveränderte Text-/Motiv-Vorschauen werden wiederverwendet. Produktlinien werden nicht zusammengelegt.

## Nachweise und Grenzen
D24, native Revision 2, echte öffentliche Modelldaten: JSON 31.180.883 → 155.716 Bytes; gzip 9.528.491 → 107.193 Bytes. 199 Vorlagen → eine vollständige Startvorlage. Die Galerie liefert paginierte Metadaten und getrennte Vorschauen.

153 gezielte Linux-Tests bestanden. Automatischer Vergleich aller 199 D24-Vorlagen mit sieben Befestigungen: 1.393 identische Design-/Geometrie-/Preisresultate gegenüber dem vollständigen Original. Bestehender Galerie-Vergleich (nur Auswahloptimierung vor Scope-Änderung): alle 255.126 Karten identisch, 168,36 → 21,33 s; das ist keine Kundenladezeit.

Abschließende betroffene Tests: 192/192 unter Linux bestanden; zusätzlicher Größenbudget-Test mit 208 synthetischen Vorlagen und großen Schriftdaten bestanden (3/3 Startmodell-Tests). Vollständiger Lauf: 279 Dateien, zunächst 2.008/2.083 Tests bestanden. 27 Dateien mit 75 Fehlern anschließend gezielt nachgeprüft: alle bestanden. Ursache: ältere Tests riefen `python3` außerhalb der vorhandenen Testumgebung auf; `GRAVURU_PYTHON` und PATH korrigiert. Ein Shop-Toolbar-Teststub wurde auf die neue private Startmodellfunktion samt sessionStorage aktualisiert. Original-/Nachtestzahlen und Integritätskontrolle stehen in `linux-tests.json`; keine Rückklassifizierung fehlgeschlagener Ersttests.

Isolierter echter Modell-/Browserlauf: Name „Koch“ und B04 (vier Bohrlöcher) bleiben beim Nachladen einer anderen Vorlage erhalten; 40 Galeriekarten, keine Browserfehler. Letzter Lauf mit 9 Mbit/s, 150 ms und CPU 4×: 6,39 s. Bei 1,6 Mbit/s: 10,10 s; Galerieantwort 52.060 Zeichen. Die früher abgelegte Messdatei wurde durch den final gebauten Kandidaten ersetzt. Diese zusätzlich netzgedrosselten Kandidatenmessungen sind **nicht** das neue Abnahmemaß des vorhandenen Messskripts und keine veröffentlichte Nachhermessung. Je-Linie-Abnahme bleibt offen.

Noch kein Merge/Deployment dieses Pakets. Aktive Laufzeit bleibt PR 151/46cf1ba. Kein neues Shopify-Produkt durch dieses Paket: Neu angelegt 2, überarbeitet 8, zusammen 10 aus den bisherigen Produktwellen. Bulk-Pipeline, weitere Produkte und Navigation bleiben nachfolgende Aufgaben.

## Nächster Schritt
Modulregister mit Claude prüfen, verbliebene Funkklingel-Ausführung aus dem neutralen Master lösen; R6–R9-Sichtnachweise und vorhandenes Messskript je Linie ausführen. Ladezeitgrenzen sowie Veröffentlichung ausdrücklich nachweisen. Anschließend einen katalogbasierten Bulk-Plan samt Quellenlückenliste und fünf Stichproben je Lauf an Claude in #139 geben.
