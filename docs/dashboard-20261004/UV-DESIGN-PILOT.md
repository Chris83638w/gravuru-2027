# UV-Designserie: Pilot und Vorbereitung weiterer Designs

Stand 04.10.2026. Aktueller Nutzerauftrag: die vorhandenen rund 18 UV-Druck-Designbeispiele automatisch in bearbeitbare Werkstattvorlagen überführen. Zuerst Pilot **18 – Unser kleines Glück**, anschließend darf ein weiteres Modell die restlichen Designs nach dem erfolgreich geprüften Format vorbereiten. Noch keine Serienverarbeitung beauftragt/gestartet; die Freigabe ist an den erfolgreichen Pilot gebunden.

Codebasis: `Chris83638w/gravuru-2027`, Commit `03fc8aa74df2714ae523fd8208ae2ad3d7327cfa`. Dokumentationsbranch `task/uv-design-pilot-20261004`. Vorhandene Kundenfeldbearbeitung, Produktrevisionen, Importprüfung, Preise und Konfigurator wiederverwenden. Keine alte Pipeline übernehmen und keine privaten Quelldateien in Git aufnehmen.

## Jetzt direkt wiedergefundene Quellen

Die historische Referenz liegt in `Chris83638w/gravuru-shopify`, Commit `084412b43204cf080764a0ef0becea8c251713fd`, Verzeichnis `PROJECT/ACRYLGLAS-150X200-20260929`. Dieses Repository ist nur Herkunft der Designs, kein Wechsel des Entwicklungsprojekts.

