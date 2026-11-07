# Gesamtgalerie und Familienzuordnung · Astra · 07.11.2026

## Auftrag und Grenzen

Chris beauftragt die vollständige Übernahme der fehlenden Claude-Lieferung in die private Galerie und die Einzel-/Mehrfachzuordnung vorhandener Designs zu weiteren Familien. Kein main-Merge, keine Shopify-Veröffentlichung, keine Änderung an Site 20. Eigener Branch `dev/astra-galerie-gesamtimport-familien-20261107`, auf dem bisherigen Pilotstand `536d9a891b7bfdee2bda20415e77b550264a873b`.

## Verbindliche Quellen

- Claude: Issue #85, Kommentar `6688988751`; Kataloglieferung `86c1ff5f431acfe60d4cff388958112187005550`, Quellstand `3c6051fbbc7904969948950fae12cae2ae663f30`, PR184.
- 219 Stapel, 19.533 eigenständige Lieferoriginale und 1.065 reine Masterverweise. Keine doppelten Karten aus Verweisen.
- Frischer Gesamtaudit: 55.293/55.293 Dateihashes, 19.450/19.450 Originalversionshashes und 1.147 zentrale Rohlingeinträge geprüft. Die übrigen 83 Originale haben laut Lieferung keinen SVG-Versionsnachweis.
- 16 echte Familien und sieben Linien werden als unveränderlicher Katalogsnapshot ausgeliefert. Keine abgeleiteten Wunschmaße, erfundenen Familien oder ersetzten Preis-/Befestigungsregeln.

## Umsetzung

`prepare-complete-design-review.mjs` prüft vorhandene Pakete und erstellt fehlende Stapel einzeln. Native Dokumente werden während der Vorbereitung auf Platte geschrieben; Fontdaten behalten ihre bestehende Darstellung. Ungebundene oder blockierte Quellen bleiben mit Originalvorschau und konkretem Grund sichtbar. `central-blanks-v2` ergänzt 30 Rohlinge, die in keinem Designstapel enthalten sind. Vier reine Verweisstapel erzeugen keine leeren Galeriekarten.

Der Korrespondenzaudit bewahrt alle bisherigen 462 Originalkennungen. 197 Bestands-Pfadkennungen verweisen auf vorhandene Karten; 52 davon haben einen neueren, abweichenden Quellstand und erhalten einen separaten Hinweis. 64 andere Masterquellen mit bereits verwendeter Designnummer bekommen eine quellengebundene Kennung. Bisherige native Gestaltung, Originaldateien, Kommentare und Freigaben werden dabei nicht ersetzt. Eins-zu-viele-Verweise bleiben Beziehungen.

`combine-complete-design-review.mjs` prüft sämtliche Dateihashes vor Zusammenführung und vor Wiederverwendung. Rohlinge werden nach Material, Familie und Quellkennung getrennt. Identische Rohlinge behalten historische Vorschaupfade; abweichende Konturen, Maße oder Bildhashes sind Konflikte.

Die Galerie zeigt höchstens 60 Karten pro Seite in drei Spalten. Suche und Filter umfassen den Gesamtbestand. Die Quellhierarchie wird sichtbar angezeigt; Verfahren ohne Quellenangabe bleiben ausdrücklich offen. Die endgültige Unterkategorienliste von Chris wird nicht vorweggenommen.

Familienzuordnung erfolgt über eine separate Einzel-/Mehrfachauswahl an den Karten. Auswahl → vorhandene Linie/Unterkategorie/Familie/Größe → native Vorschau → ausdrücklich übernehmen. Gleiche Maße bewahren die editierbaren Objekte exakt; andere Formate verwenden die vorhandene native Skalierung und Einpassungsprüfung. Fotoquellen, Masken, Texte, Schriften und Rechte bleiben erhalten. Neue Ziele sind ungeprüft. Vorhandene Ziele werden nicht überschrieben.

Registrierung und neue native Gruppen werden gemeinsam im bestehenden Importjournal gespeichert. Die unveränderliche erste Revision trägt `katalog.galleryAssignment`; daraus wird die Galerie-Allowlist nach Neustart wiederhergestellt. Eine gesonderte Mapping-Datenbank gibt es nicht. Quellrevision, Katalog, Preis-/Befestigungsangebot und Zielbestand werden vor der atomaren Anlage erneut geprüft. Ein wiederholter Auftrag legt nichts doppelt an.

## Private Inbetriebnahme

Frische Sicherung aller fünf Datenbanken unter `private/complete-gallery-20261107-v1/backup`, Ausgangsbestand 349 native Gruppen. Die aktive Galerie hatte 462 Karten und 348 zugeordnete Gruppen; die zusätzliche Gruppe gehört zum separaten Shopify-DRAFT-Piloten und bleibt erhalten.

Der Import ergänzt nur neue native Gruppen und erzeugt mit `--mapping-out` eine separate Zuordnungsdatei. Aktive Galeriezuordnung und aktive Konfiguration bleiben bis zur kontrollierten Umschaltung unverändert. `ops/plesk/complete-gallery-stage.py` prüft ZIPs, Build, Konfiguration und alte Datenbankzeilen; `complete-gallery-activate.py` darf die Zuordnung nur bei gestoppter privater Runtime unter deren Sperre atomar ersetzen. Alte Codewurzel/Galerie/Zuordnung bleiben der Rückweg; bestehende Datenbanken werden nicht zurückgesetzt.

**Status dieses ersten Codepakets:** lokale Implementierung und gezielte Tests bestanden; vollständige Zusammenführung, Hostimport, Umschaltung und Browserabnahme werden im abschließenden Beleg ergänzt. Diese Datei behauptet noch keine abgeschlossene Onlineübernahme.

## Mika / Shop-Anbindung

Die Zuordnung verwendet dieselben nativen Produkte, Editor-/Schnellspeicherung und unveränderlichen Revisionen. Sie erteilt keine Sicht- oder Shopfreigabe. Shopübernahme muss weiterhin konkrete Material-/Formatfreigaben und den tatsächlichen gespeicherten Fingerprint prüfen. Der bestehende Edelstahl-Andenken-Pilot bleibt Shopify-DRAFT; keine Veröffentlichung, Warenkorbaktivierung oder automatische Shop-Synchronisierung in diesem Paket.

## Weiterhin offene Sachfragen

Echte Lieferblocker, fehlende Originalfamilien, ungeklärte Ersatzschriften und fehlende Originaldateien werden sichtbar erhalten. Die endgültige Unterkategorienliste kommt von Chris. Neue Katalogstände überschreiben keine Nutzerbearbeitung. Diese fachlichen Entscheidungen sind keine automatischen Importkorrekturen.
