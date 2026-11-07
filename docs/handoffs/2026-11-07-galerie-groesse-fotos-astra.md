# Galerie: Objektgröße, Originalfotos und eindeutige Gruppen

Auftrag von Chris am 07.11.2026: schlecht erkennbare Fotos korrigieren, zunächst echte vorhandene Bilder nutzen; einen wiederverwendbaren Fotosatz pro Zielgruppe gemeinsam auswählen. Objektgröße unmittelbar in der Schnellbearbeitung ändern und speichern. Anschließend ausdrücklich: Arbeit auf Unteragenten verteilen und schnellstmöglich umsetzen.

Eigener Branch `dev/astra-galerie-groesse-fotos-20261107`, auf dem privaten Navigationsstand / Draft #187. Keine Zusammenführung nach main, keine Veröffentlichung im Kundenshop. Die private Galerie darf gemäß bereits erteilter Umschaltfreigabe aktualisiert werden, nach frischer Sicherung des tatsächlichen Serverstands.

## Fachliche Quellen

- Chris, aktueller Auftrag: Größenänderung in der Kartenansicht, Fotos klar erkennbar, wiederverwendbare Bilder gemeinsam auswählen.
- Chris, vorheriger Auftrag: Trennung Menschen/Hunde/weitere Zielgruppen und mit/ohne Foto; drei Karten nebeneinander. Die vollständige Unterkategorienliste bleibt eine spätere Feinsortierung.
- `ENTSCHEIDUNGEN.md`, 1.21: Graustufenpflicht betrifft echte Kunden-Uploads, nicht Vorlagen-/Katalogbilder. Vorhandene Fotos, Masken und Nutzerbearbeitungen erhalten.
- [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md): Originalgestaltung bewahren; kein Motiv austauschen oder verzerren. Keine automatische Layoutkorrektur bloß zum Bestehen einer Prüfung.
- [Claude-Lieferung #85](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6688988751): eindeutige Master-IDs, Ersatzschriften sichtbar, keine ungeprüfte Freigabe.

## Umsetzung und Abnahme

Lokal und auf privater Site 19 abgenommen. Größenänderung nutzt die bestehende native Galerie-Schnittstelle und deren Versionsprüfung. Keine zweite Designdatenbank. Bereits geänderte Nutzerdaten auf dem Server dürfen niemals durch lokale Testdaten ersetzt werden.

- Karte: Element auswählen, kleiner/größer um 10 Prozent oder Prozentwert eingeben und Enter; aktuelle Maße anzeigen, Änderungen speichern. Text wird mit der nativen Schriftmessung skaliert, Motive/Fotos proportional und Grafiken einschließlich Strichstärke. Originalanker, Masken, Zuschnitt und Ressourcen bleiben erhalten. Unzulässige Überstände werden weiterhin abgewiesen.
- Voll-Konfi: bestehende, proportional skalierte Fotoressource wieder öffnen und unverändert speichern. Fotoverweise behalten ihre Reihenfolge, damit unverändertes Speichern keine neue Revision erzeugt.
- Tatsächlicher lokaler Browser: D230/300×200 mm, Foto von 98,971×176,873 auf 79,1768×141,4984 mm; Karte speichert R5, voller Konfi zeigt R5 und speichert ohne neue Revision zurück. Danach lokaler Teststand exakt als R6 wiederhergestellt. Alle 347 anderen Produktköpfe sowie übriger Dokumentinhalt unverändert. [Datenbeleg](../reviews/2026-11-07-gallery-usability/local-size-saveback-proof.json), [Karte](../reviews/2026-11-07-gallery-usability/04-D230-groesse-80-gespeichert.png), [Konfi](../reviews/2026-11-07-gallery-usability/05-D230-konfi-stand5.png).
- Gezielte Tests bestanden: Größen-/Karten-/Galerietests einschließlich echtem nativen Foto-/Text-/Motiv-/Grafik-Roundtrip; 50 Foto-/Kundenpfadtests; 11 Katalog-/Blockertests; abschließend 9 Editor-/HTTP-Tests nach No-op-Korrektur. Getrennte Läufe enthalten Überschneidungen und werden nicht als Gesamtsumme addiert.

Bei Fotos ließ die zusätzliche Aufhellen-Komposition dunkle Details verschwinden. Vorhandene Beispielbilder werden nun ohne zusätzliche Graustufen-/Aufhellen-Komposition gezeigt. Die Originalbildbytes und Masken bleiben unverändert; ein schwarzer Hintergrund oder bereits graues Original wird damit nicht retuschiert. Explizite vorhandene Foto-Bearbeitungen bleiben erhalten. Normale Kunden-Upload-/Produktionspfade sind durch 14 Vorher-/Nachher-Vergleiche bytegleich abgesichert. [Fotobelege und 15 Kandidaten in sechs Zielgruppen](../reviews/2026-11-07-gallery-photos/README.md). Neue Beispielbilder sind erst nach gemeinsamer Auswahl endgültig zuzuordnen.

Die Gruppierung nutzt nun auch vorhandene Themen, Blattangaben und boolesche Fotoangaben. 70 nur allgemein als Tier bezeichnete Katalogoriginale bleiben als Weitere Tiere erkennbar und mit offener Tierzuordnung markiert. Namen und Beispielfotos werden nicht als Beweis einer Tierart geraten. Endgültige Unterkategorienliste von Chris bleibt offen.

93 Schieferoriginale haben mindestens ein noch offenes Format: 11 echte Überstände, 33 Schrift-/Glyphfälle, 49 übrige Quellen-/Format-/Druckfälle. Das ist eine andere Zählung als vollständig unvorbereitete Galeriekarten. D79/D80/D83 sind konkret vermessen; keine pauschale Freischaltung oder automatische Layoutänderung. [Audit je Design-ID](../reviews/2026-11-07-gallery-usability/blocked-slate-originals-and-topics.json). Für diese Fälle ist eine getrennte Reparaturfassung mit anschließender Sichtfreigabe erforderlich.

## Shop-Synchronisierung

Mikas vorhandene Verwaltung und Synchronisierung sind Grundlage, aber keine bestandene reale Shop-Abnahme. Nach der Galerieabnahme folgt eine einzelne bestätigte Produktgruppe als Pilot mit Änderungsvergleich und Rücklesung. Shopify-Schreibschalter bleiben aus; Freigabehäkchen sind keine Veröffentlichung. Chris hat nach dem Zeitpunkt gefragt und damit keinen Shopwrite freigegeben.

## Private Bereitstellung und Wiederaufnahme

Draft [#188](https://github.com/Chris83638w/gravuru-2027/pull/188), Code `6191e3b3d6ac5c0b740bfac9b6bbcbf62e62e6a3`. Vollständiges, importgeprüftes Privatpaket `gesamtbestand-usability-6191e3b3.zip`, 31.673.156 Bytes / 811 Einträge, SHA-256 `de4a9ab90efc45f2b7aca6b8aa88fd3c5b324a1d9ab220fcaab2eee7ebcb4ae7`. Genau zwölf erwartete Laufzeitdateien geändert; alle übrigen Paketdateien und die bestehende Runtime unverändert.

07.11.2026 08:39 UTC: alle fünf tatsächlichen Serverdatenbanken konsistent neu gesichert, 348 Produkte und **358 Revisionen** (neuer Nutzerstand gegenüber vorherigem Navigationsnachweis). Sicherung: `private/galerie-usability-6191e3b3-backup-20261107-v1`. Keine lokalen Testdaten übertragen. Getrenntes Codeverzeichnis `gravuru-2027-usability-6191e3b3` gebaut, weiterhin dieselbe private Konfiguration/Datenablage. [Bereinigter Nachweis](../reviews/2026-11-07-gallery-usability/private-stage-proof.json).

**Aktiviert und geprüft:** Nach erneuter Nutzeranmeldung Site 19 auf `gravuru-2027-usability-6191e3b3` und dessen `/public` umgestellt. Erster Aufruf nach Start bediente noch alten Prozess; expliziter Neustart und anschließende tatsächliche Prüfung bestätigen neuen Stand. **123/123 GET-/Datei-/Bestandsprüfungen grün**, [Onlinebeleg](../reviews/2026-11-07-gallery-usability/online-proof.json). Alte Runtime bleibt Rückweg; keine Datenrücksicherung zur Code-Rücknahme.

Onlinebrowser: D230 Foto auf 80 Prozent in der Karte ausprobiert und ohne Speichern zurückgesetzt, voller Konfi öffnet tatsächlichen Stand 2, No-op „Speichern & zurück“ und Wiederöffnung zeigen weiterhin Stand 2. [Karte](../reviews/2026-11-07-gallery-usability/06-online-D230-groesse-80-vorschau.png), [Konfi](../reviews/2026-11-07-gallery-usability/07-online-D230-konfi-stand2.png). Echte Größenänderung mit SQLite-Speicherung bleibt auf der isolierten lokalen Kopie belegt; keine Online-Teständerung oder Freigabe ausgeführt.

Währenddessen hat Chris vier Freigaben gesetzt. Ihre Ereignisse sind unverändert vorhanden, lückenlos angehängt, keine Löschung/Mutation. Wegen neuer Renderersignatur aktuell viermal „Erneut prüfen“; das ist keine verschwundene Freigabe. Chris darüber informiert. [Freigabenerhalt](../reviews/2026-11-07-gallery-usability/online-approval-preservation.json). Die vier übrigen Datenbanken stimmen strikt mit der frischen Sicherung überein.

Ausgeführter Abnahmehelfer: `work/run-gallery-usability-probe.py --plan work/stage-gallery-usability-6191e3b3-plan.json --attempt 2`. Versuch 1 bleibt als historischer Vor-Neustart-Befund erhalten. Bei inzwischen weiter geänderten Nutzerdaten Abweichungen einzeln nachweisen; niemals gegen die Sicherung zurückschreiben.

## Ergänzung Sammelfreigabe

Chris ist bei Andenken/Edelstahl und möchte alle Designs auf der gefilterten Seite freigeben. Code `3db1ef5d537b495d2bfbaefae9152401293f75cc`: konkrete Auswahl geladener gespeicherter Karten und angezeigter Material-/Formatziele. „Gefilterte Vorlagen freigeben (N)“ öffnet eine sichtbare Bestätigungsfläche auf der Seite mit Anzahl, Materialien und Formaten. Erst „Jetzt N Vorlagen freigeben“ speichert seriell über die bestehenden revisions- und fingerprintgebundenen Freigaben. „Abbrechen“ schreibt nichts. Offene/ungespeicherte/ungeladene und bereits bestätigte Vorlagen werden ausgelassen. Keine pauschale Freigabe aller Größen. Keine Shopveröffentlichung.

Lokale Chrome-Abnahme mit Edelstahl/Andenken/5×2 cm: D401, D406, D408 und D410. Abbrechen ließ alle vier unbestätigt; zweiter expliziter Klick speicherte vier Freigaben, nach Neuladen alle vier bestätigt. Testfreigaben anschließend über die normalen Häkchen zurückgenommen. [Browserbeleg](../reviews/2026-11-07-gallery-usability/local-bulk-approval-proof.json), [Bestätigung](../reviews/2026-11-07-gallery-usability/08-local-bulk-confirmation.png). Keine Online-Freigabe durch Agenten. 15 Approval-UI-Tests nach unabhängiger Prüfung grün; zusätzlich Galerie-/Serverprüfungen. Der unabhängig reproduzierte Fall „POST gespeichert, Antwort verloren, GET gescheitert“ meldet ausdrücklich einen ungeklärten letzten Ausgang, nur vorher sicher bestätigte Speicherungen und keinen automatischen erneuten POST.

Vollständiges Paket `gesamtbestand-bulkapproval-3db1ef5d.zip`, 31.675.702 Bytes, 811 Einträge, SHA-256 `5bea63893b683743e23c91da9ba3024f4772512108149f7a80685ad80fb610b8`. Modulimports geprüft. Gegen die aktive Basis 6191e3b3 genau drei Laufzeitdateien geändert: Freigabe-UI, Galerie-Seite, Galerie-CSS; übrige Paketdateien und private Runtime unverändert.

**Privat aktiviert:** Fünf aktuelle Datenbanken am 07.11.2026 09:03 UTC erneut konsistent gesichert, 348 Produktgruppen und 358 Revisionen, unter `private/galerie-bulkapproval-3db1ef5d-backup-20261107-v1`. Site 19 nutzt nun `gravuru-2027-bulkapproval-3db1ef5d` und dessen `/public`; Start und expliziter Neustart ausgeführt. Alte Wurzel 6191e3b3 bleibt Rückweg, gleiche Konfiguration/Datenablage. [Sicherungsbeleg](../reviews/2026-11-07-gallery-usability/bulk-private-stage-proof.json).

Tatsächlicher Online-Chrome zeigt den neuen Knopf und die zweite Bestätigung mit Materialien/Formaten, anschließend Abbrechen ohne Write. [Online-Knopf](../reviews/2026-11-07-gallery-usability/09-online-bulk-confirmation.png), [Bestätigungsfläche](../reviews/2026-11-07-gallery-usability/10-online-bulk-panel.png). Gefiltert 109 Andenkenschilder; zunächst nur sechs, später neun bereits geladene Vorschauen freigabefähig. Die übrigen Vorschauen laden beim Herunterscrollen. Das ist absichtlich keine Freigabe ungesehener, ungeladener Karten. Die Oberfläche nennt die ausgelassenen Ziele. Alle vier historischen Online-Freigaben vor/nach unverändert, keine neuen Ereignisse durch Agenten. [Erhaltungsnachweis](../reviews/2026-11-07-gallery-usability/bulk-approval-preservation.json).

**115/115 abschließende Onlineprüfungen bestanden**, ausschließlich lesend: [Onlinebeleg](../reviews/2026-11-07-gallery-usability/bulk-online-proof.json). Alle vier übrigen Datenbanken und Metadaten strikt unverändert zur frischen Sicherung; Freigabehistorie vollständig erhalten. Versuch 1 scheiterte ausschließlich am Windows-Zeichensatz des Prüfhelfers für deutschen UI-Text, nicht an der ausgelieferten Seite. Helfer auf explizites UTF-8 und sämtliche endgültigen Panelmerkmale korrigiert, 14 negative Fälle geprüft, Versuch 2 ohne Laufzeitänderung bestanden. Ausführung: `work/run-gallery-bulkapproval-probe.py --plan work/stage-gallery-bulkapproval-3db1ef5d-plan.json --attempt 2`. Historische Versuch-1-Belege bleiben separat erhalten.

Die getrennte Chrome-Frame-Störung ist weiter offen. Historische Browsersteuerungs-Unterbrechungen sind ein Kandidat, keine bestätigte aktuelle Fehlerursache. Kein unbegründeter Produktcode- oder Sicherheitsumbau.
