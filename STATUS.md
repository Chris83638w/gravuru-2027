## Aktuell: PDF-Druckdownload als Prüfexport – 04.10.2026

Aufgabenbranch `task/print-download-20261004`, Basis `7f6bd786ebf097ec8047d7d14ee9705d1ad7030a`. Standard nur PDF; Roland/Mimaki beim Download wählbar, optional ZIP aller verfügbaren Gestaltungsdaten und Originalfoto separat. Überdruck Farbe 0/1 mm, Weißumfang getrennt, Kontur unverändert. 165 Tests bestanden, Build 76/1, tatsächliche PDF- und Browserdownloads geprüft. [Umfang, Prüfung und Grenzen](docs/dashboard-20261004/DRUCKDOWNLOAD.md). PDF-Farbmotiv RGB/600 dpi; Kontur und Weiß Vektor. RIP-/ICC-/Produktionsfreigabe weiterhin offen. Statische private Testseite bleibt ohne dauerhafte Werkstattdaten. Keine Produktivveröffentlichung.

# Aktuell: sichtbare Fotobewegung und normale Bedienelemente korrigiert – 04.10.2026

Branch `task/configurator-controls-20261004`, Basis `5ddd3a1473c32da7682e47ddc6a0445472c4597e`. Die vorherige Ausrichtung wurde vor dem Rendern entfernt; der vorherige Test erkannte nur geänderte interne Werte. Jetzt bleibt der Ausschnitt im Vorschauvertrag und die tatsächlich gezeichnete Bildbewegung bei 100 % ist geprüft. Foto-/Textgriffe für Größe, Drehen und Entfernen erhalten; Design und Maske bleiben fest. Größen-/Löschfreigaben im Backend je Text einstellbar, neue Texte standardmäßig freigegeben. 159 Tests, Build 76/1, sichtbare Desktop-/Touchbedienung und Backend-Speichern/Neuöffnen bestanden. [Korrektur und Nachweis](docs/dashboard-20261004/KONFIGURATOR-BEDIENGRIFFE.md).

Nächster Schritt: aktualisierte private Kundenansicht mit eigenem Foto prüfen. Ältere Aussagen zur erfolgreichen Fotobewegung sind durch die oben dokumentierte Korrektur ersetzt.

# Aktuell: Fotoausrichtung und Backend-Textfreigaben – 04.10.2026

Branch `task/photo-position-20261004`, Basis `57ce8ff6a39fb5c78a6983af8f12c4bf0528b918`. Foto ohne grünen Rahmen, direkt hinter fester Maske verschieb-/zoombar. Neue Texte standardmäßig beweglich; im Backend je Textfeld „Festes Textfeld / Frei verschiebbar“ einstellbar und revisionsgesichert. Eigentliches Design bleibt fest. 157 Tests bestanden, 0 Fehler/Skips; Build 76/1. Echte Desktop-/Touchprüfung und Backend-Speichern/Neuöffnen mit synthetischen Daten bestanden. [Prüfung und Grenzen](docs/dashboard-20261004/FOTO-TEXT-AUSRICHTUNG.md).

Private Testseite zeigt nur die Kundenansicht und speichert keine Werkstattdaten. Originaltreue/Produktion weiterhin offen. Nächster Schritt: Nutzer prüft Foto- und Textausrichtung. Folgende Einträge sind frühere Stände.

# Aktuell: Beispielbild und Originalvorgaben korrigiert – 04.10.2026

Nutzerkorrektur: Foto mit direktem Uploadhinweis erhalten; Pia & Rafael bleiben als vom Kunden änderbare Vorgabe. Massive Holzsockel verdecken unten 7 mm (bestätigt). Folgebranch `task/uv-original-preview-20261004`, Basis `8438bc2a4638c0a2017d98fc9670169661711a1c`. Separate geprüfte Beispielfotoressource, Hinweis nur in Bedienvorschau, direkter Klick/Enter, Fotoersatz und unveränderte Texte beim Neuladen geprüft. 152 Tests bestanden, 0 Fehler/Skips; Build 76/1; Desktop/Mobil geprüft.

Die verlangte 1:1-Originaldarstellung ist noch NICHT bestanden: Linien/Schrift weichen ab, ZIP-Basis ist laut eigener Masteranleitung eine Rekonstruktion; bisherige 93-%-Einpassung bleibt. Vor weiteren Designs originale bearbeitbare Gestaltung/Schrift zum Mockup klären. Kein neues ZIP pauschal verlangen, keine Serienfreigabe behaupten. [Nachweis und präzise Lücke](docs/dashboard-20261004/UV-ORIGINAL-KORREKTUR.md). Die folgenden Ergebnisse sind historische Zwischenstände.

