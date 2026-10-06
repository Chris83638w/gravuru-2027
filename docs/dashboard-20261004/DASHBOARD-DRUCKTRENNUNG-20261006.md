# Getrennte Mimaki-Downloads im Dashboard – 06.10.2026

Branch `task/dashboard-print-separations-20261006`, Basis `6ca4df1c7dd82a669eb72eca0348d72b9f35d3b1`. Bestehende Cloud, eigener Worktree. Keine Veröffentlichung, Shop-Schreibzugriffe oder privaten Kundendaten.

## Verhalten

Im vorhandenen Prüfstand bietet **Mimaki · Farbe und Weiß getrennt** jetzt einzelne Downloads für Farbe ohne RDG_WHITE und die reine RDG_WHITE-Vektorunterlegung. Unter **Ausgaben** erscheinen nach Fertigstellung zwei getrennte PDF-Buttons; beide Dateien sind ebenfalls im vollständigen ZIP enthalten. Die Farb-PDF liegt dort nur einmal; kein doppeltes Alias-PDF. Keine automatischen Mehrfachdownloads. „Ohne Weiß“ blendet die Weißausgabe aus; für Roland bleibt die kombinierte PDF. Standard weiterhin CMYK/300 dpi, motivbezogenes Weiß, kein Überdruck. Ausgabename kennzeichnet den Inhalt auch nach dem Download.

Farbe und Weiß werden aus exakt demselben gesicherten Stand, denselben Masken, Seitenmaßen und Spiegel-/Überdruckwerten erzeugt. Farbausgabe mit CutContour und ohne RDG_WHITE-Farbdefinition. Weißausgabe nur echte RDG_WHITE-Sonderfarbe als geschlossene Vektorflächen, ohne Rasterbilder und ohne Schnittkontur; unbedruckte Stellen bleiben frei. Im RIP beide Dateien seitenbezogen 1:1 registrieren, nicht getrennt auf sichtbare Objekte zuschneiden/zentrieren.

Explizite Texteingaben im serverseitigen Druckexport bleiben je Feld eine PDF-Form; aufeinanderfolgende Glyphen derselben Farbe werden ein zusammengesetzter Vektorpfad. Mehrzeilige/kursive Texte und deren Weißpfade erhalten Geometrie, Reihenfolge und Spiegelung. Keine Live-Schriftabhängigkeit. Foto-vor-Text und Text-vor-Foto bleiben unterschiedlich entsprechend der gespeicherten Gestaltung.

## Speicherung und Schutz

Neue Ausgabeversionen: `gravuru-form-print-proof/v4` und `gravuru-acrylic-print-proof/v2`. Alte gesicherte PDFs/ZIPs werden nicht verändert oder als neue Trennung ausgegeben. Ein alter Auftrag ohne gespeicherte Weißdatei bietet keinen solchen Download; ein neuer Auftrag aus demselben unveränderten Prüfstand erzeugt die neuen Dateien. Neue Weißdateien werden mit SHA-256 beschrieben und beim Einzelabruf gegen den gesicherten Inhalt geprüft. Keine frei wählbaren Dateipfade. Vorhandener Host-/Origin-/CSRF-Schutz bleibt aktiv.

Gemeinsame Logik in `app/workshop/print-delivery.mjs`; Erzeugung über die vorhandenen Form-/Acrylrenderer, Speicherung über die vorhandenen Ausgabeaufträge. Kein Datenbankschemawechsel. Zusätzlicher Einzelabruf `format: white-pdf` über die beiden bestehenden Operator-Routen. Keine Kunden-Downloadberechtigung ergänzt.

## Prüfungen

19 gezielte Drucktests bestanden, 0 Fehler/Skips: 300/600 dpi, freie Kontur mit Bohrung, Vorder-/Rückseite, Randdruck, Weißbegrenzung, originale Bildquellen, Textpfade und Reihenfolge. Neuer integrierter Test für beide HTTP-Downloadwege, identische Dateien im ZIP, CSRF-Ablehnung, geänderte Weißbytes/Prüfsumme, fehlende Weißunterlegung und Altstand-Abgrenzung. Die erwartete Zahl von Text-Zeichenobjekten wurde wegen der bewusst eingeführten Gruppierung von vier Glyphenobjekten auf ein Feldobjekt geändert; Pfadgeometrie und Spiegelvergleich bleiben geprüft.

Chromium am 06.10.2026, **13:05:30–13:05:42 Europe/Berlin**: beide Mimaki-PDFs und ZIP über die echte Oberfläche heruntergeladen, Weißdatei nach Neuladen des Ausgabeauftrags byteidentisch, Auswahl ohne Weiß sowie bei Roland korrekt begrenzt. Desktop 1440, Handy 390, Tablet 768 ohne Seitenüberlauf oder JavaScript-Fehler. Die erste Browserassertion verwendete `is_disabled()` an einem `<option>`; abschließend ist das tatsächliche HTML-Attribut geprüft. Keine Codeänderung zur Umgehung des Auswahltests. Beide heruntergeladenen PDFs zusätzlich MuPDF ohne Reparatur und Ghostscript mit `-dPDFSTOPONERROR` bestanden. Reine Vektorweißdatei, leere Flächen, CMYK-Farbdatei ohne RDG_WHITE, Textgruppen und 200 × 266,7 mm geprüft. Ausschließlich synthetisches Foto. [Bericht](dashboard-separations-browser-20261006.json), [Handyansicht](dashboard-separations-mobil-20261006.png), [Desktop](dashboard-separations-desktop-20261006.png).

Vollständiger Cloud-Check am 06.10.2026, **13:05:29–13:07:20 Europe/Berlin**, nach der letzten ZIP-Bereinigung: **301 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen / 1 Modell; Python- und Referenzprüfung bestanden.** [Bericht](dashboard-separations-cloud-20261006.json). Zuvor ebenfalls vollständiger Lauf bestanden; der zweite Lauf prüft die danach entfernte doppelte Farb-PDF im Mimaki-ZIP. Keine alten Ergebnisse als neuen Lauf übernommen.

## Grenzen und nächster Schritt

Die konkrete Roland-PDF-1.3-Probe wurde vom Nutzer bestätigt; diese Abnahme gilt weiterhin für jene Datei. Der reguläre Renderer bleibt PDF 1.7 mit Original-Transparenzen und Anzeigeebenen. Die unabhängige PDF-1.3-Nachverarbeitung wird nicht pauschal auf alle Kundengestaltungen angewendet, weil das Verrechnen halbtransparenter Fotos gegen Weiß deren Überlagerung verändern kann. Die getrennten neuen automatischen Dateien sind technisch geprüft, noch nicht pauschal im Corel-/Mimaki-Importer freigegeben. Gemessenes ICC-Profil bleibt offen.

Der private Muster-Link wurde nicht veröffentlicht oder überschrieben; die bestehenden statischen Konfigurator-Probeexporte werden durch dieses Backend-Paket nicht automatisch aktualisiert. Nächster Schritt: Mimaki-Test der bereitgestellten Dateien übernehmen und bei Bedarf die tatsächlichen automatisch erzeugten Ausgabe-Dateien gegen denselben Import vergleichen. Backend-Hosting und echte Shop-Verbindung bleiben separate offene Voraussetzungen.
