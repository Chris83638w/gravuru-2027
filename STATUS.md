## Aktuell: Gemeinsamer Abschlussabgleich und Storefront-Transport – 06.10.2026

Branch **`task/completion-pass-20261006`**, Basis **`4b296b28e2d2c7b6f76e82c98589188c40d2af30`**. Dashboard-/Kundenentwürfe gegen verlorene Eingaben und verspätete Antworten abgesichert, Fotoeditor erhält die verfügbare Originalauflösung des Zuschnitts, Excel verarbeitet gültige Zeilen trotz einzelner Datumsfehler. Neuer serverseitiger Storefront-Warenkorbtransport mit Preis-/Variantenprüfung, festen Zielen, Timeout und ohne automatische Wiederholung; noch ohne App-/UI-Anschluss. **355 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Vier echte synthetische Browserabläufe auf Desktop/Handy/Tablet bestanden. [Gesamtstand, Nachweise und genaue Grenzen](docs/dashboard-20261004/ABSCHLUSSABGLEICH-20261006.md).

**Gesamtprojekt noch nicht vollständig abgeschlossen.** Echte Händler-/Kundenanmeldung, authentifizierte Bestellannahme und kaufgebundene PDF-Downloads benötigen noch Implementierung und sichere App-/Betriebsanbindung. Ebenso offen: reale Shopify-Produktübertragung, Drive-/KI-Dienst, vollständige Originaldesignserie und Maschinen-/ICC-Abnahme. Historische Vorbereitungen sind keine echte Bestellung. Der bekannte Shopify-Link bezeichnet ein Schieferprodukt, keine App. **Nächster Anschluss: bestehende konkrete Shopify-Test-App per Name/Verwaltungslink identifizieren; keine Secretwerte im Chat.** Originalarchiv 13–18 auf GitHub bestätigt, Binärabruf hier blockiert; 1–12 darin nicht enthalten. Kein neuer Serverplan und keine pauschale erneute Uploadanforderung.

Keine Veröffentlichung, echte Shopbestellung, privaten Daten in Git oder Merge. Nachfolgende Abschnitte sind historische Nachweise; bei abweichenden offenen Punkten gilt dieser aktuelle Abgleich.

## Aktuell: Verwendung von Fertigungsprofilen sichtbar – 06.10.2026

Branch `task/production-profile-usage-20261006`, Basis `8f2a0539923d5f2e9adb7914b095ce1464be382e`. **Fertigungsprofile → Verwendung in Produkten** zeigt aktuelle und intern aktivierte Produktstände samt gebundener Profilrevision, einschließlich archivierter Master. Neue Profilrevisionen ändern keine bestehenden Zuordnungen. Direkter Link zum aktuellen Acryl-/Formprodukteditor; historische Bestellungen/Prüfstände ausdrücklich außerhalb der Liste. **322 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Browserablauf auf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/FERTIGUNGSPROFIL-VERWENDUNG-20261006.md).

Keine Veröffentlichung oder Maschinenfreigabe. Reale Corel-/Mimaki-Druckabnahme und bestätigte Fertigungsvorgaben bleiben offen; nächster externer Schritt ist das Ergebnis der bereitgestellten PDFs zur konkreten Datei zu dokumentieren. Tatsächliche Shop-/Betriebsanbindung und gemessenes ICC separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Vollständiger und filterbarer Prüfverlauf – 06.10.2026

Branch `task/output-check-history-20261006`, Basis `7ca26dfcbdecd4301c72b05004e0d7fb3cf434ca`. Unter **Ausgaben** ältere Prüfvermerke nachladen und nach PDF/Weiß-PDF sowie Import/Druckprobe filtern. Frühere 200-Einträge-Grenze aufgehoben; neue Einträge beim Blättern erzeugen keine Duplikate oder Lücken. Erfassungsformular bleibt erhalten, Ausgabewechsel setzt Kontext zurück. **321 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; neuer Browserablauf und bestehender Journalablauf auf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/AUSGABE-PRUEFVERLAUF-20261006.md).

Keine Veröffentlichung oder reale Maschinenabnahme; PDFs und bestehende Einträge unverändert. Nächster externer Schritt: tatsächliches Corel-/Mimaki-Import-/Druckergebnis der bereitgestellten Dateien dokumentieren. Shop-Bestellstrecke, dauerhafte private Betriebsanbindung und gemessenes ICC separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Gesicherte Ausgabeeinstellungen vergleichen – 06.10.2026

Branch `task/output-specification-20261006`, Basis `962d10c4725a74e3725818731dcf9819375c813d`. Unter **Ausgaben** zeigt der neue Vergleich die angeforderten und im Erstellungsnachweis gespeicherten Einstellungen einschließlich Spiegelung, Weiß und effektivem Überdruck. Fester Profilstand und Abweichungen sichtbar; fehlende historische Angaben bleiben ausdrücklich unbekannt. PDF-Erzeugung und vorhandene Druckdateien unverändert. **319 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/AUSGABE-EINSTELLUNGEN-20261006.md).

Keine Veröffentlichung oder Maschinenfreigabe. Nächste externe Abnahme: reales Corel-/Mimaki-Import-/Probedruckergebnis der bereitgestellten Dateien im Prüfjournal festhalten. Echte Test-App-/Betriebsanbindung und gemessenes ICC separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Alte fehlgeschlagene Ausgaben ohne Wiederholungsschleife – 06.10.2026

Branch `task/obsolete-output-recovery-20261006`, Basis `56a7467b4407455f2870066a3cd31916c08875bb`. Alte fehlgeschlagene Ausgabeversionen erhalten unter **Ausgaben** die Aktion **Mit aktueller Ausgabeversion neu anlegen**. Gesicherte Gestaltung und Einstellungen bleiben erhalten; alter Auftrag/Verlauf unverändert, Wiederholung ohne Duplikate, Bestellbezug erhalten. Neue PDF ausdrücklich erneut prüfen. **316 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansicht](docs/dashboard-20261004/AUSGABE-NEUANLAGE-20261006.md).

Keine automatische Neuberechnung bestehender Dateien, keine Veröffentlichung oder Maschinenfreigabe. Aktuelle fehlgeschlagene Aufträge behalten ihren normalen Wiederholweg. Nächste externe Abnahme: reales Import-/Probedruckergebnis der bereitgestellten Dateien und bestätigte Fertigungsvorgaben dokumentieren. Test-App-/Betriebsanbindung separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Fertigungsprofil bei Bestellgestaltung → Produkt erhalten – 06.10.2026

Branch `task/order-product-profile-20261006`, Basis `928c071ec8a777e10494ba1bbe2d8698735629ea`. Neue Acrylproduktentwürfe aus gesicherten Bestellungen übernehmen jetzt den festen Fertigungsprofilstand, statt auf Standardwerte zurückzufallen. Referenzen und Hash geprüft; neuere Profile nicht automatisch übernommen. Private Kundenbilder, ursprüngliche Bestellung und Shopbindungen bleiben unverändert. **315 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; durchgehender synthetischer Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansicht](docs/dashboard-20261004/BESTELLPRODUKT-PROFIL-20261006.md).

Keine Veröffentlichung, echte Zahlung oder Maschinenfreigabe. Bereits zuvor angelegte Produktentwürfe werden nicht nachträglich verändert. Nächste externe Abnahme: reales Import-/Probedruckergebnis und bestätigte Fertigungsvorgaben dokumentieren; echte Test-App-/Betriebsanbindung separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Gespeicherte Gravur-PDF direkt ansehen – 06.10.2026

Branch `task/engraving-pdf-preview-20261006`, Basis `d7bf81fed4bad7a381eb4a43e0bdc4ce545d0d78`. Unter **Ausgaben → Gravur-PDF ansehen** wird die tatsächliche gesicherte Raster-/Vektorgravur auf Weiß dargestellt, einschließlich PDF-Prüfsumme. Keine zusätzliche Spiegelung, Umfärbung oder Änderung der Datei; Schnittkontur bleibt separat. **314 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Gravur-Browserablauf und Druckvorschau-Regression Desktop/Handy/Tablet bestanden.** [Nachweis und Ansicht](docs/dashboard-20261004/GRAVUR-PDF-VORSCHAU-20261006.md).

Synthetische technische Abnahme, keine reale Probegravur oder Veröffentlichung. Vorhandene Druck-/Weißvorschau erhalten. Nächster fachlicher Schritt: reale Import-/Maschinenprüfung der gesicherten Dateien dokumentieren; bestätigte Maschinen-/Materialprofile separat hinterlegen. Echte Shop-/Betriebsabnahme bleibt offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Feste Fertigungsprofile auch für native Acrylprodukte – 06.10.2026

