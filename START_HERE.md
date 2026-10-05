## Aktuell: Persistente Ausgabeaufträge – 05.10.2026

Branch `task/export-queue-20261005`, GitHub-Basis `720d0d1243375109cc237dac4ef9d7d87e416f0a`. Werkstatt → Ausgaben: Status, Verlauf, Wiederholung nach Fehler und gesicherter PDF-/ZIP-Download. Druckaufträge laufen nach Verlassen der Browserseite weiter; dieselbe private Datenbank erhält sie über Prozessneustarts. Doppelte Anforderungen und verspätete alte Ergebnisse überschreiben keine Ausgabe. **204 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browserablauf Desktop/Mobil/Tablet einschließlich PDF und ZIP geprüft.** [Ergebnis](docs/dashboard-20261004/DASHBOARD-AUSGABEAUFTRAEGE.md).

**Nächster Schritt:** Gravurausgabe ohne Druckweiß an dieselben unveränderlichen Prüfstände anbinden; danach weitere Dashboard-/Bestellabläufe. Maschinen bekannt: Roland LEF-200, Roland MO-240, Mimaki 2513 EX; RIP-/ICC-/Maschinenabnahme offen. Keine Bestellung, dauerhafte gemeinsame Ablage oder externe Dashboard-Veröffentlichung behauptet. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Versionierte Fertigungsprofile – 05.10.2026

Branch `task/production-profiles-20261005`, GitHub-Basis `62243a23ad8734a28c30f9f9552dfe0f1730b865`. Werkstatt → Fertigungsprofile: Druck-/Gravurvorgaben erstellen, ändern, historische Stände ansehen, kopieren und archivieren. Formprodukte binden eine feste Profilrevision passend zu Verfahren, Material und tatsächlicher Stärke. Prüfstände übernehmen Profilinhalt und Prüfsumme unveränderlich; die Druckausgabe startet mit diesen gesicherten Vorgaben. **201 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; vollständiger Cloud-Browserablauf Desktop/Mobil/Tablet mit PDF-Download geprüft.** [Ergebnis](docs/dashboard-20261004/DASHBOARD-FERTIGUNGSPROFILE.md).

**Bestätigte Maschinen (Nutzer, 05.10.):** Roland LEF-200, Roland MO-240, Mimaki 2513 EX. RIP-Software, konkrete Material-/ICC-Profile und reale Maschinenabnahme sind noch nicht benannt beziehungsweise bereitgestellt. Keine automatisch freigegebenen Maschinenprofile. **Nächster Schritt:** Persistente Ausgabeaufträge mit Status, Fehleranzeige und Wiederaufnahme; danach Gravurausgabe. Das Gesamtprojekt wird gemäß Nutzerauftrag weitergeführt. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Schriftpfade in der technischen Druck-PDF – 05.10.2026

Branch `task/form-vector-text-20261005`, GitHub-Basis `886a7573b91f7c25edbe491205435af8e2401416`. Explizite Textfelder gesicherter Formprodukte erscheinen jetzt als echte CMYK-Vektorpfade mit identischen Weißkonturen in der Prüf-PDF. Reihenfolge zu Fotos, Mehrzeiligkeit, vorhandene Schriftform, Kursivtransformation und einmalige Spiegelung bleiben erhalten. 300 dpi bleibt der Bildstandard; Schriftpfade sind davon unabhängig. Rezept v2 bewahrt zuvor gespeicherte v1-Dateien. **199 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Desktop-/Mobil-/Tabletprüfung und PDF-/ZIP-Downloads.** [Ergebnis und Grenzen](docs/dashboard-20261004/DASHBOARD-SCHRIFTPFADE.md).

**Nächster Schritt:** Versioniertes Fertigungsprofilmodell an den festen Prüfstand anbinden, ohne reale ICC-/Maschinenparameter zu erfinden. Importierte Designquellen (einschließlich darin fest enthaltener Schrift) und Fotos sind weiterhin gerastert; Gravurausgabe und Maschinenfreigabe bleiben offen. Kein externer Dashboard-Publish, keine Änderung des gesicherten Acrylmusters. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Technische Druckprüfung für Formprodukte – 05.10.2026

