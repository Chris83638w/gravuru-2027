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
