# Gespeicherte Druckebenen ansehen – 06.10.2026

Branch `task/dashboard-plate-preview-20261006`, Basis `ff8b4c5bb6a6eefd5879281126553f56eb051c3a`. Vorhandene Cloud, eigenes Worktree, keine Veröffentlichung oder Shopmutation.

## Sichtbares Verhalten

Unter **Ausgaben** kann der Bediener für einen fertigen Druckauftrag **Farbe ansehen** oder **Weißunterlegung ansehen** wählen. Die PNG-Bildschirmansicht stammt aus der tatsächlich gespeicherten PDF, nicht aus einer zweiten Darstellung der Kundengestaltung. Bei Mimaki wird für Weiß die separate, SHA-256-geprüfte Weiß-PDF verwendet. Bei Roland wird die benannte Weißebene der kombinierten PDF isoliert. Schnittkontur und jeweils andere Druckebenen bleiben in der Ansicht aus.

Weiß erscheint auf einem Karomuster: Weiß = Weißdruck, Karomuster = keine Belegung dieser Druckebene. So wird eine unerwünschte Vollflächenunterlegung sichtbar. Auch Farbe erscheint transparent über dem Karomuster. Unter „Geprüfte PDF“ steht die SHA-256 des tatsächlichen Quelldownloads. Bei Ausgabe ohne Weiß gibt es keinen Weiß-Button; für Gravur wird dieses Druckpanel nicht angeboten. Beim Auftragswechsel wird die alte Ansicht entfernt. Datum/Uhrzeit dieser Seite jetzt ausdrücklich Europe/Berlin.

## Umsetzung und Schutz

Neue Operator-Route `POST /api/workshop/export-jobs/:id/preview`, nur `mode: color|white`, mit bestehendem Host-/Origin-/CSRF-Schutz. Nur fertige gespeicherte Ausgaben, keine Dateipfade aus Browserangaben. Ein isolierter Python/MuPDF-Prozess liest die PDF über stdin und liefert PNG über stdout; keine neuen Privatdateien auf der Platte. Grenzen: maximal 64 MiB Quell-PDF, 1000 Pixel längste Kante, 8 MiB Ausgabe, 20 Sekunden, höchstens zwei Vorschauprozesse je Werkstatt. Fehler liefern keine PDF-Inhalte oder Parserdiagnostik.

Antwort ohne Browsercache, mit Quellen-SHA und Plattenart. PDF, ZIP, Datenbank und Ausgaberezept bleiben unverändert. Für beschädigte PDFs oder nicht eindeutig benannte Ebenen wird keine scheinbar korrekte Ersatzansicht erzeugt; der vorhandene PDF-Download bleibt verfügbar. Reine Bildschirmdarstellung, keine maßstäbliche Druckdatei, Farbkalibrierung oder Maschinenfreigabe.

## Geprüft

- 11 gezielte Druck-/Vorschautests bestanden, darunter drei neue Fälle: getrenntes Rot/Weiß mit transparenten Leerstellen; Mimaki nutzt exakt die archivierte Weißdatei; motivbezogenes und vollflächiges Weiß unterscheiden sich sichtbar; fehlendes Weiß, Gravur, falsche Modi und beschädigte PDFs werden abgewiesen. PDF-SHA vor/nach Rendering identisch.
- Bestehender HTTP-Drucktest erweitert: CSRF-Ablehnung, unerlaubtes Pfadfeld, PNG-MIME, no-store, Quellen-SHA der tatsächlichen Weiß-PDF, unveränderte Farb-PDF.
- Chromium am 06.10.2026 **13:27:02–13:27:23 Europe/Berlin**: beide Ebenen sichtbar, Quellen-SHAs stimmen mit echten Downloads überein, Wechsel zu einem Auftrag ohne Weiß räumt alte Ansicht auf, Rückwechsel startet ohne alte Vorschau. Handy 390, Tablet 768, Desktop 1440 ohne Überlauf oder JavaScript-Fehler. Download/ZIP/Wiederholungsdownload weiterhin identisch; beide PDFs zusätzlich MuPDF/Ghostscript bestanden. Nur synthetisches Foto und fiktive Daten. [Browserbericht](druckebenen-browser-20261006.json).

[Handyansicht Weiß](druckebenen-mobil-20261006.png) · [Farbansicht](druckebene-farbe-20261006.png) · [Weißansicht](druckebene-weiss-20261006.png).

Vollständiger `node scripts/cloud-check.mjs` am 06.10.2026 **13:26:24–13:28:11 Europe/Berlin**: **304 Tests bestanden, 0 Fehler, 0 Skips; Build 76 Ressourcen / 1 Modell; Python- und Referenzprüfung bestanden.** [Cloud-Bericht](druckebenen-cloud-20261006.json).

## Grenzen und nächster Schritt

Die Anzeige kann falsche Weißbelegung sichtbar machen; sie ist keine automatische Prüfung, ob Weiß fachlich gewünscht ist. Alpha aus importierten Quellen und deren tatsächliche PDF-Ebenen sind maßgeblich. Corel/RIP, gemessenes ICC-Profil und die echte Mimaki-Abnahme bleiben separat. Der bestehende private Muster-Link wurde nicht geändert; Backend-Hosting/Shop-Verbindung werden nicht durch diese Cloud-Browserprüfung behauptet. Nächster Schritt: Nutzerergebnis des Mimaki-Imports übernehmen und die entsprechende Ausgabe bei Bedarf anhand dieser Anzeige vergleichen.
