# Issue 139 – Startmodell und direkte Produktgalerie

## Auftrag und Quellen
Chris hat am 02.11.2026 die Fortsetzung nach Claude-Kommentar https://github.com/Chris83638w/gravuru-2027/issues/139#issuecomment-6586013095 ausdrücklich gestartet. Reihenfolge: ein Ladezeit-PR, danach eine Bulk-Pipeline und Läufe. Größen, Preise, Freigaben, Befestigungen und Materialoptionen bleiben aus den bestehenden festen Katalogrevisionen. Keine neuen fachlichen Regeln oder erfundenen Quellenpreise.

## Umsetzung
- Der öffentliche Einstieg sendet für feste Türschilder nur die ausgewählte Vorlage, einschließlich der zugehörigen Familienvorlage und Elementrechte. Der vollständige gespeicherte Produktstand bleibt Grundlage der serverseitigen Preis-, Warenkorb- und Produktionsprüfung.
- Schriften werden unter Inhalts-Hash nach Bedarf geladen; der feste Produktfont gewinnt bei gleichnamigen abweichenden Katalogfonts. Start und Warenkorb-Bearbeiten wählen die richtige Vorlage vor dem Mounten. Private Entwurfszugänge bleiben in Headern.
- Die feste Produktgalerie verwendet direkt die freigegebenen Vorlagen dieses Produkts. Kein Laden aller Shopprodukte und kein Wechsel der festen Größe. Weitere Vorlagen kommen erst beim Auswählen; Schaltfläche, Übernahme und Zurückweg verwenden den vorhandenen sicheren Designwechsel.
- Vorschaudateien erhalten Inhalts-Hash und immutable Browsercache. Signierte Auswahlziele und Freigaben werden weiterhin geprüft. Begrenzter Speicher, Rückfall auf authentifizierte Erzeugung nach Cache-Verdrängung/Neustart.
- Vorbereitete Funkklingel-Galerie-Beschleunigung enthalten. Verdeckte alte Vorschauarbeiten bei festen Türschildern entfallen; unveränderte Text-/Motiv-Vorschauen werden wiederverwendet. Produktlinien werden nicht zusammengelegt.

## Nachweise und Grenzen
D24, native Revision 2, echte öffentliche Modelldaten: JSON 31.180.883 → 155.716 Bytes; gzip 9.528.491 → 107.193 Bytes. 199 Vorlagen → eine vollständige Startvorlage. Die Galerie liefert paginierte Metadaten und getrennte Vorschauen.

153 gezielte Linux-Tests bestanden. Automatischer Vergleich aller 199 D24-Vorlagen mit sieben Befestigungen: 1.393 identische Design-/Geometrie-/Preisresultate gegenüber dem vollständigen Original. Bestehender Galerie-Vergleich (nur Auswahloptimierung vor Scope-Änderung): alle 255.126 Karten identisch, 168,36 → 21,33 s; das ist keine Kundenladezeit.

Isolierter echter Modell-/Browserlauf: mobile Galerie, Auswahl einer zweiten Vorlage und neue Texte funktionieren ohne Browserfehler. 9 Mbit/s, 150 ms Latenz und CPU 4×: zuletzt 6,26 s bis vollständiger Bedienbereitschaft. Ein früherer Stand bei 1,6 Mbit/s, 150 ms und CPU 4× benötigte 12,61 s. **Ziel unter drei Sekunden noch nicht nachgewiesen.** Dies sind Kandidatenmessungen, keine veröffentlichte Nachhermessung. Der vollständige Linux-Lauf läuft noch; sein Ergebnis wird ergänzt.

Noch kein Merge/Deployment dieses Pakets. Aktive Laufzeit bleibt PR 151/46cf1ba. Kein neues Shopify-Produkt durch dieses Paket: Neu angelegt 2, überarbeitet 8, zusammen 10 aus den bisherigen Produktwellen. Bulk-Pipeline, weitere Produkte und Navigation bleiben nachfolgende Aufgaben.

## Nächster Schritt
Vollständigen Linux-Bericht auswerten; die neue Version mit mobilen Kundenaktionen und Warenkorb prüfen. Ladezeitgrenze sowie Veröffentlichung ausdrücklich nachweisen. Anschließend einen katalogbasierten Bulk-Plan samt Quellenlückenliste und fünf Stichproben je Lauf an Claude in #139 geben.
