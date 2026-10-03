# Gravuru 2027 – belegtes Entscheidungsregister

Stand: 03.10.2026. 34 dokumentierte Anforderungen mit Herkunft und offenen Grenzen. Die Originalbilder wurden visuell geprüft und unverändert im privaten Repository gesichert. Das Register ist kein Nachweis, dass alle Anforderungen bereits umgesetzt sind.

Alle 11 Bilder liegen in [SCREENSHOT-REFERENZEN-20261003.zip](../../SCREENSHOT-REFERENZEN-20261003.zip), jeweils unter `screenshots/<Dateiname>`. [SHA-256-Manifest](SCREENSHOT-MANIFEST.json) und [Archivnachweis](SCREENSHOT-ARCHIV.json). Git-Blob und Größe des online gespeicherten Archivs wurden gegen die lokalen Originalbytes geprüft. Zum Ansehen in einen neuen, leeren Ordner entpacken; keine bestehenden Bilder überschreiben.

## Quellen und Statusbegriffe

- **P**: [NEUE-WERKSTATT-PLAN.md](../../NEUE-WERKSTATT-PLAN.md), Stand 30.09.2026; SHA-256 `05fa468832744b16b8f96303da3b7cbd95177b3f5c50f6cb180cf28e93d22efd`. Zeilenangaben beziehen sich auf diese gelesene Fassung.
- **S**: [START_HERE.md](../../START_HERE.md), gelesene lokale historische Fassung vom 02.10.2026; SHA-256 `d1919c50e4cf5fdabc550bd61278b94c1b08994a0bc923bdd0828331fa2319cf`. Die Cloudfassung wurde inzwischen geändert; dieser Hash bezeichnet ausdrücklich die damalige lokale Quelle.
- **A**: [AGENTS.md](../../AGENTS.md), gelesene Arbeitsregeln.
- **N**: [ABSCHLUSSPRUEFUNG-ORIGINAL.txt](ABSCHLUSSPRUEFUNG-ORIGINAL.txt), aktueller Nachprüfauftrag, insbesondere Abschnitte 6, 9 und 10.
- **C**: im Hauptchat direkt belegte Screenshot-/Anforderungszuordnungen, am 03.10.2026 vom koordinierenden Agenten übergeben; C01–C04 unten. Kein erneuter vollständiger Chatabruf durch diesen Teilagenten.

**B – im bestehenden Plan ausdrücklich bestätigt:** Sekundärbeleg aus der Projektdokumentation; der ursprüngliche vollständige Chat wurde in diesem Paket nicht nachgelesen. **R – dokumentierte Anforderung:** verbindlicher Sollstand laut Plan, ohne gesonderten Originalchat-Nachweis. **V – Vorschlag:** keine bestätigte Auswahl. **H – historischer Befund:** kein automatisch fortbestehender Fehler. **U – ungeklärt:** Beleg oder Freigabe fehlt. Für sämtliche folgenden Zeilen gilt: Implementierung und aktuelle Abnahme wurden in diesem Dokumentationspaket nicht geprüft.

## Entscheidungen mit überprüfbarem Sollverhalten