Branch `task/form-print-proof-20261005`, GitHub-Basis `2b2d75a2ecf1061275feffa76c7da9f90a3d9ba0`. Gesicherte Gestaltungen erhalten im Backend eine technische PDF-Ausgabe: CMYK/300 dpi, Roland `RDG_WHITE` oder Mimaki-Vektorweiß, standardmäßig nur unter bedruckten Elementen, optionaler 1-mm-Überdruck bei Außenrandkontakt und einmalige Rückseitenspiegelung. Originalfotos, freie Außenkontur und Bohrungen bleiben maßgeblich. PDF oder ZIP mit Originalen; erzeugte Varianten bleiben unveränderlich gespeichert. **197 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Cloud-Browserdownloads auf Desktop sowie Mobil-/Tabletprüfung.** [Ergebnis, Installation und Aufnahmen](docs/dashboard-20261004/DASHBOARD-DRUCKPRUEFUNG.md).

**Grenze:** technische Prüfung, keine Produktionsfreigabe. Farbgestaltung einschließlich Text ist in dieser PDF gerastert; Schriftpfade bleiben im gesicherten SVG. Weiß/Schnittkontur sind Vektoren. ICC-/Maschinenfreigabe und Gravurausgabe fehlen weiterhin. **Nächster Schritt:** Schrift-/Designvektoren in der Druckausgabe erhalten und das versionierte Fertigungsprofil daran anbinden. Keine erfundenen Maschinenparameter. Kein externer Dashboard-Publish; Acrylmuster erhalten. Nachfolgende Abschnitte sind historische Arbeitspakete.

## Aktuell: Unveränderliche Prüfstände im Backend – 05.10.2026

Branch `task/form-production-snapshots-20261005`, GitHub-Basis `280c773c72b55aefecdc0d5d6680fdd0cd07d663`. Gespeicherte Formprodukt-Kundenentwürfe können jetzt unveränderlich für die Werkstattprüfung gesichert werden. Neue Backend-Übersicht mit fester Gestaltung, Produkt-/Entwurfsrevision, Preis, Originalen, Prüfsummen und klaren Fertigungshindernissen. Downloads: reine 1:1-Kontur-PDF, vollständiges Prüfpaket und Originalfotos separat als ZIP. **194 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Desktop-/Mobil-/Tablet-Browserprüfung einschließlich Downloads.** [Ergebnis und Aufnahmen](docs/dashboard-20261004/DASHBOARD-PRUEFSTAENDE.md).

**Nächster Schritt:** Produktionsprofilmodell und technische Druck-/Gravur-Ausgabe an den festen Prüfstand anbinden; vorhandene Acryl-Exportmodule verwenden und freie Konturen ausdrücklich unterstützen. Reale Maschinen-/ICC-Freigaben, Zahlung/Shopify-Bestellbindung und gehostete Kunden-/Operatoranmeldung bleiben offen. Prüfstände sind keine Bestellungen oder druckfertigen PDFs. Kein externer Dashboard-Publish; Acrylmuster unverändert. Nachfolgende Abschnitte sind historische Arbeitspakete.

## Aktuell: Formprodukt-Kundenentwürfe und echte Übersichtsvorschauen – 05.10.2026

Branch `task/form-customer-editor-20261005`, GitHub-Basis `cb878ffaaf1f794f2aadb226b47dcc0f4f2091b6`. Gespeicherte Formprodukte öffnen jetzt einen eigenen privaten Kundenentwurf: Text/Schrift/ganze mm, Foto-Upload, Verschieben hinter festem Ausschnitt, Zoom/Drehung/Graustufen, Rückgängig und revisionsgeschütztes Speichern. Feldrechte werden serverseitig geprüft. Übersichtskarten zeigen das gespeicherte Design auf der vorhandenen Materialoberfläche. **193 Gesamttests bestanden; danach betroffene Prüfungen und echte Cloud-Browserabläufe erfolgreich. Build 76 Ressourcen/1 Modell.** [Umfang, Aufnahmen und Grenzen](docs/dashboard-20261004/DASHBOARD-FORMKUNDEN.md).

**Nächster Schritt:** Kundenentwurf mit unveränderlichem Bestell-/Produktionsstand verbinden; vorhandene Produktionsmodule wiederverwenden. Produktive Kundenanmeldung, Aufbewahrung und reale Maschinen-/Farbprofile bleiben offen. Die neue Ansicht läuft im geschützten Cloud-Entwicklungsserver; kein neuer extern erreichbarer Dashboard-Link und keine Shopveröffentlichung. Acrylmuster bleibt erhalten. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: Designs und Kundenfelder für Formprodukte – 05.10.2026