Branch `task/acrylic-production-profiles-20261006`, Basis `ece60315a8b016c5f6b741bfd6a226508ea0b13e`. Unter **Fertigung** einen passenden Profilstand auswählen und mit dem Acrylprodukt speichern. Neue gesicherte Gestaltungen übernehmen diesen festen Stand samt Druck-/Gravurvorgaben; spätere Profiländerungen ersetzen ihn nicht automatisch. Alte Produktrevisionen und Ausgaben bleiben erhalten. **313 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansicht](docs/dashboard-20261004/ACRYL-FERTIGUNGSPROFILE-20261006.md).

Prüfung mit synthetischen Profilen/Daten, keine reale Maschinenfreigabe oder Veröffentlichung. Weiß-PDF vektoriell mit RDG_WHITE und CutContour bestätigt; bisherige private Corel-Dateien per SHA unverändert. Nächster fachlicher Schritt: reales Import-/Probedruckergebnis zu den bereitgestellten Dateien im Prüfprotokoll erfassen und bestätigte Fertigungsvorgaben hinterlegen. Echte Shop-/Betriebsabnahme separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Prüfvermerke zur konkreten Ausgabedatei – 06.10.2026

Branch `task/output-check-journal-20261006`, Basis `26907140e0de3486e8a7bf04368913d7d556b146`. Unter **Ausgaben** können Dateiimport und Probedruck/Probegravur getrennt zur konkreten PDF-SHA dokumentiert werden. Unveränderlicher Verlauf, Wiederholschutz und Korrekturen als neue Einträge; PDFs, Aufträge und Berechtigungen bleiben unverändert. **310 Tests bestanden, 0 Fehler/Skips; Build 76/1; tatsächlicher Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/AUSGABE-PRUEFVERMERKE-20261006.md).

Nur synthetische Prüfvermerke zur technischen Abnahme. Keine echte Maschinenprüfung behauptet, kein Deploy/Shopify-Schreibzugriff. Neue private Corel-Testdateien unverändert; deren Nutzerabnahme steht aus. Nächster fachlicher Anschluss: gespeicherte Fertigungsprofile auch dem nativen Acrylprodukt zuordnen (bisher nur Formprodukte); keine Ersatz-Druckparameter erfinden. Externe Betriebs-/Shop-Abnahme separat offen. Nachfolgende Nachweise sind historisch.

## Aktuell: Bestellposition direkt mit ihren Ausgaben verbunden – 06.10.2026

Branch `task/order-output-complete-20261006`, Basis `b64494f3fec7e46af9f5e9f12473b2d066e86294` einschließlich Vektor-/Mimaki-Konturkorrektur. Testbestellung → gesicherte Gestaltung → Ausgabe → PDF/ZIP mit erhaltenem Bestellbezug. Dateien gehören zur festen Prüfstand-ID; andere Gestaltung desselben Produkts ausgeschlossen. Storno/Erstattung sichtbar, Originale und Berechtigungen unverändert. **307 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/BESTELLUNG-AUSGABEN-20261006.md).

Keine Veröffentlichung, echte Shopify-Anfrage oder private DB verwendet. Neue Corel-Testdateien als direkte Vektortexte und Mimaki-RDG_WHITE samt Kontur technisch geprüft; realer Import-/Drucktest steht aus. Nächste Betriebsabnahme: bestätigte Test-App-Verbindung und sicher erreichbares dauerhaftes Backend. Keine erneute Cloud-Migration oder allgemeine Serverplanung. Nachfolgende Nachweise sind historisch.

## Aktuell: Vektor-Texte und Mimaki-Außenkontur – 06.10.2026

Branch `task/pdf-vector-contour-fix-20261006`, Basis `8745c9873942647796927d5680b9eb66ee14510e`. Texte als zusammengesetzte Vektorpfade ohne zusätzliche Text-Formhüllen; Mimaki-Weißdatei enthält nun auch die maßgleiche CutContour. Neue private PDF-1.3-Testdateien bereitgestellt, normale Backend-Rezepte v5/v3 korrigiert; ältere gespeicherte Ausgaben erhalten. **306 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet und MuPDF/Ghostscript bestanden.** [Dateinachweis und Grenzen](docs/dashboard-20261004/PDF-VEKTOREN-KONTUR-20261006.md).

Nutzer meldete Bitmap-Gruppen in Corel; die frühere PDF-Struktur enthielt Vektorpfade in Form-XObjects. Neue direkte Pfade technisch geprüft; tatsächlicher Corel-/Mimaki-Import bleibt ausstehend. Kein Deploy. Nächster unabhängiger Code-Schritt: erhaltene Bestell-/Ausgaben-Verknüpfung fertigstellen. Nachfolgende Nachweise sind historisch.

## Aktuell: Farbe und Weiß aus der gespeicherten PDF prüfen – 06.10.2026

Branch `task/dashboard-plate-preview-20261006`, Basis `ff8b4c5bb6a6eefd5879281126553f56eb051c3a`. Unter **Ausgaben** lassen sich Farbe und Weiß getrennt auf transparentem Karohintergrund ansehen. Quelle ist die tatsächlich gesicherte PDF, bei Mimaki die jeweilige separate Datei; Quellen-SHA sichtbar. Kein Weiß-Button bei Ausgabe ohne Weiß, kein altes Bild nach Auftragswechsel. PDFs/ZIPs bleiben unverändert. **304 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Handy/Tablet/Desktop bestanden.** [Nachweis und sichtbare Ansichten](docs/dashboard-20261004/DASHBOARD-DRUCKEBENEN-20261006.md).

In der vorhandenen Cloud implementiert und geprüft, nicht veröffentlicht. Keine Maschinen-/ICC-Freigabe oder echte Shop-Verbindung daraus ableiten. Nächster Schritt: Mimaki-Importergebnis des Nutzers übernehmen und bei Bedarf mit der gespeicherten Druckebene vergleichen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Mimaki-Trennung im Dashboard – 06.10.2026

Branch `task/dashboard-print-separations-20261006`, Basis `6ca4df1c7dd82a669eb72eca0348d72b9f35d3b1`. Neue Ausgabeaufträge liefern Mimaki-Farbe ohne RDG_WHITE und reine RDG_WHITE-Vektoren getrennt, beide einzeln im Prüfstand/unter „Ausgaben“ und im ZIP. Texte je Eingabe gruppiert; alte gespeicherte Dateien bleiben unverändert. **301 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet sowie MuPDF/Ghostscript bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/DASHBOARD-DRUCKTRENNUNG-20261006.md).

In der vorhandenen Cloud umgesetzt und geprüft, kein Deploy oder Shop-Schreibzugriff. Nutzerfreigabe betrifft weiterhin die konkrete frühere Roland-PDF-1.3-Probe; der reguläre Renderer erhält PDF-1.7-Transparenzen. Nächster Schritt: Mimaki-/Corel-Test der bereitgestellten Dateien übernehmen; automatische Ausgabe bei Bedarf im selben Importer vergleichen. Echte Maschinen-/ICC-Abnahme, Backend-Hosting und Shop-Verbindung bleiben separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Roland bestätigt, Mimaki getrennt – 06.10.2026

Branch `task/print-separations-20261006`, Basis `9a05d1b0d4641ae2a395493ae7a87cc5190964f5`. Nutzer bestätigt die korrigierte PDF als für Roland gut. Vier Texteingaben in einer neuen Kopie zu je einem Vektorobjekt zusammengefasst; Mimaki erhält zwei separate Dateien: nur RDG_WHITE-Vektoren sowie CMYK-Farbe ohne RDG_WHITE. Quelle erhalten, Formate und Platzierung identisch. **Alle drei Dateien mit MuPDF/Ghostscript geprüft; Farbansichten bei 150/300 dpi pixelidentisch.** [Nachweis und Ablauf](docs/dashboard-20261004/COREL-MIMAKI-TRENNDATEIEN-20261006.md).

Private PDFs außerhalb Git bereitgestellt. Separate reproduzierbare Nachverarbeitung, noch keine Änderung des Dashboard-Downloads. Nächster Schritt: Mimaki-/Corel-Gruppierungsabnahme, dann bestätigte Ausgabe in den normalen Download integrieren. App-Tests/Build nicht wiederholt; vorherige 300/0/0 und 76/1 bleiben historische Ergebnisse. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Gemeinsame Varianten-Zuordnung – 06.10.2026

