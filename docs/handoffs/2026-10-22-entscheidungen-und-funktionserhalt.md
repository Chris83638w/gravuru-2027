# Bestätigte Entscheidungen und Funktionserhalt · 22.10.2026

Diese Liste ist die verbindliche Erhaltungs- und Abnahmegrundlage. „Belegt“ bezieht sich auf die jeweils genannte Quelle/Prüfung. Ein übernommener Nutzerwunsch oder vorhandener Quellcode ist keine Behauptung einer heutigen vollständigen Live-Abnahme. [Aktueller Gesamtstand](2026-10-22-vollstaendige-uebergabe.md).

## Rollen und Gestaltung

- Codex übernimmt Technik, Datenhaltung, Schnittstellen, Prüfungen und einfache UI-Elemente wie Buttons/Formulare/Navigation.
- Neue Bilder, Illustrationen, Motive, Produktdesigns oder Ersatztexturen nur durch Work bzw. ausdrücklich geeignete Gestaltungshilfe. Keine eigenen gestalterischen Versuche als Ersatz für abgelehnte Designs.
- Neue Motive dürfen über den Konfiguratorbestand hinausgehen. Echte Vektoren, keine Rasterbilder im SVG-Mantel. Texte und Motive einzeln bearbeitbar; Vorschau aus genau denselben Quellen wie die technische Übernahme.
- „Treue Wege – Hund“ war ein Gestaltungsvergleich; das spätere Labrador/AOSU-Beispiel verwendet **Variante M**. Historischer v3-MASTER ist nicht die vollständige Variante M. Keine Verallgemeinerung dieser Geometrie auf andere Produkte.
- Abgelehnte Codex-/Work-V1/V2-Entwürfe bleiben ausgeschlossen. Acht historische GD-WORK-V2 bleiben `deferred`, entfernte Vorlagen entfernt. Kein Seed-/Importlauf darf sie wieder aktivieren.

## Fünf Bearbeitungsprofile, Material und Fertigung

Ein gemeinsamer Konfigurator mit auswählbaren Produktprofilen, keine fünf unabhängigen Neuentwicklungen:

| Profil-ID | Bearbeitung | Vorgabefarbe |
| --- | --- | --- |
| `steel-engraving` | Edelstahlgravur | Schwarz `#000000` |
| `wood-engraving` | Holzgravur | Braun `#49301d` |
| `slate-engraving` | Schiefergravur | Hell `#e8e9e5` |
| `acrylic-engraving` | Acrylgravur | Grauweiß `#e1e4e5` |
| `color-print` | UV-/Farbdruck | Original-/freie Farben, Fallback `#202824` |

Vorhandene Druckpalette: Schwarz, Weiß, Grau, Rot, Orange, Gelb, Grün, Blau, Violett, Pink, Braun, Türkis; Pastell Rosé, Pfirsich, Vanille, Mint, Salbei, Himmelblau, Lavendel, Sand. Freie Farbe/Originalfarben bleiben. Runde Schnellfarbpunkte sind Teil der späteren Direktbearbeitung, nicht Ersatz der vollständigen Palette.

Diese Bearbeitungsprofile sind **nicht** die versionierten betrieblichen Fertigungsprofile für Maschine/Material/Stärke/Prozess. Der Nutzer möchte Fertigungsvorgaben beim Anlegen nach Unterkategorie auswählen; zentrale Wiederverwendung und Produktausnahmen sind sinnvoll. Die vollständige automatische Vererbung/Bedienung dafür ist noch offen. Fehlendes Fertigungsprofil darf eine ausdrücklich private ID-Prüfung nicht unnötig blockieren; vorhandene ungültige Profilreferenzen nicht akzeptieren und Produktion niemals ohne erforderliche Vorgaben freigeben.

