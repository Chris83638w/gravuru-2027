# Excel-Profile und gebundene Formauswahl – 07.10.2026

Basis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70`, Aufgabenbranch `feat/excel-profile-assignments-20261007`. ZIP-Import, Quellordner, gespeicherte Serien, Ausführungsgruppen und privater Plesk-Start erhalten. Keine Migration oder Serveränderung.

## Bedienung

Die Produktvorlage hat vier zusätzliche optionale Spalten X–AA. Vorhandene Excel-/CSV-Dateien bleiben gültig.

| Spalte | Eingabe |
| --- | --- |
| `font_profile`, `motif_profile` | Leer erhält den Master-/Produktwert. `inherit` verwendet Kategorie/Standard; `empty` bietet keine neue Auswahl; sonst genaue ID eines vorhandenen passenden Auswahlprofils. |
| `production_profile_id` | Bestehende Fertigungsprofil-ID; `empty` ohne Revision entfernt die Zuordnung. Leer mit leerer Revision erhält den Wert. |
| `production_profile_revision` | Bei ID zwingend eine vorhandene ganze Revision. Material, tatsächliche Stärke und Verfahren müssen passen. |

Profil-IDs stehen in der Profilbibliothek. Vor Übernahme „Profilzuordnungen prüfen“ je Produktzeile öffnen. Der Excel-Prüfbericht enthält die tatsächlich aufgelösten Quellen/Revisionen; Korrekturdateien und privat gespeicherte Prüfungen erhalten die Angaben. Unbekannte/falsche Profile blockieren die betroffene Zeile. Geänderte Auswahlprofile zwischen Prüfung und Übernahme verlangen eine neue Prüfung; keine still aktualisierte Freigabe. Wiederholung eines erledigten Imports zeigt dessen ursprüngliche Profilbindung und erzeugt keine neue Revision. Für spätere Änderungen neuer Importschlüssel mit `action=update`, Produkt-ID und erwarteter Revision. Auch eine unveränderte Profil-ID mit inzwischen neuer Auswahl kann damit bewusst als neuer Produktstand gesichert werden.

Formprodukte besitzen jetzt optional dieselben Regeln für Schriften, Motive, Farben und Bestseller. Im vorhandenen Formeditor unter **Kundenauswahl → Profilregeln anwenden** aktivieren und bearbeiten. Kategorie-IDs sind geordnet; die letzte nicht vererbende Kategorie gewinnt, danach eine ausdrückliche Produktzuordnung. Excel setzt nur Schrift/Motiv ausdrücklich; Farben/Bestseller können im Formeditor gewählt werden und werden bei aktiven Regeln ebenso geerbt. Ältere Formdokumente ohne das optionale Feld übernehmen keine neuen Kategorie-/Standardbeschränkungen automatisch.

Der Formkundeneditor verwendet die bereits vorhandenen Schriftressourcen der Profilbibliothek (bisher nur die zwei Schriften des Ausgangsmasters). Keine neuen Fontdateien oder Lizenzannahmen. Profilreihenfolge bestimmt die erste angebotene Schrift; Motive werden gefiltert, freigegebene Bestseller vorangestellt. Bestehende Vorlagenfelder behalten ihre Originalschrift/-farbe; neue oder geänderte Auswahlwerte werden serverseitig begrenzt. Leere Schrift-/Motivprofile sperren neue Auswahl, ohne Vorlagentext zu löschen. Leere Farbauswahl sperrt neue Elemente. Rechte und Geometrieprüfung gelten weiterhin.

Gespeicherte Formproduktrevisionen halten die aufgelösten Auswahlprofile fest. Entwurf, Wiederöffnen und gesicherter Prüfstand verwenden diese Revision, auch wenn danach ein Profil geändert wird. Die Auswirkungsanzeige berücksichtigt Formprodukte mit aktiven Regeln und benennt deren nächste gespeicherte Fassung. Bestehende Bestellungen werden nicht geändert.

## Ausgeführte Prüfungen

**50 gezielte Node-Prüfungen bestanden**, keine Fehler/Skips; keine Behauptung einer erneut bestandenen Gesamtsuite:

- 6 neue Tests `batch-profiles.test.mjs`: beide Produkttypen, geordnete Vererbung, explizit leer, falsche Profilarten, Korrektur/Neustart, veraltete Bestätigung, wiederholte Übernahme, unveränderte Altstände, serverseitige Schrift-/Motiv-/Farbgrenzen, eingefrorener Prüfstand, feste Fertigungsrevision, bewusstes Auffrischen einer Auswahlrevision.
- 18 bestehende Batch-/Profil-Auswirkungstests wegen geändertem Planer und neuen Formzuordnungen.
- 20 betroffene Tests für gespeicherte Jobs/Berichte, Formprodukt/-kunden/-ergänzungen und Prüfstände wegen optionalem Dokumentfeld, Ressourcenauflösung und gesicherter Auswahl.
- 4 gezielt ausgewählte Formserien-Tests: Vererbung, Aktualisieren, private Wiederaufnahme und Korrektur-Excel.
- 2 PDF-Abläufe für die aktuelle synthetische Drucklieferung (Form/Acryl). Die früheren privaten Druckdateien sind hier nicht vorhanden; die neue Lieferung ist kein Ersatznachweis für ihre historische physische Abnahme.

`python3 scripts/check-excel-profiles.py`: **5 Browsergruppen PASS**, Desktop 1440, 390 und 768 ohne horizontalen Überlauf oder JavaScript-Fehler. Reale ausgelieferte XLSX-Vorlage und Korrekturdatei eingelesen, private Prüfung geschlossen/wieder geöffnet, erfolgreiche Geschwister unverändert, Formzuordnung gespeichert, Kundenentwurf nach Profiländerung wieder geöffnet, freigegebenes Motiv eingefügt, ausdrücklich leere Auswahl geprüft. Zwei Screenshots gesichtet. Anfängliche Testfixtures/Selektoren auf tatsächlichen Schriftkatalog und vorhandene Konfigurator-Tabs korrigiert; keine offenen Testfehler.

[Nachweise und Screenshots](excel-profiles-20261007/) · [Vorlagen und Druckproben](../../deliverables/testabnahme-20261007/README.md).

Syntax der geänderten JavaScript-Dateien und `git diff --check` erfolgreich. Vorlage mit OpenPyXL aktualisiert; Artifact-Tool-Generator entsprechend nachgeführt und syntaxgeprüft, nicht ausgeführt (Paket hier nicht installiert).

## Externe Abnahme weiterhin offen

Kein erreichbarer Plesk-Testhost bestätigt, kein Serverstart/HTTPS-/Neustartnachweis. Manuelle Plesk-Bedienung ist angefragt; keine weitere SSH-/VPN-/API-Schleife. Shopify-Login, reale Varianten-/Warenkorb-/Bestell-/Kundenkontostrecke, Drive-Autorisierung und KI-Anbieter/Kostenrahmen bleiben offen. Maschinen-/RIP-/ICC-Abnahme ist eine separate externe Prüfung. Keine Live-Werkstatt oder Shopify-App-Konfiguration geändert.
