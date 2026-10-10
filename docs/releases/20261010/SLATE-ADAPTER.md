# Schieferübernahme und Prüfstrecke

Die neue Werkstatt kann nun rechteckige native Schiefer-Gravurprodukte mit Befestigungen verwalten. Preise verwenden weiterhin die vorhandene gemeinsame Centberechnung; Bohrbilder werden für jede Auswahl geprüft. Schriftpfade, editierbare Texte, Vektormotive und einzelne Kundenrechte bleiben erhalten. Es wird kein flaches Bild als bearbeitbares Design ausgegeben.

`app/workshop/slate-import.mjs` übernimmt eine ausdrücklich per SHA-256 bestätigte, von der ursprünglichen Laufzeit kompilierte Konfiguration. Originalkennung und Revision müssen zusammenpassen. Der Import schreibt über das vorhandene Importjournal in die Werkstatt, legt bei Wiederholung kein Duplikat an und überschreibt keine späteren Bearbeitungen. Das Original-Materialbild muss zum in der Quelle gespeicherten Hash passen. Es bleibt byteidentisch in derselben privaten Design-Asset-Datenbank; eine geprüfte PNG-Vorschau wird getrennt gespeichert. Keine automatische Shopify-Veröffentlichung.

Privater Originalnachweis: aktive Gedenktafel Revision 30, kompilierte Quelle SHA-256 `2324c250bcb421fe6164cdb39e88d9b531aa9ee80d06f92c1a4d36ab3a1f5f8f`, Material-PNG 9.818.528 Byte / SHA-256 `08d01abbb01837f29d2971f66d93b8331045986b7dd21aa6314bc82bc88e38da`. Die aktive Quelle enthält das eine zuvor ausgewählte Design. Die weiteren 15 ursprünglichen Designs bleiben separat gesichert und wurden nicht ungeprüft aktiviert.

## Tatsächliche Abnahme

- Alle neun Befestigungen in der echten Browseransicht der isolierten neuen Werkstatt ausgewählt. Preise entsprechen den gelesenen Shopify-Werten: 22,99 / 25,98 / 26,98 / 31,97 / 32,97 / 36,97 / 35,98 / 37,98 / 27,98 Euro.
- Originaloberfläche, Textpfade und Baum sichtbar. Werkstatt-Preisänderung gespeichert, neu geladen und auf den ursprünglichen Preis zurückgestellt. Ausschließlich private Testkopie verändert.
- Kundentext bearbeitet, mobile Breite 390 px ohne horizontalen Überlauf geprüft, Gestaltung aus dem Browser als privater, revisionsgebundener Prüfstand gesichert. [Browsernachweis](slate-browser-result.json).
- Daraus über den tatsächlichen lokalen HTTP-/Job-Ablauf eine Gravur-PDF erzeugt: **220 × 140 mm, eine Seite, 32 Vektorzeichnungen, keine eingebetteten Schriften oder Rasterbilder**. [PDF-Prüfung](slate-engraving-result.json). Datei bleibt privat. Synthetischer Test prüft zusätzlich eine Zweiloch-Ausführung mit getrennter Kontur und historische Unveränderlichkeit.
- Neue Prüfstände verwenden `gravuru-native-review/v1`; vorhandene Acrylprüfstände bleiben lesbar. Material-/Maschinenfreigabe und Warenkorb bleiben ausdrücklich getrennt.

Gefundene Fehler behoben: Acrylannahme im Variantenfeld des Werkstatteditors, falscher Materialfilter bei Fertigungsprofilen, unterdrückte Preisberechnung in der Prüfansicht, fehlende Original-Materialoberfläche und Stack-Overflow bei großer gültiger Base64-Eingabe. Eine fehlende Materialgrafik lässt nun die Grundfarbe sichtbar. Ein übernommener historischer Werkstattverweis dient ausschließlich der Herkunft, nicht als Schreibziel des neuen Kundeneditors.

Noch offen: tatsächliche Shopify-Händleröffnung mit vollständiger Kunden-Vorschau, operative Zuordnung des neuen Prüfstands zum vorhandenen Warenkorb-/Preisfunktionsvertrag und echte Shopify-Testbestellung. Der Nutzer hat den Zahlungs-Testmodus inzwischen aktiviert und bestätigt. Es wurde noch keine Bestellung ausgelöst. Drei vorübergehende `/undefined`-Bildanfragen der historischen Editorhülle wurden beobachtet; endgültige Bilder, Preise und Bedienung funktionieren, die Herkunft dieser Anfragen ist noch zu bereinigen. Keine reale Maschinenprobe oder Live-Freigabe aus diesen technischen Prüfungen ableiten.
