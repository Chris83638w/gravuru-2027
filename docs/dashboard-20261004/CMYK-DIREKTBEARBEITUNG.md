# CMYK / 300 dpi und kompakte Direktbearbeitung

Basis `911874efc3532f7bd77a72fbef9eafa6072d6d3c`, Branch `task/cmyk-300dpi-20261004`.

- Standard bleibt eine PDF: jetzt 300 dpi, Farbbild als echtes DeviceCMYK mit vier Bytes je Pixel; 600 dpi optional. Roland RDG_WHITE / Mimaki-Weißfüllung, Schnittkontur, Motivdeckung und randabhängiger Überdruck bleiben erhalten. Generische Maximalschwarz-Separation: K=1-max(R,G,B), normierte Restfarben CMY. Neutrales Schwarz landet ausschließlich in K. Kein erfundenes ICC-Profil oder farbverbindlicher Drucknachweis. Quelldateien im optionalen ZIP behalten ihre Quellfarben.
- Bei sichtbarer Schrift unter 5 mm nominaler Schriftgröße oder expliziten Linien unter 0,25 mm erscheint ein 600-dpi-Hinweis. Die Ausgabe bleibt ohne Nutzerauswahl bei 300 dpi. Maßstab des Produkts wird berücksichtigt. Keine behauptete Analyse sämtlicher Details in importierten Rasterbildern oder gefüllten Vektorpfaden.
- Das große Formular über dem Foto ist durch eine schmale Werkzeugleiste und ein kleines Eingabefeld an der ausgewählten Textposition ersetzt. Schriftwahl, ganze Millimeter, runder Farbwähler, Abbrechen/Fertig. Auf Mobilgeräten sitzt die Leiste am unteren Vorschaurand, damit Vollbild frei bleibt. Vorhandene Foto-/Dreh-/Skalierfunktionen und Vorlagenrechte werden weiterverwendet.
- Verbindliche Masterbegriffe in AGENTS.md und MASTER-BEDIENREGELN.md: Motiv = einzelnes hinzufügbares Element; Design = gesamte Gestaltung einer Platte/eines Acrylglases. Keine Daten-/ID-Migration daraus abgeleitet.

## Nachweis

169 Quelltests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Neun Exporttests prüfen CMYK-Rohkanäle inklusive Primärfarben/K-Schwarz, Standard/Option und ungültige dpi-Werte, Weißtransparenz, Kontur-/Sonderfarben und Empfehlungskriterien.

Chromium-Downloads: Roland 300 dpi = 1772 × 2362 Pixel, 5.228.350 Bytes; Mimaki 600 dpi = 3543 × 4724 Pixel, 17.275.253 Bytes (derselbe Beispielstand, unterschiedliche Weißprofile). Beide PDFs geöffnet und vierkanalige CMYK-Bildstreams tatsächlich geprüft; unbedruckte Weißkanalstellen transparent, Foto weiß unterlegt. Bildschirm-RGB-Vorschau ist kein Drucknachweis.

Desktop 1512 × 1080 und Mobil 390 × 844: kompakte Leiste, Direkttext, Rücksetzen, Ganzzahlgröße, Fotoeditor, gesperrte Elemente, Upload ohne Scrollsprung und tatsächlicher Download geprüft. Keine Seitenfehler. Visuelle Prüfung: design-qa.md. Keine privaten Nutzerfotos übertragen. Kundenkonto und RIP-/ICC-Freigabe bleiben separat offen.

## Nachtrag: vollständige Vorschau und Ganzzahl-Eingabe

Die bestehende obere linke Mobilvorschau zeigt die komplette Acrylszene mit Originalfoto bzw. Upload, Texten, festen Designelementen und gewähltem Sockel. Größerer Ausschnitt (maximal 142 × 164 CSS-Pixel), proportional und ohne umlaufenden Leerraum innerhalb des Hinweisrahmens. Keine verschiebbaren Bediengriffe in der Kopie. Der bündige Rahmen erscheint bei den ersten drei tatsächlichen Änderungen für jeweils 1,2 Sekunden; kein Blinken oder dauerhafter Rahmen. Auf Desktop bleibt die vorhandene große Vorschau links bestehen.

