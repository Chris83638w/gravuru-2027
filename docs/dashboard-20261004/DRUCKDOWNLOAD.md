# Druckdownload – 04.10.2026

Basis: `7f6bd786ebf097ec8047d7d14ee9705d1ad7030a`, Aufgabenbranch `task/print-download-20261004`.

## Vereinbart und umgesetzt

Im Dashboard öffnet „Druckexport öffnen“ den gespeicherten, versionsgebundenen Produktstand im vorhandenen Konfigurator. Dort öffnet „Druckdateien herunterladen“ den Dialog. Bei ungespeicherten Dashboardänderungen ist der Exportlink verborgen. Normale Kundenansichten enthalten keinen Druckdownload; die bestehende owner-private Testseite darf ihn ausdrücklich als Bedienprüfung zeigen.

Voreinstellung beim Öffnen: **Nur PDF · CMYK · 300 dpi · Roland RDG_WHITE · bis 1 mm Farbüberdruck nur bei Randdruck · Weiß nur unter bedruckten Elementen · Weißüberdruck 0 mm**. Präzisierung: Unbedrucktes Acryl bleibt transparent. Motivbezogenes Weiß umfasst Foto, Text, festes Design und hinzugefügte sichtbare Elemente. Transparente Aussparungen bleiben frei; weiße Pixel im Foto sind Bildinhalt. Die tatsächliche neue Roland-PDF wurde mit isolierter Weißebene gerendert: freie Stellen unten transparent (Alpha 0), Foto unterlegt (Alpha 255). Die frühere Vollflächen-Vorgabe ist dadurch ersetzt. Die optionale Vollfläche ist jetzt ausdrücklich „Gesamte Platte weiß hinterlegen“ beschriftet. Die rückseitige Spiegelung bleibt durch das vorhandene Acrylprofil vorgegeben. Browserprüfung der fünf Auswahlwerte nach frischem Laden bestanden.

Standard **nur eine PDF**. Auswahl Roland (`RDG_WHITE`) oder Mimaki (geschlossene Vektorfüllung in eigener Ebene „Weissersatz Vektor“), jeweils mit eigener Ebene `CutContour`. Optional ZIP mit PDF, separater schwarzer Mimaki-Weißfüllung, eingebettetem Motiv-SVG, Gestaltungsdaten inklusive verwendeter Schriftpfade/-daten, Einstellungen und unveränderten hochgeladenen Originalfotos. Originalfoto zusätzlich separat im Dialog herunterladbar. Keine Fotodateien verlassen dafür den Browser.

Farbüberdruck 0/1 mm umlaufend; Weißunterlegung nach Motiv, vollflächig oder ohne Weiß. Weißüberdruck separat 0/1 mm, nicht größer als Farbüberdruck. 150 × 200 mm bleiben Schnittmaß und bei randfreiem Motiv auch PDF-Format; bei tatsächlichem Randdruck mit 1 mm Überdruck 152 × 202 mm PDF/MediaBox/BleedBox und 150 × 200 mm TrimBox. Rückseitige Spiegelung ist sichtbar auswählbar und für Acryl vorbelegt; danach nicht nochmals im RIP spiegeln. Kontur, Bohrungen und Masken werden mitgeführt. Untere 7 mm werden nicht aus der Druckdatei entfernt; Sockel und Bedienhilfen werden nicht gedruckt. Beispielfotos bleiben ausdrücklich als solche im Prüfdruck und in der ZIP-Metadatenliste, bis sie durch einen Upload ersetzt werden.

## Tatsächliche technische Grenzen

