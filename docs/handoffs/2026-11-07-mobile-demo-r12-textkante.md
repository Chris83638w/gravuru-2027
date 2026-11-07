# Demo R12 – Text bis zur sichtbaren Kante verschieben

Nutzerauftrag vom 07.11.2026, Screenshot 195: Der Auswahlrahmen um Bruno verhindert zeitweise das Verschieben bis zum Rand. Bestehende Regel unverändert: sichtbare Buchstaben dürfen bis an die Tafelgrenze, nicht darüber. Keine neue Randreserve, keine Änderung der Designs oder Preise. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt verbindlich.

Vorher gesichert: Commit `9353116cb67d80c496a1f91c4cf45b1ecb2af1b5`; Archiv `checkpoints/mobile-demo-r12-textkante-20261107/before-r12-9353116c.zip`, SHA256 `0f588cd6c1f1abfaa36c8039ebc3ead667fad76bf142b1ea30fd6b715fd57dfe`.

Ursache im öffentlichen R11 nachgewiesen: `uxTextBounds` lieferte für alle drei Texte einen gespeicherten Nullrahmen, obwohl die Schriften bereits geladen waren. Frische Messung derselben Bruno-Glyphen: x=-38,130817 / y=-9,014040 / Breite=79,480942 / Höhe=23,715509 mm. Bei Nullmaßen fiel der bestehende Randbegrenzer auf den größeren nominellen Textrahmen zurück. Eine kalte Messung mit anderer Cachekennung bestätigte den Fehler.

Korrektur: Gemeinsame Textmesshilfe für Rand-/Ausrichtungs- und Einpassfunktion. Fehlende Schrift, Nullmaß und ungültige Messungen werden nicht gespeichert; erfolgreiche Messungen sind an die tatsächliche Schriftinstanz gebunden. Auch ein fehlgeschlagener Einpassversuch wird nach Schriftladen erneut geprüft. Drag, Skalierung, Drehen, Snap, Grenzen, Undo und Layout bleiben unverändert. Die geänderten nativen Module werden ausschließlich im separaten Demopaket veröffentlicht; kein Austausch des bisherigen Konfis, kein Main-Merge oder Shop-Schreiben.

200 gezielte Tests bestanden (gesamte Demo/Publikation sowie Schriftmessung, Randbegrenzung, Workflow und Usability). Unabhängige Agentenprüfung ohne weiteren Befund. Tatsächlicher Chrome-Bedienlauf: frisch geladene Ausgangsgestaltung unverändert; Touch-Drag oben links sichtbare Grenzen x=0/y=0, unten rechts x=220/y=140. Schriftgröße bleibt 35,77, andere Objekte exakt gleich, ein Undo stellt Original wieder her. PC-Mausdrag bestätigt sichtbare obere/linke Grenze. Das sind Browserprüfungen mit Handyviewport, keine physische Handyabnahme.

Nächster Schritt: isoliertes Paket R12 veröffentlichen, öffentliche Messung und HTTP-Hashes belegen; Nutzer testet anschließend am Handy. Der echte Produkt-/Warenkorb-Livegang bleibt separat.