| ID | Status | Vorgabe und Geltungsbereich | Herkunft / Bild | Abnahmekriterium und offene Grenze |
| --- | --- | --- | --- | --- |
| E01 | B | Eigenständiges Projekt Gravuru 2027; hochwertige 2D-Vorschau, AR auf später verschoben. | P Einleitung; S maßgeblicher Projektstand | Regulärer Ablauf benötigt kein AR. Raumfoto-Montage bleibt separate, nicht gebaute Option. |
| E02 | B | Produktübersicht Variante 2: große fotografische Karten, Suche nach Name/ID, Zugang zu Master/Stapelverwaltung. | P 108–116; Bild M01 | Gegen ausgewählte Referenz prüfen; Mockup-Produkte/-texte sind Beispieldaten. |
| E03 | B | Produktbearbeitung Variante 2: links Bereiche/Elemente, mittig große Vorschau, rechts Einstellungen des gewählten Elements. | P 108–116; M02 | Elementwahl steuert passende Einstellungen. Keine allein aus dem Desktopentwurf erfundene Mobilanordnung. |
| E04 | V/U | Drei Stapelentwürfe; keine einzelne Variante ausdrücklich ausgewählt. Tabelle, Galerie und Detailansicht sind ergänzender Vorschlag. | P 114–116; M03–M05 | Endgültige Ansichtsauswahl offen; nicht als bestätigtes Layout umsetzen/abnehmen. |
| E05 | B | Designs-Reiter bei fehlender Auswahl ausblenden; Kategorien/Kollektionen/Filter nur ausdrücklich aktiviert; Designs untereinander. | P 176–187; C01 direkt zu Designreiter/Filter-Opt-in zugeordnet | Fälle 0/1/mehrere Designs prüfen. Bei genau einer Vorlage keine unnötige Auswahl; bei 0 Design keine Aktivierung als gestaltbares Produkt (P Ablaufprüfungen). |
| E06 | R | Erst Form, Größe und Befestigung, dann freigegebene Designs. Größe beim Designwechsel erhalten. 20–30 Designs brauchen keine 20–30 Shopify-Produkte. | P 150–152 | Wechsel erhält Größe und zeigt nur kompatible Designs; Gesamtzahl/Kompatibilität praktisch prüfen. |
| E07 | B | Vorbereitung von Druckdateien ausschließlich im Backend. | P 179; H01/H02 als frühere Fehlerbelege | Kundenansicht zeigt keine Produktionsaktion; Berechtigung auch außerhalb der UI prüfen. |
| E08 | B | Schriftgröße ausschließlich in mm anzeigen/bearbeiten; Dezimalwerte erhalten. | P 180; C02 zu mm zugeordnet | Eingabe z. B. 4,5 mm bleibt 4,5 mm. Schrittweite 0,1 mm ist Vorschlag, keine ausdrücklich bestätigte Pflicht. |
| E09 | B | Perfekt runde Farbbuttons; Beschriftung „Ausgewählte Farbe“. | P 181; C02 zu kreisrunden Farben zugeordnet | Sichtprüfung der Form und Beschriftung; kein bloßer Quelltextnachweis. |
| E10 | B | Kundenirrelevante Angaben wie Einstecktiefe ausblenden. | P 182; H01 | Kundenvorschau bleibt frei von Fertigungsdetails; technische Werte intern erhalten. |
| E11 | B | Mobil Texte durch Doppeltippen direkt bearbeiten. | P 183 | Echte Touch-Bedienung prüfen; konkreter Breakpoint und vollständige Mobile-Anordnung sind U. |
| E12 | B | Auswahlgriffe immer vor Sockel/Produkt; keine verdeckten Bedienelemente. | P 184; H01; C04 direkt zu vorderen Griffen zugeordnet | Untere Griffe auch bei Sockel, Hilfe und kleiner Ansicht bedienbar. |
| E13 | B | Zoom nur zeigen, wenn er nutzbar ist. | P 185; H01 | Sichtbares Bedienelement hat funktionierende Wirkung; Verdeckung/Bedienbarkeit prüfen. |
| E14 | B | Beispielbilder sichtbar halten; Uploadhinweis größer und höher; Fotofläche direkt anklickbar. | P 186; H01 | Fotos lassen sich verständlich ersetzen. Tastaturbedienbarer Foto-Button ist ergänzende dokumentierte Verbesserung (P Logikprüfung). |
| E15 | B | Feste Designmotive nicht verschiebbar; freigegebene Texte/Farben/Fotos bleiben veränderbar. | P 187 | Rechte je Element/Eigenschaft; Sperre darf erlaubte Inhaltsänderung nicht verhindern. |
| E16 | R | Texte semantisch benennen, z. B. Namen, Ort, Datum, statt anonymer „Zeile 1–5“. | P Logikprüfung; H02 | Beschriftungen aus Vorlagen; konkrete Feldliste produktabhängig. |
| E17 | R | Kundenwerte nur zwischen semantisch gleichen Feldern übertragen; keinen Ersatz-Fotoplatz automatisch wählen. | P Logikprüfung und 150 | Unpassendes Foto bleibt in Ablage, Zuordnung wird angeboten; kein stiller Verlust oder Umdeuten. S meldet bereits implementierte eindeutige Feldschlüssel, hier nicht erneut verifiziert. |
| E18 | R | Material, Form, Größe, Befestigung, Design und Profile getrennt wiederverwenden; stabile IDs/Revisionen erhalten. | P 120–128 | Zulässige Kombinationen explizit; Kopie erhält neue ID, Original/alte Version bleiben erhalten. |
| E19 | R | Kontur und Gestaltung sind unterschiedliche Upload-Rollen; PDF-Kontur maßhaltig 1:1, SVG mit eindeutiger physischer Größe. | P 132–146 | Außenform/Innenausschnitte, Einheiten, Rotation und Transformation prüfen; keine Seitenränder als Rohlingmaß. |
| E20 | R | Bohrdurchmesser und Randabstand bleiben bei Größenwechsel standardmäßig absolut. | P 140–146 | 120×80 mm, Ø4 mm, Abstand 8 mm: 2 Löcher (8,40)/(112,40); 4 Löcher zusätzlich Eckregel laut Plan. Keine doppelt importierten Löcher. |
| E21 | R | SVG/PDF ersetzt gewähltes Design in Vorschau; Text/Fotos/Motive sollen getrennt editierbar aufbereitet werden. | P 154; S aktueller Stand | Import beliebiger Kurven/Bilder erzeugt nicht automatisch Kundenfelder. S nennt derzeit feste Grafiken; Kundenfelder bleiben nächste Umsetzung. |
| E22 | R | KI-Bearbeitung im Backend mit Vorschau/Versionsvergleich, Originalerhalt und Auftrag je Produkt oder kompatibler Gruppe. | P 156–158 | Plugin ist keine eingebaute App-Funktion. Provider, Kosten und Qualitätsprüfung offen. |
| E23 | R | Profilpriorität: ausdrückliche Produktzuordnung vor Unterkategorie vor Default; Master liefert Ausgangsvorgabe. | P 162–164 | Schrift- und Motivprofile getrennt; bestehende Bestellungen behalten Revision. Endgültige Schriftliste/Rechte offen. |
| E24 | R | Transparenz eigener Editorbereich; Tönung/Farbe/Deckkraft je Bereich, Kundenfreigabe ausdrücklich. | P 166–168 | Schachbrett/Weißansicht; transparente Bereiche/Löcher ohne Farbe und Weiß. Weißdichte bei durchscheinender Tönung bleibt U. |
| E25 | R | Glaubwürdige Szene mit Materialstärke/Kante/Struktur/Licht; Form- und Größenwechsel geometrisch konsistent. | P 172–174 | Mit echten Rohlingen vergleichen. Szene, Sockel, Reflexe und Bediengriffe nie in Produktion exportieren. |
| E26 | R | Vorschau, Preis, Variantenprüfung und Fertigung verwenden denselben versionierten Produktstand; mm und ganze Cent. | P 93; A | Keine zweite Preis-/Geometrielogik; Backend bindet Auswahl verbindlich. |
| E27 | B | Acryl 3 mm: 150×200 mm = 14,99 EUR; 200×266,7 mm = 19,99 EUR; Rückseitendruck gespiegelt. | P 219–223 | Maße und Grundpreise prüfen; einmalige Spiegelung in Produktionsausgabe. |
| E28 | B | Kleine Sockel: Buche 8,99; Eiche 9,99; Nussbaum 10,99; klar flach 3,99; satiniert flach 4,99; Holz flach Nussbaumoptik 5,99 EUR. Großformat je Sockel +1,00 EUR. | P 221 | Jeder Sockel einzeln prüfen; ohne Sockel kein Sockelaufschlag. |
| E29 | B | Unsichtbare Wandhalterung zusätzlich 5,99 EUR in beiden Größen; Kunden wählen Sockel. Einstecktiefe massiv 7 mm, flach 5 mm. | P 221–223 | Zubehör additiv; flache Ständer 5 mm hoch, kleiner Überstand ungefähr 10 mm je Seite. Exakte reale Sockelabmessungen für endgültige Darstellung offen. |
| E30 | R | Excel/Stapel nutzt dieselben Modelle/Prüfungen; Ziel 100 Produkte, Zeilenfehler und Wiederaufnahme, keine Duplikate. | P 189–205 | Teilerfolge erhalten; Beispiel 97 gültig/3 Fehler. S meldet XLSX und Dreier-Testserie, keine Abnahme sämtlicher Zielvarianten. |
| E31 | R | Drive nur eigene autorisierte App-Anbindung, IDs statt Namen; Originale versioniert sichern; zunächst Import auf Nutzeraktion. | P 207–209 | Lokaler Excel-Pfad ist kein Cloud-Dateizugriff. Dauerhafter Ordnerwächter nicht beauftragt. |
| E32 | R | Shopify zunächst Entwürfe/Bindings; Veröffentlichung getrennt. Bestellungen samt Medien/Profilen/Preisen unveränderlich sichern. | P 213–217; N | Keine Livefreigabe. Wiederholungen dürfen keine Duplikate oder veränderte Altbestellungen erzeugen. |
| E33 | R/B | Verfahren getrennt: Schriftpfade, Originalfotos, präzise Konturen; Roland `CutContour` und `RDG_WHITE`, Rückseite genau einmal spiegeln. | P 215–217 | Druckprofil/CMYK/Weiß real prüfen; PNG nicht als CMYK-Master behaupten; Gravur erhält nicht automatisch Druck-Weiß. |
| E34 | R/U | Bestsellerlisten je Unterkategorie: Nutzerfrage hierzu ist konkret belegt; Plan nennt Bestseller im Motivprofil. | C03; P 164; Zusammenhang mit E23 | Screenshot-/Themenzuordnung geklärt. Genaue Antwort, konkrete Listenlogik, Reihenfolge und gesonderte Freigabe sind aus der übergebenen Frage allein nicht abzuleiten; Umsetzung nicht behaupten. |