Jedes echte Produkt braucht seine tatsächlichen Materialoriginale, Maße, Stärke, Form, Befestigungen und erlaubten Bearbeitungen. Demos mit Preis null/`local-*` sind keine verkaufsfähigen Artikel. Leder ist als Materialreferenz vorhanden, kein zusätzlich erfundenes sechstes der fünf Bearbeitungsprofile. Edelstahlreferenz v4 und Originalmaterialien gemäß Herkunftsregister bewahren; vorhandene Ableitungen nicht als neue echte Materialfotos ausgeben. Fehlende Schiefer-/andere Originalbelege offen lassen. Keine geratenen ICC-/Maschinen-/Schnittparameter oder Materialstärken.

## Edelstahl, Doppelplatten und Klingel: GV-005–007

Historisch vollständig gesicherte Quellen unter `gravuru-shopify` @ `771ead19412979e8782e302262e13127dee044da`, zusätzlich im privaten historischen Quellpaket:

- **GV-005:** Edelstahlpilot 300 × 200 × 1,5 mm/R5, getrennte Zwei-/Vierlochvarianten, Editor, Revisionen, PDF/SVG. Die Maße gelten nur für diesen Pilot.
- **GV-006:** unveränderliche Materialoriginale mit SHA-256/Freigabe, ableitbare Maß-/Formvorlagen, Materialverwaltung und Geometrieprüfung.
- **GV-007:** einzelne Bohrungen entsperren/verschieben/sperren; separate Acrylplatte mit im Pilot festgelegten 3 mm, Farbe/Form/Position; positionierbare Klingel und mitbewegte Ausschnitte.
- Weitere Erhaltungsfälle: Bohrungsanker/Spiegelung, Größenhilfen, Schraubenfreiraum, Download aktueller Vorlagen, Löschen/Wiederherstellen, historische Vorgänger und Design-/Revisionszuordnungen.
- Historische Fertigungsausgabe: Edelstahlkontur blau `#0000FF`, Acrylaußenkontur gelb `#FFFF00`, echte Acrylinnenschnitte rot `#FF0000`, Gravur schwarz. Getrennte maßhaltige Edelstahl-/Acryl-PDF/SVG; Übersichts-SVG mit benannten Gruppen ist kein Fertigungsauftrag. Klingelpositionshilfen gehören nicht in Schneiddateien.
- Historischer Privatbestand: 171 Designs, 175 Revisionen, sieben Vorlagen (fünf aktiv/zwei entfernt). Die geprüfte Sicherung vom 23.09. bleibt getrennt von den aktuellen zwei Serverstores. Nicht behaupten, dass alle Funktionen schon in der neuen Verkaufstrecke integriert sind.

## Kundenoberfläche, Auswahl und Bedienung

