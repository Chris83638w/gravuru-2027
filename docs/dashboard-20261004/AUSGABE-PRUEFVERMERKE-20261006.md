# Dateibezogene Prüfvermerke im Dashboard

Branch `task/output-check-journal-20261006`, Basis `26907140e0de3486e8a7bf04368913d7d556b146`.

Unter **Ausgaben → fertiger Auftrag → Import und Probedruck dokumentieren** lassen sich tatsächlich durchgeführte Prüfungen zur konkreten PDF festhalten. Dateiimport und Probedruck/Probegravur sind getrennt. Programm/RIP ist erforderlich; bei Probedruck auch die Maschine, bei einem Fehler die konkrete Beobachtung. Die bekannten Maschinen werden nur vorgeschlagen, keine unbekannten RIP-Versionen oder Parameter eingesetzt.

Der Server berechnet den SHA-256 aus der gespeicherten PDF und vergleicht ihn mit dem vorhandenen Dateinachweis. Der neue Eintrag enthält Dateiname, Format, SHA, Prüfschritt, Ergebnis, Maschine, Software, Notiz und Eintragszeit. Eine unpassende SHA wird abgewiesen. Die separate Mimaki-Weißdatei ist eigenständig wählbar; ZIPs werden nicht als konkrete Prüf-PDF angenommen. Frühere Ausgaberezepte bleiben lesbar, sofern ihre gespeicherten PDFs intakt sind.

**Manueller Prüfvermerk, keine automatische Fertigungsfreigabe.** Ein Bedienerbericht beweist nicht automatisch einen tatsächlich ausgeführten Maschinenversuch. Kein neuer Zahlungs-/Kunden-Downloadstatus. Frühere Chat-Rückmeldungen wurden nicht pauschal als bestandene Dateiprüfungen eingetragen. Insbesondere der neue Corel-/Mimaki-Test des Nutzers bleibt offen.

## Speicherung und Bedienung

- Neue Tabelle `export_output_checks` in der vorhandenen privaten Werkstattdatenbank, an die Ausgabe-ID gebunden. Kein weiterer Datenspeicher oder Server. PDF-/ZIP-Bytes, Auftrag, Bestellung und Produktrevision unverändert.
- Einträge können nur ergänzt werden; SQL-Trigger verhindern Überschreiben/Löschen. Eine Korrektur ist ein weiterer Vermerk. Wiederholte identische Anforderung liefert denselben Eintrag, geänderter Inhalt mit derselben Anforderungs-ID einen Konflikt.
- Höchstens 200 neueste Vermerke angezeigt, Gesamtzahl sichtbar. Die automatische Ausgabeaktualisierung löscht keine laufenden Formulareingaben. Vermerke werden bei Auswahl/manuellem Neuladen und nach dem Speichern gelesen, nicht laufend mit allen PDF-Dateien gepollt.
- Nur fertige Aufträge; bestehender Betreiberbereich mit Host-/Origin-/CSRF-Schutz. Kein gehosteter Händlerlogin durch diese Ergänzung.
- Notizen werden als Text angezeigt; keine HTML-Ausführung. Persönliche Medien, private DBs und reale Prüferdaten wurden nicht in Git aufgenommen.

## Prüfung

Sieben gezielte Tests bestanden: persistente/idempotente Vermerke, Konflikt, keine Freigabe, erhaltene PDF-Bytes, unveränderliche Historie, Korrektur als Ergänzung, falsche SHA/Formate/Angaben/noch unfertige Ausgabe abgewiesen; bestehende Warteschlangenfälle ebenfalls bestanden.

Echter Chromium-Browser, nur synthetische Daten: getrennte Import-/Probedruckvermerke zu Mimaki-Weiß; falscher CSRF-Token und SHA, ZIP und fehlende Maschine abgewiesen; Neuladen, Wiederholung, Konflikt, escaped HTML-Notiz, Formularerhalt beim Polling und sauberer Auftragswechsel. Weißdownload weiterhin SHA-identisch. Keine JS-Fehler oder Überläufe auf 1440/390/768 Pixel.

[Browserbericht](ausgabe-pruefvermerke-browser-20261006.json) · [Desktopansicht](ausgabe-pruefvermerke-desktop-20261006.png) · [Handyansicht](ausgabe-pruefvermerke-mobil-20261006.png).

Reproduktion: `PYTHONPATH=.local-data/python node --test app/workshop/output-checks.test.mjs app/workshop/export-jobs.test.mjs` und `PYTHONPATH=.local-data/python python3 scripts/check-output-checks.py`. Die Browserfixture nutzt einen neuen markierten temporären Datenbestand. Keine reale Maschinenprüfung, Shopify-Anfrage oder Veröffentlichung ausgeführt.

**Gesamtlauf:** Cloud-Check am 06.10.2026, 14:07:18–14:09:14 Europe/Berlin: **310 Tests bestanden, 0 Fehler/Skips**, Build 76 Ressourcen/1 Modell. [Bericht](ausgabe-pruefvermerke-cloud-20261006.json).

## Offene Abnahmen

Aktuelle private Corel-PDFs aus `PDF-VEKTOREN-KONTUR-20261006.md` sind unverändert. Konkreter Nutzerimport/-probedruck weiterhin ausstehend. Für den Gesamtbetrieb bleiben die echte Shopify-Test-App-/Variantenanbindung und dauerhaft privat erreichbares Backend offen. Kein neuer Server oder erneuter Migrationslauf gestartet.
