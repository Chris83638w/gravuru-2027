# Verbindlicher Konfigurator-Master – 30.10.2026

## Entscheidung von Chris

„Unser ist der Master.“ Die gemeinsam geprüfte Oberfläche und Bedienung gilt für alle Produktlinien. Ausschließlich **Ausführungen** wird je Linie ergänzt (z. B. Funkklingel-Farbe und Klingelposition). Keine spätere Funkklingel-Oberfläche in den freigegebenen Master übernehmen. Chris hat die Veröffentlichung ausdrücklich freigegeben.

Abgenommene Oberfläche: Tag `konfigurator-master-20261030`, Commit `ce7c86613f06760146be36fe5004b7c58d3a9921`. Dieser Tag bleibt unverändert.

## Für den Betrieb erforderlicher Abgleich

- Bereits live vorhandene Korrektur der Funkklingel-Warenkorbprüfung beibehalten: mehrteilige Funkklingeln erhalten keinen überholten Fertigungsblocker.
- Bereits live gültige native Gestaltungslinien bleiben lesbar. Gegenprüfung aller 926 aktiven Produktstände, darunter 126 Funkklingeln: keine Validierungsfehler nach dem Abgleich.
- Neue Funkklingel-Dokumente behalten die bisherige Rechtevergabe, statt nur ihre ausgewählte Wurzelvorlage zu verändern und damit die Formatidentität zu verletzen. Bestehende Revisionen werden nicht umgeschrieben.
- Fotowerkzeug-Test ergänzt die realen Layout-Container. Seine Funktionsprüfungen bleiben erhalten.
- Der SVG-Importtest prüft jetzt ausdrücklich die freigegebenen Motivrechte (ersetzbar/löschbar, nicht verschiebbar/skalierbar), Originaldateien, Farben und Idempotenz. Seine alte Erwartung eines generell gesperrten Motivs widersprach der bereits abgenommenen Funktion.
- Neue Preisfunktion erhält die vollständige aktive V1-Mengenrabattberechnung. V2 ergänzt Logos zu 1.299 Cent; zusätzliche Motive bleiben 169 Cent. Die erste Vorlage bleibt enthalten.

## Veröffentlichung und Prüfstand

Vorbereitungsstand: privates vollständiges Backup und Rückweg vorhanden; App-Kandidat ohne Release vorbereitet. Keine Veröffentlichung allein aus diesem Abschnitt ableiten. Der bestätigte Abschluss wird nach Live-Rücklese und Warenkorbtest ergänzt.

Der Zwischenvollauf unter Linux: 1.928 Tests, 1.927 erfolgreich, ein veralteter SVG-Rechte-Sollwert. Dieser Test wurde wie oben beschrieben korrigiert. Der abschließende Lauf und die Live-Belege folgen.

Vier Preisfunktionstests einschließlich 576 Vergleichen mit der bisherigen V1-Berechnung sowie acht kompilierte WASM-Prüffälle erfolgreich. Reale Bestellungen/Zahlungen und eine Maschinenfreigabe sind nicht Bestandteil dieses Auftrags.

## Sicherung und Rückweg

Auf dem privaten Host: `konfigurator-master-20261030/backup` mit bisherigen Quellen, Startdateien und sechs SQLite-Sicherungen. Bestehende Kunden- und Bestellstände bleiben historisch unverändert.

Vorherige Shopify-App-Version: `gravuru-2027-shop-einstieg-20261026-v1`. Ein Rückweg für D8 muss über neue Revisionen und geprüfte Zuordnungen erfolgen, niemals durch Wiederherstellen einer alten Gesamt-Datenbank über neue Bestellungen.