Branch `task/shop-variant-mapping-20261006`, Basis `8b4bacf38e39a3a3b4285115c10c96252e1322a3`. In **Shop vorbereiten** lassen sich jetzt alle 28 Acryl-Ausführungen zusammen vorhandenen Varianten-IDs zuordnen. Serverpreise aus gespeichertem Produktstand, gemeinsames Speichern mit vollständigem Zurückrollen bei Fehler, erhaltene historische Bindungen und Anschluss an gesicherte Kundenentwürfe. **300 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/SHOP-VARIANTENZUORDNUNG-20261006.md).

Nur lokale Vorbereitung mit synthetischen Daten: Variantenexistenz und Shoppreise noch nicht online bestätigt; nichts an Shopify gesendet oder veröffentlicht. Nächster Schritt: echte Varianten-/Preisprüfung nach bestätigter Test-App-Anbindung. Corel-Probe bleibt unabhängig beim Nutzer zur Abnahme. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Spätere Bestellstatusmeldungen – 06.10.2026

Branch `task/order-status-20261006`, Basis `95788388cb853a7a76c3bb2ff723e334be25caa4`. Dashboard zeigt Teil-/Vollerstattung und Storno zusätzlich zum unveränderten ursprünglichen Bestellstand; verspätete Meldungen und Wiederholungen geprüft. **296 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Nachweis und Handyansicht](docs/dashboard-20261004/BESTELLSTATUS-20261006.md).

Nur signierte synthetische Testereignisse, keine Shop-Mutation oder Veröffentlichung. Positionsbezogene Rückzahlungen, echte Test-App-Zustellung und Kunden-Downloads bleiben offen. Neue kombinierte Corel-PDF-1.3-Probe besteht MuPDF und Ghostscript; Nutzerabnahme steht aus. Frühere EINE-DATEI-Kompatibilitätsprobe hatte einen reproduzierbaren Lesefehler und ist ersetzt. Die folgenden Abschnitte sind historische Nachweise.

## Aktuell: Importfarbe und RDG_WHITE-Vektorregel – 06.10.2026

Branch `task/acrylic-import-tint-20261006`, Basis `e70aeb2b10bc7d441bebfa4509205a655a7fb283`. Eingefärbte SVG-/PDF-Importe jetzt auch in der nativen Ausgabe mit erhaltener Transparenz. **292 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser/Desktop/Handy/Tablet bestanden.** RDG_WHITE verbindlich immer Vektor und echte Sonderfarbe, zusätzlich gezielt geprüft. [Nachweis, Foto-Druckproben und offene Importdiagnose](docs/dashboard-20261004/ACRYL-IMPORTFARBE-WEISSVEKTOR-20261006.md).

Keine Veröffentlichung. Nutzer-Probedruck meldet ein Weißproblem; PDF-Struktur ist Vektor, konkreter Corel-/RIP-Import noch ungeklärt. Nächster Schritt: separate RDG_WHITE-Vektordatei im betroffenen Programm vergleichen. Folgende Abschnitte sind historische Paketnachweise.

## Aktuell: Sichtprüfung und Excel direkt verfügbar – 06.10.2026

Branch `docs/dashboard-review-pack-20261006`, geprüfter Produktcode `f9f1fba6bb5560183c25ddc15b7d97f898eb5290`. Frische Aufnahmen der tatsächlichen Cloud-Oberfläche mit synthetischen Daten: Produktübersicht, Acryl-Editor, Excel, Prüfstand, Bildqualität und Gravur. [PDF, HTML, Excel und genaue Grenzen](docs/dashboard-20261004/DASHBOARD-SICHTPRUEFUNG-20261006.md).

Browseraufnahme am 06.10.2026 um 11:20 Uhr Europe/Berlin erfolgreich, keine JavaScript-Fehler; Build 76 Ressourcen/1 Modell. Die 289 Tests des vorherigen Pakets wurden nicht erneut ausgeführt. Produktcode unverändert. Kein Deploy: Der bestehende private Muster-Link ist weiterhin Site-Version 12 und enthält kein Werkstatt-Backend. Für interaktiven Dashboard-Zugriff fehlt in dieser Aufgabe eine authentifizierte Browser-/Portfreigabe der bestehenden Node-/SQLite-/Python-Laufzeit; nicht durch eine statische Nachbildung ersetzen. Shopify-/Maschinenabnahme bleiben separat offen. Folgende Abschnitte sind historische Paketnachweise.

## Aktuell: Fotofenster-Abdeckung im Dashboard – 06.10.2026

Branch `task/acrylic-photo-coverage-20261006`, Basis `537730a2ac659f2d8cd244d5efa1037a0e07ef5c` (Remote bestätigt). Neue Acryl-Prüfstände zeigen pro Foto, ob seine Bildfläche die tatsächliche Maske vollständig abdeckt. Rechteck, Kreis, Ellipse und Bogen einschließlich Fotozoom, Versatz und Drehung geprüft. Bewusst freie Stellen bleiben erlaubt; keine Exportblockade, automatische Verschiebung oder neue Druck-Überlappungswarnung.

**289 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Beide Browserfälle (vollständig bedeckt/teilweise frei) mit PDF/ZIP auf Desktop/Handy/Tablet bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-FOTOFENSTER-20261006.md).

Abdeckung betrifft die Bildfläche, nicht transparente Pixel innerhalb der Datei. Alte Prüfstände bleiben unverändert. Keine Veröffentlichung oder privaten Daten. Nächste externe Abnahme bleibt die bestätigte Shopify-Test-App-Anbindung und reale Maschinenprobe. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Bildauflösung im Acryl-Prüfstand – 06.10.2026

Branch `task/acrylic-photo-quality-20261006`, Basis `ef36ab0106be85baae2eef58997cb02e8792461b` (Remote bestätigt). Das Dashboard zeigt die Pixeldichte hochgeladener Bilder in ihrer gespeicherten Platzierung, einschließlich Plattengröße, Zoom und bearbeiteter Bildfassung. Unter 300 dpi gibt es einen konkreten Hinweis; höherer Export-dpi-Wert ersetzt keine fehlenden Bilddetails. Werte sind im Prüfstand/ZIP gesichert. Alte Stände und Originalbilder bleiben unverändert.

**286 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Browserprüfung Desktop/Handy/Tablet mit Anzeige, PDF/ZIP und Wiederholungsdownload bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-BILDAUFLOESUNG-20261006.md).

Prüfung der verfügbaren Pixel, keine automatische Schärfeprüfung; Beispielbilder/importierte Designquellen nicht bewertet. Kein Deploy oder privater Datenbestand. Reale Shopify-Test-App-Anbindung und Maschinenabnahme bleiben externe Voraussetzungen. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Acryl-Gravur aus dem gesicherten Prüfstand – 06.10.2026

Branch `task/acrylic-engraving-output-20261006`, Basis `f5ea76d2fa266d37dfe5d4d2569fd33dc92bc1cf` (Remote bestätigt). Das vorhandene Dashboard erzeugt jetzt auch aus nativen Acryl-Gravurständen eine Graustufen-PDF für Fotos oder eine Vektor-PDF für reine Pfade. Standard 300 dpi, ohne Druckweiß; Schnittkontur separat im ZIP. Helle Gravur-Vorschaufarben werden für Schrift und Bibliotheksmotive als schwarze Gravurflächen ausgegeben. Originalfotos und eingefrorene Gestaltung bleiben erhalten.

**283 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Browserprüfung mit PDF/ZIP, Fehlerfall Foto im Vektormodus und Wiederholungsdownload auf Desktop/Handy/Tablet bestanden. [Nachweis und Beispiel](docs/dashboard-20261004/ACRYL-GRAVUR-AUS-PRUEFSTAND-20261006.md).

Die frühere Sperre der nativen Acryl-Gravurausgabe ist damit aufgehoben. Technische Prüfung mit synthetischen Daten; keine Laserparameter-/Probegravurfreigabe, echte Shopify-Zahlung oder Veröffentlichung. Nächster externer Schritt bleibt die bestätigte Test-Store-/App-Anbindung; reale Maschinenabnahme separat. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Acryl-Bestellgestaltung als neuer Produktentwurf – 06.10.2026

Branch `task/acrylic-order-product-20261006`, Basis `5f97ce4a964b4e80907bd4a4608c53d4599fcdcf` (Remote bestätigt). Im Dashboard: Testbestellung → Gestaltung als neues Produkt → Vorschau → privater Acrylentwurf im vorhandenen Editor. Layout/Farben/Schriftgestaltung und Löschungen bleiben erhalten; standardmäßig ursprüngliche Beispieltexte, Kundentexte nur ausdrücklich. Kundenfotos/Logos und Uploaddaten werden entfernt. Bestellung, Ausgangsprodukt und Shopbindungen bleiben unverändert; Wiederholung erzeugt keinen Doppelentwurf.