## Bilder: Identität und Beweiswert

Die fünf folgenden Dateien wurden am 03.10.2026 visuell geprüft und als unveränderte PNGs im oben verlinkten, online verifizierten Archiv gesichert. Der Basisordner lautet `C:/Users/Mikail Erdem/.codex/generated_images/01a0ebde-0530-7131-be42-b0868343b18a/`.

| Bild-ID | Datei | Beweiswert laut Plan |
| --- | --- | --- |
| M01 | `screenshots/exec-43aadbc2-b8d7-4973-97c9-9876ef46062a.png` | Bestätigter Entwurf Produktübersicht Variante 2; kein Umsetzungsbeweis. |
| M02 | `screenshots/exec-7bcb71f5-9667-4985-b9d7-896d0aabd2e5.png` | Bestätigter Entwurf Produktbearbeitung Variante 2; kein Umsetzungsbeweis. |
| M03 | `screenshots/exec-cb1e2313-ad99-433d-8e46-3f3e51fbcfe5.png` | Stapelentwurf, keine endgültige Auswahl belegt. |
| M04 | `screenshots/exec-b94c5a76-b747-431e-9d1e-ffea67263912.png` | Stapelentwurf, keine endgültige Auswahl belegt. |
| M05 | `screenshots/exec-15c85c27-5049-4087-9461-460e9a9bc00d.png` | Stapelentwurf, keine endgültige Auswahl belegt. |
| H01 | `screenshots/01-kundenvorschau.png` | Historischer Fehler-/Prüfscreenshot; Original `work/acrylic-konfi/PROJECT/audit-20260930/01-kundenvorschau.png`, Hash im [Inventar](inventory-extra/files.json). |
| H02 | `screenshots/02-textwerkzeuge.png` | Historischer Prüfbeleg, keine vollständige Freigabe; Original im gleichen Auditordner; Hash im Inventar. |

