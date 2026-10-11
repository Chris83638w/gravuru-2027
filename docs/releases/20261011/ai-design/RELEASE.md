# Bearbeitbare KI-Gestaltung · 11.10.2026

**Veröffentlicht auf dem getrennten Händlerhost:** Quellstand `060a10b9d9238574d05feb4e28e7f72077199fa1`, Version `0.1.0-recovery.20261010+060a10b9d923`. Die kostenpflichtige KI-Nutzung bleibt ohne Schlüssel ausgeschaltet.

Erster begrenzter OpenAI-Anschluss für vorhandene Werkstattdesigns: native Texte, Positionen, Farben und Bibliotheksmotive. Vorschläge bleiben getrennt, bis der Händler Vorher/Nachher prüft und sie als neue Revision übernimmt. Keine zweite Preis- oder Geometrielogik. Product Design dient der Entwicklungsarbeit; es wird nicht als Laufzeit-Plugin eingebaut.

Aufgabenbranch `task/openai-designer-20261011`, Ausgangspunkt `bc2f54d`; neuere Änderungen und Produktbasis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70` bleiben erhalten. Verwaltete Cloud unter `/workspace/gravuru-restored`. Keine fremden Änderungen zurückgesetzt.

## Bedienung und Kosten

Produkt → Designs & Elemente → **Mit KI gestalten**. Änderungen vorher speichern. Text-/Schrifterhalt und unveränderte Fotofelder sind voreingestellt. Vorschläge erzeugen einzeln bearbeitbare Elemente; vorhandene Preise, technische Konturen und Rechte werden geschützt. PDF-Schriftpfade zuerst mit der bestehenden Aufbereitung in Werkstatttext umwandeln. Neue KI-Bilder, Fotobearbeitung und Stapel-KI sind noch nicht Bestandteil dieses Pakets.

Bis zu **100 EUR/Monat für die Werkstatt**, konservative Tokenbewertung, atomare Reservierung von 4,26 EUR je Anfrage, tatsächliche Tokenabrechnung nach bestätigter Antwort. Keine automatische kostenpflichtige Wiederholung. Unklare Kosten bleiben reserviert; fehlende Verbrauchsbelege sperren neue Generierungen. Tariffreigabe höchstens 31 Tage. Die Grenze ist keine Zusage über die gesamte OpenAI-Kontorechnung.

**Echte OpenAI-Nutzung bleibt deaktiviert:** Es liegt kein geschützter API-Schlüssel vor. Keine kostenpflichtige Anfrage ausgeführt; Modellantwortqualität noch nicht real geprüft. [Einrichtung, Datenschutzumfang und Kostenverfahren](../../../../ops/plesk/AI-DESIGN.md).

## Prüfung

- 49 gezielte Tests bestanden; zusätzlich 9 Laufzeittests nach Erweiterung der AI-Anmelde-/CSRF-Prüfung. Überschneidende Teilmengen, keine Addition als unabhängige Gesamttests.
- 17 fachliche KI-Tests: native Änderungen, komplette Schriften, Text-/Fotomaske, geschützte Originale, Grenzwerte, doppelte Anfragen, Kostenreserve, Abbruch/Neustart, Konflikte und absturzsichere einmalige Übernahme.
- KI-Browser: Vorher/Nachher, mobile Breite, Übernahme und Wiederöffnen, persistente Historie sowie Abbruch mit verbleibender Reserve. Synthetische Identität und Provider, kein OpenAI-Aufruf; siehe `ai-browser.json` und Bilder.
- Bestehender vollständiger Händlerablauf bestanden; Schriftupload/Gruppen, Masteranlage, Materialwechsel, Auswahl/Verschieben, eigene Motive, bearbeitbarer PDF-Text/Foto, Kundenansicht und Speichern/Wiederöffnen; siehe `merchant-browser.json`.
- Bei der Browserprüfung korrigiert: Größenvorgaben nur für das äußere Vorschau-SVG; KI-Knopf während des Produktladens gesperrt, statt einen Klick scheinbar zu ignorieren. Antworten eines vorher geöffneten Produkts überschreiben kein neu geöffnetes KI-Fenster.
- **671 Regressionstests bestanden, 0 Fehler, 0 übersprungen**, Node-Testisolation ausdrücklich deaktiviert, Laufzeit 481,6 Sekunden. Isolierte ZIP-Installation, Start, geschützter Testbestelleingang und Wiederholschutz nach Neustart ebenfalls bestanden.

## Paket und Veröffentlichung

[Installationspaket mit Prüfsumme und automatisiertem Ablauf](../../../../deliverables/merchant-ai-design-20261011/README.md): 27.290.658 Byte, 407 Manifestdateien plus Manifest, SHA-256 `3f2992715ef47b664e5efa8beb6c7b9b6dd75174678d0502b7f6f261fc733149`.

Alle 407 Serverdateien vor Aktivierung geprüft; bestehende private Konfiguration gültig. Nur Händlerprozess von Site 20 gezielt beendet. Aktivierung sichert die drei Datenbanken, Konfiguration und vorherige Laufzeit, dann atomarer Einstiegwechsel. Der erste Zwischenabruf erfolgte noch während der laufenden Sicherung und enthielt daher keinen Abschlussbeleg; erst der spätere fertige Beleg wurde als erfolgreiche Aktivierung gewertet. Kein zweiter Aktivierungslauf gestartet.

**28 HTTPS-Prüfungen bestanden**: Werkstatt/Profile/Serien, korrekter Shopify-Kontext und CSP, identische neue UI-Dateien sowie 401 für anonyme bestehende und neue APIs. Plesk-Startweiterleiter `start-r5.cjs` bleibt erhalten; kein Deaktivieren/Aktivieren der Domain nötig. Kein erneuter echter Testkauf und keine Änderung von Shopify-Zahlungen oder Produktfreigaben. Eine automatisierte echte Shopify-Nutzeranmeldung wird nicht behauptet.

Code, Ressourcen, Anleitung und ZIP mit Nachweisen auf Aufgabenbranch und `backup/account-recovery-20261010` sowie `task/full-backup-install-20261010` gesichert. Private Daten bleiben außerhalb GitHub.

## Private Sicherung

Vor Aktivierung konsistente Kopien aller drei Datenbanken, der Konfiguration und bisherigen Laufzeit erstellt. Danach erneut drei private Datenbanken auf dem Server und in dieser Cloud gesichert: **41.897.984 Byte**, jeweils Größe, SHA-256 und SQLite-Integrität bestätigt. Serverablage `private/gravuru-merchant-after-ai-design-20261011`, Cloudablage `/workspace/recovery-private/merchant-after-ai-design-20261011`, nicht im Repository.

**Alle historischen Zeilen in 46 Tabellen identisch erhalten**, keine hinzugefügten Zeilen in diesen Tabellen. Neue Tabelle `ai_design_jobs` ist leer; KI ausdrücklich deaktiviert. Gedenktafel Revision 5, Profile, Originalbilder/-PDFs, Bestellstände und private Shopify-Konfiguration erhalten. Startweiterleiter byteidentisch. Nachweise: `server-preservation.json`, `private-backup-verified.json`.

## Grenzen

Aufträge und Budget liegen ausschließlich in der privaten `workshop.sqlite`; neue Tabelle `ai_design_jobs`, Übernahmejournal in vorhandenem `import_items`. API-Schlüssel außerhalb Git, Paket und Webverzeichnis. Keine Bestellungen oder Bildbytes werden an OpenAI übertragen; Texte können personenbezogene Angaben enthalten.

Die geprüfte Shopify-Testbestellung aus dem Vorgängerrelease wird nicht erneut ausgelöst. Öffentliche neue Kunden-/Checkout-Strecke, allgemeine Produktveröffentlichung, eigene Drive-Autorisierung samt Ordner sowie reale Maschinen-/Material-/ICC-Abnahme bleiben offene Anschlüsse. Historische nicht erreichbare Cloud-/Windows-Dateien und Commit `c64c197` werden weiterhin nicht als gesichert dargestellt; siehe Herkunftsbericht unter `recovery/2026-10-10/`.