**Prüfexport, keine Produktionsfreigabe.** Farbausgabe in den PDFs: echtes vierkanaliges DeviceCMYK-Raster mit 300 dpi als Standard, 600 dpi optional. Generische Maximalschwarz-Separation aus Browser-RGB; kein druckerspezifisches ICC-Profil, keine garantierte Farbtreue oder Erhöhung der Quellbilddetails. Texte werden vor dem Rendern aus vorhandenen Schriftpfaden erzeugt; editierbare Vektorpfade und eingebettete Quellbilder liegen zusätzlich im optionalen SVG, nicht als Farbvektoren in der PDF. Kontur und Weißfüllung sind PDF-Vektoren. Motivbezogenes Weiß entsteht aus der binären Deckkraftmaske in der gewählten Ausgabeauflösung (Schwelle 128) als zusammengefasste geschlossene Rechtecke, geometrisch auf die freigegebene Weißfläche begrenzt und ohne zusätzliche seitenfüllende Weiß-Schnittmaske; keine verlustfreie Vektorisierung behaupten. Keine automatische Erfindung fehlender Bildränder: Überdruck setzt vorhandene äußere Randpixel fort, ohne das Innenmotiv zu skalieren. Rechteck/abgerundetes Rechteck und Ellipse unterstützt; andere Konturtypen werden abgewiesen.

Mimakis kombinierte PDF enthält CMYK-weiße Vektorfüllungen unter dem Farbmotiv. Die Ebene muss im tatsächlichen RIP Weiß zugeordnet werden; normales CMYK-Weiß erzeugt allein keinen Weißdruck. Das optionale ZIP enthält dieselben Flächen separat schwarz. Alle Dateien ohne Beschneiden anhand derselben Seitenmaße registrieren. Die funktionierende Mimaki-Vorlage/RIP-Zuordnung, Weißdichte, Layerreihenfolge, Überdrucksimulation, Farbprofil und echter Probedruck sind weiterhin ungeprüft. Die vorhandene Roland-Referenz enthält echte `RDG_WHITE`-/`CutContour`-Separationen, belegt aber keinen bereits erfolgten Druck dieses neuen Exports.

## Historische Prüfung des ursprünglichen Pakets

- `node --test --test-isolation=none app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs`: 165 bestanden, 0 Fehler, 0 Skips (sechs zusätzliche Exporttests).
- `npm run build`: 76 Ressourcen, 1 Modell.
- PDF-Dateien mit PyMuPDF tatsächlich geöffnet, gerendert und auf Seitenzahl, Maße, TrimBox, Separationen, Ebenen, geschlossene Weißvektoren und Farbpositionen geprüft. PyMuPDF kann identische Füll-/Konturpfade in seiner Zeichenliste zusammenfassen; daher zusätzlich tatsächliche PDF-Maloperatoren geprüft.
- Chromium: Einstieg vom Dashboard, Standard-Einzel-PDF, beide Druckprofile, ZIP und separater Originalfoto-Download erfolgreich. Originalfoto byteidentisch, Gestaltung unverändert, keine Seitenfehler. Beispielfoto sichtbar ohne Uploadhinweis; bei Upload ersetzt. Normaler Kundenmodus ohne Exportbutton.
- Synthetisches randfüllendes Motiv: alle vier Überdruckränder gedeckt, Spiegelung tatsächlich geprüft. Dialog auf Desktop und 390-Pixel-Mobilansicht bedienbar.
- Bestehende private Datenbanken unverändert. Isolierter In-Memory-Werkstattstand und autorisiertes Designbeispiel verwendet. Keine Shopify-/Plesk-/Produktionsänderung.

Nächster Schritt: Downloads auf der vorhandenen privaten Testseite durch Mikail prüfen; vor Druckfreigabe tatsächliche Roland-/Mimaki-RIP-Abnahme mit funktionierender Mimaki-Vorlage. Der statische Test speichert keine Dashboarddaten dauerhaft.

Aktuelle Master-Bedienregeln, randabhängiger Überdruck, temporärer Download auf derselben privaten Haupt-Testseite und Corel-Grenze: [MASTER-BEDIENREGELN.md](MASTER-BEDIENREGELN.md).

Aktualisierung CMYK/300 dpi und kompakte Direktbearbeitung: [CMYK-DIREKTBEARBEITUNG.md](CMYK-DIREKTBEARBEITUNG.md).