Die vier wiedergefundenen Clipboard-Screenshots stehen mit Originalpfad, Hash und Kopiernachweis in [screenshots.json](inventory-extra/screenshots.json). Ihre Zuordnung ist inzwischen im Hauptchat belegt und ersetzt den früheren Status „UNGEKLÄRT“ für die Zuordnung:

| Bild-ID | Datei im Online-Archiv | Belegtes Thema / Status |
| --- | --- | --- |
| C01 | `screenshots/codex-clipboard-58405d3a-6500-42b0-ba19-2e241e3aba29.png` | E05: Designreiter und Filter nur opt-in. |
| C02 | `screenshots/codex-clipboard-01d8f911-60e0-4f49-80fa-05c3531a6922.png` | E08/E09: Millimeter und kreisrunde Farben. |
| C03 | `screenshots/codex-clipboard-4dc37da4-59c8-48b1-ba81-9c6d72a04142.png` | E34/E23: Nutzerfrage zu Bestsellerlisten je Unterkategorie; keine erfundene Antwort/Freigabe. |
| C04 | `screenshots/codex-clipboard-e353efdd-9add-449d-a89e-841b98edea9d.png` | E12: Auswahlgriffe vorne. |

Die Zuordnung beruht auf der konkreten Hauptchat-Übermittlung, nicht auf Dateinamen. Keine Implementierungsabnahme daraus ableiten. Visuelle Prüfung und unveränderte Archivierung mit Online-Blobvergleich sind erfolgt. Diese Referenzen zeigen Entwürfe/Beispieldaten und historische Bedienfehler; sie sind keine aktuelle Produktabnahme.

## Bekannte historische Fehler, verworfene Wege und Lücken

- P Logikprüfung nennt Fotoersatz auf ersten freien Platz, doppelt codierten Sockelaufschlag, eingeschränkte Formen, verdeckte Griffe, kleinen Uploadhinweis und anonyme Textzeilen. S meldet einzelne Korrekturen und 137 lokale Tests. Aktueller Fehlerstatus verlangt gezielten Code-/Bedienvergleich; alte Befunde nicht ungeprüft wieder als Fehler listen.
- `review-proposal.mjs` ist Diskussionsprototyp. Pauschales Reiterverstecken und Rundung auf ganze mm nicht übernehmen. AR ist vertagt. Keine technische oder Produktionsfreigabe aus ausgewählten Mockups ableiten.
- Mobile Breakpoints, exakte mobile Panelreihenfolge, endgültige Stapelansicht, Schriftliste/Rechte, reale Material-/Sockelmaße sowie Maschinen-/Weißprofile bleiben teilweise offen. Kein ursprüngliches Screenshotgespräch für diese Details neu rekonstruiert.
- N fordert vollständiges Screenshot-/Chatwissen; dieses Register deckt nur den ausdrücklich benannten Dokumentenumfang. Vollständigkeit des früheren Chats: **NICHT NACHGEWIESEN**.
