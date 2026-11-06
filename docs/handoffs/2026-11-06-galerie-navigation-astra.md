# Astra: Galerie-Navigation und sichtbare Schnellbearbeitung

Stand: eigener Branch `dev/astra-galerie-navigation-20261106`, auf dem bisherigen Draft-PR #186; keine Main-Zusammenführung. Auftrag von Chris: Navigation freundlicher, Schnellbearbeitung unmittelbar auf der Karte. Private Galerieänderung bereits autorisiert; Kundenshop bleibt unberührt.

Fertig lokal: sichtbarer Schnellstart je nativ editierbarer Vorlage, Auswahl plus vier 1-mm-Richtungstasten, Position speichern auf derselben Karte, eindeutiger zweiter Weg zum vollständigen Konfi. Ansichten Vorlagen/Rohlinge/Alles, kompakte Hauptfilter, zusätzliche Filter aufklappbar, Filter zurücksetzen und direkter Freigabeüberblick. Voll-Konfi hat einen gemeinsamen Speichern-/Zurück-Rahmen. Daten- und Speicherdienste unverändert.

[Bedienprüfung, Vorher-/Nachher-Aufnahmen und Grenzen](../reviews/2026-11-06-navigation/audit.md). 52 unterschiedliche Tests bestanden; tatsächliche lokale R5/R6/R7-Folge beweist genaue Rückspeicherung und Rücksetzung ohne fremde Designänderung. Online-Nutzeränderungen aus R3/R4 dürfen nicht durch die lokale Testkopie ersetzt werden. Onlineinstallation ausschließlich mit unverändertem privatem Config-/Datenpfad, frischer Serversicherung und vollständigem neuem Codeverzeichnis; bisheriges Release bleibt Rückfallstand.

Für Mika: Der sichtbare Schnellstart nutzt weiterhin `/originale/design` GET/PATCH, echte productId/designId und expectedRevision. Nur x/y geänderter beweglicher Objekte werden übertragen; konkurrierender Stand, Material-/Formatbindung, Dirty-Pin und Freigabefingerprint behalten ihre bisherige Prüfung. Voll-Konfi nutzt den bestehenden Galerie-Workbench-/Saveback-Vertrag. Keine zweite Designdatenbank und keine direkte Shopify-Synchronisierung. Änderungen an Kundendesigns sind kein Bestandteil dieses Pakets.

Quellen: aktueller Claude-Auftrag in [#85](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6688988751), jüngste Gesamtbestandsübergabe; keine Unterkategorienumordnung und keine neuen Designfreigaben. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt weiter; dieses Paket gestaltet nur Bedienoberflächen.

Offen: private Installation und tatsächliche Online-Bedienabnahme, separate Chrome-Frame-Störung, weitere Materialstapel erst nach bereits dokumentierter Ressourcenoptimierung. Nach Installation hier Hostpfad, Prüfsummen, Sicherung und konkrete GitHub-Rückmeldungen ergänzen.