# Aktuell: UV-Vorlagenimport umgesetzt – 04.10.2026

Aufgabenbranch `task/uv-design-pilot-20261004`, auf `51841fda34a8e49f5f3d3634e77ef965720cdef7`. Nutzer-Masterpaket geprüft (17 Manifestdateien). Pilot „Unser kleines Glück“: neun Ebenen, vier Texte plus Bogenfoto. Wiederholbare Vorbereitung, zusätzlicher JSON-Import, unveränderte Bestandsdesigns/Preise, Fotoaustausch ohne Dublette und gespeicherte Kundenfelder. 150 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Browserprüfung einschließlich Größenwechsel und serverseitiger Kundenvalidierung bestanden. Dateien, Befehle und Grenzen: [UV-PILOT-PRUEFUNG.md](docs/dashboard-20261004/UV-PILOT-PRUEFUNG.md).

Nächster Schritt: einen weiteren vorhandenen Entwurf nach [VORLAGENFORMAT.md](docs/dashboard-20261004/VORLAGENFORMAT.md) vorbereiten; dafür fehlt hier noch dessen hochauflösende Quelldatei. Product-Design-Auftrag konkretisiert, aber kein weiterer Agent/Serienlauf gestartet. Beliebige flache Bildzerlegung, vollständige Fonts und Produktionsausgabe bleiben offen. Originalbilder/Pilotdatenbank privat außerhalb Git; keine dauerhafte gemeinsame Ablage behauptet. Nichts live veröffentlicht.

Die folgenden Abschnitte sind historische Zwischenstände; insbesondere der dortige Masterpaket-Downloadblocker ist durch den Nutzerupload erledigt.

# Aktuell: UV-Designpilot – 04.10.2026

Nutzerpriorität: vorhandene UV-Designserie automatisiert als bearbeitbare Vorlagen übernehmen, zuerst „18 – Unser kleines Glück“. Sechs Originalvorschauen (13–18), Direktimportauftrag und private GitHub-Release-Pakete wiedergefunden. Vorschau tatsächlich gelesen; Masterpaket-Download in dieser Aufgabe mit Forbidden blockiert. Keine neue Konvertierung oder Druckprüfung behauptet. Nach bestandenem Pilot weitere Designs durch ein anderes Modell vorbereiten lassen. Quellen, Abnahme und genau fehlende Datei: [UV-DESIGN-PILOT.md](docs/dashboard-20261004/UV-DESIGN-PILOT.md). Codebasis 03fc8aa74df2714ae523fd8208ae2ad3d7327cfa; Aufgabenbranch task/uv-design-pilot-20261004. Nur Dokumentation geändert; keine erneuten Tests erforderlich.

# Aktueller Stand – Gravuru 2027

## Aktuell: Dashboard-Neuaufbau fortgesetzt – 04.10.2026

Maßgeblicher Einstieg: [CLOUD-HANDOVER.md](CLOUD-HANDOVER.md). Aktiver Aufgabenbranch `task/dashboard-customer-fields-20261004`, Basis `1b4626eab6cc2e7d22f815754583cc678e57d558`. Neu: ausdrückliche Text-/Fotofelder für importierte Designs mit Vorschau, mm-Einstellungen, runden Farben, Kundenrechten und unveränderlichen Produktrevisionen. 143 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Desktop-/Mobil-Browserablauf geprüft. [Nachweis und Bilder](docs/dashboard-20261004/PRUEFUNG.md).

Der vorhandene G27-02-Neuaufbau bleibt Grundlage. M01/M02 und die dokumentierten Änderungen gelten gemeinsam; die Gesamtansichten sind noch nicht vollständig umgesetzt. Nächster fachlicher Schritt: bestehende Produktübersicht mit echten Konfigurationsvorschauen nach M01 weiterentwickeln. Keine neue Migrations-/Serverplanung und keine Work-Verknüpfung als Voraussetzung. Private Bestandsdaten sind hier weiterhin nicht angebunden und für dieses Teilstück nicht erforderlich.

Die folgenden Übergabeabschnitte dokumentieren den vorherigen Stand; bei abweichenden nächsten Schritten gilt der aktuelle Einstieg oben.

## Aktueller Cloud-Übergabestand – 04.10.2026

**Cloud-Neustart/Quellabnahme, isolierter Cloud-Restore und GitHub-Leseübergabe bestanden. Der Nutzer hat die Weiterentwicklung ausschließlich in Codex Cloud beauftragt. Eine gemeinsame Serverinstallation ist dafür keine Voraussetzung. Produktion bleibt ungeprüft und nicht freigegeben.**