**280 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Browserablauf einschließlich neuem Produkt Desktop/Handy/Tablet geprüft. [Nachweis, Bilder und Verlauf der vier Pakete](docs/dashboard-20261004/ACRYL-BESTELLUNG-NEUES-PRODUKT-20261006.md).

Damit technisch lokal geprüft: bestehender Acryl-Konfi → fester Prüfstand → CMYK-PDF/ZIP → lokale Variantenbindung → signierte synthetische Testbestellung → neuer privater Produktentwurf. **Keine echte Shopify-Zahlung/Kundenkontofreigabe, kein Live-Deploy und keine Maschinen-/ICC-Abnahme.** Nächste externe Voraussetzung: bestätigte Test-Store-/App-Anbindung mit passenden Acrylvarianten; bekannter Schieferartikel bleibt unberührt. Private Bestände wurden nicht verwendet. Folgende Abschnitte sind historische Paketnachweise.

## Aktuell: Native Acryl-Bestellübergabe lokal geprüft – 06.10.2026

Branch `task/acrylic-order-handoff-20261006`, Basis `a6d4e18a50d0b5ee97dde1ee0231c81f59274e54`. Gesicherte Acryl-Ausführung und Menge jetzt im Dashboard an die vorgesehene Shop-Variante binden und Übergabe lokal prüfen. Optionen/Revisionspreis unveränderlich; gleich teure andere Ausführungen und falsche Mengen werden abgewiesen. Signierte synthetische Testbestellung übernimmt 36,97 € × 2 = 73,94 € samt festem Stand; Wiederholung bleibt ohne Doppelbestellung.

**278 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echte Dashboardbedienung Desktop/Handy/Tablet bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-BESTELLUEBERGABE-20261006.md). Keine echte Shopify-Anfrage, Zahlung, Veröffentlichung oder Kundenfreigabe. Nur neue synthetische Datenbanken; private Bestände unverändert.

Nächster Code-Schritt: native Acrylgestaltung aus Testbestellung als neuen privaten Produktentwurf übernehmen, ohne Kundenfotos. Reale Store-/App-Anbindung und ICC-/Maschinenabnahme bleiben offen. Die folgenden Abschnitte sind historische Nachweise.

## Aktuell: Gleiche Acrylpreise in Konfi und Commerce-Zuordnung – 06.10.2026

Branch `task/acrylic-commerce-prices-20261006`, Basis `91541d6d331cb976196942b7c3ea2feb75117a4c` (Remote bestätigt). Die Commerce-Prüfung verwendet jetzt die bestehende versionierte Kalkulation statt einer zweiten Summe der Optionspreise. Damit werden große Sockel korrekt mit +100 Cent berücksichtigt: große Platte/Eiche/Wandhalterung **36,97 €**. Veraltete Preisbindungen werden auch direkt vor der Auswahl abgewiesen; Zusatzmotive/-fotos bleiben ohne bestätigte Aufpreis-Anbindung gesperrt.

**275 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell**, Cloud-Check 06.10.2026, 10:17–10:18 Uhr Europe/Berlin. [Prüfbericht](docs/dashboard-20261004/acryl-commerce-preise-cloud-report.json). Fünf gezielte neue Tests prüfen alle 28 Kombinationen, Mengen, geänderte Preisrevisionen, generische Produkte und gesperrte Aufpreise. Keine Shop-Verbindung oder Mutation; kein neuer Kundendialog. Nächster Schritt: native Acryl-Prüfstände in die lokale Warenkorb-/Testbestellprüfung übernehmen. Die folgenden Abschnitte sind historische Nachweise.

## Aktuell: Acryl-PDF aus dem unveränderlichen Prüfstand – 06.10.2026

Branch `task/acrylic-snapshot-output-20261006`, Basis `7b071fc64c6604affbdb5190bb1814d3ebf38427`. Dashboard-Prüfstand erzeugt native Acryl-PDF serverseitig aus gesicherten Textpfaden, Design- und Fotoquellen. Standard: PDF, 300 dpi, CMYK, RDG_WHITE nur unter Druck, keine Randzugabe; Mimaki/ZIP optional. Konturdownload, Vollfläche mit optionalem 1-mm-Rand und einmalige Spiegelung geprüft. Originalfoto und alte Ausgabe bleiben erhalten.

**270 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echter Browser Desktop/Handy/Tablet mit bearbeitetem Foto, beiden Exporten und Vergleich zur Konfi-Gestaltung bestanden; bisherige Formprodukt-/Testbestellstrecke erneut bestanden. [Nachweis und PDF-Vorschau](docs/dashboard-20261004/ACRYL-FERTIGUNG-AUS-PRUEFSTAND-20261006.md).

**Grenzen:** technische generische CMYK-Prüfung, noch keine ICC-/RIP-/Maschinenfreigabe oder echte Shopify-Bestellung. Native Acrylgravur und ausdrücklich nicht unterstützte Elementtypen werden abgewiesen. Keine Veröffentlichung; private Bestände bleiben außerhalb Git. Nächster Schritt: Preisparität der Acryl-Commerce-Zuordnung, danach native Bestellübergabe. Die folgenden Abschnitte sind historische Paketnachweise; die frühere Sperre der Acryl-Druck-PDF ist durch dieses Paket aufgehoben.

## Aktuell: Acryl-Konfi → unveränderlicher Werkstattprüfstand – 06.10.2026

Branch `task/acrylic-review-handoff-20261006`, Basis `8cb741d67fb867faefc70f97117a5f741fc5b705` (Remote bestätigt). Im bestehenden Acryl-Konfi nach „Gestaltung fertig“ jetzt „Für die Werkstattprüfung sichern“: natives Design, unveränderte Originalbilder, bearbeitete Bildfassung, Produktrevision, Schrift-/Motivquellen, Ausführung, Geometrie und serverberechneter Preis. Dashboard zeigt die gesicherte Gestaltung und Ausführung; ZIP/Originalfotos herunterladbar. Spätere Bearbeitungen bleiben getrennt, Wiederholungen erzeugen keine Doppelstände. Keine Umwandlung in ein Formprodukt.

**269 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echter Browser mit synthetischem Foto/Text und großer Platte/Eiche/Wandhalterung: 36,97 €, 7 mm Einstecktiefe, Desktop/Handy/Tablet bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-WERKSTATT-UEBERGABE-20261006.md).

**Grenzen:** Die gespeicherte PNG ist eine Browserreferenz, keine serverseitig reproduzierte Fertigungsdatei. Ausgabeaufträge und Shopify-Warenkorb sind für diese neue Acryl-Snapshotart ausdrücklich gesperrt; vorhandene Formprodukt-Ausgaben bleiben erhalten. Keine Veröffentlichung oder echte Bestellung. Private Daten liegen ausschließlich in der laufenden privaten Cloud-Aufgabe; GitHub sichert Code und synthetischen Nachweis, nicht eine dauerhafte gemeinsame Kundendatenbank. Nächster Code-Schritt: native Acryl-Fertigungsausgabe aus dem eingefrorenen Stand anbinden, ohne den älteren RGB-Commerce-Export als CMYK-Produktion auszugeben. Echte Shopify-App-Bindung und Maschinenabnahme separat offen. Folgende Abschnitte sind historische Nachweise.

## Aktuell: Gemeinsamer Konfi-Einstieg bis PDF/ZIP geprüft – 06.10.2026

Branch `task/konfi-form-completion-20261006`, Basis `3ddb7c4d6ba26f686a74bec0f680cec6b1354f36`. Formprodukte und Ausführungsgruppen öffnen jetzt den gemeinsamen Konfigurator-Einstieg mit Vorschau, Bearbeitungsreitern und integrierter Ausführungswahl. Vorhandener Acryl-Editor erhalten und erneut geprüft. Durchgehend: Excel → Kunde → unveränderlicher Werkstattprüfstand → Roland-PDF/Mimaki-ZIP → synthetische Testbestellung → neuer Produktentwurf ohne Kundenfoto. **268 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Gesamtnachweis, Bilder und genaue Grenzen](docs/dashboard-20261004/KONFI-GESAMTABLAUF-20261006.md).