Branch `task/dashboard-form-designs-20261005`, GitHub-Basis `34bb395cfacba140a486bb987c8f90a98a90a736`. Bestehende SVG/PDF-Dateiablage für freie Formprodukte wiederverwendet: mehrere Designvorlagen, Originalmaß/proportionales Einpassen, Standarddesign, Textfelder mit vorhandenen Schriftpfaden/ganzen mm und explizite Fotobereiche. Material-/Designvorschau hält Originalkontur und Bohrungen frei. Gemeinsame Revisionen, Historie und Kopien bleiben erhalten. **191 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Cloud-Browserprüfung Desktop/Mobil/Tablet.** [Ergebnis und Aufnahmen](docs/dashboard-20261004/DASHBOARD-FORMDESIGNS.md).

**Nächster Schritt:** Formprodukt-Kundenansicht mit tatsächlichem Foto-Upload und serverseitiger Durchsetzung der gespeicherten Feldrechte anbinden. Fotobereiche sind bislang Backend-Platzhalter, keine fertige Bestell- oder Fertigungsstrecke. Kein Dashboard-Publish. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: Edelstahl-Oberfläche im Formprodukt – 05.10.2026

Branch `task/dashboard-material-preview-20261005`, GitHub-Basis `3d0d60480c283c19945ea8c534693f35830b5b19`. Materialansicht mit vorhandener reiner Edelstahlstruktur, umschaltbar zur Konturprüfung; originale Außenform und transparente Ausschnitte bleiben erhalten. Historische Stände berücksichtigen ihre Materialauswahl. Andere Materialien bleiben ausdrücklich ohne zugeordnete leere Oberfläche. **190 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet in Cloud-Chromium geprüft.** [Ansicht und Nachweis](docs/dashboard-20261004/DASHBOARD-MATERIALANSICHT.md).

**Nächster Schritt:** Designvorlagen und Kundenfelder an Formprodukte binden; weitere vorhandene Materialreferenzen getrennt zu leeren Oberflächen aufbereiten und sichtbar prüfen. Keine neue Materialstärke/Herstellerfreigabe abgeleitet, keine Veröffentlichung. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Formprodukte, Materialzuordnung und 1:1-Kontur-PDF – 05.10.2026

Branch `task/dashboard-form-products-20261005`, GitHub-Basis `7943804ad30a4e94e023c880d24ef9cec5d899a2`. Aus Konturvorlagen entstehen eigene Produktentwürfe in derselben Produktverwaltung, mit Material-/Stärkenangaben, eigenem Preis, unveränderlichen Revisionen, Historie/Kopie/Archiv und passender Vektor-Kontur-PDF. Acrylprodukte bleiben erhalten. **188 Gesamttests bestanden; anschließend 4 gezielte Formprodukt-/PDF-Tests bestanden. Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet tatsächlich geprüft.** [Ergebnis, Ansicht und PDF-Beispiel](docs/dashboard-20261004/DASHBOARD-FORMPRODUKTE.md).

**Nächster Schritt:** Designvorlagen und Kundenfelder an diese Formprodukte binden, ohne die Kontur zu verändern oder Gestaltungen zu verzerren. Formprodukte sind noch keine freigegebenen Kunden-/Fertigungsprodukte; Materialszene, Produktionsprofil und reale Maschinenabnahme bleiben offen. Kein Dashboard-Publish. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Formkonturen importieren und prüfen – 05.10.2026

Branch `task/dashboard-contour-import-20261005`, Basis `138dc8bbc3dc7f742d40f86fa813fc706a41ec26` (M02-Varianten, über GitHub bestätigt). Werkstatt → Formkonturen: geschlossene SVG-/PDF-Außenform mit Innenausschnitten in tatsächlichen mm importieren, Vorschau und unverändertes Original sichern, gespeicherte Vorlagen erneut öffnen. Bestehende Designs/Produkte unverändert. **185 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet mit synthetischen Konturdateien geprüft.** [Ergebnis, Installationsbefehl und Bilder](docs/dashboard-20261004/DASHBOARD-KONTUREN.md).