Kundeneingabe der Schriftgröße: ganze mm, Schrittweite 1; 8,7 wird zu 9. Interne Originalmaße bleiben beim Laden erhalten; eine Schriftgrößenänderung verändert weder Plattenformat noch Textinhalt/Position. Backend-Präzision bleibt getrennt.

Nachtrag geprüft: 16 gezielte Quelltests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Chromium mobil 390 × 844: vollständiges Beispielfoto und Sockel sichtbar, Rahmen nur anfangs/kurz, stabile Vorschaugröße nach wiederholten Änderungen, Dezimaleingabe gerundet, Plattenmaße unverändert, kompakte Textbearbeitung weiterhin bedienbar. Keine Seitenfehler. Der frühere Gesamtlauf mit 169 Tests oben gehört zum CMYK-Paket; kein erneuter Gesamtlauf für diesen Nachtrag behauptet.

## Korrektur 05.10.2026: Vollbild und sichtbare Änderungsrückmeldung

Die Vollbild-Flexbox streckte die Acrylszene vertikal; prozentuale Sockelposition und unverzerrtes Sockelbild passten dadurch nicht mehr zusammen. Die Szene behält nun auch im Dialog ihr Seitenverhältnis 1086/1448 durch `flex: 0 0 auto`. Die vorhandenen Sockelanker und die 7-mm-Einstecktiefe bleiben maßgeblich.

Der vorherige innenliegende Outline-Rahmen konnte unter der kopierten Vorschau verschwinden. Eine nicht anklickbare Rahmenebene liegt nun sichtbar darüber. Nach aktueller Nutzerkorrektur erscheint sie bei jeder Inhaltsänderung kurz (1,6 Sekunden, nach 250 ms Eingabepause), ohne Limit auf die ersten drei Änderungen. Sie gehört weder zum Design noch zum Export.

Chromium bei 390 × 844 und 1512 × 1080: Nussbaumsockel vor/nach Vollbild geprüft, Seitenverhältnis 0,75, relative Sockelposition bleibt gleich (Abweichung <0,4 Prozentpunkte durch Rahmen). Fünf aufeinanderfolgende Textänderungen zeigen jeweils den sichtbaren oberen Rahmen; danach verschwindet er. Beide Zustände als Screenshots visuell geprüft, keine Seitenfehler. Build 76 Ressourcen/1 Modell. Keine erneute Gesamttest- oder Druckfreigabe behauptet.

## Ergänzungen 05.10.2026: direkte Werkzeuge und Motivplatzierung

- Foto: „Bearbeiten“ ist bei Acryl wieder sichtbar, vor Ersetzen/Entfernen. Zuschnitt über Verschieben/Zoom, Drehen/Spiegeln; bei festem Vorlagenrahmen bleibt dessen Form unverändert. Originalfarbe, Graustufen und Sepia werden in die Bildpixel übernommen. Ausgangsbild und Bearbeitungseinstellungen bleiben in der laufenden Sitzung separat erhalten, damit erneutes Öffnen/Farbwechsel keinen zusätzlichen destruktiven Zuschnitt verursacht. Keine behauptete dauerhafte Speicherung privater Fotos.
- Direkte Textleiste: vorhandene Schriftbibliothek, Fett und Kursiv. Fett nutzt verfügbare Fettschnitte (ohne vorhandenen Schnitt im direkten Werkzeug deaktiviert); Kursiv ist eine ausdrücklich technische 12°-Neigung der vorhandenen Vektorpfade, kein erfundener Italic-Font. Dieselbe Geometrie in Vorschau und Export, passende Maße/Prüfrechte; Abbrechen stellt auch Schrift/Stile/Farbe wieder her.
- Neue Motive: freie Flächen anhand tatsächlicher Druckgrafik und Alpha-Kanal suchen, einschließlich transparenter Bereiche in Vorlagen. Vorhandene Elemente unverändert; Kontur, Bohrlöcher und Sockeleinstecktiefe aussparen. 1-mm-Suchraster mit Sicherheitsabstand; konservative rechteckige Motivhülle. Kein passender Platz: neu hinzugefügtes Motiv mit Hinweis zurücknehmen. Bei parallel veränderter Gestaltung/fehlgeschlagener Bildauswertung Hinweis zur manuellen Prüfung; keine behauptete kollisionsfreie Position.
- Kompaktere Motivbibliothek: sechs Spalten Desktop, vier Mobil; vorhandene Beschriftungen/Interaktion bleiben. Bestseller kompakter.
- Vollbild: Klick außerhalb der weißen Dialogfläche schließt; Klick in deren weißen Innenbereich nicht.

