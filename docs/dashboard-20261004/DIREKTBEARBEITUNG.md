# Direktbearbeitung und Uploadposition – 04.10.2026

Basis `111f3ed95c7bad23ce130208f64c7ca3dcf77e78`, Aufgabenbranch `task/direct-edit-test-download-20261004`.

- Nach Foto-Upload kein automatisches Scrollen zur Uploadliste mehr. Fokus mit `preventScroll` und vorhandene Fotoauswahl bleiben erhalten.
- Text-Doppelklick öffnet ein Eingabefeld am ausgewählten Element. Inhalt wird vorausgewählt und Änderungen erscheinen live im Motiv. Enter/Fertig übernimmt, Escape/Abbrechen setzt den Text zurück; Shift+Enter bleibt Zeilenumbruch.
- Auswahlleiste mit Text-/Fotobearbeitung direkt an der Vorschau. Textgröße über den bestehenden Editor in ganzen mm; Vorlagenrechte bleiben wirksam. Bestehende Zieh-/Dreh-/Löschgriffe bleiben bestehen.
- Foto-Doppelklick bzw. Doppelantippen öffnet den bestehenden Fotoeditor. Die Schaltfläche am Auswahlrahmen ist eine zusätzliche Möglichkeit. Vorhandenes Zuschneiden, Drehen, Spiegeln und Übernehmen wird wiederverwendet.
- Download während des privaten Tests direkt auf derselben Hauptseite wieder aktiviert (Sites-Quellstand `843d76339e03b3f45ef8c3ef4698e9632c2d279c`). Kein öffentlicher Kundenexport; produktiver Operator-Zugriff bleibt erhalten. Standardexport unverändert.
- Keine Aufteilung der Designübersicht neu eingeführt. Die genaue Zuordnung des Nutzerhinweises zur Designübersicht wurde erfragt; weitergehender Umbau ist nicht Teil dieses Pakets.

## Prüfung und Grenzen

Build: 76 Ressourcen/1 Modell. Gesamtsuite 167 bestanden, 0 Fehler/Skips; nach Ergänzung des Foto-Doppeltipps zusätzlich 18 relevante Foto-/Rechte-/Ereignistests bestanden.

Chromium mit synthetischem Foto: kein Scrollsprung auf Desktop und Mobilgerät; Text vorausgewählt, Liveänderung, Abbrechen und Doppelklick geprüft; Foto über Auswahlleiste und tatsächlichen Doppelklick geöffnet; ganze mm übernommen; gesperrte Texte bleiben gesperrt. Mobile Auswahlleiste passt in 390-px-Ansicht. Bearbeiteter Stand über Hauptseite als PDF heruntergeladen. Keine Seitenfehler. Keine privaten Nutzerfotos oder Daten verwendet.

Bestehende offene Tabs aktualisieren sich nicht selbst. Ihre ungesicherten Gestaltungen/Fotos bleiben nur in der jeweiligen Browsersitzung; vor einem Neuladen exportieren. Corel-/RIP-Abnahme und dauerhafte Kundenkonto-/Kaufanbindung bleiben separat offen.
