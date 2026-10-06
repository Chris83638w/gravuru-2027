# Ausführungen als ausgefüllte Excel bearbeiten

Stand 06.10.2026; Branch `task/variant-excel-export-20261006`, Basis `61903f9ae655116f3c8b8e7ae774a7f19c0e96ea`.

## Bedienung

Werkstatt → Ausführungen → Excel-Zuordnung (`/werkstatt/ausfuehrungen-import/`). Im neuen Bereich Gruppen auswählen, **Excel mit Produktliste herunterladen**. Ohne Auswahl erhält man die leeren Zuordnungsblätter mit Produktliste für neue Gruppen. Archivierte Gruppen erscheinen nicht in der Auswahl.

- **Gruppen**: ausgewählte aktive Gruppen mit `action=update`, Gruppen-ID, erwartetem Stand und neuem Importschlüssel je Export.
- **Varianten**: bestehende Zuordnungen einschließlich Bezeichnung, Standardwahl und exakt bisher referenzierter Produktrevision.
- **Produktliste**: reine Nachschlagetabelle, wird nicht importiert. Aktuelle aktive freie Formprodukte plus historische Referenzen der ausgewählten Gruppen. IDs, Revisionen, Name, Material, mm, Verfahren, Centpreis, Designanzahl, neuester Stand und Verwendbarkeit. Keine Originale, Vorschaubilder, Kundenfelder oder Bestelldaten.
- **Anleitung**: Feldregeln und Ablauf in der Datei.

Produkt-ID und Produktrevision stets aus derselben Zeile übernehmen. Ein aktuellerer Produktstand ersetzt eine historische Zuordnung nicht automatisch. Nicht verwendbare/archivierte referenzierte Produkte bleiben mit Hinweis sichtbar; der Import lehnt ungültige neue Zuordnungen weiter ab.

Nach Bearbeitung dieselbe Datei unten auswählen, prüfen, anschließend übernehmen. Unveränderte Gruppen zeigen „Unverändert · wird übersprungen“ und erzeugen weder Revision noch Importjournal. Nur Änderungen werden geschrieben. Wenn alles unverändert ist, bleibt Übernehmen deaktiviert. Für Wiederaufnahme dieselbe bearbeitete Datei mit denselben Importschlüsseln behalten; für eine weitere Änderung frisch exportieren. Veraltete Gruppenstände ergeben einen Konflikt. Nicht aufgeführte Varianten bleiben wie bisher erhalten; Entfernen/Archivieren bewusst in der Gruppenverwaltung.

## Implementierung und Grenzen

`variant-export.mjs` ermittelt die Referenzdaten lesend vor Start des Workers; `variant-export.py` erzeugt XLSX aus der bestehenden Vorlage vollständig im Speicher. `POST /api/workshop/variants/batch/export` verlangt dieselbe CSRF-Sitzung wie die Werkstatt. Download mit `Cache-Control: no-store` und Attachment-Header. Bestehender Host-/Origin-Schutz unverändert. Dies ist keine neue Authentifizierung für ein öffentliches Backend.

Maximal 100 ausgewählte Gruppen, 50 Ausführungen pro Gruppe, 5000 Produktstände in der Nachschlageliste und 5 MB Dateigröße. Grenzen werden abgewiesen, nicht still abgeschnitten. Texte einschließlich Namen mit führendem `=` werden als literal XLSX-Strings geschrieben; keine Formeln, Makros, externen Links oder URLs als Bildquellen erzeugt. Worker begrenzt Laufzeit/Ergebnisgröße. Keine neuen Datenbanken oder externen Dienste.

Bestehende Importprüfung bleibt maßgeblich für Preis/Geometrie/Designs und Transaktionen. Export verändert keine Produkte oder Gruppen. Es gibt keine automatische Größenumrechnung oder Übertragung persönlicher Fotos/Texte. Preis/Material in der Produktliste sind zur Orientierung; ihre Bearbeitung ändert keine Produkte.

## Installation und Prüfungen

Zusätzlich zu den bestehenden Python-Anforderungen:

```sh
python3 -m pip install --target .local-data/python -r app/workshop/requirements-excel.txt
node --test app/workshop/form-variants.test.mjs
node scripts/cloud-check.mjs
```

OpenPyXL 3.1.5 ist jetzt als Laufzeitabhängigkeit dokumentiert. In dieser bestehenden Cloud war die Version bereits vorhanden und wurde über `.local-data/python` verwendet; keine neue Installation behauptet.

Tatsächlich ausgeführt in der bestehenden verwalteten Linux-Cloud (Node 24.19.0), ausschließlich mit separaten synthetischen Datenbanken:

- Gezielte Tests: 14/14 bestanden, inklusive echtem XLSX-Roundtrip, Formeltext, 100 Gruppen/200 Varianten, Auswahl-/Archivierungsfehlern, unveränderten Ständen, Konflikten und HTTP-Schutz.
- Cloud-Check: **06.10.2026, 08:12:55–08:14:14 Europe/Berlin**, **263 Tests, 0 Fehler, 0 Skips**. Build 76 Ressourcen, 1 Modell, Editor 461440 Bytes.
- Chromium: tatsächlicher Download ohne/mit Auswahl, XLSX bearbeiten und über Datei-Auswahl zurückimportieren; eine Aktualisierung, unveränderte zweite Gruppe bleibt Revision 1, Wiederholung schreibt nichts. Erneuter Export neue Schlüssel. Desktop 1440 px, Handy 390 px, Tablet 768 px ohne Überlauf und ohne JavaScriptfehler.
- [Maschinenlesbarer Nachweis](variant-export-check.json), [Desktop](variant-export-desktop.png), [Handy](variant-export-mobile.png).

Keine privaten Bestände gelesen, keine Site veröffentlicht, keine Shopify-/Server-/Produktionsmutation, kein Merge oder PR. Bestehende Acryl-Testseite enthält dieses neue Paket noch nicht. Physische RIP-/Maschinenprüfung und echte Shopify-Strecke bleiben getrennt offen.

Nächster unabhängiger Schritt: Designzuordnungen bestehender Formprodukte für Tabellenabgleich bereitstellen; Originalmedien und Kundeninhalte bleiben privat.
