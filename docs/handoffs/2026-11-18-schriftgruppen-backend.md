# Schriftgruppen im Backend pflegen

18.11.2026 · Astra (Codex), mit direkter Gegenprüfung durch Claude.

Eigener Branch `dev/astra-fontgruppen-backend-20261118`, auf `f84433f` aus PR #255 (ursprünglich Live-Basis `be163c5d`), nicht auf main. Backend-Folgepaket, keine Veröffentlichung.

## Grundlage und Grenzen

Chris beauftragt die Backend-Pflege, bestätigt seine drei identischen 29er-Standardgruppen plus die Originalschriften des geöffneten Designs und erlaubt bis etwa 35 statt einer harten Grenze. Die verworfene Leergruppenmeldung aus `452e4ba` wurde zuvor mit `f84433f` zurückgenommen. Keine neue Kundentext-, Pflichtschrift-, Begrenzungs- oder Designersetzungsregel in diesem Paket.

Die bereits bestehende Katalogprüfung (Michroma/Lato, bekannte Katalognamen) bleibt erhalten. Poppins wird ausdrücklich im Katalog ergänzt, siehe [Katalog-PR #192](https://github.com/Chris83638w/gravuru-katalog./pull/192), `58d1ec358`; keine pauschale Freigabe unbekannter Laufzeitschriften. Die bestätigten Auswahlen stammen aus Chris' gespeicherter Gruppenhilfe. Die Zuordnung der acht bestehenden Set-IDs zu den fünf neuen Gruppen sowie zwei Gruppenauswahlen sind weiterhin offen. Dieser PR baut die allgemeine Pflege der vorhandenen Sets, verteilt keine Gruppen neu und ändert keine kanonischen Set-Daten.

## Verhalten

- Neue Werkstattseite `/werkstatt/schriftgruppen/`, erreichbar aus Schriften & Profile: Auswahl, Reihenfolge, Dateiverfügbarkeit und bestehende Qualitätshinweise. Hinweise zur Dateiqualität gelten nur bei passender Prüfsumme.
- Vorschau vor Speichern nennt Themen, explizite/geerbte Unterkategorien, Produkte mit effektivem Profil und abweichende Produktzuordnungen. Prüfwert bindet Katalogstand, Ressourcen, Profilstand, Produkte und Zuordnungen; veralteter Stand wird abgewiesen.
- `schriften/sets.json` bleibt einzige Pflegequelle, gemeinsam mit `schriften/_aenderungen.jsonl` über die bestehende Dateitransaktion geschrieben. Konvertierung/Dateiprüfung vorher; fehlende oder ungültige Dateien ändern weder Set noch Profil. Vorab erfolgreich importierte Schriftressourcen können in der lokalen Schriftbibliothek verbleiben.
- Profilherkunft ist dauerhaft und mandantenbezogen: `profile_catalog_sources`, Schema v3, Set-ID statt Anzeigename. Allgemeine Profil-API und Oberfläche erlauben kein Bearbeiten dieser abgeleiteten Listen. Freie Profile funktionieren weiter wie zuvor.
- Datei und SQLite sind ausdrücklich keine gemeinsame atomare Transaktion. Scheitert die nachgelagerte Profilübernahme, meldet Speichern den ausstehenden Zustand. Die Übersicht zeigt ihn weiter. Gleiches Set erneut speichern oder regulär importieren holt die Übernahme nach, ohne zweite Auditzeile. GET schreibt keine Profile.
- Wiederholter Import übernimmt dieselbe Auswahl/Reihenfolge ohne zusätzliche Revision. Fehlende Dateien dürfen eine bereits gespeicherte Gruppe beim regulären Import nicht verkleinern: der Import bricht dann mit Fehler ab, die vorherige Auswahl bleibt. Die historische Erstimport-Behandlung unvollständiger Altkataloge bleibt ansonsten unverändert. Abweichende vorhandene Produktzuordnungen bleiben erhalten und werden im Bericht genannt. Es wird keine unbelegte Unterscheidung „manuell“/„automatisch“ erfunden.
- Keine Änderung von Produktpreisen, Designinhalten, bestehenden Entwurfs-/Bestellpaketen, Shopify-Bindungen oder Kundenbedienung. Neue Auswahl wirkt im Shop erst mit neu synchronisiertem und veröffentlichtem Produktstand.

## Herkunft bestehender Profile

Namen sind ausschließlich Hinweise. Die neue Oberfläche zeigt Namenskandidaten und uneindeutige Fälle; nur eine ausdrücklich geprüfte Zuordnung kann übernommen werden. Dabei ändern sich weder Auswahl noch Revision. Frei angelegte gleichnamige Profile werden beim Import nicht überschrieben oder automatisch übernommen.

`node scripts/inspect-fontset-origins.mjs <profile-db-copy> <catalogue-directory> [tenant]` öffnet eine konsistente Datenbankkopie nur lesend und unterstützt v2/v3. Keine Migration, keine Schriftübernahme, keine Serveränderung. Eine Kopie des echten Bestands ist vor Aktivierung noch durch Claude zu prüfen. Bei späterem Deployment vorher passende Datenbanksicherung erstellen: Schema v3 wird vom alten v2-Code nicht geöffnet; ein Code-Rollback allein genügt nicht.

## Prüfung und Vergleich

113 unterschiedliche gezielte Tests bestanden (89 im Hauptlauf, 33 im Ergänzungslauf mit 10 Überschneidungen, danach 29 Import-/Servicefälle einschließlich eines neuen Fehlerfalls): neue Service-/HTTP-Routen, Herkunft/Mandanten, Schreibschutz, CSRF, veraltete Prüfung, Datei-/Importfehler, Nachholung, bestehender Import/Writeback, Bibliothek/Wirkungsanzeige und echte Entwurfsrouten mit später geänderter verwalteter Schriftgruppe. Ressourcenaustausch während Konvertierung, Mandantentrennung, Gruppe-plus-Design und gezieltes Nachladen ebenfalls grün; gemeinsame Werkstatt-Kopfzeilen synchron.

Browserprüfung in lokaler Wegwerfkopie mit realen Michroma-/Lato-Dateien: 4 → 3 Schriften speichern, Wirkungsdialog, erfolgreiche Übernahme und Schreibschutz in der allgemeinen Profilverwaltung. Zusätzlich browsergeprüft: Eine noch nicht gespeicherte Auswahl bleibt beim Bestätigen der Herkunft erhalten. Nach fehlgeschlagenem Erstladen bleibt die Aktualisieren-Schaltfläche verfügbar. Keine Verbindung zu Shop oder Serverbestand. Die erste Prüfung fand eine fehlende PUT-Routenfreigabe; korrigiert und durch HTTP-Test abgesichert. Für echte Schriftimporte ist fontTools nötig; im lokalen Test über vorhandene Arbeitsabhängigkeiten bereitgestellt. Die unveränderte Cross-Site-Sperre blieb aktiv; Erstaufruf erfolgte normal über Chromes Adresszeile.

[Rohwerte gleicher synthetischer Testliste](../measurements/2026-11-18-font-backend-roundtrip.json), fünf Läufe je Stand: vier Schriften, Cinzel entfernen, dann regulärer Import; warme synthetische Glyphen, SQLite im Speicher, gleiche Windows-/Node-Umgebung. Vorher `f84433f`: Auswahl 0/5 erhalten, Profilrevision 3. Nachher: 5/5 erhalten, Profilrevision 2. Median Bearbeiten 0,085 → 42,189 ms (nachher einschließlich Kataloglesen, Prüfung und Audit), anschließender Import 5,174 → 4,874 ms. Dies ist eine Funktions-/Verwaltungsprüfung, kein Kunden-, Handy-, Warenkorb- oder RSS-Benchmark.

Reproduzierbar: `node tools/performance/font-backend-roundtrip.mjs <vorher-checkout> <nachher-checkout> <bericht.json>`.

Lokale Bedienfixture: `node tools/performance/font-backend-fixture.mjs <catalogue-copy> <port>`; `GRAVURU_PYTHON` und bei Bedarf `PYTHONPATH` für vorhandenes fontTools. Eigene Wegwerfdateien unter `work/font-backend-browser-<port>`. Wiederverwenden nur ausdrücklich mit `GRAVURU_FIXTURE_REUSE=1`.

## Nächster Schritt

Claude prüft diesen PR und den Herkunftsbericht einer echten Datenbankkopie. Offene Datenzuordnungen ins Issue #254; nichts raten. Danach konkrete Aktivierung vorbereiten. Kein Merge/Deploy und nichts live ohne Chris' „live“.