| Bereich | Zu erhalten / abzugleichen |
| --- | --- |
| Farben | Weißer Gestaltungsbereich; Warmgrau/Taupe (`stone`) nach Vergleich gewählt. Grün-Weiß/Graphit bleiben Vergleichsquellen. Keine erneute vollständige Umgestaltung beim Anschluss |
| Lesbarkeit | Kontrast, sichtbarer Fokus, Beschriftungen, Tastatur-/Mobilbedienbarkeit prüfen. Der Nutzer hat konkrete Bedenken geäußert; kein abgeschlossenes Barrierefreiheitszertifikat behaupten |
| Auswahlrahmen | Kleine Griffe, Pfeile nur nach außen, roter Papierkorb/weißes Symbol; freie Fläche außerhalb hebt Auswahl auf; Auswahl-Dialoge über Außenklick schließen |
| Bezeichnungen | „Ausführungen“, „Ebenenverwaltung“, „Zoom“. Einheitliche Auswahlhaken bei Design, Material, Farbe, Befestigung und Uploadart |
| Befestigung | Einheitliche Kacheln mit Icons und verständlichen Preisen; Beschreibungen kompakt; überflüssigen Hinweis „Klingelschild ohne Funkklingel“ nicht wieder einführen |
| Abstände | Weniger Leerraum, kompaktere Foto-/Motivbereiche, mobil schmalere Mehrfachtextauswahl, Hilfslinienbedienung neben den anderen Werkzeugen soweit vorhanden |
| Texte | Links/zentriert/rechts ohne vorherige Spezialaktivierung ausrichten; alte Erklärung „Text mittig ausrichten“ entfernt. Schriftänderung kann nach Auswahl auf andere Texte übernommen werden |
| Hilfslinien | Mitte und Textkanten beim Anklicken/Ziehen verfügbar, beim Loslassen ausblenden. Kein dauerhafter Strich über der fertigen Gestaltung |
| Direktbearbeitung | Doppelklick/Doppeltippen auf Text führt zum Eingabefeld; Direktleiste mit Fertig/Abbrechen. Vorhandene Größen, Fett und Schriften erhalten |
| Autofit | An tatsächlichen Glyphenkonturen und Rotation in Modell-mm ausrichten; historische Kundenmindestgröße 4 mm erhalten. Keine ungefragte 3-mm-Regel oder bloße Boundingbox-Schätzung als physische Genauigkeitsgarantie |
| Neue Elemente | Freien sinnvollen Platz suchen, bestehende Gestaltung nicht verschieben; bei Platzmangel Hinweis statt stummem Zentrieren |
| Designwechsel | Übernahme eingegebener persönlicher Texte anbieten; passende Felder zuordnen, weitere Texte nicht verlieren. Keine Beschränkung nur auf Name/Datum gegen den bestätigten Umfang |
| Designvorschau | Vergrößerte Vorschau mit Lupe, mobil bedienbar; Scrollen am Listenende zur Seite weitergeben |
| Ebenen | Sperren/Sichtbarkeit, Reihenfolge, Rückgängig/Wiederholen, bestehende Material-/Geometrie- und Exportfunktionen bewahren |

Die September-Bedienfassung und das additive Update bis Stichtag 16.10. liegen vollständig im historischen Paket. Direktbearbeitung/Fotoeditor/runde Farben wurden in der lokalen Updatefassung geprüft. Deren vollständiger Einbau in jeden aktuell angebundenen Servereditor ist durch diese Übergabe nicht pauschal bewiesen; bei Abweichung gezielt vergleichen, nicht den ganzen neueren Editor darüberkopieren.

## Motive und Warnungen

- Bestseller und „Alle Motive entdecken“ als klare Zugänge, kompakte Vorschauen, bei großer Bibliothek nachladen. Kategorieauswahl leert vorhandene Suchanfrage. Kein festhängender kombinierter Filter und keine Scrollsperre am Listenende.
- Vorhandene Suche ist lokal synonymbasiert, **keine belegte Embedding-/KI-Suche**. Semantisch verständliche Treffer bleiben ein Ziel; keine kostenpflichtige KI-Suche ohne Bedarf installieren.
- Text-/Motivüberlagerungen: bei Gravur Warnung mit markierten/beschriebenen Elementen, vom Kunden ignorierbar; **bei Druck ausblenden**.
- Bohrlochwarnungen **nur bei echten mechanischen Problemen**, z. B. blockierter Schraubennutzung bei übereinanderliegenden Platten. Keine allgemeine Warnung allein wegen Text nahe einem Loch. Der Konflikt zu späteren nativen Review-Vermerken ist ein gezielter Prüffall, kein Grund zur Abschaffung der mechanischen Prüfung.
- Ignorieren einer UI-Warnung ist keine gespeicherte Fertigungsfreigabe und kein pauschaler Verzicht auf technische Validierung.

## Foto/Logo

