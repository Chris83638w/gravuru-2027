# Astra: Galerie-Navigation und sichtbare Schnellbearbeitung

Stand: eigener Branch `dev/astra-galerie-navigation-20261106`, auf dem bisherigen Draft-PR #186; keine Main-Zusammenführung. Auftrag von Chris: Navigation freundlicher, Schnellbearbeitung unmittelbar auf der Karte. Private Galerieänderung bereits autorisiert; Kundenshop bleibt unberührt.

Fertig lokal: sichtbarer Schnellstart je nativ editierbarer Vorlage, Auswahl plus vier 1-mm-Richtungstasten, Position speichern auf derselben Karte, eindeutiger zweiter Weg zum vollständigen Konfi. Ansichten Vorlagen/Rohlinge/Alles, kompakte Hauptfilter, zusätzliche Filter aufklappbar, Filter zurücksetzen und direkter Freigabeüberblick. Voll-Konfi hat einen gemeinsamen Speichern-/Zurück-Rahmen. Daten- und Speicherdienste unverändert.

[Bedienprüfung, Vorher-/Nachher-Aufnahmen und Grenzen](../reviews/2026-11-06-navigation/audit.md). 52 unterschiedliche Tests bestanden; tatsächliche lokale R5/R6/R7-Folge beweist genaue Rückspeicherung und Rücksetzung ohne fremde Designänderung. Online-Nutzeränderungen aus R3/R4 dürfen nicht durch die lokale Testkopie ersetzt werden. Onlineinstallation ausschließlich mit unverändertem privatem Config-/Datenpfad, frischer Serversicherung und vollständigem neuem Codeverzeichnis; bisheriges Release bleibt Rückfallstand.

Für Mika: Der sichtbare Schnellstart nutzt weiterhin `/originale/design` GET/PATCH, echte productId/designId und expectedRevision. Nur x/y geänderter beweglicher Objekte werden übertragen; konkurrierender Stand, Material-/Formatbindung, Dirty-Pin und Freigabefingerprint behalten ihre bisherige Prüfung. Voll-Konfi nutzt den bestehenden Galerie-Workbench-/Saveback-Vertrag. Keine zweite Designdatenbank und keine direkte Shopify-Synchronisierung. Änderungen an Kundendesigns sind kein Bestandteil dieses Pakets.

Quellen: aktueller Claude-Auftrag in [#85](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6688988751), jüngste Gesamtbestandsübergabe; keine Unterkategorienumordnung und keine neuen Designfreigaben. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt weiter; dieses Paket gestaltet nur Bedienoberflächen.

## Private Onlineaktivierung abgeschlossen

Code `e166741ccfea9f487fdd578ddfff22ab7875e1a8`, eigener [Draft-PR #187](https://github.com/Chris83638w/gravuru-2027/pull/187) auf #186. Private Site 19 am 06.11.2026 angehalten, beide Pfade nachgelesen und auf `gravuru-2027-navigation-e166741c` / `public` gesetzt, wieder gestartet und neu gestartet. Bestehende private Konfiguration und Daten unverändert weiterverwendet; Site 20/Kundenshop nicht geändert.

Vollständiges Paket: 31.670.281 Bytes, 811 Einträge, SHA256 `5346cddd05b1412c4ddae5680378db03c261ad09578335da25f52715093fe04e`. Paketprüfung einschließlich frischem Modulimport bestanden. Für schnelle Git-Lesung wurden die festgelegten Blob-IDs gebündelt gelesen; die vorhandenen Auswahl-/Prüfsummen-/Paketvalidierungen blieben unverändert.

Vorherige frische Sicherung: `private/galerie-navigation-e166741c-backup-20261106-v1`, fünf SQLite-Backups unter gemeinsamen reservierten Schreibsperren,348 Produkte / 357 Revisionen, Integritäts- und Vergleichsprüfung grün. Alter AppRoot `gravuru-2027-gesamtbestand-review-267d46e4` bleibt unverändert als Rückfallstand; Rückweg setzt nur Anwendungs-/Dokumentenstamm zurück, verwendet die aktuellen Daten weiter. Keine private Konfiguration oder Zugangsdaten in GitHub.

[Stagingbeleg](../reviews/2026-11-06-navigation/private-staging-proof.json), [91/91 tatsächliche HTTPS-/Bestandsprüfungen](../reviews/2026-11-06-navigation/private-online-get-proof.json). 370 sichtbare Schnellstartaktionen, neue Richtungssteuerung/Navigation und neue Quelldateien/gebauter Editor bestätigt. Alle Tabellen/Zeilen aller fünf Datenbanken und fünf Metadatendateien gegen frische Sicherung unverändert.

Browser online: D401/Acryl Schwarz/50 × 20 mm zeigt R4. Schnellstart, Rechts 1 mm, anschließend Zurücksetzen; kein Positions-PATCH. Vollständiger Konfi öffnet denselben Stand mit neuem gemeinsamen Kopf. „Speichern & zurück“ ohne Änderung kehrt zur richtigen Material-/Formatkarte zurück; erneuter Schnellstart zeigt weiterhin R4. [Abschließender Datenvergleich nach dieser No-op-Bedienung](../reviews/2026-11-06-navigation/private-online-after-ui-proof.json):357 → 357 Revisionen, keine neuen Versionen, alle fünf DBs unverändert. [Online-Schnellbearbeitung](../reviews/2026-11-06-navigation/11-online-schnellbearbeitung.png), [Online-Konfi](../reviews/2026-11-06-navigation/12-online-konfi.png).

Offen bleiben die separate Chrome-Frame-Störung und weitere Materialstapel nach Ressourcenoptimierung. Keine Designfreigabe, kein Main-Merge und keine Shop-Synchronisierung ausgelöst.