**Nächster Schritt:** Konturvorlage in das versionierte Material-/Formproduktmodell einbinden und dieselbe Geometrie in 2D-Vorschau und Produktionskontur nutzen. Importbibliothek ist fertig; freie Produkt-/Fertigungsanbindung und reale Maschinenabnahme bleiben offen. Kein Dashboard-Publish. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: M01 und M02-Variantensteuerung – 05.10.2026

Branch `task/dashboard-options-20261005`, Basis `092228adb0fbc6a14b0850cdeccee947c2c17a45` (M01-Karten/Verwaltungsaktionen, auf GitHub bestätigt). Zusätzlich in M02: verfügbare Größen, Sockel und Wandhalterungen samt Kunden-Startauswahl bearbeiten; gemeinsame Vorschau-/Preisauflösung und Revisionen. **177 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Backend → Speichern → echter Kundenkonfigurator in der bestehenden Cloud mit synthetischen Daten geprüft. [Ergebnis und Bilder](docs/dashboard-20261004/DASHBOARD-VARIANTEN.md). Muster Acrylglasbild erhalten, kein Dashboard-Publish.

**Nächster Schritt:** Maßhaltiger SVG-/PDF-Konturimport im Material-/Formmodell, getrennt vom Designimport; Originalmaße und vorhandene Materialreferenzen erhalten. Shopify/Bestellstrecke und reale Fertigungsabnahme bleiben offen. Die folgenden Abschnitte dokumentieren frühere Pakete.

## Aktuell: M01-Karten und Verwaltungsaktionen – 05.10.2026

Branch `task/dashboard-m01-overview-20261005`, Basis `8227eb7db836de5e30779e42fdd7bd36cb1a68f4`. Große Produktkarten mit tatsächlichem Design und vollständiger Platte, Größen/Stand/Designanzahl, Kopieren und revisionsgeschützte Einzel-/Mehrfacharchivierung samt Wiederherstellung. M02 und Muster Acrylglasbild bleiben erhalten. **176 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Cloud-Browserprüfung Desktop/Mobil mit synthetischen Daten, einschließlich parallelem Speicherkonflikt. [Ergebnis und Bilder](docs/dashboard-20261004/DASHBOARD-M01.md). Kein Dashboard-Publish.

**Nächster Schritt:** Verfügbare Acrylgrößen/Sockel und Startauswahl in M02 „Optionen & Preise“ über das bestehende Variantenmodell bearbeitbar machen. Shopify, weitere Materialadapter und echte Produktionsabnahme sind weiterhin offen. Die folgenden Abschnitte dokumentieren frühere Pakete.

## Aktuell: M02-Produktbearbeitung – 05.10.2026

Branch `task/dashboard-m02-editor-20261005`, Basis `b51f7fb6fa5ef4f9ed2b53832858f2035fc283e4`. Große Entwurfsvorschau zwischen Bereichen/Elementen und Eigenschaften; Text/Schrift/mm/Farbe, Kundenrechte, Beispielfotoersatz und Uploadhinweis angebunden. Vorhandene Speicher-/Import-/Verlauffunktionen weiterverwendet. **175 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Desktop/Mobil mit synthetischen Daten in der bestehenden Cloud geprüft. [Ergebnis, Grenzen und Bilder](docs/dashboard-20261004/DASHBOARD-M02.md). Keine Dashboard-Veröffentlichung; Muster Acrylglasbild unverändert.

**Nächster Schritt:** M01-Produktkarten entsprechend der ausgewählten fotografischen Übersicht korrigieren. Die älteren „fertig“-Aussagen sind keine vollständige Dashboard-Abnahme.

## Schnellzugriff: Muster Acrylglasbild – 05.10.2026

