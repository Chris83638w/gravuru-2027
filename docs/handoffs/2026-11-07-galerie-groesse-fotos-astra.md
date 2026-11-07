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

Lokal abgenommen; private Hostübernahme folgt. Größenänderung nutzt die bestehende native Galerie-Schnittstelle und deren Versionsprüfung. Keine zweite Designdatenbank. Bereits geänderte Nutzerdaten auf dem Server dürfen niemals durch lokale Testdaten ersetzt werden.

- Karte: Element auswählen, kleiner/größer um 10 Prozent oder Prozentwert eingeben und Enter; aktuelle Maße anzeigen, Änderungen speichern. Text wird mit der nativen Schriftmessung skaliert, Motive/Fotos proportional und Grafiken einschließlich Strichstärke. Originalanker, Masken, Zuschnitt und Ressourcen bleiben erhalten. Unzulässige Überstände werden weiterhin abgewiesen.
- Voll-Konfi: bestehende, proportional skalierte Fotoressource wieder öffnen und unverändert speichern. Fotoverweise behalten ihre Reihenfolge, damit unverändertes Speichern keine neue Revision erzeugt.
- Tatsächlicher lokaler Browser: D230/300×200 mm, Foto von 98,971×176,873 auf 79,1768×141,4984 mm; Karte speichert R5, voller Konfi zeigt R5 und speichert ohne neue Revision zurück. Danach lokaler Teststand exakt als R6 wiederhergestellt. Alle 347 anderen Produktköpfe sowie übriger Dokumentinhalt unverändert. [Datenbeleg](../reviews/2026-11-07-gallery-usability/local-size-saveback-proof.json), [Karte](../reviews/2026-11-07-gallery-usability/04-D230-groesse-80-gespeichert.png), [Konfi](../reviews/2026-11-07-gallery-usability/05-D230-konfi-stand5.png).
- Gezielte Tests bestanden: Größen-/Karten-/Galerietests einschließlich echtem nativen Foto-/Text-/Motiv-/Grafik-Roundtrip; 50 Foto-/Kundenpfadtests; 11 Katalog-/Blockertests; abschließend 9 Editor-/HTTP-Tests nach No-op-Korrektur. Getrennte Läufe enthalten Überschneidungen und werden nicht als Gesamtsumme addiert.

Bei Fotos ließ die zusätzliche Aufhellen-Komposition dunkle Details verschwinden. Vorhandene Beispielbilder werden nun ohne zusätzliche Graustufen-/Aufhellen-Komposition gezeigt. Die Originalbildbytes und Masken bleiben unverändert; ein schwarzer Hintergrund oder bereits graues Original wird damit nicht retuschiert. Explizite vorhandene Foto-Bearbeitungen bleiben erhalten. Normale Kunden-Upload-/Produktionspfade sind durch 14 Vorher-/Nachher-Vergleiche bytegleich abgesichert. [Fotobelege und 15 Kandidaten in sechs Zielgruppen](../reviews/2026-11-07-gallery-photos/README.md). Neue Beispielbilder sind erst nach gemeinsamer Auswahl endgültig zuzuordnen.

Die Gruppierung nutzt nun auch vorhandene Themen, Blattangaben und boolesche Fotoangaben. 70 nur allgemein als Tier bezeichnete Katalogoriginale bleiben als Weitere Tiere erkennbar und mit offener Tierzuordnung markiert. Namen und Beispielfotos werden nicht als Beweis einer Tierart geraten. Endgültige Unterkategorienliste von Chris bleibt offen.

93 Schieferoriginale haben mindestens ein noch offenes Format: 11 echte Überstände, 33 Schrift-/Glyphfälle, 49 übrige Quellen-/Format-/Druckfälle. Das ist eine andere Zählung als vollständig unvorbereitete Galeriekarten. D79/D80/D83 sind konkret vermessen; keine pauschale Freischaltung oder automatische Layoutänderung. [Audit je Design-ID](../reviews/2026-11-07-gallery-usability/blocked-slate-originals-and-topics.json). Für diese Fälle ist eine getrennte Reparaturfassung mit anschließender Sichtfreigabe erforderlich.

## Shop-Synchronisierung

Mikas vorhandene Verwaltung und Synchronisierung sind Grundlage, aber keine bestandene reale Shop-Abnahme. Nach der Galerieabnahme folgt eine einzelne bestätigte Produktgruppe als Pilot mit Änderungsvergleich und Rücklesung. Shopify-Schreibschalter bleiben aus; Freigabehäkchen sind keine Veröffentlichung. Chris hat nach dem Zeitpunkt gefragt und damit keinen Shopwrite freigegeben.

Die getrennte Chrome-Frame-Störung ist weiter offen. Historische Browsersteuerungs-Unterbrechungen sind ein Kandidat, keine bestätigte aktuelle Fehlerursache. Kein unbegründeter Produktcode- oder Sicherheitsumbau.