Fachliche GitHub-Basis: `infra/gravuru-2027-cloud-20261003`, Remote-HEAD am 04.10. geprüft: `f7c3f24db55003c28fec5274dfc5df2736926b6b`. Diese Dokumentübergabe liegt separat auf `infra/cloud-only-handoff-20261004`; kein Merge. Vor weiterer Arbeit aktuellen Remote-HEAD prüfen.

- [Neue Mikail-Cloud-Abnahme](https://github.com/Chris83638w/gravuru-2027/blob/5e40517a85a07d7226989b3863ce025f382aaa20/docs/cloud-migration-20261003/CLOUD-ACCOUNT-A-TEST.md), Marker `5e40517a85a07d7226989b3863ce025f382aaa20`: 137 bestanden, 0 Fehler, 0 Skips; Build 76 Ressourcen/1 Modell; geschützte HTTP-Routen sowie Host/Origin/CSRF geprüft. Die Auswahl Cloud → gravuru-2027 ist durch den Nutzerscreenshot belegt.
- [Chris' isolierter Cloud-Restore](docs/cloud-migration-20261003/CLOUD-RESTORE-NACHWEIS-20261004.md), Originalnachweis `e624833aecf6382f9b5edb4c432eb4e7c81a5cb2`, abgeschlossen 04.10.2026 um 14:13 Europe/Berlin: 16 Teile, 528682206 verschlüsselte Bytes, Archiv-/Manifest-/DB-Prüfungen bestanden. Werkstatt: 7 Produkte/17 Revisionen/4 Importitems; Profile: 2 Profile/2 Profilrevisionen/1 Bibliothekseinstellung/5 Einstellungsrevisionen; Designressourcen: 2 Originalquellen/3 Assets. Keine alten WAL-/SHM-Dateien übernommen.
- Mikail hat den Nachweis am 04.10. gegen 14:25 direkt von GitHub gelesen und beide Remote-HEADs sowie AGENTS.md, CLOUD-AKTUELL.md und STATUS.md geprüft. Dokumentierte Wissensübergabe bestanden; kein Zugriff auf Chris' private Laufzeitdateien.

Die vorstehenden Tests wurden für diese Dokumentübergabe nicht wiederholt. Alte Aussagen »Cloud-Restore/Neustart offen« sind für diese bestandenen isolierten Prüfungen überholt. Dauerhafte gemeinsame private Datenablage, Zugriff beider Konten, App-Anbindung und visuelle Abnahme bleiben offen.

## Nutzerentscheidung: Cloud-Entwicklung fortsetzen

Die spätere Nutzerentscheidung ersetzt die vorherige Entwicklungspause: ausschließlich in der vorhandenen Codex Cloud weiterentwickeln, GitHub als gesicherten Code-/Entscheidungsstand verwenden. Work soll Gestaltung und Bilder übernehmen; die technische Cloud-Verknüpfung ist noch zu bestätigen. Konkreter Einstieg und nächster Schritt: [CLOUD-AKTUELL.md](CLOUD-AKTUELL.md#einstieg-für-work). Keine neue Servereinrichtung als Voraussetzung. Die Vorbereitung auf `infra/private-runtime-preparation-20261004` bleibt separat und wird nicht installiert.

Diese Änderung betrifft ausschließlich CLOUD-AKTUELL.md, START_HERE.md und STATUS.md. Dokumentdiffs geprüft; App-Code und Restorebericht nachweislich unverändert; kein neuer Test-/Build-/Restore-Nachweis. Private Daten aus Chris' Aufgabe sind hier weiterhin nicht verfügbar. Nächstes fachliches Paket: explizite Kundenfelder/Fotobereiche in importierten Designs; keine automatische Editierbarkeit beliebiger Pfad-PDFs.

## Frühere Nachweise und ursprüngliche Übergabe

## Cloud-Übernahme geprüft (03.10.2026)

Aktueller normaler Quellbaum unter `app/` auf `infra/gravuru-2027-cloud-20261003`, übernommen aus dem SHA-256-geprüften Transportstand `3b2ac03d213ac913bcc61520b595f97dde6aa072`. Ausgangsbranch tatsächlich abgerufen: `9ca2d1256c006b20d4a4ca238deca34426b1b2ff`. Die folgenden älteren lokalen/GitHub-Aussagen sind historische Nachweise.

Frisches Verzeichnis in der bestehenden Linux-Cloud-Maschine: 215/215 Quelldateien identisch, vier Referenzarchive korrekt. Node 24.19.0, Python 3.12.14, PyMuPDF 1.28.2. `cloud-check.mjs` und separat `npm test`: jeweils 137 bestanden, 0 Fehler, 0 Skips; `npm run build`: 76 Ressourcen, ein Modell. Kundenkonfi, Editor, Werkstatt/Profile/Serien und Produkt-/Modell-API per HTTP geprüft; fremder Host/Origin und Schreiben ohne CSRF werden mit 403 abgewiesen. Keine Browserabnahme dieses Cloud-Laufs.

Nachweis: `CLOUD-VALIDIERUNG-20261003.md`, `CLOUD-SOURCE-COMPARISON.json`. Kein privater Datenbank-Restore; nur automatisch erzeugter synthetischer Entwicklungs-Master. Keine Produktivveröffentlichung, kein Main-Merge. Neu veröffentlichte Cloud-Maschine, zweiter Account, 24-Stunden-Laptop-aus-Test und vollständige private Sicherung bleiben NICHT GEPRÜFT. Nächster Schritt: Entwicklungsumgebung veröffentlichen und in einer neuen Aufgabe validieren; Datenmigration separat sicher vorbereiten.

Stand: 02.10.2026. **Kundenkonfigurator, Produktverwaltung, Profilbibliothek, erste Excel-Stapelanlage und SVG/PDF-Designersatz sind lokal lauffähig. Die Gesamtanwendung ist noch nicht live fertig.**

## Aktueller Auftrag: Sicherung und vollständige Cloud-Übergabe (02.10.)

**Prüfergebnis:** Neues Paket `outputs/Gravuru-2027-Cloud-Sicherung-20261002.zip` außerhalb des Repositorys, Snapshot 21:23:31 Europe/Berlin, Quellcommit `3b2ac03`, 302 Dateien/Archive, 365.154.964 Bytes, kein fehlender inventarisierter Eingang. Alle drei Datenbanken und Datei-/Originalhashes geprüft. Getrennte Wiederherstellung lädt 7 Produkte und alle 17 Revisionen mit Profil-/Designauflösung; Build 76 Ressourcen/ein Modell, vier Referenzarchive korrekt. Wiederherstellungstests: 133 bestanden, 4 PDF-Tests wegen fehlender nutzbarer Bibliothek übersprungen, 0 Fehler. Details/Hash/IDs und offene Cloud-Abnahme in `CLOUD-SICHERUNG-PRUEFUNG.md`. Originale unverändert; kein Cloud-Upload erfolgt. Dieser nachträgliche Prüfbericht liegt zusätzlich neben dem unveränderten Paket.

Der Nutzer verlangt ausdrücklich, dass beim Wechsel nichts verloren geht und alle Projektressourcen in der Cloud verfügbar werden. Arbeitsstand Einzelimport `fd40467`, Serienimport `076b06e`. `CLOUD-UEBERGABE.md` beschreibt Umfang, geschützten Datentransport, Wiederherstellung und Abnahme. `scripts/prepare-cloud-handoff.py` erstellt ein neues separates Paket mit Quellbaum/Git-Bundle, konsistenten Snapshots aller drei Datenbanken, externen Projektoriginalen sowie SHA-256-Inventar. Es prüft Dateihashes, sämtliche Original-/Vorschauhashes, referenzierte Assets aller Produktrevisionen und SQLite-Integrität. Wiederherstellung überschreibt keine vorhandenen Ordner. Prüfergebnis steht beim konkreten Paket; ein lokal erstelltes Archiv ist noch kein Cloud-Nachweis.

Zugriff am 02.10.: GitHub-Connector auf `Chris83638w/gravuru-2027` liefert 404; Chrome-Sitzung derzeit nicht erreichbar. Keine Wiederholung der alten Cloud-Einrichtung oder Behauptung einer gestarteten Aufgabe. Erst vollständige Sicherung/Probewiederherstellung, dann Übertragung über tatsächlich verfügbaren privaten Zugang. Offizielle Cloud-Doku nennt derzeit Computer-/Browserbedienung als nicht unterstützt; lokale Plugins und Anmeldungen werden nicht automatisch übernommen.

## Neu: Excel-Stapelanlage mit zugeordneten SVG/PDF-Dateien (02.10.)

- http://127.0.0.1:8961/werkstatt/serien/ nimmt jetzt mehrere Design-Dateien gemeinsam mit der Tabelle an. `design_file` verweist auf den exakten Dateinamen, `design_page` auf die PDF-Seite (Standard 1), `design_id` auf das zu ersetzende Masterdesign (leer = Standarddesign), `design_fit` auf `visible` oder `original`. Maximal 100 Produktzeilen/Dateizuordnungen, jede Datei höchstens 15 MB. Keine Ordner-/Drive-Abfrage und keine dauerhaften Hintergrundjobs.
- Vorschau je Produktzeile mit Datei, Seite, Ziel-Design und tatsächlichen Platzierungsmaßen. Der Nutzer prüft vor der Anlage. Fehlende/mehrdeutige Dateien, ungültige Seiten und zu große Originalmaße erzeugen Fehler. Gültige Zeilen können ausdrücklich separat übernommen werden. Abbrechen stoppt nach der laufenden Datei, ohne Produkte anzulegen.
- Derselbe geprüfte Designerersatz wird für Einzelimport und Serie verwendet (`replaceDesignArtwork`). Dateihashes sind Bestandteil der unveränderlichen Produkte und der Importprüfung. Geänderte Dateizuordnung entwertet die alte Freigabe. Wiederholung mit gleichem Importschlüssel erzeugt keine Dubletten, und ein Fehler beim Speichern rollt die Produktserie zurück. Ein importiertes Gesamtmotiv mit gleichzeitig gefüllten Textspalten wird ausdrücklich abgewiesen; Personalisierung wird nicht stillschweigend ignoriert.
- Die herunterladbare Excel-Vorlage besitzt 18 Spalten und eine ergänzte Anleitung; die bisherigen 14 Spalten, Beispielzeile und 100 freien Eingabezeilen bleiben erhalten. Mit Artifact Tool exportiert, neue Bereiche visuell geprüft und alle 1428 alten Zellen unabhängig verglichen. Echter XLSX-Upload wird vom Browserparser akzeptiert. Der verwendete Artifact-Prozess exportierte vollständig, meldete danach beim nativen Windows-Beenden `0xC0000409`; ZIP/XML, native Tabelle, Exportidentität und tatsächliches Einlesen sind gesondert erfolgreich geprüft.
- Testnachweis: voller Lauf 137 Tests, davon 133 bestanden und 4 zunächst wegen Bibliothekszugriff übersprungen. Nach Wiederherstellung des Sitzungszugriffs alle 26 Import-/PDF-Tests bestanden, 0 übersprungen (einschließlich der vier zuvor ausgelassenen). Damit alle 137 verschiedenen Tests abgedeckt, kein Fehler. Kein erneuter vollständiger Testlauf ohne neuen Anlass. Serverstart/Build: 76 Ressourcen/ein Modell.
- Echte Browserprüfung: neue XLSX-Vorlage eingelesen; zwei vorhandene Daria-PDFs mit drei Seitenzuordnungen in einer CSV-Serie geprüft und drei Testprodukte angelegt. IDs: `cfg_12edb094-6d72-4088-bb70-d35feda079e2` (Gesamtmotiv), `cfg_c21ec259-e6cf-4827-a867-6e6ece238313` (Einzelteile Seite 1), `cfg_a1be746e-0896-4646-88be-4e027605860c` (Einzelteile Seite 2). Die letzten beiden sind ausdrücklich Einzelteil-Testprodukte, keine fertig gestalteten Verkaufsprodukte.
- Änderungen: `batch.mjs`, `design-import.mjs`, `http.mjs`, Serien-UI/Parser/Stile, XLSX-Builder/Vorlage und neue `batch-assets.test.mjs`. Vorheriger gesicherter lokaler Einzelimport-Commit `fd40467`; neue Serienänderungen lokal, noch nicht GitHub.

**Nächster fachlicher Schritt:** Kundenfelder/Fotobereiche ausdrücklich in importierten Designs definieren, ohne Originaltext oder Fotos nur mit neuen Feldern zu überdecken. Designsammlungen mit mehreren zugeordneten Designs pro Produkt sind noch über den Master möglich; die neue Excel-Zeile ersetzt jeweils genau ein Design. Freie Formkonturen, Materialien/Bohrbilder, KI-Gestaltung, Shopify und Produktionspakete bleiben offen.

**Aktuelle Cloud-Frage:** Der Nutzer fragt wieder nach Entwicklung bei geschlossenem Laptop. Offizielle aktuelle Doku https://learn.chatgpt.com/docs/cloud bestätigt Aufgaben in veröffentlichten Cloud-Umgebungen unabhängig vom Laptop. Es wurde kein neuer Cloud-Auftrag gestartet und keine Migration behauptet. Vor einem solchen Auftrag aktuellen Quellstand und benötigte Test-/Designressourcen bereitstellen, Node/Python/Abhängigkeiten dort prüfen und Ergebnisse/Änderungen nachvollziehbar zurückführen. Lokale Datenbanken nicht unkontrolliert veröffentlichen. Aktuelle Arbeit zuerst sauber festhalten.

## Neu: echter SVG/PDF-Designersatz (02.10.)

- Werkstatt → Produkt → Designs & Texte → **SVG / PDF ersetzen …**. Auswahl einer PDF-Seite, Prüfung von Maßen und Inhalt, proportionale Platzierung in der sichtbaren Acrylfläche oder Originalmaß, Vorschau vor dem Speichern. Der Import ersetzt ausschließlich das gewählte Design. ID, Varianten, Preise und andere Designs bleiben erhalten.
- Byte-identische Originale und passive SVG-Vorschauen liegen unveränderlich und nach Prüfsumme adressiert in `.local-data/design-assets.sqlite`. Historische Produktrevisionen behalten ihre Quellen. Alle drei Datenbanken in `.local-data/` zusammen sichern. Keine Benutzerdaten nach Git aufnehmen.
- PDF-Schriften werden für die Vorschau zu Pfaden; Vektoren bleiben Vektoren und eingebettete Bilder bleiben Bilder. Keine Rasterung der ganzen Seite. SVG muss bereits Schriftpfade enthalten. Aktive Inhalte, externe Referenzen, nicht unterstützte SVG-Funktionen und PDFs mit nicht eingebetteten Nicht-Standardschriften werden abgewiesen. Die Originaldatei bleibt stets separat herunterladbar.
- Ein importiertes Design ist derzeit **ein gesperrtes Gesamtmotiv**, ohne automatisch editierbare Texte/Fotofelder. Der Foto-Reiter verschwindet nur bei dieser Vorlage ohne Fotofeld; bei einem anderen Design mit eingerichtetem Fotofeld erscheint er wieder. Der Importdialog nennt diese Grenze ausdrücklich. Produktions-CMYK, Schmuckfarben und druckfertige Bestellexporte werden damit nicht behauptet; die Browser-SVG ist eine RGB-Vorschau.
- Aktive Dateien: `app/workshop/design-assets.mjs`, `design-converter.py`, `design-import.mjs`, `ui/design-import-ui.mjs`; Anbindung in HTTP/UI und Kundenmodell. `app/configurator/variant-m/artwork-resource.mjs` transportiert Originalproportionen bis zum Renderer; dies behebt die bei der Sichtprüfung gefundene quadratische Darstellung.
- Vollständiger Testlauf: **128 bestanden, 0 fehlgeschlagen, 0 übersprungen**. Enthält tatsächliche PDF-Konvertierung, SVG-Masken/Farben/Bilddaten, 28 unveränderte Variantenpreise, gezielten Designersatz, unveränderliche Originale/Revisionen, Konfliktschutz, manipulierte Ressourcen, HTTP/CSRF und korrekte Hoch-/Querformatdarstellung. Build weiterhin 76 Ressourcen/ein Modell.
- Echte Browserabnahme mit `Daria-CorelDRAW-2021.pdf`: Import, Vorschau, Ersetzen/Speichern und Kundenansicht, Größen-/Sockelwechsel sowie Foto-Reiter beim Designwechsel geprüft. Separates Prüfprodukt: http://127.0.0.1:8961/werkstatt/?configuration=cfg_a20d644c-1e4c-4158-8f7b-2be30049722b (Revision 2). Originales Arbeitsprodukt `cfg_ad9a9754-9bf2-416c-a366-da9c996cb841` bleibt Revision 10. PDF 150 × 200 mm ist proportional auf 139,5 × 186 mm eingepasst, damit sie vollständig oberhalb des Sockels sichtbar bleibt; keine Behauptung eines physischen 1:1-Produktionsmaßes.
- PDF-Abhängigkeit: PyMuPDF 1.28.2, lokal unter `.local-data/python` installiert. Start-/Installationshinweise in `LOKAL-STARTEN.md`. Paketmetadaten nennen AGPL-3.0 oder kommerzielle Artifex-Lizenz. Vor einem proprietären Hosted-Release den passenden Lizenzweg klären oder einen entsprechend geeigneten Konverter wählen; keine kommerzielle Lizenz wurde erworben.

**Weiterer Ausbau:** importierte Vorlagen mit ausdrücklich zugeordneten Kundenfeldern und austauschbaren Fotobereichen verbinden (keine falsche automatische Rekonstruktion von Pfaden versprechen). Die Datei-IDs sind inzwischen im Excel-Stapelimport verwendbar, siehe neuester Abschnitt. Material-/Form-/Bohrmodell, dauerhafte Jobs, Shopify und verlässliche Druck-/Gravurpakete bleiben weitere offene Pakete.

**Fortsetzungs-/GitHub-Stand:** Lokal `task/g27-02-workshop`, vorheriger Commit `5e2b219`. Die aktuelle Importimplementierung ist noch nicht auf GitHub. Dort enthält Entwurfs-PR #1 (https://github.com/Chris83638w/gravuru-2027/pull/1), Branch `task/g27-02-cloud`, Commit `e8021251a3bf86590798b85dca1bbf001c1fa88c`, den früheren G27-02-Stand als ZIP-Transport. Lokale und entfernte Historien nicht per Force-Push zusammenführen. Es läuft **kein Cloud-Auftrag**; der Nutzer hat die lokale Weiterarbeit verlangt. Keine erneute Cloud-Einrichtung oder Sicherungssuche als Voraussetzung.

## Werkstattbasis vom 01.10. (historischer Nachweis)

- http://127.0.0.1:8961/werkstatt/ – Produkte/Master, stabile cfg-IDs, Kopieren, Preise/SEO/Kategorien/Designtexte, Archiv, lokale Freigabe und Wiederherstellung.
- http://127.0.0.1:8961/werkstatt/profile/ – Schriften, Motive, Farben, Bestseller. Standard → Kategorien in gespeicherter Reihenfolge → eigene Produktzuordnung. Vererben, ausdrücklich leer und eigenes Profil sind verschieden. Tatsächliche Auswahl im Kundenkonfigurator wird gefiltert; vorhandene Vorlagengrafiken und Schriftumrisse bleiben erhalten.
- http://127.0.0.1:8961/werkstatt/serien/ – XLSX/CSV/TSV mit bis zu 100 Produktzeilen aus gespeicherten Mastern, Prüfung vor Anlage, Importschlüssel gegen Duplikate. Optional gültige Zeilen übernehmen und Fehler offen lassen. Noch kein PDF-/SVG-Designersatz oder KI-Stapeljob.
- Mehrere Designs pro Konfiguration: kopieren, sortieren, Standard bestimmen, entfernen (letztes geschützt), Texte und getrennte Elementrechte. Der bestehende Foto-/Designwechsel bleibt verwendbar. Aktuell sind Designvarianten Kopien des Acrylpiloten, keine neu rekonstruierten Bildvorlagen.

Aktive Module: `app/workshop/`. SQLite-Dateien `.local-data/workshop.sqlite` und `profiles.sqlite` bleiben lokal und sind ignoriert. Produktmigration 3, unveränderliche Dokument- und Metadatensnapshots, erwartete Revision gegen überschreibende Paralleländerungen. Die aktuelle Vorschau ohne `revision` benutzt aktuelle Profilzuordnungen. Historische Links mit `revision` verwenden den gespeicherten Profilstand. Vor Einführung der Metadaten erzeugte Revisionen haben die ursprüngliche uneingeschränkte Auswahl.

Browsernachweis: Master kopiert, Name und Preis geändert, gespeichert, neu geladen, Kundenansicht geprüft; Wiederherstellung, Freigabe, Archivieren/Rückholen; zweites Design und Kategorie-Schriftprofil in echter Kundenansicht; XLSX-Vorlage hochgeladen und Produkt angelegt. Getrennte Text-/Farb-/Fotorechte im Kundeneditor geprüft; temporäre Rechteprüfung anschließend auf den regulär bearbeitbaren Stand zurückgesetzt (neue Revision 10). Vollständiger aktueller Testlauf: **111 bestanden, 0 fehlgeschlagen**. Build: **76 Ressourcen, ein Modell**. Das ist kein Nachweis einer Shopify-Bestellstrecke oder Maschinenproduktion.

Lokaler Aufgabenbranch `task/g27-02-workshop`. Der damalige Stand wurde später als G27-02-ZIP übertragen; maßgeblicher Transportstand siehe oben. Quellhistorien nicht per Force-Push zusammenführen.

Damals offen: allgemeines Material-/Form-/Bohrmodell, freie PDF/SVG-Design-/Konturübernahme, Medienverwaltung, anhaltende Importjobs und gezielte Aktualisierung vorhandener Produkte, Shopify-Installation/Zuordnung, Checkout und unveränderliche Bestellungen, Druck-/Gravurpakete, KI-Design und Drive. Der inzwischen gebaute Designersatz und seine Grenzen stehen oben; Formkonturimport bleibt offen. Endgültige Schriften und freigegebene Produktionsprofile bleiben offen. Server bindet nur Loopback; lokale Werkstatt ist keine gehostete Händleranmeldung.

## Historischer G27-01-Nachweis (30.09.)

## Aktuelle Umsetzung

Aktive Anwendung: `app/`. Start: `LOKAL-STARTEN.md`. Vorschau: http://127.0.0.1:8961/?model=acryl. Der alte Vergleich auf Port 8951 bleibt getrennt. Dies ist eine lokale Entwicklungsgrundlage, keine installierte oder live bestellbare Shopify-App.

Gezielt übernommen: Kundeneditor, Motive, Schriften, Acrylszene und sechs Sockel samt benötigter Laufzeitmodule. `app/REFERENCE-UI.json` dokumentiert die ursprünglichen Dateien/Prüfsummen; aktive Fassungen enthalten bewusste Änderungen. Neuer lokaler Server und Einstieg laden nur das Acrylmodell, keine alten Admin-/Bestell-/Produktionsrouten.

Implementiert: gemeinsame versionierte Acrylpreisquelle, validierte Rechte fixer Vorlagenelemente, Fotozuordnung nur über eindeutige semantische Feldschlüssel. Kundenkorrekturen: physische mm-Schriftgrößen, runde Farbfelder/Farbwähler, deutlicher Fotoersatz, mobile direkte Texteingabe, Griffe vor dem Sockel, unpassende Reiter/Bedienelemente ausgeblendet. Das sind Teile von G27-02/G27-05, keine vollständige Abnahme dieser Pakete.

Aktuelle Prüfung: **57 Tests bestanden**; Build mit **76 Ressourcen und einem Modell**. Reale Browserprüfung: alle Sockel, Größe/Preis/Text/Farbe, zweimal Fotoersatz, mobile Texteingabe, mm-Wert nach Fokuswechsel und Griffe vor dem Sockel. Unabhängige Astra-Prüfung mit hohem Denkaufwand: gefundene mm-/Fotoformfehler behoben und nachgeprüft. Details und Grenzen: `G27-01-PRUEFUNG.md`.

Lokaler Aufgabenbranch: `task/g27-01-runnable-foundation`. Die lokale Git-Historie wurde aus dem Referenzstand initialisiert und ist nicht mit der Remote-Historie verbunden. **Nicht per Force-Push übertragen.** Connectorzugriff auf das neue private Repository und Git-Anmeldung waren nicht verfügbar. Ein Übergabearchiv ist ein separater Transportweg, kein gepushter Quellbranch.

GitHub-Sicherung anschließend bestätigt: Branch `task/g27-01-package`, Remote-Commit `36f7c16494feb24abc980f9813a1dec855cc4975`. Enthält `GRAVURU-2027-G27-01.zip` mit aktivem Quellstand des lokalen Commits `51d555e` sowie aktualisierte Start-/Prüf-/Übergabedokumente. https://github.com/Chris83638w/gravuru-2027/tree/task/g27-01-package. Kein Merge nach main und kein Pull Request erstellt. Archiv frisch entpackt: Build mit 76 Ressourcen/einem Modell erfolgreich. Prüfsumme in `G27-01-UEBERGABE.md`.

## Abgeschlossen

- Eigenständiges privates Repository: `Chris83638w/gravuru-2027`.
- Ausgangsdokumentation auf GitHub: Commit `573d882588d968964bfd2a1e17414b22c3f69eac`.
- Umsetzungspakete, Startauftrag für GPT-6.1 Sol, Arbeitsregeln und Materialzuordnung vorbereitet.
- Vier Referenzarchive mit 294 Dateien: bestehender Quellcode, Motive/Schriften, Acrylressourcen, zwölf Materialbilder und zwei ausgewählte Oberflächenentwürfe.
- Probeentpackung und alle Datei-/Archivprüfsummen erfolgreich. 19 vorhandene Tests bestanden; Build erfolgreich mit 104 geprüften Ressourcen und 7 Modellen. Details in `QUELLEN-UND-START.md`.

## Keine Fertigbehauptung

Die erste lokale Kundenoberfläche ist implementiert. Neuere Werkstattfunktionen und verbleibende Grenzen stehen oben. Referenzarchive sind keine automatische Migration.

## Neu berücksichtigt

Edelstahl, Schiefer, Leder und Holz gehören neben Acryl zur Grundlage. In der historischen Sammlung ist **Edelstahl v4** ausgewählt; v6 war eine falsche Zwischenzuordnung. Leder 2 mm und Holz 5 mm sind dort nur Bildannahmen. Schiefer-Designbeispiele liegen vor, reine Rohlingreferenz noch nicht eindeutig zugeordnet. `MATERIALREFERENZEN.md` lesen.

## Genau weiter so

Aktuelle Implementierung weiterverwenden. G27-02 auf Materialien, freie Formen/Bohrbilder und weitere Varianten ausbauen; vorhandenen PDF/SVG-Import aus den Quellen gezielt anschließen. Danach Bestellsnapshots/Produktionspakete und Shopify-Verknüpfung. Keine erneute vollständige Recherche, neue UI-Grundlage oder parallele zweite Datenbank für Produkte erstellen.

## Fortschritt pro Paket ergänzen

Paket / Status / Branch und Commit / betroffene Dateien / konkret ausgeführte Tests / Ergebnislink / offene Grenzen / nächstes Paket. Historische Tests nicht als aktuelle Ergebnisse neuer Änderungen fortschreiben.