Shopify-Link aus dem anderen Chat wiedergefunden und lesend bestätigt: `gravuru-design.myshopify.com`, Produkt `16138521641340` ist eine Schiefer-Grabtafel im Entwurf mit sieben Varianten. Nicht mit dem Acrylmuster gleichsetzen. Die Adresse fehlt nicht mehr. **Noch keine echte Shop-/Maschinenabnahme:** Testziel/App-Anbindung, Acryl-Warenkorbparität, Kundenkonto und reale Fertigungsprofile bleiben offen. Keine Shopify-Mutation, Veröffentlichung oder private Daten in Git. Nächster externer Schritt: konkretes Testziel und App-Anbindung freigeben; keine erneute Migrationsplanung. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Bestehenden Konfi angebunden geprüft – 06.10.2026

Branch `task/existing-konfi-binding-20261006`, Basis `84f649eab669486428c9450483605bbfd459660b`. Acryl-Dashboard öffnet den bestehenden Kundenkonfigurator; beide Editor-Vorschaulinks jetzt auf die gespeicherte Revision festgelegt und bei ungespeicherten Änderungen verborgen. Echter Browserlauf mit Dashboardänderung, späterer Revision und Neuladen des alten Links bestanden; Desktop/Handy/Tablet, keine JavaScript-Fehler. Fixture-Build **76 Ressourcen/1 Modell**. Die **268 Tests** des vorigen Pakets sind ein historischer Nachweis und wurden hier nicht wiederholt. [Prüfung und Grenzen](docs/dashboard-20261004/DASHBOARD-BESTEHENDER-KONFI.md).

**Nächster Schritt:** Freie Formprodukte in den vorhandenen Konfigurator einbinden; ihre bisherige separate Kunden-Testansicht ist dafür noch keine Abnahme. Danach durchgehender Kundenentwurf → Werkstatt → PDF/ZIP. Muster Acrylglasbild und separate Testseite unverändert; keine Veröffentlichung. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Excel bis Kundenkonfigurator zusammenhängend geprüft – 06.10.2026

Branch `task/excel-customer-flow-20261006`, Basis `e57a7defee4ff8e554f4f17c5beb0442120e224b`. Echte XLSX-/SVG-/PDF-Importe → drei Formprodukte → Design-Excel-Update → Gruppe aus Produktkatalog → alle drei Kundenausführungen, Texte speichern/neuladen und Designs wechseln. Spätere Preis-/Designänderung übernimmt ein alter Gruppenlink nicht still. Gefundene PDF-Rundungsabweichung bei maßgleicher Platzierung korrigiert, Originalmaß unverändert. **268 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; durchgehender Browserlauf Desktop/Handy/Tablet bestanden.** [Ergebnis, Bilder und wiederholbarer Ablauf](docs/dashboard-20261004/DASHBOARD-EXCEL-KUNDENABLAUF.md).

Nächster Schritt: Kundenentwurf → Werkstattprüfstand → PDF/ZIP-Ausgabe zusammenhängend abnehmen. Nur synthetische Prüfdaten; keine echte Bestellung oder Fertigungsfreigabe. Keine Veröffentlichung, kein Merge/PR; separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Designzuordnungen aus Excel bearbeiten – 06.10.2026

Branch `task/design-excel-export-20261006`, Basis `a06bab0cb0f3ec1eb1ef220992f4d39d1e6aa2e8`. Produktserien exportiert vorhandene Formprodukte mit Designnamen, IDs und Standardauswahl. Ohne neue Grafik bleiben Original, Platzierung, Kundenfelder und Rechte erhalten. Unveränderte Formprodukte werden übersprungen; Konflikte und Wiederaufnahme bleiben geprüft. **267 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echter Download/Bearbeitung/Reimport, Desktop/Handy/Tablet geprüft.** [Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-DESIGNZUORDNUNGEN-EXPORT.md).

Nächster Schritt: Tabellenablauf Produktanlage → Designzuordnung → Ausführungsgruppe → Kundenkonfigurator zusammenhängend prüfen. Keine privaten Bestände verwendet, keine Veröffentlichung, kein Merge/PR. Separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Ausführungen als ausgefüllte Excel bearbeiten – 06.10.2026

Branch `task/variant-excel-export-20261006`, Basis `61903f9ae655116f3c8b8e7ae774a7f19c0e96ea`. Ausführungen → Excel-Zuordnung exportiert ausgewählte Gruppen samt festen Produktständen und zusätzlicher Produktliste. Herunterladen → bearbeiten → prüfen → übernehmen im Browser geprüft; unveränderte Gruppen werden ohne neue Revision übersprungen. **263 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Handy/Tablet geprüft.** [Bedienung, Installation und Nachweis](docs/dashboard-20261004/DASHBOARD-AUSFUEHRUNGEN-EXPORT.md).

Neue Python-Anforderung für dynamische XLSX: `python3 -m pip install --target .local-data/python -r app/workshop/requirements-excel.txt`. Nächster Schritt: Designzuordnungen aus bestehenden Formprodukten für den Tabellenabgleich bereitstellen, ohne private Bilddateien oder Kundeninhalte zu exportieren. Kein Publish/Deploy, Merge, PR oder Zugriff auf private Bestände; bisherige Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Ausführungsgruppen per Excel zuordnen – 06.10.2026

Branch `task/variant-excel-20261006`, Basis `35e3cae6b34d6ef0daee099e0ada0f81bb63358d`. Neue XLSX-Vorlage mit **Gruppen**, **Varianten**, **Anleitung** und Oberfläche unter Ausführungen → Excel-Zuordnung. Vorschau, explizite Teilübernahme, gezielte Updates und Wiederaufnahme ohne doppelte Gruppen. Feste Produktrevisionen; ungenannte Ausführungen bleiben erhalten. **259 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Echter Excel-Upload/Download und Browserprüfung Desktop/Handy/Tablet bestanden.** [Vorlage, Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-AUSFUEHRUNGEN-EXCEL.md).

Nächster Schritt: vorhandene Gruppen und Produktreferenzen als befüllbare Excel-Datei exportieren, damit IDs/Revisionen nicht abgetippt werden müssen. Dieser Import verwendet bereits gespeicherte Produkte; keine automatische Größen-/Kundenfeldumrechnung. Kein Publish/Deploy, Merge, PR oder Zugriff auf private Bestände; separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Größen-/Materialausführungen verbinden – 06.10.2026

Branch `task/form-variants-20261006`, Basis `67205fa26b8b48fa02f5a0e3959a3f1dcddc91ed`. Backend verbindet vorbereitete freie Formprodukte zu einer gemeinsamen Kundenauswahl mit Standardausführung. Jede Größe/Materialkombination verweist ausdrücklich auf ihre Produktrevision mit passender Kontur, Bohrungen, Preis und Designs. Historie, Konflikte und Archivierung geprüft; alte Gruppenlinks übernehmen spätere Preise nicht still. **254 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browserprüfung Desktop/Handy/Tablet einschließlich Kundenwechsel und Konflikt.** [Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-AUSFUEHRUNGEN.md).

Nächster Schritt: Excel-Kindtabelle an diese geprüfte Ausführungszuordnung anschließen (noch offen). Keine automatische Größen-/Kundenfeldumrechnung. Kein Publish/Deploy, Merge, PR oder Zugriff auf private Bestände; separate Acryl-Testseite unverändert. Nachfolgende Abschnitte dokumentieren historische Pakete.

## Aktuell: Mehrere Designs je Formprodukt per Excel – 06.10.2026

Branch `task/batch-design-sheet-20261006`, Basis `d24d8297d8a751f7961d6b4c989b092783dca3a1`. Optionales Blatt **Designs** verbindet mehrere SVG/PDF-Seiten mit einer Produktzeile, ergänzt/ersetzt gezielte Designs und wählt ein Standarddesign. Bis 30 Designs pro Formprodukt; unberührte Kundenfelder/Rechte bleiben erhalten. Fehler blockieren das betroffene Produkt; Wiederholung und Updates bleiben revisionsgeschützt. **249 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Echte XLSX mit SVG und zwei PDF-Seiten, Desktop/Handy/Tablet und Kunden-Designwechsel geprüft.** [Bedienung, Aufnahmen und Nachweis](docs/dashboard-20261004/DASHBOARD-DESIGNTABELLE.md).

Nächster Schritt: separate Varianten-Kindtabelle mit expliziten Material-/Maßkombinationen und passender Designzuordnung. Keine automatische Variantenanlage durch diese Designzeilen. Kein Publish/Deploy, Merge oder Zugriff auf private Bestände; bestehende separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Vorhandene Produkte per Excel/CSV aktualisieren – 06.10.2026