- Höchstens vier Dateien, JPEG/PNG/WebP, pro Datei höchstens 15.728.640 Bytes. Originaldatei bewahren; nach Upload/Ersetzen sichtbar zur neuen Fotokarte springen.
- Kompakte rechteckige Uploadfläche; Auswahl Foto/Logo und sinnvoller Fortschritt/Erfolg. Kein scheinbar wirkungsloser Upload.
- **Photoroom wurde nach echtem Test verworfen.** Nicht erneut verbinden. Keine API-Schlüssel aus dem Chat in Quellen/Übergabe aufnehmen. Alte Versuchsquellen nur als Geschichte, nicht aktivieren.
- Wunsch je Foto: Hintergrund entfernen oder behalten. Persönliche Prüfung/Freistellung durch Gravuru, bei Bedarf manuell nachbearbeitet, im Fotopreis enthalten. Original erscheint in Vorschau. Kein unbelegtes „besser als jede KI“ versprechen.
- Interaktive automatische Freistelloption entfernen; Zuschnitt, Drehung, Spiegelung, Farbe/Grau/Sepia, Original und Undo erhalten. Gespeicherte Bearbeitungsparameter müssen bei Wiederöffnung dieselbe Darstellung liefern. Alte 20-MP-/8192px-Regel des **Bearbeitungsmoduls** nicht mit der aufgehobenen zusätzlichen Upload-Megapixelgrenze verwechseln.
- Das zuletzt hochgeladene Nutzerfoto und seine gespeicherte Gestaltung sind vorhanden und privat gesichert; nicht durch Testbilder ersetzen.

## Abschluss, Warenkorb und Preise

- „Gestaltung fertig – weiter“ öffnet klare Abschlusskontrolle. Preis und „In den Warenkorb“ bleiben erreichbar/sticky; Kaufaktion farblich von normalen Buttons unterscheidbar und gut lesbar.
- Gewünscht ist der **echte Shopify-Warenkorb**, dauerhaft private Gestaltung/Fotos und Wiederöffnung; kein funktionsloser Ersatztestbutton.
- Neue Staffelpreise gelten auf den vollständigen Stückpreis inklusive Foto/Motiv/Befestigung; konkrete Kategorie-/Variantenverträge beachten. Alte 15-%-Zweitexemplarregel nicht reaktivieren.
- Vorhandene Warenkorbzeile beim Bearbeiten ersetzen, andere Zeilen erhalten; keine stillen Doppelbestellungen, kein ungeprüftes Wiederholen unklarer Mutationen.
- Produktzuordnung über IDs für alle Produktarten vorbereiten. Die Schnittstelle ist gemeinsam, aber jede reale Shopify-Variante braucht eine explizite gültige Bindung. Zehn aktive Pilotvarianten beweisen keinen vollständigen Kataloganschluss.
- Native kostenpflichtige Zusatzfelder/Rückseiten und Formpreisstaffeln sind noch nicht allgemein im v1-Vertrag enthalten. Nicht entfernen, verschenken oder behaupten, sie seien schon abgenommen.

## Zusammenarbeit und Betrieb

Bestehenden Plesk-Server verwenden, keine doppelte App/Cart-Transform/Datenbank. Vor Änderungen beide aktuelle Datenbestände konsistent sichern und getrennt wiederherstellen. Originale, Revisionen, Ablehnungen und Korrekturen erhalten. Bereits beantwortete Fragen nicht wiederholen; tatsächliche Konflikte vor Funktionsänderung besprechen.

Aktuellen GitHub-Branch/Commit lesen, auf Aufgabenbranch sichern, keine automatische Kontosynchronisierung behaupten. Private Daten/Geheimnisse bleiben außerhalb GitHub. Keine unkontrollierten Seed-/Import-/historischen Installationsläufe. Kurze ausdrücklich vereinbarte Wartungspause ist keine allgemeine Freigabe für beliebige weitere Abschaltungen.

AWS/Google-Cloud-Reserve nach Kostenvergleich **vorerst nicht beauftragt**. Verfügbarkeit, Backup, Wiederanlauf und Werbeaktionslast sind separate Prüfungen; keine 100-%-Zusage. Die Unternehmenshomepage/regionale Lohnfertigung wurde in ein eigenes Thema ausgelagert und gehört nicht in diese Konfiguratorübergabe.
