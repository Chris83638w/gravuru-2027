# Freie Formprodukte im Serienimport – 05.10.2026

Branch `task/form-batch-20261005`, Basis `fdbb5be293a0517767d2f0f20a56b6b2b0281620`. Bestehende Cloud-Arbeitsumgebung und bestehender Serienimport erweitert; keine neue Umgebung, keine Veröffentlichung, keine privaten Bestände verändert.

## Ergebnis und Bedienung

Werkstatt → Stapelverarbeitung bietet jetzt auch gespeicherte **Formmaster** an. Jede Tabellenzeile erzeugt ein eigenes Produkt. Material, Stärke, Druck/Gravur, Szene, Außenkontur, Ausschnitte, Designzuordnungen und Kundenrechte stammen aus dem ausdrücklich ausgewählten Masterstand. Maße werden nicht auf die alten Acrylformate zurückgesetzt.

1. Formprodukt als Master speichern und im Serienimport auswählen.
2. Aktualisierte Excel-Vorlage oder CSV mit `import_key` und `name` ausfüllen. `price_eur` setzt optional den Grundpreis eines freien Formprodukts. Die bisherige Acrylvorlage behält ihre beiden Preisspalten.
3. Optional SVG/PDF-Dateien auswählen und über `design_file`, `design_page`, `design_id` zuordnen. Leer übernimmt alle Designs/Felder des Masters. Bei Designersatz wird nur das gewählte Design ersetzt; dessen alte Kundenfelder werden ausdrücklich entfernt und müssen auf der neuen Datei neu zugeordnet werden. Keine automatische Editierbarkeit flacher PDFs behauptet.
4. Erst prüfen, dann anlegen. Einzelne Fehler können nach ausdrücklicher Auswahl zurückgestellt werden. Gleiche Importschlüssel erzeugen bei erneuter Prüfung keine Duplikate; nachträglich bearbeitete Produkte werden nicht überschrieben.

`design_fit=original` ist für freie Formen der Standard; zu große Vorlagen werden abgelehnt. `contain` passt proportional ein und weist auf mögliche freie Ränder hin. Keine automatische Verzerrung, kein stilles Abschneiden als Ersatz für eine passende Vollflächendatei. Die Vorschau zeigt Maße, Material und Druck/Gravur; Ergebnisse öffnen direkt den Formprodukteditor. Auf dem Handy erscheinen die Prüfergebnisse als lesbare Datensätze statt einer abgeschnittenen Tabelle.

Die vorhandene Transaktion, Importschlüsselverwaltung und Dateiprüfung werden wiederverwendet. Eine neue lesende Repository-Validierung ermöglicht dieselbe echte Quellen-/Schrift-/Profilprüfung bereits pro Zeile im Dry-run. Kein zweiter Produkt- oder Geometriespeicher.

## Vollflächiger Farbdruck

Der Nutzer hat farbigen, vollflächigen Druck ausdrücklich bekräftigt. Das neue **synthetische Farbprüfmuster** zeigt eine farbige Gestaltung über die gesamte Platte, ausgespart an den Bohrungen. [Farbige Materialvorschau](form-full-color-print.png), [Backend mit Verfahren Druck](form-full-color-backend.png). Diese Illustration ist ein technisches Prüfbeispiel, kein neues freigegebenes Kundendesign und keine Maschinenprobe.

Zusätzlicher Integrationstest vom importierten Produkt bis zur PDF: beide Originalfarben bleiben vorhanden, Druckweiß liegt darunter, Bohrung bleibt farb- und weißfrei. Standard 300 dpi, CMYK, kein Überdruck. Mit ausdrücklich gewähltem 1-mm-Überdruck wird Farbe nur über den erreichten Außenrand erweitert; Weiß bleibt standardmäßig ohne Überdruck. PDF-Maße entsprechen 120 × 80 mm beziehungsweise 122 × 82 mm mit Randüberdruck. Bestehende Roland-/Mimaki-Tests laufen weiter mit.

## Prüfung dieses Pakets

- `node scripts/cloud-check.mjs`: **235 Tests bestanden, 0 Fehler, 0 Skips**; Python-/Referenzprüfung und Build erfolgreich. Build **76 Ressourcen, 1 Modell**, bestehender Editor 461440 Bytes.
- Zeitraum **05.10.2026, 21:24:57–21:25:59 Uhr Europe/Berlin** (19:24:57–19:25:59 UTC), Linux, Node v24.19.0. Der Befehl führt dieselbe Suite wie `npm test` und denselben Build wie `npm run build` aus. [Laufnachweis](form-batch-check.json).
- Neue Tests: Vererbung, gezielter Designersatz, unveränderter Master, tatsächliche Originalquellenprüfung; 100 Zeilen mit 3 Fehlern → 97 Produkte, danach genau 3 korrigierte Produkte; keine Duplikate nach Datenbankneustart, kein Überschreiben nachträglicher Bearbeitung; vollständiger Rollback bei Datenbankfehler; vollflächige Farb-/Weiß-PDF mit Bohrung und Randüberdruck.
- Neue Browserprüfung in Chromium: tatsächliche XLSX-Datei aus der aktualisierten 19-Spalten-Vorlage plus SVG hochgeladen. Zunächst 2 gültige Zeilen/1 Fehler, wiederholt 2 vorhandene Produkte, nach Korrektur genau 1 neue Anlage. Direkte Produktlinks, Maße/Material/Verfahren und farbige Vorschau geprüft.
- Desktop 1536, Handy 390, Tablet 768 Pixel; keine JavaScript-Fehler, kein horizontaler Seitenüberlauf. Mobile Ergebnisdarstellung zusätzlich nach der Layoutänderung erneut geprüft.
- Excel-Datei mit vorhandenem OpenPyXL aktualisiert, erneut geöffnet und durch den echten Browserparser verwendet. Der vorhandene optionale Artifact-Tool-Generator wurde entsprechend angepasst und syntaxgeprüft; er wurde in diesem Lauf nicht zur Dateierzeugung ausgeführt.
- Früher Testfehler bei Designersatz behoben: Im Dateispeicher gehört der ursprüngliche Dateiname zur Uploadzuordnung, nicht zur unveränderlichen Asset-Metadatenstruktur. Die geprüfte Zuordnung wird jetzt ausdrücklich an die gemeinsame Designanlage übergeben.

[Desktop](form-batch-desktop.png) · [Handy](form-batch-mobile.png) · [Tablet](form-batch-tablet.png).

## Noch offen

Matt/Hochglanz ist als Nutzerwunsch aufgenommen. Die Rückfrage, ob Acryloberfläche, Druck/Lack oder beides gemeint ist, hat noch keine Antwort. Ebenso ist mit „typischen UV-Druckmarkern“ noch nicht eindeutig geklärt, ob Passer-/Positioniermarken, feine UV-Druckpunkte in der Vorschau oder Produktionskanäle gemeint sind. Dafür keine Lackkanäle, Druckmarken oder Maschinenwerte erfunden. Die vorhandenen Materialreferenzen und Exportkanäle bleiben erhalten.

Dieses Paket legt Serien an. Es bietet noch keine generische Aktualisierung bestehender Produkte per Tabellenspalte, keine neuen Kontur-/Materialvarianten aus einer Kindtabelle und keinen automatischen Drive-/KI-Abruf. Echte Shopify-Anbindung und physische RIP-/Maschinenfreigabe bleiben getrennt offen. Nächster Schritt: Matt/Hochglanz und UV-Marker nach Nutzerzuordnung als passende Vorschau-/Fertigungseinstellungen konkretisieren.