Branch `task/batch-update-20261006`, Basis `5dc75f9e84db992e139cfc17ce43527601e07ea3`. Serienimport unterstützt ausdrücklich `action=update` mit Produkt-ID und erwartetem Stand. Leere Felder behalten Bestand; eigene Geometrie/Designrechte bleiben erhalten, kein Master wird neu darüberkopiert. Neue Revision unter gleicher ID; Wiederholung und zwischenzeitliche Bearbeitung gegen Überschreiben geschützt. **245 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte 22-Spalten-XLSX in Desktop/Handy/Tablet geprüft.** [Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-TABELLENAKTUALISIERUNG.md).

Nächster Schritt: offene Varianten-/Designzuordnung aus separaten Tabellen mit dem bestehenden Modell abgleichen. Kein Publish/Deploy, Merge oder Zugriff auf private Bestandsdaten. Folgende Abschnitte sind historische Paketnachweise.

## Aktuell: Materialgerechte Gravur für Edelstahl, Holz und Leder – 06.10.2026

Branch `task/material-engraving-preview-20261006`, Basis `725a7c62b9be6536f9bdd2cd502547424228e867`. Vorhandene fünf Materialreferenzen erneut angesehen; Gravur wirkt auf Edelstahl dunkel/neutral, auf Eiche/Buche/Kirsche/Leder dunkelbraun, abgestuft nach Quellhelligkeit/Alpha. Druck bewahrt Originalfarben. Backend, Produktkarten, Kundenbearbeitung und unveränderliche Ausgaben geprüft. **241 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browser Desktop/Handy/Tablet.** [Vergleichsbild und Nachweis](docs/dashboard-20261004/DASHBOARD-MATERIALGRAVUR.md).

Nächster Schritt: verbliebene Dashboard-Import-/Variantenabläufe mit dem dokumentierten Soll abgleichen. Schiefer-Rohlingreferenz, reale Maschinenprobe und echte Shopify-Teststrecke bleiben separat offen. Keine Veröffentlichung oder Änderung privater Bestände. Die folgenden Abschnitte sind historische Paketnachweise.

## Aktuell: Helle Acrylgravur statt Druckfarben – 06.10.2026

Branch `task/acrylic-engraving-preview-20261006`, Basis `150aa8ea5344f8577686b1ffdff5d40b8e77851f`. Gemeinsame Materialvorschau zeigt bei Gravur helle Acrylwirkung entsprechend Quellhelligkeit/Alpha; Druck behält Originalfarben. Weiße und transparente Quellbereiche bleiben ohne Gravur, Fotoabstufungen erhalten. Backend-/Kundenansicht einschließlich direkter Texteingabe geprüft; Originale und technische Ausgabe unverändert. **239 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** [Vergleichsbilder, Tonwertprüfung und Grenzen](docs/dashboard-20261004/DASHBOARD-ACRYLGRAVUR-VORSCHAU.md).

Historischer nächster Schritt: weitere Materialgravuren; im Paket oben abgeglichen. Reale Laser-/RIP-Probe und echte Shopify-Teststrecke bleiben offen. Kein Publish/Deploy oder Merge; bisherige separate Testseite nicht aktualisiert. Nachfolgende Pakete sind historische Nachweise.

## Aktuell: Matte UV-Aufdruckansicht und glänzender Hinterdruck – 06.10.2026

Branch `task/uv-print-surface-20261006`, Basis `0a0a7bf3d018ed00e687227724bf57810181298a`. Im Formprodukt-Backend ist die Druckansicht wählbar: vorne matt mit dezenten Druckpunkten oder hinter klarem Acryl mit Glasreflexion. Speichern/Neuladen und Kundenansicht geprüft. Vorhandene Produktstände bleiben erhalten; reine Vorschauwahl ohne Änderung von Druckparametern oder Spiegelung. **237 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browser Desktop/Handy/Tablet.** [Bilder und Nachweis](docs/dashboard-20261004/DASHBOARD-UV-DRUCKANSICHT.md).

Die Fragen zu Matt/Hochglanz und „UV-Markern“ sind geklärt. Historischer nächster Schritt: Acrylgravurvorschau; im Paket vom 06.10.2026 oben umgesetzt. Keine Veröffentlichung, kein Eingriff in private Bestände. Frühere Paketabschnitte darunter sind historische Nachweise.

## Aktuell: Formserien und vollflächiger Farbdruck – 05.10.2026

Branch `task/form-batch-20261005`, Basis `fdbb5be293a0517767d2f0f20a56b6b2b0281620`. Freie Formmaster jetzt im bestehenden Excel-/CSV-Serienimport: Material, Stärke, Verfahren, Szene, genaue Kontur und Kundenrechte vererben; Grundpreis und SVG/PDF-Design je Zeile zuordnen. Prüfen, partielle Anlage und Wiederaufnahme ohne Duplikate; direkte Formeditorlinks und mobile Ergebniskarten. **235 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Excel-/Browserprüfung Desktop/Handy/Tablet.** Vollflächige Farb-PDF mit Weiß, Bohrung und optionalem Außenrandüberdruck zusätzlich geprüft. [Ergebnis und farbiges Prüfbeispiel](docs/dashboard-20261004/DASHBOARD-FORMSERIEN.md).

Historischer nächster Schritt; am 06.10.2026 beantwortet und umgesetzt: matte Vorderdruckansicht mit feinen UV-Druckpunkten, glänzender Hinterdruck durch klares Acryl. Keine Veröffentlichung oder Maschinenfreigabe. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Acrylmaterialien und Szenen für Formprodukte – 05.10.2026

Branch `task/form-material-scenes-20261005`, Basis `a407c4114f3914d26f3a58baa8de4628a96161b0`. Klares/satiniertes/anthrazitfarbenes/schwarzes Acryl als dokumentierte 2D-Näherung; persistente Backend-Szenenauswahl und Kante aus tatsächlicher Produktstärke. Dieselbe Ansicht in Backend, Kunde, Vollbild, Produktkarte und Prüfstand. Produktübersicht lädt wieder (veraltetes Symbolziel korrigiert); Navigation ohne Seitenüberlauf. Geometrie/Bohrungen unverändert; Szene und Material bleiben aus der Druckdatei. **231 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Handy/Tablet und Transparenzpixel geprüft.** [Ergebnis, Materialherkunft, Aufnahmen und Grenzen](docs/dashboard-20261004/DASHBOARD-MATERIAL-SZENEN.md).

Keine Maschinen-/Livefreigabe; keine Veröffentlichung. Schiefer-Rohling und echte freigegebene Produktszenen für freie Formen bleiben offen. Nächster unabhängiger Schritt: weitere Material-/Form- und Stapelabläufe im Dashboard. Die folgenden Abschnitte dokumentieren frühere Arbeitspakete.

## Aktuell: Eigene Texte und Motive in Formprodukten – 05.10.2026

Branch `task/form-added-elements-20261005`, Basis `5dd07c49da473c309281d6203e600ecca9577f4d` (Produktcode `0265ed5ad83c05fd3d7569ccb522b75e8b464e94`). Kunden ergänzen eigene Texte und Motive aus der vorhandenen Bibliothek; freie Platzsuche, Farben/Drehung, direkte Bearbeitung, Löschen/Rückgängig und revisionsgeschütztes Speichern. Backend-Freigaben je Design, unveränderliche Prüfstände und PDF-/Vorlagenübernahme angeschlossen. **229 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Desktop/Mobil/Tablet und Touch geprüft.** [Ergebnis, Aufnahmen und Grenzen](docs/dashboard-20261004/DASHBOARD-EIGENE-ELEMENTE.md).

Bestehender Chat laut Nutzer wieder erreichbar; Sicherung und ausführliche Übergabe bleiben erhalten. Keine neue Umgebung oder Veröffentlichung. Nächste unabhängige Arbeit: verbleibende Material-/Szenendarstellung. Echte Shopify-Teststrecke und Maschinenabnahme bleiben offen; angefragte Store-Adresse laut Nutzer bereits in anderem Chat, hier nicht lesbar. Folgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: Projektzusammenfassung und vorsorgliche Sicherung – 05.10.2026

Nach einer vom Nutzer gemeldeten Chat-/Linkstörung ist der bestehende Chat laut dessen Rückmeldung wieder da. Wir arbeiten hier weiter; kein neuer Chat oder neue Cloud-Umgebung angelegt. [Detaillierte Projektübergabe mit allen Entscheidungen, offenen Punkten und Startanleitung](docs/chat-recovery-20261005/MIKAIL-PROJEKTUEBERGABE.md), [Sicherungsübersicht](docs/chat-recovery-20261005/README-ZUERST.md). Dokumentbranch `docs/chat-recovery-mika-20261005`, Produktbasis `0265ed5ad83c05fd3d7569ccb522b75e8b464e94` auf `task/form-direct-edit-20261005`, per Git frisch bestätigt. Keine Produktänderung und kein neuer Testlauf; letzter dokumentierter Nachweis bleibt 226/0/0, Build 76/1. Private Datenbanken/Browserentwürfe sind nicht Bestandteil der Quellcodesicherung. Die angefragte Shopify-Adresse wurde laut Nutzer bereits in einem anderen Chat angegeben; der genaue Wert ist hier nicht verfügbar. Nachfolgend frühere Paketabschlüsse.