- [Maschinenlesbarer Stand](https://github.com/Chris83638w/gravuru-shopify/blob/084412b43204cf080764a0ef0becea8c251713fd/PROJECT/ACRYLGLAS-150X200-20260929/Maschinenlesbarer-Stand.json): 13 Wiesenfreundschaft, 14 Lieblingschaos, 15 Beste Gesellschaft, 16 Du und ich, 17 Immer wieder du, 18 Unser kleines Glück. Für diese sechs Designs sind PDFs und separate Foto-/teilweise Dekorationsdateien dokumentiert. Designs 1–12 sind dort ausdrücklich noch nicht Corel-fertig. Nicht daraus ableiten, dass alle 18 bereits als importierbare Vorlagen vorliegen.
- [Direktimportauftrag](https://github.com/Chris83638w/gravuru-shopify/blob/084412b43204cf080764a0ef0becea8c251713fd/PROJECT/ACRYLGLAS-150X200-20260929/KONFIGURATOR-DIREKTIMPORT.md): echte Foto-Slots, getrennte Texte und Dekoration; Rasterdeko mit Alpha bleibt Raster. Keine automatische Editierbarkeit aus PDF-Ebenen ableiten. Historische Upload-/Servergrenzen gelten nicht ungeprüft für den neuen Code.
- `GITHUB-VORSCHAU.jpg` aus demselben Verzeichnis tatsächlich über den GitHub-Connector gelesen und visuell angesehen: sechs Entwürfe 13–18, unten rechts der Pilot mit Bogenfoto. 81834 Bytes; Git-Blob `0283256cb35cf4ec534b8f25ce5f2ea071371c0a`. Nur private Arbeitskopie außerhalb des Repositorys; keine neue Veröffentlichung der Personenbilder. Diese kleine Übersicht ersetzt kein Originalmotiv.
- [Privates Ressourcenrelease](https://github.com/Chris83638w/gravuru-shopify/releases/tag/resources-acrylglas-150x200-20260929) jetzt per GitHub-API bestätigt. Frühere Hinweise „nur lokal“ in den historischen Texten sind für die beiden nachfolgenden Uploads überholt.

| Datei | Bytes | SHA-256 |
| --- | ---: | --- |
| `Master-Acrylglas-Roland-mit-Beispiel.zip` | 15316863 | `f49918022cb88612ea001935d8ec6db5397cfb393c0989999e1b4da684ab8f36` |
| `Uebergabe-Acrylglas-Corel-und-FPD-Beispiele.zip` | 78506141 | `4be42ad70972e808983dd38eab12c8067d843173156fb2b215b75a874aa86ffa` |

Das kleinere Masterpaket genügt für den ersten Pilot: laut vorhandener Inventarliste enthält es `02-Bearbeitbare-Basis/Pia-und-Rafael-150x200-editierbar.svg`, getrennte PNGs `Foto-austauschbar.png` und `Dekoration-transparent.png` sowie `03-Referenzbild/Produktmockup-Pia-und-Rafael.png`. Letzteres ist hashgleich zum dokumentierten `18-Unser-kleines-Glueck.png`. Paketinhalt noch nicht erneut extrahiert/geprüft.

## Ablauf und Abnahme

1. Masterpaket aus autorisierter Quelle in private Cloud-Ablage übernehmen, SHA-256 prüfen, sichere Extraktion ohne Überschreiben/Scriptausführung. Originale unverändert aufbewahren.
2. Vorhandene Ebenen und Objektrollen nutzen. Nur bei flachen Bildern Erkennung/Rekonstruktion vorschlagen; Unsicherheiten und Unterschiede zum Original zur Prüfung anzeigen. Keine Foto-/Textreste unter den neuen Kundenfeldern belassen.
3. Vorlage: feste Dekoration, echte ersetzbare Fotomaske, getrennte Titel-/Namen-/Datums-/Spruchfelder mit stabilen Schlüsseln und expliziten Kundenrechten. Abmessungen in mm; Schriftdateien/Glyphen prüfen. Koordinaten, Textumbrüche und Bogenform aus dem Original bestimmen, nicht aus der kleinen Übersicht raten.
4. Original und neue Vorschau vergleichen. Anderes Testfoto sowie `Änne & Jörg – 18.05.2022` und längeren Spruch einsetzen; Maskierung, Alpha, Ebenenreihenfolge, Größenwechsel, Speicherung und erneutes Öffnen prüfen. Beispielportrait nicht in Kundenbestellung/Produktion übernehmen.
5. Technische Druckausgabe separat prüfen: Maße, Fonts, Auflösung, vereinbartes Profil, Weiß und Spiegelung. Historische Beispielwerte `mirror: false` und fehlende RIP-Freigabe sind keine bestätigte aktuelle Maschinenkonfiguration. Keine Produktion ohne belegtes Profil/Abnahme.
6. Erst bei bestandenem Pilot das tatsächliche Importformat samt Referenzpaket und automatischem Validator an das weitere Modell übergeben. Je Design Quellen-/Prüfsummen, Ebenen, Feldzuordnung, Vorschau und offene Unsicherheiten liefern lassen. Dashboard übernimmt nur geprüfte Entwürfe; kein automatisches Live-Publishing.

## Tatsächlicher Stand und nächste Handlung

Quellenabgleich abgeschlossen; sechs historische Vorschauen sichtbar. Kein neuer Bild-zu-Vorlage-Pilot und keine Druckprüfung ausgeführt. Der bestehende PDF-Upload importiert feste Grafik; er rekonstruiert noch keine editierbaren Ebenen. Die Kundenfeldoberfläche bietet derzeit Rechteck/Kreis, keine Bogenmaske. Für Design 18 muss die Bogenform durchgehend in Vorschau, Fotoaustausch und späterem Export unterstützt werden.

Konkrete Sperre: `gh release download` und der direkte REST-Abruf von Release-Asset `597765121` liefern in dieser Cloud `Forbidden`. GitHub-Connector liest Release-Metadaten und Repositorydateien, bietet aber keinen Release-Binärdownload. Keine Zugangsdaten gesucht, keine Netzwerkregel umgangen, kein Serverzugriff.

Nächste erforderliche Bereitstellung: das **bereits vorhandene 15,3-MB-Masterpaket** als Dateianhang in diese Aufgabe geben oder einen unterstützten privaten Release-Downloadzugang bereitstellen. Keine Neuerstellung der Designs nötig. Danach direkt Schritt 1; kein weiterer Migrations- oder Setup-Test. Keine erneuten Tests/Builds für diese reine Quellenklärung ausgeführt.