Prüfung: 172 Gesamttests bestanden / 0 Fehler / 0 Skips, anschließend gezielte Nachprüfung der finalen Platzsuche/Ereigniswege; Build 76 Ressourcen/1 Modell. Chromium Desktop 1512 × 1080 und Mobil 390 × 844: tatsächlicher Bildzuschnitt verändert Pixel, Graustufenkanäle gleich, erneutes Öffnen behält Zuschnitt und erlaubt Rückkehr zur Originalfarbe. Sichtbarer Bearbeiten-Button vor Ersetzen, Schriftwahl und beide Stilaktionen, Kursiv-Vektorpfade, Motivspalten/Platzsuche ohne Seitenfehler. Außen-/Innenklick am Desktop geprüft. Screenshots von Foto-/Texteditor visuell geprüft. Ausschließlich synthetisches Testfoto, keine Nutzerdatei in Git oder Site-Paket. Drucker-/Corel-Abnahme nicht erneut ausgeführt.

## Neutrale Farben, Motivwerkzeuge und Löschfreigabe

Branch `task/unlock-design-elements-20261005`, Basis `3d09c9428f1637db6ece5052af8efd471f473397`. Neutrale UI-Farben sind separat in `neutral-theme.css` gekapselt. Direkte Motivwerkzeuge ergänzen sechs runde Farbvorgaben, freie Farbe, Größenänderung und 15°-Drehung. Keine pauschale Umfärbung von Fotos oder Rasterdesigns.

`template-deletion.mjs` schützt das Löschen von Vorlagenelementen bis zum bewussten Entsperren. Das persistierte Backend-Recht entscheidet, ob Entsperren angeboten wird. Bestehende Standardrechte ändern sich nicht; technische Sperren bleiben bestehen. Servervalidierung akzeptiert eine ausdrücklich erlaubte Löschung fester Vorlageobjekte, weiterhin keine unerlaubte Geometrieänderung. Die private statische Beispielkonfiguration gibt nichttechnische Vorlageobjekte ausdrücklich für diese Erprobung frei; keine private Werkstattdatenbank wurde verändert.

Prüfung: vollständiger Quelltestlauf 173 bestanden/0 Fehler/0 Skips. Nach direkter Motivbedienung zusätzlich 21 gezielte Rechte-/UI-Regressionsprüfungen bestanden. Build: 76 geprüfte Ressourcen, 1 Modell. Chromium Desktop 1512 × 1080 und Mobil 390 × 844: Entsperren/Löschen/Rückgängig/Wiedersperren, Farbvorgabe und freie Motivfarbe, tatsächliche Drehung/Skalierung, keine Seitenfehler. Desktop: Klick auf weiße seitliche Fläche schließt die Vollbildvorschau. Mobil: Motivwerkzeuge in Vollbild bedient. Neutrale Schaltflächenkontraste zusätzlich visuell und anhand berechneter Farben geprüft.

Originale bleiben erhalten. Bestellübernahme als neuer Produktentwurf, Kundenkonto und echter Shopbetrieb bleiben offen.