## Aktueller gesicherter Arbeitsstand – 05.10.2026

Branch `task/form-direct-edit-20261005`, GitHub-Basis `2c932f013332f827ec7471aab1b8bbb42186ae6a`. Direkte Text-/Fotobearbeitung für Formprodukte mit großer Gesamtvorschau, ganzen Schrift-mm, Farbpunkten, Auswahlgriffen, expliziter Löschfreigabe, Abbrechen und Touch. Edelstahl erhalten; Eiche/Buche/Kirsche/Leder als separat abgeleitete leere Materialvorschauen ergänzt. **Cloud-Check: 226 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Desktop/Mobil/Tablet und echte Touch-Eingaben geprüft.** [Bedienung, Bilder, Prüfungen und Restumfang](docs/dashboard-20261004/DASHBOARD-DIREKTBEARBEITUNG-ABSCHLUSS.md).

Der Branch enthält die bisherige Verwaltung, Ausgabe- und synthetische Testbestellstrecke einschließlich Produktentwurf aus Bestellgestaltung. **Keine Live-/Maschinenfreigabe:** Echter Shopify-Checkout/Kundenkonto benötigt bestätigten Entwicklungsstore und sichere App-Anbindung; danach reale RIP-/Maschinenprobe. Weitere Formprodukt-Motive, Materialansichten/Szenen und vollständige UV-Originale bleiben im verlinkten Restumfang ausdrücklich offen. Keine neue Serverplanung, keine Veröffentlichung, keine privaten Daten in Git. Nächste nötige Nutzerangabe für den echten Shoptest: ausschließlich dessen `…myshopify.com`-Adresse. Die folgenden Abschnitte sind historische Pakete.

## Aktuell: Produktentwurf aus Bestellgestaltung – 05.10.2026

Branch `task/order-product-drafts-20261005`, GitHub-Basis `7786a685bb8d4e876805a5196f88280abdca601c`. In Testbestellungen lässt sich eine gesicherte Formprodukt-Gestaltung nach Vorschau als eigener Produktentwurf übernehmen: Layout, Farben, Schriftgrößen, Feldrechte und entfernte Felder bleiben erhalten. Beispieltexte wahlweise aus der Vorlage oder ausdrücklich aus der Gestaltung; Kundenfotos werden zu austauschbaren Fotobereichen. Originalprodukt und Bestellung bleiben unverändert; wiederholtes Anlegen erzeugt kein Duplikat. **222 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browser Desktop/Mobil/Tablet einschließlich Neuladen und Öffnen des Produkteditors.** [Nachweis und Aufnahmen](docs/dashboard-20261004/DASHBOARD-PRODUKT-AUS-BESTELLUNG.md).

Geprüft mit synthetischen signierten Testpositionen, keine echte Shopify-Bestellung. Neuer Entwurf bleibt privat und ohne Shop-Verknüpfung. Weitere Materialdarstellung und Acryl-Parität sind unabhängig weiterzuführen; tatsächlicher Shopify-Test wartet auf die bestätigte Store-Anbindung. Maschinen: Roland mit VersaWorks bestätigt, genauer Mimaki-RIP weiterhin offen. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Warenkorb-Übergabe im Backend – 05.10.2026

Branch `task/checkout-handoff-20261005`, GitHub-Basis `0785d0fe7bfe2f6266996382b09220139ddfd642`. Gesicherte Formprodukt-Gestaltungen können jetzt ohne Shell einer Shop-Variante zugeordnet und für den Test-Warenkorb vorbereitet werden. Feste Revision, Preis und Menge; private Gestaltung bleibt außerhalb des Warenkorbs. **219 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browser Desktop/Mobil/Tablet einschließlich Neuladen und nachfolgender Produktänderung.** [Nachweis und Aufnahme](docs/dashboard-20261004/DASHBOARD-WARENKORB-UEBERGABE.md).

**Nutzerbestätigung:** Roland LEF-200 und MO-240 mit VersaWorks. Für Mimaki 2513 EX sagte der Nutzer „die von Mimaki“; genauer Name und Version bleiben offen. RasterLink ist nicht als bestätigt eingetragen. Auswahlhilfe ohne Änderung vorhandener Profilstände.

Die Übergabe wurde lokal vorbereitet und ihr GraphQL-Schema geprüft; kein Warenkorb an einen Shop gesendet. Für die echte Teststrecke fehlen bestätigter Entwicklungsstore und dessen Anbindung. Nächster externer Schritt: nur dessen `…myshopify.com`-Adresse nennen; keine Zugangsdaten im Chat. Kundenkonto-Kaufberechtigung und Maschinenabnahme bleiben offen. Frühere Abschnitte sind historische Pakete.

## Aktuell: Signierte Testbestellungen – 05.10.2026

Branch `task/order-intake-20261005`, GitHub-Basis `a06d821bd5389016d92d0ff0087c7f066c4f864a`. Neue Backend-Ansicht für unveränderliche Testpositionen mit festem Formprodukt-, Preis- und Prüfstand. Empfang prüft die Signatur der Originalnachricht, Shop, Variante, Menge und serverseitigen Preis; mehrfache Zustellung dupliziert keine Position. **215 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browserprüfung Desktop/Mobil/Tablet inklusive Produktänderung und PDF-Download.** [Nachweis und Grenzen](docs/dashboard-20261004/DASHBOARD-TESTBESTELLUNGEN.md).

**Nur synthetische, signierte Testnachrichten geprüft; keine echte Shopify-Testbestellung.** Empfang standardmäßig deaktiviert, Live-Bestellungen gesperrt. Keine Kundenkonto-Downloadberechtigung oder Maschinenfreigabe. Nächster Schritt: Entwicklungsstore zuordnen und den tatsächlichen Test-Checkout anbinden; weitere unabhängige Dashboard-Arbeiten bleiben möglich. Store-Adresse und RIP-Namen sind angefragt, keine Zugangsdaten. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Shop-Vorbereitung und Umfangsabgleich – 05.10.2026

Branch `task/dashboard-readiness-20261005`, GitHub-Basis `82db3b5798ae9b27443e041f94c4517fd3b2f0a7`. Werkstatt → Shop vorbereiten zeigt feste Produktstände, Designs, SEO und Ausführungen mit bestehenden Preisregeln (28 Acrylkombinationen). JSON-Übergabe ohne Übertragung an Shopify. Formprodukte: Seitentitel/Kurzbeschreibung speichern; historische Preise bleiben unverändert. **211 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet einschließlich nachfolgender SEO-Bedienprüfung.** [Ergebnis und ehrlicher Umfangsabgleich](docs/dashboard-20261004/DASHBOARD-SHOPVORBEREITUNG.md).

**Nächster Schritt:** authentifizierte Bestellübernahme und unveränderliche Positionen vorbereiten. Echte Shopify-Testbestellung, Kaufberechtigung im Kundenkonto und Maschinenabnahme sind noch offen. Weitere Materialableitungen/UV-Originale stehen separat im Abgleich; das Gesamtprojekt ist nicht als vollständig abgenommen bezeichnet. Kein externer Dashboard-Publish, kein Live-Systemzugriff. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Technische Gravurausgabe – 05.10.2026

Branch `task/form-engraving-20261005`, GitHub-Basis `6a23acc56a7f98f629107dd4f8769a901a2af164`. Gesicherte Formprodukte: Graustufenraster aus Originalfotos oder echte Vektorformen/Schriftpfade, ohne Druckweiß. Standard PDF/300 dpi, Kontur separat im optionalen ZIP; einmalige Spiegelung, Profilvorgaben und persistente Ausgabeaufträge. Rasterbilder werden im Vektormodus ausdrücklich abgelehnt. **208 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browserablauf Desktop/Mobil/Tablet mit PDF-/ZIP-Download.** [Ergebnis und Grenzen](docs/dashboard-20261004/DASHBOARD-GRAVURPRUEFUNG.md).

