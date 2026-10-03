# Aktueller Stand – Gravuru 2027

## Aktueller Migrationsnachweis – 03.10.2026

**Zuerst [CLOUD-AKTUELL.md](CLOUD-AKTUELL.md) und den [Abschlussbericht](docs/cloud-migration-20261003/ABSCHLUSSBERICHT.md) lesen.** Normaler app/-Quellbaum online; 137 Cloudtests/Build bestanden. Private Serversicherung vollständig zurückgeprüft, 3 SQLite-Restores lokal bestanden. Cloudruntime-Restore, Neustart der veröffentlichten Umgebung und zweiter Account noch offen. Produktion nicht freigegeben. Die folgenden früheren Abschnitte sind datierte Historie und überstimmen diesen Einstieg nicht.

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