[**Muster Acrylglasbild öffnen**](https://gravuru-design-test-mika.gravur4you-cy.chatgpt.site/?model=acryl&v=0608ef1) · [Gesicherte Version und Übergabe](docs/dashboard-20261004/MUSTER-ACRYLGLASBILD.md). Der aktuelle Konfiguratorstand ist als private Site-Version 12 archiviert. Entwicklungsbasis `f4c9a2068f7d159def5f88f2a841bf01c1a59bd8`; nicht auf frühere Einstiege zurücksetzen. Die folgenden Abschnitte dokumentieren frühere Arbeitspakete.

# Gravuru 2027 – Einstieg und Übergabe

## Aktuell: Dashboard-Neuaufbau fortgesetzt – 04.10.2026

Maßgeblicher Einstieg: [CLOUD-HANDOVER.md](CLOUD-HANDOVER.md). Aktiver Aufgabenbranch `task/dashboard-customer-fields-20261004`, Basis `1b4626eab6cc2e7d22f815754583cc678e57d558`. Neu: ausdrückliche Text-/Fotofelder für importierte Designs mit Vorschau, mm-Einstellungen, runden Farben, Kundenrechten und unveränderlichen Produktrevisionen. 143 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Desktop-/Mobil-Browserablauf geprüft. [Nachweis und Bilder](docs/dashboard-20261004/PRUEFUNG.md).

Der vorhandene G27-02-Neuaufbau bleibt Grundlage. M01/M02 und die dokumentierten Änderungen gelten gemeinsam; die Gesamtansichten sind noch nicht vollständig umgesetzt. Nächster fachlicher Schritt: bestehende Produktübersicht mit echten Konfigurationsvorschauen nach M01 weiterentwickeln. Keine neue Migrations-/Serverplanung und keine Work-Verknüpfung als Voraussetzung. Private Bestandsdaten sind hier weiterhin nicht angebunden und für dieses Teilstück nicht erforderlich.

Die folgenden Übergabeabschnitte dokumentieren den vorherigen Stand; bei abweichenden nächsten Schritten gilt der aktuelle Einstieg oben.

## Aktueller Einstieg – 04.10.2026

**Ab jetzt ausschließlich Codex Cloud weiterentwickeln; GitHub sichert Code und Entscheidungen. Work ist für Gestaltung und Bilder vorgesehen, seine Cloud-Verknüpfung muss noch bestätigt werden.** Zuerst [CLOUD-AKTUELL.md](CLOUD-AKTUELL.md), [STATUS.md](STATUS.md) und [AGENTS.md](AGENTS.md) lesen. Neue Mikail-Cloud-Abnahme (137/0/0, Build 76/1), Chris' isolierter Cloud-Restore und GitHub-Leseübergabe sind bestanden. [Restorebericht](docs/cloud-migration-20261003/CLOUD-RESTORE-NACHWEIS-20261004.md) unverändert aus `e624833aecf6382f9b5edb4c432eb4e7c81a5cb2` übernommen. Dauerhafte gemeinsame private Datenablage, Zugriff beider Konten, Anbindung und visuelle App-Abnahme bleiben offen. Keine Produktionsfreigabe.

Fester Einstieg: »Gravuru 2027 – Cloud – Mikail«, `01a101bb-342f-750b-b481-82c3c3a5c072`. GitHub-Basis `infra/gravuru-2027-cloud-20261003`, Remote-HEAD `f7c3f24db55003c28fec5274dfc5df2736926b6b`; Dokumentübergabe separat auf `infra/cloud-only-handoff-20261004`. Cloud-Arbeitsweise und genau nächster Schritt stehen in CLOUD-AKTUELL.md. Die folgenden Abschnitte bleiben historische Nachweise und überstimmen diesen Einstieg nicht.

## Frühere Nachweise und ursprüngliche Übergabe

## Cloud-Übernahme geprüft (03.10.2026)

Aktueller normaler Quellbaum unter `app/` auf `infra/gravuru-2027-cloud-20261003`, übernommen aus dem SHA-256-geprüften Transportstand `3b2ac03d213ac913bcc61520b595f97dde6aa072`. Ausgangsbranch tatsächlich abgerufen: `9ca2d1256c006b20d4a4ca238deca34426b1b2ff`. Die folgenden älteren lokalen/GitHub-Aussagen sind historische Nachweise.

Frisches Verzeichnis in der bestehenden Linux-Cloud-Maschine: 215/215 Quelldateien identisch, vier Referenzarchive korrekt. Node 24.19.0, Python 3.12.14, PyMuPDF 1.28.2. `cloud-check.mjs` und separat `npm test`: jeweils 137 bestanden, 0 Fehler, 0 Skips; `npm run build`: 76 Ressourcen, ein Modell. Kundenkonfi, Editor, Werkstatt/Profile/Serien und Produkt-/Modell-API per HTTP geprüft; fremder Host/Origin und Schreiben ohne CSRF werden mit 403 abgewiesen. Keine Browserabnahme dieses Cloud-Laufs.

Nachweis: `CLOUD-VALIDIERUNG-20261003.md`, `CLOUD-SOURCE-COMPARISON.json`. Kein privater Datenbank-Restore; nur automatisch erzeugter synthetischer Entwicklungs-Master. Keine Produktivveröffentlichung, kein Main-Merge. Neu veröffentlichte Cloud-Maschine, zweiter Account, 24-Stunden-Laptop-aus-Test und vollständige private Sicherung bleiben NICHT GEPRÜFT. Nächster Schritt: Entwicklungsumgebung veröffentlichen und in einer neuen Aufgabe validieren; Datenmigration separat sicher vorbereiten.

Stand: 02.10.2026. **Aktueller Auftrag: vollständige, geprüfte Sicherung und Cloud-Übergabe ohne Datenverlust vorbereiten (CLOUD-UEBERGABE.md).** Ein tatsächlicher Cloud-Lauf ist noch nicht bestätigt. Auftraggeber: Mikail. Kurze deutsche Erläuterungen, sichtbare Ergebnisse und ehrliche Grenzen sind wichtig. Bereits festgelegte Produktangaben nicht erneut erfragen. Der Nutzer erwartet die vollständige Umsetzung und hat ausdrücklich zu wenig sichtbaren Fortschritt kritisiert. Zwischenstände nicht als Ende des Auftrags behandeln.

Aktueller Stand: 137 verschiedene Tests erfolgreich abgedeckt, einschließlich echter PDF-Konvertierung; Build mit 76 Ressourcen/einem Modell. Kundenprodukt `cfg_ad9a9754-9bf2-416c-a366-da9c996cb841` bleibt regulär bearbeitbar, Revision 10. Produktverwaltung, Kategorieprofile und XLSX-Stapelanlage bestehen. Neu: SVG/PDF ersetzt nach Vorschau genau ein ausgewähltes Design, Originaldateien und Revisionen bleiben gespeichert. Im Browser mit der vorhandenen Daria-PDF in einer separaten Kopie `cfg_a20d644c-1e4c-4158-8f7b-2be30049722b` geprüft. Importierte Vorlagen sind zunächst feste Grafiken; Kundenfelder werden nicht automatisch rekonstruiert. Der Excel-Stapelimport verknüpft jetzt Dateinamen/PDF-Seiten mit bis zu 100 Produktzeilen; Vorschau und echte Dreier-Testserie sind geprüft. Nächste Umsetzung: explizite Kundenfelder für importierte Designs; anschließend Material-/Form-/Bohrmodell. Shopify und Produktionsstrecke bleiben offen. Keine Wiederholung der abgeschlossenen Grundarbeiten und keine neue Sicherungssuche. Nach Rechnerneustart Anwendung laut `LOKAL-STARTEN.md` starten; URLs allein starten keinen Server.

**Zuerst den neuen Abschnitt in STATUS.md lesen.** Aktive Anwendung unter `app/` auf Branch `task/g27-02-workshop`. Einstieg: http://127.0.0.1:8961/werkstatt/. Historische G27-01-Angaben unten sind kein aktueller Funktionsumfang. G27-02-Basis liegt als ZIP in GitHub-Entwurfs-PR #1; die neuen Designimport-Änderungen vom 02.10. sind bislang lokal. Kein Cloud-Auftrag läuft.

## Maßgeblicher Projektstand

Das neue Projekt heißt **Gravuru 2027**. Repository: https://github.com/Chris83638w/gravuru-2027. Der alte Konfigurator dient als geprüfte Quelle und Vergleich. Keine blinde Kopie des gesamten Altbestands.

Neueste Entscheidung hat Vorrang vor früheren Vorschlägen: **2D genügt zunächst; AR ist auf später verschoben.** Eine 2D-Darstellung eines Wandbilds in einem eigenen Raumfoto kann später ohne Live-AR umgesetzt werden. Ein verlässlicher Maßstab einer solchen Fotomontage benötigt eine bekannte Referenzgröße; diese Funktion wurde noch nicht gebaut.

Die erste neue Kundenoberfläche ist lokal implementiert und geprüft. Aktive Dateien unter `app/`, Start über `LOKAL-STARTEN.md`, aktuelle Prüfung in `G27-01-PRUEFUNG.md`. Eingefrorene Referenzpakete mit 294 Dateien bleiben Herkunftsmaterial. Ein sichtbarer Button oder Screenshot beweist keine vollständige Bestellstrecke.

## Lesen und weiterarbeiten

1. `STATUS.md` und `AGENTS.md`: konkreter Fortschritt und Arbeitsregeln.
2. Aktives nächstes Paket **G27-02** in `UMSETZUNGSPAKETE.md`. `UEBERGABE-SOL-6.1.md` ist der historische Startauftrag; bereits erledigtes G27-01 nicht wiederholen.
3. `QUELLEN-UND-START.md`: Archive prüfen, Quellen gezielt öffnen, vorhandenen Build reproduzieren. `MATERIALREFERENZEN.md` sichert die Materialauswahl und ihre Grenzen.
4. Passende Abschnitte in `NEUE-WERKSTATT-PLAN.md` nachschlagen: bestätigte Anforderungen, Preise und Befunde. `KONFI-VERGLEICH-UND-AR.md` ist ergänzender Hintergrund, keine Pflicht zur erneuten Recherche; AR bleibt vertagt.

## Herkunft

- Altes Repository: `Chris83638w/gravuru-shopify`.
- Am 30.09.2026 geprüfter Quellbranch: `feat/variante-m-profile-20260924`, Commit `b564422edadaf56a27a09f99e1140a546e5e7145`.
- Aufgabenbranch mit dokumentierter Planung: `task/acrylglas-konfigurator-20260929`.
- Letzter dokumentierter Vergleichsstand dort: `e34dffaa6f9c90edd2cfcce58fa1e08541731092`.
- Lokale alte Arbeitskopie: `C:/Users/Mikail Erdem/Documents/Codex/2026-09-29/wa/work/acrylic-konfi`.
- Die lokale Arbeitskopie enthält Acryl-Erweiterungen und Medien, die nicht vollständig in den alten GitHub-Commits stehen. Die ausgewählten Quellen und Ressourcen sind jetzt in den Referenzarchiven mit SHA-256-Manifest eingefroren. Das gesamte historische App-/Werkstattprojekt bleibt davon zu unterscheiden.
- Lokal gezeigte Basisansicht: `http://127.0.0.1:8951/?model=acryl`; Diskussionsansicht ergänzt `&review=1`. Lokale Adresse ist keine öffentliche Bereitstellung und keine Startgarantie auf einem anderen Rechner.

## Geprüfter Bestand und Grenzen

Historische Referenzprüfung: 19 Tests, 104 Ressourcen, 7 Modelle, 294 Dateiprüfsummen. **Aktuelle Anwendung: 137 Tests, 76 ausgewählte Ressourcen, ein Acrylmodell.** Fotozuordnung anhand eindeutiger Feldschlüssel und gemeinsame Acrylpreisregeln sind implementiert. Aktueller Umfang in `STATUS.md`; `G27-01-PRUEFUNG.md` beschreibt nur die erste Kundenoberfläche. Historische Befunde im Bauplan nicht als aktuellen Fehlerstand übernehmen.

Neue Produktverwaltung speichert in SQLite mit Revisionen/Metadaten und Migrationen. Bestehende historische Kundensitzungs-/Produktionsmodule sind noch nicht daran angeschlossen. PDF-/Druckausgaben, freier Konturimport, Produktion und Shopify benötigen ihre jeweiligen durchgehenden Abnahmen.

Zwölf Materialbilder für Edelstahl, Leder, Holz und Acryl wurden wiedergefunden und unverändert gesichert. Schieferbeispiele liegen ebenfalls vor, die reine Rohlingreferenz ist noch nicht eindeutig zugeordnet. Keine neuen Uploads pauschal verlangen. Endgültige Schriftarten, unbestätigte Materialstärken und freigegebene Maschinen-/Farbprofile bleiben offene Voraussetzungen; Details im Materialregister und Bauplan.

## Als Nächstes

G27-02: gemeinsames Modell für Material, Formkontur, Variante, Bohrbild, Design, Kundenfelder und Produktionsprofil samt Speicherung/Revisionen. Aktive Acrylregeln wiederverwenden. Druck und Gravur abdecken; Verwaltung und Stapelverarbeitung verwenden dieselben Regeln. Den Namen Gravuru 2027 konsequent verwenden. Aktueller lokaler Pilot: http://127.0.0.1:8961/?model=acryl. Git-Transportgrenzen in `STATUS.md` beachten.