**Nächster Schritt:** verbleibende Dashboard-, Kunden- und Bestellabläufe abgleichen und fortsetzen. Reale RIP-/ICC-/Material-/Maschinenabnahme fehlt; keine Produktionsfreigabe. Die drei genannten Druckmaschinen ersetzen kein Gravurmaschinenprofil. Kein externer Dashboard-Publish; Acrylmuster unverändert. Nachfolgende Abschnitte dokumentieren frühere Pakete.

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

## 05.10.2026 – Dashboard M01 umgesetzt

Nutzerbestätigter Folgeauftrag „Dashboard“. Branch `task/dashboard-product-cards-20261005`, Basis `775557fef6933509d095b9e2756a5f799a7fd670`. Produktkarten mit revisionsbezogenen Vorschauen, Suche/Verfahrens-/Archivfilter, Masterübersicht und Kopie aus Master; vorhandener Editor und Schutz ungespeicherter Eingaben weiterverwendet. Muster Acrylglasbild unverändert separat erreichbar.

174 Tests/0 Fehler/0 Skips, danach 2 HTTP-Tests erfolgreich; Build 76 Ressourcen/1 Modell. Desktop/Mobil mit synthetischen Daten tatsächlich geprüft. [Bilder, Umfang und Grenzen](docs/dashboard-20261004/DASHBOARD-M01.md). Kein zusätzlicher gehosteter Dashboard-Link; aktuelle Bedienprüfung im Cloud-Entwicklungsserver. Nächster Schritt: M02-Produktbearbeitung.

## 05.10.2026 – Muster Acrylglasbild gesichert

Bestehende private Site in „Muster Acrylglasbild“ umbenannt; Direktzugriff im START_HERE und [Musterregister](docs/dashboard-20261004/MUSTER-ACRYLGLASBILD.md). Native Version 12 samt Archiv und Produktcommit `f4c9a2068f7d159def5f88f2a841bf01c1a59bd8` tatsächlich geprüft. Keine neuen Tests/Builds oder Änderungen am Konfigurator. Folgeauftrag „mit dem anderen“: Rückfrage Dashboard/Werkstatt oder weitere UV-Designs gestellt; noch keine Zuordnung behauptet.

## Aktuell: neutrale Oberfläche, Motivfarben und gezieltes Löschen

Aufgabenbranch `task/unlock-design-elements-20261005`, Basis `3d09c9428f1637db6ece5052af8efd471f473397`. Weiß/Grau/Graphit im Konfigurator; Motiv direkt mit sechs runden Farbvorgaben, freier Farbe, Größenänderung und Drehung bearbeiten. Vorlagenelemente nach Backend-Freigabe bewusst zum Löschen entsperren, Original und Rückgängig erhalten. Weiße Seitenflächen schließen die Vollbildvorschau.

173 Quelltests bestanden, 0 Fehler/Skips; danach 21 gezielte Tests bestanden. Build 76 Ressourcen/1 Modell. Desktop-/Mobil-Bedienprüfung mit synthetischem Stand erfolgreich. Details und Grenzen: `docs/dashboard-20261004/CMYK-DIREKTBEARBEITUNG.md`. Nur private Testseite aktualisiert, keine private Datenbank oder Live-Shopänderung. Nächster Schritt: Nutzerprüfung der neuen Bedienung; Bestellung → neuer Produktentwurf bleibt separat offen.

## 05.10.2026 – Foto-/Textwerkzeuge und kompakte Motivwahl

Branch `task/full-preview-base-20261005`, Weiterführung nach Sockel-/Rahmenkorrektur `8f507ddd66aedf19cf8ff9466f2a6388e37a680c`. Bearbeiten vor Ersetzen; Fotozuschnitt und Original/Graustufen/Sepia; direkte Schriftwahl, Fett und Kursiv; Motive in tatsächlich freie Flächen, kompaktere Übersicht (6 Desktop/4 Mobil). Außenklick schließt Vollbild, weißer Innenbereich nicht. 172 Gesamttests erfolgreich, finale gezielte Tests erfolgreich, Build 76/1, Desktop-/Mobil-Browserprüfung ohne Seitenfehler. Grenzen/Details in docs/dashboard-20261004/CMYK-DIREKTBEARBEITUNG.md. Nächster Schritt: Nutzerprüfung der aktualisierten privaten Testseite.

## 05.10.2026 – Sockel im Vollbild und sichtbarer Vorschauhinweis

Branch `task/full-preview-base-20261005`, Basis `d127b5a9ee6f52f3aad69ae5061e8d48d5f7edf0`. Vollbild streckt die Acrylszene nicht mehr; vorhandene Sockelposition/7-mm-Regel bleibt erhalten. Oberer Hinweisrahmen jetzt als sichtbare Ebene nach jeder Inhaltsänderung für 1,6 Sekunden statt nur dreimal. Desktop-/Mobil-Browserprüfung mit Nussbaumsockel und je fünf Textänderungen bestanden, keine Seitenfehler; Build 76/1. Details: docs/dashboard-20261004/CMYK-DIREKTBEARBEITUNG.md. Nächster Schritt: Nutzer prüft dieselben Aktionen auf der aktualisierten privaten Testseite.

## 04.10.2026 – Vollständige Vorschau und ganze Schrift-mm

Aufgabenbranch `task/cmyk-300dpi-20261004`, Basis `8a4da028feb1f5df49b3c0e9686e994f04361b73`. Große obere linke Mobilvorschau mit kompletter Acrylszene, proportional/bündig; kurzer Hinweisrahmen nur bei ersten Änderungen. Ganzzahlige Kundenschriftgröße (8,7 → 9 mm), keine Änderung des Plattenformats. 16 gezielte Tests / 0 Fehler / 0 Skips, Build 76/1; mobile Browserprüfung einschließlich kompakter Textbearbeitung erfolgreich. Details und historische CMYK-Prüfung: docs/dashboard-20261004/CMYK-DIREKTBEARBEITUNG.md. Nächster Schritt: Nutzerprüfung auf bestehender privater Testseite. Kein neuer RIP-/Corel-Nachweis.

## Aktuell: CMYK / 300 dpi und kompakte Direktbearbeitung (04.10.2026)

Standard-PDF: echtes DeviceCMYK / 300 dpi, optional 600 dpi mit Feinheits-Hinweis. Kompakte Textleiste statt großem Formular. Masterbegriffe Motiv/Design in AGENTS.md festgehalten. 169 Tests bestanden, Build 76/1; tatsächliche CMYK-Downloads und Desktop-/Mobilbedienung geprüft. Keine druckerspezifische ICC-Konvertierung. [Nachweis](docs/dashboard-20261004/CMYK-DIREKTBEARBEITUNG.md).

## Aktuell: Direktbearbeitung und ruhiger Foto-Upload (04.10.2026)

Text am Auswahlrahmen live bearbeiten, Fotoeditor per Doppelklick, kein Upload-Scrollsprung; Download bleibt auf derselben privaten Testseite. Build 76/1, 167 Tests bestanden, danach 18 gezielte Tests sowie Desktop-/Mobil-/PDF-Browserprüfung bestanden. Details: [DIREKTBEARBEITUNG.md](docs/dashboard-20261004/DIREKTBEARBEITUNG.md).

## Aktuell: Master-Bedienregeln und Weißkanalprüfung – 04.10.2026

Druck ohne Überlagerungswarnungen, Gravur weiterhin mit Hinweisen. Erstfokus markiert den gesamten Text. Ein-Design-Ausblendung bestätigt; zwei bestehende Designs erhalten. Kunden-Testansicht ohne Druckdownload; separater privater Werkstatt-Exporttest. Überdruck nur bei tatsächlichem Randdruck, Weißkanal-Vorschau und motivbezogene Weißvektoren ohne Seitenclip. 167 Tests, Build 76/1 und Browser-/PDF-Prüfung bestanden. Corel-Import und bezahlter Konto-Download nicht ausgeführt/angebunden. [Nachweis und nächste Prüfung](docs/dashboard-20261004/MASTER-BEDIENREGELN.md).

Präzisierung Weiß am 04.10.2026: Standard nur unter bedruckten Motivflächen; freies Acryl bleibt transparent. Ersetzt die vorherige Vollflächen-Voreinstellung. Vollfläche ist ausdrücklich als „Gesamte Platte weiß hinterlegen“ gekennzeichnet.

Exportvorgaben am 04.10.2026 angepasst: Nur PDF, Roland RDG_WHITE, Farbüberdruck 1 mm umlaufend, Weiß vollflächig innerhalb der Kontur, Weißüberdruck 0 mm. Frischer Browserstart geprüft; bestehende sechs Exporttests weiterhin bestanden.

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
